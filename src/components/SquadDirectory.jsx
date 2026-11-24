import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  Users,
  Clock,
  Video,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  Filter,
  Zap,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// Reusable scroll-reveal wrapper
function FadeIn({ children, delay = 0, y = 24, className = '' }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

// Live active presence badge for a squad
function LivePresenceBadge({ activeUsers = [] }) {
  const count = activeUsers.length;
  if (count === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-emerald-700"
    >
      {/* animated pulsing green dot */}
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
      </span>
      <span className="text-[11px] font-bold leading-none">
        {count} Active Now
      </span>
    </motion.div>
  );
}

// Tiny avatar strip for active users in a squad
function ActiveUsersStrip({ activeUsers = [] }) {
  if (activeUsers.length === 0) return null;
  return (
    <div className="flex items-center gap-1 mt-2 flex-wrap">
      <span className="text-[11px] text-emerald-800 font-semibold mr-1">Studying now:</span>
      {activeUsers.slice(0, 5).map((u, i) => (
        <div
          key={i}
          className="relative group/av"
          title={u.name}
        >
          <img
            src={
              u.avatar ||
              `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(u.name)}`
            }
            alt={u.name}
            referrerPolicy="no-referrer"
            className="w-6 h-6 rounded-full border-2 border-emerald-400/60 object-cover"
          />
          {/* tooltip */}
          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 whitespace-nowrap text-[10px] bg-neutral-800 text-white px-1.5 py-0.5 rounded opacity-0 group-hover/av:opacity-100 pointer-events-none transition-opacity z-10">
            {u.name}
          </span>
        </div>
      ))}
      {activeUsers.length > 5 && (
        <span className="text-[11px] text-neutral-500 font-medium">+{activeUsers.length - 5} more</span>
      )}
    </div>
  );
}

export default function SquadDirectory({
  squads,
  onJoinSquad,
  onOpenSquadRoom,
  selectedFilter,
  onSelectFilter,
  aiPoweredBy,
  globalPresence = {},
  onOpenCalendarModal,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const { user, openAuthModal } = useAuth();
  const categoriesRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScrollState = () => {
    const el = categoriesRef.current;
    if (el) {
      const { scrollLeft, scrollWidth, clientWidth } = el;
      setCanScrollLeft(scrollLeft > 5);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 5);
    }
  };

  useEffect(() => {
    checkScrollState();
    const handleResize = () => checkScrollState();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleScroll = (direction) => {
    const el = categoriesRef.current;
    if (el) {
      const scrollDistance = 280;
      el.scrollBy({
        left: direction === 'left' ? -scrollDistance : scrollDistance,
        behavior: 'smooth',
      });
    }
  };

  const categories = [
    'All',
    'State Board / Matric',
    'CBSE 12th Boards',
    'CBSE & ICSE Boards',
    'Engineering & Tech',
    'Artificial Intelligence',
    'Python & Data Science',
    'Java Programming',
    'Competitive Coding',
    'Arts & Humanities',
    'Commerce & Business',
    'GRE / GATE / GMAT',
    'Finals & Midterms',
    'Daily Accountability',
    'Research & Thesis',
  ];

  const filteredSquads = squads.filter((squad) => {
    const matchesCategory =
      selectedFilter === 'All' || squad.category === selectedFilter;
    const matchesSearch =
      squad.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      squad.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      squad.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      squad.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Total active students across all squads right now
  const totalActive = Object.values(globalPresence).reduce(
    (acc, sq) => acc + (sq.count || 0),
    0
  );

  const handleJoinClick = (squadId) => {
    if (!user) {
      openAuthModal('register');
    } else {
      onJoinSquad(squadId);
    }
  };

  return (
    <section id="squads-section" className="relative z-10 w-full py-20 px-6 max-w-7xl mx-auto">
      {/* Section Header */}
      <FadeIn delay={0}>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-transparent border border-emerald-700/50 text-emerald-800 text-xs font-semibold uppercase tracking-wider mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              {aiPoweredBy ? `Live Match Engine • ${aiPoweredBy}` : 'Live Match Engine'}
            </div>
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-neutral-950">
              Available Study Squads
            </h2>
            <p className="text-neutral-700 mt-2 text-base max-w-xl">
              Real-time groups actively recruiting members. Join an ongoing room or jump into the next session.
            </p>
            {/* Global active count banner */}
            {totalActive > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-300/60 text-emerald-800 text-xs font-semibold"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <Zap className="w-3.5 h-3.5" />
                <span>
                  {totalActive} student{totalActive !== 1 ? 's' : ''} actively studying right now
                </span>
              </motion.div>
            )}
          </div>

          {/* Right Header Actions: Calendar & Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto">
            {onOpenCalendarModal && (
              <button
                type="button"
                onClick={onOpenCalendarModal}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#1C2E1E] text-white hover:bg-[#2A442D] text-xs sm:text-sm font-semibold shadow-xs hover:shadow-md transition-all active:scale-97 cursor-pointer shrink-0"
              >
                <CalendarIcon className="w-4 h-4 text-emerald-400" />
                <span>Schedule & Exams</span>
              </button>
            )}

            {/* Search Input */}
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by topic, course, exam..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-neutral-300/80 bg-white/90 backdrop-blur-md focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-800/30 text-sm transition-all placeholder:text-neutral-500 text-neutral-950 shadow-sm"
              />
            </div>
          </div>
        </div>
      </FadeIn>

      {/* Category Filter Pills */}
      <FadeIn delay={0.08}>
        <div className="flex items-center gap-2 mb-8">
          <span className="text-xs font-semibold text-neutral-800 flex items-center gap-1 mr-1 shrink-0">
            <Filter className="w-3.5 h-3.5 text-neutral-700" /> Filter:
          </span>

          {/* Left Arrow Button */}
          <button
            type="button"
            onClick={() => handleScroll('left')}
            disabled={!canScrollLeft}
            aria-label="Scroll categories left"
            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 border transition-all ${
              canScrollLeft
                ? 'bg-white/95 text-neutral-800 border-neutral-300 shadow-xs hover:bg-neutral-100 hover:border-neutral-400 cursor-pointer active:scale-95'
                : 'bg-neutral-100/50 text-neutral-300 border-neutral-200/50 cursor-not-allowed opacity-40'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Scrollable category list without scrollbar */}
          <div
            ref={categoriesRef}
            onScroll={checkScrollState}
            className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1 scroll-smooth"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {categories.map((cat, i) => (
              <motion.button
                key={cat}
                initial={{ opacity: 0, x: -12 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: 0.08 + i * 0.05, ease: 'easeOut' }}
                type="button"
                onClick={() => onSelectFilter(cat)}
                className={`px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap transition-all cursor-pointer shadow-xs shrink-0 ${
                  selectedFilter === cat
                    ? 'bg-[#1C2E1E] text-white border border-[#1C2E1E] shadow-sm'
                    : 'bg-white/90 backdrop-blur-md text-neutral-900 border border-neutral-300/90 hover:border-neutral-600 hover:bg-white'
                }`}
              >
                {cat}
              </motion.button>
            ))}
          </div>

          {/* Right Arrow Button */}
          <button
            type="button"
            onClick={() => handleScroll('right')}
            disabled={!canScrollRight}
            aria-label="Scroll categories right"
            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 border transition-all ${
              canScrollRight
                ? 'bg-white/95 text-neutral-800 border-neutral-300 shadow-xs hover:bg-neutral-100 hover:border-neutral-400 cursor-pointer active:scale-95'
                : 'bg-neutral-100/50 text-neutral-300 border-neutral-200/50 cursor-not-allowed opacity-40'
            }`}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </FadeIn>

      {/* Squad Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {filteredSquads.map((squad, index) => {
            const realMembers = Array.isArray(squad.members) ? squad.members : [];
            const memberCount = typeof squad.memberCount === 'number'
              ? squad.memberCount
              : realMembers.length;
            const avatars = realMembers
              .map((m) => m?.avatar || (m?.name ? `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(m.name)}` : null))
              .filter(Boolean);
            const matchScore = squad.aiMatchScore ?? squad.matchScore ?? 95;

            // Live presence for THIS squad
            const squadPresence = globalPresence[squad.id];
            const activeUsers = squadPresence?.users || [];
            const isLive = activeUsers.length > 0;

            return (
              <motion.div
                key={squad.id}
                layout
                initial={{ opacity: 0, y: 36, scale: 0.97 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{
                  duration: 0.55,
                  delay: (index % 3) * 0.1,
                  ease: [0.22, 1, 0.36, 1],
                }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`bg-white/95 backdrop-blur-xl rounded-3xl border p-6 flex flex-col justify-between transition-all duration-300 group relative shadow-md hover:shadow-xl hover:bg-white ${
                  isLive
                    ? 'border-emerald-500/60 ring-2 ring-emerald-500/25'
                    : 'border-neutral-200/90'
                }`}
              >
                <div>
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-neutral-100 text-neutral-900 border border-neutral-200/90">
                      {squad.category}
                    </span>
                    {/* Show live badge if active, otherwise match score */}
                    {isLive ? (
                      <LivePresenceBadge activeUsers={activeUsers} />
                    ) : (
                      <span className="text-xs font-bold text-emerald-950 bg-emerald-100/90 px-2.5 py-1 rounded-lg flex items-center gap-1 border border-emerald-300/80">
                        <Sparkles className="w-3 h-3 text-emerald-800" />
                        {matchScore}% Match
                      </span>
                    )}
                  </div>

                  <h3 className="text-xl font-bold text-neutral-950 group-hover:text-emerald-950 transition-colors">
                    {squad.name}
                  </h3>
                  <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider mt-1">
                    {squad.subject}
                  </p>
                  <p className="text-neutral-800 font-medium text-sm mt-3 line-clamp-2 leading-relaxed">
                    {squad.description}
                  </p>

                  {/* Active users strip — shown if any student is live */}
                  {isLive && (
                    <ActiveUsersStrip activeUsers={activeUsers} />
                  )}

                  {/* AI Match Reason Pill if available and NOT live */}
                  {squad.aiMatchReason && !isLive && (
                    <div className="mt-3 p-2 rounded-xl bg-emerald-50 border border-emerald-500/30 text-[11px] text-emerald-950 font-medium flex items-start gap-1.5 leading-tight">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-800 shrink-0 mt-0.5" />
                      <span>{squad.aiMatchReason}</span>
                    </div>
                  )}

                  <div className="mt-5 space-y-2 text-xs text-neutral-800 font-medium">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-neutral-600 shrink-0" />
                      <span>{squad.schedule}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Video className="w-4 h-4 text-neutral-600 shrink-0" />
                      <span>{squad.platform} Room & Live Chat</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-5 border-t border-neutral-200/90">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      {avatars.length > 0 ? (
                        <div className="flex -space-x-2">
                          {avatars.slice(0, 4).map((avatar, i) => {
                            const memberName = realMembers[i]?.name || 'Member';
                            return (
                              <img
                                key={i}
                                src={avatar}
                                alt={memberName}
                                title={memberName}
                                referrerPolicy="no-referrer"
                                className="w-7 h-7 rounded-full border-2 border-white object-cover shadow-xs"
                              />
                            );
                          })}
                        </div>
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-emerald-50 border border-emerald-200/70 flex items-center justify-center text-emerald-800">
                          <Users className="w-3.5 h-3.5" />
                        </div>
                      )}
                      <div className="ml-2.5 flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-neutral-800">
                          {memberCount} {memberCount === 1 ? 'member' : 'members'}
                        </span>
                        <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/70">
                          Open to all
                        </span>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-neutral-800 bg-neutral-100 px-2.5 py-0.5 rounded-md border border-neutral-200/90">
                      {squad.platform}
                    </span>
                  </div>

                  {squad.isJoined ? (
                    <button
                      type="button"
                      onClick={() => onOpenSquadRoom(squad)}
                      className={`w-full font-medium text-sm py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm ${
                        isLive
                          ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white'
                          : 'bg-emerald-900 hover:bg-emerald-800 text-white'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                      <span>{isLive ? '🔴 Join Live Session' : 'Enter Study Room'}</span>
                      <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleJoinClick(squad.id)}
                      className={`w-full font-medium text-sm py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer hover:shadow-md ${
                        isLive
                          ? 'bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-600 hover:to-teal-600 text-white'
                          : 'bg-[#1C2E1E] hover:bg-[#2C482F] text-white'
                      }`}
                    >
                      <Users className="w-4 h-4" />
                      <span>{isLive ? '🔴 Join Live Squad' : 'Join Squad'}</span>
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {filteredSquads.length === 0 && (
        <FadeIn>
          <div className="text-center py-16 bg-transparent rounded-3xl border border-dashed border-neutral-400 mt-4">
            <p className="text-neutral-700 text-base">
              No study squads found matching "{searchQuery}".
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                onSelectFilter('All');
              }}
              className="mt-3 text-emerald-800 font-semibold text-sm underline cursor-pointer"
            >
              Clear filters
            </button>
          </div>
        </FadeIn>
      )}
    </section>
  );
}
