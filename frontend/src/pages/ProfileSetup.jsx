import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import api from '../api/axios';
import { Save, User, Calendar, MapPin, BookOpen, Lock, CheckCircle, AlertCircle } from 'lucide-react';

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
  const [messageType, setMessageType] = useState('');

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
      setMessageType('success');
    } catch (error) {
      setMessage('Failed to save profile. ' + (error.response?.data?.message || ''));
      setMessageType('error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-12 h-12 border-4 border-teal-200 border-t-teal-600 rounded-full"
        />
      </div>
    );
  }

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: 'easeOut' },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: 'easeOut' },
    },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50 to-slate-50 py-8 px-4">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-4xl mx-auto"
      >
        {/* Header */}
        <motion.div
          variants={itemVariants}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-teal-600 to-cyan-600 rounded-xl flex items-center justify-center">
              <User className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Profile Setup</h1>
              <p className="text-slate-600 mt-1 font-medium">Complete your personal details to proceed with onboarding.</p>
            </div>
          </div>
        </motion.div>

        {/* Success/Error Message */}
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 rounded-lg mb-6 border-2 flex items-center gap-3 ${
              messageType === 'success'
                ? 'bg-green-50 text-green-700 border-green-200'
                : 'bg-red-50 text-red-700 border-red-200'
            }`}
          >
            {messageType === 'success' ? (
              <CheckCircle size={20} />
            ) : (
              <AlertCircle size={20} />
            )}
            <span className="font-medium">{message}</span>
          </motion.div>
        )}

        {/* Form */}
        <motion.form
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          onSubmit={handleSubmit}
          className="bg-white border-2 border-teal-100 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow duration-300"
        >
          {/* Personal Information Section */}
          <motion.div variants={itemVariants} className="mb-8">
            <div className="flex items-center gap-2 mb-6 pb-4 border-b-2 border-teal-100">
              <User className="text-teal-600" size={24} />
              <h2 className="text-2xl font-bold text-slate-900">Personal Information</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Full Name */}
              <motion.div variants={itemVariants}>
                <label className="block text-sm font-bold text-slate-900 mb-2">Full Name</label>
                <input
                  type="text"
                  name="name"
                  value={profile.name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border-2 border-teal-100 rounded-lg focus:border-teal-600 focus:ring-2 focus:ring-teal-200 outline-none transition bg-slate-50 hover:bg-white text-slate-900 placeholder-slate-400 font-medium"
                  placeholder="John Doe"
                />
              </motion.div>

              {/* Date of Birth */}
              <motion.div variants={itemVariants}>
                <label className="block text-sm font-bold text-slate-900 mb-2">Date of Birth</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-3.5 text-teal-600" size={20} />
                  <input
                    type="date"
                    name="dob"
                    value={profile.dob}
                    onChange={handleChange}
                    required
                    className="w-full pl-12 pr-4 py-3 border-2 border-teal-100 rounded-lg focus:border-teal-600 focus:ring-2 focus:ring-teal-200 outline-none transition bg-slate-50 hover:bg-white text-slate-900 font-medium"
                  />
                </div>
              </motion.div>

              {/* Gender */}
              <motion.div variants={itemVariants}>
                <label className="block text-sm font-bold text-slate-900 mb-2">Gender</label>
                <select
                  name="gender"
                  value={profile.gender}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border-2 border-teal-100 rounded-lg focus:border-teal-600 focus:ring-2 focus:ring-teal-200 outline-none transition bg-slate-50 hover:bg-white text-slate-900 font-medium"
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </motion.div>

              {/* Emergency Contact */}
              <motion.div variants={itemVariants}>
                <label className="block text-sm font-bold text-slate-900 mb-2">Emergency Contact</label>
                <input
                  type="text"
                  name="emergency_contact"
                  value={profile.emergency_contact}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border-2 border-teal-100 rounded-lg focus:border-teal-600 focus:ring-2 focus:ring-teal-200 outline-none transition bg-slate-50 hover:bg-white text-slate-900 placeholder-slate-400 font-medium"
                  placeholder="+91 XXXXXXXXXX"
                />
              </motion.div>

              {/* Full Address */}
              <motion.div variants={itemVariants} className="md:col-span-2">
                <label className="block text-sm font-bold text-slate-900 mb-2">Full Address</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-4 text-teal-600" size={20} />
                  <textarea
                    name="address"
                    value={profile.address}
                    onChange={handleChange}
                    required
                    rows="3"
                    className="w-full pl-12 pr-4 py-3 border-2 border-teal-100 rounded-lg focus:border-teal-600 focus:ring-2 focus:ring-teal-200 outline-none transition bg-slate-50 hover:bg-white text-slate-900 placeholder-slate-400 font-medium resize-none"
                    placeholder="Enter your complete address"
                  />
                </div>
              </motion.div>
            </div>
          </motion.div>

          {/* Education Section */}
          <motion.div variants={itemVariants} className="mb-8">
            <div className="flex items-center gap-2 mb-6 pb-4 border-b-2 border-teal-100">
              <BookOpen className="text-teal-600" size={24} />
              <h2 className="text-2xl font-bold text-slate-900">Education Details</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Degree */}
              <motion.div variants={itemVariants}>
                <label className="block text-sm font-bold text-slate-900 mb-2">Degree</label>
                <input
                  type="text"
                  name="degree"
                  value={profile.degree}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border-2 border-teal-100 rounded-lg focus:border-teal-600 focus:ring-2 focus:ring-teal-200 outline-none transition bg-slate-50 hover:bg-white text-slate-900 placeholder-slate-400 font-medium"
                  placeholder="B.Tech, MBA, etc."
                />
              </motion.div>

              {/* College */}
              <motion.div variants={itemVariants}>
                <label className="block text-sm font-bold text-slate-900 mb-2">College/University</label>
                <input
                  type="text"
                  name="college"
                  value={profile.college}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border-2 border-teal-100 rounded-lg focus:border-teal-600 focus:ring-2 focus:ring-teal-200 outline-none transition bg-slate-50 hover:bg-white text-slate-900 placeholder-slate-400 font-medium"
                  placeholder="Your college name"
                />
              </motion.div>

              {/* Graduation Year */}
              <motion.div variants={itemVariants}>
                <label className="block text-sm font-bold text-slate-900 mb-2">Graduation Year</label>
                <input
                  type="number"
                  name="graduation_year"
                  value={profile.graduation_year}
                  onChange={handleChange}
                  required
                  min="1950"
                  max="2100"
                  className="w-full px-4 py-3 border-2 border-teal-100 rounded-lg focus:border-teal-600 focus:ring-2 focus:ring-teal-200 outline-none transition bg-slate-50 hover:bg-white text-slate-900 placeholder-slate-400 font-medium"
                  placeholder="2024"
                />
              </motion.div>
            </div>
          </motion.div>

          {/* Confidential Details Section */}
          <motion.div variants={itemVariants} className="mb-8">
            <div className="flex items-center gap-2 mb-6 pb-4 border-b-2 border-teal-100">
              <Lock className="text-teal-600" size={24} />
              <h2 className="text-2xl font-bold text-slate-900">Confidential Details</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Bank Account */}
              <motion.div variants={itemVariants}>
                <label className="block text-sm font-bold text-slate-900 mb-2">Bank Account Number</label>
                <input
                  type="text"
                  name="bank_account"
                  value={profile.bank_account}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border-2 border-teal-100 rounded-lg focus:border-teal-600 focus:ring-2 focus:ring-teal-200 outline-none transition bg-slate-50 hover:bg-white text-slate-900 placeholder-slate-400 font-medium"
                  placeholder="XXXXXXXXXXXXXXXX"
                />
              </motion.div>

              {/* PAN Number */}
              <motion.div variants={itemVariants}>
                <label className="block text-sm font-bold text-slate-900 mb-2">PAN Number</label>
                <input
                  type="text"
                  name="pan"
                  value={profile.pan}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border-2 border-teal-100 rounded-lg focus:border-teal-600 focus:ring-2 focus:ring-teal-200 outline-none transition bg-slate-50 hover:bg-white text-slate-900 placeholder-slate-400 font-medium"
                  placeholder="XXXXXXXXXX"
                />
              </motion.div>
            </div>

            <div className="mt-4 p-4 bg-amber-50 border-2 border-amber-200 rounded-lg flex items-start gap-3">
              <Lock className="text-amber-600 flex-shrink-0 mt-0.5" size={20} />
              <p className="text-sm text-amber-700 font-medium">
                Your confidential details are encrypted and secure. We never share your information with third parties.
              </p>
            </div>
          </motion.div>

          {/* Submit Button */}
          <motion.div
            variants={itemVariants}
            className="pt-6 border-t-2 border-teal-100 flex justify-end"
          >
            <motion.button
              type="submit"
              disabled={saving}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 disabled:from-slate-400 disabled:to-slate-400 text-white px-8 py-3 rounded-lg flex items-center gap-2 transition shadow-lg shadow-teal-500/40 hover:shadow-xl hover:shadow-teal-500/50 font-bold"
            >
              <Save size={20} />
              <span>{saving ? 'Saving...' : 'Save Profile'}</span>
            </motion.button>
          </motion.div>
        </motion.form>
      </motion.div>
    </div>
  );
};

export default ProfileSetup;
