# Changes Report — Milestone 3: UI Transitions, Mode Switching & React Re-render Optimizations

## Overview
This milestone delivers comprehensive performance optimizations across React state isolation, component memoization, typing latency, cursor layout metrics, CSS GPU transitions, and timer/listener lifecycle cleanup.

---

## Detailed File Modifications

### 1. `src/App.tsx`
- **StatsPanel Prop Optimization**: Removed `keystrokeLogLength={typing.keystrokeLog.current.length}` which was passing a constantly incrementing integer on every keypress and defeating memoization. Retained clean boolean `hasStarted={typing.keystrokeLog.current.length > 0}`.
- **GPU Composited Transitions**: Replaced layout-thrashing `transition-all duration-1000` on the main container and difficulty panel with targeted properties (`transition-[max-width] duration-500`, `transition-[margin,padding] duration-500`, `transition-opacity duration-500`) with GPU acceleration (`will-change-[opacity,transform]`).

### 2. `src/components/StatsPanel.tsx`
- **Memo Comparator Simplification**: Removed `keystrokeLogLength` comparison and prop definitions. `StatsPanel` now relies cleanly on `hasStarted` along with the 500ms throttled `liveStats` (`wpm`, `accuracy`, `consistency`, `combo`, `timelinePoints`), eliminating re-renders on keystrokes during active runs.

### 3. `src/components/TypingArea.tsx`
- **GlidingBar Memoization & Observer Lifecycle**: Wrapped `GlidingBar` in `React.memo`.
- **Eliminated ResizeObserver Re-instantiation Churn**: Decoupled `measureRef` from the `ResizeObserver` / `window.addEventListener('resize')` lifecycle so `ResizeObserver` is only mounted once with the container rather than disconnected and recreated on every keystroke.
- **Imports**: Added missing `useCallback` import.

### 4. `src/components/SettingsModal.tsx`
- **Imports & Lifecycle Cleanup**: Added missing `useRef` import. Ensured `reportTimeoutRef` clears on unmount and when new reports are submitted.

### 5. `src/components/SupportTechnician.tsx`
- **Compilation & Memory Cleanup**: Added missing `useMemo` import. Wired `suggestStarters` into `starters` state and `executeAction` into model action buttons. Removed unused dead variable `EMPTY_STARTERS`.

### 6. `src/components/academy/AcademyLayout.tsx`
- **Timer Lifecycle**: Added `exitTimeoutRef` with `useEffect` unmount cleanup to avoid firing state updates or callbacks on unmounted components when user exits the Academy quickly.

### 7. `src/hooks/useAcademyEngine.ts`
- **Web Audio API Native Scheduling**: Replaced raw `setTimeout` calls for audio tones with native Web Audio API sample-accurate timestamp scheduling (`beepAt(now + offset, freq, dur, type, gain)`), completely eliminating audio timer drift and memory overhead.
- **Shake Timeout Teardown**: Added `shakeTimeoutRef` with unmount teardown for the error shake state.

### 8. `src/hooks/useChallenges.ts`
- **Async Unsubscribe Cleanup**: Added `tempTimersRef` Set tracking for all temporary Supabase channel unsubscribe timeouts (`scheduleUnsubscribe`), ensuring full cancellation if the hook unmounts while challenge responses are pending.

### 9. `src/hooks/useSmartEngineConfig.ts`
- **Timer Lifecycle**: Added `glowTimeoutRef` with cleanup on unmount for the provider glow animation.

---

## Verification Results
- `npx tsc --noEmit`: 0 errors (exited with code 0).
- `npm run build` (`tsc -b && vite build`): 0 errors (exited with code 0, 2,269 modules transformed).
