import React, { useState } from 'react';
import { ShieldCheck, User, Lock, ArrowRight, UserCheck, GraduationCap, School, Check } from 'lucide-react';

export default function Login({ onLogin }) {
  const [selectedDemoRole, setSelectedDemoRole] = useState('student');
  const [identifier, setIdentifier] = useState('CSE23001');
  const [password, setPassword] = useState('••••••••');
  const [rememberMe, setRememberMe] = useState(true);

  const handleRoleSelect = (role) => {
    setSelectedDemoRole(role);
    if (role === 'student') {
      setIdentifier('CSE23001');
      setPassword('password123');
    } else if (role === 'teacher') {
      setIdentifier('TCH101');
      setPassword('teacher123');
    } else if (role === 'admin') {
      setIdentifier('admin@campussync.edu');
      setPassword('admin123');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin(selectedDemoRole);
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
          B.Tech CSE Project — Multi-Modal Biometrics & RFID Portal
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10 px-4">
        {/* Main Card */}
        <div className="bg-white py-8 px-6 shadow-xl shadow-slate-200/60 rounded-2xl border border-slate-200 sm:px-10">
          
          {/* Quick Demo Persona Switcher */}
          <div className="mb-6">
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2 text-center">
              Select Demo User Account
            </label>
            <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => handleRoleSelect('student')}
                className={`flex flex-col items-center py-2.5 px-2 rounded-lg text-xs font-medium transition-all ${
                  selectedDemoRole === 'student'
                    ? 'bg-white text-blue-700 shadow-md border border-blue-200 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <GraduationCap className="w-4 h-4 mb-1 text-blue-600" />
                Student
              </button>

              <button
                type="button"
                onClick={() => handleRoleSelect('teacher')}
                className={`flex flex-col items-center py-2.5 px-2 rounded-lg text-xs font-medium transition-all ${
                  selectedDemoRole === 'teacher'
                    ? 'bg-white text-blue-700 shadow-md border border-blue-200 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <UserCheck className="w-4 h-4 mb-1 text-blue-600" />
                Teacher
              </button>

              <button
                type="button"
                onClick={() => handleRoleSelect('admin')}
                className={`flex flex-col items-center py-2.5 px-2 rounded-lg text-xs font-medium transition-all ${
                  selectedDemoRole === 'admin'
                    ? 'bg-white text-blue-700 shadow-md border border-blue-200 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <School className="w-4 h-4 mb-1 text-blue-600" />
                Admin
              </button>
            </div>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                {selectedDemoRole === 'student' ? 'Student ID / Email' : selectedDemoRole === 'teacher' ? 'Faculty ID / Email' : 'Admin Email'}
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User className="h-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-50/50"
                  placeholder="Enter ID or Email"
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
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-50/50"
                  placeholder="Password"
                />
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
                <label htmlFor="remember-me" className="ml-2 block text-slate-600 cursor-pointer">
                  Remember me
                </label>
              </div>

              <a href="#forgot" onClick={(e) => { e.preventDefault(); alert("Demo Mode: Reset instructions sent to college mail."); }} className="font-semibold text-blue-600 hover:text-blue-500">
                Forgot password?
              </a>
            </div>

            <div>
              <button
                type="submit"
                className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
              >
                Sign In to Portal
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>

          {/* Quick Demo Access Bar */}
          <div className="mt-6 pt-6 border-t border-slate-100">
            <p className="text-xs text-center text-slate-500 mb-3 font-medium">
              Or launch directly with preloaded test data:
            </p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => onLogin('student')}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-blue-50 hover:text-blue-700 rounded-lg border border-slate-200 transition-colors"
              >
                <span>Student Demo (Vansh Yadav - CSE23001)</span>
                <span className="text-blue-600 font-semibold flex items-center gap-1">Launch <ArrowRight className="w-3 h-3" /></span>
              </button>

              <button
                type="button"
                onClick={() => onLogin('teacher')}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-blue-50 hover:text-blue-700 rounded-lg border border-slate-200 transition-colors"
              >
                <span>Teacher Demo (Prof. Rajesh Sharma)</span>
                <span className="text-blue-600 font-semibold flex items-center gap-1">Launch <ArrowRight className="w-3 h-3" /></span>
              </button>

              <button
                type="button"
                onClick={() => onLogin('admin')}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-blue-50 hover:text-blue-700 rounded-lg border border-slate-200 transition-colors"
              >
                <span>Admin Demo (System Administrator)</span>
                <span className="text-blue-600 font-semibold flex items-center gap-1">Launch <ArrowRight className="w-3 h-3" /></span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-6 text-center text-xs text-slate-400">
          <p>© 2026 CampusSync System • Built for B.Tech CSE 3rd Year Evaluation</p>
        </div>
      </div>
    </div>
  );
}
