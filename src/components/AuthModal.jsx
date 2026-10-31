import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, Mail, Lock, User, ArrowRight, Loader2, KeyRound, CheckCircle2 } from 'lucide-react';
import { useGoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../api/client';

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
  } = useAuth();

  /* form state */
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [resetStep, setResetStep] = useState('request'); // 'request' | 'confirm'
  const [infoMessage, setInfoMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  /* ── Real Google OAuth hook ─────────────────────────────────── */
  const triggerGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setGoogleLoading(true);
      setError('');
      try {
        let gName = 'Google Student';
        let gEmail = '';
        let gAvatar = '';
        let googleId = '';

        try {
          const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
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
          accessToken: tokenResponse.access_token,
          name: gName,
          email: gEmail,
          avatar: gAvatar,
          googleId,
        });
        closeAuthModal();
      } catch (err) {
        console.error('Google profile fetch error:', err);
        setError(err.response?.data?.error || 'Failed to sign in with Google. Please try again.');
      } finally {
        setGoogleLoading(false);
      }
    },
    onError: (err) => {
      console.error('Google OAuth error:', err);
      if (err.error !== 'popup_closed_by_user') {
        setError('Google sign-in was closed or blocked. Make sure pop-ups are allowed.');
      }
    },
  });

  const handleClose = () => {
    setError('');
    setInfoMessage('');
    setResetStep('request');
    setResetToken('');
    setGoogleLoading(false);
    closeAuthModal();
  };

  /* ── Manual email/password or forgot-password submit ────────── */
  const handleManualSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');
    setLoading(true);
    try {
      if (authMode === 'forgot') {
        if (resetStep === 'request') {
          const res = await authAPI.forgotPassword(email.trim());
          setInfoMessage(res.data?.message || 'If that email is registered, a reset code has been sent.');
          if (res.data?.devResetToken) {
            setResetToken(res.data.devResetToken);
          }
          setResetStep('confirm');
        } else {
          if (!resetToken.trim()) {
            setError('Please enter the reset code sent to your email.');
            setLoading(false);
            return;
          }
          if (password.length < 6) {
            setError('New password must be at least 6 characters.');
            setLoading(false);
            return;
          }
          const res = await authAPI.resetPassword(resetToken.trim(), password);
          setInfoMessage(res.data?.message || 'Password updated! You can now sign in.');
          setPassword('');
          setResetToken('');
          setResetStep('request');
          setAuthMode('login');
        }
        return;
      }

      if (authMode === 'register') {
        if (!name.trim()) {
          setError('Please provide your name.');
          setLoading(false);
          return;
        }
        await register(name, email, password);
      } else {
        await login(email, password);
      }
      handleClose();
    } catch (err) {
      if (!err.response) {
        setError('Unable to reach StudySquad servers. Please check your internet connection and try again.');
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

        {/* STUDYSQUAD TRANSPARENT IDENTITY MODAL */}
        <motion.div
          key="identity"
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/60 shadow-2xl backdrop-blur-2xl text-neutral-900 z-10 flex flex-col"
          style={{
            background: 'rgba(255, 255, 255, 0.72)',
            backdropFilter: 'blur(28px) saturate(190%)',
            WebkitBackdropFilter: 'blur(28px) saturate(190%)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.18), inset 0 1px 2px rgba(255, 255, 255, 0.85)',
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
                {authMode === 'register'
                  ? 'Create Your Account'
                  : authMode === 'forgot'
                  ? 'Reset Your Password'
                  : 'Welcome Back'}
              </h2>
              <p className="text-sm text-neutral-600 mt-1">
                {authMode === 'register'
                  ? 'Join squads, sync Pomodoro timers, and study in live AI rooms.'
                  : authMode === 'forgot'
                  ? 'Enter your email address to receive a password reset token.'
                  : 'Sign in to access your squads, tasks, and real-time rooms.'}
              </p>
            </div>

            {authMode !== 'forgot' && (
              <>
                {/* ── REAL GOOGLE SIGN IN BUTTON ── */}
                <button
                  type="button"
                  disabled={googleLoading || loading}
                  onClick={() => {
                    setError('');
                    const clientId =
                      import.meta.env.VITE_GOOGLE_CLIENT_ID ||
                      '569756310563-91mpouatvn8ktuarlrfdhh0fjaju9v7m.apps.googleusercontent.com';
                    if (!clientId || clientId.includes('YOUR_GOOGLE_CLIENT_ID') || clientId.trim() === '') {
                      setError('Google Sign-In is temporarily unavailable. Please sign in with your email & password below.');
                      return;
                    }
                    triggerGoogleLogin();
                  }}
                  className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl text-neutral-800 font-semibold text-sm shadow-xs transition-all border border-white/80 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed bg-white/80 hover:bg-white"
                >
                  {googleLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-neutral-600" /> Signing in with Google…
                    </>
                  ) : (
                    <>
                      <GoogleIcon className="w-[18px] h-[18px] flex-shrink-0" /> Continue with Google
                    </>
                  )}
                </button>

                {/* Divider */}
                <div className="relative flex items-center justify-center my-1">
                  <div className="w-full border-t border-neutral-300/60" />
                  <span
                    className="absolute px-3 text-[11px] font-medium tracking-wider text-neutral-500 rounded-full"
                    style={{ background: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(8px)' }}
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
                    onClick={() => {
                      setAuthMode('login');
                      setError('');
                      setInfoMessage('');
                    }}
                    className={`py-2 text-sm font-semibold rounded-lg transition-all cursor-pointer ${
                      authMode === 'login' ? 'bg-white text-[#1C2E1E] shadow-xs' : 'text-neutral-600 hover:text-black'
                    }`}
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('register');
                      setError('');
                      setInfoMessage('');
                    }}
                    className={`py-2 text-sm font-semibold rounded-lg transition-all cursor-pointer ${
                      authMode === 'register' ? 'bg-white text-[#1C2E1E] shadow-xs' : 'text-neutral-600 hover:text-black'
                    }`}
                  >
                    Register
                  </button>
                </div>
              </>
            )}

            {/* Info Banner */}
            {infoMessage && (
              <div className="p-3 rounded-xl bg-emerald-50/90 border border-emerald-300 text-emerald-800 text-xs sm:text-sm flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{infoMessage}</span>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="p-3 rounded-xl bg-rose-50/90 border border-rose-300 text-rose-700 text-xs sm:text-sm flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-rose-500 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Email/Password / Reset Form */}
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
                      className="w-full rounded-xl pl-10 pr-4 py-2 text-sm text-neutral-900 placeholder-neutral-500 outline-none transition-all bg-white/75 border border-black/15 focus:border-[#1C2E1E]"
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
                    readOnly={authMode === 'forgot' && resetStep === 'confirm'}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="alex@university.edu"
                    className="w-full rounded-xl pl-10 pr-4 py-2 text-sm text-neutral-900 placeholder-neutral-500 outline-none transition-all bg-white/75 border border-black/15 focus:border-[#1C2E1E]"
                  />
                </div>
              </div>

              {authMode === 'forgot' && resetStep === 'confirm' && (
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">Reset Token</label>
                  <div className="relative">
                    <KeyRound size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
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

              {(authMode !== 'forgot' || resetStep === 'confirm') && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-neutral-700">
                      {authMode === 'forgot' ? 'New Password' : 'Password'}
                    </label>
                    {authMode === 'login' && (
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('forgot');
                          setResetStep('request');
                          setError('');
                          setInfoMessage('');
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
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={authMode === 'forgot' ? 'Min 6 characters' : '••••••••'}
                      className="w-full rounded-xl pl-10 pr-4 py-2 text-sm text-neutral-900 placeholder-neutral-500 outline-none transition-all bg-white/75 border border-black/15 focus:border-[#1C2E1E]"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || googleLoading}
                className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white shadow-md transition-all cursor-pointer disabled:opacity-50"
                style={{
                  background: '#1C2E1E',
                  boxShadow: '0 4px 14px rgba(28, 46, 30, 0.25)',
                }}
              >
                {loading ? (
                  <>
                    <Loader2 size={17} className="animate-spin" />
                    Processing...
                  </>
                ) : authMode === 'forgot' ? (
                  <>
                    {resetStep === 'request' ? 'Send Reset Code' : 'Update Password'}
                    <ArrowRight size={16} />
                  </>
                ) : (
                  <>
                    {authMode === 'register' ? 'Join StudySquad' : 'Sign In'}
                    <ArrowRight size={16} />
                  </>
                )}
              </button>

              {authMode === 'forgot' && (
                <div className="flex items-center justify-between text-xs pt-1">
                  {resetStep === 'request' ? (
                    <button
                      type="button"
                      onClick={() => setResetStep('confirm')}
                      className="text-neutral-600 hover:text-black underline cursor-pointer"
                    >
                      Already have a reset token?
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setResetStep('request')}
                      className="text-neutral-600 hover:text-black underline cursor-pointer"
                    >
                      Resend reset token
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('login');
                      setResetStep('request');
                      setError('');
                    }}
                    className="font-semibold text-[#1C2E1E] hover:underline cursor-pointer"
                  >
                    Back to Sign In
                  </button>
                </div>
              )}
            </form>
          </div>

          {/* Footer strip */}
          <div
            className="px-7 pb-5 pt-2 text-center border-t border-white/50 relative z-10"
            style={{ background: 'rgba(255, 255, 255, 0.35)' }}
          >
            <p className="text-[11px] text-neutral-600 mb-1">
              5 free AI study credits every day • Upgrade anytime for Unlimited Pro
            </p>
            <div className="flex flex-col items-center gap-1.5 mt-1">
              <button
                type="button"
                onClick={() => {
                  setAuthMode(authMode === 'register' ? 'login' : 'register');
                  setError('');
                  setInfoMessage('');
                }}
                className="text-[12px] text-[#1C2E1E] font-semibold hover:underline transition-colors cursor-pointer"
              >
                {authMode === 'register'
                  ? 'Already have an account? Sign In →'
                  : 'Create your free account → Join the community'}
              </button>
              <a
                href="/login"
                onClick={(e) => {
                  e.preventDefault();
                  closeAuthModal();
                  if (typeof window !== 'undefined') {
                    window.history.pushState({}, '', '/login');
                    window.dispatchEvent(new PopStateEvent('popstate'));
                  }
                }}
                className="text-[11px] text-neutral-500 hover:text-black underline cursor-pointer"
              >
                Prefer full-screen login page? Click here →
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
