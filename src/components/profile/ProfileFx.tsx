// ═══════════════════════════════════════════════════════════════════════
//  PROFILE FX — the cyberpunk hardware layer
//  ---------------------------------------------------------------------
//  Every decorative part of the dossier and the forge lives here as a small,
//  memoised primitive: corner brackets, grid fields, scan sweeps, count-up
//  numerals, equip bursts, radial meters, the skill radar. Keeping them out of
//  the two screen components is what lets those files stay about *layout and
//  data* instead of drowning in SVG.
//
//  All of them read `useReducedMotion` themselves and degrade to a static
//  render, so no call site has to think about it.
// ═══════════════════════════════════════════════════════════════════════

import { memo, type CSSProperties, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useCountUp } from '@/hooks/useCountUp';
import { DUR, EASE_OUT, EASE_OVERSHOOT, rgba, springFluid } from './profileMotion';

/* ─── Frame furniture ─────────────────────────────────────────────────── */

/**
 * Four L-brackets pinned to the corners of the nearest positioned ancestor.
 * The cheapest way to read "military HUD" without clip-path gymnastics that
 * would cost us the border on the cut edges.
 */
export const CyberCorners = memo(function CyberCorners({
    color = '255, 255, 255',
    alpha = 0.35,
    size = 14,
    inset = 8,
    thickness = 1.5,
}: {
    color?: string;
    alpha?: number;
    size?: number;
    inset?: number;
    thickness?: number;
}) {
    const line = rgba(color, alpha);
    const corners = [
        { top: inset, left: inset, borderTop: true, borderLeft: true },
        { top: inset, right: inset, borderTop: true, borderRight: true },
        { bottom: inset, left: inset, borderBottom: true, borderLeft: true },
        { bottom: inset, right: inset, borderBottom: true, borderRight: true },
    ] as const;

    return (
        <span aria-hidden className="pointer-events-none absolute inset-0 z-20">
            {corners.map((c, i) => (
                <span
                    key={i}
                    className="absolute"
                    style={{
                        width: size,
                        height: size,
                        top: 'top' in c ? c.top : undefined,
                        bottom: 'bottom' in c ? c.bottom : undefined,
                        left: 'left' in c ? c.left : undefined,
                        right: 'right' in c ? c.right : undefined,
                        borderTop: 'borderTop' in c ? `${thickness}px solid ${line}` : undefined,
                        borderBottom: 'borderBottom' in c ? `${thickness}px solid ${line}` : undefined,
                        borderLeft: 'borderLeft' in c ? `${thickness}px solid ${line}` : undefined,
                        borderRight: 'borderRight' in c ? `${thickness}px solid ${line}` : undefined,
                    }}
                />
            ))}
        </span>
    );
});

/** Blueprint grid. Pure CSS gradients — no extra DOM, no image request. */
export const GridField = memo(function GridField({
    cell = 26,
    color = '255, 255, 255',
    alpha = 0.05,
    className = '',
}: {
    cell?: number;
    color?: string;
    alpha?: number;
    className?: string;
}) {
    return (
        <span
            aria-hidden
            className={`pointer-events-none absolute inset-0 ${className}`}
            style={{
                backgroundImage: `linear-gradient(to right, ${rgba(color, alpha)} 1px, transparent 1px), linear-gradient(to bottom, ${rgba(color, alpha)} 1px, transparent 1px)`,
                backgroundSize: `${cell}px ${cell}px`,
                maskImage: 'radial-gradient(ellipse at 50% 0%, black 10%, transparent 78%)',
                WebkitMaskImage: 'radial-gradient(ellipse at 50% 0%, black 10%, transparent 78%)',
            }}
        />
    );
});

/** CRT scanlines. Deliberately faint — it should register as texture, not stripes. */
export const Scanlines = memo(function Scanlines({ alpha = 0.045, gap = 3 }: { alpha?: number; gap?: number }) {
    return (
        <span
            aria-hidden
            className="pointer-events-none absolute inset-0 z-10 mix-blend-overlay"
            style={{
                backgroundImage: `repeating-linear-gradient(to bottom, rgba(255,255,255,${alpha}) 0px, rgba(255,255,255,${alpha}) 1px, transparent 1px, transparent ${gap}px)`,
            }}
        />
    );
});

/**
 * A single band of light travelling down the shell as it boots, then again on a
 * slow loop so the panel never looks like a still image.
 */
export const ScanSweep = memo(function ScanSweep({
    color = '255, 255, 255',
    delay = 0.15,
    duration = 1.4,
    repeatDelay = 5.5,
}: {
    color?: string;
    delay?: number;
    duration?: number;
    repeatDelay?: number;
}) {
    const reduce = useReducedMotion();
    if (reduce) return null;

    return (
        <motion.span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 z-20 h-40"
            style={{
                background: `linear-gradient(to bottom, transparent, ${rgba(color, 0.09)} 45%, ${rgba(color, 0.22)} 50%, ${rgba(color, 0.09)} 55%, transparent)`,
            }}
            initial={{ top: '-20%', opacity: 0 }}
            animate={{ top: ['-20%', '110%'], opacity: [0, 1, 1, 0] }}
            transition={{ duration, delay, ease: 'linear', repeat: Infinity, repeatDelay }}
        />
    );
});

/**
 * Slowly rotating conic sweep, used behind avatars and selected tiles.
 *
 * A CSS animation, not a framer loop. This one is mounted for as long as the
 * dossier is open, and a JS-driven `repeat: Infinity` writes a style on every
 * frame of that — including the frames a tab switch needs. `fx-spin` runs on
 * the compositor and costs nothing on the main thread.
 */
export const ConicHalo = memo(function ConicHalo({
    color = '34, 211, 238',
    duration = 9,
    className = '',
    inset = -2,
}: {
    color?: string;
    duration?: number;
    className?: string;
    inset?: number;
}) {
    const background = `conic-gradient(from 0deg, transparent 0deg, ${rgba(color, 0.75)} 55deg, transparent 130deg, transparent 215deg, ${rgba(color, 0.4)} 285deg, transparent 350deg)`;

    return (
        <span
            aria-hidden
            className={`fx-spin pointer-events-none absolute ${className}`}
            style={{ inset, background, '--fx-spin-dur': `${duration}s` } as CSSProperties}
        />
    );
});

/** Looping hex-dump ribbon. Flavour text, hidden from assistive tech. */
export const DataStream = memo(function DataStream({
    seed = 'TYPENOVA',
    className = '',
}: {
    seed?: string;
    className?: string;
}) {
    const cells = Array.from({ length: 14 }, (_, i) => {
        const hash = (seed.charCodeAt(i % seed.length) * (i + 7) * 2654435761) % 0xffff;
        return hash.toString(16).padStart(4, '0').toUpperCase();
    });
    const row = [...cells, ...cells];

    return (
        <div aria-hidden className={`overflow-hidden ${className}`}>
            {/* CSS marquee. As a framer `x: ['0%','-50%']` loop this was a style
                write per frame for the entire time the dossier was on screen. */}
            <div className="fx-marquee flex w-max gap-3 font-mono text-[8px] tracking-[0.25em] text-white/25">
                {row.map((cell, i) => (
                    <span key={i}>{cell}</span>
                ))}
            </div>
        </div>
    );
});

/* ─── Text and numerals ───────────────────────────────────────────────── */

/**
 * RGB-split glitch on mount. Two ghost layers slam in from either side and
 * dissolve, leaving clean text — remount it (change its `key`) to replay.
 */
export const GlitchText = memo(function GlitchText({
    text,
    className = '',
}: {
    text: string;
    className?: string;
}) {
    const reduce = useReducedMotion();
    if (reduce) return <span className={className}>{text}</span>;

    return (
        <span className={`relative inline-block ${className}`}>
            <motion.span
                aria-hidden
                className="absolute inset-0 select-none text-cyan-300"
                initial={{ x: -6, opacity: 0.9 }}
                animate={{ x: [-6, 4, -1, 0], opacity: [0.9, 0.55, 0.2, 0] }}
                transition={{ duration: 0.6, ease: EASE_OUT }}
            >
                {text}
            </motion.span>
            <motion.span
                aria-hidden
                className="absolute inset-0 select-none text-fuchsia-400"
                initial={{ x: 6, opacity: 0.9 }}
                animate={{ x: [6, -4, 1, 0], opacity: [0.9, 0.55, 0.2, 0] }}
                transition={{ duration: 0.6, ease: EASE_OUT }}
            >
                {text}
            </motion.span>
            <span className="relative">{text}</span>
        </span>
    );
});

/**
 * Eased numeric roll-up. Recounts whenever it mounts — i.e. on every tab entry.
 *
 * The final value is what React renders; the hook then drives the intermediate
 * frames by writing `textContent` on this span directly, so a page with seven
 * counters animating at once costs zero React renders instead of seven per
 * frame. `suffix` stays outside the counted span for the same reason — it must
 * survive the text writes.
 */
export const StatCounter = memo(function StatCounter({
    value,
    decimals = 0,
    suffix = '',
    duration = 900,
    className = '',
}: {
    value: number;
    decimals?: number;
    suffix?: string;
    duration?: number;
    className?: string;
}) {
    const ref = useCountUp(value, decimals, duration);
    const settled =
        decimals > 0 ? value.toFixed(decimals) : Math.round(value).toLocaleString();

    return (
        <span className={className}>
            <span ref={ref}>{settled}</span>
            {suffix}
        </span>
    );
});

/* ─── Feedback ────────────────────────────────────────────────────────── */

/**
 * Concentric rings clearing outward from a tile the instant it is equipped.
 * Keyed by `pulseKey` so re-equipping the same item replays the burst; mounts,
 * expands, unmounts — nothing lingers to composite.
 */
export const EquipBurst = memo(function EquipBurst({
    pulseKey,
    color = '34, 211, 238',
    radius = 'inherit',
}: {
    pulseKey: string | number | null;
    color?: string;
    radius?: string;
}) {
    const reduce = useReducedMotion();
    if (reduce) return null;

    return (
        <AnimatePresence>
            {pulseKey !== null && (
                <span key={pulseKey} aria-hidden className="pointer-events-none absolute inset-0 z-30">
                    {[0, 1, 2].map((i) => (
                        <motion.span
                            key={i}
                            className="absolute inset-0 border"
                            style={{ borderRadius: radius, borderColor: rgba(color, 0.6) }}
                            initial={{ opacity: 0.8, scale: 0.88 }}
                            animate={{ opacity: 0, scale: 1.1 + i * 0.1 }}
                            transition={{ duration: 0.5 + i * 0.14, ease: EASE_OUT, delay: i * 0.06 }}
                        />
                    ))}
                    <motion.span
                        className="absolute inset-0"
                        style={{ borderRadius: radius, background: `radial-gradient(circle at 50% 50%, ${rgba(color, 0.35)}, transparent 70%)` }}
                        initial={{ opacity: 0.9 }}
                        animate={{ opacity: 0 }}
                        transition={{ duration: 0.45, ease: EASE_OUT }}
                    />
                </span>
            )}
        </AnimatePresence>
    );
});

/** Checkmark that draws itself. The payoff stroke on an equipped item. */
export const DrawCheck = memo(function DrawCheck({
    size = 12,
    strokeWidth = 3.5,
    className = '',
}: {
    size?: number;
    strokeWidth?: number;
    className?: string;
}) {
    const reduce = useReducedMotion();

    return (
        <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden>
            <motion.path
                d="M4 12.5 L9.5 18 L20 6"
                fill="none"
                stroke="currentColor"
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={reduce ? { pathLength: 1 } : { pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.34, ease: EASE_OUT }}
            />
        </svg>
    );
});

/* ─── Meters ──────────────────────────────────────────────────────────── */

/** Ring gauge. Used for level progress around the avatar and in the matrix. */
export const RadialMeter = memo(function RadialMeter({
    value,
    size = 96,
    stroke = 4,
    color = '34, 211, 238',
    trackAlpha = 0.1,
    delay = 0.2,
    children,
}: {
    value: number;
    size?: number;
    stroke?: number;
    color?: string;
    trackAlpha?: number;
    delay?: number;
    children?: ReactNode;
}) {
    const reduce = useReducedMotion();
    const clamped = Math.max(0, Math.min(1, value));
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;

    return (
        <div className="relative" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="-rotate-90" aria-hidden>
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={rgba('255, 255, 255', trackAlpha)} strokeWidth={stroke} />
                <motion.circle
                    cx={size / 2}
                    cy={size / 2}
                    r={r}
                    fill="none"
                    stroke={rgba(color, 0.95)}
                    strokeWidth={stroke}
                    strokeLinecap="round"
                    strokeDasharray={c}
                    style={{ filter: `drop-shadow(0 0 6px ${rgba(color, 0.7)})` }}
                    initial={reduce ? { strokeDashoffset: c * (1 - clamped) } : { strokeDashoffset: c }}
                    animate={{ strokeDashoffset: c * (1 - clamped) }}
                    transition={{ ...springFluid, delay }}
                />
            </svg>
            {children && <div className="absolute inset-0 flex items-center justify-center">{children}</div>}
        </div>
    );
});

/**
 * Segmented bar — the XP meter. Reads as instrumentation rather than a
 * progress bar, and the per-segment stagger gives the fill a direction.
 *
 * 26 segments on the dossier's progression card meant 26 framer springs for a
 * one-shot entrance, so the pop is a CSS animation with an inline per-index
 * delay. Unlit segments get no animation at all — they were mounting a motion
 * component to animate nothing.
 */
export const SegmentBar = memo(function SegmentBar({
    value,
    segments = 22,
    color = '34, 211, 238',
    height = 10,
    delay = 0.25,
}: {
    value: number;
    segments?: number;
    color?: string;
    height?: number;
    delay?: number;
}) {
    const clamped = Math.max(0, Math.min(1, value));
    const lit = Math.round(clamped * segments);

    return (
        <div className="flex items-stretch gap-[3px]" style={{ height }} aria-hidden>
            {Array.from({ length: segments }, (_, i) => {
                const on = i < lit;
                return (
                    <span
                        key={i}
                        className={`flex-1 rounded-[2px] ${on ? 'fx-segment' : ''}`}
                        style={{
                            background: on ? rgba(color, 0.95) : 'rgba(255,255,255,0.07)',
                            boxShadow: on ? `0 0 8px ${rgba(color, 0.55)}` : undefined,
                            animationDelay: on ? `${delay * 1000 + i * 18}ms` : undefined,
                        }}
                    />
                );
            })}
        </div>
    );
});

/* ─── Skill radar ─────────────────────────────────────────────────────── */

export interface RadarAxis {
    key: string;
    label: string;
    /** 0…1, already normalised against the axis ceiling. */
    value: number;
}

/**
 * N-axis radar built from real stats. The axis count is dynamic because a
 * remote profile exposes fewer metrics than your own — the polygon simply
 * becomes a triangle rather than the chart lying with zeroes.
 */
export const SkillRadar = memo(function SkillRadar({
    axes,
    size = 260,
    color = '34, 211, 238',
}: {
    axes: RadarAxis[];
    size?: number;
    color?: string;
}) {
    const reduce = useReducedMotion();
    const cx = size / 2;
    const cy = size / 2;
    const radius = size / 2 - 34;
    const n = Math.max(axes.length, 3);

    const pointAt = (index: number, scale: number) => {
        const angle = (Math.PI * 2 * index) / n - Math.PI / 2;
        return { x: cx + Math.cos(angle) * radius * scale, y: cy + Math.sin(angle) * radius * scale };
    };

    const ringPath = (scale: number) =>
        axes
            .map((_, i) => {
                const p = pointAt(i, scale);
                return `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`;
            })
            .join(' ') + ' Z';

    const dataPath =
        axes
            .map((axis, i) => {
                const p = pointAt(i, Math.max(0.04, Math.min(1, axis.value)));
                return `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`;
            })
            .join(' ') + ' Z';

    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="mx-auto max-w-full" role="img" aria-label="Skill matrix">
            {/* Grid rings */}
            {[0.25, 0.5, 0.75, 1].map((scale) => (
                <path key={scale} d={ringPath(scale)} fill="none" stroke="rgba(255,255,255,0.09)" strokeWidth={1} />
            ))}

            {/* Spokes */}
            {axes.map((axis, i) => {
                const p = pointAt(i, 1);
                return <line key={axis.key} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="rgba(255,255,255,0.09)" strokeWidth={1} />;
            })}

            {/* Filled area */}
            <motion.path
                d={dataPath}
                fill={rgba(color, 0.16)}
                stroke="none"
                initial={reduce ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.55 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{ originX: '50%', originY: '50%' }}
                transition={{ ...springFluid, delay: 0.1 }}
            />

            {/* Outline draws itself */}
            <motion.path
                d={dataPath}
                fill="none"
                stroke={rgba(color, 0.95)}
                strokeWidth={2}
                strokeLinejoin="round"
                style={{ filter: `drop-shadow(0 0 6px ${rgba(color, 0.6)})` }}
                initial={reduce ? { pathLength: 1 } : { pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.85, ease: EASE_OUT, delay: 0.08 }}
            />

            {/* Vertices */}
            {axes.map((axis, i) => {
                const p = pointAt(i, Math.max(0.04, Math.min(1, axis.value)));
                return (
                    <motion.circle
                        key={axis.key}
                        cx={p.x}
                        cy={p.y}
                        r={3.5}
                        fill="#fff"
                        stroke={rgba(color, 0.9)}
                        strokeWidth={2}
                        initial={reduce ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.4, ease: EASE_OVERSHOOT, delay: 0.5 + i * 0.07 }}
                    />
                );
            })}

            {/* Axis labels */}
            {axes.map((axis, i) => {
                const p = pointAt(i, 1.18);
                const anchor = p.x > cx + 6 ? 'start' : p.x < cx - 6 ? 'end' : 'middle';
                return (
                    <motion.text
                        key={axis.key}
                        x={p.x}
                        y={p.y}
                        textAnchor={anchor}
                        dominantBaseline="middle"
                        className="fill-white/55 font-mono text-[9px] uppercase tracking-[0.2em]"
                        initial={reduce ? { opacity: 1 } : { opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: DUR.base, delay: 0.45 + i * 0.06 }}
                    >
                        {axis.label}
                    </motion.text>
                );
            })}
        </svg>
    );
});
