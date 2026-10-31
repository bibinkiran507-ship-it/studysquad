import React, { useState } from 'react';
import {
  Video,
  Maximize2,
  ExternalLink,
  ShieldCheck,
  Copy,
  Check,
} from 'lucide-react';

function isRealCustomMeetingUrl(url) {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!/^https?:\/\//i.test(trimmed)) return false;
  if (/^https?:\/\/meet\.google\.com\/new\/?$/i.test(trimmed)) return false;
  if (/^https?:\/\/(www\.)?zoom\.us\/join\/?$/i.test(trimmed)) return false;
  if (/^https?:\/\/(www\.)?discord\.com\/?$/i.test(trimmed)) return false;
  return true;
}

export default function InRoomVideo({ squad, user }) {
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Clean room identifier for Jitsi
  const roomId = `StudySquad_${(squad.id || 'room').replace(/[^a-zA-Z0-9]/g, '')}`;
  const userName = encodeURIComponent(user?.name || 'Student');

  // Jitsi Meet public secure embed URL
  const jitsiUrl = `https://meet.jit.si/${roomId}#config.prejoinPageEnabled=false&config.startWithAudioMuted=true&userInfo.displayName=${userName}`;

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(`https://meet.jit.si/${roomId}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const showExternalLink = isRealCustomMeetingUrl(squad.meetingUrl);

  return (
    <div
      className={`flex flex-col rounded-2xl border border-white/10 bg-neutral-950/90 overflow-hidden shadow-2xl transition-all ${
        isExpanded ? 'h-[680px]' : 'h-[520px]'
      }`}
    >
      {/* Video Control Bar */}
      <div className="px-4 py-3 border-b border-white/10 bg-white/5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
          </span>
          <span className="font-bold text-white flex items-center gap-1.5">
            <Video className="w-3.5 h-3.5 text-emerald-400" />
            In-Room Video &amp; Audio Call
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-medium">
            Zero Install • In-App
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Copy In-Room Link */}
          <button
            type="button"
            onClick={handleCopyLink}
            className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-neutral-200 border border-white/10 font-semibold inline-flex items-center gap-1 transition-all cursor-pointer"
            title="Copy in-room call link"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? 'Copied' : 'Share Call'}</span>
          </button>

          {/* Toggle Expand Height */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-neutral-200 border border-white/10 font-semibold inline-flex items-center gap-1 transition-all cursor-pointer"
            title={isExpanded ? 'Compact View' : 'Expand Height'}
          >
            <Maximize2 className="w-3 h-3" />
            <span>{isExpanded ? 'Compact' : 'Expand'}</span>
          </button>

          {/* Optional Custom External Meeting Link */}
          {showExternalLink && (
            <a
              href={squad.meetingUrl}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
              title={`Open in external ${squad.platform || 'Meeting'}`}
            >
              <span>Open {squad.platform || 'External Link'}</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>

      {/* Embedded Video Call Frame */}
      <div className="relative flex-1 bg-black">
        <iframe
          src={jitsiUrl}
          allow="camera; microphone; fullscreen; display-capture; autoplay; clipboard-write"
          className="w-full h-full border-0"
          title={`StudySquad Room Call - ${squad.name}`}
        />
      </div>

      {/* Helper Footer Bar */}
      <div className="px-4 py-2 border-t border-white/10 bg-white/5 flex items-center justify-between text-[11px] text-neutral-400">
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          Encrypted peer audio, video &amp; screen share for {squad.name}
        </span>
        <span className="hidden sm:inline text-neutral-500">
          Tip: You can switch between Chat, Whiteboard, Notes &amp; AI Studio without disconnecting!
        </span>
      </div>
    </div>
  );
}
