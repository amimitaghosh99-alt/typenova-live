// ═══════════════════════════════════════════════════════════════════════
//  ACADEMY PRIMITIVES
//  ---------------------------------------------------------------------
//  The handful of pieces both Academy screens repeat. Numbers and meters are
//  driven by MotionValues written straight to the DOM, so a settling counter
//  costs zero React renders — the old rAF hook re-rendered its whole subtree
//  on every frame and could not be interrupted mid-flight.
// ═══════════════════════════════════════════════════════════════════════

import { memo, useEffect, useRef, type ReactNode } from 'react';
import { motion, useMotionValueEvent, useReducedMotion, useSpring } from 'framer-motion';
import { Crown, Flame, Gem, Orbit, Sparkles, Sprout, Star, Zap } from 'lucide-react';
import { listParent, popIn, springValue } from './academyMotion';
import { LABEL, PANEL, panelStyle, TONE } from './academyTheme';

// ── Spring-driven counter ────────────────────────────────────────────

interface AnimatedNumberProps {
    value: number;
    className?: string;
}

export const AnimatedNumber = memo(function AnimatedNumber({ value, className }: AnimatedNumberProps) {
    const reduce = !!useReducedMotion();
    const ref = useRef<HTMLSpanElement>(null);
    const spring = useSpring(0, springValue);

    // Sweeps up from zero on first paint, then animates from wherever it
    // currently sits — interruptible, because the spring owns the value.
    useEffect(() => {
        if (reduce) {
            if (ref.current) ref.current.textContent = String(Math.round(value));
            return;
        }
        spring.set(value);
    }, [reduce, spring, value]);

    useMotionValueEvent(spring, 'change', latest => {
        if (ref.current) ref.current.textContent = String(Math.round(latest));
    });

    return (
        <span ref={ref} className={className}>
            {reduce ? Math.round(value) : 0}
        </span>
    );
});

// ── Progress meter ───────────────────────────────────────────────────

interface MeterProps {
    /** 0–100. */
    percent: number;
    color: string;
    /** Optional halo. Left off for secondary meters so the glow stays meaningful. */
    glowColor?: string;
    height?: number;
    className?: string;
}

/**
 * Fills via `scaleX`, not `width`. Animating width forces layout on every
 * frame; a transform stays on the compositor.
 */
export const Meter = memo(function Meter({
    percent, color, glowColor, height = 8, className = '',
}: MeterProps) {
    const reduce = !!useReducedMotion();
    const pct = Math.max(0, Math.min(100, percent));
    const scaleX = useSpring(0, { stiffness: 70, damping: 20, mass: 1 });

    useEffect(() => {
        if (!reduce) scaleX.set(pct / 100);
    }, [pct, reduce, scaleX]);

    return (
        <div
            className={`relative w-full overflow-hidden rounded-full ${className}`}
            style={{ height, background: 'rgba(255,255,255,0.09)' }}
            role="progressbar"
            aria-valuenow={Math.round(pct)}
            aria-valuemin={0}
            aria-valuemax={100}
        >
            {reduce ? (
                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
            ) : (
                <motion.div
                    className="h-full w-full origin-left rounded-full"
                    style={{
                        scaleX,
                        background: color,
                        boxShadow: glowColor ? `0 0 12px ${glowColor}` : undefined,
                    }}
                />
            )}
        </div>
    );
});

// ── Star trio ────────────────────────────────────────────────────────

interface StarRowProps {
    stars: number;
    size?: number;
    animate?: boolean;
}

export const StarRow = memo(function StarRow({ stars, size = 14, animate = true }: StarRowProps) {
    const reduce = !!useReducedMotion();
    const on = animate && !reduce;

    return (
        <motion.span
            className="flex items-center gap-1"
            {...(on ? { variants: listParent(0.09, 0.05), initial: 'hidden', animate: 'show' } : {})}
        >
            {[1, 2, 3].map(n => {
                const earned = n <= stars;
                if (!earned) {
                    return <Star key={n} size={size} className="text-zinc-700" aria-hidden />;
                }
                return (
                    <motion.span key={n} {...(on ? { variants: popIn } : {})} className="inline-flex">
                        <Star
                            size={size}
                            className="fill-amber-400 text-amber-400"
                            style={{ filter: `drop-shadow(0 0 6px ${TONE.star}88)` }}
                            aria-hidden
                        />
                    </motion.span>
                );
            })}
            <span className="sr-only">{stars} of 3 stars</span>
        </motion.span>
    );
});

// ── Difficulty pips ──────────────────────────────────────────────────

export const DifficultyPips = memo(function DifficultyPips({
    level, accent,
}: { level: number; accent: string }) {
    return (
        <span className="flex items-end gap-[3px]" title={`Difficulty ${level}/5`}>
            {[1, 2, 3, 4, 5].map(i => (
                <span
                    key={i}
                    className="w-[3px] rounded-full"
                    style={{
                        height: 3 + i * 2,
                        background: i <= level ? accent : 'rgba(255,255,255,0.14)',
                    }}
                />
            ))}
        </span>
    );
});

// ── Stat tile ────────────────────────────────────────────────────────

interface StatTileProps {
    icon: ReactNode;
    label: string;
    value: number;
    suffix?: string;
    /** Single theme accent for the icon. Tiles no longer each pick their own hue. */
    accent?: string;
}

export const StatTile = memo(function StatTile({ icon, label, value, suffix, accent }: StatTileProps) {
    return (
        <div className={`flex items-center gap-3 px-3.5 py-2.5 shrink-0 ${PANEL}`} style={panelStyle('sunken')}>
            <span style={{ color: accent }} className={accent ? undefined : 'text-zinc-400'}>
                {icon}
            </span>
            <span className="leading-tight">
                <span className={`block ${LABEL}`}>{label}</span>
                <span className="font-mono text-lg font-bold text-white tabular-nums">
                    <AnimatedNumber value={value} />
                    {suffix && <span className="text-[11px] font-normal text-zinc-500">{suffix}</span>}
                </span>
            </span>
        </div>
    );
});

// ── Mastery rank icon ────────────────────────────────────────────────

/**
 * Mirrors the MASTERY_TITLES level bands. Written as literal branches instead
 * of a map that hands back a component, so no component is ever constructed
 * during a render pass.
 */
export const MasteryIcon = memo(function MasteryIcon({
    level, size = 20,
}: { level: number; size?: number }) {
    if (level >= 50) return <Crown size={size} />;
    if (level >= 41) return <Orbit size={size} />;
    if (level >= 31) return <Flame size={size} />;
    if (level >= 21) return <Gem size={size} />;
    if (level >= 13) return <Sparkles size={size} />;
    if (level >= 6) return <Zap size={size} />;
    return <Sprout size={size} />;
});
