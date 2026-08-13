# Original User Request

## 2026-08-12T20:21:01Z

Conduct a comprehensive bug-finding and performance optimization mission across the TypeNova React codebase. The user reports that the whole app is currently stuttering severely and running at 5-10 FPS. Identify and eliminate all sources of performance degradation (e.g. infinite render loops, WebGL context leaks, unthrottled layout recalculations, or heavy CSS filters/animations).

Working directory: c:\Users\risho\OneDrive\Desktop\typenova-v2 - Copy
Integrity mode: development

## Requirements

### R1. Root Cause Identification & Performance Sweep
Analyze the entire component tree (`App.tsx`, `TypingArea.tsx`, `AIChatBot.tsx`, `SplashCursor.tsx`, `LaserFlow.tsx`, etc.) to find what is causing the massive 5-10 FPS frame drop across the app. Look for rapid state updates, missing memoization, unthrottled resize/scroll/mousemove events, or background WebGL loops.

### R2. Zombie Processes & Resource Leaks
Identify any hidden timers (`setInterval`, `requestAnimationFrame`), event listeners (`mousemove`, `resize`, `keydown`), or active WebGL contexts that continue running or leak memory.

### R3. Maintain Visual Quality & Stability
Fix the lag while targeting a rock-solid **120+ FPS** performance during typing gameplay, without capping FPS artificially.

## Acceptance Criteria

### Performance & Verification
- [ ] The app runs at a smooth, stable **120+ FPS** during normal typing, menu navigation, and results screens.
- [ ] Profiling shows zero infinite render loops or uncontrolled state churn on key presses.
- [ ] Unmounting components cleanly stops all underlying WebGL/rAF loops and event listeners.
