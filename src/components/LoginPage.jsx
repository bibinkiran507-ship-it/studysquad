import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail, Lock, User, ArrowRight, Loader2,
  Eye, EyeOff, Sparkles,
} from 'lucide-react';
import { useGoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';
import { GoogleIcon } from './AuthModal';
import BackgroundVideo from './BackgroundVideo';

export default function LoginPage() {
  const { login, register, loginWithGoogle } = useAuth();

  /* Form & Auth state */
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [gLoading, setGLoading] = useState(false);

  const switchMode = (m) => {
    setMode(m);
    setError('');
    setSuccess('');
  };

  /* Google Sign-In */
  const triggerGoogle = useGoogleLogin({
    onSuccess: async (tok) => {
      setGLoading(true);
      setError('');
      try {
        const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tok.access_token}` },
        });
        const profile = await res.json();
        await loginWithGoogle({
          accessToken: tok.access_token,
          name: profile.name,
          email: profile.email,
          avatar: profile.picture,
          googleId: profile.sub,
        });
      } catch (err) {
        console.error('Google profile fetch error:', err);
        setError('Failed to get Google profile. Please try again.');
      } finally {
        setGLoading(false);
      }
    },
    onError: (err) => {
      console.error('Google sign-in error:', err);
      if (err.error !== 'popup_closed_by_user') {
        setError('Google sign-in failed. Please verify your client ID.');
      }
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (mode === 'register') {
        if (!name.trim()) {
          setError('Please enter your full name.');
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          setError('Password must be at least 6 characters.');
          setLoading(false);
          return;
        }
        await register(name, email, password);
        setSuccess('Account created! Welcome to StudySquad.');
      } else {
        await login(email, password);
        setSuccess('Welcome back! Loading your squads…');
      }
    } catch (err) {
      if (!err.response) {
        setError('Cannot connect to backend server. Make sure the backend is running on port 3001 (npm run backend).');
      } else {
        setError(
          err.response?.data?.error ||
          'Authentication failed. Please check your credentials.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative h-screen w-full flex flex-col justify-between overflow-hidden bg-white select-none">
      {/* ── Background Video from Screenshot 2: 100% Crisp 3D Mannequin ── */}
      <BackgroundVideo />

      {/* ── Minimal Brand Header ── */}
      <header className="relative z-20 w-full px-6 sm:px-10 py-5 sm:py-6 flex items-center justify-between">
        <a href="#" className="flex items-center gap-2.5 group">
          <span className="text-[22px] sm:text-[26px] tracking-tight text-black font-semibold select-none group-hover:opacity-80 transition-opacity">
            StudySquad&reg;
          </span>
          <span className="text-[24px] sm:text-[28px] text-emerald-800 select-none tracking-[-0.02em] font-medium leading-none mb-0.5">
            &#10033;
          </span>
        </a>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-neutral-500 hidden sm:inline-block">
            {mode === 'login' ? "Don't have an account?" : 'Already a member?'}
          </span>
          <button
            type="button"
            onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
            className="text-xs sm:text-sm font-semibold text-neutral-800 hover:text-black px-3.5 py-1.5 rounded-full bg-white/40 hover:bg-white/60 backdrop-blur-md border border-white/60 transition-all cursor-pointer shadow-xs"
          >
            {mode === 'login' ? 'Register' : 'Sign In'}
          </button>
        </div>
      </header>

      {/* ── Centered Pure Transparent Glassmorphic Login Card ── */}
      <main className="relative z-20 flex-1 flex items-center justify-center px-4 sm:px-6 py-2">
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="w-full max-w-[440px]"
        >
          {/* Glass Card Container */}
          <div
            className="relative rounded-3xl overflow-hidden backdrop-blur-2xl transition-all"
            style={{
              background: 'rgba(255, 255, 255, 0.22)',
              backdropFilter: 'blur(28px) saturate(190%)',
              WebkitBackdropFilter: 'blur(28px) saturate(190%)',
              border: '1px solid rgba(255, 255, 255, 0.55)',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.08), 0 2px 10px rgba(0, 0, 0, 0.03), inset 0 1px 1.5px rgba(255, 255, 255, 0.8)',
            }}
          >
            {/* Shimmer top accent line */}
            <div className="h-[2px] w-full relative overflow-hidden bg-white/30">
              <motion.div
                className="absolute inset-y-0 w-1/3"
                style={{
                  background: 'linear-gradient(90deg, transparent, rgba(28, 46, 30, 0.4), transparent)',
                }}
                animate={{ x: ['-100%', '400%'] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: 'linear', repeatDelay: 2 }}
              />
            </div>

            <div className="px-7 pt-7 pb-6 sm:px-8 sm:pt-8 sm:pb-7">
              {/* Header */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={mode}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                  className="mb-5"
                >
                  <h1 className="text-2xl sm:text-[26px] font-semibold text-black tracking-tight flex items-center gap-2">
                    {mode === 'login' ? 'Welcome back 👋' : 'Join the squad 🚀'}
                  </h1>
                  <p className="text-sm text-neutral-600 mt-1">
                    {mode === 'login'
                      ? 'Sign in to access your squads and live rooms.'
                      : 'Create your free account and start studying smarter.'}
                  </p>
                </motion.div>
              </AnimatePresence>

              {/* Google Button */}
              <motion.button
                id="google-signin-btn"
                type="button"
                whileHover={{ scale: 1.012 }}
                whileTap={{ scale: 0.98 }}
                disabled={gLoading || loading}
                onClick={() => {
                  setError('');
                  const cid = import.meta.env.VITE_GOOGLE_CLIENT_ID || '569756310563-91mpouatvn8ktuarlrfdhh0fjaju9v7m.apps.googleusercontent.com';
                  if (!cid || cid.includes('YOUR_GOOGLE_CLIENT_ID') || !cid.trim()) {
                    setError('Google Sign-In is temporarily unavailable. Please sign in with your email & password below.');
                    return;
                  }
                  triggerGoogle();
                }}
                className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl text-neutral-800 font-medium text-sm cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed mb-4 transition-all"
                style={{
                  background: 'rgba(255, 255, 255, 0.45)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255, 255, 255, 0.75)',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                }}
              >
                {gLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-neutral-600" />
                    <span>Signing in…</span>
                  </>
                ) : (
                  <>
                    <GoogleIcon className="w-[18px] h-[18px]" />
                    <span>Continue with Google</span>
                  </>
                )}
              </motion.button>

              {/* Divider */}
              <div className="relative flex items-center justify-center mb-4">
                <div className="absolute w-full h-px bg-neutral-300/40" />
                <span
                  className="relative px-3 text-[11px] text-neutral-500 font-medium tracking-wider uppercase rounded-full"
                  style={{
                    background: 'rgba(255, 255, 255, 0.65)',
                    backdropFilter: 'blur(8px)',
                  }}
                >
                  or continue with email
                </span>
              </div>

              {/* Mode Tabs */}
              <div
                className="grid grid-cols-2 p-1 rounded-xl mb-4.5"
                style={{
                  background: 'rgba(0, 0, 0, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.5)',
                }}
              >
                {['login', 'register'].map((m) => (
                  <motion.button
                    key={m}
                    type="button"
                    whileTap={{ scale: 0.97 }}
                    onClick={() => switchMode(m)}
                    className="py-1.5 sm:py-2 text-sm font-semibold rounded-lg transition-all cursor-pointer select-none"
                    style={
                      mode === m
                        ? {
                            background: 'rgba(255, 255, 255, 0.85)',
                            backdropFilter: 'blur(8px)',
                            color: '#1C2E1E',
                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
                          }
                        : { color: '#555555' }
                    }
                  >
                    {m === 'login' ? 'Sign In' : 'Register'}
                  </motion.button>
                ))}
              </div>

              {/* Error & Success Messages */}
              <AnimatePresence>
                {success && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-3.5 px-3 py-2 rounded-xl text-xs sm:text-sm flex items-center gap-2"
                    style={{
                      background: 'rgba(240, 250, 243, 0.85)',
                      backdropFilter: 'blur(8px)',
                      border: '1px solid rgba(28, 46, 30, 0.2)',
                      color: '#1C2E1E',
                    }}
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-700 flex-shrink-0" />
                    <span>{success}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-3.5 px-3 py-2 rounded-xl text-xs sm:text-sm flex items-center gap-2"
                    style={{
                      background: 'rgba(255, 241, 241, 0.85)',
                      backdropFilter: 'blur(8px)',
                      border: '1px solid rgba(220, 50, 50, 0.25)',
                      color: '#b91c1c',
                    }}
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                    <span>{error}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Form */}
              <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                {mode === 'register' && (
                  <motion.div
                    key="name"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">
                      Full Name
                    </label>
                    <div className="relative">
                      <User
                        size={15}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500"
                      />
                      <input
                        id="register-name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Alex Rivera"
                        className="w-full rounded-xl pl-10 pr-4 py-2 text-sm text-neutral-900 placeholder-neutral-500 outline-none transition-all"
                        style={{
                          background: 'rgba(255, 255, 255, 0.45)',
                          backdropFilter: 'blur(10px)',
                          border: '1px solid rgba(0, 0, 0, 0.12)',
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = '#1C2E1E';
                          e.target.style.background = 'rgba(255, 255, 255, 0.65)';
                          e.target.style.boxShadow = '0 0 0 3px rgba(28, 46, 30, 0.08)';
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = 'rgba(0, 0, 0, 0.12)';
                          e.target.style.background = 'rgba(255, 255, 255, 0.45)';
                          e.target.style.boxShadow = 'none';
                        }}
                      />
                    </div>
                  </motion.div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail
                      size={15}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500"
                    />
                    <input
                      id="auth-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="alex@university.edu"
                      className="w-full rounded-xl pl-10 pr-4 py-2 text-sm text-neutral-900 placeholder-neutral-500 outline-none transition-all"
                      style={{
                        background: 'rgba(255, 255, 255, 0.45)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(0, 0, 0, 0.12)',
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#1C2E1E';
                        e.target.style.background = 'rgba(255, 255, 255, 0.65)';
                        e.target.style.boxShadow = '0 0 0 3px rgba(28, 46, 30, 0.08)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = 'rgba(0, 0, 0, 0.12)';
                        e.target.style.background = 'rgba(255, 255, 255, 0.45)';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock
                      size={15}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500"
                    />
                    <input
                      id="auth-password"
                      type={showPass ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-xl pl-10 pr-10 py-2 text-sm text-neutral-900 placeholder-neutral-500 outline-none transition-all"
                      style={{
                        background: 'rgba(255, 255, 255, 0.45)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(0, 0, 0, 0.12)',
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#1C2E1E';
                        e.target.style.background = 'rgba(255, 255, 255, 0.65)';
                        e.target.style.boxShadow = '0 0 0 3px rgba(28, 46, 30, 0.08)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = 'rgba(0, 0, 0, 0.12)';
                        e.target.style.background = 'rgba(255, 255, 255, 0.45)';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass((p) => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-800 transition-colors cursor-pointer"
                    >
                      {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <motion.button
                  id="auth-submit-btn"
                  type="submit"
                  disabled={loading || gLoading}
                  whileHover={{ scale: 1.012 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full mt-1.5 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white cursor-pointer disabled:opacity-50 transition-all select-none shadow-md"
                  style={{
                    background: '#1C2E1E',
                    boxShadow: '0 4px 14px rgba(28, 46, 30, 0.25)',
                  }}
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Processing…</span>
                    </>
                  ) : (
                    <>
                      <span>
                        {mode === 'register'
                          ? 'Create My Account'
                          : 'Sign In to StudySquad'}
                      </span>
                      <ArrowRight size={14} />
                    </>
                  )}
                </motion.button>
              </form>
            </div>

            {/* Card Bottom Strip */}
            <div
              className="px-7 py-3 border-t border-white/40 text-center"
              style={{
                background: 'rgba(255, 255, 255, 0.25)',
              }}
            >
              <p className="text-[11px] text-neutral-500">
                By continuing, you agree to our{' '}
                <span className="text-neutral-800 font-medium cursor-pointer hover:underline">
                  Terms
                </span>
                {' & '}
                <span className="text-neutral-800 font-medium cursor-pointer hover:underline">
                  Privacy Policy
                </span>
              </p>
            </div>
          </div>

          {/* Switch Mode Link Below Card */}
          <p className="mt-3.5 text-center text-xs text-neutral-600 select-none">
            {mode === 'login' ? (
              <>
                New to StudySquad?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('register')}
                  className="text-black font-semibold hover:underline cursor-pointer"
                >
                  Create a free account &rarr;
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="text-black font-semibold hover:underline cursor-pointer"
                >
                  Sign in &rarr;
                </button>
              </>
            )}
          </p>
        </motion.div>
      </main>

      {/* ── Minimal Bottom Footer ── */}
      <footer className="relative z-20 w-full px-6 py-4 text-center">
        <p className="text-xs text-neutral-400 select-none">
          &copy; {new Date().getFullYear()} StudySquad &middot; Focused peer study rooms &amp; accountability.
        </p>
      </footer>
    </div>
  );
}
