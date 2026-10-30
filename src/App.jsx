import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import Navbar from './components/Navbar';
import BackgroundVideo from './components/BackgroundVideo';
import ServicePills from './components/ServicePills';
import SquadDirectory from './components/SquadDirectory';
import SquadRoomModal from './components/SquadRoomModal';
import CreateSquadModal from './components/CreateSquadModal';
import StudyCalendarModal from './components/StudyCalendarModal';
import UpgradeProModal from './components/UpgradeProModal';
import HowItWorks from './components/HowItWorks';
import Footer from './components/Footer';
import ScrollProgress from './components/ScrollProgress';
import AuthModal from './components/AuthModal';
import UserProfileModal from './components/UserProfileModal';
import LoginPage from './components/LoginPage';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useTypewriter } from './hooks/useTypewriter';
import { squadsAPI, aiAPI, getSocketUrl } from './api/client';
import { INITIAL_SQUADS } from './data/mockSquads';
import { io } from 'socket.io-client';
import LiveStudyToastContainer from './components/LiveStudyToast';

// ⚠️ Replace this with your real Google OAuth Client ID from Google Cloud Console
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID_HERE';

function AppInner() {
  const { displayed, done } = useTypewriter('find your\nstudy squad!', 38, 600);
  const { user, openAuthModal } = useAuth();

  // State management
  const [squads, setSquads] = useState([]);
  const [loadingSquads, setLoadingSquads] = useState(true);
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [aiPoweredBy, setAiPoweredBy] = useState('');
  const [globalPresence, setGlobalPresence] = useState({});
  const [liveAlerts, setLiveAlerts] = useState([]);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [isProModalOpen, setIsProModalOpen] = useState(false);
  const [activeSquadRoom, setActiveSquadRoom] = useState(null);

  // Automatically open Pro upgrade modal when paywall limit is hit
  useEffect(() => {
    const handleTriggerPro = () => {
      setIsProModalOpen(true);
    };
    window.addEventListener('studysquad:open-pro-modal', handleTriggerPro);
    return () => window.removeEventListener('studysquad:open-pro-modal', handleTriggerPro);
  }, []);

  // Subscribe to real-time global presence and live study activity alerts
  useEffect(() => {
    squadsAPI
      .getLivePresence()
      .then((res) => {
        if (res.data?.presence) {
          setGlobalPresence(res.data.presence);
        }
      })
      .catch((err) => console.warn('Live presence fetch error:', err.message));

    const socketUrl = getSocketUrl();

    const socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
    });

    socket.on('global_presence_update', (presenceSummary) => {
      setGlobalPresence(presenceSummary || {});
    });

    socket.on('global_user_started_study', (alert) => {
      // Don't show toast to the user who just joined themselves
      if (user && alert.userId === user.id) return;

      setLiveAlerts((prev) => {
        if (
          prev.some(
            (a) =>
              a.id === alert.id ||
              (a.squadId === alert.squadId &&
                Date.now() - new Date(a.timestamp).getTime() < 8000)
          )
        ) {
          return prev;
        }
        return [...prev.slice(-2), alert];
      });

      // Browser Native Notification (if background tab & permitted)
      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'granted' && document.hidden) {
          try {
            new Notification(`🟢 ${alert.userName} started studying live!`, {
              body: `In "${alert.squadName}" (${alert.subject}). Click to join!`,
            });
          } catch (_) {}
        }
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [user]);

  // Request browser notification permission gently on first interaction
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      'Notification' in window &&
      Notification.permission === 'default'
    ) {
      const requestPerm = () => {
        try {
          Notification.requestPermission();
        } catch (_) {}
      };
      window.addEventListener('click', requestPerm, { once: true });
      return () => window.removeEventListener('click', requestPerm);
    }
  }, []);

  // Fetch squads from Backend API
  const loadSquads = useCallback(async () => {
    try {
      const res = await squadsAPI.getAll();
      if (res.data.squads && res.data.squads.length > 0) {
        setSquads(res.data.squads);
      } else {
        setSquads(INITIAL_SQUADS);
      }
    } catch (err) {
      console.warn('Backend unavailable, fallback to initial mock squads:', err.message);
      setSquads(INITIAL_SQUADS);
    } finally {
      setLoadingSquads(false);
    }
  }, []);

  useEffect(() => {
    loadSquads();
  }, [loadSquads, user]);

  // Handle viral invite links (?joinSquad=xyz or ?squad=xyz)
  useEffect(() => {
    if (squads.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const targetSquadId = params.get('joinSquad') || params.get('squad');
    if (targetSquadId) {
      const found = squads.find((s) => s.id === targetSquadId);
      if (found) {
        setActiveSquadRoom(found);
      }
    }
  }, [squads]);

  // When user clicks "Find Squads" in hero banner: AI Matchmaker
  const handleFindSquads = async () => {
    if (selectedOptions.length > 0) {
      try {
        const res = await aiAPI.matchSquads(selectedOptions, '');
        if (res.data.matches && res.data.matches.length > 0) {
          // Merge AI matches with remaining squads
          const matchedIds = new Set(res.data.matches.map((m) => m.id));
          const otherSquads = squads.filter((s) => !matchedIds.has(s.id));
          setSquads([...res.data.matches, ...otherSquads]);
          setAiPoweredBy(res.data.poweredBy || 'Gemini AI');
          setSelectedFilter('All');
        }
      } catch (err) {
        console.warn('AI matching error, falling back to filter:', err.message);
        setSelectedFilter(selectedOptions[0]);
      }
    }

    const element = document.getElementById('squads-section');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Join a squad via API
  const handleJoinSquad = async (squadId) => {
    if (!user) {
      openAuthModal('register');
      return;
    }

    try {
      const res = await squadsAPI.join(squadId);
      const updatedSquad = res.data.squad;

      setSquads((prev) =>
        prev.map((sq) => (sq.id === squadId ? updatedSquad : sq))
      );

      // Open live room directly on join
      setActiveSquadRoom(updatedSquad);
    } catch (err) {
      console.error('Failed to join squad:', err);
      // Fallback local update if API fails
      setSquads((prev) =>
        prev.map((sq) => {
          if (sq.id === squadId) {
            const currentMembers = Array.isArray(sq.members) ? sq.members : [];
            const currentCount = typeof sq.memberCount === 'number' ? sq.memberCount : currentMembers.length;
            const updated = {
              ...sq,
              isJoined: true,
              memberCount: currentCount + 1,
              members: [...currentMembers, user],
            };
            setActiveSquadRoom(updated);
            return updated;
          }
          return sq;
        })
      );
    }
  };

  // Leave a squad via API
  const handleLeaveSquad = async (squadId) => {
    if (!user) return;
    try {
      await squadsAPI.leave(squadId);
      setSquads((prev) =>
        prev.map((sq) => {
          if (sq.id === squadId) {
            const currentMembers = Array.isArray(sq.members) ? sq.members : [];
            const newMembers = currentMembers.filter((m) => m.id !== user.id);
            const currentCount = typeof sq.memberCount === 'number' ? sq.memberCount : currentMembers.length;
            return {
              ...sq,
              isJoined: false,
              memberCount: Math.max(0, currentCount - 1),
              members: newMembers,
            };
          }
          return sq;
        })
      );
      setActiveSquadRoom(null);
    } catch (err) {
      console.error('Failed to leave squad:', err);
    }
  };

  // Toggle study task in a room
  const handleToggleTask = async (squadId, taskId) => {
    const squad = squads.find((s) => s.id === squadId);
    const task = squad?.tasks?.find((t) => t.id === taskId);
    const newCompleted = task ? !task.completed : true;

    // Optimistic UI update
    setSquads((prev) =>
      prev.map((sq) => {
        if (sq.id === squadId) {
          return {
            ...sq,
            tasks: (sq.tasks || []).map((t) =>
              t.id === taskId ? { ...t, completed: newCompleted } : t
            ),
          };
        }
        return sq;
      })
    );

    if (activeSquadRoom && activeSquadRoom.id === squadId) {
      setActiveSquadRoom((prev) => ({
        ...prev,
        tasks: (prev.tasks || []).map((t) =>
          t.id === taskId ? { ...t, completed: newCompleted } : t
        ),
      }));
    }

    // Call API if task has a valid backend ID
    try {
      await squadsAPI.updateTask(squadId, taskId, { completed: newCompleted });
    } catch (err) {
      console.warn('Task update API warning:', err.message);
    }
  };

  // Add study task in a room
  const handleAddTask = async (squadId, text) => {
    if (!user) {
      openAuthModal('login');
      return;
    }

    try {
      const res = await squadsAPI.addTask(squadId, text);
      const newTask = res.data.task;

      setSquads((prev) =>
        prev.map((sq) => {
          if (sq.id === squadId) {
            return {
              ...sq,
              tasks: [...(sq.tasks || []), newTask],
            };
          }
          return sq;
        })
      );

      if (activeSquadRoom && activeSquadRoom.id === squadId) {
        setActiveSquadRoom((prev) => ({
          ...prev,
          tasks: [...(prev.tasks || []), newTask],
        }));
      }
    } catch (err) {
      console.warn('API task creation failed, using optimistic task:', err.message);
      const fallbackTask = {
        id: `task-${Date.now()}`,
        text,
        completed: false,
      };

      setSquads((prev) =>
        prev.map((sq) => {
          if (sq.id === squadId) {
            return {
              ...sq,
              tasks: [...(sq.tasks || []), fallbackTask],
            };
          }
          return sq;
        })
      );

      if (activeSquadRoom && activeSquadRoom.id === squadId) {
        setActiveSquadRoom((prev) => ({
          ...prev,
          tasks: [...(prev.tasks || []), fallbackTask],
        }));
      }
    }
  };

  // Create and publish a new study squad via API
  const handleCreateSquad = async (squadData) => {
    if (!user) {
      openAuthModal('register');
      return;
    }

    try {
      const res = await squadsAPI.create(squadData);
      const created = res.data.squad;

      setSquads((prev) => [created, ...prev]);
      setSelectedFilter(created.category);
      setActiveSquadRoom(created);

      const element = document.getElementById('squads-section');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    } catch (err) {
      console.error('Failed to create squad via API:', err);
    }
  };

  const handleDismissAlert = useCallback((alertId) => {
    setLiveAlerts((prev) => prev.filter((a) => a.id !== alertId));
  }, []);

  const handleJoinFromAlert = useCallback((squadId) => {
    const target = squads.find((s) => s.id === squadId);
    if (target) {
      setActiveSquadRoom(target);
    }
  }, [squads]);

  return (
    <div className="relative text-neutral-900 font-sans selection:bg-[#EAECE9] selection:text-[#1C2E1E] antialiased overflow-x-hidden min-h-screen flex flex-col">
      {/* Animated Scroll Progress Bar */}
      <ScrollProgress />

      {/* Global Auth Modal */}
      <AuthModal />

      {/* User Profile Modal */}
      <UserProfileModal onOpenProModal={() => setIsProModalOpen(true)} />

      {/* Transparent Sticky Navbar */}
      <Navbar
        onOpenCreateModal={() => setIsCreateModalOpen(true)}
        onOpenCalendarModal={() => setIsCalendarModalOpen(true)}
        onOpenProModal={() => setIsProModalOpen(true)}
      />

      {/* Hero Section Container */}
      <div className="relative w-full overflow-hidden flex flex-col min-h-screen">
        {/* Background Video Component - Fixed in background so it never shifts or gets cut off */}
        <BackgroundVideo />

        {/* Content Layout Container with safe top clearance */}
        <div className="relative z-10 flex flex-col flex-1 w-full bg-transparent pb-8 min-h-screen">
          <main
            id="spade-hero"
            className="w-full max-w-7xl mx-auto px-6 pt-28 sm:pt-32 lg:pt-36 pb-16 flex-1 flex flex-col justify-center"
          >
            <div className="max-w-2xl">
              {/* Headline with Typewriter Hook & Blinking Cursor */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="mb-8"
              >
                <h1 className="text-4xl sm:text-5xl lg:text-7xl font-light tracking-tight text-black leading-[1.08] whitespace-pre-line select-none">
                  {displayed}
                  {!done && (
                    <span className="inline-block w-[3px] h-[0.85em] bg-black ml-1.5 align-middle animate-[blink_0.9s_step-start_infinite]" />
                  )}
                </h1>
              </motion.div>

              {/* Service Pills Prompt & Match Trigger */}
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="w-full"
              >
                <ServicePills
                  selectedOptions={selectedOptions}
                  setSelectedOptions={setSelectedOptions}
                  onFindSquads={handleFindSquads}
                />
              </motion.div>
            </div>
          </main>
        </div>
      </div>

      {/* How It Works Section - Transparent background so 3D mannequin remains continuous */}
      <div className="relative z-10">
        <HowItWorks />
      </div>

      {/* Squads Directory Section with Live API Data - Transparent background */}
      <div className="relative z-10">
        <SquadDirectory
          squads={squads}
          onJoinSquad={handleJoinSquad}
          onOpenSquadRoom={(squad) => setActiveSquadRoom(squad)}
          selectedFilter={selectedFilter}
          onSelectFilter={setSelectedFilter}
          aiPoweredBy={aiPoweredBy}
          globalPresence={globalPresence}
          onOpenCalendarModal={() => setIsCalendarModalOpen(true)}
        />
      </div>

      {/* Footer placed at the very bottom of the page */}
      <div className="relative z-10">
        <Footer />
      </div>

      {/* Create Squad Modal */}
      <CreateSquadModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreateSquad={handleCreateSquad}
      />

      {/* Study Session Calendar & Exam Countdown Modal */}
      <StudyCalendarModal
        isOpen={isCalendarModalOpen}
        onClose={() => setIsCalendarModalOpen(false)}
        squads={squads}
        onOpenSquadRoom={(squad) => setActiveSquadRoom(squad)}
      />

      {/* StudySquad Pro Upgrade & Payment Modal */}
      <UpgradeProModal
        isOpen={isProModalOpen}
        onClose={() => setIsProModalOpen(false)}
      />

      {/* Squad Room Modal with Real-time Chat & Synced Pomodoro */}
      <SquadRoomModal
        squad={activeSquadRoom}
        isOpen={!!activeSquadRoom}
        onClose={() => setActiveSquadRoom(null)}
        onToggleTask={handleToggleTask}
        onAddTask={handleAddTask}
        globalPresence={globalPresence}
        onLeaveSquad={handleLeaveSquad}
        onOpenProModal={() => setIsProModalOpen(true)}
      />

      {/* Real-time Live Study Activity Toast Notifications */}
      <LiveStudyToastContainer
        notifications={liveAlerts}
        onDismiss={handleDismissAlert}
        onJoin={handleJoinFromAlert}
      />
    </div>
  );
}

function AppRoot() {
  const { user, loading } = useAuth();

  // While checking auth state, show a minimal dark loader
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0e0a]">
        <div className="w-8 h-8 rounded-full border-2 border-emerald-500/30 border-t-emerald-400 animate-spin" />
      </div>
    );
  }

  // Not logged in → show full-page login
  if (!user) {
    return <LoginPage />;
  }

  // Logged in → show the main app
  return <AppInner />;
}

export default function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <AppRoot />
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}
