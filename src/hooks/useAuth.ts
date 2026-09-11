import { createContext, createElement, useCallback, useContext, useEffect, useState, useMemo } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { ReactNode } from 'react';
import { supabase } from '@/lib/supabase';

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
      if (data.session && typeof window !== 'undefined' && window.opener && window.name === 'typenova_oauth_popup') {
        try {
          window.close();
        } catch { }
        return;
      }
      // Only declare authReady if we have a session or there is no pending OAuth code
      if (data.session || !hasOAuthCode) {
        setAuthReady(true);
      }
    }, (err: unknown) => {
      console.warn('[auth] getSession failed:', err);
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

      if (next) {
        // If this window was opened as a PWA OAuth popup, close it cleanly
        if (typeof window !== 'undefined' && window.opener && window.name === 'typenova_oauth_popup') {
          try {
            window.close();
          } catch { }
          return;
        }

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
      // Detect standalone PWA mode (installed desktop or mobile web app)
      const isStandalone = typeof window !== 'undefined' && (
        window.matchMedia('(display-mode: standalone)').matches ||
        window.matchMedia('(display-mode: fullscreen)').matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true
      );

      if (isStandalone) {
        // In standalone PWA, full-window redirect to accounts.google.com triggers
        // Chrome's out-of-scope in-app browser bar (with 'X' cancel button).
        // Using a focused popup keeps the main PWA window cleanly in-scope.
        const { data, error } = await sb.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: window.location.origin,
            skipBrowserRedirect: true,
          },
        });
        if (error) return { error };
        if (data?.url) {
          const w = 520;
          const h = 650;
          const left = Math.max(0, Math.round(window.screenX + (window.outerWidth - w) / 2));
          const top = Math.max(0, Math.round(window.screenY + (window.outerHeight - h) / 2));
          const popup = window.open(
            data.url,
            'typenova_oauth_popup',
            `width=${w},height=${h},left=${left},top=${top},status=no,menubar=no,toolbar=no`
          );

          if (!popup || popup.closed || typeof popup.closed === 'undefined') {
            // Popup blocked by browser settings — fallback to standard redirect
            window.location.href = data.url;
            return;
          }

          // Poll popup completion to sync session immediately upon return
          const timer = setInterval(async () => {
            if (popup.closed) {
              clearInterval(timer);
              const { data: sessionData } = await sb.auth.getSession();
              if (sessionData.session) {
                setSession(sessionData.session);
                setAuthReady(true);
              }
            }
          }, 500);
        }
        return { data };
      }

      // Standard browser tab redirect
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
