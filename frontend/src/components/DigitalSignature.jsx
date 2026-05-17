import { useEffect, useRef, useState } from 'react';
import api from '../api/axios';
import { Eraser, PenLine, Save } from 'lucide-react';

const DigitalSignature = () => {
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [signedAt, setSignedAt] = useState(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#111827';

    const fetchSignatureStatus = async () => {
      try {
        const res = await api.get('/signature/me');
        setSignedAt(res.data.signed_at);
      } catch (error) {
        console.error(error);
      }
    };

    void fetchSignatureStatus();
  }, []);

  const getPoint = (event) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const source = event.touches?.[0] || event;

    return {
      x: source.clientX - rect.left,
      y: source.clientY - rect.top,
    };
  };

  const startDrawing = (event) => {
    event.preventDefault();
    const ctx = canvasRef.current.getContext('2d');
    const point = getPoint(event);
    drawingRef.current = true;
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
  };

  const draw = (event) => {
    if (!drawingRef.current) return;
    event.preventDefault();
    const ctx = canvasRef.current.getContext('2d');
    const point = getPoint(event);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    drawingRef.current = false;
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    setMessage('');
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');

    try {
      const signature = canvasRef.current.toDataURL('image/png');
      const res = await api.post('/signature', { signature });
      setMessage(res.data.message);
      setSignedAt(new Date().toISOString());
    } catch (error) {
      const apiMessage = error.response?.data?.detail || error.response?.data?.message;
      setMessage(apiMessage || 'Failed to save signature. Restart the backend server and try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-fade-in max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Digital Signature</h1>
        <p className="text-gray-500 mt-1">Sign once here to acknowledge onboarding forms and declarations.</p>
      </div>

      {message && (
        <div className={`p-4 rounded-lg mb-6 ${message.includes('success') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {message}
        </div>
      )}

      {signedAt && (
        <div className="p-4 rounded-lg mb-6 bg-blue-50 text-blue-700">
          Current signature saved on {new Date(signedAt).toLocaleString()}.
        </div>
      )}

      <div className="glass-panel p-6 rounded-2xl shadow-sm">
        <div className="border border-gray-300 rounded-lg overflow-hidden bg-white touch-none">
          <canvas
            ref={canvasRef}
            width="720"
            height="240"
            className="w-full h-60 cursor-crosshair"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
        </div>

        <div className="mt-4 flex flex-col sm:flex-row gap-3 sm:justify-end">
          <button
            type="button"
            onClick={handleClear}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-5 py-2.5 rounded-lg font-medium transition flex items-center justify-center space-x-2"
          >
            <Eraser size={18} />
            <span>Clear</span>
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="bg-primary hover:bg-primary-dark text-white px-5 py-2.5 rounded-lg font-medium transition flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            {saving ? <Save size={18} /> : <PenLine size={18} />}
            <span>{saving ? 'Saving...' : 'Save Signature'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DigitalSignature;
