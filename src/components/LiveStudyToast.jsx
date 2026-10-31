import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, X, ArrowRight } from 'lucide-react';

/**
 * Play a subtle, high-frequency pleasant soft chime via Web Audio API.
 * Synthesized locally so no external MP3 dependencies are required,
 * and properly closed after playback to avoid leaking hardware AudioContexts.
 */
function playLiveChime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // A5

    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.35);

    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 600);
  } catch {
    // Audio context silently ignored if autoplay policy restricts before gesture
  }
}

/**
 * Live Study Alert Card
 */
function LiveToastItem({ alert, onDismiss, onJoin }) {
  const [animating, setAnimating] = useState(false);
  const DURATION_MS = 6500;

  useEffect(() => {
    playLiveChime();

    const rafId = requestAnimationFrame(() => {
      setAnimating(true);
    });

    const timer = setTimeout(() => {
      onDismiss(alert.id);
    }, DURATION_MS);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timer);
    };
  }, [alert.id, onDismiss]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 30, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.9, transition: { duration: 0.2 } }}
      className="relative overflow-hidden w-84 sm:w-96 rounded-2xl border border-emerald-500/40 bg-slate-900/95 backdrop-blur-xl shadow-2xl shadow-emerald-950/50 p-4 text-white pointer-events-auto"
    >
      {/* Top Ambient Glow Accent */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-cyan-400 to-blue-500" />

      {/* Header Row: Live Pulse Badge + Dismiss */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold tracking-wide">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
          </span>
          <span>STUDYING LIVE NOW</span>
        </div>

        <button
          onClick={() => onDismiss(alert.id)}
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800/80 transition-colors"
          title="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body: User Avatar + Name + Squad */}
      <div className="flex items-start gap-3 mt-1">
        {alert.userAvatar ? (
          <img
            src={alert.userAvatar}
            alt={alert.userName}
            className="w-10 h-10 rounded-xl object-cover border border-emerald-500/30 shrink-0 bg-slate-800"
          />
        ) : (
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-600 flex items-center justify-center font-bold text-white text-sm shadow-md shrink-0">
            {alert.userName ? alert.userName.charAt(0).toUpperCase() : 'S'}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-100 truncate">
            {alert.userName || 'A teammate'}{' '}
            <span className="font-normal text-slate-400 text-xs">joined</span>
          </p>
          <p className="text-xs font-semibold text-cyan-300 truncate mt-0.5">
            {alert.squadName || 'Study Room'}
          </p>
          <p className="text-[11px] text-slate-400 truncate mt-0.5 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500 inline-block" />
            {alert.subject || 'Collaborative Study'}
          </p>
        </div>
      </div>

      {/* Action Footer: Join Room */}
      <div className="mt-3.5 pt-2.5 border-t border-slate-800/80 flex items-center justify-between gap-2">
        <span className="text-[11px] text-emerald-400/90 font-medium flex items-center gap-1">
          <Sparkles className="w-3 h-3" /> Focus session active
        </span>

        <button
          onClick={() => {
            onJoin(alert.squadId);
            onDismiss(alert.id);
          }}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 hover:shadow-emerald-500/40 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
        >
          <span>Join Room</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Auto-dismiss GPU/CSS Progress Bar (zero 20Hz React re-renders) */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-800">
        <div
          className="h-full bg-emerald-400 transition-[width] ease-linear"
          style={{
            width: animating ? '0%' : '100%',
            transitionDuration: `${DURATION_MS}ms`,
          }}
        />
      </div>
    </motion.div>
  );
}

/**
 * Container for Live Study Notifications.
 * Rendered at the root of App.jsx, fixed at the bottom-right corner.
 */
export default function LiveStudyToastContainer({ notifications = [], onDismiss, onJoin }) {
  if (!notifications || notifications.length === 0) return null;

  return (
    <aside
      aria-label="Live Study Notifications"
      className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none max-w-[calc(100vw-3rem)]"
    >
      <AnimatePresence mode="popLayout">
        {notifications.slice(-2).map((alert) => (
          <LiveToastItem
            key={alert.id}
            alert={alert}
            onDismiss={onDismiss}
            onJoin={onJoin}
          />
        ))}
      </AnimatePresence>
    </aside>
  );
}
