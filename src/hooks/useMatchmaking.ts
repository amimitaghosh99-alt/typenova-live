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
  const matchedRef = useRef(false);
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const offerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const teardown = useCallback(() => {
    if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
    if (offerTimeoutRef.current) clearTimeout(offerTimeoutRef.current);
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
    matchedRef.current = false;
    setState({ status: 'searching' });

    // Join the global ranked queue channel
    const ch = supabase.channel('typenova:ranked-queue', {
      config: { presence: { key: myId }, broadcast: { self: true } }
    });
    channelRef.current = ch;

    // Active ping mechanism: Send a seek_ping every 2 seconds
    pingIntervalRef.current = setInterval(() => {
      if (channelRef.current && !matchedRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'seek_ping',
          payload: { id: myId, name: myName, elo: myElo }
        });
      }
    }, 2000);

    ch.on('broadcast', { event: 'seek_ping' }, ({ payload }) => {
      if (matchedRef.current || payload.id === myId) return;

      // To prevent both clients from generating a room, we use UUID alphabetical order
      if (myId < payload.id) {
        // We are the host! Offer the room code
        matchedRef.current = true;
        const roomCode = makeRoomCode();
        
        // Broadcast the offer to the specific opponent
        ch.send({
          type: 'broadcast',
          event: 'match_offer',
          payload: { hostId: myId, opponentId: payload.id, roomCode, hostName: myName, hostElo: myElo }
        });

        // If no accept within 3 seconds, reset
        if (offerTimeoutRef.current) clearTimeout(offerTimeoutRef.current);
        offerTimeoutRef.current = setTimeout(() => {
          matchedRef.current = false;
        }, 3000);
      }
    });

    ch.on('broadcast', { event: 'match_offer' }, ({ payload }) => {
      if (payload.opponentId === myId && !matchedRef.current) {
        matchedRef.current = true;
        
        // We accept the offer!
        ch.send({
          type: 'broadcast',
          event: 'match_accept',
          payload: { hostId: payload.hostId, opponentId: myId, roomCode: payload.roomCode, opponentName: myName, opponentElo: myElo }
        });

        // We are the guest!
        setState({ status: 'found', roomCode: payload.roomCode, opponentId: payload.hostId, opponentName: payload.hostName, opponentElo: payload.hostElo, isHost: false });
        setTimeout(() => teardown(), 500);
      }
    });

    ch.on('broadcast', { event: 'match_accept' }, ({ payload }) => {
      if (payload.hostId === myId && matchedRef.current) {
        if (offerTimeoutRef.current) clearTimeout(offerTimeoutRef.current);
        
        // The guest accepted our offer! We are officially the host.
        setState({ status: 'found', roomCode: payload.roomCode, opponentId: payload.opponentId, opponentName: payload.opponentName, opponentElo: payload.opponentElo, isHost: true });
        
        // Wait briefly so any other pending messages settle
        setTimeout(() => teardown(), 500);
      }
    });

    ch.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        // We still track presence just for visibility in devtools, but matching relies purely on active pings.
        await ch.track({ name: myName, elo: myElo, seeking: true });
      }
    });

  }, [supabase, teardown, myId, myName, myElo]);

  return { state, search, cancel, clearMatch: () => setState({ status: 'idle' }) };
};
