import { useCallback, useEffect, useState, useRef } from 'react';
import api from '../api/axios';
import { useNavigate } from 'react-router-dom';
import ProgressBar from '../components/ProgressBar';
import { CheckCircle, AlertCircle, FileText, Calendar, X } from 'lucide-react';

const Checklist = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [joiningDate, setJoiningDate] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [activeItem, setActiveItem] = useState(null);
  const [modalType, setModalType] = useState(null);
  const [formResponse, setFormResponse] = useState('');
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState('');

  useEffect(() => {
    if (modalType === 'signature' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#0f766e';
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
      
      // Deduplicate items by item_id
      const uniqueItems = [];
      const seenIds = new Set();
      
      res.data.forEach(item => {
        if (!seenIds.has(item.item_id)) {
          seenIds.add(item.item_id);
          uniqueItems.push(item);
        }
      });
      
      setItems(uniqueItems);
      const completed = uniqueItems.filter(i => i.completed).length;
      setProgress(uniqueItems.length > 0 ? (completed / uniqueItems.length) * 100 : 0);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChecklist();
  }, []);

  const handleItemClick = (item) => {
    if (item.completed) return;
    setActiveItem(item);
    setFormResponse('');
    setModalError('');
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
      // Fetch current status before confirming
      const [docsRes, checklistRes] = await Promise.all([
        api.get('/documents/my'),
        api.get('/checklist')
      ]);

      const docs = docsRes.data || [];
      let checklist = checklistRes.data || [];
      
      // Deduplicate checklist items
      const uniqueChecklist = [];
      const seenIds = new Set();
      checklist.forEach(item => {
        if (!seenIds.has(item.item_id)) {
          seenIds.add(item.item_id);
          uniqueChecklist.push(item);
        }
      });
      checklist = uniqueChecklist;

      // Filter out Experience Letter (it's optional)
      const mandatoryDocs = docs.filter(doc => doc.mandatory && doc.type_name !== 'Experience Letter');
      const allMandatoryDocsApproved = mandatoryDocs.every(doc => doc.status === 'Approved');
      
      // Check if all checklist items are completed
      const allChecklistCompleted = checklist.every(item => item.completed);

      if (!allMandatoryDocsApproved) {
        const pendingDocs = mandatoryDocs.filter(doc => doc.status !== 'Approved').map(doc => doc.type_name).join(', ');
        setMessage(`Error: The following mandatory documents are not approved yet: ${pendingDocs}`);
        return;
      }

      if (!allChecklistCompleted) {
        const pendingItems = checklist.filter(item => !item.completed).map(item => item.title).join(', ');
        setMessage(`Error: Please complete the following checklist items: ${pendingItems}`);
        return;
      }

      // If all checks pass, confirm the date
      await api.post('/joining/confirm', { joining_date: joiningDate });
      setMessage('Joining date confirmed successfully! Redirecting to your welcome message...');
      
      // Redirect to welcome page after 2 seconds
      setTimeout(() => {
        navigate('/welcome');
      }, 2000);
    } catch (error) {
      setMessage('Error: ' + (error.response?.data?.message || 'Verification failed. Make sure profile, documents, and checklist are complete.'));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50 to-slate-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-teal-600 to-cyan-600 rounded-xl flex items-center justify-center">
            <CheckCircle className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Onboarding Checklist</h1>
            <p className="text-slate-600 mt-1 font-medium">Complete these tasks to finalize your onboarding.</p>
          </div>
        </div>

        {/* Progress Section */}
        <div className="bg-white border-2 border-teal-100 rounded-2xl p-6 shadow-lg mb-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-slate-900 text-lg">Checklist Progress</h3>
            <span className="text-lg font-bold text-teal-600">{Math.round(progress)}%</span>
          </div>
          <ProgressBar progress={progress} />

          <div className="mt-6 space-y-3">
            {items.map(item => (
              <div
                key={item.item_id}
                onClick={() => handleItemClick(item)}
                className={`flex items-start gap-3 p-4 rounded-lg transition border-2 ${
                  item.completed
                    ? 'opacity-60 bg-slate-50 border-slate-200'
                    : 'cursor-pointer hover:bg-teal-50 hover:border-teal-300 border-teal-100 bg-white'
                }`}
              >
                <div className="flex items-center h-6 mt-0.5">
                  <input
                    type="checkbox"
                    checked={item.completed}
                    readOnly
                    className="w-5 h-5 text-teal-600 border-teal-300 rounded focus:ring-teal-500 pointer-events-none"
                  />
                </div>
                <div className="flex-1">
                  <span className={`block text-sm font-bold ${
                    item.completed
                      ? 'text-slate-400 line-through'
                      : 'text-slate-900'
                  }`}>
                    {item.title} {item.mandatory && <span className="text-red-500">*</span>}
                  </span>
                  {item.description && (
                    <span className={`block text-xs mt-1 ${
                      item.completed ? 'text-slate-400' : 'text-slate-600'
                    }`}>
                      {item.description}
                    </span>
                  )}
                </div>
                {item.completed && (
                  <CheckCircle className="text-green-500 flex-shrink-0" size={20} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Joining Date Section */}
        <div className="bg-white border-2 border-teal-100 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <Calendar className="text-teal-600" size={24} />
            <h3 className="text-lg font-bold text-slate-900">Confirm Joining Date</h3>
          </div>

          <p className="text-sm text-slate-600 mb-6 font-medium">
            You can only confirm your joining date once all mandatory documents are approved and checklist items are complete.
          </p>

          {message && (
            <div className={`p-4 rounded-lg mb-6 text-sm border-2 flex items-start gap-2 ${
              message.includes('success') || message.includes('Redirecting')
                ? 'bg-green-50 text-green-700 border-green-200'
                : 'bg-red-50 text-red-700 border-red-200'
            }`}>
              {message.includes('success') || message.includes('Redirecting') ? (
                <CheckCircle size={20} className="flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
              )}
              <span>{message}</span>
            </div>
          )}

          <form onSubmit={handleConfirmDate} className="flex flex-col sm:flex-row items-end gap-4">
            <div className="flex-1 w-full">
              <label className="block text-sm font-bold text-slate-900 mb-2">Select Date</label>
              <input
                type="date"
                required
                value={joiningDate}
                onChange={e => setJoiningDate(e.target.value)}
                className="w-full px-4 py-3 border-2 border-teal-100 rounded-lg focus:border-teal-600 focus:ring-2 focus:ring-teal-200 outline-none bg-slate-50 hover:bg-white text-slate-900 font-medium transition"
              />
            </div>
            <button
              type="submit"
              className="w-full sm:w-auto bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white px-6 py-3 rounded-lg font-bold transition shadow-lg shadow-teal-500/40 hover:shadow-xl"
            >
              Confirm Date
            </button>
          </form>
        </div>

        {/* Signature Modal */}
        {modalType === 'signature' && activeItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-slate-900">{activeItem.title}</h3>
                <button
                  onClick={() => {
                    setModalType(null);
                    setModalError('');
                  }}
                  className="text-slate-400 hover:text-slate-600 transition"
                >
                  <X size={24} />
                </button>
              </div>

              <p className="text-sm text-slate-600 mb-6 font-medium">
                {activeItem.description || 'Please provide your digital signature below.'}
              </p>

              {modalError && (
                <div className="bg-red-50 text-red-700 p-4 rounded-lg text-sm mb-4 border-2 border-red-200 flex items-start gap-2">
                  <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
                  {modalError}
                </div>
              )}

              {activeItem.custom_text && (
                <div className="bg-cyan-50 border-2 border-cyan-200 p-4 rounded-xl text-sm text-cyan-900 mb-6 max-h-40 overflow-y-auto whitespace-pre-wrap shadow-inner font-medium">
                  <span className="font-bold block mb-2">HR Note:</span>
                  {activeItem.custom_text}
                </div>
              )}

              <div className="border-2 border-dashed border-teal-300 rounded-xl bg-slate-50 mb-6 overflow-hidden touch-none">
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

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    const canvas = canvasRef.current;
                    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
                  }}
                  disabled={saving}
                  className="px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition font-bold text-sm disabled:opacity-50"
                >
                  Clear
                </button>
                <button
                  onClick={() => {
                    setModalType(null);
                    setModalError('');
                  }}
                  disabled={saving}
                  className="px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition font-bold text-sm disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSignatureSubmit}
                  disabled={saving}
                  className="px-6 py-2 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 disabled:from-slate-400 disabled:to-slate-400 text-white rounded-lg transition font-bold text-sm shadow-lg shadow-teal-500/40 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save & Sign'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Acknowledge Modal */}
        {modalType === 'acknowledge' && activeItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-slate-900">{activeItem.title}</h3>
                <button
                  onClick={() => setModalType(null)}
                  className="text-slate-400 hover:text-slate-600 transition"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border-2 border-teal-100 mb-6 max-h-[40vh] overflow-y-auto">
                {activeItem.custom_text ? (
                  <div className="bg-cyan-50 border-2 border-cyan-200 p-4 rounded-xl text-sm text-cyan-900 mb-4 whitespace-pre-wrap shadow-inner font-medium">
                    <span className="font-bold block mb-2">HR Custom Instructions:</span>
                    {activeItem.custom_text}
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-slate-700 leading-relaxed mb-4 font-medium">
                      {activeItem.description || 'Please read and acknowledge this item before proceeding.'}
                    </p>

                    {/* Demo Showcase Forms */}
                    {activeItem.title.includes('IT Setup') && (
                      <div className="mt-4 space-y-3 bg-white p-4 rounded-lg border-2 border-teal-100">
                        <div>
                          <label className="block text-xs text-slate-700 mb-2 font-bold">Preferred OS</label>
                          <select className="w-full text-sm p-2 border-2 border-teal-100 rounded-lg outline-none focus:ring-2 focus:ring-teal-200 focus:border-teal-600 bg-slate-50 hover:bg-white text-slate-900 font-medium transition">
                            <option>Windows</option>
                            <option>macOS</option>
                            <option>Linux</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-slate-700 mb-2 font-bold">Required Software</label>
                          <input type="text" placeholder="e.g. VS Code, Docker, Figma" className="w-full text-sm p-2 border-2 border-teal-100 rounded-lg outline-none focus:ring-2 focus:ring-teal-200 focus:border-teal-600 bg-slate-50 hover:bg-white text-slate-900 placeholder-slate-400 font-medium transition" />
                        </div>
                      </div>
                    )}

                    {activeItem.title.includes('Bank Details') && (
                      <div className="mt-4 space-y-3 bg-white p-4 rounded-lg border-2 border-teal-100">
                        <p className="text-xs text-amber-700 bg-amber-50 p-3 rounded-lg border-2 border-amber-200 font-medium">
                          This is a showcase form. In a real scenario, this links directly to your Profile tab where bank details are securely encrypted.
                        </p>
                        <div>
                          <label className="block text-xs text-slate-700 mb-2 font-bold">Account Holder Name</label>
                          <input type="text" className="w-full text-sm p-2 border-2 border-teal-100 rounded-lg outline-none bg-slate-100 text-slate-600 font-medium" value="John Doe (from Profile)" readOnly />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-700 mb-2 font-bold">Account Number</label>
                          <input type="password" value="1234567890" className="w-full text-sm p-2 border-2 border-teal-100 rounded-lg outline-none bg-slate-100 text-slate-600 font-medium" readOnly />
                        </div>
                      </div>
                    )}

                    {activeItem.title.includes('ID Card') && (
                      <div className="mt-4 bg-white p-4 rounded-lg border-2 border-teal-100">
                        <label className="block text-xs text-slate-700 mb-3 font-bold">Upload Photo (JPG/PNG)</label>
                        <div className="border-2 border-dashed border-teal-300 rounded-lg p-6 flex flex-col items-center justify-center text-slate-500 bg-slate-50 cursor-pointer hover:bg-teal-50 transition font-medium">
                          <span className="text-sm">Click to select photo (Demo)</span>
                        </div>
                      </div>
                    )}

                    {activeItem.title.includes('Handbook') && (
                      <div className="mt-4">
                        <div className="h-32 bg-white border-2 border-teal-100 rounded-lg overflow-y-auto p-4 text-xs text-slate-700 font-medium">
                          <h4 className="font-bold text-slate-900 mb-2 border-b-2 border-teal-100 pb-2">Company Policy V2.4</h4>
                          <p className="mb-2">1. Working hours are from 9 AM to 5 PM local time.</p>
                          <p className="mb-2">2. Confidentiality: Employees must not disclose proprietary information.</p>
                          <p className="mb-2">3. Leave Policy: Employees are entitled to 20 days of paid leave annually.</p>
                          <p>4. Remote Work: Eligible employees may work remotely up to 2 days per week.</p>
                        </div>
                      </div>
                    )}
                  </>
                )}

                <div className="mt-4 bg-white p-4 rounded-xl border-2 border-teal-100 shadow-sm">
                  <label className="block text-xs font-bold text-slate-900 mb-2">Your Response / Remarks (Optional unless specified)</label>
                  <textarea
                    rows="3"
                    className="w-full text-sm p-3 border-2 border-teal-100 rounded-lg focus:ring-2 focus:ring-teal-200 focus:border-teal-600 outline-none bg-slate-50 hover:bg-white text-slate-900 placeholder-slate-400 font-medium transition resize-none"
                    placeholder="Type your response here..."
                    value={formResponse}
                    onChange={(e) => setFormResponse(e.target.value)}
                  />
                </div>

                <p className="text-xs text-slate-500 mt-4 italic font-medium">
                  By clicking "I Acknowledge & Complete", you confirm that you have read and understood the contents of this item.
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setModalType(null)}
                  className="px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition font-bold text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={() => markItemComplete(activeItem.item_id)}
                  className="px-6 py-2 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white rounded-lg transition font-bold text-sm shadow-lg shadow-teal-500/40"
                >
                  I Acknowledge & Complete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Checklist;
