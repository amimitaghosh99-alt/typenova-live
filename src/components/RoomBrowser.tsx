import React from 'react';
import { motion } from 'framer-motion';
import { Globe, LogIn, Trophy, Users, EyeOff } from 'lucide-react';
import type { Theme } from '@/data/constants';
import type { OpenRoom } from '@/hooks/useRoomDirectory';

interface RoomBrowserProps {
    theme: Theme;
    rooms: OpenRoom[];
    /** A join/create handshake is already in flight. */
    busy?: boolean;
    /** Whether rooms this client hosts get advertised here. */
    listPublicly: boolean;
    onToggleListPublicly: () => void;
    onJoin: (code: string) => void;
}

/**
 * Live list of rooms other players have opened.
 *
 * Without this, a room could only be found by someone the host handed a
 * 6-character code to — two strangers sitting on the compete screen at the same
 * moment had no way to end up in the same race.
 */
export const RoomBrowser: React.FC<RoomBrowserProps> = ({
    theme,
    rooms,
    busy = false,
    listPublicly,
    onToggleListPublicly,
    onJoin,
}) => (
    <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
        className="w-full glass-panel rounded-3xl border border-white/15 bg-black/40 p-5 flex flex-col gap-4 shadow-[0_12px_40px_rgba(0,0,0,0.4)]"
    >
        {/* ── Header ── */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-white/10 border border-white/15 text-white">
                    <Globe size={16} />
                </div>
                <div className="flex flex-col">
                    <span className="font-mono text-xs font-black uppercase tracking-widest text-white">
                        Open rooms
                        <span className="ml-2 font-bold text-[9px] text-zinc-300 bg-white/10 border border-white/15 px-1.5 py-0.5 rounded normal-case tracking-normal">
                            {rooms.length} live
                        </span>
                    </span>
                    <span className="font-mono text-[10px] text-zinc-400">Jump straight into a room somebody left open</span>
                </div>
            </div>

            {/* Publicity is the host's call, so it's stated plainly rather than
                buried in settings. Challenge and quick-match rooms are never
                advertised regardless of this switch. */}
            <button
                type="button"
                onClick={onToggleListPublicly}
                aria-pressed={listPublicly}
                className={`px-3 py-2 rounded-xl border font-mono text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center gap-2 ${listPublicly
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                    : 'bg-white/[0.04] border-white/12 text-zinc-400 hover:text-zinc-200 hover:border-white/25'
                    }`}
                title="Whether rooms you host appear in this list"
            >
                {listPublicly ? <Globe size={12} /> : <EyeOff size={12} />}
                {listPublicly ? 'My rooms are listed' : 'My rooms are private'}
            </button>
        </div>

        {/* ── List ── */}
        {rooms.length === 0 ? (
            <p className="font-mono text-[11px] text-zinc-500 px-1 py-2">
                Nothing open right now. Host one yourself — with listing on, it shows up here for everyone
                the moment it opens.
            </p>
        ) : (
            <ul className="flex flex-col gap-2 max-h-[240px] overflow-y-auto custom-scrollbar pr-1">
                {rooms.map((room) => (
                    <li
                        key={room.code}
                        className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-2xl bg-white/[0.04] border border-white/10 hover:border-white/25 transition-colors"
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
                                            <Trophy size={9} /> Ranked
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
                                <Users size={11} /> {room.players}/{room.size}
                            </span>
                            <button
                                type="button"
                                onClick={() => onJoin(room.code)}
                                disabled={busy}
                                className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-mono text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                            >
                                <LogIn size={12} /> Join
                            </button>
                        </div>
                    </li>
                ))}
            </ul>
        )}
    </motion.div>
);
