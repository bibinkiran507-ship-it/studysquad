import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { fileURLToPath } from 'url';
import prisma, { withRetry } from '../lib/prisma.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { extractDocumentText } from '../lib/docExtractor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Setup persistent or local uploads storage for slide decks, lecture notes, and PDFs
const uploadsDir = process.env.UPLOADS_DIR
  ? path.resolve(process.env.UPLOADS_DIR)
  : path.resolve(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    const baseName = path
      .basename(file.originalname, path.extname(file.originalname))
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 60);
    cb(null, `${baseName || 'doc'}-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 30 * 1024 * 1024 }, // 30 MB max
  fileFilter: (_req, file, cb) => {
    const allowed = [
      '.pdf',
      '.ppt',
      '.pptx',
      '.doc',
      '.docx',
      '.txt',
      '.md',
      '.csv',
      '.png',
      '.jpg',
      '.jpeg',
    ];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Supported formats: PDF, PPT, PPTX, DOC, DOCX, TXT, MD, CSV, or Images.'));
    }
  },
});

// Clean Multer error wrapper returning 400/413 JSON instead of unhandled 500
const handleFileUpload = (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res
          .status(413)
          .json({ error: 'File exceeds the 30 MB upload limit. Please compress or split it.' });
      }
      return res.status(400).json({ error: err.message || 'File upload failed.' });
    }
    return res.status(400).json({ error: err.message || 'Unsupported file format.' });
  });
};

const isSafeOptionalHttpUrl = (val) => {
  if (!val || typeof val !== 'string' || !val.trim()) return true;
  try {
    const parsed = new URL(val.trim());
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
};

const isSafeResourceUrl = (val) => {
  if (!val || typeof val !== 'string' || !val.trim()) return true;
  const trimmed = val.trim();
  if (trimmed.startsWith('/uploads/')) return true;
  return isSafeOptionalHttpUrl(trimmed);
};

const RESOURCE_PUBLIC_SELECT = {
  id: true,
  squadId: true,
  title: true,
  url: true,
  category: true,
  createdById: true,
  createdAt: true,
  createdBy: {
    select: { id: true, name: true, avatar: true },
  },
};

async function checkSquadAccess(squadId, userId) {
  const squad = await withRetry(() =>
    prisma.squad.findUnique({
      where: { id: squadId },
      select: {
        id: true,
        ownerId: true,
        members: {
          where: { userId },
          select: { id: true, role: true },
        },
      },
    })
  );
  if (!squad) return { exists: false, allowed: false, isOwner: false };
  const isOwner = squad.ownerId === userId;
  const isMember = squad.members.length > 0;
  return { exists: true, allowed: isOwner || isMember, isOwner };
}

const router = Router();

// GET /api/squads - List all squads
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { category, search } = req.query;
    const isPostgres = (process.env.DATABASE_URL || '').startsWith('postgres');
    const ciMode = isPostgres ? { mode: 'insensitive' } : {};

    const where = {};
    if (typeof category === 'string' && category && category !== 'All' && category !== 'All Squads') {
      where.category = category;
    }
    if (typeof search === 'string' && search.trim()) {
      const q = search.trim();
      where.OR = [
        { name: { contains: q, ...ciMode } },
        { subject: { contains: q, ...ciMode } },
        { description: { contains: q, ...ciMode } },
        { category: { contains: q, ...ciMode } },
      ];
    }

    const squads = await withRetry(() =>
      prisma.squad.findMany({
        where,
        take: 100,
        orderBy: { createdAt: 'desc' },
        include: {
          owner: {
            select: { id: true, name: true, avatar: true },
          },
          members: {
            include: {
              user: {
                select: { id: true, name: true, avatar: true },
              },
            },
          },
          tasks: {
            orderBy: { createdAt: 'asc' },
          },
          _count: {
            select: { members: true, messages: true },
          },
        },
      })
    );

    const currentUserId = req.user?.id;

    const formattedSquads = squads.map((squad) => {
      const isJoined = currentUserId
        ? squad.ownerId === currentUserId || squad.members.some((m) => m.userId === currentUserId)
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
        createdAt: squad.createdAt,
      };
    });

    return res.json({ squads: formattedSquads });
  } catch (error) {
    console.error('Fetch squads error:', error);
    return res.status(500).json({ error: 'Failed to fetch squads.' });
  }
});

// GET /api/squads/:id - Get squad detail (returns newest 60 messages in chronological order)
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const squad = await withRetry(() =>
      prisma.squad.findUnique({
        where: { id },
        include: {
          owner: {
            select: { id: true, name: true, avatar: true },
          },
          members: {
            include: {
              user: {
                select: { id: true, name: true, avatar: true },
              },
            },
          },
          tasks: {
            orderBy: { createdAt: 'asc' },
          },
          resources: {
            orderBy: { createdAt: 'desc' },
            select: RESOURCE_PUBLIC_SELECT,
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 60,
            include: {
              user: {
                select: { id: true, name: true, avatar: true },
              },
            },
          },
        },
      })
    );

    if (!squad) {
      return res.status(404).json({ error: 'Squad not found.' });
    }

    const currentUserId = req.user?.id;
    const isJoined = currentUserId
      ? squad.ownerId === currentUserId || squad.members.some((m) => m.userId === currentUserId)
      : false;

    return res.json({
      squad: {
        ...squad,
        messages: [...(squad.messages || [])].reverse(),
        sharedNotes: squad.sharedNotes || '',
        resources: squad.resources || [],
        memberCount: squad.members.length,
        members: squad.members.map((m) => m.user),
        isJoined,
      },
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
      platform = 'StudySquad Live',
      meetingUrl = '',
      schedule = 'Mon, Wed, Fri • 8:00 PM IST',
      maxMembers = 6,
      bannerGradient,
    } = req.body || {};

    if (
      typeof name !== 'string' ||
      typeof category !== 'string' ||
      typeof subject !== 'string' ||
      !name.trim() ||
      !category.trim() ||
      !subject.trim()
    ) {
      return res.status(400).json({ error: 'Name, category, and subject are required.' });
    }

    if (!isSafeOptionalHttpUrl(meetingUrl)) {
      return res.status(400).json({ error: 'Meeting URL must start with https:// or http://.' });
    }

    const gradients = [
      'from-cyan-500/30 to-blue-600/30',
      'from-emerald-500/30 to-teal-600/30',
      'from-purple-500/30 to-pink-600/30',
      'from-amber-500/30 to-orange-600/30',
      'from-indigo-500/30 to-violet-600/30',
      'from-rose-500/30 to-red-600/30',
    ];
    const chosenGradient =
      typeof bannerGradient === 'string' && bannerGradient.trim()
        ? bannerGradient.trim()
        : gradients[Math.floor(Math.random() * gradients.length)];

    const clampedMax = Math.max(2, Math.min(50, Number(maxMembers) || 6));
    const cleanName = name.trim().slice(0, 120);
    const cleanSubject = subject.trim().slice(0, 120);

    const squad = await withRetry(() =>
      prisma.squad.create({
        data: {
          name: cleanName,
          category: category.trim().slice(0, 80),
          subject: cleanSubject,
          description:
            typeof description === 'string' && description.trim()
              ? description.trim().slice(0, 1000)
              : `Collaborative study squad for ${cleanSubject}.`,
          platform: typeof platform === 'string' && platform.trim() ? platform.trim().slice(0, 60) : 'StudySquad Live',
          meetingUrl: typeof meetingUrl === 'string' ? meetingUrl.trim() : '',
          schedule: typeof schedule === 'string' && schedule.trim() ? schedule.trim().slice(0, 120) : 'Flexible Daily Study',
          maxMembers: clampedMax,
          bannerGradient: chosenGradient,
          ownerId: req.user.id,
          members: {
            create: {
              userId: req.user.id,
              role: 'admin',
            },
          },
          tasks: {
            create: [
              {
                text: `Welcome to ${cleanName}! Introduce yourself in chat`,
                completed: false,
                createdById: req.user.id,
              },
              {
                text: `Review upcoming study milestones for ${cleanSubject}`,
                completed: false,
                createdById: req.user.id,
              },
            ],
          },
        },
        include: {
          owner: {
            select: { id: true, name: true, avatar: true },
          },
          members: {
            include: {
              user: {
                select: { id: true, name: true, avatar: true },
              },
            },
          },
          tasks: true,
        },
      })
    );

    return res.status(201).json({
      squad: {
        ...squad,
        memberCount: 1,
        members: squad.members.map((m) => m.user),
        isJoined: true,
      },
    });
  } catch (error) {
    console.error('Create squad error:', error);
    return res.status(500).json({ error: 'Failed to create squad.' });
  }
});

// POST /api/squads/:id/join - Join a squad (idempotent)
router.post('/:id/join', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const squad = await withRetry(() =>
      prisma.squad.findUnique({
        where: { id },
        include: {
          owner: { select: { id: true, name: true, avatar: true } },
          members: { include: { user: { select: { id: true, name: true, avatar: true } } } },
          tasks: true,
        },
      })
    );

    if (!squad) {
      return res.status(404).json({ error: 'Squad not found.' });
    }

    const alreadyJoined = squad.members.some((m) => m.userId === req.user.id);
    if (alreadyJoined) {
      return res.json({
        message: 'Already a member of this squad.',
        squad: {
          ...squad,
          memberCount: squad.members.length,
          members: squad.members.map((m) => m.user),
          isJoined: true,
        },
      });
    }

    let newlyAdded = false;
    try {
      await withRetry(() =>
        prisma.squadMember.create({
          data: {
            squadId: id,
            userId: req.user.id,
            role: squad.ownerId === req.user.id ? 'admin' : 'member',
          },
        })
      );
      newlyAdded = true;
    } catch (joinErr) {
      if (joinErr?.code !== 'P2002') throw joinErr;
    }

    if (newlyAdded) {
      await withRetry(() =>
        prisma.message.create({
          data: {
            squadId: id,
            userId: req.user.id,
            content: `🎉 ${req.user.name} joined the squad!`,
          },
        })
      );
    }

    const updatedSquad = await withRetry(() =>
      prisma.squad.findUnique({
        where: { id },
        include: {
          owner: { select: { id: true, name: true, avatar: true } },
          members: { include: { user: { select: { id: true, name: true, avatar: true } } } },
          tasks: true,
        },
      })
    );

    return res.json({
      message: 'Successfully joined squad!',
      squad: {
        ...updatedSquad,
        memberCount: updatedSquad.members.length,
        members: updatedSquad.members.map((m) => m.user),
        isJoined: true,
      },
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
    const squad = await withRetry(() =>
      prisma.squad.findUnique({ where: { id }, select: { id: true, ownerId: true } })
    );
    if (!squad) {
      return res.status(404).json({ error: 'Squad not found.' });
    }
    if (squad.ownerId === req.user.id) {
      return res.status(400).json({
        error: 'As the squad creator, you cannot leave your own squad. You can edit or delete it in Squad Settings.',
      });
    }

    await withRetry(() =>
      prisma.squadMember.deleteMany({
        where: {
          squadId: id,
          userId: req.user.id,
        },
      })
    );

    return res.json({ message: 'Successfully left squad.' });
  } catch (error) {
    console.error('Leave squad error:', error);
    return res.status(500).json({ error: 'Failed to leave squad.' });
  }
});

// PATCH /api/squads/:id - Update squad settings (owner only)
router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { meetingUrl, platform, schedule, description, name } = req.body || {};

    const squad = await withRetry(() => prisma.squad.findUnique({ where: { id } }));
    if (!squad) {
      return res.status(404).json({ error: 'Squad not found.' });
    }

    if (squad.ownerId !== req.user.id) {
      return res.status(403).json({ error: 'Only the squad owner can update squad settings.' });
    }

    if (meetingUrl !== undefined && !isSafeOptionalHttpUrl(meetingUrl)) {
      return res.status(400).json({ error: 'Meeting URL must start with https:// or http://.' });
    }

    const updated = await withRetry(() =>
      prisma.squad.update({
        where: { id },
        data: {
          ...(typeof meetingUrl === 'string' ? { meetingUrl: meetingUrl.trim() } : {}),
          ...(typeof platform === 'string' && platform.trim()
            ? { platform: platform.trim().slice(0, 60) }
            : {}),
          ...(typeof schedule === 'string' && schedule.trim()
            ? { schedule: schedule.trim().slice(0, 120) }
            : {}),
          ...(typeof description === 'string' && description.trim()
            ? { description: description.trim().slice(0, 1000) }
            : {}),
          ...(typeof name === 'string' && name.trim() ? { name: name.trim().slice(0, 120) } : {}),
        },
        include: {
          owner: { select: { id: true, name: true, avatar: true } },
          members: { include: { user: { select: { id: true, name: true, avatar: true } } } },
          tasks: { orderBy: { createdAt: 'asc' } },
        },
      })
    );

    return res.json({
      message: 'Squad updated successfully.',
      squad: {
        ...updated,
        memberCount: updated.members.length,
        members: updated.members.map((m) => m.user),
        isJoined: true,
      },
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
    const squad = await withRetry(() => prisma.squad.findUnique({ where: { id } }));
    if (!squad) {
      return res.status(404).json({ error: 'Squad not found.' });
    }
    if (squad.ownerId !== req.user.id) {
      return res.status(403).json({ error: 'Only the squad owner can delete this squad.' });
    }

    await withRetry(() => prisma.squad.delete({ where: { id } }));
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
    const tasks = await withRetry(() =>
      prisma.task.findMany({
        where: { squadId: id },
        orderBy: { createdAt: 'asc' },
      })
    );
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
    const { text } = req.body || {};

    if (typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'Task text is required.' });
    }

    const access = await checkSquadAccess(id, req.user.id);
    if (!access.exists) return res.status(404).json({ error: 'Squad not found.' });
    if (!access.allowed) {
      return res.status(403).json({ error: 'Join this squad first to add tasks.' });
    }

    const task = await withRetry(() =>
      prisma.task.create({
        data: {
          squadId: id,
          text: text.trim().slice(0, 300),
          completed: false,
          createdById: req.user.id,
        },
      })
    );

    return res.status(201).json({ task });
  } catch (error) {
    console.error('Create task error:', error);
    return res.status(500).json({ error: 'Failed to create task.' });
  }
});

// PATCH /api/squads/:id/tasks/:taskId - Toggle or update task
router.patch('/:id/tasks/:taskId', requireAuth, async (req, res) => {
  try {
    const { id, taskId } = req.params;
    const { completed, text } = req.body || {};

    const existing = await withRetry(() => prisma.task.findUnique({ where: { id: taskId } }));
    if (!existing || existing.squadId !== id) {
      return res.status(404).json({ error: 'Task not found in this squad.' });
    }

    const access = await checkSquadAccess(id, req.user.id);
    if (!access.allowed) {
      return res.status(403).json({ error: 'Join this squad first to update tasks.' });
    }

    const updated = await withRetry(() =>
      prisma.task.update({
        where: { id: taskId },
        data: {
          ...(typeof completed === 'boolean' ? { completed } : {}),
          ...(typeof text === 'string' && text.trim() ? { text: text.trim().slice(0, 300) } : {}),
        },
      })
    );

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
    const task = await withRetry(() =>
      prisma.task.findUnique({
        where: { id: taskId },
        include: { squad: true },
      })
    );
    if (!task || task.squadId !== id) {
      return res.status(404).json({ error: 'Task not found in this squad.' });
    }

    const isCreator = task.createdById === req.user.id;
    const isSquadOwner = task.squad?.ownerId === req.user.id;
    if (!isCreator && !isSquadOwner) {
      return res.status(403).json({ error: 'Only task creator or squad owner can delete this task.' });
    }

    await withRetry(() => prisma.task.delete({ where: { id: taskId } }));
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
    const resources = await withRetry(() =>
      prisma.resource.findMany({
        where: { squadId: id },
        orderBy: { createdAt: 'desc' },
        select: RESOURCE_PUBLIC_SELECT,
      })
    );
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
    const { title, url = '', category = 'Resource' } = req.body || {};

    if (typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'Title is required.' });
    }

    if (!isSafeResourceUrl(url)) {
      return res.status(400).json({ error: 'Resource link must be a valid https:// or http:// URL.' });
    }

    const access = await checkSquadAccess(id, req.user.id);
    if (!access.exists) return res.status(404).json({ error: 'Squad not found.' });
    if (!access.allowed) {
      return res.status(403).json({ error: 'Join this squad first to share resources.' });
    }

    const resource = await withRetry(() =>
      prisma.resource.create({
        data: {
          squadId: id,
          title: title.trim().slice(0, 200),
          url: typeof url === 'string' ? url.trim().slice(0, 2048) : '',
          category: typeof category === 'string' && category.trim() ? category.trim().slice(0, 40) : 'Resource',
          createdById: req.user.id,
        },
        select: RESOURCE_PUBLIC_SELECT,
      })
    );

    return res.status(201).json({ resource });
  } catch (err) {
    console.error('Create resource error:', err);
    return res.status(500).json({ error: 'Failed to create study resource.' });
  }
});

// POST /api/squads/:id/upload - Upload lecture slide deck, notes, or study PDF
router.post('/:id/upload', requireAuth, handleFileUpload, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, category } = req.body || {};

    if (!req.file) {
      return res.status(400).json({ error: 'Please select a lecture file or PDF to upload.' });
    }

    const access = await checkSquadAccess(id, req.user.id);
    if (!access.exists || !access.allowed) {
      fs.promises.unlink(req.file.path).catch(() => {});
      return res
        .status(access.exists ? 403 : 404)
        .json({ error: access.exists ? 'Join this squad first to upload files.' : 'Squad not found.' });
    }

    const ext = path.extname(req.file.originalname).toLowerCase();
    let detectedCategory = typeof category === 'string' ? category.trim() : '';
    if (!detectedCategory) {
      if (ext === '.pdf') detectedCategory = 'PDF';
      else if (ext === '.ppt' || ext === '.pptx') detectedCategory = 'Slides';
      else if (ext === '.doc' || ext === '.docx') detectedCategory = 'Docs';
      else if (['.png', '.jpg', '.jpeg'].includes(ext)) detectedCategory = 'CheatSheet';
      else detectedCategory = 'Notes';
    }

    // Extract text from .pptx / .docx / .txt / .md so Document AI Chat works & survives Render redeploys
    const extractedText = extractDocumentText(req.file.path, ext);

    const sizeInMB = (req.file.size / (1024 * 1024)).toFixed(1);
    const sizeStr =
      req.file.size < 1024 * 1024
        ? `${Math.max(1, Math.round(req.file.size / 1024))} KB`
        : `${sizeInMB} MB`;

    const fileUrl = `/uploads/${req.file.filename}`;
    const cleanTitle =
      typeof title === 'string' && title.trim()
        ? title.trim().slice(0, 200)
        : req.file.originalname.slice(0, 200);

    const resource = await withRetry(() =>
      prisma.resource.create({
        data: {
          squadId: id,
          title: cleanTitle,
          url: fileUrl,
          category: detectedCategory,
          extractedText,
          createdById: req.user.id,
        },
        select: RESOURCE_PUBLIC_SELECT,
      })
    );

    return res.status(201).json({
      message: 'File uploaded successfully!',
      resource: {
        ...resource,
        fileSize: sizeStr,
        fileName: req.file.originalname,
      },
    });
  } catch (err) {
    console.error('Upload resource error:', err);
    return res.status(500).json({ error: 'Failed to upload lecture file.' });
  }
});

// DELETE /api/squads/:id/resources/:resourceId - Delete study resource (uploader or squad owner only)
router.delete('/:id/resources/:resourceId', requireAuth, async (req, res) => {
  try {
    const { id, resourceId } = req.params;
    const resource = await withRetry(() =>
      prisma.resource.findUnique({
        where: { id: resourceId },
        include: { squad: true },
      })
    );
    if (!resource || resource.squadId !== id) {
      return res.status(404).json({ error: 'Resource not found in this squad.' });
    }

    const isCreator = resource.createdById === req.user.id;
    const isSquadOwner = resource.squad?.ownerId === req.user.id;
    if (!isCreator && !isSquadOwner) {
      return res
        .status(403)
        .json({ error: 'Only resource uploader or squad owner can delete this resource.' });
    }

    await withRetry(() => prisma.resource.delete({ where: { id: resourceId } }));

    // Clean up local disk upload if present
    if (resource.url && resource.url.startsWith('/uploads/')) {
      const candidatePath = path.resolve(uploadsDir, path.basename(resource.url));
      if (candidatePath.startsWith(uploadsDir)) {
        fs.promises.unlink(candidatePath).catch(() => {});
      }
    }

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
    const { notes } = req.body || {};

    const access = await checkSquadAccess(id, req.user.id);
    if (!access.exists) return res.status(404).json({ error: 'Squad not found.' });
    if (!access.allowed) {
      return res.status(403).json({ error: 'Join this squad first to edit shared notes.' });
    }

    const safeNotes = typeof notes === 'string' ? notes.slice(0, 100_000) : '';
    const updated = await withRetry(() =>
      prisma.squad.update({
        where: { id },
        data: { sharedNotes: safeNotes },
        select: { sharedNotes: true },
      })
    );

    return res.json({
      message: 'Shared notes saved.',
      sharedNotes: updated.sharedNotes,
    });
  } catch (err) {
    console.error('Update notes error:', err);
    return res.status(500).json({ error: 'Failed to save notes.' });
  }
});

// GET /api/squads/:id/messages - Get newest chat messages history for a squad in chronological order
router.get('/:id/messages', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const rawLimit = parseInt(req.query.limit, 10) || 100;
    const limit = Math.max(1, Math.min(200, rawLimit));

    const rows = await withRetry(() =>
      prisma.message.findMany({
        where: { squadId: id },
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
          user: {
            select: { id: true, name: true, avatar: true },
          },
        },
      })
    );

    return res.json({ messages: rows.reverse() });
  } catch (err) {
    console.error('Fetch messages error:', err);
    return res.status(500).json({ error: 'Failed to fetch messages.' });
  }
});

// POST /api/squads/:id/messages - Send and persist a message via REST
router.post('/:id/messages', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body || {};

    if (typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({ error: 'Message content is required.' });
    }

    const message = await withRetry(() =>
      prisma.message.create({
        data: {
          squadId: id,
          userId: req.user.id,
          content: content.trim().slice(0, 4000),
        },
        include: {
          user: {
            select: { id: true, name: true, avatar: true },
          },
        },
      })
    );

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
    const [members, squad] = await withRetry(() =>
      Promise.all([
        prisma.squadMember.findMany({
          where: { squadId: id },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatar: true,
                bio: true,
                pomodoroSessions: true,
                createdAt: true,
              },
            },
          },
          orderBy: { joinedAt: 'asc' },
        }),
        prisma.squad.findUnique({ where: { id }, select: { ownerId: true } }),
      ])
    );

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

    const squad = await withRetry(() => prisma.squad.findUnique({ where: { id } }));
    if (!squad) return res.status(404).json({ error: 'Squad not found.' });

    const requesterMembership = await withRetry(() =>
      prisma.squadMember.findUnique({
        where: { userId_squadId: { userId: req.user.id, squadId: id } },
      })
    );
    const isOwner = squad.ownerId === req.user.id;
    const isAdmin = requesterMembership?.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Only squad admins can kick members.' });
    }

    if (userId === squad.ownerId) {
      return res.status(400).json({ error: 'Cannot kick the squad owner.' });
    }

    await withRetry(() =>
      prisma.squadMember.deleteMany({
        where: { squadId: id, userId },
      })
    );

    await withRetry(() =>
      prisma.message.create({
        data: {
          squadId: id,
          userId: req.user.id,
          content: `🚫 A member was removed from the squad.`,
        },
      })
    );

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
    const { role } = req.body || {};

    if (!['admin', 'member'].includes(role)) {
      return res.status(400).json({ error: 'Role must be "admin" or "member".' });
    }

    const squad = await withRetry(() => prisma.squad.findUnique({ where: { id } }));
    if (!squad) return res.status(404).json({ error: 'Squad not found.' });

    if (squad.ownerId !== req.user.id) {
      return res.status(403).json({ error: 'Only the squad owner can change member roles.' });
    }

    await withRetry(() =>
      prisma.squadMember.update({
        where: { userId_squadId: { userId, squadId: id } },
        data: { role },
      })
    );

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
    const { pinnedMessage } = req.body || {};

    const squad = await withRetry(() => prisma.squad.findUnique({ where: { id } }));
    if (!squad) return res.status(404).json({ error: 'Squad not found.' });

    const membership = await withRetry(() =>
      prisma.squadMember.findUnique({
        where: { userId_squadId: { userId: req.user.id, squadId: id } },
      })
    );
    const isOwner = squad.ownerId === req.user.id;
    const isAdmin = membership?.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Only admins can pin announcements.' });
    }

    const updated = await withRetry(() =>
      prisma.squad.update({
        where: { id },
        data: {
          pinnedMessage:
            typeof pinnedMessage === 'string' ? pinnedMessage.trim().slice(0, 500) : '',
        },
        select: { pinnedMessage: true },
      })
    );

    return res.json({ pinnedMessage: updated.pinnedMessage });
  } catch (err) {
    console.error('Announcement error:', err);
    return res.status(500).json({ error: 'Failed to set announcement.' });
  }
});

export default router;
