# Implementation Plan

[Overview]
Replace TypeNova's ad-hoc layout guesswork with a measured layout foundation (single nav-height variable, one z-index scale, one container scale, one accessible Dialog primitive), rebuild each stage's positioning on top of that foundation, and add the two highest-value missing features: configurable typing surface preferences and real routed navigation with a ⌘K command palette.

TypeNova v2.6.0 is a large, feature-rich React 19 + Vite + Tailwind 3 typing platform (1818-line `src/App.tsx`, ~45 components, 24 hooks, three stages: practice / compete / academy). The features work; the *chrome around them* was assembled incrementally and every screen now re-guesses the same layout facts independently. Four different hardcoded assumptions about the navbar's height coexist — `top-[76px]` (App.tsx:1514, academy stage), `pt-20 md:pt-24` (App.tsx:1631, practice stage), `pt-20 md:pt-22` (App.tsx:1528, compete stage — `pt-22` is not in Tailwind 3.4's spacing scale and is not added by `tailwind.config.js`, so it silently compiles to nothing and the compete stage loses its `md:` offset entirely), and `top-[84px]` (App.tsx:1490, reconnect banner). The navbar's real height is not constant: `CosmicNavBar` is `py-3` around content whose tallest child (the `w-10 h-10` identity capsule) is `hidden lg:flex`, so the header is ~76px at `lg+` and shorter below it. Every one of those four numbers is wrong at some viewport.

The same pattern repeats for stacking and width. Twenty distinct z-index values are in use across `src/**/*.tsx` — `z-0, z-10, z-20, z-30, z-40, z-50, z-[55], z-[60], z-[100], z-[150], z-[200], z-[250], z-[400], z-[500], z-[600], z-[700], z-[999], z-[1000], z-[1010], z-[3000]` — with no scale and with several values that cannot do what they were written to do: `LobbyScreen`'s race countdown overlay (`absolute inset-0 z-[55]`) lives inside a stage wrapper that has `z-10` plus `transform-gpu`, which creates a stacking context, so the overlay can never rise above the `z-50` navbar it was meant to cover; `PracticeArena`'s ready prompt (`z-[100]`, PracticeArena.tsx:218) and `AccountMenu`'s dropdown (`z-[3000]`) are likewise sealed inside ancestors at `z-10` and `z-[500]`. `ExpandableInfoModal` is a `fixed inset-0 z-[100]` dialog, which puts it *below* the `z-[150]` progress bar and the `z-[200]` reconnect banner. Content width jumps between screens with no rationale: `1100px` (CompeteEntryScreen), `1600px` (practice stage, compete stage, and again redundantly inside LobbyScreen), `1720px` (academy), `max-w-6xl`/1152px (ResultsScreen, RaceResultsScreen), `max-w-4xl` (zen mode).

Underneath all of it, every one of the ~14 modals is a hand-rolled `fixed inset-0 flex items-center justify-center bg-black/80` div with an `onClick={onClose}` backdrop and `onClick={e => e.stopPropagation()}` content. None has a focus trap, an Escape handler, `role="dialog"`, `aria-modal`, restored focus on close, or body scroll lock. This is not for lack of tooling: `@radix-ui/react-dialog` and 29 other Radix packages, `cmdk`, `vaul`, `react-hook-form`, `zod` and `recharts` are all installed, `components.json` (shadcn config) exists, and yet `src/components/ui/` contains only six files (`AnimatedHeight`, `bg-animate-button`, `CyberTileTransition`, `QuantumWipeTransition`, `sonner`, `starfield-background`) — the primitives were never generated. The plan spends its first phase turning those installed-but-unused dependencies into the foundation the rest of the UI stands on, then re-lays every stage on that foundation, then adds `useTypingPrefs` (caret style, font size, stop-on-error) and route-driven stages with a `cmdk` command palette — both of which reuse dependencies that are already in `package.json` and already paid for in bundle size.

Scope note: this plan changes layout, stacking, chrome and navigation. It deliberately does **not** touch the typing engine's measurement/statistics math (`useTypingEngine`, `calculateStats`), the realtime protocol (`useRace`, `useMatchmaking`, `useRoomDirectory`), the Supabase schema, or the shader/wallpaper systems, except where a prop or a className must change.

[Types]
Four new type modules establish layout, modal, preference and command vocabularies that currently exist only as inline string literals scattered across components.

**1. `src/lib/layout.ts` — layout tokens (new file)**

```ts
/** Named stacking layers. The numeric values live in CSS (`--z-*` in
 *  src/index.css); this object exists for the rare inline-style case
 *  (framer-motion `style`, Radix `style`, sonner's Toaster). */
export const Z = {
  canvas:       0,   // CosmicLiquidShader, wallpaper, grid overlay
  content:     10,   // stage pages
  contentPop:  20,   // in-stage popovers, sticky headers, dropdowns
  nav:        100,   // CosmicNavBar
  dock:       200,   // BottomControlsDock, changelog badge
  hud:        300,   // progress bar, TimedHud pill, reconnect banner
  countdown:  400,   // fullscreen race countdown
  modal:      500,   // Dialog overlay + content
  modalNested:600,   // dialog opened from a dialog (profile from social)
  palette:    700,   // CommandPalette
  aru:        800,   // AIChatBot panel
  toast:      900,   // sonner Toaster
  transition:1000,   // CyberTileTransition / QuantumWipeTransition
} as const;

export type ZLayer = keyof typeof Z;

/** Tailwind-ready class strings, e.g. `z-[var(--z-nav)]`. */
export const zClass = (layer: ZLayer) => `z-[var(--z-${kebab(layer)})]`;

/** The only three content widths the app is allowed to use. */
export const CONTAINER = {
  narrow: '1100px',  // forms, entry cards, results
  wide:   '1600px',  // practice arena, compete lobby
  ultra:  '1720px',  // academy skill tree
} as const;

export type ContainerWidth = keyof typeof CONTAINER;

/** Stage identity, previously an inline union in App.tsx:294. */
export type Stage = 'practice' | 'compete' | 'academy';

/** Modal identity, previously the inline `ModalType` at App.tsx:268. */
export type ModalKey =
  | 'trophy' | 'godMode' | 'expandedGraph' | 'stats' | 'replay'
  | 'profile' | 'social' | 'comms' | 'quests' | 'settings'
  | 'changelog' | 'theme' | 'sound' | 'bugReports' | 'ghost';
```

Validation rules: `Z` is `as const` and every consumer must reference a key, never a literal. Adding a layer requires adding the matching `--z-*` custom property in the same commit; the plan adds an eslint `no-restricted-syntax` rule (see [Dependencies]) that fails on any `z-[<number>]` arbitrary value in `src/**/*.tsx`.

**2. `src/hooks/useTypingPrefs.ts` — typing surface preferences (new file)**

```ts
export type CaretStyle = 'line' | 'block' | 'underline' | 'off';

export interface TypingPrefs {
  /** Caret shape. Current behaviour is a hardcoded 4px underline
   *  (TypingArea.tsx:577 `h-[4px] rounded-full`). Default: 'line'. */
  caretStyle: CaretStyle;
  /** Animate the caret between characters. false = instant jump.
   *  Current behaviour is always-on 100ms glide. Default: true. */
  caretSmooth: boolean;
  /** Base font size in px for the typing text, 16–48, step 2.
   *  Replaces the fixed `text-xl md:text-2xl lg:text-3xl`
   *  (TypingArea.tsx:208). Default: 24. */
  fontSizePx: number;
  /** Line height multiplier, 1.4–2.4, step 0.1. Replaces the fixed
   *  `leading-[1.8]`. Default: 1.8. */
  lineHeight: number;
  /** Refuse to advance past an incorrect character. Default: false. */
  stopOnError: boolean;
  /** Hide the live WPM/accuracy readouts during a test (reveal on
   *  finish). Default: false. */
  hideLiveStats: boolean;
  /** Highlight scope for the untyped text. Default: 'off'. */
  activeHighlight: 'off' | 'word' | 'line';
}

export const DEFAULT_TYPING_PREFS: TypingPrefs;
export const TYPING_PREFS_KEY = 'typenova_typing_prefs';
```

Persistence follows the existing convention (`try { localStorage… } catch {}` guards, as in `useGameConfig.ts:12-25`). Malformed or partial stored JSON is merged over `DEFAULT_TYPING_PREFS` field-by-field with range clamping — never spread blindly, because `fontSizePx` and `lineHeight` reach CSS.

**3. `src/lib/commands.ts` — command palette registry (new file)**

```ts
export type CommandGroup = 'Navigate' | 'Practice' | 'Modifiers' | 'Panels' | 'Appearance' | 'Account';

export interface CommandAction {
  id: string;                  // stable, e.g. 'nav.compete'
  label: string;               // "Go to Compete"
  group: CommandGroup;
  keywords?: string[];         // extra fuzzy-match terms
  shortcut?: string;           // display only, e.g. '⌘K'
  icon?: React.ElementType;    // lucide-react component
  /** Hidden rather than disabled when false — a guest should not see
   *  "Sign out". */
  available?: () => boolean;
  run: () => void;
}
```

**4. `src/components/ui/dialog.tsx` + `src/components/ui/Modal.tsx` — overlay contract**

```ts
export interface ModalProps {
  open: boolean;
  onClose: () => void;
  /** Stacking layer. 'modalNested' for a dialog opened from a dialog. */
  layer?: Extract<ZLayer, 'modal' | 'modalNested'>;
  /** Content max width; maps to CONTAINER or a Tailwind max-w-* class. */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  /** Required for aria-labelledby. Rendered visually unless
   *  `hideTitle`, in which case it is sr-only. */
  title: string;
  hideTitle?: boolean;
  description?: string;
  /** Escape-to-close and backdrop-click, both default true. */
  dismissible?: boolean;
  className?: string;          // per-modal glass styling, preserved verbatim
  children: React.ReactNode;
}
```

[Files]
The change set is 6 new foundation files, 3 new feature files, 1 new CSS token block, and edits to 22 existing files; nothing is deleted outright and two components are superseded.

**New files**

| Path | Purpose |
|---|---|
| `src/lib/layout.ts` | `Z`, `zClass`, `CONTAINER`, `Stage`, `ModalKey` (see [Types]). Single import point for layout vocabulary. |
| `src/hooks/useAppChrome.ts` | Measures the navbar and the bottom dock with `ResizeObserver` and publishes `--nav-h` / `--dock-h` on `document.documentElement`. Returns `{ navRef, dockRef, navHeight, dockHeight }`. |
| `src/components/layout/AppShell.tsx` | Owns everything currently inlined in `App.tsx:1372-1502`: the themed root div, the wallpaper/shader `AnimatePresence` pair, the grid overlay, the progress bar / `TimedHud` slot, the reconnect banner slot, the zen ambient glow, and the nav slot wired to `useAppChrome().navRef`. |
| `src/components/layout/StagePage.tsx` | One animated stage wrapper replacing the three near-duplicate `motion.div`s at `App.tsx:1507`, `1521`, `1624`. Props: `stageKey`, `direction`, `width: ContainerWidth`, `fill?: boolean` (academy's full-bleed scroll container), `className?`. Applies `pt-[calc(var(--nav-h)+1.5rem)]` and `max-w-[var(--w-…)]` from tokens — no hardcoded offsets. |
| `src/components/ui/dialog.tsx` | Radix `Dialog` re-export set (`Root/Portal/Overlay/Content/Title/Description/Close`) with TypeNova glass styling, generated to match the existing look (`bg-black/80 backdrop-blur-md`, `bg-zinc-950 border border-zinc-800 rounded-[2.5rem]`). |
| `src/components/ui/Modal.tsx` | Ergonomic wrapper implementing `ModalProps`; portals to `document.body`, so a modal's z-index is finally independent of its parent's stacking context. |
| `src/hooks/useTypingPrefs.ts` | `TypingPrefs` state + persistence + a `--type-size` / `--type-leading` CSS variable writer. |
| `src/components/CommandPalette.tsx` | `cmdk` + `ui/dialog` palette at `--z-palette`, opened by ⌘K / Ctrl+K. |
| `src/lib/commands.ts` | `buildCommands(ctx)` returning the `CommandAction[]` registry. |
| `src/routes.tsx` | Route table: `/` → redirect to `/practice`, `/practice`, `/compete`, `/academy`, `/r/:code`, `/login`, `*` → `/practice`. |
| `src/hooks/useStageRoute.ts` | Bidirectional mapping between the URL and the `Stage` union; replaces `const [currentStage, setCurrentStage] = useState(...)` at `App.tsx:294`. Exposes `stage`, `goToStage(stage)`, `roomCodeFromUrl`. |

**Existing files — foundation edits**

- **`src/index.css`** — add a `:root` token block defining `--z-canvas … --z-transition` (values per `Z`), `--w-narrow/--w-wide/--w-ultra`, `--nav-h: 76px` and `--dock-h: 72px` as *fallbacks only* (`useAppChrome` overwrites them on mount, so SSR/first paint is never wrong by more than one frame). Add a global `:focus-visible` ring (`outline: 2px solid rgb(var(--accent-rgb, 125 244 255)); outline-offset: 2px`) — there is currently no focus indicator anywhere, and `focus:outline-none` is applied to inputs in at least `CompeteEntryScreen.tsx:297`, `LobbyScreen`, `ArenaConfigBar.tsx:230` and `SettingsModal`. Extend the `@media (prefers-reduced-motion: reduce)` block at line 502 — today it neutralises exactly three academy animations (`.animate-key-ripple`, `.animate-star-pop`, `.animate-count-glow`) — to also cover `.lucid-enter`, `.lucid-scale`, `.lucid-scale-exit`, `.lucid-slide`, `.stat-card`, `.caret-lucid`, `.banner-matrix`, `.academy-portal-circle`, `.logo-wobble` and `[data-motion-safe]`. Trim the line-2 `@import` from 16 Google font families to the families the font picker actually offers (verify against `SettingsModal`'s font list before cutting) and add `&display=swap` retention.
- **`src/App.tsx`** — the largest edit. Replace the inline render shell (lines 1355-1502 and 1702-1783) with `<AppShell>` + three `<StagePage>` children; swap `currentStage` state for `useStageRoute()`; extract `ModalType` (line 268) to import `ModalKey` from `src/lib/layout.ts`; delete the duplicated nested flex container at 1647-1649 in favour of one CSS grid; replace the `leaderboardClass` string (1083-1084) with grid-column control; mount `<CommandPalette>` and `useTypingPrefs()`; replace the URL-share effect (526-538) with `useStageRoute().roomCodeFromUrl` so the invite code stops being erased by `window.history.replaceState`.
- **`src/components/CosmicNavBar.tsx`** — accept and attach `ref` (line 85) for measurement; `z-50` → `z-[var(--z-nav)]`; change the mobile drawer's `md:hidden` (line 216) to `lg:hidden` so it matches its own trigger's `lg:hidden` (line 207) and the 768–1023px dead zone disappears; rebuild the drawer on `ui/Modal`; add `md:flex` visibility for a condensed action tray so `Trophies/Stats/Community/Comms` are reachable at tablet widths; add `aria-current="page"` to the active nav link and `aria-expanded`/`aria-controls` to the hamburger.
- **`src/components/BottomControlsDock.tsx`** — `z-[500]` (52) and `z-50` (134) → `z-[var(--z-dock)]`; attach `dockRef`; move the bottom-left changelog badge and the bottom-right pill into one `fixed bottom-0 inset-x-0` flex row so they can no longer collide with `AIChatBot`'s identical `fixed bottom-6 right-6` anchor (AIChatBot.tsx) or `AcademyLayout`'s `fixed bottom-6 right-6 z-50` toast stack.
- **`src/components/AccountMenu.tsx`** — `z-[3000]` → `z-[var(--z-content-pop)]` (it is inside the dock; 3000 never meant anything) and convert to `@radix-ui/react-dropdown-menu` for keyboard support.
- **`src/components/AIChatBot.tsx`** — `z-[999]`, `z-[1000]`, `z-[1010]` → `--z-aru`; bottom anchor offset to `calc(var(--dock-h) + 1rem)`.
- **`src/components/ui/CyberTileTransition.tsx`** (`z-[200]`) and **`src/components/ui/QuantumWipeTransition.tsx`** (`z-[250]`) → `--z-transition`.

**Existing files — modal migration to `ui/Modal`** (styling classes copied verbatim; only the shell changes)

`AppModalManager.tsx` (7 inline overlays: ready `z-[200]`, countdown `z-[200]`, level-up toast `z-[600]`, needs-username `z-[700]`, expandedGraph `z-[500]`, godMode `z-[400]`, trophy `z-[500]`), `SettingsModal.tsx`, `StatsDashboard.tsx`, `SocialModal.tsx`, `CommsModal.tsx`, `PlayerProfileModal.tsx` (→ `layer="modalNested"`, it opens from Social), `ProfileCustomizationMenu.tsx`, `DailyQuestsPanel.tsx`, `ChangelogModal.tsx` (plus its nested `z-[600]` subscribe dialog → `modalNested`), `BugReportsModal.tsx`, `ReplayModal.tsx`, `GhostPacerModal.tsx`, `ExpandableInfoModal.tsx`, and `LobbyScreen.tsx`'s join dialog (`z-[600]`).

**Existing files — stage positioning edits**

- **`src/components/PracticeArena.tsx`** — line 53 `lg:w-[70%]` → `w-full min-w-0` (the new grid owns the split); line 218 ready-prompt `-bottom-6 z-[100]` → `-bottom-5 z-[var(--z-content-pop)]` with the parent's `mb-12` (line 100) replaced by explicit `pb-7` so the button no longer overlaps by negative margin; lines 245-254 abort button given a reserved fixed-height slot so the arena does not jump when `TYPING` begins; the 8-button modifier dock (104-190) gets `flex-wrap` + a `sm:` compact variant.
- **`src/components/TypingArea.tsx`** — line 208 fixed font classes → `style={{ fontSize: 'var(--type-size)', lineHeight: 'var(--type-leading)' }}`; line 338 `w-[calc(100%+2rem)] -ml-4 px-4` (a hack to let the caret glow bleed) → `w-full` + `overflow-visible` on the measured parent, removing a horizontal-overflow source; line 348 `max-h-[70vh]` → `max-h-[min(52vh,28rem)]` with a stable `min-h` so the page never scrolls mid-test; the `capsLock` banner (242, `absolute -top-4`) and `stickyPenalty` banner (332, `absolute top-4`) — which currently occupy the same absolute region and overlap each other and the ghost track — become children of one non-absolute status rail rendered above the text; `GlidingBar` (496) gains `caretStyle` + `smooth` props from `TypingPrefs`.
- **`src/components/ArenaConfigBar.tsx`** — line 42 emits both `flex` (base) and `hidden` (conditional) and only works because Tailwind happens to order `.hidden` after `.flex`; replace with a single conditional display class. Add `max-sm:flex-nowrap max-sm:overflow-x-auto` so the six-option level `SegmentedControl` scrolls instead of wrapping the arena down the page on phones.
- **`src/components/CompeteEntryScreen.tsx`** — reorder so the primary Host/Join grid (183-330) comes *before* the secondary discovery panels; rename the `quickMatchSlot` prop to `secondarySlot` and render it below the primary grid in a `lg:grid-cols-2` row (QuickMatch + RoomBrowser) with `RankedHistoryPanel` in a `@radix-ui/react-collapsible`. Root `max-w-[1100px]` → `max-w-[var(--w-narrow)]`.
- **`src/components/LobbyScreen.tsx`** — drop the redundant root `max-w-[1600px]` (the stage already constrains it); the countdown overlay `absolute inset-0 z-[55]` becomes a portalled full-viewport overlay at `--z-countdown` so it actually covers the navbar; the `isJoining` overlay `absolute inset-0 z-50` → `z-[var(--z-content-pop)]` (it is intentionally card-scoped).
- **`src/components/ResultsScreen.tsx`** / **`src/components/RaceResultsScreen.tsx`** / **`src/components/AIDrillResultsScreen.tsx`** — `max-w-6xl` → `max-w-[var(--w-narrow)]`; wrap in `StagePage` so results honour `--nav-h` instead of ad-hoc `py-12`.
- **`src/components/academy/AcademyLayout.tsx`** — its `fixed bottom-6 right-6 z-50` toast stack → `--z-dock` with `bottom: calc(var(--dock-h) + 1rem)`; the `-z-10` scrim comment (which reasons explicitly about "the z-50 nav") updated to the token names.
- **`src/components/SettingsModal.tsx`** — new "Typing" tab wired to `useTypingPrefs`.

**Configuration**

- `tailwind.config.js` — no new spacing values (the fix for `pt-22` is deletion, not definition). Optionally add `screens: { xs: '420px' }` if the mobile pass needs it.
- `eslint.config.js` — add the `no-restricted-syntax` guard against raw `z-[<number>]` and against `top-[NNpx]` in `src/**/*.tsx`.

[Functions]
Fourteen new functions/hooks are introduced; nine existing functions change signature or behaviour; none are removed.

**New**

- `useAppChrome(): { navRef, dockRef, navHeight, dockHeight }` — `src/hooks/useAppChrome.ts`. Attaches a `ResizeObserver` to the nav and dock elements and writes `--nav-h`/`--dock-h` to `document.documentElement.style` inside a `requestAnimationFrame` (batched, so a font swap or a level-up badge appearing in the nav re-flows every stage correctly). Cleans up both observers on unmount.
- `zClass(layer: ZLayer): string` — `src/lib/layout.ts`. Maps a layer key to `z-[var(--z-…)]`.
- `containerClass(width: ContainerWidth): string` — `src/lib/layout.ts`. Maps to `max-w-[var(--w-…)] mx-auto w-full`.
- `useTypingPrefs(): { prefs: TypingPrefs; setPref: <K extends keyof TypingPrefs>(k: K, v: TypingPrefs[K]) => void; resetPrefs: () => void }` — `src/hooks/useTypingPrefs.ts`. Also runs the effect that writes `--type-size: {fontSizePx}px` and `--type-leading: {lineHeight}`.
- `loadTypingPrefs(): TypingPrefs` / `saveTypingPrefs(p: TypingPrefs): void` / `clampPrefs(partial: unknown): TypingPrefs` — same file. `clampPrefs` is the validation boundary: unknown keys dropped, `fontSizePx` clamped to 16–48, `lineHeight` to 1.4–2.4, enums checked against their literal sets.
- `useStageRoute(): { stage: Stage; goToStage(s: Stage, opts?: { replace?: boolean }): void; roomCodeFromUrl: string | null }` — `src/hooks/useStageRoute.ts`. Reads `useLocation()`/`useParams()` from `react-router` v7 and calls `useNavigate()`. `/r/:code` resolves to `stage: 'compete'` with `roomCodeFromUrl` set, and the code is *not* stripped from the URL, so a shared link survives a refresh.
- `buildCommands(ctx: CommandContext): CommandAction[]` — `src/lib/commands.ts`. `ctx` carries `{ goToStage, openModal, game, typing, prefs, auth, cloud, theme, selectTheme }`. Groups: Navigate (3 stages), Practice (start/restart, level ×6, length ×4, words/time toggle, daily), Modifiers (the 8 toggles currently only reachable via the icon dock at `PracticeArena.tsx:104-190`), Panels (the 15 `ModalKey`s), Appearance (theme ×N, font, caret style, font size ±), Account (sign in/out, profile).
- `CommandPalette({ commands, open, onOpenChange }): JSX.Element` — `src/components/CommandPalette.tsx`.
- `AppShell(props): JSX.Element` and `StagePage(props): JSX.Element` — `src/components/layout/`.
- `Modal(props: ModalProps): JSX.Element` — `src/components/ui/Modal.tsx`.
- `renderCaret(style: CaretStyle, smooth: boolean): { className: string; style: React.CSSProperties }` — `src/components/TypingArea.tsx`. Pure helper so the four caret shapes stay declarative: `line` → `w-[2px] h-[1.1em]`, `block` → `w-full h-[1.1em] opacity-40`, `underline` → the current `h-[4px] rounded-full`, `off` → render nothing.

**Modified**

- `handleKeyDown` (closure inside the `useEffect` at `src/components/TypingController.tsx`) — after `const isError = typedChar !== expectedChar;` insert the stop-on-error branch: when `prefs.stopOnError && isError`, push the keystroke to `typing.keystrokeLog.current` (so accuracy and the heatmap still record the mistake) but do **not** call `typing.setInputSync`, and still play the error sound and trigger the shake. Add an early return when the command palette is open, alongside the existing `activeModal` gate. `TypingController` gains a `typingPrefs: TypingPrefs` prop.
- `MainApp` (`src/App.tsx:191`) — `currentStage`/`setCurrentStage` replaced by `useStageRoute()`; every `setCurrentStage('…')` call site (lines 298, 382, 425, 455-459, 533, 544, 743, 1128, 1146, 1165, 1197, 1205) becomes `goToStage('…')`.
- `enterAcademy` / `exitAcademy` (`App.tsx:297`, `1164`) — delegate to `goToStage`.
- The URL-share `useEffect` (`App.tsx:526-538`) — replaced by a `roomCodeFromUrl` effect that joins the room and leaves the URL intact.
- `handleReset` (`App.tsx:705`) — `setCurrentStage('practice')` → `goToStage('practice', { replace: true })` so an abort does not add a history entry.
- `CosmicNavBar` (`src/components/CosmicNavBar.tsx:34`) — wrapped in `forwardRef<HTMLElement, CosmicNavBarProps>` while keeping `memo`.
- `BottomControlsDock` (`src/components/BottomControlsDock.tsx:33`) — same `forwardRef` treatment for `dockRef`.
- `TypingArea` (`src/components/TypingArea.tsx:140`) — new `prefs: TypingPrefs` prop; the `baseFontClass` computation at 206-208 drops its size/leading classes in favour of CSS variables (zen mode keeps its larger scale by multiplying `--type-size`).
- `GlidingBar` (`src/components/TypingArea.tsx:496`) — new `caretStyle` and `smooth` props; when `smooth === false` the `transition` is set to `none`.
- `CompeteEntryScreen` (`src/components/CompeteEntryScreen.tsx:60`) — `quickMatchSlot` → `secondarySlot`, plus the reordered layout.

[Classes]
No classes are added, modified or removed — the codebase is entirely function components and hooks, and this plan does not change that.

The only class-shaped construct touched is `src/components/ErrorBoundary.tsx` (a `React.Component` subclass, required for `componentDidCatch`). Its fallback markup is re-styled to sit inside `AppShell` and to use `--z-modal` for its overlay, but its class shape, lifecycle methods and `onReset` prop are unchanged.

[Dependencies]
No new runtime dependencies; the plan activates four packages already in `package.json` and adds one dev-only test toolchain.

Already installed, currently unused, now used:
- `@radix-ui/react-dialog@^1.1.15` → `src/components/ui/dialog.tsx`, every modal.
- `@radix-ui/react-dropdown-menu@^2.1.16` → `AccountMenu`.
- `@radix-ui/react-collapsible@^1.1.12` → `RankedHistoryPanel` in the compete secondary row.
- `cmdk@^1.1.1` → `CommandPalette`.
- `react-router@^7.6.1` → already a dependency and already used for `/` and `/login` (`App.tsx:1811-1814`); extended to stage routes.

Dev additions (for [Testing]):
- `vitest@^3.2.4`, `@vitest/coverage-v8@^3.2.4`, `jsdom@^26.1.0`, `@testing-library/react@^16.3.0`, `@testing-library/user-event@^14.6.1`, `@testing-library/jest-dom@^6.6.3`. Pinned exactly, all dev-only. New scripts: `"test": "vitest run"`, `"test:watch": "vitest"`.

Integration requirements: `vite.config.ts` gains a `test` block (`environment: 'jsdom'`, `setupFiles: './src/test/setup.ts'`, `globals: true`). `tsconfig.app.json` gains `"types": ["vitest/globals", "@testing-library/jest-dom"]`. Note that `tailwind.config.js` loads `src/data/constants.ts` through `jiti` at config-evaluation time to build the theme safelist — the dev server must be restarted after any change to `THEMES`, and the new CSS token block must live in `src/index.css` rather than the Tailwind theme so it stays hot-reloadable.

Not added, deliberately: no CSS-in-JS, no layout library, no `framer-motion` upgrade. `vaul` (drawer) stays unused — the nav drawer is built on Radix Dialog to avoid introducing a second overlay system.

[Testing]
Because most of this change is visual, validation is a three-layer gate: automated unit tests for the pure logic, a build/lint gate, and an explicit manual viewport matrix for the layout itself.

**Automated (new — no test framework exists today; `package.json` has only `dev`/`build`/`lint`/`preview`)**

- `src/test/setup.ts` — imports `@testing-library/jest-dom`, stubs `ResizeObserver` and `matchMedia`.
- `src/hooks/useTypingPrefs.test.ts` — defaults; round-trip persistence; `clampPrefs` rejects `fontSizePx: 999`, `lineHeight: -1`, `caretStyle: 'sparkle'`, `null`, `'{'`, and a partial object missing three keys; the CSS-variable effect writes `--type-size`.
- `src/hooks/useAppChrome.test.ts` — publishes `--nav-h` from a mocked `ResizeObserver` entry; updates on a second observation; removes nothing on unmount that it did not add.
- `src/hooks/useStageRoute.test.tsx` — `/practice|/compete|/academy` → correct `Stage`; `/r/ABC123` → `{ stage: 'compete', roomCodeFromUrl: 'ABC123' }`; unknown path → `practice`; `goToStage` pushes, and with `{ replace: true }` does not grow history.
- `src/lib/commands.test.ts` — every `CommandAction.id` is unique; `available: () => false` entries are filtered; each `run` invokes exactly the injected context callback.
- `src/lib/layout.test.ts` — every key in `Z` has a matching `--z-*` declaration in `src/index.css` (read the file and regex it — this is the test that keeps the token scale honest).
- `src/components/TypingController.stopOnError.test.tsx` — with `stopOnError: true`, a wrong keypress leaves `input` unchanged but appends an `isError: true` keystroke; the following correct keypress advances normally; with `stopOnError: false` the current behaviour is unchanged.
- `src/components/ui/Modal.test.tsx` — renders `role="dialog"` + `aria-modal="true"`; Escape calls `onClose` when `dismissible`, and does not when not; focus moves into the dialog on open and returns to the trigger on close; `document.body` regains scroll after close.

**Existing tests**: none to modify. `scripts/test_m2_empirical.ts` is a standalone empirical script, not a test-runner test; leave it alone.

**Build gate**: `npm run build` (which is `tsc -b && vite build`) must pass, and `npm run lint` must produce no *new* errors. Baseline first — `lint.txt`, `lint2.txt`, `lint3.txt` in the repo root suggest a pre-existing warning backlog, and `src/App.tsx:2-6` disables five rules file-wide. Capture the baseline count before starting and compare after.

**Manual viewport matrix** (the real acceptance test for a layout change). At **360, 420, 768, 1024, 1280, 1440, 1920** px width, and at a short viewport (**1280×720**), for each of practice / compete-entry / compete-lobby / mid-race / results / academy, confirm:
1. No content sits under the navbar and no gap larger than the intended 24px sits below it.
2. The 768–1023px band has a working nav drawer and reachable Trophies/Stats/Community/Comms.
3. The typing text is fully visible during a test with **no page scroll** at 1280×720.
4. The bottom dock, the changelog badge, the Aru button and the academy toast stack never overlap.
5. The lobby countdown overlay covers the navbar.
6. Every modal: opens with focus inside, closes on Escape, restores focus, locks body scroll, and traps Tab.
7. Keyboard-only: Tab through nav → config bar → arena → dock with a visible focus ring at every stop.
8. ⌘K opens the palette, does not leak keystrokes into the typing engine, and closes on Escape.
9. Browser Back moves practice ↔ compete ↔ academy; a `/r/CODE` link joins the room and survives a refresh.
10. With OS "reduce motion" on, stage transitions, `lucid-*` entrances and the caret blink are all still.

[Implementation Order]
Eleven phases, ordered so the foundation exists before anything consumes it and so each phase ends at a state where `npm run build` passes and the app is usable.

1. **Baseline.** Record `npm run lint` and `npm run build` output, and screenshot the seven viewports × six screens as the before-state. Nothing to compare against later otherwise.
2. **Tokens.** Add the `--z-*`, `--w-*`, `--nav-h`, `--dock-h`, `:focus-visible` and expanded `prefers-reduced-motion` blocks to `src/index.css`; create `src/lib/layout.ts`. No component changes yet — the app must look byte-identical after this step.
3. **Measurement.** Add `src/hooks/useAppChrome.ts`; `forwardRef` on `CosmicNavBar` and `BottomControlsDock`; wire the refs in `App.tsx`. Verify in devtools that `--nav-h` tracks the real header height across breakpoints, then replace the four hardcoded offsets (`top-[76px]`, `pt-20 md:pt-24`, `pt-20 md:pt-22`, `top-[84px]`) with `var(--nav-h)` expressions. This is the single highest-value commit in the plan.
4. **Shell.** Extract `AppShell` and `StagePage` from `App.tsx`; move all three stages into `StagePage`; unify the five max-widths onto `--w-narrow/--w-wide/--w-ultra`; collapse the duplicated nested flex wrapper (`App.tsx:1647-1649`) and the `leaderboardClass` width juggling into one `lg:grid-cols-[minmax(0,1fr)_360px]` grid.
5. **Stacking sweep.** Replace every remaining raw z-index with `zClass(...)`, working top-down through the layer list; fix the four values that were structurally inert (lobby countdown, ready prompt, account menu, `ExpandableInfoModal` below the HUD). Land the eslint guard in the same commit so regressions cannot slip back in.
6. **Dialog primitive.** Add `ui/dialog.tsx` + `ui/Modal.tsx` with tests. Migrate exactly one modal first — `ReplayModal`, the simplest — and verify focus trap, Escape, scroll lock and that the typing engine stays quiet. Only then migrate the remaining thirteen, in `AppModalManager` order, one commit per two or three modals so a visual regression is easy to bisect.
7. **Stage polish.** Per-screen positioning fixes: `PracticeArena` (ready prompt, abort-button slot, modifier dock wrap), `TypingArea` (status rail replacing the two overlapping absolute banners, `max-h` retune, overflow hack removal), `ArenaConfigBar` (the `flex`+`hidden` conflict, mobile scroll), `CompeteEntryScreen` (primary-action-first reorder), `LobbyScreen` (redundant max-width, portalled countdown), the three results screens.
8. **Responsive pass.** Fix the 768–1023px nav dead zone (`md:hidden` → `lg:hidden` on the drawer plus a condensed `md:` action tray); then walk the matrix at 360/420/768 and fix what breaks. Expect the six-option level `SegmentedControl` and the eight-button modifier dock to need the most work.
9. **Typing preferences.** `useTypingPrefs` + tests → CSS variables in `TypingArea` → `renderCaret` + `GlidingBar` props → `stopOnError` in `TypingController` → the new "Typing" tab in `SettingsModal`. Ship the settings UI last so the plumbing is already proven.
10. **Routing + palette.** `src/routes.tsx` and `useStageRoute` (replacing `currentStage`, including the `/r/:code` invite path that no longer erases itself), then `lib/commands.ts` and `CommandPalette` on top of the now-existing dialog primitive. Routing before the palette, because the palette's largest command group is navigation.
11. **Verify and document.** Full `npm run test && npm run lint && npm run build`; the complete manual matrix; then update `CHANGELOG.md` and `src/data/changelog.ts` (the in-app changelog the version badge reads from), and reconcile `ROADMAP.md`, which still calls v2.5.0 current while `package.json` says 2.6.0.
