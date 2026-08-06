# Detailed Analysis: Timeout Memory Leaks (BUG-19, BUG-20, BUG-21)

## Executive Summary
This document provides a complete investigation of R1: Timeout Memory Leaks across five key React hooks/components in the TypeNova codebase (`useFriends.ts`, `TypingController.tsx`, `RaceModal.tsx`, `SocialModal.tsx`, and `PlayerProfileModal.tsx`).
All identified issues stem from calling `setTimeout` without storing the timeout ID in a `useRef` or clearing pending timers upon component unmount or state re-triggers.

---

## 1. BUG-19: Untracked `setTimeout` Calls in `useFriends.ts`

### Target File
`src/hooks/useFriends.ts`

### Findings & Verbatim Snippets
There are **4 instances** of untracked `setTimeout` calls used to clear transient error messages after a 3000ms delay:

1. **Instance 1 (Line 127)** — Inside `addFriend` (Already Friends check):
   ```typescript
   125: if (friends.some(f => f.username.toLowerCase() === lowerTarget)) {
   126:   setError('ALREADY FRIENDS WITH THIS USER.');
   127:   setTimeout(() => setError(null), 3000);
   128:   return false;
   129: }
   ```

2. **Instance 2 (Line 132)** — Inside `addFriend` (Request Already Sent check):
   ```typescript
   130: if (outgoingRequests.some(f => f.toLowerCase() === lowerTarget)) {
   131:   setError('REQUEST ALREADY SENT.');
   132:   setTimeout(() => setError(null), 3000);
   133:   return false;
   134: }
   ```

3. **Instance 3 (Line 173)** — Inside `addFriend` (Catch Block):
   ```typescript
   172: setError(msg.toUpperCase());
   173: setTimeout(() => setError(null), 3000);
   174: return false;
   ```

4. **Instance 4 (Line 206)** — Inside `acceptRequest` (Catch Block):
   ```typescript
   205: setError((err as Error).message || 'Failed to accept request');
   206: setTimeout(() => setError(null), 3000);
   207: return false;
   ```

*(Note: Line 262 contains `const initTimer = setTimeout(() => fetchFriends(), 0);` inside `useEffect`, which **is properly cleaned up** on lines 265 and 292 via `clearTimeout(initTimer)`).*

### Problem Analysis
- None of the 4 `setTimeout` calls store their timer handles or check component lifecycle.
- If the parent component consuming `useFriends` unmounts while a 3000ms timer is pending, the timer fires `setError(null)` on an unmounted state hook, causing React memory leak warnings.
- If multiple errors are triggered sequentially within 3 seconds, multiple concurrent timers race against each other, prematurely clearing newer error messages.

### Recommended React Pattern Fix
Introduce a `useRef` for tracking the error dismiss timeout and a helper function `setErrorWithTimeout` (or inline ref management), plus an unmount `useEffect` cleanup:

```typescript
const errorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

const setErrorWithTimeout = useCallback((msg: string | null) => {
  if (errorTimeoutRef.current) {
    clearTimeout(errorTimeoutRef.current);
    errorTimeoutRef.current = null;
  }
  setError(msg);
  if (msg) {
    errorTimeoutRef.current = setTimeout(() => {
      setError(null);
      errorTimeoutRef.current = null;
    }, 3000);
  }
}, []);

// Cleanup on unmount
useEffect(() => {
  return () => {
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
    }
  };
}, []);
```
Replace the raw `setTimeout(() => setError(null), 3000)` calls with `setErrorWithTimeout(...)`.

---

## 2. BUG-20: Untracked `setShake` Timeout in `TypingController.tsx`

### Target File
`src/components/TypingController.tsx`

### Findings & Verbatim Snippets
Inside the keyboard event handler for typing errors (Lines 188–193):

```typescript
188: if (isError) {
189:   audio.playSound('error');
190:   typing.setCombo(0);
191:   typing.comboRef.current = 0;
192:   typing.setShake(true);
193:   setTimeout(() => typing.setShake(false), 200);
194:   if (cfg.stickyKeysMode) gameActions.setStickyPenalty(3);
```

### Problem Analysis
- When an incorrect key is pressed, `typing.setShake(true)` is invoked, followed immediately by an anonymous, untracked `setTimeout(() => typing.setShake(false), 200)`.
- If the user types fast and makes multiple errors within 200ms, earlier timeouts fire and clear `shake` prematurely (e.g. after 50ms instead of 200ms after the latest error).
- If the player aborts/resets the test or unmounts `TypingController` within 200ms of a mistake, `typing.setShake(false)` executes on an unmounted state tree.

### Recommended React Pattern Fix
Add a `shakeTimeoutRef` to `TypingController` to track the pending shake timer, cancel pre-existing timers when a new error occurs, and clear it on unmount:

```typescript
const shakeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

// Inside error handler:
if (shakeTimeoutRef.current) {
  clearTimeout(shakeTimeoutRef.current);
}
typing.setShake(true);
shakeTimeoutRef.current = setTimeout(() => {
  typing.setShake(false);
  shakeTimeoutRef.current = null;
}, 200);

// Component unmount cleanup
useEffect(() => {
  return () => {
    if (shakeTimeoutRef.current) {
      clearTimeout(shakeTimeoutRef.current);
    }
  };
}, []);
```

---

## 3. BUG-21: Untracked Exit Animation & Feedback Timeouts in Modals

### Target Files
1. `src/components/RaceModal.tsx`
2. `src/components/SocialModal.tsx`
3. `src/components/PlayerProfileModal.tsx`

### Findings & Verbatim Snippets

#### A. `RaceModal.tsx`
1. **Exit Animation Timeout (Line 86)**:
   ```typescript
   83: const handleClose = () => {
   84:   if (isClosing) return;
   85:   setIsClosing(true);
   86:   setTimeout(() => {
   87:     mmCancel();
   88:     resetMatchState();
   89:     onClose();
   90:   }, 180);
   91: };
   ```
2. **Clipboard Feedback Timeouts (Lines 172 & 179)**:
   ```typescript
   169: const copyCode = () => {
   170:   navigator.clipboard.writeText(code);
   171:   setCopied(true);
   172:   setTimeout(() => setCopied(false), 2000);
   173: };
   174: 
   175: const copyLink = () => {
   176:   const url = `${window.location.origin}${window.location.pathname}?room=${code}`;
   177:   navigator.clipboard.writeText(url);
   178:   setCopiedLink(true);
   179:   setTimeout(() => setCopiedLink(false), 2000);
   180: };
   ```

#### B. `SocialModal.tsx`
1. **Exit Animation Timeout (Line 28)**:
   ```typescript
   25: const handleClose = () => {
   26:   if (isClosing) return;
   27:   setIsClosing(true);
   28:   setTimeout(() => {
   29:     onClose();
   30:   }, 180);
   31: };
   ```

#### C. `PlayerProfileModal.tsx`
1. **Exit Animation Timeout (Line 122)**:
   ```typescript
   119: const handleClose = () => {
   120:   if (isClosing) return;
   121:   setIsClosing(true);
   122:   setTimeout(onClose, 180);
   123: };
   ```

### Problem Analysis
- All three modals feature a 180ms CSS exit scale animation triggered by setting `isClosing = true`, followed by an anonymous `setTimeout` calling `onClose()` (and resetting state / cancelling matchmaking in `RaceModal`).
- If the modal is unmounted externally by the parent component (e.g. state change, navigation, room status shift) before 180ms elapses, the scheduled timeout callback still runs and attempts state updates / callback triggers on an unmounted modal.
- In `RaceModal.tsx`, clicking `Copy Code` or `Copy Link` schedules 2000ms timeouts (`setCopied(false)` / `setCopiedLink(false)`) that leak if the modal closes within 2 seconds.

### Recommended React Pattern Fix

#### For `RaceModal.tsx`:
```typescript
const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
const copyCodeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
const copyLinkTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

const handleClose = () => {
  if (isClosing) return;
  setIsClosing(true);
  closeTimeoutRef.current = setTimeout(() => {
    mmCancel();
    resetMatchState();
    onClose();
  }, 180);
};

const copyCode = () => {
  navigator.clipboard.writeText(code);
  setCopied(true);
  if (copyCodeTimeoutRef.current) clearTimeout(copyCodeTimeoutRef.current);
  copyCodeTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
};

const copyLink = () => {
  const url = `${window.location.origin}${window.location.pathname}?room=${code}`;
  navigator.clipboard.writeText(url);
  setCopiedLink(true);
  if (copyLinkTimeoutRef.current) clearTimeout(copyLinkTimeoutRef.current);
  copyLinkTimeoutRef.current = setTimeout(() => setCopiedLink(false), 2000);
};

useEffect(() => {
  return () => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    if (copyCodeTimeoutRef.current) clearTimeout(copyCodeTimeoutRef.current);
    if (copyLinkTimeoutRef.current) clearTimeout(copyLinkTimeoutRef.current);
  };
}, []);
```

#### For `SocialModal.tsx`:
```typescript
const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

const handleClose = () => {
  if (isClosing) return;
  setIsClosing(true);
  closeTimeoutRef.current = setTimeout(() => {
    onClose();
  }, 180);
};

useEffect(() => {
  return () => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
  };
}, []);
```

#### For `PlayerProfileModal.tsx`:
```typescript
const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

const handleClose = () => {
  if (isClosing) return;
  setIsClosing(true);
  closeTimeoutRef.current = setTimeout(onClose, 180);
};

useEffect(() => {
  return () => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
  };
}, []);
```

---

## 4. Summary Matrix of Findings

| Bug ID | File | Line # | Untracked Operation | Root Cause | Proposed Solution |
|--------|------|--------|---------------------|------------|-------------------|
| **BUG-19** | `src/hooks/useFriends.ts` | 127 | `setTimeout(() => setError(null), 3000)` | Auto-dismiss error without timeout ref / unmount cleanup | Add `errorTimeoutRef`, wrap in `setErrorWithTimeout`, clean up in `useEffect` |
| **BUG-19** | `src/hooks/useFriends.ts` | 132 | `setTimeout(() => setError(null), 3000)` | Auto-dismiss error without timeout ref / unmount cleanup | Add `errorTimeoutRef`, wrap in `setErrorWithTimeout`, clean up in `useEffect` |
| **BUG-19** | `src/hooks/useFriends.ts` | 173 | `setTimeout(() => setError(null), 3000)` | Auto-dismiss error without timeout ref / unmount cleanup | Add `errorTimeoutRef`, wrap in `setErrorWithTimeout`, clean up in `useEffect` |
| **BUG-19** | `src/hooks/useFriends.ts` | 206 | `setTimeout(() => setError(null), 3000)` | Auto-dismiss error without timeout ref / unmount cleanup | Add `errorTimeoutRef`, wrap in `setErrorWithTimeout`, clean up in `useEffect` |
| **BUG-20** | `src/components/TypingController.tsx` | 193 | `setTimeout(() => typing.setShake(false), 200)` | Untracked shake reset timeout on keystroke error | Store in `shakeTimeoutRef`, clear prior timer, clean up in `useEffect` |
| **BUG-21** | `src/components/RaceModal.tsx` | 86 | `setTimeout(..., 180)` | 180ms exit animation close timeout | Store in `closeTimeoutRef`, clear in unmount `useEffect` |
| **BUG-21** | `src/components/RaceModal.tsx` | 172, 179 | `setTimeout(..., 2000)` | Copy code/link status reset timeouts | Store in `copyCodeTimeoutRef`/`copyLinkTimeoutRef`, clear in unmount `useEffect` |
| **BUG-21** | `src/components/SocialModal.tsx` | 28 | `setTimeout(..., 180)` | 180ms exit animation close timeout | Store in `closeTimeoutRef`, clear in unmount `useEffect` |
| **BUG-21** | `src/components/PlayerProfileModal.tsx` | 122 | `setTimeout(onClose, 180)` | 180ms exit animation close timeout | Store in `closeTimeoutRef`, clear in unmount `useEffect` |

---

## 5. Verification Method

1. **Static Analysis & Linting**:
   - Run `npx tsc --noEmit` to verify type safety after adding `useRef` handles.
2. **Lifecycle & Memory Leak Verification**:
   - Inspect components with React DevTools and trigger actions (error states, shake events, modal closes, clipboard copies).
   - Fast-unmount components before timers expire and verify zero unmounted state update warnings in browser console.
