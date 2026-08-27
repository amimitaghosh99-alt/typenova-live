import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Zap, Loader2, X, Swords, Trophy, Users } from 'lucide-react';
import type { Theme } from '@/data/constants';
import type { MatchmakingState } from '@/hooks/useMatchmaking';

interface QuickMatchPanelProps {
    theme: Theme;
    state: MatchmakingState;
    /** Your rating, shown so the Elo window means something. */
    elo: number;
    isLoggedIn: boolean;
    /** False when Supabase credentials are missing. */
    available: boolean;
    onSearch: () => void;
    onCancel: () => void;
}

/** ELO_BAND_OPEN in useMatchmaking — past this the queue takes anyone. */
const OPEN_BAND = 100000;

const formatElapsed = (ms: number) => {
    const total = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(total / 60);
    const s = total % 60;
    return m > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${s}s`;
};

/**
 * Quick Match: the one-click path into a real opponent.
 *
 * The matchmaking queue already existed but was only reachable from RaceModal,
 * which nothing renders any more — so every player who wanted an opponent had
 * to find a human out-of-band and trade a 6-character code. This surfaces the
 * queue on the compete stage and, unlike the old modal, reports what it's
 * actually doing: how long you've waited, how many people are in the queue, and
 * how wide the skill window has opened.
 */
export const QuickMatchPanel: React.FC<QuickMatchPanelProps> = ({
    theme,
    state,
    elo,
    isLoggedIn,
    available,
    onSearch,
    onCancel,
}) => {
    const [now, setNow] = useState(() => Date.now());
    const searching = state.status === 'searching';
    const found = state.status === 'found';

    // Local ticker: the hook only re-renders every 2s on ping, which makes the
    // timer visibly stutter.
    useEffect(() => {
        if (!searching) return;
        setNow(Date.now());
        const id = setInterval(() => setNow(Date.now()), 500);
        return () => clearInterval(id);
    }, [searching]);

    const elapsed = searching && state.startedAt ? now - state.startedAt : 0;
    const band = state.eloBand ?? 0;
    const bandLabel = band >= OPEN_BAND ? 'Any rating' : `±${band} Elo`;
    const queueSize = state.queueSize ?? 1;

    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className={`w-full glass-panel rounded-3xl border bg-black/40 p-5 flex flex-col md:flex-row md:items-center gap-4 shadow-[0_12px_40px_rgba(0,0,0,0.4)] transition-colors ${searching || found ? 'border-emerald-500/40' : 'border-white/15'
                }`}
        >
            {/* ── Pitch / status ── */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
                <div
                    className={`relative p-2.5 rounded-2xl border shrink-0 ${searching || found
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                        : 'bg-white/10 border-white/15 text-white'
                        }`}
                >
                    {searching ? <Loader2 size={18} className="animate-spin" /> : found ? <Swords size={18} /> : <Zap size={18} className="fill-current" />}
                </div>

                <div className="flex flex-col min-w-0">
                    <span className="font-mono text-xs font-black uppercase tracking-widest text-white flex items-center gap-2">
                        Quick match
                        {isLoggedIn ? (
                            <span className="inline-flex items-center gap-1 font-bold text-[9px] text-amber-300 bg-amber-500/15 border border-amber-500/35 px-1.5 py-0.5 rounded normal-case tracking-normal">
                                <Trophy size={9} /> Ranked · {elo} Elo
                            </span>
                        ) : (
                            <span className="font-bold text-[9px] text-zinc-400 bg-white/5 border border-white/10 px-1.5 py-0.5 rounded normal-case tracking-normal">
                                Casual — sign in for Elo
                            </span>
                        )}
                    </span>

                    {found ? (
                        <span className="font-mono text-[10px] text-emerald-300 truncate">
                            Matched with <span className="font-bold text-white">{state.opponentName || 'opponent'}</span>
                            {typeof state.opponentElo === 'number' && ` · ${state.opponentElo} Elo`} — opening room…
                        </span>
                    ) : searching ? (
                        <span className="font-mono text-[10px] text-zinc-400 flex items-center gap-2 flex-wrap">
                            <span className="tabular-nums text-zinc-200 font-bold">{formatElapsed(elapsed)}</span>
                            <span className="text-zinc-600">·</span>
                            <span className="inline-flex items-center gap-1">
                                <Users size={10} /> {queueSize} in queue
                            </span>
                            <span className="text-zinc-600">·</span>
                            {/* The window widens on a timer, so a long wait still ends in a match. */}
                            <span>window {bandLabel}</span>
                        </span>
                    ) : (
                        <span className="font-mono text-[10px] text-zinc-400">
                            Drop into the queue and we'll pair you with the closest rating available
                        </span>
                    )}
                </div>
            </div>

            {/* ── Action ── */}
            {searching ? (
                <button
                    type="button"
                    onClick={onCancel}
                    className="shrink-0 px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-zinc-200 hover:text-white font-mono text-xs font-black uppercase tracking-widest transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-2"
                >
                    <X size={14} /> Cancel search
                </button>
            ) : (
                <button
                    type="button"
                    onClick={onSearch}
                    disabled={!available || found}
                    className={`shrink-0 px-6 py-3 rounded-2xl font-mono text-xs font-black uppercase tracking-[0.2em] text-black flex items-center justify-center gap-2 transition-all enabled:hover:scale-[1.015] enabled:active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer ${theme?.solid || 'bg-cyan-500'} ${theme?.glow || ''}`}
                >
                    <Zap size={14} className="fill-current" /> {found ? 'Match found' : 'Find opponent'}
                </button>
            )}
        </motion.div>
    );
};
