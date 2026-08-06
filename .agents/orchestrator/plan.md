# Execution Plan: TypeNova Low-Severity Bug Fixes (BUG-19 to BUG-25)

## Objective
Fix 6 low-severity memory leak and React dependency/memoization bugs in `useFriends.ts`, `TypingController.tsx`, `RaceModal.tsx`, `SocialModal.tsx`, `PlayerProfileModal.tsx`, and `App.tsx`.

## Phases & Strategy

### Phase 0: Survey & Exploration
- Spawn 3 parallel Explorers:
  - `explorer_1`: Investigate BUG-19, BUG-20, BUG-21 (timeout memory leaks in `useFriends.ts`, `TypingController.tsx`, `RaceModal.tsx`, `SocialModal.tsx`, `PlayerProfileModal.tsx`). Identify all `setTimeout` calls, missing `clearTimeout`s, ref/effect cleanup mechanisms needed.
  - `explorer_2`: Investigate BUG-23 (inline callbacks passed to `StatsDashboard` and `ChangelogModal` in `App.tsx`). Identify all callback props, state dependencies, and `useCallback` requirements.
  - `explorer_3`: Investigate BUG-24 and BUG-25 (auto-save dependency arrays with `typing.input`, `auth.session`, `supabase` and rematch effect dependency on `typing` in `App.tsx`). Identify eslint suppressions, stale closure risks, ref usages, and proper dependency configurations.

### Phase 1: Implementation & Iteration Loop
- Milestone 1 (M1): Fix Timeout Memory Leaks
  - Worker updates `useFriends.ts`, `TypingController.tsx`, `RaceModal.tsx`, `SocialModal.tsx`, `PlayerProfileModal.tsx`.
  - Reviewers (2) & Challengers (2) verify leak prevention and unmount cleanups.
- Milestone 2 (M2): Fix React Rendering & Dependency Issues
  - Worker updates `App.tsx` (callbacks memoized, auto-save deps updated, rematch deps updated, eslint suppressions removed).
  - Reviewers (2) & Challengers (2) verify dependency correctness and callback stability.

### Phase 2: Verification & Forensic Audit
- Run `npx tsc --noEmit` build verification.
- Dispatch `teamwork_preview_auditor` for static analysis & integrity verification.
- Synthesize final findings and deliver completion report.
