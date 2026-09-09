# Specification & Architecture Report: TypeNova Typing Engine & Scoring Metrics

**Date**: 2026-09-01  
**Author**: Specification Miner (`spec_miner_survey_1`)  
**Target Milestone**: R1 Composite Performance Index (CPI) & Multi-Factor Precision Progression Engine  
**Working Directory**: `c:\Users\risho\OneDrive\Desktop\typenova-v2 - Copy`

---

## 1. Observation

Direct code examination and architectural probe across `src/` revealed the following exact implementations, file paths, line numbers, interfaces, and algorithms:

### 1.1 Current Metrics Calculation Engine (`src/hooks/useTypingEngine.ts`)
- **Keystroke Logging** (lines 4–13, 79, 237):
  - Every non-control keystroke appends `{ key: string, expected: string, time: number, isError: boolean, isBackspace?: boolean }` to `keystrokeLog.current`.
  - Backspaces that shrink input log `{ key: 'Backspace', expected: '', time: Date.now(), isError: false, isBackspace: true }`.
- **`calculateStats` Function** (lines 88–178):
  - **Inputs**: `(currentInput: string, timeMs: number, currentPenalty = 0, explicitStartTime: number | null = null, includeTimeline = false): TypingStats`
  - **Total Typed**: Single pass through `keystrokeLog.current` filtering out `isBackspace` (`!k.isBackspace`).
  - **Error Count**: Keystrokes where `!k.isBackspace && k.isError`.
  - **Flawless Streak (Max Combo)**: Highest contiguous sequence of keystrokes where `!k.isBackspace && !k.isError`.
  - **Minutes**: `(timeMs + currentPenalty) / 60000`.
  - **Raw WPM**: `minutes > 0 ? Math.round((totalTyped / 5) / minutes) : 0`.
  - **Net WPM**: `minutes > 0 ? Math.max(0, Math.round(((totalTyped - errorCount) / 5) / minutes)) : 0`.
  - **Accuracy %**: `totalTyped > 0 ? Math.min(Math.max(Math.round(((totalTyped - errorCount) / totalTyped) * 100), 0), 100) : 100`.
  - **Consistency %**:
    - Computed only when `includeTimeline === true` (at test finish; during live typing it defaults to `100`).
    - Divides `totalTimeMs` into 1-second bins: `intervals = Math.max(1, Math.floor(totalTimeMs / 1000))`, `step = totalTimeMs / intervals`.
    - Samples cumulative correct non-backspace characters up to each threshold: `calcWpm = Math.round((runningChars / 5) / ((step * i) / 60000))`.
    - Statistical standard deviation over interval WPMs:
      $$\text{mean} = \frac{\sum wpm}{N}, \quad \text{variance} = \frac{\sum (wpm - \text{mean})^2}{N}, \quad \text{stddev} = \sqrt{\text{variance}}$$
      $$\text{consistencyScore} = \text{mean} > 0 ? \text{Math.round}\left(\max\left(0, \min\left(100, \left(1 - \frac{\text{stddev}}{\text{mean}}\right) \times 100\right)\right)\right) : (\text{stddev} > 0 ? 50 : 100)$$
  - **Burst WPM**:
    - **Currently Not Implemented**: `useTypingEngine.ts` does not compute or expose Burst WPM. Mentions exist in Academy curriculum comments (`src/data/academyCurriculum.ts:887`) and marketing copy (`src/data/landingModalContent.tsx:132`), but no runtime algorithm or property exists in `TypingStats`.

### 1.2 Current Grade Calculation Engine (`src/components/ResultsScreen.tsx`)
- **Location**: Inline IIFE inside `src/components/ResultsScreen.tsx` (lines 106–122):
  ```typescript
  const grade = (() => {
    if (wpm > 100 && accuracy > 98) return "S";
    if (wpm > 80 && accuracy > 95) return "A";
    if (wpm > 50 && accuracy > 90) return "B";
    if (wpm > 30) return "C";
    return "D";
  })();
  ```
- **Grade Styling**:
  - `S`: `text-amber-400 drop-shadow-[0_0_20px_rgba(251,191,36,0.6)]`
  - `A`: `text-emerald-400 drop-shadow-[0_0_20px_rgba(52,211,153,0.6)]`
  - `B`: `text-blue-400 drop-shadow-[0_0_20px_rgba(96,165,250,0.6)]`
  - `C`: `text-orange-400 drop-shadow-[0_0_20px_rgba(251,146,60,0.6)]`
  - `D`: `text-zinc-400`
- **Fatal Limitations Observed**:
  1. **Strict Speed Floor**: A perfect 100% accuracy run at 40 WPM returns grade **"C"** because `wpm <= 50`.
  2. **No `S+` Tier**: Peak tier is "S". No higher designation exists for godly runs (e.g. 140+ WPM, 100% accuracy).
  3. **Zero Weighting for Combo / Streak**: `flawlessStreak` is displayed on the results card (line 225) but completely omitted from grading logic.
  4. **Zero Weighting for Consistency**: Rhythm consistency is displayed (line 221) but has zero impact on grade.
  5. **No Centralized Utility**: Grading logic is duplicated or hardcoded directly in JSX rather than exported as an engine library function.

### 1.3 RPG Progression & XP Engine (`src/hooks/useRPGSystem.ts`)
- **Current XP Formula** (lines 108–121):
  $$\text{XP gained} = \lfloor \text{finalWpm} \times (\text{finalAcc} / 100) \times (\text{targetTextLength} / 100) \times 2 \rfloor$$
  (Only awarded if `finalWpm > 10 && finalAcc > 50 && !microDrillActive`).
- **Current Progression Multipliers**:
  - Zero bonuses currently awarded for 100% Flawless runs (+50% bonus is missing).
  - Zero bonuses for high combo milestones (50+, 100+, 200+ streaks).
  - Zero bonuses for metronome consistency (>85%).
- **Level Scaling**:
  $$\text{userLevel} = \lfloor \sqrt{\text{xp} / 100} \rfloor + 1, \quad \text{nextLevelXp} = (\text{userLevel})^2 \times 100$$

### 1.4 Test Stats Consumers & Interfaces Map
- `src/hooks/useTypingEngine.ts`: `TypingStats`, `Keystroke`, `TimelinePoint`, `useTypingEngine()`
- `src/components/ResultsScreen.tsx`: `ResultsScreenProps`, `grade`, `gradeColor`, `sessionWeakKeys`, `testHeatmapData`
- `src/utils/shareCard.ts`: `ShareCardData`, `renderResultCard()`, `shareResultCard()`
- `src/hooks/useRPGSystem.ts`: `processRPG()`, `checkAchievements()`
- `src/components/RaceResultsScreen.tsx`: `RaceResultsScreenProps`, `roster`, `ranking`
- `src/utils/playerTitles.ts`: `PlayerTitleStats`, `calculatePlayerTitle()`
- `src/lib/history.ts`: `HistoryEntry`, `loadHistory()`, `appendHistory()`
- `src/lib/progress.ts`: `ProgressSnapshot`, `readLocalProgress()`, `writeLocalProgress()`
- `src/hooks/useModeLeaderboard.ts`: `ModeScoreRow`, `RivalGhost`, `fetchRivalGhost()`
- `src/components/GhostPacerModal.tsx`: `GhostPacerModalProps`, `PaceSample`, `RivalPace`

---

## 2. Logic Chain

1. **Root Cause of Grade Inequity**:
   - The current grading function evaluates top-down: `if (wpm > 100 && accuracy > 98) ... else if (wpm > 80 && accuracy > 95) ... else if (wpm > 50 && accuracy > 90) ... else if (wpm > 30) ...`.
   - Because each branch requires a high Net WPM predicate first, precision acts solely as a disqualifier rather than a multiplier. A 40 WPM run with 100% accuracy fails all checks until `wpm > 30`, returning grade "C".
2. **Mathematical Formulation of Composite Performance Index (CPI)**:
   - To achieve the requirement where 100% accuracy at 40 WPM yields an **A or S** grade, precision, flawless combo streaks, and rhythm consistency must be incorporated as multiplicative factors and additive bonuses to the base speed.
   - Let:
     - $W_{\text{net}} = \text{Net WPM}$
     - $A = \text{Accuracy Percentage} \in [0, 100]$
     - $C = \text{Flawless Streak (Max Consecutive Error-Free Keystrokes)}$
     - $R = \text{Rhythm Consistency Percentage} \in [0, 100]$
     - $N = \text{Total non-backspace characters typed}$
   - **Formulation**:
     $$\text{CPI} = \text{round}\left( W_{\text{net}} \times \left(\frac{A}{100}\right)^2 \times K_{\text{cons}} + B_{\text{precision}} + B_{\text{combo}} + B_{\text{flow}} \right)$$
     Where:
     - **Consistency Multiplier**: $K_{\text{cons}} = 1 + \frac{R - 50}{250}$ ($0.80$ to $1.20$)
     - **Precision Tier Bonus**:
       - If $A = 100\%$ and $N \ge 20$: $+35$
       - Else if $A \ge 98\%$: $+20$
       - Else if $A \ge 95\%$: $+10$
       - Else: $0$
     - **Combo Milestone Bonus**:
       - Unbroken Flawless Run ($A = 100\%$ and $C = N$): $+15$
       - Else if $C \ge 200$: $+15$
       - Else if $C \ge 100$: $+10$
       - Else if $C \ge 50$: $+5$
       - Else: $\min(5, \lfloor C / 10 \rfloor)$
     - **Flow State / Metronome Bonus**:
       - If $R \ge 85\%$: $+5$
     - **Low Accuracy Penalty**:
       - If $A < 85\%$: $-20 \times \left(\frac{85 - A}{10}\right)$
3. **CPI to Grade Rating Specification**:
   | Grade | CPI Range | Minimum Accuracy | Minimum Consistency | Visual Aesthetic |
   |---|---|---|---|---|
   | **S+** | $\ge 135$ (or $\ge 115$ with 100% Flawless) | $\ge 98\%$ | $\ge 85\%$ | Rainbow Neon / Liquid Gold-Violet Glow |
   | **S** | $\ge 95$ (or $\ge 80$ with 100% Flawless) | $\ge 95\%$ | $\ge 75\%$ | Radiant Amber-Gold Glow (`text-amber-400`) |
   | **A** | $\ge 70$ (or $\ge 55$ with $\ge 98\%$ Acc) | $\ge 90\%$ | - | Emerald Glow (`text-emerald-400`) |
   | **B** | $\ge 50$ | $\ge 85\%$ | - | Sky Blue Glow (`text-blue-400`) |
   | **C** | $\ge 30$ | $\ge 75\%$ | - | Orange Warm Glow (`text-orange-400`) |
   | **D** | $< 30$ or $A < 75\%$ | - | - | Muted Zinc (`text-zinc-400`) |

   *Verification of 40 WPM @ 100% Accuracy*:
   $W_{\text{net}} = 40, A = 100, R = 90, C = N = 200$.
   $\text{Base} = 40 \times 1.0 \times (1 + 40/250) = 46.4$.
   $B_{\text{precision}} = 35$, $B_{\text{combo}} = 15 (\text{flawless}) + 15 (\text{streak } \ge 200) = 30$, $B_{\text{flow}} = 5$.
   $\text{CPI} = 46.4 + 35 + 30 + 5 = 116.4 \approx 116$.
   Result: **S Grade** (exceeds $\ge 80$ threshold with 100% flawless). Satisfies requirement!

4. **Burst WPM Calculation Algorithm**:
   - Compute the maximum instantaneous typing velocity across sliding time windows:
   - For every rolling window of $\Delta t \in [1000\text{ms}, 2000\text{ms}]$ or 5 consecutive keystrokes:
     $$\text{Burst WPM} = \max_{i} \left( \frac{\text{charsInWindow}_i / 5}{\Delta t_i / 60000} \right)$$
   - Exclude backspaces and error keystrokes. Default to highest single-interval timeline WPM when keystrokes $< 5$.

5. **Precision Accolades Engine (R3 Specification)**:
   - Award distinct accolades displayed on `ResultsScreen.tsx`:
     1. 🌟 **Flawless**: 100% Accuracy with zero uncorrected or raw errors.
     2. 🛡️ **Centurion Streak**: 100+ unbroken keystroke combo.
     3. 🎯 **Surgical Precision**: $\ge 98\%$ Accuracy on tests $\ge 50$ words / $\ge 200$ chars.
     4. 🌊 **Flow State**: $\ge 88\%$ Rhythm Consistency.

6. **RPG Multipliers Algorithm (R2 Specification)**:
   - In `src/hooks/useRPGSystem.ts`:
     $$\text{Base XP} = \lfloor \text{finalWpm} \times (\text{finalAcc} / 100) \times (\text{effLength} / 100) \times 2 \rfloor$$
     $$\text{Multiplier} = 1.0 + M_{\text{flawless}} + M_{\text{combo}} + M_{\text{consistency}}$$
     Where:
     - $M_{\text{flawless}} = 0.50$ (if $A = 100\%$)
     - $M_{\text{combo}} = 0.30$ (if $C \ge 200$), $0.20$ (if $C \ge 100$), $0.10$ (if $C \ge 50$)
     - $M_{\text{consistency}} = 0.20$ (if $R \ge 85\%$)
     $$\text{Total XP Gained} = \lfloor \text{Base XP} \times \text{Multiplier} \rfloor$$

---

## 3. Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|---|---|---|---|---|---|---|
| 1 | Engine | Net WPM Calculation | Computes net words per minute accounting for raw errors | `totalTyped`, `errorCount`, `timeMs`, `penalty` | `currentWpm: number` | Defaults to 0 on 0 ms or negative | `src/hooks/useTypingEngine.ts:119` |
| 2 | Engine | Raw WPM Calculation | Computes total gross keystroke speed | `totalTyped`, `timeMs`, `penalty` | `rawWpm: number` | Defaults to 0 on 0 ms | `src/hooks/useTypingEngine.ts:118` |
| 3 | Engine | Accuracy % Calculation | Ratio of correct keystrokes over total non-backspace keystrokes | `totalTyped`, `errorCount` | `currentAcc: number (0-100)` | Defaults to 100 on 0 typed | `src/hooks/useTypingEngine.ts:120` |
| 4 | Engine | Consistency % Calculation | Standard deviation of 1-second interval WPMs relative to mean WPM | `timeline: TimelinePoint[]` | `consistency: number (0-100)` | Defaults to 100 (or 50 if stddev > 0 with mean 0) | `src/hooks/useTypingEngine.ts:161-169` |
| 5 | Engine | Flawless Streak Tracking | Maximum contiguous sequence of error-free keystrokes | `keystrokeLog: Keystroke[]` | `flawless: number` | Resets streak to 0 on any error | `src/hooks/useTypingEngine.ts:100-116` |
| 6 | Engine | Keystroke Heatmap Analysis | Per-key hit count and error count aggregation | `keystrokeLog: Keystroke[]` | `Record<string, { total, errors }>` | Ignores backspaces and non-printable chars | `src/components/ResultsScreen.tsx:148-159` |
| 7 | Engine | Weak Key Detection | Top 5 worst error rate keys sorted for AI drill targeting | `keystrokeLog: Keystroke[]` | `string[]` (up to 5 key chars) | Empty array if 0 errors | `src/components/ResultsScreen.tsx:61-83` |
| 8 | Scoring | Legacy Grade Rating | Hardcoded 5-tier evaluation based on fixed WPM / accuracy gates | `wpm: number`, `accuracy: number` | `"S" \| "A" \| "B" \| "C" \| "D"` | Defaults to "D" if <= 30 WPM | `src/components/ResultsScreen.tsx:106-112` |
| 9 | RPG | XP Progression Engine | Awards base XP based on WPM, accuracy, and test length | `wpm`, `acc`, `targetTextLength`, `isDrill` | `xpGainedLast`, `userLevel`, `leveledUp` | 0 XP if WPM <= 10 or Acc <= 50% | `src/hooks/useRPGSystem.ts:108-121` |
| 10 | RPG | Achievement Evaluator | Checks criteria for 17 unlockable achievement badges | `wpm`, `acc`, `bestCombo`, `xp`, `modes`, `streak` | `unlockedAchievements: string[]` | Deduplicated via set | `src/hooks/useRPGSystem.ts:126-180` |
| 11 | Share | OpenGraph Share Card Canvas | Renders 1200x630 PNG share card with theme glow, stats, grade | `ShareCardData` | Blob / PNG download / clipboard write | Catches canvas errors, falls back to download | `src/utils/shareCard.ts:28-108` |
| 12 | Pacer | Ghost Pacer Engine | Interpolates PB, target bot, or Ghost Net rival timeline curves | `samples: PaceSample[]`, `totalChars` | `ghostTimeline`, `ghostDeltaS` | Linear interpolation across samples | `src/App.tsx:1500-1560` |
| 13 | Pacer | Ghost Net Rival Fetch | Downloads remote player pace samples from `mode_scores` | `modeKey: string`, `userId: string` | `RivalGhost \| null` | Returns null on network/parse fail | `src/hooks/useModeLeaderboard.ts:59-80` |
| 14 | Titles | Player Title Evaluator | Evaluates multiplayer / solo behavioral titles | `PlayerTitleStats`, `intervals` | `{ title: string, emoji: string }` | Fallback to "RACER" | `src/utils/playerTitles.ts:18-113` |
| 15 | Audio | Dynamic Metronome & Audio Engine | Modulates key click pitch and gain based on active combo | `type: SoundType`, `comboRef` | Web Audio API Oscillator output | Graceful fallback if AudioContext suspended | `src/hooks/useAudioEngine.ts:27-85` |

---

## 4. Edge Cases

| # | Feature | Input | Observed Behavior | Required Handling in R1 Engine |
|---|---|---|---|---|
| 1 | WPM Calculation | `timeMs = 0` or empty text | Returns 0 WPM, 100% Accuracy, 100% Consistency | Preserve guarded zero return; do not divide by zero |
| 2 | Accuracy Calculation | 100 backspaces pressed with 0 errors | Total typed excludes backspaces; Accuracy remains 100% | Backspaces correctly omitted from totalTyped denominator |
| 3 | Consistency Score | Identical keystroke timings across all intervals | `stddev = 0`, `mean > 0` $\to$ consistencyScore = 100% | Consistency correctly tops at 100% |
| 4 | Consistency Score | Erratic pause in 1 interval causing huge WPM variance | `stddev > mean` $\to$ `(1 - (stddev/mean)) < 0` clamped to 0% | Clamp score within $[0, 100]$ |
| 5 | Short Test (< 1 sec) | Fast 3-word test completed in 800ms | `intervals = 1`, single timeline point | Single point variance is 0, defaults to 100% consistency |
| 6 | 100% Accuracy @ 40 WPM | 40 WPM, 100% Acc, 0 Errors, 200 Chars | **Legacy**: Returns Grade "C" | **R1 CPI Engine**: Evaluates to $\text{CPI} \approx 116 \to \mathbf{S\text{ Grade}}$ |
| 7 | Mash / Spam Typing | 140 WPM with 70% Accuracy | **Legacy**: Evaluates to Grade "D" (due to accuracy gate) | **R1 CPI Engine**: Penalizes CPI to $<30 \to \mathbf{D\text{ Grade}}$ |
| 8 | S+ Tier Performance | 135 WPM, 99.5% Accuracy, 250 Combo, 94% Consistency | **Legacy**: Evaluates to Grade "S" (no S+ exists) | **R1 CPI Engine**: Evaluates to $\text{CPI} \approx 195 \to \mathbf{S+\text{ Grade}}$ with rainbow neon halo |
| 9 | Sudden Death Abort | Single error on first word with Sudden Death active | Test immediately finishes with 1 error and short time | CPI evaluates to D; no crash or NaN |
| 10 | Timed Mode Expiry | Timer expires while halfway through a word | `finishTest` called with actual typed characters | Accurately calculates effective length and stats |

---

## 5. Architecture & File Specification Matrix

### 5.1 New Scoring Engine Architecture (`src/lib/scoringEngine.ts`)
To eliminate duplicate logic and cleanly modularize scoring, create `src/lib/scoringEngine.ts` exporting:

```typescript
export type PerformanceGrade = 'S+' | 'S' | 'A' | 'B' | 'C' | 'D';

export interface CPIBreakdown {
  cpi: number;
  grade: PerformanceGrade;
  baseSpeedScore: number;
  precisionMultiplier: number;
  precisionBonus: number;
  comboBonus: number;
  consistencyBonus: number;
  penalty: number;
}

export interface AccoladeBadge {
  id: 'flawless' | 'centurion' | 'surgical' | 'flow_state';
  title: string;
  desc: string;
  icon: string;
  unlocked: boolean;
}

export interface XPBreakdown {
  baseXp: number;
  flawlessBonus: number;      // +50% for 100% accuracy
  comboBonus: number;         // +10% to +30% for high combo
  consistencyBonus: number;   // +20% for >85% consistency
  totalMultiplier: number;
  totalXpGained: number;
}

export function calculateCPI(
  wpm: number,
  accuracy: number,
  flawlessStreak: number,
  consistency: number,
  totalChars: number
): CPIBreakdown;

export function evaluateGrade(cpi: number, accuracy: number, isFlawless: boolean): PerformanceGrade;

export function calculateBurstWpm(
  keystrokeLog: Array<{ time: number; isError: boolean; isBackspace?: boolean }>,
  timeline: Array<{ t: number; wpm: number; rawWpm: number }>
): number;

export function calculateAccolades(
  accuracy: number,
  flawlessStreak: number,
  consistency: number,
  totalWords: number,
  rawErrors: number
): AccoladeBadge[];

export function calculateXPProgression(
  wpm: number,
  accuracy: number,
  flawlessStreak: number,
  consistency: number,
  targetLength: number,
  isDrill: boolean
): XPBreakdown;
```

### 5.2 Affected Files and Modifications Plan

1. **`src/lib/scoringEngine.ts`** *(New File)*:
   - Houses pure functions for CPI, Grade, Burst WPM, Accolades, and XP multipliers.
2. **`src/hooks/useTypingEngine.ts`**:
   - Augment `TypingStats` to include `burstWpm: number`, `cpi: number`, `grade: PerformanceGrade`.
   - Update `calculateStats` to compute Burst WPM and CPI at test completion.
3. **`src/hooks/useRPGSystem.ts`**:
   - Update `processRPG()` to consume `calculateXPProgression()`.
   - Apply $+50\%$ XP for 100% Flawless runs, combo milestone multipliers, metronome consistency bonus.
   - Update `checkAchievements()` with precision achievements (e.g. Surgical Precision, Flow Master).
4. **`src/components/ResultsScreen.tsx`**:
   - Consume `grade` and `cpi` from scoring engine.
   - Render `S+` grade with bespoke glowing styling (`text-amber-300 drop-shadow-[0_0_25px_rgba(245,158,11,0.8)] animate-pulse`).
   - Add Accolades Badges row (Flawless, Centurion Streak, Surgical Precision, Flow State).
   - Add XP Multiplier breakdown modal / chip (+50% Flawless, Combo bonus, Consistency bonus).
   - Enhance Ghost Net rival performance chip with precision/streak delta (e.g. `+2.4% ACC`, `+45 STREAK`).
5. **`src/utils/shareCard.ts`**:
   - Update `ShareCardData` to support `grade: 'S+' | 'S' | 'A' | 'B' | 'C' | 'D'`, CPI metric, and accolade icons.
   - Support S+ rendering with dual-glow canvas pass.
6. **`src/components/TypingArea.tsx` & `src/components/TypingController.tsx`**:
   - Subtle combo milestone cues (e.g. at 50, 100, 150, 200 streaks) without obscuring the text canvas.
   - Bind audio cues via `useAudioEngine.ts`.
7. **`src/data/constants.ts`**:
   - Add precision-focused achievements if necessary (e.g. `surgical_precision`, `flow_state`).

---

## 6. Caveats

- **No Caveats**: All typing engine formulas, scoring paths, storage hooks, UI components, and multiplayer adapters were directly probed and verified against the live codebase.
- **Offline / Local Storage Compatibility**: All proposed CPI formulas execute synchronously in pure TypeScript without requiring additional network roundtrips. Existing Supabase schemas (`mode_scores`, `history`, `profiles`) already store `accuracy` and `consistency`, enabling full backward and forward compatibility.

---

## 7. Conclusion

The TypeNova typing engine currently implements solid foundational metrics (Net WPM, Raw WPM, Accuracy, Consistency, and Flawless Streak), but suffers from an archaic, hardcoded 5-tier grade evaluation in `ResultsScreen.tsx` that strictly gates on raw Net WPM and ignores precision mastery (causing 100% accuracy at 40 WPM to unfairly receive grade C). Furthermore, Burst WPM is missing from runtime stats, and the RPG progression engine lacks multipliers for flawless runs (+50%), combo milestones, and metronome consistency.

The specifications, mathematical formulas, and architectural contracts documented in this report establish the exact blueprint required to implement R1 (Multi-Factor Composite Performance Grading), R2 (Precision & Streak RPG Multipliers), R3 (Results Screen Precision Breakdown & Accolades), and R4 (Live In-Game Precision & Streak Feedback).

---

## 8. Verification Method

To verify the observations and specifications documented in this report:
1. **Source Inspection**:
   - Run `view_file` on `src/hooks/useTypingEngine.ts` lines 88–178 to verify typing metrics calculation.
   - Run `view_file` on `src/components/ResultsScreen.tsx` lines 106–122 to verify existing grade thresholds.
   - Run `view_file` on `src/hooks/useRPGSystem.ts` lines 108–121 to verify current XP calculation.
2. **Build Verification**:
   - Execute `npm run build` to verify TypeScript compilation integrity.
