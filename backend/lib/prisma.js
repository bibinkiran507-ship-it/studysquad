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

globalForPrisma.prisma = prisma;

/**
 * Checks whether an error is a transient database connection / Neon wake-up error.
 * Never matches application, validation, or constraint errors.
 */
export function isTransientDbError(err) {
  if (!err) return false;
  const msg = String(err.message || '');
  return (
    err.name === 'PrismaClientInitializationError' ||
    err.name === 'PrismaClientRustPanicError' ||
    err.code === 'P1001' || // Can't reach DB server
    err.code === 'P1002' || // DB server timed out
    err.code === 'P1008' || // Operations timed out
    err.code === 'P1017' || // Server has closed the connection
    msg.includes("Can't reach database") ||
    msg.includes('Connection refused') ||
    msg.includes('connection timeout') ||
    msg.includes('Connection terminated') ||
    msg.includes('Server has closed the connection') ||
    msg.includes('ECONNREFUSED') ||
    msg.includes('ECONNRESET')
  );
}

/**
 * Wraps a Prisma query with automatic retry on transient connection errors.
 * Neon cold-starts can cause the first query to fail — this retries up to 3x
 * WITHOUT disconnecting the shared Prisma pool used by concurrent requests.
 * @param {Function} queryFn - async function that performs the Prisma query
 * @param {number} retries - number of retry attempts (default: 3)
 */
export async function withRetry(queryFn, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await queryFn();
    } catch (err) {
      if (isTransientDbError(err) && attempt < retries) {
        const delay = attempt * 1200; // 1.2s, 2.4s between retries
        console.log(`[DB] Neon waking up... retry ${attempt}/${retries - 1} in ${delay}ms`);
        await new Promise((r) => setTimeout(r, delay));

        try {
          await prisma.$connect();
        } catch (_) {
          // ignore connect errors during retry; next queryFn() attempt will retry pool connect
        }
      } else {
        throw err;
      }
    }
  }
}

export default prisma;

