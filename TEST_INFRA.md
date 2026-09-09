# TypeNova Precision Scoring & Progression Test Infrastructure

## Overview
TypeNova's E2E test harness provides a multi-tier, requirement-driven, opaque-box verification suite for the **Composite Performance Index (CPI)**, **S+/S/A/B/C/D Performance Grading Engine**, **Burst WPM Engine**, **Precision & Streak RPG Progression Multipliers**, **Accolades Engine**, and **Ghost Net Rival Differential Comparison**.

---

## Test Architecture & Directory Structure

All test suite files reside under `src/tests/`:

```
src/tests/
├── types.ts                   # Interfaces for scoring, grades, accolades, XP breakdowns & ghost deltas
├── scoringOracle.ts           # Authoritative mathematical reference oracle derived from specifications
├── testHarness.ts             # Lightweight, zero-dependency test runner & assertion framework
├── tier1_features.test.ts     # Tier 1: Feature Coverage (>= 5 test cases per feature)
├── tier2_boundaries.test.ts   # Tier 2: Boundary & Corner Cases (zero values, extremes, errors)
├── tier3_combinations.test.ts # Tier 3: Cross-Feature Combinations (pairwise & multi-way interactions)
├── tier4_realworld.test.ts    # Tier 4: Real-World Application Scenarios (user test profiles)
└── run_e2e.ts                 # Master test execution entry point (exits with code 0/1)
```

---

## The 4 Test Tiers

### Tier 1: Feature Coverage (>= 5 Test Cases per Feature)
- **CPI Formulation**: Base speed scoring, precision tier bonuses (+10%, +20%, +35%), combo milestone bonuses, rhythm consistency multiplier ($K_{\text{cons}} \in [0.80, 1.20]$), flow state bonus (+5), and progressive low accuracy penalty.
- **Multi-Factor Grading (S+, S, A, B, C, D)**: Validates all grade thresholds and the **critical criterion**: 100% accuracy run at 40 WPM receives an **A or S** grade instead of C.
- **Burst WPM Engine**: 5-keystroke rolling window velocity, 1-second interval time slicing, backspace/error exclusion, and fallback to timeline intervals.
- **RPG Progression Multipliers**: Base XP formula, 100% Flawless bonus (+50%), combo milestone multipliers (+10%, +25%, +50%), metronome rhythm consistency bonuses (+20%, +30%), and structured `XpBreakdown` objects.
- **Combo Milestones**: Multiplier triggers at 50, 100, and 200+ unbroken streaks.
- **Rhythm Consistency**: Standard deviation over 1s intervals; flow state bonus at $\ge 85\%$ consistency and metronome master at $\ge 92\%$.
- **Accolade Badges**: Evaluation rules for `flawless`, `centurion`, `surgical`, and `flow_state` badges.
- **Ghost Net Rival Delta**: Multi-metric differential comparison calculating $\Delta \text{Time}$ (seconds), $\Delta \text{Accuracy}$ (% points), $\Delta \text{Consistency}$ (% points), and $\Delta \text{Streak}$.

### Tier 2: Boundary & Corner Cases (>= 5 Test Cases per Boundary)
- **Zero Conditions**: 0 WPM, 0 chars typed, 0 ms duration, NaN / negative input guards.
- **100% Errors / 0% Accuracy**: Severe penalty clamping to 0 CPI, 0 XP, Grade D enforcement, and negative ghost deltas.
- **100 Backspaces with 0 Errors**: Backspace keystroke exclusion from total typed characters, preservation of 100% accuracy and Flawless accolades.
- **Single-Second & Micro Bursts**: Tests completing in $<1\text{s}$ or $\approx 1\text{s}$, micro 2-keystroke bursts, and 1-word short texts without division by zero.
- **250+ Extreme Combo Streaks**: Multiplier clamping at tier 3, accolade unlocks, safe integer progression in marathon tests.
- **Consistency Extremes**: $0\%$ vs $99.9\%$ vs $100\%$ consistency boundary multiplier evaluations.
- **Low Accuracy Penalty Progression**: Boundary tests at $85\%$, $84.9\%$, $80\%$, and $70\%$ accuracy, ensuring CPI is strictly clamped at $\ge 0$.
- **Numerical Stability**: Integer rounding for CPI, total XP, and 2-decimal precision for multipliers and ghost deltas.

### Tier 3: Cross-Feature Combinations (Pairwise & Multi-Way Interactions)
- **Max Multiplier Stacking**: Flawless (+50%) + 100+ Combo (+25%) + Consistency $\ge 92\%$ (+30%) $\to 2.05\times$ XP multiplier.
- **Spamming / Speed Mashing**: 140 WPM with 70% Accuracy correctly penalized, demoted to Grade D, and locked out of accolades.
- **Sudden Death Abort**: Immediate error handling on initial words, safe stats calculation without NaN.
- **The Golden 40 WPM @ 100% Acc Scenario**: Complete multi-module evaluation confirming S/S+ grade, $2.20\times$ XP multiplier, and 3 accolade badges.
- **Micro-Drills & Custom Mode Modifiers**: Bypasses XP awards (`isDrill = true`) while maintaining accurate local CPI and grade computation.
- **Ghost Net Multi-Metric Inversion**: User faster on time but lower on accuracy/consistency, or slower on time but higher on precision.

### Tier 4: Real-World Application Scenarios
Simulates 6 comprehensive user profiles:
1. **The Novice Steady Learner**: 10 words, 32 WPM, 96% Acc $\to$ Grade B, 33 XP.
2. **The Zen Perfectionist**: 50 words, 45 WPM, 100% Acc, 260 streak, 93% Cons $\to$ Grade S+, 538 XP ($2.30\times$), all 4 accolades unlocked.
3. **The Competitive Esports Speedster**: 100 words, 135 WPM, 98.5% Acc, 180 streak $\to$ Grade S+, 2003 XP ($1.45\times$), 3 accolades.
4. **The Recovering Stumbler**: 50 words, 65 WPM, 91% Acc, early errors, recovered streak $\to$ Grade B, 295 XP.
5. **The Hardcore Sudden Death Master**: Master snippet, 85 WPM, 100% Acc, 310 streak $\to$ Grade S+, 1159 XP ($2.20\times$).
6. **The Ghost Net Rival Showdown**: 25 words head-to-head race with time, accuracy, and consistency delta verification.

---

## How to Execute the E2E Test Suite

Run the master test runner from the workspace root:

```bash
npx tsx src/tests/run_e2e.ts
```

### Expected Output:
- Formatted ANSI terminal output showing each test suite and individual test assertion with execution duration in milliseconds.
- Execution summary with total suites, total tests, passed count, failed count, and total duration.
- Process returns exit code `0` on success, or `1` on failure.

---

## Verification Matrix

| Tier | Focus Area | Minimum Required | Implemented Tests | Status |
|---|---|---|---|---|
| **Tier 1** | Feature Coverage (CPI, Grades, Burst, XP, Combo, Consistency, Accolades, Ghost Delta) | 40 | 42 | **PASSED** |
| **Tier 2** | Boundary & Corner Cases (0 values, 100% errors, backspaces, micro-bursts, 250+ combo, penalties) | 40 | 40 | **PASSED** |
| **Tier 3** | Cross-Feature Combinations (Stacking multipliers, speed spam, sudden death, 40 WPM golden case) | 15 | 18 | **PASSED** |
| **Tier 4** | Real-World Application Scenarios (Novice, Zen, Speedster, Stumbler, Sudden Death, Ghost Rival) | 5 | 6 | **PASSED** |
| **TOTAL** | **Full E2E Precision Test Harness** | **100** | **106** | **100% PASS** |
