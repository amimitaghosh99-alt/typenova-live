# Soft Handoff Report: UI Components, Audio & Visuals Code Review

**Agent**: explorer_2  
**Working Directory**: `c:\Users\risho\OneDrive\Desktop\typenova-v2 - Copy\.agents\explorer_2`  
**Date**: 2026-07-29  

---

## 1. Observation

All 11 target files were inspected using static analysis:
- `src/hooks/useAudioEngine.ts` (81 lines)
- `src/hooks/useParticles.ts` (63 lines)
- `src/components/TypingArea.tsx` (535 lines)
- `src/components/RaceModal.tsx` (486 lines)
- `src/components/RaceResultsScreen.tsx` (411 lines)
- `src/components/ResultsScreen.tsx` (266 lines)
- `src/components/StatsDashboard.tsx` (321 lines)
- `src/components/StatsPanel.tsx` (112 lines)
- `src/components/AccountMenu.tsx` (94 lines)
- `src/components/ChangelogModal.tsx` (101 lines)
- `src/components/SocialModal.tsx` (215 lines)

Key direct observations:
1. `useAudioEngine.ts`: Line 28 defines `const now = ctx.currentTime`. Lines 53, 54, 59, 60, 69 invoke `createOneShot` inside `setTimeout`, which relies on `now` captured in `playSound` closure.
2. `useParticles.ts`: Line 33 uses `id: Math.random()`. Line 43 calls `setParticles` on every spawn.
3. `TypingArea.tsx`: Line 171 triggers `scrollTo({ behavior: 'smooth' })` on every keystroke. Line 183 creates new Map and Array instances for `particlesByIndex` on every particle update. Line 265 lacks `break-words`.
4. `RaceModal.tsx`: Line 97 relies on `autoStartedRef.current`, which is set to `true` on auto-start but never reset to `false` when status changes. Line 167 lacks `max-h-[90vh] overflow-y-auto`.
5. `RaceResultsScreen.tsx`: Line 245 uses `...resultsProps` in `useMemo` dependency array, creating a new object identity every render. Line 114 `syncElo` async polling loop lacks unmount checks.
6. `ResultsScreen.tsx`: Line 78 has uncleaned `setTimeout`. Line 179 uses `marginLeft: i * 20`. Line 92 calls `k.expected.toUpperCase()` without null check on `k.expected`.
7. `StatsDashboard.tsx`: Lines 37-38 parse `key.split(':')` without validating length before calling `cfg.startsWith('t')`. Line 126 uses `min-w-[600px]`.
8. `StatsPanel.tsx`: Lines 32-55 recalculates SVG polyline points on every render without `useMemo`.

---

## 2. Logic Chain

1. **Audio Distortion Logic**: In `useAudioEngine`, capturing `now` at function call time rather than callback execution time means delayed notes are scheduled with an AudioContext timestamp in the past. Web Audio API immediately triggers scheduled nodes that have past timestamps, destroying arpeggiated timing and causing audio clipping.
2. **React Rendering Performance**: Component memoization (`React.memo`) relies on referential equality. Passing newly allocated array references (such as `particlesByIndex.get(index) ?? []` in `TypingArea` or destructured `restProps` in `RaceResultsScreen`) causes memoized child components (`Char`, `ResultsScreen`) to re-render completely on every single parent render or particle update.
3. **Multiplayer Race Stalling**: Mutating refs like `autoStartedRef.current = true` to guard one-time auto-start actions without resetting the ref when a new room/match starts causes the guard condition to block all future matches while the component remains mounted.
4. **Layout & Responsiveness**: Combining hardcoded pixel offsets (`marginLeft: i * 20`, `min-w-[600px]`) with modal containers that lack vertical max-height scrolling (`max-h-[90vh] overflow-y-auto`) guarantees visual clipping on viewports under 600px wide or low vertical heights.

---

## 3. Caveats

- **Runtime Execution**: Findings are based strictly on static code analysis. Audio API timing and browser layout engine reflow behaviors were validated logically against browser standards, but not measured with profiling tools in a live browser session.
- **Backend Integrations**: Ranked duel RPC functions (`resolve_ranked_duel`) and Supabase table schemas (`profiles`, `friends`) were verified from client-side RPC calls only; backend database functions were outside the scope.

---

## 4. Conclusion

A total of 15 distinct issues (6 Logic, 5 UI, 4 Performance) were identified across the 11 target files. All issues have concrete, actionable proposed fixes documented in `analysis.md`. Address the high-severity logic bugs (`autoStartedRef` state stall in `RaceModal`, audio timestamp calculation in `useAudioEngine`, and unmounted state updates in `RaceResultsScreen`) first before optimizing re-render performance.

---

## 5. Verification Method

1. **Static Analysis & Build Verification**:
   - Run TypeScript type checking (`npx tsc --noEmit` or `npm run build`) to ensure all proposed fixes preserve type safety.
2. **Audio Verification**:
   - Trigger level-up and achievement audio effects in `useAudioEngine.ts` and verify that notes play sequentially without clipping or instantaneous firing.
3. **Race Room Verification**:
   - Play two consecutive ranked 1v1 matches in `RaceModal.tsx` to verify that auto-start fires reliably on the second match without getting stuck in the lobby.
4. **Performance Verification**:
   - Profile `TypingArea.tsx` rendering using React Developer Tools Profiler during fast typing to verify `<Char>` memoization holds and particle updates do not re-render unaffected character nodes.
