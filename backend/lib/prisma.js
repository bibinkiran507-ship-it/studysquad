import { PrismaClient } from '@prisma/client';

// ─── Neon Auto-Suspend Reconnect Logic ───────────────────────────────────────
// Neon free tier suspends after ~5 min of inactivity.
// This wrapper auto-reconnects on any connection error with retries.
// ─────────────────────────────────────────────────────────────────────────────

const globalForPrisma = globalThis;

const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: [], // suppress verbose logs in production
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

/**
 * Wraps a Prisma query with automatic retry on connection errors.
 * Neon cold-starts can cause the first query to fail — this retries up to 3x.
 * @param {Function} queryFn - async function that performs the Prisma query
 * @param {number} retries - number of retry attempts (default: 3)
 */
export async function withRetry(queryFn, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await queryFn();
    } catch (err) {
      const isConnectionErr =
        err.message?.includes("Can't reach database") ||
        err.message?.includes('Connection refused') ||
        err.message?.includes('connection timeout') ||
        err.message?.includes('ECONNREFUSED') ||
        err.code === 'P1001' || // Prisma "Can't reach DB server"
        err.code === 'P1002' || // Prisma "DB server timed out"
        err.code === 'P1008' || // Prisma "Operations timed out"
        err.errorCode === undefined; // PrismaClientInitializationError pattern

      if (isConnectionErr && attempt < retries) {
        const delay = attempt * 1500; // 1.5s, 3s between retries
        console.log(`[DB] Neon waking up... retry ${attempt}/${retries - 1} in ${delay}ms`);
        await new Promise((r) => setTimeout(r, delay));

        // Force Prisma to reconnect
        try {
          await prisma.$disconnect();
          await prisma.$connect();
        } catch (_) {
          // ignore disconnect/connect errors during retry
        }
      } else {
        throw err;
      }
    }
  }
}

export default prisma;

