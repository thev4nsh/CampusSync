import React, { useState, useEffect, useCallback } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import StudentPortal from './pages/StudentPortal';
import TeacherPortal from './pages/TeacherPortal';
import AdminPortal from './pages/AdminPortal';
import { tokenStorage, authApi, onUnauthorized } from './api/api';
import { CheckCircle2, AlertCircle, Info, X, Loader2 } from 'lucide-react';

/** Build the home URL for a portal role, e.g. role 'teacher' -> '/teacher'. */
export function roleHome(role) {
  return '/' + (String(role || 'student').toLowerCase().replace(/[^a-z]/g, '') || 'student');
}

/** Full-screen boot screen shown while the stored session is being validated. */
function BootScreen() {
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white space-y-4 font-sans">
      <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/30">
        <Loader2 className="w-6 h-6 animate-spin text-white" />
      </div>
      <p className="text-sm font-semibold tracking-wide text-slate-300">Initializing CampusSync...</p>
    </div>
  );
}

/** Route guard: not signed in -> /login; wrong role -> that user's own portal home. */
function RequireRole({ user, role, children }) {
  if (!user) return <Navigate to="/login" replace />;
  if ((user?.role || '').toLowerCase() !== role) return <Navigate to={roleHome(user?.role)} replace />;
  return children;
}

function AppInner() {
  const [currentUser, setCurrentUser] = useState(() => tokenStorage.getUser());
  const [isInitializing, setIsInitializing] = useState(true);
  const [institutionInfo, setInstitutionInfo] = useState(null);

  // Toast Notification System
  const [toast, setToast] = useState(null);
  const navigate = useNavigate();

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type, id: Date.now() });
    setTimeout(() => setToast(null), 4500);
  }, []);

  const refreshInstitutionInfo = useCallback(async () => {
    try {
      const data = await authApi.getInstitutionInfo();
      if (data) setInstitutionInfo(data);
    } catch {
      // Branding stays on defaults if the institution endpoint is unreachable.
    }
  }, []);

  // Validate the persistent session once on app launch
  useEffect(() => {
    const initAuth = async () => {
      refreshInstitutionInfo();
      if (tokenStorage.isAuthenticated()) {
        try {
          const me = await authApi.getMe();
          if (me) setCurrentUser(me);
        } catch {
          // Token is expired/invalid; the stored user is cleared so guards send us to /login.
          if (!tokenStorage.isAuthenticated()) setCurrentUser(null);
        }
      }
      setIsInitializing(false);
    };
    initAuth();
  }, [refreshInstitutionInfo]);

  // Any API call that comes back 401 clears the session and lifts the user to /login.
  useEffect(() => {
    const unsubscribe = onUnauthorized(() => {
      setCurrentUser(null);
      showToast('Your session has expired. Please sign in again.', 'warning');
      navigate('/login', { replace: true });
    });
    return () => unsubscribe();
  }, [showToast, navigate]);

  const handleLoginSuccess = useCallback((user, userRole) => {
    const normalizedRole = (userRole || user?.role || 'student').toLowerCase();
    setCurrentUser(user);
    navigate(roleHome(normalizedRole), { replace: true });

    const friendlyName = user?.name || user?.username || 'User';
    showToast(`Welcome back, ${friendlyName}! Authenticated as ${normalizedRole.toUpperCase()}.`, 'success');
  }, [navigate, showToast]);

  const handleLogout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Local sign-out proceeds even if the server notification fails.
    } finally {
      setCurrentUser(null);
      navigate('/login', { replace: true });
      showToast('You have signed out successfully.', 'info');
    }
  }, [navigate, showToast]);

  if (isInitializing) return <BootScreen />;

  const signedInRole = roleHome(currentUser?.role);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans relative selection:bg-blue-600 selection:text-white">
      {/* Global Toast Notification System */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 transition-all duration-300 max-w-md animate-bounce-short">
          <div className={`flex items-start gap-3 p-4 rounded-xl shadow-2xl border backdrop-blur-md ${
            toast.type === 'success' ? 'bg-emerald-950/95 text-emerald-100 border-emerald-700/80 shadow-emerald-950/30' :
            toast.type === 'warning' ? 'bg-amber-950/95 text-amber-100 border-amber-700/80 shadow-amber-950/30' :
            'bg-blue-950/95 text-blue-100 border-blue-700/80 shadow-blue-950/30'
          }`}>
            {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />}
            {toast.type === 'warning' && <AlertCircle className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />}
            {toast.type === 'info' && <Info className="w-5 h-5 text-blue-400 mt-0.5 shrink-0" />}
            <div className="flex-1 text-xs font-semibold pr-2 leading-relaxed">
              {toast.message}
            </div>
            <button
              onClick={() => setToast(null)}
              className="text-white/60 hover:text-white transition-colors"
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <Routes>
        {/* Landed on the bare domain: send people where they live. */}
        <Route
          path="/"
          element={<Navigate to={currentUser ? signedInRole : '/login'} replace />}
        />

        {/* Public page */}
        <Route
          path="/login"
          element={currentUser ? <Navigate to={signedInRole} replace /> : (
            <LoginPage onLoginSuccess={handleLoginSuccess} institutionInfo={institutionInfo} />
          )}
        />

        {/* Student portal: /student and /student/<page> */}
        <Route path="/student" element={
          <RequireRole user={currentUser} role="student">
            <StudentPortal currentUser={currentUser} onLogout={handleLogout} showToast={showToast} institutionInfo={institutionInfo} basePath="/student" />
          </RequireRole>
        } />
        <Route path="/student/:section" element={
          <RequireRole user={currentUser} role="student">
            <StudentPortal currentUser={currentUser} onLogout={handleLogout} showToast={showToast} institutionInfo={institutionInfo} basePath="/student" />
          </RequireRole>
        } />

        {/* Teacher portal: /teacher and /teacher/<page> */}
        <Route path="/teacher" element={
          <RequireRole user={currentUser} role="teacher">
            <TeacherPortal currentUser={currentUser} onLogout={handleLogout} showToast={showToast} institutionInfo={institutionInfo} basePath="/teacher" />
          </RequireRole>
        } />
        <Route path="/teacher/:section" element={
          <RequireRole user={currentUser} role="teacher">
            <TeacherPortal currentUser={currentUser} onLogout={handleLogout} showToast={showToast} institutionInfo={institutionInfo} basePath="/teacher" />
          </RequireRole>
        } />

        {/* Admin portal: /admin and /admin/<page> */}
        <Route path="/admin" element={
          <RequireRole user={currentUser} role="admin">
            <AdminPortal onLogout={handleLogout} showToast={showToast} institutionInfo={institutionInfo} onInstitutionUpdated={refreshInstitutionInfo} basePath="/admin" />
          </RequireRole>
        } />
        <Route path="/admin/:section" element={
          <RequireRole user={currentUser} role="admin">
            <AdminPortal onLogout={handleLogout} showToast={showToast} institutionInfo={institutionInfo} onInstitutionUpdated={refreshInstitutionInfo} basePath="/admin" />
          </RequireRole>
        } />

        {/* Anything else falls back to a sensible home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppInner />
    </BrowserRouter>
  );
}
