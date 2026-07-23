import { useCallback, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

/** Session state + Google sign-in/out. Pure auth — no progress logic. */
export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const sb = supabase;
    if (!sb) { setAuthReady(true); return; }

    let active = true;
    sb.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setAuthReady(true);
    });

    const { data: sub } = sb.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });

    return () => { active = false; sub.subscription.unsubscribe(); };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const sb = supabase;
    if (!sb) return { error: new Error('Supabase not configured') };
    return sb.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
  }, []);

  const signOut = useCallback(async () => {
    const sb = supabase;
    if (!sb) return;
    await sb.auth.signOut();
  }, []);

  return {
    session,
    user: session?.user ?? null,
    authReady,
    signInWithGoogle,
    signOut,
  };
}
