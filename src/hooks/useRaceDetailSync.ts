// ═══════════════════════════════════════════════════════════════════════
//  RACE DETAIL SYNC — chase the finish payloads that never arrived
//  ---------------------------------------------------------------------
//  `finish_details` is a fire-and-forget Supabase broadcast. Realtime neither
//  acknowledges nor replays it, so a single dropped frame — or any client that
//  subscribed after it went out — lost that racer's timeline permanently.
//  Presence carries the headline numbers but not the curve, which is why the
//  results screen could render a full set of cards above an empty graph and a
//  blank stats panel.
//
//  This hook re-asks the owner for anything missing, with a hard attempt cap so
//  a genuinely absent payload (a racer who closed the tab before sending)
//  settles into a visible "unavailable" state instead of retrying forever.
// ═══════════════════════════════════════════════════════════════════════

import { useEffect, useMemo, useRef, useState } from 'react';

/** Per-racer sync state, for the card to render. */
export type DetailSyncState = 'syncing' | 'missing';

/**
 * Attempts per racer. Three is enough to cover a dropped frame or two without
 * turning a permanently absent payload into an endless broadcast loop.
 */
const MAX_ATTEMPTS = 3;

/** Gap between attempts. Long enough for a reply to land and re-render first. */
const RETRY_MS = 1200;

/**
 * Delay before the first ask, so a payload already in flight when the results
 * screen mounted gets a chance to arrive on its own.
 */
const FIRST_DELAY_MS = 600;

export function useRaceDetailSync({
    racers,
    resolvedIds,
    requestDetails,
    selfId,
    enabled = true,
}: {
    /** Everyone who was in the race, finished or not. */
    racers: Array<{ id: string; finished: boolean }>;
    /** Ids whose detail payload we already hold. */
    resolvedIds: ReadonlySet<string>;
    requestDetails?: (id: string) => void;
    selfId: string;
    enabled?: boolean;
}): Map<string, DetailSyncState> {
    /**
     * Attempts so far, by id.
     *
     * Held twice on purpose. The effect needs the newest counts synchronously
     * when its timer fires, which a state value captured in a closure cannot
     * give it; render needs a value it is allowed to read, which a ref is not.
     * Both are written in the same place, so they cannot drift.
     */
    const attemptsRef = useRef<Record<string, number>>({});
    const [attempts, setAttempts] = useState<Record<string, number>>({});

    /* Only finished racers are worth chasing — an unfinished one has nothing to
       send yet. Self is excluded because we are the owner of our own payload. */
    const outstanding = useMemo(
        () => racers
            .filter((r) => r.finished && r.id !== selfId && !resolvedIds.has(r.id))
            .map((r) => r.id)
            .sort(),
        [racers, resolvedIds, selfId],
    );

    /* Read by the effect below, which is keyed on the *contents* of this list
       rather than its identity. Presence hands us a fresh array on every frame,
       and depending on that identity would reset the retry timer before it ever
       fired. */
    const outstandingRef = useRef<string[]>(outstanding);
    useEffect(() => {
        outstandingRef.current = outstanding;
    }, [outstanding]);

    const key = outstanding.join('|');

    useEffect(() => {
        if (!enabled || !requestDetails || key === '') return;

        let cancelled = false;
        let timer = 0;

        const ask = () => {
            if (cancelled) return;
            const next = { ...attemptsRef.current };
            let asked = false;
            for (const id of outstandingRef.current) {
                const n = next[id] ?? 0;
                if (n >= MAX_ATTEMPTS) continue;
                next[id] = n + 1;
                requestDetails(id);
                asked = true;
            }
            attemptsRef.current = next;
            // Published either way: the last attempt is what flips a card from
            // "syncing" to "unavailable".
            setAttempts(next);
            if (asked) timer = window.setTimeout(ask, RETRY_MS);
        };

        timer = window.setTimeout(ask, FIRST_DELAY_MS);
        return () => {
            cancelled = true;
            window.clearTimeout(timer);
        };
    }, [key, enabled, requestDetails]);

    return useMemo(() => {
        const out = new Map<string, DetailSyncState>();
        for (const id of outstanding) {
            out.set(id, (attempts[id] ?? 0) >= MAX_ATTEMPTS ? 'missing' : 'syncing');
        }
        return out;
    }, [outstanding, attempts]);
}
