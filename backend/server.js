import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import squadRoutes from './routes/squads.js';
import aiRoutes, { getGeminiModel, generateWithGemini } from './routes/ai.js';
import eventsRoutes from './routes/events.js';
import paymentRoutes from './routes/payment.js';
import prisma from './lib/prisma.js';

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Explicitly load backend/.env, with fallback to root .env
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config();

const app = express();
// Enable trust proxy for reverse proxies (Render, Vercel, Cloudflare, AWS)
// This ensures rate limiting and logs use the real client IP, not the load balancer IP
app.set('trust proxy', 1);

// Prevent unhandled promise rejections or exceptions from crashing the server process
process.on('unhandledRejection', (reason) => {
  console.error('⚠️ [Server Guard] Unhandled Promise Rejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('⚠️ [Server Guard] Uncaught Exception:', err);
});

const server = http.createServer(app);


// Parse allowed CORS origins from CLIENT_URL (supports comma-separated list or *)
const rawOrigins = process.env.CLIENT_URL || '*';
const allowedOrigins = rawOrigins.includes(',')
  ? rawOrigins.split(',').map((url) => url.trim().replace(/\/$/, ''))
  : rawOrigins === '*'
  ? '*'
  : [rawOrigins.trim().replace(/\/$/, '')];

// Setup Socket.io with production-friendly CORS
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    credentials: true,
  },
});

const PORT = process.env.PORT || 3001;

// Production Security Headers (Helmet)
app.use(
  helmet({
    contentSecurityPolicy: false, // Prevents breaking WebSockets, DiceBear avatars, and OAuth popups
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false, // CRITICAL: Allows Google OAuth popup window to communicate token back to parent
  })
);

// Rate Limiters for Security & Quota Protection
const generalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 25, // Max 25 attempts per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please try again in 15 minutes.' },
});

const aiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 AI queries per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'AI request limit reached. Please pause briefly before asking again.' },
});

// Middlewares
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, server-to-server)
      if (!origin || allowedOrigins === '*' || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS policy blocked access from origin: ${origin}`));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Apply rate limiting
app.use('/api', generalApiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);
app.use('/api/ai', aiLimiter);

// In-Memory Presence Tracker: squadId -> Map<socketId, { id, name, avatar, joinedAt }>
const activeSquadPresence = new Map();
// Socket ID to squad/user mapping: socketId -> { squadId, user }
const socketPresenceMap = new Map();
// In-Memory Collaborative Whiteboard Cache: squadId -> Array<stroke>
const squadWhiteboards = new Map();

// Helper to broadcast presence update
const broadcastPresence = (squadId) => {
  if (squadId) {
    const usersMap = activeSquadPresence.get(squadId);
    const usersList = usersMap ? Array.from(usersMap.values()) : [];
    // Emit to this specific squad room
    io.to(squadId).emit('room_presence_update', {
      squadId,
      activeCount: usersList.length,
      activeUsers: usersList,
    });
  }

  // Emit global presence summary to all connected clients (so directory cards update live)
  const summary = {};
  for (const [sId, map] of activeSquadPresence.entries()) {
    if (map.size > 0) {
      summary[sId] = {
        count: map.size,
        users: Array.from(map.values()),
      };
    }
  }
  io.emit('global_presence_update', summary);
};

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'StudySquad API is running healthy',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  });
});

// Live Presence API Endpoint (Must be defined before /api/squads/:id)
app.get('/api/squads/live-presence', (req, res) => {
  const summary = {};
  for (const [sId, map] of activeSquadPresence.entries()) {
    if (map.size > 0) {
      summary[sId] = {
        count: map.size,
        users: Array.from(map.values()),
      };
    }
  }
  res.json({ presence: summary });
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
app.use('/uploads', express.static(uploadsDir));

// Production: Serve React frontend static files if running as a unified server
const distPath = path.join(__dirname, '../dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));

  // For any non-API and non-upload route in production, serve index.html for client-side routing
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
    res.sendFile(path.join(distPath, 'index.html'), (err) => {
      if (err) next();
    });
  });
}

// Global Error Handler (Sanitizes internal server error stack traces)
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  if (res.headersSent) {
    return next(err);
  }
  return res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'An unexpected server error occurred.'
      : err.message || 'Internal Server Error'
  });
});

// Real-Time Socket.io Connection & Study Rooms
io.on('connection', (socket) => {
  // Immediately send current global presence to the freshly connected socket
  const summary = {};
  for (const [sId, map] of activeSquadPresence.entries()) {
    if (map.size > 0) {
      summary[sId] = {
        count: map.size,
        users: Array.from(map.values()),
      };
    }
  }
  socket.emit('global_presence_update', summary);

  // Join a squad study room
  socket.on('join_room', async ({ squadId, user, squadName, subject }) => {
    try {
      if (!squadId) return;
      socket.join(squadId);

      const cleanUser = {
        id: user?.id || 'guest-' + socket.id,
        name: user?.name || 'Guest Explorer',
        avatar: user?.avatar || '',
        joinedAt: new Date().toISOString(),
      };

      if (!activeSquadPresence.has(squadId)) {
        activeSquadPresence.set(squadId, new Map());
      }
      activeSquadPresence.get(squadId).set(socket.id, cleanUser);
      socketPresenceMap.set(socket.id, { squadId, user: cleanUser });

      console.log(`Socket ${socket.id} (${cleanUser.name}) joined room: ${squadId}`);

      // Notify room members
      socket.to(squadId).emit('user_joined', {
        user: cleanUser,
        message: `${cleanUser.name} has joined the study room!`,
      });

      broadcastPresence(squadId);

      // Global real-time notification broadcast to all other connected students on the platform
      let resolvedSquadName = squadName;
      let resolvedSubject = subject;
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
        } catch (_) {}
      }

      socket.broadcast.emit('global_user_started_study', {
        id: `live-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        userId: cleanUser.id,
        userName: cleanUser.name,
        userAvatar: cleanUser.avatar,
        squadId,
        squadName: resolvedSquadName || 'Study Room',
        subject: resolvedSubject || 'Active Study Session',
        timestamp: new Date().toISOString(),
      });

      // Send existing whiteboard drawing history to newly joined student
      if (squadWhiteboards.has(squadId)) {
        socket.emit('whiteboard_init', squadWhiteboards.get(squadId));
      }
    } catch (err) {
      console.error('Error handling join_room:', err);
    }
  });

  // Leave squad room
  socket.on('leave_room', ({ squadId, user }) => {
    try {
      if (!squadId) return;
      socket.leave(squadId);

      if (activeSquadPresence.has(squadId)) {
        activeSquadPresence.get(squadId).delete(socket.id);
        if (activeSquadPresence.get(squadId).size === 0) {
          activeSquadPresence.delete(squadId);
        }
      }
      socketPresenceMap.delete(socket.id);

      socket.to(squadId).emit('user_left', {
        user,
        message: `${user?.name || 'A teammate'} left the room.`,
      });

      broadcastPresence(squadId);
    } catch (err) {
      console.error('Error handling leave_room:', err);
    }
  });

  // Real-time Chat message (strictly human-to-human peer chat)
  socket.on('send_message', async ({ squadId, userId, content }) => {
    if (!squadId || !userId || !content?.trim()) return;

    try {
      const message = await prisma.message.create({
        data: {
          squadId,
          userId,
          content: content.trim(),
        },
        include: {
          user: {
            select: { id: true, name: true, avatar: true },
          },
        },
      });

      // Emit to everybody in the squad room (including sender)
      io.to(squadId).emit('receive_message', message);
    } catch (err) {
      console.error('Socket message save error:', err.message);
      const senderPresence = socketPresenceMap.get(socket.id);
      io.to(squadId).emit('receive_message', {
        id: 'msg-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
        squadId,
        userId,
        content: content.trim(),
        createdAt: new Date().toISOString(),
        user: senderPresence?.user || { id: userId, name: 'Student', avatar: '' }
      });
    }
  });

  // Synced Pomodoro Timer
  socket.on('pomodoro_action', ({ squadId, action, timeLeft, mode }) => {
    // Broadcast action to all other members in room
    socket.to(squadId).emit('pomodoro_sync', {
      action,
      timeLeft,
      mode,
      triggeredBy: socket.id,
    });
  });

  // Collaborative Real-Time Whiteboard: Draw stroke
  socket.on('whiteboard_draw', ({ squadId, stroke }) => {
    if (!squadId || !stroke) return;
    if (!squadWhiteboards.has(squadId)) {
      squadWhiteboards.set(squadId, []);
    }
    const strokes = squadWhiteboards.get(squadId);
    strokes.push(stroke);
    if (strokes.length > 4000) {
      strokes.splice(0, 1000);
    }
    socket.to(squadId).emit('whiteboard_draw', stroke);
  });

  // Collaborative Real-Time Whiteboard: Clear canvas
  socket.on('whiteboard_clear', ({ squadId }) => {
    if (!squadId) return;
    squadWhiteboards.set(squadId, []);
    socket.to(squadId).emit('whiteboard_clear');
  });

  // Collaborative Real-Time Shared Notes
  socket.on('notes_update', ({ squadId, notes, userName }) => {
    if (!squadId) return;
    socket.to(squadId).emit('notes_sync', { notes, updatedBy: userName });
  });

  // Real-Time Study Resource Updates
  socket.on('resource_action', ({ squadId, action, resource, resourceId }) => {
    if (!squadId) return;
    socket.to(squadId).emit('resource_sync', { action, resource, resourceId });
  });

  // Real-Time Study Calendar & Exam Countdown Updates
  socket.on('calendar_event_action', ({ squadId, action, event, eventId }) => {
    io.emit('calendar_sync', { squadId, action, event, eventId });
  });

  // In-Memory Video Call Tracker: squadId -> Map<socketId, { user, audioMuted, videoMuted, isScreenSharing, isHandRaised }>
  const activeVideoRooms = new Map();

  // WebRTC In-Room Video Call Signaling
  socket.on('join_video_call', ({ squadId, user, initialState }) => {
    if (!squadId) return;
    const videoRoomKey = `video_${squadId}`;
    socket.join(videoRoomKey);

    if (!activeVideoRooms.has(squadId)) {
      activeVideoRooms.set(squadId, new Map());
    }

    const cleanUser = {
      id: user?.id || 'guest-' + socket.id,
      name: user?.name || 'Squad Member',
      avatar: user?.avatar || '',
    };

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

    // Save this socket to video room
    roomMap.set(socket.id, peerInfo);

    // Send existing peers to the newly joined peer
    socket.emit('video_existing_peers', { peers: existingPeers });

    // Notify other peers in this video room that a new peer joined
    socket.to(videoRoomKey).emit('video_peer_joined', {
      socketId: socket.id,
      user: cleanUser,
      ...peerInfo,
    });

    console.log(`📹 WebRTC: ${cleanUser.name} joined video call for squad ${squadId} (Total: ${roomMap.size})`);
  });

  // Relay WebRTC SDP Offers, Answers, and ICE Candidates between peers
  socket.on('video_signal_send', ({ to, signal, user }) => {
    if (!to || !signal) return;
    io.to(to).emit('video_signal_receive', {
      from: socket.id,
      signal,
      user,
    });
  });

  // Relay peer state changes (mic mute, camera off, screen share, raise hand)
  socket.on('video_peer_state', ({ squadId, audioMuted, videoMuted, isScreenSharing, isHandRaised }) => {
    if (!squadId) return;
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
  socket.on('video_send_reaction', ({ squadId, emoji, userName }) => {
    if (!squadId || !emoji) return;
    io.to(`video_${squadId}`).emit('video_receive_reaction', {
      id: 'reaction-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      emoji,
      userName: userName || 'Squad Mate',
      socketId: socket.id,
    });
  });

  // Leave Video Call explicitly
  socket.on('leave_video_call', ({ squadId }) => {
    if (!squadId) return;
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
    // Clean up any active WebRTC video rooms this socket was participating in
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
});
