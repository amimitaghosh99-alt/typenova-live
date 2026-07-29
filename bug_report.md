# TypeNova Live — Comprehensive Codebase Audit & Bug Report

**Target Project**: `typenova-live` (`c:\Users\risho\OneDrive\Desktop\typenova-v2 - Copy`)  
**Date**: 2026-07-29  
**Authors**: Report Synthesis Worker (aggregating Logic, UI/UX, and Performance Audits)  
**Total Bugs Identified**: 27 (10 Logic & State, 7 UI & UX, 10 Performance & Memory Leaks)

---

## Executive Summary

A comprehensive, multi-domain forensic audit was conducted across the `typenova-live` web application codebase (`src/App.tsx`, `src/components/`, `src/hooks/`, `src/data/`, `src/lib/`, `tailwind.config.js`). The audit evaluated three primary vectors:
1. **Logic & State Management**: Race conditions in state synchronization, calculation math errors, multiplayer host migration and presence drops, timer leaks, and double side-effects.
2. **UI, Layout, CSS & UX**: Header layout clipping, Tailwind CSS dynamic class purging, SVG icon transparency bugs, missing hotkey modal guards, caret boundary collapse, inline layout particle drift, and modal horizontal overflow.
3. **Performance, Memory Leaks & Resource Management**: Uncleaned asynchronous timers, non-unique React keys, top-level re-render cascades, forced synchronous layout thrashing (`getBoundingClientRect`), unhoisted regular expression compilations, and missing passive event listeners.

Below is the master summary table of all 27 identified bugs, categorized and prioritized by severity.

### Master Bug Index (27 Items)

| Bug ID | Category | Severity / Impact | Target File(s) | Line Numbers / Function |
|---|---|---|---|---|
| **LOGIC-01** | Logic & State | High | `src/App.tsx`, `src/hooks/useTypingEngine.ts` | `App.tsx:708,738,813,835`, `useTypingEngine.ts:34` |
| **LOGIC-02** | Logic & State | Critical | `src/hooks/useTypingEngine.ts` | Lines 67–70 (`calculateStats`) |
| **LOGIC-03** | Logic & State | High | `src/hooks/useRPGSystem.ts`, `src/components/StatsDashboard.tsx` | `useRPGSystem.ts:74`, `StatsDashboard.tsx:132` |
| **LOGIC-04** | Logic & State | Medium | `src/App.tsx`, `src/hooks/useRace.ts` | `App.tsx:899–957` |
| **LOGIC-05** | Logic & State | High | `src/hooks/useRace.ts` | Line 176 (`rebuildPlayers`) |
| **LOGIC-06** | Logic & State | High | `src/App.tsx` | Lines 472–481 (`handleReset`) |
| **LOGIC-07** | Logic & State | Medium | `src/App.tsx` | Line 485 (`handleReset`) |
| **LOGIC-08** | Logic & State | High | `src/hooks/useQuests.ts` | Lines 94–100 (`progressQuest`) |
| **LOGIC-09** | Logic & State | Medium | `src/hooks/useRace.ts` | Lines 257–270 |
| **LOGIC-10** | Logic & State | Low | `src/components/TypingArea.tsx` | Line 514 (`useGhostRace`) |
| **UI-01** | UI & Layout | Medium | `src/App.tsx` | Lines 1006–1008 (`topHudClass`) |
| **UI-02** | UI & Layout | High | `src/App.tsx`, `tailwind.config.js` | `App.tsx:1715`, `tailwind.config.js:9–17` |
| **UI-03** | UI & Layout | High | `src/data/constants.ts`, `src/App.tsx` | `constants.ts:241,288`, `App.tsx:1353,1368,1440` |
| **UI-04** | UI & Layout | Medium | `src/App.tsx` | Lines 712, 1474–1505 (`handleKeyDown`) |
| **UI-05** | UI & Layout | High | `src/components/TypingArea.tsx` | Lines 288–290, 313–320, 467, 480–482 (`GlidingBar`) |
| **UI-06** | UI & Layout | Medium | `src/components/TypingArea.tsx` | Lines 89–108 (`Char` component) |
| **UI-07** | UI & Layout | Medium | `src/components/StatsDashboard.tsx` | Lines 105, 126 (`KeyboardHeatmap`) |
| **PERF-01** | Performance & Resource | High | `src/hooks/useRace.ts` | Lines 257–285 (`join`) |
| **PERF-02** | Performance & Resource | Medium | `src/hooks/useParticles.ts` | Lines 33, 50–53 (`spawnParticles`) |
| **PERF-03** | Performance & Resource | Critical | `src/App.tsx` | Lines 303–344, 701–704 (`MainApp` snapshot) |
| **PERF-04** | Performance & Resource | Medium | `src/hooks/useTypingEngine.ts` | Lines 185–190 (`setInterval` tick) |
| **PERF-05** | Performance & Resource | Medium | `src/hooks/useRace.ts` | Line 377 (hook return object) |
| **PERF-06** | Performance & Resource | High | `src/components/TypingArea.tsx` | Lines 14–75 (`useSyntaxHighlighter`) |
| **PERF-07** | Performance & Resource | Medium | `src/hooks/useTypingEngine.ts` | Lines 58–129 (`calculateStats`) |
| **PERF-08** | Performance & Resource | Critical | `src/components/TypingArea.tsx` | Lines 461–480 (`GlidingBar` position) |
| **PERF-09** | Performance & Resource | High | `src/components/graphs/WpmGraph.tsx` | Lines 176–181 (`onMouseMove`) |
| **PERF-10** | Performance & Resource | Low | `src/App.tsx`, `src/components/AccountMenu.tsx` | `App.tsx:364`, `AccountMenu.tsx:38` |

---

## Section 1: Logic & State Management Bugs (10 Items)

### LOGIC-01: Stale Input State & Character Loss Under Rapid Typing / Key Repeats
- **File Path**: `src/App.tsx` & `src/hooks/useTypingEngine.ts`
- **Line Numbers / Function Name**: `src/App.tsx` lines 708, 738, 813, 835 (`handleKeyDown`) & `src/hooks/useTypingEngine.ts` line 34.
- **Root Cause & Description**: `handleKeyDown` in `App.tsx` reads state snapshot `s = stateRef.current`. `stateRef.current` is updated asynchronously inside a React `useEffect` (`useEffect(() => { stateRef.current = snapshot; })`). When keys are typed in rapid succession (< 16ms apart or during key-repeat), consecutive `keydown` events fire in the JS event loop before React re-renders and updates `stateRef.current`. The second `keydown` event reads `s.input` from the stale ref, overwriting the first keystroke and dropping characters.
- **Potential Impact**: Keystroke loss during fast typing (> 100 WPM), unnaturally low accuracy scores, corrupted keystroke timing logs.
- **Concrete Proposed Solution & Code Replacement**:
  Introduce a synchronous `inputRef` inside `useTypingEngine.ts` and update `App.tsx` to read `typing.inputRef.current` and use functional state updaters via `setInputSync`.

```typescript
// Target File: src/hooks/useTypingEngine.ts
// Expose inputRef and setInputSync for synchronous keystroke state management:

const inputRef = useRef('');

const setInputSync = useCallback((valOrFn: string | ((prev: string) => string)) => {
  const nextVal = typeof valOrFn === 'function' ? valOrFn(inputRef.current) : valOrFn;
  inputRef.current = nextVal;
  setInput(nextVal);
}, []);

const resetEngine = useCallback(() => {
  inputRef.current = '';
  setInput('');
  // ... rest of reset logic
}, []);

// Target File: src/App.tsx
// Update handleKeyDown to read typing.inputRef.current and use setInputSync:

if (e.key === 'Backspace') {
  if (s.input.length > 0) {
    typing.setInputSync(prev => prev.slice(0, -1));
    typing.keystrokeLog.current.push({ key: 'Backspace', expected: '', time: Date.now(), isError: false, isBackspace: true });
  }
  return;
}

const currentInput = typing.inputRef.current;
if (currentInput.length < s.targetText.length) {
  const now = Date.now();
  let typedChar = e.key;
  if (typedChar === 'Enter') typedChar = '\n';

  const expectedChar = s.targetText[currentInput.length];
  const isError = typedChar !== expectedChar;

  typing.setInputSync(prev => prev + typedChar);
  const nextInput = currentInput + typedChar;
  typing.keystrokeLog.current.push({ key: typedChar, expected: expectedChar, time: now, isError });
  // ... rest of handleKeyDown logic
}
```

---

### LOGIC-02: Accuracy & Net WPM Miscalculation on Backspacing Corrected Errors
- **File Path**: `src/hooks/useTypingEngine.ts`
- **Line Numbers / Function Name**: Lines 67–70 (`calculateStats`)
- **Root Cause & Description**: `calculateStats` calculates `errors` as `entries.filter(k => k.isError && !k.isBackspace).length`. When a user types mistakes, backspaces, and re-types characters correctly, `currentInput.length` reflects the current active text length while `errors` retains all cumulative historical mistakes. The formula `(currentInput.length - errors)` yields negative values if historical error count exceeds current input length.
- **Potential Impact**: Produces negative Accuracy percentages (e.g. -67%) and 0 Net WPM whenever users backspace and correct multiple typos.
- **Concrete Proposed Solution & Code Replacement**:
  Calculate accuracy based on total non-backspace keystrokes typed versus errors, and calculate Net WPM based on current valid typed character count.

```typescript
// Target File: src/hooks/useTypingEngine.ts
// Replacement for lines 67-70 inside calculateStats:

// Target Content:
// const errors = entries.filter(k => k.isError && !k.isBackspace).length;
// const rawCalc = Math.round((currentInput.length / 5) / minutes);
// const netCalc = Math.round(((currentInput.length - errors) / 5) / minutes);
// const currentAcc = currentInput.length > 0 ? Math.round(((currentInput.length - errors) / currentInput.length) * 100) : 100;

// Replacement Content:
const totalTyped = entries.filter(k => !k.isBackspace).length;
const errorCount = entries.filter(k => k.isError && !k.isBackspace).length;

const rawCalc = minutes > 0 ? Math.round((totalTyped / 5) / minutes) : 0;
const netCalc = minutes > 0 ? Math.max(0, Math.round(((currentInput.length - errorCount) / 5) / minutes)) : 0;
const currentAcc = totalTyped > 0 ? Math.min(Math.max(Math.round(((totalTyped - errorCount) / totalTyped) * 100), 0), 100) : 100;
```

---

### LOGIC-03: Heatmap Finger Speed Latency Corruption (56-Year Delay Overflow)
- **File Path**: `src/hooks/useRPGSystem.ts` & `src/components/StatsDashboard.tsx`
- **Line Numbers / Function Name**: `useRPGSystem.ts` line 74 (`processRPG`) & `StatsDashboard.tsx` line 132.
- **Root Cause & Description**: In `processRPG`, `let lastTime = 0` initializes the timestamp baseline. For the first keystroke in `keystrokeLog`, `k.time` is epoch timestamp in milliseconds (~1,770,000,000,000 ms). `delay` calculates as `1.77e12 - 0 = 1.77e12` ms (~56 years), adding 1.77 billion ms to `next[char].totalMs`.
- **Potential Impact**: Completely corrupts key speed average latency in the Stats Dashboard heatmap tooltip, rendering values like `1770000000ms`.
- **Concrete Proposed Solution & Code Replacement**:
  Initialize `lastTime` to the timestamp of the first valid keystroke rather than `0`.

```typescript
// Target File: src/hooks/useRPGSystem.ts
// Replacement for lines 73-87 inside setHeatmapData:

// Target Content:
// setHeatmapData(prev => {
//   const next = { ...prev };
//   let lastTime = 0;
//   keystrokeLog.forEach(k => {
//     const delay = k.time - lastTime;
//     lastTime = k.time;

// Replacement Content:
setHeatmapData(prev => {
  const next = { ...prev };
  const validKeystrokes = keystrokeLog.filter(k => !k.isBackspace);
  let lastTime = validKeystrokes.length > 0 ? validKeystrokes[0].time : 0;
  
  validKeystrokes.forEach((k, idx) => {
    const delay = idx === 0 ? 0 : Math.max(0, k.time - lastTime);
    lastTime = k.time;

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

### LOGIC-04: Multiplayer Stale Heatmap Payload Race Condition
- **File Path**: `src/App.tsx` & `src/hooks/useRace.ts`
- **Line Numbers / Function Name**: `src/App.tsx` lines 899–957 (`handleTestFinish`).
- **Root Cause & Description**: In `App.tsx`, `rpg.processRPG(...)` updates React state via `setHeatmapData`. Immediately after, `race.sendFinish(..., rpg.heatmapData, ...)` is called in the same synchronous execution block, passing `rpg.heatmapData` before React state re-renders.
- **Potential Impact**: Multiplayer race end payloads transmit stale heatmap data from the previous test instead of the newly completed test.
- **Concrete Proposed Solution & Code Replacement**:
  Compute `updatedHeatmap` synchronously in `processRPG`, return it, and pass it directly into `race.sendFinish`.

```typescript
// Target File: src/hooks/useRPGSystem.ts
// Inside processRPG: compute updatedHeatmap synchronously and return it:

const updatedHeatmap = { ...heatmapData };
const validKeystrokes = keystrokeLog.filter(k => !k.isBackspace);
let lastTime = validKeystrokes.length > 0 ? validKeystrokes[0].time : 0;

validKeystrokes.forEach((k, idx) => {
  const delay = idx === 0 ? 0 : Math.max(0, k.time - lastTime);
  lastTime = k.time;
  const char = k.expected === ' ' ? 'SPACE' : k.expected === '\n' ? 'ENTER' : k.expected.toUpperCase();
  if (!updatedHeatmap[char]) updatedHeatmap[char] = { total: 0, errors: 0, totalMs: 0 };
  updatedHeatmap[char] = { 
    total: updatedHeatmap[char].total + 1, 
    errors: updatedHeatmap[char].errors + (k.isError ? 1 : 0),
    totalMs: (updatedHeatmap[char].totalMs || 0) + delay
  };
});
setHeatmapData(updatedHeatmap);
localStorage.setItem(STORAGE_KEYS.heatmap, JSON.stringify(updatedHeatmap));

// ... calculate XP ...

return { newXp, newTestsCompleted, updatedHeatmap };

// Target File: src/App.tsx line 956:
// Replacement Content:
const result = rpg.processRPG(...);
race.sendFinish(stats.currentWpm, stats.currentAcc, timeMs, stats.rawWpm, stats.consistency, result.updatedHeatmap, errCount, backspaceCount);
```

---

### LOGIC-05: Multiplayer Host Migration Blocked During Active Race
- **File Path**: `src/hooks/useRace.ts`
- **Line Numbers / Function Name**: Line 176 (`rebuildPlayers`)
- **Root Cause & Description**: Host migration logic is strictly restricted by `if (!hostFound && next.length > 0 && statusRef.current === 'lobby')`. If the host closes their browser while `statusRef.current === 'racing'`, migration is skipped and no remaining player inherits host privileges.
- **Potential Impact**: Rooms lose host governance when hosts leave mid-race; guests cannot start subsequent races or adjust room settings.
- **Concrete Proposed Solution & Code Replacement**:
  Allow host migration in both `'lobby'` and `'racing'` statuses.

```typescript
// Target File: src/hooks/useRace.ts
// Target Content (Lines 176-193):
// if (!hostFound && next.length > 0 && statusRef.current === 'lobby') {

// Replacement Content:
if (!hostFound && next.length > 0 && (statusRef.current === 'lobby' || statusRef.current === 'racing')) {
  next[0].isHost = true;
  if (next[0].id === selfIdRef.current) {
    setIsHost(true);
    ch.track({
      name: next[0].name,
      isHost: true,
      text: textRef.current,
      roomSize: roomSizeRef.current,
      lobbyConfig: lobbyConfigRef.current,
      elo: next[0].elo,
      userId: selfUserIdRef.current,
    });
  }
}
```

---

### LOGIC-06: Reset Delay Timer Race Condition Wiping Active Typing Session
- **File Path**: `src/App.tsx`
- **Line Numbers / Function Name**: Lines 472–481 (`handleReset`)
- **Root Cause & Description**: `handleReset` schedules a 300ms `setTimeout` to reset typing engine state after crossfade transitions. If a user starts typing immediately (e.g. hitting Space within 300ms), phase transitions to `'TYPING'`. The 300ms timer then fires asynchronously while typing is active, invoking `typing.resetEngine()` and clearing user progress.
- **Potential Impact**: Aborts active typing tests and wipes input progress for fast players who restart quickly.
- **Concrete Proposed Solution & Code Replacement**:
  Set typing engine phase to `'READY'` immediately upon triggering reset so active typing halts synchronously and reset completes cleanly.

```typescript
// Target File: src/App.tsx
// Target Content (Lines 469-481):
// setIsCrossfading(true);
// if (resetTimeoutRef.current) clearTimeout(resetTimeoutRef.current);
// resetTimeoutRef.current = setTimeout(() => {
//   typing.resetEngine();
//   ...

// Replacement Content:
typing.setPhase('READY');
setIsCrossfading(true);
if (resetTimeoutRef.current) clearTimeout(resetTimeoutRef.current);

resetTimeoutRef.current = setTimeout(() => {
  typing.resetEngine();
  typing.setTargetText(generateText(nextLevel, length, nextCustom, nextMirror, {
    numbers: nextNumbers,
    punctuation: nextPunct,
    codeLanguage: nextCodeLanguage,
    rng: nextDaily ? mulberry32(daySeed()) : undefined,
  }));
  setIsCrossfading(false);
}, 300);
```

---

### LOGIC-07: Realtime Channel Leak / Phantom Multiplayer Presence on Manual Reset
- **File Path**: `src/App.tsx`
- **Line Numbers / Function Name**: Line 485 (`handleReset`)
- **Root Cause & Description**: Hitting reset during a multiplayer race calls `setRaceActive(false)` but fails to call `race.leave()`. The underlying Supabase Realtime channel subscription and presence state remain open.
- **Potential Impact**: Phantom player ghosts remain in multiplayer rooms, corrupting room capacity counts and presence tracking.
- **Concrete Proposed Solution & Code Replacement**:
  Explicitly invoke `race.leave()` when resetting while race is active.

```typescript
// Target File: src/App.tsx
// Target Content (Line 485):
// setRaceActive(false);

// Replacement Content:
if (stateRef.current.raceActive) {
  race.leave();
  setRaceActive(false);
}
```

---

### LOGIC-08: Side-Effects Executing Inside React State Updater Callback
- **File Path**: `src/hooks/useQuests.ts`
- **Line Numbers / Function Name**: Lines 94–100 (`progressQuest`)
- **Root Cause & Description**: `writeLocalProgress(progress)` and `grantXp(totalXpGained)` are executed directly inside the functional state updater callback `setQuestsState(prev => { ... })`. React Strict Mode and Concurrent Mode intentionally invoke functional updaters twice during development to check purity.
- **Potential Impact**: Grants double XP rewards to users for completed quests and performs redundant disk/localStorage writes.
- **Concrete Proposed Solution & Code Replacement**:
  Execute side-effects (`writeLocalProgress`, `grantXp`) outside of state updaters in the `progressQuest` callback.

```typescript
// Target File: src/hooks/useQuests.ts
// Replacement Content for useQuests.ts:

const questsRef = useRef(questsState);
useEffect(() => { questsRef.current = questsState; }, [questsState]);

const progressQuest = useCallback((type: QuestType, value: number) => {
  const prev = questsRef.current;
  if (!prev) return;
  let totalXpGained = 0;
  let changed = false;

  const newActive = prev.active.map(q => {
    if (q.completed || q.type !== type) return q;
    let newProgress = q.progress;
    if (type === 'races_won' || type === 'words_typed') newProgress += value;
    else if (type === 'wpm_achieved' || type === 'acc_achieved') {
      if (value >= q.target) newProgress = q.target;
    }

    if (newProgress !== q.progress) {
      changed = true;
      const completed = newProgress >= q.target;
      if (completed) {
        newProgress = q.target;
        totalXpGained += q.xpReward;
      }
      return { ...q, progress: newProgress, completed };
    }
    return q;
  });

  if (!changed) return;
  const newState = { ...prev, active: newActive };
  setQuestsState(newState);

  const progress = readLocalProgress();
  progress.quests = newState;
  writeLocalProgress(progress);
  if (totalXpGained > 0 && grantXp) grantXp(totalXpGained);
}, [grantXp]);
```
```

---

### LOGIC-09: Non-Host False Kicks on Slow Presence Sync
- **File Path**: `src/hooks/useRace.ts`
- **Line Numbers / Function Name**: Lines 257–270 (`join`)
- **Root Cause & Description**: An 800ms timer verifies room capacity after guest join. If network latency delays host presence payload beyond 800ms, `hostMeta` is undefined, causing `cap` to fall back to `roomSizeRef.current` (default `2`).
- **Potential Impact**: Falsely kicks 3rd and 4th players attempting to join a 4-player room under high network latency with "Room is full (2/2)".
- **Concrete Proposed Solution & Code Replacement**:
  Default room capacity to `4` when `hostMeta` is pending.

```typescript
// Target File: src/hooks/useRace.ts
// Target Content (Line 263):
// const cap = hostMeta?.roomSize || roomSizeRef.current;

// Replacement Content:
const cap = hostMeta?.roomSize ?? 4; // Default to max room size until host presence resolves
```

---

### LOGIC-10: Dangling Timeout in Ghost Pacer Hook
- **File Path**: `src/components/TypingArea.tsx`
- **Line Numbers / Function Name**: Line 514 (`useGhostRace`)
- **Root Cause & Description**: `setTimeout(() => setGhost(null), 0)` schedules an unmanaged state update when ghost race stops, without storing or clearing the timer handle on component unmount.
- **Potential Impact**: React state update memory leak warning on unmounted components during rapid restarts.
- **Concrete Proposed Solution & Code Replacement**:
  Update state synchronously inside `useEffect`.

```typescript
// Target File: src/components/TypingArea.tsx
// Target Content (Line 514):
// if (!active || !startTime) { setTimeout(() => setGhost(null), 0); return; }

// Replacement Content:
if (!active || !startTime) { 
  setGhost(null); 
  return; 
}
```

---

## Section 2: UI, Layout, CSS & UX Bugs (7 Items)

### UI-01: Header Layout Clipping on Mobile & Small Breakpoints
- **File Path**: `src/App.tsx`
- **Line Numbers / Function Name**: Lines 1006–1008 (`topHudClass`)
- **Root Cause & Description**: `topHudClass` enforces `max-h-[200px]` when clutter is visible. On mobile screens (<768px), header items stack vertically (`flex-col`), causing natural layout height to exceed 240px. The `max-h-[200px]` constraint clips lower controls and theme toggles.
- **Potential Impact**: Obstructs navigation and header controls on mobile devices.
- **Concrete Proposed Solution & Code Replacement**:

```typescript
// Target File: src/App.tsx
// Target Content (Lines 1006-1008):
// const topHudClass = `transition-all duration-1000 ease-[cubic-bezier(0.23,1,0.32,1)] origin-top flex flex-col md:flex-row justify-between items-center gap-6 relative z-[200] ${
//   shouldHideClutter ? 'opacity-0 blur-2xl -translate-y-12 max-h-0 pointer-events-none !mb-0 overflow-hidden' : 'opacity-100 blur-none translate-y-0 max-h-[200px] mb-8 overflow-visible'
// }`;

// Replacement Content:
const topHudClass = `transition-all duration-1000 ease-[cubic-bezier(0.23,1,0.32,1)] origin-top flex flex-col md:flex-row justify-between items-center gap-6 relative z-[200] ${
  shouldHideClutter ? 'opacity-0 blur-2xl -translate-y-12 max-h-0 pointer-events-none !mb-0 overflow-hidden' : 'opacity-100 blur-none translate-y-0 max-h-none mb-8 overflow-visible'
}`;
```

---

### UI-02: Dynamic Hover Theme Border Classes Purged by Tailwind Safelist
- **File Path**: `src/App.tsx` & `tailwind.config.js`
- **Line Numbers / Function Name**: `App.tsx` line 1715 & `tailwind.config.js` lines 9–17.
- **Root Cause & Description**: `App.tsx` constructs dynamic hover classes `hover:${theme.border}` (e.g. `hover:border-cyan-500/30`). `tailwind.config.js` generates safelist tokens directly from `THEMES` values, which only contain base `border-cyan-500/30` classes. Tailwind purges un-safelisted hover variants during production build.
- **Potential Impact**: Hover visual feedback fails on buttons and theme selectors in production builds.
- **Concrete Proposed Solution & Code Replacement**:

```javascript
// Target File: tailwind.config.js
// Target Content (Lines 9-17):
// const themeSafelist = [...new Set(
//   Object.values(THEMES)
//     .flatMap(theme => Object.values(theme))
//     .filter(v => typeof v === 'string')
//     .flatMap(v => v.split(/\s+/))
//     .filter(token => token.includes('-') || token.includes('['))
// )];

// Replacement Content:
const rawTokens = Object.values(THEMES)
  .flatMap(theme => Object.values(theme))
  .filter(v => typeof v === 'string')
  .flatMap(v => v.split(/\s+/))
  .filter(token => token.includes('-') || token.includes('['));

const themeSafelist = [...new Set([
  ...rawTokens,
  ...rawTokens.filter(t => t.startsWith('border-') || t.startsWith('bg-')).map(t => `hover:${t}`)
])];
```

---

### UI-03: Galaxy Theme Text Transparent Breaks Icons & Void Theme Low Contrast
- **File Path**: `src/data/constants.ts` & `src/App.tsx`
- **Line Numbers / Function Name**: `constants.ts` lines 241, 288 & `App.tsx` lines 1353, 1368, 1440.
- **Root Cause & Description**: `THEMES.galaxy.text` specifies `text-transparent bg-clip-text ...`. Applying `${theme.text}` to SVG icons (`<Star>`, `<Trophy>`, `<Palette>`) forces SVG stroke/fill to `transparent`, making icons invisible. In `THEMES.void`, `text` is `text-zinc-500`, matching untyped text color and removing typing contrast.
- **Potential Impact**: Icons disappear in Galaxy theme; typed text is visually indistinguishable from untyped text in Void theme.
- **Concrete Proposed Solution & Code Replacement**:

```typescript
// Target File: src/App.tsx (Line 1353)
// Replace ${theme.text} with ${theme.vividText} on icon elements:
className={`p-2 rounded-xl bg-black/20 border transition-all ml-1 ${
  !isLoggedIn ? 'border-white/5 text-zinc-600 hover:text-zinc-400' 
  : rpg.unlockedAchievements.length > 0 ? `${theme.borderHalf} ${theme.vividText} ${theme.glow} ${theme.bgHover}` 
  : 'border-white/10 text-zinc-500 hover:text-white'
}`}

// Target File: src/data/constants.ts (Line 288)
// Target Content:
// void: makeTheme('void', 'bg-[#000000]', 'text-zinc-500', 'zinc'), 

// Replacement Content:
void: makeTheme('void', 'bg-[#000000]', 'text-zinc-200', 'zinc'), 
```

---

### UI-04: Sound Menu Missing from Global Esc/Modal Hotkey Guard
- **File Path**: `src/App.tsx`
- **Line Numbers / Function Name**: Lines 712, 1474–1505 (`handleKeyDown`)
- **Root Cause & Description**: Line 712 checks active open modal flags before handling game hotkeys (`Space`, `Escape`). `showSoundMenu` is omitted from the modal guard condition.
- **Potential Impact**: Pressing Space while sound profile menu is open triggers test start underneath the active menu.
- **Concrete Proposed Solution & Code Replacement**:

```typescript
// Target File: src/App.tsx
// Target Content (Line 712):
// if (s.showTrophyRoom || s.showGodMode || s.showExpandedGraph || s.showThemeMenu || s.showStatsDashboard || s.showReplay || s.showRace || s.showSocialModal || s.showChangelog) {

// Replacement Content:
if (s.showTrophyRoom || s.showGodMode || s.showExpandedGraph || s.showThemeMenu || s.showSoundMenu || s.showStatsDashboard || s.showReplay || s.showRace || s.showSocialModal || s.showChangelog) {
```

---

### UI-05: GlidingBar Caret Disappears on Last Character & Distorts on Blurred Text
- **File Path**: `src/components/TypingArea.tsx`
- **Line Numbers / Function Name**: Lines 288–290, 313–320, 467, 480–482 (`GlidingBar`)
- **Root Cause & Description**: When `input.length === targetText.length`, `index` equals `targetText.length`. `querySelector('[data-char-index="${index}"]')` fails to find a matching DOM element because indices run $0 \dots N-1$, returning `null` and resetting caret position to `null`.
- **Potential Impact**: Caret vanishes right before the results screen transitions.
- **Concrete Proposed Solution & Code Replacement**:

```typescript
// Target File: src/components/TypingArea.tsx
// Target Content (Lines 462-467):
// const el = container.querySelector<HTMLElement>(`[data-char-index="${index}"]`);
// if (!el) { setPos(null); return; }

// Replacement Content:
const idx = Math.min(index, Math.max(0, targetText.length - 1));
const el = container.querySelector<HTMLElement>(`[data-char-index="${idx}"]`);
if (!el) { setPos(null); return; }
```

---

### UI-06: Inline Container Position-Relative Causes Particle Misalignment on Wrapped Text
- **File Path**: `src/components/TypingArea.tsx`
- **Line Numbers / Function Name**: Lines 89–108 (`Char` component)
- **Root Cause & Description**: `Char` uses `className="relative inline"`. In CSS specifications, an `inline` element with `position: relative` exhibits non-standard bounding box behavior for absolute children when text wraps across multiple lines.
- **Potential Impact**: Particle effects spawn at offset coordinates when typing near line wraps.
- **Concrete Proposed Solution & Code Replacement**:

```typescript
// Target File: src/components/TypingArea.tsx
// Target Content (Line 89):
// <span className="relative inline" id={isActive ? 'active-caret' : undefined} data-char-index={index}>

// Replacement Content:
<span className="relative inline-block" id={isActive ? 'active-caret' : undefined} data-char-index={index}>
```

---

### UI-07: Keyboard Heatmap Modal Horizontal Overflow on Small Displays
- **File Path**: `src/components/StatsDashboard.tsx`
- **Line Numbers / Function Name**: Lines 105, 126 (`KeyboardHeatmap`)
- **Root Cause & Description**: `KeyboardHeatmap` has a hardcoded `min-w-[600px]`. The outer card container lacks horizontal scroll styling (`overflow-x-auto`).
- **Potential Impact**: Pushes modal card boundaries off-screen on viewports narrower than 600px.
- **Concrete Proposed Solution & Code Replacement**:

```typescript
// Target File: src/components/StatsDashboard.tsx
// Target Content (Line 105):
// <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-6 mb-8">

// Replacement Content:
<div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-6 mb-8 overflow-x-auto custom-scrollbar">
```

---

## Section 3: Performance, Memory Leak & Resource Bugs (10 Items)

### PERF-01: Uncleaned `setTimeout` Timers in Supabase Realtime Subscription
- **File Path**: `src/hooks/useRace.ts`
- **Line Numbers / Function Name**: Lines 257–285 (`join`)
- **Root Cause & Description**: Inside `join()`, two `setTimeout` calls (800ms capacity check and 2500ms host check) are scheduled. If `teardown()` or room leave occurs before timers fire, callbacks execute state transitions on stale closures.
- **Potential Impact**: Asynchronous memory leaks and invalid state calls after leaving race rooms.
- **Concrete Proposed Solution & Code Replacement**:

```typescript
// Target File: src/hooks/useRace.ts
// Add roomTimeoutsRef and clear pending handles in teardown:

const roomTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

const teardown = useCallback(() => {
  roomTimeoutsRef.current.forEach(t => clearTimeout(t));
  roomTimeoutsRef.current = [];
  if (channelRef.current && supabase) supabase.removeChannel(channelRef.current);
  channelRef.current = null;
  // ... rest of teardown logic
}, [supabase]);
```

---

### PERF-02: Non-unique Keys & Trailing Timeout Leak in Particle Hook
- **File Path**: `src/hooks/useParticles.ts`
- **Line Numbers / Function Name**: Lines 33, 50–53 (`spawnParticles`)
- **Root Cause & Description**: Particle IDs are generated using `Math.random()`, producing potential key collisions in React reconciliation. `cleanupTimeoutRef` is not cleared on component unmount.
- **Potential Impact**: React DOM key warnings and state updates on unmounted particle components.
- **Concrete Proposed Solution & Code Replacement**:

```typescript
// Target File: src/hooks/useParticles.ts
// Use an incrementing counter ref for keys and manage cleanup handle:

const particleIdCounter = useRef(0);

const spawnParticles = useCallback((charIndex: number, expectedChar: string, themeText: string, count: number = 3) => {
  const now = Date.now();
  const newParticles: Particle[] = Array.from({ length: count }).map(() => {
    particleIdCounter.current += 1;
    return {
      id: particleIdCounter.current,
      index: charIndex,
      char: Math.random() > 0.5 ? expectedChar : ['+', '*', 'x', 'o', '.'][Math.floor(Math.random() * 5)],
      tx: (Math.random() - 0.5) * 150 + 'px',
      ty: (Math.random() - 1) * 150 + 'px',
      rot: (Math.random() - 0.5) * 360 + 'deg',
      color: [themeText, 'text-white', 'text-zinc-500'][Math.floor(Math.random() * 3)],
      expireAt: now + 600
    };
  });

  setParticles(prev => [...prev.filter(p => p.expireAt > now), ...newParticles]);

  if (cleanupTimeoutRef.current) clearTimeout(cleanupTimeoutRef.current);
  cleanupTimeoutRef.current = setTimeout(() => {
    setParticles(prev => prev.filter(p => p.expireAt > Date.now()));
  }, 650);
}, []);
```

---

### PERF-03: Top-level `snapshot` Allocation & Full Component Cascade on Every Keystroke
- **File Path**: `src/App.tsx`
- **Line Numbers / Function Name**: Lines 303–344, 701–704 (`MainApp` snapshot)
- **Root Cause & Description**: `MainApp` constructs an unmemoized 35-property inline `snapshot` object literal on every single render pass. On every keystroke, `typing.setInput` triggers `MainApp` re-render, forcing all child components to re-evaluate their virtual DOM.
- **Potential Impact**: CPU spikes, garbage collector pressure, input lag during fast typing (> 100 WPM).
- **Concrete Proposed Solution & Code Replacement**:

```typescript
// Target File: src/App.tsx
// Mutate stateRef.current in-place inside useEffect instead of allocating 35-property literals per render:

const stateRef = useRef({
  phase: typing.phase, input: typing.input, targetText: typing.targetText,
  combo: typing.combo, maxCombo: typing.maxCombo, suddenDeath, stickyKeysMode,
  stickyPenalty, timePenalty: typing.timePenalty, showTrophyRoom, showGodMode,
  showExpandedGraph, showThemeMenu, showStatsDashboard, showReplay, showRace,
  showSocialModal, showChangelog, raceActive, theme, tetrisEffect, mirroredMode,
  level, wordCount, testMode, duration, withNumbers, withPunctuation,
  codeLanguage, dailyActive, customText, microDrillActive, startTime: typing.startTime, zenMode
});

useEffect(() => {
  Object.assign(stateRef.current, {
    phase: typing.phase, input: typing.input, targetText: typing.targetText,
    combo: typing.combo, maxCombo: typing.maxCombo, suddenDeath, stickyKeysMode,
    stickyPenalty, timePenalty: typing.timePenalty, showTrophyRoom, showGodMode,
    showExpandedGraph, showThemeMenu, showStatsDashboard, showReplay, showRace,
    showSocialModal, showChangelog, raceActive, theme, tetrisEffect, mirroredMode,
    level, wordCount, testMode, duration, withNumbers, withPunctuation,
    codeLanguage, dailyActive, customText, microDrillActive, startTime: typing.startTime, zenMode
  });
});
```

---

### PERF-04: Multiple Individual State Setters Fired Every 500ms
- **File Path**: `src/hooks/useTypingEngine.ts`
- **Line Numbers / Function Name**: Lines 185–190 (`setInterval` tick)
- **Root Cause & Description**: The live statistics 500ms interval invokes 6 separate state setters (`setWpm`, `setRawWpm`, `setAccuracy`, `setConsistency`, `setFlawlessStreak`, `setTimelinePoints`) in rapid succession.
- **Potential Impact**: Triggers multiple React state queue passes and render cycles per 500ms tick.
- **Concrete Proposed Solution & Code Replacement**:

```typescript
// Target File: src/hooks/useTypingEngine.ts
// Consolidate live stats into a single state object:

const [liveStats, setLiveStats] = useState<TypingStats>({
  currentWpm: 0, rawWpm: 0, currentAcc: 100, timeline: [], consistency: 100, flawless: 0
});

useEffect(() => {
  if (phase !== 'TYPING' || !startTime || endTime) return;
  const interval = setInterval(() => {
    const { input: liveInput, timePenalty: livePenalty } = liveRef.current;
    const stats = calculateStats(liveInput, Date.now() - startTime, livePenalty, startTime);
    setLiveStats(stats);
  }, 500);
  return () => clearInterval(interval);
}, [phase, startTime, endTime, calculateStats]);
```

---

### PERF-05: Unmemoized Function Prop in `useRace` Hook Return Object
- **File Path**: `src/hooks/useRace.ts`
- **Line Numbers / Function Name**: Line 377 (hook return object)
- **Root Cause & Description**: `getTimelines: () => timelinesRef.current` is returned as an inline arrow function, producing a new reference every render and breaking `React.memo` for consumer components.
- **Potential Impact**: Defeats memoization for child components consuming `race` props.
- **Concrete Proposed Solution & Code Replacement**:

```typescript
// Target File: src/hooks/useRace.ts
// Replacement for Line 377:

const getTimelines = useCallback(() => timelinesRef.current, []);

return {
  status, code, raceId, isHost, players, error, selfId,
  getTimelines, roomSize, lobbyConfig, createRoom, joinRoom,
  startRace, sendProgress, sendFinish, leave, updateLobbyConfig
};
```

---

### PERF-06: Heavy Regex Re-compilation in Syntax Highlighter
- **File Path**: `src/components/TypingArea.tsx`
- **Line Numbers / Function Name**: Lines 14–75 (`useSyntaxHighlighter`)
- **Root Cause & Description**: `useSyntaxHighlighter` instantiates 6 distinct RegExp objects inside the hook body on every cache miss. Pre-compiling global regular expressions at module scope requires resetting `lastIndex = 0` prior to each execution loop to prevent state leakage across function calls.
- **Potential Impact**: GC pressure and syntax highlighting latency when starting code typing tests.
- **Concrete Proposed Solution & Code Replacement**:
  Pre-compile regular expressions at module scope and reset `lastIndex = 0` before each regex execution loop.

```typescript
// Target File: src/components/TypingArea.tsx
// Pre-compile regular expressions at module scope and reset lastIndex before execution:

const REGEX_KEYWORDS = /\b(import|export|from|const|let|var|function|return|if|else|for|while|class|try|catch|async|await|def|impl|fn|mut|pub|WITH|SELECT|FROM|WHERE|JOIN|ON|OVER|ORDER|BY|func|chan|range|type|interface|throw|new|yield|break|continue)\b/g;
const REGEX_STRINGS = /(['"`])(?:(?=(\\?))\2.)*?\1/g;
const REGEX_NUMBERS = /\b\d+(\.\d+)?\b/g;
const REGEX_FUNCS = /\b([a-zA-Z_]\w*)(?=\s*\()/g;
const REGEX_COMMENTS = /(\/\/.*|\/\*[\s\S]*?\*\/)/g;
const REGEX_HTML_TAGS = /<\/?[\w\s="/.':;#-/?]+>/g;
const REGEX_CSS_PROPS = /\b([a-zA-Z-]+)(?=\s*:)/g;

const useSyntaxHighlighter = (text: string, isActive: boolean) => {
  return useMemo(() => {
    const colors = new Array(text.length).fill('');
    if (!isActive) return colors;
    
    let match;

    REGEX_KEYWORDS.lastIndex = 0;
    while ((match = REGEX_KEYWORDS.exec(text)) !== null) {
      for (let i = match.index; i < match.index + match[0].length; i++) colors[i] = 'text-purple-400';
    }

    REGEX_STRINGS.lastIndex = 0;
    while ((match = REGEX_STRINGS.exec(text)) !== null) {
      for (let i = match.index; i < match.index + match[0].length; i++) colors[i] = 'text-emerald-400';
    }

    REGEX_NUMBERS.lastIndex = 0;
    while ((match = REGEX_NUMBERS.exec(text)) !== null) {
      for (let i = match.index; i < match.index + match[0].length; i++) {
        if (!colors[i]) colors[i] = 'text-orange-400';
      }
    }

    REGEX_FUNCS.lastIndex = 0;
    while ((match = REGEX_FUNCS.exec(text)) !== null) {
      const isKeyword = ['if', 'for', 'while', 'catch'].includes(match[1]);
      if (!isKeyword) {
        for (let i = match.index; i < match.index + match[1].length; i++) {
          if (!colors[i]) colors[i] = 'text-blue-400';
        }
      }
    }

    REGEX_COMMENTS.lastIndex = 0;
    while ((match = REGEX_COMMENTS.exec(text)) !== null) {
      for (let i = match.index; i < match.index + match[0].length; i++) colors[i] = 'text-zinc-600 font-normal italic';
    }

    REGEX_HTML_TAGS.lastIndex = 0;
    while ((match = REGEX_HTML_TAGS.exec(text)) !== null) {
      for (let i = match.index; i < match.index + match[0].length; i++) {
        if (!colors[i]) colors[i] = 'text-pink-400';
      }
    }

    REGEX_CSS_PROPS.lastIndex = 0;
    while ((match = REGEX_CSS_PROPS.exec(text)) !== null) {
      for (let i = match.index; i < match.index + match[1].length; i++) {
        if (!colors[i]) colors[i] = 'text-cyan-400';
      }
    }

    return colors;
  }, [text, isActive]);
};
```

---

### PERF-07: O(N) Array Operations & Multi-pass Filtering on Keystroke Log
- **File Path**: `src/hooks/useTypingEngine.ts`
- **Line Numbers / Function Name**: Lines 58–129 (`calculateStats`)
- **Root Cause & Description**: `calculateStats` performs multiple array filter passes (`entries.filter(...)`) and iteration loops on every 500ms statistics update.
- **Potential Impact**: Increased CPU cycles during long typing sessions (60s / 120s tests).
- **Concrete Proposed Solution & Code Replacement**:
  Provide a complete, drop-in replacement code block for `calculateStats` that consolidates error counting and flawless streak calculations into a single single-pass loop over `entries`.

```typescript
// Target File: src/hooks/useTypingEngine.ts
// Drop-in replacement for calculateStats (Lines 58-129):

const calculateStats = useCallback((currentInput: string, timeMs: number, currentPenalty = 0, explicitStartTime: number | null = null): TypingStats => {
  if (!timeMs || currentInput.length === 0) {
    return { currentWpm: 0, rawWpm: 0, currentAcc: 100, timeline: [], consistency: 100, flawless: 0 };
  }
  const entries = keystrokeLog.current;
  const startTs = explicitStartTime !== null ? explicitStartTime : (Date.now() - timeMs);
  const totalTimeMs = timeMs + currentPenalty;
  const minutes = totalTimeMs / 60000;

  // Single-pass loop for total non-backspace keystrokes, errors, and max flawless streak
  let totalTyped = 0;
  let errorCount = 0;
  let localMaxStreak = 0;
  let curStreak = 0;

  for (let i = 0; i < entries.length; i++) {
    const k = entries[i];
    if (!k.isBackspace) {
      totalTyped++;
      if (k.isError) {
        errorCount++;
        if (curStreak > localMaxStreak) localMaxStreak = curStreak;
        curStreak = 0;
      } else {
        curStreak++;
      }
    }
  }
  if (curStreak > localMaxStreak) localMaxStreak = curStreak;

  const rawCalc = minutes > 0 ? Math.round((totalTyped / 5) / minutes) : 0;
  const netCalc = minutes > 0 ? Math.max(0, Math.round(((currentInput.length - errorCount) / 5) / minutes)) : 0;
  const currentAcc = totalTyped > 0 ? Math.min(Math.max(Math.round(((totalTyped - errorCount) / totalTyped) * 100), 0), 100) : 100;

  const intervals = Math.max(1, Math.floor(totalTimeMs / 1000));
  const step = totalTimeMs / intervals;
  const timeline: TimelinePoint[] = [{ t: 0, wpm: 0, rawWpm: 0 }];

  let entryIndex = 0;
  let runningChars = 0;
  let runningRawChars = 0;

  for (let i = 1; i <= intervals; i++) {
    const threshold = startTs + step * i;
    while (entryIndex < entries.length && entries[entryIndex].time <= threshold) {
      const k = entries[entryIndex];
      if (!k.isBackspace) {
        runningRawChars++;
        if (!k.isError) runningChars++;
      }
      entryIndex++;
    }

    const calcWpm = Math.round((runningChars / 5) / ((step * i) / 60000));
    const calcRaw = Math.round((runningRawChars / 5) / ((step * i) / 60000));
    timeline.push({ 
      t: step * i, 
      wpm: isNaN(calcWpm) ? 0 : calcWpm,
      rawWpm: isNaN(calcRaw) ? 0 : calcRaw
    });
  }

  const wpmVals = timeline.map(p => p.wpm).filter(v => !isNaN(v));
  const mean = wpmVals.length ? wpmVals.reduce((a, b) => a + b, 0) / wpmVals.length : 0;
  const variance = wpmVals.length ? wpmVals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / wpmVals.length : 0;
  const stddev = Math.sqrt(variance);

  let consistencyScore = 100;
  if (mean > 0) consistencyScore = Math.round(Math.max(0, Math.min(100, (1 - (stddev / mean)) * 100)));
  else if (stddev > 0) consistencyScore = 50;

  return {
    currentWpm: isNaN(netCalc) || netCalc < 0 ? 0 : netCalc,
    rawWpm: isNaN(rawCalc) ? 0 : rawCalc,
    currentAcc: isNaN(currentAcc) ? 100 : currentAcc,
    timeline,
    consistency: consistencyScore,
    flawless: localMaxStreak
  };
}, []);
```

---

### PERF-08: Forced Synchronous Layout / Reflow (`getBoundingClientRect()`) on Every Keystroke in `GlidingBar`
- **File Path**: `src/components/TypingArea.tsx`
- **Line Numbers / Function Name**: Lines 461–480 (`GlidingBar` position)
- **Root Cause & Description**: `GlidingBar` invokes `getBoundingClientRect()` inside a `requestAnimationFrame` on **every single character keypress**, forcing synchronous browser layout flushes (layout thrashing).
- **Potential Impact**: Frame drops and stuttering during high-speed typing.
- **Concrete Proposed Solution & Code Replacement**:
  Calculate caret position relative to `containerRef` by traversing the `offsetParent` chain up to `containerRef.current` without calling `getBoundingClientRect()`.

```typescript
// Target File: src/components/TypingArea.tsx
// Target Content (Lines 461-480):
// Use offsetParent chain traversal instead of getBoundingClientRect():

useEffect(() => {
  const rafId = requestAnimationFrame(() => {
    const container = containerRef.current;
    if (!container) return;

    const idx = Math.min(index, Math.max(0, targetText.length - 1));
    const el = container.querySelector<HTMLElement>(`[data-char-index="${idx}"]`);
    if (!el) { setPos(null); return; }

    let x = 0;
    let y = 0;
    let curr: HTMLElement | null = el;
    while (curr && curr !== container) {
      x += curr.offsetLeft;
      y += curr.offsetTop;
      curr = curr.offsetParent as HTMLElement | null;
    }
    y += el.offsetHeight - 4;
    const w = Math.max(6, el.offsetWidth);

    setPos({ x, y, w });
  });

  return () => cancelAnimationFrame(rafId);
}, [index, targetText.length, containerRef]);
```

---

### PERF-09: Layout Thrashing on `onMouseMove` in WPM Graph
- **File Path**: `src/components/graphs/WpmGraph.tsx`
- **Line Numbers / Function Name**: Lines 176–181 (`onMouseMove`)
- **Root Cause & Description**: `e.currentTarget.getBoundingClientRect()` is called on every mouse move event over the SVG element.
- **Potential Impact**: Janky graph cursor tooltip rendering and high CPU load during mouse hovering.
- **Concrete Proposed Solution & Code Replacement**:
  Cache SVG bounding client rect on mouse enter, and restore `setHoveredOvertakeIdx(null)` on mouse leave.

```typescript
// Target File: src/components/graphs/WpmGraph.tsx
// Cache SVG bounding client rect on mouse enter and restore hover state:

const svgRectRef = useRef<DOMRect | null>(null);

<svg
  viewBox="0 0 800 250"
  className="w-full relative"
  onMouseEnter={(e) => {
    svgRectRef.current = e.currentTarget.getBoundingClientRect();
  }}
  onMouseLeave={() => {
    svgRectRef.current = null;
    setHoveredTimeMs(null);
    setHoveredOvertakeIdx(null);
  }}
  onMouseMove={(e) => {
    const rect = svgRectRef.current || e.currentTarget.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * 800;
    const t = ((svgX - 60) / 700) * durationMs;
    if (t >= 0 && t <= durationMs) setHoveredTimeMs(t);
    else setHoveredTimeMs(null);
  }}
>
```

---

### PERF-10: Missing Passive Event Listener Flags on Document Listeners
- **File Path**: `src/App.tsx` & `src/components/AccountMenu.tsx`
- **Line Numbers / Function Name**: `App.tsx` line 364 & `AccountMenu.tsx` line 38.
- **Root Cause & Description**: `document.addEventListener('mousedown', handleClickOutside)` does not pass `{ passive: true }`.
- **Potential Impact**: Minor main-thread scroll latency when click-outside handlers are registered.
- **Concrete Proposed Solution & Code Replacement**:

```typescript
// Target File: src/App.tsx (Line 364)
document.addEventListener('mousedown', handleClickOutside, { passive: true });

// Target File: src/components/AccountMenu.tsx (Line 38)
document.addEventListener('mousedown', onClick, { passive: true });
```

---

## Section 4: Recommended Action Plan & Priority Matrix

To ensure maximum stability, performance, and UI precision, fixes should be executed across 4 sequential phases.

```
       HIGH IMPACT  ▲  [Phase 1: Core Engine]         [Phase 2: Render & Layout]
                    │  - LOGIC-01 (Stale input)       - PERF-08 (GlidingBar Reflow)
                    │  - LOGIC-02 (Net WPM / Acc)     - PERF-03 (Snapshot Cascade)
                    │  - LOGIC-03 (Heatmap latency)   - UI-02 (Tailwind Safelist)
                    │  - LOGIC-05 (Host Migration)    - UI-03 (Galaxy/Void Contrast)
                    │
                    │  [Phase 3: Multiplayer Sync]     [Phase 4: Optimization]
                    │  - LOGIC-04 (Race Heatmap)      - PERF-06 (Regex compilation)
                    │  - LOGIC-07 (Realtime Leak)     - PERF-09 (WpmGraph hover)
                    │  - LOGIC-09 (Presence sync)     - UI-06 (Inline particles)
       LOW IMPACT   │  - LOGIC-08 (Quest side-fx)     - PERF-10 (Passive listeners)
                    └──────────────────────────────────────────────────────────►
                       EASY / QUICK                      COMPLEX / STRUCTURAL
                                          DIFFICULTY
```

### Action Plan Roadmap

1. **Phase 1: Critical Business Logic & Math Fixes** (Immediate)
   - Apply `LOGIC-01` (`inputRef` in typing engine) to guarantee 0 dropped keystrokes.
   - Apply `LOGIC-02` (Accuracy & Net WPM formula fix) to eliminate negative metrics.
   - Apply `LOGIC-03` (Heatmap `lastTime` epoch timestamp fix).
   - Apply `LOGIC-05` (Host migration logic fix for active races).

2. **Phase 2: Core Render Pipeline & UI Integrity** (High Priority)
   - Apply `PERF-08` (Replace `getBoundingClientRect` with `offsetLeft`/`offsetTop` in `GlidingBar`).
   - Apply `PERF-03` (In-place `stateRef.current` mutation in `App.tsx`).
   - Apply `UI-02` (Tailwind safelist update for hover dynamic border classes).
   - Apply `UI-03` (Galaxy SVG icon visibility and Void theme text contrast).
   - Apply `UI-05` (Caret boundary index guard on final character).

3. **Phase 3: Multiplayer Stability & Memory Leaks** (Medium Priority)
   - Apply `PERF-01` (Track and clear `setTimeout` handles in `useRace.ts`).
   - Apply `LOGIC-04` (Pass updated heatmap synchronously in `sendFinish`).
   - Apply `LOGIC-07` (Trigger `race.leave()` on manual reset).
   - Apply `LOGIC-08` (Isolate quest side-effects out of React state updaters).
   - Apply `LOGIC-09` (Default room size capacity to 4 during presence resolution).

4. **Phase 4: Component Polish & Secondary Performance** (Low Priority)
   - Apply `PERF-06` (Hoist regex objects in `useSyntaxHighlighter`).
   - Apply `PERF-09` (Cache bounding rect on `WpmGraph` hover).
   - Apply `UI-01` (`max-h-none` on top HUD container).
   - Apply `UI-04` (`showSoundMenu` modal hotkey guard).
   - Apply `UI-06` (`inline-block` for `Char` container).
   - Apply `UI-07` (`overflow-x-auto` on keyboard heatmap card).
   - Apply `PERF-02`, `PERF-04`, `PERF-05`, `PERF-10` (Particle keys, consolidated setters, passive listeners).

---

## Section 5: Verification & Testing Strategy

Each domain fix must be verified independently using the following testing protocols.

### 1. Logic & State Management Verification
- **Keystroke Sync Test**: Set typing speed to 140+ WPM using simulated key repetition. Verify `input.length` strictly equals total keydown count without missed characters.
- **Accuracy Math Test**: Type 5 characters, press Backspace 5 times, type 5 characters correctly. Verify Accuracy evaluates to 50% and Net WPM remains positive.
- **Heatmap Timestamp Test**: Complete a 15-second test and open the Stats Dashboard tooltip. Verify initial character latency displays realistic millisecond values (< 500ms), NOT `1770000000ms`.
- **Host Migration Test**: Create a race room across 2 browser tabs, start a race, and terminate the Host tab. Verify the Guest tab smoothly assumes host status without room errors.

### 2. UI & Layout Verification
- **Mobile Viewport Audit**: Set browser screen width to 375px. Verify header HUD options wrap cleanly without layout truncation (`UI-01`).
- **Theme Visual Test**: Switch to `galaxy` theme and verify SVG icons (`<Star>`, `<Trophy>`, `<Palette>`) remain visible with glow gradients (`UI-03`). Switch to `void` theme and verify typed text is clearly legible against background (`UI-03`).
- **Modal Heatmap Overflow Test**: Open `StatsDashboard` on mobile resolution (375px). Verify `KeyboardHeatmap` scrolls horizontally within the card container (`UI-07`).
- **Caret Boundary Test**: Type to the very final character of a target text block. Verify `GlidingBar` caret remains visible up to test completion (`UI-05`).

### 3. Performance & Memory Leak Verification
- **Forced Reflow Performance Test**: Open Chrome DevTools -> Performance tab and record a 10-second typing run at 100+ WPM. Confirm that purple "Forced Reflow" warning events from `getBoundingClientRect` in `GlidingBar` are 0 (`PERF-08`).
- **React Re-render Audit**: Enable React DevTools "Highlight updates when components render". Type continuously in `TypingArea`. Verify header HUD, navigation menus, and background elements do not re-render (`PERF-03`).
- **Memory & Realtime Cleanup Test**: Open Chrome DevTools -> Memory tab. Take baseline heap snapshot, join and leave 10 multiplayer rooms in rapid succession. Take final heap snapshot and verify 0 leaked `RealtimeChannel` or pending timer callbacks (`PERF-01`).

---
