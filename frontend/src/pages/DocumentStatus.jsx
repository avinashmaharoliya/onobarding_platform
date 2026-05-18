import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import StatusBadge from '../components/StatusBadge';
import { Plus, RefreshCw, FileText, AlertCircle, CheckCircle } from 'lucide-react';

const DocumentStatus = () => {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchDocs = useCallback(async () => {
    try {
      setRefreshing(true);
      setError(null);
      const res = await api.get('/documents/my');
      setDocs(res.data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
      setError(error.response?.data?.message || 'Failed to load documents. Please try again.');
      setDocs([]);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocs();
    const handleFocus = () => {
      fetchDocs();
    };
    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [fetchDocs]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-8 max-w-md w-full shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="text-red-600" size={28} />
            <h3 className="text-red-900 font-bold text-lg">Error Loading Documents</h3>
          </div>
          <p className="text-red-700 text-sm mb-6 font-medium">{error}</p>
          <button
            onClick={fetchDocs}
            className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-4 py-3 rounded-lg transition font-bold"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Calculate stats
  const totalDocs = docs.length;
  const uploadedDocs = docs.filter(d => d.status).length;
  const mandatoryDocs = docs.filter(d => d.mandatory).length;
  const completedDocs = docs.filter(d => d.status === 'approved').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50 to-slate-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-teal-600 to-cyan-600 rounded-xl flex items-center justify-center">
              <FileText className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Document Status</h1>
              <p className="text-slate-600 mt-1 font-medium">Track the verification status of your uploaded documents.</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={fetchDocs}
              disabled={refreshing}
              className="inline-flex items-center justify-center gap-2 border-2 border-teal-200 bg-white text-teal-600 hover:bg-teal-50 px-4 py-2 rounded-lg transition disabled:opacity-50 font-bold"
            >
              <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
              <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>

            <Link
              to="/documents/upload"
              className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white px-4 py-2 rounded-lg transition shadow-lg shadow-teal-500/40 font-bold"
            >
              <Plus size={18} />
              <span>Upload New</span>
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Documents', value: totalDocs, icon: FileText, color: 'from-blue-500 to-blue-600' },
            { label: 'Uploaded', value: uploadedDocs, icon: CheckCircle, color: 'from-green-500 to-green-600' },
            { label: 'Mandatory', value: mandatoryDocs, icon: AlertCircle, color: 'from-amber-500 to-amber-600' },
            { label: 'Approved', value: completedDocs, icon: CheckCircle, color: 'from-teal-500 to-cyan-600' },
          ].map((stat, idx) => (
            <div
              key={idx}
              className="bg-white border-2 border-teal-100 rounded-xl p-4 shadow-md hover:shadow-lg transition"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 text-sm font-medium">{stat.label}</p>
                  <p className="text-3xl font-bold text-slate-900 mt-1">{stat.value}</p>
                </div>
                <div className={`w-12 h-12 bg-gradient-to-br ${stat.color} rounded-lg flex items-center justify-center`}>
                  <stat.icon className="text-white" size={24} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Documents Table */}
        <div className="bg-white border-2 border-teal-100 rounded-2xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-teal-100">
              <thead className="bg-gradient-to-r from-teal-50 to-cyan-50 border-b-2 border-teal-100">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-teal-900 uppercase tracking-wider">
                    Document Type
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-teal-900 uppercase tracking-wider">
                    Mandatory
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-teal-900 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-teal-900 uppercase tracking-wider">
                    Remarks
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-teal-100">
                {docs.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <FileText className="text-slate-300" size={48} />
                        <p className="text-slate-500 font-medium">No documents found. Please check back later.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  docs.map((doc) => (
                    <tr
                      key={doc.type_id}
                      className="hover:bg-teal-50 transition"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-teal-100 to-cyan-100 rounded-lg flex items-center justify-center">
                            <FileText className="text-teal-600" size={20} />
                          </div>
                          <div>
                            <div className="text-sm font-bold text-slate-900">{doc.type_name}</div>
                            {doc.uploaded_at && (
                              <div className="text-xs text-slate-500 font-medium">
                                Uploaded on {new Date(doc.uploaded_at).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                          doc.mandatory
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {doc.mandatory ? '✓ Yes' : 'No'}
                        </span>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        {doc.status ? (
                          <StatusBadge status={doc.status} />
                        ) : (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600">
                            Not Uploaded
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <div className="max-w-xs">
                          {doc.remark ? (
                            <p className="text-sm text-slate-600 font-medium truncate" title={doc.remark}>
                              {doc.remark}
                            </p>
                          ) : (
                            <span className="text-slate-400 text-sm font-medium">-</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          {docs.length > 0 && (
            <div className="bg-gradient-to-r from-teal-50 to-cyan-50 border-t-2 border-teal-100 px-6 py-4">
              <p className="text-sm text-slate-600 font-medium">
                Showing <span className="font-bold text-teal-600">{docs.length}</span> document{docs.length !== 1 ? 's' : ''}
              </p>
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="mt-8 p-4 bg-cyan-50 border-2 border-cyan-200 rounded-xl flex items-start gap-3">
          <AlertCircle className="text-cyan-600 flex-shrink-0 mt-0.5" size={20} />
          <p className="text-sm text-cyan-700 font-medium">
            Documents are verified by our HR team. You'll receive email notifications once your documents are reviewed.
          </p>
        </div>
      </div>
    </div>
  );
};

export default DocumentStatus;
