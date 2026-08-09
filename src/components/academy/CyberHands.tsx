import { motion } from 'framer-motion';
import { useMemo } from 'react';
import { FINGER_MAP } from './VirtualKeyboard';

interface CyberHandsProps {
  activeKey: string;
  activeFinger: string;
}

export interface KeyInfo {
  x: number;
  y: number;
  row: number;
  finger: string;
}

export const KEY_MAP: Record<string, KeyInfo> = {
  // Row 0 (Top Row) — Y=23
  Q: { x: 23, y: 23, row: 0, finger: 'left-pinky' },
  W: { x: 76, y: 23, row: 0, finger: 'left-ring' },
  E: { x: 129, y: 23, row: 0, finger: 'left-middle' },
  R: { x: 182, y: 23, row: 0, finger: 'left-index' },
  T: { x: 235, y: 23, row: 0, finger: 'left-index' },
  Y: { x: 288, y: 23, row: 0, finger: 'right-index' },
  U: { x: 341, y: 23, row: 0, finger: 'right-index' },
  I: { x: 394, y: 23, row: 0, finger: 'right-middle' },
  O: { x: 447, y: 23, row: 0, finger: 'right-ring' },
  P: { x: 500, y: 23, row: 0, finger: 'right-pinky' },

  // Row 1 (Home Row) — Y=76
  A: { x: 41, y: 76, row: 1, finger: 'left-pinky' },
  S: { x: 94, y: 76, row: 1, finger: 'left-ring' },
  D: { x: 147, y: 76, row: 1, finger: 'left-middle' },
  F: { x: 200, y: 76, row: 1, finger: 'left-index' },
  G: { x: 253, y: 76, row: 1, finger: 'left-index' },
  H: { x: 306, y: 76, row: 1, finger: 'right-index' },
  J: { x: 359, y: 76, row: 1, finger: 'right-index' },
  K: { x: 412, y: 76, row: 1, finger: 'right-middle' },
  L: { x: 465, y: 76, row: 1, finger: 'right-ring' },
  ';': { x: 518, y: 76, row: 1, finger: 'right-pinky' },

  // Row 2 (Bottom Row) — Y=129
  Z: { x: 69, y: 129, row: 2, finger: 'left-pinky' },
  X: { x: 122, y: 129, row: 2, finger: 'left-ring' },
  C: { x: 175, y: 129, row: 2, finger: 'left-middle' },
  V: { x: 228, y: 129, row: 2, finger: 'left-index' },
  B: { x: 281, y: 129, row: 2, finger: 'left-index' },
  N: { x: 334, y: 129, row: 2, finger: 'right-index' },
  M: { x: 387, y: 129, row: 2, finger: 'right-index' },

  // Row 3 (Spacebar) — Y=182
  SPACE: { x: 276, y: 182, row: 3, finger: 'thumb' },
};

export interface HologramFinger {
  id: string;
  hand: 'left' | 'right';
  fingerMapId?: string;
  tip: [number, number];
  dip: [number, number];
  pip: [number, number];
  mcp: [number, number];
  contourPath: string;
  wireframeLines: string[];
}

export const LEFT_HOLOGRAM_FINGERS: HologramFinger[] = [
  {
    id: 'left-pinky',
    hand: 'left',
    tip: [41, 76],
    dip: [43, 115],
    pip: [48, 160],
    mcp: [60, 230],
    contourPath: 'M 48,245 C 49,235 44,190 35,145 C 31,90 34,70 41,76 C 48,70 51,90 49,115 C 47,145 57,190 69,235 L 70,245 C 60,250 56,250 48,245 Z',
    wireframeLines: [
      'M 33,115 L 49,115',
      'M 37,160 L 55,160',
      'M 43,195 L 62,195',
      'M 60,230 L 41,76',
    ],
  },
  {
    id: 'left-ring',
    hand: 'left',
    tip: [94, 76],
    dip: [95, 112],
    pip: [96, 155],
    mcp: [98, 225],
    contourPath: 'M 83,240 C 84,230 84,185 85,140 C 87,88 89,68 94,76 C 99,68 101,88 102,112 C 103,140 104,185 108,230 L 109,240 C 96,245 92,245 83,240 Z',
    wireframeLines: [
      'M 86,112 L 102,112',
      'M 85,155 L 104,155',
      'M 85,190 L 105,190',
      'M 98,225 L 94,76',
    ],
  },
  {
    id: 'left-middle',
    hand: 'left',
    tip: [147, 76],
    dip: [146, 108],
    pip: [144, 152],
    mcp: [138, 224],
    contourPath: 'M 124,240 C 125,230 131,180 135,135 C 137,88 141,68 147,76 C 153,68 157,88 156,108 C 155,135 151,180 147,230 L 148,240 C 136,245 132,245 124,240 Z',
    wireframeLines: [
      'M 136,108 L 156,108',
      'M 134,152 L 154,152',
      'M 130,190 L 150,190',
      'M 138,224 L 147,76',
    ],
  },
  {
    id: 'left-index',
    hand: 'left',
    tip: [200, 76],
    dip: [194, 112],
    pip: [186, 156],
    mcp: [172, 228],
    contourPath: 'M 158,245 C 159,233 170,185 178,140 C 189,88 194,68 200,76 C 206,68 202,88 201,112 C 194,140 192,185 183,233 L 184,245 C 171,250 167,250 158,245 Z',
    wireframeLines: [
      'M 185,112 L 201,112',
      'M 178,156 L 195,156',
      'M 170,195 L 188,195',
      'M 172,228 L 200,76',
    ],
  },
  {
    id: 'thumb',
    hand: 'left',
    fingerMapId: 'thumb',
    tip: [232, 178],
    dip: [218, 202],
    pip: [198, 232],
    mcp: [170, 275],
    contourPath: 'M 154,285 C 160,278 176,248 198,218 C 222,178 236,170 234,182 C 224,208 205,242 191,280 L 198,290 C 175,295 165,292 154,285 Z',
    wireframeLines: [
      'M 198,232 L 216,215',
      'M 185,255 L 205,238',
      'M 170,275 L 232,178',
    ],
  },
];

export const RIGHT_HOLOGRAM_FINGERS: HologramFinger[] = [
  {
    id: 'thumb-right',
    hand: 'right',
    fingerMapId: 'thumb',
    tip: [320, 178],
    dip: [334, 202],
    pip: [354, 232],
    mcp: [382, 275],
    contourPath: 'M 398,285 C 392,278 376,248 354,218 C 330,178 316,170 318,182 C 328,208 347,242 361,280 L 354,290 C 377,295 387,292 398,285 Z',
    wireframeLines: [
      'M 354,232 L 336,215',
      'M 367,255 L 347,238',
      'M 382,275 L 320,178',
    ],
  },
  {
    id: 'right-index',
    hand: 'right',
    tip: [359, 76],
    dip: [365, 112],
    pip: [372, 156],
    mcp: [386, 228],
    contourPath: 'M 368,245 C 369,233 360,185 358,140 C 350,88 346,68 352,76 C 358,68 363,88 367,112 C 374,140 382,185 393,233 L 394,245 C 385,250 377,250 368,245 Z',
    wireframeLines: [
      'M 351,112 L 367,112',
      'M 357,156 L 374,156',
      'M 364,195 L 382,195',
      'M 386,228 L 359,76',
    ],
  },
  {
    id: 'right-middle',
    hand: 'right',
    tip: [412, 76],
    dip: [413, 108],
    pip: [415, 152],
    mcp: [420, 224],
    contourPath: 'M 404,240 C 405,230 401,180 397,135 C 395,88 399,68 405,76 C 411,68 415,88 416,108 C 417,135 421,180 427,230 L 428,240 C 416,245 412,245 404,240 Z',
    wireframeLines: [
      'M 396,108 L 416,108',
      'M 398,152 L 418,152',
      'M 402,190 L 422,190',
      'M 420,224 L 412,76',
    ],
  },
  {
    id: 'right-ring',
    hand: 'right',
    tip: [465, 76],
    dip: [464, 112],
    pip: [463, 155],
    mcp: [454, 225],
    contourPath: 'M 443,240 C 444,230 446,185 447,140 C 449,88 451,68 456,76 C 461,68 463,88 464,112 C 465,140 466,185 468,230 L 469,240 C 460,245 452,245 443,240 Z',
    wireframeLines: [
      'M 448,112 L 464,112',
      'M 448,155 L 467,155',
      'M 447,190 L 467,190',
      'M 454,225 L 465,76',
    ],
  },
  {
    id: 'right-pinky',
    hand: 'right',
    tip: [518, 76],
    dip: [516, 115],
    pip: [511, 160],
    mcp: [492, 230],
    contourPath: 'M 482,245 C 483,235 494,190 504,145 C 501,90 504,70 511,76 C 517,70 520,90 519,115 C 517,145 508,190 503,235 L 504,245 C 496,250 492,250 482,245 Z',
    wireframeLines: [
      'M 502,115 L 519,115',
      'M 497,160 L 515,160',
      'M 490,195 L 509,195',
      'M 492,230 L 518,76',
    ],
  },
];

export function CyberHands({ activeKey, activeFinger }: CyberHandsProps) {
  const upperKey = useMemo(() => activeKey.toUpperCase(), [activeKey]);
  const normalizedKey = upperKey === " " ? "SPACE" : upperKey;

  const keyInfo = KEY_MAP[normalizedKey];
  const targetFinger = FINGER_MAP[normalizedKey] || activeFinger;

  const isLeftActive = targetFinger.startsWith("left") || (targetFinger === "thumb" && (keyInfo?.x === undefined || keyInfo.x <= 276));
  const isRightActive = targetFinger.startsWith("right") || (targetFinger === "thumb" && keyInfo?.x !== undefined && keyInfo.x > 276);

  // Compute unified hand movement
  const getHandTransform = (hand: "left" | "right") => {
    const isActive = hand === "left" ? isLeftActive : isRightActive;
    if (!isActive || !keyInfo) {
      return { x: 0, y: 0 };
    }

    const homeX = hand === "left" ? 200 : 359;
    const homeY = 76;

    const totalDx = keyInfo.x - homeX;
    const totalDy = keyInfo.y - homeY;

    return {
      x: totalDx * 0.18,
      y: totalDy * 0.22,
    };
  };

  // Compute correct anatomical joint rotation
  const getFingerTransform = (f: HologramFinger, isActive: boolean, hx: number, hy: number) => {
    if (!isActive || !keyInfo) {
      return { rotate: 0, scale: 1 };
    }

    const mcpAbsX = f.mcp[0] + hx;
    const mcpAbsY = f.mcp[1] + hy;

    const targetDx = keyInfo.x - mcpAbsX;
    const targetDy = keyInfo.y - mcpAbsY;

    const targetLength = Math.hypot(targetDx, targetDy);
    const targetAngle = Math.atan2(targetDy, targetDx);

    const restingDx = f.tip[0] - f.mcp[0];
    const restingDy = f.tip[1] - f.mcp[1];
    const restingLength = Math.hypot(restingDx, restingDy);
    const restingAngle = Math.atan2(restingDy, restingDx);

    let rotate = (targetAngle - restingAngle) * (180 / Math.PI);
    if (rotate > 180) rotate -= 360;
    if (rotate < -180) rotate += 360;
    
    // Natural anatomical limits
    rotate = Math.min(60, Math.max(-60, rotate));

    const scale = Math.min(1.8, Math.max(0.6, targetLength / restingLength));

    return {
      rotate,
      scale,
    };
  };

  const leftHandMotion = getHandTransform("left");
  const rightHandMotion = getHandTransform("right");

  const rippleX = keyInfo ? keyInfo.x : 0;
  const rippleY = keyInfo ? keyInfo.y : 0;

  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        zIndex: 1,
        maskImage: "linear-gradient(to bottom, black 0%, black 85%, transparent 98%)",
        WebkitMaskImage: "linear-gradient(to bottom, black 0%, black 85%, transparent 98%)",
      }}
    >
      <svg viewBox="0 0 552 400" className="w-full h-full drop-shadow-2xl" style={{ overflow: "visible" }}>
        <defs>
          <filter id="holo-emerald-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="8" result="blur1" />
            <feGaussianBlur stdDeviation="2" result="blur2" in="SourceGraphic" />
            <feMerge>
              <feMergeNode in="blur1" />
              <feMergeNode in="blur2" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="holo-cyan-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="8" result="blur1" />
            <feGaussianBlur stdDeviation="2" result="blur2" in="SourceGraphic" />
            <feMerge>
              <feMergeNode in="blur1" />
              <feMergeNode in="blur2" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <pattern id="scanlines" width="4" height="4" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="4" y2="0" stroke="currentColor" strokeOpacity="0.4" strokeWidth="1" />
          </pattern>

          <radialGradient id="holo-palm-l" cx="45%" cy="40%" r="65%">
            <stop offset="0%" stopColor="#00ff9d" stopOpacity="0.35" />
            <stop offset="45%" stopColor="#10b981" stopOpacity="0.15" />
            <stop offset="85%" stopColor="#059669" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#047857" stopOpacity="0.00" />
          </radialGradient>

          <radialGradient id="holo-palm-r" cx="55%" cy="40%" r="65%">
            <stop offset="0%" stopColor="#00e5ff" stopOpacity="0.35" />
            <stop offset="45%" stopColor="#06b6d4" stopOpacity="0.15" />
            <stop offset="85%" stopColor="#0891b2" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#0e7490" stopOpacity="0.00" />
          </radialGradient>
        </defs>

        {/* ── LEFT HOLOGRAPHIC HAND ── */}
        <motion.g
          id="left-holo-hand"
          animate={leftHandMotion}
          transition={{ type: "spring", stiffness: 350, damping: 28, mass: 0.9 }}
        >
          {/* Left Hologram Fingers */}
          {LEFT_HOLOGRAM_FINGERS.map(f => {
            const fid = f.fingerMapId ?? f.id;
            const isActive = isLeftActive && (targetFinger === "thumb" ? fid === "thumb" : fid === targetFinger);
            const motionProps = getFingerTransform(f, isActive, leftHandMotion.x, leftHandMotion.y);
            const glowColor = "#00ff9d";

            return (
              <motion.g
                key={f.id}
                animate={motionProps}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                style={{ transformOrigin: `${f.mcp[0]}px ${f.mcp[1]}px` }}
              >
                {/* Holographic Finger Volume */}
                <path
                  d={f.contourPath}
                  fill={isActive ? "rgba(0, 255, 157, 0.28)" : "rgba(0, 255, 157, 0.04)"}
                  stroke={isActive ? glowColor : "rgba(0, 255, 157, 0.25)"}
                  strokeWidth={isActive ? 2 : 1}
                  opacity={isActive ? 1 : 0.6}
                  filter={isActive ? "url(#holo-emerald-glow)" : undefined}
                />
                
                <path
                  d={f.contourPath}
                  fill="url(#scanlines)"
                  color="#00ff9d"
                  opacity={isActive ? 0.8 : 0.15}
                />

                {/* 3D Sci-Fi Wireframe Structural Lines */}
                {f.wireframeLines.map((line, idx) => {
                  const isBoneAxis = idx === f.wireframeLines.length - 1;
                  return (
                    <path
                      key={idx}
                      d={line}
                      stroke={isActive ? glowColor : "rgba(0, 255, 157, 0.35)"}
                      strokeWidth={isBoneAxis ? (isActive ? 2.5 : 1.2) : 0.8}
                      strokeDasharray={isBoneAxis ? "none" : "2 2"}
                      opacity={isActive ? 0.9 : (isBoneAxis ? 0 : 0.15)}
                      filter={isActive ? "url(#holo-emerald-glow)" : undefined}
                    />
                  );
                })}

                {/* Holographic Knuckle Joint Nodes */}
                <circle
                  cx={f.mcp[0]}
                  cy={f.mcp[1]}
                  r={isActive ? 4.5 : 2.5}
                  fill={glowColor}
                  stroke={isActive ? glowColor : "rgba(0, 255, 157, 0.5)"}
                  strokeWidth={isActive ? 1.5 : 0.5}
                  opacity={isActive ? 1 : 0.4}
                  filter={isActive ? "url(#holo-emerald-glow)" : undefined}
                />
                <circle
                  cx={f.pip[0]}
                  cy={f.pip[1]}
                  r={isActive ? 4.0 : 2.0}
                  fill={glowColor}
                  stroke={isActive ? glowColor : "rgba(0, 255, 157, 0.5)"}
                  strokeWidth={isActive ? 1.5 : 0.5}
                  opacity={isActive ? 1 : 0.4}
                  filter={isActive ? "url(#holo-emerald-glow)" : undefined}
                />
                <circle
                  cx={f.dip[0]}
                  cy={f.dip[1]}
                  r={isActive ? 3.5 : 1.8}
                  fill={glowColor}
                  stroke={isActive ? glowColor : "rgba(0, 255, 157, 0.5)"}
                  strokeWidth={isActive ? 1.5 : 0.5}
                  opacity={isActive ? 1 : 0.4}
                  filter={isActive ? "url(#holo-emerald-glow)" : undefined}
                />

                {/* Active Fingertip Luminous Node */}
                <motion.circle
                  cx={f.tip[0]}
                  cy={f.tip[1]}
                  animate={isActive ? { r: [6, 8.5, 6] } : { r: 3.5 }}
                  transition={{ repeat: Infinity, duration: 1.4, ease: "easeInOut" }}
                  fill={isActive ? glowColor : "rgba(0, 255, 157, 0.30)"}
                  stroke={glowColor}
                  strokeWidth={isActive ? 2 : 1}
                  opacity={isActive ? 1 : 0.2}
                  filter={isActive ? "url(#holo-emerald-glow)" : undefined}
                />
              </motion.g>
            );
          })}

          {/* Hologram Palm Mesh & Socket Rim */}
          <path
            d="M 50,390 C 40,320 42,260 50,230 L 85,225 L 126,224 L 160,228 C 178,255 174,330 166,390 Z"
            fill="url(#holo-palm-l)"
            stroke="#00ff9d"
            strokeWidth="1.2"
            opacity={isLeftActive ? 0.95 : 0.40}
          />
          <path
            d="M 50,390 C 40,320 42,260 50,230 L 85,225 L 126,224 L 160,228 C 178,255 174,330 166,390 Z"
            fill="url(#scanlines)"
            color="#00ff9d"
            opacity={isLeftActive ? 0.6 : 0.2}
          />
        </motion.g>

        {/* ── RIGHT HOLOGRAPHIC HAND ── */}
        <motion.g
          id="right-holo-hand"
          animate={rightHandMotion}
          transition={{ type: "spring", stiffness: 350, damping: 28, mass: 0.9 }}
        >
          {/* Right Hologram Fingers */}
          {RIGHT_HOLOGRAM_FINGERS.map(f => {
            const fid = f.fingerMapId ?? f.id;
            const isActive = isRightActive && (targetFinger === "thumb" ? fid === "thumb" : fid === targetFinger);
            const motionProps = getFingerTransform(f, isActive, rightHandMotion.x, rightHandMotion.y);
            const glowColor = "#00e5ff";

            return (
              <motion.g
                key={f.id}
                animate={motionProps}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                style={{ transformOrigin: `${f.mcp[0]}px ${f.mcp[1]}px` }}
              >
                {/* Holographic Finger Volume */}
                <path
                  d={f.contourPath}
                  fill={isActive ? "rgba(0, 229, 255, 0.28)" : "rgba(0, 229, 255, 0.04)"}
                  stroke={isActive ? glowColor : "rgba(0, 229, 255, 0.25)"}
                  strokeWidth={isActive ? 2 : 1}
                  opacity={isActive ? 1 : 0.6}
                  filter={isActive ? "url(#holo-cyan-glow)" : undefined}
                />

                <path
                  d={f.contourPath}
                  fill="url(#scanlines)"
                  color="#00e5ff"
                  opacity={isActive ? 0.8 : 0.15}
                />

                {/* 3D Sci-Fi Wireframe Structural Lines */}
                {f.wireframeLines.map((line, idx) => {
                  const isBoneAxis = idx === f.wireframeLines.length - 1;
                  return (
                    <path
                      key={idx}
                      d={line}
                      stroke={isActive ? glowColor : "rgba(0, 229, 255, 0.35)"}
                      strokeWidth={isBoneAxis ? (isActive ? 2.5 : 1.2) : 0.8}
                      strokeDasharray={isBoneAxis ? "none" : "2 2"}
                      opacity={isActive ? 0.9 : (isBoneAxis ? 0 : 0.15)}
                      filter={isActive ? "url(#holo-cyan-glow)" : undefined}
                    />
                  );
                })}

                {/* Holographic Knuckle Joint Nodes */}
                <circle
                  cx={f.mcp[0]}
                  cy={f.mcp[1]}
                  r={isActive ? 4.5 : 2.5}
                  fill={glowColor}
                  stroke={isActive ? glowColor : "rgba(0, 229, 255, 0.5)"}
                  strokeWidth={isActive ? 1.5 : 0.5}
                  opacity={isActive ? 1 : 0.4}
                  filter={isActive ? "url(#holo-cyan-glow)" : undefined}
                />
                <circle
                  cx={f.pip[0]}
                  cy={f.pip[1]}
                  r={isActive ? 4.0 : 2.0}
                  fill={glowColor}
                  stroke={isActive ? glowColor : "rgba(0, 229, 255, 0.5)"}
                  strokeWidth={isActive ? 1.5 : 0.5}
                  opacity={isActive ? 1 : 0.4}
                  filter={isActive ? "url(#holo-cyan-glow)" : undefined}
                />
                <circle
                  cx={f.dip[0]}
                  cy={f.dip[1]}
                  r={isActive ? 3.5 : 1.8}
                  fill={glowColor}
                  stroke={isActive ? glowColor : "rgba(0, 229, 255, 0.5)"}
                  strokeWidth={isActive ? 1.5 : 0.5}
                  opacity={isActive ? 1 : 0.4}
                  filter={isActive ? "url(#holo-cyan-glow)" : undefined}
                />

                {/* Active Fingertip Luminous Node */}
                <motion.circle
                  cx={f.tip[0]}
                  cy={f.tip[1]}
                  animate={isActive ? { r: [6, 8.5, 6] } : { r: 3.5 }}
                  transition={{ repeat: Infinity, duration: 1.4, ease: "easeInOut" }}
                  fill={isActive ? glowColor : "rgba(0, 229, 255, 0.30)"}
                  stroke={glowColor}
                  strokeWidth={isActive ? 2 : 1}
                  opacity={isActive ? 1 : 0.2}
                  filter={isActive ? "url(#holo-cyan-glow)" : undefined}
                />
              </motion.g>
            );
          })}

          {/* Hologram Palm Mesh & Socket Rim */}
          <path
            d="M 502,390 C 512,320 510,260 484,230 L 445,225 L 406,224 L 370,228 C 352,255 356,330 364,390 Z"
            fill="url(#holo-palm-r)"
            stroke="#00e5ff"
            strokeWidth="1.2"
            opacity={isRightActive ? 0.95 : 0.40}
          />
          <path
            d="M 502,390 C 512,320 510,260 484,230 L 445,225 L 406,224 L 370,228 C 352,255 356,330 364,390 Z"
            fill="url(#scanlines)"
            color="#00e5ff"
            opacity={isRightActive ? 0.6 : 0.2}
          />
        </motion.g>

        {/* ── HOLOGRAPHIC SONAR TARGET BEAM OVER ACTIVE KEY ── */}
        {keyInfo && normalizedKey !== "" && (
          <g className="pointer-events-none">
            <motion.circle
              key={`holo-target-1-${normalizedKey}`}
              cx={rippleX}
              cy={rippleY}
              initial={{ r: 6, opacity: 0.9, strokeWidth: 2 }}
              animate={{ r: [6, 24, 36], opacity: [0.9, 0.35, 0], strokeWidth: [2, 1.2, 0.5] }}
              transition={{ repeat: Infinity, duration: 1.3, ease: "easeOut" }}
              fill="none"
              stroke={isLeftActive ? "#00ff9d" : "#00e5ff"}
              filter={isLeftActive ? "url(#holo-emerald-glow)" : "url(#holo-cyan-glow)"}
            />
            <motion.circle
              key={`holo-target-2-${normalizedKey}`}
              cx={rippleX}
              cy={rippleY}
              initial={{ r: 6, opacity: 0.9, strokeWidth: 2 }}
              animate={{ r: [6, 24, 36], opacity: [0.9, 0.35, 0], strokeWidth: [2, 1.2, 0.5] }}
              transition={{ repeat: Infinity, duration: 1.3, delay: 0.65, ease: "easeOut" }}
              fill="none"
              stroke={isLeftActive ? "#00ff9d" : "#00e5ff"}
              filter={isLeftActive ? "url(#holo-emerald-glow)" : "url(#holo-cyan-glow)"}
            />
            <circle
              cx={rippleX}
              cy={rippleY}
              r={3}
              fill={isLeftActive ? "#00ff9d" : "#00e5ff"}
              filter={isLeftActive ? "url(#holo-emerald-glow)" : "url(#holo-cyan-glow)"}
            />
          </g>
        )}
      </svg>
    </div>
  );
}