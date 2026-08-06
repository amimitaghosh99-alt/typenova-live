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
}

/** Where this client sits in the offer → accept → confirm handshake. */
type Role = 'none' | 'offering' | 'accepting' | 'locked';

// Room codes must match the Socket.io lobby codes (6 chars, same alphabet)
// so ranked matches never produce codes that fail the App.tsx ?room= check
// or the 6-char join validation in RaceModal.
const makeRoomCode = () => Array.from({ length: 6 }, () => ROOM_ALPHABET[Math.floor(Math.random() * ROOM_ALPHABET.length)]).join('');

const HANDSHAKE_TIMEOUT_MS = 3000;

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
    setState({ status: 'searching' });

    const ch = supabase.channel('typenova:ranked-queue', {
      config: { presence: { key: myId }, broadcast: { self: true } }
    });
    channelRef.current = ch;

    const ping = () => {
      if (channelRef.current !== ch || roleRef.current !== 'none') return;
      ch.send({ type: 'broadcast', event: 'seek_ping', payload: { id: myId, name: myName, elo: myElo } });
    };
    pingIntervalRef.current = setInterval(ping, 2000);

    ch.on('broadcast', { event: 'seek_ping' }, ({ payload }) => {
      if (!payload?.id || payload.id === myId) return;
      if (roleRef.current !== 'none') return;

      // Lower UUID hosts, so exactly one side of a pair generates the room.
      if (myId >= payload.id) return;

      roleRef.current = 'offering';
      targetRef.current = payload.id;
      const roomCode = makeRoomCode();
      pendingOfferRef.current = { hostId: myId, roomCode };

      ch.send({
        type: 'broadcast',
        event: 'match_offer',
        payload: { hostId: myId, opponentId: payload.id, roomCode, hostName: myName, hostElo: myElo }
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
