import { useEffect, useMemo, useRef, useState } from 'react';
import type { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';

/** A room a host has chosen to advertise. */
export interface OpenRoom {
    code: string;
    host: string;
    size: number;
    players: number;
    mode: string;
    words: number;
    ranked: boolean;
}

interface UseRoomDirectoryOptions {
    supabase: SupabaseClient | null;
    /** Non-null while this client wants its room listed. Null unlists it. */
    publish: OpenRoom | null;
    /** Your own room code, so you don't see yourself in the list. */
    selfCode?: string | null;
    /** Skip the subscription entirely when the browser isn't on screen. */
    enabled?: boolean;
}

const DIRECTORY_CHANNEL = 'typenova:rooms';

/**
 * A live directory of open rooms, built on Realtime presence rather than a
 * table — so it needs no migration and cleans itself up when a host's tab
 * closes.
 *
 * Before this, a room was only reachable if the host manually handed someone a
 * 6-character code: two strangers sitting on the compete screen at the same
 * moment had no way to end up in the same race.
 */
export const useRoomDirectory = ({ supabase, publish, selfCode, enabled = true }: UseRoomDirectoryOptions) => {
    const [rooms, setRooms] = useState<OpenRoom[]>([]);
    /**
     * Whether the presence channel has actually subscribed.
     *
     * `readyRef` below already tracked this, but a ref cannot drive a render, so
     * consumers had no way to tell "the directory has not answered yet" from
     * "there are no rooms" — both are `rooms.length === 0`. `RoomBrowser` was
     * therefore printing "No active public rooms right now" during the subscribe
     * window, which is a claim it had not yet earned.
     */
    const [connected, setConnected] = useState(false);
    const channelRef = useRef<RealtimeChannel | null>(null);
    const readyRef = useRef(false);
    // Latest advertisement, read by the subscribe callback and the track effect
    // so neither has to depend on a fresh object identity every render.
    const publishRef = useRef<OpenRoom | null>(null);
    // Presence keys are fixed at channel creation, so key by client and carry
    // the room code in the payload. Two clients briefly advertising the same
    // room (host migration) are deduped on read. Generated inside the effect —
    // randomness during render isn't allowed.
    const clientKeyRef = useRef('');

    // Serialized so an unchanged room doesn't re-track on every render.
    const publishKey = publish ? JSON.stringify(publish) : '';

    useEffect(() => {
        publishRef.current = publish;
    });

    useEffect(() => {
        if (!supabase || !enabled) return;
        if (!clientKeyRef.current) clientKeyRef.current = `dir-${Math.random().toString(36).slice(2, 10)}`;

        const ch = supabase.channel(DIRECTORY_CHANNEL, {
            config: { presence: { key: clientKeyRef.current } },
        });
        channelRef.current = ch;
        readyRef.current = false;

        const sync = () => {
            if (channelRef.current !== ch) return;
            const state = ch.presenceState<Record<string, unknown>>();
            const byCode = new Map<string, OpenRoom>();
            for (const entries of Object.values(state)) {
                for (const raw of entries as unknown as OpenRoom[]) {
                    if (!raw || typeof raw.code !== 'string' || raw.code.length !== 6) continue;
                    const prev = byCode.get(raw.code);
                    // Keep the fullest report: the freshest host knows the real count.
                    if (!prev || (raw.players ?? 0) > (prev.players ?? 0)) byCode.set(raw.code, raw);
                }
            }
            setRooms([...byCode.values()]);
        };

        ch.on('presence', { event: 'sync' }, sync);

        ch.subscribe((status) => {
            if (status !== 'SUBSCRIBED' || channelRef.current !== ch) return;
            readyRef.current = true;
            setConnected(true);
            // A room opened before the socket was ready still has to appear.
            if (publishRef.current) void ch.track(publishRef.current);
            sync();
        });

        return () => {
            channelRef.current = null;
            readyRef.current = false;
            setConnected(false);
            supabase.removeChannel(ch);
        };
    }, [supabase, enabled]);

    // Advertise / unlist. Untracking matters as much as tracking: a room that
    // has started racing or been left must stop inviting strangers in.
    useEffect(() => {
        const ch = channelRef.current;
        if (!ch || !readyRef.current) return;
        const ad = publishRef.current;
        if (ad) void ch.track(ad);
        else void ch.untrack();
    }, [publishKey]);

    const visibleRooms = useMemo(() => (
        enabled
            ? rooms
                .filter(r => r.code !== selfCode && r.players < r.size)
                .sort((a, b) => (b.players - a.players) || a.code.localeCompare(b.code))
            : []
    ), [rooms, selfCode, enabled]);

    return {
        rooms: visibleRooms,
        /**
         * True once the channel is live. Two cases never connect and must not
         * park a consumer on a loading state forever: the browser being disabled
         * (nothing to wait for) and Supabase being absent (nothing to connect
         * to — the entry screen already explains that separately).
         */
        connected: !enabled || !supabase ? true : connected,
    };
};
