import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { authAPI } from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('studysquad_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('studysquad_token'));
  const [loading, setLoading] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register' | 'forgot'
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const saveUserSession = useCallback((newUser, newToken) => {
    if (newToken) {
      localStorage.setItem('studysquad_token', newToken);
      setToken(newToken);
    }
    if (newUser) {
      localStorage.setItem('studysquad_user', JSON.stringify(newUser));
      setUser(newUser);
    }
  }, []);

  // Sync / verify user profile on startup if token exists
  useEffect(() => {
    const fetchUser = async () => {
      const storedToken = localStorage.getItem('studysquad_token');
      if (!storedToken) {
        setLoading(false);
        return;
      }
      try {
        const res = await authAPI.getMe();
        if (res.data?.user) {
          saveUserSession(res.data.user);
        }
      } catch (err) {
        console.warn('Backend profile sync notice:', err.message);
        if (
          err.response?.status === 401 &&
          (!import.meta.env.DEV || !storedToken.startsWith('mock-'))
        ) {
          localStorage.removeItem('studysquad_token');
          localStorage.removeItem('studysquad_user');
          setToken(null);
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [saveUserSession]);

  const login = useCallback(async (email, password) => {
    const res = await authAPI.login(email, password);
    const { token: newToken, user: newUser } = res.data;
    saveUserSession(newUser, newToken);
    setIsAuthModalOpen(false);
    return newUser;
  }, [saveUserSession]);

  const register = useCallback(async (name, email, password) => {
    const res = await authAPI.register(name, email, password);
    const { token: newToken, user: newUser } = res.data;
    saveUserSession(newUser, newToken);
    setIsAuthModalOpen(false);
    return newUser;
  }, [saveUserSession]);

  const loginWithGoogle = useCallback(async (googleUserData) => {
    try {
      const res = await authAPI.googleLogin(googleUserData);
      const { token: newToken, user: newUser } = res.data;
      saveUserSession(newUser, newToken);
      setIsAuthModalOpen(false);
      return newUser;
    } catch (err) {
      if (!import.meta.env.DEV) {
        throw err;
      }
      console.warn('Backend Google Auth failed, activating dev fallback session:', err);
      const fallbackUser = {
        id: `google-${Date.now()}`,
        name: googleUserData.name || 'Google User',
        email: googleUserData.email || 'student@studysquad.com',
        avatar: googleUserData.avatar || `https://lh3.googleusercontent.com/a/default-user`,
        bio: '',
        pomodoroSessions: 0,
        squadsJoined: 0,
        isEmailVerified: true,
        createdAt: new Date().toISOString(),
        provider: 'google',
      };
      const fallbackToken = `mock-google-jwt-${Date.now()}`;
      saveUserSession(fallbackUser, fallbackToken);
      setIsAuthModalOpen(false);
      return fallbackUser;
    }
  }, [saveUserSession]);

  const logout = useCallback(() => {
    localStorage.removeItem('studysquad_token');
    localStorage.removeItem('studysquad_user');
    setToken(null);
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (data) => {
    const res = await authAPI.updateMe(data);
    setUser((prev) => {
      const merged = { ...(prev || {}), ...(res.data?.user || {}) };
      try {
        localStorage.setItem('studysquad_user', JSON.stringify(merged));
      } catch {
        // ignore storage quota errors
      }
      return merged;
    });
    return res.data.user;
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const res = await authAPI.getMe();
      if (res.data?.user) {
        saveUserSession(res.data.user);
      }
      return res.data?.user || null;
    } catch (err) {
      console.warn('Failed to refresh user profile:', err);
      return null;
    }
  }, [saveUserSession]);

  const openAuthModal = useCallback((mode = 'login') => {
    setAuthMode(mode);
    setIsAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsAuthModalOpen(false);
  }, []);

  const openProfile = useCallback(() => setIsProfileOpen(true), []);
  const closeProfile = useCallback(() => setIsProfileOpen(false), []);

  const value = useMemo(
    () => ({
      user,
      setUser,
      token,
      loading,
      isAuthModalOpen,
      authMode,
      isProfileOpen,
      login,
      register,
      loginWithGoogle,
      logout,
      updateProfile,
      refreshUser,
      openAuthModal,
      closeAuthModal,
      setAuthMode,
      openProfile,
      closeProfile,
    }),
    [
      user,
      token,
      loading,
      isAuthModalOpen,
      authMode,
      isProfileOpen,
      login,
      register,
      loginWithGoogle,
      logout,
      updateProfile,
      refreshUser,
      openAuthModal,
      closeAuthModal,
      openProfile,
      closeProfile,
    ]
  );

  return (
    <AuthContext.Provider value={value}>
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
