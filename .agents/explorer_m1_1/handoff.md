# Handoff Report: Milestone 1 — Core Scoring & Grading Engine (`src/lib/scoringEngine.ts`)

**Agent**: `explorer_m1_1`  
**Milestone**: M1 (Core Scoring & Grading Engine)  
**Date**: 2026-09-01  
**Status**: Investigation Complete — Ready for Implementation

---

## 1. Observation

### 1.1 Existing Grade & Scoring Deficiencies in Codebase
1. **Defective Hardcoded Grade Logic in `src/components/ResultsScreen.tsx` (Lines 106–112)**:
   ```typescript
   const grade = (() => {
     if (wpm > 100 && accuracy > 98) return "S";
     if (wpm > 80 && accuracy > 95) return "A";
     if (wpm > 50 && accuracy > 90) return "B";
     if (wpm > 30) return "C";
     return "D";
   })();
   ```
   - **Direct Failure**: A player completing a test at 40 WPM with 100% flawless accuracy and 90% rhythm consistency is assigned Grade **`C`** solely because `wpm <= 50`, completely ignoring precision and flawless combos.
   - **Missing Grade 'S+'**: No `S+` tier exists despite being required in the PRD and `PROJECT.md`.
   - **Zero Composite Metric**: The current system evaluates discrete if-else speed gates rather than a true multi-factor Composite Performance Index (CPI).

2. **Typing Engine Missing CPI & Burst Metrics in `src/hooks/useTypingEngine.ts` (Lines 21–28)**:
   ```typescript
   export interface TypingStats {
     currentWpm: number;
     rawWpm: number;
     currentAcc: number;
     timeline: TimelinePoint[];
     consistency: number;
     flawless: number;
   }
   ```
   - `TypingStats` only captures raw and net WPM, current accuracy, consistency, and flawless streak.
   - Peak instantaneous burst velocity (`burstWpm`), `cpi`, and `grade` are omitted.

3. **Absence of Dedicated Scoring Module**:
   - `src/lib/scoringEngine.ts` does not yet exist in the repository.
   - No unified typing accolade calculation exists (`calculateAccolades`).

---

## 2. Logic Chain & Mathematical Modeling

### 2.1 Multi-Factor Composite Performance Index (CPI) Formulation

The CPI represents an adjusted skill index that rewards precision, combo streaks, and rhythm consistency while penalizing inaccurate mashing.

$$\text{CPI} = \max\Big(0,\; \big(\text{baseSpeedScore} \times \text{precisionMultiplier}\big) + \text{precisionBonus} + \text{comboBonus} + \text{consistencyBonus} - \text{penalty}\Big)$$

#### Component Derivations:

1. **Base Speed Score ($\text{baseSpeedScore}$)**:
   $$\text{baseSpeedScore} = \max(0, \text{wpm})$$

2. **Precision Multiplier ($\text{precisionMultiplier}$)**:
   Exponential amplification for high accuracy, steep falloff below 90%:
   $$\text{precisionMultiplier} = \begin{cases} 
   1.25 & \text{if } \text{acc} = 100 \\
   1.15 + (\text{acc} - 98) \times 0.05 & \text{if } 98 \le \text{acc} < 100 \\
   1.00 + (\text{acc} - 95) \times 0.05 & \text{if } 95 \le \text{acc} < 98 \\
   0.85 + (\text{acc} - 90) \times 0.03 & \text{if } 90 \le \text{acc} < 95 \\
   \max\Big(0.20, \left(\frac{\text{acc}}{90}\right)^2 \times 0.85\Big) & \text{if } \text{acc} < 90
   \end{cases}$$

3. **Precision Bonus ($\text{precisionBonus}$)**:
   Direct additive reward for precision discipline:
   $$\text{precisionBonus} = \begin{cases}
   15 & \text{if } \text{acc} = 100 \\
   10 & \text{if } 98 \le \text{acc} < 100 \\
   5 & \text{if } 95 \le \text{acc} < 98 \\
   0 & \text{if } \text{acc} < 95
   \end{cases}$$

4. **Flawless Streak / Combo Bonus ($\text{comboBonus}$)**:
   Combines relative flawless streak coverage with absolute streak milestones:
   $$\text{streakRatio} = \begin{cases} \min\left(1.0, \frac{\text{flawlessStreak}}{\text{totalChars}}\right) & \text{if } \text{totalChars} > 0 \\ 0 & \text{otherwise} \end{cases}$$
   $$\text{relativeBonus} = \text{streakRatio} \times 15$$
   $$\text{absoluteBonus} = \min\left(10, \left\lfloor\frac{\text{flawlessStreak}}{50}\right\rfloor \times 2.5\right)$$
   $$\text{comboBonus} = \text{relativeBonus} + \text{absoluteBonus} \quad (\text{Max: } 25)$$

5. **Rhythm Consistency Bonus ($\text{consistencyBonus}$)**:
   Rewards metronomic pacing (low variance between keystrokes):
   $$\text{consistencyBonus} = \begin{cases}
   \frac{\text{consistency} - 50}{50} \times 10 & \text{if } \text{consistency} \ge 85 \\
   \frac{\text{consistency} - 50}{50} \times 5 & \text{if } 70 \le \text{consistency} < 85 \\
   0 & \text{if } \text{consistency} < 70
   \end{cases}$$

6. **Error Penalty ($\text{penalty}$)**:
   Penalizes sloppy or rushed typing below standard threshold (95%):
   $$\text{penalty} = \begin{cases}
   (95 - \text{accuracy})^{1.2} \times 1.5 & \text{if } \text{accuracy} < 95 \\
   0 & \text{if } \text{accuracy} \ge 95
   \end{cases}$$

---

### 2.2 Mathematical Proof: 40 WPM @ 100% Accuracy Evaluates to Grade A/S

Given a standard 40-word passage ($\approx 200$ characters):
- $\text{wpm} = 40$
- $\text{accuracy} = 100\%$ ($\text{isFlawless} = \text{true}$)
- $\text{flawlessStreak} = 200$
- $\text{totalChars} = 200$
- $\text{consistency} = 85\%$

**Step-by-step Calculation**:
1. $\text{baseSpeedScore} = 40.0$
2. $\text{precisionMultiplier} = 1.25 \implies 40.0 \times 1.25 = 50.0$
3. $\text{precisionBonus} = 15.0$
4. $\text{comboBonus} = (1.0 \times 15) + \left(\frac{200}{50} \times 2.5\right) = 15.0 + 10.0 = 25.0$
5. $\text{consistencyBonus} = \frac{85 - 50}{50} \times 10 = 7.0$
6. $\text{penalty} = 0.0$
7. $\text{CPI} = 50.0 + 15.0 + 25.0 + 7.0 = 97.0$

**Grade Evaluation**:
- With $\text{CPI} = 97.0 \ge 85$ and $\text{accuracy} = 100\%$, `evaluateGrade` returns **`S`**!
- Even on a shorter 50-character prompt with lower consistency ($75\%$), $\text{CPI} = 50.0 + 15.0 + 17.5 + 2.5 = 85.0 \implies$ Grade **`A`** or **`S`**.
- **Outcome**: The 100% accuracy run is fairly rewarded with an **`S`** or **`A`** grade instead of **`C`**.

---

### 2.3 Performance Grade Threshold Matrix

| Grade | CPI Threshold | Minimum Accuracy | Flawless Override | Title | Visual Glow & Theme Style |
|---|---|---|---|---|---|
| **S+** | $\text{CPI} \ge 120$ | $\ge 97\%$ | $\text{CPI} \ge 100$ and Flawless | Cyber Vanguard | Luminous Gold/Cyan Hologram Glow (`drop-shadow-[0_0_25px_rgba(251,191,36,0.8)]`) |
| **S** | $\text{CPI} \ge 85$ | $\ge 95\%$ | $\text{CPI} \ge 75$ and Flawless | Precision Master | Amber Aura Glow (`drop-shadow-[0_0_20px_rgba(251,191,36,0.6)]`) |
| **A** | $\text{CPI} \ge 65$ | $\ge 90\%$ | $\text{CPI} \ge 55$ and Flawless | Elite Operative | Emerald Aura Glow (`drop-shadow-[0_0_20px_rgba(52,211,153,0.6)]`) |
| **B** | $\text{CPI} \ge 45$ | $\ge 80\%$ | None | Proficient Hacker | Sapphire Sky Glow (`drop-shadow-[0_0_20px_rgba(96,165,250,0.6)]`) |
| **C** | $\text{CPI} \ge 25$ | $\ge 70\%$ | None | Neon Initiate | Sunset Orange Glow (`drop-shadow-[0_0_20px_rgba(251,146,60,0.6)]`) |
| **D** | $\text{CPI} < 25$ | $< 70\%$ | None | Uncalibrated | Muted Zinc (`text-zinc-500`) |

---

### 2.4 Burst WPM Calculation (`calculateBurstWpm`)

Burst WPM measures peak instantaneous velocity over a short rolling temporal window ($1000\text{ ms}$) or 5-keystroke sliding cluster:
1. Filter out backspace entries (`!k.isBackspace`).
2. If total keystrokes $< 2$, return `0`.
3. Iterate a sliding 5-character cluster:
   - If all 5 characters are error-free, measure $\Delta t = k[i].\text{time} - k[i-4].\text{time}$.
   - If $\Delta t \ge 50\text{ ms}$, instantaneous velocity is $\text{wpm} = \text{round}\left(\frac{1 \text{ word}}{\Delta t / 60000}\right) = \text{round}\left(\frac{60000}{\Delta t}\right)$.
4. Also evaluate 1-second rolling window across all keystroke timestamps.
5. Take the maximum burst velocity, clamped safely to $[0, 350\text{ WPM}]$.
6. Fallback: If `keystrokeLog` is not available, find $\max(\text{timeline}[i].\text{wpm})$.

---

### 2.5 Accolade Badge Engine (`calculateAccolades`)

Computes post-match achievement accolades:
1. **Flawless Execution (`flawless`)**: $\text{accuracy} = 100 \land \text{rawErrors} = 0 \land \text{totalWords} \ge 10 \implies +50\%$ XP
2. **Centurion Combo (`centurion_streak`)**: $\text{flawlessStreak} \ge 100 \implies +30\%$ XP (or $\ge 50 \implies +15\%$ XP)
3. **Surgical Precision (`surgical_precision`)**: $\text{accuracy} \ge 98\% \land \text{totalWords} \ge 25 \implies +20\%$ XP
4. **Flow State (`flow_state`)**: $\text{consistency} \ge 85\% \land \text{totalWords} \ge 15 \implies +20\%$ XP

---

## 3. Caveats

1. **Pure Function Architecture**: `scoringEngine.ts` contains strictly deterministic pure functions with zero React dependencies or external network imports.
2. **Backward Compatibility**: `evaluateGrade` and `calculateCPI` handle `NaN`, `undefined`, negative numbers, and empty strings gracefully.
3. **Dynamic Theme Rules (GEMINI.md)**: Color bindings in UI components (`ResultsScreen`) must use `rgb(${theme.glowPrimary})` while semantic grade badge colors (S+, S, A, B, C, D) provide fallback luxury aura palettes.

---

## 4. Implementation Blueprint

### 4.1 Target File: `src/lib/scoringEngine.ts`

```typescript
/**
 * TypeNova Core Scoring & Precision Grading Engine
 * Computes Composite Performance Index (CPI), Burst WPM, Performance Grades, and Accolades.
 */

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
  id: string;
  title: string;
  description: string;
  icon: string;
  tier: 'bronze' | 'silver' | 'gold' | 'diamond' | 'apex';
  xpBonusPct: number;
}

export interface GradeDetails {
  grade: PerformanceGrade;
  title: string;
  description: string;
  colorClass: string;
  glowClass: string;
  minCpi: number;
  minAccuracy: number;
}

export const GRADE_DETAILS: Record<PerformanceGrade, GradeDetails> = {
  'S+': {
    grade: 'S+',
    title: 'Cyber Vanguard',
    description: 'Transcendent velocity and near-perfect execution.',
    colorClass: 'text-amber-300',
    glowClass: 'drop-shadow-[0_0_25px_rgba(251,191,36,0.85)]',
    minCpi: 120,
    minAccuracy: 97,
  },
  'S': {
    grade: 'S',
    title: 'Precision Master',
    description: 'Flawless precision with exceptional rhythm.',
    colorClass: 'text-amber-400',
    glowClass: 'drop-shadow-[0_0_20px_rgba(251,191,36,0.65)]',
    minCpi: 85,
    minAccuracy: 95,
  },
  'A': {
    grade: 'A',
    title: 'Elite Operative',
    description: 'High accuracy and steady velocity.',
    colorClass: 'text-emerald-400',
    glowClass: 'drop-shadow-[0_0_20px_rgba(52,211,153,0.65)]',
    minCpi: 65,
    minAccuracy: 90,
  },
  'B': {
    grade: 'B',
    title: 'Proficient Hacker',
    description: 'Solid performance with minor unforced errors.',
    colorClass: 'text-sky-400',
    glowClass: 'drop-shadow-[0_0_20px_rgba(56,189,248,0.60)]',
    minCpi: 45,
    minAccuracy: 80,
  },
  'C': {
    grade: 'C',
    title: 'Neon Initiate',
    description: 'Developing control and pacing.',
    colorClass: 'text-orange-400',
    glowClass: 'drop-shadow-[0_0_20px_rgba(251,146,60,0.60)]',
    minCpi: 25,
    minAccuracy: 70,
  },
  'D': {
    grade: 'D',
    title: 'Uncalibrated',
    description: 'High error rate requiring calibration.',
    colorClass: 'text-zinc-400',
    glowClass: 'drop-shadow-none',
    minCpi: 0,
    minAccuracy: 0,
  },
};

/**
 * Calculates Composite Performance Index (CPI) factoring in Net WPM, Accuracy %,
 * Flawless Streak, and Rhythm Consistency.
 */
export function calculateCPI(
  wpm: number,
  accuracy: number,
  flawlessStreak: number,
  consistency: number,
  totalChars: number
): CPIBreakdown {
  const safeWpm = Math.max(0, Number.isFinite(wpm) ? wpm : 0);
  const safeAcc = Math.max(0, Math.min(100, Number.isFinite(accuracy) ? accuracy : 0));
  const safeStreak = Math.max(0, Number.isFinite(flawlessStreak) ? flawlessStreak : 0);
  const safeCons = Math.max(0, Math.min(100, Number.isFinite(consistency) ? consistency : 0));
  const safeChars = Math.max(0, Number.isFinite(totalChars) ? totalChars : 0);

  const baseSpeedScore = Math.round(safeWpm * 10) / 10;

  // 1. Precision Multiplier
  let precisionMultiplier = 1.0;
  if (safeAcc === 100) {
    precisionMultiplier = 1.25;
  } else if (safeAcc >= 98) {
    precisionMultiplier = 1.15 + (safeAcc - 98) * 0.05;
  } else if (safeAcc >= 95) {
    precisionMultiplier = 1.00 + (safeAcc - 95) * 0.05;
  } else if (safeAcc >= 90) {
    precisionMultiplier = 0.85 + (safeAcc - 90) * 0.03;
  } else {
    precisionMultiplier = Math.max(0.20, Math.pow(safeAcc / 90, 2) * 0.85);
  }
  precisionMultiplier = Math.round(precisionMultiplier * 1000) / 1000;

  // 2. Precision Bonus
  let precisionBonus = 0;
  if (safeAcc === 100) {
    precisionBonus = 15;
  } else if (safeAcc >= 98) {
    precisionBonus = 10;
  } else if (safeAcc >= 95) {
    precisionBonus = 5;
  }

  // 3. Flawless Combo Bonus
  const streakRatio = safeChars > 0 ? Math.min(1.0, safeStreak / safeChars) : 0;
  const relativeBonus = streakRatio * 15;
  const absoluteBonus = Math.min(10, Math.floor(safeStreak / 50) * 2.5);
  const comboBonus = Math.round((relativeBonus + absoluteBonus) * 10) / 10;

  // 4. Rhythm Consistency Bonus
  let consistencyBonus = 0;
  if (safeCons >= 85) {
    consistencyBonus = Math.round(((safeCons - 50) / 50) * 10 * 10) / 10;
  } else if (safeCons >= 70) {
    consistencyBonus = Math.round(((safeCons - 50) / 50) * 5 * 10) / 10;
  }

  // 5. Error Penalty
  let penalty = 0;
  if (safeAcc < 95) {
    penalty = Math.round(Math.pow(95 - safeAcc, 1.2) * 1.5 * 10) / 10;
  }

  // Final CPI
  const rawCpi = (baseSpeedScore * precisionMultiplier) + precisionBonus + comboBonus + consistencyBonus - penalty;
  const cpi = Math.max(0, Math.round(rawCpi * 10) / 10);

  const isFlawless = safeAcc === 100 && (safeChars > 0 ? safeStreak >= safeChars : true);
  const grade = evaluateGrade(cpi, safeAcc, isFlawless);

  return {
    cpi,
    grade,
    baseSpeedScore,
    precisionMultiplier,
    precisionBonus,
    comboBonus,
    consistencyBonus,
    penalty,
  };
}

/**
 * Evaluates performance grade from CPI, accuracy, and flawless status.
 */
export function evaluateGrade(
  cpi: number,
  accuracy: number,
  isFlawless: boolean = false
): PerformanceGrade {
  const safeCpi = Math.max(0, Number.isFinite(cpi) ? cpi : 0);
  const safeAcc = Math.max(0, Math.min(100, Number.isFinite(accuracy) ? accuracy : 0));

  if (safeAcc < 70) return 'D';

  // S+ Grade
  if ((safeCpi >= 120 && safeAcc >= 97) || (isFlawless && safeCpi >= 100)) {
    return 'S+';
  }

  // S Grade (40 WPM @ 100% accuracy lands here with CPI >= 85)
  if ((safeCpi >= 85 && safeAcc >= 95) || (isFlawless && safeCpi >= 75)) {
    return 'S';
  }

  // A Grade (30 WPM @ 100% accuracy lands here with CPI >= 65)
  if ((safeCpi >= 65 && safeAcc >= 90) || (isFlawless && safeCpi >= 55)) {
    return 'A';
  }

  // B Grade
  if (safeCpi >= 45 && safeAcc >= 80) {
    return 'B';
  }

  // C Grade
  if (safeCpi >= 25 && safeAcc >= 70) {
    return 'C';
  }

  return 'D';
}

/**
 * Calculates instantaneous peak burst velocity (WPM) from keystroke log or timeline.
 */
export function calculateBurstWpm(
  keystrokeLog: Array<{ time: number; isError: boolean; isBackspace?: boolean }>,
  timeline?: Array<{ t: number; wpm: number }>
): number {
  let peakBurst = 0;

  if (Array.isArray(keystrokeLog) && keystrokeLog.length >= 2) {
    const valid = keystrokeLog.filter(k => !k.isBackspace);

    // 1. Sliding 5-character cluster velocity
    for (let i = 4; i < valid.length; i++) {
      const windowKeystrokes = valid.slice(i - 4, i + 1);
      const hasError = windowKeystrokes.some(k => k.isError);
      if (!hasError) {
        const dt = windowKeystrokes[4].time - windowKeystrokes[0].time;
        if (dt >= 50) {
          // 5 characters = 1 word
          const instantaneousWpm = Math.round(60000 / dt);
          if (instantaneousWpm > peakBurst && instantaneousWpm <= 350) {
            peakBurst = instantaneousWpm;
          }
        }
      }
    }

    // 2. Rolling 1000ms window
    for (let i = 0; i < valid.length; i++) {
      const tEnd = valid[i].time;
      const tStart = tEnd - 1000;
      let correctCount = 0;
      for (let j = i; j >= 0; j--) {
        if (valid[j].time < tStart) break;
        if (!valid[j].isError) correctCount++;
      }
      const windowWpm = Math.round((correctCount / 5) * 60);
      if (windowWpm > peakBurst && windowWpm <= 350) {
        peakBurst = windowWpm;
      }
    }
  }

  // Fallback to timeline if keystroke log yielded 0
  if (peakBurst === 0 && Array.isArray(timeline) && timeline.length > 0) {
    const maxTimeline = Math.max(...timeline.map(p => p.wpm).filter(Number.isFinite));
    peakBurst = Math.max(0, maxTimeline);
  }

  return Math.min(350, Math.max(0, peakBurst));
}

/**
 * Calculates earned accolade badges from session performance.
 */
export function calculateAccolades(
  accuracy: number,
  flawlessStreak: number,
  consistency: number,
  totalWords: number,
  rawErrors: number
): AccoladeBadge[] {
  const accolades: AccoladeBadge[] = [];

  // 1. Flawless Execution (100% Accuracy, zero errors)
  if (accuracy === 100 && rawErrors === 0 && totalWords >= 10) {
    accolades.push({
      id: 'flawless',
      title: 'Flawless Execution',
      description: 'Completed entire test with 100% accuracy and zero keystroke errors.',
      icon: 'sparkles',
      tier: 'apex',
      xpBonusPct: 50,
    });
  }

  // 2. Centurion Streak (100+ Combo)
  if (flawlessStreak >= 100) {
    accolades.push({
      id: 'centurion_streak',
      title: 'Centurion Streak',
      description: 'Chained 100+ consecutive flawless keystrokes.',
      icon: 'zap',
      tier: 'diamond',
      xpBonusPct: 30,
    });
  } else if (flawlessStreak >= 50) {
    accolades.push({
      id: 'half_centurion',
      title: 'Combo Vanguard',
      description: 'Chained 50+ consecutive flawless keystrokes.',
      icon: 'zap',
      tier: 'gold',
      xpBonusPct: 15,
    });
  }

  // 3. Surgical Precision (98%+ Accuracy on 25+ words)
  if (accuracy >= 98 && totalWords >= 25) {
    accolades.push({
      id: 'surgical_precision',
      title: 'Surgical Precision',
      description: 'Maintained over 98% accuracy across a full test passage.',
      icon: 'crosshair',
      tier: 'gold',
      xpBonusPct: 20,
    });
  }

  // 4. Flow State (85%+ Rhythm Consistency)
  if (consistency >= 85 && totalWords >= 15) {
    accolades.push({
      id: 'flow_state',
      title: 'Flow State',
      description: 'Maintained metronomic keystroke rhythm (85%+ consistency).',
      icon: 'activity',
      tier: 'silver',
      xpBonusPct: 20,
    });
  }

  return accolades;
}

/**
 * Returns visual styling, labels, and theme glow metadata for a grade.
 */
export function getGradeDetails(grade: PerformanceGrade): GradeDetails {
  return GRADE_DETAILS[grade] || GRADE_DETAILS['D'];
}
```

---

### 4.2 Integration Blueprint: `src/hooks/useTypingEngine.ts`

1. **Import Scoring Engine**:
   ```typescript
   import { calculateCPI, calculateBurstWpm, type CPIBreakdown, type PerformanceGrade } from '@/lib/scoringEngine';
   ```

2. **Extend `TypingStats` Interface**:
   ```typescript
   export interface TypingStats {
     currentWpm: number;
     rawWpm: number;
     currentAcc: number;
     timeline: TimelinePoint[];
     consistency: number;
     flawless: number;
     burstWpm: number;
     cpi: number;
     grade: PerformanceGrade;
     cpiBreakdown?: CPIBreakdown;
   }
   ```

3. **Incorporate `burstWpm` and `cpi` inside `calculateStats` and `finishTestImpl`**:
   ```typescript
   const burstWpm = calculateBurstWpm(entries, timeline);
   const cpiBreakdown = calculateCPI(netCalc, currentAcc, localMaxStreak, consistencyScore, totalTyped);

   return {
     currentWpm: isNaN(netCalc) || netCalc < 0 ? 0 : netCalc,
     rawWpm: isNaN(rawCalc) ? 0 : rawCalc,
     currentAcc: isNaN(currentAcc) ? 100 : currentAcc,
     timeline,
     consistency: consistencyScore,
     flawless: localMaxStreak,
     burstWpm,
     cpi: cpiBreakdown.cpi,
     grade: cpiBreakdown.grade,
     cpiBreakdown,
   };
   ```

---

### 4.3 Integration Blueprint: `src/components/ResultsScreen.tsx`

1. **Import `calculateCPI`, `calculateAccolades`, `getGradeDetails`**:
   ```typescript
   import { calculateCPI, calculateBurstWpm, calculateAccolades, getGradeDetails, type PerformanceGrade } from '@/lib/scoringEngine';
   ```

2. **Replace Hardcoded Grade Logic**:
   ```typescript
   const cpiBreakdown = useMemo(() => {
     const totalChars = safeKeystrokeLog.filter(k => !k.isBackspace).length;
     return calculateCPI(wpm, accuracy, flawlessStreak, consistency, totalChars);
   }, [wpm, accuracy, flawlessStreak, consistency, safeKeystrokeLog]);

   const grade = cpiBreakdown.grade;
   const gradeStyle = getGradeDetails(grade);
   ```

3. **Replace Hardcoded Grade Color with Dynamic Theme Compliant Styles**:
   ```typescript
   const gradeColor = gradeStyle.colorClass + ' ' + gradeStyle.glowClass;
   ```

---

## 5. Verification Method

### 5.1 Unit Test Scenarios to Validate Implementation

| # | Test Scenario | Input Parameters | Expected CPI | Expected Grade | Pass Condition |
|---|---|---|---|---|---|
| **T1** | **Precision Benchmark (Acceptance Criterion 1)** | `wpm: 40`, `acc: 100`, `streak: 200`, `cons: 85`, `chars: 200` | $\ge 85.0$ (Calculates to ~97.0) | `'S'` or `'A'` | Grade must **NOT** be `'C'` or `'D'`. |
| **T2** | **Short Passage Flawless** | `wpm: 40`, `acc: 100`, `streak: 50`, `cons: 75`, `chars: 50` | $\ge 65.0$ (Calculates to ~85.0) | `'S'` or `'A'` | Evaluates to `'A'` or `'S'`. |
| **T3** | **Grandmaster Speed & Accuracy** | `wpm: 125`, `acc: 99`, `streak: 300`, `cons: 92`, `chars: 300` | $\ge 140.0$ | `'S+'` | Returns `'S+'`. |
| **T4** | **High Speed Masher (Low Accuracy)** | `wpm: 120`, `acc: 78`, `streak: 15`, `cons: 55`, `chars: 300` | $\le 45.0$ | `'C'` or `'D'` | High WPM is penalized down to C/D. |
| **T5** | **Burst Velocity Window** | 5 keystrokes spaced by 50ms (equivalent to 240 WPM) | N/A | Burst $\approx 240$ WPM | `calculateBurstWpm` identifies peak instantaneous speed. |
| **T6** | **Flawless Accolade Award** | `acc: 100`, `streak: 150`, `cons: 90`, `words: 30`, `errors: 0` | N/A | Accolades include `flawless`, `centurion_streak`, `surgical_precision`, `flow_state` | All 4 badges awarded. |
| **T7** | **Zero/NaN Division Robustness** | `wpm: NaN`, `acc: -5`, `streak: 0`, `cons: NaN`, `chars: 0` | $0.0$ | `'D'` | No runtime errors or NaN outputs. |

---

## Conclusion
The mathematical formulation and implementation blueprint for `src/lib/scoringEngine.ts` fully solves the core scoring engine requirements, guarantees that 40 WPM at 100% accuracy receives Grade A or S, and establishes clean TypeScript interfaces with zero circular dependencies.
