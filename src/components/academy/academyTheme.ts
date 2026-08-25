// ═══════════════════════════════════════════════════════════════════════
//  ACADEMY VISUAL TOKENS
//  ---------------------------------------------------------------------
//  Three surface elevations, four semantic tones, one typographic label
//  style. Track colours still come from CATEGORY_LABELS because they carry
//  meaning (they identify a track); everything else that used to invent its
//  own hex accent now draws from here or from the active theme's glow.
// ═══════════════════════════════════════════════════════════════════════

import {
    Activity, Anchor, ArrowBigUp, ArrowUpRight, BookOpen, Braces, Code2, Crosshair,
    Hash, Waves,
    type LucideIcon,
} from 'lucide-react';
import type { LessonCategory } from '@/data/academyCurriculum';

/**
 * Shared id namespace for the lesson-card → practice-stage shared element.
 * Lives here rather than in either screen so neither has to import the other
 * just to agree on the key.
 */
export const nodeLayoutId = (lessonId: string): string => `academy-node-${lessonId}`;

/** Fallback when no theme is supplied — matches the app's default cyan. */
export const DEFAULT_GLOW = '0, 240, 255';

/**
 * The Academy's neutrals are theme-relative, not grey.
 *
 * `--academy-tint` is set once on the Academy root from the active theme's
 * glow triplet, and every surface and hairline below mixes a few percent of it
 * into an otherwise near-black palette. That way picking a theme — or having
 * one auto-derived from a wallpaper — recolours the entire screen instead of
 * leaving grey panels sitting behind a coloured accent. The fallback keeps
 * these usable if a component ever renders outside the Academy root.
 */
export const TINT = 'var(--academy-tint, 255, 255, 255)';

/** Theme tint at a given alpha. The Academy's only source of neutral colour. */
export const tint = (alpha: number): string => `rgba(${TINT}, ${alpha})`;

/**
 * Elevation, not decoration. Anything that needs to feel like a container
 * picks one of these three; nothing invents its own background.
 *
 * Each is a flat tint layer over an opaque base, so it stays a single value
 * assignable to `background` — the tint can't be expressed as one colour
 * without `color-mix`, which isn't safe to rely on yet.
 */
export const SURFACE = {
    sunken: `linear-gradient(${tint(0.05)}, ${tint(0.05)}), rgba(6, 8, 14, 0.9)`,
    base: `linear-gradient(${tint(0.06)}, ${tint(0.06)}), rgba(10, 13, 22, 0.9)`,
    raised: `linear-gradient(${tint(0.085)}, ${tint(0.085)}), rgba(14, 18, 30, 0.96)`,
} as const;

export const LINE = tint(0.16);
export const LINE_STRONG = tint(0.32);

/** Semantic tones. Four, down from the dozen-odd hexes scattered inline before. */
export const TONE = {
    star: '#fbbf24',
    boss: '#f59e0b',
    ok: '#34d399',
    err: '#f87171',
} as const;

/**
 * Shared container recipe — pair with `panelStyle()` for the colours.
 * Deliberately blur-free: the wallpaper behind the Academy is already blurred
 * by the app shell, and a dozen live backdrop filters re-blur on every scroll
 * frame, which is what made the page feel heavy. The raised opacities above
 * carry the elevation instead.
 */
export const PANEL = 'rounded-2xl border';

export function panelStyle(
    elevation: keyof typeof SURFACE = 'base',
    strongBorder = false,
): { background: string; borderColor: string } {
    return { background: SURFACE[elevation], borderColor: strongBorder ? LINE_STRONG : LINE };
}

/**
 * The only place wide letter-spacing and uppercase are allowed. Titles and
 * body copy use the sans stack at normal case — the old screen applied
 * `font-mono uppercase font-black tracking-[0.2em]` to everything including
 * headings and prose, which is the single loudest "generated UI" tell.
 */
// zinc-400, not zinc-500: at 10px with 0.14em tracking, zinc-500 on the panel
// surfaces sat just under a comfortable reading contrast.
export const LABEL = 'font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400';

/** `rgba()` from a theme's "r, g, b" triplet. */
export const glow = (rgb: string, alpha: number): string => `rgba(${rgb}, ${alpha})`;

/**
 * Lucide replacements for the emoji that used to sit beside real icons.
 * Kept here rather than in the curriculum data so `CategoryMeta` stays a
 * plain serialisable record.
 */
export const CATEGORY_ICONS: Record<LessonCategory, LucideIcon> = {
    foundations: Anchor,
    reaches: ArrowUpRight,
    fluency: Waves,
    capitals: ArrowBigUp,
    numbers: Hash,
    symbols: Braces,
    code: Code2,
    precision: Crosshair,
    cadence: Activity,
    mastery: BookOpen,
};



