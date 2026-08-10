import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  CalendarCheck, 
  History, 
  User, 
  LogOut, 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Fingerprint, 
  Camera, 
  CreditCard, 
  BookOpen, 
  Search, 
  Filter, 
  Menu, 
  X,
  Award,
  ChevronRight,
  Bell
} from 'lucide-react';

export default function Student({ currentUser, attendanceRecords, onLogout }) {
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'attendance' | 'history' | 'profile'
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Filters for Attendance History
  const [filterSubject, setFilterSubject] = useState('All');
  const [filterMethod, setFilterMethod] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter attendance records specific to this student (Vansh Yadav - CSE23001)
  const studentRecords = attendanceRecords.filter(
    r => r.studentId === currentUser.id || r.studentName === currentUser.name
  );

  const presentCount = studentRecords.filter(r => r.status === 'Present').length;
  const absentCount = studentRecords.filter(r => r.status === 'Absent').length;
  const totalClasses = studentRecords.length || 48;
  const computedAttendancePct = totalClasses > 0 ? Math.round((presentCount / totalClasses) * 100) : 87;

  // Filtered records for History view
  const filteredRecords = studentRecords.filter(record => {
    const matchesSubject = filterSubject === 'All' || record.subject === filterSubject;
    const matchesMethod = filterMethod === 'All' || record.method.toLowerCase().includes(filterMethod.toLowerCase());
    const matchesSearch = record.subject.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          record.date.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSubject && matchesMethod && matchesSearch;
  });

  const subjectStats = [
    { subject: 'Data Structures', pct: 92, present: 12, total: 13, code: 'CS301' },
    { subject: 'Database Systems', pct: 85, present: 11, total: 13, code: 'CS302' },
    { subject: 'Operating Systems', pct: 88, present: 14, total: 16, code: 'CS303' },
    { subject: 'Computer Networks', pct: 81, present: 9, total: 11, code: 'CS304' },
    { subject: 'Mathematics', pct: 90, present: 9, total: 10, code: 'MA301' },
  ];

  const getMethodBadge = (method) => {
    switch (method?.toLowerCase()) {
      case 'fingerprint':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
            <Fingerprint className="w-3.5 h-3.5 text-amber-600" />
            Fingerprint
          </span>
        );
      case 'face recognition':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Camera className="w-3.5 h-3.5 text-emerald-600" />
            Face Recognition
          </span>
        );
      case 'rfid':
      case 'rfid / card':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
            <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
            RFID
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
            <BookOpen className="w-3.5 h-3.5 text-blue-600" />
            {method || 'Manual'}
          </span>
        );
    }
  };

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-300 flex flex-col transition-transform duration-300 transform 
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Brand */}
        <div className="flex items-center justify-between h-16 px-6 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg text-white">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight leading-none">CampusSync</h2>
              <span className="text-[10px] font-semibold text-blue-400 uppercase tracking-wider">Student Portal</span>
            </div>
          </div>
          <button 
            onClick={() => setMobileMenuOpen(false)} 
            className="lg:hidden text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Student Mini Profile Info */}
        <div className="p-4 mx-4 my-4 bg-slate-800/60 rounded-xl border border-slate-700/50 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-md">
            {currentUser.name.charAt(0)}
          </div>
          <div className="overflow-hidden">
            <h4 className="text-sm font-semibold text-white truncate">{currentUser.name}</h4>
            <p className="text-xs text-slate-400 font-mono">{currentUser.id}</p>
          </div>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          <button
            onClick={() => { setActiveTab('dashboard'); setMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'dashboard'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </button>

          <button
            onClick={() => { setActiveTab('attendance'); setMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'attendance'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <CalendarCheck className="w-4 h-4" />
            My Attendance
          </button>

          <button
            onClick={() => { setActiveTab('history'); setMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'history'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <History className="w-4 h-4" />
            Attendance History
          </button>

          <button
            onClick={() => { setActiveTab('profile'); setMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'profile'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <User className="w-4 h-4" />
            Profile
          </button>
        </nav>

        {/* Sidebar Footer Logout */}
        <div className="p-4 border-t border-slate-800">
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 bg-red-950/40 hover:bg-red-900/60 hover:text-red-200 transition-colors border border-red-900/40"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Navbar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-semibold text-slate-800 capitalize">
              {activeTab === 'dashboard' && 'Student Dashboard'}
              {activeTab === 'attendance' && 'My Attendance Summary'}
              {activeTab === 'history' && 'Attendance History Records'}
              {activeTab === 'profile' && 'Student Profile & Biometrics'}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 text-xs text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Biometric Sync: Online</span>
            </div>

            <div className="h-6 w-px bg-slate-200 hidden md:block" />

            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                CSE-3A
              </span>
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shadow-sm">
                VY
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable View Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-6">
          {/* ================= DASHBOARD VIEW ================= */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6 max-w-7xl mx-auto">
              {/* Greeting Card */}
              <div className="bg-gradient-to-r from-blue-700 to-indigo-800 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-white/10 rounded-full blur-xl pointer-events-none" />
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight">Good Morning, Vansh 👋</h2>
                    <p className="mt-1 text-blue-100 text-sm">
                      B.Tech Computer Science & Engineering • Semester 5 • Section CSE-3A
                    </p>
                  </div>
                  <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/20">
                    <Award className="w-6 h-6 text-amber-300" />
                    <div>
                      <div className="text-xs text-blue-200">Current Status</div>
                      <div className="text-sm font-bold text-white">Eligible for Exams (87%)</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Attendance Summary Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Overall Attendance</p>
                    <h3 className="text-3xl font-extrabold text-slate-900 mt-1">{computedAttendancePct}%</h3>
                    <p className="text-xs text-emerald-600 font-medium mt-1">Above 75% threshold</p>
                  </div>
                  <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center font-bold text-lg">
                    {computedAttendancePct}%
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Classes Present</p>
                    <h3 className="text-3xl font-extrabold text-emerald-600 mt-1">{presentCount}</h3>
                    <p className="text-xs text-slate-500 mt-1">Out of {totalClasses} classes</p>
                  </div>
                  <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-200">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Classes Absent</p>
                    <h3 className="text-3xl font-extrabold text-rose-600 mt-1">{absentCount}</h3>
                    <p className="text-xs text-slate-500 mt-1">Authorized & medical</p>
                  </div>
                  <div className="p-3 bg-rose-50 text-rose-600 rounded-xl border border-rose-200">
                    <XCircle className="w-6 h-6" />
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Classes</p>
                    <h3 className="text-3xl font-extrabold text-slate-900 mt-1">{totalClasses}</h3>
                    <p className="text-xs text-slate-500 mt-1">Conduct till date</p>
                  </div>
                  <div className="p-3 bg-slate-100 text-slate-600 rounded-xl border border-slate-200">
                    <BookOpen className="w-6 h-6" />
                  </div>
                </div>
              </div>

              {/* Subject Attendance Breakdown */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900">Subject-Wise Attendance Breakdown</h3>
                  <button 
                    onClick={() => setActiveTab('attendance')} 
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    View Detailed Breakdown <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {subjectStats.map((item, idx) => (
                    <div key={idx} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 font-mono uppercase">{item.code}</span>
                          <h4 className="text-sm font-bold text-slate-800 leading-tight">{item.subject}</h4>
                        </div>
                        <span className={`text-sm font-extrabold px-2 py-0.5 rounded-md ${
                          item.pct >= 85 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {item.pct}%
                        </span>
                      </div>

                      {/* Clean Progress Bar */}
                      <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            item.pct >= 85 ? 'bg-emerald-500' : 'bg-amber-500'
                          }`} 
                          style={{ width: `${item.pct}%` }} 
                        />
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>Attended: <strong>{item.present}/{item.total}</strong></span>
                        <span className="text-slate-400">Req: 75%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Attendance Table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Recent Attendance Activity</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Live records synchronized from multi-modal terminals</p>
                  </div>
                  <button 
                    onClick={() => setActiveTab('history')} 
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    Full History <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        <th className="py-3.5 px-6">Date</th>
                        <th className="py-3.5 px-6">Subject</th>
                        <th className="py-3.5 px-6">Method</th>
                        <th className="py-3.5 px-6">Time</th>
                        <th className="py-3.5 px-6">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {studentRecords.slice(0, 6).map((rec) => (
                        <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-6 font-medium text-slate-900 whitespace-nowrap">{rec.date}</td>
                          <td className="py-3.5 px-6 font-semibold text-slate-800">{rec.subject}</td>
                          <td className="py-3.5 px-6 whitespace-nowrap">{getMethodBadge(rec.method)}</td>
                          <td className="py-3.5 px-6 text-slate-500 font-mono text-xs whitespace-nowrap">{rec.time}</td>
                          <td className="py-3.5 px-6 whitespace-nowrap">
                            {rec.status === 'Present' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Present
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
                                <XCircle className="w-3.5 h-3.5" /> Absent
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ================= MY ATTENDANCE / HISTORY VIEW ================= */}
          {(activeTab === 'attendance' || activeTab === 'history') && (
            <div className="space-y-6 max-w-7xl mx-auto">
              {/* Header Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-xs text-slate-500 font-medium">Overall Attendance</span>
                  <div className="text-2xl font-extrabold text-blue-600 mt-1">{computedAttendancePct}%</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-xs text-slate-500 font-medium">Classes Attended</span>
                  <div className="text-2xl font-extrabold text-emerald-600 mt-1">{presentCount}</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-xs text-slate-500 font-medium">Classes Missed</span>
                  <div className="text-2xl font-extrabold text-rose-600 mt-1">{absentCount}</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-xs text-slate-500 font-medium">Total Sessions</span>
                  <div className="text-2xl font-extrabold text-slate-800 mt-1">{totalClasses}</div>
                </div>
              </div>

              {/* Filter Controls Bar */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3 md:space-y-0 md:flex md:items-center md:justify-between gap-4">
                <div className="flex-1 relative">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input 
                    type="text"
                    placeholder="Search by subject or date..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-slate-400" />
                    <span className="text-xs font-semibold text-slate-600">Subject:</span>
                    <select
                      value={filterSubject}
                      onChange={(e) => setFilterSubject(e.target.value)}
                      className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs bg-slate-50 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="All">All Subjects</option>
                      <option value="Data Structures">Data Structures</option>
                      <option value="Database Systems">Database Systems</option>
                      <option value="Operating Systems">Operating Systems</option>
                      <option value="Computer Networks">Computer Networks</option>
                      <option value="Mathematics">Mathematics</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-600">Method:</span>
                    <select
                      value={filterMethod}
                      onChange={(e) => setFilterMethod(e.target.value)}
                      className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs bg-slate-50 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="All">All Methods</option>
                      <option value="RFID">RFID</option>
                      <option value="Fingerprint">Fingerprint</option>
                      <option value="Face Recognition">Face Recognition</option>
                      <option value="Manual">Manual</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Attendance Table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        <th className="py-3.5 px-6">Record ID</th>
                        <th className="py-3.5 px-6">Date</th>
                        <th className="py-3.5 px-6">Subject</th>
                        <th className="py-3.5 px-6">Class</th>
                        <th className="py-3.5 px-6">Method</th>
                        <th className="py-3.5 px-6">Time</th>
                        <th className="py-3.5 px-6">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {filteredRecords.length > 0 ? (
                        filteredRecords.map((rec) => (
                          <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3.5 px-6 font-mono text-xs text-slate-400">{rec.id}</td>
                            <td className="py-3.5 px-6 font-medium text-slate-900 whitespace-nowrap">{rec.date}</td>
                            <td className="py-3.5 px-6 font-semibold text-slate-800">{rec.subject}</td>
                            <td className="py-3.5 px-6 text-slate-500 text-xs font-medium">{rec.className}</td>
                            <td className="py-3.5 px-6 whitespace-nowrap">{getMethodBadge(rec.method)}</td>
                            <td className="py-3.5 px-6 text-slate-500 font-mono text-xs whitespace-nowrap">{rec.time}</td>
                            <td className="py-3.5 px-6 whitespace-nowrap">
                              {rec.status === 'Present' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Present
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
                                  <XCircle className="w-3.5 h-3.5" /> Absent
                                </span>
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="7" className="py-8 text-center text-slate-400 text-sm">
                            No attendance records match your filter criteria.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ================= PROFILE VIEW ================= */}
          {activeTab === 'profile' && (
            <div className="space-y-6 max-w-4xl mx-auto">
              {/* Profile Main Card */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-8 space-y-6">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 border-b border-slate-100 pb-6">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-extrabold text-3xl shadow-xl ring-4 ring-blue-50">
                    VY
                  </div>
                  <div className="text-center sm:text-left space-y-1">
                    <h2 className="text-2xl font-extrabold text-slate-900">{currentUser.name}</h2>
                    <p className="text-sm font-semibold text-blue-600 font-mono">{currentUser.id}</p>
                    <p className="text-xs text-slate-500 font-medium">B.Tech Computer Science & Engineering • 3rd Year (Section A)</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Full Name</span>
                    <p className="font-semibold text-slate-800">{currentUser.name}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Student ID Number</span>
                    <p className="font-semibold font-mono text-slate-800">{currentUser.id}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Department & Program</span>
                    <p className="font-semibold text-slate-800">{currentUser.course || 'B.Tech CSE'}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Year & Section</span>
                    <p className="font-semibold text-slate-800">{currentUser.year || '3rd Year'} ({currentUser.class || 'CSE-3A'})</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">College Email</span>
                    <p className="font-semibold text-slate-800">{currentUser.email}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Contact Phone</span>
                    <p className="font-semibold text-slate-800">{currentUser.phone}</p>
                  </div>
                </div>
              </div>

              {/* Biometrics & RFID Registration Status */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-8 space-y-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Registered Biometric & Hardware Identifiers</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Status of enrolled attendance credentials linked to your Student ID</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Fingerprint */}
                  <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-200 flex items-start gap-3">
                    <div className="p-2.5 bg-amber-100 text-amber-700 rounded-lg shrink-0">
                      <Fingerprint className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-amber-900">Fingerprint Scan</h4>
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 mt-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Registered
                      </span>
                      <p className="text-[11px] text-amber-800/80 font-mono mt-1">Template: FP-8821-ENROLLED</p>
                    </div>
                  </div>

                  {/* Face Recognition */}
                  <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200 flex items-start gap-3">
                    <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-lg shrink-0">
                      <Camera className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-emerald-900">Face Recognition</h4>
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 mt-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Registered
                      </span>
                      <p className="text-[11px] text-emerald-800/80 font-mono mt-1">Embedding: FC-9943-ACTIVE</p>
                    </div>
                  </div>

                  {/* RFID Card */}
                  <div className="p-4 bg-indigo-50/60 rounded-xl border border-indigo-200 flex items-start gap-3">
                    <div className="p-2.5 bg-indigo-100 text-indigo-700 rounded-lg shrink-0">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-indigo-900">RFID Smart Card</h4>
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 mt-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Registered
                      </span>
                      <p className="text-[11px] text-indigo-800/80 font-mono mt-1">Card ID: RFID-2048-AX</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
