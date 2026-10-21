import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Play,
  Pause,
  RotateCcw,
  ExternalLink,
  CheckCircle2,
  Circle,
  Plus,
  Users,
  Timer,
  Send,
  Sparkles,
  MessageSquare,
  Flame,
  Loader2,
  Copy,
  Check,
  Edit2,
  Save,
  Video,
  PenTool,
  BookOpen,
  Download,
  Shield,
  Crown,
  UserMinus,
  Megaphone,
  Pin,
  Brain,
  Volume2,
  VolumeX,
  Calendar as CalendarIcon,
  Trash2,
  LogOut,
} from 'lucide-react';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { aiAPI, squadsAPI, eventsAPI } from '../api/client';

// Lazy-load heavy tab components to prevent blocking the main thread
const Whiteboard   = lazy(() => import('./Whiteboard'));
const InRoomVideo  = lazy(() => import('./InRoomVideo'));
const ResourceHub  = lazy(() => import('./ResourceHub'));
const AIStudyStudio = lazy(() => import('./AIStudyStudio'));

// Lightweight spinner shown while a lazy tab is loading
function TabLoader() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3 text-neutral-500">
      <Loader2 className="w-7 h-7 animate-spin text-emerald-400" />
      <span className="text-xs">Loading...</span>
    </div>
  );
}

// Animated wrapper for every tab panel
const TAB_VARIANTS = {
  hidden:  { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.22, ease: 'easeOut' } },
  exit:    { opacity: 0, y: -6, transition: { duration: 0.15, ease: 'easeIn' } },
};

function TabPanel({ children, className = '' }) {
  return (
    <motion.div
      variants={TAB_VARIANTS}
      initial="hidden"
      animate="visible"
      exit="exit"
      className={className}
    >
      {children}
    </motion.div>
  );
}


export default function SquadRoomModal({
  squad,
  isOpen,
  onClose,
  onToggleTask,
  onAddTask,
  globalPresence = {},
  onLeaveSquad,
}) {
  const { user, openAuthModal } = useAuth();

  // Tab State: 'focus' | 'whiteboard' | 'video' | 'chat' | 'resources'
  const [activeTab, setActiveTab] = useState('focus');

  // Pomodoro State
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);

  // Task Input State
  const [newTaskText, setNewTaskText] = useState('');

  // AI Goal Suggestion State
  const [isSuggestingGoals, setIsSuggestingGoals] = useState(false);
  const [suggestedGoals, setSuggestedGoals] = useState([]);
  const [aiPoweredBy, setAiPoweredBy] = useState('');

  // Meeting Link State
  const [meetingUrl, setMeetingUrl] = useState(squad?.meetingUrl || squad?.link || '');
  const [isEditingMeeting, setIsEditingMeeting] = useState(false);
  const [meetingInput, setMeetingInput] = useState(squad?.meetingUrl || squad?.link || '');
  const [copiedLink, setCopiedLink] = useState(false);
  const [isSavingMeeting, setIsSavingMeeting] = useState(false);

  // Timetable & Exam State
  const [squadEvents, setSquadEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [showEventForm, setShowEventForm] = useState(false);
  const [evTitle, setEvTitle] = useState('');
  const [evDate, setEvDate] = useState('');
  const [evTime, setEvTime] = useState('19:00');
  const [evType, setEvType] = useState('session');
  const [evDesc, setEvDesc] = useState('');
  const [evSubmitting, setEvSubmitting] = useState(false);

  const fetchSquadEvents = async () => {
    if (!squad?.id) return;
    try {
      setLoadingEvents(true);
      const res = await eventsAPI.getAll({ squadId: squad.id });
      setSquadEvents(res.data?.events || []);
    } catch (e) {
      console.warn('Squad events fetch error:', e.message);
    } finally {
      setLoadingEvents(false);
    }
  };

  useEffect(() => {
    if (isOpen && squad?.id) {
      fetchSquadEvents();
    }
  }, [isOpen, squad?.id]);

  // Real-time Live Users in this room (from socket presence)
  const [liveUsers, setLiveUsers] = useState([]);

  // Real-time Chat State & History Persistence
  const [messages, setMessages] = useState(squad?.messages || []);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [chatSavedToast, setChatSavedToast] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);
  const [socket, setSocket] = useState(null);

  // Unread chat notification state
  const [unreadCount, setUnreadCount] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const soundEnabledRef = useRef(soundEnabled);
  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);
  const audioCtxRef = useRef(null);
  const activeTabRef = useRef(activeTab);

  const [aiCopilotResult, setAiCopilotResult] = useState(null);
  const [isAiCopilotLoading, setIsAiCopilotLoading] = useState(false);

  // Admin controls state
  const [squadMembers, setSquadMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [announcement, setAnnouncement] = useState(squad?.pinnedMessage || '');
  const [announcementInput, setAnnouncementInput] = useState(squad?.pinnedMessage || '');
  const [isEditingAnnouncement, setIsEditingAnnouncement] = useState(false);
  const [savingAnnouncement, setSavingAnnouncement] = useState(false);
  const [kickingUser, setKickingUser] = useState(null);
  const [promotingUser, setPromotingUser] = useState(null);
  const isOwner = user && (squad?.ownerId === user.id || squad?.owner?.id === user.id);

  // Sync liveUsers from globalPresence (updates from App's background socket)
  useEffect(() => {
    if (squad?.id && globalPresence[squad.id]) {
      setLiveUsers(globalPresence[squad.id].users || []);
    }
  }, [globalPresence, squad?.id]);

  // Sync squad props when modal opens or squad changes
  useEffect(() => {
    if (squad) {
      const url = squad.meetingUrl || squad.link || '';
      setMeetingUrl(url);
      setMeetingInput(url);
      if (squad.messages) setMessages(squad.messages);
    }
  }, [squad]);

  // Fetch full persistent chat history from database on room open
  useEffect(() => {
    if (!isOpen || !squad?.id) return;
    let isCurrent = true;
    setLoadingMessages(true);

    squadsAPI
      .getMessages(squad.id)
      .then((res) => {
        if (isCurrent && res.data?.messages) {
          setMessages(res.data.messages);
        }
      })
      .catch((err) => {
        console.warn('Failed to load past chat messages:', err.message);
        if (isCurrent && squad.messages) {
          setMessages(squad.messages);
        }
      })
      .finally(() => {
        if (isCurrent) setLoadingMessages(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [isOpen, squad?.id]);

  // Initialize Socket.io connection when modal opens (using dynamic environment URL)
  useEffect(() => {
    if (!isOpen || !squad) return;

    const socketUrl =
      import.meta.env.VITE_SOCKET_URL ||
      (import.meta.env.VITE_API_URL
        ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '')
        : window.location.origin);

    const socketInstance = io(socketUrl, {
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socketInstance;
    setSocket(socketInstance);

    socketInstance.emit('join_room', {
      squadId: squad.id,
      user: user || { id: 'guest-' + Date.now(), name: 'Guest Explorer' },
    });

    socketInstance.on('receive_message', (msg) => {
      setMessages((prev) => {
        if (msg.id && prev.some((m) => m.id === msg.id)) {
          return prev;
        }
        // If user is not on the Chat tab, increment unread badge and play chime
        if (activeTabRef.current !== 'chat' && msg.userId !== user?.id) {
          setUnreadCount((c) => c + 1);
          // Play soft chime via Web Audio API (no external dependencies)
          try {
            if (!audioCtxRef.current) {
              audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
            }
            const ctx = audioCtxRef.current;
            if (ctx.state === 'suspended') ctx.resume();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.setValueAtTime(880, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.15);
            gain.gain.setValueAtTime(0, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(soundEnabledRef.current ? 0.08 : 0, ctx.currentTime + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.4);
          } catch (_) { /* audio not available, silently ignore */ }
        }
        return [...prev, msg];
      });
    });

    // Live presence: who is currently in this room
    socketInstance.on('room_presence_update', ({ activeUsers }) => {
      setLiveUsers(activeUsers || []);
    });

    socketInstance.on('pomodoro_sync', ({ action, timeLeft }) => {
      if (action === 'start') {
        setIsActive(true);
        if (typeof timeLeft === 'number') setSecondsLeft(timeLeft);
      } else if (action === 'pause') {
        setIsActive(false);
        if (typeof timeLeft === 'number') setSecondsLeft(timeLeft);
      } else if (action === 'reset') {
        setIsActive(false);
        setSecondsLeft(25 * 60);
      }
    });

    return () => {
      socketInstance.emit('leave_room', {
        squadId: squad.id,
        user: user || { name: 'Guest Explorer' },
      });
      socketInstance.disconnect();
      socketRef.current = null;
      setSocket(null);
    };
  }, [isOpen, squad?.id, user]);

  // Keep activeTabRef in sync so the socket handler can read current tab without stale closure
  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  // Scroll chat to bottom on new messages
  useEffect(() => {
    if (activeTab === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeTab]);

  // Pomodoro timer tick logic
  useEffect(() => {
    if (!isActive) return;
    const interval = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          setIsActive(false);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isActive]);

  if (!isOpen || !squad) return null;

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Pomodoro Actions (broadcast via socket)
  const handleToggleTimer = () => {
    const nextState = !isActive;
    setIsActive(nextState);
    socketRef.current?.emit('pomodoro_action', {
      squadId: squad.id,
      action: nextState ? 'start' : 'pause',
      timeLeft: secondsLeft,
    });
  };

  const handleResetTimer = () => {
    setIsActive(false);
    setSecondsLeft(25 * 60);
    socketRef.current?.emit('pomodoro_action', {
      squadId: squad.id,
      action: 'reset',
      timeLeft: 25 * 60,
    });
  };

  // Send Chat Message with Socket and REST fallback
  const handleSendMessage = async (e) => {
    e.preventDefault();
    const text = inputMessage.trim();
    if (!text) return;

    if (!user) {
      openAuthModal('login');
      return;
    }

    const payload = {
      squadId: squad.id,
      userId: user.id,
      content: text,
    };

    setInputMessage('');

    if (socketRef.current?.connected) {
      socketRef.current.emit('send_message', payload);
    } else {
      // Fallback: Send via REST API so it's guaranteed to be saved in DB
      try {
        const res = await squadsAPI.sendMessage(squad.id, text);
        if (res.data?.message) {
          setMessages((prev) => [...prev, res.data.message]);
        }
      } catch (err) {
        console.error('Failed to send message via REST fallback:', err);
      }
    }
  };

  // Export / Save Chat History to local device as a Markdown study document
  const handleExportChat = () => {
    if (messages.length === 0) return;
    const dateStr = new Date().toISOString().split('T')[0];
    const timestampStr = new Date().toLocaleString();

    let content = `# 📚 StudySquad Chat Log & Study Discussion\n`;
    content += `**Squad:** ${squad.name}\n`;
    content += `**Subject:** ${squad.subject} | **Category:** ${squad.category}\n`;
    content += `**Exported At:** ${timestampStr}\n`;
    content += `**Total Messages:** ${messages.length}\n`;
    content += `===========================================================\n\n`;

    messages.forEach((m) => {
      const time = m.createdAt
        ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : '';
      const author = m.user?.name || (m.userId === user?.id ? (user?.name || 'You') : 'Teammate');
      content += `[${time}] ${author}:\n${m.content}\n\n`;
    });

    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const safeSquadName = squad.name.replace(/[^a-zA-Z0-9_-]/g, '_');
    link.setAttribute('download', `${safeSquadName}_Chat_${dateStr}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setChatSavedToast(true);
    setTimeout(() => setChatSavedToast(false), 3000);
  };

  // Add Task
  const handleCreateTask = (e) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;
    if (!user) {
      openAuthModal('login');
      return;
    }
    onAddTask(squad.id, newTaskText.trim());
    setNewTaskText('');
  };

  // AI Suggest Goals
  const handleSuggestGoals = async () => {
    setIsSuggestingGoals(true);
    try {
      const res = await aiAPI.suggestGoals(squad.name, squad.subject, squad.category);
      setSuggestedGoals(res.data.goals || []);
      setAiPoweredBy(res.data.poweredBy || 'Gemini AI');
    } catch (err) {
      console.error('Error suggesting goals:', err);
    } finally {
      setIsSuggestingGoals(false);
    }
  };

  const handleAddSuggestedGoal = (goal) => {
    if (!user) {
      openAuthModal('login');
      return;
    }
    onAddTask(squad.id, goal);
    setSuggestedGoals((prev) => prev.filter((g) => g !== goal));
  };

  // Squad AI Copilot quick actions (Summarize Notes & Generate Agenda)
  const handleRunAiCopilot = async (mode) => {
    setIsAiCopilotLoading(true);
    setAiCopilotResult(null);
    try {
      const res = await aiAPI.askSquadBot({
        squadId: squad.id,
        context: {
          subject: squad.subject,
          category: squad.category,
          squadName: squad.name,
          sharedNotes: squad.sharedNotes || '',
          tasks: squad.tasks || [],
        },
        mode,
      });
      setAiCopilotResult({
        title: mode === 'summarize-notes' ? '📝 Squad Notes Key Takeaways' : '📅 60-Minute Study Session Agenda',
        text: res.data.response,
        poweredBy: res.data.poweredBy,
      });
    } catch (err) {
      console.error('AI copilot error:', err);
    } finally {
      setIsAiCopilotLoading(false);
    }
  };

  // Copy meeting link to clipboard
  const handleCopyLink = () => {
    const activeUrl =
      meetingUrl ||
      squad.link ||
      (squad.platform === 'Google Meet'
        ? 'https://meet.google.com/new'
        : squad.platform === 'Zoom'
        ? 'https://zoom.us/join'
        : 'https://discord.com');
    navigator.clipboard.writeText(activeUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Save new meeting link (host can update meeting url directly from room)
  const handleSaveMeetingUrl = async (e) => {
    e.preventDefault();
    if (!meetingInput.trim()) return;
    setIsSavingMeeting(true);
    try {
      await squadsAPI.update(squad.id, { meetingUrl: meetingInput.trim() });
      setMeetingUrl(meetingInput.trim());
      setIsEditingMeeting(false);
    } catch (err) {
      console.error('Failed to update meeting URL:', err);
    } finally {
      setIsSavingMeeting(false);
    }
  };

  const membersList = squad.members || [];
  const memberCount = squad.memberCount ?? squad.membersCount ?? membersList.length;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md">
        {/* Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-neutral-900/90 text-white w-full max-w-5xl rounded-3xl shadow-2xl border border-white/15 overflow-hidden flex flex-col max-h-[92vh] backdrop-blur-2xl"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/5">
            <div className="flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                    Live Study Squad Room
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/10 text-neutral-300 border border-white/10">
                    {squad.category}
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight mt-0.5">
                  {squad.name}
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {onLeaveSquad && (
                <button
                  type="button"
                  title="Leave this study squad"
                  onClick={() => {
                    if (window.confirm('Are you sure you want to leave this study squad?')) {
                      onLeaveSquad(squad.id);
                    }
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Leave Squad</span>
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-full hover:bg-white/10 text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center px-4 sm:px-6 border-b border-white/10 bg-black/20 gap-2 sm:gap-4 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setActiveTab('focus')}
              className={`py-3 text-xs sm:text-sm font-semibold flex items-center gap-1.5 sm:gap-2 border-b-2 transition-all cursor-pointer shrink-0 ${
                activeTab === 'focus'
                  ? 'border-emerald-400 text-emerald-400'
                  : 'border-transparent text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Flame className="w-4 h-4" />
              <span>Focus & Goals</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('whiteboard')}
              className={`py-3 text-xs sm:text-sm font-semibold flex items-center gap-1.5 sm:gap-2 border-b-2 transition-all cursor-pointer shrink-0 ${
                activeTab === 'whiteboard'
                  ? 'border-violet-400 text-violet-400'
                  : 'border-transparent text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <PenTool className="w-4 h-4" />
              <span>Live Whiteboard</span>
              <span className="px-1.5 py-0.2 rounded-full bg-violet-500/20 text-violet-300 text-[10px] font-bold border border-violet-500/30">
                Live
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('video')}
              className={`py-3 text-xs sm:text-sm font-semibold flex items-center gap-1.5 sm:gap-2 border-b-2 transition-all cursor-pointer shrink-0 ${
                activeTab === 'video'
                  ? 'border-rose-400 text-rose-400'
                  : 'border-transparent text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Video className="w-4 h-4" />
              <span>In-Room Call</span>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('quiz')}
              className={`py-3 text-xs sm:text-sm font-semibold flex items-center gap-1.5 sm:gap-2 border-b-2 transition-all cursor-pointer shrink-0 ${
                activeTab === 'quiz'
                  ? 'border-violet-400 text-violet-400'
                  : 'border-transparent text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Brain className="w-4 h-4" />
              <span>AI Quiz & Cards</span>
              <span className="px-1.5 py-0.2 rounded-full bg-violet-500/20 text-violet-300 text-[10px] font-bold border border-violet-500/30">
                AI
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('chat');
                setUnreadCount(0);
              }}
              className={`py-3 text-xs sm:text-sm font-semibold flex items-center gap-1.5 sm:gap-2 border-b-2 transition-all cursor-pointer shrink-0 relative ${
                activeTab === 'chat'
                  ? 'border-cyan-400 text-cyan-400'
                  : 'border-transparent text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>Squad Chat</span>
              {/* Unread badge — shows only when user is NOT on chat tab and has unread messages */}
              {unreadCount > 0 && activeTab !== 'chat' && (
                <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold shadow-lg shadow-red-500/40 animate-bounce">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
              {/* Total message count pill — shown when on chat tab */}
              {activeTab === 'chat' && messages.length > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 bg-cyan-500/20 text-cyan-300 text-[10px] rounded-full border border-cyan-500/30">
                  {messages.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('resources')}
              className={`py-3 text-xs sm:text-sm font-semibold flex items-center gap-1.5 sm:gap-2 border-b-2 transition-all cursor-pointer shrink-0 ${
                activeTab === 'resources'
                  ? 'border-amber-400 text-amber-400'
                  : 'border-transparent text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Resources & Notes</span>
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30">
                Hub
              </span>
            </button>

            {/* Timetable & Exams tab */}
            <button
              type="button"
              onClick={() => {
                setActiveTab('schedule');
                fetchSquadEvents();
              }}
              className={`py-3 text-xs sm:text-sm font-semibold flex items-center gap-1.5 sm:gap-2 border-b-2 transition-all cursor-pointer shrink-0 ${
                activeTab === 'schedule'
                  ? 'border-emerald-400 text-emerald-400'
                  : 'border-transparent text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <CalendarIcon className="w-4 h-4" />
              <span>Timetable & Exams</span>
              {squadEvents.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                  {squadEvents.length}
                </span>
              )}
            </button>

            {/* Admin tab — only visible to squad owner */}
            {isOwner && (
              <button
                type="button"
                onClick={() => {
                  setActiveTab('admin');
                  if (squadMembers.length === 0) {
                    setLoadingMembers(true);
                    squadsAPI.getMembers(squad.id)
                      .then((res) => setSquadMembers(res.data.members || []))
                      .catch(console.warn)
                      .finally(() => setLoadingMembers(false));
                  }
                }}
                className={`py-3 text-xs sm:text-sm font-semibold flex items-center gap-1.5 sm:gap-2 border-b-2 transition-all cursor-pointer shrink-0 ${
                  activeTab === 'admin'
                    ? 'border-rose-400 text-rose-400'
                    : 'border-transparent text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <Shield className="w-4 h-4" />
                <span>Admin</span>
                <span className="px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-bold border border-rose-500/30">
                  Owner
                </span>
              </button>
            )}
          </div>

          {/* Modal Body */}
          <div className="p-6 overflow-y-auto flex-1 space-y-6">
            <AnimatePresence mode="wait">
              {activeTab === 'focus' && (
                <TabPanel key="focus">

                {/* Virtual Link Bar */}
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wide flex items-center gap-1.5">
                          <Video className="w-3.5 h-3.5" />
                          Live {squad.platform} Session
                        </span>
                        {user && (squad.ownerId === user.id || squad.owner?.id === user.id) && (
                          <button
                            type="button"
                            onClick={() => setIsEditingMeeting(!isEditingMeeting)}
                            className="text-[11px] text-neutral-400 hover:text-white inline-flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>{isEditingMeeting ? 'Cancel' : 'Edit Link'}</span>
                          </button>
                        )}
                      </div>
                      <p className="text-sm text-neutral-200 font-mono mt-1 truncate">
                        {meetingUrl || squad.link || (squad.platform === 'Google Meet' ? 'https://meet.google.com/new (Instant)' : 'No link set yet')}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                      <button
                        type="button"
                        onClick={handleCopyLink}
                        className="inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-neutral-200 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer border border-white/10"
                        title="Copy meeting link"
                      >
                        {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedLink ? 'Copied!' : 'Copy'}</span>
                      </button>

                      <a
                        href={
                          meetingUrl ||
                          squad.link ||
                          (squad.platform === 'Google Meet'
                            ? 'https://meet.new'
                            : squad.platform === 'Zoom'
                            ? 'https://zoom.us/join'
                            : 'https://discord.com')
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md shrink-0 cursor-pointer"
                      >
                        <span>Launch {squad.platform}</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>

                  {/* Inline Edit Meeting Link for Host */}
                  {isEditingMeeting && (
                    <form onSubmit={handleSaveMeetingUrl} className="pt-2 border-t border-white/10 flex items-center gap-2">
                      <input
                        type="url"
                        value={meetingInput}
                        onChange={(e) => setMeetingInput(e.target.value)}
                        placeholder={`Paste new ${squad.platform} link...`}
                        className="flex-1 bg-white/5 border border-white/15 rounded-xl px-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500/50 font-mono"
                      />
                      <button
                        type="submit"
                        disabled={isSavingMeeting}
                        className="bg-emerald-500 hover:bg-emerald-400 text-black px-3 py-1.5 rounded-xl text-xs font-bold inline-flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                      >
                        <Save className="w-3 h-3" />
                        <span>{isSavingMeeting ? 'Saving...' : 'Save'}</span>
                      </button>
                    </form>
                  )}
                </div>

                {/* Pomodoro Timer & Active Members */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Pomodoro Timer Box */}
                  <div className="p-5 rounded-2xl border border-white/10 bg-white/5 flex flex-col items-center justify-center text-center">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">
                      <Timer className="w-4 h-4 text-emerald-400" />
                      Synced Pomodoro
                    </div>
                    <div className="text-5xl font-mono font-bold text-white tracking-tight my-2">
                      {formatTime(secondsLeft)}
                    </div>
                    <div className="flex items-center gap-3 mt-3">
                      <button
                        type="button"
                        onClick={handleToggleTimer}
                        className="inline-flex items-center gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md"
                      >
                        {isActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                        {isActive ? 'Pause Timer' : 'Start Focus'}
                      </button>
                      <button
                        type="button"
                        onClick={handleResetTimer}
                        className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-neutral-300 transition-all cursor-pointer"
                        title="Reset Timer"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-[10px] text-neutral-500 mt-3">
                      ⚡ Synced across all connected squad members in real-time
                    </p>
                  </div>

                  {/* Live Active Members Box (real-time socket presence) */}
                  <div className="p-5 rounded-2xl border border-emerald-500/20 bg-emerald-950/20 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Users className="w-4 h-4 text-emerald-400" />
                          Live in Room
                        </span>
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-300 bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/30">
                          <span className="relative flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
                          </span>
                          {liveUsers.length} Online
                        </span>
                      </div>

                      {/* Live users list */}
                      <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                        {liveUsers.length > 0 ? (
                          liveUsers.map((u, idx) => (
                            <div key={idx} className="flex items-center justify-between text-xs py-1 group/usr">
                              <div className="flex items-center gap-2.5">
                                <div className="relative">
                                  <img
                                    src={
                                      u.avatar ||
                                      `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(u.name || 'User')}`
                                    }
                                    alt={u.name}
                                    referrerPolicy="no-referrer"
                                    className="w-7 h-7 rounded-full object-cover border-2 border-emerald-500/40"
                                  />
                                  <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-400 border border-neutral-900 shadow" />
                                </div>
                                <div>
                                  <span className="font-semibold text-neutral-100">
                                    {u.name}
                                    {user && u.id === user.id ? (
                                      <span className="ml-1 text-[10px] text-emerald-400 font-normal">(You)</span>
                                    ) : null}
                                  </span>
                                </div>
                              </div>
                              {/* Quick action buttons for other users */}
                              {user && u.id !== user.id && (
                                <div className="flex items-center gap-1 opacity-0 group-hover/usr:opacity-100 transition-opacity">
                                  <a
                                    href={`mailto:${u.email || ''}`}
                                    className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-neutral-300 transition-all cursor-pointer"
                                    title={`Message ${u.name}`}
                                  >
                                    <MessageSquare className="w-3 h-3" />
                                  </a>
                                </div>
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="text-xs text-neutral-500 py-3 text-center">
                            <span className="block text-2xl mb-1">🎯</span>
                            No one else is here yet.<br />
                            <span className="text-emerald-400 font-semibold">You're first! Share the squad to invite others.</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <p className="text-[11px] text-neutral-400 mt-3 border-t border-white/5 pt-2">
                      📅 Schedule: {squad.schedule}
                    </p>
                  </div>
                </div>

                {/* Shared Goals / Tasks Checklist */}
                <div className="p-5 rounded-2xl border border-white/10 bg-white/5">
                  <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-white">
                        Squad Goals & Milestones
                      </h4>
                      <p className="text-[11px] text-neutral-400">
                        Check off completed items or use AI to generate fresh study targets.
                      </p>
                    </div>

                    {/* AI Copilot Action Buttons */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => handleRunAiCopilot('summarize-notes')}
                        disabled={isAiCopilotLoading}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 hover:bg-amber-500/25 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
                        title="Summarize shared notes into key takeaways"
                      >
                        <Sparkles size={13} className="text-amber-400" />
                        <span>📝 Summarize Notes</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRunAiCopilot('study-agenda')}
                        disabled={isAiCopilotLoading}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-500/15 border border-violet-500/30 text-violet-300 hover:bg-violet-500/25 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
                        title="Generate 60-minute structured study agenda"
                      >
                        <Sparkles size={13} className="text-violet-400" />
                        <span>📅 60m Agenda</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleSuggestGoals}
                        disabled={isSuggestingGoals}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/30 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
                      >
                        {isSuggestingGoals ? (
                          <>
                            <Loader2 size={13} className="animate-spin" />
                            <span>Generating...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles size={13} className="text-emerald-400" />
                            <span>✨ AI Goals</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* AI Copilot Loading / Result Box */}
                  {isAiCopilotLoading && (
                    <div className="mb-4 p-3 rounded-xl bg-violet-950/40 border border-violet-500/30 flex items-center gap-2 text-xs text-violet-300 animate-pulse">
                      <Loader2 size={14} className="animate-spin text-violet-400" />
                      <span>StudySquad AI is analyzing squad data...</span>
                    </div>
                  )}

                  {aiCopilotResult && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mb-4 p-4 rounded-xl bg-gradient-to-br from-violet-950/40 via-neutral-900 to-indigo-950/40 border border-violet-500/35 shadow-lg"
                    >
                      <div className="flex items-center justify-between mb-2 pb-2 border-b border-white/10">
                        <span className="text-xs font-bold text-violet-300 flex items-center gap-1.5">
                          <Sparkles size={13} className="text-violet-400" />
                          {aiCopilotResult.title}
                          {aiCopilotResult.poweredBy && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30 font-normal">
                              {aiCopilotResult.poweredBy}
                            </span>
                          )}
                        </span>
                        <button
                          type="button"
                          onClick={() => setAiCopilotResult(null)}
                          className="text-[11px] text-neutral-400 hover:text-white cursor-pointer"
                        >
                          Dismiss
                        </button>
                      </div>
                      <div className="text-xs text-neutral-200 leading-relaxed whitespace-pre-line max-h-60 overflow-y-auto pr-1">
                        {aiCopilotResult.text}
                      </div>
                    </motion.div>
                  )}

                  {/* AI Suggested Goals Cards */}
                  {suggestedGoals.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mb-4 p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                          <Sparkles size={11} />
                          AI Recommendations ({aiPoweredBy})
                        </span>
                        <button
                          type="button"
                          onClick={() => setSuggestedGoals([])}
                          className="text-[10px] text-neutral-400 hover:text-white"
                        >
                          Dismiss
                        </button>
                      </div>
                      <div className="space-y-1.5">
                        {suggestedGoals.map((goal, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between gap-2 p-2 rounded-lg bg-black/40 border border-white/5 text-xs text-neutral-200"
                          >
                            <span>{goal}</span>
                            <button
                              type="button"
                              onClick={() => handleAddSuggestedGoal(goal)}
                              className="px-2 py-1 rounded bg-emerald-500 text-black font-bold text-[10px] hover:bg-emerald-400 transition-colors shrink-0 cursor-pointer"
                            >
                              + Add Goal
                            </button>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {/* Current Tasks List */}
                  <div className="space-y-2">
                    {squad.tasks?.map((task) => (
                      <button
                        key={task.id}
                        type="button"
                        onClick={() => onToggleTask(squad.id, task.id)}
                        className="w-full text-left flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/10 transition-colors border border-transparent hover:border-white/10 group cursor-pointer"
                      >
                        {task.completed ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : (
                          <Circle className="w-4 h-4 text-neutral-500 group-hover:text-neutral-300 shrink-0" />
                        )}
                        <span
                          className={`text-sm ${
                            task.completed
                              ? 'line-through text-neutral-500'
                              : 'text-neutral-200 font-medium'
                          }`}
                        >
                          {task.text}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* Add Goal Input */}
                  <form onSubmit={handleCreateTask} className="mt-4 flex items-center gap-2">
                    <input
                      type="text"
                      value={newTaskText}
                      onChange={(e) => setNewTaskText(e.target.value)}
                      placeholder="Add a new milestone or exercise for this squad..."
                      className="flex-1 text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-white/15 bg-white/5 text-white placeholder-neutral-500 focus:bg-white/10 focus:outline-none focus:border-emerald-500/50 transition-all"
                    />
                    <button
                      type="submit"
                      className="bg-white/15 hover:bg-white/25 text-white px-4 py-2.5 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer shrink-0 border border-white/15"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add</span>
                    </button>
                  </form>
                </div>
                </TabPanel>
              )}

              {activeTab === 'whiteboard' && (
                <TabPanel key="whiteboard">
                  <Suspense fallback={<TabLoader />}>
                    <Whiteboard
                      socket={socket}
                      squadId={squad.id}
                      userName={user?.name || 'Student'}
                    />
                  </Suspense>
                </TabPanel>
              )}

              {activeTab === 'video' && (
                <TabPanel key="video">
                  <Suspense fallback={<TabLoader />}>
                    <InRoomVideo
                      squad={squad}
                      user={user}
                    />
                  </Suspense>
                </TabPanel>
              )}

              {activeTab === 'quiz' && (
                <TabPanel key="quiz">
                  <Suspense fallback={<TabLoader />}>
                    <AIStudyStudio
                      squad={squad}
                      user={user}
                      socket={socket}
                      openAuthModal={openAuthModal}
                    />
                  </Suspense>
                </TabPanel>
              )}

              {activeTab === 'resources' && (
                <TabPanel key="resources">
                  <Suspense fallback={<TabLoader />}>
                    <ResourceHub
                      squad={squad}
                      user={user}
                      socket={socket}
                      openAuthModal={openAuthModal}
                    />
                  </Suspense>
                </TabPanel>
              )}

              {activeTab === 'chat' && (
                <TabPanel key="chat">
                  <div className="flex flex-col h-[520px] rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
                    {/* Chat Header Toolbar with Save / Export Chat */}
                    <div className="px-4 py-2.5 border-b border-white/10 bg-white/5 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
                    </span>
                    <span className="text-xs font-bold text-white">Live Squad Chat</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                      {messages.length} message{messages.length === 1 ? '' : 's'}
                    </span>
                    {loadingMessages && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-neutral-400">
                        <Loader2 className="w-3 h-3 animate-spin text-cyan-400" />
                        <span>Loading history...</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {chatSavedToast && (
                      <span className="text-[11px] text-emerald-400 font-semibold animate-pulse flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" />
                        <span>Chat Log Saved!</span>
                      </span>
                    )}
                    {/* Sound chime mute/unmute toggle */}
                    <button
                      type="button"
                      onClick={() => setSoundEnabled((s) => !s)}
                      className={`p-1.5 rounded-xl border text-xs font-semibold inline-flex items-center gap-1 transition-all cursor-pointer ${
                        soundEnabled
                          ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/25'
                          : 'bg-white/10 border-white/10 text-neutral-400 hover:bg-white/20'
                      }`}
                      title={soundEnabled ? 'Mute chat sound chime' : 'Unmute chat sound chime'}
                    >
                      {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={handleExportChat}
                      disabled={messages.length === 0}
                      className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-neutral-200 border border-white/10 text-xs font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
                      title="Save and download squad discussion log as Markdown"
                    >
                      <Download className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Save Chat</span>
                    </button>
                  </div>
                </div>

                {/* Chat Messages Stream */}
                <div className="flex-1 p-4 overflow-y-auto space-y-3">
                  {loadingMessages && messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-neutral-500 text-xs">
                      <Loader2 className="w-6 h-6 mb-2 animate-spin text-cyan-400" />
                      <p>Loading squad chat history...</p>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-neutral-500 text-xs">
                      <MessageSquare className="w-8 h-8 mb-2 opacity-40 text-emerald-400" />
                      <p>No messages yet in this study room.</p>
                      <p className="text-[11px] text-neutral-600 mt-0.5">
                        Break the ice and introduce yourself to the squad!
                      </p>
                    </div>
                  ) : (
                    messages.map((msg, i) => {
                      const isMe = user && msg.userId === user.id;
                      const timeStr = msg.createdAt
                        ? new Date(msg.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '';
                      return (
                        <motion.div
                          key={msg.id || i}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`flex items-start gap-2.5 ${isMe ? 'justify-end' : 'justify-start'}`}
                        >
                          {!isMe && (
                            <div className="relative shrink-0">
                              <img
                                src={
                                  msg.user?.avatar ||
                                  `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(msg.user?.name || 'User')}`
                                }
                                alt={msg.user?.name || 'User'}
                                referrerPolicy="no-referrer"
                                className="w-7 h-7 rounded-full object-cover border border-white/15 mt-0.5"
                              />
                            </div>
                          )}
                          <div
                            className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed shadow-md ${
                              isMe
                                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-black font-medium'
                                : 'bg-white/10 text-neutral-200 border border-white/10'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3 mb-1">
                              {!isMe && (
                                <span className="font-bold text-[10px] text-emerald-400">
                                  {msg.user?.name || 'Teammate'}
                                </span>
                              )}
                              {timeStr && (
                                <span
                                  className={`text-[9px] ${
                                    isMe ? 'text-black/60 font-semibold' : 'text-neutral-400'
                                  }`}
                                >
                                  {timeStr}
                                </span>
                              )}
                            </div>
                            <div className="whitespace-pre-line">{msg.content}</div>
                          </div>
                        </motion.div>
                      );
                    })
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input Box */}
                <form
                  onSubmit={handleSendMessage}
                  className="p-3 border-t border-white/10 bg-white/5 flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder={
                      user
                        ? 'Type a message to your squad...'
                        : 'Sign in to chat with the squad...'
                    }
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-500/50"
                  />
                  <button
                    type="submit"
                    className="bg-emerald-500 hover:bg-emerald-400 text-black p-2.5 rounded-xl transition-all cursor-pointer font-bold shrink-0"
                    title="Send Message"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
                </div>
                </TabPanel>
              )}

              {/* ── ADMIN CONTROLS TAB ── */}
              {activeTab === 'admin' && isOwner && (
                <TabPanel key="admin">
                  <div className="space-y-6">
                {/* Pinned Announcement */}
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Megaphone className="w-4 h-4 text-amber-400" />
                      <span className="text-sm font-semibold text-amber-300">Pinned Announcement</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setIsEditingAnnouncement(!isEditingAnnouncement); setAnnouncementInput(announcement); }}
                      className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
                    >
                      <Edit2 className="w-3 h-3" />
                      {isEditingAnnouncement ? 'Cancel' : 'Edit'}
                    </button>
                  </div>
                  {isEditingAnnouncement ? (
                    <div className="space-y-2">
                      <textarea
                        value={announcementInput}
                        onChange={(e) => setAnnouncementInput(e.target.value)}
                        placeholder="Type an announcement to pin for all members..."
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-amber-400/50 resize-none"
                        rows={3}
                        maxLength={500}
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setIsEditingAnnouncement(false)}
                          className="flex-1 border border-white/10 text-neutral-400 py-1.5 rounded-xl text-xs hover:text-white transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={savingAnnouncement}
                          onClick={async () => {
                            setSavingAnnouncement(true);
                            try {
                              const res = await squadsAPI.setAnnouncement(squad.id, announcementInput);
                              setAnnouncement(res.data.pinnedMessage || '');
                              setIsEditingAnnouncement(false);
                            } catch (e) { console.error(e); }
                            finally { setSavingAnnouncement(false); }
                          }}
                          className="flex-1 bg-amber-500 hover:bg-amber-400 text-black py-1.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {savingAnnouncement ? <Loader2 className="w-3 h-3 animate-spin" /> : <Pin className="w-3 h-3" />}
                          Pin Announcement
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-neutral-300">
                      {announcement || <span className="text-neutral-500 italic">No announcement pinned. Click Edit to add one.</span>}
                    </p>
                  )}
                </div>

                {/* Member Management */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="w-4 h-4 text-rose-400" />
                    <span className="text-sm font-semibold text-rose-300">
                      Member Management
                      {squadMembers.length > 0 && (
                        <span className="ml-2 text-neutral-500 font-normal">({squadMembers.length} members)</span>
                      )}
                    </span>
                  </div>

                  {loadingMembers ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
                    </div>
                  ) : squadMembers.length === 0 ? (
                    <p className="text-sm text-neutral-500 text-center py-6">No members yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {squadMembers.map((member) => {
                        const isCurrentUser = member.id === user?.id;
                        const isMemberOwner = member.role === 'owner';
                        const isMemberAdmin = member.role === 'admin';

                        return (
                          <div
                            key={member.id}
                            className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 group"
                          >
                            <img
                              src={member.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(member.name)}`}
                              alt={member.name}
                              referrerPolicy="no-referrer"
                              className="w-8 h-8 rounded-full border border-white/10"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm font-medium text-white truncate">{member.name}</span>
                                {isMemberOwner && (
                                  <Crown className="w-3 h-3 text-amber-400 shrink-0" title="Squad Owner" />
                                )}
                                {isMemberAdmin && (
                                  <Shield className="w-3 h-3 text-rose-400 shrink-0" title="Admin" />
                                )}
                                {isCurrentUser && (
                                  <span className="text-[10px] text-emerald-400 font-medium">(you)</span>
                                )}
                              </div>
                              <p className="text-[10px] text-neutral-500 capitalize">{member.role}</p>
                            </div>

                            {!isCurrentUser && !isMemberOwner && (
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {/* Promote / Demote */}
                                <button
                                  type="button"
                                  disabled={promotingUser === member.id}
                                  title={isMemberAdmin ? 'Remove Admin' : 'Make Admin'}
                                  onClick={async () => {
                                    setPromotingUser(member.id);
                                    try {
                                      const newRole = isMemberAdmin ? 'member' : 'admin';
                                      await squadsAPI.updateMemberRole(squad.id, member.id, newRole);
                                      setSquadMembers((prev) =>
                                        prev.map((m) => m.id === member.id ? { ...m, role: newRole } : m)
                                      );
                                    } catch (e) { console.error(e); }
                                    finally { setPromotingUser(null); }
                                  }}
                                  className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${isMemberAdmin ? 'text-rose-400 hover:bg-rose-500/20' : 'text-emerald-400 hover:bg-emerald-500/20'}`}
                                >
                                  {promotingUser === member.id
                                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    : <Shield className="w-3.5 h-3.5" />
                                  }
                                </button>

                                {/* Kick */}
                                <button
                                  type="button"
                                  disabled={kickingUser === member.id}
                                  title="Remove from Squad"
                                  onClick={async () => {
                                    if (!window.confirm(`Remove ${member.name} from the squad?`)) return;
                                    setKickingUser(member.id);
                                    try {
                                      await squadsAPI.kickMember(squad.id, member.id);
                                      setSquadMembers((prev) => prev.filter((m) => m.id !== member.id));
                                    } catch (e) { console.error(e); }
                                    finally { setKickingUser(null); }
                                  }}
                                  className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/20 transition-colors cursor-pointer"
                                >
                                  {kickingUser === member.id
                                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    : <UserMinus className="w-3.5 h-3.5" />
                                  }
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                </div>
                </TabPanel>
              )}

              {/* Timetable & Exams Panel */}
              {activeTab === 'schedule' && (
                <TabPanel key="schedule">
                  <div className="space-y-5">
                    {/* Header Banner */}
                    <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-neutral-900 to-black/60 border border-emerald-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <CalendarIcon className="w-4 h-4 text-emerald-400" />
                          <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                            Squad Schedule & Exam Radar
                          </span>
                        </div>
                        <h4 className="text-base font-bold text-white mt-0.5">
                          {squad.name} Timetable
                        </h4>
                        <p className="text-xs text-neutral-400">
                          Scheduled recurring sessions: <strong className="text-emerald-300">{squad.schedule}</strong>
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowEventForm(!showEventForm)}
                        className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>{showEventForm ? 'Cancel' : 'Schedule Session / Exam'}</span>
                      </button>
                    </div>

                    {/* Collapsible form */}
                    {showEventForm && (
                      <form
                        onSubmit={async (e) => {
                          e.preventDefault();
                          if (!evTitle || !evDate) return;
                          try {
                            setEvSubmitting(true);
                            const combined = new Date(`${evDate}T${evTime || '12:00'}:00`);
                            const res = await eventsAPI.create({
                              title: evTitle,
                              type: evType,
                              subject: squad.subject || squad.category || 'Academics',
                              date: combined.toISOString(),
                              description: evDesc,
                              squadId: squad.id,
                              userId: user?.id,
                            });
                            if (res.data?.event) {
                              setSquadEvents((prev) => [res.data.event, ...prev]);
                            }
                            setEvTitle('');
                            setEvDesc('');
                            setShowEventForm(false);
                          } catch (err) {
                            console.error('Error creating event:', err);
                          } finally {
                            setEvSubmitting(false);
                          }
                        }}
                        className="bg-black/50 border border-emerald-500/30 rounded-2xl p-4 space-y-3"
                      >
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setEvType('session')}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                              evType === 'session' ? 'bg-emerald-500 text-black' : 'bg-neutral-800 text-neutral-400'
                            }`}
                          >
                            Study Session
                          </button>
                          <button
                            type="button"
                            onClick={() => setEvType('exam')}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                              evType === 'exam' ? 'bg-rose-500 text-white' : 'bg-neutral-800 text-neutral-400'
                            }`}
                          >
                            Exam / Milestone
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="sm:col-span-2 space-y-1">
                            <label className="text-[11px] font-semibold text-neutral-400">Title / Topic *</label>
                            <input
                              type="text"
                              required
                              placeholder="e.g., Problem Set 4 Peer Review Sprint"
                              value={evTitle}
                              onChange={(e) => setEvTitle(e.target.value)}
                              className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-neutral-400">Date *</label>
                            <input
                              type="date"
                              required
                              value={evDate}
                              onChange={(e) => setEvDate(e.target.value)}
                              className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-neutral-400">Time</label>
                            <input
                              type="time"
                              value={evTime}
                              onChange={(e) => setEvTime(e.target.value)}
                              className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-neutral-400">Notes / Scope</label>
                            <input
                              type="text"
                              placeholder="e.g., Bring questions from Lecture 5"
                              value={evDesc}
                              onChange={(e) => setEvDesc(e.target.value)}
                              className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                            />
                          </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setShowEventForm(false)}
                            className="px-3 py-1.5 text-xs text-neutral-400 hover:text-white"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={evSubmitting}
                            className="px-4 py-1.5 rounded-xl bg-emerald-500 text-neutral-950 font-bold text-xs"
                          >
                            {evSubmitting ? 'Saving...' : 'Add to Squad'}
                          </button>
                        </div>
                      </form>
                    )}

                    {/* Events List */}
                    <div className="space-y-3">
                      {loadingEvents ? (
                        <div className="py-8 text-center text-xs text-neutral-400">Loading squad schedule...</div>
                      ) : squadEvents.length === 0 ? (
                        <div className="p-8 rounded-2xl bg-white/[0.02] border border-white/5 text-center text-neutral-400 text-xs space-y-2">
                          <CalendarIcon className="w-8 h-8 text-neutral-500 mx-auto" />
                          <p>No upcoming events scheduled for this squad yet.</p>
                          <p className="text-neutral-500">Plan a study sprint or add your next exam deadline above!</p>
                        </div>
                      ) : (
                        squadEvents.map((ev) => {
                          const d = new Date(ev.date);
                          const dateStr = d.toLocaleDateString([], { month: 'short', day: 'numeric', weekday: 'short' });
                          const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                          const isExam = ev.type === 'exam';

                          return (
                            <div
                              key={ev.id}
                              className={`p-4 rounded-2xl border flex items-center justify-between gap-3 ${
                                isExam
                                  ? 'bg-rose-950/20 border-rose-500/30'
                                  : 'bg-white/[0.02] border-white/10'
                              }`}
                            >
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.2 rounded-md ${
                                      isExam ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'
                                    }`}
                                  >
                                    {ev.type}
                                  </span>
                                  <span className="text-xs text-neutral-300 font-semibold">
                                    {dateStr} • {timeStr}
                                  </span>
                                </div>
                                <h5 className="font-bold text-white text-sm">{ev.title}</h5>
                                {ev.description && <p className="text-xs text-neutral-400">{ev.description}</p>}
                              </div>

                              <div className="flex items-center gap-2">
                                <a
                                  href={eventsAPI.exportIcsUrl(ev.id)}
                                  download
                                  title="Add to Google/Apple Calendar (.ics)"
                                  className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                  <span>.ICS</span>
                                </a>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </TabPanel>
              )}
            </AnimatePresence>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
}
