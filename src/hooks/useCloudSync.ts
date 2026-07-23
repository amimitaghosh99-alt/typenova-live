import { useCallback, useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import {
  readLocalProgress, writeLocalProgress, mergeProgress,
  type ProgressSnapshot, type HeatKey,
} from '@/lib/progress';

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error' | 'needs-username';

/** The slice of local progress that lives as React state and must be
 *  refreshed in place when a cloud snapshot is merged in. */
export interface HydratePayload {
  xp: number;
  tests: number;
  achievements: string[];
  heatmap: Record<string, HeatKey>;
}

interface Params {
  session: Session | null;
  /** Push a merged snapshot into the RPG hook's React state. */
  hydrateRPG: (payload: HydratePayload) => void;
  /** Called after local storage has been rewritten from a merge, so the
   *  app can re-read derived values (e.g. the daily streak). */
  onHydrated?: () => void;
}

interface ProfileRow { username: string; data: Partial<ProgressSnapshot> | null; }

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
  const [status, setStatus] = useState<SyncStatus>('idle');

  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncedForUser = useRef<string | null>(null);
  // Keep the latest onHydrated without making it an effect dependency.
  const onHydratedRef = useRef(onHydrated);
  useEffect(() => { onHydratedRef.current = onHydrated; });

  useEffect(() => {
    const sb = supabase;
    if (!sb || !session) {
      setUsername(null);
      setStatus('idle');
      syncedForUser.current = null;
      return;
    }

    const uid = session.user.id;
    if (syncedForUser.current === uid) return; // already synced (token refresh, StrictMode)

    let active = true;
    (async () => {
      setStatus('syncing');
      const { data, error } = await sb
        .from('profiles')
        .select('username, data')
        .eq('id', uid)
        .maybeSingle();
      if (!active) return;

      if (error) { setStatus('error'); return; }
      if (!data) { setStatus('needs-username'); return; }

      const row = data as unknown as ProfileRow;
      const merged = mergeProgress(readLocalProgress(), row.data);
      writeLocalProgress(merged);
      hydrateRPG({
        xp: merged.xp,
        tests: merged.tests,
        achievements: merged.achievements,
        heatmap: merged.heatmap,
      });
      onHydratedRef.current?.();

      await sb.from('profiles')
        .update({ data: merged, updated_at: new Date().toISOString() })
        .eq('id', uid);
      if (!active) return;

      syncedForUser.current = uid;
      setUsername(row.username);
      setStatus('synced');
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
    const { error } = await sb
      .from('profiles')
      .insert({ id: uid, username: name, data: readLocalProgress() });
    if (error) {
      if (/duplicate|unique/i.test(error.message)) return { ok: false, error: 'That name is taken' };
      return { ok: false, error: 'Could not save name' };
    }
    syncedForUser.current = uid;
    setUsername(name);
    setStatus('synced');
    return { ok: true };
  }, [session]);

  /** Debounced push of the current local snapshot to the cloud. */
  const pushProgress = useCallback(() => {
    const sb = supabase;
    if (!sb || !session) return;
    const uid = session.user.id;
    if (pushTimer.current) clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(() => {
      sb.from('profiles')
        .update({ data: readLocalProgress(), updated_at: new Date().toISOString() })
        .eq('id', uid)
        .then(undefined, () => { /* offline / transient — next push retries */ });
    }, PUSH_DEBOUNCE_MS);
  }, [session]);

  return { username, status, saveUsername, pushProgress };
}
