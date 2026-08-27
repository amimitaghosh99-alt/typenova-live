/**
 * Notifications between the modules that share `localStorage`-backed progress.
 *
 * Progress is split across several owners: `useRPGSystem` holds xp/tests,
 * `useAcademyEngine` holds Academy records, and `useCloudSync` rewrites all of
 * it from a merged cloud snapshot. Those owners are mounted in different parts
 * of the tree — the Academy engine lives inside `AcademyLayout`, several levels
 * below the sync hook — so there is no shared parent to thread callbacks
 * through. A DOM event is the cheapest way for them to stay consistent without
 * lifting the whole Academy engine into `App.tsx`.
 */

/** `localStorage` was rewritten from a cloud merge; re-read anything cached. */
export const PROGRESS_HYDRATED = 'typenova:progress-hydrated';

/** Academy stars/XP/streak changed locally and should be pushed to the cloud. */
export const ACADEMY_PROGRESS_CHANGED = 'typenova:academy-progress-changed';

export type SyncEventName = typeof PROGRESS_HYDRATED | typeof ACADEMY_PROGRESS_CHANGED;

export function emitSyncEvent(name: SyncEventName): void {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new Event(name));
}

/** Subscribe to a sync event. Returns the unsubscribe function. */
export function onSyncEvent(name: SyncEventName, handler: () => void): () => void {
    if (typeof window === 'undefined') return () => { };
    window.addEventListener(name, handler);
    return () => window.removeEventListener(name, handler);
}
