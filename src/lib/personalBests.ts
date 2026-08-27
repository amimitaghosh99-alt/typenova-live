/**
 * Personal-best storage.
 *
 * Lives in `lib` rather than beside the stats dashboard because two surfaces
 * read it now — the dashboard and the operator dossier's PB board — and
 * exporting a plain function from a component module trips
 * `react-refresh/only-export-components`. The key format is the other reason:
 * `typezen_pb:<LEVEL>:<config>` was spelled out in three files, and
 * `src/lib/progress.ts` writes the same keys during a cloud merge.
 */

/** Prefix for every per-configuration personal-best entry. */
export const PB_PREFIX = 'typezen_pb:';

/**
 * Every stored personal best, highest WPM first.
 *
 * CUSTOM is excluded on purpose: a custom text is whatever the player pasted
 * in, so its "best" is not comparable with anything and would top the board
 * with a three-word snippet.
 */
export function loadPersonalBests(): Array<{ label: string; wpm: number }> {
    const out: Array<{ label: string; wpm: number }> = [];
    try {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!key?.startsWith(PB_PREFIX)) continue;
            try {
                const pb = JSON.parse(localStorage.getItem(key) || 'null');
                if (!pb?.wpm) continue;
                const [, level, cfg] = key.split(':');
                if (!level || !cfg || level === 'CUSTOM') continue;
                const label = `${level} · ${cfg.startsWith('t') ? `${cfg.slice(1)}s` : `${cfg.slice(1)} words`}`;
                out.push({ label, wpm: pb.wpm });
            } catch {
                /* corrupt entry — skip it rather than losing the whole board */
            }
        }
    } catch {
        /* storage disabled — an empty board is the honest answer */
    }
    return out.sort((a, b) => b.wpm - a.wpm);
}
