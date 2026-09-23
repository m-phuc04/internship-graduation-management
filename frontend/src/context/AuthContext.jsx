import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import authApi from '../api/authApi';
import { useToast } from './ToastContext';

const IDLE_TIMEOUT_MS = 15 * 60 * 1000; // 15 phút không hoạt động -> tự động logout
const ACTIVITY_THROTTLE_MS = 2000; // Throttle 2 giây để tránh ghi localStorage quá nhiều
const LAST_ACTIVITY_KEY = 'lastActivityAt';
const IDLE_MESSAGE = 'Phiên đăng nhập đã hết hạn do không hoạt động. Vui lòng đăng nhập lại.';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('user');
      const savedToken = localStorage.getItem('accessToken');
      const savedLast = localStorage.getItem(LAST_ACTIVITY_KEY);

      if (savedToken && savedUser) {
        if (savedLast && Date.now() - Number(savedLast) >= IDLE_TIMEOUT_MS) {
          localStorage.removeItem('user');
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem(LAST_ACTIVITY_KEY);
          return null;
        }
        return JSON.parse(savedUser);
      }
    } catch {
      return null;
    }
    return null;
  });

  const [token, setToken] = useState(() => {
    const savedToken = localStorage.getItem('accessToken');
    const savedLast = localStorage.getItem(LAST_ACTIVITY_KEY);
    if (savedToken && savedLast && Date.now() - Number(savedLast) >= IDLE_TIMEOUT_MS) {
      return null;
    }
    return savedToken || null;
  });

  const [loading, setLoading] = useState(false);

  const idleTimerRef = useRef(null);
  const lastRecordedTimeRef = useRef(0);

  // Sync state on initial mount and check if session expired while closed
  useEffect(() => {
    const savedToken = localStorage.getItem('accessToken');
    const savedUser = localStorage.getItem('user');
    const savedLast = localStorage.getItem(LAST_ACTIVITY_KEY);

    if (savedToken && savedUser) {
      if (savedLast && Date.now() - Number(savedLast) >= IDLE_TIMEOUT_MS) {
        setUser(null);
        setToken(null);
        localStorage.removeItem('user');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem(LAST_ACTIVITY_KEY);
        showToast(IDLE_MESSAGE, 'error', 6000);
        navigate('/login', { replace: true });
      } else {
        try {
          setUser(JSON.parse(savedUser));
          setToken(savedToken);
          if (!savedLast) {
            localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
          }
        } catch {
          setUser(null);
          setToken(null);
          localStorage.removeItem('user');
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem(LAST_ACTIVITY_KEY);
        }
      }
    }
    setLoading(false);
  }, [showToast, navigate]);

  const login = async (accountCodeOrCreds, password, captchaId, captchaAnswer) => {
    let payload;
    if (typeof accountCodeOrCreds === 'object' && accountCodeOrCreds !== null) {
      payload = accountCodeOrCreds;
    } else {
      payload = {
        accountCode: accountCodeOrCreds,
        password,
        captchaId,
        captchaAnswer,
      };
    }

    const res = await authApi.login(payload);
    if (res.success && res.data) {
      const { user: userData, accessToken, refreshToken } = res.data;
      const now = Date.now();
      setUser(userData);
      setToken(accessToken);
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem(LAST_ACTIVITY_KEY, String(now));
      lastRecordedTimeRef.current = now;
      return userData;
    }
    throw new Error(res.message || 'Đăng nhập không thành công');
  };

  const logout = useCallback(async () => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
    try {
      if (user?._id) {
        await authApi.logout(user._id);
      }
    } catch {
      // Ignore errors on logout
    } finally {
      setUser(null);
      setToken(null);
      localStorage.removeItem('user');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem(LAST_ACTIVITY_KEY);
    }
  }, [user]);

  const handleIdleLogout = useCallback(async () => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }

    const currentUserId = user?._id || (() => {
      try {
        const u = JSON.parse(localStorage.getItem('user'));
        return u?._id;
      } catch {
        return null;
      }
    })();

    try {
      if (currentUserId) {
        await authApi.logout(currentUserId);
      }
    } catch {
      // Ignore errors
    } finally {
      setUser(null);
      setToken(null);
      localStorage.removeItem('user');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem(LAST_ACTIVITY_KEY);

      showToast(IDLE_MESSAGE, 'error', 6000);
      navigate('/login', { replace: true });
    }
  }, [user?._id, showToast, navigate]);

  const recordActivity = useCallback(() => {
    const now = Date.now();
    if (now - lastRecordedTimeRef.current > ACTIVITY_THROTTLE_MS) {
      lastRecordedTimeRef.current = now;
      localStorage.setItem(LAST_ACTIVITY_KEY, String(now));
    }
  }, []);

  // Idle timeout management and user activity listener
  useEffect(() => {
    if (!user || !token) {
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }
      return;
    }

    let lastActivity = Number(localStorage.getItem(LAST_ACTIVITY_KEY));
    if (!lastActivity || isNaN(lastActivity)) {
      lastActivity = Date.now();
      localStorage.setItem(LAST_ACTIVITY_KEY, String(lastActivity));
    }

    const checkIdleStatus = () => {
      const currentLast = Number(localStorage.getItem(LAST_ACTIVITY_KEY) || Date.now());
      const timeElapsed = Date.now() - currentLast;

      if (timeElapsed >= IDLE_TIMEOUT_MS) {
        handleIdleLogout();
      } else {
        const remaining = IDLE_TIMEOUT_MS - timeElapsed;
        if (idleTimerRef.current) {
          clearTimeout(idleTimerRef.current);
        }
        idleTimerRef.current = setTimeout(checkIdleStatus, Math.max(remaining, 1000));
      }
    };

    // Schedule initial idle check based on remaining time
    const initialElapsed = Date.now() - lastActivity;
    if (initialElapsed >= IDLE_TIMEOUT_MS) {
      handleIdleLogout();
      return;
    }
    const initialRemaining = IDLE_TIMEOUT_MS - initialElapsed;
    idleTimerRef.current = setTimeout(checkIdleStatus, Math.max(initialRemaining, 1000));

    const handleUserActivity = () => {
      recordActivity();
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
      idleTimerRef.current = setTimeout(checkIdleStatus, IDLE_TIMEOUT_MS);
    };

    // Sync across tabs via localStorage storage event
    const handleStorageChange = (e) => {
      if (e.key === LAST_ACTIVITY_KEY && e.newValue) {
        const otherTabLastActivity = Number(e.newValue);
        const remaining = IDLE_TIMEOUT_MS - (Date.now() - otherTabLastActivity);
        if (remaining > 0) {
          if (idleTimerRef.current) {
            clearTimeout(idleTimerRef.current);
          }
          idleTimerRef.current = setTimeout(checkIdleStatus, remaining);
        } else {
          handleIdleLogout();
        }
      } else if (e.key === 'user' || e.key === 'accessToken') {
        if (!e.newValue) {
          setUser(null);
          setToken(null);
          if (idleTimerRef.current) {
            clearTimeout(idleTimerRef.current);
            idleTimerRef.current = null;
          }
        }
      }
    };

    // Check on tab visibility or focus change
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        const currentLast = Number(localStorage.getItem(LAST_ACTIVITY_KEY) || Date.now());
        if (Date.now() - currentLast >= IDLE_TIMEOUT_MS) {
          handleIdleLogout();
        } else {
          handleUserActivity();
        }
      }
    };

    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach((evt) => {
      window.addEventListener(evt, handleUserActivity, { passive: true });
    });

    window.addEventListener('storage', handleStorageChange);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);

    return () => {
      events.forEach((evt) => {
        window.removeEventListener(evt, handleUserActivity);
      });
      window.removeEventListener('storage', handleStorageChange);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }
    };
  }, [user, token, handleIdleLogout, recordActivity]);

  const updateUser = useCallback((updatedUserData) => {
    setUser((prev) => {
      const merged = { ...prev, ...updatedUserData };
      localStorage.setItem('user', JSON.stringify(merged));
      return merged;
    });
  }, []);

  const hasRole = useCallback(
    (...roles) => {
      return user && roles.includes(user.role);
    },
    [user],
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        accessToken: token,
        isAuthenticated: !!user && !!token,
        role: user?.role || null,
        loading,
        login,
        logout,
        hasRole,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
