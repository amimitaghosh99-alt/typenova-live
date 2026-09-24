import { createContext, createElement, useCallback, useContext, useEffect, useState, useMemo } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { emitHealthSignal } from '@/lib/healthMonitor';




interface AuthState {
  session: Session | null;
  user: Session['user'] | null;
  authReady: boolean;
  signInWithGoogle: () => Promise<{ error?: Error | null; data?: unknown } | undefined>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

/**
 * Single source of truth for auth state. Mount once at the app root so every
 * consumer (AuthGuard, Login, MainApp) reads the same session.
 *
 * The old per-hook `useState` pattern meant AuthGuard and Login each had their
 * own `session`; when `onAuthStateChange` fired, the race between them could
 * leave one stale — so the user had to click "Sign in" multiple times before
 * the redirect was recognised.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(!supabase);

  useEffect(() => {
    const sb = supabase;
    if (!sb) return;

    let active = true;

    // Detect if browser just returned from an OAuth redirect with ?code= or #access_token=
    const hasOAuthCode = typeof window !== 'undefined' && (
      window.location.search.includes('code=') ||
      window.location.hash.includes('access_token=')
    );

    // If returning from OAuth, don't rush to mark authReady=true if getSession() is initially null,
    // because Supabase's PKCE code exchange happens asynchronously. Safety timeout: 6s.
    let codeTimeout: ReturnType<typeof setTimeout> | null = null;
    if (hasOAuthCode) {
      codeTimeout = setTimeout(() => {
        if (active) setAuthReady(true);
      }, 6000);
    }

    sb.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      // Only declare authReady if we have a session or there is no pending OAuth code
      if (data.session || !hasOAuthCode) {
        setAuthReady(true);
      }
    }, (err: unknown) => {
      console.warn('[auth] getSession failed:', err);
      emitHealthSignal({
        type: 'auth_error',
        severity: 'warning',
        subsystem: 'auth',
        message: err instanceof Error ? err.message : 'Failed to query Supabase auth session',
      });
      if (!active) return;
      setSession(null);
      if (!hasOAuthCode) {
        setAuthReady(true);
      }
    });

    const { data: sub } = sb.auth.onAuthStateChange((_event, next) => {
      if (!active) return;
      setSession(next);
      setAuthReady(true);
      if (codeTimeout) {
        clearTimeout(codeTimeout);
        codeTimeout = null;
      }

      // Clean up PKCE code or implicit hash fragments from the URL so the
      // browser history doesn't carry auth artefacts.
      if (next) {
        const url = new URL(window.location.href);
        if (url.searchParams.has('code') || url.hash.includes('access_token=') || url.hash.includes('error=')) {
          window.history.replaceState(null, '', url.pathname);
        }
      }
    });

    return () => {
      active = false;
      if (codeTimeout) clearTimeout(codeTimeout);
      sub.subscription.unsubscribe();
    };
  }, []);

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
      console.warn('[auth] signOut failed:', err);
    }
  }, []);

  const value = useMemo<AuthState>(() => ({
    session,
    user: session?.user ?? null,
    authReady,
    signInWithGoogle,
    signOut,
  }), [session, authReady, signInWithGoogle, signOut]);

  return createElement(AuthContext.Provider, { value }, children);
}

/** Read shared auth state from the nearest `AuthProvider`. */
export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
