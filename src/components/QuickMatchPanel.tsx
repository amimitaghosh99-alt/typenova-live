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
 * The matchmaking queue already existed but was only reachable from RaceModal,
 * which nothing renders any more — so every player who wanted an opponent had
 * to find a human out-of-band and trade a 6-character code. This surfaces the
 * queue on the compete stage and, unlike the old modal, reports what it's
 * actually doing: how long you've waited, how many people are in the queue, and
 * how wide the skill window has opened.
 *
 * Searching is the state this panel exists for and it was the weakest one. The
 * layout was a single row — icon, label, status line, then several hundred pixels
 * of dead space, then Cancel — so the moment you pressed the button the panel
 * mostly stopped saying anything, and a generic spinner carried the entire burden
 * of "something is happening". Waiting in a queue with one other person online is
 * the common case, so this is the state that has to hold attention honestly.
 *
 * What fills that space now is the one thing the user actually wants to know and
 * the hook already computes: the Elo window widens on a fixed schedule and opens
 * to anyone at 30s, so a wait always terminates. The track below makes that
 * schedule visible — elapsed progress, a tick per widening step, and a countdown
 * to the next one — which turns an indefinite spinner into a bounded wait.
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

    /**
     * Repaint ticker for the elapsed readout. The hook only re-renders every 2s
     * on ping, which makes the timer visibly stutter.
     *
     * The timestamp has to live in state rather than being read at render:
     * `react-hooks/purity` rejects a bare `Date.now()` in the render body, and
     * rightly — it makes the component non-idempotent. What the previous version
     * got wrong was priming it with `setNow(Date.now())` inside the effect body,
     * which `react-hooks/set-state-in-effect` flags as a cascading render. The
     * priming line is simply unnecessary: `formatElapsed` clamps at zero, so a
     * value left over from before the queue started reads "0s" for at most one
     * 500ms tick, which is what it should say anyway.
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

    /** Idle bobs, searching breathes, found punches once. All of it off under
        `prefers-reduced-motion` — two of these looped forever, and a CSS
        `@media` guard cannot reach a Framer `animate` prop. */
    const iconMotion = reduce
        ? undefined
        : searching
            ? { scale: [1, 1.08, 1], transition: { repeat: Infinity, duration: 2, ease: EASE_OUT } }
            : found
                ? { scale: [1, 1.15, 1], transition: { duration: 0.3, ease: EASE_OUT } }
                : { y: [0, -3, 0], transition: { repeat: Infinity, duration: 3, ease: EASE_OUT } };

    return (
        <motion.div
            {...reveal(reduce, shellIn)}
            className={`w-full glass-panel !bg-[rgba(10,12,18,0.8)] backdrop-blur-[24px] rounded-3xl border p-5 flex flex-col gap-4 transition-colors ${
                searching ? 'border-emerald-500/50'
                : found ? 'border-emerald-500/60'
                : 'border-white/20'
            }`}
        >
            {/* ── Top row: identity + action ── */}
            <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <motion.div
                        animate={iconMotion}
                        className={`relative p-2.5 rounded-2xl border shrink-0 ${searching || found
                            ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                            : 'bg-white/10 border-white/15 text-white'
                            }`}
                    >
                        {/* Sonar rings, searching only. A spinner says "busy"; an
                            outward ping says "listening for someone out there",
                            which is what the queue is actually doing. Two rings
                            offset by half the cycle so the pulse never gaps. */}
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
                    <span className="font-mono text-xs font-black uppercase tracking-widest text-white flex items-center gap-2">
                        Quick match
                        {isLoggedIn ? (
                            <span className="inline-flex items-center gap-1 font-bold text-[9px] text-amber-200 bg-amber-950/70 border border-amber-500/40 px-1.5 py-0.5 rounded normal-case tracking-normal">
                                <Trophy size={9} aria-hidden="true" /> Ranked · {elo} Elo
                            </span>
                        ) : (
                            <span className="font-bold text-[9px] text-zinc-300 bg-black/60 border border-white/15 px-1.5 py-0.5 rounded normal-case tracking-normal">
                                Casual — sign in for Elo
                            </span>
                        )}
                    </span>

                    <AnimatePresence mode="wait">
                        {found ? (
                            <motion.span
                                key="found-text"
                                initial={reduce ? false : { opacity: 0, x: 16 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={reduce ? { opacity: 0 } : { opacity: 0, x: -16 }}
                                transition={springFluid}
                                className="font-mono text-[10px] text-emerald-300 truncate"
                            >
                                Matched with <span className="font-bold text-white">{state.opponentName || 'opponent'}</span>
                                {typeof state.opponentElo === 'number' && ` · ${state.opponentElo} Elo`} — opening room…
                            </motion.span>
                        ) : searching ? (
                            <motion.span
                                key="searching-text"
                                initial={reduce ? false : { opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="font-mono text-[10px] text-zinc-400"
                            >
                                Scanning the queue for an opponent
                            </motion.span>
                        ) : (
                            <motion.span
                                key="idle-text"
                                initial={reduce ? false : { opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="font-mono text-[11px] text-zinc-300"
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
                            whileHover={reduce ? undefined : { scale: 1.04, transition: springSnappy }}
                            whileTap={tapPress(reduce)}
                            className="shrink-0 min-h-[44px] px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-zinc-200 hover:text-white font-mono text-xs font-black uppercase tracking-widest transition-colors cursor-pointer flex items-center justify-center gap-2"
                        >
                            <X size={14} aria-hidden="true" /> Cancel search
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
                            whileHover={!available || found ? undefined : (reduce ? undefined : { scale: 1.04, transition: springSnappy })}
                            whileTap={!available || found ? undefined : tapPress(reduce)}
                            className={`shrink-0 min-h-[44px] px-6 py-3 rounded-2xl font-mono text-xs font-black uppercase tracking-[0.2em] text-black flex items-center justify-center gap-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer btn-shimmer ${theme?.solid || 'bg-cyan-500'} ${theme?.glow || ''}`}
                        >
                            <Zap size={14} className="fill-current" aria-hidden="true" /> {found ? 'Match found' : 'Find opponent'}
                        </motion.button>
                    )}
                </AnimatePresence>
            </div>
            {/* ── Wait telemetry ──
                Only while searching, and the reason the panel is two rows now
                instead of one. Three facts, each with somewhere to live: how long
                you've waited, who else is here, and how wide the window has opened.
                These were previously three fragments crammed into a 10px status
                line beside the title while the right half of the panel sat empty. */}
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
                        <div className="pt-1 flex flex-col gap-2">
                            <div className="flex items-center justify-between gap-3 flex-wrap font-mono text-[10px]">
                                <span className="flex items-center gap-3 text-zinc-400">
                                    <span className="tabular-nums text-zinc-100 font-bold text-xs">
                                        {formatElapsed(elapsed)}
                                    </span>
                                    <span className="inline-flex items-center gap-1">
                                        <Users size={10} aria-hidden="true" />
                                        {queueSize} in queue
                                    </span>
                                </span>

                                {/* The window is the one figure that changes on its
                                    own, so it gets a keyed swap — the value visibly
                                    steps rather than silently mutating. */}
                                <span className="flex items-center gap-2 text-zinc-400">
                                    <span>window</span>
                                    <AnimatePresence mode="wait">
                                        <motion.span
                                            key={bandLabel}
                                            initial={reduce ? false : { opacity: 0, y: -6 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 6 }}
                                            transition={springSnappy}
                                            className={`font-bold tabular-nums ${bandOpen ? 'text-emerald-300' : 'text-zinc-100'}`}
                                        >
                                            {bandLabel}
                                        </motion.span>
                                    </AnimatePresence>
                                    <span className="text-zinc-600">·</span>
                                    <span className="tabular-nums">
                                        {bandOpen ? 'matching anyone' : `widens in ${widenIn}s`}
                                    </span>
                                </span>
                            </div>

                            {/* The 30s ramp to an open window, drawn. This is what
                                makes the wait bounded rather than indefinite: the
                                fill reaches the end and the queue takes anyone.
                                Ticks mark each widening step. */}
                            <div
                                className="relative h-1.5 w-full rounded-full bg-white/[0.07] overflow-hidden"
                                role="progressbar"
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-valuenow={Math.round(rampProgress * 100)}
                                aria-label="Progress toward matching any rating"
                            >
                                <motion.div
                                    className="absolute inset-y-0 left-0 rounded-full bg-emerald-400/70"
                                    animate={{ width: `${rampProgress * 100}%` }}
                                    transition={reduce ? { duration: 0 } : { ease: 'linear', duration: 0.5 }}
                                />
                                {widenTicks.map((left) => (
                                    <span
                                        key={left}
                                        className="absolute top-0 bottom-0 w-px bg-black/50"
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
