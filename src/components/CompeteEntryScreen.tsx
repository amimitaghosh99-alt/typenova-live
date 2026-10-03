import React, { memo, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { OTPInput, REGEXP_ONLY_DIGITS_AND_CHARS, type SlotProps } from 'input-otp';
import {
    Radio, Users, Play, LogIn, ClipboardPaste, ArrowLeft, Swords, Trophy, WifiOff,
    Loader2, Check, AlertTriangle, History, Zap
} from 'lucide-react';
import { toast } from 'sonner';
import { SegmentedControl } from '@/components/SegmentedControl';
import { useRecentRooms } from '@/hooks/useRecentRooms';
import {
    iconPop, listChild, listParent, reveal, shellIn, springFluid, springSnappy, tapPress,
} from '@/lib/motion';
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
    /** False when Supabase credentials are missing â€” nothing can connect. */
    multiplayerAvailable?: boolean;
    /** Code that turned out to have no live room behind it, so we can offer to
        host it rather than leaving the user guessing at a typo. */
    emptyRoomCode?: string | null;
    onHostCode?: (code: string) => void;
    /** Quick-match strip, composed by App so this screen stays presentational.
        Sits at the top of the primary column, directly above host/join. */
    quickMatchSlot?: React.ReactNode;
    /** Right-rail panels â€” open-room browser, ranked record. Kept out of the
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
    const trimmed = raw.trim();
    try {
        if (trimmed.includes('?')) {
            const url = new URL(trimmed.startsWith('http://') || trimmed.startsWith('https://') ? trimmed : `https://dummy.com/${trimmed}`);
            const param = url.searchParams.get('room') || url.searchParams.get('race') || url.searchParams.get('ROOM') || url.searchParams.get('RACE');
            if (param) return param.trim().toUpperCase().slice(0, 6);
        }
    } catch {
        // Not a standard URL — fall through
    }
    const queryMatch = trimmed.match(/(?:room|race)[=/]([A-Za-z0-9]{6})/i);
    if (queryMatch) return queryMatch[1].toUpperCase();

    const upper = trimmed.toUpperCase();
    const tokenMatch = upper.match(/\b[A-Z0-9]{6}\b/);
    if (tokenMatch) return tokenMatch[0];

    return upper.replace(/[^A-Z0-9]/g, '').slice(0, 6);
};

/* â”€â”€ SegmentedControl option sets â”€â”€
   Module-level so the arrays keep referential identity across renders:
   `SegmentedControl` memoises on its props and re-runs a GSAP layout effect
   whenever `options` changes, so an inline literal would restart the pill
   tween on every parent render. */
const CAPACITY_OPTIONS: { label: string; value: number }[] = [
    { label: '2 P', value: 2 },
    { label: '3 P', value: 3 },
    { label: '4 P', value: 4 },
];

type RaceMode = 'casual' | 'ranked';

const MODE_OPTIONS: { label: string; value: RaceMode }[] = [
    { label: 'Casual', value: 'casual' },
    { label: 'Ranked 1v1', value: 'ranked' },
];

/**
 * One box of the room-code field.
 *
 * Replaces a single wide input that faked optical centring with
 * `px-[68px] sm:px-[104px]` â€” asymmetric padding whose only purpose was to leave
 * room for the absolutely-positioned Paste button. Six boxes state the required
 * length structurally instead of via a `0 / 6` counter, and give per-character
 * position feedback while typing.
 *
 * `accentRgb` is the `"6, 182, 212"` triplet rather than a finished colour, so
 * this can build both the solid border and a translucent ring from it.
 */
const CodeSlot: React.FC<SlotProps & { invalid: boolean; accentRgb: string }> = ({
    char, isActive, invalid, accentRgb,
}) => (
    <div
        className={`relative flex-1 min-w-0 h-13 sm:h-14 rounded-xl border flex items-center justify-center font-mono text-lg sm:text-xl font-black transition-all duration-150 ${invalid
            ? 'border-rose-500/70 bg-rose-950/20 text-rose-200'
            : isActive
                ? 'bg-black/60 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)] text-white'
                : char
                    ? 'border-white/25 bg-white/[0.04] text-white shadow-sm'
                    : 'border-white/10 bg-black/35 text-zinc-600'
            }`}
        style={isActive && !invalid
            ? {
                borderColor: `rgb(${accentRgb})`,
                boxShadow: `0 0 16px rgba(${accentRgb}, 0.25), inset 0 2px 4px rgba(0,0,0,0.5)`,
            }
            : undefined}
    >
        {char ? (
            <span className="tracking-widest">{char}</span>
        ) : !isActive ? (
            <span className="w-1.5 h-1.5 rounded-full bg-white/15" />
        ) : null}
        {isActive && !char && (
            <span
                className="absolute h-5 w-[2px] animate-caret-blink rounded-full"
                style={{ backgroundColor: `rgb(${accentRgb})` }}
                aria-hidden="true"
            />
        )}
    </div>
);

/**
 * Landing screen for the compete stage.
 *
 * Replaces the old behaviour of silently auto-creating a room the moment the
 * stage opened: when that call failed (no credentials, dropped channel) the user
 * was parked in a ghost lobby with a blank room code, dead invite buttons and no
 * visible way to join anyone.
 *
 * Layout note: this screen used to cap itself at a hardcoded 1100px inside a
 * stage that is 1600px wide, then stack every panel â€” queue, room browser,
 * ranked history, host, join â€” in that one column. The two controls that
 * actually start a race ended up roughly 1200px down the page while 500px of
 * the stage sat empty. It's now a two-column cockpit at `xl`: actions left,
 * browse/history right.
 *
 * Scroll note: the columns used to be `xl:overflow-y-auto` inside a scrolling
 * page, which gave the screen four nested scroll regions â€” page, primary column,
 * rail, and the room list's own `max-h`. Which one a wheel event moved depended
 * on where the cursor happened to be. The actions are `xl:sticky` instead, so
 * they stay on screen while a long rail scrolls past in the page's single
 * scroller, and what leaves the viewport first is history rather than the two
 * buttons that start a race.
 *
 * Surface note: five blurred `.glass-panel` layers used to nest inside one
 * another here, which `index.css:451-466` explicitly warns against â€” each costs a
 * full-surface filter pass and the inner ones sample an already-blurred backdrop.
 * Blur is now reserved for the three action cards, which float over the wallpaper
 * and are the surfaces it actually reads on; the rail panels use `.glass-card`,
 * which keeps the material and drops the filter.
 *
 * Every panel and floating chip still sets an explicit dark fill. That is not
 * belt-and-braces: the wallpaper is user-supplied via Auto-Fetch, `.glass-panel`
 * and `.glass-card` are both near-transparent by design, and all the text here is
 * near-white â€” so against a cream or pastel image an unfilled surface renders
 * white-on-white. The fill is the legibility floor, independent of the blur.
 */
const CompeteEntryScreenImpl: React.FC<CompeteEntryScreenProps> = ({
    username,
    theme,
    themeTextClass = theme?.text || 'text-white',
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
    /** Which of the two buttons started the handshake. `isBusy` is a single
        parent-owned flag, so without this both buttons reported progress at
        once and the user could not tell which action was actually in flight. */
    const [lastAction, setLastAction] = useState<'create' | 'join' | null>(null);

    const reduce = useReducedMotion();
    const { recent, remember } = useRecentRooms();

    const disabled = isBusy || !multiplayerAvailable;
    /** Theme accent as an RGB triplet. Per GEMINI.md, dynamic theme binding
        with rgb() / rgba() is used for theme-sensitive elements so Auto-Fetch
        and wallpaper accents always render reliably without relying on uncompiled
        Tailwind class interpolations. */
    const accentRgb = theme?.glowPrimary || '34, 211, 238';

    const solidButtonStyle: React.CSSProperties = {
        backgroundColor: `rgb(${accentRgb})`,
        boxShadow: `0 0 25px rgba(${accentRgb}, 0.45)`,
        ...(theme?.glowSecondary ? {
            backgroundImage: `linear-gradient(135deg, rgb(${accentRgb}) 0%, rgb(${theme.glowSecondary}) 100%)`,
        } : {}),
    };

    const codeComplete = joinCode.length === 6;
    const creating = isBusy && lastAction === 'create';
    const joining = isBusy && lastAction === 'join';

    // Guests with no ladder get no right rail, so the actions take the full
    // width rather than leaving five dead columns.
    const hasSidebar = Boolean(sidebarSlot);

    // Dynamic glow color for CSS variable
    const glowColorStyle = theme?.glowPrimary
        ? { '--glow-color': `rgba(${theme.glowPrimary}, 0.45)` } as React.CSSProperties
        : undefined;

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

    /** Shared by the form and the recent-room chips so both record history. */
    const submitJoin = (rawCode: string) => {
        const clean = extractRoomCode(rawCode);
        if (clean.length !== 6) {
            setJoinError('Room codes are exactly 6 characters');
            return;
        }
        setJoinError('');
        setLastAction('join');
        remember(clean);
        onJoin(clean);
    };

    const handleJoinSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        submitJoin(joinCode);
    };

    const handleCreate = () => {
        setLastAction('create');
        onCreate(isRanked ? 2 : roomSize, isRanked);
    };

    return (
        <div className="w-full flex-1 min-h-0 flex flex-col gap-4 animate-in fade-in duration-300 pb-16">

            {/* â”€â”€ Header â”€â”€
                Was three stacked rows: a pill row, a `text-4xl` title, and a
                subtitle wrapped in its own blurred capsule â€” roughly 140px of
                chrome above a screen whose job is two buttons. The subtitle said
                "Host a room and share the code, or drop in with a code a friend
                sent you", which is the two card headings restated, and both cards
                carry their own subtitle already. One row now: title left, state
                and identity right. */}
            <motion.header
                {...reveal(reduce, listParent(0.06, 0.04))}
                className="shrink-0 flex flex-wrap items-center justify-between gap-x-4 gap-y-2"
            >
                <motion.h1
                    variants={reduce ? undefined : listChild}
                    className="font-display text-xl sm:text-2xl font-black tracking-tight text-white"
                    style={{
                        textShadow: theme?.glowPrimary
                            ? `0 0 28px rgba(${theme.glowPrimary}, 0.3)`
                            : '0 0 28px rgba(34, 211, 238, 0.3)',
                    }}
                >
                    Race someone real
                </motion.h1>

                <motion.div variants={reduce ? undefined : listChild} className="flex flex-wrap items-center gap-2">
                    {/* Connection state. Colour is never the only signal â€” the
                        icon swaps and the label spells the state out.

                        These chips float directly over the wallpaper rather than
                        over a panel, so their fill has to be opaque enough to carry
                        near-white text against a light Auto-Fetch image. */}
                    <div
                        role="status"
                        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[rgba(12,14,20,0.85)] border border-white/15 font-mono text-[10px] font-black uppercase tracking-[0.18em] text-zinc-100 compete-glow-ring"
                        style={glowColorStyle}
                    >
                        {multiplayerAvailable ? (
                            <Radio
                                size={12}
                                className="animate-glow-pulse shrink-0"
                                aria-hidden="true"
                                style={theme?.glowPrimary
                                    ? { color: `rgb(${theme.glowPrimary})` }
                                    : { color: 'rgb(52, 211, 153)' }}
                            />
                        ) : (
                            <WifiOff size={12} className="shrink-0 text-rose-400" aria-hidden="true" />
                        )}
                        <span>{multiplayerAvailable ? 'Arena live' : 'Arena offline'}</span>
                    </div>

                    {/* One identity statement for the whole screen. */}
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[rgba(12,14,20,0.85)] border border-white/12 font-mono text-[10px] text-zinc-300">
                        <Users size={11} className="shrink-0 text-zinc-500" aria-hidden="true" />
                        <span>Racing as <span className="text-white font-bold">{username || 'Player'}</span></span>
                    </div>
                </motion.div>
            </motion.header>

            {/* â”€â”€ Blockers â”€â”€ */}
            <AnimatePresence>
                {!multiplayerAvailable && (
                    <motion.div
                        initial={reduce ? false : { opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
                        transition={springFluid}
                        role="alert"
                        className="w-full shrink-0 px-5 py-4 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-100 font-mono text-[11px] leading-relaxed"
                    >
                        <div className="flex items-center gap-2 font-black uppercase tracking-widest mb-1.5">
                            <WifiOff size={14} aria-hidden="true" /> Multiplayer unavailable
                        </div>
                        Supabase credentials are missing, so no room can be opened. Add
                        <span className="text-white font-bold"> VITE_SUPABASE_URL </span> and
                        <span className="text-white font-bold"> VITE_SUPABASE_ANON_KEY </span>
                        to a <span className="text-white font-bold">.env</span> file (see
                        <span className="text-white font-bold"> .env.example</span>), then restart the dev server.
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Realtime failures â€” a bad code, a full room, a dropped channel.
                Was uppercase with `tracking-widest`, which is fine for a
                two-word label and actively hard to read for a sentence, and it
                led with an emoji that screen readers announce inconsistently. */}
            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={reduce ? false : { opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={reduce ? { opacity: 0 } : { opacity: 0, x: 12 }}
                        transition={springFluid}
                        role="alert"
                        aria-live="polite"
                        className="w-full shrink-0 px-4 py-3 rounded-2xl bg-rose-500/20 border border-rose-500/45 text-rose-100 font-mono text-xs leading-relaxed flex flex-wrap items-center gap-x-3 gap-y-2"
                    >
                        <AlertTriangle size={15} className="shrink-0 text-rose-300" aria-hidden="true" />
                        <span className="flex-1 min-w-0 font-bold">{error}</span>
                        {emptyRoomCode && onHostCode && (
                            <button
                                type="button"
                                onClick={() => {
                                    setLastAction('create');
                                    onHostCode(emptyRoomCode);
                                }}
                                disabled={disabled}
                                className="shrink-0 min-h-[38px] px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-white font-mono text-[11px] font-black uppercase tracking-widest transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                Host {emptyRoomCode} instead
                            </button>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* â”€â”€ Cockpit â”€â”€
                `items-start` matters: it lets the sticky primary column work.
                A stretched grid item is as tall as the row, so `position: sticky`
                inside it has nowhere to travel. */}
            <div className="w-full grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">

                {/* â•â•â• Primary column: queue â†’ host â†’ join â•â•â•
                    Sticky rather than independently scrollable. The goal â€” never
                    push Create/Join below the fold â€” is the same one the internal
                    scroller was protecting; this achieves it without giving the
                    screen a second scroll region. */}
                <section
                    aria-label="Start a race"
                    className={`min-w-0 flex flex-col gap-4 xl:sticky xl:top-4 xl:self-start ${hasSidebar ? 'xl:col-span-7' : 'xl:col-span-12'}`}
                >

                    {quickMatchSlot}

                    <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">

                        {/* â•â•â• HOST A ROOM â•â•â•
                            Was: a capacity SegmentedControl that dimmed itself to
                            `opacity-40` whenever ranked mode was on, plus a
                            separate ranked toggle underneath it. Dimming a
                            control the mode had already overridden left the user
                            reading a disabled widget to find out what mode they
                            were in. Mode is now the first decision, and capacity
                            only renders when it can actually be changed. */}
                        <motion.div
                            {...reveal(reduce, shellIn)}
                            className="glass-panel !bg-[rgba(10,12,18,0.82)] hover:!bg-[rgba(14,16,24,0.88)] rounded-3xl p-5 sm:p-6 border border-white/15 hover:border-white/25 transition-all duration-200 flex flex-col gap-4 shadow-xl shadow-black/30"
                        >
                            <div className="flex items-center gap-3">
                                <motion.div
                                    whileHover={iconPop(reduce)}
                                    className="shrink-0 p-2.5 rounded-2xl bg-white/10 border border-white/20 text-white"
                                >
                                    <Users size={17} aria-hidden="true" />
                                </motion.div>
                                <div className="flex flex-col min-w-0">
                                    <h2 className="font-mono text-xs font-black uppercase tracking-widest text-white">Host a room</h2>
                                    <span className="font-mono text-[11px] text-zinc-400">You control config & start signal</span>
                                </div>
                            </div>

                            {/* Mode. Two mutually exclusive states belong in a
                                segmented control, not a toggle button whose
                                pressed state had to be inferred from colour. */}
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center justify-between">
                                    <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-400">// Race mode</span>
                                    <span className="font-mono text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/5 text-zinc-400 border border-white/10">
                                        {isRanked ? '1v1 Duel' : 'Casual Lobby'}
                                    </span>
                                </div>
                                <SegmentedControl
                                    options={MODE_OPTIONS}
                                    value={isRanked ? 'ranked' : 'casual'}
                                    onChange={(v) => setIsRanked(v === 'ranked')}
                                    theme={theme}
                                    themeTextClass={themeTextClass}
                                    size="md"
                                    fullWidth
                                />
                                <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 font-mono text-[10px] leading-relaxed text-zinc-400 min-h-[3.25em] flex items-center">
                                    {isRanked
                                        ? '1v1 only. Elo on the line â€” both racers must be signed in.'
                                        : 'Up to four racers. Nothing at stake â€” pure practice.'}
                                </div>
                            </div>

                            {/* Capacity. In a ranked duel the value is fixed at 2,
                                so the control is replaced by a plain readout
                                rather than dimmed to `opacity-40` â€” a disabled
                                widget was the only place the "2 MAX" fact was
                                stated. The row keeps its height either way so
                                switching modes never moves the button below. */}
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-400">// Room capacity</span>
                                    <span className="font-mono text-[10px] font-bold text-zinc-100 bg-white/10 border border-white/15 px-2 py-0.5 rounded-md shadow-sm tabular-nums">
                                        {isRanked ? 2 : roomSize} max
                                    </span>
                                </div>
                                {isRanked ? (
                                    <div className="min-h-[45px] flex items-center justify-center gap-2 rounded-full bg-amber-500/10 border border-amber-500/30 px-4 font-mono text-[11px] font-black uppercase tracking-widest text-amber-200">
                                        <Trophy size={13} className="shrink-0 text-amber-300" aria-hidden="true" />
                                        Ranked duel Â· 2 P
                                    </div>
                                ) : (
                                    <SegmentedControl
                                        options={CAPACITY_OPTIONS}
                                        value={roomSize}
                                        onChange={(v) => setRoomSize(Number(v))}
                                        theme={theme}
                                        themeTextClass={themeTextClass}
                                        size="md"
                                        fullWidth
                                    />
                                )}
                            </div>

                            <motion.button
                                type="button"
                                onClick={handleCreate}
                                disabled={disabled}
                                aria-busy={creating}
                                whileHover={disabled ? undefined : (reduce ? undefined : { scale: 1.02, transition: springSnappy })}
                                whileTap={disabled ? undefined : tapPress(reduce)}
                                style={solidButtonStyle}
                                className="mt-auto w-full min-h-[52px] font-mono text-sm uppercase tracking-[0.25em] py-3.5 rounded-2xl flex items-center justify-center gap-3 font-black text-black transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer btn-shimmer"
                            >
                                {creating
                                    ? <Loader2 size={17} className="animate-spin" aria-hidden="true" />
                                    : <Play size={17} className="fill-current" aria-hidden="true" />}
                                <span>{creating ? 'Opening roomâ€¦' : isRanked ? 'Open ranked duel' : 'Create room'}</span>
                            </motion.button>
                        </motion.div>

                        {/* â•â•â• JOIN WITH A CODE â•â•â•
                            Every accent here used to be hardcoded purple â€”
                            border, icon chip, input focus ring, submit gradient â€”
                            while the host card beside it followed `theme`. Under
                            Auto-Fetch the two cards drifted apart, and
                            purple/indigo is the most recognisable
                            machine-generated-UI tell there is. All four now bind
                            to `theme.glowPrimary`, per `GEMINI.md`. */}
                        <motion.div
                            {...reveal(reduce, shellIn)}
                            className="glass-panel !bg-[rgba(10,12,18,0.82)] hover:!bg-[rgba(14,16,24,0.88)] rounded-3xl p-5 sm:p-6 border transition-all duration-200 flex flex-col gap-4 shadow-xl shadow-black/30"
                            style={{ borderColor: `rgba(${accentRgb}, 0.35)` }}
                        >
                            <div className="flex items-center gap-3">
                                <motion.div
                                    whileHover={iconPop(reduce)}
                                    className="shrink-0 p-2.5 rounded-2xl border"
                                    style={{
                                        backgroundColor: `rgba(${accentRgb}, 0.18)`,
                                        borderColor: `rgba(${accentRgb}, 0.4)`,
                                        color: `rgb(${accentRgb})`,
                                    }}
                                >
                                    <Swords size={17} aria-hidden="true" />
                                </motion.div>
                                <div className="flex flex-col min-w-0">
                                    <h2 className="font-mono text-xs font-black uppercase tracking-widest text-white">Join with a code</h2>
                                    <span className="font-mono text-[11px] text-zinc-400">Paste a code or full invite link</span>
                                </div>
                            </div>

                            <form onSubmit={handleJoinSubmit} className="flex flex-col gap-3 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                    <span id="compete-room-code-label" className="font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                                        // Room access code
                                    </span>
                                    {/* Completion is confirmed in a second channel
                                        (icon + colour), so the boxes filling up is
                                        not the only cue the button has unlocked. */}
                                    <AnimatePresence>
                                        {codeComplete && (
                                            <motion.span
                                                initial={reduce ? false : { scale: 0.6, opacity: 0 }}
                                                animate={{ scale: 1, opacity: 1 }}
                                                exit={reduce ? { opacity: 0 } : { scale: 0.6, opacity: 0 }}
                                                transition={springSnappy}
                                                className="flex items-center gap-1 font-mono text-[10px] font-bold uppercase tracking-widest text-emerald-300"
                                            >
                                                <Check size={11} className="shrink-0" aria-hidden="true" /> Ready
                                            </motion.span>
                                        )}
                                    </AnimatePresence>
                                </div>

                                {/* Six discrete boxes instead of one wide input.
                                    The old field carried `px-[68px] sm:px-[104px]`
                                    purely to fake optical centring around the
                                    absolutely-positioned Paste button, and needed a
                                    `0 / 6` counter to state the required length.
                                    Both are structural now. `input-otp` owns the
                                    keyboard model â€” arrows, backspace across boxes,
                                    select-all, native paste â€” which is the part
                                    that is tedious to get right by hand. */}
                                <div className="flex items-center gap-2">
                                    <OTPInput
                                        id="compete-room-code"
                                        maxLength={6}
                                        value={joinCode}
                                        onChange={(next) => {
                                            setJoinCode(extractRoomCode(next));
                                            setJoinError('');
                                        }}
                                        /* A complete code submits itself â€” six
                                           characters is the entire input, so making
                                           the user then reach for a button is a step
                                           with no decision left in it. This fires on
                                           the transition to full, so typing, pasting
                                           and picking a recent chip all join. The
                                           explicit button stays for the one case this
                                           misses: retrying the *same* code after a
                                           failure, where the length never changes. */
                                        onComplete={(next) => {
                                            if (!disabled) submitJoin(next);
                                        }}
                                        disabled={disabled}
                                        /* Anchored, so a stray `-` or space is
                                           refused at the source rather than being
                                           silently stripped a step later. */
                                        pattern={REGEXP_ONLY_DIGITS_AND_CHARS}
                                        /* Native Ctrl+V would otherwise be truncated
                                           to the first six characters of whatever is
                                           on the clipboard, which turns a pasted
                                           invite URL into garbage ("HTTPS:"). Routing
                                           it through the same parser the Paste button
                                           uses keeps the "a full invite link works
                                           too" promise true for both paths. */
                                        pasteTransformer={extractRoomCode}
                                        inputMode="text"
                                        autoComplete="off"
                                        aria-labelledby="compete-room-code-label"
                                        aria-invalid={!!joinError}
                                        aria-describedby={joinError ? 'compete-room-code-error' : 'compete-room-code-hint'}
                                        containerClassName="flex-1 min-w-0 flex items-center gap-1.5 sm:gap-2 has-[:disabled]:opacity-40"
                                        render={({ slots }) => (
                                            <>
                                                {slots.map((slot, i) => (
                                                    <CodeSlot
                                                        key={i}
                                                        {...slot}
                                                        invalid={!!joinError}
                                                        accentRgb={accentRgb}
                                                    />
                                                ))}
                                            </>
                                        )}
                                    />
                                    {/* No longer overlapping the field, so nothing
                                        needs padding around it. */}
                                    <motion.button
                                        type="button"
                                        onClick={handlePaste}
                                        disabled={disabled}
                                        aria-label="Paste room code from clipboard"
                                        title="Paste from clipboard"
                                        whileHover={reduce ? undefined : { scale: 1.04, transition: springSnappy }}
                                        whileTap={tapPress(reduce, 0.94)}
                                        className="shrink-0 h-13 sm:h-14 w-12 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 hover:border-white/30 text-zinc-300 hover:text-white transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-sm group"
                                    >
                                        <ClipboardPaste size={15} style={{ color: `rgb(${accentRgb})` }} className="transition-transform group-hover:scale-110" aria-hidden="true" />
                                        <span className="font-mono text-[8px] font-bold uppercase tracking-wider text-zinc-400 group-hover:text-zinc-200">Paste</span>
                                    </motion.button>
                                </div>

                                <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 font-mono text-[10px] leading-relaxed text-zinc-400 min-h-[3.25em] flex items-center gap-2">
                                    <Zap size={13} className="shrink-0" style={{ color: `rgb(${accentRgb})` }} aria-hidden="true" />
                                    <span>Instant Connect: auto-joins on 6th char. Pasted invite URLs automatically resolve.</span>
                                </div>

                                {/* Recent rooms. The screen had no memory at all:
                                    leaving a room and coming back meant retyping
                                    the code from wherever you had stashed it.
                                    Local-only, and a chip is only a shortcut to
                                    typing six characters â€” a dead code still fails
                                    exactly as it would if typed by hand. */}
                                {recent.length > 0 && (
                                    <motion.div
                                        {...reveal(reduce, listParent(0.05, 0))}
                                        className="flex items-center gap-2 flex-wrap"
                                    >
                                        <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-1">
                                            <History size={10} aria-hidden="true" /> Recent
                                        </span>
                                        {recent.map((room) => (
                                            <motion.button
                                                key={room.code}
                                                type="button"
                                                variants={reduce ? undefined : listChild}
                                                /* Fills the field rather than joining
                                                   directly. `onComplete` fires only on
                                                   the transition to six characters, so
                                                   a chip clicked while the field is
                                                   empty joins immediately, but one
                                                   clicked while a failed code is still
                                                   in the boxes just replaces it â€”
                                                   calling `submitJoin` here as well
                                                   would double-fire the handshake in
                                                   the first case. The explicit Join
                                                   button covers the second. */
                                                onClick={() => {
                                                    setJoinCode(room.code);
                                                    setJoinError('');
                                                }}
                                                disabled={disabled}
                                                aria-label={`Use recent room code ${room.code}`}
                                                whileHover={reduce ? undefined : { scale: 1.05, transition: springSnappy }}
                                                whileTap={tapPress(reduce, 0.95)}
                                                className="min-h-[28px] px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 hover:border-white/25 font-mono text-[11px] font-bold tracking-[0.15em] text-zinc-300 hover:text-white transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                            >
                                                {room.code}
                                            </motion.button>
                                        ))}
                                    </motion.div>
                                )}

                                {/* Reserve the row so validation never nudges the
                                    submit button downward mid-interaction. */}
                                <div className="min-h-[26px]">
                                    <AnimatePresence mode="wait" initial={false}>
                                        {joinError ? (
                                            <motion.p
                                                key="error"
                                                initial={reduce ? false : { opacity: 0, y: -6 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
                                                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                                                id="compete-room-code-error"
                                                role="alert"
                                                className="font-mono text-[11px] font-bold text-rose-200 flex items-center gap-1.5 bg-rose-500/15 border border-rose-500/30 px-2.5 py-1 rounded-xl"
                                            >
                                                <AlertTriangle size={12} className="shrink-0 text-rose-300" aria-hidden="true" />
                                                {joinError}
                                            </motion.p>
                                        ) : (
                                            <motion.p
                                                key="hint"
                                                initial={reduce ? false : { opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                id="compete-room-code-hint"
                                                className="font-mono text-[10px] text-zinc-500 px-1"
                                            >
                                                Six letters or digits. A full invite link works too.
                                            </motion.p>
                                        )}
                                    </AnimatePresence>
                                </div>

                                {/* `mt-auto` keeps this button on the same baseline
                                    as "Create room" in the taller host card. */}
                                <motion.button
                                    type="submit"
                                    disabled={disabled || !codeComplete}
                                    aria-busy={joining}
                                    whileHover={disabled || !codeComplete ? undefined : (reduce ? undefined : { scale: 1.02, transition: springSnappy })}
                                    whileTap={disabled || !codeComplete ? undefined : tapPress(reduce)}
                                    style={codeComplete && !disabled ? solidButtonStyle : undefined}
                                    className={`mt-auto w-full min-h-[52px] py-3.5 rounded-2xl font-mono font-black text-sm uppercase tracking-[0.25em] transition-all flex items-center justify-center gap-3 ${
                                        codeComplete && !disabled
                                            ? 'btn-shimmer text-black'
                                            : 'bg-white/[0.04] text-zinc-500 border border-white/10 cursor-not-allowed'
                                    }`}
                                >
                                    {joining
                                        ? <Loader2 size={17} className="animate-spin" aria-hidden="true" />
                                        : <LogIn size={17} aria-hidden="true" />}
                                    <span>{joining ? 'Connectingâ€¦' : codeComplete ? 'Join room' : 'Enter 6-digit code'}</span>
                                </motion.button>
                            </form>
                        </motion.div>
                    </div>
                </section>

                {/* â•â•â• Right rail: browse + history â•â•â•
                    No `overflow-y-auto` here either. The rail is allowed to be as
                    tall as its content and the page scrolls it, which is why the
                    actions opposite are sticky. */}
                {hasSidebar && (
                    <aside
                        aria-label="Find a room"
                        className="min-w-0 xl:col-span-5 flex flex-col gap-4"
                    >
                        {sidebarSlot}
                    </aside>
                )}
            </div>

            {/* â”€â”€ Footer â”€â”€ */}
            <motion.div
                initial={reduce ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={springFluid}
                className="shrink-0 flex justify-center pt-1"
            >
                <motion.button
                    type="button"
                    onClick={onBack}
                    whileHover={reduce ? undefined : { scale: 1.04, y: -2, transition: springSnappy }}
                    whileTap={tapPress(reduce, 0.96)}
                    className="flex items-center gap-2 min-h-[44px] px-5 py-2.5 rounded-2xl bg-[rgba(12,14,20,0.85)] border border-white/12 text-zinc-300 hover:text-white hover:bg-white/10 font-mono text-xs font-bold uppercase tracking-widest transition-colors cursor-pointer"
                >
                    <ArrowLeft size={14} aria-hidden="true" /> Back to practice
                </motion.button>
            </motion.div>
        </div>
    );
};

export const CompeteEntryScreen = memo(CompeteEntryScreenImpl);

