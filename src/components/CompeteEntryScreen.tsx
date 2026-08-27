import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
    Radio, Users, Play, LogIn, ClipboardPaste, ArrowLeft, Swords, Trophy, WifiOff
} from 'lucide-react';
import { toast } from 'sonner';
import { SegmentedControl } from '@/components/SegmentedControl';
import type { Theme } from '@/data/constants';

interface CompeteEntryScreenProps {
    username: string;
    theme: Theme;
    themeTextClass?: string;
    defaultRoomSize?: number;
    /** A create/join handshake is in flight. */
    isBusy?: boolean;
    /** Last realtime failure, e.g. a bad code or a full room. */
    error?: string | null;
    /** False when Supabase credentials are missing — nothing can connect. */
    multiplayerAvailable?: boolean;
    /** Code that turned out to have no live room behind it, so we can offer to
        host it rather than leaving the user guessing at a typo. */
    emptyRoomCode?: string | null;
    onHostCode?: (code: string) => void;
    /** Quick-match strip, composed by App so this screen stays presentational.
        Sits at the top of the primary column, directly above host/join. */
    quickMatchSlot?: React.ReactNode;
    /** Right-rail panels — open-room browser, ranked record. Kept out of the
        primary column so browsing and history can never push the only two
        controls that start a race below the fold. */
    sidebarSlot?: React.ReactNode;
    onCreate: (size: number, isRanked: boolean) => void;
    onJoin: (code: string) => void;
    onBack: () => void;
}

/**
 * Accepts a bare code, a full invite link, or pasted junk around either.
 * Mirrors the parser in LobbyScreen so both entry points behave the same.
 */
const extractRoomCode = (raw: string): string => {
    const text = raw.trim().toUpperCase();
    try {
        if (text.includes('?')) {
            const url = new URL(text.startsWith('HTTP') ? text : `https://dummy.com/${text}`);
            const param = url.searchParams.get('room') || url.searchParams.get('race');
            if (param) return param.trim().toUpperCase().slice(0, 6);
        }
    } catch {
        // Not a URL — fall through to the raw scan.
    }
    const match = text.match(/[A-Z0-9]{6}/);
    if (match) return match[0];
    return text.replace(/[^A-Z0-9]/g, '').slice(0, 6);
};

/**
 * Landing screen for the compete stage.
 *
 * Replaces the old behaviour of silently auto-creating a room the moment the
 * stage opened: when that call failed (no credentials, dropped channel) the user
 * was parked in a ghost lobby with a blank room code, dead invite buttons and no
 * visible way to join anyone.
 *
 * Layout note: this screen used to cap itself at a hardcoded 1100px inside a
 * stage that is 1600px wide, then stack every panel — queue, room browser,
 * ranked history, host, join — in that one column. The two controls that
 * actually start a race ended up roughly 1200px down the page while 500px of
 * the stage sat empty. It's now a two-column cockpit at `xl`: actions left,
 * browse/history right.
 */
export const CompeteEntryScreen: React.FC<CompeteEntryScreenProps> = ({
    username,
    theme,
    themeTextClass = 'text-cyan-400',
    defaultRoomSize = 4,
    isBusy = false,
    error = null,
    multiplayerAvailable = true,
    emptyRoomCode = null,
    onHostCode,
    quickMatchSlot,
    sidebarSlot,
    onCreate,
    onJoin,
    onBack,
}) => {
    const [roomSize, setRoomSize] = useState<number>(defaultRoomSize);
    const [isRanked, setIsRanked] = useState(false);
    const [joinCode, setJoinCode] = useState('');
    const [joinError, setJoinError] = useState('');

    const disabled = isBusy || !multiplayerAvailable;
    // theme.glowPrimary is already a full `rgba(...)` string, so it can only be
    // used as-is — wrapping it in rgb() produced an invisible button.
    const accentClasses = `${theme?.solid || 'bg-cyan-500'} ${theme?.glow || ''}`;

    // Guests with no ladder get no right rail, so the actions take the full
    // width rather than leaving five dead columns.
    const hasSidebar = Boolean(sidebarSlot);

    const handlePaste = async () => {
        try {
            const text = await navigator.clipboard.readText();
            const parsed = extractRoomCode(text);
            if (parsed) {
                setJoinCode(parsed);
                setJoinError('');
                toast.info(`Pasted code: ${parsed}`);
            } else {
                toast.error('No valid 6-character room code found in clipboard');
            }
        } catch {
            toast.error('Failed to read clipboard. Paste the code manually.');
        }
    };

    const handleJoinSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const clean = extractRoomCode(joinCode);
        if (clean.length !== 6) {
            setJoinError('Room codes are exactly 6 characters');
            return;
        }
        setJoinError('');
        onJoin(clean);
    };

    const handleCreate = () => {
        onCreate(isRanked ? 2 : roomSize, isRanked);
    };

    return (
        <div className="w-full flex-1 min-h-0 flex flex-col gap-4 animate-in fade-in duration-300">

            {/* ── Header ── */}
            <motion.div
                initial={{ opacity: 0, y: -16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 320, damping: 26 }}
                className="shrink-0 flex flex-col items-center text-center gap-2"
            >
                <div className="flex items-center gap-2.5 px-4 py-1.5 rounded-full glass-panel border border-white/15 bg-black/40 font-mono text-[10px] font-black uppercase tracking-[0.25em] text-zinc-300">
                    <Radio size={13} className={multiplayerAvailable ? 'text-emerald-400 animate-pulse' : 'text-rose-400'} />
                    <span>{multiplayerAvailable ? 'Live multiplayer arena' : 'Arena offline'}</span>
                </div>
                <h1 className="font-display text-3xl md:text-4xl font-black tracking-tight text-white">
                    Race someone real
                </h1>
                <p className="font-mono text-xs text-zinc-400 max-w-xl">
                    Host a room and share the code, or drop in with a code a friend sent you.
                </p>
            </motion.div>

            {/* ── Blockers ── */}
            {!multiplayerAvailable && (
                <div
                    role="alert"
                    className="w-full shrink-0 px-5 py-4 rounded-2xl bg-amber-500/10 border border-amber-500/40 text-amber-200 font-mono text-[11px] leading-relaxed"
                >
                    <div className="flex items-center gap-2 font-black uppercase tracking-widest mb-1.5">
                        <WifiOff size={14} /> Multiplayer unavailable
                    </div>
                    Supabase credentials are missing, so no room can be opened. Add
                    <span className="text-white font-bold"> VITE_SUPABASE_URL </span> and
                    <span className="text-white font-bold"> VITE_SUPABASE_ANON_KEY </span>
                    to a <span className="text-white font-bold">.env</span> file (see
                    <span className="text-white font-bold"> .env.example</span>), then restart the dev server.
                </div>
            )}

            {error && (
                <div
                    role="alert"
                    aria-live="polite"
                    className="w-full shrink-0 px-4 py-2.5 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-300 font-mono text-[11px] font-bold uppercase tracking-widest flex items-center gap-2"
                >
                    <span aria-hidden="true">⚠️</span>
                    <span className="flex-1">{error}</span>
                    {/* Joining a code nobody hosts used to make you the silent
                        host of an empty room. Now it's an explicit offer. */}
                    {emptyRoomCode && onHostCode && (
                        <button
                            type="button"
                            onClick={() => onHostCode(emptyRoomCode)}
                            disabled={disabled}
                            className="shrink-0 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-mono text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            Host {emptyRoomCode} instead
                        </button>
                    )}
                </div>
            )}

            {/* ── Cockpit ──
                `flex-1 min-h-0` + per-column `xl:overflow-y-auto` is what keeps
                the stage to a single screen: at xl the columns scroll inside
                themselves instead of scrolling the whole page. */}
            <div className="w-full flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">

                {/* ═══ Primary column: queue → host → join ═══ */}
                <div className={`min-w-0 flex flex-col gap-4 xl:h-full xl:min-h-0 xl:overflow-y-auto custom-scrollbar ${hasSidebar ? 'xl:col-span-7' : 'xl:col-span-12'}`}>

                    {quickMatchSlot}

                    <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">

                        {/* HOST A ROOM */}
                        <motion.div
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.35, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
                            className="glass-panel rounded-3xl p-6 border border-white/15 bg-black/40 flex flex-col gap-5 shadow-[0_12px_40px_rgba(0,0,0,0.4)]"
                        >
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 rounded-xl bg-white/10 border border-white/15 text-white">
                                    <Users size={16} />
                                </div>
                                <div className="flex flex-col">
                                    <span className="font-mono text-xs font-black uppercase tracking-widest text-white">Host a room</span>
                                    <span className="font-mono text-[10px] text-zinc-400">You control the config and the start signal</span>
                                </div>
                            </div>

                            <div className={`flex flex-col gap-2 ${isRanked ? 'opacity-40 pointer-events-none' : ''}`}>
                                <div className="flex items-center gap-2">
                                    <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-300">// Room capacity</span>
                                    <span className="font-mono text-[9px] font-bold text-zinc-200 bg-zinc-800/80 border border-zinc-600/30 px-1.5 py-0.5 rounded">
                                        {isRanked ? '2 MAX' : `${roomSize} MAX`}
                                    </span>
                                </div>
                                <SegmentedControl
                                    options={[
                                        { label: '2 P', value: 2 },
                                        { label: '3 P', value: 3 },
                                        { label: '4 P', value: 4 },
                                    ]}
                                    value={isRanked ? 2 : roomSize}
                                    onChange={(v) => setRoomSize(Number(v))}
                                    theme={theme}
                                    themeTextClass={themeTextClass}
                                    size="sm"
                                    fullWidth
                                />
                            </div>

                            <button
                                type="button"
                                onClick={() => setIsRanked(v => !v)}
                                aria-pressed={isRanked}
                                className={`flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border font-mono text-[11px] font-black uppercase tracking-widest transition-all cursor-pointer ${isRanked
                                    ? 'bg-amber-500/15 border-amber-500/45 text-amber-300'
                                    : 'bg-white/[0.04] border-white/12 text-zinc-400 hover:text-zinc-200 hover:border-white/25'
                                    }`}
                            >
                                <span className="flex items-center gap-2">
                                    <Trophy size={14} /> Ranked duel
                                </span>
                                <span className="font-bold normal-case tracking-normal text-[10px] opacity-70">
                                    {isRanked ? '1v1 · Elo on the line' : 'Casual'}
                                </span>
                            </button>
                            {isRanked && (
                                <p className="font-mono text-[10px] text-zinc-500 -mt-3">
                                    Both racers must be signed in for Elo to apply.
                                </p>
                            )}

                            <button
                                type="button"
                                onClick={handleCreate}
                                disabled={disabled}
                                className={`mt-auto w-full font-mono text-sm uppercase tracking-[0.25em] py-3.5 rounded-2xl flex items-center justify-center gap-3 font-black text-black transition-all enabled:hover:scale-[1.015] enabled:active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer ${accentClasses}`}
                            >

                                <Play size={17} className="fill-current" />
                                <span>{isBusy ? 'Opening room…' : 'Create room'}</span>
                            </button>
                        </motion.div>

                        {/* JOIN WITH A CODE */}
                        <motion.div
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.35, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
                            className="glass-panel rounded-3xl p-6 border border-purple-500/25 bg-black/40 flex flex-col gap-5 shadow-[0_12px_40px_rgba(0,0,0,0.4)]"
                        >
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 rounded-xl bg-purple-500/20 border border-purple-500/35 text-purple-300">
                                    <Swords size={16} />
                                </div>
                                <div className="flex flex-col">
                                    <span className="font-mono text-xs font-black uppercase tracking-widest text-white">Join with a code</span>
                                    <span className="font-mono text-[10px] text-zinc-400">Paste a code or a full invite link</span>
                                </div>
                            </div>

                            {/* `flex-1` is what makes the submit button below line up
                                with "Create room" in the sibling card: without it the
                                form never grew inside the stretched grid item, so the
                                `mt-auto` on its last child resolved against the form's
                                own content box and did nothing. */}
                            <form onSubmit={handleJoinSubmit} className="flex flex-col gap-3 flex-1">
                                <label htmlFor="compete-room-code" className="font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-400 flex items-center justify-between">
                                    <span>Room access code</span>
                                    <span className="text-zinc-500">{joinCode.length} / 6</span>
                                </label>

                                <div className="relative flex items-center">
                                    <input
                                        id="compete-room-code"
                                        type="text"
                                        inputMode="text"
                                        autoComplete="off"
                                        spellCheck={false}
                                        value={joinCode}
                                        onChange={(e) => {
                                            setJoinCode(extractRoomCode(e.target.value));
                                            setJoinError('');
                                        }}
                                        placeholder="e.g. 3QG5KX"
                                        maxLength={30}
                                        aria-invalid={!!joinError}
                                        aria-describedby={joinError ? 'compete-room-code-error' : undefined}
                                        className="w-full pl-4 pr-24 py-3 rounded-2xl bg-black/60 border-2 border-white/15 focus:border-purple-400 focus:shadow-[0_0_25px_rgba(168,85,247,0.3)] text-white font-mono text-xl font-black tracking-[0.25em] text-center uppercase focus:outline-none transition-all placeholder:text-zinc-700 placeholder:tracking-normal placeholder:font-normal placeholder:text-sm"
                                    />
                                    <button
                                        type="button"
                                        onClick={handlePaste}
                                        className="absolute right-2.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-zinc-300 hover:text-white transition-all text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer active:scale-95"
                                        title="Paste from clipboard"
                                    >
                                        <ClipboardPaste size={13} />
                                        <span className="hidden sm:inline">Paste</span>
                                    </button>
                                </div>

                                {joinError && (
                                    <p id="compete-room-code-error" role="alert" className="font-mono text-[11px] font-bold text-rose-400 flex items-center gap-1.5">
                                        <span aria-hidden="true">⚠️</span> {joinError}
                                    </p>
                                )}

                                {/* Carries the `mt-auto` so the identity line and the
                                    submit stay welded to the bottom of the card. */}
                                <p className="mt-auto font-mono text-[10px] text-zinc-500">
                                    Racing as <span className="text-zinc-300 font-bold">{username || 'Player'}</span>
                                </p>

                                <button
                                    type="submit"
                                    disabled={disabled || joinCode.length < 6}
                                    className="w-full py-3.5 rounded-2xl bg-purple-600 enabled:hover:bg-purple-500 border border-purple-400/50 text-white font-mono font-black text-sm uppercase tracking-[0.25em] transition-all shadow-[0_0_25px_rgba(168,85,247,0.35)] enabled:hover:shadow-[0_0_35px_rgba(168,85,247,0.55)] flex items-center justify-center gap-3 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    <LogIn size={17} />
                                    <span>{isBusy ? 'Connecting…' : 'Join room'}</span>
                                </button>
                            </form>
                        </motion.div>
                    </div>
                </div>

                {/* ═══ Right rail: browse + history ═══
                    Scrolls on its own at xl — the ranked record is the tallest
                    thing here and it used to drag the whole page with it. */}
                {hasSidebar && (
                    <aside className="min-w-0 xl:col-span-5 flex flex-col gap-4 xl:h-full xl:min-h-0 xl:overflow-y-auto custom-scrollbar xl:pr-1">
                        {sidebarSlot}
                    </aside>
                )}
            </div>

            {/* ── Footer ── */}
            <div className="shrink-0 flex justify-center">
                <button
                    type="button"
                    onClick={onBack}
                    className="flex items-center gap-2 px-5 py-3 rounded-2xl glass-panel border border-white/10 text-zinc-400 hover:text-white hover:bg-white/10 font-mono text-xs font-bold uppercase tracking-widest transition-all cursor-pointer active:scale-95"
                >
                    <ArrowLeft size={14} /> Back to practice
                </button>
            </div>
        </div>
    );
};
