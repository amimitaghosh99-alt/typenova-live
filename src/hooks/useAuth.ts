import { useCallback, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

/** Session state + Google sign-in/out. Pure auth — no progress logic. */
export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(!supabase);

  useEffect(() => {
    const sb = supabase;
    if (!sb) return;

    let active = true;
    // The rejection path matters more than the happy one here: reading the
    // stored session can fail outright (blocked storage, no network for a token
    // refresh), and without a handler `authReady` stayed false — so the guard
    // rendered "LOADING..." for ever, on top of an unhandled rejection.
    sb.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setAuthReady(true);
    }, (err: unknown) => {
      console.warn('[auth] getSession failed:', err);
      if (!active) return;
      setSession(null);
      setAuthReady(true); // fall through to the signed-out UI
    });

    const { data: sub } = sb.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      if (next && window.location.hash && (window.location.hash.includes('access_token=') || window.location.hash.includes('error='))) {
        window.history.replaceState(null, '', window.location.pathname);
      }
    });

    return () => { active = false; sub.subscription.unsubscribe(); };
  }, []);

  // Both are invoked as `void auth.signIn…()` from click handlers, so a
  // rejection has nowhere to go: report it in the return value instead.
  const signInWithGoogle = useCallback(async () => {
    const sb = supabase;
    if (!sb) return { error: new Error('Supabase not configured') };
    try {
      return await sb.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      });
    } catch (err) {
      console.warn('[auth] signInWithOAuth failed:', err);
      return { error: err instanceof Error ? err : new Error('Sign-in failed') };
    }
  }, []);

  const signOut = useCallback(async () => {
    const sb = supabase;
    if (!sb) return;
    try {
      await sb.auth.signOut();
    } catch (err) {
      // The local session is cleared regardless; onAuthStateChange follows.
      console.warn('[auth] signOut failed:', err);
    }
  }, []);

  return {
    session,
    user: session?.user ?? null,
    authReady,
    signInWithGoogle,
    signOut,
  };
}
