# Implementation Plan — 27 Bug Fixes (4 Phased Rollout)

## Overview
This plan details the step-by-step resolution of all 27 identified bugs across 4 sequential rollout phases as specified in `bug_report.md`.

## Rollout Roadmap

### Phase 1: Critical Business Logic & Math Fixes (4 Bugs)
- [ ] **LOGIC-01**: Stale input state & character loss under rapid typing (`src/App.tsx`, `src/hooks/useTypingEngine.ts`)
- [ ] **LOGIC-02**: Accuracy & Net WPM miscalculation on backspacing (`src/hooks/useTypingEngine.ts`)
- [ ] **LOGIC-03**: Heatmap finger speed delay overflow (`src/hooks/useRPGSystem.ts`, `src/components/StatsDashboard.tsx`)
- [ ] **LOGIC-05**: Host migration blocked during active race (`src/hooks/useRace.ts`)

### Phase 2: Core Render Pipeline & UI Integrity (5 Bugs)
- [ ] **PERF-08**: Layout thrashing in `GlidingBar` caret (`src/components/TypingArea.tsx`)
- [ ] **PERF-03**: Top-level snapshot allocation & full component cascade (`src/App.tsx`)
- [ ] **UI-02**: Dynamic hover theme border classes purged by Tailwind safelist (`src/App.tsx`, `tailwind.config.js`)
- [ ] **UI-03**: Galaxy theme text transparent & Void theme low contrast (`src/data/constants.ts`, `src/App.tsx`)
- [ ] **UI-05**: GlidingBar caret disappears on last character (`src/components/TypingArea.tsx`)

### Phase 3: Multiplayer Stability & Memory Leaks (5 Bugs)
- [ ] **PERF-01**: Uncleaned `setTimeout` timers in Supabase Realtime subscription (`src/hooks/useRace.ts`)
- [ ] **LOGIC-04**: Multiplayer stale heatmap payload race condition (`src/App.tsx`, `src/hooks/useRPGSystem.ts`)
- [ ] **LOGIC-07**: Realtime channel leak / phantom presence on manual reset (`src/App.tsx`)
- [ ] **LOGIC-08**: Side-effects executing inside React state updater callback (`src/hooks/useQuests.ts`)
- [ ] **LOGIC-09**: Non-host false kicks on slow presence sync (`src/hooks/useRace.ts`)

### Phase 4: Component Polish & Secondary Performance (13 Bugs)
- [ ] **PERF-06**: Heavy regex re-compilation in syntax highlighter (`src/components/TypingArea.tsx`)
- [ ] **PERF-09**: Layout thrashing on `onMouseMove` in WPM graph (`src/components/graphs/WpmGraph.tsx`)
- [ ] **UI-01**: Header layout clipping on mobile & small breakpoints (`src/App.tsx`)
- [ ] **UI-04**: Sound menu missing from global Esc/modal hotkey guard (`src/App.tsx`)
- [ ] **UI-06**: Inline container position-relative particle drift (`src/components/TypingArea.tsx`)
- [ ] **UI-07**: Keyboard heatmap modal horizontal overflow (`src/components/StatsDashboard.tsx`)
- [ ] **LOGIC-06**: Reset delay timer race condition wiping active session (`src/App.tsx`)
- [ ] **LOGIC-10**: Dangling timeout in ghost pacer hook (`src/components/TypingArea.tsx`)
- [ ] **PERF-02**: Non-unique keys & trailing timeout leak in particle hook (`src/hooks/useParticles.ts`)
- [ ] **PERF-04**: Multiple individual state setters fired every 500ms (`src/hooks/useTypingEngine.ts`)
- [ ] **PERF-05**: Unmemoized function prop in `useRace` hook return object (`src/hooks/useRace.ts`)
- [ ] **PERF-07**: O(N) array operations & multi-pass filtering on keystroke log (`src/hooks/useTypingEngine.ts`)
- [ ] **PERF-10**: Missing passive event listener flags on document listeners (`src/App.tsx`, `src/components/AccountMenu.tsx`)

## Verification Strategy
- Each phase is executed by a dedicated worker subagent.
- Worker runs build (`npm run build` or `npx tsc --noEmit`) to verify zero TypeScript/JSX/syntax compilation errors.
- Orchestrator verifies phase completion and updates progress before proceeding to next phase.
- Final phase: Generate `walkthrough.md` and notify Sentinel.
