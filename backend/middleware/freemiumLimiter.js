// ─── StudySquad Freemium AI Usage Limiter ────────────────────────────────────
// Free tier: 5 AI queries per calendar day (resets at 12:00 AM IST / UTC+5:30)
// Pro tier (isPro = true): Unlimited queries
// ─────────────────────────────────────────────────────────────────────────────

export const DAILY_FREE_LIMIT = 5;
const PRO_UNLIMITED_NUMERIC = 999999;
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

// In-memory daily counter: key = `${userId_or_ip}:${YYYY-MM-DD}` -> count
const dailyUsageMap = new Map();

// Helper to get today's date key in IST (YYYY-MM-DD) so Indian students get a midnight reset
export const getTodayKey = () => {
  const istNow = new Date(Date.now() + IST_OFFSET_MS);
  return istNow.toISOString().slice(0, 10);
};

// Periodically clean up old days from memory every 12 hours
const cleanupTimer = setInterval(() => {
  const today = getTodayKey();
  for (const key of dailyUsageMap.keys()) {
    if (!key.endsWith(today)) {
      dailyUsageMap.delete(key);
    }
  }
}, 12 * 60 * 60 * 1000);

if (typeof cleanupTimer.unref === 'function') {
  cleanupTimer.unref();
}

/**
 * Returns current JSON-safe usage info for a user or IP.
 * Never returns `Infinity` (which JSON.stringify turns into `null`).
 */
export const getUsageStatus = (user, ip = 'unknown') => {
  const isPro = Boolean(user?.isPro);
  if (isPro) {
    return {
      isPro: true,
      unlimited: true,
      limit: PRO_UNLIMITED_NUMERIC,
      used: 0,
      remaining: PRO_UNLIMITED_NUMERIC,
      limitReached: false,
      resetsAt: 'Never (Pro Unlimited)',
    };
  }

  const identifier = user?.id || `anon:${ip}`;
  const key = `${identifier}:${getTodayKey()}`;
  const used = dailyUsageMap.get(key) || 0;
  const remaining = Math.max(0, DAILY_FREE_LIMIT - used);

  return {
    isPro: false,
    unlimited: false,
    limit: DAILY_FREE_LIMIT,
    used,
    remaining,
    limitReached: used >= DAILY_FREE_LIMIT,
    resetsAt: '12:00 AM IST',
  };
};

/**
 * Express middleware to enforce daily AI query limit for free users.
 * Automatically refunds the credit if the downstream route fails (HTTP >= 400).
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

  if (currentUsed >= DAILY_FREE_LIMIT) {
    res.setHeader('X-Daily-Limit', DAILY_FREE_LIMIT);
    res.setHeader('X-Daily-Used', currentUsed);
    res.setHeader('X-Daily-Remaining', 0);
    return res.status(403).json({
      error: 'DAILY_AI_LIMIT_REACHED',
      message:
        "You've used all 5 free AI credits for today! Upgrade to StudySquad Pro (₹199/mo or ₹999/yr) for unlimited 24/7 AI Tutoring, Quiz & Flashcards, Viva Simulator, Document Summaries, and Code Audits.",
      upgradeRequired: true,
      dailyLimit: DAILY_FREE_LIMIT,
      used: currentUsed,
      remaining: 0,
    });
  }

  // Reserve 1 credit for this request
  const nextUsed = currentUsed + 1;
  dailyUsageMap.set(todayKey, nextUsed);
  res.setHeader('X-Daily-Limit', DAILY_FREE_LIMIT);
  res.setHeader('X-Daily-Used', nextUsed);
  res.setHeader('X-Daily-Remaining', Math.max(0, DAILY_FREE_LIMIT - nextUsed));

  // Refund credit automatically if validation fails or server returns an error
  let refunded = false;
  res.on('finish', () => {
    if (!refunded && res.statusCode >= 400) {
      refunded = true;
      const latest = dailyUsageMap.get(todayKey) || 0;
      if (latest > 0) {
        dailyUsageMap.set(todayKey, latest - 1);
      }
    }
  });

  return next();
};
