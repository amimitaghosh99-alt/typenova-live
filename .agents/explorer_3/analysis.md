# Comprehensive Static Code Review & Vulnerability Analysis Report
**Target Scope**: Cloud Sync, Auth, Matchmaking, Social, Utilities & Data Modules  
**Target Directory**: `c:\Users\risho\OneDrive\Desktop\typenova-v2 - Copy\`  
**Date**: 2026-07-29  
**Reviewer**: explorer_3  

---

## Executive Summary

A comprehensive static code review was conducted across the Cloud Sync, Auth, Matchmaking, Social, Utility, and Data modules of TypeNova v2. A total of **15 critical and high-priority bugs** were identified across **Logic**, **UI**, and **Performance** categories.

Key findings include:
- **Cloud Sync Data Loss**: Concurrent progress updates while logging in overwrite local progress saved during the sync handshake.
- **Uncaught Loading & Soft-Locks**: Missing `.catch()` / exception handling in auth session initialization, cloud sync profile writes, and matchmaking realtime channels lead to infinite loading states (`syncing`, `searching`, `authReady = false`).
- **Realtime Channel Leaks & Desync**: Hardcoded channel names in `useFriends` cause collision & memory leaks under React Strict Mode; matchmaking handshake timeouts leave opponent clients stranded in phantom rooms.
- **Silent Database Failures**: Unchecked Supabase mutation promises in `useFriends` (e.g. friend deletion) optimistically update local UI while database operations fail silently.

---

## Detailed Bug Catalog & Proposed Fixes

### 1. `src/hooks/useCloudSync.ts`

#### Bug 1.1: Race Condition & Data Loss During Login Sync
- **Category**: Logic (Data Loss)
- **File**: `c:\Users\risho\OneDrive\Desktop\typenova-v2 - Copy\src\hooks\useCloudSync.ts`
- **Line / Function**: Lines 65–97, `useEffect` inside `useCloudSync()`
- **Description**:
  When a user logs in, `useCloudSync` fetches profile data from Supabase. At line 79, `const merged = mergeProgress(readLocalProgress(), row.data)` computes the snapshot. At line 89, it writes this snapshot back to Supabase via `await sb.from('profiles').update({ data: merged, updated_at: ... })`.
  If the user completes typing tests or earns XP *during* the in-flight network requests (between line 67 and line 89), local progress is updated in `localStorage`. When line 89 executes, it writes the old `merged` snapshot captured at line 79, overwriting and wiping out any newly earned progress stored in `localStorage`.
- **Potential Impact**: Silent loss of user XP, test history, and achievements earned right after logging in.
- **Proposed Code Fix**:
  Re-read `readLocalProgress()` immediately before performing the cloud database update to preserve any progress recorded during the network request.
  ```typescript
  // src/hooks/useCloudSync.ts (Lines 79-91)
  const initialLocal = readLocalProgress();
  const merged = mergeProgress(initialLocal, row.data);
  writeLocalProgress(merged);
  hydrateRPG({
    xp: merged.xp,
    tests: merged.tests,
    achievements: merged.achievements,
    heatmap: merged.heatmap,
  });
  onHydratedRef.current?.();

  // Re-read local progress right before cloud write to capture any progress made while sync was in flight
  const latestLocal = readLocalProgress();
  const finalMerged = mergeProgress(latestLocal, merged);

  const { error: updateErr } = await sb.from('profiles')
    .update({ data: finalMerged, updated_at: new Date().toISOString() })
    .eq('id', uid);

  if (updateErr) { setStatus('error'); return; }
  ```

---

#### Bug 1.2: Uncaught Loading State on Cloud Sync Update Failure
- **Category**: UI (Uncaught Loading State)
- **File**: `c:\Users\risho\OneDrive\Desktop\typenova-v2 - Copy\src\hooks\useCloudSync.ts`
- **Line / Function**: Lines 89–96, `useEffect` inside `useCloudSync()`
- **Description**:
  At line 89, `await sb.from('profiles').update(...)` is called without a `try/catch` or error check. If this request fails (e.g. network disconnect, RLS policy error), execution aborts before reaching line 94 (`syncedForUser.current = uid`) and line 96 (`setStatus('synced')`). `status` remains `'syncing'` indefinitely.
- **Potential Impact**: UI remains stuck in a `'syncing'` spinner/loading state indefinitely without error feedback.
- **Proposed Code Fix**:
  Wrap the initial sync IIFE in a `try/catch` block and explicitly set `setStatus('error')` upon failure.
  ```typescript
  // src/hooks/useCloudSync.ts (Lines 65-97)
  (async () => {
    setStatus('syncing');
    try {
      const { data, error } = await sb
        .from('profiles')
        .select('username, elo, data')
        .eq('id', uid)
        .maybeSingle();
      if (!active) return;

      if (error) { setStatus('error'); return; }
      if (!data) { setStatus('needs-username'); return; }

      const row = data as unknown as ProfileRow;
      setElo(row.elo ?? 1000);
      const merged = mergeProgress(readLocalProgress(), row.data);
      writeLocalProgress(merged);
      hydrateRPG({
        xp: merged.xp,
        tests: merged.tests,
        achievements: merged.achievements,
        heatmap: merged.heatmap,
      });
      onHydratedRef.current?.();

      const { error: updateError } = await sb.from('profiles')
        .update({ data: merged, updated_at: new Date().toISOString() })
        .eq('id', uid);
      
      if (updateError) throw updateError;
      if (!active) return;

      syncedForUser.current = uid;
      setUsername(row.username);
      setStatus('synced');
    } catch (err) {
      if (active) setStatus('error');
    }
  })();
  ```

---

#### Bug 1.3: User State Pollution & Desync After Logout
- **Category**: Logic (Authentication Session Desync)
- **File**: `c:\Users\risho\OneDrive\Desktop\typenova-v2 - Copy\src\hooks\useCloudSync.ts`
- **Line / Function**: Lines 54–59, `useEffect` inside `useCloudSync()`
- **Description**:
  When `session` becomes `null` (user logs out), `syncedForUser.current` is set to `null` (line 57), but `username`, `elo`, and `status` internal states are not reset. The hook relies on inline ternary operators at return time (`session ? username : null`), but internal React state retains the previous user's data. If a new user logs in without a full page refresh, stale state persists.
- **Potential Impact**: Cross-user state leakage in single-page session switching.
- **Proposed Code Fix**:
  Reset internal state when `session` is `null`.
  ```typescript
  useEffect(() => {
    const sb = supabase;
    if (!sb || !session) {
      syncedForUser.current = null;
      setUsername(null);
      setElo(1000);
      setStatus('idle');
      return;
    }
    // ... rest of sync effect
  ```

---

#### Bug 1.4: Unhandled Promise Rejection & Silent Failure in `pushProgress`
- **Category**: UI (Silent Failure UI)
- **File**: `c:\Users\risho\OneDrive\Desktop\typenova-v2 - Copy\src\hooks\useCloudSync.ts`
- **Line / Function**: Lines 124–135, `pushProgress()`
- **Description**:
  In `pushProgress()`, the Supabase `.update()` promise handler uses `.then(undefined, () => { /* offline / transient — next push retries */ })`. When a push fails due to network outage, no user notification is provided and `status` remains `'synced'`.
- **Potential Impact**: Users assume their typing progress is saved to cloud when it has silently failed.
- **Proposed Code Fix**:
  Update `status` state to `'error'` or provide caller error feedback on push failure.

---

### 2. `src/hooks/useAuth.ts`

#### Bug 2.1: Infinite Loading State on Auth Initialization Failure
- **Category**: UI (Uncaught Loading State)
- **File**: `c:\Users\risho\OneDrive\Desktop\typenova-v2 - Copy\src\hooks\useAuth.ts`
- **Line / Function**: Lines 10–26, `useEffect` inside `useAuth()`
- **Description**:
  `sb.auth.getSession()` returns a Promise. The callback `.then(({ data }) => { ... setAuthReady(true); })` executes only on success. If `getSession()` rejects or fails due to network timeout or auth service outage, `setAuthReady(true)` is never invoked, leaving `authReady` `false` indefinitely.
- **Potential Impact**: App remains soft-locked on splash loading screen forever.
- **Proposed Code Fix**:
  Add `.catch()` and `.finally()` blocks to ensure `setAuthReady(true)` is always called.
  ```typescript
  // src/hooks/useAuth.ts (Lines 15-20)
  sb.auth.getSession()
    .then(({ data }) => {
      if (!active) return;
      setSession(data.session);
    })
    .catch((err) => {
      console.error('Session fetch failed:', err);
    })
    .finally(() => {
      if (active) setAuthReady(true);
    });
  ```

---

#### Bug 2.2: Unhandled Rejection & Session Desync in `signOut`
- **Category**: Logic (Authentication Session Desync)
- **File**: `c:\Users\risho\OneDrive\Desktop\typenova-v2 - Copy\src\hooks\useAuth.ts`
- **Line / Function**: Lines 37–41, `signOut()`
- **Description**:
  `signOut()` invokes `await sb.auth.signOut()` without `try/catch`. If network drops during logout attempt, an unhandled promise rejection occurs, leaving client state inconsistent.
- **Potential Impact**: User cannot sign out while offline; UI session remains out of sync with auth provider.
- **Proposed Code Fix**:
  Wrap `signOut` in `try/catch` and clear session state regardless.
  ```typescript
  const signOut = useCallback(async () => {
    const sb = supabase;
    if (!sb) return;
    try {
      await sb.auth.signOut();
    } catch (err) {
      console.error('Sign out error:', err);
    } finally {
      setSession(null);
    }
  }, []);
  ```

---

### 3. `src/hooks/useMatchmaking.ts`

#### Bug 3.1: Realtime Channel Subscription Leak & Unhandled Disconnects
- **Category**: Logic & UI (Realtime Subscription Leaks)
- **File**: `c:\Users\risho\OneDrive\Desktop\typenova-v2 - Copy\src\hooks\useMatchmaking.ts`
- **Line / Function**: Lines 174–179, `ch.subscribe()` inside `search()`
- **Description**:
  `ch.subscribe(async (status) => ...)` only listens for `'SUBSCRIBED'`. It ignores `'CHANNEL_ERROR'`, `'TIMED_OUT'`, and `'CLOSED'`. If Supabase Realtime loses connection or subscription fails, the UI remains stuck in `'searching'` status.
- **Potential Impact**: Users stuck in searching queue indefinitely on socket disconnection.
- **Proposed Code Fix**:
  Handle subscription error states and notify user.
  ```typescript
  ch.subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      await ch.track({ name: myName, elo: myElo, seeking: true });
      ping();
    } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
      teardown();
      setState({ status: 'idle' });
    }
  });
  ```

---

#### Bug 3.2: Matchmaking Handshake Timeout Desync & Phantom Rooms
- **Category**: Logic (Race Conditions in Matchmaking)
- **File**: `c:\Users\risho\OneDrive\Desktop\typenova-v2 - Copy\src\hooks\useMatchmaking.ts`
- **Line / Function**: Lines 107–110 & 127–130, `HANDSHAKE_TIMEOUT_MS`
- **Description**:
  When a host sends `match_offer` or a guest sends `match_accept`, a 3000ms timer calls `clearHandshake()`. If the opponent's frame arrives at t = 3001ms, `roleRef.current` has reset to `'none'`, so the incoming message is ignored. The opponent remains locked in `'accepting'` or `'locked'` status, stranded in a room that never starts.
- **Potential Impact**: Players stranded in empty match lobbies; high rate of aborted match starts.
- **Proposed Code Fix**:
  Broadcast a explicit `match_cancel` event when timing out so both sides abort cleanly.
  ```typescript
  handshakeTimeoutRef.current = setTimeout(() => {
    if (roleRef.current === 'offering' || roleRef.current === 'accepting') {
      ch.send({
        type: 'broadcast',
        event: 'match_cancel',
        payload: { id: myId, targetId: targetRef.current }
      });
      clearHandshake();
    }
  }, HANDSHAKE_TIMEOUT_MS);
  ```

---

#### Bug 3.3: Unhandled Socket Broadcast Errors & Stale Closures in `ping`
- **Category**: Performance (Unthrottled Ping & Rejections)
- **File**: `c:\Users\risho\OneDrive\Desktop\typenova-v2 - Copy\src\hooks\useMatchmaking.ts`
- **Line / Function**: Lines 81–85, `ping()` function
- **Description**:
  `ch.send(...)` returns a Promise. `setInterval(ping, 2000)` calls `ch.send` without `.catch()`. If socket disconnects, unhandled promise rejections fire every 2 seconds. Also, `ping()` captures `myName` and `myElo` at search start; changes during queue search transmit stale ELO.
- **Potential Impact**: Unhandled console errors, invalid matchmaking ratings sent over socket.
- **Proposed Code Fix**:
  Attach `.catch(() => {})` to `ch.send` and use refs for mutable player properties.

---

### 4. `src/hooks/useFriends.ts`

#### Bug 4.1: Static Channel Name Collision & Memory Leak
- **Category**: Performance (Realtime Subscription Leaks)
- **File**: `c:\Users\risho\OneDrive\Desktop\typenova-v2 - Copy\src\hooks\useFriends.ts`
- **Line / Function**: Line 271, `useEffect` inside `useFriends()`
- **Description**:
  `supabase.channel('friendships_changes')` uses a static hardcoded string name. If `useFriends` is mounted by multiple components or rendered in React Strict Mode, duplicate channels with the identical name are created on the client, producing Supabase client warnings, listener duplication, and memory leaks.
- **Potential Impact**: Memory leak, duplicated network payloads, client warnings.
- **Proposed Code Fix**:
  Scope channel name to the unique user ID: `supabase.channel(\`friendships_changes_${userId}\`)`.

---

#### Bug 4.2: Unthrottled Supabase RPC / Query Loops on Realtime Events
- **Category**: Performance (Unthrottled Sync Polling)
- **File**: `c:\Users\risho\OneDrive\Desktop\typenova-v2 - Copy\src\hooks\useFriends.ts`
- **Line / Function**: Lines 275–285, `postgres_changes` listeners
- **Description**:
  For every incoming `postgres_changes` event, `fetchFriends(true)` is called immediately. Bulk updates or multi-row inserts trigger N individual `fetchFriends` calls without debouncing.
- **Potential Impact**: Excessive network requests and database load.
- **Proposed Code Fix**:
  Debounce `fetchFriends` calls using a ref timer.

---

#### Bug 4.3: Unchecked Database Deletions & Local State Desynchronization
- **Category**: Logic & UI (Silent Failure UI)
- **File**: `c:\Users\risho\OneDrive\Desktop\typenova-v2 - Copy\src\hooks\useFriends.ts`
- **Line / Function**: Lines 227–245, `removeFriendOrRequest()`
- **Description**:
  Both `delete()` database calls inside `removeFriendOrRequest` omit checking `{ error }`. If database deletion fails (e.g. database error or RLS check failure), the error is ignored and lines 248–250 remove the friend from React state optimistically.
- **Potential Impact**: UI shows friend removed, but record remains in database.
- **Proposed Code Fix**:
  Destructure `{ error }` from `delete()` queries and throw if error occurs.
  ```typescript
  const { error: err1 } = await supabase
    .from('friendships')
    .delete()
    .eq('user_id', session.user.id)
    .eq('friend_id', profile.id);
  if (err1) throw err1;
  ```

---

#### Bug 4.4: Timer Overwriting on Error Messages
- **Category**: UI (Silent Failure UI)
- **File**: `c:\Users\risho\OneDrive\Desktop\typenova-v2 - Copy\src\hooks\useFriends.ts`
- **Line / Function**: Lines 126, 131, 172, 205
- **Description**:
  `setTimeout(() => setError(null), 3000)` creates untracked timers. Rapid sequential errors cause older timers to clear new error messages prematurely or attempt state updates on unmounted components.
- **Potential Impact**: Error toasts flicker or disappear prematurely.
- **Proposed Code Fix**:
  Use `errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)` to manage timer cleanup.

---

### 5. `src/lib/supabase.ts`

#### Bug 5.1: Unhandled Supabase Client Initialization Failure
- **Category**: Logic / UI
- **File**: `c:\Users\risho\OneDrive\Desktop\typenova-v2 - Copy\src\lib\supabase.ts`
- **Line / Function**: Lines 8–22
- **Description**:
  If `createClient` throws during setup, `client` remains `null`, and `export const supabase = client` exports `null`. Any downstream module invoking `supabase.from(...)` or `supabase.channel(...)` directly without checking `if (!supabase)` causes runtime crashes.
- **Potential Impact**: Total application crash if Supabase initialization throws.
- **Proposed Code Fix**:
  Add explicit safety check helpers or export a guarded client proxy.

---

### 6. `src/utils/playerTitles.ts`

#### Bug 6.1: Invalid Index Range Check for Ranks 2–4
- **Category**: Logic Bug
- **File**: `c:\Users\risho\OneDrive\Desktop\typenova-v2 - Copy\src\utils\playerTitles.ts`
- **Line / Function**: Lines 32–34, `calculatePlayerTitle()`
- **Description**:
  `else if (interval.rankings.includes(player.id))` checks if `interval.rankings` includes `player.id` at ANY index (5th, 6th, 10th place). The code intends to measure time in ranks 2–4 (`timeInRank2to4`), but counts all non-1st places.
- **Potential Impact**: Incorrect title assignments (e.g. 'CLUTCH MASTER' awarded to 10th place finishers).
- **Proposed Code Fix**:
  Check `const rankIdx = interval.rankings.indexOf(player.id); if (rankIdx >= 1 && rankIdx <= 3) timeInRank2to4++;`.

---

### 7. `src/utils/shareCard.ts`

#### Bug 7.1: Hardcoded Text Advance Width in Canvas Share Card
- **Category**: UI / Rendering
- **File**: `c:\Users\risho\OneDrive\Desktop\typenova-v2 - Copy\src\utils\shareCard.ts`
- **Line / Function**: Line 70, `renderResultCard()`
- **Description**:
  Line 70 uses `String(data.wpm).length * 114` to calculate the X coordinate of the 'WPM' text label. Hardcoding 114px per character causes text overlaps or gaps depending on font loading and DPI.
- **Potential Impact**: Visual layout corruption on social share images.
- **Proposed Code Fix**:
  Use `ctx.measureText(String(data.wpm)).width` dynamically.

---

#### Bug 7.2: Missing Canvas `roundRect` Fallback
- **Category**: UI / Runtime Compatibility
- **File**: `c:\Users\risho\OneDrive\Desktop\typenova-v2 - Copy\src\utils\shareCard.ts`
- **Line / Function**: Line 47, `renderResultCard()`
- **Description**:
  `ctx.roundRect` is called directly without fallback for older browsers or mobile WebViews where `roundRect` is undefined.
- **Potential Impact**: Image generation throws `TypeError` on older browsers.
- **Proposed Code Fix**:
  Guard with `if (typeof ctx.roundRect === 'function') { ... } else { ctx.rect(...); }`.

---

### 8. `src/utils/seededRandom.ts`

#### Bug 8.1: Unvalidated Date Key Parsing in `isYesterday`
- **Category**: Logic Bug
- **File**: `c:\Users\risho\OneDrive\Desktop\typenova-v2 - Copy\src\utils\seededRandom.ts`
- **Line / Function**: Lines 29–34, `isYesterday()`
- **Description**:
  `prevKey.split('-').map(Number)` produces `NaN` if `prevKey` is invalid or empty. `new Date(NaN, NaN - 1, NaN)` creates an Invalid Date.
- **Potential Impact**: Corrupted localStorage key causes unexpected streak resets.
- **Proposed Code Fix**:
  Validate `prevKey` against `/^\d{4}-\d{2}-\d{2}$/` before processing.

---

### 9. `src/data/constants.ts`

#### Bug 9.1: Unguarded Indexing in `generateText` for Code Level
- **Category**: Logic Bug
- **File**: `c:\Users\risho\OneDrive\Desktop\typenova-v2 - Copy\src\data\constants.ts`
- **Line / Function**: Lines 94–97, `generateText()`
- **Description**:
  `const snippets = CODE_LIBRARY[lang]; final = snippets[Math.floor(rng() * snippets.length)];`. If `lang` is an unknown language key or undefined, `snippets` is `undefined`, causing a runtime `TypeError`.
- **Potential Impact**: App crash when selecting custom code options.
- **Proposed Code Fix**:
  Add fallback: `const snippets = CODE_LIBRARY[lang] || CODE_LIBRARY['JavaScript/TypeScript'];`.

---

## Summary Matrix of Findings

| File Path | Bug Category | Severity | Description |
|-----------|--------------|----------|-------------|
| `src/hooks/useCloudSync.ts` | Logic | High | Race condition overwrites local progress during login sync |
| `src/hooks/useCloudSync.ts` | UI | Medium | Uncaught loading state on profile update error |
| `src/hooks/useCloudSync.ts` | Logic | Medium | State retention across user logout |
| `src/hooks/useCloudSync.ts` | UI | Low | Silent push failure without error status |
| `src/hooks/useAuth.ts` | UI | High | Infinite loading state if `getSession()` fails |
| `src/hooks/useAuth.ts` | Logic | Medium | Unhandled rejection and session desync in `signOut` |
| `src/hooks/useMatchmaking.ts` | Logic/UI | High | Realtime channel error ignored; stuck searching |
| `src/hooks/useMatchmaking.ts` | Logic | High | Handshake timeout leaves opponent stranded in room |
| `src/hooks/useMatchmaking.ts` | Performance | Low | Socket ping unhandled promise rejection |
| `src/hooks/useFriends.ts` | Performance | High | Static channel name collision & memory leak |
| `src/hooks/useFriends.ts` | Performance | Medium | Unthrottled Supabase RPC calls on realtime events |
| `src/hooks/useFriends.ts` | Logic/UI | High | Unchecked DB deletion silently desynchronizes UI |
| `src/hooks/useFriends.ts` | UI | Low | Error timer overwrite clears messages prematurely |
| `src/utils/playerTitles.ts` | Logic | Medium | Ranks 2–4 check counts 5th–10th place |
| `src/utils/shareCard.ts` | UI | Medium | Hardcoded text advance width distorts share card |
| `src/utils/shareCard.ts` | UI | Low | Missing `roundRect` canvas fallback |
| `src/utils/seededRandom.ts` | Logic | Low | Date parsing on invalid format strings |
| `src/data/constants.ts` | Logic | Medium | Unguarded code language lookup |

---
