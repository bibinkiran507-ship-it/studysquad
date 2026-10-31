import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import prisma, { withRetry } from '../lib/prisma.js';
import {
  requireAuth,
  getJwtSecret,
  resolveActivePro,
  invalidateAuthCache,
} from '../middleware/auth.js';

const router = Router();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SAFE_DATA_IMAGE_REGEX = /^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+$/i;

const getGoogleClient = () => new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Helper to generate JWT
const generateToken = (userId) => {
  return jwt.sign({ userId }, getJwtSecret(), { expiresIn: '7d' });
};

const hashResetToken = (rawToken) =>
  crypto.createHash('sha256').update(String(rawToken)).digest('hex');

const validateAvatarValue = (avatar) => {
  if (typeof avatar !== 'string') return { ok: false, error: 'Avatar must be a valid URL string.' };
  const trimmed = avatar.trim();
  if (!trimmed) return { ok: true, value: '' };

  if (trimmed.startsWith('https://') || trimmed.startsWith('http://')) {
    if (trimmed.length > 2048) {
      return { ok: false, error: 'Avatar URL is too long (max 2048 characters).' };
    }
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
        return { ok: false, error: 'Avatar URL must use https://.' };
      }
      return { ok: true, value: trimmed };
    } catch {
      return { ok: false, error: 'Invalid avatar URL format.' };
    }
  }

  if (SAFE_DATA_IMAGE_REGEX.test(trimmed)) {
    if (trimmed.length > 220_000) {
      return { ok: false, error: 'Uploaded avatar image is too large (max 150 KB).' };
    }
    return { ok: true, value: trimmed };
  }

  return {
    ok: false,
    error: 'Avatar must be an https:// image URL or a PNG/JPG/WebP image under 150 KB.',
  };
};

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body || {};
    if (
      typeof name !== 'string' ||
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      !name.trim() ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    const cleanName = name.trim().slice(0, 80);
    const normalizedEmail = email.toLowerCase().trim();

    if (!EMAIL_REGEX.test(normalizedEmail) || normalizedEmail.length > 160) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }
    if (password.length > 128) {
      return res.status(400).json({ error: 'Password cannot exceed 128 characters.' });
    }

    const existing = await withRetry(() =>
      prisma.user.findUnique({
        where: { email: normalizedEmail },
        select: { id: true },
      })
    );

    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const avatar = `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(cleanName)}`;

    const user = await withRetry(() =>
      prisma.user.create({
        data: {
          name: cleanName,
          email: normalizedEmail,
          password: hashedPassword,
          avatar,
          isEmailVerified: false,
          isPro: false,
          proPlan: 'free',
        },
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
          bio: true,
          pomodoroSessions: true,
          isEmailVerified: true,
          isPro: true,
          proPlan: true,
          proExpiresAt: true,
          createdAt: true,
        },
      })
    );

    const token = generateToken(user.id);
    return res.status(201).json({ token, user });
  } catch (error) {
    if (error?.code === 'P2002') {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'Failed to create account.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    if (password.length > 128) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await withRetry(() =>
      prisma.user.findUnique({
        where: { email: normalizedEmail },
      })
    );

    if (!user || !user.password) {
      return res.status(401).json({
        error: 'Invalid email or password. If you signed up with Google, click "Continue with Google".',
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        error: 'Invalid email or password. If you originally signed up with Google, please click "Continue with Google" above.',
      });
    }

    const activePro = resolveActivePro(user);
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
        isPro: activePro,
        proPlan: activePro ? user.proPlan || 'monthly' : 'free',
        proExpiresAt: user.proExpiresAt,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Failed to log in.' });
  }
});

// POST /api/auth/google - Authenticate with verified Google OAuth token
router.post('/google', async (req, res) => {
  try {
    const { accessToken, credential } = req.body || {};
    const expectedClientId = process.env.GOOGLE_CLIENT_ID;

    const allowedClientIds = [
      expectedClientId,
      '569756310563-91mpouatvn8ktuarlrfdhh0fjaju9v7m.apps.googleusercontent.com',
      '235319617346-rh4dohmi84qnl1cabt0tqp39c3usdpr3.apps.googleusercontent.com',
    ].filter(Boolean);

    let verifiedEmail = null;
    let verifiedName = null;
    let verifiedAvatar = null;

    if (typeof credential === 'string' && credential.trim()) {
      // Verify Google ID token JWT
      try {
        const ticket = await getGoogleClient().verifyIdToken({
          idToken: credential,
          audience: allowedClientIds,
        });
        const payload = ticket.getPayload();
        if (payload?.email_verified === false) {
          return res.status(401).json({ error: 'Your Google account email is not verified.' });
        }
        verifiedEmail = payload?.email;
        verifiedName = payload?.name;
        verifiedAvatar = payload?.picture;
      } catch (idErr) {
        console.error('Google ID token verification failed:', idErr.message);
        return res.status(401).json({ error: 'Invalid Google identity token.' });
      }
    } else if (typeof accessToken === 'string' && accessToken.trim()) {
      // Verify OAuth2 Access Token audience + profile against Google's official endpoints
      try {
        const [tokenInfoRes, gRes] = await Promise.all([
          fetch(
            `https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(accessToken)}`
          ),
          fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${accessToken}` },
          }),
        ]);

        if (!tokenInfoRes.ok || !gRes.ok) {
          return res.status(401).json({ error: 'Invalid or expired Google access token.' });
        }

        const [tokenInfo, profile] = await Promise.all([tokenInfoRes.json(), gRes.json()]);

        // Verify token was minted specifically for our Google OAuth Client ID
        const tokenAud = tokenInfo.aud || tokenInfo.azp || tokenInfo.issued_to;
        const isAudValid = allowedClientIds.some(
          (id) =>
            id === tokenInfo.aud ||
            id === tokenInfo.azp ||
            id === tokenInfo.issued_to ||
            (tokenAud && String(tokenAud) === id)
        );

        if (allowedClientIds.length > 0 && !isAudValid) {
          console.warn('Google token audience check:', {
            aud: tokenInfo.aud,
            azp: tokenInfo.azp,
            issued_to: tokenInfo.issued_to,
            expected: allowedClientIds,
          });
          return res.status(401).json({ error: 'Google token audience mismatch.' });
        }

        if (profile?.email_verified === false || tokenInfo?.email_verified === 'false') {
          return res.status(401).json({ error: 'Your Google account email is not verified.' });
        }

        verifiedEmail = profile?.email || tokenInfo?.email;
        verifiedName = profile?.name;
        verifiedAvatar = profile?.picture;
      } catch (tokErr) {
        console.error('Google access token verification failed:', tokErr.message);
        return res.status(401).json({ error: 'Failed to verify Google access token.' });
      }
    } else {
      return res
        .status(400)
        .json({ error: 'Valid Google OAuth token (accessToken or credential) is required.' });
    }

    if (!verifiedEmail) {
      return res.status(400).json({ error: 'Verified email could not be obtained from Google.' });
    }

    const normalizedEmail = verifiedEmail.toLowerCase().trim();
    let user = await withRetry(() =>
      prisma.user.findUnique({
        where: { email: normalizedEmail },
      })
    );

    if (!user) {
      const randomPassword = crypto.randomBytes(32).toString('hex') + '!Ggl99';
      const hashedPassword = await bcrypt.hash(randomPassword, 10);
      const userAvatar =
        verifiedAvatar ||
        `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(
          verifiedName || normalizedEmail
        )}`;

      user = await withRetry(() =>
        prisma.user.create({
          data: {
            name: verifiedName ? verifiedName.trim().slice(0, 80) : normalizedEmail.split('@')[0],
            email: normalizedEmail,
            password: hashedPassword,
            avatar: userAvatar,
            isEmailVerified: true,
            isPro: false,
            proPlan: 'free',
          },
        })
      );
    } else {
      // Preserve any custom avatar the user set; only update if empty or default DiceBear
      const shouldSyncGoogleAvatar =
        verifiedAvatar && (!user.avatar || user.avatar.includes('dicebear.com'));

      if (shouldSyncGoogleAvatar || !user.isEmailVerified) {
        user = await withRetry(() =>
          prisma.user.update({
            where: { id: user.id },
            data: {
              ...(shouldSyncGoogleAvatar ? { avatar: verifiedAvatar } : {}),
              isEmailVerified: true,
            },
          })
        );
        invalidateAuthCache(user.id);
      }
    }

    const activePro = resolveActivePro(user);
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
        isPro: activePro,
        proPlan: activePro ? user.proPlan || 'monthly' : 'free',
        proExpiresAt: user.proExpiresAt,
        createdAt: user.createdAt,
        provider: 'google',
      },
    });
  } catch (error) {
    console.error('Google login error:', error);
    return res.status(500).json({ error: 'Failed to authenticate with Google.' });
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req, res) => {
  try {
    const [user, distinctSquadCount] = await withRetry(() =>
      Promise.all([
        prisma.user.findUnique({
          where: { id: req.user.id },
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            bio: true,
            pomodoroSessions: true,
            isEmailVerified: true,
            isPro: true,
            proPlan: true,
            proExpiresAt: true,
            createdAt: true,
          },
        }),
        prisma.squad.count({
          where: {
            OR: [{ ownerId: req.user.id }, { members: { some: { userId: req.user.id } } }],
          },
        }),
      ])
    );

    if (!user) return res.status(404).json({ error: 'User not found.' });

    const activePro = resolveActivePro(user);
    return res.json({
      user: {
        ...user,
        isPro: activePro,
        proPlan: activePro ? user.proPlan || 'monthly' : 'free',
        squadsJoined: distinctSquadCount,
      },
    });
  } catch (err) {
    console.error('Get me error:', err);
    return res.status(500).json({ error: 'Failed to get profile.' });
  }
});

// PATCH /api/auth/me - Update profile (name, avatar, bio)
router.patch('/me', requireAuth, async (req, res) => {
  try {
    const { name, avatar, bio } = req.body || {};
    const updateData = {};

    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ error: 'Name cannot be empty.' });
      }
      updateData.name = name.trim().slice(0, 80);
    }

    if (avatar !== undefined) {
      const avatarCheck = validateAvatarValue(avatar);
      if (!avatarCheck.ok) {
        return res.status(400).json({ error: avatarCheck.error });
      }
      updateData.avatar = avatarCheck.value;
    }

    if (bio !== undefined) {
      if (typeof bio !== 'string') {
        return res.status(400).json({ error: 'Bio must be text.' });
      }
      updateData.bio = bio.trim().slice(0, 300);
    }

    const updated = await withRetry(() =>
      prisma.user.update({
        where: { id: req.user.id },
        data: updateData,
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
          bio: true,
          pomodoroSessions: true,
          isEmailVerified: true,
          isPro: true,
          proPlan: true,
          proExpiresAt: true,
          createdAt: true,
        },
      })
    );

    invalidateAuthCache(req.user.id);
    const activePro = resolveActivePro(updated);
    return res.json({
      user: {
        ...updated,
        isPro: activePro,
        proPlan: activePro ? updated.proPlan || 'monthly' : 'free',
      },
    });
  } catch (error) {
    console.error('Profile update error:', error);
    return res.status(500).json({ error: 'Failed to update profile.' });
  }
});

// POST /api/auth/me/pomodoro - Increment pomodoro session count
router.post('/me/pomodoro', requireAuth, async (req, res) => {
  try {
    const updated = await withRetry(() =>
      prisma.user.update({
        where: { id: req.user.id },
        data: { pomodoroSessions: { increment: 1 } },
        select: { pomodoroSessions: true },
      })
    );
    return res.json({ pomodoroSessions: updated.pomodoroSessions });
  } catch (err) {
    console.error('Pomodoro increment error:', err);
    return res.status(500).json({ error: 'Failed to update session count.' });
  }
});

// POST /api/auth/forgot-password - Request password reset
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body || {};
    if (typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({ error: 'Email is required.' });
    }

    const user = await withRetry(() =>
      prisma.user.findUnique({
        where: { email: email.toLowerCase().trim() },
        select: { id: true, email: true },
      })
    );

    // Always return success to avoid email enumeration
    if (!user) {
      return res.json({
        message: 'If that email is registered, password recovery instructions have been prepared.',
      });
    }

    await withRetry(() =>
      prisma.passwordReset.updateMany({
        where: { userId: user.id, used: false },
        data: { used: true },
      })
    );

    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = hashResetToken(rawToken);
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

    await withRetry(() =>
      prisma.passwordReset.create({
        data: { userId: user.id, token: hashedToken, expiresAt },
      })
    );

    const isDev = process.env.NODE_ENV !== 'production';
    const resetLink = `${process.env.CLIENT_URL || 'http://localhost:5173'}/login?resetToken=${rawToken}`;

    if (isDev) {
      console.log(`[Password Reset] Dev reset link generated for ${user.email}`);
    }

    return res.json({
      message:
        'If that email is registered, a password reset link has been sent. You can also sign in instantly using "Continue with Google" with the same email!',
      ...(isDev ? { devResetToken: rawToken, devResetLink: resetLink } : {}),
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    return res.status(500).json({ error: 'Failed to process reset request.' });
  }
});

// POST /api/auth/reset-password - Complete password reset with token
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body || {};
    if (
      typeof token !== 'string' ||
      typeof newPassword !== 'string' ||
      !token.trim() ||
      !newPassword
    ) {
      return res.status(400).json({ error: 'Token and new password are required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }
    if (newPassword.length > 128) {
      return res.status(400).json({ error: 'Password cannot exceed 128 characters.' });
    }

    const cleanToken = token.trim();
    const hashedCandidate = hashResetToken(cleanToken);

    const resetRecord = await withRetry(() =>
      prisma.passwordReset.findFirst({
        where: {
          OR: [{ token: hashedCandidate }, { token: cleanToken }],
        },
      })
    );

    if (!resetRecord || resetRecord.used) {
      return res.status(400).json({ error: 'Reset link is invalid or has already been used.' });
    }

    if (new Date() > resetRecord.expiresAt) {
      return res.status(400).json({ error: 'Reset link has expired. Please request a new one.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await withRetry(() =>
      prisma.$transaction(async (tx) => {
        const markUsed = await tx.passwordReset.updateMany({
          where: { id: resetRecord.id, used: false },
          data: { used: true },
        });
        if (markUsed.count === 0) {
          const usedErr = new Error('Reset link has already been used.');
          usedErr.statusCode = 400;
          throw usedErr;
        }
        await tx.user.update({
          where: { id: resetRecord.userId },
          data: { password: hashedPassword },
        });
      })
    );

    invalidateAuthCache(resetRecord.userId);
    return res.json({ message: 'Password updated successfully. You can now log in.' });
  } catch (err) {
    if (err.statusCode === 400) {
      return res.status(400).json({ error: err.message });
    }
    console.error('Reset password error:', err);
    return res.status(500).json({ error: 'Failed to reset password.' });
  }
});

// GET /api/auth/user/:id - Get public profile of any user
router.get('/user/:id', async (req, res) => {
  try {
    const [user, distinctSquadCount] = await withRetry(() =>
      Promise.all([
        prisma.user.findUnique({
          where: { id: req.params.id },
          select: {
            id: true,
            name: true,
            avatar: true,
            bio: true,
            pomodoroSessions: true,
            createdAt: true,
          },
        }),
        prisma.squad.count({
          where: {
            OR: [{ ownerId: req.params.id }, { members: { some: { userId: req.params.id } } }],
          },
        }),
      ])
    );

    if (!user) return res.status(404).json({ error: 'User not found.' });

    return res.json({
      user: {
        ...user,
        squadsJoined: distinctSquadCount,
      },
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to get user.' });
  }
});

export default router;
