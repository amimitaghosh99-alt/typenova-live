# Deep Static Code Review & Bug Analysis Report

**Date**: 2026-07-29  
**Reviewer**: `explorer_1`  
**Target Files**:
- `src/App.tsx`
- `src/hooks/useTypingEngine.ts`
- `src/hooks/useRace.ts`
- `src/hooks/useRPGSystem.ts`
- `src/hooks/useQuests.ts`

---

## Executive Summary

A comprehensive static code review was conducted across the core state management, custom React hooks, multiplayer race subsystem, RPG progression system, and top-level component (`App.tsx`). A total of **13 high-impact bugs** were identified: **7 Logic Bugs**, **2 UI Bugs**, and **4 Performance Bugs**.

Below is a summary table followed by detailed descriptions, root-cause analyses, impacts, and concrete code fixes for every identified issue.

---

## Bug Matrix

| ID | File Path | Starting Line / Function | Category | Summary |
|---|---|---|---|---|
| **ENG-01** | `src/hooks/useTypingEngine.ts` | Line 58 (`calculateStats`) | Logic | Negative accuracy & distorted Raw WPM during backspacing |
| **ENG-02** | `src/hooks/useTypingEngine.ts` | Line 195 (`resetEngine`) | Logic | Countdown timer skips 5-second sequence on restarts |
| **ENG-03** | `src/hooks/useTypingEngine.ts` | Line 180 (`useEffect`) | Performance | Unnecessary array recreation & multi-state set during live 500ms ticks |
| **RAC-01** | `src/hooks/useRace.ts` | Line 116 (`rebuildPlayers`) | Logic | Finished racers omitted from scoreboard & race finishes prematurely on disconnect |
| **RAC-02** | `src/hooks/useRace.ts` | Line 377 (`getTimelines`) | Performance | Unmemoized `getTimelines` causes child component re-renders on every presence tick |
| **RAC-03** | `src/hooks/useRace.ts` | Line 176 (`rebuildPlayers`) | Logic | Host migration race condition causing split-brain host tracking |
| **RPG-01** | `src/hooks/useRPGSystem.ts` | Line 75 (`processRPG`) | Logic | Epoch timestamp (`lastTime = 0`) corrupts key latency heatmap data |
| **RPG-02** | `src/hooks/useRPGSystem.ts` | Line 158 (`checkAchievements`) | Logic | Meta-achievement `type_nova` mathematically impossible to unlock |
| **RPG-03** | `src/hooks/useRPGSystem.ts` | Line 190 (`resetAllProgress`) | Logic/UI | `resetAllProgress` leaves heatmap data intact in state and `localStorage` |
| **QST-01** | `src/hooks/useQuests.ts` | Line 94 (`progressQuest`) | Logic | Side-effects inside `setQuestsState` updater function cause double XP grant in StrictMode |
| **QST-02** | `src/hooks/useQuests.ts` | Line 75 (`progressQuest`) | UI | WPM and Accuracy threshold quests display 0 progress until target met |
| **APP-01** | `src/App.tsx` | Line 978 & 984 (`useEffect`) | Performance | Object literal identity churn of `typing` causes timer teardown loops |
| **APP-02** | `src/App.tsx` | Line 1650 (`textarea`) | UI/Logic | Custom text target state desync when re-selecting `CUSTOM` level |

---

## Detailed Findings & Proposed Solutions

---

### 1. `src/hooks/useTypingEngine.ts`

#### Bug ENG-01: Negative Accuracy & Distorted Raw WPM During Backspacing
- **Category**: Logic
- **File Path**: `src/hooks/useTypingEngine.ts`
- **Line Number**: Lines 58–70 (`calculateStats`)
- **Description & Impact**:
  In `calculateStats`:
  ```ts
  const errors = entries.filter(k => k.isError && !k.isBackspace).length;
  const rawCalc = Math.round((currentInput.length / 5) / minutes);
  const netCalc = Math.round(((currentInput.length - errors) / 5) / minutes);
  const currentAcc = currentInput.length > 0 ? Math.round(((currentInput.length - errors) / currentInput.length) * 100) : 100;
  ```
  `errors` counts all non-backspace error keystrokes ever logged in `keystrokeLog.current`. However, `currentInput.length` is only the current length of the text input string.
  If a user types 10 incorrect characters and then backspaces 8 of them, `currentInput.length` becomes 2, while `errors` remains 10. `(currentInput.length - errors)` equals `-8`.
  `currentAcc` evaluates to `Math.round((-8 / 2) * 100) = -400%`! Line 124 (`currentAcc: isNaN(currentAcc) ? 100 : currentAcc`) does NOT clamp `currentAcc` between 0 and 100.
  Furthermore, Raw WPM (`rawCalc`) uses `currentInput.length` instead of total typed non-backspace keystrokes, causing Raw WPM to artificially collapse toward 0 when backspacing.
- **Proposed Solution**:
  Calculate accuracy and raw WPM using total typed non-backspace keystrokes (`totalTyped = entries.filter(k => !k.isBackspace).length`). Clamp accuracy between 0% and 100%.

```ts
// PROPOSED FIX for useTypingEngine.ts (lines 67-71)
const nonBackspaceEntries = entries.filter(k => !k.isBackspace);
const totalTyped = nonBackspaceEntries.length;
const errors = nonBackspaceEntries.filter(k => k.isError).length;

const rawCalc = totalTyped > 0 ? Math.round((totalTyped / 5) / minutes) : 0;
const netCalc = totalTyped > 0 ? Math.round(((totalTyped - errors) / 5) / minutes) : 0;
const currentAcc = totalTyped > 0 ? Math.max(0, Math.min(100, Math.round(((totalTyped - errors) / totalTyped) * 100))) : 100;
```

---

#### Bug ENG-02: Countdown Timer Skips 5-Second Sequence on Restart
- **Category**: Logic
- **File Path**: `src/hooks/useTypingEngine.ts`
- **Line Number**: Line 195 (`resetEngine`) & Lines 159–170 (`useEffect`)
- **Description & Impact**:
  `resetEngine()` clears `input`, `startTime`, `wpm`, etc., but does **not** reset `countdownTimer` back to `5`.
  When a test or race finishes or resets, `countdownTimer` state retains `1` (or whatever value it reached when the previous countdown finished).
  When a new test starts and `setPhase('COUNTDOWN')` is called, the countdown effect sees `countdownTimer === 1`, waits 1 second, and immediately switches `phase` to `'TYPING'`, skipping 5, 4, 3, 2 entirely!
- **Proposed Solution**:
  Reset `setCountdownTimer(5)` inside `resetEngine()` or when entering `COUNTDOWN`.

```ts
// PROPOSED FIX for useTypingEngine.ts (line 195)
const resetEngine = useCallback(() => {
  isFinishingRef.current = false;
  setInput('');
  setStartTime(null);
  setEndTime(null);
  setCountdownTimer(5); // <--- ADD THIS LINE
  setWpm(0);
  setRawWpm(0);
  ...
```

---

#### Bug ENG-03: Live Stats Interval Triggers High-Frequency Churn
- **Category**: Performance
- **File Path**: `src/hooks/useTypingEngine.ts`
- **Line Number**: Lines 180–193 (`useEffect` for live stats update)
- **Description & Impact**:
  During typing, `setInterval` fires every 500ms calling `calculateStats`. `calculateStats` constructs a new `timeline` array every 500ms and calls 6 React state setters (`setWpm`, `setRawWpm`, `setAccuracy`, `setConsistency`, `setFlawlessStreak`, `setTimelinePoints`).
  Re-creating the array reference `timelinePoints` every 500ms forces child components like `StatsPanel` to execute heavy re-renders even when WPM hasn't changed.
- **Proposed Solution**:
  Only update state variables if computed stats differ from previous state.

---

### 2. `src/hooks/useRace.ts`

#### Bug RAC-01: Disconnected Racers Dropped from Scoreboard & Premature End
- **Category**: Logic
- **File Path**: `src/hooks/useRace.ts`
- **Line Number**: Lines 116–134 (`rebuildPlayers`)
- **Description & Impact**:
  In `rebuildPlayers`:
  ```ts
  const allKnownIds = new Set([...Object.keys(state), ...Object.keys(finishRef.current)]);
  for (const key of allKnownIds) {
    const meta = state[key]?.[0] || metaRef.current[key];
    if (!meta?.name) continue;
  ```
  If a player finishes the race and their presence key disconnects before presence sync updates `metaRef.current[key]`, `meta?.name` evaluates to `undefined`. `continue` skips the player, omitting them from `next`.
  Then line 198: `if (statusRef.current === 'racing' && next.length > 0 && next.every(p => p.finished))` sees only the remaining active players and transitions `status` to `'finished'`, cutting off the race prematurely and removing the finished player from the final leaderboard.
- **Proposed Solution**:
  Store player name and metadata directly in `finishRef` when recording finish payloads, ensuring disconnected finished players retain their name.

```ts
// PROPOSED FIX for useRace.ts (lines 133-135)
const meta = state[key]?.[0] || metaRef.current[key] || { name: 'Racer' };
```

---

#### Bug RAC-02: Unmemoized `getTimelines` Method
- **Category**: Performance
- **File Path**: `src/hooks/useRace.ts`
- **Line Number**: Line 377 (`getTimelines`)
- **Description & Impact**:
  `useRace` returns `getTimelines: () => timelinesRef.current` created as a inline arrow function on every render.
  Any component that passes `race.getTimelines()` down as a prop or includes `race` in dependencies will re-render continuously whenever presence syncs or progress updates fire (every 250ms).
- **Proposed Solution**:
  Wrap `getTimelines` in `useCallback`.

```ts
// PROPOSED FIX for useRace.ts (line 377)
const getTimelines = useCallback(() => timelinesRef.current, []);
```

---

#### Bug RAC-03: Host Migration Race Condition
- **Category**: Logic
- **File Path**: `src/hooks/useRace.ts`
- **Line Number**: Lines 176–193 (`rebuildPlayers`)
- **Description & Impact**:
  When the host drops, `hostFound` becomes `false`. Every connected client executes `rebuildPlayers()` upon receiving the presence `leave` event.
  If two clients execute this logic before their presence lists reach consensus, both clients might identify themselves as `next[0]` and issue `ch.track({ isHost: true })`, resulting in dual host collisions.
- **Proposed Solution**:
  Use a ref flag `isMigratingHostRef` to lock migration tracking during transition.

---

### 3. `src/hooks/useRPGSystem.ts`

#### Bug RPG-01: Epoch Timestamp (`lastTime = 0`) Corrupts Heatmap Latency
- **Category**: Logic
- **File Path**: `src/hooks/useRPGSystem.ts`
- **Line Number**: Lines 75–88 (`processRPG`)
- **Description & Impact**:
  In `processRPG`:
  ```ts
  setHeatmapData(prev => {
    const next = { ...prev };
    let lastTime = 0;
    keystrokeLog.forEach(k => {
      const delay = k.time - lastTime;
      lastTime = k.time;
      ...
      next[char] = { 
        total: next[char].total + 1, 
        errors: next[char].errors + (k.isError ? 1 : 0),
        totalMs: (next[char].totalMs || 0) + delay
      };
    });
  ```
  `lastTime` starts at `0`. `k.time` is a Unix timestamp in milliseconds (`~1,722,250,000,000`).
  For the very first character in `keystrokeLog`, `delay` = `k.time - 0` = ~1.7 billion ms (54+ years)!
  This value is added to `next[char].totalMs`, ruining character speed analytics in the dashboard for whichever key was typed first.
- **Proposed Solution**:
  Initialize `lastTime` to the timestamp of the first keystroke (`keystrokeLog[0]?.time || 0`).

```ts
// PROPOSED FIX for useRPGSystem.ts (line 75)
setHeatmapData(prev => {
  const next = { ...prev };
  let lastTime = keystrokeLog[0]?.time || 0;
  keystrokeLog.forEach(k => {
    const delay = lastTime > 0 ? Math.max(0, k.time - lastTime) : 0;
    lastTime = k.time;
    if (k.isBackspace) return;
    const char = k.expected === ' ' ? 'SPACE' : k.expected === '\n' ? 'ENTER' : k.expected.toUpperCase();
    if (!next[char]) next[char] = { total: 0, errors: 0, totalMs: 0 };
    next[char] = { 
      total: next[char].total + 1, 
      errors: next[char].errors + (k.isError ? 1 : 0),
      totalMs: (next[char].totalMs || 0) + delay
    };
  });
  localStorage.setItem(STORAGE_KEYS.heatmap, JSON.stringify(next));
  return next;
});
```

---

#### Bug RPG-02: Meta-Achievement `type_nova` Impossible to Unlock
- **Category**: Logic
- **File Path**: `src/hooks/useRPGSystem.ts`
- **Line Number**: Line 158 (`checkAchievements`)
- **Description & Impact**:
  Line 158: `if (check('type_nova') && totalSet.size >= ACHIEVEMENTS.length) unlock('type_nova');`
  `ACHIEVEMENTS` array contains N achievements, including `type_nova` itself.
  Before `type_nova` is unlocked, `totalSet.size` can at most be N - 1.
  The condition `totalSet.size >= ACHIEVEMENTS.length` evaluates to `(N - 1) >= N`, which is permanently `false`!
  `type_nova` can NEVER be unlocked naturally.
- **Proposed Solution**:
  Check `totalSet.size >= ACHIEVEMENTS.length - 1`.

```ts
// PROPOSED FIX for useRPGSystem.ts (line 158)
if (check('type_nova') && totalSet.size >= ACHIEVEMENTS.length - 1) unlock('type_nova');
```

---

#### Bug RPG-03: `resetAllProgress` Ignores Heatmap Data
- **Category**: Logic / UI
- **File Path**: `src/hooks/useRPGSystem.ts`
- **Line Number**: Lines 190–195 (`resetAllProgress`)
- **Description & Impact**:
  `resetAllProgress()` resets `xp`, `testsCompleted`, and `unlockedAchievements`, but leaves `heatmapData` state intact and does not remove `STORAGE_KEYS.heatmap` from `localStorage`.
  After a progress reset, old key statistics linger in the dashboard.
- **Proposed Solution**:
  Reset `setHeatmapData({})` and call `localStorage.removeItem(STORAGE_KEYS.heatmap)` inside `resetAllProgress`.

```ts
// PROPOSED FIX for useRPGSystem.ts (lines 190-195)
const resetAllProgress = useCallback(() => {
  setUnlockedAchievements([]);
  setXp(0);
  setTestsCompleted(0);
  setHeatmapData({});
  if (typeof window !== 'undefined') localStorage.removeItem(STORAGE_KEYS.heatmap);
  setAchievementQueue(prev => [...prev, { id: 'reset', title: 'All Progress Reset', desc: '', icon: 'rotate-ccw', category: 'SUPER' }]);
}, []);
```

---

### 4. `src/hooks/useQuests.ts`

#### Bug QST-01: State Updater Side Effects & Double XP in StrictMode
- **Category**: Logic
- **File Path**: `src/hooks/useQuests.ts`
- **Line Number**: Lines 94–100 (`progressQuest`)
- **Description & Impact**:
  Inside `setQuestsState(prev => { ... })`:
  Line 95: `writeLocalProgress(progress);`
  Line 98: `if (totalXpGained > 0 && grantXp) grantXp(totalXpGained);`
  Executing side-effects inside state updater functions violates React state purity rules. In React 18 StrictMode, updater functions are invoked twice. This causes `grantXp` to be called twice, granting double XP reward for completed quests.
- **Proposed Solution**:
  Compute the updated quest state first, and invoke `grantXp` and `writeLocalProgress` outside the `setQuestsState` call.

```ts
// PROPOSED FIX for useQuests.ts (lines 59-104)
const progressQuest = useCallback((type: Quest['type'], value: number) => {
  let xpToGrant = 0;
  setQuestsState(prev => {
    if (!prev) return prev;
    let changed = false;

    const newActive = prev.active.map(q => {
      if (q.completed || q.type !== type) return q;
      let newProgress = q.progress;
      if (type === 'races_won' || type === 'words_typed') {
        newProgress += value;
      } else if (type === 'wpm_achieved' || type === 'acc_achieved') {
        if (value >= q.target) newProgress = q.target;
      }

      if (newProgress !== q.progress) {
        changed = true;
        const completed = newProgress >= q.target;
        if (completed) {
          newProgress = q.target;
          xpToGrant += q.xpReward;
        }
        return { ...q, progress: newProgress, completed };
      }
      return q;
    });

    if (!changed) return prev;
    const newState = { ...prev, active: newActive };
    const progress = readLocalProgress();
    progress.quests = newState;
    writeLocalProgress(progress);
    return newState;
  });

  if (xpToGrant > 0 && grantXp) {
    grantXp(xpToGrant);
  }
}, [grantXp]);
```

---

#### Bug QST-02: Threshold Quests Show 0 Progress Until Target Reached
- **Category**: UI
- **File Path**: `src/hooks/useQuests.ts`
- **Line Number**: Lines 75–77 (`progressQuest`)
- **Description & Impact**:
  For `wpm_achieved` and `acc_achieved` quests:
  `if (value >= q.target) newProgress = q.target;`
  If a quest target is 100 WPM, and the user hits 95 WPM, `newProgress` remains 0.
  The Quest UI progress bar shows `0 / 100 WPM` despite the user achieving 95 WPM, staying at 0% until suddenly snapping to 100%.
- **Proposed Solution**:
  Track progress as the highest value achieved (`Math.max(q.progress, value)` capped at `q.target`).

```ts
// PROPOSED FIX for useQuests.ts (lines 75-77)
else if (type === 'wpm_achieved' || type === 'acc_achieved') {
  newProgress = Math.min(q.target, Math.max(q.progress, Math.round(value)));
}
```

---

### 5. `src/App.tsx`

#### Bug APP-01: `typing` Hook Identity Churn Teardown Loops
- **Category**: Performance
- **File Path**: `src/App.tsx`
- **Line Number**: Line 978 & Lines 984–994 (`useEffect`)
- **Description & Impact**:
  In `App.tsx`:
  `useEffect(() => { ... }, [typing.phase, typing.startTime, testMode, duration, typing]);`
  Because `useTypingEngine()` returns a fresh object literal `{ phase, setPhase, ... }` on every render, including `typing` in dependency arrays causes `setInterval` in timed mode and overclocked mode to unmount and re-initialize on every single keystroke.
- **Proposed Solution**:
  Remove `typing` object literal from effect dependency arrays, keeping only primitive dependencies like `typing.phase`, `typing.startTime`.

```ts
// PROPOSED FIX for App.tsx (line 978)
}, [typing.phase, typing.startTime, testMode, duration]); // Remove `typing` object
```

---

#### Bug APP-02: Custom Text Target State Desync
- **Category**: UI / Logic
- **File Path**: `src/App.tsx`
- **Line Number**: Lines 1650–1666 (`textarea`) & `changeLevel`
- **Description & Impact**:
  When editing custom text in `textarea`, `typing.setTargetText` is called.
  If the user switches level from `CUSTOM` to `NOVICE` and back to `CUSTOM`, `customText` remains in React state, but `targetText` is reset to default text because `changeLevel('CUSTOM')` does not update `targetText` with `customText`.
- **Proposed Solution**:
  In `changeLevel(newLevel)`, when `newLevel === 'CUSTOM'`, update `targetText` using `customText`.

```ts
// PROPOSED FIX for App.tsx (changeLevel)
if (newLevel === 'CUSTOM') {
  typing.setTargetText(customText.trim() || 'Type your custom text above...');
}
```

---

## Verification Method

1. **Static Analysis & Lint Verification**:
   Execute standard TypeScript compiler checks:
   ```bash
   npx tsc --noEmit
   ```
2. **Regression Testing**:
   - Verify typing engine accuracy with backspaces: Type text, type errors, backspace all errors, ensure accuracy does not drop below 0% or turn negative.
   - Verify countdown restart: Complete a test and restart; confirm 5-second countdown displays.
   - Verify heatmap initial delay: Inspect `localStorage.getItem('typezen_heatmap')` and ensure `totalMs` for the first key is < 1000ms.
   - Verify quest progress & XP grant: Test `progressQuest` with React StrictMode enabled; confirm single XP grant on quest completion.
   - Verify `type_nova` achievement check.
