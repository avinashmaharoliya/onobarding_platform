import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { File, ScanText, Upload } from 'lucide-react';

const DocumentUpload = () => {
  const [docTypes, setDocTypes] = useState([]);
  const [selectedType, setSelectedType] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [ocrText, setOcrText] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDocTypes = async () => {
      try {
        const res = await api.get('/documents/my');
        // Filter to only types we haven't approved yet, or just show all
        setDocTypes(res.data);
      } catch (error) {
        console.error(error);
      }
    };
    fetchDocTypes();
  }, []);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setOcrText('');
      setMessage('');
    }
  };

  const handleScan = async () => {
    if (!file) {
      setMessage('Please select an image file first.');
      return;
    }

    if (!file.type.startsWith('image/')) {
      setMessage('OCR preview is available for JPG and PNG files only.');
      return;
    }

    setScanning(true);
    setMessage('');
    setOcrText('');

    try {
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('eng');
      const result = await worker.recognize(file);
      await worker.terminate();
      setOcrText(result.data.text.trim() || 'No readable text detected.');
    } catch (error) {
      console.error(error);
      setMessage('OCR scan failed. You can still upload the document.');
    } finally {
      setScanning(false);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file || !selectedType) {
      setMessage('Please select a file and document type.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('document_type_id', selectedType);

    setUploading(true);
    setMessage('');
    try {
      await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setMessage('Document uploaded successfully!');
      setFile(null);
      setTimeout(() => navigate('/documents/status'), 1500);
    } catch (error) {
      setMessage(error.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="animate-fade-in max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Upload Document</h1>
        <p className="text-gray-500 mt-1">Please provide clear copies (PDF, JPG, PNG) under 5MB.</p>
      </div>

      {message && (
        <div className={`p-4 rounded-lg mb-6 ${message.includes('success') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {message}
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
                {dt.type_name} {dt.mandatory ? '*' : ''}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">File</label>
          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-primary transition">
            <div className="space-y-1 text-center">
              <File className="mx-auto h-12 w-12 text-gray-400" />
              <div className="flex text-sm text-gray-600">
                <label className="relative cursor-pointer bg-white rounded-md font-medium text-primary hover:text-primary-dark focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary">
                  <span>Upload a file</span>
                  <input type="file" className="sr-only" onChange={handleFileChange} accept=".pdf,.jpg,.jpeg,.png" />
                </label>
                <p className="pl-1">or drag and drop</p>
              </div>
              <p className="text-xs text-gray-500">PDF, PNG, JPG up to 5MB</p>
            </div>
          </div>
          {file && <p className="mt-2 text-sm text-gray-600">Selected: {file.name}</p>}
        </div>

        {file?.type.startsWith('image/') && (
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-blue-900">OCR Preview</h3>
                <p className="text-xs text-blue-700 mt-1">Extract visible text before upload as a bonus verification aid.</p>
              </div>
              <button
                type="button"
                onClick={handleScan}
                disabled={scanning}
                className="bg-white hover:bg-blue-100 text-blue-700 border border-blue-200 px-4 py-2 rounded-lg flex items-center justify-center space-x-2 transition disabled:opacity-50"
              >
                <ScanText size={18} />
                <span>{scanning ? 'Scanning...' : 'Scan Text'}</span>
              </button>
            </div>
            {ocrText && (
              <div className="mt-4 bg-white rounded-lg border border-blue-100 p-3 text-sm text-gray-700 whitespace-pre-wrap max-h-40 overflow-auto">
                {ocrText}
              </div>
            )}
          </div>
        )}

        <button 
          type="submit" 
          disabled={uploading}
          className="w-full bg-primary hover:bg-primary-dark text-white py-2.5 rounded-lg flex items-center justify-center space-x-2 transition disabled:opacity-50"
        >
          <Upload size={18} />
          <span>{uploading ? 'Uploading...' : 'Upload Document'}</span>
        </button>
      </form>
    </div>
  );
};

export default DocumentUpload;
