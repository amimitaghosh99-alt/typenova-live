import { useMemo } from 'react';
import { Trophy, LogOut } from 'lucide-react';
import type { RacerState } from '@/hooks/useRace';
import type { ResultsScreenProps } from '@/components/ResultsScreen';
import { ResultsScreen } from '@/components/ResultsScreen';

interface RaceResultsScreenProps extends ResultsScreenProps {
  players: RacerState[];
  selfId: string;
  roomSize: number;
  onLeaveRace: () => void;
}

export function RaceResultsScreen({
  players, selfId, roomSize, onLeaveRace, theme,
  ...resultsProps
}: RaceResultsScreenProps) {
  const ranking = useMemo(() =>
    [...players]
      .filter(p => p.finished)
      .sort((a, b) =>
        (a.finishMs ?? Infinity) - (b.finishMs ?? Infinity) ||
        (b.finishWpm ?? 0) - (a.finishWpm ?? 0)
      ),
    [players]
  );

  const myRank = ranking.findIndex(p => p.id === selfId);
  const winner = ranking[0];
  const iWon = winner?.id === selfId;
  const maxWpm = Math.max(...ranking.map(p => p.finishWpm ?? 0), 1);
  const maxAcc = 100;

  const medalColors = [
    'text-amber-400 border-amber-500/50 bg-amber-500/10 shadow-[0_0_30px_rgba(245,158,11,0.3)]',   // 1st gold
    'text-zinc-300 border-zinc-400/40 bg-zinc-400/10 shadow-[0_0_20px_rgba(161,161,170,0.2)]',      // 2nd silver
    'text-orange-400 border-orange-500/40 bg-orange-500/10 shadow-[0_0_20px_rgba(251,146,60,0.2)]', // 3rd bronze
    'text-zinc-500 border-zinc-700 bg-zinc-800/50',                                                   // 4th
  ];

  const medalEmoji = ['🥇', '🥈', '🥉', '4th'];

  const placementText = (rank: number) => {
    if (rank === 0) return '1ST PLACE';
    if (rank === 1) return '2ND PLACE';
    if (rank === 2) return '3RD PLACE';
    return '4TH PLACE';
  };

  // Grid layout based on player count
  const gridClass = ranking.length === 2
    ? 'grid-cols-1 md:grid-cols-2'
    : ranking.length === 3
    ? 'grid-cols-1 md:grid-cols-3'
    : 'grid-cols-2';

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
            {winner ? `${winner.name} WINS!` : 'RACE OVER'}
          </h1>
          {myRank >= 0 && (
            <p className={`text-xl font-black tracking-[0.3em] uppercase ${
              myRank === 0 ? 'text-amber-400' : myRank === 1 ? 'text-zinc-300' : myRank === 2 ? 'text-orange-400' : 'text-zinc-500'
            }`}>
              {iWon ? '🏆 YOU WIN!' : `${placementText(myRank)}`}
            </p>
          )}
        </div>

        {/* ── HEAD-TO-HEAD COMPARISON ──────────────────────── */}
        <div className={`grid ${gridClass} gap-4 md:gap-6 mb-12 ${ranking.length === 2 ? 'max-w-3xl mx-auto' : ''}`}>
          {/* VS divider for 1v1 */}
          {ranking.length === 2 && (
            <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 items-center justify-center z-20" style={{ top: 'auto' }}>
              {/* VS rendered between the two cards via the relative grid */}
            </div>
          )}

          {ranking.map((player, idx) => {
            const isSelf = player.id === selfId;
            const wpmPercent = ((player.finishWpm ?? 0) / maxWpm) * 100;
            const accPercent = (player.finishAcc ?? 0);
            const timeStr = ((player.finishMs ?? 0) / 1000).toFixed(1);

            return (
              <div
                key={player.id}
                className={`relative rounded-3xl border p-6 transition-all duration-500 animate-in fade-in slide-in-from-bottom-4 ${medalColors[idx] || medalColors[3]} ${
                  isSelf ? `ring-2 ring-offset-2 ring-offset-[#0a0a0f]` : ''
                }`}
                style={{
                  animationDelay: `${idx * 150 + 300}ms`,
                  ...(isSelf ? { ringColor: `rgb(${theme.glowPrimary})` } : {}),
                }}
              >
                {/* Rank + Name */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{medalEmoji[idx] || '·'}</span>
                    <div>
                      <span className="font-black text-lg tracking-widest uppercase text-white">
                        {player.name}
                      </span>
                      {isSelf && (
                        <span className="ml-2 text-[9px] font-black tracking-widest px-2 py-0.5 rounded-full bg-white/10 border border-white/20">YOU</span>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] font-black tracking-widest opacity-60 uppercase">
                    {placementText(idx)}
                  </span>
                </div>

                {/* WPM */}
                <div className="mb-4">
                  <div className="flex justify-between items-baseline mb-2">
                    <span className="text-[10px] font-black tracking-widest text-zinc-400">WPM</span>
                    <span className={`text-3xl font-black ${idx === 0 ? theme.text : 'text-white'}`}>
                      {player.finishWpm ?? 0}
                    </span>
                  </div>
                  <div className="h-2 bg-black/30 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-1000 ease-out"
                      style={{
                        width: `${wpmPercent}%`,
                        background: `linear-gradient(90deg, rgb(${theme.glowPrimary}), rgb(${theme.glowSecondary}))`,
                        animationDelay: `${idx * 200 + 500}ms`,
                      }}
                    />
                  </div>
                </div>

                {/* Accuracy */}
                <div className="mb-4">
                  <div className="flex justify-between items-baseline mb-2">
                    <span className="text-[10px] font-black tracking-widest text-zinc-400">ACCURACY</span>
                    <span className="text-xl font-black text-white">
                      {player.finishAcc ?? 0}<span className="text-sm text-zinc-500">%</span>
                    </span>
                  </div>
                  <div className="h-2 bg-black/30 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-1000 ease-out"
                      style={{
                        width: `${(accPercent / maxAcc) * 100}%`,
                        background: accPercent >= 95
                          ? 'linear-gradient(90deg, #34d399, #10b981)'
                          : accPercent >= 85
                          ? 'linear-gradient(90deg, #fbbf24, #f59e0b)'
                          : 'linear-gradient(90deg, #f87171, #ef4444)',
                      }}
                    />
                  </div>
                </div>

                {/* Time */}
                <div className="flex justify-between items-baseline">
                  <span className="text-[10px] font-black tracking-widest text-zinc-400">TIME</span>
                  <span className="text-xl font-black text-white">
                    {timeStr}<span className="text-sm text-zinc-500">s</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* VS badge for 1v1 */}

        {/* ── YOUR DETAILED STATS ─────────────────────────── */}
        <div className="border-t border-zinc-800 pt-10">
          <h2 className="text-center text-zinc-400 text-[11px] font-black tracking-[0.4em] uppercase mb-8">
            YOUR DETAILED STATS
          </h2>
          <ResultsScreen {...resultsProps} theme={theme} compact />
        </div>

        {/* ── RACE ACTIONS ────────────────────────────────── */}
        <div className="flex justify-center gap-4 mt-8 pb-12">
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
