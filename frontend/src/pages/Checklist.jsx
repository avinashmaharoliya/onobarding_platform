import { useCallback, useEffect, useState, useRef } from 'react';
import api from '../api/axios';
import ProgressBar from '../components/ProgressBar';

const Checklist = () => {
  const [items, setItems] = useState([]);
  const [joiningDate, setJoiningDate] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [activeItem, setActiveItem] = useState(null);
  const [modalType, setModalType] = useState(null); // 'signature' | 'acknowledge' | null
  const [formResponse, setFormResponse] = useState('');
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);

  // Setup canvas context when modal opens
  useEffect(() => {
    if (modalType === 'signature' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#111827';
    }
  }, [modalType]);

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

  const fetchChecklist = useCallback(async () => {
    try {
      const res = await api.get('/checklist');
      setItems(res.data);
      
      const completed = res.data.filter(i => i.completed).length;
      setProgress(res.data.length > 0 ? (completed / res.data.length) * 100 : 0);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchChecklist();
  }, [fetchChecklist]);

  const handleItemClick = (item) => {
    if (item.completed) return; // Already done

    setActiveItem(item);
    setFormResponse(''); // Reset response
    if (item.title.toLowerCase().includes('sign')) {
      setModalType('signature');
    } else {
      setModalType('acknowledge');
    }
  };

  const markItemComplete = async (itemId) => {
    try {
      await api.patch(`/checklist/${itemId}`, { 
        completed: true,
        submitted_data: formResponse.trim() ? { response: formResponse.trim() } : null
      });
      void fetchChecklist();
      setModalType(null);
      setActiveItem(null);
    } catch (error) {
      console.error("Failed to update checklist", error);
      setModalError("Failed to update checklist item. Please try again.");
      throw error;
    }
  };

  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState('');

  const handleSignatureSubmit = async () => {
    try {
      setModalError('');
      
      setSaving(true);
      const dataUrl = canvasRef.current.toDataURL('image/png');
      
      await api.post('/signature', { signature: dataUrl });
      await markItemComplete(activeItem.item_id);
    } catch (error) {
      console.error("Failed to save signature", error);
      setModalError(error.response?.data?.message || error.response?.data?.detail || error.message || "Failed to save signature. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDate = async (e) => {
    e.preventDefault();
    setMessage('');
    try {
      await api.post('/joining/confirm', { joining_date: joiningDate });
      setMessage('Joining date confirmed successfully!');
    } catch (error) {
      setMessage('Error: ' + (error.response?.data?.message || 'Verification failed. Make sure profile, documents, and checklist are complete.'));
    }
  };

  if (loading) return <div className="text-center mt-20">Loading...</div>;

  return (
    <div className="animate-fade-in max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Onboarding Checklist</h1>
        <p className="text-gray-500 mt-1">Complete these tasks to finalize your onboarding.</p>
      </div>

      <div className="glass-panel p-6 rounded-2xl shadow-sm mb-8">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-semibold text-gray-700">Checklist Progress</h3>
          <span className="text-sm font-medium text-primary">{Math.round(progress)}%</span>
        </div>
        <ProgressBar progress={progress} />
        
        <div className="mt-6 space-y-3">
          {items.map(item => (
            <div 
              key={item.item_id} 
              onClick={() => handleItemClick(item)}
              className={`flex items-start space-x-3 p-3 rounded-lg transition border border-transparent ${item.completed ? 'opacity-70' : 'cursor-pointer hover:bg-gray-50 hover:border-gray-200'}`}
            >
              <div className="flex items-center h-5">
                <input
                  type="checkbox"
                  checked={item.completed}
                  readOnly
                  className="w-5 h-5 text-primary border-gray-300 rounded focus:ring-primary pointer-events-none"
                />
              </div>
              <div className="flex-1">
                <span className={`block text-sm font-medium ${item.completed ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                  {item.title} {item.mandatory && <span className="text-red-500">*</span>}
                </span>
                {item.description && (
                  <span className={`block text-xs mt-0.5 ${item.completed ? 'text-gray-400' : 'text-gray-500'}`}>
                    {item.description}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="glass-panel p-6 rounded-2xl shadow-sm">
        <h3 className="text-lg font-bold text-gray-900 mb-2">Confirm Joining Date</h3>
        <p className="text-sm text-gray-500 mb-4">You can only confirm your joining date once all mandatory documents are approved and checklist items are complete.</p>
        
        {message && (
          <div className={`p-4 rounded-lg mb-4 text-sm ${message.includes('success') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {message}
          </div>
        )}

        <form onSubmit={handleConfirmDate} className="flex items-end space-x-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Date</label>
            <input 
              type="date" 
              required
              value={joiningDate}
              onChange={e => setJoiningDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none" 
            />
          </div>
          <button 
            type="submit" 
            className="bg-primary hover:bg-primary-dark text-white px-6 py-2.5 rounded-lg font-medium transition shadow-sm"
          >
            Confirm Date
          </button>
        </form>
      </div>

      {/* Modals */}
      {modalType === 'signature' && activeItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fade-in backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-slide-up p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-2">{activeItem.title}</h3>
            <p className="text-sm text-gray-500 mb-6">{activeItem.description || 'Please provide your digital signature below.'}</p>
            
            {modalError && (
              <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm mb-4">
                {modalError}
              </div>
            )}

            {activeItem.custom_text && (
              <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl text-sm text-blue-900 mb-6 max-h-40 overflow-y-auto whitespace-pre-wrap shadow-inner">
                <span className="font-semibold block mb-1">HR Note:</span>
                {activeItem.custom_text}
              </div>
            )}
            
            <div className="border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 mb-4 overflow-hidden touch-none">
              <canvas 
                ref={canvasRef}
                width="480"
                height="192"
                className="w-full h-48 cursor-crosshair bg-white"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button 
                onClick={() => {
                  const canvas = canvasRef.current;
                  canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
                }}
                disabled={saving}
                className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition font-medium text-sm disabled:opacity-50"
              >
                Clear
              </button>
              <button 
                onClick={() => {
                  setModalType(null);
                  setModalError('');
                }}
                disabled={saving}
                className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition font-medium text-sm disabled:opacity-50"
              >
                Cancel
              </button>
              <button 
                onClick={handleSignatureSubmit}
                disabled={saving}
                className="px-6 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg transition font-medium text-sm shadow-sm disabled:opacity-50 flex items-center"
              >
                {saving ? 'Saving...' : 'Save & Sign'}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalType === 'acknowledge' && activeItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fade-in backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-slide-up p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">{activeItem.title}</h3>
            
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 mb-6 max-h-[60vh] overflow-y-auto">
              {activeItem.custom_text ? (
                <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl text-sm text-blue-900 mb-4 whitespace-pre-wrap shadow-inner">
                  <span className="font-semibold block mb-1">HR Custom Instructions:</span>
                  {activeItem.custom_text}
                </div>
              ) : (
                <>
                  <p className="text-sm text-gray-700 leading-relaxed mb-4">
                    {activeItem.description || 'Please read and acknowledge this item before proceeding.'}
                  </p>
                  
                  {/* Demo Showcase Forms */}
                  {activeItem.title.includes('IT Setup') && (
                    <div className="mt-4 space-y-3 bg-white p-3 rounded border">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1 font-medium">Preferred OS</label>
                        <select className="w-full text-sm p-2 border rounded-md outline-none focus:ring-1 focus:ring-primary">
                          <option>Windows</option>
                          <option>macOS</option>
                          <option>Linux</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1 font-medium">Required Software</label>
                        <input type="text" placeholder="e.g. VS Code, Docker, Figma" className="w-full text-sm p-2 border rounded-md outline-none focus:ring-1 focus:ring-primary" />
                      </div>
                    </div>
                  )}

                  {activeItem.title.includes('Bank Details') && (
                    <div className="mt-4 space-y-3 bg-white p-3 rounded border">
                      <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
                        This is a showcase form. In a real scenario, this links directly to your Profile tab where bank details are securely encrypted.
                      </p>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1 font-medium">Account Holder Name</label>
                        <input type="text" className="w-full text-sm p-2 border rounded-md outline-none bg-gray-50 text-gray-500" value="John Doe (from Profile)" readOnly />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1 font-medium">Account Number</label>
                        <input type="password" value="1234567890" className="w-full text-sm p-2 border rounded-md outline-none bg-gray-50 text-gray-500" readOnly />
                      </div>
                    </div>
                  )}

                  {activeItem.title.includes('ID Card') && (
                    <div className="mt-4 bg-white p-3 rounded border">
                      <label className="block text-xs text-gray-600 mb-2 font-medium">Upload Photo (JPG/PNG)</label>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center text-gray-500 bg-gray-50 cursor-pointer hover:bg-gray-100 transition">
                        <span className="text-sm font-medium">Click to select photo (Demo)</span>
                      </div>
                    </div>
                  )}

                  {activeItem.title.includes('Handbook') && (
                    <div className="mt-4">
                      <div className="h-32 bg-white border rounded-lg overflow-y-auto p-3 text-xs text-gray-600">
                        <h4 className="font-bold text-gray-800 mb-2 border-b pb-1">Company Policy V2.4</h4>
                        <p className="mb-2">1. Working hours are from 9 AM to 5 PM local time.</p>
                        <p className="mb-2">2. Confidentiality: Employees must not disclose proprietary information.</p>
                        <p className="mb-2">3. Leave Policy: Employees are entitled to 20 days of paid leave annually.</p>
                        <p>4. Remote Work: Eligible employees may work remotely up to 2 days per week.</p>
                      </div>
                    </div>
                  )}
                </>
              )}
              
              <div className="mt-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <label className="block text-xs font-semibold text-gray-700 mb-2">Your Response / Remarks (Optional unless specified)</label>
                <textarea
                  rows="3"
                  className="w-full text-sm p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                  placeholder="Type your response here..."
                  value={formResponse}
                  onChange={(e) => setFormResponse(e.target.value)}
                />
              </div>

              <p className="text-xs text-gray-500 mt-4 italic">
                By clicking "I Acknowledge & Complete", you confirm that you have read and understood the contents of this item.
              </p>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button 
                onClick={() => setModalType(null)}
                className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition font-medium text-sm"
              >
                Cancel
              </button>
              <button 
                onClick={() => markItemComplete(activeItem.item_id)}
                className="px-6 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg transition font-medium text-sm shadow-sm"
              >
                I Acknowledge & Complete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Checklist;
