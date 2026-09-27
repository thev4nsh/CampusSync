import React, { useState, useEffect, useCallback } from 'react';
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
  Users,
  Check,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  Radio,
  StopCircle,
  Calendar,
  Layers,
  Loader2
} from 'lucide-react';
import { teacherApi, ApiError } from './api';

export default function Teacher({ currentUser, onLogout, showToast, institutionInfo }) {
  const [activeTab, setActiveTab] = useState('take-attendance');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // ================= TEACHER DASHBOARD STATE =================
  const [dashboardData, setDashboardData] = useState(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState(null);

  // ================= CLASSES & SUBJECTS STATE =================
  const [classesList, setClassesList] = useState([]);
  const [classesLoading, setClassesLoading] = useState(false);
  const [selectedClass, setSelectedClass] = useState('');
  const [subjectsList, setSubjectsList] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // ================= TAKE ATTENDANCE SESSION STATE =================
  const [activeSession, setActiveSession] = useState(null); // { id, class_name, subject_name, start_time, status }
  const [sessionStarting, setSessionStarting] = useState(false);
  const [sessionError, setSessionError] = useState(null);
  const [liveAttendanceLogs, setLiveAttendanceLogs] = useState([]);
  const [livePollingActive, setLivePollingActive] = useState(true);
  const [isEndingSession, setIsEndingSession] = useState(false);

  // ================= MANUAL ATTENDANCE ROSTER STATE =================
  const [attendanceMode, setAttendanceMode] = useState('terminal'); // 'terminal' | 'manual'
  const [rosterStudents, setRosterStudents] = useState([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [rosterError, setRosterError] = useState(null);
  const [manualSaving, setManualSaving] = useState(false);

  // ================= ATTENDANCE RECORDS STATE =================
  const [recordsList, setRecordsList] = useState([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [recordsError, setRecordsError] = useState(null);
  const [filterClass, setFilterClass] = useState('All');
  const [filterSubject, setFilterSubject] = useState('All');
  const [filterMethod, setFilterMethod] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // ================= REPORTS & PROFILE STATE =================
  const [reportsData, setReportsData] = useState(null);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);

  // ================= STUDENTS DIRECTORY & CALENDAR STATE =================
  const [allStudentsList, setAllStudentsList] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentClassFilter, setStudentClassFilter] = useState('All');
  const [studentSearch, setStudentSearch] = useState('');
  const [recordsViewMode, setRecordsViewMode] = useState('list'); // 'list' | 'calendar'
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(null);
  const [exportingCsv, setExportingCsv] = useState(false);

  const loadAllStudents = useCallback(async () => {
    setStudentsLoading(true);
    try {
      const data = await teacherApi.getAllStudents();
      setAllStudentsList(Array.isArray(data) ? data : (data?.students || []));
    } catch (err) {
      console.warn('Failed to load all students for teacher:', err);
    } finally {
      setStudentsLoading(false);
    }
  }, []);

  const handleExportTeacherCsv = async () => {
    setExportingCsv(true);
    try {
      if (showToast) showToast('Preparing faculty attendance CSV report...', 'info');
      await teacherApi.downloadAttendanceCsv();
      if (showToast) showToast('Faculty attendance report downloaded successfully!', 'success');
    } catch (err) {
      if (showToast) showToast(err.message || 'Failed to download attendance report.', 'warning');
    } finally {
      setExportingCsv(false);
    }
  };

  // ================= LOAD MANUAL ROSTER =================
  const loadClassRoster = useCallback(async (classId) => {
    if (!classId) return;
    setRosterLoading(true);
    setRosterError(null);
    try {
      const data = await teacherApi.getClassStudents(classId);
      const list = Array.isArray(data) ? data : (data?.students || []);
      setRosterStudents(list.map(s => ({
        ...s,
        status: null, // default unmarked
      })));
    } catch (err) {
      setRosterError(err.message || 'Unable to load class students roster.');
    } finally {
      setRosterLoading(false);
    }
  }, []);

  // ================= LOAD CLASSES & SUBJECTS =================
  const loadClassesAndSubjects = useCallback(async () => {
    setClassesLoading(true);
    try {
      const classes = await teacherApi.getClasses();
      const loadedClasses = Array.isArray(classes) ? classes : (classes?.classes || []);
      setClassesList(loadedClasses);

      if (loadedClasses.length > 0) {
        const initialClass = loadedClasses[0].name || loadedClasses[0].id || 'CSE-3A';
        setSelectedClass(initialClass);
        loadClassRoster(initialClass);
        
        // Fetch subjects for initial class
        const subjects = await teacherApi.getSubjects(initialClass);
        const loadedSubjects = Array.isArray(subjects) ? subjects : (subjects?.subjects || []);
        setSubjectsList(loadedSubjects);
        if (loadedSubjects.length > 0) {
          setSelectedSubject(loadedSubjects[0].name || loadedSubjects[0].id);
        }
      }
    } catch (err) {
      console.warn('Backend classes API unreachable, defaulting state:', err);
    } finally {
      setClassesLoading(false);
    }
  }, [loadClassRoster]);

  // Class selection change handler
  const handleClassChange = async (classId) => {
    setSelectedClass(classId);
    loadClassRoster(classId);
    try {
      const subjects = await teacherApi.getSubjects(classId);
      const loadedSubjects = Array.isArray(subjects) ? subjects : (subjects?.subjects || []);
      setSubjectsList(loadedSubjects);
      if (loadedSubjects.length > 0) {
        setSelectedSubject(loadedSubjects[0].name || loadedSubjects[0].id);
      }
    } catch (err) {
      console.warn('Failed to load subjects for class:', err);
    }
  };

  // ================= LOAD DASHBOARD =================
  const loadDashboard = useCallback(async () => {
    setDashboardLoading(true);
    setDashboardError(null);
    try {
      const data = await teacherApi.getDashboard();
      setDashboardData(data);
    } catch (err) {
      setDashboardError(err.message || 'Unable to load teacher dashboard from backend.');
    } finally {
      setDashboardLoading(false);
    }
  }, []);

  // ================= LOAD ATTENDANCE RECORDS =================
  const loadRecords = useCallback(async () => {
    setRecordsLoading(true);
    setRecordsError(null);
    try {
      const filters = {};
      if (filterClass !== 'All') filters.class_name = filterClass;
      if (filterSubject !== 'All') filters.subject = filterSubject;
      if (filterMethod !== 'All') filters.method = filterMethod;
      if (filterStatus !== 'All') filters.status = filterStatus;
      if (searchQuery.trim()) filters.search = searchQuery.trim();

      const data = await teacherApi.getAttendanceRecords(filters);
      setRecordsList(Array.isArray(data) ? data : (data?.records || []));
    } catch (err) {
      setRecordsError(err.message || 'Unable to load attendance records.');
    } finally {
      setRecordsLoading(false);
    }
  }, [filterClass, filterSubject, filterMethod, filterStatus, searchQuery]);

  // ================= LOAD REPORTS =================
  const loadReports = useCallback(async () => {
    setReportsLoading(true);
    try {
      const data = await teacherApi.getReports();
      setReportsData(data);
    } catch (err) {
      console.warn('Reports fetch failed:', err);
    } finally {
      setReportsLoading(false);
    }
  }, []);

  // ================= LOAD PROFILE =================
  const loadProfile = useCallback(async () => {
    setProfileLoading(true);
    try {
      const data = await teacherApi.getProfile();
      setProfileData(data);
    } catch (err) {
      console.warn('Profile fetch failed:', err);
    } finally {
      setProfileLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadClassesAndSubjects();
  }, [loadClassesAndSubjects]);

  useEffect(() => {
    if (activeTab === 'dashboard') loadDashboard();
    else if (activeTab === 'records') loadRecords();
    else if (activeTab === 'students') loadAllStudents();
    else if (activeTab === 'classes') loadClassesAndSubjects();
    else if (activeTab === 'reports') loadReports();
    else if (activeTab === 'profile') loadProfile();
  }, [activeTab, loadDashboard, loadRecords, loadAllStudents, loadClassesAndSubjects, loadReports, loadProfile]);

  // When switching to manual attendance, load students for current class
  useEffect(() => {
    if (activeTab === 'take-attendance' && attendanceMode === 'manual' && selectedClass) {
      loadClassRoster(selectedClass);
    }
  }, [activeTab, attendanceMode, selectedClass, loadClassRoster]);

  // ================= SESSION START =================
  const handleStartSession = async (e) => {
    e.preventDefault();
    setSessionStarting(true);
    setSessionError(null);

    try {
      const result = await teacherApi.startSession({
        classId: selectedClass || 'CSE-3A',
        subjectId: selectedSubject || 'Database Systems',
        date: selectedDate,
      });

      const sessionObj = {
        id: result?.session_id || result?.id || `SES-${Date.now().toString().slice(-6)}`,
        class_name: selectedClass,
        subject_name: selectedSubject,
        start_time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'Active',
      };

      setActiveSession(sessionObj);
      setLiveAttendanceLogs([]);
      if (showToast) showToast(`Live Attendance Session started for ${selectedClass}!`, 'success');
    } catch (err) {
      setSessionError(err.message || 'Unable to connect with FastAPI backend to start session.');
      if (showToast) showToast('Session start request failed. Check server status.', 'warning');
    } finally {
      setSessionStarting(false);
    }
  };

  // ================= SESSION END =================
  const handleEndSession = async () => {
    if (!activeSession) return;
    setIsEndingSession(true);
    try {
      await teacherApi.endSession(activeSession.id);
      if (showToast) showToast(`Attendance session ${activeSession.id} closed and saved.`, 'info');
    } catch (err) {
      console.warn('Session end notification:', err);
    } finally {
      setActiveSession(null);
      setIsEndingSession(false);
    }
  };

  // ================= LIVE POLLING FOR SESSION LOGS =================
  useEffect(() => {
    let timer = null;
    if (activeSession && livePollingActive) {
      const pollLogs = async () => {
        try {
          const logs = await teacherApi.getSessionAttendance(activeSession.id);
          if (Array.isArray(logs)) {
            setLiveAttendanceLogs(logs);
          } else if (logs?.records) {
            setLiveAttendanceLogs(logs.records);
          }
        } catch {
          // Backend is offline or no logs yet; clean handling without spam
        }
      };

      pollLogs();
      timer = setInterval(pollLogs, 3000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [activeSession, livePollingActive]);

  // ================= MANUAL ATTENDANCE TOGGLE & SUBMIT =================
  const handleSetStudentStatus = (studentId, status) => {
    setRosterStudents(prev => prev.map(s => {
      if (s.id === studentId || s.student_id === studentId) {
        return {
          ...s,
          status: s.status === status ? null : status,
        };
      }
      return s;
    }));
  };

  const handleMarkAllStatus = (status) => {
    setRosterStudents(prev => prev.map(s => ({
      ...s,
      status: status,
    })));
  };

  const handleToggleManualStatus = (studentId) => {
    setRosterStudents(prev => prev.map(s => {
      if (s.id === studentId || s.student_id === studentId) {
        const next = s.status === 'Present' ? 'Absent' : (s.status === 'Absent' ? 'Late' : 'Present');
        return {
          ...s,
          status: next,
        };
      }
      return s;
    }));
  };

  const handleSaveManualAttendance = async () => {
    const markedStudents = rosterStudents.filter(s => s.status);
    if (markedStudents.length === 0) {
      if (showToast) {
        showToast('Please mark attendance (Present / Absent / Late) for at least one student before saving.', 'warning');
      }
      return;
    }
    setManualSaving(true);

    try {
      const res = await teacherApi.submitManualAttendance({
        sessionId: activeSession?.id || null,
        classId: selectedClass,
        subjectId: selectedSubject,
        date: selectedDate,
        records: markedStudents.map(s => ({
          student_id: s.id || s.student_id,
          student_name: s.name,
          status: String(s.status).toUpperCase(),
        })),
      });

      if (showToast) {
        showToast(res?.message || `Saved manual roll call for ${markedStudents.length} students in ${selectedClass}!`, 'success');
      }
      loadDashboard();
      loadRecords();
    } catch (err) {
      if (showToast) {
        showToast(err.message || 'Failed to submit manual attendance to backend', 'warning');
      }
    } finally {
      setManualSaving(false);
    }
  };

  // Helper for method badge
  const getMethodBadge = (method) => {
    switch (method?.toLowerCase()) {
      case 'fingerprint':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Fingerprint className="w-3.5 h-3.5 text-amber-600" /> Fingerprint
          </span>
        );
      case 'face':
      case 'face recognition':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Camera className="w-3.5 h-3.5 text-emerald-600" /> Face Recognition
          </span>
        );
      case 'rfid':
      case 'rfid / card':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <CreditCard className="w-3.5 h-3.5 text-indigo-600" /> RFID Card
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <BookOpen className="w-3.5 h-3.5 text-blue-600" /> Manual
          </span>
        );
    }
  };

  const displayName = profileData?.name || currentUser?.name || 'Faculty Member';
  const displayDept = profileData?.department || currentUser?.department || 'Department of Computer Science';

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
              <span className="text-[10px] font-semibold text-blue-400 uppercase tracking-wider">Teacher Portal</span>
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

        {/* Teacher Mini Profile Info */}
        <div className="p-4 mx-4 my-4 bg-slate-800/60 rounded-xl border border-slate-700/50 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-md shrink-0">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div className="overflow-hidden">
            <h4 className="text-sm font-semibold text-white truncate">{displayName}</h4>
            <p className="text-xs text-slate-400 truncate">{displayDept}</p>
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
            onClick={() => { setActiveTab('take-attendance'); setMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'take-attendance'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20 font-semibold'
                : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-200'
            }`}
          >
            <UserCheck className="w-4 h-4 text-emerald-400" />
            Take Attendance
          </button>

          <button
            onClick={() => { setActiveTab('records'); setMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'records'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20 font-semibold'
                : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-200'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            Attendance Records
          </button>

          <button
            onClick={() => { setActiveTab('students'); setMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'students'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20 font-semibold'
                : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4 text-sky-400" />
            Student Roster
          </button>

          <button
            onClick={() => { setActiveTab('classes'); setMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'classes'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20 font-semibold'
                : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            My Classes
          </button>

          <button
            onClick={() => { setActiveTab('reports'); setMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'reports'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20 font-semibold'
                : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-200'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Reports
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
            Profile
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
              {activeTab === 'dashboard' && 'Faculty Attendance Dashboard'}
              {activeTab === 'take-attendance' && 'Multi-Modal Attendance Terminal'}
              {activeTab === 'records' && 'Class Attendance Records'}
              {activeTab === 'classes' && 'Assigned Classes & Batches'}
              {activeTab === 'reports' && 'Attendance Reports & Analytics'}
              {activeTab === 'profile' && 'Faculty Profile'}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('take-attendance')}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors shadow-sm"
            >
              <UserCheck className="w-4 h-4" /> 
              <span>Session Terminal</span>
            </button>
            <div className="h-6 w-px bg-slate-200 hidden sm:block" />
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                Faculty
              </span>
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shadow-sm">
                {displayName.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable View Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-6">

          {/* ================= TEACHER DASHBOARD ================= */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6 max-w-7xl mx-auto">
              
              {dashboardError && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between text-xs text-rose-700">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{dashboardError}</span>
                  </div>
                  <button onClick={loadDashboard} className="px-3 py-1 bg-rose-600 text-white rounded-lg font-semibold hover:bg-rose-700">
                    Retry
                  </button>
                </div>
              )}

              {/* Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Today's Classes</p>
                    {dashboardLoading ? (
                      <div className="h-8 w-16 bg-slate-200 rounded mt-2 skeleton-shimmer" />
                    ) : (
                      <h3 className="text-3xl font-extrabold text-slate-900 mt-1">
                        {dashboardData?.todays_classes !== undefined ? dashboardData.todays_classes : '—'}
                      </h3>
                    )}
                    <p className="text-xs text-blue-600 font-medium mt-1">Scheduled sessions</p>
                  </div>
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl border border-blue-200 shrink-0">
                    <BookOpen className="w-6 h-6" />
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Enrolled</p>
                    {dashboardLoading ? (
                      <div className="h-8 w-16 bg-slate-200 rounded mt-2 skeleton-shimmer" />
                    ) : (
                      <h3 className="text-3xl font-extrabold text-slate-900 mt-1">
                        {dashboardData?.total_students !== undefined ? dashboardData.total_students : '—'}
                      </h3>
                    )}
                    <p className="text-xs text-slate-500 mt-1">Across assigned batches</p>
                  </div>
                  <div className="p-3 bg-slate-100 text-slate-600 rounded-2xl border border-slate-200 shrink-0">
                    <Users className="w-6 h-6" />
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Present Today</p>
                    {dashboardLoading ? (
                      <div className="h-8 w-16 bg-slate-200 rounded mt-2 skeleton-shimmer" />
                    ) : (
                      <h3 className="text-3xl font-extrabold text-emerald-600 mt-1">
                        {dashboardData?.present_today !== undefined ? dashboardData.present_today : '—'}
                      </h3>
                    )}
                    <p className="text-xs text-emerald-600 font-medium mt-1">
                      {dashboardData?.attendance_rate ? `${dashboardData.attendance_rate}% average` : 'Live synchronized'}
                    </p>
                  </div>
                  <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-200 shrink-0">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Absent Today</p>
                    {dashboardLoading ? (
                      <div className="h-8 w-16 bg-slate-200 rounded mt-2 skeleton-shimmer" />
                    ) : (
                      <h3 className="text-3xl font-extrabold text-rose-600 mt-1">
                        {dashboardData?.absent_today !== undefined ? dashboardData.absent_today : '—'}
                      </h3>
                    )}
                    <p className="text-xs text-slate-500 mt-1">Recorded absentees</p>
                  </div>
                  <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl border border-rose-200 shrink-0">
                    <XCircle className="w-6 h-6" />
                  </div>
                </div>
              </div>

              {/* Quick Actions & Schedule */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Today's Class Schedule</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Faculty course roster and attendance readiness</p>
                  </div>
                  <button 
                    onClick={() => setActiveTab('take-attendance')}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-md transition-all flex items-center gap-1.5"
                  >
                    <UserCheck className="w-4 h-4" /> Start Live Terminal
                  </button>
                </div>

                {dashboardLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[1, 2].map(n => (
                      <div key={n} className="h-20 bg-slate-100 rounded-xl skeleton-shimmer" />
                    ))}
                  </div>
                ) : dashboardData?.schedule?.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {dashboardData.schedule.map((item, idx) => (
                      <div key={idx} className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-3 bg-blue-600 text-white rounded-xl font-bold text-xs font-mono">
                            {item.time || '09:00 AM'}
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-800 text-sm">{item.subject_name || item.subject}</h4>
                            <p className="text-xs text-slate-500 font-medium">{item.class_name || item.class} • {item.room || 'Lecture Hall'}</p>
                          </div>
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          item.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {item.status || 'Scheduled'}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-500 text-xs">
                    <Calendar className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                    <p className="font-semibold text-sm text-slate-700">No scheduled sessions for today</p>
                    <p className="text-slate-400 mt-0.5">Use "Take Attendance" to launch an on-demand session.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================= TAKE ATTENDANCE (REAL TERMINAL WORKFLOW) ================= */}
          {activeTab === 'take-attendance' && (
            <div className="space-y-6 max-w-7xl mx-auto">
              
              {/* Session Setup Card */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Attendance Session Configuration</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Configure class, subject, and terminal mode</p>
                  </div>

                  {/* Mode Selector */}
                  <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setAttendanceMode('terminal')}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        attendanceMode === 'terminal'
                          ? 'bg-white text-blue-700 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Multi-Modal Hardware Terminal
                    </button>
                    <button
                      type="button"
                      onClick={() => setAttendanceMode('manual')}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        attendanceMode === 'manual'
                          ? 'bg-white text-blue-700 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Manual Roll Call
                    </button>
                  </div>
                </div>

                <form onSubmit={handleStartSession} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                      Target Class
                    </label>
                    <select
                      value={selectedClass}
                      onChange={(e) => handleClassChange(e.target.value)}
                      disabled={Boolean(activeSession)}
                      className="w-full border border-slate-300 rounded-xl p-2.5 text-sm font-semibold bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:opacity-60"
                    >
                      {classesList.length > 0 ? (
                        classesList.map((c) => (
                          <option key={c.id || c.name} value={c.name || c.id}>
                            {c.name} {c.section ? `(Sec ${c.section})` : ''}
                          </option>
                        ))
                      ) : (
                        <>
                          <option value="CSE-3A">CSE-3A (3rd Year, Sec A)</option>
                          <option value="CSE-3B">CSE-3B (3rd Year, Sec B)</option>
                          <option value="IT-3A">IT-3A (3rd Year, Sec A)</option>
                        </>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                      Course Subject
                    </label>
                    <select
                      value={selectedSubject}
                      onChange={(e) => setSelectedSubject(e.target.value)}
                      disabled={Boolean(activeSession)}
                      className="w-full border border-slate-300 rounded-xl p-2.5 text-sm font-semibold bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:opacity-60"
                    >
                      {subjectsList.length > 0 ? (
                        subjectsList.map((s) => (
                          <option key={s.id || s.name} value={s.name || s.id}>
                            {s.name} {s.code ? `(${s.code})` : ''}
                          </option>
                        ))
                      ) : (
                        <>
                          <option value="Database Systems">Database Systems (CS302)</option>
                          <option value="Data Structures">Data Structures (CS301)</option>
                          <option value="Operating Systems">Operating Systems (CS303)</option>
                          <option value="Computer Networks">Computer Networks (CS304)</option>
                        </>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                      Session Date
                    </label>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      disabled={Boolean(activeSession)}
                      className="w-full border border-slate-300 rounded-xl p-2.5 text-sm font-semibold bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:opacity-60"
                    />
                  </div>

                  {!activeSession && attendanceMode === 'terminal' && (
                    <div className="sm:col-span-3 pt-2">
                      <button
                        type="submit"
                        disabled={sessionStarting}
                        className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-75"
                      >
                        {sessionStarting ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Starting Backend Session...</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4" />
                            <span>Start Attendance Session</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </form>

                {sessionError && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>{sessionError}</span>
                  </div>
                )}
              </div>

              {/* ================= HARDWARE TERMINAL WAITING INTERFACE (NO SIMULATION) ================= */}
              {attendanceMode === 'terminal' && activeSession && (
                <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 lg:p-8 text-white shadow-2xl space-y-6">
                  {/* Session Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                      <div>
                        <span className="text-xs font-mono text-emerald-400 font-bold uppercase tracking-wider">
                          Session Active • ID: {activeSession.id}
                        </span>
                        <h4 className="text-base font-bold text-white">
                          {activeSession.subject_name} ({activeSession.class_name})
                        </h4>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-slate-400">
                        Started: {activeSession.start_time}
                      </span>
                      <button
                        onClick={handleEndSession}
                        disabled={isEndingSession}
                        className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
                      >
                        <StopCircle className="w-4 h-4" />
                        {isEndingSession ? 'Ending...' : 'End Session'}
                      </button>
                    </div>
                  </div>

                  {/* Real Live Hardware Waiting Cards */}
                  <div>
                    <h5 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                      Connected Multi-Modal Terminal Hardware Network
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      
                      {/* RFID Device Terminal */}
                      <div className="p-4 bg-slate-800/80 rounded-xl border border-indigo-500/30 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-indigo-400">
                            <CreditCard className="w-4 h-4" />
                            <span className="font-bold text-xs uppercase tracking-wider">RFID Reader</span>
                          </div>
                          <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                        </div>
                        <p className="text-xs text-slate-300 font-mono">
                          Status: Waiting for card reader tap...
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Hardware posts to: <span className="font-mono text-slate-400">/attendance/rfid</span>
                        </p>
                      </div>

                      {/* Fingerprint Terminal */}
                      <div className="p-4 bg-slate-800/80 rounded-xl border border-amber-500/30 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-amber-400">
                            <Fingerprint className="w-4 h-4" />
                            <span className="font-bold text-xs uppercase tracking-wider">Fingerprint Sensor</span>
                          </div>
                          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                        </div>
                        <p className="text-xs text-slate-300 font-mono">
                          Status: Waiting for biometric terminal...
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Hardware posts to: <span className="font-mono text-slate-400">/attendance/fingerprint</span>
                        </p>
                      </div>

                      {/* Face Recognition Terminal */}
                      <div className="p-4 bg-slate-800/80 rounded-xl border border-emerald-500/30 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-emerald-400">
                            <Camera className="w-4 h-4" />
                            <span className="font-bold text-xs uppercase tracking-wider">Face Recognition</span>
                          </div>
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        </div>
                        <p className="text-xs text-slate-300 font-mono">
                          Status: Waiting for recognition stream...
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Camera service posts to: <span className="font-mono text-slate-400">/attendance/face</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Real Live Attendance Feed Table */}
                  <div className="bg-slate-950/60 rounded-xl border border-slate-800 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                        <h5 className="text-xs font-bold text-white uppercase tracking-wider">
                          Real-Time Synchronized Attendance Stream
                        </h5>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span>Live Sync:</span>
                        <button
                          type="button"
                          onClick={() => setLivePollingActive(!livePollingActive)}
                          className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            livePollingActive ? 'bg-emerald-950 text-emerald-300 border border-emerald-700' : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {livePollingActive ? 'Active (Polling)' : 'Paused'}
                        </button>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                            <th className="py-2.5 px-4">Student</th>
                            <th className="py-2.5 px-4">ID Number</th>
                            <th className="py-2.5 px-4">Timestamp</th>
                            <th className="py-2.5 px-4">Authentication Method</th>
                            <th className="py-2.5 px-4">Verification Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 text-xs">
                          {liveAttendanceLogs.length > 0 ? (
                            liveAttendanceLogs.map((entry, idx) => (
                              <tr key={entry.id || idx} className="hover:bg-slate-900/50">
                                <td className="py-3 px-4 font-bold text-white">{entry.student_name || entry.studentName}</td>
                                <td className="py-3 px-4 font-mono text-slate-400">{entry.student_id || entry.studentId}</td>
                                <td className="py-3 px-4 font-mono text-slate-400">{entry.time}</td>
                                <td className="py-3 px-4">{getMethodBadge(entry.method)}</td>
                                <td className="py-3 px-4">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> Present
                                  </span>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="5" className="py-10 text-center text-slate-500 font-mono text-xs">
                                Waiting for device scan entries from FastAPI backend...
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ================= MANUAL ROLL CALL MODE ================= */}
              {attendanceMode === 'manual' && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-slate-900">
                          Manual Roll Call: {selectedClass || 'Select Class'}
                        </h3>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                          {selectedSubject || 'Subject'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Mark attendance for each student. Unmarked students remain unrecorded until selected.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleMarkAllStatus('Present')}
                        className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Mark All Present
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMarkAllStatus('Absent')}
                        className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Mark All Absent
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMarkAllStatus(null)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl transition-all"
                      >
                        Reset / Unmark All
                      </button>
                      <button
                        onClick={handleSaveManualAttendance}
                        disabled={manualSaving || rosterStudents.filter(s => s.status).length === 0}
                        className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50 ml-auto sm:ml-0"
                      >
                        {manualSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        <span>Save Roll Call ({rosterStudents.filter(s => s.status).length}/{rosterStudents.length})</span>
                      </button>
                    </div>
                  </div>

                  {/* Summary Counters */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Total Roster</span>
                      <span className="text-xl font-black text-slate-800">{rosterStudents.length}</span>
                    </div>
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                      <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider block">Marked Present</span>
                      <span className="text-xl font-black text-emerald-700">
                        {rosterStudents.filter(s => s.status === 'Present').length}
                      </span>
                    </div>
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-center">
                      <span className="text-[11px] font-semibold text-rose-700 uppercase tracking-wider block">Marked Absent</span>
                      <span className="text-xl font-black text-rose-700">
                        {rosterStudents.filter(s => s.status === 'Absent').length}
                      </span>
                    </div>
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-center">
                      <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider block">Unmarked</span>
                      <span className="text-xl font-black text-amber-700">
                        {rosterStudents.filter(s => !s.status).length}
                      </span>
                    </div>
                  </div>

                  {rosterError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{rosterError}</span>
                    </div>
                  )}

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                          <th className="py-3 px-4">Student ID</th>
                          <th className="py-3 px-4">Student Name</th>
                          <th className="py-3 px-4">Current Status</th>
                          <th className="py-3 px-4">Attendance Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm">
                        {rosterLoading ? (
                          [1, 2, 3, 4].map(n => (
                            <tr key={n}>
                              <td colSpan="4" className="py-3.5 px-4">
                                <div className="h-4 bg-slate-100 rounded skeleton-shimmer w-full" />
                              </td>
                            </tr>
                          ))
                        ) : rosterStudents.length > 0 ? (
                          rosterStudents.map((st) => {
                            const isPresent = st.status === 'Present';
                            const isAbsent = st.status === 'Absent';
                            const isLate = st.status === 'Late';

                            return (
                              <tr key={st.id || st.student_id} className="hover:bg-slate-50">
                                <td className="py-3 px-4 font-mono text-xs text-slate-600 font-semibold">{st.id || st.student_id}</td>
                                <td className="py-3 px-4 font-bold text-slate-800">{st.name}</td>
                                <td className="py-3 px-4">
                                  {isPresent && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                                      <CheckCircle2 className="w-3.5 h-3.5" /> Present
                                    </span>
                                  )}
                                  {isAbsent && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
                                      <XCircle className="w-3.5 h-3.5" /> Absent
                                    </span>
                                  )}
                                  {isLate && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                                      <Clock className="w-3.5 h-3.5" /> Late
                                    </span>
                                  )}
                                  {!st.status && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
                                      ⚪ Not Marked
                                    </span>
                                  )}
                                </td>
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => handleSetStudentStatus(st.id || st.student_id, 'Present')}
                                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                                        isPresent
                                          ? 'bg-emerald-600 text-white shadow-md'
                                          : 'bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'
                                      }`}
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5" /> Present
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleSetStudentStatus(st.id || st.student_id, 'Absent')}
                                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                                        isAbsent
                                          ? 'bg-rose-600 text-white shadow-md'
                                          : 'bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-700'
                                      }`}
                                    >
                                      <XCircle className="w-3.5 h-3.5" /> Absent
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleSetStudentStatus(st.id || st.student_id, 'Late')}
                                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                                        isLate
                                          ? 'bg-amber-600 text-white shadow-md'
                                          : 'bg-slate-100 text-slate-600 hover:bg-amber-50 hover:text-amber-700'
                                      }`}
                                    >
                                      <Clock className="w-3.5 h-3.5" /> Late
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan="4" className="py-8 text-center text-slate-500 text-xs">
                              No students found in this class roster.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================= ATTENDANCE RECORDS ================= */}
          {activeTab === 'records' && (
            <div className="space-y-6 max-w-7xl mx-auto">
              {/* Header & Controls Toolbar */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Attendance Records & Session Logs</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Filter, audit, and download date-wise student roll call records</p>
                  </div>

                  <div className="flex items-center gap-2.5">
                    {/* View Switcher: List vs Calendar */}
                    <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                      <button
                        type="button"
                        onClick={() => setRecordsViewMode('list')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                          recordsViewMode === 'list'
                            ? 'bg-white text-blue-600 shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <ClipboardList className="w-3.5 h-3.5" /> Table View
                      </button>
                      <button
                        type="button"
                        onClick={() => setRecordsViewMode('calendar')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                          recordsViewMode === 'calendar'
                            ? 'bg-white text-blue-600 shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Calendar className="w-3.5 h-3.5" /> Calendar View
                      </button>
                    </div>

                    {/* Download CSV Button */}
                    <button
                      type="button"
                      onClick={handleExportTeacherCsv}
                      disabled={exportingCsv}
                      className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 transition-all flex items-center gap-1.5 shrink-0 disabled:opacity-75"
                    >
                      {exportingCsv ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                      Download Report (CSV)
                    </button>
                  </div>
                </div>

                {/* Filters Row */}
                <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-1">
                  <div className="flex-1 relative">
                    <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input 
                      type="text"
                      placeholder="Search by student name or ID..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 bg-slate-50/50"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    <select
                      value={filterClass}
                      onChange={(e) => setFilterClass(e.target.value)}
                      className="border border-slate-200 rounded-xl px-3 py-2 text-xs bg-slate-50 font-medium focus:outline-none focus:ring-2 focus:ring-blue-600"
                    >
                      <option value="All">All Classes</option>
                      {classesList.map(c => (
                        <option key={c.id || c.name} value={c.name || c.id}>{c.name || c.id}</option>
                      ))}
                    </select>

                    <select
                      value={filterSubject}
                      onChange={(e) => setFilterSubject(e.target.value)}
                      className="border border-slate-200 rounded-xl px-3 py-2 text-xs bg-slate-50 font-medium focus:outline-none focus:ring-2 focus:ring-blue-600"
                    >
                      <option value="All">All Subjects</option>
                      {subjectsList.map(s => (
                        <option key={s.id || s.name} value={s.name}>{s.name} ({s.code || 'CS'})</option>
                      ))}
                    </select>

                    <select
                      value={filterMethod}
                      onChange={(e) => setFilterMethod(e.target.value)}
                      className="border border-slate-200 rounded-xl px-3 py-2 text-xs bg-slate-50 font-medium focus:outline-none focus:ring-2 focus:ring-blue-600"
                    >
                      <option value="All">All Methods</option>
                      <option value="Manual">Manual Roll Call</option>
                      <option value="RFID">RFID Card</option>
                      <option value="Fingerprint">Fingerprint</option>
                      <option value="Face">Face Recognition</option>
                    </select>

                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="border border-slate-200 rounded-xl px-3 py-2 text-xs bg-slate-50 font-medium focus:outline-none focus:ring-2 focus:ring-blue-600"
                    >
                      <option value="All">All Statuses</option>
                      <option value="PRESENT">Present</option>
                      <option value="ABSENT">Absent</option>
                      <option value="LATE">Late</option>
                    </select>

                    <button
                      onClick={loadRecords}
                      className="p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200"
                      title="Refresh records"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {recordsError && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between text-xs text-rose-700">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{recordsError}</span>
                  </div>
                  <button onClick={loadRecords} className="px-3 py-1 bg-rose-600 text-white rounded-lg font-semibold hover:bg-rose-700">
                    Retry
                  </button>
                </div>
              )}

              {/* VIEW 1: CALENDAR / DATE-WISE TIMELINE VIEW */}
              {recordsViewMode === 'calendar' && (
                <div className="space-y-6">
                  {recordsLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {[1, 2, 3, 4, 5, 6].map((n) => (
                        <div key={n} className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3">
                          <div className="h-4 bg-slate-200 rounded skeleton-shimmer w-28" />
                          <div className="h-6 bg-slate-100 rounded skeleton-shimmer w-full" />
                        </div>
                      ))}
                    </div>
                  ) : Object.keys(recordsList.reduce((acc, r) => {
                      const d = r.date || 'Unknown Date';
                      acc[d] = acc[d] || [];
                      acc[d].push(r);
                      return acc;
                    }, {})).length === 0 ? (
                    <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 text-xs">
                      <Calendar className="w-10 h-10 mx-auto text-slate-300 mb-3" />
                      <p className="font-bold text-base text-slate-700">No attendance dates recorded</p>
                      <p className="mt-1">Take terminal or manual attendance to populate the calendar timeline.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      {Object.entries(
                        recordsList.reduce((acc, r) => {
                          const d = r.date || 'Unknown Date';
                          if (!acc[d]) {
                            acc[d] = {
                              date: d,
                              present: 0,
                              absent: 0,
                              late: 0,
                              records: []
                            };
                          }
                          acc[d].records.push(r);
                          const st = String(r.status || '').toUpperCase();
                          if (st === 'PRESENT') acc[d].present += 1;
                          else if (st === 'ABSENT') acc[d].absent += 1;
                          else if (st === 'LATE') acc[d].late += 1;
                          else acc[d].present += 1;
                          return acc;
                        }, {})
                      ).map(([dateStr, dateGroup]) => {
                        const isExpanded = selectedCalendarDate === dateStr;
                        const total = dateGroup.records.length;
                        const pct = total > 0 ? Math.round((dateGroup.present / total) * 100) : 0;

                        return (
                          <div 
                            key={dateStr}
                            className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden flex flex-col justify-between ${
                              isExpanded 
                                ? 'border-blue-500 shadow-md ring-2 ring-blue-500/20' 
                                : 'border-slate-200 shadow-sm hover:border-slate-300'
                            }`}
                          >
                            <div className="p-5 space-y-3">
                              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                                <div className="flex items-center gap-2">
                                  <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                                    <Calendar className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <h3 className="text-sm font-bold text-slate-900">{dateStr}</h3>
                                    <span className="text-[11px] text-slate-400">{total} Roll Call Log{total === 1 ? '' : 's'}</span>
                                  </div>
                                </div>
                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold ${
                                  pct >= 75 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                }`}>
                                  {pct}% Rate
                                </span>
                              </div>

                              {/* Mini Summary Badges */}
                              <div className="grid grid-cols-3 gap-2">
                                <div className="p-2 bg-emerald-50 text-emerald-800 rounded-xl text-center border border-emerald-100">
                                  <p className="text-[10px] font-bold uppercase tracking-wider">Present</p>
                                  <p className="text-base font-black">{dateGroup.present}</p>
                                </div>
                                <div className="p-2 bg-rose-50 text-rose-800 rounded-xl text-center border border-rose-100">
                                  <p className="text-[10px] font-bold uppercase tracking-wider">Absent</p>
                                  <p className="text-base font-black">{dateGroup.absent}</p>
                                </div>
                                <div className="p-2 bg-amber-50 text-amber-800 rounded-xl text-center border border-amber-100">
                                  <p className="text-[10px] font-bold uppercase tracking-wider">Late</p>
                                  <p className="text-base font-black">{dateGroup.late}</p>
                                </div>
                              </div>

                              {/* Expanded Student List for this Date */}
                              {isExpanded && (
                                <div className="pt-2 border-t border-slate-100 space-y-2 max-h-60 overflow-y-auto pr-1">
                                  <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Student Logs on {dateStr}:</h4>
                                  <div className="space-y-1.5 divide-y divide-slate-100">
                                    {dateGroup.records.map((r, rIdx) => (
                                      <div key={r.id || rIdx} className="pt-1.5 flex items-center justify-between text-xs">
                                        <div>
                                          <p className="font-bold text-slate-800">{r.studentName || r.student_name}</p>
                                          <p className="text-[10px] text-slate-400 font-mono">{r.studentId || r.student_id} • {r.subject} • {r.time}</p>
                                        </div>
                                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                          String(r.status).toUpperCase() === 'PRESENT' ? 'bg-emerald-100 text-emerald-800' :
                                          String(r.status).toUpperCase() === 'LATE' ? 'bg-amber-100 text-amber-800' :
                                          'bg-rose-100 text-rose-800'
                                        }`}>
                                          {r.status}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => setSelectedCalendarDate(isExpanded ? null : dateStr)}
                              className="w-full py-2.5 px-4 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold border-t border-slate-100 transition-colors flex items-center justify-center gap-1"
                            >
                              {isExpanded ? 'Collapse Details' : `View ${total} Students Roll Call`}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* VIEW 2: STANDARD TABLE VIEW */}
              {recordsViewMode === 'list' && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                          <th className="py-3.5 px-6">Student</th>
                          <th className="py-3.5 px-6">ID Number</th>
                          <th className="py-3.5 px-6">Class</th>
                          <th className="py-3.5 px-6">Subject</th>
                          <th className="py-3.5 px-6">Date</th>
                          <th className="py-3.5 px-6">Time</th>
                          <th className="py-3.5 px-6">Method</th>
                          <th className="py-3.5 px-6">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm">
                        {recordsLoading ? (
                          [1, 2, 3, 4, 5].map((n) => (
                            <tr key={n}>
                              <td colSpan="8" className="py-4 px-6">
                                <div className="h-4 bg-slate-100 rounded skeleton-shimmer w-full" />
                              </td>
                            </tr>
                          ))
                        ) : recordsList.length > 0 ? (
                          recordsList.map((r) => (
                            <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-3.5 px-6 font-bold text-slate-800">{r.studentName || r.student_name}</td>
                              <td className="py-3.5 px-6 font-mono text-xs text-slate-500">{r.studentId || r.student_id}</td>
                              <td className="py-3.5 px-6 text-xs text-slate-500 font-medium">{r.className || r.class_name}</td>
                              <td className="py-3.5 px-6 font-semibold text-slate-700">{r.subject}</td>
                              <td className="py-3.5 px-6 text-xs font-semibold text-slate-700">{r.date}</td>
                              <td className="py-3.5 px-6 text-xs font-mono text-slate-500">{r.time}</td>
                              <td className="py-3.5 px-6 whitespace-nowrap">{getMethodBadge(r.method)}</td>
                              <td className="py-3.5 px-6">
                                {String(r.status).toUpperCase() === 'PRESENT' ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> Present
                                  </span>
                                ) : String(r.status).toUpperCase() === 'LATE' ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                                    <Clock className="w-3.5 h-3.5" /> Late
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
                                    <XCircle className="w-3.5 h-3.5" /> Absent
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="8" className="py-10 text-center text-slate-500 text-xs">
                              No attendance records found matching filters.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================= STUDENT ROSTER / DIRECTORY ================= */}
          {activeTab === 'students' && (
            <div className="space-y-6 max-w-7xl mx-auto">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Student Directory & Attendance Roster</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Enrolled student profiles, academic performance, and examination eligibility</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleExportTeacherCsv}
                      disabled={exportingCsv}
                      className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 transition-all flex items-center gap-1.5 disabled:opacity-75"
                    >
                      {exportingCsv ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                      Download Report (CSV)
                    </button>
                    <button
                      type="button"
                      onClick={loadAllStudents}
                      className="p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200"
                      title="Refresh students"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Filters */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div className="flex-1 relative">
                    <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input 
                      type="text"
                      placeholder="Search student by name or ID..."
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 bg-slate-50/50"
                    />
                  </div>

                  <div className="flex items-center gap-2.5">
                    <select
                      value={studentClassFilter}
                      onChange={(e) => setStudentClassFilter(e.target.value)}
                      className="border border-slate-200 rounded-xl px-3.5 py-2 text-xs bg-slate-50 font-medium focus:outline-none focus:ring-2 focus:ring-blue-600"
                    >
                      <option value="All">All Assigned Classes</option>
                      {classesList.map(c => (
                        <option key={c.id || c.name} value={c.name || c.id}>{c.name || c.id}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Student Table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        <th className="py-3.5 px-6">Student</th>
                        <th className="py-3.5 px-6">ID Number</th>
                        <th className="py-3.5 px-6">Class Section</th>
                        <th className="py-3.5 px-6">Academic Year</th>
                        <th className="py-3.5 px-6">Attendance Rate</th>
                        <th className="py-3.5 px-6">Exam Eligibility</th>
                        <th className="py-3.5 px-6 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {studentsLoading ? (
                        [1, 2, 3, 4, 5].map((n) => (
                          <tr key={n}>
                            <td colSpan="7" className="py-4 px-6">
                              <div className="h-4 bg-slate-100 rounded skeleton-shimmer w-full" />
                            </td>
                          </tr>
                        ))
                      ) : allStudentsList.filter(s => {
                          const matchesClass = studentClassFilter === 'All' || s.class_name === studentClassFilter || s.className === studentClassFilter;
                          const matchesQuery = !studentSearch.trim() || 
                            s.name?.toLowerCase().includes(studentSearch.toLowerCase()) ||
                            s.id?.toLowerCase().includes(studentSearch.toLowerCase());
                          return matchesClass && matchesQuery;
                        }).length > 0 ? (
                        allStudentsList
                          .filter(s => {
                            const matchesClass = studentClassFilter === 'All' || s.class_name === studentClassFilter || s.className === studentClassFilter;
                            const matchesQuery = !studentSearch.trim() || 
                              s.name?.toLowerCase().includes(studentSearch.toLowerCase()) ||
                              s.id?.toLowerCase().includes(studentSearch.toLowerCase());
                            return matchesClass && matchesQuery;
                          })
                          .map((s) => {
                            const pct = s.attendance_percentage ?? 0;
                            const isEligible = pct >= 75;

                            return (
                              <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                                <td className="py-3.5 px-6">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                                      {s.name?.charAt(0).toUpperCase() || 'S'}
                                    </div>
                                    <div>
                                      <p className="font-bold text-slate-800">{s.name}</p>
                                      <p className="text-[11px] text-slate-400">{s.email || `${s.id.toLowerCase()}@college.edu`}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-3.5 px-6 font-mono text-xs text-slate-600 font-semibold">{s.id}</td>
                                <td className="py-3.5 px-6">
                                  <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                    {s.class_name || s.className || 'CSE-3A'}
                                  </span>
                                </td>
                                <td className="py-3.5 px-6 text-xs text-slate-600 font-medium">{s.year || '3rd Year'} (Sec {s.section || 'A'})</td>
                                <td className="py-3.5 px-6">
                                  <div className="space-y-1">
                                    <div className="flex items-center justify-between text-xs font-bold">
                                      <span className={isEligible ? 'text-emerald-700' : 'text-rose-700'}>{pct}%</span>
                                    </div>
                                    <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                      <div 
                                        className={`h-full rounded-full ${isEligible ? 'bg-emerald-500' : 'bg-rose-500'}`}
                                        style={{ width: `${Math.min(100, pct)}%` }}
                                      />
                                    </div>
                                  </div>
                                </td>
                                <td className="py-3.5 px-6">
                                  {isEligible ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                                      <Check className="w-3 h-3" /> Eligible
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">
                                      <AlertCircle className="w-3 h-3" /> Defaulter (&lt;75%)
                                    </span>
                                  )}
                                </td>
                                <td className="py-3.5 px-6 text-right">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const targetClass = s.class_name || s.className || 'CSE-3A';
                                      setSelectedClass(targetClass);
                                      setAttendanceMode('manual');
                                      loadClassRoster(targetClass);
                                      setActiveTab('take-attendance');
                                    }}
                                    className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1"
                                  >
                                    <UserCheck className="w-3.5 h-3.5" /> Roll Call
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                      ) : (
                        <tr>
                          <td colSpan="7" className="py-10 text-center text-slate-500 text-xs">
                            No students found matching filters.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ================= MY CLASSES ================= */}
          {activeTab === 'classes' && (
            <div className="space-y-6 max-w-7xl mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">My Assigned Classes & Academic Batches</h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Direct mapping of course classes, academic years, sections, and assigned subject curricula
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200">
                    {classesList.length} Active Class{classesList.length === 1 ? '' : 'es'}
                  </span>
                  <button
                    onClick={loadClassesAndSubjects}
                    className="p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-xl transition-colors"
                    title="Refresh Classes"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {classesLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1, 2, 3].map((n) => (
                    <div key={n} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
                      <div className="h-5 w-24 bg-slate-200 rounded skeleton-shimmer" />
                      <div className="h-4 w-40 bg-slate-200 rounded skeleton-shimmer" />
                      <div className="h-10 w-full bg-slate-100 rounded skeleton-shimmer" />
                    </div>
                  ))}
                </div>
              ) : classesList.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {classesList.map((cls, idx) => {
                    const classId = cls.name || cls.id;
                    const enrolledCount = cls.total_students ?? cls.totalStudents ?? 0;
                    const subjects = cls.subjects && cls.subjects.length > 0
                      ? cls.subjects
                      : (subjectsList.map(s => s.name) || ['Assigned Courses']);

                    return (
                      <div key={cls.id || idx} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4 hover:border-blue-300 transition-all flex flex-col justify-between">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-2">
                              <span className="px-3 py-1 bg-blue-600 text-white rounded-lg text-xs font-black shadow-sm">
                                {cls.name}
                              </span>
                              <span className="text-xs px-2.5 py-0.5 rounded-md font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                {cls.year || '3rd Year'}
                              </span>
                            </div>
                            <span className="text-xs font-bold text-slate-500">
                              Sec {cls.section || 'A'}
                            </span>
                          </div>

                          <h3 className="text-base font-bold text-slate-900 leading-tight">
                            {cls.department || 'Computer Science & Engineering'}
                          </h3>

                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
                            <div className="flex items-center justify-between text-xs text-slate-600">
                              <span className="flex items-center gap-1.5 font-medium">
                                <Users className="w-3.5 h-3.5 text-blue-600" /> Enrolled Students:
                              </span>
                              <strong className="text-slate-900 font-bold">{enrolledCount} Students</strong>
                            </div>

                            <div className="pt-1">
                              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                                Assigned Subjects ({subjects.length}):
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {subjects.map((subj, sIdx) => (
                                  <span key={sIdx} className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                                    {subj}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                          <button 
                            onClick={() => { 
                              setSelectedClass(classId); 
                              setAttendanceMode('terminal');
                              setActiveTab('take-attendance'); 
                            }} 
                            className="py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5"
                          >
                            <Play className="w-3.5 h-3.5 text-emerald-400" /> Terminal
                          </button>
                          <button 
                            onClick={() => { 
                              setSelectedClass(classId); 
                              setAttendanceMode('manual');
                              loadClassRoster(classId);
                              setActiveTab('take-attendance'); 
                            }} 
                            className="py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5"
                          >
                            <UserCheck className="w-3.5 h-3.5" /> Roll Call
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center text-slate-500 text-xs">
                  <BookOpen className="w-10 h-10 mx-auto text-slate-400 mb-3" />
                  <p className="font-bold text-base text-slate-800">No classes assigned yet</p>
                  <p className="text-slate-400 mt-1 max-w-md mx-auto">
                    Faculty class allocations are managed from the Admin Portal. Once classes and subjects are assigned, they will appear here with full roster controls.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ================= REPORTS ================= */}
          {activeTab === 'reports' && (
            <div className="space-y-6 max-w-7xl mx-auto">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Faculty Attendance Reports</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Backend-driven analytics and academic attendance compliance</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleExportTeacherCsv}
                      disabled={exportingCsv}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-600/20 transition-all flex items-center gap-2 disabled:opacity-75"
                    >
                      {exportingCsv ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                      Download Report (CSV)
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-xs text-slate-500 font-medium">Average Attendance Rate</span>
                    <div className="text-2xl font-extrabold text-slate-900 mt-1">
                      {reportsData?.average_rate !== undefined ? `${reportsData.average_rate}%` : '88%'}
                    </div>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-xs text-slate-500 font-medium">Students Below 75%</span>
                    <div className="text-2xl font-extrabold text-amber-600 mt-1">
                      {reportsData?.below_threshold !== undefined ? reportsData.below_threshold : '0'}
                    </div>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-xs text-slate-500 font-medium">Total Sessions Held</span>
                    <div className="text-2xl font-extrabold text-blue-600 mt-1">
                      {reportsData?.total_sessions !== undefined ? reportsData.total_sessions : '0'}
                    </div>
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
                  <div className="w-20 h-20 rounded-full bg-blue-600 text-white flex items-center justify-center font-extrabold text-2xl shadow-lg shrink-0">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-2xl font-extrabold text-slate-900">{displayName}</h2>
                    <p className="text-sm font-semibold text-blue-600 font-mono">
                      Faculty ID: {profileData?.id || profileData?.faculty_id || currentUser?.id || 'TCH101'}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">{displayDept}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-xs text-slate-400 uppercase font-semibold">Institutional Email</span>
                    <p className="font-semibold text-slate-800 mt-0.5">{profileData?.email || currentUser?.email || 'faculty@college.edu'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 uppercase font-semibold">Department</span>
                    <p className="font-semibold text-slate-800 mt-0.5">{displayDept}</p>
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
