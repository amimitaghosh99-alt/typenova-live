/**
 * Test history storage.
 *
 * Every completed test appends one entry here, and two consumers read it: the
 * operator dossier's form curve, per-difficulty breakdown and personal-best
 * board, and `src/lib/progress.ts`, which folds the log into the snapshot that
 * syncs to Supabase.
 *
 * It lives in `lib` rather than beside a component because of that second
 * consumer. These constants used to be exported from the stats dashboard, while
 * that dashboard imported `readLocalProgress` back out of `progress.ts` — a
 * genuine import cycle between a component module and a storage module. It
 * happened to work because the values are read inside functions rather than at
 * module scope, but it is exactly the shape that turns into an `undefined` at
 * import time the first moment someone hoists one of them to a top-level
 * constant. (That dashboard is gone now — its content is on the dossier — but
 * the reason this file is here has not changed.)
 */

/** One completed test, as persisted. */
export interface HistoryEntry {
    /** ISO date */
    d: string;
    wpm: number;
    acc: number;
    cons: number;
    level: string;
    mode: 'words' | 'time';
    size: number;
}

export const HISTORY_KEY = 'typezen_history';

/**
 * Newest N entries kept. The log is mirrored into the cloud row on every sync,
 * so it is capped to keep that payload bounded rather than growing forever.
 */
export const HISTORY_CAP = 500;

/**
 * The stored log, oldest first.
 *
 * CUSTOM runs are filtered out on read as well as on write: the exclusion
 * postdates the key, so any log written before it still holds them.
 */
export function loadHistory(): HistoryEntry[] {
    try {
        const raw = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
        if (Array.isArray(raw)) {
            return raw.filter((e: HistoryEntry) => e && e.level !== 'CUSTOM');
        }
        return [];
    } catch {
        return [];
    }
}

/**
 * Append one result. CUSTOM texts are dropped: the player supplied the text, so
 * its WPM is not comparable with anything else in the log and would distort
 * every average and personal best computed from it.
 */
export function appendHistory(entry: HistoryEntry): void {
    if (entry.level === 'CUSTOM') return;
    try {
        const next = [...loadHistory(), entry].slice(-HISTORY_CAP);
        localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
    } catch {
        /* quota / storage disabled — the run still counted in memory */
    }
}
