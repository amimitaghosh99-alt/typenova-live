# Plan — Typenova V2 Optimization

## Overview
Decompose and orchestrate the full optimization of Typenova V2 based on `ORIGINAL_REQUEST.md`.
Primary Goals:
1. R1: Remove Dead Code (unused variables, functions, dead code paths, unused components/assets).
2. R2: Optimize Animations & Framerates (120+ FPS target, WebGL/Three.js/rAF cleanup, teardown on unmount, memoization, eliminating state churn and infinite render loops).
3. Comprehensive verification via independent E2E test suite + forensic audit.

## Steps & Timeline
1. **Phase 0: Comprehensive Survey (3 Explorers in parallel)**
   - Explorer 1: Project structure, dependencies, build/test setup, and Dead Code inventory (R1).
   - Explorer 2: 3D KineticKeyboard, Three.js/WebGL scenes, shaders, canvas, rAF loops, event listeners & unmount teardown (R2 part 1).
   - Explorer 3: React component tree, state management, render profiling, typing loop re-renders, mode switching, UI transitions (R2 part 2).
2. **Phase 1: Project Architecture & Decomposition**
   - Synthesize survey findings into `PROJECT.md` (Feature Inventory, Milestones, Interface Contracts, Code Layout).
   - Initialize `TEST_INFRA.md` for the opaque-box E2E testing track.
3. **Phase 2: Dual-Track Execution**
   - **Track A (E2E Testing Track)**: Sub-orchestrator designs & implements 4-tier test suite + runner -> produces `TEST_READY.md`.
   - **Track B (Implementation Track)**:
     - Milestone 1: Dead Code Elimination (safe cleanup of dead code paths, unused variables/imports/functions/styles).
     - Milestone 2: 3D KineticKeyboard & WebGL / Shader / rAF Loop Optimization (teardown on unmount, framerate throttling/adaptive rendering, memory leak prevention).
     - Milestone 3: React Re-render Optimization & State Churn Reduction (typing hot path, memoization, event listeners cleanup, 120+ FPS stutter-free transitions).
     - Milestone 4: Final E2E Pass & Adversarial Coverage Hardening (pass 100% of E2E tests, Tier 5 challenger hardening).
4. **Phase 3: Final Verification & Reporting**
   - Run full test suite, forensic audit check, compile performance metrics, and report final handoff to parent (Sentinel).
