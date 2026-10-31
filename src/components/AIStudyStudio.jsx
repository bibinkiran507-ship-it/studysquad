import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Brain,
  Sparkles,
  Layers,
  HelpCircle,
  CheckCircle2,
  XCircle,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  Shuffle,
  Trophy,
  Send,
  FileText,
  Check,
  Loader2,
  RefreshCw,
  GraduationCap,
  Award,
  Crown,
  ArrowRight,
  Mic,
  Terminal,
  Copy,
  Download,
  AlertTriangle,
  Cpu,
  Play,
  Lightbulb,
  SendHorizontal,
  Bot,
  MessageSquareText,
  Trash2,
  Image as ImageIcon,
  X,
} from 'lucide-react';
import { aiAPI, squadsAPI } from '../api/client';

function ProFeatureLockCard({ icon: Icon, title, tag = 'STUDYSQUAD PRO REQUIRED', description, perks = [], accent = 'amber', onUpgrade }) {
  const accentTheme = {
    rose: {
      border: 'border-rose-500/30',
      bg: 'from-rose-950/20 via-neutral-900 to-black',
      badge: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
      iconBg: 'bg-rose-500/20 border-rose-500/40 text-rose-400 shadow-rose-500/10',
      perkDot: 'text-rose-400',
    },
    amber: {
      border: 'border-amber-500/30',
      bg: 'from-amber-950/20 via-neutral-900 to-black',
      badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      iconBg: 'bg-amber-500/20 border-amber-400/40 text-amber-400 shadow-amber-500/10',
      perkDot: 'text-amber-400',
    },
    cyan: {
      border: 'border-cyan-500/30',
      bg: 'from-cyan-950/20 via-neutral-900 to-black',
      badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
      iconBg: 'bg-cyan-500/20 border-cyan-400/40 text-cyan-400 shadow-cyan-500/10',
      perkDot: 'text-cyan-400',
    },
    teal: {
      border: 'border-teal-500/30',
      bg: 'from-teal-950/20 via-neutral-900 to-black',
      badge: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
      iconBg: 'bg-teal-500/20 border-teal-400/40 text-teal-400 shadow-teal-500/10',
      perkDot: 'text-teal-400',
    },
    indigo: {
      border: 'border-indigo-500/30',
      bg: 'from-indigo-950/20 via-neutral-900 to-black',
      badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
      iconBg: 'bg-indigo-500/20 border-indigo-400/40 text-indigo-400 shadow-indigo-500/10',
      perkDot: 'text-indigo-400',
    },
    blue: {
      border: 'border-blue-500/30',
      bg: 'from-blue-950/20 via-neutral-900 to-black',
      badge: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
      iconBg: 'bg-blue-500/20 border-blue-400/40 text-blue-400 shadow-blue-500/10',
      perkDot: 'text-blue-400',
    },
  }[accent] || {
    border: 'border-amber-500/30',
    bg: 'from-amber-950/20 via-neutral-900 to-black',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    iconBg: 'bg-amber-500/20 border-amber-400/40 text-amber-400 shadow-amber-500/10',
    perkDot: 'text-amber-400',
  };

  return (
    <div className={`p-6 sm:p-8 rounded-3xl border ${accentTheme.border} bg-gradient-to-b ${accentTheme.bg} space-y-4 max-w-lg mx-auto shadow-2xl text-center my-2`}>
      <div className="flex items-center justify-center">
        <div className={`w-14 h-14 rounded-2xl ${accentTheme.iconBg} border flex items-center justify-center shadow-lg`}>
          <Icon className="w-7 h-7" />
        </div>
      </div>

      <div className="space-y-1">
        <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${accentTheme.badge} inline-flex items-center gap-1`}>
          <Crown className="w-3 h-3 text-amber-400" />
          <span>{tag}</span>
        </span>
        <h4 className="text-xl font-black text-white">{title}</h4>
        <p className="text-xs text-neutral-300 max-w-sm mx-auto leading-relaxed">{description}</p>
      </div>

      {perks.length > 0 && (
        <div className="p-3.5 rounded-2xl bg-black/50 border border-white/10 text-left space-y-2">
          {perks.map((perk, idx) => (
            <div key={idx} className="flex items-start gap-2 text-xs text-neutral-200">
              <Check className={`w-3.5 h-3.5 ${accentTheme.perkDot} shrink-0 mt-0.5`} />
              <span>{perk}</span>
            </div>
          ))}
        </div>
      )}

      <div className="pt-1 space-y-2">
        <button
          type="button"
          onClick={onUpgrade}
          className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 text-neutral-950 font-black text-xs sm:text-sm shadow-md shadow-amber-500/20 transition-all cursor-pointer hover:scale-102 flex items-center justify-center gap-2"
        >
          <Crown className="w-4 h-4 text-neutral-950" />
          <span>Upgrade to Pro to Unlock (₹199/mo)</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
        <p className="text-[10px] text-neutral-400">Instant access to all 5 Pro AI engines • Powered by Gemini AI • Cancel anytime</p>
      </div>
    </div>
  );
}

function renderInlineText(text) {
  if (!text) return text;
  const parts = [];
  const regex = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g;
  let lastIndex = 0;
  let match;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      parts.push(
        <strong key={key++} className="font-bold text-white">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('`') && token.endsWith('`')) {
      parts.push(
        <code key={key++} className="px-1.5 py-0.5 rounded-md bg-white/10 text-cyan-300 font-mono text-[11px] sm:text-xs border border-white/10">
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith('*') && token.endsWith('*')) {
      parts.push(
        <em key={key++} className="italic text-neutral-300">
          {token.slice(1, -1)}
        </em>
      );
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}

function FormattedChatMessage({ content }) {
  if (!content) return null;

  const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
  const segments = [];
  let lastIdx = 0;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    if (match.index > lastIdx) {
      segments.push({ type: 'text', text: content.substring(lastIdx, match.index) });
    }
    segments.push({
      type: 'code',
      lang: match[1] || 'code',
      code: match[2].trimEnd(),
    });
    lastIdx = codeBlockRegex.lastIndex;
  }

  if (lastIdx < content.length) {
    segments.push({ type: 'text', text: content.substring(lastIdx) });
  }

  return (
    <div className="space-y-1.5 leading-relaxed text-xs sm:text-sm">
      {segments.map((seg, i) => {
        if (seg.type === 'code') {
          return (
            <div key={i} className="my-2.5 rounded-xl bg-black/70 border border-white/15 overflow-hidden shadow-inner">
              <div className="px-3 py-1.5 bg-white/5 border-b border-white/10 flex items-center justify-between text-[11px] text-neutral-400 font-mono">
                <span className="text-cyan-400 font-semibold">{seg.lang}</span>
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(seg.code)}
                  className="hover:text-white transition-colors cursor-pointer text-[10px] px-2 py-0.5 rounded bg-white/10"
                >
                  Copy
                </button>
              </div>
              <pre className="p-3 text-cyan-300 font-mono text-xs overflow-x-auto whitespace-pre">
                <code>{seg.code}</code>
              </pre>
            </div>
          );
        }

        const lines = seg.text.split('\n');
        return (
          <div key={i} className="space-y-1">
            {lines.map((line, lineIdx) => {
              const trimmed = line.trim();
              if (!trimmed) {
                return <div key={lineIdx} className="h-1" />;
              }

              if (trimmed === '---' || trimmed === '***') {
                return <hr key={lineIdx} className="my-2 border-white/10" />;
              }

              if (trimmed.startsWith('### ')) {
                return (
                  <h5 key={lineIdx} className="text-white font-bold text-xs sm:text-sm pt-1 text-cyan-200">
                    {renderInlineText(trimmed.slice(4))}
                  </h5>
                );
              }

              if (trimmed.startsWith('## ') || trimmed.startsWith('# ')) {
                return (
                  <h4 key={lineIdx} className="text-white font-bold text-sm sm:text-base pt-1.5 text-cyan-300">
                    {renderInlineText(trimmed.replace(/^#+\s*/, ''))}
                  </h4>
                );
              }

              if (trimmed.startsWith('• ') || trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                return (
                  <div key={lineIdx} className="flex items-start gap-2 pl-1">
                    <span className="text-cyan-400 font-bold shrink-0 leading-tight mt-0.5">•</span>
                    <span className="flex-1 text-neutral-200">{renderInlineText(trimmed.slice(2))}</span>
                  </div>
                );
              }

              const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
              if (numMatch) {
                return (
                  <div key={lineIdx} className="flex items-start gap-2 pl-1">
                    <span className="text-cyan-400 font-semibold shrink-0 text-[11px]">{numMatch[1]}.</span>
                    <span className="flex-1 text-neutral-200">{renderInlineText(numMatch[2])}</span>
                  </div>
                );
              }

              return (
                <p key={lineIdx} className="text-neutral-200">
                  {renderInlineText(line)}
                </p>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function isPaywallError(err) {
  return (
    err?.response?.status === 403 &&
    (err?.response?.data?.error === 'DAILY_AI_LIMIT_REACHED' ||
      err?.response?.data?.upgradeRequired)
  );
}

export default function AIStudyStudio({ squad, user, socket, openAuthModal, onOpenProModal }) {
  // Mode: 'flashcards' | 'quiz'
  const [mode, setMode] = useState('flashcards');

  // Source configuration
  const [sourceType, setSourceType] = useState('notes'); // 'notes' | 'subject' | 'custom'
  const [customTopic, setCustomTopic] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [poweredBy, setPoweredBy] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  // ─── Flashcards State ─────────────────────────────────────────────────────────
  const [flashcards, setFlashcards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [masteredIds, setMasteredIds] = useState(new Set());
  const [reviewIds, setReviewIds] = useState(new Set());

  // ─── Practice Quiz State ──────────────────────────────────────────────────────
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({}); // questionIndex -> chosen option index
  const [isQuizFinished, setIsQuizFinished] = useState(false);
  const [sharedToast, setSharedToast] = useState(false);

  // ─── Mode 3: Viva Voce & Oral Interview Simulator ───────────────────────────
  const [vivaLevel, setVivaLevel] = useState('College Viva');
  const [vivaTargetCount, setVivaTargetCount] = useState(5); // 5 | 10 | 15 | 0 (0 = Continuous Marathon)
  const [vivaTopic, setVivaTopic] = useState('');
  const [vivaStage, setVivaStage] = useState(1);
  const [vivaQuestion, setVivaQuestion] = useState('');
  const [vivaAnswerInput, setVivaAnswerInput] = useState('');
  const [vivaFeedback, setVivaFeedback] = useState(null);
  const [vivaHistory, setVivaHistory] = useState([]);
  const [isSubmittingViva, setIsSubmittingViva] = useState(false);
  const [isVivaActive, setIsVivaActive] = useState(false);
  const [isVivaFinished, setIsVivaFinished] = useState(false);

  // ─── Mode 4: 1-Page High-Yield Cheat Sheet ──────────────────────────────────
  const [cheatSheetText, setCheatSheetText] = useState('');
  const [isGeneratingSheet, setIsGeneratingSheet] = useState(false);
  const [sheetCopied, setSheetCopied] = useState(false);

  // ─── Mode 5: Feynman 3-Tier Concept Explainer ───────────────────────────────
  const [feynmanInput, setFeynmanInput] = useState('');
  const [feynmanResult, setFeynmanResult] = useState(null);
  const [isGeneratingFeynman, setIsGeneratingFeynman] = useState(false);
  const [feynmanTier, setFeynmanTier] = useState('eli5'); // 'eli5' | 'mechanics' | 'traps'

  // ─── Mode 6: AI Code & Solution Diagnostic Auditor ──────────────────────────
  const [auditCode, setAuditCode] = useState(
    `function findTwoSum(nums, target) {\n  const map = new Map();\n  for (let i = 0; i < nums.length; i++) {\n    const complement = target - nums[i];\n    if (map.has(complement)) {\n      return [map.get(complement), i];\n    }\n    map.set(nums[i], i);\n  }\n  return [];\n}`
  );
  const [auditLanguage, setAuditLanguage] = useState('javascript');
  const [auditResult, setAuditResult] = useState(null);
  const [auditError, setAuditError] = useState('');
  const [isAuditing, setIsAuditing] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  // ─── Mode 7: AI Study Tutor (ChatGPT Copilot) ───────────────────────────────
  const [chatMessages, setChatMessages] = useState([
    {
      id: 'init-1',
      sender: 'ai',
      text: `👋 **Hi! I'm your StudySquad AI Tutor powered by Google Gemini.**\n\nAsk me anything! I can break down tricky formulas, explain complex concepts with real-world analogies, solve homework equations step-by-step, generate exam practice questions, or debug code.\n\nType your question below or click one of the quick prompts to get started!`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      poweredBy: 'Google Gemini',
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatPastedImage, setChatPastedImage] = useState(null);
  const fileInputRef = useRef(null);
  const tutorChatEndRef = useRef(null);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [chatCopiedId, setChatCopiedId] = useState(null);

  // ─── Daily Usage Counter (Freemium Paywall) ───────────────────────────────
  // Tracks how many free AI queries the user has used today (5/day for free tier)
  const [dailyUsage, setDailyUsage] = useState(null);

  const refreshUsage = async () => {
    if (!user) {
      setDailyUsage(null);
      return;
    }
    try {
      const res = await aiAPI.getUsage();
      setDailyUsage(res.data);
    } catch {
      // Silently ignore — counter is optional UI decoration
    }
  };

  useEffect(() => {
    refreshUsage();
    const handleProActivated = () => {
      refreshUsage();
      setStatusMessage('');
      setAuditError('');
    };
    window.addEventListener('studysquad:pro-activated', handleProActivated);
    return () => window.removeEventListener('studysquad:pro-activated', handleProActivated);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.isPro]);

  useEffect(() => {
    if (mode === 'chat') {
      tutorChatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages.length, isChatLoading, mode]);

  // Flashcards are generated on-demand when user clicks "Generate" — not auto-fired on mount
  // This avoids blocking the UI thread and allows the tab to open instantly.

function getClientFallbackFlashcards(subject = '', category = '', topic = '') {
  const key = `${subject} ${category} ${topic}`.toLowerCase();
  if (key.includes('accountab') || key.includes('habit') || key.includes('5 am') || key.includes('routine')) {
    return [
      {
        id: 'fc-1',
        front: 'What is the "2-Minute Rule" for building consistent daily habits?',
        back: 'When starting a new habit, it should take less than two minutes to perform. This overcomes inertia and makes showing up friction-free.',
        tag: 'Atomic Habits'
      },
      {
        id: 'fc-2',
        front: 'Why is accountability with a peer study squad more effective than studying alone?',
        back: 'Social commitment triggers positive peer momentum: when your progress is observed by peers who support you, adherence increases by up to 65-95%.',
        tag: 'Psychology'
      },
      {
        id: 'fc-3',
        front: 'What is "Habit Stacking" and how do you implement it?',
        back: 'Pairing a new desired habit with a current daily habit: "After [CURRENT HABIT], I will [NEW HABIT]". E.g., "After my morning water, I will open StudySquad for 25 minutes."',
        tag: 'Habit Design'
      },
      {
        id: 'fc-4',
        front: 'What does the "Never Miss Twice" rule protect against?',
        back: 'Missing one day is an accident; missing two days in a row is the start of an excuse pattern. One slip-up will not derail your momentum if you immediately reset.',
        tag: 'Mindset'
      },
      {
        id: 'fc-5',
        front: 'What is the ideal morning routine for peak cognitive performance?',
        back: '1. Rehydrate (water before caffeine). 2. Get natural sunlight exposure. 3. Delay social media distractions until your first 50-minute deep work block is finished.',
        tag: 'Productivity'
      },
      {
        id: 'fc-6',
        front: 'How does the Pomodoro technique prevent burnout during long study marathons?',
        back: 'By enforcing regular mental resets (5-minute rest after 25 minutes of focus), preventing cognitive depletion and preserving dopamine levels.',
        tag: 'Focus'
      }
    ];
  } else if (key.includes('java')) {
    return [
      {
        id: 'fc-1',
        front: 'What are the 4 fundamental pillars of OOP in Java?',
        back: '1. Encapsulation (data hiding via private fields and getters/setters). 2. Inheritance (reusability via extends). 3. Polymorphism (overloading & overriding). 4. Abstraction (hiding implementation via abstract classes/interfaces).',
        tag: 'Java OOPs'
      },
      {
        id: 'fc-2',
        front: 'What is the internal working of HashMap in Java?',
        back: 'HashMap uses an array of Node buckets. key.hashCode() determines bucket index. Collisions are handled via linked lists; when bucket exceeds 8 nodes, it converts into a Red-Black Tree for O(log n) lookup.',
        tag: 'Java Collections'
      },
      {
        id: 'fc-3',
        front: 'What is the difference between Comparable and Comparator in Java?',
        back: 'Comparable (compareTo) provides a single natural sorting order implemented by the class itself. Comparator (compare) allows multiple custom external sorting strategies.',
        tag: 'Java Core'
      },
      {
        id: 'fc-4',
        front: 'How does the Java 8 Streams API operate?',
        back: 'Streams process sequences of elements functionally using intermediate operations (lazy: filter, map, sorted) and terminal operations (eager: collect, forEach, reduce).',
        tag: 'Java Streams'
      },
      {
        id: 'fc-5',
        front: 'What is the difference between synchronized blocks and volatile keyword?',
        back: 'volatile guarantees visibility of variable updates across threads without CPU caching. synchronized guarantees both mutual exclusion (atomicity) and visibility.',
        tag: 'Concurrency'
      },
      {
        id: 'fc-6',
        front: 'What is Dependency Injection in Spring Boot?',
        back: 'A design pattern where an object’s dependencies are provided by the Spring IoC container (@Autowired / constructor injection) rather than constructed directly with `new`.',
        tag: 'Spring Boot'
      }
    ];
  } else if (key.includes('python')) {
    return [
      {
        id: 'fc-1',
        front: 'What is the difference between mutable and immutable data types in Python?',
        back: 'Immutable (int, float, str, tuple, frozenset) cannot be modified in-place once created. Mutable (list, dict, set) can be altered without creating new memory references.',
        tag: 'Python Core'
      },
      {
        id: 'fc-2',
        front: 'What is a Python Generator and how does yield work?',
        back: 'Generators produce values on the fly one at a time using yield, preserving local state and enabling lazy memory-efficient iteration over massive datasets.',
        tag: 'Python Performance'
      },
      {
        id: 'fc-3',
        front: 'What does the Global Interpreter Lock (GIL) in CPython do?',
        back: 'A mutex that prevents multiple native threads from executing Python bytecodes concurrently, ensuring thread-safe memory management at the expense of multi-core CPU bound threading.',
        tag: 'CPython Internals'
      },
      {
        id: 'fc-4',
        front: 'What is the advantage of NumPy array vectorization over standard Python loops?',
        back: 'NumPy operations are executed in pre-compiled C loops on contiguous memory blocks with SIMD vectorization, executing up to 50-100x faster than interpreted Python loops.',
        tag: 'NumPy & SciPy'
      },
      {
        id: 'fc-5',
        front: 'What is the difference between loc and iloc in Pandas?',
        back: 'loc is label/name-based indexing, whereas iloc is integer position-based indexing (0-indexed).',
        tag: 'Pandas'
      },
      {
        id: 'fc-6',
        front: 'How does a Python Decorator function operate?',
        back: 'A decorator is a higher-order function that takes another function as an argument, wraps its behavior, and returns a new callable without altering the original function source code.',
        tag: 'Python Advanced'
      }
    ];
  } else if (key.includes('ai') || key.includes('intelligence') || key.includes('machine learning') || key.includes('neural')) {
    return [
      {
        id: 'fc-1',
        front: 'What is Gradient Descent and why is learning rate critical?',
        back: 'An optimization algorithm that iteratively steps in the direction of steepest negative gradient of the loss function. Too high learning rate overshoots; too low converges too slowly.',
        tag: 'Deep Learning'
      },
      {
        id: 'fc-2',
        front: 'What is the difference between Overfitting and Underfitting?',
        back: 'Overfitting occurs when a model memorizes training noise and fails to generalize (high variance). Underfitting occurs when the model is too simple to capture patterns (high bias).',
        tag: 'Model Evaluation'
      },
      {
        id: 'fc-3',
        front: 'How does Self-Attention work in the Transformer architecture?',
        back: 'Each token computes Query (Q), Key (K), and Value (V) projections: Attention(Q,K,V) = softmax(QKᵀ / √dₖ) V, allowing tokens to dynamically weight contextual relationships across the entire sequence.',
        tag: 'LLMs & Transformers'
      },
      {
        id: 'fc-4',
        front: 'What is Retrieval-Augmented Generation (RAG)?',
        back: 'A framework that retrieves relevant external context documents from a vector database using semantic similarity search, augmenting the LLM prompt to eliminate hallucinations.',
        tag: 'Generative AI'
      },
      {
        id: 'fc-5',
        front: 'Why are Convolutional Layers (CNNs) superior for computer vision compared to Dense layers?',
        back: 'CNNs utilize shared weight kernels and spatial translation invariance, drastically reducing parameter counts while capturing localized spatial hierarchies (edges -> textures -> objects).',
        tag: 'Computer Vision'
      },
      {
        id: 'fc-6',
        front: 'What is the role of Activation Functions like ReLU in Neural Networks?',
        back: 'Activation functions introduce non-linearity, enabling deep neural networks to approximate arbitrary non-linear mathematical decision boundaries.',
        tag: 'Neural Networks'
      }
    ];
  } else if (key.includes('leet') || key.includes('algo') || key.includes('code') || key.includes('cs') || key.includes('computer')) {
    return [
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
  } else if (key.includes('cbse') || key.includes('12th')) {
    return [
      {
        id: 'fc-1',
        front: 'What is Gauss’s Law in Electrostatics (CBSE Physics)?',
        back: 'The total electric flux through any closed Gaussian surface is equal to 1/ε₀ times the total enclosed charge: ∮ E·dA = q_enclosed / ε₀.',
        tag: 'CBSE Physics'
      },
      {
        id: 'fc-2',
        front: 'What is the condition for an Aldol Condensation reaction (CBSE Chemistry)?',
        back: 'Aldehydes or ketones containing at least one α-hydrogen atom undergo condensation in the presence of dilute alkali (NaOH) to form β-hydroxy carbonyl compounds.',
        tag: 'CBSE Chemistry'
      },
      {
        id: 'fc-3',
        front: 'What is the formula for the shortest distance between two skew lines in 3D Geometry?',
        back: 'd = |(a₂ - a₁) · (b₁ × b₂)| / |b₁ × b₂|, where a₁ and a₂ are points on the lines and b₁, b₂ are direction vectors.',
        tag: 'CBSE Maths'
      },
      {
        id: 'fc-4',
        front: 'What are the three structural genes of the Lac Operon and their enzymes?',
        back: 'lacZ encodes β-galactosidase, lacY encodes permease, and lacA encodes transacetylase.',
        tag: 'CBSE Biology'
      },
      {
        id: 'fc-5',
        front: 'What is the difference between pickle.dump() and pickle.load() in Python CBSE CS?',
        back: 'pickle.dump(obj, file) writes/serializes an object to a binary file. pickle.load(file) deserializes and reads it back into Python memory.',
        tag: 'CBSE CS'
      },
      {
        id: 'fc-6',
        front: 'How is Cash Flow from Operating Activities adjusted for working capital changes?',
        back: 'Add: Decrease in Current Assets & Increase in Current Liabilities. Deduct: Increase in Current Assets & Decrease in Current Liabilities.',
        tag: 'CBSE Commerce'
      }
    ];
  } else {
    return [
      {
        id: 'fc-1',
        front: `What is the core principle behind ${topic || subject || 'this study track'}?`,
        back: 'Breaking complex problems down into predictable sub-components and establishing clear foundational invariants.',
        tag: 'Fundamentals'
      },
      {
        id: 'fc-2',
        front: 'What is the difference between active recall and passive re-reading?',
        back: 'Active recall forces your brain to retrieve knowledge from memory, strengthening synaptic connections. Re-reading only creates an illusion of mastery.',
        tag: 'Active Recall'
      },
      {
        id: 'fc-3',
        front: 'How does Spaced Repetition combat the Ebbinghaus Forgetting Curve?',
        back: 'By reviewing concepts at gradually increasing time intervals (1 day, 3 days, 1 week), flattening the forgetting curve and securing long-term retention.',
        tag: 'Memory'
      },
      {
        id: 'fc-4',
        front: 'What is the Feynman Technique for rapid mastery?',
        back: '1. Choose a concept. 2. Teach it to a peer or child using simple, everyday language. 3. Identify gaps in your explanation. 4. Review and simplify.',
        tag: 'Feynman Technique'
      },
      {
        id: 'fc-5',
        front: 'What is the single most common cause of exam mistakes?',
        back: 'Misreading the question prompt or missing edge cases due to rushed skimming. Always underline givens and required outputs.',
        tag: 'Exam Strategy'
      },
      {
        id: 'fc-6',
        front: 'How do you sustain motivation over a multi-month study marathon?',
        back: 'Focus on small daily micro-wins and identity ("I am a disciplined learner") rather than purely on the final distant exam date.',
        tag: 'Mindset'
      }
    ];
  }
}

function getClientFallbackQuiz(subject = '', category = '', topic = '') {
  const key = `${subject} ${category} ${topic}`.toLowerCase();
  if (key.includes('accountab') || key.includes('habit') || key.includes('5 am') || key.includes('routine')) {
    return [
      {
        id: 'q-1',
        question: 'According to behavioural science, what is the best way to anchor a new morning habit?',
        options: [
          'Rely purely on willpower when your alarm rings',
          'Stack it directly after an already established habit (e.g. after pouring morning water)',
          'Change 10 habits all on the same day',
          'Wait until you feel motivated before beginning'
        ],
        answerIndex: 1,
        explanation: 'Habit stacking utilizes existing neural pathways to effortlessly prompt the new behavior without requiring cognitive decision-making.'
      },
      {
        id: 'q-2',
        question: 'What does the "Never Miss Twice" rule suggest when you skip a scheduled study session?',
        options: [
          'Give up on the entire challenge and start over next month',
          'Study double hours the next day without sleeping',
          'Acknowledge the slip and ensure you show up the very next day without exception',
          'Blame your squad mates'
        ],
        answerIndex: 2,
        explanation: 'One missed day is an anomaly; two missed days begins conditioning an excuse pattern. Showing up the next day restores the identity.'
      },
      {
        id: 'q-3',
        question: 'Why is peer accountability with a study squad more effective than private solo goals?',
        options: [
          'Squad members grade your tests with negative marks',
          'Public commitment and mutual encouragement leverage social motivation and accountability',
          'You no longer need to study at all',
          'It eliminates the need for focus intervals'
        ],
        answerIndex: 1,
        explanation: 'Sharing goals with supportive peers significantly raises the likelihood of follow-through through shared commitment and positive peer momentum.'
      },
      {
        id: 'q-4',
        question: 'What is the optimal cadence for a Pomodoro focus interval?',
        options: [
          '10 minutes work, 30 minutes break',
          '25 minutes high-intensity focus, 5 minutes resting break',
          '4 hours nonstop with no breaks',
          '45 minutes work, 1 hour break'
        ],
        answerIndex: 1,
        explanation: 'The classic 25/5 structure preserves cognitive stamina and prevents mental exhaustion throughout long study sessions.'
      },
      {
        id: 'q-5',
        question: 'What is the "Feynman Technique" for verifying true comprehension?',
        options: [
          'Highlighting 80% of textbook sentences in yellow',
          'Explaining the concept in simple, jargon-free words as if teaching a peer',
          'Memorizing raw definitions verbatim from Wikipedia',
          'Reading the summary chapter three times before sleeping'
        ],
        answerIndex: 1,
        explanation: 'If you cannot explain a concept simply, you do not understand it well enough. Teaching reveals exact hidden blind spots.'
      }
    ];
  } else if (key.includes('java')) {
    return [
      {
        id: 'q-1',
        question: 'Which Java Collection class guarantees elements are stored in ascending sorted order?',
        options: ['HashSet', 'TreeSet', 'LinkedHashSet', 'ArrayList'],
        answerIndex: 1,
        explanation: 'TreeSet is backed by a Red-Black Tree and guarantees that elements are maintained in sorted order (via Comparable or Comparator).'
      },
      {
        id: 'q-2',
        question: 'What is the default initial capacity and load factor of a Java HashMap?',
        options: ['Capacity 8, Load Factor 0.5', 'Capacity 16, Load Factor 0.75', 'Capacity 32, Load Factor 1.0', 'Capacity 10, Load Factor 0.8'],
        answerIndex: 1,
        explanation: 'Default initial capacity is 16 and the default load factor is 0.75, which offers an optimal balance between time and space.'
      },
      {
        id: 'q-3',
        question: 'In Java, what happens when a class implements an interface containing a default method?',
        options: [
          'The class MUST override the default method or it will not compile',
          'The class inherits the default implementation without being forced to override it',
          'Interfaces cannot have method bodies in any version of Java',
          'The method automatically becomes private'
        ],
        answerIndex: 1,
        explanation: 'Default methods (introduced in Java 8) allow interface evolution with backward compatibility, providing concrete implementations that classes can inherit or override.'
      },
      {
        id: 'q-4',
        question: 'Which Spring Boot annotation is used to inject bean dependencies into a class?',
        options: ['@Component', '@Autowired', '@Entity', '@Repository'],
        answerIndex: 1,
        explanation: '@Autowired triggers Spring Dependency Injection to supply the required matching bean from the ApplicationContext.'
      },
      {
        id: 'q-5',
        question: 'What is the time complexity of searching an element in a balanced Java TreeMap?',
        options: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'],
        answerIndex: 1,
        explanation: 'TreeMap is implemented using a self-balancing Red-Black binary search tree, providing guaranteed O(log n) time for search, insertion, and deletion.'
      }
    ];
  } else if (key.includes('python')) {
    return [
      {
        id: 'q-1',
        question: 'Which of the following is an IMMUTABLE data type in Python?',
        options: ['list', 'tuple', 'dict', 'set'],
        answerIndex: 1,
        explanation: 'Tuples are immutable; once instantiated, their elements cannot be added, removed, or re-assigned.'
      },
      {
        id: 'q-2',
        question: 'What keyword transforms a regular Python function into a Generator?',
        options: ['return', 'yield', 'async', 'lambda'],
        answerIndex: 1,
        explanation: 'The yield keyword pauses function execution and returns an intermediate value, maintaining state across calls.'
      },
      {
        id: 'q-3',
        question: 'In Pandas, what is the fastest way to perform calculations across millions of rows?',
        options: [
          'Using a for-loop with df.iterrows()',
          'Vectorized operations using Pandas / NumPy C-underpinnings',
          'Writing to a CSV and reading back with Python',
          'Converting everything to a nested dictionary'
        ],
        answerIndex: 1,
        explanation: 'Vectorized operations execute in compiled C code at memory bus speeds, avoiding the massive overhead of Python row iterations.'
      },
      {
        id: 'q-4',
        question: 'What will list(filter(lambda x: x % 2 == 0, [1, 2, 3, 4, 5, 6])) evaluate to?',
        options: ['[1, 3, 5]', '[2, 4, 6]', '[0, 2, 4]', '[False, True]'],
        answerIndex: 1,
        explanation: 'The lambda checks for even numbers (x % 2 == 0), retaining [2, 4, 6].'
      },
      {
        id: 'q-5',
        question: 'What does the Global Interpreter Lock (GIL) primarily restrict in CPython?',
        options: [
          'Multiprocessing across multiple CPU cores',
          'Concurrent multi-threading execution of Python bytecode on multiple CPU cores',
          'Asynchronous network I/O with asyncio',
          'Writing to disk files'
        ],
        answerIndex: 1,
        explanation: 'The GIL allows only one thread to execute Python bytecode at a time, preventing multi-threaded CPU bound speedup in CPython.'
      }
    ];
  } else if (key.includes('ai') || key.includes('intelligence') || key.includes('machine learning') || key.includes('neural')) {
    return [
      {
        id: 'q-1',
        question: 'Which activation function is widely used in modern hidden layers because it avoids the vanishing gradient problem?',
        options: ['Sigmoid', 'Tanh', 'ReLU (Rectified Linear Unit)', 'Step function'],
        answerIndex: 2,
        explanation: 'ReLU (f(x) = max(0, x)) has a constant gradient of 1 for positive inputs, preventing gradients from vanishing during deep backpropagation.'
      },
      {
        id: 'q-2',
        question: 'In Machine Learning, what does an ROC-AUC score of 0.5 indicate?',
        options: [
          'A perfect classification model',
          'A model with no better predictive power than random guessing',
          'An overfitted model',
          'A 50% loss error'
        ],
        answerIndex: 1,
        explanation: 'An AUC (Area Under the Receiver Operating Characteristic Curve) of 0.5 represents a model with zero discriminative ability, equivalent to random coin tossing.'
      },
      {
        id: 'q-3',
        question: 'In the Transformer architecture, what is the primary purpose of Multi-Head Attention?',
        options: [
          'To compress the input tokens into a single scalar value',
          'To enable the model to jointly attend to information from different representation subspaces at different positions',
          'To replace backpropagation with genetic algorithms',
          'To reduce GPU memory usage to zero'
        ],
        answerIndex: 1,
        explanation: 'Multi-head attention projects Queries, Keys, and Values multiple times with different learned projections, allowing the model to focus on diverse linguistic and contextual aspects simultaneously.'
      },
      {
        id: 'q-4',
        question: 'What is the main advantage of Retrieval-Augmented Generation (RAG) over purely fine-tuning an LLM?',
        options: [
          'RAG dynamically injects up-to-date and private factual documents without requiring costly model retraining',
          'RAG guarantees the LLM will never output words longer than 5 letters',
          'Fine-tuning is always completely free',
          'RAG eliminates the need for any embedding models'
        ],
        answerIndex: 0,
        explanation: 'RAG decouples factual knowledge retrieval from parametric model weights, enabling instant updates and verifiable document citations without retraining.'
      },
      {
        id: 'q-5',
        question: 'In PyTorch, which method is called to zero out accumulated gradients before the backward pass?',
        options: ['model.train()', 'optimizer.zero_grad()', 'loss.backward()', 'optimizer.step()'],
        answerIndex: 1,
        explanation: 'PyTorch accumulates gradients by default; optimizer.zero_grad() clears previous gradients before computing new ones with loss.backward().'
      }
    ];
  } else if (key.includes('leet') || key.includes('algo') || key.includes('code') || key.includes('cs') || key.includes('computer')) {
    return [
      {
        id: 'q-1',
        question: 'What is the worst-case time complexity of searching for an element in an unsorted array of size n?',
        options: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'],
        answerIndex: 2,
        explanation: 'In the worst case, the target element is at the very end of the array or absent, requiring n element inspections.'
      },
      {
        id: 'q-2',
        question: 'Which data structure operates on a First-In, First-Out (FIFO) basis?',
        options: ['Stack', 'Queue', 'Heap', 'Binary Tree'],
        answerIndex: 1,
        explanation: 'Queues process items in the sequence they were enqueued (FIFO).'
      },
      {
        id: 'q-3',
        question: 'What is the space complexity of Depth-First Search (DFS) on a balanced binary tree with n nodes?',
        options: ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'],
        answerIndex: 1,
        explanation: 'On a balanced binary tree, the call stack height is proportional to the tree height, which is log(n).'
      },
      {
        id: 'q-4',
        question: 'Which algorithm finds the single-source shortest path in a graph with non-negative edge weights?',
        options: ['Bellman-Ford', 'Dijkstra’s Algorithm', 'Kruskal’s Algorithm', 'QuickSort'],
        answerIndex: 1,
        explanation: 'Dijkstra’s algorithm uses a priority queue to greedily compute shortest paths in O((V + E) log V) time.'
      },
      {
        id: 'q-5',
        question: 'What is the average time complexity of inserting into a well-designed Hash Map?',
        options: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'],
        answerIndex: 0,
        explanation: 'With a uniform hash distribution and reasonable load factor, average hash map insertion is O(1) constant time.'
      }
    ];
  } else if (key.includes('cbse') || key.includes('12th')) {
    return [
      {
        id: 'q-1',
        question: 'Which of the following organic compounds will NOT undergo Aldol condensation (CBSE Chemistry)?',
        options: [
          'Acetaldehyde (CH₃CHO)',
          'Formaldehyde (HCHO)',
          'Acetone (CH₃COCH₃)',
          'Propanal (CH₃CH₂CHO)'
        ],
        answerIndex: 1,
        explanation: 'Formaldehyde (HCHO) lacks an α-hydrogen atom and therefore undergoes the Cannizzaro reaction instead of Aldol condensation.'
      },
      {
        id: 'q-2',
        question: 'What is the SI unit of Magnetic Dipole Moment M (CBSE Physics)?',
        options: [
          'Tesla (T)',
          'Ampere-metre² (A·m²)',
          'Weber (Wb)',
          'Henry (H)'
        ],
        answerIndex: 1,
        explanation: 'Magnetic dipole moment M = Current (A) × Area (m²), which gives the SI unit Ampere-metre² (A·m²).'
      },
      {
        id: 'q-3',
        question: 'In CBSE Class 12 Probability, if P(A) = 0.6, P(B) = 0.3, and A and B are independent events, what is P(A ∩ B)?',
        options: [
          '0.90',
          '0.18',
          '0.30',
          '0.50'
        ],
        answerIndex: 1,
        explanation: 'For independent events, P(A ∩ B) = P(A) × P(B) = 0.6 × 0.3 = 0.18.'
      },
      {
        id: 'q-4',
        question: 'In Python CBSE Class 12 CS file handling, which mode is used to append binary data to a file?',
        options: [
          "'r+'",
          "'ab'",
          "'w'",
          "'a'"
        ],
        answerIndex: 1,
        explanation: "'ab' opens a file for appending data in binary format without overwriting the previous contents."
      },
      {
        id: 'q-5',
        question: 'Which protein subunit directs RNA Polymerase to bind specifically to the promoter region during prokaryotic transcription?',
        options: [
          'DNA Polymerase I',
          'Sigma factor (σ)',
          'Rho factor (ρ)',
          'DNA Ligase'
        ],
        answerIndex: 1,
        explanation: 'The Sigma factor (σ) is the initiation factor that confers promoter-specific binding capability to RNA polymerase.'
      }
    ];
  } else {
    return [
      {
        id: 'q-1',
        question: 'What is the key advantage of Active Recall over passive re-reading?',
        options: [
          'Re-reading creates an illusion of fluency, while retrieval strengthens synaptic memory pathways',
          'Passive re-reading is twice as fast',
          'Active recall is only useful for history classes',
          'There is no scientific difference between the two'
        ],
        answerIndex: 0,
        explanation: 'Retrieving knowledge from memory requires cognitive effort, which signals the brain that the information is critical to retain.'
      },
      {
        id: 'q-2',
        question: 'How does Spaced Repetition counteract the Ebbinghaus Forgetting Curve?',
        options: [
          'By reviewing material right before you are about to forget it',
          'By studying 12 hours straight the night before an exam',
          'By never reviewing after the initial class lecture',
          'By reading textbooks backward'
        ],
        answerIndex: 0,
        explanation: 'Strategically spaced review intervals flatten the forgetting curve, converting information from short-term to permanent memory.'
      },
      {
        id: 'q-3',
        question: 'What should you do when you answer a flashcard or practice quiz question incorrectly?',
        options: [
          'Immediately skip to the next subject',
          'Review the concept explanation, write down the missing intuition, and flag it for short-term review',
          'Delete the card from your study deck',
          'Assume the test question was flawed'
        ],
        answerIndex: 1,
        explanation: 'Mistakes are the most valuable learning data points. Analyzing errors locks in correct mental models.'
      },
      {
        id: 'q-4',
        question: 'What is the primary role of a study squad during exam prep?',
        options: [
          'Competing against each other to lower class averages',
          'Peer teaching, accountability, sharing high-yield resources, and collective problem solving',
          'Only discussing exam rumors',
          'Copying each other’s homework without understanding'
        ],
        answerIndex: 1,
        explanation: 'Peer collaboration accelerates learning through the Feynman technique and ensures sustained motivation.'
      },
      {
        id: 'q-5',
        question: 'What is the optimal mindset when approaching difficult problem sets?',
        options: [
          'Fixed mindset: if I cannot solve it in 2 minutes, I lack the talent',
          'Growth mindset: struggle and systematic analysis build problem-solving muscle and deeper intuition',
          'Avoid all hard problems to protect confidence',
          'Only practice problems you already know how to solve'
        ],
        answerIndex: 1,
        explanation: 'Cognitive growth occurs when you push beyond your comfort zone and learn from the friction.'
      }
    ];
  }
}

  // Generate either Flashcards or Quiz
  const handleGenerate = async (targetMode = mode) => {
    if (!user) {
      openAuthModal?.('register');
      return;
    }
    setIsGenerating(true);
    setStatusMessage('');
    setIsFlipped(false);

    let notesContext = '';
    if (sourceType === 'notes') {
      notesContext = squad?.sharedNotes || '';
    }

    let topicContext = '';
    if (sourceType === 'custom') {
      topicContext = customTopic.trim();
    }

    try {
      if (targetMode === 'flashcards') {
        const res = await aiAPI.generateFlashcards({
          subject: squad?.subject || 'Computer Science',
          category: squad?.category || 'General',
          topic: topicContext,
          notes: notesContext,
        });

        if (res.data?.flashcards && res.data.flashcards.length > 0) {
          setFlashcards(res.data.flashcards);
          setCurrentIndex(0);
          setMasteredIds(new Set());
          setReviewIds(new Set());
          setPoweredBy(res.data.poweredBy || 'Gemini AI');
        } else {
          throw new Error('Empty flashcard response');
        }
      } else {
        const res = await aiAPI.generateQuiz({
          subject: squad?.subject || 'Computer Science',
          category: squad?.category || 'General',
          topic: topicContext,
          notes: notesContext,
        });

        if (res.data?.quiz && res.data.quiz.length > 0) {
          setQuizQuestions(res.data.quiz);
          setCurrentQuizIndex(0);
          setSelectedAnswers({});
          setIsQuizFinished(false);
          setPoweredBy(res.data.poweredBy || 'Gemini AI');
        } else {
          throw new Error('Empty quiz response');
        }
      }
    } catch (err) {
      if (isPaywallError(err)) {
        setStatusMessage(
          '👑 Daily 5/5 free AI limit reached — Upgrade to StudySquad Pro (₹199/mo) for unlimited AI flashcards & quizzes!'
        );
        return;
      }

      console.warn('Backend AI unavailable, activating smart curated fallback deck:', err.message);
      // Graceful offline fallback: Load curated high-yield study cards
      if (targetMode === 'flashcards') {
        const fallbackCards = getClientFallbackFlashcards(
          squad?.subject,
          squad?.category,
          topicContext || notesContext
        );
        setFlashcards(fallbackCards);
        setCurrentIndex(0);
        setMasteredIds(new Set());
        setReviewIds(new Set());
        setPoweredBy('Curated Study Engine');
      } else {
        const fallbackQuiz = getClientFallbackQuiz(
          squad?.subject,
          squad?.category,
          topicContext || notesContext
        );
        setQuizQuestions(fallbackQuiz);
        setCurrentQuizIndex(0);
        setSelectedAnswers({});
        setIsQuizFinished(false);
        setPoweredBy('Curated Study Engine');
      }

      setStatusMessage(
        'Loaded curated high-yield study deck while live AI service wakes up. Click Generate again in a moment for custom AI cards.'
      );
      setTimeout(() => setStatusMessage(''), 8000);
    } finally {
      setIsGenerating(false);
      refreshUsage(); // Refresh daily usage counter after each AI generation call
    }
  };

  // ─── Flashcard Actions ───────────────────────────────────────────────────────
  const currentCard = flashcards[currentIndex];

  const handleNextCard = () => {
    setIsFlipped(false);
    if (currentIndex < flashcards.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrevCard = () => {
    setIsFlipped(false);
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleMarkMastered = () => {
    if (!currentCard) return;
    setMasteredIds((prev) => new Set([...prev, currentCard.id]));
    setReviewIds((prev) => {
      const next = new Set(prev);
      next.delete(currentCard.id);
      return next;
    });
    handleNextCard();
  };

  const handleMarkReview = () => {
    if (!currentCard) return;
    setReviewIds((prev) => new Set([...prev, currentCard.id]));
    setMasteredIds((prev) => {
      const next = new Set(prev);
      next.delete(currentCard.id);
      return next;
    });
    handleNextCard();
  };

  const handleShuffleCards = () => {
    const shuffled = [...flashcards].sort(() => Math.random() - 0.5);
    setFlashcards(shuffled);
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  // ─── Quiz Actions ────────────────────────────────────────────────────────────
  const currentQuestion = quizQuestions[currentQuizIndex];
  const hasAnsweredCurrent = selectedAnswers[currentQuizIndex] !== undefined;

  const handleSelectAnswer = (optionIdx) => {
    if (hasAnsweredCurrent) return; // Prevent changing answer once selected
    setSelectedAnswers((prev) => ({
      ...prev,
      [currentQuizIndex]: optionIdx,
    }));
  };

  const handleNextQuizQuestion = () => {
    if (currentQuizIndex < quizQuestions.length - 1) {
      setCurrentQuizIndex((prev) => prev + 1);
    } else {
      setIsQuizFinished(true);
    }
  };

  const calculateScore = () => {
    let correct = 0;
    quizQuestions.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.answerIndex) {
        correct++;
      }
    });
    return correct;
  };

  // Broadcast quiz victory to squad chat via live Socket (with REST fallback)
  const handleShareQuizScore = async () => {
    if (!user) {
      openAuthModal?.('login');
      return;
    }

    const score = calculateScore();
    const total = quizQuestions.length;
    const pct = Math.round((score / total) * 100);
    const content = `🏆 Completed the **${squad.subject}** Practice Quiz with **${score}/${total}** (${pct}%)! Challenge your squad to beat it!`;

    try {
      if (socket?.connected) {
        socket.emit('send_message', {
          squadId: squad.id,
          userId: user.id,
          content,
        });
      } else {
        await squadsAPI.sendMessage(squad.id, content);
      }
      setSharedToast(true);
      setTimeout(() => setSharedToast(false), 3000);
    } catch (err) {
      console.warn('Share to chat error:', err.message);
    }
  };

  // ─── Mode 3: Viva Voce Handlers ─────────────────────────────────────────────
  const handleStartViva = async (opts = {}) => {
    if (!user) {
      openAuthModal?.('register');
      return;
    }
    const targetCount = opts?.overrideTarget !== undefined ? opts.overrideTarget : vivaTargetCount;
    const currentLevel = opts?.overrideLevel || vivaLevel;
    const isReroll = !!opts?.isReroll;
    const activeTopic = vivaTopic.trim() || customTopic.trim() || squad?.name || squad?.subject || 'Core Curriculum';

    try {
      setIsSubmittingViva(true);
      setStatusMessage('');
      const exclusions = [];
      if (vivaQuestion) exclusions.push(vivaQuestion);
      vivaHistory.forEach((h) => {
        if (h.question) exclusions.push(h.question);
      });

      const res = await aiAPI.vivaSimulator({
        subject: squad?.subject || 'Academics',
        topic: activeTopic,
        level: currentLevel,
        questionNumber: 1,
        totalQuestions: targetCount,
        excludeQuestions: exclusions,
        seed: Date.now(),
      });

      setVivaQuestion(res.data?.nextQuestion || `Explain the core invariant and mechanism of ${activeTopic} in your own words.`);
      setVivaFeedback(null);
      setVivaAnswerInput('');
      setVivaStage(1);
      setVivaHistory([]);
      setIsVivaActive(true);
      setIsVivaFinished(false);
    } catch (err) {
      if (isPaywallError(err)) {
        setStatusMessage(
          '👑 Daily 5/5 free AI limit reached — Upgrade to StudySquad Pro (₹199/mo) for unlimited Mock Viva rounds!'
        );
        return;
      }
      console.warn('Viva start error, using fallback:', err.message);
      const fallbackQuestions = [
        `What is the core working invariant of ${activeTopic}, and why does it prevent failure under concurrent or edge execution?`,
        `When evaluating the asymptotic time and space complexity of ${activeTopic}, what are the critical trade-offs between memory overhead and execution speed?`,
        `Can you walk me through an edge-case or failure scenario where ${activeTopic} breaks down or requires defensive fallback handling?`,
        `In practical production environments, how does hardware architecture—such as CPU cache locality and branch prediction—affect the performance of ${activeTopic}?`,
        `How would you prove the termination and inductive correctness of ${activeTopic} under adversarial input conditions?`,
      ];
      const idx = (Number(targetCount) + currentLevel.length + (isReroll ? 1 : 0)) % fallbackQuestions.length;
      setVivaQuestion(fallbackQuestions[idx]);
      setVivaFeedback(null);
      setVivaAnswerInput('');
      setVivaStage(1);
      setVivaHistory([]);
      setIsVivaActive(true);
      setIsVivaFinished(false);
    } finally {
      setIsSubmittingViva(false);
      refreshUsage();
    }
  };

  const handleSelectRounds = async (newCount) => {
    setVivaTargetCount(newCount);
    if (isVivaActive) {
      await handleStartViva({ overrideTarget: newCount, overrideLevel: vivaLevel });
    }
  };

  const handleSelectRigor = async (newLvl) => {
    setVivaLevel(newLvl);
    if (isVivaActive) {
      await handleStartViva({ overrideTarget: vivaTargetCount, overrideLevel: newLvl });
    }
  };

  const handleRerollQuestion = async () => {
    await handleStartViva({ overrideTarget: vivaTargetCount, overrideLevel: vivaLevel, isReroll: true });
  };

  const handleSubmitVivaAnswer = async (e) => {
    e?.preventDefault();
    if (!vivaAnswerInput.trim()) return;

    const activeTopic = vivaTopic.trim() || customTopic.trim() || squad?.name || squad?.subject || 'Core Curriculum';
    try {
      setIsSubmittingViva(true);
      const res = await aiAPI.vivaSimulator({
        subject: squad?.subject || 'Academics',
        topic: activeTopic,
        level: vivaLevel,
        questionNumber: vivaStage,
        totalQuestions: vivaTargetCount,
        userResponse: vivaAnswerInput.trim(),
        previousQuestion: vivaQuestion,
        vivaHistory,
      });

      const entry = {
        question: vivaQuestion,
        userResponse: vivaAnswerInput.trim(),
        score: res.data?.score || 8,
        feedback: res.data?.feedback || 'Good explanation. Ensure you include boundary conditions and time complexity trade-offs.',
        modelAnswer: res.data?.modelAnswer || 'Directly state the foundational invariants, time complexity trade-offs, and failure handling.',
        keyConcept: res.data?.keyConcept || 'Core Principle',
      };

      const updatedHistory = [...vivaHistory, entry];
      setVivaHistory(updatedHistory);
      setVivaFeedback(entry);
      setVivaAnswerInput('');

      // Check if target count reached
      if (vivaTargetCount > 0 && vivaStage >= vivaTargetCount) {
        setIsVivaFinished(true);
      } else if (res.data?.nextQuestion) {
        setVivaQuestion(res.data.nextQuestion);
        setVivaStage((prev) => prev + 1);
      } else {
        setIsVivaFinished(true);
      }
    } catch (err) {
      if (isPaywallError(err)) {
        setStatusMessage(
          '👑 Daily 5/5 free AI limit reached — Upgrade to StudySquad Pro (₹199/mo) to continue grading your oral Viva answers!'
        );
        return;
      }
      console.warn('Viva answer submit error:', err.message);
      const fallbackEntry = {
        question: vivaQuestion,
        userResponse: vivaAnswerInput.trim(),
        score: 8,
        feedback: 'Solid response! To score maximum marks in an oral exam, explicitly cite boundary limits and runtime complexity.',
        modelAnswer: 'Master the fundamental equations, test with boundary inputs, and maintain algorithmic invariants.',
        keyConcept: 'Algorithmic Invariant',
      };
      const updatedHistory = [...vivaHistory, fallbackEntry];
      setVivaHistory(updatedHistory);
      setVivaFeedback(fallbackEntry);
      setVivaAnswerInput('');

      if (vivaTargetCount > 0 && vivaStage >= vivaTargetCount) {
        setIsVivaFinished(true);
      } else {
        setVivaQuestion(`Can you walk me through a failure scenario or edge case where ${activeTopic} fails or degrades in performance?`);
        setVivaStage((prev) => prev + 1);
      }
    } finally {
      setIsSubmittingViva(false);
      refreshUsage();
    }
  };

  const handleFinishVivaEarly = () => {
    setIsVivaFinished(true);
  };

  const handleResetViva = () => {
    setIsVivaActive(false);
    setIsVivaFinished(false);
    setVivaQuestion('');
    setVivaAnswerInput('');
    setVivaFeedback(null);
    setVivaHistory([]);
    setVivaStage(1);
  };

  // ─── Mode 7: AI Study Tutor (ChatGPT) Handlers ─────────────────────────────
  const processImageFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      const rawDataUrl = loadEvent.target?.result;
      if (!rawDataUrl) return;

      const img = new Image();
      img.onload = () => {
        // Auto-scale huge 4K/retina screenshots to max 1600px to ensure ultra-fast upload & 0 server errors
        const maxDim = 1600;
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const optimized = canvas.toDataURL('image/jpeg', 0.88);
          setChatPastedImage(optimized);
        } else {
          setChatPastedImage(rawDataUrl);
        }
      };
      img.onerror = () => {
        setChatPastedImage(rawDataUrl);
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleChatPaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          processImageFile(file);
          e.preventDefault();
          break;
        }
      }
    }
  };

  const handleImageFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      processImageFile(file);
    }
    e.target.value = '';
  };

  const handleSendChatMessage = async (presetText) => {
    if (!user) {
      openAuthModal?.('register');
      return;
    }

    const textToSend = (presetText || chatInput).trim();
    if ((!textToSend && !chatPastedImage) || isChatLoading) return;

    const currentImage = chatPastedImage;
    const displayText = textToSend || 'Please analyze this screenshot and explain the solution, answer, or concepts step-by-step.';

    const userMsg = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: displayText,
      image: currentImage,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newMessages = [...chatMessages, userMsg];
    setChatMessages(newMessages);
    setChatInput('');
    setChatPastedImage(null);
    setIsChatLoading(true);

    try {
      let res;
      const requestPayload = {
        squadId: squad?.id,
        query: displayText,
        image: currentImage,
        context: {
          subject: squad?.subject || 'Academics',
          category: squad?.category || 'General Studies',
          squadName: squad?.name || 'StudySquad',
          sharedNotes: squad?.sharedNotes || '',
        },
        history: newMessages,
        mode: 'chat',
      };

      try {
        res = await aiAPI.askSquadBot(requestPayload);
      } catch (firstErr) {
        // Do not retry 4xx client/paywall errors; only retry transient network or 5xx blips
        const status = firstErr?.response?.status;
        if (status && status >= 400 && status < 500) {
          throw firstErr;
        }
        await new Promise((r) => setTimeout(r, 500));
        res = await aiAPI.askSquadBot(requestPayload);
      }

      const aiMsg = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: res.data?.response || "I'm here! What specific question or concept can I help you work through?",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        poweredBy: res.data?.poweredBy || 'Google Gemini',
      };

      setChatMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      if (isPaywallError(err)) {
        const paywallMsg = {
          id: `ai-paywall-${Date.now()}`,
          sender: 'ai',
          text: `👑 **You've used all 5 free daily AI credits for today!**\n\nUpgrade to **StudySquad Pro (₹199/month or ₹999/year)** for **unlimited** 24/7 AI Study Tutor answers, screenshot problem solving, Mock Vivas, Cheat Sheets, and Code Audits — or return after **12:00 AM IST** when your 5 free credits reset.`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          poweredBy: 'StudySquad Pro',
        };
        setChatMessages((prev) => [...prev, paywallMsg]);
        return;
      }

      console.warn('AI chat error:', err.message);
      const lower = textToSend.toLowerCase().trim();
      let fallbackText = '';

      if (
        lower.startsWith('hi') ||
        lower.startsWith('hello') ||
        lower.startsWith('hey') ||
        lower.includes('how are you') ||
        lower.includes('how are u')
      ) {
        fallbackText = `Hey there! 😊 I'm doing great, thanks for asking! I'm your StudySquad AI Tutor for **${squad?.name || squad?.subject || 'your subjects'}**.\n\nWhat concept, algorithm, or problem would you like to tackle today? Let me know and we'll break it down together!`;
      } else {
        fallbackText = `Here's a breakdown to help you with **"${textToSend}"**:\n\n• **Core Principle**: Focus on the foundational rules and constraints of **${customTopic || squad?.subject || 'this topic'}**.\n• **Problem Strategy**: Verify edge cases, test inputs, and break the solution into step-by-step logic.\n• Feel free to ask me to write code, derive a formula, or quiz you on this!`;
      }

      const fallbackAiMsg = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: fallbackText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        poweredBy: 'StudySquad AI Tutor',
      };
      setChatMessages((prev) => [...prev, fallbackAiMsg]);
    } finally {
      setIsChatLoading(false);
      refreshUsage();
    }
  };

  const handleCopyChatText = (id, text) => {
    navigator.clipboard.writeText(text);
    setChatCopiedId(id);
    setTimeout(() => setChatCopiedId(null), 2000);
  };

  const handleClearChat = () => {
    setChatMessages([
      {
        id: `reset-${Date.now()}`,
        sender: 'ai',
        text: `🧹 **Chat conversation reset!**\n\nAsk me anything about **${customTopic || squad?.subject || 'your subjects'}**—whether you want a problem solved, a concept explained, or practice questions generated!`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        poweredBy: 'Google Gemini',
      },
    ]);
  };

  // ─── Mode 4: 1-Page High-Yield Cheat Sheet Handlers ─────────────────────────
  const handleGenerateCheatSheet = async () => {
    if (!user) {
      openAuthModal?.('register');
      return;
    }
    try {
      setIsGeneratingSheet(true);
      setStatusMessage('');
      const res = await aiAPI.generateCheatsheet({
        subject: squad?.subject || 'Academics',
        topic: customTopic || squad?.name || squad?.subject || 'Study Subject',
        notes: squad?.sharedNotes || '',
      });
      setCheatSheetText(res.data?.cheatSheet || 'Cheat sheet generated successfully!');
    } catch (err) {
      if (isPaywallError(err)) {
        setStatusMessage(
          '👑 Daily 5/5 free AI limit reached — Upgrade to StudySquad Pro (₹199/mo) for unlimited 1-Page Cheat Sheets!'
        );
        return;
      }
      console.warn('Cheat sheet generation error:', err.message);
      setCheatSheetText(
        `# ⚡ ${((customTopic || squad?.subject || 'STUDY')).toUpperCase()} — 1-PAGE HIGH-YIELD REVISION CHEAT SHEET\n\n` +
        `### 📌 1. Essential Complexities & Performance Matrix\n` +
        `• **Average Search/Lookup**: \`O(1)\` to \`O(log n)\` | **Worst-Case**: \`O(n)\`\n` +
        `• **Auxiliary Space**: \`O(1)\` constant space for in-place algorithms; \`O(n)\` for caching/memoization.\n\n` +
        `### 🔑 2. Core Invariants & Definitions\n` +
        `• **Invariant**: State condition that must hold strictly true at every iteration step.\n` +
        `• **Boundary Conditions**: Always test \`n == 0\`, \`n == 1\`, duplicate keys, and max integer limits (\`2^31 - 1\`).\n\n` +
        `### 💡 3. High-Yield Mnemonics & Mental Shortcuts\n` +
        `• *"Fast & Slow Pointers"*: The universal archetype for cycle detection and finding list midpoints.\n` +
        `• *"Prefix Sums"*: Compresses dynamic range queries from \`O(n)\` to instant \`O(1)\`.\n` +
        `• *"Monotonic Stack"*: Solves Next Greater Element queries in single \`O(n)\` pass.\n\n` +
        `### ⚠️ 4. Top 5 Deadly Exam Gotchas\n` +
        `1. Off-by-one errors in binary search bounds (\`low <= high\` vs \`low < high\`).\n` +
        `2. Integer overflow when calculating midpoint (\`low + (high - low) / 2\`).\n` +
        `3. Forgetting return in base cases during recursion causing stack overflow.\n` +
        `4. Mutating collections while looping through them.\n` +
        `5. Confusing average amortized runtime with guaranteed worst-case bounds.\n\n` +
        `### 🏆 5. High-Yield Archetype Checklist\n` +
        `[ ] Two-Pointer Traversal on Sorted Collections\n` +
        `[ ] Sliding Window with Dynamic Frequency Counter\n` +
        `[ ] DFS / BFS Matrix Traversal with Visited Set`
      );
    } finally {
      setIsGeneratingSheet(false);
      refreshUsage();
    }
  };

  const handleCopyCheatSheet = () => {
    if (!cheatSheetText) return;
    navigator.clipboard.writeText(cheatSheetText);
    setSheetCopied(true);
    setTimeout(() => setSheetCopied(false), 2500);
  };

  const handleDownloadCheatSheet = () => {
    if (!cheatSheetText) return;
    const blob = new Blob([cheatSheetText], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const safeTopic = (customTopic || squad?.subject || 'CheatSheet').replace(/[^a-zA-Z0-9_-]/g, '_');
    link.setAttribute('download', `${safeTopic}_1Page_CheatSheet.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // ─── Mode 5: Feynman 3-Tier Explainer Handlers ──────────────────────────────
  const handleExplainFeynman = async () => {
    if (!user) {
      openAuthModal?.('register');
      return;
    }
    const topicToExplain = feynmanInput.trim() || customTopic || squad?.subject || 'Core Concept';
    try {
      setIsGeneratingFeynman(true);
      setStatusMessage('');
      const res = await aiAPI.feynmanExplain({
        concept: topicToExplain,
        subject: squad?.subject || 'Academics',
      });
      if (res.data && res.data.eli5) {
        setFeynmanResult(res.data);
      } else {
        throw new Error('Incomplete concept explanation received');
      }
    } catch (err) {
      if (isPaywallError(err)) {
        setStatusMessage(
          '👑 Daily 5/5 free AI limit reached — Upgrade to StudySquad Pro (₹199/mo) for unlimited Feynman 3-Tier Explanations!'
        );
        return;
      }
      console.warn('Feynman explainer error:', err.message);
      setFeynmanResult({
        concept: topicToExplain,
        eli5: `Think of ${topicToExplain} like an express tollbooth on a highway: instead of stopping every single car for a manual ticket, fast electronic tags let cars cruise through at full speed, eliminating traffic jams!`,
        mechanics: `${topicToExplain} works by decomposing multi-step computations into discrete state transitions with guaranteed invariants, reducing redundant operations from O(n²) to O(n).`,
        examTraps: [
          'Assuming best-case runtime applies to reversed or adversarial inputs.',
          'Ignoring call stack overhead in deep recursive calls.',
          'Confusing mathematical identity with floating-point computational accuracy.'
        ],
        oneLineTakeaway: 'Master the core invariant first, verify the edge cases, and let the structure do the work!'
      });
    } finally {
      setIsGeneratingFeynman(false);
      refreshUsage();
    }
  };

  // ─── Mode 6: AI Code & Solution Auditor Handlers ─────────────────────────────
  const handleRunCodeAudit = async () => {
    if (!user) {
      openAuthModal?.('register');
      return;
    }
    if (!auditCode.trim()) return;

    try {
      setIsAuditing(true);
      setAuditError('');
      setStatusMessage('');
      const res = await aiAPI.codeAudit({
        code: auditCode,
        language: auditLanguage,
        problem: customTopic || squad?.name || squad?.subject || 'Code Analysis',
      });
      setAuditResult(res.data);
    } catch (err) {
      console.warn('Code audit error:', err.message);
      if (isPaywallError(err)) {
        setAuditError(
          '👑 Daily 5/5 free AI limit reached — Upgrade to StudySquad Pro (₹199/mo) for unlimited AI Code & Solution Audits!'
        );
      } else {
        setAuditError(
          err.response?.data?.message ||
            'AI Code Auditor is temporarily waking up. Your code is untouched — please click Run Audit again in a few seconds.'
        );
      }
    } finally {
      setIsAuditing(false);
      refreshUsage();
    }
  };

  const handleCopyCode = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const masteryPercentage = flashcards.length > 0
    ? Math.round((masteredIds.size / flashcards.length) * 100)
    : 0;

  const isProUser = Boolean(user?.isPro || dailyUsage?.isPro);
  const freeLimit = dailyUsage?.limit && dailyUsage.limit <= 20 ? dailyUsage.limit : 5;
  const freeUsed = Math.min(freeLimit, dailyUsage?.used ?? 0);
  const freeRemaining = Math.max(0, dailyUsage?.remaining ?? freeLimit - freeUsed);

  return (
    <div className="space-y-4">
      {/* ─── Live Pro / Freemium Credit Meter Ribbon (Visible Across All 7 AI Engines) ─── */}
      {isProUser ? (
        <div className="px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-emerald-500/15 border border-amber-400/35 flex items-center justify-between text-xs text-amber-200 gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Crown className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="font-bold">
              StudySquad Pro Active • Unlimited AI Generations Across All 7 Academic Engines
            </span>
          </div>
          <span className="text-[10px] uppercase font-black bg-amber-400/20 text-amber-300 px-2.5 py-0.5 rounded-full border border-amber-400/40 shrink-0">
            Pro Unlimited
          </span>
        </div>
      ) : user ? (
        <div
          className={`px-3.5 py-2.5 rounded-xl border flex items-center justify-between text-xs gap-2.5 flex-wrap ${
            freeRemaining === 0
              ? 'bg-rose-950/35 border-rose-500/35 text-rose-200'
              : freeRemaining <= 2
              ? 'bg-amber-950/30 border-amber-500/35 text-amber-200'
              : 'bg-white/[0.04] border-white/15 text-neutral-200'
          }`}
        >
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center gap-1" title={`${freeRemaining}/${freeLimit} free daily credits remaining`}>
              {[...Array(freeLimit)].map((_, idx) => (
                <span
                  key={idx}
                  className={`w-2.5 h-2.5 rounded-full transition-all ${
                    idx < freeUsed
                      ? freeRemaining === 0
                        ? 'bg-rose-400'
                        : 'bg-amber-400'
                      : 'bg-emerald-400/80'
                  }`}
                />
              ))}
            </div>
            <span className="font-semibold">
              {freeRemaining === 0
                ? '0/5 Free AI Credits Left Today • Resets 12:00 AM IST'
                : `${freeRemaining}/${freeLimit} Free AI Credits Left Today • Resets 12:00 AM IST`}
            </span>
          </div>

          <button
            type="button"
            onClick={() => onOpenProModal?.()}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-neutral-950 font-black text-[11px] cursor-pointer shadow-sm transition-all shrink-0"
          >
            <Crown className="w-3 h-3" />
            <span>Upgrade to Pro • ₹199/mo</span>
          </button>
        </div>
      ) : (
        <div className="px-3.5 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs text-emerald-200 gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-bold">
              Sign in for 5 Free AI Generations Every Day across 3D Flashcards, Quiz, AI Tutor, Viva, Cheat Sheet & Code Audit
            </span>
          </div>
          <button
            type="button"
            onClick={() => openAuthModal?.('register')}
            className="px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-black text-[11px] cursor-pointer transition-colors shrink-0"
          >
            Sign In Free
          </button>
        </div>
      )}

      {statusMessage && (
        <div className="px-3.5 py-2.5 rounded-xl bg-amber-950/35 border border-amber-500/35 flex items-center justify-between gap-2 text-xs text-amber-200 flex-wrap">
          <span className="font-medium">{statusMessage}</span>
          {!isProUser && user && statusMessage.includes('Upgrade') && (
            <button
              type="button"
              onClick={() => onOpenProModal?.()}
              className="px-2.5 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-neutral-950 font-black text-[11px] cursor-pointer shrink-0"
            >
              Unlock Unlimited
            </button>
          )}
        </div>
      )}

      {/* ─── Mode Switcher Header Card ─── */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
        {/* Title Row */}
        <div className="flex items-center justify-between gap-3 border-b border-white/5 pb-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-500/20 via-teal-500/20 to-cyan-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0 shadow-sm">
              <Brain className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-sm sm:text-base font-bold text-white tracking-tight">
                  <span className="sm:hidden">AI Academic Suite</span>
                  <span className="hidden sm:inline">AI Academic Studio & Power Suite</span>
                </h4>
                {poweredBy && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">
                    {poweredBy}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-neutral-400 truncate hidden sm:block">
                7 specialized AI engines for 3D active recall, 24/7 AI tutoring, oral vivas, cheat sheets & solution audits.
              </p>
            </div>
          </div>

          <span className="text-[10px] sm:text-[11px] font-semibold text-neutral-400 px-2 sm:px-2.5 py-1 rounded-full bg-white/5 border border-white/10 shrink-0 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="hidden sm:inline">7 AI Engines Ready</span>
            <span className="sm:hidden">7 Engines</span>
          </span>
        </div>

        {/* 7 Responsive Mode Grid Buttons */}
        <div className="flex overflow-x-auto no-scrollbar scroll-smooth gap-2 pb-1 sm:grid sm:grid-cols-4 lg:grid-cols-7">
          <button
            type="button"
            onClick={() => {
              setMode('flashcards');
              if (flashcards.length === 0) handleGenerate('flashcards');
            }}
            className={`py-2 px-3 sm:px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer border shrink-0 whitespace-nowrap ${
              mode === 'flashcards'
                ? 'bg-emerald-500 text-neutral-950 border-emerald-400 shadow-md shadow-emerald-500/20'
                : 'bg-white/5 border-white/10 text-neutral-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <Layers className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">3D Flashcards</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('quiz');
              if (quizQuestions.length === 0) handleGenerate('quiz');
            }}
            className={`py-2 px-3 sm:px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer border shrink-0 whitespace-nowrap ${
              mode === 'quiz'
                ? 'bg-violet-500 text-white border-violet-400 shadow-md shadow-violet-500/20'
                : 'bg-white/5 border-white/10 text-neutral-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Practice Quiz</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('chat');
            }}
            className={`py-2 px-3 sm:px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer border shrink-0 whitespace-nowrap ${
              mode === 'chat'
                ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-blue-400 shadow-md shadow-blue-500/25'
                : 'bg-white/5 border-white/10 text-neutral-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <Bot className="w-3.5 h-3.5 shrink-0 text-blue-400" />
            <span className="truncate">AI Tutor</span>
            <span className="text-[9px] px-1 py-0.2 rounded bg-blue-500/20 text-blue-300 font-bold border border-blue-400/30">AI</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('viva');
            }}
            className={`py-2 px-3 sm:px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer border shrink-0 whitespace-nowrap ${
              mode === 'viva'
                ? 'bg-rose-500 text-white border-rose-400 shadow-md shadow-rose-500/20'
                : 'bg-white/5 border-white/10 text-neutral-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <Mic className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Mock Viva</span>
            <span className="text-[9px] px-1 py-0.2 rounded bg-rose-500/20 text-rose-300 font-bold border border-rose-400/30">ORAL</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('cheatsheet');
            }}
            className={`py-2 px-3 sm:px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer border shrink-0 whitespace-nowrap ${
              mode === 'cheatsheet'
                ? 'bg-amber-500 text-neutral-950 border-amber-400 shadow-md shadow-amber-500/20'
                : 'bg-white/5 border-white/10 text-neutral-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <FileText className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Cheat Sheet</span>
            <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-400/30">NOTES</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('feynman');
            }}
            className={`py-2 px-3 sm:px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer border shrink-0 whitespace-nowrap ${
              mode === 'feynman'
                ? 'bg-cyan-500 text-neutral-950 border-cyan-400 shadow-md shadow-cyan-500/20'
                : 'bg-white/5 border-white/10 text-neutral-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <Lightbulb className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Feynman</span>
            <span className="text-[9px] px-1 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-400/30">ELI5</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('audit');
            }}
            className={`py-2 px-3 sm:px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer border shrink-0 whitespace-nowrap ${
              mode === 'audit'
                ? 'bg-teal-500 text-neutral-950 border-teal-400 shadow-md shadow-teal-500/20'
                : 'bg-white/5 border-white/10 text-neutral-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <Terminal className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Code Audit</span>
            <span className="text-[9px] px-1 py-0.2 rounded bg-teal-500/20 text-teal-300 font-bold border border-teal-400/30">CODE</span>
          </button>
        </div>
      </div>

      {/* ─── Source Configuration & Generation Bar (for Flashcards & Quiz) ─── */}
      {(mode === 'flashcards' || mode === 'quiz') && (
      <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mr-1">
              Source:
            </span>
            <button
              type="button"
              onClick={() => setSourceType('notes')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer flex items-center gap-1.5 ${
                sourceType === 'notes'
                  ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300'
                  : 'bg-white/5 border-white/10 text-neutral-400 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Squad Notes</span>
              {squad?.sharedNotes && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setSourceType('subject')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer flex items-center gap-1.5 ${
                sourceType === 'subject'
                  ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-300'
                  : 'bg-white/5 border-white/10 text-neutral-400 hover:text-white'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>{squad?.subject || 'Subject'} Track</span>
            </button>

            <button
              type="button"
              onClick={() => setSourceType('custom')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer flex items-center gap-1.5 ${
                sourceType === 'custom'
                  ? 'bg-amber-500/20 border-amber-400/50 text-amber-300'
                  : 'bg-white/5 border-white/10 text-neutral-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Custom Topic</span>
            </button>
          </div>

          <button
            type="button"
            disabled={isGenerating}
            onClick={() => handleGenerate()}
            className="px-4 py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer disabled:opacity-50 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-neutral-950 shadow-emerald-500/20 hover:scale-102 shrink-0"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>AI Generating...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-black" />
                <span>Generate {mode === 'flashcards' ? 'Flashcards' : 'Quiz'}</span>
              </>
            )}
          </button>
        </div>

        {/* Custom topic prompt input */}
        {sourceType === 'custom' && (
          <div className="pt-2">
            <input
              type="text"
              value={customTopic}
              onChange={(e) => setCustomTopic(e.target.value)}
              placeholder="e.g. Dijkstra algorithm, Matrix transformations, Cell mitosis, Organic chemistry reactions..."
              className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/15 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-amber-400/50"
            />
          </div>
        )}
      </div>
      )}

      {/* ─── MODE 1: 3D FLIP FLASHCARDS ────────────────────────────────────────── */}
      {mode === 'flashcards' && (
        <div className="space-y-4">
          {flashcards.length > 0 ? (
            <>
              {/* Progress & Stats Bar */}
              <div className="flex items-center justify-between text-xs text-neutral-400 px-1">
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-white">
                    Card {currentIndex + 1} of {flashcards.length}
                  </span>
                  <span className="flex items-center gap-1 text-emerald-400 font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {masteredIds.size} Mastered ({masteryPercentage}%)
                  </span>
                  {reviewIds.size > 0 && (
                    <span className="flex items-center gap-1 text-amber-400 font-semibold">
                      <RotateCw className="w-3.5 h-3.5" />
                      {reviewIds.size} Need Review
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleShuffleCards}
                  className="hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Shuffle deck"
                >
                  <Shuffle className="w-3.5 h-3.5" />
                  <span>Shuffle</span>
                </button>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300"
                  style={{ width: `${((currentIndex + 1) / flashcards.length) * 100}%` }}
                />
              </div>

              {/* 3D Flip Card Container */}
              <div className="perspective-1000 w-full min-h-[290px] sm:min-h-[320px] select-none">
                <div
                  onClick={() => setIsFlipped(!isFlipped)}
                  className={`relative w-full min-h-[290px] sm:min-h-[320px] rounded-3xl p-6 sm:p-8 cursor-pointer transition-transform duration-500 transform-style-3d border ${
                    isFlipped ? 'rotate-y-180' : ''
                  } ${
                    masteredIds.has(currentCard?.id)
                      ? 'border-emerald-500/40 bg-gradient-to-br from-emerald-950/40 via-neutral-900 to-neutral-950'
                      : reviewIds.has(currentCard?.id)
                      ? 'border-amber-500/40 bg-gradient-to-br from-amber-950/40 via-neutral-900 to-neutral-950'
                      : 'border-white/15 bg-gradient-to-br from-neutral-900 via-neutral-900/90 to-black'
                  } shadow-2xl flex flex-col justify-between`}
                >
                  {/* FRONT SIDE */}
                  <div className="backface-hidden flex flex-col justify-between h-full">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 uppercase tracking-wider">
                          {currentCard?.tag || 'Concept'}
                        </span>
                        <span className="text-[11px] font-medium text-neutral-400 flex items-center gap-1.5">
                          <RotateCw className="w-3 h-3 text-emerald-400" /> Click to flip
                        </span>
                      </div>

                      <h3 className="text-lg sm:text-2xl font-bold text-white leading-relaxed mt-4">
                        {currentCard?.front}
                      </h3>
                    </div>

                    <div className="pt-6 border-t border-white/5 flex items-center justify-between text-xs text-neutral-400">
                      <span className="font-mono">Question / Challenge</span>
                      <span className="text-emerald-400 font-semibold text-[11px]">
                        Tap anywhere to reveal answer →
                      </span>
                    </div>
                  </div>

                  {/* BACK SIDE (ROTATED 180 DEG) */}
                  <div className="absolute inset-0 p-6 sm:p-8 rounded-3xl backface-hidden rotate-y-180 flex flex-col justify-between bg-gradient-to-br from-[#121b18] via-neutral-900 to-black">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-teal-500/20 text-teal-300 border border-teal-500/30 uppercase tracking-wider flex items-center gap-1">
                          <Check className="w-3 h-3 text-teal-400" /> Explanation & Solution
                        </span>
                        <span className="text-[11px] font-medium text-neutral-400 flex items-center gap-1.5">
                          <RotateCw className="w-3 h-3" /> Flip back
                        </span>
                      </div>

                      <p className="text-sm sm:text-base font-normal text-neutral-200 leading-relaxed mt-2 whitespace-pre-line">
                        {currentCard?.back}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-white/10 flex items-center justify-between text-xs text-neutral-400">
                      <span className="text-emerald-400 font-semibold">Active Recall Mastery</span>
                      <span className="font-mono text-[11px]">Card {currentIndex + 1}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Controls Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePrevCard}
                    disabled={currentIndex === 0}
                    className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-30 text-white transition-all cursor-pointer"
                    title="Previous Card"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNextCard}
                    disabled={currentIndex === flashcards.length - 1}
                    className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-30 text-white transition-all cursor-pointer"
                    title="Next Card"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleMarkReview}
                    className="px-4 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>Need Review</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleMarkMastered}
                    className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                    <span>Got It Right!</span>
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-12 px-4 rounded-3xl border border-dashed border-white/15 bg-white/5 space-y-3">
              <Layers className="w-10 h-10 text-neutral-500 mx-auto" />
              <h5 className="text-sm font-bold text-white">Ready to Generate Flashcards</h5>
              <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                Click the "Generate Flashcards" button above to turn your notes into smart study cards.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ─── MODE 2: PRACTICE EXAM QUIZ ────────────────────────────────────────── */}
      {mode === 'quiz' && (
        <div className="space-y-4">
          {quizQuestions.length > 0 ? (
            !isQuizFinished ? (
              <div className="space-y-4">
                {/* Header Ticker */}
                <div className="flex items-center justify-between text-xs text-neutral-400 px-1">
                  <span className="font-semibold text-white">
                    Question {currentQuizIndex + 1} of {quizQuestions.length}
                  </span>
                  <span className="text-violet-400 font-semibold">
                    Score: {calculateScore()} / {Object.keys(selectedAnswers).length} Answered
                  </span>
                </div>

                {/* Progress */}
                <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-violet-500 to-pink-500 transition-all duration-300"
                    style={{
                      width: `${((currentQuizIndex + 1) / quizQuestions.length) * 100}%`,
                    }}
                  />
                </div>

                {/* Question Card */}
                <div className="p-6 sm:p-7 rounded-3xl bg-white/5 border border-white/10 shadow-xl space-y-6">
                  <div>
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-violet-500/20 text-violet-300 border border-violet-500/30 uppercase tracking-wider">
                      Question {currentQuizIndex + 1}
                    </span>
                    <h3 className="text-base sm:text-xl font-bold text-white mt-3 leading-relaxed">
                      {currentQuestion?.question}
                    </h3>
                  </div>

                  {/* 4 Choices */}
                  <div className="space-y-2.5">
                    {currentQuestion?.options?.map((option, optIdx) => {
                      const isSelected = selectedAnswers[currentQuizIndex] === optIdx;
                      const isCorrect = optIdx === currentQuestion.answerIndex;
                      const hasChosen = hasAnsweredCurrent;

                      let style = 'bg-white/5 border-white/10 text-neutral-200 hover:bg-white/10 hover:border-white/20';

                      if (hasChosen) {
                        if (isCorrect) {
                          style = 'bg-emerald-500/20 border-emerald-500 text-emerald-200 shadow-md shadow-emerald-500/10';
                        } else if (isSelected && !isCorrect) {
                          style = 'bg-rose-500/20 border-rose-500 text-rose-200';
                        } else {
                          style = 'bg-white/5 border-white/5 text-neutral-500 opacity-60';
                        }
                      }

                      return (
                        <button
                          key={optIdx}
                          type="button"
                          disabled={hasChosen}
                          onClick={() => handleSelectAnswer(optIdx)}
                          className={`w-full p-4 rounded-2xl border text-left text-xs sm:text-sm font-medium transition-all flex items-center justify-between gap-3 cursor-pointer ${style}`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded-lg bg-black/40 border border-white/10 flex items-center justify-center text-[11px] font-bold text-neutral-300 shrink-0">
                              {String.fromCharCode(65 + optIdx)}
                            </span>
                            <span>{option}</span>
                          </div>

                          {hasChosen && isCorrect && (
                            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                          )}
                          {hasChosen && isSelected && !isCorrect && (
                            <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Explanation Reveal */}
                  {hasAnsweredCurrent && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-1.5"
                    >
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                        <Check className="w-3.5 h-3.5" />
                        <span>Concept Explanation</span>
                      </div>
                      <p className="text-xs text-neutral-300 leading-relaxed">
                        {currentQuestion?.explanation}
                      </p>
                    </motion.div>
                  )}

                  {/* Navigation Button */}
                  {hasAnsweredCurrent && (
                    <div className="pt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={handleNextQuizQuestion}
                        className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-violet-500/20 transition-all cursor-pointer"
                      >
                        <span>
                          {currentQuizIndex < quizQuestions.length - 1
                            ? 'Next Question'
                            : 'View Results'}
                        </span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Quiz Finished Score Screen */
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-8 sm:p-10 rounded-3xl bg-gradient-to-br from-violet-950/40 via-neutral-900 to-black border border-violet-500/30 text-center space-y-6 shadow-2xl"
              >
                <div className="w-16 h-16 rounded-2xl bg-violet-500/20 border border-violet-500/40 flex items-center justify-center mx-auto text-violet-400">
                  <Trophy className="w-8 h-8 text-amber-400" />
                </div>

                <div>
                  <span className="text-xs font-bold text-violet-400 uppercase tracking-widest">
                    Practice Exam Completed
                  </span>
                  <h3 className="text-3xl font-black text-white mt-1">
                    {calculateScore()} / {quizQuestions.length} Correct!
                  </h3>
                  <p className="text-xs text-neutral-400 mt-2 max-w-md mx-auto">
                    {calculateScore() === quizQuestions.length
                      ? '🔥 Flawless score! You have completely mastered this study track.'
                      : calculateScore() >= quizQuestions.length * 0.7
                      ? '👏 Great job! Strong understanding with only a few areas to polish.'
                      : '💡 Good practice! Review the explanations and retry to lock in the concepts.'}
                  </p>
                </div>

                {/* Score Pill */}
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 border border-white/15 text-sm font-bold text-white">
                  <Award className="w-4 h-4 text-amber-400" />
                  <span>
                    Mastery: {Math.round((calculateScore() / quizQuestions.length) * 100)}%
                  </span>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentQuizIndex(0);
                      setSelectedAnswers({});
                      setIsQuizFinished(false);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer border border-white/10"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Retake Quiz</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleGenerate('quiz')}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-violet-500/20 transition-all cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Generate New Quiz</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleShareQuizScore}
                    className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
                  >
                    {sharedToast ? <Check className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />}
                    <span>{sharedToast ? 'Posted to Chat!' : 'Share Score to Squad Chat'}</span>
                  </button>
                </div>
              </motion.div>
            )
          ) : (
            <div className="text-center py-12 px-4 rounded-3xl border border-dashed border-white/15 bg-white/5 space-y-3">
              <HelpCircle className="w-10 h-10 text-neutral-500 mx-auto" />
              <h5 className="text-sm font-bold text-white">Ready to Generate Practice Quiz</h5>
              <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                Click "Generate Quiz" above to create an exam simulation based on your study material.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ─── MODE 7: AI STUDY TUTOR (CHATGPT-STYLE CONVERSATIONAL ASSISTANT) ─── */}
      {mode === 'chat' && (
        <div className="space-y-4">
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-500/20 to-indigo-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0 shadow-sm">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h5 className="text-sm font-bold text-white flex items-center gap-2 flex-wrap">
                  <span>AI Study Copilot & Tutor</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30">
                    Gemini Vision + Tutor
                  </span>
                  {isProUser ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30 flex items-center gap-1">
                      <Crown className="w-2.5 h-2.5 text-amber-400" /> Pro Unlimited
                    </span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30 flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5 text-emerald-400" /> {freeRemaining}/{freeLimit} Free Today
                    </span>
                  )}
                </h5>
                <p className="text-xs text-neutral-400">
                  Ask anything about {customTopic || squad?.subject || 'your studies'} • Step-by-step problem solving & code explanations
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleClearChat}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 border border-white/10 text-xs font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer"
                title="Reset conversation"
              >
                <Trash2 className="w-3.5 h-3.5 text-neutral-400" />
                <span>Clear Chat</span>
              </button>
            </div>
          </div>

          {/* Quick Prompt Suggestions */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
            <span className="text-[11px] text-neutral-400 shrink-0 font-medium">Quick Prompts:</span>
            {[
              '💡 Explain this concept simply with everyday analogies',
              '📝 Give me 3 hard practice exam questions with solutions',
              '⚠️ What are the top 5 traps students fail on in exams?',
              '🔬 Show the mathematical derivation step-by-step',
              '💻 Provide a clean, optimal code implementation',
            ].map((promptText, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendChatMessage(promptText)}
                className="px-3 py-1 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 text-xs whitespace-nowrap transition-all cursor-pointer shrink-0 hover:border-blue-400/40"
              >
                {promptText}
              </button>
            ))}
          </div>

          {/* Chat Messages Stream Box */}
          <div className="flex flex-col h-[520px] rounded-3xl bg-neutral-950/70 border border-white/10 overflow-hidden shadow-2xl">
            {/* Messages Scroll Area */}
            <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4">
              {chatMessages.map((msg) => {
                const isUser = msg.sender === 'user';
                return (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    {/* Avatar */}
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold shadow-md ${
                        isUser
                          ? 'bg-gradient-to-tr from-violet-500 to-indigo-600 text-white'
                          : 'bg-gradient-to-tr from-blue-500/20 via-cyan-500/20 to-emerald-500/20 text-cyan-400 border border-cyan-500/30'
                      }`}
                    >
                      {isUser ? (user?.name?.[0]?.toUpperCase() || 'U') : <Bot className="w-4 h-4 text-cyan-400" />}
                    </div>

                    {/* Message Bubble */}
                    <div
                      className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed space-y-2 shadow-lg ${
                        isUser
                          ? 'bg-gradient-to-br from-indigo-600 to-violet-600 text-white rounded-tr-none'
                          : 'bg-neutral-900 border border-white/10 text-neutral-200 rounded-tl-none'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-1.5 mb-1.5 text-[11px] opacity-75 font-mono">
                        <span className="font-bold text-white/90">{isUser ? 'You' : 'StudySquad AI Tutor'}</span>
                        <div className="flex items-center gap-2">
                          {msg.poweredBy && msg.poweredBy !== 'StudySquad AI Tutor' && (
                            <span className="text-[10px] text-cyan-300 font-semibold">{msg.poweredBy}</span>
                          )}
                          <span>{msg.time}</span>
                        </div>
                      </div>

                      {/* Attached Screenshot in User Message Bubble */}
                      {msg.image && (
                        <div className="pt-1 pb-1">
                          <img
                            src={msg.image}
                            alt="Student screenshot"
                            className="max-h-56 w-auto rounded-xl border border-white/20 shadow-md object-contain bg-black/40"
                          />
                        </div>
                      )}
                      <div className="break-words select-text">
                        {isUser ? msg.text : <FormattedChatMessage content={msg.text} />}
                      </div>

                      {!isUser && (
                        <div className="pt-2 flex items-center justify-end">
                          <button
                            type="button"
                            onClick={() => handleCopyChatText(msg.id, msg.text)}
                            className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white text-[11px] inline-flex items-center gap-1 transition-all cursor-pointer"
                          >
                            {chatCopiedId === msg.id ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span className="text-emerald-400">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {isChatLoading && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shrink-0">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                  <div className="p-3.5 rounded-2xl bg-neutral-900 border border-white/10 text-xs text-cyan-300 flex items-center gap-2 animate-pulse">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                    <span>Gemini AI Tutor is analyzing your question & screenshot...</span>
                  </div>
                </div>
              )}

              <div ref={tutorChatEndRef} />
            </div>

            {/* Attached Screenshot Preview Banner */}
            {chatPastedImage && (
              <div className="px-4 py-2.5 bg-neutral-900/90 border-t border-cyan-500/30 flex items-center justify-between gap-3 animate-in fade-in">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative group shrink-0">
                    <img
                      src={chatPastedImage}
                      alt="Pasted screenshot"
                      className="h-12 w-auto max-w-[120px] rounded-lg object-cover border border-cyan-400 shadow-md"
                    />
                    <button
                      type="button"
                      onClick={() => setChatPastedImage(null)}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-500 hover:bg-rose-400 text-white flex items-center justify-center transition-colors shadow cursor-pointer"
                      title="Remove screenshot"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="text-xs min-w-0">
                    <p className="font-semibold text-cyan-300 flex items-center gap-1.5 truncate">
                      <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      Screenshot Ready for AI Analysis
                    </p>
                    <p className="text-[11px] text-neutral-400 truncate">
                      Ask your question or hit Send — Gemini Vision will analyze and solve it!
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setChatPastedImage(null)}
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white text-xs font-semibold cursor-pointer shrink-0 transition-colors"
                >
                  Clear Image
                </button>
              </div>
            )}

            {/* Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendChatMessage();
              }}
              onPaste={handleChatPaste}
              className="p-3 sm:p-4 bg-black/40 border-t border-white/10 flex items-center gap-2"
            >
              {/* Hidden file input for screenshot upload */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageFileSelect}
                className="hidden"
              />

              {/* Attach / Paste image button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={`p-3 rounded-2xl border transition-all cursor-pointer shrink-0 ${
                  chatPastedImage
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-md shadow-cyan-500/10'
                    : 'bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white border-white/15'
                }`}
                title="Attach or paste a screenshot (Ctrl+V supported)"
              >
                <ImageIcon className="w-4 h-4" />
              </button>

              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onPaste={handleChatPaste}
                placeholder={
                  chatPastedImage
                    ? 'Ask a question about this screenshot (or press Enter to solve)...'
                    : `Ask anything or press Ctrl+V to paste a screenshot...`
                }
                className="flex-1 px-4 py-3 rounded-2xl bg-white/5 border border-white/15 text-xs sm:text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-blue-400/60 leading-relaxed font-sans"
              />
              <button
                type="submit"
                disabled={(!chatInput.trim() && !chatPastedImage) || isChatLoading}
                className="px-5 py-3 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-40 inline-flex items-center gap-2 shrink-0"
              >
                {isChatLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span className="hidden sm:inline">Send</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODE 3: AI MOCK VIVA & ORAL EXAMINER ────────────────────────────── */}
      {mode === 'viva' && (
        <div className="space-y-4">
          {/* Configuration Controls Bar */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400">
                      <Mic className="w-4 h-4" />
                    </span>
                    <div>
                      <h5 className="text-xs font-bold text-white uppercase tracking-wider">Exam Rigor & Target</h5>
                      <p className="text-[11px] text-neutral-400">Calibrate examiner demeanor & question volume</p>
                    </div>
                  </div>

                  {/* Rigor Selector */}
                  <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/40 border border-white/10 flex-wrap">
                    {['College Viva', 'Technical Interview', 'Board Exam', 'Competitive Exam'].map((lvl) => (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => handleSelectRigor(lvl)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          vivaLevel === lvl
                            ? 'bg-rose-500 text-white shadow-sm shadow-rose-500/30'
                            : 'text-neutral-400 hover:text-white'
                        }`}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Question Count Selector & Custom Topic */}
                <div className="pt-2 border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] font-semibold text-neutral-400 mr-1">Rounds:</span>
                    {[
                      { val: 5, label: '5 Questions (Quick)' },
                      { val: 10, label: '10 Questions (Standard)' },
                      { val: 15, label: '15 Questions (Mastery)' },
                      { val: 0, label: '∞ Marathon (Continuous)' },
                    ].map((round) => (
                      <button
                        key={round.val}
                        type="button"
                        onClick={() => handleSelectRounds(round.val)}
                        className={`px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                          vivaTargetCount === round.val
                            ? 'bg-amber-400 text-neutral-950 border-amber-300 font-bold shadow-sm'
                            : 'bg-white/5 border-white/10 text-neutral-400 hover:text-white'
                        }`}
                      >
                        {round.label}
                      </button>
                    ))}
                  </div>

                  {!isVivaActive && (
                    <div className="flex items-center gap-2 flex-1 max-w-xs">
                      <input
                        type="text"
                        value={vivaTopic}
                        onChange={(e) => setVivaTopic(e.target.value)}
                        placeholder={`Focus topic (e.g. ${squad?.subject || 'Tree Traversal'})...`}
                        className="w-full px-3 py-1.5 rounded-xl bg-black/50 border border-white/15 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-rose-400/50"
                      />
                    </div>
                  )}
                </div>
              </div>

              {!isVivaActive ? (
                <div className="text-center py-12 px-6 rounded-3xl border border-rose-500/30 bg-gradient-to-b from-rose-950/20 via-neutral-900 to-neutral-950 space-y-4 max-w-xl mx-auto shadow-2xl">
                  <div className="w-14 h-14 rounded-2xl bg-rose-500/20 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto shadow-lg shadow-rose-500/10">
                    <Mic className="w-7 h-7" />
                  </div>
                  <div className="space-y-1">
                    <h5 className="text-lg font-bold text-white">Ready for Your {vivaLevel}?</h5>
                    <p className="text-xs text-neutral-400 max-w-md mx-auto leading-relaxed">
                      The AI Examiner will formulate <strong>{vivaTargetCount === 0 ? 'continuous adaptive questions' : `${vivaTargetCount} dynamic questions`}</strong> testing your understanding of <strong>{vivaTopic.trim() || customTopic || squad?.name || squad?.subject}</strong>. Every question is unique and actively tests trade-offs and edge cases.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleStartViva()}
                    disabled={isSubmittingViva}
                    className="px-6 py-3 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-400 hover:to-pink-400 text-white font-bold text-xs sm:text-sm shadow-lg shadow-rose-500/25 transition-all cursor-pointer hover:scale-102 inline-flex items-center gap-2"
                  >
                    {isSubmittingViva ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-white" />}
                    <span>Start {vivaTargetCount === 0 ? 'Continuous Marathon Viva' : `${vivaTargetCount}-Question Viva`}</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Progress & Header */}
                  <div className="flex items-center justify-between text-xs text-neutral-400">
                    <span className="font-bold text-white flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px]">
                        {vivaTargetCount > 0 ? `STAGE ${vivaStage} OF ${vivaTargetCount}` : `QUESTION ${vivaStage} • MARATHON`}
                      </span>
                      <span>{vivaLevel}</span>
                    </span>

                    <div className="flex items-center gap-2">
                      {!isVivaFinished && vivaHistory.length > 0 && (
                        <button
                          type="button"
                          onClick={handleFinishVivaEarly}
                          className="px-3 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold cursor-pointer transition-all"
                        >
                          Finish & Grade Now
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleResetViva}
                        className="text-neutral-400 hover:text-white transition-colors cursor-pointer text-xs"
                      >
                        End & Restart
                      </button>
                    </div>
                  </div>

                  {/* Dynamic Progress Bar */}
                  <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-rose-500 via-pink-500 to-amber-400 transition-all duration-300"
                      style={{
                        width: vivaTargetCount > 0
                          ? `${Math.min(100, (vivaStage / vivaTargetCount) * 100)}%`
                          : `${Math.min(100, ((vivaStage % 20) / 20) * 100)}%`,
                      }}
                    />
                  </div>

                  {/* Examiner Question Box (shown while in session) */}
                  {!isVivaFinished && (
                    <div className="p-6 rounded-3xl bg-gradient-to-br from-rose-950/40 via-neutral-900 to-neutral-950 border border-rose-500/30 shadow-xl space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-rose-400 text-xs font-bold uppercase tracking-wider">
                          <GraduationCap className="w-4 h-4" />
                          <span>Examiner's Oral Question:</span>
                        </div>
                        <button
                          type="button"
                          onClick={handleRerollQuestion}
                          disabled={isSubmittingViva}
                          className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white border border-white/10 text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                          title="Generate a different oral question on this topic"
                        >
                          <RefreshCw className={`w-3 h-3 ${isSubmittingViva ? 'animate-spin text-rose-400' : 'text-rose-400'}`} />
                          <span>Different Question</span>
                        </button>
                      </div>

                      {isSubmittingViva ? (
                        <div className="py-6 flex items-center justify-center gap-3 text-sm text-rose-300 animate-pulse">
                          <Loader2 className="w-5 h-5 animate-spin text-rose-400" />
                          <span>AI Examiner is formulating a fresh {vivaLevel} question...</span>
                        </div>
                      ) : (
                        <h4 className="text-lg font-bold text-white leading-relaxed">
                          "{vivaQuestion}"
                        </h4>
                      )}
                    </div>
                  )}

                  {/* Student Answer Input Form */}
                  {!isVivaFinished && (
                    <form onSubmit={handleSubmitVivaAnswer} className="space-y-3">
                      <div className="relative">
                        <textarea
                          rows={4}
                          value={vivaAnswerInput}
                          onChange={(e) => setVivaAnswerInput(e.target.value)}
                          placeholder="Type your spoken explanation as you would deliver it to the examiner... Mention core invariants, complexity, and boundary cases."
                          className="w-full p-4 rounded-2xl bg-black/40 border border-white/15 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-rose-400/60 leading-relaxed font-sans"
                        />
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[11px] text-neutral-400 flex items-center gap-1.5">
                          <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                          <span>Aim for clarity, specific vocabulary, and boundary condition awareness.</span>
                        </span>
                        <button
                          type="submit"
                          disabled={isSubmittingViva || !vivaAnswerInput.trim()}
                          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-400 hover:to-pink-400 text-white font-bold text-xs sm:text-sm shadow-md shadow-rose-500/20 transition-all cursor-pointer disabled:opacity-50 inline-flex items-center gap-2 shrink-0"
                        >
                          {isSubmittingViva ? <Loader2 className="w-4 h-4 animate-spin" /> : <SendHorizontal className="w-4 h-4" />}
                          <span>Submit Answer to Examiner</span>
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Latest Feedback Block */}
                  {!isVivaFinished && vivaFeedback && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                          <Award className="w-4 h-4 text-amber-400" />
                          <span>Examiner Evaluation</span>
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full font-black text-xs border ${
                          vivaFeedback.score >= 8
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : vivaFeedback.score >= 6
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                            : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                        }`}>
                          Score: {vivaFeedback.score} / 10
                        </span>
                      </div>

                      <p className="text-xs text-neutral-300 leading-relaxed">
                        <strong>Critique:</strong> {vivaFeedback.feedback}
                      </p>

                      <div className="pt-2 border-t border-white/10">
                        <p className="text-xs text-emerald-300/90 leading-relaxed">
                          <strong>Model Answer:</strong> {vivaFeedback.modelAnswer}
                        </p>
                      </div>
                    </motion.div>
                  )}

                  {/* Final Summary Card when completed */}
                  {(isVivaFinished || (vivaTargetCount > 0 && vivaHistory.length >= vivaTargetCount)) && (
                    <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-emerald-950/30 via-neutral-900 to-neutral-950 border border-emerald-500/30 space-y-6 shadow-2xl">
                      <div className="text-center space-y-2">
                        <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
                          <Trophy className="w-7 h-7" />
                        </div>
                        <h5 className="text-xl font-bold text-white">Oral Defense Examination Completed!</h5>
                        <p className="text-xs text-neutral-300 max-w-sm mx-auto">
                          You answered <strong>{vivaHistory.length}</strong> rigorous questions under <strong>{vivaLevel}</strong> standards.
                        </p>
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-sm font-black">
                          <span>Average Score:</span>
                          <span>{(vivaHistory.reduce((acc, h) => acc + (h.score || 8), 0) / (vivaHistory.length || 1)).toFixed(1)} / 10</span>
                        </div>
                      </div>

                      {/* Detailed Question Review List */}
                      <div className="space-y-3">
                        <h6 className="text-xs font-bold text-white uppercase tracking-wider border-b border-white/10 pb-2">
                          📋 Complete Oral Defense Review & Model Answers:
                        </h6>
                        <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                          {vivaHistory.map((h, idx) => (
                            <div key={idx} className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2 text-xs">
                              <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400">
                                <span className="font-bold text-rose-300">QUESTION {idx + 1}</span>
                                <span className={`px-2 py-0.5 rounded-full font-black ${
                                  h.score >= 8 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                                }`}>
                                  Score: {h.score}/10
                                </span>
                              </div>
                              <p className="text-white font-semibold">"{h.question}"</p>
                              <p className="text-neutral-300"><strong>Your Answer:</strong> {h.userResponse}</p>
                              <p className="text-amber-300/90"><strong>Critique:</strong> {h.feedback}</p>
                              <p className="text-emerald-300/90"><strong>Model Answer:</strong> {h.modelAnswer}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="text-center pt-2">
                        <button
                          type="button"
                          onClick={handleResetViva}
                          className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-neutral-950 font-black text-xs sm:text-sm cursor-pointer transition-all shadow-lg shadow-emerald-500/20"
                        >
                          Start Another Viva Round
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
        </div>
      )}

      {/* ─── MODE 4: 1-PAGE HIGH-YIELD REVISION CHEAT SHEET ─────────────────────── */}
      {mode === 'cheatsheet' && (
        <div className="space-y-4">
          {/* Header Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white/5 border border-white/10">
            <div>
              <h5 className="text-sm font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-400" />
                <span>1-Page High-Yield Revision Matrix</span>
              </h5>
              <p className="text-xs text-neutral-400 mt-0.5">
                Ultra-dense formula sheet, complexities, invariants, and top 5 exam gotchas.
              </p>
            </div>

            <button
              type="button"
              onClick={handleGenerateCheatSheet}
              disabled={isGeneratingSheet}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-neutral-950 font-bold text-xs transition-all shadow-md shadow-amber-500/20 cursor-pointer disabled:opacity-50 inline-flex items-center gap-2 shrink-0"
            >
              {isGeneratingSheet ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              <span>{isGeneratingSheet ? 'Synthesizing...' : 'Generate Cheat Sheet'}</span>
            </button>
          </div>

          {cheatSheetText ? (
            <div className="space-y-3">
              {/* Toolbar */}
              <div className="flex items-center justify-between text-xs text-neutral-400 px-1">
                <span className="font-semibold text-amber-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Synthesized for {customTopic || squad?.subject}</span>
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyCheatSheet}
                    className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs inline-flex items-center gap-1.5 transition-all cursor-pointer border border-white/10"
                  >
                    {sheetCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{sheetCopied ? 'Copied!' : 'Copy Sheet'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadCheatSheet}
                    className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-semibold text-xs inline-flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download (.md)</span>
                  </button>
                </div>
              </div>

              {/* Cheat Sheet Rendered Card */}
              <div className="p-6 rounded-3xl bg-neutral-950 border border-amber-500/30 text-neutral-200 text-xs sm:text-sm leading-relaxed whitespace-pre-line font-mono space-y-3 shadow-2xl overflow-x-auto max-h-[550px] overflow-y-auto">
                {cheatSheetText}
              </div>
            </div>
          ) : (
            <div className="text-center py-14 px-6 rounded-3xl border border-dashed border-white/15 bg-white/5 space-y-3">
              <FileText className="w-10 h-10 text-neutral-500 mx-auto" />
              <h5 className="text-sm font-bold text-white">Generate Your First Cheat Sheet</h5>
              <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                Click "Generate Cheat Sheet" above to condense this subject into a dense 1-page formula matrix.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ─── MODE 5: FEYNMAN 3-TIER CONCEPT EXPLAINER ──────────────────────────── */}
      {mode === 'feynman' && (
        <div className="space-y-4">
          {/* Query Bar & Presets */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <input
                type="text"
                value={feynmanInput}
                onChange={(e) => setFeynmanInput(e.target.value)}
                placeholder={`Ask to explain any concept (e.g. Recursion vs Iteration, Photosynthesis, Bayes Theorem...)`}
                className="flex-1 px-4 py-2.5 rounded-xl bg-black/40 border border-white/15 text-xs sm:text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-400/50"
              />
              <button
                type="button"
                onClick={handleExplainFeynman}
                disabled={isGeneratingFeynman}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-neutral-950 font-bold text-xs sm:text-sm transition-all shadow-md shadow-cyan-500/20 cursor-pointer disabled:opacity-50 inline-flex items-center justify-center gap-2 shrink-0"
              >
                {isGeneratingFeynman ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lightbulb className="w-4 h-4" />}
                <span>Explain Concept</span>
              </button>
            </div>

            {/* Quick Pills */}
            <div className="flex items-center gap-1.5 flex-wrap text-xs">
              <span className="text-[11px] text-neutral-400">Quick Try:</span>
              {['Two-Pointer Algorithm', 'Dynamic Programming', 'Mendelian Cross', 'Eigenvalues', 'Acid-Base Buffers'].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    setFeynmanInput(preset);
                  }}
                  className="px-2 py-0.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 text-[11px] transition-all cursor-pointer"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {feynmanResult ? (
            <div className="space-y-4">
              {/* Tier Switcher Tabs */}
              <div className="flex items-center justify-center gap-2 p-1 rounded-2xl bg-black/40 border border-white/10 max-w-md mx-auto">
                <button
                  type="button"
                  onClick={() => setFeynmanTier('eli5')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    feynmanTier === 'eli5'
                      ? 'bg-amber-400 text-neutral-950 shadow-md shadow-amber-400/20'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  🧸 Level 1: ELI5 Analogy
                </button>
                <button
                  type="button"
                  onClick={() => setFeynmanTier('mechanics')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    feynmanTier === 'mechanics'
                      ? 'bg-cyan-500 text-neutral-950 shadow-md shadow-cyan-500/20'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  ⚙️ Level 2: Mechanics
                </button>
                <button
                  type="button"
                  onClick={() => setFeynmanTier('traps')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    feynmanTier === 'traps'
                      ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  ⚠️ Level 3: Exam Gotchas
                </button>
              </div>

              {/* Tier Card */}
              <div className="p-6 sm:p-8 rounded-3xl bg-neutral-900 border border-white/15 space-y-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <h4 className="text-lg font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-cyan-400" />
                    <span>{feynmanResult.concept}</span>
                  </h4>
                  <span className="text-[11px] text-neutral-400 font-mono">Feynman Mastery Tier</span>
                </div>

                {feynmanTier === 'eli5' && (
                  <div className="space-y-3">
                    <p className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                      🧸 Real-World Everyday Metaphor:
                    </p>
                    <p className="text-sm sm:text-base text-neutral-200 leading-relaxed">
                      {feynmanResult.eli5}
                    </p>
                  </div>
                )}

                {feynmanTier === 'mechanics' && (
                  <div className="space-y-3">
                    <p className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                      ⚙️ Academic & Technical Under-The-Hood Mechanics:
                    </p>
                    <p className="text-sm sm:text-base text-neutral-200 leading-relaxed font-mono whitespace-pre-line">
                      {feynmanResult.mechanics}
                    </p>
                  </div>
                )}

                {feynmanTier === 'traps' && (
                  <div className="space-y-3">
                    <p className="text-xs font-bold text-rose-400 uppercase tracking-wider">
                      ⚠️ Top 3 Deadly Exam Pitfalls:
                    </p>
                    <ul className="space-y-2">
                      {feynmanResult.examTraps?.map((trap, idx) => (
                        <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-neutral-300">
                          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                          <span>{trap}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* One-line takeaway quote */}
                {feynmanResult.oneLineTakeaway && (
                  <div className="p-3.5 rounded-2xl bg-cyan-950/30 border border-cyan-500/30 text-xs text-cyan-300 flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span><strong>Takeaway:</strong> {feynmanResult.oneLineTakeaway}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-14 px-6 rounded-3xl border border-dashed border-white/15 bg-white/5 space-y-3">
              <Lightbulb className="w-10 h-10 text-neutral-500 mx-auto" />
              <h5 className="text-sm font-bold text-white">Enter a Concept to Break Down</h5>
              <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                Type any formula, algorithm, or theorem above to understand it on 3 mastery levels.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ─── MODE 6: AI CODE & SOLUTION AUDITOR ─────────────────────────────────── */}
      {mode === 'audit' && (
        <div className="space-y-4">
          {/* Editor Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-teal-500/20 text-teal-400">
                <Terminal className="w-4 h-4" />
              </span>
              <div>
                <h5 className="text-xs font-bold text-white uppercase tracking-wider">Solution Diagnostic Auditor</h5>
                <p className="text-[11px] text-neutral-400">Scan code/solutions for Big-O, edge-case bugs & optimizations</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={auditLanguage}
                onChange={(e) => setAuditLanguage(e.target.value)}
                className="bg-black/60 border border-white/15 text-white text-xs px-3 py-1.5 rounded-xl focus:outline-none font-mono"
              >
                <option value="javascript">JavaScript / TypeScript</option>
                <option value="python">Python</option>
                <option value="java">Java</option>
                <option value="cpp">C++</option>
                <option value="sql">SQL Query</option>
              </select>

              <button
                type="button"
                onClick={handleRunCodeAudit}
                disabled={isAuditing}
                className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-teal-400 to-emerald-500 hover:from-teal-300 hover:to-emerald-400 text-neutral-950 font-bold text-xs transition-all shadow-md shadow-teal-500/20 cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                {isAuditing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Cpu className="w-3.5 h-3.5" />}
                <span>{isAuditing ? 'Auditing...' : 'Run Audit'}</span>
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {/* Code Input Area */}
            <div className="relative rounded-2xl overflow-hidden border border-white/15 bg-black/60 shadow-lg">
              <div className="px-4 py-2 bg-white/5 border-b border-white/10 flex items-center justify-between text-xs text-neutral-400">
                <span className="font-mono">{auditLanguage.toUpperCase()} Solution</span>
                <span className="text-[11px]">Paste your code or proof below</span>
              </div>
              <textarea
                rows={8}
                value={auditCode}
                onChange={(e) => setAuditCode(e.target.value)}
                className="w-full p-4 bg-transparent text-emerald-300 font-mono text-xs sm:text-sm focus:outline-none leading-relaxed resize-y"
                placeholder="// Paste your algorithm or solution code here..."
              />
            </div>

            {/* Audit Error / Paywall Banner */}
            {auditError && (
              <div className="p-4 rounded-2xl bg-rose-950/35 border border-rose-500/35 flex items-center justify-between gap-3 flex-wrap text-xs text-rose-200">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span className="font-medium">{auditError}</span>
                </div>
                {!isProUser && auditError.includes('Upgrade') && (
                  <button
                    type="button"
                    onClick={() => onOpenProModal?.()}
                    className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-neutral-950 font-black text-xs cursor-pointer transition-colors shrink-0"
                  >
                    Upgrade to Pro • ₹199
                  </button>
                )}
              </div>
            )}

            {/* Audit Results Panel */}
            {auditResult && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 rounded-3xl bg-neutral-900 border border-teal-500/30 space-y-4 shadow-xl"
              >
                {/* Badges */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border ${
                    auditResult.status === 'Optimal'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : auditResult.status === 'Suboptimal'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  }`}>
                    Verdict: {auditResult.status}
                  </span>

                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span className="px-2.5 py-1 rounded-lg bg-white/10 text-cyan-300 border border-white/10">
                      ⏳ {auditResult.timeComplexity}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-white/10 text-violet-300 border border-white/10">
                      💾 {auditResult.spaceComplexity}
                    </span>
                  </div>
                </div>

                {/* Critique */}
                <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
                  <strong>Architectural Critique:</strong> {auditResult.critique}
                </p>

                {/* Edge Cases */}
                {auditResult.edgeCases && (
                  <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/30 space-y-2">
                    <p className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Critical Boundary Edge Cases Scanned:</span>
                    </p>
                    <ul className="space-y-1 text-xs text-neutral-300">
                      {auditResult.edgeCases.map((ec, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-amber-400">•</span>
                          <span>{ec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Optimized Refactored Code */}
                {auditResult.optimizedCode && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-neutral-400">
                      <span className="font-bold text-white uppercase tracking-wider">Optimized Refactored Solution</span>
                      <button
                        type="button"
                        onClick={() => handleCopyCode(auditResult.optimizedCode)}
                        className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-semibold text-xs inline-flex items-center gap-1 transition-all cursor-pointer"
                      >
                        {codeCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{codeCopied ? 'Copied' : 'Copy Code'}</span>
                      </button>
                    </div>
                    <pre className="p-4 rounded-2xl bg-black border border-white/10 text-emerald-300 font-mono text-xs overflow-x-auto leading-relaxed">
                      {auditResult.optimizedCode}
                    </pre>
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
