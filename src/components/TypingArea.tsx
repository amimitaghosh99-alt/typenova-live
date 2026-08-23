import React, { useRef, useState, useEffect, memo, useMemo, useCallback } from 'react';
import { Ghost } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnimatedHeight } from '@/components/ui/AnimatedHeight';
import type { Particle } from '@/hooks/useParticles';
import type { Theme } from '@/data/constants';
import type { Phase } from '@/data/constants';
import type { RacerState } from '@/hooks/useRace';

// Stable empty array so particle-less chars keep the same prop identity
// across renders — otherwise `|| []` would defeat Char's memoization.
// Exported (with Char) for reuse by the replay modal.
export const EMPTY_PARTICLES: Particle[] = [];

// ─── SYNTAX HIGHLIGHTER ─────────────────────────────────────────────
const REGEX_KEYWORDS = /\b(import|export|from|const|let|var|function|return|if|else|for|while|class|try|catch|async|await|def|impl|fn|mut|pub|WITH|SELECT|FROM|WHERE|JOIN|ON|OVER|ORDER|BY|func|chan|range|type|interface|throw|new|yield|break|continue)\b/g;
const REGEX_STRINGS = /(['"`])(?:(?=(\\?))\2.)*?\1/g;
const REGEX_NUMBERS = /\b\d+(\.\d+)?\b/g;
const REGEX_FUNCS = /\b([a-zA-Z_]\w*)(?=\s*\()/g;
const REGEX_COMMENTS = /(\/\/.*|\/\*[\s\S]*?\*\/)/g;
const REGEX_HTML_TAGS = /<\/?[\w\s="/.':;#-/?]+>/g;
const REGEX_CSS_PROPS = /\b([a-zA-Z-]+)(?=\s*:)/g;

const useSyntaxHighlighter = (text: string, isActive: boolean) => {
  return useMemo(() => {
    const colors = new Array(text.length).fill('');
    if (!isActive) return colors;
    
    for (const match of text.matchAll(REGEX_KEYWORDS)) {
      for (let i = match.index; i < match.index + match[0].length; i++) colors[i] = 'text-purple-400';
    }

    for (const match of text.matchAll(REGEX_STRINGS)) {
      for (let i = match.index; i < match.index + match[0].length; i++) colors[i] = 'text-emerald-400';
    }

    for (const match of text.matchAll(REGEX_NUMBERS)) {
      for (let i = match.index; i < match.index + match[0].length; i++) {
        if (!colors[i]) colors[i] = 'text-orange-400';
      }
    }

    for (const match of text.matchAll(REGEX_FUNCS)) {
      const isKeyword = ['if', 'for', 'while', 'catch'].includes(match[1]);
      if (!isKeyword) {
        for (let i = match.index; i < match.index + match[1].length; i++) {
          if (!colors[i]) colors[i] = 'text-blue-400';
        }
      }
    }

    for (const match of text.matchAll(REGEX_COMMENTS)) {
      for (let i = match.index; i < match.index + match[0].length; i++) colors[i] = 'text-zinc-600 font-normal italic';
    }

    for (const match of text.matchAll(REGEX_HTML_TAGS)) {
      for (let i = match.index; i < match.index + match[0].length; i++) {
        if (!colors[i]) colors[i] = 'text-pink-400';
      }
    }

    for (const match of text.matchAll(REGEX_CSS_PROPS)) {
      for (let i = match.index; i < match.index + match[1].length; i++) {
        if (!colors[i]) colors[i] = 'text-cyan-400';
      }
    }

    return colors;
  }, [text, isActive]);
};

interface CharProps {
  char: string;
  index: number;
  colorClass: string;
  isActive: boolean;
  particles: Particle[];
}

// Memoized leaf: all props are primitives or stable references, so the
// default shallow compare skips re-rendering every span whose class/caret/
// particles didn't change on this keystroke (~99% of them).
export const Char = memo(({ char, index, colorClass, isActive, particles }: CharProps) => (
  <span className="relative inline-block" id={isActive ? 'active-caret' : undefined} data-char-index={index}>
    {particles.map(p => (
      <span
        key={p.id}
        className={`absolute top-0 left-1/2 font-bold ${p.color} pointer-events-none z-50`}
        style={{
          animation: 'tetris-spark 0.6s cubic-bezier(0.25, 1, 0.5, 1) forwards',
          ['--tx' as string]: p.tx,
          ['--ty' as string]: p.ty,
          ['--rot' as string]: p.rot,
          textShadow: '0 0 8px currentColor'
        }}
      >
        {p.char}
      </span>
    ))}
    <span className={`${colorClass} transition-colors duration-150`}>
      {char === '\n' ? <span className="opacity-30">↵{'\n'}</span> : char}
    </span>
  </span>
));

Char.displayName = 'Char';

export interface PaceSample {
  /** ms since test start */
  t: number;
  /** input length at that moment */
  chars: number;
}

interface TypingAreaProps {
  targetText: string;
  input: string;
  phase: Phase;
  theme: Theme;
  blindMode: boolean;
  focusMode: boolean;
  fogMode: boolean;
  startTime: number | null;
  shake: boolean;
  capsLock: boolean;
  stickyPenalty: number;
  particles: Particle[];
  ghostPacer: boolean;
  ghostMode?: 'pb' | 'target';
  ghostTargetWpm?: number;
  combo: number;
  zenMode?: boolean;
  /** Personal-best pace for the current config — when present the ghost
      races YOUR best run instead of the fixed 60 WPM pace. */
  pbGhost?: { wpm: number; samples: PaceSample[] } | null;
  isCodeMode?: boolean;
  racePlayers?: RacerState[];
}

export const TypingArea = memo<TypingAreaProps>(function TypingArea({
  targetText, input, phase, theme, blindMode, focusMode,
  fogMode, startTime, shake, capsLock, stickyPenalty,
  particles, ghostPacer, ghostMode = 'pb', ghostTargetWpm = 100, combo, zenMode = false, pbGhost = null,
  isCodeMode = false, racePlayers
}: TypingAreaProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const ghost = useGhostRace(
    !zenMode && ghostPacer && phase === 'TYPING',
    startTime, targetText.length, input.length, ghostMode, ghostTargetWpm, pbGhost
  );

  const [showOvertake, setShowOvertake] = useState(false);
  const lastOvertakeTriggerRef = useRef(0);

  useEffect(() => {
    if (ghost && ghost.overtakeTrigger > lastOvertakeTriggerRef.current) {
      lastOvertakeTriggerRef.current = ghost.overtakeTrigger;
      setShowOvertake(true);
      const t = setTimeout(() => setShowOvertake(false), 2400);
      return () => clearTimeout(t);
    }
  }, [ghost?.overtakeTrigger]);

  // Pre-compute word indices for fog mode
  const wordIndices = React.useMemo(() => {
    const indices: number[] = [];
    let wordIdx = 0;
    for (let i = 0; i < targetText.length; i++) {
      indices.push(wordIdx);
      if (targetText[i] === ' ' || targetText[i] === '\n') wordIdx++;
    }
    return indices;
  }, [targetText]);

  const currentWordIndex = useMemo(() => input.split(/\s+/).length - 1, [input]);

  // Auto-scroll to caret - throttled to only trigger when caret line shifts
  const lastScrollTargetRef = useRef<number>(-1);
  useEffect(() => {
    if (!containerRef.current) return;
    const caret = document.getElementById('active-caret');
    if (caret) {
      const container = containerRef.current;
      const targetTop = caret.offsetTop - container.clientHeight / 2 + 40;
      if (Math.abs(lastScrollTargetRef.current - targetTop) > 20) {
        lastScrollTargetRef.current = targetTop;
        container.scrollTo({ top: targetTop, behavior: 'smooth' });
      }
    }
  }, [input.length]);

  // Build a lookup of particles by character index for O(1) access
  const particlesByIndex = React.useMemo(() => {
    const map = new Map<number, Particle[]>();
    for (const p of particles) {
      const existing = map.get(p.index) || [];
      existing.push(p);
      map.set(p.index, existing);
    }
    return map;
  }, [particles]);

  // High-contrast untyped text with subtle shadow for crisp readability over any wallpaper
  const untypedColor = 'text-zinc-200 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]';
  const baseFontClass = zenMode
    ? 'font-mono text-2xl md:text-3xl lg:text-4xl leading-[2]'
    : 'font-mono text-xl md:text-2xl lg:text-3xl leading-[1.8]';

  const syntaxColors = useSyntaxHighlighter(targetText, isCodeMode);

  // Pre-chunk words and character indices so string splitting doesn't re-run on every keystroke
  const wordChunks = useMemo(() => {
    let currentIndex = 0;
    return targetText.split(/(\s+)/).map((word, wIdx) => ({
      wIdx,
      chars: word.split('').map((char) => ({
        char,
        index: currentIndex++,
      })),
    }));
  }, [targetText]);

  return (
    <div className={`relative w-full flex justify-center ${zenMode ? 'items-center min-h-[60vh]' : ''}`}>
      <div
        className={
          zenMode
            ? 'relative w-full max-w-4xl z-20 px-4'
            : `relative w-full rounded-[2.5rem] z-20 typing-canvas glass-refract theme-transition p-6 md:p-10 flex flex-col justify-center ${phase === 'TYPING' ? 'typing-active' : ''}`
        }
        style={{
          '--combo-glow': combo > 60 ? `0 0 120px rgba(${theme.glowPrimary},0.6)`
            : combo > 40 ? `0 0 60px rgba(${theme.glowPrimary},0.3)`
            : combo > 20 ? `0 0 20px rgba(${theme.glowPrimary},0.1)`
            : '0 0 0 transparent',
          animation: shake && !zenMode ? 'shake 0.2s ease-in-out' : 'none',
        } as React.CSSProperties}
      >
        <div className="w-full flex flex-col items-center justify-center my-auto">
          {capsLock && (
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-red-500/90 text-white text-xs px-4 py-1.5 rounded-full font-bold flex items-center shadow-lg animate-bounce z-50 font-display">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-2"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
              CAPS LOCK ON
            </div>
          )}

          {/* Ghost Racer 2.0: Live Dual Race Track & Split Time */}
          {ghost && (
            <div className="w-full mb-4 px-2 flex flex-col gap-2 relative">
              <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider font-display">
                {/* Player Status */}
                <div 
                  className="flex items-center gap-1.5 font-display"
                  style={{ color: `rgb(${theme.glowPrimary})` }}
                >
                  <span 
                    className="w-2 h-2 rounded-full animate-pulse"
                    style={{ 
                      backgroundColor: `rgb(${theme.glowPrimary})`,
                      boxShadow: `0 0 8px rgba(${theme.glowPrimary}, 0.8)`
                    }} 
                  />
                  <span>YOU ({Math.round(ghost.playerProgress)}%)</span>
                </div>

                {/* Live Split Delta Badge */}
                <div className="flex items-center gap-2 px-3.5 py-1 rounded-full bg-zinc-950/90 border border-white/10 shadow-lg font-display">
                  <Ghost size={12} className={ghost.isAhead ? 'text-emerald-400' : 'text-rose-400'} />
                  <span className={`text-[10px] font-black tabular-nums tracking-widest ${ghost.isAhead ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {ghost.isAhead ? '▲' : '▼'} {Math.abs(ghost.deltaS).toFixed(1)}s {ghost.isAhead ? 'AHEAD' : 'BEHIND'}
                  </span>
                  <span className="text-[9px] font-bold text-zinc-500 tracking-wider">
                    ({ghost.isAhead ? '+' : ''}{ghost.charDelta} chars)
                  </span>
                </div>

                {/* Ghost Status */}
                <div className="flex items-center gap-1.5 text-purple-400 font-display">
                  <span>GHOST {ghost.label} ({Math.round(ghost.ghostProgress)}%)</span>
                </div>
              </div>

              {/* Progress Track */}
              <div className="relative w-full h-1.5 rounded-full bg-zinc-900 border border-white/5 overflow-visible">
                {/* Ghost Bar */}
                <div
                  className="absolute top-0 left-0 h-full rounded-full bg-gradient-to-r from-purple-900 to-purple-500 opacity-60 transition-all duration-100 ease-linear"
                  style={{ width: `${ghost.ghostProgress}%` }}
                />
                {/* Player Bar */}
                <div
                  className="absolute top-0 left-0 h-full rounded-full transition-all duration-100 ease-out"
                  style={{ 
                    width: `${ghost.playerProgress}%`,
                    backgroundColor: `rgb(${theme.glowPrimary})`,
                    boxShadow: `0 0 10px rgba(${theme.glowPrimary}, 0.6)`
                  }}
                />

                {/* Ghost Indicator */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 -ml-2 w-4 h-4 rounded-full bg-purple-950 border border-purple-400 flex items-center justify-center shadow-[0_0_12px_rgba(168,85,247,0.9)] z-10 transition-all duration-100 ease-linear"
                  style={{ left: `${ghost.ghostProgress}%` }}
                >
                  <Ghost size={9} className="text-purple-300" />
                </div>

                {/* Player Indicator */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 -ml-2 w-4 h-4 rounded-full bg-black border flex items-center justify-center z-20 transition-all duration-100 ease-out"
                  style={{ 
                    left: `${ghost.playerProgress}%`,
                    borderColor: `rgb(${theme.glowPrimary})`,
                    boxShadow: `0 0 15px rgba(${theme.glowPrimary}, 1)`
                  }}
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-white" />
                </div>
              </div>

              {/* Overtake Notification Burst */}
              {showOvertake && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-amber-400 to-emerald-400 text-black font-black text-xs tracking-widest uppercase shadow-[0_0_30px_rgba(245,158,11,1)] animate-bounce z-50 flex items-center gap-1.5 font-display">
                  ⚡ OVERTAKE! +{Math.abs(ghost.deltaS).toFixed(1)}s
                </div>
              )}
            </div>
          )}

          {stickyPenalty > 0 && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-red-500/90 text-white text-[10px] md:text-xs px-6 py-2 rounded-full font-black flex items-center shadow-[0_0_20px_rgba(239,68,68,0.8)] animate-pulse z-50 uppercase tracking-widest border border-red-400 font-display">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
              KEY STUCK! MASH BACKSPACE {stickyPenalty}x
            </div>
          )}

          <AnimatedHeight expandDuration={0.45} shrinkDuration={0.65} className="w-[calc(100%+2rem)] -ml-4 px-4">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={targetText.slice(0, 30) + targetText.length}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                id="typing-text-container"
                ref={containerRef}
                className={`relative ${baseFontClass} tracking-wide whitespace-pre-wrap text-left max-h-[70vh] overflow-y-auto pb-4 pt-4 px-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] w-full [contain:layout_style]`}
                style={{
                  userSelect: phase === 'CONFIGURING' ? 'none' : 'auto',
                  pointerEvents: phase === 'CONFIGURING' ? 'none' : 'auto',
                  textShadow: zenMode ? '0 0 40px rgba(255,255,255,0.03)' : '0 1px 2px rgba(0,0,0,0.8)',
                  transform: 'translateZ(0)',
                }}
              >
                {phase === 'CONFIGURING' ? (
                  // Zero-overhead soft frosted preview during configuration: 1 single DOM node with 120 FPS GPU blur
                  <span className="text-zinc-300 select-none pointer-events-none blur-[4px] opacity-40 transition-all duration-300 block">
                    {targetText}
                  </span>
                ) : (
                  // Active typing test: individual interactive character spans with glide caret & particles
                  wordChunks.map(({ wIdx, chars }) => (
                    <span key={wIdx} className="inline-block whitespace-pre">
                      {chars.map(({ char, index }) => {
                        const inputChar = index < input.length ? input[index] : undefined;
                        const isActive = index === input.length && phase === 'TYPING';

                        const syntaxColor = syntaxColors[index] || untypedColor;

                        let finalColorClass = inputChar !== undefined
                          ? (inputChar === char
                            ? (blindMode ? "opacity-0" : "text-zinc-100 drop-shadow-[0_0_2px_rgba(255,255,255,0.3)]")
                            : "text-red-400 bg-red-500/20 rounded-md shadow-[0_0_8px_rgba(248,113,113,0.5)]")
                          : syntaxColor;

                        if (focusMode && !fogMode) {
                          const dist = Math.abs(index - input.length);
                          if (dist < 15) finalColorClass += " blur-none filter-none opacity-100 transition-[opacity,filter] duration-150";
                          else finalColorClass += " blur-sm opacity-20";
                        }

                        if (fogMode) {
                          const charWordIndex = wordIndices[index] ?? 0;
                          if (charWordIndex < currentWordIndex) finalColorClass += " opacity-0 transition-opacity duration-300";
                          else if (charWordIndex > currentWordIndex + 1) finalColorClass += " opacity-0 transition-opacity duration-300";
                          else if (charWordIndex === currentWordIndex + 1) finalColorClass += " opacity-20 blur-[2px] transition-opacity duration-300";
                        }

                        return (
                          <Char
                            key={index}
                            char={char}
                            index={index}
                            colorClass={finalColorClass}
                            isActive={isActive}
                            particles={particlesByIndex.get(index) ?? EMPTY_PARTICLES}
                          />
                        );
                      })}
                    </span>
                  ))
                )}

            {/* Smooth-glide caret — one bar that slides between characters */}
            {phase === 'TYPING' && input.length < targetText.length && (
              <GlidingBar
                index={input.length}
                containerRef={containerRef}
                targetText={targetText}
                barClass={`bg-white caret-lucid ${theme.drop}`}
              />
            )}

            {/* Ghost Racer 2.0: Cyber Ghost Beacon & Glowing Caret */}
            {ghost && (
              <GlidingGhostBeacon
                index={ghost.index}
                containerRef={containerRef}
                targetText={targetText}
                label={ghost.label}
                isAhead={ghost.isAhead}
              />
            )}

            {/* Multiplayer opponents (inline glow) */}
            {racePlayers && racePlayers.map((player, i) => {
              const playerIndex = Math.min(Math.floor((player.progress / 100) * targetText.length), targetText.length - 1);
              const opponentColors = ['rgb(245, 158, 11)', 'rgb(56, 189, 248)', 'rgb(244, 114, 182)', 'rgb(167, 139, 250)']; // Amber, Sky, Pink, Violet
              return (
                <GlidingBar
                  key={player.id}
                  index={playerIndex}
                  containerRef={containerRef}
                  targetText={targetText}
                  barClass=""
                  barStyle={{
                    background: opponentColors[i % opponentColors.length],
                    opacity: 0.6,
                    height: '100%',
                    top: 0,
                    mixBlendMode: 'screen',
                    transition: 'transform 200ms linear, width 100ms ease-out',
                  }}
                />
              );
            })}
              </motion.div>
            </AnimatePresence>
          </AnimatedHeight>
        </div>
      </div>
    </div>
  );
});

// ─── Ghost Pacer Cursor ─────────────────────────────────────────────
/** Input length at elapsed ms `t`, linearly interpolated between samples. */
function charsAtTime(samples: PaceSample[], t: number): number {
  if (t <= samples[0].t) return samples[0].chars;
  const last = samples[samples.length - 1];
  if (t >= last.t) return last.chars;
  // samples are time-ordered; binary search the bracketing pair
  let lo = 0, hi = samples.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (samples[mid].t <= t) lo = mid; else hi = mid;
  }
  const a = samples[lo], b = samples[hi];
  const frac = b.t === a.t ? 0 : (t - a.t) / (b.t - a.t);
  return Math.floor(a.chars + (b.chars - a.chars) * frac);
}

/** Elapsed ms at which the pace recording reached `chars` (inverse of
    charsAtTime), linearly interpolated. Used for the ahead/behind delta. */
function timeAtChars(samples: PaceSample[], chars: number): number {
  if (chars <= samples[0].chars) return samples[0].t;
  const last = samples[samples.length - 1];
  if (chars >= last.chars) return last.t;
  // chars is monotonically non-decreasing; binary search the bracketing pair
  let lo = 0, hi = samples.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (samples[mid].chars <= chars) lo = mid; else hi = mid;
  }
  const a = samples[lo], b = samples[hi];
  const frac = b.chars === a.chars ? 0 : (chars - a.chars) / (b.chars - a.chars);
  return a.t + (b.t - a.t) * frac;
}

// ─── Gliding Bar ────────────────────────────────────────────────────
// A single underline bar positioned by measuring the char span at `index`
// and translated there with a CSS transition — the caret GLIDES between
// characters instead of teleporting. Rendered inside the scroll container
// (which is position:relative), so it scrolls with the text.
const GlidingBar = memo(function GlidingBar({ index, containerRef, targetText, barClass, barStyle }: {
  index: number;
  containerRef: React.RefObject<HTMLDivElement | null>;
  targetText: string; // re-measure when the text (and thus layout) changes
  barClass: string;
  barStyle?: React.CSSProperties;
}) {
  const [pos, setPos] = useState<{ x: number; y: number; w: number } | null>(null);

  const measure = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const idx = Math.min(index, Math.max(0, targetText.length - 1));
    const el = container.querySelector<HTMLElement>(`[data-char-index="${idx}"]`);
    if (!el) {
      setPos(null);
      return;
    }

    // Direct offset relative to nearest positioned ancestor (the container)
    const x = el.offsetLeft;
    const y = el.offsetTop + el.offsetHeight - 4;
    const w = Math.max(6, el.offsetWidth);

    setPos(prev => {
      if (!prev || prev.x !== x || prev.y !== y || prev.w !== w) {
        return { x, y, w };
      }
      return prev;
    });
  }, [index, targetText.length, containerRef]);

  // Synchronize on index or text change
  useEffect(() => {
    measure();
  }, [measure]);

  const measureRef = useRef(measure);
  measureRef.current = measure;

  // Bind resize observer only when container mounts or changes (not on every keystroke)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let rafId: number;
    const scheduleMeasure = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        measureRef.current();
      });
    };

    const resizeObserver = new ResizeObserver(scheduleMeasure);
    resizeObserver.observe(container);
    window.addEventListener('resize', scheduleMeasure);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', scheduleMeasure);
      cancelAnimationFrame(rafId);
    };
  }, [containerRef]);

  if (!pos) return null;

  const { background, opacity, transition, ...restStyle } = barStyle || {};

  return (
    <span
      className="absolute left-0 top-0 pointer-events-none z-40 will-change-transform"
      style={{
        width: pos.w,
        transform: `translate3d(${pos.x}px, ${pos.y}px, 0)`,
        transition: transition || 'transform 100ms ease-out, width 100ms ease-out',
        opacity,
        ...restStyle,
      }}
    >
      <span 
        className={`block w-full h-[4px] rounded-full ${barClass}`}
        style={{ background }}
      />
    </span>
  );
});

// ─── Gliding Ghost Beacon ───────────────────────────────────────────
// An ethereal floating cyber ghost beacon that glides directly above the ghost's target letter.
const GlidingGhostBeacon = memo(function GlidingGhostBeacon({
  index,
  containerRef,
  targetText,
  label,
  isAhead,
}: {
  index: number;
  containerRef: React.RefObject<HTMLDivElement | null>;
  targetText: string;
  label: string;
  isAhead: boolean;
}) {
  const [pos, setPos] = useState<{ x: number; y: number; w: number } | null>(null);

  const measure = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const idx = Math.min(index, Math.max(0, targetText.length - 1));
    const el = container.querySelector<HTMLElement>(`[data-char-index="${idx}"]`);
    if (!el) {
      setPos(null);
      return;
    }

    const x = el.offsetLeft;
    const y = el.offsetTop;
    const w = Math.max(6, el.offsetWidth);

    setPos(prev => {
      if (!prev || prev.x !== x || prev.y !== y || prev.w !== w) {
        return { x, y, w };
      }
      return prev;
    });
  }, [index, targetText.length, containerRef]);

  useEffect(() => {
    measure();
  }, [measure]);

  if (!pos) return null;

  return (
    <span
      className="absolute left-0 top-0 pointer-events-none z-30 will-change-transform"
      style={{
        transform: `translate3d(${pos.x}px, ${pos.y}px, 0)`,
        transition: 'transform 100ms linear',
      }}
    >
      {/* Floating Cyber Ghost Badge */}
      <span
        className={`absolute -top-7 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black whitespace-nowrap animate-pulse transition-colors font-display ${
          isAhead
            ? 'bg-purple-950/90 border border-purple-500/40 text-purple-300 shadow-[0_0_12px_rgba(168,85,247,0.6)]'
            : 'bg-fuchsia-950/95 border border-fuchsia-400 text-fuchsia-200 shadow-[0_0_20px_rgba(217,70,239,0.85)]'
        }`}
      >
        <Ghost size={10} className="animate-bounce" />
        <span>{label}</span>
      </span>

      {/* Ghost Neon Shadow Underline */}
      <span
        className="absolute bottom-[-4px] left-0 block h-[4px] rounded-full bg-gradient-to-r from-purple-500 via-fuchsia-400 to-cyan-400 shadow-[0_0_12px_rgba(168,85,247,0.9)] opacity-80"
        style={{ width: pos.w }}
      />
    </span>
  );
});

export interface GhostRaceState {
  index: number;
  deltaS: number;
  charDelta: number;
  isAhead: boolean;
  ghostProgress: number;
  playerProgress: number;
  label: string;
  overtakeTrigger: number;
}

// ─── Ghost race state ───────────────────────────────────────────────
// Computes live position, progress, split delta, and overtake triggers.
function useGhostRace(
  active: boolean,
  startTime: number | null,
  targetTextLength: number,
  inputLength: number,
  ghostMode: 'pb' | 'target' = 'pb',
  ghostTargetWpm: number = 100,
  pbGhost?: { wpm: number; samples: PaceSample[] } | null
): GhostRaceState | null {
  const [ghost, setGhost] = useState<GhostRaceState | null>(null);
  const inputLenRef = useRef(inputLength);
  const wasBehindRef = useRef<boolean>(false);
  const overtakeCountRef = useRef<number>(0);

  useEffect(() => {
    inputLenRef.current = inputLength;
  });

  useEffect(() => {
    if (!active || !startTime || targetTextLength <= 0) {
      setGhost(null);
      wasBehindRef.current = false;
      return;
    }

    const pbSamples = pbGhost?.samples;
    const hasPb = ghostMode === 'pb' && !!pbSamples && pbSamples.length > 1;
    const targetPaceWpm = hasPb ? pbGhost!.wpm : (ghostTargetWpm || 100);
    const targetCpm = targetPaceWpm * 5;
    const label = hasPb ? `PB ${pbGhost!.wpm}` : `${targetPaceWpm} WPM`;

    const interval = setInterval(() => {
      const elapsedMs = Date.now() - startTime;
      const currentInputLen = inputLenRef.current;

      const chars = hasPb
        ? charsAtTime(pbSamples!, elapsedMs)
        : Math.floor((elapsedMs / 60000) * targetCpm);

      const tGhost = hasPb
        ? timeAtChars(pbSamples!, currentInputLen)
        : (currentInputLen / (targetCpm / 60)) * 1000;

      const deltaS = (tGhost - elapsedMs) / 1000;
      const charDelta = currentInputLen - chars;
      const isAhead = deltaS >= 0;

      // Overtake detection: if previously behind and now ahead after at least 1.5s
      if (wasBehindRef.current && isAhead && elapsedMs > 1500) {
        overtakeCountRef.current += 1;
      }
      wasBehindRef.current = !isAhead;

      const ghostIndex = Math.min(chars, targetTextLength - 1);
      const ghostProgress = Math.min(100, (ghostIndex / targetTextLength) * 100);
      const playerProgress = Math.min(100, (currentInputLen / targetTextLength) * 100);

      setGhost({
        index: ghostIndex,
        deltaS,
        charDelta,
        isAhead,
        ghostProgress,
        playerProgress,
        label,
        overtakeTrigger: overtakeCountRef.current,
      });
    }, 100);

    return () => clearInterval(interval);
  }, [active, startTime, targetTextLength, ghostMode, ghostTargetWpm, pbGhost]);

  return ghost;
}