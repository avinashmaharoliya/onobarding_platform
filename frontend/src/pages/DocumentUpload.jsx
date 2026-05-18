import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { File, ScanText, Upload, CheckCircle, AlertCircle, Loader } from 'lucide-react';

// Smart parser: extract key fields from raw OCR text
function parseOcrFields(text) {
  const fields = {};

  // Aadhaar: 12 digit number in groups of 4
  const aadhaar = text.match(/\b(\d{4}[\s-]?\d{4}[\s-]?\d{4})\b/);
  if (aadhaar) fields['Aadhaar No'] = aadhaar[1].replace(/\s|-/g, ' ');

  // PAN: 5 letters, 4 digits, 1 letter
  const pan = text.match(/\b([A-Z]{5}[0-9]{4}[A-Z])\b/);
  if (pan) fields['PAN'] = pan[1];

  // Date of Birth
  const dob = text.match(/\b(DOB|Date of Birth|D\.O\.B)[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\b/i);
  if (dob) fields['Date of Birth'] = dob[2];

  // Name (line containing "Name:" or after GOVERNMENT OF INDIA)
  const nameLine = text.match(/(?:Name|नाम)[:\s]+([A-Z][a-zA-Z\s]{3,40})/);
  if (nameLine) fields['Name'] = nameLine[1].trim();

  // Gender
  const gender = text.match(/\b(MALE|FEMALE|Male|Female)\b/);
  if (gender) fields['Gender'] = gender[1];

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
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('eng', 1, {
        logger: m => {
          if (m.status === 'recognizing text') {
            setOcrProgress(Math.round(m.progress * 100));
          }
        }
      });

      const result = await worker.recognize(selectedFile);
      await worker.terminate();

      const text = result.data.text.trim();
      setOcrText(text || 'No readable text detected.');
      setOcrFields(parseOcrFields(text));
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

    // Show image preview
    if (selected.type.startsWith('image/')) {
      const url = URL.createObjectURL(selected);
      setPreview(url);
      // Auto-run OCR
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
    if (ocrText && ocrText !== 'No readable text detected.' && ocrText !== 'OCR scan failed — you can still upload the document.') {
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
        <p className="text-gray-500 mt-1">Provide clear copies (PDF, JPG, PNG) under 5MB. Images are auto-scanned with OCR.</p>
      </div>

      {message.text && (
        <div className={`p-4 rounded-lg mb-6 flex items-center gap-2 ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          {message.text}
        </div>
      )}

      <form onSubmit={handleUpload} className="glass-panel p-6 rounded-2xl shadow-sm space-y-6">

        {/* Document Type */}
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

        {/* File Drop Zone */}
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

        {/* Image Preview */}
        {preview && (
          <div className="rounded-lg overflow-hidden border border-gray-200">
            <img src={preview} alt="Preview" className="w-full max-h-52 object-contain bg-gray-50" />
          </div>
        )}

        {/* OCR Section — auto shows for images */}
        {file?.type.startsWith('image/') && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <ScanText size={18} className="text-blue-600" />
                <h3 className="text-sm font-semibold text-blue-900">OCR Text Extraction</h3>
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

            {scanning && (
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

            {/* Parsed Key Fields */}
            {!scanning && Object.keys(ocrFields).length > 0 && (
              <div className="mb-3 grid grid-cols-2 gap-2">
                {Object.entries(ocrFields).map(([key, val]) => (
                  <div key={key} className="bg-white rounded-lg border border-blue-100 px-3 py-2">
                    <p className="text-xs text-blue-500 font-medium">{key}</p>
                    <p className="text-sm font-semibold text-gray-800 truncate">{val}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Raw OCR Text */}
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

        {/* Upload Button */}
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
