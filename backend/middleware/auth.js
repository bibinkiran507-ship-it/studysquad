import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.js';

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
      const user = await prisma.user.findFirst();
      if (user) {
        req.user = { ...user, isPro: resolveActivePro(user) };
        return next();
      }
    } catch (_) {}
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret());
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        isPro: true,
        proPlan: true,
        proExpiresAt: true,
      },
    });

    if (!user) {
      return res.status(401).json({ error: 'User no longer exists.' });
    }

    const activePro = resolveActivePro(user);
    if (user.isPro && !activePro) {
      prisma.user
        .update({
          where: { id: user.id },
          data: { isPro: false, proPlan: 'free' },
        })
        .catch(() => {});
    }

    req.user = { ...user, isPro: activePro };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token. Please log in again.' });
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
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        isPro: true,
        proPlan: true,
        proExpiresAt: true,
      },
    });
    if (user) {
      const activePro = resolveActivePro(user);
      if (user.isPro && !activePro) {
        prisma.user
          .update({
            where: { id: user.id },
            data: { isPro: false, proPlan: 'free' },
          })
          .catch(() => {});
      }
      req.user = { ...user, isPro: activePro };
    }
  } catch {
    // Ignore invalid token for optional auth
  }
  next();
};
