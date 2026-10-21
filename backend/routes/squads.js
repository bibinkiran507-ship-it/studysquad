import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import prisma from '../lib/prisma.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';

import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Setup local uploads storage for slide decks, lecture notes, and PDFs
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `${baseName}-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 30 * 1024 * 1024 }, // 30 MB max
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.ppt', '.pptx', '.doc', '.docx', '.txt', '.png', '.jpg', '.jpeg'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Supported formats: PDF, PPT, PPTX, DOC, DOCX, Images, or TXT.'));
    }
  }
});

const router = Router();

// GET /api/squads - List all squads
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { category, search } = req.query;

    const where = {};
    if (category && category !== 'All' && category !== 'All Squads') {
      where.category = category;
    }
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { subject: { contains: search } },
        { description: { contains: search } },
        { category: { contains: search } }
      ];
    }

    const squads = await prisma.squad.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        owner: {
          select: { id: true, name: true, avatar: true }
        },
        members: {
          include: {
            user: {
              select: { id: true, name: true, avatar: true }
            }
          }
        },
        tasks: {
          orderBy: { createdAt: 'asc' }
        },
        _count: {
          select: { members: true, messages: true }
        }
      }
    });

    const currentUserId = req.user?.id;

    // Transform squads to include memberCount and isJoined for current user
    const formattedSquads = squads.map((squad) => {
      const isJoined = currentUserId
        ? squad.members.some((m) => m.userId === currentUserId)
        : false;

      return {
        id: squad.id,
        name: squad.name,
        category: squad.category,
        subject: squad.subject,
        description: squad.description,
        platform: squad.platform,
        meetingUrl: squad.meetingUrl || '',
        schedule: squad.schedule,
        maxMembers: squad.maxMembers,
        bannerGradient: squad.bannerGradient,
        owner: squad.owner,
        memberCount: squad.members.length,
        members: squad.members.map((m) => m.user),
        tasks: squad.tasks,
        isJoined,
        createdAt: squad.createdAt
      };
    });

    return res.json({ squads: formattedSquads });
  } catch (error) {
    console.error('Fetch squads error:', error);
    return res.status(500).json({ error: 'Failed to fetch squads.' });
  }
});

// GET /api/squads/:id - Get squad detail
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const squad = await prisma.squad.findUnique({
      where: { id },
      include: {
        owner: {
          select: { id: true, name: true, avatar: true }
        },
        members: {
          include: {
            user: {
              select: { id: true, name: true, avatar: true }
            }
          }
        },
        tasks: {
          orderBy: { createdAt: 'asc' }
        },
        resources: {
          orderBy: { createdAt: 'desc' },
          include: {
            createdBy: {
              select: { id: true, name: true, avatar: true }
            }
          }
        },
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 50,
          include: {
            user: {
              select: { id: true, name: true, avatar: true }
            }
          }
        }
      }
    });

    if (!squad) {
      return res.status(404).json({ error: 'Squad not found.' });
    }

    const currentUserId = req.user?.id;
    const isJoined = currentUserId
      ? squad.members.some((m) => m.userId === currentUserId)
      : false;

    return res.json({
      squad: {
        ...squad,
        sharedNotes: squad.sharedNotes || '',
        resources: squad.resources || [],
        memberCount: squad.members.length,
        members: squad.members.map((m) => m.user),
        isJoined
      }
    });
  } catch (error) {
    console.error('Fetch squad detail error:', error);
    return res.status(500).json({ error: 'Failed to fetch squad details.' });
  }
});

// POST /api/squads - Create new squad
router.post('/', requireAuth, async (req, res) => {
  try {
    const {
      name,
      category,
      subject,
      description,
      platform = 'Discord',
      meetingUrl = '',
      schedule = 'Mon, Wed, Fri • 8:00 PM EST',
      maxMembers = 6,
      bannerGradient
    } = req.body;

    if (!name || !category || !subject) {
      return res.status(400).json({ error: 'Name, category, and subject are required.' });
    }

    // Default gradients if not provided
    const gradients = [
      'from-cyan-500/30 to-blue-600/30',
      'from-emerald-500/30 to-teal-600/30',
      'from-purple-500/30 to-pink-600/30',
      'from-amber-500/30 to-orange-600/30',
      'from-indigo-500/30 to-violet-600/30',
      'from-rose-500/30 to-red-600/30'
    ];
    const chosenGradient = bannerGradient || gradients[Math.floor(Math.random() * gradients.length)];

    const squad = await prisma.squad.create({
      data: {
        name: name.trim(),
        category: category.trim(),
        subject: subject.trim(),
        description: description?.trim() || `Collaborative study squad for ${subject.trim()}.`,
        platform,
        meetingUrl: meetingUrl ? meetingUrl.trim() : '',
        schedule,
        maxMembers: Number(maxMembers) || 6,
        bannerGradient: chosenGradient,
        ownerId: req.user.id,
        members: {
          create: {
            userId: req.user.id
          }
        },
        // Create initial kick-off tasks
        tasks: {
          create: [
            { text: `Welcome to ${name.trim()}! Introduce yourself in chat`, completed: false, createdById: req.user.id },
            { text: `Review upcoming study milestones for ${subject.trim()}`, completed: false, createdById: req.user.id }
          ]
        }
      },
      include: {
        owner: {
          select: { id: true, name: true, avatar: true }
        },
        members: {
          include: {
            user: {
              select: { id: true, name: true, avatar: true }
            }
          }
        },
        tasks: true
      }
    });

    return res.status(201).json({
      squad: {
        ...squad,
        memberCount: 1,
        members: squad.members.map((m) => m.user),
        isJoined: true
      }
    });
  } catch (error) {
    console.error('Create squad error:', error);
    return res.status(500).json({ error: 'Failed to create squad.' });
  }
});

// POST /api/squads/:id/join - Join a squad
router.post('/:id/join', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const squad = await prisma.squad.findUnique({
      where: { id },
      include: { members: true }
    });

    if (!squad) {
      return res.status(404).json({ error: 'Squad not found.' });
    }

    const alreadyJoined = squad.members.some((m) => m.userId === req.user.id);
    if (alreadyJoined) {
      return res.status(400).json({ error: 'You are already a member of this squad.' });
    }

    // Squads are completely open with unlimited capacity - anyone can join!
    await prisma.squadMember.create({
      data: {
        squadId: id,
        userId: req.user.id
      }
    });

    // Also record a system join message
    await prisma.message.create({
      data: {
        squadId: id,
        userId: req.user.id,
        content: `🎉 ${req.user.name} joined the squad!`
      }
    });

    const updatedSquad = await prisma.squad.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, name: true, avatar: true } },
        members: { include: { user: { select: { id: true, name: true, avatar: true } } } },
        tasks: true
      }
    });

    return res.json({
      message: 'Successfully joined squad!',
      squad: {
        ...updatedSquad,
        memberCount: updatedSquad.members.length,
        members: updatedSquad.members.map((m) => m.user),
        isJoined: true
      }
    });
  } catch (error) {
    console.error('Join squad error:', error);
    return res.status(500).json({ error: 'Failed to join squad.' });
  }
});

// POST /api/squads/:id/leave - Leave a squad
router.post('/:id/leave', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.squadMember.deleteMany({
      where: {
        squadId: id,
        userId: req.user.id
      }
    });

    return res.json({ message: 'Successfully left squad.' });
  } catch (error) {
    console.error('Leave squad error:', error);
    return res.status(500).json({ error: 'Failed to leave squad.' });
  }
});

// PATCH /api/squads/:id - Update squad settings (owner only, e.g. meetingUrl, platform, schedule, description)
router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { meetingUrl, platform, schedule, description, name } = req.body;

    const squad = await prisma.squad.findUnique({ where: { id } });
    if (!squad) {
      return res.status(404).json({ error: 'Squad not found.' });
    }

    if (squad.ownerId !== req.user.id) {
      return res.status(403).json({ error: 'Only the squad owner can update squad settings.' });
    }

    const updated = await prisma.squad.update({
      where: { id },
      data: {
        ...(typeof meetingUrl === 'string' ? { meetingUrl: meetingUrl.trim() } : {}),
        ...(platform ? { platform: platform.trim() } : {}),
        ...(schedule ? { schedule: schedule.trim() } : {}),
        ...(description ? { description: description.trim() } : {}),
        ...(name ? { name: name.trim() } : {})
      },
      include: {
        owner: { select: { id: true, name: true, avatar: true } },
        members: { include: { user: { select: { id: true, name: true, avatar: true } } } },
        tasks: { orderBy: { createdAt: 'asc' } }
      }
    });

    return res.json({
      message: 'Squad updated successfully.',
      squad: {
        ...updated,
        memberCount: updated.members.length,
        members: updated.members.map((m) => m.user),
        isJoined: true
      }
    });
  } catch (error) {
    console.error('Update squad error:', error);
    return res.status(500).json({ error: 'Failed to update squad.' });
  }
});

// DELETE /api/squads/:id - Delete squad (owner only)
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const squad = await prisma.squad.findUnique({ where: { id } });
    if (!squad) {
      return res.status(404).json({ error: 'Squad not found.' });
    }
    if (squad.ownerId !== req.user.id) {
      return res.status(403).json({ error: 'Only the squad owner can delete this squad.' });
    }

    await prisma.squad.delete({ where: { id } });
    return res.json({ message: 'Squad deleted successfully.' });
  } catch (error) {
    console.error('Delete squad error:', error);
    return res.status(500).json({ error: 'Failed to delete squad.' });
  }
});

// GET /api/squads/:id/tasks - Get squad tasks
router.get('/:id/tasks', async (req, res) => {
  try {
    const { id } = req.params;
    const tasks = await prisma.task.findMany({
      where: { squadId: id },
      orderBy: { createdAt: 'asc' }
    });
    return res.json({ tasks });
  } catch (error) {
    console.error('Get tasks error:', error);
    return res.status(500).json({ error: 'Failed to fetch tasks.' });
  }
});

// POST /api/squads/:id/tasks - Add squad task
router.post('/:id/tasks', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Task text is required.' });
    }

    const task = await prisma.task.create({
      data: {
        squadId: id,
        text: text.trim(),
        completed: false,
        createdById: req.user.id
      }
    });

    return res.status(201).json({ task });
  } catch (error) {
    console.error('Create task error:', error);
    return res.status(500).json({ error: 'Failed to create task.' });
  }
});

// PATCH /api/squads/:id/tasks/:taskId - Toggle or update task
router.patch('/:id/tasks/:taskId', requireAuth, async (req, res) => {
  try {
    const { taskId } = req.params;
    const { completed, text } = req.body;

    const existing = await prisma.task.findUnique({ where: { id: taskId } });
    if (!existing) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    const updated = await prisma.task.update({
      where: { id: taskId },
      data: {
        ...(typeof completed === 'boolean' ? { completed } : {}),
        ...(text ? { text: text.trim() } : {})
      }
    });

    return res.json({ task: updated });
  } catch (error) {
    console.error('Update task error:', error);
    return res.status(500).json({ error: 'Failed to update task.' });
  }
});

// DELETE /api/squads/:id/tasks/:taskId - Delete task (creator or squad owner only)
router.delete('/:id/tasks/:taskId', requireAuth, async (req, res) => {
  try {
    const { id, taskId } = req.params;
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { squad: true }
    });
    if (!task) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    const isCreator = task.createdById === req.user.id;
    const isSquadOwner = task.squad?.ownerId === req.user.id;
    if (!isCreator && !isSquadOwner) {
      return res.status(403).json({ error: 'Only task creator or squad owner can delete this task.' });
    }

    await prisma.task.delete({ where: { id: taskId } });
    return res.json({ message: 'Task deleted successfully.' });
  } catch (error) {
    console.error('Delete task error:', error);
    return res.status(500).json({ error: 'Failed to delete task.' });
  }
});

// GET /api/squads/:id/resources - Get all study resources for squad
router.get('/:id/resources', async (req, res) => {
  try {
    const { id } = req.params;
    const resources = await prisma.resource.findMany({
      where: { squadId: id },
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: {
          select: { id: true, name: true, avatar: true }
        }
      }
    });
    return res.json({ resources });
  } catch (err) {
    console.error('Fetch resources error:', err);
    return res.status(500).json({ error: 'Failed to fetch resources.' });
  }
});

// POST /api/squads/:id/resources - Add study resource link
router.post('/:id/resources', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, url, category = 'Resource' } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Title is required.' });
    }

    const resource = await prisma.resource.create({
      data: {
        squadId: id,
        title: title.trim(),
        url: url ? url.trim() : '',
        category: category.trim(),
        createdById: req.user.id
      },
      include: {
        createdBy: {
          select: { id: true, name: true, avatar: true }
        }
      }
    });

    return res.status(201).json({ resource });
  } catch (err) {
    console.error('Create resource error:', err);
    return res.status(500).json({ error: 'Failed to create study resource.' });
  }
});

// POST /api/squads/:id/upload - Upload lecture slide deck, notes, or study PDF
router.post('/:id/upload', requireAuth, upload.single('file'), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, category } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'Please select a lecture file or PDF to upload.' });
    }

    const squad = await prisma.squad.findUnique({ where: { id } });
    if (!squad) {
      return res.status(404).json({ error: 'Squad not found.' });
    }

    const ext = path.extname(req.file.originalname).toLowerCase();
    let detectedCategory = category;
    if (!detectedCategory) {
      if (ext === '.pdf') detectedCategory = 'PDF';
      else if (ext === '.ppt' || ext === '.pptx') detectedCategory = 'Slides';
      else if (ext === '.doc' || ext === '.docx') detectedCategory = 'Docs';
      else if (['.png', '.jpg', '.jpeg'].includes(ext)) detectedCategory = 'CheatSheet';
      else detectedCategory = 'Notes';
    }

    // Format human-readable file size (e.g. 2.4 MB or 450 KB)
    const sizeInMB = (req.file.size / (1024 * 1024)).toFixed(1);
    const sizeStr = req.file.size < 1024 * 1024 
      ? `${Math.round(req.file.size / 1024)} KB` 
      : `${sizeInMB} MB`;

    const fileUrl = `/uploads/${req.file.filename}`;
    const cleanTitle = (title && title.trim()) ? title.trim() : req.file.originalname;

    const resource = await prisma.resource.create({
      data: {
        squadId: id,
        title: cleanTitle,
        url: fileUrl,
        category: detectedCategory,
        createdById: req.user.id
      },
      include: {
        createdBy: {
          select: { id: true, name: true, avatar: true }
        }
      }
    });

    return res.status(201).json({
      message: 'File uploaded successfully!',
      resource: {
        ...resource,
        fileSize: sizeStr,
        fileName: req.file.originalname
      }
    });
  } catch (err) {
    console.error('Upload resource error:', err);
    return res.status(500).json({ error: err.message || 'Failed to upload lecture file.' });
  }
});

// DELETE /api/squads/:id/resources/:resourceId - Delete study resource (uploader or squad owner only)
router.delete('/:id/resources/:resourceId', requireAuth, async (req, res) => {
  try {
    const { id, resourceId } = req.params;
    const resource = await prisma.resource.findUnique({
      where: { id: resourceId },
      include: { squad: true }
    });
    if (!resource) {
      return res.status(404).json({ error: 'Resource not found.' });
    }

    const isCreator = resource.createdById === req.user.id;
    const isSquadOwner = resource.squad?.ownerId === req.user.id;
    if (!isCreator && !isSquadOwner) {
      return res.status(403).json({ error: 'Only resource uploader or squad owner can delete this resource.' });
    }

    await prisma.resource.delete({ where: { id: resourceId } });
    return res.json({ message: 'Resource deleted successfully.' });
  } catch (err) {
    console.error('Delete resource error:', err);
    return res.status(500).json({ error: 'Failed to delete resource.' });
  }
});

// PATCH /api/squads/:id/notes - Update shared collaborative study notes
router.patch('/:id/notes', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const updated = await prisma.squad.update({
      where: { id },
      data: {
        sharedNotes: typeof notes === 'string' ? notes : ''
      }
    });

    return res.json({
      message: 'Shared notes saved.',
      sharedNotes: updated.sharedNotes
    });
  } catch (err) {
    console.error('Update notes error:', err);
    return res.status(500).json({ error: 'Failed to save notes.' });
  }
});

// GET /api/squads/:id/messages - Get chat messages history for a squad
router.get('/:id/messages', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit, 10) || 100;

    const messages = await prisma.message.findMany({
      where: { squadId: id },
      orderBy: { createdAt: 'asc' },
      take: limit,
      include: {
        user: {
          select: { id: true, name: true, avatar: true }
        }
      }
    });

    return res.json({ messages });
  } catch (err) {
    console.error('Fetch messages error:', err);
    return res.status(500).json({ error: 'Failed to fetch messages.' });
  }
});

// POST /api/squads/:id/messages - Send and persist a message via REST
router.post('/:id/messages', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Message content is required.' });
    }

    const message = await prisma.message.create({
      data: {
        squadId: id,
        userId: req.user.id,
        content: content.trim()
      },
      include: {
        user: {
          select: { id: true, name: true, avatar: true }
        }
      }
    });

    return res.status(201).json({ message });
  } catch (err) {
    console.error('Send message error:', err);
    return res.status(500).json({ error: 'Failed to send message.' });
  }
});

// GET /api/squads/:id/members - Get all members with their roles
router.get('/:id/members', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const members = await prisma.squadMember.findMany({
      where: { squadId: id },
      include: {
        user: {
          select: { id: true, name: true, avatar: true, bio: true, pomodoroSessions: true, createdAt: true }
        }
      },
      orderBy: { joinedAt: 'asc' }
    });

    const squad = await prisma.squad.findUnique({ where: { id }, select: { ownerId: true } });

    const formatted = members.map((m) => ({
      ...m.user,
      role: m.userId === squad?.ownerId ? 'owner' : m.role,
      joinedAt: m.joinedAt,
      memberId: m.id,
    }));

    return res.json({ members: formatted });
  } catch (err) {
    console.error('Get members error:', err);
    return res.status(500).json({ error: 'Failed to fetch members.' });
  }
});

// DELETE /api/squads/:id/members/:userId - Kick a member (owner/admin only)
router.delete('/:id/members/:userId', requireAuth, async (req, res) => {
  try {
    const { id, userId } = req.params;

    const squad = await prisma.squad.findUnique({ where: { id } });
    if (!squad) return res.status(404).json({ error: 'Squad not found.' });

    // Check requester is owner or admin
    const requesterMembership = await prisma.squadMember.findUnique({
      where: { userId_squadId: { userId: req.user.id, squadId: id } }
    });
    const isOwner = squad.ownerId === req.user.id;
    const isAdmin = requesterMembership?.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Only squad admins can kick members.' });
    }

    // Cannot kick the owner
    if (userId === squad.ownerId) {
      return res.status(400).json({ error: 'Cannot kick the squad owner.' });
    }

    await prisma.squadMember.deleteMany({
      where: { squadId: id, userId }
    });

    // Record system message
    await prisma.message.create({
      data: { squadId: id, userId: req.user.id, content: `🚫 A member was removed from the squad.` }
    });

    return res.json({ message: 'Member removed from squad.' });
  } catch (err) {
    console.error('Kick member error:', err);
    return res.status(500).json({ error: 'Failed to remove member.' });
  }
});

// PATCH /api/squads/:id/members/:userId/role - Promote/demote member role (owner only)
router.patch('/:id/members/:userId/role', requireAuth, async (req, res) => {
  try {
    const { id, userId } = req.params;
    const { role } = req.body; // 'admin' | 'member'

    if (!['admin', 'member'].includes(role)) {
      return res.status(400).json({ error: 'Role must be "admin" or "member".' });
    }

    const squad = await prisma.squad.findUnique({ where: { id } });
    if (!squad) return res.status(404).json({ error: 'Squad not found.' });

    if (squad.ownerId !== req.user.id) {
      return res.status(403).json({ error: 'Only the squad owner can change member roles.' });
    }

    await prisma.squadMember.update({
      where: { userId_squadId: { userId, squadId: id } },
      data: { role }
    });

    return res.json({ message: `Member role updated to ${role}.` });
  } catch (err) {
    console.error('Update role error:', err);
    return res.status(500).json({ error: 'Failed to update role.' });
  }
});

// PATCH /api/squads/:id/announcement - Set pinned announcement (owner/admin only)
router.patch('/:id/announcement', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { pinnedMessage } = req.body;

    const squad = await prisma.squad.findUnique({ where: { id } });
    if (!squad) return res.status(404).json({ error: 'Squad not found.' });

    const membership = await prisma.squadMember.findUnique({
      where: { userId_squadId: { userId: req.user.id, squadId: id } }
    });
    const isOwner = squad.ownerId === req.user.id;
    const isAdmin = membership?.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Only admins can pin announcements.' });
    }

    const updated = await prisma.squad.update({
      where: { id },
      data: { pinnedMessage: pinnedMessage ? pinnedMessage.trim() : '' }
    });

    return res.json({ pinnedMessage: updated.pinnedMessage });
  } catch (err) {
    console.error('Announcement error:', err);
    return res.status(500).json({ error: 'Failed to set announcement.' });
  }
});

export default router;

