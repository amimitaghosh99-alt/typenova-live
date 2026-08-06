import React, { useState, useEffect, useRef } from 'react';
import { X, Users, Copy, Check, Play, Crown, Flag, LogOut, Swords, Link, Activity, Target } from 'lucide-react';
import { generateText, type Theme, type Level, type CodeLanguage } from '@/data/constants';
import type { RacerState, RaceStatus, RaceConfig } from '@/hooks/useRace';
import type { SupabaseClient } from '@supabase/supabase-js';
import { useMatchmaking } from '@/hooks/useMatchmaking';
import { SegmentedControl } from '@/components/SegmentedControl';

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
  lobbyConfig, updateLobbyConfig,
  onCreate, onJoin, onStart, onLeave, onClose, initialCode,
  elo, username, supabase = null
}: RaceModalProps) => {
  const [name, setName] = useState(username || '');
  const [joinCode, setJoinCode] = useState(initialCode || '');
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [selectedSize, setSelectedSize] = useState<2 | 3 | 4>(2);
  const [tab, setTab] = useState<'private' | 'ranked'>('private');
  const [isClosing, setIsClosing] = useState(false);

  const mm = useMatchmaking(supabase, selfId, username || name || 'GUEST', elo);
  const { status: mmStatus, roomCode: mmRoomCode, isHost: mmIsHost } = mm.state;
  const { cancel: mmCancel, clearMatch: mmClearMatch } = mm;

  const joinedMatchRef = useRef<string | null>(null);
  const joinAttemptRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copyCodeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copyLinkTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoStartedRef = useRef(false);
  const onStartRef = useRef(onStart);
  const [noShowFor, setNoShowFor] = useState<string | null>(null);

  useEffect(() => { onStartRef.current = onStart; });

  /** Reset per-match refs so the player can queue for another ranked match. */
  const resetMatchState = () => {
    joinedMatchRef.current = null;
    autoStartedRef.current = false;
    joinAttemptRef.current = 0;
    setNoShowFor(null);
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  };

  /** Leave wrapper — resets per-match state so a rematch/requeue works. */
  const handleLeave = () => {
    resetMatchState();
    onLeave();
  };

  const handleClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    closeTimeoutRef.current = setTimeout(() => {
      mmCancel();
      resetMatchState();
      onClose();
    }, 180);
  };

  // Auto-join when a match is found
  useEffect(() => {
    if (mmStatus !== 'found' || !mmRoomCode) return;
    if (joinedMatchRef.current === mmRoomCode) return;
    joinedMatchRef.current = mmRoomCode;
    joinAttemptRef.current = 0;

    if (mmIsHost) {
      onCreate(username || name || 'GUEST', 2, true, mmRoomCode);
    } else {
      joinWithRetry(mmRoomCode);
    }
    mmClearMatch();
  }, [mmStatus, mmRoomCode, mmIsHost, mmClearMatch, onJoin, username, name]);

  const statusRef = useRef(status);
  useEffect(() => { statusRef.current = status; }, [status]);

  // Clean up timers on unmount (BUG-21, BUG-22)
  useEffect(() => {
    return () => {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
      if (copyCodeTimeoutRef.current) clearTimeout(copyCodeTimeoutRef.current);
      if (copyLinkTimeoutRef.current) clearTimeout(copyLinkTimeoutRef.current);
    };
  }, []);

  /**
   * Guest side of a ranked match: the host emits `create_lobby` over Socket.io
   * at roughly the same moment the guest receives the match-found broadcast.
   * The socket room may not exist yet, so retry a few times with a short
   * backoff instead of failing immediately with "Room not found".
   */
  function joinWithRetry(code: string) {
    const attempt = () => {
      joinAttemptRef.current += 1;
      onJoin(code, username || name || 'GUEST', true);
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

  useEffect(() => {
    if (tab !== 'ranked' && mmStatus === 'searching') mmCancel();
  }, [tab, mmStatus, mmCancel]);

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

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    if (copyCodeTimeoutRef.current) clearTimeout(copyCodeTimeoutRef.current);
    copyCodeTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
  };

  const copyLink = () => {
    const url = `${window.location.origin}${window.location.pathname}?room=${code}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    if (copyLinkTimeoutRef.current) clearTimeout(copyLinkTimeoutRef.current);
    copyLinkTimeoutRef.current = setTimeout(() => setCopiedLink(false), 2000);
  };

  const canAct = username || name.trim().length > 0;

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

  return (
    <div
      className={`fixed inset-0 z-[500] flex items-center justify-center bg-black/80 p-4 overflow-y-auto transition-opacity duration-200 ${isClosing ? 'opacity-0' : 'opacity-100'
        }`}
      onClick={handleClose}
    >
      <div
        className={`glass-panel relative w-full max-w-lg max-h-[90vh] my-auto flex flex-col rounded-2xl border border-white/15 bg-slate-950/70 shadow-2xl shadow-cyan-950/30 overflow-hidden p-5 sm:p-6 min-h-0 font-mono ${isClosing ? 'lucid-scale-exit' : 'lucid-scale'
          }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle Ambient Glow */}
        <div className="absolute -top-32 -left-32 w-80 h-80 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex justify-between items-center mb-4 pb-3.5 border-b border-white/10 shrink-0 relative z-10">
          <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center border border-cyan-500/30 bg-cyan-500/10 shadow-[0_0_12px_rgba(6,182,212,0.15)]">
              <Swords className="text-cyan-400" size={16} />
            </div>
            {status === 'lobby' || status === 'racing' ? 'Race Room' : 'Multiplayer'}
          </h2>
          <button
            onClick={handleClose}
            className="p-1.5 bg-white/5 hover:bg-white/15 border border-white/10 text-zinc-400 hover:text-white rounded-full transition-all hover:rotate-90"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="mb-4 px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono font-semibold text-center animate-in fade-in">
            {error.toUpperCase()}
          </div>
        )}

        {/* ── IDLE / JOINING: Create or Join ─────────────────────── */}
        {(status === 'idle' || status === 'joining') && (
          <div className="flex flex-col gap-4 relative z-10">
            {/* Tabs */}
            <div className="flex bg-slate-900/60 p-1 rounded-xl border border-white/10 font-mono">
              <button
                onClick={() => setTab('private')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${tab === 'private'
                  ? 'bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.15)]'
                  : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
                  }`}
              >
                PRIVATE ROOM
              </button>
              <button
                onClick={() => setTab('ranked')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${tab === 'ranked'
                  ? 'bg-purple-500/15 border border-purple-500/30 text-purple-300 shadow-[0_0_12px_rgba(168,85,247,0.15)]'
                  : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
                  }`}
              >
                <Target size={13} /> RANKED 1V1
              </button>
            </div>

            {tab === 'private' && (
              <div className="flex flex-col gap-4">
                {!username && (
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => e.stopPropagation()}
                    placeholder="YOUR DISPLAY NAME…"
                    maxLength={12}
                    className="w-full bg-slate-900/60 border border-white/15 rounded-xl px-4 py-3 text-xs font-mono text-white placeholder:text-zinc-500 focus:outline-none focus:border-cyan-500/40 transition-colors"
                  />
                )}

                {/* Room Size Selector */}
                <div className="flex flex-col gap-1.5 items-center">
                  <span className="text-zinc-400 text-[10px] font-bold tracking-wider">ROOM CAPACITY</span>
                  <div className="flex bg-slate-900/60 p-1 rounded-xl border border-white/10 gap-1 font-mono">
                    {[2, 3, 4].map((size) => (
                      <button
                        key={size}
                        onClick={() => setSelectedSize(size as 2 | 3 | 4)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${selectedSize === size
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                          : 'text-zinc-400 hover:text-zinc-200'
                          }`}
                      >
                        {size} PLAYERS
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => canAct && onCreate(name.trim(), selectedSize)}
                  disabled={!canAct || status === 'joining'}
                  className={`w-full py-3 rounded-xl font-bold text-xs tracking-wider border transition-all flex items-center justify-center gap-2 ${canAct
                    ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/25 shadow-[0_0_15px_rgba(6,182,212,0.2)] hover:scale-[1.02]'
                    : 'bg-slate-900/40 border-white/5 text-zinc-600 cursor-not-allowed'
                    }`}
                >
                  <Users size={15} /> CREATE PRIVATE ROOM
                </button>

                <div className="flex items-center gap-3 text-zinc-500 text-[10px] font-bold tracking-widest my-1">
                  <div className="flex-1 h-px bg-white/10" /> OR JOIN EXISTING <div className="flex-1 h-px bg-white/10" />
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.stopPropagation()}
                    placeholder="CODE"
                    maxLength={6}
                    className="w-32 bg-slate-900/60 border border-white/15 rounded-xl px-3 py-2.5 text-center text-sm font-bold tracking-[0.2em] text-white uppercase placeholder:text-zinc-500 focus:outline-none focus:border-cyan-500/40"
                  />
                  <button
                    onClick={() => canAct && joinCode.trim().length >= 5 && onJoin(joinCode, name.trim())}
                    disabled={!canAct || joinCode.trim().length < 5 || status === 'joining'}
                    className={`flex-1 py-2.5 rounded-xl font-bold text-xs tracking-wider border transition-all ${canAct && joinCode.trim().length >= 5
                      ? 'bg-slate-900/80 border-cyan-500/30 text-cyan-300 hover:bg-slate-800'
                      : 'bg-slate-900/40 border-white/5 text-zinc-600 cursor-not-allowed'
                      }`}
                  >
                    {status === 'joining' ? 'JOINING…' : 'JOIN ROOM'}
                  </button>
                </div>
              </div>
            )}

            {tab === 'ranked' && (
              <div className="flex flex-col gap-4">
                <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-6 flex flex-col items-center text-center relative overflow-hidden">
                  <div className="relative z-10 flex flex-col items-center">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-3 ${mm.state.status === 'searching'
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 animate-pulse'
                      : 'bg-slate-800 text-zinc-400'
                      }`}>
                      <Activity size={24} />
                    </div>

                    <h3 className="text-base font-bold text-white tracking-tight mb-1">
                      {mm.state.status === 'searching' ? 'Searching for Match…' : 'Ranked 1v1 Queue'}
                    </h3>

                    <p className="text-xs text-zinc-400 mb-5">
                      Your ELO Rating: <span className="text-purple-300 font-bold">{elo}</span>
                    </p>

                    {mm.state.status === 'idle' && (
                      <button
                        onClick={() => username ? mm.search() : alert('Log in to play Ranked Mode.')}
                        className="px-8 py-3 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-300 text-xs font-bold tracking-wider hover:bg-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.2)] transition-all hover:scale-105"
                      >
                        FIND RANKED MATCH
                      </button>
                    )}

                    {mm.state.status === 'searching' && (
                      <button
                        onClick={mm.cancel}
                        className="px-6 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold transition-all hover:bg-rose-500/20"
                      >
                        CANCEL SEARCH
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
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

        {/* ── LOBBY ──────────────────────────────────────────────── */}
        {status === 'lobby' && !isRankedRoom && (
          <div className="flex flex-col gap-4 relative z-10">
            {/* Room Code Display */}
            <div className="flex items-center justify-center gap-2 bg-slate-900/60 p-3 rounded-xl border border-white/10">
              <span className="text-2xl sm:text-3xl font-extrabold text-cyan-300 tracking-[0.3em] pl-2 font-mono">
                {code}
              </span>
              <button
                onClick={copyCode}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 text-zinc-300 hover:text-white transition-all ml-2"
                title="Copy code"
              >
                {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
              </button>
              <button
                onClick={copyLink}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 text-zinc-300 hover:text-white transition-all flex items-center gap-1.5"
                title="Copy link"
              >
                {copiedLink ? <Check size={16} className="text-emerald-400" /> : <Link size={16} />}
                <span className="text-[10px] font-bold hidden sm:inline">LINK</span>
              </button>
            </div>

            {/* Lobby Config */}
            {lobbyConfig && updateLobbyConfig && (
              <div className={`flex flex-col gap-2.5 ${!isHost ? 'pointer-events-none opacity-80' : ''}`}>
                <p className="text-center text-zinc-400 text-[10px] font-bold tracking-wider uppercase">
                  {isHost ? 'RACE CONFIGURATION' : "HOST'S CONFIGURATION"}
                </p>

                {/* Difficulty Selector */}
                <div className="flex justify-center bg-slate-900/60 p-1 rounded-xl border border-white/10">
                  <SegmentedControl
                    options={(['NOVICE', 'ADEPT', 'MASTER', 'QUOTES', 'CODE'] as Level[]).map((l) => ({ label: l, value: l }))}
                    value={lobbyConfig.mode}
                    onChange={(v) => updateLobbyConfig({ mode: v })}
                    themeTextClass={theme.text}
                  />
                </div>

                {/* Length Selector */}
                <div className={`flex justify-center bg-slate-900/60 p-1 rounded-xl border border-white/10 transition-opacity ${lobbyConfig.mode === 'QUOTES' ? 'opacity-30 pointer-events-none' : 'opacity-100'
                  }`}>
                  <SegmentedControl
                    options={[10, 25, 50, 100].map((v) => ({ label: String(v), value: v }))}
                    value={lobbyConfig.words}
                    onChange={(v) => updateLobbyConfig({ words: v })}
                    themeTextClass={theme.text}
                  />
                </div>

                {/* Language (Conditional) */}
                {lobbyConfig.mode === 'CODE' && (
                  <div className="flex justify-center bg-slate-900/60 p-1 rounded-xl border border-white/10">
                    <SegmentedControl
                      options={(['JavaScript/TypeScript', 'Python', 'Rust', 'C++', 'CSS', 'HTML', 'SQL', 'Go'] as CodeLanguage[]).map((lang) => ({
                        label: lang.split('/')[0].toUpperCase(),
                        value: lang,
                      }))}
                      value={lobbyConfig.language || 'JavaScript/TypeScript'}
                      onChange={(v) => updateLobbyConfig({ language: v })}
                      themeTextClass={theme.text}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Players List */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center px-1 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                <span>PLAYERS IN ROOM</span>
                <span className="text-cyan-300">{players.length} / {roomSize}</span>
              </div>

              <div className="flex flex-col gap-2 max-h-52 overflow-y-auto pr-1 custom-scrollbar">
                {players.map((p) => (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between px-4 py-2.5 rounded-xl border font-mono transition-all ${p.id === selfId
                      ? 'bg-cyan-500/10 border-cyan-500/30 text-white'
                      : 'bg-slate-900/50 border-white/10 text-zinc-200'
                      }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300 text-xs font-bold uppercase">
                        {p.name.substring(0, 1)}
                      </div>
                      <span className="text-xs font-bold tracking-wide flex items-center gap-1.5">
                        {p.isHost && <Crown size={13} className="text-amber-400" />}
                        {p.name}
                        {p.id === selfId && <span className="text-[9px] text-cyan-400 font-bold">(YOU)</span>}
                      </span>
                    </div>

                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
                      READY
                    </span>
                  </div>
                ))}

                {/* Empty Slots */}
                {Array.from({ length: Math.max(0, roomSize - players.length) }).map((_, i) => (
                  <div
                    key={`empty-${i}`}
                    className="flex items-center justify-between px-4 py-2.5 rounded-xl border border-dashed border-white/10 bg-slate-900/20 text-zinc-500 font-mono"
                  >
                    <span className="text-xs font-bold animate-pulse">WAITING FOR RACER…</span>
                    <span className="text-[10px] font-bold text-zinc-600">EMPTY</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            {isHost ? (
              <button
                onClick={() => {
                  if (!lobbyConfig) return;
                  const text = generateText(lobbyConfig.mode, lobbyConfig.words, '', false, { codeLanguage: lobbyConfig.language });
                  onStart(text);
                }}
                disabled={players.length < 2}
                className={`w-full py-3 rounded-xl font-bold text-xs tracking-wider border transition-all flex items-center justify-center gap-2 ${players.length >= 2
                  ? 'bg-gradient-to-r from-cyan-500 to-teal-400 text-slate-950 font-black border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:scale-[1.02] active:scale-100'
                  : 'bg-slate-900/40 border-white/5 text-zinc-600 cursor-not-allowed'
                  }`}
              >
                <Play size={16} fill="currentColor" />
                {players.length >= 2 ? 'START RACE NOW' : 'NEED 2+ PLAYERS TO START'}
              </button>
            ) : (
              <p className="text-center text-zinc-400 text-xs font-bold tracking-wider animate-pulse py-2">
                WAITING FOR HOST TO START…
              </p>
            )}

            <button
              onClick={handleLeave}
              className="w-full py-2.5 rounded-xl text-xs font-bold text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/30 transition-all flex items-center justify-center gap-2"
            >
              <LogOut size={14} /> LEAVE ROOM
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
    </div>
  );
});
