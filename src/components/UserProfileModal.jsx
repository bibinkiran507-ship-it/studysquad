import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Edit3,
  Save,
  Timer,
  Users,
  BookOpen,
  Calendar,
  Shield,
  CheckCircle2,
  Mail,
  Camera,
  Loader2,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  Trophy,
  Flame,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../api/client';

export default function UserProfileModal() {
  const { user, isProfileOpen, closeProfile, updateProfile, logout, openAuthModal } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'security'
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Edit fields
  const [editName, setEditName] = useState(user?.name || '');
  const [editBio, setEditBio] = useState(user?.bio || '');
  const [editAvatar, setEditAvatar] = useState(user?.avatar || '');

  // Password reset
  const [resetEmail, setResetEmail] = useState(user?.email || '');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [resetStep, setResetStep] = useState('request'); // 'request' | 'confirm'

  if (!isProfileOpen || !user) return null;

  const handleStartEdit = () => {
    setEditName(user.name || '');
    setEditBio(user.bio || '');
    setEditAvatar(user.avatar || '');
    setIsEditing(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateProfile({
        name: editName.trim(),
        bio: editBio.trim(),
        avatar: editAvatar.trim() || undefined,
      });
      setSaveSuccess(true);
      setIsEditing(false);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Profile update error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!resetEmail) return;
    setResetLoading(true);
    setResetMessage('');
    try {
      const res = await authAPI.forgotPassword(resetEmail);
      setResetMessage(res.data.message);
      // Dev mode: token returned directly
      if (res.data.devResetToken) {
        setResetToken(res.data.devResetToken);
        setResetStep('confirm');
      }
    } catch (err) {
      setResetMessage(err.response?.data?.error || 'Something went wrong.');
    } finally {
      setResetLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetToken || !newPassword) return;
    setResetLoading(true);
    try {
      const res = await authAPI.resetPassword(resetToken, newPassword);
      setResetMessage('✅ ' + res.data.message);
      setResetStep('request');
      setNewPassword('');
      setResetToken('');
    } catch (err) {
      setResetMessage(err.response?.data?.error || 'Reset failed.');
    } finally {
      setResetLoading(false);
    }
  };

  const avatarSrc =
    user.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(user.name)}`;

  const memberSince = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : '—';

  const stats = [
    {
      icon: Flame,
      label: 'Pomodoro Sessions',
      value: user.pomodoroSessions ?? 0,
      color: 'text-orange-500',
      bg: 'bg-orange-50',
    },
    {
      icon: Users,
      label: 'Squads Joined',
      value: user.squadsJoined ?? 0,
      color: 'text-blue-500',
      bg: 'bg-blue-50',
    },
    {
      icon: Trophy,
      label: 'Study Streak',
      value: `${Math.min(user.pomodoroSessions ?? 0, 30)}d`,
      color: 'text-emerald-500',
      bg: 'bg-emerald-50',
    },
  ];

  const TABS = [
    { id: 'profile', label: 'Profile' },
    { id: 'security', label: 'Password & Security' },
  ];

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          onClick={closeProfile}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        />

        {/* Modal */}
        <motion.div
          className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        >
          {/* Header Banner */}
          <div className="relative bg-gradient-to-br from-[#1C2E1E] via-[#2A442D] to-[#1C2E1E] px-6 pt-8 pb-16">
            <button
              onClick={closeProfile}
              className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10 cursor-pointer"
            >
              <X size={18} />
            </button>

            {/* Avatar */}
            <div className="flex items-end gap-4">
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl border-3 border-white/20 overflow-hidden bg-white/10 shadow-xl">
                  <img
                    src={isEditing && editAvatar ? editAvatar : avatarSrc}
                    alt={user.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src = `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(user.name)}`;
                    }}
                  />
                </div>
                {user.isEmailVerified && (
                  <span className="absolute -bottom-1 -right-1 bg-emerald-500 rounded-full p-0.5 shadow border-2 border-white">
                    <CheckCircle2 size={10} className="text-white" />
                  </span>
                )}
              </div>

              <div className="pb-1">
                <h2 className="text-white font-bold text-xl leading-tight">{user.name}</h2>
                <p className="text-white/60 text-sm flex items-center gap-1 mt-0.5">
                  <Mail size={11} />
                  {user.email}
                </p>
              </div>
            </div>
          </div>

          {/* Stats Row (overlapping banner) */}
          <div className="mx-6 -mt-8 mb-5 grid grid-cols-3 gap-2 relative z-10">
            {stats.map(({ icon: Icon, label, value, color, bg }) => (
              <div
                key={label}
                className={`${bg} rounded-2xl p-3 text-center shadow-sm border border-white/60`}
              >
                <Icon size={18} className={`${color} mx-auto mb-1`} />
                <p className="text-lg font-bold text-neutral-800 leading-none">{value}</p>
                <p className="text-[10px] text-neutral-500 mt-0.5 leading-tight">{label}</p>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="px-6 mb-4">
            <div className="flex bg-neutral-100 rounded-xl p-1">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 text-sm font-medium py-1.5 rounded-lg transition-all cursor-pointer ${
                    activeTab === tab.id
                      ? 'bg-white text-neutral-900 shadow-sm'
                      : 'text-neutral-500 hover:text-neutral-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div className="px-6 pb-6 max-h-[340px] overflow-y-auto">
            {activeTab === 'profile' && (
              <div className="space-y-4">
                {/* Member Since */}
                <div className="flex items-center gap-2 text-xs text-neutral-500">
                  <Calendar size={12} />
                  Member since {memberSince}
                  {user.isEmailVerified && (
                    <span className="ml-auto flex items-center gap-1 text-emerald-600 font-medium">
                      <CheckCircle2 size={11} />
                      Verified
                    </span>
                  )}
                </div>

                {isEditing ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-600 mb-1">
                        Display Name
                      </label>
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full border border-neutral-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                        placeholder="Your name"
                        maxLength={50}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-neutral-600 mb-1">
                        Bio
                        <span className="font-normal text-neutral-400 ml-1">
                          ({editBio.length}/300)
                        </span>
                      </label>
                      <textarea
                        value={editBio}
                        onChange={(e) => setEditBio(e.target.value)}
                        className="w-full border border-neutral-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none"
                        placeholder="Tell your squad mates about yourself..."
                        rows={3}
                        maxLength={300}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-neutral-600 mb-1 flex items-center gap-1">
                        <Camera size={11} />
                        Avatar URL
                      </label>
                      <input
                        value={editAvatar}
                        onChange={(e) => setEditAvatar(e.target.value)}
                        className="w-full border border-neutral-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                        placeholder="https://... or leave blank for auto-avatar"
                      />
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => setIsEditing(false)}
                        className="flex-1 border border-neutral-200 text-neutral-600 py-2 rounded-xl text-sm font-medium hover:bg-neutral-50 transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSave}
                        disabled={isSaving || !editName.trim()}
                        className="flex-1 bg-[#1C2E1E] text-white py-2 rounded-xl text-sm font-semibold hover:bg-[#2A442D] transition-colors disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {isSaving ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Save size={14} />
                        )}
                        Save Changes
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Bio display */}
                    <div className="bg-neutral-50 rounded-xl p-3">
                      <p className="text-xs font-semibold text-neutral-500 mb-1 flex items-center gap-1">
                        <Sparkles size={11} />
                        About Me
                      </p>
                      <p className="text-sm text-neutral-700">
                        {user.bio || (
                          <span className="text-neutral-400 italic">No bio yet. Add one!</span>
                        )}
                      </p>
                    </div>

                    {saveSuccess && (
                      <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-3 py-2 text-sm flex items-center gap-2">
                        <CheckCircle2 size={14} />
                        Profile updated successfully!
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={handleStartEdit}
                        className="flex-1 border border-neutral-200 text-neutral-700 py-2 rounded-xl text-sm font-medium hover:bg-neutral-50 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Edit3 size={13} />
                        Edit Profile
                      </button>
                      <button
                        onClick={() => {
                          logout();
                          closeProfile();
                        }}
                        className="flex-1 border border-rose-200 text-rose-600 py-2 rounded-xl text-sm font-medium hover:bg-rose-50 transition-colors cursor-pointer"
                      >
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800 flex items-start gap-2">
                  <Lock size={14} className="mt-0.5 shrink-0" />
                  <span>
                    To reset your password, we'll send a reset link to your registered email.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-600 mb-1">
                    Email Address
                  </label>
                  <input
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    type="email"
                    className="w-full border border-neutral-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    readOnly={resetStep === 'confirm'}
                  />
                </div>

                {resetStep === 'confirm' && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-neutral-600 mb-1">
                        Reset Token
                        <span className="font-normal text-neutral-400 ml-1">(from email / dev mode)</span>
                      </label>
                      <input
                        value={resetToken}
                        onChange={(e) => setResetToken(e.target.value)}
                        className="w-full border border-neutral-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 font-mono text-xs"
                        placeholder="Paste your reset token here"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-neutral-600 mb-1">
                        New Password
                      </label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full border border-neutral-200 rounded-xl px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                          placeholder="Min 6 characters"
                        />
                        <button
                          onClick={() => setShowNewPassword((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 cursor-pointer"
                        >
                          {showNewPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {resetMessage && (
                  <div
                    className={`rounded-xl px-3 py-2 text-sm ${
                      resetMessage.startsWith('✅')
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}
                  >
                    {resetMessage}
                  </div>
                )}

                <div className="flex gap-2">
                  {resetStep === 'confirm' && (
                    <button
                      onClick={() => { setResetStep('request'); setResetMessage(''); }}
                      className="border border-neutral-200 text-neutral-600 px-4 py-2 rounded-xl text-sm font-medium hover:bg-neutral-50 transition-colors cursor-pointer"
                    >
                      Back
                    </button>
                  )}
                  <button
                    onClick={resetStep === 'request' ? handleForgotPassword : handleResetPassword}
                    disabled={resetLoading || !resetEmail}
                    className="flex-1 bg-[#1C2E1E] text-white py-2 rounded-xl text-sm font-semibold hover:bg-[#2A442D] transition-colors disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {resetLoading ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Shield size={14} />
                    )}
                    {resetStep === 'request' ? 'Send Reset Link' : 'Reset Password'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
