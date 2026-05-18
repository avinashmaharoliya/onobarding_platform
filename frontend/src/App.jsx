import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import ProfileSetup from './pages/ProfileSetup';
import DocumentUpload from './pages/DocumentUpload';
import DocumentStatus from './pages/DocumentStatus';
import Checklist from './pages/Checklist';
import WelcomeOnboard from './pages/WelcomeOnboard';
import HRDashboard from './pages/hr/HRDashboard';
import HRVerify from './pages/hr/HRVerify';
import Navbar from './components/Navbar';
import DigitalSignature from './components/DigitalSignature';

// Protect routes based on role
const ProtectedRoute = ({ children, allowedRole }) => {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  if (!token) return <Navigate to="/login" />;

  if (allowedRole && role !== allowedRole) {
    return role === 'hr' ? <Navigate to="/hr/dashboard" /> : <Navigate to="/profile" />;
  }

  return children;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes - no navbar */}
        <Route path="/" element={<LandingPage />} />

        <Route path="/login" element={
          <>
            <Navbar />
            <div className="min-h-screen pt-16 pb-8 px-4 bg-gradient-to-br from-slate-50 via-teal-50 to-slate-50">
              <div className="max-w-6xl mx-auto">
                <Login />
              </div>
            </div>
          </>
        } />

        {/* Protected routes - with navbar */}
        <Route path="/profile" element={
          <>
            <Navbar />
            <div className="min-h-screen pt-16 pb-8 px-4 bg-gradient-to-br from-slate-50 via-teal-50 to-slate-50">
              <div className="max-w-6xl mx-auto">
                <ProtectedRoute allowedRole="employee">
                  <ProfileSetup />
                </ProtectedRoute>
              </div>
            </div>
          </>
        } />

        <Route path="/documents/upload" element={
          <>
            <Navbar />
            <div className="min-h-screen pt-16 pb-8 px-4 bg-gradient-to-br from-slate-50 via-teal-50 to-slate-50">
              <div className="max-w-6xl mx-auto">
                <ProtectedRoute allowedRole="employee">
                  <DocumentUpload />
                </ProtectedRoute>
              </div>
            </div>
          </>
        } />

        <Route path="/documents/status" element={
          <>
            <Navbar />
            <div className="min-h-screen pt-16 pb-8 px-4 bg-gradient-to-br from-slate-50 via-teal-50 to-slate-50">
              <div className="max-w-6xl mx-auto">
                <ProtectedRoute allowedRole="employee">
                  <DocumentStatus />
                </ProtectedRoute>
              </div>
            </div>
          </>
        } />

        <Route path="/checklist" element={
          <>
            <Navbar />
            <div className="min-h-screen pt-16 pb-8 px-4 bg-gradient-to-br from-slate-50 via-teal-50 to-slate-50">
              <div className="max-w-6xl mx-auto">
                <ProtectedRoute allowedRole="employee">
                  <Checklist />
                </ProtectedRoute>
              </div>
            </div>
          </>
        } />

        <Route path="/signature" element={
          <>
            <Navbar />
            <div className="min-h-screen pt-16 pb-8 px-4 bg-gradient-to-br from-slate-50 via-teal-50 to-slate-50">
              <div className="max-w-6xl mx-auto">
                <ProtectedRoute allowedRole="employee">
                  <DigitalSignature />
                </ProtectedRoute>
              </div>
            </div>
          </>
        } />

        {/* Welcome Onboard Route */}
        <Route path="/welcome" element={
          <>
            <Navbar />
            <div className="min-h-screen pt-16 pb-8 px-4">
              <div className="max-w-6xl mx-auto">
                <ProtectedRoute allowedRole="employee">
                  <WelcomeOnboard />
                </ProtectedRoute>
              </div>
            </div>
          </>
        } />

        {/* HR Routes */}
        <Route path="/hr/dashboard" element={
          <>
            <Navbar />
            <div className="min-h-screen pt-16 pb-8 px-4 bg-gradient-to-br from-slate-50 via-teal-50 to-slate-50">
              <div className="max-w-6xl mx-auto">
                <ProtectedRoute allowedRole="hr">
                  <HRDashboard />
                </ProtectedRoute>
              </div>
            </div>
          </>
        } />

        <Route path="/hr/verify/:userId" element={
          <>
            <Navbar />
            <div className="min-h-screen pt-16 pb-8 px-4 bg-gradient-to-br from-slate-50 via-teal-50 to-slate-50">
              <div className="max-w-6xl mx-auto">
                <ProtectedRoute allowedRole="hr">
                  <HRVerify />
                </ProtectedRoute>
              </div>
            </div>
          </>
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
