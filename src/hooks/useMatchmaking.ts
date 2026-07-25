import { useState, useRef, useCallback } from 'react';
import type { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';

export interface MatchmakingState {
  status: 'idle' | 'searching' | 'found';
  roomCode?: string;
  opponentId?: string;
  opponentName?: string;
  opponentElo?: number;
  isHost?: boolean;
}

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const makeRoomCode = () => Array.from({ length: 5 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join('');

export const useMatchmaking = (supabase: SupabaseClient | null, myId: string, myName: string, myElo: number) => {
  const [state, setState] = useState<MatchmakingState>({ status: 'idle' });
  const channelRef = useRef<RealtimeChannel | null>(null);

  const teardown = useCallback(() => {
    if (channelRef.current && supabase) supabase.removeChannel(channelRef.current);
    channelRef.current = null;
  }, [supabase]);

  const cancel = useCallback(() => {
    teardown();
    setState({ status: 'idle' });
  }, [teardown]);

  const search = useCallback(() => {
    if (!supabase) return;
    teardown();
    setState({ status: 'searching' });

    // Join the global ranked queue channel
    const ch = supabase.channel('typenova:ranked-queue', {
      config: { presence: { key: myId }, broadcast: { self: true } }
    });
    channelRef.current = ch;

    ch.on('presence', { event: 'sync' }, () => {
      if (channelRef.current !== ch) return;
      const pState = ch.presenceState() as Record<string, Array<{ name: string; elo: number; seeking: boolean }>>;
      
      // Find all seekers
      const seekers = Object.entries(pState)
        .filter(([id, metas]) => id !== myId && metas[0]?.seeking)
        .map(([id, metas]) => ({ id, name: metas[0].name, elo: metas[0].elo }));

      if (seekers.length > 0) {
        // Match with the first one found (ideally we'd sort by closest Elo)
        const opponent = seekers.sort((a, b) => Math.abs(a.elo - myElo) - Math.abs(b.elo - myElo))[0];

        // To prevent both clients from generating a room, we use UUID alphabetical order
        if (myId < opponent.id) {
          // We are the host! Create the room code
          const roomCode = makeRoomCode();
          
          // Broadcast the match to the queue
          ch.send({
            type: 'broadcast',
            event: 'match_found',
            payload: { hostId: myId, opponentId: opponent.id, roomCode, hostName: myName, hostElo: myElo }
          });

          setState({ status: 'found', roomCode, opponentId: opponent.id, opponentName: opponent.name, opponentElo: opponent.elo, isHost: true });
          
          // Leave queue after a short delay so the broadcast goes through
          setTimeout(() => teardown(), 500);
        }
      }
    });

    ch.on('broadcast', { event: 'match_found' }, ({ payload }) => {
      if (payload.opponentId === myId) {
        // We are the guest! The host found us.
        setState({ status: 'found', roomCode: payload.roomCode, opponentId: payload.hostId, opponentName: payload.hostName, opponentElo: payload.hostElo, isHost: false });
        teardown();
      }
    });

    ch.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await ch.track({ name: myName, elo: myElo, seeking: true });
      }
    });

  }, [supabase, teardown, myId, myName, myElo]);

  return { state, search, cancel, clearMatch: () => setState({ status: 'idle' }) };
};
