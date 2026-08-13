## 2026-08-13T03:35:42Z
You are Worker 1 for Milestone 1: Global Contexts & Render Tree Optimization.
Your working directory is: c:\Users\risho\OneDrive\Desktop\typenova-v2 - Copy\.agents\teamwork_preview_worker_m1
Project plan: c:\Users\risho\OneDrive\Desktop\typenova-v2 - Copy\PROJECT.md
Original user request: c:\Users\risho\OneDrive\Desktop\typenova-v2 - Copy\.agents\ORIGINAL_REQUEST.md

Reports from M1 Explorers:
- Contexts: c:\Users\risho\OneDrive\Desktop\typenova-v2 - Copy\.agents\teamwork_preview_explorer_m1_1\m1_explorer_report.md
- Components Memo: c:\Users\risho\OneDrive\Desktop\typenova-v2 - Copy\.agents\teamwork_preview_explorer_m1_2\m1_explorer_report.md
- App.tsx Callbacks: c:\Users\risho\OneDrive\Desktop\typenova-v2 - Copy\.agents\teamwork_preview_explorer_m1_3\m1_explorer_report.md

Task Objectives:
Implement the Milestone 1 optimizations to eliminate unmemoized contexts, top-level re-render thrashing, and unmemoized component/prop allocations:

1. **LoaderContext.tsx**: Memoize the provider value object ({ startLoading, stopLoading, setCurrentStep }) using React.useMemo.
2. **useWebRTC.ts & VideoCallContext.tsx**: Wrap action functions (callUser, acceptCall, rejectCall, endCall, toggleVideo, toggleAudio) in React.useCallback to prevent VideoCallContext useMemo invalidation on renders.
3. **src/components/**: Wrap UI components in React.memo with appropriate prop comparison functions:
   - StatsPanel.tsx
   - AccountMenu.tsx
   - SegmentedControl.tsx
   - AIChatBot.tsx
   - VideoCallOverlay.tsx
   - SplashCursor.tsx
   - ui/multi-step-loader.tsx
   - academy/AcademyEntry.tsx
   - academy/CyberHands.tsx
   - academy/VirtualKeyboard.tsx
4. **src/App.tsx**: Stabilize all inline callback allocations (handleSignIn, handleSignOut, handleUnlockGodMode, exitMicroDrill, modal setters, theme/sound selection) using useCallback; pre-allocate or useMemo options arrays and filter results (e.g. SegmentedControl options, otherRacePlayers, aruStats during active typing).

Verification Requirements:
- Run `npx tsc --noEmit` to verify 0 TypeScript errors.
- Run `npm run build` to verify production build passes cleanly.
- Document exact build and test commands and results in your handoff report (`handoff.md`).
