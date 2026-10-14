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
app.use(express.json({ limit: '10mb' }));

// Apply rate limiting
app.use('/api', generalApiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);
app.use('/api/ai', aiLimiter);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/squads', squadRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/events', eventsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'StudySquad API is running healthy',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  });
});

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

// Live Presence API Endpoint
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

// Serve uploaded lecture slides, notes, and study PDFs
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Production: Serve React frontend static files if running as a unified server
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

// For any non-API and non-upload route in production, serve index.html for client-side routing
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) next();
  });
});

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
  socket.on('join_room', async ({ squadId, user }) => {
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

    // Send existing whiteboard drawing history to newly joined student
    if (squadWhiteboards.has(squadId)) {
      socket.emit('whiteboard_init', squadWhiteboards.get(squadId));
    }
  });

  // Leave squad room
  socket.on('leave_room', ({ squadId, user }) => {
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
      console.error('Socket message save error:', err);
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

  socket.on('disconnect', () => {
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
