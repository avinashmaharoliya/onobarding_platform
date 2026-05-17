import { Link, useNavigate } from 'react-router-dom';
import { CheckSquare, FileSignature, FileText, LayoutDashboard, LogOut, User } from 'lucide-react';

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

  if (!token) return null;

  return (
    <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md border-b border-gray-200 z-50">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">O</span>
            </div>
            <span className="font-bold text-xl text-gray-900 tracking-tight">OnboardSync</span>
          </div>

          <div className="flex items-center space-x-6">
            {role === 'employee' && (
              <>
                <Link to="/profile" className="flex items-center space-x-1 text-gray-600 hover:text-primary transition">
                  <User size={18} /><span>Profile</span>
                </Link>
                <Link to="/documents/status" className="flex items-center space-x-1 text-gray-600 hover:text-primary transition">
                  <FileText size={18} /><span>Documents</span>
                </Link>
                <Link to="/checklist" className="flex items-center space-x-1 text-gray-600 hover:text-primary transition">
                  <CheckSquare size={18} /><span>Checklist</span>
                </Link>
              </>
            )}
            {role === 'hr' && (
              <>
                <Link to="/hr/dashboard" className="flex items-center space-x-1 text-gray-600 hover:text-primary transition">
                  <LayoutDashboard size={18} /><span>Dashboard</span>
                </Link>
              </>
            )}
            
            <button 
              onClick={handleLogout}
              className="flex items-center space-x-1 text-red-500 hover:text-red-700 transition font-medium bg-red-50 px-3 py-1.5 rounded-lg"
            >
              <LogOut size={18} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
