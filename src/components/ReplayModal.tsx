import { useState, useEffect, useRef, useMemo } from 'react';
import { X, Play, Pause, FastForward, RotateCcw } from 'lucide-react';
import type { Theme } from '@/data/constants';
import type { Keystroke } from '@/hooks/useTypingEngine';
import { Char, EMPTY_PARTICLES } from '@/components/TypingArea';

// Precomputed playback frames: one input snapshot per logged event.
// Memory is modest (~hundreds of strings) and it makes scrubbing trivial.
interface Frame {
  t: number; // ms since first keystroke
  input: string;
}

function buildFrames(log: Keystroke[]): Frame[] {
  if (log.length === 0) return [{ t: 0, input: '' }];
  const t0 = log[0].time;
  const frames: Frame[] = [{ t: 0, input: '' }];
  let input = '';
  for (const k of log) {
    if (k.isBackspace) input = input.slice(0, -1);
    else input += k.key;
    frames.push({ t: k.time - t0, input });
  }
  return frames;
}

interface ReplayModalProps {
  targetText: string;
  log: Keystroke[];
  theme: Theme;
  onClose: () => void;
}

export const ReplayModal = ({ targetText, log, theme, onClose }: ReplayModalProps) => {
  const frames = useMemo(() => buildFrames(log), [log]);
  const totalMs = frames[frames.length - 1].t;

  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [frameIdx, setFrameIdx] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  // Playback clock: elapsed replay-ms accumulated across pauses/speed changes
  const clockRef = useRef({ elapsed: 0, lastTick: 0 });

  // Drive playback with rAF; advance a monotonic frame pointer.
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    clockRef.current.lastTick = performance.now();
    const tick = (now: number) => {
      const c = clockRef.current;
      c.elapsed += (now - c.lastTick) * speed;
      c.lastTick = now;
      // find the last frame at or before elapsed
      let idx = 0;
      while (idx + 1 < frames.length && frames[idx + 1].t <= c.elapsed) idx++;
      setFrameIdx(idx);
      if (c.elapsed >= totalMs) { setPlaying(false); setFrameIdx(frames.length - 1); return; }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, speed, frames, totalMs]);

  const restart = () => {
    clockRef.current.elapsed = 0;
    setFrameIdx(0);
    setPlaying(true);
  };

  const input = frames[frameIdx].input;

  // Keep the caret in view as the replay scrolls
  useEffect(() => {
    const caret = document.getElementById('active-caret');
    const container = containerRef.current;
    if (caret && container) {
      container.scrollTo({ top: (caret as HTMLElement).offsetTop - container.clientHeight / 2 + 40, behavior: 'smooth' });
    }
  }, [input.length]);

  const progress = totalMs > 0 ? Math.min(100, (frames[frameIdx].t / totalMs) * 100) : 0;

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300" onClick={onClose}>
      <div className="bg-zinc-950 border border-zinc-800 rounded-[2.5rem] p-8 md:p-10 w-full max-w-4xl shadow-2xl lucid-scale" style={{ '--delay': '0ms' } as React.CSSProperties} onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6 border-b border-zinc-800 pb-4">
          <h2 className="text-2xl font-black text-white uppercase tracking-widest flex items-center">
            <Play className="mr-3" style={{ color: `rgb(${theme.glowPrimary})` }} size={24} /> Replay
          </h2>
          <button onClick={onClose} className="p-3 bg-zinc-900 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors"><X size={20} /></button>
        </div>

        {/* Progress */}
        <div className="h-1 bg-zinc-900 rounded-full mb-6 overflow-hidden">
          <div className={`h-full ${theme.solid}`} style={{ width: `${progress}%`, transition: 'width 120ms linear' }} />
        </div>

        {/* Text playback — same visual language as the live TypingArea */}
        <div
          ref={containerRef}
          className="text-xl md:text-2xl leading-[1.8] tracking-wide whitespace-pre-wrap text-left max-h-[45vh] overflow-y-auto pb-4 pt-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          style={{ fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', ui-monospace, monospace" }}
        >
          {targetText.split('').map((char, index) => {
            const inputChar = index < input.length ? input[index] : undefined;
            const colorClass = inputChar !== undefined
              ? (inputChar === char
                ? 'text-zinc-100'
                : 'text-red-400 bg-red-500/20 rounded-md shadow-[0_0_8px_rgba(248,113,113,0.5)]')
              : 'text-zinc-600';
            return (
              <Char
                key={index}
                char={char}
                index={index}
                colorClass={colorClass}
                isActive={index === input.length}
                caretClass={theme.drop}
                particles={EMPTY_PARTICLES}
              />
            );
          })}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-3 mt-6">
          <button onClick={restart} className="p-3 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all" title="Restart">
            <RotateCcw size={18} />
          </button>
          <button
            onClick={() => {
              if (!playing && frames[frameIdx].t >= totalMs) { restart(); return; }
              setPlaying(p => !p);
            }}
            className={`p-4 rounded-full border transition-all ${theme.borderHalf} ${theme.glow}`}
            style={{ color: `rgb(${theme.glowPrimary})` }}
            title={playing ? 'Pause' : 'Play'}
          >
            {playing ? <Pause size={22} /> : <Play size={22} />}
          </button>
          {[1, 2].map(s => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={`px-4 py-2 rounded-full text-[10px] font-black tracking-widest border transition-all flex items-center gap-1 ${speed === s ? `bg-white/10 ${theme.text} border-white/20` : 'text-zinc-500 border-zinc-800 hover:text-white'}`}
            >
              <FastForward size={12} /> {s}x
            </button>
          ))}
          <span className="text-[10px] font-black tracking-widest text-zinc-600 ml-2">
            {(frames[frameIdx].t / 1000).toFixed(1)}s / {(totalMs / 1000).toFixed(1)}s
          </span>
        </div>
      </div>
    </div>
  );
};
