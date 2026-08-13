# TypeNova Explorer 3 Survey Report: Zombie Processes, Event Listeners, Multiplayer Sync & Overlays

## Executive Summary
This exploration audited TypeNova's codebase for **Zombie Processes**, **Rogue Background Timers**, **Event Listener Leaks**, **Multiplayer Sync Re-Render Thrashing**, **Interactive Overlay Bottlenecks**, and **Artificial Framerate Caps**. 

Our findings indicate that while the core architecture is modular and feature-rich, several critical leaks and unnecessary background execution loops prevent the application from achieving a stable 120+ FPS experience during high-speed typing and multiplayer gameplay.

---

## Key Findings by Category

### 1. Global Event Listener Leaks & Stale Closures

#### Finding 1.1: `VideoCallOverlay.tsx` Window Mouse Listener Leak on Drag
- **Location**: `src/components/VideoCallOverlay.tsx:62-86`
- **Root Cause**: `onMouseMove` and `onMouseUp` are plain, un-memoized functions created in the body of `VideoCallOverlay`. When dragging starts (`isDragging = true`), `setPosition` updates state on every mouse movement, triggering a re-render. Since `useEffect` has dependency `[isDragging]`, it does not re-run during the drag. When `isDragging` becomes `false`, `window.removeEventListener('mousemove', onMouseMove)` receives a newly instantiated function reference that does NOT match the function reference passed to `addEventListener`.
- **Impact**: `removeEventListener` fails silently. Every drag interaction leaks zombie `mousemove` and `mouseup` event listeners onto `window`.
- **Remediation Strategy**:
  1. Store the listener callbacks in `useRef` or wrap `onMouseMove` and `onMouseUp` with `useCallback`.
  2. Alternatively, attach event listeners directly to `window` only inside the drag session using a stable handler ref, or clean up using `AbortController`.

#### Finding 1.2: `useWebRTC.ts` Socket Signal Listener Cleanup Flaw
- **Location**: `src/hooks/useWebRTC.ts:57, 115, 134-139`
- **Root Cause**: `socket.on('connect', registerUser)` registers `registerUser`, which is defined as a plain function inside the hook. In `useEffect` cleanup (line 115), `socket.off('connect', registerUser)` receives a newly recreated `registerUser` instance if `userId` changes.
- **Impact**: Failed removal of `connect` handlers on socket instance, accumulating duplicate listeners over time if user auth changes.
- **Remediation Strategy**: Memoize `registerUser` with `useCallback` or use a ref wrapper (`registerUserRef`) so `socket.off('connect', ...)` always passes the exact same function reference.

---

### 2. Zombie Processes, Rogue Background Timers & WebGL Resource Leaks

#### Finding 2.1: `AIChatBot.tsx` & `LaserFlow.tsx` Background Shader Rendering Loop
- **Location**: `src/components/AIChatBot.tsx:290-345` and `src/components/LaserFlow.tsx:506-507`
- **Root Cause**: In `AIChatBot.tsx`, `<LaserFlow />` is rendered inside a fixed full-screen container that is **permanently mounted in the DOM**, even when the Aru Chatbot is closed (`isOpen === false`). When `isOpen` is `false`, the container is styled with `opacity-0 invisible pointer-events-none`. However, `LaserFlow`'s `requestAnimationFrame(animate)` loop continues to run at 60/120/240 FPS in the background, computing 5 octaves of FBM noise and heavy volumetric fog GLSL math on GPU context.
- **Impact**: Severe background GPU overhead during active typing, reducing framerates and introducing stuttering.
- **Remediation Strategy**:
  1. Conditionally mount `<LaserFlow />` only when `isOpen === true` (or when `isOpen` transition starts).
  2. Pass an `active={isOpen}` prop to `LaserFlow` to pause `requestAnimationFrame` (`pausedRef.current = !active`) when Aru Chatbot is closed.

#### Finding 2.2: `SplashCursor.tsx` WebGL Resource Leak on Page Navigation
- **Location**: `src/components/SplashCursor.tsx:1297-1300`
- **Root Cause**: When navigating between `Login.tsx` and `App.tsx`, `SplashCursor` unmounts. The cleanup function only calls `cancelAnimationFrame(animationFrameId)` and `abortController.abort()`. It does not delete WebGL textures (`gl.deleteTexture`), framebuffers (`gl.deleteFramebuffer`), shaders (`gl.deleteShader`), or lose the WebGL context (`gl.getExtension('WEBGL_lose_context')?.loseContext()`).
- **Impact**: Spawns orphaned WebGL contexts and leaks VRAM when switching between Login and App views.
- **Remediation Strategy**:
  Explicitly dispose WebGL resources, delete framebuffers/textures, and lose WebGL context on unmount.

#### Finding 2.3: Un-tracked `setTimeout` Calls in `useAcademyEngine.ts`
- **Location**: `src/hooks/useAcademyEngine.ts:38, 47-49, 252`
- **Root Cause**: `playSuccess()`, `playLessonComplete()`, and `setErrorShake()` trigger fire-and-forget `setTimeout` calls without holding timer IDs or checking component mount status.
- **Impact**: Potential state updates on unmounted components and orphaned audio node creation if user rapidly navigates between academy lessons.
- **Remediation Strategy**: Track timeout references in refs and clear them in effect cleanup; check `mountedRef.current` before state updates.

---

### 3. Multiplayer Sync Re-Render Thrashing

#### Finding 3.1: Keystroke-by-Keystroke Socket Emission & App-Wide Re-render Storm
- **Location**: `src/App.tsx:872-876` and `src/hooks/useRace.ts:178-232, 350-368`
- **Root Cause**:
  1. In `App.tsx:872-876`, a `useEffect` watching `typing.input.length` and `typing.wpm` fires `race.sendProgress` on **every single keystroke** during multiplayer races.
  2. `race.sendProgress` emits `player_progress` to the Socket.io server.
  3. The Socket.io server broadcasts `lobby_state_update` back to all players.
  4. In `useRace.ts:178-232`, `h['lobby_state_update']` calls `setPlayers(mappedPlayers)`. `mappedPlayers` creates a brand new array reference with brand new player objects.
  5. Because `useRace` is called at the root of `App.tsx` (`const race = useRace(...)`), calling `setPlayers` forces a full re-render of the entire `App.tsx` tree on every single keystroke.
- **Impact**: Severe frame drops, micro-stuttering, and input latency thrashing during high-speed typing (120+ WPM).
- **Remediation Strategy**:
  1. Deeply compare incoming `lobby_state_update` player progress data before calling `setPlayers`, so `setPlayers` only executes when progress or status has actually changed.
  2. Throttle progress socket emissions to ~100ms and batch incoming socket updates using `requestAnimationFrame`.
  3. Memoize race UI sub-components (`RaceModal`, `RaceResultsScreen`, `StatsPanel`) with `React.memo`.

---

### 4. Target 120+ FPS & Artificial Framerate Caps

#### Finding 4.1: Hardcoded 60 FPS Delta-Time Cap in `SplashCursor.tsx`
- **Location**: `src/components/SplashCursor.tsx:885`
- **Code**: `dt = Math.min(dt, 0.016666);`
- **Root Cause**: `dt` is clamped to a maximum of 0.016666 seconds (16.66ms), which assumes a 60Hz frame timing.
- **Impact**: On 120Hz, 144Hz, or 240Hz high-refresh displays, frame intervals are 8.33ms or 4.16ms. While `Math.min(dt, 0.016666)` allows smaller `dt`, the fluid dynamics velocity dissipation and color update formulas were tuned around 60 FPS fixed steps, causing physics mismatch and stuttering on 120+ FPS monitors.
- **Remediation Strategy**: Normalize fluid simulation step sizes using actual elapsed delta time (`dt`) dynamically derived from `performance.now()`, removing 60Hz fixed assumptions.

#### Finding 4.2: Hardcoded 50–58 FPS Adaptive DPR Thresholds in `LaserFlow.tsx`
- **Location**: `src/components/LaserFlow.tsx:476-503`
- **Code**: `const lowerThresh = 50; const upperThresh = 58;`
- **Root Cause**: The adaptive Resolution/DPR controller checks if FPS is below 50 or above 58, assuming a 60 FPS target.
- **Impact**: On a 120Hz or 144Hz display, if framerates sit at ~100 FPS (which is well above 60 FPS), `LaserFlow` will fail to scale up DPR properly or will misinterpret frame timing deltas.
- **Remediation Strategy**: Scale DPR threshold checks dynamically based on `window.screen` refresh rate or relative frame budget percentage (e.g. <85% of target refresh rate) rather than hardcoded 50/58 FPS constants.

---

## Comprehensive Affected Files & Line Numbers Matrix

| Component / File | Exact Line Numbers | Issue Description | Impact | Proposed Remediation |
|---|---|---|---|---|
| `VideoCallOverlay.tsx` | 62–86 | Un-memoized `onMouseMove`/`onMouseUp` in `[isDragging]` effect | Leaks `window` event listeners on every drag | Use `useCallback` or `useRef` for event handlers |
| `useWebRTC.ts` | 57, 115, 134–139 | Un-memoized `registerUser` callback in `socket.off('connect')` | Cleanup fails on user ID change | Wrap `registerUser` in `useCallback` |
| `AIChatBot.tsx` | 290–345 | `<LaserFlow />` permanently mounted even when chatbot closed | Continuous GPU RAF rendering loop (50-100% GPU waste) | Conditionally mount or pause `LaserFlow` when closed |
| `LaserFlow.tsx` | 476–503, 506–507 | Hardcoded 50-58 FPS DPR thresholds & RAF loop | Restricts performance scaling on 120+ FPS displays | Use relative frame budget thresholds |
| `SplashCursor.tsx` | 885, 1297–1300 | 60 FPS `dt` clamp; missing WebGL texture/context disposal on unmount | GPU memory leak; stutter on 120+ Hz screens | Remove artificial cap & add full WebGL disposal |
| `App.tsx` | 872–876 | Keystroke-triggered socket emit on every keypress | Triggers app-wide re-render storm during multiplayer | Throttle socket progress updates & memoize |
| `useRace.ts` | 178–232 | `setPlayers` called with new array on every socket tick | Re-renders top-level `<App />` tree | Add deep equality check before updating player state |
| `useAcademyEngine.ts` | 38, 47-49, 156, 252 | Un-tracked `setTimeout` calls; 400ms WPM timer | Potential state updates on unmounted component | Track timeouts in refs & clear on unmount |

---

## Verification Method

1. **Event Listener Verification**:
   Open browser DevTools Console -> inspect `getEventListeners(window)`. Drag `VideoCallOverlay` multiple times and verify count of `mousemove` listeners remains constant (1 or 0 when released).

2. **Zombie Process / GPU Verification**:
   Open Chrome Task Manager / Performance Monitor. Close Aru Chatbot (`isOpen = false`). Verify GPU process utilization drops to minimal levels and no `requestAnimationFrame` loop runs for `LaserFlow`.

3. **Multiplayer Re-Render Verification**:
   Use React DevTools Profiler during a 120+ WPM multiplayer race. Verify `<App />` does NOT re-render on every single keystroke.

4. **120+ FPS Verification**:
   Run app on 120Hz+ monitor with unlocked FPS. Verify fluid cursor animation (`SplashCursor`) runs smoothly at native display refresh rate without capping or micro-stuttering.
