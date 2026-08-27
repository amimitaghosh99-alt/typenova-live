# Project: TypeNova Codebase Audit

## Architecture & Codebase Layout
- **Frontend / Client App**: React + TypeScript + Vite + Tailwind CSS + Zustand
- **Backend / Realtime / Auth**: Supabase (PostgreSQL, Auth, Realtime Channels/Broadcast/Presence)
- **Audio Engine**: Web Audio API / Custom synthesis / sound packs
- **Key Modules**:
  - `src/components/`: UI components, modals, visualizers, typing surface
  - `src/store/`: Zustand state management stores
  - `src/lib/` or `src/utils/`: Typing math, text generation, sound synthesis, Supabase client
  - `src/hooks/`: Custom React hooks for keyboard input, timer, audio, multiplayer
  - `src/types/`: TypeScript definitions

## Feature Inventory & Audit Tracks
| # | Feature / Domain | Description | Scope / Milestone | Owner / Subagent |
|---|------------------|-------------|-------------------|------------------|
| 1 | Core Typing Engine & Metrics | Input event listeners, cursor tracking, word wrapping, WPM/Raw/Accuracy/Consistency math, timer/pause logic | Milestone 1 (Track 1) | Explorer 1 |
| 2 | Audio & Themes Subsystem | Sound synthesis, audio unlock, theme switching, CSS variables, persistence | Milestone 1 (Track 1) | Explorer 1 |
| 3 | Multiplayer & Lobby Synchronization | Supabase Realtime, room discovery, private lobbies, countdown sync, live progress broadcast, winner determination, disconnect handling | Milestone 2 (Track 2) | Explorer 2 |
| 4 | Authentication & User State | Supabase Auth, guest sessions, profile stats saving, token refresh, protected routes | Milestone 2 (Track 2) | Explorer 2 |
| 5 | State Management & Architecture | Zustand stores, state isolation, async error handling, type safety | Milestone 2 (Track 2) | Explorer 2 |
| 6 | UI/UX & Responsive Layout | Component tree, mobile/tablet/desktop layouts, modal UX, shortcut navigation | Milestone 3 (Track 3) | Explorer 3 |
| 7 | Accessibility (a11y) & Usability | Screen reader live regions, ARIA labels, focus management, color contrast | Milestone 3 (Track 3) | Explorer 3 |
| 8 | Performance & Re-rendering | DOM vs canvas typing surface, memoization, frame rate drops, asset loading | Milestone 3 (Track 3) | Explorer 3 |
| 9 | Feature Innovation vs Benchmarks | Comparison to Monkeytype, Keybr, TypeRacer, NitroType; creative roadmap | Milestone 4 (Track 4) | Explorer 3 & Reviewers |
| 10| Synthesis & AUDIT_REPORT.md | Comprehensive final markdown deliverable with severity matrix & roadmap | Milestone 5 | Orchestrator & Synthesizer |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M0 | Survey & Codebase Mapping | Discover file tree, architecture, dependencies, schemas | none | IN_PROGRESS |
| M1 | Core Engine & Audio/Themes Audit | Deep flaw detection in typing mechanics & audio/theming | M0 | IN_PROGRESS |
| M2 | Multiplayer, Auth & State Audit | Deep flaw detection in realtime sync, auth, Zustand | M0 | IN_PROGRESS |
| M3 | UI/UX, A11y & Performance Audit | Deep flaw detection in responsiveness, a11y, rendering | M0 | IN_PROGRESS |
| M4 | Cross-Review & Adversarial Challenge | Verify findings, stress-test logic edge cases, audit integrity | M1, M2, M3 | PLANNED |
| M5 | Comprehensive Synthesis | Draft and finalize AUDIT_REPORT.md with roadmap | M4 | PLANNED |
