import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenerativeAI } from '@google/generative-ai';
import prisma from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

// Helper to clean raw text and extract pure JSON (stripping markdown fences if present)
export const cleanJson = (text) => {
  if (!text) return '';
  const cleaned = text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/, '')
    .replace(/```\s*$/, '')
    .trim();
  const match = cleaned.match(/\[[\s\S]*\]/) || cleaned.match(/\{[\s\S]*\}/);
  return match ? match[0] : cleaned;
};

// Helper to initialize Gemini with active model support
export const getGeminiModel = (modelName = 'gemini-flash-lite-latest') => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '' || apiKey === 'YOUR_GEMINI_API_KEY_HERE') {
    return null;
  }
  try {
    const genAI = new GoogleGenerativeAI(apiKey.trim());
    return genAI.getGenerativeModel({ model: modelName });
  } catch (err) {
    console.error('Error initializing Gemini client:', err);
    return null;
  }
};

// Resilient multi-model Gemini generator (falls back between active models)
export const generateWithGemini = async (contents, options = {}) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '' || apiKey === 'YOUR_GEMINI_API_KEY_HERE') {
    return null;
  }
  const candidateModels = [
    'gemini-flash-lite-latest',
    'gemini-3.5-flash',
    'gemini-flash-latest',
    'gemini-3.8-flash',
    'gemini-3.1-flash-lite',
  ];
  const genAI = new GoogleGenerativeAI(apiKey.trim());

  for (const modelName of candidateModels) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName, ...options });
      const result = await model.generateContent(contents);
      const text = result?.response?.text ? result.response.text() : '';
      if (text) {
        return { text, modelName };
      }
    } catch (err) {
      console.warn(`Gemini [${modelName}] failed (${err.message}), trying backup model...`);
    }
  }
  return null;
};

// POST /api/ai/match - Smart squad matcher
router.post('/match', async (req, res) => {
  try {
    const { categories = [], query = '' } = req.body;

    // Fetch all squads from database
    const squads = await prisma.squad.findMany({
      include: {
        owner: { select: { id: true, name: true, avatar: true } },
        members: { include: { user: { select: { id: true, name: true, avatar: true } } } },
        tasks: true
      }
    });

    if (squads.length === 0) {
      return res.json({ matches: [] });
    }

    const model = getGeminiModel();

    if (model) {
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
    maxMembers: s.maxMembers
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

        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const parsed = JSON.parse(cleanJson(text));

        const matchedSquads = parsed
          .map((m) => {
            const squad = squads.find((s) => s.id === m.squadId);
            if (!squad) return null;
            return {
              ...squad,
              memberCount: squad.members.length,
              members: squad.members.map((mem) => mem.user),
              aiMatchScore: m.matchScore,
              aiMatchReason: m.reason
            };
          })
          .filter(Boolean);

        if (matchedSquads.length > 0) {
          return res.json({ matches: matchedSquads, poweredBy: 'Gemini AI' });
        }
      } catch (geminiError) {
        console.warn('Gemini match failed or returned non-JSON, using heuristic matcher:', geminiError.message);
      }
    }

    // Heuristic Fallback Matcher (works reliably without API key)
    const scoredSquads = squads.map((squad) => {
      let score = 50;
      const reasons = [];

      const squadText = `${squad.name} ${squad.category} ${squad.subject} ${squad.description}`.toLowerCase();

      // Category matching
      if (categories.length > 0) {
        const catMatched = categories.some((c) =>
          squad.category.toLowerCase().includes(c.toLowerCase()) ||
          squadText.includes(c.toLowerCase())
        );
        if (catMatched) {
          score += 35;
          reasons.push(`Direct alignment with your interest in "${squad.category}"`);
        }
      }

      // Query matching
      if (query && query.trim()) {
        const qTerms = query.toLowerCase().split(/\s+/);
        const termMatches = qTerms.filter((term) => squadText.includes(term));
        if (termMatches.length > 0) {
          score += 15 * termMatches.length;
          reasons.push(`Matches your search topic "${query}"`);
        }
      }

      // Availability bonus
      if (squad.members.length < squad.maxMembers) {
        score += 10;
        reasons.push(`Active roster with ${squad.maxMembers - squad.members.length} open seats`);
      }

      const finalScore = Math.min(Math.max(score, 60), 99);
      const reason = reasons.length > 0
        ? reasons.join('. ') + '.'
        : `Strong study track for ${squad.subject} with balanced peer momentum.`;

      return {
        ...squad,
        memberCount: squad.members.length,
        members: squad.members.map((mem) => mem.user),
        aiMatchScore: finalScore,
        aiMatchReason: reason
      };
    });

    scoredSquads.sort((a, b) => b.aiMatchScore - a.aiMatchScore);

    return res.json({
      matches: scoredSquads.slice(0, 6),
      poweredBy: model ? 'Gemini AI' : 'Smart Heuristics (Add GEMINI_API_KEY for deep LLM analysis)'
    });
  } catch (error) {
    console.error('AI match error:', error);
    return res.status(500).json({ error: 'Failed to find AI matches.' });
  }
});

// POST /api/ai/suggest-goals - Generate study goals for a squad
router.post('/suggest-goals', async (req, res) => {
  try {
    const { squadName, subject, category } = req.body;
    const model = getGeminiModel();

    if (model) {
      try {
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
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const goals = JSON.parse(cleanJson(text));
        return res.json({ goals, poweredBy: 'Gemini AI' });
      } catch (err) {
        console.warn('Gemini goal suggestion failed, falling back:', err.message);
      }
    }

    // Heuristic Fallback Goals based on subject & curriculum
    const fallbackMap = {
      default: [
        `Complete deep dive into core ${subject || 'topic'} fundamentals`,
        `Solve 2 practical exercises and post solutions in squad chat`,
        `Conduct 20-minute peer review & recap session`
      ],
      cbse: [
        'Solve 15 NCERT Exemplar numericals and mark difficult concepts',
        'Write out key chemical equations and physics law derivations from memory',
        'Timed 45-minute drill solving previous 5-year CBSE board exam questions'
      ],
      cbse_physics: [
        'Derive Lens Maker formula, prism deviation, and Huygens wave optics principle',
        'Solve 15 NCERT Exemplar numericals on Electrostatics, Current Electricity & AC circuits',
        'Timed 1-hour previous 5-year CBSE Class 12 Physics question paper drill'
      ],
      cbse_chem: [
        'Practice 10 essential organic conversion roadmaps and name reactions (Aldol, Cannizzaro)',
        'Solve Nernst equation and First-Order Chemical Kinetics half-life numericals',
        'Revise d & f block properties, Lanthanoid contraction & coordination IUPAC nomenclature'
      ],
      cbse_math: [
        'Solve 20 Integration by Parts and Definite Integrals properties questions',
        'Practice 3D Geometry: Shortest distance between skew lines & vector plane equations',
        'Master Bayes Theorem 5-mark conditional probability word problems'
      ],
      cbse_bio: [
        'Draw and label DNA replication fork, transcription unit & lac operon mechanism',
        'Solve genetics pedigree analysis charts and dihybrid cross ratios',
        'Review recombinant DNA technology tools, PCR steps, and gel electrophoresis diagrams'
      ],
      cbse_cs: [
        'Write Python functions for text file counting, binary pickle load/dump & CSV writer',
        'Implement Stack operations (Push and Pop) using a Python list structure',
        'Solve 10 CBSE SQL board questions covering GROUP BY, HAVING, and INNER JOIN'
      ],
      cbse_english: [
        'Draft a full-mark formal Job Application with Bio-Data / Resume format',
        'Analyze poetic devices and central themes in Flamingo poetry (A Thing of Beauty, Keeping Quiet)',
        'Practice timed reading comprehension and formal Notice writing speed drill'
      ],
      icse: [
        'Complete Selina textbook chapter-end analytical questions',
        'Practice Section-A compulsory questions and lens/ray diagrams',
        'Peer review on tricky 4-mark ICSE past board questions'
      ],
      matric: [
        'Master standard 5-mark and 8-mark theorem proofs with step markings',
        'Solve state board model question paper blueprint high-weightage chapters',
        'Conduct 30-minute squad formula flashcard speed drill'
      ],
      engineering: [
        'Derive core university syllabus theorems and design equations',
        'Solve 3 university semester exam numerical problems (past 5 years)',
        'Review circuit schematics, architectural block diagrams, and protocol flows'
      ],
      arts: [
        'Outline a structured critical essay with primary source text citations',
        'Analyze historical, cultural, and political context for assigned readings',
        'Exchange 20-minute peer critiques on weekly thesis arguments'
      ],
      commerce: [
        'Complete comprehensive balance sheet adjustments and partnership entries',
        'Review micro/macro economic graph shifts and elasticity formulas',
        'Solve a timed 40-question mock speed test for CA Foundation / B.Com'
      ],
      java: [
        'Implement custom generic data structures (LinkedList, BST) using modern Java syntax',
        'Practice Java 8 Streams API (filter, map, flatMap, reduce) and lambda expressions',
        'Build and test a secure Spring Boot REST controller with JPA Hibernate relationships'
      ],
      python: [
        'Solve 10 advanced Python algorithmic drills utilizing list comprehensions and generators',
        'Perform exploratory data analysis (EDA) on a dataset using Pandas grouping and Matplotlib plots',
        'Optimize vectorized numeric computations using NumPy broadcasting techniques'
      ],
      ai: [
        'Implement forward-pass and backpropagation gradient descent equations from scratch',
        'Train a PyTorch neural network model with Cross-Entropy Loss and Adam optimizer',
        'Evaluate model performance using Confusion Matrix, Precision, Recall, and ROC-AUC curves'
      ],
      genai: [
        'Build an end-to-end Retrieval-Augmented Generation (RAG) pipeline with ChromaDB and LangChain',
        'Implement tool-calling agent with structured JSON outputs and system prompt guards',
        'Evaluate RAG retrieval accuracy and response hallucination using context metrics'
      ],
      leetcode: [
        'Solve 2 LeetCode Medium problems on Tree/Graph traversal',
        'Review optimal Space & Time Complexity for two-pointer approaches',
        'Pair up for a 30-minute mock technical interview'
      ],
      system: [
        'Design a scalable URL shortener with Redis caching & rate limiting',
        'Review database sharding vs master-slave replication trade-offs',
        'Sketch distributed architecture diagram and review with squad'
      ],
      web: [
        'Build a full-stack CRUD feature with optimistic UI updates',
        'Audit web accessibility (a11y) and Core Web Vitals score',
        'Implement authentication middleware with secure HTTP-only cookies'
      ]
    };

    const key = `${subject || ''} ${category || ''} ${squadName || ''}`.toLowerCase();
    let selectedGoals = fallbackMap.default;
    if (key.includes('cbse') || key.includes('ncert') || key.includes('12th')) {
      if (key.includes('physic')) {
        selectedGoals = fallbackMap.cbse_physics;
      } else if (key.includes('chem')) {
        selectedGoals = fallbackMap.cbse_chem;
      } else if (key.includes('math') || key.includes('calculus') || key.includes('vector')) {
        selectedGoals = fallbackMap.cbse_math;
      } else if (key.includes('bio') || key.includes('neet') || key.includes('genetics')) {
        selectedGoals = fallbackMap.cbse_bio;
      } else if (key.includes('cs') || key.includes('computer') || key.includes('python')) {
        selectedGoals = fallbackMap.cbse_cs;
      } else if (key.includes('english') || key.includes('flamingo') || key.includes('vistas')) {
        selectedGoals = fallbackMap.cbse_english;
      } else if (key.includes('commerce') || key.includes('account') || key.includes('economic')) {
        selectedGoals = fallbackMap.commerce;
      } else {
        selectedGoals = fallbackMap.cbse;
      }
    } else if (key.includes('java') || key.includes('spring')) {
      selectedGoals = fallbackMap.java;
    } else if (key.includes('python') || key.includes('pandas') || key.includes('numpy')) {
      selectedGoals = fallbackMap.python;
    } else if (key.includes('genai') || key.includes('generative') || key.includes('llm') || key.includes('rag') || key.includes('prompt')) {
      selectedGoals = fallbackMap.genai;
    } else if (key.includes('artificial') || key.includes('intelligence') || key.includes('machine learning') || key.includes('pytorch') || key.includes('neural')) {
      selectedGoals = fallbackMap.ai;
    } else if (key.includes('icse') || key.includes('isc') || key.includes('selina')) {
      selectedGoals = fallbackMap.icse;
    } else if (key.includes('matric') || key.includes('state board') || key.includes('samacheer')) {
      selectedGoals = fallbackMap.matric;
    } else if (key.includes('engineer') || key.includes('ece') || key.includes('eee') || key.includes('mech') || key.includes('civil') || key.includes('dbms') || key.includes('os') || key.includes('network')) {
      selectedGoals = fallbackMap.engineering;
    } else if (key.includes('art') || key.includes('humanities') || key.includes('literature') || key.includes('history') || key.includes('philosophy')) {
      selectedGoals = fallbackMap.arts;
    } else if (key.includes('commerce') || key.includes('ca foundation') || key.includes('account') || key.includes('economic') || key.includes('business')) {
      selectedGoals = fallbackMap.commerce;
    } else if (key.includes('leet') || key.includes('algo') || key.includes('dsa') || key.includes('bootcamp')) {
      selectedGoals = fallbackMap.leetcode;
    } else if (key.includes('system') || key.includes('design') || key.includes('scale')) {
      selectedGoals = fallbackMap.system;
    } else if (key.includes('web') || key.includes('react') || key.includes('dev')) {
      selectedGoals = fallbackMap.web;
    }

    return res.json({
      goals: selectedGoals,
      poweredBy: 'Curated Study Engine'
    });
  } catch (error) {
    console.error('Suggest goals error:', error);
    return res.status(500).json({ error: 'Failed to suggest study goals.' });
  }
});

// POST /api/ai/generate-flashcards - Generate active recall flashcards
router.post('/generate-flashcards', async (req, res) => {
  try {
    const { subject = '', category = '', topic = '', notes = '' } = req.body;
    const model = getGeminiModel();
    const sourceContext = (notes && notes.trim().length > 15) ? notes.trim().slice(0, 1500) : (topic || subject || category || 'General Knowledge');

    if (model) {
      try {
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
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const cards = JSON.parse(cleanJson(text));
        if (Array.isArray(cards) && cards.length > 0) {
          return res.json({ flashcards: cards, poweredBy: 'Gemini AI' });
        }
      } catch (geminiErr) {
        console.warn('Gemini flashcard generation failed, using curated deck:', geminiErr.message);
      }
    }

    // Curated High-Yield Fallback Flashcards
    const key = `${subject} ${category} ${topic} ${notes}`.toLowerCase();
    let fallbackDeck = [
      {
        id: 'fc-1',
        front: `What is the core principle behind ${topic || subject || 'this topic'}?`,
        back: `Breaking complex challenges down into predictable sub-components and establishing clear invariants.`,
        tag: 'Fundamentals'
      },
      {
        id: 'fc-2',
        front: 'What is the trade-off between Time Complexity and Space Complexity?',
        back: 'Optimizing for speed frequently requires additional memory buffers or caching (memoization), while low-memory algorithms may require redundant computations.',
        tag: 'Optimization'
      },
      {
        id: 'fc-3',
        front: 'How do you verify the boundary conditions or edge cases?',
        back: 'Check for empty inputs (null/zero), single element cases, maximum scale limits, and off-by-one indices.',
        tag: 'Best Practice'
      },
      {
        id: 'fc-4',
        front: 'What makes an active recall test more effective than passive re-reading?',
        back: 'Retrieval practice strengthens neural synaptic pathways and reveals exact knowledge gaps before exam day.',
        tag: 'Active Recall'
      },
      {
        id: 'fc-5',
        front: 'When should you apply iterative vs recursive strategies?',
        back: 'Iteration avoids call stack memory overhead and stack overflow risks; recursion yields cleaner, more natural solutions for tree/graph traversal.',
        tag: 'Architecture'
      },
      {
        id: 'fc-6',
        front: 'How can you summarize the main takeaway in one sentence?',
        back: `Master the fundamental definitions, practice 2-3 archetype problems, and review errors with your study squad.`,
        tag: 'Synthesis'
      }
    ];

    if (key.includes('leet') || key.includes('algo') || key.includes('code') || key.includes('cs') || key.includes('computer')) {
      fallbackDeck = [
        {
          id: 'fc-1',
          front: 'What is the time complexity difference between Array lookup and Linked List lookup?',
          back: 'Array lookup by index is O(1) via direct memory pointer arithmetic. Linked list lookup is O(n) because nodes must be traversed sequentially.',
          tag: 'Data Structures'
        },
        {
          id: 'fc-2',
          front: 'What distinguishes Memoization from Tabulation in Dynamic Programming?',
          back: 'Memoization is top-down (recursive with caching results), while Tabulation is bottom-up (iterative filling an array or table).',
          tag: 'Dynamic Programming'
        },
        {
          id: 'fc-3',
          front: 'When should you use BFS instead of DFS?',
          back: 'Use BFS when searching for the shortest path in unweighted graphs or finding nodes closest to the root layer by layer.',
          tag: 'Graph Traversal'
        },
        {
          id: 'fc-4',
          front: 'What is a Hash Collision and how can it be handled?',
          back: 'When two different keys hash to the same bucket. Resolved using Chaining (linked lists in each bucket) or Open Addressing (linear/quadratic probing).',
          tag: 'Hashing'
        },
        {
          id: 'fc-5',
          front: 'What is the two-pointer technique archetype?',
          back: 'Used on sorted arrays/strings to find pairs in O(n) time and O(1) space, replacing a nested O(n²) brute-force loop.',
          tag: 'Algorithms'
        },
        {
          id: 'fc-6',
          front: 'What is the average vs worst-case complexity of QuickSort?',
          back: 'Average: O(n log n) with balanced pivots. Worst: O(n²) when the pivot chosen is consistently the smallest or largest element.',
          tag: 'Sorting'
        }
      ];
    } else if (key.includes('math') || key.includes('calc') || key.includes('algebra')) {
      fallbackDeck = [
        {
          id: 'fc-1',
          front: 'What is the geometric meaning of the Determinant of a 2x2 matrix?',
          back: 'The determinant represents the signed area scaling factor of the transformation applied to a unit square.',
          tag: 'Linear Algebra'
        },
        {
          id: 'fc-2',
          front: 'What is an Eigenvector and Eigenvalue?',
          back: 'An eigenvector is a non-zero vector whose direction does not change under a linear transformation, only scaled by factor λ (the eigenvalue): A v = λ v.',
          tag: 'Eigenvalues'
        },
        {
          id: 'fc-3',
          front: 'What does the Fundamental Theorem of Calculus state?',
          back: 'Differentiation and integration are inverse processes. If F is an antiderivative of f, then ∫[a,b] f(x) dx = F(b) - F(a).',
          tag: 'Calculus'
        },
        {
          id: 'fc-4',
          front: 'What is the Chain Rule formula for composite functions?',
          back: 'If y = f(g(x)), then dy/dx = f\'(g(x)) · g\'(x).',
          tag: 'Differentiation'
        },
        {
          id: 'fc-5',
          front: 'What is the difference between Gradient and Directional Derivative?',
          back: 'The gradient vector ∇f points in the direction of steepest ascent; the directional derivative is the rate of change in an arbitrary unit direction u (∇f · u).',
          tag: 'Multivariable'
        },
        {
          id: 'fc-6',
          front: 'When does a system of linear equations Ax = b have a unique solution?',
          back: 'When matrix A is square and invertible (det(A) ≠ 0), meaning its columns are linearly independent.',
          tag: 'Linear Systems'
        }
      ];
    }

    return res.json({
      flashcards: fallbackDeck,
      poweredBy: model ? 'Gemini AI' : 'Curated Study Engine'
    });
  } catch (error) {
    console.error('Generate flashcards error:', error);
    return res.status(500).json({ error: 'Failed to generate flashcards.' });
  }
});

// POST /api/ai/generate-quiz - Generate active recall multiple-choice quiz
router.post('/generate-quiz', async (req, res) => {
  try {
    const { subject = '', category = '', topic = '', notes = '' } = req.body;
    const model = getGeminiModel();
    const sourceContext = (notes && notes.trim().length > 15) ? notes.trim().slice(0, 1500) : (topic || subject || category || 'General Knowledge');

    if (model) {
      try {
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
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const quiz = JSON.parse(cleanJson(text));
        if (Array.isArray(quiz) && quiz.length > 0) {
          return res.json({ quiz, poweredBy: 'Gemini AI' });
        }
      } catch (geminiErr) {
        console.warn('Gemini quiz generation failed, using curated quiz:', geminiErr.message);
      }
    }

    // Curated Fallback Quiz
    const key = `${subject} ${category} ${topic} ${notes}`.toLowerCase();
    let fallbackQuiz = [
      {
        id: 'q-1',
        question: `Which approach is most effective when tackling complex problems in ${subject || 'this field'}?`,
        options: [
          'Memorizing raw formulas without derivations',
          'Breaking the problem into smaller sub-problems and testing invariants',
          'Skipping edge cases until the final review',
          'Relying solely on intuition without writing steps'
        ],
        answerIndex: 1,
        explanation: 'Decomposition and invariant verification prevent logical errors and scale well to complex scenarios.'
      },
      {
        id: 'q-2',
        question: 'What is the main benefit of Spaced Repetition over cramming?',
        options: [
          'It guarantees 100% test score without effort',
          'It counters the Ebbinghaus Forgetting Curve by reinforcing memory at optimal intervals',
          'It requires studying 8 hours continuously each night',
          'It replaces the need to practice problem-solving'
        ],
        answerIndex: 1,
        explanation: 'Spaced repetition reviews concepts right before you are about to forget them, converting short-term memory to long-term storage.'
      },
      {
        id: 'q-3',
        question: 'In active recall, why is self-testing superior to re-reading?',
        options: [
          'Re-reading creates an illusion of competence, whereas retrieval strengthens neural pathways',
          'Self-testing takes much less cognitive energy',
          'Re-reading is only useful for mathematics',
          'There is no scientific difference between the two methods'
        ],
        answerIndex: 0,
        explanation: 'The effort of recalling information forces the brain to organize and consolidate knowledge.'
      },
      {
        id: 'q-4',
        question: 'What is the ideal Pomodoro study cadence for deep focus?',
        options: [
          '90 minutes study, 45 minutes break',
          '25 minutes high focus, 5 minutes rest, with longer breaks after 4 sessions',
          '10 minutes study, 20 minutes break',
          '5 hours without any breaks to maintain flow'
        ],
        answerIndex: 1,
        explanation: 'The standard 25/5 rhythm prevents mental fatigue and maintains cognitive alertness throughout the day.'
      },
      {
        id: 'q-5',
        question: 'How should a study squad conduct an effective recap session?',
        options: [
          'Have one member read lecture slides out loud',
          'Each member teaches one concept to the group and solves 1 problem on the whiteboard',
          'Argue over who completed the most homework problems',
          'Remain completely silent for 60 minutes'
        ],
        answerIndex: 1,
        explanation: 'The Feynman Technique (teaching a concept in simple terms to peers) is the fastest way to detect personal blind spots.'
      }
    ];

    if (key.includes('leet') || key.includes('algo') || key.includes('code') || key.includes('cs') || key.includes('computer')) {
      fallbackQuiz = [
        {
          id: 'q-1',
          question: 'What is the worst-case time complexity of searching for an element in an unsorted array of size n?',
          options: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'],
          answerIndex: 2,
          explanation: 'In the worst case, the target element may be at the very last index or not present at all, requiring n checks.'
        },
        {
          id: 'q-2',
          question: 'Which data structure follows the First-In, First-Out (FIFO) principle?',
          options: ['Stack', 'Queue', 'Binary Heap', 'Hash Map'],
          answerIndex: 1,
          explanation: 'Queues process items in the order they were inserted (FIFO), whereas Stacks are LIFO (Last-In, First-Out).'
        },
        {
          id: 'q-3',
          question: 'What is the space complexity of Depth-First Search (DFS) on a balanced binary tree with n nodes?',
          options: ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'],
          answerIndex: 1,
          explanation: 'For a balanced binary tree, the maximum recursion call stack height is equal to tree height: O(log n).'
        },
        {
          id: 'q-4',
          question: 'Which algorithm is best suited to find the shortest path in a graph with non-negative edge weights?',
          options: ['Bellman-Ford', 'Dijkstra’s Algorithm', 'Kruskal’s Algorithm', 'Depth First Search'],
          answerIndex: 1,
          explanation: 'Dijkstra’s algorithm uses a priority queue to greedily find the shortest path in O((V + E) log V) time.'
        },
        {
          id: 'q-5',
          question: 'What is the average time complexity to insert a key-value pair into a Hash Table?',
          options: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'],
          answerIndex: 0,
          explanation: 'Under a good hash function with a reasonable load factor, average hash table insertions take O(1) constant time.'
        }
      ];
    } else if (key.includes('math') || key.includes('calc') || key.includes('algebra')) {
      fallbackQuiz = [
        {
          id: 'q-1',
          question: 'What is the derivative of f(x) = ln(x) for x > 0?',
          options: ['1/x', 'e^x', 'x ln(x)', '1/(x²)'],
          answerIndex: 0,
          explanation: 'By standard calculus differentiation rules, d/dx[ln(x)] = 1/x.'
        },
        {
          id: 'q-2',
          question: 'If the determinant of a square matrix A is 0, what does this imply?',
          options: [
            'Matrix A has an infinite number of inverses',
            'Matrix A is singular (not invertible) and its columns are linearly dependent',
            'The matrix must be symmetric',
            'All eigenvalues must be equal to 1'
          ],
          answerIndex: 1,
          explanation: 'det(A) = 0 means the transformation collapses dimensional space, meaning no unique inverse matrix exists.'
        },
        {
          id: 'q-3',
          question: 'What is ∫ e^(2x) dx?',
          options: ['e^(2x) + C', '(1/2) e^(2x) + C', '2 e^(2x) + C', 'e^(x²) + C'],
          answerIndex: 1,
          explanation: 'Using u-substitution with u = 2x and du = 2 dx yields (1/2) ∫ e^u du = (1/2) e^(2x) + C.'
        },
        {
          id: 'q-4',
          question: 'What does the Dot Product of two orthogonal non-zero vectors equal?',
          options: ['1', '0', '-1', 'The product of their magnitudes'],
          answerIndex: 1,
          explanation: 'a · b = |a||b| cos(θ). Since orthogonal vectors have θ = 90°, cos(90°) = 0, so the dot product is 0.'
        },
        {
          id: 'q-5',
          question: 'Which test can definitively determine if a series Σ a_n diverges if lim(n→∞) a_n ≠ 0?',
          options: ['Ratio Test', 'Root Test', 'n-th Term Divergence Test', 'Integral Test'],
          answerIndex: 2,
          explanation: 'If the terms a_n do not approach 0 as n goes to infinity, the infinite sum cannot converge.'
        }
      ];
    }

    return res.json({
      quiz: fallbackQuiz,
      poweredBy: model ? 'Gemini AI' : 'Curated Study Engine'
    });
  } catch (error) {
    console.error('Generate quiz error:', error);
    return res.status(500).json({ error: 'Failed to generate quiz.' });
  }
});

// POST /api/ai/squad-bot - In-room AI Tutor & Assistant
router.post('/squad-bot', async (req, res) => {
  try {
    const {
      squadId,
      query = '',
      context = {},
      mode = 'chat' // 'chat' | 'summarize-notes' | 'study-agenda'
    } = req.body;

    const { subject = '', category = '', squadName = '', sharedNotes = '', tasks = [] } = context;

    let prompt = '';
    if (mode === 'summarize-notes') {
      prompt = `You are StudySquad AI, an academic tutor assisting the "${squadName || 'Study'}" squad.
The squad is studying ${subject || 'General Studies'} (${category || 'Academics'}).
Here are their collaborative shared study notes:
"""
${(sharedNotes || '').slice(0, 4000) || 'No notes written yet.'}
"""

Please provide a concise, high-yield summary of these study notes:
1. 🎯 Core Key Concepts & Takeaways (bullet points)
2. 💡 Key Formulas / Definitions / Terms
3. ⚠️ Common Exam Pitfalls or Tricky Points to Remember
Format cleanly with Markdown bullet points and bold headers.`;
    } else if (mode === 'study-agenda') {
      prompt = `You are StudySquad AI, an academic study coach.
The squad "${squadName || 'Study'}" is preparing for a collaborative focus session on ${subject || 'their coursework'} (${category || 'Academics'}).
Current squad study goals/tasks: ${JSON.stringify(tasks.map((t) => t.text || t))}

Generate an inspiring, high-yield 60-Minute Study Session Agenda:
- 00-05m: Quick check-in & goal alignment
- 05-30m: Sprint 1 (Deep Work Pomodoro - Focus on hardest topic)
- 30-35m: Peer sync & water break
- 35-55m: Sprint 2 (Active Recall & problem solving)
- 55-60m: Wrap-up & milestone checklist
Tailor the specific tasks and topics to ${subject}. Format clearly with Markdown.`;
    } else {
      prompt = `You are StudySquad AI Tutor, a friendly, encouraging, and highly knowledgeable academic peer coach embedded inside the study squad "${squadName || 'StudySquad'}" (Subject: ${subject || 'Academics'}, Category: ${category || 'Studies'}).
The student is asking:
"${query}"

${sharedNotes ? `Context from the squad's shared notes:\n${sharedNotes.slice(0, 1000)}\n` : ''}

Respond directly with a clear, engaging, and accurate answer. Use concise explanations, analogies if helpful, and code/math formatting if relevant. Keep it encouraging and tailored to students studying together!`;
    }

    try {
      const geminiResult = await generateWithGemini(prompt);
      if (geminiResult && geminiResult.text) {
        return res.json({
          response: geminiResult.text,
          poweredBy: `Google Gemini (${geminiResult.modelName})`,
          mode
        });
      }
    } catch (geminiErr) {
      console.warn('Gemini squad-bot call error, falling back:', geminiErr.message);
    }

    // Heuristic Fallback if Gemini key is missing
    let fallbackText = '';
    if (mode === 'summarize-notes') {
      if (!sharedNotes || sharedNotes.trim().length < 10) {
        fallbackText = `📝 **Squad Notes Summary**\n\nYour squad hasn't added notes in the Resources tab yet! Open the **Resources & Notes** tab and type your lecture notes or code snippets, then click **Summarize Notes** again.\n\n*(Tip: Add your free Google Gemini API key to backend/.env to unlock live AI note synthesis!)*`;
      } else {
        fallbackText = `📝 **Squad Notes Key Takeaways** (${subject || 'Study'})\n\n` +
          `• **Primary Theme**: Focuses on core principles of ${subject || 'your subject'}.\n` +
          `• **Notes Length**: ~${sharedNotes.split(/\s+/).length} words recorded by squad peers.\n` +
          `• **Study Tip**: Review key definitions before starting problem sets and test each other in Squad Chat.\n\n` +
          `*(Connect your Google Gemini API key in backend/.env for full automated bullet extraction and equation summarization!)*`;
      }
    } else if (mode === 'study-agenda') {
      fallbackText = `📅 **Recommended 60-Minute Study Agenda for ${subject || squadName}**\n\n` +
        `• **00:00 - 05:00** 🚀 *Kickoff*: Check off prior tasks and set goals for today's 25-minute sprint.\n` +
        `• **05:00 - 30:00** 🔥 *Pomodoro Sprint 1*: Solo or paired deep focus on core theory & definitions.\n` +
        `• **30:00 - 35:00** ☕ *Short Break*: Hydrate and compare notes in Squad Chat.\n` +
        `• **35:00 - 55:00** ✏️ *Pomodoro Sprint 2*: Practice problems & Whiteboard derivations.\n` +
        `• **55:00 - 60:00** 🏆 *Recap & Celebrate*: Mark finished tasks and schedule next meetup!\n\n` +
        `*(Connect your Google Gemini API key in backend/.env for AI-customized agendas tailored to your live tasks!)*`;
    } else {
      const qLower = query.toLowerCase();
      let answerBody = `Great question! When studying **${subject || 'this topic'}**, focus on building an intuitive mental model first before diving into memorization. Try explaining the mechanism in your own words to a squad partner on the Whiteboard.`;

      if (qLower.includes('complexity') || qLower.includes('time') || qLower.includes('space')) {
        answerBody = `In algorithm analysis, **Time Complexity** measures operations relative to input size n, while **Space Complexity** measures auxiliary memory. Standard best practices recommend aiming for O(1) auxiliary space and O(n) or O(n log n) time whenever feasible.`;
      } else if (qLower.includes('pomodoro') || qLower.includes('focus') || qLower.includes('productivity')) {
        answerBody = `The **Pomodoro Technique** enforces 25 minutes of mono-tasking followed by a 5-minute cognitive reset. Research shows this rhythm preserves dopamine, staves off decision fatigue, and improves long-term recall.`;
      } else if (qLower.includes('test') || qLower.includes('exam') || qLower.includes('quiz')) {
        answerBody = `For exam prep, **Active Recall** (testing yourself without looking at notes) and **Spaced Repetition** are scientifically proven to be 2-3x more effective than passive highlighting. Try generating flashcards in the **AI Quiz & Cards** tab!`;
      }

      fallbackText = `🤖 **StudySquad AI Tutor**:\n\n${answerBody}\n\n💡 *Pro-tip*: You can tag \`@ai\` directly in Squad Chat anytime to ask questions!\n\n*(Note: Powered by StudySquad Academic Heuristics. Add your free GEMINI_API_KEY in backend/.env for real-time generative responses!)*`;
    }

    return res.json({
      response: fallbackText,
      poweredBy: 'StudySquad Academic Engine',
      mode
    });
  } catch (error) {
    console.error('Squad bot error:', error);
    return res.status(500).json({ error: 'Failed to process AI squad bot request.' });
  }
});

// POST /api/ai/chat-doc - Chat with uploaded Lecture PDF, Slides, or Notes
router.post('/chat-doc', requireAuth, async (req, res) => {
  try {
    const {
      squadId,
      resourceId,
      fileName = '',
      fileUrl = '',
      query = 'Summarize this document'
    } = req.body;

    if (!query || !query.trim()) {
      return res.status(400).json({ error: 'Query is required.' });
    }

    // Resolve local file path strictly within uploads directory (prevent path traversal)
    let localFilePath = null;
    if (fileUrl) {
      const fileNameOnly = path.basename(fileUrl);
      const uploadsDir = path.resolve(__dirname, '..', 'uploads');
      const resolvedPath = path.resolve(uploadsDir, fileNameOnly);

      // Verify the file is strictly contained within uploads directory
      if (resolvedPath.startsWith(uploadsDir) && fs.existsSync(resolvedPath)) {
        localFilePath = resolvedPath;
      }
    }

    if (localFilePath && fs.existsSync(localFilePath)) {
      try {
        const ext = path.extname(localFilePath).toLowerCase();
        const stat = fs.statSync(localFilePath);

        if (stat.size <= 20 * 1024 * 1024) {
          const fileBuffer = fs.readFileSync(localFilePath);

          let mimeType = 'application/pdf';
          if (ext === '.pdf') mimeType = 'application/pdf';
          else if (['.png', '.jpg', '.jpeg'].includes(ext)) mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';
          else if (['.txt', '.md', '.json', '.js', '.py'].includes(ext)) mimeType = 'text/plain';

          const docPrompt = `You are StudySquad Document AI Assistant. A student in a collaborative study group is studying this uploaded document: "${fileName || path.basename(localFilePath)}".

Student's Question:
"${query}"

Instructions:
1. Provide a comprehensive, accurate answer based directly on the document's content.
2. If summarizing, highlight:
   - 🎯 Main Theme & Learning Objectives
   - 📌 Key Concepts, Rules, or Derivations
   - 💡 3 Key Exam Takeaways
3. If the student asks a specific question, answer directly with page/section context where visible.
4. Format cleanly using Markdown with bullet points, bold terms, and code blocks if relevant.`;

          let geminiResult = null;
          if (mimeType === 'text/plain') {
            const textContent = fileBuffer.toString('utf-8').slice(0, 50000);
            geminiResult = await generateWithGemini(`${docPrompt}\n\nDocument Text Content:\n"""\n${textContent}\n"""`);
          } else {
            const filePart = {
              inlineData: {
                data: fileBuffer.toString('base64'),
                mimeType
              }
            };
            geminiResult = await generateWithGemini([docPrompt, filePart]);
          }

          if (geminiResult && geminiResult.text) {
            return res.json({
              answer: geminiResult.text,
              fileName: fileName || path.basename(localFilePath),
              poweredBy: `Google Gemini (${geminiResult.modelName})`
            });
          }
        }
      } catch (docErr) {
        console.warn('Gemini doc analysis error, falling back:', docErr.message);
      }
    } else {
      try {
        const prompt = `You are StudySquad Document AI Assistant. The student is asking about their study resource: "${fileName}".
Student's Question: "${query}"

Provide a clear, detailed, and academically rigorous answer based on the concepts typically covered under "${fileName}". Format in clean Markdown with key takeaways and bullet points.`;
        const geminiResult = await generateWithGemini(prompt);
        if (geminiResult && geminiResult.text) {
          return res.json({
            answer: geminiResult.text,
            fileName: fileName || 'Study Resource',
            poweredBy: `Google Gemini (${geminiResult.modelName})`
          });
        }
      } catch (err) {
        console.warn('Gemini fallback text call error:', err.message);
      }
    }

    // Curated Heuristic Document response if Gemini key not set
    const ext = fileName ? path.extname(fileName).toLowerCase() : '';
    const answer = `📄 **Document Analysis for ${fileName || 'Study Material'}**\n\n` +
      `**Question**: *"${query}"*\n\n` +
      `• **Document Type**: ${ext ? ext.toUpperCase() : 'Lecture Document'}\n` +
      `• **Key Focus**: This material covers fundamental concepts and applied problem solving.\n` +
      `• **Recommended Study Method**:\n` +
      `  1. Read key theorems and code listings first.\n` +
      `  2. Discuss tricky slide points with your squad in the Chat tab.\n` +
      `  3. Sketch architecture diagrams on the Live Whiteboard.\n\n` +
      `💡 **Unlock Full Document Understanding**:\n` +
      `Add your free **GEMINI_API_KEY** in \`backend/.env\`! Gemini 1.5 Flash reads PDFs, slides, and code natively to answer specific page-by-page questions!`;

    return res.json({
      answer,
      fileName: fileName || 'Study Document',
      poweredBy: 'StudySquad Document Engine'
    });
  } catch (error) {
    console.error('Chat doc error:', error);
    return res.status(500).json({ error: 'Failed to process document chat.' });
  }
});

export default router;
