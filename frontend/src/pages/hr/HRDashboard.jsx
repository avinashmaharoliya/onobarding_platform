import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import ProgressBar from '../../components/ProgressBar';
import StatusBadge from '../../components/StatusBadge';
import { Bell, Eye, UserPlus, X, AlertCircle, CheckCircle } from 'lucide-react';

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
      </div>
    );
  }

  // Calculate stats
  const totalEmployees = employees.length;
  const approvedEmployees = employees.filter(e => e.status === 'Approved').length;
  const pendingEmployees = employees.filter(e => e.status !== 'Approved').length;
  const avgProgress = employees.length > 0 
    ? Math.round(employees.reduce((sum, e) => sum + (e.progress || 0), 0) / employees.length)
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50 to-slate-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-teal-600 to-cyan-600 rounded-xl flex items-center justify-center">
              <UserPlus className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">HR Dashboard</h1>
              <p className="text-slate-600 mt-1 font-medium">Overview of all new hires and their onboarding progress.</p>
            </div>
          </div>

          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition shadow-lg shadow-teal-500/40 font-bold"
          >
            {showAddForm ? <X size={18} /> : <UserPlus size={18} />}
            <span>{showAddForm ? 'Close Form' : 'Add Employee'}</span>
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Employees', value: totalEmployees, icon: UserPlus, color: 'from-blue-500 to-blue-600' },
            { label: 'Approved', value: approvedEmployees, icon: CheckCircle, color: 'from-green-500 to-green-600' },
            { label: 'Pending', value: pendingEmployees, icon: AlertCircle, color: 'from-amber-500 to-amber-600' },
            { label: 'Avg Progress', value: `${avgProgress}%`, icon: Eye, color: 'from-teal-500 to-cyan-600' },
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

        {/* Add Employee Form */}
        {showAddForm && (
          <div className="bg-white border-2 border-teal-100 rounded-2xl p-6 shadow-lg mb-8">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Add New Employee</h3>

            {addMsg && (
              <div className={`p-4 rounded-lg mb-4 text-sm border-2 flex items-center gap-2 ${
                addMsg.includes('success')
                  ? 'bg-green-50 text-green-700 border-green-200'
                  : 'bg-red-50 text-red-700 border-red-200'
              }`}>
                {addMsg.includes('success') ? (
                  <CheckCircle size={20} />
                ) : (
                  <AlertCircle size={20} />
                )}
                {addMsg}
              </div>
            )}

            <form onSubmit={handleAddEmployee} className="flex flex-col md:flex-row md:items-end gap-4">
              <div className="flex-1">
                <label className="block text-sm font-bold text-slate-900 mb-2">Full Name</label>
                <input
                  type="text"
                  required
                  value={newEmp.name}
                  onChange={e => setNewEmp({ ...newEmp, name: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-teal-100 rounded-lg focus:border-teal-600 focus:ring-2 focus:ring-teal-200 outline-none bg-slate-50 hover:bg-white text-slate-900 placeholder-slate-400 font-medium transition"
                  placeholder="John Doe"
                />
              </div>

              <div className="flex-1">
                <label className="block text-sm font-bold text-slate-900 mb-2">Email Address</label>
                <input
                  type="email"
                  required
                  value={newEmp.email}
                  onChange={e => setNewEmp({ ...newEmp, email: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-teal-100 rounded-lg focus:border-teal-600 focus:ring-2 focus:ring-teal-200 outline-none bg-slate-50 hover:bg-white text-slate-900 placeholder-slate-400 font-medium transition"
                  placeholder="john@company.com"
                />
              </div>

              <button
                type="submit"
                disabled={adding}
                className="bg-gradient-to-r from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 disabled:from-slate-400 disabled:to-slate-400 text-white px-6 py-3 rounded-lg transition font-bold disabled:opacity-50"
              >
                {adding ? 'Adding...' : 'Create Account'}
              </button>
            </form>
          </div>
        )}

        {/* Reminder Message */}
        {reminderMsg && (
          <div className={`p-4 rounded-lg mb-6 text-sm border-2 flex items-center gap-2 ${
            reminderMsg.includes('Failed') || reminderMsg.includes('No pending')
              ? 'bg-red-50 text-red-700 border-red-200'
              : 'bg-blue-50 text-blue-700 border-blue-200'
          }`}>
            {reminderMsg.includes('Failed') || reminderMsg.includes('No pending') ? (
              <AlertCircle size={20} />
            ) : (
              <CheckCircle size={20} />
            )}
            {reminderMsg}
          </div>
        )}

        {/* Employees Table */}
        <div className="bg-white border-2 border-teal-100 rounded-2xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-teal-100">
              <thead className="bg-gradient-to-r from-teal-50 to-cyan-50 border-b-2 border-teal-100">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-teal-900 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-teal-900 uppercase tracking-wider">
                    Profile Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-teal-900 uppercase tracking-wider">
                    Onboarding Progress
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-teal-900 uppercase tracking-wider">
                    Joining Date
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-teal-900 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-teal-100">
                {employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-teal-50 transition">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-slate-900">{emp.name}</div>
                      <div className="text-xs text-slate-500 font-medium">{emp.email}</div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={emp.status} />
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap w-64">
                      <div className="flex items-center gap-3">
                        <div className="w-full">
                          <ProgressBar progress={emp.progress || 0} />
                        </div>
                        <span className="text-sm font-bold text-slate-700 min-w-fit">{emp.progress || 0}%</span>
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-medium">
                      {emp.joining_date ? new Date(emp.joining_date).toLocaleDateString() : 'Not set'}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold">
                      <button
                        type="button"
                        onClick={() => handleSendReminder(emp.id)}
                        disabled={remindingId === emp.id || emp.status === 'Approved'}
                        className="text-amber-600 hover:text-amber-700 inline-flex items-center gap-1 mr-4 disabled:opacity-40 disabled:cursor-not-allowed transition"
                      >
                        <Bell size={16} />
                        <span>{remindingId === emp.id ? 'Sending' : 'Remind'}</span>
                      </button>

                      <Link
                        to={`/hr/verify/${emp.id}`}
                        className="text-teal-600 hover:text-teal-700 inline-flex items-center gap-1 transition"
                      >
                        <Eye size={16} />
                        <span>Review</span>
                      </Link>
                    </td>
                  </tr>
                ))}

                {employees.length === 0 && (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <UserPlus className="text-slate-300" size={48} />
                        <p className="text-slate-500 font-medium">No employees found.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          {employees.length > 0 && (
            <div className="bg-gradient-to-r from-teal-50 to-cyan-50 border-t-2 border-teal-100 px-6 py-4">
              <p className="text-sm text-slate-600 font-medium">
                Showing <span className="font-bold text-teal-600">{employees.length}</span> employee{employees.length !== 1 ? 's' : ''}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HRDashboard;
