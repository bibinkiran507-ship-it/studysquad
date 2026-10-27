import React, { useState, useEffect, useRef } from "react";
import {
  BookOpen,
  FileText,
  GitBranch,
  Video,
  Link as LinkIcon,
  Plus,
  Trash2,
  ExternalLink,
  Download,
  Copy,
  Check,
  Loader2,
  Star,
  GitFork,
  Eye,
  Code2,
  FileCode,
  UploadCloud,
  FileUp,
  Presentation,
  Sparkles,
  Send,
  X,
} from "lucide-react";
import { squadsAPI, aiAPI, getFileUrl } from "../api/client";

function parseGitHubRepo(url) {
  try {
    const u = new URL(url);
    if (!u.hostname.includes("github.com")) return null;
    const parts = u.pathname.replace(/^\//, "").split("/");
    if (parts.length >= 2 && parts[0] && parts[1]) {
      return { owner: parts[0], repo: parts[1].replace(".git", "") };
    }
  } catch {
    return null;
  }
  return null;
}

function isGitHubUrl(url) {
  try {
    return new URL(url).hostname.includes("github.com");
  } catch {
    return false;
  }
}

function formatNumber(n) {
  if (!n && n !== 0) return "0";
  if (n >= 1000) return (n / 1000).toFixed(1) + "k";
  return String(n);
}

const LANGUAGE_COLORS = {
  JavaScript: "#f1e05a",
  TypeScript: "#3178c6",
  Python: "#3572A5",
  Java: "#b07219",
  "C++": "#f34b7d",
  C: "#555555",
  Go: "#00ADD8",
  Rust: "#dea584",
  Ruby: "#701516",
  HTML: "#e34c26",
  CSS: "#563d7c",
  Shell: "#89e051",
  Kotlin: "#A97BFF",
  Swift: "#F05138",
  PHP: "#4F5D95",
  "C#": "#178600",
  Dart: "#00B4AB",
};

const CATEGORY_ICONS = {
  CheatSheet: FileText,
  GitHub: GitBranch,
  Video: Video,
  Docs: BookOpen,
  Code: FileCode,
  Resource: LinkIcon,
  PDF: FileText,
  Slides: Presentation,
  Notes: FileText,
};

const CATEGORY_COLORS = {
  CheatSheet: "text-amber-400 bg-amber-400/10 border-amber-400/30",
  GitHub: "text-violet-400 bg-violet-400/10 border-violet-400/30",
  Video: "text-rose-400 bg-rose-400/10 border-rose-400/30",
  Docs: "text-cyan-400 bg-cyan-400/10 border-cyan-400/30",
  Code: "text-orange-400 bg-orange-400/10 border-orange-400/30",
  Resource: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30",
  PDF: "text-rose-400 bg-rose-500/15 border-rose-500/35",
  Slides: "text-amber-400 bg-amber-500/15 border-amber-500/35",
  Notes: "text-teal-400 bg-teal-500/15 border-teal-500/35",
};

// Rich Card for Uploaded PDF Slides & Lecture Notes
function PdfSlideCard({ res, user, squad, onDelete, onChatWithDoc }) {
  const fullUrl = getFileUrl(res.url);
  const isPdf = res.category === "PDF" || res.url?.toLowerCase().endsWith(".pdf");
  const isSlide = res.category === "Slides" || res.url?.toLowerCase().match(/\.(ppt|pptx)$/);
  const canDelete = user && (res.createdById === user.id || squad.ownerId === user.id);

  const badgeColor = isPdf
    ? "border-rose-500/35 bg-rose-500/10 text-rose-400"
    : isSlide
    ? "border-amber-500/35 bg-amber-500/10 text-amber-400"
    : "border-cyan-500/35 bg-cyan-500/10 text-cyan-400";

  const BadgeIcon = isPdf ? FileText : isSlide ? Presentation : BookOpen;
  const badgeLabel = isPdf ? "PDF Document" : isSlide ? "Lecture Slides" : "Study Document";

  return (
    <div className="group/res relative rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all p-4 flex flex-col justify-between shadow-lg">
      <div>
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border flex items-center gap-1.5 ${badgeColor}`}>
            <BadgeIcon className="w-3.5 h-3.5" />
            <span>{badgeLabel}</span>
          </span>
          {canDelete && (
            <button
              type="button"
              onClick={() => onDelete(res.id)}
              className="text-neutral-500 hover:text-rose-400 p-1 opacity-0 group-hover/res:opacity-100 transition-opacity cursor-pointer"
              title="Delete Document"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <h5 className="text-sm font-bold text-white group-hover/res:text-rose-300 transition-colors line-clamp-2">
          {res.title}
        </h5>
        <p className="text-[11px] font-mono text-neutral-400 mt-1 truncate">
          {res.url.replace(/^\/uploads\//, "")}
        </p>
      </div>

      <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs">
        <span className="text-neutral-500 text-[11px]">
          by <span className="text-neutral-300 font-semibold">{res.createdBy?.name || "Teammate"}</span>
        </span>
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => onChatWithDoc && onChatWithDoc(res)}
            className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-violet-500/25 to-fuchsia-500/25 hover:from-violet-500/40 hover:to-fuchsia-500/40 text-violet-300 border border-violet-500/40 text-[11px] font-bold inline-flex items-center gap-1 transition-all cursor-pointer shadow-sm"
            title="Chat with this PDF/Lecture file using Gemini AI"
          >
            <Sparkles className="w-3 h-3 text-violet-400" />
            <span>Chat AI</span>
          </button>
          <a
            href={fullUrl}
            target="_blank"
            rel="noreferrer"
            className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-neutral-200 border border-white/10 text-[11px] font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer"
            title="Open and read document in new tab"
          >
            <Eye className="w-3 h-3 text-cyan-400" />
            <span>View</span>
          </a>
          <a
            href={fullUrl}
            download
            className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-[11px] font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer"
            title="Download document to device"
          >
            <Download className="w-3 h-3" />
            <span>Download</span>
          </a>
        </div>
      </div>
    </div>
  );
}

function GitHubRepoCard({ res, user, squad, onDelete }) {
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const parsed = parseGitHubRepo(res.url);
    if (!parsed) {
      setLoading(false);
      setError(true);
      return;
    }
    let isCurrent = true;
    setLoading(true);
    fetch(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then((data) => {
        if (isCurrent) {
          setMeta(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (isCurrent) {
          setLoading(false);
          setError(true);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [res.url]);

  const langColor = meta?.language ? LANGUAGE_COLORS[meta.language] || "#8b949e" : null;
  const canDelete = user && (res.createdById === user.id || squad.ownerId === user.id);

  return (
    <div className="group/res relative rounded-2xl border border-violet-500/25 bg-gradient-to-br from-[#0d1117] to-[#161b22] overflow-hidden shadow-lg hover:shadow-violet-500/10 hover:border-violet-500/50 transition-all duration-300">
      <div className="px-4 pt-4 pb-3 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          {meta?.owner?.avatar_url && (
            <img
              src={meta.owner.avatar_url}
              alt={meta.owner.login}
              className="w-8 h-8 rounded-full border border-white/10 shrink-0"
            />
          )}
          {loading && !meta && (
            <div className="w-8 h-8 rounded-full bg-white/10 animate-pulse shrink-0" />
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <GitBranch className="w-3.5 h-3.5 text-violet-400 shrink-0" />
              <a
                href={res.url}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-bold text-white hover:text-violet-300 transition-colors truncate cursor-pointer"
              >
                {meta
                  ? `${meta.owner.login} / ${meta.name}`
                  : res.title || (parsed ? `${parsed.owner}/${parsed.repo}` : res.url)}
              </a>
            </div>
            {meta?.fork && (
              <span className="text-[10px] text-neutral-500">
                forked from {meta.parent?.full_name}
              </span>
            )}
          </div>
        </div>
        {canDelete && (
          <button
            type="button"
            onClick={() => onDelete(res.id)}
            className="text-neutral-600 hover:text-rose-400 p-1 opacity-0 group-hover/res:opacity-100 transition-opacity cursor-pointer shrink-0"
            title="Remove"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="px-4 pb-3">
        {loading && (
          <div className="space-y-1.5">
            <div className="h-2.5 bg-white/5 rounded animate-pulse w-3/4" />
            <div className="h-2.5 bg-white/5 rounded animate-pulse w-1/2" />
          </div>
        )}
        {error && !loading && (
          <p className="text-xs text-neutral-500 font-mono truncate">{res.url}</p>
        )}
        {meta && !loading && (
          <p className="text-xs text-neutral-400 leading-relaxed line-clamp-2">
            {meta.description || "No description provided."}
          </p>
        )}
        {meta?.topics && meta.topics.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {meta.topics.slice(0, 4).map((topic) => (
              <span
                key={topic}
                className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-300 border border-violet-500/25 font-medium"
              >
                {topic}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="px-4 py-2.5 border-t border-white/5 bg-white/[0.02] flex items-center justify-between gap-3 text-[11px]">
        <div className="flex items-center gap-3 text-neutral-400">
          {meta && (
            <span className="flex items-center gap-1 hover:text-yellow-400 transition-colors">
              <Star className="w-3 h-3" />
              <span>{formatNumber(meta.stargazers_count)}</span>
            </span>
          )}
          {meta && (
            <span className="flex items-center gap-1 hover:text-sky-400 transition-colors">
              <GitFork className="w-3 h-3" />
              <span>{formatNumber(meta.forks_count)}</span>
            </span>
          )}
          {meta && (
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              <span>{formatNumber(meta.watchers_count)}</span>
            </span>
          )}
          {meta?.language && (
            <span className="flex items-center gap-1">
              <span
                className="w-2.5 h-2.5 rounded-full inline-block"
                style={{ backgroundColor: langColor }}
              />
              <span className="text-neutral-300 font-medium">{meta.language}</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-neutral-600">
            by <span className="text-neutral-400 font-semibold">{res.createdBy?.name || "Teammate"}</span>
          </span>
          <a
            href={res.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 bg-violet-500/20 hover:bg-violet-500/35 text-violet-300 px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer border border-violet-500/30"
          >
            <Code2 className="w-3 h-3" />
            View Repo
          </a>
        </div>
      </div>
    </div>
  );
}

function GenericResourceCard({ res, user, squad, onDelete, onChatWithDoc }) {
  const Icon = CATEGORY_ICONS[res.category] || LinkIcon;
  const colorClass = CATEGORY_COLORS[res.category] || CATEGORY_COLORS.Resource;
  const canDelete = user && (res.createdById === user.id || squad.ownerId === user.id);
  const targetUrl = getFileUrl(res.url);

  return (
    <div className="p-3.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all flex flex-col justify-between group/res">
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 ${colorClass}`}>
            <Icon className="w-3 h-3" />
            {res.category}
          </span>
          {canDelete && (
            <button
              type="button"
              onClick={() => onDelete(res.id)}
              className="text-neutral-500 hover:text-rose-400 p-1 opacity-0 group-hover/res:opacity-100 transition-opacity cursor-pointer"
              title="Delete"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <h5 className="text-xs font-bold text-white group-hover/res:text-emerald-300 transition-colors line-clamp-1">
          {res.title}
        </h5>
        <p className="text-[11px] font-mono text-neutral-400 truncate mt-0.5">{res.url}</p>
      </div>
      <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-[10px] text-neutral-500">
        <span>
          by <span className="text-neutral-300 font-semibold">{res.createdBy?.name || "Teammate"}</span>
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onChatWithDoc && onChatWithDoc(res)}
            className="inline-flex items-center gap-1 text-violet-400 hover:text-violet-300 font-bold transition-colors cursor-pointer"
            title="Ask AI about this study resource"
          >
            <Sparkles className="w-3 h-3 text-violet-400" />
            <span>Ask AI</span>
          </button>
          <a
            href={targetUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-bold transition-colors cursor-pointer"
          >
            <span>Open</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}

function DocumentAiModal({ doc, squad, user, onClose, onOpenProModal, openAuthModal }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `👋 Hi! I'm your **StudySquad Document AI Assistant** powered by Google Gemini.\n\nI'm ready to analyze and answer questions about **"${doc.title}"**. What would you like to explore?`
    }
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const chatBottomRef = useRef(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleAsk = async (queryText) => {
    const q = (queryText || inputQuery).trim();
    if (!q || isLoading) return;

    if (!user) {
      if (openAuthModal) openAuthModal('register');
      return;
    }

    const userMsg = { role: 'user', content: q };
    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setIsLoading(true);

    try {
      const res = await aiAPI.chatWithDoc({
        squadId: squad.id,
        resourceId: doc.id,
        fileName: doc.title || doc.url,
        fileUrl: doc.url,
        query: q,
      });

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: res.data.answer || 'Document analysis completed.',
          poweredBy: res.data.poweredBy
        }
      ]);
    } catch (err) {
      console.error('Doc AI Error:', err);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: '⚠️ Failed to analyze document. Please check that the server is running or configure GEMINI_API_KEY in backend/.env.',
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const copyAnswer = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md">
      <div className="bg-neutral-900 border border-violet-500/30 w-full max-w-2xl rounded-3xl shadow-2xl flex flex-col h-[600px] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-white/10 bg-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-violet-500/20 text-violet-400 border border-violet-500/30">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-violet-400 uppercase tracking-wider">
                  Document AI • Gemini
                </span>
                <span className="text-[10px] px-2 py-0.2 rounded-full bg-white/10 text-neutral-300">
                  {doc.category || 'Document'}
                </span>
              </div>
              <h4 className="text-sm font-bold text-white truncate max-w-md">
                {doc.title}
              </h4>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-4 py-2 border-b border-white/5 bg-black/20 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <span className="text-[10px] font-bold text-neutral-400 shrink-0">Quick prompts:</span>
          {[
            { label: '📝 Summarize takeaways', q: 'Summarize the key takeaways and main points of this document.' },
            { label: '❓ 3 Exam Questions', q: 'Generate 3 high-yield exam practice questions based on this document with answers.' },
            { label: '💡 Explain simply', q: 'Explain the core concept in this document like I am a beginner.' },
            { label: '📐 Key Formulas / Terms', q: 'Extract all important definitions, terms, or formulas mentioned in this material.' },
          ].map((chip, idx) => (
            <button
              key={idx}
              type="button"
              disabled={isLoading}
              onClick={() => handleAsk(chip.q)}
              className="px-2.5 py-1 rounded-lg bg-violet-500/15 hover:bg-violet-500/25 text-violet-300 border border-violet-500/30 text-[11px] font-medium shrink-0 transition-all cursor-pointer disabled:opacity-40"
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* Messages Stream */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3.5 text-xs">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-medium'
                    : 'bg-white/5 border border-violet-500/20 text-neutral-200'
                }`}
              >
                {m.role === 'assistant' && (
                  <div className="flex items-center justify-between gap-3 mb-1 pb-1 border-b border-white/5">
                    <span className="font-bold text-[10px] text-violet-400 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      StudySquad AI
                    </span>
                    <button
                      type="button"
                      onClick={() => copyAnswer(m.content, i)}
                      className="text-[10px] text-neutral-400 hover:text-white flex items-center gap-1 cursor-pointer"
                    >
                      {copiedIndex === i ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedIndex === i ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                )}
                <div className="whitespace-pre-line">{m.content}</div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center gap-2 p-3 rounded-2xl bg-white/5 border border-violet-500/20 text-violet-300 w-fit animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
              <span>Analyzing document with Gemini AI...</span>
            </div>
          )}
          <div ref={chatBottomRef} />
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAsk();
          }}
          className="p-3 border-t border-white/10 bg-white/5 flex items-center gap-2"
        >
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            placeholder="Ask anything about this document..."
            disabled={isLoading}
            className="flex-1 bg-white/5 border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-violet-500/60"
          />
          <button
            type="submit"
            disabled={!inputQuery.trim() || isLoading}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-500 hover:from-violet-400 hover:to-indigo-400 text-white font-bold text-xs inline-flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
          >
            {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            <span>Ask</span>
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ResourceHub({ squad, user, socket, openAuthModal, onOpenProModal }) {
  // Sub-tabs: 'notes' | 'resources' | 'slides'
  const [activeSubTab, setActiveSubTab] = useState("slides");
  const [activeDocChat, setActiveDocChat] = useState(null);

  // Scratchpad Notes State
  const [notes, setNotes] = useState(squad.sharedNotes || "");
  const [saveStatus, setSaveStatus] = useState("saved");
  const [copiedNotes, setCopiedNotes] = useState(false);
  const saveTimeoutRef = useRef(null);

  // Resources List State
  const [resources, setResources] = useState(squad.resources || []);
  const [loadingResources, setLoadingResources] = useState(false);

  // Web Resource Add State
  const [isAddingResource, setIsAddingResource] = useState(false);
  const [resourceTitle, setResourceTitle] = useState("");
  const [resourceUrl, setResourceUrl] = useState("");
  const [resourceCategory, setResourceCategory] = useState("Docs");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("All");
  const [isFetchingGitHub, setIsFetchingGitHub] = useState(false);

  // PDF / Slides File Upload State
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [showUploadZone, setShowUploadZone] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [customFileTitle, setCustomFileTitle] = useState("");
  const [fileCategory, setFileCategory] = useState("PDF");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (squad?.id) {
      setLoadingResources(true);
      squadsAPI
        .getResources(squad.id)
        .then((res) => {
          if (res.data?.resources) setResources(res.data.resources);
        })
        .catch((err) => console.warn("Fetch resources warning:", err.message))
        .finally(() => setLoadingResources(false));
    }
  }, [squad?.id]);

  useEffect(() => {
    if (squad?.sharedNotes !== undefined) setNotes(squad.sharedNotes || "");
  }, [squad?.id, squad?.sharedNotes]);

  useEffect(() => {
    if (!socket) return;
    const handleNotesSync = ({ notes: newNotes, updatedBy }) => {
      setNotes(newNotes);
      setSaveStatus(`Updated by ${updatedBy || "teammate"}`);
      setTimeout(() => setSaveStatus("saved"), 3000);
    };
    const handleResourceSync = ({ action, resource, resourceId }) => {
      if (action === "added" && resource) {
        setResources((prev) => [resource, ...prev.filter((r) => r.id !== resource.id)]);
      } else if (action === "deleted" && resourceId) {
        setResources((prev) => prev.filter((r) => r.id !== resourceId));
      }
    };
    socket.on("notes_sync", handleNotesSync);
    socket.on("resource_sync", handleResourceSync);
    return () => {
      socket.off("notes_sync", handleNotesSync);
      socket.off("resource_sync", handleResourceSync);
    };
  }, [socket]);

  const handleUrlChange = async (e) => {
    const val = e.target.value;
    setResourceUrl(val);
    if (isGitHubUrl(val)) {
      setResourceCategory("GitHub");
      const parsed = parseGitHubRepo(val);
      if (parsed && !resourceTitle) {
        setIsFetchingGitHub(true);
        try {
          const r = await fetch(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}`);
          if (r.ok) {
            const data = await r.json();
            setResourceTitle(data.full_name || `${parsed.owner}/${parsed.repo}`);
          }
        } catch {
          setResourceTitle(`${parsed.owner}/${parsed.repo}`);
        } finally {
          setIsFetchingGitHub(false);
        }
      }
    }
  };

  const handleNoteChange = (e) => {
    const val = e.target.value;
    setNotes(val);
    setSaveStatus("saving");
    socket?.emit("notes_update", {
      squadId: squad.id,
      notes: val,
      userName: user?.name || "Student",
    });
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      if (user) {
        try {
          await squadsAPI.updateNotes(squad.id, val);
        } catch {
          /* silent */
        }
      }
      setSaveStatus("saved");
    }, 1000);
  };

  const handleInsertTemplate = (type) => {
    let template = "";
    if (type === "agenda")
      template = `\n\n### Today's Session Agenda\n- [ ] Goal 1:\n- [ ] Goal 2:\n- [ ] Review & Takeaways:\n`;
    else if (type === "code")
      template = `\n\n### Code Snippet\n\`\`\`javascript\nfunction solve() {\n  \n}\n\`\`\`\n`;
    else if (type === "formulas")
      template = `\n\n### Key Formulas\n- Rule 1:\n- Time Complexity: O(N)\n- Note:\n`;
    const updated = notes + template;
    setNotes(updated);
    socket?.emit("notes_update", {
      squadId: squad.id,
      notes: updated,
      userName: user?.name || "Student",
    });
    if (user) squadsAPI.updateNotes(squad.id, updated).catch(() => {});
  };

  const handleCopyNotes = () => {
    navigator.clipboard.writeText(notes);
    setCopiedNotes(true);
    setTimeout(() => setCopiedNotes(false), 2000);
  };

  const handleDownloadNotes = () => {
    const blob = new Blob([notes], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${squad.name.replace(/[^a-zA-Z0-9]/g, "_")}_StudyNotes.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleAddResource = async (e) => {
    e.preventDefault();
    if (!resourceTitle.trim() && !resourceUrl.trim()) return;
    if (!user) {
      openAuthModal?.("login");
      return;
    }
    try {
      const payload = {
        title: resourceTitle.trim() || resourceUrl.trim(),
        url: resourceUrl.trim(),
        category: resourceCategory,
      };
      const res = await squadsAPI.addResource(squad.id, payload);
      const newRes = res.data.resource;
      setResources((prev) => [newRes, ...prev]);
      socket?.emit("resource_action", { squadId: squad.id, action: "added", resource: newRes });
      setResourceTitle("");
      setResourceUrl("");
      setResourceCategory("Docs");
      setIsAddingResource(false);
    } catch (err) {
      console.error("Failed to add resource:", err);
    }
  };

  // Handle Drag & Drop File Selection
  const handleFileDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      processSelectedFile(e.target.files[0]);
    }
  };

  const processSelectedFile = (file) => {
    setSelectedFile(file);
    const ext = file.name.split(".").pop().toLowerCase();
    if (ext === "pdf") setFileCategory("PDF");
    else if (["ppt", "pptx"].includes(ext)) setFileCategory("Slides");
    else if (["doc", "docx"].includes(ext)) setFileCategory("Docs");
    else if (["png", "jpg", "jpeg"].includes(ext)) setFileCategory("CheatSheet");
    else setFileCategory("Notes");

    if (!customFileTitle) {
      const cleanName = file.name.replace(/\.[^/.]+$/, "");
      setCustomFileTitle(cleanName);
    }
  };

  // Submit File Upload to Backend API
  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) return;
    if (!user) {
      openAuthModal?.("login");
      return;
    }

    setIsUploadingFile(true);
    setUploadProgress(15);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      if (customFileTitle.trim()) {
        formData.append("title", customFileTitle.trim());
      }
      formData.append("category", fileCategory);

      const res = await squadsAPI.uploadResource(squad.id, formData, (evt) => {
        if (evt.total) {
          const percent = Math.round((evt.loaded * 100) / evt.total);
          setUploadProgress(percent);
        }
      });

      const newResource = res.data.resource;
      setResources((prev) => [newResource, ...prev.filter((r) => r.id !== newResource.id)]);
      socket?.emit("resource_action", { squadId: squad.id, action: "added", resource: newResource });

      setSelectedFile(null);
      setCustomFileTitle("");
      setUploadProgress(0);
      setIsUploadingFile(false);
      setShowUploadZone(false);
    } catch (err) {
      console.error("File upload failed:", err);
      alert(err.response?.data?.error || "Failed to upload file.");
      setIsUploadingFile(false);
      setUploadProgress(0);
    }
  };

  const handleDeleteResource = async (resourceId) => {
    if (!user) return;
    try {
      await squadsAPI.deleteResource(squad.id, resourceId);
      setResources((prev) => prev.filter((r) => r.id !== resourceId));
      socket?.emit("resource_action", { squadId: squad.id, action: "deleted", resourceId });
    } catch (err) {
      console.error("Failed to delete resource:", err);
    }
  };

  // Categorize resources
  const isUploadResource = (r) =>
    r.category === "PDF" ||
    r.category === "Slides" ||
    r.url?.startsWith("/uploads/") ||
    r.url?.toLowerCase().match(/\.(pdf|ppt|pptx|docx|doc)$/);

  const slideResources = resources.filter(isUploadResource);
  const linkResources = resources.filter((r) => !isUploadResource(r));

  const filteredLinks =
    selectedCategoryFilter === "All"
      ? linkResources
      : linkResources.filter((r) => r.category === selectedCategoryFilter);

  const githubCount = resources.filter((r) => r.category === "GitHub").length;

  return (
    <div className="flex flex-col h-[540px] rounded-2xl border border-white/10 bg-neutral-950/80 overflow-hidden shadow-2xl backdrop-blur-xl">
      {/* Header Bar */}
      <div className="px-4 py-3 border-b border-white/10 bg-white/5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-xl border border-white/10 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveSubTab("slides")}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
              activeSubTab === "slides"
                ? "bg-rose-500 text-black shadow-md font-bold"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <Presentation className="w-3.5 h-3.5" />
            <span>PDF Slides & Notes</span>
            {slideResources.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-950/60 text-black text-[10px] font-extrabold border border-rose-400/40">
                {slideResources.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("notes")}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
              activeSubTab === "notes"
                ? "bg-emerald-500 text-black shadow-md font-bold"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Shared Scratchpad</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("resources")}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
              activeSubTab === "resources"
                ? "bg-emerald-500 text-black shadow-md font-bold"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Links & Repos ({linkResources.length})</span>
            {githubCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-violet-500/30 text-violet-300 text-[10px] font-bold border border-violet-500/30">
                {githubCount}
              </span>
            )}
          </button>
        </div>

        {activeSubTab === "slides" ? (
          <button
            type="button"
            onClick={() => setShowUploadZone(!showUploadZone)}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-400 hover:to-amber-400 text-black font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-sm text-xs"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>{showUploadZone ? "Close Uploader" : "+ Upload PDF / Slides"}</span>
          </button>
        ) : activeSubTab === "notes" ? (
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-neutral-400 flex items-center gap-1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
              </span>
              <span>{saveStatus === "saving" ? "Saving..." : saveStatus}</span>
            </span>
            <button
              type="button"
              onClick={handleCopyNotes}
              className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-neutral-200 border border-white/10 font-semibold inline-flex items-center gap-1 transition-all cursor-pointer"
            >
              {copiedNotes ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copiedNotes ? "Copied" : "Copy"}</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadNotes}
              className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-neutral-200 border border-white/10 font-semibold inline-flex items-center gap-1 transition-all cursor-pointer"
            >
              <Download className="w-3 h-3" />
              <span>Export .md</span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsAddingResource(!isAddingResource)}
            className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold inline-flex items-center gap-1 transition-all cursor-pointer shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isAddingResource ? "Cancel" : "+ Share Web Link"}</span>
          </button>
        )}
      </div>

      {/* Body Area */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* SUBTAB 1: PDF SLIDES & LECTURE NOTES UPLOADER */}
        {activeSubTab === "slides" && (
          <div className="space-y-4">
            {/* Interactive Upload Box */}
            {showUploadZone && (
              <form
                onSubmit={handleUploadSubmit}
                className="p-4 rounded-2xl border border-rose-500/35 bg-rose-950/20 backdrop-blur-md space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-2">
                    <FileUp className="w-3.5 h-3.5" />
                    <span>Upload Lecture Slides, PDFs or Study Sheets</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowUploadZone(false);
                      setSelectedFile(null);
                    }}
                    className="p-1 text-neutral-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Drag and Drop Zone */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleFileDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-5 text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                    isDragging
                      ? "border-rose-400 bg-rose-500/10"
                      : selectedFile
                      ? "border-emerald-500/50 bg-emerald-950/20"
                      : "border-white/20 hover:border-rose-400/50 hover:bg-white/5"
                  }`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileInputChange}
                    accept=".pdf,.ppt,.pptx,.doc,.docx,.txt,.png,.jpg,.jpeg"
                    className="hidden"
                  />

                  {selectedFile ? (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold text-xs border border-rose-500/30">
                        {selectedFile.name.split(".").pop().toUpperCase()}
                      </div>
                      <div className="text-left">
                        <p className="text-xs font-bold text-white max-w-sm truncate">
                          {selectedFile.name}
                        </p>
                        <p className="text-[11px] text-emerald-400">
                          Ready to upload • {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <UploadCloud className="w-8 h-8 text-rose-400/80 mb-2" />
                      <p className="text-xs font-semibold text-white">
                        Click to browse or drag & drop lecture files here
                      </p>
                      <p className="text-[11px] text-neutral-400 mt-0.5">
                        Supports PDF, PowerPoint (PPT/PPTX), Word (DOCX), Formulas & Images (Max 30MB)
                      </p>
                    </>
                  )}
                </div>

                {/* Title & Category Input */}
                {selectedFile && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                    <div className="sm:col-span-2">
                      <input
                        type="text"
                        value={customFileTitle}
                        onChange={(e) => setCustomFileTitle(e.target.value)}
                        placeholder="Document title or Lecture chapter (e.g. Chapter 4 - Graph Algorithms)"
                        className="w-full bg-black/60 border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-rose-400"
                      />
                    </div>
                    <div>
                      <select
                        value={fileCategory}
                        onChange={(e) => setFileCategory(e.target.value)}
                        className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-400"
                      >
                        <option value="PDF">PDF Document</option>
                        <option value="Slides">Lecture Slides (PPT)</option>
                        <option value="Notes">Study Notes</option>
                        <option value="CheatSheet">Formula CheatSheet</option>
                        <option value="Docs">Reference Docs</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* Progress bar */}
                {isUploadingFile && (
                  <div className="w-full bg-black/60 rounded-full h-2 overflow-hidden border border-white/10">
                    <div
                      className="bg-gradient-to-r from-rose-500 to-amber-500 h-full transition-all duration-200"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowUploadZone(false);
                      setSelectedFile(null);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-neutral-300 text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!selectedFile || isUploadingFile}
                    className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-400 hover:to-amber-400 text-black text-xs font-bold shadow-md cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
                  >
                    {isUploadingFile ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Uploading ({uploadProgress}%)...</span>
                      </>
                    ) : (
                      <>
                        <FileUp className="w-3.5 h-3.5" />
                        <span>Upload to Squad</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* List of Uploaded Slides & PDFs */}
            {loadingResources ? (
              <div className="h-40 flex items-center justify-center text-neutral-500 text-xs">
                <Loader2 className="w-5 h-5 animate-spin mr-2 text-rose-400" />
                Loading lecture documents...
              </div>
            ) : slideResources.length === 0 ? (
              <div className="h-52 rounded-xl border border-dashed border-white/10 flex flex-col items-center justify-center text-center p-6 text-xs text-neutral-500">
                <Presentation className="w-10 h-10 mb-2 opacity-40 text-rose-400" />
                <p className="font-semibold text-neutral-300">No lecture slides or PDFs uploaded yet.</p>
                <p className="text-[11px] text-neutral-500 mt-1 max-w-sm">
                  Upload your professor's slide deck, formula cheat sheets, or revision notes so everyone in the room can study together.
                </p>
                <button
                  type="button"
                  onClick={() => setShowUploadZone(true)}
                  className="mt-3.5 px-3.5 py-1.5 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold hover:bg-rose-500/30 transition-all cursor-pointer inline-flex items-center gap-1.5"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Upload First Slide Deck / PDF</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {slideResources.map((res) => (
                  <PdfSlideCard
                    key={res.id}
                    res={res}
                    user={user}
                    squad={squad}
                    onDelete={handleDeleteResource}
                    onChatWithDoc={(doc) => setActiveDocChat(doc)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* SUBTAB 2: SHARED SCRATCHPAD NOTES */}
        {activeSubTab === "notes" && (
          <div className="flex flex-col h-full space-y-3">
            <div className="flex items-center gap-2 flex-wrap text-[11px]">
              <span className="text-neutral-500 font-medium">Quick Insert:</span>
              {[
                ["agenda", "Agenda"],
                ["code", "Code Block"],
                ["formulas", "Formulas"],
              ].map(([type, label]) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleInsertTemplate(type)}
                  className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/15 text-neutral-300 border border-white/10 transition-colors cursor-pointer"
                >
                  + {label}
                </button>
              ))}
            </div>
            <div className="relative flex-1 rounded-xl border border-white/10 bg-black/40 overflow-hidden flex flex-col">
              <textarea
                value={notes}
                onChange={handleNoteChange}
                placeholder="Collaborative study scratchpad... Type here, paste links, summarize concepts, or draft solutions. Everyone in the room sees this in real-time."
                className="w-full flex-1 p-4 bg-transparent text-sm text-neutral-200 placeholder-neutral-500 resize-none focus:outline-none font-mono leading-relaxed selection:bg-emerald-500/30 selection:text-white"
              />
            </div>
            <p className="text-[11px] text-neutral-500 flex items-center justify-between">
              <span>Markdown supported - Auto-saves to database</span>
              <span>Squad: {squad.name}</span>
            </p>
          </div>
        )}

        {/* SUBTAB 3: LINKS & GITHUB REPOSITORIES */}
        {activeSubTab === "resources" && (
          <div className="space-y-4">
            {isAddingResource && (
              <form
                onSubmit={handleAddResource}
                className="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 space-y-3"
              >
                <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                  <Plus className="w-3.5 h-3.5" />
                  Share a Web Resource or Repo
                </div>

                <div className="relative">
                  <input
                    type="url"
                    value={resourceUrl}
                    onChange={handleUrlChange}
                    placeholder="Paste URL - GitHub repos get a rich preview automatically"
                    className="w-full bg-black/50 border border-white/15 rounded-xl px-3 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 font-mono pr-32"
                    required
                  />
                  {isFetchingGitHub && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-violet-400 text-[10px]">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Fetching...
                    </span>
                  )}
                  {isGitHubUrl(resourceUrl) && !isFetchingGitHub && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-violet-300 text-[10px] font-bold">
                      <GitBranch className="w-3 h-3" />
                      GitHub Repo
                    </span>
                  )}
                </div>

                <input
                  type="text"
                  value={resourceTitle}
                  onChange={(e) => setResourceTitle(e.target.value)}
                  placeholder="Title (auto-filled for GitHub repos)"
                  className="w-full bg-black/50 border border-white/15 rounded-xl px-3 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
                />

                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] text-neutral-400 font-medium">Category:</span>
                  {["Docs", "GitHub", "CheatSheet", "Video", "Code", "Resource"].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setResourceCategory(cat)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                        resourceCategory === cat
                          ? cat === "GitHub"
                            ? "bg-violet-500 text-white"
                            : "bg-emerald-500 text-black"
                          : "bg-white/5 text-neutral-400 hover:text-white"
                      }`}
                    >
                      {cat === "GitHub" ? "GitHub" : cat}
                    </button>
                  ))}
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingResource(false);
                      setResourceTitle("");
                      setResourceUrl("");
                      setResourceCategory("Docs");
                    }}
                    className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-neutral-300 text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold shadow-md cursor-pointer"
                  >
                    Share Resource
                  </button>
                </div>
              </form>
            )}

            <div className="flex items-center gap-1.5 overflow-x-auto text-[11px] pb-1">
              <span className="text-neutral-500 font-medium mr-1 shrink-0">Filter:</span>
              {["All", "GitHub", "Docs", "CheatSheet", "Video", "Code", "Resource"].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategoryFilter(cat)}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    selectedCategoryFilter === cat
                      ? cat === "GitHub"
                        ? "bg-violet-500/30 text-violet-200 border border-violet-500/40"
                        : "bg-white/20 text-white"
                      : "bg-white/5 text-neutral-400 hover:text-neutral-200"
                  }`}
                >
                  {cat === "GitHub" ? "GitHub Repos" : cat}
                </button>
              ))}
            </div>

            {loadingResources ? (
              <div className="h-40 flex items-center justify-center text-neutral-500 text-xs">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Loading shared resources...
              </div>
            ) : filteredLinks.length === 0 ? (
              <div className="h-52 rounded-xl border border-dashed border-white/10 flex flex-col items-center justify-center text-center p-6 text-xs text-neutral-500">
                <GitBranch className="w-8 h-8 mb-2 opacity-30 text-violet-400" />
                <p className="font-semibold text-neutral-400">No web resources pinned yet.</p>
                <p className="text-[11px] text-neutral-600 mt-1 max-w-sm">
                  Paste a GitHub repo URL for a rich card preview, or share documentation and tutorial links.
                </p>
                <button
                  type="button"
                  onClick={() => setIsAddingResource(true)}
                  className="mt-3 px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold hover:bg-emerald-500/30 transition-all cursor-pointer"
                >
                  + Add First Link
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredLinks.map((res) =>
                  res.category === "GitHub" ? (
                    <GitHubRepoCard
                      key={res.id}
                      res={res}
                      user={user}
                      squad={squad}
                      onDelete={handleDeleteResource}
                    />
                  ) : (
                    <GenericResourceCard
                      key={res.id}
                      res={res}
                      user={user}
                      squad={squad}
                      onDelete={handleDeleteResource}
                      onChatWithDoc={(doc) => setActiveDocChat(doc)}
                    />
                  )
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Document AI Chat Modal */}
      {activeDocChat && (
        <DocumentAiModal
          doc={activeDocChat}
          squad={squad}
          user={user}
          onClose={() => setActiveDocChat(null)}
          onOpenProModal={onOpenProModal}
          openAuthModal={openAuthModal}
        />
      )}
    </div>
  );
}
