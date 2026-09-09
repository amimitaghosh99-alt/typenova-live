## 2026-09-01T02:19:12+05:30
You are the Remediation Worker for Milestone 1 (Iteration 2).
Working directory: c:\Users\risho\OneDrive\Desktop\typenova-v2 - Copy\.agents\worker_m1_2
Original Request: c:\Users\risho\OneDrive\Desktop\typenova-v2 - Copy\.agents\ORIGINAL_REQUEST.md
Project Document: c:\Users\risho\OneDrive\Desktop\typenova-v2 - Copy\PROJECT.md
Challenger Report to read: c:\Users\risho\OneDrive\Desktop\typenova-v2 - Copy\.agents\challenger_m1_1\handoff.md

Your exclusive write ownership:
- `src/lib/scoringEngine.ts`
- `src/tests/scoringOracle.ts`

Tasks:
Apply the 4 precise edge-case and sanitization fixes identified by Challenger 1 in `src/lib/scoringEngine.ts` and mirror them in `src/tests/scoringOracle.ts`:
1. In `calculateXPProgression`: Use `Math.round(baseXp * (1 + totalBonusPct / 100))` (or `Math.round(baseXp * totalMultiplier)`) instead of `Math.floor` to prevent IEEE-754 binary underflow on multiplier stacking (e.g. `200 * 2.3 = 459.99999999999994` rounding to 460).
2. In `calculateXPProgression`: Sanitize `wpm`, `accuracy`, and `targetLength` inputs using `Number.isFinite` before relational checks so `NaN` does not bypass the early exit check.
3. In `calculateBurstWpm`: Sanitize timeline entries before computing maximum to prevent `NaN` propagation from timeline points.
4. In `calculateCPI`: Sanitize `wpm`, `accuracy`, `flawlessStreak`, `consistency`, and `totalChars` against `Infinity` / `-Infinity` using `Number.isFinite(val) ? val : 0` and clamping safely to [0, 999].
5. Verify that all tests pass:
   - `npx tsx src/tests/run_challenger_stress.ts` (all 22 tests must pass 100%)
   - `npx tsx src/tests/run_e2e.ts` (all 129 tests must pass 100%)
   - `npm run build` (Clean exit code 0)
6. Write your handoff report to `c:\Users\risho\OneDrive\Desktop\typenova-v2 - Copy\.agents\worker_m1_2\handoff.md`.
