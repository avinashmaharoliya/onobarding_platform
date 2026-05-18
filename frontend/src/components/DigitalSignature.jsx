import { useEffect, useRef, useState } from 'react';
import api from '../api/axios';
import { Eraser, PenLine, Save, CheckCircle, AlertCircle } from 'lucide-react';

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
    ctx.strokeStyle = '#0f766e';

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50 to-slate-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-teal-600 to-cyan-600 rounded-xl flex items-center justify-center">
            <PenLine className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Digital Signature</h1>
            <p className="text-slate-600 mt-1 font-medium">Sign once here to acknowledge onboarding forms and declarations.</p>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className={`p-4 rounded-lg mb-6 border-2 flex items-center gap-2 ${
            message.includes('success')
              ? 'bg-green-50 text-green-700 border-green-200'
              : 'bg-red-50 text-red-700 border-red-200'
          }`}
          >
            {message.includes('success') ? (
              <CheckCircle size={20} />
            ) : (
              <AlertCircle size={20} />
            )}
            {message}
          </div>
        )}

        {/* Signed Status */}
        {signedAt && (
          <div className="p-4 rounded-lg mb-6 bg-cyan-50 text-cyan-700 border-2 border-cyan-200 flex items-center gap-2 font-medium">
            <CheckCircle size={20} />
            Current signature saved on {new Date(signedAt).toLocaleString()}.
          </div>
        )}

        {/* Canvas */}
        <div className="bg-white border-2 border-teal-100 rounded-2xl p-6 shadow-lg">
          <div className="border-2 border-dashed border-teal-300 rounded-lg overflow-hidden bg-white touch-none">
            <canvas
              ref={canvasRef}
              width="720"
              height="240"
              className="w-full h-60 cursor-crosshair bg-white"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
          </div>

          {/* Buttons */}
          <div className="mt-6 flex flex-col sm:flex-row gap-3 sm:justify-end">
            <button
              type="button"
              onClick={handleClear}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-2.5 rounded-lg font-bold transition flex items-center justify-center gap-2"
            >
              <Eraser size={18} />
              <span>Clear</span>
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 disabled:from-slate-400 disabled:to-slate-400 text-white px-5 py-2.5 rounded-lg font-bold transition flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-teal-500/40"
            >
              {saving ? <Save size={18} /> : <PenLine size={18} />}
              <span>{saving ? 'Saving...' : 'Save Signature'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DigitalSignature;
