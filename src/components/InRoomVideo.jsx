import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  MonitorUp,
  Hand,
  PhoneOff,
  PhoneCall,
  Maximize2,
  Minimize2,
  ExternalLink,
  ShieldCheck,
  Copy,
  Check,
  Edit2,
  Save,
  Link as LinkIcon,
  Users,
  Smile,
  Pin,
  PenTool,
  CheckCircle2,
  AlertTriangle,
  Info,
  X,
} from 'lucide-react';
import { squadsAPI } from '../api/client';
import Whiteboard from './Whiteboard';

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun.cloudflare.com:3478' },
];

const REACTION_EMOJIS = ['🔥', '💡', '👏', '❤️', '🎯'];

function getFallbackMeetingUrl(platform = 'Google Meet') {
  const p = String(platform || '').toLowerCase();
  if (p.includes('zoom')) return 'https://zoom.us/join';
  if (p.includes('discord')) return 'https://discord.com';
  return 'https://meet.google.com/new';
}

function isPlaceholderUrl(url = '') {
  const clean = String(url || '').trim().toLowerCase().replace(/\/+$/, '');
  return (
    !clean ||
    clean === 'https://meet.google.com/new' ||
    clean === 'https://meet.new' ||
    clean === 'https://zoom.us/join' ||
    clean === 'https://discord.com'
  );
}

function buildJitsiUrl(squad) {
  const rawSlug = String(squad?.id || squad?.name || 'room')
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .slice(0, 36);
  return `https://meet.jit.si/StudySquad-${rawSlug || 'LiveRoom'}`;
}

const VideoTile = memo(function VideoTile({
  stream,
  name,
  avatar,
  isLocal = false,
  audioMuted = false,
  videoMuted = false,
  isScreenSharing = false,
  isHandRaised = false,
  isPinned = false,
  compact = false,
  onTogglePin,
}) {
  const videoRef = useRef(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (el.srcObject !== stream) {
      el.srcObject = stream || null;
    }
    if (stream) {
      el.play?.().catch(() => {});
    }
  }, [stream, videoMuted, isScreenSharing]);

  const hasLiveVideoTrack = Boolean(
    stream &&
      stream.getVideoTracks().length > 0 &&
      (!videoMuted || isScreenSharing)
  );

  const fallbackAvatar =
    avatar ||
    `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name || 'Student')}`;

  return (
    <div
      className={`relative rounded-2xl overflow-hidden border bg-neutral-900 flex items-center justify-center group transition-all min-h-0 ${
        isHandRaised
          ? 'border-amber-400 shadow-lg shadow-amber-500/20'
          : isScreenSharing
          ? 'border-emerald-400/60 shadow-lg shadow-emerald-500/15'
          : 'border-white/10'
      } ${
        compact
          ? 'min-w-[165px] h-28 sm:h-32 lg:min-w-0 lg:w-full lg:h-40 shrink-0'
          : isPinned
          ? 'col-span-full h-full w-full min-h-[190px]'
          : 'h-full w-full min-h-[140px]'
      }`}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className={`w-full h-full max-h-full ${
          isScreenSharing ? 'object-contain bg-black' : 'object-cover'
        } ${isLocal && !isScreenSharing ? 'scale-x-[-1]' : ''} ${
          hasLiveVideoTrack ? 'block' : 'hidden'
        }`}
      />

      {!hasLiveVideoTrack && (
        <div className="flex flex-col items-center justify-center gap-2.5 p-4 text-center">
          <div className="relative">
            <img
              src={fallbackAvatar}
              alt={name}
              referrerPolicy="no-referrer"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name || 'Student')}`;
              }}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border-2 border-emerald-500/40 shadow-xl bg-neutral-800"
            />
            {!audioMuted && (
              <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-500 border-2 border-neutral-900" />
            )}
          </div>
          <span className="text-xs font-semibold text-neutral-300">
            {name} {isLocal ? '(You)' : ''}
          </span>
        </div>
      )}

      {/* Top-left badges (Screen Share / Raised Hand) */}
      <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 z-10">
        {isScreenSharing && (
          <span className="px-2 py-0.5 rounded-lg bg-emerald-500/90 text-black text-[10px] font-extrabold uppercase tracking-wider shadow">
            Screen Sharing
          </span>
        )}
        {isHandRaised && (
          <span className="px-2 py-0.5 rounded-lg bg-amber-400 text-black text-[11px] font-bold flex items-center gap-1 shadow animate-bounce">
            ✋ Hand Raised
          </span>
        )}
      </div>

      {/* Pin / Spotlight toggle */}
      {onTogglePin && (
        <button
          type="button"
          onClick={onTogglePin}
          title={isPinned ? 'Unpin tile' : 'Pin / Spotlight tile'}
          className={`absolute top-2.5 right-2.5 p-1.5 rounded-lg border text-xs transition-all cursor-pointer z-10 ${
            isPinned
              ? 'bg-emerald-500 text-black border-emerald-400 opacity-100'
              : 'bg-black/60 text-neutral-200 border-white/15 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 hover:bg-black/80'
          }`}
        >
          <Pin className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Bottom Name + Mic/Cam Status Pill */}
      <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between gap-2 pointer-events-none z-10">
        <span className="px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md text-white text-[11px] font-semibold truncate max-w-[75%] border border-white/10">
          {name} {isLocal ? '(You)' : ''}
        </span>
        <div className="flex items-center gap-1">
          <span
            className={`p-1 rounded-lg backdrop-blur-md border ${
              audioMuted
                ? 'bg-rose-500/85 text-white border-rose-400/50'
                : 'bg-black/65 text-emerald-400 border-white/10'
            }`}
          >
            {audioMuted ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
          </span>
          {videoMuted && !isScreenSharing && (
            <span className="p-1 rounded-lg bg-black/65 text-neutral-400 border border-white/10">
              <VideoOff className="w-3 h-3" />
            </span>
          )}
        </div>
      </div>
    </div>
  );
});

const InRoomVideo = memo(function InRoomVideo({ squad, user, socket, openAuthModal }) {
  const [copied, setCopied] = useState(false);
  const [isNativeFullscreen, setIsNativeFullscreen] = useState(false);
  const [isPseudoFullscreen, setIsPseudoFullscreen] = useState(false);
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [remoteDrawingAlert, setRemoteDrawingAlert] = useState(false);
  const [camPermission, setCamPermission] = useState('unknown'); // 'granted' | 'denied' | 'prompt' | 'unknown'
  const [micPermission, setMicPermission] = useState('unknown');
  const [mediaToast, setMediaToast] = useState(null); // { message, tone: 'success' | 'warning' | 'error' | 'info' }
  const [meetingUrl, setMeetingUrl] = useState(squad?.meetingUrl || squad?.link || '');
  const [isEditingMeeting, setIsEditingMeeting] = useState(false);
  const [meetingInput, setMeetingInput] = useState(squad?.meetingUrl || squad?.link || '');
  const [isSavingMeeting, setIsSavingMeeting] = useState(false);

  // Native WebRTC Call State (unlimited duration, zero 3rd-party cutoffs)
  const [inCall, setInCall] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [mediaNotice, setMediaNotice] = useState('');
  const [localStream, setLocalStream] = useState(null);
  const [audioMuted, setAudioMuted] = useState(false);
  const [videoMuted, setVideoMuted] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [peers, setPeers] = useState({}); // socketId -> { user, stream, audioMuted, videoMuted, isScreenSharing, isHandRaised }
  const [pinnedId, setPinnedId] = useState(null); // 'local' | peerSocketId | null
  const [reactions, setReactions] = useState([]);
  const [showReactionsBar, setShowReactionsBar] = useState(false);

  const callContainerRef = useRef(null);
  const toastTimerRef = useRef(null);
  const showWhiteboardRef = useRef(false);
  const localStreamRef = useRef(null);
  const cameraTrackRef = useRef(null);
  const screenStreamRef = useRef(null);
  const pcsRef = useRef(new Map()); // socketId -> RTCPeerConnection
  const pendingCandidatesRef = useRef(new Map()); // socketId -> RTCIceCandidateInit[]
  const inCallRef = useRef(false);
  const stateRef = useRef({
    audioMuted: false,
    videoMuted: false,
    isScreenSharing: false,
    isHandRaised: false,
  });

  const isFullscreen = isNativeFullscreen || isPseudoFullscreen;

  const showMediaToast = useCallback((message, tone = 'success', duration = 4500) => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
    setMediaToast({ message, tone });
    if (duration > 0) {
      toastTimerRef.current = setTimeout(() => {
        setMediaToast(null);
      }, duration);
    }
  }, []);

  useEffect(() => {
    showWhiteboardRef.current = showWhiteboard;
  }, [showWhiteboard]);

  useEffect(() => {
    stateRef.current = { audioMuted, videoMuted, isScreenSharing, isHandRaised };
  }, [audioMuted, videoMuted, isScreenSharing, isHandRaised]);

  // Live Camera & Microphone permission monitoring (notifies users when allowed or blocked)
  useEffect(() => {
    let active = true;
    let camStatusObj = null;
    let micStatusObj = null;

    const watchPermissions = async () => {
      if (typeof navigator === 'undefined' || !navigator.permissions?.query) return;
      try {
        camStatusObj = await navigator.permissions.query({ name: 'camera' });
        if (active && camStatusObj) {
          setCamPermission(camStatusObj.state);
          camStatusObj.onchange = () => {
            if (!active) return;
            const next = camStatusObj.state;
            setCamPermission(next);
            if (next === 'granted') {
              showMediaToast('Camera permission allowed!', 'success');
            } else if (next === 'denied') {
              showMediaToast(
                'Camera permission blocked — Allow camera in your browser address bar to enable video.',
                'warning',
                6000
              );
            }
          };
        }
      } catch {
        // Safari/Firefox may not support permissions.query({ name: 'camera' })
      }

      try {
        micStatusObj = await navigator.permissions.query({ name: 'microphone' });
        if (active && micStatusObj) {
          setMicPermission(micStatusObj.state);
          micStatusObj.onchange = () => {
            if (!active) return;
            const next = micStatusObj.state;
            setMicPermission(next);
            if (next === 'granted') {
              showMediaToast('Microphone permission allowed!', 'success');
            } else if (next === 'denied') {
              showMediaToast(
                'Microphone permission blocked — Allow microphone in your browser address bar to speak.',
                'warning',
                6000
              );
            }
          };
        }
      } catch {
        // Unsupported browser permissions API
      }
    };

    watchPermissions();

    return () => {
      active = false;
      if (camStatusObj) camStatusObj.onchange = null;
      if (micStatusObj) micStatusObj.onchange = null;
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, [showMediaToast]);

  // Keep native Fullscreen & Escape state in sync
  useEffect(() => {
    const syncFullscreen = () => {
      const fsEl = document.fullscreenElement || document.webkitFullscreenElement || null;
      setIsNativeFullscreen(Boolean(fsEl && fsEl === callContainerRef.current));
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsPseudoFullscreen(false);
      }
    };
    document.addEventListener('fullscreenchange', syncFullscreen);
    document.addEventListener('webkitfullscreenchange', syncFullscreen);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('fullscreenchange', syncFullscreen);
      document.removeEventListener('webkitfullscreenchange', syncFullscreen);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Notify call participants whenever a teammate draws on the shared Whiteboard
  useEffect(() => {
    if (!socket) return undefined;
    const handleRemoteBoardActivity = () => {
      if (!showWhiteboardRef.current) {
        setRemoteDrawingAlert(true);
      }
    };
    socket.on('whiteboard_draw', handleRemoteBoardActivity);
    socket.on('whiteboard_draw_batch', handleRemoteBoardActivity);
    return () => {
      socket.off('whiteboard_draw', handleRemoteBoardActivity);
      socket.off('whiteboard_draw_batch', handleRemoteBoardActivity);
    };
  }, [socket]);

  const handleToggleFullscreen = useCallback(async () => {
    const el = callContainerRef.current;
    if (!el) return;

    const currentFs = document.fullscreenElement || document.webkitFullscreenElement;
    if (currentFs) {
      try {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen();
        }
      } catch {}
      setIsNativeFullscreen(false);
      setIsPseudoFullscreen(false);
      return;
    }

    if (isPseudoFullscreen) {
      setIsPseudoFullscreen(false);
      return;
    }

    try {
      if (el.requestFullscreen) {
        await el.requestFullscreen();
        setIsNativeFullscreen(true);
        showMediaToast('Fullscreen mode active — Press Esc or Exit Fullscreen anytime.', 'info', 3000);
        return;
      }
      if (el.webkitRequestFullscreen) {
        el.webkitRequestFullscreen();
        setIsNativeFullscreen(true);
        showMediaToast('Fullscreen mode active — Press Esc or Exit Fullscreen anytime.', 'info', 3000);
        return;
      }
    } catch {
      // Fallback to viewport-fixed fullscreen overlay on mobile/iOS browsers
    }

    setIsPseudoFullscreen(true);
    showMediaToast('Fullscreen mode active — Tap Exit Fullscreen or press Esc anytime.', 'info', 3000);
  }, [isPseudoFullscreen, showMediaToast]);

  const handleToggleWhiteboard = useCallback(() => {
    setShowWhiteboard((prev) => {
      const next = !prev;
      if (next) {
        setRemoteDrawingAlert(false);
        showMediaToast('In-Call Whiteboard opened — Everyone in this squad can draw together live!', 'info', 3800);
      }
      return next;
    });
  }, [showMediaToast]);

  useEffect(() => {
    const nextUrl = squad?.meetingUrl || squad?.link || '';
    setMeetingUrl(nextUrl);
    setMeetingInput(nextUrl);
  }, [squad?.id, squad?.meetingUrl, squad?.link]);

  const closePeer = useCallback((peerSocketId) => {
    const pc = pcsRef.current.get(peerSocketId);
    if (pc) {
      try {
        pc.onicecandidate = null;
        pc.ontrack = null;
        pc.onconnectionstatechange = null;
        pc.close();
      } catch {}
      pcsRef.current.delete(peerSocketId);
    }
    pendingCandidatesRef.current.delete(peerSocketId);
    setPeers((prev) => {
      if (!prev[peerSocketId]) return prev;
      const next = { ...prev };
      delete next[peerSocketId];
      return next;
    });
    setPinnedId((prev) => (prev === peerSocketId ? null : prev));
  }, []);

  const stopAllLocalMedia = useCallback(() => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }
    if (cameraTrackRef.current) {
      cameraTrackRef.current.stop();
      cameraTrackRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    setLocalStream(null);
  }, []);

  const cleanupCall = useCallback(
    (emitLeave = true) => {
      if (emitLeave && inCallRef.current && socket && squad?.id) {
        socket.emit('leave_video_call', { squadId: squad.id });
      }
      inCallRef.current = false;
      setInCall(false);
      setIsJoining(false);
      setIsScreenSharing(false);
      setIsHandRaised(false);
      setPinnedId(null);
      setIsPseudoFullscreen(false);
      if (
        typeof document !== 'undefined' &&
        (document.fullscreenElement === callContainerRef.current ||
          document.webkitFullscreenElement === callContainerRef.current)
      ) {
        document.exitFullscreen?.().catch?.(() => {});
      }

      for (const peerId of Array.from(pcsRef.current.keys())) {
        closePeer(peerId);
      }
      pcsRef.current.clear();
      pendingCandidatesRef.current.clear();
      setPeers({});
      stopAllLocalMedia();
    },
    [closePeer, socket, squad?.id, stopAllLocalMedia]
  );

  useEffect(() => {
    return () => {
      cleanupCall(true);
    };
  }, [cleanupCall]);

  const flushPendingCandidates = useCallback(async (peerSocketId, pc) => {
    const queued = pendingCandidatesRef.current.get(peerSocketId);
    if (!queued || queued.length === 0) return;
    pendingCandidatesRef.current.set(peerSocketId, []);
    for (const cand of queued) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(cand));
      } catch {}
    }
  }, []);

  const getOrCreatePeerConnection = useCallback(
    (peerSocketId, peerUser, initialMeta = {}) => {
      if (pcsRef.current.has(peerSocketId)) {
        return pcsRef.current.get(peerSocketId);
      }

      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      pcsRef.current.set(peerSocketId, pc);

      setPeers((prev) => ({
        ...prev,
        [peerSocketId]: {
          user: peerUser || prev[peerSocketId]?.user || { name: 'Squad Mate' },
          stream: prev[peerSocketId]?.stream || null,
          audioMuted: initialMeta.audioMuted ?? prev[peerSocketId]?.audioMuted ?? false,
          videoMuted: initialMeta.videoMuted ?? prev[peerSocketId]?.videoMuted ?? false,
          isScreenSharing:
            initialMeta.isScreenSharing ?? prev[peerSocketId]?.isScreenSharing ?? false,
          isHandRaised: initialMeta.isHandRaised ?? prev[peerSocketId]?.isHandRaised ?? false,
        },
      }));

      // Attach local audio/video tracks (or recvonly transceivers if joining without camera/mic)
      const stream = localStreamRef.current;
      const audioTracks = stream ? stream.getAudioTracks() : [];
      const videoTracks = stream ? stream.getVideoTracks() : [];

      if (audioTracks.length > 0) {
        audioTracks.forEach((track) => pc.addTrack(track, stream));
      } else {
        try {
          pc.addTransceiver('audio', { direction: 'recvonly' });
        } catch {}
      }

      if (videoTracks.length > 0) {
        videoTracks.forEach((track) => pc.addTrack(track, stream));
      } else {
        try {
          pc.addTransceiver('video', { direction: 'recvonly' });
        } catch {}
      }

      pc.onicecandidate = (event) => {
        if (event.candidate && socket) {
          socket.emit('video_signal_send', {
            to: peerSocketId,
            signal: { type: 'candidate', candidate: event.candidate },
          });
        }
      };

      pc.ontrack = (event) => {
        const [remoteStream] = event.streams || [];
        if (remoteStream) {
          setPeers((prev) => ({
            ...prev,
            [peerSocketId]: {
              ...(prev[peerSocketId] || { user: peerUser || { name: 'Squad Mate' } }),
              stream: remoteStream,
            },
          }));
        } else if (event.track) {
          setPeers((prev) => {
            const existing = prev[peerSocketId]?.stream || new MediaStream();
            if (!existing.getTracks().some((t) => t.id === event.track.id)) {
              existing.addTrack(event.track);
            }
            return {
              ...prev,
              [peerSocketId]: {
                ...(prev[peerSocketId] || { user: peerUser || { name: 'Squad Mate' } }),
                stream: existing,
              },
            };
          });
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
          closePeer(peerSocketId);
        }
      };

      return pc;
    },
    [closePeer, socket]
  );

  const sendOfferToPeer = useCallback(
    async (peerSocketId, peerUser, meta = {}) => {
      try {
        const pc = getOrCreatePeerConnection(peerSocketId, peerUser, meta);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket?.emit('video_signal_send', {
          to: peerSocketId,
          signal: { type: 'offer', sdp: pc.localDescription },
        });
      } catch (err) {
        console.warn('WebRTC offer error:', err.message);
      }
    },
    [getOrCreatePeerConnection, socket]
  );

  // Socket signaling listeners while in call
  useEffect(() => {
    if (!socket || !inCall || !squad?.id) return undefined;

    const handleExistingPeers = ({ peers: existingList = [] }) => {
      existingList.forEach((peer) => {
        if (peer?.socketId && peer.socketId !== socket.id) {
          sendOfferToPeer(peer.socketId, peer.user, peer);
        }
      });
    };

    const handlePeerJoined = (peer) => {
      if (!peer?.socketId || peer.socketId === socket.id) return;
      getOrCreatePeerConnection(peer.socketId, peer.user, peer);
    };

    const handleSignalReceive = async ({ from, signal, user: senderUser }) => {
      if (!from || !signal) return;
      try {
        const pc = getOrCreatePeerConnection(from, senderUser);
        if (signal.type === 'offer' && signal.sdp) {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
          await flushPendingCandidates(from, pc);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('video_signal_send', {
            to: from,
            signal: { type: 'answer', sdp: pc.localDescription },
          });
        } else if (signal.type === 'answer' && signal.sdp) {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
          await flushPendingCandidates(from, pc);
        } else if (signal.type === 'candidate' && signal.candidate) {
          if (pc.remoteDescription && pc.remoteDescription.type) {
            await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
          } else {
            const list = pendingCandidatesRef.current.get(from) || [];
            list.push(signal.candidate);
            pendingCandidatesRef.current.set(from, list);
          }
        }
      } catch (err) {
        console.warn('WebRTC signal handling notice:', err.message);
      }
    };

    const handlePeerStateChanged = ({
      socketId: peerSocketId,
      audioMuted: pAudio,
      videoMuted: pVideo,
      isScreenSharing: pScreen,
      isHandRaised: pHand,
    }) => {
      if (!peerSocketId) return;
      setPeers((prev) => {
        if (!prev[peerSocketId]) return prev;
        return {
          ...prev,
          [peerSocketId]: {
            ...prev[peerSocketId],
            audioMuted: pAudio ?? prev[peerSocketId].audioMuted,
            videoMuted: pVideo ?? prev[peerSocketId].videoMuted,
            isScreenSharing: pScreen ?? prev[peerSocketId].isScreenSharing,
            isHandRaised: pHand ?? prev[peerSocketId].isHandRaised,
          },
        };
      });
      if (pScreen) {
        setPinnedId((curr) => curr || peerSocketId);
      }
    };

    const handlePeerLeft = ({ socketId: peerSocketId }) => {
      if (peerSocketId) closePeer(peerSocketId);
    };

    const handleReceiveReaction = (reaction) => {
      if (!reaction?.id) return;
      setReactions((prev) => [...prev.slice(-8), reaction]);
      setTimeout(() => {
        setReactions((prev) => prev.filter((r) => r.id !== reaction.id));
      }, 3200);
    };

    socket.on('video_existing_peers', handleExistingPeers);
    socket.on('video_peer_joined', handlePeerJoined);
    socket.on('video_signal_receive', handleSignalReceive);
    socket.on('video_peer_state_changed', handlePeerStateChanged);
    socket.on('video_peer_left', handlePeerLeft);
    socket.on('video_receive_reaction', handleReceiveReaction);

    socket.emit('join_video_call', {
      squadId: squad.id,
      initialState: stateRef.current,
    });

    return () => {
      socket.off('video_existing_peers', handleExistingPeers);
      socket.off('video_peer_joined', handlePeerJoined);
      socket.off('video_signal_receive', handleSignalReceive);
      socket.off('video_peer_state_changed', handlePeerStateChanged);
      socket.off('video_peer_left', handlePeerLeft);
      socket.off('video_receive_reaction', handleReceiveReaction);
    };
  }, [
    socket,
    inCall,
    squad?.id,
    sendOfferToPeer,
    getOrCreatePeerConnection,
    flushPendingCandidates,
    closePeer,
  ]);

  const emitLocalPeerState = useCallback(
    (patch) => {
      if (!socket || !inCallRef.current || !squad?.id) return;
      const next = { ...stateRef.current, ...patch };
      stateRef.current = next;
      socket.emit('video_peer_state', {
        squadId: squad.id,
        ...next,
      });
    },
    [socket, squad?.id]
  );

  const handleJoinCall = async (withCamera = true) => {
    if (!user) {
      openAuthModal?.('register');
      return;
    }
    if (isJoining || inCall) return;

    setIsJoining(true);
    setMediaNotice('');

    let acquiredStream = null;
    let startAudioMuted = false;
    let startVideoMuted = !withCamera;

    try {
      acquiredStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
        video: withCamera
          ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }
          : false,
      });
      setMicPermission('granted');
      if (withCamera && acquiredStream.getVideoTracks().length > 0) {
        setCamPermission('granted');
        showMediaToast('Camera & Microphone allowed — You are live in HD!', 'success', 4500);
      } else {
        showMediaToast('Microphone allowed — Joined in Voice Mode (Camera Off).', 'success', 4500);
      }
    } catch (firstErr) {
      const camWasDenied =
        firstErr?.name === 'NotAllowedError' || firstErr?.name === 'PermissionDeniedError';
      if (withCamera && camWasDenied) {
        setCamPermission('denied');
      }
      // Graceful fallback: try audio-only if laptop has no webcam, or listen-only if mic isn't plugged in
      try {
        acquiredStream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true },
          video: false,
        });
        setMicPermission('granted');
        startVideoMuted = true;
        if (withCamera) {
          const msg = camWasDenied
            ? 'Microphone allowed, but Camera was blocked. Click the lock/camera icon in your address bar to allow camera.'
            : 'Microphone allowed — Joined in voice mode (no webcam detected). You can still talk, draw & share screen!';
          setMediaNotice(msg);
          showMediaToast(msg, 'warning', 6000);
        } else {
          showMediaToast('Microphone allowed — Joined in Voice Mode.', 'success', 4000);
        }
      } catch (audioErr) {
        const micWasDenied =
          audioErr?.name === 'NotAllowedError' || audioErr?.name === 'PermissionDeniedError';
        if (micWasDenied) setMicPermission('denied');
        if (withCamera) setCamPermission('denied');
        acquiredStream = new MediaStream();
        startAudioMuted = true;
        startVideoMuted = true;
        const msg =
          micWasDenied || camWasDenied
            ? 'Camera & Microphone permissions were blocked — Joined in watch/listen mode. Allow them in your browser address bar anytime.'
            : 'No microphone or camera detected — Joined in watch/listen mode.';
        setMediaNotice(msg);
        showMediaToast(msg, 'error', 6500);
      }
    }

    const vidTrack = acquiredStream.getVideoTracks()[0] || null;
    cameraTrackRef.current = vidTrack;
    localStreamRef.current = acquiredStream;

    setLocalStream(acquiredStream);
    setAudioMuted(startAudioMuted);
    setVideoMuted(startVideoMuted);
    setIsScreenSharing(false);
    setIsHandRaised(false);
    stateRef.current = {
      audioMuted: startAudioMuted,
      videoMuted: startVideoMuted,
      isScreenSharing: false,
      isHandRaised: false,
    };

    inCallRef.current = true;
    setInCall(true);
    setIsJoining(false);
  };

  const replaceOutgoingVideoTrack = async (newVideoTrack) => {
    for (const [peerId, pc] of pcsRef.current.entries()) {
      const videoSender = pc
        .getSenders()
        .find((s) => s.track?.kind === 'video');
      if (videoSender) {
        try {
          await videoSender.replaceTrack(newVideoTrack);
        } catch {}
      } else if (newVideoTrack && localStreamRef.current) {
        try {
          pc.addTrack(newVideoTrack, localStreamRef.current);
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket?.emit('video_signal_send', {
            to: peerId,
            signal: { type: 'offer', sdp: pc.localDescription },
          });
        } catch {}
      }
    }
  };

  const handleToggleMic = async () => {
    const stream = localStreamRef.current;
    const audioTracks = stream ? stream.getAudioTracks() : [];
    if (audioTracks.length === 0) {
      try {
        const micStream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true },
        });
        const newMicTrack = micStream.getAudioTracks()[0];
        if (newMicTrack && stream) {
          stream.addTrack(newMicTrack);
          for (const [peerId, pc] of pcsRef.current.entries()) {
            pc.addTrack(newMicTrack, stream);
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socket?.emit('video_signal_send', {
              to: peerId,
              signal: { type: 'offer', sdp: pc.localDescription },
            });
          }
          setMicPermission('granted');
          setAudioMuted(false);
          emitLocalPeerState({ audioMuted: false });
          setMediaNotice('');
          showMediaToast('Microphone allowed & unmuted!', 'success', 3500);
        }
      } catch (err) {
        if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
          setMicPermission('denied');
        }
        const msg = 'Microphone permission blocked — Click the lock/mic icon in your browser bar to allow access.';
        setMediaNotice(msg);
        showMediaToast(msg, 'error', 5500);
      }
      return;
    }

    const nextMuted = !audioMuted;
    audioTracks.forEach((t) => {
      t.enabled = !nextMuted;
    });
    setAudioMuted(nextMuted);
    emitLocalPeerState({ audioMuted: nextMuted });
    showMediaToast(nextMuted ? 'Microphone muted' : 'Microphone on (allowed)', nextMuted ? 'info' : 'success', 2200);
  };

  const handleToggleCamera = async () => {
    if (isScreenSharing) {
      await stopScreenShare();
      return;
    }

    const stream = localStreamRef.current;
    if (!cameraTrackRef.current || cameraTrackRef.current.readyState === 'ended') {
      try {
        const camStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        });
        const newCamTrack = camStream.getVideoTracks()[0];
        if (newCamTrack && stream) {
          stream.getVideoTracks().forEach((old) => stream.removeTrack(old));
          stream.addTrack(newCamTrack);
          cameraTrackRef.current = newCamTrack;
          await replaceOutgoingVideoTrack(newCamTrack);
          setLocalStream(new MediaStream(stream.getTracks()));
          setCamPermission('granted');
          setVideoMuted(false);
          emitLocalPeerState({ videoMuted: false });
          setMediaNotice('');
          showMediaToast('Camera allowed & turned on!', 'success', 3500);
        }
      } catch (err) {
        if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
          setCamPermission('denied');
        }
        const msg = 'Camera permission blocked or no webcam found — Allow camera in your browser bar.';
        setMediaNotice(msg);
        showMediaToast(msg, 'error', 5500);
      }
      return;
    }

    const nextVideoMuted = !videoMuted;
    cameraTrackRef.current.enabled = !nextVideoMuted;
    setVideoMuted(nextVideoMuted);
    emitLocalPeerState({ videoMuted: nextVideoMuted });
    showMediaToast(nextVideoMuted ? 'Camera turned off' : 'Camera on (allowed)', nextVideoMuted ? 'info' : 'success', 2200);
  };

  const stopScreenShare = useCallback(async () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }
    const stream = localStreamRef.current;
    const camTrack =
      cameraTrackRef.current && cameraTrackRef.current.readyState === 'live'
        ? cameraTrackRef.current
        : null;

    if (stream) {
      stream.getVideoTracks().forEach((t) => {
        if (t !== camTrack) stream.removeTrack(t);
      });
      if (camTrack && !stream.getVideoTracks().includes(camTrack)) {
        stream.addTrack(camTrack);
      }
      setLocalStream(new MediaStream(stream.getTracks()));
    }

    await replaceOutgoingVideoTrack(camTrack);
    const nextVideoMuted = !camTrack || !camTrack.enabled;
    setIsScreenSharing(false);
    setVideoMuted(nextVideoMuted);
    emitLocalPeerState({ isScreenSharing: false, videoMuted: nextVideoMuted });
    showMediaToast('Screen sharing stopped', 'info', 2500);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emitLocalPeerState, showMediaToast]);

  const handleToggleScreenShare = async () => {
    if (isScreenSharing) {
      await stopScreenShare();
      return;
    }

    if (!navigator.mediaDevices?.getDisplayMedia) {
      const msg = 'Screen sharing is supported on desktop Chrome, Edge, Brave, and Safari.';
      setMediaNotice(msg);
      showMediaToast(msg, 'warning', 4500);
      return;
    }

    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' },
        audio: false,
      });
      const screenTrack = displayStream.getVideoTracks()[0];
      if (!screenTrack) return;

      screenStreamRef.current = displayStream;
      screenTrack.onended = () => {
        stopScreenShare();
      };

      const stream = localStreamRef.current || new MediaStream();
      localStreamRef.current = stream;
      stream.getVideoTracks().forEach((t) => stream.removeTrack(t));
      stream.addTrack(screenTrack);
      setLocalStream(new MediaStream(stream.getTracks()));

      await replaceOutgoingVideoTrack(screenTrack);
      setIsScreenSharing(true);
      emitLocalPeerState({ isScreenSharing: true, videoMuted: false });
      setMediaNotice('');
      showMediaToast('Screen sharing is live for everyone in this call!', 'success', 3500);
    } catch {
      // User cancelled screen picker
    }
  };

  const handleToggleHand = () => {
    const nextHand = !isHandRaised;
    setIsHandRaised(nextHand);
    emitLocalPeerState({ isHandRaised: nextHand });
  };

  const handleSendReaction = (emoji) => {
    if (!socket || !inCall || !squad?.id) return;
    socket.emit('video_send_reaction', { squadId: squad.id, emoji });
    setShowReactionsBar(false);
  };

  const platformName = squad?.platform || 'Google Meet';
  const hasCustomExternalLink = !isPlaceholderUrl(meetingUrl);
  const effectiveMeetingUrl = hasCustomExternalLink
    ? meetingUrl.trim()
    : getFallbackMeetingUrl(platformName);
  const roomInviteUrl = `${typeof window !== 'undefined' ? window.location.origin : 'https://studysquadai.com'}/?joinSquad=${squad?.id}`;

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(hasCustomExternalLink ? effectiveMeetingUrl : roomInviteUrl);
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
    } catch {
      setMeetingUrl(meetingInput.trim());
      setIsEditingMeeting(false);
    } finally {
      setIsSavingMeeting(false);
    }
  };

  const peerEntries = Object.entries(peers);
  const totalParticipants = (inCall ? 1 : 0) + peerEntries.length;
  const jitsiFallbackUrl = buildJitsiUrl(squad);

  const gridColsClass =
    pinnedId
      ? 'grid-cols-1'
      : peerEntries.length === 0
      ? 'grid-cols-1 md:grid-cols-2'
      : totalParticipants === 2
      ? 'grid-cols-1 sm:grid-cols-2'
      : totalParticipants <= 4
      ? 'grid-cols-1 sm:grid-cols-2'
      : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';

  const renderPermissionPill = (label, status) => {
    if (status === 'granted') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
          <CheckCircle2 className="w-3 h-3 shrink-0" />
          <span>{label}: Allowed</span>
        </span>
      );
    }
    if (status === 'denied') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/35 text-[10px] font-bold">
          <AlertTriangle className="w-3 h-3 shrink-0" />
          <span>{label}: Blocked</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 text-neutral-300 border border-white/15 text-[10px] font-semibold">
        <Info className="w-3 h-3 shrink-0 text-sky-400" />
        <span>{label}: Ask on Join</span>
      </span>
    );
  };

  return (
    <div
      ref={callContainerRef}
      className={`flex flex-col bg-neutral-950/95 overflow-hidden shadow-2xl transition-all ${
        isPseudoFullscreen
          ? 'fixed inset-0 z-[100] h-[100dvh] w-screen rounded-none border-0'
          : isNativeFullscreen
          ? 'h-screen w-screen rounded-none border-0'
          : 'rounded-2xl border border-white/10 h-[calc(100dvh-180px)] sm:h-[clamp(350px,calc(92vh-205px),540px)]'
      }`}
    >
      {/* Top Control Bar */}
      <div className="px-3 sm:px-4 py-2.5 border-b border-white/10 bg-white/5 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
          </span>
          <span className="font-bold text-white flex items-center gap-1.5">
            <Video className="w-3.5 h-3.5 text-emerald-400" />
            StudySquad Live Video
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold">
            {inCall ? `${totalParticipants} in Call • Unlimited HD` : 'Unlimited • Zero Cutoff'}
          </span>
          {inCall && (
            <div className="hidden xl:flex items-center gap-1.5">
              {renderPermissionPill('Cam', camPermission)}
              {renderPermissionPill('Mic', micPermission)}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleToggleWhiteboard}
            className={`px-2.5 py-1.5 rounded-xl font-semibold inline-flex items-center gap-1.5 border transition-all cursor-pointer text-xs ${
              showWhiteboard
                ? 'bg-emerald-500 text-black border-emerald-400 shadow-sm'
                : 'bg-white/10 hover:bg-white/20 text-neutral-200 border-white/10'
            }`}
            title="Open live collaborative whiteboard inside this call"
          >
            <PenTool className="w-3 h-3" />
            <span>{showWhiteboard ? 'Hide Board' : 'Whiteboard'}</span>
            {remoteDrawingAlert && !showWhiteboard && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            )}
          </button>

          {user && (
            <button
              type="button"
              onClick={() => {
                setIsEditingMeeting(!isEditingMeeting);
                setMeetingInput(meetingUrl);
              }}
              className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-neutral-200 border border-white/10 font-semibold inline-flex items-center gap-1 transition-all cursor-pointer text-xs"
              title="Set optional external Google Meet, Zoom or Discord link"
            >
              <Edit2 className="w-3 h-3 text-amber-400" />
              <span className="hidden sm:inline">
                {isEditingMeeting ? 'Cancel' : hasCustomExternalLink ? 'Edit Link' : 'Add Meet/Zoom'}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={handleCopyLink}
            className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-neutral-200 border border-white/10 font-semibold inline-flex items-center gap-1 transition-all cursor-pointer"
            title="Copy room invite link for classmates"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? 'Copied!' : 'Invite'}</span>
          </button>

          <button
            type="button"
            onClick={handleToggleFullscreen}
            className={`px-2.5 py-1.5 rounded-xl font-semibold inline-flex items-center gap-1 border transition-all cursor-pointer ${
              isFullscreen
                ? 'bg-amber-400 text-black border-amber-300'
                : 'bg-white/10 hover:bg-white/20 text-neutral-200 border-white/10'
            }`}
            title={isFullscreen ? 'Exit Fullscreen (Esc)' : 'Enter Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
            <span>{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
          </button>

          <a
            href={effectiveMeetingUrl}
            target="_blank"
            rel="noreferrer"
            className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-emerald-300 border border-emerald-500/30 font-bold inline-flex items-center gap-1 transition-all cursor-pointer"
            title={`Open external ${platformName} in new tab`}
          >
            <span className="hidden sm:inline">{platformName}</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Inline External Link Editor */}
      {isEditingMeeting && (
        <form
          onSubmit={handleSaveMeetingUrl}
          className="px-4 py-2 bg-emerald-950/40 border-b border-emerald-500/30 flex items-center gap-2 text-xs shrink-0"
        >
          <LinkIcon className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <input
            type="url"
            value={meetingInput}
            onChange={(e) => setMeetingInput(e.target.value)}
            placeholder={`Paste custom ${platformName} URL (e.g. https://meet.google.com/abc-defg-hij)...`}
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

      {/* Optional Persistent Media Warning Banner */}
      {mediaNotice && (
        <div className="px-4 py-1.5 bg-amber-500/15 border-b border-amber-500/30 text-amber-200 text-[11px] flex items-center justify-between gap-2 shrink-0">
          <span className="flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>{mediaNotice}</span>
          </span>
          <button
            type="button"
            onClick={() => setMediaNotice('')}
            className="text-amber-300 hover:text-white font-bold cursor-pointer shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Video & Collaborative Whiteboard Stage */}
      <div className="relative flex-1 min-h-0 bg-gradient-to-b from-neutral-950 via-neutral-900/90 to-black p-3 sm:p-4 overflow-y-auto flex flex-col">
        {/* Live Permission & Action Toast Notification */}
        {mediaToast && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40 max-w-[92%] sm:max-w-lg">
            <div
              className={`px-3.5 py-2 rounded-2xl border backdrop-blur-xl shadow-2xl text-xs font-semibold flex items-center gap-2 ${
                mediaToast.tone === 'success'
                  ? 'bg-emerald-950/90 border-emerald-400/45 text-emerald-100'
                  : mediaToast.tone === 'warning'
                  ? 'bg-amber-950/90 border-amber-400/45 text-amber-100'
                  : mediaToast.tone === 'error'
                  ? 'bg-rose-950/90 border-rose-400/45 text-rose-100'
                  : 'bg-neutral-900/95 border-white/20 text-neutral-100'
              }`}
            >
              {mediaToast.tone === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : mediaToast.tone === 'warning' || mediaToast.tone === 'error' ? (
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              ) : (
                <Info className="w-4 h-4 text-cyan-400 shrink-0" />
              )}
              <span className="leading-snug">{mediaToast.message}</span>
              <button
                type="button"
                onClick={() => setMediaToast(null)}
                className="p-0.5 rounded-lg hover:bg-white/10 text-neutral-300 hover:text-white cursor-pointer shrink-0"
                aria-label="Dismiss notification"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Teammate Drawing Alert Banner when Whiteboard is closed */}
        {remoteDrawingAlert && !showWhiteboard && (
          <div className="mb-2.5 px-3.5 py-2 rounded-xl bg-emerald-500/15 border border-emerald-400/35 text-xs text-emerald-200 flex items-center justify-between gap-2 shrink-0">
            <span className="flex items-center gap-2 font-semibold">
              <PenTool className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>A squad mate is drawing live on the shared Whiteboard!</span>
            </span>
            <button
              type="button"
              onClick={handleToggleWhiteboard}
              className="px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-[11px] cursor-pointer shrink-0 transition-all"
            >
              Open Whiteboard
            </button>
          </div>
        )}

        {/* Floating Live Emoji Reactions */}
        {reactions.length > 0 && (
          <div className="pointer-events-none absolute bottom-16 right-5 z-30 flex flex-col-reverse gap-2 items-end">
            {reactions.map((r) => (
              <div
                key={r.id}
                className="px-3 py-1 rounded-full bg-black/80 border border-white/15 text-xs text-white flex items-center gap-1.5 shadow-xl animate-bounce"
              >
                <span className="text-base">{r.emoji}</span>
                <span className="text-[11px] text-neutral-300 font-semibold">{r.userName}</span>
              </div>
            ))}
          </div>
        )}

        {showWhiteboard ? (
          /* Built-in Split-Screen Live Collaborative Whiteboard + Active Video Filmstrip */
          <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-3">
            <div className="flex-1 min-h-[240px] min-w-0 flex flex-col">
              <Whiteboard
                socket={socket}
                squadId={squad?.id}
                compact
                className="h-full w-full"
              />
            </div>

            {inCall && (
              <div className="lg:w-64 xl:w-72 shrink-0 flex lg:flex-col gap-2 overflow-x-auto lg:overflow-y-auto pb-1 lg:pb-0">
                <VideoTile
                  stream={localStream}
                  name={user?.name || 'You'}
                  avatar={user?.avatar}
                  isLocal
                  compact
                  audioMuted={audioMuted}
                  videoMuted={videoMuted}
                  isScreenSharing={isScreenSharing}
                  isHandRaised={isHandRaised}
                />
                {peerEntries.map(([peerSocketId, peer]) => (
                  <VideoTile
                    key={peerSocketId}
                    stream={peer.stream}
                    name={peer.user?.name || 'Squad Mate'}
                    avatar={peer.user?.avatar}
                    compact
                    audioMuted={peer.audioMuted}
                    videoMuted={peer.videoMuted}
                    isScreenSharing={peer.isScreenSharing}
                    isHandRaised={peer.isHandRaised}
                  />
                ))}
                {peerEntries.length === 0 && (
                  <div className="min-w-[165px] lg:min-w-0 p-3 rounded-2xl border border-dashed border-white/15 bg-white/[0.02] flex flex-col items-center justify-center text-center gap-1.5 shrink-0">
                    <span className="text-[11px] font-semibold text-neutral-300">
                      Invite squad mates to draw together
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/35 text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer"
                    >
                      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span>{copied ? 'Copied!' : 'Copy Link'}</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : !inCall ? (
          /* Pre-Join Lobby (100% Native StudySquad WebRTC — Zero 3rd-party login or 5-min Jitsi cutoff!) */
          <div className="flex-1 flex flex-col items-center justify-center text-center max-w-lg mx-auto px-4 py-2 space-y-3 sm:space-y-3.5">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 border border-emerald-500/35 flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-500/10">
              <Video className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>

            <div className="space-y-1">
              <h4 className="text-base sm:text-xl font-bold text-white">
                Study Together Live — {squad?.name}
              </h4>
              <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
                Instant peer-to-peer HD video, voice, live collaborative whiteboard, fullscreen view &amp; screen sharing inside your room.
              </p>
            </div>

            {/* Live Device Permission Indicators */}
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {renderPermissionPill('Camera', camPermission)}
              {renderPermissionPill('Microphone', micPermission)}
            </div>
            {(camPermission === 'denied' || micPermission === 'denied') && (
              <p className="text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-xl max-w-md">
                Browser permission blocked: click the camera/lock icon in your address bar, select <strong>Allow</strong>, then click Join.
              </p>
            )}

            <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3">
              <button
                type="button"
                disabled={isJoining}
                onClick={() => handleJoinCall(true)}
                className="px-5 py-2.5 sm:py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-neutral-950 font-extrabold text-xs sm:text-sm inline-flex items-center gap-2 shadow-lg shadow-emerald-500/25 transition-all cursor-pointer disabled:opacity-50"
              >
                <PhoneCall className="w-4 h-4" />
                <span>{isJoining ? 'Connecting...' : 'Join with Camera & Mic'}</span>
              </button>

              <button
                type="button"
                disabled={isJoining}
                onClick={() => handleJoinCall(false)}
                className="px-4 py-2.5 sm:py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-white border border-white/15 font-bold text-xs sm:text-sm inline-flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                <Mic className="w-4 h-4 text-emerald-400" />
                <span>Join Voice Only (Cam Off)</span>
              </button>
            </div>

            <div className="flex items-center justify-center gap-3 sm:gap-4 text-[11px] text-neutral-400 flex-wrap">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Encrypted WebRTC P2P
              </span>
              <span className="flex items-center gap-1">
                <PenTool className="w-3.5 h-3.5 text-cyan-400" /> Built-In Whiteboard
              </span>
              <a
                href={jitsiFallbackUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-emerald-300/90 hover:text-emerald-200 underline underline-offset-2"
              >
                <span>Or open Jitsi Meet</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        ) : (
          /* Active Multi-Student Video Grid */
          <div className={`grid ${gridColsClass} gap-3 flex-1 min-h-0 auto-rows-fr`}>
            <VideoTile
              stream={localStream}
              name={user?.name || 'You'}
              avatar={user?.avatar}
              isLocal
              audioMuted={audioMuted}
              videoMuted={videoMuted}
              isScreenSharing={isScreenSharing}
              isHandRaised={isHandRaised}
              isPinned={pinnedId === 'local'}
              onTogglePin={() => setPinnedId((p) => (p === 'local' ? null : 'local'))}
            />

            {peerEntries.map(([peerSocketId, peer]) => (
              <VideoTile
                key={peerSocketId}
                stream={peer.stream}
                name={peer.user?.name || 'Squad Mate'}
                avatar={peer.user?.avatar}
                audioMuted={peer.audioMuted}
                videoMuted={peer.videoMuted}
                isScreenSharing={peer.isScreenSharing}
                isHandRaised={peer.isHandRaised}
                isPinned={pinnedId === peerSocketId}
                onTogglePin={() =>
                  setPinnedId((p) => (p === peerSocketId ? null : peerSocketId))
                }
              />
            ))}

            {peerEntries.length === 0 && (
              <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-4 sm:p-6 flex flex-col items-center justify-center text-center min-h-[140px] h-full space-y-2.5">
                <Users className="w-7 h-7 text-emerald-400/70" />
                <p className="text-xs sm:text-sm font-bold text-neutral-200">
                  You’re live in the call! Waiting for squad mates to join…
                </p>
                <p className="text-[11px] text-neutral-400 max-w-xs">
                  Share the invite link so classmates can hop in, or open the built-in Whiteboard to draw together!
                </p>
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/35 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-all"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Invite Link Copied!' : 'Copy Squad Invite Link'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleToggleWhiteboard}
                    className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/15 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-all"
                  >
                    <PenTool className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Open Whiteboard</span>
                  </button>
                </div>
                <a
                  href={jitsiFallbackUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-neutral-400 hover:text-emerald-300 inline-flex items-center gap-1 pt-0.5 transition-colors"
                >
                  <span>Strict college Wi-Fi? Open Jitsi Meet</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Call Dock (Active Call Controls or Footer Info) */}
      {inCall ? (
        <div className="px-3 sm:px-4 py-2.5 border-t border-white/10 bg-neutral-900/95 flex items-center justify-center gap-1.5 sm:gap-2.5 flex-wrap shrink-0 relative">
          <button
            type="button"
            onClick={handleToggleMic}
            className={`px-3 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 border transition-all cursor-pointer ${
              audioMuted
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30'
                : 'bg-white/10 text-white border-white/15 hover:bg-white/20'
            }`}
          >
            {audioMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-emerald-400" />}
            <span className="hidden sm:inline">{audioMuted ? 'Unmute' : 'Mic On'}</span>
          </button>

          <button
            type="button"
            onClick={handleToggleCamera}
            className={`px-3 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 border transition-all cursor-pointer ${
              videoMuted && !isScreenSharing
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30'
                : 'bg-white/10 text-white border-white/15 hover:bg-white/20'
            }`}
          >
            {videoMuted && !isScreenSharing ? (
              <VideoOff className="w-4 h-4" />
            ) : (
              <Video className="w-4 h-4 text-emerald-400" />
            )}
            <span className="hidden sm:inline">
              {videoMuted && !isScreenSharing ? 'Cam Off' : 'Cam On'}
            </span>
          </button>

          <button
            type="button"
            onClick={handleToggleScreenShare}
            className={`px-3 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 border transition-all cursor-pointer ${
              isScreenSharing
                ? 'bg-emerald-500 text-black border-emerald-400 shadow-md shadow-emerald-500/20'
                : 'bg-white/10 text-white border-white/15 hover:bg-white/20'
            }`}
          >
            <MonitorUp className="w-4 h-4" />
            <span className="hidden sm:inline">
              {isScreenSharing ? 'Stop Share' : 'Share Screen'}
            </span>
          </button>

          <button
            type="button"
            onClick={handleToggleWhiteboard}
            className={`px-3 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 border transition-all cursor-pointer ${
              showWhiteboard
                ? 'bg-emerald-500 text-black border-emerald-400 shadow-md shadow-emerald-500/20'
                : 'bg-white/10 text-white border-white/15 hover:bg-white/20'
            }`}
            title="Toggle collaborative Whiteboard inside this call"
          >
            <PenTool className="w-4 h-4" />
            <span className="hidden sm:inline">
              {showWhiteboard ? 'Close Board' : 'Whiteboard'}
            </span>
          </button>

          <button
            type="button"
            onClick={handleToggleHand}
            className={`px-3 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 border transition-all cursor-pointer ${
              isHandRaised
                ? 'bg-amber-400 text-black border-amber-300'
                : 'bg-white/10 text-white border-white/15 hover:bg-white/20'
            }`}
            title="Raise hand"
          >
            <Hand className="w-4 h-4" />
            <span className="hidden lg:inline">{isHandRaised ? 'Lower Hand' : 'Raise Hand'}</span>
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowReactionsBar((s) => !s)}
              className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/15 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
              title="Send live reaction"
            >
              <Smile className="w-4 h-4 text-amber-300" />
              <span className="hidden lg:inline">React</span>
            </button>

            {showReactionsBar && (
              <div className="absolute bottom-12 left-1/2 -translate-x-1/2 px-2.5 py-1.5 rounded-2xl bg-neutral-900 border border-white/20 shadow-2xl flex items-center gap-1.5 z-40">
                {REACTION_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => handleSendReaction(emoji)}
                    className="text-lg hover:scale-125 transition-transform px-1 cursor-pointer"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleToggleFullscreen}
            className={`px-3 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 border transition-all cursor-pointer ${
              isFullscreen
                ? 'bg-amber-400 text-black border-amber-300'
                : 'bg-white/10 text-white border-white/15 hover:bg-white/20'
            }`}
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Call'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            <span className="hidden md:inline">{isFullscreen ? 'Exit' : 'Fullscreen'}</span>
          </button>

          <button
            type="button"
            onClick={() => cleanupCall(true)}
            className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs inline-flex items-center gap-1.5 shadow-md cursor-pointer transition-all"
          >
            <PhoneOff className="w-4 h-4" />
            <span>Leave Call</span>
          </button>
        </div>
      ) : (
        <div className="px-4 py-2 border-t border-white/10 bg-white/5 flex items-center justify-between text-[11px] text-neutral-400 flex-wrap gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>
              Built-in Unlimited WebRTC Video + Live Whiteboard + External{' '}
              <strong className="text-emerald-300 font-mono">{platformName}</strong>
            </span>
          </div>
          <span>
            Tip: Click Fullscreen or Whiteboard anytime — everyone in the squad stays synced!
          </span>
        </div>
      )}
    </div>
  );
});

export default InRoomVideo;
