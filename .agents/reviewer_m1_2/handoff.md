# Milestone 1 Reviewer 2 Handoff Report: Core Scoring & Grading Engine

**Reviewer Agent**: `reviewer_m1_2`  
**Milestone**: M1 (Core Scoring & Grading Engine)  
**Date**: 2026-09-01  
**Verdict**: **APPROVE**  

---

## 1. Observation

### 1.1 Inspected Files and Code State
1. **`src/lib/scoringEngine.ts`**:
   - `PerformanceGrade`: `'S+' | 'S' | 'A' | 'B' | 'C' | 'D'`.
   - `calculateCPI`: Evaluates `wpm`, `accuracy`, `flawlessStreak`, `consistency`, and `totalChars` using non-linear precision scaling `(accuracy / 100)^2`, consistency factor `kCons = 1 + (consistency - 50)/250`, precision bonus (+35 for 100% acc, +20 for >=98%, +10 for >=95%), combo bonus (+15 unbroken, +15 for 200+ streak, +10 for 100+, +5 for 50+), consistency bonus (+5 for >=85%), and low-accuracy progressive penalty (`-20 * (85 - acc)/10` when `acc < 85`).
   - `evaluateGrade`: Properly assigns grades based on composite criteria (`S+`, `S`, `A`, `B`, `C`, `D`). High accuracy (100% accuracy at 40 WPM) produces Grade S or S+ (or A on minimal passages), never C or D.
   - `calculateBurstWpm`: Implements a multi-tier sliding window (5-keystroke cluster, 2-4 keystroke cluster, 1000ms rolling window, and timeline peak fallback), filtering out backspaces and errors, clamping output to `[0, 999]`.
   - `calculateAccolades`: Accurately evaluates the 4 accolade badges (`flawless`, `centurion`, `surgical`, `flow_state`) with metric-specific progress tracking.
   - `calculateXPProgression`: Calculates base XP and multipliers (+50% flawless, up to +50% combo, up to +30% consistency).
   - `calculateGhostDelta`: Computes race time delta in seconds (2 decimals), accuracy delta (1 decimal), consistency delta (1 decimal), streak delta, and `userWon`.
   - `GRADE_DETAILS`: Maps each grade to UI title, description, and dynamic style tokens.

2. **`src/hooks/useTypingEngine.ts`**:
   - Augmented `TypingStats` and `liveStats` with `burstWpm`, `cpi`, `grade`, `cpiBreakdown`.
   - Exposes `burstWpm`, `cpi`, `grade`, `setBurstWpm`, `setCpi`, `setGrade`.
   - Live tick at 500ms intervals updates `calculateStats(..., includeTimeline = false)` without recreating intervals on keypresses.
   - Final evaluation in `finishTestImpl` executes `calculateStats(..., includeTimeline = true)`.

3. **`src/tests/run_e2e.ts` & `src/tests/scoringEngine.test.ts`**:
   - Master test runner includes 33 suites and 129 test cases covering all tier features, boundaries, combinations, and real-world profiles.

### 1.2 Execution Verification Results
- **Command**: `npx tsx src/tests/run_e2e.ts`
  - **Result**: `129/129 passed (100% pass rate)` in 8ms across 33 suites.
- **Command**: `npx tsx src/tests/adversarialScoringStress.ts`
  - **Result**: `537,459 invariant checks executed, 0 violations`.
- **Command**: `npm run build` (`tsc -b && vite build`)
  - **Result**: Exit code 0, built in 21.06s with zero TypeScript errors.

---

## 2. Logic Chain

### 2.1 Verification of Requirement R1 (40 WPM @ 100% Accuracy)
- **Input**: WPM = 40, Accuracy = 100%, Streak = 200, Consistency = 90%, TotalChars = 200.
- **Calculation**:
  - `precisionMultiplier = 1.0`
  - `kCons = 1 + (90 - 50)/250 = 1.16`
  - `weightedSpeed = 40 * 1.0 * 1.16 = 46.4`
  - `precisionBonus = 35`
  - `comboBonus = 15 (unbroken) + 15 (>=200) = 30`
  - `consistencyBonus = 5 (>=85%)`
  - `penalty = 0`
  - `CPI = round(46.4 + 35 + 30 + 5) = 116`
  - `evaluateGrade(116, 100, true, 90)` satisfies `cpi >= 115 && isFlawless && acc >= 98 && cons >= 85` $\rightarrow$ **Grade S+** (or Grade S on shorter passages).
- **Conclusion**: The previous legacy defect where 40 WPM @ 100% accuracy was demoted to Grade C is completely resolved.

### 2.2 Integrity & Anti-Cheating Assessment
- **Hardcoding Check**: No hardcoded test responses or simulated outputs exist in `src/lib/scoringEngine.ts`. All scoring values are computed purely through parameterized mathematical models.
- **Facade Implementations**: All exported functions implement complete algorithms.
- **Bypasses**: No external delegation or cheating shortcuts.
- **Self-Certifying Prevention**: Independently verified against an external 537,000+ iteration invariant stress test covering monotonicity across all four dimensions (WPM, Accuracy, Consistency, Streak).

### 2.3 Edge Case & Numerical Stability Analysis
- Zero inputs (`0 WPM`, `0 Chars`, `NaN` values) return `CPI = 0`, `Grade = 'D'`, `0 XP` safely without exceptions or NaN leaks.
- 0% accuracy runs apply maximum penalty and are strictly demoted to `Grade D` with `0 XP` and all accolades locked.
- Burst WPM sliding window handles 1-keystroke, 2-keystroke, 100-backspace, and zero-interval inputs gracefully.

---

## 3. Caveats

1. **Downstream UI Integration (M2/M3/M4)**:
   - This review covers Milestone 1 (Core Scoring & Grading Engine). Downstream UI components (`ResultsScreen.tsx`, `LiveAccoladePills.tsx`, RPG HUD) will consume these engine exports in subsequent milestones.
2. **Browser Environment Types**:
   - The project uses `tsconfig.app.json` for frontend builds with `types: ["vite/client"]` and strict `noUnusedLocals: true`. Any test scripts added to `src/tests/` must strictly comply with TypeScript compiler rules to ensure `npm run build` stays green.

---

## 4. Conclusion

**Verdict: APPROVE**

The Milestone 1 implementation of the Core Scoring & Grading Engine in `src/lib/scoringEngine.ts` and `src/hooks/useTypingEngine.ts` is mathematically rigorous, fully compliant with Requirement R1, robust under extreme stress testing, free of integrity violations, and clean against production build pipelines.

---

## 5. Verification Method

To independently verify:
```bash
# 1. Master E2E and Scoring Engine Suite (129 tests)
npx tsx src/tests/run_e2e.ts

# 2. Production Build (tsc -b && vite build)
npm run build
```
