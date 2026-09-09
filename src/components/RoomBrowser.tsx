import React, { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Globe, LogIn, Loader2, Trophy, Users, EyeOff, RotateCw, Radio, Play } from 'lucide-react';
import type { Theme } from '@/data/constants';
import type { OpenRoom } from '@/hooks/useRoomDirectory';
import { iconPop, listParent, reveal, rowChild, shellIn, springSnappy, tapPress } from '@/lib/motion';

interface RoomBrowserProps {
    theme: Theme;
    rooms: OpenRoom[];
    /** A join/create handshake is already in flight. */
    busy?: boolean;
    /**
     * The code being joined right now, if it came from this list. Without it
     * every row's button disabled itself off `busy` alone and nothing said which
     * one you clicked — the same defect the entry screen's `lastAction` state
     * exists to solve for Host and Join.
     */
    joiningCode?: string | null;
    /**
     * False until the Realtime channel has actually subscribed. `rooms` is `[]`
     * both before the directory answers and when the arena is genuinely empty,
     * and claiming "no rooms" during the subscribe window is a lie the user has
     * no way to tell from the truth.
     */
    connected?: boolean;
    /** Whether rooms this client hosts get advertised here. */
    listPublicly: boolean;
    onToggleListPublicly: () => void;
    onJoin: (code: string) => void;
    /** Trigger re-scanning presence directory. */
    onRefresh?: () => void;
    /** Quick-action to open a public room from the empty state. */
    onHostPublicRoom?: () => void;
}

/** How many placeholder rows to draw while the directory connects. */
const SKELETON_ROWS = 3;

interface RoomRowProps {
    room: OpenRoom;
    theme: Theme;
    reduce: boolean | null;
    /** Any handshake in flight, this row's or another's — the click is refused. */
    disabled: boolean;
    /** This row is the one being joined, so it owns the spinner. */
    joining: boolean;
    onJoin: (code: string) => void;
}

/**
 * One room in the list.
 *
 * Extracted so the join state stays per-row. Previously every button in the list
 * read the same parent-owned `busy` flag, so clicking Join on one room dimmed all
 * of them and nothing indicated which click had landed. That is the identical
 * defect `lastAction` already fixes for Host and Join on the entry screen; the
 * rail had simply never been given the same treatment.
 */
const RoomRow: React.FC<RoomRowProps> = ({ room, theme, reduce, disabled, joining, onJoin }) => (
    <motion.li
        variants={reduce ? undefined : rowChild}
        className={`flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl border transition-colors duration-150 ${joining
            ? 'bg-white/[0.07] border-white/25'
            : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/10 hover:border-white/25'
            }`}
    >
        <div className="flex items-center gap-3 min-w-0">
            <span
                className="font-mono text-base font-black tracking-[0.2em]"
                style={{ color: `rgb(${theme.glowPrimary})` }}
            >
                {room.code}
            </span>
            <div className="flex flex-col min-w-0">
                <span className="font-mono text-[11px] font-bold text-zinc-200 truncate">
                    {room.host || 'Host'}
                    {room.ranked && (
                        <span className="ml-1.5 inline-flex items-center gap-1 text-[9px] text-amber-300 font-bold">
                            <Trophy size={9} aria-hidden="true" /> Ranked
                        </span>
                    )}
                </span>
                <span className="font-mono text-[10px] text-zinc-500 truncate">
                    {room.mode} · {room.words} words
                </span>
            </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
            <span className="font-mono text-[10px] font-bold text-zinc-300 flex items-center gap-1 tabular-nums">
                <Users size={11} aria-hidden="true" /> {room.players}/{room.size}
            </span>
            <motion.button
                type="button"
                onClick={() => onJoin(room.code)}
                disabled={disabled}
                aria-busy={joining}
                aria-label={`Join room ${room.code}`}
                whileHover={disabled ? undefined : (reduce ? undefined : { scale: 1.06, transition: springSnappy })}
                whileTap={disabled ? undefined : tapPress(reduce, 0.95)}
                style={joining ? {
                    backgroundColor: `rgba(${theme.glowPrimary}, 0.25)`,
                    borderColor: `rgba(${theme.glowPrimary}, 0.5)`,
                    color: `rgb(${theme.glowPrimary})`,
                    boxShadow: `0 0 12px -2px rgba(${theme.glowPrimary}, 0.3)`
                } : undefined}
                className="min-h-[40px] px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-mono text-[10px] font-black uppercase tracking-widest transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
                {joining
                    ? <><Loader2 size={12} className="animate-spin" aria-hidden="true" /> Joining</>
                    : <><LogIn size={12} aria-hidden="true" /> Join</>}
            </motion.button>
        </div>
    </motion.li>
);

/**
 * Live list of rooms other players have opened.
 *
 * Without this, a room could only be found by someone the host handed a
 * 6-character code to — two strangers sitting on the compete screen at the same
 * moment had no way to end up in the same race.
 *
 * Surface: `.glass-card` for the material, plus an explicit dark fill. The tier
 * matters because `index.css:451-466` is explicit that a blurred layer nested in
 * another blurred layer costs a second full-surface filter pass and reads muddy —
 * but the fill matters just as much and for a different reason. `.glass-card`'s
 * own background is `rgba(255,255,255,0.018)`, i.e. effectively transparent, and
 * every piece of text in here is near-white. Auto-Fetch mode pulls the wallpaper
 * from whatever the user picked, so a cream or pastel image turns the whole panel
 * into light-on-light. The fill is what makes the text legible regardless of
 * what is behind it; only the blur was ever the thing worth removing.
 */
export const RoomBrowser: React.FC<RoomBrowserProps> = ({
    theme,
    rooms,
    busy = false,
    joiningCode = null,
    connected = true,
    listPublicly,
    onToggleListPublicly,
    onJoin,
    onRefresh,
    onHostPublicRoom,
}) => {
    const reduce = useReducedMotion();
    const connecting = !connected && rooms.length === 0;
    const [isRefreshing, setIsRefreshing] = useState(false);

    const handleRefresh = () => {
        if (isRefreshing) return;
        setIsRefreshing(true);
        onRefresh?.();
        setTimeout(() => setIsRefreshing(false), 600);
    };

    return (
        <motion.section
            {...reveal(reduce, shellIn)}
            aria-label="Open rooms"
            className="w-full glass-card !bg-[rgba(12,14,20,0.82)] rounded-2xl p-5 flex flex-col gap-4"
        >
            {/* ── Header ── */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2.5">
                    <motion.div
                        whileHover={iconPop(reduce, 8)}
                        className="p-2 rounded-xl bg-white/10 border border-white/15 text-white"
                    >
                        <Globe size={16} aria-hidden="true" />
                    </motion.div>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                            <h3 className="font-mono text-xs font-black uppercase tracking-widest text-white">
                                Open rooms
                            </h3>
                            {connecting ? (
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-white/5 border border-white/10 text-zinc-300 normal-case tracking-normal">
                                    <span className="relative flex h-1.5 w-1.5">
                                        <span
                                            className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                                            style={{ backgroundColor: `rgb(${theme.glowPrimary})` }}
                                        />
                                        <span
                                            className="relative inline-flex rounded-full h-1.5 w-1.5"
                                            style={{ backgroundColor: `rgb(${theme.glowPrimary})` }}
                                        />
                                    </span>
                                    Scanning…
                                </span>
                            ) : rooms.length > 0 ? (
                                <span
                                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold border normal-case tracking-normal"
                                    style={{
                                        backgroundColor: `rgba(${theme.glowPrimary}, 0.12)`,
                                        borderColor: `rgba(${theme.glowPrimary}, 0.35)`,
                                        color: `rgb(${theme.glowPrimary})`,
                                        boxShadow: `0 0 12px -2px rgba(${theme.glowPrimary}, 0.25)`
                                    }}
                                >
                                    <span className="relative flex h-1.5 w-1.5">
                                        <span
                                            className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                                            style={{ backgroundColor: `rgb(${theme.glowPrimary})` }}
                                        />
                                        <span
                                            className="relative inline-flex rounded-full h-1.5 w-1.5"
                                            style={{ backgroundColor: `rgb(${theme.glowPrimary})` }}
                                        />
                                    </span>
                                    {rooms.length} Live
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-white/5 border border-white/10 text-zinc-400 normal-case tracking-normal">
                                    <span className="h-1.5 w-1.5 rounded-full bg-zinc-500" />
                                    0 Live
                                </span>
                            )}
                        </div>
                        <span className="font-mono text-[10px] text-zinc-400">Jump straight into a room somebody left open</span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {onRefresh && (
                        <motion.button
                            type="button"
                            onClick={handleRefresh}
                            disabled={isRefreshing}
                            whileHover={reduce ? undefined : { scale: 1.05 }}
                            whileTap={tapPress(reduce, 0.95)}
                            className="p-2.5 rounded-xl bg-white/[0.06] hover:bg-white/10 border border-white/15 text-zinc-300 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
                            title="Re-scan rooms"
                            aria-label="Re-scan public rooms"
                        >
                            <RotateCw size={13} className={isRefreshing ? 'animate-spin' : ''} aria-hidden="true" />
                        </motion.button>
                    )}

                    {/* Publicity is the host's call, styled with dynamic theme colors */}
                    <motion.button
                        type="button"
                        onClick={onToggleListPublicly}
                        aria-pressed={listPublicly}
                        whileHover={reduce ? undefined : { scale: 1.03, transition: springSnappy }}
                        whileTap={tapPress(reduce, 0.96)}
                        style={listPublicly ? {
                            backgroundColor: `rgba(${theme.glowPrimary}, 0.16)`,
                            borderColor: `rgba(${theme.glowPrimary}, 0.45)`,
                            color: `rgb(${theme.glowPrimary})`,
                            boxShadow: `0 0 16px -2px rgba(${theme.glowPrimary}, 0.25)`
                        } : undefined}
                        className={`min-h-[38px] px-3 py-2 rounded-xl border font-mono text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center gap-2 ${listPublicly
                            ? ''
                            : 'bg-white/[0.06] border-white/15 text-zinc-300 hover:text-white hover:border-white/30'
                            }`}
                        title="Whether rooms you host appear in this list"
                    >
                        {listPublicly ? (
                            <Radio size={12} className="animate-pulse" aria-hidden="true" />
                        ) : (
                            <EyeOff size={12} aria-hidden="true" />
                        )}
                        {listPublicly ? 'My rooms are listed' : 'My rooms are private'}
                    </motion.button>
                </div>
            </div>

            {/* ── List ── */}
            {connecting ? (
                <ul aria-busy="true" aria-label="Loading rooms" className="flex flex-col gap-2">
                    {Array.from({ length: SKELETON_ROWS }, (_, i) => (
                        <li
                            key={i}
                            className="flex items-center justify-between gap-3 px-3.5 py-3 rounded-xl bg-white/[0.03] border border-white/[0.08] animate-pulse"
                        >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                <div className="h-5 w-20 rounded-md bg-white/10" />
                                <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                                    <div className="h-3 w-28 rounded bg-white/[0.07]" />
                                    <div className="h-2.5 w-20 rounded bg-white/[0.04]" />
                                </div>
                            </div>
                            <div className="h-8 w-16 rounded-xl bg-white/[0.06]" />
                        </li>
                    ))}
                </ul>
            ) : rooms.length === 0 ? (
                <motion.div
                    initial={reduce ? false : { opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={springSnappy}
                    className="font-mono px-4 py-4 rounded-xl bg-black/30 border border-white/[0.08] text-center flex flex-col items-center justify-center gap-1.5 relative overflow-hidden"
                >
                    {/* Radar pulse beacon */}
                    <div className="relative flex items-center justify-center w-10 h-10 rounded-full bg-white/[0.04] border border-white/10 mb-0.5">
                        <div
                            className="absolute inset-0 rounded-full animate-ping opacity-25"
                            style={{ backgroundColor: `rgb(${theme.glowPrimary})` }}
                        />
                        <Radio size={17} style={{ color: `rgb(${theme.glowPrimary})` }} aria-hidden="true" />
                    </div>

                    <span className="text-zinc-200 font-bold text-xs tracking-wide">
                        No active public rooms right now
                    </span>
                    <span className="text-zinc-400 text-[10px] max-w-[280px] leading-relaxed">
                        Host one yourself — with public listing enabled, your lobby broadcasts here in real time.
                    </span>

                    {onHostPublicRoom && (
                        <motion.button
                            type="button"
                            onClick={onHostPublicRoom}
                            whileHover={reduce ? undefined : { scale: 1.04 }}
                            whileTap={tapPress(reduce, 0.96)}
                            style={{
                                backgroundColor: `rgba(${theme.glowPrimary}, 0.16)`,
                                borderColor: `rgba(${theme.glowPrimary}, 0.45)`,
                                color: `rgb(${theme.glowPrimary})`,
                                boxShadow: `0 0 16px -2px rgba(${theme.glowPrimary}, 0.25)`
                            }}
                            className="mt-1 min-h-[36px] px-3.5 py-1.5 rounded-xl border font-mono text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center gap-2"
                        >
                            <Play size={11} className="fill-current" aria-hidden="true" />
                            Host a Public Room
                        </motion.button>
                    )}
                </motion.div>
            ) : (
                <motion.ul
                    {...reveal(reduce, listParent(0.06, 0.1))}
                    className="flex flex-col gap-2"
                >
                    {rooms.map((room) => {
                        const isJoiningThis = joiningCode === room.code;
                        const rowDisabled = busy || isJoiningThis;

                        return (
                            <RoomRow
                                key={room.code}
                                room={room}
                                theme={theme}
                                reduce={reduce}
                                disabled={rowDisabled}
                                joining={isJoiningThis}
                                onJoin={onJoin}
                            />
                        );
                    })}
                </motion.ul>
            )}
        </motion.section>
    );
};
