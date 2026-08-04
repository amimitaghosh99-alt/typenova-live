import { useState, useRef, useCallback, useEffect } from 'react';
import { getSocket, connectSocket, disconnectSocket } from '../lib/socket';
import type { Level, CodeLanguage } from '../data/constants';

export type RaceStatus = 'idle' | 'joining' | 'lobby' | 'racing' | 'finished';

export const ROOM_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const makeRoomCode = () =>
  Array.from({ length: 6 }, () => ROOM_ALPHABET[Math.floor(Math.random() * ROOM_ALPHABET.length)]).join('');

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
}

export interface RaceConfig {
  mode: Level;
  words: number;
  language?: CodeLanguage;
}

export interface SocketRoomState {
  roomId: string;
  hostId: string;
  status: 'waiting' | 'countdown' | 'in_progress' | 'finished';
  textSnippet?: string;
  startTime?: number | null;
  countdown?: number | null;
  playerCount: number;
  maxPlayers: number;
  players: Array<{
    id: string;
    username: string;
    isHost: boolean;
    progress: number;
    keystrokes: number;
    wpm: number;
    accuracy: number;
    completed: boolean;
    finishTime: number | null;
    rank: number | null;
  }>;
  chatHistory: Array<{
    id: string;
    sender: string;
    text: string;
    timestamp: string;
  }>;
}

interface UseRaceOptions {
  /** Callback fired when server starts race with snippet text and start timestamp */
  onStart: (text: string, startAt: number) => void;
}

export const useRace = ({ onStart }: UseRaceOptions) => {
  const [status, setStatus] = useState<RaceStatus>('idle');
  const [code, setCode] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [players, setPlayers] = useState<RacerState[]>([]);
  const [error, setError] = useState('');
  const [raceId, setRaceId] = useState<string | null>(null);
  const [roomSize, setRoomSize] = useState(4);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [lobbyConfig, setLobbyConfig] = useState<RaceConfig>({ mode: 'NOVICE', words: 25 });
  const [selfId, setSelfId] = useState<string | null>(null);
  const [timelines, setTimelines] = useState<any[]>([]);

  const lastProgressSendRef = useRef(0);
  const finishSentRef = useRef(false);
  const onStartRef = useRef(onStart);
  const codeRef = useRef(code);

  useEffect(() => { onStartRef.current = onStart; }, [onStart]);
  useEffect(() => { codeRef.current = code; }, [code]);

  /** Clean up socket listeners & state */
  const teardown = useCallback(() => {
    const socket = getSocket();
    socket.off('lobby_state_update');
    socket.off('race_started');
    socket.off('countdown_tick');
    socket.off('error');

    finishSentRef.current = false;
    lastProgressSendRef.current = 0;
    setCountdown(null);
  }, []);

  /** Leave lobby and disconnect socket cleanly */
  const leave = useCallback(() => {
    const socket = getSocket();
    if (socket.connected && codeRef.current) {
      socket.emit('leave_lobby');
    }
    teardown();
    disconnectSocket();

    setStatus('idle');
    setPlayers([]);
    setCode('');
    setIsHost(false);
    setError('');
    setRoomSize(4);
    setRaceId(null);
    setCountdown(null);
    setSelfId(null);
    setTimelines([]);
  }, [teardown]);

  /** Setup Socket.io Listeners */
  const attachSocketListeners = useCallback(() => {
    const socket = connectSocket();

    // Remove any legacy listeners before re-attaching
    socket.off('lobby_state_update');
    socket.off('race_started');
    socket.off('countdown_tick');
    socket.off('error');

    // Listener 1: lobby_state_update
    socket.on('lobby_state_update', (roomState: SocketRoomState) => {
      if (!roomState) return;

      setCode(roomState.roomId);
      setIsHost(roomState.hostId === socket.id);
      setRoomSize(roomState.maxPlayers || 4);
      setSelfId(socket.id || null);

      // Map remote players list to RacerState interface
      const mappedPlayers: RacerState[] = roomState.players.map((p) => ({
        id: p.id,
        name: p.username,
        isHost: p.isHost,
        progress: p.progress || 0,
        wpm: p.wpm || 0,
        accuracy: p.accuracy || 100,
        keystrokes: p.keystrokes || 0,
        finished: p.completed || false,
        finishWpm: p.wpm,
        finishAcc: p.accuracy,
        finishMs: p.finishTime ? p.finishTime * 1000 : undefined,
        rank: p.rank || undefined,
      }));

      setPlayers(mappedPlayers);

      // Map room status
      if (roomState.status === 'waiting') {
        setStatus('lobby');
      } else if (roomState.status === 'countdown') {
        setStatus('lobby');
        if (typeof roomState.countdown === 'number') {
          setCountdown(roomState.countdown);
        }
      } else if (roomState.status === 'in_progress') {
        setStatus('racing');
      } else if (roomState.status === 'finished') {
        setStatus('finished');
      }
    });

    // Listener 2: countdown_tick
    socket.on('countdown_tick', (data: { secondsRemaining: number }) => {
      setCountdown(data.secondsRemaining);
    });

    // Listener 3: race_started
    socket.on('race_started', (data: { roomId: string; snippet: string; startTime: number }) => {
      setStatus('racing');
      setCountdown(null);
      setRaceId(data.roomId);
      if (data.snippet) {
        onStartRef.current(data.snippet, data.startTime || Date.now());
      }
    });

    // Listener 4: error
    socket.on('error', (data: { message: string }) => {
      setError(data.message || 'Multiplayer socket error occurred');
      setStatus((prev) => (prev === 'joining' ? 'idle' : prev));
    });
  }, []);

  /** Create a new room via Socket.io */
  const createRoom = useCallback((name: string, size?: number, _config?: any, elo?: number, roomCode?: string, userId?: string, isRanked?: boolean) => {
    teardown();
    setError('');
    setStatus('joining');

    attachSocketListeners();
    const socket = connectSocket();

    socket.emit('create_lobby', { 
      username: name || 'Racer',
      maxPlayers: size,
      elo,
      roomId: roomCode,
      userId,
      isRanked 
    });
  }, [teardown, attachSocketListeners]);

  /** Join an existing room via Socket.io */
  const joinRoom = useCallback((roomCode: string, name: string, elo?: number, userId?: string, isRanked?: boolean) => {
    const formattedCode = roomCode.trim().toUpperCase();
    if (!formattedCode) {
      setError('Please enter a room code.');
      return;
    }

    teardown();
    setError('');
    setStatus('joining');
    setCode(formattedCode);

    attachSocketListeners();
    const socket = connectSocket();

    socket.emit('join_lobby', { 
      roomId: formattedCode, 
      username: name || 'Racer',
      elo,
      userId,
      isRanked 
    });
  }, [teardown, attachSocketListeners]);

  /** Host starts the race */
  const startRace = useCallback((text?: string) => {
    const socket = getSocket();
    const currentCode = codeRef.current;
    if (socket.connected && currentCode) {
      socket.emit('start_race', { roomId: currentCode, text });
    }
  }, []);

  /** Send real-time typing progress (throttled to ~100ms) */
  const sendProgress = useCallback((progress: number, wpm: number, keystrokes: number = 0, accuracy: number = 100) => {
    const socket = getSocket();
    const currentCode = codeRef.current;
    if (!socket.connected || !currentCode) return;

    const now = Date.now();
    if (now - lastProgressSendRef.current < 100 && progress < 100) return;
    lastProgressSendRef.current = now;

    socket.emit('player_progress', {
      roomId: currentCode,
      progress: Math.round(progress),
      keystrokes,
      wpm: Math.round(wpm),
      accuracy: Math.round(accuracy),
      completed: false,
    });
  }, []);

  /** Send race completion event */
  const sendFinish = useCallback((wpm: number, acc: number, timeMs: number, rawWpm: number, consistency: number, heatmap: any, errCount: number, backspaceCount: number) => {
    const socket = getSocket();
    const currentCode = codeRef.current;
    if (finishSentRef.current) return;
    finishSentRef.current = true;

    if (socket.connected && currentCode) {
      socket.emit('player_progress', {
        roomId: currentCode,
        progress: 100,
        keystrokes: errCount + backspaceCount, // fallback
        wpm: Math.round(wpm),
        accuracy: Math.round(acc),
        timeMs,
        rawWpm,
        consistency,
        heatmap,
        errCount,
        backspaceCount,
        completed: true,
      });
    }
  }, []);

  /** Update local lobby config */
  const updateLobbyConfig = useCallback((newConfig: Partial<RaceConfig>) => {
    setLobbyConfig((prev) => ({ ...prev, ...newConfig }));
  }, []);

  /** Rematch / reset race status */
  const rematch = useCallback(() => {
    startRace();
  }, [startRace]);

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      teardown();
      disconnectSocket();
    };
  }, [teardown]);

  return {
    status,
    code,
    raceId,
    isHost,
    players,
    error,
    countdown,
    roomSize,
    lobbyConfig,
    createRoom,
    joinRoom,
    startRace,
    sendProgress,
    sendFinish,
    rematch,
    leave,
    updateLobbyConfig,
    selfId,
    timelines,
  };
};
