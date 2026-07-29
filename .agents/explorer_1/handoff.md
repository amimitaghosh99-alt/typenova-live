# Handoff Report — Soft Handoff

**From**: `explorer_1`  
**To**: `parent` (`f80fdffc-6fe7-4307-822d-256f4b7600e6`)  
**Date**: 2026-07-29  
**Working Directory**: `c:\Users\risho\OneDrive\Desktop\typenova-v2 - Copy\.agents\explorer_1`

---

## 1. Observation

Direct code inspection via `view_file` across 5 core target files revealed 13 critical bugs:

1. **`src/hooks/useTypingEngine.ts` (lines 67-70)**:
   ```ts
   const errors = entries.filter(k => k.isError && !k.isBackspace).length;
   const rawCalc = Math.round((currentInput.length / 5) / minutes);
   const netCalc = Math.round(((currentInput.length - errors) / 5) / minutes);
   const currentAcc = currentInput.length > 0 ? Math.round(((currentInput.length - errors) / currentInput.length) * 100) : 100;
   ```
   - `currentInput.length - errors` can be negative when user backspaces after making errors.

2. **`src/hooks/useTypingEngine.ts` (line 195)**:
   - `resetEngine()` omits `setCountdownTimer(5)`.

3. **`src/hooks/useRace.ts` (lines 133-134)**:
   ```ts
   const meta = state[key]?.[0] || metaRef.current[key];
   if (!meta?.name) continue;
   ```
   - If player presence drops upon finish before presence sync, `meta?.name` is missing and `continue` skips racer from `next`.

4. **`src/hooks/useRPGSystem.ts` (line 75)**:
   ```ts
   let lastTime = 0;
   keystrokeLog.forEach(k => {
     const delay = k.time - lastTime;
   ```
   - `lastTime = 0` causes `delay` for 1st key to equal Unix timestamp `~1.72 billion ms`.

5. **`src/hooks/useRPGSystem.ts` (line 158)**:
   ```ts
   if (check('type_nova') && totalSet.size >= ACHIEVEMENTS.length) unlock('type_nova');
   ```
   - `ACHIEVEMENTS.length` includes `type_nova`, making condition `(N - 1) >= N` evaluate to `false`.

6. **`src/hooks/useQuests.ts` (lines 94-98)**:
   - `grantXp` and `writeLocalProgress` called inside `setQuestsState` updater function.

7. **`src/App.tsx` (lines 978 & 984)**:
   - `typing` object literal in `useEffect` dependency array causes interval teardown loops.

---

## 2. Logic Chain

1. **Accuracy Underflow**:
   - *Observation*: `errors` counts historical non-backspace keystrokes, whereas `currentInput.length` counts current length.
   - *Deduction*: Typing 10 errors and backspacing 8 yields `length=2` and `errors=10`. `(2 - 10)/2 * 100 = -400%`.
   - *Conclusion*: Calculation produces invalid negative accuracy percentages.

2. **Heatmap Timing Corruption**:
   - *Observation*: `lastTime` starts at `0`. First `k.time` is epoch timestamp `~1.72e12 ms`.
   - *Deduction*: `k.time - lastTime` = ~1.72 billion ms added to `totalMs`.
   - *Conclusion*: Key latency metrics in heatmap are corrupted by 54 years for the initial keystroke.

3. **Achievement Unreachable**:
   - *Observation*: `ACHIEVEMENTS.length` is N. `type_nova` is 1 of N achievements.
   - *Deduction*: Before `type_nova` is unlocked, `totalSet.size` is at most `N - 1`. `N - 1 >= N` is `false`.
   - *Conclusion*: `type_nova` meta-achievement cannot be unlocked naturally.

---

## 3. Caveats

- UI visual styling and CSS layout were reviewed in relation to state changes, but visual rendering under specific browser DPI settings was not dynamically simulated.
- Supabase Realtime broadcast socket behaviors were statically analyzed based on event handlers and presence state code logic.

---

## 4. Conclusion

The application has solid foundational architecture, but exhibits key logic glitches in statistics computation (accuracy underflow, heatmap initial timestamp), state transitions (countdown timer reset skip), quest XP granting (React StrictMode double trigger), achievement requirements (`type_nova` condition), and performance loops in timer effects (`typing` reference churn).

All 13 identified bugs have been documented with concrete code fixes in `c:\Users\risho\OneDrive\Desktop\typenova-v2 - Copy\.agents\explorer_1\analysis.md`.

---

## 5. Verification Method

1. Inspect `c:\Users\risho\OneDrive\Desktop\typenova-v2 - Copy\.agents\explorer_1\analysis.md` for full breakdown and fixes.
2. Run TypeScript static type checker:
   ```bash
   npx tsc --noEmit
   ```
3. Test key user scenarios (backspacing error text, restarting test countdown, checking heatmap timing metrics, completing daily quests).

---

## 6. Remaining Work

- Hand off findings report `analysis.md` to implementer/parent agent for patch application.
- Verify fixes after implementation using `tsc` and test execution.
