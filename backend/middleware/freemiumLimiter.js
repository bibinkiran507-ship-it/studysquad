// ─── StudySquad Freemium AI Usage Limiter ────────────────────────────────────
// Free tier: 5 AI queries per calendar day
// Pro tier (isPro = true): Unlimited queries
// ─────────────────────────────────────────────────────────────────────────────

const DAILY_FREE_LIMIT = 5;

// In-memory daily counter: key = `${userId_or_ip}:${YYYY-MM-DD}` -> count
const dailyUsageMap = new Map();

// Helper to get today's date key in UTC/IST (YYYY-MM-DD)
const getTodayKey = () => {
  const now = new Date();
  return now.toISOString().slice(0, 10);
};

// Periodically clean up old days from memory every 12 hours
setInterval(() => {
  const today = getTodayKey();
  for (const key of dailyUsageMap.keys()) {
    if (!key.endsWith(today)) {
      dailyUsageMap.delete(key);
    }
  }
}, 12 * 60 * 60 * 1000);

/**
 * Returns current usage info for a user or IP
 */
export const getUsageStatus = (user, ip = 'unknown') => {
  const isPro = Boolean(user?.isPro);
  if (isPro) {
    return {
      isPro: true,
      limit: Infinity,
      used: 0,
      remaining: Infinity,
      limitReached: false,
    };
  }

  const identifier = user?.id || `anon:${ip}`;
  const key = `${identifier}:${getTodayKey()}`;
  const used = dailyUsageMap.get(key) || 0;
  const remaining = Math.max(0, DAILY_FREE_LIMIT - used);

  return {
    isPro: false,
    limit: DAILY_FREE_LIMIT,
    used,
    remaining,
    limitReached: used >= DAILY_FREE_LIMIT,
  };
};

/**
 * Express middleware to enforce daily AI query limit for free users.
 */
export const enforceAiLimit = (req, res, next) => {
  const user = req.user;
  const ip = req.ip || req.socket?.remoteAddress || '127.0.0.1';

  // Pro members get unlimited queries
  if (user?.isPro) {
    res.setHeader('X-Daily-Limit', 'unlimited');
    res.setHeader('X-Daily-Remaining', 'unlimited');
    return next();
  }

  const identifier = user?.id || `anon:${ip}`;
  const todayKey = `${identifier}:${getTodayKey()}`;
  const currentUsed = dailyUsageMap.get(todayKey) || 0;

  // Set rate limit headers
  res.setHeader('X-Daily-Limit', DAILY_FREE_LIMIT);
  res.setHeader('X-Daily-Used', currentUsed);
  res.setHeader('X-Daily-Remaining', Math.max(0, DAILY_FREE_LIMIT - currentUsed));

  // If already at or above limit, block and return upgrade required
  if (currentUsed >= DAILY_FREE_LIMIT) {
    return res.status(403).json({
      error: 'DAILY_AI_LIMIT_REACHED',
      message:
        "You've crushed your 5 free AI study queries for today! Upgrade to StudySquad Pro for unlimited 24/7 AI exam coaching, document summaries, and mock oral vivas.",
      upgradeRequired: true,
      dailyLimit: DAILY_FREE_LIMIT,
      used: currentUsed,
      remaining: 0,
    });
  }

  // Increment usage on success
  dailyUsageMap.set(todayKey, currentUsed + 1);

  // Hook into response to provide remaining count in JSON if desired
  res.setHeader('X-Daily-Used', currentUsed + 1);
  res.setHeader('X-Daily-Remaining', Math.max(0, DAILY_FREE_LIMIT - (currentUsed + 1)));

  next();
};

