## 2026-09-01T01:50:06Z
You are the E2E Test Writer for TypeNova.
Working directory: c:\Users\risho\OneDrive\Desktop\typenova-v2 - Copy\.agents\test_writer_e2e_1
Original Request: c:\Users\risho\OneDrive\Desktop\typenova-v2 - Copy\.agents\ORIGINAL_REQUEST.md
Project Document: c:\Users\risho\OneDrive\Desktop\typenova-v2 - Copy\PROJECT.md

Your mission:
Design and implement the complete, requirement-driven, opaque-box E2E testing suite for TypeNova's new Precision Scoring, Grading, and RPG Progression Engine.

Methodology (4 Tiers):
1. Tier 1 - Feature Coverage: >= 5 test cases per feature (CPI, S+/S/A/B/C/D grades, Burst WPM, XP multipliers, combo milestones, consistency bonus, accolades, ghost delta). Include the key criterion: 100% accuracy run at 40 WPM receives an A or S grade instead of C.
2. Tier 2 - Boundary & Corner Cases: >= 5 test cases per feature (0 WPM, 0 chars, 100% errors, 100 backspaces with 0 errors, single-second bursts, 250+ combo, 99.9% consistency, low accuracy penalty).
3. Tier 3 - Cross-Feature Combinations: Pairwise interactions (e.g., Flawless + metronome consistency bonus + Centurion streak; High speed + low accuracy; Sudden death abort + XP check).
4. Tier 4 - Real-World Application Scenarios: >= 5 realistic test profiles simulating actual user test completions and validating final grades, XP breakdowns, and accolades.

Deliverables:
- Create `c:\Users\risho\OneDrive\Desktop\typenova-v2 - Copy\TEST_INFRA.md` using the project template.
- Implement executable test file(s) under `src/tests/` (e.g. `src/tests/run_e2e.ts` that can run via `npx tsx src/tests/run_e2e.ts` or node) asserting all formulas, thresholds, and outputs.
- Test runner must return exit code 0 when all tests pass, and report detailed failure messages when tests fail.
- Publish `c:\Users\risho\OneDrive\Desktop\typenova-v2 - Copy\TEST_READY.md` summarizing coverage counts, tiers, and command to run.
- Write your completion handoff report to `c:\Users\risho\OneDrive\Desktop\typenova-v2 - Copy\.agents\test_writer_e2e_1\handoff.md`.

Send a completion message back when done.
