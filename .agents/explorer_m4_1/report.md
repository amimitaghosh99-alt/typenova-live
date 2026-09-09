# Technical Investigation Report: Results Screen Accolades & Grade Details (Milestone 4)

**Explorer**: Explorer 1  
**Milestone**: M4 (Results Screen Accolades, Grade Details, XP Breakdown & Ghost Delta)  
**Target Files**: `src/components/ResultsScreen.tsx`, `src/lib/scoringEngine.ts`, `src/App.tsx`, `src/utils/shareCard.ts`  
**Workspace Rules Compliance**: Strict dynamic theme color binding (`rgb(${theme.glowPrimary})` / `rgba(${theme.glowPrimary}, ...)`), zero hardcoded accent colors, minimalist control bar standards.

---

## 1. Executive Summary & Problem Scope

TypeNova Milestone 4 focuses on upgrading the post-test results presentation layer to deliver a rewarding, gamified, and precise summary of a typing session. 

### Core Objectives
1. **Accurate Multi-Factor Grade & CPI Presentation**: Replace legacy, hardcoded grade logic in `ResultsScreen.tsx` with full integration of `calculateCPI`, `evaluateGrade`, and `getGradeDetails` from `src/lib/scoringEngine.ts`, supporting grades `S+`, `S`, `A`, `B`, `C`, `D` and ensuring high-precision runs (e.g. 40 WPM at 100% accuracy) receive Grade A or S (never C or D).
2. **Accolade Badges System**: Render a dedicated 4-badge accolade grid displaying **Flawless**, **Centurion Streak**, **Surgical Precision**, and **Flow State** with unlocked glow states, locked progress indicators, and rich descriptive tooltips.
3. **Interactive XP Multiplier Breakdown**: Itemize the RPG progression reward into Base XP and precision multipliers (+50% Flawless, +10%/+25%/+50% Combo, +20%/+30% Rhythm Consistency) in a frosted glass container.
4. **Ghost Net Rival Precision & Streak Delta**: Upgrade the ghost comparison chip from a time-only delta to a multi-metric differential display (Time Delta, Accuracy Delta %, Consistency Delta %, and Streak Delta).
5. **Dynamic Theme Color Binding & Design System Compliance**: Strictly purge all hardcoded accent colors (`text-cyan-400`, `text-amber-400`, `border-cyan-500/20`, etc.) and bind all theme-reactive glows, borders, and active states to `rgb(${theme.glowPrimary})` and `rgba(${theme.glowPrimary}, ...)`.
6. **Share Card S+ & CPI Support**: Ensure `shareResultCard` handles `S+` typography and CPI metadata seamlessly.

---

## 2. Current State Analysis of `ResultsScreen.tsx`

Investigation of `src/components/ResultsScreen.tsx` (lines 1–355) reveals several critical discrepancies and architectural gaps:

### A. Outdated Grade Logic (Lines 106–112)
```typescript
// CURRENT DEFECTIVE IMPLEMENTATION IN ResultsScreen.tsx:
const grade = (() => {
  if (wpm > 100 && accuracy > 98) return "S";
  if (wpm > 80 && accuracy > 95) return "A";
  if (wpm > 50 && accuracy > 90) return "B";
  if (wpm > 30) return "C";
  return "D";
})();
```
**Issues**:
- **Critical Acceptance Criteria Violation**: A 100% accuracy run at 40 WPM evaluates to `"C"`.
- **Missing S+ Tier**: Cannot evaluate `"S+"` for elite runs (e.g. 140 WPM, 99% Acc, 92% Cons).
- **Ignores Multi-Factor Scoring**: Disregards Flawless Streaks, Rhythm Consistency, Precision Multipliers, and Low-Accuracy Penalties computed by `scoringEngine.ts`.

### B. Missing Accolade Badges Presentation
- No UI components or grid currently exist to render the 4 accolade badges (`calculateAccolades`).
- Users receive no visual celebration for achieving 100+ combos, 100% flawless runs, or metronomic rhythm consistency.

### C. Missing XP Multiplier Breakdown
- The header only displays raw `+{xpGainedLast} XP` (lines 175–178) without showing the user how precision bonuses multiplied their reward.
- The `xpBreakdownLast` object computed in `useRPGSystem.ts` is not passed to or rendered in `ResultsScreen.tsx`.

### D. Incomplete Ghost Net Rival Comparison (Lines 181–191)
- Only renders `ghostDeltaS` (time difference in seconds).
- Omits precision differential (`deltaAcc`), rhythm differential (`deltaCons`), and streak differential (`deltaStreak`).

### E. Hardcoded Theme Accent Colors Violating `GEMINI.md`
- Line 116–120: Hardcoded grade color classes (`text-amber-400`, `text-emerald-400`, `text-blue-400`, `text-orange-400`).
- Line 170: Hardcoded Level Up banner `bg-amber-500/20 text-amber-400 border-amber-500/50 shadow-[0_0_30px_rgba(245,158,11,0.5)]`.
- Line 195: Hardcoded `text-cyan-400` fallback in `saveStatus`.
- Line 225: Hardcoded `text-cyan-400` fallback in Flawless stat.
- Line 315: Hardcoded `text-cyan-400 hover:text-cyan-300 border-cyan-500/20` in Smart Drill button.
- Line 329: Hardcoded `text-cyan-400` in Share Card button.

---

## 3. Integration Plan with `scoringEngine.ts`

`src/lib/scoringEngine.ts` provides complete, battle-tested scoring functions (129/129 E2E tests passing). We will integrate them directly into `ResultsScreen.tsx` with clean memoization:

### 1. Extended `ResultsScreenProps` Interface
```typescript
import type { PerformanceGrade, CPIBreakdown, XpBreakdown } from '@/lib/scoringEngine';

export interface ResultsScreenProps {
  wpm: number;
  rawWpm: number;
  accuracy: number;
  consistency: number;
  flawlessStreak: number;
  leveledUp: boolean;
  xpGainedLast: number;
  xpBreakdown?: XpBreakdown | null;
  cpi?: number;
  grade?: PerformanceGrade;
  burstWpm?: number;
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
  ghostDeltaAcc?: number;
  ghostDeltaCons?: number;
  ghostDeltaStreak?: number;
  compact?: boolean;
  hideActions?: boolean;
}
```

### 2. Memoized Scoring & Metadata Computations
Inside `ResultsScreen`:
```typescript
// 1. Compute Safe Keystroke Metrics
const totalChars = useMemo(() => 
  safeKeystrokeLog.filter(k => !k.isBackspace).length, 
  [safeKeystrokeLog]
);
const rawErrors = useMemo(() => 
  safeKeystrokeLog.filter(k => !k.isBackspace && k.isError).length, 
  [safeKeystrokeLog]
);
const totalWords = useMemo(() => 
  Math.max(1, Math.round(totalChars / 5)), 
  [totalChars]
);

// 2. Compute or Fallback CPI Breakdown
const cpiBreakdown: CPIBreakdown = useMemo(() => {
  return calculateCPI(wpm, accuracy, flawlessStreak, consistency, totalChars);
}, [wpm, accuracy, flawlessStreak, consistency, totalChars]);

const evaluatedGrade = propGrade || cpiBreakdown.grade;
const evaluatedCpi = propCpi ?? cpiBreakdown.cpi;
const gradeMeta = useMemo(() => getGradeDetails(evaluatedGrade), [evaluatedGrade]);

// 3. Compute Burst WPM
const evaluatedBurstWpm = useMemo(() => {
  if (typeof propBurstWpm === 'number' && propBurstWpm > 0) return propBurstWpm;
  return calculateBurstWpm(safeKeystrokeLog, safeTimelinePoints);
}, [propBurstWpm, safeKeystrokeLog, safeTimelinePoints]);

// 4. Compute Accolade Badges
const accoladeBadges = useMemo(() => {
  return calculateAccolades(accuracy, flawlessStreak, consistency, totalWords, rawErrors);
}, [accuracy, flawlessStreak, consistency, totalWords, rawErrors]);
```

---

## 4. UI Component Design & Layout for Accolade Badges

### A. The 4 Accolades Specification
| Accolade ID | Title | Subtitle | Icon | Tier | Unlock Rule |
|---|---|---|---|---|---|
| `flawless` | **Flawless** | Zero Mistakes | `Sparkles` | Gold | 100% Accuracy, 0 Keystroke Errors, Streak > 0 |
| `centurion` | **Centurion Streak** | 100+ Combo | `ShieldCheck` | Purple | Unbroken Flawless Streak ≥ 100 |
| `surgical` | **Surgical Precision** | 98%+ Acc (50+ W) | `Crosshair` | Emerald | ≥98% Accuracy across ≥50 words or ≥200 streak |
| `flow_state` | **Flow State** | 88%+ Rhythm | `Waves` | Cyan | ≥88% Rhythm Consistency & ≥95% Accuracy |

### B. Visual States & Glassmorphic Styling
1. **Unlocked State**:
   - Background: `bg-black/60 backdrop-blur-2xl`
   - Border: `border border-white/20` with active dynamic glow `style={{ borderColor: \`rgba(${theme.glowPrimary}, 0.5)\`, boxShadow: \`0 0 25px rgba(${theme.glowPrimary}, 0.22)\` }}`
   - Icon: Animated with glowing backdrop `style={{ backgroundColor: \`rgba(${theme.glowPrimary}, 0.15)\`, color: \`rgb(${theme.glowPrimary})\` }}`
   - Status Badge: Glowing pill with `UNLOCKED` or checkmark.
2. **Locked State**:
   - Background: `bg-white/[0.02] backdrop-blur-md`
   - Border: `border border-white/5`
   - Icon: Dimmed zinc `text-zinc-600` with subtle lock badge `Lock` (`size={10}`).
   - Progress Indicator: Visual progress bar and label (e.g. `64 / 100 COMBO` or `94% / 98% ACC`).
   - Actionable Subtitle: Explains requirements clearly.

### C. JSX Implementation Blueprint
```tsx
{/* ── ACCOLADE BADGES SECTION ──────────────────────── */}
<div className="w-full mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700" style={{ animationDelay: '300ms' }}>
  <div className="flex items-center justify-between mb-4">
    <span className="text-zinc-400 text-[10px] font-black tracking-widest flex items-center gap-2 uppercase">
      <Award size={14} style={{ color: `rgb(${theme.glowPrimary})` }} /> SESSION ACCOLADES
    </span>
    <span className="text-[10px] font-mono font-bold text-zinc-500">
      {accoladeBadges.filter(b => b.unlocked).length} / {accoladeBadges.length} UNLOCKED
    </span>
  </div>

  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
    {accoladeBadges.map((badge) => {
      const isUnlocked = badge.unlocked;
      const IconComponent = 
        badge.id === 'flawless' ? Sparkles :
        badge.id === 'centurion' ? ShieldCheck :
        badge.id === 'surgical' ? Crosshair : Waves;

      return (
        <div
          key={badge.id}
          className={`relative p-5 rounded-2xl border transition-all duration-300 flex flex-col justify-between overflow-hidden group ${
            isUnlocked
              ? 'glass-panel'
              : 'bg-white/[0.02] border-white/5 opacity-60 hover:opacity-80'
          }`}
          style={isUnlocked ? {
            borderColor: `rgba(${theme.glowPrimary}, 0.35)`,
            boxShadow: `0 0 20px rgba(${theme.glowPrimary}, 0.15)`
          } : undefined}
          title={badge.description || badge.desc}
        >
          {/* Top Row: Icon & Status Badge */}
          <div className="flex items-start justify-between mb-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-transform group-hover:scale-105 ${
                isUnlocked ? 'border-white/20' : 'bg-white/5 border-white/10 text-zinc-600'
              }`}
              style={isUnlocked ? {
                backgroundColor: `rgba(${theme.glowPrimary}, 0.15)`,
                color: `rgb(${theme.glowPrimary})`,
                borderColor: `rgba(${theme.glowPrimary}, 0.3)`
              } : undefined}
            >
              <IconComponent size={20} />
            </div>

            <span
              className={`text-[9px] font-black tracking-widest uppercase px-2.5 py-1 rounded-full border ${
                isUnlocked
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                  : 'bg-white/5 border-white/10 text-zinc-500 flex items-center gap-1'
              }`}
            >
              {isUnlocked ? (
                'UNLOCKED'
              ) : (
                <>
                  <Lock size={9} /> LOCKED
                </>
              )}
            </span>
          </div>

          {/* Badge Info */}
          <div>
            <h4 className={`text-sm font-black tracking-tight mb-1 ${isUnlocked ? 'text-white' : 'text-zinc-400'}`}>
              {badge.title}
            </h4>
            <p className="text-zinc-500 text-xs font-medium leading-relaxed line-clamp-2">
              {badge.subtitle || badge.desc}
            </p>
          </div>

          {/* Progress Bar (when locked and progress is available) */}
          {!isUnlocked && badge.progress && (
            <div className="mt-3 pt-3 border-t border-white/5">
              <div className="flex justify-between text-[9px] font-mono text-zinc-500 mb-1">
                <span>PROGRESS</span>
                <span>{badge.progress.current} / {badge.progress.target} {badge.progress.unit}</span>
              </div>
              <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-zinc-600 rounded-full transition-all"
                  style={{ width: `${Math.min(100, (badge.progress.current / badge.progress.target) * 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      );
    })}
  </div>
</div>
```

---

## 5. Interactive XP Multiplier Breakdown Component

### A. Data Source
The XP Breakdown object (`XpBreakdown`) is generated by `calculateXPProgression` in `useRPGSystem.ts`:
- `baseXp`: Base XP derived from speed and text length.
- `flawlessBonusPct`: `+50%` if 100% Accuracy.
- `comboBonusPct`: `+10%` (50+), `+25%` (100+), `+50%` (200+).
- `consistencyBonusPct`: `+20%` (≥85%), `+30%` (≥92%).
- `totalMultiplier`: Floating point multiplier (e.g. `2.30x`).
- `totalXp`: Total awarded XP.

### B. UI Component Blueprint
```tsx
{/* ── XP PROGRESSION & MULTIPLIER BREAKDOWN ─────────── */}
{xpGainedLast > 0 && (
  <div
    className="mb-8 p-4 rounded-2xl glass-panel border flex flex-col md:flex-row items-center justify-between gap-4 max-w-2xl mx-auto w-full animate-in fade-in zoom-in duration-500"
    style={{
      borderColor: `rgba(${theme.glowPrimary}, 0.3)`,
      boxShadow: `0 0 25px rgba(${theme.glowPrimary}, 0.15)`
    }}
  >
    {/* Left: Total XP & Multiplier Pill */}
    <div className="flex items-center gap-3">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm border"
        style={{
          backgroundColor: `rgba(${theme.glowPrimary}, 0.2)`,
          borderColor: `rgba(${theme.glowPrimary}, 0.4)`,
          color: `rgb(${theme.glowPrimary})`
        }}
      >
        <Zap size={20} />
      </div>
      <div>
        <div className="flex items-center gap-2">
          <span className="text-xl font-black text-white tracking-tight">+{xpGainedLast} XP</span>
          {xpBreakdown && xpBreakdown.totalMultiplier > 1 && (
            <span
              className="text-[10px] font-black tracking-widest px-2 py-0.5 rounded-full border"
              style={{
                backgroundColor: `rgba(${theme.glowPrimary}, 0.15)`,
                borderColor: `rgba(${theme.glowPrimary}, 0.4)`,
                color: `rgb(${theme.glowPrimary})`
              }}
            >
              {xpBreakdown.totalMultiplier}x BOOST
            </span>
          )}
        </div>
        <span className="text-[10px] font-mono text-zinc-400 uppercase">
          {leveledUp ? 'Level Up Achieved!' : 'Session Progression'}
        </span>
      </div>
    </div>

    {/* Right: Itemized Bonus Chips */}
    {xpBreakdown && xpBreakdown.totalMultiplier > 1 && (
      <div className="flex flex-wrap items-center gap-2 justify-center md:justify-end">
        <span className="text-[10px] font-mono font-semibold px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-zinc-300">
          Base: {xpBreakdown.baseXp} XP
        </span>
        {xpBreakdown.flawlessBonusPct > 0 && (
          <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-center gap-1">
            <Sparkles size={11} /> Flawless +{xpBreakdown.flawlessBonusPct}%
          </span>
        )}
        {xpBreakdown.comboBonusPct > 0 && (
          <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-300 flex items-center gap-1">
            <ShieldCheck size={11} /> Streak +{xpBreakdown.comboBonusPct}%
          </span>
        )}
        {xpBreakdown.consistencyBonusPct > 0 && (
          <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 flex items-center gap-1">
            <Waves size={11} /> Flow +{xpBreakdown.consistencyBonusPct}%
          </span>
        )}
      </div>
    )}
  </div>
)}
```

---

## 6. Ghost Net Rival Multi-Factor Delta Differential

### A. Data Integration
`calculateGhostDelta` yields `deltaS`, `deltaAcc`, `deltaCons`, `deltaStreak`, and `userWon`.

### B. UI Differential Chip
```tsx
{/* ── GHOST NET RIVAL MULTI-METRIC PERFORMANCE CHIP ── */}
{ghostTimeline && ghostTimeline.length > 0 && typeof ghostDeltaS === 'number' && (
  <div
    className={`mb-6 px-5 py-3 rounded-2xl font-black tracking-wider text-xs flex flex-wrap items-center justify-center gap-3 border shadow-xl ${
      ghostDeltaS >= 0
        ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 shadow-[0_0_25px_rgba(16,185,129,0.2)]'
        : 'bg-rose-500/10 text-rose-300 border-rose-500/30 shadow-[0_0_25px_rgba(244,63,94,0.2)]'
    }`}
  >
    <div className="flex items-center gap-2">
      <Ghost size={16} className={ghostDeltaS >= 0 ? 'text-emerald-300' : 'text-rose-300'} />
      <span>
        {ghostDeltaS >= 0
          ? `BEAT ${ghostLabel || 'GHOST'} (+${Math.abs(ghostDeltaS).toFixed(1)}s)`
          : `FELL BEHIND ${ghostLabel || 'GHOST'} (-${Math.abs(ghostDeltaS).toFixed(1)}s)`}
      </span>
    </div>

    {/* Precision & Rhythm Differentials */}
    {(ghostDeltaAcc !== undefined || ghostDeltaCons !== undefined || ghostDeltaStreak !== undefined) && (
      <div className="flex items-center gap-2 pl-3 border-l border-white/10 font-mono text-[11px]">
        {ghostDeltaAcc !== undefined && (
          <span className={ghostDeltaAcc >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
            {ghostDeltaAcc >= 0 ? `+${ghostDeltaAcc.toFixed(1)}%` : `${ghostDeltaAcc.toFixed(1)}%`} ACC
          </span>
        )}
        {ghostDeltaCons !== undefined && (
          <>
            <span className="text-white/20">·</span>
            <span className={ghostDeltaCons >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
              {ghostDeltaCons >= 0 ? `+${ghostDeltaCons.toFixed(1)}%` : `${ghostDeltaCons.toFixed(1)}%`} CONS
            </span>
          </>
        )}
        {ghostDeltaStreak !== undefined && (
          <>
            <span className="text-white/20">·</span>
            <span className={ghostDeltaStreak >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
              {ghostDeltaStreak >= 0 ? `+${ghostDeltaStreak}` : `${ghostDeltaStreak}`} STREAK
            </span>
          </>
        )}
      </div>
    )}
  </div>
)}
```

---

## 7. Enhanced Grade Presentation & Stats Grid

### A. Grade Card Enhancement
The Grade card in the Stats Grid is upgraded with:
- The Grade Letter (`S+`, `S`, `A`, `B`, `C`, `D`).
- Grade Subtitle / Title (`Cyber Vanguard`, `Precision Master`, `Elite Operative`, etc.).
- CPI Score indicator (`CPI: 138`).
- Grade glow and drop-shadows matching `GRADE_DETAILS`.

```tsx
{/* 1. PERFORMANCE GRADE */}
<div className="glass-panel p-6 rounded-3xl flex flex-col items-center justify-center relative overflow-hidden group">
  <span className="text-zinc-400 text-[10px] font-black tracking-widest mb-1 uppercase">Grade</span>
  <span className={`text-6xl font-black ${gradeMeta.colorClass} ${gradeMeta.glowClass} tracking-tight`}>
    {evaluatedGrade}
  </span>
  <span className="text-[10px] font-bold text-zinc-300 mt-1 uppercase tracking-wider">
    {gradeMeta.title}
  </span>
  <div className="mt-2 px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-[9px] font-mono text-zinc-400">
    CPI {evaluatedCpi}
  </div>
</div>
```

### B. Stats Grid Metrics (7-Card Bento or 6-Card with CPI)
The grid neatly displays:
1. **Grade** (with Title & CPI badge)
2. **Net WPM** (with Peak Burst subtext)
3. **Raw WPM**
4. **Accuracy**
5. **Consistency**
6. **Flawless Streak**

---

## 8. Dynamic Theme Color Binding Audit (`GEMINI.md`)

| Current Hardcoded Class | Context / Location | Compliant Replacement |
|---|---|---|
| `text-cyan-400` in saveStatus | Line 195 | `style={{ color: \`rgb(${theme.glowPrimary})\` }}` |
| `text-cyan-400` in Flawless stat | Line 225 | `style={{ color: \`rgb(${theme.glowPrimary})\` }}` |
| `text-cyan-400 hover:text-cyan-300 border-cyan-500/20` | Smart Drill button (Line 315) | `style={{ color: \`rgb(${theme.glowPrimary})\`, borderColor: \`rgba(${theme.glowPrimary}, 0.3)\` }}` |
| `text-cyan-400` in shareStatus | Line 329 | `style={{ color: \`rgb(${theme.glowPrimary})\` }}` |
| Level Up banner | Line 170 | `style={{ color: \`rgb(${theme.glowPrimary})\`, backgroundColor: \`rgba(${theme.glowPrimary}, 0.15)\`, borderColor: \`rgba(${theme.glowPrimary}, 0.4)\`, boxShadow: \`0 0 30px rgba(${theme.glowPrimary}, 0.35)\` }}` |

---

## 9. Share Card Canvas S+ & CPI Support (`src/utils/shareCard.ts`)

In `src/utils/shareCard.ts`:
- Adjust canvas grade font size when `grade === 'S+'` from `260px` to `220px` to prevent width overflow.
- Accept optional `cpi` in `ShareCardData` and render `CPI ${data.cpi}` on the card canvas.
- Maintain dynamic `glowPrimary` / `glowSecondary` drawing logic.

---

## 10. Props Propagation Plan in `src/App.tsx`

In `src/App.tsx` (around lines 1562–1589):
```typescript
const totalCharsTyped = typing.keystrokeLog.current.filter(k => !k.isBackspace).length;
const cpiBreakdown = calculateCPI(typing.wpm, typing.accuracy, typing.flawlessStreak, typing.consistency, totalCharsTyped);
const burstWpm = calculateBurstWpm(typing.keystrokeLog.current, typing.timelinePoints);

// In ghost calculations:
const ghostDelta = ghostTimeline && rivalGhost ? calculateGhostDelta(
  finishDurationMs,
  typing.accuracy,
  typing.consistency,
  typing.flawlessStreak,
  ghostFinishTimeMs,
  rivalGhost.accuracy,
  rivalGhost.consistency,
  undefined
) : undefined;

const resultsProps = {
  wpm: typing.wpm,
  rawWpm: typing.rawWpm,
  accuracy: typing.accuracy,
  consistency: typing.consistency,
  flawlessStreak: typing.flawlessStreak,
  cpi: cpiBreakdown.cpi,
  grade: cpiBreakdown.grade,
  burstWpm,
  leveledUp: rpg.leveledUp,
  xpGainedLast: rpg.xpGainedLast,
  xpBreakdown: rpg.xpBreakdownLast,
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
  ghostDeltaS: ghostDelta ? ghostDelta.deltaS : ghostDeltaS,
  ghostDeltaAcc: ghostDelta?.deltaAcc,
  ghostDeltaCons: ghostDelta?.deltaCons,
  ghostDeltaStreak: ghostDelta?.deltaStreak,
};
```

---

## 11. Verification & Testing Strategy

1. **Automated E2E Scoring Tests**:
   - Run `npx tsx src/tests/run_e2e.ts` to confirm all 129 test assertions across Tier 1–4 remain green.
2. **TypeScript Compilation**:
   - Run `npm run build` (`tsc -b && vite build`) to guarantee zero compilation errors and strict type safety.
3. **Visual Browser Verification Protocol** (as mandated by `GEMINI.md`):
   - Navigate to the app in browser.
   - Run a 40 WPM test with 100% accuracy -> verify Grade evaluates to 'A' or 'S', Flawless badge is unlocked with glowing gold/primary ring.
   - Run a test with 100+ combo -> verify Centurion Streak badge is unlocked.
   - Verify XP Breakdown card itemizes Base XP and Multipliers with dynamic theme colors.
   - Switch active theme (e.g. Cyberpunk to Monokai to Neon Horizon) -> verify all glows, borders, and accents update dynamically without hardcoded cyan/amber artifacts.

---

## 12. Conclusion

The technical path for Milestone 4 is fully mapped out. `ResultsScreen.tsx` will be upgraded into a world-class, gamified summary screen featuring accurate multi-factor CPI grading, 4 interactive accolade badges, structured XP multipliers, multi-metric Ghost rival deltas, and flawless dynamic theme color adherence.
