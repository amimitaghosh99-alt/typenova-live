# Project: Typenova V2 Optimization (Dead Code & 120+ FPS Performance)

## Architecture
Typenova V2 is a high-performance React + TypeScript web application with Three.js (3D KineticKeyboard), WebGL shaders (CosmicShaderBackground, LaserFlow), Canvas 2D animations (StarfieldBackground), Framer Motion UI animations, WebRTC video calling, AI chatbot, and real-time typing engine.

```
┌─────────────────────────────────────────────────────────────┐
│                          App.tsx                            │
│  (State Root, Theme, Sound, VideoCall, Loader Providers)    │
└──────────────────────────────┬──────────────────────────────┘
                               │
       ┌───────────────────────┼───────────────────────┐
       ▼                       ▼                       ▼
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│ Visual Layer │       │ Typing Engine│       │   UI Modes   │
│ - KineticKey │       │ - TypingArea │       │ - Arena      │
│ - Starfield  │       │ - StatsPanel │       │ - CyberHands │
│ - Shaders    │       │ - GlidingBar │       │ - AIChatBot  │
└──────────────┘       └──────────────┘       └──────────────┘
```

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| F1 | Orphaned & Dead File Removal | Delete completely unused files (`src/utils/audio.ts`, orphaned utilities) | M1 (DONE) | Survey 2A |
| F2 | Unused Imports & Exports Cleanup | Clean up dead imports (`recordConsent`), duplicate exports, and localize internal exports | M1 (DONE) | Survey 2A |
| F3 | Zombie Variables & Parameters | Remove unused parameters and dead variables (`_hideTrigger`, `_onSignIn`, `roomSize`, `error`, `models`, `PRESET_KEYS`, `AchievementState`) | M1 (DONE) | Survey 2A |
| F4 | Duplicate Utils Consolidation | Consolidate duplicate helper functions (`getTodayString` -> `todayKey`) | M1 (DONE) | Survey 2A |
| F5 | KineticKeyboard InstancedMesh | Replace 100+ individual meshes with `THREE.InstancedMesh` (1 draw call) & add delta-time physics | M2 (DONE) | Survey 2B |
| F6 | Three.js & WebGL Resource Teardown | Ensure `renderer.dispose()`, context loss, and geometry/material disposal on unmount in KineticKeyboard & Shaders | M2 (DONE) | Survey 2B |
| F7 | Starfield Canvas GC Elimination | Batch 1000 stars by opacity bucket in Canvas 2D loop, eliminate 120,000 string allocs/sec | M2 (DONE) | Survey 2B |
| F8 | Shader & Modal Loop Pacing | Fix `CosmicShaderBackground` uniform updates and throttle `ReplayModal` state updates | M2 (DONE) | Survey 2B |
| F9 | App State Churn & Typing Isolation | Prevent keystrokes in `useTypingEngine` from causing full-tree re-renders of unrelated subtrees | M3 (DONE) | Survey 2C |
| F10 | Component Memoization & Reflow Fix | Memoize `TypingArea`, fix `GlidingBar` layout reflows, fix `StatsPanel` memo invalidation | M3 (DONE) | Survey 2C |
| F11 | GPU Composite Transitions & CyberHands | Remove expensive SVG animated filter churn in CyberHands, convert layout transitions to composite properties | M3 (DONE) | Survey 2C |
| F12 | Timer & Listener Unmount Teardown | Ensure all fire-and-forget `setTimeout`, `setInterval`, window listeners, and WebRTC listeners clean up on unmount | M3 (DONE) | Survey 2C |
| F13 | Acceptance Verification & Forensic Audit | Full typecheck, production build, 120+ FPS profiling, E2E leak checks, Forensic Integrity Audit | M4 | Survey 2A/B/C |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | M1: Dead Code Removal | F1, F2, F3, F4 | none | DONE |
| 2 | M2: 3D KineticKeyboard & WebGL/Canvas Optimization | F5, F6, F7, F8 | M1 | DONE |
| 3 | M3: UI Transitions, Mode Switching & React Re-renders | F9, F10, F11, F12 | M1 | DONE |
| 4 | M4: Full Acceptance Verification & Forensic Audit | F13 | M2, M3 | IN_PROGRESS |

## Interface Contracts
### KineticKeyboard ↔ App
- `KineticKeyboard` accepts `activeKey?: string | null` and renders an instanced 3D keyboard without leaking WebGL contexts or dropping below 120 FPS.
- On unmount, releases all Three.js geometries, instanced meshes, and invokes `renderer.dispose()`.

### TypingArea ↔ useTypingEngine
- `TypingArea` consumes typing state and renders characters efficiently without synchronous DOM layout thrashing.
- `GlidingBar` tracks cursor position using cached measurements instead of recursive `offsetParent` layout reflows.

## Code Layout
- `src/components/KineticKeyboard.tsx`: 3D Three.js keyboard
- `src/components/ui/starfield-background.tsx`: Canvas 2D background
- `src/components/CosmicShaderBackground.tsx`: WebGL shader background
- `src/components/LaserFlow.tsx`: Canvas/WebGL laser drawer
- `src/components/TypingArea.tsx`, `src/components/GlidingBar.tsx`: Typing interface
- `src/components/StatsPanel.tsx`: Live statistics
- `src/components/CyberHands.tsx`, `src/components/VirtualKeyboard.tsx`: Visual typing assistants
- `src/hooks/`: Custom hooks (`useTypingEngine`, `useSmartEngineConfig`, `useAcademyEngine`, `useQuests`, etc.)
- `src/utils/`: Helper utilities (`seededRandom.ts`, etc.)
