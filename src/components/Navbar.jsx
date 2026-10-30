import React, { useState } from 'react';
import { Plus, LogOut, User as UserIcon, Calendar as CalendarIcon, Crown, Flame } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { GoogleIcon } from './AuthModal';

export default function Navbar({ onOpenCreateModal, onOpenCalendarModal, onOpenProModal }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, logout, openAuthModal, openProfile } = useAuth();

  const navLinks = [
    { name: 'Find Squads', href: '#squads-section' },
    { name: 'How It Works', href: '#how-it-works' },
    { name: 'Active Rooms', href: '#squads-section' },
  ];

  const handleCreateClick = () => {
    if (!user) {
      openAuthModal('register');
    } else {
      onOpenCreateModal();
    }
  };

  return (
    <>
      <header className="fixed top-0 inset-x-0 z-30 px-5 sm:px-8 py-3.5 sm:py-4 flex flex-row justify-between items-center bg-transparent transition-all">
        {/* Logo (Left side) */}
        <a href="#" className="flex flex-row items-center gap-2.5 group">
          <span className="text-[20px] sm:text-[24px] tracking-tight text-black font-semibold select-none group-hover:opacity-80 transition-opacity">
            StudySquad&reg;
          </span>
          <span className="text-[22px] sm:text-[26px] text-emerald-800 select-none tracking-[-0.02em] font-medium leading-none mb-0.5">
            &#10033;
          </span>
        </a>

        {/* Desktop Nav Links (Center) */}
        <nav className="hidden md:flex flex-row items-center text-[17px] text-neutral-800 font-medium">
          {navLinks.map((link, index) => (
            <span key={link.name} className="flex items-center">
              <a
                href={link.href}
                className="hover:text-black transition-colors px-2 py-1 rounded-md hover:bg-neutral-100/60"
              >
                {link.name}
              </a>
              {index < navLinks.length - 1 && (
                <span className="opacity-30 mx-2 text-sm">/</span>
              )}
            </span>
          ))}
        </nav>

        {/* Desktop Actions (Right) */}
        <div className="hidden md:flex items-center gap-3">
          {user && (
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-500/15 via-orange-500/15 to-amber-500/15 border border-amber-500/30 text-amber-900 font-bold text-xs shadow-xs"
              title="Daily Study Streak — Study daily to keep the flame alive!"
            >
              <Flame className="w-4 h-4 text-orange-500 fill-orange-500 animate-pulse" />
              <span>{Math.max(1, user.pomodoroSessions || 1)}d Streak</span>
            </div>
          )}
          {user ? (
            <div className="flex items-center gap-2 bg-white/40 backdrop-blur-md border border-neutral-300/40 rounded-full pl-2 pr-2 py-1 shadow-xs">
              {/* Avatar - clickable for profile */}
              <button
                type="button"
                onClick={openProfile}
                title="View Profile"
                className="relative group cursor-pointer"
              >
                <img
                  src={user.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(user.name)}`}
                  alt={user.name}
                  referrerPolicy="no-referrer"
                  className="w-7 h-7 rounded-full object-cover border border-emerald-600/40 group-hover:border-emerald-500 transition-colors"
                />
                {(user.provider === 'google' || user.email?.includes('@gmail.com')) && (
                  <span
                    title="Verified Google Account"
                    className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-xs border border-neutral-200 flex items-center justify-center"
                  >
                    <GoogleIcon className="w-2.5 h-2.5" />
                  </span>
                )}
              </button>

              {/* Name + profile button */}
              <button
                type="button"
                onClick={openProfile}
                className="text-xs font-semibold text-neutral-800 max-w-[90px] truncate hover:text-emerald-700 transition-colors cursor-pointer"
                title="View your profile"
              >
                {user.name}
              </button>

              {/* Profile icon */}
              <button
                type="button"
                onClick={openProfile}
                title="My Profile"
                className="text-neutral-500 hover:text-emerald-700 transition-colors p-1 rounded-full hover:bg-neutral-200/50 cursor-pointer"
              >
                <UserIcon size={13} />
              </button>

              {/* Divider */}
              <span className="w-px h-4 bg-neutral-300/50" />

              {/* Sign out */}
              <button
                type="button"
                onClick={logout}
                title="Sign Out"
                className="text-neutral-500 hover:text-rose-600 transition-colors p-1 rounded-full hover:bg-neutral-200/50 cursor-pointer"
              >
                <LogOut size={13} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => openAuthModal('login')}
              className="text-sm font-semibold text-neutral-800 hover:text-black px-3.5 py-2 rounded-full hover:bg-white/40 transition-all cursor-pointer"
            >
              Sign In
            </button>
          )}



          {/* Calendar & Exam Countdown Trigger */}
          <button
            type="button"
            onClick={onOpenCalendarModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/50 hover:bg-white/80 border border-neutral-300/60 text-xs sm:text-sm font-semibold text-neutral-800 shadow-xs transition-all hover:border-emerald-600/50 cursor-pointer"
            title="Study Session Calendar & Exam Countdown"
          >
            <CalendarIcon className="w-4 h-4 text-emerald-700" />
            <span>Calendar & Exams</span>
          </button>


          {/* StudySquad Pro Commercial SaaS Trigger */}
          <button
            type="button"
            onClick={onOpenProModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-gradient-to-r from-amber-400/25 via-amber-300/35 to-yellow-400/25 hover:from-amber-400/40 hover:to-yellow-400/40 border border-amber-500/40 text-xs sm:text-sm font-bold text-amber-950 shadow-xs transition-all hover:scale-103 cursor-pointer"
            title="StudySquad Pro - Unlock Unlimited AI, Oral Viva Examiner & Formulas"
          >
            <Crown className="w-4 h-4 text-amber-600 fill-amber-400" />
            <span>{user?.isPro ? 'Pro Member' : 'Upgrade to Pro'}</span>
          </button>

          <button
            type="button"
            onClick={handleCreateClick}
            className="inline-flex items-center gap-1.5 bg-[#1C2E1E] hover:bg-[#2A442D] text-white px-4 py-2 rounded-full text-sm font-medium transition-all shadow-xs hover:shadow-md active:scale-97 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Create Squad
          </button>
        </div>

        {/* Mobile Hamburger Button */}
        <button
          type="button"
          onClick={() => setIsMobileMenuOpen((prev) => !prev)}
          className="md:hidden flex flex-col justify-center items-center gap-[5px] p-2 z-40 focus:outline-none"
          aria-label="Toggle Menu"
          aria-expanded={isMobileMenuOpen}
        >
          <span
            className={`w-6 h-[2px] bg-black transition-all duration-300 ${
              isMobileMenuOpen ? 'rotate-45 translate-y-[7px]' : ''
            }`}
          />
          <span
            className={`w-6 h-[2px] bg-black transition-all duration-300 ${
              isMobileMenuOpen ? 'opacity-0' : ''
            }`}
          />
          <span
            className={`w-6 h-[2px] bg-black transition-all duration-300 ${
              isMobileMenuOpen ? '-rotate-45 -translate-y-[7px]' : ''
            }`}
          />
        </button>
      </header>

      {/* Full screen Mobile Navigation Overlay */}
      <div
        className={`fixed inset-0 z-20 bg-white/95 backdrop-blur-md md:hidden flex flex-col justify-center items-center gap-6 px-8 transition-all duration-300 ${
          isMobileMenuOpen
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none'
        }`}
      >
        <nav className="flex flex-col items-center gap-5 text-2xl font-medium text-black">
          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              onClick={() => setIsMobileMenuOpen(false)}
              className="hover:opacity-60 transition-opacity"
            >
              {link.name}
            </a>
          ))}

          {user ? (
            <div className="flex flex-col items-center gap-2 mt-4 pt-4 border-t border-neutral-200 w-full text-center">
              <div className="flex items-center justify-center gap-2 text-base font-semibold text-neutral-800">
                <div className="relative">
                  <img
                    src={user.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(user.name)}`}
                    alt={user.name}
                    referrerPolicy="no-referrer"
                    className="w-7 h-7 rounded-full object-cover border border-emerald-600/40"
                  />
                  {(user.provider === 'google' || user.email?.includes('@gmail.com')) && (
                    <span className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-xs border border-neutral-200 flex items-center justify-center">
                      <GoogleIcon className="w-2 h-2" />
                    </span>
                  )}
                </div>
                <span>Signed in as {user.name}</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-900 font-bold text-xs mt-1">
                <Flame className="w-3.5 h-3.5 text-orange-500 fill-orange-500 animate-pulse" />
                <span>{Math.max(1, user.pomodoroSessions || 1)} Day Study Streak</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  openProfile();
                }}
                className="text-sm font-medium text-emerald-700 underline"
              >
                View My Profile
              </button>
              <button
                type="button"
                onClick={() => {
                  logout();
                  setIsMobileMenuOpen(false);
                }}
                className="text-sm font-medium text-rose-600 underline"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setIsMobileMenuOpen(false);
                openAuthModal('login');
              }}
              className="text-lg font-medium text-neutral-800 mt-2"
            >
              Sign In
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setIsMobileMenuOpen(false);
              if (onOpenCalendarModal) onOpenCalendarModal();
            }}
            className="mt-3 bg-white/80 border border-neutral-300 text-neutral-800 px-6 py-2.5 rounded-full text-base font-semibold inline-flex items-center gap-2"
          >
            <CalendarIcon className="w-4 h-4 text-emerald-700" />
            Calendar & Exams
          </button>


          {/* Mobile Upgrade Pro Trigger */}
          <button
            type="button"
            onClick={() => {
              setIsMobileMenuOpen(false);
              if (onOpenProModal) onOpenProModal();
            }}
            className="mt-2 bg-gradient-to-r from-amber-400/30 to-yellow-400/30 border border-amber-500/50 text-amber-950 px-6 py-2.5 rounded-full text-base font-bold inline-flex items-center gap-2 shadow-xs"
          >
            <Crown className="w-4 h-4 text-amber-600 fill-amber-400" />
            <span>{user?.isPro ? 'Pro Member' : 'Upgrade to Pro'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsMobileMenuOpen(false);
              handleCreateClick();
            }}
            className="mt-2 bg-[#1C2E1E] text-white px-6 py-3 rounded-full text-lg font-medium inline-flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Create Squad
          </button>
        </nav>
      </div>
    </>
  );
}
