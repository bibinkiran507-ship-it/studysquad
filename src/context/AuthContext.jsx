import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('studysquad_token'));
  const [loading, setLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register' | 'forgot'
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Load current user profile on startup if token exists
  useEffect(() => {
    const fetchUser = async () => {
      const storedToken = localStorage.getItem('studysquad_token');
      if (!storedToken) {
        setLoading(false);
        return;
      }
      try {
        const res = await authAPI.getMe();
        setUser(res.data.user);
      } catch (err) {
        console.warn('Failed to load user profile, token might be expired.');
        localStorage.removeItem('studysquad_token');
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  const login = async (email, password) => {
    const res = await authAPI.login(email, password);
    const { token: newToken, user: newUser } = res.data;
    localStorage.setItem('studysquad_token', newToken);
    setToken(newToken);
    setUser(newUser);
    setIsAuthModalOpen(false);
    return newUser;
  };

  const register = async (name, email, password) => {
    const res = await authAPI.register(name, email, password);
    const { token: newToken, user: newUser } = res.data;
    localStorage.setItem('studysquad_token', newToken);
    setToken(newToken);
    setUser(newUser);
    setIsAuthModalOpen(false);
    return newUser;
  };

  const loginWithGoogle = async (googleUserData) => {
    try {
      const res = await authAPI.googleLogin(googleUserData);
      const { token: newToken, user: newUser } = res.data;
      localStorage.setItem('studysquad_token', newToken);
      setToken(newToken);
      setUser(newUser);
      setIsAuthModalOpen(false);
      return newUser;
    } catch (err) {
      console.warn('Backend Google Auth failed, activating fallback session:', err);
      const fallbackUser = {
        id: `google-${Date.now()}`,
        name: googleUserData.name || 'Google User',
        email: googleUserData.email,
        avatar: googleUserData.avatar || `https://lh3.googleusercontent.com/a/default-user`,
        bio: '',
        pomodoroSessions: 0,
        squadsJoined: 0,
        isEmailVerified: true,
        createdAt: new Date().toISOString(),
        provider: 'google',
      };
      const fallbackToken = `mock-google-jwt-${Date.now()}`;
      localStorage.setItem('studysquad_token', fallbackToken);
      setToken(fallbackToken);
      setUser(fallbackUser);
      setIsAuthModalOpen(false);
      return fallbackUser;
    }
  };

  const logout = () => {
    localStorage.removeItem('studysquad_token');
    setToken(null);
    setUser(null);
  };

  const updateProfile = async (data) => {
    const res = await authAPI.updateMe(data);
    setUser((prev) => ({ ...prev, ...res.data.user }));
    return res.data.user;
  };

  const refreshUser = async () => {
    try {
      const res = await authAPI.getMe();
      setUser(res.data.user);
      return res.data.user;
    } catch (err) {
      console.warn('Failed to refresh user profile:', err);
    }
  };

  const loginAsDemo = async () => {
    const demoUser = {
      id: 'demo-student-1',
      name: 'Demo Student',
      email: 'student.demo@studysquad.io',
      avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=DemoStudent',
      bio: 'Exploring StudySquad collaborative study rooms',
      pomodoroSessions: 4,
      squadsJoined: 2,
      isEmailVerified: true,
      isPro: false,
      createdAt: new Date().toISOString(),
    };
    const demoToken = `mock-demo-jwt-${Date.now()}`;
    localStorage.setItem('studysquad_token', demoToken);
    setToken(demoToken);
    setUser(demoUser);
    setIsAuthModalOpen(false);
    return demoUser;
  };

  const openAuthModal = (mode = 'login') => {
    setAuthMode(mode);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  const openProfile = () => setIsProfileOpen(true);
  const closeProfile = () => setIsProfileOpen(false);

  return (
    <AuthContext.Provider
      value={{
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
        loginAsDemo,
        logout,
        updateProfile,
        refreshUser,
        openAuthModal,
        closeAuthModal,
        setAuthMode,
        openProfile,
        closeProfile,
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
