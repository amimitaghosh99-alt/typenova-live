# Plan: Typenova V2 Optimization (Dead Code & Framerate/Animation)

## Objective
Deliver a fully optimized, stutter-free Typenova V2 application meeting all requirements in ORIGINAL_REQUEST.md:
1. Complete dead code cleanup across components, hooks, services, and utils with zero functionality regression.
2. Comprehensive animation and framerate optimization across 3D KineticKeyboard, WebGL background shaders, UI transitions, mode switching, and React render cycles (rock-solid 120+ FPS target, no memory/timer/rAF leaks on unmount).

## Milestone Architecture
- **Phase 0: Survey & Codebase Audit**
  - Dispatch 3 Explorers (Dead Code, 3D/WebGL/Shaders, UI/Render bottlenecks).
  - Synthesize findings into `PROJECT.md` Feature Inventory & Architecture.
- **Milestone 1: Dead Code Removal (R1)**
  - Safe removal of unused imports, dead functions, zombie variables, unused state variables, and orphaned handlers.
  - Verification: TypeScript typecheck, build pass, zero regression in test suite.
- **Milestone 2: 3D KineticKeyboard, Background Shaders & WebGL Optimization (R2.1)**
  - Three.js / WebGL / Canvas / LaserFlow / SplashCursor / KineticKeyboard refactoring.
  - Teardown of render loops, WebGL context and resource disposal, 120+ FPS high-precision rAF timing.
- **Milestone 3: UI Transitions, Mode Switching & React Render Optimizations (R2.2)**
  - React context memoization, unmount cleanup of timers/listeners, state churn elimination during fast typing/mode switching, Framer Motion/CSS GPU optimizations.
- **Milestone 4: Dual Track Verification & Forensic Audit**
  - Dual Reviewers, Dual Challengers, Forensic Integrity Auditor.
  - Final acceptance: 100% tests pass, 0 type errors, clean build, clean audit verdict.
