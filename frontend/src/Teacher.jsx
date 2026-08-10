import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  UserCheck, 
  ClipboardList, 
  BookOpen, 
  BarChart3, 
  User, 
  LogOut, 
  ShieldCheck, 
  Fingerprint, 
  Camera, 
  CreditCard, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Download, 
  FileText, 
  Filter, 
  Search, 
  Menu, 
  X,
  Play,
  RotateCcw,
  Sparkles,
  Users,
  Check,
  ChevronRight
} from 'lucide-react';

export default function Teacher({ currentUser, students, attendanceRecords, recordAttendance, onLogout }) {
  const [activeTab, setActiveTab] = useState('take-attendance'); // default to 'take-attendance' as requested
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Form State for Taking Attendance
  const [selectedClass, setSelectedClass] = useState('CSE-3A');
  const [selectedSubject, setSelectedSubject] = useState('Database Systems');
  const [selectedDate, setSelectedDate] = useState('2026-08-10');
  const [selectedMethod, setSelectedMethod] = useState('rfid'); // 'fingerprint' | 'face' | 'rfid' | 'manual'

  // Hardware Simulation States
  const [simState, setSimState] = useState('idle'); // 'idle' | 'scanning' | 'success'
  const [lastScannedStudent, setLastScannedStudent] = useState(null);

  // Manual Attendance List State
  const [manualList, setManualList] = useState(
    students.map(s => ({ ...s, status: 'Present' }))
  );

  // Attendance Records Filter States
  const [recordFilterDate, setRecordFilterDate] = useState('All');
  const [recordFilterSubject, setRecordFilterSubject] = useState('All');
  const [recordFilterMethod, setRecordFilterMethod] = useState('All');
  const [recordFilterStatus, setRecordFilterStatus] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Class Students for current selection
  const classStudents = students.filter(s => s.class === selectedClass || selectedClass === 'CSE-3A');

  // Trigger Fingerprint Simulation
  const handleSimulateFingerprint = () => {
    setSimState('scanning');
    setTimeout(() => {
      const targetStudent = classStudents[0] || students[0]; // Vansh Yadav
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      const newRec = recordAttendance({
        studentId: targetStudent.id,
        studentName: targetStudent.name,
        subject: selectedSubject,
        className: selectedClass,
        method: 'Fingerprint',
        status: 'Present',
        time: timeStr,
        date: '10 Aug'
      });

      setLastScannedStudent({
        ...targetStudent,
        method: 'Fingerprint',
        time: timeStr,
        status: 'Present'
      });
      setSimState('success');
    }, 800);
  };

  // Trigger Face Recognition Simulation
  const handleSimulateFace = () => {
    setSimState('scanning');
    setTimeout(() => {
      const targetStudent = classStudents[0] || students[0]; // Vansh Yadav
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      recordAttendance({
        studentId: targetStudent.id,
        studentName: targetStudent.name,
        subject: selectedSubject,
        className: selectedClass,
        method: 'Face Recognition',
        status: 'Present',
        time: timeStr,
        date: '10 Aug'
      });

      setLastScannedStudent({
        ...targetStudent,
        method: 'Face Recognition',
        time: timeStr,
        status: 'Present'
      });
      setSimState('success');
    }, 800);
  };

  // Trigger RFID Simulation
  const handleSimulateRFID = () => {
    setSimState('scanning');
    setTimeout(() => {
      const targetStudent = classStudents[0] || students[0]; // Vansh Yadav
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      recordAttendance({
        studentId: targetStudent.id,
        studentName: targetStudent.name,
        subject: selectedSubject,
        className: selectedClass,
        method: 'RFID',
        status: 'Present',
        time: timeStr,
        date: '10 Aug'
      });

      setLastScannedStudent({
        ...targetStudent,
        method: 'RFID',
        cardId: targetStudent.biometrics?.rfidId || 'RFID-2048-AX',
        time: timeStr,
        status: 'Present'
      });
      setSimState('success');
    }, 800);
  };

  // Toggle student status in manual mode
  const handleManualStatusToggle = (studentId) => {
    setManualList(prev => prev.map(s => {
      if (s.id === studentId) {
        return { ...s, status: s.status === 'Present' ? 'Absent' : 'Present' };
      }
      return s;
    }));
  };

  // Save manual attendance
  const handleSaveManualAttendance = () => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    manualList.forEach(student => {
      recordAttendance({
        studentId: student.id,
        studentName: student.name,
        subject: selectedSubject,
        className: selectedClass,
        method: 'Manual',
        status: student.status,
        time: timeStr,
        date: '10 Aug'
      });
    });

    alert(`Saved manual attendance for ${manualList.length} students in ${selectedClass}!`);
  };

  // Filtered Records for Attendance Records View
  const filteredRecords = attendanceRecords.filter(r => {
    const matchesSubject = recordFilterSubject === 'All' || r.subject === recordFilterSubject;
    const matchesMethod = recordFilterMethod === 'All' || r.method.toLowerCase().includes(recordFilterMethod.toLowerCase());
    const matchesStatus = recordFilterStatus === 'All' || r.status === recordFilterStatus;
    const matchesSearch = r.studentName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          r.studentId.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSubject && matchesMethod && matchesStatus && matchesSearch;
  });

  const getMethodBadge = (method) => {
    switch (method?.toLowerCase()) {
      case 'fingerprint':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
            <Fingerprint className="w-3.5 h-3.5 text-amber-600" /> Fingerprint
          </span>
        );
      case 'face recognition':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Camera className="w-3.5 h-3.5 text-emerald-600" /> Face Recognition
          </span>
        );
      case 'rfid':
      case 'rfid / card':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
            <CreditCard className="w-3.5 h-3.5 text-indigo-600" /> RFID
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
            <BookOpen className="w-3.5 h-3.5 text-blue-600" /> Manual
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
              <span className="text-[10px] font-semibold text-blue-400 uppercase tracking-wider">Teacher Portal</span>
            </div>
          </div>
          <button 
            onClick={() => setMobileMenuOpen(false)} 
            className="lg:hidden text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Teacher Mini Profile Info */}
        <div className="p-4 mx-4 my-4 bg-slate-800/60 rounded-xl border border-slate-700/50 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-md">
            RS
          </div>
          <div className="overflow-hidden">
            <h4 className="text-sm font-semibold text-white truncate">{currentUser.name || 'Prof. Rajesh Sharma'}</h4>
            <p className="text-xs text-slate-400">{currentUser.department || 'CSE Department'}</p>
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
            onClick={() => { setActiveTab('take-attendance'); setMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'take-attendance'
                ? 'bg-blue-600 text-white shadow-md font-semibold'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <UserCheck className="w-4 h-4 text-emerald-400" />
            Take Attendance
          </button>

          <button
            onClick={() => { setActiveTab('records'); setMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'records'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            Attendance Records
          </button>

          <button
            onClick={() => { setActiveTab('classes'); setMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'classes'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            My Classes
          </button>

          <button
            onClick={() => { setActiveTab('reports'); setMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'reports'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Reports
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
              {activeTab === 'dashboard' && 'Faculty Dashboard'}
              {activeTab === 'take-attendance' && 'Multi-Modal Attendance Terminal'}
              {activeTab === 'records' && 'Class Attendance Records'}
              {activeTab === 'classes' && 'My Managed Classes'}
              {activeTab === 'reports' && 'Attendance Reports & Analytics'}
              {activeTab === 'profile' && 'Faculty Profile'}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveTab('take-attendance')}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors shadow-sm"
            >
              <UserCheck className="w-4 h-4" /> Take Attendance
            </button>
            <div className="h-6 w-px bg-slate-200 hidden md:block" />
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                CSE Department
              </span>
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shadow-sm">
                RS
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable View Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-6">

          {/* ================= TEACHER DASHBOARD ================= */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6 max-w-7xl mx-auto">
              {/* Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Today's Classes</p>
                    <h3 className="text-3xl font-extrabold text-slate-900 mt-1">4</h3>
                    <p className="text-xs text-blue-600 font-medium mt-1">CSE-3A, CSE-3B</p>
                  </div>
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-xl border border-blue-200">
                    <BookOpen className="w-6 h-6" />
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Students</p>
                    <h3 className="text-3xl font-extrabold text-slate-900 mt-1">120</h3>
                    <p className="text-xs text-slate-500 mt-1">Enrolled across classes</p>
                  </div>
                  <div className="p-3 bg-slate-100 text-slate-600 rounded-xl border border-slate-200">
                    <Users className="w-6 h-6" />
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Present Today</p>
                    <h3 className="text-3xl font-extrabold text-emerald-600 mt-1">104</h3>
                    <p className="text-xs text-emerald-600 font-medium mt-1">86.6% Attendance</p>
                  </div>
                  <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-200">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Absent Today</p>
                    <h3 className="text-3xl font-extrabold text-rose-600 mt-1">16</h3>
                    <p className="text-xs text-slate-500 mt-1">Action items pending</p>
                  </div>
                  <div className="p-3 bg-rose-50 text-rose-600 rounded-xl border border-rose-200">
                    <XCircle className="w-6 h-6" />
                  </div>
                </div>
              </div>

              {/* Today's Schedule Card */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900">Today's Class Schedule</h3>
                  <button 
                    onClick={() => setActiveTab('take-attendance')}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-md transition-all flex items-center gap-1.5"
                  >
                    <UserCheck className="w-4 h-4" /> Start Attendance Session
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-blue-600 text-white rounded-lg font-bold text-sm">
                        09:00 AM
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800">Data Structures</h4>
                        <p className="text-xs text-slate-500 font-medium">CSE-3A • Room 301 • 45 Students</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                      Completed
                    </span>
                  </div>

                  <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-emerald-600 text-white rounded-lg font-bold text-sm">
                        11:00 AM
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800">Database Systems</h4>
                        <p className="text-xs text-slate-500 font-medium">CSE-3A • Lab 2 • 45 Students</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 animate-pulse">
                      Active Now
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= TAKE ATTENDANCE ================= */}
          {activeTab === 'take-attendance' && (
            <div className="space-y-6 max-w-7xl mx-auto">
              
              {/* Session Setup Card */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
                <h3 className="text-base font-bold text-slate-900">1. Configure Class & Session</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                      Select Class
                    </label>
                    <select
                      value={selectedClass}
                      onChange={(e) => setSelectedClass(e.target.value)}
                      className="w-full border border-slate-300 rounded-xl p-2.5 text-sm font-semibold bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="CSE-3A">CSE-3A (3rd Year, Sec A)</option>
                      <option value="CSE-3B">CSE-3B (3rd Year, Sec B)</option>
                      <option value="IT-3A">IT-3A (3rd Year, Sec A)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                      Select Subject
                    </label>
                    <select
                      value={selectedSubject}
                      onChange={(e) => setSelectedSubject(e.target.value)}
                      className="w-full border border-slate-300 rounded-xl p-2.5 text-sm font-semibold bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Database Systems">Database Systems (CS302)</option>
                      <option value="Data Structures">Data Structures (CS301)</option>
                      <option value="Operating Systems">Operating Systems (CS303)</option>
                      <option value="Computer Networks">Computer Networks (CS304)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                      Attendance Date
                    </label>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-full border border-slate-300 rounded-xl p-2.5 text-sm font-semibold bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Method Selection Cards */}
              <div className="space-y-3">
                <h3 className="text-base font-bold text-slate-900">2. Select Attendance Mode</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Fingerprint Card */}
                  <button
                    type="button"
                    onClick={() => { setSelectedMethod('fingerprint'); setSimState('idle'); }}
                    className={`p-5 rounded-2xl border text-left transition-all relative overflow-hidden ${
                      selectedMethod === 'fingerprint'
                        ? 'bg-amber-500 text-white border-amber-600 shadow-lg ring-4 ring-amber-100'
                        : 'bg-white text-slate-800 border-slate-200 hover:border-amber-300 hover:bg-amber-50/40'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className={`p-3 rounded-xl ${selectedMethod === 'fingerprint' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700'}`}>
                        <Fingerprint className="w-6 h-6" />
                      </div>
                      {selectedMethod === 'fingerprint' && (
                        <span className="w-3 h-3 rounded-full bg-white animate-ping" />
                      )}
                    </div>
                    <h4 className="font-bold text-base">Fingerprint Scan</h4>
                    <p className={`text-xs mt-1 ${selectedMethod === 'fingerprint' ? 'text-amber-100' : 'text-slate-500'}`}>
                      Biometric sensor terminal simulation
                    </p>
                  </button>

                  {/* Face Recognition Card */}
                  <button
                    type="button"
                    onClick={() => { setSelectedMethod('face'); setSimState('idle'); }}
                    className={`p-5 rounded-2xl border text-left transition-all relative overflow-hidden ${
                      selectedMethod === 'face'
                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-lg ring-4 ring-emerald-100'
                        : 'bg-white text-slate-800 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/40'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className={`p-3 rounded-xl ${selectedMethod === 'face' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700'}`}>
                        <Camera className="w-6 h-6" />
                      </div>
                      {selectedMethod === 'face' && (
                        <span className="w-3 h-3 rounded-full bg-white animate-ping" />
                      )}
                    </div>
                    <h4 className="font-bold text-base">Face Recognition</h4>
                    <p className={`text-xs mt-1 ${selectedMethod === 'face' ? 'text-emerald-100' : 'text-slate-500'}`}>
                      AI Vision camera scanner simulation
                    </p>
                  </button>

                  {/* RFID Card */}
                  <button
                    type="button"
                    onClick={() => { setSelectedMethod('rfid'); setSimState('idle'); }}
                    className={`p-5 rounded-2xl border text-left transition-all relative overflow-hidden ${
                      selectedMethod === 'rfid'
                        ? 'bg-indigo-600 text-white border-indigo-700 shadow-lg ring-4 ring-indigo-100'
                        : 'bg-white text-slate-800 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className={`p-3 rounded-xl ${selectedMethod === 'rfid' ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-700'}`}>
                        <CreditCard className="w-6 h-6" />
                      </div>
                      {selectedMethod === 'rfid' && (
                        <span className="w-3 h-3 rounded-full bg-white animate-ping" />
                      )}
                    </div>
                    <h4 className="font-bold text-base">RFID / Card</h4>
                    <p className={`text-xs mt-1 ${selectedMethod === 'rfid' ? 'text-indigo-100' : 'text-slate-500'}`}>
                      NFC smart card tap simulation
                    </p>
                  </button>

                  {/* Manual Card */}
                  <button
                    type="button"
                    onClick={() => { setSelectedMethod('manual'); setSimState('idle'); }}
                    className={`p-5 rounded-2xl border text-left transition-all relative overflow-hidden ${
                      selectedMethod === 'manual'
                        ? 'bg-blue-600 text-white border-blue-700 shadow-lg ring-4 ring-blue-100'
                        : 'bg-white text-slate-800 border-slate-200 hover:border-blue-300 hover:bg-blue-50/40'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className={`p-3 rounded-xl ${selectedMethod === 'manual' ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-700'}`}>
                        <BookOpen className="w-6 h-6" />
                      </div>
                      {selectedMethod === 'manual' && (
                        <span className="w-3 h-3 rounded-full bg-white" />
                      )}
                    </div>
                    <h4 className="font-bold text-base">Manual Attendance</h4>
                    <p className={`text-xs mt-1 ${selectedMethod === 'manual' ? 'text-blue-100' : 'text-slate-500'}`}>
                      Traditional roll call list update
                    </p>
                  </button>
                </div>
              </div>

              {/* Interactive Terminal Simulator Box */}
              {selectedMethod !== 'manual' && (
                <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 lg:p-8 text-white shadow-xl space-y-6 relative overflow-hidden">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-xs font-mono text-slate-400 uppercase tracking-widest">
                        Terminal Terminal-01 • Mode: {selectedMethod.toUpperCase()}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500 font-mono">Status: Ready</span>
                  </div>

                  <div className="flex flex-col items-center justify-center py-6 text-center space-y-4">
                    
                    {/* FINGERPRINT SIMULATION VIEW */}
                    {selectedMethod === 'fingerprint' && (
                      <>
                        <div className="relative flex items-center justify-center">
                          <div className={`w-28 h-28 rounded-full border-4 border-amber-500/40 flex items-center justify-center transition-all ${
                            simState === 'scanning' ? 'animate-pulse-ring border-amber-400 bg-amber-500/20' : 'bg-amber-950/40'
                          }`}>
                            <Fingerprint className={`w-16 h-16 ${simState === 'scanning' ? 'text-amber-300 animate-bounce' : simState === 'success' ? 'text-emerald-400' : 'text-amber-500'}`} />
                          </div>
                        </div>

                        {simState === 'idle' && (
                          <div className="space-y-2">
                            <h4 className="text-lg font-bold text-slate-200">Waiting for fingerprint scan...</h4>
                            <p className="text-xs text-slate-400">Place registered student finger on the optical sensor</p>
                            <button
                              onClick={handleSimulateFingerprint}
                              className="mt-2 inline-flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl font-extrabold text-sm shadow-lg shadow-amber-500/20 transition-all"
                            >
                              <Play className="w-4 h-4 fill-slate-950" /> Simulate Fingerprint Scan
                            </button>
                          </div>
                        )}

                        {simState === 'scanning' && (
                          <div className="space-y-2">
                            <h4 className="text-lg font-bold text-amber-400">Scanning Biometric Template...</h4>
                            <p className="text-xs text-slate-400">Matching minutiae against database...</p>
                          </div>
                        )}
                      </>
                    )}

                    {/* FACE RECOGNITION SIMULATION VIEW */}
                    {selectedMethod === 'face' && (
                      <>
                        <div className="relative w-64 h-40 rounded-xl border-2 border-dashed border-emerald-500/60 bg-emerald-950/20 flex flex-col items-center justify-center overflow-hidden">
                          {/* Corner bounding box brackets */}
                          <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-emerald-400" />
                          <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-emerald-400" />
                          <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-emerald-400" />
                          <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-emerald-400" />

                          <Camera className={`w-12 h-12 mb-2 ${simState === 'scanning' ? 'text-emerald-300 animate-pulse' : simState === 'success' ? 'text-emerald-400' : 'text-emerald-500'}`} />
                          <span className="text-[11px] font-mono text-emerald-400">AI CAMERA SCANNER</span>
                        </div>

                        {simState === 'idle' && (
                          <div className="space-y-2">
                            <h4 className="text-lg font-bold text-slate-200">Camera Terminal Ready</h4>
                            <p className="text-xs text-slate-400">Position student face in front of the lens</p>
                            <button
                              onClick={handleSimulateFace}
                              className="mt-2 inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-xl font-extrabold text-sm shadow-lg shadow-emerald-500/20 transition-all"
                            >
                              <Play className="w-4 h-4 fill-slate-950" /> Simulate Face Scan
                            </button>
                          </div>
                        )}

                        {simState === 'scanning' && (
                          <div className="space-y-2">
                            <h4 className="text-lg font-bold text-emerald-400">Analyzing Facial Embeddings...</h4>
                            <p className="text-xs text-slate-400">Performing 128-d landmark neural match...</p>
                          </div>
                        )}
                      </>
                    )}

                    {/* RFID SIMULATION VIEW */}
                    {selectedMethod === 'rfid' && (
                      <>
                        <div className="relative flex items-center justify-center">
                          <div className={`w-28 h-28 rounded-full border-4 border-indigo-500/40 flex items-center justify-center transition-all ${
                            simState === 'scanning' ? 'animate-pulse-ring border-indigo-400 bg-indigo-500/20' : 'bg-indigo-950/40'
                          }`}>
                            <CreditCard className={`w-14 h-14 ${simState === 'scanning' ? 'text-indigo-300 animate-bounce' : simState === 'success' ? 'text-emerald-400' : 'text-indigo-400'}`} />
                          </div>
                        </div>

                        {simState === 'idle' && (
                          <div className="space-y-2">
                            <h4 className="text-lg font-bold text-slate-200">Waiting for RFID Card...</h4>
                            <p className="text-xs text-slate-400">Tap student smart card against the reader terminal</p>
                            <button
                              onClick={handleSimulateRFID}
                              className="mt-2 inline-flex items-center gap-2 px-6 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-extrabold text-sm shadow-lg shadow-indigo-500/20 transition-all"
                            >
                              <Play className="w-4 h-4 fill-white" /> Simulate RFID Tap
                            </button>
                          </div>
                        )}

                        {simState === 'scanning' && (
                          <div className="space-y-2">
                            <h4 className="text-lg font-bold text-indigo-400">Reading 13.56 MHz RFID Tag...</h4>
                            <p className="text-xs text-slate-400">Verifying UID with CampusSync database...</p>
                          </div>
                        )}
                      </>
                    )}

                    {/* SIMULATION SUCCESS RESULT DISPLAY */}
                    {simState === 'success' && lastScannedStudent && (
                      <div className="w-full max-w-md bg-slate-800 rounded-xl border border-emerald-500/50 p-5 text-left space-y-3 animate-fade-in shadow-2xl">
                        <div className="flex items-center justify-between border-b border-slate-700 pb-3">
                          <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4" /> Identity Verified ✓
                          </span>
                          <span className="text-xs font-mono text-slate-400">{lastScannedStudent.time}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <span className="text-slate-400 block uppercase text-[10px] tracking-wider">Student Name</span>
                            <span className="font-bold text-white text-sm">{lastScannedStudent.name}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block uppercase text-[10px] tracking-wider">Student ID</span>
                            <span className="font-mono font-bold text-blue-400 text-sm">{lastScannedStudent.id}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block uppercase text-[10px] tracking-wider">Attendance Status</span>
                            <span className="font-extrabold text-emerald-400">PRESENT</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block uppercase text-[10px] tracking-wider">Verification Method</span>
                            <span className="font-semibold text-slate-200">{lastScannedStudent.method}</span>
                          </div>
                        </div>

                        <div className="pt-2 flex gap-2">
                          <button
                            onClick={() => setSimState('idle')}
                            className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-xs font-semibold text-white rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                          >
                            <RotateCcw className="w-3.5 h-3.5" /> Scan Next Student
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* MANUAL ATTENDANCE ROLL CALL TABLE */}
              {selectedMethod === 'manual' && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">Manual Roll Call Roster ({selectedClass})</h3>
                      <p className="text-xs text-slate-500">Toggle student attendance status and click save.</p>
                    </div>
                    <button
                      onClick={handleSaveManualAttendance}
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2"
                    >
                      <Check className="w-4 h-4" /> Save Attendance
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                          <th className="py-3 px-4">Student ID</th>
                          <th className="py-3 px-4">Student Name</th>
                          <th className="py-3 px-4">Current Attendance %</th>
                          <th className="py-3 px-4">Mark Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm">
                        {manualList.map((st) => (
                          <tr key={st.id} className="hover:bg-slate-50">
                            <td className="py-3 px-4 font-mono text-xs text-slate-600 font-semibold">{st.id}</td>
                            <td className="py-3 px-4 font-bold text-slate-800">{st.name}</td>
                            <td className="py-3 px-4 text-xs font-medium text-slate-500">{st.attendance}%</td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleManualStatusToggle(st.id)}
                                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                                    st.status === 'Present'
                                      ? 'bg-emerald-600 text-white shadow-sm'
                                      : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                                  }`}
                                >
                                  Present
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleManualStatusToggle(st.id)}
                                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                                    st.status === 'Absent'
                                      ? 'bg-rose-600 text-white shadow-sm'
                                      : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                                  }`}
                                >
                                  Absent
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* LIVE ATTENDANCE LOG FEED */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Live Attendance Log ({selectedClass})</h3>
                    <p className="text-xs text-slate-500">Real-time synchronized updates for current session</p>
                  </div>
                  <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-bold">
                    Live Feed Active
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        <th className="py-3 px-4">Student</th>
                        <th className="py-3 px-4">Subject</th>
                        <th className="py-3 px-4">Method</th>
                        <th className="py-3 px-4">Time</th>
                        <th className="py-3 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {attendanceRecords.slice(0, 5).map((rec) => (
                        <tr key={rec.id} className="hover:bg-slate-50">
                          <td className="py-3 px-4 font-bold text-slate-800">{rec.studentName} <span className="text-xs text-slate-400 font-mono">({rec.studentId})</span></td>
                          <td className="py-3 px-4 text-xs font-semibold text-slate-600">{rec.subject}</td>
                          <td className="py-3 px-4 whitespace-nowrap">{getMethodBadge(rec.method)}</td>
                          <td className="py-3 px-4 text-xs font-mono text-slate-500">{rec.time}</td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Present
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ================= ATTENDANCE RECORDS ================= */}
          {activeTab === 'records' && (
            <div className="space-y-6 max-w-7xl mx-auto">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3 md:space-y-0 md:flex md:items-center md:justify-between gap-4">
                <div className="flex-1 relative">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input 
                    type="text"
                    placeholder="Search by student name or ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <select
                    value={recordFilterSubject}
                    onChange={(e) => setRecordFilterSubject(e.target.value)}
                    className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs bg-slate-50 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="All">All Subjects</option>
                    <option value="Database Systems">Database Systems</option>
                    <option value="Data Structures">Data Structures</option>
                    <option value="Operating Systems">Operating Systems</option>
                  </select>

                  <select
                    value={recordFilterMethod}
                    onChange={(e) => setRecordFilterMethod(e.target.value)}
                    className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs bg-slate-50 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="All">All Methods</option>
                    <option value="Fingerprint">Fingerprint</option>
                    <option value="Face Recognition">Face Recognition</option>
                    <option value="RFID">RFID</option>
                    <option value="Manual">Manual</option>
                  </select>

                  <select
                    value={recordFilterStatus}
                    onChange={(e) => setRecordFilterStatus(e.target.value)}
                    className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs bg-slate-50 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="All">All Statuses</option>
                    <option value="Present">Present</option>
                    <option value="Absent">Absent</option>
                  </select>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        <th className="py-3.5 px-6">Student</th>
                        <th className="py-3.5 px-6">ID</th>
                        <th className="py-3.5 px-6">Class</th>
                        <th className="py-3.5 px-6">Subject</th>
                        <th className="py-3.5 px-6">Method</th>
                        <th className="py-3.5 px-6">Time</th>
                        <th className="py-3.5 px-6">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {filteredRecords.map((r) => (
                        <tr key={r.id} className="hover:bg-slate-50">
                          <td className="py-3.5 px-6 font-bold text-slate-800">{r.studentName}</td>
                          <td className="py-3.5 px-6 font-mono text-xs text-slate-500">{r.studentId}</td>
                          <td className="py-3.5 px-6 text-xs text-slate-500 font-medium">{r.className}</td>
                          <td className="py-3.5 px-6 font-semibold text-slate-700">{r.subject}</td>
                          <td className="py-3.5 px-6 whitespace-nowrap">{getMethodBadge(r.method)}</td>
                          <td className="py-3.5 px-6 text-xs font-mono text-slate-500">{r.time}</td>
                          <td className="py-3.5 px-6">
                            {r.status === 'Present' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Present
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
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

          {/* ================= MY CLASSES ================= */}
          {activeTab === 'classes' && (
            <div className="space-y-6 max-w-7xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold">CSE-3A</span>
                    <span className="text-xs text-slate-400 font-medium">3rd Year • Sec A</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">Computer Science & Eng.</h3>
                  <div className="text-xs text-slate-500 space-y-1">
                    <p>Total Enrolled: <strong>45 Students</strong></p>
                    <p>Assigned Subject: <strong>Database Systems, Data Structures</strong></p>
                  </div>
                  <button 
                    onClick={() => { setSelectedClass('CSE-3A'); setActiveTab('take-attendance'); }} 
                    className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors"
                  >
                    Take Attendance for CSE-3A
                  </button>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold">CSE-3B</span>
                    <span className="text-xs text-slate-400 font-medium">3rd Year • Sec B</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">Computer Science & Eng.</h3>
                  <div className="text-xs text-slate-500 space-y-1">
                    <p>Total Enrolled: <strong>42 Students</strong></p>
                    <p>Assigned Subject: <strong>Database Systems</strong></p>
                  </div>
                  <button 
                    onClick={() => { setSelectedClass('CSE-3B'); setActiveTab('take-attendance'); }} 
                    className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors"
                  >
                    Take Attendance for CSE-3B
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ================= REPORTS ================= */}
          {activeTab === 'reports' && (
            <div className="space-y-6 max-w-7xl mx-auto">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Faculty Attendance Reports</h3>
                    <p className="text-xs text-slate-500">Generate and export class performance summaries</p>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => alert("Simulated: Exported CSE3A_Attendance_Summary.csv")}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-300 transition-colors flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" /> Export CSV
                    </button>
                    <button
                      onClick={() => alert("Simulated: Generating PDF Academic Attendance Report...")}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition-colors flex items-center gap-2"
                    >
                      <FileText className="w-4 h-4" /> Generate Report
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100">
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-xs text-slate-500 font-medium">Average Attendance Rate</span>
                    <div className="text-2xl font-extrabold text-slate-900 mt-1">87.5%</div>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-xs text-slate-500 font-medium">Students Below 75%</span>
                    <div className="text-2xl font-extrabold text-amber-600 mt-1">3 Students</div>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-xs text-slate-500 font-medium">Total Sessions Held</span>
                    <div className="text-2xl font-extrabold text-blue-600 mt-1">48 Sessions</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= PROFILE ================= */}
          {activeTab === 'profile' && (
            <div className="space-y-6 max-w-4xl mx-auto">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-8 space-y-6">
                <div className="flex items-center gap-6 border-b border-slate-100 pb-6">
                  <div className="w-20 h-20 rounded-full bg-blue-600 text-white flex items-center justify-center font-extrabold text-2xl shadow-lg">
                    RS
                  </div>
                  <div>
                    <h2 className="text-2xl font-extrabold text-slate-900">{currentUser.name || 'Prof. Rajesh Sharma'}</h2>
                    <p className="text-sm font-semibold text-blue-600 font-mono">Faculty ID: TCH101</p>
                    <p className="text-xs text-slate-500">Department of Computer Science & Engineering</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-xs text-slate-400 uppercase font-semibold">Email</span>
                    <p className="font-semibold text-slate-800">r.sharma@college.edu</p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 uppercase font-semibold">Assigned Subjects</span>
                    <p className="font-semibold text-slate-800">Data Structures, Database Systems</p>
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
