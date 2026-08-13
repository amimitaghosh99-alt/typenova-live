# Milestone 1 Exploration Report: Global Contexts & Render Tree Optimization

## Executive Summary
This investigation analyzed `LoaderContext.tsx`, `VideoCallContext.tsx`, and `useWebRTC.ts` for Milestone 1 of the TypeNova performance optimization project.

### Core Problems Identified
1. **Unmemoized `LoaderContext` Provider Value**:
   - In `src/contexts/LoaderContext.tsx`, the `value` object `{ startLoading, stopLoading, setCurrentStep }` was passed directly as an inline object literal to `<LoaderContext.Provider value={{ startLoading, stopLoading, setCurrentStep }}>`.
   - Every time `LoaderProvider` rendered (or updated internal state such as `loading` or `controlledState`), a new object reference was created.
   - Consequently, all consumers of `useGlobalLoader()` (including top-level `App.tsx` and `useRace.ts`) were forced to re-render on every loader state change.

2. **Unmemoized Action Callbacks in `useWebRTC.ts` Invalidation of `VideoCallContext`**:
   - In `src/hooks/useWebRTC.ts`, the six action callbacks (`callUser`, `acceptCall`, `rejectCall`, `endCall`, `toggleVideo`, `toggleAudio`) were defined as inline arrow functions without `useCallback`.
   - In `src/contexts/VideoCallContext.tsx`, the provider uses `React.useMemo(() => webrtc, [..., webrtc.callUser, webrtc.acceptCall, ...])` to stabilize the context value.
   - Because `useWebRTC` re-created these 6 functions on every render, the dependency array for `useMemo` in `VideoCallContext` changed on every render, invalidating `useMemo` every time and triggering unnecessary re-renders across all video call consumers (e.g., `VideoCallOverlay`, `CommsModal`, `RaceResultsScreen`).

---

## 1. LoaderContext Provider Value Memoization

### Target File
- `src/contexts/LoaderContext.tsx`

### Line-by-Line Changes Required

1. **Import `useMemo` from 'react'**:
   - Line 1: Change `import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';`
   - To: `import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';`

2. **Memoize Provider Value Object**:
   - Add `useMemo` block inside `LoaderProvider`:
   ```tsx
   const value = useMemo(() => ({
     startLoading,
     stopLoading,
     setCurrentStep,
   }), [startLoading, stopLoading, setCurrentStep]);
   ```

3. **Pass Memoized Value to Provider**:
   - Change line 38 from:
     ```tsx
     <LoaderContext.Provider value={{ startLoading, stopLoading, setCurrentStep }}>
     ```
   - To:
     ```tsx
     <LoaderContext.Provider value={value}>
     ```

### Complete Proposed Code for `src/contexts/LoaderContext.tsx`
```tsx
import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';
import { MultiStepLoader } from '@/components/ui/multi-step-loader';

type LoadingState = { text: string };

interface LoaderContextType {
  startLoading: (states: LoadingState[], options?: { duration?: number; loop?: boolean; controlled?: boolean }) => void;
  stopLoading: () => void;
  setCurrentStep: (stepIndex: number) => void;
}

const LoaderContext = createContext<LoaderContextType | undefined>(undefined);

export function LoaderProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(false);
  const [loadingStates, setLoadingStates] = useState<LoadingState[]>([]);
  const [duration, setDuration] = useState(2000);
  const [loop, setLoop] = useState(false);
  const [controlledState, setControlledState] = useState<number | undefined>(undefined);

  const startLoading = useCallback((states: LoadingState[], options?: { duration?: number; loop?: boolean; controlled?: boolean }) => {
    setLoadingStates(states);
    setDuration(options?.duration ?? 2000);
    setLoop(options?.loop ?? false);
    setControlledState(options?.controlled ? 0 : undefined);
    setLoading(true);
  }, []);

  const stopLoading = useCallback(() => {
    setLoading(false);
  }, []);

  const setCurrentStep = useCallback((step: number) => {
    setControlledState(step);
  }, []);

  const value = useMemo(() => ({
    startLoading,
    stopLoading,
    setCurrentStep,
  }), [startLoading, stopLoading, setCurrentStep]);

  return (
    <LoaderContext.Provider value={value}>
      {children}
      <MultiStepLoader 
        loadingStates={loadingStates} 
        loading={loading} 
        duration={duration} 
        loop={loop} 
        currentState={controlledState}
      />
    </LoaderContext.Provider>
  );
}

export function useGlobalLoader() {
  const context = useContext(LoaderContext);
  if (context === undefined) {
    throw new Error('useGlobalLoader must be used within a LoaderProvider');
  }
  return context;
}
```

---

## 2. Wrapping Action Callbacks in `useWebRTC.ts`

### Target File
- `src/hooks/useWebRTC.ts`

### Line-by-Line Changes Required

1. **Import `useCallback` from 'react'**:
   - Line 1: Change `import { useState, useEffect, useRef } from 'react';`
   - To: `import { useState, useEffect, useRef, useCallback } from 'react';`

2. **Wrap 6 Action Callbacks in `useCallback`**:
   - Re-order definitions so `rejectCall` is defined before `acceptCall` and `endCall` (since `acceptCall` and `endCall` invoke `rejectCall`).

#### Callback 1: `callUser`
```tsx
  const callUser = useCallback(async (targetId: string, targetName: string) => {
    if (!userId) {
      toast.error('You must be logged in to start a video call.');
      return;
    }
    if (callState !== 'IDLE') return;

    setCallState('CALLING');
    setActiveCallWith({ id: targetId, username: targetName });

    // Create the peer connection BEFORE the async getUserMedia call
    // so the connection is ready when camera resolves.
    const pc = createPeerConnection(targetId);
    peerConnection.current = pc;

    const stream = await startLocalVideo();
    if (!stream) {
      cleanupCall();
      return;
    }
    // Re-check after async boundary — call may have been
    // cancelled/cleaned up while we waited for camera permissions.
    if (!peerConnection.current) {
      stream.getTracks().forEach(t => t.stop());
      cleanupCall();
      return;
    }

    stream.getTracks().forEach(track => peerConnection.current!.addTrack(track, stream));

    const offer = await peerConnection.current.createOffer();
    await peerConnection.current.setLocalDescription(offer);

    sendSignal(targetId, 'offer', offer);
  }, [userId, callState]);
```

#### Callback 2: `rejectCall`
```tsx
  const rejectCall = useCallback(() => {
    if (incomingCaller) {
      sendSignal(incomingCaller.id, 'reject', { reason: 'declined' });
      cleanupCall();
    }
  }, [incomingCaller]);
```

#### Callback 3: `acceptCall`
```tsx
  const acceptCall = useCallback(async () => {
    if (!incomingCaller || !peerConnection.current) return;

    const callerId = incomingCaller.id;
    const stream = await startLocalVideo();
    if (!stream) {
      rejectCall();
      return;
    }
    // Re-check after async boundary — call may have been rejected or
    // cleaned up while we were waiting for camera permissions.
    if (!peerConnection.current) {
      stream.getTracks().forEach(t => t.stop());
      cleanupCall();
      return;
    }

    stream.getTracks().forEach(track => peerConnection.current!.addTrack(track, stream));

    const answer = await peerConnection.current.createAnswer();
    await peerConnection.current.setLocalDescription(answer);

    sendSignal(callerId, 'answer', answer);
    setActiveCallWith(incomingCaller);
    setIncomingCaller(null);
    setCallState('CONNECTED');
    processIceQueue();
  }, [incomingCaller, rejectCall]);
```

#### Callback 4: `endCall`
```tsx
  const endCall = useCallback(() => {
    if (activeCallWith) {
      sendSignal(activeCallWith.id, 'end', {});
    } else if (incomingCaller) {
      rejectCall();
    }
    cleanupCall();
  }, [activeCallWith, incomingCaller, rejectCall]);
```

#### Callback 5: `toggleVideo`
```tsx
  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) videoTrack.enabled = !videoTrack.enabled;
    }
  }, []);
```

#### Callback 6: `toggleAudio`
```tsx
  const toggleAudio = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) audioTrack.enabled = !audioTrack.enabled;
    }
  }, []);
```

---

## 3. Analysis of `VideoCallContext.tsx`
`src/contexts/VideoCallContext.tsx` contains the following `useMemo` block:
```tsx
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
- With the action callbacks in `useWebRTC.ts` wrapped in `useCallback`, all 6 function references remain identity-stable when call state is IDLE and no active call or incoming caller exists.
- Therefore, `React.useMemo` in `VideoCallContext.tsx` will NO LONGER be invalidated on every render, stabilizing the `VideoCallContext` provider value across the entire application.

---

## 4. Verification of Feature Parity & Functionality Preservation

1. **Loader Context Functionality**:
   - `startLoading(states, options)`: Correctly initializes loading steps, duration, loop mode, controlled index, and sets `loading = true`.
   - `stopLoading()`: Correctly sets `loading = false`.
   - `setCurrentStep(step)`: Correctly sets controlled step index.
   - `MultiStepLoader` overlay component: Renders identically with updated state.
   - Consumers (`App.tsx`, `useRace.ts`) retain exact access to `LoaderContextType` interface.

2. **WebRTC & Video Call Functionality**:
   - Call initiation (`callUser`), acceptance (`acceptCall`), rejection (`rejectCall`), and termination (`endCall`) retain full signaling sequence via Socket.io (`webrtc_signal`).
   - Local media stream capture (`startLocalVideo`) and remote stream attachment (`ontrack`) are unaffected.
   - Audio/video track toggles (`toggleVideo`, `toggleAudio`) directly modify track `enabled` state on `localStreamRef.current`.
   - Clean shutdown (`cleanupCall`) releases all media tracks and closes peer connection properly.

3. **TypeScript & Build Verification**:
   - Run `npx tsc --noEmit`: 0 errors.

---

## 5. Summary of Recommended Edits

| File | Change Description | Impact |
|------|--------------------|--------|
| `src/contexts/LoaderContext.tsx` | Wrap provider `value` object in `useMemo` | Prevents `<App />` tree from re-rendering on loader state changes |
| `src/hooks/useWebRTC.ts` | Wrap `callUser`, `acceptCall`, `rejectCall`, `endCall`, `toggleVideo`, `toggleAudio` in `useCallback` | Stabilizes `VideoCallContext` `useMemo` dependency array |
