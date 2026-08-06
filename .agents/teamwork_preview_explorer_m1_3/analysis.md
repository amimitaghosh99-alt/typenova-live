# Analysis Report: React Effect Dependency Arrays in `App.tsx` (BUG-24 & BUG-25)

**Explorer**: Explorer 3 (`teamwork_preview_explorer`)  
**Target File**: `src/App.tsx`  
**Date**: 2026-08-06  

---

## 1. Executive Summary

This investigation analyzes two specific issues in `src/App.tsx` regarding React `useEffect` dependency arrays:
1. **BUG-24 (Auto-Save Effect Dependency Arrays)**: The auto-save effect currently uses `// eslint-disable-next-line react-hooks/exhaustive-deps` to bypass linting checks, missing key dependencies including `typing.input`, `auth.session`, `supabase`, `autoSave`, `cloud.username`, `finishDurationMs`, `game.dailyActive`, `game.microDrillActive`, `fetchLeaderboard`, and `fetchDailyBoard`.
2. **BUG-25 (Rematch Effect Dependency Array)**: The rematch sync effect calls `typing.setPhase('CONFIGURING')` when room status changes back to `'lobby'`, but omits `typing` / `typing.setPhase` from its dependency array `[race.status, raceActive]`.

---

## 2. Fundamental Cause: Non-Memoized Hook Return Object

In `src/App.tsx`:
```tsx
const typing = useTypingEngine();
```
`useTypingEngine()` returns an un-memoized object literal `{ phase, setPhase, targetText, input, ... }` on **every single render** of `App.tsx`.

- Passing the raw `typing` object directly into an effect's dependency array (e.g. `[..., typing]`) will cause the effect to re-run on **every single render** (such as every keystroke during typing tests).
- To safely include dependencies without causing unnecessary effect churn, infinite loops, or lint suppressions:
  1. Access primitive values (`typing.phase`, `typing.endTime`, `typing.wpm`, `typing.accuracy`, `typing.timePenalty`, `typing.input`).
  2. Access stable setters/callbacks (`typing.setPhase` is returned by React's `useState` setter inside `useTypingEngine` and maintains reference identity across renders).
  3. Use ref guards (such as `hasAutoSavedRef`) to ensure side-effects (e.g. RPC calls) run strictly **once** per test completion even if re-render events occur.

---

## 3. BUG-24: Auto-Save Dependency Arrays

### 3.1 Location & Current Implementation
- **File**: `src/App.tsx`
- **Lines**: 645–676

```tsx
  // ─── Auto-Save ──────────────
  const hasAutoSavedRef = useRef(false);
  useEffect(() => {
    if (typing.phase !== 'FINISHED' || !typing.endTime || hasAutoSavedRef.current || game.microDrillActive) return;
    hasAutoSavedRef.current = true;

    // Auto-save if logged in
    if (autoSave && supabase && auth.session && cloud.username) {
      const wpmVal = Math.round(typing.wpm);
      const accVal = Math.round(typing.accuracy);
      if (wpmVal > 0 && wpmVal <= 300 && accVal >= 0 && accVal <= 100) {
        setTimeout(() => setSaveStatus('Auto-saving...'), 0);
        supabase.rpc('submit_score', {
          p_wpm: wpmVal,
          p_accuracy: accVal,
          p_time_ms: finishDurationMs + typing.timePenalty,
          p_log: typing.keystrokeLog.current,
          p_daily: game.dailyActive,
          p_day: todayKey(),
        }).then(({ error }) => {
          if (error) setSaveStatus(`Error: ${error.message}`);
          else {
            setSaveStatus('SCORE SAVED!');
            fetchLeaderboard();
            if (game.dailyActive) fetchDailyBoard();
          }
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typing.phase, typing.endTime]);
```

### 3.2 Identification of Missing Dependencies
The current dependency array is `[typing.phase, typing.endTime]`.  
The following referenced values are omitted:
- `typing.input` (referenced or associated with test completion)
- `auth.session` (state object from `useAuth`)
- `supabase` (client instance from `@/lib/supabase`)
- `autoSave` (state boolean)
- `cloud.username` (state string from `useCloudSync`)
- `finishDurationMs` (derived primitive number: `typing.startTime && typing.endTime ? typing.endTime - typing.startTime : 0`)
- `game.microDrillActive` (state boolean)
- `game.dailyActive` (state boolean)
- `typing.wpm`, `typing.accuracy`, `typing.timePenalty` (primitive numbers)
- `fetchLeaderboard`, `fetchDailyBoard` (stable callbacks wrapped in `useCallback`)

### 3.3 Dependency Addition & Safety Analysis
- **Will adding these dependencies cause infinite loops or duplicate saves?**
  - **No.** The effect is protected by `hasAutoSavedRef.current`.
  - When `typing.phase` is `'TYPING'`, `typing.phase !== 'FINISHED'` evaluates to `true`, causing line 1 of the effect to immediately exit. No network requests or state updates are performed.
  - When `typing.phase` transitions to `'FINISHED'`, `hasAutoSavedRef.current` is `false`. The effect executes `supabase.rpc('submit_score', ...)` and synchronously sets `hasAutoSavedRef.current = true`.
  - Any subsequent renders or dependency updates while in `'FINISHED'` phase hit `hasAutoSavedRef.current === true`, exiting immediately on line 1.
  - When a new test starts, the existing guard reset effect sets `hasAutoSavedRef.current = false`:
    ```tsx
    useEffect(() => {
      if (typing.phase === 'READY' || typing.phase === 'CONFIGURING') {
        hasAutoSavedRef.current = false;
      }
    }, [typing.phase]);
    ```

### 3.4 Recommended Refactored Auto-Save Effect
```tsx
  // ─── Auto-Save ──────────────
  const hasAutoSavedRef = useRef(false);
  useEffect(() => {
    if (typing.phase !== 'FINISHED' || !typing.endTime || hasAutoSavedRef.current || game.microDrillActive) return;
    hasAutoSavedRef.current = true;

    // Auto-save if logged in
    if (autoSave && supabase && auth.session && cloud.username) {
      const wpmVal = Math.round(typing.wpm);
      const accVal = Math.round(typing.accuracy);
      if (wpmVal > 0 && wpmVal <= 300 && accVal >= 0 && accVal <= 100) {
        setTimeout(() => setSaveStatus('Auto-saving...'), 0);
        supabase.rpc('submit_score', {
          p_wpm: wpmVal,
          p_accuracy: accVal,
          p_time_ms: finishDurationMs + typing.timePenalty,
          p_log: typing.keystrokeLog.current,
          p_daily: game.dailyActive,
          p_day: todayKey(),
        }).then(({ error }) => {
          if (error) setSaveStatus(`Error: ${error.message}`);
          else {
            setSaveStatus('SCORE SAVED!');
            fetchLeaderboard();
            if (game.dailyActive) fetchDailyBoard();
          }
        });
      }
    }
  }, [
    autoSave,
    auth.session,
    cloud.username,
    fetchDailyBoard,
    fetchLeaderboard,
    finishDurationMs,
    game.dailyActive,
    game.microDrillActive,
    supabase,
    typing.accuracy,
    typing.endTime,
    typing.input,
    typing.phase,
    typing.timePenalty,
    typing.wpm,
  ]);
```

---

## 4. BUG-25: Rematch Effect in `App.tsx`

### 4.1 Location & Current Implementation
- **File**: `src/App.tsx`
- **Lines**: 359–365

```tsx
  // Rematch State Sync: when the room status returns to 'lobby' while a race was active,
  // unmount the Results screen and pull all connected clients back into the VS Lobby together!
  useEffect(() => {
    if (race.status === 'lobby' && raceActive) {
      setRaceActive(false);
      setShowRace(true);
      typing.setPhase('CONFIGURING');
    }
  }, [race.status, raceActive]);
```

### 4.2 Why `typing` / `typing.setPhase` is Missing
- `typing.setPhase('CONFIGURING')` is invoked inside the effect function.
- `typing` was omitted from the dependency array `[race.status, raceActive]` because adding the unmemoized `typing` object would cause the effect to execute on every single render of `App.tsx`.

### 4.3 Safe Resolution Strategy
- In `useTypingEngine.ts`, `setPhase` comes directly from React's `useState<Phase>('CONFIGURING')`.
- State setter functions returned by `useState` have guaranteed **stable identity across re-renders**.
- Passing `typing.setPhase` into the dependency array `[race.status, raceActive, typing.setPhase]`:
  1. Complete ESLint Exhaustive-Deps Compliance: Satisfies `react-hooks/exhaustive-deps` without suppression comments.
  2. Zero Unwanted Re-renders: Because `typing.setPhase` maintains identity stability, the effect only executes when `race.status` or `raceActive` changes.
  3. Clean State Sync: Once triggered, `setRaceActive(false)` sets `raceActive` to `false`, preventing re-execution until the next race starts and finishes.

### 4.4 Recommended Refactored Rematch Effect
```tsx
  // Rematch State Sync: when the room status returns to 'lobby' while a race was active,
  // unmount the Results screen and pull all connected clients back into the VS Lobby together!
  useEffect(() => {
    if (race.status === 'lobby' && raceActive) {
      setRaceActive(false);
      setShowRace(true);
      typing.setPhase('CONFIGURING');
    }
  }, [race.status, raceActive, typing.setPhase]);
```

---

## 5. Complete Audit of `react-hooks/exhaustive-deps` in `src/App.tsx`

For total code hygiene and 0 ESLint warnings, all 6 disabled effect sites in `src/App.tsx` can be refactored as follows:

| Line Range | Effect Purpose | Current Dep Array | Recommended Dep Array & Changes |
|---|---|---|---|
| **397–400** | Initial target text generation | `[]` | `[typing.setTargetText]` — remove `eslint-disable-next-line` |
| **359–365** | Rematch state sync (BUG-25) | `[race.status, raceActive]` | `[race.status, raceActive, typing.setPhase]` — include `typing.setPhase` |
| **613–619** | PB Ghost pacer memoization | `[pbStorageKey, game.level, game.mirroredMode, game.dailyActive, typing.phase]` | Keep existing deps — remove `eslint-disable-next-line` |
| **636–642** | Error times calculation | `[typing.phase, typing.endTime]` | `[typing.phase, typing.endTime, typing.startTime]` — remove `eslint-disable-next-line` |
| **647–675** | Auto-save to Supabase (BUG-24) | `[typing.phase, typing.endTime]` | Include `autoSave`, `auth.session`, `cloud.username`, `fetchDailyBoard`, `fetchLeaderboard`, `finishDurationMs`, `game.dailyActive`, `game.microDrillActive`, `supabase`, `typing.accuracy`, `typing.endTime`, `typing.input`, `typing.phase`, `typing.timePenalty`, `typing.wpm` — remove `eslint-disable-next-line` |
| **687–767** | RPG Processing on Finish | `[typing.phase, typing.endTime]` | Add `hasProcessedRpgRef` guard to prevent infinite re-processing loops on XP/level updates, include all primitive/stable deps, remove `eslint-disable-next-line` |
| **783–797** | Timed mode countdown interval | `[typing.phase, typing.startTime, game.testMode, game.duration]` | `[typing.phase, typing.startTime, game.testMode, game.duration, penaltyTypingRef]` — remove `eslint-disable-next-line` |

---

## 6. Summary Matrix for Implementers

| Bug ID | File | Line Numbers | Current Problem | Proposed Fix |
|---|---|---|---|---|
| **BUG-24** | `src/App.tsx` | 647–675 | Uses `eslint-disable-next-line react-hooks/exhaustive-deps`, missing `typing.input`, `auth.session`, `supabase`, etc. | Add explicit primitive/stable dependencies to array; reliance on `hasAutoSavedRef` prevents duplicate score submissions. |
| **BUG-25** | `src/App.tsx` | 359–365 | Missing `typing.setPhase` in rematch sync effect dependency array. | Include `typing.setPhase` in dependency array `[race.status, raceActive, typing.setPhase]`. |
