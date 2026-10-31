import jwt from 'jsonwebtoken';
import prisma, { withRetry } from '../lib/prisma.js';

export const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('FATAL: JWT_SECRET environment variable is missing in production!');
  }
  return secret || 'studysquad-super-secret-jwt-key-2026';
};

export const resolveActivePro = (user) => {
  if (!user || !user.isPro) return false;
  if (user.proExpiresAt && new Date(user.proExpiresAt) < new Date()) {
    return false;
  }
  return true;
};

// Lightweight 20-second auth user cache so bursts of parallel API requests
// don't hammer Neon PostgreSQL, invalidated immediately on profile/payment updates.
const AUTH_CACHE_TTL_MS = 20 * 1000;
const AUTH_CACHE_MAX_SIZE = 2000;
const authUserCache = new Map();

export const invalidateAuthCache = (userId) => {
  if (userId) {
    authUserCache.delete(userId);
  }
};

async function loadAuthenticatedUser(userId) {
  if (!userId) return null;

  const nowMs = Date.now();
  const cached = authUserCache.get(userId);
  let user = cached && cached.expiresAt > nowMs ? cached.user : null;

  if (!user) {
    user = await withRetry(() =>
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          avatar: true,
          isPro: true,
          proPlan: true,
          proExpiresAt: true,
        },
      })
    );

    if (!user) {
      authUserCache.delete(userId);
      return null;
    }

    if (authUserCache.size >= AUTH_CACHE_MAX_SIZE) {
      const oldestKey = authUserCache.keys().next().value;
      if (oldestKey) authUserCache.delete(oldestKey);
    }
    authUserCache.set(userId, { user, expiresAt: nowMs + AUTH_CACHE_TTL_MS });
  }

  const activePro = resolveActivePro(user);
  if (user.isPro && !activePro) {
    // Guarded atomic downgrade: never overwrites a concurrent renewal where proExpiresAt > now
    prisma.user
      .updateMany({
        where: {
          id: user.id,
          isPro: true,
          proExpiresAt: { lt: new Date() },
        },
        data: { isPro: false, proPlan: 'free' },
      })
      .then(() => invalidateAuthCache(user.id))
      .catch(() => {});
  }

  return {
    ...user,
    isPro: activePro,
    proPlan: activePro ? user.proPlan || 'monthly' : 'free',
  };
}

export const verifySocketToken = async (token) => {
  if (!token || typeof token !== 'string') return null;
  try {
    const clean = token.startsWith('Bearer ') ? token.slice(7) : token;
    const decoded = jwt.verify(clean, getJwtSecret());
    return await loadAuthenticatedUser(decoded.userId);
  } catch {
    return null;
  }
};

export const requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }

  const token = authHeader.split(' ')[1];

  // Gracefully handle development or guest tokens ONLY outside production
  if (
    process.env.NODE_ENV !== 'production' &&
    (token.startsWith('mock-') || token.startsWith('demo-'))
  ) {
    try {
      const user = await withRetry(() => prisma.user.findFirst());
      if (user) {
        req.user = { ...user, isPro: resolveActivePro(user) };
        return next();
      }
    } catch (_) {}
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, getJwtSecret());
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token. Please log in again.' });
  }

  try {
    const user = await loadAuthenticatedUser(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: 'User no longer exists.' });
    }
    req.user = user;
    return next();
  } catch (dbErr) {
    console.error('[Auth] Database temporarily unavailable during token check:', dbErr.message);
    return res.status(503).json({
      error: 'Database is waking up. Please try again in a moment.',
      retryable: true,
    });
  }
};

export const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, getJwtSecret());
    const user = await loadAuthenticatedUser(decoded.userId);
    if (user) {
      req.user = user;
    }
  } catch {
    // Ignore invalid token or transient DB error for optional auth
  }
  return next();
};
