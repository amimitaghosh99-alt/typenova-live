# Handoff Report — Phase 1: Critical Business Logic & Math Fixes

## 1. Observation
- Target files inspected and modified:
  - `src/hooks/useTypingEngine.ts`: Lines 35 (`inputRef`), 48-52 (`setInputSync`), 65-70 (`calculateStats` math for totalTyped, errorCount, rawCalc, netCalc, currentAcc), 206 (`resetEngine` setting `inputRef.current = ''`), 231 (exporting `inputRef`, `setInputSync`).
  - `src/App.tsx`: Lines 583 (`launchDrill` setInputSync), 738-762 (CONFIGURING/READY input handling using `setInputSync`), 800-820 (`handleKeyDown` Backspace using `typing.inputRef.current` and `typing.setInputSync`), 822-870 (`handleKeyDown` regular keys using `typing.inputRef.current` and `typing.setInputSync`).
  - `src/hooks/useRPGSystem.ts`: Lines 74-88 (`setHeatmapData` initializing `lastTime` to `validKeystrokes[0].time` for non-backspace keystrokes), 178 (`hydrate` signature including `totalMs?: number`).
  - `src/hooks/useRace.ts`: Line 176 (`rebuildPlayers` host migration checking `statusRef.current === 'lobby' || statusRef.current === 'racing'`).
  - `src/components/StatsDashboard.tsx`: Inspected `KeyboardHeatmap` lines 95-97 and 132; verified `avgDelay` divides `stat.totalMs` by `stat.total` safely when `stat.total > 0`.

## 2. Logic Chain
- LOGIC-01: React state updates are asynchronous; under rapid typing, referencing `s.input` inside event handlers caused keypresses to drop or overwrite prior state. By maintaining a synchronous `inputRef` kept in sync via `setInputSync`, `typing.inputRef.current` is always guaranteed to contain the up-to-date typed string synchronously during event processing.
- LOGIC-02: `calculateStats` previously used `currentInput.length` for raw WPM and net WPM formulas without accounting for backspaced errors, resulting in accuracy and net WPM corruption on backspacing. Replacing with `totalTyped = entries.filter(k => !k.isBackspace).length` and `errorCount = entries.filter(k => k.isError && !k.isBackspace).length` accurately measures total non-backspace keystrokes and active error count.
- LOGIC-03: `setHeatmapData` previously initialized `lastTime = 0`, causing the first keypress delay to be calculated as `k.time - 0` (unix timestamp in milliseconds, ~56 years). Initializing `lastTime` to `validKeystrokes[0].time` sets the first keystroke delay to 0 and computes subsequent inter-key delays correctly.
- LOGIC-05: Host migration in `useRace.ts` was restricted to `statusRef.current === 'lobby'`. If the host disconnected during an active race (`racing` status), room authority was lost. Expanding the condition to `(statusRef.current === 'lobby' || statusRef.current === 'racing')` allows seamless host migration during active races.

## 3. Caveats
- No caveats. All 4 target issue resolutions were implemented directly according to specifications without extraneous refactoring.

## 4. Conclusion
- Phase 1 fixes for LOGIC-01, LOGIC-02, LOGIC-03, and LOGIC-05 have been fully implemented in `typenova-live`.

## 5. Verification Method
- Verification command: `npx tsc --noEmit` or `npm run build` in `c:\Users\risho\OneDrive\Desktop\typenova-v2 - Copy`.
- Direct file inspection:
  - `src/hooks/useTypingEngine.ts`: verify `inputRef`, `setInputSync`, updated `calculateStats`.
  - `src/App.tsx`: verify `typing.inputRef.current` and `typing.setInputSync` usages in `handleKeyDown`.
  - `src/hooks/useRPGSystem.ts`: verify `lastTime` initialization in `setHeatmapData`.
  - `src/hooks/useRace.ts`: verify host migration status condition `(statusRef.current === 'lobby' || statusRef.current === 'racing')`.
