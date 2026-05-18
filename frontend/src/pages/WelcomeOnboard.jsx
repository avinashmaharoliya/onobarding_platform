import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { CheckCircle, FileText, CheckSquare, Signature, ArrowRight, Sparkles } from 'lucide-react';

const WelcomeOnboard = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [docs, setDocs] = useState([]);
  const [checklist, setChecklist] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [profileRes, docsRes, checklistRes] = await Promise.all([
          api.get('/profile'),
          api.get('/documents/my'),
          api.get('/checklist')
        ]);

        setProfile(profileRes.data);
        setDocs(docsRes.data || []);
        setChecklist(checklistRes.data || []);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50 to-slate-50 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Welcome Header */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-3 mb-6">
            <Sparkles className="text-teal-600 animate-pulse" size={32} />
            <h1 className="text-5xl sm:text-6xl font-bold text-slate-900">
              Welcome Aboard, <span className="bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">{profile?.name || 'Team Member'}!</span>
            </h1>
            <Sparkles className="text-cyan-600 animate-pulse" size={32} />
          </div>

          <p className="text-xl sm:text-2xl text-slate-600 font-medium max-w-3xl mx-auto leading-relaxed">
            🎉 Congratulations! You've successfully completed your onboarding. We're thrilled to have you join our team! 
            Here's what comes next and how to make the most of your first days.
          </p>
        </div>

        {/* Completion Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
          {[
            { label: 'Documents Approved', value: docs.filter(d => d.status === 'Approved').length, icon: FileText, color: 'from-blue-500 to-blue-600' },
            { label: 'Tasks Completed', value: checklist.filter(c => c.completed).length, icon: CheckSquare, color: 'from-green-500 to-green-600' },
            { label: 'Status', value: 'Ready!', icon: CheckCircle, color: 'from-teal-500 to-cyan-600' },
          ].map((stat, idx) => (
            <div
              key={idx}
              className="bg-white border-2 border-teal-100 rounded-xl p-4 shadow-md hover:shadow-lg transition text-center"
            >
              <div className={`w-12 h-12 bg-gradient-to-br ${stat.color} rounded-lg flex items-center justify-center mx-auto mb-3`}>
                <stat.icon className="text-white" size={24} />
              </div>
              <p className="text-slate-600 text-xs font-bold uppercase tracking-wider mb-1">{stat.label}</p>
              <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Next Steps */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-slate-900 mb-8 text-center">What's Next?</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                icon: '📅',
                title: 'Confirm Your Joining Date',
                description: 'Head to your checklist to confirm your official joining date with the company.',
                link: '/checklist',
                color: 'from-blue-500 to-blue-600'
              },
              {
                icon: '👥',
                title: 'Meet Your Team',
                description: 'Your manager will reach out soon to schedule your first team meeting and orientation.',
                color: 'from-purple-500 to-purple-600'
              },
              {
                icon: '💻',
                title: 'IT Setup',
                description: 'Your IT equipment and access credentials will be ready on your first day.',
                color: 'from-green-500 to-green-600'
              },
              {
                icon: '📚',
                title: 'Learning Resources',
                description: 'Check your email for access to our learning portal and company resources.',
                color: 'from-pink-500 to-pink-600'
              }
            ].map((step, idx) => (
              <div
                key={idx}
                className="bg-white border-2 border-teal-100 rounded-2xl p-6 shadow-lg hover:shadow-xl transition"
              >
                <div className="flex items-start gap-4">
                  <div className={`w-14 h-14 bg-gradient-to-br ${step.color} rounded-xl flex items-center justify-center flex-shrink-0 text-2xl`}>
                    {step.icon}
                  </div>

                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-slate-900 mb-2">{step.title}</h3>
                    <p className="text-slate-600 text-sm font-medium">{step.description}</p>
                    {step.link && (
                      <Link
                        to={step.link}
                        className="inline-flex items-center gap-2 text-teal-600 hover:text-teal-700 font-bold text-sm mt-3 transition"
                      >
                        <span>Go to Checklist</span>
                        <ArrowRight size={16} />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Important Info */}
        <div className="bg-gradient-to-r from-cyan-50 to-teal-50 border-2 border-cyan-200 rounded-2xl p-8 mb-12">
          <h3 className="text-2xl font-bold text-slate-900 mb-6">💡 Quick Tips for Your First Days</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex gap-4">
              <div className="w-10 h-10 bg-teal-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold">1</span>
              </div>
              <div>
                <h4 className="font-bold text-slate-900 mb-1">Arrive Early</h4>
                <p className="text-slate-600 text-sm font-medium">Plan to arrive 15 minutes early on your first day to get settled in.</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-10 h-10 bg-cyan-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold">2</span>
              </div>
              <div>
                <h4 className="font-bold text-slate-900 mb-1">Ask Questions</h4>
                <p className="text-slate-600 text-sm font-medium">Don't hesitate to ask questions. Everyone is here to help you succeed!</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-10 h-10 bg-teal-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold">3</span>
              </div>
              <div>
                <h4 className="font-bold text-slate-900 mb-1">Connect with Colleagues</h4>
                <p className="text-slate-600 text-sm font-medium">Take time to introduce yourself and build relationships with your team.</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-10 h-10 bg-cyan-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold">4</span>
              </div>
              <div>
                <h4 className="font-bold text-slate-900 mb-1">Review Documentation</h4>
                <p className="text-slate-600 text-sm font-medium">Familiarize yourself with company policies and procedures.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div className="bg-white border-2 border-teal-100 rounded-2xl p-8 text-center shadow-lg mb-8">
          <h3 className="text-2xl font-bold text-slate-900 mb-3">Need Help?</h3>
          <p className="text-slate-600 font-medium mb-4">
            Our HR team is here to support you every step of the way.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <div>
              <p className="text-sm text-slate-600 font-medium">📧 Email</p>
              <p className="font-bold text-teal-600">support@onboard.com</p>
            </div>
            <div className="hidden sm:block w-px h-12 bg-slate-200"></div>
            <div>
              <p className="text-sm text-slate-600 font-medium">📞 Phone</p>
              <p className="font-bold text-teal-600">+1 (555) 123-4567</p>
            </div>
          </div>
        </div>

        {/* Final CTA */}
        <div className="bg-gradient-to-r from-teal-600 to-cyan-600 rounded-2xl p-8 text-center shadow-xl">
          <h3 className="text-2xl font-bold text-white mb-3">Ready for Your First Day?</h3>
          <p className="text-cyan-100 font-medium mb-6">
            We can't wait to see you in action! If you have any last-minute questions, reach out to our HR team.
          </p>

          <Link
            to="/profile"
            className="inline-flex items-center gap-2 bg-white text-teal-600 px-8 py-3 rounded-lg font-bold hover:bg-slate-50 transition shadow-lg"
          >
            <span>Back to Dashboard</span>
            <ArrowRight size={20} />
          </Link>
        </div>

        {/* Footer Message */}
        <div className="text-center mt-12">
          <p className="text-slate-600 font-medium">
            Welcome to the team! We're excited to have you on board. 🚀
          </p>
        </div>
      </div>
    </div>
  );
};

export default WelcomeOnboard;
