import React from 'react';
import { motion } from 'framer-motion';
import { History, Trophy, Loader2 } from 'lucide-react';
import type { Theme } from '@/data/constants';
import type { RankedMatchRow } from '@/hooks/useRankedHistory';

interface RankedHistoryPanelProps {
    theme: Theme;
    matches: RankedMatchRow[];
    loading?: boolean;
    /** Your current rating, shown as the exact figure alongside the record. */
    elo: number;
}

const relativeTime = (iso: string): string => {
    const then = new Date(iso).getTime();
    if (!Number.isFinite(then)) return '';
    const mins = Math.floor((Date.now() - then) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return days === 1 ? 'yesterday' : `${days}d ago`;
};

/**
 * Your recent ranked duels.
 *
 * The Elo ladder has been recording every ranked finish to `ranked_matches`
 * since it shipped, but the app never showed any of it back — your rating moved
 * with no record of who moved it. This is read-only history.
 */
export const RankedHistoryPanel: React.FC<RankedHistoryPanelProps> = ({ theme, matches, loading = false, elo }) => {
    const wins = matches.filter(m => m.won).length;
    const losses = matches.length - wins;

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
            className="w-full glass-panel rounded-3xl border border-white/15 bg-black/40 p-5 flex flex-col gap-4 shadow-[0_12px_40px_rgba(0,0,0,0.4)]"
        >
            {/* ── Header ── */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-white/10 border border-white/15 text-white">
                        {loading ? <Loader2 size={16} className="animate-spin" /> : <History size={16} />}
                    </div>
                    <div className="flex flex-col">
                        <span className="font-mono text-xs font-black uppercase tracking-widest text-white">Ranked record</span>
                        <span className="font-mono text-[10px] text-zinc-400">
                            {matches.length > 0
                                ? `Last ${matches.length} duel${matches.length === 1 ? '' : 's'} · ${wins}W ${losses}L`
                                : 'Your ranked duels land here'}
                        </span>
                    </div>
                </div>
                <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-black uppercase tracking-widest text-amber-300 bg-amber-500/15 border border-amber-500/35 px-2.5 py-1.5 rounded-xl tabular-nums">
                    <Trophy size={11} /> {elo} Elo
                </span>
            </div>

            {/* ── Rows ── */}
            {matches.length === 0 ? (
                <p className="font-mono text-[11px] text-zinc-500 px-1 py-2">
                    No ranked duels yet. Quick Match while signed in, or flip on Ranked when hosting a room —
                    every result is recorded here.
                </p>
            ) : (
                <ul className="flex flex-col gap-2">
                    {matches.map((m) => (
                        <li
                            key={m.id}
                            className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-2xl bg-white/[0.04] border border-white/10"
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <span
                                    className={`w-7 h-7 shrink-0 rounded-xl border flex items-center justify-center font-mono text-[11px] font-black ${m.won
                                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                                        : 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                                        }`}
                                >
                                    {m.won ? 'W' : 'L'}
                                </span>
                                <div className="flex flex-col min-w-0">
                                    <span className="font-mono text-[11px] font-bold text-zinc-200 truncate">
                                        vs {m.opponentName}
                                    </span>
                                    <span className="font-mono text-[10px] text-zinc-500 tabular-nums">
                                        {Math.round(m.myWpm)} — {Math.round(m.opponentWpm)} WPM · {relativeTime(m.createdAt)}
                                    </span>
                                </div>
                            </div>

                            {/* Only the winner's transfer is stored, so a loss shows it as an
                                approximation rather than inventing an exact number. */}
                            <span
                                className={`font-mono text-[11px] font-black tabular-nums shrink-0 ${m.won ? theme?.text || 'text-cyan-400' : 'text-zinc-500'}`}
                                title={m.won ? 'Elo gained' : 'Approximate: only the winner’s transfer is recorded'}
                            >
                                {m.won ? `+${m.eloTransfer}` : `≈ −${m.eloTransfer}`}
                            </span>
                        </li>
                    ))}
                </ul>
            )}
        </motion.div>
    );
};
