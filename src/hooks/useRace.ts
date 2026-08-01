import { useState, useRef, useCallback, useEffect } from 'react';
import type { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import type { Level, CodeLanguage } from '../data/constants';

// Multiplayer race rooms over Supabase Realtime channels (broadcast +
// presence only — no database tables involved). The host generates the text
// and carries it in their presence meta; a 'start' broadcast synchronizes
// the countdown; 250ms-throttled 'progress' broadcasts drive the live
// opponent bars; 'finish' broadcasts build the final ranking.

export type RaceStatus = 'idle' | 'joining' | 'lobby' | 'racing' | 'finished';

export interface RacerState {
  id: string;
  name: string;
  userId?: string;
  isHost: boolean;
  progress: number; // 0-100
  wpm: number;
  finished: boolean;
  finishWpm?: number;
  finishAcc?: number;
  finishMs?: number;
  rawWpm?: number;
  consistency?: number;
  heatmapData?: Record<string, { total: number; errors: number }>;
  errorCount?: number;
  backspaceCount?: number;
  elo?: number;
}

export interface RaceConfig {
  mode: Level;
  words: number;
  language?: CodeLanguage;
}

export const ROOM_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no 0/O/1/I/L
export const makeRoomCode = () =>
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
  /** Host-minted id for the current race, shared by every client in the room. */
  const [raceId, setRaceId] = useState<string | null>(null);
  const [roomSize, setRoomSize] = useState(2);
  const [lobbyConfig, setLobbyConfig] = useState<RaceConfig>({ mode: 'NOVICE', words: 25 });
  const lobbyConfigRef = useRef<RaceConfig>({ mode: 'NOVICE', words: 25 });

  const channelRef = useRef<RealtimeChannel | null>(null);
  const roomTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const [selfId] = useState(() => crypto.randomUUID());
  const selfIdRef = useRef(selfId);
  /** Our Supabase auth id (distinct from the presence key), needed to survive host migration. */
  const selfUserIdRef = useRef<string | undefined>(undefined);
  const progressRef = useRef<Record<string, { progress: number; wpm: number }>>({});
  const finishRef = useRef<Record<string, { wpm: number; acc: number; ms: number; rawWpm?: number; consistency?: number; heatmapData?: Record<string, { total: number; errors: number }>; errorCount?: number; backspaceCount?: number }>>({});
  const timelinesRef = useRef<Record<string, Array<{ t: number; wpm: number }>>>({});
  const metaRef = useRef<Record<string, any>>({});
  const startAtRef = useRef<number | null>(null);
  const textRef = useRef('');
  const statusRef = useRef<RaceStatus>('idle');
  const roomSizeRef = useRef(2);
  const lastProgressSendRef = useRef(0);
  const finishSentRef = useRef(false);
  const onStartRef = useRef(onStart);
  useEffect(() => { onStartRef.current = onStart; });
  useEffect(() => { statusRef.current = status; });

  const teardown = useCallback(() => {
    roomTimeoutsRef.current.forEach(t => clearTimeout(t));
    roomTimeoutsRef.current = [];
    if (channelRef.current && supabase) supabase.removeChannel(channelRef.current);
    channelRef.current = null;
    progressRef.current = {};
    finishRef.current = {};
    timelinesRef.current = {};
    metaRef.current = {};
    startAtRef.current = null;
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
    setRaceId(null);
  }, [teardown]);

  // Rebuild the player list from presence + latest progress/finish payloads.
  const rebuildPlayers = useCallback(() => {
    const ch = channelRef.current;
    if (!ch) return;
    const state = ch.presenceState() as Record<string, Array<any>>;
    
    // Update meta cache for active players
    for (const [key, metas] of Object.entries(state)) {
      if (metas[0]) metaRef.current[key] = metas[0];
    }

    // --- Memory Leak Cleanup ---
    // Remove data for players who have disconnected, UNLESS they have finished the race
    if (statusRef.current === 'lobby' || statusRef.current === 'racing') {
      const activeIds = new Set(Object.keys(state));
      [progressRef, finishRef, timelinesRef, metaRef].forEach(ref => {
        Object.keys(ref.current).forEach(id => {
          if (!activeIds.has(id) && !finishRef.current[id]) {
            delete ref.current[id];
          }
        });
      });
    }

    const next: RacerState[] = [];
    let hostFound = false;
    
    const allKnownIds = new Set([...Object.keys(state), ...Object.keys(finishRef.current)]);

    for (const key of allKnownIds) {
      const meta = state[key]?.[0] || metaRef.current[key];
      if (!meta?.name) continue;
      
      if (meta.isHost) hostFound = true;
      
      // Only update local lobby/room state from presence if it's coming from someone else (the host)
      // If we are the host, our local state is the source of truth; overwriting it with delayed presence state causes rubberbanding.
      if (key !== selfIdRef.current) {
        if (meta.isHost && meta.lobbyConfig) {
          lobbyConfigRef.current = meta.lobbyConfig;
          setLobbyConfig(meta.lobbyConfig);
        }
        if (meta.text) textRef.current = meta.text;
        if (meta.roomSize) { 
          roomSizeRef.current = meta.roomSize; 
          setRoomSize(meta.roomSize); 
        }
      }
      const prg = progressRef.current[key];
      const fin = finishRef.current[key] || (meta.finished ? { wpm: meta.finishWpm, acc: meta.finishAcc, ms: meta.finishMs, rawWpm: meta.rawWpm, consistency: meta.consistency, heatmapData: meta.heatmapData, errorCount: meta.errorCount, backspaceCount: meta.backspaceCount } : undefined);
      next.push({
        id: key,
        name: meta.name,
        userId: meta.userId,
        isHost: !!meta.isHost,
        elo: meta.elo,
        progress: fin ? 100 : (prg ? prg.progress : 0),
        wpm: fin ? fin.wpm : (prg ? prg.wpm : 0),
        finished: !!fin || !!meta.finished,
        finishWpm: fin?.wpm ?? meta.finishWpm,
        finishAcc: fin?.acc ?? meta.finishAcc,
        finishMs: fin?.ms ?? meta.finishMs,
        rawWpm: fin?.rawWpm ?? meta.rawWpm,
        consistency: fin?.consistency ?? meta.consistency,
        heatmapData: fin?.heatmapData ?? meta.heatmapData,
        errorCount: fin?.errorCount ?? meta.errorCount,
        backspaceCount: fin?.backspaceCount ?? meta.backspaceCount,
      });
    }
    // host first, then by name — stable lobby order
    next.sort((a, b) => Number(b.isHost) - Number(a.isHost) || a.id.localeCompare(b.id));

    // --- Host Migration ---
    if (!hostFound && next.length > 0 && (statusRef.current === 'lobby' || statusRef.current === 'racing')) {
      next[0].isHost = true; // alphabetically first player inherits host
        if (next[0].id === selfIdRef.current) {
          setIsHost(true);
          ch.track({
            name: next[0].name,
            isHost: true,
            text: textRef.current,
            roomSize: roomSizeRef.current,
            lobbyConfig: lobbyConfigRef.current,
            elo: next[0].elo,
            // Dropping userId here used to orphan the ranked result: the
            // opponent would resolve the duel against our presence key
            // (a random UUID) instead of our auth id.
            userId: selfUserIdRef.current,
          });
        }
    }

    setPlayers(next);

    // race is over when everyone still present has finished
    if (statusRef.current === 'racing' && next.length > 0 && next.every(p => p.finished)) {
      setStatus('finished');
    }
  }, []);

  const join = useCallback((roomCode: string, name: string, asHost: boolean, text?: string, size?: number, elo?: number, userId?: string, ranked?: boolean) => {
    if (!supabase) { setError('No connection to Supabase'); return; }
    teardown();
    setError('');
    setStatus('joining');
    setCode(roomCode);
    setIsHost(asHost);
    selfUserIdRef.current = userId;
    if (asHost && text) textRef.current = text;
    if (asHost && size) { roomSizeRef.current = size; setRoomSize(size); }

    // Ranked rooms live in their own channel namespace. Sharing the 5-char code
    // space with private rooms meant anyone typing a ranked code into the JOIN
    // box could walk into a live duel and void both players' Elo.
    const ch = supabase.channel(ranked ? `ranked-${roomCode}` : `race-${roomCode}`, {
      config: { presence: { key: selfIdRef.current }, broadcast: { self: true } },
    });
    channelRef.current = ch;

    ch.on('presence', { event: 'sync' }, rebuildPlayers);
    ch.on('broadcast', { event: 'start' }, ({ payload }) => {
      if (!payload?.text || statusRef.current === 'racing') return;
      setStatus('racing');
      // Anchor the countdown to a *relative* lead time on our own clock. The
      // host's absolute `startAt` is worthless here: a client whose system
      // clock is a few seconds fast would clamp to 1s and start early.
      const lead = typeof payload.leadMs === 'number' ? payload.leadMs : (payload.startAt as number) - Date.now();
      const localStartAt = Date.now() + Math.max(1000, lead);
      startAtRef.current = localStartAt;
      // Every client in the room agrees on this id; it's what lets the server
      // reject a second attempt to resolve the same duel.
      if (payload.raceId) setRaceId(payload.raceId as string);
      onStartRef.current(payload.text as string, localStartAt);
    });
    ch.on('broadcast', { event: 'progress' }, ({ payload }) => {
      // Self is intentionally recorded too, so our own bar matches what others see.
      if (!payload?.id) return;
      progressRef.current[payload.id] = { progress: payload.progress, wpm: payload.wpm };
      if (startAtRef.current) {
        if (!timelinesRef.current[payload.id]) timelinesRef.current[payload.id] = [];
        timelinesRef.current[payload.id].push({ t: Math.max(0, Date.now() - startAtRef.current), wpm: payload.wpm });
      }
      rebuildPlayers();
    });
    ch.on('broadcast', { event: 'finish' }, ({ payload }) => {
      if (!payload?.id) return;
      finishRef.current[payload.id] = { wpm: payload.wpm, acc: payload.acc, ms: payload.ms, rawWpm: payload.rawWpm, consistency: payload.consistency, heatmapData: payload.heatmapData, errorCount: payload.errorCount, backspaceCount: payload.backspaceCount };
      rebuildPlayers();
    });

    ch.subscribe(async (s) => {
      if (s === 'SUBSCRIBED') {
        await ch.track({ name, isHost: asHost, text: asHost ? text : undefined, roomSize: asHost ? size : undefined, lobbyConfig: asHost ? lobbyConfigRef.current : undefined, elo, userId });
        // Player cap check for non-hosts
        if (!asHost) {
          const t1 = setTimeout(() => {
            if (channelRef.current !== ch) return;
            const pState = ch.presenceState() as Record<string, Array<{ isHost?: boolean; roomSize?: number }>>;
            const count = Object.keys(pState).length;
            // Safely read roomSize from host's presence directly to avoid race conditions
            const hostMeta = Object.values(pState).find(metas => metas[0]?.isHost)?.[0];
            const cap = hostMeta?.roomSize ?? 4;
            if (count > cap) {
              setError(`Room is full (${cap}/${cap})`);
              leave();
              return;
            }
          }, 800);
          roomTimeoutsRef.current.push(t1);
        }
        setStatus('lobby');
        if (!asHost) {
          // If no host shows up in presence shortly, the room doesn't exist.
          const t2 = setTimeout(() => {
            if (channelRef.current !== ch) return;
            const state = ch.presenceState() as Record<string, Array<{ isHost?: boolean }>>;
            const hostThere = Object.values(state).some(metas => metas[0]?.isHost);
            if (!hostThere && statusRef.current === 'lobby') {
              setError(`Room ${roomCode} not found`);
              leave();
            }
          }, 2500);
          roomTimeoutsRef.current.push(t2);
        }
      } else if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT') {
        setError('Realtime connection failed');
        setStatus('idle');
      }
    });
  }, [supabase, teardown, rebuildPlayers, leave]);

  const createRoom = useCallback((name: string, size: number = 2, text?: string, elo?: number, roomCode?: string, userId?: string, ranked?: boolean) => {
    join(roomCode || makeRoomCode(), name, true, text, size, elo, userId, ranked);
  }, [join]);

  const joinRoom = useCallback((roomCode: string, name: string, elo?: number, userId?: string, ranked?: boolean) => {
    join(roomCode.toUpperCase(), name, false, undefined, undefined, elo, userId, ranked);
  }, [join]);

  /** Host only: synchronize the start. Everyone (incl. host, via self:true
      broadcast) receives it and begins the same countdown. */
  const startRace = useCallback((finalText?: string) => {
    const textToUse = finalText || textRef.current;
    channelRef.current?.send({
      type: 'broadcast',
      event: 'start',
      // leadMs is what receivers actually use; startAt is kept for older clients.
      payload: { text: textToUse, startAt: Date.now() + 4000, leadMs: 4000, raceId: crypto.randomUUID() },
    });
  }, []);

  const sendProgress = useCallback((progress: number, wpm: number) => {
    const now = Date.now();
    if (now - lastProgressSendRef.current < 250 && progress < 100) return;
    lastProgressSendRef.current = now;
    channelRef.current?.send({
      type: 'broadcast',
      event: 'progress',
      payload: { id: selfId, progress: Math.round(progress), wpm },
    });
  }, [selfId]);

  const sendFinish = useCallback(async (wpm: number, acc: number, ms: number, rawWpm?: number, consistency?: number, heatmapData?: Record<string, { total: number; errors: number }>, errorCount?: number, backspaceCount?: number) => {
    if (finishSentRef.current) return;
    finishSentRef.current = true;
    
    // Explicitly update our own finish state locally immediately! 
    // This guarantees the UI triggers the match-end/Elo logic without relying on the network echoing the broadcast back to us.
    finishRef.current[selfIdRef.current] = { wpm, acc, ms, rawWpm, consistency, heatmapData, errorCount, backspaceCount };
    rebuildPlayers();

    channelRef.current?.send({
      type: 'broadcast',
      event: 'finish',
      payload: { id: selfIdRef.current, wpm, acc, ms, rawWpm, consistency, heatmapData, errorCount, backspaceCount },
    });
    
    // Fallback: also store finish state in presence in case broadcast is dropped
    try {
      const state = channelRef.current?.presenceState() || {};
      const metas = state[selfIdRef.current] || [];
      const currentMeta = metas[0];
      if (currentMeta) {
        await channelRef.current?.track({ ...currentMeta, finished: true, finishWpm: wpm, finishAcc: acc, finishMs: ms, rawWpm, consistency, heatmapData, errorCount, backspaceCount });
      }
    } catch {
      // ignore track errors
    }
  }, [rebuildPlayers]);

  const updateLobbyConfig = useCallback(async (newConfig: Partial<RaceConfig>) => {
    const next = { ...lobbyConfigRef.current, ...newConfig };
    lobbyConfigRef.current = next;
    setLobbyConfig(next);

    if (channelRef.current && selfIdRef.current) {
      const state = channelRef.current.presenceState();
      const metas = state[selfIdRef.current] || [];
      if (metas[0]) {
        // Optimistically track the newly merged config immediately
        await channelRef.current.track({ ...metas[0], lobbyConfig: next });
      }
    }
  }, []);

  // Clean up the channel on unmount
  useEffect(() => teardown, [teardown]);

  const getTimelines = useCallback(() => timelinesRef.current, []);

  return {
    status,
    code,
    raceId,
    isHost,
    players,
    error,
    selfId,
    getTimelines,
    roomSize,
    lobbyConfig,
    createRoom,
    joinRoom,
    startRace,
    sendProgress,
    sendFinish,
    leave,
    updateLobbyConfig,
  };
};
