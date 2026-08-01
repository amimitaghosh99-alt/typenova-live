import { useMemo, useState, useEffect, useRef } from 'react';
import { Trophy, LogOut, RotateCcw } from 'lucide-react';
import type { RacerState } from '@/hooks/useRace';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ResultsScreenProps } from '@/components/ResultsScreen';
import { ResultsScreen } from '@/components/ResultsScreen';
import { WpmGraph } from './graphs/WpmGraph';
import { calculatePlayerTitle } from '../utils/playerTitles';
import type { PlayerTitleStats, TitleIntervalRanking } from '../utils/playerTitles';
import type { SetStateAction } from 'react';
import { PostMatchChat } from './PostMatchChat';

interface RaceResultsScreenProps extends ResultsScreenProps {
  players: RacerState[];
  selfId: string;
  roomSize: number;
  timelines?: Record<string, Array<{ t: number; wpm: number }>>;
  isRanked?: boolean;
  supabase?: SupabaseClient | null;
  /** Host-minted id shared by everyone in the room; dedupes duel resolution. */
  raceId?: string | null;
  isHost?: boolean;
  onRematch?: () => void;
  onLeaveRace: () => void;
  onUpdateElo?: (action: SetStateAction<number>) => void;
}

export function RaceResultsScreen({
  players, selfId, roomSize, timelines, isRanked, supabase, raceId, isHost, onRematch, onLeaveRace, onUpdateElo, theme,
  ...resultsProps
}: RaceResultsScreenProps) {
  const ranking = useMemo(() =>
    [...players]
      .filter(p => p.finished)
      .sort((a, b) =>
        (b.finishWpm ?? 0) - (a.finishWpm ?? 0) ||
        (a.finishMs ?? Infinity) - (b.finishMs ?? Infinity)
      ),
    [players]
  );

  const [selectedPlayerId, setSelectedPlayerId] = useState<string>(selfId);

  const myRank = ranking.findIndex(p => p.id === selfId);
  const allFinished = players.length > 0 && players.every(p => p.finished);
  const winner = ranking[0];
  const iWon = allFinished ? winner?.id === selfId : false; // for title logic
  
  const rpcCalled = useRef(false);

  const maxRaceDurationMs = useMemo(() => {
    return Math.max(...players.map(p => p.finishMs ?? 0), resultsProps.durationMs);
  }, [players, resultsProps.durationMs]);

  const [eloTransfer, setEloTransfer] = useState<{ amount: number; direction: 'up' | 'down' } | null>(null);
  const [eloNote, setEloNote] = useState('');
  const [waitExpired, setWaitExpired] = useState(false);

  // Presence drops a disconnected racer out of `players` entirely, so keep the
  // last snapshot we saw. Without it, an opponent who rage-quits mid-race makes
  // the whole ranked result silently no-op — a free escape from losing Elo.
  const opponentRef = useRef<RacerState | null>(null);
  const participantsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const live = players.find(p => p.id !== selfId);
    if (live) opponentRef.current = live;
    players.forEach(p => participantsRef.current.add(p.id));
  }, [players, selfId]);

  const opponentPresent = players.some(p => p.id !== selfId);
  const meFinished = !!players.find(p => p.id === selfId)?.finished;

  // Give a still-connected opponent room to finish; if they've vanished, wait
  // only long enough to rule out a transient presence blip before forfeiting.
  useEffect(() => {
    if (!isRanked || !meFinished || rpcCalled.current) return;
    const t = setTimeout(() => setWaitExpired(true), opponentPresent ? 20000 : 6000);
    return () => clearTimeout(t);
  }, [isRanked, meFinished, opponentPresent]);

  useEffect(() => {
    if (!isRanked || rpcCalled.current) return;
    const me = players.find(p => p.id === selfId);
    const op = players.find(p => p.id !== selfId) ?? opponentRef.current;
    if (!me?.finished || !op) return;
    // Never claim a win just because the opponent hasn't finished *yet* — that
    // let both clients resolve the same duel whenever a finish broadcast was
    // dropped, writing two mirrored rows and showing "+X ELO" to both players.
    if (!op.finished && !waitExpired) return;

    rpcCalled.current = true;

    if (participantsRef.current.size > 2) {
      setEloNote('ELO NOT APPLIED — MORE THAN 2 RACERS');
      return;
    }

    const myUserId = me.userId;
    const myStartElo = me.elo ?? 1000;

    if (!supabase || !myUserId) {
      setEloNote('ELO NOT APPLIED — SIGN IN REQUIRED');
      return;
    }

    const wpmMe = me.finishWpm ?? 0, wpmOp = op.finishWpm ?? 0;
    const msMe = me.finishMs ?? Infinity, msOp = op.finishMs ?? Infinity;
    const iWonNow = !op.finished
      ? true // opponent never finished — forfeit
      : wpmMe !== wpmOp ? wpmMe > wpmOp
      : msMe !== msOp ? msMe < msOp
      : selfId.localeCompare(op.id) < 0; // deterministic tiebreak, same on both clients

    // Read the authoritative rating back instead of guessing a delta: the
    // server's dynamic K-factor and margin multiplier put the real number
    // anywhere between 1 and ~96, so the old hardcoded ±25 was almost always wrong.
    const syncElo = async (attempts: number) => {
      for (let i = 0; i < attempts; i++) {
        const { data } = await supabase.from('profiles').select('elo').eq('id', myUserId).maybeSingle();
        const value = (data as { elo?: number } | null)?.elo;
        if (typeof value === 'number' && value !== myStartElo) {
          onUpdateElo?.(() => value);
          const diff = value - myStartElo;
          setEloTransfer({ amount: Math.abs(diff), direction: diff >= 0 ? 'up' : 'down' });
          return true;
        }
        await new Promise(r => setTimeout(r, 1500));
      }
      return false;
    };

    if (iWonNow) {
      if (!op.userId) {
        setEloNote('ELO NOT APPLIED — OPPONENT NOT SIGNED IN');
        return;
      }
      const baseArgs = {
        p_opponent_id: op.userId,
        p_log: resultsProps.keystrokeLog,
        p_time_ms: me.finishMs || resultsProps.durationMs,
        p_opponent_wpm: op.finishWpm || 0,
      };

      (async () => {
        let { error, data } = await supabase.rpc('resolve_ranked_duel', { ...baseArgs, p_match_key: raceId ?? null });
        // PGRST202 = no function with that signature, i.e. the dedupe migration
        // hasn't been applied yet. Fall back so ranked keeps working (without
        // double-resolution protection) rather than failing outright.
        if (error?.code === 'PGRST202') {
          console.warn('resolve_ranked_duel is missing p_match_key — apply migration 20260728000000_ranked_duel_dedupe.sql');
          ({ error, data } = await supabase.rpc('resolve_ranked_duel', baseArgs));
        }

        if (!error && typeof data === 'number') {
          setEloTransfer({ amount: data, direction: 'up' });
          onUpdateElo?.(prev => prev + data);
          return;
        }
        // Duplicate submission, or a rejected anti-cheat check. Never invent a
        // delta here — take whatever the server actually recorded.
        if (error) console.error('Ranked duel RPC failed:', error.message);
        if (!(await syncElo(4))) setEloNote('ELO UNCHANGED — MATCH NOT COUNTED');
      })();
    } else {
      // The winner's client writes both sides of the transfer; wait for it.
      syncElo(6).then(ok => { if (!ok) setEloNote('ELO SYNC PENDING'); });
    }
  }, [isRanked, players, selfId, supabase, waitExpired, raceId, resultsProps.keystrokeLog, resultsProps.durationMs, onUpdateElo]);

  // ── AWARDS LOGIC ──
  const awards = useMemo(() => {
    if (!allFinished || maxRaceDurationMs === 0) return {} as Record<string, { title: string; emoji: string }>;
    
    // 1. Build Interval Rankings
    const intervals: TitleIntervalRanking[] = [];
    const stepMs = 1000;
    const totalSteps = Math.ceil(maxRaceDurationMs / stepMs);
    
    // Helper to get interpolated WPM for any player at time t
    const getWpmAt = (pId: string, t: number) => {
      let pts = timelines?.[pId];
      if (pId === selfId) pts = resultsProps.timelinePoints;
      if (!pts || pts.length === 0) return 0;
      if (t <= pts[0].t) return pts[0].wpm;
      for (let i = 1; i < pts.length; i++) {
        if (pts[i].t >= t) {
          const a = pts[i - 1], b = pts[i];
          const frac = b.t === a.t ? 0 : (t - a.t) / (b.t - a.t);
          return a.wpm + (b.wpm - a.wpm) * frac;
        }
      }
      return pts[pts.length - 1].wpm;
    };

    for (let i = 0; i <= totalSteps; i++) {
      const t = i * stepMs;
      const snapshot = ranking.map(p => ({
        id: p.id,
        wpm: getWpmAt(p.id, t)
      })).sort((a, b) => b.wpm - a.wpm);
      
      intervals.push({ t, rankings: snapshot.map(s => s.id) });
    }

    // 2. Build PlayerTitleStats array
    const allStats: PlayerTitleStats[] = ranking.map((p, idx) => ({
      id: p.id,
      name: p.name,
      rank: idx + 1,
      wpm: p.finishWpm ?? 0,
      rawWpm: p.rawWpm ?? p.finishWpm ?? 0,
      accuracy: p.finishAcc ?? 0,
      consistency: p.consistency ?? 0,
      rawErrors: p.errorCount ?? 0,
      backspaceCount: p.backspaceCount ?? 0,
    }));

    // 3. Assign titles
    const result: Record<string, { title: string; emoji: string }> = {};
    for (const stats of allStats) {
      result[stats.id] = calculatePlayerTitle(stats, allStats, intervals);
    }
    
    return result;
  }, [allFinished, ranking, resultsProps.timelinePoints, selfId, timelines, maxRaceDurationMs]);

  const medalColors = [
    'text-amber-400 border-amber-500/50 bg-amber-500/10 shadow-[0_0_30px_rgba(245,158,11,0.3)]',   // 1st gold
    'text-zinc-300 border-zinc-400/40 bg-zinc-400/10 shadow-[0_0_20px_rgba(161,161,170,0.2)]',      // 2nd silver
    'text-orange-400 border-orange-500/40 bg-orange-500/10 shadow-[0_0_20px_rgba(251,146,60,0.2)]', // 3rd bronze
    'text-zinc-500 border-zinc-700 bg-zinc-800/50',                                                   // 4th
  ];

  const medalStrokeColors = ['#fbbf24', '#d4d4d8', '#fb923c', '#71717a'];

  const placementText = (rank: number) => {
    if (rank === 0) return '1ST PLACE';
    if (rank === 1) return '2ND PLACE';
    if (rank === 2) return '3RD PLACE';
    return '4TH PLACE';
  };

  // Determine which stats to show based on selectedPlayerId
  const selectedPlayer = ranking.find(p => p.id === selectedPlayerId);
  const isSelfSelected = selectedPlayerId === selfId;

  // Derive custom props if viewing a competitor
  const displayProps = useMemo(() => {
    if (isSelfSelected || !selectedPlayer) return resultsProps;
    return {
      ...resultsProps,
      wpm: selectedPlayer.finishWpm ?? 0,
      accuracy: selectedPlayer.finishAcc ?? 0,
      rawWpm: selectedPlayer.rawWpm ?? selectedPlayer.finishWpm ?? 0,
      consistency: selectedPlayer.consistency ?? 0,
      durationMs: selectedPlayer.finishMs ?? resultsProps.durationMs,
      heatmapData: selectedPlayer.heatmapData ?? {},
      errorTimes: new Array(selectedPlayer.errorCount ?? 0).fill(0), // Fake error times just for the count
    };
  }, [isSelfSelected, selectedPlayer, resultsProps]);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-y-auto">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full opacity-20"
          style={{ background: `radial-gradient(circle, rgb(${theme.glowPrimary}) 0%, transparent 70%)` }}
        />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-8 md:py-12">

        {/* 🏆 WINNER BANNER 🏆 */}
        <div className="text-center mb-10 animate-in fade-in zoom-in-50 duration-700 relative">
          
          {isRanked && !eloTransfer && eloNote && (
            <div className="flex items-center justify-center mb-8 h-16">
              <div className="text-xs font-black tracking-widest uppercase text-zinc-500 border border-zinc-800 bg-zinc-900/50 rounded-full px-5 py-3">
                {eloNote}
              </div>
            </div>
          )}

          {/* Fluid Elo Transfer Animation */}
          {isRanked && eloTransfer && (
            <div className="flex items-center justify-center pointer-events-none mb-8 h-16">
              <div className={`transition-all duration-1000 ease-[cubic-bezier(0.32,0.72,0,1)] ${eloTransfer ? 'opacity-100 translate-y-0 scale-125' : 'opacity-0 translate-y-8 scale-50'}`}>
                {eloTransfer && (
                  <div className={`text-5xl font-black tracking-widest uppercase drop-shadow-2xl ${eloTransfer.direction === 'up' ? 'text-emerald-400 drop-shadow-[0_0_20px_rgba(52,211,153,0.5)]' : 'text-red-500 drop-shadow-[0_0_20px_rgba(239,68,68,0.5)]'}`}>
                    {eloTransfer.direction === 'up' ? '+' : '-'}{eloTransfer.amount} ELO
                  </div>
                )}
              </div>
            </div>
          )}

          <Trophy
            size={64}
            className={`mx-auto mb-4 ${iWon ? 'text-amber-400 drop-shadow-[0_0_30px_rgba(245,158,11,0.6)]' : 'text-zinc-400'}`}
          />
          <h1 className={`text-4xl md:text-6xl font-black tracking-widest uppercase mb-3 ${
            iWon
              ? 'text-amber-400 drop-shadow-[0_0_40px_rgba(245,158,11,0.5)]'
              : 'text-white'
          }`}>
            {!allFinished ? 'WAITING FOR OTHERS...' : winner ? `${winner.name} WINS!` : 'RACE OVER'}
          </h1>
          {myRank >= 0 && (
            <p className={`text-xl font-black tracking-[0.3em] uppercase ${
              !allFinished ? 'text-zinc-500' : myRank === 0 ? 'text-amber-400' : myRank === 1 ? 'text-zinc-300' : myRank === 2 ? 'text-orange-400' : 'text-zinc-500'
            }`}>
              {!allFinished ? 'RESULTS PENDING' : iWon ? '🏆 YOU WIN!' : `${placementText(myRank)}`}
            </p>
          )}
        </div>

        {/* ── GRAPH (TOP SECTION) ──────────────────────── */}
        <div className="mb-12 animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: '300ms' }}>
          <WpmGraph
            timelinePoints={resultsProps.timelinePoints}
            competitorTimelines={timelines}
            players={ranking}
            selfId={selfId}
            errorTimes={resultsProps.errorTimes}
            durationMs={maxRaceDurationMs}
            theme={theme}
          />
        </div>

        {/* ── INTERACTIVE SUMMARY CARDS ──────────────────────── */}
        <div className="flex flex-wrap justify-center gap-4 mb-12">
          {ranking.map((player, idx) => {
            const isSelf = player.id === selfId;
            const isSelected = player.id === selectedPlayerId;
            const isWinner = idx === 0 && allFinished;
            const colorClass = medalColors[idx] || medalColors[3];
            const strokeColor = medalStrokeColors[idx] || medalStrokeColors[3];
            const award = awards[player.id];

            return (
              <button
                key={player.id}
                onClick={() => setSelectedPlayerId(player.id)}
                className={`relative overflow-hidden group text-left px-6 py-4 rounded-3xl transition-all duration-300 glass-panel ${
                  isWinner ? 'scale-105 saturate-150 shadow-2xl z-20' :
                  isSelected ? 'scale-100 shadow-xl opacity-100 z-10' :
                  'scale-95 opacity-50 hover:opacity-80 grayscale-[0.5] z-0'
                }`}
                style={
                  isWinner ? { boxShadow: `0 0 30px ${medalStrokeColors[0]}60`, borderColor: medalStrokeColors[0] } :
                  isSelected ? { boxShadow: `0 0 15px ${strokeColor}40`, borderColor: strokeColor } : {}
                }
              >
                {isSelected && (
                  <div className="absolute inset-0 opacity-10" style={{ backgroundColor: strokeColor }}></div>
                )}
                {isWinner && (
                  <div className="absolute inset-0 animate-pulse pointer-events-none border-2 border-amber-400/30 rounded-3xl" style={{ boxShadow: 'inset 0 0 20px rgba(251,191,36,0.1)' }}></div>
                )}
                <div className="relative z-10 flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{isWinner ? '👑' : ['🥇', '🥈', '🥉', '4th'][idx] || '·'}</span>
                    <span className={`font-black tracking-widest uppercase ${isSelected || isWinner ? 'text-white' : 'text-zinc-400'}`}>
                      {player.name}
                    </span>
                    {isSelf && (
                      <span className="ml-1 text-[8px] font-black tracking-widest px-1.5 py-0.5 rounded-full bg-white/10 border border-white/20">YOU</span>
                    )}
                  </div>
                  <div className="flex justify-between items-baseline mt-2">
                    <span className={`text-2xl font-black ${isSelected ? colorClass.split(' ')[0] : 'text-white'}`}>
                      {player.finishWpm ?? 0} <span className="text-xs text-zinc-500">WPM</span>
                    </span>
                  </div>
                  {award && award.title && (
                    <div className="mt-2 flex items-center gap-1.5 text-[9px] font-black tracking-widest px-2.5 py-1.5 rounded-md border border-white/10 bg-white/5 uppercase text-amber-200/80 w-fit">
                      <span className="text-sm">{award.emoji}</span>
                      <span>{award.title}</span>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* ── SELECTED PLAYER DETAILED STATS ─────────────────────────── */}
        <div className="border-t border-zinc-800/50 pt-10 pb-8 animate-in fade-in slide-in-from-bottom-8">
          <h2 className="text-center text-zinc-500 text-[11px] font-black tracking-[0.4em] uppercase mb-8">
            {isSelfSelected ? 'YOUR DETAILED STATS' : `${selectedPlayer?.name}'S DETAILED STATS`}
          </h2>
          <ResultsScreen
            {...displayProps}
            theme={theme}
            competitorTimelines={undefined}
            compact
          />
        </div>

        {/* ── POST-MATCH CHAT ────────────────────────────── */}
        <div className="border-t border-zinc-800/50 pt-8 pb-4 animate-in fade-in slide-in-from-bottom-8">
          <PostMatchChat
            supabase={supabase || null}
            lobbyId={raceId || 'vs-race-lobby'}
            username={players.find(p => p.id === selfId)?.name || 'Typist'}
            selfId={selfId}
            players={players}
          />
        </div>

        {/* ── RACE ACTIONS ────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-center gap-4 mt-6 pb-12 font-mono">
          {isHost ? (
            <button
              onClick={onRematch}
              className="flex items-center gap-2.5 px-8 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-teal-400 text-slate-950 font-black tracking-wider text-sm shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:scale-105 active:scale-100 transition-all cursor-pointer"
            >
              <RotateCcw size={18} /> REMATCH
            </button>
          ) : (
            <button
              disabled
              className="flex items-center gap-2.5 px-8 py-4 rounded-2xl bg-slate-900/80 border border-white/15 text-zinc-400 font-bold tracking-wider text-sm cursor-not-allowed opacity-80 animate-pulse"
            >
              <RotateCcw size={18} /> WAITING FOR HOST…
            </button>
          )}

          <button
            onClick={onLeaveRace}
            className="flex items-center gap-2.5 px-8 py-4 glass-panel rounded-2xl text-zinc-300 font-bold tracking-wider text-sm hover:text-white hover:bg-white/10 transition-all border border-transparent hover:border-white/10"
          >
            <LogOut size={16} /> LEAVE ROOM
          </button>
        </div>
      </div>
    </div>
  );
}

