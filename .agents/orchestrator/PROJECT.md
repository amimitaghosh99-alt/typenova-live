# Project: TypeNova Bug Fixes (BUG-19 to BUG-25)

## Architecture
- React / TypeScript codebase for TypeNova frontend.
- Custom hooks (`useFriends.ts`), components (`TypingController.tsx`, `RaceModal.tsx`, `SocialModal.tsx`, `PlayerProfileModal.tsx`), and main application container (`App.tsx`).

## Feature Inventory
| # | Feature / Bug | Description | Milestone | Source |
|---|---------------|-------------|-----------|--------|
| 1 | BUG-19 | Track and clear 4 unmounted component timeouts in `useFriends.ts` | M1 | ORIGINAL_REQUEST |
| 2 | BUG-20 | Track and clear `setShake` timeout in `TypingController.tsx` | M1 | ORIGINAL_REQUEST |
| 3 | BUG-21 | Track and clear exit animation timeouts in `RaceModal.tsx`, `SocialModal.tsx`, and `PlayerProfileModal.tsx` | M1 | ORIGINAL_REQUEST |
| 4 | BUG-23 | Memoize inline callbacks passed to `StatsDashboard` and `ChangelogModal` in `App.tsx` | M2 | ORIGINAL_REQUEST |
| 5 | BUG-24 | Properly include `typing.input`, `auth.session`, and `supabase` in auto-save dependency arrays in `App.tsx`, resolving eslint suppression | M2 | ORIGINAL_REQUEST |
| 6 | BUG-25 | Add `typing` to dependency array of rematch effect in `App.tsx` | M2 | ORIGINAL_REQUEST |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | M1: Fix Timeout Memory Leaks | `useFriends.ts`, `TypingController.tsx`, `RaceModal.tsx`, `SocialModal.tsx`, `PlayerProfileModal.tsx` | None | DONE |
| 2 | M2: Fix React Rendering & Dependencies | `App.tsx`, `ChangelogModal.tsx` | None | DONE |
| 3 | Verification & Audit | Full project build (`tsc --noEmit`), code audit & forensic audit | M1, M2 | DONE |

## Code Layout
- `src/hooks/useFriends.ts`
- `src/components/TypingController.tsx`
- `src/components/RaceModal.tsx`
- `src/components/SocialModal.tsx`
- `src/components/PlayerProfileModal.tsx`
- `src/App.tsx`
- `src/components/ChangelogModal.tsx`
