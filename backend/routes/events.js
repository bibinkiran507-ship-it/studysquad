import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { generateWithGemini } from './ai.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';

const router = Router();

// GET /api/events - Retrieve study sessions & exam countdowns
router.get('/', async (req, res) => {
  try {
    const { squadId, type, userId } = req.query;

    const where = {};
    if (squadId) where.squadId = squadId;
    if (type) where.type = type;
    if (userId) where.userId = userId;

    const events = await prisma.studyEvent.findMany({
      where,
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
    });

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
    } = req.body;

    if (!title || !date) {
      return res.status(400).json({ error: 'Title and date are required.' });
    }

    const eventDate = new Date(date);
    if (isNaN(eventDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date format.' });
    }

    // Verify squadId exists if provided
    let validSquadId = null;
    if (squadId) {
      const sq = await prisma.squad.findUnique({ where: { id: squadId } });
      if (sq) validSquadId = squadId;
    }

    const event = await prisma.studyEvent.create({
      data: {
        title: title.trim(),
        description: (description || '').trim(),
        type,
        subject: (subject || 'General').trim(),
        date: eventDate,
        endDate: endDate ? new Date(endDate) : null,
        squadId: validSquadId,
        userId: req.user.id,
        location: location || 'StudySquad Room',
        meetingUrl: meetingUrl || '',
        urgency,
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
    });

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
    const existing = await prisma.studyEvent.findUnique({
      where: { id },
      include: { squad: true },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    const isCreator = existing.userId === req.user.id;
    const isSquadOwner = existing.squad?.ownerId === req.user.id;
    if (!isCreator && !isSquadOwner) {
      return res.status(403).json({ error: 'You are not authorized to update this event.' });
    }

    const { title, description, type, subject, date, endDate, location, urgency, isCompleted } = req.body;

    const data = {};
    if (title !== undefined) data.title = title.trim();
    if (description !== undefined) data.description = description.trim();
    if (type !== undefined) data.type = type;
    if (subject !== undefined) data.subject = subject.trim();
    if (date !== undefined) data.date = new Date(date);
    if (endDate !== undefined) data.endDate = endDate ? new Date(endDate) : null;
    if (location !== undefined) data.location = location;
    if (urgency !== undefined) data.urgency = urgency;
    if (isCompleted !== undefined) data.isCompleted = isCompleted;

    const updated = await prisma.studyEvent.update({
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
    });

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
    const existing = await prisma.studyEvent.findUnique({
      where: { id },
      include: { squad: true },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    const isCreator = existing.userId === req.user.id;
    const isSquadOwner = existing.squad?.ownerId === req.user.id;
    if (!isCreator && !isSquadOwner) {
      return res.status(403).json({ error: 'You are not authorized to delete this event.' });
    }

    await prisma.studyEvent.delete({ where: { id } });
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
    const event = await prisma.studyEvent.findUnique({
      where: { id },
      include: { squad: true },
    });

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
      `UID:${event.id}@studysquad.io`,
      `DTSTAMP:${formatIcsDate(new Date())}`,
      `DTSTART:${formatIcsDate(start)}`,
      `DTEND:${formatIcsDate(end)}`,
      `SUMMARY:${event.title} (${event.subject || 'StudySquad'})`,
      `DESCRIPTION:${event.description || 'Collaborative study meetup on StudySquad'}`,
      `LOCATION:${event.location || 'Online StudySquad Room'}`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${event.title.replace(/[^a-zA-Z0-9]/g, '_')}.ics"`
    );
    return res.send(icsContent);
  } catch (err) {
    console.error('Error exporting ICS:', err);
    return res.status(500).json({ error: 'Failed to export calendar event.' });
  }
});

// POST /api/events/ai-study-plan - Generate exam prep countdown milestones with Gemini
router.post('/ai-study-plan', optionalAuth, async (req, res) => {
  try {
    const { examTitle, subject, examDate, daysLeft = 7, targetScore = 'A' } = req.body;

    const prompt = `You are StudySquad AI Academic Coach.
A student is preparing for an upcoming exam:
- Exam: "${examTitle || 'Final Exam'}"
- Subject: "${subject || 'Coursework'}"
- Days Remaining: ${daysLeft} days
- Target Grade / Goal: "${targetScore}"

Create a high-impact, day-by-day Countdown Study Plan.
Include:
1. 🎯 Strategic Breakdown (High-yield focus topics)
2. 🗓️ Daily Milestone Roadmap (What to accomplish each day from now until exam day)
3. ⚠️ 3 Critical Exam Traps to avoid in ${subject}
4. 💡 Active Recall & Spaced Repetition strategy

Format cleanly with Markdown, emojis, and clear bullet points.`;

    const geminiRes = await generateWithGemini(prompt);
    if (geminiRes && geminiRes.text) {
      return res.json({
        plan: geminiRes.text,
        poweredBy: `Google Gemini (${geminiRes.modelName})`,
      });
    }

    // Fallback heuristic study plan
    const fallbackPlan = `📅 **${daysLeft}-Day Exam Countdown Plan for ${examTitle || subject}**\n\n` +
      `🎯 **Phase 1: Diagnostic & Core Concepts (Days 1-${Math.max(1, Math.floor(daysLeft * 0.4))})**\n` +
      `• Identify high-weight syllabus units and formula derivations.\n` +
      `• Complete active recall flashcards on key definitions in the **AI Quiz & Cards** tab.\n\n` +
      `🔥 **Phase 2: Intensive Problem Sets (Days ${Math.max(2, Math.floor(daysLeft * 0.4) + 1)}-${Math.max(2, daysLeft - 1)})**\n` +
      `• Work through past exams under timed Pomodoro sprint conditions (25m deep work).\n` +
      `• Host a peer whiteboard review session in your Squad Room to explain tricky concepts.\n\n` +
      `🏆 **Phase 3: Final Polish (Day before Exam)**\n` +
      `• Light formula sheets review and sleep 8 hours to consolidate synaptic memory!\n\n` +
      `*(Add your Google Gemini API key to backend/.env for AI-personalized syllabi breakdowns!)*`;

    return res.json({
      plan: fallbackPlan,
      poweredBy: 'StudySquad Academic Engine',
    });
  } catch (err) {
    console.error('Error generating AI study plan:', err);
    return res.status(500).json({ error: 'Failed to generate study plan.' });
  }
});

export default router;
