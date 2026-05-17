import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import ProgressBar from '../../components/ProgressBar';
import StatusBadge from '../../components/StatusBadge';
import { Bell, Eye, UserPlus, X } from 'lucide-react';

const HRDashboard = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEmp, setNewEmp] = useState({ name: '', email: '' });
  const [addMsg, setAddMsg] = useState('');
  const [adding, setAdding] = useState(false);
  const [reminderMsg, setReminderMsg] = useState('');
  const [remindingId, setRemindingId] = useState(null);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const res = await api.get('/admin/onboarding/overview');
        setEmployees(res.data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchEmployees();
  }, []);

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    setAdding(true);
    setAddMsg('');
    try {
      await api.post('/admin/employee', newEmp);
      setAddMsg('Employee created successfully!');
      setNewEmp({ name: '', email: '' });
      // Refresh the list
      const res = await api.get('/admin/onboarding/overview');
      setEmployees(res.data);
      setTimeout(() => setShowAddForm(false), 2000);
    } catch (error) {
      setAddMsg(error.response?.data?.message || 'Failed to add employee');
    } finally {
      setAdding(false);
    }
  };

  const handleSendReminder = async (employeeId) => {
    setReminderMsg('');
    setRemindingId(employeeId);
    try {
      const res = await api.post(`/admin/employees/${employeeId}/reminder`);
      const skipped = res.data.reminder?.skipped;
      setReminderMsg(skipped
        ? 'Reminder preview generated. Add email credentials in backend .env to send real emails.'
        : 'Reminder email sent successfully.');
    } catch (error) {
      setReminderMsg(error.response?.data?.message || 'Failed to send reminder');
    } finally {
      setRemindingId(null);
    }
  };

  if (loading) return <div className="text-center mt-20">Loading...</div>;

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">HR Dashboard</h1>
          <p className="text-gray-500 mt-1">Overview of all new hires and their onboarding progress.</p>
        </div>
        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition shadow-sm"
        >
          {showAddForm ? <X size={18} /> : <UserPlus size={18} />}
          <span>{showAddForm ? 'Close Form' : 'Add Employee'}</span>
        </button>
      </div>

      {showAddForm && (
        <div className="glass-panel p-6 rounded-2xl shadow-sm mb-6 animate-fade-in border-l-4 border-l-primary">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Add New Employee</h3>
          
          {addMsg && (
            <div className={`p-3 rounded-lg mb-4 text-sm ${addMsg.includes('success') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {addMsg}
            </div>
          )}

          <form onSubmit={handleAddEmployee} className="flex flex-col md:flex-row md:items-end space-y-4 md:space-y-0 md:space-x-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input 
                type="text" required value={newEmp.name} onChange={e => setNewEmp({...newEmp, name: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                placeholder="John Doe"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <input 
                type="email" required value={newEmp.email} onChange={e => setNewEmp({...newEmp, email: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                placeholder="john@company.com"
              />
            </div>
            <button 
              type="submit" disabled={adding}
              className="bg-gray-900 hover:bg-gray-800 text-white px-6 py-2.5 rounded-lg transition font-medium disabled:opacity-50"
            >
              {adding ? 'Adding...' : 'Create Account'}
            </button>
          </form>
        </div>
      )}

      {reminderMsg && (
        <div className={`p-3 rounded-lg mb-6 text-sm ${reminderMsg.includes('Failed') || reminderMsg.includes('No pending') ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}`}>
          {reminderMsg}
        </div>
      )}

      <div className="glass-panel rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Profile Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Onboarding Progress</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joining Date</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {employees.map((emp) => (
                <tr key={emp.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{emp.name}</div>
                    <div className="text-xs text-gray-500">{emp.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge status={emp.status} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap w-64">
                    <div className="flex items-center space-x-3">
                      <div className="w-full">
                        <ProgressBar progress={emp.progress || 0} />
                      </div>
                      <span className="text-sm font-medium text-gray-700">{emp.progress || 0}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {emp.joining_date ? new Date(emp.joining_date).toLocaleDateString() : 'Not set'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      type="button"
                      onClick={() => handleSendReminder(emp.id)}
                      disabled={remindingId === emp.id || emp.status === 'Approved'}
                      className="text-amber-600 hover:text-amber-700 inline-flex items-center space-x-1 mr-4 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Bell size={16} />
                      <span>{remindingId === emp.id ? 'Sending' : 'Remind'}</span>
                    </button>
                    <Link 
                      to={`/hr/verify/${emp.id}`}
                      className="text-primary hover:text-primary-dark inline-flex items-center space-x-1"
                    >
                      <Eye size={16} />
                      <span>Review</span>
                    </Link>
                  </td>
                </tr>
              ))}
              {employees.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                    No employees found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default HRDashboard;
