# Milestone 1 Challenger Handoff Report: Core Scoring & Grading Engine

**Challenger Agent**: `challenger_m1_1`  
**Milestone**: M1 (Core Scoring & Grading Engine)  
**Date**: 2026-09-01  
**Verdict**: **REQUEST_CHANGES**  

---

## 1. Observation

Adversarial stress testing was executed on `src/lib/scoringEngine.ts` via the empirical stress harness `src/tests/challenger_m1_stress.test.ts` using `npx tsx src/tests/run_challenger_stress.ts`.

### 1.1 Test Execution Results
Command executed:
```bash
npx tsx src/tests/run_challenger_stress.ts
```
Result: **18 tests passed, 4 tests failed across 5 suites (52ms)**.

```
▶ Suite: Challenger M1 - Chaos & Poison Input Ingestion (NaN, Infinity, Negative)
  ✖ handles all combinations of NaN, Infinity, -Infinity in calculateCPI without throwing or producing NaN (7ms)
    Error: Expected true, but got false (isFinite check failed on Infinity)
  ✔ handles NaN, Infinity, -Infinity in evaluateGrade safely without throwing (1ms)
  ✖ handles poisoned inputs in calculateBurstWpm safely (0ms)
    Error: Expected false, but got true (isNaN check failed: burst was NaN)
  ✖ handles poisoned inputs in calculateXPProgression safely (0ms)
    Error: Expected false, but got true (isNaN check failed: totalXp was NaN)
  ✔ handles poisoned inputs in calculateGhostDelta safely (1ms)

▶ Suite: Challenger M1 - Chaotic Keystroke Streams & Burst WPM Jitter
  ✔ handles 100% backspace storm without crash or false burst speed (0ms)
  ✔ handles 100% error storm without crash or false burst speed (0ms)
  ✔ handles zero-duration / identical timestamps (instant paste) without division by zero (0ms)
  ✔ handles reversed / out-of-order timestamps gracefully without negative burst (0ms)
  ✔ handles sub-millisecond hyper-speed cluster clamping to 999 WPM max (0ms)
  ✔ processes massive 10,000 keystroke stream in sub-10ms without lag (6ms)

▶ Suite: Challenger M1 - Core Scoring R1 Verification & Precision Monotonicity
  ✔ VERIFIES R1: 40 WPM @ 100% Accuracy receives S/S+ (never C or D) across wide parameter ranges (1ms)
  ✔ enforces Grade Monotonicity: increasing CPI never downgrades performance grade (1ms)
  ✔ enforces Accuracy Grade Monotonicity: higher accuracy never downgrades performance grade (1ms)
  ✔ applies strict low-accuracy penalty barrier preventing Grade D bypass (0ms)

▶ Suite: Challenger M1 - Accolades & RPG Progression Invariants
  ✔ strictly locks Flawless badge on single error even with 99.9% accuracy (0ms)
  ✔ strictly locks Flawless badge on 0 streak even with 100% accuracy (0ms)
  ✔ accurately requires >= 100 streak for Centurion badge (0ms)
  ✔ requires >= 98% accuracy AND (>= 50 words OR >= 200 streak) for Surgical badge (0ms)
  ✖ strictly calculates XP progression multiplier stacking without floating point drift (0ms)
    Error: Expected 460, but got 459
  ✔ rewards zero XP when drill mode is active (0ms)

▶ Suite: Challenger M1 - 10,000 Randomized Monte Carlo Trials
  ✔ executes 10,000 randomized typing runs with zero NaN, zero crashes, and strictly valid grades (24ms)
```

---

## 2. Logic Chain

### 2.1 Bug 1: IEEE 754 Floating-Point Precision Loss in `calculateXPProgression`
- **Observation**:
  In `src/lib/scoringEngine.ts:458`:
  ```typescript
  const totalXp = Math.floor(baseXp * (1 + totalBonusPct / 100));
  ```
  When `baseXp = 200` and `totalBonusPct = 130` (flawless +50%, 200+ combo +50%, flow +30%):
  `1 + 130/100 = 2.3`.
  In IEEE 754 floating-point arithmetic: `200 * 2.3 = 459.99999999999994`.
  `Math.floor(459.99999999999994)` truncates to `459` instead of awarding the exact `460` XP.
- **Impact**: Players lose 1 XP on milestone bonus runs due to binary rounding underflow.
- **Required Fix**: Change `Math.floor(...)` on line 458 to `Math.round(baseXp * (1 + totalBonusPct / 100))` or `Math.round(baseXp * totalMultiplier)`.

### 2.2 Bug 2: Relational Comparison Bypass with `NaN` in `calculateXPProgression`
- **Observation**:
  In `src/lib/scoringEngine.ts:420`:
  ```typescript
  if (wpm <= 10 || accuracy <= 50 || isDrill || targetLength <= 0)
  ```
  In JavaScript, `NaN <= 10`, `NaN <= 50`, and `NaN <= 0` all evaluate to `false`.
  When `wpm`, `accuracy`, or `targetLength` is `NaN`, this early exit check is bypassed.
  `baseXp` evaluates to `NaN` and `totalXp` evaluates to `NaN`.
- **Impact**: Passing uninitialized or `NaN` stats causes `totalXp` to become `NaN`, polluting user progress state and local storage.
- **Required Fix**: Validate and sanitize input parameters at the start of `calculateXPProgression`:
  ```typescript
  const safeWpm = Math.max(0, isNaN(wpm) || !isFinite(wpm) ? 0 : wpm);
  const safeAcc = Math.min(100, Math.max(0, isNaN(accuracy) || !isFinite(accuracy) ? 0 : accuracy));
  const safeLen = Math.max(0, isNaN(targetLength) || !isFinite(targetLength) ? 0 : targetLength);
  if (safeWpm <= 10 || safeAcc <= 50 || isDrill || safeLen <= 0) { ... }
  ```

### 2.3 Bug 3: `NaN` Propagation via `Math.max` in `calculateBurstWpm` Timeline Fallback
- **Observation**:
  In `src/lib/scoringEngine.ts:257` and `308`:
  ```typescript
  return Math.max(0, ...timeline.map(t => Math.round(t.rawWpm ?? t.wpm ?? 0)));
  ```
  If any timeline point has `rawWpm: NaN` or `wpm: NaN` (which can happen during live engine ticking before keystrokes are recorded), `Math.max(0, NaN, ...)` evaluates to `NaN`.
- **Impact**: `calculateBurstWpm` returns `NaN`, causing live stats and post-test results to display `NaN WPM`.
- **Required Fix**: Sanitize timeline entries before computing maximum:
  ```typescript
  if (timeline && timeline.length > 0) {
    const validTimeline = timeline
      .map(t => t.rawWpm ?? t.wpm ?? 0)
      .filter(v => typeof v === 'number' && !isNaN(v) && isFinite(v));
    if (validTimeline.length > 0) {
      const timelineMax = Math.max(0, ...validTimeline.map(v => Math.round(v)));
      if (timelineMax > peakBurst) peakBurst = timelineMax;
    }
  }
  ```

### 2.4 Bug 4: Unbounded `Infinity` in `calculateCPI`
- **Observation**:
  In `src/lib/scoringEngine.ts:169-173`:
  ```typescript
  const safeWpm = Math.max(0, isNaN(wpm) ? 0 : wpm);
  ```
  In JavaScript, `isNaN(Infinity)` is `false`. If `wpm` is `Infinity` (e.g. from division by zero duration `(chars/5) / 0`), `safeWpm = Infinity`, `weightedSpeed = Infinity`, and `cpi = Infinity`.
- **Impact**: Produces non-finite CPI scores.
- **Required Fix**: Clamp `safeWpm` using `!isFinite(wpm) ? 0 : wpm` or clamp to `[0, 999]`.

---

## 3. Caveats

1. **R1 Scoring Parity Verified**:
   - The core requirement (40 WPM with 100% accuracy evaluating to S/S+, never C or D) is mathematically sound and verified across wide parameter ranges.
2. **Grade Monotonicity Verified**:
   - The grade tier hierarchy (`D < C < B < A < S < S+`) is strictly monotonic. Increasing CPI or Accuracy never results in an anomalous grade demotion.
3. **Chaotic Keystroke Resilience Verified**:
   - Backspace storms, error bursts, identical timestamps (paste actions), out-of-order timestamps, and 10,000+ keystroke streams are processed safely without crashing.

---

## 4. Conclusion

Verdict: **REQUEST_CHANGES**

The core scoring formulas and grade hierarchy are well-designed and satisfy Requirement R1, but the 4 identified numerical stability and sanitization bugs must be fixed in `src/lib/scoringEngine.ts` and mirrored in `src/tests/scoringOracle.ts`:
1. Fix `Math.floor` floating-point precision truncation in `calculateXPProgression`.
2. Sanitize `NaN`/non-finite inputs before relational checks in `calculateXPProgression`.
3. Filter `NaN`/non-finite values out of `timeline` mapping in `calculateBurstWpm`.
4. Guard against `Infinity` inputs in `calculateCPI`.

---

## 5. Verification Method

To verify these findings and confirm subsequent fixes:
```bash
# 1. Run Challenger 1 Adversarial Stress Test Suite
npx tsx src/tests/run_challenger_stress.ts

# 2. Run Full E2E Test Runner
npx tsx src/tests/run_e2e.ts

# 3. Verify TypeScript build
npm run build
```
In clean state after fixes, `npx tsx src/tests/run_challenger_stress.ts` must pass all 22 tests (100% pass rate).
