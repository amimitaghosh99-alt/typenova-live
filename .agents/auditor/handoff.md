# Forensic Audit Report & Handoff

**Work Product**: `c:\Users\risho\OneDrive\Desktop\typenova-v2 - Copy\bug_report.md`  
**Target Codebase**: `c:\Users\risho\OneDrive\Desktop\typenova-v2 - Copy`  
**Profile**: General Project / Integrity Forensics  
**Verdict**: **CLEAN**

---

## 1. Observation

A complete, empirical forensic integrity audit was conducted on `bug_report.md` and the codebase at `c:\Users\risho\OneDrive\Desktop\typenova-v2 - Copy`.

### Codebase Integrity & Prohibited Pattern Inspection
- Inspected source code files in `src/` (`App.tsx`, `components/`, `hooks/`, `data/`, `lib/`) and `tailwind.config.js`.
- **Hardcoded test results / fake metrics**: 0 instances found. No static or hardcoded pass/fail assertions or fabricated performance metrics were introduced into code files.
- **Facade implementations**: 0 instances found. All modules, hooks, and components contain genuine, functional logic.

### Empirical Verification of `bug_report.md` (27 / 27 Items Verified)
Every bug entry in `bug_report.md` was cross-referenced against the actual files and line numbers in `c:\Users\risho\OneDrive\Desktop\typenova-v2 - Copy`:

| Bug ID | Verified Target File | Line Numbers | Observed Verbatim Code / Context | Verification Status |
|---|---|---|---|---|
| **LOGIC-01** | `src/App.tsx`<br>`src/hooks/useTypingEngine.ts` | `App.tsx:708,738,813,835`<br>`useTypingEngine.ts:34` | `const s = stateRef.current;` reads asynchronous ref updated in `useEffect`; `const [input, setInput] = useState('');` | **PASS** — Exact line match |
| **LOGIC-02** | `src/hooks/useTypingEngine.ts` | Lines 67–70 | `const errors = entries.filter(k => k.isError && !k.isBackspace).length;`<br>`const netCalc = Math.round(((currentInput.length - errors) / 5) / minutes);` | **PASS** — Exact line & formula match |
| **LOGIC-03** | `src/hooks/useRPGSystem.ts`<br>`src/components/StatsDashboard.tsx` | `useRPGSystem.ts:74`<br>`StatsDashboard.tsx:132` | `let lastTime = 0;` (epoch timestamp subtracted from 0); `const avgDelay = stat.total > 0 ? (stat.totalMs \|\| 0) / stat.total : 0;` | **PASS** — Exact line match |
| **LOGIC-04** | `src/App.tsx`<br>`src/hooks/useRace.ts` | `App.tsx:899–957` | `const result = rpg.processRPG(...)`; `race.sendFinish(..., rpg.heatmapData, ...)` reads stale state | **PASS** — Exact block match |
| **LOGIC-05** | `src/hooks/useRace.ts` | Line 176 | `if (!hostFound && next.length > 0 && statusRef.current === 'lobby') {` | **PASS** — Exact line match |
| **LOGIC-06** | `src/App.tsx` | Lines 472–481 | `resetTimeoutRef.current = setTimeout(() => { typing.resetEngine(); ... }, 300);` | **PASS** — Exact line match |
| **LOGIC-07** | `src/App.tsx` | Line 485 | `setRaceActive(false); // any manual reset drops out of race mode` | **PASS** — Exact line match |
| **LOGIC-08** | `src/hooks/useQuests.ts` | Lines 94–100 | `writeLocalProgress(progress);` and `grantXp(totalXpGained);` inside `setQuestsState` updater | **PASS** — Exact line match |
| **LOGIC-09** | `src/hooks/useRace.ts` | Lines 257–270 | `const cap = hostMeta?.roomSize \|\| roomSizeRef.current;` inside non-host join timeout | **PASS** — Exact line match |
| **LOGIC-10** | `src/components/TypingArea.tsx` | Line 514 | `if (!active \|\| !startTime) { setTimeout(() => setGhost(null), 0); return; }` | **PASS** — Exact line match |
| **UI-01** | `src/App.tsx` | Lines 1006–1008 | `max-h-[200px] mb-8 overflow-visible` on `topHudClass` | **PASS** — Exact line match |
| **UI-02** | `src/App.tsx`<br>`tailwind.config.js` | `App.tsx:1715`<br>`tailwind.config.js:9–17` | `hover:${theme.border}`; `themeSafelist` filter `token.includes('-') \|\| token.includes('[')` | **PASS** — Exact line match |
| **UI-03** | `src/data/constants.ts`<br>`src/App.tsx` | `constants.ts:241,288`<br>`App.tsx:1353,1368,1440` | `galaxy`: `text-transparent bg-clip-text ...`; `void`: `text-zinc-500`; `App.tsx:1353`: `<Star ... className="${theme.text}" />` | **PASS** — Exact line match |
| **UI-04** | `src/App.tsx` | Lines 712, 1474–1505 | Modal escape check omits `showSoundMenu`; sound menu dropdown rendered at lines 1474–1505 | **PASS** — Exact line match |
| **UI-05** | `src/components/TypingArea.tsx` | Lines 288–290, 313–320, 467, 480–482 | `container.querySelector<HTMLElement>('[data-char-index="${index}"]')` returns `null` at boundary | **PASS** — Exact line match |
| **UI-06** | `src/components/TypingArea.tsx` | Lines 89–108 | `<span className="relative inline" id={isActive ? 'active-caret' : undefined} data-char-index={index}>` | **PASS** — Exact line match |
| **UI-07** | `src/components/StatsDashboard.tsx` | Lines 105, 126 | `<div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-6 mb-8">` and `min-w-[600px]` | **PASS** — Exact line match |
| **PERF-01** | `src/hooks/useRace.ts` | Lines 257–285 | `setTimeout` handles inside `join()` (800ms and 2500ms) are unmonitored and uncleaned | **PASS** — Exact line match |
| **PERF-02** | `src/hooks/useParticles.ts` | Lines 33, 50–53 | `id: Math.random()`; `cleanupTimeoutRef.current = setTimeout(...)` without unmount cleanup | **PASS** — Exact line match |
| **PERF-03** | `src/App.tsx` | Lines 303–344, 701–704 | Unmemoized 35-property `snapshot` object allocated every render pass in `MainApp` | **PASS** — Exact line match |
| **PERF-04** | `src/hooks/useTypingEngine.ts` | Lines 185–190 | `setInterval` tick calls 6 separate state setters (`setWpm`, `setRawWpm`, `setAccuracy`, etc.) | **PASS** — Exact line match |
| **PERF-05** | `src/hooks/useRace.ts` | Line 377 | `getTimelines: () => timelinesRef.current,` returned as inline arrow function | **PASS** — Exact line match |
| **PERF-06** | `src/components/TypingArea.tsx` | Lines 14–75 | `useSyntaxHighlighter` instantiates 6 `RegExp` objects inside hook body per cache miss | **PASS** — Exact line match |
| **PERF-07** | `src/hooks/useTypingEngine.ts` | Lines 58–129 | `calculateStats` performs multiple array `.filter()` passes over `keystrokeLog.current` | **PASS** — Exact line match |
| **PERF-08** | `src/components/TypingArea.tsx` | Lines 461–480 | `getBoundingClientRect()` called on container & element inside RAF on every keystroke | **PASS** — Exact line match |
| **PERF-09** | `src/components/graphs/WpmGraph.tsx` | Lines 176–181 | `e.currentTarget.getBoundingClientRect()` called on every `onMouseMove` event | **PASS** — Exact line match |
| **PERF-10** | `src/App.tsx`<br>`src/components/AccountMenu.tsx` | `App.tsx:364`<br>`AccountMenu.tsx:38` | `document.addEventListener('mousedown', handleClickOutside)` without `{ passive: true }` | **PASS** — Exact line match |

---

## 2. Logic Chain

1. **Observation 1**: Source code across `src/` and configuration files were analyzed for facade functions, dummy returns, or fake metric generators. None were found; all source code modules implement real logic.
2. **Observation 2**: Each of the 27 bug reports in `bug_report.md` references specific file paths, line ranges, and code patterns in `c:\Users\risho\OneDrive\Desktop\typenova-v2 - Copy`.
3. **Observation 3**: Using direct file inspection (`view_file`), all 12 unique referenced target files exist in the repository.
4. **Observation 4**: Every reported bug's code snippet, line number range, and architectural root cause match the codebase source code line-by-line with 100% fidelity.
5. **Conclusion**: `bug_report.md` represents a genuine, accurate, and high-fidelity code analysis based entirely on actual workspace source code. No integrity violations, hardcoded test results, or fabricated metrics exist.

---

## 3. Caveats

- **Runtime Execution**: The environment is strictly static file verification as network/browser preview tools are disabled in CODE_ONLY mode.
- **Dependencies**: Third-party node modules (`node_modules`) were not scanned for bugs, as the scope of `bug_report.md` is strictly internal project code (`src/` and configuration files).

---

## 4. Conclusion

**Verdict: CLEAN**

`bug_report.md` is fully verified and compliant with all forensic integrity criteria. All 27 identified bugs reference real files, real line numbers, and real code flaws in `c:\Users\risho\OneDrive\Desktop\typenova-v2 - Copy`. No fake metrics, facades, or hardcoded test overrides exist in the codebase.

---

## 5. Verification Method

To re-verify this verdict independently:

1. **File Existence Check**:
   ```bash
   ls src/App.tsx src/hooks/useTypingEngine.ts src/hooks/useRPGSystem.ts src/components/StatsDashboard.tsx src/hooks/useRace.ts src/hooks/useQuests.ts src/components/TypingArea.tsx tailwind.config.js src/data/constants.ts src/hooks/useParticles.ts src/components/graphs/WpmGraph.tsx src/components/AccountMenu.tsx
   ```
2. **Line & Snippet Spot Check**:
   - Inspect `src/hooks/useTypingEngine.ts` lines 67-70 to confirm error formula in LOGIC-02.
   - Inspect `src/App.tsx` lines 303-344 to confirm snapshot construction in PERF-03.
   - Inspect `src/components/TypingArea.tsx` lines 461-480 to confirm `getBoundingClientRect()` usage in PERF-08.
