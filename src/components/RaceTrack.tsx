import { useEffect, useMemo, useRef } from 'react';
import { Crown, Flag, Zap } from 'lucide-react';
import { toast } from 'sonner';
import type { Theme, Phase } from '@/data/constants';
import type { RacerState } from '@/hooks/useRace';

interface RaceTrackProps {
    players: RacerState[];
    selfId: string;
    theme: Theme;
    roomCode: string;
    targetLength: number;
    /** Local live values — presence is throttled, so our own row uses these. */
    myProgress: number;
    myWpm: number;
    myAccuracy: number;
    phase: Phase;
    countdown: number;
}

const LANE_COLORS = ['#22d3ee', '#f0abfc', '#fde047', '#34d399', '#fb923c', '#a78bfa'];

const ordinal = (n: number) => {
    if (n === 1) return '1st';
    if (n === 2) return '2nd';
    if (n === 3) return '3rd';
    return `${n}th`;
};

/**
 * Live standings for a multiplayer race. Before this existed, opponents were
 * only a faint caret glow inside the passage — you could not see who was ahead,
 * how fast they were going, or that anyone had finished.
 */
export function RaceTrack({
    players,
    selfId,
    theme,
    roomCode,
    targetLength,
    myProgress,
    myWpm,
    myAccuracy,
    phase,
    countdown,
}: RaceTrackProps) {
    const rows = useMemo(() => {
        const merged = players.map((p, i) => {
            const isSelf = p.id === selfId;
            return {
                ...p,
                color: LANE_COLORS[i % LANE_COLORS.length],
                isSelf,
                liveProgress: p.finished ? 100 : isSelf ? myProgress : (p.progress ?? 0),
                liveWpm: p.finished ? (p.finishWpm ?? p.wpm ?? 0) : isSelf ? myWpm : (p.wpm ?? 0),
                liveAcc: p.finished ? (p.finishAcc ?? p.accuracy ?? 100) : isSelf ? myAccuracy : (p.accuracy ?? 100),
            };
        });

        return merged.sort((a, b) => {
            if (!!a.finished !== !!b.finished) return a.finished ? -1 : 1;
            if (a.finished && b.finished) return (a.finishMs ?? 0) - (b.finishMs ?? 0);
            return b.liveProgress - a.liveProgress;
        });
    }, [players, selfId, myProgress, myWpm, myAccuracy]);

    // Announce finishers once each.
    const announcedRef = useRef<Set<string>>(new Set());
    useEffect(() => {
        let place = 0;
        for (const r of rows) {
            if (!r.finished) continue;
            place++;
            if (r.isSelf || announcedRef.current.has(r.id)) continue;
            announcedRef.current.add(r.id);
            toast(`${r.name} finished ${ordinal(place)} — ${r.liveWpm} WPM`, { icon: '🏁' });
        }
    }, [rows]);

    const charsFor = (pct: number) => Math.round((pct / 100) * targetLength);

    return (
        <div className="relative z-20 w-full max-w-4xl mx-auto mb-4 rounded-2xl glass-panel border border-white/10 bg-zinc-950/60 backdrop-blur-md px-4 py-3 font-mono">
            <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-black tracking-widest uppercase ${theme.text}`}>Live Race</span>
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-white/5 text-zinc-400 border border-white/10 font-bold tracking-widest">
                        {roomCode}
                    </span>
                </div>
                {phase === 'COUNTDOWN' ? (
                    <span className={`text-[11px] font-black tracking-widest ${theme.text} animate-pulse`}>
                        STARTING IN {countdown}
                    </span>
                ) : (
                    <span className="text-[10px] font-bold text-zinc-500 tracking-widest">
                        {rows.filter(r => r.finished).length}/{rows.length} FINISHED
                    </span>
                )}
            </div>

            <div className="flex flex-col gap-2">
                {rows.map((r, idx) => (
                    <div key={r.id} className="flex items-center gap-3">
                        <div className="w-6 text-center text-[10px] font-black text-zinc-500 tabular-nums">
                            {r.finished ? ordinal(idx + 1) : idx + 1}
                        </div>

                        <div className="w-28 shrink-0 flex items-center gap-1.5 min-w-0">
                            {r.isHost && <Crown size={11} className="text-amber-400 shrink-0" />}
                            <span
                                className={`truncate text-[11px] font-bold ${r.isSelf ? 'text-white' : 'text-zinc-300'}`}
                                style={{ color: r.isSelf ? undefined : r.color }}
                                title={r.name}
                            >
                                {r.name}{r.isSelf && ' (you)'}
                            </span>
                        </div>

                        <div className="flex-1 h-2.5 rounded-full bg-white/5 border border-white/10 overflow-hidden relative">
                            <div
                                className="h-full rounded-full transition-[width] duration-200 ease-out"
                                style={{
                                    width: `${Math.min(100, Math.max(0, r.liveProgress))}%`,
                                    backgroundColor: r.color,
                                    boxShadow: `0 0 10px ${r.color}66`,
                                }}
                            />
                            {r.finished && (
                                <Flag size={9} className="absolute right-1 top-1/2 -translate-y-1/2 text-zinc-900" />
                            )}
                        </div>

                        <div className="w-[92px] shrink-0 flex items-center justify-end gap-2 text-[10px] font-bold tabular-nums">
                            <span className="flex items-center gap-0.5 text-zinc-200">
                                <Zap size={9} className="text-amber-400" />
                                {Math.round(r.liveWpm)}
                            </span>
                            <span className="text-zinc-500">{Math.round(r.liveAcc)}%</span>
                        </div>

                        <div className="hidden md:block w-16 shrink-0 text-right text-[9px] text-zinc-600 tabular-nums">
                            {charsFor(r.liveProgress)}/{targetLength}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
