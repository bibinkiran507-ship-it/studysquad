import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar as CalendarIcon,
  Clock,
  Flame,
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  BookOpen,
  Users,
  Trash2,
  Check,
  Copy,
  ExternalLink,
  Target,
  ArrowRight,
  CalendarDays,
} from 'lucide-react';
import { eventsAPI } from '../api/client';
import { useAuth } from '../context/AuthContext';

// Default starter milestones if none exist yet
const INITIAL_DEMO_EVENTS = [
  {
    id: 'demo-exam-1',
    title: 'Data Structures & Algorithms Midterm',
    type: 'exam',
    subject: 'Computer Science',
    date: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000 + 5 * 60 * 60 * 1000).toISOString(),
    description: 'Covers Trees, Heaps, Dynamic Programming, and Graph Traversals (BFS/DFS).',
    location: 'StudySquad Room Alpha',
    urgency: 'high',
    squad: { name: 'CS Masters Guild', subject: 'Computer Science' },
    isCompleted: false,
  },
  {
    id: 'demo-session-2',
    title: 'Calculus III Vector Fields Sprint',
    type: 'session',
    subject: 'Mathematics',
    date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
    description: 'Group problem solving session on Green’s Theorem & Stokes’ Theorem.',
    location: 'StudySquad Live Whiteboard',
    urgency: 'medium',
    squad: { name: 'Math & Physics Lab', subject: 'Mathematics' },
    isCompleted: false,
  },
  {
    id: 'demo-exam-3',
    title: 'Organic Chemistry II Final Exam',
    type: 'exam',
    subject: 'Chemistry',
    date: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString(),
    description: 'Reaction mechanisms, Aldol condensations, and NMR spectroscopy analysis.',
    location: 'Exam Hall B',
    urgency: 'critical',
    squad: { name: 'Biochem & Pre-Med Squad', subject: 'Pre-Med' },
    isCompleted: false,
  },
];

export default function StudyCalendarModal({
  isOpen,
  onClose,
  squads = [],
  onOpenSquadRoom,
  preselectedSquadId = null,
}) {
  const { user } = useAuth();

  // State
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'session' | 'exam'
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [aiPlanModal, setAiPlanModal] = useState({ isOpen: false, event: null, plan: '', loading: false });
  const [copiedPlan, setCopiedPlan] = useState(false);

  // Form State
  const [formType, setFormType] = useState('session'); // 'session' | 'exam'
  const [formTitle, setFormTitle] = useState('');
  const [formSubject, setFormSubject] = useState('Computer Science');
  const [formSquadId, setFormSquadId] = useState(preselectedSquadId || '');
  const [formDate, setFormDate] = useState('');
  const [formTime, setFormTime] = useState('19:00');
  const [formUrgency, setFormUrgency] = useState('medium');
  const [formDesc, setFormDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Load events
  const loadEvents = async () => {
    try {
      setLoading(true);
      const res = await eventsAPI.getAll();
      if (res.data?.events && res.data.events.length > 0) {
        setEvents(res.data.events);
      } else {
        setEvents(INITIAL_DEMO_EVENTS);
      }
    } catch (err) {
      console.warn('Events fetch error, using sample events:', err.message);
      setEvents(INITIAL_DEMO_EVENTS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadEvents();
      // Default form date to today
      const todayIso = new Date().toISOString().split('T')[0];
      setFormDate(todayIso);
    }
  }, [isOpen]);

  // Live timer tick for countdowns
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Compute upcoming exams for countdown cards
  const upcomingExams = useMemo(() => {
    return events
      .filter((e) => e.type === 'exam' || e.type === 'deadline')
      .map((e) => {
        const target = new Date(e.date).getTime();
        const diff = Math.max(0, target - now);
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        return {
          ...e,
          diff,
          countdown: { days, hours, minutes, seconds },
          isPast: diff <= 0,
        };
      })
      .sort((a, b) => a.diff - b.diff);
  }, [events, now]);

  // Filtered events
  const filteredEvents = useMemo(() => {
    if (activeFilter === 'all') return events;
    return events.filter((e) => e.type === activeFilter);
  }, [events, activeFilter]);

  // Calendar month matrix helpers
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const jumpToToday = () => {
    const td = new Date();
    setCurrentDate(td);
    setSelectedDate(td);
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  // Group events by day in current view
  const eventsByDay = useMemo(() => {
    const map = {};
    events.forEach((ev) => {
      const d = new Date(ev.date);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const dayNum = d.getDate();
        if (!map[dayNum]) map[dayNum] = [];
        map[dayNum].push(ev);
      }
    });
    return map;
  }, [events, year, month]);

  // Events on currently selected date
  const selectedDayEvents = useMemo(() => {
    return events.filter((ev) => {
      const d = new Date(ev.date);
      return (
        d.getFullYear() === selectedDate.getFullYear() &&
        d.getMonth() === selectedDate.getMonth() &&
        d.getDate() === selectedDate.getDate()
      );
    });
  }, [events, selectedDate]);

  // Create new event
  const handleCreateEvent = async (e) => {
    e.preventDefault();
    if (!formTitle || !formDate) return;

    try {
      setSubmitting(true);
      const combinedDateTime = new Date(`${formDate}T${formTime || '12:00'}:00`);

      const payload = {
        title: formTitle,
        type: formType,
        subject: formSubject,
        date: combinedDateTime.toISOString(),
        description: formDesc,
        urgency: formUrgency,
        squadId: formSquadId || null,
        userId: user?.id || null,
      };

      const res = await eventsAPI.create(payload);
      const newEv = res.data?.event;

      if (newEv) {
        setEvents((prev) => [newEv, ...prev]);
      } else {
        // Fallback local create
        const localEv = {
          ...payload,
          id: `local-${Date.now()}`,
          squad: squads.find((s) => s.id === formSquadId) || null,
          isCompleted: false,
        };
        setEvents((prev) => [localEv, ...prev]);
      }

      // Reset form
      setFormTitle('');
      setFormDesc('');
      setIsAddFormOpen(false);
    } catch (err) {
      console.error('Failed to create event:', err);
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle complete
  const handleToggleComplete = async (eventItem) => {
    const updatedStatus = !eventItem.isCompleted;
    setEvents((prev) =>
      prev.map((ev) => (ev.id === eventItem.id ? { ...ev, isCompleted: updatedStatus } : ev))
    );

    try {
      if (!eventItem.id.startsWith('demo-') && !eventItem.id.startsWith('local-')) {
        await eventsAPI.update(eventItem.id, { isCompleted: updatedStatus });
      }
    } catch (err) {
      console.warn('Could not sync completion status:', err.message);
    }
  };

  // Delete event
  const handleDeleteEvent = async (id) => {
    setEvents((prev) => prev.filter((ev) => ev.id !== id));
    try {
      if (!id.startsWith('demo-') && !id.startsWith('local-')) {
        await eventsAPI.delete(id);
      }
    } catch (err) {
      console.warn('Could not delete event from backend:', err.message);
    }
  };

  // Generate AI Exam Plan
  const handleGenerateAiPlan = async (exam) => {
    setAiPlanModal({ isOpen: true, event: exam, plan: '', loading: true });
    try {
      const target = new Date(exam.date).getTime();
      const daysLeft = Math.max(1, Math.ceil((target - Date.now()) / (1000 * 60 * 60 * 24)));

      const res = await eventsAPI.getAiStudyPlan({
        examTitle: exam.title,
        subject: exam.subject || 'Academics',
        examDate: exam.date,
        daysLeft,
      });

      setAiPlanModal({
        isOpen: true,
        event: exam,
        plan: res.data?.plan || 'Study plan generated!',
        loading: false,
      });
    } catch (err) {
      console.error('Error getting AI study plan:', err);
      setAiPlanModal((prev) => ({
        ...prev,
        plan: 'Could not connect to AI engine. Review core lecture notes and take timed practice quizzes!',
        loading: false,
      }));
    }
  };

  // Copy AI Plan
  const handleCopyPlan = () => {
    if (aiPlanModal.plan) {
      navigator.clipboard.writeText(aiPlanModal.plan);
      setCopiedPlan(true);
      setTimeout(() => setCopiedPlan(false), 2000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        transition={{ duration: 0.25 }}
        className="bg-[#111612] text-white w-full max-w-6xl rounded-3xl shadow-2xl border border-white/15 overflow-hidden flex flex-col max-h-[92vh] backdrop-blur-2xl"
      >
        {/* Header Bar */}
        <div className="px-6 py-4.5 border-b border-white/10 flex items-center justify-between bg-white/[0.03]">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/10">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-emerald-400 tracking-wider uppercase">
                  Squad Timetable & Radar
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 text-[11px] font-semibold border border-emerald-500/20">
                  {events.length} Scheduled
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Study Sessions & Exam Countdown
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setIsAddFormOpen(!isAddFormOpen)}
              className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-lg shadow-emerald-500/25 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{isAddFormOpen ? 'Close Form' : 'Schedule Event'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-white/10 text-neutral-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Main Area */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {/* Collapsible Add Event Form */}
          <AnimatePresence>
            {isAddFormOpen && (
              <motion.form
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                onSubmit={handleCreateEvent}
                className="bg-black/40 border border-emerald-500/30 rounded-2xl p-5 space-y-4 backdrop-blur-xl"
              >
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-emerald-400">✨ Add New Milestone or Study Session</span>
                  </div>
                  <div className="flex gap-1.5 bg-neutral-900 p-1 rounded-xl border border-white/10">
                    <button
                      type="button"
                      onClick={() => setFormType('session')}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        formType === 'session' ? 'bg-emerald-500 text-black shadow-xs' : 'text-neutral-400'
                      }`}
                    >
                      Study Session
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormType('exam')}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        formType === 'exam' ? 'bg-rose-500 text-white shadow-xs' : 'text-neutral-400'
                      }`}
                    >
                      Exam / Deadline
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-[11px] font-semibold text-neutral-400">Title / Topic *</label>
                    <input
                      type="text"
                      required
                      placeholder={formType === 'session' ? 'e.g., Dynamic Programming Sprint' : 'e.g., CS 106B Final Exam'}
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white placeholder-neutral-500 focus:outline-hidden focus:border-emerald-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-neutral-400">Subject / Course</label>
                    <input
                      type="text"
                      placeholder="e.g., Computer Science"
                      value={formSubject}
                      onChange={(e) => setFormSubject(e.target.value)}
                      className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white placeholder-neutral-500 focus:outline-hidden focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-neutral-400">Date *</label>
                    <input
                      type="date"
                      required
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-hidden focus:border-emerald-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-neutral-400">Time</label>
                    <input
                      type="time"
                      value={formTime}
                      onChange={(e) => setFormTime(e.target.value)}
                      className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-hidden focus:border-emerald-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-neutral-400">Squad Link</label>
                    <select
                      value={formSquadId}
                      onChange={(e) => setFormSquadId(e.target.value)}
                      className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-hidden focus:border-emerald-500"
                    >
                      <option value="">General (All Squads)</option>
                      {squads.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.category})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-neutral-400">Urgency</label>
                    <select
                      value={formUrgency}
                      onChange={(e) => setFormUrgency(e.target.value)}
                      className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-hidden focus:border-emerald-500"
                    >
                      <option value="low">🟢 Normal</option>
                      <option value="medium">🟡 Medium</option>
                      <option value="high">🟠 High</option>
                      <option value="critical">🔴 Critical</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-neutral-400">Notes / Syllabus Units (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g., Prepare slides, review chapters 4-7, bring practice exam questions"
                    value={formDesc}
                    onChange={(e) => setFormDesc(e.target.value)}
                    className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white placeholder-neutral-500 focus:outline-hidden focus:border-emerald-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsAddFormOpen(false)}
                    className="px-4 py-2 rounded-xl text-neutral-400 hover:text-white text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs sm:text-sm transition-all cursor-pointer disabled:opacity-50"
                  >
                    {submitting ? 'Saving...' : 'Save Milestone'}
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Section 1: ⏳ Upcoming Exam & Deadline Radar (Live Countdowns) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-rose-400" />
                <h3 className="text-sm font-bold text-neutral-200 uppercase tracking-wider">
                  Upcoming Exam & Deadline Radar
                </h3>
              </div>
              <span className="text-xs text-neutral-400">
                {upcomingExams.length} Active Targets
              </span>
            </div>

            {upcomingExams.length === 0 ? (
              <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 text-center text-neutral-400 text-xs">
                No exam deadlines set yet. Click <strong>Schedule Event</strong> above and select <em>Exam / Deadline</em>!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {upcomingExams.map((exam) => {
                  const { days, hours, minutes, seconds } = exam.countdown;
                  const isCritical = days < 3;
                  const isGold = days < 7;

                  return (
                    <div
                      key={exam.id}
                      className={`relative overflow-hidden rounded-2xl border p-4.5 flex flex-col justify-between transition-all bg-gradient-to-b ${
                        isCritical
                          ? 'from-rose-950/40 to-neutral-900/90 border-rose-500/40 shadow-lg shadow-rose-950/30'
                          : isGold
                          ? 'from-amber-950/30 to-neutral-900/90 border-amber-500/30 shadow-lg shadow-amber-950/20'
                          : 'from-emerald-950/20 to-neutral-900/90 border-emerald-500/20 shadow-lg shadow-emerald-950/10'
                      }`}
                    >
                      {/* Top Badges */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="space-y-0.5">
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                              isCritical
                                ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                                : 'bg-white/10 text-neutral-300 border-white/10'
                            }`}
                          >
                            {exam.subject || 'Exam'}
                          </span>
                          <h4 className="font-bold text-white text-base leading-snug line-clamp-1 mt-1">
                            {exam.title}
                          </h4>
                          {exam.squad && (
                            <p className="text-[11px] text-neutral-400 flex items-center gap-1">
                              <Users className="w-3 h-3 text-neutral-500" />
                              {exam.squad.name}
                            </p>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleToggleComplete(exam)}
                          title={exam.isCompleted ? 'Mark incomplete' : 'Mark completed'}
                          className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                            exam.isCompleted
                              ? 'bg-emerald-500 text-black border-emerald-400'
                              : 'bg-white/5 border-white/10 text-neutral-400 hover:text-white'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Live Ticker Blocks */}
                      <div className="my-2 grid grid-cols-4 gap-1.5 text-center">
                        <div className="bg-black/50 border border-white/10 rounded-xl py-2 px-1">
                          <span className="text-xl font-mono font-extrabold text-white block">
                            {days}
                          </span>
                          <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">
                            Days
                          </span>
                        </div>
                        <div className="bg-black/50 border border-white/10 rounded-xl py-2 px-1">
                          <span className="text-xl font-mono font-extrabold text-white block">
                            {String(hours).padStart(2, '0')}
                          </span>
                          <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">
                            Hrs
                          </span>
                        </div>
                        <div className="bg-black/50 border border-white/10 rounded-xl py-2 px-1">
                          <span className="text-xl font-mono font-extrabold text-white block">
                            {String(minutes).padStart(2, '0')}
                          </span>
                          <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">
                            Min
                          </span>
                        </div>
                        <div className="bg-black/50 border border-white/10 rounded-xl py-2 px-1">
                          <span className="text-xl font-mono font-extrabold text-rose-400 block animate-pulse">
                            {String(seconds).padStart(2, '0')}
                          </span>
                          <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">
                            Sec
                          </span>
                        </div>
                      </div>

                      {/* Action footer */}
                      <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => handleGenerateAiPlan(exam)}
                          className="px-2.5 py-1.5 rounded-xl bg-violet-500/20 hover:bg-violet-500/30 border border-violet-500/40 text-violet-300 font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                          <span>AI Study Plan</span>
                        </button>

                        <div className="flex items-center gap-1.5">
                          {/* ICS Download */}
                          <a
                            href={eventsAPI.exportIcsUrl(exam.id)}
                            download
                            title="Export to Google/Apple Calendar (.ics)"
                            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>

                          {/* Jump to room if squad attached */}
                          {exam.squad && onOpenSquadRoom && (
                            <button
                              type="button"
                              onClick={() => {
                                onClose();
                                onOpenSquadRoom(exam.squad);
                              }}
                              className="px-2.5 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                            >
                              <span>Study</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 2: 🗓️ Visual Calendar & Day Agenda Split */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 7 Cols: Interactive Month Grid */}
            <div className="lg:col-span-7 bg-white/[0.02] border border-white/10 rounded-2xl p-5 space-y-4">
              {/* Month Header Nav */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <span>{monthNames[month]} {year}</span>
                  </h3>
                  <p className="text-xs text-neutral-400">Click any date to inspect scheduled sessions</p>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={jumpToToday}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white/5 hover:bg-white/10 text-neutral-300 transition-colors cursor-pointer"
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={prevMonth}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={nextMonth}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Day Labels */}
              <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-neutral-400 pb-1">
                <span>Sun</span>
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
                <span>Sat</span>
              </div>

              {/* Grid Cells */}
              <div className="grid grid-cols-7 gap-1.5">
                {/* Empty padding cells for start of month */}
                {Array.from({ length: firstDayIndex }).map((_, idx) => (
                  <div key={`empty-${idx}`} className="h-14 sm:h-16 rounded-xl bg-transparent" />
                ))}

                {/* Days */}
                {Array.from({ length: daysInMonth }).map((_, idx) => {
                  const dayNum = idx + 1;
                  const dayEvents = eventsByDay[dayNum] || [];
                  const isSelected =
                    selectedDate.getFullYear() === year &&
                    selectedDate.getMonth() === month &&
                    selectedDate.getDate() === dayNum;

                  const isToday =
                    new Date().getFullYear() === year &&
                    new Date().getMonth() === month &&
                    new Date().getDate() === dayNum;

                  const hasExam = dayEvents.some((e) => e.type === 'exam');
                  const hasSession = dayEvents.some((e) => e.type === 'session');

                  return (
                    <button
                      key={`day-${dayNum}`}
                      type="button"
                      onClick={() => setSelectedDate(new Date(year, month, dayNum))}
                      className={`h-14 sm:h-16 rounded-xl p-1.5 flex flex-col justify-between border transition-all text-left relative cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-500/20 border-emerald-400 shadow-md shadow-emerald-500/10'
                          : isToday
                          ? 'bg-white/10 border-white/20'
                          : 'bg-black/30 border-white/5 hover:border-white/15 hover:bg-white/[0.04]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs font-bold leading-none ${
                            isSelected
                              ? 'text-emerald-300'
                              : isToday
                              ? 'text-white'
                              : 'text-neutral-300'
                          }`}
                        >
                          {dayNum}
                        </span>
                        {isToday && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        )}
                      </div>

                      {/* Event dots/chips */}
                      {dayEvents.length > 0 && (
                        <div className="flex flex-wrap gap-1 overflow-hidden">
                          {hasExam && (
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-400" title="Exam" />
                          )}
                          {hasSession && (
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" title="Session" />
                          )}
                          {dayEvents.length > 2 && (
                            <span className="text-[9px] text-neutral-400 font-mono">
                              +{dayEvents.length}
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right 5 Cols: Selected Date Agenda Timeline */}
            <div className="lg:col-span-5 bg-white/[0.02] border border-white/10 rounded-2xl p-5 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
                  <div>
                    <h3 className="font-bold text-white text-base">
                      {selectedDate.toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </h3>
                    <p className="text-xs text-neutral-400">
                      {selectedDayEvents.length} event{selectedDayEvents.length === 1 ? '' : 's'} on this day
                    </p>
                  </div>

                  {/* Filter Pills */}
                  <div className="flex gap-1 bg-black/40 p-1 rounded-xl border border-white/10 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setActiveFilter('all')}
                      className={`px-2 py-0.5 rounded-lg font-semibold transition-all cursor-pointer ${
                        activeFilter === 'all' ? 'bg-white/20 text-white' : 'text-neutral-400'
                      }`}
                    >
                      All
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveFilter('session')}
                      className={`px-2 py-0.5 rounded-lg font-semibold transition-all cursor-pointer ${
                        activeFilter === 'session' ? 'bg-emerald-500 text-black' : 'text-neutral-400'
                      }`}
                    >
                      Sessions
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveFilter('exam')}
                      className={`px-2 py-0.5 rounded-lg font-semibold transition-all cursor-pointer ${
                        activeFilter === 'exam' ? 'bg-rose-500 text-white' : 'text-neutral-400'
                      }`}
                    >
                      Exams
                    </button>
                  </div>
                </div>

                {/* Day's Event List */}
                <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                  {selectedDayEvents.length === 0 ? (
                    <div className="py-12 text-center text-neutral-500 text-xs">
                      <CalendarDays className="w-8 h-8 mx-auto mb-2 opacity-40 text-neutral-400" />
                      <p>No study sessions or exams on this date.</p>
                      <button
                        type="button"
                        onClick={() => {
                          const iso = selectedDate.toISOString().split('T')[0];
                          setFormDate(iso);
                          setIsAddFormOpen(true);
                        }}
                        className="mt-3 text-emerald-400 hover:text-emerald-300 font-semibold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Schedule a session here</span>
                      </button>
                    </div>
                  ) : (
                    selectedDayEvents.map((ev) => {
                      const d = new Date(ev.date);
                      const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                      const isExam = ev.type === 'exam';

                      return (
                        <div
                          key={ev.id}
                          className={`p-3.5 rounded-xl border transition-all ${
                            isExam
                              ? 'bg-rose-950/20 border-rose-500/30'
                              : 'bg-white/[0.03] border-white/10 hover:border-white/20'
                          } ${ev.isCompleted ? 'opacity-50 line-through' : ''}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-1 flex-1">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.2 rounded-md ${
                                    isExam
                                      ? 'bg-rose-500/20 text-rose-300'
                                      : 'bg-emerald-500/20 text-emerald-300'
                                  }`}
                                >
                                  {ev.type}
                                </span>
                                <span className="text-xs text-neutral-400 flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-neutral-500" />
                                  {timeStr}
                                </span>
                              </div>
                              <h5 className="font-bold text-white text-sm leading-snug">
                                {ev.title}
                              </h5>
                              {ev.description && (
                                <p className="text-xs text-neutral-400 line-clamp-2">
                                  {ev.description}
                                </p>
                              )}
                              <div className="flex items-center gap-3 text-[11px] text-neutral-400 pt-1">
                                {ev.squad && <span>👥 {ev.squad.name}</span>}
                                {ev.location && <span>📍 {ev.location}</span>}
                              </div>
                            </div>

                            <div className="flex flex-col items-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleToggleComplete(ev)}
                                className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                  ev.isCompleted
                                    ? 'bg-emerald-500 text-black border-emerald-400'
                                    : 'bg-white/5 border-white/10 text-neutral-400 hover:text-white'
                                }`}
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <a
                                href={eventsAPI.exportIcsUrl(ev.id)}
                                download
                                title="Download .ics"
                                className="p-1 rounded-md text-neutral-500 hover:text-neutral-300"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </a>
                              <button
                                type="button"
                                onClick={() => handleDeleteEvent(ev.id)}
                                title="Delete event"
                                className="p-1 rounded-md text-neutral-500 hover:text-rose-400"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Bottom Quick Action */}
              <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs text-neutral-400">
                <span>Google & Apple Calendar compatible</span>
                <button
                  type="button"
                  onClick={() => {
                    const iso = selectedDate.toISOString().split('T')[0];
                    setFormDate(iso);
                    setIsAddFormOpen(true);
                  }}
                  className="text-emerald-400 hover:text-emerald-300 font-semibold cursor-pointer"
                >
                  + Add to this day
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* AI Study Plan Modal Drawer */}
        <AnimatePresence>
          {aiPlanModal.isOpen && (
            <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-[#141a15] border border-violet-500/30 rounded-3xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl"
              >
                <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-violet-950/20">
                  <div className="flex items-center gap-2.5">
                    <Sparkles className="w-5 h-5 text-violet-400 animate-pulse" />
                    <div>
                      <h4 className="font-bold text-white text-base">
                        AI Exam Countdown Strategy
                      </h4>
                      <p className="text-xs text-neutral-400">
                        {aiPlanModal.event?.title} ({aiPlanModal.event?.subject})
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setAiPlanModal({ isOpen: false, event: null, plan: '', loading: false })}
                    className="p-1.5 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1 text-sm text-neutral-200 leading-relaxed whitespace-pre-line space-y-3">
                  {aiPlanModal.loading ? (
                    <div className="py-16 text-center space-y-3">
                      <div className="w-8 h-8 rounded-full border-2 border-violet-500/30 border-t-violet-400 animate-spin mx-auto" />
                      <p className="text-xs text-violet-300 font-semibold">
                        Gemini is synthesizing high-yield study milestones for {aiPlanModal.event?.title}...
                      </p>
                    </div>
                  ) : (
                    aiPlanModal.plan
                  )}
                </div>

                {!aiPlanModal.loading && (
                  <div className="px-6 py-3 border-t border-white/10 bg-white/[0.02] flex items-center justify-between">
                    <span className="text-xs text-violet-400">Powered by Google Gemini</span>
                    <button
                      type="button"
                      onClick={handleCopyPlan}
                      className="px-3 py-1.5 rounded-xl bg-violet-500/20 hover:bg-violet-500/30 text-violet-300 font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      {copiedPlan ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedPlan ? 'Copied to Clipboard' : 'Copy Strategy'}</span>
                    </button>
                  </div>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
