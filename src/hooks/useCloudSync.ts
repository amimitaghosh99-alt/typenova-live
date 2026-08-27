import { useCallback, useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, fireAndForget } from '@/lib/supabase';
import {
  readLocalProgress, writeLocalProgress, mergeProgress,
  type ProgressSnapshot, type HeatKey,
} from '@/lib/progress';
import { emitSyncEvent, PROGRESS_HYDRATED } from '@/lib/syncEvents';

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error' | 'needs-username';

/** The slice of local progress that lives as React state and must be
 *  refreshed in place when a cloud snapshot is merged in. */
export interface HydratePayload {
  xp: number;
  tests: number;
  achievements: string[];
  heatmap: Record<string, HeatKey>;
  /** Lifetime combo record — merged like every other progress value. */
  bestCombo: number;
}

export interface PublicProfileSyncData {
  level?: number;
  xp?: number;
  equippedTitle?: string;
  unlockedBadges?: string[];
  maxWpm?: number;
  avgAcc?: number;
  testsCompleted?: number;
}

interface Params {
  session: Session | null;
  /** Push a merged snapshot into the RPG hook's React state. */
  hydrateRPG: (payload: HydratePayload) => void;
  /** Called after local storage has been rewritten from a merge, so the
   *  app can re-read derived values (e.g. the daily streak). */
  onHydrated?: () => void;
}

interface ProfileRow { username: string; elo: number; data: Partial<ProgressSnapshot> | null; }

const PUSH_DEBOUNCE_MS = 1500;

/**
 * Cloud progress sync built on a `profiles` table (one row per auth user,
 * progress stored as a JSON blob in `data`).
 *
 *  - On login with an existing profile: merge cloud ⇄ local, write the
 *    result to both, and report `synced`.
 *  - On login with no profile yet: report `needs-username` so the app can
 *    prompt for a display name, then `saveUsername` creates the row.
 *  - `pushProgress()` debounces a write of the current local snapshot.
 */
export function useCloudSync({ session, hydrateRPG, onHydrated }: Params) {
  const [username, setUsername] = useState<string | null>(null);
  const [elo, setElo] = useState<number>(1000);
  const [status, setStatus] = useState<SyncStatus>('idle');

  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncedForUser = useRef<string | null>(null);
  // Keep the latest onHydrated without making it an effect dependency.
  const onHydratedRef = useRef(onHydrated);
  useEffect(() => { onHydratedRef.current = onHydrated; });

  useEffect(() => {
    const sb = supabase;
    if (!sb || !session) {
      syncedForUser.current = null;
      setUsername(null);
      setStatus('idle');
      return;
    }

    const uid = session.user.id;
    if (syncedForUser.current === uid) return; // already synced (token refresh, StrictMode)

    let active = true;
    (async () => {
      setStatus('syncing');
      // Every await below can reject outright (dropped connection, blocked
      // request), not just return an `error` field. Unguarded, that rejected
      // the whole IIFE — an unhandled rejection at window scope — and left the
      // status pinned on 'syncing', so the UI showed a sync that never ended.
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
          bestCombo: merged.bestCombo,
        });
        // Academy progress is owned by a hook mounted inside the Academy page
        // rather than by this one, and it loads from storage at mount. Signing in
        // with the Academy already open would otherwise leave it holding the
        // pre-merge copy, which the next cleared lesson would write straight back
        // over the cloud values.
        emitSyncEvent(PROGRESS_HYDRATED);
        onHydratedRef.current?.();

        await sb.from('profiles')
          .update({ data: merged, updated_at: new Date().toISOString() })
          .eq('id', uid);

        if (merged.consent) {
          // Insert into the immutable audit table (duplicates hit a unique
          // constraint, which is fine — the row is already there).
          fireAndForget(sb.from('user_consents').insert({
            user_id: uid,
            agreed_at: merged.consent.timestamp,
            legal_version: merged.consent.version,
            scope: merged.consent.scope,
            consent_method: merged.consent.consentMethod,
          }), 'consent audit insert');
        }

        if (!active) return;

        syncedForUser.current = uid;
        setUsername(row.username);
        setStatus('synced');
      } catch (err) {
        console.warn('[cloudSync] initial sync failed:', err);
        // Leave syncedForUser unset so the next session event retries.
        if (active) setStatus('error');
      }
    })();

    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  useEffect(() => () => { if (pushTimer.current) clearTimeout(pushTimer.current); }, []);

  /** First-login: claim a display name and create the profile from local progress. */
  const saveUsername = useCallback(async (name: string): Promise<{ ok: boolean; error?: string }> => {
    const sb = supabase;
    if (!sb || !session) return { ok: false, error: 'Not signed in' };
    const uid = session.user.id;
    const local = readLocalProgress();
    // A rejected insert (offline, blocked request) used to escape as a rejected
    // promise: the caller's `await` threw inside a click handler, so the modal
    // kept its spinner forever and the rejection landed at window scope.
    try {
      const { error } = await sb
        .from('profiles')
        .insert({ id: uid, username: name, data: local });
      if (error) {
        // A 23505 on the primary key means this account already has a profile
        // (a second tab got there first) — the name is not what's wrong, so
        // don't send the user off to invent a new one.
        if (error.code === '23505' && /pkey|primary key/i.test(`${error.message} ${error.details ?? ''}`)) {
          return { ok: false, error: 'Profile already created — reload the page' };
        }
        if (/duplicate|unique/i.test(error.message)) return { ok: false, error: 'That name is taken' };
        return { ok: false, error: 'Could not save name' };
      }

      if (local.consent) {
        fireAndForget(sb.from('user_consents').insert({
          user_id: uid,
          agreed_at: local.consent.timestamp,
          legal_version: local.consent.version,
          scope: local.consent.scope,
          consent_method: local.consent.consentMethod,
        }), 'consent audit insert');
      }

      // H8: Also seed a row in public_profiles so others don't see 'PLAYER NOT FOUND'.
      //
      // Upsert, not insert. This runs whenever `profiles` has no row for the
      // account, which does not guarantee `public_profiles` has none either —
      // the two are written separately, nothing rolls one back if the other
      // fails, and 20260806000001 backfilled this table on its own. An insert
      // in that state died on the primary key with 23505, leaving the account
      // invisible to everyone else.
      //
      // Only `id` and `username` are in the payload, so ON CONFLICT DO UPDATE
      // rewrites those two columns and leaves accumulated stats intact. RLS
      // allows it: the table has both a self-insert and a self-update policy
      // (20260806000000), and an upsert needs the pair. `username` carries its
      // own unique constraint, so a name held by a *different* row still fails
      // — logged and dropped, since the name is already claimed in `profiles`
      // by the time we get here.
      fireAndForget(
        sb.from('public_profiles').upsert({ id: uid, username: name }, { onConflict: 'id' }),
        'public profile seed',
      );
    } catch (err) {
      console.warn('[cloudSync] saveUsername failed:', err);
      return { ok: false, error: 'Network error — try again' };
    }
    syncedForUser.current = uid;
    setUsername(name);
    setStatus('synced');
    return { ok: true };
  }, [session]);

  /** Debounced push of the current local snapshot to the cloud. */
  const pushProgress = useCallback((extraData?: PublicProfileSyncData) => {
    const sb = supabase;
    if (!sb || !session) return;
    const uid = session.user.id;
    if (pushTimer.current) clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(() => {
      // Offline / transient failures are expected here; the next push retries.
      fireAndForget(
        sb.from('profiles')
          .update({ data: readLocalProgress(), updated_at: new Date().toISOString() })
          .eq('id', uid),
        'progress push',
      );

      if (extraData && username) {
        fireAndForget(
          sb.from('public_profiles')
            .upsert({
              id: uid,
              username,
              level: extraData.level || 1,
              xp: extraData.xp || 0,
              equipped_title: extraData.equippedTitle || 'novice',
              unlocked_badges: extraData.unlockedBadges || ['novice'],
              max_wpm: extraData.maxWpm || 0,
              avg_acc: extraData.avgAcc || 0,
              tests_completed: extraData.testsCompleted || 0,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'id' }),
          'public profile push',
        );
      }
    }, PUSH_DEBOUNCE_MS);
  }, [session, username]);

  return {
    username: session ? username : null,
    elo: session ? elo : 1000,
    setElo,
    status: session ? status : 'idle',
    saveUsername,
    pushProgress
  };
}
