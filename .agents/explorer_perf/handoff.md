# Performance, Memory Leak, and Resource Management Audit Report

**Project**: `typenova-live`  
**Auditor**: Explorer 3 (Performance & Resource Code Auditor)  
**Date**: 2026-07-29  

---

## 1. Executive Summary

A comprehensive, read-only performance and resource audit was conducted across the `typenova-live` codebase (`src/App.tsx`, `src/components/`, `src/hooks/`, `src/utils/`). The audit identified critical issues across four primary performance vectors:
1. **Memory Leaks & Uncleaned Asynchronous Handles** (untracked timers in Supabase presence hooks, race conditions on unmounted components).
2. **React Re-render Cascades & Unmemoized Instantiations** (top-level `snapshot` object allocated every render, unmemoized hook return objects triggering full UI re-renders on every keystroke).
3. **Expensive Computations in Render & Typing Loops** (redundant regex compilation in syntax highlighter, O(N) array calculations on every 500ms tick, unmemoized string splits in animation loops).
4. **DOM & Event Listener Overhead** (forced synchronous layout/reflow via `getBoundingClientRect()` on every keystroke in `GlidingBar` and mouse move in `WpmGraph`, missing passive event listeners).

---

## 2. Detailed Findings & Proposed Solutions

---

### Focus Area 1: Memory Leaks & Resource Cleanup Bugs

#### Bug 1.1: Uncleaned `setTimeout` Timers in Supabase Realtime Subscription (`useRace.ts`)
- **File Path**: `src/hooks/useRace.ts`
- **Line Numbers**: Lines 257–285
- **Root Cause**: Inside `join()` -> `ch.subscribe()`, two `setTimeout` calls (at 800ms for player room capacity check and 2500ms for host presence check) are scheduled. If `leave()` or `teardown()` is invoked or the parent component unmounts before these timers fire, the timer callbacks still execute. Although `if (channelRef.current !== ch) return;` exists, the closure retains references to stale `ch` channel objects and executes `setError(...)` / `leave()` state transitions after teardown.
- **Potential Impact**: Memory leak of channel closures and invalid React state updates on unmounted/reset room states.
- **Proposed Solution**: Maintain a ref tracking active room timeouts (`roomTimeoutsRef`) and clear them inside `teardown()`.

```typescript
// Proposed Replacement in src/hooks/useRace.ts

// 1. Add ref at top of hook:
const roomTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

// 2. Update teardown to clear pending timeouts:
const teardown = useCallback(() => {
  roomTimeoutsRef.current.forEach(t => clearTimeout(t));
  roomTimeoutsRef.current = [];
  if (channelRef.current && supabase) supabase.removeChannel(channelRef.current);
  channelRef.current = null;
  progressRef.current = {};
  finishRef.current = {};
  timelinesRef.current = {};
  metaRef.current = {};
  startAtRef.current = null;
  textRef.current = '';
  finishSentRef.current = false;
  roomSizeRef.current = 2;
}, [supabase]);

// 3. Store timeout handles in subscribe callback:
ch.subscribe(async (s) => {
  if (s === 'SUBSCRIBED') {
    await ch.track({ name, isHost: asHost, text: asHost ? text : undefined, roomSize: asHost ? size : undefined, lobbyConfig: asHost ? lobbyConfigRef.current : undefined, elo, userId });
    if (!asHost) {
      const t1 = setTimeout(() => {
        if (channelRef.current !== ch) return;
        const pState = ch.presenceState() as Record<string, Array<{ isHost?: boolean; roomSize?: number }>>;
        const count = Object.keys(pState).length;
        const hostMeta = Object.values(pState).find(metas => metas[0]?.isHost)?.[0];
        const cap = hostMeta?.roomSize || roomSizeRef.current;
        if (count > cap) {
          setError(`Room is full (${cap}/${cap})`);
          leave();
          return;
        }
      }, 800);
      roomTimeoutsRef.current.push(t1);
    }
    setStatus('lobby');
    if (!asHost) {
      const t2 = setTimeout(() => {
        if (channelRef.current !== ch) return;
        const state = ch.presenceState() as Record<string, Array<{ isHost?: boolean }>>;
        const hostThere = Object.values(state).some(metas => metas[0]?.isHost);
        if (!hostThere && statusRef.current === 'lobby') {
          setError(`Room ${roomCode} not found`);
          leave();
        }
      }, 2500);
      roomTimeoutsRef.current.push(t2);
    }
  }
});
```

---

#### Bug 1.2: Non-unique Keys & Trailing Timeout Leak in Particle Hook (`useParticles.ts`)
- **File Path**: `src/hooks/useParticles.ts`
- **Line Numbers**: Line 33, Lines 50–53
- **Root Cause**:
  1. Line 33 generates particle IDs using `Math.random()`. `Math.random()` can yield duplicate values in fast succession, producing key collisions in React's reconciliation algorithm.
  2. Lines 50–53 set a trailing cleanup timeout `cleanupTimeoutRef.current = setTimeout(...)`. If `clearAll` is called or the component unmounts, `setParticles` will fire on unmounted state unless `clearAll` or effect cleanup handles it.
- **Potential Impact**: DOM reconciliation errors due to duplicate React keys; state updates on unmounted component.
- **Proposed Solution**: Use `crypto.randomUUID()` or incrementing ID counter for particle keys, and clear `cleanupTimeoutRef` inside `clearAll` and `useEffect` cleanup.

```typescript
// Proposed Replacement in src/hooks/useParticles.ts

const particleIdCounter = useRef(0);

const spawnParticles = useCallback((
  charIndex: number,
  expectedChar: string,
  themeText: string,
  count: number = 3
) => {
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

  setParticles(prev => {
    const active = prev.filter(p => p.expireAt > now);
    return [...active, ...newParticles];
  });

  if (cleanupTimeoutRef.current) clearTimeout(cleanupTimeoutRef.current);
  cleanupTimeoutRef.current = setTimeout(() => {
    setParticles(prev => prev.filter(p => p.expireAt > Date.now()));
  }, 650);
}, []);
```

---

### Focus Area 2: React Re-render Cascades & Unmemoized Instantiations

#### Bug 2.1: Top-level `snapshot` Allocation & Full Component Cascade on Every Keystroke (`App.tsx`)
- **File Path**: `src/App.tsx`
- **Line Numbers**: Lines 303–344, Lines 701–704
- **Root Cause**: In `MainApp()`, `const snapshot = { phase: typing.phase, input: typing.input, ... }` constructs an inline object with 35 properties on **every single render pass**. Furthermore, `useTypingEngine`, `useRace`, `useRPGSystem`, `useParticles`, and `useCloudSync` all return brand-new unmemoized object literals on every render. On every single keystroke during typing, `typing.setInput` triggers a state change in `useTypingEngine`, causing `MainApp` and all child components to re-render.
- **Potential Impact**: CPU spikes, high memory allocation per keystroke (garbage collector pressure), input latency when typing at 100+ WPM.
- **Proposed Solution**: Memoize `snapshot` using `useMemo` or update properties directly on a persistent `stateRef.current` object, and wrap custom hook return values in `useMemo`.

```typescript
// Proposed Replacement in src/App.tsx (Lines 340–345)

// Mutate persistent stateRef directly instead of recreating a 35-property object literal every render:
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

#### Bug 2.2: Multiple Individual State Setters Fired Every 500ms (`useTypingEngine.ts`)
- **File Path**: `src/hooks/useTypingEngine.ts`
- **Line Numbers**: Lines 185–190
- **Root Cause**: Inside the live statistics `setInterval` tick (every 500ms):
  ```typescript
  setWpm(stats.currentWpm);
  setRawWpm(stats.rawWpm);
  setAccuracy(stats.currentAcc);
  setConsistency(stats.consistency);
  setFlawlessStreak(stats.flawless);
  setTimelinePoints(stats.timeline);
  ```
  Calling 6 independent state updates in rapid succession triggers multiple React render cycles and state queueing passes.
- **Potential Impact**: Unnecessary state churn and redundant component re-render checks during live typing.
- **Proposed Solution**: Consolidate live stats into a single `stats` object state or wrap state updates inside `React.startTransition` / single object setter.

```typescript
// Proposed Replacement in src/hooks/useTypingEngine.ts

// Single state setter for live stats:
const [liveStats, setLiveStats] = useState<TypingStats>({
  currentWpm: 0, rawWpm: 0, currentAcc: 100, timeline: [], consistency: 100, flawless: 0
});

// Update inside 500ms interval:
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

#### Bug 2.3: Unmemoized Function Prop in `useRace` Hook Return Object (`useRace.ts`)
- **File Path**: `src/hooks/useRace.ts`
- **Line Numbers**: Line 377
- **Root Cause**: In `useRace.ts`, line 377 returns `getTimelines: () => timelinesRef.current` as an inline arrow function. Because this function reference changes on every render of `useRace`, any parent or child component depending on `race` or `race.getTimelines` cannot use `React.memo` effectively.
- **Potential Impact**: Defeats component memoization for child components receiving `getTimelines` or `race` as props.
- **Proposed Solution**: Wrap `getTimelines` in `useCallback`.

```typescript
// Proposed Replacement in src/hooks/useRace.ts (Line 377)

const getTimelines = useCallback(() => timelinesRef.current, []);

return {
  status, code, raceId, isHost, players, error, selfId,
  getTimelines, roomSize, lobbyConfig, createRoom, joinRoom,
  startRace, sendProgress, sendFinish, leave, updateLobbyConfig
};
```

---

### Focus Area 3: Expensive Computations in Render & Typing Loops

#### Bug 3.1: Heavy Regex Re-compilation in Syntax Highlighter (`TypingArea.tsx`)
- **File Path**: `src/components/TypingArea.tsx`
- **Line Numbers**: Lines 14–75
- **Root Cause**: `useSyntaxHighlighter` creates 6 distinct RegExp objects inside the hook computation:
  `const keywords = /\b(import|export|...)\b/g;`
  `const strings = /(['"\`])(?:(?=(\\?))\2.)*?\1/g;`
  `const numbers = /\b\d+(\.\d+)?\b/g;`
  `const funcs = /\b([a-zA-Z_]\w*)(?=\s*\()/g;`
  `const comments = /(\/\/.*|\/\*[\s\S]*?\*\/)/g;`
  `const htmlTags = /<\/?[\w\s="/.':;#-\/\?]+>/g;`
  `const cssProps = /\b([a-zA-Z-]+)(?=\s*:)/g;`
  While `useMemo` caches the result per text, creating and compiling these regular expressions inside the function body on every cache miss (e.g. text change or level switch) causes garbage collection pressure and parsing latency.
- **Potential Impact**: Frame stutter / UI freezes when starting code typing tests or rendering code blocks with 100+ lines.
- **Proposed Solution**: Hoist regular expression definitions outside the hook component function so they are compiled once at module load time.

```typescript
// Proposed Replacement in src/components/TypingArea.tsx (Lines 14–75)

// Pre-compiled regex patterns (Module Scope):
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
    if (!isActive || !text) return colors;

    let match: RegExpExecArray | null;
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

#### Bug 3.2: O(N) Array Operations & Multi-pass Filtering on Keystroke Log (`useTypingEngine.ts`)
- **File Path**: `src/hooks/useTypingEngine.ts`
- **Line Numbers**: Lines 58–129
- **Root Cause**: In `calculateStats`, the function computes errors using `entries.filter(k => k.isError && !k.isBackspace).length`, then runs a step loop `for (let i = 1; i <= intervals; i++)` iterating through keystrokes, followed by `timeline.map(p => p.wpm)...`, `wpmVals.reduce(...)` (mean), `wpmVals.reduce(...)` (variance), and another `for (const k of entries)` loop for flawless streak.
- **Potential Impact**: Multi-pass iterations over growing array `keystrokeLog` every 500ms create CPU overhead during long typing tests (e.g. 60s or 120s tests with 1,000+ keystrokes).
- **Proposed Solution**: Consolidate error counting and flawless streak calculations into a single single-pass loop.

---

### Focus Area 4: DOM & Event Listener Overhead

#### Bug 4.1: Forced Synchronous Layout / Reflow (`getBoundingClientRect()`) on Every Keystroke in `GlidingBar` (`TypingArea.tsx`)
- **File Path**: `src/components/TypingArea.tsx`
- **Line Numbers**: Lines 461–480
- **Root Cause**: `GlidingBar` uses a `useEffect` triggered on `[index, containerRef]`. On **every single character typed**, it schedules a `requestAnimationFrame` that calls `container.getBoundingClientRect()` and `el.getBoundingClientRect()`.
  Calling `getBoundingClientRect()` forces the browser browser layout engine to flush pending style changes and perform synchronous layout calculations (forced reflow).
- **Potential Impact**: Severe layout thrashing and dropped animation frames during rapid typing (100–160 WPM).
- **Proposed Solution**: Cache container rectangle or use character offset dimensions (`offsetLeft`, `offsetTop`, `offsetWidth`) relative to `containerRef` which avoids querying full viewport bounding rects.

```typescript
// Proposed Replacement in src/components/TypingArea.tsx (Lines 461-480)

useEffect(() => {
  const rafId = requestAnimationFrame(() => {
    const container = containerRef.current;
    if (!container) return;

    const el = container.querySelector<HTMLElement>(`[data-char-index="${index}"]`);
    if (!el) { setPos(null); return; }

    // Use offsetLeft / offsetTop instead of getBoundingClientRect() to prevent forced synchronous layout
    const x = el.offsetLeft;
    const y = el.offsetTop + el.offsetHeight - 4;
    const w = Math.max(6, el.offsetWidth);

    setPos({ x, y, w });
  });

  return () => cancelAnimationFrame(rafId);
}, [index, containerRef]);
```

---

#### Bug 4.2: Layout Thrashing on `onMouseMove` in WPM Graph (`WpmGraph.tsx`)
- **File Path**: `src/components/graphs/WpmGraph.tsx`
- **Line Numbers**: Lines 176–181
- **Root Cause**:
  ```typescript
  onMouseMove={(e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * 800;
    const t = ((svgX - 60) / 700) * durationMs;
    if (t >= 0 && t <= durationMs) setHoveredTimeMs(t);
    else setHoveredTimeMs(null);
  }}
  ```
  `e.currentTarget.getBoundingClientRect()` is called on **every mousemove event**. Moving the mouse across the graph fires dozens of mousemove events per second, forcing layout calculations on every event frame.
- **Potential Impact**: Janky hover tooltip movement and high CPU usage when hovering over performance graphs.
- **Proposed Solution**: Cache the SVG element's bounding client rect on `onMouseEnter` or `ResizeObserver`, and reuse the cached rect in `onMouseMove`.

```typescript
// Proposed Replacement in src/components/graphs/WpmGraph.tsx

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

#### Bug 4.3: Missing Passive Event Listener Flags on Document Listeners (`App.tsx` & `AccountMenu.tsx`)
- **File Path**: `src/App.tsx` (Lines 354–367) and `src/components/AccountMenu.tsx` (Line 38)
- **Line Numbers**: `App.tsx` lines 364; `AccountMenu.tsx` line 38
- **Root Cause**: `document.addEventListener('mousedown', handleClickOutside)` does not pass `{ passive: true }`. Non-passive document-level event listeners require the browser engine to wait for the event handler to finish executing before processing scrolling or touch actions.
- **Potential Impact**: Degraded scroll/touch performance while dropdown menus are active.
- **Proposed Solution**: Pass `{ passive: true }` when attaching click-outside event listeners.

```typescript
// Proposed Replacement in src/App.tsx (Line 364)
document.addEventListener('mousedown', handleClickOutside, { passive: true });

// Proposed Replacement in src/components/AccountMenu.tsx (Line 38)
document.addEventListener('mousedown', onClick, { passive: true });
```

---

## 3. Observation Summary Table

| Bug ID | Category | File Path | Lines | Impact Level |
|---|---|---|---|---|
| **1.1** | Memory Leak | `src/hooks/useRace.ts` | 257–285 | **High** |
| **1.2** | Key Collision & Leak | `src/hooks/useParticles.ts` | 33, 50–53 | **Medium** |
| **2.1** | Re-render Cascade | `src/App.tsx` | 303–344, 701–704 | **Critical** |
| **2.2** | Redundant State Setters | `src/hooks/useTypingEngine.ts` | 185–190 | **Medium** |
| **2.3** | Prop Unmemoization | `src/hooks/useRace.ts` | 377 | **Medium** |
| **3.1** | Excessive Regex Execution | `src/components/TypingArea.tsx` | 14–75 | **High** |
| **3.2** | Multi-pass Array Scans | `src/hooks/useTypingEngine.ts` | 58–129 | **Medium** |
| **4.1** | Layout Thrashing | `src/components/TypingArea.tsx` | 461–480 | **Critical** |
| **4.2** | MouseMove Reflow | `src/components/graphs/WpmGraph.tsx` | 176–181 | **High** |
| **4.3** | Non-passive Listener | `src/App.tsx`, `AccountMenu.tsx` | 364, 38 | **Low** |

---

## 4. Logic Chain

1. **Observation**: `GlidingBar` in `TypingArea.tsx` calls `getBoundingClientRect()` inside a `requestAnimationFrame` loop on every single character index change (`input.length` update).
   - **Reasoning**: `getBoundingClientRect()` forces synchronous geometry recalculation by the browser layout engine. On every keypress, this interrupts rendering and forces layout thrashing.
   - **Conclusion**: Replacing `getBoundingClientRect()` with relative `offsetLeft`/`offsetTop` eliminates forced reflows during active typing.

2. **Observation**: `App.tsx` re-renders on every character keypress because `useTypingEngine` updates `input` state, and `App.tsx` computes a brand new 35-property `snapshot` object and multiple unmemoized custom hook return values on every render pass.
   - **Reasoning**: Top-level state updates force all child components (header, menus, panels, modals) to re-evaluate their render trees.
   - **Conclusion**: Mutating `stateRef.current` in-place and memoizing hook return objects prevents workspace-wide re-render cascades.

3. **Observation**: `useRace.ts` schedules 800ms and 2500ms timeouts when subscribing to presence without recording timer handles in a ref for teardown.
   - **Reasoning**: If a user leaves the room or unmounts the modal within 2.5s, the callback fires asynchronously and calls `setError` or `leave()` on a stale/unmounted hook state.
   - **Conclusion**: Tracking timeout handles in `roomTimeoutsRef` and clearing them on `teardown()` eliminates async timer state leak.

---

## 5. Caveats

- **No Source Code Modifications Made**: Under audit constraints, no modifications were made directly to `src/` files. Proposed code replacements are formatted for drop-in implementation by the implementer agent.
- **Browser-Specific API Performance**: Layout thrashing from `getBoundingClientRect()` is particularly severe in Chrome and Safari. Testing on lower-end mobile devices will show the highest impact from the proposed fixes.

---

## 6. Conclusion

The audit identified critical bottlenecks in DOM layout thrashing, top-level React re-render cascades, uncleaned asynchronous timers, and regex compilation loops. Implementing the proposed concrete code changes will dramatically improve input responsiveness, eliminate memory leaks during room navigation, and stabilize frame rates during 100+ WPM typing sessions.

---

## 7. Verification Method

To independently verify these findings and check the fixes once implemented:
1. **Layout Thrashing Check**:
   Open Chrome DevTools -> Performance tab -> Record while typing at ~100 WPM in `TypingArea`. Look for purple "Forced Reflow" warning bars associated with `getBoundingClientRect` in `GlidingBar`.
2. **Re-render Audit**:
   Enable React DevTools "Highlight updates when components render". Type a character in `TypingArea`. Verify that header, account menu, and background elements do NOT flash/re-render.
3. **Memory Leak Check**:
   In Chrome DevTools -> Memory tab, take heap snapshots before and after creating and rapidly leaving 10 ranked/private race rooms. Verify no leaked `RealtimeChannel` closures or pending timer handles remain.
