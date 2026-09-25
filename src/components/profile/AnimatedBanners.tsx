import { motion, type Easing, type Transition } from 'framer-motion';

/* ------------------------------------------------------------------ */
/*  Shared helpers                                                     */
/* ------------------------------------------------------------------ */

type SceneProps = { a: boolean; p: string };

type LoopOpts = { delay?: number; ease?: Easing; times?: number[]; repeatDelay?: number };

const loop = (duration: number, o: LoopOpts = {}): Transition => ({
  duration,
  repeat: Infinity,
  ease: o.ease ?? 'easeInOut',
  delay: o.delay ?? 0,
  ...(o.times ? { times: o.times } : {}),
  ...(o.repeatDelay ? { repeatDelay: o.repeatDelay } : {}),
});
const lin = (duration: number, o: LoopOpts = {}) => loop(duration, { ...o, ease: 'linear' });

/** Deterministic PRNG so particle fields are stable between renders. */
function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MONO = "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace";

/* ================================================================== */
/*  1. ABYSSAL BLOOM — bioluminescent trench                           */
/* ================================================================== */

const PLANKTON = (() => {
  const r = rng(7);
  return Array.from({ length: 24 }, () => ({
    cx: r() * 400,
    cy: 110 + r() * 90,
    rad: 0.4 + r() * 1.1,
    dur: 7 + r() * 7,
    delay: r() * 7,
    drift: (r() - 0.5) * 26,
    rise: 50 + r() * 70,
    violet: r() > 0.78,
  }));
})();

const KELP = [
  { x: 12, h: 124, w: 3.4 },
  { x: 28, h: 84, w: 2.4 },
  { x: 46, h: 146, w: 3.8 },
  { x: 66, h: 66, w: 2 },
  { x: 334, h: 94, w: 2.6 },
  { x: 354, h: 156, w: 4 },
  { x: 374, h: 110, w: 2.8 },
  { x: 392, h: 136, w: 3.2 },
];
const kelpD = (x: number, h: number, s: number) =>
  `M ${x} 206 C ${x - 12 * s} ${206 - h * 0.35}, ${x + 14 * s} ${206 - h * 0.7}, ${x + 5 * s} ${206 - h}`;

const BELL =
  'M -14 0 C -15 -12, -8 -19, 0 -19 C 8 -19, 15 -12, 14 0 Q 10.5 -2.5 7 0 Q 3.5 -2.5 0 0 Q -3.5 -2.5 -7 0 Q -10.5 -2.5 -14 0 Z';

function Jelly({
  x, y, s, delay, hue, a, p,
}: { x: number; y: number; s: number; delay: number; hue: string } & SceneProps) {
  const beat = 3.4;
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <motion.g
        animate={a ? { y: [0, -11, 0], x: [0, 3, 0] } : undefined}
        transition={loop(7.5, { delay })}
      >
        {/* halo */}
        <motion.circle
          cx="0" cy="-6" r="26" fill={hue} filter={`url(#${p}-soft)`}
          initial={{ opacity: 0.14 }}
          animate={a ? { opacity: [0.08, 0.26, 0.08] } : undefined}
          transition={loop(beat, { delay })}
        />
        {/* tentacles */}
        {[-10, -5, 0, 5, 10].map((tx, i) => {
          const len = 30 + (i % 2) * 8;
          const d1 = `M ${tx} 0 C ${tx - 5} 10, ${tx + 5} 20, ${tx} ${len}`;
          const d2 = `M ${tx} 0 C ${tx + 5} 10, ${tx - 5} 22, ${tx + 3} ${len}`;
          return (
            <motion.path
              key={i} d={d1} fill="none" stroke={hue} strokeWidth="0.7" strokeLinecap="round" opacity="0.55"
              animate={a ? { d: [d1, d2, d1] } : undefined}
              transition={loop(beat, { delay: delay + i * 0.18 })}
            />
          );
        })}
        {/* oral arms */}
        {[-3, 3].map((tx, i) => {
          const d1 = `M ${tx} 0 C ${tx - 3} 6, ${tx + 3} 12, ${tx} 18`;
          const d2 = `M ${tx} 0 C ${tx + 3} 6, ${tx - 3} 12, ${tx + 1} 18`;
          return (
            <motion.path
              key={i} d={d1} fill="none" stroke="#ccfbf1" strokeWidth="1.6" strokeLinecap="round" opacity="0.35"
              animate={a ? { d: [d1, d2, d1] } : undefined}
              transition={loop(beat, { delay: delay + 0.4 + i * 0.3 })}
            />
          );
        })}
        {/* bell (contracts from its rim) */}
        <motion.g
          style={{ originY: 1 }}
          animate={a ? { scaleY: [1, 0.84, 1], scaleX: [1, 1.1, 1] } : undefined}
          transition={loop(beat, { delay })}
        >
          <path d={BELL} fill={`url(#${p}-bell)`} stroke={hue} strokeWidth="0.6" filter={`url(#${p}-glow)`} />
          <ellipse cx="0" cy="-8" rx="5" ry="3.2" fill="#f0fdfa" opacity="0.45" />
          <path d="M -9 -4 Q 0 -10 9 -4" fill="none" stroke="#f0fdfa" strokeWidth="0.5" opacity="0.4" />
        </motion.g>
      </motion.g>
    </g>
  );
}

function AbyssalBloom({ a, p }: SceneProps) {
  const u = (s: string) => `url(#${p}-${s})`;
  return (
    <>
      <defs>
        <linearGradient id={`${p}-bg`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#042a30" />
          <stop offset="55%" stopColor="#021418" />
          <stop offset="100%" stopColor="#010507" />
        </linearGradient>
        <radialGradient id={`${p}-haze`} cx="64%" cy="36%" r="55%">
          <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.26" />
          <stop offset="100%" stopColor="#14b8a6" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${p}-ray`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5eead4" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#5eead4" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={`${p}-bell`} cx="50%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#ccfbf1" stopOpacity="0.9" />
          <stop offset="45%" stopColor="#2dd4bf" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#0f766e" stopOpacity="0.1" />
        </radialGradient>
        <filter id={`${p}-glow`} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="2.5" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id={`${p}-soft`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>

      <rect width="400" height="200" fill={u('bg')} />
      <rect width="400" height="200" fill={u('haze')} />

      {/* Surface caustic ripples */}
      {[7, 15].map((y, i) => {
        const d1 = `M 0 ${y} Q 50 ${y - 4} 100 ${y} T 200 ${y} T 300 ${y} T 400 ${y}`;
        const d2 = `M 0 ${y} Q 50 ${y + 4} 100 ${y} T 200 ${y} T 300 ${y} T 400 ${y}`;
        return (
          <motion.path
            key={y} d={d1} fill="none" stroke="#5eead4" strokeWidth="0.5" opacity={0.25 - i * 0.08}
            animate={a ? { d: [d1, d2, d1] } : undefined}
            transition={loop(6 + i * 2)}
          />
        );
      })}

      {/* God rays */}
      <motion.g animate={a ? { x: [-8, 8, -8] } : undefined} transition={loop(16)}>
        {[
          { x: 110, w: 12, sk: -50, d: 10, delay: 3 },
          { x: 170, w: 26, sk: -70, d: 6, delay: 0 },
          { x: 235, w: 14, sk: -60, d: 8, delay: 1 },
          { x: 290, w: 34, sk: -80, d: 7, delay: 2 },
          { x: 360, w: 18, sk: -70, d: 9, delay: 0.5 },
        ].map((r, i) => (
          <motion.polygon
            key={i}
            points={`${r.x},0 ${r.x + r.w},0 ${r.x + r.w + r.sk},200 ${r.x + r.sk},200`}
            fill={u('ray')}
            initial={{ opacity: 0.6 }}
            animate={a ? { opacity: [0.25, 0.9, 0.25] } : undefined}
            transition={loop(r.d, { delay: r.delay })}
          />
        ))}
      </motion.g>

      {/* Jellyfish */}
      <Jelly x={96} y={98} s={0.45} delay={2.4} hue="#5eead4" a={a} p={p} />
      <Jelly x={152} y={56} s={0.6} delay={0.8} hue="#a78bfa" a={a} p={p} />
      <Jelly x={318} y={112} s={0.8} delay={1.5} hue="#67e8f9" a={a} p={p} />
      <Jelly x={250} y={70} s={1.25} delay={0} hue="#5eead4" a={a} p={p} />

      {/* Plankton / marine snow rising */}
      {PLANKTON.map((pl, i) => (
        <motion.circle
          key={i} cx={pl.cx} cy={pl.cy} r={pl.rad}
          fill={pl.violet ? '#c4b5fd' : '#99f6e4'}
          initial={{ opacity: a ? 0 : 0.5 }}
          animate={a ? { y: [0, -pl.rise], x: [0, pl.drift, 0], opacity: [0, 0.9, 0] } : undefined}
          transition={loop(pl.dur, { delay: pl.delay })}
        />
      ))}

      {/* Kelp forest (swaying) */}
      {KELP.map((k, i) => {
        const d1 = kelpD(k.x, k.h, 1);
        const d2 = kelpD(k.x, k.h, -1);
        const t = loop(5 + (i % 3) * 1.4, { delay: i * 0.35 });
        return (
          <g key={i}>
            <motion.path
              d={d1} fill="none" stroke="#0b3f3a" strokeWidth={k.w} strokeLinecap="round"
              animate={a ? { d: [d1, d2, d1] } : undefined} transition={t}
            />
            <motion.path
              d={d1} fill="none" stroke="#2dd4bf" strokeWidth="0.6" strokeLinecap="round" opacity="0.4"
              animate={a ? { d: [d1, d2, d1] } : undefined} transition={t}
            />
          </g>
        );
      })}

      {/* Seabed */}
      <path
        d="M0 200 L0 186 C 40 178, 80 190, 130 184 C 180 178, 230 192, 280 186 C 330 180, 370 190, 400 182 L400 200 Z"
        fill="#010a0c"
      />
      {/* Glowing anemone bulbs */}
      {[
        { x: 96, y: 185, r: 2 }, { x: 106, y: 182, r: 1.4 }, { x: 116, y: 184, r: 1.8 },
        { x: 248, y: 188, r: 2.2 }, { x: 260, y: 185, r: 1.5 }, { x: 300, y: 183, r: 1.9 },
        { x: 190, y: 183, r: 1.2 },
      ].map((b, i) => (
        <g key={i}>
          <line x1={b.x} y1={b.y + 6} x2={b.x} y2={b.y} stroke="#0f766e" strokeWidth="0.6" />
          <motion.circle
            cx={b.x} cy={b.y} r={b.r} fill={i % 3 === 1 ? '#c4b5fd' : '#5eead4'} filter={u('glow')}
            initial={{ opacity: 0.7 }}
            animate={a ? { opacity: [0.35, 1, 0.35], scale: [0.85, 1.2, 0.85] } : undefined}
            transition={loop(2.6 + (i % 3) * 0.7, { delay: i * 0.3 })}
          />
        </g>
      ))}
    </>
  );
}

/* ================================================================== */
/*  2. NEON HORIZON — retro-synth highway                              */
/* ================================================================== */

const HY = 122;
const SYNTH_STARS = (() => {
  const r = rng(11);
  return Array.from({ length: 28 }, () => ({
    cx: r() * 400, cy: r() * 96, r: 0.3 + r() * 0.8, dur: 1.6 + r() * 3, delay: r() * 3,
  }));
})();
const GRID_Y = [122, 123.6, 127.5, 134, 143.5, 157, 175, 200, 228];
const GRID_OP = [0, 0.5, 0.8, 1, 1, 1, 1, 1, 1];
const GRID_DUR = 2.4;

function NeonHorizon({ a, p }: SceneProps) {
  const u = (s: string) => `url(#${p}-${s})`;
  const ridgeL = '0,122 30,98 55,110 85,80 118,112 140,100 168,122';
  const ridgeR = '232,122 262,104 285,114 314,76 340,106 362,92 400,110';
  return (
    <>
      <defs>
        <linearGradient id={`${p}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#07021a" />
          <stop offset="45%" stopColor="#1c0638" />
          <stop offset="61%" stopColor="#4a0a4f" />
          <stop offset="61%" stopColor="#12022a" />
          <stop offset="100%" stopColor="#05010d" />
        </linearGradient>
        <linearGradient id={`${p}-sun`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fde68a" />
          <stop offset="45%" stopColor="#fb7185" />
          <stop offset="100%" stopColor="#a21caf" />
        </linearGradient>
        <linearGradient id={`${p}-haze`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f0abfc" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#f0abfc" stopOpacity="0" />
        </linearGradient>
        <clipPath id={`${p}-above`}>
          <rect width="400" height={HY} />
        </clipPath>
        <mask id={`${p}-slits`} maskUnits="userSpaceOnUse" x="0" y="0" width="400" height="200">
          <rect width="400" height="200" fill="white" />
          <g>
            {Array.from({ length: 9 }, (_, i) => (
              <rect key={i} x="140" y={94 + i * 8} width="120" height={0.6 + i * 0.7} fill="black" />
            ))}
            {a && (
              <animateTransform attributeName="transform" type="translate" from="0 0" to="0 8" dur="1.6s" repeatCount="indefinite" />
            )}
          </g>
        </mask>
        <filter id={`${p}-bloom`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="10" />
        </filter>
        <filter id={`${p}-neon`} x="-20%" y="-50%" width="140%" height="200%">
          <feGaussianBlur stdDeviation="1.4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <pattern id={`${p}-scan`} width="4" height="3" patternUnits="userSpaceOnUse">
          <rect width="4" height="1" fill="#000" opacity="0.35" />
        </pattern>
      </defs>

      <rect width="400" height="200" fill={u('sky')} />

      {/* Stars */}
      {SYNTH_STARS.map((s, i) => (
        <motion.circle
          key={i} cx={s.cx} cy={s.cy} r={s.r} fill="#fce7f3"
          initial={{ opacity: 0.5 }}
          animate={a ? { opacity: [0.15, 0.95, 0.15] } : undefined}
          transition={loop(s.dur, { delay: s.delay })}
        />
      ))}

      {/* Shooting streaks */}
      {[
        { x1: 330, y1: 22, delay: 0, rd: 5 },
        { x1: 190, y1: 12, delay: 3.2, rd: 6.5 },
      ].map((s, i) => (
        <motion.line
          key={i} x1={s.x1} y1={s.y1} x2={s.x1 + 22} y2={s.y1 - 6}
          stroke="#f9a8d4" strokeWidth="0.8" strokeLinecap="round"
          initial={{ opacity: 0 }}
          animate={a ? { x: [0, -170], y: [0, 46], opacity: [0, 1, 0] } : undefined}
          transition={loop(1.3, { delay: s.delay, repeatDelay: s.rd, ease: 'easeOut' })}
        />
      ))}

      {/* Sun bloom (breathing) */}
      <motion.circle
        cx="200" cy="106" r="62" fill="#f472b6" filter={u('bloom')}
        initial={{ opacity: 0.4 }}
        animate={a ? { opacity: [0.28, 0.55, 0.28], scale: [0.96, 1.05, 0.96] } : undefined}
        transition={loop(4.5)}
      />
      {/* Sliced sun */}
      <g clipPath={u('above')}>
        <circle cx="200" cy="106" r="48" fill={u('sun')} mask={u('slits')} />
      </g>

      {/* Wireframe mountains */}
      {[ridgeL, ridgeR].map((pts, i) => (
        <g key={i}>
          <polygon points={`${pts} ${i ? '400,122' : ''}`} fill="#0f0322" />
          <polyline points={pts} fill="none" stroke="#e879f9" strokeWidth="0.8" opacity="0.7" />
          <motion.polyline
            points={pts} fill="none" stroke="#fdf4ff" strokeWidth="1.3" pathLength={100}
            strokeDasharray="7 93" filter={u('neon')}
            animate={a ? { strokeDashoffset: [0, -100] } : undefined}
            transition={lin(5 + i * 1.5, { delay: i })}
          />
        </g>
      ))}
      {/* inner wire strokes */}
      {[
        [85, 80, 70, 122], [85, 80, 100, 122], [30, 98, 22, 122], [140, 100, 150, 122],
        [314, 76, 300, 122], [314, 76, 330, 122], [362, 92, 356, 122], [262, 104, 270, 122],
      ].map(([x1, y1, x2, y2], i) => (
        <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#c026d3" strokeWidth="0.4" opacity="0.5" />
      ))}

      {/* Grid floor — vertical lanes */}
      {Array.from({ length: 21 }, (_, k) => {
        const i = k - 10;
        return (
          <line key={k} x1={200 + i * 14} y1={HY} x2={200 + i * 72} y2="200" stroke="#ec4899" strokeWidth="0.55" opacity="0.55" />
        );
      })}
      {/* Grid floor — horizontal lines rushing forward (SMIL w/ negative begin for seamless loop) */}
      {Array.from({ length: 8 }, (_, i) => (
        <line
          key={i} x1="0" x2="400" y1={GRID_Y[i]} y2={GRID_Y[i]} stroke="#f472b6" strokeWidth="0.7" opacity={GRID_OP[i]}
        >
          {a && (
            <>
              <animate attributeName="y1" values={GRID_Y.join(';')} dur={`${GRID_DUR}s`} begin={`-${((i * GRID_DUR) / 8).toFixed(2)}s`} repeatCount="indefinite" />
              <animate attributeName="y2" values={GRID_Y.join(';')} dur={`${GRID_DUR}s`} begin={`-${((i * GRID_DUR) / 8).toFixed(2)}s`} repeatCount="indefinite" />
              <animate attributeName="opacity" values={GRID_OP.join(';')} dur={`${GRID_DUR}s`} begin={`-${((i * GRID_DUR) / 8).toFixed(2)}s`} repeatCount="indefinite" />
            </>
          )}
        </line>
      ))}

      {/* Light trails racing down the lanes */}
      {[
        { i: -2, c: '#22d3ee', d: 1.4, delay: 0 },
        { i: 2, c: '#22d3ee', d: 1.7, delay: 0.6 },
        { i: -5, c: '#fbbf24', d: 2.1, delay: 1.1 },
        { i: 5, c: '#f0abfc', d: 1.9, delay: 0.3 },
      ].map((t, k) => (
        <motion.line
          key={k} x1={200 + t.i * 14} y1={HY} x2={200 + t.i * 72} y2="200"
          stroke={t.c} strokeWidth="1.2" strokeLinecap="round" pathLength={100} strokeDasharray="12 88"
          strokeDashoffset={a ? 0 : 50} filter={u('neon')}
          animate={a ? { strokeDashoffset: [0, -100] } : undefined}
          transition={lin(t.d, { delay: t.delay })}
        />
      ))}

      {/* Horizon haze + neon line */}
      <rect x="0" y={HY} width="400" height="22" fill={u('haze')} />
      <motion.line
        x1="0" x2="400" y1={HY} y2={HY} stroke="#fdf4ff" strokeWidth="1" filter={u('neon')}
        initial={{ opacity: 0.8 }}
        animate={a ? { opacity: [0.6, 1, 0.6] } : undefined}
        transition={loop(3)}
      />

      {/* CRT scanlines */}
      <rect width="400" height="200" fill={u('scan')} />
    </>
  );
}

/* ================================================================== */
/*  3. KEYFORGE BLUEPRINT — horological gear forge & MX switch schematic */
/* ================================================================== */

function gearPath(teeth: number, ro: number, ri: number, hole: number) {
  const step = (Math.PI * 2) / teeth;
  const P = (r: number, ang: number) => `${(r * Math.cos(ang)).toFixed(2)} ${(r * Math.sin(ang)).toFixed(2)}`;
  const pts: string[] = [];
  for (let i = 0; i < teeth; i++) {
    const ang = i * step;
    pts.push(P(ri, ang), P(ro, ang + step * 0.14), P(ro, ang + step * 0.42), P(ri, ang + step * 0.56));
  }
  return `M ${pts.join(' L ')} Z M ${hole} 0 A ${hole} ${hole} 0 1 0 ${-hole} 0 A ${hole} ${hole} 0 1 0 ${hole} 0 Z`;
}

const GEARS = [
  { x: 72, y: 98, t: 16, ro: 30, ri: 25, h: 5.5, dir: 1, dur: 22, spokeCutouts: 6, spokeR: 14, spokeH: 3.8 },
  { x: 110, y: 114, t: 10, ro: 19, ri: 15.5, h: 4, dir: -1, dur: (22 * 10) / 16, spokeCutouts: 4, spokeR: 9.5, spokeH: 2.8 },
  { x: 52, y: 130, t: 8, ro: 14, ri: 11.5, h: 3, dir: -1, dur: (22 * 8) / 16, spokeCutouts: 3, spokeR: 7, spokeH: 2.2 },
].map((g) => ({
  ...g,
  d: gearPath(g.t, g.ro, g.ri, g.h),
}));

const DIAL_TICKS = Array.from({ length: 24 }, (_, i) => {
  const ang = (i / 24) * Math.PI * 2;
  const r1 = 41;
  const r2 = i % 6 === 0 ? 47 : i % 2 === 0 ? 45 : 43;
  return {
    x1: +(Math.cos(ang) * r1).toFixed(2),
    y1: +(Math.sin(ang) * r1).toFixed(2),
    x2: +(Math.cos(ang) * r2).toFixed(2),
    y2: +(Math.sin(ang) * r2).toFixed(2),
    major: i % 6 === 0,
  };
});

function springPath(coils: number, w: number, h: number, x: number, y: number) {
  let d = `M ${x} ${y}`;
  const step = h / coils;
  for (let i = 0; i < coils; i++) {
    const cy = y + (i + 0.5) * step;
    const ny = y + (i + 1) * step;
    d += ` C ${(x + w).toFixed(1)} ${(cy - step * 0.2).toFixed(1)}, ${(x + w).toFixed(1)} ${(cy + step * 0.2).toFixed(1)}, ${x} ${cy.toFixed(1)}`;
    d += ` C ${(x - w).toFixed(1)} ${(cy + step * 0.2).toFixed(1)}, ${(x - w).toFixed(1)} ${(ny - step * 0.2).toFixed(1)}, ${x} ${ny.toFixed(1)}`;
  }
  return d;
}

const TRACES = [
  { d: 'M 0 170 H 48 L 62 156 H 130 L 140 148 H 182', dur: 2.8, delay: 0 },
  { d: 'M 90 190 V 176 L 102 164 H 178', dur: 2.2, delay: 0.9 },
  { d: 'M 400 32 H 390 L 378 44 V 50', dur: 2.0, delay: 0.4 },
  { d: 'M 0 34 H 16 L 30 20 H 128', dur: 2.4, delay: 1.4 },
  { d: 'M 400 130 H 388 L 378 120 V 106', dur: 1.8, delay: 0.2 },
  { d: 'M 212 144 V 162 H 276 L 292 146 H 336', dur: 2.1, delay: 0.5 },
  { d: 'M 205 144 V 168 H 284 L 300 152 H 336', dur: 2.5, delay: 1.1 },
];

function KeyforgeBlueprint({ a, p }: SceneProps) {
  const u = (s: string) => `url(#${p}-${s})`;
  const stroke = '#7dd3fc';
  const press = { times: [0, 0.42, 0.54, 0.74, 1] };
  const pressT = loop(2.2, press);
  const txt = { fontFamily: MONO, fontSize: 4.8, fill: '#7dd3fc' } as const;

  return (
    <>
      <defs>
        <linearGradient id={`${p}-bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#082040" />
          <stop offset="50%" stopColor="#04142b" />
          <stop offset="100%" stopColor="#020a17" />
        </linearGradient>

        <pattern id={`${p}-g1`} width="10" height="10" patternUnits="userSpaceOnUse">
          <path d="M 10 0 H 0 V 10" fill="none" stroke="#38bdf8" strokeWidth="0.25" opacity="0.12" />
        </pattern>

        <pattern id={`${p}-g2`} width="50" height="50" patternUnits="userSpaceOnUse">
          <path d="M 50 0 H 0 V 50" fill="none" stroke="#38bdf8" strokeWidth="0.5" opacity="0.25" />
        </pattern>

        <pattern id={`${p}-hatch`} width="5" height="5" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
          <line x1="0" y1="0" x2="0" y2="5" stroke="#38bdf8" strokeWidth="0.45" opacity="0.22" />
        </pattern>

        <linearGradient id={`${p}-spring-gold`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="50%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#b45309" />
        </linearGradient>

        <linearGradient id={`${p}-beam`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0" />
          <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.16" />
        </linearGradient>

        <radialGradient id={`${p}-coreglow`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.32" />
          <stop offset="70%" stopColor="#0284c7" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#020a17" stopOpacity="0" />
        </radialGradient>

        <filter id={`${p}-glow`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.5" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id={`${p}-sparkglow`} x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="2.4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <radialGradient id={`${p}-vig`} cx="50%" cy="50%" r="75%">
          <stop offset="60%" stopColor="#000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.55" />
        </radialGradient>
      </defs>

      <rect width="400" height="200" fill={u('bg')} />
      <rect width="400" height="200" fill={u('g1')} />
      <rect width="400" height="200" fill={u('g2')} />

      {/* Blueprint coordinate axes & isometric drafting guides */}
      <g stroke="#38bdf8" strokeWidth="0.3" opacity="0.35">
        <line x1="20" y1="0" x2="20" y2="200" strokeDasharray="3 3" />
        <line x1="380" y1="0" x2="380" y2="200" strokeDasharray="3 3" />
        <line x1="0" y1="46" x2="400" y2="46" strokeDasharray="3 3" />
        <line x1="0" y1="154" x2="400" y2="154" strokeDasharray="3 3" />
        {/* Safe zone boundary lines */}
        <line x1="160" y1="46" x2="280" y2="154" strokeDasharray="1 4" opacity="0.35" />
        <line x1="300" y1="46" x2="180" y2="154" strokeDasharray="1 4" opacity="0.35" />
      </g>

      {/* Centerpiece back glow behind switch */}
      <ellipse cx="230" cy="100" rx="65" ry="50" fill={u('coreglow')} />

      {/* Circuit traces with flowing data packets */}
      {TRACES.map((t, i) => (
        <g key={i}>
          <path d={t.d} fill="none" stroke="#38bdf8" strokeWidth="0.75" opacity="0.3" />
          <motion.path
            d={t.d} fill="none" stroke="#e0f2fe" strokeWidth="1.2" strokeLinecap="round" pathLength={100}
            strokeDasharray="6 94" strokeDashoffset={a ? 0 : -40} filter={u('glow')}
            animate={a ? { strokeDashoffset: [0, -100] } : undefined}
            transition={lin(t.dur, { delay: t.delay })}
          />
        </g>
      ))}

      {/* Trace vias / PCB through-holes */}
      {[[182, 148], [178, 164], [378, 50], [128, 20], [378, 106], [336, 146], [336, 152]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="1.5" fill="#020a17" stroke={stroke} strokeWidth="0.75" />
      ))}

      {/* ── LEFT WING: Horological Gear Differential Train (Safe Zone: y=54..148) ─ */}
      <g>
        {/* Calibrated azimuth ring around master gear */}
        <g transform="translate(72 98)">
          <circle r="41" fill="none" stroke="#38bdf8" strokeWidth="0.4" strokeDasharray="2 3" opacity="0.5" />
          <circle r="47" fill="none" stroke="#38bdf8" strokeWidth="0.6" opacity="0.3" />
          {DIAL_TICKS.map((t, i) => (
            <line
              key={i}
              x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
              stroke={t.major ? '#7dd3fc' : '#38bdf8'}
              strokeWidth={t.major ? 0.8 : 0.4}
              opacity={t.major ? 0.75 : 0.4}
            />
          ))}
          <text x="0" y="-49" textAnchor="middle" {...txt} fontSize="3.8" opacity="0.65">0° // N</text>
          <text x="50" y="2" textAnchor="start" {...txt} fontSize="3.8" opacity="0.65">90°</text>
          <text x="0" y="54" textAnchor="middle" {...txt} fontSize="3.8" opacity="0.65">180°</text>
          <text x="-50" y="2" textAnchor="end" {...txt} fontSize="3.8" opacity="0.65">270°</text>
        </g>

        {/* Meshing gears with spokes & lightening cutouts */}
        {GEARS.map((g, i) => (
          <g key={i} transform={`translate(${g.x} ${g.y})`}>
            {/* Pitch Circle Diameter (PCD) */}
            <circle r={g.ri * 0.98} fill="none" stroke="#38bdf8" strokeWidth="0.4" strokeDasharray="3 2" opacity="0.6" />
            <motion.g
              animate={a ? { rotate: 360 * g.dir } : undefined}
              transition={lin(g.dur)}
            >
              <path d={g.d} fillRule="evenodd" fill="#38bdf8" fillOpacity="0.08" stroke={stroke} strokeWidth="0.85" />
              <circle r={g.ri * 0.64} fill="none" stroke={stroke} strokeWidth="0.45" strokeDasharray="2 2" opacity="0.7" />
              {/* Spoke lightening cutouts */}
              {Array.from({ length: g.spokeCutouts }, (_, s) => {
                const deg = (360 / g.spokeCutouts) * s;
                return (
                  <circle
                    key={s}
                    cx={(Math.cos((deg * Math.PI) / 180) * g.spokeR).toFixed(1)}
                    cy={(Math.sin((deg * Math.PI) / 180) * g.spokeR).toFixed(1)}
                    r={g.spokeH}
                    fill="#020a17"
                    stroke={stroke}
                    strokeWidth="0.5"
                    opacity="0.8"
                  />
                );
              })}
            </motion.g>
            {/* Synthetic jewel bearing pivot (ruby/sapphire with gold casing) */}
            <circle r={g.h} fill="#020a17" stroke="#f59e0b" strokeWidth="0.6" />
            <circle r={g.h * 0.6} fill={i === 0 ? '#38bdf8' : '#ec4899'} filter={u('glow')} />
            <circle r="0.8" fill="#ffffff" />
          </g>
        ))}

        <text x="72" y="148" textAnchor="middle" {...txt} opacity="0.85" fontWeight="700">DIFFERENTIAL DRIVE</text>
        <text x="72" y="155" textAnchor="middle" {...txt} opacity="0.6" fontSize="4.2">RATIO 16:10:8 · PCD Ø60.0</text>
      </g>

      {/* ── CENTER: Exploded MX Mechanical Switch Cutaway (Safe Zone: y=48..150) ─── */}
      <g>
        {/* Upper Housing Outer Shell & Sliced Wall Hatching (Static) */}
        <g>
          {/* Housing main roof & bevel walls */}
          <path d="M 200 76 L 260 76 L 266 100 L 194 100 Z" fill="#38bdf8" fillOpacity="0.06" stroke={stroke} strokeWidth="0.85" />
          {/* Sliced wall section cross-hatching */}
          <path d="M 195 78 L 202 78 L 198 100 L 194 100 Z" fill={u('hatch')} stroke={stroke} strokeWidth="0.5" />
          <path d="M 258 78 L 265 78 L 266 100 L 262 100 Z" fill={u('hatch')} stroke={stroke} strokeWidth="0.5" />
          {/* Stem collar opening */}
          <path d="M 217 76 H 243 V 86 H 217 Z" fill="none" stroke={stroke} strokeWidth="0.6" strokeDasharray="2 1.5" />

          {/* Symmetrical 4-point snap latches */}
          <path d="M 194 100 V 114 L 191 117 L 195 119 V 122" fill="none" stroke={stroke} strokeWidth="0.75" />
          <path d="M 266 100 V 114 L 269 117 L 265 119 V 122" fill="none" stroke={stroke} strokeWidth="0.75" />

          {/* Lower housing tub */}
          <path d="M 195 122 H 265 V 142 H 195 Z" fill="#38bdf8" fillOpacity="0.05" stroke={stroke} strokeWidth="0.85" />
          {/* Center stem well / guide tube */}
          <rect x="227" y="122" width="6" height="20" fill="#38bdf8" fillOpacity="0.08" stroke={stroke} strokeWidth="0.6" />
          {/* Factory lube reservoir gleam */}
          <ellipse cx="230" cy="139" rx="2.5" ry="1" fill="#e0f2fe" opacity="0.6" filter={u('glow')} />

          {/* LED light pipe slot */}
          <rect x="220" y="114" width="20" height="5" rx="1" fill="none" stroke={stroke} strokeWidth="0.5" opacity="0.7" />
          <circle cx="230" cy="116.5" r="1.3" fill="#38bdf8" opacity="0.5" />
        </g>

        {/* FR-4 PCB Board & Solder Pin Penetrations */}
        <g>
          {/* PCB slab */}
          <rect x="182" y="142" width="96" height="5" rx="1" fill="#031d33" stroke={stroke} strokeWidth="0.75" />
          <line x1="182" y1="144" x2="278" y2="144" stroke="#38bdf8" strokeWidth="0.3" opacity="0.5" />
          <text x="185" y="151" {...txt} fontSize="3.6" opacity="0.6">FR-4 // 1.6mm</text>

          {/* Solder pins piercing the PCB */}
          <line x1="205" y1="136" x2="205" y2="148" stroke="#f59e0b" strokeWidth="1.2" strokeLinecap="round" />
          <line x1="212" y1="136" x2="212" y2="148" stroke="#f59e0b" strokeWidth="1.2" strokeLinecap="round" />
          {/* Solder fillets */}
          <polygon points="203,144 207,144 205,142" fill="#bae6fd" />
          <polygon points="210,144 214,144 212,142" fill="#bae6fd" />
        </g>

        {/* Phosphor Bronze Leaf Switch Assembly & 24K Gold Contacts */}
        <g>
          {/* Stationary contact leaf (attached to pin 212) */}
          <path d="M 212 142 V 118 L 213 112" fill="none" stroke="#f59e0b" strokeWidth="1.0" />
          {/* Gold contact point rivet */}
          <circle cx="213" cy="112" r="1.3" fill="#fef08a" stroke="#d97706" strokeWidth="0.5" filter={u('glow')} />

          {/* Flexible moving leaf (attached to pin 205) */}
          <motion.path
            d="M 205 142 L 208 124 Q 207 118 209 112"
            fill="none"
            stroke="#f59e0b"
            strokeWidth="0.9"
            strokeLinecap="round"
            animate={a ? {
              d: [
                'M 205 142 L 208 124 Q 207 118 209 112',
                'M 205 142 L 208 124 Q 207 118 209 112',
                'M 205 142 L 208 124 Q 211 118 213 112',
                'M 205 142 L 208 124 Q 211 118 213 112',
                'M 205 142 L 208 124 Q 207 118 209 112',
              ],
            } : undefined}
            transition={pressT}
          />

          {/* Electrical Actuation Spark & Energy Pulse */}
          <motion.circle
            cx="213" cy="112" r="2" fill="#38bdf8" filter={u('sparkglow')}
            initial={{ opacity: 0 }}
            animate={a ? { scale: [0, 0, 3.2, 0, 0], opacity: [0, 0, 1, 0, 0] } : undefined}
            transition={pressT}
          />
          <motion.circle
            cx="213" cy="112" r="2" fill="none" stroke="#e0f2fe" strokeWidth="0.9"
            initial={{ opacity: 0 }}
            animate={a ? { r: [2, 2, 20, 20, 2], opacity: [0, 0, 0.9, 0, 0] } : undefined}
            transition={pressT}
          />
        </g>

        {/* 3D Helical Coil Spring (Compresses synchronously) */}
        <motion.path
          d={springPath(5, 7, 36, 230, 96)}
          fill="none"
          stroke={u('spring-gold')}
          strokeWidth="1.25"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter={u('glow')}
          style={{ transformOrigin: '230px 132px' }}
          animate={a ? { scaleY: [1, 1, 0.68, 0.68, 1] } : undefined}
          transition={pressT}
        />

        {/* Stem + Keycap Assembly (Animated Keystroke Loop: Safe Zone y=50..96) */}
        <motion.g animate={a ? { y: [0, 0, 9, 9, 0] } : undefined} transition={pressT}>
          {/* Keycap: Sculpted PBT Concave Dish Profile */}
          <g>
            <path
              d="M 208 50 C 220 52.5, 240 52.5, 252 50 L 260 70 L 200 70 Z"
              fill="#38bdf8" fillOpacity="0.1" stroke="#bae6fd" strokeWidth="0.95" filter={u('glow')}
            />
            {/* Top dish concavity curve */}
            <path d="M 213 53.5 C 222 55.5, 238 55.5, 247 53.5" fill="none" stroke={stroke} strokeWidth="0.55" />
            {/* Inner wall bevels */}
            <line x1="204" y1="70" x2="211" y2="52" stroke={stroke} strokeWidth="0.4" opacity="0.6" />
            <line x1="256" y1="70" x2="249" y2="52" stroke={stroke} strokeWidth="0.4" opacity="0.6" />
            {/* Illuminated Keycap Legend */}
            <text x="230" y="63" textAnchor="middle" fontFamily={MONO} fontSize="6.5" fontWeight="800" fill="#e0f2fe" letterSpacing="1.2">
              NOVA ❖
            </text>
            {/* Stem socket cavity under keycap */}
            <rect x="225" y="65" width="10" height="5" fill="none" stroke={stroke} strokeWidth="0.5" strokeDasharray="1 1" />
          </g>

          {/* POM Linear Stem */}
          <g>
            {/* Top MX Cross Mount (+) */}
            <rect x="228" y="68" width="4" height="10" rx="0.5" fill="#38bdf8" fillOpacity="0.15" stroke={stroke} strokeWidth="0.75" />
            <rect x="223" y="71.5" width="14" height="3.5" rx="0.5" fill="#38bdf8" fillOpacity="0.15" stroke={stroke} strokeWidth="0.75" />

            {/* Main stem slider block */}
            <rect x="221" y="76" width="18" height="20" rx="1" fill="#38bdf8" fillOpacity="0.12" stroke={stroke} strokeWidth="0.8" />
            {/* Dual guide slider wings */}
            <rect x="216" y="80" width="28" height="5" rx="0.5" fill="none" stroke={stroke} strokeWidth="0.55" />
            {/* Actuation wedge leg (presses against moving leaf) */}
            <polygon points="221,88 215,94 221,96" fill="#bae6fd" stroke={stroke} strokeWidth="0.7" />
            {/* Center bottom guide post */}
            <rect x="228" y="96" width="4" height="18" rx="0.5" fill="#38bdf8" fillOpacity="0.2" stroke={stroke} strokeWidth="0.6" />
            {/* Factory lube gleam */}
            <line x1="236" y1="78" x2="236" y2="92" stroke="#e0f2fe" strokeWidth="0.8" opacity="0.75" filter={u('glow')} />
          </g>
        </motion.g>

        {/* Dimension & Calibration Callouts (Within y=46..150) */}
        <g stroke={stroke} strokeWidth="0.4" opacity="0.8">
          {/* Horizontal switch pitch caliper */}
          <line x1="208" y1="44" x2="252" y2="44" />
          <line x1="208" y1="41" x2="208" y2="47" />
          <line x1="252" y1="41" x2="252" y2="47" />
          <text x="230" y="42" textAnchor="middle" {...txt} fontSize="4.2">19.05mm PITCH</text>

          {/* Vertical travel caliper */}
          <line x1="276" y1="50" x2="276" y2="142" strokeDasharray="2 2" />
          <line x1="273" y1="50" x2="279" y2="50" />
          <line x1="273" y1="142" x2="279" y2="142" />
          {/* Actuation point marker at 2.0mm */}
          <line x1="274" y1="96" x2="281" y2="96" stroke="#f59e0b" strokeWidth="0.7" />
          <text x="283" y="98" {...txt} fill="#fef08a" fontSize="3.8">ACT 2.0mm</text>
          <text x="283" y="140" {...txt} fontSize="3.8">4.0mm</text>

          {/* Leader callouts with angled arrows */}
          <polyline points="204,58 184,58 174,54 150,54" fill="none" strokeWidth="0.35" />
          <text x="148" y="52" textAnchor="end" {...txt} fontSize="3.8">PBT DYE-SUB // CHERRY</text>

          <polyline points="216,84 186,84 178,90 150,90" fill="none" strokeWidth="0.35" />
          <text x="148" y="88" textAnchor="end" {...txt} fontSize="3.8">POM STEM // KRYTOX 205G0</text>

          <polyline points="213,112 186,112 178,120 150,120" fill="none" strokeWidth="0.35" />
          <text x="148" y="118" textAnchor="end" {...txt} fill="#fef08a" fontSize="3.8">24K GOLD CROSS-POINT</text>
        </g>
      </g>

      {/* ── RIGHT WING: Force-Travel Oscilloscope, Logic MCU & Title Block (Safe Zone y=50..150) ── */}
      <g>
        {/* Force-Travel Curve Oscilloscope Widget (y=50..88) */}
        <g transform="translate(296 50)">
          <rect width="96" height="38" rx="2" fill="#020a17" fillOpacity="0.85" stroke={stroke} strokeWidth="0.6" />
          {/* Oscilloscope Grid */}
          <g stroke="#38bdf8" strokeWidth="0.25" opacity="0.3">
            <line x1="12" y1="0" x2="12" y2="38" />
            <line x1="32" y1="0" x2="32" y2="38" />
            <line x1="52" y1="0" x2="52" y2="38" />
            <line x1="72" y1="0" x2="72" y2="38" />
            <line x1="0" y1="12" x2="96" y2="12" />
            <line x1="0" y1="24" x2="96" y2="24" />
          </g>
          {/* Actuation 2.0mm threshold line */}
          <line x1="52" y1="4" x2="52" y2="34" stroke="#f59e0b" strokeWidth="0.5" strokeDasharray="1.5 1.5" opacity="0.7" />

          {/* Smooth Linear Force Curve Line */}
          <path d="M 12 30 Q 32 25, 52 18 T 88 8" fill="none" stroke="#38bdf8" strokeWidth="1.2" filter={u('glow')} />

          {/* Synchronized Tracking Cursor on Force Curve */}
          <motion.circle
            r="1.8"
            fill="#ffffff"
            stroke="#38bdf8"
            strokeWidth="0.7"
            filter={u('glow')}
            animate={a ? {
              cx: [12, 12, 88, 88, 12],
              cy: [30, 30, 8, 8, 30],
            } : undefined}
            transition={pressT}
          />

          <text x="6" y="8" {...txt} fontSize="3.8" fontWeight="700">FORCE-TRAVEL CURVE</text>
          <text x="6" y="35" {...txt} fontSize="3.4" fill="#fef08a" opacity="0.85">ACTUATION: 45gf @ 2.0mm</text>
        </g>

        {/* High-Density QMK/VIA 32-Bit Microcontroller (y=92..116) */}
        <g transform="translate(338 92)">
          <rect width="42" height="24" rx="1.5" fill="#020a17" stroke={stroke} strokeWidth="0.75" />
          {/* Surface Mount Pins */}
          {[-2, 6, 14, 22].map((py, i) => (
            <g key={i}>
              <line x1="-3" y1={py} x2="0" y2={py} stroke={stroke} strokeWidth="0.55" />
              <line x1="42" y1={py} x2="45" y2={py} stroke={stroke} strokeWidth="0.55" />
            </g>
          ))}
          {/* Chip Label */}
          <text x="21" y="12" textAnchor="middle" {...txt} fontSize="4.2" fontWeight="700" fill="#e0f2fe">TN-QMK</text>
          <text x="21" y="19" textAnchor="middle" {...txt} fontSize="3.2" opacity="0.6">CORTEX-M4</text>
          {/* Crystal Oscillator */}
          <rect x="48" y="5" width="7" height="14" rx="1" fill="#020a17" stroke={stroke} strokeWidth="0.5" />
          <text x="51.5" y="13" textAnchor="middle" {...txt} fontSize="2.8" opacity="0.7" transform="rotate(90 51.5 13)">16MHz</text>
        </g>

        {/* ASME / ISO Engineering Title Block (y=120..148) */}
        <g transform="translate(296 120)">
          <rect width="96" height="28" fill="#020a17" fillOpacity="0.85" stroke={stroke} strokeWidth="0.6" />
          <line x1="0" y1="10" x2="96" y2="10" stroke={stroke} strokeWidth="0.4" />
          <line x1="0" y1="19" x2="96" y2="19" stroke={stroke} strokeWidth="0.4" />
          <line x1="56" y1="10" x2="56" y2="28" stroke={stroke} strokeWidth="0.4" />

          <text x="5" y="7.5" {...txt} fontWeight="700" fontSize="4.2" letterSpacing="0.4">TYPENOVA KEYFORGE CAD</text>
          <text x="5" y="16" {...txt} opacity="0.8" fontSize="3.6">DWG: TN-SW01-LIN</text>
          <text x="60" y="16" {...txt} opacity="0.8" fontSize="3.6">REV: 4.2</text>
          <text x="5" y="25" {...txt} opacity="0.7" fontSize="3.4">SCALE: 5:1</text>
          <text x="60" y="25" {...txt} opacity="0.7" fontSize="3.4">TOL: ±0.015mm</text>

          {/* Live Pulsing Drafting System LED */}
          <motion.circle
            cx="89" cy="6" r="1.4" fill="#38bdf8"
            filter={u('glow')}
            animate={a ? { opacity: [1, 0.2, 1] } : undefined}
            transition={loop(1.2)}
          />
        </g>
      </g>

      {/* AOI Automated Optical Inspection Sweeping Laser Bar */}
      <motion.g
        initial={{ x: -40 }}
        animate={a ? { x: [-40, 440] } : undefined}
        transition={lin(7.5)}
      >
        <rect x="-30" y="0" width="30" height="200" fill={u('beam')} />
        <line x1="0" x2="0" y1="0" y2="200" stroke="#bae6fd" strokeWidth="0.7" opacity="0.75" filter={u('glow')} />
      </motion.g>

      {/* Corner CAD Registration Crosshairs */}
      <g stroke="#38bdf8" strokeWidth="0.5" opacity="0.5">
        <path d="M 8 14 H 20 M 14 8 V 20" fill="none" />
        <circle cx="14" cy="14" r="3" fill="none" strokeWidth="0.35" />
        <path d="M 386 14 H 398 M 392 8 V 20" fill="none" />
        <circle cx="392" cy="14" r="3" fill="none" strokeWidth="0.35" />
        <path d="M 8 192 H 20 M 14 186 V 198" fill="none" />
        <circle cx="14" cy="14" r="3" fill="none" strokeWidth="0.35" />
        <path d="M 386 192 H 398 M 392 186 V 198" fill="none" />
        <circle cx="392" cy="192" r="3" fill="none" strokeWidth="0.35" />
      </g>

      {/* Subtle Blueprint Vignette & Contrast Film */}
      <rect width="400" height="200" fill={u('vig')} />
    </>
  );
}

/* ================================================================== */
/*  4. SOLAR CORONACH — magnetic prominences & solar wind              */
/* ================================================================== */

const SUN = { x: 352, y: 212, r: 108 };

const RAYS = (() => {
  const r = rng(23);
  return Array.from({ length: 40 }, (_, i) => ({
    ang: (i / 40) * 360 + r() * 4,
    len: 18 + r() * 60,
    w: 0.5 + r() * 1.1,
    o: 0.1 + r() * 0.25,
  }));
})();

const EMBERS = (() => {
  const r = rng(31);
  return Array.from({ length: 26 }, () => ({
    cx: 240 + r() * 160,
    cy: 110 + r() * 90,
    rad: 0.5 + r() * 1.2,
    dx: -(60 + r() * 170),
    dy: -(25 + r() * 85),
    dur: 5 + r() * 6,
    delay: r() * 7,
    hot: r() > 0.6,
  }));
})();

const WIND = (() => {
  const r = rng(41);
  return Array.from({ length: 9 }, () => ({
    x: 220 + r() * 180, y: 10 + r() * 110, len: 14 + r() * 26, dur: 3 + r() * 3, delay: r() * 4,
  }));
})();

const SOLAR_STARS = (() => {
  const r = rng(53);
  return Array.from({ length: 22 }, () => ({
    cx: r() * 250, cy: r() * 200, r: 0.3 + r() * 0.7, dur: 2 + r() * 3, delay: r() * 3,
  }));
})();

const PROMINENCES = [
  { d1: 'M 258.5 158 C 215 130, 250 85, 290 123.5', d2: 'M 258.5 158 C 206 124, 244 74, 290 123.5', dur: 6, flow: 1.2 },
  { d1: 'M 315 110.5 C 305 60, 365 55, 361.4 104.4', d2: 'M 315 110.5 C 300 48, 372 44, 361.4 104.4', dur: 7.5, flow: 1.5 },
  { d1: 'M 248.2 182.2 C 225 180, 222 160, 254 166.3', d2: 'M 248.2 182.2 C 218 182, 214 156, 254 166.3', dur: 5, flow: 1 },
  { d1: 'M 372 105.8 C 378 80, 398 82, 392 111', d2: 'M 372 105.8 C 380 72, 402 76, 392 111', dur: 6.5, flow: 1.3 },
];

function SolarCoronach({ a, p }: SceneProps) {
  const u = (s: string) => `url(#${p}-${s})`;
  return (
    <>
      <defs>
        <radialGradient id={`${p}-bg`} cx="88%" cy="100%" r="95%">
          <stop offset="0%" stopColor="#401205" />
          <stop offset="42%" stopColor="#1a0602" />
          <stop offset="100%" stopColor="#060201" />
        </radialGradient>
        <radialGradient id={`${p}-sun`} cx={SUN.x} cy={SUN.y} r={SUN.r} gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fde68a" />
          <stop offset="45%" stopColor="#f59e0b" />
          <stop offset="78%" stopColor="#c2410c" />
          <stop offset="100%" stopColor="#7c2d12" />
        </radialGradient>
        <radialGradient id={`${p}-corona`} cx={SUN.x} cy={SUN.y} r="175" gradientUnits="userSpaceOnUse">
          <stop offset="58%" stopColor="#f97316" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${p}-rim`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="35%" stopColor="#fb923c" stopOpacity="0" />
          <stop offset="100%" stopColor="#fdba74" stopOpacity="1" />
        </linearGradient>
        <linearGradient id={`${p}-shade`} x1="0" y1="0" x2="1" y2="0.6">
          <stop offset="0%" stopColor="#000" stopOpacity="0.55" />
          <stop offset="60%" stopColor="#000" stopOpacity="0" />
        </linearGradient>
        <filter id={`${p}-glow`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.2" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id={`${p}-blur`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.5" />
        </filter>
      </defs>

      <rect width="400" height="200" fill={u('bg')} />

      {/* Distant stars */}
      {SOLAR_STARS.map((s, i) => (
        <motion.circle
          key={i} cx={s.cx} cy={s.cy} r={s.r} fill="#fed7aa"
          initial={{ opacity: 0.4 }}
          animate={a ? { opacity: [0.1, 0.7, 0.1] } : undefined}
          transition={loop(s.dur, { delay: s.delay })}
        />
      ))}

      {/* Ringed planet catching sunlight */}
      <g transform="translate(70 58)">
        <motion.g animate={a ? { y: [0, -3, 0] } : undefined} transition={loop(10)}>
          <ellipse rx="24" ry="4.5" transform="rotate(-18)" fill="none" stroke="#7c2d12" strokeWidth="0.8" opacity="0.8" />
          <circle r="13" fill="#0a0302" />
          <circle r="13" fill="none" stroke={u('rim')} strokeWidth="1.4" />
          <path d="M -23 7.3 A 24 4.5 -18 0 0 22.8 -7.4" transform="rotate(0)" fill="none" stroke="#fb923c" strokeWidth="0.8" opacity="0.7" />
        </motion.g>
      </g>

      {/* Corona breathing */}
      <motion.circle
        cx={SUN.x} cy={SUN.y} r="175" fill={u('corona')}
        animate={a ? { scale: [1, 1.05, 1], opacity: [0.8, 1, 0.8] } : undefined}
        transition={loop(5)}
      />

      {/* Rotating ray crowns */}
      <g transform={`translate(${SUN.x} ${SUN.y})`}>
        <motion.g animate={a ? { rotate: 360 } : undefined} transition={lin(110)}>
          <circle r="200" fill="none" />
          {RAYS.map((r, i) => (
            <line
              key={i} x1={SUN.r + 4} x2={SUN.r + 4 + r.len} y1="0" y2="0" transform={`rotate(${r.ang})`}
              stroke="#fdba74" strokeWidth={r.w} strokeLinecap="round" opacity={r.o}
            />
          ))}
        </motion.g>
        <motion.g animate={a ? { rotate: -360 } : undefined} transition={lin(160)}>
          <circle r="200" fill="none" />
          {RAYS.filter((_, i) => i % 2).map((r, i) => (
            <line
              key={i} x1={SUN.r + 10} x2={SUN.r + 10 + r.len * 0.6} y1="0" y2="0" transform={`rotate(${r.ang + 4.5})`}
              stroke="#fbbf24" strokeWidth={r.w * 0.7} strokeDasharray="2 3" opacity={r.o * 0.9}
            />
          ))}
        </motion.g>
      </g>

      {/* Shockwave rings (CME) */}
      {[0, 3].map((delay) => (
        <motion.circle
          key={delay} cx={SUN.x} cy={SUN.y} r={SUN.r} fill="none" stroke="#fdba74" strokeWidth="1"
          initial={{ opacity: 0 }}
          animate={a ? { r: [SUN.r, 200], opacity: [0.55, 0] } : undefined}
          transition={loop(6, { delay, ease: 'easeOut' })}
        />
      ))}

      {/* Sun disc */}
      <circle cx={SUN.x} cy={SUN.y} r={SUN.r} fill={u('sun')} filter={u('glow')} />
      {/* Convection texture (slow spin) */}
      <g transform={`translate(${SUN.x} ${SUN.y})`}>
        <motion.g animate={a ? { rotate: 360 } : undefined} transition={lin(70)}>
          <circle r="100" fill="none" stroke="#7c2d12" strokeWidth="2" strokeDasharray="1 7 3 5" opacity="0.5" />
          <circle r="90" fill="none" stroke="#9a3412" strokeWidth="3" strokeDasharray="2 9 5 4" opacity="0.4" />
          <circle r="78" fill="none" stroke="#c2410c" strokeWidth="2.5" strokeDasharray="4 6 1 8" opacity="0.35" />
        </motion.g>
        <motion.g animate={a ? { rotate: -360 } : undefined} transition={lin(95)}>
          <circle r="95" fill="none" stroke="#fdba74" strokeWidth="0.8" strokeDasharray="1 10 2 14" opacity="0.4" />
          <circle r="84" fill="none" stroke="#fde68a" strokeWidth="0.6" strokeDasharray="1 12" opacity="0.35" />
        </motion.g>
      </g>
      {/* Limb */}
      <motion.circle
        cx={SUN.x} cy={SUN.y} r={SUN.r} fill="none" stroke="#fde68a" strokeWidth="1.1"
        initial={{ opacity: 0.6 }}
        animate={a ? { opacity: [0.4, 0.95, 0.4] } : undefined}
        transition={loop(3.2)}
      />

      {/* Magnetic prominence loops */}
      {PROMINENCES.map((pr, i) => (
        <g key={i}>
          <motion.path
            d={pr.d1} fill="none" stroke="#f97316" strokeWidth="4" strokeLinecap="round" filter={u('blur')}
            initial={{ opacity: 0.5 }}
            animate={a ? { d: [pr.d1, pr.d2, pr.d1], opacity: [0.35, 0.75, 0.35] } : undefined}
            transition={loop(pr.dur, { delay: i * 0.7 })}
          />
          <motion.path
            d={pr.d1} fill="none" stroke="#fb923c" strokeWidth="1.4" strokeLinecap="round" opacity="0.8"
            animate={a ? { d: [pr.d1, pr.d2, pr.d1] } : undefined}
            transition={loop(pr.dur, { delay: i * 0.7 })}
          />
          <motion.path
            d={pr.d1} fill="none" stroke="#fff7ed" strokeWidth="0.7" strokeLinecap="round" strokeDasharray="2 5"
            animate={a ? { d: [pr.d1, pr.d2, pr.d1], strokeDashoffset: [0, -70] } : undefined}
            transition={{ d: loop(pr.dur, { delay: i * 0.7 }), strokeDashoffset: lin(pr.flow * 10) }}
          />
        </g>
      ))}

      {/* Solar wind streaks */}
      {WIND.map((w, i) => (
        <motion.line
          key={i} x1={w.x} y1={w.y} x2={w.x + w.len} y2={w.y + w.len * 0.18}
          stroke="#fdba74" strokeWidth="0.5" strokeLinecap="round"
          initial={{ opacity: 0 }}
          animate={a ? { x: [0, -260], y: [0, -40], opacity: [0, 0.6, 0] } : undefined}
          transition={loop(w.dur, { delay: w.delay, ease: 'easeIn' })}
        />
      ))}

      {/* Embers carried by the wind */}
      {EMBERS.map((e, i) => (
        <motion.circle
          key={i} cx={e.cx} cy={e.cy} r={e.rad} fill={e.hot ? '#fef3c7' : '#fb923c'}
          initial={{ opacity: a ? 0 : 0.6 }}
          animate={a ? { x: [0, e.dx], y: [0, e.dy], opacity: [0, 1, 0], scale: [1, 0.4] } : undefined}
          transition={loop(e.dur, { delay: e.delay, ease: 'easeOut' })}
        />
      ))}

      {/* Shade left side for foreground legibility */}
      <rect width="400" height="200" fill={u('shade')} />
    </>
  );
}

/* ================================================================== */
/*  5. NULL PROTOCOL — brutalist wireframe + telemetry                 */
/* ================================================================== */

type V3 = [number, number, number];

function projectFrames(
  verts: V3[], edges: [number, number][], cx: number, cy: number, S: number, dir: number, frames = 36,
) {
  const out: string[] = [];
  for (let f = 0; f <= frames; f++) {
    const ay = ((f % frames) / frames) * Math.PI * 2 * dir;
    const ax = 0.52 + 0.16 * Math.sin(ay * 2);
    const pts = verts.map(([x, y, z]) => {
      const x1 = x * Math.cos(ay) + z * Math.sin(ay);
      const z1 = -x * Math.sin(ay) + z * Math.cos(ay);
      const y2 = y * Math.cos(ax) - z1 * Math.sin(ax);
      const z2 = y * Math.sin(ax) + z1 * Math.cos(ax);
      const k = 4 / (4 + z2);
      return [cx + x1 * S * k, cy + y2 * S * k];
    });
    out.push(
      edges
        .map(([i, j]) => `M ${pts[i][0].toFixed(2)} ${pts[i][1].toFixed(2)} L ${pts[j][0].toFixed(2)} ${pts[j][1].toFixed(2)}`)
        .join(' '),
    );
  }
  return out;
}

const CUBE_V: V3[] = [
  [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1],
];
const CUBE_E: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7],
];
const OCT_V: V3[] = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
const OCT_E: [number, number][] = [
  [0, 2], [0, 3], [0, 4], [0, 5], [1, 2], [1, 3], [1, 4], [1, 5], [2, 4], [4, 3], [3, 5], [5, 2],
];
const CUBE_FRAMES = projectFrames(CUBE_V, CUBE_E, 250, 96, 27, 1);
const OCT_FRAMES = projectFrames(OCT_V, OCT_E, 250, 96, 25, -1);

const TICKER =
  '▲ 142 WPM ■ 99.2% ACC ■ RAW 151 ■ CONSISTENCY 87% ■ STREAK 048 ■ RANK #0007 ■ ';

function NullProtocol({ a, p }: SceneProps) {
  const u = (s: string) => `url(#${p}-${s})`;
  const lime = '#bef264';
  const mono = { fontFamily: MONO } as const;
  return (
    <>
      <defs>
        <pattern id={`${p}-dots`} width="6" height="6" patternUnits="userSpaceOnUse">
          <circle cx="3" cy="3" r="0.7" fill="#3a3a3a" />
        </pattern>
        <pattern id={`${p}-haz`} width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="5" height="10" fill={lime} />
        </pattern>
        <clipPath id={`${p}-hazclip`}>
          <rect x="292" y="22" width="7" height="130" />
        </clipPath>
        <clipPath id={`${p}-pillar`}>
          <rect x="300" y="22" width="60" height="130" />
        </clipPath>
        <filter id={`${p}-glow`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="1.3" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <rect width="400" height="200" fill="#0c0c0c" />
      <rect x="200" y="0" width="200" height="200" fill={u('dots')} opacity="0.8" />

      {/* Giant outlined type */}
      <motion.text
        x="-6" y="182" fontFamily="'Arial Black', Impact, Helvetica, sans-serif" fontWeight="900" fontSize="128"
        letterSpacing="-6" fill="none" stroke="#262626" strokeWidth="1.2"
        animate={a ? { x: [0, -14, 0] } : undefined}
        transition={loop(22)}
      >
        NULL
      </motion.text>

      {/* Concrete slabs with hard shadows */}
      <rect x="24" y="36" width="140" height="58" fill="#050505" />
      <rect x="18" y="30" width="140" height="58" fill="#161616" stroke="#2e2e2e" strokeWidth="0.8" />
      <rect x="124" y="124" width="110" height="52" fill="#050505" />
      <rect x="118" y="118" width="110" height="52" fill="#141414" stroke="#2e2e2e" strokeWidth="0.8" />
      <rect x="300" y="22" width="60" height="130" fill="#121212" stroke="#2a2a2a" strokeWidth="0.8" />

      {/* Slab 1 — status terminal */}
      <text x="26" y="42" {...mono} fontSize="5.5" fill="#6b6b6b" letterSpacing="1">STATUS / NODE-07</text>
      <text x="26" y="62" {...mono} fontSize="14" fontWeight="800" fill={lime} filter={u('glow')}>&gt;ARMED</text>
      <motion.rect
        x="96" y="51" width="7" height="12" fill={lime}
        animate={a ? { opacity: [1, 1, 0, 0] } : undefined}
        transition={lin(1.1, { times: [0, 0.5, 0.5, 1] })}
      />
      {Array.from({ length: 10 }, (_, i) => (
        <motion.rect
          key={i} x={26 + i * 12.6} y="72" width="10" height="7" fill={lime}
          initial={{ opacity: 0.25 }}
          animate={a ? { opacity: [0.12, 1, 0.12] } : undefined}
          transition={loop(1.8, { delay: i * 0.12 })}
        />
      ))}

      {/* Slab 2 — accuracy gauge */}
      <g transform="translate(142 144)">
        <circle r="16" fill="none" stroke="#2a2a2a" strokeWidth="3" />
        <motion.g animate={a ? { rotate: 360 } : undefined} transition={lin(6)}>
          <circle r="16" fill="none" stroke={lime} strokeWidth="3" strokeDasharray="70 30.5" />
        </motion.g>
        <motion.g animate={a ? { rotate: -360 } : undefined} transition={lin(10)}>
          <circle r="10.5" fill="none" stroke="#5a5a5a" strokeWidth="0.6" strokeDasharray="1.5 2" />
        </motion.g>
        <text y="2.5" textAnchor="middle" {...mono} fontSize="7" fontWeight="800" fill="#e5e5e5">99</text>
      </g>
      <text x="166" y="136" {...mono} fontSize="5.5" fill="#6b6b6b" letterSpacing="1">ACC/%</text>
      <text x="166" y="152" {...mono} fontSize="13" fontWeight="800" fill="#e5e5e5">99.2</text>
      <text x="166" y="162" {...mono} fontSize="5" fill={lime}>+0.4 Δ</text>

      {/* Pillar — hazard band & scan */}
      <g clipPath={u('hazclip')}>
        <motion.g animate={a ? { y: [0, -14.142] } : undefined} transition={lin(1.2)}>
          <rect x="292" y="0" width="7" height="200" fill={u('haz')} />
        </motion.g>
      </g>
      <g clipPath={u('pillar')}>
        {Array.from({ length: 12 }, (_, i) => (
          <line key={i} x1="306" x2="354" y1={34 + i * 10} y2={34 + i * 10} stroke="#222" strokeWidth="0.6" />
        ))}
        <motion.rect
          x="300" y="22" width="60" height="3" fill={lime} opacity="0.5"
          animate={a ? { y: [0, 127] } : undefined}
          transition={loop(3.4, { ease: 'easeInOut' })}
        />
        <text x="306" y="146" {...mono} fontSize="5" fill="#5a5a5a">SEC.N/0x7E</text>
      </g>

      {/* True-3D rotating wireframe */}
      <ellipse cx="250" cy="148" rx="30" ry="4" fill="#000" opacity="0.6" />
      <motion.path
        d={OCT_FRAMES[0]} fill="none" stroke="#6b6b6b" strokeWidth="0.7"
        animate={a ? { d: OCT_FRAMES } : undefined}
        transition={lin(14)}
      />
      <motion.path
        d={CUBE_FRAMES[0]} fill="none" stroke={lime} strokeWidth="1" strokeLinecap="square" filter={u('glow')}
        animate={a ? { d: CUBE_FRAMES } : undefined}
        transition={lin(10)}
      />

      {/* Glitch bars */}
      {[
        { x: 180, y: 58, w: 60, h: 2, dur: 3.3, delay: 0, c: lime },
        { x: 36, y: 104, w: 90, h: 1.2, dur: 4.1, delay: 1.2, c: '#e5e5e5' },
        { x: 246, y: 170, w: 40, h: 3, dur: 5.2, delay: 2.1, c: lime },
        { x: 330, y: 160, w: 60, h: 1.4, dur: 3.7, delay: 0.6, c: '#e5e5e5' },
      ].map((g, i) => (
        <motion.rect
          key={i} x={g.x} y={g.y} width={g.w} height={g.h} fill={g.c}
          initial={{ opacity: 0 }}
          animate={a ? { opacity: [0, 0, 0.9, 0, 0.7, 0, 0], x: [0, 0, 10, -6, 4, 0, 0] } : undefined}
          transition={lin(g.dur, { delay: g.delay, times: [0, 0.8, 0.82, 0.85, 0.87, 0.9, 1] })}
        />
      ))}

      {/* Registration marks */}
      {[[384, 184], [372, 36], [10, 190]].map(([x, y], i) => (
        <g key={i} stroke="#4a4a4a" strokeWidth="0.6">
          <line x1={x - 5} x2={x + 5} y1={y} y2={y} />
          <line x1={x} x2={x} y1={y - 5} y2={y + 5} />
          <circle cx={x} cy={y} r="2.5" fill="none" />
        </g>
      ))}
      <text x="316" y="196" {...mono} fontSize="5" fill="#4a4a4a">N 00°00′ / E 00°00′</text>

      {/* Telemetry ticker */}
      <rect x="0" y="6" width="400" height="14" fill={lime} />
      <motion.g animate={a ? { x: [0, -400] } : undefined} transition={lin(16)}>
        {[0, 400].map((x) => (
          <text
            key={x} x={x} y="15.8" {...mono} fontSize="7" fontWeight="800" fill="#0c0c0c"
            textLength="400" lengthAdjust="spacing"
          >
            {TICKER}
          </text>
        ))}
      </motion.g>
    </>
  );
}

/* ================================================================== */
/*  6. HELLFIRE INFERNO — realistic raging fire & volcanic embers      */
/* ================================================================== */

const FIRE_EMBERS = (() => {
  const r = rng(77);
  return Array.from({ length: 44 }, () => ({
    cx: 10 + r() * 380,
    cy: 160 + r() * 40,
    rad: 0.5 + r() * 1.5,
    rise: 65 + r() * 115,
    drift1: (r() - 0.5) * 35,
    drift2: (r() - 0.5) * 65,
    dur: 2.2 + r() * 2.8,
    delay: r() * 3.5,
    hot: r() > 0.6,
    white: r() > 0.86,
  }));
})();

const SMOKE_PUFFS = (() => {
  const r = rng(91);
  return Array.from({ length: 12 }, () => ({
    cx: 30 + r() * 340,
    cy: 80 + r() * 60,
    rx: 25 + r() * 35,
    ry: 12 + r() * 18,
    driftX: (r() - 0.5) * 40,
    dur: 5.5 + r() * 4.5,
    delay: r() * 5,
  }));
})();

function makeFlame(cx: number, tipY: number, w: number, curl: number, baseH = 205) {
  const h = baseH - tipY;
  const leftC1x = cx - w * 0.95;
  const leftC1y = tipY + h * 0.65;
  const leftC2x = cx - w * 0.2 + curl * 12;
  const leftC2y = tipY + h * 0.22;
  const tipX = cx + curl * 6;

  const rightC1x = cx + curl * 2;
  const rightC1y = tipY + h * 0.18;
  const rightC2x = cx + w * 0.85;
  const rightC2y = tipY + h * 0.68;

  return `M ${cx - w} ${baseH} C ${leftC1x} ${leftC1y}, ${leftC2x} ${leftC2y}, ${tipX} ${tipY} C ${rightC1x} ${rightC1y}, ${rightC2x} ${rightC2y}, ${cx + w} ${baseH} Z`;
}

const FLAMES = [
  { cx: 28,  w: 38, tipY: 72, curl1: -1, curl2: 0.8, dur: 1.8, delay: 0 },
  { cx: 72,  w: 46, tipY: 50, curl1: 1.2, curl2: -0.9, dur: 2.1, delay: 0.3 },
  { cx: 122, w: 54, tipY: 36, curl1: -0.8, curl2: 1.1, dur: 1.9, delay: 0.6 },
  { cx: 172, w: 48, tipY: 56, curl1: 1, curl2: -0.8, dur: 2.3, delay: 0.2 },
  { cx: 218, w: 56, tipY: 32, curl1: -1.2, curl2: 1.2, dur: 2.0, delay: 0.5 },
  { cx: 268, w: 50, tipY: 48, curl1: 0.7, curl2: -1.1, dur: 2.2, delay: 0.1 },
  { cx: 315, w: 54, tipY: 40, curl1: -1, curl2: 0.9, dur: 1.95, delay: 0.4 },
  { cx: 360, w: 44, tipY: 58, curl1: 1.1, curl2: -0.7, dur: 2.15, delay: 0.25 },
  { cx: 396, w: 36, tipY: 76, curl1: -0.8, curl2: 0.6, dur: 1.85, delay: 0.7 },
];

function HellfireInferno({ a, p }: SceneProps) {
  const u = (s: string) => `url(#${p}-${s})`;

  const WALL_A = "M 0 205 L 0 110 Q 50 82, 100 115 T 200 88 T 300 120 T 400 94 L 400 205 Z";
  const WALL_B = "M 0 205 L 0 125 Q 50 105, 100 86 T 200 118 T 300 86 T 400 112 L 400 205 Z";
  const WALL_C = "M 0 205 L 0 96 Q 50 118, 100 102 T 200 82 T 300 112 T 400 90 L 400 205 Z";

  return (
    <>
      <defs>
        <linearGradient id={`${p}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#080202" />
          <stop offset="45%" stopColor="#170303" />
          <stop offset="78%" stopColor="#300707" />
          <stop offset="100%" stopColor="#0d0202" />
        </linearGradient>

        <radialGradient id={`${p}-furnace`} cx="50%" cy="100%" r="75%">
          <stop offset="0%" stopColor="#ffedd5" stopOpacity="0.85" />
          <stop offset="25%" stopColor="#f59e0b" stopOpacity="0.75" />
          <stop offset="55%" stopColor="#ea580c" stopOpacity="0.5" />
          <stop offset="80%" stopColor="#7f1d1d" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0" />
        </radialGradient>

        <linearGradient id={`${p}-flame-outer`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#7f1d1d" stopOpacity="0.95" />
          <stop offset="40%" stopColor="#dc2626" stopOpacity="0.9" />
          <stop offset="75%" stopColor="#f97316" stopOpacity="0.75" />
          <stop offset="100%" stopColor="#facc15" stopOpacity="0.1" />
        </linearGradient>

        <linearGradient id={`${p}-flame-mid`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#ea580c" stopOpacity="0.95" />
          <stop offset="45%" stopColor="#f97316" stopOpacity="0.9" />
          <stop offset="85%" stopColor="#facc15" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#fef08a" stopOpacity="0.2" />
        </linearGradient>

        <linearGradient id={`${p}-flame-core`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.98" />
          <stop offset="45%" stopColor="#fef08a" stopOpacity="0.9" />
          <stop offset="80%" stopColor="#fde047" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#f97316" stopOpacity="0.1" />
        </linearGradient>

        <filter id={`${p}-heatglow`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3.2" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id={`${p}-softblur`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="7" />
        </filter>

        <linearGradient id={`${p}-topscrim`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#040101" stopOpacity="0.85" />
          <stop offset="50%" stopColor="#040101" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#040101" stopOpacity="0" />
        </linearGradient>
      </defs>

      <rect width="400" height="200" fill={u('sky')} />

      {SMOKE_PUFFS.map((s, i) => (
        <motion.ellipse
          key={i}
          cx={s.cx}
          cy={s.cy}
          rx={s.rx}
          ry={s.ry}
          fill="#1c0505"
          filter={u('softblur')}
          initial={{ opacity: 0.35 }}
          animate={a ? {
            x: [0, s.driftX, 0],
            y: [0, -18, 0],
            opacity: [0.2, 0.45, 0.2],
            scale: [1, 1.25, 1],
          } : undefined}
          transition={loop(s.dur, { delay: s.delay })}
        />
      ))}

      <motion.rect
        width="400"
        height="200"
        fill={u('furnace')}
        initial={{ opacity: 0.7 }}
        animate={a ? {
          opacity: [0.65, 0.95, 0.65],
          scaleY: [1, 1.08, 1],
        } : undefined}
        style={{ originY: 1 }}
        transition={loop(3.2)}
      />

      <motion.path
        d={WALL_A}
        fill={u('flame-outer')}
        filter={u('heatglow')}
        opacity={0.8}
        animate={a ? { d: [WALL_A, WALL_B, WALL_C, WALL_A] } : undefined}
        transition={loop(4.8, { ease: 'easeInOut' })}
      />

      <g filter={u('heatglow')}>
        {FLAMES.map((f, i) => {
          const dOut1 = makeFlame(f.cx, f.tipY, f.w, f.curl1);
          const dOut2 = makeFlame(f.cx, f.tipY, f.w, f.curl2);

          const midTipY = f.tipY + 24;
          const dMid1 = makeFlame(f.cx, midTipY, f.w * 0.72, f.curl1 * 0.85);
          const dMid2 = makeFlame(f.cx, midTipY, f.w * 0.72, f.curl2 * 0.85);

          const coreTipY = f.tipY + 54;
          const dCore1 = makeFlame(f.cx, coreTipY, f.w * 0.45, f.curl1 * 0.6);
          const dCore2 = makeFlame(f.cx, coreTipY, f.w * 0.45, f.curl2 * 0.6);

          const trans = loop(f.dur, { delay: f.delay });

          return (
            <motion.g
              key={i}
              style={{ originY: 1 }}
              animate={a ? {
                scaleY: [1, 1.18, 0.88, 1.1, 1],
                skewX: [-2.5, 3, -1.5, 2, -2.5],
                x: [-3, 4, -2, 3, -3],
              } : undefined}
              transition={loop(f.dur * 1.2, { delay: f.delay + 0.1 })}
            >
              <motion.path
                d={dOut1}
                fill={u('flame-outer')}
                animate={a ? { d: [dOut1, dOut2, dOut1] } : undefined}
                transition={trans}
              />
              <motion.path
                d={dMid1}
                fill={u('flame-mid')}
                animate={a ? { d: [dMid1, dMid2, dMid1] } : undefined}
                transition={trans}
              />
              <motion.path
                d={dCore1}
                fill={u('flame-core')}
                animate={a ? { d: [dCore1, dCore2, dCore1] } : undefined}
                transition={trans}
              />
            </motion.g>
          );
        })}
      </g>

      {FIRE_EMBERS.map((e, i) => (
        <motion.circle
          key={i}
          cx={e.cx}
          cy={e.cy}
          r={e.rad}
          fill={e.white ? '#fffbeb' : e.hot ? '#fef08a' : '#fb923c'}
          filter={e.rad > 1.2 ? u('heatglow') : undefined}
          initial={{ opacity: 0 }}
          animate={a ? {
            y: [0, -e.rise * 0.45, -e.rise],
            x: [0, e.drift1, e.drift2],
            opacity: [0, 1, 0.8, 1, 0],
            scale: [0.7, 1.3, 0.4],
          } : undefined}
          transition={loop(e.dur, { delay: e.delay, ease: 'easeOut' })}
        />
      ))}

      <g>
        <motion.line
          x1="0"
          y1="192"
          x2="400"
          y2="192"
          stroke="#fef08a"
          strokeWidth="3"
          filter={u('heatglow')}
          animate={a ? { opacity: [0.65, 1, 0.65] } : undefined}
          transition={loop(1.4)}
        />
        <path
          d="M 0 205 L 0 188 L 35 192 L 68 185 L 115 191 L 160 183 L 210 190 L 255 184 L 305 192 L 350 186 L 400 189 L 400 205 Z"
          fill="#0a0202"
        />
        <path
          d="M 0 205 L 0 194 L 42 196 L 95 191 L 145 195 L 200 189 L 260 196 L 315 190 L 370 195 L 400 192 L 400 205 Z"
          fill="#140404"
          stroke="#ef4444"
          strokeWidth="0.5"
          opacity="0.75"
        />
      </g>

      <rect width="400" height="100" fill={u('topscrim')} />
    </>
  );
}

/* ================================================================== */
/*  7. GRANDMASTER COSMOS — celestial singularity & astrolabe rings    */
/* ================================================================== */

const GM_STARS = (() => {
  const r = rng(108);
  return Array.from({ length: 48 }, () => ({
    cx: r() * 400,
    cy: r() * 200,
    rad: 0.35 + r() * 1.2,
    dur: 1.8 + r() * 3.2,
    delay: r() * 4,
    color: r() > 0.75 ? '#c084fc' : r() > 0.45 ? '#38bdf8' : '#f8fafc',
  }));
})();

const GM_TICKS = Array.from({ length: 24 }, (_, i) => {
  const ang = (i / 24) * Math.PI * 2;
  const r1 = 80;
  const r2 = i % 6 === 0 ? 90 : i % 2 === 0 ? 86 : 83;
  return {
    x1: Math.cos(ang) * r1,
    y1: Math.sin(ang) * r1,
    x2: Math.cos(ang) * r2,
    y2: Math.sin(ang) * r2,
    major: i % 6 === 0,
  };
});

function GrandmasterCosmos({ a, p }: SceneProps) {
  const u = (s: string) => `url(#${p}-${s})`;
  const mono = { fontFamily: MONO } as const;

  return (
    <>
      <defs>
        <radialGradient id={`${p}-void`} cx="50%" cy="50%" r="70%">
          <stop offset="0%" stopColor="#1a0636" />
          <stop offset="35%" stopColor="#0d0221" />
          <stop offset="70%" stopColor="#050110" />
          <stop offset="100%" stopColor="#020006" />
        </radialGradient>

        <radialGradient id={`${p}-nebula1`} cx="25%" cy="35%" r="45%">
          <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.25" />
          <stop offset="60%" stopColor="#4338ca" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#000" stopOpacity="0" />
        </radialGradient>

        <radialGradient id={`${p}-nebula2`} cx="78%" cy="65%" r="48%">
          <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.2" />
          <stop offset="55%" stopColor="#6366f1" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#000" stopOpacity="0" />
        </radialGradient>

        <linearGradient id={`${p}-chroma`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#c084fc" stopOpacity="0.9" />
          <stop offset="30%" stopColor="#38bdf8" stopOpacity="0.75" />
          <stop offset="70%" stopColor="#e879f9" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#818cf8" stopOpacity="0.9" />
        </linearGradient>

        <linearGradient id={`${p}-jet`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0" />
          <stop offset="50%" stopColor="#e0e7ff" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#c084fc" stopOpacity="0" />
        </linearGradient>

        <filter id={`${p}-cosmicglow`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2.4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id={`${p}-aurablur`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="8" />
        </filter>
      </defs>

      <rect width="400" height="200" fill={u('void')} />
      <rect width="400" height="200" fill={u('nebula1')} />
      <rect width="400" height="200" fill={u('nebula2')} />

      <g stroke="#818cf8" strokeWidth="0.4" strokeDasharray="2 3" opacity="0.35">
        <line x1="40" y1="45" x2="110" y2="30" />
        <line x1="110" y1="30" x2="145" y2="75" />
        <line x1="60" y1="140" x2="120" y2="165" />
        <line x1="280" y1="35" x2="330" y2="60" />
        <line x1="330" y1="60" x2="365" y2="30" />
        <line x1="290" y1="160" x2="340" y2="140" />
        <line x1="340" y1="140" x2="380" y2="170" />
      </g>

      {GM_STARS.map((s, i) => (
        <motion.circle
          key={i}
          cx={s.cx}
          cy={s.cy}
          r={s.rad}
          fill={s.color}
          initial={{ opacity: 0.4 }}
          animate={a ? {
            opacity: [0.2, 0.95, 0.2],
            scale: [0.85, 1.25, 0.85],
          } : undefined}
          transition={loop(s.dur, { delay: s.delay })}
        />
      ))}

      <g filter={u('cosmicglow')}>
        <motion.line
          x1="200" y1="0" x2="200" y2="70"
          stroke={u('jet')}
          strokeWidth="1.6"
          strokeLinecap="round"
          animate={a ? { opacity: [0.4, 0.9, 0.4], strokeWidth: [1.2, 2.2, 1.2] } : undefined}
          transition={loop(2.4)}
        />
        <motion.line
          x1="200" y1="130" x2="200" y2="200"
          stroke={u('jet')}
          strokeWidth="1.6"
          strokeLinecap="round"
          animate={a ? { opacity: [0.4, 0.9, 0.4], strokeWidth: [1.2, 2.2, 1.2] } : undefined}
          transition={loop(2.4, { delay: 0.4 })}
        />
      </g>

      {[0, 2].map((delay) => (
        <g key={delay}>
          <motion.ellipse
            cx="200" cy="55" rx="14" ry="4"
            fill="none" stroke="#38bdf8" strokeWidth="0.8"
            initial={{ opacity: 0 }}
            animate={a ? { rx: [4, 28], opacity: [0.8, 0], y: [0, -35] } : undefined}
            transition={loop(3.6, { delay, ease: 'easeOut' })}
          />
          <motion.ellipse
            cx="200" cy="145" rx="14" ry="4"
            fill="none" stroke="#c084fc" strokeWidth="0.8"
            initial={{ opacity: 0 }}
            animate={a ? { rx: [4, 28], opacity: [0.8, 0], y: [0, 35] } : undefined}
            transition={loop(3.6, { delay: delay + 0.5, ease: 'easeOut' })}
          />
        </g>
      ))}

      <g transform="translate(200 100)">
        <motion.circle
          r="48"
          fill="#c084fc"
          filter={u('aurablur')}
          initial={{ opacity: 0.35 }}
          animate={a ? { opacity: [0.25, 0.55, 0.25], scale: [0.92, 1.08, 0.92] } : undefined}
          transition={loop(4.2)}
        />

        <motion.g
          animate={a ? { rotate: -360 } : undefined}
          transition={lin(70)}
        >
          <circle r="80" fill="none" stroke="#6366f1" strokeWidth="0.6" strokeDasharray="3 3" opacity="0.45" />
          <circle r="90" fill="none" stroke="#818cf8" strokeWidth="0.8" opacity="0.3" />
          {GM_TICKS.map((t, i) => (
            <line
              key={i}
              x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
              stroke={t.major ? '#c084fc' : '#818cf8'}
              strokeWidth={t.major ? 0.9 : 0.45}
              opacity={t.major ? 0.8 : 0.4}
            />
          ))}
        </motion.g>

        <motion.g
          transform="rotate(-15)"
          animate={a ? { rotate: [-15, -12, -18, -15] } : undefined}
          transition={loop(8)}
        >
          <ellipse rx="132" ry="28" fill="none" stroke="url(#${p}-chroma)" strokeWidth="1.6" filter={u('cosmicglow')} />
          <motion.ellipse
            rx="132" ry="28" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round"
            strokeDasharray="18 100" pathLength={100}
            animate={a ? { strokeDashoffset: [0, -100] } : undefined}
            transition={lin(5)}
          />
        </motion.g>

        <motion.g
          transform="rotate(68)"
          animate={a ? { rotate: [68, 72, 65, 68] } : undefined}
          transition={loop(10)}
        >
          <ellipse rx="108" ry="32" fill="none" stroke="#a855f7" strokeWidth="0.9" strokeDasharray="12 6 4 6" opacity="0.65" />
          <motion.circle
            cx="108" cy="0" r="2.2" fill="#38bdf8" filter={u('cosmicglow')}
            animate={a ? { scale: [0.8, 1.4, 0.8] } : undefined}
            transition={loop(1.8)}
          />
        </motion.g>

        <motion.g
          transform="rotate(-48)"
          animate={a ? { rotate: [-48, -44, -52, -48] } : undefined}
          transition={loop(7.5)}
        >
          <ellipse rx="74" ry="22" fill="none" stroke="#38bdf8" strokeWidth="0.8" opacity="0.75" />
          <motion.circle
            cx="-74" cy="0" r="1.8" fill="#e879f9" filter={u('cosmicglow')}
            animate={a ? { scale: [1.2, 0.7, 1.2] } : undefined}
            transition={loop(2.2)}
          />
        </motion.g>

        <motion.g
          animate={a ? { rotate: 360 } : undefined}
          transition={lin(20)}
        >
          <circle r="40" fill="none" stroke="#c084fc" strokeWidth="1.2" strokeDasharray="18 12 6 12" filter={u('cosmicglow')} />
        </motion.g>

        <circle r="32" fill="none" stroke="#f1f5f9" strokeWidth="1.4" opacity="0.85" filter={u('cosmicglow')} />

        <circle r="30" fill="#000000" />
      </g>

      <g stroke="#818cf8" strokeWidth="0.5" opacity="0.5">
        <path d="M 12 18 H 28 M 12 18 V 34" fill="none" />
        <path d="M 388 18 H 372 M 388 18 V 34" fill="none" />
        <path d="M 12 182 H 28 M 12 182 V 166" fill="none" />
        <path d="M 388 182 H 372 M 388 182 V 166" fill="none" />
      </g>

      <text x="36" y="24" {...mono} fontSize="5" fill="#818cf8" letterSpacing="1" opacity="0.7">
        ASCENSION // SINGULARITY Ω-CLASS
      </text>
      <text x="36" y="184" {...mono} fontSize="5" fill="#a78bfa" letterSpacing="1" opacity="0.6">
        RA 18h 36m 56s · DEC +38°47′ · LVL 30+
      </text>
      <text x="364" y="24" textAnchor="end" {...mono} fontSize="5" fontWeight="700" fill="#38bdf8" letterSpacing="1" opacity="0.8">
        GRANDMASTER
      </text>

      <g transform="translate(200 100)" stroke="#c084fc" strokeWidth="0.4" opacity="0.4">
        <line x1="-150" x2="-138" y1="0" y2="0" />
        <line x1="138" x2="150" y1="0" y2="0" />
        <line x1="0" x2="0" y1="-88" y2="-78" />
        <line x1="0" x2="0" y1="78" y2="88" />
      </g>
    </>
  );
}

/* ================================================================== */
/*  8. GODSPEED WARP — relativistic hyperspace velocity & tachyon drive */
/* ================================================================== */

const WARP_RAYS = (() => {
  const r = rng(133);
  return Array.from({ length: 46 }, (_, i) => {
    const ang = (i / 46) * Math.PI * 2 + (r() - 0.5) * 0.15;
    const cos = Math.cos(ang);
    const sin = Math.sin(ang);
    const rInner = 14 + r() * 26;
    const rOuter = 210 + r() * 70;
    return {
      x1: 200 + cos * rInner,
      y1: 100 + sin * rInner,
      x2: 200 + cos * rOuter,
      y2: 100 + sin * rOuter,
      w: 0.6 + r() * 1.8,
      dur: 0.75 + r() * 0.85,
      delay: r() * 1.2,
      gold: r() > 0.35,
      white: r() > 0.82,
    };
  });
})();

const TACHYON_ARCS = [
  'M 180 88 Q 192 78, 208 84 T 222 98',
  'M 218 112 Q 204 122, 190 114 T 176 102',
  'M 185 106 Q 195 118, 212 110 T 224 88',
  'M 174 94 Q 186 76, 206 82 T 226 112',
];

const CHEVRONS = '❯❯❯ ❯❯❯ ❯❯❯ ❯❯❯ ❯❯❯ ❯❯❯ ❯❯❯ ❯❯❯ ❯❯❯ ❯❯❯ ';

function GodspeedWarp({ a, p }: SceneProps) {
  const u = (s: string) => `url(#${p}-${s})`;
  const mono = { fontFamily: MONO } as const;

  return (
    <>
      <defs>
        <radialGradient id={`${p}-void`} cx="50%" cy="50%" r="65%">
          <stop offset="0%" stopColor="#451a03" />
          <stop offset="25%" stopColor="#1c0702" />
          <stop offset="65%" stopColor="#080201" />
          <stop offset="100%" stopColor="#020000" />
        </radialGradient>

        <radialGradient id={`${p}-coreflare`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="20%" stopColor="#fef08a" stopOpacity="0.95" />
          <stop offset="55%" stopColor="#f59e0b" stopOpacity="0.6" />
          <stop offset="85%" stopColor="#ea580c" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#000" stopOpacity="0" />
        </radialGradient>

        <linearGradient id={`${p}-goldray`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#fef08a" stopOpacity="0" />
          <stop offset="60%" stopColor="#f59e0b" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="1" />
        </linearGradient>

        <radialGradient id={`${p}-shock`} cx="50%" cy="50%" r="50%">
          <stop offset="88%" stopColor="#f59e0b" stopOpacity="0" />
          <stop offset="94%" stopColor="#fef08a" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="1" />
        </radialGradient>

        <filter id={`${p}-warpglow`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2.2" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id={`${p}-blur`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>

      <rect width="400" height="200" fill={u('void')} />

      <g filter={u('warpglow')}>
        {WARP_RAYS.map((r, i) => (
          <motion.line
            key={i}
            x1={r.x1} y1={r.y1} x2={r.x2} y2={r.y2}
            stroke={r.white ? '#ffffff' : r.gold ? '#fef08a' : '#f59e0b'}
            strokeWidth={r.w}
            strokeLinecap="round"
            pathLength={100}
            strokeDasharray="28 72"
            initial={{ strokeDashoffset: 100 }}
            animate={a ? { strokeDashoffset: [100, 0] } : undefined}
            transition={lin(r.dur, { delay: r.delay })}
          />
        ))}
      </g>

      {[0, 0.7, 1.4, 2.1].map((delay) => (
        <motion.ellipse
          key={delay}
          cx="200" cy="100" rx="10" ry="10"
          fill="none"
          stroke={u('shock')}
          strokeWidth="1.8"
          filter={u('warpglow')}
          initial={{ opacity: 0 }}
          animate={a ? {
            rx: [8, 175],
            ry: [8, 110],
            opacity: [0.95, 0],
            strokeWidth: [2.2, 0.4],
          } : undefined}
          transition={loop(2.8, { delay, ease: 'easeOut' })}
        />
      ))}

      <g transform="translate(200 100)">
        {[-38, 0, 38].map((dx, i) => (
          <motion.polygon
            key={i}
            points={`${dx}, -22 ${dx + 16}, 0 ${dx}, 22 ${dx - 16}, 0`}
            fill="none"
            stroke="#fef08a"
            strokeWidth="0.8"
            opacity="0.6"
            animate={a ? {
              scale: [0.92, 1.15, 0.92],
              opacity: [0.4, 0.85, 0.4],
            } : undefined}
            transition={loop(1.6, { delay: i * 0.25 })}
          />
        ))}

        {TACHYON_ARCS.map((d, i) => (
          <motion.path
            key={i}
            d={d}
            transform="translate(-200 -100)"
            fill="none"
            stroke={i % 2 === 0 ? '#ffffff' : '#fef08a'}
            strokeWidth="1.1"
            strokeLinecap="round"
            filter={u('warpglow')}
            initial={{ opacity: 0 }}
            animate={a ? {
              opacity: [0, 1, 0, 0.9, 0],
              pathLength: [0.4, 1, 0.6, 1, 0.4],
            } : undefined}
            transition={lin(0.6 + i * 0.35, { delay: i * 0.2 })}
          />
        ))}

        <motion.circle
          r="42"
          fill="none"
          stroke="#f59e0b"
          strokeWidth="0.8"
          strokeDasharray="6 8 2 8"
          animate={a ? { rotate: 360 } : undefined}
          transition={lin(12)}
        />
        <motion.circle
          r="26"
          fill="none"
          stroke="#fef08a"
          strokeWidth="1.1"
          strokeDasharray="14 10"
          filter={u('warpglow')}
          animate={a ? { rotate: -360 } : undefined}
          transition={lin(8)}
        />

        <motion.circle
          r="16"
          fill="#ffffff"
          filter={u('warpglow')}
          animate={a ? { scale: [0.88, 1.18, 0.88] } : undefined}
          transition={loop(1.2)}
        />
        <motion.circle
          r="38"
          fill={u('coreflare')}
          filter={u('blur')}
          animate={a ? { opacity: [0.65, 1, 0.65], scale: [0.95, 1.25, 0.95] } : undefined}
          transition={loop(1.8)}
        />
      </g>

      <g opacity="0.45" fill="#f59e0b" fontSize="7" fontWeight="900" {...mono}>
        <g clipPath="inset(0 0 160 0)">
          <motion.text
            x="-40" y="24" letterSpacing="3"
            animate={a ? { x: [-40, 0] } : undefined}
            transition={lin(1.2)}
          >
            {CHEVRONS}
          </motion.text>
        </g>
        <g clipPath="inset(160 0 0 0)">
          <motion.text
            x="-40" y="186" letterSpacing="3"
            animate={a ? { x: [-40, 0] } : undefined}
            transition={lin(1.2)}
          >
            {CHEVRONS}
          </motion.text>
        </g>
      </g>

      <g stroke="#f59e0b" strokeWidth="0.5" opacity="0.55">
        <path d="M 12 18 H 28 M 12 18 V 34" fill="none" />
        <path d="M 388 18 H 372 M 388 18 V 34" fill="none" />
        <path d="M 12 182 H 28 M 12 182 V 166" fill="none" />
        <path d="M 388 182 H 372 M 388 182 V 166" fill="none" />
      </g>

      <text x="36" y="24" {...mono} fontSize="5.5" fontWeight="700" fill="#fef08a" letterSpacing="1" opacity="0.85">
        GODSPEED // HYPERDRIVE ACTIVE
      </text>
      <text x="36" y="184" {...mono} fontSize="5" fill="#fb923c" letterSpacing="1" opacity="0.75">
        WARP 9.99 · TACHYON FLUX · 130+ WPM
      </text>
      <text x="364" y="24" textAnchor="end" {...mono} fontSize="5.5" fontWeight="800" fill="#ffffff" letterSpacing="1">
        OVERDRIVE
      </text>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Exported scene components                                          */
/* ------------------------------------------------------------------ */

export { AbyssalBloom, NeonHorizon, KeyforgeBlueprint, SolarCoronach, NullProtocol, HellfireInferno, GrandmasterCosmos, GodspeedWarp };
export type { SceneProps };
