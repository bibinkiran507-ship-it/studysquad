import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Mail, Lock, User, ArrowRight, Loader2,
  Eye, EyeOff, KeyRound,
} from 'lucide-react';
import { useGoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../api/client';
import { GoogleIcon } from './AuthModal';
import BackgroundVideo from './BackgroundVideo';
import { openLegalPolicy } from './LegalPolicyModal';

export default function LoginPage() {
  const { login, register, loginWithGoogle } = useAuth();

  /* Form & Auth state */
  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'forgot'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [resetStep, setResetStep] = useState('request'); // 'request' | 'confirm'
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [gLoading, setGLoading] = useState(false);

  // Auto-open password reset confirmation if ?resetToken=... is in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenFromUrl = params.get('resetToken');
    if (tokenFromUrl) {
      setMode('forgot');
      setResetStep('confirm');
      setResetToken(tokenFromUrl);
    }
  }, []);

  const switchMode = (m) => {
    setMode(m);
    setError('');
    setSuccess('');
    if (m !== 'forgot') {
      setResetStep('request');
    }
  };

  /* Google Sign-In */
  const triggerGoogle = useGoogleLogin({
    onSuccess: async (tok) => {
      setGLoading(true);
      setError('');
      try {
        let gName = 'Google Student';
        let gEmail = '';
        let gAvatar = '';
        let googleId = '';

        try {
          const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${tok.access_token}` },
          });
          if (res.ok) {
            const profile = await res.json();
            gName = profile.name || gName;
            gEmail = profile.email || gEmail;
            gAvatar = profile.picture || gAvatar;
            googleId = profile.sub || googleId;
          }
        } catch (fetchErr) {
          console.warn('Direct userinfo fetch failed, relying on backend verification:', fetchErr);
        }

        await loginWithGoogle({
          accessToken: tok.access_token,
          name: gName,
          email: gEmail,
          avatar: gAvatar,
          googleId,
        });
        if (window.location.pathname === '/login') {
          window.history.replaceState({}, document.title, '/');
        }
      } catch (err) {
        console.error('Google profile fetch error:', err);
        setError(err.response?.data?.error || 'Failed to sign in with Google. Please try again.');
      } finally {
        setGLoading(false);
      }
    },
    onError: (err) => {
      console.error('Google sign-in error:', err);
      if (err.error !== 'popup_closed_by_user') {
        setError('Google sign-in was closed or blocked. Please make sure pop-ups are allowed.');
      }
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (mode === 'forgot') {
        if (resetStep === 'request') {
          const res = await authAPI.forgotPassword(email.trim());
          setSuccess(res.data?.message || 'If that email exists, a reset code has been sent.');
          if (res.data?.devResetToken) {
            setResetToken(res.data.devResetToken);
          }
          setResetStep('confirm');
        } else {
          if (!resetToken.trim()) {
            setError('Please enter your password reset token.');
            setLoading(false);
            return;
          }
          if (password.length < 6) {
            setError('New password must be at least 6 characters.');
            setLoading(false);
            return;
          }
          const res = await authAPI.resetPassword(resetToken.trim(), password);
          setSuccess(res.data?.message || 'Password updated! You can now sign in.');
          setPassword('');
          setResetToken('');
          setResetStep('request');
          setMode('login');
        }
        return;
      }

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
      if (window.location.pathname === '/login') {
        window.history.replaceState({}, document.title, '/');
      }
    } catch (err) {
      if (!err.response) {
        setError('Unable to reach StudySquad servers. Please check your internet connection and try again.');
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
    <div className="relative min-h-screen w-full flex flex-col justify-between overflow-x-hidden bg-[#e9ebe6] select-none">
      <BackgroundVideo />

      {/* ── Minimal Brand Header ── */}
      <header className="relative z-20 w-full px-6 sm:px-10 py-5 sm:py-6 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2.5 group">
          <span className="text-[22px] sm:text-[26px] tracking-tight text-black font-semibold select-none group-hover:opacity-80 transition-opacity">
            StudySquad&reg;
          </span>
          <span className="text-[24px] sm:text-[28px] text-emerald-800 select-none tracking-[-0.02em] font-medium leading-none mb-0.5">
            &#10033;
          </span>
        </a>

        <div className="flex items-center gap-2">
          <a
            href="/"
            className="text-xs sm:text-sm font-medium text-neutral-700 hover:text-black px-3 py-1.5 rounded-full bg-white/40 hover:bg-white/60 backdrop-blur-md border border-white/60 transition-all"
          >
            Explore Squads
          </a>
          <button
            type="button"
            onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
            className="text-xs sm:text-sm font-semibold text-neutral-800 hover:text-black px-3.5 py-1.5 rounded-full bg-white/55 hover:bg-white/75 backdrop-blur-md border border-white/70 transition-all cursor-pointer shadow-xs"
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
          <div
            className="relative rounded-3xl overflow-hidden backdrop-blur-2xl transition-all"
            style={{
              background: 'rgba(255, 255, 255, 0.55)',
              backdropFilter: 'blur(28px) saturate(190%)',
              WebkitBackdropFilter: 'blur(28px) saturate(190%)',
              border: '1px solid rgba(255, 255, 255, 0.7)',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.09), 0 2px 10px rgba(0, 0, 0, 0.04), inset 0 1px 1.5px rgba(255, 255, 255, 0.85)',
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
                    {mode === 'login'
                      ? 'Welcome back 👋'
                      : mode === 'register'
                      ? 'Join the squad 🚀'
                      : 'Reset password 🔐'}
                  </h1>
                  <p className="text-sm text-neutral-600 mt-1">
                    {mode === 'login'
                      ? 'Sign in to access your squads and live rooms.'
                      : mode === 'register'
                      ? 'Create your free account and start studying smarter.'
                      : 'Request a reset code or set your new password below.'}
                  </p>
                </motion.div>
              </AnimatePresence>

              {mode !== 'forgot' && (
                <>
                  {/* Google Button */}
                  <motion.button
                    id="google-signin-btn"
                    type="button"
                    whileHover={{ scale: 1.012 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={gLoading || loading}
                    onClick={() => {
                      setError('');
                      const cid =
                        import.meta.env.VITE_GOOGLE_CLIENT_ID ||
                        '569756310563-91mpouatvn8ktuarlrfdhh0fjaju9v7m.apps.googleusercontent.com';
                      if (!cid || cid.includes('YOUR_GOOGLE_CLIENT_ID') || !cid.trim()) {
                        setError('Google Sign-In is temporarily unavailable. Please sign in with your email & password below.');
                        return;
                      }
                      triggerGoogle();
                    }}
                    className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl text-neutral-800 font-medium text-sm cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed mb-4 transition-all bg-white/80 hover:bg-white border border-white/90 shadow-xs"
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
                    <div className="absolute w-full h-px bg-neutral-300/60" />
                    <span
                      className="relative px-3 text-[11px] text-neutral-500 font-medium tracking-wider uppercase rounded-full"
                      style={{
                        background: 'rgba(255, 255, 255, 0.8)',
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
                                background: 'rgba(255, 255, 255, 0.92)',
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
                </>
              )}

              {/* Error & Success Messages */}
              <AnimatePresence>
                {success && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-3.5 px-3 py-2 rounded-xl text-xs sm:text-sm flex items-center gap-2 bg-emerald-50/90 border border-emerald-300 text-[#1C2E1E]"
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
                    className="mb-3.5 px-3 py-2 rounded-xl text-xs sm:text-sm flex items-center gap-2 bg-rose-50/90 border border-rose-300 text-rose-700"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                    <span>{error}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Form */}
              <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                {mode === 'register' && (
                  <div>
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
                        className="w-full rounded-xl pl-10 pr-4 py-2 text-sm text-neutral-900 placeholder-neutral-500 outline-none transition-all bg-white/75 border border-black/15 focus:border-[#1C2E1E]"
                      />
                    </div>
                  </div>
                )}

                {!(mode === 'forgot' && resetStep === 'confirm' && !email) && (
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
                        required={mode !== 'forgot' || resetStep === 'request'}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="alex@university.edu"
                        className="w-full rounded-xl pl-10 pr-4 py-2 text-sm text-neutral-900 placeholder-neutral-500 outline-none transition-all bg-white/75 border border-black/15 focus:border-[#1C2E1E]"
                      />
                    </div>
                  </div>
                )}

                {mode === 'forgot' && resetStep === 'confirm' && (
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">
                      Reset Token
                    </label>
                    <div className="relative">
                      <KeyRound
                        size={15}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500"
                      />
                      <input
                        type="text"
                        required
                        value={resetToken}
                        onChange={(e) => setResetToken(e.target.value)}
                        placeholder="Paste reset token from email"
                        className="w-full rounded-xl pl-10 pr-4 py-2 text-xs font-mono text-neutral-900 placeholder-neutral-500 outline-none transition-all bg-white/75 border border-black/15 focus:border-[#1C2E1E]"
                      />
                    </div>
                  </div>
                )}

                {(mode !== 'forgot' || resetStep === 'confirm') && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-neutral-700">
                        {mode === 'forgot' ? 'New Password' : 'Password'}
                      </label>
                      {mode === 'login' && (
                        <button
                          type="button"
                          onClick={() => switchMode('forgot')}
                          className="text-xs text-neutral-700 hover:text-black hover:underline cursor-pointer"
                        >
                          Forgot password?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Lock
                        size={15}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500"
                      />
                      <input
                        id="auth-password"
                        type={showPass ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={mode === 'forgot' ? 'Min 6 characters' : '••••••••'}
                        className="w-full rounded-xl pl-10 pr-10 py-2 text-sm text-neutral-900 placeholder-neutral-500 outline-none transition-all bg-white/75 border border-black/15 focus:border-[#1C2E1E]"
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
                )}

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
                          : mode === 'forgot'
                          ? resetStep === 'request'
                            ? 'Send Reset Code'
                            : 'Save New Password'
                          : 'Sign In to StudySquad'}
                      </span>
                      <ArrowRight size={14} />
                    </>
                  )}
                </motion.button>

                {mode === 'forgot' && (
                  <div className="flex items-center justify-between text-xs pt-1">
                    {resetStep === 'request' ? (
                      <button
                        type="button"
                        onClick={() => setResetStep('confirm')}
                        className="text-neutral-600 hover:text-black underline cursor-pointer"
                      >
                        Have a reset token?
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setResetStep('request')}
                        className="text-neutral-600 hover:text-black underline cursor-pointer"
                      >
                        Request new token
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => switchMode('login')}
                      className="font-semibold text-[#1C2E1E] hover:underline cursor-pointer"
                    >
                      Back to Sign In
                    </button>
                  </div>
                )}
              </form>
            </div>

            {/* Card Bottom Strip */}
            <div
              className="px-7 py-3 border-t border-white/50 text-center"
              style={{
                background: 'rgba(255, 255, 255, 0.35)',
              }}
            >
              <p className="text-[11px] text-neutral-600">
                By continuing, you agree to our{' '}
                <button
                  type="button"
                  onClick={() => openLegalPolicy('terms')}
                  className="text-neutral-900 font-medium cursor-pointer hover:underline"
                >
                  Terms
                </button>
                {' & '}
                <button
                  type="button"
                  onClick={() => openLegalPolicy('privacy')}
                  className="text-neutral-900 font-medium cursor-pointer hover:underline"
                >
                  Privacy Policy
                </button>
              </p>
            </div>
          </div>

          {/* Switch Mode Link Below Card */}
          <p className="mt-3.5 text-center text-xs text-neutral-700 select-none">
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
      <footer className="relative z-20 w-full px-6 py-3.5 text-center space-y-1">
        <div className="flex items-center justify-center flex-wrap gap-x-3 gap-y-1 text-[11px] text-neutral-600">
          <button
            type="button"
            onClick={() => openLegalPolicy('terms')}
            className="hover:text-neutral-900 transition-colors cursor-pointer"
          >
            Terms &amp; Conditions
          </button>
          <span className="opacity-40">&bull;</span>
          <button
            type="button"
            onClick={() => openLegalPolicy('privacy')}
            className="hover:text-neutral-900 transition-colors cursor-pointer"
          >
            Privacy Policy
          </button>
          <span className="opacity-40">&bull;</span>
          <button
            type="button"
            onClick={() => openLegalPolicy('refund')}
            className="hover:text-neutral-900 transition-colors cursor-pointer"
          >
            Refund &amp; Cancellation
          </button>
          <span className="opacity-40">&bull;</span>
          <button
            type="button"
            onClick={() => openLegalPolicy('contact')}
            className="hover:text-neutral-900 transition-colors cursor-pointer"
          >
            Contact Us
          </button>
        </div>
        <p className="text-[11px] text-neutral-500 select-none">
          &copy; {new Date().getFullYear()} StudySquad&reg; &middot; Focused peer study rooms &amp; accountability.
        </p>
      </footer>
    </div>
  );
}
