import { useCallback, useState } from 'react';

/**
 * Room codes this client recently joined.
 *
 * The compete screen had no memory at all: leave a room, come back, and the only
 * way in was to retype the code from wherever you'd stashed it. Rematching the
 * person you were just racing meant asking them to send the code again.
 *
 * Scope is deliberately joins only, not rooms you hosted. A host's code is
 * generated inside `useRace` after the handshake, so recording it would mean a
 * second `useRecentRooms` instance up in `App` — and two instances each hold their
 * own copy of the list in state while writing the same `localStorage` key, so the
 * longer-lived one would clobber entries the other had added. One owner, one
 * writer.
 *
 * Local-only by design. This is a convenience cache, not a record — no schema
 * change, no sync, and nothing here is authoritative about whether a room is still
 * live. A chip is a shortcut to typing six characters; joining still goes through
 * the same handshake, and a dead code fails exactly as it would if typed by hand.
 */

const STORAGE_KEY = 'typenova_recent_rooms';
/** Enough to cover "the room I just left" and "the one before that". */
const MAX_ENTRIES = 3;
/** Codes are `ROOM_ALPHABET` from useRace — uppercase alphanumerics, six long. */
const CODE_SHAPE = /^[A-Z0-9]{6}$/;

export interface RecentRoom {
    code: string;
    /** ms epoch. Used to order the chips and to age them out. */
    at: number;
}

/** A code older than this is noise — the room is long gone. */
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

/**
 * Anything could be in `localStorage`: a hand-edited value, a shape from an
 * older build, or a half-written entry from a tab that died mid-write. Validate
 * field by field and drop whatever fails rather than trusting the parse.
 */
const parseStored = (raw: string | null): RecentRoom[] => {
    if (!raw) return [];
    try {
        const parsed: unknown = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        const cutoff = Date.now() - MAX_AGE_MS;
        const seen = new Set<string>();
        const out: RecentRoom[] = [];
        for (const entry of parsed) {
            if (!entry || typeof entry !== 'object') continue;
            const { code, at } = entry as Partial<RecentRoom>;
            if (typeof code !== 'string' || !CODE_SHAPE.test(code)) continue;
            if (typeof at !== 'number' || !Number.isFinite(at) || at < cutoff) continue;
            if (seen.has(code)) continue;
            seen.add(code);
            out.push({ code, at });
        }
        return out.sort((a, b) => b.at - a.at).slice(0, MAX_ENTRIES);
    } catch {
        // Malformed JSON. Start clean rather than throwing during render.
        return [];
    }
};

const persist = (entries: RecentRoom[]): void => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch {
        // Private mode, or the quota is full. The chips are a convenience;
        // losing them is not worth surfacing an error for.
    }
};

export const useRecentRooms = () => {
    const [recent, setRecent] = useState<RecentRoom[]>(() => {
        try {
            return parseStored(localStorage.getItem(STORAGE_KEY));
        } catch {
            return [];
        }
    });

    /** Record a code. Re-recording an existing one moves it to the front. */
    const remember = useCallback((rawCode: string) => {
        const code = rawCode.trim().toUpperCase();
        if (!CODE_SHAPE.test(code)) return;
        setRecent((prev) => {
            const next = [
                { code, at: Date.now() },
                ...prev.filter((r) => r.code !== code),
            ].slice(0, MAX_ENTRIES);
            persist(next);
            return next;
        });
    }, []);

    const forget = useCallback((rawCode: string) => {
        const code = rawCode.trim().toUpperCase();
        setRecent((prev) => {
            const next = prev.filter((r) => r.code !== code);
            persist(next);
            return next;
        });
    }, []);

    const clear = useCallback(() => {
        setRecent([]);
        persist([]);
    }, []);

    return { recent, remember, forget, clear };
};
