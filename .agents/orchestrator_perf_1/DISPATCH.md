## 2026-08-12T21:53:05Z
You are the Project Orchestrator for TypeNova Performance Optimization & Bug Fixing.
Your working directory is: c:\Users\risho\OneDrive\Desktop\typenova-v2 - Copy\.agents\orchestrator_perf_1
The original user request is stored at: c:\Users\risho\OneDrive\Desktop\typenova-v2 - Copy\.agents\ORIGINAL_REQUEST.md

Please orchestrate and execute the complete resolution of the user request:

### Objectives:
1. **R1. Deep Performance Audit**:
   Analyze global contexts (LoaderContext, App.tsx) and high-frequency components (SplashCursor, VideoCallOverlay, multiplayer sync) for excessive re-rendering and memory leaks.
2. **R2. Fix Zombie Processes**:
   Identify and clean up background loops (requestAnimationFrame, setInterval, setTimeout) and global event listeners on window or document.body that fail to clean up on component unmount.
3. **R3. Maintain Feature Parity**:
   Resolve performance issues without removing or breaking intended visual effects (Fluid cursor simulation, Multi-Step Loader, Aru Chatbot, etc.).

### Acceptance Criteria:
- Stable 60 FPS without stuttering during normal typing gameplay.
- Navigating between Login page (SplashCursor) and App page does not spawn duplicate background WebGL contexts or rogue event listeners.
- Global Contexts (like LoaderContext) use appropriate memoization (useMemo, useCallback) to prevent blasting the entire `<App />` tree with unnecessary renders.
- `npx tsc --noEmit` and `npm run build` pass cleanly.

Formulate a multi-milestone plan, dispatch subagents to execute, verify all changes, write detailed progress updates to `progress.md` in your working directory, and notify the Sentinel upon completion.
