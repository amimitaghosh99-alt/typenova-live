// ═══════════════════════════════════════════════════════════════════════
//  KEYCAP AVATARS
//  ---------------------------------------------------------------------
//  A typing app's avatars should come from typing. So every avatar here is
//  a single mechanical keycap, drawn from a three-quarter-top angle, with a
//  legend printed on its face — the same thing you stare at all day while
//  you play. The legend *is* the identity: a caret, a Backspace arrow, a
//  ⌘, a switch stem, a WPM gauge.
//
//  Two axes carry all the visual variety, which is what keeps 24 avatars
//  from turning into noise:
//
//    · LEGEND  — who you are (drawn per id, see LEGENDS below)
//    · MATERIAL — how rare you are (ABS → doubleshot → translucent RGB →
//                 artisan alloy), derived from the catalog index
//
//  Everything is one inline SVG on a 0–100 grid: no raster assets, sharp at
//  32px in a friends list and at 96px in the dossier, and the accent colour
//  comes straight from the catalog entry so a keycap matches its own glow.
// ═══════════════════════════════════════════════════════════════════════

import React from 'react';
import { motion } from 'framer-motion';
import { AVATARS } from '@/data/customization';
import { rgba } from './profileMotion';

/* ─── Keycap geometry ─────────────────────────────────────────────────── */

/**
 * Skirt: the body of the cap. Slightly narrower at the top than the bottom,
 * which is what sells "I am looking down at a physical key" without needing
 * a real 3D projection.
 */
const SKIRT =
    'M28 11 H72 A11 11 0 0 1 83 21 L90 78 A11 11 0 0 1 79 90 H21 A11 11 0 0 1 10 78 L17 21 A11 11 0 0 1 28 11 Z';

/** Top face — the printed surface. Inset from the skirt on all sides. */
const FACE =
    'M31 18 H69 A8 8 0 0 1 77 26 L82 68 A8 8 0 0 1 74 77 H26 A8 8 0 0 1 18 68 L23 26 A8 8 0 0 1 31 18 Z';

/** Upper specular band across the face — a plastic sheen, not a highlight blob. */
const SHEEN =
    'M31 19 H69 A7 7 0 0 1 76 26 L77 33 C60 29 40 29 23 33 L24 26 A7 7 0 0 1 31 19 Z';

/** Inner concave dish: soft spherical finger well with inner gradient shadow */
const DISH =
    'M33 24 H67 A6 6 0 0 1 73 30 L77 65 A6 6 0 0 1 71 71 H29 A6 6 0 0 1 23 65 L27 30 A6 6 0 0 1 33 24 Z';

export type KeycapMaterial = 'abs' | 'doubleshot' | 'translucent' | 'artisan' | 'celestial';

/** Rarity climbs with catalog position and tier definitions. */
export function materialFor(index: number, id?: string): KeycapMaterial {
    if (id === 'gold_esc' || id === 'prism' || id === 'phoenix' || index >= 31) return 'celestial';
    if (id === 'carbon' || (index >= 21 && index <= 23) || index === 30) return 'artisan';
    if (id === 'matrix' || id === 'turbo' || id === 'quantum' || id === 'aurora' || (index >= 15 && index <= 20)) return 'translucent';
    if (id === 'vim' || id === 'soundwave' || (index >= 8 && index <= 14)) return 'doubleshot';
    return 'abs';
}

/* ─── Legends ─────────────────────────────────────────────────────────────
   Each legend draws inside a 100-unit box centred on (50, 47) and inherits
   `stroke`/`fill` from the parent group, so a legend never has to know what
   colour or material it landed on. Keep them to a few strokes: a keycap
   legend that reads at 32px is worth more than a detailed one that mushes.
─────────────────────────────────────────────────────────────────────────── */

const LEGENDS: Record<string, () => React.ReactNode> = {
    // Caret — the blinking insertion point. The origin of everything here.
    default: () => (
        <>
            <path d="M50 33 V56" strokeWidth={7} />
            <path d="M40 62 H60" strokeWidth={5} />
        </>
    ),

    // ⌫ Backspace
    cat: () => (
        <>
            <path d="M62 34 H44 L30 47 L44 60 H62 A5 5 0 0 0 67 55 V39 A5 5 0 0 0 62 34 Z" strokeWidth={4.5} fill="none" />
            <path d="M46 42 L57 53 M57 42 L46 53" strokeWidth={4} />
        </>
    ),

    // ⏎ Return
    dog: () => (
        <>
            <path d="M68 32 V45 A5 5 0 0 1 63 50 H36" strokeWidth={5} fill="none" />
            <path d="M45 41 L34 50 L45 59" strokeWidth={5} fill="none" />
        </>
    ),

    // ⇧ Shift
    bird: () => (
        <path d="M50 30 L68 48 H59 V62 H41 V48 H32 Z" strokeWidth={4.5} fill="none" />
    ),

    // Esc — the bail-out key
    skull: () => (
        <>
            <path d="M40 34 L31 43 L40 52" strokeWidth={4} fill="none" />
            <text
                x="58"
                y="52"
                textAnchor="middle"
                fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                fontSize="20"
                fontWeight="900"
                stroke="none"
                letterSpacing="0.5"
            >
                ESC
            </text>
        </>
    ),

    // ⇥ Tab
    ghost: () => (
        <>
            <path d="M30 47 H60" strokeWidth={5} />
            <path d="M50 37 L61 47 L50 57" strokeWidth={5} fill="none" />
            <path d="M69 32 V62" strokeWidth={5} />
        </>
    ),

    // Bolt — raw speed
    zap: () => (
        <path d="M55 28 L38 50 H48 L45 68 L62 45 H52 Z" strokeWidth={3.5} />
    ),

    // Spacebar — the widest key on the board
    rocket: () => (
        <>
            <rect x="28" y="40" width="44" height="14" rx="6" strokeWidth={4.5} fill="none" />
            <path d="M38 60 V64 M62 60 V64" strokeWidth={4} />
        </>
    ),

    // ⌃ Control
    moon: () => (
        <>
            <path d="M36 52 L50 36 L64 52" strokeWidth={6} fill="none" />
            <circle cx="50" cy="64" r="3.5" stroke="none" />
        </>
    ),

    // ⌥ Option / Alt
    sun: () => (
        <>
            <path d="M30 36 H43 L60 60 H72" strokeWidth={5} fill="none" />
            <path d="M58 36 H72" strokeWidth={5} />
        </>
    ),

    // ⌘ Command
    star: () => (
        <>
            <rect x="41" y="41" width="18" height="18" strokeWidth={4} fill="none" />
            <circle cx="35" cy="35" r="6" strokeWidth={4} fill="none" />
            <circle cx="65" cy="35" r="6" strokeWidth={4} fill="none" />
            <circle cx="35" cy="65" r="6" strokeWidth={4} fill="none" />
            <circle cx="65" cy="65" r="6" strokeWidth={4} fill="none" />
        </>
    ),

    // Switch stem — the cross under every keycap
    cpu: () => (
        <>
            <rect x="30" y="27" width="40" height="40" rx="7" strokeWidth={4} fill="none" />
            <path d="M50 36 V58 M39 47 H61" strokeWidth={6} />
        </>
    ),

    // Home row — F and J bumps included
    gamepad: () => (
        <>
            <rect x="24" y="38" width="16" height="18" rx="4" strokeWidth={3.5} fill="none" />
            <rect x="42" y="38" width="16" height="18" rx="4" strokeWidth={3.5} fill="none" />
            <rect x="60" y="38" width="16" height="18" rx="4" strokeWidth={3.5} fill="none" />
            <path d="M28 61 H36 M64 61 H72" strokeWidth={4} />
        </>
    ),

    // Streak flame, carved into the cap
    flame: () => (
        <>
            <path d="M50 26 C58 38 66 42 66 53 A16 16 0 0 1 34 53 C34 44 40 41 43 33 C45 40 49 41 50 26 Z" strokeWidth={4} fill="none" />
            <path d="M50 47 C53 52 54 55 54 58 A4.5 4.5 0 0 1 45 58 C45 54 48 52 50 47 Z" stroke="none" />
        </>
    ),

    // Shell prompt
    droplets: () => (
        <>
            <path d="M30 35 L44 47 L30 59" strokeWidth={5.5} fill="none" />
            <path d="M52 60 H72" strokeWidth={5.5} />
        </>
    ),

    // Braces — code mode
    hexagon: () => (
        <>
            <path d="M43 29 C36 29 38 44 30 47 C38 50 36 65 43 65" strokeWidth={4.5} fill="none" />
            <path d="M57 29 C64 29 62 44 70 47 C62 50 64 65 57 65" strokeWidth={4.5} fill="none" />
        </>
    ),

    // Combo — stacked chevrons climbing
    crown: () => (
        <>
            <path d="M36 40 L50 28 L64 40" strokeWidth={5} fill="none" opacity={0.45} />
            <path d="M36 54 L50 42 L64 54" strokeWidth={5} fill="none" opacity={0.75} />
            <path d="M36 68 L50 56 L64 68" strokeWidth={5} fill="none" />
        </>
    ),

    // Duel — two carets crossed. Head-to-head races.
    swords: () => (
        <>
            <path d="M34 30 L34 52 L42 60" strokeWidth={5} fill="none" />
            <path d="M66 30 L66 52 L58 60" strokeWidth={5} fill="none" />
            <path d="M40 66 H60" strokeWidth={4.5} />
        </>
    ),

    // Precision — crosshair with tick marks
    shield: () => (
        <>
            <circle cx="50" cy="47" r="17" strokeWidth={4} fill="none" />
            <circle cx="50" cy="47" r="4" stroke="none" />
            <path d="M50 22 V32 M50 62 V72 M25 47 H35 M65 47 H75" strokeWidth={4} />
        </>
    ),

    // Flawless — a clean run, sealed
    diamond: () => (
        <>
            <path d="M50 25 L72 47 L50 69 L28 47 Z" strokeWidth={4} fill="none" />
            <path d="M40 47 L47 54 L61 40" strokeWidth={5} fill="none" />
        </>
    ),

    // Focus — caret held inside brackets
    eye: () => (
        <>
            <path d="M38 30 H30 V64 H38" strokeWidth={4.5} fill="none" />
            <path d="M62 30 H70 V64 H62" strokeWidth={4.5} fill="none" />
            <path d="M50 36 V58" strokeWidth={6} />
        </>
    ),

    // Ghost text — the words waiting to be typed
    sparkles: () => (
        <>
            <path d="M26 38 H50" strokeWidth={5} opacity={0.9} />
            <path d="M56 38 H74" strokeWidth={5} opacity={0.35} />
            <path d="M26 50 H40" strokeWidth={5} opacity={0.55} />
            <path d="M46 50 H74" strokeWidth={5} opacity={0.22} />
            <path d="M26 62 H62" strokeWidth={5} opacity={0.16} />
        </>
    ),

    // Navigator — the arrow cluster
    compass: () => (
        <>
            <rect x="42" y="26" width="16" height="15" rx="4" strokeWidth={3.5} fill="none" />
            <rect x="24" y="45" width="16" height="15" rx="4" strokeWidth={3.5} fill="none" />
            <rect x="42" y="45" width="16" height="15" rx="4" strokeWidth={3.5} fill="none" />
            <rect x="60" y="45" width="16" height="15" rx="4" strokeWidth={3.5} fill="none" />
            <path d="M50 30 L50 37 M50 49 L50 56 M28 52 H35 M65 52 H72" strokeWidth={3} />
        </>
    ),

    // Record — a WPM needle pinned near the top of the dial
    trophy: () => (
        <>
            <path d="M26 60 A24 24 0 0 1 74 60" strokeWidth={4.5} fill="none" />
            <path d="M50 58 L64 36" strokeWidth={5} />
            <circle cx="50" cy="59" r="4.5" stroke="none" />
            <path d="M30 47 L34 49 M50 32 V36 M70 47 L66 49" strokeWidth={3.5} />
        </>
    ),

    // Terminal — Matrix command prompt with binary drop
    matrix: () => (
        <>
            <path d="M30 36 L40 46 L30 56" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <path d="M46 56 H60" strokeWidth={5} strokeLinecap="round" />
            <circle cx="68" cy="36" r="2.5" />
            <circle cx="68" cy="46" r="2.5" opacity={0.65} />
            <circle cx="68" cy="56" r="2.5" opacity={0.3} />
        </>
    ),

    // Hacker — Vim modal indicator :wq!
    vim: () => (
        <>
            <circle cx="34" cy="42" r="3" stroke="none" />
            <circle cx="34" cy="52" r="3" stroke="none" />
            <text x="56" y="53" textAnchor="middle" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize="16" fontWeight="900" stroke="none" letterSpacing="0.5">
                wq!
            </text>
        </>
    ),

    // Overdrive — Tachometer / boost gauge
    turbo: () => (
        <>
            <path d="M26 62 A24 24 0 1 1 74 62" strokeWidth={4.5} fill="none" strokeDasharray="3 4" />
            <path d="M50 50 L66 38" strokeWidth={5} strokeLinecap="round" />
            <circle cx="50" cy="50" r="4" stroke="none" />
            <path d="M60 28 L68 34" strokeWidth={4} strokeLinecap="round" />
        </>
    ),

    // Thock — Acoustic switch frequency wave
    soundwave: () => (
        <>
            <path d="M28 47 V47 M36 39 V55 M44 31 V63 M52 27 V67 M60 37 V57 M68 43 V51 M74 47 V47" strokeWidth={4.5} strokeLinecap="round" />
        </>
    ),

    // Quantum Core — Atomic orbital rings & glowing nucleus
    quantum: () => (
        <>
            <ellipse cx="50" cy="47" rx="22" ry="9" strokeWidth={3.5} fill="none" transform="rotate(-30 50 47)" />
            <ellipse cx="50" cy="47" rx="22" ry="9" strokeWidth={3.5} fill="none" transform="rotate(30 50 47)" />
            <circle cx="50" cy="47" r="6" stroke="none" />
        </>
    ),

    // Hyperdrive — Relativistic warp starfield
    aurora: () => (
        <>
            <circle cx="50" cy="47" r="3.5" stroke="none" />
            <path d="M50 47 L24 24 M50 47 L76 24 M50 47 L24 70 M50 47 L76 70 M50 47 L50 20 M50 47 L50 74 M50 47 L20 47 M50 47 L80 47" strokeWidth={3.5} strokeLinecap="round" strokeDasharray="4 6" />
        </>
    ),

    // Carbon Weave — High-tech composite weave monogram
    carbon: () => (
        <>
            <path d="M32 32 H68 L50 64 Z" strokeWidth={4.5} strokeLinejoin="round" fill="none" />
            <path d="M50 32 V64" strokeWidth={3.5} />
            <path d="M41 48 H59" strokeWidth={3.5} />
        </>
    ),

    // Midas Esc — 24K Gold luxury artisan crown
    gold_esc: () => (
        <>
            <path d="M28 42 L36 58 H64 L72 42 L58 48 L50 34 L42 48 Z" strokeWidth={4} strokeLinejoin="round" fill="none" />
            <circle cx="50" cy="32" r="2.5" stroke="none" />
            <circle cx="28" cy="40" r="2.5" stroke="none" />
            <circle cx="72" cy="40" r="2.5" stroke="none" />
            <path d="M38 64 H62" strokeWidth={3.5} strokeLinecap="round" />
        </>
    ),

    // Supernova — Prismatic faceted crystal starburst
    prism: () => (
        <>
            <path d="M50 24 L68 47 L50 70 L32 47 Z" strokeWidth={4} strokeLinejoin="round" fill="none" />
            <path d="M32 47 H68 M50 24 V70" strokeWidth={2.5} />
            <circle cx="50" cy="47" r="3.5" stroke="none" />
        </>
    ),

    // Immortal — Phoenix ascendant flame wings
    phoenix: () => (
        <>
            <path d="M50 30 C46 36 44 42 44 48 C44 54 47 58 50 62 C53 58 56 54 56 48 C56 42 54 36 50 30 Z" strokeWidth={3.5} fill="none" />
            <path d="M40 44 C32 40 26 46 24 54 C30 54 36 52 42 50" strokeWidth={4} strokeLinecap="round" fill="none" />
            <path d="M60 44 C68 40 74 46 76 54 C70 54 64 52 58 50" strokeWidth={4} strokeLinecap="round" fill="none" />
        </>
    ),
};

/* ─── Component ───────────────────────────────────────────────────────── */

export interface AvatarArtProps {
    id: string;
    /** Rendered box in px; the cap fills it edge to edge. */
    size?: number;
    /** Shrinks the legend for very small renders. 1 = catalog default. */
    glyphScale?: number;
    /** Depresses the cap — use it to confirm a tap or an equip. */
    pressed?: boolean;
    className?: string;
}

/**
 * One keycap avatar. Pure SVG + a single optional idle animation on the RGB
 * tiers, so a 24-tile grid stays cheap.
 */
export const AvatarArt = React.memo(function AvatarArt({
    id,
    size = 64,
    glyphScale = 1,
    pressed = false,
    className = '',
}: AvatarArtProps) {
    const index = Math.max(0, AVATARS.findIndex((a) => a.id === id));
    const def = AVATARS[index] || AVATARS[0];
    const accent = def.glowColor || '6, 182, 212';
    const material = materialFor(index, def.id);
    const legend = LEGENDS[def.id] || LEGENDS.default;

    // Below ~40px the fine passes (engraving, RGB bloom, tick marks) stop
    // reading as detail and start reading as dirt, so they're dropped.
    const fine = size >= 40;
    const uid = `kc-${def.id}-${material}`;

    const isGold = def.id === 'gold_esc';
    const isPhoenix = def.id === 'phoenix';

    const skirtStops =
        material === 'celestial'
            ? (isGold
                ? ['#fcd34d', '#b45309', '#451a03']
                : isPhoenix
                ? ['#fb7185', '#be123c', '#4c0519']
                : ['#f472b6', '#8b5cf6', '#1e1b4b'])
            : material === 'artisan'
            ? ['#4a5364', '#20252f', '#0d1015']
            : material === 'translucent'
                ? [rgba(accent, 0.38), rgba(accent, 0.15), '#0b0e14']
                : material === 'doubleshot'
                    ? ['#2b3546', '#1a212d', '#0c1017']
                    : ['#252a33', '#171b22', '#0d1014'];

    const faceStops =
        material === 'celestial'
            ? (isGold
                ? ['#fef08a', '#d97706']
                : isPhoenix
                ? ['#fda4af', '#e11d48']
                : ['#fbcfe8', '#a855f7'])
            : material === 'artisan'
            ? ['#5b6577', '#2b313d']
            : material === 'translucent'
                ? [rgba(accent, 0.35), rgba(accent, 0.1)]
                : material === 'doubleshot'
                    ? ['#39445a', '#1e2532']
                    : ['#31373f', '#1c2027'];

    /** Legend colour: dark caps print bright, light artisan/gold caps print dark. */
    const legendColor =
        material === 'celestial' && isGold
            ? '#451a03'
            : material === 'artisan'
            ? '#0b0e13'
            : rgba(accent, 1);
    const glowStrength =
        material === 'celestial' ? 0.85 : material === 'translucent' ? 0.75 : material === 'artisan' ? 0.5 : 0.4;

    return (
        <div
            className={`relative shrink-0 ${className}`}
            style={{ width: size, height: size }}
            aria-hidden
        >
            {/* RGB bleed under the cap — the giveaway of a lit board. */}
            {fine && material !== 'abs' && (
                <span
                    className="fx-bleed pointer-events-none absolute left-1/2 top-[62%] -translate-x-1/2 rounded-[50%] blur-md"
                    style={{
                        width: size * 0.78,
                        height: size * 0.3,
                        background: rgba(accent, material === 'celestial' ? 0.65 : material === 'translucent' ? 0.55 : 0.32),
                    }}
                />
            )}

            <motion.svg
                viewBox="0 0 100 100"
                width={size}
                height={size}
                className="relative block"
                animate={{ y: pressed ? 3 : 0 }}
                transition={{ type: 'spring', stiffness: 700, damping: 26 }}
            >
                <defs>
                    <linearGradient id={`${uid}-skirt`} x1="0" y1="0" x2="0.35" y2="1">
                        <stop offset="0%" stopColor={skirtStops[0]} />
                        <stop offset="55%" stopColor={skirtStops[1]} />
                        <stop offset="100%" stopColor={skirtStops[2]} />
                    </linearGradient>

                    <linearGradient id={`${uid}-face`} x1="0" y1="0" x2="0.2" y2="1">
                        <stop offset="0%" stopColor={faceStops[0]} />
                        <stop offset="100%" stopColor={faceStops[1]} />
                    </linearGradient>

                    <radialGradient id={`${uid}-dish`} cx="50%" cy="42%" r="52%" fx="50%" fy="32%">
                        <stop offset="0%" stopColor="rgba(0,0,0,0.02)" />
                        <stop offset="65%" stopColor="rgba(0,0,0,0.18)" />
                        <stop offset="100%" stopColor="rgba(0,0,0,0.42)" />
                    </radialGradient>

                    <linearGradient id={`${uid}-sheen`} x1="0" y1="0" x2="0.2" y2="1">
                        <stop offset="0%" stopColor="rgba(255,255,255,0.34)" />
                        <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                    </linearGradient>

                    <clipPath id={`${uid}-faceclip`}>
                        <path d={FACE} />
                    </clipPath>
                </defs>

                {/* Contact shadow — grounds the cap instead of floating it. */}
                <ellipse cx="50" cy="92" rx="34" ry="5" fill="rgba(0,0,0,0.55)" />

                {/* Skirt */}
                <path d={SKIRT} fill={`url(#${uid}-skirt)`} />
                <path d={SKIRT} fill="none" stroke={rgba(accent, material === 'celestial' ? 0.75 : material === 'abs' ? 0.3 : 0.55)} strokeWidth={1.6} />

                {/* Side-wall shading: a soft inner edge along the bottom of the skirt. */}
                <path
                    d="M14 62 L17 80 A11 11 0 0 0 28 90 H72 A11 11 0 0 0 83 80 L86 62"
                    fill="none"
                    stroke="rgba(0,0,0,0.4)"
                    strokeWidth={3}
                />

                {/* Top face */}
                <path d={FACE} fill={`url(#${uid}-face)`} />
                {/* Spherical Concave Dish */}
                <path d={DISH} fill={`url(#${uid}-dish)`} />
                <path d={DISH} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={0.8} />
                <path d={SHEEN} fill={`url(#${uid}-sheen)`} />
                <path d={FACE} fill="none" stroke={rgba(accent, material === 'celestial' ? 0.85 : material === 'artisan' ? 0.75 : 0.4)} strokeWidth={1.3} />

                {/* Artisan caps get engraved corner ticks — a machined touch. */}
                {fine && material === 'artisan' && (
                    <g clipPath={`url(#${uid}-faceclip)`} stroke="rgba(0,0,0,0.35)" strokeWidth={1.2}>
                        <path d="M22 24 L30 24 M22 24 L22 31" />
                        <path d="M78 24 L70 24 M78 24 L78 31" />
                    </g>
                )}

                {/* Celestial starburst shimmer */}
                {fine && material === 'celestial' && (
                    <path
                        d="M72 22 L74 25.5 L78 27 L74 28.5 L72 32 L70 28.5 L66 27 L70 25.5 Z"
                        fill="#ffffff"
                        className="drop-shadow-[0_0_6px_rgba(255,255,255,0.9)]"
                    />
                )}

                {/* Legend */}
                <g
                    transform={`translate(50 47) scale(${glyphScale}) translate(-50 -47)`}
                    stroke={legendColor}
                    fill={legendColor}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={
                        fine
                            ? { filter: `drop-shadow(0 0 ${material === 'artisan' ? 1 : 3}px ${rgba(accent, glowStrength)})` }
                            : undefined
                    }
                >
                    {legend()}
                </g>

                {/* Translucent caps let the switch LED wash up through the legend. */}
                {fine && material === 'translucent' && (
                    <ellipse cx="50" cy="72" rx="22" ry="6" fill={rgba(accent, 0.35)} clipPath={`url(#${uid}-faceclip)`} />
                )}
            </motion.svg>
        </div>
    );
});
