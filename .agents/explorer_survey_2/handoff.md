# Codebase Investigation Report: RPG Progression (R2) & Results Screen (R3)

## 1. Observation

### 1.1 Current RPG Progression Architecture & XP Mechanics
- **File**: `src/hooks/useRPGSystem.ts` (lines 65–69, 107–124)
  - **Level Curve Formulation**:
    ```ts
    const userLevel = Math.floor(Math.sqrt(xp / 100)) + 1;
    const nextLevelXp = Math.pow(userLevel, 2) * 100;
    const currentLevelProgress = xp - Math.pow(userLevel - 1, 2) * 100;
    const xpNeeded = nextLevelXp - Math.pow(userLevel - 1, 2) * 100;
    ```
    - Quadratic progression curve: Level $L$ requires $(L-1)^2 \times 100$ total XP.
    - Level 1: 0 XP
    - Level 2: 100 XP ($\Delta = 100$)
    - Level 3: 400 XP ($\Delta = 300$)
    - Level 5: 1,600 XP (unlocks *Apprentice* achievement)
    - Level 20: 36,100 XP (unlocks *Grandmaster* achievement)
    - Level 50: 240,100 XP (unlocks *Grandmaster* banner)
  - **XP Gain Calculation** (`processRPG` in `useRPGSystem.ts:109-113`):
    ```ts
    if (finalWpm > 10 && finalAcc > 50 && !microDrillActive) {
      const lengthMod = targetTextLength / 100;
      const gained = Math.floor(finalWpm * (finalAcc / 100) * lengthMod * 2);
      setXpGainedLast(gained);
      newXp = xp + gained;
      ...
    }
    ```
  - **Observation**:
    - There are currently **no multipliers** applied for 100% flawless accuracy runs, high combo streaks (e.g., 50+, 100+, 200+), or metronome rhythm consistency ($\ge 85\%$).
    - `xpGainedLast` is a single integer scalar, missing metadata on what bonuses contributed to the total.

### 1.2 Unlocks, Achievements, Titles, and Banners
- **Achievements** (`src/data/constants.ts` lines 253–282):
  - 17 achievements categorized into `SKILL`, `HARDCORE`, `GRIND`, and `SUPER`.
  - Precision/Combo-related currently include:
    - `sniper`: "Finish a test of 50+ words with 100% Accuracy." (`useRPGSystem.ts:150`)
    - `unbreakable`: "Reach a flawless streak (Combo) of 200+." (`useRPGSystem.ts:151`)
    - `perfectionist`: "Unlock Sniper + Unbreakable." (`useRPGSystem.ts:167`)
- **Player Titles** (`src/data/titles.ts` lines 36–126):
  - Titles evaluated dynamically via `isUnlocked(stats: UserSkillStats)`.
  - Speed/accuracy titles: `novice`, `speed_demon` (90+ WPM), `lightning` (120+ WPM), `warp_speed` (150+ WPM), `precision_master` (98%+ avg acc, $\ge 5$ tests), `marathoner` (50 tests), `iron_will` (200 tests), `streak_master` (7 days), `race_champion` (5 wins).
- **Banners** (`src/data/customization.ts` lines 145–196):
  - Skill-gated banners: `premium_speed` (100 WPM), `premium_godspeed` (150 WPM), `premium_combo` (100 combo), `premium_master` (Lvl 50), `premium_hellfire` (200 combo).
- **State Storage & Persistence**:
  - LocalStorage keys (`useRPGSystem.ts:5-11`, `progress.ts:11-20`): `typezen_xp`, `typezen_tests`, `typezen_achievements`, `typezen_heatmap`, `typezen_best_combo`, `typenova_active_title`, `typezen_daily`, `typezen_quests`.
  - Cloud Snapshot (`src/lib/progress.ts:40-75`): `ProgressSnapshot` aggregates local progress and synchronizes with Supabase `public_profiles`.

### 1.3 Results Screen Architecture & Rendering
- **File**: `src/components/ResultsScreen.tsx`
  - **Props (`ResultsScreenProps`)**:
    - Metrics: `wpm`, `rawWpm`, `accuracy`, `consistency`, `flawlessStreak`.
    - Progression: `leveledUp`, `xpGainedLast`.
    - Ghost Net: `ghostTimeline`, `ghostLabel`, `ghostDeltaS`.
    - Analytics: `heatmapData`, `timelinePoints`, `errorTimes`, `durationMs`, `keystrokeLog`.
  - **Header Elements** (`ResultsScreen.tsx:163-199`):
    - Level Up Banner: `leveledUp && <TrendingUp /> LEVEL UP!`
    - XP Pill: `+{xpGainedLast} XP` (flat pill without multiplier breakdown).
    - Ghost Chip:
      ```tsx
      {ghostTimeline && ghostTimeline.length > 0 && typeof ghostDeltaS === 'number' && (
        <div className={...}>
          <Ghost size={14} />
          <span>{ghostDeltaS >= 0 ? `BEAT ${ghostLabel} BY +${ghostDeltaS.toFixed(1)}s` : `FELL BEHIND ${ghostLabel} BY -${Math.abs(ghostDeltaS).toFixed(1)}s`}</span>
        </div>
      )}
      ```
      - *Note*: Only calculates time difference in seconds (`ghostDeltaS`). No accuracy or streak differential is computed or displayed.
    - Badges/Accolades: **Zero accolade badges are currently rendered on the Results Screen**.
  - **Stats Grid** (`ResultsScreen.tsx:201-227`):
    - Grade calculation (lines 106–112):
      ```ts
      const grade = (() => {
        if (wpm > 100 && accuracy > 98) return "S";
        if (wpm > 80 && accuracy > 95) return "A";
        if (wpm > 50 && accuracy > 90) return "B";
        if (wpm > 30) return "C";
        return "D";
      })();
      ```
    - Cards: Grade, Net WPM, Raw WPM, Accuracy, Consistency, Flawless Streak.
  - **Design System & Theme Rules Violations**:
    - Multiple hardcoded colors exist in `ResultsScreen.tsx`: `text-cyan-400`, `text-amber-400`, `text-emerald-400`, `border-cyan-500/20` instead of using dynamic theme binding `style={{ color: \`rgb(\${theme.glowPrimary})\` }}` or `rgba(\${theme.glowPrimary}, ...)`.

### 1.4 Ghost Net & Opponent Data Pipeline
- **Files**: `src/hooks/useModeLeaderboard.ts`, `src/App.tsx:933-953, 1522-1560`
  - `ModeScoreRow` holds: `{ user_id, username, wpm, accuracy, consistency }`.
  - `fetchRivalGhost(modeKey, userId)` currently selects `username, wpm, ghost` from `mode_scores`.
  - `App.tsx` calculates `ghostDeltaS = (ghostFinishTimeMs - finishDurationMs) / 1000`.

---

## 2. Logic Chain

### 2.1 R2: Precision & Streak Progression Engine Multipliers
1. **Base XP Formulation**:
   - The established base XP formula accounts for speed and content volume:
     $$\text{Base XP} = \lfloor \text{Net WPM} \times \frac{\text{Accuracy}}{100} \times \frac{\text{Length}}{100} \times 2 \rfloor$$
2. **Multipliers Definition**:
   - **100% Flawless Run Bonus**: $+50\%$ XP multiplier ($\text{flawlessMult} = 0.50$ when $\text{accuracy} = 100$ and zero uncorrected errors).
   - **Flawless Streak (Combo) Milestones**:
     - 50–99 Combo: $+10\%$ XP bonus ($\text{comboMult} = 0.10$)
     - 100–199 Combo: $+25\%$ XP bonus ($\text{comboMult} = 0.25$)
     - 200+ Combo: $+50\%$ XP bonus ($\text{comboMult} = 0.50$)
   - **Metronome Rhythm Consistency Bonus**:
     - Consistency $\ge 85\%$: $+20\%$ XP bonus ($\text{consMult} = 0.20$)
     - Consistency $\ge 92\%$: $+30\%$ XP bonus ($\text{consMult} = 0.30$)
   - **Composite Multiplier**:
     $$\text{Total Multiplier } M = 1.0 + \text{flawlessMult} + \text{comboMult} + \text{consMult}$$
     $$\text{Awarded XP} = \lfloor \text{Base XP} \times M \rfloor$$
3. **Structured Breakdown Transmission**:
   - `useRPGSystem.ts` should calculate and return an `XpBreakdown` object:
     ```ts
     export interface XpBreakdown {
       baseXp: number;
       flawlessBonusPct: number;    // e.g. 50 (if 100% Acc)
       comboBonusPct: number;       // e.g. 10, 25, 50
       consistencyBonusPct: number; // e.g. 20, 30
       totalMultiplier: number;     // e.g. 2.05
       totalXp: number;             // final integer XP awarded
     }
     ```
   - Store `xpBreakdownLast` in `useRPGSystem` state alongside `xpGainedLast`.

### 2.2 R2: Precision Achievements & Unlocks
1. **New Precision Achievements** (`ACHIEVEMENTS` in `constants.ts`):
   - `centurion_streak`: "Centurion" — Reach a flawless streak of 100+ (`icon: 'shield-check'`, category: `'SKILL'`).
   - `flow_state`: "Flow State" — Complete a test with $\ge 85\%$ consistency and $\ge 95\%$ accuracy (`icon: 'waves'`, category: `'SKILL'`).
   - `surgical_precision`: "Surgical Precision" — Complete a test of 50+ words with 100% accuracy (`icon: 'crosshair'`, category: `'HARDCORE'`).
2. **New Player Titles** (`TITLE_BADGES` in `titles.ts`):
   - `centurion`: "Centurion" — 100+ flawless combo in any test (`icon: 'shield'`, category: `'streak'`).
   - `flow_master`: "Flow Master" — Average consistency $\ge 85\%$ across $\ge 10$ tests (`icon: 'activity'`, category: `'accuracy'`).
3. **Check Achievements Integration**:
   - In `checkAchievements` (`useRPGSystem.ts`), pass `currentMaxCombo`, `consistency`, `finalAcc`, `wordCount`.

### 2.3 R3: Results Screen Accolade Badges
1. **Accolade Badge Evaluation**:
   - Evaluate run achievements on the Results Screen:
     - **Flawless**: `accuracy === 100 && flawlessStreak > 0`
     - **Centurion Streak**: `flawlessStreak >= 100` (or "Streak Adept" for $\ge 50$)
     - **Surgical Precision**: `accuracy >= 98 && (wpm >= 80 || effWordCount >= 50)`
     - **Flow State**: `consistency >= 85 && accuracy >= 95`
2. **Visual Presentation**:
   - Liquid-glass pill badges positioned prominently beneath the grade/stats or header.
   - Distinct icons (`Sparkles`, `ShieldCheck`, `Crosshair`, `Activity`/`Waves`).
   - Glowing border and text bound dynamically to `rgb(${theme.glowPrimary})`.
   - Staggered entry animation.

### 2.4 R3: Interactive XP Multiplier Breakdown Display
1. **Pill & Drawer/Tooltip Component**:
   - Instead of a static `+150 XP` text, render an interactive XP badge with multiplier tag (e.g. `+245 XP · 2.05x`).
   - Expandable on hover or click to show a breakdown card:
     - Base XP: `120 XP`
     - 100% Flawless: `+50% (+60 XP)`
     - 100+ Combo: `+25% (+30 XP)`
     - Rhythm Consistency (88%): `+20% (+24 XP)`
     - Total: `245 XP (2.05x Multiplier)`
   - Styled with frosted glass (`backdrop-blur-md bg-white/5 border border-white/10`).

### 2.5 R3: Ghost Net Rival Precision Delta
1. **Data Ingestion**:
   - Update `fetchRivalGhost` in `useModeLeaderboard.ts` to include `accuracy` and `consistency`:
     ```ts
     .select('username, wpm, accuracy, consistency, ghost')
     ```
   - Update `RivalGhost` interface:
     ```ts
     export interface RivalGhost {
       userId: string;
       username: string;
       wpm: number;
       accuracy?: number;
       consistency?: number;
       samples: PaceSample[];
     }
     ```
   - Update `App.tsx` PB Ghost storage to include `accuracy` and `consistency`.
2. **Delta Calculation**:
   - Compute:
     - $\Delta \text{Time} = (\text{ghostFinishTimeMs} - \text{userFinishTimeMs}) / 1000$ (seconds)
     - $\Delta \text{Accuracy} = \text{userAccuracy} - \text{ghostAccuracy}$ (percentage points)
     - $\Delta \text{Consistency} = \text{userConsistency} - \text{ghostConsistency}$
3. **UI Display on Results Screen**:
   - Upgrade the Ghost chip to show dual/triple comparisons:
     - Time Delta: `+1.4s faster` (Emerald) or `-0.8s behind` (Rose)
     - Accuracy Delta: `+2.0% Acc` or `-1.0% Acc`
     - Consistency Delta: `+5.0% Cons`

### 2.6 Layout & Workspace Rules Compliance
- Replace all hardcoded colors (`text-cyan-400`, `text-amber-400`, `bg-amber-500/20`, etc.) in `ResultsScreen.tsx` with dynamic theme bindings:
  - `style={{ color: \`rgb(\${theme.glowPrimary})\` }}`
  - `style={{ borderColor: \`rgba(\${theme.glowPrimary}, 0.3)\`, background: \`rgba(\${theme.glowPrimary}, 0.1)\` }}`
  - Standard semantic colors (red for errors, emerald for positive comparison delta) remain allowed per `GEMINI.md`.

---

## 3. Caveats

1. **Custom Mode & Micro-Drills**:
   - As per existing TypeNova rules (`App.tsx:1068-1075`), Custom mode and micro-drills are excluded from leaderboard saves and standard XP gain to prevent exploits. Multipliers must also be bypassed in custom mode.
2. **Backward Compatibility of Ghosts**:
   - Older `mode_scores` rows or local PB entries might not have stored `accuracy` or `consistency`. The calculation must gracefully handle `undefined` or `null` rival accuracy/consistency without crashing (fallback to time-only delta if accuracy is unavailable).
3. **Mobile & Compact Results Screen**:
   - `RaceResultsScreen.tsx` embeds `ResultsScreen` with `compact={true}` and `hideActions={true}`. The new accolade badges and XP breakdown must render responsively in both full-screen solo results and compact multiplayer cards.

---

## 4. Conclusion & Implementation Blueprints

### 4.1 Target Files & Changes for Implementation

| Module / File | Change Scope |
|---|---|
| `src/hooks/useRPGSystem.ts` | Add `XpBreakdown` interface, update `processRPG` to calculate precision/streak/consistency multipliers, store `xpBreakdownLast`, update `checkAchievements` with new precision achievements. |
| `src/data/constants.ts` | Register new achievements (`centurion_streak`, `flow_state`, `surgical_precision`). |
| `src/data/titles.ts` | Register new title badges (`centurion`, `flow_master`). |
| `src/hooks/useModeLeaderboard.ts` | Include `accuracy` and `consistency` in `fetchRivalGhost` query and `RivalGhost` interface. |
| `src/lib/personalBests.ts` | Include `accuracy` and `consistency` in stored PB entries. |
| `src/App.tsx` | Pass `xpBreakdown`, `rivalAccuracy`, `rivalConsistency`, `ghostDeltaAcc`, `ghostDeltaCons` to `resultsProps`. |
| `src/components/ResultsScreen.tsx` | Render Accolade Badges, expandable XP Multiplier Breakdown, enriched Ghost Net multi-stat comparison chip, and convert all accent styling to dynamic theme color binding. |

### 4.2 Mathematical Formulas for Implementers
```ts
// 1. Base XP
const lengthMod = targetTextLength / 100;
const baseXp = Math.floor(finalWpm * (finalAcc / 100) * lengthMod * 2);

// 2. Precision & Streak Multipliers
let flawlessBonusPct = 0;
if (finalAcc === 100) {
  flawlessBonusPct = 50; // +50% XP
}

let comboBonusPct = 0;
if (currentMaxCombo >= 200) {
  comboBonusPct = 50; // +50% XP
} else if (currentMaxCombo >= 100) {
  comboBonusPct = 25; // +25% XP
} else if (currentMaxCombo >= 50) {
  comboBonusPct = 10; // +10% XP
}

let consistencyBonusPct = 0;
if (consistency >= 85) {
  consistencyBonusPct = 20; // +20% XP for high rhythm consistency
}

const totalMultiplier = 1 + (flawlessBonusPct + comboBonusPct + consistencyBonusPct) / 100;
const totalXp = Math.floor(baseXp * totalMultiplier);
```

---

## 5. Verification Method

1. **TypeScript Compilation & Lint Check**:
   - Command: `npm run build`
   - Invalidation condition: Any TypeScript errors in `useRPGSystem.ts`, `ResultsScreen.tsx`, `App.tsx`, `useModeLeaderboard.ts`.
2. **Unit / Logic Verification**:
   - Verify that 100% accuracy run at 40 WPM yields base XP ($40 \times 1.0 \times 1.25 \times 2 = 100$) + 50% flawless bonus = 150 XP.
   - Verify that 100+ combo awards +25% multiplier.
   - Verify that metronome consistency $\ge 85\%$ awards +20% multiplier.
3. **Visual Browser Verification**:
   - Start dev server (`npm run dev`) and complete tests under varying conditions:
     - 100% accuracy run -> check that "Flawless" accolade badge renders and +50% XP bonus is displayed.
     - 100+ combo run -> check that "Centurion Streak" accolade badge renders.
     - Ghost Net race -> check that Ghost chip shows time delta, accuracy differential, and consistency differential.
     - Theme verification -> verify that changing themes updates all glows, badge borders, and XP multiplier highlights according to the active wallpaper theme (`rgb(${theme.glowPrimary})`).
