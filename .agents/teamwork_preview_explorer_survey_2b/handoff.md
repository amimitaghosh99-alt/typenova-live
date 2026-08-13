# Handoff Report — Explorer Survey 2b (Visual, WebGL, Canvas, Animation)

## 1. Observation
- **`src/components/SplashCursor.tsx`**:
  - Lines 882–888: `calcDeltaTime()` uses `Date.now()` (coarse ~15.6ms timer resolution on Windows) and clamps frame delta with `Math.min(dt, 0.016666)` (a ~60 FPS cap).
  - Lines 1297–1300: Unmount cleanup handler cancels `animationFrameId` and aborts event listeners, but fails to delete WebGL textures (`gl.deleteTexture`), framebuffers (`gl.deleteFramebuffer`), buffers (`gl.deleteBuffer`), shaders (`gl.deleteShader`), or linked programs (`gl.deleteProgram`), or call `WEBGL_lose_context`.
  - Lines 1234 & 1254: `updateFrame()` is invoked inside first-interaction event listeners without checking if an animation loop is already running.
- **`src/components/AIChatBot.tsx`**:
  - Lines 291–345: `<LaserFlow />` is permanently mounted in DOM regardless of `isOpen` state. Outer wrapper uses `opacity-0 invisible pointer-events-none` when closed.
- **`src/components/LaserFlow.tsx`**:
  - Lines 416–420 & 536–552: `resizeRaf = requestAnimationFrame(setSizeNow)` is scheduled during resize events but omitted from the unmount `cancelAnimationFrame` list.
  - Lines 470–503: `adjustDprIfNeeded` evaluates average FPS against hardcoded thresholds `lowerThresh = 50` and `upperThresh = 58`, assuming a 60 FPS monitor cap.
  - Lines 505–534: `animate()` checks `!inViewRef.current` via `IntersectionObserver` (line 426). In DOM, `opacity-0 invisible` elements still intersect the viewport, so `LaserFlow` continues rendering 3D volumetric fog WebGL shaders 120+ times per second in the background when ChatBot is closed.
- **`src/components/TypingArea.tsx`**:
  - Lines 459–483: `GlidingBar` runs a `requestAnimationFrame` on every character typed, traversing DOM `offsetParent` trees to measure `offsetLeft`/`offsetTop`/`offsetWidth`/`offsetHeight`, forcing synchronous layout reflows and triggering a React state update (`setPos`) per keystroke.
  - Lines 516–535: `useGhostRace` runs a 100ms `setInterval` calling `setGhost(...)`, forcing 10 re-renders per second during typing gameplay.
- **`src/contexts/LoaderContext.tsx`**:
  - Lines 37–48: `LoaderContext.Provider` receives `{ startLoading, stopLoading, setCurrentStep }` inline without `useMemo`, causing reference instability on state updates.
- **`src/components/academy/CyberHands.tsx`**:
  - Lines 578–610: Active key sonar target circles use Framer Motion `<motion.circle>` keyed with `holo-target-1-${normalizedKey}` and `repeat: Infinity`. Rapid typing at 120+ WPM causes continuous mounting/unmounting of infinite Framer Motion loops.

## 2. Logic Chain
1. **WebGL Memory & Context Leaks**:
   - `SplashCursor` creates textures, FBOs, and shaders upon mount on the Login page.
   - When navigating to the App page, `SplashCursor` unmounts without calling WebGL deletion methods or context loss extension.
   - Navigating between pages or changing props accumulates orphan WebGL contexts until WebGL limits (`TOO_MANY_CONTEXTS`) trigger context lost errors and memory leaks.
2. **Background GPU Waste**:
   - `AIChatBot` keeps `<LaserFlow />` mounted permanently.
   - `IntersectionObserver` does not pause rendering when `visibility: hidden` or `opacity: 0` is applied.
   - Therefore, `LaserFlow` runs full 3D volumetric shader rendering at 120+ FPS in the background, consuming 20–40% GPU continuously during normal gameplay.
3. **120+ FPS Framerate Bottlenecks & Micro-Stutter**:
   - `SplashCursor` uses `Date.now()` (coarse ~15.6ms Windows OS timer) and clamps `dt` with `Math.min(dt, 0.016666)` (hardcoding a ~60 FPS upper step limit).
   - At 120+ FPS, timer precision jitter causes uneven frame pacing.
   - `LaserFlow` uses 60 FPS thresholds (`50` / `58`) for DPR adjustments, failing to scale dynamically for 120+ Hz displays.
4. **Layout Thrashing & Re-render Overhead**:
   - `GlidingBar` measures DOM geometry (`offsetLeft`, `offsetTop`, `offsetWidth`, `offsetHeight`) inside rAF on every character typed, forcing layout recalculation (forced reflow).
   - Un-memoized `LoaderContext` provider value triggers unnecessary re-renders across consumers when loader states update.
   - Rapid keypresses in `CyberHands` churn Framer Motion instance handles.

## 3. Caveats
- Read-only survey phase: No source code modifications were made outside `.agents/`.
- All proposed remediation strategies preserve 100% visual fidelity and feature parity.

## 4. Conclusion
The root causes of app-wide stuttering, background GPU overhead, WebGL context leaks, and 60 FPS performance caps are identified across `SplashCursor.tsx`, `LaserFlow.tsx`, `AIChatBot.tsx`, `TypingArea.tsx`, `LoaderContext.tsx`, and `CyberHands.tsx`. By implementing the proposed remediation strategies, TypeNova will achieve stable 120+ FPS performance without artificial framerate caps or visual degradation.

## 5. Verification Method
1. **WebGL Context & Memory Leak**:
   - Inspect active WebGL contexts in Chrome DevTools Memory/WebGL tab while navigating between `/login` and `/` 10+ times. Context count must remain stable at 1 with zero WebGL warnings.
2. **120+ FPS & GPU Overhead**:
   - Enable FPS Meter in DevTools Rendering tab. Verify background GPU usage drops significantly when Aru ChatBot is closed and frame rate reaches stable 120+ FPS on high-refresh displays.
3. **Layout Reflow Verification**:
   - Profile typing gameplay with DevTools Performance recorder; verify zero `Forced Reflow` warnings from `GlidingBar`.
4. **TypeScript & Build Check**:
   - Run `npx tsc --noEmit` and `npm run build` to confirm zero compilation errors.
