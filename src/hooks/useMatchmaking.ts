import { useState, useRef, useCallback, useEffect } from 'react';
import type { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { ROOM_ALPHABET } from './useRace';

export interface MatchmakingState {
  status: 'idle' | 'searching' | 'found';
  roomCode?: string;
  opponentId?: string;
  opponentName?: string;
  opponentElo?: number;
  isHost?: boolean;
  /** When the current search began, for the UI's elapsed timer. */
  startedAt?: number;
  /** How many clients are sitting in the queue channel, including you. */
  queueSize?: number;
  /** Current Elo tolerance. Widens the longer you wait. */
  eloBand?: number;
}

/** Where this client sits in the offer → accept → confirm handshake. */
type Role = 'none' | 'offering' | 'accepting' | 'locked';

// Room codes must match the Socket.io lobby codes (6 chars, same alphabet)
// so ranked matches never produce codes that fail the App.tsx ?room= check
// or the 6-char join validation in RaceModal.
const makeRoomCode = () => Array.from({ length: 6 }, () => ROOM_ALPHABET[Math.floor(Math.random() * ROOM_ALPHABET.length)]).join('');

const HANDSHAKE_TIMEOUT_MS = 3000;

/**
 * Elo tolerance schedule.
 *
 * The queue used to pair you with whoever pinged first, which in a "ranked" queue
 * meant a 900-rated typist could be handed a 1600 opponent and bleed Elo through
 * no fault of their own. Start narrow, widen every few seconds, then accept anyone
 * rather than leaving someone stuck forever.
 *
 * Exported because the waiting UI has to explain this schedule to the person
 * waiting — "widening in 3s", "matching anyone in 18s" — and a second copy of
 * these numbers in the component would drift silently the first time one is
 * tuned. `QuickMatchPanel` previously kept its own `OPEN_BAND = 100000` with a
 * comment pointing here, which is exactly that risk written down.
 */
export const ELO_BAND_START = 75;
export const ELO_BAND_STEP = 50;
export const ELO_BAND_INTERVAL_MS = 5000;
export const ELO_BAND_OPEN_MS = 30000;
/** Deliberately a big finite number: Infinity serializes to null over JSON. */
export const ELO_BAND_OPEN = 100000;

export const bandFor = (elapsedMs: number): number => (
  elapsedMs >= ELO_BAND_OPEN_MS
    ? ELO_BAND_OPEN
    : ELO_BAND_START + Math.floor(Math.max(0, elapsedMs) / ELO_BAND_INTERVAL_MS) * ELO_BAND_STEP
);

/** A pair is allowed when the gap fits inside *either* side's window, so a
    long-waiting player can pull in someone who just joined the queue. */
const withinBand = (a: number, b: number, bandA: number, bandB: number) =>
  Math.abs(a - b) <= Math.max(bandA, bandB);

export const useMatchmaking = (supabase: SupabaseClient | null, myId: string, myName: string, myElo: number) => {
  const [state, setState] = useState<MatchmakingState>({ status: 'idle' });
  const channelRef = useRef<RealtimeChannel | null>(null);
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const handshakeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // A three-step handshake (offer → accept → confirm) instead of a two-step
  // one. With 3+ clients in the queue, a two-step handshake lets a host offer
  // to B while B is simultaneously offering to C: B leaves for the first room
  // and C is stranded in a room whose host never arrives. The confirm step
  // means a guest only commits to a room the host has actually committed to.
  const roleRef = useRef<Role>('none');
  const targetRef = useRef<string | null>(null);
  const startedAtRef = useRef(0);
  const pendingOfferRef = useRef<{ hostId: string; roomCode: string; hostName?: string; hostElo?: number } | null>(null);

  const clearHandshake = useCallback(() => {
    if (handshakeTimeoutRef.current) clearTimeout(handshakeTimeoutRef.current);
    handshakeTimeoutRef.current = null;
    roleRef.current = 'none';
    targetRef.current = null;
    pendingOfferRef.current = null;
  }, []);

  const teardown = useCallback(() => {
    if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
    if (handshakeTimeoutRef.current) clearTimeout(handshakeTimeoutRef.current);
    if (settleTimeoutRef.current) clearTimeout(settleTimeoutRef.current);
    pingIntervalRef.current = null;
    handshakeTimeoutRef.current = null;
    settleTimeoutRef.current = null;
    roleRef.current = 'none';
    targetRef.current = null;
    pendingOfferRef.current = null;
    if (channelRef.current && supabase) supabase.removeChannel(channelRef.current);
    channelRef.current = null;
  }, [supabase]);

  const cancel = useCallback(() => {
    teardown();
    setState({ status: 'idle' });
  }, [teardown]);

  /** Leave the queue channel shortly after a match locks, letting the final
      confirm/accept frames flush first. */
  const settle = useCallback(() => {
    if (settleTimeoutRef.current) clearTimeout(settleTimeoutRef.current);
    settleTimeoutRef.current = setTimeout(() => teardown(), 500);
  }, [teardown]);

  const search = useCallback(() => {
    if (!supabase) return;
    teardown();
    startedAtRef.current = Date.now();
    setState({
      status: 'searching',
      startedAt: startedAtRef.current,
      queueSize: 1,
      eloBand: ELO_BAND_START,
    });

    const ch = supabase.channel('typenova:ranked-queue', {
      config: { presence: { key: myId }, broadcast: { self: true } }
    });
    channelRef.current = ch;

    const myBand = () => bandFor(Date.now() - startedAtRef.current);

    const ping = () => {
      if (channelRef.current !== ch || roleRef.current !== 'none') return;
      const band = myBand();
      // Surface the widening window so the wait doesn't look like a dead queue.
      setState(prev => (prev.status === 'searching' && prev.eloBand !== band ? { ...prev, eloBand: band } : prev));
      ch.send({ type: 'broadcast', event: 'seek_ping', payload: { id: myId, name: myName, elo: myElo, band } });
    };
    pingIntervalRef.current = setInterval(ping, 2000);

    // Queue depth, so the UI can say "2 typists searching" instead of spinning
    // with no indication of whether anyone else is even here.
    ch.on('presence', { event: 'sync' }, () => {
      if (channelRef.current !== ch) return;
      const size = Object.keys(ch.presenceState()).length;
      setState(prev => (prev.status === 'searching' && prev.queueSize !== size ? { ...prev, queueSize: size } : prev));
    });

    ch.on('broadcast', { event: 'seek_ping' }, ({ payload }) => {
      if (!payload?.id || payload.id === myId) return;
      if (roleRef.current !== 'none') return;

      // Lower UUID hosts, so exactly one side of a pair generates the room.
      if (myId >= payload.id) return;

      // Skill gate. Ignoring a ping is safe: they keep pinging every 2s and
      // both windows keep widening, so the pair forms as soon as it's fair.
      const theirElo = typeof payload.elo === 'number' ? payload.elo : myElo;
      const theirBand = typeof payload.band === 'number' ? payload.band : ELO_BAND_START;
      if (!withinBand(myElo, theirElo, myBand(), theirBand)) return;

      roleRef.current = 'offering';
      targetRef.current = payload.id;
      const roomCode = makeRoomCode();
      pendingOfferRef.current = { hostId: myId, roomCode };

      ch.send({
        type: 'broadcast',
        event: 'match_offer',
        payload: { hostId: myId, opponentId: payload.id, roomCode, hostName: myName, hostElo: myElo, band: myBand() }
      });

      // Unanswered offer — go back to pinging rather than sitting idle.
      if (handshakeTimeoutRef.current) clearTimeout(handshakeTimeoutRef.current);
      handshakeTimeoutRef.current = setTimeout(() => {
        if (roleRef.current === 'offering') clearHandshake();
      }, HANDSHAKE_TIMEOUT_MS);
    });

    ch.on('broadcast', { event: 'match_offer' }, ({ payload }) => {
      if (payload?.opponentId !== myId) return;
      if (roleRef.current !== 'none') return;

      // The offer has to clear this side's window too, otherwise a stale wide
      // offer could drag a fresh player into a lopsided ranked match.
      const hostElo = typeof payload.hostElo === 'number' ? payload.hostElo : myElo;
      const hostBand = typeof payload.band === 'number' ? payload.band : ELO_BAND_START;
      if (!withinBand(myElo, hostElo, myBand(), hostBand)) return;

      roleRef.current = 'accepting';
      pendingOfferRef.current = { hostId: payload.hostId, roomCode: payload.roomCode, hostName: payload.hostName, hostElo: payload.hostElo };

      ch.send({
        type: 'broadcast',
        event: 'match_accept',
        payload: { hostId: payload.hostId, opponentId: myId, roomCode: payload.roomCode, opponentName: myName, opponentElo: myElo }
      });

      // No confirm means the host committed elsewhere — never join that room.
      if (handshakeTimeoutRef.current) clearTimeout(handshakeTimeoutRef.current);
      handshakeTimeoutRef.current = setTimeout(() => {
        if (roleRef.current === 'accepting') clearHandshake();
      }, HANDSHAKE_TIMEOUT_MS);
    });

    ch.on('broadcast', { event: 'match_accept' }, ({ payload }) => {
      if (payload?.hostId !== myId) return;
      if (roleRef.current !== 'offering' || targetRef.current !== payload.opponentId) return;
      if (handshakeTimeoutRef.current) clearTimeout(handshakeTimeoutRef.current);
      roleRef.current = 'locked';

      ch.send({
        type: 'broadcast',
        event: 'match_confirm',
        payload: { hostId: myId, opponentId: payload.opponentId, roomCode: payload.roomCode }
      });

      setState({
        status: 'found',
        roomCode: payload.roomCode,
        opponentId: payload.opponentId,
        opponentName: payload.opponentName,
        opponentElo: payload.opponentElo,
        isHost: true,
      });
      settle();
    });

    ch.on('broadcast', { event: 'match_confirm' }, ({ payload }) => {
      if (payload?.opponentId !== myId) return;
      if (roleRef.current !== 'accepting') return;
      const pending = pendingOfferRef.current;
      if (!pending || pending.hostId !== payload.hostId || pending.roomCode !== payload.roomCode) return;
      if (handshakeTimeoutRef.current) clearTimeout(handshakeTimeoutRef.current);
      roleRef.current = 'locked';

      setState({
        status: 'found',
        roomCode: pending.roomCode,
        opponentId: pending.hostId,
        opponentName: pending.hostName,
        opponentElo: pending.hostElo,
        isHost: false,
      });
      settle();
    });

    ch.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await ch.track({ name: myName, elo: myElo, seeking: true });
        ping(); // don't make the first player wait a full interval
      }
    });

  }, [supabase, teardown, settle, clearHandshake, myId, myName, myElo]);

  // Without this, closing the modal mid-search leaves the ping interval and
  // the broadcast handlers alive: a phantom queue entry that keeps answering
  // offers and strands real players in empty rooms.
  useEffect(() => teardown, [teardown]);

  // Stable identity so callers can depend on it without re-running effects.
  const clearMatch = useCallback(() => setState({ status: 'idle' }), []);

  return { state, search, cancel, clearMatch };
};
