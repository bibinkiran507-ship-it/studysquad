import { Router } from 'express';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import prisma from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';

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

// Initialize Razorpay client helper
const getRazorpayInstance = () => {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;

  if (!key_id || !key_secret || key_id.includes('YOUR_')) {
    return null; // Test / Sandbox mode fallback
  }

  try {
    return new Razorpay({ key_id, key_secret });
  } catch (err) {
    console.error('Failed to initialize Razorpay instance:', err);
    return null;
  }
};

// POST /api/payment/create-order - Create Razorpay order
router.post('/create-order', requireAuth, async (req, res) => {
  try {
    const { plan = 'monthly' } = req.body;
    const selectedPlan = PLANS[plan];

    if (!selectedPlan) {
      return res.status(400).json({ error: 'Invalid plan selected. Choose monthly or yearly.' });
    }

    const rzp = getRazorpayInstance();
    if (!rzp) {
      return res.status(400).json({
        error: 'Razorpay payment gateway is not configured yet. Please add your RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in backend/.env to start accepting payments.',
        notConfigured: true,
      });
    }

    const keyId = process.env.RAZORPAY_KEY_ID;

    // Real Razorpay Order Creation
    const order = await rzp.orders.create({
      amount: selectedPlan.amount,
      currency: selectedPlan.currency,
      receipt: `rcpt_${req.user.id.slice(0, 8)}_${Date.now()}`,
      notes: {
        userId: req.user.id,
        userName: req.user.name,
        plan,
      },
    });
    const orderId = order.id;

    // Save payment order record in database
    await prisma.paymentOrder.create({
      data: {
        userId: req.user.id,
        orderId,
        amount: selectedPlan.amount,
        currency: selectedPlan.currency,
        plan,
        status: 'created',
      },
    });

    return res.json({
      orderId,
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
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      plan = 'monthly',
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing payment details or signature for verification.' });
    }

    const selectedPlan = PLANS[plan] || PLANS.monthly;
    const secret = process.env.RAZORPAY_KEY_SECRET;

    if (!secret || secret.includes('YOUR_')) {
      return res.status(400).json({ error: 'Razorpay gateway secret is not configured.' });
    }

    // Cryptographic signature verification
    const generatedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');
    const isValid = generatedSignature === razorpay_signature;

    if (!isValid) {
      // Mark order failed in DB
      await prisma.paymentOrder.updateMany({
        where: { orderId: razorpay_order_id },
        data: { status: 'failed' },
      });
      return res.status(400).json({ error: 'Payment signature verification failed.' });
    }

    // Calculate expiry date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + selectedPlan.days);

    // Update order status in DB
    await prisma.paymentOrder.updateMany({
      where: { orderId: razorpay_order_id },
      data: {
        paymentId: razorpay_payment_id || `pay_simulated_${Date.now()}`,
        signature: razorpay_signature || 'simulated_signature',
        status: 'paid',
      },
    });

    // Upgrade user to PRO in database
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        isPro: true,
        proPlan: plan,
        proExpiresAt: expiresAt,
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        bio: true,
        pomodoroSessions: true,
        isPro: true,
        proPlan: true,
        proExpiresAt: true,
      },
    });

    return res.json({
      success: true,
      message: '🎉 Congratulations! You are now a StudySquad Pro member!',
      user: updatedUser,
    });
  } catch (error) {
    console.error('Verify payment error:', error);
    return res.status(500).json({ error: 'Failed to verify payment.' });
  }
});

// GET /api/payment/status - Get current user subscription status
router.get('/status', requireAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        isPro: true,
        proPlan: true,
        proExpiresAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Check if membership has expired
    const isExpired = user.proExpiresAt && new Date(user.proExpiresAt) < new Date();
    const isPro = user.isPro && !isExpired;

    return res.json({
      isPro,
      plan: user.proPlan || 'free',
      expiresAt: user.proExpiresAt,
      isExpired,
    });
  } catch (error) {
    console.error('Get subscription status error:', error);
    return res.status(500).json({ error: 'Failed to fetch subscription status.' });
  }
});

export default router;
