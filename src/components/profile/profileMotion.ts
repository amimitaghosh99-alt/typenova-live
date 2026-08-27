// ═══════════════════════════════════════════════════════════════════════
//  PROFILE MOTION VOCABULARY
//  ---------------------------------------------------------------------
//  The dossier (`pages/OperatorDossier`) and the forge (ProfileCustomizationMenu)
//  are one continuous experience — the forge opens *on top of* the dossier page —
//  so both pull their physics from this file. Three springs cover every case:
//  `snappy` for input feedback, `fluid` for entrances and layout moves,
//  `heavy` for the hero shells. Nothing in either screen picks a stiffness
//  by hand, which is what keeps the two panels feeling like one machine.
// ═══════════════════════════════════════════════════════════════════════

import type { MotionProps, Transition, Variants } from 'framer-motion';

/** Cinematic ease-out — mirrors the cubic-bezier baked into index.css. */
export const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];
/** Overshoot. Reserved for reward moments: equipping, unlocking, level chips. */
export const EASE_OVERSHOOT: [number, number, number, number] = [0.34, 1.56, 0.64, 1];

export const DUR = { flash: 0.14, fast: 0.2, base: 0.32, slow: 0.55 } as const;

/** Input feedback — taps, chips, hover lifts. Settles almost instantly. */
export const springSnappy: Transition = { type: 'spring', stiffness: 480, damping: 34, mass: 0.6 };
/** The default. Entrances, panel swaps, reflows. */
export const springFluid: Transition = { type: 'spring', stiffness: 300, damping: 28, mass: 0.85 };
/** Hero shells — the modal itself. Deliberately weighty so it lands. */
export const springHeavy: Transition = { type: 'spring', stiffness: 170, damping: 24, mass: 1.1 };
/** The `layoutId` glider under the tab bar. Fast, zero overshoot, no wobble. */
export const springGlider: Transition = { type: 'spring', stiffness: 520, damping: 42, mass: 0.7 };

export const backdropFade: Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { duration: DUR.base, ease: EASE_OUT } },
    exit: { opacity: 0, transition: { duration: DUR.fast, ease: EASE_OUT } },
};

/**
 * The shell booting up: rises and scales into place.
 *
 * Deliberately transform + opacity only. This used to tween `filter: blur()`
 * from 12px to 0, which forces the compositor to re-rasterise the entire
 * subtree — a page header or a full modal shell — on every frame of the
 * entrance. Both surfaces this drives are large, so it was a visible hitch on
 * mount for an effect nobody could name afterwards.
 */
export const shellIn: Variants = {
    hidden: { opacity: 0, y: 24, scale: 0.975 },
    show: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: springHeavy,
    },
    exit: {
        opacity: 0,
        y: 14,
        scale: 0.98,
        transition: { duration: DUR.fast, ease: EASE_OUT },
    },
};

/** Identity rail — arrives from the left, just behind the shell. */
export const railIn: Variants = {
    hidden: { opacity: 0, x: -26 },
    show: { opacity: 1, x: 0, transition: { ...springFluid, delay: 0.07 } },
};

/** Tab deck — arrives from the right, a beat after the rail. */
export const deckIn: Variants = {
    hidden: { opacity: 0, x: 26 },
    show: { opacity: 1, x: 0, transition: { ...springFluid, delay: 0.12 } },
};

/** Orchestrator for staggered children — stat tiles, badge grids, chips. */
export const listParent = (stagger = 0.045, delayChildren = 0.05): Variants => ({
    hidden: {},
    show: { transition: { staggerChildren: stagger, delayChildren } },
    exit: { transition: { staggerChildren: 0.015, staggerDirection: -1 } },
});

export const listChild: Variants = {
    hidden: { opacity: 0, y: 14, scale: 0.98 },
    show: { opacity: 1, y: 0, scale: 1, transition: springFluid },
    exit: { opacity: 0, y: 8, scale: 0.99, transition: { duration: DUR.fast, ease: EASE_OUT } },
};

/**
 * Tab panels travel in the direction you tabbed. `custom` carries the sign of
 * the index delta, so going forward slides the new panel in from the right and
 * pushes the old one left — the thing that makes tab switching read as a
 * physical carousel rather than a crossfade.
 */
export const tabPanel: Variants = {
    hidden: (dir: number) => ({ opacity: 0, x: dir >= 0 ? 46 : -46 }),
    show: {
        opacity: 1,
        x: 0,
        transition: { ...springFluid, opacity: { duration: DUR.fast } },
    },
    exit: (dir: number) => ({
        opacity: 0,
        x: dir >= 0 ? -36 : 36,
        transition: { duration: 0.17, ease: EASE_OUT },
    }),
};

/** A value swapping in place — the active title chip, a live preview label. */
export const chipSwap: Variants = {
    hidden: { opacity: 0, y: 10, scale: 0.82, rotate: -5 },
    show: { opacity: 1, y: 0, scale: 1, rotate: 0, transition: { duration: 0.44, ease: EASE_OVERSHOOT } },
    exit: { opacity: 0, y: -12, scale: 0.85, transition: { duration: DUR.flash, ease: EASE_OUT } },
};

/** In-panel confirmation strip. Drops from the top edge, leaves upward. */
export const bannerToast: Variants = {
    hidden: { opacity: 0, y: -22, scale: 0.94 },
    show: { opacity: 1, y: 0, scale: 1, transition: springSnappy },
    exit: { opacity: 0, y: -16, scale: 0.96, transition: { duration: DUR.fast, ease: EASE_OUT } },
};

/**
 * Spread onto a motion component to run a variant set on mount. Returns an
 * empty object under `prefers-reduced-motion`, so the element renders in its
 * final state without conditional-hook gymnastics at each call site.
 */
export function reveal(reduce: boolean | null, variants: Variants, custom?: number): MotionProps {
    if (reduce) return {};
    return { variants, initial: 'hidden', animate: 'show', exit: 'exit', custom };
}

/** `rgba()` from the `"6, 182, 212"` triplets the cosmetics data ships. */
export const rgba = (rgb: string, alpha: number) => `rgba(${rgb}, ${alpha})`;

/**
 * A short haptic tick on equip. Silently absent on desktop and on iOS Safari —
 * it is garnish on top of the visual confirmation, never the confirmation
 * itself.
 */
export function pulseHaptic(pattern: number | number[] = 8): void {
    if (typeof navigator === 'undefined') return;
    const nav = navigator as Navigator & { vibrate?: (p: number | number[]) => boolean };
    try {
        nav.vibrate?.(pattern);
    } catch {
        /* no-op: haptics are a nice-to-have */
    }
}
