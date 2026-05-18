import { Link, useNavigate } from 'react-router-dom';
import { CheckSquare, FileText, LayoutDashboard, LogOut, User } from 'lucide-react';

const Navbar = () => {
  const navigate = useNavigate();
  const role = localStorage.getItem('role');
  const token = localStorage.getItem('token');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('userId');
    navigate('/');
  };

  const handleLogoClick = () => {
    navigate('/');
  };

  if (!token) return null;

  return (
    <nav className="fixed top-4 left-1/2 transform -translate-x-1/2 w-[95%] max-w-6xl bg-white/95 backdrop-blur-md border border-teal-100 z-50 shadow-lg rounded-2xl">
      <div className="px-6 py-3">
        <div className="flex justify-between items-center">
          {/* Logo - Clickable */}
          <button
            onClick={handleLogoClick}
            className="flex items-center gap-2 hover:opacity-80 transition"
          >
            <div className="w-9 h-9 bg-gradient-to-br from-teal-600 to-cyan-600 rounded-lg flex items-center justify-center shadow-lg shadow-teal-500/40">
              <span className="text-white font-bold text-lg">O</span>
            </div>
            <span className="font-bold text-lg bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent tracking-tight">
              OnBoard
            </span>
          </button>

          {/* Navigation Links */}
          <div className="flex items-center gap-6">
            {role === 'employee' && (
              <>
                <Link
                  to="/profile"
                  className="flex items-center gap-1.5 text-slate-600 hover:text-teal-600 transition font-semibold text-sm"
                >
                  <User size={16} />
                  <span>Profile</span>
                </Link>

                <Link
                  to="/documents/status"
                  className="flex items-center gap-1.5 text-slate-600 hover:text-teal-600 transition font-semibold text-sm"
                >
                  <FileText size={16} />
                  <span>Documents</span>
                </Link>

                <Link
                  to="/checklist"
                  className="flex items-center gap-1.5 text-slate-600 hover:text-teal-600 transition font-semibold text-sm"
                >
                  <CheckSquare size={16} />
                  <span>Checklist</span>
                </Link>
              </>
            )}

            {role === 'hr' && (
              <Link
                to="/hr/dashboard"
                className="flex items-center gap-1.5 text-slate-600 hover:text-teal-600 transition font-semibold text-sm"
              >
                <LayoutDashboard size={16} />
                <span>Dashboard</span>
              </Link>
            )}

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-red-600 hover:text-red-700 transition font-semibold text-sm bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg border border-red-200 hover:border-red-300"
            >
              <LogOut size={16} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
