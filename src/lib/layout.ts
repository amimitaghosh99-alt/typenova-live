/**
 * Layout tokens — the single source of truth for stacking order, content
 * width, and stage identity.
 *
 * Why this file exists: before it, the app carried 20 distinct ad-hoc
 * z-index values (`z-10` … `z-[3000]`), four different hardcoded guesses at
 * the navbar's height, and five unexplained content widths. Several of those
 * z-index values could never work, because an ancestor had already opened a
 * stacking context — a child at `z-[3000]` inside a parent at `z-10` still
 * loses to a sibling of that parent at `z-20`.
 *
 * The numeric layer values are mirrored as `--z-*` custom properties in
 * `src/index.css`. That duplication is deliberate: Tailwind classes read the
 * CSS variables (`z-[var(--z-nav)]`), while framer-motion `style` props,
 * Radix `style` overrides and sonner's `<Toaster>` need real numbers. Nothing
 * currently asserts the two stay in sync — the project has no test runner —
 * so adding a layer means editing both files in the same commit by hand.
 */


// ─── Stacking layers ────────────────────────────────────────────────
/**
 * Every layer the app is allowed to occupy, lowest first.
 *
 * Adding a layer means adding the matching `--z-*` property in
 * `src/index.css` in the same commit.
 */

export const Z = {
    /** Shader, wallpaper, grid overlay. Everything decorative and behind. */
    canvas: 0,
    /** Stage pages (practice / compete / academy). */
    content: 10,
    /** In-stage popovers, dropdowns, sticky headers, card-scoped overlays. */
    contentPop: 20,
    /** CosmicNavBar. */
    nav: 100,
    /** BottomControlsDock, changelog badge, academy toast stack. */
    dock: 200,
    /** Progress bar, timed-mode HUD pill, reconnect banner. */
    hud: 300,
    /** Fullscreen race countdown — must cover the nav. */
    countdown: 400,
    /** Dialog overlay + content. Radix stacks its own parts internally. */
    modal: 500,
    /**
     * A dialog opened from a dialog. The only case was a player profile opened
     * from the social modal, and the profile is a page now — so the sole
     * remaining consumer is the loadout forge, which opens from that page.
     */
    modalNested: 600,
    /** Command palette. Above modals so ⌘K always surfaces. */
    palette: 700,
    /** Aru (AI assistant) panel. */
    aru: 800,
    /** Sonner toasts. Above everything interactive except screen wipes. */
    toast: 900,
    /** CyberTileTransition / QuantumWipeTransition full-screen wipes. */
    transition: 1000,
} as const;

export type ZLayer = keyof typeof Z;

/** `contentPop` → `content-pop`, so a key maps 1:1 to its CSS property. */
const kebab = (key: string): string => key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

/** The CSS custom-property name for a layer, e.g. `--z-modal-nested`. */
export const zVar = (layer: ZLayer): string => `--z-${kebab(layer)}`;

/**
 * Tailwind class for a layer, e.g. `zClass('nav')` → `z-[var(--z-nav)]`.
 * Prefer this over a raw arbitrary value; `eslint.config.js` rejects
 * `z-[<number>]` in `src/**` so the scale cannot be bypassed by accident.
 */
export const zClass = (layer: ZLayer): string => `z-[var(${zVar(layer)})]`;

/** Numeric value, for inline `style` props that cannot use a class. */
export const zIndex = (layer: ZLayer): number => Z[layer];

// ─── Content widths ─────────────────────────────────────────────────
/**
 * The only three content widths in the app.
 *
 * Replaces: 1100px (compete entry), 1600px (practice stage, compete stage,
 * and again redundantly inside LobbyScreen), 1720px (academy),
 * `max-w-6xl`/1152px (both results screens) and `max-w-4xl` (zen mode).
 */
export const CONTAINER = {
    /** Forms, entry cards, results — anything read top-to-bottom. */
    narrow: '1100px',
    /** Practice arena and compete lobby — side-by-side cockpit layouts. */
    wide: '1600px',
    /** Academy skill tree, which genuinely needs the extra horizontal room. */
    ultra: '1720px',
} as const;

export type ContainerWidth = keyof typeof CONTAINER;

/** The CSS custom-property name for a width, e.g. `--w-wide`. */
export const wVar = (width: ContainerWidth): string => `--w-${width}`;

/** Centered, width-capped container classes for a stage or panel. */
export const containerClass = (width: ContainerWidth): string =>
    `w-full mx-auto max-w-[var(${wVar(width)})]`;

// ─── Chrome measurement ─────────────────────────────────────────────
/**
 * Custom properties published at runtime by `useAppChrome`, which measures
 * the real elements with a ResizeObserver. The values declared in
 * `src/index.css` are first-paint fallbacks only.
 *
 * Never hardcode a pixel offset for the nav again: the navbar's tallest
 * child (`w-10 h-10` identity capsule) is `hidden lg:flex`, so the header is
 * genuinely shorter below the `lg` breakpoint and any single number is wrong
 * at some viewport.
 */
export const CHROME_VARS = {
    nav: '--nav-h',
    dock: '--dock-h',
} as const;

/** Top padding that clears the navbar, plus `extra` breathing room. */
export const belowNav = (extra = '1.5rem'): string =>
    `pt-[calc(var(${CHROME_VARS.nav})+${extra})]`;

/** Absolute/fixed `top` that starts exactly at the navbar's lower edge. */
export const navOffsetTop = (extra = '0px'): string =>
    `top-[calc(var(${CHROME_VARS.nav})+${extra})]`;

/** Bottom offset that clears the controls dock. */
export const aboveDock = (extra = '1rem'): string =>
    `bottom-[calc(var(${CHROME_VARS.dock})+${extra})]`;

// ─── Stage & modal identity ─────────────────────────────────────────
/** The three top-level destinations. Previously inline in `App.tsx`. */
export type Stage = 'practice' | 'compete' | 'academy';

export const STAGES: readonly Stage[] = ['practice', 'compete', 'academy'] as const;

export const isStage = (value: unknown): value is Stage =>
    typeof value === 'string' && (STAGES as readonly string[]).includes(value);

/** Which container width each stage uses. */
export const STAGE_WIDTH: Record<Stage, ContainerWidth> = {
    practice: 'wide',
    compete: 'wide',
    academy: 'ultra',
};

/**
 * Every dialog the app can open, and the only place this union is declared.
 *
 * `App.tsx` used to carry its own copy inside `MainApp()` while every consumer
 * typed the prop as `string | null`, so the two drifted without a compile
 * error: the copy in `App.tsx` dropped `'race'`, and the now-unreachable
 * `case 'race'` sat in `AppModalManager`'s switch for as long as it took to
 * notice by hand. Import this instead of re-declaring it, and keep the
 * switch in `AppModalManager` exhaustive so drift becomes a build failure.
 *
 * `'theme'` and `'sound'` used to be listed here and were never reachable —
 * the theme and sound pickers live inside the settings modal, not in this
 * layer.
 *
 * `'profile'` is gone too: the player dossier is a route (`/operator/:username`)
 * rather than a dialog, so it has a shareable URL and real history. Nothing in
 * this layer needs to know about it.
 */
export type ModalKey =
    | 'trophy'
    | 'godMode'
    | 'expandedGraph'
    | 'stats'
    | 'replay'
    | 'social'
    | 'comms'
    | 'quests'
    | 'settings'
    | 'changelog'
    | 'bugReports'
    | 'ghost';

/** `null` means "no dialog open". Use this for props and state. */
export type ModalState = ModalKey | null;


