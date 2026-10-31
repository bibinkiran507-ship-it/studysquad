import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ShieldCheck, FileText, RefreshCcw, Mail, Lock } from 'lucide-react';

export const openLegalPolicy = (tab = 'terms') => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('studysquad:open-legal', { detail: tab }));
  }
};

const TABS = [
  { id: 'terms', label: 'Terms & Conditions', shortLabel: 'Terms', icon: FileText },
  { id: 'privacy', label: 'Privacy Policy', shortLabel: 'Privacy', icon: Lock },
  { id: 'refund', label: 'Refund & Cancellation', shortLabel: 'Refunds', icon: RefreshCcw },
  { id: 'contact', label: 'Contact & Pricing', shortLabel: 'Contact', icon: Mail },
];

function detectInitialTabFromUrl() {
  if (typeof window === 'undefined') return null;
  const p = window.location.pathname.toLowerCase();
  if (p.includes('/terms')) return 'terms';
  if (p.includes('/privacy')) return 'privacy';
  if (p.includes('/refund') || p.includes('/cancel')) return 'refund';
  if (p.includes('/contact')) return 'contact';
  return null;
}

export default function LegalPolicyModal() {
  const [activeTab, setActiveTab] = useState(() => detectInitialTabFromUrl());

  useEffect(() => {
    const handler = (e) => {
      setActiveTab(e.detail || 'terms');
    };
    window.addEventListener('studysquad:open-legal', handler);
    return () => window.removeEventListener('studysquad:open-legal', handler);
  }, []);

  const handleClose = () => {
    setActiveTab(null);
    if (typeof window !== 'undefined' && detectInitialTabFromUrl()) {
      window.history.replaceState({}, '', '/');
    }
  };

  if (!activeTab) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[80] flex items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.25 }}
          className="relative w-full max-w-3xl h-full sm:h-auto sm:max-h-[88vh] bg-neutral-900 text-white rounded-none sm:rounded-3xl border-0 sm:border border-white/15 shadow-2xl flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="px-4 sm:px-6 py-4 border-b border-white/10 bg-white/5 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm sm:text-lg font-bold text-white truncate">
                  StudySquad® Legal, Policies &amp; Compliance
                </h2>
                <p className="text-[11px] text-neutral-400 truncate">
                  Last Updated: October 2026 • Operated in India
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="p-2 rounded-full bg-white/5 hover:bg-white/15 text-neutral-400 hover:text-white transition-colors cursor-pointer shrink-0"
              aria-label="Close legal modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Policy Tabs */}
          <div className="flex items-center gap-1.5 px-3 sm:px-6 py-2.5 border-b border-white/10 bg-black/30 overflow-x-auto no-scrollbar shrink-0">
            {TABS.map((t) => {
              const Icon = t.icon;
              const isActive = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTab(t.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 whitespace-nowrap border ${
                    isActive
                      ? 'bg-emerald-500 text-neutral-950 border-emerald-400 shadow-sm'
                      : 'bg-white/5 border-white/10 text-neutral-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden sm:inline">{t.label}</span>
                  <span className="sm:hidden">{t.shortLabel}</span>
                </button>
              );
            })}
          </div>

          {/* Policy Content */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-5 text-xs sm:text-sm text-neutral-300 leading-relaxed">
            {activeTab === 'terms' && (
              <div className="space-y-4">
                <h3 className="text-base sm:text-lg font-bold text-white">Terms &amp; Conditions</h3>
                <p>
                  Welcome to <strong>StudySquad®</strong>. By creating an account, accessing live collaborative study rooms, or purchasing a StudySquad Pro membership, you agree to abide by these Terms &amp; Conditions.
                </p>
                <div className="space-y-2">
                  <h4 className="font-bold text-emerald-300">1. Platform Services</h4>
                  <p>
                    StudySquad provides real-time peer study rooms, synchronized Pomodoro focus timers, collaborative whiteboards, shared academic resources, and AI-powered study assistance (including 3D Flashcards, Practice Quizzes, AI Tutor, Mock Viva, Cheat Sheets, Feynman Explainer, and Code Audit).
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-bold text-emerald-300">2. Subscriptions &amp; Pricing (INR)</h4>
                  <p>
                    Free accounts include collaborative study rooms and up to 5 complimentary AI Academic Studio queries per day. Users may optionally upgrade to <strong>StudySquad Pro</strong> at <strong>₹199 / month</strong> (30 days) or <strong>₹999 / year</strong> (365 days), inclusive of applicable charges, for unlimited AI study tools.
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-bold text-emerald-300">3. User Conduct &amp; Academic Integrity</h4>
                  <p>
                    Users must maintain respectful peer behavior in live chat, whiteboards, and video rooms. Uploading unlawful, abusive, or infringing material is strictly prohibited and may result in account suspension. AI outputs are provided as study aids and educational guidance.
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-bold text-emerald-300">4. Governing Law</h4>
                  <p>
                    These Terms are governed by and construed in accordance with the laws of India.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'privacy' && (
              <div className="space-y-4">
                <h3 className="text-base sm:text-lg font-bold text-white">Privacy Policy</h3>
                <p>
                  StudySquad® respects student privacy and is committed to safeguarding personal information collected when you use our platform.
                </p>
                <div className="space-y-2">
                  <h4 className="font-bold text-emerald-300">1. Information We Collect</h4>
                  <p>
                    When you register via email or Google Sign-In, we collect your name, email address, and profile avatar, along with study room messages, tasks, and notes you voluntarily create on the platform.
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-bold text-emerald-300">2. Payment Security (Razorpay)</h4>
                  <p>
                    All payments are processed securely through <strong>Razorpay</strong> (PCI-DSS Level 1 compliant payment gateway). <strong>StudySquad never collects or stores your credit/debit card numbers, CVV, netbanking credentials, or UPI PINs</strong> on our servers. We store only transaction order IDs and subscription status for verification.
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-bold text-emerald-300">3. Data Usage &amp; Third-Party Sharing</h4>
                  <p>
                    We never sell or rent user personal data to third-party advertisers. Study prompts submitted to the AI Academic Studio are processed strictly to generate your requested educational flashcards, quizzes, and explanations.
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-bold text-emerald-300">4. Account &amp; Data Deletion</h4>
                  <p>
                    You may request modification or complete deletion of your account data at any time by contacting our support desk listed in the Contact tab.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'refund' && (
              <div className="space-y-4">
                <h3 className="text-base sm:text-lg font-bold text-white">Refund &amp; Cancellation Policy</h3>
                <p>
                  StudySquad® offers transparent digital subscriptions designed for students. Please review our delivery, cancellation, and refund terms below:
                </p>
                <div className="space-y-2">
                  <h4 className="font-bold text-emerald-300">1. Instant Digital Delivery (No Physical Shipping)</h4>
                  <p>
                    StudySquad Pro is a 100% digital SaaS membership. Upon successful payment confirmation via Razorpay, Pro access is activated <strong>instantly</strong> on your account. No physical goods are shipped.
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-bold text-emerald-300">2. Cancellation Policy</h4>
                  <p>
                    Passes (₹199 for 30 days or ₹999 for 365 days) do not lock you into forced recurring contracts. You may discontinue at any time, and your Pro benefits remain active until the end of your paid validity period.
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-bold text-emerald-300">3. Refund Eligibility &amp; Timeline</h4>
                  <p>
                    If your bank/UPI account is debited due to a duplicate charge, or if StudySquad Pro fails to activate due to a verified technical error, you may request a full refund within <strong>7 calendar days</strong> of the transaction by emailing your Razorpay Payment ID to our support team.
                  </p>
                  <p>
                    Once approved, refunds are processed via Razorpay and credited back to your original payment method (UPI / Bank / Card) within <strong>5–7 business days</strong>.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'contact' && (
              <div className="space-y-4">
                <h3 className="text-base sm:text-lg font-bold text-white">Contact Us &amp; Merchant Details</h3>
                <p>
                  Have a question regarding your StudySquad account, technical support, or a Razorpay Pro subscription payment? Reach out to us directly:
                </p>
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2.5 text-xs sm:text-sm">
                  <div>
                    <span className="text-neutral-400">Platform / Trade Name:</span>{' '}
                    <strong className="text-white">StudySquad®</strong>
                  </div>
                  <div>
                    <span className="text-neutral-400">Merchant / Founder:</span>{' '}
                    <strong className="text-white">Bibin Pandian</strong>
                  </div>
                  <div>
                    <span className="text-neutral-400">Support &amp; Billing Email:</span>{' '}
                    <a
                      href="mailto:bibinkiran507@gmail.com"
                      className="text-emerald-400 font-semibold hover:underline"
                    >
                      bibinkiran507@gmail.com
                    </a>
                  </div>
                  <div>
                    <span className="text-neutral-400">Operating Region:</span>{' '}
                    <span className="text-neutral-200">Tamil Nadu, India</span>
                  </div>
                  <div>
                    <span className="text-neutral-400">Support Response Time:</span>{' '}
                    <span className="text-neutral-200">Within 24–48 Business Hours (Mon–Sat)</span>
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 space-y-1.5">
                  <h4 className="font-bold text-emerald-300 text-xs sm:text-sm">Published Plan Pricing</h4>
                  <p className="text-xs text-neutral-200">
                    • <strong>Free Tier:</strong> ₹0 (Live Study Rooms, Whiteboard, Chat, Pomodoro + 5 AI queries/day)
                  </p>
                  <p className="text-xs text-neutral-200">
                    • <strong>StudySquad Pro Monthly:</strong> ₹199 for 30 days (Unlimited 7-Engine AI Academic Studio)
                  </p>
                  <p className="text-xs text-neutral-200">
                    • <strong>StudySquad Pro Annual:</strong> ₹999 for 365 days (Full academic year unlimited access)
                  </p>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
