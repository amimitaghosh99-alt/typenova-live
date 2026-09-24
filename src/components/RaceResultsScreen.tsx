import { useMemo, useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Trophy, LogOut, ArrowLeft, Crown, Clock, Zap, Shield, Sparkles,
  Flame, AlertTriangle, Delete, Anchor, WifiOff, Timer, Crosshair, Flag, Activity,
  Medal, RotateCcw, TrendingUp, TrendingDown,
} from 'lucide-react';
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
import type { PlayerTitleStats, TitleIntervalRanking, CalculatedTitle } from '../utils/playerTitles';
import type { SetStateAction } from 'react';
import { PostMatchChat } from './PostMatchChat';
import { useAudioEngine } from '@/hooks/useAudioEngine';

interface EloTier {
  name: string;
  min: number;
  max: number;
  color: string;
  glow: string;
}

const ELO_TIERS: EloTier[] = [
  { name: 'GRANDMASTER', min: 2100, max: 9999, color: '#f43f5e', glow: 'rgba(244, 63, 94, 0.4)' },
  { name: 'MASTER', min: 1900, max: 2099, color: '#a855f7', glow: 'rgba(168, 85, 247, 0.4)' },
  { name: 'DIAMOND', min: 1700, max: 1899, color: '#38bdf8', glow: 'rgba(56, 189, 248, 0.4)' },
  { name: 'PLATINUM', min: 1500, max: 1699, color: '#2dd4bf', glow: 'rgba(45, 212, 191, 0.4)' },
  { name: 'GOLD', min: 1300, max: 1499, color: '#f59e0b', glow: 'rgba(245, 158, 11, 0.4)' },
  { name: 'SILVER', min: 1100, max: 1299, color: '#94a3b8', glow: 'rgba(148, 163, 184, 0.4)' },
  { name: 'BRONZE', min: 0, max: 1099, color: '#d97706', glow: 'rgba(217, 119, 6, 0.4)' },
];

function getEloTier(elo: number): { tier: EloTier; progressPct: number; currentInTier: number; tierSpan: number } {
  const current = ELO_TIERS.find(t => elo >= t.min) || ELO_TIERS[ELO_TIERS.length - 1];
  const span = current.max - current.min + 1;
  const inTier = Math.max(0, elo - current.min);
  const pct = Math.min(100, Math.round((inTier / span) * 100));
  return { tier: current, progressPct: pct, currentInTier: inTier, tierSpan: span };
}

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

function renderTitleIcon(iconKey?: string) {
  switch (iconKey) {
    case 'alert-triangle': return <AlertTriangle size={12} className="text-amber-400 shrink-0" />;
    case 'sparkles': return <Sparkles size={12} className="text-cyan-400 shrink-0" />;
    case 'delete': return <Delete size={12} className="text-zinc-400 shrink-0" />;
    case 'shield': return <Shield size={12} className="text-emerald-400 shrink-0" />;
    case 'anchor': return <Anchor size={12} className="text-blue-400 shrink-0" />;
    case 'flame': return <Flame size={12} className="text-rose-400 shrink-0" />;
    case 'zap': return <Zap size={12} className="text-amber-400 shrink-0" />;
    case 'activity': return <Activity size={12} className="text-pink-400 shrink-0" />;
    case 'wifi-off': return <WifiOff size={12} className="text-zinc-500 shrink-0" />;
    case 'timer': return <Timer size={12} className="text-cyan-400 shrink-0" />;
    case 'crosshair': return <Crosshair size={12} className="text-emerald-400 shrink-0" />;
    case 'flag':
    default: return <Flag size={12} className="text-zinc-400 shrink-0" />;
  }
}

function renderRankBadge(idx: number, isWinner: boolean, isDnf: boolean) {
  if (isDnf) return <span title="DNF" className="inline-flex shrink-0"><Clock size={15} className="text-zinc-500 shrink-0" /></span>;
  if (isWinner || idx === 0) return <span title="Winner" className="inline-flex shrink-0"><Crown size={16} className="text-amber-400 shrink-0" /></span>;
  if (idx === 1) return <span className="font-mono text-xs font-black text-zinc-300 bg-white/10 px-1.5 py-0.5 rounded shrink-0">#2</span>;
  if (idx === 2) return <span className="font-mono text-xs font-black text-amber-600/90 bg-white/10 px-1.5 py-0.5 rounded shrink-0">#3</span>;
  return <span className="font-mono text-xs font-black text-zinc-500 bg-white/5 px-1.5 py-0.5 rounded shrink-0">#{idx + 1}</span>;
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
  const [hasVotedRematch, setHasVotedRematch] = useState(false);

  const { playSound } = useAudioEngine();
  const audioPlayedRef = useRef<{ elo?: boolean; win?: boolean }>({});

  useEffect(() => {
    if (eloTransfer && !audioPlayedRef.current.elo) {
      audioPlayedRef.current.elo = true;
      if (eloTransfer.direction === 'up') {
        playSound('levelup');
      } else {
        playSound('error');
      }
    }
  }, [eloTransfer, playSound]);

  useEffect(() => {
    if (iWon && !audioPlayedRef.current.win) {
      audioPlayedRef.current.win = true;
      playSound('achievement');
    }
  }, [iWon, playSound]);

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
          // match_key is mandatory — use raceId or generate a fallback UUID
          const matchKey = raceId || crypto.randomUUID();
          const { error, data } = await supabase.rpc('resolve_ranked_duel', { ...baseArgs, p_match_key: matchKey });

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
    if (!allFinished || maxRaceDurationMs === 0) return {} as Record<string, CalculatedTitle>;

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
    const result: Record<string, CalculatedTitle> = {};
    for (const stats of allStats) {
      result[stats.id] = calculatePlayerTitle(stats, allStats, intervals);
    }

    return result;
  }, [allFinished, ranking, resultsProps.timelinePoints, selfId, timelines, maxRaceDurationMs]);

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

  const myPlayer = roster.find(p => p.id === selfId);
  const myBaseElo = myPlayer?.elo ?? 1000;
  const finalElo = eloTransfer
    ? (eloTransfer.direction === 'up' ? myBaseElo + eloTransfer.amount : Math.max(0, myBaseElo - eloTransfer.amount))
    : myBaseElo;
  const tierInfo = getEloTier(finalElo);

  const renderPodiumPillar = (player: RacerState | undefined, rankIdx: number, tierType: 'gold' | 'silver' | 'bronze') => {
    if (!player) return null;
    const isFirst = tierType === 'gold';
    const isSecond = tierType === 'silver';
    const isSelected = player.id === selectedPlayerId;
    const isMe = player.id === selfId;
    const award = awards[player.id];
    const seriesStyle = raceStyles.get(player.id);

    const deltaWpm = (rankIdx > 0 && ranking[0]?.finishWpm)
      ? Math.max(0, (ranking[0].finishWpm ?? 0) - (player.finishWpm ?? 0))
      : 0;

    const tierConfig = {
      gold: {
        label: '1ST // CHAMPION',
        pillarHeight: 'h-48 sm:h-60',
        borderColor: isSelected ? 'border-amber-300' : 'border-amber-500/45',
        shadow: isSelected ? 'shadow-[0_0_35px_rgba(245,158,11,0.55)]' : 'shadow-[0_0_20px_rgba(245,158,11,0.2)]',
        bg: 'bg-gradient-to-b from-amber-500/20 via-amber-950/40 to-black/90',
        badgeBg: 'bg-amber-400 text-slate-950',
        textColor: 'text-amber-300',
        avatarBorder: 'border-amber-400/80 shadow-[0_0_20px_rgba(245,158,11,0.4)]',
        numeral: '1',
        delay: 0.35,
      },
      silver: {
        label: '2ND // RUNNER UP',
        pillarHeight: 'h-36 sm:h-44',
        borderColor: isSelected ? 'border-slate-200' : 'border-slate-400/40',
        shadow: isSelected ? 'shadow-[0_0_25px_rgba(203,213,225,0.45)]' : 'shadow-[0_0_15px_rgba(203,213,225,0.15)]',
        bg: 'bg-gradient-to-b from-slate-400/15 via-slate-900/40 to-black/90',
        badgeBg: 'bg-slate-300 text-slate-950',
        textColor: 'text-slate-200',
        avatarBorder: 'border-slate-300/80 shadow-[0_0_15px_rgba(203,213,225,0.3)]',
        numeral: '2',
        delay: 0.2,
      },
      bronze: {
        label: '3RD // PODIUM',
        pillarHeight: 'h-28 sm:h-32',
        borderColor: isSelected ? 'border-amber-600' : 'border-amber-700/40',
        shadow: isSelected ? 'shadow-[0_0_20px_rgba(180,83,9,0.45)]' : 'shadow-[0_0_12px_rgba(180,83,9,0.15)]',
        bg: 'bg-gradient-to-b from-amber-700/15 via-stone-900/40 to-black/90',
        badgeBg: 'bg-amber-700 text-amber-100',
        textColor: 'text-amber-200',
        avatarBorder: 'border-amber-700/80 shadow-[0_0_12px_rgba(180,83,9,0.3)]',
        numeral: '3',
        delay: 0.1,
      },
    }[tierType];

    return (
      <motion.div
        key={player.id}
        initial={{ opacity: 0, y: 60, scale: 0.92 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: tierConfig.delay, type: 'spring', stiffness: 240, damping: 22 }}
        onClick={() => setSelectedPlayerId(player.id)}
        className={`flex-1 max-w-[240px] flex flex-col items-center justify-end cursor-pointer group transition-all relative ${
          isSelected ? 'z-20 scale-105' : 'z-10 hover:scale-[1.02]'
        }`}
      >
        {/* Light Beam for Gold Winner */}
        {isFirst && (
          <div className="absolute top-8 bottom-0 w-3/4 bg-gradient-to-t from-amber-400/25 via-amber-400/5 to-transparent blur-md pointer-events-none -z-10" />
        )}

        {/* Floating Top Aura: Crown / Medal + Avatar */}
        <div className="flex flex-col items-center gap-1.5 mb-2.5 relative">
          {isFirst ? (
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
              className="p-1 rounded-full bg-amber-500/20 border border-amber-400/50 shadow-[0_0_18px_rgba(245,158,11,0.6)]"
            >
              <Crown size={22} className="text-amber-300" />
            </motion.div>
          ) : isSecond ? (
            <div className="p-1 rounded-full bg-slate-400/15 border border-slate-300/40">
              <Medal size={18} className="text-slate-300" />
            </div>
          ) : (
            <div className="p-1 rounded-full bg-amber-700/15 border border-amber-700/40">
              <Medal size={16} className="text-amber-600" />
            </div>
          )}

          {/* Avatar Squircle */}
          <div
            className={`w-14 sm:w-16 h-14 sm:h-16 rounded-2xl border-2 flex items-center justify-center font-black text-xl sm:text-2xl shadow-2xl transition-all relative bg-slate-900 ${tierConfig.avatarBorder}`}
            style={{ color: isFirst ? '#fef08a' : isSecond ? '#f1f5f9' : '#fed7aa' }}
          >
            {player.name.charAt(0).toUpperCase()}
            {isMe && (
              <span className="absolute -bottom-1.5 text-[8px] font-mono font-black px-1.5 py-0.2 rounded-full bg-white/15 border border-white/30 text-white backdrop-blur-md shadow-md">
                YOU
              </span>
            )}
          </div>

          {/* Name & Headline Speed */}
          <div className="flex flex-col items-center text-center mt-1">
            <div className="flex items-center gap-1.5">
              {seriesStyle && <MarkerSwatch marker={seriesStyle.marker} color={seriesStyle.color} size={10} />}
              <span className="font-mono text-xs font-black text-white tracking-wider max-w-[120px] truncate">
                {player.name}
              </span>
            </div>

            <div className="flex items-baseline gap-1 mt-0.5">
              <span className={`text-2xl sm:text-3xl font-black font-mono ${tierConfig.textColor}`}>
                {player.finishWpm ?? 0}
              </span>
              <span className="text-[10px] font-mono font-bold text-zinc-500">WPM</span>
            </div>

            {/* Split Delta (Runner-up) or Finish Time */}
            <div className="flex items-center gap-1.5 text-[9px] font-mono text-zinc-400 mt-0.5">
              {deltaWpm > 0 ? (
                <span className="text-zinc-400 font-bold">-{deltaWpm} WPM</span>
              ) : (
                <span className="text-amber-400/90 font-bold">{player.finishAcc ? `${player.finishAcc}% ACC` : 'FINISHED'}</span>
              )}
              {player.finishMs && (
                <span className="text-zinc-500">• {((player.finishMs) / 1000).toFixed(1)}s</span>
              )}
            </div>
          </div>
        </div>

        {/* 3D Glass Pedestal Body */}
        <div
          className={`w-full ${tierConfig.pillarHeight} rounded-t-3xl border-t-2 border-x-2 transition-all relative overflow-hidden flex flex-col items-center justify-between p-3 shadow-2xl ${tierConfig.borderColor} ${tierConfig.bg} ${tierConfig.shadow}`}
        >
          {/* Holographic light sheen sweep */}
          <motion.div
            animate={{ x: ['-100%', '200%'] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', repeatDelay: 1 }}
            className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12 pointer-events-none"
          />

          {/* Giant Engraved Numeral Watermark */}
          <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-7xl sm:text-8xl font-black font-mono opacity-15 select-none pointer-events-none text-white">
            {tierConfig.numeral}
          </span>

          {/* Rank Badge Header */}
          <span className={`px-2.5 py-0.5 rounded-full font-mono text-[9px] font-black tracking-widest uppercase shadow-md relative z-10 ${tierConfig.badgeBg}`}>
            {tierConfig.label}
          </span>

          {/* Award title badge if present */}
          {award?.title ? (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-black/60 border border-white/10 text-[9px] font-mono font-black text-amber-200/90 tracking-wider relative z-10 max-w-[95%]">
              {renderTitleIcon(award.icon)}
              <span className="truncate">{award.title}</span>
            </div>
          ) : <div />}

          {/* Active Inspection Indicator */}
          <div className="font-mono text-[9px] font-bold tracking-widest uppercase relative z-10">
            {isSelected ? (
              <span
                className="flex items-center gap-1 font-black animate-pulse"
                style={{ color: `rgb(${theme?.glowPrimary || '6, 182, 212'})` }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: `rgb(${theme?.glowPrimary || '6, 182, 212'})` }}
                />
                INSPECTING
              </span>
            ) : (
              <span className="text-zinc-500 opacity-60 group-hover:opacity-100 transition-opacity">
                CLICK TO VIEW
              </span>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-y-auto">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full opacity-20"
          style={{ background: `radial-gradient(circle, rgb(${theme.glowPrimary}) 0%, transparent 70%)` }}
        />
      </div>

      <div className="relative z-10 w-full max-w-[var(--w-ultra)] mx-auto px-6 sm:px-10 lg:px-14 xl:px-16 2xl:px-20 py-8 md:py-12">

        {/* 🏆 WINNER BANNER 🏆 */}
        <div className="text-center mb-10 animate-in fade-in zoom-in-50 duration-700 relative">

          {/* ⚡ Dynamic Ranked Division ELO Progression Card ⚡ */}
          {isRanked && (
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="max-w-xl mx-auto mb-8 p-4 sm:p-5 rounded-3xl glass-panel border border-white/15 bg-black/50 shadow-2xl relative overflow-hidden backdrop-blur-xl"
            >
              {/* Subtle ambient light */}
              <div
                className="absolute -top-12 -right-12 w-32 h-32 rounded-full blur-2xl pointer-events-none opacity-30"
                style={{ background: tierInfo.tier.color }}
              />

              <div className="flex flex-wrap items-center justify-between gap-3 mb-3 border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <div
                    className="p-1.5 rounded-xl border flex items-center justify-center"
                    style={{
                      borderColor: tierInfo.tier.color,
                      background: `rgba(${theme?.glowPrimary || '6, 182, 212'}, 0.1)`,
                      color: tierInfo.tier.color,
                      boxShadow: `0 0 14px ${tierInfo.tier.glow}`,
                    }}
                  >
                    <Trophy size={15} />
                  </div>
                  <div className="flex flex-col text-left font-mono">
                    <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">RANKED DIVISION</span>
                    <span className="text-sm font-black tracking-widest" style={{ color: tierInfo.tier.color }}>
                      {tierInfo.tier.name}
                    </span>
                  </div>
                </div>

                {/* Transfer Pill */}
                {eloTransfer ? (
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full border font-mono text-xs font-black tracking-wider ${
                      eloTransfer.direction === 'up'
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 shadow-[0_0_16px_rgba(16,185,129,0.35)]'
                        : 'bg-rose-500/15 border-rose-500/40 text-rose-400 shadow-[0_0_16px_rgba(244,63,94,0.35)]'
                    }`}
                  >
                    {eloTransfer.direction === 'up' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    <span>{eloTransfer.direction === 'up' ? '+' : '-'}{eloTransfer.amount} ELO</span>
                  </motion.div>
                ) : eloNote ? (
                  <span className="text-[10px] font-mono font-bold text-zinc-400 border border-white/10 px-3 py-1 rounded-full bg-white/5">
                    {eloNote}
                  </span>
                ) : (
                  <span className="text-[10px] font-mono font-bold text-sky-400 flex items-center gap-1.5 border border-sky-500/20 px-3 py-1 rounded-full bg-sky-500/10">
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-ping" />
                    CALCULATING ELO...
                  </span>
                )}
              </div>

              {/* Rolling Rating Progression & Bar */}
              <div className="flex flex-col gap-2 font-mono">
                <div className="flex items-center justify-between text-xs font-black">
                  <span className="text-zinc-400 tracking-wider">
                    CURRENT RATING: <span className="text-white text-base">{finalElo}</span> ELO
                  </span>
                  <span className="text-[10px] text-zinc-400 tracking-wider">
                    {tierInfo.progressPct}% TO NEXT TIER
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden relative">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${tierInfo.progressPct}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className="h-full rounded-full relative"
                    style={{
                      backgroundColor: tierInfo.tier.color,
                      boxShadow: `0 0 10px ${tierInfo.tier.glow}`,
                    }}
                  />
                </div>
              </div>
            </motion.div>
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
              {!allFinished ? 'RESULTS PENDING' : iWon ? <><Trophy size={18} className="inline mr-2 text-amber-400 align-text-bottom" />YOU WIN!</> : `${placementText(myRank)}`}
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

        {/* ════ 🏆 OLYMPIC 3D VICTORY PODIUM 🏆 ════ */}
        <div className="mb-14 animate-in fade-in slide-in-from-bottom-6 duration-700">
          <div className="text-center mb-6">
            <span
              className="text-[10px] font-mono font-black uppercase tracking-[0.3em] px-3.5 py-1 rounded-full border"
              style={{
                borderColor: `rgba(${theme?.glowPrimary || '6, 182, 212'}, 0.35)`,
                background: `rgba(${theme?.glowPrimary || '6, 182, 212'}, 0.08)`,
                color: `rgb(${theme?.glowPrimary || '6, 182, 212'})`,
                boxShadow: `0 0 16px rgba(${theme?.glowPrimary || '6, 182, 212'}, 0.15)`,
              }}
            >
              CHAMPIONSHIP PODIUM // STANDINGS
            </span>
          </div>

          {/* 3D Tiered Pedestals Container */}
          <div className="w-full max-w-4xl mx-auto flex items-end justify-center gap-3 sm:gap-6 px-2 min-h-[380px] pb-2">
            {ranking.length >= 3 ? (
              <>
                {/* 2nd Place (Silver) - Left */}
                {renderPodiumPillar(ranking[1], 1, 'silver')}

                {/* 1st Place (Gold) - Center */}
                {renderPodiumPillar(ranking[0], 0, 'gold')}

                {/* 3rd Place (Bronze) - Right */}
                {renderPodiumPillar(ranking[2], 2, 'bronze')}
              </>
            ) : ranking.length === 2 ? (
              <>
                {/* 1st Place (Gold) */}
                {renderPodiumPillar(ranking[0], 0, 'gold')}

                {/* 2nd Place (Silver) */}
                {renderPodiumPillar(ranking[1], 1, 'silver')}
              </>
            ) : ranking.length === 1 ? (
              <>
                {/* 1st Place Solo */}
                {renderPodiumPillar(ranking[0], 0, 'gold')}
              </>
            ) : (
              /* Waiting state */
              <div className="text-center py-12 font-mono text-xs text-zinc-500 tracking-widest uppercase">
                <span className="animate-pulse">Awaiting race resolution...</span>
              </div>
            )}
          </div>

          {/* Runners-Up Row (4th+ Place & DNFs) */}
          {(ranking.length > 3 || unfinished.length > 0) && (
            <div className="w-full max-w-3xl mx-auto mt-6 pt-4 border-t border-white/10 flex flex-wrap items-center justify-center gap-2.5">
              <span className="w-full text-center text-[9px] font-mono font-bold tracking-widest text-zinc-500 uppercase mb-1">
                RUNNERS & TELEMETRY
              </span>
              {[...ranking.slice(3), ...unfinished].map((player, subIdx) => {
                const actualIdx = ranking.length > 3 ? 3 + subIdx : subIdx;
                const isDnf = !player.finished;
                const isSelf = player.id === selfId;
                const isSelected = !isDnf && player.id === selectedPlayerId;
                const seriesStyle = raceStyles.get(player.id);
                const award = awards[player.id];

                return (
                  <button
                    key={player.id}
                    onClick={() => { if (!isDnf) setSelectedPlayerId(player.id); }}
                    disabled={isDnf}
                    className={`flex items-center gap-2.5 px-4 py-2 rounded-2xl border font-mono transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-white/15 border-white/40 shadow-lg scale-105'
                        : isDnf
                          ? 'bg-white/[0.02] border-white/5 opacity-40 cursor-not-allowed'
                          : 'bg-white/5 border-white/10 hover:border-white/20 text-zinc-300 hover:text-white'
                    }`}
                  >
                    <span className="text-[10px] font-black text-zinc-400">
                      {renderRankBadge(actualIdx, false, isDnf)}
                    </span>
                    {seriesStyle && <MarkerSwatch marker={seriesStyle.marker} color={seriesStyle.color} size={9} />}
                    <span className="text-xs font-black text-white truncate max-w-[100px]">
                      {player.name}
                    </span>
                    {isSelf && (
                      <span className="text-[8px] font-black px-1.5 py-0.2 rounded-full bg-white/10 text-white">YOU</span>
                    )}
                    <span className="text-xs font-black text-zinc-200 ml-1">
                      {isDnf ? 'DNF' : `${player.finishWpm ?? 0} WPM`}
                    </span>
                    {award?.title && (
                      <span className="text-[9px] text-amber-300/80 hidden sm:inline">• {award.title}</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
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

        {/* ── CYBER SABOTAGE COMBAT BREAKDOWN ────────────── */}
        {players.some(p => p.sabotageStats && (p.sabotageStats.hexesCast > 0 || p.sabotageStats.hexesDeflected > 0 || p.sabotageStats.hexesAfflicted > 0)) && (
          <div
            className="mb-8 p-6 rounded-3xl border glass-panel bg-zinc-950/60 backdrop-blur-xl relative overflow-hidden"
            style={{
              borderColor: `rgba(${theme?.glowPrimary || '34, 211, 238'}, 0.25)`,
              boxShadow: `0 0 25px rgba(${theme?.glowPrimary || '34, 211, 238'}, 0.08)`,
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full animate-ping"
                  style={{ backgroundColor: `rgb(${theme?.glowPrimary || '34, 211, 238'})` }}
                />
                <h3
                  className="font-mono text-xs font-black tracking-widest uppercase"
                  style={{ color: `rgb(${theme?.glowPrimary || '34, 211, 238'})` }}
                >
                  CYBER COMBAT ENGAGEMENT LOG
                </h3>
              </div>
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                1V1 TACTICAL HEX PROTOCOL
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {players.map(player => {
                const stats = player.sabotageStats || { hexesCast: 0, hexesDeflected: 0, hexesAfflicted: 0, cleanseCount: 0 };
                const isSelf = player.id === selfId;

                return (
                  <div
                    key={player.id}
                    className="p-4 rounded-2xl border border-white/5 bg-white/[0.02] flex flex-col gap-2.5 font-mono"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black tracking-wider text-white truncate">
                        {player.name}
                      </span>
                      {isSelf && (
                        <span
                          className="text-[8px] font-black px-1.5 py-0.5 rounded border"
                          style={{
                            borderColor: `rgba(${theme?.glowPrimary || '34, 211, 238'}, 0.4)`,
                            color: `rgb(${theme?.glowPrimary || '34, 211, 238'})`,
                          }}
                        >
                          YOU
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-left pt-1">
                      <div className="flex flex-col">
                        <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider">Cast</span>
                        <span className="flex items-center gap-1 text-sm font-black text-white">
                          <Zap size={12} className="text-amber-400 shrink-0" /> {stats.hexesCast}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider">Deflected</span>
                        <span className="flex items-center gap-1 text-sm font-black text-emerald-400">
                          <Shield size={12} className="text-emerald-400 shrink-0" /> {stats.hexesDeflected}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider">Cleansed</span>
                        <span className="flex items-center gap-1 text-sm font-black text-cyan-400">
                          <Sparkles size={12} className="text-cyan-400 shrink-0" /> {stats.cleanseCount}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider">Endured</span>
                        <span className="flex items-center gap-1 text-sm font-black text-rose-400">
                          <Flame size={12} className="text-rose-400 shrink-0" /> {stats.hexesAfflicted}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

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
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => (onRematch || onReturnToRoom)?.()}
              className="flex items-center gap-3 px-10 py-4 rounded-2xl text-slate-950 font-black tracking-widest text-sm shadow-2xl transition-all cursor-pointer relative overflow-hidden group"
              style={{
                backgroundColor: `rgb(${theme?.glowPrimary || '6, 182, 212'})`,
                boxShadow: `0 0 35px rgba(${theme?.glowPrimary || '6, 182, 212'}, 0.55)`
              }}
            >
              {/* Holographic light sweep */}
              <motion.div
                animate={{ x: ['-100%', '220%'] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', repeatDelay: 1 }}
                className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-12 pointer-events-none"
              />
              <RotateCcw size={18} className="stroke-[2.5] group-hover:rotate-180 transition-transform duration-500" />
              <span>RUN IT BACK // REMATCH</span>
              <span className="text-[10px] uppercase font-bold bg-black/25 px-2 py-0.5 rounded-full text-black">
                PULLS ALL PLAYERS
              </span>
            </motion.button>
          ) : (
            <div className="flex items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  setHasVotedRematch(true);
                  onSendMessage('⚡ Voted for REMATCH! Ready to run it back!');
                }}
                disabled={hasVotedRematch}
                className={`flex items-center gap-2 px-6 py-4 rounded-2xl font-black tracking-wider text-sm transition-all border cursor-pointer ${
                  hasVotedRematch
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.35)]'
                    : 'bg-white/10 hover:bg-white/15 border-white/20 text-white'
                }`}
              >
                <Flame size={17} className={hasVotedRematch ? 'text-emerald-400 animate-pulse' : 'text-amber-400'} />
                <span>{hasVotedRematch ? 'VOTED FOR REMATCH' : 'VOTE REMATCH'}</span>
              </motion.button>

              <button
                onClick={() => (onReturnToRoom || onRematch)?.()}
                className="flex items-center gap-2 px-6 py-4 rounded-2xl font-bold tracking-wider text-sm hover:scale-105 transition-all cursor-pointer border"
                style={{
                  backgroundColor: `rgba(${theme?.glowPrimary || '6, 182, 212'}, 0.15)`,
                  borderColor: `rgba(${theme?.glowPrimary || '6, 182, 212'}, 0.35)`,
                  color: `rgb(${theme?.glowPrimary || '6, 182, 212'})`,
                }}
              >
                <ArrowLeft size={16} className="stroke-[2]" />
                <span>BACK TO LOBBY</span>
              </button>
            </div>
          )}

          <button
            onClick={onLeaveRace}
            className="flex items-center gap-2.5 px-6 py-4 glass-panel rounded-2xl text-zinc-400 font-bold tracking-wider text-sm hover:text-rose-400 hover:border-rose-500/30 hover:bg-rose-500/10 transition-all border border-white/5 cursor-pointer"
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

