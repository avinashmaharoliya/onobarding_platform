import { useCallback, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../api/axios';
import StatusBadge from '../../components/StatusBadge';
import { CheckCircle, XCircle, ArrowLeft, Download, Eye, X, AlertCircle, FileText } from 'lucide-react';

function parseFormattedOcrText(text) {
  const fields = (text || '')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map((line) => {
      const separatorIndex = line.indexOf(':');
      if (separatorIndex === -1) return null;

      const label = line.slice(0, separatorIndex).trim();
      const value = line.slice(separatorIndex + 1).trim();
      if (!label || !value) return null;
      return [label, value];
    })
    .filter(Boolean);

  return fields.length >= 2 ? fields : [];
}

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50 to-slate-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Back Button */}
        <div className="mb-8">
          <Link
            to="/hr/dashboard"
            className="inline-flex items-center gap-2 text-teal-600 hover:text-teal-700 transition font-bold text-sm mb-4"
          >
            <ArrowLeft size={16} />
            <span>Back to Dashboard</span>
          </Link>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-teal-600 to-cyan-600 rounded-xl flex items-center justify-center">
              <FileText className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Document Verification</h1>
              <p className="text-slate-600 mt-1 font-medium">Review and approve employee documents.</p>
            </div>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className={`p-4 rounded-lg mb-6 border-2 flex items-center gap-2 ${
            message.includes('Error') || message.includes('Please') || message.includes('Failed')
              ? 'bg-red-50 text-red-700 border-red-200'
              : 'bg-green-50 text-green-700 border-green-200'
          }`}
          >
            {message.includes('Error') || message.includes('Please') || message.includes('Failed') ? (
              <AlertCircle size={20} />
            ) : (
              <CheckCircle size={20} />
            )}
            {message}
          </div>
        )}

        {/* Employee Details */}
        {profile && (
          <div className="bg-white border-2 border-teal-100 rounded-2xl p-6 shadow-lg mb-8">
            <h2 className="text-xl font-bold text-slate-900 mb-4 border-b-2 border-teal-100 pb-4">Employee Details</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">Name</p>
                <p className="text-sm font-bold text-slate-900 mt-1">{profile.name || 'N/A'}</p>
              </div>

              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">Email</p>
                <p className="text-sm font-bold text-slate-900 mt-1">{profile.email || 'N/A'}</p>
              </div>

              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">Status</p>
                <div className="mt-1">
                  <StatusBadge status={profile.status} />
                </div>
              </div>

              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">Date of Birth</p>
                <p className="text-sm font-bold text-slate-900 mt-1">
                  {profile.dob ? new Date(profile.dob).toLocaleDateString() : 'N/A'}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">Gender</p>
                <p className="text-sm font-bold text-slate-900 mt-1">{profile.gender || 'N/A'}</p>
              </div>

              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">Emergency Contact</p>
                <p className="text-sm font-bold text-slate-900 mt-1">{profile.emergency_contact || 'N/A'}</p>
              </div>

              <div className="md:col-span-2 lg:col-span-3">
                <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">Address</p>
                <p className="text-sm font-bold text-slate-900 mt-1">{profile.address || 'N/A'}</p>
              </div>

              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">PAN Number</p>
                <p className="text-sm font-mono text-slate-900 bg-slate-100 px-3 py-2 rounded inline-block mt-1 font-bold">
                  {profile.pan || 'N/A'}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">Bank Account</p>
                <p className="text-sm font-mono text-slate-900 bg-slate-100 px-3 py-2 rounded inline-block mt-1 font-bold">
                  {profile.bank_account || 'N/A'}
                </p>
              </div>

              {profile.education_json && (
                <div className="md:col-span-2 lg:col-span-3">
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-2">Education</p>
                  <p className="text-sm font-bold text-slate-900 bg-slate-100 px-3 py-2 rounded inline-block">
                    {profile.education_json.degree} from {profile.education_json.college} ({profile.education_json.year})
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Checklist */}
        {checklist.length > 0 && (
          <div className="bg-white border-2 border-teal-100 rounded-2xl p-6 shadow-lg mb-8">
            <h2 className="text-xl font-bold text-slate-900 mb-4 border-b-2 border-teal-100 pb-4">Checklist & Consents</h2>

            <div className="space-y-3 mb-6">
              {checklist.map((item) => (
                <div
                  key={item.item_id}
                  className="flex flex-col gap-2 p-4 bg-slate-50 rounded-lg border-2 border-teal-100"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 shrink-0">
                        {item.completed ? (
                          <CheckCircle size={18} className="text-green-500" />
                        ) : (
                          <div className="w-[18px] h-[18px] rounded-full border-2 border-slate-300"></div>
                        )}
                      </div>
                      <div>
                        <p className={`text-sm font-bold ${item.completed ? 'text-slate-900' : 'text-slate-600'}`}>
                          {item.title}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5 font-medium">{item.description}</p>
                      </div>
                    </div>

                    {!item.completed && (
                      <button
                        onClick={() => {
                          setEditingChecklistId(item.item_id);
                          setCustomText(item.custom_text || '');
                        }}
                        className="text-xs text-teal-600 hover:text-teal-700 font-bold transition"
                      >
                        Edit Custom Text
                      </button>
                    )}
                  </div>

                  {/* Edit Form */}
                  {editingChecklistId === item.item_id && (
                    <div className="mt-3 bg-white p-4 rounded-lg border-2 border-teal-100 shadow-sm ml-7">
                      <label className="block text-xs font-bold text-slate-900 mb-2">Custom Form / NDA Text</label>
                      <textarea
                        rows="3"
                        className="w-full px-3 py-2 border-2 border-teal-100 rounded-lg text-sm focus:ring-2 focus:ring-teal-200 focus:border-teal-600 outline-none bg-slate-50 hover:bg-white text-slate-900 placeholder-slate-400 font-medium transition resize-none"
                        placeholder="Enter custom instructions or form requirements for this employee..."
                        value={customText}
                        onChange={(e) => setCustomText(e.target.value)}
                      />
                      <div className="flex justify-end gap-2 mt-3">
                        <button
                          onClick={() => setEditingChecklistId(null)}
                          className="px-3 py-1.5 text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg font-bold transition"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleSaveCustomText(item.item_id)}
                          className="px-3 py-1.5 text-xs text-white bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 rounded-lg font-bold shadow-lg shadow-teal-500/40 transition"
                        >
                          Save Text
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Display existing custom text */}
                  {item.custom_text && editingChecklistId !== item.item_id && (
                    <div className="ml-7 mt-1 p-3 bg-cyan-50 border-2 border-cyan-200 rounded-lg text-xs text-cyan-900 font-medium">
                      <span className="font-bold">Custom Form Text:</span> <span className="whitespace-pre-wrap">{item.custom_text}</span>
                    </div>
                  )}

                  {/* Display submitted data */}
                  {item.completed && item.submitted_data?.response && (
                    <div className="ml-7 mt-2 p-3 bg-white border-2 border-teal-100 rounded-lg shadow-sm">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Employee Response</p>
                      <p className="text-sm text-slate-800 whitespace-pre-wrap font-medium">{item.submitted_data.response}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Signature */}
            {signatureUrl && (
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-3">Digital Signature</p>
                <div className="bg-white border-2 border-dashed border-teal-300 rounded-xl p-4 inline-block">
                  <img src={signatureUrl} alt="Employee Signature" className="h-24 object-contain" />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Documents */}
        <div className="space-y-6">
          {docs.length === 0 ? (
            <div className="bg-white border-2 border-teal-100 rounded-2xl p-12 text-center shadow-lg">
              <FileText className="text-slate-300 mx-auto mb-3" size={48} />
              <p className="text-slate-500 font-medium">This employee hasn't uploaded any documents yet.</p>
            </div>
          ) : (
            docs.map((doc) => {
              const extractedFields = parseFormattedOcrText(doc.extracted_text);

              return (
                <div
                  key={doc.id}
                  className="bg-white border-2 border-teal-100 rounded-2xl p-6 shadow-lg hover:shadow-xl transition flex flex-col md:flex-row md:items-start gap-6"
                >
                <div className="flex-1 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">{doc.type_name}</h3>
                      <p className="text-sm text-slate-500 font-medium">Uploaded on {new Date(doc.uploaded_at).toLocaleDateString()}</p>
                    </div>
                    <StatusBadge status={doc.status} />
                  </div>

                  <div className="bg-slate-50 p-3 rounded-lg flex justify-between items-center border-2 border-teal-100">
                    <span className="text-sm font-bold text-slate-700 truncate mr-4">{doc.file_name}</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => previewFile(doc.id, doc.file_name, doc.mime_type || 'application/pdf')}
                        className="text-teal-600 hover:text-teal-700 p-2 bg-teal-50 hover:bg-teal-100 rounded-lg transition flex items-center gap-1 text-sm font-bold"
                        title="Preview Document"
                      >
                        <Eye size={16} />
                        <span className="hidden sm:inline">Preview</span>
                      </button>
                      <button
                        onClick={() => downloadFile(doc.id, doc.file_name, doc.mime_type || 'application/octet-stream')}
                        className="text-slate-600 hover:text-slate-900 p-2 bg-slate-200 hover:bg-slate-300 rounded-lg transition flex items-center justify-center"
                        title="Download"
                      >
                        <Download size={16} />
                      </button>
                    </div>
                  </div>

                  {doc.status !== 'Pending' && doc.remark && (
                    <div className="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg border-2 border-teal-100 font-medium">
                      <span className="font-bold">Remark:</span> {doc.remark}
                    </div>
                  )}

                  {doc.extracted_text && (
                    <div className="mt-2">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">AI Extracted Fields</p>
                      {extractedFields.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {extractedFields.map(([label, value]) => (
                            <div key={`${doc.id}-${label}`} className="bg-cyan-50 p-3 rounded-lg border-2 border-cyan-200">
                              <p className="text-xs text-teal-700 font-bold">{label}</p>
                              <p className="text-sm text-slate-900 font-bold mt-1 break-words">{value}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-xs text-slate-700 bg-cyan-50 p-3 rounded-lg border-2 border-cyan-200 max-h-32 overflow-y-auto whitespace-pre-wrap font-medium">
                          {doc.extracted_text}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {doc.status === 'Pending' && (
                  <div className="md:w-72 bg-white p-4 rounded-xl border-2 border-teal-100 flex flex-col gap-3 shadow-md">
                    <div>
                      <label className="block text-xs font-bold text-slate-900 mb-2">HR Remark (Required for rejection)</label>
                      <textarea
                        rows="2"
                        className="w-full px-3 py-2 border-2 border-teal-100 rounded-lg text-sm focus:ring-2 focus:ring-teal-200 focus:border-teal-600 outline-none bg-slate-50 hover:bg-white text-slate-900 placeholder-slate-400 font-medium transition resize-none"
                        placeholder="Add reason for rejection..."
                        value={remarks[doc.id] || ''}
                        onChange={(e) => setRemarks({ ...remarks, [doc.id]: e.target.value })}
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleVerify(doc.id, 'Approved')}
                        className="flex-1 bg-green-50 hover:bg-green-100 text-green-700 py-2 rounded-lg text-sm font-bold transition flex items-center justify-center gap-1 border-2 border-green-200"
                      >
                        <CheckCircle size={16} />
                        <span>Approve</span>
                      </button>

                      <button
                        onClick={() => handleVerify(doc.id, 'Rejected')}
                        className="flex-1 bg-red-50 hover:bg-red-100 text-red-700 py-2 rounded-lg text-sm font-bold transition flex items-center justify-center gap-1 border-2 border-red-200"
                      >
                        <XCircle size={16} />
                        <span>Reject</span>
                      </button>
                    </div>
                  </div>
                )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Preview Modal */}
      {previewDoc && previewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b-2 border-teal-100 bg-slate-50">
              <div className="flex items-center gap-4 pr-4 overflow-hidden">
                <button
                  onClick={closePreview}
                  className="flex items-center gap-1 text-slate-600 hover:text-slate-900 transition font-bold text-sm bg-slate-200 hover:bg-slate-300 px-3 py-1.5 rounded-lg shrink-0"
                >
                  <ArrowLeft size={16} />
                  <span>Back</span>
                </button>
                <h3 className="font-bold text-slate-900 truncate">{previewDoc.fileName}</h3>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => downloadFile(previewDoc.id, previewDoc.fileName, previewDoc.mimeType)}
                  className="p-2 text-slate-600 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition flex items-center gap-2"
                  title="Download"
                >
                  <Download size={18} />
                  <span className="text-sm font-bold hidden sm:inline">Download</span>
                </button>

                <div className="w-px h-6 bg-slate-300"></div>

                <button
                  onClick={closePreview}
                  className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition flex items-center gap-1"
                  title="Close"
                >
                  <X size={20} />
                  <span className="text-sm font-bold hidden sm:inline">Close</span>
                </button>
              </div>
            </div>

            <div className="flex-1 bg-slate-200 overflow-auto flex items-center justify-center relative p-4">
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
