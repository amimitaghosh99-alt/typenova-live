# Handoff Report: R1 Timeout Memory Leaks (BUG-19, BUG-20, BUG-21)

## 1. Observation
Directly observed instances of untracked `setTimeout` calls across 5 files:

1. **`src/hooks/useFriends.ts` (BUG-19)**:
   - Line 127: `setTimeout(() => setError(null), 3000);`
   - Line 132: `setTimeout(() => setError(null), 3000);`
   - Line 173: `setTimeout(() => setError(null), 3000);`
   - Line 206: `setTimeout(() => setError(null), 3000);`
   - Observed: Error states set transiently with 3000ms delay to clear, but timers are untracked and unhandled on hook unmount or consecutive error triggers.

2. **`src/components/TypingController.tsx` (BUG-20)**:
   - Line 193: `setTimeout(() => typing.setShake(false), 200);`
   - Observed: Shake state set to `true` on key mismatch, followed by untracked 200ms `setTimeout` resetting `shake` to `false`.

3. **`src/components/RaceModal.tsx` (BUG-21)**:
   - Line 86: `setTimeout(() => { mmCancel(); resetMatchState(); onClose(); }, 180);`
   - Line 172: `setTimeout(() => setCopied(false), 2000);`
   - Line 179: `setTimeout(() => setCopiedLink(false), 2000);`
   - Observed: Exit animation delay (180ms) and clipboard copy state resets (2000ms) use untracked `setTimeout` calls.

4. **`src/components/SocialModal.tsx` (BUG-21)**:
   - Line 28: `setTimeout(() => { onClose(); }, 180);`
   - Observed: Exit animation delay (180ms) uses untracked `setTimeout`.

5. **`src/components/PlayerProfileModal.tsx` (BUG-21)**:
   - Line 122: `setTimeout(onClose, 180);`
   - Observed: Exit animation delay (180ms) uses untracked `setTimeout`.

---

## 2. Logic Chain
1. **From Observation 1 (`useFriends.ts`)**: `setTimeout(() => setError(null), 3000)` calls `setError` asynchronously after 3 seconds. Without storing the timeout ID in a `useRef` and clearing it during component unmount or when setting a new error, unmounting the component while an error timer is pending will invoke `setError` on an unmounted component, resulting in a memory leak.
2. **From Observation 2 (`TypingController.tsx`)**: In `TypingController.tsx`, `setTimeout(() => typing.setShake(false), 200)` is triggered inside a keydown listener when an error occurs. If multiple errors occur in rapid succession, multiple timers fire out of sync. Furthermore, if `TypingController` unmounts or resets mid-shake, the timer fires on an unmounted tree.
3. **From Observation 3, 4, 5 (`RaceModal.tsx`, `SocialModal.tsx`, `PlayerProfileModal.tsx`)**: `handleClose` sets `isClosing(true)` and schedules `onClose()` after 180ms. If the modal unmounts via external state change before 180ms, the callback runs after unmount. In `RaceModal.tsx`, `copyCode` and `copyLink` also schedule 2000ms timers that leak if unmounted.
4. **Conclusion derived from Steps 1–3**: All 5 files require ref-based tracking (`useRef`) for `setTimeout` IDs, proper clearing of previous timers before starting new ones, and explicit cleanup in `useEffect` return functions.

---

## 3. Caveats
- No caveats. All 5 files were fully inspected and line-by-line code snippets verified.

---

## 4. Conclusion
All identified timeout memory leaks (BUG-19, BUG-20, BUG-21) are fully cataloged with exact line numbers, code snippets, root causes, and clean React remediation patterns using `useRef` and `useEffect` cleanups.

---

## 5. Verification Method
1. Inspect `analysis.md` at `c:\Users\risho\OneDrive\Desktop\typenova-v2 - Copy\.agents\teamwork_preview_explorer_m1_1\analysis.md`.
2. Run `npx tsc --noEmit` after applying recommended changes to verify type safety.
3. Perform unmount tests (open/close modals quickly, trigger typing errors, add friend errors) to verify no unmounted state updates occur in console logs.
