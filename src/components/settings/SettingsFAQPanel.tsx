// ═══════════════════════════════════════════════════════════════════════
//  SETTINGS FAQ & TROUBLESHOOTING COMMAND DECK
//  ---------------------------------------------------------------------
//  High-density, interactive diagnostic and problem-solution catalog.
//  Empowers typists to solve issues with audio latency, GPU frame drops,
//  multiplayer WebSockets, AI Smart Engine quotas, and cloud sync.
//  Dynamic theme binding: strictly rgb/rgba(${theme.glowPrimary}).
// ═══════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  HelpCircle,
  Volume2,
  Check,
  ArrowRight,
  Search,
  Cpu,
  Wifi,
  ChevronDown,
  Bug,
  Activity,
  X,
  RotateCw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Theme } from '@/data/constants';
import { computeDisplayRefreshRate, getNativeScreenRefreshRate } from '@/lib/displayDiagnostics';

export type FAQCategory =
  | 'all'
  | 'audio'
  | 'performance'
  | 'typing'
  | 'multiplayer'
  | 'ai'
  | 'sync';

interface FAQItem {
  id: string;
  category: FAQCategory;
  categoryLabel: string;
  question: string;
  tag: string;
  cause: string;
  solutions: string[];
  actionType?: 'audio' | 'shaders' | 'system' | 'ai' | 'appearance' | 'report';
  actionLabel?: string;
}

interface SettingsFAQPanelProps {
  theme: Theme;
  onNavigateTab: (tab: 'visuals' | 'shaders' | 'gameplay' | 'system' | 'ai' | 'usage' | 'faq' | 'report') => void;
  onPlayPreviewSound?: (profileKey?: string) => void;
  soundProfile?: string;
}

export const SettingsFAQPanel: React.FC<SettingsFAQPanelProps> = ({
  theme,
  onNavigateTab,
  onPlayPreviewSound,
  soundProfile = 'raindrops',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<FAQCategory>('all');
  const [expandedId, setExpandedId] = useState<string | null>('audio-missing');

  // ─── Hardware & Diagnostics Telemetry ──────────────────────────────
  const [audioState, setAudioState] = useState<'running' | 'suspended' | 'unavailable'>('suspended');
  const [gpuRenderer, setGpuRenderer] = useState<string>('Detecting...');
  const [detectedHz, setDetectedHz] = useState<number | null>(() => getNativeScreenRefreshRate());
  const [frameDeltaMs, setFrameDeltaMs] = useState<number | null>(() => {
    const native = getNativeScreenRefreshRate();
    return native ? Number((1000 / native).toFixed(1)) : null;
  });
  const [isCalibratingHz, setIsCalibratingHz] = useState<boolean>(false);
  const calibrationRef = useRef<{ cancel: () => void } | null>(null);
  const [storageStatus, setStorageStatus] = useState<'ok' | 'full' | 'restricted'>('ok');
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  // Probe audio context
  const checkAudioContext = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) {
        setAudioState('unavailable');
        return;
      }
      const ctx = new AudioCtx();
      setAudioState(ctx.state as 'running' | 'suspended');
      ctx.close();
    } catch {
      setAudioState('unavailable');
    }
  }, []);

  // Unlock audio test
  const handleUnlockAudio = () => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        if (ctx.state === 'suspended') {
          ctx.resume().then(() => {
            setAudioState('running');
            ctx.close();
          });
        } else {
          setAudioState('running');
          ctx.close();
        }
      }
      onPlayPreviewSound?.(soundProfile);
    } catch {
      /* ignore */
    }
  };

  // Calibrate Display Refresh Rate via VSync interval clustering
  const runHzCalibration = useCallback(() => {
    if (calibrationRef.current) {
      calibrationRef.current.cancel();
      calibrationRef.current = null;
    }

    setIsCalibratingHz(true);
    let rafId: number;
    let prevTime = 0;
    const deltas: number[] = [];
    let warmupCount = 0;
    let cancelled = false;

    // Safety fallback: if 1500ms elapses and we have partial frames (e.g. throttled or power-saver mode)
    const timeoutId = setTimeout(() => {
      if (!cancelled) {
        if (deltas.length >= 10) {
          const result = computeDisplayRefreshRate(deltas);
          if (result) {
            setDetectedHz(result.hz);
            setFrameDeltaMs(result.deltaMs);
          }
        }
        setIsCalibratingHz(false);
      }
    }, 1500);

    const measure = (now: number) => {
      if (cancelled) return;

      if (!document.hidden) {
        if (prevTime > 0) {
          const delta = now - prevTime;
          // Discard first 5 warmup frames to let thread and render settle
          if (warmupCount < 5) {
            warmupCount++;
          } else if (delta >= 1.5 && delta <= 50) {
            deltas.push(delta);
          }
        }
        prevTime = now;

        // Collect 40 valid samples for statistical certainty
        if (deltas.length >= 40) {
          clearTimeout(timeoutId);
          const result = computeDisplayRefreshRate(deltas);
          if (result) {
            setDetectedHz(result.hz);
            setFrameDeltaMs(result.deltaMs);
          }
          setIsCalibratingHz(false);
          return;
        }
      }

      rafId = requestAnimationFrame(measure);
    };

    rafId = requestAnimationFrame(measure);

    const cancel = () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      clearTimeout(timeoutId);
      setIsCalibratingHz(false);
    };

    calibrationRef.current = { cancel };
    return cancel;
  }, []);

  // Probe WebGL & System Health
  useEffect(() => {
    checkAudioContext();

    // Online/offline listener
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // WebGL GPU Probe
    try {
      const canvas = document.createElement('canvas');
      const gl = (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
      if (gl) {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
          const clean = renderer ? renderer.replace(/ANGLE \((.*)\)/, '$1').slice(0, 38) : 'Hardware Accelerated';
          setGpuRenderer(clean);
        } else {
          setGpuRenderer('Hardware WebGL Supported');
        }
      } else {
        setGpuRenderer('Software Fallback (WebGL Off)');
      }
    } catch {
      setGpuRenderer('Hardware Canvas Fallback');
    }

    // Refresh rate estimation: delay 150ms after modal open so layout/animation settling doesn't drop frames
    const timer = setTimeout(() => {
      runHzCalibration();
    }, 150);

    // Test storage integrity
    try {
      const testKey = '__typenova_storage_probe__';
      localStorage.setItem(testKey, '1');
      localStorage.removeItem(testKey);
      setStorageStatus('ok');
    } catch {
      setStorageStatus('restricted');
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearTimeout(timer);
      if (calibrationRef.current) {
        calibrationRef.current.cancel();
      }
    };
  }, [checkAudioContext, runHzCalibration, soundProfile]);

  // ─── FAQ Catalog ──────────────────────────────────────────────────
  const faqCatalog: FAQItem[] = useMemo(
    () => [
      {
        id: 'audio-missing',
        category: 'audio',
        categoryLabel: 'Audio & Switches',
        tag: 'WEB AUDIO / AUTOPLAY',
        question: 'Why is there no keystroke sound when I type?',
        cause:
          'Modern browsers strictly block Web Audio output until the user interacts with the page via a click or keypress. Also, your browser tab or switch profile may be set to low volume.',
        solutions: [
          'Click anywhere inside the app or typing box to grant browser audio authorization.',
          'Verify your browser tab is not muted (right-click the tab -> "Unmute tab").',
          'Switch acoustics profile in Appearance & Audio tab to confirm synthetic switch clacks are audible.',
          'If using a corporate or managed browser, ensure HTML5 Web Audio is enabled.',
        ],
        actionType: 'audio',
        actionLabel: 'Test Switch Audio',
      },
      {
        id: 'audio-latency',
        category: 'audio',
        categoryLabel: 'Audio & Switches',
        tag: 'BLUETOOTH LATENCY',
        question: 'Why do switch sounds feel slightly delayed after my keypress?',
        cause:
          'Standard Bluetooth headphones (using SBC or AAC codecs) introduce 150ms to 250ms of audio buffer latency between your system and the speaker drivers.',
        solutions: [
          'For esports-level typing, use low-latency 2.4GHz wireless headsets or wired headphones (0ms latency).',
          'If on Windows, ensure "Spatial sound" and audio enhancements are turned off in Windows Sound Properties to reduce processing delay.',
          'In Settings -> Appearance & Audio, try the "Raindrops" or "Clicky" switches which have instant attack envelopes.',
        ],
        actionType: 'appearance',
        actionLabel: 'Configure Sound Profile',
      },
      {
        id: 'perf-fps',
        category: 'performance',
        categoryLabel: 'Performance & FPS',
        tag: 'GPU SHADERS / 144HZ+',
        question: 'Typing feels floaty or frame rate drops during tests. How do I fix it?',
        cause:
          'Real-time WebGL fluid shaders render millions of raymarched fragments per second. On laptops or integrated GPUs (Intel UHD / Iris), this can saturate fill-rate.',
        solutions: [
          'Switch the Background Shader to "Deep Void" in the Shaders & FX tab (reduces GPU utilization to near 0%).',
          'Enable Hardware Acceleration in your browser settings (chrome://settings/system -> "Use graphics acceleration when available").',
          'Reduce shader animation flow speed to "Slow" (0.5x) or set Mouse Physics to "Calm".',
          'On multi-monitor setups, ensure your browser window is running on your high-refresh-rate display.',
        ],
        actionType: 'shaders',
        actionLabel: 'Open Shader Controls',
      },
      {
        id: 'typing-restart',
        category: 'typing',
        categoryLabel: 'Typing & Inputs',
        tag: 'KEYBOARD SHORTCUTS',
        question: 'How do I quickly restart a test or ready up without using the mouse?',
        cause:
          'Reaching for the mouse disrupts your typing posture and cadence.',
        solutions: [
          'Press Tab + Enter or Esc to instantly restart any test in 0ms.',
          'Press Space at the ready prompt to arm the next test run immediately.',
          'Press Ctrl + K (or Cmd + K) to trigger the universal command palette from anywhere.',
          'Press Ctrl + Backspace to erase the entire previous word rather than deleting single characters.',
        ],
        actionType: 'system',
        actionLabel: 'View Input Safeguards',
      },
      {
        id: 'typing-backspace',
        category: 'typing',
        categoryLabel: 'Typing & Inputs',
        tag: 'MOTOR CONTROL',
        question: 'How does backspace locking and sudden death work?',
        cause:
          'Competitive modes enforce precision discipline by preventing reckless mash-and-backspace habits.',
        solutions: [
          'Standard mode allows full backspace editing to correct typos with zero penalties.',
          'Overclocked & Sudden Death modifiers (in Gameplay tab) immediately fail the run on your first slip.',
          'Sticky Keys mode requires pressing the exact correct key before you can advance past a mistake.',
        ],
        actionType: 'system',
        actionLabel: 'Configure Modifiers',
      },
      {
        id: 'multiplayer-disconnect',
        category: 'multiplayer',
        categoryLabel: 'Multiplayer & Rooms',
        tag: 'WEBSOCKET REALTIME',
        question: 'Why did my multiplayer room disconnect or rival ghost stop moving?',
        cause:
          'Ad-blockers (e.g. uBlock Origin, Brave Shields) or strict VPNs sometimes misidentify Supabase Realtime WebSocket heartbeats as trackers and close the socket.',
        solutions: [
          'Add TypeNova to your ad-blocker whitelist to permit secure WebSocket duplexing (wss://).',
          'Click "Refresh" in the Room Browser or re-enter the 6-character room code.',
          'If racing an asynchronous rival ghost, verified curves require an active internet connection to download.',
        ],
        actionType: 'report',
        actionLabel: 'Report Room Issue',
      },
      {
        id: 'ai-offline',
        category: 'ai',
        categoryLabel: 'AI Smart Engine',
        tag: 'ARU / BYOK QUOTAS',
        question: 'Aru Coach says "Aru is offline" or report generation is delayed.',
        cause:
          'The free public AI tier enforces safety rate limits during peak global traffic. When offline, procedural algorithmic generators automatically take over.',
        solutions: [
          'Add your own free API key in the Smart Engine tab (Groq provides free 300+ tokens/sec Llama 3 models; Google Gemini provides free 15 RPM).',
          "Your API keys are stored 100% locally in your browser's private storage vault and never touch our servers.",
          'Procedural smart drills and weak-key algorithms work completely offline without needing any AI server.',
        ],
        actionType: 'ai',
        actionLabel: 'Open Smart Engine Tab',
      },
      {
        id: 'sync-loss',
        category: 'sync',
        categoryLabel: 'Accounts & Sync',
        tag: 'CLOUD BACKUP / GUEST',
        question: 'Will I lose my stats or badges if I play in Guest mode?',
        cause:
          'Guest mode writes your best runs, key heatmap, and streak to browser localStorage. Clearing browser cookies or using Incognito wipes this storage.',
        solutions: [
          'Sign in with Google to enable automatic multi-device cloud synchronization via Supabase.',
          'When signing in after playing as a guest, TypeNova automatically migrates your local history to your cloud account.',
          'Your data is protected under our Zero-Telemetry policy — raw keystrokes are never saved remotely.',
        ],
        actionType: 'system',
        actionLabel: 'Manage Data Storage',
      },
      {
        id: 'custom-colors',
        category: 'performance',
        categoryLabel: 'Themes & Visuals',
        tag: 'AUTO-FETCH WALLPAPERS',
        question: 'Why did the UI colors change after uploading a wallpaper?',
        cause:
          'TypeNova includes an intelligent Auto-Fetch engine that analyzes uploaded wallpapers and automatically extracts harmonic glow accent colors.',
        solutions: [
          'If you prefer a static accent color, open Settings -> Appearance and pick any fixed swatch (Cyan, Matrix Green, Sunset, etc.).',
          'Adjust wallpaper blur and brightness sliders in Appearance to maximize text contrast.',
          'Click "Clear Wallpaper" anytime to return to the pure liquid dark aesthetic.',
        ],
        actionType: 'appearance',
        actionLabel: 'Adjust Wallpaper & Theme',
      },
      {
        id: 'weak-drills',
        category: 'typing',
        categoryLabel: 'Weak Keys & Words',
        tag: 'SPACED REPETITION',
        question: 'How do I train specific words or keys that I frequently fumble?',
        cause:
          'Random word tests do not target motor sequence bottlenecks efficiently.',
        solutions: [
          'Open your Operator Dossier (/operator) and click the new "Weak Keys" tab to inspect your physical keystroke heatmap.',
          'Click the "Weak Words" tab in the Dossier to view your Leitner spaced repetition review queue.',
          'Click "▶ Rehearse" on any word card to instantly launch a procedural 30-word micro-drill focused on that motor sequence.',
        ],
        actionType: 'system',
        actionLabel: 'Learn More',
      },
    ],
    []
  );

  // Filtered FAQs
  const filteredFaqs = useMemo(() => {
    return faqCatalog.filter((item) => {
      const matchesCat = activeCategory === 'all' || item.category === activeCategory;
      if (!matchesCat) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        item.question.toLowerCase().includes(q) ||
        item.cause.toLowerCase().includes(q) ||
        item.tag.toLowerCase().includes(q) ||
        item.categoryLabel.toLowerCase().includes(q) ||
        item.solutions.some((s) => s.toLowerCase().includes(q))
      );
    });
  }, [faqCatalog, activeCategory, searchQuery]);

  const handleAction = (actionType?: string) => {
    switch (actionType) {
      case 'audio':
        handleUnlockAudio();
        break;
      case 'appearance':
        onNavigateTab('visuals');
        break;
      case 'shaders':
        onNavigateTab('shaders');
        break;
      case 'system':
        onNavigateTab('system');
        break;
      case 'ai':
        onNavigateTab('ai');
        break;
      case 'report':
        onNavigateTab('report');
        break;
      default:
        break;
    }
  };

  const categories: { id: FAQCategory; label: string }[] = [
    { id: 'all', label: 'All Topics' },
    { id: 'audio', label: 'Audio & Switches' },
    { id: 'performance', label: 'Performance & FPS' },
    { id: 'typing', label: 'Typing & Inputs' },
    { id: 'multiplayer', label: 'Multiplayer' },
    { id: 'ai', label: 'AI Smart Engine' },
    { id: 'sync', label: 'Cloud & Accounts' },
  ];

  return (
    <div className="flex flex-col h-full w-full space-y-5">
      {/* ─── 1. REAL-TIME HARDWARE & SYSTEM HEALTH HUD ───────────────── */}
      <div className="w-full bg-black/40 border border-white/10 backdrop-blur-xl rounded-2xl p-4 shadow-lg">
        <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2.5">
          <div className="flex items-center gap-2">
            <Activity size={14} style={{ color: `rgb(${theme.glowPrimary})` }} />
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-white">
              System Environment & Diagnostics
            </span>
          </div>
          <span className="text-[10px] font-mono text-zinc-500 uppercase">
            Live Browser Health
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {/* Diagnostic 1: Web Audio */}
          <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-mono text-zinc-400 uppercase">Web Audio</span>
              <Volume2 size={12} className="text-zinc-500" />
            </div>
            <div className="flex items-center gap-1.5">
              <div
                className={`w-2 h-2 rounded-full ${
                  audioState === 'running' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                }`}
              />
              <span className="text-xs font-mono font-bold text-white capitalize">
                {audioState}
              </span>
            </div>
            {audioState !== 'running' && (
              <button
                type="button"
                onClick={handleUnlockAudio}
                className="mt-1.5 text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white transition-all text-left"
              >
                ▶ Unlock Audio
              </button>
            )}
          </div>

          {/* Diagnostic 2: GPU Acceleration */}
          <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-mono text-zinc-400 uppercase">WebGL / GPU</span>
              <Cpu size={12} className="text-zinc-500" />
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-xs font-mono font-bold text-white truncate" title={gpuRenderer}>
                {gpuRenderer}
              </span>
            </div>
            <span className="text-[9px] font-mono text-zinc-500 mt-1">Hardware Accelerated</span>
          </div>

          {/* Diagnostic 3: Display Refresh Rate */}
          <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 flex flex-col justify-between group">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-mono text-zinc-400 uppercase">Display Hz</span>
              <button
                type="button"
                onClick={runHzCalibration}
                disabled={isCalibratingHz}
                title="Re-calibrate Display Refresh Rate"
                className="text-zinc-500 hover:text-white transition-colors p-0.5 rounded hover:bg-white/5 disabled:opacity-40"
              >
                <RotateCw size={11} className={isCalibratingHz ? 'animate-spin' : ''} />
              </button>
            </div>
            <div className="flex items-center gap-1.5">
              <div
                className="w-2 h-2 rounded-full transition-all duration-300"
                style={{
                  backgroundColor: isCalibratingHz
                    ? `rgba(${theme.glowPrimary}, 0.5)`
                    : `rgb(${theme.glowPrimary})`,
                  boxShadow: isCalibratingHz
                    ? 'none'
                    : `0 0 8px rgba(${theme.glowPrimary}, 0.6)`,
                }}
              />
              <span className="text-xs font-mono font-black text-white">
                {isCalibratingHz && !detectedHz
                  ? 'Calibrating...'
                  : detectedHz
                  ? `${detectedHz} Hz`
                  : 'Detecting...'}
              </span>
            </div>
            <div className="text-[9px] font-mono text-zinc-400 mt-1 flex items-center justify-between">
              <span>
                {frameDeltaMs ? `${frameDeltaMs}ms VSync` : 'Hardware VSync'}
              </span>
              {detectedHz && detectedHz >= 120 && (
                <span
                  className="px-1 py-0.2 rounded text-[8px] font-bold"
                  style={{
                    backgroundColor: `rgba(${theme.glowPrimary}, 0.15)`,
                    color: `rgb(${theme.glowPrimary})`,
                  }}
                >
                  PRO {detectedHz}
                </span>
              )}
            </div>
          </div>

          {/* Diagnostic 4: Local Storage Vault */}
          <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-mono text-zinc-400 uppercase">Storage & Net</span>
              {isOnline ? <Wifi size={12} className="text-emerald-400" /> : <Wifi size={12} className="text-red-400" />}
            </div>
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-red-400'}`} />
              <span className="text-xs font-mono font-bold text-white">
                {isOnline ? 'Online · Vault OK' : 'Offline Mode'}
              </span>
            </div>
            <span className="text-[9px] font-mono text-zinc-500 mt-1">
              {storageStatus === 'ok' ? 'Local Quota Nominal' : 'Storage Restricted'}
            </span>
          </div>
        </div>
      </div>

      {/* ─── 2. SEARCH & MINIMALIST FILTER BAR ───────────────────────── */}
      <div className="flex flex-col gap-3">
        {/* Search input */}
        <div className="relative w-full">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search problems, questions, latency, switches, shortcuts, or keywords..."
            className="w-full bg-white/[0.03] border border-white/10 rounded-xl pl-9 pr-9 py-2.5 text-xs font-mono text-white placeholder:text-zinc-500 focus:outline-none focus:border-white/20 transition-all shadow-inner"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Minimalist Monkeytype Filter Strip */}
        <div className="flex flex-wrap items-center gap-1.5 py-1">
          {categories.map((cat, idx) => {
            const active = activeCategory === cat.id;
            return (
              <React.Fragment key={cat.id}>
                {idx > 0 && <span className="w-1.5 h-1.5 rounded-full bg-white/10 shrink-0" />}
                <button
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  style={
                    active
                      ? {
                          backgroundColor: `rgba(${theme.glowPrimary}, 0.18)`,
                          color: `rgb(${theme.glowPrimary})`,
                          borderColor: `rgba(${theme.glowPrimary}, 0.35)`,
                        }
                      : undefined
                  }
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer border ${
                    active
                      ? 'shadow-sm font-bold'
                      : 'text-zinc-400 hover:text-white bg-white/[0.02] border-transparent hover:bg-white/[0.06]'
                  }`}
                >
                  {cat.label}
                </button>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* ─── 3. PROBLEM & SOLUTION ACCORDION LIST ────────────────────── */}
      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 custom-scrollbar">
        {filteredFaqs.length === 0 ? (
          <div className="p-8 rounded-2xl bg-white/[0.02] border border-white/5 text-center flex flex-col items-center justify-center">
            <HelpCircle size={24} className="text-zinc-500 mb-2" />
            <span className="text-xs font-mono text-zinc-300 font-bold uppercase tracking-wider">
              No Matching Solutions Found
            </span>
            <p className="text-[11px] text-zinc-500 mt-1 max-w-sm">
              We couldn't find a solution for "{searchQuery}". Try using different terms or send us a direct report.
            </p>
            <button
              type="button"
              onClick={() => onNavigateTab('report')}
              className="mt-4 px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Bug size={13} />
              Submit a Bug Report
            </button>
          </div>
        ) : (
          filteredFaqs.map((item) => {
            const isExpanded = expandedId === item.id;
            return (
              <div
                key={item.id}
                className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                  isExpanded
                    ? 'bg-black/50 shadow-lg'
                    : 'bg-white/[0.02] border-white/5 hover:border-white/15 hover:bg-white/[0.04]'
                }`}
                style={
                  isExpanded
                    ? {
                        borderColor: `rgba(${theme.glowPrimary}, 0.35)`,
                        boxShadow: `0 0 24px rgba(${theme.glowPrimary}, 0.08)`,
                      }
                    : undefined
                }
              >
                {/* Accordion Header */}
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : item.id)}
                  className="w-full p-4 flex items-center justify-between gap-4 text-left cursor-pointer select-none"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border border-white/10"
                      style={{
                        backgroundColor: isExpanded
                          ? `rgba(${theme.glowPrimary}, 0.2)`
                          : 'rgba(255, 255, 255, 0.04)',
                        color: isExpanded ? `rgb(${theme.glowPrimary})` : '#a1a1aa',
                      }}
                    >
                      <HelpCircle size={14} />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500">
                          {item.tag}
                        </span>
                      </div>
                      <span className="text-xs font-mono font-bold text-white tracking-wide">
                        {item.question}
                      </span>
                    </div>
                  </div>

                  <motion.div
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="text-zinc-500 shrink-0"
                  >
                    <ChevronDown size={16} />
                  </motion.div>
                </button>

                {/* Accordion Content */}
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: 'easeOut' }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 pt-1 border-t border-white/5 space-y-3">
                        {/* Cause section */}
                        <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400 block mb-1">
                            Why this happens
                          </span>
                          <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                            {item.cause}
                          </p>
                        </div>

                        {/* Solutions checklist */}
                        <div className="space-y-1.5">
                          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400 block">
                            Recommended Solutions
                          </span>
                          {item.solutions.map((sol, sIdx) => (
                            <div key={sIdx} className="flex items-start gap-2.5 text-xs text-zinc-300 leading-relaxed">
                              <div
                                className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                                style={{ backgroundColor: `rgba(${theme.glowPrimary}, 0.15)` }}
                              >
                                <Check size={10} style={{ color: `rgb(${theme.glowPrimary})` }} />
                              </div>
                              <span>{sol}</span>
                            </div>
                          ))}
                        </div>

                        {/* Interactive Shortcut Action */}
                        {item.actionLabel && (
                          <div className="pt-2 flex items-center justify-between border-t border-white/5">
                            <span className="text-[10px] font-mono text-zinc-500">
                              Direct In-App Shortcut:
                            </span>
                            <button
                              type="button"
                              onClick={() => handleAction(item.actionType)}
                              style={{
                                backgroundColor: `rgba(${theme.glowPrimary}, 0.15)`,
                                borderColor: `rgba(${theme.glowPrimary}, 0.35)`,
                                color: `rgb(${theme.glowPrimary})`,
                              }}
                              className="px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider border hover:brightness-125 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                            >
                              <span>{item.actionLabel}</span>
                              <ArrowRight size={12} />
                            </button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        )}
      </div>

      {/* ─── 4. BOTTOM HELPDESK & BUG REPORT CALLOUT ──────────────────── */}
      <div className="w-full bg-white/[0.02] border border-white/10 rounded-2xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 text-left">
          <div className="p-2 rounded-xl bg-red-500/10 text-red-400 shrink-0">
            <Bug size={16} />
          </div>
          <div>
            <span className="text-xs font-mono font-bold text-white block">
              Encountering an unlisted glitch or hardware bug?
            </span>
            <span className="text-[11px] text-zinc-400">
              Submit your diagnostics and screenshot directly to our engineers.
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onNavigateTab('report')}
          className="px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/30 hover:border-red-500/50 transition-all flex items-center gap-2 cursor-pointer shrink-0 shadow-sm"
        >
          <Bug size={13} />
          <span>Report Glitch</span>
          <ArrowRight size={12} />
        </button>
      </div>
    </div>
  );
};