import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { generateText } from '@/data/constants';
import type { Level, CodeLanguage } from '@/data/constants';
import type { RealtimeChannel } from '@supabase/supabase-js';

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

export const useRace = ({ onStart }: UseRaceOptions) => {
  const [status, setStatus] = useState<RaceStatus>('idle');
  const [code, setCode] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [players, setPlayers] = useState<RacerState[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState('');
  const [raceId, setRaceId] = useState<string | null>(null);
  const [roomSize, setRoomSize] = useState(4);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [lobbyConfig, setLobbyConfig] = useState<RaceConfig>({ mode: 'NOVICE', words: 25 });
  const [selfId, setSelfId] = useState<string | null>(null);
  const [timelines, setTimelines] = useState<unknown[]>([]);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const onStartRef = useRef(onStart);
  const selfStateRef = useRef<Partial<RacerState>>({});
  const joinTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // Track start request so we can echo locally
  const activeCountdownRef = useRef(false);

  useEffect(() => { onStartRef.current = onStart; }, [onStart]);

  const teardown = useCallback(() => {
    if (channelRef.current && supabase) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    if (joinTimeoutRef.current) clearTimeout(joinTimeoutRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    setCountdown(null);
  }, []);

  const leave = useCallback(() => {
    teardown();
    setStatus('idle');
    setPlayers([]);
    setCode('');
    setIsHost(false);
    setError('');
    setRoomSize(4);
    setRaceId(null);
    setSelfId(null);
    setTimelines([]);
    activeCountdownRef.current = false;
  }, [teardown]);

  const setupChannel = useCallback((
    roomCode: string, 
    isCreating: boolean, 
    playerInit: Partial<RacerState>
  ) => {
    teardown();
    setError('');
    setStatus('joining');
    setCode(roomCode);
    setRaceId(roomCode);
    
    // We use a random UUID for the connection session ID
    const myId = playerInit.userId || `guest-${Math.random().toString(36).substring(2, 9)}`;
    setSelfId(myId);

    selfStateRef.current = {
      id: myId,
      ...playerInit,
      isHost: isCreating, // Initial assumption, corrected by presence
      progress: 0,
      wpm: 0,
      accuracy: 100,
      keystrokes: 0,
      finished: false,
    };

    setIsHost(isCreating);

    if (!supabase) {
      setError('Database client not initialized');
      setStatus('idle');
      return;
    }

    const channel = supabase.channel(`race_${roomCode}`, {
      config: {
        presence: { key: myId },
      },
    });
    
    channelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        if (joinTimeoutRef.current) clearTimeout(joinTimeoutRef.current);
        
        const mappedPlayers: RacerState[] = [];
        let hostId = myId;
        let oldestJoinTime = Infinity;
        
        for (const key in state) {
          const presences = state[key] as any[];
          if (presences.length > 0) {
            const p = presences[0];
            mappedPlayers.push(p as RacerState);
            
            if (p.joinedAt && p.joinedAt < oldestJoinTime) {
              oldestJoinTime = p.joinedAt;
              hostId = p.id;
            }
          }
        }

        const existingHost = mappedPlayers.find(p => p.isHost);
        let finalHostId = existingHost ? existingHost.id : hostId;
        
        if (!existingHost && myId === finalHostId) {
          selfStateRef.current.isHost = true;
          setIsHost(true);
          channel.track(selfStateRef.current);
        } else {
          setIsHost(myId === finalHostId);
        }

        setStatus((prev) => prev === 'joining' ? 'lobby' : prev);
        
        // Compute ranks
        const finishedPlayers = mappedPlayers.filter(p => p.finished).sort((a, b) => (a.finishMs || 0) - (b.finishMs || 0));
        mappedPlayers.forEach(p => {
          if (p.finished) {
            p.rank = finishedPlayers.findIndex(fp => fp.id === p.id) + 1;
          }
        });

        // if all finished, status finished
        if (mappedPlayers.length > 0 && mappedPlayers.every(p => p.finished)) {
            setStatus('finished');
        }

        setPlayers(mappedPlayers);
      })
      .on('broadcast', { event: 'start_race' }, ({ payload }) => {
        const { text, startTime } = payload;
        setStatus('racing');
        setCountdown(null);
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
        
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
        };
        channel.track(selfStateRef.current);
        onStartRef.current(text, startTime);
      })
      .on('broadcast', { event: 'countdown' }, ({ payload }) => {
        setCountdown(payload.seconds);
      })
      .on('broadcast', { event: 'rematch' }, () => {
        setStatus('lobby');
        setCountdown(null);
      })
      .on('broadcast', { event: 'update_room_size' }, ({ payload }) => {
        if (payload?.roomSize) setRoomSize(payload.roomSize);
      })
      .on('broadcast', { event: 'update_lobby_config' }, ({ payload }) => {
        if (payload?.config) setLobbyConfig(prev => ({ ...prev, ...payload.config }));
      })
      .on('broadcast', { event: 'chat_message' }, ({ payload }) => {
        setChatMessages(prev => {
          if (prev.some(m => m.id === payload.id)) return prev;
          return [...prev, payload];
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            ...selfStateRef.current,
            joinedAt: Date.now()
          });
        }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setError('Failed to connect to multiplayer channel.');
          setStatus('idle');
        }
      });

    joinTimeoutRef.current = setTimeout(() => {
      setError(`Timed out joining room. Is your connection stable?`);
      setStatus('idle');
      teardown();
    }, 15_000);

  }, [teardown]);

  const createRoom = useCallback((name: string, size?: number, _config?: unknown, elo?: number, roomCode?: string, userId?: string, _isRanked?: boolean) => {
    const code = roomCode || makeRoomCode();
    setRoomSize(size || 4);
    setupChannel(code, true, { name: name || 'Racer', userId, elo });
  }, [setupChannel]);

  const joinRoom = useCallback((roomCode: string, name: string, elo?: number, userId?: string, _isRanked?: boolean) => {
    const formattedCode = roomCode.trim().toUpperCase();
    if (!formattedCode) {
      setError('Please enter a room code.');
      return;
    }
    setupChannel(formattedCode, false, { name: name || 'Racer', userId, elo });
  }, [setupChannel]);

  const startRace = useCallback((textOverride?: string) => {
    if (!channelRef.current || !isHost) return;
    
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
        const text = textOverride || generateText(lobbyConfig.mode, lobbyConfig.words, '');
        const startTime = Date.now() + 1000;
        
        channelRef.current?.send({
          type: 'broadcast',
          event: 'start_race',
          payload: { text, startTime }
        });
        
        setStatus('racing');
        setCountdown(null);
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
        };
        channelRef.current?.track(selfStateRef.current);
        onStartRef.current(text, startTime);
      }
    }, 1000);
  }, [isHost, lobbyConfig]);

  const sendProgress = useCallback((progress: number, wpm: number, keystrokes: number = 0, accuracy: number = 100) => {
    if (!channelRef.current) return;
    selfStateRef.current = {
      ...selfStateRef.current,
      progress: Math.round(progress),
      wpm: Math.round(wpm),
      keystrokes,
      accuracy: Math.round(accuracy)
    };
    channelRef.current.track(selfStateRef.current);
  }, []);

  const sendFinish = useCallback((wpm: number, acc: number, timeMs: number, rawWpm: number, consistency: number, heatmap: unknown, errCount: number, backspaceCount: number) => {
    if (!channelRef.current || selfStateRef.current.finished) return;

    selfStateRef.current = {
      ...selfStateRef.current,
      progress: 100,
      finished: true,
      wpm: Math.round(wpm),
      finishWpm: Math.round(wpm),
      accuracy: Math.round(acc),
      finishAcc: Math.round(acc),
      finishMs: timeMs,
      rawWpm,
      consistency,
      heatmapData: heatmap as Record<string, { total: number; errors: number }>,
      errorCount: errCount,
      backspaceCount,
      keystrokes: errCount + backspaceCount,
    };

    channelRef.current.track(selfStateRef.current);
  }, []);

  const updateLobbyConfig = useCallback((newConfig: Partial<RaceConfig>) => {
    setLobbyConfig((prev) => {
      const merged = { ...prev, ...newConfig };
      if (channelRef.current && isHost) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'update_lobby_config',
          payload: { config: newConfig }
        });
      }
      return merged;
    });
  }, [isHost]);

  const updateRoomSize = useCallback((newSize: number) => {
    setRoomSize(newSize);
    if (channelRef.current && isHost) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'update_room_size',
        payload: { roomSize: newSize }
      });
    }
  }, [isHost]);

  const returnToLobby = useCallback(() => {
    if (channelRef.current) {
      if (isHost) {
        channelRef.current.send({ type: 'broadcast', event: 'rematch' });
      }
      setStatus('lobby');
      setCountdown(null);
      selfStateRef.current = {
        ...selfStateRef.current,
        finished: false,
        progress: 0,
        wpm: 0,
      };
      channelRef.current.track(selfStateRef.current);
    }
  }, [isHost]);

  const sendChatMessage = useCallback((text: string, senderName: string) => {
    if (!channelRef.current || !selfId) return;
    const msg: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      sender: senderName,
      senderId: selfId,
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    channelRef.current.send({
      type: 'broadcast',
      event: 'chat_message',
      payload: msg
    });
    // Optimistic local update
    setChatMessages(prev => {
      if (prev.some(m => m.id === msg.id)) return prev;
      return [...prev, msg];
    });
  }, [selfId]);

  useEffect(() => {
    return () => teardown();
  }, [teardown]);

  return {
    status,
    code,
    raceId,
    isHost,
    players,
    chatMessages,
    error,
    countdown,
    roomSize,
    setRoomSize,
    lobbyConfig,
    createRoom,
    joinRoom,
    startRace,
    sendProgress,
    sendFinish,
    returnToLobby,
    rematch: returnToLobby,
    sendChatMessage,
    leave,
    updateLobbyConfig,
    updateRoomSize,
    selfId,
    timelines,
  };
};
