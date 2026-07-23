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
