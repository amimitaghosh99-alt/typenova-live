import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { generateText } from '@/data/constants';
import type { Level, CodeLanguage } from '@/data/constants';
import type { RealtimeChannel } from '@supabase/supabase-js';

export type RaceStatus = 'idle' | 'joining' | 'lobby' | 'racing' | 'finished';

/**
 * Socket health, tracked separately from `status`. A dropped channel used to
 * destroy the room outright — the only way it could be made visible — so a
 * single Wi-Fi blip cost the whole race.
 */
export type RaceConnection = 'offline' | 'connecting' | 'live' | 'reconnecting';

export const ROOM_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const makeRoomCode = () =>
  Array.from({ length: 6 }, () => ROOM_ALPHABET[Math.floor(Math.random() * ROOM_ALPHABET.length)]).join('');

/** Presence updates are cheap individually but a keystroke-rate `track()` will
    trip Realtime's rate limits and drop the socket mid-race. */
const TRACK_INTERVAL_MS = 200;

/** Backoff schedule for resubscribing after a dropped socket. */
const RECONNECT_DELAYS_MS = [400, 1000, 2000, 4000, 8000];

/** How often each client measures round-trip time to its peers. */
const PING_INTERVAL_MS = 4000;

/** A joiner sitting alone in a channel means the code has no live room behind
    it. Realtime happily creates channels on demand, so this is the only signal
    that a code was mistyped. */
const EMPTY_ROOM_GRACE_MS = 2500;

const JOIN_TIMEOUT_MS = 15_000;

export interface TimelinePointLite {
  t: number;
  wpm: number;
}

export interface RacerState {
  id: string;
  userId?: string;
  name: string;
  isHost: boolean;
  progress: number; // 0-100
  wpm: number;
  accuracy?: number;
  keystrokes?: number;
  finished: boolean;
  finishWpm?: number;
  finishAcc?: number;
  finishMs?: number;
  rank?: number;
  elo?: number;
  rawWpm?: number;
  consistency?: number;
  heatmapData?: Record<string, { total: number; errors: number }>;
  errorCount?: number;
  backspaceCount?: number;
  /** Wall-clock join time. Drives stable slot ordering + host election. */
  joinedAt?: number;
  /** Opted in to the next race. The host is implicitly ready — it owns start. */
  ready?: boolean;
  /** Measured round-trip time in ms. Undefined until the first pong lands. */
  ping?: number;
  /** Per-player WPM curve, delivered over broadcast (too big for presence). */
  timeline?: TimelinePointLite[];
  errorTimes?: number[];
}

export interface RaceConfig {
  mode: Level;
  words: number;
  language?: CodeLanguage;
}

export interface RaceFinishPayload {
  wpm: number;
  accuracy: number;
  timeMs: number;
  rawWpm: number;
  consistency: number;
  keystrokes: number;
  errorCount: number;
  backspaceCount: number;
  heatmap?: Record<string, { total: number; errors: number }>;
  timeline?: TimelinePointLite[];
  errorTimes?: number[];
}

interface UseRaceOptions {
  onStart: (text: string, startAt: number) => void;
}

export interface ChatMessage {
  id: string;
  sender: string;
  senderId?: string;
  text: string;
  timestamp: string | number;
}

/**
 * Single source of truth for race standings. `useRace` and the results screen
 * used to sort differently (time vs. WPM), so the two screens could disagree
 * about who actually won.
 */
export const compareRacers = (a: RacerState, b: RacerState): number => {
  if (!!a.finished !== !!b.finished) return a.finished ? -1 : 1;
  const wa = a.finishWpm ?? a.wpm ?? 0;
  const wb = b.finishWpm ?? b.wpm ?? 0;
  if (wb !== wa) return wb - wa;
  const ma = a.finishMs ?? Infinity;
  const mb = b.finishMs ?? Infinity;
  if (ma !== mb) return ma - mb;
  return a.id.localeCompare(b.id);
};

/** Extra per-player payloads that are too large for a presence frame. */
type RacerDetails = Pick<RacerState, 'heatmapData' | 'timeline' | 'errorTimes'>;

/** Why a channel is being opened. Reconnects must skip the join-time guards. */
type ChannelMode = 'create' | 'join' | 'reconnect';

export const useRace = ({ onStart }: UseRaceOptions) => {
  const [status, setStatus] = useState<RaceStatus>('idle');
  const [connection, setConnection] = useState<RaceConnection>('offline');
  const [code, setCode] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [presencePlayers, setPresencePlayers] = useState<RacerState[]>([]);
  const [details, setDetails] = useState<Record<string, RacerDetails>>({});
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState('');
  /** Code that resolved to an empty channel, so the UI can offer to host it. */
  const [emptyRoomCode, setEmptyRoomCode] = useState<string | null>(null);
  const [raceId, setRaceId] = useState<string | null>(null);
  const [roomSize, setRoomSize] = useState(4);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [lobbyConfig, setLobbyConfig] = useState<RaceConfig>({ mode: 'NOVICE', words: 25 });
  const [selfId, setSelfId] = useState<string | null>(null);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const onStartRef = useRef(onStart);
  const selfStateRef = useRef<Partial<RacerState> & { roomState?: 'lobby' | 'racing'; config?: RaceConfig; roomSize?: number }>({});
  const joinTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isHostRef = useRef(false);
  const myIdRef = useRef<string | null>(null);
  /** Current host, needed by the pong handler to know whose clock to trust. */
  const hostIdRef = useRef<string | null>(null);

  // Presence throttling
  const trackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTrackRef = useRef(0);

  // Reconnect bookkeeping. `openChannelRef` breaks the cycle between opening a
  // channel and the drop handler that has to open the next one.
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openChannelRef = useRef<((roomCode: string, mode: ChannelMode) => void) | null>(null);

  // Latency + clock sync
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const peerRttRef = useRef<Map<string, number>>(new Map());
  /** hostClock - localClock, in ms. Applied to the host-minted start time. */
  const clockOffsetRef = useRef(0);

  const emptyRoomTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Mirrors for values the presence handler needs without re-subscribing.
  const statusRef = useRef(status);
  const lobbyConfigRef = useRef(lobbyConfig);
  const roomSizeRef = useRef(roomSize);
  const codeRef = useRef(code);

  useEffect(() => { onStartRef.current = onStart; }, [onStart]);
  useEffect(() => { isHostRef.current = isHost; }, [isHost]);
  useEffect(() => { statusRef.current = status; }, [status]);
  useEffect(() => { lobbyConfigRef.current = lobbyConfig; }, [lobbyConfig]);
  useEffect(() => { roomSizeRef.current = roomSize; }, [roomSize]);
  useEffect(() => { codeRef.current = code; }, [code]);


  const teardown = useCallback(() => {
    if (channelRef.current && supabase) {
      const stale = channelRef.current;
      // Cleared first: the CLOSED callback checks this ref to tell an
      // intentional teardown from a drop that should trigger a reconnect.
      channelRef.current = null;
      supabase.removeChannel(stale);
    }
    if (joinTimeoutRef.current) clearTimeout(joinTimeoutRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    if (trackTimerRef.current) clearTimeout(trackTimerRef.current);
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    if (emptyRoomTimerRef.current) clearTimeout(emptyRoomTimerRef.current);
    if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
    joinTimeoutRef.current = null;
    countdownIntervalRef.current = null;
    trackTimerRef.current = null;
    reconnectTimerRef.current = null;
    emptyRoomTimerRef.current = null;
    pingIntervalRef.current = null;
    setCountdown(null);
    setConnection('offline');
  }, []);

  const leave = useCallback(() => {
    teardown();
    setStatus('idle');
    setPresencePlayers([]);
    setDetails({});
    setChatMessages([]);
    setCode('');
    setIsHost(false);
    setError('');
    setEmptyRoomCode(null);
    setRoomSize(4);
    setRaceId(null);
    setSelfId(null);
    myIdRef.current = null;
    hostIdRef.current = null;
    selfStateRef.current = {};
    peerRttRef.current.clear();
    clockOffsetRef.current = 0;
    reconnectAttemptRef.current = 0;
  }, [teardown]);

  /** Push local presence, coalescing bursts into one frame per interval. */
  const flushTrack = useCallback(() => {
    lastTrackRef.current = Date.now();
    channelRef.current?.track(selfStateRef.current);
  }, []);

  const queueTrack = useCallback((immediate = false) => {
    if (!channelRef.current) return;
    if (immediate) {
      if (trackTimerRef.current) {
        clearTimeout(trackTimerRef.current);
        trackTimerRef.current = null;
      }
      flushTrack();
      return;
    }
    const since = Date.now() - lastTrackRef.current;
    if (since >= TRACK_INTERVAL_MS) {
      flushTrack();
      return;
    }
    if (trackTimerRef.current) return;
    trackTimerRef.current = setTimeout(() => {
      trackTimerRef.current = null;
      flushTrack();
    }, TRACK_INTERVAL_MS - since);
  }, [flushTrack]);

  /**
   * Subscribe to a room channel. Used for the initial create/join *and* every
   * reconnect, so all handler wiring lives in exactly one place.
   */
  const openChannel = useCallback((roomCode: string, mode: ChannelMode) => {
    if (!supabase) {
      setError('Database client not initialized');
      setStatus('idle');
      setConnection('offline');
      return;
    }
    const myId = myIdRef.current;
    if (!myId) return;

    // Captured so the deferred callbacks below keep the non-null narrowing.
    const client = supabase;

    const isReconnect = mode === 'reconnect';
    setConnection(isReconnect ? 'reconnecting' : 'connecting');

    const channel = client.channel(`race_${roomCode}`, {
      config: {
        presence: { key: myId },
      },
    });

    channelRef.current = channel;

    const fail = (message: string) => {
      setError(message);
      setStatus('idle');
      setPresencePlayers([]);
      teardown();
    };

    /**
     * The socket went away. Resubscribe with backoff instead of destroying the
     * room: local state (progress, finish payload, host flag) is preserved in
     * `selfStateRef` and re-tracked on the way back in.
     */
    const drop = () => {
      if (channelRef.current !== channel) return; // already replaced or torn down
      const attempt = reconnectAttemptRef.current;

      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }

      if (attempt >= RECONNECT_DELAYS_MS.length) {
        fail(statusRef.current === 'joining'
          ? 'Could not reach the multiplayer channel. Check your connection and try again.'
          : 'Lost connection to the room. Rejoin with the room code to get back in.');
        return;
      }

      reconnectAttemptRef.current = attempt + 1;
      setConnection('reconnecting');
      channelRef.current = null;
      client.removeChannel(channel);

      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = setTimeout(() => {
        reconnectTimerRef.current = null;
        openChannelRef.current?.(roomCode, 'reconnect');
      }, RECONNECT_DELAYS_MS[attempt]);
    };

    const sendPing = () => {
      if (channelRef.current !== channel) return;
      channel.send({ type: 'broadcast', event: 'ping', payload: { from: myId, t0: Date.now() } });
    };

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        if (joinTimeoutRef.current) {
          clearTimeout(joinTimeoutRef.current);
          joinTimeoutRef.current = null;
        }

        const mapped: RacerState[] = [];
        for (const key in state) {
          const presences = state[key] as unknown[];
          if (presences.length > 0) mapped.push(presences[0] as RacerState);
        }

        // Stable ordering: presenceState() is an unordered object, so without
        // this the podium slots and the host crown jump between players on
        // every sync.
        mapped.sort((a, b) => (a.joinedAt ?? 0) - (b.joinedAt ?? 0) || a.id.localeCompare(b.id));

        // Realtime creates a channel for any name you ask for, so a mistyped
        // code used to make the joiner the silent host of a phantom room:
        // right code shape, empty lobby, nothing to race, no explanation.
        if (mode === 'join' && statusRef.current === 'joining') {
          const others = mapped.filter(p => p.id !== myId);
          if (others.length === 0) {
            if (!emptyRoomTimerRef.current) {
              emptyRoomTimerRef.current = setTimeout(() => {
                emptyRoomTimerRef.current = null;
                setEmptyRoomCode(roomCode);
                fail(`No live room with code ${roomCode}.`);
              }, EMPTY_ROOM_GRACE_MS);
            }
            setPresencePlayers(mapped);
            return;
          }
          if (emptyRoomTimerRef.current) {
            clearTimeout(emptyRoomTimerRef.current);
            emptyRoomTimerRef.current = null;
          }
        }

        const declaredHost = mapped.find(p => p.isHost);
        const hostId = declaredHost?.id ?? mapped[0]?.id ?? myId;
        hostIdRef.current = hostId;
        const amHost = hostId === myId;

        mapped.forEach(p => { p.isHost = p.id === hostId; });

        const hostPlayer = mapped.find(p => p.id === hostId) as (RacerState & {
          roomState?: 'lobby' | 'racing';
          config?: RaceConfig;
          roomSize?: number;
        }) | undefined;

        // Joining guards: without these a late joiner can wander into a race
        // that is already running (which then freezes everyone's results screen
        // waiting on them) or past the room's capacity.
        if (mode === 'join' && statusRef.current === 'joining' && !amHost && hostPlayer) {
          if (hostPlayer.roomState === 'racing') {
            fail('That race is already in progress.');
            return;
          }
          const capacity = hostPlayer.roomSize ?? roomSizeRef.current;

          const myIndex = mapped.findIndex(p => p.id === myId);
          if (myIndex >= 0 && myIndex >= capacity) {
            fail('That room is full.');
            return;
          }
        }

        // Host migration. The room's live state only exists in the host's
        // presence frame, so a promoted client has to adopt it — otherwise the
        // guards above go blind for everyone who joins after the original host
        // disappears, and a stranger drops into a race in progress.
        if (!declaredHost && amHost && !selfStateRef.current.isHost) {
          selfStateRef.current.isHost = true;
          selfStateRef.current.ready = true;
          selfStateRef.current.roomState =
            statusRef.current === 'racing' || statusRef.current === 'finished' ? 'racing' : 'lobby';
          selfStateRef.current.config = selfStateRef.current.config ?? lobbyConfigRef.current;
          selfStateRef.current.roomSize = selfStateRef.current.roomSize ?? roomSizeRef.current;
          queueTrack(true);
        }
        setIsHost(amHost);
        isHostRef.current = amHost;

        // Late joiners get the room's real settings instead of local defaults.
        if (!amHost && hostPlayer) {
          if (hostPlayer.config) setLobbyConfig(prev => ({ ...prev, ...hostPlayer.config }));
          if (hostPlayer.roomSize) setRoomSize(hostPlayer.roomSize);
        }

        setStatus(prev => (prev === 'joining' ? 'lobby' : prev));

        const ranked = [...mapped].sort(compareRacers);
        mapped.forEach(p => {
          if (p.finished) p.rank = ranked.findIndex(r => r.id === p.id) + 1;
        });

        if (mapped.length > 0 && mapped.every(p => p.finished)) {
          setStatus(prev => (prev === 'racing' ? 'finished' : prev));
        }

        setPresencePlayers(mapped);
      })
      .on('broadcast', { event: 'start_race' }, ({ payload }) => {
        const { text, startTime, matchKey } = payload;
        setStatus('racing');
        setCountdown(null);
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
        if (matchKey) setRaceId(matchKey);
        setDetails({});

        selfStateRef.current = {
          ...selfStateRef.current,
          progress: 0,
          wpm: 0,
          accuracy: 100,
          keystrokes: 0,
          finished: false,
          finishWpm: undefined,
          finishAcc: undefined,
          finishMs: undefined,
          rank: undefined,
          ...(isHostRef.current ? { roomState: 'racing' as const } : {}),
        };
        queueTrack(true);
        // `startTime` is the host's wall clock. Ours can be seconds off, which
        // quietly handed one racer a head start, so translate it with the
        // measured offset instead of scheduling against our own clock.
        onStartRef.current(text, startTime - clockOffsetRef.current);
      })
      .on('broadcast', { event: 'countdown' }, ({ payload }) => {
        setCountdown(payload.seconds);
      })
      .on('broadcast', { event: 'rematch' }, () => {
        setStatus('lobby');
        setCountdown(null);
        setDetails({});
      })
      .on('broadcast', { event: 'update_room_size' }, ({ payload }) => {
        if (payload?.roomSize) setRoomSize(payload.roomSize);
      })
      .on('broadcast', { event: 'update_lobby_config' }, ({ payload }) => {
        if (payload?.config) setLobbyConfig(prev => ({ ...prev, ...payload.config }));
      })
      .on('broadcast', { event: 'finish_details' }, ({ payload }) => {
        if (!payload?.id) return;
        setDetails(prev => ({
          ...prev,
          [payload.id]: {
            heatmapData: payload.heatmapData,
            timeline: payload.timeline,
            errorTimes: payload.errorTimes,
          },
        }));
      })
      .on('broadcast', { event: 'chat_message' }, ({ payload }) => {
        setChatMessages(prev => {
          if (prev.some(m => m.id === payload.id)) return prev;
          return [...prev, payload];
        });
      })
      .on('broadcast', { event: 'ping' }, ({ payload }) => {
        if (!payload?.from || payload.from === myId) return;
        channel.send({
          type: 'broadcast',
          event: 'pong',
          payload: { to: payload.from, from: myId, t0: payload.t0, at: Date.now() },
        });
      })
      .on('broadcast', { event: 'pong' }, ({ payload }) => {
        if (!payload || payload.to !== myId || typeof payload.t0 !== 'number') return;
        const rtt = Date.now() - payload.t0;
        if (rtt < 0 || rtt > 10_000) return; // clock jump or a stale reply
        peerRttRef.current.set(payload.from, rtt);

        // Only the host's clock matters: it mints the start timestamp every
        // client schedules against.
        if (payload.from === hostIdRef.current && typeof payload.at === 'number') {
          clockOffsetRef.current = payload.at + rtt / 2 - Date.now();
        }

        const best = Math.min(...peerRttRef.current.values());
        if (selfStateRef.current.ping !== best) {
          selfStateRef.current.ping = best;
          queueTrack();
        }
      })
      .subscribe(async (subStatus) => {
        if (channelRef.current !== channel) return;
        if (subStatus === 'SUBSCRIBED') {
          reconnectAttemptRef.current = 0;
          setConnection('live');
          await channel.track(selfStateRef.current);
          lastTrackRef.current = Date.now();
          sendPing(); // seed latency + clock offset before the first race
          if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = setInterval(sendPing, PING_INTERVAL_MS);
        }
        if (subStatus === 'CHANNEL_ERROR' || subStatus === 'TIMED_OUT' || subStatus === 'CLOSED') {
          drop();
        }
      });

    if (!isReconnect) {
      joinTimeoutRef.current = setTimeout(() => {
        fail('Timed out joining the room. Check your connection and try again.');
      }, JOIN_TIMEOUT_MS);
    }
  }, [teardown, queueTrack]);

  useEffect(() => { openChannelRef.current = openChannel; }, [openChannel]);

  const setupChannel = useCallback((
    roomCode: string,
    isCreating: boolean,
    playerInit: Partial<RacerState>
  ) => {
    teardown();
    setError('');
    setEmptyRoomCode(null);
    setStatus('joining');
    setCode(roomCode);
    setRaceId(roomCode);
    setPresencePlayers([]);
    setDetails({});
    setChatMessages([]);

    const myId = playerInit.userId || `guest-${Math.random().toString(36).substring(2, 9)}`;
    setSelfId(myId);
    myIdRef.current = myId;
    hostIdRef.current = isCreating ? myId : null;
    peerRttRef.current.clear();
    clockOffsetRef.current = 0;
    reconnectAttemptRef.current = 0;

    const joinedAt = Date.now();
    selfStateRef.current = {
      id: myId,
      ...playerInit,
      isHost: isCreating,
      progress: 0,
      wpm: 0,
      accuracy: 100,
      keystrokes: 0,
      finished: false,
      // The host owns the start button, so its readiness is implicit.
      ready: isCreating,
      joinedAt,
      ...(isCreating ? { roomState: 'lobby' as const } : {}),
    };

    setIsHost(isCreating);
    isHostRef.current = isCreating;
    statusRef.current = 'joining';

    openChannel(roomCode, isCreating ? 'create' : 'join');
  }, [teardown, openChannel]);


  const createRoom = useCallback((name: string, size?: number, _config?: unknown, elo?: number, roomCode?: string, userId?: string, _isRanked?: boolean) => {
    const nextCode = roomCode || makeRoomCode();
    setRoomSize(size || 4);
    roomSizeRef.current = size || 4;
    setupChannel(nextCode, true, { name: name || 'Racer', userId, elo });
    selfStateRef.current.roomSize = size || 4;
    selfStateRef.current.config = lobbyConfigRef.current;
  }, [setupChannel]);

  const joinRoom = useCallback((roomCode: string, name: string, elo?: number, userId?: string, _isRanked?: boolean) => {
    const formattedCode = roomCode.trim().toUpperCase();
    if (!formattedCode) {
      setError('Please enter a room code.');
      return;
    }
    setupChannel(formattedCode, false, { name: name || 'Racer', userId, elo });
  }, [setupChannel]);

  // Reads host/config/code through refs so the callback identity never
  // changes. With `[isHost, lobbyConfig, code]` in the dep array, every lobby
  // tweak rebuilt this function — and with it the whole object returned below.
  const startRace = useCallback((textOverride?: string) => {
    if (!channelRef.current || !isHostRef.current) return;

    let secs = 5;
    setCountdown(secs);
    channelRef.current.send({
      type: 'broadcast',
      event: 'countdown',
      payload: { seconds: secs }
    });

    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

    countdownIntervalRef.current = setInterval(() => {
      secs--;
      if (secs > 0) {
        setCountdown(secs);
        channelRef.current?.send({
          type: 'broadcast',
          event: 'countdown',
          payload: { seconds: secs }
        });
      } else {
        clearInterval(countdownIntervalRef.current!);
        countdownIntervalRef.current = null;
        const cfg = lobbyConfigRef.current;
        const text = textOverride || generateText(cfg.mode, cfg.words, '');
        const startTime = Date.now() + 1500;
        const matchKey = `${codeRef.current}:${startTime}`;

        channelRef.current?.send({
          type: 'broadcast',
          event: 'start_race',
          payload: { text, startTime, matchKey }
        });

        setStatus('racing');
        setCountdown(null);
        setRaceId(matchKey);
        setDetails({});
        selfStateRef.current = {
          ...selfStateRef.current,
          progress: 0,
          wpm: 0,
          accuracy: 100,
          keystrokes: 0,
          finished: false,
          finishWpm: undefined,
          finishAcc: undefined,
          finishMs: undefined,
          rank: undefined,
          roomState: 'racing',
        };
        queueTrack(true);
        onStartRef.current(text, startTime);
      }
    }, 1000);
  }, [queueTrack]);

  const sendProgress = useCallback((progress: number, wpm: number, keystrokes = 0, accuracy = 100) => {
    if (!channelRef.current || selfStateRef.current.finished) return;
    selfStateRef.current = {
      ...selfStateRef.current,
      progress: Math.round(progress),
      wpm: Math.round(wpm),
      keystrokes: Math.round(keystrokes),
      accuracy: Math.round(accuracy),
    };
    queueTrack();
  }, [queueTrack]);

  const sendFinish = useCallback((payload: RaceFinishPayload) => {
    if (!channelRef.current || selfStateRef.current.finished) return;
    const myId = myIdRef.current;

    selfStateRef.current = {
      ...selfStateRef.current,
      progress: 100,
      finished: true,
      wpm: Math.round(payload.wpm),
      finishWpm: Math.round(payload.wpm),
      accuracy: Math.round(payload.accuracy),
      finishAcc: Math.round(payload.accuracy),
      finishMs: payload.timeMs,
      rawWpm: Math.round(payload.rawWpm),
      consistency: Math.round(payload.consistency),
      errorCount: payload.errorCount,
      backspaceCount: payload.backspaceCount,
      keystrokes: payload.keystrokes,
    };
    queueTrack(true);

    // Heatmaps and timelines are far too large for a presence frame — an
    // oversized payload gets dropped and the finish never lands at all.
    const detail: RacerDetails = {
      heatmapData: payload.heatmap,
      timeline: payload.timeline,
      errorTimes: payload.errorTimes,
    };
    if (myId) setDetails(prev => ({ ...prev, [myId]: detail }));
    channelRef.current.send({
      type: 'broadcast',
      event: 'finish_details',
      payload: { id: myId, ...detail },
    });
  }, [queueTrack]);

  const updateLobbyConfig = useCallback((newConfig: Partial<RaceConfig>) => {
    setLobbyConfig((prev) => {
      const merged = { ...prev, ...newConfig };
      if (channelRef.current && isHostRef.current) {
        selfStateRef.current.config = merged;
        queueTrack(true);
        channelRef.current.send({
          type: 'broadcast',
          event: 'update_lobby_config',
          payload: { config: merged }
        });
      }
      return merged;
    });
  }, [queueTrack]);

  const updateRoomSize = useCallback((newSize: number) => {
    setRoomSize(newSize);
    if (channelRef.current && isHostRef.current) {
      selfStateRef.current.roomSize = newSize;
      queueTrack(true);
      channelRef.current.send({
        type: 'broadcast',
        event: 'update_room_size',
        payload: { roomSize: newSize }
      });
    }
  }, [queueTrack]);

  /** Guests opt in to the next race. Hosts are always ready by definition. */
  const setReady = useCallback((ready: boolean) => {
    if (!channelRef.current || isHostRef.current) return;
    selfStateRef.current = { ...selfStateRef.current, ready };
    queueTrack(true);
  }, [queueTrack]);

  const returnToLobby = useCallback(() => {
    if (!channelRef.current) return;
    if (isHostRef.current) {
      channelRef.current.send({ type: 'broadcast', event: 'rematch' });
    }
    setStatus('lobby');
    setCountdown(null);
    setDetails({});
    selfStateRef.current = {
      ...selfStateRef.current,
      finished: false,
      progress: 0,
      wpm: 0,
      finishWpm: undefined,
      finishAcc: undefined,
      finishMs: undefined,
      rank: undefined,
      // Each round needs explicit consent again, so nobody gets dragged into a
      // rematch they walked away from.
      ready: isHostRef.current,
      ...(isHostRef.current ? { roomState: 'lobby' as const } : {}),
    };
    queueTrack(true);
  }, [queueTrack]);

  const sendChatMessage = useCallback((text: string, senderName: string) => {
    const myId = myIdRef.current;
    if (!channelRef.current || !myId) return;
    const msg: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      sender: senderName,
      senderId: myId,
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    channelRef.current.send({
      type: 'broadcast',
      event: 'chat_message',
      payload: msg
    });
    setChatMessages(prev => {
      if (prev.some(m => m.id === msg.id)) return prev;
      return [...prev, msg];
    });
  }, []);

  useEffect(() => {
    return () => teardown();
  }, [teardown]);

  /** Presence rows enriched with the broadcast-only payloads. */
  const players = useMemo(
    () => presencePlayers.map(p => (details[p.id] ? { ...p, ...details[p.id] } : p)),
    [presencePlayers, details]
  );

  const timelines = useMemo(() => {
    const out: Record<string, TimelinePointLite[]> = {};
    for (const [id, d] of Object.entries(details)) {
      if (d.timeline && d.timeline.length > 1) out[id] = d.timeline;
    }
    return out;
  }, [details]);

  /**
   * Every action above is now identity-stable, so this object is built once and
   * only changes when race state actually changes.
   *
   * It used to be a fresh literal on every render. Consumers couldn't put
   * `race` in a dep array without re-running on every keystroke, so App.tsx
   * mirrored the whole hook into a `raceRef` to broadcast progress. Callers can
   * depend on `race.sendProgress` (or on `race` itself) directly now.
   */
  const actions = useMemo(() => ({
    setRoomSize,
    createRoom,
    joinRoom,
    startRace,
    sendProgress,
    sendFinish,
    setReady,
    returnToLobby,
    rematch: returnToLobby,
    sendChatMessage,
    leave,
    updateLobbyConfig,
    updateRoomSize,
  }), [
    setRoomSize, createRoom, joinRoom, startRace, sendProgress, sendFinish,
    setReady, returnToLobby, sendChatMessage, leave, updateLobbyConfig,
    updateRoomSize,
  ]);

  return useMemo(() => ({
    status,
    connection,
    code,
    raceId,
    isHost,
    players,
    chatMessages,
    error,
    emptyRoomCode,
    countdown,
    roomSize,
    lobbyConfig,
    selfId,
    timelines,
    ...actions,
  }), [
    status, connection, code, raceId, isHost, players, chatMessages, error,
    emptyRoomCode, countdown, roomSize, lobbyConfig, selfId, timelines, actions,
  ]);
};
