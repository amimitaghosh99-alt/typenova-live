# Handoff Report — explorer_3

## 1. Observation
Direct static analysis was performed on the target files:
- `src/hooks/useCloudSync.ts`
- `src/hooks/useMatchmaking.ts`
- `src/hooks/useFriends.ts`
- `src/hooks/useAuth.ts`
- `src/lib/supabase.ts`
- `src/utils/playerTitles.ts`
- `src/utils/seededRandom.ts`
- `src/utils/shareCard.ts`
- `src/data/constants.ts`
- `src/data/codeSnippets.ts`
- `src/data/changelog.ts`

Key observations:
1. `src/hooks/useCloudSync.ts`: Line 79 fetches snapshot and merges local progress; line 89 performs `await sb.from('profiles').update({ data: merged, ... })`. Progress stored in `localStorage` between lines 79 and 89 is overwritten by line 89.
2. `src/hooks/useAuth.ts`: Line 15 calls `sb.auth.getSession()`. There is no `.catch()` or `.finally()` to set `setAuthReady(true)` if `getSession()` rejects.
3. `src/hooks/useMatchmaking.ts`: Line 174 `ch.subscribe()` only handles `'SUBSCRIBED'`. `CHANNEL_ERROR` and `CLOSED` events leave `state` in `{ status: 'searching' }`. Handshake timeout at line 107 resets `roleRef` without broadcasting cancellation to opponent.
4. `src/hooks/useFriends.ts`: Line 271 uses static channel name `'friendships_changes'`. Lines 227–245 execute database `delete()` calls without destructuring or checking `{ error }`, while immediately filtering React state optimistically.
5. `src/utils/playerTitles.ts`: Line 32 uses `interval.rankings.includes(player.id)` inside `else if`, counting all ranks 2 through N instead of ranks 2 through 4.
6. `src/utils/shareCard.ts`: Line 70 calculates X position with `String(data.wpm).length * 114`. Line 47 calls `ctx.roundRect` without checking support.

## 2. Logic Chain
1. **Observation 1 → Cloud Sync Data Loss**: `readLocalProgress()` reads local state at t0. Asynchronous Supabase profile query/update takes time Δt. If user typing tests finish within Δt, `localStorage` is updated. When `update({ data: merged })` resolves at t0 + Δt, it pushes the snapshot captured at t0, overwriting progress written during Δt.
2. **Observation 2 → Auth Loading Soft-Lock**: `useAuth` sets `authReady = false` by default. If `getSession()` throws or fails due to network outage, `.then()` never runs. `authReady` remains `false`, freezing UI on splash screen.
3. **Observation 3 → Matchmaking Desync**: When client A times out after 3000ms, `roleRef` resets to `'none'`. If client B's delayed `match_accept` or `match_confirm` arrives at 3001ms, client A ignores it. Client B is left stuck in `'accepting'` or `'locked'` status in an empty room.
4. **Observation 4 → Friends UI & Channel Leaks**: Duplicate channel names with `supabase.channel('friendships_changes')` conflict in Supabase JS client registry when multiple components or Strict Mode mount `useFriends`. Unchecked `delete()` operations silently fail at DB level while UI state updates, causing local and server state desynchronization.

## 3. Caveats
- Production database RLS policies and backend Supabase triggers were not executed live (static analysis only).
- Visual rendering of `shareCard.ts` canvas outputs was analyzed structurally without browser canvas bitmap snapshot comparison.

## 4. Conclusion
The analyzed modules contain 15 distinct logic, UI loading, and performance/subscription issues. Applying the provided concrete code fixes in `analysis.md` will resolve data loss during cloud sync, eliminate infinite loading states, fix matchmaking handshake desync, and prevent memory/channel leaks.

## 5. Verification Method
1. **Cloud Sync**: Run static linting / build check using `npm run build` or `npx tsc --noEmit`. Verify `readLocalProgress()` is re-invoked before `update()`.
2. **Auth Initialization**: Test offline scenario by disconnecting network on page load; confirm `authReady` transitions to `true` via `.finally()`.
3. **Matchmaking**: Inspect subscription callback to confirm `CHANNEL_ERROR` transitions `state` to `idle` and `match_cancel` is broadcast on timeout.
4. **Friends**: Confirm channel name incorporates user ID (`friendships_changes_${userId}`) and `delete()` error check throws on failure.
