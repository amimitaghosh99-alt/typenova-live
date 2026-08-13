# Project: TypeNova Performance Optimization & Bug Fixing

## Architecture
- **Global Contexts & State Layer**: `LoaderContext`, `VideoCallContext`, `useWebRTC`, `useAuth`, `useCloudSync`, `useGameConfig`.
- **Top-Level Application Container**: `App.tsx` (`MainApp`), wrapping all sub-views, HUD controls, modals, and global overlays.
- **High-Frequency Visuals & Canvas Layer**: `SplashCursor` (WebGL fluid simulation), `LaserFlow` (Volumetric GLSL shader background in `AIChatBot`), `TypingArea` / `GlidingBar`, `CyberHands` (3D SVG model), `MultiStepLoader`.
- **Interactive Overlays & Real-Time Sync**: `VideoCallOverlay` (WebRTC overlay), `AIChatBot` (Aru AI drawer), `useRace` (Multiplayer Socket.io sync), `useAcademyEngine` (Academy mode engine).

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | LoaderContext Memoization | Prevent `LoaderProvider` unmemoized value from re-rendering `<App />` tree | M1 | survey_explorer_1b |
| 2 | VideoCallContext & useWebRTC Memoization | Wrap WebRTC action callbacks in `useCallback` to stabilize context `useMemo` | M1 | survey_explorer_1b |
| 3 | UI Component Memoization (`React.memo`) | Apply `React.memo` to `StatsPanel`, `AccountMenu`, `SegmentedControl`, `AIChatBot`, `AcademyEntry`, `CyberHands`, `VirtualKeyboard`, `VideoCallOverlay`, `SplashCursor`, `MultiStepLoader` | M1 | survey_explorer_1b |
| 4 | App.tsx Callback & Option Stabilization | Extract inline callbacks (`onSignIn`, `onSignOut`, `onUnlockGodMode`, `onExitMicroDrill`) & pre-allocate `SegmentedControl` options | M1 | survey_explorer_1b |
| 5 | SplashCursor WebGL Resource Disposal | Add full WebGL resource cleanup (`gl.deleteTexture`, `gl.deleteFramebuffer`, `gl.deleteBuffer`, `gl.deleteShader`, `gl.deleteProgram`, `loseContext()`) on unmount | M2 | survey_explorer_2b |
| 6 | SplashCursor 120+ FPS & Timer Precision | Replace `Date.now()` with `performance.now()`, adjust delta time clamping for 120+ FPS rendering without 60 FPS cap | M2 | survey_explorer_2b |
| 7 | LaserFlow Background WebGL Pause | Pause `<LaserFlow />` rAF render loop when Aru ChatBot drawer is closed (`paused={!isOpen}`) and scale DPR for 120+ FPS | M2 | survey_explorer_2b |
| 8 | GlidingBar Reflow Elimination | Remove forced DOM synchronous layout reflows (`offsetParent` loops) on keystrokes in `TypingArea.tsx` | M2 | survey_explorer_2b |
| 9 | CyberHands Animation Loop Stabilization | Replace re-keying Framer Motion infinite loops on keypresses with stable keys / CSS keyframes | M2 | survey_explorer_2b |
| 10 | VideoCallOverlay Window Drag Listener Cleanup | Fix unmemoized `mousemove`/`mouseup` handlers in `useEffect` so `removeEventListener` succeeds cleanly | M3 | survey_explorer_3b |
| 11 | useWebRTC Socket Listener Cleanup | Wrap `registerUser` in `useCallback` for clean `socket.off('connect', ...)` removal | M3 | survey_explorer_3b |
| 12 | Multiplayer Sync Re-Render Throttling | Implement deep equality check on `lobby_state_update` and throttle `player_progress` socket emissions during races | M3 | survey_explorer_3b |
| 13 | useAcademyEngine Timer Cleanup | Track `setTimeout` references in refs and clear on unmount | M3 | survey_explorer_3b |
| 14 | Comprehensive E2E Testing & Final Verification | Build 4-tier requirement-driven test suite verifying 120+ FPS, zero listener/WebGL leaks, feature parity, `npx tsc --noEmit` & `npm run build` | M4 | E2E Testing Track |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | M1: Global Contexts & Render Tree Optimization | Memoize `LoaderContext`, `VideoCallContext`, wrap UI components in `React.memo`, stabilize callback props in `App.tsx` | none | PLANNED |
| 2 | M2: WebGL, Canvas & High-Frequency Visuals | WebGL disposal in `SplashCursor`, 120+ FPS timer precision, pause `LaserFlow` when ChatBot closed, eliminate `GlidingBar` reflows, stabilize `CyberHands` | M1 | PLANNED |
| 3 | M3: Zombie Processes, Event Listeners & Multiplayer Sync | Fix `VideoCallOverlay` drag listener leak, `useWebRTC` socket listener leak, `useRace` player update thrashing, `useAcademyEngine` timer cleanup | M2 | PLANNED |
| 4 | M4: Dual-Track E2E Testing & Verification | Build requirement-driven E2E test suite (Tiers 1-4 + Tier 5 adversarial), verify 120+ FPS, clean build & tsc | M3 | PLANNED |

## Interface Contracts
### LoaderContext Provider
```tsx
export interface LoaderContextType {
  startLoading: (states: Array<{ text: string }>, duration?: number, loop?: boolean) => void;
  stopLoading: () => void;
  setCurrentStep: (step: number) => void;
}
// Guaranteed stable reference equality across renders via useMemo
```

### VideoCallContext & useWebRTC
```tsx
export interface WebRTCHookResult {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  callState: 'idle' | 'calling' | 'incoming' | 'connected';
  incomingCaller: { from: string; name: string } | null;
  activeCallWith: string | null;
  callUser: (targetId: string) => Promise<void>;
  acceptCall: () => Promise<void>;
  rejectCall: () => void;
  endCall: () => void;
  toggleVideo: () => void;
  toggleAudio: () => void;
}
// Guaranteed stable function callbacks via useCallback
```

### LaserFlow Control Props
```tsx
export interface LaserFlowProps {
  paused?: boolean;
  dprScale?: number;
  // When paused=true, requestAnimationFrame loop skips renderer.render()
}
```

## Code Layout
```
src/
├── App.tsx                          # MainApp container (React.memo on child boundaries, callback stabilization)
├── main.tsx                         # Root render entry with LoaderProvider & VideoCallProvider
├── contexts/
│   ├── LoaderContext.tsx            # LoaderContext with memoized provider value
│   └── VideoCallContext.tsx         # VideoCallContext with stable WebRTC references
├── hooks/
│   ├── useWebRTC.ts                 # WebRTC hook with useCallback action handlers
│   ├── useRace.ts                   # Multiplayer race hook with deep equality player state checks
│   ├── useAcademyEngine.ts          # Academy engine with tracked timeout refs
│   └── useTypingEngine.ts           # Core typing engine
├── components/
│   ├── SplashCursor.tsx             # WebGL fluid simulation (full disposal on unmount, performance.now 120+ FPS)
│   ├── LaserFlow.tsx                # Volumetric laser shader (pausable rAF loop)
│   ├── AIChatBot.tsx                # ChatBot drawer (conditionally pauses LaserFlow when closed)
│   ├── VideoCallOverlay.tsx         # WebRTC call overlay (stable drag window event listeners)
│   ├── TypingArea.tsx               # GlidingBar & Typing input (reflow-free caret tracking)
│   ├── StatsPanel.tsx               # React.memo
│   ├── AccountMenu.tsx              # React.memo
│   ├── SegmentedControl.tsx         # React.memo
│   ├── ui/multi-step-loader.tsx     # React.memo
│   └── academy/
│       ├── AcademyEntry.tsx         # React.memo
│       ├── CyberHands.tsx           # React.memo & stable key animation loops
│       └── VirtualKeyboard.tsx      # React.memo
```
