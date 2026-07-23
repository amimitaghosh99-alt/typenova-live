import { useState, useRef, useCallback, useEffect } from 'react';
import type { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';

// Multiplayer race rooms over Supabase Realtime channels (broadcast +
// presence only — no database tables involved). The host generates the text
// and carries it in their presence meta; a 'start' broadcast synchronizes
// the countdown; 250ms-throttled 'progress' broadcasts drive the live
// opponent bars; 'finish' broadcasts build the final ranking.

export type RaceStatus = 'idle' | 'joining' | 'lobby' | 'racing' | 'finished';

export interface RacerState {
  id: string;
  name: string;
  isHost: boolean;
  progress: number; // 0-100
  wpm: number;
  finished: boolean;
  finishWpm?: number;
  finishAcc?: number;
  finishMs?: number;
}

const ROOM_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no 0/O/1/I/L
const makeRoomCode = () =>
  Array.from({ length: 5 }, () => ROOM_ALPHABET[Math.floor(Math.random() * ROOM_ALPHABET.length)]).join('');

interface UseRaceOptions {
  supabase: SupabaseClient | null;
  /** Fired on every client (host included) when the race starts. */
  onStart: (text: string, startAt: number) => void;
}

export const useRace = ({ supabase, onStart }: UseRaceOptions) => {
  const [status, setStatus] = useState<RaceStatus>('idle');
  const [code, setCode] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [players, setPlayers] = useState<RacerState[]>([]);
  const [error, setError] = useState('');
  const [roomSize, setRoomSize] = useState(2);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const selfIdRef = useRef(Math.random().toString(36).slice(2, 10));
  const progressRef = useRef<Record<string, { progress: number; wpm: number }>>({});
  const finishRef = useRef<Record<string, { wpm: number; acc: number; ms: number }>>({});
  const textRef = useRef('');
  const statusRef = useRef<RaceStatus>('idle');
  const roomSizeRef = useRef(2);
  const lastProgressSendRef = useRef(0);
  const finishSentRef = useRef(false);
  const onStartRef = useRef(onStart);
  useEffect(() => { onStartRef.current = onStart; });
  useEffect(() => { statusRef.current = status; });

  const teardown = useCallback(() => {
    if (channelRef.current && supabase) supabase.removeChannel(channelRef.current);
    channelRef.current = null;
    progressRef.current = {};
    finishRef.current = {};
    textRef.current = '';
    finishSentRef.current = false;
    roomSizeRef.current = 2;
  }, [supabase]);

  const leave = useCallback(() => {
    teardown();
    setStatus('idle');
    setPlayers([]);
    setCode('');
    setIsHost(false);
    setError('');
    setRoomSize(2);
  }, [teardown]);

  // Rebuild the player list from presence + latest progress/finish payloads.
  const rebuildPlayers = useCallback(() => {
    const ch = channelRef.current;
    if (!ch) return;
    const state = ch.presenceState() as Record<string, Array<{ name?: string; isHost?: boolean; text?: string; roomSize?: number }>>;
    const next: RacerState[] = [];
    for (const [key, metas] of Object.entries(state)) {
      const meta = metas[0];
      if (!meta?.name) continue;
      if (meta.text) textRef.current = meta.text;
      if (meta.roomSize) { roomSizeRef.current = meta.roomSize; setRoomSize(meta.roomSize); }
      const prog = progressRef.current[key];
      const fin = finishRef.current[key] || (meta.finished ? { wpm: meta.finishWpm, acc: meta.finishAcc, ms: meta.finishMs } : undefined);
      next.push({
        id: key,
        name: meta.name,
        isHost: !!meta.isHost,
        progress: fin ? 100 : (prog?.progress ?? 0),
        wpm: fin?.wpm ?? prog?.wpm ?? 0,
        finished: !!fin,
        finishWpm: fin?.wpm,
        finishAcc: fin?.acc,
        finishMs: fin?.ms,
      });
    }
    // host first, then by name — stable lobby order
    next.sort((a, b) => Number(b.isHost) - Number(a.isHost) || a.name.localeCompare(b.name));
    setPlayers(next);

    // race is over when everyone still present has finished
    if (statusRef.current === 'racing' && next.length > 0 && next.every(p => p.finished)) {
      setStatus('finished');
    }
  }, []);

  const join = useCallback((roomCode: string, name: string, asHost: boolean, text?: string, size?: number) => {
    if (!supabase) { setError('No connection to Supabase'); return; }
    teardown();
    setError('');
    setStatus('joining');
    setCode(roomCode);
    setIsHost(asHost);
    if (asHost && text) textRef.current = text;
    if (asHost && size) { roomSizeRef.current = size; setRoomSize(size); }

    const ch = supabase.channel(`race-${roomCode}`, {
      config: { presence: { key: selfIdRef.current }, broadcast: { self: true } },
    });
    channelRef.current = ch;

    ch.on('presence', { event: 'sync' }, rebuildPlayers);
    ch.on('broadcast', { event: 'start' }, ({ payload }) => {
      if (!payload?.text || statusRef.current === 'racing') return;
      setStatus('racing');
      onStartRef.current(payload.text as string, payload.startAt as number);
    });
    ch.on('broadcast', { event: 'progress' }, ({ payload }) => {
      if (!payload?.id || payload.id === selfIdRef.current) {
        // still record self so our own bar matches what others see
      }
      progressRef.current[payload.id] = { progress: payload.progress, wpm: payload.wpm };
      rebuildPlayers();
    });
    ch.on('broadcast', { event: 'finish' }, ({ payload }) => {
      if (!payload?.id) return;
      finishRef.current[payload.id] = { wpm: payload.wpm, acc: payload.acc, ms: payload.ms };
      rebuildPlayers();
    });

    ch.subscribe(async (s) => {
      if (s === 'SUBSCRIBED') {
        await ch.track({ name, isHost: asHost, text: asHost ? text : undefined, roomSize: asHost ? size : undefined });
        // Player cap check for non-hosts
        if (!asHost) {
          setTimeout(() => {
            if (channelRef.current !== ch) return;
            const pState = ch.presenceState();
            const count = Object.keys(pState).length;
            // Read roomSize from host's presence
            const cap = roomSizeRef.current;
            if (count > cap) {
              setError(`Room is full (${cap}/${cap})`);
              leave();
              return;
            }
          }, 800);
        }
        setStatus('lobby');
        if (!asHost) {
          // If no host shows up in presence shortly, the room doesn't exist.
          setTimeout(() => {
            if (channelRef.current !== ch) return;
            const state = ch.presenceState() as Record<string, Array<{ isHost?: boolean }>>;
            const hostThere = Object.values(state).some(metas => metas[0]?.isHost);
            if (!hostThere && statusRef.current === 'lobby') {
              setError(`Room ${roomCode} not found`);
              leave();
            }
          }, 2500);
        }
      } else if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT') {
        setError('Realtime connection failed');
        setStatus('idle');
      }
    });
  }, [supabase, teardown, rebuildPlayers, leave]);

  const createRoom = useCallback((name: string, text: string, size: number = 2) => {
    join(makeRoomCode(), name, true, text, size);
  }, [join]);

  const joinRoom = useCallback((roomCode: string, name: string) => {
    join(roomCode.trim().toUpperCase(), name, false);
  }, [join]);

  /** Host only: synchronize the start. Everyone (incl. host, via self:true
      broadcast) receives it and begins the same countdown. */
  const startRace = useCallback(() => {
    channelRef.current?.send({
      type: 'broadcast',
      event: 'start',
      payload: { text: textRef.current, startAt: Date.now() + 4000 },
    });
  }, []);

  const sendProgress = useCallback((progress: number, wpm: number) => {
    const now = Date.now();
    if (now - lastProgressSendRef.current < 250 && progress < 100) return;
    lastProgressSendRef.current = now;
    channelRef.current?.send({
      type: 'broadcast',
      event: 'progress',
      payload: { id: selfIdRef.current, progress: Math.round(progress), wpm },
    });
  }, []);

  const sendFinish = useCallback(async (wpm: number, acc: number, ms: number) => {
    if (finishSentRef.current) return;
    finishSentRef.current = true;
    channelRef.current?.send({
      type: 'broadcast',
      event: 'finish',
      payload: { id: selfIdRef.current, wpm, acc, ms },
    });
    
    // Fallback: also store finish state in presence in case broadcast is dropped
    try {
      const state = channelRef.current?.presenceState() || {};
      const metas = state[selfIdRef.current] || [];
      const currentMeta = metas[0];
      if (currentMeta) {
        await channelRef.current?.track({ ...currentMeta, finished: true, finishWpm: wpm, finishAcc: acc, finishMs: ms });
      }
    } catch (e) {
      // ignore track errors
    }
  }, []);

  // Clean up the channel on unmount
  useEffect(() => teardown, [teardown]);

  return {
    status, code, isHost, players, error, roomSize,
    selfId: selfIdRef.current,
    createRoom, joinRoom, startRace, sendProgress, sendFinish, leave,
  };
};
