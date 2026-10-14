import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import prisma from '../lib/prisma.js';
import { requireAuth, getJwtSecret } from '../middleware/auth.js';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const router = Router();

// Helper to generate JWT
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    getJwtSecret(),
    { expiresIn: '7d' }
  );
};

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const avatar = `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name)}`;

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        avatar,
        isEmailVerified: false,
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        bio: true,
        pomodoroSessions: true,
        isEmailVerified: true,
        createdAt: true
      }
    });

    const token = generateToken(user.id);
    return res.status(201).json({ token, user });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'Failed to create account.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = generateToken(user.id);
    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        bio: user.bio,
        pomodoroSessions: user.pomodoroSessions,
        isEmailVerified: user.isEmailVerified,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Failed to log in.' });
  }
});

// POST /api/auth/google - Authenticate with verified Google OAuth token
router.post('/google', async (req, res) => {
  try {
    const { accessToken, credential } = req.body;

    let verifiedEmail = null;
    let verifiedName = null;
    let verifiedAvatar = null;

    if (credential) {
      // Verify Google ID token JWT
      try {
        const ticket = await googleClient.verifyIdToken({
          idToken: credential,
          audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        verifiedEmail = payload?.email;
        verifiedName = payload?.name;
        verifiedAvatar = payload?.picture;
      } catch (idErr) {
        console.error('Google ID token verification failed:', idErr.message);
        return res.status(401).json({ error: 'Invalid Google identity token.' });
      }
    } else if (accessToken) {
      // Verify OAuth2 Access Token against Google's API
      try {
        const gRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!gRes.ok) {
          return res.status(401).json({ error: 'Invalid or expired Google access token.' });
        }
        const profile = await gRes.json();
        verifiedEmail = profile?.email;
        verifiedName = profile?.name;
        verifiedAvatar = profile?.picture;
      } catch (tokErr) {
        console.error('Google access token verification failed:', tokErr.message);
        return res.status(401).json({ error: 'Failed to verify Google access token.' });
      }
    } else {
      return res.status(400).json({ error: 'Valid Google OAuth token (accessToken or credential) is required.' });
    }

    if (!verifiedEmail) {
      return res.status(400).json({ error: 'Verified email could not be obtained from Google.' });
    }

    const normalizedEmail = verifiedEmail.toLowerCase().trim();
    let user = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (!user) {
      const randomPassword = crypto.randomBytes(32).toString('hex') + '!Ggl99';
      const hashedPassword = await bcrypt.hash(randomPassword, 10);
      const userAvatar = verifiedAvatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(verifiedName || normalizedEmail)}`;

      user = await prisma.user.create({
        data: {
          name: verifiedName ? verifiedName.trim() : normalizedEmail.split('@')[0],
          email: normalizedEmail,
          password: hashedPassword,
          avatar: userAvatar,
          isEmailVerified: true, // Google accounts are pre-verified
        },
      });
    } else if (verifiedAvatar && (!user.avatar || user.avatar.includes('dicebear'))) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { avatar: verifiedAvatar, isEmailVerified: true },
      });
    }

    const token = generateToken(user.id);
    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        bio: user.bio || '',
        pomodoroSessions: user.pomodoroSessions || 0,
        isEmailVerified: user.isEmailVerified,
        createdAt: user.createdAt,
        provider: 'google',
      }
    });
  } catch (error) {
    console.error('Google login error:', error);
    return res.status(500).json({ error: 'Failed to authenticate with Google.' });
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req, res) => {
  try {
    // Fetch fresh user data with squad count
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        bio: true,
        pomodoroSessions: true,
        isEmailVerified: true,
        createdAt: true,
        _count: {
          select: { memberships: true, ownedSquads: true }
        }
      }
    });

    if (!user) return res.status(404).json({ error: 'User not found.' });

    return res.json({
      user: {
        ...user,
        squadsJoined: user._count.memberships + user._count.ownedSquads,
      }
    });
  } catch (err) {
    console.error('Get me error:', err);
    return res.status(500).json({ error: 'Failed to get profile.' });
  }
});

// PATCH /api/auth/me - Update profile (name, avatar, bio)
router.patch('/me', requireAuth, async (req, res) => {
  try {
    const { name, avatar, bio } = req.body;
    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        ...(name ? { name: name.trim() } : {}),
        ...(avatar !== undefined ? { avatar } : {}),
        ...(bio !== undefined ? { bio: bio.slice(0, 300) } : {})
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        bio: true,
        pomodoroSessions: true,
        isEmailVerified: true,
        createdAt: true
      }
    });

    return res.json({ user: updated });
  } catch (error) {
    console.error('Profile update error:', error);
    return res.status(500).json({ error: 'Failed to update profile.' });
  }
});

// POST /api/auth/me/pomodoro - Increment pomodoro session count
router.post('/me/pomodoro', requireAuth, async (req, res) => {
  try {
    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: { pomodoroSessions: { increment: 1 } },
      select: { pomodoroSessions: true }
    });
    return res.json({ pomodoroSessions: updated.pomodoroSessions });
  } catch (err) {
    console.error('Pomodoro increment error:', err);
    return res.status(500).json({ error: 'Failed to update session count.' });
  }
});

// POST /api/auth/forgot-password - Request password reset
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required.' });

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() }
    });

    // Always return success to avoid email enumeration
    if (!user) {
      return res.json({ message: 'If that email is registered, a reset link has been sent.' });
    }

    // Invalidate any existing unused tokens
    await prisma.passwordReset.updateMany({
      where: { userId: user.id, used: false },
      data: { used: true }
    });

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

    await prisma.passwordReset.create({
      data: { userId: user.id, token, expiresAt }
    });

    // In production, send email. For now, return the token in response (dev mode)
    const isDev = process.env.NODE_ENV !== 'production';
    const resetLink = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password?token=${token}`;

    console.log(`[Password Reset] Token for ${user.email}: ${token}`);

    return res.json({
      message: 'If that email is registered, a reset link has been sent.',
      ...(isDev ? { devResetToken: token, devResetLink: resetLink } : {})
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    return res.status(500).json({ error: 'Failed to process reset request.' });
  }
});

// POST /api/auth/reset-password - Complete password reset with token
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    const resetRecord = await prisma.passwordReset.findUnique({
      where: { token },
      include: { user: true }
    });

    if (!resetRecord || resetRecord.used) {
      return res.status(400).json({ error: 'Reset link is invalid or has already been used.' });
    }

    if (new Date() > resetRecord.expiresAt) {
      return res.status(400).json({ error: 'Reset link has expired. Please request a new one.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: resetRecord.userId },
      data: { password: hashedPassword }
    });

    await prisma.passwordReset.update({
      where: { token },
      data: { used: true }
    });

    return res.json({ message: 'Password updated successfully. You can now log in.' });
  } catch (err) {
    console.error('Reset password error:', err);
    return res.status(500).json({ error: 'Failed to reset password.' });
  }
});

// GET /api/auth/user/:id - Get public profile of any user
router.get('/user/:id', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        name: true,
        avatar: true,
        bio: true,
        pomodoroSessions: true,
        createdAt: true,
        _count: {
          select: { memberships: true, ownedSquads: true }
        }
      }
    });

    if (!user) return res.status(404).json({ error: 'User not found.' });

    return res.json({
      user: {
        ...user,
        squadsJoined: user._count.memberships + user._count.ownedSquads,
      }
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to get user.' });
  }
});

export default router;
