import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import authApi from '../api/authApi';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => localStorage.getItem('accessToken') || null);
  const [loading, setLoading] = useState(false);

  // Sync state on initial mount
  useEffect(() => {
    const savedToken = localStorage.getItem('accessToken');
    const savedUser = localStorage.getItem('user');
    if (savedToken && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
        setToken(savedToken);
      } catch {
        setUser(null);
        setToken(null);
        localStorage.removeItem('user');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
      }
    }
    setLoading(false);
  }, []);

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
      setUser(userData);
      setToken(accessToken);
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      return userData;
    }
    throw new Error(res.message || 'Đăng nhập không thành công');
  };

  const logout = useCallback(async () => {
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
    }
  }, [user]);

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
