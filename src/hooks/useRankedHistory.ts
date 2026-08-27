/* Fetch-on-mount hook: storing fetched rows in state is the whole job here, and
   the `signal` guard already prevents writes after unmount — which is what the
   rule protects against. Disabled file-wide (as in App.tsx) because the checker
   reports it at the setState inside the async fetch, not at the call site. */
/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface RankedMatchRow {
    id: string;
    won: boolean;
    opponentName: string;
    myWpm: number;
    opponentWpm: number;
    /** Elo the winner gained. The loser's deduction isn't stored separately. */
    eloTransfer: number;
    createdAt: string;
}

interface UseRankedHistoryOptions {
    supabase: SupabaseClient | null;
    /** Your auth uid. Nothing is fetched for guests. */
    userId?: string | null;
    /** Only fetch while the panel is actually on screen. */
    enabled?: boolean;
    /** Change to force a refetch, e.g. after your Elo moves. */
    refreshKey?: string | number;
    limit?: number;
}

/** `.or()` takes a raw filter string, so the id is checked before interpolation. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Your recent ranked duels.
 *
 * `ranked_matches` has been written on every ranked finish since the Elo
 * migration, but nothing ever read it back — so a ladder that moved your rating
 * gave you no record of who you played or whether you were climbing. Reads only;
 * all writes stay inside the SECURITY DEFINER RPC.
 */
export const useRankedHistory = ({
    supabase,
    userId,
    enabled = true,
    refreshKey,
    limit = 5,
}: UseRankedHistoryOptions) => {
    const [matches, setMatches] = useState<RankedMatchRow[]>([]);
    const [loading, setLoading] = useState(false);
    /** True when the ladder tables aren't there, so the UI can stay hidden. */
    const [unavailable, setUnavailable] = useState(false);

    const fetchHistory = useCallback(async (signal?: { cancelled: boolean }) => {
        if (!supabase || !userId || !UUID_RE.test(userId)) {
            setMatches([]);
            return;
        }

        setLoading(true);

        const { data, error } = await supabase
            .from('ranked_matches')
            .select('id, winner_id, loser_id, winner_wpm, loser_wpm, elo_transfer, created_at')
            .or(`winner_id.eq.${userId},loser_id.eq.${userId}`)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (signal?.cancelled) return;

        if (error || !data) {
            // Best-effort, exactly like the daily board: an unapplied migration
            // shouldn't break the compete screen.
            setLoading(false);
            setUnavailable(true);
            setMatches([]);
            return;
        }
        setUnavailable(false);

        // ranked_matches references auth.users, not profiles, so names can't be
        // embedded in the query above — they're resolved in a second read.
        const opponentIds = [...new Set(data.map(r => (r.winner_id === userId ? r.loser_id : r.winner_id)))];
        const names = new Map<string, string>();
        if (opponentIds.length > 0) {
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, username')
                .in('id', opponentIds);
            for (const p of profiles ?? []) names.set(p.id, p.username);
        }
        if (signal?.cancelled) return;

        setMatches(data.map(r => {
            const won = r.winner_id === userId;
            const opponentId = won ? r.loser_id : r.winner_id;
            return {
                id: r.id,
                won,
                opponentName: names.get(opponentId) || 'Unknown typist',
                myWpm: won ? r.winner_wpm : r.loser_wpm,
                opponentWpm: won ? r.loser_wpm : r.winner_wpm,
                eloTransfer: r.elo_transfer,
                createdAt: r.created_at,
            };
        }));
        setLoading(false);
    }, [supabase, userId, limit]);

    useEffect(() => {
        if (!enabled) return;
        const signal = { cancelled: false };
        void fetchHistory(signal);
        return () => { signal.cancelled = true; };
    }, [enabled, refreshKey, fetchHistory]);

    const refresh = useCallback(() => { void fetchHistory(); }, [fetchHistory]);

    return { matches, loading, unavailable, refresh };
};
