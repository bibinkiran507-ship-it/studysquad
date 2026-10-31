import React, { useState } from 'react';
import {
  Video,
  Maximize2,
  ExternalLink,
  ShieldCheck,
  Copy,
  Check,
  Edit2,
  Save,
  Link as LinkIcon,
} from 'lucide-react';
import { squadsAPI } from '../api/client';

function getFallbackMeetingUrl(platform = 'Google Meet') {
  const p = String(platform || '').toLowerCase();
  if (p.includes('zoom')) return 'https://zoom.us/join';
  if (p.includes('discord')) return 'https://discord.com';
  return 'https://meet.google.com/new';
}

export default function InRoomVideo({ squad, user }) {
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [meetingUrl, setMeetingUrl] = useState(squad.meetingUrl || squad.link || '');
  const [isEditingMeeting, setIsEditingMeeting] = useState(false);
  const [meetingInput, setMeetingInput] = useState(squad.meetingUrl || squad.link || '');
  const [isSavingMeeting, setIsSavingMeeting] = useState(false);

  const platformName = squad.platform || 'Google Meet';
  const effectiveMeetingUrl = meetingUrl.trim() || getFallbackMeetingUrl(platformName);
  const isOwner = user && (squad.ownerId === user.id || squad.owner?.id === user.id);

  // Clean room identifier for Jitsi
  const roomId = `StudySquad_${(squad.id || 'room').replace(/[^a-zA-Z0-9]/g, '')}`;
  const userName = encodeURIComponent(user?.name || 'Student');

  // Jitsi Meet public secure embed URL
  const jitsiUrl = `https://meet.jit.si/${roomId}#config.prejoinPageEnabled=false&config.startWithAudioMuted=true&userInfo.displayName=${userName}`;

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(effectiveMeetingUrl || `https://meet.jit.si/${roomId}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveMeetingUrl = async (e) => {
    e.preventDefault();
    if (!meetingInput.trim()) return;
    setIsSavingMeeting(true);
    try {
      await squadsAPI.update(squad.id, { meetingUrl: meetingInput.trim() });
      setMeetingUrl(meetingInput.trim());
      setIsEditingMeeting(false);
    } catch (err) {
      console.warn('Meeting URL update notice:', err.message);
      setMeetingUrl(meetingInput.trim());
      setIsEditingMeeting(false);
    } finally {
      setIsSavingMeeting(false);
    }
  };

  return (
    <div
      className={`flex flex-col rounded-2xl border border-white/10 bg-neutral-950/90 overflow-hidden shadow-2xl transition-all ${
        isExpanded ? 'h-[720px]' : 'h-[560px]'
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
            Live Video &amp; Audio Call
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-medium">
            In-Room + {platformName}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Edit/Add Google Meet/Zoom Link */}
          {user && (
            <button
              type="button"
              onClick={() => {
                setIsEditingMeeting(!isEditingMeeting);
                setMeetingInput(meetingUrl);
              }}
              className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-neutral-200 border border-white/10 font-semibold inline-flex items-center gap-1 transition-all cursor-pointer text-xs"
              title="Edit or add custom Google Meet, Zoom or Discord link"
            >
              <Edit2 className="w-3 h-3 text-amber-400" />
              <span>{isEditingMeeting ? 'Cancel' : meetingUrl ? 'Edit Link' : 'Set Link'}</span>
            </button>
          )}

          {/* Copy Meeting Link */}
          <button
            type="button"
            onClick={handleCopyLink}
            className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-neutral-200 border border-white/10 font-semibold inline-flex items-center gap-1 transition-all cursor-pointer"
            title="Copy meeting link"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? 'Copied' : 'Copy Link'}</span>
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

          {/* Launch External Google Meet / Zoom / Discord */}
          <a
            href={effectiveMeetingUrl}
            target="_blank"
            rel="noreferrer"
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
            title={`Open in external ${platformName}`}
          >
            <span>Launch {platformName}</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Inline Edit Link Banner */}
      {isEditingMeeting && (
        <form
          onSubmit={handleSaveMeetingUrl}
          className="px-4 py-2 bg-emerald-950/40 border-b border-emerald-500/30 flex items-center gap-2 text-xs"
        >
          <LinkIcon className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <input
            type="url"
            value={meetingInput}
            onChange={(e) => setMeetingInput(e.target.value)}
            placeholder={`Paste your custom ${platformName} link (e.g., https://meet.google.com/abc-defg-hij)...`}
            className="flex-1 bg-black/60 border border-white/20 rounded-xl px-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-400 font-mono"
            required
          />
          <button
            type="submit"
            disabled={isSavingMeeting}
            className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs inline-flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
          >
            <Save className="w-3 h-3" />
            <span>{isSavingMeeting ? 'Saving...' : 'Save'}</span>
          </button>
        </form>
      )}

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
      <div className="px-4 py-2 border-t border-white/10 bg-white/5 flex items-center justify-between text-[11px] text-neutral-400 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>
            Current Link: <strong className="text-emerald-300 font-mono">{effectiveMeetingUrl}</strong>
          </span>
        </div>
        <span className="text-neutral-400">
          Tip: Click <strong className="text-white">Launch {platformName} ↗</strong> to open in a separate window or tab!
        </span>
      </div>
    </div>
  );
}
