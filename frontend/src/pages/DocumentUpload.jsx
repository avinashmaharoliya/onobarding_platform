import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { File, ScanText, Upload, CheckCircle, AlertCircle, Loader } from 'lucide-react';

// Pre-process image on canvas: grayscale + contrast boost for better OCR
function preprocessImage(file) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const scale = Math.max(1, Math.min(3, 1500 / Math.max(img.width, img.height)));
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        const contrast = 1.5;
        const factor = (259 * (contrast * 255 + 255)) / (255 * (259 - contrast * 255));
        const enhanced = Math.min(255, Math.max(0, factor * (gray - 128) + 128));
        data[i] = data[i + 1] = data[i + 2] = enhanced;
      }
      ctx.putImageData(imageData, 0, 0);
      URL.revokeObjectURL(url);
      canvas.toBlob(resolve, 'image/png');
    };
    img.src = url;
  });
}

// Regex fallback: extract fields from noisy Indian document OCR
function parseOcrFields(text) {
  const fields = {};
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const clean = text.replace(/[|\\{}\[\]]/g, '').replace(/\s+/g, ' ');

  // PAN: 5 letters + 4 (digits or O/0 confused) + 1 letter
  const panRaw = clean.match(/\b([A-Z]{5}[A-Z0-9]{4}[A-Z])\b/);
  if (panRaw) {
    const p = panRaw[1].split('');
    for (let i = 5; i <= 8; i++) { if (p[i] === 'O') p[i] = '0'; }
    const fixed = p.join('');
    if (/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(fixed)) fields['PAN'] = fixed;
  }

  // Aadhaar: 12 digits
  const aadhaar = clean.match(/\b(\d{4}\s\d{4}\s\d{4}|\d{12})\b/);
  if (aadhaar) fields['Aadhaar No'] = aadhaar[1];

  // DOB
  const dobLabeled = clean.match(/(?:DOB|Date of Birth|D\.O\.B|Birth)[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i);
  const dobStandalone = clean.match(/\b(\d{2}\/\d{2}\/\d{4})\b/);
  if (dobLabeled) fields['Date of Birth'] = dobLabeled[1];
  else if (dobStandalone) fields['Date of Birth'] = dobStandalone[1];

  // Father's Name: find "Father" or "faar" line, then grab the next ALL-CAPS line
  const fatherIdx = lines.findIndex(l => /father|faar/i.test(l));
  if (fatherIdx !== -1) {
    for (let i = fatherIdx + 1; i < Math.min(fatherIdx + 3, lines.length); i++) {
      const c = lines[i].replace(/[^A-Za-z\s]/g, '').trim();
      if (/^[A-Z][A-Z\s]{3,30}$/.test(c)) {
        fields["Father's Name"] = c;
        break;
      }
    }
  }

  // Full Name: find line with "AVINASH" style all-caps name after "Anes"/"Name" label
  for (let i = 0; i < lines.length; i++) {
    if (/anes|name/i.test(lines[i]) && !(/father|faar/i.test(lines[i]))) {
      for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
        const c = lines[j].replace(/[^A-Za-z\s]/g, '').trim();
        if (/^[A-Z][A-Z\s]{4,40}$/.test(c)) {
          fields['Full Name'] = c;
          break;
        }
      }
      if (fields['Full Name']) break;
    }
  }

  // Gender
  const gender = clean.match(/\b(MALE|FEMALE)\b/i);
  if (gender) fields['Gender'] = gender[1].toUpperCase();

  return fields;
}

const DocumentUpload = () => {
  const [docTypes, setDocTypes] = useState([]);
  const [selectedType, setSelectedType] = useState('');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [ocrText, setOcrText] = useState('');
  const [ocrFields, setOcrFields] = useState({});
  const [ocrProgress, setOcrProgress] = useState(0);
  const [message, setMessage] = useState({ text: '', type: '' });
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/documents/my')
      .then(res => setDocTypes(res.data))
      .catch(console.error);
  }, []);

  const runOcr = async (selectedFile) => {
    if (!selectedFile || !selectedFile.type.startsWith('image/')) return;

    setScanning(true);
    setOcrText('');
    setOcrFields({});
    setOcrProgress(0);

    try {
      // Step 1: Pre-process image
      const processedBlob = await preprocessImage(selectedFile);

      // Step 2: Run Tesseract
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('eng', 1, {
        logger: m => {
          if (m.status === 'recognizing text') {
            setOcrProgress(Math.round(m.progress * 100));
          }
        }
      });

      await worker.setParameters({ tessedit_pageseg_mode: '6' });
      const result = await worker.recognize(processedBlob);
      await worker.terminate();

      const text = result.data.text.trim();
      setOcrText(text || 'No readable text detected.');

      if (text && text.length > 10) {
        // Step 3: Send to Groq LLM for AI extraction
        setOcrProgress(-1);
        try {
          const selectedDoc = docTypes.find(d => String(d.type_id) === String(selectedType));
          const res = await api.post('/ocr/parse-ocr', {
            raw_text: text,
            doc_type: selectedDoc?.type_name || ''
          });
          if (res.data?.fields && Object.keys(res.data.fields).length > 0) {
            setOcrFields(res.data.fields);
          } else {
            setOcrFields(parseOcrFields(text));
          }
        } catch {
          // Groq unavailable — regex fallback
          setOcrFields(parseOcrFields(text));
        }
      }
    } catch (error) {
      console.error('OCR error:', error);
      setOcrText('OCR scan failed — you can still upload the document.');
    } finally {
      setScanning(false);
      setOcrProgress(0);
    }
  };

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setFile(selected);
    setOcrText('');
    setOcrFields({});
    setMessage({ text: '', type: '' });

    if (selected.type.startsWith('image/')) {
      const url = URL.createObjectURL(selected);
      setPreview(url);
      runOcr(selected);
    } else {
      setPreview(null);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file || !selectedType) {
      setMessage({ text: 'Please select a file and document type.', type: 'error' });
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('document_type_id', selectedType);
    if (ocrText && !ocrText.startsWith('No readable') && !ocrText.startsWith('OCR scan failed')) {
      formData.append('ocr_text', ocrText);
    }

    setUploading(true);
    setMessage({ text: '', type: '' });
    try {
      await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setMessage({ text: '✅ Document uploaded successfully!', type: 'success' });
      setFile(null);
      setPreview(null);
      setOcrText('');
      setOcrFields({});
      setTimeout(() => navigate('/documents/status'), 1500);
    } catch (error) {
      setMessage({ text: error.response?.data?.message || 'Upload failed', type: 'error' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="animate-fade-in max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Upload Document</h1>
        <p className="text-gray-500 mt-1">Provide clear copies (PDF, JPG, PNG) under 5MB. Images are auto-scanned with OCR + AI.</p>
      </div>

      {message.text && (
        <div className={`p-4 rounded-lg mb-6 flex items-center gap-2 ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          {message.text}
        </div>
      )}

      <form onSubmit={handleUpload} className="glass-panel p-6 rounded-2xl shadow-sm space-y-6">

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Document Type</label>
          <select
            value={selectedType}
            onChange={e => setSelectedType(e.target.value)}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none"
          >
            <option value="">Select Document Type</option>
            {docTypes.map(dt => (
              <option key={dt.type_id} value={dt.type_id}>
                {dt.type_name} {dt.mandatory ? '(Required)' : '(Optional)'}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">File</label>
          <label className="mt-1 flex flex-col justify-center items-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-primary transition cursor-pointer">
            <File className="h-12 w-12 text-gray-400 mb-2" />
            <span className="text-sm text-gray-600">
              <span className="font-medium text-primary hover:text-primary-dark">Click to upload</span> or drag and drop
            </span>
            <span className="text-xs text-gray-500 mt-1">PDF, PNG, JPG up to 5MB</span>
            <input type="file" className="sr-only" onChange={handleFileChange} accept=".pdf,.jpg,.jpeg,.png" />
          </label>
          {file && <p className="mt-2 text-sm text-gray-600 flex items-center gap-1"><CheckCircle size={14} className="text-green-500" /> {file.name}</p>}
        </div>

        {preview && (
          <div className="rounded-lg overflow-hidden border border-gray-200">
            <img src={preview} alt="Preview" className="w-full max-h-52 object-contain bg-gray-50" />
          </div>
        )}

        {file?.type.startsWith('image/') && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <ScanText size={18} className="text-blue-600" />
                <h3 className="text-sm font-semibold text-blue-900">OCR + AI Extraction</h3>
                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">Groq Llama3</span>
              </div>
              {!scanning && (
                <button
                  type="button"
                  onClick={() => runOcr(file)}
                  className="text-xs bg-white border border-blue-200 text-blue-700 px-3 py-1 rounded-lg hover:bg-blue-100 transition"
                >
                  Re-scan
                </button>
              )}
            </div>

            {scanning && ocrProgress >= 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-blue-700">
                  <Loader size={14} className="animate-spin" />
                  Scanning document... {ocrProgress > 0 && `${ocrProgress}%`}
                </div>
                <div className="w-full bg-blue-200 rounded-full h-1.5">
                  <div className="bg-blue-600 h-1.5 rounded-full transition-all duration-300" style={{ width: `${ocrProgress}%` }} />
                </div>
              </div>
            )}

            {scanning && ocrProgress === -1 && (
              <div className="flex items-center gap-2 text-sm text-purple-700 bg-purple-50 rounded-lg px-3 py-2">
                <Loader size={14} className="animate-spin" />
                <span>🤖 AI is extracting structured fields from the document...</span>
              </div>
            )}

            {!scanning && Object.keys(ocrFields).length > 0 && (
              <div className="mb-3">
                <p className="text-xs text-purple-600 font-semibold mb-2 flex items-center gap-1">🤖 AI-extracted fields:</p>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(ocrFields).map(([key, val]) => (
                    <div key={key} className="bg-white rounded-lg border border-blue-100 px-3 py-2">
                      <p className="text-xs text-blue-500 font-medium">{key}</p>
                      <p className="text-sm font-semibold text-gray-800">{String(val)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!scanning && ocrText && (
              <div>
                <p className="text-xs text-blue-600 mb-1 font-medium">Raw extracted text:</p>
                <div className="bg-white rounded-lg border border-blue-100 p-3 text-xs text-gray-600 whitespace-pre-wrap max-h-36 overflow-auto font-mono">
                  {ocrText}
                </div>
              </div>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={uploading || scanning}
          className="w-full bg-primary hover:bg-primary-dark text-white py-2.5 rounded-lg flex items-center justify-center space-x-2 transition disabled:opacity-50"
        >
          {uploading ? <Loader size={18} className="animate-spin" /> : <Upload size={18} />}
          <span>{uploading ? 'Uploading...' : scanning ? 'Scanning, please wait...' : 'Upload Document'}</span>
        </button>
      </form>
    </div>
  );
};

export default DocumentUpload;
