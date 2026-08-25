import { motion } from 'framer-motion';
import { useMemo, memo } from 'react';
import { FINGER_MAP } from './keyboardMap';

interface CyberHandsProps {
  activeKey: string;
  activeFinger: string;
}

interface FingerDef {
  id: string;
  name: string;
  hand: 'left' | 'right';
  homeKey: string;
  color: string;
  bgGlow: string;
  // Position offsets within hand SVG
  x: number;
  y: number;
  height: number;
  width: number;
  rotation: number;
}

const LEFT_FINGERS: FingerDef[] = [
  { id: 'left-pinky', name: 'Pinky', hand: 'left', homeKey: 'A', color: '#f43f5e', bgGlow: 'rgba(244,63,94,0.4)', x: 18, y: 35, height: 55, width: 17, rotation: -12 },
  { id: 'left-ring', name: 'Ring', hand: 'left', homeKey: 'S', color: '#f97316', bgGlow: 'rgba(249,115,22,0.4)', x: 40, y: 16, height: 75, width: 18, rotation: -5 },
  { id: 'left-middle', name: 'Middle', hand: 'left', homeKey: 'D', color: '#eab308', bgGlow: 'rgba(234,179,8,0.4)', x: 63, y: 6, height: 85, width: 19, rotation: 0 },
  { id: 'left-index', name: 'Index', hand: 'left', homeKey: 'F', color: '#84cc16', bgGlow: 'rgba(132,204,22,0.4)', x: 87, y: 18, height: 74, width: 19, rotation: 6 },
  { id: 'thumb', name: 'Thumb', hand: 'left', homeKey: '␣', color: '#f59e0b', bgGlow: 'rgba(245,158,11,0.4)', x: 112, y: 55, height: 48, width: 20, rotation: 28 },
];

const RIGHT_FINGERS: FingerDef[] = [
  { id: 'thumb', name: 'Thumb', hand: 'right', homeKey: '␣', color: '#f59e0b', bgGlow: 'rgba(245,158,11,0.4)', x: 18, y: 55, height: 48, width: 20, rotation: -28 },
  { id: 'right-index', name: 'Index', hand: 'right', homeKey: 'J', color: '#10b981', bgGlow: 'rgba(16,185,129,0.4)', x: 44, y: 18, height: 74, width: 19, rotation: -6 },
  { id: 'right-middle', name: 'Middle', hand: 'right', homeKey: 'K', color: '#06b6d4', bgGlow: 'rgba(6,182,212,0.4)', x: 68, y: 6, height: 85, width: 19, rotation: 0 },
  { id: 'right-ring', name: 'Ring', hand: 'right', homeKey: 'L', color: '#3b82f6', bgGlow: 'rgba(59,130,246,0.4)', x: 92, y: 16, height: 75, width: 18, rotation: 5 },
  { id: 'right-pinky', name: 'Pinky', hand: 'right', homeKey: ';', color: '#8b5cf6', bgGlow: 'rgba(139,92,246,0.4)', x: 115, y: 35, height: 55, width: 17, rotation: 12 },
];

function HandGraphic({
  hand,
  fingers,
  activeFingerId
}: {
  hand: 'left' | 'right';
  fingers: FingerDef[];
  activeFingerId: string;
}) {
  return (
    <div className="flex flex-col items-center">
      {/* Hand Label */}
      <span className="text-[10px] font-mono font-bold tracking-[0.2em] text-zinc-400 uppercase mb-1">
        {hand === 'left' ? 'Left Hand' : 'Right Hand'}
      </span>

      {/* SVG Hand Body */}
      <div className="relative w-[150px] h-[135px] bg-zinc-950/70 rounded-2xl border border-white/10 p-2 shadow-xl backdrop-blur-md overflow-hidden">
        {/* Subtle Palm Mesh */}
        <div
          className="absolute bottom-1 left-3 right-3 h-16 rounded-t-2xl bg-zinc-900/80 border border-white/5 flex items-center justify-center"
          style={{
            boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.8)',
          }}
        >
          <span className="text-[8px] font-mono font-bold tracking-widest text-zinc-600 uppercase">
            {hand === 'left' ? 'L-PALM' : 'R-PALM'}
          </span>
        </div>

        {/* Fingers */}
        <svg className="w-full h-full" viewBox="0 0 150 135">
          {fingers.map((f) => {
            const isActive = activeFingerId === f.id;

            return (
              <motion.g
                key={f.id + f.hand}
                animate={
                  isActive
                    ? { y: -6, scale: 1.05 }
                    : { y: 0, scale: 1 }
                }
                transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                style={{
                  transformOrigin: `${f.x + f.width / 2}px ${f.y + f.height}px`,
                }}
              >
                {/* Finger Glow aura when active */}
                {isActive && (
                  <rect
                    x={f.x - 3}
                    y={f.y - 3}
                    width={f.width + 6}
                    height={f.height + 6}
                    rx={(f.width + 6) / 2}
                    fill={f.color}
                    opacity={0.4}
                    filter="blur(6px)"
                  />
                )}

                {/* Finger Capsule Body */}
                <rect
                  x={f.x}
                  y={f.y}
                  width={f.width}
                  height={f.height}
                  rx={f.width / 2}
                  fill={isActive ? 'rgba(24, 30, 48, 0.95)' : 'rgba(18, 22, 34, 0.85)'}
                  stroke={isActive ? f.color : 'rgba(255, 255, 255, 0.12)'}
                  strokeWidth={isActive ? 2.5 : 1}
                  style={{
                    filter: isActive ? `drop-shadow(0 0 8px ${f.color})` : 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
                  }}
                />

                {/* Knuckle Joint Ring */}
                <line
                  x1={f.x + 2}
                  y1={f.y + f.height * 0.45}
                  x2={f.x + f.width - 2}
                  y2={f.y + f.height * 0.45}
                  stroke={isActive ? f.color : 'rgba(255, 255, 255, 0.2)'}
                  strokeWidth={1.5}
                  strokeDasharray="2 2"
                />

                {/* Fingertip Sensor Dot */}
                <circle
                  cx={f.x + f.width / 2}
                  cy={f.y + 9}
                  r={isActive ? 4.5 : 3.5}
                  fill={f.color}
                  opacity={isActive ? 1 : 0.7}
                  style={{
                    filter: isActive ? `drop-shadow(0 0 6px ${f.color})` : 'none',
                  }}
                />

                {/* Home Key Text badge on finger */}
                <text
                  x={f.x + f.width / 2}
                  y={f.y + f.height - 8}
                  textAnchor="middle"
                  fill={isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.6)'}
                  fontSize="9"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {f.homeKey}
                </text>
              </motion.g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

export const CyberHands = memo(function CyberHands({ activeKey, activeFinger }: CyberHandsProps) {
  const normalizedKey = useMemo(() => {
    const k = activeKey.toUpperCase();
    return k === ' ' ? 'SPACE' : k;
  }, [activeKey]);

  const targetFinger = FINGER_MAP[normalizedKey] || activeFinger;

  return (
    <div className="w-full flex items-center justify-center gap-8 mt-2 select-none">
      <HandGraphic
        hand="left"
        fingers={LEFT_FINGERS}
        activeFingerId={targetFinger.startsWith('left') || targetFinger === 'thumb' ? targetFinger : ''}
      />
      <HandGraphic
        hand="right"
        fingers={RIGHT_FINGERS}
        activeFingerId={targetFinger.startsWith('right') || targetFinger === 'thumb' ? targetFinger : ''}
      />
    </div>
  );
});
