# Handoff Report — Explorer 3 (Milestone 1)

## 1. Observation
- Direct code audit of `src/App.tsx` (lines 1–2081) revealed multiple inline callback allocations, inline array mappings, and object literal recalculations:
  - **Inline Callbacks**:
    - `AccountMenu` props `onSignIn` and `onSignOut` (lines 1764–1765) pass inline arrow functions `() => { void auth.signInWithGoogle(); }` and `() => { void auth.signOut(); }`.
    - `TypingController` props `onUnlockGodMode` (line 1085) passes inline `() => setShowGodMode(true)`. `exitMicroDrill` (lines 692–695) is unmemoized.
    - `SegmentedControl` props `onChange` and `onLockedClick` (lines 1428–1429, 1463, 1517) pass inline arrow functions.
    - `ResultsScreen` / `RaceResultsScreen` / `AIDrillResultsScreen` props `onReset`, `onWatchReplay`, `onStartMicroDrill`, `onRetry`, `onRematch`, `onLeaveRace`, `onUpdateElo` (lines 1002–1004, 1023–1025, 1052) pass inline functions or reference unmemoized helpers (`startMicroDrill`, `launchDrill`).
    - `AIChatBot` prop `onClose` (line 2044) passes inline `() => setIsAruOpen(false)`.
    - `SettingsModal` props `selectTheme`, `selectSoundProfile`, `setThemeFont` (lines 1903–1906) pass unmemoized functions or inline arrows.
  - **Inline Array Allocations**:
    - Difficulty options (line 1422): `(["NOVICE", ...]).map(...)` allocates a new array of 6 objects every render.
    - Word/Duration options (line 1459): `(game.testMode === 'time' ? [15, 30, 60] : [...]).map(...)` allocates a new array of objects every render.
    - Code Language options (line 1512): `CODE_LANGUAGES.map(...)` allocates a new array of objects every render.
    - `TypingArea` prop `racePlayers` (line 1610): `raceActive ? race.players.filter(p => p.id !== race.selfId) : undefined` runs `.filter()` and creates a new array every render.
  - **Inline Object Allocation Thrashing**:
    - `aruStats` (lines 645–652): `useMemo` includes `typing.wpm` and `typing.accuracy`, which change on every single keystroke during active typing, producing a new object reference on every frame and breaking `React.memo` on `AIChatBot`.
    - `resultsProps` (lines 984–1007): constructed unconditionally at top level of render before phase checks.

## 2. Logic Chain
1. Passing inline arrow functions or unmemoized callback references to child components creates a new function object reference on every render of `MainApp`.
2. Even when child components are wrapped in `React.memo` (Milestone 1 requirement #3), shallow prop equality comparison detects changed function/array/object references (`prevProps.onSignIn !== nextProps.onSignIn`), causing the child component to re-render.
3. During active typing playback, `MainApp` renders on every keystroke to update input/stats. Re-rendering child components (`AccountMenu`, `SegmentedControl`, `AIChatBot`, `TypingArea`) on every keystroke degrades framerate and creates micro-stutter.
4. Wrapping all callbacks in `useCallback`, pre-allocating static options arrays (`TIME_OPTIONS`, `WORD_OPTIONS`, `CODE_LANGUAGE_OPTIONS`), memoizing dynamic arrays (`levelOptions`, `otherRacePlayers`), and freezing `aruStats` during active typing ensures that prop references remain identical across keystroke renders, enabling `React.memo` to block re-renders of the sub-tree.

## 3. Caveats
- `handleReset` in `App.tsx` depends on `typing`, `rpg`, `particles`, `race`, and `game.configRef`. It is already wrapped in `useCallback`. Care must be taken not to break `handleResetRef` when stabilizing callback references.
- `aruStats` needs WPM/accuracy when the test finishes or when Aru drawer is opened, but should remain static during active typing (`typing.phase === 'TYPING'`).

## 4. Conclusion
All inline callback allocations, inline array mappings, and object literal thrashings in `src/App.tsx` have been identified and formulated into exact `useCallback`, `useMemo`, and pre-allocation fixes. A complete report has been written to `m1_explorer_report.md`.

## 5. Verification Method
1. Inspect `m1_explorer_report.md` for exact code diff strategies.
2. After implementer applies the changes:
   - Run `npx tsc --noEmit` to verify type safety.
   - Run `npm run build` to verify clean build.
   - Use React DevTools Profiler during continuous typing to confirm 0 re-renders on `AccountMenu`, `SegmentedControl`, `AIChatBot`, and `TypingArea` child boundaries.
