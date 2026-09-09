# Compete Entry Screen — Redesign Plan

New file rather than an edit to `implementation_plan.md`. That document is a
whole-app chrome plan and most of it has already shipped (`src/lib/layout.ts`,
`src/hooks/useAppChrome.ts`, the `--z-*`/`--w-*`/`--nav-h` block in `index.css`).
Overwriting it would destroy a still-useful record, so this plan stands beside it
and is scoped to one screen.

## Decisions this plan encodes

| Question | Answer |
| --- | --- |
| Scope | Compete entry screen only — the four files App composes at `App.tsx:1665` |
| Visual intensity | Restructure, keep the vibe. Same dark cosmic material and theme colours; fix hierarchy, nesting and scroll |
| New features | My call, listed in section 4 with reasoning. Veto any of them |

Out of scope: the typing engine, the realtime protocol (`useRace`,
`useMatchmaking`), Supabase schema, `LobbyScreen`, `RaceResultsScreen`, and the
AI-passage feature discussed earlier — that one is unscoped until you describe it.

## 1. What is actually wrong

Five problems, each verifiable in the source.

**1.1 `.glass-panel` is nested four deep, and the project already documents that
as wrong.** `index.css:451-466` introduces `.glass-card` with this rationale:
"`.glass-panel` cannot be nested cheaply: it carries its own backdrop-filter, and
a blurred layer inside an already-blurred layer both costs a second full-surface
filter pass and reads muddy, because the child samples a backdrop that has
already lost its detail." The compete screen ignores that. `QuickMatchPanel.tsx:81`,
`CompeteEntryScreen.tsx:363` (host), `:453` (join) and `RoomBrowser.tsx:61` all
apply `glass-panel !bg-[rgba(10,12,18,0.78)] backdrop-blur-[24px] rounded-3xl`
plus the identical `shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85)]`. Four surfaces,
one appearance, no elevation hierarchy — and four separate blur passes.
`RankedHistoryPanel.tsx:73` is the odd one out (`bg-black/40`, lighter shadow),
so the rail's two panels do not even match each other.

**1.2 Four independent scroll containers.** The page container
(`App.tsx:1660`), the primary column (`CompeteEntryScreen.tsx:345`
`xl:overflow-y-auto`), the aside (`:592` same), and the room list
(`RoomBrowser.tsx:125` `max-h-[240px] overflow-y-auto`). At `xl` a wheel event's
target depends on which quadrant the cursor sits in. Nested scroll is a
usability defect, not a taste call.

**1.3 The header spends ~140px decorating a screen whose job is two buttons.**
`CompeteEntryScreen.tsx:228-280`: a pill row (status + "Racing as"), a
`text-4xl` title, then a subtitle that is itself wrapped in a
`rounded-full bg-black/30 backdrop-blur-sm border` capsule. That last one is a
fifth blurred surface applied to a single sentence of helper text.

**1.4 Motion is defined four times and honours `prefers-reduced-motion` once.**

| File | Local presets | `useReducedMotion` |
| --- | --- | --- |
| `CompeteEntryScreen.tsx:60-108` | `staggerContainer`, `fadeUp`, `cardSpring`, `hoverLift`, `tapPress`, `iconPop`, plus a hand-copied `reveal()` | yes |
| `RoomBrowser.tsx:19-40` | `listContainer`, `listItem`, `hoverRow`, `tapPress` | **no** |
| `RankedHistoryPanel.tsx:28-55` | `listContainer`, `listItem`, `badgePop`, `hoverRow` | **no** |
| `QuickMatchPanel.tsx:29,70-80` | `tapPress`, hardcoded `ease: [0.16, 1, 0.3, 1]` | **no** |

`src/components/profile/profileMotion.ts` is a finished vocabulary — three named
springs, `listParent`/`listChild`, and a `reveal()` at line 125 that
`CompeteEntryScreen.tsx:107` reimplements almost verbatim, comment included. None
of the four files import it.

Two of those animations run forever and cannot be turned off:
`QuickMatchPanel.tsx:90-96` bobs the idle icon on `repeat: Infinity`, and
`RankedHistoryPanel.tsx:109-117` pulses the empty-state paragraph's opacity
between 0.4 and 0.7 on an infinite loop. The CSS guards at `index.css:442-449`
cover `.compete-glow-ring` and `.btn-shimmer` but cannot reach a Framer Motion
`animate` prop.

**1.5 Purple, against an explicit workspace rule.** `GEMINI.md` requires
`theme.glowPrimary` binding and names hardcoded accents as the thing that breaks
Auto-Fetch mode. The join card hardcodes purple in four places —
`border-purple-500/35` (`:453`), the icon chip `bg-purple-500/20
border-purple-500/40 text-purple-300` (`:458`), the input's
`focus:border-purple-400` + `shadow-[0_0_25px_rgba(168,85,247,0.35)]` (`:516-519`),
and the submit button's `from-purple-600 to-indigo-600` with a matching glow
(`:576`) — while the host card beside it follows `theme`. So the two cards drift
apart the moment a wallpaper sets a non-purple accent, and purple/indigo gradient
is the single most recognisable machine-generated-UI tell.

## 2. Layout restructure

**2.1 One scroll container.** Delete `xl:overflow-y-auto` from
`CompeteEntryScreen.tsx:345` and `:592`, and the `max-h-[240px] overflow-y-auto`
from `RoomBrowser.tsx:125`. The page container at `App.tsx:1660` becomes the only
scroller. Drop `xl:h-full` from that container so the cockpit is allowed to be
taller than the viewport instead of forcing its columns to scroll internally.

This has to preserve the goal the internal scroll was protecting. The comment at
`App.tsx:1656` and the header comment at `CompeteEntryScreen.tsx:136-143` both
say the same thing: an earlier version stacked every panel in one column and
pushed Create/Join ~1200px down the page. Internal scrolling was the fix. The
constraint is real; the mechanism was the wrong one. Keeping the actions first in
the DOM and first in the grid achieves it without nesting scrollers — Quick
Match, Host and Join occupy the top of the primary column, so they are on screen
at load regardless of how tall the rail grows. If the rail outgrows them the page
scrolls, and what scrolls out of view is history, which is the correct thing to
lose first. Add `xl:sticky xl:top-4 xl:self-start` to the actions block so it
stays put while a long rail scrolls past it.

**2.2 Three elevation tiers instead of one.** Replace the identical treatment on
all four panels with:

- **Tier 1 — the cockpit shell.** Nothing. The stage background already provides
  the material; the cockpit does not need a surface of its own.
- **Tier 2 — action surfaces** (Host, Join, Quick Match). `.glass-panel`, the
  only tier that keeps `backdrop-filter`. These float over page content, which is
  what `index.css:463-465` says `.glass-panel` is for.
- **Tier 3 — rail surfaces** (RoomBrowser, RankedHistoryPanel) and every row
  inside them. `.glass-card` — same diagonal wash, specular rim and inner
  shadow, no blur. Written for exactly this case.

Radius follows the same tiers: `rounded-3xl` on tier 2, `rounded-2xl` on tier 3,
`rounded-xl` on rows. Uniform `rounded-3xl` on everything is what flattens the
hierarchy today. Drop the `!bg-[rgba(10,12,18,0.78)]` overrides and the
duplicated `shadow-[0_25px_60px_-15px_...]` — `.glass-panel` already ships a
five-layer shadow at `index.css:316-322`, so the override is fighting the system
it opted into.

Net effect: blurred surfaces on this screen go from five to three, and none of
them nest inside another.

**2.3 Header down to one row, ~44px.** Merge the status pill, the identity chip
and the title into a single line: `Race someone real` at `text-xl` on the left,
status and "Racing as {name}" as chips on the right. Delete the subtitle capsule
at `:274-279` — "Host a room and share the code, or drop in with a code a friend
sent you" restates the two card headings verbatim, and both cards already carry
their own subtitle. Keep the `role="status"` live region and the icon swap; those
are accessibility affordances, not decoration.

## 3. Motion consolidation

Delete every local preset in the four files and import from `profileMotion.ts`.
The mapping is close to mechanical:

| Local | Replacement |
| --- | --- |
| `staggerContainer` | `listParent(0.08, 0.05)` |
| `fadeUp`, `listItem` | `listChild` |
| `cardSpring(delay)` | `shellIn` + `springHeavy` |
| `hoverLift`, `hoverRow` | `{ y: -2, transition: springSnappy }` |
| `tapPress` | `{ scale: 0.97, transition: springSnappy }` |
| `iconPop`, `badgePop` | `chipSwap` / `springSnappy` |
| `reveal()` (duplicated) | `reveal()` from `profileMotion.ts:125` |
| `ease: [0.16, 1, 0.3, 1]` | `EASE_OUT` |

Then add `const reduce = useReducedMotion()` to `RoomBrowser`,
`RankedHistoryPanel` and `QuickMatchPanel`, route every entrance through
`reveal(reduce, …)`, and gate all `whileHover`/`whileTap` on `reduce`. The two
infinite animations get switched off outright when `reduce` is set: the idle bob
at `QuickMatchPanel.tsx:90-96` becomes a static icon, and the pulsing empty-state
paragraph at `RankedHistoryPanel.tsx:109-117` becomes plain text at full opacity.
The searching spinner stays — it communicates live state, and stopping it would
misreport the queue.

Because `profileMotion.ts` currently lives under `components/profile/`, importing
it into compete components makes the folder name misleading. Move it to
`src/lib/motion.ts` and re-export from the old path so the dossier and forge keep
working untouched.

## 4. New UI features

Four additions. Each one either fixes a concrete gap or activates a dependency
already in `package.json` and already paid for in bundle size.

**4.1 Six-box room code input.** `input-otp@1.4.2` is installed
(`package.json:51`) and imported nowhere in `src/`. The current field is one wide
input with `tracking-[0.25em]` and `px-[68px] sm:px-[104px]` — asymmetric padding
whose only job is to fake optical centring around the absolutely-positioned Paste
button (`:514-515` admits this). Six discrete boxes give per-character position
feedback, make "six characters" self-evident, and retire both the padding hack
and the `6 / 6` counter at `:475-483`. `extractRoomCode` stays as the paste
transform, so full invite links keep working.

**4.2 Recent rooms.** The screen has no memory: leave a room, come back, retype
the code. Persist the last three codes you hosted or joined to `localStorage`
alongside a timestamp, and render them as one-tap chips under the code input.
Purely local, no schema change.

**4.3 Per-row join feedback in the room browser.** `RoomBrowser.tsx:160-161`
disables *every* row's Join button off a single `busy` flag with no indication of
which row you clicked. This is the same defect the author already fixed for the
two main buttons — `lastAction` at `CompeteEntryScreen.tsx:167` exists precisely
because "both buttons reported progress at once and the user could not tell which
action was actually in flight." The rail never got that treatment. Pass
`joiningCode?: string | null` and show a spinner on that row only.

**4.4 Distinguish "connecting" from "no rooms".** `useRoomDirectory` returns
`{ rooms }` and nothing else (`useRoomDirectory.ts:116`), so during the Realtime
subscribe window `rooms` is `[]` and `RoomBrowser.tsx:111` confidently renders
"No active public rooms right now" — reporting an empty arena when it has not
finished asking. Expose the `readyRef` state already tracked at
`useRoomDirectory.ts:39` as a `connected` boolean and render three skeleton rows
until it flips.

Deliberately **not** included: an ambient "N players online" counter. Presence is
only tracked by clients that are advertising a room
(`useRoomDirectory.ts:87` calls `ch.track()` only when `publishRef.current` is
non-null), so a live headcount would require every client to track a presence
payload — a realtime protocol change, which section 0 puts out of scope. Say the
word and it becomes its own plan.

Also not included: a `cmdk` command palette. `cmdk@1.1.1` is installed and
unused, and the older plan scopes it, but a palette is app-wide navigation
furniture and belongs to that plan, not to one screen.

## 5. Files touched

| File | Change |
| --- | --- |
| `src/components/CompeteEntryScreen.tsx` | Header to one row; drop internal scroll; sticky actions; elevation tiers; purple → `theme`; OTP input; recent-room chips; motion imports |
| `src/components/QuickMatchPanel.tsx` | `useReducedMotion`; shared motion; tier-2 surface; kill infinite bob under reduce |
| `src/components/RoomBrowser.tsx` | `useReducedMotion`; shared motion; tier-3 `.glass-card`; remove `max-h` scroll; `joiningCode` prop; skeletons |
| `src/components/RankedHistoryPanel.tsx` | `useReducedMotion`; shared motion; tier-3 `.glass-card`; static empty state under reduce |
| `src/hooks/useRoomDirectory.ts` | Return `connected` |
| `src/App.tsx` | Drop `xl:h-full` at `:1660`; pass `joiningCode` to `RoomBrowser` |
| `src/lib/motion.ts` | Moved from `components/profile/profileMotion.ts`, re-exported from the old path |
| `src/hooks/useRecentRooms.ts` | New. `localStorage`-backed recent codes |

## 6. Verification

**Gap to flag first.** `GEMINI.md` opens by requiring that UI verification means
visual browser verification via a browser subagent, with screenshots, and states
that code review alone does not count. This session has no browser tool available,
so I cannot satisfy that rule myself. Two options: run `npm run dev` and check the
screen yourself against the checklist below, or I install Playwright and drive a
headless Chromium — a ~130MB download, so your call.

**Baseline, measured — not assumed.** Both toolchain checks did run (PowerShell,
not bash), so the numbers below are the real starting state rather than an
estimate:

| Check | Result |
| --- | --- |
| `npx tsc -b` | exit 0, no output |
| `npx eslint .` | 632 errors / 6 warnings repo-wide |
| …of which under `src/` | **45 errors** across 24 files |

The 632 figure is misleading and should not be used as the gate: 587 of those
errors are in `.agents/**` scratch harnesses (`.mjs`/`.cjs` files using
`require`, `module`, `__dirname` under a browser-globals config) and
`scripts/generatePngIcons.js`. Only the 45 `src/` errors are meaningful. Gate on
per-file eslint runs for the touched files, not on the repo total.

Per-file baseline for the files this plan edits:

| File | Baseline |
| --- | --- |
| `src/components/CompeteEntryScreen.tsx` | clean |
| `src/components/RoomBrowser.tsx` | clean |
| `src/components/RankedHistoryPanel.tsx` | clean |
| `src/hooks/useRoomDirectory.ts` | clean |
| `src/components/profile/profileMotion.ts` | clean |
| `src/components/QuickMatchPanel.tsx` | **1 pre-existing error** |
| `src/App.tsx` | **3 pre-existing errors** |

Two of those need a decision before the work starts, because both sit in files
this plan touches and would otherwise look like regressions introduced by it:

- `QuickMatchPanel.tsx:58` — `react-hooks/set-state-in-effect`, from the
  `setNow(Date.now())` that primes the elapsed-time ticker. Confirmed pre-existing
  by reading `git show HEAD:src/components/QuickMatchPanel.tsx` — identical code at
  line 56 of the committed version. Section 3 already rewrites this component's
  motion, so fixing it is nearly free: derive the initial value with
  `useState(() => Date.now())` on the `searching` transition instead of writing
  state from the effect body. **Recommend fixing it in commit 1.**
- `App.tsx:1251-1258` — three `react-hooks/refs` errors from `prevStagePageRef`
  being read during render. Unrelated to this screen and outside its scope; this
  plan's `App.tsx` edit is two lines (drop `xl:h-full`, pass `joiningCode`).
  **Recommend leaving these alone** and treating 3 as the expected post-change
  count.

`src/hooks/useRace.ts` also carries 2 pre-existing errors (`_isRanked` unused,
lines 635 and 644). This plan does not touch that file; noted so the 5-error
`App.tsx`+`useRace.ts` figure from earlier sessions still reconciles.

So the post-change gate is: `npx tsc -b` exits 0; the five clean files stay clean;
`QuickMatchPanel.tsx` goes to 0 (if the fix above is taken) or stays at 1;
`App.tsx` stays at 3; `npm run build` succeeds.

Manual checklist for whoever has the browser:

1. At 1920×1080 and at 1280×800, scroll the cockpit — exactly one scrollbar moves.
2. Create room and Join room are both visible at load without scrolling.
3. Enable "reduce motion" at the OS level, reload: no entrance animations, no hover
   lift, no bobbing Quick Match icon, no pulsing empty-state text. Spinners still spin.
4. Set a non-purple wallpaper accent in Auto-Fetch mode: the Join card matches the
   Host card. No purple survives except intentional semantics.
5. Click Join on one row of a populated room list: only that row shows progress.
6. Hard-reload with a populated directory: skeletons appear before rooms, never
   "No active public rooms".
7. Tab through the whole screen: every stop shows a visible focus ring, including
   each of the six code boxes.

## 7. Sequencing

Three commits, each independently revertable:

1. **Motion consolidation** (section 3). Pure refactor, no visual change except
   under `prefers-reduced-motion`. Lowest risk, highest cleanup value — do it first
   so the layout work lands on one vocabulary rather than four. Fold the
   `QuickMatchPanel.tsx:58` lint fix from section 6 into this commit: it is in the
   same component and the same `useEffect` the motion rewrite already touches.
2. **Layout restructure** (section 2). The visible change. Verify against the
   checklist before moving on.
3. **Features** (section 4), in order 4.4 → 4.3 → 4.1 → 4.2. The hook change and
   the row-feedback fix are small and self-contained; the OTP input is the largest
   single edit and benefits from landing last.

Every file/line citation in this plan was read from source this session, not
carried from an earlier summary. The `profileMotion.ts` → `src/lib/motion.ts`
move in section 3 has exactly two importers to worry about —
`ProfileCustomizationMenu.tsx:34` and `OperatorDossier.tsx:63` — so the
re-export shim is a two-line safety net rather than a broad migration.
