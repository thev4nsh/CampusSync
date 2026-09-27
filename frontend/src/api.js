/**
 * CampusSync API Client & Abstraction Layer
 * 
 * Production-ready REST API communication layer for connecting to the FastAPI backend.
 * Handles JWT authentication tokens, error handling, defensive parsing, and authorization headers.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// Storage keys
const ACCESS_TOKEN_KEY = 'campussync_access_token';
const REFRESH_TOKEN_KEY = 'campussync_refresh_token';
const USER_KEY = 'campussync_user';

// Listeners for 401 Unauthorized events
const unauthorizedListeners = new Set();

export const onUnauthorized = (callback) => {
  unauthorizedListeners.add(callback);
  return () => unauthorizedListeners.delete(callback);
};

const notifyUnauthorized = () => {
  unauthorizedListeners.forEach(cb => {
    try {
      cb();
    } catch (err) {
      console.error('Error in unauthorized listener:', err);
    }
  });
};

/**
 * Token & Session Management
 */
export const tokenStorage = {
  getAccessToken: () => {
    return localStorage.getItem(ACCESS_TOKEN_KEY) || sessionStorage.getItem(ACCESS_TOKEN_KEY);
  },

  getRefreshToken: () => {
    return localStorage.getItem(REFRESH_TOKEN_KEY) || sessionStorage.getItem(REFRESH_TOKEN_KEY);
  },

  getUser: () => {
    const raw = localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  setSession: ({ access_token, refresh_token, user, rememberMe = true }) => {
    const storage = rememberMe ? localStorage : sessionStorage;
    const altStorage = rememberMe ? sessionStorage : localStorage;

    // Clear opposite storage to avoid stale tokens
    altStorage.removeItem(ACCESS_TOKEN_KEY);
    altStorage.removeItem(REFRESH_TOKEN_KEY);
    altStorage.removeItem(USER_KEY);

    if (access_token) storage.setItem(ACCESS_TOKEN_KEY, access_token);
    if (refresh_token) storage.setItem(REFRESH_TOKEN_KEY, refresh_token);
    if (user) storage.setItem(USER_KEY, JSON.stringify(user));
  },

  clearSession: () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    sessionStorage.removeItem(REFRESH_TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
  },

  isAuthenticated: () => {
    return Boolean(tokenStorage.getAccessToken());
  }
};

/**
 * Custom API Error class
 */
export class ApiError extends Error {
  constructor(message, status = 0, details = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

/**
 * Core HTTP Request Wrapper
 */
async function request(endpoint, options = {}) {
  const {
    method = 'GET',
    body,
    headers = {},
    params,
    requiresAuth = true,
  } = options;

  let url = `${API_BASE_URL.replace(/\/$/, '')}/${endpoint.replace(/^\//, '')}`;

  if (params && Object.keys(params).length > 0) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== 'All' && value !== '') {
        query.append(key, value);
      }
    });
    const queryString = query.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }

  const reqHeaders = {
    'Accept': 'application/json',
    ...headers,
  };

  if (body && !(body instanceof FormData)) {
    reqHeaders['Content-Type'] = 'application/json';
  }

  if (requiresAuth) {
    const token = tokenStorage.getAccessToken();
    if (token) {
      reqHeaders['Authorization'] = `Bearer ${token}`;
    }
  }

  let response;
  try {
    response = await fetch(url, {
      method,
      headers: reqHeaders,
      body: body instanceof FormData ? body : (body ? JSON.stringify(body) : undefined),
    });
  } catch (networkError) {
    throw new ApiError(
      'Unable to connect to CampusSync server. Please check that your FastAPI backend is running.',
      0,
      networkError
    );
  }

  // Handle 401 Unauthorized
  if (response.status === 401) {
    tokenStorage.clearSession();
    notifyUnauthorized();
    throw new ApiError('Session expired or invalid credentials. Please log in again.', 401);
  }

  // Handle No Content response
  if (response.status === 204) {
    return null;
  }

  let data = null;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  } else {
    try {
      data = await response.text();
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    let errorMessage = `Request failed with status ${response.status}`;
    if (data && typeof data === 'object') {
      if (typeof data.detail === 'string') {
        errorMessage = data.detail;
      } else if (Array.isArray(data.detail)) {
        errorMessage = data.detail.map(d => d.msg || JSON.stringify(d)).join(', ');
      } else if (data.message) {
        errorMessage = data.message;
      }
    } else if (typeof data === 'string' && data.length < 200) {
      errorMessage = data;
    }
    throw new ApiError(errorMessage, response.status, data);
  }

  return data;
}

/**
 * ============================================================================
 * AUTHENTICATION API
 * ============================================================================
 */
export const authApi = {
  /**
   * Login user with identifier (email or student/teacher ID) and password
   * Calls: POST /auth/login
   * Expected response: { access_token, refresh_token, token_type, role, user }
   */
  login: async (arg1, arg2, arg3 = true) => {
    let identifier, password, rememberMe;
    if (typeof arg1 === 'object' && arg1 !== null) {
      identifier = arg1.identifier;
      password = arg1.password;
      rememberMe = arg1.rememberMe ?? true;
    } else {
      identifier = arg1;
      password = arg2;
      rememberMe = arg3 ?? true;
    }

    const data = await request('/auth/login', {
      method: 'POST',
      body: { 
        identifier: String(identifier || '').trim(), 
        password: String(password || '') 
      },
      requiresAuth: false,
    });

    if (data?.access_token) {
      tokenStorage.setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        user: data.user,
        rememberMe,
      });
    }

    return data;
  },

  /**
   * Log out active session
   * Calls: POST /auth/logout
   */
  logout: async () => {
    try {
      await request('/auth/logout', { method: 'POST' });
    } catch (err) {
      console.warn('Logout API notification failed:', err);
    } finally {
      tokenStorage.clearSession();
    }
  },

  /**
   * Get current authenticated user profile and active role
   * Calls: GET /auth/me
   */
  getMe: async () => {
    return await request('/auth/me');
  },

  /**
   * Get public institution info & branding
   * Calls: GET /auth/institution
   */
  getInstitutionInfo: async () => {
    return await request('/auth/institution', { requiresAuth: false });
  },

  /**
   * Request password reset instructions
   * Calls: POST /auth/forgot-password
   */
  forgotPassword: async (identifier) => {
    return await request('/auth/forgot-password', {
      method: 'POST',
      body: { identifier },
      requiresAuth: false,
    });
  },

  /**
   * Refresh expired JWT token
   * Calls: POST /auth/refresh
   */
  refreshToken: async () => {
    const refreshToken = tokenStorage.getRefreshToken();
    if (!refreshToken) throw new ApiError('No refresh token available', 401);
    
    const data = await request('/auth/refresh', {
      method: 'POST',
      body: { refresh_token: refreshToken },
      requiresAuth: false,
    });

    if (data?.access_token) {
      tokenStorage.setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token || refreshToken,
        user: tokenStorage.getUser(),
      });
    }
    return data;
  },
};

/**
 * ============================================================================
 * STUDENT PORTAL API
 * ============================================================================
 */
export const studentApi = {
  /**
   * Fetch student dashboard statistics, subject breakdown, and recent records
   * Calls: GET /students/dashboard
   */
  getDashboard: async () => {
    return await request('/students/dashboard');
  },

  /**
   * Fetch student's attendance history with optional filters
   * Calls: GET /students/attendance
   */
  getAttendance: async (filters = {}) => {
    return await request('/students/attendance', { params: filters });
  },

  /**
   * Fetch student's official profile and registered biometric enrollments
   * Calls: GET /students/profile
   */
  getProfile: async () => {
    return await request('/students/profile');
  },
};

/**
 * ============================================================================
 * TEACHER PORTAL API
 * ============================================================================
 */
export const teacherApi = {
  /**
   * Fetch teacher dashboard overview
   * Calls: GET /teachers/dashboard
   */
  getDashboard: async () => {
    return await request('/teachers/dashboard');
  },

  /**
   * Fetch teacher's assigned classes
   * Calls: GET /teachers/classes
   */
  getClasses: async () => {
    return await request('/teachers/classes');
  },

  /**
   * Fetch subjects associated with a specific class or teacher
   * Calls: GET /teachers/subjects
   */
  getSubjects: async (classId) => {
    return await request('/teachers/subjects', { params: { class_id: classId } });
  },

  /**
   * Fetch enrolled students roster for manual attendance marking
   * Calls: GET /teachers/classes/:classId/students
   */
  getClassStudents: async (classId) => {
    return await request(`/teachers/classes/${classId}/students`);
  },

  /**
   * Start a live attendance session
   * Calls: POST /attendance/session
   */
  startSession: async ({ classId, subjectId, date }) => {
    return await request('/attendance/session', {
      method: 'POST',
      body: { class_id: classId, subject_id: subjectId, date },
    });
  },

  /**
   * End an active attendance session
   * Calls: POST /attendance/session/:sessionId/end
   */
  endSession: async (sessionId) => {
    return await request(`/attendance/session/${sessionId}/end`, {
      method: 'POST',
    });
  },

  /**
   * Fetch live incoming attendance log for an active session
   * Calls: GET /attendance/session/:sessionId/live
   */
  getSessionAttendance: async (sessionId) => {
    return await request(`/attendance/session/${sessionId}/live`);
  },

  /**
   * Submit manual attendance marks
   * Calls: POST /attendance/manual
   */
  submitManualAttendance: async ({ sessionId, classId, subjectId, records, date }) => {
    return await request('/attendance/manual', {
      method: 'POST',
      body: {
        session_id: sessionId,
        class_id: classId,
        subject_id: subjectId,
        date,
        records,
      },
    });
  },

  /**
   * Fetch attendance records table with filtering
   * Calls: GET /teachers/attendance-records
   */
  getAttendanceRecords: async (filters = {}) => {
    return await request('/teachers/attendance-records', { params: filters });
  },

  /**
   * Fetch all students across teacher's assigned classes with attendance stats
   * Calls: GET /teachers/students
   */
  getAllStudents: async () => {
    return await request('/teachers/students');
  },

  /**
   * Download CSV attendance logs report for teacher
   */
  downloadAttendanceCsv: async () => {
    const token = tokenStorage.getAccessToken();
    const base = API_BASE_URL.replace(/\/$/, '');
    const filename = `Faculty_Attendance_Report_${new Date().toISOString().slice(0, 10)}.csv`;
    
    const candidateUrls = [
      `${base}/api/teachers/export/csv`,
      `${base}/teachers/export/csv`
    ];

    let lastError = null;
    for (const u of candidateUrls) {
      try {
        const res = await fetch(u, {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            Accept: 'text/csv, application/json, text/plain, */*',
          },
        });
        if (res.ok) {
          const csvText = await res.text();
          const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.setAttribute('href', url);
          link.setAttribute('download', filename);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          return true;
        } else {
          lastError = new Error(`Server returned HTTP ${res.status}`);
        }
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError || new Error('Failed to export faculty attendance report.');
  },

  /**
   * Fetch faculty profile
   * Calls: GET /teachers/profile
   */
  getProfile: async () => {
    return await request('/teachers/profile');
  },
};

/**
 * ============================================================================
 * ADMIN PORTAL API
 * ============================================================================
 */
export const adminApi = {
  /**
   * Fetch administrator dashboard statistics
   * Calls: GET /admin/dashboard
   */
  getDashboard: async () => {
    return await request('/admin/dashboard');
  },

  // Student Management
  getStudents: async (params = {}) => {
    return await request('/admin/students', { params });
  },
  createStudent: async (studentData) => {
    return await request('/admin/students', {
      method: 'POST',
      body: studentData,
    });
  },
  updateStudent: async (id, studentData) => {
    return await request(`/admin/students/${id}`, {
      method: 'PUT',
      body: studentData,
    });
  },
  deleteStudent: async (id) => {
    return await request(`/admin/students/${id}`, {
      method: 'DELETE',
    });
  },

  // Teacher Management
  getTeachers: async (params = {}) => {
    return await request('/admin/teachers', { params });
  },
  createTeacher: async (teacherData) => {
    return await request('/admin/teachers', {
      method: 'POST',
      body: teacherData,
    });
  },
  updateTeacher: async (id, teacherData) => {
    return await request(`/admin/teachers/${id}`, {
      method: 'PUT',
      body: teacherData,
    });
  },
  deleteTeacher: async (id) => {
    return await request(`/admin/teachers/${id}`, {
      method: 'DELETE',
    });
  },

  // Class Management
  getClasses: async () => {
    return await request('/admin/classes');
  },
  createClass: async (classData) => {
    return await request('/admin/classes', {
      method: 'POST',
      body: classData,
    });
  },
  updateClass: async (id, classData) => {
    return await request(`/admin/classes/${id}`, {
      method: 'PUT',
      body: classData,
    });
  },
  deleteClass: async (id) => {
    return await request(`/admin/classes/${id}`, {
      method: 'DELETE',
    });
  },

  // Subject Management
  getSubjects: async () => {
    return await request('/admin/subjects');
  },
  createSubject: async (subjectData) => {
    return await request('/admin/subjects', {
      method: 'POST',
      body: subjectData,
    });
  },
  updateSubject: async (id, subjectData) => {
    return await request(`/admin/subjects/${id}`, {
      method: 'PUT',
      body: subjectData,
    });
  },
  deleteSubject: async (id) => {
    return await request(`/admin/subjects/${id}`, {
      method: 'DELETE',
    });
  },

  // Global Attendance Logs & Direct CRUD
  getAttendanceLogs: async (filters = {}) => {
    return await request('/admin/attendance', { params: filters });
  },
  createAttendanceRecord: async (recordData) => {
    return await request('/admin/attendance', {
      method: 'POST',
      body: recordData,
    });
  },
  updateAttendanceRecord: async (id, recordData) => {
    return await request(`/admin/attendance/${id}`, {
      method: 'PUT',
      body: recordData,
    });
  },
  deleteAttendanceRecord: async (id) => {
    return await request(`/admin/attendance/${id}`, {
      method: 'DELETE',
    });
  },

  // Hardware Device Network
  getDevices: async () => {
    return await request('/admin/devices');
  },
  createDevice: async (deviceData) => {
    return await request('/admin/devices', {
      method: 'POST',
      body: deviceData,
    });
  },
  updateDevice: async (id, deviceData) => {
    return await request(`/admin/devices/${id}`, {
      method: 'PUT',
      body: deviceData,
    });
  },
  deleteDevice: async (id) => {
    return await request(`/admin/devices/${id}`, {
      method: 'DELETE',
    });
  },
  toggleDeviceStatus: async (id, status) => {
    return await request(`/admin/devices/${id}/status`, {
      method: 'PUT',
      body: { status },
    });
  },

  // Reports
  getReports: async (filters = {}) => {
    return await request('/admin/reports', { params: filters });
  },

  // System Settings & Database Operations
  getSettings: async () => {
    return await request('/admin/settings');
  },
  updateSettings: async (settingsData) => {
    return await request('/admin/settings', {
      method: 'PUT',
      body: settingsData,
    });
  },
  getDatabaseSummary: async () => {
    return await request('/admin/database/summary');
  },
  clearAttendanceRecords: async () => {
    return await request('/admin/database/clear-attendance', {
      method: 'POST',
    });
  },
  downloadAttendanceCsv: async () => {
    const token = tokenStorage.getAccessToken();
    const base = API_BASE_URL.replace(/\/$/, '');
    const filename = `CampusSync_Semester_Attendance_${new Date().toISOString().slice(0, 10)}.csv`;

    const candidateUrls = [
      `${base}/api/admin/reports/export/csv`,
      `${base}/admin/reports/export/csv`,
      `${base}/api/reports/export/csv`,
      `${base}/reports/export/csv`
    ];

    let lastError = null;
    for (const u of candidateUrls) {
      try {
        const res = await fetch(u, {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            Accept: 'text/csv, application/json, text/plain, */*',
          },
        });
        if (res.ok) {
          const csvText = await res.text();
          const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.setAttribute('href', url);
          link.setAttribute('download', filename);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          return true;
        } else {
          lastError = new Error(`Server returned HTTP ${res.status}`);
        }
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError || new Error('Failed to export institutional semester attendance report.');
  },
};

/**
 * ============================================================================
 * ATTENDANCE DEVICE INTEGRATION ENDPOINTS (Future Hardware Integration)
 * Real hardware terminals (ESP32 / Raspberry Pi / Face Recognition cameras)
 * communicate directly with these backend endpoints.
 * ============================================================================
 */
export const deviceIntegrationApi = {
  recordRfid: async ({ deviceId, rfidUid, timestamp }) => {
    return await request('/attendance/rfid', {
      method: 'POST',
      body: { device_id: deviceId, rfid_uid: rfidUid, timestamp },
    });
  },

  recordFingerprint: async ({ deviceId, templateId, confidence, timestamp }) => {
    return await request('/attendance/fingerprint', {
      method: 'POST',
      body: { device_id: deviceId, template_id: templateId, confidence, timestamp },
    });
  },

  recordFace: async ({ deviceId, studentId, confidence, timestamp }) => {
    return await request('/attendance/face', {
      method: 'POST',
      body: { device_id: deviceId, student_id: studentId, confidence, timestamp },
    });
  },
};

export default {
  tokenStorage,
  auth: authApi,
  student: studentApi,
  teacher: teacherApi,
  admin: adminApi,
  device: deviceIntegrationApi,
};
