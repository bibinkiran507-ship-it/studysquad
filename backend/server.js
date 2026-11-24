import './lib/env.js';
import express from 'express';
import http from 'http';
import zlib from 'zlib';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import authRoutes from './routes/auth.js';
import squadRoutes from './routes/squads.js';
import aiRoutes from './routes/ai.js';
import eventsRoutes from './routes/events.js';
import paymentRoutes from './routes/payment.js';
import prisma, { withRetry } from './lib/prisma.js';
import { verifySocketToken } from './middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
// Enable trust proxy for reverse proxies (Render, Cloudflare, AWS)
app.set('trust proxy', 1);

// Prevent unhandled promise rejections or exceptions from crashing the server process
process.on('unhandledRejection', (reason) => {
  console.error('⚠️ [Server Guard] Unhandled Promise Rejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('⚠️ [Server Guard] Uncaught Exception:', err);
});

const server = http.createServer(app);

// Parse allowed CORS origins cleanly:
// - In production, never reflect arbitrary third-party origins when CLIENT_URL is '*' or unset
// - Always permit official StudySquad domains, RENDER_EXTERNAL_URL, and any explicit CLIENT_URL/APP_URL entries
const isProduction = process.env.NODE_ENV === 'production';
const explicitOrigins = [
  ...(process.env.CLIENT_URL || '').split(','),
  process.env.APP_URL || '',
  process.env.RENDER_EXTERNAL_URL || '',
]
  .map((url) => url.trim().replace(/\/$/, ''))
  .filter((url) => url && url !== '*');

const defaultProdOrigins = ['https://studysquadai.com', 'https://www.studysquadai.com'];
const allowedOriginsSet = new Set(
  isProduction ? [...defaultProdOrigins, ...explicitOrigins] : explicitOrigins
);

const isAllowedCorsOrigin = (origin) => {
  if (!origin) return true; // Same-origin navigations, webhooks, health checks
  const normalized = origin.trim().replace(/\/$/, '');
  if (!isProduction) {
    if (allowedOriginsSet.size === 0 || (process.env.CLIENT_URL || '*') === '*') return true;
  }
  return allowedOriginsSet.has(normalized);
};

const corsOriginDelegate = (origin, callback) => {
  if (isAllowedCorsOrigin(origin)) {
    return callback(null, true);
  }
  return callback(new Error(`CORS policy blocked access from origin: ${origin}`));
};

// Setup Socket.io with production-hardened CORS
const io = new Server(server, {
  cors: {
    origin: corsOriginDelegate,
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    credentials: true,
  },
  maxHttpBufferSize: 1e6, // 1 MB max per socket packet
});

const PORT = process.env.PORT || 3001;

// Production Security Headers (Helmet)
app.use(
  helmet({
    contentSecurityPolicy: false, // Allows WebSockets, DiceBear avatars, Google OAuth & Razorpay popups
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false, // Allows Google OAuth popup window to communicate token back to parent
  })
);

// Canonical Redirect: Automatically route any onrender.com visits to official domain https://studysquadai.com
app.use((req, res, next) => {
  const host = (req.headers.host || '').toLowerCase();
  if (
    host.includes('onrender.com') &&
    !req.path.startsWith('/api') &&
    !req.path.startsWith('/socket.io') &&
    !req.path.startsWith('/uploads') &&
    req.path !== '/health'
  ) {
    return res.redirect(301, `https://studysquadai.com${req.originalUrl}`);
  }
  next();
});

// Non-blocking gzip compression for JSON API payloads > 1 KB
app.use((req, res, next) => {
  const acceptEncoding = req.headers['accept-encoding'] || '';
  if (!acceptEncoding.includes('gzip')) return next();

  const origJson = res.json.bind(res);
  res.json = (body) => {
    if (res.headersSent || res.getHeader('Content-Encoding')) {
      return origJson(body);
    }
    const jsonStr = JSON.stringify(body);
    if (!jsonStr || Buffer.byteLength(jsonStr) < 1024) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.send(jsonStr);
    }
    zlib.gzip(Buffer.from(jsonStr, 'utf8'), (err, compressed) => {
      if (err || res.headersSent) {
        if (!res.headersSent) origJson(body);
        return;
      }
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Encoding', 'gzip');
      res.setHeader('Vary', 'Accept-Encoding');
      res.setHeader('Content-Length', compressed.length);
      res.end(compressed);
    });
    return res;
  };
  return next();
});

// Rate Limiters for Security & Campus Wi-Fi Scalability
const generalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1500, // Supports 50+ concurrent students sharing a single college/hostel Wi-Fi NAT IP
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) =>
    req.path === '/health' ||
    req.path.startsWith('/payment/webhook') ||
    req.path.startsWith('/payment/verify-payment') ||
    req.path.startsWith('/payment/reconcile'),
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please try again in 15 minutes.' },
});

const aiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'AI request limit reached. Please pause briefly before asking again.' },
});

// CORS
app.use(
  cors({
    origin: corsOriginDelegate,
    credentials: true,
  })
);

// Preserve rawBody specifically for Razorpay webhook cryptographic signature verification
app.use(
  express.json({
    limit: '5mb',
    verify: (req, _res, buf) => {
      if (req.originalUrl && req.originalUrl.startsWith('/api/payment/webhook')) {
        req.rawBody = buf;
      }
    },
  })
);
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// Apply rate limiting
app.use('/api', generalApiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);
app.use('/api/auth/reset-password', authLimiter);
app.use('/api/auth/google', authLimiter);
app.use('/api/ai', aiLimiter);
app.use('/api/events/ai-study-plan', aiLimiter);

// ─── Shared Real-Time Room State (Module Scope) ──────────────────────────────
// squadId -> Map<socketId, { id, name, avatar, joinedAt }>
const activeSquadPresence = new Map();
// socketId -> { squadId, user }
const socketPresenceMap = new Map();
// squadId -> Array<stroke>
const squadWhiteboards = new Map();
// squadId -> Map<socketId, { user, audioMuted, videoMuted, isScreenSharing, isHandRaised, joinedAt }>
const activeVideoRooms = new Map();

const dedupeUsersById = (usersMap) => {
  if (!usersMap || usersMap.size === 0) return [];
  const seen = new Map();
  for (const u of usersMap.values()) {
    const key = u?.id || u?.name;
    if (key && !seen.has(key)) {
      seen.set(key, u);
    }
  }
  return Array.from(seen.values());
};

const buildGlobalPresenceSummary = () => {
  const summary = {};
  for (const [sId, map] of activeSquadPresence.entries()) {
    if (map.size > 0) {
      const users = dedupeUsersById(map);
      if (users.length > 0) {
        summary[sId] = {
          count: users.length,
          users,
        };
      }
    }
  }
  return summary;
};

// Coalesce global presence broadcasts (350ms) so bursts of joins/leaves never cause O(N^2) broadcast storms
let globalPresenceTimer = null;
const scheduleGlobalPresenceBroadcast = () => {
  if (globalPresenceTimer) return;
  globalPresenceTimer = setTimeout(() => {
    globalPresenceTimer = null;
    io.emit('global_presence_update', buildGlobalPresenceSummary());
  }, 350);
};

const broadcastPresence = (squadId) => {
  if (squadId) {
    const usersMap = activeSquadPresence.get(squadId);
    const usersList = dedupeUsersById(usersMap);
    io.to(squadId).emit('room_presence_update', {
      squadId,
      activeCount: usersList.length,
      activeUsers: usersList,
    });
  }
  scheduleGlobalPresenceBroadcast();
};

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    message: 'StudySquad API is running healthy',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  });
});

// Live Presence API Endpoint (Defined before /api/squads/:id)
app.get('/api/squads/live-presence', (_req, res) => {
  res.json({ presence: buildGlobalPresenceSummary() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/squads', squadRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/payment', paymentRoutes);

// Serve uploaded lecture slides, notes, and study PDFs
const uploadsDir = process.env.UPLOADS_DIR || path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir, { maxAge: '7d' }));

// Production: Serve React frontend static files with optimal caching
const distPath = path.join(__dirname, '../dist');
if (fs.existsSync(distPath)) {
  const assetsPath = path.join(distPath, 'assets');
  if (fs.existsSync(assetsPath)) {
    app.use(
      '/assets',
      express.static(assetsPath, {
        maxAge: '1y',
        immutable: true,
      })
    );
  }

  app.use(
    express.static(distPath, {
      maxAge: '1h',
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('index.html')) {
          res.setHeader('Cache-Control', 'no-cache');
        }
      },
    })
  );

  // Client-side SPA routing fallback
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(path.join(distPath, 'index.html'), (err) => {
      if (err) next();
    });
  });
}

// Global Error Handler (Sanitizes internal server error stack traces)
app.use((err, _req, res, next) => {
  console.error('Unhandled Server Error:', err);
  if (res.headersSent) {
    return next(err);
  }
  const status = err.status || err.statusCode || 500;
  return res.status(status).json({
    error:
      process.env.NODE_ENV === 'production' && status >= 500
        ? 'An unexpected server error occurred.'
        : err.message || 'Internal Server Error',
  });
});

// Optional Socket.io JWT authentication middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (token) {
      socket.authUser = await verifySocketToken(token);
    }
  } catch {
    // Allow guest connections to receive live presence updates
  }
  return next();
});

// Safe payload normalizer (prevents uncaught TypeError when a client emits null)
const asObj = (p) => (p && typeof p === 'object' && !Array.isArray(p) ? p : {});
const MAX_WHITEBOARD_ROOMS = 100;
const sanitizeStroke = (s) => {
  if (!s || typeof s !== 'object') return null;
  const prevX = typeof s.prevX === 'number' ? s.prevX : s.x1;
  const prevY = typeof s.prevY === 'number' ? s.prevY : s.y1;
  const currX = typeof s.currX === 'number' ? s.currX : s.x2;
  const currY = typeof s.currY === 'number' ? s.currY : s.y2;
  if (
    !Number.isFinite(prevX) ||
    !Number.isFinite(prevY) ||
    !Number.isFinite(currX) ||
    !Number.isFinite(currY)
  ) {
    return null;
  }
  return {
    prevX,
    prevY,
    currX,
    currY,
    color: typeof s.color === 'string' ? s.color.slice(0, 32) : '#FFFFFF',
    size: Number.isFinite(s.size) ? Math.max(1, Math.min(48, s.size)) : 4,
    isEraser: Boolean(s.isEraser),
  };
};
const toPublicUser = (u, fallbackId) => ({
  id: u?.id || fallbackId,
  name: typeof u?.name === 'string' && u.name.trim() ? u.name.trim().slice(0, 80) : 'Guest Explorer',
  avatar: typeof u?.avatar === 'string' ? u.avatar.slice(0, 512) : '',
});

// Real-Time Socket.io Connection & Study Rooms
io.on('connection', (socket) => {
  socket.emit('global_presence_update', buildGlobalPresenceSummary());

  // Join a squad study room
  socket.on('join_room', async (raw) => {
    try {
      const { squadId, user, squadName, subject } = asObj(raw);
      if (!squadId || typeof squadId !== 'string') return;

      // Clean up prior room if this socket switched directly from another squad room
      const prevPresence = socketPresenceMap.get(socket.id);
      if (prevPresence && prevPresence.squadId && prevPresence.squadId !== squadId) {
        const oldSquadId = prevPresence.squadId;
        socket.leave(oldSquadId);
        if (activeSquadPresence.has(oldSquadId)) {
          activeSquadPresence.get(oldSquadId).delete(socket.id);
          if (activeSquadPresence.get(oldSquadId).size === 0) {
            activeSquadPresence.delete(oldSquadId);
          }
        }
        broadcastPresence(oldSquadId);
      }

      socket.join(squadId);

      const cleanUser = {
        ...toPublicUser(socket.authUser || user, 'guest-' + socket.id),
        joinedAt: new Date().toISOString(),
      };

      if (!activeSquadPresence.has(squadId)) {
        activeSquadPresence.set(squadId, new Map());
      }
      const alreadyInRoom = activeSquadPresence.get(squadId).has(socket.id);
      activeSquadPresence.get(squadId).set(socket.id, cleanUser);
      socketPresenceMap.set(socket.id, { squadId, user: cleanUser });

      if (!alreadyInRoom) {
        socket.to(squadId).emit('user_joined', {
          user: cleanUser,
          message: `${cleanUser.name} has joined the study room!`,
        });

        // Only authenticated users broadcast live study activity toasts globally (prevents guest spoofing)
        if (socket.authUser) {
          let resolvedSquadName = typeof squadName === 'string' ? squadName.slice(0, 120) : '';
          let resolvedSubject = typeof subject === 'string' ? subject.slice(0, 100) : '';
          if (!resolvedSquadName) {
            try {
              const sq = await prisma.squad.findUnique({
                where: { id: squadId },
                select: { name: true, subject: true },
              });
              if (sq) {
                resolvedSquadName = sq.name;
                resolvedSubject = sq.subject;
              }
            } catch {}
          }

          socket.broadcast.emit('global_user_started_study', {
            id: `live-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            userId: cleanUser.id,
            userName: cleanUser.name,
            userAvatar: cleanUser.avatar,
            squadId,
            squadName: resolvedSquadName || 'Study Room',
            subject: resolvedSubject || 'Active Study Session',
            timestamp: new Date().toISOString(),
          });
        }
      }

      broadcastPresence(squadId);

      // Send existing whiteboard drawing history to newly joined student
      if (squadWhiteboards.has(squadId)) {
        socket.emit('whiteboard_init', squadWhiteboards.get(squadId));
      }
    } catch (err) {
      console.error('Error handling join_room:', err);
    }
  });

  // Explicit whiteboard history pull (used when Whiteboard tab mounts after join_room)
  socket.on('whiteboard_request_init', (raw) => {
    const { squadId } = asObj(raw);
    if (!squadId || typeof squadId !== 'string') return;
    socket.emit('whiteboard_init', squadWhiteboards.get(squadId) || []);
  });

  // Leave squad room
  socket.on('leave_room', (raw) => {
    try {
      const { squadId, user } = asObj(raw);
      if (!squadId || typeof squadId !== 'string') return;
      socket.leave(squadId);

      if (activeSquadPresence.has(squadId)) {
        activeSquadPresence.get(squadId).delete(socket.id);
        if (activeSquadPresence.get(squadId).size === 0) {
          activeSquadPresence.delete(squadId);
        }
      }
      const prev = socketPresenceMap.get(socket.id);
      if (prev && prev.squadId === squadId) {
        socketPresenceMap.delete(socket.id);
      }

      const publicLeaver = toPublicUser(socket.authUser || user, 'guest-' + socket.id);
      socket.to(squadId).emit('user_left', {
        user: publicLeaver,
        message: `${publicLeaver.name || 'A teammate'} left the room.`,
      });

      broadcastPresence(squadId);
    } catch (err) {
      console.error('Error handling leave_room:', err);
    }
  });

  // Real-time Chat message (strictly authenticated via JWT & persisted in PostgreSQL before broadcasting)
  socket.on('send_message', async (raw) => {
    const { squadId, content } = asObj(raw);
    const effectiveUserId = socket.authUser?.id;
    if (!effectiveUserId) {
      socket.emit('message_error', {
        squadId,
        error: 'Please sign in to send chat messages.',
      });
      return;
    }
    if (!squadId || typeof squadId !== 'string' || typeof content !== 'string' || !content.trim()) {
      return;
    }

    const cleanContent = content.trim().slice(0, 4000);

    try {
      const message = await withRetry(() =>
        prisma.message.create({
          data: {
            squadId,
            userId: effectiveUserId,
            content: cleanContent,
          },
          include: {
            user: {
              select: { id: true, name: true, avatar: true },
            },
          },
        })
      );

      io.to(squadId).emit('receive_message', message);
    } catch (err) {
      console.error('Socket message save error:', err.message);
      socket.emit('message_error', {
        squadId,
        error: 'Could not deliver message right now. Please try sending again.',
      });
    }
  });

  // Synced Pomodoro Timer (authenticated users only)
  socket.on('pomodoro_action', (raw) => {
    const { squadId, action, timeLeft, mode } = asObj(raw);
    if (!socket.authUser || !squadId || typeof squadId !== 'string') return;
    socket.to(squadId).emit('pomodoro_sync', {
      action,
      timeLeft,
      mode,
      triggeredBy: socket.id,
    });
  });

  // Collaborative Real-Time Whiteboard: Draw stroke (authenticated users only + bounded LRU cache)
  socket.on('whiteboard_draw', (raw) => {
    const { squadId, stroke, strokes: batchStrokes } = asObj(raw);
    if (!socket.authUser || !squadId || typeof squadId !== 'string') return;
    const rawIncoming = Array.isArray(batchStrokes)
      ? batchStrokes.slice(0, 200)
      : stroke
      ? [stroke]
      : [];
    if (rawIncoming.length === 0) return;

    const cleanStrokes = rawIncoming.map(sanitizeStroke).filter(Boolean);
    if (cleanStrokes.length === 0) return;

    if (!squadWhiteboards.has(squadId)) {
      if (squadWhiteboards.size >= MAX_WHITEBOARD_ROOMS) {
        const oldestKey = squadWhiteboards.keys().next().value;
        if (oldestKey) squadWhiteboards.delete(oldestKey);
      }
      squadWhiteboards.set(squadId, []);
    }
    const roomStrokes = squadWhiteboards.get(squadId);
    roomStrokes.push(...cleanStrokes);
    if (roomStrokes.length > 3500) {
      roomStrokes.splice(0, roomStrokes.length - 3000);
    }

    socket.to(squadId).emit('whiteboard_draw', cleanStrokes.length === 1 ? cleanStrokes[0] : cleanStrokes);
  });

  // Collaborative Real-Time Whiteboard: Clear canvas (authenticated users only)
  socket.on('whiteboard_clear', (raw) => {
    const { squadId } = asObj(raw);
    if (!socket.authUser || !squadId || typeof squadId !== 'string') return;
    squadWhiteboards.delete(squadId);
    socket.to(squadId).emit('whiteboard_clear');
  });

  // Collaborative Real-Time Shared Notes (authenticated users only)
  socket.on('notes_update', (raw) => {
    const { squadId, notes } = asObj(raw);
    if (!socket.authUser || !squadId || typeof squadId !== 'string' || typeof notes !== 'string') return;
    socket.to(squadId).emit('notes_sync', {
      notes: notes.slice(0, 100_000),
      updatedBy: socket.authUser.name || 'Squad Member',
    });
  });

  // Real-Time Study Resource Updates (authenticated users only)
  socket.on('resource_action', (raw) => {
    const { squadId, action, resource, resourceId } = asObj(raw);
    if (!socket.authUser || !squadId || typeof squadId !== 'string') return;
    socket.to(squadId).emit('resource_sync', { action, resource, resourceId });
  });

  // Real-Time Study Calendar & Exam Countdown Updates (authenticated users only, room-scoped)
  socket.on('calendar_event_action', (raw) => {
    const { squadId, action, event, eventId } = asObj(raw);
    if (!socket.authUser) return;
    if (squadId && typeof squadId === 'string') {
      io.to(squadId).emit('calendar_sync', { squadId, action, event, eventId });
    } else {
      socket.emit('calendar_sync', { squadId: null, action, event, eventId });
    }
  });

  // WebRTC In-Room Video Call Signaling (authenticated users only)
  socket.on('join_video_call', (raw) => {
    const { squadId, initialState } = asObj(raw);
    if (!socket.authUser || !squadId || typeof squadId !== 'string') return;
    const videoRoomKey = `video_${squadId}`;
    socket.join(videoRoomKey);

    if (!activeVideoRooms.has(squadId)) {
      activeVideoRooms.set(squadId, new Map());
    }

    const cleanUser = toPublicUser(socket.authUser, socket.id);

    const peerInfo = {
      user: cleanUser,
      audioMuted: initialState?.audioMuted ?? false,
      videoMuted: initialState?.videoMuted ?? false,
      isScreenSharing: initialState?.isScreenSharing ?? false,
      isHandRaised: initialState?.isHandRaised ?? false,
      joinedAt: new Date().toISOString(),
    };

    const roomMap = activeVideoRooms.get(squadId);

    // Collect all existing peers currently in the video call
    const existingPeers = [];
    for (const [peerSocketId, data] of roomMap.entries()) {
      if (peerSocketId !== socket.id) {
        existingPeers.push({
          socketId: peerSocketId,
          user: data.user,
          audioMuted: data.audioMuted,
          videoMuted: data.videoMuted,
          isScreenSharing: data.isScreenSharing,
          isHandRaised: data.isHandRaised,
        });
      }
    }

    roomMap.set(socket.id, peerInfo);

    // Send existing peers to the newly joined peer
    socket.emit('video_existing_peers', { peers: existingPeers });

    // Notify other peers in this video room that a new peer joined
    socket.to(videoRoomKey).emit('video_peer_joined', {
      socketId: socket.id,
      user: cleanUser,
      ...peerInfo,
    });
  });

  // Relay WebRTC SDP Offers, Answers, and ICE Candidates between authenticated peers sharing a video room
  socket.on('video_signal_send', (raw) => {
    const { to, signal } = asObj(raw);
    if (!socket.authUser || typeof to !== 'string' || !to || !signal) return;
    let sharesVideoRoom = false;
    for (const roomMap of activeVideoRooms.values()) {
      if (roomMap.has(socket.id) && roomMap.has(to)) {
        sharesVideoRoom = true;
        break;
      }
    }
    if (!sharesVideoRoom) return;
    io.to(to).emit('video_signal_receive', {
      from: socket.id,
      signal,
      user: toPublicUser(socket.authUser, socket.id),
    });
  });

  // Relay peer state changes (mic mute, camera off, screen share, raise hand)
  socket.on('video_peer_state', (raw) => {
    const { squadId, audioMuted, videoMuted, isScreenSharing, isHandRaised } = asObj(raw);
    if (!socket.authUser || !squadId || typeof squadId !== 'string') return;
    const roomMap = activeVideoRooms.get(squadId);
    if (roomMap && roomMap.has(socket.id)) {
      const prev = roomMap.get(socket.id);
      roomMap.set(socket.id, {
        ...prev,
        audioMuted: audioMuted ?? prev.audioMuted,
        videoMuted: videoMuted ?? prev.videoMuted,
        isScreenSharing: isScreenSharing ?? prev.isScreenSharing,
        isHandRaised: isHandRaised ?? prev.isHandRaised,
      });
    }

    socket.to(`video_${squadId}`).emit('video_peer_state_changed', {
      socketId: socket.id,
      audioMuted,
      videoMuted,
      isScreenSharing,
      isHandRaised,
    });
  });

  // Relay live emoji reactions in video room
  socket.on('video_send_reaction', (raw) => {
    const { squadId, emoji } = asObj(raw);
    if (!socket.authUser || !squadId || typeof squadId !== 'string' || !emoji) return;
    io.to(`video_${squadId}`).emit('video_receive_reaction', {
      id: 'reaction-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      emoji: String(emoji).slice(0, 8),
      userName: socket.authUser.name || 'Squad Mate',
      socketId: socket.id,
    });
  });

  // Leave Video Call explicitly
  socket.on('leave_video_call', (raw) => {
    const { squadId } = asObj(raw);
    if (!squadId || typeof squadId !== 'string') return;
    const videoRoomKey = `video_${squadId}`;
    socket.leave(videoRoomKey);

    const roomMap = activeVideoRooms.get(squadId);
    if (roomMap) {
      roomMap.delete(socket.id);
      if (roomMap.size === 0) {
        activeVideoRooms.delete(squadId);
      }
    }

    socket.to(videoRoomKey).emit('video_peer_left', { socketId: socket.id });
  });

  socket.on('disconnect', () => {
    for (const [squadId, roomMap] of activeVideoRooms.entries()) {
      if (roomMap.has(socket.id)) {
        roomMap.delete(socket.id);
        socket.to(`video_${squadId}`).emit('video_peer_left', { socketId: socket.id });
        if (roomMap.size === 0) {
          activeVideoRooms.delete(squadId);
        }
      }
    }

    const presence = socketPresenceMap.get(socket.id);
    if (presence) {
      const { squadId, user } = presence;
      if (activeSquadPresence.has(squadId)) {
        activeSquadPresence.get(squadId).delete(socket.id);
        if (activeSquadPresence.get(squadId).size === 0) {
          activeSquadPresence.delete(squadId);
        }
      }
      socketPresenceMap.delete(socket.id);
      socket.to(squadId).emit('user_left', {
        user,
        message: `${user?.name || 'A teammate'} disconnected.`,
      });
      broadcastPresence(squadId);
    }
  });
});

server.listen(PORT, () => {
  console.log(`🚀 StudySquad Backend running on http://localhost:${PORT}`);
  console.log(`⚡ Socket.io ready for live study rooms`);

  // Keep Render Free Tier awake 24/7 so Googlebot and students never hit a 50s cold-start delay
  if (process.env.NODE_ENV === 'production') {
    const KEEP_ALIVE_URL = 'https://studysquadai.com/api/health';
    setInterval(() => {
      fetch(KEEP_ALIVE_URL, { signal: AbortSignal.timeout(10000) }).catch(() => {});
    }, 13 * 60 * 1000); // Every 13 minutes (under Render's 15-minute idle spin-down threshold)
  }
});
