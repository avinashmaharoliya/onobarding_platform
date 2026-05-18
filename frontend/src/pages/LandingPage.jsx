import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, Users, FileText, Zap, ArrowRight, BarChart3, Lock, Zap as ZapIcon, Eye, Mail, PenTool } from 'lucide-react';

const LandingPage = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.3,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.8, ease: 'easeOut' },
    },
  };

  const floatingVariants = {
    initial: { y: 0 },
    animate: { y: [0, -20, 0], transition: { duration: 3, repeat: Infinity } },
  };

  return (
    <div className="bg-gradient-to-b from-slate-50 via-teal-50 to-slate-50 text-slate-900 overflow-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-teal-200/30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="text-2xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent"
          >
            OnBoard
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="flex gap-4"
          >
            <button
              onClick={() => window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })}
              className="text-teal-600 hover:text-teal-700 font-semibold transition-colors"
            >
              Features
            </button>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white px-6 py-2 rounded-lg font-semibold transition-all duration-300 hover:shadow-lg hover:shadow-teal-500/50"
            >
              Login
            </Link>
          </motion.div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="min-h-screen flex items-center justify-center pt-20 px-4 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            className="absolute top-1/4 -left-1/4 w-96 h-96 bg-teal-200/20 rounded-full blur-3xl"
          />
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
            className="absolute bottom-1/4 -right-1/4 w-96 h-96 bg-cyan-200/20 rounded-full blur-3xl"
          />
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={isVisible ? 'visible' : 'hidden'}
          className="max-w-4xl mx-auto text-center relative z-10"
        >
          <motion.div
            variants={itemVariants}
            className="inline-flex items-center gap-2 bg-teal-100 text-teal-700 px-4 py-2 rounded-full mb-6 font-semibold"
          >
            <span className="w-2 h-2 bg-teal-600 rounded-full animate-pulse"></span>
            Enterprise Onboarding Platform
          </motion.div>

          <motion.h1
            variants={itemVariants}
            className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6 leading-tight text-slate-900"
          >
            Streamline Employee <span className="bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">Onboarding</span> in Minutes
          </motion.h1>

          <motion.p
            variants={itemVariants}
            className="text-xl sm:text-2xl text-slate-600 mb-8 leading-relaxed"
          >
            Complete employee onboarding with document verification, digital signatures, and real-time progress tracking. Reduce onboarding time by 45%.
          </motion.p>

          <motion.div
            variants={itemVariants}
            className="grid grid-cols-3 gap-4 mb-8 text-sm sm:text-base"
          >
            <div className="flex flex-col items-center">
              <span className="text-3xl font-bold text-teal-600">500+</span>
              <span className="text-slate-600">Companies</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-3xl font-bold text-teal-600">50K+</span>
              <span className="text-slate-600">Employees</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-3xl font-bold text-teal-600">45%</span>
              <span className="text-slate-600">Time Saved</span>
            </div>
          </motion.div>

          <motion.div
            variants={itemVariants}
            className="flex flex-col sm:flex-row gap-4 justify-center mb-12"
          >
            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white px-8 py-4 rounded-lg font-bold text-lg transition-all duration-300 hover:shadow-xl hover:shadow-teal-500/50 group"
            >
              Get Started <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <button
              onClick={() => window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })}
              className="inline-flex items-center justify-center gap-2 border-2 border-teal-600 text-teal-600 hover:bg-teal-50 px-8 py-4 rounded-lg font-bold text-lg transition-all duration-300"
            >
              Explore Features
            </button>
          </motion.div>

          <motion.div
            variants={floatingVariants}
            initial="initial"
            animate="animate"
            className="inline-block"
          >
            <div className="grid grid-cols-3 gap-6 text-sm sm:text-base">
              <div className="flex items-center gap-2">
                <CheckCircle className="text-green-500" size={20} />
                <span className="font-semibold">45% Faster</span>
              </div>
              <div className="flex items-center gap-2">
                <Lock className="text-teal-600" size={20} />
                <span className="font-semibold">Secure</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="text-amber-500" size={20} />
                <span className="font-semibold">Instant Setup</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* Employee Portal Features */}
      <section className="py-20 px-4 relative bg-gradient-to-b from-transparent via-teal-50 to-transparent">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl sm:text-5xl font-bold mb-4 text-slate-900">👤 Employee Portal</h2>
            <p className="text-xl text-slate-600">Everything employees need for seamless onboarding</p>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {[
              {
                icon: FileText,
                title: 'First-time Password Setup',
                desc: 'Secure email invite with instant account provisioning',
                color: 'from-teal-500 to-teal-600',
              },
              {
                icon: Users,
                title: 'Profile Builder',
                desc: 'Complete personal details: DOB, gender, address, education, bank details',
                color: 'from-cyan-500 to-cyan-600',
              },
              {
                icon: FileText,
                title: 'Document Upload',
                desc: 'Submit Aadhar, PAN, Address Proof, Degree, Experience Letter',
                color: 'from-green-500 to-green-600',
              },
              {
                icon: CheckCircle,
                title: 'Interactive Checklist',
                desc: 'NDA signing, IT setup, handbook, bank details, ID photo',
                color: 'from-purple-500 to-purple-600',
              },
              {
                icon: PenTool,
                title: 'Digital Signature',
                desc: 'Native HTML5 Canvas-based signing pad for documents',
                color: 'from-pink-500 to-pink-600',
              },
              {
                icon: BarChart3,
                title: 'Real-time Progress',
                desc: 'Auto-calculated progress from documents and checklist items',
                color: 'from-amber-500 to-amber-600',
              },
            ].map((feature, idx) => (
              <motion.div
                key={idx}
                variants={itemVariants}
                className="group relative bg-white border-2 border-teal-100 rounded-2xl p-8 hover:border-teal-500 transition-all duration-300 hover:shadow-xl hover:shadow-teal-500/20"
              >
                <div className={`w-16 h-16 bg-gradient-to-br ${feature.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon size={32} className="text-white" />
                </div>
                <h3 className="text-xl font-bold mb-2 text-slate-900">{feature.title}</h3>
                <p className="text-slate-600">{feature.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* HR Dashboard Features */}
      <section className="py-20 px-4 relative">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl sm:text-5xl font-bold mb-4 text-slate-900">🛡️ HR Dashboard</h2>
            <p className="text-xl text-slate-600">Powerful tools for HR teams to manage onboarding</p>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {[
              {
                icon: BarChart3,
                title: 'Overview Panel',
                desc: 'All employees with live progress bars and status tracking',
                color: 'from-teal-500 to-teal-600',
              },
              {
                icon: Users,
                title: 'Create New Employees',
                desc: 'Instant account provisioning with automated email invites',
                color: 'from-cyan-500 to-cyan-600',
              },
              {
                icon: CheckCircle,
                title: 'Document Verification',
                desc: 'Approve or reject documents with detailed remarks',
                color: 'from-green-500 to-green-600',
              },
              {
                icon: Eye,
                title: 'OCR Text Extraction',
                desc: 'Automatic text extraction from Aadhar, PAN using Tesseract.js',
                color: 'from-purple-500 to-purple-600',
              },
              {
                icon: FileText,
                title: 'Document Preview',
                desc: 'In-browser PDF and image viewer for quick verification',
                color: 'from-pink-500 to-pink-600',
              },
              {
                icon: PenTool,
                title: 'Customizable Checklists',
                desc: 'Write custom instructions per employee per item',
                color: 'from-amber-500 to-amber-600',
              },
              {
                icon: Mail,
                title: 'Email Reminders',
                desc: 'Manual + automated cron-based reminders with smart detection',
                color: 'from-indigo-500 to-indigo-600',
              },
              {
                icon: PenTool,
                title: 'View Signatures',
                desc: 'See employee\'s signed NDA and document signatures',
                color: 'from-rose-500 to-rose-600',
              },
              {
                icon: FileText,
                title: 'Employee Responses',
                desc: 'View all submitted form data from checklist items',
                color: 'from-sky-500 to-sky-600',
              },
            ].map((feature, idx) => (
              <motion.div
                key={idx}
                variants={itemVariants}
                className="group relative bg-white border-2 border-teal-100 rounded-2xl p-8 hover:border-teal-500 transition-all duration-300 hover:shadow-xl hover:shadow-teal-500/20"
              >
                <div className={`w-16 h-16 bg-gradient-to-br ${feature.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon size={32} className="text-white" />
                </div>
                <h3 className="text-xl font-bold mb-2 text-slate-900">{feature.title}</h3>
                <p className="text-slate-600">{feature.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 relative bg-gradient-to-b from-transparent via-cyan-50 to-transparent">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl sm:text-5xl font-bold mb-4 text-slate-900">How It Works</h2>
            <p className="text-xl text-slate-600">Simple 4-step onboarding process</p>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid md:grid-cols-4 gap-8 relative"
          >
            {[
              { step: 1, title: 'Employee Invited', desc: 'HR sends email invite with login credentials' },
              { step: 2, title: 'Profile & Docs', desc: 'Employee fills profile and uploads documents' },
              { step: 3, title: 'HR Verification', desc: 'HR reviews, extracts OCR, and approves documents' },
              { step: 4, title: 'Complete', desc: 'Employee confirms joining date and onboarding done' },
            ].map((item, idx) => (
              <motion.div key={idx} variants={itemVariants} className="relative">
                <div className="flex flex-col items-center">
                  <motion.div
                    className="w-20 h-20 bg-gradient-to-br from-teal-600 to-cyan-600 rounded-full flex items-center justify-center mb-4 font-bold text-2xl text-white shadow-lg shadow-teal-500/50"
                    whileHover={{ scale: 1.1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 10 }}
                  >
                    {item.step}
                  </motion.div>
                  <h3 className="text-lg font-bold text-center mb-2 text-slate-900">{item.title}</h3>
                  <p className="text-slate-600 text-center text-sm">{item.desc}</p>
                </div>
                {idx < 3 && (
                  <motion.div
                    animate={{ x: [0, 10, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="hidden md:block absolute top-10 -right-6 text-teal-600 text-2xl"
                  >
                    →
                  </motion.div>
                )}
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Key Benefits */}
      <section className="py-20 px-4 relative">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl sm:text-5xl font-bold mb-4 text-slate-900">Why Choose OnBoard?</h2>
            <p className="text-xl text-slate-600">Enterprise-grade features for modern HR teams</p>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid md:grid-cols-3 gap-8"
          >
            {[
              {
                icon: Zap,
                title: '45% Faster Onboarding',
                desc: 'Automated workflows reduce manual tasks and accelerate employee productivity',
              },
              {
                icon: Lock,
                title: 'Enterprise Security',
                desc: 'Bank-level encryption, GDPR compliant, SOC 2 certified',
              },
              {
                icon: BarChart3,
                title: 'Real-time Analytics',
                desc: 'Track progress, identify bottlenecks, and optimize your process',
              },
              {
                icon: Mail,
                title: 'Smart Automation',
                desc: 'Automated reminders, OCR extraction, and intelligent workflows',
              },
              {
                icon: CheckCircle,
                title: '100% Compliance',
                desc: 'Audit trails, digital signatures, and document verification',
              },
              {
                icon: Users,
                title: 'Easy Integration',
                desc: 'Works with your existing HR systems and tools',
              },
            ].map((benefit, idx) => (
              <motion.div
                key={idx}
                variants={itemVariants}
                className="bg-white border-2 border-teal-100 rounded-2xl p-8 hover:border-teal-500 transition-all duration-300 hover:shadow-xl"
              >
                <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl flex items-center justify-center mb-4">
                  <benefit.icon size={32} className="text-white" />
                </div>
                <h3 className="text-xl font-bold mb-2 text-slate-900">{benefit.title}</h3>
                <p className="text-slate-600">{benefit.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 relative">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="bg-gradient-to-r from-teal-600/10 to-cyan-600/10 border-2 border-teal-500/30 rounded-3xl p-12 text-center backdrop-blur-sm"
          >
            <h2 className="text-4xl font-bold mb-4 text-slate-900">Ready to Streamline Your Onboarding?</h2>
            <p className="text-xl text-slate-600 mb-8">Join 500+ companies using OnBoard to transform their employee onboarding process.</p>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white px-8 py-4 rounded-lg font-bold text-lg transition-all duration-300 hover:shadow-xl hover:shadow-teal-500/50 group"
            >
              Get Started Now <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-teal-200/30 py-12 px-4 bg-gradient-to-b from-white to-teal-50">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="font-bold text-slate-900 mb-4">OnBoard</h4>
              <p className="text-slate-600 text-sm">Enterprise onboarding platform for modern companies.</p>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-slate-600">
                <li><a href="#" className="hover:text-teal-600">Features</a></li>
                <li><a href="#" className="hover:text-teal-600">Security</a></li>
                <li><a href="#" className="hover:text-teal-600">How It Works</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-slate-600">
                <li><a href="#" className="hover:text-teal-600">About</a></li>
                <li><a href="#" className="hover:text-teal-600">Blog</a></li>
                <li><a href="#" className="hover:text-teal-600">Careers</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-slate-600">
                <li><a href="#" className="hover:text-teal-600">Privacy</a></li>
                <li><a href="#" className="hover:text-teal-600">Terms</a></li>
                <li><a href="#" className="hover:text-teal-600">Contact</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-teal-200/30 pt-8 text-center text-slate-600">
            <p>&copy; 2026 OnBoard. All rights reserved. | Enterprise Onboarding Platform</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
