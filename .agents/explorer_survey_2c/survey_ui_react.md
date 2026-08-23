# Requirement R2 Comprehensive Survey Report: UI Transitions, React Re-renders, Keystroke Latency & Cleanup Audit

**Target Requirement:** R2 (UI Transitions, Mode Switching, React Re-renders, Keystroke Pipeline & Event Listener/Timer Cleanup)  
**Survey Agent:** `teamwork_preview_explorer_survey_2c`  
**Date:** 2026-08-14  

---

## Executive Summary

A comprehensive investigation of the entire frontend codebase (`src/App.tsx`, `src/components/*`, `src/hooks/*`, `src/lib/*`, and `src/index.css`) was conducted to diagnose stutter, animation lag, frame drops, and resource leaks.

The primary architectural bottlenecks causing animation lag and frame drops below 120 FPS are:
1. **Monolithic Render Cascades**: `App.tsx` (2,174 lines) hosts high-frequency state updates from `useTypingEngine` directly in root state. Every keystroke triggers a full reconciliation of the entire DOM tree (Header, Leaderboard sidebar, Controls, AIChatBot, StatsPanel, and TypingArea).
2. **Broken Component Memoization**: `StatsPanel` has a custom memo comparator that is invalidated on *every single keystroke* because `keystrokeLogLength: typing.keystrokeLog.current.length` is passed as a changing primitive integer. `TypingArea` is not wrapped in `React.memo`.
3. **Layout Thrashing in Carets and Transitions**: `GlidingBar` runs DOM queries (`querySelector`, `offsetParent` iteration) in `requestAnimationFrame` on every character input, immediately calling `setPos` and causing a second React render pass per keystroke. Mode transitions (`topHudClass`, `leaderboardClass`) animate non-composited geometry properties (`max-height`, `width`, `padding`) with `transition-all 1000ms`, causing continuous forced reflows.
4. **Heavy Animated SVG Filter Pipelines**: `CyberHands.tsx` applies Gaussian blur filters (`feGaussianBlur` stdDeviation 8 and 2) over animated SVG `<motion.g>` and `<motion.circle>` elements running infinite spring and pulse loops.
5. **Teardown Gaps**: 12+ fire-and-forget `setTimeout` calls exist across hooks and components without unmount cancellation refs, and Three.js WebGL contexts in `KineticKeyboard` lack explicit `renderer.dispose()`.

---

## 1. Top-Level State Management & App.tsx Re-render Cascades

### 1.1 Root State Churn on High-Frequency Keystrokes
* **Location:** `src/App.tsx:185–2174` & `src/hooks/useTypingEngine.ts:30–301`
* **Observation:**
  - In `App.tsx`, `typing = useTypingEngine()` is declared at line 303.
  - On every keystroke, `useTypingEngine` updates `input`, `combo`, `maxCombo`, `shake`, and every 500ms `liveStats` (`wpm`, `rawWpm`, `accuracy`, `consistency`, `timelinePoints`).
  - Because these states live in `MainApp`, every keystroke triggers a full re-render of `MainApp` and its entire JSX tree:
    - `TypeNovaLogo` and `AcademyEntry` (lines 1341–1346)
    - User avatar, title badge, XP bar, trophy button, stats button, race button, social button, comms button (lines 1354–1471)
    - `SegmentedControl` for Difficulty, Words/Seconds, Daily Challenge, Code Language (lines 1484–1574)
    - Modifier buttons (Skull, Ghost, Focus, Blind, Mirror, Fog, Sticky Keys, Overclocked) (lines 1629–1639)
    - `StatsPanel` (lines 1610–1620)
    - `TypingArea` (lines 1642–1662)
    - Leaderboard sidebar and friend rows (lines 1690–1766)
    - Floating bottom pill (Settings button, Ask Aru button, `AccountMenu`, Changelog badge) (lines 1771–1863)
    - `AIChatBot` (lines 2119–2138)
* **Impact:** Heavy CPU scripting time during fast typing (100–160 WPM = 8–15 keystrokes/sec). Frame budgets (8.33ms for 120 FPS) are exceeded by React DOM reconciliation.

### 1.2 Un-memoized Object Literals Passed to Subcomponents
* **Location:** `src/App.tsx:2127–2136` & `src/App.tsx:1039–1063`
* **Observation:**
  - `techModifiers={{ sudden_death: game.suddenDeath, overclocked: game.overclockedMode, ... }}` is instantiated as a fresh object literal on every single render pass of `MainApp`.
  - When `typing.phase === 'FINISHED'`, `resultsProps` (lines 1039–1063) is constructed anew on every frame, passing new object references to `ResultsScreen`, `RaceResultsScreen`, and `AIDrillResultsScreen`.
* **Impact:** Prevents pure component optimizations and defeats prop equality checks.

---

## 2. Typing Area & Keystroke Pipeline Bottlenecks

### 2.1 TypingArea Missing Memoization & Text Splitting
* **Location:** `src/components/TypingArea.tsx:137–356`
* **Observation:**
  - `TypingArea` is exported as a standard function component without `React.memo` (line 137).
  - Line 173: `const textArray = targetText.split('');` creates a new array of 200–1,500 strings on every render without `useMemo`.
  - Line 176–184: `particlesByIndex` map is re-allocated on every render whenever `particles` updates.

### 2.2 FocusMode & FogMode Invalidation of Char Memoization
* **Location:** `src/components/TypingArea.tsx:279–290` & `src/components/TypingArea.tsx:81–102`
* **Observation:**
  - `Char` is wrapped in `React.memo(({ char, index, colorClass, isActive, particles }) => ...)` (line 81).
  - However, when `focusMode` or `fogMode` is active:
    ```tsx
    if (focusMode && !fogMode) {
      const dist = Math.abs(index - input.length);
      if (dist < 15) finalColorClass += " blur-none filter-none opacity-100 transition-all";
      else finalColorClass += " blur-sm opacity-20";
    }
    ```
  - Because `dist` is computed for every character relative to `input.length`, **every single character span** in the paragraph receives a new `colorClass` on every keypress!
  - For a 250-word test (~1,250 characters), 1,250 `Char` components re-render simultaneously on every keystroke.

### 2.3 GlidingBar Forced Reflows and Double Renders
* **Location:** `src/components/TypingArea.tsx:403–506`
* **Observation:**
  - `GlidingBar` uses `requestAnimationFrame` on every index change (line 460):
    ```tsx
    const el = container.querySelector<HTMLElement>(`[data-char-index="${idx}"]`);
    let curr: HTMLElement | null = el;
    while (curr && curr !== container) {
      x += curr.offsetLeft;
      y += curr.offsetTop;
      curr = curr.offsetParent as HTMLElement | null;
    }
    setPos({ x, y, w });
    ```
  - In a multiplayer race or when ghost pacer is enabled, multiple `GlidingBar` components run simultaneously:
    1. User gliding caret
    2. Ghost pacer caret (100ms interval)
    3. Competitor opponent carets (`racePlayers.map(...)`, lines 330–350)
  - Every update triggers a DOM query, parent traversal, and an immediate `setPos` state update that schedules an extra render cycle in the next frame.

### 2.4 Auto-Scroll Layout Query Churn
* **Location:** `src/components/TypingArea.tsx:164–171`
* **Observation:**
  ```tsx
  useEffect(() => {
    if (!containerRef.current) return;
    const caret = document.getElementById('active-caret');
    if (caret) {
      const container = containerRef.current;
      container.scrollTo({ top: caret.offsetTop - container.clientHeight / 2 + 40, behavior: 'smooth' });
    }
  }, [input.length]);
  ```
  - During rapid typing (10+ characters/second), `container.scrollTo({ behavior: 'smooth' })` is called 10 times per second, fighting with ongoing smooth-scroll interpolations and triggering repeated layout measurements (`offsetTop`, `clientHeight`).

---

## 3. HUD, StatsPanel & Virtual Keyboard

### 3.1 Defeated Memoization in StatsPanel
* **Location:** `src/components/StatsPanel.tsx:114–134` & `src/App.tsx:1617`
* **Observation:**
  - `StatsPanel` is wrapped in `memo` with a custom comparison function.
  - In `App.tsx:1617`, `keystrokeLogLength={typing.keystrokeLog.current.length}` is passed as a prop.
  - In `StatsPanel.tsx:121`:
    ```tsx
    prevProps.keystrokeLogLength !== nextProps.keystrokeLogLength
    ```
  - On every keystroke, the length increases by 1 (1, 2, 3, ...), so the comparator evaluates to `false`.
  - Result: `StatsPanel` re-renders all 5 stat cards (`Net WPM`, `Pacing SVG Graph`, `Accuracy`, `Consistency`, `Combo`) on every keystroke, defeating its memoization.

### 3.2 CyberHands SVG Filter & Spring Animation Overhead
* **Location:** `src/components/academy/CyberHands.tsx:294–612`
* **Observation:**
  - `CyberHands` renders 20+ animated Framer Motion SVG elements (`motion.g`, `motion.circle`) using continuous spring physics (`stiffness: 400, damping: 30`).
  - Two heavy SVG Gaussian blur filters (`#holo-emerald-glow` and `#holo-cyan-glow` with `stdDeviation="8"` and `stdDeviation="2"`) are attached to active paths and circles.
  - Two pulsating sonar circles (lines 580–601) run continuous infinite loop animations (`transition={{ repeat: Infinity, duration: 1.3, ease: "easeOut" }}`).
  - In SVG rendering engines (Blink/Gecko), continuous transformation of elements with complex multi-stage filter merges forces perpetual CPU/GPU rasterization cycles.

---

## 4. UI Transitions, Mode Switching & CSS Animations

### 4.1 Universal CSS Transition Churn on All Elements
* **Location:** `src/index.css:83–86`
* **Observation:**
  ```css
  button, a, input, select, textarea, [role="button"], [role="menuitem"], [role="tab"], .glass-panel {
    @apply transition-all duration-300;
    transition-timing-function: var(--ease-apple);
  }
  ```
  - `transition-all duration-300` is applied universally to **all** interactive elements and glass panels.
  - When non-GPU properties (`border-color`, `padding`, `margin`, `width`, `max-height`) change during state transitions, the browser cannot use composite-only layers and must perform continuous layout/paint recalculations across all 300ms.

### 4.2 Non-Hardware-Accelerated Mode Switching Transitions
* **Location:** `src/App.tsx:949–953`
* **Observation:**
  ```tsx
  const topHudClass = `transition-all duration-1000 ease-[cubic-bezier(0.23,1,0.32,1)] origin-top flex flex-col md:flex-row justify-between items-center gap-6 relative z-[200] ${
    shouldHideClutter ? 'opacity-0 blur-2xl -translate-y-12 max-h-0 pointer-events-none !mb-0 overflow-hidden' : 'opacity-100 blur-none translate-y-0 max-h-none mb-8 overflow-visible'
  }`;

  const leaderboardClass = `transition-all duration-1000 ease-[cubic-bezier(0.23,1,0.32,1)] shrink-0 glass-panel rounded-[2rem] overflow-hidden ${
    shouldHideClutter ? 'w-0 opacity-0 blur-2xl translate-x-32 pointer-events-none p-0 border-transparent m-0' : 'w-full xl:w-[400px] p-8 opacity-100 blur-none translate-x-0'
  }`;
  ```
  - Animating `max-h-0` / `max-h-none` and `w-0` / `w-[400px]` with `padding: 0` / `p-8` forces the browser layout engine into continuous reflow loops for 1,000ms when entering or exiting a typing test.
  - `blur-2xl` animation adds expensive backdrop re-filters during the 1,000ms transition.

---

## 5. Event Listener & Timer Lifecycle Audit

### 5.1 Event Listener Teardown Verification Table

| File & Line | Event Type | Target | Teardown Status | Analysis |
|---|---|---|---|---|
| `src/App.tsx:209` | `storage` | `window` | ✅ Clean | Cleaned up via `window.removeEventListener` in `useEffect` return |
| `src/App.tsx:480` | `mousedown` | `document` | ✅ Clean | Cleaned up conditionally in `useEffect` return |
| `src/App.tsx:549` | `titleChanged` | `window` | ✅ Clean | Cleaned up via `window.removeEventListener` in `useEffect` return |
| `src/components/AIChatBot.tsx:141` | `storage` | `window` | ✅ Clean | Cleaned up via `window.removeEventListener` |
| `src/components/AccountMenu.tsx:43` | `mousedown` | `document` | ✅ Clean | Cleaned up via `document.removeEventListener` |
| `src/components/CosmicShaderBackground.tsx:26` | `resize` | `window` | ✅ Clean | Cleaned up via `window.removeEventListener` |
| `src/components/ExpandableInfoModal.tsx:26` | `keydown` | `window` | ✅ Clean | Cleaned up via `window.removeEventListener` |
| `src/components/KineticKeyboard.tsx:174` | `keydown` | `window` | ✅ Clean | Cleaned up in `useEffect` return |
| `src/components/KineticKeyboard.tsx:223` | `resize` | `window` | ✅ Clean | Cleaned up in `useEffect` return |
| `src/components/SegmentedControl.tsx:58` | `resize` / `ResizeObserver` | `window` / ref | ✅ Clean | `resizeObserver.disconnect()` & `removeEventListener` called |
| `src/components/SettingsModal.tsx:107` | `open_settings_tab` | `window` | ✅ Clean | Cleaned up in `useEffect` return |
| `src/components/SettingsModal.tsx:157` | `storage` | `window` | ✅ Clean | Cleaned up in `useEffect` return |
| `src/components/TypingArea.tsx:449` | `resize` / `ResizeObserver` | `window` / ref | ✅ Clean | `resizeObserver.disconnect()` & `removeEventListener` called |
| `src/components/TypingController.tsx:254` | `keydown` | `window` | ✅ Clean | Cleaned up via `window.removeEventListener` |
| `src/components/ui/starfield-background.tsx:41` | `resize` | `window` | ✅ Clean | Cleaned up in `useEffect` return |
| `src/hooks/use-outside-click.ts:16` | `mousedown` / `touchstart` | `document` | ✅ Clean | Cleaned up in `useEffect` return |
| `src/hooks/useAcademyEngine.ts:267` | `keydown` | `window` | ✅ Clean | Cleaned up with `{ capture: true }` |
| `src/hooks/usePWAInstall.ts:40` | `beforeinstallprompt` / `appinstalled` | `window` | ✅ Clean | Cleaned up in `useEffect` return |
| `src/hooks/useFriends.ts:299` | `postgres_changes` | Supabase Channel | ✅ Clean | Channel unsubscribed via `supabase.removeChannel` |
| `src/hooks/useChallenges.ts:41` | `broadcast` | Supabase Channel | ✅ Clean | `channel.unsubscribe()` called on unmount |
| `src/hooks/useRace.ts:143` | Socket.io events (6 events) | Socket.io Client | ✅ Clean | Explicit `socket.off()` for all 6 events in `teardown()` & `disconnectSocket()` |

---

### 5.2 Timer Leaks & Missing Teardowns Inventory

| File & Line | Type | Duration | Root Cause / Issue |
|---|---|---|---|
| `src/App.tsx:216` | `setTimeout` | 50ms | Fire-and-forget `open_settings_tab` event dispatch without ref |
| `src/App.tsx:273` | `setTimeout` | 700ms | Academy mode transition timeout; if unmounted before 700ms, calls `setIsAcademyMode` on unmounted component |
| `src/App.tsx:769` | `setTimeout` | 0ms | `setSaveStatus('Auto-saving...')` deferred call without cleanup |
| `src/components/AIChatBot.tsx:278` | `setTimeout` | 1500ms | `setCopiedId` reset timeout not cleared on component unmount |
| `src/components/ChangelogModal.tsx:37, 76, 123` | `setTimeout` | Various | UI scroll / tab resets not saved in refs or cleared on close |
| `src/components/SettingsModal.tsx:872` | `setTimeout` | 3000ms | `setReportStatus('idle')` timeout lacks cleanup ref |
| `src/components/SupportTechnician.tsx:154, 249, 332` | `setTimeout` | 1200ms–2000ms | `setRanAction`, `onWakeAru`, and `setCopiedId` timeouts lack cleanup refs |
| `src/components/academy/AcademyLayout.tsx:37` | `setTimeout` | 400ms | `setTimeout(onExit, 400)` runs without cleanup ref |
| `src/hooks/useAcademyEngine.ts:38, 47–49` | `setTimeout` | 50ms–300ms | Multi-tone audio synthesis beeps continue running if user exits lesson mid-sound |
| `src/hooks/useAcademyEngine.ts:252` | `setTimeout` | 300ms | `setErrorShake(false)` not cleared on unmount |
| `src/hooks/useChallenges.ts:109, 123, 139` | `setTimeout` | 1000ms | `targetChannel.unsubscribe()` timers fire in background without cancellation |
| `src/hooks/useSmartEngineConfig.ts:153` | `setTimeout` | 1500ms | `setShowGlow(false)` timeout not cleared on unmount |

---

### 5.3 WebGL and rAF Loop Teardown Audit

1. **`KineticKeyboard.tsx`**:
   - `cancelAnimationFrame` is called on unmount (line 230).
   - Geometry and materials are explicitly disposed in loop (line 233–236).
   - **Missing:** `renderer.dispose()` and `renderer.forceContextLoss()` are omitted, leaving WebGL resources in memory until garbage collection.
2. **`CosmicShaderBackground.tsx`**:
   - `cancelAnimationFrame` called on unmount (line 136).
   - `gl.deleteProgram`, `gl.deleteShader`, `gl.deleteBuffer` are explicitly invoked (lines 139–142).
3. **`StarfieldBackground.tsx`**:
   - `cancelAnimationFrame` called on unmount (line 96).

---

## 6. Synthesis & Targeted Performance Recommendations

| Bottleneck Category | Specific Root Cause | Recommended Targeted Fix |
|---|---|---|
| **App Root State Churn** | `useTypingEngine` state living in `MainApp` causes full-app re-render on every key | Isolate typing input state into `TypingArea` / `TypingController` or subscribe via fine-grained store/ref; memoize Header and Leaderboard with `React.memo`. |
| **StatsPanel Memo Breakage** | Passing `keystrokeLogLength` integer prop invalidates memo comparison on every keystroke | Pass boolean `hasStarted={keystrokeLogLength > 0}` instead of the raw integer length. |
| **GlidingBar Forced Reflow** | `offsetParent` iteration and `setPos` inside `rAF` per keypress causes forced layout & extra render passes | Calculate character positions based on fixed mono font metrics (`index * charWidth`) or use CSS transitions on pre-positioned caret anchor without DOM polling. |
| **Focus/Fog Mode Recalculation** | Recalculating `colorClass` per character on every `input.length` change invalidates all `Char` memos | Use CSS distance calculations or slice-based windowing so only characters within the focus boundary update. |
| **Mode Switch Layout Thrashing** | Animating `max-height`, `width`, and `padding` with `transition-all 1000ms` | Replace layout property transitions with GPU-accelerated `transform: scaleY/scaleX / translateY` and `opacity`. |
| **Universal CSS Transitions** | Universal `transition-all duration-300` on all interactive elements in `index.css` | Restrict transitions to specific properties (`transition-colors`, `transform`, `opacity`) instead of universal `transition-all`. |
| **Unmanaged Timers** | 12+ raw `setTimeout` calls without unmount cleanup | Wrap all asynchronous timeouts in `useRef` handles and clear them in `useEffect` cleanup returns. |
| **CyberHands SVG Filter Load** | Multi-stage SVG Gaussian blur filters on animated spring motion loops | Pre-render glow effects into static SVG/PNG assets or use lightweight CSS `drop-shadow` / `box-shadow` instead of heavy multi-pass SVG filters. |

---

*End of Survey Report `survey_ui_react.md`.*
