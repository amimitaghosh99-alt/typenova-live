import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Zap, X, Swords, Trophy, Users, Radar } from 'lucide-react';
import type { Theme } from '@/data/constants';
import {
    ELO_BAND_INTERVAL_MS, ELO_BAND_OPEN, ELO_BAND_OPEN_MS,
    type MatchmakingState,
} from '@/hooks/useMatchmaking';
import { EASE_OUT, reveal, shellIn, springFluid, springSnappy, tapPress } from '@/lib/motion';

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

const formatElapsed = (ms: number) => {
    const total = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(total / 60);
    const s = total % 60;
    return m > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${s}s`;
};

/** Seconds until the Elo window next widens, or until it opens to anyone. */
const nextWidenIn = (elapsedMs: number): number => {
    if (elapsedMs >= ELO_BAND_OPEN_MS) return 0;
    const next = Math.min(
        Math.ceil((elapsedMs + 1) / ELO_BAND_INTERVAL_MS) * ELO_BAND_INTERVAL_MS,
        ELO_BAND_OPEN_MS,
    );
    return Math.max(0, Math.ceil((next - elapsedMs) / 1000));
};

/**
 * Quick Match: the one-click path into a real opponent.
 *
 * Surfaced on the compete stage with real-time queue telemetry: wait time,
 * queue population, and expanding rating window.
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
    const reduce = useReducedMotion();
    const searching = state.status === 'searching';
    const found = state.status === 'found';
    const accentRgb = theme?.glowPrimary || '6, 182, 212';
    const solidButtonStyle: React.CSSProperties = {
        backgroundColor: `rgb(${accentRgb})`,
        boxShadow: `0 0 20px rgba(${accentRgb}, 0.45)`,
        ...(theme?.glowSecondary ? {
            backgroundImage: `linear-gradient(135deg, rgb(${accentRgb}) 0%, rgb(${theme.glowSecondary}) 100%)`,
        } : {}),
    };

    /**
     * Repaint ticker for the elapsed readout. The hook only re-renders every 2s
     * on ping, which makes the timer visibly stutter.
     */
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        if (!searching) return;
        const id = setInterval(() => setNow(Date.now()), 500);
        return () => clearInterval(id);
    }, [searching]);

    const elapsed = searching && state.startedAt ? now - state.startedAt : 0;
    const band = state.eloBand ?? 0;
    const bandOpen = band >= ELO_BAND_OPEN;
    const bandLabel = bandOpen ? 'Any rating' : `±${band} Elo`;
    const queueSize = state.queueSize ?? 1;
    const widenIn = nextWidenIn(elapsed);
    /** 0→1 across the 30s ramp to an open window. Clamped, so a long wait pins
        at full rather than overflowing the track. */
    const rampProgress = Math.min(1, elapsed / ELO_BAND_OPEN_MS);
    /** Tick positions for each widening step, as percentages along the track. */
    const widenTicks = Array.from(
        { length: Math.floor(ELO_BAND_OPEN_MS / ELO_BAND_INTERVAL_MS) - 1 },
        (_, i) => ((i + 1) * ELO_BAND_INTERVAL_MS / ELO_BAND_OPEN_MS) * 100,
    );

    /** Searching breathes, found punches once. Idle remains calm to save GPU cycles. */
    const iconMotion = reduce
        ? undefined
        : searching
            ? { scale: [1, 1.08, 1], transition: { repeat: Infinity, duration: 2, ease: EASE_OUT } }
            : found
                ? { scale: [1, 1.15, 1], transition: { duration: 0.3, ease: EASE_OUT } }
                : undefined;

    return (
        <motion.div
            {...reveal(reduce, shellIn)}
            className={`w-full glass-panel !bg-[rgba(10,12,18,0.82)] hover:!bg-[rgba(14,16,24,0.88)] rounded-3xl border p-5 flex flex-col gap-4 transition-all duration-200 shadow-xl shadow-black/30 ${
                searching
                    ? 'border-emerald-500/50 shadow-[0_0_24px_rgba(16,185,129,0.15)]'
                    : found
                        ? 'border-emerald-400/60 shadow-[0_0_30px_rgba(16,185,129,0.25)]'
                        : 'border-white/15 hover:border-white/25'
            }`}
        >
            {/* ── Top row: identity + action ── */}
            <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex items-center gap-3.5 flex-1 min-w-0">
                    <motion.div
                        animate={iconMotion}
                        className={`relative p-2.5 rounded-2xl border shrink-0 transition-all ${
                            searching || found
                                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-[0_0_16px_rgba(16,185,129,0.25)]'
                                : 'border'
                        }`}
                        style={!searching && !found ? {
                            backgroundColor: `rgba(${accentRgb}, 0.12)`,
                            borderColor: `rgba(${accentRgb}, 0.35)`,
                            color: `rgb(${accentRgb})`,
                            boxShadow: `0 0 16px rgba(${accentRgb}, 0.15)`,
                        } : undefined}
                    >
                        {/* Sonar rings, searching only. */}
                        {searching && !reduce && (
                            <>
                                {[0, 1].map((i) => (
                                    <motion.span
                                        key={i}
                                        className="absolute inset-0 rounded-2xl border border-emerald-400/60 pointer-events-none"
                                        initial={{ opacity: 0.55, scale: 1 }}
                                        animate={{ opacity: 0, scale: 1.9 }}
                                        transition={{
                                            duration: 2.4,
                                            repeat: Infinity,
                                            delay: i * 1.2,
                                            ease: EASE_OUT,
                                        }}
                                        aria-hidden="true"
                                    />
                                ))}
                            </>
                        )}
                        <AnimatePresence mode="wait">
                            {searching ? (
                                <motion.span
                                    key="searching"
                                    initial={reduce ? false : { opacity: 0, rotate: -90 }}
                                    animate={{ opacity: 1, rotate: 0 }}
                                    exit={reduce ? { opacity: 0 } : { opacity: 0, rotate: 90 }}
                                    transition={{ duration: 0.2 }}
                                    className="relative block"
                                >
                                    <Radar size={18} aria-hidden="true" />
                                </motion.span>
                            ) : found ? (
                                <motion.span
                                    key="found"
                                    initial={reduce ? false : { opacity: 0, scale: 0.5 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.5 }}
                                    transition={springSnappy}
                                    className="relative block"
                                >
                                    <Swords size={18} aria-hidden="true" />
                                </motion.span>
                            ) : (
                                <motion.span
                                    key="idle"
                                    initial={reduce ? false : { opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="relative block"
                                >
                                    <Zap size={18} className="fill-current" aria-hidden="true" />
                                </motion.span>
                            )}
                        </AnimatePresence>
                    </motion.div>

                    <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs font-black uppercase tracking-[0.2em] text-white">
                                Quick match
                            </span>
                            {isLoggedIn ? (
                                <span className="inline-flex items-center gap-1 font-mono text-[9px] font-bold text-amber-200 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                    <Trophy size={9} aria-hidden="true" /> Ranked · {elo} Elo
                                </span>
                            ) : (
                                <span className="font-mono text-[9px] font-medium text-zinc-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                    Casual · Auto-paired
                                </span>
                            )}
                            <span className="hidden sm:inline-flex items-center gap-1.5 font-mono text-[9px] font-bold tracking-wider text-emerald-300 bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded-full">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                1v1 Queue
                            </span>
                        </div>

                        <AnimatePresence mode="wait">
                            {found ? (
                                <motion.span
                                    key="found-text"
                                    initial={reduce ? false : { opacity: 0, x: 16 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={reduce ? { opacity: 0 } : { opacity: 0, x: -16 }}
                                    transition={springFluid}
                                    className="font-mono text-[11px] font-bold text-emerald-300 truncate mt-0.5"
                                >
                                    Matched with <span className="text-white">{state.opponentName || 'opponent'}</span>
                                    {typeof state.opponentElo === 'number' && ` · ${state.opponentElo} Elo`} — opening room…
                                </motion.span>
                            ) : searching ? (
                                <motion.span
                                    key="searching-text"
                                    initial={reduce ? false : { opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="font-mono text-[11px] text-zinc-400 mt-0.5 flex items-center gap-2"
                                >
                                    <span>Scanning active pilots in matchmaking pool…</span>
                                </motion.span>
                            ) : (
                                <motion.span
                                    key="idle-text"
                                    initial={reduce ? false : { opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="font-mono text-[11px] text-zinc-400 mt-0.5"
                                >
                                    Drop into the queue and we'll pair you with the closest rating available
                                </motion.span>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* ── Action ── */}
                <AnimatePresence mode="wait">
                    {searching ? (
                        <motion.button
                            key="cancel"
                            type="button"
                            onClick={onCancel}
                            initial={reduce ? false : { opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.9 }}
                            whileHover={reduce ? undefined : { scale: 1.03, transition: springSnappy }}
                            whileTap={tapPress(reduce, 0.95)}
                            className="shrink-0 min-h-[46px] px-5 py-2.5 rounded-2xl bg-white/[0.05] hover:bg-rose-500/15 border border-white/15 hover:border-rose-500/30 text-zinc-300 hover:text-rose-200 font-mono text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 group shadow-sm"
                        >
                            <X size={14} className="transition-transform group-hover:rotate-90" aria-hidden="true" />
                            <span>Cancel search</span>
                        </motion.button>
                    ) : (
                        <motion.button
                            key="find"
                            type="button"
                            onClick={onSearch}
                            disabled={!available || found}
                            initial={reduce ? false : { opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.9 }}
                            whileHover={!available || found ? undefined : (reduce ? undefined : { scale: 1.03, transition: springSnappy })}
                            whileTap={!available || found ? undefined : tapPress(reduce, 0.95)}
                            style={solidButtonStyle}
                            className="shrink-0 min-h-[46px] px-6 py-2.5 rounded-2xl font-mono text-xs font-black uppercase tracking-[0.2em] text-black flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer btn-shimmer"
                        >
                            <Zap size={14} className="fill-current" aria-hidden="true" />
                            <span>{found ? 'Match found' : 'Find opponent'}</span>
                        </motion.button>
                    )}
                </AnimatePresence>
            </div>

            {/* ── Wait telemetry ── */}
            <AnimatePresence initial={false}>
                {searching && (
                    <motion.div
                        key="telemetry"
                        initial={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
                        transition={springFluid}
                        className="overflow-hidden"
                    >
                        <div className="pt-2 flex flex-col gap-2.5 border-t border-white/10">
                            <div className="flex items-center justify-between gap-3 flex-wrap font-mono text-[10px]">
                                <span className="flex items-center gap-3 text-zinc-400">
                                    <span className="tabular-nums text-white font-bold text-xs bg-white/10 border border-white/15 px-2 py-0.5 rounded-md">
                                        {formatElapsed(elapsed)}
                                    </span>
                                    <span className="inline-flex items-center gap-1.5 text-zinc-300">
                                        <Users size={11} className="text-zinc-400" aria-hidden="true" />
                                        <span className="font-bold text-white">{queueSize}</span> in queue
                                    </span>
                                </span>

                                <span className="flex items-center gap-2 text-zinc-400">
                                    <span className="uppercase text-[9px] tracking-wider text-zinc-500">Rating Window:</span>
                                    <AnimatePresence mode="wait">
                                        <motion.span
                                            key={bandLabel}
                                            initial={reduce ? false : { opacity: 0, y: -6 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 6 }}
                                            transition={springSnappy}
                                            className={`font-bold tabular-nums px-1.5 py-0.5 rounded ${bandOpen ? 'text-emerald-300 bg-emerald-500/15 border border-emerald-500/30' : 'text-zinc-100 bg-white/5 border border-white/10'}`}
                                        >
                                            {bandLabel}
                                        </motion.span>
                                    </AnimatePresence>
                                    <span className="text-zinc-600">·</span>
                                    <span className="tabular-nums text-zinc-300">
                                        {bandOpen ? 'matching anyone' : `widens in ${widenIn}s`}
                                    </span>
                                </span>
                            </div>

                            {/* The 30s ramp to an open window */}
                            <div
                                className="relative h-2 w-full rounded-full bg-black/40 border border-white/10 overflow-hidden"
                                role="progressbar"
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-valuenow={Math.round(rampProgress * 100)}
                                aria-label="Progress toward matching any rating"
                            >
                                <motion.div
                                    className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                                    animate={{ width: `${rampProgress * 100}%` }}
                                    transition={reduce ? { duration: 0 } : { ease: 'linear', duration: 0.5 }}
                                />
                                {widenTicks.map((left) => (
                                    <span
                                        key={left}
                                        className="absolute top-0 bottom-0 w-[2px] bg-black/70 z-10"
                                        style={{ left: `${left}%` }}
                                        aria-hidden="true"
                                    />
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};
