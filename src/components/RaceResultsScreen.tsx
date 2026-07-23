import { useMemo, useState } from 'react';
import { Trophy, LogOut } from 'lucide-react';
import type { RacerState } from '@/hooks/useRace';
import type { ResultsScreenProps } from '@/components/ResultsScreen';
import { ResultsScreen } from '@/components/ResultsScreen';
import { WpmGraph } from '@/components/graphs/WpmGraph';

interface RaceResultsScreenProps extends ResultsScreenProps {
  players: RacerState[];
  selfId: string;
  roomSize: number;
  timelines?: Record<string, Array<{ t: number; wpm: number }>>;
  onLeaveRace: () => void;
}

export function RaceResultsScreen({
  players, selfId, roomSize, timelines, onLeaveRace, theme,
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
  const iWon = allFinished && winner?.id === selfId;

  const maxRaceDurationMs = useMemo(() => {
    return Math.max(...players.map(p => p.finishMs ?? 0), resultsProps.durationMs);
  }, [players, resultsProps.durationMs]);

  // ── AWARDS LOGIC ──
  const awards = useMemo(() => {
    if (!allFinished) return {} as Record<string, string>;
    const result: Record<string, string> = {};

    let sniperId = '';
    let highestAcc = 0;

    let smasherId = '';
    let highestErrors = -1;
    let lowestAcc = 100;

    let metronomeId = '';
    let highestConsistency = 0;

    ranking.forEach(p => {
      // Sniper
      if ((p.finishAcc ?? 0) > highestAcc && (p.finishAcc ?? 0) >= 98) {
        highestAcc = p.finishAcc ?? 0;
        sniperId = p.id;
      }
      
      // Smasher
      const errs = p.errorCount ?? 0;
      if (errs > highestErrors) {
        highestErrors = errs;
        smasherId = p.id;
      } else if (errs === highestErrors && (p.finishAcc ?? 0) < lowestAcc) {
        lowestAcc = p.finishAcc ?? 0;
        smasherId = p.id;
      }

      // Metronome
      if ((p.consistency ?? 0) > highestConsistency && (p.consistency ?? 0) > 80) {
        highestConsistency = p.consistency ?? 0;
        metronomeId = p.id;
      }
    });

    // Comeback Kid
    let comebackId = '';
    if (roomSize >= 3 && resultsProps.durationMs > 0) {
      const halfTime = resultsProps.durationMs / 2;
      const halfwayRanking = [...ranking].map(p => {
        let wpm = 0;
        if (p.id === selfId) {
          const point = resultsProps.timelinePoints.find(pt => pt.t >= halfTime);
          wpm = point?.wpm ?? p.finishWpm ?? 0;
        } else if (timelines?.[p.id]) {
          const tpts = timelines[p.id];
          const point = tpts?.find(pt => pt.t >= halfTime);
          wpm = point?.wpm ?? p.finishWpm ?? 0;
        }
        return { id: p.id, halfwayWpm: wpm };
      });
      halfwayRanking.sort((a, b) => b.halfwayWpm - a.halfwayWpm);
      
      const lastPlaceAtHalfway = halfwayRanking[halfwayRanking.length - 1]?.id;
      if (lastPlaceAtHalfway === ranking[0]?.id || lastPlaceAtHalfway === ranking[1]?.id) {
        comebackId = lastPlaceAtHalfway;
      }
    }

    if (sniperId) result[sniperId] = '🎯 THE SNIPER';
    if (smasherId && !result[smasherId]) result[smasherId] = '💥 KEYBOARD SMASHER';
    if (metronomeId && !result[metronomeId]) result[metronomeId] = '⏱️ THE METRONOME';
    if (comebackId && !result[comebackId]) result[comebackId] = '🔥 COMEBACK KID';

    return result;
  }, [allFinished, ranking, resultsProps.durationMs, resultsProps.timelinePoints, selfId, timelines, roomSize]);

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

        {/* ── WINNER BANNER ────────────────────────────────── */}
        <div className="text-center mb-10 animate-in fade-in zoom-in-50 duration-700">
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
            const isLoser = idx > 0 && allFinished;
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
                  {award && (
                    <div className="mt-2 text-[8px] font-black tracking-widest px-2 py-1 rounded border border-white/10 bg-white/5 uppercase text-amber-200/80 w-fit">
                      {award}
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

        {/* ── RACE ACTIONS ────────────────────────────────── */}
        <div className="flex justify-center gap-4 mt-4 pb-12">
          <button
            onClick={onLeaveRace}
            className="flex items-center gap-3 px-8 py-4 glass-panel rounded-2xl text-zinc-300 font-black tracking-widest text-sm hover:text-white hover:bg-white/10 transition-all border border-transparent hover:border-white/10"
          >
            <LogOut size={16} /> LEAVE ROOM
          </button>
        </div>
      </div>
    </div>
  );
}

