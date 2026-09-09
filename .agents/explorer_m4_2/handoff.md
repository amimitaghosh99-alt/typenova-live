# Handoff Report — Explorer 2 (Milestone 4)

## 1. Observation
- `src/lib/scoringEngine.ts`:
  - Lines 416–423 define `XpBreakdown` (`baseXp`, `flawlessBonusPct`, `comboBonusPct`, `consistencyBonusPct`, `totalMultiplier`, `totalXp`).
  - Lines 428–490 define `calculateXPProgression(wpm, accuracy, flawlessStreak, consistency, targetLength, isDrill)`.
  - Lines 492–526 define `calculateGhostDelta(userFinishMs, userAcc, userCons, userStreak, ghostFinishMs, ghostAcc, ghostCons, ghostStreak)` returning `GhostDeltaResult { deltaS, deltaAcc, deltaCons, deltaStreak, userWon }`.
- `src/hooks/useRPGSystem.ts`:
  - Lines 42, 114–125, 247: `xpBreakdownLast` state is maintained, computed on `processRPG`, and returned in the hook return object.
- `src/App.tsx`:
  - Lines 1084–1089: `rpg.processRPG` is called with only 8 parameters, omitting `consistency` and `rawErrors`.
  - Lines 1129–1137: `rpg.checkAchievements` is called without `stats.consistency`.
  - Lines 1116–1126: PB Ghost stored in `localStorage` under `pbStorageKey` only stores `wpm` and `samples`, omitting accuracy, consistency, and flawless streak.
  - Lines 1522–1560: Computes `ghostDeltaS` only; does not invoke `calculateGhostDelta` to compute `ghostDeltaAcc`, `ghostDeltaCons`, or `ghostDeltaStreak`.
  - Lines 1562–1588: `resultsProps` omits `xpBreakdown: rpg.xpBreakdownLast` and ghost precision delta fields.
- `src/hooks/useModeLeaderboard.ts`:
  - Lines 25–30: `RivalGhost` interface omits `accuracy` and `consistency`.
  - Lines 59–80: `fetchRivalGhost` query only selects `username, wpm, ghost` instead of including `accuracy, consistency`.
- `src/components/ResultsScreen.tsx`:
  - Lines 10–40: `ResultsScreenProps` omits `xpBreakdown`, `ghostDeltaAcc`, `ghostDeltaCons`, `ghostDeltaStreak`.
  - Lines 174–178: Only renders a simple `+{xpGainedLast} XP` text badge without breakdown.
  - Lines 181–191: Only renders `ghostDeltaS` in a single line chip.

## 2. Logic Chain
1. `scoringEngine.ts` already provides pure algorithms for both `calculateXPProgression` and `calculateGhostDelta`.
2. In order for `ResultsScreen.tsx` to render the interactive XP Multiplier Breakdown, it needs the `XpBreakdown` object.
3. Passing `xpBreakdown: rpg.xpBreakdownLast` through `resultsProps` in `App.tsx` guarantees that the Results Screen receives the exact breakdown used to calculate progression.
4. Correcting the parameters passed to `rpg.processRPG` and `rpg.checkAchievements` in `App.tsx` ensures that consistency bonuses (+20%, +30%) and Flow State achievements actually trigger during gameplay.
5. In order to display `ΔAcc`, `ΔCons`, and `ΔStreak` when racing Ghost Net rivals, `fetchRivalGhost` in `useModeLeaderboard.ts` must query `accuracy` and `consistency` from the `mode_scores` table, and `App.tsx` must pass these into `calculateGhostDelta`.
6. For Personal Best ghosts, storing `accuracy`, `consistency`, and `flawlessStreak` in `localStorage` allows PB races to display the same rich precision deltas.
7. Following `GEMINI.md` dynamic theme binding rules (`style={{ color: rgb(${theme.glowPrimary}), backgroundColor: rgba(${theme.glowPrimary}, 0.15), borderColor: rgba(${theme.glowPrimary}, 0.4) }}`) guarantees consistent styling under Auto-Fetch and custom themes.

## 3. Caveats
- Legacy ghosts stored in Supabase or localStorage prior to this update may lack `accuracy` or `consistency`. The implementation in `scoringEngine.ts` and `ResultsScreen.tsx` cleanly guards against this with `typeof ghostDeltaAcc === 'number'` checks, omitting unavailable deltas rather than displaying `NaN`.
- In custom text mode or drill mode, XP progression is disabled (`totalXp = 0`). The XP breakdown card is conditionally rendered when `totalXp > 0`.

## 4. Conclusion
The technical architecture for Milestone 4 (XP Breakdown & Ghost Net Precision Deltas) is fully specified and ready for implementation by the worker agent. Complete, verified code snippets and component structures are documented in `.agents/explorer_m4_2/report.md`.

## 5. Verification Method
1. Inspect files:
   - `.agents/explorer_m4_2/report.md`
   - `src/components/ResultsScreen.tsx`
   - `src/hooks/useRPGSystem.ts`
   - `src/hooks/useModeLeaderboard.ts`
   - `src/App.tsx`
2. Test command:
   - `npx tsx src/tests/run_e2e.ts` (Validates Tier 1 Feature 4, 5, 6, 8 tests for XP progression and Ghost deltas).
   - `npm run build` (Ensures zero TypeScript compiler errors).
