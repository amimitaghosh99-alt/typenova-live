import { useMemo, memo } from 'react';
import type { Theme } from '@/data/constants';

interface VirtualKeyboardProps {
  activeKey: string;
  activeFinger: string;
  keyErrorHeatmap?: Record<string, number>;
  lastKeystroke?: { key: string; isCorrect: boolean; timestamp: number } | null;
  theme?: Theme;
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

export const VirtualKeyboard = memo(function VirtualKeyboard({ 
  activeKey, 
  activeFinger,
  keyErrorHeatmap,
  lastKeystroke,
  theme,
}: VirtualKeyboardProps) {
  const normalizedActive = useMemo(() => activeKey.toUpperCase(), [activeKey]);
  const themeGlow = theme?.glowPrimary || '0, 240, 255';

  return (
    <div 
      className="flex flex-col items-start gap-[8px] select-none w-full p-4 rounded-2xl border shadow-2xl backdrop-blur-xl"
      style={{
        background: 'rgba(8, 10, 18, 0.45)',
        borderColor: `rgba(${themeGlow}, 0.25)`,
        boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 20px rgba(${themeGlow}, 0.12)`
      }}
    >
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

            // Heatmap error frequency
            const lowerKey = isSpace ? ' ' : key.toLowerCase();
            const errorCount = keyErrorHeatmap ? (keyErrorHeatmap[lowerKey] || 0) : 0;
            const hasErrorHeat = errorCount > 0 && !isActive;

            // Live Strike feedback
            const isLastPressed = Boolean(
              lastKeystroke && (isSpace ? lastKeystroke.key === ' ' : lastKeystroke.key.toUpperCase() === key)
            );

            return (
              <div
                key={key}
                style={
                  isActive
                    ? {
                        background: `linear-gradient(135deg, rgba(${themeGlow}, 0.65) 0%, rgba(${themeGlow}, 0.35) 100%)`,
                        borderColor: `rgb(${themeGlow})`,
                        color: '#ffffff',
                        boxShadow: `0 0 25px rgba(${themeGlow}, 0.9), inset 0 0 12px rgba(255,255,255,0.6)`,
                      }
                    : isLastPressed
                    ? {
                        background: lastKeystroke?.isCorrect ? 'rgba(16,185,129,0.45)' : 'rgba(239,68,68,0.55)',
                        borderColor: lastKeystroke?.isCorrect ? '#10b981' : '#ef4444',
                        color: '#ffffff',
                        boxShadow: lastKeystroke?.isCorrect ? '0 0 20px rgba(16,185,129,0.8)' : '0 0 20px rgba(239,68,68,0.8)',
                      }
                    : isHinted
                    ? {
                        background: 'rgba(20, 26, 42, 0.70)',
                        borderColor: fStyle ? `${fStyle.indicator}70` : 'rgba(255,255,255,0.25)',
                        color: '#ffffff',
                        boxShadow: fStyle ? `0 0 10px ${fStyle.indicator}30` : 'none',
                      }
                    : hasErrorHeat
                    ? {
                        background: 'rgba(239, 68, 68, 0.25)',
                        borderColor: 'rgba(239, 68, 68, 0.50)',
                        color: '#fca5a5',
                        boxShadow: '0 0 10px rgba(239,68,68,0.3)',
                      }
                    : {
                        background: 'rgba(14, 16, 26, 0.60)',
                        borderColor: 'rgba(255, 255, 255, 0.10)',
                        color: 'rgba(255, 255, 255, 0.85)',
                        boxShadow: '0 4px 10px rgba(0,0,0,0.4), inset 0 1px 1px rgba(255,255,255,0.08)',
                      }
                }
                className={`
                  relative flex items-center justify-center font-mono font-bold rounded-xl border
                  transition-all duration-150 overflow-hidden
                  ${isSpace ? 'h-11 text-[11px] tracking-[0.3em] uppercase' : 'w-[45px] h-[45px] text-[14px]'}
                  ${isSpace ? 'w-64' : ''}
                  ${isActive ? 'scale-[1.14] z-20 font-black ring-2 ring-white/60 animate-pulse' : isHinted ? 'scale-[1.03] z-10' : isLastPressed ? 'scale-[1.08] z-10' : 'z-0'}
                `}
              >
                {/* Finger Indicator Dot on top */}
                {fStyle && !isActive && !hasErrorHeat && (
                  <span 
                    className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full opacity-60" 
                    style={{ background: fStyle.indicator }}
                  />
                )}

                {/* Error count badge on heatmap */}
                {hasErrorHeat && (
                  <span className="absolute top-0.5 right-1 text-[9px] font-mono text-red-400 font-black">
                    {errorCount}
                  </span>
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

