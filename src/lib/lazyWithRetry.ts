import { lazy, type ComponentType } from 'react';

/**
 * Detects whether an error is caused by a failed dynamic module import.
 * This commonly happens when a new version of the app is deployed to Vercel/CDN,
 * invalidating or purging previous build chunk hashes while the user has an existing tab open.
 */
export function isChunkLoadError(error: unknown): boolean {
  if (!error) return false;
  const msg = typeof error === 'string'
    ? error
    : (error as Error).message || String(error);

  return (
    /failed to fetch dynamically imported module/i.test(msg) ||
    /loading chunk .* failed/i.test(msg) ||
    /error loading dynamically imported module/i.test(msg) ||
    /unable to preload css/i.test(msg) ||
    /importing a module script failed/i.test(msg) ||
    /error resolving module specifier/i.test(msg) ||
    (error as any)?.isChunkLoadError === true
  );
}

/**
 * Higher-order wrapper around `React.lazy()` with automatic retry, exponential backoff,
 * and intelligent deployment stale-chunk recovery (cache-busting reload with loop protection).
 *
 * @param factory Function returning a dynamic import promise e.g. `() => import('./ResultsScreen')`
 * @param componentName Diagnostic identifier for logging and loop prevention tracking
 * @param retries Number of retry attempts before initiating page recovery (default 2)
 * @param intervalMs Base interval between retries (default 600ms)
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T } | T>,
  componentName = 'LazyComponent',
  retries = 2,
  intervalMs = 600
): React.LazyExoticComponent<T> {
  return lazy(async () => {
    let attempts = 0;

    while (attempts <= retries) {
      try {
        const module = await factory();
        // Clean up reload flag on successful load
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.removeItem(`typenova_chunk_reload_${componentName}`);
        }
        return (module && 'default' in module) ? module : { default: module as T };
      } catch (err) {
        attempts++;
        const isChunkErr = isChunkLoadError(err);

        // If not a chunk error or we exhausted all retry attempts
        if (!isChunkErr || attempts > retries) {
          if (isChunkErr && typeof window !== 'undefined' && typeof sessionStorage !== 'undefined') {
            const reloadKey = `typenova_chunk_reload_${componentName}`;
            const globalReloadKey = 'typenova_global_chunk_reload';
            const lastReload = sessionStorage.getItem(globalReloadKey);
            const now = Date.now();
            const recentlyReloaded = lastReload && (now - parseInt(lastReload, 10) < 15000);

            if (!recentlyReloaded) {
              sessionStorage.setItem(globalReloadKey, String(now));
              sessionStorage.setItem(reloadKey, 'true');
              console.warn(
                `[lazyWithRetry] Dynamic chunk import failed for "${componentName}" after ${attempts} attempts. Reloading client to fetch latest deployment assets.`
              );
              // Force browser reload from server
              window.location.reload();
              // Return a perpetual promise so Suspense stays in fallback while page unloads
              return new Promise<{ default: T }>(() => {});
            }
          }

          // Mark error and propagate to nearest ErrorBoundary
          if (err instanceof Error) {
            (err as any).isChunkLoadError = isChunkErr;
          }
          throw err;
        }

        // Wait with linear backoff before retrying
        await new Promise((resolve) => setTimeout(resolve, intervalMs * attempts));
      }
    }

    throw new Error(`[lazyWithRetry] Failed to load module "${componentName}" after ${retries} retries.`);
  });
}

/**
 * Preloads a lazy component into the browser module cache ahead of time
 * (e.g. during browser idle time or when typing starts) to avoid network latency
 * and insulate against mid-session deployment chunk invalidation.
 */
export function preloadComponent(factory: () => Promise<any>): void {
  try {
    const res = factory();
    if (res && typeof res.catch === 'function') {
      res.catch((err: any) => {
        // Suppress background preload failures silently
        console.debug('[preloadComponent] Background prefetch deferred:', err?.message || err);
      });
    }
  } catch {
    // Suppress synchronous preload errors
  }
}
