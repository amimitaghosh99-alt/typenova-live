## 2026-07-29T17:23:41+05:30
<USER_REQUEST>
You are the Report Remediation Worker.
Your working directory is: `c:\Users\risho\OneDrive\Desktop\typenova-v2 - Copy\.agents\worker_report`
Target file to update: `c:\Users\risho\OneDrive\Desktop\typenova-v2 - Copy\bug_report.md`

Your Mission:
Reviewer 2 identified 10 code snippet defects in `bug_report.md`. You must update `c:\Users\risho\OneDrive\Desktop\typenova-v2 - Copy\bug_report.md` to fix ALL 10 defects so every proposed code snippet is 100% syntactically valid, type-safe, and functionally sound.

Here is the exact Master Findings & Correction Guide from Reviewer 2:

1. **LOGIC-01 (State Sync)**:
   - Defect: `App.tsx` keydown listener passes stale string literals (`s.input + typedChar`) to `setInputSync`.
   - Fix: Update `App.tsx` snippet to call `typing.setInputSync(prev => prev + typedChar)` or read `typing.inputRef.current`.

2. **LOGIC-02 (Calculation)**:
   - Defect: Uses non-existent `Math.clamp` API (`TypeError: Math.clamp is not a function`).
   - Fix: Replace `Math.clamp` with standard `Math.min(Math.max(val, 0), 100)`. Ensure `netCalc` and `currentAcc` use valid bounds without throwing errors.

3. **LOGIC-04 (Realtime Sync)**:
   - Defect: References `nextHeatmap` in `processRPG` return statement, causing `ReferenceError`.
   - Fix: In `processRPG`, compute `const updatedHeatmap = { ...prevHeatmap, ... }` synchronously outside `setHeatmapData`, then return `{ newXp, newTestsCompleted, updatedHeatmap }`.

4. **LOGIC-05 (Host Migration)**:
   - Defect: Omitted `setIsHost(true)` and `ch.track(...)` on host migration.
   - Fix: Preserve `if (next[0].id === selfIdRef.current) { setIsHost(true); ch.track(...) }` inside the migration block.

5. **LOGIC-06 (State Reset)**:
   - Defect: Phase check `if (currentPhase === 'CONFIGURING' || ...)` skips `resetEngine()` when reset is triggered during `'TYPING'` phase.
   - Fix: Ensure reset is executed regardless of current phase, or set phase to `'READY'` before triggering `resetEngine()`.

6. **LOGIC-08 (Side Effects)**:
   - Defect: `queueMicrotask` placed inside `setQuestsState` callback still fires twice in React StrictMode.
   - Fix: Move `writeLocalProgress` and `grantXp` to a dedicated `useEffect` observing `questsState` or event handler, completely outside `setQuestsState`.

7. **PERF-06 (Memory/Perf)**:
   - Defect: Global RegExp objects with `/g` flag leak `lastIndex` across runs.
   - Fix: Explicitly reset `lastIndex = 0` before each regex execution loop (`REGEX_KEYWORDS.lastIndex = 0;`, `REGEX_STRINGS.lastIndex = 0;`, etc.).

8. **PERF-07 (Performance)**:
   - Defect: Missing code replacement snippet (hand-waving prose only).
   - Fix: Provide a complete, drop-in replacement code block for `calculateStats` single-pass loop in `src/hooks/useTypingEngine.ts`.

9. **PERF-08 (Layout Thrash)**:
   - Defect: `el.offsetLeft/offsetTop` measures relative to word `offsetParent`, not outer container, drifting caret coordinates.
   - Fix: Calculate caret position relative to `containerRef` by traversing `offsetParent` chain or computing offsets relative to container.

10. **PERF-09 (Graph UX)**:
    - Defect: Omits `setHoveredOvertakeIdx(null)` in `onMouseLeave`.
    - Fix: Restore `setHoveredOvertakeIdx(null)` inside the `onMouseLeave` callback in `WpmGraph.tsx`.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work.

Please read `c:\Users\risho\OneDrive\Desktop\typenova-v2 - Copy\.agents\reviewer_2\handoff.md` for full context, edit `c:\Users\risho\OneDrive\Desktop\typenova-v2 - Copy\bug_report.md` using `replace_file_content` or `write_to_file`, and write a report to `c:\Users\risho\OneDrive\Desktop\typenova-v2 - Copy\.agents\worker_report\handoff.md`. Send a message when done.
</USER_REQUEST>
