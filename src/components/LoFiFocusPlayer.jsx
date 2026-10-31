import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Play, Pause, Music, CloudRain, Wind, Brain, Sparkles } from 'lucide-react';

// Preset sound modes
const SOUND_MODES = [
  {
    id: 'lofi',
    name: 'Lo-Fi Chill',
    icon: Music,
    color: 'from-purple-500 to-indigo-500',
    type: 'stream',
    url: 'https://streams.ilovemusic.de/iloveradio17.mp3',
    fallbackFilterFreq: 550,
    desc: 'Relaxing beats to study and focus to',
  },
  {
    id: 'rain',
    name: 'Gentle Rain',
    icon: CloudRain,
    color: 'from-blue-500 to-cyan-500',
    type: 'synth-noise',
    filterFreq: 800,
    desc: 'Soft continuous rain ambience',
  },
  {
    id: 'binaural',
    name: 'Alpha Focus 14Hz',
    icon: Brain,
    color: 'from-emerald-500 to-teal-500',
    type: 'binaural',
    baseFreq: 220,
    beatFreq: 14,
    desc: 'Science-backed brainwave entrainment',
  },
  {
    id: 'wind',
    name: 'Deep Forest',
    icon: Wind,
    color: 'from-teal-500 to-emerald-600',
    type: 'synth-noise',
    filterFreq: 400,
    desc: 'Subtle calm breeze & nature atmosphere',
  },
];

export default function LoFiFocusPlayer({ className = '' }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedMode, setSelectedMode] = useState(SOUND_MODES[0].id);
  const [volume, setVolume] = useState(0.5);
  const [isMuted, setIsMuted] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [usingSynthFallback, setUsingSynthFallback] = useState(false);

  // Audio nodes & references
  const audioElRef = useRef(null);
  const audioCtxRef = useRef(null);
  const gainNodeRef = useRef(null);
  const synthNodesRef = useRef([]);

  // Initialize or resume AudioContext
  const getAudioContext = () => {
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        audioCtxRef.current = new AudioCtx();
        const gain = audioCtxRef.current.createGain();
        gain.gain.value = isMuted ? 0 : volume;
        gain.connect(audioCtxRef.current.destination);
        gainNodeRef.current = gain;
      }
    }
    if (audioCtxRef.current?.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {});
    }
    return audioCtxRef.current;
  };

  // Stop synthetic audio nodes
  const stopSynthesizers = () => {
    synthNodesRef.current.forEach((node) => {
      try {
        if (node.stop) node.stop();
        if (node.disconnect) node.disconnect();
      } catch {
        // ignore already stopped nodes
      }
    });
    synthNodesRef.current = [];
  };

  // Synthesize realistic rain / wind / warm study pink noise buffer
  const startNoiseSynth = (filterFreq) => {
    const ctx = getAudioContext();
    if (!ctx || !gainNodeRef.current) return;

    stopSynthesizers();

    const bufferSize = ctx.sampleRate * 2;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }

    const pinkNoise = ctx.createBufferSource();
    pinkNoise.buffer = noiseBuffer;
    pinkNoise.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;

    pinkNoise.connect(filter);
    filter.connect(gainNodeRef.current);
    pinkNoise.start();

    synthNodesRef.current.push(pinkNoise, filter);
  };

  // Synthesize binaural beat
  const startBinauralSynth = (baseFreq, beatFreq) => {
    const ctx = getAudioContext();
    if (!ctx || !gainNodeRef.current) return;

    stopSynthesizers();

    const oscLeft = ctx.createOscillator();
    const oscRight = ctx.createOscillator();
    oscLeft.type = 'sine';
    oscRight.type = 'sine';
    oscLeft.frequency.value = baseFreq;
    oscRight.frequency.value = baseFreq + beatFreq;

    const merger = ctx.createChannelMerger(2);
    oscLeft.connect(merger, 0, 0);
    oscRight.connect(merger, 0, 1);

    const softGain = ctx.createGain();
    softGain.gain.value = 0.15;
    merger.connect(softGain);
    softGain.connect(gainNodeRef.current);

    oscLeft.start();
    oscRight.start();

    synthNodesRef.current.push(oscLeft, oscRight, merger, softGain);
  };

  // Play stream with automatic local synthesizer fallback if campus firewall blocks radio
  const playMode = (mode) => {
    if (!mode) return;
    setUsingSynthFallback(false);

    if (mode.type === 'stream') {
      stopSynthesizers();
      if (!audioElRef.current) {
        // Intentionally omit crossOrigin='anonymous' so third-party MP3 radio streams play without CORS rejection
        audioElRef.current = new Audio();
        audioElRef.current.preload = 'none';
      }
      audioElRef.current.src = mode.url;
      audioElRef.current.volume = isMuted ? 0 : volume;

      const fallbackToLocalSynth = () => {
        try {
          audioElRef.current?.pause();
        } catch {
          // ignore
        }
        setUsingSynthFallback(true);
        startNoiseSynth(mode.fallbackFilterFreq || 550);
      };

      audioElRef.current.onerror = fallbackToLocalSynth;
      audioElRef.current.play().catch((err) => {
        console.warn('External stream unavailable, activating local ambient synth:', err?.message);
        fallbackToLocalSynth();
      });
    } else if (mode.type === 'synth-noise') {
      if (audioElRef.current) {
        audioElRef.current.onerror = null;
        audioElRef.current.pause();
      }
      startNoiseSynth(mode.filterFreq);
    } else if (mode.type === 'binaural') {
      if (audioElRef.current) {
        audioElRef.current.onerror = null;
        audioElRef.current.pause();
      }
      startBinauralSynth(mode.baseFreq, mode.beatFreq);
    }
  };

  // Stop everything
  const stopAllSound = () => {
    if (audioElRef.current) {
      audioElRef.current.onerror = null;
      audioElRef.current.pause();
    }
    stopSynthesizers();
    setUsingSynthFallback(false);
  };

  // Handle play / pause toggle
  const togglePlay = () => {
    if (isPlaying) {
      stopAllSound();
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      const mode = SOUND_MODES.find((m) => m.id === selectedMode) || SOUND_MODES[0];
      playMode(mode);
    }
  };

  // Switch sound mode
  const handleSelectMode = (modeId) => {
    setSelectedMode(modeId);
    if (isPlaying) {
      const mode = SOUND_MODES.find((m) => m.id === modeId) || SOUND_MODES[0];
      playMode(mode);
    }
  };

  // Update volume
  const handleVolumeChange = (newVol) => {
    setVolume(newVol);
    if (isMuted && newVol > 0) setIsMuted(false);
    if (audioElRef.current) {
      audioElRef.current.volume = newVol;
    }
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = newVol;
    }
  };

  // Toggle mute
  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    const targetVol = nextMuted ? 0 : volume;
    if (audioElRef.current) {
      audioElRef.current.volume = targetVol;
    }
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = targetVol;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAllSound();
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        try {
          audioCtxRef.current.close();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  const activeModeObj = SOUND_MODES.find((m) => m.id === selectedMode) || SOUND_MODES[0];
  const ActiveIcon = activeModeObj.icon;

  return (
    <div
      className={`relative rounded-2xl bg-gradient-to-r from-neutral-900/90 via-purple-950/20 to-neutral-900/90 border border-purple-500/20 p-3 sm:p-4 transition-all shadow-xl backdrop-blur-xl ${className}`}
    >
      <div className="flex items-center justify-between gap-3">
        {/* Left: Animated Icon + Title */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={togglePlay}
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all cursor-pointer shadow-lg ${
              isPlaying
                ? 'bg-gradient-to-tr from-purple-500 to-indigo-500 text-white shadow-purple-500/30 animate-pulse'
                : 'bg-white/10 hover:bg-white/20 text-neutral-300'
            }`}
            title={isPlaying ? 'Pause Focus Beats' : 'Play Focus Beats'}
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Focus Ambience
              </span>
              {isPlaying && (
                <span className="flex items-center gap-0.5 h-3">
                  <span className="w-0.5 h-3 bg-purple-400 rounded-full animate-[bounce_1s_infinite_100ms]" />
                  <span className="w-0.5 h-2 bg-purple-300 rounded-full animate-[bounce_1s_infinite_200ms]" />
                  <span className="w-0.5 h-3.5 bg-indigo-400 rounded-full animate-[bounce_1s_infinite_300ms]" />
                </span>
              )}
              {isPlaying && usingSynthFallback && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-200 border border-purple-400/30">
                  Local Synth
                </span>
              )}
            </div>
            <p className="text-xs font-semibold text-white truncate flex items-center gap-1.5 mt-0.5">
              <ActiveIcon className="w-3.5 h-3.5 text-purple-300 shrink-0" />
              <span>{activeModeObj.name}</span>
              <span className="text-[10px] text-neutral-400 hidden sm:inline">• {activeModeObj.desc}</span>
            </p>
          </div>
        </div>

        {/* Right: Sound Selector + Volume Slider */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Quick preset selector buttons */}
          <div className="hidden md:flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
            {SOUND_MODES.map((mode) => {
              const Icon = mode.icon;
              const isSelected = selectedMode === mode.id;
              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => handleSelectMode(mode.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-purple-500/30 text-purple-200 border border-purple-400/40 shadow-sm'
                      : 'text-neutral-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  <span>{mode.name.split(' ')[0]}</span>
                </button>
              );
            })}
          </div>

          {/* Volume Control */}
          <div className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1.5 rounded-xl border border-white/10">
            <button
              type="button"
              onClick={toggleMute}
              className="text-neutral-400 hover:text-white transition-colors cursor-pointer"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted || volume === 0 ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-purple-300" />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              className="w-14 sm:w-20 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-purple-400"
              title={`Volume: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
            />
          </div>

          {/* Mobile Sound Dropdown / Expand Toggle */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="md:hidden p-2 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 text-xs border border-white/10 cursor-pointer"
            title="Choose Sound Mode"
          >
            <ActiveIcon className="w-4 h-4 text-purple-300" />
          </button>
        </div>
      </div>

      {/* Mobile Drawer when expanded */}
      {isExpanded && (
        <div className="md:hidden mt-3 pt-3 border-t border-white/10 grid grid-cols-2 gap-2">
          {SOUND_MODES.map((mode) => {
            const Icon = mode.icon;
            const isSelected = selectedMode === mode.id;
            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => {
                  handleSelectMode(mode.id);
                  setIsExpanded(false);
                }}
                className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-purple-500/30 text-purple-200 border border-purple-400/40'
                    : 'bg-white/5 text-neutral-400 hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5 text-purple-400" />
                <span className="truncate">{mode.name}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
