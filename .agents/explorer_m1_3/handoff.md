# Milestone 1 Explorer Report: Accolades Engine & Consumer Interface Contracts

**Agent ID**: `explorer_m1_3`  
**Milestone**: M1 - Core Scoring & Grading Engine (Accolades & Consumer Contracts)  
**Date**: 2026-09-01  
**Target Subsystems**: `src/lib/scoringEngine.ts`, `src/components/ResultsScreen.tsx`, `src/hooks/useRPGSystem.ts`, `src/utils/shareCard.ts`, `src/hooks/useModeLeaderboard.ts`, `src/App.tsx`, `src/components/RaceResultsScreen.tsx`

---

## 1. Observation

Direct code examination across the TypeNova repository revealed the following architectural facts, interface signatures, and component lifecycles:

### 1.1 `src/lib/scoringEngine.ts` Status
- **Current State**: Does not exist yet. `PROJECT.md` dictates creating `src/lib/scoringEngine.ts` to encapsulate CPI calculation, Performance Grade evaluation (`S+`, `S`, `A`, `B`, `C`, `D`), Burst WPM, and `calculateAccolades`.
- **Target Accolade Badges**:
  1. `Flawless`
  2. `Centurion Streak`
  3. `Surgical Precision`
  4. `Flow State`

### 1.2 Existing Consumer Analysis

#### A. `src/components/ResultsScreen.tsx`
- **Current Interface**:
```typescript
export interface ResultsScreenProps {
  wpm: number;
  rawWpm: number;
  accuracy: number;
  consistency: number;
  flawlessStreak: number;
  leveledUp: boolean;
  xpGainedLast: number;
  theme: Theme;
  heatmapData: Record<string, { total: number; errors: number }>;
  isLoggedIn: boolean;
  displayName: string | null;
  saveStatus: string;
  timelinePoints: Array<{ t: number; wpm: number; rawWpm: number }>;
  errorTimes: number[];
  durationMs: number;
  keystrokeLog: Keystroke[];
  testStartTime: number;
  onReset: () => void;
  onWatchReplay: () => void;
  onStartMicroDrill: (keyChar: string) => void;
  onStartSmartDrill: ((keys?: string[]) => void) | null;
  isSmartDrillGenerating?: boolean;
  ghostTimeline?: Array<{ t: number; wpm: number }> | null;
  ghostLabel?: string;
  ghostDeltaS?: number;
  compact?: boolean;
  hideActions?: boolean;
}
```
- **Grade & Accolades Logic**:
  - Currently evaluates grade using hardcoded inline IIFE (lines 106–112) with a strict speed floor:
```typescript
const grade = (() => {
  if (wpm > 100 && accuracy > 98) return "S";
  if (wpm > 80 && accuracy > 95) return "A";
  if (wpm > 50 && accuracy > 90) return "B";
  if (wpm > 30) return "C";
  return "D";
})();
```
  - Accolade badges and XP multiplier breakdown cards are completely absent in the current DOM.
  - Ghost performance chip only evaluates single-scalar time delta `ghostDeltaS` (lines 180–191).
  - Hardcoded colors exist (e.g. `text-cyan-400`, `text-amber-400`, `border-cyan-500/20`) violating `GEMINI.md` dynamic theme binding rules (`rgb(${theme.glowPrimary})`).

#### B. `src/hooks/useRPGSystem.ts`
- **Current Interface & Flow**:
  - Lines 70–124: `processRPG` signature:
```typescript
processRPG: (
  finalWpm: number,
  finalAcc: number,
  currentMaxCombo: number,
  _wordCount: number,
  targetTextLength: number,
  microDrillActive: boolean,
  keystrokeLog: Array<{ expected: string; isError: boolean; isBackspace?: boolean; time: number }>,
  onLevelUp: () => void
) => { newXp: number; newTestsCompleted: number; updatedHeatmap: Record<string, any>; newBestCombo: number }
```
  - Current XP calculation (line 111):
    `const gained = Math.floor(finalWpm * (finalAcc / 100) * lengthMod * 2);`
  - Zero bonuses awarded for 100% Flawless runs (+50% bonus missing), combo milestones (50+, 100+, 200+), or metronome consistency (>85%).
  - `checkAchievements` evaluates 17 existing achievements in `ACHIEVEMENTS`.

#### C. `src/utils/shareCard.ts`
- **Current Interface**:
```typescript
export interface ShareCardData {
  wpm: number;
  rawWpm: number;
  accuracy: number;
  consistency: number;
  grade: string;
  themeName: string;
  glowPrimary: string;
  glowSecondary: string;
}
```
- Renders 1200x630 canvas via `renderResultCard(data)`. Grade is rendered with `ctx.fillText(data.grade, ...)` on line 81.

#### D. `src/hooks/useModeLeaderboard.ts`
- **Current Interface**:
```typescript
export interface ModeScoreRow {
  user_id: string;
  username: string;
  wpm: number;
  accuracy: number;
  consistency: number | null;
}

export interface RivalGhost {
  userId: string;
  username: string;
  wpm: number;
  samples: PaceSample[];
}
```
- `fetchRivalGhost` (lines 59–80) queries `username, wpm, ghost` from Supabase table `mode_scores`.

#### E. `src/App.tsx` & `src/components/RaceResultsScreen.tsx`
- In `App.tsx` (lines 1562–1588), `resultsProps` is constructed and passed to `<ResultsScreen {...resultsProps} />` and `<RaceResultsScreen {...resultsProps} />`.
- In `RaceResultsScreen.tsx` (lines 394–421), `displayProps` merges `resultsProps` with competitor telemetry and forwards to `<ResultsScreen {...displayProps} compact hideActions />`.

---

## 2. Logic Chain

### 2.1 Accolades Engine Specification (`calculateAccolades`)

Accolades recognize four distinct dimensions of typing mastery:
1. **Flawless Execution**: Zero errors on the test run.
2. **Centurion Streak**: Unbroken combo streak of 100+ keystrokes.
3. **Surgical Precision**: Sustained ultra-high accuracy (≥98%) on substantial passage length (≥50 words).
4. **Flow State**: Steady cadence with metronomic rhythm (≥88% consistency).

#### Mathematical Definitions & Safeguards:
- Let $A = \text{Accuracy } \in [0, 100]$, $S = \text{Flawless Streak (Max Combo)} \ge 0$, $R = \text{Consistency } \in [0, 100]$, $W = \text{Total Words} \ge 0$, $E = \text{Raw Errors} \ge 0$.
- **Flawless**:
  - `unlocked = (A === 100 && E === 0 && W > 0)`
  - Progress: `current = unlocked ? 100 : (E === 0 ? A : Math.max(0, A - E * 5))`, `target = 100`, `unit = E > 0 ? (E + ' ERR') : '% ACC'`.
- **Centurion Streak**:
  - `unlocked = (S >= 100)`
  - Progress: `current = Math.min(100, S)`, `target = 100`, `unit = 'COMBO'`.
- **Surgical Precision**:
  - `unlocked = (A >= 98 && W >= 50)`
  - Progress: `current = W < 50 ? W : A`, `target = W < 50 ? 50 : 98`, `unit = W < 50 ? 'WORDS' : '% ACC'`.
- **Flow State**:
  - `unlocked = (R >= 88 && W > 0)`
  - Progress: `current = Math.min(88, R)`, `target = 88`, `unit = '% CONS'`.

### 2.2 Preserving Interface Contracts & Preventing Regressions

1. **`ResultsScreenProps` Non-Breaking Extension**:
   - Keep all existing props mandatory as before.
   - Add optional props:
     - `accolades?: AccoladeBadge[]`
     - `cpiBreakdown?: CPIBreakdown`
     - `xpBreakdown?: XpBreakdown`
     - `ghostDeltaAcc?: number`
     - `ghostDeltaCons?: number`
   - In `ResultsScreen.tsx`: If `accolades` is not passed via props, compute it safely via `useMemo(() => calculateAccolades(accuracy, flawlessStreak, consistency, Math.round(keystrokeLog.length / 5), errorTimes.length), [accuracy, flawlessStreak, consistency, keystrokeLog, errorTimes])`.
   - This guarantees that both `App.tsx` and `RaceResultsScreen.tsx` continue functioning without requiring lockstep breaking prop updates.

2. **`useRPGSystem.ts` Non-Breaking Extension**:
   - Add `xpBreakdownLast: XpBreakdown | null` state.
   - In `processRPG`, accept optional `consistency?: number` and `rawErrors?: number`.
   - Compute `calculateXPProgression` and store `xpBreakdownLast`.
   - Return `{ newXp, newTestsCompleted, updatedHeatmap, newBestCombo, xpBreakdown }` so callers can optionally inspect it.

3. **`shareCard.ts` Non-Breaking Extension**:
   - `ShareCardData` interface gains optional `cpi?: number`, `accolades?: string[]`, `flawlessStreak?: number`.
   - `renderResultCard` renders `grade` ('S+', 'S', etc.) and optional accolade tags.

4. **`useModeLeaderboard.ts` Non-Breaking Extension**:
   - `RivalGhost` adds optional `accuracy?: number`, `consistency?: number`.
   - `fetchRivalGhost` selects `username, wpm, accuracy, consistency, ghost`.
   - If missing from older Supabase rows, defaults gracefully to `undefined` without failing JSON parsing.

---

## 3. Caveats

- **Test Harness TypeScript Erasable Syntax**:
  `npm run build` runs `tsc -b && vite build`. In `src/tests/testHarness.ts`, parameter properties (`public actual?: unknown` in constructor) conflict with `erasableSyntaxOnly: true`. This is an independent fix needed in test harness files, not in application runtime code.
- **Dynamic Theme Binding Discipline**:
  Per `GEMINI.md`, all accolade badges and results screen cards must strictly bind colors dynamically: `style={{ color: 'rgb(' + theme.glowPrimary + ')', borderColor: 'rgba(' + theme.glowPrimary + ', 0.3)' }}`. No static accent classes (`text-cyan-400`, `text-amber-400`, etc.) may be used on theme-sensitive badges.

---

## 4. Conclusion & Complete Implementation Blueprint

### 4.1 `src/lib/scoringEngine.ts` Blueprint

```typescript
export type PerformanceGrade = 'S+' | 'S' | 'A' | 'B' | 'C' | 'D';

export type AccoladeId = 'flawless' | 'centurion' | 'surgical' | 'flow_state';

export interface AccoladeBadge {
  id: AccoladeId;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  unlocked: boolean;
  tier: 'gold' | 'emerald' | 'cyan' | 'purple';
  progress?: {
    current: number;
    target: number;
    unit: string;
  };
}

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

export interface XpBreakdown {
  baseXp: number;
  flawlessBonusPct: number;
  comboBonusPct: number;
  consistencyBonusPct: number;
  totalMultiplier: number;
  totalXp: number;
}

/**
 * Calculates structured precision accolade badges for post-test display.
 */
export function calculateAccolades(
  accuracy: number,
  flawlessStreak: number,
  consistency: number,
  totalWords: number,
  rawErrors: number
): AccoladeBadge[] {
  const safeAccuracy = Math.max(0, Math.min(100, isNaN(accuracy) ? 0 : accuracy));
  const safeStreak = Math.max(0, isNaN(flawlessStreak) ? 0 : flawlessStreak);
  const safeConsistency = Math.max(0, Math.min(100, isNaN(consistency) ? 0 : consistency));
  const safeWords = Math.max(0, isNaN(totalWords) ? 0 : totalWords);
  const safeErrors = Math.max(0, isNaN(rawErrors) ? 0 : rawErrors);

  const isFlawlessUnlocked = safeAccuracy === 100 && safeErrors === 0 && safeWords > 0;
  const isCenturionUnlocked = safeStreak >= 100;
  const isSurgicalUnlocked = safeAccuracy >= 98 && safeWords >= 50;
  const isFlowStateUnlocked = safeConsistency >= 88 && safeWords > 0;

  return [
    {
      id: 'flawless',
      title: 'Flawless',
      subtitle: 'Zero Mistakes',
      description: '100% accuracy with 0 keystroke errors.',
      icon: 'Sparkles',
      unlocked: isFlawlessUnlocked,
      tier: 'gold',
      progress: {
        current: isFlawlessUnlocked ? 100 : (safeErrors === 0 ? safeAccuracy : Math.max(0, safeAccuracy - safeErrors * 5)),
        target: 100,
        unit: safeErrors > 0 ? `${safeErrors} ERR` : '% ACC',
      },
    },
    {
      id: 'centurion',
      title: 'Centurion Streak',
      subtitle: '100+ Combo',
      description: 'Maintained an unbroken streak of 100+ flawless keystrokes.',
      icon: 'ShieldCheck',
      unlocked: isCenturionUnlocked,
      tier: 'purple',
      progress: {
        current: Math.min(100, safeStreak),
        target: 100,
        unit: 'COMBO',
      },
    },
    {
      id: 'surgical',
      title: 'Surgical Precision',
      subtitle: '98%+ Acc on 50+ Words',
      description: 'Delivered ≥98% accuracy on a full session (≥50 words).',
      icon: 'Crosshair',
      unlocked: isSurgicalUnlocked,
      tier: 'emerald',
      progress: {
        current: safeWords < 50 ? safeWords : safeAccuracy,
        target: safeWords < 50 ? 50 : 98,
        unit: safeWords < 50 ? 'WORDS' : '% ACC',
      },
    },
    {
      id: 'flow_state',
      title: 'Flow State',
      subtitle: '88%+ Rhythm',
      description: 'Achieved ≥88% rhythm consistency with steady cadence.',
      icon: 'Activity',
      unlocked: isFlowStateUnlocked,
      tier: 'cyan',
      progress: {
        current: Math.min(88, safeConsistency),
        target: 88,
        unit: '% CONS',
      },
    },
  ];
}
```

### 4.2 Accolade Badges UI Component Blueprint for `ResultsScreen.tsx`

```tsx
{/* Precision Accolades Showcase */}
<div className="glass-panel rounded-3xl p-6 mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
  <div className="flex w-full justify-between items-end mb-4">
    <span className="text-zinc-400 text-[10px] font-black tracking-widest flex items-center">
      <Award size={14} className="mr-2" style={{ color: `rgb(${theme.glowPrimary})` }} />
      PRECISION ACCOLADES
    </span>
    <span className="text-[9px] font-black tracking-widest text-zinc-500 uppercase">
      {accolades.filter(a => a.unlocked).length} OF {accolades.length} UNLOCKED
    </span>
  </div>

  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
    {accolades.map(accolade => {
      const isUnlocked = accolade.unlocked;
      return (
        <div
          key={accolade.id}
          className={`relative overflow-hidden rounded-2xl p-4 border transition-all duration-300 ${
            isUnlocked
              ? 'bg-white/5 shadow-lg backdrop-blur-md'
              : 'bg-black/20 border-white/5 opacity-40'
          }`}
          style={isUnlocked ? { borderColor: `rgba(${theme.glowPrimary}, 0.3)` } : undefined}
        >
          {isUnlocked && (
            <div
              className="absolute -top-10 -right-10 w-24 h-24 rounded-full blur-2xl pointer-events-none"
              style={{ backgroundColor: `rgba(${theme.glowPrimary}, 0.2)` }}
            />
          )}
          <div className="flex items-center gap-3 mb-2">
            <div
              className="p-2.5 rounded-xl border flex items-center justify-center"
              style={
                isUnlocked
                  ? {
                      backgroundColor: `rgba(${theme.glowPrimary}, 0.15)`,
                      borderColor: `rgba(${theme.glowPrimary}, 0.4)`,
                      color: `rgb(${theme.glowPrimary})`,
                    }
                  : { backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)', color: '#71717a' }
              }
            >
              {accolade.id === 'flawless' && <Sparkles size={18} />}
              {accolade.id === 'centurion' && <ShieldCheck size={18} />}
              {accolade.id === 'surgical' && <Crosshair size={18} />}
              {accolade.id === 'flow_state' && <Activity size={18} />}
            </div>
            <div>
              <h4 className={`text-xs font-black tracking-wider uppercase ${isUnlocked ? 'text-white' : 'text-zinc-500'}`}>
                {accolade.title}
              </h4>
              <p className="text-[10px] font-bold tracking-tight text-zinc-400">
                {accolade.subtitle}
              </p>
            </div>
          </div>
          <p className="text-[10px] text-zinc-400 line-clamp-2 leading-relaxed">
            {accolade.description}
          </p>
        </div>
      );
    })}
  </div>
</div>
```

---

## 5. Verification Method

### 5.1 Verification Commands
1. **TypeScript Typecheck**:
```bash
npx tsc --noEmit
```
2. **Build Verification**:
```bash
npm run build
```

### 5.2 Specific Files to Inspect
1. `src/lib/scoringEngine.ts`: Verify `calculateAccolades` return structure and mathematical clamp guarantees.
2. `src/components/ResultsScreen.tsx`: Verify non-breaking optional props and dynamic theme binding on accolade badges.
3. `src/hooks/useRPGSystem.ts`: Verify `processRPG` XP multiplier calculation and `xpBreakdownLast` export.
4. `src/utils/shareCard.ts`: Verify `ShareCardData` backward-compatible extension.
5. `src/hooks/useModeLeaderboard.ts`: Verify `RivalGhost` accuracy and consistency fields.

### 5.3 Invalidation Conditions
- Any changes to `ResultsScreenProps` that make existing mandatory props incompatible with `App.tsx` or `RaceResultsScreen.tsx`.
- Hardcoding static accent classes (`text-cyan-400`, `text-amber-400`) instead of `rgb(${theme.glowPrimary})`.
- Division by zero or NaN returns on empty/zero-word inputs in `calculateAccolades`.
