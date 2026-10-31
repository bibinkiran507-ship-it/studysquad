import { Router } from 'express';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import prisma, { withRetry } from '../lib/prisma.js';
import { requireAuth, invalidateAuthCache, resolveActivePro } from '../middleware/auth.js';

const router = Router();

// Plan pricing definitions (in INR paise: 100 paise = 1 Rupee)
export const PLANS = {
  monthly: {
    name: 'StudySquad Pro (Monthly)',
    amount: 19900, // Rs 199
    currency: 'INR',
    days: 30,
  },
  yearly: {
    name: 'StudySquad Pro (Yearly)',
    amount: 99900, // Rs 999
    currency: 'INR',
    days: 365,
  },
};

const USER_PUBLIC_SELECT = {
  id: true,
  name: true,
  email: true,
  avatar: true,
  bio: true,
  pomodoroSessions: true,
  isPro: true,
  proPlan: true,
  proExpiresAt: true,
};

// Cached singleton Razorpay client
let cachedRazorpay = null;
let cachedKeyId = null;

const getRazorpayInstance = () => {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;

  if (!key_id || !key_secret || key_id.includes('YOUR_')) {
    return null;
  }

  if (cachedRazorpay && cachedKeyId === key_id) {
    return cachedRazorpay;
  }

  try {
    cachedRazorpay = new Razorpay({ key_id, key_secret });
    cachedKeyId = key_id;
    return cachedRazorpay;
  } catch (err) {
    console.error('Failed to initialize Razorpay instance:', err);
    return null;
  }
};

// Constant-time hex HMAC comparison
const verifyHmacHex = (expectedHex, providedHex) => {
  if (typeof expectedHex !== 'string' || typeof providedHex !== 'string') return false;
  if (expectedHex.length !== providedHex.length) return false;
  try {
    const a = Buffer.from(expectedHex, 'hex');
    const b = Buffer.from(providedHex, 'hex');
    if (a.length === 0 || a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
};

/**
 * Atomically marks a PaymentOrder as paid and stacks Pro membership days onto the order owner's account.
 * Strictly uses `order.plan` and `order.userId` from PostgreSQL (never trusts client request body).
 * Safe against concurrent calls from browser verify, webhook, and auto-reconcile.
 */
async function activateProOrder({ order, paymentId, signature }) {
  const planKey = PLANS[order.plan] ? order.plan : 'monthly';
  const planSpec = PLANS[planKey];
  const now = new Date();

  const result = await withRetry(() =>
    prisma.$transaction(async (tx) => {
      // Ensure this paymentId was never redeemed on a different order
      if (paymentId) {
        const duplicatePayment = await tx.paymentOrder.findFirst({
          where: {
            paymentId,
            status: 'paid',
            NOT: { id: order.id },
          },
          select: { id: true },
        });
        if (duplicatePayment) {
          const dupErr = new Error('This payment ID has already been redeemed.');
          dupErr.statusCode = 400;
          throw dupErr;
        }
      }

      // Atomic compare-and-swap: only the first caller transitions status -> 'paid'
      const claim = await tx.paymentOrder.updateMany({
        where: {
          id: order.id,
          status: { not: 'paid' },
        },
        data: {
          paymentId: paymentId || order.paymentId || '',
          signature: signature || order.signature || '',
          status: 'paid',
          paidAt: now,
        },
      });

      const currentUser = await tx.user.findUnique({
        where: { id: order.userId },
        select: USER_PUBLIC_SELECT,
      });

      if (!currentUser) {
        const userErr = new Error('Order user account not found.');
        userErr.statusCode = 404;
        throw userErr;
      }

      // Idempotent path: another concurrent call (e.g., webhook vs browser) already activated this order
      if (claim.count === 0) {
        return { user: currentUser, alreadyActivated: true };
      }

      // Stack days onto existing unexpired Pro validity so early renewals NEVER lose remaining days
      const hasUnexpiredPro =
        currentUser.isPro &&
        currentUser.proExpiresAt &&
        new Date(currentUser.proExpiresAt) > now;

      const baseDate = hasUnexpiredPro ? new Date(currentUser.proExpiresAt) : now;
      const expiresAt = new Date(baseDate.getTime() + planSpec.days * 24 * 60 * 60 * 1000);

      // Preserve 'yearly' badge if an active yearly member adds a monthly top-up
      const effectivePlan =
        hasUnexpiredPro && currentUser.proPlan === 'yearly' ? 'yearly' : planKey;

      const updatedUser = await tx.user.update({
        where: { id: order.userId },
        data: {
          isPro: true,
          proPlan: effectivePlan,
          proExpiresAt: expiresAt,
        },
        select: USER_PUBLIC_SELECT,
      });

      return { user: updatedUser, alreadyActivated: false };
    })
  );

  invalidateAuthCache(order.userId);
  return result;
}

/**
 * Queries Razorpay's Orders Payments API for any pending ('created') orders from the last 7 days.
 * Automatically recovers UPI payments where the student's mobile tab reloaded during GPay/PhonePe app-switch.
 */
async function reconcilePendingOrdersForUser(userId) {
  const rzp = getRazorpayInstance();
  if (!rzp || !userId) return { recovered: 0, user: null };

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const pendingOrders = await withRetry(() =>
    prisma.paymentOrder.findMany({
      where: {
        userId,
        status: 'created',
        createdAt: { gte: sevenDaysAgo },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    })
  );

  if (pendingOrders.length === 0) {
    return { recovered: 0, user: null };
  }

  let recovered = 0;
  let latestUser = null;

  for (const pendingOrder of pendingOrders) {
    try {
      const paymentsResp = await rzp.orders.fetchPayments(pendingOrder.orderId);
      const items = Array.isArray(paymentsResp?.items) ? paymentsResp.items : [];
      const capturedPayment = items.find(
        (p) => p.status === 'captured' && Number(p.amount) >= pendingOrder.amount
      );

      if (capturedPayment) {
        const activation = await activateProOrder({
          order: pendingOrder,
          paymentId: capturedPayment.id,
          signature: 'razorpay_api_verified',
        });
        if (!activation.alreadyActivated) {
          recovered += 1;
        }
        latestUser = activation.user;
      }
    } catch (err) {
      // Non-fatal: skip individual Razorpay lookup failures smoothly
      console.warn(`[Payment Reconcile] Lookup skipped for ${pendingOrder.orderId}:`, err.message);
    }
  }

  return { recovered, user: latestUser };
}

// POST /api/payment/create-order - Create Razorpay order
router.post('/create-order', requireAuth, async (req, res) => {
  try {
    const { plan = 'monthly' } = req.body || {};
    const selectedPlan = PLANS[plan];

    if (!selectedPlan) {
      return res.status(400).json({ error: 'Invalid plan selected. Choose monthly or yearly.' });
    }

    const rzp = getRazorpayInstance();
    if (!rzp) {
      return res.status(400).json({
        error: 'Payment gateway is temporarily unavailable. Please try again shortly.',
        notConfigured: true,
      });
    }

    const keyId = process.env.RAZORPAY_KEY_ID;
    const receipt = `rcpt_${req.user.id.slice(0, 8)}_${Date.now()}`;

    const order = await rzp.orders.create({
      amount: selectedPlan.amount,
      currency: selectedPlan.currency,
      receipt,
      notes: {
        userId: req.user.id,
        userName: req.user.name,
        plan,
      },
    });
    const orderId = order.id;

    await withRetry(() =>
      prisma.paymentOrder.create({
        data: {
          userId: req.user.id,
          orderId,
          receipt,
          amount: selectedPlan.amount,
          currency: selectedPlan.currency,
          plan,
          status: 'created',
        },
      })
    );

    return res.json({
      orderId,
      receipt,
      amount: selectedPlan.amount,
      currency: selectedPlan.currency,
      keyId,
      plan,
      planName: selectedPlan.name,
    });
  } catch (error) {
    console.error('Create payment order error:', error);
    return res.status(500).json({ error: 'Failed to create payment order. Please try again.' });
  }
});

// POST /api/payment/verify-payment - Verify payment signature and activate Pro
router.post('/verify-payment', requireAuth, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};

    if (
      typeof razorpay_order_id !== 'string' ||
      typeof razorpay_payment_id !== 'string' ||
      typeof razorpay_signature !== 'string' ||
      !razorpay_order_id.trim() ||
      !razorpay_payment_id.trim() ||
      !razorpay_signature.trim()
    ) {
      return res.status(400).json({ error: 'Missing payment details or signature for verification.' });
    }

    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret || secret.includes('YOUR_')) {
      return res.status(400).json({ error: 'Payment verification is currently unavailable.' });
    }

    // Look up authoritative order record from PostgreSQL
    const order = await withRetry(() =>
      prisma.paymentOrder.findUnique({
        where: { orderId: razorpay_order_id.trim() },
      })
    );

    if (!order || order.userId !== req.user.id) {
      return res.status(403).json({
        error: 'This payment order does not belong to your account.',
      });
    }

    // Cryptographic HMAC-SHA256 verification (constant-time)
    const generatedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${order.orderId}|${razorpay_payment_id.trim()}`)
      .digest('hex');

    const isValid = verifyHmacHex(generatedSignature, razorpay_signature.trim());

    if (!isValid) {
      // Only mark 'created' orders owned by this user as failed; never corrupt an already-paid order
      await withRetry(() =>
        prisma.paymentOrder.updateMany({
          where: {
            id: order.id,
            userId: req.user.id,
            status: 'created',
          },
          data: { status: 'failed' },
        })
      );
      return res.status(400).json({ error: 'Payment signature verification failed.' });
    }

    // Idempotent handling if this exact order + payment was already activated (e.g., via webhook)
    if (order.status === 'paid') {
      if (order.paymentId && order.paymentId !== razorpay_payment_id.trim()) {
        return res.status(400).json({ error: 'This payment order has already been fulfilled.' });
      }
      const existingUser = await withRetry(() =>
        prisma.user.findUnique({
          where: { id: req.user.id },
          select: USER_PUBLIC_SELECT,
        })
      );
      return res.json({
        success: true,
        alreadyActivated: true,
        message: '🎉 Your StudySquad Pro membership is active!',
        user: existingUser,
      });
    }

    const { user: updatedUser } = await activateProOrder({
      order,
      paymentId: razorpay_payment_id.trim(),
      signature: razorpay_signature.trim(),
    });

    return res.json({
      success: true,
      message: '🎉 Congratulations! You are now a StudySquad Pro member!',
      user: updatedUser,
    });
  } catch (error) {
    console.error('Verify payment error:', error);
    const status = error.statusCode || 500;
    return res.status(status).json({
      error: status < 500 ? error.message : 'Failed to verify payment. Tap "Restore Payment" to auto-sync.',
    });
  }
});

// POST /api/payment/webhook - Official Razorpay Server-to-Server Webhook (payment.captured / order.paid)
router.post('/webhook', async (req, res) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers['x-razorpay-signature'];

    if (!webhookSecret) {
      return res.status(200).json({ received: true, note: 'Webhook secret not configured' });
    }

    if (!signature || !req.rawBody) {
      return res.status(400).json({ error: 'Missing webhook signature or raw payload.' });
    }

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(req.rawBody)
      .digest('hex');

    if (!verifyHmacHex(expectedSignature, String(signature))) {
      return res.status(400).json({ error: 'Invalid webhook signature.' });
    }

    const eventType = req.body?.event;
    if (eventType === 'payment.captured' || eventType === 'order.paid') {
      const paymentEntity = req.body?.payload?.payment?.entity;
      const orderEntity = req.body?.payload?.order?.entity;
      const rzpOrderId = paymentEntity?.order_id || orderEntity?.id;
      const rzpPaymentId = paymentEntity?.id || '';
      const paidAmount = Number(paymentEntity?.amount || orderEntity?.amount_paid || 0);

      if (rzpOrderId) {
        const order = await withRetry(() =>
          prisma.paymentOrder.findUnique({
            where: { orderId: rzpOrderId },
          })
        );

        if (order && paidAmount >= order.amount) {
          await activateProOrder({
            order,
            paymentId: rzpPaymentId,
            signature: 'razorpay_webhook_verified',
          });
        }
      }
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('Razorpay webhook error:', err);
    return res.status(500).json({ error: 'Webhook processing failed.' });
  }
});

// POST /api/payment/reconcile - 1-click "Paid via UPI? Check / Restore Pro Status"
router.post('/reconcile', requireAuth, async (req, res) => {
  try {
    const { recovered, user: reconciledUser } = await reconcilePendingOrdersForUser(req.user.id);

    const freshUser =
      reconciledUser ||
      (await withRetry(() =>
        prisma.user.findUnique({
          where: { id: req.user.id },
          select: USER_PUBLIC_SELECT,
        })
      ));

    const isPro = resolveActivePro(freshUser);

    return res.json({
      success: true,
      recovered,
      isPro,
      user: freshUser ? { ...freshUser, isPro } : null,
      message:
        recovered > 0
          ? '🎉 Found your captured UPI payment and activated StudySquad Pro!'
          : isPro
          ? '✅ Your StudySquad Pro membership is active!'
          : 'No unactivated captured payments were found on Razorpay yet. If money was debited, wait 30 seconds and check again.',
    });
  } catch (err) {
    console.error('Reconcile payment error:', err);
    return res.status(500).json({ error: 'Could not check pending payments right now.' });
  }
});

// GET /api/payment/history - Retrieve paid receipts for the logged-in user
router.get('/history', requireAuth, async (req, res) => {
  try {
    const orders = await withRetry(() =>
      prisma.paymentOrder.findMany({
        where: {
          userId: req.user.id,
          status: 'paid',
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          orderId: true,
          paymentId: true,
          receipt: true,
          amount: true,
          currency: true,
          plan: true,
          status: true,
          paidAt: true,
          createdAt: true,
        },
      })
    );

    return res.json({ orders });
  } catch (err) {
    console.error('Get payment history error:', err);
    return res.status(500).json({ error: 'Failed to load payment receipts.' });
  }
});

// GET /api/payment/status - Get current user subscription status (auto-recovers pending UPI orders)
router.get('/status', requireAuth, async (req, res) => {
  try {
    let user = await withRetry(() =>
      prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          isPro: true,
          proPlan: true,
          proExpiresAt: true,
        },
      })
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    let isExpired = Boolean(user.proExpiresAt && new Date(user.proExpiresAt) < new Date());
    let isPro = Boolean(user.isPro && !isExpired);

    // If user currently shows as Free, automatically check if any recent Razorpay UPI order was captured
    if (!isPro) {
      const { recovered, user: recoveredUser } = await reconcilePendingOrdersForUser(req.user.id);
      if (recovered > 0 && recoveredUser) {
        user = recoveredUser;
        isExpired = Boolean(user.proExpiresAt && new Date(user.proExpiresAt) < new Date());
        isPro = Boolean(user.isPro && !isExpired);
      }
    }

    return res.json({
      isPro,
      plan: isPro ? user.proPlan || 'monthly' : 'free',
      expiresAt: user.proExpiresAt,
      isExpired,
    });
  } catch (error) {
    console.error('Get subscription status error:', error);
    return res.status(500).json({ error: 'Failed to fetch subscription status.' });
  }
});

// POST /api/payment/dev-activate-pro - Developer test activation toggle (non-production only)
router.post('/dev-activate-pro', requireAuth, async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({
      error: 'Developer test activation is disabled in production.',
    });
  }
  try {
    const isCurrentlyPro = req.user.isPro;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const updatedUser = await withRetry(() =>
      prisma.user.update({
        where: { id: req.user.id },
        data: {
          isPro: !isCurrentlyPro,
          proPlan: !isCurrentlyPro ? 'monthly' : 'free',
          proExpiresAt: !isCurrentlyPro ? expiresAt : null,
        },
        select: USER_PUBLIC_SELECT,
      })
    );

    invalidateAuthCache(req.user.id);
    return res.json({ success: true, user: updatedUser, isPro: updatedUser.isPro });
  } catch (err) {
    console.error('Dev activate pro error:', err);
    return res.status(500).json({ error: 'Failed to toggle Pro status.' });
  }
});

export default router;
