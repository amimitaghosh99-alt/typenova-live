/* eslint-disable react-refresh/only-export-components */
import { useMemo } from 'react';

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
const FINGER_STYLE: Record<string, { bg: string; border: string; color: string }> = {
  'left-pinky':   { bg: 'rgba(244,63,94,0.10)',   border: 'rgba(244,63,94,0.30)',   color: 'rgba(253,164,175,0.85)' },
  'left-ring':    { bg: 'rgba(249,115,22,0.10)',  border: 'rgba(249,115,22,0.30)',  color: 'rgba(253,186,116,0.85)' },
  'left-middle':  { bg: 'rgba(234,179,8,0.10)',   border: 'rgba(234,179,8,0.30)',   color: 'rgba(253,224,71,0.85)'  },
  'left-index':   { bg: 'rgba(132,204,22,0.12)',  border: 'rgba(132,204,22,0.35)',  color: 'rgba(190,242,100,0.90)' },
  'right-index':  { bg: 'rgba(16,185,129,0.12)',  border: 'rgba(16,185,129,0.35)', color: 'rgba(110,231,183,0.90)' },
  'right-middle': { bg: 'rgba(6,182,212,0.10)',   border: 'rgba(6,182,212,0.30)',  color: 'rgba(103,232,249,0.85)' },
  'right-ring':   { bg: 'rgba(59,130,246,0.10)',  border: 'rgba(59,130,246,0.30)', color: 'rgba(147,197,253,0.85)' },
  'right-pinky':  { bg: 'rgba(139,92,246,0.10)',  border: 'rgba(139,92,246,0.30)', color: 'rgba(196,181,253,0.85)' },
  'thumb':        { bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.20)', color: 'rgba(252,211,77,0.80)'  },
};

export function VirtualKeyboard({ activeKey, activeFinger }: VirtualKeyboardProps) {
  const normalizedActive = useMemo(() => activeKey.toUpperCase(), [activeKey]);

  return (
    <div className="flex flex-col items-start gap-[7px] select-none w-full">
      {ROWS.map((row, rowIdx) => (
        <div
          key={rowIdx}
          className={`flex gap-[7px] ${
            rowIdx === 1 ? 'ml-[18px]' : rowIdx === 2 ? 'ml-[46px]' : rowIdx === 3 ? 'w-full justify-center' : ''
          }`}
        >
          {row.map(key => {
            const isActive  = key === normalizedActive || (key === 'SPACE' && normalizedActive === ' ');
            const finger    = FINGER_MAP[key] || '';
            const isHinted  = !isActive && activeFinger && finger === activeFinger;
            const isSpace   = key === 'SPACE';
            const isAnchor  = key === 'F' || key === 'J';
            const fStyle    = FINGER_STYLE[finger];

            const baseStyle: React.CSSProperties = {
              background: fStyle ? fStyle.bg : 'rgba(255,255,255,0.03)',
              borderColor: fStyle ? fStyle.border : 'rgba(255,255,255,0.07)',
              color: fStyle ? fStyle.color : 'rgba(255,255,255,0.25)',
            };

            return (
              <div
                key={key}
                style={
                  isActive
                    ? {
                        background: 'rgba(245,158,11,0.22)',
                        borderColor: '#f59e0b',
                        color: '#fef3c7',
                        boxShadow: '0 0 22px rgba(245,158,11,0.55), inset 0 0 14px rgba(245,158,11,0.25)',
                      }
                    : isHinted
                    ? {
                        background: fStyle ? fStyle.bg.replace('0.12', '0.18').replace('0.10', '0.16') : 'rgba(255,255,255,0.06)',
                        borderColor: fStyle ? fStyle.border.replace('0.35', '0.55').replace('0.30', '0.50') : 'rgba(255,255,255,0.18)',
                        color: fStyle ? fStyle.color : 'rgba(255,255,255,0.6)',
                        boxShadow: fStyle ? `0 0 12px ${fStyle.bg.replace(/[\d.]+\)$/, '0.4)')}` : 'none',
                      }
                    : baseStyle
                }
                className={`
                  relative flex items-center justify-center font-bold rounded-[10px] border
                  transition-all duration-200 overflow-hidden backdrop-blur-sm
                  ${isSpace ? 'h-11 text-[10px] tracking-[0.3em] uppercase' : 'w-[46px] h-[46px] text-[13px] tracking-wider'}
                  ${isSpace ? 'w-64' : ''}
                  ${isActive ? 'scale-[1.08] z-20' : isHinted ? 'scale-[1.04] z-10' : 'z-0'}
                `}
              >
                {isActive && (
                  <div className="absolute inset-0 bg-gradient-to-b from-amber-300/20 to-transparent pointer-events-none" />
                )}
                <span className="relative z-10">{isSpace ? 'SPACE' : key}</span>
                {isAnchor && (
                  <span
                    className="absolute bottom-[5px] left-1/2 -translate-x-1/2 w-[5px] h-[5px] rounded-full"
                    style={{ background: isActive ? 'rgba(245,158,11,0.8)' : 'rgba(255,255,255,0.35)' }}
                  />
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
