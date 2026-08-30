import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Globe, LogIn, Loader2, Trophy, Users, EyeOff } from 'lucide-react';
import type { Theme } from '@/data/constants';
import type { OpenRoom } from '@/hooks/useRoomDirectory';
import { hoverRow, iconPop, listParent, reveal, rowChild, shellIn, springSnappy, tapPress } from '@/lib/motion';

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
        whileHover={hoverRow(reduce)}
        className={`flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl border transition-colors ${joining
            ? 'bg-white/[0.07] border-white/25'
            : 'bg-white/[0.04] border-white/10 hover:border-white/25'
            }`}
    >
        <div className="flex items-center gap-3 min-w-0">
            <span className={`font-mono text-base font-black tracking-[0.2em] ${theme?.text || 'text-cyan-400'}`}>
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
}) => {
    const reduce = useReducedMotion();
    const connecting = !connected && rooms.length === 0;

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
                        <h3 className="font-mono text-xs font-black uppercase tracking-widest text-white">
                            Open rooms
                            <motion.span
                                key={connecting ? 'connecting' : rooms.length}
                                initial={reduce ? false : { scale: 1.3, opacity: 0.5 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={springSnappy}
                                className="ml-2 inline-block font-bold text-[9px] text-zinc-200 bg-white/10 border border-white/15 px-1.5 py-0.5 rounded normal-case tracking-normal"
                            >
                                {connecting ? 'connecting…' : `${rooms.length} live`}
                            </motion.span>
                        </h3>
                        <span className="font-mono text-[10px] text-zinc-400">Jump straight into a room somebody left open</span>
                    </div>
                </div>

                {/* Publicity is the host's call, so it's stated plainly rather than
                    buried in settings. Challenge and quick-match rooms are never
                    advertised regardless of this switch. */}
                <motion.button
                    type="button"
                    onClick={onToggleListPublicly}
                    aria-pressed={listPublicly}
                    whileHover={reduce ? undefined : { scale: 1.04, transition: springSnappy }}
                    whileTap={tapPress(reduce)}
                    className={`min-h-[40px] px-3 py-2 rounded-xl border font-mono text-[10px] font-black uppercase tracking-widest transition-colors cursor-pointer flex items-center gap-2 ${listPublicly
                        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-200'
                        : 'bg-white/[0.06] border-white/15 text-zinc-300 hover:text-white hover:border-white/30'
                        }`}
                    title="Whether rooms you host appear in this list"
                >
                    {listPublicly ? <Globe size={12} aria-hidden="true" /> : <EyeOff size={12} aria-hidden="true" />}
                    {listPublicly ? 'My rooms are listed' : 'My rooms are private'}
                </motion.button>
            </div>


            {/* ── List ──
                Three states, not two. `rooms.length === 0` used to mean "the
                arena is empty", but it is equally true while the Realtime
                channel is still subscribing, so the panel confidently reported
                an empty arena before it had finished asking. */}
            {connecting ? (
                <ul aria-busy="true" aria-label="Loading rooms" className="flex flex-col gap-2">
                    {Array.from({ length: SKELETON_ROWS }, (_, i) => (
                        <li
                            key={i}
                            className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.07]"
                        >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                <div className={`h-4 w-[5.5rem] rounded bg-white/10 ${reduce ? '' : 'animate-pulse'}`} />
                                <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                                    <div className={`h-2.5 w-24 rounded bg-white/[0.07] ${reduce ? '' : 'animate-pulse'}`} />
                                    <div className={`h-2 w-16 rounded bg-white/[0.05] ${reduce ? '' : 'animate-pulse'}`} />
                                </div>
                            </div>
                            <div className={`h-8 w-16 rounded-xl bg-white/[0.06] ${reduce ? '' : 'animate-pulse'}`} />
                        </li>
                    ))}
                </ul>
            ) : rooms.length === 0 ? (
                <motion.div
                    initial={reduce ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="font-mono text-[11px] text-zinc-300 px-4 py-4 rounded-xl bg-black/30 border border-white/[0.08] text-center flex flex-col items-center gap-1.5"
                >
                    <span className="text-zinc-200 font-bold">No active public rooms right now</span>
                    <span className="text-zinc-400 text-[10px]">Host one yourself — with listing on, it shows up here for everyone the moment it opens.</span>
                </motion.div>
            ) : (
                <motion.ul
                    {...reveal(reduce, listParent(0.06, 0.1))}
                    className="flex flex-col gap-2"
                >
                    {rooms.map((room) => {
                        /* Only the row you actually clicked reports progress. */
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
