import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  UserCheck, 
  BookOpen, 
  Layers, 
  ClipboardList, 
  Cpu, 
  BarChart3, 
  Settings, 
  LogOut, 
  ShieldCheck, 
  Plus, 
  CheckCircle2, 
  XCircle, 
  Search, 
  Filter, 
  Menu, 
  X,
  Activity,
  Fingerprint,
  Camera,
  CreditCard,
  Edit2,
  Eye,
  RefreshCw,
  Sliders,
  Bell
} from 'lucide-react';

export default function Admin({ 
  students, 
  teachers, 
  classes, 
  subjects, 
  devices, 
  attendanceRecords, 
  addStudent, 
  addTeacher, 
  addDevice, 
  toggleDeviceStatus, 
  onLogout 
}) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Modal States
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [showAddDeviceModal, setShowAddDeviceModal] = useState(false);

  // New Student Form State
  const [newStudentData, setNewStudentData] = useState({
    id: `CSE23${Math.floor(100 + Math.random() * 900)}`,
    name: '',
    class: 'CSE-3A',
    email: '',
    phone: '+91 98765 00000',
  });

  // New Device Form State
  const [newDeviceData, setNewDeviceData] = useState({
    name: '',
    type: 'Fingerprint',
    location: 'Building A',
  });

  // Filters for Admin Attendance Table
  const [filterClass, setFilterClass] = useState('All');
  const [filterSubject, setFilterSubject] = useState('All');
  const [filterMethod, setFilterMethod] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const handleCreateStudent = (e) => {
    e.preventDefault();
    if (!newStudentData.name || !newStudentData.email) return;
    addStudent({
      ...newStudentData,
      course: 'B.Tech CSE',
      year: '3rd Year',
      attendance: 90,
      status: 'Active',
      biometrics: { fingerprint: true, face: true, rfid: true, rfidId: `RFID-${Math.floor(1000 + Math.random() * 9000)}-XX` }
    });
    setShowAddStudentModal(false);
    setNewStudentData({ id: `CSE23${Math.floor(100 + Math.random() * 900)}`, name: '', class: 'CSE-3A', email: '', phone: '+91 98765 00000' });
  };

  const handleCreateDevice = (e) => {
    e.preventDefault();
    if (!newDeviceData.name) return;
    addDevice({
      id: `DEV-0${devices.length + 1}`,
      name: newDeviceData.name,
      type: newDeviceData.type,
      status: 'Online',
      location: newDeviceData.location,
      lastPing: 'Just now'
    });
    setShowAddDeviceModal(false);
    setNewDeviceData({ name: '', type: 'Fingerprint', location: 'Building A' });
  };

  // Filtered attendance for admin
  const filteredAttendance = attendanceRecords.filter(r => {
    const matchesClass = filterClass === 'All' || r.className === filterClass;
    const matchesSubject = filterSubject === 'All' || r.subject === filterSubject;
    const matchesMethod = filterMethod === 'All' || r.method.toLowerCase().includes(filterMethod.toLowerCase());
    const matchesSearch = r.studentName.toLowerCase().includes(searchQuery.toLowerCase()) || r.studentId.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesClass && matchesSubject && matchesMethod && matchesSearch;
  });

  const getMethodBadge = (method) => {
    switch (method?.toLowerCase()) {
      case 'fingerprint':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
            <Fingerprint className="w-3.5 h-3.5 text-amber-600" /> Fingerprint
          </span>
        );
      case 'face recognition':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Camera className="w-3.5 h-3.5 text-emerald-600" /> Face Recognition
          </span>
        );
      case 'rfid':
      case 'rfid / card':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
            <CreditCard className="w-3.5 h-3.5 text-indigo-600" /> RFID
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
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
              <span className="text-[10px] font-semibold text-blue-400 uppercase tracking-wider">Admin Console</span>
            </div>
          </div>
          <button 
            onClick={() => setMobileMenuOpen(false)} 
            className="lg:hidden text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Admin Badge Info */}
        <div className="p-4 mx-4 my-4 bg-slate-800/60 rounded-xl border border-slate-700/50 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-md">
            AD
          </div>
          <div className="overflow-hidden">
            <h4 className="text-sm font-semibold text-white truncate">System Administrator</h4>
            <p className="text-xs text-slate-400 font-mono">Master Control</p>
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
            onClick={() => { setActiveTab('students'); setMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'students'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            Students Management
          </button>

          <button
            onClick={() => { setActiveTab('teachers'); setMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'teachers'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            Teachers & Faculty
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
            Classes & Batches
          </button>

          <button
            onClick={() => { setActiveTab('subjects'); setMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'subjects'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            Subjects
          </button>

          <button
            onClick={() => { setActiveTab('attendance'); setMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'attendance'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            All Attendance Logs
          </button>

          <button
            onClick={() => { setActiveTab('devices'); setMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'devices'
                ? 'bg-blue-600 text-white shadow-md font-semibold'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <Cpu className="w-4 h-4 text-amber-400" />
            Hardware & Devices
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
            System Reports
          </button>

          <button
            onClick={() => { setActiveTab('settings'); setMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'settings'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <Settings className="w-4 h-4" />
            Settings
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
              {activeTab === 'dashboard' && 'Admin Control Center'}
              {activeTab === 'students' && 'Student Directory & Biometric Enrolment'}
              {activeTab === 'teachers' && 'Faculty Roster'}
              {activeTab === 'classes' && 'Academic Classes & Sections'}
              {activeTab === 'subjects' && 'Subject Allocations'}
              {activeTab === 'attendance' && 'System-wide Attendance Master Logs'}
              {activeTab === 'devices' && 'Multi-Modal Hardware Terminal Network'}
              {activeTab === 'reports' && 'Campus Attendance Analytics'}
              {activeTab === 'settings' && 'System Settings & Thresholds'}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              All Systems Operational
            </span>
          </div>
        </header>

        {/* Scrollable View Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-6">

          {/* ================= ADMIN DASHBOARD ================= */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6 max-w-7xl mx-auto">
              {/* Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Students</p>
                  <h3 className="text-3xl font-extrabold text-slate-900 mt-1">842</h3>
                  <p className="text-xs text-blue-600 font-medium mt-1">Across 24 Sections</p>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Teachers</p>
                  <h3 className="text-3xl font-extrabold text-slate-900 mt-1">64</h3>
                  <p className="text-xs text-slate-500 mt-1">Active Faculty</p>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Classes</p>
                  <h3 className="text-3xl font-extrabold text-slate-900 mt-1">24</h3>
                  <p className="text-xs text-slate-500 mt-1">Active Batches</p>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Today's Attendance</p>
                  <h3 className="text-3xl font-extrabold text-emerald-600 mt-1">91%</h3>
                  <p className="text-xs text-emerald-600 font-medium mt-1">+2.4% vs last week</p>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Devices</p>
                  <h3 className="text-3xl font-extrabold text-slate-900 mt-1">8</h3>
                  <p className="text-xs text-emerald-600 font-medium mt-1">7 Online • 1 Offline</p>
                </div>
              </div>

              {/* Attendance Method Usage Visualization Bar */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
                <h3 className="text-base font-bold text-slate-900">Attendance Method Breakdown Today</h3>
                
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="flex items-center gap-1.5 text-indigo-700">
                        <CreditCard className="w-4 h-4" /> RFID Card Taps (45%)
                      </span>
                      <span>378 Swipes</span>
                    </div>
                    <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                      <div className="bg-indigo-600 h-full rounded-full" style={{ width: '45%' }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="flex items-center gap-1.5 text-emerald-700">
                        <Camera className="w-4 h-4" /> Face Recognition (30%)
                      </span>
                      <span>252 Verifications</span>
                    </div>
                    <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                      <div className="bg-emerald-600 h-full rounded-full" style={{ width: '30%' }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="flex items-center gap-1.5 text-amber-700">
                        <Fingerprint className="w-4 h-4" /> Fingerprint Scans (20%)
                      </span>
                      <span>168 Scans</span>
                    </div>
                    <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                      <div className="bg-amber-500 h-full rounded-full" style={{ width: '20%' }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="flex items-center gap-1.5 text-blue-700">
                        <BookOpen className="w-4 h-4" /> Manual Roll Call (5%)
                      </span>
                      <span>42 Records</span>
                    </div>
                    <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                      <div className="bg-blue-600 h-full rounded-full" style={{ width: '5%' }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= ADMIN STUDENTS ================= */}
          {activeTab === 'students' && (
            <div className="space-y-6 max-w-7xl mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search students..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  onClick={() => setShowAddStudentModal(true)}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm shadow-md transition-all flex items-center gap-2 shrink-0"
                >
                  <Plus className="w-4 h-4" /> Add Student
                </button>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        <th className="py-3.5 px-6">Student ID</th>
                        <th className="py-3.5 px-6">Name</th>
                        <th className="py-3.5 px-6">Class</th>
                        <th className="py-3.5 px-6">Email</th>
                        <th className="py-3.5 px-6">Attendance %</th>
                        <th className="py-3.5 px-6">Status</th>
                        <th className="py-3.5 px-6">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {students.map((st) => (
                        <tr key={st.id} className="hover:bg-slate-50">
                          <td className="py-3.5 px-6 font-mono text-xs font-bold text-blue-600">{st.id}</td>
                          <td className="py-3.5 px-6 font-bold text-slate-800">{st.name}</td>
                          <td className="py-3.5 px-6 text-xs text-slate-500 font-semibold">{st.class}</td>
                          <td className="py-3.5 px-6 text-slate-500 text-xs">{st.email}</td>
                          <td className="py-3.5 px-6 font-bold text-emerald-600">{st.attendance}%</td>
                          <td className="py-3.5 px-6">
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                              Active
                            </span>
                          </td>
                          <td className="py-3.5 px-6">
                            <div className="flex items-center gap-2">
                              <button onClick={() => alert(`View details for ${st.name}`)} className="p-1 text-slate-400 hover:text-blue-600">
                                <Eye className="w-4 h-4" />
                              </button>
                              <button onClick={() => alert(`Edit student ${st.name}`)} className="p-1 text-slate-400 hover:text-amber-600">
                                <Edit2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ================= ADMIN TEACHERS ================= */}
          {activeTab === 'teachers' && (
            <div className="space-y-6 max-w-7xl mx-auto">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        <th className="py-3.5 px-6">Teacher ID</th>
                        <th className="py-3.5 px-6">Name</th>
                        <th className="py-3.5 px-6">Department</th>
                        <th className="py-3.5 px-6">Assigned Subjects</th>
                        <th className="py-3.5 px-6">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {teachers.map((t) => (
                        <tr key={t.id} className="hover:bg-slate-50">
                          <td className="py-3.5 px-6 font-mono text-xs font-bold text-slate-600">{t.id}</td>
                          <td className="py-3.5 px-6 font-bold text-slate-800">{t.name}</td>
                          <td className="py-3.5 px-6 text-xs text-slate-500 font-semibold">{t.department}</td>
                          <td className="py-3.5 px-6 text-xs text-slate-700 font-medium">{t.subjects.join(', ')}</td>
                          <td className="py-3.5 px-6">
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                              Active
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

          {/* ================= ADMIN CLASSES ================= */}
          {activeTab === 'classes' && (
            <div className="space-y-6 max-w-7xl mx-auto">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        <th className="py-3.5 px-6">Class</th>
                        <th className="py-3.5 px-6">Year</th>
                        <th className="py-3.5 px-6">Section</th>
                        <th className="py-3.5 px-6">Students Count</th>
                        <th className="py-3.5 px-6">Class Teacher</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {classes.map((c) => (
                        <tr key={c.id} className="hover:bg-slate-50">
                          <td className="py-3.5 px-6 font-bold text-blue-600">{c.name}</td>
                          <td className="py-3.5 px-6 text-slate-600 text-xs">{c.year}</td>
                          <td className="py-3.5 px-6 text-slate-600 text-xs font-bold">{c.section}</td>
                          <td className="py-3.5 px-6 text-slate-800 font-semibold">{c.totalStudents} Students</td>
                          <td className="py-3.5 px-6 text-slate-700 font-medium">{c.classTeacher}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ================= ADMIN SUBJECTS ================= */}
          {activeTab === 'subjects' && (
            <div className="space-y-6 max-w-7xl mx-auto">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        <th className="py-3.5 px-6">Subject Code</th>
                        <th className="py-3.5 px-6">Subject Name</th>
                        <th className="py-3.5 px-6">Assigned Faculty</th>
                        <th className="py-3.5 px-6">Target Class</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {subjects.map((sub) => (
                        <tr key={sub.id} className="hover:bg-slate-50">
                          <td className="py-3.5 px-6 font-mono text-xs font-bold text-slate-600">{sub.code}</td>
                          <td className="py-3.5 px-6 font-bold text-slate-800">{sub.name}</td>
                          <td className="py-3.5 px-6 text-slate-700 font-medium">{sub.teacher}</td>
                          <td className="py-3.5 px-6 text-xs text-blue-600 font-bold">{sub.class}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ================= ADMIN DEVICES (MULTI-MODAL HARDWARE) ================= */}
          {activeTab === 'devices' && (
            <div className="space-y-6 max-w-7xl mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Multi-Modal Attendance Terminal Monitor</h3>
                  <p className="text-xs text-slate-500">Live hardware status of biometrics and RFID scanners across campus</p>
                </div>
                <button
                  onClick={() => setShowAddDeviceModal(true)}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm shadow-md transition-all flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Add Device
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {devices.map((dev) => (
                  <div key={dev.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <span className="font-mono text-xs text-slate-400 font-bold">{dev.id}</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold flex items-center gap-1 ${
                        dev.status === 'Online'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}>
                        <span className={`w-2 h-2 rounded-full ${dev.status === 'Online' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                        {dev.status}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <h4 className="text-base font-bold text-slate-900">{dev.name}</h4>
                      <p className="text-xs text-slate-500 font-medium">Type: <strong>{dev.type}</strong></p>
                      <p className="text-xs text-slate-500">Location: {dev.location}</p>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                      <span className="text-slate-400 font-mono">Ping: {dev.lastPing}</span>
                      <button
                        onClick={() => toggleDeviceStatus(dev.id)}
                        className={`px-3 py-1 rounded-lg font-bold text-xs transition-colors ${
                          dev.status === 'Online'
                            ? 'bg-slate-100 text-slate-700 hover:bg-rose-50 hover:text-rose-600'
                            : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        }`}
                      >
                        {dev.status === 'Online' ? 'Disconnect' : 'Connect'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ================= ADMIN ATTENDANCE LOGS ================= */}
          {activeTab === 'attendance' && (
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
                    value={filterClass}
                    onChange={(e) => setFilterClass(e.target.value)}
                    className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs bg-slate-50 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="All">All Classes</option>
                    <option value="CSE-3A">CSE-3A</option>
                    <option value="CSE-3B">CSE-3B</option>
                  </select>

                  <select
                    value={filterMethod}
                    onChange={(e) => setFilterMethod(e.target.value)}
                    className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs bg-slate-50 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="All">All Methods</option>
                    <option value="Fingerprint">Fingerprint</option>
                    <option value="Face Recognition">Face Recognition</option>
                    <option value="RFID">RFID</option>
                    <option value="Manual">Manual</option>
                  </select>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        <th className="py-3.5 px-6">Student</th>
                        <th className="py-3.5 px-6">Subject</th>
                        <th className="py-3.5 px-6">Date</th>
                        <th className="py-3.5 px-6">Time</th>
                        <th className="py-3.5 px-6">Method</th>
                        <th className="py-3.5 px-6">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {filteredAttendance.map((rec) => (
                        <tr key={rec.id} className="hover:bg-slate-50">
                          <td className="py-3.5 px-6 font-bold text-slate-800">{rec.studentName} <span className="text-xs text-slate-400 font-mono">({rec.studentId})</span></td>
                          <td className="py-3.5 px-6 text-slate-700 font-semibold">{rec.subject}</td>
                          <td className="py-3.5 px-6 text-slate-600 text-xs font-medium">{rec.date}</td>
                          <td className="py-3.5 px-6 text-slate-500 font-mono text-xs">{rec.time}</td>
                          <td className="py-3.5 px-6 whitespace-nowrap">{getMethodBadge(rec.method)}</td>
                          <td className="py-3.5 px-6">
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

          {/* ================= ADMIN REPORTS ================= */}
          {activeTab === 'reports' && (
            <div className="space-y-6 max-w-7xl mx-auto">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
                <h3 className="text-base font-bold text-slate-900">Institutional Reports & Multi-Modal Compliance</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-xs text-slate-500 font-medium">Campus-wide Attendance Average</span>
                    <div className="text-2xl font-extrabold text-blue-600 mt-1">91.2%</div>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-xs text-slate-500 font-medium">Most Active Method</span>
                    <div className="text-2xl font-extrabold text-indigo-600 mt-1">RFID Cards (45%)</div>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-xs text-slate-500 font-medium">Biometric Hardware Health</span>
                    <div className="text-2xl font-extrabold text-emerald-600 mt-1">98.5% Uptime</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= ADMIN SETTINGS ================= */}
          {activeTab === 'settings' && (
            <div className="space-y-6 max-w-4xl mx-auto">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
                <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">Global Attendance Policy Settings</h3>
                
                <div className="space-y-4 text-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-800">Minimum Exam Eligibility Threshold</span>
                      <p className="text-xs text-slate-500">Students falling below this trigger automated warning alerts</p>
                    </div>
                    <span className="font-mono font-bold text-blue-600 text-base">75%</span>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                    <div>
                      <span className="font-bold text-slate-800">Multi-Factor Biometric Verification</span>
                      <p className="text-xs text-slate-500">Require RFID + Fingerprint dual verification for exam halls</p>
                    </div>
                    <input type="checkbox" defaultChecked className="h-4 w-4 text-blue-600 rounded" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ADD STUDENT MODAL */}
      {showAddStudentModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Add New Student</h3>
              <button onClick={() => setShowAddStudentModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateStudent} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Vikram Singh"
                  value={newStudentData.name}
                  onChange={(e) => setNewStudentData({ ...newStudentData, name: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Email</label>
                <input
                  type="email"
                  required
                  placeholder="vikram@college.edu"
                  value={newStudentData.email}
                  onChange={(e) => setNewStudentData({ ...newStudentData, email: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Student ID</label>
                  <input
                    type="text"
                    value={newStudentData.id}
                    readOnly
                    className="w-full border border-slate-200 bg-slate-100 rounded-lg p-2 text-xs font-mono font-bold text-slate-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Class Section</label>
                  <select
                    value={newStudentData.class}
                    onChange={(e) => setNewStudentData({ ...newStudentData, class: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="CSE-3A">CSE-3A</option>
                    <option value="CSE-3B">CSE-3B</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddStudentModal(false)}
                  className="w-1/2 py-2.5 border border-slate-300 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 shadow-md"
                >
                  Save & Enroll
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD DEVICE MODAL */}
      {showAddDeviceModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Register New Hardware Terminal</h3>
              <button onClick={() => setShowAddDeviceModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDevice} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Terminal Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Camera 04 - Auditorium"
                  value={newDeviceData.name}
                  onChange={(e) => setNewDeviceData({ ...newDeviceData, name: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Terminal Hardware Type</label>
                <select
                  value={newDeviceData.type}
                  onChange={(e) => setNewDeviceData({ ...newDeviceData, type: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Fingerprint">Fingerprint Scanner</option>
                  <option value="Face Recognition">Face Recognition Camera</option>
                  <option value="RFID">RFID Reader</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Physical Location</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Block C Entrance"
                  value={newDeviceData.location}
                  onChange={(e) => setNewDeviceData({ ...newDeviceData, location: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddDeviceModal(false)}
                  className="w-1/2 py-2.5 border border-slate-300 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 shadow-md"
                >
                  Register Device
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
