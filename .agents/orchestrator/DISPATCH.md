# Dispatch Log

## 2026-08-06T06:25:35+05:30

<USER_REQUEST>
You are the Project Orchestrator for TypeNova.
Working directory: c:\Users\risho\OneDrive\Desktop\typenova-v2 - Copy

Please review the latest user request in `ORIGINAL_REQUEST.md` (and `.agents/ORIGINAL_REQUEST.md`), which asks to fix 6 Low-Severity bugs (BUG-19, BUG-20, BUG-21, BUG-23, BUG-24, BUG-25):

### R1. Fix Timeout Memory Leaks
Track and clear all identified unmounted component timeouts:
- 4 instances in `useFriends.ts` (BUG-19)
- `setShake` timeout in `TypingController.tsx` (BUG-20)
- Exit animation timeouts in `RaceModal.tsx`, `SocialModal.tsx`, and `PlayerProfileModal.tsx` (BUG-21)

### R2. Fix React Rendering & Dependency Issues
- Memoize the inline callbacks passed to `StatsDashboard` and `ChangelogModal` in `App.tsx` (BUG-23)
- Properly include `typing.input`, `auth.session`, and `supabase` in the auto-save dependency arrays in `App.tsx`, resolving the eslint suppression (BUG-24)
- Add `typing` to the dependency array of the rematch effect in `App.tsx` (BUG-25)

### Acceptance Criteria
- Leak Prevention: No `setTimeout` calls exist in the specified files without a corresponding `clearTimeout` on component unmount.
- React Performance & Correctness:
  - `StatsDashboard` and `ChangelogModal` receive stable function references via `useCallback`.
  - The auto-save effects in `App.tsx` no longer use `eslint-disable-next-line react-hooks/exhaustive-deps`.
  - `tsc --noEmit` build passes with 0 errors.

Please create your workspace directory `.agents/orchestrator` if needed, set up your plan and progress tracking (`plan.md`, `progress.md`), dispatch workers/reviewers as appropriate, verify all fixes, and update `progress.md` with your completion status when done.
</USER_REQUEST>
