// ═══════════════════════════════════════════════════════════════════════
//  ACADEMY MOTION VOCABULARY
//  ---------------------------------------------------------------------
//  Every animation in the Academy pulls its physics from this file. Before
//  it existed the two Academy screens between them used 7 different spring
//  stiffnesses and 5 different durations picked ad hoc, which is what made
//  the motion read as assembled rather than designed. Three springs cover
//  every case: snappy for input feedback, fluid for entrances, heavy for
//  hero elements.
// ═══════════════════════════════════════════════════════════════════════

import type { MotionProps, Transition, Variants } from 'framer-motion';

/** Cinematic ease-out. Mirrors the cubic-bezier baked into index.css. */
export const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];
/** Overshoot, reserved for reward moments — stars, badges, level-ups. */
export const EASE_OVERSHOOT: [number, number, number, number] = [0.34, 1.56, 0.64, 1];

export const DUR = { fast: 0.16, base: 0.3, slow: 0.52 } as const;

/** Input feedback: key presses, chips, hover lifts. Settles almost instantly. */
export const springSnappy: Transition = { type: 'spring', stiffness: 420, damping: 32, mass: 0.6 };
/** Entrances and layout moves. The Academy's default. */
export const springFluid: Transition = { type: 'spring', stiffness: 260, damping: 26, mass: 0.85 };
/** Hero elements — shared-element launches, the results card. Deliberately weighty. */
export const springHeavy: Transition = { type: 'spring', stiffness: 150, damping: 22, mass: 1.15 };
/** For MotionValues driving numbers and meters, where overshoot would look broken. */
export const springValue = { stiffness: 90, damping: 20, mass: 0.9 } as const;

export const fadeUp: Variants = {
    hidden: { opacity: 0, y: 18 },
    show: { opacity: 1, y: 0, transition: springFluid },
    exit: { opacity: 0, y: -12, transition: { duration: DUR.fast, ease: EASE_OUT } },
};

export const fadeDown: Variants = {
    hidden: { opacity: 0, y: -16 },
    show: { opacity: 1, y: 0, transition: springFluid },
    exit: { opacity: 0, y: -10, transition: { duration: DUR.fast, ease: EASE_OUT } },
};

export const scaleIn: Variants = {
    hidden: { opacity: 0, scale: 0.94 },
    show: { opacity: 1, scale: 1, transition: springFluid },
    exit: { opacity: 0, scale: 0.96, transition: { duration: DUR.fast, ease: EASE_OUT } },
};

/** The practice stage arriving. Blur is confined to this one container. */
export const stageIn: Variants = {
    hidden: { opacity: 0, y: 22, filter: 'blur(5px)' },
    show: {
        opacity: 1,
        y: 0,
        filter: 'blur(0px)',
        transition: { ...springFluid, filter: { duration: DUR.base, ease: EASE_OUT } },
    },
    exit: { opacity: 0, y: -16, filter: 'blur(5px)', transition: { duration: DUR.base, ease: EASE_OUT } },
};

/**
 * A lane arriving after a filter switch or idle spool-up. Rises and settles —
 * transform/opacity only, so it never costs a layout pass mid-scroll.
 */
export const laneIn: Variants = {
    hidden: { opacity: 0, y: 26, scale: 0.99 },
    show: { opacity: 1, y: 0, scale: 1, transition: springFluid },
    exit: { opacity: 0, y: -14, transition: { duration: DUR.fast, ease: EASE_OUT } },
};

/**
 * Rare celebration flare — combo milestones, a WPM target crossed. Because it
 * only fires on events worth noticing, it can afford to overshoot and to paint
 * a little more than the per-keystroke feedback does.
 */
export const milestonePop: Variants = {
    hidden: { opacity: 0, scale: 0.5 },
    show: {
        opacity: [0, 1, 0],
        scale: [0.5, 1.3, 1.75],
        transition: { duration: 0.7, ease: EASE_OUT },
    },
};

/**
 * A one-shot ring clearing outward — a step dot registering its completion.
 * Mounts, expands, unmounts; nothing lingers to composite.
 */
export const ringPop: Variants = {
    hidden: { opacity: 0.85, scale: 0.6 },
    show: { opacity: 0, scale: 2.4, transition: { duration: 0.42, ease: EASE_OUT } },
};

/** Reward pop with overshoot — stars, trophies, level badges. */
export const popIn: Variants = {
    hidden: { opacity: 0, scale: 0.4, rotate: -35 },
    show: { opacity: 1, scale: 1, rotate: 0, transition: { duration: 0.5, ease: EASE_OVERSHOOT } },
    exit: { opacity: 0, scale: 0.6, transition: { duration: DUR.fast, ease: EASE_OUT } },
};

/** Toast stack members. Enter from below, leave sideways so the stack reflows cleanly. */
export const toastIn: Variants = {
    hidden: { opacity: 0, y: 22, scale: 0.96 },
    show: { opacity: 1, y: 0, scale: 1, transition: springFluid },
    exit: { opacity: 0, x: 28, scale: 0.96, transition: { duration: 0.2, ease: EASE_OUT } },
};

/** Orchestrator for staggered children — lanes, cards, stat rows, star trios. */
export const listParent = (stagger = 0.05, delayChildren = 0.03): Variants => ({
    hidden: {},
    show: { transition: { staggerChildren: stagger, delayChildren } },
    exit: { transition: { staggerChildren: 0.02, staggerDirection: -1 } },
});

export const listChild: Variants = {
    hidden: { opacity: 0, y: 16, scale: 0.985 },
    show: { opacity: 1, y: 0, scale: 1, transition: springFluid },
    exit: { opacity: 0, y: 10, transition: { duration: DUR.fast, ease: EASE_OUT } },
};

/**
 * Spread onto a motion component to run a variant set on mount.
 * Returns nothing when the user prefers reduced motion, so the element simply
 * renders in its final state — no conditional-hook gymnastics at each call site.
 */
export function enter(reduce: boolean, variants: Variants, custom?: number): MotionProps {
    if (reduce) return {};
    return { variants, initial: 'hidden', animate: 'show', exit: 'exit', custom };
}

/** Same contract as `enter`, but triggered by scroll position. */
export function enterInView(reduce: boolean, variants: Variants, amount = 0.12): MotionProps {
    if (reduce) return {};
    return {
        variants,
        initial: 'hidden',
        whileInView: 'show',
        exit: 'exit',
        viewport: { once: true, amount },
    };
}
