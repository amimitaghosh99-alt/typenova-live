// ═══════════════════════════════════════════════════════════════════════
//  BANNER ART — hand-composed scenes
//  ---------------------------------------------------------------------
//  A banner used to be a Tailwind gradient string, which reads as placeholder
//  art no matter how nice the frame around it is. `BannerArt` replaces that
//  with a layered SVG scene per banner id — an actual composition (horizon
//  grid + slatted sun, aurora ribbons, caustics, code rain, lava fissures,
//  carbon weave + gold pinstripe…) that stretches to any aspect ratio.
//
//  Avatars live in `AvatarKeycap.tsx`: they're keycaps, not plates, so they
//  don't share this module's scene machinery.
//
//  Rules that keep this cheap and predictable:
//  - No Math.random / Date.now. All scatter comes from a seeded hash, so the
//    same banner always draws the same stars, petals and embers.
//  - `detail="compact"` drops the expensive turbulence/particle passes; the
//    forge grid uses it so 18 live tiles stay smooth, while the big preview
//    and the dossier rail render the full scene.
//  - The scenes no longer animate their own contents. See `BannerArt` at the
//    bottom of this file: a banner's life is one composited CSS transform on
//    the `<svg>`, and `prefers-reduced-motion` turns that off in CSS. The
//    per-element animation the `animate` prop still threads through is dead
//    weight kept only so the scene bodies stay diffable against the originals.
// ═══════════════════════════════════════════════════════════════════════

import { useMemo } from 'react';
import { motion } from 'framer-motion';

/* ─── Deterministic noise ─────────────────────────────────────────────── */

/** FNV-ish string hash → 32-bit seed. */
function hashSeed(s: string) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}

/** mulberry32 — tiny, stable PRNG so scatter is identical every render. */
function makeRng(seed: number) {
    let a = seed;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

type Detail = 'full' | 'compact';

/* ─── Scene primitives ───────────────────────────────────────────────────
   Every primitive draws inside a 0 0 400 200 viewBox and is written to look
   correct when the box is stretched, so one scene serves a 16px swatch, a
   trading-card preview and a full-height rail.
   ───────────────────────────────────────────────────────────────────────── */

const VB = { w: 400, h: 200 };

/** Vertical gradient wash — the base "sky" of most scenes. */
function Sky({ id, stops }: { id: string; stops: [string, number][] }) {
    return (
        <>
            <defs>
                <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                    {stops.map(([color, offset], i) => (
                        <stop key={i} offset={offset} stopColor={color} />
                    ))}
                </linearGradient>
            </defs>
            <rect width={VB.w} height={VB.h} fill={`url(#${id})`} />
        </>
    );
}

/** Perspective floor grid — the synthwave/tron horizon. */
function HorizonGrid({
    color,
    y = 128,
    lines = 13,
    opacity = 0.5,
}: {
    color: string;
    y?: number;
    lines?: number;
    opacity?: number;
}) {
    const verticals = useMemo(() => {
        const out: string[] = [];
        for (let i = 0; i <= lines; i++) {
            const t = i / lines;
            // Vanishing point at the centre of the horizon.
            const xTop = VB.w / 2 + (t - 0.5) * 60;
            const xBottom = VB.w / 2 + (t - 0.5) * VB.w * 3;
            out.push(`M${xTop} ${y} L${xBottom} ${VB.h}`);
        }
        return out;
    }, [lines, y]);

    const horizontals = useMemo(() => {
        const out: { d: string; o: number }[] = [];
        // Exponential spacing sells the perspective far better than even rows.
        for (let i = 1; i <= 7; i++) {
            const t = Math.pow(i / 7, 2.1);
            const yy = y + t * (VB.h - y);
            out.push({ d: `M0 ${yy} L${VB.w} ${yy}`, o: 0.25 + t * 0.75 });
        }
        return out;
    }, [y]);

    return (
        <g opacity={opacity} stroke={color} fill="none" strokeWidth={0.7} vectorEffect="non-scaling-stroke">
            {verticals.map((d, i) => (
                <path key={`v${i}`} d={d} opacity={0.55} />
            ))}
            {horizontals.map((h, i) => (
                <path key={`h${i}`} d={h.d} opacity={h.o} />
            ))}
        </g>
    );
}

/** Sun/moon disc, optionally slatted (the retro cut-through look). */
function SunDisc({
    color,
    core,
    cx = VB.w / 2,
    cy = 128,
    r = 46,
    slats = false,
    gradId,
}: {
    color: string;
    core: string;
    cx?: number;
    cy?: number;
    r?: number;
    slats?: boolean;
    gradId: string;
}) {
    return (
        <>
            <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor={core} />
                    <stop offset="1" stopColor={color} />
                </linearGradient>
                <mask id={`${gradId}-slats`}>
                    <rect x={cx - r} y={cy - r} width={r * 2} height={r * 2} fill="white" />
                    {slats &&
                        [0, 1, 2, 3, 4].map((i) => (
                            <rect
                                key={i}
                                x={cx - r}
                                y={cy - r * 0.05 + i * (r * 0.24)}
                                width={r * 2}
                                height={2 + i * 1.6}
                                fill="black"
                            />
                        ))}
                </mask>
            </defs>
            <circle cx={cx} cy={cy} r={r} fill={`url(#${gradId})`} mask={`url(#${gradId}-slats)`} />
        </>
    );
}

/** Seeded starfield. Three size tiers so it doesn't look like a dot pattern. */
function StarField({
    seed,
    count = 70,
    color = '#ffffff',
    maxY = VB.h,
}: {
    seed: string;
    count?: number;
    color?: string;
    maxY?: number;
}) {
    const stars = useMemo(() => {
        const rng = makeRng(hashSeed(`stars:${seed}`));
        return Array.from({ length: count }, () => ({
            x: rng() * VB.w,
            y: rng() * maxY,
            r: 0.25 + rng() * rng() * 1.4,
            o: 0.2 + rng() * 0.8,
        }));
    }, [seed, count, maxY]);

    return (
        <g fill={color}>
            {stars.map((s, i) => (
                <circle key={i} cx={s.x} cy={s.y} r={s.r} opacity={s.o} />
            ))}
        </g>
    );
}

/** Soft blurred ribbons — aurora, smoke, nebula veils. */
function Ribbons({
    seed,
    colors,
    bands = 3,
    blur = 9,
    opacity = 0.55,
    animate,
}: {
    seed: string;
    colors: string[];
    bands?: number;
    blur?: number;
    opacity?: number;
    animate: boolean;
}) {
    const filterId = `rib-${hashSeed(seed).toString(36)}`;
    const paths = useMemo(() => {
        const rng = makeRng(hashSeed(`ribbon:${seed}`));
        return Array.from({ length: bands }, (_, i) => {
            const baseY = 40 + rng() * 90;
            const amp = 18 + rng() * 34;
            const thickness = 12 + rng() * 26;
            const d =
                `M-40 ${baseY} ` +
                `C ${VB.w * 0.2} ${baseY - amp}, ${VB.w * 0.45} ${baseY + amp}, ${VB.w * 0.62} ${baseY - amp * 0.5} ` +
                `S ${VB.w * 0.9} ${baseY + amp * 0.7}, ${VB.w + 40} ${baseY - amp * 0.2}`;
            return { d, thickness, color: colors[i % colors.length], drift: 3 + rng() * 5 };
        });
    }, [seed, bands, colors]);

    return (
        <g opacity={opacity} filter={`url(#${filterId})`}>
            <defs>
                <filter id={filterId} x="-20%" y="-40%" width="140%" height="180%">
                    <feGaussianBlur stdDeviation={blur} />
                </filter>
            </defs>
            {paths.map((p, i) => (
                <motion.path
                    key={i}
                    d={p.d}
                    stroke={p.color}
                    strokeWidth={p.thickness}
                    strokeLinecap="round"
                    fill="none"
                    animate={animate ? { y: [0, -p.drift, 0], opacity: [0.75, 1, 0.75] } : undefined}
                    transition={{ duration: 9 + i * 2.5, repeat: Infinity, ease: 'easeInOut' }}
                />
            ))}
        </g>
    );
}

/** Turbulence cloud — nebulae, fog, smoke. The one expensive pass. */
function Clouds({
    seed,
    color,
    freq = 0.012,
    octaves = 3,
    opacity = 0.5,
}: {
    seed: string;
    color: string;
    freq?: number;
    octaves?: number;
    opacity?: number;
}) {
    const id = `cld-${hashSeed(seed).toString(36)}`;
    return (
        <g opacity={opacity}>
            <defs>
                <filter id={id} x="0" y="0" width="100%" height="100%">
                    <feTurbulence
                        type="fractalNoise"
                        baseFrequency={freq}
                        numOctaves={octaves}
                        seed={hashSeed(seed) % 500}
                        result="n"
                    />
                    <feColorMatrix in="n" type="saturate" values="0" result="g" />
                    <feComponentTransfer in="g" result="c">
                        <feFuncA type="linear" slope="1.5" intercept="-0.35" />
                    </feComponentTransfer>
                    <feFlood floodColor={color} result="f" />
                    <feComposite in="f" in2="c" operator="in" />
                </filter>
            </defs>
            <rect width={VB.w} height={VB.h} filter={`url(#${id})`} />
        </g>
    );
}

/** Water caustics — displaced wave bands. */
function Caustics({ seed, color, animate }: { seed: string; color: string; animate: boolean }) {
    const id = `cau-${hashSeed(seed).toString(36)}`;
    const lines = useMemo(() => {
        const rng = makeRng(hashSeed(`cau:${seed}`));
        return Array.from({ length: 7 }, (_, i) => ({
            y: 12 + i * 26 + rng() * 8,
            w: 1 + rng() * 2.4,
            o: 0.2 + rng() * 0.5,
            dur: 7 + rng() * 6,
        }));
    }, [seed]);

    return (
        <g filter={`url(#${id})`}>
            <defs>
                <filter id={id} x="-10%" y="-10%" width="120%" height="120%">
                    <feTurbulence type="fractalNoise" baseFrequency="0.02 0.05" numOctaves={2} seed={7} result="t" />
                    <feDisplacementMap in="SourceGraphic" in2="t" scale={26} xChannelSelector="R" yChannelSelector="G" />
                    <feGaussianBlur stdDeviation={0.9} />
                </filter>
            </defs>
            {lines.map((l, i) => (
                <motion.path
                    key={i}
                    d={`M-20 ${l.y} Q ${VB.w * 0.35} ${l.y - 10}, ${VB.w * 0.6} ${l.y + 6} T ${VB.w + 20} ${l.y}`}
                    stroke={color}
                    strokeWidth={l.w}
                    fill="none"
                    opacity={l.o}
                    animate={animate ? { x: [0, 14, 0] } : undefined}
                    transition={{ duration: l.dur, repeat: Infinity, ease: 'easeInOut' }}
                />
            ))}
        </g>
    );
}

/** Orthogonal circuit traces with solder pads. */
function Circuitry({ seed, color, opacity = 0.55 }: { seed: string; color: string; opacity?: number }) {
    const traces = useMemo(() => {
        const rng = makeRng(hashSeed(`circuit:${seed}`));
        return Array.from({ length: 11 }, () => {
            let x = Math.round(rng() * 8) * 50;
            let y = Math.round(rng() * 4) * 50;
            let d = `M${x} ${y}`;
            const pads: [number, number][] = [[x, y]];
            const steps = 2 + Math.floor(rng() * 3);
            for (let s = 0; s < steps; s++) {
                const horiz = rng() > 0.5;
                const len = (1 + Math.floor(rng() * 2)) * 50 * (rng() > 0.5 ? 1 : -1);
                if (horiz) {
                    x += len;
                    d += ` H${x}`;
                    // 45° dogleg, the detail that makes traces read as a real PCB.
                    d += ` l${len > 0 ? 12 : -12} ${12}`;
                    y += 12;
                } else {
                    y += len;
                    d += ` V${y}`;
                }
                pads.push([x, y]);
            }
            return { d, pads };
        });
    }, [seed]);

    return (
        <g opacity={opacity}>
            <g stroke={color} fill="none" strokeWidth={1.1} strokeLinejoin="round">
                {traces.map((t, i) => (
                    <path key={i} d={t.d} opacity={0.5 + (i % 3) * 0.16} />
                ))}
            </g>
            <g fill={color}>
                {traces.flatMap((t, i) =>
                    t.pads.map(([px, py], j) => <circle key={`${i}-${j}`} cx={px} cy={py} r={2.1} opacity={0.75} />)
                )}
            </g>
        </g>
    );
}

/** Matrix code rain — glyph-ish dashes that fall at per-column speeds. */
function CodeRain({ seed, color, animate }: { seed: string; color: string; animate: boolean }) {
    const cols = useMemo(() => {
        const rng = makeRng(hashSeed(`rain:${seed}`));
        return Array.from({ length: 30 }, (_, i) => ({
            x: 6 + i * 13.4,
            len: 40 + rng() * 120,
            dur: 2.6 + rng() * 4,
            delay: rng() * 4,
            o: 0.3 + rng() * 0.6,
        }));
    }, [seed]);

    return (
        <g>
            {cols.map((c, i) => (
                <motion.g
                    key={i}
                    initial={animate ? { y: -c.len } : undefined}
                    animate={animate ? { y: VB.h + 20 } : undefined}
                    transition={{ duration: c.dur, repeat: Infinity, ease: 'linear', delay: c.delay }}
                >
                    <line
                        x1={c.x}
                        y1={0}
                        x2={c.x}
                        y2={c.len}
                        stroke={color}
                        strokeWidth={2.4}
                        strokeDasharray="3 5"
                        opacity={c.o * 0.55}
                    />
                    {/* Bright leading glyph. */}
                    <rect x={c.x - 1.6} y={c.len - 6} width={3.2} height={6} fill="#d9ffe6" opacity={c.o} />
                </motion.g>
            ))}
        </g>
    );
}

/** Glowing fissures for the hellfire family. */
function Fissures({ seed, color, hot }: { seed: string; color: string; hot: string }) {
    const id = `fis-${hashSeed(seed).toString(36)}`;
    const cracks = useMemo(() => {
        const rng = makeRng(hashSeed(`fis:${seed}`));
        return Array.from({ length: 6 }, () => {
            let x = rng() * VB.w;
            let y = VB.h;
            let d = `M${x} ${y}`;
            const steps = 4 + Math.floor(rng() * 3);
            for (let s = 0; s < steps; s++) {
                x += (rng() - 0.5) * 60;
                y -= 18 + rng() * 30;
                d += ` L${x} ${y}`;
            }
            return { d, w: 1 + rng() * 2.6 };
        });
    }, [seed]);

    return (
        <g filter={`url(#${id})`}>
            <defs>
                <filter id={id} x="-30%" y="-30%" width="160%" height="160%">
                    <feGaussianBlur stdDeviation={2.4} result="b" />
                    <feMerge>
                        <feMergeNode in="b" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>
            {cracks.map((c, i) => (
                <g key={i}>
                    <path d={c.d} stroke={color} strokeWidth={c.w * 2.6} fill="none" opacity={0.45} strokeLinecap="round" />
                    <path d={c.d} stroke={hot} strokeWidth={c.w} fill="none" strokeLinecap="round" />
                </g>
            ))}
        </g>
    );
}

/** Faceted ice / crystal shards. */
function Shards({ seed, color, opacity = 0.5 }: { seed: string; color: string; opacity?: number }) {
    const shards = useMemo(() => {
        const rng = makeRng(hashSeed(`shard:${seed}`));
        return Array.from({ length: 9 }, () => {
            const x = rng() * VB.w;
            const y = rng() * VB.h;
            const w = 16 + rng() * 44;
            const h = 30 + rng() * 80;
            const lean = (rng() - 0.5) * 26;
            return {
                d: `M${x} ${y + h} L${x + lean} ${y} L${x + w * 0.55 + lean} ${y + h * 0.22} L${x + w} ${y + h} Z`,
                o: 0.18 + rng() * 0.5,
            };
        });
    }, [seed]);

    return (
        <g opacity={opacity}>
            {shards.map((s, i) => (
                <path key={i} d={s.d} fill={color} opacity={s.o} stroke="#ffffff" strokeOpacity={0.18} strokeWidth={0.6} />
            ))}
        </g>
    );
}

/** Drifting motes — embers, petals, snow, gold dust, bubbles. */
function Motes({
    seed,
    color,
    count = 26,
    shape = 'dot',
    rise = false,
    animate,
}: {
    seed: string;
    color: string;
    count?: number;
    shape?: 'dot' | 'petal' | 'flake';
    rise?: boolean;
    animate: boolean;
}) {
    const motes = useMemo(() => {
        const rng = makeRng(hashSeed(`mote:${seed}`));
        return Array.from({ length: count }, () => ({
            x: rng() * VB.w,
            y: rng() * VB.h,
            s: 0.6 + rng() * 2.4,
            o: 0.25 + rng() * 0.7,
            dur: 5 + rng() * 9,
            delay: rng() * 5,
            spin: rng() * 360,
            drift: (rng() - 0.5) * 26,
        }));
    }, [seed, count]);

    return (
        <g>
            {motes.map((m, i) => (
                <motion.g
                    key={i}
                    animate={
                        animate
                            ? {
                                y: rise ? [0, -34 - m.s * 8] : [0, 30 + m.s * 6],
                                x: [0, m.drift],
                                opacity: [0, m.o, 0],
                            }
                            : undefined
                    }
                    transition={{ duration: m.dur, repeat: Infinity, ease: 'easeInOut', delay: m.delay }}
                    opacity={animate ? 0 : m.o}
                >
                    {shape === 'dot' && <circle cx={m.x} cy={m.y} r={m.s} fill={color} />}
                    {shape === 'petal' && (
                        <ellipse
                            cx={m.x}
                            cy={m.y}
                            rx={m.s * 2.1}
                            ry={m.s}
                            fill={color}
                            transform={`rotate(${m.spin} ${m.x} ${m.y})`}
                        />
                    )}
                    {shape === 'flake' && (
                        <g stroke={color} strokeWidth={0.7} transform={`rotate(${m.spin} ${m.x} ${m.y})`}>
                            <line x1={m.x - m.s * 2} y1={m.y} x2={m.x + m.s * 2} y2={m.y} />
                            <line x1={m.x} y1={m.y - m.s * 2} x2={m.x} y2={m.y + m.s * 2} />
                        </g>
                    )}
                </motion.g>
            ))}
        </g>
    );
}

/** Long speed streaks. */
function Streaks({ seed, color, animate }: { seed: string; color: string; animate: boolean }) {
    const streaks = useMemo(() => {
        const rng = makeRng(hashSeed(`streak:${seed}`));
        return Array.from({ length: 16 }, () => ({
            y: rng() * VB.h,
            len: 60 + rng() * 220,
            w: 0.8 + rng() * 2.6,
            o: 0.2 + rng() * 0.7,
            dur: 1.1 + rng() * 2.2,
            delay: rng() * 2.5,
        }));
    }, [seed]);

    return (
        <g>
            {streaks.map((s, i) => (
                <motion.rect
                    key={i}
                    x={-s.len}
                    y={s.y}
                    width={s.len}
                    height={s.w}
                    rx={s.w / 2}
                    fill={color}
                    opacity={s.o}
                    animate={animate ? { x: [-s.len, VB.w + s.len] } : { x: VB.w * 0.3 }}
                    transition={{ duration: s.dur, repeat: Infinity, ease: 'linear', delay: s.delay }}
                />
            ))}
        </g>
    );
}

/** Carbon-fibre weave, drawn as a real 2×2 twill pattern. */
function CarbonWeave({ id, opacity = 0.5 }: { id: string; opacity?: number }) {
    return (
        <>
            <defs>
                <pattern id={id} width="12" height="12" patternUnits="userSpaceOnUse">
                    <rect width="12" height="12" fill="#0b0b0d" />
                    <rect width="6" height="6" fill="#17171b" />
                    <rect x="6" y="6" width="6" height="6" fill="#17171b" />
                    <rect width="6" height="6" fill="url(#cw-sheen)" opacity="0.5" />
                    <rect x="6" y="6" width="6" height="6" fill="url(#cw-sheen)" opacity="0.5" />
                </pattern>
                <linearGradient id="cw-sheen" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#ffffff" stopOpacity="0.14" />
                    <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
                </linearGradient>
            </defs>
            <rect width={VB.w} height={VB.h} fill={`url(#${id})`} opacity={opacity} />
        </>
    );
}

/** Angled pinstripes — luxury/heraldic accent. */
function Pinstripes({ id, color, gap = 22, opacity = 0.35 }: { id: string; color: string; gap?: number; opacity?: number }) {
    return (
        <>
            <defs>
                <pattern id={id} width={gap} height={gap} patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
                    <line x1="0" y1="0" x2="0" y2={gap} stroke={color} strokeWidth="1.1" />
                    <line x1={gap / 2} y1="0" x2={gap / 2} y2={gap} stroke={color} strokeWidth="0.4" opacity="0.5" />
                </pattern>
            </defs>
            <rect width={VB.w} height={VB.h} fill={`url(#${id})`} opacity={opacity} />
        </>
    );
}

/** Concentric pulse rings. */
function PulseRings({ color, animate, cx = VB.w / 2, cy = VB.h / 2 }: { color: string; animate: boolean; cx?: number; cy?: number }) {
    return (
        <g fill="none" stroke={color}>
            {[0, 1, 2].map((i) => (
                <motion.circle
                    key={i}
                    cx={cx}
                    cy={cy}
                    r={30}
                    strokeWidth={1.4}
                    animate={animate ? { r: [22, 120], opacity: [0.7, 0] } : { r: 60 + i * 26, opacity: 0.28 }}
                    transition={{ duration: 4.2, repeat: Infinity, ease: 'easeOut', delay: i * 1.4 }}
                />
            ))}
        </g>
    );
}

/** Radiating light burst — godspeed / apex. */
function Rays({ seed, color, animate, cx = VB.w / 2, cy = VB.h * 0.62 }: { seed: string; color: string; animate: boolean; cx?: number; cy?: number }) {
    const rays = useMemo(() => {
        const rng = makeRng(hashSeed(`ray:${seed}`));
        return Array.from({ length: 22 }, (_, i) => ({
            a: (i / 22) * 360,
            w: 1.4 + rng() * 5,
            len: 90 + rng() * 150,
            o: 0.12 + rng() * 0.4,
        }));
    }, [seed]);

    return (
        <motion.g
            style={{ originX: `${cx}px`, originY: `${cy}px` }}
            animate={animate ? { rotate: 360 } : undefined}
            transition={{ duration: 90, repeat: Infinity, ease: 'linear' }}
        >
            {rays.map((r, i) => (
                <rect
                    key={i}
                    x={cx}
                    y={cy - r.w / 2}
                    width={r.len}
                    height={r.w}
                    fill={color}
                    opacity={r.o}
                    transform={`rotate(${r.a} ${cx} ${cy})`}
                />
            ))}
        </motion.g>
    );
}

/** Silhouette ridge line — grounds the sunset scenes. */
function Ridge({ seed, color, y = 150 }: { seed: string; color: string; y?: number }) {
    const d = useMemo(() => {
        const rng = makeRng(hashSeed(`ridge:${seed}`));
        let path = `M0 ${VB.h} L0 ${y}`;
        for (let x = 0; x <= VB.w; x += 40) {
            path += ` Q${x + 20} ${y - 14 - rng() * 26}, ${x + 40} ${y - rng() * 10}`;
        }
        return `${path} L${VB.w} ${VB.h} Z`;
    }, [seed, y]);
    return <path d={d} fill={color} />;
}

/** Vignette + top sheen. Applied to every scene so nothing looks flat. */
function Finish({ id }: { id: string }) {
    return (
        <>
            <defs>
                <radialGradient id={`${id}-vig`} cx="0.5" cy="0.42" r="0.78">
                    <stop offset="0.45" stopColor="#000000" stopOpacity="0" />
                    <stop offset="1" stopColor="#000000" stopOpacity="0.72" />
                </radialGradient>
                <linearGradient id={`${id}-sheen`} x1="0" y1="0" x2="0.35" y2="1">
                    <stop offset="0" stopColor="#ffffff" stopOpacity="0.1" />
                    <stop offset="0.45" stopColor="#ffffff" stopOpacity="0" />
                </linearGradient>
            </defs>
            <rect width={VB.w} height={VB.h} fill={`url(#${id}-vig)`} />
            <rect width={VB.w} height={VB.h} fill={`url(#${id}-sheen)`} />
        </>
    );
}

/* ─── Banner scenes ──────────────────────────────────────────────────────
   One recipe per banner id. `full` adds the passes that cost real GPU time.
   ───────────────────────────────────────────────────────────────────────── */

function Scene({ id, detail, animate }: { id: string; detail: Detail; animate: boolean }) {
    const full = detail === 'full';
    const u = `${id}-${detail}`; // unique per instance-kind, keeps SVG ids stable

    switch (id) {
        case 'basic_dark':
            return (
                <>
                    <Sky id={`${u}-sky`} stops={[['#0a0a0c', 0], ['#050506', 0.55], ['#000000', 1]]} />
                    <StarField seed={u} count={full ? 46 : 22} color="#8b8b96" />
                    <g opacity={0.5}>
                        <ellipse cx={VB.w / 2} cy={VB.h} rx={150} ry={54} fill="#2a2a33" opacity={0.5} />
                    </g>
                    <Finish id={u} />
                </>
            );

        case 'ocean_abyss':
            return (
                <>
                    <Sky id={`${u}-sky`} stops={[['#0e7490', 0], ['#0c4a6e', 0.4], ['#082f49', 0.72], ['#020617', 1]]} />
                    {/* God rays through water. */}
                    <g opacity={0.3}>
                        {[0.18, 0.38, 0.62, 0.84].map((t, i) => (
                            <polygon
                                key={i}
                                points={`${VB.w * t} 0, ${VB.w * t + 26} 0, ${VB.w * t + 58} ${VB.h}, ${VB.w * t - 18} ${VB.h}`}
                                fill="#a5f3fc"
                                opacity={0.16 + i * 0.05}
                            />
                        ))}
                    </g>
                    {full && <Caustics seed={u} color="#67e8f9" animate={animate} />}
                    <Motes seed={u} color="#cffafe" count={full ? 22 : 10} rise animate={animate} />
                    <Finish id={u} />
                </>
            );

        case 'crimson_throne':
            return (
                <>
                    <Sky id={`${u}-sky`} stops={[['#7f1d1d', 0], ['#4c0519', 0.5], ['#1c0308', 1]]} />
                    <Pinstripes id={`${u}-ps`} color="#fda4af" gap={26} opacity={0.14} />
                    <Rays seed={u} color="#fb7185" animate={animate} cy={VB.h * 0.5} />
                    {full && <Clouds seed={u} color="#450a0a" freq={0.008} opacity={0.5} />}
                    {/* Throne arch. */}
                    <path
                        d={`M${VB.w / 2 - 54} ${VB.h} L${VB.w / 2 - 54} 96 Q${VB.w / 2} 40, ${VB.w / 2 + 54} 96 L${VB.w / 2 + 54} ${VB.h} Z`}
                        fill="#1c0308"
                        opacity={0.55}
                    />
                    <Finish id={u} />
                </>
            );

        case 'toxic_swamp':
            return (
                <>
                    <Sky id={`${u}-sky`} stops={[['#65a30d', 0], ['#166534', 0.42], ['#052e16', 0.75], ['#020617', 1]]} />
                    {full && <Clouds seed={u} color="#a3e635" freq={0.014} opacity={0.34} />}
                    <Motes seed={u} color="#bef264" count={full ? 24 : 12} rise animate={animate} />
                    <g opacity={0.45}>
                        <ellipse cx={VB.w * 0.3} cy={VB.h + 10} rx={120} ry={38} fill="#022c22" />
                        <ellipse cx={VB.w * 0.78} cy={VB.h + 16} rx={140} ry={44} fill="#022c22" />
                    </g>
                    <Finish id={u} />
                </>
            );

        case 'royal_amethyst':
            return (
                <>
                    <Sky id={`${u}-sky`} stops={[['#7e22ce', 0], ['#4c1d95', 0.45], ['#1e1b4b', 0.78], ['#030014', 1]]} />
                    {full && <Clouds seed={u} color="#c084fc" freq={0.01} opacity={0.4} />}
                    <StarField seed={u} count={full ? 70 : 30} />
                    <Ribbons seed={u} colors={['#a855f7', '#6366f1']} bands={2} opacity={0.35} animate={animate} />
                    <Finish id={u} />
                </>
            );

        case 'neon_pink':
            return (
                <>
                    <Sky id={`${u}-sky`} stops={[['#2e1065', 0], ['#831843', 0.52], ['#18021a', 1]]} />
                    <StarField seed={u} count={full ? 40 : 18} color="#fbcfe8" maxY={120} />
                    <SunDisc gradId={`${u}-sun`} color="#db2777" core="#fde68a" cy={126} r={44} slats />
                    <HorizonGrid color="#f472b6" y={128} opacity={0.6} />
                    <Finish id={u} />
                </>
            );

        case 'arctic_frost':
            return (
                <>
                    <Sky id={`${u}-sky`} stops={[['#e0f2fe', 0], ['#7dd3fc', 0.3], ['#1e40af', 0.7], ['#0b1220', 1]]} />
                    <Shards seed={u} color="#e0f2fe" opacity={full ? 0.55 : 0.4} />
                    <Motes seed={u} color="#ffffff" count={full ? 26 : 12} shape="flake" animate={animate} />
                    <Finish id={u} />
                </>
            );

        case 'sunset_blaze':
            return (
                <>
                    <Sky id={`${u}-sky`} stops={[['#fb923c', 0], ['#ea580c', 0.32], ['#7c2d12', 0.62], ['#170a04', 1]]} />
                    <SunDisc gradId={`${u}-sun`} color="#f97316" core="#fef08a" cy={132} r={40} />
                    <g opacity={0.35}>
                        {[0, 1, 2, 3].map((i) => (
                            <rect key={i} x={0} y={104 + i * 12} width={VB.w} height={3 + i} fill="#fed7aa" opacity={0.5 - i * 0.09} />
                        ))}
                    </g>
                    <Ridge seed={u} color="#160903" y={152} />
                    <Motes seed={u} color="#fdba74" count={full ? 18 : 8} rise animate={animate} />
                    <Finish id={u} />
                </>
            );

        case 'aurora_borealis':
            return (
                <>
                    <Sky id={`${u}-sky`} stops={[['#04131a', 0], ['#052e2b', 0.45], ['#020617', 1]]} />
                    <StarField seed={u} count={full ? 90 : 34} />
                    <Ribbons
                        seed={u}
                        colors={['#34d399', '#22d3ee', '#a855f7']}
                        bands={full ? 4 : 2}
                        blur={full ? 10 : 6}
                        opacity={0.7}
                        animate={animate}
                    />
                    <Ridge seed={u} color="#01060b" y={168} />
                    <Finish id={u} />
                </>
            );

        case 'midnight_gold':
            return (
                <>
                    <Sky id={`${u}-sky`} stops={[['#101013', 0], ['#0a0a0c', 1]]} />
                    <CarbonWeave id={`${u}-cw`} opacity={full ? 0.85 : 0.6} />
                    <Pinstripes id={`${u}-ps`} color="#fbbf24" gap={30} opacity={0.3} />
                    <g opacity={0.55}>
                        <rect y={VB.h * 0.5 - 1} width={VB.w} height={2} fill="#fcd34d" />
                        <rect y={VB.h * 0.5 - 6} width={VB.w} height={1} fill="#fcd34d" opacity={0.4} />
                    </g>
                    <Motes seed={u} color="#fde68a" count={full ? 16 : 7} rise animate={animate} />
                    <Finish id={u} />
                </>
            );

        case 'cherry_blossom':
            return (
                <>
                    <Sky id={`${u}-sky`} stops={[['#fbcfe8', 0], ['#f472b6', 0.34], ['#9d174d', 0.68], ['#2e1065', 1]]} />
                    {full && <Clouds seed={u} color="#fce7f3" freq={0.011} opacity={0.3} />}
                    {/* Branch. */}
                    <g stroke="#3b0764" strokeWidth={2.6} fill="none" opacity={0.75}>
                        <path d={`M-6 26 Q60 40, 108 20 T210 34`} />
                        <path d={`M96 24 q10 18, 30 22`} strokeWidth={1.6} />
                        <path d={`M150 28 q-8 20, -26 26`} strokeWidth={1.4} />
                    </g>
                    <Motes seed={u} color="#fda4af" count={full ? 30 : 14} shape="petal" animate={animate} />
                    <Finish id={u} />
                </>
            );

        case 'matrix':
            return (
                <>
                    <Sky id={`${u}-sky`} stops={[['#031a0c', 0], ['#000000', 1]]} />
                    <Circuitry seed={u} color="#22c55e" opacity={0.22} />
                    <CodeRain seed={u} color="#22c55e" animate={animate} />
                    <Finish id={u} />
                </>
            );

        case 'premium_speed':
            return (
                <>
                    <Sky id={`${u}-sky`} stops={[['#083344', 0], ['#0e7490', 0.45], ['#020617', 1]]} />
                    <HorizonGrid color="#22d3ee" y={140} lines={9} opacity={0.35} />
                    <Streaks seed={u} color="#a5f3fc" animate={animate} />
                    <PulseRings color="#67e8f9" animate={animate} cx={VB.w * 0.12} cy={VB.h * 0.5} />
                    <Finish id={u} />
                </>
            );

        case 'premium_godspeed':
            return (
                <>
                    <Sky id={`${u}-sky`} stops={[['#fef3c7', 0], ['#f59e0b', 0.34], ['#78350f', 0.7], ['#1c1004', 1]]} />
                    <Rays seed={u} color="#fffbeb" animate={animate} cy={VB.h * 0.58} />
                    <SunDisc gradId={`${u}-sun`} color="#f59e0b" core="#ffffff" cy={VB.h * 0.58} r={34} />
                    <Streaks seed={u} color="#fde68a" animate={animate} />
                    <Motes seed={u} color="#fffbeb" count={full ? 20 : 9} rise animate={animate} />
                    <Finish id={u} />
                </>
            );

        case 'premium_combo':
            return (
                <>
                    <Sky id={`${u}-sky`} stops={[['#022c22', 0], ['#065f46', 0.42], ['#021b16', 1]]} />
                    {/* Hex lattice — precision/flawless motif. */}
                    <defs>
                        <pattern id={`${u}-hex`} width="28" height="24" patternUnits="userSpaceOnUse">
                            <path
                                d="M14 0 L26 6.5 L26 17.5 L14 24 L2 17.5 L2 6.5 Z"
                                fill="none"
                                stroke="#34d399"
                                strokeWidth="0.8"
                                opacity="0.5"
                            />
                        </pattern>
                    </defs>
                    <rect width={VB.w} height={VB.h} fill={`url(#${u}-hex)`} opacity={0.5} />
                    <PulseRings color="#6ee7b7" animate={animate} />
                    <Motes seed={u} color="#d1fae5" count={full ? 18 : 8} rise animate={animate} />
                    <Finish id={u} />
                </>
            );

        case 'premium_master':
            return (
                <>
                    <Sky id={`${u}-sky`} stops={[['#1e1b4b', 0], ['#4c1d95', 0.38], ['#0b0616', 0.78], ['#000000', 1]]} />
                    {full && <Clouds seed={u} color="#a78bfa" freq={0.009} octaves={4} opacity={0.45} />}
                    <StarField seed={u} count={full ? 110 : 40} />
                    {/* Void core with orbital rings. */}
                    <g transform={`translate(${VB.w / 2} ${VB.h / 2})`}>
                        <circle r={26} fill="#050014" />
                        <circle r={26} fill="none" stroke="#c4b5fd" strokeWidth={1.2} opacity={0.8} />
                        <motion.g
                            animate={animate ? { rotate: 360 } : undefined}
                            transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
                        >
                            <ellipse rx={62} ry={17} fill="none" stroke="#8b5cf6" strokeWidth={1.1} opacity={0.7} />
                            <ellipse rx={86} ry={26} fill="none" stroke="#6366f1" strokeWidth={0.8} opacity={0.45} />
                        </motion.g>
                    </g>
                    <Finish id={u} />
                </>
            );

        case 'premium_hellfire':
            return (
                <>
                    <Sky id={`${u}-sky`} stops={[['#fbbf24', 0], ['#ea580c', 0.3], ['#7f1d1d', 0.62], ['#170303', 1]]} />
                    {full && <Clouds seed={u} color="#450a0a" freq={0.013} opacity={0.55} />}
                    <Fissures seed={u} color="#f97316" hot="#fef3c7" />
                    <Motes seed={u} color="#fdba74" count={full ? 30 : 12} rise animate={animate} />
                    <Finish id={u} />
                </>
            );

        default:
            return (
                <>
                    <Sky id={`${u}-sky`} stops={[['#111827', 0], ['#030712', 1]]} />
                    <StarField seed={u} count={30} />
                    <Finish id={u} />
                </>
            );
    }
}

export function BannerArt({
    id,
    detail = 'full',
    className = '',
}: {
    id: string;
    detail?: Detail;
    className?: string;
}) {
    /**
     * `animate={false}` unconditionally.
     *
     * A scene's own animations were up to thirty framer loops — drifting motes,
     * displaced caustics, rotating rings — each writing an SVG attribute every
     * frame for as long as the banner was mounted. On the dossier that is the
     * whole time the page is open, so those writes were competing with every
     * tab switch, and inside the forge's picker there are twenty-odd banners on
     * screen at once.
     *
     * The life comes from one composited transform on the `<svg>` instead
     * (`fx-banner-drift`), which the compositor owns and which reduced-motion
     * turns off in CSS.
     */
    return (
        <svg
            aria-hidden
            className={`fx-banner-drift pointer-events-none absolute inset-0 h-full w-full ${className}`}
            viewBox={`0 0 ${VB.w} ${VB.h}`}
            preserveAspectRatio="xMidYMid slice"
        >
            <Scene id={id} detail={detail} animate={false} />
        </svg>
    );
}

