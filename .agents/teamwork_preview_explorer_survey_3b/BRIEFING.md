# BRIEFING — 2026-08-13T03:31:30Z

## Mission
Deep codebase exploration focusing on Zombie Processes, Global Event Listeners, Multiplayer Sync, and Interactive Overlays in TypeNova to enable stable 120+ FPS performance.

## 🔒 My Identity
- Archetype: Teamwork Explorer
- Roles: Explorer 3
- Working directory: c:\Users\risho\OneDrive\Desktop\typenova-v2 - Copy\.agents\teamwork_preview_explorer_survey_3b
- Original parent: 924775c8-1100-4421-acff-66c983eac5cd
- Milestone: TypeNova Survey Phase

## 🔒 Key Constraints
- Read-only investigation — do NOT implement source code changes.
- Focus on Zombie Processes, Global Event Listeners, Multiplayer Sync, Interactive Overlays (VideoCallOverlay, Aru Chatbot).
- Target stable 120+ FPS performance without artificial framerate caps.
- Write report to survey_report.md and handoff to handoff.md.

## Current Parent
- Conversation ID: 924775c8-1100-4421-acff-66c983eac5cd
- Updated: 2026-08-13T03:31:30Z

## Investigation State
- **Explored paths**:
  - `src/App.tsx`
  - `src/components/SplashCursor.tsx`
  - `src/components/LaserFlow.tsx`
  - `src/components/AIChatBot.tsx`
  - `src/components/VideoCallOverlay.tsx`
  - `src/contexts/VideoCallContext.tsx`
  - `src/hooks/useWebRTC.ts`
  - `src/hooks/useRace.ts`
  - `src/hooks/useMatchmaking.ts`
  - `src/lib/socket.ts`
  - `src/hooks/useAcademyEngine.ts`
  - `src/hooks/useTypingEngine.ts`
  - `src/components/TypingController.tsx`
- **Key findings**:
  1. `VideoCallOverlay.tsx`: Leaks `window.addEventListener('mousemove')` & `mouseup` listeners on drag due to un-memoized handler references and `[isDragging]` effect dependency.
  2. `useWebRTC.ts`: Socket `connect` listener uses un-memoized `registerUser` declaration, causing failed `socket.off` cleanup if `userId` changes.
  3. `AIChatBot.tsx` & `LaserFlow.tsx`: `<LaserFlow />` volumetric WebGL shader remains permanently mounted in DOM and runs continuous `requestAnimationFrame` loop even when Aru Chatbot is closed (`isOpen === false`), severely impacting GPU frame budget.
  4. `SplashCursor.tsx`: Hardcoded delta-time cap `dt = Math.min(dt, 0.016666)` (60 FPS limit); unmount cleanup lacks WebGL context/texture/framebuffer disposal.
  5. `LaserFlow.tsx`: DPR auto-adjust logic hardcoded to 50–58 FPS (assuming 60Hz display).
  6. Multiplayer Sync Thrashing: Every keystroke triggers `race.sendProgress` emit -> server broadcast -> `useRace` `setPlayers` with new object array -> full `App.tsx` tree re-render thrashing.
- **Unexplored areas**: None, full scope investigated.

## Key Decisions Made
- Completed full audit of zombie processes, event listener leaks, multiplayer sync thrashing, interactive overlays, and framerate caps.
- Prepared comprehensive remediation strategy maintaining full feature parity.

## Artifact Index
- c:\Users\risho\OneDrive\Desktop\typenova-v2 - Copy\.agents\teamwork_preview_explorer_survey_3b\DISPATCH.md
- c:\Users\risho\OneDrive\Desktop\typenova-v2 - Copy\.agents\teamwork_preview_explorer_survey_3b\BRIEFING.md
- c:\Users\risho\OneDrive\Desktop\typenova-v2 - Copy\.agents\teamwork_preview_explorer_survey_3b\progress.md
- c:\Users\risho\OneDrive\Desktop\typenova-v2 - Copy\.agents\teamwork_preview_explorer_survey_3b\survey_report.md
- c:\Users\risho\OneDrive\Desktop\typenova-v2 - Copy\.agents\teamwork_preview_explorer_survey_3b\handoff.md
