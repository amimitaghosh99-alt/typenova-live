import { useMemo, useState, useEffect, useRef } from 'react';
import { Trophy, LogOut, ArrowLeft } from 'lucide-react';
import type { RacerState } from '@/hooks/useRace';
import { compareRacers } from '@/hooks/useRace';

import type { SupabaseClient } from '@supabase/supabase-js';
import type { ResultsScreenProps } from '@/components/ResultsScreen';
import { ResultsScreen } from '@/components/ResultsScreen';
import { RaceChart, type RaceSeries } from './race/RaceChart';
import { assignRaceStyles } from './race/raceColors';
import { MarkerSwatch } from './race/RaceMarkerGlyph';
import { useRaceDetailSync } from '@/hooks/useRaceDetailSync';
import { calculatePlayerTitle } from '../utils/playerTitles';
import type { PlayerTitleStats, TitleIntervalRanking } from '../utils/playerTitles';
import type { SetStateAction } from 'react';
import { PostMatchChat } from './PostMatchChat';

interface RaceResultsScreenProps extends ResultsScreenProps {
  players: RacerState[];
  selfId: string;
  timelines?: Record<string, Array<{ t: number; wpm: number }>>;
  isRanked?: boolean;
  supabase?: SupabaseClient | null;
  /** Host-minted id shared by everyone in the room; dedupes duel resolution. */
  raceId?: string | null;
  isHost?: boolean;
  /**
   * Re-ask a racer to broadcast their finish payload.
   *
   * Needed because `finish_details` is an unacknowledged broadcast: without a
   * way to ask again, one dropped frame left that racer's curve missing from
   * the graph and their stats panel empty for the rest of the screen's life.
   */
  onRequestDetails?: (id: string) => void;
  onRematch?: () => void;
  onReturnToRoom?: () => void;
  onLeaveRace?: () => void;
  onUpdateElo?: (action: SetStateAction<number>) => void;
  /** Fired once when this client is confirmed the winner of a resolved race. */
  onRaceWon?: () => void;
  chatMessages: import('../hooks/useRace').ChatMessage[];
  onSendMessage: (text: string) => void;
}

export function RaceResultsScreen({
  theme,
  players,
  selfId,
  timelines,
  isRanked,
  supabase,
  raceId,
  isHost,
  onRequestDetails,
  onRematch,
  onReturnToRoom,
  onLeaveRace,
  onUpdateElo,
  onRaceWon,
  chatMessages,
  onSendMessage,
  ...resultsProps
}: RaceResultsScreenProps) {
  // Presence deletes a racer the moment their tab closes, which used to wipe
  // their card — and their result — off this screen mid-celebration. Keep an
  // additive snapshot of everyone who was ever in the race instead.
  const rosterRef = useRef<Map<string, RacerState>>(new Map());
  const roster = useMemo(() => {
    const map = rosterRef.current;
    for (const p of players) {
      const prev = map.get(p.id);
      // A late presence frame must never blank out a finish payload we already have.
      map.set(p.id, prev?.finished && !p.finished ? { ...p, ...prev } : { ...prev, ...p });
    }
    return [...map.values()];
  }, [players]);

  // Ordered with the shared comparator so the podium here always agrees with
  // the live race HUD and the ranked-duel resolution.
  const ranking = useMemo(() => roster.filter(p => p.finished).sort(compareRacers), [roster]);
  const unfinished = useMemo(() => roster.filter(p => !p.finished), [roster]);

  const [selectedPlayerId, setSelectedPlayerId] = useState<string>(selfId);
  const fallbackLobbyId = useMemo(() => crypto.randomUUID(), []);

  /**
   * Stable colour + marker shape per racer, shared by the chart, the cards and
   * the legend.
   *
   * Keyed off roster order rather than ranking: ranking is not settled until
   * everyone finishes, so colours used to change hue underneath the reader as
   * later results landed, and everyone past 4th collapsed into the same grey.
   */
  const raceStyles = useMemo(
    () => assignRaceStyles(roster.map(p => p.id), selfId),
    [roster, selfId],
  );

  /** Which racers we actually hold a usable curve for. */
  const resolvedDetailIds = useMemo(() => {
    const set = new Set<string>();
    for (const [id, pts] of Object.entries(timelines ?? {})) {
      if (pts && pts.length > 1) set.add(id);
    }
    // Our own curve comes down the props, not the wire.
    if (resultsProps.timelinePoints && resultsProps.timelinePoints.length > 1) set.add(selfId);
    return set;
  }, [timelines, resultsProps.timelinePoints, selfId]);

  /* Chases the payloads that never arrived. Presence tells us a racer finished;
     only the broadcast carries the curve, and that broadcast is not replayed. */
  const detailSync = useRaceDetailSync({
    racers: roster,
    resolvedIds: resolvedDetailIds,
    requestDetails: onRequestDetails,
    selfId,
  });


  // A racer who quits or stalls used to freeze this screen on "WAITING FOR
  // OTHERS..." forever: no podium, no awards, no medals. Resolve after a grace
  // window and mark the stragglers DNF.
  const [graceExpired, setGraceExpired] = useState(false);
  const everyoneIn = roster.length > 0 && unfinished.length === 0;
  useEffect(() => {
    if (everyoneIn) return;
    const t = setTimeout(() => setGraceExpired(true), 25000);
    return () => clearTimeout(t);
  }, [everyoneIn]);

  const myRank = ranking.findIndex(p => p.id === selfId);
  const allFinished = everyoneIn || graceExpired;
  const winner = ranking[0];
  const iWon = allFinished ? winner?.id === selfId : false; // for title logic

  // Credit the win exactly once, and only for a race with a real opponent.
  // Nothing incremented a win counter before this, which is why the
  // "Race Champion" title and the races_won quests were unreachable.
  const winCredited = useRef(false);
  useEffect(() => {
    if (!iWon || winCredited.current || roster.length < 2) return;
    winCredited.current = true;
    onRaceWon?.();
  }, [iWon, roster.length, onRaceWon]);


  const rpcCalled = useRef(false);
  const eloSyncDone = useRef(false);

  const maxRaceDurationMs = useMemo(() => {
    return Math.min(Math.max(...roster.map(p => p.finishMs ?? 0), resultsProps.durationMs), 300000);
  }, [roster, resultsProps.durationMs]);


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
    let isMounted = true;
    if (!isRanked || eloSyncDone.current) return;
    const me = players.find(p => p.id === selfId);
    const op = players.find(p => p.id !== selfId) ?? opponentRef.current;
    if (!me?.finished || !op) return;
    // Never claim a win just because the opponent hasn't finished *yet* — that
    // let both clients resolve the same duel whenever a finish broadcast was
    // dropped, writing two mirrored rows and showing "+X ELO" to both players.
    if (!op.finished && !waitExpired) return;

    if (participantsRef.current.size > 2) {
      rpcCalled.current = true;
      setEloNote('ELO NOT APPLIED — MORE THAN 2 RACERS');
      return;
    }

    const myUserId = me.userId;
    const myStartElo = me.elo ?? 1000;

    if (!supabase || !myUserId) {
      // Do NOT set rpcCalled here — supabase/userId may arrive on a later
      // render cycle. Locking the flag now would permanently block Elo (C3).
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
        if (!isMounted) return false;
        try {
          const { data } = await supabase.from('profiles').select('elo').eq('id', myUserId).maybeSingle();
          const value = (data as { elo?: number } | null)?.elo;
          if (typeof value === 'number' && value !== myStartElo) {
            if (isMounted) {
              onUpdateElo?.(() => value);
              const diff = value - myStartElo;
              setEloTransfer({ amount: Math.abs(diff), direction: diff >= 0 ? 'up' : 'down' });
            }
            eloSyncDone.current = true;
            return true;
          }
        } catch (err) {
          // A dropped poll is not the end of the loop — the rating is being
          // written by the other client and the next attempt may well see it.
          // Left unguarded this rejected out of the loop entirely, and since
          // nobody handles the returned promise it surfaced as an unhandled
          // rejection with no "sync pending" note shown.
          console.warn('[race] elo poll failed:', err);
        }
        await new Promise(r => setTimeout(r, 1500));
      }
      return false;
    };

    if (rpcCalled.current) {
      // We already launched the RPC or decided we are the loser. Resume polling if needed.
      syncElo(6).then(
        ok => { if (!ok && isMounted && !eloSyncDone.current) setEloNote('ELO SYNC PENDING'); },
        err => { console.warn('[race] elo sync failed:', err); if (isMounted) setEloNote('ELO SYNC PENDING'); },
      );
      return;
    }

    rpcCalled.current = true;

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
        try {
          let { error, data } = await supabase.rpc('resolve_ranked_duel', { ...baseArgs, p_match_key: raceId ?? null });
          // PGRST202 = no function with that signature, i.e. the dedupe migration
          // hasn't been applied yet. Fall back so ranked keeps working (without
          // double-resolution protection) rather than failing outright.
          if (error?.code === 'PGRST202') {
            console.warn('resolve_ranked_duel is missing p_match_key — apply migration 20260728000000_ranked_duel_dedupe.sql');
            ({ error, data } = await supabase.rpc('resolve_ranked_duel', baseArgs));
          }

          if (!error && typeof data === 'number') {
            if (isMounted) {
              setEloTransfer({ amount: data, direction: 'up' });
              onUpdateElo?.(prev => prev + data);
            }
            return;
          }
          // Duplicate submission, or a rejected anti-cheat check. Never invent a
          // delta here — take whatever the server actually recorded.
          if (error) console.error('Ranked duel RPC failed:', error.message);
          if (!(await syncElo(4)) && isMounted) setEloNote('ELO UNCHANGED — MATCH NOT COUNTED');
        } catch (err) {
          // The RPC itself can reject (connection dropped between finishing and
          // resolving). Poll for the rating instead of leaving the screen with
          // no verdict and an unhandled rejection behind it.
          console.error('Ranked duel RPC rejected:', err);
          if (!(await syncElo(4)) && isMounted) setEloNote('ELO SYNC PENDING');
        }
      })();
    } else {
      // The winner's client writes both sides of the transfer; wait for it.
      syncElo(6).then(
        ok => { if (!ok && isMounted) setEloNote('ELO SYNC PENDING'); },
        err => { console.warn('[race] elo sync failed:', err); if (isMounted) setEloNote('ELO SYNC PENDING'); },
      );
    }

    return () => {
      isMounted = false;
    };
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
  /** Sync state of the racer whose panel is open, if their details are absent. */
  const selectedSync = detailSync.get(selectedPlayerId);

  // Derive custom props if viewing a competitor. Everything here now comes from
  // that racer's own broadcast payload — the panel used to show their headline
  // numbers on top of MY graph, MY keystroke log and a zero-filled error array.
  const displayProps = useMemo(() => {
    if (isSelfSelected || !selectedPlayer) return resultsProps;
    const timeline = selectedPlayer.timeline ?? [];
    return {
      ...resultsProps,
      wpm: selectedPlayer.finishWpm ?? 0,
      accuracy: selectedPlayer.finishAcc ?? 0,
      rawWpm: selectedPlayer.rawWpm ?? selectedPlayer.finishWpm ?? 0,
      consistency: selectedPlayer.consistency ?? 0,
      durationMs: selectedPlayer.finishMs ?? resultsProps.durationMs,
      heatmapData: selectedPlayer.heatmapData ?? {},
      // Only the net curve travels over the wire, so the raw line mirrors it.
      timelinePoints: timeline.map(p => ({ t: p.t, wpm: p.wpm, rawWpm: p.wpm })),
      errorTimes: selectedPlayer.errorTimes ?? [],
      // Their raw keystrokes are never broadcast: drop anything derived from
      // them (replay, per-key weakness) instead of showing mine as theirs.
      keystrokeLog: [],
      testStartTime: 0,
      displayName: selectedPlayer.name,
      saveStatus: '',
      leveledUp: false,
      xpGainedLast: 0,
      flawlessStreak: 0,
      ghostTimeline: null,
      ghostLabel: '',
      ghostDeltaS: undefined,
    };
  }, [isSelfSelected, selectedPlayer, resultsProps]);

  /**
   * One series per racer, on the shared colour scale.
   *
   * Self's curve comes from props while everyone else's comes off the wire, but
   * both are normalised to the same shape here so the chart has no notion of
   * "self vs competitors" — the split is exactly what made the old graph return
   * `null` for the whole race whenever our own timeline was short.
   */
  const chartSeries = useMemo<RaceSeries[]>(() => {
    return roster.map(p => {
      const isSelf = p.id === selfId;
      const raw = isSelf
        ? (resultsProps.timelinePoints ?? []).map(pt => ({ t: pt.t, wpm: pt.wpm }))
        : (timelines?.[p.id] ?? p.timeline ?? []);
      const style = raceStyles.get(p.id);
      return {
        id: p.id,
        name: p.name,
        isSelf,
        color: style?.color ?? '#94a3b8',
        marker: style?.marker ?? { shape: 'circle' as const, filled: false },
        // Defensive sort: a payload reassembled from two broadcasts can arrive
        // out of order, and the interpolator assumes ascending time.
        points: [...raw].sort((a, b) => a.t - b.t),
        finishMs: p.finished ? p.finishMs : undefined,
      };
    });
  }, [roster, selfId, timelines, resultsProps.timelinePoints, raceStyles]);

  /** Racers on the cards but not on the chart, so the gap is stated not hidden. */
  const missingFromChart = useMemo(
    () => chartSeries.filter(s => s.points.length < 2),
    [chartSeries],
  );

  const [chartMetric, setChartMetric] = useState<'wpm' | 'gap'>('wpm');

  /**
   * "Vs You" only means something when our own curve arrived and there is
   * someone to compare against. Derived rather than synced into state: forcing
   * the toggle back from an effect would re-render the chart a second time, and
   * would briefly label opponents' raw WPM as a delta from a baseline we do not
   * have.
   */
  const canCompare = useMemo(() => {
    const drawn = chartSeries.filter(s => s.points.length > 1);
    return drawn.length > 1 && drawn.some(s => s.isSelf);
  }, [chartSeries]);
  const effectiveMetric = canCompare ? chartMetric : 'wpm';


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
          <h1 className={`text-4xl md:text-6xl font-black tracking-widest uppercase mb-3 ${iWon
            ? 'text-amber-400 drop-shadow-[0_0_40px_rgba(245,158,11,0.5)]'
            : 'text-white'
            }`}>
            {!allFinished ? 'WAITING FOR OTHERS...' : winner ? `${winner.name} WINS!` : 'RACE OVER'}
          </h1>
          {myRank >= 0 && (
            <p className={`text-xl font-black tracking-[0.3em] uppercase ${!allFinished ? 'text-zinc-500' : myRank === 0 ? 'text-amber-400' : myRank === 1 ? 'text-zinc-300' : myRank === 2 ? 'text-orange-400' : 'text-zinc-500'
              }`}>
              {!allFinished ? 'RESULTS PENDING' : iWon ? '🏆 YOU WIN!' : `${placementText(myRank)}`}
            </p>
          )}
        </div>

        {/* ── RACE CHART ──────────────────────── */}
        <div className="mb-12 animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: '300ms' }}>
          <div className="glass-panel rounded-3xl p-4 md:p-5">
            {/* Header: legend + metric toggle */}
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                {chartSeries.map(s => (
                  <span key={s.id} className="flex items-center gap-1.5">
                    {/* Shape + colour, matching the markers on this racer's
                        curve. Dimmed for a racer with no curve, so the legend
                        never promises a line that is not drawn. */}
                    <MarkerSwatch
                      marker={s.marker}
                      color={s.color}
                      size={11}
                      dimmed={s.points.length <= 1}
                    />
                    <span className={`font-mono text-[9px] font-black uppercase tracking-[0.16em] ${s.points.length > 1 ? 'text-white/60' : 'text-white/25'}`}>
                      {s.isSelf ? 'You' : s.name}
                    </span>
                  </span>
                ))}
              </div>

              {/* Only offered when our own curve is present to compare against. */}
              {canCompare && (
                <div className="flex items-center gap-1 rounded-full border border-white/10 bg-black/30 p-0.5">
                  {(['wpm', 'gap'] as const).map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setChartMetric(m)}
                      aria-pressed={chartMetric === m}
                      className={`rounded-full px-3 py-1 font-mono text-[9px] font-black uppercase tracking-[0.16em] transition-colors ${chartMetric === m ? 'bg-white/15 text-white' : 'text-white/35 hover:text-white/60'
                        }`}
                    >
                      {m === 'wpm' ? 'WPM' : 'Vs You'}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <RaceChart
              series={chartSeries}
              durationMs={maxRaceDurationMs}
              metric={effectiveMetric}
              baselineId={selfId}
            />

            {/* States the hole rather than silently dropping the racer. */}
            {missingFromChart.length > 0 && (
              <p className="mt-2 font-mono text-[9px] uppercase leading-relaxed tracking-[0.14em] text-white/30">
                No pace data for{' '}
                {missingFromChart.map((s, i) => (
                  <span key={s.id}>
                    {i > 0 && ', '}
                    <span className="text-white/50">{s.isSelf ? 'you' : s.name}</span>
                    {detailSync.get(s.id) === 'syncing' && <span className="text-sky-300/70"> · syncing</span>}
                    {detailSync.get(s.id) === 'missing' && <span className="text-white/25"> · unavailable</span>}
                  </span>
                ))}
              </p>
            )}
          </div>
        </div>

        {/* ── INTERACTIVE SUMMARY CARDS ──────────────────────── */}
        <div className="flex flex-wrap justify-center gap-4 mb-12">
          {/* Stragglers/disconnects are listed as DNF instead of vanishing. */}
          {[...ranking, ...unfinished].map((player, idx) => {
            const isDnf = !player.finished;
            const isSelf = player.id === selfId;
            const isSelected = !isDnf && player.id === selectedPlayerId;
            const isWinner = idx === 0 && allFinished && !isDnf;

            const colorClass = medalColors[idx] || medalColors[3];
            const strokeColor = medalStrokeColors[idx] || medalStrokeColors[3];
            const award = awards[player.id];
            /* Same hue + shape as this racer's line, so a card can be tied back
               to the chart above it. Kept separate from the medal colours, which
               encode placement rather than identity. */
            const seriesStyle = raceStyles.get(player.id);
            const sync = detailSync.get(player.id);

            return (
              <button
                key={player.id}
                onClick={() => { if (!isDnf) setSelectedPlayerId(player.id); }}
                disabled={isDnf}

                className={`relative overflow-hidden group text-left px-6 py-4 rounded-3xl transition-all duration-300 glass-panel ${isWinner ? 'scale-105 saturate-150 shadow-2xl z-20' :
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
                    <span className="text-xl">{isDnf ? '⌛' : isWinner ? '👑' : ['🥇', '🥈', '🥉', '4th'][idx] || '·'}</span>

                    {/* Identity swatch: ties this card to its line on the chart. */}
                    {seriesStyle && (
                      <MarkerSwatch marker={seriesStyle.marker} color={seriesStyle.color} size={11} />
                    )}
                    <span className={`font-black tracking-widest uppercase ${isSelected || isWinner ? 'text-white' : 'text-zinc-400'}`}>
                      {player.name}
                    </span>
                    {isSelf && (
                      <span className="ml-1 text-[8px] font-black tracking-widest px-1.5 py-0.5 rounded-full bg-white/10 border border-white/20">YOU</span>
                    )}
                  </div>
                  <div className="flex justify-between items-baseline mt-2">
                    <span className={`text-2xl font-black ${isSelected ? colorClass.split(' ')[0] : 'text-white'}`}>
                      {isDnf ? 'DNF' : (player.finishWpm ?? 0)} <span className="text-xs text-zinc-500">{isDnf ? 'NO RESULT' : 'WPM'}</span>
                    </span>
                  </div>
                  {/* Detail-sync state, so a card whose panel will be thin says so
                      up front instead of opening onto an empty graph. */}
                  {sync && (
                    <div className={`mt-1 flex items-center gap-1.5 text-[8px] font-black uppercase tracking-[0.16em] ${sync === 'syncing' ? 'text-sky-300/70' : 'text-zinc-500'
                      }`}>
                      {sync === 'syncing' && <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-sky-300/70 fx-pulse" />}
                      <span>{sync === 'syncing' ? 'Syncing details' : 'Details unavailable'}</span>
                    </div>
                  )}
                  {!isDnf && award?.title && (

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
            {isSelfSelected ? 'YOUR DETAILED STATS' : `${selectedPlayer?.name || 'PLAYER'}'S DETAILED STATS`}
          </h2>
          {/* Says why the panel below is thin. Without this a racer whose
              broadcast never landed rendered as a full stats layout with an
              empty graph and a zeroed heatmap, which reads as a bug rather
              than as missing data. */}
          {selectedSync && (
            <p className="mx-auto mb-6 w-fit rounded-full border border-white/10 bg-white/5 px-4 py-2 text-center font-mono text-[9px] font-black uppercase tracking-[0.18em]">
              {selectedSync === 'syncing' ? (
                <span className="flex items-center gap-2 text-sky-300/80">
                  <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-sky-300/80 fx-pulse" />
                  Requesting this racer&apos;s details
                </span>
              ) : (
                <span className="text-zinc-500">
                  This racer&apos;s details never arrived — headline numbers only
                </span>
              )}
            </p>
          )}
          <ResultsScreen
            {...displayProps}
            theme={theme}
            compact
            /* The race screen owns the navigation. Without this the embedded
               panel also rendered NEXT TEST / drill buttons that quietly tore
               the room down mid-results. */
            hideActions
          />

        </div>

        {/* ── POST-MATCH CHAT ────────────────────────────── */}
        <div className="border-t border-zinc-800/50 pt-8 pb-4 animate-in fade-in slide-in-from-bottom-8">
          <PostMatchChat
            lobbyId={raceId || fallbackLobbyId}
            username={players.find(p => p.id === selfId)?.name || 'Typist'}
            selfId={selfId}
            players={players}
            chatMessages={chatMessages}
            onSendMessage={onSendMessage}
          />
        </div>

        {/* ── RACE ACTIONS ────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-center gap-4 mt-6 pb-12 font-mono">
          {isHost ? (
            <button
              onClick={() => (onReturnToRoom || onRematch)?.()}
              className="flex items-center gap-2.5 px-8 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-teal-400 text-slate-950 font-black tracking-wider text-sm shadow-[0_0_25px_rgba(6,182,212,0.5)] hover:scale-105 active:scale-100 transition-all cursor-pointer"
            >
              <ArrowLeft size={18} className="stroke-[2.5]" />
              <span>RETURN TO ROOM</span>
              <span className="text-[10px] opacity-75 font-bold uppercase tracking-normal bg-black/20 px-2 py-0.5 rounded-full">(PULLS ALL PLAYERS)</span>
            </button>
          ) : (
            <button
              onClick={() => (onReturnToRoom || onRematch)?.()}
              className="flex items-center gap-2.5 px-8 py-4 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 font-black tracking-wider text-sm shadow-[0_0_20px_rgba(6,182,212,0.25)] hover:bg-cyan-500/30 hover:scale-105 active:scale-100 transition-all cursor-pointer"
            >
              <ArrowLeft size={18} className="stroke-[2.5]" />
              <span>BACK TO ROOM LOBBY</span>
            </button>
          )}

          <button
            onClick={onLeaveRace}
            className="flex items-center gap-2.5 px-6 py-4 glass-panel rounded-2xl text-zinc-400 font-bold tracking-wider text-sm hover:text-rose-400 hover:border-rose-500/30 hover:bg-rose-500/10 transition-all border border-white/5"
            title="Leave room and return to solo practice"
          >
            <LogOut size={16} />
            <span>LEAVE ROOM</span>
          </button>
        </div>
      </div>
    </div>
  );
}

