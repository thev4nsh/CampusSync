import React, { useState, useEffect, useCallback } from 'react';
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
  RefreshCw,
  AlertCircle,
  Calendar,
  Layers,
  Phone,
  Mail,
  Building,
  GraduationCap
} from 'lucide-react';
import { studentApi, ApiError } from './api';

export default function Student({ currentUser, onLogout, showToast, institutionInfo }) {
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'attendance' | 'history' | 'profile'
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // ================= DASHBOARD STATE =================
  const [dashboardData, setDashboardData] = useState(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState(null);

  // ================= ATTENDANCE & HISTORY STATE =================
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [attendanceLoading, setAttendanceLoading] = useState(true);
  const [attendanceError, setAttendanceError] = useState(null);
  const [filterSubject, setFilterSubject] = useState('All');
  const [filterMethod, setFilterMethod] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // ================= PROFILE STATE =================
  const [profileData, setProfileData] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState(null);

  // ================= FETCH DASHBOARD =================
  const fetchDashboard = useCallback(async () => {
    setDashboardLoading(true);
    setDashboardError(null);
    try {
      const data = await studentApi.getDashboard();
      setDashboardData(data);
    } catch (err) {
      setDashboardError(err.message || 'Unable to fetch dashboard statistics.');
    } finally {
      setDashboardLoading(false);
    }
  }, []);

  // ================= FETCH ATTENDANCE HISTORY =================
  const fetchAttendanceHistory = useCallback(async () => {
    setAttendanceLoading(true);
    setAttendanceError(null);
    try {
      const filters = {};
      if (filterSubject !== 'All') filters.subject = filterSubject;
      if (filterMethod !== 'All') filters.method = filterMethod;
      if (filterStatus !== 'All') filters.status = filterStatus;
      if (searchQuery.trim()) filters.search = searchQuery.trim();

      const data = await studentApi.getAttendance(filters);
      setAttendanceRecords(Array.isArray(data) ? data : (data?.records || []));
    } catch (err) {
      setAttendanceError(err.message || 'Unable to fetch attendance history.');
    } finally {
      setAttendanceLoading(false);
    }
  }, [filterSubject, filterMethod, filterStatus, searchQuery]);

  const fetchAttendance = fetchAttendanceHistory;

  // ================= FETCH PROFILE =================
  const fetchProfile = useCallback(async () => {
    setProfileLoading(true);
    try {
      const data = await studentApi.getProfile();
      setProfileData(data);
    } catch (err) {
      console.warn('Profile fetch error:', err);
    } finally {
      setProfileLoading(false);
    }
  }, []);

  // Lifecycle fetches
  useEffect(() => {
    if (activeTab === 'dashboard') {
      fetchDashboard();
    } else if (activeTab === 'attendance' || activeTab === 'history') {
      fetchAttendanceHistory();
      fetchDashboard();
    } else if (activeTab === 'profile') {
      fetchProfile();
    }
  }, [activeTab, fetchDashboard, fetchAttendanceHistory, fetchProfile]);

  const displayName = profileData?.name || currentUser?.name || 'Student';
  const displayId = profileData?.id || currentUser?.student_id || currentUser?.id || '—';
  const displayClass = profileData?.class_name || currentUser?.class_name || 'B.Tech CSE';
  const displayDept = profileData?.department || institutionInfo?.college_name || 'Computer Science & Engineering';

  const availableSubjects = Array.from(new Set([
    ...(dashboardData?.subject_breakdown?.map(s => s.subject_name || s.code) || []),
    ...(attendanceRecords.map(r => r.subject) || []),
    'Microprocessor and Microcontroller',
    'Compiler Design',
    'Artificial Intelligence'
  ].filter(Boolean)));

  // Method badge helper
  const getMethodBadge = (method) => {
    switch (method?.toLowerCase()) {
      case 'fingerprint':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Fingerprint className="w-3.5 h-3.5 text-amber-600" />
            Fingerprint
          </span>
        );
      case 'face':
      case 'face recognition':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Camera className="w-3.5 h-3.5 text-emerald-600" />
            Face Recognition
          </span>
        );
      case 'rfid':
      case 'rfid / card':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
            RFID Card
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <BookOpen className="w-3.5 h-3.5 text-blue-600" />
            {method || 'Manual'}
          </span>
        );
    }
  };

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden font-sans">
      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/60 z-40 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-300 flex flex-col transition-transform duration-300 transform 
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Brand */}
        <div className="flex items-center justify-between h-16 px-6 bg-slate-950 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-xl text-white shadow-md shadow-blue-600/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight leading-none">
                {institutionInfo?.college_short_name || 'CampusSync'}
              </h2>
              <span className="text-[10px] font-semibold text-blue-400 uppercase tracking-wider">Student Portal</span>
            </div>
          </div>
          <button 
            onClick={() => setMobileMenuOpen(false)} 
            className="lg:hidden text-slate-400 hover:text-white p-1"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Student Mini Profile Info */}
        <div className="p-4 mx-4 my-4 bg-slate-800/60 rounded-xl border border-slate-700/50 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-md shrink-0">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div className="overflow-hidden">
            <h4 className="text-sm font-semibold text-white truncate">{displayName}</h4>
            <p className="text-xs text-slate-400 font-mono truncate">{displayId}</p>
          </div>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto">
          <button
            onClick={() => { setActiveTab('dashboard'); setMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'dashboard'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20 font-semibold'
                : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-200'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </button>

          <button
            onClick={() => { setActiveTab('attendance'); setMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'attendance'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20 font-semibold'
                : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-200'
            }`}
          >
            <CalendarCheck className="w-4 h-4" />
            My Attendance
          </button>

          <button
            onClick={() => { setActiveTab('history'); setMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'history'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20 font-semibold'
                : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-200'
            }`}
          >
            <History className="w-4 h-4" />
            Attendance History
          </button>

          <button
            onClick={() => { setActiveTab('profile'); setMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'profile'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20 font-semibold'
                : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-200'
            }`}
          >
            <User className="w-4 h-4" />
            Profile & Biometrics
          </button>
        </nav>

        {/* Sidebar Footer Logout */}
        <div className="p-4 border-t border-slate-800 shrink-0">
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-rose-300 bg-rose-950/30 hover:bg-rose-900/50 hover:text-rose-100 transition-colors border border-rose-900/30"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
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
              className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-bold text-slate-900 capitalize">
              {activeTab === 'dashboard' && 'Student Attendance Dashboard'}
              {activeTab === 'attendance' && 'My Attendance Summary'}
              {activeTab === 'history' && 'Attendance Log History'}
              {activeTab === 'profile' && 'Student Profile & Biometric Status'}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Multi-Modal Auth Active</span>
            </div>

            <div className="h-6 w-px bg-slate-200 hidden sm:block" />

            <div className="flex items-center gap-2.5">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200 font-mono">
                {profileData?.class || currentUser?.class || 'CSE'}
              </span>
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shadow-sm">
                {displayName.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable View Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-6">

          {/* ================= DASHBOARD VIEW ================= */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6 max-w-7xl mx-auto">
              
              {/* Dashboard Error State */}
              {dashboardError && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-rose-800">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                    <div>
                      <h4 className="font-bold text-sm">Error Loading Dashboard</h4>
                      <p className="text-xs text-rose-600">{dashboardError}</p>
                    </div>
                  </div>
                  <button
                    onClick={fetchDashboard}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-sm transition-colors shrink-0"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Retry
                  </button>
                </div>
              )}

              {/* Greeting Card */}
              <div className="bg-gradient-to-r from-blue-700 to-indigo-800 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight">Welcome, {displayName}</h2>
                    <p className="mt-1 text-blue-100 text-sm">
                      {profileData?.department || 'Department of Computer Science'} • {profileData?.year || 'Academic Year'} ({profileData?.class || 'Section'})
                    </p>
                  </div>
                  <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/20">
                    <Award className="w-6 h-6 text-amber-300 shrink-0" />
                    <div>
                      <div className="text-[11px] text-blue-200 uppercase tracking-wider font-semibold">Eligibility Status</div>
                      <div className="text-sm font-bold text-white">
                        {dashboardLoading ? (
                          <div className="h-4 w-24 bg-white/20 rounded animate-pulse" />
                        ) : (
                          dashboardData?.overall_attendance !== undefined
                            ? (dashboardData.overall_attendance >= 75 ? 'Eligible for Examinations' : 'Attendance Warning (< 75%)')
                            : 'Awaiting Records'
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Attendance Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {/* Overall Attendance */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Overall Attendance</p>
                    {dashboardLoading ? (
                      <div className="h-8 w-20 bg-slate-200 rounded mt-2 skeleton-shimmer" />
                    ) : (
                      <h3 className="text-3xl font-extrabold text-slate-900 mt-1">
                        {dashboardData?.overall_attendance !== undefined ? `${dashboardData.overall_attendance}%` : '—'}
                      </h3>
                    )}
                    <p className="text-xs text-slate-500 mt-1">Minimum required: 75%</p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center font-bold text-base shrink-0">
                    %
                  </div>
                </div>

                {/* Present Classes */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Classes Present</p>
                    {dashboardLoading ? (
                      <div className="h-8 w-16 bg-slate-200 rounded mt-2 skeleton-shimmer" />
                    ) : (
                      <h3 className="text-3xl font-extrabold text-emerald-600 mt-1">
                        {dashboardData?.present_classes !== undefined ? dashboardData.present_classes : '—'}
                      </h3>
                    )}
                    <p className="text-xs text-slate-500 mt-1">Verified sessions</p>
                  </div>
                  <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-200 shrink-0">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                </div>

                {/* Absent Classes */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Classes Missed</p>
                    {dashboardLoading ? (
                      <div className="h-8 w-16 bg-slate-200 rounded mt-2 skeleton-shimmer" />
                    ) : (
                      <h3 className="text-3xl font-extrabold text-rose-600 mt-1">
                        {dashboardData?.absent_classes !== undefined ? dashboardData.absent_classes : '—'}
                      </h3>
                    )}
                    <p className="text-xs text-slate-500 mt-1">Unattended sessions</p>
                  </div>
                  <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl border border-rose-200 shrink-0">
                    <XCircle className="w-6 h-6" />
                  </div>
                </div>

                {/* Total Classes */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Sessions</p>
                    {dashboardLoading ? (
                      <div className="h-8 w-16 bg-slate-200 rounded mt-2 skeleton-shimmer" />
                    ) : (
                      <h3 className="text-3xl font-extrabold text-slate-900 mt-1">
                        {dashboardData?.total_classes !== undefined ? dashboardData.total_classes : '—'}
                      </h3>
                    )}
                    <p className="text-xs text-slate-500 mt-1">Conducted to date</p>
                  </div>
                  <div className="p-3 bg-slate-100 text-slate-600 rounded-2xl border border-slate-200 shrink-0">
                    <BookOpen className="w-6 h-6" />
                  </div>
                </div>
              </div>

              {/* Subject Attendance Breakdown */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Subject-Wise Attendance Breakdown</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Performance tracked per enrolled course subject</p>
                  </div>
                  <button 
                    onClick={() => setActiveTab('attendance')} 
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    View All <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {dashboardLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map((n) => (
                      <div key={n} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                        <div className="h-4 w-32 bg-slate-200 rounded skeleton-shimmer" />
                        <div className="h-3 w-full bg-slate-200 rounded skeleton-shimmer" />
                        <div className="h-3 w-20 bg-slate-200 rounded skeleton-shimmer" />
                      </div>
                    ))}
                  </div>
                ) : dashboardData?.subject_breakdown?.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {dashboardData.subject_breakdown.map((item, idx) => (
                      <div key={idx} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 font-mono uppercase">{item.code || `SUB-0${idx + 1}`}</span>
                            <h4 className="text-sm font-bold text-slate-800 leading-tight">{item.subject_name || item.subject}</h4>
                          </div>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                            (item.percentage || item.pct || 0) >= 75 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {item.percentage || item.pct || 0}%
                          </span>
                        </div>

                        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              (item.percentage || item.pct || 0) >= 75 ? 'bg-emerald-500' : 'bg-amber-500'
                            }`} 
                            style={{ width: `${Math.min(100, item.percentage || item.pct || 0)}%` }} 
                          />
                        </div>

                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span>Attended: <strong>{item.present || 0}/{item.total || 0}</strong></span>
                          <span className="text-slate-400">Target: 75%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-500 text-xs">
                    <BookOpen className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                    <p className="font-semibold">No subject-wise attendance data recorded yet.</p>
                    <p className="text-slate-400 mt-0.5">Subject records will populate as sessions are conducted.</p>
                  </div>
                )}
              </div>

              {/* Recent Attendance Activity */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Recent Attendance Activity</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Logs synchronized from multi-modal campus terminals</p>
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
                      {dashboardLoading ? (
                        [1, 2, 3, 4].map((n) => (
                          <tr key={n}>
                            <td colSpan="5" className="py-3.5 px-6">
                              <div className="h-4 bg-slate-100 rounded skeleton-shimmer w-full" />
                            </td>
                          </tr>
                        ))
                      ) : dashboardData?.recent_records?.length > 0 ? (
                        dashboardData.recent_records.map((rec, idx) => (
                          <tr key={rec.id || idx} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3.5 px-6 font-medium text-slate-900 whitespace-nowrap">{rec.date}</td>
                            <td className="py-3.5 px-6 font-semibold text-slate-800">{rec.subject || rec.subject_name}</td>
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
                          <td colSpan="5" className="py-8 text-center text-slate-400 text-xs">
                            No recent attendance activity found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ================= MY ATTENDANCE & HISTORY VIEW ================= */}
          {(activeTab === 'attendance' || activeTab === 'history') && (
            <div className="space-y-6 max-w-7xl mx-auto">

              {/* Subject Breakdown Card (Shown prominently on My Attendance) */}
              {activeTab === 'attendance' && dashboardData?.subject_breakdown?.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">Enrolled Subjects & Attendance Percentages</h3>
                      <p className="text-xs text-slate-500 mt-0.5">Calculated from verified biometric and classroom roll calls</p>
                    </div>
                    <span className="text-xs font-semibold px-3 py-1 bg-blue-50 text-blue-700 rounded-full border border-blue-200">
                      Overall: {dashboardData?.overall_attendance ?? 0}%
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                    {dashboardData.subject_breakdown.map((item, idx) => (
                      <div key={idx} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 font-mono uppercase">{item.code || `SUB-0${idx + 1}`}</span>
                            <h4 className="text-sm font-bold text-slate-800 leading-tight">{item.subject_name || item.subject}</h4>
                          </div>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                            (item.percentage || item.pct || 0) >= 75 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {item.percentage || item.pct || 0}%
                          </span>
                        </div>

                        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              (item.percentage || item.pct || 0) >= 75 ? 'bg-emerald-500' : 'bg-rose-500'
                            }`} 
                            style={{ width: `${Math.min(100, item.percentage || item.pct || 0)}%` }} 
                          />
                        </div>

                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span>Attended: <strong>{item.present || 0}/{item.total || 0}</strong> classes</span>
                          <span className="text-slate-400">Min: 75%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Filter Controls Bar */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3 md:space-y-0 md:flex md:items-center md:justify-between gap-4">
                <div className="flex-1 relative">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input 
                    type="text"
                    placeholder="Search by subject, record ID, or date..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 bg-slate-50/50"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-slate-400" />
                    <span className="text-xs font-semibold text-slate-600">Subject:</span>
                    <select
                      value={filterSubject}
                      onChange={(e) => setFilterSubject(e.target.value)}
                      className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs bg-slate-50 font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 max-w-[180px] truncate"
                    >
                      <option value="All">All Subjects</option>
                      {availableSubjects.map((subj, idx) => (
                        <option key={idx} value={subj}>{subj}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-600">Method:</span>
                    <select
                      value={filterMethod}
                      onChange={(e) => setFilterMethod(e.target.value)}
                      className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs bg-slate-50 font-medium focus:outline-none focus:ring-2 focus:ring-blue-600"
                    >
                      <option value="All">All Methods</option>
                      <option value="RFID">RFID Card</option>
                      <option value="Fingerprint">Fingerprint</option>
                      <option value="Face Recognition">Face Recognition</option>
                      <option value="Manual">Manual</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-600">Status:</span>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs bg-slate-50 font-medium focus:outline-none focus:ring-2 focus:ring-blue-600"
                    >
                      <option value="All">All Statuses</option>
                      <option value="Present">Present</option>
                      <option value="Absent">Absent</option>
                      <option value="Late">Late</option>
                    </select>
                  </div>

                  <button
                    onClick={fetchAttendanceHistory}
                    className="p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors"
                    title="Refresh records"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Attendance Error State */}
              {attendanceError && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between text-xs text-rose-700">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{attendanceError}</span>
                  </div>
                  <button 
                    onClick={fetchAttendanceHistory}
                    className="px-3 py-1 bg-rose-600 text-white rounded-lg font-semibold hover:bg-rose-700 transition-colors"
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* Attendance Records Table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-800">
                    {activeTab === 'attendance' ? 'Session Attendance Records' : 'Full Historical Attendance Logs'}
                  </h4>
                  <span className="text-xs text-slate-400">
                    {attendanceRecords.length} record{attendanceRecords.length === 1 ? '' : 's'} found
                  </span>
                </div>

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
                      {attendanceLoading ? (
                        [1, 2, 3, 4, 5].map((n) => (
                          <tr key={n}>
                            <td colSpan="7" className="py-4 px-6">
                              <div className="h-4 bg-slate-100 rounded skeleton-shimmer w-full" />
                            </td>
                          </tr>
                        ))
                      ) : attendanceRecords.length > 0 ? (
                        attendanceRecords.map((rec) => {
                          const statusStr = String(rec.status || '').toUpperCase();
                          const isPresent = statusStr === 'PRESENT' || statusStr === 'ATTENDED';
                          const isLate = statusStr === 'LATE';

                          return (
                            <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-3.5 px-6 font-mono text-xs text-slate-400">{rec.id}</td>
                              <td className="py-3.5 px-6 font-medium text-slate-900 whitespace-nowrap">{rec.date}</td>
                              <td className="py-3.5 px-6 font-semibold text-slate-800">{rec.subject}</td>
                              <td className="py-3.5 px-6 text-slate-500 text-xs font-medium">{rec.className || rec.class_name || 'CSE-3A'}</td>
                              <td className="py-3.5 px-6 whitespace-nowrap">{getMethodBadge(rec.method)}</td>
                              <td className="py-3.5 px-6 text-slate-500 font-mono text-xs whitespace-nowrap">{rec.time}</td>
                              <td className="py-3.5 px-6 whitespace-nowrap">
                                {isPresent ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> Present
                                  </span>
                                ) : isLate ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                                    <Clock className="w-3.5 h-3.5" /> Late
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
                                    <XCircle className="w-3.5 h-3.5" /> Absent
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan="7" className="py-12 text-center text-slate-500 text-xs">
                            <Calendar className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                            <p className="font-semibold text-sm text-slate-700">No attendance records found</p>
                            <p className="text-slate-400 mt-1">No attendance entries match your current search and filter criteria.</p>
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
              
              {/* Profile Error */}
              {profileError && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between text-xs text-rose-700">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{profileError}</span>
                  </div>
                  <button 
                    onClick={fetchProfile}
                    className="px-3 py-1 bg-rose-600 text-white rounded-lg font-semibold hover:bg-rose-700 transition-colors"
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* Profile Main Card */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-8 space-y-6">
                {profileLoading ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="w-20 h-20 bg-slate-200 rounded-full skeleton-shimmer" />
                      <div className="space-y-2">
                        <div className="h-6 w-48 bg-slate-200 rounded skeleton-shimmer" />
                        <div className="h-4 w-32 bg-slate-200 rounded skeleton-shimmer" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-4">
                      {[1, 2, 3, 4].map(n => (
                        <div key={n} className="h-12 bg-slate-100 rounded-xl skeleton-shimmer" />
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 border-b border-slate-100 pb-6">
                      <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-extrabold text-3xl shadow-xl ring-4 ring-blue-50 shrink-0">
                        {displayName.charAt(0).toUpperCase()}
                      </div>
                      <div className="text-center sm:text-left space-y-1">
                        <h2 className="text-2xl font-extrabold text-slate-900">{displayName}</h2>
                        <p className="text-sm font-semibold text-blue-600 font-mono">{displayId}</p>
                        <p className="text-xs text-slate-500 font-medium">
                          {profileData?.course || 'B.Tech CSE'} • {profileData?.year || '3rd Year'} ({profileData?.class || 'Section A'})
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
                      <div className="space-y-1">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Full Name</span>
                        <p className="font-semibold text-slate-800">{displayName}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Student ID Number</span>
                        <p className="font-semibold font-mono text-slate-800">{displayId}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Department</span>
                        <p className="font-semibold text-slate-800">{displayDept}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Year & Section</span>
                        <p className="font-semibold text-slate-800">
                          {profileData?.year || '3rd Year'} • {profileData?.class || 'CSE-3A'}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Institutional Email</span>
                        <p className="font-semibold text-slate-800">{profileData?.email || currentUser?.email || '—'}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Contact Phone</span>
                        <p className="font-semibold text-slate-800">{profileData?.phone || currentUser?.phone || '—'}</p>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Biometrics & Hardware Registration Status */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-8 space-y-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Enrolled Multi-Modal Biometric Identifiers</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Hardware authorization credentials linked to your Student Profile</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Fingerprint */}
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-3">
                    <div className="p-2.5 bg-amber-100 text-amber-700 rounded-lg shrink-0">
                      <Fingerprint className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">Fingerprint Sensor</h4>
                      <span className={`inline-flex items-center gap-1 text-xs font-bold mt-1 ${
                        profileData?.biometrics?.fingerprint || profileData?.fingerprint_status === 'Enrolled'
                          ? 'text-emerald-700'
                          : 'text-slate-500'
                      }`}>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {profileData?.biometrics?.fingerprint ? 'Enrolled & Verified' : 'Status: Backend Pending'}
                      </span>
                    </div>
                  </div>

                  {/* Face Recognition */}
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-3">
                    <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-lg shrink-0">
                      <Camera className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">Face Recognition</h4>
                      <span className={`inline-flex items-center gap-1 text-xs font-bold mt-1 ${
                        profileData?.biometrics?.face || profileData?.face_status === 'Enrolled'
                          ? 'text-emerald-700'
                          : 'text-slate-500'
                      }`}>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {profileData?.biometrics?.face ? 'Feature Vector Active' : 'Status: Backend Pending'}
                      </span>
                    </div>
                  </div>

                  {/* RFID Card */}
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-3">
                    <div className="p-2.5 bg-indigo-100 text-indigo-700 rounded-lg shrink-0">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">RFID Smart Card</h4>
                      <span className={`inline-flex items-center gap-1 text-xs font-bold mt-1 ${
                        profileData?.biometrics?.rfid || profileData?.rfid_uid
                          ? 'text-emerald-700'
                          : 'text-slate-500'
                      }`}>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {profileData?.biometrics?.rfid ? 'Card UID Linked' : 'Status: Backend Pending'}
                      </span>
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
