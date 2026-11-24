import React, { useState, useEffect, useCallback } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  UserCheck, 
  BookOpen, 
  Layers, 
  ClipboardList, 
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
  Edit2, 
  Trash2, 
  RefreshCw, 
  AlertCircle, 
  Save, 
  Loader2,
  Clock,
  Check,
  UserPlus,
  Key,
  GraduationCap,
  Calendar,
  Database,
  Building,
  School,
  Globe,
  Mail,
  Sliders,
  AlertTriangle,
  Download,
  ArrowLeft,
  Building2,
  CalendarRange,
  Link2,
  Upload,
  Image as ImageIcon,
  Copy,
  ExternalLink
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { adminApi, academicsApi, assetUrl, ApiError } from '../api/api';

// Used only to prefill the extra batch name inputs when a batch is split.
const BATCH_NAME_SUFFIXES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

const ADMIN_SECTIONS = ['dashboard', 'students', 'teachers', 'departments', 'batches', 'classes', 'subjects', 'assignments', 'registration', 'attendance', 'reports', 'settings'];

export default function Admin({ onLogout, showToast, institutionInfo, onInstitutionUpdated, basePath = '/admin' }) {
  const params = useParams();
  const navigate = useNavigate();

  // Active portal page is the URL itself: /admin/students, /admin/settings, ...
  const requestedSection = params.section || 'dashboard';
  const activeTab = ADMIN_SECTIONS.includes(requestedSection) ? requestedSection : 'dashboard';

  useEffect(() => {
    if (params.section && params.section !== activeTab) {
      navigate(basePath, { replace: true });
    }
  }, [params.section, activeTab, basePath, navigate]);

  // Sidebar navigation goes through the router so every page keeps its own URL.
  const setActiveTab = (section) => {
    navigate(section === 'dashboard' ? basePath : `${basePath}/${section}`);
  };

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // ================= DASHBOARD STATE =================
  const [dashboardData, setDashboardData] = useState(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState(null);

  // ================= STUDENTS STATE =================
  const [students, setStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentsError, setStudentsError] = useState(null);
  const [studentSearch, setStudentSearch] = useState('');
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [showEditStudentModal, setShowEditStudentModal] = useState(false);
  const [studentFormData, setStudentFormData] = useState({
    id: '',
    name: '',
    class_name: 'CSE-3A',
    email: '',
    password: '',
    phone: '',
    department: 'Computer Science & Engineering',
    year: '3rd Year',
    section: 'A',
    course: 'B.Tech CSE'
  });
  const [editingStudentId, setEditingStudentId] = useState(null);
  const [studentSubmitting, setStudentSubmitting] = useState(false);

  // ================= TEACHERS STATE =================
  const [teachers, setTeachers] = useState([]);
  const [teachersLoading, setTeachersLoading] = useState(false);
  const [teachersError, setTeachersError] = useState(null);
  const [showAddTeacherModal, setShowAddTeacherModal] = useState(false);
  const [showEditTeacherModal, setShowEditTeacherModal] = useState(false);
  const [teacherFormData, setTeacherFormData] = useState({
    id: '',
    name: '',
    departments: ['Computer Science & Engineering'],
    email: '',
    password: '',
    phone: '',
    subjects: 'Database Systems, Data Structures',
  });
  const [editingTeacherId, setEditingTeacherId] = useState(null);
  const [teacherSubmitting, setTeacherSubmitting] = useState(false);

  // ================= CLASSES STATE =================
  const [classes, setClasses] = useState([]);
  const [classesLoading, setClassesLoading] = useState(false);
  const [showAddClassModal, setShowAddClassModal] = useState(false);
  const [showEditClassModal, setShowEditClassModal] = useState(false);
  const [classFormData, setClassFormData] = useState({
    name: '',
    year: '',
    section: 'A',
    department: '',
    batch_id: '',
  });
  const [classSectionMode, setClassSectionMode] = useState('single');
  const [classSectionNames, setClassSectionNames] = useState(['']);
  const [editingClassId, setEditingClassId] = useState(null);
  const [classSubmitting, setClassSubmitting] = useState(false);

  // ================= SUBJECTS STATE =================
  const [subjects, setSubjects] = useState([]);
  const [subjectsLoading, setSubjectsLoading] = useState(false);
  const [showAddSubjectModal, setShowAddSubjectModal] = useState(false);
  const [showEditSubjectModal, setShowEditSubjectModal] = useState(false);
  const [subjectFormData, setSubjectFormData] = useState({
    code: '',
    name: '',
    department: 'Computer Science & Engineering',
  });
  const [editingSubjectId, setEditingSubjectId] = useState(null);
  const [subjectSubmitting, setSubjectSubmitting] = useState(false);

  // ================= DEPARTMENTS STATE =================
  const [departments, setDepartments] = useState([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(false);
  const [showAddDepartmentModal, setShowAddDepartmentModal] = useState(false);
  const [showEditDepartmentModal, setShowEditDepartmentModal] = useState(false);
  const [departmentFormData, setDepartmentFormData] = useState({ code: '', name: '' });
  const [editingDepartmentId, setEditingDepartmentId] = useState(null);
  const [departmentSubmitting, setDepartmentSubmitting] = useState(false);

  // ================= BATCHES STATE =================
  const [batches, setBatches] = useState([]);
  const [batchesLoading, setBatchesLoading] = useState(false);
  const [showAddBatchModal, setShowAddBatchModal] = useState(false);
  const [showEditBatchModal, setShowEditBatchModal] = useState(false);
  const [batchFormData, setBatchFormData] = useState({ name: '', department_id: '' });
  const [editingBatchId, setEditingBatchId] = useState(null);
  const [batchSubmitting, setBatchSubmitting] = useState(false);
  // "Sections" dropdown: 0 keeps one batch named by the year range, N asks for N names.
  const [batchSectionCount, setBatchSectionCount] = useState(0);
  const [batchNames, setBatchNames] = useState(['']);

  // ================= STUDENT REGISTRATION STATE =================
  const [registrationLinks, setRegistrationLinks] = useState([]);
  const [registrationRequests, setRegistrationRequests] = useState([]);
  const [registrationLoading, setRegistrationLoading] = useState(false);
  const [registrationError, setRegistrationError] = useState(null);
  const [registrationLabel, setRegistrationLabel] = useState('');
  const [registrationSubmitting, setRegistrationSubmitting] = useState(false);
  const [registrationFilter, setRegistrationFilter] = useState('pending');
  const [rejectingRequest, setRejectingRequest] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [decidingId, setDecidingId] = useState(null);
  const [copiedLinkId, setCopiedLinkId] = useState(null);

  // ================= TEACHER CLASS ASSIGNMENTS STATE =================
  const [assignments, setAssignments] = useState([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);
  const [assignmentsError, setAssignmentsError] = useState(null);
  const [assignmentFormData, setAssignmentFormData] = useState({ teacher_id: '', class_id: '', subject_ids: [] });
  const [assignmentSubmitting, setAssignmentSubmitting] = useState(false);
  const [assignmentFilterTeacher, setAssignmentFilterTeacher] = useState('All');

  // ================= INSTITUTION LOGO STATE =================
  const [logoUploading, setLogoUploading] = useState(false);

  // ================= GLOBAL ATTENDANCE STATE =================
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceError, setAttendanceError] = useState(null);
  const [logFilterClass, setLogFilterClass] = useState('All');
  const [logFilterMethod, setLogFilterMethod] = useState('All');
  const [logFilterStatus, setLogFilterStatus] = useState('All');
  const [attendanceSearch, setAttendanceSearch] = useState('');
  const [showAddAttendanceModal, setShowAddAttendanceModal] = useState(false);
  const [attendanceFormData, setAttendanceFormData] = useState({
    student_id: '',
    class_name: 'CSE-3A',
    subject_name: 'Database Systems',
    status: 'PRESENT',
    method: 'MANUAL',
    date: new Date().toISOString().split('T')[0],
  });
  const [attendanceSubmitting, setAttendanceSubmitting] = useState(false);

  // ================= REPORTS STATE =================
  const [reportsData, setReportsData] = useState(null);
  const [reportsLoading, setReportsLoading] = useState(false);

  // ================= SETTINGS & DB STATE =================
  const [settingsData, setSettingsData] = useState({
    college_name: 'CampusSync University',
    college_short_name: 'CampusSync',
    academic_term: 'Academic Session 2026',
    system_tagline: 'Smart Multi-Modal Attendance & Campus Management System',
    support_email: 'admin@campussync.edu',
    min_attendance_pct: 75,
    late_threshold_minutes: 15,
    session_timeout_minutes: 60,
  });
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [dbSummary, setDbSummary] = useState(null);
  const [dbSummaryLoading, setDbSummaryLoading] = useState(false);
  const [clearingAttendance, setClearingAttendance] = useState(false);

  // ================= FETCH DASHBOARD =================
  const fetchDashboard = useCallback(async () => {
    setDashboardLoading(true);
    setDashboardError(null);
    try {
      const data = await adminApi.getDashboard();
      setDashboardData(data);
    } catch (err) {
      setDashboardError(err.message || 'Unable to fetch admin statistics from backend.');
    } finally {
      setDashboardLoading(false);
    }
  }, []);

  // ================= FETCH STUDENTS =================
  const fetchStudents = useCallback(async () => {
    setStudentsLoading(true);
    setStudentsError(null);
    try {
      const data = await adminApi.getStudents({ search: studentSearch });
      setStudents(Array.isArray(data) ? data : (data?.students || []));
    } catch (err) {
      setStudentsError(err.message || 'Unable to fetch student list.');
    } finally {
      setStudentsLoading(false);
    }
  }, [studentSearch]);

  // ================= FETCH TEACHERS =================
  const fetchTeachers = useCallback(async () => {
    setTeachersLoading(true);
    setTeachersError(null);
    try {
      const data = await adminApi.getTeachers();
      setTeachers(Array.isArray(data) ? data : (data?.teachers || []));
    } catch (err) {
      setTeachersError(err.message || 'Unable to fetch faculty list.');
    } finally {
      setTeachersLoading(false);
    }
  }, []);

  // ================= FETCH CLASSES =================
  const fetchClasses = useCallback(async () => {
    setClassesLoading(true);
    try {
      const data = await adminApi.getClasses();
      setClasses(Array.isArray(data) ? data : (data?.classes || []));
    } catch (err) {
      console.warn('Classes fetch error:', err);
    } finally {
      setClassesLoading(false);
    }
  }, []);

  // ================= FETCH DEPARTMENTS =================
  const fetchDepartments = useCallback(async () => {
    setDepartmentsLoading(true);
    try {
      const data = await academicsApi.listDepartments();
      setDepartments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn('Departments fetch error:', err);
    } finally {
      setDepartmentsLoading(false);
    }
  }, []);

  // ================= FETCH BATCHES =================
  const fetchBatches = useCallback(async () => {
    setBatchesLoading(true);
    try {
      const data = await academicsApi.listBatches();
      setBatches(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn('Batches fetch error:', err);
    } finally {
      setBatchesLoading(false);
    }
  }, []);

  // ================= FETCH TEACHER ASSIGNMENTS =================
  const fetchAssignments = useCallback(async () => {
    setAssignmentsLoading(true);
    setAssignmentsError(null);
    try {
      const data = await academicsApi.listAssignments();
      setAssignments(Array.isArray(data) ? data : []);
    } catch (err) {
      setAssignmentsError(err.message || 'Unable to load class assignments.');
    } finally {
      setAssignmentsLoading(false);
    }
  }, []);

  // ================= FETCH SUBJECTS =================
  const fetchSubjects = useCallback(async () => {
    setSubjectsLoading(true);
    try {
      const data = await adminApi.getSubjects();
      setSubjects(Array.isArray(data) ? data : (data?.subjects || []));
    } catch (err) {
      console.warn('Subjects fetch error:', err);
    } finally {
      setSubjectsLoading(false);
    }
  }, []);

  // ================= FETCH ATTENDANCE =================
  const fetchAttendanceLogs = useCallback(async () => {
    setAttendanceLoading(true);
    setAttendanceError(null);
    try {
      const filters = {};
      if (logFilterClass !== 'All') filters.class_name = logFilterClass;
      if (logFilterMethod !== 'All') filters.method = logFilterMethod;
      if (logFilterStatus !== 'All') filters.status = logFilterStatus;
      const data = await adminApi.getAttendanceLogs(filters);
      setAttendanceLogs(Array.isArray(data) ? data : (data?.records || []));
    } catch (err) {
      setAttendanceError(err.message || 'Unable to fetch attendance logs.');
    } finally {
      setAttendanceLoading(false);
    }
  }, [logFilterClass, logFilterMethod, logFilterStatus]);

  // ================= FETCH REPORTS =================
  const fetchReports = useCallback(async () => {
    setReportsLoading(true);
    try {
      const data = await adminApi.getReports();
      setReportsData(data);
    } catch (err) {
      console.warn('Reports fetch error:', err);
    } finally {
      setReportsLoading(false);
    }
  }, []);

  // ================= FETCH DATABASE SUMMARY =================
  const fetchDatabaseSummary = useCallback(async () => {
    setDbSummaryLoading(true);
    try {
      const data = await adminApi.getDatabaseSummary();
      setDbSummary(data);
    } catch (err) {
      console.warn('Database summary fetch error:', err);
    } finally {
      setDbSummaryLoading(false);
    }
  }, []);

  // ================= FETCH SETTINGS =================
  const fetchSettings = useCallback(async () => {
    setSettingsLoading(true);
    try {
      const data = await adminApi.getSettings();
      if (data && typeof data === 'object') {
        setSettingsData(prev => ({ ...prev, ...data }));
      }
      fetchDatabaseSummary();
    } catch (err) {
      console.warn('Settings fetch error:', err);
    } finally {
      setSettingsLoading(false);
    }
  }, [fetchDatabaseSummary]);

  // ================= FETCH STUDENT REGISTRATION =================
  const fetchRegistrationData = useCallback(async () => {
    setRegistrationLoading(true);
    setRegistrationError(null);
    try {
      const [links, requests] = await Promise.all([
        academicsApi.getRegistrationLinks(),
        academicsApi.getRegistrationRequests(),
      ]);
      setRegistrationLinks(Array.isArray(links) ? links : []);
      setRegistrationRequests(Array.isArray(requests) ? requests : []);
    } catch (err) {
      setRegistrationError(err.message || 'Could not load registration data.');
    } finally {
      setRegistrationLoading(false);
    }
  }, []);

  // Fetch based on active tab
  useEffect(() => {
    if (activeTab === 'dashboard') {
      fetchDashboard();
      fetchClasses();
      fetchSubjects();
      fetchStudents();
      fetchTeachers();
    } else if (activeTab === 'students') {
      fetchStudents();
      fetchClasses();
      fetchDepartments();
      fetchBatches();
    } else if (activeTab === 'teachers') {
      fetchTeachers();
      fetchSubjects();
      fetchDepartments();
    } else if (activeTab === 'departments') {
      fetchDepartments();
      fetchBatches();
      fetchStudents();
    } else if (activeTab === 'batches') {
      fetchBatches();
      fetchDepartments();
      fetchStudents();
    } else if (activeTab === 'classes') {
      fetchClasses();
      fetchDepartments();
      fetchBatches();
    } else if (activeTab === 'subjects') {
      fetchSubjects();
      fetchDepartments();
    } else if (activeTab === 'assignments') {
      fetchAssignments();
      fetchTeachers();
      fetchClasses();
      fetchSubjects();
    } else if (activeTab === 'registration') {
      fetchRegistrationData();
    } else if (activeTab === 'attendance') {
      fetchAttendanceLogs();
      fetchStudents();
      fetchClasses();
      fetchSubjects();
    } else if (activeTab === 'reports') {
      fetchReports();
    } else if (activeTab === 'settings') {
      fetchSettings();
    }
  }, [activeTab, fetchDashboard, fetchStudents, fetchTeachers, fetchClasses, fetchSubjects, fetchAttendanceLogs, fetchReports, fetchSettings, fetchDepartments, fetchBatches, fetchAssignments, fetchRegistrationData]);

  // Department and batch lists power the dropdowns on every other tab, so load them once.
  useEffect(() => {
    fetchDepartments();
    fetchBatches();
  }, [fetchDepartments, fetchBatches]);

  // ================= STUDENTS HANDLERS =================
  const departmentNames = departments.map((item) => item.name);
  const batchesForDepartment = (departmentName) =>
    batches.filter((batch) => !departmentName || batch.department_name === departmentName);

  const handleOpenAddStudent = () => {
    const firstDepartment = departments[0]?.name || '';
    setStudentFormData({
      id: `CSE23${Math.floor(100 + Math.random() * 900)}`,
      name: '',
      class_name: classes[0]?.name || '',
      email: '',
      password: '',
      phone: '',
      department: firstDepartment,
      batch_id: batchesForDepartment(firstDepartment)[0]?.id ?? null,
      year: '3rd Year',
      section: 'A',
      course: 'B.Tech CSE',
      roll_number: ''
    });
    setShowAddStudentModal(true);
  };

  const handleOpenEditStudent = (student) => {
    setEditingStudentId(student.id);
    setStudentFormData({
      id: student.id,
      name: student.name || '',
      class_name: student.class_name || classes[0]?.name || '',
      email: student.email || '',
      password: '',
      phone: student.phone || '',
      department: student.department || departments[0]?.name || '',
      batch_id: student.batch_id ?? null,
      year: student.year || '3rd Year',
      section: student.section || 'A',
      course: student.course || 'B.Tech CSE',
      roll_number: student.roll_number || ''
    });
    setShowEditStudentModal(true);
  };

  const handleCreateStudent = async (e) => {
    e.preventDefault();
    if (!studentFormData.name || !studentFormData.email || !studentFormData.id) return;
    setStudentSubmitting(true);
    try {
      await adminApi.createStudent(studentFormData);
      setShowAddStudentModal(false);
      fetchStudents();
      if (showToast) showToast(`Student ${studentFormData.name} created successfully.`, 'success');
    } catch (err) {
      if (showToast) showToast(err.message || 'Failed to create student on backend.', 'warning');
    } finally {
      setStudentSubmitting(false);
    }
  };

  const handleUpdateStudent = async (e) => {
    e.preventDefault();
    if (!studentFormData.name || !editingStudentId) return;
    setStudentSubmitting(true);
    try {
      // A blank password box means "keep the current password", so it is not sent at all.
      const { password, ...rest } = studentFormData;
      const payload = password && password.trim() ? { ...rest, password } : rest;
      await adminApi.updateStudent(editingStudentId, payload);
      setShowEditStudentModal(false);
      setEditingStudentId(null);
      fetchStudents();
      if (showToast) showToast(`Student ${studentFormData.name} updated successfully.`, 'success');
    } catch (err) {
      if (showToast) showToast(err.message || 'Failed to update student.', 'warning');
    } finally {
      setStudentSubmitting(false);
    }
  };

  const handleDeleteStudent = async (id, name) => {
    if (!confirm(`Are you sure you want to delete student: ${name} (${id})?`)) return;
    try {
      await adminApi.deleteStudent(id);
      fetchStudents();
      if (showToast) showToast(`Deleted student: ${name}`, 'info');
    } catch (err) {
      if (showToast) showToast(err.message || 'Failed to delete student.', 'warning');
    }
  };

  // ================= TEACHERS HANDLERS =================
  const toggleSubjectInForm = (subjName) => {
    const currentList = (teacherFormData.subjects || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    const index = currentList.findIndex(s => s.toLowerCase() === subjName.toLowerCase());
    let updated;
    if (index >= 0) {
      updated = currentList.filter((_, i) => i !== index);
    } else {
      updated = [...currentList, subjName];
    }
    setTeacherFormData(prev => ({
      ...prev,
      subjects: updated.join(', ')
    }));
  };

  const toggleDepartmentInForm = (name) => {
    setTeacherFormData(prev => {
      const current = Array.isArray(prev.departments) ? prev.departments : [];
      const exists = current.some(item => item.toLowerCase() === name.toLowerCase());
      return {
        ...prev,
        departments: exists
          ? current.filter(item => item.toLowerCase() !== name.toLowerCase())
          : [...current, name]
      };
    });
  };

  const handleOpenAddTeacher = () => {
    fetchSubjects();
    fetchDepartments();
    setTeacherFormData({
      id: `TCH${Math.floor(100 + Math.random() * 900)}`,
      name: '',
      departments: departments[0]?.name ? [departments[0].name] : [],
      email: '',
      password: '',
      phone: '',
      subjects: '',
    });
    setShowAddTeacherModal(true);
  };

  const handleOpenEditTeacher = (teacher) => {
    fetchSubjects();
    fetchDepartments();
    setEditingTeacherId(teacher.id);
    const teacherDepartments =
      Array.isArray(teacher.departments) && teacher.departments.length > 0
        ? teacher.departments
        : [teacher.department || departments[0]?.name].filter(Boolean);
    setTeacherFormData({
      id: teacher.id,
      name: teacher.name || '',
      departments: teacherDepartments,
      email: teacher.email || '',
      password: '',
      phone: teacher.phone || '',
      subjects: Array.isArray(teacher.subjects) ? teacher.subjects.join(', ') : (teacher.subjects || ''),
    });
    setShowEditTeacherModal(true);
  };

  const handleCreateTeacher = async (e) => {
    e.preventDefault();
    if (!teacherFormData.name || !teacherFormData.email || !teacherFormData.id) return;
    if ((teacherFormData.departments || []).length === 0) {
      if (showToast) showToast('Choose at least one department for this faculty member.', 'warning');
      return;
    }
    setTeacherSubmitting(true);
    try {
      const payload = {
        ...teacherFormData,
        subjects: teacherFormData.subjects.split(',').map(s => s.trim()).filter(Boolean)
      };
      await adminApi.createTeacher(payload);
      setShowAddTeacherModal(false);
      fetchTeachers();
      if (showToast) showToast(`Faculty ${teacherFormData.name} added successfully.`, 'success');
    } catch (err) {
      if (showToast) showToast(err.message || 'Failed to add teacher.', 'warning');
    } finally {
      setTeacherSubmitting(false);
    }
  };

  const handleUpdateTeacher = async (e) => {
    e.preventDefault();
    if (!teacherFormData.name || !editingTeacherId) return;
    if ((teacherFormData.departments || []).length === 0) {
      if (showToast) showToast('Choose at least one department for this faculty member.', 'warning');
      return;
    }
    setTeacherSubmitting(true);
    try {
      const { password, ...rest } = teacherFormData;
      const payload = {
        ...rest,
        subjects: teacherFormData.subjects.split(',').map(s => s.trim()).filter(Boolean)
      };
      // A blank password box means "keep the current password", so it is not sent at all.
      if (password && password.trim()) payload.password = password;
      await adminApi.updateTeacher(editingTeacherId, payload);
      setShowEditTeacherModal(false);
      setEditingTeacherId(null);
      fetchTeachers();
      if (showToast) showToast(`Faculty ${teacherFormData.name} updated successfully.`, 'success');
    } catch (err) {
      if (showToast) showToast(err.message || 'Failed to update faculty.', 'warning');
    } finally {
      setTeacherSubmitting(false);
    }
  };

  const handleDeleteTeacher = async (id, name) => {
    if (!confirm(`Are you sure you want to delete faculty member: ${name} (${id})?`)) return;
    try {
      await adminApi.deleteTeacher(id);
      fetchTeachers();
      if (showToast) showToast(`Deleted faculty: ${name}`, 'info');
    } catch (err) {
      if (showToast) showToast(err.message || 'Failed to delete faculty.', 'warning');
    }
  };

  // ================= CLASSES HANDLERS =================
  const handleOpenAddClass = () => {
    const firstDepartment = departments[0]?.name || '';
    const firstBatch = batchesForDepartment(firstDepartment)[0] || null;
    setClassFormData({
      name: firstBatch?.name || '',
      year: '',
      section: '',
      department: firstDepartment,
      batch_id: firstBatch?.id ?? null,
    });
    setClassSectionMode('single');
    setClassSectionNames(['']);
    setShowAddClassModal(true);
  };

  const handleOpenEditClass = (cls) => {
    setEditingClassId(cls.id);
    setClassFormData({
      name: cls.name || '',
      year: cls.year || '',
      section: cls.section || '',
      department: cls.department || departments[0]?.name || '',
      batch_id: cls.batch_id ?? null,
    });
    setShowEditClassModal(true);
  };

  const handleClassBatchChange = (event) => {
    const value = event.target.value;
    const batchId = value ? Number(value) : null;
    const batch = batches.find((item) => item.id === batchId);
    setClassFormData((prev) => ({ ...prev, batch_id: batchId, name: batch ? batch.name : prev.name }));
  };

  const handleClassSectionModeChange = (mode) => {
    setClassSectionMode(mode);
    setClassSectionNames((prev) => (prev.length > 0 ? prev : ['']));
  };

  const handleSectionNameChange = (index, value) => {
    setClassSectionNames((prev) => prev.map((item, i) => (i === index ? value : item)));
  };

  const addSectionNameInput = () => setClassSectionNames((prev) => [...prev, '']);

  const removeSectionNameInput = (index) =>
    setClassSectionNames((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)));

  const handleCreateClass = async (e) => {
    e.preventDefault();
    const baseName = classFormData.name.trim();
    if (!baseName) return;

    let sections;
    if (classSectionMode === 'single') {
      // Single: one class named after the batch, with an optional section name.
      sections = [classFormData.section.trim()];
    } else {
      // Multiple: one class per section name the admin typed, nothing generated.
      sections = [];
      classSectionNames
        .map((name) => name.trim())
        .filter(Boolean)
        .forEach((name) => {
          if (!sections.some((existing) => existing.toLowerCase() === name.toLowerCase())) sections.push(name);
        });
      if (sections.length === 0) {
        if (showToast) showToast('Add at least one section name.', 'warning');
        return;
      }
    }

    setClassSubmitting(true);
    const created = [];
    const failed = [];
    try {
      for (const section of sections) {
        const className = classSectionMode === 'single' ? baseName : `${baseName}${section}`;
        try {
          await adminApi.createClass({ ...classFormData, name: className, section });
          created.push(className);
        } catch (err) {
          failed.push(err.message || className);
        }
      }
      if (showToast) {
        if (created.length === 1) showToast(`Class ${created[0]} created.`, 'success');
        else if (created.length > 1) showToast(`${created.length} classes created: ${created.join(', ')}.`, 'success');
        if (failed.length) showToast(failed.join(' • '), 'warning');
      }
      if (created.length > 0) {
        setShowAddClassModal(false);
        fetchClasses();
      }
    } finally {
      setClassSubmitting(false);
    }
  };

  const handleUpdateClass = async (e) => {
    e.preventDefault();
    if (!classFormData.name || !editingClassId) return;
    setClassSubmitting(true);
    try {
      await adminApi.updateClass(editingClassId, classFormData);
      setShowEditClassModal(false);
      setEditingClassId(null);
      fetchClasses();
      if (showToast) showToast(`Class ${classFormData.name} updated.`, 'success');
    } catch (err) {
      if (showToast) showToast(err.message || 'Failed to update class.', 'warning');
    } finally {
      setClassSubmitting(false);
    }
  };

  const handleDeleteClass = async (id, name) => {
    if (!confirm(`Are you sure you want to delete class: ${name}?`)) return;
    try {
      await adminApi.deleteClass(id);
      fetchClasses();
      if (showToast) showToast(`Deleted class: ${name}`, 'info');
    } catch (err) {
      if (showToast) showToast(err.message || 'Failed to delete class.', 'warning');
    }
  };

  // ================= SUBJECTS HANDLERS =================
  const handleOpenAddSubject = () => {
    setSubjectFormData({
      code: '',
      name: '',
      department: departments[0]?.name || '',
    });
    setShowAddSubjectModal(true);
  };

  const handleOpenEditSubject = (subj) => {
    setEditingSubjectId(subj.id);
    setSubjectFormData({
      code: subj.code || '',
      name: subj.name || '',
      department: subj.department || departments[0]?.name || '',
    });
    setShowEditSubjectModal(true);
  };

  const handleCreateSubject = async (e) => {
    e.preventDefault();
    if (!subjectFormData.code || !subjectFormData.name) return;
    setSubjectSubmitting(true);
    try {
      await adminApi.createSubject(subjectFormData);
      setShowAddSubjectModal(false);
      fetchSubjects();
      if (showToast) showToast(`Subject ${subjectFormData.name} added.`, 'success');
    } catch (err) {
      if (showToast) showToast(err.message || 'Failed to add subject.', 'warning');
    } finally {
      setSubjectSubmitting(false);
    }
  };

  const handleUpdateSubject = async (e) => {
    e.preventDefault();
    if (!subjectFormData.name || !editingSubjectId) return;
    setSubjectSubmitting(true);
    try {
      await adminApi.updateSubject(editingSubjectId, subjectFormData);
      setShowEditSubjectModal(false);
      setEditingSubjectId(null);
      fetchSubjects();
      if (showToast) showToast(`Subject ${subjectFormData.name} updated.`, 'success');
    } catch (err) {
      if (showToast) showToast(err.message || 'Failed to update subject.', 'warning');
    } finally {
      setSubjectSubmitting(false);
    }
  };

  const handleDeleteSubject = async (id, name) => {
    if (!confirm(`Are you sure you want to delete subject: ${name}?`)) return;
    try {
      await adminApi.deleteSubject(id);
      fetchSubjects();
      if (showToast) showToast(`Deleted subject: ${name}`, 'info');
    } catch (err) {
      if (showToast) showToast(err.message || 'Failed to delete subject.', 'warning');
    }
  };

  // ================= DEPARTMENT HANDLERS =================
  const handleOpenAddDepartment = () => {
    setDepartmentFormData({ code: '', name: '' });
    setShowAddDepartmentModal(true);
  };

  const handleOpenEditDepartment = (department) => {
    setEditingDepartmentId(department.id);
    setDepartmentFormData({ code: department.code || '', name: department.name || '' });
    setShowEditDepartmentModal(true);
  };

  const handleCreateDepartment = async (e) => {
    e.preventDefault();
    if (!departmentFormData.code.trim() || !departmentFormData.name.trim()) return;
    setDepartmentSubmitting(true);
    try {
      await academicsApi.createDepartment({
        code: departmentFormData.code.trim().toUpperCase(),
        name: departmentFormData.name.trim(),
      });
      setShowAddDepartmentModal(false);
      fetchDepartments();
      if (showToast) showToast(`Department ${departmentFormData.name} added.`, 'success');
    } catch (err) {
      if (showToast) showToast(err.message || 'Failed to add department.', 'warning');
    } finally {
      setDepartmentSubmitting(false);
    }
  };

  const handleUpdateDepartment = async (e) => {
    e.preventDefault();
    if (!editingDepartmentId || !departmentFormData.name.trim()) return;
    setDepartmentSubmitting(true);
    try {
      await academicsApi.updateDepartment(editingDepartmentId, {
        code: departmentFormData.code.trim().toUpperCase(),
        name: departmentFormData.name.trim(),
      });
      setShowEditDepartmentModal(false);
      setEditingDepartmentId(null);
      fetchDepartments();
      fetchStudents();
      fetchTeachers();
      fetchClasses();
      fetchSubjects();
      if (showToast) showToast('Department updated across all records.', 'success');
    } catch (err) {
      if (showToast) showToast(err.message || 'Failed to update department.', 'warning');
    } finally {
      setDepartmentSubmitting(false);
    }
  };

  const handleDeleteDepartment = async (department) => {
    if (!confirm(`Delete department ${department.name} (${department.code})?`)) return;
    try {
      await academicsApi.deleteDepartment(department.id);
      fetchDepartments();
      if (showToast) showToast(`Deleted department: ${department.name}`, 'info');
    } catch (err) {
      if (showToast) showToast(err.message || 'Failed to delete department.', 'warning');
    }
  };

  // ================= BATCH HANDLERS =================
  const handleOpenAddBatch = () => {
    setBatchFormData({ name: '', department_id: departments[0]?.id || '' });
    setBatchSectionCount(0);
    setBatchNames(['']);
    setShowAddBatchModal(true);
  };

  const handleOpenEditBatch = (batch) => {
    setEditingBatchId(batch.id);
    setBatchFormData({ name: batch.name || '', department_id: batch.department_id || '' });
    setShowEditBatchModal(true);
  };

  const handleCreateBatch = async (e) => {
    e.preventDefault();
    if (!batchFormData.name.trim() || !batchFormData.department_id) return;
    const departmentId = Number(batchFormData.department_id);
    // No sections -> one batch named by the year range; N sections -> N typed names.
    const names = batchSectionCount > 0
      ? batchNames.map((value) => value.trim()).filter(Boolean)
      : [batchFormData.name.trim()];
    if (names.length === 0) return;
    setBatchSubmitting(true);
    try {
      const created = [];
      const failed = [];
      for (const name of names) {
        try {
          await academicsApi.createBatch({ name, department_id: departmentId });
          created.push(name);
        } catch (err) {
          failed.push(err.message || name);
        }
      }
      setShowAddBatchModal(false);
      fetchBatches();
      if (showToast) {
        if (created.length) showToast(`${created.length === 1 ? `Batch ${created[0]}` : `${created.length} batches`} added.`, 'success');
        if (failed.length) showToast(failed.join(' • '), 'warning');
      }
    } finally {
      setBatchSubmitting(false);
    }
  };

  const handleUpdateBatch = async (e) => {
    e.preventDefault();
    if (!editingBatchId || !batchFormData.name.trim()) return;
    setBatchSubmitting(true);
    try {
      await academicsApi.updateBatch(editingBatchId, {
        name: batchFormData.name.trim(),
        department_id: Number(batchFormData.department_id),
      });
      setShowEditBatchModal(false);
      setEditingBatchId(null);
      fetchBatches();
      fetchClasses();
      if (showToast) showToast('Batch updated.', 'success');
    } catch (err) {
      if (showToast) showToast(err.message || 'Failed to update batch.', 'warning');
    } finally {
      setBatchSubmitting(false);
    }
  };

  const handleDeleteBatch = async (batch) => {
    if (!confirm(`Delete batch ${batch.name}? Classes and students in it will keep their records but lose the batch link.`)) return;
    try {
      await academicsApi.deleteBatch(batch.id);
      fetchBatches();
      fetchClasses();
      if (showToast) showToast(`Deleted batch: ${batch.name}`, 'info');
    } catch (err) {
      if (showToast) showToast(err.message || 'Failed to delete batch.', 'warning');
    }
  };

  // ================= TEACHER ASSIGNMENT HANDLERS =================
  const toggleAssignmentSubject = (subjectId) => {
    setAssignmentFormData((prev) => ({
      ...prev,
      subject_ids: prev.subject_ids.includes(subjectId)
        ? prev.subject_ids.filter((id) => id !== subjectId)
        : [...prev.subject_ids, subjectId],
    }));
  };

  const handleAssignTeacher = async (e) => {
    e.preventDefault();
    if (!assignmentFormData.teacher_id || !assignmentFormData.class_id || assignmentFormData.subject_ids.length === 0) {
      if (showToast) showToast('Pick a teacher, a class and at least one subject.', 'warning');
      return;
    }
    setAssignmentSubmitting(true);
    try {
      await academicsApi.assign({
        teacher_id: assignmentFormData.teacher_id,
        class_id: Number(assignmentFormData.class_id),
        subject_ids: assignmentFormData.subject_ids,
      });
      setAssignmentFormData({ teacher_id: '', class_id: '', subject_ids: [] });
      fetchAssignments();
      if (showToast) showToast('Class assigned to faculty. They can now see it in their portal.', 'success');
    } catch (err) {
      if (showToast) showToast(err.message || 'Failed to assign class.', 'warning');
    } finally {
      setAssignmentSubmitting(false);
    }
  };

  const handleDeleteAssignment = async (assignment) => {
    if (!confirm(`Remove ${assignment.subject_name} in ${assignment.class_name} from ${assignment.teacher_name}?`)) return;
    try {
      await academicsApi.deleteAssignment(assignment.id);
      fetchAssignments();
      if (showToast) showToast('Assignment removed.', 'info');
    } catch (err) {
      if (showToast) showToast(err.message || 'Failed to remove assignment.', 'warning');
    }
  };

  // ================= STUDENT REGISTRATION HANDLERS =================
  const registrationUrl = (link) => `${window.location.origin}${link.path}`;

  const copyRegistrationUrl = async (link) => {
    try {
      await navigator.clipboard.writeText(registrationUrl(link));
      setCopiedLinkId(link.id);
      setTimeout(() => setCopiedLinkId(null), 2000);
      if (showToast) showToast('Registration link copied to clipboard.', 'success');
    } catch {
      if (showToast) showToast('Copy failed. Select the link text and copy it manually.', 'warning');
    }
  };

  const handleCreateRegistrationLink = async (e) => {
    e.preventDefault();
    setRegistrationSubmitting(true);
    try {
      await academicsApi.createRegistrationLink({ label: registrationLabel.trim() || 'Student registration' });
      setRegistrationLabel('');
      await fetchRegistrationData();
      if (showToast) showToast('Registration link created. Copy it and share it with applicants.', 'success');
    } catch (err) {
      if (showToast) showToast(err.message || 'Could not create the registration link.', 'warning');
    } finally {
      setRegistrationSubmitting(false);
    }
  };

  const handleToggleRegistrationLink = async (link) => {
    try {
      await academicsApi.updateRegistrationLink(link.id, { is_active: !link.is_active });
      await fetchRegistrationData();
      if (showToast) showToast(link.is_active ? 'Link closed. Students can no longer submit.' : 'Link reopened for submissions.', 'info');
    } catch (err) {
      if (showToast) showToast(err.message || 'Could not update the link.', 'warning');
    }
  };

  const handleDeleteRegistrationLink = async (link) => {
    if (!confirm(`Delete the link "${link.label || 'Student registration'}"? Its applications are removed too.`)) return;
    try {
      await academicsApi.deleteRegistrationLink(link.id);
      await fetchRegistrationData();
      if (showToast) showToast('Registration link deleted.', 'info');
    } catch (err) {
      if (showToast) showToast(err.message || 'Could not delete the link.', 'warning');
    }
  };

  const handleApproveRegistration = async (request) => {
    if (!confirm(`Approve ${request.name}? This creates their login (ID ${request.registration_number}) and student record.`)) return;
    setDecidingId(request.id);
    try {
      await academicsApi.approveRegistration(request.id);
      await fetchRegistrationData();
      fetchStudents();
      if (showToast) showToast(`${request.name} approved and enrolled as ${request.registration_number}.`, 'success');
    } catch (err) {
      if (showToast) showToast(err.message || 'Could not approve this application.', 'warning');
    } finally {
      setDecidingId(null);
    }
  };

  const handleOpenReject = (request) => {
    setRejectingRequest(request);
    setRejectReason('');
  };

  const handleRejectRegistration = async (e) => {
    e.preventDefault();
    if (!rejectingRequest || !rejectReason.trim()) return;
    setDecidingId(rejectingRequest.id);
    try {
      await academicsApi.rejectRegistration(rejectingRequest.id, rejectReason.trim());
      setRejectingRequest(null);
      setRejectReason('');
      await fetchRegistrationData();
      if (showToast) showToast('Application rejected. The reason is saved for the student and the office.', 'info');
    } catch (err) {
      if (showToast) showToast(err.message || 'Could not reject this application.', 'warning');
    } finally {
      setDecidingId(null);
    }
  };

  // ================= INSTITUTION LOGO HANDLERS =================
  const handleLogoUpload = async (file) => {
    if (!file) return;
    setLogoUploading(true);
    try {
      const res = await adminApi.uploadLogo(file);
      if (res) setSettingsData((prev) => ({ ...prev, ...res }));
      if (onInstitutionUpdated) onInstitutionUpdated();
      if (showToast) showToast('Institution logo updated.', 'success');
    } catch (err) {
      if (showToast) showToast(err.message || 'Failed to upload logo.', 'warning');
    } finally {
      setLogoUploading(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (!confirm('Remove the institution logo?')) return;
    setLogoUploading(true);
    try {
      const res = await adminApi.deleteLogo();
      if (res) setSettingsData((prev) => ({ ...prev, ...res }));
      if (onInstitutionUpdated) onInstitutionUpdated();
      if (showToast) showToast('Institution logo removed.', 'info');
    } catch (err) {
      if (showToast) showToast(err.message || 'Failed to remove logo.', 'warning');
    } finally {
      setLogoUploading(false);
    }
  };

  // ================= ATTENDANCE RECORD HANDLERS =================
  const handleOpenAddAttendance = () => {
    setAttendanceFormData({
      student_id: students[0]?.id || '',
      class_name: classes[0]?.name || '',
      subject_name: subjects[0]?.name || '',
      status: 'PRESENT',
      method: 'MANUAL',
      date: new Date().toISOString().split('T')[0],
    });
    setShowAddAttendanceModal(true);
  };

  const handleCreateAttendance = async (e) => {
    e.preventDefault();
    if (!attendanceFormData.student_id) return;
    setAttendanceSubmitting(true);
    try {
      await adminApi.createAttendanceRecord(attendanceFormData);
      setShowAddAttendanceModal(false);
      fetchAttendanceLogs();
      if (showToast) showToast(`Attendance marked for student ${attendanceFormData.student_id}.`, 'success');
    } catch (err) {
      if (showToast) showToast(err.message || 'Failed to record attendance.', 'warning');
    } finally {
      setAttendanceSubmitting(false);
    }
  };

  const handleToggleAttendanceStatus = async (record) => {
    const nextStatus = record.status === 'PRESENT' ? 'ABSENT' : (record.status === 'ABSENT' ? 'LATE' : 'PRESENT');
    try {
      await adminApi.updateAttendanceRecord(record.id, { status: nextStatus });
      fetchAttendanceLogs();
      if (showToast) showToast(`Attendance for ${record.student_name} set to ${nextStatus}.`, 'info');
    } catch (err) {
      if (showToast) showToast(err.message || 'Failed to update record.', 'warning');
    }
  };

  const handleDeleteAttendance = async (id) => {
    if (!confirm(`Delete attendance record ${id}?`)) return;
    try {
      await adminApi.deleteAttendanceRecord(id);
      fetchAttendanceLogs();
      if (showToast) showToast('Attendance record removed.', 'info');
    } catch (err) {
      if (showToast) showToast(err.message || 'Failed to delete record.', 'warning');
    }
  };

  // ================= SAVE SETTINGS & REFRESH BRANDING =================
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSettingsSaving(true);
    try {
      const res = await adminApi.updateSettings(settingsData);
      if (res) {
        setSettingsData(prev => ({ ...prev, ...res }));
      }
      if (onInstitutionUpdated) onInstitutionUpdated();
      if (showToast) showToast('Institution configuration and attendance policies updated successfully!', 'success');
      fetchDatabaseSummary();
    } catch (err) {
      if (showToast) showToast(err.message || 'Failed to update system settings.', 'warning');
    } finally {
      setSettingsSaving(false);
    }
  };

  // ================= DOWNLOAD ATTENDANCE REPORT =================
  const [downloadingReport, setDownloadingReport] = useState(false);

  const handleDownloadAttendanceReport = async () => {
    setDownloadingReport(true);
    try {
      if (showToast) showToast('Preparing full academic attendance report download...', 'info');
      await adminApi.downloadAttendanceCsv();
      if (showToast) showToast('Attendance report CSV downloaded successfully!', 'success');
    } catch (err) {
      if (showToast) showToast(err.message || 'Failed to download report.', 'warning');
    } finally {
      setDownloadingReport(false);
    }
  };

  // ================= CLEAR ATTENDANCE DATABASE =================
  const handleClearAttendance = async () => {
    if (!window.confirm('⚠️ ARE YOU SURE? This will permanently wipe all recorded attendance logs and session records in the database for the new semester.\n\nMake sure to click "Download Semester Backup (CSV)" before proceeding!\n\nDo you want to proceed?')) {
      return;
    }
    setClearingAttendance(true);
    try {
      const res = await adminApi.clearAttendanceRecords();
      if (showToast) showToast(res?.message || 'All attendance records successfully wiped for new semester.', 'success');
      fetchDatabaseSummary();
      fetchAttendanceLogs();
      fetchDashboard();
    } catch (err) {
      if (showToast) showToast(err.message || 'Failed to clear attendance records.', 'warning');
    } finally {
      setClearingAttendance(false);
    }
  };

  // Filtered attendance records
  const filteredAttendance = attendanceLogs.filter(log => {
    if (!attendanceSearch.trim()) return true;
    const term = attendanceSearch.toLowerCase();
    return (
      log.student_name?.toLowerCase().includes(term) ||
      log.student_id?.toLowerCase().includes(term) ||
      log.subject?.toLowerCase().includes(term) ||
      log.class_name?.toLowerCase().includes(term)
    );
  });

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
            <img
              src={assetUrl(institutionInfo?.logo_url || settingsData.logo_url) || '/campussync-logo.svg'}
              alt={`${institutionInfo?.college_name || settingsData.college_name || 'CampusSync'} logo`}
              className="h-9 w-9 rounded-xl object-contain bg-white p-0.5 shadow-md shadow-blue-600/30"
            />
            <div>
              <h2 className="text-base font-bold text-white tracking-tight leading-none">{institutionInfo?.college_short_name || settingsData.college_short_name || 'CampusSync'}</h2>
              <span className="text-[10px] font-semibold text-blue-400 uppercase tracking-wider">Admin Console</span>
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

        {/* Admin Badge Info */}
        <div className="p-4 mx-4 my-4 bg-slate-800/60 rounded-xl border border-slate-700/50 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-md shrink-0">
            AD
          </div>
          <div className="overflow-hidden">
            <h4 className="text-sm font-semibold text-white truncate">System Administrator</h4>
            <p className="text-xs text-slate-400 font-mono">Master Institutional Access</p>
          </div>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          <button
            onClick={() => { setActiveTab('dashboard'); setMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'dashboard' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20 font-semibold' : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-200'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </button>

          <button
            onClick={() => { setActiveTab('students'); setMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'students' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20 font-semibold' : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            Students Management
          </button>

          <button
            onClick={() => { setActiveTab('teachers'); setMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'teachers' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20 font-semibold' : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-200'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            Faculty Directory
          </button>

          <button
            onClick={() => { setActiveTab('classes'); setMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'classes' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20 font-semibold' : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            Classes & Batches
          </button>

          <button
            onClick={() => { setActiveTab('subjects'); setMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'subjects' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20 font-semibold' : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Course Subjects
          </button>

          <button
            onClick={() => { setActiveTab('departments'); setMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'departments' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20 font-semibold' : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-200'
            }`}
          >
            <Building2 className="w-4 h-4" />
            Departments
          </button>

          <button
            onClick={() => { setActiveTab('batches'); setMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'batches' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20 font-semibold' : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-200'
            }`}
          >
            <CalendarRange className="w-4 h-4" />
            Admission Batches
          </button>

          <button
            onClick={() => { setActiveTab('assignments'); setMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'assignments' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20 font-semibold' : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-200'
            }`}
          >
            <Link2 className="w-4 h-4" />
            Assign Classes
          </button>

          <button
            onClick={() => { setActiveTab('registration'); setMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'registration' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20 font-semibold' : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-200'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            Student Registration
          </button>

          <button
            onClick={() => { setActiveTab('attendance'); setMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'attendance' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20 font-semibold' : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-200'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            Attendance Records & Logs
          </button>

          <button
            onClick={() => { setActiveTab('reports'); setMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'reports' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20 font-semibold' : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-200'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Reports & Defaulters
          </button>

          <button
            onClick={() => { setActiveTab('settings'); setMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'settings' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20 font-semibold' : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-200'
            }`}
          >
            <Settings className="w-4 h-4" />
            System Settings
          </button>
        </nav>

        {/* Footer Logout */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 shrink-0">
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-all"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
            >
              <Menu className="w-5 h-5" />
            </button>
            {activeTab !== 'dashboard' && <button type="button" onClick={() => setActiveTab('dashboard')} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50" aria-label="Back to dashboard"><ArrowLeft className="h-4 w-4" /><span className="hidden sm:inline">Back</span></button>}
            <h1 className="text-lg font-bold text-slate-800 capitalize">
              {activeTab === 'dashboard' && 'Campus Administration Overview'}
              {activeTab === 'students' && 'Students Directory & Management'}
              {activeTab === 'teachers' && 'Faculty Members & Allocations'}
              {activeTab === 'classes' && 'Academic Classes & Sections'}
              {activeTab === 'subjects' && 'Course Subjects & Curriculum'}
              {activeTab === 'departments' && 'Departments & Academic Units'}
              {activeTab === 'batches' && 'Admission Batches'}
              {activeTab === 'assignments' && 'Assign Classes to Faculty'}
              {activeTab === 'registration' && 'Student Registration & Approvals'}
              {activeTab === 'attendance' && 'Attendance Database & Records'}
              {activeTab === 'reports' && 'Institutional Reports & Analytics'}
              {activeTab === 'settings' && 'Institutional System Configuration'}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5 border-r border-slate-200 pr-3 min-w-0">
              <img
                src={assetUrl(institutionInfo?.logo_url || settingsData.logo_url) || '/campussync-logo.svg'}
                alt="Institution logo"
                className="h-9 w-9 rounded-lg object-contain"
              />
              <div className="leading-tight min-w-0">
                <p className="text-sm font-bold text-slate-900 max-w-[160px] sm:max-w-[220px] truncate">{institutionInfo?.college_name || settingsData.college_name || 'CampusSync University'}</p>
                <p className="text-[11px] text-slate-400">Administration</p>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Database Online & Synced
            </div>
            <button
              onClick={() => {
                if (activeTab === 'dashboard') fetchDashboard();
                else if (activeTab === 'students') fetchStudents();
                else if (activeTab === 'teachers') fetchTeachers();
                else if (activeTab === 'classes') fetchClasses();
                else if (activeTab === 'subjects') fetchSubjects();
                else if (activeTab === 'attendance') fetchAttendanceLogs();
              }}
              title="Refresh Data"
              className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg border border-slate-200 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Scrollable View Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* ========================================================================= */}
          {/* TAB: DASHBOARD OVERVIEW */}
          {/* ========================================================================= */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Students</p>
                    <h3 className="text-2xl font-bold text-slate-900 mt-1">
                      {dashboardLoading ? <Loader2 className="w-5 h-5 animate-spin text-blue-600" /> : (dashboardData?.total_students ?? students.length)}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">Enrolled across departments</p>
                  </div>
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                    <Users className="w-6 h-6" />
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Faculty Members</p>
                    <h3 className="text-2xl font-bold text-slate-900 mt-1">
                      {dashboardLoading ? <Loader2 className="w-5 h-5 animate-spin text-indigo-600" /> : (dashboardData?.total_teachers ?? teachers.length)}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">Active instructors</p>
                  </div>
                  <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                    <UserCheck className="w-6 h-6" />
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Academic Classes</p>
                    <h3 className="text-2xl font-bold text-slate-900 mt-1">
                      {dashboardLoading ? <Loader2 className="w-5 h-5 animate-spin text-emerald-600" /> : (dashboardData?.total_classes ?? classes.length)}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">Batch sections</p>
                  </div>
                  <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                    <Layers className="w-6 h-6" />
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Campus Attendance</p>
                    <h3 className="text-2xl font-bold text-slate-900 mt-1">
                      {dashboardLoading ? <Loader2 className="w-5 h-5 animate-spin text-amber-600" /> : `${dashboardData?.overall_attendance !== undefined ? dashboardData.overall_attendance : '—'}%`}
                    </h3>
                    <p className="text-xs text-emerald-600 font-semibold mt-1">Meeting 75% requirement</p>
                  </div>
                  <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                    <BarChart3 className="w-6 h-6" />
                  </div>
                </div>
              </div>

              {/* Quick Actions Bar */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="text-sm font-bold text-slate-800 mb-3">Quick Database Actions</h3>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => { setActiveTab('students'); handleOpenAddStudent(); }}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
                  >
                    <UserPlus className="w-4 h-4" /> Add New Student
                  </button>
                  <button
                    onClick={() => { setActiveTab('teachers'); handleOpenAddTeacher(); }}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Add New Faculty
                  </button>
                  <button
                    onClick={() => { setActiveTab('classes'); handleOpenAddClass(); }}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Add Class Section
                  </button>
                  <button
                    onClick={() => { setActiveTab('subjects'); handleOpenAddSubject(); }}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Add Course Subject
                  </button>
                  <button
                    onClick={() => { setActiveTab('assignments'); }}
                    className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
                  >
                    <Link2 className="w-4 h-4" /> Assign Class to Faculty
                  </button>
                  <button
                    onClick={() => { setActiveTab('registration'); }}
                    className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
                  >
                    <UserPlus className="w-4 h-4" /> Student Registration Link
                  </button>
                  <button
                    onClick={() => { setActiveTab('attendance'); handleOpenAddAttendance(); }}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Mark Direct Attendance
                  </button>
                </div>
              </div>

              {/* Summary Lists Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Students */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                    <h4 className="text-sm font-bold text-slate-900">Enrolled Students Overview</h4>
                    <button
                      onClick={() => setActiveTab('students')}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                    >
                      Manage All ({students.length}) &rarr;
                    </button>
                  </div>
                  <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                    {students.slice(0, 5).map(s => (
                      <div key={s.id} className="p-3 px-4 flex items-center justify-between hover:bg-slate-50">
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{s.name}</p>
                          <p className="text-xs text-slate-400 font-mono">{s.id} • {s.class_name || 'CSE-3A'}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700">
                            {s.attendance_percentage ?? 0}% Present
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent Faculty */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                    <h4 className="text-sm font-bold text-slate-900">Faculty Members</h4>
                    <button
                      onClick={() => setActiveTab('teachers')}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                    >
                      Manage All ({teachers.length}) &rarr;
                    </button>
                  </div>
                  <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                    {teachers.slice(0, 5).map(t => (
                      <div key={t.id} className="p-3 px-4 flex items-center justify-between hover:bg-slate-50">
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{t.name}</p>
                          <p className="text-xs text-slate-400">
                            {(Array.isArray(t.departments) && t.departments.length > 0 ? t.departments : [t.department]).filter(Boolean).join(', ')}
                          </p>
                        </div>
                        <span className="text-xs text-slate-500 font-mono">{t.id}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB: STUDENTS MANAGEMENT */}
          {/* ========================================================================= */}
          {activeTab === 'students' && (
            <div className="space-y-4">
              {/* Header Controls */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    placeholder="Search by ID, name or email..."
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={handleOpenAddStudent}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Add Student
                  </button>
                </div>
              </div>

              {/* Students Table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        <th className="py-3 px-4">Student ID</th>
                        <th className="py-3 px-4">Name & Email</th>
                        <th className="py-3 px-4">Class / Section</th>
                        <th className="py-3 px-4">Department</th>
                        <th className="py-3 px-4">Phone</th>
                        <th className="py-3 px-4">Attendance %</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {studentsLoading ? (
                        <tr>
                          <td colSpan="7" className="py-8 text-center text-slate-400">
                            <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
                            Loading student database records...
                          </td>
                        </tr>
                      ) : students.length === 0 ? (
                        <tr>
                          <td colSpan="7" className="py-8 text-center text-slate-400">
                            No student records found in database. Click "Add Student" above to enroll.
                          </td>
                        </tr>
                      ) : (
                        students.map(s => (
                          <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 px-4 font-mono font-bold text-blue-600">{s.id}</td>
                            <td className="py-3 px-4">
                              <p className="font-semibold text-slate-900">{s.name}</p>
                              <p className="text-xs text-slate-400">{s.email}</p>
                              {s.roll_number && (
                                <p className="text-[11px] text-slate-400 font-mono">Roll {s.roll_number}</p>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700">
                                {s.class_name || `${s.year} - ${s.section}`}
                              </span>
                              {s.batch_name && (
                                <p className="text-[11px] text-slate-400 mt-1">Batch {s.batch_name}</p>
                              )}
                            </td>
                            <td className="py-3 px-4 text-xs text-slate-600">{s.department}</td>
                            <td className="py-3 px-4 text-xs text-slate-600 font-mono">{s.phone || '—'}</td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${
                                (s.attendance_percentage ?? 0) >= 75 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                              }`}>
                                {s.attendance_percentage ?? 0}%
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right space-x-2">
                              <button
                                onClick={() => handleOpenEditStudent(s)}
                                title="Edit Student"
                                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors inline-flex items-center"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteStudent(s.id, s.name)}
                                title="Delete Student"
                                className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors inline-flex items-center"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB: FACULTY DIRECTORY */}
          {/* ========================================================================= */}
          {activeTab === 'teachers' && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Faculty Members & Teaching Staff</h3>
                  <p className="text-xs text-slate-400">Manage instructors, departments, and course allocations</p>
                </div>
                <button
                  onClick={handleOpenAddTeacher}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-colors"
                >
                  <Plus className="w-4 h-4" /> Add Faculty
                </button>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        <th className="py-3 px-4">Faculty ID</th>
                        <th className="py-3 px-4">Name & Email</th>
                        <th className="py-3 px-4">Department</th>
                        <th className="py-3 px-4">Phone</th>
                        <th className="py-3 px-4">Assigned Subjects</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {teachersLoading ? (
                        <tr>
                          <td colSpan="6" className="py-8 text-center text-slate-400">
                            <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-600 mb-2" />
                            Loading faculty list...
                          </td>
                        </tr>
                      ) : teachers.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="py-8 text-center text-slate-400">
                            No faculty members registered. Click "Add Faculty" above.
                          </td>
                        </tr>
                      ) : (
                        teachers.map(t => (
                          <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 px-4 font-mono font-bold text-indigo-600">{t.id}</td>
                            <td className="py-3 px-4">
                              <p className="font-semibold text-slate-900">{t.name}</p>
                              <p className="text-xs text-slate-400">{t.email}</p>
                            </td>
                            <td className="py-3 px-4 text-xs text-slate-700 font-medium">
                              {(Array.isArray(t.departments) && t.departments.length > 0 ? t.departments : [t.department]).filter(Boolean).join(', ')}
                            </td>
                            <td className="py-3 px-4 text-xs text-slate-600 font-mono">{t.phone || '—'}</td>
                            <td className="py-3 px-4">
                              <div className="flex flex-wrap gap-1">
                                {Array.isArray(t.subjects) && t.subjects.length > 0 ? (
                                  t.subjects.map((subj, idx) => (
                                    <span key={idx} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">
                                      {subj}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-xs text-slate-400">None assigned</span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-right space-x-2">
                              <button
                                onClick={() => handleOpenEditTeacher(t)}
                                title="Edit Faculty"
                                className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors inline-flex items-center"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteTeacher(t.id, t.name)}
                                title="Delete Faculty"
                                className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors inline-flex items-center"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB: CLASSES & BATCHES */}
          {/* ========================================================================= */}
          {activeTab === 'classes' && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Academic Classes & Sections</h3>
                  <p className="text-xs text-slate-400">Manage course sections, batches, and student allocations</p>
                </div>
                <button
                  onClick={handleOpenAddClass}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-colors"
                >
                  <Plus className="w-4 h-4" /> Add Class Section
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {classes.map(c => (
                  <div key={c.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-lg font-bold text-slate-900">{c.name}</h4>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEditClass(c)}
                          className="p-1 text-slate-400 hover:text-emerald-600 rounded"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteClass(c.id, c.name)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 mb-4">{c.department}</p>
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                      <span className="text-slate-500 font-medium">Batch: {c.batch_name || c.year || '—'}{c.section ? ` • Sec: ${c.section}` : ''}</span>
                      <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                        {c.total_students ?? 0} Students
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB: COURSE SUBJECTS */}
          {/* ========================================================================= */}
          {activeTab === 'subjects' && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Academic Subjects & Curriculum</h3>
                  <p className="text-xs text-slate-400">Define course subjects and curriculum codes</p>
                </div>
                <button
                  onClick={handleOpenAddSubject}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-colors"
                >
                  <Plus className="w-4 h-4" /> Add Subject
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {subjects.map(s => (
                  <div key={s.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                        {s.code}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEditSubject(s)}
                          className="p-1 text-slate-400 hover:text-purple-600 rounded"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteSubject(s.id, s.name)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <h4 className="text-base font-bold text-slate-900 mb-1">{s.name}</h4>
                    <p className="text-xs text-slate-500">{s.department}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB: DEPARTMENTS */}
          {/* ========================================================================= */}
          {activeTab === 'departments' && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Academic Departments</h3>
                  <p className="text-xs text-slate-400">Students, faculty, classes and subjects pick their department from this list.</p>
                </div>
                <button
                  onClick={handleOpenAddDepartment}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-colors"
                >
                  <Plus className="w-4 h-4" /> Add Department
                </button>
              </div>

              {departmentsLoading ? (
                <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
                  Loading departments...
                </div>
              ) : departments.length === 0 ? (
                <div className="bg-white p-10 rounded-2xl border border-slate-200 text-center">
                  <Building2 className="w-10 h-10 mx-auto text-slate-300 mb-3" />
                  <p className="font-bold text-slate-800">No departments yet</p>
                  <p className="text-xs text-slate-500 mt-1">Add CSE, ECE and the rest of your academic units to start enrolling students.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {departments.map((department) => (
                    <div key={department.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                          {department.code}
                        </span>
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleOpenEditDepartment(department)} className="p-1 text-slate-400 hover:text-blue-600 rounded" title="Edit department">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeleteDepartment(department)} className="p-1 text-slate-400 hover:text-rose-600 rounded" title="Delete department">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <h4 className="text-base font-bold text-slate-900 mb-3 leading-snug">{department.name}</h4>
                      <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                        <span className="text-slate-500 font-medium">{department.batch_count ?? 0} batches</span>
                        <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                          {students.filter((student) => student.department === department.name).length} students
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB: ADMISSION BATCHES */}
          {/* ========================================================================= */}
          {activeTab === 'batches' && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Admission Batches</h3>
                  <p className="text-xs text-slate-400">Year ranges per department, e.g. CSE 2024-2028. Classes and students can be linked to a batch.</p>
                </div>
                <button
                  onClick={handleOpenAddBatch}
                  disabled={departments.length === 0}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-colors disabled:opacity-60"
                >
                  <Plus className="w-4 h-4" /> Add Batch
                </button>
              </div>

              {batchesLoading ? (
                <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-emerald-600 mb-2" />
                  Loading batches...
                </div>
              ) : batches.length === 0 ? (
                <div className="bg-white p-10 rounded-2xl border border-slate-200 text-center">
                  <CalendarRange className="w-10 h-10 mx-auto text-slate-300 mb-3" />
                  <p className="font-bold text-slate-800">No batches yet</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {departments.length === 0 ? 'Add a department first, then create its admission batches.' : 'Create batches like 2024-2028 for each department.'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {batches.map((batch) => (
                    <div key={batch.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-black text-slate-900 tracking-tight">{batch.name}</span>
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleOpenEditBatch(batch)} className="p-1 text-slate-400 hover:text-emerald-600 rounded" title="Edit batch">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeleteBatch(batch)} className="p-1 text-slate-400 hover:text-rose-600 rounded" title="Delete batch">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 mb-3">{batch.department_name} {batch.department_code ? `(${batch.department_code})` : ''}</p>
                      <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                        <span className="text-slate-500 font-medium">{batch.class_count ?? 0} classes</span>
                        <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                          {students.filter((student) => String(student.batch_id) === String(batch.id)).length} students
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB: ASSIGN CLASSES TO FACULTY */}
          {/* ========================================================================= */}
          {activeTab === 'assignments' && (
            <div className="space-y-6">
              <form onSubmit={handleAssignTeacher} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Assign a Class to a Teacher</h3>
                  <p className="text-xs text-slate-400">Pick a faculty member, one of their classes and the subjects they teach there. They immediately see the class and can announce to it.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Faculty Member *</label>
                    <select
                      value={assignmentFormData.teacher_id}
                      onChange={(e) => setAssignmentFormData({ ...assignmentFormData, teacher_id: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    >
                      <option value="">Choose a teacher</option>
                      {teachers.map((teacher) => (
                        <option key={teacher.id} value={teacher.id}>
                          {teacher.name} ({teacher.id}){Array.isArray(teacher.departments) && teacher.departments.length > 0 ? ` · ${teacher.departments.join(', ')}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Class Section *</label>
                    <select
                      value={assignmentFormData.class_id}
                      onChange={(e) => setAssignmentFormData({ ...assignmentFormData, class_id: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    >
                      <option value="">Choose a class</option>
                      {classes.map((cls) => (
                        <option key={cls.id} value={cls.id}>{cls.name} {cls.batch_name ? `· ${cls.batch_name}` : ''}{cls.section ? ` · Section ${cls.section}` : ''}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Subjects Taught in This Class *</label>
                  {subjects.length === 0 ? (
                    <p className="text-xs text-slate-400">Add course subjects first.</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {subjects.map((subject) => {
                        const isSelected = assignmentFormData.subject_ids.includes(subject.id);
                        return (
                          <button
                            type="button"
                            key={subject.id}
                            onClick={() => toggleAssignmentSubject(subject.id)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border flex items-center gap-1 ${
                              isSelected ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm' : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3" />}
                            {subject.name} ({subject.code})
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-2 border-t border-slate-100">
                  <button
                    type="submit"
                    disabled={assignmentSubmitting}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-sm disabled:opacity-70"
                  >
                    {assignmentSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                    Assign to Faculty
                  </button>
                </div>
              </form>

              {assignmentsError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {assignmentsError}
                </div>
              )}

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <h4 className="text-sm font-bold text-slate-900">Current Assignments ({assignments.length})</h4>
                  <select
                    value={assignmentFilterTeacher}
                    onChange={(e) => setAssignmentFilterTeacher(e.target.value)}
                    className="px-3 py-2 border border-slate-300 rounded-xl text-sm bg-white text-slate-700"
                  >
                    <option value="All">All faculty</option>
                    {teachers.map((teacher) => (
                      <option key={teacher.id} value={teacher.id}>{teacher.name}</option>
                    ))}
                  </select>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        <th className="py-3 px-4">Faculty</th>
                        <th className="py-3 px-4">Class</th>
                        <th className="py-3 px-4">Subject</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {assignmentsLoading ? (
                        <tr>
                          <td colSpan="4" className="py-8 text-center text-slate-400">
                            <Loader2 className="w-5 h-5 animate-spin mx-auto text-indigo-600 mb-2" />
                            Loading assignments...
                          </td>
                        </tr>
                      ) : assignments.filter((row) => assignmentFilterTeacher === 'All' || row.teacher_id === assignmentFilterTeacher).length === 0 ? (
                        <tr>
                          <td colSpan="4" className="py-8 text-center text-slate-400">
                            No class assignments yet. Use the form above to assign a class.
                          </td>
                        </tr>
                      ) : (
                        assignments
                          .filter((row) => assignmentFilterTeacher === 'All' || row.teacher_id === assignmentFilterTeacher)
                          .map((row) => (
                            <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-3 px-4">
                                <p className="font-semibold text-slate-900">{row.teacher_name}</p>
                                <p className="text-xs text-slate-400 font-mono">{row.teacher_id}</p>
                              </td>
                              <td className="py-3 px-4">
                                <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700">{row.class_name}</span>
                              </td>
                              <td className="py-3 px-4 text-xs text-slate-700">
                                {row.subject_name}{row.subject_code ? ` (${row.subject_code})` : ''}
                              </td>
                              <td className="py-3 px-4 text-right">
                                <button
                                  onClick={() => handleDeleteAssignment(row)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors inline-flex items-center"
                                  title="Remove assignment"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB: STUDENT REGISTRATION & APPROVALS */}
          {/* ========================================================================= */}
          {activeTab === 'registration' && (
            <div className="space-y-6">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Student Registration Link</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Generate a link and share it with applicants. They fill their name, batch, section, college email,
                    registration number, roll number and the password they want. Applicants only see the departments,
                    batches and sections you created here. Their registration number becomes their login ID.
                  </p>
                </div>
                <form onSubmit={handleCreateRegistrationLink} className="flex flex-col sm:flex-row gap-3">
                  <input
                    value={registrationLabel}
                    onChange={(e) => setRegistrationLabel(e.target.value)}
                    maxLength={120}
                    placeholder="Link name, e.g. B.Tech 2026 admissions"
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={registrationSubmitting}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm disabled:opacity-70"
                  >
                    {registrationSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                    Generate link
                  </button>
                </form>
                <p className="text-[11px] text-slate-400">
                  No email is sent by CampusSync. A rejection reason is saved and shown to the student on the same link,
                  and to office staff here.
                </p>
              </div>

              {registrationError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {registrationError}
                </div>
              )}

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-3">
                  <h4 className="text-sm font-bold text-slate-900">Registration Links ({registrationLinks.length})</h4>
                  <button
                    type="button"
                    onClick={fetchRegistrationData}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${registrationLoading ? 'animate-spin' : ''}`} /> Refresh
                  </button>
                </div>
                {registrationLoading && registrationLinks.length === 0 ? (
                  <div className="p-8 text-center text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto text-blue-600 mb-2" />
                    Loading links...
                  </div>
                ) : registrationLinks.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    No registration link yet. Generate one above and share the URL.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {registrationLinks.map((link) => (
                      <div key={link.id} className="p-4 flex flex-col lg:flex-row lg:items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-slate-900">{link.label || 'Student registration'}</p>
                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${link.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                              {link.is_active ? 'Open' : 'Closed'}
                            </span>
                            <span className="text-[11px] text-slate-400">{link.request_count} applications · {link.pending_count} pending</span>
                          </div>
                          <code className="block text-[11px] font-mono text-slate-500 truncate mt-1">{registrationUrl(link)}</code>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => copyRegistrationUrl(link)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-semibold hover:bg-blue-100"
                          >
                            <Copy className="w-3.5 h-3.5" /> {copiedLinkId === link.id ? 'Copied' : 'Copy'}
                          </button>
                          <a
                            href={link.path}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-xs font-semibold hover:bg-slate-200"
                          >
                            <ExternalLink className="w-3.5 h-3.5" /> Open
                          </a>
                          <button
                            type="button"
                            onClick={() => handleToggleRegistrationLink(link)}
                            className="px-2.5 py-1.5 rounded-lg bg-amber-50 text-amber-700 text-xs font-semibold hover:bg-amber-100"
                          >
                            {link.is_active ? 'Close' : 'Reopen'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRegistrationLink(link)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded"
                            title="Delete link"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Applications ({registrationRequests.length})</h4>
                    <p className="text-xs text-slate-400">Approve to create the student login, or reject with a reason.</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {['pending', 'approved', 'rejected', 'all'].map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setRegistrationFilter(value)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold capitalize ${
                          registrationFilter === value ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        <th className="py-3 px-4">Applicant</th>
                        <th className="py-3 px-4">IDs</th>
                        <th className="py-3 px-4">Batch & Section</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Decision</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {(() => {
                        const rows = registrationRequests.filter((item) => registrationFilter === 'all' || item.status === registrationFilter);
                        if (registrationLoading && rows.length === 0) {
                          return (
                            <tr>
                              <td colSpan="5" className="py-8 text-center text-slate-400">
                                <Loader2 className="w-5 h-5 animate-spin mx-auto text-blue-600 mb-2" />
                                Loading applications...
                              </td>
                            </tr>
                          );
                        }
                        if (rows.length === 0) {
                          return (
                            <tr>
                              <td colSpan="5" className="py-8 text-center text-slate-400">
                                No {registrationFilter === 'all' ? '' : registrationFilter} applications.
                              </td>
                            </tr>
                          );
                        }
                        return rows.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50/80 transition-colors align-top">
                            <td className="py-3 px-4">
                              <p className="font-semibold text-slate-900">{item.name}</p>
                              <p className="text-xs text-slate-400">{item.email}</p>
                              <p className="text-[10px] text-slate-300 font-mono mt-0.5">{item.id.slice(0, 8)}</p>
                            </td>
                            <td className="py-3 px-4 text-xs">
                              <p className="font-mono text-slate-700">{item.registration_number}</p>
                              <p className="text-slate-400 font-mono">Roll {item.roll_number}</p>
                            </td>
                            <td className="py-3 px-4 text-xs">
                              <p className="text-slate-700">{item.batch_name || '—'}</p>
                              <p className="text-slate-400">{item.department}{item.section ? ` · Sec ${item.section}` : ''}</p>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`inline-flex items-center gap-1 text-[11px] font-bold uppercase px-2 py-0.5 rounded ${
                                item.status === 'approved' ? 'bg-emerald-50 text-emerald-700' :
                                item.status === 'rejected' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'
                              }`}>
                                {item.status === 'approved' && <CheckCircle2 className="w-3 h-3" />}
                                {item.status === 'rejected' && <XCircle className="w-3 h-3" />}
                                {item.status === 'pending' && <Clock className="w-3 h-3" />}
                                {item.status}
                              </span>
                              {item.status === 'rejected' && item.decision_reason && (
                                <p className="text-[11px] text-rose-700 mt-1 max-w-[16rem] whitespace-pre-line">{item.decision_reason}</p>
                              )}
                              {item.status === 'approved' && item.student_id && (
                                <p className="text-[11px] text-emerald-700 mt-1 font-mono">{item.student_id}</p>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right">
                              {item.status === 'pending' ? (
                                <div className="inline-flex gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleApproveRegistration(item)}
                                    disabled={decidingId === item.id}
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-60"
                                  >
                                    {decidingId === item.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                    Approve
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenReject(item)}
                                    disabled={decidingId === item.id}
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-50 text-rose-700 text-xs font-semibold hover:bg-rose-100 disabled:opacity-60"
                                  >
                                    <XCircle className="w-3.5 h-3.5" />
                                    Reject
                                  </button>
                                </div>
                              ) : (
                                <span className="text-[11px] text-slate-400">
                                  {item.decided_at ? new Date(item.decided_at).toLocaleDateString() : '—'}
                                </span>
                              )}
                            </td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB: ATTENDANCE RECORDS & LOGS */}
          {/* ========================================================================= */}
          {activeTab === 'attendance' && (
            <div className="space-y-4">
              {/* Controls */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                  <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                    <input
                      type="text"
                      value={attendanceSearch}
                      onChange={(e) => setAttendanceSearch(e.target.value)}
                      placeholder="Search student or subject..."
                      className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <select
                    value={logFilterClass}
                    onChange={(e) => setLogFilterClass(e.target.value)}
                    className="px-3 py-2 border border-slate-300 rounded-xl text-sm bg-white text-slate-700"
                  >
                    <option value="All">All Classes</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>

                  <select
                    value={logFilterStatus}
                    onChange={(e) => setLogFilterStatus(e.target.value)}
                    className="px-3 py-2 border border-slate-300 rounded-xl text-sm bg-white text-slate-700"
                  >
                    <option value="All">All Statuses</option>
                    <option value="PRESENT">Present</option>
                    <option value="ABSENT">Absent</option>
                    <option value="LATE">Late</option>
                  </select>
                </div>

                <button
                  onClick={handleOpenAddAttendance}
                  className="w-full md:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-colors"
                >
                  <Plus className="w-4 h-4" /> Mark New Attendance Entry
                </button>
              </div>

              {/* Attendance Table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        <th className="py-3 px-4">Student ID & Name</th>
                        <th className="py-3 px-4">Class</th>
                        <th className="py-3 px-4">Subject</th>
                        <th className="py-3 px-4">Date & Time</th>
                        <th className="py-3 px-4">Method</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {attendanceLoading ? (
                        <tr>
                          <td colSpan="7" className="py-8 text-center text-slate-400">
                            <Loader2 className="w-6 h-6 animate-spin mx-auto text-amber-600 mb-2" />
                            Loading attendance records...
                          </td>
                        </tr>
                      ) : filteredAttendance.length === 0 ? (
                        <tr>
                          <td colSpan="7" className="py-8 text-center text-slate-400">
                            No attendance records match the selected filters.
                          </td>
                        </tr>
                      ) : (
                        filteredAttendance.map(r => (
                          <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 px-4">
                              <p className="font-semibold text-slate-900">{r.student_name}</p>
                              <p className="text-xs text-blue-600 font-mono font-bold">{r.student_id}</p>
                            </td>
                            <td className="py-3 px-4 text-xs font-medium text-slate-700">{r.class_name || 'CSE-3A'}</td>
                            <td className="py-3 px-4 text-xs text-slate-600">{r.subject}</td>
                            <td className="py-3 px-4 text-xs text-slate-500">
                              <p className="font-medium text-slate-700">{r.date}</p>
                              <p className="text-[11px] text-slate-400">{r.time}</p>
                            </td>
                            <td className="py-3 px-4">
                              <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700">
                                {r.method}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <button
                                onClick={() => handleToggleAttendanceStatus(r)}
                                title="Click to toggle status (Present / Absent / Late)"
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-transform active:scale-95 flex items-center gap-1 ${
                                  r.status === 'PRESENT' ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' :
                                  r.status === 'LATE' ? 'bg-amber-100 text-amber-800 hover:bg-amber-200' :
                                  'bg-rose-100 text-rose-800 hover:bg-rose-200'
                                }`}
                              >
                                {r.status === 'PRESENT' && <Check className="w-3.5 h-3.5" />}
                                {r.status === 'ABSENT' && <X className="w-3.5 h-3.5" />}
                                {r.status === 'LATE' && <Clock className="w-3.5 h-3.5" />}
                                {r.status}
                              </button>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                onClick={() => handleDeleteAttendance(r.id)}
                                title="Delete Record"
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors inline-flex items-center"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB: REPORTS & DEFAULTERS */}
          {/* ========================================================================= */}
          {/* ========================================================================= */}
          {/* TAB: REPORTS & DEFAULTERS */}
          {/* ========================================================================= */}
          {activeTab === 'reports' && (
            <div className="space-y-6">
              {/* Header with Export Action */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Institutional Attendance Reports</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Export master audit records or review exam defaulter thresholds</p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadAttendanceReport}
                  disabled={downloadingReport}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 transition-all flex items-center gap-2 disabled:opacity-75"
                >
                  {downloadingReport ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  Download Full Semester CSV Report
                </button>
              </div>

              {/* Defaulters Section */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Defaulters List (&lt; 75% Attendance)</h3>
                    <p className="text-xs text-slate-500">Students ineligible for semester examination under institutional compliance rules</p>
                  </div>
                  <span className="px-3 py-1 bg-rose-50 text-rose-700 font-bold rounded-lg text-xs border border-rose-200">
                    {students.filter(s => (s.attendance_percentage ?? 0) < 75).length} Defaulters
                  </span>
                </div>

                <div className="divide-y divide-slate-100">
                  {students.filter(s => (s.attendance_percentage ?? 0) < 75).length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-sm">
                      🎉 No defaulters found! All enrolled students meet the &ge; 75% requirement.
                    </div>
                  ) : (
                    students
                      .filter(s => (s.attendance_percentage ?? 0) < 75)
                      .map(s => (
                        <div key={s.id} className="py-3.5 flex items-center justify-between hover:bg-slate-50/50 px-2 rounded-lg transition-colors">
                          <div>
                            <p className="text-sm font-bold text-slate-900">{s.name}</p>
                            <p className="text-xs text-slate-500 font-mono mt-0.5">{s.id} • {s.class_name || 'CSE-3A'} • {s.email}</p>
                          </div>
                          <span className="px-3 py-1 bg-rose-100 text-rose-800 font-bold rounded-lg text-xs">
                            {s.attendance_percentage ?? 0}%
                          </span>
                        </div>
                      ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB: SYSTEM SETTINGS & MULTI-COLLEGE DATABASE MANAGEMENT */}
          {/* ========================================================================= */}
          {activeTab === 'settings' && (
            <div className="space-y-6 max-w-5xl">

              {/* Institution Logo */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                  <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-200">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Institution Logo</h3>
                    <p className="text-xs text-slate-500">Shown in the header of every dashboard, on profile pages and on the sign-in screen</p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="w-20 h-20 rounded-xl border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
                    {settingsData.logo_url ? (
                      <img src={assetUrl(settingsData.logo_url)} alt="Institution logo" className="max-h-full max-w-full object-contain" />
                    ) : (
                      <ImageIcon className="w-7 h-7 text-slate-300" />
                    )}
                  </div>
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors">
                        {logoUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        {logoUploading ? 'Uploading…' : (settingsData.logo_url ? 'Replace logo' : 'Upload logo')}
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          className="hidden"
                          onChange={(e) => handleLogoUpload(e.target.files?.[0])}
                        />
                      </label>
                      {settingsData.logo_url && (
                        <button
                          type="button"
                          onClick={handleRemoveLogo}
                          disabled={logoUploading}
                          className="px-3 py-2 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors disabled:opacity-60"
                        >
                          Remove logo
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400">PNG, JPEG or WebP · up to 3 MB · square images look best</p>
                  </div>
                </div>
              </div>

              {/* Institution Identity & White-Label Branding */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-200">
                      <Building className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">Institution Identity & System Branding</h3>
                      <p className="text-xs text-slate-500">Configure college name, branding, and academic terms</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-semibold self-start sm:self-auto">
                    Live System Active
                  </span>
                </div>

                <form onSubmit={handleSaveSettings} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        <School className="w-3.5 h-3.5 text-blue-600" /> College / University Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={settingsData.college_name}
                        onChange={(e) => setSettingsData({ ...settingsData, college_name: e.target.value })}
                        placeholder="e.g. Indian Institute of Information Technology"
                        className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none bg-slate-50/50"
                      />
                      <p className="text-[11px] text-slate-400 mt-1">Displayed on Login, Header, Student & Faculty Portals.</p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-indigo-600" /> Short Name / Brand Acronym
                      </label>
                      <input
                        type="text"
                        value={settingsData.college_short_name}
                        onChange={(e) => setSettingsData({ ...settingsData, college_short_name: e.target.value })}
                        placeholder="e.g. IIITK / CampusSync"
                        className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none bg-slate-50/50"
                      />
                      <p className="text-[11px] text-slate-400 mt-1">Used in mobile headers and badge tags.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-emerald-600" /> Current Academic Session / Term
                      </label>
                      <input
                        type="text"
                        value={settingsData.academic_term}
                        onChange={(e) => setSettingsData({ ...settingsData, academic_term: e.target.value })}
                        placeholder="e.g. Autumn Semester 2026"
                        className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-slate-50/50"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-purple-600" /> Admin Contact / Support Email
                      </label>
                      <input
                        type="email"
                        value={settingsData.support_email}
                        onChange={(e) => setSettingsData({ ...settingsData, support_email: e.target.value })}
                        placeholder="admin@institution.edu"
                        className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-slate-50/50"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Portal Tagline / Subtitle
                    </label>
                    <input
                      type="text"
                      value={settingsData.system_tagline}
                      onChange={(e) => setSettingsData({ ...settingsData, system_tagline: e.target.value })}
                      placeholder="Smart Multi-Modal Attendance & Campus Management System"
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-slate-50/50"
                    />
                  </div>

                  {/* Attendance Thresholds */}
                  <div className="pt-4 border-t border-slate-100">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-blue-600" /> Attendance Policy Rules & Cutoffs
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">
                          Min. Exam Attendance (%)
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={settingsData.min_attendance_pct}
                          onChange={(e) => setSettingsData({ ...settingsData, min_attendance_pct: Number(e.target.value) })}
                          className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">
                          Late Arrival Grace (Mins)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="120"
                          value={settingsData.late_threshold_minutes}
                          onChange={(e) => setSettingsData({ ...settingsData, late_threshold_minutes: Number(e.target.value) })}
                          className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">
                          Session Timeout (Mins)
                        </label>
                        <input
                          type="number"
                          min="5"
                          max="300"
                          value={settingsData.session_timeout_minutes}
                          onChange={(e) => setSettingsData({ ...settingsData, session_timeout_minutes: Number(e.target.value) })}
                          className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex justify-end">
                    <button
                      type="submit"
                      disabled={settingsSaving}
                      className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition-all disabled:opacity-70"
                    >
                      {settingsSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Save All Settings & Synchronize
                    </button>
                  </div>
                </form>
              </div>

              {/* ================= WHOLE DATABASE OVERVIEW & MAINTENANCE ================= */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-200">
                      <Database className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">Database Master Entity Health & Control</h3>
                      <p className="text-xs text-slate-500">Live summary of all relational tables in PostgreSQL</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={fetchDatabaseSummary}
                    disabled={dbSummaryLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors self-start sm:self-auto"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${dbSummaryLoading ? 'animate-spin' : ''}`} />
                    Refresh Counters
                  </button>
                </div>

                {/* Entity Counts Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  <div 
                    onClick={() => setActiveTab('students')}
                    className="p-4 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-xl cursor-pointer transition-all"
                  >
                    <div className="flex items-center justify-between text-blue-600 mb-1">
                      <Users className="w-4 h-4" />
                      <span className="text-[10px] font-bold uppercase">Students</span>
                    </div>
                    <p className="text-2xl font-black text-slate-900">{dbSummary?.students_count ?? '—'}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Enrolled profiles</p>
                  </div>

                  <div 
                    onClick={() => setActiveTab('teachers')}
                    className="p-4 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-xl cursor-pointer transition-all"
                  >
                    <div className="flex items-center justify-between text-indigo-600 mb-1">
                      <UserCheck className="w-4 h-4" />
                      <span className="text-[10px] font-bold uppercase">Faculty</span>
                    </div>
                    <p className="text-2xl font-black text-slate-900">{dbSummary?.teachers_count ?? '—'}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Professors</p>
                  </div>

                  <div 
                    onClick={() => setActiveTab('classes')}
                    className="p-4 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-xl cursor-pointer transition-all"
                  >
                    <div className="flex items-center justify-between text-emerald-600 mb-1">
                      <Layers className="w-4 h-4" />
                      <span className="text-[10px] font-bold uppercase">Classes</span>
                    </div>
                    <p className="text-2xl font-black text-slate-900">{dbSummary?.classes_count ?? '—'}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Batches & Sections</p>
                  </div>

                  <div 
                    onClick={() => setActiveTab('subjects')}
                    className="p-4 bg-slate-50 hover:bg-purple-50 border border-slate-200 hover:border-purple-300 rounded-xl cursor-pointer transition-all"
                  >
                    <div className="flex items-center justify-between text-purple-600 mb-1">
                      <BookOpen className="w-4 h-4" />
                      <span className="text-[10px] font-bold uppercase">Subjects</span>
                    </div>
                    <p className="text-2xl font-black text-slate-900">{dbSummary?.subjects_count ?? '—'}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Courses</p>
                  </div>

                  <div 
                    onClick={() => setActiveTab('attendance')}
                    className="p-4 bg-slate-50 hover:bg-amber-50 border border-slate-200 hover:border-amber-300 rounded-xl cursor-pointer transition-all"
                  >
                    <div className="flex items-center justify-between text-amber-600 mb-1">
                      <ClipboardList className="w-4 h-4" />
                      <span className="text-[10px] font-bold uppercase">Logs</span>
                    </div>
                    <p className="text-2xl font-black text-slate-900">{dbSummary?.attendance_records_count ?? '—'}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Attendance logs</p>
                  </div>

                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                    <div className="flex items-center justify-between text-slate-600 mb-1">
                      <ShieldCheck className="w-4 h-4" />
                      <span className="text-[10px] font-bold uppercase">Users</span>
                    </div>
                    <p className="text-2xl font-black text-slate-900">{dbSummary?.users_count ?? '—'}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Total auth logins</p>
                  </div>
                </div>

                {/* Operations & Reset Zone */}
                <div className="p-5 bg-rose-50/80 border border-rose-200 rounded-2xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-rose-100 text-rose-700 rounded-xl shrink-0 mt-0.5">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-rose-900">Academic Semester Cycle & Reset Management</h4>
                      <p className="text-xs text-rose-700 mt-0.5 max-w-xl">
                        Archive and download full historical records before wiping attendance for a fresh academic semester. Student profiles, classes, and faculty credentials will be preserved.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                    <button
                      type="button"
                      onClick={handleDownloadAttendanceReport}
                      disabled={downloadingReport}
                      className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 shrink-0 disabled:opacity-75"
                    >
                      {downloadingReport ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4 text-blue-600" />}
                      Download Semester Backup (CSV)
                    </button>
                    <button
                      type="button"
                      onClick={handleClearAttendance}
                      disabled={clearingAttendance}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 shrink-0 disabled:opacity-75"
                    >
                      {clearingAttendance ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      Clear Attendance History
                    </button>
                  </div>
                </div>
              </div>

            </div>
          )}

        </div>
      </main>

      {/* ========================================================================= */}
      {/* MODAL: ADD STUDENT */}
      {/* ========================================================================= */}
      {showAddStudentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 relative max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setShowAddStudentModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Enroll New Student</h3>
            <p className="text-xs text-slate-500 mb-4">Add student profile and database authentication account</p>

            <form onSubmit={handleCreateStudent} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Student ID *</label>
                  <input
                    type="text"
                    required
                    value={studentFormData.id}
                    onChange={(e) => setStudentFormData({ ...studentFormData, id: e.target.value.toUpperCase() })}
                    placeholder="CSE23001"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={studentFormData.name}
                    onChange={(e) => setStudentFormData({ ...studentFormData, name: e.target.value })}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Roll Number</label>
                <input
                  type="text"
                  value={studentFormData.roll_number || ''}
                  onChange={(e) => setStudentFormData({ ...studentFormData, roll_number: e.target.value.toUpperCase() })}
                  placeholder="e.g. 24CSE015"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={studentFormData.email}
                    onChange={(e) => setStudentFormData({ ...studentFormData, email: e.target.value })}
                    placeholder="rahul@college.edu"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Initial Password</label>
                  <input
                    type="password"
                    required
                    minLength={12}
                    autoComplete="new-password"
                    value={studentFormData.password}
                    onChange={(e) => setStudentFormData({ ...studentFormData, password: e.target.value })}
                    placeholder="At least 12 characters"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
                  <select
                    value={studentFormData.department || ''}
                    onChange={(e) => setStudentFormData({ ...studentFormData, department: e.target.value, batch_id: null })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    {departmentNames.length === 0 && <option value="">No departments yet</option>}
                    {departmentNames.map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Batch</label>
                  <select
                    value={studentFormData.batch_id ?? ''}
                    onChange={(e) => setStudentFormData({ ...studentFormData, batch_id: e.target.value ? Number(e.target.value) : null })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="">No batch</option>
                    {batchesForDepartment(studentFormData.department).map(batch => (
                      <option key={batch.id} value={batch.id}>{batch.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Class Section</label>
                  <select
                    value={studentFormData.class_name}
                    onChange={(e) => setStudentFormData({ ...studentFormData, class_name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    {classes.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={studentFormData.phone}
                    onChange={(e) => setStudentFormData({ ...studentFormData, phone: e.target.value })}
                    placeholder="+91 9876543210"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddStudentModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={studentSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm disabled:opacity-75"
                >
                  {studentSubmitting ? 'Creating...' : 'Enroll Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EDIT STUDENT */}
      {/* ========================================================================= */}
      {showEditStudentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 relative max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setShowEditStudentModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Edit Student: {editingStudentId}</h3>
            <p className="text-xs text-slate-500 mb-4">Modify student profile information or reset login password</p>

            <form onSubmit={handleUpdateStudent} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Roll Number</label>
                <input
                  type="text"
                  value={studentFormData.roll_number || ''}
                  onChange={(e) => setStudentFormData({ ...studentFormData, roll_number: e.target.value.toUpperCase() })}
                  placeholder="e.g. 24CSE015"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={studentFormData.name}
                    onChange={(e) => setStudentFormData({ ...studentFormData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={studentFormData.email}
                    onChange={(e) => setStudentFormData({ ...studentFormData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Reset Password (Optional)</label>
                  <input
                    type="password"
                    minLength={12}
                    autoComplete="new-password"
                    value={studentFormData.password}
                    onChange={(e) => setStudentFormData({ ...studentFormData, password: e.target.value })}
                    placeholder="Leave blank to keep unchanged"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
                  <select
                    value={studentFormData.department || ''}
                    onChange={(e) => setStudentFormData({ ...studentFormData, department: e.target.value, batch_id: null })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    {departmentNames.length === 0 && <option value="">No departments yet</option>}
                    {departmentNames.map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Batch</label>
                  <select
                    value={studentFormData.batch_id ?? ''}
                    onChange={(e) => setStudentFormData({ ...studentFormData, batch_id: e.target.value ? Number(e.target.value) : null })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="">No batch</option>
                    {batchesForDepartment(studentFormData.department).map(batch => (
                      <option key={batch.id} value={batch.id}>{batch.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Class Section</label>
                  <select
                    value={studentFormData.class_name}
                    onChange={(e) => setStudentFormData({ ...studentFormData, class_name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    {classes.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={studentFormData.phone}
                  onChange={(e) => setStudentFormData({ ...studentFormData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditStudentModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={studentSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm disabled:opacity-75"
                >
                  {studentSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD FACULTY */}
      {/* ========================================================================= */}
      {showAddTeacherModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 relative max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setShowAddTeacherModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Register New Faculty</h3>
            <p className="text-xs text-slate-500 mb-4">Add instructor credentials and assigned subjects</p>

            <form onSubmit={handleCreateTeacher} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Faculty ID *</label>
                  <input
                    type="text"
                    required
                    value={teacherFormData.id}
                    onChange={(e) => setTeacherFormData({ ...teacherFormData, id: e.target.value.toUpperCase() })}
                    placeholder="TCH101"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={teacherFormData.name}
                    onChange={(e) => setTeacherFormData({ ...teacherFormData, name: e.target.value })}
                    placeholder="Prof. Rajesh Sharma"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={teacherFormData.email}
                    onChange={(e) => setTeacherFormData({ ...teacherFormData, email: e.target.value })}
                    placeholder="teacher@college.edu"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Initial Password</label>
                  <input
                    type="password"
                    required
                    minLength={12}
                    autoComplete="new-password"
                    value={teacherFormData.password}
                    onChange={(e) => setTeacherFormData({ ...teacherFormData, password: e.target.value })}
                    placeholder="At least 12 characters"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Departments (Click to assign one or more)
                </label>
                {departmentNames.length === 0 && (
                  <p className="text-[11px] text-amber-600 mb-2">No departments yet. Add one in the Departments tab.</p>
                )}
                <div className="flex flex-wrap gap-1.5">
                  {departmentNames.map(name => {
                    const selectedList = teacherFormData.departments || [];
                    const isSelected = selectedList.some(item => item.toLowerCase() === name.toLowerCase());
                    const isPrimary = (selectedList[0] || '').toLowerCase() === name.toLowerCase();
                    return (
                      <button
                        type="button"
                        key={name}
                        onClick={() => toggleDepartmentInForm(name)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border flex items-center gap-1 ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm'
                            : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3" />}
                        {name}{isPrimary ? ' · Primary' : ''}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">The first selected department is primary. Add more so this faculty can teach across departments.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Assign Course Subjects (Click to select/deselect)
                </label>
                {subjects.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {subjects.map(s => {
                      const currentArr = (teacherFormData.subjects || '')
                        .split(',')
                        .map(item => item.trim().toLowerCase());
                      const isSelected = currentArr.includes(s.name.toLowerCase()) || currentArr.includes(s.code.toLowerCase());
                      return (
                        <button
                          type="button"
                          key={s.id}
                          onClick={() => toggleSubjectInForm(s.name)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border flex items-center gap-1 ${
                            isSelected 
                              ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm' 
                              : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3" />}
                          {s.name} ({s.code})
                        </button>
                      );
                    })}
                  </div>
                )}
                <input
                  type="text"
                  value={teacherFormData.subjects}
                  onChange={(e) => setTeacherFormData({ ...teacherFormData, subjects: e.target.value })}
                  placeholder="e.g. Compiler Design, Microprocessor and Microcontroller"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                <p className="text-[11px] text-slate-400 mt-1">Select from chips above or type custom comma-separated subjects.</p>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddTeacherModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={teacherSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm disabled:opacity-75"
                >
                  {teacherSubmitting ? 'Registering...' : 'Add Faculty'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EDIT FACULTY */}
      {/* ========================================================================= */}
      {showEditTeacherModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 relative max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setShowEditTeacherModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Edit Faculty: {editingTeacherId}</h3>
            <p className="text-xs text-slate-500 mb-4">Update instructor profile or subject assignments</p>

            <form onSubmit={handleUpdateTeacher} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={teacherFormData.name}
                    onChange={(e) => setTeacherFormData({ ...teacherFormData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={teacherFormData.email}
                    onChange={(e) => setTeacherFormData({ ...teacherFormData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Reset Password (Optional)</label>
                  <input
                    type="password"
                    minLength={12}
                    autoComplete="new-password"
                    value={teacherFormData.password}
                    onChange={(e) => setTeacherFormData({ ...teacherFormData, password: e.target.value })}
                    placeholder="Leave blank to keep unchanged"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={teacherFormData.phone}
                    onChange={(e) => setTeacherFormData({ ...teacherFormData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Departments (Click to assign one or more)
                  </label>
                  {departmentNames.length === 0 && (
                    <p className="text-[11px] text-amber-600 mb-2">No departments yet. Add one in the Departments tab.</p>
                  )}
                  <div className="flex flex-wrap gap-1.5">
                    {departmentNames.map(name => {
                      const selectedList = teacherFormData.departments || [];
                      const isSelected = selectedList.some(item => item.toLowerCase() === name.toLowerCase());
                      const isPrimary = (selectedList[0] || '').toLowerCase() === name.toLowerCase();
                      return (
                        <button
                          type="button"
                          key={name}
                          onClick={() => toggleDepartmentInForm(name)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border flex items-center gap-1 ${
                            isSelected
                              ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm'
                              : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3" />}
                          {name}{isPrimary ? ' · Primary' : ''}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">The first selected department is primary. Add more so this faculty can teach across departments.</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Assigned Subjects (Click to select/deselect)
                </label>
                {subjects.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {subjects.map(s => {
                      const currentArr = (teacherFormData.subjects || '')
                        .split(',')
                        .map(item => item.trim().toLowerCase());
                      const isSelected = currentArr.includes(s.name.toLowerCase()) || currentArr.includes(s.code.toLowerCase());
                      return (
                        <button
                          type="button"
                          key={s.id}
                          onClick={() => toggleSubjectInForm(s.name)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border flex items-center gap-1 ${
                            isSelected 
                              ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm' 
                              : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3" />}
                          {s.name} ({s.code})
                        </button>
                      );
                    })}
                  </div>
                )}
                <input
                  type="text"
                  value={teacherFormData.subjects}
                  onChange={(e) => setTeacherFormData({ ...teacherFormData, subjects: e.target.value })}
                  placeholder="e.g. Compiler Design, Microprocessor and Microcontroller"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                <p className="text-[11px] text-slate-400 mt-1">Select from chips above or type custom comma-separated subjects.</p>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditTeacherModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={teacherSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm disabled:opacity-75"
                >
                  {teacherSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD CLASS */}
      {/* ========================================================================= */}
      {showAddClassModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative">
            <button onClick={() => setShowAddClassModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Add Class</h3>
            <p className="text-xs text-slate-500 mb-4">Pick a batch, then choose a single class or add section names</p>

            <form onSubmit={handleCreateClass} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
                  <select
                    value={classFormData.department || ''}
                    onChange={(e) => setClassFormData({ ...classFormData, department: e.target.value, batch_id: null })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    {departmentNames.length === 0 && <option value="">No departments yet</option>}
                    {departmentNames.map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Batch</label>
                  <select
                    value={classFormData.batch_id ?? ''}
                    onChange={handleClassBatchChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="">No batch</option>
                    {batchesForDepartment(classFormData.department).map(batch => (
                      <option key={batch.id} value={batch.id}>{batch.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Class name *</label>
                <input
                  type="text"
                  required
                  readOnly={classSectionMode === 'single' && Boolean(classFormData.batch_id)}
                  placeholder="e.g. CSE-3"
                  value={classFormData.name}
                  onChange={(e) => setClassFormData({ ...classFormData, name: e.target.value })}
                  className={`w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none ${
                    classSectionMode === 'single' && classFormData.batch_id ? 'bg-slate-100 text-slate-500' : ''
                  }`}
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  {classSectionMode === 'single' && classFormData.batch_id
                    ? 'Uses the batch name, without any section.'
                    : 'Section names are added after this name.'}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Section</label>
                <select
                  value={classSectionMode}
                  onChange={(e) => handleClassSectionModeChange(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="single">Single — batch name only, no section</option>
                  <option value="multiple">Multiple — add section names</option>
                </select>
              </div>

              {classSectionMode === 'single' ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Section name (optional)</label>
                  <input
                    type="text"
                    maxLength={10}
                    value={classFormData.section}
                    onChange={(e) => setClassFormData({ ...classFormData, section: e.target.value })}
                    placeholder="Leave empty to keep the batch as one class"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Section names *</label>
                  {classSectionNames.map((sectionName, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="text"
                        autoFocus={index === classSectionNames.length - 1}
                        maxLength={10}
                        value={sectionName}
                        onChange={(e) => handleSectionNameChange(index, e.target.value)}
                        placeholder={index === 0 ? 'Section name, e.g. A' : 'Another section name'}
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => removeSectionNameInput(index)}
                        disabled={classSectionNames.length === 1}
                        title="Remove this section"
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-400"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addSectionNameInput}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-semibold hover:bg-emerald-100"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add section
                  </button>
                  <p className="text-[11px] text-slate-400">
                    {classSectionNames.some((name) => name.trim())
                      ? `Creates: ${classSectionNames.map((name) => name.trim()).filter(Boolean).map((name) => `${classFormData.name.trim()}${name}`).join(' • ')}`
                      : 'Each section name creates one class from the class name.'}
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setShowAddClassModal(false)} className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg">
                  Cancel
                </button>
                <button type="submit" disabled={classSubmitting} className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm">
                  {classSubmitting ? 'Creating...' : 'Create Class'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EDIT CLASS */}
      {/* ========================================================================= */}
      {showEditClassModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative">
            <button onClick={() => setShowEditClassModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Edit Class Section</h3>
            <p className="text-xs text-slate-500 mb-4">Modify class section details</p>

            <form onSubmit={handleUpdateClass} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Class Section Name *</label>
                <input
                  type="text"
                  required
                  value={classFormData.name}
                  onChange={(e) => setClassFormData({ ...classFormData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
                  <select
                    value={classFormData.department || ''}
                    onChange={(e) => setClassFormData({ ...classFormData, department: e.target.value, batch_id: null })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    {departmentNames.length === 0 && <option value="">No departments yet</option>}
                    {departmentNames.map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Batch</label>
                  <select
                    value={classFormData.batch_id ?? ''}
                    onChange={(e) => setClassFormData({ ...classFormData, batch_id: e.target.value ? Number(e.target.value) : null })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="">No batch</option>
                    {batchesForDepartment(classFormData.department).map(batch => (
                      <option key={batch.id} value={batch.id}>{batch.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Section name (optional)</label>
                  <input
                    type="text"
                    maxLength={10}
                    value={classFormData.section || ''}
                    onChange={(e) => setClassFormData({ ...classFormData, section: e.target.value })}
                    placeholder="Leave empty for the whole batch"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setShowEditClassModal(false)} className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg">
                  Cancel
                </button>
                <button type="submit" disabled={classSubmitting} className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm">
                  {classSubmitting ? 'Saving...' : 'Save Class'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD SUBJECT */}
      {/* ========================================================================= */}
      {showAddSubjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative">
            <button onClick={() => setShowAddSubjectModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Add Course Subject</h3>
            <p className="text-xs text-slate-500 mb-4">Register a new curriculum subject</p>

            <form onSubmit={handleCreateSubject} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Subject Code *</label>
                <input
                  type="text"
                  required
                  placeholder="CS305"
                  value={subjectFormData.code}
                  onChange={(e) => setSubjectFormData({ ...subjectFormData, code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Subject Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Software Engineering"
                  value={subjectFormData.name}
                  onChange={(e) => setSubjectFormData({ ...subjectFormData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
                <select
                  value={subjectFormData.department || ''}
                  onChange={(e) => setSubjectFormData({ ...subjectFormData, department: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                >
                  {departmentNames.length === 0 && <option value="">No departments yet</option>}
                  {departmentNames.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setShowAddSubjectModal(false)} className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg">
                  Cancel
                </button>
                <button type="submit" disabled={subjectSubmitting} className="px-4 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-sm">
                  {subjectSubmitting ? 'Adding...' : 'Add Subject'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EDIT SUBJECT */}
      {/* ========================================================================= */}
      {showEditSubjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative">
            <button onClick={() => setShowEditSubjectModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Edit Subject</h3>
            <p className="text-xs text-slate-500 mb-4">Modify subject code or title</p>

            <form onSubmit={handleUpdateSubject} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Subject Code *</label>
                <input
                  type="text"
                  required
                  value={subjectFormData.code}
                  onChange={(e) => setSubjectFormData({ ...subjectFormData, code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Subject Name *</label>
                <input
                  type="text"
                  required
                  value={subjectFormData.name}
                  onChange={(e) => setSubjectFormData({ ...subjectFormData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
                <select
                  value={subjectFormData.department || ''}
                  onChange={(e) => setSubjectFormData({ ...subjectFormData, department: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                >
                  {departmentNames.length === 0 && <option value="">No departments yet</option>}
                  {departmentNames.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setShowEditSubjectModal(false)} className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg">
                  Cancel
                </button>
                <button type="submit" disabled={subjectSubmitting} className="px-4 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-sm">
                  {subjectSubmitting ? 'Saving...' : 'Save Subject'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: MARK ATTENDANCE */}
      {/* ========================================================================= */}
      {showAddAttendanceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setShowAddAttendanceModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Direct Attendance Entry</h3>
            <p className="text-xs text-slate-500 mb-4">Record student attendance directly into the database</p>

            <form onSubmit={handleCreateAttendance} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Student *</label>
                <select
                  value={attendanceFormData.student_id}
                  onChange={(e) => setAttendanceFormData({ ...attendanceFormData, student_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                >
                  {students.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.id}) - {s.class_name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Class</label>
                  <select
                    value={attendanceFormData.class_name}
                    onChange={(e) => setAttendanceFormData({ ...attendanceFormData, class_name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  >
                    {classes.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Subject</label>
                  <select
                    value={attendanceFormData.subject_name}
                    onChange={(e) => setAttendanceFormData({ ...attendanceFormData, subject_name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  >
                    {subjects.map(s => (
                      <option key={s.id} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Attendance Status</label>
                  <select
                    value={attendanceFormData.status}
                    onChange={(e) => setAttendanceFormData({ ...attendanceFormData, status: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none font-semibold text-slate-800"
                  >
                    <option value="PRESENT">Present</option>
                    <option value="ABSENT">Absent</option>
                    <option value="LATE">Late</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={attendanceFormData.date}
                    onChange={(e) => setAttendanceFormData({ ...attendanceFormData, date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setShowAddAttendanceModal(false)} className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg">
                  Cancel
                </button>
                <button type="submit" disabled={attendanceSubmitting} className="px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm">
                  {attendanceSubmitting ? 'Recording...' : 'Record Attendance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD / EDIT DEPARTMENT */}
      {/* ========================================================================= */}
      {(showAddDepartmentModal || showEditDepartmentModal) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative">
            <button
              onClick={() => { setShowAddDepartmentModal(false); setShowEditDepartmentModal(false); }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-slate-900 mb-1">
              {showEditDepartmentModal ? 'Edit Department' : 'Add Department'}
            </h3>
            <p className="text-xs text-slate-500 mb-4">Departments appear in every student, faculty, class and subject form.</p>

            <form onSubmit={showEditDepartmentModal ? handleUpdateDepartment : handleCreateDepartment} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Department Code *</label>
                <input
                  type="text"
                  required
                  maxLength={20}
                  placeholder="CSE"
                  value={departmentFormData.code}
                  onChange={(e) => setDepartmentFormData({ ...departmentFormData, code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Department Name *</label>
                <input
                  type="text"
                  required
                  maxLength={120}
                  placeholder="Computer Science & Engineering"
                  value={departmentFormData.name}
                  onChange={(e) => setDepartmentFormData({ ...departmentFormData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => { setShowAddDepartmentModal(false); setShowEditDepartmentModal(false); }}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={departmentSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm disabled:opacity-75"
                >
                  {departmentSubmitting ? 'Saving...' : (showEditDepartmentModal ? 'Save Department' : 'Add Department')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD / EDIT BATCH */}
      {/* ========================================================================= */}
      {(showAddBatchModal || showEditBatchModal) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative">
            <button
              onClick={() => { setShowAddBatchModal(false); setShowEditBatchModal(false); }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-slate-900 mb-1">
              {showEditBatchModal ? 'Edit Batch' : 'Add Admission Batch'}
            </h3>
            <p className="text-xs text-slate-500 mb-4">Year range for one department, e.g. 2024-2028.</p>

            <form onSubmit={showEditBatchModal ? handleUpdateBatch : handleCreateBatch} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Department *</label>
                <select
                  required
                  value={batchFormData.department_id}
                  onChange={(e) => setBatchFormData({ ...batchFormData, department_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="">Choose a department</option>
                  {departments.map((department) => (
                    <option key={department.id} value={department.id}>{department.name} ({department.code})</option>
                  ))}
                </select>
              </div>
              {showEditBatchModal ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Batch / Year Range *</label>
                  <input
                    type="text"
                    required
                    maxLength={40}
                    placeholder="2024-2028"
                    value={batchFormData.name}
                    onChange={(e) => setBatchFormData({ ...batchFormData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">The start and end years are read from this name.</p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Batch / Year Range *</label>
                    <input
                      type="text"
                      required
                      maxLength={40}
                      placeholder="2024-2028"
                      value={batchFormData.name}
                      onChange={(e) => {
                        const value = e.target.value;
                        setBatchFormData({ ...batchFormData, name: value });
                        if (batchSectionCount > 0) {
                          setBatchNames(Array.from({ length: batchSectionCount }, (_, index) => `${value} · Sec ${BATCH_NAME_SUFFIXES[index]}`));
                        }
                      }}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">The start and end years are read from this name.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Sections</label>
                    <select
                      value={batchSectionCount}
                      onChange={(e) => {
                        const count = Number(e.target.value);
                        setBatchSectionCount(count);
                        setBatchNames(
                          count > 0
                            ? Array.from({ length: count }, (_, index) => `${batchFormData.name.trim()} · Sec ${BATCH_NAME_SUFFIXES[index]}`.trim())
                            : ['']
                        );
                      }}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    >
                      <option value={0}>No sections — one batch named by the year range</option>
                      {[2, 3, 4, 5, 6].map((count) => (
                        <option key={count} value={count}>{count} batches — name each one</option>
                      ))}
                    </select>
                  </div>

                  {batchSectionCount > 0 && (
                    <div className="space-y-2 rounded-xl bg-slate-50 border border-slate-200 p-3">
                      {batchNames.map((value, index) => (
                        <div key={index}>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Batch {index + 1} name *</label>
                          <input
                            type="text"
                            required
                            maxLength={40}
                            value={value}
                            onChange={(e) => setBatchNames((prev) => prev.map((name, i) => (i === index ? e.target.value : name)))}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => { setShowAddBatchModal(false); setShowEditBatchModal(false); }}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={batchSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm disabled:opacity-75"
                >
                  {batchSubmitting ? 'Saving...' : (showEditBatchModal ? 'Save Batch' : 'Add Batch')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: REJECT REGISTRATION */}
      {/* ========================================================================= */}
      {rejectingRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative">
            <button
              onClick={() => { setRejectingRequest(null); setRejectReason(''); }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Reject application</h3>
            <p className="text-xs text-slate-500 mb-4">
              {rejectingRequest.name} ({rejectingRequest.registration_number}) will see this reason on the registration
              link, and office staff see it here.
            </p>

            <form onSubmit={handleRejectRegistration} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Reason for rejection *</label>
                <textarea
                  required
                  rows={4}
                  maxLength={500}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Registration number does not match the admission list"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => { setRejectingRequest(null); setRejectReason(''); }}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={decidingId === rejectingRequest.id || !rejectReason.trim()}
                  className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm disabled:opacity-60"
                >
                  {decidingId === rejectingRequest.id ? 'Saving...' : 'Reject application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
