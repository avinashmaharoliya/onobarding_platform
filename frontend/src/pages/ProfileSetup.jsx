import { useState, useEffect } from 'react';
import api from '../api/axios';
import { Save } from 'lucide-react';

const ProfileSetup = () => {
  const [profile, setProfile] = useState({
    name: '',
    dob: '',
    gender: '',
    address: '',
    emergency_contact: '',
    bank_account: '',
    pan: '',
    degree: '',
    college: '',
    graduation_year: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get('/profile');
        if (res.data) {
          const education = typeof res.data.education_json === 'string'
            ? JSON.parse(res.data.education_json)
            : res.data.education_json || {};

          setProfile({
            name: res.data.name || '',
            dob: res.data.dob ? res.data.dob.split('T')[0] : '',
            gender: res.data.gender || '',
            address: res.data.address || '',
            emergency_contact: res.data.emergency_contact || '',
            bank_account: res.data.bank_account || '',
            pan: res.data.pan || '',
            degree: education.degree || '',
            college: education.college || '',
            graduation_year: education.year || '',
          });
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleChange = (e) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const payload = {
        ...profile,
        education_json: {
          degree: profile.degree,
          college: profile.college,
          year: profile.graduation_year,
        },
      };
      await api.put('/profile', payload);
      setMessage('Profile saved successfully!');
    } catch (error) {
      setMessage('Failed to save profile. ' + (error.response?.data?.message || ''));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-center mt-20">Loading...</div>;

  return (
    <div className="animate-fade-in">
      <div className="mb-6 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Profile Setup</h1>
          <p className="text-gray-500 mt-1">Complete your personal details to proceed with onboarding.</p>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-lg mb-6 ${message.includes('success') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="glass-panel p-6 rounded-2xl shadow-sm space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input type="text" name="name" value={profile.name} onChange={handleChange} required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
            <input type="date" name="dob" value={profile.dob} onChange={handleChange} required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
            <select name="gender" value={profile.gender} onChange={handleChange} required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition">
              <option value="">Select Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Emergency Contact</label>
            <input type="text" name="emergency_contact" value={profile.emergency_contact} onChange={handleChange} required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Address</label>
            <textarea name="address" value={profile.address} onChange={handleChange} required rows="3"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition"></textarea>
          </div>
          
          <div className="md:col-span-2 pt-4 border-t border-gray-100">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Education Details</h3>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Degree</label>
            <input type="text" name="degree" value={profile.degree} onChange={handleChange} required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">College</label>
            <input type="text" name="college" value={profile.college} onChange={handleChange} required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Graduation Year</label>
            <input type="number" name="graduation_year" value={profile.graduation_year} onChange={handleChange} required min="1950" max="2100"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition" />
          </div>

          <div className="md:col-span-2 pt-4 border-t border-gray-100">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Confidential Details</h3>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bank Account Number</label>
            <input type="text" name="bank_account" value={profile.bank_account} onChange={handleChange} required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">PAN Number</label>
            <input type="text" name="pan" value={profile.pan} onChange={handleChange} required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition" />
          </div>
        </div>

        <div className="pt-4 flex justify-end">
          <button type="submit" disabled={saving} className="bg-primary hover:bg-primary-dark text-white px-6 py-2.5 rounded-lg flex items-center space-x-2 transition shadow-sm disabled:opacity-50">
            <Save size={18} />
            <span>{saving ? 'Saving...' : 'Save Profile'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProfileSetup;
