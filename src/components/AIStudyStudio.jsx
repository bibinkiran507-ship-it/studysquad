import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
  Flame,
  BookOpen,
  FileText,
  Check,
  Loader2,
  RefreshCw,
  GraduationCap,
  Award,
  Zap,
} from 'lucide-react';
import { aiAPI, squadsAPI } from '../api/client';

export default function AIStudyStudio({ squad, user, socket, openAuthModal }) {
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

      // Friendly notification reminding them to start backend server if desired
      setStatusMessage('💡 Tip: Start your backend server (cd backend && node server.js) for live Google Gemini AI generation.');
      setTimeout(() => setStatusMessage(''), 8000);
    } finally {
      setIsGenerating(false);
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

  // Broadcast quiz victory to squad chat via REST API / Socket
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
      await squadsAPI.sendMessage(squad.id, content);
      setSharedToast(true);
      setTimeout(() => setSharedToast(false), 3000);
    } catch (err) {
      console.warn('Share to chat error:', err.message);
    }
  };

  const masteryPercentage = flashcards.length > 0
    ? Math.round((masteredIds.size / flashcards.length) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* ─── Mode Switcher Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white/5 border border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
              <Brain className="w-5 h-5" />
            </span>
            <h4 className="text-base font-bold text-white flex items-center gap-2">
              AI Study Studio & Active Recall
              {poweredBy && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">
                  {poweredBy}
                </span>
              )}
            </h4>
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            Turn notes, slides, and subjects into 3D flip flashcards and auto-graded exam simulations.
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center p-1 rounded-xl bg-black/40 border border-white/10 shrink-0">
          <button
            type="button"
            onClick={() => {
              setMode('flashcards');
              if (flashcards.length === 0) handleGenerate('flashcards');
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              mode === 'flashcards'
                ? 'bg-emerald-500 text-neutral-950 shadow-md shadow-emerald-500/20'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>3D Flashcards</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('quiz');
              if (quizQuestions.length === 0) handleGenerate('quiz');
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              mode === 'quiz'
                ? 'bg-violet-500 text-white shadow-md shadow-violet-500/20'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Practice Quiz</span>
          </button>
        </div>
      </div>

      {/* ─── Source Configuration & Generation Bar ─── */}
      <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
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
              <span>Squad Shared Notes</span>
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
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-neutral-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-50"
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

        {statusMessage && (
          <p className="text-xs text-rose-400 font-medium">{statusMessage}</p>
        )}
      </div>

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
              <h5 className="text-sm font-bold text-white">No Flashcards Generated Yet</h5>
              <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                Click the "Generate Flashcards" button above to turn your squad notes into interactive flashcards.
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
              <h5 className="text-sm font-bold text-white">No Quiz Available Yet</h5>
              <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                Click "Generate Quiz" above to create a 5-question exam simulation based on your study material.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
