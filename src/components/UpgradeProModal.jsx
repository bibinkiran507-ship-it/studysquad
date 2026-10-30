import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Crown,
  CheckCircle2,
  Sparkles,
  Zap,
  BookOpen,
  Lock,
  ShieldCheck,
  Loader2,
  ArrowRight,
  Flame,
  Bot,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { paymentAPI } from '../api/client';

export default function UpgradeProModal({ isOpen, onClose }) {
  const { user, setUser, refreshUser, openAuthModal } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState('yearly'); // 'monthly' | 'yearly'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleDevTogglePro = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await paymentAPI.devActivatePro();
      if (res.data?.user) {
        if (setUser) setUser(res.data.user);
        if (refreshUser) await refreshUser();
        setSuccess(true);
        setTimeout(() => setSuccess(false), 2500);
      }
    } catch (err) {
      setError('Failed to toggle test Pro mode.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // Load Razorpay checkout script dynamically
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleSubscribe = async () => {
    if (!user) {
      onClose();
      openAuthModal('register');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 1. Create order on backend
      const res = await paymentAPI.createOrder(selectedPlan);
      const { orderId, amount, currency, keyId } = res.data;

      // 2. Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        setError('Failed to load Razorpay payment SDK. Please check your internet connection.');
        setLoading(false);
        return;
      }

      if (!keyId || (!keyId.startsWith('rzp_test_') && !keyId.startsWith('rzp_live_'))) {
        setError('Payment gateway is not configured yet. Please configure Razorpay keys in backend/.env to accept payments.');
        setLoading(false);
        return;
      }

      // 3. Open Razorpay live / test checkout popup
      const options = {
        key: keyId,
        amount,
        currency,
        name: 'StudySquad',
        description: selectedPlan === 'yearly' ? 'StudySquad Pro (Yearly)' : 'StudySquad Pro (Monthly)',
        image: 'https://api.dicebear.com/7.x/shapes/svg?seed=StudySquad',
        order_id: orderId,
        prefill: {
          name: user.name || '',
          email: user.email || '',
        },
        theme: {
          color: '#10b981', // Emerald theme
        },
        handler: async (response) => {
          try {
            const verifyRes = await paymentAPI.verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              plan: selectedPlan,
            });

            if (verifyRes.data.success) {
              if (setUser) setUser(verifyRes.data.user);
              if (refreshUser) await refreshUser();
              setSuccess(true);
              setTimeout(() => {
                setSuccess(false);
                onClose();
              }, 2200);
            }
          } catch (verifyErr) {
            console.error('Payment verification failed:', verifyErr);
            setError('Payment verification failed. Please contact support if debited.');
          }
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
          },
        },
      };

      const razorpayInstance = new window.Razorpay(options);
      razorpayInstance.on('payment.failed', (failRes) => {
        setError(`Payment failed: ${failRes.error.description || 'Unknown error'}`);
        setLoading(false);
      });
      razorpayInstance.open();
    } catch (err) {
      console.error('Subscription error:', err);
      setError(err.response?.data?.error || 'Failed to start payment checkout. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const PRO_PERKS = [
    {
      icon: Bot,
      title: '🤖 24/7 AI Study Copilot & Tutor',
      desc: 'Conversational ChatGPT & Gemini academic tutor for problem solving, math derivations & code debugging.',
    },
    {
      icon: Sparkles,
      title: '🎙️ AI Mock Viva & Oral Examiner',
      desc: 'Interactive oral interview simulator with real-time scoring (1-10) and examiner feedback.',
    },
    {
      icon: BookOpen,
      title: '⚡ 1-Page High-Yield Cheat Sheets',
      desc: 'Instant synthesis of formulas, invariants, and exam traps into dense revision sheets.',
    },
    {
      icon: Zap,
      title: '💡 Feynman 3-Tier Concept Explainer',
      desc: 'Master complex concepts via ELI5 analogies, academic derivations, and exam gotchas.',
    },
    {
      icon: ShieldCheck,
      title: '🛠️ AI Code & Solution Auditor',
      desc: 'Big-O complexity analyzer, hidden edge-case scanner, and optimized refactored solutions.',
    },
    {
      icon: Crown,
      title: '🎴 Unlimited 3D Flashcards & Quizzes',
      desc: 'Unlimited Google Gemini active recall decks and auto-graded practice exams.',
    },
    {
      icon: Lock,
      title: '📄 Lecture PDF & Slides AI Chat',
      desc: 'Upload 30MB textbooks, notes, and lecture slides with deep multimodal AI Q&A.',
    },
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="relative w-full max-w-2xl bg-neutral-900 border border-emerald-500/30 rounded-3xl shadow-2xl overflow-hidden p-6 sm:p-8 text-white max-h-[92vh] overflow-y-auto"
        >
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="text-center max-w-md mx-auto mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-400/40 text-amber-300 text-xs font-bold uppercase tracking-wider mb-3">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              StudySquad Pro Membership
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Supercharge Your Academic Grades
            </h2>
            <p className="text-sm text-neutral-300 mt-2">
              Unlock unlimited AI academic coaching, private rooms, and live lecture document understanding.
            </p>
          </div>

          {/* Success state banner */}
          {success && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-4 mb-6 rounded-2xl bg-emerald-500/20 border border-emerald-400/60 text-center text-emerald-300 font-bold flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span>🎉 Payment verified! Welcome to StudySquad Pro!</span>
            </motion.div>
          )}

          {/* Active Pro Member Banner */}
          {user?.isPro && (
            <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-amber-500/20 border border-amber-400/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-500 text-neutral-950 flex items-center justify-center font-bold shadow-sm shrink-0">
                  <Crown className="w-5 h-5 text-neutral-950" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-amber-200">
                    Active StudySquad Pro Member
                  </h4>
                  <p className="text-xs text-neutral-300">
                    Current Plan: <span className="font-semibold text-white capitalize">{user.proPlan || 'Annual'}</span> • All premium AI & priority rooms unlocked.
                  </p>
                  <button
                    type="button"
                    onClick={handleDevTogglePro}
                    className="mt-1.5 text-[11px] text-amber-300 hover:text-white underline cursor-pointer"
                  >
                    Switch to Free Plan (Test Daily 5-Query Limit)
                  </button>
                </div>
              </div>
              <span className="text-[11px] font-black text-neutral-950 bg-amber-400 px-3 py-1 rounded-full uppercase tracking-wider self-start sm:self-center shrink-0 shadow-xs">
                Active
              </span>
            </div>
          )}

          {/* Error Alert Banner */}
          {error && (
            <div className="p-3.5 mb-6 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-semibold text-center flex flex-col items-center justify-center gap-2">
              <span>⚠️ {error}</span>
              {error.includes('Razorpay') && (
                <button
                  type="button"
                  onClick={handleDevTogglePro}
                  className="mt-1 px-4 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black text-xs font-bold transition-all cursor-pointer shadow-md inline-flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>⚡ Activate Instant Test Pro ({user?.isPro ? 'Switch to Free' : 'Switch to Pro'})</span>
                </button>
              )}
            </div>
          )}

          {/* Plan Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            {/* Monthly Plan */}
            <div
              onClick={() => setSelectedPlan('monthly')}
              className={`p-4 rounded-2xl border-2 cursor-pointer transition-all relative ${
                selectedPlan === 'monthly'
                  ? 'border-emerald-400 bg-emerald-950/40 shadow-lg shadow-emerald-500/10'
                  : 'border-white/10 bg-white/5 hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-neutral-200">Monthly Plan</span>
                <span className="text-xs px-2 py-0.5 rounded-md bg-white/10 text-neutral-300">
                  Cancel anytime
                </span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-white">₹199</span>
                <span className="text-xs text-neutral-400">/ month</span>
              </div>
              <p className="text-[11px] text-neutral-400 mt-2">
                Billed monthly. Perfect for midterms & exam sprint revision.
              </p>
            </div>

            {/* Yearly Plan (Best Value) */}
            <div
              onClick={() => setSelectedPlan('yearly')}
              className={`p-4 rounded-2xl border-2 cursor-pointer transition-all relative ${
                selectedPlan === 'yearly'
                  ? 'border-amber-400 bg-amber-950/30 shadow-lg shadow-amber-500/10'
                  : 'border-white/10 bg-white/5 hover:border-white/20'
              }`}
            >
              <div className="absolute -top-2.5 right-4 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 text-neutral-950 text-[10px] font-black uppercase tracking-wider shadow-sm flex items-center gap-1">
                <Flame className="w-3 h-3" /> Best Value • 60% OFF
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-amber-300">Annual Scholar</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-white">₹999</span>
                <span className="text-xs text-neutral-400">/ year (₹83/mo)</span>
              </div>
              <p className="text-[11px] text-neutral-300 mt-2">
                Full academic year access. Includes all semester board & placement updates.
              </p>
            </div>
          </div>

          {/* Perks list */}
          <div className="space-y-2.5 mb-6 bg-white/5 p-4 rounded-2xl border border-white/10">
            <span className="text-xs font-bold text-neutral-300 uppercase tracking-wider block mb-2">
              Everything included in StudySquad Pro:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {PRO_PERKS.map((perk, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <perk.icon className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-semibold text-neutral-200 block">{perk.title}</span>
                    <span className="text-[11px] text-neutral-400 leading-tight block">{perk.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Payment CTA button */}
          <button
            type="button"
            disabled={loading || success}
            onClick={handleSubscribe}
            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-500 text-neutral-950 font-extrabold text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 transition-all cursor-pointer active:scale-98 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Opening Razorpay Secure Checkout...</span>
              </>
            ) : success ? (
              <>
                <CheckCircle2 className="w-5 h-5" />
                <span>Pro Activated!</span>
              </>
            ) : (
              <>
                <Crown className="w-5 h-5 text-amber-950" />
                <span>
                  {user?.isPro ? 'Renew / Switch Plan' : 'Upgrade to Pro'} • {selectedPlan === 'yearly' ? '₹999 / Year' : '₹199 / Month'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          {/* Razorpay Security Badge */}
          <div className="flex items-center justify-center gap-4 mt-4 text-[11px] text-neutral-400 font-medium">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Secured by Razorpay
            </span>
            <span>•</span>
            <span>Supports UPI, GPay, PhonePe, Cards & Netbanking</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
