import React, { useRef, useState, useEffect, memo } from 'react';
import type { Particle } from '@/hooks/useParticles';
import type { Theme } from '@/data/constants';
import type { Phase } from '@/data/constants';

// Stable empty array so particle-less chars keep the same prop identity
// across renders — otherwise `|| []` would defeat Char's memoization.
// Exported (with Char) for reuse by the replay modal.
export const EMPTY_PARTICLES: Particle[] = [];

interface CharProps {
  char: string;
  index: number;
  colorClass: string;
  isActive: boolean;
  caretClass: string;
  particles: Particle[];
}

// Memoized leaf: all props are primitives or stable references, so the
// default shallow compare skips re-rendering every span whose class/caret/
// particles didn't change on this keystroke (~99% of them).
export const Char = memo(({ char, index, colorClass, isActive, caretClass, particles }: CharProps) => (
  <span className="relative inline" id={isActive ? 'active-caret' : undefined} data-char-index={index}>
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
    {isActive && (
      <span className={`absolute left-0 -bottom-2 w-full h-[4px] bg-white rounded-full caret-lucid ${caretClass}`} />
    )}
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
  combo: number;
  zenMode?: boolean;
  /** Personal-best pace for the current config — when present the ghost
      races YOUR best run instead of the fixed 60 WPM pace. */
  pbGhost?: { wpm: number; samples: PaceSample[] } | null;
}

export const TypingArea = ({
  targetText, input, phase, theme, blindMode, focusMode,
  fogMode, startTime, shake, capsLock, stickyPenalty,
  particles, ghostPacer, combo, zenMode = false, pbGhost = null
}: TypingAreaProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

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

  const currentWordIndex = input.split(/\s+/).length - 1;

  // Auto-scroll to caret
  useEffect(() => {
    if (!containerRef.current) return;
    const caret = document.getElementById('active-caret');
    if (caret) {
      const container = containerRef.current;
      container.scrollTo({ top: caret.offsetTop - container.clientHeight / 2 + 40, behavior: 'smooth' });
    }
  }, [input.length]);

  const textArray = targetText.split('');

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

  // Zen mode: brighter untyped text, no dimming
  const untypedColor = zenMode ? 'text-zinc-400' : 'text-zinc-500';
  const baseFontClass = zenMode
    ? 'text-2xl md:text-3xl lg:text-4xl leading-[2]'
    : 'text-xl md:text-2xl lg:text-3xl leading-[1.8]';

  return (
    <div className={`relative w-full flex justify-center ${zenMode ? 'items-center min-h-[60vh]' : ''}`}>
      <div
        className={
          zenMode
            ? 'relative w-full max-w-4xl z-10 px-4'
            : 'relative w-full rounded-[2rem] glass-panel glass-refract theme-transition z-10 p-3 md:p-6'
        }
        style={{
          '--combo-glow': combo > 60 ? `0 0 120px rgba(${theme.glowPrimary},0.6)`
            : combo > 40 ? `0 0 60px rgba(${theme.glowPrimary},0.3)`
            : combo > 20 ? `0 0 20px rgba(${theme.glowPrimary},0.1)`
            : '0 0 0 transparent',
          animation: shake && !zenMode ? 'shake 0.2s ease-in-out' : 'none',
        } as React.CSSProperties}
      >
        {!zenMode && capsLock && (
          <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-red-500/90 text-white text-xs px-4 py-1.5 rounded-full font-bold flex items-center shadow-lg animate-bounce z-50">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-2"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
            CAPS LOCK ON
          </div>
        )}

        {!zenMode && stickyPenalty > 0 && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-red-500/90 text-white text-[10px] md:text-xs px-6 py-2 rounded-full font-black flex items-center shadow-[0_0_20px_rgba(239,68,68,0.8)] animate-pulse z-50 uppercase tracking-widest border border-red-400">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
            KEY STUCK! MASH BACKSPACE {stickyPenalty}x
          </div>
        )}

        <div
          id="typing-text-container"
          ref={containerRef}
          className={`relative ${baseFontClass} tracking-wide whitespace-pre-wrap text-left max-h-[70vh] overflow-y-auto pb-4 pt-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] transition-all duration-700`}
          style={{
            fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', ui-monospace, monospace",
            filter: !startTime && !zenMode ? 'blur(12px)' : 'none',
            opacity: !startTime && !zenMode ? 0.3 : 1,
            textShadow: zenMode ? '0 0 40px rgba(255,255,255,0.03)' : 'none',
          }}
        >
          {textArray.map((char, index) => {
            const inputChar = index < input.length ? input[index] : undefined;
            const isActive = index === input.length && phase === 'TYPING';

            let finalColorClass = inputChar !== undefined
              ? (inputChar === char
                ? (blindMode ? "opacity-0" : "text-zinc-100")
                : "text-red-400 bg-red-500/20 rounded-md shadow-[0_0_8px_rgba(248,113,113,0.5)]")
              : untypedColor;

            if (focusMode && !fogMode) {
              const dist = Math.abs(index - input.length);
              if (dist < 15) finalColorClass += " blur-none filter-none opacity-100 transition-all";
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
                caretClass={theme.drop}
                particles={particlesByIndex.get(index) ?? EMPTY_PARTICLES}
              />
            );
          })}

          {/* Ghost Pacer indicator — rendered as a subtle highlight on the target character */}
          {!zenMode && ghostPacer && startTime && phase === 'TYPING' && (
            <GhostPacerCursor
              startTime={startTime}
              targetTextLength={targetText.length}
              pbSamples={pbGhost?.samples}
            />
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Ghost Pacer Cursor ─────────────────────────────────────────────
// Shows a subtle highlight on the character the user "should" be typing.
// With a personal-best recording (pbSamples) it replays YOUR fastest run's
// exact pace; otherwise it falls back to a fixed 60 WPM reference
// (5 chars per word = 300 chars/min = 5 chars/sec).
const CHARS_PER_MINUTE_AT_PACE = 300; // 60 WPM * 5 chars

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

function GhostPacerCursor({ startTime, targetTextLength, pbSamples }: {
  startTime: number;
  targetTextLength: number;
  pbSamples?: PaceSample[];
}) {
  const [ghostIndex, setGhostIndex] = useState(-1);

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsedMs = Date.now() - startTime;
      const chars = pbSamples && pbSamples.length > 1
        ? charsAtTime(pbSamples, elapsedMs)
        : Math.floor((elapsedMs / 60000) * CHARS_PER_MINUTE_AT_PACE);
      setGhostIndex(Math.min(chars, targetTextLength - 1));
    }, 100);
    return () => clearInterval(interval);
  }, [startTime, targetTextLength, pbSamples]);

  if (ghostIndex < 0) return null;

  return (
    <span
      className="absolute pointer-events-none z-40"
      style={{
        left: 0,
        top: 0,
        transform: 'translate(0, 0)',
      }}
    >
      <style>{`
        #ghost-char-${ghostIndex} {
          position: relative;
        }
        #ghost-char-${ghostIndex}::after {
          content: '';
          position: absolute;
          bottom: -2px;
          left: 0;
          right: 0;
          height: 2px;
          background: rgba(255, 255, 255, 0.25);
          border-radius: 1px;
          animation: ghost-pulse 1.5s ease-in-out infinite;
        }
        @keyframes ghost-pulse {
          0%, 100% { opacity: 0.15; }
          50% { opacity: 0.4; }
        }
      `}</style>
      {/* We use a DOM query to find the ghost target and mark it */}
      <GhostPacerMarker targetIndex={ghostIndex} />
    </span>
  );
}

// Invisible component that marks the target character via DOM manipulation
function GhostPacerMarker({ targetIndex }: { targetIndex: number }) {
  useEffect(() => {
    // Find the character span at the ghost index
    const container = document.getElementById('typing-text-container');
    if (!container) return;
    const spans = container.querySelectorAll('[data-char-index]');
    spans.forEach((span) => {
      span.removeAttribute('id');
      span.classList.remove('ghost-pacer-active');
    });
    const target = container.querySelector(`[data-char-index="${targetIndex}"]`);
    if (target) {
      target.id = `ghost-char-${targetIndex}`;
      target.classList.add('ghost-pacer-active');
    }
  }, [targetIndex]);

  return null;
}
