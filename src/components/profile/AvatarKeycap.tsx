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

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AVATARS } from '@/data/customization';
import { loadArtisanConfig, type ArtisanConfig } from '@/data/artisanCustomizer';
import { ArtisanKeycapSvg } from './ArtisanKeycapSvg';
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
    if (id === 'custom_artisan' || id === 'sakura_rift' || id === 'astral_bloom' || id === 'gold_esc' || id === 'prism' || id === 'phoenix' || id === 'nova_prime' || id === 'typenova' || index >= 34) return 'celestial';
    if (id === 'damascus_relic' || id === 'carbon' || (index >= 21 && index <= 23) || index === 30) return 'artisan';
    if (id === 'ghost_circuit' || id === 'matrix' || id === 'turbo' || id === 'quantum' || id === 'aurora' || (index >= 15 && index <= 20)) return 'translucent';
    if (id === 'vim' || id === 'soundwave' || (index >= 8 && index <= 14)) return 'doubleshot';
    return 'abs';
}

/* ─── Procedural Artisan & Circuit Helpers ───────────────────────────────── */

function damascusRing(radius: number, cx = 36, cy = 41) {
    return Array.from({ length: 81 }, (_, i) => {
        const angle = (i / 80) * Math.PI * 2;
        const ripple = Math.sin(angle * 5 + radius * 0.13) * 1.7 + Math.cos(angle * 3) * 1.4;
        return `${i === 0 ? 'M' : 'L'}${(cx + Math.cos(angle) * (radius + ripple)).toFixed(2)} ${(cy + Math.sin(angle) * (radius * 0.7 + ripple)).toFixed(2)}`;
    }).join(' ') + ' Z';
}

const metalRings = Array.from({ length: 33 }, (_, i) => damascusRing(4 + i * 1.9));
const circuitLines = [
    'M25 31 H31 V39 H36 V45 H42', 'M75 31 H67 V39 H63 V45 H58',
    'M23 42 H29 V48 H36 V51 H42', 'M77 42 H71 V48 H64 V51 H58',
    'M22 55 H28 V62 H37 V57 H42', 'M78 55 H72 V62 H63 V57 H58',
    'M29 69 H38 V63 H43', 'M71 69 H62 V63 H57',
    'M37 25 V31 H40', 'M63 25 V31 H60',
];
const circuitTraceFlow = 'M28 35 H34 L39 40 H43 M72 35 H65 L60 40 H57 M27 59 H35 L40 54 H43 M73 59 H65 L60 54 H57 M33 27 V30 L39 36 M67 67 V64 L61 58';
const damascusRune = 'M38 34 L50 42 L62 34 V42 L54 47 L62 52 V60 L50 52 L38 60 V52 L46 47 L38 42 Z';

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

    // Nova Prime — Apex celestial cosmic core with real-time vector line drawing animation
    nova_prime: () => (
        <>
            {/* Background blueprint trace guidelines (always anchors the geometry with a subtle electric neon trace) */}
            <g opacity={0.34}>
                <path
                    d="M 27 47 a 23 11 0 1 0 46 0 a 23 11 0 1 0 -46 0"
                    strokeWidth={2}
                    fill="none"
                    strokeDasharray="4 3"
                />
                <path
                    d="M 50 24 a 11 23 0 1 0 0 46 a 11 23 0 1 0 0 -46"
                    strokeWidth={2}
                    fill="none"
                    strokeDasharray="4 3"
                />
                <path
                    d="M50 20 L53 38 L71 35 L57 47 L71 59 L53 56 L50 74 L47 56 L29 59 L43 47 L29 35 L47 38 Z"
                    strokeWidth={2.4}
                    strokeLinejoin="round"
                    fill="none"
                />
                <path
                    d="M50 38 L58 47 L50 56 L42 47 Z"
                    strokeWidth={2}
                    strokeLinejoin="round"
                    fill="none"
                />
                <circle cx="50" cy="47" r="2.5" stroke="none" />
            </g>

            {/* Active drawing lines: dynamic line synthesis that continuously constructs the design */}
            {/* 1. Horizontal Celestial Orbit */}
            <motion.path
                d="M 27 47 a 23 11 0 1 0 46 0 a 23 11 0 1 0 -46 0"
                strokeWidth={3}
                fill="none"
                strokeDasharray="6 3"
                initial={{ pathLength: 0, pathOffset: 0 }}
                animate={{
                    pathLength: [0, 1, 1, 0],
                    pathOffset: [0, 0, 0.4, 1],
                }}
                transition={{
                    duration: 3.5,
                    times: [0, 0.48, 0.78, 1],
                    ease: 'easeInOut',
                    repeat: Infinity,
                }}
            />

            {/* 2. Vertical Celestial Orbit (offset) */}
            <motion.path
                d="M 50 24 a 11 23 0 1 0 0 46 a 11 23 0 1 0 0 -46"
                strokeWidth={3}
                fill="none"
                strokeDasharray="6 3"
                initial={{ pathLength: 0, pathOffset: 0 }}
                animate={{
                    pathLength: [0, 1, 1, 0],
                    pathOffset: [0, 0, 0.4, 1],
                }}
                transition={{
                    duration: 3.5,
                    times: [0, 0.48, 0.78, 1],
                    ease: 'easeInOut',
                    repeat: Infinity,
                    delay: 0.15,
                }}
            />

            {/* 3. The Grand 8-Pointed Nova Star (apex line drawing) */}
            <motion.path
                d="M50 20 L53 38 L71 35 L57 47 L71 59 L53 56 L50 74 L47 56 L29 59 L43 47 L29 35 L47 38 Z"
                strokeWidth={3.6}
                strokeLinejoin="round"
                fill="none"
                initial={{ pathLength: 0, pathOffset: 0 }}
                animate={{
                    pathLength: [0, 1, 1, 0],
                    pathOffset: [0, 0, 0.35, 1],
                }}
                transition={{
                    duration: 3.5,
                    times: [0, 0.52, 0.78, 1],
                    ease: 'easeInOut',
                    repeat: Infinity,
                    delay: 0.25,
                }}
            />

            {/* 4. Diamond Matrix Core */}
            <motion.path
                d="M50 38 L58 47 L50 56 L42 47 Z"
                strokeWidth={3}
                strokeLinejoin="round"
                fill="none"
                initial={{ pathLength: 0, pathOffset: 0 }}
                animate={{
                    pathLength: [0, 1, 1, 0],
                    pathOffset: [0, 0, 0.4, 1],
                }}
                transition={{
                    duration: 3.5,
                    times: [0, 0.55, 0.78, 1],
                    ease: 'easeInOut',
                    repeat: Infinity,
                    delay: 0.38,
                }}
            />

            {/* 5. Radiant Core Flare — ignites as the lines complete the geometry */}
            <motion.circle
                cx="50"
                cy="47"
                stroke="none"
                initial={{ r: 0, opacity: 0 }}
                animate={{
                    r: [0, 0, 5.2, 3.8, 0],
                    opacity: [0, 0, 1, 0.95, 0],
                }}
                transition={{
                    duration: 3.5,
                    times: [0, 0.45, 0.58, 0.78, 1],
                    ease: 'easeInOut',
                    repeat: Infinity,
                    delay: 0.38,
                }}
            />
        </>
    ),

    // TypeNova — Apex Living Fluid Glass Keycap Emblem with active streaming conduits, cavitation bubbles, and molten dynamics
    typenova: () => (
        <motion.g
            style={{ transformOrigin: '50px 47px' }}
            animate={{
                scale: [1, 1.025, 1],
                filter: [
                    'drop-shadow(0 0 8px rgba(0, 240, 255, 0.7)) drop-shadow(0 0 20px rgba(0, 180, 255, 0.35)) brightness(1.05)',
                    'drop-shadow(0 0 22px rgba(0, 240, 255, 1)) drop-shadow(0 0 45px rgba(0, 240, 255, 0.6)) brightness(1.26)',
                    'drop-shadow(0 0 8px rgba(0, 240, 255, 0.7)) drop-shadow(0 0 20px rgba(0, 180, 255, 0.35)) brightness(1.05)',
                ],
            }}
            transition={{
                duration: 4,
                repeat: Infinity,
                ease: 'easeInOut',
            }}
        >
            {/* 1. Masked 3D Molten Glass Logo with Physical SVG Fluid Refraction */}
            <g mask="url(#typenova-smooth-mask)">
                <image
                    href="/logo.png"
                    x="20.5"
                    y="17.5"
                    width="59"
                    height="59"
                    preserveAspectRatio="xMidYMid meet"
                    filter="url(#typenova-fluid-warp)"
                />
            </g>

            {/* 2. Active Fluid Conduits (Surges flowing through the T and N channels) */}
            <g filter="url(#typenova-conduit-glow)" style={{ mixBlendMode: 'screen', pointerEvents: 'none' }}>
                {/* T-tube cyan outer stream */}
                <motion.path
                    d="M 28 29.5 H 50 M 37 29.5 V 63"
                    stroke="#00f0ff"
                    strokeWidth={3.2}
                    strokeLinecap="round"
                    fill="none"
                    strokeDasharray="20 34"
                    animate={{ strokeDashoffset: [120, 0] }}
                    transition={{ duration: 2.8, repeat: Infinity, ease: [0.4, 0, 0.2, 1] }}
                />
                {/* T-tube white-hot inner fluid core */}
                <motion.path
                    d="M 28 29.5 H 50 M 37 29.5 V 63"
                    stroke="#ffffff"
                    strokeWidth={1.4}
                    strokeLinecap="round"
                    fill="none"
                    strokeDasharray="10 44"
                    animate={{ strokeDashoffset: [120, 0] }}
                    transition={{ duration: 2.8, repeat: Infinity, ease: [0.4, 0, 0.2, 1] }}
                />

                {/* N-tube cyan outer stream */}
                <motion.path
                    d="M 47 62.5 V 34.5 L 68 62.5 V 34.5"
                    stroke="#00f0ff"
                    strokeWidth={3.2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                    strokeDasharray="28 46"
                    animate={{ strokeDashoffset: [160, 0] }}
                    transition={{ duration: 2.8, repeat: Infinity, ease: [0.4, 0, 0.2, 1], delay: 0.15 }}
                />
                {/* N-tube white-hot inner fluid core */}
                <motion.path
                    d="M 47 62.5 V 34.5 L 68 62.5 V 34.5"
                    stroke="#ffffff"
                    strokeWidth={1.4}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                    strokeDasharray="14 60"
                    animate={{ strokeDashoffset: [160, 0] }}
                    transition={{ duration: 2.8, repeat: Infinity, ease: [0.4, 0, 0.2, 1], delay: 0.15 }}
                />
            </g>

            {/* 3. Molten Droplet Sag with Elastic Surface Tension at bottom */}
            <motion.path
                d="M 39 70 C 42 75.5 48 76.5 52 71"
                stroke="#00f0ff"
                strokeWidth={2}
                fill="none"
                strokeLinecap="round"
                style={{ transformOrigin: '45px 72px' }}
                animate={{
                    scaleY: [1, 1.3, 0.9, 1],
                    y: [0, 1, -0.3, 0],
                }}
                transition={{
                    duration: 3.2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                }}
            />
            <motion.circle
                cx="45.5"
                cy="73.5"
                r="1.6"
                fill="#ffffff"
                style={{ transformOrigin: '45.5px 73.5px' }}
                animate={{
                    scaleY: [1, 1.3, 0.9, 1],
                    y: [0, 1, -0.3, 0],
                }}
                transition={{
                    duration: 3.2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                }}
            />

            {/* 4. Cavitation Micro-Bubbles in Fluid Conduits */}
            <g style={{ mixBlendMode: 'screen', pointerEvents: 'none' }}>
                <motion.circle
                    cx="37"
                    cy="57"
                    r="1.4"
                    fill="#ffffff"
                    stroke="#00f0ff"
                    strokeWidth={0.6}
                    animate={{
                        y: [0, -24],
                        scale: [0.6, 1.2],
                        opacity: [0, 1, 1, 0],
                    }}
                    transition={{
                        duration: 3.2,
                        repeat: Infinity,
                        ease: 'easeInOut',
                    }}
                />
                <motion.circle
                    cx="58"
                    cy="52"
                    r="1.5"
                    fill="#ffffff"
                    stroke="#00f0ff"
                    strokeWidth={0.6}
                    animate={{
                        y: [0, -28],
                        scale: [0.6, 1.1],
                        opacity: [0, 1, 1, 0],
                    }}
                    transition={{
                        duration: 3.6,
                        repeat: Infinity,
                        ease: 'easeInOut',
                        delay: 0.6,
                    }}
                />
            </g>

            {/* 5. Specular Rolling Caustic Sweep across glass face */}
            <g clipPath="url(#typenova-dish-clip)" style={{ mixBlendMode: 'overlay', pointerEvents: 'none' }}>
                <motion.rect
                    x="20"
                    y="16"
                    width="60"
                    height="60"
                    fill="url(#typenova-caustic-sweep)"
                    style={{ transformOrigin: '50px 46px' }}
                    animate={{
                        x: [-35, 40],
                        y: [-30, 35],
                        opacity: [0, 0.85, 0.85, 0],
                    }}
                    transition={{
                        duration: 4.2,
                        repeat: Infinity,
                        ease: 'easeInOut',
                    }}
                />
            </g>
        </motion.g>
    ),

    // Damascus Relic — 1000 layers of folded steel, brass inlay maker's seal, corner machine screws
    damascus_relic: () => (
        <g style={{ transformOrigin: '50px 47px' }}>
            <defs>
                <linearGradient id="damascus-brass" x1="0" y1="0" x2="0.8" y2="1">
                    <stop stopColor="#fcdf9e" />
                    <stop offset=".3" stopColor="#b98d4b" />
                    <stop offset=".53" stopColor="#f5d899" />
                    <stop offset=".74" stopColor="#a87b3c" />
                    <stop offset="1" stopColor="#e2bd77" />
                </linearGradient>
                <filter id="damascus-engrave" x="-35%" y="-35%" width="170%" height="170%">
                    <feDropShadow dx="0" dy="1.1" stdDeviation=".8" floodColor="#080e09" floodOpacity=".95" />
                </filter>
            </defs>

            {/* Damascus steel folded ripples across the face */}
            <g opacity={0.65}>
                {metalRings.map((d, i) => (
                    <path
                        key={i}
                        d={d}
                        stroke={i % 3 === 0 ? '#cec5a7' : '#aaa88d'}
                        strokeWidth={i % 3 === 0 ? 0.35 : 0.22}
                        opacity={i % 3 === 0 ? 0.5 : 0.33}
                        fill="none"
                    />
                ))}
                {Array.from({ length: 30 }, (_, i) => (
                    <path key={i} d={`M17 ${19 + i * 2} H83`} stroke="#e4dfbf" strokeWidth={0.1} opacity={0.18} fill="none" />
                ))}
            </g>

            {/* 4 Corner Brass Machine Screws */}
            {[[29, 23.7], [71, 23.7], [25.8, 70.5], [74.2, 70.5]].map(([x, y], i) => (
                <g key={i}>
                    <circle cx={x} cy={y} r={1.8} fill="#272d25" stroke="#cab78a" strokeWidth={0.5} />
                    <circle cx={x} cy={y} r={1.2} fill="#b39b68" />
                    <path d={`M${x - 0.75} ${y + 0.35} L${x + 0.75} ${y - 0.35}`} stroke="#383929" strokeWidth={0.55} />
                </g>
            ))}

            {/* Center Dial & Engraved Brass Seal */}
            <circle cx="50" cy="47" r={20.4} fill="#0f1914" fillOpacity={0.4} stroke="#afa078" strokeWidth={0.45} />
            <circle cx="50" cy="47" r={18.6} fill="none" stroke="#c7b185" strokeWidth={1.65} strokeDasharray="1.2 3.65" opacity={0.57} />
            <circle cx="50" cy="47" r={16.5} fill="none" stroke="#0b140f" strokeWidth={0.9} />
            <circle cx="50" cy="47" r={16} fill="none" stroke="#d6c396" strokeWidth={0.35} opacity={0.7} />
            
            {/* The Brass Relic Rune */}
            <path d={damascusRune} fill="url(#damascus-brass)" stroke="#f6dba2" strokeWidth={0.45} strokeLinejoin="bevel" filter="url(#damascus-engrave)" />
            <path d="M39 35 L50 43 L61 35 M39 59 L50 51 L61 59" fill="none" stroke="#ffe6af" strokeWidth={0.6} opacity={0.85} />
            <path d="M46.5 47 L50 44.7 L53.5 47 L50 49.3 Z" fill="#eacb86" stroke="none" />
            
            {/* Shimmering gleam */}
            <motion.path
                d="M39 35 L50 43 L61 35 M38 52 L46 47 M54 47 L62 42"
                fill="none"
                stroke="#fff3c5"
                strokeWidth={0.8}
                animate={{ opacity: [0.15, 0.85, 0.15] }}
                transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
            />
            {/* Cardinal tick alignment marks */}
            <path d="M48 25.5 H52 M48 68.5 H52 M28.5 45 V49 M71.5 45 V49" stroke="#d4bb83" strokeWidth={0.65} opacity={0.8} />
        </g>
    ),

    // Ghost Circuit — Smoked polymer shell, live motherboard PCB traces, and glowing vacuum tube heart
    ghost_circuit: () => (
        <g style={{ transformOrigin: '50px 47px' }}>
            <defs>
                <linearGradient id="circuit-tube" x1="0" y1="0" x2="1" y2="0">
                    <stop stopColor="#9dffcf" stopOpacity={0.26} />
                    <stop offset=".25" stopColor="#043125" stopOpacity={0.75} />
                    <stop offset=".58" stopColor="#145e3f" stopOpacity={0.7} />
                    <stop offset="1" stopColor="#c1ffe0" stopOpacity={0.25} />
                </linearGradient>
                <linearGradient id="circuit-filament" x1="0" y1="0" x2="0" y2="1">
                    <stop stopColor="#eaffcb" />
                    <stop offset=".5" stopColor="#7bffaf" />
                    <stop offset="1" stopColor="#d4ffae" />
                </linearGradient>
                <filter id="circuit-glow" x="-100%" y="-50%" width="300%" height="200%">
                    <feGaussianBlur stdDeviation="1.6" />
                    <feMerge>
                        <feMergeNode />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>

            {/* Motherboard PCB Traces & SMT Components across dish */}
            <g opacity={0.75}>
                {circuitLines.map((d, i) => (
                    <path key={i} d={d} stroke={i % 3 === 0 ? '#b5bc78' : '#76c296'} strokeWidth={0.5} opacity={0.65} fill="none" />
                ))}
                {[[30, 32], [69, 31], [28, 63], [72, 63], [36, 48], [64, 48]].map(([x, y], i) => (
                    <g key={i}>
                        <rect x={x - 1.1} y={y - 1.8} width={2.2} height={3.6} rx={0.3} fill="#09271b" stroke="#91aa74" strokeWidth={0.35} />
                        <path d={`M${x - 1.3} ${y - 1} h2.6 M${x - 1.3} ${y + 1} h2.6`} stroke="#d8bc8a" strokeWidth={0.5} />
                    </g>
                ))}
            </g>

            {/* Static & Flowing Circuit Lines */}
            <path d={circuitTraceFlow} fill="none" stroke="#5bd596" strokeWidth={0.8} opacity={0.65} />
            <motion.path
                d={circuitTraceFlow}
                fill="none"
                stroke="#c1ffe0"
                strokeWidth={1.1}
                strokeDasharray="2 22"
                animate={{ strokeDashoffset: [48, 0], opacity: [0.5, 0.9, 0.5] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
            />
            {[[28, 35], [72, 35], [27, 59], [73, 59], [33, 27], [67, 67]].map(([x, y], i) => (
                <g key={i}>
                    <circle cx={x} cy={y} r={1.7} fill="#132d21" stroke="#6fdeaa" strokeWidth={0.65} />
                    <circle cx={x} cy={y} r={0.7} fill="#baffd2" />
                </g>
            ))}

            {/* Vacuum Glass Envelope */}
            <path d="M42 38 C42 27 58 27 58 38 V57 C58 67 42 67 42 57 Z" fill="url(#circuit-tube)" stroke="#a0e7ba" strokeWidth={0.85} />
            <path d="M44 38 C44 30 54 30 55 35 M44 40 V55" stroke="#e4ffe6" strokeWidth={0.8} opacity={0.8} strokeLinecap="round" fill="none" />
            <path d="M57 39 V56" stroke="#67c987" strokeWidth={0.45} opacity={0.6} fill="none" />
            <ellipse cx="50" cy="59" rx={7.5} ry={2.7} fill="#062018" stroke="#7db791" strokeWidth={0.6} />
            <path d="M44 61 H56 M44.5 63 H55.5 M46 65 H54" stroke="#baaf71" strokeWidth={1.3} />
            <path d="M47 62 V67 M53 62 V67" stroke="#cff8ba" strokeWidth={0.8} />

            {/* Breathing Vacuum Filament */}
            <motion.g
                animate={{ opacity: [0.65, 1, 0.65] }}
                transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
            >
                <path d="M47 57 V39 L50 35 L53 39 V57" fill="none" stroke="url(#circuit-filament)" strokeWidth={1.9} strokeLinejoin="round" filter="url(#circuit-glow)" />
                <path d="M46 41 L54 44 L46 47 L54 50 L46 53" fill="none" stroke="#ceffc2" strokeWidth={1.1} strokeLinejoin="round" />
                <path d="M50 36 V56" stroke="#efffe1" strokeWidth={0.55} />
            </motion.g>
            <path d="M40 40 H42 M58 40 H60 M40 54 H42 M58 54 H60" stroke="#f2d08b" strokeWidth={1.5} />
        </g>
    ),

    // Astral Bloom — Crystallized supernova in violet glass with faceted crystal petals and celestial orbit
    astral_bloom: () => (
        <g style={{ transformOrigin: '50px 47px' }}>
            <defs>
                <radialGradient id="astral-aura">
                    <stop stopColor="#edbfff" stopOpacity={0.65} />
                    <stop offset=".4" stopColor="#c580e6" stopOpacity={0.2} />
                    <stop offset="1" stopColor="#a893f8" stopOpacity={0} />
                </radialGradient>
                <linearGradient id="astral-crystal" x1="0" y1="0" x2=".8" y2="1">
                    <stop stopColor="#ffffff" />
                    <stop offset=".35" stopColor="#f2c5ee" />
                    <stop offset=".7" stopColor="#afa3f9" />
                    <stop offset="1" stopColor="#7150a2" />
                </linearGradient>
                <filter id="astral-bloom-glow" x="-100%" y="-100%" width="300%" height="300%">
                    <feGaussianBlur stdDeviation="1.2" />
                    <feMerge>
                        <feMergeNode />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>

            {/* Radiant Astral Aura */}
            <motion.circle
                cx="50" cy="47" r={26} fill="url(#astral-aura)"
                animate={{ opacity: [0.55, 1, 0.55], scale: [0.96, 1.04, 0.96] }}
                transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
                style={{ transformOrigin: '50px 47px' }}
            />

            {/* Geometric Refractive Crystal Facets */}
            <g strokeLinejoin="round" strokeWidth={0.3}>
                <path d="M50 25 L55 39 L50 47 L45 39 Z" fill="#b59ddb" stroke="#f6e5ff" />
                <path d="M50 25 V47 L55 39 Z" fill="#f5d8f3" />
                <path d="M50 69 L45 55 L50 47 L55 55 Z" fill="#8b77c1" stroke="#d9b9f4" />
                <path d="M50 69 V47 L55 55 Z" fill="#d4b4ed" />
                <path d="M27 47 L42 41 L50 47 L42 53 Z" fill="#af98d3" stroke="#ebd5ff" />
                <path d="M27 47 H50 L42 53 Z" fill="#d3b6dc" />
                <path d="M73 47 L58 53 L50 47 L58 41 Z" fill="#9c85c8" stroke="#e4ceff" />
                <path d="M73 47 H50 L58 41 Z" fill="#f1d3eb" />
                <path d="M34 31 L47 37 L50 47 L40 44 Z" fill="#e8c5db" stroke="#fce7fb" />
                <path d="M34 31 L50 47 L47 37 Z" fill="#a890d4" />
                <path d="M66 31 L60 44 L50 47 L53 37 Z" fill="#cfacd9" stroke="#f4daff" />
                <path d="M66 31 L50 47 L60 44 Z" fill="#897bc5" />
                <path d="M34 63 L40 50 L50 47 L47 57 Z" fill="#b7a5ec" stroke="#f4daff" />
                <path d="M34 63 L50 47 L40 50 Z" fill="#8067b1" />
                <path d="M66 63 L53 57 L50 47 L60 50 Z" fill="#b99bd2" stroke="#e3c6ff" />
                <path d="M66 63 L50 47 L53 57 Z" fill="#f1cae4" />
            </g>

            {/* Central Crystal Gem */}
            <path d="M50 36 L61 47 L50 58 L39 47 Z" fill="url(#astral-crystal)" stroke="#f6e4ff" strokeWidth={0.55} />
            <path d="M50 36 V47 L39 47 Z" fill="#fff0ff" opacity={0.8} />
            <path d="M61 47 H50 V58 Z" fill="#7867b8" opacity={0.6} />
            <path d="M50 36 V58 M39 47 H61" stroke="#fcecff" strokeWidth={0.45} opacity={0.85} fill="none" />

            {/* Prismatic Core Starlight */}
            <motion.path
                d="M50 39 L51.8 45.2 L58 47 L51.8 48.8 L50 55 L48.2 48.8 L42 47 L48.2 45.2 Z"
                fill="#fff1fb"
                filter="url(#astral-bloom-glow)"
                animate={{ opacity: [0.65, 1, 0.65], scale: [0.9, 1.15, 0.9] }}
                transition={{ duration: 3.8, repeat: Infinity, ease: 'easeInOut' }}
                style={{ transformOrigin: '50px 47px' }}
            />

            {/* Rotating Star Constellation Orbit */}
            <motion.g
                style={{ transformOrigin: '50px 47px' }}
                animate={{ rotate: 360 }}
                transition={{ duration: 42, repeat: Infinity, ease: 'linear' }}
            >
                <path d="M32 37 V41 M30 39 H34 M68 54 V58 M66 56 H70" stroke="#f3d4ff" strokeWidth={0.6} />
                <circle cx="38" cy="65" r={0.7} fill="#e5c1ff" />
                <circle cx="65" cy="30" r={0.85} fill="#fff0e7" />
            </motion.g>
        </g>
    ),

    // Sakura Rift — Liquid crystal cherry blossom with aurora petal refraction
    sakura_rift: () => (
        <g>
            {/* SVG defs for sakura-specific effects */}
            <defs>
                <radialGradient id="sakura-core-glow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#fff0f5" stopOpacity={0.95} />
                    <stop offset="60%" stopColor="#f9a8d4" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="#be185d" stopOpacity={0} />
                </radialGradient>
                <filter id="sakura-bloom-glow" x="-40%" y="-40%" width="180%" height="180%">
                    <feGaussianBlur stdDeviation="2.5" result="glow" />
                    <feMerge>
                        <feMergeNode in="glow" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
                <linearGradient id="sakura-petal-aurora" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#fce7f3" />
                    <stop offset="40%" stopColor="#f9a8d4" />
                    <stop offset="75%" stopColor="#c084fc" />
                    <stop offset="100%" stopColor="#818cf8" />
                </linearGradient>
            </defs>

            {/* Ghost petal traces — faint background geometry */}
            <g opacity={0.2}>
                <path d="M50 24 C44 30 42 38 46 44 L50 47 L54 44 C58 38 56 30 50 24 Z" strokeWidth={1.5} fill="none" />
                <path d="M68 37 C62 35 56 37 53 43 L50 47 L54 49 C60 48 66 43 68 37 Z" strokeWidth={1.5} fill="none" />
                <path d="M63 62 C58 58 52 57 50 51 L50 47 L53 45 C57 50 60 56 63 62 Z" strokeWidth={1.5} fill="none" />
                <path d="M37 62 C42 58 48 57 50 51 L50 47 L47 45 C43 50 40 56 37 62 Z" strokeWidth={1.5} fill="none" />
                <path d="M32 37 C38 35 44 37 47 43 L50 47 L46 49 C40 48 34 43 32 37 Z" strokeWidth={1.5} fill="none" />
            </g>

            {/* 5 animated cherry blossom petals — breathing scale */}
            <motion.g
                style={{ transformOrigin: '50px 47px' }}
                animate={{ scale: [0.95, 1.05, 0.95] }}
                transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
            >
                {/* Top petal */}
                <path d="M50 24 C44 30 42 38 46 44 L50 47 L54 44 C58 38 56 30 50 24 Z"
                    fill="url(#sakura-petal-aurora)" stroke="#fce7f3" strokeWidth={0.7} opacity={0.85} />
                <path d="M50 24 L50 47 L46 44 C42 38 44 30 50 24 Z" fill="#fff0f5" opacity={0.45} />

                {/* Right petal */}
                <path d="M68 37 C62 35 56 37 53 43 L50 47 L54 49 C60 48 66 43 68 37 Z"
                    fill="url(#sakura-petal-aurora)" stroke="#fce7f3" strokeWidth={0.7} opacity={0.8} />
                <path d="M68 37 L50 47 L53 43 C56 37 62 35 68 37 Z" fill="#fdf2f8" opacity={0.4} />

                {/* Bottom-right petal */}
                <path d="M63 62 C58 58 52 57 50 51 L50 47 L53 45 C57 50 60 56 63 62 Z"
                    fill="url(#sakura-petal-aurora)" stroke="#fce7f3" strokeWidth={0.7} opacity={0.75} />

                {/* Bottom-left petal */}
                <path d="M37 62 C42 58 48 57 50 51 L50 47 L47 45 C43 50 40 56 37 62 Z"
                    fill="url(#sakura-petal-aurora)" stroke="#fce7f3" strokeWidth={0.7} opacity={0.75} />

                {/* Left petal */}
                <path d="M32 37 C38 35 44 37 47 43 L50 47 L46 49 C40 48 34 43 32 37 Z"
                    fill="url(#sakura-petal-aurora)" stroke="#fce7f3" strokeWidth={0.7} opacity={0.8} />
                <path d="M32 37 L50 47 L47 43 C44 37 38 35 32 37 Z" fill="#fdf2f8" opacity={0.4} />
            </motion.g>

            {/* Central stamen cluster */}
            <circle cx="50" cy="47" r="5" fill="url(#sakura-core-glow)" />
            <motion.circle
                cx="50" cy="47" r="3.5"
                fill="#fff5f7"
                filter="url(#sakura-bloom-glow)"
                animate={{ scale: [0.85, 1.2, 0.85], opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
                style={{ transformOrigin: '50px 47px' }}
            />

            {/* Stamen dots */}
            <circle cx="50" cy="40" r="1.2" fill="#f9a8d4" opacity={0.9} />
            <circle cx="55" cy="43" r="1" fill="#f472b6" opacity={0.7} />
            <circle cx="55" cy="51" r="1.1" fill="#f9a8d4" opacity={0.8} />
            <circle cx="45" cy="43" r="1" fill="#f472b6" opacity={0.7} />
            <circle cx="45" cy="51" r="1.1" fill="#f9a8d4" opacity={0.8} />

            {/* Drifting petal particles — slow orbit */}
            <motion.g
                style={{ transformOrigin: '50px 47px' }}
                animate={{ rotate: 360 }}
                transition={{ duration: 50, repeat: Infinity, ease: 'linear' }}
            >
                <ellipse cx="30" cy="30" rx="2" ry="1.2" fill="#fbcfe8" opacity={0.65} transform="rotate(-30 30 30)" />
                <ellipse cx="72" cy="58" rx="1.8" ry="1" fill="#f9a8d4" opacity={0.5} transform="rotate(40 72 58)" />
                <circle cx="68" cy="32" r={0.7} fill="#fce7f3" opacity={0.6} />
            </motion.g>

            {/* Falling petal particle — drifts down and fades */}
            <motion.ellipse
                cx="42" cy="28"
                rx="2.2" ry="1.3"
                fill="#fbcfe8"
                transform="rotate(-20 42 28)"
                animate={{
                    y: [0, 38],
                    x: [0, 6],
                    rotate: [-20, 45],
                    opacity: [0, 0.8, 0.8, 0],
                }}
                transition={{
                    duration: 5.5,
                    repeat: Infinity,
                    ease: 'easeInOut',
                }}
            />
        </g>
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
    const isCustomArtisan = id === 'custom_artisan';
    const [customArtisanConfig, setCustomArtisanConfig] = useState<ArtisanConfig | null>(() => {
        if (!isCustomArtisan) return null;
        return loadArtisanConfig();
    });

    useEffect(() => {
        if (!isCustomArtisan) return;
        const handleUpdate = (e: Event) => {
            const ce = e as CustomEvent<ArtisanConfig>;
            if (ce.detail) {
                setCustomArtisanConfig(ce.detail);
            } else {
                setCustomArtisanConfig(loadArtisanConfig());
            }
        };
        window.addEventListener('typenova_artisan_updated', handleUpdate);
        return () => window.removeEventListener('typenova_artisan_updated', handleUpdate);
    }, [isCustomArtisan]);

    if (isCustomArtisan) {
        const cfg = customArtisanConfig || loadArtisanConfig();
        return (
            <ArtisanKeycapSvg
                config={cfg}
                size={size}
                pressed={pressed}
                className={className}
                showUnderglow={size >= 40}
            />
        );
    }
    const index = Math.max(0, AVATARS.findIndex((a) => a.id === id));
    const def = AVATARS[index] || AVATARS[0];
    const accent = def.glowColor || '6, 182, 212';
    const material = materialFor(index, def.id);
    const legend = LEGENDS[def.id] || LEGENDS.default;

    // Below ~40px the fine passes (engraving, RGB bloom, tick marks) stop
    // reading as detail and start reading as dirt, so they're dropped.
    const fine = size >= 40;
    const uid = `kc-${def.id}-${material}`;

    const isDamascus = def.id === 'damascus_relic';
    const isCircuit = def.id === 'ghost_circuit';
    const isAstral = def.id === 'astral_bloom';
    const isGold = def.id === 'gold_esc';
    const isPhoenix = def.id === 'phoenix';
    const isNovaPrime = def.id === 'nova_prime';
    const isTypeNova = def.id === 'typenova';

    const skirtStops =
        isDamascus
            ? ['#777061', '#363735', '#171b19']
            : isCircuit
            ? ['#487f70', '#163e33', '#081f1a']
            : isAstral
            ? ['#b6a6c9', '#665078', '#29233e']
            : material === 'celestial'
            ? (isGold
                ? ['#fcd34d', '#b45309', '#451a03']
                : isPhoenix
                ? ['#fb7185', '#be123c', '#4c0519']
                : isNovaPrime
                ? ['#38bdf8', '#1e40af', '#020617']
                : isTypeNova
                ? ['#00f0ff', '#0284c7', '#02182b']
                : ['#f472b6', '#8b5cf6', '#1e1b4b'])
            : material === 'artisan'
            ? ['#4a5364', '#20252f', '#0d1015']
            : material === 'translucent'
                ? [rgba(accent, 0.38), rgba(accent, 0.15), '#0b0e14']
                : material === 'doubleshot'
                    ? ['#2b3546', '#1a212d', '#0c1017']
                    : ['#252a33', '#171b22', '#0d1014'];

    const faceStops =
        isDamascus
            ? ['#9b9582', '#55564b', '#303830']
            : isCircuit
            ? ['#3e7765', '#184937', '#08291f']
            : isAstral
            ? ['#b7a9c5', '#6a4b85', '#403651']
            : material === 'celestial'
            ? (isGold
                ? ['#fef08a', '#d97706']
                : isPhoenix
                ? ['#fda4af', '#e11d48']
                : isNovaPrime
                ? ['#0a192f', '#020617']
                : isTypeNova
                ? ['#04263f', '#010d18']
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
        isDamascus
            ? '#fcdf9e'
            : isCircuit
            ? '#88edbb'
            : isAstral
            ? '#d5b7f5'
            : material === 'celestial' && isGold
            ? '#451a03'
            : isNovaPrime
            ? '#38bdf8'
            : isTypeNova
            ? '#00f0ff'
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
                        width: size * (isTypeNova ? 0.88 : 0.78),
                        height: size * (isTypeNova ? 0.36 : 0.3),
                        background: rgba(accent, isTypeNova ? 0.8 : material === 'celestial' ? 0.65 : material === 'translucent' ? 0.55 : 0.32),
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
                        {isDamascus ? (
                            <>
                                <stop offset="0%" stopColor="#4d5044" />
                                <stop offset="100%" stopColor="#252d28" />
                            </>
                        ) : isCircuit ? (
                            <>
                                <stop offset="0%" stopColor="#173e2c" />
                                <stop offset="100%" stopColor="#051e17" />
                            </>
                        ) : isAstral ? (
                            <>
                                <stop offset="0%" stopColor="#493257" />
                                <stop offset="100%" stopColor="#24253e" />
                            </>
                        ) : (
                            <>
                                <stop offset="0%" stopColor="rgba(0,0,0,0.02)" />
                                <stop offset="65%" stopColor="rgba(0,0,0,0.18)" />
                                <stop offset="100%" stopColor="rgba(0,0,0,0.42)" />
                            </>
                        )}
                    </radialGradient>

                    {isTypeNova && (
                        <>
                            {/* Deep liquid reservoir backlighting inside concave dish */}
                            <radialGradient id={`${uid}-reservoir`} cx="50%" cy="47%" r="48%">
                                <stop offset="0%" stopColor="rgba(0, 240, 255, 0.65)" />
                                <stop offset="40%" stopColor="rgba(6, 182, 212, 0.35)" />
                                <stop offset="75%" stopColor="rgba(2, 24, 43, 0.12)" />
                                <stop offset="100%" stopColor="rgba(0, 0, 0, 0)" />
                            </radialGradient>

                            {/* SVG Physical Fluid Turbulence & Displacement Map */}
                            <filter id="typenova-fluid-warp" x="-15%" y="-15%" width="130%" height="130%">
                                <feTurbulence type="fractalNoise" baseFrequency="0.04 0.03" numOctaves={3} result="noise">
                                    <animate
                                        attributeName="baseFrequency"
                                        values="0.038 0.03; 0.045 0.046; 0.038 0.03"
                                        dur="5.5s"
                                        repeatCount="indefinite"
                                    />
                                </feTurbulence>
                                <feDisplacementMap in="SourceGraphic" in2="noise" scale={2.5} xChannelSelector="R" yChannelSelector="G" />
                            </filter>

                            {/* Conduit glow filter for internal neon fluid surges */}
                            <filter id="typenova-conduit-glow" x="-30%" y="-30%" width="160%" height="160%">
                                <feGaussianBlur stdDeviation="1.8" result="blur" />
                                <feMerge>
                                    <feMergeNode in="blur" />
                                    <feMergeNode in="SourceGraphic" />
                                </feMerge>
                            </filter>

                            {/* Specular caustic light sweep gradient */}
                            <linearGradient id="typenova-caustic-sweep" x1="0" y1="0" x2="1" y2="0">
                                <stop offset="0%" stopColor="rgba(255, 255, 255, 0)" />
                                <stop offset="25%" stopColor="rgba(0, 240, 255, 0.25)" />
                                <stop offset="50%" stopColor="rgba(255, 255, 255, 0.85)" />
                                <stop offset="75%" stopColor="rgba(0, 240, 255, 0.25)" />
                                <stop offset="100%" stopColor="rgba(255, 255, 255, 0)" />
                            </linearGradient>

                            {/* Smooth radial feather mask to eliminate square borders */}
                            <mask id="typenova-smooth-mask">
                                <radialGradient id="typenova-mask-grad" cx="50%" cy="47%" r="48%">
                                    <stop offset="0%" stopColor="#ffffff" />
                                    <stop offset="72%" stopColor="#ffffff" />
                                    <stop offset="90%" stopColor="#888888" />
                                    <stop offset="100%" stopColor="#000000" />
                                </radialGradient>
                                <rect x="0" y="0" width="100" height="100" fill="url(#typenova-mask-grad)" />
                            </mask>

                            {/* Dish clip path for sweeping caustics */}
                            <clipPath id="typenova-dish-clip">
                                <path d={DISH} />
                            </clipPath>
                        </>
                    )}

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
                {isTypeNova ? (
                    <>
                        <path d={DISH} fill="#010d19" />
                        <path d={DISH} fill={`url(#${uid}-reservoir)`} />
                        <path
                            d={DISH}
                            fill="none"
                            stroke="#00f0ff"
                            strokeWidth={1.4}
                            opacity={0.6}
                        />
                    </>
                ) : (
                    <>
                        <path d={DISH} fill={`url(#${uid}-dish)`} />
                        <path
                            d={DISH}
                            fill="none"
                            stroke="rgba(255,255,255,0.08)"
                            strokeWidth={0.8}
                        />
                    </>
                )}
                <path d={SHEEN} fill={`url(#${uid}-sheen)`} />
                <path d={FACE} fill="none" stroke={rgba(accent, material === 'celestial' ? 0.85 : material === 'artisan' ? 0.75 : 0.4)} strokeWidth={1.3} />

                {/* Artisan caps get engraved corner ticks — a machined touch. */}
                {fine && material === 'artisan' && !isDamascus && (
                    <g clipPath={`url(#${uid}-faceclip)`} stroke="rgba(0,0,0,0.35)" strokeWidth={1.2}>
                        <path d="M22 24 L30 24 M22 24 L22 31" />
                        <path d="M78 24 L70 24 M78 24 L78 31" />
                    </g>
                )}

                {/* Celestial starburst shimmer */}
                {fine && material === 'celestial' && (
                    <motion.path
                        d="M72 22 L74 25.5 L78 27 L74 28.5 L72 32 L70 28.5 L66 27 L70 25.5 Z"
                        fill="#ffffff"
                        className="drop-shadow-[0_0_6px_rgba(255,255,255,0.9)]"
                        animate={{ opacity: [0.65, 1, 0.65], scale: [0.9, 1.15, 0.9] }}
                        transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                        style={{ transformOrigin: '72px 27px' }}
                    />
                )}

                {/* Secondary bottom-left celestial sparkle for TypeNova flagship */}
                {fine && isTypeNova && (
                    <motion.path
                        d="M28 64 L29.2 66 L31.2 67.2 L29.2 68.4 L28 70.4 L26.8 68.4 L24.8 67.2 L26.8 66 Z"
                        fill="#00f0ff"
                        className="drop-shadow-[0_0_5px_rgba(0,240,255,0.9)]"
                        animate={{ opacity: [0.35, 1, 0.35], scale: [0.85, 1.25, 0.85] }}
                        transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut', delay: 1.1 }}
                        style={{ transformOrigin: '28px 67.2px' }}
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
                        fine && !isTypeNova && !isDamascus && !isCircuit && !isAstral
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
