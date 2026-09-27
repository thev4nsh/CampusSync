import React, { useState, useEffect, useCallback } from 'react';
import Login from './Login';
import Student from './Student';
import Teacher from './Teacher';
import Admin from './Admin';
import { tokenStorage, authApi, onUnauthorized } from './api';
import { CheckCircle2, AlertCircle, Info, X, Loader2 } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => tokenStorage.getUser());
  const [role, setRole] = useState(() => {
    const user = tokenStorage.getUser();
    if (!tokenStorage.isAuthenticated()) return 'login';
    return user?.role?.toLowerCase() || 'login';
  });
  const [isInitializing, setIsInitializing] = useState(true);
  const [institutionInfo, setInstitutionInfo] = useState(null);

  // Toast Notification System State
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type, id: Date.now() });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  }, []);

  // Fetch public institution branding
  const refreshInstitutionInfo = useCallback(async () => {
    try {
      const data = await authApi.getInstitutionInfo();
      if (data) {
        setInstitutionInfo(data);
      }
    } catch {
      // Fallback
    }
  }, []);

  // Validate session on app launch
  useEffect(() => {
    const initAuth = async () => {
      refreshInstitutionInfo();
      if (tokenStorage.isAuthenticated()) {
        try {
          const me = await authApi.getMe();
          if (me) {
            const userRole = (me.role || currentUser?.role || 'student').toLowerCase();
            setCurrentUser(me);
            setRole(userRole);
          }
        } catch {
          // If token expired / invalid
          if (!tokenStorage.isAuthenticated()) {
            setCurrentUser(null);
            setRole('login');
          }
        }
      } else {
        setRole('login');
      }
      setIsInitializing(false);
    };

    initAuth();
  }, [refreshInstitutionInfo]);

  // Listen for 401 Unauthorized events from API requests
  useEffect(() => {
    const unsubscribe = onUnauthorized(() => {
      setCurrentUser(null);
      setRole('login');
      showToast('Your session has expired. Please sign in again.', 'warning');
    });
    return () => unsubscribe();
  }, [showToast]);

  // Login handler
  const handleLoginSuccess = (user, userRole) => {
    const normalizedRole = (userRole || user?.role || 'student').toLowerCase();
    setCurrentUser(user);
    setRole(normalizedRole);

    const friendlyName = user?.name || user?.username || 'User';
    showToast(`Welcome back, ${friendlyName}! Authenticated as ${normalizedRole.toUpperCase()}.`, 'success');
  };

  // Logout handler
  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {
      // Fallback
    } finally {
      setCurrentUser(null);
      setRole('login');
      showToast('You have signed out successfully.', 'info');
    }
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white space-y-4 font-sans">
        <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/30">
          <Loader2 className="w-6 h-6 animate-spin text-white" />
        </div>
        <p className="text-sm font-semibold tracking-wide text-slate-300">
          Initializing {institutionInfo?.college_short_name || 'CampusSync'}...
        </p>
      </div>
    );
  }

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

      {/* Role-Based Protected View Router */}
      {role === 'login' && (
        <Login 
          onLoginSuccess={handleLoginSuccess}
          institutionInfo={institutionInfo}
        />
      )}

      {role === 'student' && (
        <Student 
          currentUser={currentUser} 
          onLogout={handleLogout}
          showToast={showToast}
          institutionInfo={institutionInfo}
        />
      )}

      {role === 'teacher' && (
        <Teacher 
          currentUser={currentUser}
          onLogout={handleLogout}
          showToast={showToast}
          institutionInfo={institutionInfo}
        />
      )}

      {role === 'admin' && (
        <Admin 
          currentUser={currentUser}
          onLogout={handleLogout}
          showToast={showToast}
          institutionInfo={institutionInfo}
          onInstitutionUpdated={refreshInstitutionInfo}
        />
      )}
    </div>
  );
}
