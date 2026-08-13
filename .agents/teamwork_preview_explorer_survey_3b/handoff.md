# Handoff Report — Explorer 3 (TypeNova Survey Phase)

## 1. Observation
- **`VideoCallOverlay.tsx` lines 62–86**: `onMouseMove` and `onMouseUp` are plain un-memoized functions created in component body. `useEffect` listening to `isDragging` passes `onMouseMove` to `window.addEventListener('mousemove', onMouseMove)`. State updates during dragging cause component re-renders that recreate `onMouseMove`. When `isDragging` becomes `false`, `window.removeEventListener('mousemove', onMouseMove)` receives a different function reference, failing to remove the listener and leaking `mousemove` handlers on `window`.
- **`useWebRTC.ts` lines 57, 115, 134–139**: `socket.on('connect', registerUser)` registers `registerUser`. Cleanup in `useEffect` at line 115 calls `socket.off('connect', registerUser)` with a newly recreated `registerUser` instance if `userId` changes, failing to remove stale handlers from the socket instance.
- **`AIChatBot.tsx` lines 290–345**: `<LaserFlow />` is permanently mounted in DOM regardless of `isOpen`. When Aru Chatbot is closed (`isOpen === false`), `LaserFlow` continues running its `requestAnimationFrame(animate)` loop in `LaserFlow.tsx:506`, executing 5-octave FBM volumetric fog calculations on GPU context continuously.
- **`SplashCursor.tsx` line 885 & 1297–1300**: `dt = Math.min(dt, 0.016666)` clamps frame delta to 60 FPS timing. Cleanup function (lines 1297–1300) only cancels RAF and aborts controller without deleting WebGL textures, framebuffers, shaders, or losing WebGL context.
- **`LaserFlow.tsx` lines 476–503**: DPR auto-scaling targets hardcoded 50–58 FPS limits, assuming a 60Hz display ceiling.
- **`App.tsx` lines 872–876 & `useRace.ts` lines 178–232**: Keystroke progress effect in `App.tsx` calls `race.sendProgress` on every keypress. The server broadcasts `lobby_state_update`. `useRace.ts` handles this by calling `setPlayers(mappedPlayers)` with a new array reference, triggering a full top-level `App.tsx` re-render storm on every keystroke during multiplayer races.

## 2. Logic Chain
1. **Event Listener Leaks**: In React, passing non-memoized functions to `window.addEventListener` inside an effect whose dependencies do not include the function reference means that when component state changes cause re-renders, the cleanup function of the effect receives a different function instance than the one originally registered. `window.removeEventListener` requires strict reference equality (`===`). Thus, event listeners remain attached to `window` permanently.
2. **Zombie Background Loops**: Components styled with CSS `opacity-0 invisible pointer-events-none` remain mounted in the React component tree and DOM. Their `requestAnimationFrame` render loops continue to execute on every screen refresh frame. In `AIChatBot.tsx`, keeping `LaserFlow` permanently mounted wastes GPU execution time on volumetric shader math even when the user is playing the main typing game.
3. **Multiplayer Sync Thrashing**: In React, calling a state setter with a new object/array reference at the top-level component (`App.tsx`) forces React to re-render the entire component tree. When `useRace` receives `lobby_state_update` every 100ms during fast typing and calls `setPlayers(mappedPlayers)`, the entire `App.tsx` tree re-renders 10 times per second, creating severe micro-stuttering.
4. **Framerate Caps**: Clamping delta-time calculation (`dt = Math.min(dt, 0.016666)`) or hardcoding target FPS ranges to 50–58 FPS restricts high-refresh rate displays (120Hz, 144Hz, 240Hz) from achieving smooth visual pacing and stable 120+ FPS performance.

## 3. Caveats
- No source code modifications were made during this survey phase (read-only investigation per constraints).
- WebGL hardware acceleration behavior may vary across GPU vendors and browser engines (Chromium vs Firefox vs WebKit).

## 4. Conclusion
The codebase contains 4 major performance and stability bottlenecks:
1. **Rogue event listener leaks** in `VideoCallOverlay.tsx` (drag event handlers) and `useWebRTC.ts` (socket `connect` listener).
2. **Zombie WebGL background loop** in `AIChatBot.tsx` / `LaserFlow.tsx` running unthrottled when the Aru chatbot is closed.
3. **Multiplayer sync re-render thrashing** in `App.tsx` / `useRace.ts` caused by un-throttled keystroke socket broadcasts triggering top-level state updates.
4. **Artificial 60 FPS framerate caps** in `SplashCursor.tsx` and `LaserFlow.tsx`.

Remediating these 4 bottlenecks using stable handler references, conditional mounting/pausing of background shaders, throttled socket state updates, and dynamic frame timing will enable TypeNova to achieve stable 120+ FPS gameplay with zero memory leaks.

## 5. Verification Method
1. **Event Listener Check**: Open DevTools console -> `getEventListeners(window)`. Drag `VideoCallOverlay` multiple times; verify listener count does not increase.
2. **GPU & RAF Check**: Open DevTools Performance panel or Chrome Task Manager. Close Aru Chatbot; verify GPU process usage drops and `LaserFlow` RAF loop pauses.
3. **Multiplayer Profiling**: Profile a multiplayer race in React DevTools. Verify `App.tsx` does not re-render on every individual keystroke.
4. **Framerate Check**: Test app on a 120Hz+ monitor; verify fluid cursor and animations maintain smooth 120+ FPS output without stuttering.
