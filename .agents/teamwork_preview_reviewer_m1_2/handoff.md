# Code Review & Handoff Report — Second Independent Review (M1 / BUG-19 to BUG-25)

**Verdict**: **APPROVE**

---

## 1. Observation

Direct code inspection and tool execution in `c:\Users\risho\OneDrive\Desktop\typenova-v2 - Copy`:

### 1. BUG-19: `src/hooks/useFriends.ts`
- **Ref creation & helpers**: Line 24 defines `const errorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);`. Lines 26–31 define `clearErrorTimeout`, and lines 33–42 define `setErrorWithTimeout`.
- **Timer clearing**: `setErrorWithTimeout` cancels pending timeouts (`clearErrorTimeout()`) before setting new state and scheduling `errorTimeoutRef.current = setTimeout(...)`.
- **Unmount cleanup**: Lines 44–48 implement a `useEffect` return cleanup that calls `clearErrorTimeout()`.
- **Call site replacements**:
  - Line 152: `setErrorWithTimeout('ALREADY FRIENDS WITH THIS USER.');`
  - Line 156: `setErrorWithTimeout('REQUEST ALREADY SENT.');`
  - Line 197: `setErrorWithTimeout(msg.toUpperCase());`
  - Line 229: `setErrorWithTimeout((err as Error).message || 'Failed to accept request');`
- **Fetch clearing**: Line 61 in `fetchFriends` calls `clearErrorTimeout()`.

### 2. BUG-20: `src/components/TypingController.tsx`
- **Ref creation**: Line 44 defines `const shakeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);`.
- **Timer clearing & assignment**: Lines 202–209 in `handleKeyDown` error branch:
  ```typescript
  if (shakeTimeoutRef.current) {
    clearTimeout(shakeTimeoutRef.current);
  }
  typing.setShake(true);
  shakeTimeoutRef.current = setTimeout(() => {
    typing.setShake(false);
    shakeTimeoutRef.current = null;
  }, 200);
  ```
- **Unmount cleanup**: Lines 62–68 implement `useEffect` cleanup clearing `shakeTimeoutRef.current`.

### 3. BUG-21: Modal Exit Animation & Clipboard Timeouts
- **`src/components/RaceModal.tsx`**:
  - Lines 59–61: `closeTimeoutRef`, `copyCodeTimeoutRef`, `copyLinkTimeoutRef` refs defined.
  - Line 89: `handleClose` clears `closeTimeoutRef.current` before scheduling 180ms exit animation timeout.
  - Line 179: `copyCode` clears `copyCodeTimeoutRef.current` before scheduling 2000ms clipboard feedback timeout.
  - Line 187: `copyLink` clears `copyLinkTimeoutRef.current` before scheduling 2000ms clipboard feedback timeout.
  - Lines 116–123: Unmount `useEffect` clears `retryTimerRef`, `closeTimeoutRef`, `copyCodeTimeoutRef`, and `copyLinkTimeoutRef`.
- **`src/components/SocialModal.tsx`**:
  - Line 24: `closeTimeoutRef` defined.
  - Line 29: `handleClose` clears `closeTimeoutRef.current` before scheduling 180ms timeout.
  - Lines 35–39: Unmount `useEffect` clears `closeTimeoutRef.current`.
- **`src/components/PlayerProfileModal.tsx`**:
  - Line 47: `closeTimeoutRef` defined.
  - Line 129: `handleClose` clears `closeTimeoutRef.current` before scheduling 180ms timeout.
  - Lines 55–59: Unmount `useEffect` clears `closeTimeoutRef.current`.

### 4. BUG-23: Callback Memoization & `React.memo`
- **`src/App.tsx`**:
  - Line 915: `const handleCloseModal = useCallback(() => setActiveModal(null), []);`
  - Line 916: `const handleStartWeaknessDrill = useCallback(...)`
  - Lines 1677–1685: `StatsDashboard` passed memoized `onClose={handleCloseModal}` and `onStartWeaknessDrill={handleStartWeaknessDrill}`.
  - Lines 1731–1736: `ChangelogModal` passed memoized `onClose={handleCloseModal}`.
- **`src/components/ChangelogModal.tsx`**:
  - Line 24: Wrapped in `memo`: `export const ChangelogModal = memo(function ChangelogModal({ theme, onClose }: ChangelogModalProps) { ... });`

### 5. BUG-24 & BUG-25: Effect Dependency Arrays in `src/App.tsx`
- **BUG-24 (Auto-save effect dependencies)**:
  - Lines 674–690:
    ```typescript
    }, [
      autoSave,
      auth.session,
      cloud.username,
      fetchDailyBoard,
      fetchLeaderboard,
      finishDurationMs,
      game.dailyActive,
      game.microDrillActive,
      supabase,
      typing.accuracy,
      typing.endTime,
      typing.input,
      typing.phase,
      typing.timePenalty,
      typing.wpm,
    ]);
    ```
  - Includes `typing.input`, `auth.session`, and `supabase`. Zero `eslint-disable` directive present.
- **BUG-25 (Rematch effect dependencies)**:
  - Lines 359–365:
    ```typescript
    useEffect(() => {
      if (race.status === 'lobby' && raceActive) {
        setRaceActive(false);
        setShowRace(true);
        typing.setPhase('CONFIGURING');
      }
    }, [race.status, raceActive, typing.setPhase]);
    ```
  - Dependency array includes `typing.setPhase` corresponding to the function invoked in the effect.

### 6. Compilation Check
- `npx tsc --noEmit`: Executed cleanly with exit code 0 and 0 errors.

---

## 2. Logic Chain

1. **BUG-19 (Friend Hook Timeout Leaks)**: Transient error timeouts in `useFriends.ts` previously leaked state setters post-unmount. Introducing `errorTimeoutRef` with `clearErrorTimeout` pre-clearing and unmount cleanup in `useEffect` ensures zero unmounted state updates and resolves timer race conditions.
2. **BUG-20 (Typing Controller Shake Timeout)**: `TypingController.tsx` error shake timer now tracks `shakeTimeoutRef`, clears existing timers on rapid error keystrokes, and cancels pending timeouts on unmount.
3. **BUG-21 (Modal Exit Animation & Clipboard Leaks)**: Exit scale timers (180ms) and copy status timers (2000ms) in `RaceModal.tsx`, `SocialModal.tsx`, and `PlayerProfileModal.tsx` are now stored in `useRef` handles and cleared on unmount.
4. **BUG-23 (Callback Memoization & Component Memoization)**: Modal close and drill callbacks in `App.tsx` are memoized using `useCallback`, and `ChangelogModal.tsx` is wrapped in `React.memo`, eliminating redundant re-renders when parent state changes.
5. **BUG-24 (Auto-save Dependency Completeness)**: The auto-save `useEffect` in `App.tsx` explicitly lists `typing.input`, `auth.session`, and `supabase` without suppressing ESLint, ensuring state stale closures do not bypass auto-saving.
6. **BUG-25 (Rematch Dependency Array)**: The rematch `useEffect` in `App.tsx` includes `typing.setPhase` in its dependency array.
7. **Type Safety Verification**: Running `npx tsc --noEmit` returns exit code 0 with 0 errors.

---

## 3. Caveats

- In `useFriends.ts` (line 277), `removeFriendOrRequest` uses `setError(...)` directly in its catch block without scheduling an auto-dismiss timeout (unlike `addFriend` and `acceptRequest` which use `setErrorWithTimeout`). This is not a memory leak because no `setTimeout` is scheduled, but error text from friend removal persists until the next fetch or action clears it.

---

## 4. Conclusion

All fixes for BUG-19, BUG-20, BUG-21, BUG-23, BUG-24, and BUG-25 are fully implemented, correct, leak-free, and type-safe. No integrity violations or facade implementations were detected. Verdict is **APPROVE**.

---

## 5. Verification Method

1. Run TypeScript Compiler check:
   ```powershell
   npx tsc --noEmit
   ```
   *Expected Result*: Exits with code 0 and zero errors.

2. Inspect `useFriends.ts` timeout tracking:
   ```powershell
   Select-String -Path "src/hooks/useFriends.ts" -Pattern "errorTimeoutRef|setErrorWithTimeout"
   ```
   *Expected Result*: Matches found at ref declaration, helper definition, unmount cleanup, and 4 call sites.

3. Inspect `TypingController.tsx` shake timeout:
   ```powershell
   Select-String -Path "src/components/TypingController.tsx" -Pattern "shakeTimeoutRef"
   ```
   *Expected Result*: Matches found at ref declaration, unmount cleanup, and `handleKeyDown` error branch.

4. Inspect modal unmount cleanups:
   ```powershell
   Select-String -Path "src/components/RaceModal.tsx","src/components/SocialModal.tsx","src/components/PlayerProfileModal.tsx" -Pattern "closeTimeoutRef"
   ```
   *Expected Result*: Matches in all 3 modal components.

5. Inspect `App.tsx` auto-save dependency array and eslint suppressions:
   ```powershell
   Select-String -Path "src/App.tsx" -Pattern "eslint-disable-next-line react-hooks/exhaustive-deps"
   ```
   *Expected Result*: No match on the auto-save effect block.
