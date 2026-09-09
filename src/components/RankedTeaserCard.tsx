import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Trophy, Swords, Zap, ShieldCheck, LogIn, ArrowRight } from 'lucide-react';
import type { Theme } from '@/data/constants';
import { iconPop, reveal, shellIn, springSnappy, tapPress } from '@/lib/motion';

interface RankedTeaserCardProps {
    theme: Theme;
    onSignIn: () => void;
}

const TIERS = [
    { name: 'Bronze', elo: '800+', color: 'text-amber-600 border-amber-600/30 bg-amber-600/10' },
    { name: 'Silver', elo: '1100+', color: 'text-slate-300 border-slate-300/30 bg-slate-300/10' },
    { name: 'Gold', elo: '1300+', color: 'text-amber-300 border-amber-300/30 bg-amber-300/10' },
    { name: 'Diamond', elo: '1500+', color: 'text-cyan-300 border-cyan-300/30 bg-cyan-300/10' },
    { name: 'Master', elo: '1800+', color: 'text-purple-300 border-purple-300/30 bg-purple-300/10' },
];

/**
 * Competitive Ranked Ladder teaser shown to guest pilots in the Compete right rail.
 * Eliminates the empty guest void and provides a clear gateway into the ranked matchmaking system.
 */
export const RankedTeaserCard: React.FC<RankedTeaserCardProps> = ({ theme, onSignIn }) => {
    const reduce = useReducedMotion();

    return (
        <motion.section
            {...reveal(reduce, shellIn)}
            aria-label="Ranked arena overview"
            className="w-full glass-card !bg-[rgba(12,14,20,0.82)] rounded-2xl p-4 flex flex-col gap-3"
        >
            {/* ── Header ── */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                    <motion.div
                        whileHover={iconPop(reduce, 8)}
                        className="p-1.5 rounded-xl bg-white/10 border border-white/15 text-white"
                    >
                        <Trophy size={15} aria-hidden="true" />
                    </motion.div>
                    <div className="flex flex-col">
                        <h3 className="font-mono text-xs font-black uppercase tracking-widest text-white">
                            Ranked Arena
                        </h3>
                        <span className="font-mono text-[10px] text-zinc-400">
                            Competitive 1v1 ladder & Elo rating
                        </span>
                    </div>
                </div>

                <motion.span
                    initial={reduce ? false : { scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={springSnappy}
                    className="inline-flex items-center gap-1.5 font-mono text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg border"
                    style={{
                        backgroundColor: `rgba(${theme.glowPrimary}, 0.12)`,
                        borderColor: `rgba(${theme.glowPrimary}, 0.35)`,
                        color: `rgb(${theme.glowPrimary})`,
                        boxShadow: `0 0 14px -3px rgba(${theme.glowPrimary}, 0.25)`
                    }}
                >
                    <Swords size={10} aria-hidden="true" /> Season 1
                </motion.span>
            </div>

            {/* ── Value Props Grid ── */}
            <div className="grid grid-cols-1 gap-1.5">
                <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <div
                        className="p-1 rounded-md shrink-0"
                        style={{ backgroundColor: `rgba(${theme.glowPrimary}, 0.12)` }}
                    >
                        <Zap size={12} style={{ color: `rgb(${theme.glowPrimary})` }} aria-hidden="true" />
                    </div>
                    <div className="flex flex-col min-w-0">
                        <span className="font-mono text-[10px] font-bold text-zinc-200">Realtime Matchmaking</span>
                        <span className="font-mono text-[9px] text-zinc-400 truncate">Fair 1v1 duels against racers matched to your speed</span>
                    </div>
                </div>

                <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <div
                        className="p-1 rounded-md shrink-0"
                        style={{ backgroundColor: `rgba(${theme.glowPrimary}, 0.12)` }}
                    >
                        <ShieldCheck size={12} style={{ color: `rgb(${theme.glowPrimary})` }} aria-hidden="true" />
                    </div>
                    <div className="flex flex-col min-w-0">
                        <span className="font-mono text-[10px] font-bold text-zinc-200">Verified Rating & History</span>
                        <span className="font-mono text-[9px] text-zinc-400 truncate">Permanent win/loss record, transfer telemetry & ranking</span>
                    </div>
                </div>
            </div>

            {/* ── Tier Progression Preview ── */}
            <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-[9px] font-mono font-bold text-zinc-400 px-0.5">
                    <span>TIER LADDER</span>
                    <span>1000 STARTING ELO</span>
                </div>
                <div className="grid grid-cols-5 gap-1">
                    {TIERS.map((tier) => (
                        <div
                            key={tier.name}
                            className={`flex flex-col items-center py-1 px-0.5 rounded-lg border text-center ${tier.color}`}
                        >
                            <span className="font-mono text-[9px] font-black uppercase tracking-wider">{tier.name}</span>
                            <span className="font-mono text-[8px] opacity-75">{tier.elo}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Auth CTA Button ── */}
            <div className="flex flex-col gap-1">
                <motion.button
                    type="button"
                    onClick={onSignIn}
                    whileHover={reduce ? undefined : { scale: 1.02 }}
                    whileTap={tapPress(reduce, 0.97)}
                    style={{
                        backgroundColor: `rgba(${theme.glowPrimary}, 0.18)`,
                        borderColor: `rgba(${theme.glowPrimary}, 0.5)`,
                        color: `rgb(${theme.glowPrimary})`,
                        boxShadow: `0 0 20px -3px rgba(${theme.glowPrimary}, 0.3)`
                    }}
                    className="w-full min-h-[38px] px-3.5 py-2 rounded-xl border font-mono text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2 group"
                >
                    <LogIn size={12} className="group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
                    <span>Sign In to Play Ranked</span>
                    <ArrowRight size={11} className="group-hover:translate-x-1 transition-transform opacity-70" aria-hidden="true" />
                </motion.button>
                <span className="text-center font-mono text-[9px] text-zinc-500">
                    Casual rooms are open to everyone · Ranked duels require cloud pilot auth
                </span>
            </div>
        </motion.section>
    );
};
