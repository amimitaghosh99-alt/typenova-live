import React, { useState, useEffect, useRef } from 'react';
import { X, Flag, LogOut, Swords } from 'lucide-react';
import { generateText, type Theme, type Level } from '@/data/constants';
import type { RacerState, RaceStatus, RaceConfig } from '@/hooks/useRace';
import type { SupabaseClient } from '@supabase/supabase-js';
import { useMatchmaking } from '@/hooks/useMatchmaking';
import { LobbyScreen } from '@/components/LobbyScreen';

const RANKED_MODE: Level = 'ADEPT';
const RANKED_WORDS = 25;
const RANKED_REVEAL_MS = 2000;
const RANKED_NO_SHOW_MS = 15000;

interface RaceModalProps {
  status: RaceStatus;
  code: string;
  isHost: boolean;
  isRankedRoom?: boolean;
  players: RacerState[];
  error: string;
  selfId: string;
  theme: Theme;
  roomSize: number;
  countdown?: number | null;
  lobbyConfig?: RaceConfig;
  updateLobbyConfig?: (config: Partial<RaceConfig>) => void;
  updateRoomSize?: (size: number) => void;
  chatMessages?: import('@/hooks/useRace').ChatMessage[];
  sendChatMessage?: (text: string, senderName: string) => void;
  onCreate: (name: string, size: number, isRanked?: boolean, roomCode?: string) => void;
  onJoin: (code: string, name: string, isRanked?: boolean) => void;
  onStart: (text: string) => void;
  onLeave: () => void;
  onClose: () => void;
  initialCode?: string;
  elo: number;
  username: string;
  supabase?: SupabaseClient | null;
}

export const RaceModal = React.memo(({
  status, code, isHost, isRankedRoom, players, error, selfId, theme, roomSize,
  lobbyConfig, updateLobbyConfig, updateRoomSize, chatMessages, sendChatMessage,
  onCreate, onJoin, onStart, onLeave, onClose, initialCode: _initialCode,
  elo, username, supabase = null
}: RaceModalProps) => {
  const [isClosing, setIsClosing] = useState(false);

  const mm = useMatchmaking(supabase, selfId, username || 'GUEST', elo);
  const { status: mmStatus, roomCode: mmRoomCode, isHost: mmIsHost } = mm.state;
  const { clearMatch: mmClearMatch } = mm;

  const joinedMatchRef = useRef<string | null>(null);
  const joinAttemptRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoStartedRef = useRef(false);
  const onStartRef = useRef(onStart);
  const [noShowFor, setNoShowFor] = useState<string | null>(null);

  useEffect(() => { onStartRef.current = onStart; });

  const resetMatchState = () => {
    joinedMatchRef.current = null;
    autoStartedRef.current = false;
    joinAttemptRef.current = 0;
    setNoShowFor(null);
  };

  const handleClose = () => {
    setIsClosing(true);
    closeTimeoutRef.current = setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 200);
  };

  const handleLeave = () => {
    if (isRankedRoom) {
      resetMatchState();
    }
    onLeave();
  };

  // Matchmaking: when match found, transition into the room
  useEffect(() => {
    if (mmStatus !== 'found' || !mmRoomCode) return;
    if (joinedMatchRef.current === mmRoomCode) return;
    joinedMatchRef.current = mmRoomCode;

    if (mmIsHost) {
      onCreate(username || 'GUEST', 2, true, mmRoomCode);
    } else {
      joinWithRetry(mmRoomCode);
    }
    mmClearMatch();
  }, [mmStatus, mmRoomCode, mmIsHost, mmClearMatch, onJoin, username]);

  const statusRef = useRef(status);
  useEffect(() => { statusRef.current = status; }, [status]);

  // Clean up timers on unmount (BUG-21, BUG-22)
  useEffect(() => {
    return () => {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, []);

  /**
   * Guest side of a ranked match: the host emits `create_lobby` over Socket.io
   * at roughly the same moment the guest receives the match-found broadcast.
   * The socket room may not exist yet, so retry a few times with a short
   * backoff instead of failing immediately with "Room not found".
   */
  function joinWithRetry(roomCodeToJoin: string) {
    const attempt = () => {
      joinAttemptRef.current += 1;
      onJoin(roomCodeToJoin, username || 'GUEST', true);
    };
    attempt();
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    retryTimerRef.current = setTimeout(() => {
      // Read from ref to avoid stale closure over `status`
      const currentStatus = statusRef.current;
      if (currentStatus === 'idle' || currentStatus === 'joining') {
        if (joinAttemptRef.current < 5) {
          attempt();
        }
      }
    }, 1200);
  }

  const me = players.find(p => p.id === selfId);
  const rival = players.find(p => p.id !== selfId);
  const bothPresent = !!me && !!rival;

  // Ranked auto-start
  useEffect(() => {
    if (!isRankedRoom || status !== 'lobby' || !isHost || !bothPresent) return;
    if (autoStartedRef.current) return;
    const t = setTimeout(() => {
      autoStartedRef.current = true;
      onStartRef.current(generateText(RANKED_MODE, RANKED_WORDS, '', false));
    }, RANKED_REVEAL_MS);
    return () => clearTimeout(t);
  }, [isRankedRoom, status, isHost, bothPresent]);

  useEffect(() => {
    if (!isRankedRoom || status !== 'lobby' || bothPresent) return;
    const t = setTimeout(() => setNoShowFor(code), RANKED_NO_SHOW_MS);
    return () => clearTimeout(t);
  }, [isRankedRoom, status, bothPresent, code]);

  const noShow = noShowFor === code && !bothPresent;

  const rankedCard = (p: RacerState | undefined, isSelf: boolean) => (
    <div className={`flex-1 p-4 rounded-xl border font-mono flex flex-col items-center justify-center text-center transition-all ${p ? (isSelf ? 'bg-cyan-500/10 border-cyan-500/30' : 'bg-purple-500/10 border-purple-500/30') : 'bg-slate-900/40 border-white/10'
      }`}>
      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
        {p ? p.name : 'SEARCHING…'}
      </span>
      <span className={`text-2xl font-extrabold ${p ? (isSelf ? 'text-cyan-300' : 'text-purple-300') : 'text-zinc-600'}`}>
        {p ? (p.elo ?? 1000) : '····'}
      </span>
      <span className="text-[9px] font-bold text-zinc-500 tracking-wider">ELO</span>
      {isSelf && (
        <span className="mt-1 text-[8px] font-extrabold tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">YOU</span>
      )}
    </div>
  );

  const ranking = [...players]
    .filter(p => p.finished)
    .sort((a, b) => (b.finishWpm ?? 0) - (a.finishWpm ?? 0) || (a.finishMs ?? Infinity) - (b.finishMs ?? Infinity));
  const unfinished = players.filter(p => !p.finished);

  const isLobby = (status === 'lobby' || status === 'joining') && !isRankedRoom;

  return (
    <div
      className={`fixed inset-0 z-40 flex flex-col bg-black/40 backdrop-blur-xl overflow-y-auto transition-opacity duration-200 ${isClosing ? 'opacity-0' : 'opacity-100'}`}
      onClick={handleClose}
    >
      <div
        className={`w-full min-h-screen flex flex-col ${isClosing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'} transition-all duration-300 relative z-10 pt-20 pb-10 px-4 sm:px-8 md:px-12 max-w-7xl mx-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle Ambient Glow */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* ── LOBBY ──────────────────────────────────────────────── */}
        {isLobby && (
          <LobbyScreen 
            code={code} 
            players={players} 
            roomSize={roomSize} 
            selfId={selfId}
            isHost={isHost}
            lobbyConfig={lobbyConfig}
            updateLobbyConfig={updateLobbyConfig}
            updateRoomSize={updateRoomSize}
            chatMessages={chatMessages}
            sendChatMessage={sendChatMessage}
            onStart={() => {
              if (!lobbyConfig) {
                onStart(generateText('ADEPT', 25));
                return;
              }
              const text = generateText(lobbyConfig.mode, lobbyConfig.words, '', false, { codeLanguage: lobbyConfig.language });
              onStart(text);
            }}
            onLeave={onLeave}
            theme={theme}
            themeTextClass={theme.text}
            isJoining={status === 'joining'}
          />
        )}

        {/* ── LOBBY / JOINING / RACING / RESULTS ──────────────────── */}
        {!isLobby && (
          <div className="w-full max-w-lg mx-auto bg-slate-950/70 backdrop-blur-md p-6 sm:p-8 rounded-3xl border border-white/10 shadow-2xl relative z-10 font-mono mt-12">
            {/* Header */}
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/10 shrink-0">
              <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center border border-cyan-500/30 bg-cyan-500/10 shadow-[0_0_15px_rgba(6,182,212,0.15)]">
                  <Swords className="text-cyan-400" size={20} />
                </div>
                {status === 'joining' ? 'Creating Room...' : status === 'racing' || status === 'finished' ? 'Race Room' : 'Multiplayer'}
              </h2>
              <button
                onClick={handleClose}
                className="p-2 bg-white/5 hover:bg-white/15 border border-white/10 text-zinc-400 hover:text-white rounded-full transition-all hover:rotate-90"
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>

            {error && (
              <div className="mb-6 px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono font-bold text-center animate-in fade-in">
                {error.toUpperCase()}
              </div>
            )}

            {status === 'joining' && (
              <div className="flex flex-col items-center justify-center py-12 gap-4">
                <div className="w-12 h-12 border-4 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin" />
                <p className="text-cyan-400 font-bold tracking-widest text-xs uppercase animate-pulse">Establishing connection...</p>
              </div>
            )}

        {/* ── RANKED VS REVEAL ───────────────────────────────────── */}
        {status === 'lobby' && isRankedRoom && (
          <div className="flex flex-col gap-4 relative z-10">
            <div className="text-center">
              <p className="text-[10px] font-bold tracking-wider uppercase text-zinc-400 mb-1">
                {noShow ? 'Opponent never arrived' : bothPresent ? 'Match found!' : 'Securing match…'}
              </p>
              <p className="text-xs font-bold text-purple-300">
                {RANKED_MODE} Mode · {RANKED_WORDS} Words
              </p>
            </div>

            <div className="flex items-stretch gap-3">
              {rankedCard(me, true)}
              <div className="flex items-center justify-center">
                <span className="text-base font-extrabold text-zinc-500">VS</span>
              </div>
              {rankedCard(rival, false)}
            </div>

            <p className={`text-center text-[10px] font-bold tracking-wider uppercase py-1 ${noShow ? 'text-rose-400' : 'text-zinc-400 animate-pulse'}`}>
              {noShow ? 'Match abandoned — no ELO lost' : bothPresent ? 'Race starting…' : 'Waiting for opponent…'}
            </p>

            <button
              onClick={handleLeave}
              className="w-full py-2.5 rounded-xl text-xs font-bold text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/30 transition-all flex items-center justify-center gap-2"
            >
              <LogOut size={14} /> {noShow ? 'LEAVE' : 'FORFEIT & LEAVE'}
            </button>
          </div>
        )}

        {/* ── RESULTS ────────────────────────────────────────────── */}
        {status === 'finished' && (
          <div className="flex flex-col gap-3 relative z-10">
            <div className="flex items-center justify-center gap-2 text-white font-bold text-sm uppercase mb-1">
              <Flag size={16} className="text-cyan-400" /> Final Race Results
            </div>

            {ranking.map((p, idx) => (
              <div
                key={p.id}
                className={`flex items-center justify-between px-4 py-3 rounded-xl border ${p.id === selfId ? 'bg-cyan-500/10 border-cyan-500/30 text-white' : 'bg-slate-900/50 border-white/10 text-zinc-200'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`font-extrabold text-xl ${idx === 0 ? 'text-amber-400' : 'text-zinc-500'}`}>
                    #{idx + 1}
                  </span>
                  <span className="font-bold text-xs tracking-wide text-white">
                    {p.name}{p.id === selfId ? ' (YOU)' : ''}
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="font-extrabold text-lg text-cyan-300">{p.finishWpm} WPM</span>
                  <span className="text-[10px] text-zinc-400">
                    {p.finishAcc}% · {((p.finishMs ?? 0) / 1000).toFixed(1)}s
                  </span>
                </div>
              </div>
            ))}

            {unfinished.length > 0 && (
              <p className="text-center text-zinc-500 text-[10px] font-bold">
                {unfinished.map((p) => p.name).join(', ')} did not finish
              </p>
            )}

            <button
              onClick={handleLeave}
              className="w-full py-3 rounded-xl font-bold text-xs tracking-wider bg-slate-900/80 border border-white/15 text-zinc-300 hover:text-white hover:bg-slate-800 transition-all mt-2"
            >
              LEAVE ROOM
            </button>
          </div>
        )}

        {/* ── RACING (modal opened mid-race) ─────────────────────── */}
        {status === 'racing' && (
          <p className="text-center text-zinc-400 text-xs font-bold tracking-wider py-6 animate-pulse">
            RACE IN PROGRESS — FOCUS ON TYPING!
          </p>
        )}
          </div>
        )}
      </div>
    </div>
  );
});
