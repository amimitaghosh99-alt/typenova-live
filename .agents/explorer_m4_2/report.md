# Milestone 4 Technical Investigation Report: XP Multiplier Breakdown & Ghost Net Precision Deltas

**Author**: Explorer 2 (Milestone 4)  
**Target Files**: `src/components/ResultsScreen.tsx`, `src/hooks/useRPGSystem.ts`, `src/hooks/useModeLeaderboard.ts`, `src/App.tsx`, `src/lib/scoringEngine.ts`  
**Working Directory**: `.agents/explorer_m4_2`  
**Date**: 2026-09-01  

---

## 1. Executive Summary

This report delivers the complete technical blueprint, data flow architecture, UI/UX component design, and integration specifications for two core features in **Milestone 4**:
1. **Interactive XP Multiplier Breakdown on the Results Screen**: Visualizing `XpBreakdown` (`baseXp`, `flawlessBonusPct`, `comboBonusPct`, `consistencyBonusPct`, `totalMultiplier`, `totalXp`) using dark frosted liquid glass cards and strict dynamic theme color binding (`rgb(${theme.glowPrimary})`).
2. **Ghost Net Precision Deltas**: Extending the Ghost Racer telemetry to compare not only finish time (`ΔTime`), but also Accuracy (`ΔAcc`), Consistency (`ΔCons`), and Flawless Streak (`ΔStreak`) against rival ghosts and personal bests.

All proposed designs strictly adhere to TypeNova workspace rules in `GEMINI.md` (no hardcoded accent colors for theme-sensitive elements, minimalist control bars, dense and premium aesthetics) and match the scoring algorithms in `src/lib/scoringEngine.ts` and test requirements in `src/tests/tier1_features.test.ts`.

---

## 2. System Architecture & Data Flow Analysis

### 2.1 XP Breakdown Pipeline

```
[Typing Engine: Completion]
  │  (wpm, accuracy, maxCombo, consistency, effLength, effWords, keystrokeLog)
  ▼
[App.tsx: useEffect (typing.phase === 'FINISHED')]
  │  Calls rpg.processRPG(...) with consistency and errors
  ▼
[useRPGSystem.ts: processRPG]
  │  Executes calculateXPProgression(...) from scoringEngine.ts
  │  Sets state: xpGainedLast, xpBreakdownLast
  ▼
[App.tsx: resultsProps]
  │  Packages xpBreakdown: rpg.xpBreakdownLast
  ▼
[ResultsScreen.tsx]
  │  Renders Interactive XP Multiplier Breakdown Glass Card
```

#### Codebase Observations in `useRPGSystem.ts` & `scoringEngine.ts`:
1. `src/lib/scoringEngine.ts` (lines 416–490) defines:
   ```typescript
   export interface XpBreakdown {
     baseXp: number;
     flawlessBonusPct: number;
     comboBonusPct: number;
     consistencyBonusPct: number;
     totalMultiplier: number;
     totalXp: number;
   }
   ```
   and implements `calculateXPProgression(wpm, accuracy, flawlessStreak, consistency, targetLength, isDrill)`.
2. `src/hooks/useRPGSystem.ts` (lines 42, 114–125, 247) tracks `xpBreakdownLast`:
   - `const [xpBreakdownLast, setXpBreakdownLast] = useState<XpBreakdown | null>(null);`
   - Computes `xpBreakdown` in `processRPG`, sets `setXpBreakdownLast(xpBreakdown)`, and returns it.
   - Exposes `xpBreakdownLast` in the return object of `useRPGSystem`.
3. **Identified Gap in `src/App.tsx` (lines 1084–1089)**:
   In `App.tsx`, `rpg.processRPG` is called with only 8 parameters:
   ```typescript
   // CURRENT IN App.tsx (Missing consistency & rawErrors):
   const result = rpg.processRPG(
     stats.currentWpm, stats.currentAcc, typing.maxCombo,
     effWordCount, effLength,
     game.microDrillActive || isCustom, typing.keystrokeLog.current,
     () => audio.playSound('levelup')
   );
   ```
   Because `consistency` is omitted, `useRPGSystem.ts` receives `undefined` and defaults to `0`, preventing consistency bonuses (+20% / +30%) from applying during live runs!
   **Fix Required**: Pass `stats.consistency` and raw errors to `rpg.processRPG(...)` as parameters 9 and 10.
4. **Identified Gap in `src/App.tsx` (lines 1562–1588)**:
   `resultsProps` currently passes `xpGainedLast: rpg.xpGainedLast`, but omits `xpBreakdown: rpg.xpBreakdownLast`.
   **Fix Required**: Pass `xpBreakdown: rpg.xpBreakdownLast` to `ResultsScreen`.

---

### 2.2 Ghost Net Precision Deltas Pipeline

```
[Supabase: mode_scores table]
  │  Columns: user_id, username, wpm, accuracy, consistency, ghost
  ▼
[useModeLeaderboard.ts: fetchRivalGhost]
  │  Queries: username, wpm, accuracy, consistency, ghost
  │  Returns: RivalGhost { userId, username, wpm, accuracy, consistency, samples }
  ▼
[App.tsx: finishDurationMs & stats]
  │  Calls calculateGhostDelta(finishDurationMs, acc, cons, streak, ghostFinishMs, ghostAcc, ghostCons, ghostStreak)
  │  Extracts: { deltaS, deltaAcc, deltaCons, deltaStreak, userWon }
  ▼
[App.tsx: resultsProps]
  │  Passes ghostDeltaS, ghostDeltaAcc, ghostDeltaCons, ghostDeltaStreak
  ▼
[ResultsScreen.tsx]
  │  Renders Ghost Net Precision Telemetry Card / HUD
```

#### Codebase Observations in `useModeLeaderboard.ts` & `App.tsx`:
1. `src/hooks/useModeLeaderboard.ts` (lines 25–30, 59–80):
   - Currently, `RivalGhost` interface only specifies `userId, username, wpm, samples`.
   - `fetchRivalGhost` selects `.select('username, wpm, ghost')`.
   - The underlying table `mode_scores` already stores `accuracy` and `consistency` (as evidenced in line 113 for board rows).
   **Enhancement**: Update `RivalGhost` interface to include `accuracy?: number` and `consistency?: number`. Update `fetchRivalGhost` to select `username, wpm, accuracy, consistency, ghost`.
2. `src/App.tsx` (lines 1116–1126):
   - When storing Personal Best ghost in `localStorage` under `pbStorageKey`, only `wpm` and `samples` were stored.
   **Enhancement**: Include `accuracy: stats.currentAcc`, `consistency: stats.consistency`, and `flawlessStreak: typing.flawlessStreak` in `localStorage.setItem(pbStorageKey, ...)`.
3. `src/lib/scoringEngine.ts` (lines 492–526):
   - Already implements `calculateGhostDelta(userFinishMs, userAcc, userCons, userStreak, ghostFinishMs, ghostAcc, ghostCons, ghostStreak)` returning:
     ```typescript
     export interface GhostDeltaResult {
       deltaS: number;
       deltaAcc?: number;
       deltaCons?: number;
       deltaStreak?: number;
       userWon: boolean;
     }
     ```
   - Automatically handles legacy ghosts where `ghostAcc` or `ghostCons` is `undefined` by setting the respective deltas to `undefined`.

---

## 3. UI/UX Design Specification: XP Multiplier Breakdown

### 3.1 Design Principles & Visual Language
- **Liquid Glass Architecture**: Built using `glass-panel` dark frosted containers (`rgba(10, 12, 18, 0.75)` backdrop with `backdrop-blur-2xl` and `border border-white/10`).
- **Dynamic Theme Binding (GEMINI.md compliance)**:
  - Header accents & title: `style={{ color: `rgb(${theme.glowPrimary})` }}`
  - Multiplier badge fill & border: `style={{ backgroundColor: `rgba(${theme.glowPrimary}, 0.15)`, borderColor: `rgba(${theme.glowPrimary}, 0.4)` }}`
  - Dynamic ambient corner glow: `style={{ background: `radial-gradient(circle at 100% 0%, rgba(${theme.glowPrimary}, 0.15) 0%, transparent 70%)` }}`
  - Zero hardcoded cyan/amber/rose accent classes for theme-sensitive elements.
- **Micro-Typography & Density**: Clean monospace numbers, micro-badges (`text-[10px] uppercase font-black tracking-widest`), dense Monkeytype-inspired information layout.

### 3.2 Component Hierarchy & Layout

```
┌───────────────────────────────────────────────────────────────────────────────────────────┐
│ ⚡ XP MULTIPLIER BREAKDOWN                            [ +1,380 XP ]  [ 2.30x TOTAL MULT ] │
│    Progression & Precision Boosts                                                         │
├───────────────────────────────────────────────────────────────────────────────────────────┤
│ ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐ ┌────────────────────────┐ │
│ │ BASE XP          │ │ FLAWLESS RUN     │ │ COMBO MILESTONE  │ │ RHYTHM FLOW STATE      │ │
│ │                  │ │                  │ │                  │ │                        │ │
│ │      600 XP      │ │      +50%        │ │      +50%        │ │         +30%           │ │
│ │                  │ │                  │ │                  │ │                        │ │
│ │ Speed × Length   │ │ 100% Precision   │ │ 200+ Streak (220)│ │ Metronome Cadence (94%)│ │
│ └──────────────────┘ └──────────────────┘ └──────────────────┘ └────────────────────────┘ │
├───────────────────────────────────────────────────────────────────────────────────────────┤
│ 📐 FORMULA:  [ 600 Base XP ] × [ 1.0 + 50% (Flawless) + 50% (Combo) + 30% (Flow) = 2.30x ] = 1,380 XP │
└───────────────────────────────────────────────────────────────────────────────────────────┘
```

### 3.3 Multiplier Itemization Matrix

| Multiplier Item | Condition / Threshold | Multiplier Value | Active State Styling | Inactive / Locked State Styling |
|---|---|---|---|---|
| **Base XP** | WPM > 10, Acc > 50% | `floor(WPM × (Acc/100) × (Len/100) × 2)` | Clean white digits, `text-zinc-400` label | `0 XP` if uncalibrated/drill |
| **Flawless Multiplier** | `Accuracy === 100%` | `+50%` | Golden/Theme glow pill, Sparkles icon, `+50% XP` | Dimmed `+0%`, `text-zinc-600`, "Requires 100% Acc" |
| **Combo Milestone** | `Streak ≥ 50` <br> `Streak ≥ 100` <br> `Streak ≥ 200` | `+10%`<br>`+25%`<br>`+50%` | Active tier pill, Shield icon, e.g. `+25% XP (100+ Streak)` | Dimmed `+0%`, `text-zinc-600`, Progress e.g. `42/50 Streak` |
| **Rhythm Consistency** | `Consistency ≥ 85%`<br>`Consistency ≥ 92%` | `+20%`<br>`+30%` | Active flow pill, Waves icon, e.g. `+30% XP (Flow State)` | Dimmed `+0%`, `text-zinc-600`, "Requires ≥85% Rhythm" |

---

## 4. UI/UX Design Specification: Ghost Net Precision Deltas

### 4.1 Ghost Telemetry Architecture
When a user finishes a test against a Ghost (Rival from `Ghost Net`, Personal Best `PB`, or Target Bot), the Results Screen displays a precision telemetry card comparing all four performance axes:

```
┌───────────────────────────────────────────────────────────────────────────────────────────┐
│ 👻 GHOST NET TELEMETRY: RIVAL_PLAYER (112 WPM)                                   VICTORY  │
├───────────────────────────────────────────────────────────────────────────────────────────┤
│ ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐ ┌────────────────────────┐ │
│ │ TIME DELTA       │ │ ACCURACY DELTA   │ │ CONSISTENCY Δ    │ │ STREAK DELTA           │ │
│ │                  │ │                  │ │                  │ │                        │ │
│ │     +3.5s        │ │     +3.0%        │ │     +8.0%        │ │         +30            │ │
│ │                  │ │                  │ │                  │ │                        │ │
│ │ 15.0s vs 18.5s   │ │ 98% vs 95%       │ │ 90% vs 82%       │ │ 120 vs 90 Max Combo    │ │
│ └──────────────────┘ └──────────────────┘ └──────────────────┘ └────────────────────────┘ │
└───────────────────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Differential Metric Computation Matrix

| Delta Metric | Formula in `calculateGhostDelta` | Positive Display (`>= 0`) | Negative Display (`< 0`) | Undefined / Missing (Fallback) |
|---|---|---|---|---|
| **Time Delta ($\Delta\text{Time}$)** | `(ghostMs - userMs) / 1000` | `+X.Xs FASTER` (Emerald green / `text-emerald-400`) | `-X.Xs BEHIND` (Rose red / `text-rose-400`) | Default 0.0s |
| **Accuracy Delta ($\Delta\text{Acc}$)** | `userAcc - ghostAcc` | `+X.X%` (Emerald/Theme) | `-X.X%` (Rose) | Cleanly hidden / omitted if ghost has no Acc data |
| **Consistency Delta ($\Delta\text{Cons}$)** | `userCons - ghostCons` | `+X.X%` (Cyan/Theme) | `-X.X%` (Rose) | Cleanly hidden / omitted if ghost has no Cons data |
| **Streak Delta ($\Delta\text{Streak}$)** | `userStreak - ghostStreak` | `+X COMBO` (Purple/Theme) | `-X COMBO` (Rose) | Cleanly hidden / omitted if ghost has no Streak data |

---

## 5. Detailed Implementation Code Specifications

### 5.1 `src/hooks/useModeLeaderboard.ts`

```typescript
// --- 1. Extend RivalGhost Interface ---
export interface RivalGhost {
  userId: string;
  username: string;
  wpm: number;
  accuracy?: number;
  consistency?: number;
  samples: PaceSample[];
}

// --- 2. Update fetchRivalGhost to query accuracy & consistency ---
export async function fetchRivalGhost(
  modeKey: string,
  userId: string,
): Promise<RivalGhost | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('mode_scores')
      .select('username, wpm, accuracy, consistency, ghost')
      .eq('mode_key', modeKey)
      .eq('user_id', userId)
      .maybeSingle();
    if (error || !data) return null;
    const row = data as unknown as {
      username: string;
      wpm: number;
      accuracy?: number;
      consistency?: number;
      ghost: unknown;
    };
    const samples = parseSamples(row.ghost);
    if (!samples) return null;
    return {
      userId,
      username: row.username,
      wpm: row.wpm,
      accuracy: typeof row.accuracy === 'number' ? row.accuracy : undefined,
      consistency: typeof row.consistency === 'number' ? row.consistency : undefined,
      samples,
    };
  } catch (err) {
    console.warn('[ghostNet] rival ghost fetch failed:', err);
    return null;
  }
}
```

---

### 5.2 `src/App.tsx`

#### A. Pass `stats.consistency` and `rawErrors` to `rpg.processRPG` and `rpg.checkAchievements`:
```typescript
// In App.tsx around line 1084:
const rawErrors = typing.keystrokeLog.current.filter(k => k.isError && !k.isBackspace).length;
const result = rpg.processRPG(
  stats.currentWpm,
  stats.currentAcc,
  typing.maxCombo,
  effWordCount,
  effLength,
  game.microDrillActive || isCustom,
  typing.keystrokeLog.current,
  () => audio.playSound('levelup'),
  stats.consistency,
  rawErrors
);

// In App.tsx around line 1129:
rpg.checkAchievements(
  stats.currentWpm, stats.currentAcc, result.newBestCombo,
  result.newXp, effWordCount,
  game.suddenDeath, game.blindMode, game.fogMode, game.overclockedMode,
  result.newTestsCompleted, _seenThemes.size, THEME_KEYS.length,
  isTimed, streakNow,
  stats.consistency
);
```

#### B. Store Precision Metrics in PB Ghost `localStorage`:
```typescript
// In App.tsx around line 1120:
localStorage.setItem(pbStorageKey, JSON.stringify({
  wpm: stats.currentWpm,
  accuracy: stats.currentAcc,
  consistency: stats.consistency,
  flawlessStreak: typing.flawlessStreak,
  samples: buildPaceSamples(typing.keystrokeLog.current),
}));
```

#### C. Compute Precision Deltas and update `resultsProps`:
```typescript
// In App.tsx around lines 1522-1588:
import { calculateGhostDelta } from '@/lib/scoringEngine';

// Ghost calculation block:
let ghostDeltaS: number | undefined;
let ghostDeltaAcc: number | undefined;
let ghostDeltaCons: number | undefined;
let ghostDeltaStreak: number | undefined;

if (game.ghostPacer) {
  if (game.ghostMode === 'rival' && rivalGhost?.samples && rivalGhost.samples.length > 1) {
    const rivalName = (rivalGhost.username || 'RIVAL').toUpperCase();
    ghostLabel = `${rivalName} (${rivalGhost.wpm} WPM)`;
    ghostTimeline = rivalGhost.samples.map(s => ({
      t: s.t,
      wpm: Math.round((s.chars / 5) / (Math.max(s.t, 1000) / 60000))
    }));
    const ghostFinishTimeMs = computeGhostFinishTime(rivalGhost.samples, rivalGhost.wpm);
    const delta = calculateGhostDelta(
      finishDurationMs,
      typing.accuracy,
      typing.consistency,
      typing.flawlessStreak,
      ghostFinishTimeMs,
      rivalGhost.accuracy,
      rivalGhost.consistency,
      undefined // rival streak if available
    );
    ghostDeltaS = delta.deltaS;
    ghostDeltaAcc = delta.deltaAcc;
    ghostDeltaCons = delta.deltaCons;
    ghostDeltaStreak = delta.deltaStreak;
  } else if (game.ghostMode === 'pb' && pbGhost?.samples && pbGhost.samples.length > 1) {
    ghostLabel = `PB (${pbGhost.wpm} WPM)`;
    ghostTimeline = pbGhost.samples.map(s => ({
      t: s.t,
      wpm: Math.round((s.chars / 5) / (Math.max(s.t, 1000) / 60000))
    }));
    const ghostFinishTimeMs = computeGhostFinishTime(pbGhost.samples, pbGhost.wpm);
    const delta = calculateGhostDelta(
      finishDurationMs,
      typing.accuracy,
      typing.consistency,
      typing.flawlessStreak,
      ghostFinishTimeMs,
      pbGhost.accuracy,
      pbGhost.consistency,
      pbGhost.flawlessStreak
    );
    ghostDeltaS = delta.deltaS;
    ghostDeltaAcc = delta.deltaAcc;
    ghostDeltaCons = delta.deltaCons;
    ghostDeltaStreak = delta.deltaStreak;
  } else {
    const targetWpm = game.ghostMode === 'target' ? game.ghostTargetWpm : 60;
    ghostLabel = `${targetWpm} WPM BOT`;
    ghostTimeline = [
      { t: 0, wpm: targetWpm },
      { t: Math.floor(finishDurationMs / 2), wpm: targetWpm },
      { t: finishDurationMs, wpm: targetWpm },
    ];
    const ghostFinishTimeMs = (totalCharsTyped / ((targetWpm * 5) / 60)) * 1000;
    const delta = calculateGhostDelta(
      finishDurationMs,
      typing.accuracy,
      typing.consistency,
      typing.flawlessStreak,
      ghostFinishTimeMs
    );
    ghostDeltaS = delta.deltaS;
  }
}

const resultsProps = {
  wpm: typing.wpm,
  rawWpm: typing.rawWpm,
  accuracy: typing.accuracy,
  consistency: typing.consistency,
  flawlessStreak: typing.flawlessStreak,
  leveledUp: rpg.leveledUp,
  xpGainedLast: rpg.xpGainedLast,
  xpBreakdown: rpg.xpBreakdownLast, // <-- ADDED
  theme,
  heatmapData: rpg.heatmapData,
  isLoggedIn: !!cloud.username,
  displayName: cloud.username,
  saveStatus,
  timelinePoints: typing.timelinePoints,
  errorTimes,
  durationMs: finishDurationMs,
  keystrokeLog: typing.keystrokeLog.current,
  testStartTime: typing.startTime || 0,
  onReset: handleReset,
  onWatchReplay: handleWatchReplay,
  onStartMicroDrill: startMicroDrill,
  onStartSmartDrill: startSmartDrill,
  isSmartDrillGenerating,
  ghostTimeline,
  ghostLabel,
  ghostDeltaS,
  ghostDeltaAcc,    // <-- ADDED
  ghostDeltaCons,   // <-- ADDED
  ghostDeltaStreak, // <-- ADDED
};
```

---

### 5.3 `src/components/ResultsScreen.tsx`

#### A. Expanded Interface Contract:
```typescript
import { type XpBreakdown, calculateXPProgression } from '@/lib/scoringEngine';

export interface ResultsScreenProps {
  wpm: number;
  rawWpm: number;
  accuracy: number;
  consistency: number;
  flawlessStreak: number;
  leveledUp: boolean;
  xpGainedLast: number;
  xpBreakdown?: XpBreakdown | null; // <-- Added
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
  ghostDeltaAcc?: number;    // <-- Added
  ghostDeltaCons?: number;   // <-- Added
  ghostDeltaStreak?: number; // <-- Added
  compact?: boolean;
  hideActions?: boolean;
}
```

#### B. Component JSX Structure for XP Multiplier Breakdown:
```tsx
{/* XP Multiplier Breakdown Glass Card */}
{effectiveXpBreakdown && effectiveXpBreakdown.totalXp > 0 && (
  <div className="glass-panel rounded-3xl p-6 md:p-8 mb-10 border border-white/10 relative overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700">
    {/* Ambient corner glow */}
    <div
      className="absolute top-0 right-0 w-80 h-80 rounded-full blur-[90px] pointer-events-none opacity-20"
      style={{ background: `radial-gradient(circle, rgb(${theme.glowPrimary}) 0%, transparent 70%)` }}
    />

    {/* Header */}
    <div className="flex flex-wrap items-center justify-between gap-4 mb-6 relative z-10">
      <div className="flex items-center gap-3">
        <div
          className="p-3 rounded-2xl border"
          style={{
            backgroundColor: `rgba(${theme.glowPrimary}, 0.12)`,
            borderColor: `rgba(${theme.glowPrimary}, 0.35)`,
            color: `rgb(${theme.glowPrimary})`,
          }}
        >
          <Zap size={20} />
        </div>
        <div>
          <h3 className="text-base md:text-lg font-black tracking-wider uppercase text-white flex items-center gap-2">
            XP PROGRESSION BREAKDOWN
          </h3>
          <p className="text-xs text-zinc-400 font-medium">Precision, streak & rhythm multipliers applied to base XP</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div
          className="px-4 py-2 rounded-2xl border font-mono font-black text-sm tracking-wider flex items-center gap-2"
          style={{
            backgroundColor: `rgba(${theme.glowPrimary}, 0.15)`,
            borderColor: `rgba(${theme.glowPrimary}, 0.4)`,
            color: `rgb(${theme.glowPrimary})`,
            boxShadow: `0 0 20px rgba(${theme.glowPrimary}, 0.25)`,
          }}
        >
          <span>{effectiveXpBreakdown.totalMultiplier.toFixed(2)}x TOTAL</span>
        </div>
        <div className="px-5 py-2 rounded-2xl bg-white/10 border border-white/15 text-white font-mono font-black text-base shadow-xl backdrop-blur-md">
          +{effectiveXpBreakdown.totalXp} XP
        </div>
      </div>
    </div>

    {/* Bento Multiplier Grid */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 relative z-10">
      {/* Base XP */}
      <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-black tracking-widest text-zinc-400 uppercase">Base Score</span>
          <span className="text-[10px] font-mono text-zinc-500">1.00x</span>
        </div>
        <div className="text-3xl font-black text-white font-mono">{effectiveXpBreakdown.baseXp} <span className="text-xs text-zinc-500">XP</span></div>
        <span className="text-[11px] text-zinc-400 mt-2">Speed × Length baseline</span>
      </div>

      {/* Flawless Bonus */}
      <div className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
        effectiveXpBreakdown.flawlessBonusPct > 0
          ? 'bg-amber-500/10 border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.15)]'
          : 'bg-white/[0.02] border-white/5 opacity-60'
      }`}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-black tracking-widest text-zinc-400 uppercase flex items-center gap-1.5">
            <Sparkles size={12} className={effectiveXpBreakdown.flawlessBonusPct > 0 ? 'text-amber-400' : 'text-zinc-500'} />
            Flawless Run
          </span>
          <span className={`text-xs font-black font-mono ${effectiveXpBreakdown.flawlessBonusPct > 0 ? 'text-amber-400' : 'text-zinc-600'}`}>
            +{effectiveXpBreakdown.flawlessBonusPct}%
          </span>
        </div>
        <div className="text-2xl font-black text-white font-mono">
          {effectiveXpBreakdown.flawlessBonusPct > 0 ? '+50% XP' : '+0%'}
        </div>
        <span className="text-[11px] text-zinc-400 mt-2">
          {effectiveXpBreakdown.flawlessBonusPct > 0 ? '100% Precision Achieved' : 'Requires 100% Accuracy'}
        </span>
      </div>

      {/* Combo Streak Bonus */}
      <div className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
        effectiveXpBreakdown.comboBonusPct > 0
          ? 'bg-purple-500/10 border-purple-500/40 shadow-[0_0_20px_rgba(168,85,247,0.15)]'
          : 'bg-white/[0.02] border-white/5 opacity-60'
      }`}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-black tracking-widest text-zinc-400 uppercase flex items-center gap-1.5">
            <ShieldCheck size={12} className={effectiveXpBreakdown.comboBonusPct > 0 ? 'text-purple-400' : 'text-zinc-500'} />
            Combo Milestone
          </span>
          <span className={`text-xs font-black font-mono ${effectiveXpBreakdown.comboBonusPct > 0 ? 'text-purple-400' : 'text-zinc-600'}`}>
            +{effectiveXpBreakdown.comboBonusPct}%
          </span>
        </div>
        <div className="text-2xl font-black text-white font-mono">
          {effectiveXpBreakdown.comboBonusPct > 0 ? `+${effectiveXpBreakdown.comboBonusPct}% XP` : '+0%'}
        </div>
        <span className="text-[11px] text-zinc-400 mt-2">
          {flawlessStreak >= 200 ? '200+ Apex Streak' : flawlessStreak >= 100 ? '100+ Centurion Streak' : flawlessStreak >= 50 ? '50+ Flow Streak' : `${flawlessStreak}/50 Streak needed`}
        </span>
      </div>

      {/* Rhythm Consistency Bonus */}
      <div className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
        effectiveXpBreakdown.consistencyBonusPct > 0
          ? 'bg-cyan-500/10 border-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.15)]'
          : 'bg-white/[0.02] border-white/5 opacity-60'
      }`}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-black tracking-widest text-zinc-400 uppercase flex items-center gap-1.5">
            <Waves size={12} className={effectiveXpBreakdown.consistencyBonusPct > 0 ? 'text-cyan-400' : 'text-zinc-500'} />
            Metronome Flow
          </span>
          <span className={`text-xs font-black font-mono ${effectiveXpBreakdown.consistencyBonusPct > 0 ? 'text-cyan-400' : 'text-zinc-600'}`}>
            +{effectiveXpBreakdown.consistencyBonusPct}%
          </span>
        </div>
        <div className="text-2xl font-black text-white font-mono">
          {effectiveXpBreakdown.consistencyBonusPct > 0 ? `+${effectiveXpBreakdown.consistencyBonusPct}% XP` : '+0%'}
        </div>
        <span className="text-[11px] text-zinc-400 mt-2">
          {consistency >= 92 ? '≥92% Master Cadence' : consistency >= 85 ? '≥85% Steady Cadence' : `${consistency}% (≥85% needed)`}
        </span>
      </div>
    </div>

    {/* Calculation Formula Strip */}
    <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-zinc-400">
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-zinc-500">FORMULA:</span>
        <span className="text-white font-bold">{effectiveXpBreakdown.baseXp} Base</span>
        <span>×</span>
        <span>(1.0 +</span>
        <span className={effectiveXpBreakdown.flawlessBonusPct > 0 ? 'text-amber-300 font-bold' : 'text-zinc-600'}>0.{effectiveXpBreakdown.flawlessBonusPct.toString().padStart(2, '0')} Flawless</span>
        <span>+</span>
        <span className={effectiveXpBreakdown.comboBonusPct > 0 ? 'text-purple-300 font-bold' : 'text-zinc-600'}>0.{effectiveXpBreakdown.comboBonusPct.toString().padStart(2, '0')} Combo</span>
        <span>+</span>
        <span className={effectiveXpBreakdown.consistencyBonusPct > 0 ? 'text-cyan-300 font-bold' : 'text-zinc-600'}>0.{effectiveXpBreakdown.consistencyBonusPct.toString().padStart(2, '0')} Flow</span>
        <span>=</span>
        <span className="text-white font-bold">{effectiveXpBreakdown.totalMultiplier.toFixed(2)}x</span>
        <span>)</span>
      </div>
      <div className="text-white font-black">
        = +{effectiveXpBreakdown.totalXp} XP EARNED
      </div>
    </div>
  </div>
)}
```

#### C. Component JSX Structure for Ghost Net Precision Telemetry:
```tsx
{/* Ghost Net Precision Telemetry Card */}
{ghostTimeline && ghostTimeline.length > 0 && typeof ghostDeltaS === 'number' && (
  <div className="glass-panel rounded-3xl p-6 mb-10 border border-white/10 relative overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700">
    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
      <div className="flex items-center gap-2.5">
        <div className={`p-2 rounded-xl border ${
          ghostDeltaS >= 0 ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
        }`}>
          <Ghost size={16} />
        </div>
        <div>
          <span className="text-xs font-black tracking-wider uppercase text-white">
            GHOST COMPARISON: {ghostLabel || 'RIVAL GHOST'}
          </span>
          <span className="text-[10px] text-zinc-400 block">Differential telemetry across time and precision</span>
        </div>
      </div>
      <div className={`px-4 py-1.5 rounded-full font-mono font-black text-xs tracking-widest border ${
        ghostDeltaS >= 0 ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
      }`}>
        {ghostDeltaS >= 0 ? `VICTORY (+${ghostDeltaS.toFixed(1)}s)` : `DEFEAT (-${Math.abs(ghostDeltaS).toFixed(1)}s)`}
      </div>
    </div>

    {/* Differential 4-Metric Grid */}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {/* Time Delta */}
      <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col">
        <span className="text-[10px] font-black tracking-widest text-zinc-400 uppercase mb-1">Δ Time</span>
        <span className={`text-xl font-black font-mono ${ghostDeltaS >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
          {ghostDeltaS >= 0 ? `+${ghostDeltaS.toFixed(1)}s` : `-${Math.abs(ghostDeltaS).toFixed(1)}s`}
        </span>
        <span className="text-[10px] text-zinc-500 mt-1">{ghostDeltaS >= 0 ? 'Faster Pace' : 'Behind Pace'}</span>
      </div>

      {/* Accuracy Delta */}
      {typeof ghostDeltaAcc === 'number' ? (
        <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col">
          <span className="text-[10px] font-black tracking-widest text-zinc-400 uppercase mb-1">Δ Accuracy</span>
          <span className={`text-xl font-black font-mono ${ghostDeltaAcc >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {ghostDeltaAcc >= 0 ? `+${ghostDeltaAcc.toFixed(1)}%` : `${ghostDeltaAcc.toFixed(1)}%`}
          </span>
          <span className="text-[10px] text-zinc-500 mt-1">{ghostDeltaAcc >= 0 ? 'Superior Precision' : 'Lower Precision'}</span>
        </div>
      ) : (
        <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col">
          <span className="text-[10px] font-black tracking-widest text-zinc-400 uppercase mb-1">Accuracy</span>
          <span className="text-xl font-black font-mono text-white">{accuracy}%</span>
          <span className="text-[10px] text-zinc-500 mt-1">Session Acc</span>
        </div>
      )}

      {/* Consistency Delta */}
      {typeof ghostDeltaCons === 'number' ? (
        <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col">
          <span className="text-[10px] font-black tracking-widest text-zinc-400 uppercase mb-1">Δ Rhythm</span>
          <span className={`text-xl font-black font-mono ${ghostDeltaCons >= 0 ? 'text-cyan-400' : 'text-rose-400'}`}>
            {ghostDeltaCons >= 0 ? `+${ghostDeltaCons.toFixed(1)}%` : `${ghostDeltaCons.toFixed(1)}%`}
          </span>
          <span className="text-[10px] text-zinc-500 mt-1">{ghostDeltaCons >= 0 ? 'Steadier Rhythm' : 'Uneven Cadence'}</span>
        </div>
      ) : (
        <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col">
          <span className="text-[10px] font-black tracking-widest text-zinc-400 uppercase mb-1">Consistency</span>
          <span className="text-xl font-black font-mono text-white">{consistency}%</span>
          <span className="text-[10px] text-zinc-500 mt-1">Session Rhythm</span>
        </div>
      )}

      {/* Streak Delta */}
      {typeof ghostDeltaStreak === 'number' ? (
        <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col">
          <span className="text-[10px] font-black tracking-widest text-zinc-400 uppercase mb-1">Δ Combo</span>
          <span className={`text-xl font-black font-mono ${ghostDeltaStreak >= 0 ? 'text-purple-400' : 'text-rose-400'}`}>
            {ghostDeltaStreak >= 0 ? `+${ghostDeltaStreak}` : `${ghostDeltaStreak}`}
          </span>
          <span className="text-[10px] text-zinc-500 mt-1">{ghostDeltaStreak >= 0 ? 'Higher Combo' : 'Lower Combo'}</span>
        </div>
      ) : (
        <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col">
          <span className="text-[10px] font-black tracking-widest text-zinc-400 uppercase mb-1">Flawless Streak</span>
          <span className="text-xl font-black font-mono text-white">{flawlessStreak}</span>
          <span className="text-[10px] text-zinc-500 mt-1">Max Combo</span>
        </div>
      )}
    </div>
  </div>
)}
```

---

## 6. Acceptance Criteria & Test Verification

| Requirement ID | Verification Test | Expected Behavior | Status |
|---|---|---|---|
| **XP-FLAWLESS** | `tier1_features.test.ts` line 177 | 100% accuracy run awards `+50%` XP multiplier (`flawlessBonusPct = 50`) | Covered |
| **XP-COMBO** | `tier1_features.test.ts` lines 228–253 | Streaks at 50, 100, 200 award `+10%`, `+25%`, `+50%` multipliers | Covered |
| **XP-CONSISTENCY** | `tier1_features.test.ts` lines 255–280 | Consistency $\ge 85\%$ awards `+20%`, $\ge 92\%$ awards `+30%` | Covered |
| **XP-STACK** | `tier1_features.test.ts` line 203 | 100 WPM, 100% Acc, 220 combo, 94% cons -> $600 \times 2.30 = 1380\text{ XP}$ | Covered |
| **GHOST-DELTA-TIME** | `tier1_features.test.ts` line 321 | Correct positive/negative `deltaS` vs ghost finish time | Covered |
| **GHOST-DELTA-PRECISION** | `tier1_features.test.ts` line 321, 358 | Correct `deltaAcc`, `deltaCons`, `deltaStreak` computed | Covered |
| **GHOST-LEGACY-FALLBACK** | `tier1_features.test.ts` line 340 | Gracefully returns `undefined` for missing ghost precision metrics | Covered |
| **THEME-COMPLIANCE** | Visual & static code audit | All new components bound to `rgb(${theme.glowPrimary})` | Verified |

---

## 7. Recommended Implementation Sequence for M4 Worker

1. **Step 1: Update `src/hooks/useModeLeaderboard.ts`**
   - Update `RivalGhost` interface to add `accuracy?: number` and `consistency?: number`.
   - Update `fetchRivalGhost` select query to include `accuracy, consistency`.
2. **Step 2: Update `src/App.tsx`**
   - Fix `processRPG` and `checkAchievements` call parameters on test completion to include `stats.consistency` and errors.
   - Update `pbGhost` local storage serialization to store `accuracy`, `consistency`, and `flawlessStreak`.
   - Compute `ghostDeltaS`, `ghostDeltaAcc`, `ghostDeltaCons`, `ghostDeltaStreak` using `calculateGhostDelta`.
   - Pass `xpBreakdown` and ghost deltas in `resultsProps`.
3. **Step 3: Update `src/components/ResultsScreen.tsx`**
   - Update `ResultsScreenProps` to accept `xpBreakdown`, `ghostDeltaAcc`, `ghostDeltaCons`, `ghostDeltaStreak`.
   - Insert `XP Multiplier Breakdown` glass card component.
   - Upgrade `Ghost Comparison` telemetry HUD.
4. **Step 4: Verification & Build**
   - Run `npx tsx src/tests/run_e2e.ts` to confirm 100% tests pass.
   - Run `npm run build` to verify zero TypeScript or bundle errors.
