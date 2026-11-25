import React, { useState, useRef, useEffect, memo } from 'react';
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
  Trash2,
  Image as ImageIcon,
  X,
} from 'lucide-react';
import { aiAPI, squadsAPI } from '../api/client';
import RichMarkdown from './RichMarkdown';
import { renderInlineAcademicText } from '../lib/inlineAcademic';

function isPaywallError(err) {
  return (
    err?.response?.status === 403 &&
    (err?.response?.data?.error === 'DAILY_AI_LIMIT_REACHED' ||
      err?.response?.data?.upgradeRequired)
  );
}

const AIStudyStudio = memo(function AIStudyStudio({ squad, user, socket, openAuthModal, onOpenProModal }) {
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
  const chatScrollRef = useRef(null);
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
    if (mode === 'chat' && chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages.length, isChatLoading, mode]);

  // Flashcards and quizzes are generated 100% by real live AI (Gemini + Groq) on demand.
  // This avoids blocking the UI thread and allows the tab to open instantly.

  // Generate either Flashcards or Quiz via real AI
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

        if (Array.isArray(res.data?.flashcards) && res.data.flashcards.length > 0) {
          const normalizedCards = res.data.flashcards
            .filter(Boolean)
            .map((c, idx) => ({ ...c, id: c.id ?? `fc-${idx}` }));
          setFlashcards(normalizedCards);
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

        if (Array.isArray(res.data?.quiz) && res.data.quiz.length > 0) {
          const normalizedQuiz = res.data.quiz.filter(Boolean).map((q, idx) => ({
            ...q,
            id: q.id ?? `q-${idx}`,
            options: Array.isArray(q.options) ? q.options : Object.values(q.options || {}),
            answerIndex: Number.isFinite(Number(q.answerIndex)) ? Number(q.answerIndex) : 0,
          }));
          setQuizQuestions(normalizedQuiz);
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

      console.warn('Flashcard/Quiz AI error:', err.message);
      setStatusMessage(
        err.response?.data?.message ||
          '⏳ Live AI servers had a brief spike (no AI credit deducted). Please click Generate again!'
      );
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
        questionNumber: isReroll ? vivaStage : 1,
        totalQuestions: targetCount,
        excludeQuestions: exclusions,
        seed: Date.now(),
      });

      setVivaQuestion(res.data?.nextQuestion || `Explain the core invariant and mechanism of ${activeTopic} in your own words.`);
      setVivaAnswerInput('');
      if (!isReroll) {
        setVivaFeedback(null);
        setVivaStage(1);
        setVivaHistory([]);
      }
      setIsVivaActive(true);
      setIsVivaFinished(false);
    } catch (err) {
      if (isPaywallError(err)) {
        setStatusMessage(
          '👑 Daily 5/5 free AI limit reached — Upgrade to StudySquad Pro (₹199/mo) for unlimited Mock Viva rounds!'
        );
        return;
      }
      console.warn('Viva start error:', err.message);
      setStatusMessage(
        err.response?.data?.message ||
          '⏳ Live Viva AI servers are briefly busy (no credit deducted). Click Start Viva again in a moment!'
      );
    } finally {
      setIsSubmittingViva(false);
      refreshUsage();
    }
  };

  const handleSelectRounds = async (newCount) => {
    if (isSubmittingViva || newCount === vivaTargetCount) return;
    setVivaTargetCount(newCount);
    if (isVivaActive) {
      await handleStartViva({ overrideTarget: newCount, overrideLevel: vivaLevel });
    }
  };

  const handleSelectRigor = async (newLvl) => {
    if (isSubmittingViva || newLvl === vivaLevel) return;
    setVivaLevel(newLvl);
    if (isVivaActive) {
      await handleStartViva({ overrideTarget: vivaTargetCount, overrideLevel: newLvl });
    }
  };

  const handleRerollQuestion = async () => {
    if (isSubmittingViva) return;
    await handleStartViva({ overrideTarget: vivaTargetCount, overrideLevel: vivaLevel, isReroll: true });
  };

  const handleSubmitVivaAnswer = async (e) => {
    e?.preventDefault();
    if (isSubmittingViva || !vivaAnswerInput.trim()) return;

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
        score: typeof res.data?.score === 'number' ? res.data.score : 8,
        feedback: res.data?.feedback || 'Good explanation. Ensure you include boundary conditions and time complexity trade-offs.',
        modelAnswer: res.data?.modelAnswer || 'Directly state the foundational invariants, time complexity trade-offs, and failure handling.',
        keyConcept: res.data?.keyConcept || 'Core Principle',
      };

      setVivaHistory((prev) => [...prev, entry]);
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
      setStatusMessage(
        err.response?.data?.message ||
          '⏳ Live Viva AI had a brief connection blip — your typed answer is safe and no credit was used. Click Submit Answer again!'
      );
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
        // Auto-scale huge 4K/retina screenshots to max 1600px & pad tiny <64px crops so all vision models succeed
        const maxDim = 1600;
        const minDim = 64;
        let width = img.width || minDim;
        let height = img.height || minDim;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const outW = Math.max(minDim, width);
        const outH = Math.max(minDim, height);
        const canvas = document.createElement('canvas');
        canvas.width = outW;
        canvas.height = outH;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, outW, outH);
          const dx = Math.floor((outW - width) / 2);
          const dy = Math.floor((outH - height) / 2);
          ctx.drawImage(img, dx, dy, width, height);
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
        history: newMessages.slice(-10).map((m) => ({
          sender: m.sender,
          text: typeof m.text === 'string' ? m.text.slice(0, 1200) : '',
        })),
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
      const retryMsg = {
        id: `ai-retry-${Date.now()}`,
        sender: 'ai',
        text:
          err.response?.data?.message ||
          `⏳ **Connection briefly interrupted** — no AI credit was deducted. Please resend your question in a second!`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        poweredBy: 'System Notice',
      };
      setChatMessages((prev) => [...prev, retryMsg]);
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
      setStatusMessage(
        err.response?.data?.message ||
          '⏳ Live Cheat Sheet AI had a brief connection blip (no credit deducted). Click Generate Cheat Sheet again!'
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
      setStatusMessage(
        err.response?.data?.message ||
          '⏳ Live Feynman AI had a brief connection blip (no credit deducted). Click Explain Concept again!'
      );
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
            onClick={() => setMode('flashcards')}
            className={`py-2 px-3 sm:px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border shrink-0 whitespace-nowrap ${
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
            onClick={() => setMode('quiz')}
            className={`py-2 px-3 sm:px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border shrink-0 whitespace-nowrap ${
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
                        {renderInlineAcademicText(currentCard?.front, 'emerald')}
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
                    <div className="flex-1 min-h-0 overflow-y-auto pr-1">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-teal-500/20 text-teal-300 border border-teal-500/30 uppercase tracking-wider flex items-center gap-1">
                          <Check className="w-3 h-3 text-teal-400" /> Explanation & Solution
                        </span>
                        <span className="text-[11px] font-medium text-neutral-400 flex items-center gap-1.5">
                          <RotateCw className="w-3 h-3" /> Flip back
                        </span>
                      </div>

                      <p className="text-sm sm:text-base font-normal text-neutral-200 leading-relaxed mt-2 whitespace-pre-line">
                        {renderInlineAcademicText(currentCard?.back, 'emerald')}
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
                      {renderInlineAcademicText(currentQuestion?.question, 'violet')}
                    </h3>
                  </div>

                  {/* 4 Choices */}
                  <div className="space-y-2.5">
                    {(Array.isArray(currentQuestion?.options) ? currentQuestion.options : []).map((option, optIdx) => {
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
                            <span>{renderInlineAcademicText(option, 'violet')}</span>
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
                        {renderInlineAcademicText(currentQuestion?.explanation, 'emerald')}
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
                    disabled={isGenerating}
                    onClick={() => handleGenerate('quiz')}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-violet-500/20 transition-all cursor-pointer disabled:opacity-50"
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
                disabled={isChatLoading}
                onClick={() => handleSendChatMessage(promptText)}
                className="px-3 py-1 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 text-xs whitespace-nowrap transition-all cursor-pointer shrink-0 hover:border-blue-400/40 disabled:opacity-40"
              >
                {promptText}
              </button>
            ))}
          </div>

          {/* Chat Messages Stream Box */}
          <div className="flex flex-col h-[520px] rounded-3xl bg-neutral-950/70 border border-white/10 overflow-hidden shadow-2xl">
            {/* Messages Scroll Area */}
            <div ref={chatScrollRef} className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4">
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
                        {isUser ? msg.text : <RichMarkdown content={msg.text} theme="cyan" />}
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
                          "{renderInlineAcademicText(vivaQuestion, 'cyan')}"
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
                        <strong>Critique:</strong> {renderInlineAcademicText(vivaFeedback.feedback, 'amber')}
                      </p>

                      <div className="pt-2 border-t border-white/10">
                        <p className="text-xs text-emerald-300/90 leading-relaxed">
                          <strong>Model Answer:</strong> {renderInlineAcademicText(vivaFeedback.modelAnswer, 'emerald')}
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
                          <span>{(vivaHistory.reduce((acc, h) => acc + (typeof h.score === 'number' ? h.score : 8), 0) / (vivaHistory.length || 1)).toFixed(1)} / 10</span>
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
                              <p className="text-white font-semibold">"{renderInlineAcademicText(h.question, 'cyan')}"</p>
                              <p className="text-neutral-300"><strong>Your Answer:</strong> {h.userResponse}</p>
                              <p className="text-amber-300/90"><strong>Critique:</strong> {renderInlineAcademicText(h.feedback, 'amber')}</p>
                              <p className="text-emerald-300/90"><strong>Model Answer:</strong> {renderInlineAcademicText(h.modelAnswer, 'emerald')}</p>
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
      {(mode === 'cheatsheet' || Boolean(cheatSheetText)) && (
        <div className={mode === 'cheatsheet' ? 'space-y-4' : 'hidden'}>
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
              <div className="p-5 sm:p-7 rounded-3xl bg-gradient-to-b from-neutral-950 via-neutral-950 to-neutral-900/95 border border-amber-500/30 text-neutral-200 shadow-2xl overflow-x-auto max-h-[580px] overflow-y-auto">
                <RichMarkdown content={cheatSheetText} theme="amber" />
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
                    <RichMarkdown content={feynmanResult.eli5} theme="amber" className="text-sm sm:text-base" />
                  </div>
                )}

                {feynmanTier === 'mechanics' && (
                  <div className="space-y-3">
                    <p className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                      ⚙️ Academic & Technical Under-The-Hood Mechanics:
                    </p>
                    <RichMarkdown content={feynmanResult.mechanics} theme="cyan" className="text-sm sm:text-base" />
                  </div>
                )}

                {feynmanTier === 'traps' && (
                  <div className="space-y-3">
                    <p className="text-xs font-bold text-rose-400 uppercase tracking-wider">
                      ⚠️ Top 3 Deadly Exam Pitfalls:
                    </p>
                    <ul className="space-y-2">
                      {(Array.isArray(feynmanResult.examTraps) ? feynmanResult.examTraps : []).map((trap, idx) => (
                        <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-neutral-300">
                          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                          <span>{renderInlineAcademicText(trap, 'amber')}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* One-line takeaway quote */}
                {feynmanResult.oneLineTakeaway && (
                  <div className="p-3.5 rounded-2xl bg-cyan-950/30 border border-cyan-500/30 text-xs text-cyan-300 flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span>
                      <strong>Takeaway:</strong> {renderInlineAcademicText(feynmanResult.oneLineTakeaway, 'cyan')}
                    </span>
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
                  <strong>Architectural Critique:</strong> {renderInlineAcademicText(auditResult.critique, 'cyan')}
                </p>

                {/* Edge Cases */}
                {Array.isArray(auditResult.edgeCases) && auditResult.edgeCases.length > 0 && (
                  <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/30 space-y-2">
                    <p className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Critical Boundary Edge Cases Scanned:</span>
                    </p>
                    <ul className="space-y-1 text-xs text-neutral-300">
                      {auditResult.edgeCases.map((ec, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-amber-400">•</span>
                          <span>{renderInlineAcademicText(ec, 'amber')}</span>
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
});

export default AIStudyStudio;
