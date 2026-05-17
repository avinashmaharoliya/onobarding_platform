import { useCallback, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../api/axios';
import StatusBadge from '../../components/StatusBadge';
import { CheckCircle, XCircle, ArrowLeft, Download, Eye, X } from 'lucide-react';

const HRVerify = () => {
  const { userId } = useParams();
  const [docs, setDocs] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [remarks, setRemarks] = useState({});
  const [message, setMessage] = useState('');
  const [previewDoc, setPreviewDoc] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [checklist, setChecklist] = useState([]);
  const [signatureUrl, setSignatureUrl] = useState(null);
  const [editingChecklistId, setEditingChecklistId] = useState(null);
  const [customText, setCustomText] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const [docsRes, profileRes, checklistRes] = await Promise.all([
        api.get(`/admin/documents/${userId}`),
        api.get(`/admin/employee/${userId}/profile`).catch(() => ({ data: null })),
        api.get(`/admin/employee/${userId}/checklist`).catch(() => ({ data: [] }))
      ]);
      setDocs(docsRes.data);
      if (profileRes.data) setProfile(profileRes.data);
      if (checklistRes.data) setChecklist(checklistRes.data);

      try {
        const sigRes = await api.get(`/admin/employee/${userId}/signature`, { responseType: 'blob' });
        if (sigRes.data) {
          const sigUrl = window.URL.createObjectURL(new Blob([sigRes.data], { type: 'image/png' }));
          setSignatureUrl(sigUrl);
        }
      } catch (err) {
        // Expected if no signature exists
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void fetchData();

    return () => {
      if (signatureUrl) window.URL.revokeObjectURL(signatureUrl);
    };
  }, [fetchData]);

  const handleSaveCustomText = async (itemId) => {
    try {
      await api.put(`/admin/employee/${userId}/checklist/${itemId}/customize`, { custom_text: customText });
      setMessage('Custom text saved successfully');
      setEditingChecklistId(null);
      void fetchData();
    } catch (error) {
      setMessage('Error: ' + (error.response?.data?.message || 'Failed to save custom text'));
    }
  };

  const handleVerify = async (docId, status) => {
    const remark = remarks[docId] || '';
    if (status === 'Rejected' && !remark.trim()) {
      setMessage('Please enter a remark before rejecting a document.');
      return;
    }

    try {
      await api.patch(`/admin/documents/${docId}/verify`, { status, remark });
      setMessage(`Document successfully ${status.toLowerCase()}`);
      void fetchData();
      setRemarks({ ...remarks, [docId]: '' });
    } catch (error) {
      setMessage('Error: ' + (error.response?.data?.message || 'Update failed'));
    }
  };

  const downloadFile = async (docId, fileName, mimeType) => {
    try {
      const res = await api.get(`/documents/file/${docId}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: mimeType }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName || `document-${docId}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error("Download failed", error);
    }
  };

  const previewFile = async (docId, fileName, mimeType) => {
    try {
      const res = await api.get(`/documents/file/${docId}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: mimeType }));
      setPreviewUrl(url);
      setPreviewDoc({ id: docId, fileName, mimeType });
    } catch (error) {
      console.error("Preview failed", error);
      setMessage('Failed to load document preview.');
    }
  };

  const closePreview = () => {
    if (previewUrl) {
      window.URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setPreviewDoc(null);
  };

  if (loading) return <div className="text-center mt-20">Loading...</div>;

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <Link to="/hr/dashboard" className="text-primary hover:underline flex items-center space-x-1 text-sm mb-4">
          <ArrowLeft size={16} />
          <span>Back to Dashboard</span>
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Document Verification</h1>
        <p className="text-gray-500 mt-1">Review and approve employee documents.</p>
      </div>

      {message && (
        <div className={`p-4 rounded-lg mb-6 ${message.includes('Error') || message.includes('Please') || message.includes('Failed') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          {message}
        </div>
      )}

      {profile && (
        <div className="glass-panel p-6 rounded-2xl shadow-sm mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 border-b border-gray-100 pb-2">Employee Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Name</p>
              <p className="text-sm font-medium text-gray-900">{profile.name || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Email</p>
              <p className="text-sm font-medium text-gray-900">{profile.email || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Status</p>
              <div className="mt-1"><StatusBadge status={profile.status} /></div>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Date of Birth</p>
              <p className="text-sm font-medium text-gray-900">{profile.dob ? new Date(profile.dob).toLocaleDateString() : 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Gender</p>
              <p className="text-sm font-medium text-gray-900">{profile.gender || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Emergency Contact</p>
              <p className="text-sm font-medium text-gray-900">{profile.emergency_contact || 'N/A'}</p>
            </div>
            <div className="md:col-span-2 lg:col-span-3">
              <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Address</p>
              <p className="text-sm font-medium text-gray-900">{profile.address || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">PAN Number</p>
              <p className="text-sm font-mono text-gray-900 bg-gray-50 px-2 py-1 rounded inline-block mt-1">{profile.pan || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Bank Account</p>
              <p className="text-sm font-mono text-gray-900 bg-gray-50 px-2 py-1 rounded inline-block mt-1">{profile.bank_account || 'N/A'}</p>
            </div>
            {profile.education_json && (
              <div className="md:col-span-2 lg:col-span-3">
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Education</p>
                <p className="text-sm font-medium text-gray-900 bg-gray-50 px-3 py-2 rounded inline-block">
                  {profile.education_json.degree} from {profile.education_json.college} ({profile.education_json.year})
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {checklist.length > 0 && (
        <div className="glass-panel p-6 rounded-2xl shadow-sm mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 border-b border-gray-100 pb-2">Checklist & Consents</h2>
          
          <div className="space-y-3 mb-6">
            {checklist.map(item => (
              <div key={item.item_id} className="flex flex-col space-y-2 p-4 bg-gray-50 rounded-lg border border-gray-100">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div className="mt-0.5 shrink-0">
                      {item.completed ? (
                        <CheckCircle size={18} className="text-green-500" />
                      ) : (
                        <div className="w-[18px] h-[18px] rounded-full border-2 border-gray-300"></div>
                      )}
                    </div>
                    <div>
                      <p className={`text-sm font-medium ${item.completed ? 'text-gray-900' : 'text-gray-500'}`}>{item.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
                    </div>
                  </div>
                  {!item.completed && (
                    <button
                      onClick={() => {
                        setEditingChecklistId(item.item_id);
                        setCustomText(item.custom_text || '');
                      }}
                      className="text-xs text-primary hover:underline font-medium"
                    >
                      Edit Custom Text
                    </button>
                  )}
                </div>

                {/* Edit Form */}
                {editingChecklistId === item.item_id && (
                  <div className="mt-3 bg-white p-3 rounded-lg border border-gray-200 shadow-sm ml-7 animate-fade-in">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Custom Form / NDA Text</label>
                    <textarea
                      rows="3"
                      className="w-full text-sm p-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary outline-none"
                      placeholder="Enter custom instructions or form requirements for this employee..."
                      value={customText}
                      onChange={(e) => setCustomText(e.target.value)}
                    />
                    <div className="flex justify-end space-x-2 mt-2">
                      <button onClick={() => setEditingChecklistId(null)} className="px-3 py-1 text-xs text-gray-600 bg-gray-100 hover:bg-gray-200 rounded font-medium">Cancel</button>
                      <button onClick={() => handleSaveCustomText(item.item_id)} className="px-3 py-1 text-xs text-white bg-primary hover:bg-primary-dark rounded font-medium shadow-sm">Save Text</button>
                    </div>
                  </div>
                )}

                {/* Display existing custom text if set and not editing */}
                {item.custom_text && editingChecklistId !== item.item_id && (
                  <div className="ml-7 mt-1 p-2 bg-blue-50 border border-blue-100 rounded-lg text-xs text-gray-700">
                    <span className="font-semibold text-blue-900">Custom Form Text:</span> <span className="whitespace-pre-wrap">{item.custom_text}</span>
                  </div>
                )}

                {/* Display submitted data if completed */}
                {item.completed && item.submitted_data?.response && (
                  <div className="ml-7 mt-2 p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Employee Response</p>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">{item.submitted_data.response}</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {signatureUrl && (
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2">Digital Signature</p>
              <div className="bg-white border-2 border-dashed border-gray-200 rounded-xl p-4 inline-block">
                <img src={signatureUrl} alt="Employee Signature" className="h-24 object-contain" />
              </div>
            </div>
          )}
        </div>
      )}

      <div className="space-y-6">
        {docs.length === 0 ? (
          <div className="glass-panel p-8 text-center text-gray-500 rounded-2xl">
            This employee hasn't uploaded any documents yet.
          </div>
        ) : (
          docs.map((doc) => (
            <div key={doc.id} className="glass-panel p-6 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-start gap-6">
              <div className="flex-1 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{doc.type_name}</h3>
                    <p className="text-sm text-gray-500">Uploaded on {new Date(doc.uploaded_at).toLocaleDateString()}</p>
                  </div>
                  <StatusBadge status={doc.status} />
                </div>
                
                <div className="bg-gray-50 p-3 rounded-lg flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700 truncate mr-4">{doc.file_name}</span>
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => previewFile(doc.id, doc.file_name, doc.mime_type || 'application/pdf')}
                      className="text-primary hover:text-primary-dark p-2 bg-blue-50 hover:bg-blue-100 rounded-lg transition flex items-center space-x-1 text-sm font-medium"
                      title="Preview Document"
                    >
                      <Eye size={16} />
                      <span className="hidden sm:inline">Preview</span>
                    </button>
                    <button 
                      onClick={() => downloadFile(doc.id, doc.file_name, doc.mime_type || 'application/octet-stream')}
                      className="text-gray-600 hover:text-gray-900 p-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition flex items-center justify-center"
                      title="Download"
                    >
                      <Download size={16} />
                    </button>
                  </div>
                </div>

                {doc.status !== 'Pending' && doc.remark && (
                  <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <span className="font-semibold text-gray-700">Remark:</span> {doc.remark}
                  </div>
                )}
                
                {doc.extracted_text && (
                  <div className="mt-2">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">OCR Extracted Text</p>
                    <div className="text-xs text-gray-600 bg-blue-50/50 p-3 rounded-lg border border-blue-100 max-h-32 overflow-y-auto whitespace-pre-wrap">
                      {doc.extracted_text}
                    </div>
                  </div>
                )}
              </div>

              {doc.status === 'Pending' && (
                <div className="md:w-72 bg-white p-4 rounded-xl border border-gray-100 flex flex-col space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">HR Remark (Required for rejection)</label>
                    <textarea 
                      rows="2"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
                      placeholder="Add reason for rejection..."
                      value={remarks[doc.id] || ''}
                      onChange={(e) => setRemarks({ ...remarks, [doc.id]: e.target.value })}
                    />
                  </div>
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => handleVerify(doc.id, 'Approved')}
                      className="flex-1 bg-green-50 hover:bg-green-100 text-green-700 py-2 rounded-lg text-sm font-medium transition flex items-center justify-center space-x-1 border border-green-200"
                    >
                      <CheckCircle size={16} />
                      <span>Approve</span>
                    </button>
                    <button 
                      onClick={() => handleVerify(doc.id, 'Rejected')}
                      className="flex-1 bg-red-50 hover:bg-red-100 text-red-700 py-2 rounded-lg text-sm font-medium transition flex items-center justify-center space-x-1 border border-red-200"
                    >
                      <XCircle size={16} />
                      <span>Reject</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {previewDoc && previewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fade-in backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-slide-up">
            <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-gray-50">
              <div className="flex items-center space-x-4 pr-4 overflow-hidden">
                <button 
                  onClick={closePreview}
                  className="flex items-center space-x-1 text-gray-600 hover:text-gray-900 transition font-medium text-sm bg-gray-200 hover:bg-gray-300 px-3 py-1.5 rounded-lg shrink-0"
                >
                  <ArrowLeft size={16} />
                  <span>Back</span>
                </button>
                <h3 className="font-bold text-gray-900 truncate">{previewDoc.fileName}</h3>
              </div>
              <div className="flex items-center space-x-2 shrink-0">
                <button 
                  onClick={() => downloadFile(previewDoc.id, previewDoc.fileName, previewDoc.mimeType)}
                  className="p-2 text-gray-600 hover:text-primary hover:bg-blue-50 rounded-lg transition flex items-center space-x-2"
                  title="Download"
                >
                  <Download size={18} />
                  <span className="text-sm font-medium hidden sm:inline">Download</span>
                </button>
                <div className="w-px h-6 bg-gray-300 mx-1"></div>
                <button 
                  onClick={closePreview}
                  className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition flex items-center space-x-1"
                  title="Close"
                >
                  <X size={20} />
                  <span className="text-sm font-medium hidden sm:inline">Close</span>
                </button>
              </div>
            </div>
            <div className="flex-1 bg-gray-200 overflow-auto flex items-center justify-center relative p-4">
              {previewDoc.mimeType?.startsWith('image/') ? (
                <img src={previewUrl} alt="Document Preview" className="max-w-full max-h-full object-contain shadow-sm rounded bg-white" />
              ) : (
                <iframe src={previewUrl} className="w-full h-full border-0 bg-white shadow-sm rounded" title="Document Preview" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HRVerify;
