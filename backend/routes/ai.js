import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenerativeAI } from '@google/generative-ai';
import prisma, { withRetry } from '../lib/prisma.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { enforceAiLimit, getUsageStatus } from '../middleware/freemiumLimiter.js';
import { extractDocumentText } from '../lib/docExtractor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

// Common LaTeX commands starting with JSON escape letters (b, f, n, r, t) that must NOT turn into control chars
const LATEX_ESCAPE_COLLISION_RE =
  /(?<!\\)\\(?:frac|forall|beta|binom|begin|bar|mathbf|mathbb|theta|times|tau|text|textbf|textrm|to|triangle|tan|tanh|rightarrow|Rightarrow|rho|rangle|lceil|rfloor|nabla|neq|nu|notin|ni|natural|norm)\b/g;

export const cleanJson = (text) => {
  if (!text) return '';
  let cleaned = String(text).trim();
  const fenced = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced && fenced[1]) {
    cleaned = fenced[1].trim();
  } else {
    cleaned = cleaned
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/, '')
      .replace(/```\s*$/, '')
      .trim();
  }

  const firstBrace = cleaned.indexOf('{');
  const firstBracket = cleaned.indexOf('[');

  let extracted = cleaned;
  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    const lastBrace = cleaned.lastIndexOf('}');
    if (lastBrace !== -1 && lastBrace > firstBrace) {
      extracted = cleaned.slice(firstBrace, lastBrace + 1);
    }
  } else if (firstBracket !== -1) {
    const lastBracket = cleaned.lastIndexOf(']');
    if (lastBracket !== -1 && lastBracket > firstBracket) {
      extracted = cleaned.slice(firstBracket, lastBracket + 1);
    }
  }

  // 1) Escape LaTeX commands colliding with \b, \f, \n, \r, \t (e.g. \frac, \theta, \beta, \nabla, \times)
  const latexProtected = extracted
    .replace(LATEX_ESCAPE_COLLISION_RE, (m) => '\\' + m)
    .replace(/(?<!\\)\\([bf])(?=[a-zA-Z])/g, '\\\\$1');

  // 2) Escape any remaining non-JSON backslashes (e.g. \pi, \alpha, \sum, \sqrt, \ge, \le)
  return latexProtected.replace(/(?<!\\)\\(?!["\\/bfnrt]|u[0-9a-fA-F]{4})/g, '\\\\');
};

const parseGeminiJson = (rawText) => {
  if (!rawText) return null;
  const trimmed = String(rawText).trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    // Fall through to sanitized extraction
  }
  const cleaned = cleanJson(trimmed);
  try {
    return JSON.parse(cleaned);
  } catch {
    return JSON.parse(cleaned.replace(/(?<!\\)[\r\n]+/g, ' '));
  }
};

// Singleton GoogleGenerativeAI client
let cachedGenAI = null;
let cachedGenAIKey = '';
const getGenAIClient = () => {
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY_HERE') return null;
  if (!cachedGenAI || cachedGenAIKey !== apiKey) {
    cachedGenAI = new GoogleGenerativeAI(apiKey);
    cachedGenAIKey = apiKey;
  }
  return cachedGenAI;
};

// Helper to initialize Gemini with active model support
export const getGeminiModel = (modelName = 'gemini-3.5-flash-lite') => {
  const genAI = getGenAIClient();
  if (!genAI) return null;
  try {
    return genAI.getGenerativeModel({ model: modelName });
  } catch (err) {
    console.error('Error initializing Gemini client:', err);
    return null;
  }
};

// Proven fastest live Google AI models (1.3s–4.5s typical; 16s cap allows long 1-page Cheat Sheets to finish)
const FAST_GEMINI_MODELS = [
  { name: 'gemini-3.5-flash-lite', timeoutMs: 16000 },
  { name: 'gemini-flash-lite-latest', timeoutMs: 16000 },
];
// Secondary independent Gemini clusters (tight 8s cap so slow preview waves never add 35s+ lag)
const BACKUP_GEMINI_MODELS = [
  { name: 'gemini-3.1-flash-lite-preview', timeoutMs: 8000 },
  { name: 'gemini-4-hydrogen', timeoutMs: 8000 },
];

// Short 12s cooldown for transient 503/429/timeouts (never ban healthy models for 10 min!), 10 min only for 404
const NOT_FOUND_COOLDOWN_MS = 10 * 60 * 1000;
const TRANSIENT_COOLDOWN_MS = 12 * 1000;
const unhealthyModelUntil = new Map();
const notFoundModels = new Set();
let roundRobinCursor = 0;

const extractGeminiText = (response) => {
  const parts = response?.candidates?.[0]?.content?.parts;
  if (Array.isArray(parts) && parts.length > 0) {
    const visible = parts
      .filter((p) => !p?.thought && typeof p?.text === 'string')
      .map((p) => p.text)
      .join('')
      .trim();
    if (visible) return visible;
  }
  try {
    return typeof response?.text === 'function' ? String(response.text() || '').trim() : '';
  } catch {
    return '';
  }
};

const invokeModelOnce = async (genAI, modelName, contents, options, timeoutMs) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const mergedOptions = {
      ...options,
      generationConfig: {
        maxOutputTokens: 2048,
        ...(options?.generationConfig || {}),
      },
    };
    const model = genAI.getGenerativeModel({ model: modelName, ...mergedOptions });
    const result = await model.generateContent(contents, { signal: controller.signal });
    const text = extractGeminiText(result?.response);
    if (!text) {
      throw new Error('Empty AI response');
    }
    unhealthyModelUntil.delete(modelName);
    return { text, modelName };
  } catch (err) {
    const msg = String(err?.message || '');
    console.warn(`[AI] ${modelName} failed:`, msg.slice(0, 160));
    if (msg.includes('404') || msg.includes('Not Found')) {
      notFoundModels.add(modelName);
      unhealthyModelUntil.set(modelName, Date.now() + NOT_FOUND_COOLDOWN_MS);
    } else if (!msg.includes('400') && !msg.includes('Bad Request')) {
      unhealthyModelUntil.set(modelName, Date.now() + TRANSIENT_COOLDOWN_MS);
    } else {
      err.isBadRequest = true;
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
};

// Live-verified Groq models (Nov 2026): 0.4s–2.7s real AI responses across 3 independent RPM pools
const GROQ_TEXT_MODELS = ['openai/gpt-oss-120b', 'qwen/qwen3.8-27b', 'openai/gpt-oss-20b'];
const GROQ_VISION_MODELS = ['qwen/qwen3.8-27b'];
let groqRoundRobinCursor = 0;

export const formatPoweredBy = (aiRes) => {
  if (!aiRes) return 'StudySquad Smart Engine';
  if (aiRes.provider === 'Groq') {
    return `Groq AI (${aiRes.modelName})`;
  }
  return `Google Gemini (${aiRes.modelName})`;
};

// Zero-dependency Groq real-AI backup (sub-1-second Llama 3.3 70B when Google Free Tier hits 503 spikes)
const generateWithGroq = async (contents, options = {}) => {
  const apiKey = (process.env.GROQ_API_KEY || '').trim();
  if (!apiKey || apiKey === 'YOUR_GROQ_API_KEY_HERE') return null;

  let hasImage = false;
  let messageContent = '';

  if (typeof contents === 'string') {
    messageContent = contents;
  } else if (Array.isArray(contents)) {
    const parts = [];
    for (const item of contents) {
      if (typeof item === 'string') {
        parts.push({ type: 'text', text: item });
      } else if (item?.inlineData?.data && item?.inlineData?.mimeType) {
        if (!item.inlineData.mimeType.startsWith('image/')) {
          // Non-image binary attachments (e.g. raw PDF) are handled by Gemini only
          return null;
        }
        hasImage = true;
        parts.push({
          type: 'image_url',
          image_url: {
            url: `data:${item.inlineData.mimeType};base64,${item.inlineData.data}`,
          },
        });
      }
    }
    if (parts.length === 0) return null;
    messageContent = hasImage ? parts : parts.map((p) => p.text).join('\n');
  } else {
    return null;
  }

  let candidateModels = GROQ_VISION_MODELS;
  if (!hasImage) {
    const start = groqRoundRobinCursor++ % GROQ_TEXT_MODELS.length;
    candidateModels =
      start === 0
        ? GROQ_TEXT_MODELS
        : [...GROQ_TEXT_MODELS.slice(start), ...GROQ_TEXT_MODELS.slice(0, start)];
  }
  const temperature =
    typeof options?.generationConfig?.temperature === 'number'
      ? Math.min(1, Math.max(0, options.generationConfig.temperature))
      : 0.7;
  const maxTokens = Math.min(
    4096,
    Number(options?.generationConfig?.maxOutputTokens) || 2048
  );

  for (const modelName of candidateModels) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: modelName,
          messages: [{ role: 'user', content: messageContent }],
          temperature,
          max_tokens: maxTokens,
        }),
      });
      if (!res.ok) {
        const errBody = await res.text().catch(() => '');
        console.warn(`[AI/Groq] ${modelName} HTTP ${res.status}:`, errBody.slice(0, 140));
        continue;
      }
      const data = await res.json();
      const text = String(data?.choices?.[0]?.message?.content || '')
        .replace(/<think>[\s\S]*?<\/think>/gi, '')
        .trim();
      if (text) {
        return { text, modelName, provider: 'Groq' };
      }
    } catch (err) {
      console.warn(`[AI/Groq] ${modelName} failed:`, String(err?.message || '').slice(0, 140));
    } finally {
      clearTimeout(timer);
    }
  }
  return null;
};

// Fast-first multi-cluster Gemini + instant Groq backup generator:
// 1) Primary #1: Round-robins across Google's 2 proven sub-4s Flash Lite models
// 2) Instant Backup: If Google Free Tier spikes (503/timeout), immediately switches to Groq Llama 3.3 70B (~0.8s!)
// 3) Secondary Fallback: Gemini retry + independent Gemini 3.1 / 4 clusters if Groq isn't configured
export const generateWithGemini = async (contents, options = {}) => {
  const genAI = getGenAIClient();
  const hasGroqKey = Boolean(
    (process.env.GROQ_API_KEY || '').trim() &&
      (process.env.GROQ_API_KEY || '').trim() !== 'YOUR_GROQ_API_KEY_HERE'
  );

  if (!genAI) {
    return hasGroqKey ? await generateWithGroq(contents, options) : null;
  }

  const activeFast = FAST_GEMINI_MODELS.filter((m) => !notFoundModels.has(m.name));
  const activeBackup = BACKUP_GEMINI_MODELS.filter((m) => !notFoundModels.has(m.name));

  // Alternate starting fast model to spread RPM evenly across both Flash Lite endpoints
  const startIdx = activeFast.length > 1 ? roundRobinCursor++ % activeFast.length : 0;
  const rotatedFast =
    startIdx === 0 ? activeFast : [...activeFast.slice(startIdx), ...activeFast.slice(0, startIdx)];

  const now = Date.now();
  const fastOrdered = [
    ...rotatedFast.filter((m) => (unhealthyModelUntil.get(m.name) || 0) <= now),
    ...rotatedFast.filter((m) => (unhealthyModelUntil.get(m.name) || 0) > now),
  ];

  // Pass 1: Google Gemini Fast Pair (6.5s cap for normal calls / 9.5s for dense sheets when Groq backup is armed)
  const requestedTokens = Number(options?.generationConfig?.maxOutputTokens) || 2048;
  const pass1Timeout = hasGroqKey ? (requestedTokens >= 2500 ? 9500 : 6500) : null;
  for (const entry of fastOrdered) {
    const attemptStart = Date.now();
    try {
      return await invokeModelOnce(
        genAI,
        entry.name,
        contents,
        options,
        pass1Timeout || entry.timeoutMs
      );
    } catch (err) {
      if (err?.isBadRequest) return null;
      // If Gemini stalled for >=6s and Groq backup is ready, jump straight to Groq instead of stalling another 6.5s
      if (hasGroqKey && Date.now() - attemptStart >= 6000) {
        break;
      }
    }
  }

  // Pass 2: Instant Groq Llama 3.3 70B real-AI backup (answers in ~0.6s-1.5s whenever Google hits 503!)
  if (hasGroqKey) {
    const groqRes = await generateWithGroq(contents, options);
    if (groqRes && groqRes.text) {
      return groqRes;
    }
  }

  // Pass 3: Brief 900ms pause then retry Gemini fast pair
  await new Promise((r) => setTimeout(r, 900));
  for (const entry of rotatedFast) {
    try {
      return await invokeModelOnce(genAI, entry.name, contents, options, entry.timeoutMs);
    } catch (err) {
      if (err?.isBadRequest) return null;
    }
  }

  // Pass 4: Secondary independent Gemini clusters (tight 8s cap)
  for (const entry of activeBackup) {
    try {
      return await invokeModelOnce(genAI, entry.name, contents, options, entry.timeoutMs);
    } catch (err) {
      if (err?.isBadRequest) return null;
    }
  }

  // Pass 5: Final fast-pair recovery after 1.5s
  await new Promise((r) => setTimeout(r, 1500));
  for (const entry of rotatedFast) {
    try {
      return await invokeModelOnce(genAI, entry.name, contents, options, entry.timeoutMs);
    } catch (err) {
      if (err?.isBadRequest) return null;
    }
  }

  return null;
};

// Multi-provider structured JSON generator:
// Guarantees 100% real AI JSON by retrying across Google Gemini <-> Groq if any single model outputs malformed JSON.
const generateStructuredAi = async (prompt, validateFn, options = {}) => {
  const firstRes = await generateWithGemini(prompt, options);
  if (firstRes && firstRes.text) {
    try {
      const parsed = parseGeminiJson(firstRes.text);
      if (!validateFn || validateFn(parsed)) {
        return { parsed, aiRes: firstRes };
      }
    } catch (err) {
      console.warn(`[AI JSON] Attempt 1 (${firstRes.modelName}) parse retry:`, err.message);
    }
  }

  const strictJsonPrompt = `${prompt}\n\nCRITICAL JSON RULE: Output ONLY raw valid JSON matching the requested schema. Do NOT wrap in prose or markdown commentary.`;

  // Cross-provider second pass (if Gemini slipped on JSON syntax, ask Groq; if Groq slipped, ask Gemini JSON mode)
  if (firstRes?.provider !== 'Groq') {
    const groqRetry = await generateWithGroq(strictJsonPrompt, options);
    if (groqRetry && groqRetry.text) {
      try {
        const parsed = parseGeminiJson(groqRetry.text);
        if (!validateFn || validateFn(parsed)) {
          return { parsed, aiRes: groqRetry };
        }
      } catch (err) {
        console.warn(`[AI JSON] Groq retry (${groqRetry.modelName}) parse failed:`, err.message);
      }
    }
  }

  const genAI = getGenAIClient();
  if (genAI) {
    for (const modelEntry of FAST_GEMINI_MODELS) {
      try {
        const jsonModeRes = await invokeModelOnce(
          genAI,
          modelEntry.name,
          strictJsonPrompt,
          {
            ...options,
            generationConfig: {
              ...(options?.generationConfig || {}),
              responseMimeType: 'application/json',
            },
          },
          10000
        );
        const parsed = parseGeminiJson(jsonModeRes.text);
        if (!validateFn || validateFn(parsed)) {
          return { parsed, aiRes: jsonModeRes };
        }
      } catch {
        // Continue to next fast Gemini model
      }
    }
  }

  return null;
};

const sendAiBusy503 = (res, featureLabel = 'AI') => {
  res.locals.aiUsedFallback = true;
  return res.status(503).json({
    error: 'AI_TEMPORARILY_BUSY',
    message: `Live ${featureLabel} servers experienced a momentary spike — no AI credit was deducted. Please click again in 2 seconds!`,
    retryable: true,
  });
};

// GET /api/ai/usage - Get current daily AI usage & limit status
router.get('/usage', optionalAuth, (req, res) => {
  const status = getUsageStatus(req.user, req.ip);
  return res.json(status);
});

// POST /api/ai/match - Smart squad matcher
router.post('/match', async (req, res) => {
  try {
    const rawBody = req.body || {};
    const categories = Array.isArray(rawBody.categories)
      ? rawBody.categories.filter((c) => typeof c === 'string').slice(0, 12)
      : [];
    const query = typeof rawBody.query === 'string' ? rawBody.query.slice(0, 300) : '';

    // Fetch active squads from database (bounded for scale)
    const squads = await withRetry(() =>
      prisma.squad.findMany({
        take: 60,
        orderBy: { createdAt: 'desc' },
        include: {
          owner: { select: { id: true, name: true, avatar: true } },
          members: { include: { user: { select: { id: true, name: true, avatar: true } } } },
          tasks: true,
        },
      })
    );

    if (squads.length === 0) {
      return res.json({ matches: [] });
    }

    try {
      const prompt = `
You are an expert AI Study Squad Matchmaker.
A student is looking for study partners.
Student's Selected Interests / Tags: ${JSON.stringify(categories)}
Student's Search / Query: "${query}"

Here are the available study squads:
${JSON.stringify(
  squads.map((s) => ({
    id: s.id,
    name: s.name,
    category: s.category,
    subject: s.subject,
    description: s.description,
    platform: s.platform,
    schedule: s.schedule,
    currentMembers: s.members.length,
    maxMembers: s.maxMembers,
  }))
)}

Analyze the student's interests and available squads. Select up to 4 best matching squads.
Respond ONLY with a valid JSON array in this format:
[
  {
    "squadId": "<squad-id>",
    "matchScore": 95,
    "reason": "Directly focuses on your selected subjects and offers active evening sessions."
  }
]
No markdown fences, no backticks, only raw JSON.
`;

      const structuredMatch = await generateStructuredAi(
        prompt,
        (arr) => Array.isArray(arr) && arr.length > 0
      );
      if (structuredMatch) {
        const matchedSquads = structuredMatch.parsed
          .map((m) => {
            const squad = squads.find((s) => s.id === m.squadId);
            if (!squad) return null;
            const { sharedNotes: _sn, ...publicSquad } = squad;
            return {
              ...publicSquad,
              memberCount: squad.members.length,
              members: squad.members.slice(0, 24).map((mem) => mem.user),
              aiMatchScore: m.matchScore,
              aiMatchReason: m.reason,
            };
          })
          .filter(Boolean);

        if (matchedSquads.length > 0) {
          return res.json({
            matches: matchedSquads,
            poweredBy: formatPoweredBy(structuredMatch.aiRes),
          });
        }
      }
    } catch (geminiError) {
      console.warn('AI squad match database filter fallback:', geminiError.message);
    }

    // Real Database Category & Keyword Match (if all live AI providers are momentarily busy)
    const scoredSquads = squads.map((squad) => {
      let score = 50;
      const reasons = [];

      const squadText = `${squad.name} ${squad.category} ${squad.subject} ${squad.description}`.toLowerCase();

      if (categories.length > 0) {
        const catMatched = categories.some(
          (c) =>
            squad.category.toLowerCase().includes(c.toLowerCase()) ||
            squadText.includes(c.toLowerCase())
        );
        if (catMatched) {
          score += 35;
          reasons.push(`Direct alignment with your interest in "${squad.category}"`);
        }
      }

      if (query && query.trim()) {
        const qTerms = query.toLowerCase().split(/\s+/).filter(Boolean);
        const termMatches = qTerms.filter((term) => squadText.includes(term));
        if (termMatches.length > 0) {
          score += 15 * termMatches.length;
          reasons.push(`Matches your search topic "${query}"`);
        }
      }

      if (squad.members.length > 0) {
        score += 10;
        reasons.push(`Active peer community (${squad.members.length} joined)`);
      }

      const finalScore = Math.min(Math.max(score, 60), 99);
      const reason =
        reasons.length > 0
          ? reasons.join('. ') + '.'
          : `Strong study track for ${squad.subject}.`;

      const { sharedNotes: _sn, ...publicSquad } = squad;
      return {
        ...publicSquad,
        memberCount: squad.members.length,
        members: squad.members.slice(0, 24).map((mem) => mem.user),
        aiMatchScore: finalScore,
        aiMatchReason: reason,
      };
    });

    scoredSquads.sort((a, b) => b.aiMatchScore - a.aiMatchScore);

    return res.json({
      matches: scoredSquads.slice(0, 6),
      poweredBy: 'Database Keyword Match',
    });
  } catch (error) {
    console.error('AI match error:', error);
    return res.status(500).json({ error: 'Failed to find AI matches.' });
  }
});

// POST /api/ai/suggest-goals - Generate study goals for a squad (100% Real AI)
router.post('/suggest-goals', optionalAuth, enforceAiLimit, async (req, res) => {
  try {
    const { squadName = '', subject = '', category = '' } = req.body || {};

    const prompt = `
You are an expert academic coach and study planner.
Generate 3 concrete, highly actionable study goals/tasks for a study squad with:
- Squad Name: "${squadName}"
- Subject: "${subject}"
- Category: "${category}"

Return ONLY a JSON array of 3 string items.
Example: ["Solve 3 medium DP problems on LeetCode", "Complete mock interview on Graph traversal", "Review time complexity cheat sheet"]
No extra text or backticks.
`;
    const structured = await generateStructuredAi(
      prompt,
      (g) => Array.isArray(g) && g.length > 0
    );
    if (structured) {
      return res.json({
        goals: structured.parsed,
        poweredBy: formatPoweredBy(structured.aiRes),
      });
    }

    return sendAiBusy503(res, 'AI Study Goals');
  } catch (error) {
    console.error('Suggest goals error:', error);
    return sendAiBusy503(res, 'AI Study Goals');
  }
});

// POST /api/ai/generate-flashcards - Generate active recall flashcards (100% Real AI)
router.post('/generate-flashcards', requireAuth, enforceAiLimit, async (req, res) => {
  try {
    const { subject = '', category = '', topic = '', notes = '' } = req.body || {};
    const cleanNotes = typeof notes === 'string' ? notes.trim() : '';
    const sourceContext =
      cleanNotes.length > 15
        ? cleanNotes.slice(0, 1500)
        : topic || subject || category || 'General Knowledge';

    const prompt = `
You are an expert academic coach and spaced repetition tutor.
Create 6 high-yield, engaging study flashcards for active recall.
Subject: "${subject}"
Category: "${category}"
Context / Notes / Topic: "${sourceContext}"

Each flashcard MUST have:
- "id": unique string like "fc-1", "fc-2"
- "front": A clear, thought-provoking question, formula, or concept challenge.
- "back": A clear, concise, memorable explanation, definition, or solution.
- "tag": A 1-2 word concept tag (e.g. "Algorithm", "Theorem", "Syntax", "Core Concept").
Use clean readable Unicode math (e.g. O(n log n), n², ≤, ≥, →, ∞, √n) instead of raw LaTeX backslash commands.

Return ONLY a valid JSON array of 6 objects. No markdown backticks, no code fence, only raw JSON:
[
  {
    "id": "fc-1",
    "front": "Question here",
    "back": "Answer here",
    "tag": "Concept"
  }
]
`;
    const structured = await generateStructuredAi(
      prompt,
      (cards) => Array.isArray(cards) && cards.length > 0
    );
    if (structured) {
      return res.json({
        flashcards: structured.parsed,
        poweredBy: formatPoweredBy(structured.aiRes),
      });
    }

    return sendAiBusy503(res, '3D Flashcard AI');
  } catch (error) {
    console.error('Generate flashcards error:', error);
    return sendAiBusy503(res, '3D Flashcard AI');
  }
});

// POST /api/ai/generate-quiz - Generate active recall multiple-choice quiz (100% Real AI)
router.post('/generate-quiz', requireAuth, enforceAiLimit, async (req, res) => {
  try {
    const { subject = '', category = '', topic = '', notes = '' } = req.body || {};
    const cleanNotes = typeof notes === 'string' ? notes.trim() : '';
    const sourceContext =
      cleanNotes.length > 15
        ? cleanNotes.slice(0, 1500)
        : topic || subject || category || 'General Knowledge';

    const prompt = `
You are an expert exam creator and professor.
Create a 5-question multiple choice practice quiz for students studying:
Subject: "${subject}"
Category: "${category}"
Topic / Notes: "${sourceContext}"

Each question MUST have:
- "id": string like "q-1", "q-2"
- "question": Clear, challenging question testing real understanding.
- "options": Array of 4 plausible answer choices.
- "answerIndex": 0-based integer index of the correct answer (0, 1, 2, or 3).
- "explanation": 1-2 sentence explanation of why the correct option is right.
Use clean readable Unicode math (e.g. O(n log n), n², ≤, ≥, →, ∞, √n) instead of raw LaTeX backslash commands.

Return ONLY a valid JSON array of 5 objects. No markdown backticks, no code fence, only raw JSON:
[
  {
    "id": "q-1",
    "question": "Question text here?",
    "options": ["Choice A", "Choice B", "Choice C", "Choice D"],
    "answerIndex": 1,
    "explanation": "Why choice B is correct."
  }
]
`;
    const structured = await generateStructuredAi(
      prompt,
      (quiz) => Array.isArray(quiz) && quiz.length > 0
    );
    if (structured) {
      return res.json({
        quiz: structured.parsed,
        questions: structured.parsed,
        poweredBy: formatPoweredBy(structured.aiRes),
      });
    }

    return sendAiBusy503(res, 'Practice Quiz AI');
  } catch (error) {
    console.error('Generate quiz error:', error);
    return sendAiBusy503(res, 'Practice Quiz AI');
  }
});

// POST /api/ai/squad-bot - In-room AI Tutor & Assistant
router.post('/squad-bot', optionalAuth, enforceAiLimit, async (req, res) => {
  try {
    const {
      query = '',
      context = {},
      history = [],
      mode = 'chat', // 'chat' | 'summarize-notes' | 'study-agenda'
      image = null, // optional base64 data URL from pasted screenshot
    } = req.body || {};

    const safeQuery = typeof query === 'string' ? query.slice(0, 4000) : '';
    const safeContext = context && typeof context === 'object' ? context : {};
    const {
      subject = '',
      category = '',
      squadName = '',
      sharedNotes = '',
      tasks = [],
    } = safeContext;
    const safeTasks = Array.isArray(tasks) ? tasks : [];
    const safeNotes = typeof sharedNotes === 'string' ? sharedNotes : '';

    let prompt = '';
    if (mode === 'summarize-notes') {
      prompt = `You are StudySquad AI, an academic tutor assisting the "${squadName || 'Study'}" squad.
The squad is studying ${subject || 'General Studies'} (${category || 'Academics'}).
Here are their collaborative shared study notes:
"""
${safeNotes.slice(0, 4000) || 'No notes written yet.'}
"""

Please provide a concise, high-yield summary of these study notes:
1. 🎯 Core Key Concepts & Takeaways (bullet points)
2. 💡 Key Formulas / Definitions / Terms
3. ⚠️ Common Exam Pitfalls or Tricky Points to Remember
Format cleanly with Markdown bullet points and bold headers.`;
    } else if (mode === 'study-agenda') {
      prompt = `You are StudySquad AI, an academic study coach.
The squad "${squadName || 'Study'}" is preparing for a collaborative focus session on ${subject || 'their coursework'} (${category || 'Academics'}).
Current squad study goals/tasks: ${JSON.stringify(safeTasks.map((t) => t?.text || t))}

Generate an inspiring, high-yield 60-Minute Study Session Agenda:
- 00-05m: Quick check-in & goal alignment
- 05-30m: Sprint 1 (Deep Work Pomodoro - Focus on hardest topic)
- 30-35m: Peer sync & water break
- 35-55m: Sprint 2 (Active Recall & problem solving)
- 55-60m: Wrap-up & milestone checklist
Tailor the specific tasks and topics to ${subject}. Format clearly with Markdown.`;
    } else {
      const historySnippet =
        Array.isArray(history) && history.length > 0
          ? `Conversation History:\n${history
              .slice(-8)
              .map((m) => `${m?.sender === 'user' ? 'Student' : 'Tutor'}: ${String(m?.text || '').slice(0, 800)}`)
              .join('\n')}\n\n`
          : '';

      const effectiveQuery =
        safeQuery ||
        (image
          ? 'Please analyze this screenshot/image and explain the solution, answer, or concepts step-by-step.'
          : '');

      prompt = `You are a brilliant, warm, knowledgeable AI assistant and personal tutor (like ChatGPT / Gemini) chatting 1-on-1 with a student.
You can answer LITERALLY ANY question across ALL topics — coding, algorithms, math, science, movies, pop culture, history, geography, career advice, writing, brainstorming, general knowledge, or friendly everyday chat.
Optional Study Room Context (ONLY use this if the student's question is actually about this subject; NEVER force unrelated questions back to this topic): "${squadName || 'StudySquad'}" • Subject: "${subject || 'General Studies'}" (${category || 'Academics'}).

${safeNotes ? `Relevant notes from squad session (only reference if relevant to the question):\n"""\n${safeNotes.slice(0, 800)}\n"""\n\n` : ''}${historySnippet}Student: "${effectiveQuery}"

Guidelines for your response:
1. **Answer ANYTHING the student asks directly and accurately**: Whether it is coding/DSA with runnable examples, a movie question, a math derivation, general knowledge, or casual conversation, give a real, complete, helpful answer immediately — never deflect or give generic study tips.
2. **Natural, clear, high-caliber tone**: Be conversational, helpful, and direct. Use bolding for key terms, clean step-by-step explanations, syntax-highlighted code blocks for programming questions, and clean readable Unicode math (O(n log n), n², ≤, ≥, →, ∞, √n) instead of raw LaTeX backslashes where practical.
3. **Visual & Screenshot Analysis**: If an image or screenshot is attached, carefully inspect its visual content (equations, code, diagrams, problem text, slides, or questions) and solve/explain it step-by-step.`;
    }

    try {
      let contents = prompt;
      if (
        image &&
        typeof image === 'string' &&
        image.startsWith('data:image/') &&
        image.length <= 5_500_000
      ) {
        const matches = image.match(/^data:(image\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
        if (matches) {
          contents = [
            prompt,
            {
              inlineData: {
                mimeType: matches[1],
                data: matches[2],
              },
            },
          ];
        }
      }

      const geminiResult = await generateWithGemini(contents, {
        generationConfig: {
          temperature: 0.75,
          topP: 0.95,
        },
      });
      if (geminiResult && geminiResult.text) {
        return res.json({
          response: geminiResult.text,
          poweredBy: formatPoweredBy(geminiResult),
          mode,
        });
      }
    } catch (geminiErr) {
      console.warn('Gemini squad-bot call error, falling back:', geminiErr.message);
    }

    // Honest notice only if all live AI providers are simultaneously unreachable (zero fake bot replies, zero credit charged)
    if (mode === 'summarize-notes' && (!safeNotes || safeNotes.trim().length < 10)) {
      res.locals.aiUsedFallback = true;
      return res.json({
        response: `📝 **Squad Notes Summary**\n\nYour squad hasn't added notes in the **Resources & Notes** tab yet! Open **Resources & Notes**, jot down your lecture takeaways or formulas, and click **Summarize Notes** again.`,
        poweredBy: 'StudySquad Notes Check',
        mode,
      });
    }

    return sendAiBusy503(res, 'AI Study Tutor');
  } catch (error) {
    console.error('Squad bot error:', error);
    return sendAiBusy503(res, 'AI Study Tutor');
  }
});

// POST /api/ai/chat-doc - Chat with uploaded Lecture PDF, PPTX/DOCX Slides, Images, or Notes
router.post('/chat-doc', requireAuth, enforceAiLimit, async (req, res) => {
  try {
    const {
      squadId,
      resourceId,
      fileName = '',
      fileUrl = '',
      query = 'Summarize this document',
    } = req.body || {};

    if (typeof query !== 'string' || !query.trim()) {
      return res.status(400).json({ error: 'Query is required.' });
    }
    const cleanQuery = query.trim().slice(0, 3000);

    // Look up resource record & verify squad access so users cannot probe unauthorized squad files
    let resourceRecord = null;
    if (resourceId && typeof resourceId === 'string') {
      resourceRecord = await withRetry(() =>
        prisma.resource.findUnique({
          where: { id: resourceId },
          include: {
            squad: {
              select: {
                id: true,
                ownerId: true,
                members: { where: { userId: req.user.id }, select: { id: true } },
              },
            },
          },
        })
      );
    } else if (squadId && fileUrl) {
      resourceRecord = await withRetry(() =>
        prisma.resource.findFirst({
          where: { squadId: String(squadId), url: String(fileUrl) },
          include: {
            squad: {
              select: {
                id: true,
                ownerId: true,
                members: { where: { userId: req.user.id }, select: { id: true } },
              },
            },
          },
        })
      );
    }

    if (resourceRecord?.squad) {
      const isAllowed =
        resourceRecord.squad.ownerId === req.user.id ||
        resourceRecord.squad.members.length > 0;
      if (!isAllowed) {
        return res.status(403).json({
          error: 'Join this study squad first to analyze its uploaded documents.',
        });
      }
    } else if (squadId && typeof squadId === 'string') {
      const sq = await withRetry(() =>
        prisma.squad.findUnique({
          where: { id: squadId },
          select: {
            ownerId: true,
            members: { where: { userId: req.user.id }, select: { id: true } },
          },
        })
      );
      if (sq && sq.ownerId !== req.user.id && sq.members.length === 0) {
        return res.status(403).json({
          error: 'Join this study squad first to analyze its uploaded documents.',
        });
      }
    }

    const effectiveFileUrl = resourceRecord?.url || (typeof fileUrl === 'string' ? fileUrl : '');
    const effectiveTitle =
      (typeof fileName === 'string' && fileName.trim()) ||
      resourceRecord?.title ||
      'Study Document';

    // Resolve local file path strictly via an authorized squad resourceRecord (blocks unlinked /uploads/ probing)
    let localFilePath = null;
    if (resourceRecord?.url && resourceRecord.url.startsWith('/uploads/')) {
      const fileNameOnly = path.basename(resourceRecord.url);
      const uploadsDir = process.env.UPLOADS_DIR
        ? path.resolve(process.env.UPLOADS_DIR)
        : path.resolve(__dirname, '..', 'uploads');
      const resolvedPath = path.resolve(uploadsDir, fileNameOnly);

      if (resolvedPath.startsWith(uploadsDir) && fs.existsSync(resolvedPath)) {
        localFilePath = resolvedPath;
      }
    }

    const docPrompt = `You are StudySquad Document AI Assistant. A student in a collaborative study group is studying this document: "${effectiveTitle}".

Student's Question:
"${cleanQuery}"

Instructions:
1. Provide a comprehensive, accurate answer based directly on the document's content.
2. If summarizing, highlight:
   - 🎯 Main Theme & Learning Objectives
   - 📌 Key Concepts, Rules, or Derivations
   - 💡 3 Key Exam Takeaways
3. If the student asks a specific question, answer directly with slide/page/section context where visible.
4. Format cleanly using Markdown with bullet points, bold terms, and code blocks if relevant.`;

    if (localFilePath && fs.existsSync(localFilePath)) {
      try {
        const ext = path.extname(localFilePath).toLowerCase();
        const stat = fs.statSync(localFilePath);

        if (stat.size <= 20 * 1024 * 1024) {
          let geminiResult = null;

          if (ext === '.pdf' || ['.png', '.jpg', '.jpeg'].includes(ext)) {
            const fileBuffer = await fs.promises.readFile(localFilePath);
            const mimeType =
              ext === '.pdf'
                ? 'application/pdf'
                : ext === '.png'
                ? 'image/png'
                : 'image/jpeg';

            geminiResult = await generateWithGemini([
              docPrompt,
              {
                inlineData: {
                  data: fileBuffer.toString('base64'),
                  mimeType,
                },
              },
            ]);
          } else {
            // Office (.pptx, .docx) and text (.txt, .md, .csv, .json) — extract text cleanly!
            const extracted =
              resourceRecord?.extractedText || extractDocumentText(localFilePath, ext);

            if (extracted && resourceRecord && !resourceRecord.extractedText) {
              prisma.resource
                .update({
                  where: { id: resourceRecord.id },
                  data: { extractedText: extracted },
                })
                .catch(() => {});
            }

            if (extracted) {
              geminiResult = await generateWithGemini(
                `${docPrompt}\n\nExtracted Document Content:\n"""\n${extracted.slice(0, 50000)}\n"""`
              );
            }
          }

          if (geminiResult && geminiResult.text) {
            return res.json({
              answer: geminiResult.text,
              fileName: effectiveTitle,
              poweredBy: formatPoweredBy(geminiResult),
            });
          }
        }
      } catch (docErr) {
        console.warn('Gemini doc analysis error, trying persisted text fallback:', docErr.message);
      }
    }

    // Persisted PostgreSQL text path (survives Render container redeploys!)
    if (resourceRecord?.extractedText && resourceRecord.extractedText.trim()) {
      try {
        const geminiResult = await generateWithGemini(
          `${docPrompt}\n\nExtracted Document Content:\n"""\n${resourceRecord.extractedText.slice(0, 50000)}\n"""`
        );
        if (geminiResult && geminiResult.text) {
          return res.json({
            answer: geminiResult.text,
            fileName: effectiveTitle,
            poweredBy: formatPoweredBy(geminiResult),
          });
        }
      } catch (persistErr) {
        console.warn('Gemini persisted doc text error:', persistErr.message);
      }
    }

    // Topic-level academic fallback if file is an external link or legacy pre-persistence upload
    try {
      const prompt = `You are StudySquad Document AI Assistant. The student is asking about their study resource titled "${effectiveTitle}"${
        effectiveFileUrl.startsWith('http') ? ` (${effectiveFileUrl})` : ''
      }.
Student's Question: "${cleanQuery}"

Provide a clear, detailed, academically rigorous explanation covering the concepts in "${effectiveTitle}". Format in clean Markdown with key takeaways and bullet points.`;
      const geminiResult = await generateWithGemini(prompt);
      if (geminiResult && geminiResult.text) {
        return res.json({
          answer: geminiResult.text,
          fileName: effectiveTitle,
          poweredBy: formatPoweredBy(geminiResult),
        });
      }
    } catch (err) {
      console.warn('Gemini fallback text call error:', err.message);
    }

    return sendAiBusy503(res, 'Document AI');
  } catch (error) {
    console.error('Chat doc error:', error);
    return sendAiBusy503(res, 'Document AI');
  }
});

// POST /api/ai/viva-simulator - Interactive AI Viva / Oral Exam Simulator
router.post('/viva-simulator', requireAuth, enforceAiLimit, async (req, res) => {
  try {
    const {
      subject: rawSubject = 'Computer Science',
      topic: rawTopic = 'Data Structures & Algorithms',
      level: rawLevel = 'College Viva',
      questionNumber = 1,
      totalQuestions = 5,
      userResponse: rawUserResponse = '',
      previousQuestion = '',
      vivaHistory = [],
      excludeQuestions = [],
    } = req.body || {};

    const subject = typeof rawSubject === 'string' && rawSubject.trim() ? rawSubject.trim() : 'Computer Science';
    const topic = typeof rawTopic === 'string' && rawTopic.trim() ? rawTopic.trim() : 'Data Structures & Algorithms';
    const level = typeof rawLevel === 'string' && rawLevel.trim() ? rawLevel.trim() : 'College Viva';
    const userResponse = typeof rawUserResponse === 'string' ? rawUserResponse : '';

    const isFirstQuestion = !userResponse || userResponse.trim().length === 0;
    const targetNum = Number(totalQuestions);

    let roundFocusDesc = 'Foundational comprehension & core working principles.';
    if (targetNum === 5) {
      roundFocusDesc = 'Quick 5-Question Sprint: Focus on high-yield core definitions, foundational invariants, and baseline concepts.';
    } else if (targetNum === 10) {
      roundFocusDesc = 'Standard 10-Question Rigor: Focus on algorithmic trade-offs, internal data structures, call stack vs heap memory, and runtime complexity.';
    } else if (targetNum === 15) {
      roundFocusDesc = 'Mastery 15-Question Defense: Focus on advanced architecture, failure handling, edge cases, cache locality, and deep technical nuances.';
    } else if (targetNum === 0) {
      roundFocusDesc = 'Continuous Marathon: Adaptive broad-spectrum questions testing problem synthesis across diverse paradigms.';
    }

    const stageStr = targetNum > 0
      ? `Question ${questionNumber} of ${targetNum}`
      : `Question ${questionNumber} (Continuous Oral Defense Marathon)`;

    const exclusions = [
      previousQuestion,
      ...(Array.isArray(excludeQuestions) ? excludeQuestions : []),
      ...(Array.isArray(vivaHistory) ? vivaHistory.map(h => h.question) : [])
    ].filter(Boolean);

    const historyText = Array.isArray(vivaHistory) && vivaHistory.length > 0
      ? `\nPrevious Questions & Student Answers so far:\n` +
        vivaHistory
          .slice(-6)
          .map((h, i) => `Q${i + 1}: "${h.question}"\nStudent: "${h.userResponse}"\nExaminer Score: ${h.score}/10 | Critique: "${h.feedback}"`)
          .join('\n\n') + '\n\n'
      : '';

    const exclusionClause = exclusions.length > 0
      ? `\nCRITICAL DIVERSITY RULE: You MUST NOT repeat, rephrase, or ask anything similar to the following previously asked questions:\n${exclusions.slice(-5).map((q) => `• "${q}"`).join('\n')}\nPick a completely different subtopic, angle, or scenario of "${topic}".\n`
      : '';

    const prompt = isFirstQuestion
      ? `You are an elite academic professor and technical examiner conducting a live oral defense (${level}).
Subject: "${subject}"
Topic: "${topic}"
Target Rigor: "${level}"
Exam Format: ${stageStr} (${roundFocusDesc})
${exclusionClause}
Formulate a single, sharp, articulate oral exam question specifically testing "${topic || subject}".
Style Guidance:
- If "${level}" is 'College Viva', emphasize fundamental definitions, syllabus theory, and mechanics.
- If "${level}" is 'Technical Interview', emphasize real-world trade-offs, time/space complexity, and architecture.
- If "${level}" is 'Board Exam', emphasize structured scientific reasoning, precise laws, and derivations.
- If "${level}" is 'Competitive Exam', emphasize extreme edge cases, asymptotic bounds, and boundary violation traps.

Respond ONLY with a valid JSON object in this format (no markdown backticks, no code fence):
{
  "score": null,
  "feedback": "Welcome to your ${level}. Deliver your verbal response clearly with technical terminology, time/space complexities, and edge cases.",
  "modelAnswer": null,
  "nextQuestion": "Sharp opening question here...",
  "keyConcept": "Core Principle"
}`
      : `You are an elite academic professor and technical examiner conducting an oral exam.
Subject: "${subject}"
Topic: "${topic}"
Target Rigor: "${level}"
Current Stage: ${stageStr}.
${historyText}
Latest Question Asked: "${previousQuestion}"
Student's Response: "${userResponse}"
${exclusionClause}
Tasks:
1. Score the student's answer out of 10 based on conceptual accuracy, completeness, and boundary condition awareness.
2. Provide a 2-sentence constructive critique (explicitly cite what was accurate, and what was missing or shallow).
3. Provide the ideal concise model answer (2-3 sentences).
4. Formulate the NEXT question. CRITICAL RULES FOR NEXT QUESTION:
   - Must be completely fresh and DIFFERENT from all previous questions.
   - Drill deeper into trade-offs, boundary edge cases, mathematical/code derivations, or failure handling.
   - Actively challenge any gap or assumption in the student's response.
Respond ONLY with a valid JSON object in this format (no markdown backticks, no code fence):
{
  "score": 8,
  "feedback": "Critique on student response...",
  "modelAnswer": "Ideal concise model answer...",
  "nextQuestion": "Next challenging, probing question...",
  "keyConcept": "Concept tested"
}`;

    const structured = await generateStructuredAi(
      prompt,
      (p) => p && typeof p.nextQuestion === 'string' && p.nextQuestion.trim().length > 0
    );
    if (structured) {
      return res.json({
        ...structured.parsed,
        poweredBy: formatPoweredBy(structured.aiRes),
      });
    }

    return sendAiBusy503(res, 'Mock Viva AI');
  } catch (error) {
    console.error('Viva simulator error:', error);
    return sendAiBusy503(res, 'Mock Viva AI');
  }
});

// POST /api/ai/generate-cheatsheet - 1-Page High-Yield Revision Matrix (100% Real AI)
router.post('/generate-cheatsheet', requireAuth, enforceAiLimit, async (req, res) => {
  try {
    const {
      subject: rawSubject = 'Computer Science',
      topic: rawTopic = 'Data Structures & Algorithms',
      notes: rawNotes = '',
    } = req.body || {};
    const subject = typeof rawSubject === 'string' && rawSubject.trim() ? rawSubject.trim() : 'Computer Science';
    const topic = typeof rawTopic === 'string' && rawTopic.trim() ? rawTopic.trim() : 'Data Structures & Algorithms';
    const notes = typeof rawNotes === 'string' ? rawNotes : '';

    const prompt = `You are a world-class academic tutor and exam author.
Create an ultra-dense, high-impact "1-Page High-Yield Exam Cheat Sheet" for:
Subject: "${subject}"
Topic: "${topic}"
${notes ? `Squad Context Notes:\n"${notes.slice(0, 2000)}"` : ''}

Format cleanly in Markdown with bold headers, bullet points, and clear code/math snippets:
# ⚡ ${topic.toUpperCase()} — 1-PAGE HIGH-YIELD CHEAT SHEET
### 📌 1. Essential Formulas & Time/Space Complexities
### 🔑 2. Core Invariants & Must-Remember Definitions
### 💡 3. High-Yield Mnemonics & Mental Shortcuts
### ⚠️ 4. Top 5 Deadly Exam Traps & Examiner Gotchas
### 🏆 5. Archetype Question Checklist & Solution Blueprints

IMPORTANT FORMATTING RULE: Write math and complexity expressions in clean, human-readable Unicode (such as O(1), O(n), O(log n), O(n²), O(V + E), 2×, ≤, ≥, →, ⇒, ∞, √n) instead of raw LaTeX backslash commands (never write \\frac, \\lim, \\implies, \\times, or $...$ wrappers). Make it dense, rigorous, practical, and easy to scan on exam day.`;

    const geminiResult = await generateWithGemini(prompt, {
      generationConfig: { maxOutputTokens: 3000 },
    });
    if (geminiResult && geminiResult.text) {
      return res.json({
        cheatSheet: geminiResult.text,
        poweredBy: formatPoweredBy(geminiResult),
      });
    }

    return sendAiBusy503(res, 'Cheat Sheet AI');
  } catch (error) {
    console.error('Cheat sheet error:', error);
    return sendAiBusy503(res, 'Cheat Sheet AI');
  }
});

// POST /api/ai/feynman-explain - 3-Tier Concept Explainer (100% Real AI)
router.post('/feynman-explain', requireAuth, enforceAiLimit, async (req, res) => {
  try {
    const { concept = '', subject = 'General Studies' } = req.body || {};
    if (typeof concept !== 'string' || !concept.trim()) {
      return res.status(400).json({ error: 'Concept is required.' });
    }

    const prompt = `You are a master educator who uses the Feynman Technique.
Explain the following concept across 3 distinct mastery levels:
Concept: "${concept.trim()}"
Subject: "${subject}"

Level 1: 🧸 ELI5 Analogy (Explain like I'm 5 using an everyday, physical real-world metaphor without technical jargon).
Level 2: ⚙️ Academic & Technical Mechanics (Rigorous, step-by-step mathematical, algorithmic, or scientific explanation of how it actually works under the hood).
Level 3: ⚠️ Common Exam Traps & Misconceptions (The 3 most common mistakes students make on exams regarding this topic).

Use clean, human-readable Unicode math (like O(n log n), n², ≤, ≥, →, ∞, √n) instead of raw LaTeX backslash commands.

Respond ONLY with a valid JSON object in this format (no markdown backticks, no code fence):
{
  "concept": "${concept.trim()}",
  "eli5": "Everyday analogy here...",
  "mechanics": "Technical step-by-step explanation...",
  "examTraps": ["Trap 1", "Trap 2", "Trap 3"],
  "oneLineTakeaway": "Memorable one-line summary..."
}`;

    const structured = await generateStructuredAi(
      prompt,
      (p) => p && typeof p === 'object' && typeof p.eli5 === 'string' && p.eli5.trim().length > 0
    );
    if (structured) {
      return res.json({
        ...structured.parsed,
        poweredBy: formatPoweredBy(structured.aiRes),
      });
    }

    return sendAiBusy503(res, 'Feynman AI');
  } catch (error) {
    console.error('Feynman explainer error:', error);
    return sendAiBusy503(res, 'Feynman AI');
  }
});

// POST /api/ai/code-audit - Code & Solution Diagnostic Auditor (100% Real AI)
router.post('/code-audit', requireAuth, enforceAiLimit, async (req, res) => {
  try {
    const { code = '', language = 'javascript', problem = '' } = req.body || {};
    if (typeof code !== 'string' || !code.trim()) {
      return res.status(400).json({ error: 'Code or solution text is required.' });
    }

    const prompt = `You are a Principal Software Engineer and Competitive Programming Coach auditing a student's solution.
Problem Context: "${problem || 'Code Analysis'}"
Language: "${language}"
Code:
"""
${code.slice(0, 4000)}
"""

Audit the solution:
1. Status: "Optimal", "Suboptimal", or "Has Bugs"
2. Time Complexity (Big-O) with explanation.
3. Space Complexity (Big-O) with explanation.
4. Edge Cases: List 3 specific boundary edge cases (e.g. negative numbers, empty input, single element, overflow).
5. Critique: 2-3 sentences on code quality and readability.
6. Optimized Refactored Code: Clean, idiomatic, fully commented code.

Respond ONLY with a valid JSON object in this format (no markdown backticks, no code fence):
{
  "status": "Optimal",
  "timeComplexity": "O(n)",
  "spaceComplexity": "O(1)",
  "critique": "Critique here...",
  "edgeCases": ["Edge case 1", "Edge case 2", "Edge case 3"],
  "optimizedCode": "Optimized code string...",
  "keyAdvice": "Key takeaway advice..."
}`;

    const structured = await generateStructuredAi(
      prompt,
      (p) => p && typeof p === 'object' && typeof p.status === 'string' && p.status.trim().length > 0
    );
    if (structured) {
      return res.json({
        ...structured.parsed,
        poweredBy: formatPoweredBy(structured.aiRes),
      });
    }

    return sendAiBusy503(res, 'Code Audit AI');
  } catch (error) {
    console.error('Code audit error:', error);
    return sendAiBusy503(res, 'Code Audit AI');
  }
});

export default router;
