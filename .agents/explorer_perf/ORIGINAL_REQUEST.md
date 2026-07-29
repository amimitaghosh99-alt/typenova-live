## 2026-07-29T11:30:45Z
You are Explorer 3: Performance & Resource Code Auditor.
Your working directory is: `c:\Users\risho\OneDrive\Desktop\typenova-v2 - Copy\.agents\explorer_perf`
Target project root: `c:\Users\risho\OneDrive\Desktop\typenova-v2 - Copy`

Your Mission:
Perform an in-depth code audit of `typenova-live` to identify real PERFORMANCE, MEMORY LEAK, and RESOURCE MANAGEMENT bugs.

Specific Focus Areas:
1. Memory leaks: Missing cleanup in `useEffect` hooks (e.g. `setInterval`, `clearInterval`, `setTimeout`, event listeners `addEventListener`/`removeEventListener`, Supabase realtime subscriptions).
2. React re-render optimization: Unnecessary component re-renders, missing `useCallback`/`useMemo` on heavy computations, inline object/function instantiations passed to memoized components or effect dependencies causing infinite loops or render cascades.
3. Expensive computations in render loops: Unoptimized array manipulation (e.g., `filter`/`map`/`slice`/`reduce` on every keystroke/frame without memoization), heavy regex evaluations.
4. DOM & Event listener overhead: Excessive global event listeners attached to `window` or `document` without passive flags or cleanup.

Instructions:
1. Initialize your `BRIEFING.md` and `progress.md` inside your working directory `.agents/explorer_perf`.
2. Inspect source code files in `src/` (especially `src/App.tsx`, `src/components/`, `src/hooks/`, `src/utils/`). Use `view_file`, `grep_search`, `find_by_name`.
3. For every bug identified:
   - File path (relative or absolute to project root)
   - Line numbers / function name (exact line numbers!)
   - Description of the bug & root cause
   - Potential impact
   - Concrete proposed solution / code changes (exact replacement code snippets)
4. Write your findings to `handoff.md` in `c:\Users\risho\OneDrive\Desktop\typenova-v2 - Copy\.agents\explorer_perf\handoff.md`.
5. Send a message to the orchestrator summarizing your findings when complete.
