import { useMemo, memo } from 'react';
import { motion } from 'framer-motion';
import type { Theme } from '@/data/constants';
import { FINGER_MAP, FINGER_STYLE } from './keyboardMap';
import { springSnappy } from './academyMotion';

interface VirtualKeyboardProps {
  activeKey: string;
  activeFinger: string;
  keyErrorHeatmap?: Record<string, number>;
  lastKeystroke?: { key: string; isCorrect: boolean; timestamp: number } | null;
  /** True when the current step needs Shift held down. */
  requiresShift?: boolean;
  /** Which pinky should hold Shift — always opposite the target key. */
  shiftFinger?: string;
  capsLockOn?: boolean;
  theme?: Theme;
}

const ROWS = [
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '='],
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', '[', ']'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ';', "'"],
  ['LSHIFT', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', ',', '.', '/', 'RSHIFT'],
  ['SPACE'],
];

export const VirtualKeyboard = memo(function VirtualKeyboard({
  activeKey,
  activeFinger,
  keyErrorHeatmap,
  lastKeystroke,
  requiresShift,
  shiftFinger,
  capsLockOn,
  theme,
}: VirtualKeyboardProps) {
  const normalizedActive = useMemo(() => activeKey.toUpperCase(), [activeKey]);
  const themeGlow = theme?.glowPrimary || '0, 240, 255';
  const shiftSide = shiftFinger?.startsWith('left') ? 'LSHIFT' : shiftFinger?.startsWith('right') ? 'RSHIFT' : '';

  return (
    <div
      className="flex flex-col items-start gap-[8px] select-none w-full p-4 rounded-2xl border shadow-2xl backdrop-blur-xl"
      style={{
        background: 'rgba(8, 10, 18, 0.45)',
        borderColor: `rgba(${themeGlow}, 0.25)`,
        boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 20px rgba(${themeGlow}, 0.12)`
      }}
    >
      {/* Caps Lock warning LED — Shift discipline depends on it being off */}
      {capsLockOn && (
        <div className="self-end flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-amber-500/50 bg-amber-500/15 text-amber-300 font-mono text-[9px] font-black uppercase tracking-[0.18em] animate-pulse">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)]" />
          Caps Lock On
        </div>
      )}

      {ROWS.map((row, rowIdx) => (
        <div
          key={rowIdx}
          className={`flex gap-[6px] ${rowIdx === 1 ? 'ml-[14px]' : rowIdx === 2 ? 'ml-[30px]' : rowIdx === 4 ? 'w-full justify-center' : ''
            }`}
        >
          {row.map(key => {
            const isSpace = key === 'SPACE';
            const isShiftKey = key === 'LSHIFT' || key === 'RSHIFT';
            /** The Shift the current step expects — always the opposite hand. */
            const isShiftTarget = isShiftKey && !!requiresShift && key === shiftSide;
            const isActive = isShiftTarget
              || (!isShiftKey && (key === normalizedActive || (isSpace && normalizedActive === ' ')));
            const finger = FINGER_MAP[key] || '';
            const isHinted = !isActive && !isShiftKey && !!activeFinger && finger === activeFinger;
            const isAnchor = key === 'F' || key === 'J';
            const fStyle = FINGER_STYLE[finger];

            // Heatmap error frequency
            const lowerKey = isSpace ? ' ' : key.toLowerCase();
            const errorCount = !isShiftKey && keyErrorHeatmap ? (keyErrorHeatmap[lowerKey] || 0) : 0;
            const hasErrorHeat = errorCount > 0 && !isActive;

            // Live Strike feedback
            const isLastPressed = Boolean(
              !isShiftKey && lastKeystroke &&
              (isSpace ? lastKeystroke.key === ' ' : lastKeystroke.key.toUpperCase() === key)
            );

            return (
              <motion.div
                key={key}
                // Spring, not a CSS scale class: the target key settles with the
                // same physics as everything else in the Academy.
                animate={{
                  scale: isActive ? 1.16 : isLastPressed ? 1.08 : isHinted ? 1.03 : 1,
                  y: isLastPressed ? 2 : 0,
                }}
                transition={springSnappy}
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
                  transition-all duration-150 overflow-visible
                  ${isSpace
                    ? 'h-11 w-64 text-[11px] tracking-[0.3em] uppercase'
                    : isShiftKey
                      ? 'w-[52px] h-[44px] text-[14px]'
                      : 'w-[44px] h-[44px] text-[13px]'}
                  ${isActive ? 'z-20 font-black ring-2 ring-white/70' : isHinted || isLastPressed ? 'z-10' : 'z-0'}
                `}
              >
                {/* Active key: pulsing ping ring + breathing halo */}
                {isActive && (
                  <>
                    <span
                      className="absolute inset-0 rounded-xl animate-ping pointer-events-none"
                      style={{ border: `2px solid rgba(${themeGlow}, 0.9)`, animationDuration: '1.1s' }}
                    />
                    <span
                      className="absolute -inset-1 rounded-2xl blur-md pointer-events-none animate-pulse"
                      style={{ background: `radial-gradient(circle, rgba(${themeGlow},0.55), transparent 70%)`, animationDuration: '1.6s' }}
                    />
                  </>
                )}

                {/* Correct-strike ripple burst */}
                {isLastPressed && lastKeystroke?.isCorrect && (
                  <span
                    key={lastKeystroke.timestamp}
                    className="absolute left-1/2 top-1/2 w-10 h-10 rounded-full pointer-events-none animate-key-ripple"
                    style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.9), rgba(16,185,129,0) 70%)' }}
                  />
                )}
                {/* Wrong-strike ripple burst */}
                {isLastPressed && lastKeystroke && !lastKeystroke.isCorrect && (
                  <span
                    key={lastKeystroke.timestamp}
                    className="absolute left-1/2 top-1/2 w-10 h-10 rounded-full pointer-events-none animate-key-ripple"
                    style={{ background: 'radial-gradient(circle, rgba(239,68,68,0.9), rgba(239,68,68,0) 70%)' }}
                  />
                )}

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

                <span className="relative z-10">
                  {isSpace ? 'SPACE' : isShiftKey ? '⇧' : key}
                </span>

                {/* "Hold" hint on the Shift the step expects */}
                {isShiftTarget && (
                  <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 font-mono text-[8px] font-black uppercase tracking-widest text-white/80 whitespace-nowrap">
                    hold
                  </span>
                )}


                {/* Anchor Key Notch (F & J) */}
                {isAnchor && (
                  <span
                    className="absolute bottom-[4px] left-1/2 -translate-x-1/2 w-3 h-[2px] rounded-full"
                    style={{ background: isActive ? '#ffffff' : '#22d3ee' }}
                  />
                )}
              </motion.div>
            );
          })}
        </div>
      ))}
    </div>
  );
});

