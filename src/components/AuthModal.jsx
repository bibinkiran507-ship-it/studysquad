import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Mail, Lock, User, ArrowRight, Loader2 } from 'lucide-react';
import { useGoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';

/* ─── Authentic 4-colour Google "G" Icon ─────────────────────── */
export function GoogleIcon({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
    </svg>
  );
}

export default function AuthModal() {
  const {
    isAuthModalOpen,
    closeAuthModal,
    authMode,
    setAuthMode,
    login,
    register,
    loginWithGoogle,
    openProfile,
  } = useAuth();

  /* form state */
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  /* ── Real Google OAuth hook ─────────────────────────────────── */
  const triggerGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setGoogleLoading(true);
      setError('');
      try {
        const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        });
        const profile = await res.json();

        await loginWithGoogle({
          accessToken: tokenResponse.access_token,
          name:     profile.name,
          email:    profile.email,
          avatar:   profile.picture,
          googleId: profile.sub,
        });
        closeAuthModal();
      } catch (err) {
        console.error('Google profile fetch error:', err);
        setError('Failed to get Google profile. Please try again.');
      } finally {
        setGoogleLoading(false);
      }
    },
    onError: (err) => {
      console.error('Google OAuth error:', err);
      if (err.error !== 'popup_closed_by_user') {
        setError('Google sign-in failed. Make sure pop-ups are allowed and your Client ID is configured.');
      }
    },
  });

  const handleClose = () => {
    setError('');
    setGoogleLoading(false);
    closeAuthModal();
  };

  /* ── Manual email/password submit ───────────────────────────── */
  const handleManualSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (authMode === 'register') {
        if (!name.trim()) { setError('Please provide your name.'); setLoading(false); return; }
        await register(name, email, password);
      } else {
        await login(email, password);
      }
      handleClose();
    } catch (err) {
      if (!err.response) {
        setError('Cannot connect to backend server. Make sure the backend is running on port 3001 (npm run backend).');
      } else {
        setError(err.response?.data?.error || 'Authentication failed. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthModalOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Subtle Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        />

        {/* ═══════════════════════════════════════════════════════
            STUDYSQUAD TRANSPARENT IDENTITY MODAL
        ═══════════════════════════════════════════════════════ */}
        <motion.div
          key="identity"
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/60 shadow-2xl backdrop-blur-2xl text-neutral-900 z-10 flex flex-col"
          style={{
            background: 'rgba(255, 255, 255, 0.35)',
            backdropFilter: 'blur(28px) saturate(190%)',
            WebkitBackdropFilter: 'blur(28px) saturate(190%)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15), inset 0 1px 2px rgba(255, 255, 255, 0.8)',
          }}
        >
          {/* Subtle top shimmer glow */}
          <div className="h-[2px] w-full relative overflow-hidden bg-white/40">
            <motion.div
              className="absolute inset-y-0 w-1/3"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(28, 46, 30, 0.4), transparent)',
              }}
              animate={{ x: ['-100%', '400%'] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: 'linear', repeatDelay: 2 }}
            />
          </div>

          <div className="px-7 pt-7 pb-5 flex flex-col gap-4 relative z-10">
            {/* Close button */}
            <button
              onClick={handleClose}
              className="absolute top-5 right-5 flex h-9 w-9 items-center justify-center rounded-full bg-black/5 text-neutral-600 hover:bg-black/10 hover:text-black transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X size={18} />
            </button>

            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1C2E1E]/10 border border-[#1C2E1E]/20 text-[#1C2E1E] text-xs font-semibold uppercase tracking-wider w-fit">
              <Sparkles size={13} />
              StudySquad Identity
            </div>

            {/* Heading */}
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-black">
                {authMode === 'register' ? 'Create Your Account' : 'Welcome Back'}
              </h2>
              <p className="text-sm text-neutral-600 mt-1">
                {authMode === 'register'
                  ? 'Join squads, sync Pomodoro timers, and chat in live rooms.'
                  : 'Sign in to access your squads, tasks, and real-time rooms.'}
              </p>
            </div>

            {/* ── REAL GOOGLE SIGN IN BUTTON ── */}
            <button
              type="button"
              disabled={googleLoading || loading}
              onClick={() => {
                setError('');
                const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '569756310563-91mpouatvn8ktualrlfdhh0fjaju9v7m.apps.googleusercontent.com';
                if (!clientId || clientId.includes('YOUR_GOOGLE_CLIENT_ID') || clientId.trim() === '') {
                  setError('Google Sign-In is temporarily unavailable. Please sign in with your email & password below.');
                  return;
                }
                triggerGoogleLogin();
              }}
              className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl text-neutral-800 font-semibold text-sm shadow-xs transition-all border border-white/70 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                background: 'rgba(255, 255, 255, 0.55)',
                backdropFilter: 'blur(12px)',
              }}
            >
              {googleLoading
                ? <><Loader2 className="w-4 h-4 animate-spin text-neutral-600" /> Signing in with Google…</>
                : <><GoogleIcon className="w-[18px] h-[18px] flex-shrink-0" /> Continue with Google</>
              }
            </button>

            {/* Divider */}
            <div className="relative flex items-center justify-center my-1">
              <div className="w-full border-t border-neutral-300/50" />
              <span
                className="absolute px-3 text-[11px] font-medium tracking-wider text-neutral-500 rounded-full"
                style={{ background: 'rgba(255, 255, 255, 0.75)', backdropFilter: 'blur(8px)' }}
              >
                or continue with email
              </span>
            </div>

            {/* Tabs */}
            <div
              className="grid grid-cols-2 p-1 rounded-xl"
              style={{ background: 'rgba(0, 0, 0, 0.05)', border: '1px solid rgba(255, 255, 255, 0.6)' }}
            >
              <button
                type="button"
                onClick={() => { setAuthMode('login'); setError(''); }}
                className={`py-2 text-sm font-semibold rounded-lg transition-all cursor-pointer ${authMode !== 'register' ? 'bg-white/80 text-[#1C2E1E] shadow-xs' : 'text-neutral-600 hover:text-black'}`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setAuthMode('register'); setError(''); }}
                className={`py-2 text-sm font-semibold rounded-lg transition-all cursor-pointer ${authMode === 'register' ? 'bg-white/80 text-[#1C2E1E] shadow-xs' : 'text-neutral-600 hover:text-black'}`}
              >
                Register
              </button>
            </div>

            {/* Error */}
            {error && (
              <div className="p-3 rounded-xl bg-rose-50/80 border border-rose-300 text-rose-700 text-sm flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-rose-500 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Email/Password Form */}
            <form onSubmit={handleManualSubmit} className="flex flex-col gap-3.5">
              {authMode === 'register' && (
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">Full Name</label>
                  <div className="relative">
                    <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Alex Rivera"
                      className="w-full rounded-xl pl-10 pr-4 py-2 text-sm text-neutral-900 placeholder-neutral-500 outline-none transition-all"
                      style={{
                        background: 'rgba(255, 255, 255, 0.5)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(0, 0, 0, 0.12)',
                      }}
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Email Address</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="alex@university.edu"
                    className="w-full rounded-xl pl-10 pr-4 py-2 text-sm text-neutral-900 placeholder-neutral-500 outline-none transition-all"
                    style={{
                      background: 'rgba(255, 255, 255, 0.5)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(0, 0, 0, 0.12)',
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-neutral-700">Password</label>
                  {authMode !== 'register' && (
                    <button
                      type="button"
                      onClick={() => {
                        handleClose();
                        setTimeout(() => openProfile(), 150);
                      }}
                      className="text-xs text-neutral-700 hover:text-black hover:underline cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl pl-10 pr-4 py-2 text-sm text-neutral-900 placeholder-neutral-500 outline-none transition-all"
                    style={{
                      background: 'rgba(255, 255, 255, 0.5)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(0, 0, 0, 0.12)',
                    }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || googleLoading}
                className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white shadow-md transition-all cursor-pointer disabled:opacity-50"
                style={{
                  background: '#1C2E1E',
                  boxShadow: '0 4px 14px rgba(28, 46, 30, 0.25)',
                }}
              >
                {loading
                  ? <><Loader2 size={17} className="animate-spin" />Processing...</>
                  : <>{authMode === 'register' ? 'Join StudySquad' : 'Sign In'}<ArrowRight size={16} /></>}
              </button>
            </form>
          </div>

          {/* Footer strip */}
          <div
            className="px-7 pb-5 pt-2 text-center border-t border-white/50 relative z-10"
            style={{ background: 'rgba(255, 255, 255, 0.25)' }}
          >
            <p className="text-[11px] text-neutral-500 mb-1">
              🚀 StudySquad is now open to real students!
            </p>
            <button
              type="button"
              onClick={() => { setAuthMode('register'); setError(''); }}
              className="text-[12px] text-[#1C2E1E] font-semibold hover:underline transition-colors cursor-pointer"
            >
              Create your free account → Join the community
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
