/* eslint-disable react-refresh/only-export-components */
import { useMemo, memo } from 'react';

interface VirtualKeyboardProps {
  activeKey: string;
  activeFinger: string;
}

const ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ';'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
  ['SPACE'],
];

export const FINGER_MAP: Record<string, string> = {
  Q: 'left-pinky',  A: 'left-pinky',  Z: 'left-pinky',
  W: 'left-ring',   S: 'left-ring',   X: 'left-ring',
  E: 'left-middle', D: 'left-middle', C: 'left-middle',
  R: 'left-index',  F: 'left-index',  V: 'left-index',
  T: 'left-index',  G: 'left-index',  B: 'left-index',
  Y: 'right-index', H: 'right-index', N: 'right-index',
  U: 'right-index', J: 'right-index', M: 'right-index',
  I: 'right-middle',K: 'right-middle',
  O: 'right-ring',  L: 'right-ring',
  P: 'right-pinky', ';': 'right-pinky',
  SPACE: 'thumb',
};

// Inline style objects for finger tints — avoids Tailwind purge issues with dynamic classes
const FINGER_STYLE: Record<string, { bg: string; border: string; color: string; indicator: string }> = {
  'left-pinky':   { bg: 'rgba(244,63,94,0.14)',   border: 'rgba(244,63,94,0.40)',   color: '#fda4af', indicator: '#f43f5e' },
  'left-ring':    { bg: 'rgba(249,115,22,0.14)',  border: 'rgba(249,115,22,0.40)',  color: '#fdba74', indicator: '#f97316' },
  'left-middle':  { bg: 'rgba(234,179,8,0.14)',   border: 'rgba(234,179,8,0.40)',   color: '#fde047', indicator: '#eab308' },
  'left-index':   { bg: 'rgba(132,204,22,0.16)',  border: 'rgba(132,204,22,0.45)',  color: '#bef264', indicator: '#84cc16' },
  'right-index':  { bg: 'rgba(16,185,129,0.16)',  border: 'rgba(16,185,129,0.45)', color: '#6ee7b7', indicator: '#10b981' },
  'right-middle': { bg: 'rgba(6,182,212,0.14)',   border: 'rgba(6,182,212,0.40)',  color: '#67e8f9', indicator: '#06b6d4' },
  'right-ring':   { bg: 'rgba(59,130,246,0.14)',  border: 'rgba(59,130,246,0.40)', color: '#93c5fd', indicator: '#3b82f6' },
  'right-pinky':  { bg: 'rgba(139,92,246,0.14)',  border: 'rgba(139,92,246,0.40)', color: '#c4b5fd', indicator: '#8b5cf6' },
  'thumb':        { bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.30)', color: '#fcd34d', indicator: '#f59e0b' },
};

export const VirtualKeyboard = memo(function VirtualKeyboard({ activeKey, activeFinger }: VirtualKeyboardProps) {
  const normalizedActive = useMemo(() => activeKey.toUpperCase(), [activeKey]);

  return (
    <div className="flex flex-col items-start gap-[8px] select-none w-full p-4 rounded-2xl bg-zinc-950/70 border border-white/10 shadow-2xl backdrop-blur-xl">
      {ROWS.map((row, rowIdx) => (
        <div
          key={rowIdx}
          className={`flex gap-[8px] ${
            rowIdx === 1 ? 'ml-[20px]' : rowIdx === 2 ? 'ml-[48px]' : rowIdx === 3 ? 'w-full justify-center' : ''
          }`}
        >
          {row.map(key => {
            const isActive  = key === normalizedActive || (key === 'SPACE' && normalizedActive === ' ');
            const finger    = FINGER_MAP[key] || '';
            const isHinted  = !isActive && activeFinger && finger === activeFinger;
            const isSpace   = key === 'SPACE';
            const isAnchor  = key === 'F' || key === 'J';
            const fStyle    = FINGER_STYLE[finger];

            return (
              <div
                key={key}
                style={
                  isActive
                    ? {
                        background: 'linear-gradient(135deg, rgba(6,182,212,0.45) 0%, rgba(16,185,129,0.35) 100%)',
                        borderColor: '#22d3ee',
                        color: '#ffffff',
                        boxShadow: '0 0 25px rgba(34,211,238,0.8), inset 0 0 12px rgba(255,255,255,0.5)',
                      }
                    : isHinted
                    ? {
                        background: 'rgba(28, 34, 52, 0.95)',
                        borderColor: fStyle ? `${fStyle.indicator}60` : 'rgba(255,255,255,0.2)',
                        color: '#ffffff',
                        boxShadow: fStyle ? `0 0 8px ${fStyle.indicator}25` : 'none',
                      }
                    : {
                        background: 'rgba(16, 20, 32, 0.92)',
                        borderColor: 'rgba(255, 255, 255, 0.08)',
                        color: 'rgba(255, 255, 255, 0.80)',
                        boxShadow: '0 4px 10px rgba(0,0,0,0.6), inset 0 1px 1px rgba(255,255,255,0.08)',
                      }
                }
                className={`
                  relative flex items-center justify-center font-mono font-bold rounded-xl border
                  transition-all duration-150 overflow-hidden
                  ${isSpace ? 'h-11 text-[11px] tracking-[0.3em] uppercase' : 'w-[45px] h-[45px] text-[14px]'}
                  ${isSpace ? 'w-64' : ''}
                  ${isActive ? 'scale-[1.12] z-20 font-black ring-2 ring-cyan-400/50' : isHinted ? 'scale-[1.02] z-10' : 'z-0'}
                `}
              >
                {/* Finger Indicator Dot on top */}
                {fStyle && !isActive && (
                  <span 
                    className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full opacity-60" 
                    style={{ background: fStyle.indicator }}
                  />
                )}

                {isActive && (
                  <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
                )}
                
                <span className="relative z-10">{isSpace ? 'SPACE' : key}</span>
                
                {/* Anchor Key Notch (F & J) */}
                {isAnchor && (
                  <span
                    className="absolute bottom-[4px] left-1/2 -translate-x-1/2 w-3 h-[2px] rounded-full"
                    style={{ background: isActive ? '#ffffff' : '#22d3ee' }}
                  />
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
});
