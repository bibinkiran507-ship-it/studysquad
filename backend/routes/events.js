import { Router } from 'express';
import prisma, { withRetry } from '../lib/prisma.js';
import { generateWithGemini } from './ai.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { enforceAiLimit } from '../middleware/freemiumLimiter.js';

const router = Router();

const isSafeOptionalHttpUrl = (val) => {
  if (!val || typeof val !== 'string' || !val.trim()) return true;
  try {
    const parsed = new URL(val.trim());
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
};

// RFC 5545 text value escaper for .ics export
const escapeIcsText = (str) =>
  String(str || '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');

// GET /api/events - Retrieve study sessions & exam countdowns
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { squadId, type, userId } = req.query;

    const where = {};
    if (squadId && typeof squadId === 'string') where.squadId = squadId;
    if (type && typeof type === 'string') where.type = type;

    if (userId && typeof userId === 'string') {
      where.userId = userId;
    } else if (!squadId) {
      // Return public squad events plus the logged-in student's personal milestones
      if (req.user?.id) {
        where.OR = [{ squadId: { not: null } }, { userId: req.user.id }];
      } else {
        where.squadId = { not: null };
      }
    }

    const events = await withRetry(() =>
      prisma.studyEvent.findMany({
        where,
        take: 200,
        include: {
          squad: {
            select: {
              id: true,
              name: true,
              category: true,
              subject: true,
              meetingUrl: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
        },
        orderBy: {
          date: 'asc',
        },
      })
    );

    return res.json({ events });
  } catch (err) {
    console.error('Error fetching study events:', err);
    return res.status(500).json({ error: 'Failed to retrieve events.' });
  }
});

// POST /api/events - Create new study session or exam milestone
router.post('/', requireAuth, async (req, res) => {
  try {
    const {
      title,
      description = '',
      type = 'session', // 'session' | 'exam' | 'deadline' | 'review'
      subject = 'General',
      date,
      endDate = null,
      squadId = null,
      location = 'StudySquad Room',
      meetingUrl = '',
      urgency = 'medium',
    } = req.body || {};

    if (typeof title !== 'string' || !title.trim() || !date) {
      return res.status(400).json({ error: 'Title and date are required.' });
    }

    const eventDate = new Date(date);
    if (isNaN(eventDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date format.' });
    }

    let parsedEndDate = null;
    if (endDate) {
      parsedEndDate = new Date(endDate);
      if (isNaN(parsedEndDate.getTime())) {
        return res.status(400).json({ error: 'Invalid endDate format.' });
      }
    }

    if (!isSafeOptionalHttpUrl(meetingUrl)) {
      return res.status(400).json({ error: 'Meeting URL must start with https:// or http://.' });
    }

    let validSquadId = null;
    if (squadId && typeof squadId === 'string') {
      const sq = await withRetry(() =>
        prisma.squad.findUnique({ where: { id: squadId }, select: { id: true } })
      );
      if (sq) validSquadId = squadId;
    }

    const event = await withRetry(() =>
      prisma.studyEvent.create({
        data: {
          title: title.trim().slice(0, 160),
          description: typeof description === 'string' ? description.trim().slice(0, 2000) : '',
          type: typeof type === 'string' ? type : 'session',
          subject: typeof subject === 'string' && subject.trim() ? subject.trim().slice(0, 100) : 'General',
          date: eventDate,
          endDate: parsedEndDate,
          squadId: validSquadId,
          userId: req.user.id,
          location: typeof location === 'string' && location.trim() ? location.trim().slice(0, 160) : 'StudySquad Room',
          meetingUrl: typeof meetingUrl === 'string' ? meetingUrl.trim() : '',
          urgency: typeof urgency === 'string' ? urgency : 'medium',
        },
        include: {
          squad: {
            select: {
              id: true,
              name: true,
              category: true,
              subject: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
        },
      })
    );

    return res.status(201).json({ event });
  } catch (err) {
    console.error('Error creating study event:', err);
    return res.status(500).json({ error: 'Failed to create event.' });
  }
});

// PUT /api/events/:id - Update event or toggle completion (owner or squad admin only)
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await withRetry(() =>
      prisma.studyEvent.findUnique({
        where: { id },
        include: { squad: true },
      })
    );

    if (!existing) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    const isCreator = existing.userId === req.user.id;
    const isSquadOwner = existing.squad?.ownerId === req.user.id;
    if (!isCreator && !isSquadOwner) {
      return res.status(403).json({ error: 'You are not authorized to update this event.' });
    }

    const {
      title,
      description,
      type,
      subject,
      date,
      endDate,
      location,
      meetingUrl,
      urgency,
      isCompleted,
    } = req.body || {};

    const data = {};
    if (typeof title === 'string' && title.trim()) data.title = title.trim().slice(0, 160);
    if (typeof description === 'string') data.description = description.trim().slice(0, 2000);
    if (typeof type === 'string') data.type = type;
    if (typeof subject === 'string') data.subject = subject.trim().slice(0, 100);
    if (date !== undefined) {
      const parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) {
        return res.status(400).json({ error: 'Invalid date format.' });
      }
      data.date = parsedDate;
    }
    if (endDate !== undefined) {
      if (!endDate) {
        data.endDate = null;
      } else {
        const parsedEnd = new Date(endDate);
        if (isNaN(parsedEnd.getTime())) {
          return res.status(400).json({ error: 'Invalid endDate format.' });
        }
        data.endDate = parsedEnd;
      }
    }
    if (typeof location === 'string') data.location = location.trim().slice(0, 160);
    if (meetingUrl !== undefined) {
      if (!isSafeOptionalHttpUrl(meetingUrl)) {
        return res.status(400).json({ error: 'Meeting URL must start with https:// or http://.' });
      }
      data.meetingUrl = typeof meetingUrl === 'string' ? meetingUrl.trim() : '';
    }
    if (typeof urgency === 'string') data.urgency = urgency;
    if (typeof isCompleted === 'boolean') data.isCompleted = isCompleted;

    const updated = await withRetry(() =>
      prisma.studyEvent.update({
        where: { id },
        data,
        include: {
          squad: {
            select: { id: true, name: true, category: true, subject: true },
          },
          user: {
            select: { id: true, name: true, avatar: true },
          },
        },
      })
    );

    return res.json({ event: updated });
  } catch (err) {
    console.error('Error updating event:', err);
    return res.status(500).json({ error: 'Failed to update event.' });
  }
});

// DELETE /api/events/:id - Remove event (owner or squad admin only)
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await withRetry(() =>
      prisma.studyEvent.findUnique({
        where: { id },
        include: { squad: true },
      })
    );

    if (!existing) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    const isCreator = existing.userId === req.user.id;
    const isSquadOwner = existing.squad?.ownerId === req.user.id;
    if (!isCreator && !isSquadOwner) {
      return res.status(403).json({ error: 'You are not authorized to delete this event.' });
    }

    await withRetry(() => prisma.studyEvent.delete({ where: { id } }));
    return res.json({ message: 'Event deleted successfully.' });
  } catch (err) {
    console.error('Error deleting event:', err);
    return res.status(500).json({ error: 'Failed to delete event.' });
  }
});

// GET /api/events/:id/export-ics - Generate RFC 5545 iCalendar .ics file
router.get('/:id/export-ics', async (req, res) => {
  try {
    const { id } = req.params;
    const event = await withRetry(() =>
      prisma.studyEvent.findUnique({
        where: { id },
        include: { squad: true },
      })
    );

    if (!event) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    const start = new Date(event.date);
    const end = event.endDate ? new Date(event.endDate) : new Date(start.getTime() + 60 * 60 * 1000);

    const formatIcsDate = (d) =>
      d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//StudySquad//Study Session Calendar//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${event.id}@studysquadai.com`,
      `DTSTAMP:${formatIcsDate(new Date())}`,
      `DTSTART:${formatIcsDate(start)}`,
      `DTEND:${formatIcsDate(end)}`,
      `SUMMARY:${escapeIcsText(`${event.title} (${event.subject || 'StudySquad'})`)}`,
      `DESCRIPTION:${escapeIcsText(event.description || 'Collaborative study meetup on StudySquad (https://studysquadai.com)')}`,
      `LOCATION:${escapeIcsText(event.location || 'Online StudySquad Room')}`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const safeFileName = (event.title || 'study_event').replace(/[^a-zA-Z0-9]/g, '_').slice(0, 60);
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFileName}.ics"`);
    return res.send(icsContent);
  } catch (err) {
    console.error('Error exporting ICS:', err);
    return res.status(500).json({ error: 'Failed to export calendar event.' });
  }
});

// POST /api/events/ai-study-plan - Generate exam prep countdown milestones with Gemini
router.post('/ai-study-plan', optionalAuth, enforceAiLimit, async (req, res) => {
  try {
    const { examTitle, subject, daysLeft = 7, targetScore = 'A' } = req.body || {};
    const safeDays = Math.max(1, Math.min(365, Number(daysLeft) || 7));

    const prompt = `You are StudySquad AI Academic Coach.
A student is preparing for an upcoming exam:
- Exam: "${examTitle || 'Final Exam'}"
- Subject: "${subject || 'Coursework'}"
- Days Remaining: ${safeDays} days
- Target Grade / Goal: "${targetScore}"

Create a high-impact, day-by-day Countdown Study Plan.
Include:
1. 🎯 Strategic Breakdown (High-yield focus topics)
2. 🗓️ Daily Milestone Roadmap (What to accomplish each day from now until exam day)
3. ⚠️ 3 Critical Exam Traps to avoid in ${subject || 'this subject'}
4. 💡 Active Recall & Spaced Repetition strategy

Format cleanly with Markdown, emojis, and clear bullet points.`;

    const geminiRes = await generateWithGemini(prompt);
    if (geminiRes && geminiRes.text) {
      return res.json({
        plan: geminiRes.text,
        poweredBy: `Google Gemini (${geminiRes.modelName})`,
      });
    }

    const fallbackPlan =
      `📅 **${safeDays}-Day Exam Countdown Plan for ${examTitle || subject || 'Upcoming Exam'}**\n\n` +
      `🎯 **Phase 1: Diagnostic & Core Concepts (Days 1-${Math.max(1, Math.floor(safeDays * 0.4))})**\n` +
      `• Identify high-weight syllabus units and formula derivations.\n` +
      `• Complete active recall flashcards on key definitions in the **AI Quiz & Cards** tab.\n\n` +
      `🔥 **Phase 2: Intensive Problem Sets (Days ${Math.max(2, Math.floor(safeDays * 0.4) + 1)}-${Math.max(2, safeDays - 1)})**\n` +
      `• Work through past exams under timed Pomodoro sprint conditions (25m deep work).\n` +
      `• Host a peer whiteboard review session in your Squad Room to explain tricky concepts.\n\n` +
      `🏆 **Phase 3: Final Polish (Day before Exam)**\n` +
      `• Light formula sheet review and 8 hours of sleep to consolidate long-term memory!`;

    return res.json({
      plan: fallbackPlan,
      poweredBy: 'StudySquad Smart Engine',
    });
  } catch (err) {
    console.error('Error generating AI study plan:', err);
    return res.status(500).json({ error: 'Failed to generate study plan.' });
  }
});

export default router;
