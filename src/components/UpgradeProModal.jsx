import React, { useState, useEffect } from 'react';
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
  RefreshCw,
  Receipt,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { paymentAPI } from '../api/client';

export default function UpgradeProModal({ isOpen, onClose }) {
  const { user, setUser, refreshUser, openAuthModal } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState('yearly'); // 'monthly' | 'yearly'
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [reconciling, setReconciling] = useState(false);
  const [error, setError] = useState('');
  const [infoNote, setInfoNote] = useState('');
  const [success, setSuccess] = useState(false);
  const [receipts, setReceipts] = useState([]);

  useEffect(() => {
    if (!isOpen || !user) return;
    setError('');
    setInfoNote('');
    paymentAPI
      .getHistory()
      .then((res) => {
        if (Array.isArray(res.data?.orders)) {
          setReceipts(res.data.orders);
        }
      })
      .catch(() => {});
  }, [isOpen, user?.id, success]);

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
    } catch {
      setError('Failed to toggle test Pro mode.');
    } finally {
      setLoading(false);
    }
  };

  // Self-service UPI / GPay payment recovery button
  const handleReconcilePayment = async () => {
    if (!user) {
      onClose();
      openAuthModal('login');
      return;
    }

    setReconciling(true);
    setError('');
    setInfoNote('');
    try {
      const res = await paymentAPI.reconcile();
      if (res.data?.recovered) {
        if (res.data.user && setUser) setUser(res.data.user);
        if (refreshUser) await refreshUser();
        setSuccess(true);
        setInfoNote(res.data.message || 'Your UPI payment was found and Pro membership is now active!');
      } else {
        setInfoNote(
          res.data?.message ||
            'No unactivated payment was found yet. If UPI just debited, wait 10 seconds and tap Check again.'
        );
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Could not check payment status right now. Please try again in a few seconds.');
    } finally {
      setReconciling(false);
    }
  };

  if (!isOpen) return null;

  // Load Razorpay checkout script dynamically on demand
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
    setInfoNote('');

    try {
      // 1. Create order on backend
      const res = await paymentAPI.createOrder(selectedPlan);
      const { orderId, amount, currency, keyId } = res.data;

      // 2. Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        setError('Failed to load Razorpay payment checkout. Please check your internet connection.');
        setLoading(false);
        return;
      }

      if (!keyId || (!keyId.startsWith('rzp_test_') && !keyId.startsWith('rzp_live_'))) {
        setError('Payment checkout is temporarily unavailable. Please try again shortly.');
        setLoading(false);
        return;
      }

      // 3. Open Razorpay live / test checkout popup
      const options = {
        key: keyId,
        amount,
        currency,
        name: 'StudySquad AI',
        description:
          selectedPlan === 'yearly'
            ? 'StudySquad Pro — Annual Scholar (365 Days)'
            : 'StudySquad Pro — Monthly Plan (30 Days)',
        image: 'https://studysquadai.com/favicon.svg',
        order_id: orderId,
        prefill: {
          name: user.name || '',
          email: user.email || '',
        },
        theme: {
          color: '#10b981',
        },
        handler: async (response) => {
          setVerifying(true);
          setError('');
          try {
            const verifyRes = await paymentAPI.verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            if (verifyRes.data?.success) {
              if (verifyRes.data.user && setUser) setUser(verifyRes.data.user);
              if (refreshUser) await refreshUser();
              window.dispatchEvent(new CustomEvent('studysquad:pro-activated'));
              setSuccess(true);
              setTimeout(() => {
                setSuccess(false);
                onClose();
              }, 2400);
            }
          } catch (verifyErr) {
            console.error('Payment verification error, attempting auto-reconcile:', verifyErr);
            try {
              const rec = await paymentAPI.reconcile();
              if (rec.data?.recovered) {
                if (rec.data.user && setUser) setUser(rec.data.user);
                if (refreshUser) await refreshUser();
                window.dispatchEvent(new CustomEvent('studysquad:pro-activated'));
                setSuccess(true);
                return;
              }
            } catch {
              // Fall through to helpful UI guidance
            }
            setError(
              'Your payment is being confirmed by Razorpay. Tap "Check & Restore Pro Status" below in 5 seconds to activate immediately.'
            );
          } finally {
            setVerifying(false);
            setLoading(false);
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
        setError(`Payment was not completed: ${failRes?.error?.description || 'Please try again.'}`);
        setLoading(false);
      });
      razorpayInstance.open();
    } catch (err) {
      console.error('Subscription error:', err);
      setError(err.response?.data?.error || 'Failed to start payment checkout. Please try again.');
      setLoading(false);
    }
  };

  const PRO_PERKS = [
    {
      icon: Bot,
      title: '🤖 Unlimited 24/7 AI Study Copilot',
      desc: 'No 5/day cap — ask unlimited STEM, coding, exam & math derivation questions anytime.',
    },
    {
      icon: Sparkles,
      title: '🎙️ AI Mock Viva & Oral Examiner',
      desc: 'Interactive oral interview simulator with real-time scoring (1–10) and model answers.',
    },
    {
      icon: BookOpen,
      title: '⚡ 1-Page High-Yield Cheat Sheets',
      desc: 'Instant synthesis of formulas, invariants, and exam traps into printable revision sheets.',
    },
    {
      icon: Zap,
      title: '💡 Feynman 3-Tier Concept Explainer',
      desc: 'Master tough topics via ELI5 analogies, university derivations, and exam gotchas.',
    },
    {
      icon: ShieldCheck,
      title: '🛠️ AI Code & Solution Auditor',
      desc: 'Big-O time/space complexity analyzer, hidden edge-case scanner, and refactored code.',
    },
    {
      icon: Crown,
      title: '🎴 Unlimited 3D Flashcards & Quizzes',
      desc: 'Generate unlimited active-recall flashcard decks and auto-graded MCQ practice exams.',
    },
    {
      icon: Lock,
      title: '📄 Lecture PDF, DOCX & PPTX AI Chat',
      desc: 'Upload 30 MB textbooks, Word docs, and PowerPoint lecture slides with instant AI Q&A.',
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
            disabled={verifying}
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-colors cursor-pointer disabled:opacity-40"
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
              Free accounts include 5 AI generations/day. Upgrade to Pro for unlimited access to all 7 AI Academic Engines &amp; 30 MB document chat.
            </p>
          </div>

          {/* Verifying Payment Banner */}
          {verifying && (
            <div className="p-4 mb-6 rounded-2xl bg-emerald-500/15 border border-emerald-400/50 text-center text-emerald-200 font-semibold flex items-center justify-center gap-2.5">
              <Loader2 className="w-5 h-5 animate-spin text-emerald-400 shrink-0" />
              <span>Verifying your payment with Razorpay &amp; activating StudySquad Pro…</span>
            </div>
          )}

          {/* Success state banner */}
          {success && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-4 mb-6 rounded-2xl bg-emerald-500/20 border border-emerald-400/60 text-center text-emerald-300 font-bold flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>🎉 Payment verified! StudySquad Pro is active on your account!</span>
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
                    Current Plan:{' '}
                    <span className="font-semibold text-white capitalize">
                      {user.proPlan === 'yearly' ? 'Annual Scholar' : 'Monthly Plan'}
                    </span>
                    {user.proExpiresAt
                      ? ` • Valid until ${new Date(user.proExpiresAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}`
                      : ' • Unlimited AI unlocked.'}
                  </p>
                  <p className="text-[11px] text-amber-200/80 mt-0.5">
                    Extending adds +30 or +365 days directly on top of your existing validity date.
                  </p>
                  {import.meta.env.DEV && (
                    <button
                      type="button"
                      onClick={handleDevTogglePro}
                      className="mt-1.5 text-[11px] text-amber-300 hover:text-white underline cursor-pointer"
                    >
                      Switch to Free Plan (Dev Test Only)
                    </button>
                  )}
                </div>
              </div>
              <span className="text-[11px] font-black text-neutral-950 bg-amber-400 px-3 py-1 rounded-full uppercase tracking-wider self-start sm:self-center shrink-0 shadow-xs">
                Active
              </span>
            </div>
          )}

          {/* Info Note Banner */}
          {infoNote && !error && (
            <div className="p-3.5 mb-5 rounded-xl bg-cyan-500/15 border border-cyan-400/40 text-cyan-200 text-xs font-medium text-center">
              {infoNote}
            </div>
          )}

          {/* Error Alert Banner */}
          {error && (
            <div className="p-3.5 mb-6 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-semibold text-center flex flex-col items-center justify-center gap-2">
              <span>⚠️ {error}</span>
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
                  30 Days Access
                </span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-white">₹199</span>
                <span className="text-xs text-neutral-400">/ month</span>
              </div>
              <p className="text-[11px] text-neutral-400 mt-2">
                One-time 30-day pass (no auto-debit). Perfect for midterms &amp; exam sprints.
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
                <Flame className="w-3 h-3" /> Best Value • Save 58%
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-amber-300">Annual Scholar</span>
                <span className="text-xs px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-200">
                  365 Days
                </span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-white">₹999</span>
                <span className="text-xs text-neutral-400">/ year (₹83/mo)</span>
              </div>
              <p className="text-[11px] text-neutral-300 mt-2">
                Full academic year access across all semesters, vivas &amp; placement prep.
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
            disabled={loading || verifying || reconciling || success}
            onClick={handleSubscribe}
            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-500 text-neutral-950 font-extrabold text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 transition-all cursor-pointer active:scale-98 disabled:opacity-50"
          >
            {verifying ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Verifying Payment &amp; Activating Pro…</span>
              </>
            ) : loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Complete Payment in Razorpay Window…</span>
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
                  {user?.isPro
                    ? `Extend Pro Validity (${selectedPlan === 'yearly' ? '+365 Days • ₹999' : '+30 Days • ₹199'})`
                    : `Upgrade to Pro • ${selectedPlan === 'yearly' ? '₹999 / Year' : '₹199 / Month'}`}
                </span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          {/* Self-Service UPI Recovery & Security Footer */}
          <div className="mt-4 flex flex-col items-center gap-2.5">
            {user && (
              <button
                type="button"
                disabled={reconciling || loading || verifying}
                onClick={handleReconcilePayment}
                className="inline-flex items-center gap-1.5 text-xs text-emerald-300 hover:text-emerald-200 font-semibold underline underline-offset-4 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${reconciling ? 'animate-spin' : ''}`} />
                <span>
                  {reconciling
                    ? 'Checking Razorpay for recent UPI / Card payments…'
                    : 'Paid via UPI / GPay & browser refreshed? Tap to Check & Restore Pro'}
                </span>
              </button>
            )}

            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-neutral-400 font-medium">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Secured by Razorpay
              </span>
              <span>•</span>
              <span>Instant UPI QR, GPay, PhonePe, Paytm, Cards &amp; Netbanking</span>
            </div>
          </div>

          {/* Payment Receipts History */}
          {receipts.length > 0 && (
            <div className="mt-5 pt-4 border-t border-white/10">
              <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-300 mb-2">
                <Receipt className="w-3.5 h-3.5 text-emerald-400" />
                <span>Your Payment Receipts</span>
              </div>
              <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                {receipts.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between text-[11px] px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-neutral-300"
                  >
                    <div>
                      <span className="font-semibold text-white capitalize">
                        {order.plan === 'yearly' ? 'Annual Scholar' : 'Monthly Plan'}
                      </span>
                      <span className="text-neutral-400 ml-2 font-mono">
                        {order.paymentId || order.orderId}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-emerald-300">
                        ₹{Math.round((order.amount || 0) / 100)}
                      </span>
                      <span className="text-neutral-400 ml-2">
                        {new Date(order.paidAt || order.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
