import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/data/constants';

// Single shared Supabase client for the whole app (auth, leaderboard RPC,
// realtime races). Configured for the OAuth redirect flow: PKCE + URL
// session detection means the Google callback (a ?code= on the origin) is
// exchanged and cleaned up on load, before React mounts.
let client: SupabaseClient | null = null;
try {
  client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
  });
} catch (e) {
  console.error('Supabase init failed', e);
}

export const supabase = client;

/**
 * Attach a rejection handler to a request whose result nobody waits for.
 *
 * Query builders are thenables with no `.catch`, so a bare `.then()` — or no
 * handler at all — leaves a dropped connection or an RLS denial to surface as
 * an unhandled rejection at window scope. None of these writes is worth
 * interrupting the user over (the next one retries), so a failure is logged
 * and dropped.
 */
export function fireAndForget(op: PromiseLike<unknown>, context: string): void {
  op.then(undefined, (err: unknown) => {
    console.warn(`[supabase] ${context} failed:`, err);
  });
}
