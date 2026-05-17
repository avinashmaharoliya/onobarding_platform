import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import ProfileSetup from './pages/ProfileSetup';
import DocumentUpload from './pages/DocumentUpload';
import DocumentStatus from './pages/DocumentStatus';
import Checklist from './pages/Checklist';
import HRDashboard from './pages/hr/HRDashboard';
import HRVerify from './pages/hr/HRVerify';
import Navbar from './components/Navbar';
import DigitalSignature from './components/DigitalSignature';

// Protect routes based on role
const ProtectedRoute = ({ children, allowedRole }) => {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  if (!token) return <Navigate to="/" />;
  if (allowedRole && role !== allowedRole) {
    return role === 'hr' ? <Navigate to="/hr/dashboard" /> : <Navigate to="/profile" />;
  }

  return children;
};

function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <div className="min-h-screen pt-16 pb-8 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <Routes>
            <Route path="/" element={<Login />} />
            
            {/* Employee Routes */}
            <Route path="/profile" element={
              <ProtectedRoute allowedRole="employee"><ProfileSetup /></ProtectedRoute>
            } />
            <Route path="/documents/upload" element={
              <ProtectedRoute allowedRole="employee"><DocumentUpload /></ProtectedRoute>
            } />
            <Route path="/documents/status" element={
              <ProtectedRoute allowedRole="employee"><DocumentStatus /></ProtectedRoute>
            } />
            <Route path="/checklist" element={
              <ProtectedRoute allowedRole="employee"><Checklist /></ProtectedRoute>
            } />
            
            {/* HR Routes */}
            <Route path="/hr/dashboard" element={
              <ProtectedRoute allowedRole="hr"><HRDashboard /></ProtectedRoute>
            } />
            <Route path="/hr/verify/:userId" element={
              <ProtectedRoute allowedRole="hr"><HRVerify /></ProtectedRoute>
            } />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;
