# Comprehensive Static Code Review Report: UI Components, Audio & Visuals

**Reviewer**: explorer_2  
**Date**: 2026-07-29  
**Target Scope**: UI Components, Audio & Visuals Hooks  

---

## Executive Summary

A deep static code review was conducted across 11 target files covering UI rendering, audio playback, particle generation, multiplayer race modals, and statistics dashboards. Total 15 actionable bugs were identified across **Logic**, **UI**, and **Performance** categories.

---

## Detailed Bug Reports

### 1. Stale `now` Time in Web Audio One-Shot Scheduling (Logic Bug)
- **Category**: Logic Bug
- **File**: `src/hooks/useAudioEngine.ts`
- **Line Number / Function**: Line 24, `playSound` / Line 31 `createOneShot`
- **Description**: In `useAudioEngine.ts`, `playSound` captures `const now = ctx.currentTime` when initially invoked. When triggering multi-note sounds (`levelup` on lines 51-56, `achievement` on lines 57-62, `modelm` on lines 67-70), `setTimeout` calls `createOneShot` after a delay (100ms, 200ms). However, `createOneShot` uses the closed-over, stale `now` value computed at initial invocation rather than fetching the updated `ctx.currentTime`. Because `now` is in the past by 100–200ms, Web Audio schedules all oscillators immediately, causing notes to play simultaneously, clip, or pop.
- **Impact**: Multi-note audio effects (Level Up, Achievement, Model M keypresses) sound distorted or play out of sequence.
- **Proposed Solution**: Remove the closed-over `now` constant from `playSound` scope and compute `const now = ctx.currentTime` dynamically inside `createOneShot`.

```typescript
// Proposed Fix in src/hooks/useAudioEngine.ts
const createOneShot = ({ oscType = 'sine', freq = 200, duration = 0.06, gainVal = 0.2, detune = 0 }: {
  oscType?: OscillatorType; freq?: number; duration?: number; gainVal?: number; detune?: number;
}) => {
  const now = ctx.currentTime; // Fetch fresh audio context time on execution
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = oscType;
  osc.frequency.setValueAtTime(freq * (1 + comboFactor * 0.45), now);
  osc.detune.value = detune;
  gain.gain.setValueAtTime(gainVal + comboFactor * 0.25, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + duration);
};
```

---

### 2. Random ID Collisions & Heavy Keystroke State Updates in `useParticles` (Performance & Logic Bug)
- **Category**: Performance & Logic Bug
- **File**: `src/hooks/useParticles.ts`
- **Line Number / Function**: Line 33 & Line 43, `spawnParticles`
- **Description**: Particle IDs are generated using `Math.random()` (line 33). Fast typing can produce duplicate particle IDs, leading to React key collision warnings and DOM rendering artifacts. Additionally, `spawnParticles` calls `setParticles` on every single keystroke, causing full React component re-renders for parent components (`TypingArea`) 20–30 times per second during fast typing.
- **Impact**: UI frame drops and keystroke latency during fast typing streaks.
- **Proposed Solution**: Use an incremental counter or `crypto.randomUUID()` for unique particle IDs, and batch/limit state updates.

```typescript
// Proposed Fix in src/hooks/useParticles.ts
let particleIdCounter = 0;

export const useParticles = () => {
  const [particles, setParticles] = useState<Particle[]>([]);
  const cleanupTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const spawnParticles = useCallback((
    charIndex: number,
    expectedChar: string,
    themeText: string,
    count: number = 3
  ) => {
    const now = Date.now();
    const newParticles: Particle[] = Array.from({ length: count }).map(() => ({
      id: ++particleIdCounter,
      index: charIndex,
      char: Math.random() > 0.5 ? expectedChar : ['+', '*', 'x', 'o', '.'][Math.floor(Math.random() * 5)],
      tx: (Math.random() - 0.5) * 150 + 'px',
      ty: (Math.random() - 1) * 150 + 'px',
      rot: (Math.random() - 0.5) * 360 + 'deg',
      color: [themeText, 'text-white', 'text-zinc-500'][Math.floor(Math.random() * 3)],
      expireAt: now + 600
    }));

    setParticles(prev => {
      const active = prev.filter(p => p.expireAt > now);
      return [...active, ...newParticles];
    });
    // ...
```

---

### 3. Particle Map Object Creation Invalidating `Char` Component Memoization (Performance Bug)
- **Category**: Performance Bug
- **File**: `src/components/TypingArea.tsx`
- **Line Number / Function**: Line 183 (`particlesByIndex`), Line 307 (`<Char>`)
- **Description**: `<Char>` is wrapped in `React.memo` to prevent re-rendering unchanged character spans. However, `particlesByIndex` constructs a new `Map` and fresh `Particle[]` arrays (`const existing = map.get(p.index) || []; existing.push(p);`) whenever `particles` state changes. When passed to `<Char particles={particlesByIndex.get(index) ?? EMPTY_PARTICLES}>`, every character with active particles receives a newly allocated array instance on every particle update, completely bypassing `React.memo` prop equality checks.
- **Impact**: Severe DOM re-rendering overhead on every keystroke when particle effects are enabled.
- **Proposed Solution**: Store particles by index using stable structures or reference comparisons so unchanged characters don't re-render.

```typescript
// Proposed Fix in src/components/TypingArea.tsx
// Ensure stable particle array references or compare particles by identity inside Char memo custom comparison:
export const Char = memo(({ char, index, colorClass, isActive, particles }: CharProps) => (
  // ... component JSX
), (prevProps, nextProps) => {
  return (
    prevProps.char === nextProps.char &&
    prevProps.index === nextProps.index &&
    prevProps.colorClass === nextProps.colorClass &&
    prevProps.isActive === nextProps.isActive &&
    prevProps.particles === nextProps.particles
  );
});
```

---

### 4. Continuous Smooth Scroll Queue Stacking on Keystroke in `TypingArea` (UI & Performance Bug)
- **Category**: UI & Performance Bug
- **File**: `src/components/TypingArea.tsx`
- **Line Number / Function**: Line 171, `useEffect` (Auto-scroll)
- **Description**: `useEffect` executes `container.scrollTo({ top: ..., behavior: 'smooth' })` on every keystroke (`[input.length]`). Calling `scrollTo({ behavior: 'smooth' })` rapid-fire (10–15 times per second while typing) stacks smooth scroll animations in the browser engine, leading to erratic scroll stutter and visual lag.
- **Impact**: Laggy scrolling and visual jitter while typing multi-line passages.
- **Proposed Solution**: Use `behavior: 'auto'` (or throttle smooth scrolling) when updating scroll position during fast typing.

```typescript
// Proposed Fix in src/components/TypingArea.tsx
useEffect(() => {
  if (!containerRef.current) return;
  const caret = document.getElementById('active-caret');
  if (caret) {
    const container = containerRef.current;
    const targetTop = caret.offsetTop - container.clientHeight / 2 + 40;
    // Use instant scroll during fast typing to prevent animation queue jitter
    container.scrollTo({ top: targetTop, behavior: 'auto' });
  }
}, [input.length]);
```

---

### 5. Missing Word Breaking in Code Mode in `TypingArea` (UI Bug)
- **Category**: UI Bug
- **File**: `src/components/TypingArea.tsx`
- **Line Number / Function**: Line 263, `id="typing-text-container"`
- **Description**: `typing-text-container` applies `whitespace-pre-wrap` but lacks `break-words` or `break-all`. In Code mode or when displaying long continuous strings/identifiers, text exceeds container boundaries and overflows horizontally off-screen.
- **Impact**: Broken layout on narrow screens or code snippets with long variable names.
- **Proposed Solution**: Add `break-words` and `break-all` to `typing-text-container`.

```typescript
// Proposed Fix in src/components/TypingArea.tsx (Line 265)
className={`relative ${baseFontClass} tracking-wide whitespace-pre-wrap break-words text-left max-h-[70vh] overflow-y-auto pb-4 pt-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] transition-all duration-700`}
```

---

### 6. Ranked Auto-Start Ref Never Resets Across Matches (Logic Bug)
- **Category**: Logic Bug
- **File**: `src/components/RaceModal.tsx`
- **Line Number / Function**: Line 97 & Line 107, Ranked Auto-Start `useEffect`
- **Description**: `autoStartedRef.current` is set to `true` when a ranked race auto-starts. If the host finishes a match and enters a second ranked match while `RaceModal` remains mounted, `autoStartedRef.current` remains `true`. Consequently, the second ranked match auto-start effect returns early (`if (autoStartedRef.current) return;`) and never triggers the start timer.
- **Impact**: Racers get stuck in the ranked lobby indefinitely on consecutive matches.
- **Proposed Solution**: Reset `autoStartedRef.current = false` when `status` transitions out of `'lobby'` or when `code` changes.

```typescript
// Proposed Fix in src/components/RaceModal.tsx
useEffect(() => {
  if (status !== 'lobby') {
    autoStartedRef.current = false;
  }
}, [status, code]);

useEffect(() => {
  if (!isRankedRoom || status !== 'lobby' || !isHost || !bothPresent) return;
  if (autoStartedRef.current) return;
  const t = setTimeout(() => {
    autoStartedRef.current = true;
    onStartRef.current(generateText(RANKED_MODE, RANKED_WORDS, '', false));
  }, RANKED_REVEAL_MS);
  return () => clearTimeout(t);
}, [isRankedRoom, status, isHost, bothPresent]);
```

---

### 7. Modal Vertical Clipping on Small Screens in `RaceModal` (UI Bug)
- **Category**: UI Bug
- **File**: `src/components/RaceModal.tsx`
- **Line Number / Function**: Line 167, Modal Card Div
- **Description**: The modal dialog container (`bg-zinc-950 border border-zinc-800 ...`) does not specify `max-h-[90vh]` or `overflow-y-auto`. When displaying private room settings with 8 code languages, room size options, player list, and action buttons, the modal height exceeds screen height on mobile and laptop screens, clipping the action buttons off-screen.
- **Impact**: Users on smaller viewports cannot access "START RACE" or "LEAVE ROOM" buttons.
- **Proposed Solution**: Add `max-h-[90vh] overflow-y-auto` to the modal container.

```typescript
// Proposed Fix in src/components/RaceModal.tsx (Line 167)
<div className="bg-zinc-950 border border-zinc-800 rounded-[2.5rem] p-8 md:p-10 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto lucid-scale" style={{ '--delay': '0ms' } as React.CSSProperties} onClick={e => e.stopPropagation()}>
```

---

### 8. `useMemo` Invalidation via Rest Parameter Destructuring in `RaceResultsScreen` (Performance Bug)
- **Category**: Performance Bug
- **File**: `src/components/RaceResultsScreen.tsx`
- **Line Number / Function**: Line 245, `displayProps`
- **Description**: `displayProps` is wrapped in `useMemo` with `resultsProps` in its dependency array. However, `resultsProps` is constructed via rest parameter destructuring (`...resultsProps`) in the component signature. In JavaScript, rest parameters construct a brand new object instance on every component render. As a result, `displayProps` recomputes on every single render, invalidating memoization of downstream `ResultsScreen` components.
- **Impact**: Redundant re-renders of the detailed results screen on every parent update.
- **Proposed Solution**: Depend on individual scalar properties or memoize the parent rest object.

```typescript
// Proposed Fix in src/components/RaceResultsScreen.tsx
const displayProps = useMemo(() => {
  if (isSelfSelected || !selectedPlayer) return resultsProps;
  return {
    ...resultsProps,
    wpm: selectedPlayer.finishWpm ?? 0,
    accuracy: selectedPlayer.finishAcc ?? 0,
    rawWpm: selectedPlayer.rawWpm ?? selectedPlayer.finishWpm ?? 0,
    consistency: selectedPlayer.consistency ?? 0,
    durationMs: selectedPlayer.finishMs ?? resultsProps.durationMs,
    heatmapData: selectedPlayer.heatmapData ?? {},
    errorTimes: new Array(selectedPlayer.errorCount ?? 0).fill(0),
  };
}, [
  isSelfSelected,
  selectedPlayer,
  resultsProps.wpm,
  resultsProps.accuracy,
  resultsProps.rawWpm,
  resultsProps.consistency,
  resultsProps.durationMs,
  resultsProps.heatmapData,
  resultsProps.errorTimes
]);
```

---

### 9. Unhandled Unmount in Async ELO Sync Polling in `RaceResultsScreen` (Logic Bug)
- **Category**: Logic Bug
- **File**: `src/components/RaceResultsScreen.tsx`
- **Line Number / Function**: Line 114, `syncElo` & Line 141
- **Description**: `syncElo` executes asynchronous retry loops with `await new Promise(r => setTimeout(r, 1500))`. If the player leaves the room or unmounts the component during this polling, `onUpdateElo`, `setEloTransfer`, and `setEloNote` are invoked on an unmounted component.
- **Impact**: Console errors ("Can't perform a React state update on an unmounted component") and potential memory leaks.
- **Proposed Solution**: Maintain an `isMounted` flag inside the `useEffect` and check it before setting state or triggering callbacks.

```typescript
// Proposed Fix in src/components/RaceResultsScreen.tsx
useEffect(() => {
  let isMounted = true;
  if (!isRanked || rpcCalled.current) return;
  // ...
  const syncElo = async (attempts: number) => {
    for (let i = 0; i < attempts; i++) {
      if (!isMounted) return false;
      const { data } = await supabase.from('profiles').select('elo').eq('id', myUserId).maybeSingle();
      if (!isMounted) return false;
      const value = (data as { elo?: number } | null)?.elo;
      if (typeof value === 'number' && value !== myStartElo) {
        onUpdateElo?.(() => value);
        const diff = value - myStartElo;
        setEloTransfer({ amount: Math.abs(diff), direction: diff >= 0 ? 'up' : 'down' });
        return true;
      }
      await new Promise(r => setTimeout(r, 1500));
    }
    return false;
  };
  // ...
  return () => { isMounted = false; };
}, [...]);
```

---

### 10. Uncleaned Timeout in `handleShare` in `ResultsScreen` (Logic Bug)
- **Category**: Logic Bug
- **File**: `src/components/ResultsScreen.tsx`
- **Line Number / Function**: Line 78, `handleShare`
- **Description**: `setTimeout(() => setShareStatus(''), 3000)` inside `handleShare` is unmanaged. If the user clicks "PLAY AGAIN" or navigates away within 3 seconds after sharing, `setShareStatus` fires on an unmounted component.
- **Impact**: React warning on unmounted state update.
- **Proposed Solution**: Store the timer ref and clear it in a cleanup effect.

```typescript
// Proposed Fix in src/components/ResultsScreen.tsx
const shareTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

useEffect(() => {
  return () => {
    if (shareTimeoutRef.current) clearTimeout(shareTimeoutRef.current);
  };
}, []);

const handleShare = async () => {
  setShareStatus('RENDERING...');
  try {
    const result = await shareResultCard({ ... });
    setShareStatus(result === 'copied' ? 'COPIED TO CLIPBOARD!' : 'PNG DOWNLOADED!');
  } catch {
    setShareStatus('SHARE FAILED');
  }
  if (shareTimeoutRef.current) clearTimeout(shareTimeoutRef.current);
  shareTimeoutRef.current = setTimeout(() => setShareStatus(''), 3000);
};
```

---

### 11. Heatmap Row Margin Horizontal Overflow on Mobile in `ResultsScreen` (UI Bug)
- **Category**: UI Bug
- **File**: `src/components/ResultsScreen.tsx`
- **Line Number / Function**: Line 179, Heatmap Row Map
- **Description**: `heatmapRows.map` applies `style={{ marginLeft: i * 20 }}` alongside fixed-width keys (`w-10 md:w-12`). On viewports under 500px width, 10 keys plus margins equal 520px+, forcing horizontal overflow and breaking mobile responsive layout.
- **Impact**: Breaks mobile layout alignment and causes unwanted horizontal scrolling.
- **Proposed Solution**: Replace fixed pixel margins with responsive padding/margins or responsive CSS flex alignment.

```typescript
// Proposed Fix in src/components/ResultsScreen.tsx (Line 179)
<div key={i} className={`flex gap-1 md:gap-2 justify-center ${i === 1 ? 'ml-2 md:ml-5' : i === 2 ? 'ml-4 md:ml-10' : ''}`}>
```

---

### 12. Potential Exception on Missing `expected` Character in `ResultsScreen` Heatmap (Logic Bug)
- **Category**: Logic Bug
- **File**: `src/components/ResultsScreen.tsx`
- **Line Number / Function**: Line 92, `testHeatmapData`
- **Description**: `k.expected.toUpperCase()` assumes `k.expected` is always a valid string. If a keystroke object has `expected` as `undefined` or empty, calling `toUpperCase()` throws `TypeError: Cannot read properties of undefined (reading 'toUpperCase')`.
- **Impact**: Results screen crash if keystroke log contains malformed entries.
- **Proposed Solution**: Add optional chaining / fallback check `if (!k.expected) continue;`.

```typescript
// Proposed Fix in src/components/ResultsScreen.tsx (Line 92)
const testHeatmapData = useMemo(() => {
  const data: Record<string, { total: number; errors: number }> = {};
  for (const k of keystrokeLog) {
    if (k.isBackspace || !k.expected) continue;
    const char = k.expected.toUpperCase();
    if (!data[char]) data[char] = { total: 0, errors: 0 };
    data[char].total++;
    if (k.isError) data[char].errors++;
  }
  return data;
}, [keystrokeLog]);
```

---

### 13. Crash on Malformed Local Storage Personal Best Keys in `StatsDashboard` (Logic Bug)
- **Category**: Logic Bug
- **File**: `src/components/StatsDashboard.tsx`
- **Line Number / Function**: Lines 37-38, `loadPersonalBests`
- **Description**: `const [, level, cfg] = key.split(':')` assumes keys starting with `typezen_pb:` always contain at least two colons. If a key formatted as `typezen_pb:MASTER` is present in `localStorage`, `cfg` is `undefined`. Accessing `cfg.startsWith('t')` throws `TypeError: Cannot read properties of undefined (reading 'startsWith')` and crashes the stats dashboard modal.
- **Impact**: Total crash of the stats modal if local storage has corrupt or legacy keys.
- **Proposed Solution**: Check `if (!level || !cfg) continue;` before processing `cfg`.

```typescript
// Proposed Fix in src/components/StatsDashboard.tsx (Lines 37-38)
function loadPersonalBests(): Array<{ label: string; wpm: number }> {
  const out: Array<{ label: string; wpm: number }> = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith('typezen_pb:')) continue;
    try {
      const pb = JSON.parse(localStorage.getItem(key) || 'null');
      if (!pb?.wpm) continue;
      const parts = key.split(':');
      if (parts.length < 3) continue;
      const level = parts[1];
      const cfg = parts[2];
      const label = `${level} · ${cfg.startsWith('t') ? cfg.slice(1) + 's' : cfg.slice(1) + ' words'}`;
      out.push({ label, wpm: pb.wpm });
    } catch { /* ignore corrupt entries */ }
  }
  return out.sort((a, b) => b.wpm - a.wpm);
}
```

---

### 14. Fixed Minimum Width Overflow in `KeyboardHeatmap` in `StatsDashboard` (UI Bug)
- **Category**: UI Bug
- **File**: `src/components/StatsDashboard.tsx`
- **Line Number / Function**: Line 126, `KeyboardHeatmap`
- **Description**: `KeyboardHeatmap` container has hardcoded class `min-w-[600px]`. On mobile screens under 600px width, this forces horizontal scrolling and breaks modal alignment.
- **Impact**: Horizontal overflow on mobile devices inside the stats modal.
- **Proposed Solution**: Replace `min-w-[600px]` with `w-full overflow-x-auto`.

```typescript
// Proposed Fix in src/components/StatsDashboard.tsx (Line 126)
<div className="flex flex-col gap-2 items-center w-full overflow-x-auto pb-2">
```

---

### 15. Unmemoized SVG Path Calculation in `StatsPanel` (Performance Bug)
- **Category**: Performance Bug
- **File**: `src/components/StatsPanel.tsx`
- **Line Number / Function**: Lines 32-55, `renderGraph`
- **Description**: `renderGraph` recalculates the SVG `polyline` points string (`points`) on every component render without memoization. Because `StatsPanel` re-renders on every keystroke, SVG polyline strings are continuously re-computed and re-parsed by the browser.
- **Impact**: Extra CPU overhead during live typing.
- **Proposed Solution**: Wrap graph calculation in `useMemo`.

```typescript
// Proposed Fix in src/components/StatsPanel.tsx
const points = React.useMemo(() => {
  if (!timelinePoints || timelinePoints.length === 0) return null;
  const maxWpm = Math.max(...timelinePoints.map(p => p.wpm), 50);
  return timelinePoints.map((p, i) => {
    const x = (i / Math.max(timelinePoints.length - 1, 1)) * 100;
    const y = 100 - (p.wpm / maxWpm) * 100;
    return `${x},${y}`;
  }).join(' ');
}, [timelinePoints]);
```

---

## Summary Matrix

| # | Component / Hook | Category | Description |
|---|---|---|---|
| 1 | `useAudioEngine.ts` | Logic | Stale `now` timestamp in `createOneShot` breaks multi-note audio timing |
| 2 | `useParticles.ts` | Performance & Logic | `Math.random()` ID collisions & heavy per-keystroke state updates |
| 3 | `TypingArea.tsx` | Performance | Particle Map allocation invalidates `<Char>` memoization |
| 4 | `TypingArea.tsx` | UI & Performance | Rapid smooth scrolling on keystroke stacks animation frames |
| 5 | `TypingArea.tsx` | UI | Missing `break-words` causes text overflow in Code mode |
| 6 | `RaceModal.tsx` | Logic | `autoStartedRef` never resets across consecutive ranked matches |
| 7 | `RaceModal.tsx` | UI | Modal container lacks max-height overflow, clipping buttons on small screens |
| 8 | `RaceResultsScreen.tsx` | Performance | Rest parameter object destructuring invalidates `displayProps` memoization |
| 9 | `RaceResultsScreen.tsx` | Logic | Async ELO sync polling calls state updates on unmounted component |
| 10 | `ResultsScreen.tsx` | Logic | Uncleaned `setTimeout` in `handleShare` updates unmounted state |
| 11 | `ResultsScreen.tsx` | UI | Fixed row pixel margins cause heatmap overflow on mobile |
| 12 | `ResultsScreen.tsx` | Logic | `k.expected.toUpperCase()` throws if `expected` character is undefined |
| 13 | `StatsDashboard.tsx` | Logic | Malformed `typezen_pb` local storage keys crash stats dashboard |
| 14 | `StatsDashboard.tsx` | UI | `min-w-[600px]` in `KeyboardHeatmap` breaks mobile layout |
| 15 | `StatsPanel.tsx` | Performance | Unmemoized SVG polyline calculation on every keystroke |
