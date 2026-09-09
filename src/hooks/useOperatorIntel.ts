// ═══════════════════════════════════════════════════════════════════════
//  OPERATOR INTEL — the public record the dossier was never reading
//  ---------------------------------------------------------------------
//  The dossier used to render another operator from `public_profiles` alone,
//  which stores five aggregates. Everything derived from per-test history is
//  genuinely absent from that row, so three of the page's five tabs collapsed
//  into a note explaining that the data was private — while three tables that
//  are *readable by anyone* sat unused:
//
//    · `mode_scores`    — one best run per (user, mode), with accuracy,
//                         consistency, when it was set, and the replayable
//                         ghost curve of that exact run. `read all`, granted to
//                         `anon`. Indexed `(mode_key, wpm desc)`, which is what
//                         makes a rank query cheap.
//    · `ranked_matches` — every resolved Elo duel, with both operator ids.
//                         `read all`, granted to `authenticated`, so a signed-in
//                         viewer can compute their own record against anyone.
//    · `public_profiles.elo` — additive column; see the migration beside this
//                         file's landing commit. Read best-effort so the page
//                         works identically before and after it is applied.
//
//  So a public dossier can stop apologising and start being useful: their best
//  run per mode, where that run sits on the board, and how you have done against
//  them.
//
//  Every read is tagged with the operator it belongs to and checked on the way
//  back in, the same guard `useModeLeaderboard` uses — clicking through from one
//  operator to another must not let a slow response repaint the new page with
//  the old one's record.
// ═══════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useRef, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';

/** One row of `mode_scores`, plus where it sits on that mode's board. */
export interface OperatorBest {
    modeKey: string;
    wpm: number;
    accuracy: number;
    consistency: number | null;
    timeMs: number;
    achievedAt: string;
    /** 1-based board position. `null` when the rank query failed. */
    rank: number | null;
    /** How many operators have a run in this mode at all. */
    field: number | null;
}

export interface HeadToHead {
    wins: number;
    losses: number;
    /** ISO timestamp of the most recent duel between the two. */
    lastAt: string | null;
}

export interface OperatorIntel {
    bests: OperatorBest[];
    elo: number | null;
    head: HeadToHead | null;
    loading: boolean;
    /**
     * `mode_scores` could not be read — almost always a project that has not run
     * the Ghost Net migration. Distinguished from "no rows" so the section can
     * explain itself rather than showing a permanently empty board.
     */
    unavailable: boolean;
    refresh: () => void;
}

/**
 * How many modes the board section shows.
 *
 * Each one costs two `head: true` count queries for its rank, so this is the
 * knob that bounds the page's request count. Six covers every mode a player
 * realistically has a best in; a seventh row is not worth two more round trips.
 */
const BEST_MODES = 6;

/** Guards `.or()` interpolation — these ids come from the database, not a URL,
 *  but a PostgREST filter is a string and a filter is not the place to find out.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface ModeScoreDetail {
    mode_key: string;
    wpm: number;
    accuracy: number;
    consistency: number | null;
    time_ms: number;
    achieved_at: string;
}

interface RankedMatchRow {
    winner_id: string | null;
    loser_id: string | null;
    created_at: string;
}

const NO_BESTS: OperatorBest[] = [];

export function useOperatorIntel({
    supabase,
    operatorId,
    viewerId,
}: {
    supabase: SupabaseClient | null;
    /** The operator on screen. `null` until their profile row lands. */
    operatorId: string | null | undefined;
    /** The signed-in viewer, for the head-to-head record. */
    viewerId: string | null | undefined;
}): OperatorIntel {
    const [bests, setBests] = useState<OperatorBest[]>(NO_BESTS);
    const [elo, setElo] = useState<number | null>(null);
    const [head, setHead] = useState<HeadToHead | null>(null);
    /** Which operator the state describes; `null` until the first read settles. */
    const [loadedId, setLoadedId] = useState<string | null>(null);
    const [unavailable, setUnavailable] = useState(false);
    const [nonce, setNonce] = useState(0);

    const requestRef = useRef(0);

    const refresh = useCallback(() => {
        setLoadedId(null);
        setNonce((n) => n + 1);
    }, []);

    useEffect(() => {
        // No client or no operator is not a state to write, it is a state to
        // *report* — every value returned below is gated on the read having
        // settled for the operator now on screen, so there is nothing to clear.
        // Resetting here would be four synchronous setState calls inside an
        // effect body, which is the cascading-render pattern
        // `react-hooks/set-state-in-effect` exists to catch.
        if (!supabase || !operatorId) return;

        const token = ++requestRef.current;
        const target = operatorId;
        let active = true;

        const settle = (fn: () => void) => {
            if (!active || token !== requestRef.current) return;
            fn();
        };

        (async () => {
            /* ── Best runs, then their board positions ── */
            try {
                const { data, error } = await supabase
                    .from('mode_scores')
                    .select('mode_key, wpm, accuracy, consistency, time_ms, achieved_at')
                    .eq('user_id', target)
                    .order('wpm', { ascending: false })
                    .limit(BEST_MODES);

                if (error) throw error;
                const rows = (data ?? []) as unknown as ModeScoreDetail[];

                // Ranks in parallel. `head: true` sends no rows back, so each of
                // these is a count against the `(mode_key, wpm desc)` index.
                const ranked = await Promise.all(
                    rows.map(async (row): Promise<OperatorBest> => {
                        const base: OperatorBest = {
                            modeKey: row.mode_key,
                            wpm: row.wpm,
                            accuracy: row.accuracy,
                            consistency: row.consistency,
                            timeMs: row.time_ms,
                            achievedAt: row.achieved_at,
                            rank: null,
                            field: null,
                        };
                        try {
                            const [ahead, field] = await Promise.all([
                                supabase
                                    .from('mode_scores')
                                    .select('user_id', { count: 'exact', head: true })
                                    .eq('mode_key', row.mode_key)
                                    .gt('wpm', row.wpm),
                                supabase
                                    .from('mode_scores')
                                    .select('user_id', { count: 'exact', head: true })
                                    .eq('mode_key', row.mode_key),
                            ]);
                            if (ahead.error || field.error) return base;
                            return {
                                ...base,
                                rank: (ahead.count ?? 0) + 1,
                                field: field.count ?? null,
                            };
                        } catch {
                            // A missing rank is a missing caption, not a missing row.
                            return base;
                        }
                    }),
                );

                settle(() => {
                    setBests(ranked);
                    setUnavailable(false);
                });
            } catch (err) {
                console.warn('[intel] mode_scores read failed:', err);
                settle(() => {
                    setBests(NO_BESTS);
                    setUnavailable(true);
                });
            }

            /* ── Elo, best effort ──
               `public_profiles.elo` is additive: on a project that has not run
               the migration this select errors, and that is a missing caption
               rather than a broken page. `profiles.elo` is deliberately not used
               — that table is self-read only, so it can never answer for anyone
               but the viewer. */
            try {
                const { data, error } = await supabase
                    .from('public_profiles')
                    .select('elo')
                    .eq('id', target)
                    .maybeSingle();
                const value = (data as { elo?: number | null } | null)?.elo;
                settle(() => setElo(!error && typeof value === 'number' ? value : null));
            } catch {
                settle(() => setElo(null));
            }

            /* ── Head-to-head ── */
            if (viewerId && viewerId !== target && UUID.test(viewerId) && UUID.test(target)) {
                try {
                    const { data, error } = await supabase
                        .from('ranked_matches')
                        .select('winner_id, loser_id, created_at')
                        .or(
                            `and(winner_id.eq.${viewerId},loser_id.eq.${target}),` +
                            `and(winner_id.eq.${target},loser_id.eq.${viewerId})`,
                        )
                        .order('created_at', { ascending: false })
                        .limit(200);

                    if (error) throw error;
                    const rows = (data ?? []) as unknown as RankedMatchRow[];
                    settle(() =>
                        setHead(
                            rows.length === 0
                                ? { wins: 0, losses: 0, lastAt: null }
                                : {
                                    wins: rows.filter((r) => r.winner_id === viewerId).length,
                                    losses: rows.filter((r) => r.winner_id === target).length,
                                    lastAt: rows[0].created_at,
                                },
                        ),
                    );
                } catch (err) {
                    console.warn('[intel] head-to-head read failed:', err);
                    settle(() => setHead(null));
                }
            } else {
                settle(() => setHead(null));
            }

            settle(() => setLoadedId(target));
        })();

        return () => {
            active = false;
        };
    }, [supabase, operatorId, viewerId, nonce]);

    /**
     * Whether the state in hand describes the operator on screen.
     *
     * Everything is gated on this rather than cleared on the way in. It also
     * closes a real hole: clicking from one operator to another would otherwise
     * leave the previous operator's board runs painted under the new name for as
     * long as the new read took.
     */
    const settledForOperator = !!supabase && !!operatorId && loadedId === operatorId;

    return {
        bests: settledForOperator ? bests : NO_BESTS,
        elo: settledForOperator ? elo : null,
        head: settledForOperator ? head : null,
        // Derived rather than stored: a boolean would have to be flipped
        // synchronously inside the effect, which is the cascading-render pattern
        // `set-state-in-effect` warns about.
        loading: !!supabase && !!operatorId && loadedId !== operatorId,
        unavailable: settledForOperator && unavailable,
        refresh,
    };
}
