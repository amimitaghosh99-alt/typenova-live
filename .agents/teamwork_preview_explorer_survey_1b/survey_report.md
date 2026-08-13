# TypeNova Survey Report: Global Contexts, State Management & Top-Level Render Tree

**Author**: Explorer 1 (Global Contexts & State Management)  
**Date**: August 13, 2026  
**Target Goal**: Eliminate app-wide stuttering and lag to achieve a stable **120+ FPS** without artificial framerate caps, preserving 100% feature parity (Multi-Step Loader, Aru Chatbot, Academy Mode, Video Calls, etc.).

---

## 1. Executive Summary

A deep audit of the TypeNova React codebase reveals that the primary root cause of severe app-wide stuttering and framerate drops during typing is **uncontrolled top-level re-renders and unmemoized context providers**. 

Specifically, every keystroke in `TypingArea` triggers a top-level state update in `MainApp` (`src/App.tsx`), forcing all ~2000 lines of JSX, unmemoized child components (including `StatsPanel`, `AccountMenu`, `SegmentedControl`, `AIChatBot`, `AcademyEntry`, `CyberHands`, `VirtualKeyboard`, `VideoCallOverlay`), and subtrees to completely re-render. Additionally, global context providers such as `LoaderContext` and `VideoCallContext` pass unmemoized object literals or rely on unmemoized hook return methods, invalidating React context consumers across the application.

---

## 2. Global Contexts Audit

### 2.1 LoaderContext (`src/contexts/LoaderContext.tsx`)

- **File & Line**: `src/contexts/LoaderContext.tsx:38`
- **Code snippet**:
  ```tsx
  return (
    <LoaderContext.Provider value={{ startLoading, stopLoading, setCurrentStep }}>
      {children}
      <MultiStepLoader ... />
    </LoaderContext.Provider>
  );
  ```
- **Bottleneck Identified**:
  The value object `{ startLoading, stopLoading, setCurrentStep }` is instantiated as a fresh object literal on **every single render** of `LoaderProvider`.
- **Evidence & Propagation**:
  `LoaderProvider` wraps the root `<App />` component in `src/main.tsx:16`. Whenever internal state in `LoaderProvider` changes (`loading`, `loadingStates`, `duration`, `loop`, `controlledState`), `LoaderProvider` re-renders and pushes a new object reference into `LoaderContext`. Any component consuming `useGlobalLoader()` (such as `MainApp` in `src/App.tsx:185`) is forced to re-render.
- **Remediation Strategy**:
  Memoize the context value using `useMemo`:
  ```tsx
  const value = React.useMemo(
    () => ({ startLoading, stopLoading, setCurrentStep }),
    [startLoading, stopLoading, setCurrentStep]
  );
  ```

---

### 2.2 VideoCallContext & useWebRTC Hook (`src/contexts/VideoCallContext.tsx` & `src/hooks/useWebRTC.ts`)

- **File & Line**:
  - `src/contexts/VideoCallContext.tsx:16-28`
  - `src/hooks/useWebRTC.ts:321-333`
- **Code snippet**:
  ```tsx
  // VideoCallContext.tsx
  const value = React.useMemo(() => webrtc, [
    webrtc.localStream,
    webrtc.remoteStream,
    webrtc.callState,
    webrtc.incomingCaller,
    webrtc.activeCallWith,
    webrtc.callUser,
    webrtc.acceptCall,
    webrtc.rejectCall,
    webrtc.endCall,
    webrtc.toggleVideo,
    webrtc.toggleAudio,
  ]);
  ```
- **Bottleneck Identified**:
  In `useWebRTC.ts`, the functions `callUser`, `acceptCall`, `rejectCall`, `endCall`, `toggleVideo`, `toggleAudio` are inline function declarations inside the hook returned without `useCallback`.
- **Evidence & Propagation**:
  On every render of `useWebRTC`, those function references change identity. As a result, the `useMemo` dependency check inside `VideoCallContext.tsx` evaluates to `false` on **every single render** of `VideoCallProvider`. Any component consuming `useVideoCall()` (such as `VideoCallOverlay.tsx`) re-renders uncontrollably.
- **Remediation Strategy**:
  1. Wrap all action handlers in `useWebRTC.ts` in `useCallback`.
  2. Ensure `VideoCallContext.tsx` receives stable function references so `useMemo` remains effective.

---

## 3. Top-Level Render Tree Audit (`src/App.tsx` & `src/main.tsx`)

### 3.1 Monolithic `MainApp` Component (`src/App.tsx:180-2049`)

- **File & Line**: `src/App.tsx:180-2049`
- **Bottleneck Identified**:
  `MainApp` is a monolithic ~1870-line component. It calls **over 15 state hooks and custom hooks** at its root level:
  - `useAudioEngine()`
  - `useTypingEngine()` (updates state on **every single keypress**)
  - `useRPGSystem()`
  - `useQuests()`
  - `useParticles()`
  - `useGlassPointer()`
  - `useGameConfig()`
  - `useAuth()`
  - `useCloudSync()`
  - `useFriends()`
  - `useChallenges()`
  - `useRace()`
  - `useSmartDrills()`
  - `useGlobalLoader()`
  - Local state for activeModal, dailyStreak, leaderboard, dailyBoard, friendsBoard, activeTitle, nameInput, isAruOpen, etc.

- **Evidence & Frame-Rate Impact**:
  When a user types at 120 WPM (20+ keystrokes per second):
  1. `TypingController` calls `setInputSync`, `setCombo`, or `setShake` inside `useTypingEngine`.
  2. `useTypingEngine` state updates.
  3. `MainApp` re-renders its **entire tree**: Header, navigation buttons, category selectors, difficulty pills, StatsPanel, TypingArea, Sidebar leaderboard, Ask Aru widget, account dropdown, version badge, modal layer, and VideoCallProvider.
  4. At 120 Hz/144 Hz display refresh rates, re-rendering hundreds of DOM and SVG elements every 8ms causes heavy layout recalculation and garbage collection pressure, dropping frames below 120 FPS.

- **Remediation Strategy**:
  1. Wrap child components in `React.memo` to prevent re-renders when parent state updates.
  2. Isolate high-frequency typing state from static/unrelated UI elements (Header, Sidebar, Modals, Account Menu).

---

## 4. Component Memoization & Prop-Drilling Audit

### 4.1 Missing `React.memo` on High-Frequency & Complex Subtrees

A comprehensive grep across `src/` revealed that key UI components lack `React.memo`:

| Component File | Location | Re-render Cause | Impact |
|---|---|---|---|
| `src/components/StatsPanel.tsx` | Line 1 | Missing `React.memo` | Re-renders on every keystroke when `wpm`, `accuracy`, `combo` update |
| `src/components/AccountMenu.tsx` | Line 1 | Missing `React.memo` | Re-renders on every keystroke despite static user info |
| `src/components/SegmentedControl.tsx` | Line 1 | Missing `React.memo` | Re-created options array & re-renders difficulty tabs on every key |
| `src/components/AIChatBot.tsx` | Line 1 | Missing `React.memo` | Re-renders chatbot container on every keystroke due to inline `aruStats` object |
| `src/components/academy/AcademyEntry.tsx` | Line 1 | Missing `React.memo` | Re-renders CTA button on every keystroke |
| `src/components/academy/CyberHands.tsx` | Line 1 | Missing `React.memo` | Re-renders 3D SVG hand model on every keystroke |
| `src/components/academy/VirtualKeyboard.tsx` | Line 1 | Missing `React.memo` | Re-renders full virtual keyboard matrix on every keystroke |
| `src/components/VideoCallOverlay.tsx` | Line 1 | Missing `React.memo` | Re-renders video overlay on every typing event |
| `src/components/SplashCursor.tsx` | Line 1 | Missing `React.memo` | WebGL canvas container re-evaluated on parent re-renders |
| `src/components/ui/multi-step-loader.tsx` | Line 1 | Missing `React.memo` | Re-renders multi-step loader overlay on every state tick |

---

### 4.2 Unmemoized Inline Callbacks & Object Allocation (Prop-Drilling)

In `src/App.tsx`, props passed into child components are instantiated inline:

1. **`AIChatBot` (`App.tsx:2038-2045`)**:
   - `aruStats` is created as an unmemoized inline object literal (`aruStats = useMemo(...)` is present, but `aruWeakKeys` inside it depends on `rpg.heatmapData`, which changes frequently).
2. **`AccountMenu` (`App.tsx:1756-1767`)**:
   - `onSignIn={() => { void auth.signInWithGoogle(); }}` — Inline function allocation.
   - `onSignOut={() => { void auth.signOut(); }}` — Inline function allocation.
3. **`SegmentedControl` (`App.tsx:1421-1435`, `1458-1468`, `1511-1521`)**:
   - `options={(["NOVICE", "ADEPT", ...]).map(...)}` — Array mapped inline on every render.
4. **`TypingController` (`App.tsx:1074-1088`)**:
   - `onUnlockGodMode={() => setShowGodMode(true)}` — Inline function allocation.
   - `onReset={handleReset}` — `handleReset` is recreated on state changes.
   - `onExitMicroDrill={exitMicroDrill}` — Inline function allocation.

---

## 5. Feature Parity & System Safety Requirements

When optimizing global contexts and state management, the following feature contracts MUST be preserved with zero breaking changes:

1. **Multi-Step Loader Parity**:
   - Controlled state, auto-progression step timing (`duration`), custom loading text arrays, and overlay backdrop blur must remain fully functional.
2. **Aru Chatbot Parity**:
   - Heatmap weak key analysis, live performance stats input, AI drill triggering (`onStartDrill`), and smooth open/close toggle must function without lag.
3. **Academy Mode & 3D Visuals Parity**:
   - Lesson navigation, step indicators, error shake feedback, adaptive neural drills, Web Audio API sound synthesis, `CyberHands` finger highlighting, and `VirtualKeyboard` key mapping must maintain complete parity.
4. **Video Call WebRTC Parity**:
   - Socket.io signaling, ICE candidate queuing, local/remote stream binding, draggable overlay position, video/audio mute toggles, and clean stream cleanup on unmount must remain robust.
5. **Fluid Cursor Simulation Parity (`SplashCursor`)**:
   - WebGL fluid simulation contexts, touch/pointer event handling, velocity dissipation, and cleanup on unmount must operate smoothly without spawning duplicate WebGL contexts.

---

## 6. Proposed Remediation Strategy

To achieve **120+ FPS** performance across high-refresh displays:

```
[MainApp] (App.tsx)
  │
  ├── Memoized LoaderProvider (LoaderContext.tsx with useMemo value)
  │
  ├── Memoized VideoCallProvider (VideoCallContext.tsx + useCallback in useWebRTC)
  │
  ├── Memoized High-Frequency Components (React.memo):
  │     ├── Header & ProfileCard (React.memo)
  │     ├── SegmentedControls (React.memo + pre-allocated options)
  │     ├── StatsPanel (React.memo)
  │     ├── LeaderboardSidebar (React.memo)
  │     ├── AccountMenu & FloatingControls (React.memo)
  │     └── AIChatBot (React.memo + stable aruStats)
  │
  └── Isolated Typing Canvas / TypingArea (React.memo + stable keydown controller)
```

### Action Items for Implementation:

1. **Fix `LoaderContext.tsx`**:
   Wrap context value `{ startLoading, stopLoading, setCurrentStep }` in `useMemo`.
2. **Fix `useWebRTC.ts` & `VideoCallContext.tsx`**:
   Wrap `callUser`, `acceptCall`, `rejectCall`, `endCall`, `toggleVideo`, `toggleAudio` in `useCallback`.
3. **Wrap High-Frequency Components in `React.memo`**:
   Apply `React.memo` to `StatsPanel`, `AccountMenu`, `SegmentedControl`, `AIChatBot`, `AcademyEntry`, `CyberHands`, `VirtualKeyboard`, `VideoCallOverlay`, `SplashCursor`, `MultiStepLoader`.
4. **Stabilize Callback Props in `App.tsx`**:
   Extract all inline arrow functions (`onSignIn`, `onSignOut`, `onUnlockGodMode`, `onExitMicroDrill`) into `useCallback` references or stable variables.

---

## 7. Verification Method

To verify these performance optimizations independently:

1. **Compilation Check**:
   Run TypeScript typecheck:
   ```bash
   npx tsc --noEmit
   ```
2. **Build Verification**:
   Build the production bundle:
   ```bash
   npm run build
   ```
3. **Framerate & Render Profiling**:
   - Open React Developer Tools Profiler and Chrome Performance Panel.
   - Record a 10-second typing session at 120+ WPM.
   - Verify that `MainApp` re-renders do NOT force unnecessary re-renders of `Header`, `LeaderboardSidebar`, `AccountMenu`, `AIChatBot`, or `VideoCallOverlay`.
   - Confirm frame rendering stays consistently below 8.3ms per frame (achieving **120+ FPS**).
