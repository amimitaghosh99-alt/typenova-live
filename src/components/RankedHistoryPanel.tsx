import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { History, Trophy, Loader2 } from 'lucide-react';
import type { Theme } from '@/data/constants';
import type { RankedMatchRow } from '@/hooks/useRankedHistory';
import { chipSwap, hoverRow, iconPop, listParent, reveal, rowChild, shellIn, springSnappy } from '@/lib/motion';

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
 *
 * Surface: `.glass-card` plus an explicit dark fill, matching `RoomBrowser`. The
 * two rail panels used to differ (`bg-black/40` here, a blurred `.glass-panel`
 * there) for no stated reason, so the rail did not read as one column. The fill is
 * not decoration — `.glass-card` alone is effectively transparent and every label
 * in here is near-white, so under a light Auto-Fetch wallpaper the panel became
 * white-on-cream.
 */
export const RankedHistoryPanel: React.FC<RankedHistoryPanelProps> = ({ theme, matches, loading = false, elo }) => {
    const reduce = useReducedMotion();
    const wins = matches.filter(m => m.won).length;
    const losses = matches.length - wins;

    return (
        <motion.section
            {...reveal(reduce, shellIn)}
            aria-label="Ranked record"
            className="w-full glass-card !bg-[rgba(12,14,20,0.82)] rounded-2xl p-5 flex flex-col gap-4"
        >
            {/* ── Header ── */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2.5">
                    <motion.div
                        whileHover={iconPop(reduce, -8)}
                        className="p-2 rounded-xl bg-white/10 border border-white/15 text-white"
                    >
                        {loading
                            ? <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                            : <History size={16} aria-hidden="true" />}
                    </motion.div>
                    <div className="flex flex-col">
                        <h3 className="font-mono text-xs font-black uppercase tracking-widest text-white">Ranked record</h3>
                        <span className="font-mono text-[10px] text-zinc-400">

                            {matches.length > 0
                                ? `Last ${matches.length} duel${matches.length === 1 ? '' : 's'} · ${wins}W ${losses}L`
                                : 'Your ranked duels land here'}
                        </span>
                    </div>
                </div>

                {/* Elo badge. `.compete-glow-ring` is CSS-driven, so it is
                    already covered by the `prefers-reduced-motion` block at
                    index.css:442. */}
                <motion.span
                    initial={reduce ? false : { scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={springSnappy}
                    className="inline-flex items-center gap-1.5 font-mono text-[10px] font-black uppercase tracking-widest text-amber-300 bg-amber-500/15 border border-amber-500/35 px-2.5 py-1.5 rounded-xl tabular-nums compete-glow-ring"
                    style={{ '--glow-color': 'rgba(245, 158, 11, 0.3)' } as React.CSSProperties}
                >
                    <Trophy size={11} aria-hidden="true" /> {elo} Elo
                </motion.span>
            </div>

            {/* ── Rows ──
                The empty state used to pulse its opacity between 0.4 and 0.7 on
                an infinite loop, which is both a distraction on a screen you are
                reading and unreachable from the CSS reduced-motion guard. It is
                plain text now, at an opacity that stays legible. */}
            {matches.length === 0 ? (
                <motion.p
                    initial={reduce ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="font-mono text-[11px] text-zinc-400 px-1 py-2 leading-relaxed"
                >
                    No ranked duels yet. Quick Match while signed in, or flip on Ranked when hosting a room —
                    every result is recorded here.
                </motion.p>
            ) : (
                <motion.ul
                    {...reveal(reduce, listParent(0.06, 0.08))}
                    className="flex flex-col gap-2"
                >
                    {matches.map((m) => (
                        <motion.li
                            key={m.id}
                            variants={reduce ? undefined : rowChild}
                            whileHover={hoverRow(reduce)}
                            className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 hover:border-white/20 transition-colors"
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                {/* Win/loss badge. The letter carries the result,
                                    so colour is reinforcement rather than the only
                                    signal. */}
                                <motion.span
                                    variants={reduce ? undefined : chipSwap}
                                    className={`w-7 h-7 shrink-0 rounded-xl border flex items-center justify-center font-mono text-[11px] font-black ${m.won
                                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                                        : 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                                        }`}
                                >
                                    {m.won ? 'W' : 'L'}
                                </motion.span>
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
                            <motion.span
                                initial={reduce ? false : { opacity: 0, scale: 1.4 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={springSnappy}
                                className={`font-mono text-[11px] font-black tabular-nums shrink-0 ${m.won ? theme?.text || 'text-cyan-400' : 'text-zinc-500'}`}
                                title={m.won ? 'Elo gained' : 'Approximate: only the winner\'s transfer is recorded'}
                                style={m.won ? {
                                    textShadow: theme?.glowPrimary
                                        ? `0 0 12px rgba(${theme.glowPrimary}, 0.6)`
                                        : '0 0 12px rgba(34, 211, 238, 0.6)',
                                } : undefined}
                            >
                                {m.won ? `+${m.eloTransfer}` : `≈ −${m.eloTransfer}`}
                            </motion.span>
                        </motion.li>
                    ))}
                </motion.ul>
            )}
        </motion.section>
    );
};
