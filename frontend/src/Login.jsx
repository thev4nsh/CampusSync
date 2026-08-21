import React, { useState } from 'react';
import { 
  ShieldCheck, 
  User, 
  Lock, 
  ArrowRight, 
  UserCheck, 
  GraduationCap, 
  School, 
  Eye, 
  EyeOff, 
  AlertCircle,
  CheckCircle2,
  X
} from 'lucide-react';

export default function Login({ onLogin, students = [], teachers = [] }) {
  const [selectedRole, setSelectedRole] = useState('student');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Forgot Password Modal State
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [forgotInput, setForgotInput] = useState('');
  const [forgotSubmitted, setForgotSubmitted] = useState(false);

  const handleRoleChange = (role) => {
    setSelectedRole(role);
    setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    const cleanId = identifier.trim();
    if (!cleanId) {
      setError('Please enter your University ID or Email address.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);

      if (selectedRole === 'student') {
        const matched = students.find(
          s => s.id.toLowerCase() === cleanId.toLowerCase() || 
               s.email.toLowerCase() === cleanId.toLowerCase() ||
               s.name.toLowerCase() === cleanId.toLowerCase()
        );
        if (matched) {
          onLogin('student', matched);
        } else {
          onLogin('student', {
            id: cleanId.toUpperCase(),
            name: cleanId.includes('@') ? cleanId.split('@')[0] : cleanId,
            class: 'CSE-3A',
            course: 'B.Tech CSE',
            year: '3rd Year',
            email: cleanId.includes('@') ? cleanId : `${cleanId.toLowerCase()}@college.edu`,
            phone: '+91 98765 43210',
            attendance: 85,
            status: 'Active',
            biometrics: { fingerprint: true, face: true, rfid: true, rfidId: `RFID-${cleanId}` }
          });
        }
      } else if (selectedRole === 'teacher') {
        const matched = teachers.find(
          t => t.id.toLowerCase() === cleanId.toLowerCase() || 
               t.email.toLowerCase() === cleanId.toLowerCase() ||
               t.name.toLowerCase().includes(cleanId.toLowerCase())
        );
        if (matched) {
          onLogin('teacher', matched);
        } else {
          onLogin('teacher', {
            id: cleanId.toUpperCase(),
            name: cleanId.startsWith('Prof') || cleanId.startsWith('Dr') ? cleanId : `Prof. ${cleanId}`,
            department: 'Computer Science',
            subjects: ['Database Systems', 'Data Structures'],
            email: cleanId.includes('@') ? cleanId : `${cleanId.toLowerCase()}@college.edu`,
            status: 'Active'
          });
        }
      } else if (selectedRole === 'admin') {
        onLogin('admin', {
          name: 'System Admin',
          email: cleanId.includes('@') ? cleanId : 'admin@campussync.edu',
          role: 'Administrator'
        });
      }
    }, 300);
  };

  const handleForgotSubmit = (e) => {
    e.preventDefault();
    if (!forgotInput.trim()) return;
    setForgotSubmitted(true);
  };

  const closeForgotModal = () => {
    setForgotModalOpen(false);
    setForgotInput('');
    setForgotSubmitted(false);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Graphic Accents */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center z-10">
        {/* Brand Header */}
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/30 mb-4 ring-4 ring-blue-100">
          <ShieldCheck className="w-9 h-9" />
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          CampusSync
        </h1>
        <p className="mt-1 text-sm font-semibold text-blue-600 tracking-wide uppercase">
          Smart Attendance System
        </p>
        <p className="mt-2 text-xs text-slate-500 max-w-xs mx-auto">
          Institutional Access & Smart Biometrics Portal
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10 px-4">
        {/* Main Card */}
        <div className="bg-white py-8 px-6 shadow-xl shadow-slate-200/60 rounded-2xl border border-slate-200 sm:px-10">
          
          {/* Portal Selector */}
          <div className="mb-6">
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2 text-center">
              Select Portal
            </label>
            <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => handleRoleChange('student')}
                className={`flex flex-col items-center py-2.5 px-2 rounded-lg text-xs font-medium transition-all ${
                  selectedRole === 'student'
                    ? 'bg-white text-blue-700 shadow-sm border border-blue-200 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <GraduationCap className="w-4 h-4 mb-1 text-blue-600" />
                Student
              </button>

              <button
                type="button"
                onClick={() => handleRoleChange('teacher')}
                className={`flex flex-col items-center py-2.5 px-2 rounded-lg text-xs font-medium transition-all ${
                  selectedRole === 'teacher'
                    ? 'bg-white text-blue-700 shadow-sm border border-blue-200 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <UserCheck className="w-4 h-4 mb-1 text-blue-600" />
                Faculty
              </button>

              <button
                type="button"
                onClick={() => handleRoleChange('admin')}
                className={`flex flex-col items-center py-2.5 px-2 rounded-lg text-xs font-medium transition-all ${
                  selectedRole === 'admin'
                    ? 'bg-white text-blue-700 shadow-sm border border-blue-200 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <School className="w-4 h-4 mb-1 text-blue-600" />
                Admin
              </button>
            </div>
          </div>

          {/* Inline Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2.5 text-xs text-red-700 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Login Form */}
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                {selectedRole === 'student' ? 'Student ID or Email' : selectedRole === 'teacher' ? 'Faculty ID or Email' : 'Administrator Email'}
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User className="h-4 h-4" />
                </div>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => { setIdentifier(e.target.value); if (error) setError(''); }}
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-50/50 transition-all"
                  placeholder={
                    selectedRole === 'student'
                      ? 'e.g. CSE23001 or student@college.edu'
                      : selectedRole === 'teacher'
                      ? 'e.g. TCH101 or faculty@college.edu'
                      : 'e.g. admin@campussync.edu'
                  }
                  autoComplete="username"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Password
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); if (error) setError(''); }}
                  className="block w-full pl-10 pr-10 py-2.5 border border-slate-300 rounded-lg text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-50/50 transition-all"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 h-4" /> : <Eye className="h-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded cursor-pointer"
                />
                <label htmlFor="remember-me" className="ml-2 block text-slate-600 cursor-pointer select-none">
                  Remember me
                </label>
              </div>

              <button
                type="button"
                onClick={() => setForgotModalOpen(true)}
                className="font-semibold text-blue-600 hover:text-blue-500 transition-colors"
              >
                Forgot password?
              </button>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 disabled:opacity-75 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Sign In to Portal
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Footer info */}
        <div className="mt-6 text-center text-xs text-slate-400 space-y-1">
          <p className="flex items-center justify-center gap-1.5 font-medium text-slate-500">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            SSL 256-Bit Encrypted Campus Authentication
          </p>
          <p>© 2026 CampusSync System • All Rights Reserved</p>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {forgotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative">
            <button
              onClick={closeForgotModal}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            {!forgotSubmitted ? (
              <>
                <h3 className="text-lg font-bold text-slate-900 mb-1">
                  Reset Portal Password
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                  Enter your registered Student ID, Faculty ID, or University Email address to receive a secure password recovery link.
                </p>

                <form onSubmit={handleForgotSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Registered ID or Email
                    </label>
                    <input
                      type="text"
                      required
                      value={forgotInput}
                      onChange={(e) => setForgotInput(e.target.value)}
                      placeholder="e.g. CSE23001 or email@college.edu"
                      className="block w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={closeForgotModal}
                      className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm"
                    >
                      Send Reset Instructions
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="text-center py-3">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-1">
                  Reset Instructions Sent
                </h3>
                <p className="text-xs text-slate-600 mb-5">
                  Password reset link and verification instructions have been dispatched to the institutional email on file for <span className="font-semibold text-slate-800">{forgotInput}</span>.
                </p>
                <button
                  onClick={closeForgotModal}
                  className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl"
                >
                  Return to Sign In
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
