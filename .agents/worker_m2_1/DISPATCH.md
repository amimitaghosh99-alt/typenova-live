## 2026-09-01T02:31:18Z

You are the Implementation Worker for Milestone 2 (RPG Progression & Precision Multipliers).
Working directory: c:\Users\risho\OneDrive\Desktop\typenova-v2 - Copy\.agents\worker_m2_1
Original Request: c:\Users\risho\OneDrive\Desktop\typenova-v2 - Copy\.agents\ORIGINAL_REQUEST.md
Project Document: c:\Users\risho\OneDrive\Desktop\typenova-v2 - Copy\PROJECT.md
Explorer Survey 2 Report: c:\Users\risho\OneDrive\Desktop\typenova-v2 - Copy\.agents\explorer_survey_2\handoff.md

Your exclusive write ownership:
- `src/hooks/useRPGSystem.ts`
- `src/data/constants.ts`
- `src/data/titles.ts`

Tasks:
1. In `src/hooks/useRPGSystem.ts`:
   - Import `calculateXPProgression`, `type XpBreakdown` from `src/lib/scoringEngine.ts`.
   - Export `XpBreakdown` interface from `useRPGSystem.ts` (or re-export).
   - Add `xpBreakdownLast` state: `const [xpBreakdownLast, setXpBreakdownLast] = useState<XpBreakdown | null>(null);`.
   - In `processRPG`, accept `consistency?: number` and `rawErrors?: number`.
   - Use `calculateXPProgression` to compute `XpBreakdown` (base XP, +50% flawless bonus for 100% acc, combo milestone multipliers at 50+/100+/200+, consistency bonus for >=85%).
   - Store `xpBreakdownLast` and return `{ newXp, newTestsCompleted, updatedHeatmap, newBestCombo, xpBreakdown }`.
   - Update `checkAchievements` to evaluate new precision/combo achievements.
   - Expose `xpBreakdownLast` in the hook return object.
2. In `src/data/constants.ts`:
   - Add new precision achievements to `ACHIEVEMENTS`:
     - `centurion_streak`: "Centurion" (100+ combo)
     - `flow_state`: "Flow State" (>=85% consistency & >=95% accuracy)
     - `surgical_precision`: "Surgical Precision" (50+ words with 100% accuracy)
3. In `src/data/titles.ts`:
   - Add title badges:
     - `centurion`: "Centurion" (100+ flawless combo in any test)
     - `flow_master`: "Flow Master" (Average consistency >= 85%)
4. Verify execution:
   - `npx tsx src/tests/run_e2e.ts` (All 129 tests must pass)
   - `npm run build` (Exit code 0)
5. Write your complete handoff report to:
   `c:\Users\risho\OneDrive\Desktop\typenova-v2 - Copy\.agents\worker_m2_1\handoff.md`
