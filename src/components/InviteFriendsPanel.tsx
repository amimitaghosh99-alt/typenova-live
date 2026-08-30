import React, { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { UserPlus, Check, Search, UserX, Loader2, Circle, Send } from 'lucide-react';
import type { Theme } from '@/data/constants';
import type { FriendData } from '@/hooks/useFriends';
import { hoverRow, listParent, reveal, rowChild, springSnappy, tapPress } from '@/lib/motion';

interface InviteFriendsPanelProps {
    friends: FriendData[];
    loading?: boolean;
    isLoggedIn: boolean;
    /** Names already in the room (any case) — they are not offered again. */
    presentNames: string[];
    /** False when every seat is taken; inviting anyone would be a dead end. */
    hasSpace: boolean;
    theme?: Theme;
    onInvite: (username: string) => void;
}

/**
 * How long a sent invite reads as "sent" before the button becomes live again.
 *
 * Matches the 30s expiry in `useChallenges` exactly. If this were shorter the UI
 * would invite a duplicate while the first invite was still valid; if longer, the
 * invite would be dead while the button still claimed it was outstanding.
 */
const INVITE_TTL_MS = 30_000;

/** Past this many friends, scanning the list beats reading it. */
const FILTER_THRESHOLD = 6;

interface FriendRowProps {
    friend: FriendData;
    reduce: boolean | null;
    /** Theme accent as a finished colour, for the live Invite label. */
    accent: string;
    /** False when the room is full. */
    hasSpace: boolean;
    /** An invite to this friend is still within its 30s window. */
    invited: boolean;
    onInvite: (username: string) => void;
}

/**
 * One invitable friend.
 *
 * Offline friends are listed but not invitable. The invite is a realtime broadcast
 * to a channel the recipient only occupies while the app is open, so an offline
 * invite silently goes nowhere — and greying the row is more honest than hiding it,
 * which would read as "this person is not your friend".
 */
const FriendRow: React.FC<FriendRowProps> = ({ friend, reduce, accent, hasSpace, invited, onInvite }) => {
    const canInvite = friend.isOnline && hasSpace && !invited;

    return (
        <motion.li
            variants={reduce ? undefined : rowChild}
            whileHover={friend.isOnline ? hoverRow(reduce) : undefined}
            className={`flex items-center justify-between gap-3 px-3 py-2 rounded-xl border transition-colors ${friend.isOnline
                ? 'bg-white/[0.04] border-white/10'
                : 'bg-white/[0.02] border-white/[0.06]'
                }`}
        >
            <div className="flex items-center gap-2.5 min-w-0">
                {/* Presence is a filled vs. hollow dot, not just a colour, so it
                    survives colour-blindness and greyscale. */}
                <Circle
                    size={7}
                    className={`shrink-0 ${friend.isOnline ? 'fill-emerald-400 text-emerald-400' : 'text-zinc-600'}`}
                    aria-hidden="true"
                />
                <span className={`font-mono text-[11px] font-bold truncate ${friend.isOnline ? 'text-zinc-100' : 'text-zinc-500'}`}>
                    {friend.username}
                </span>
                <span className="font-mono text-[10px] text-zinc-500 tabular-nums shrink-0">{friend.elo}</span>
                {!friend.isOnline && (
                    <span className="font-mono text-[9px] uppercase tracking-widest text-zinc-600 shrink-0">offline</span>
                )}
            </div>

            <motion.button
                type="button"
                onClick={() => onInvite(friend.username)}
                disabled={!canInvite}
                aria-label={friend.isOnline
                    ? `Invite ${friend.username} to this room`
                    : `${friend.username} is offline and cannot be invited`}
                title={!friend.isOnline ? 'Offline — invites only reach players with the app open'
                    : !hasSpace ? 'Room is full'
                        : invited ? 'Invite sent — expires after 30s'
                            : undefined}
                whileHover={canInvite ? (reduce ? undefined : { scale: 1.05, transition: springSnappy }) : undefined}
                whileTap={canInvite ? tapPress(reduce, 0.95) : undefined}
                className={`shrink-0 min-h-[32px] px-2.5 py-1.5 rounded-lg border font-mono text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-1.5 disabled:cursor-not-allowed ${invited
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                    : canInvite
                        ? 'bg-white/10 hover:bg-white/20 border-white/20 cursor-pointer'
                        : 'bg-white/[0.03] border-white/[0.08] text-zinc-600'
                    }`}
                style={canInvite ? { color: accent } : undefined}
            >
                {invited
                    ? <><Check size={11} aria-hidden="true" /> Sent</>
                    : !friend.isOnline
                        ? <><UserX size={11} aria-hidden="true" /> Away</>
                        : <><Send size={11} aria-hidden="true" /> Invite</>}
            </motion.button>
        </motion.li>
    );
};


/**
 * Invite a friend into the room you are already in.
 *
 * The lobby had two "invite" affordances and neither invited anyone: COPY put the
 * six-character code on the clipboard, and the button literally labelled INVITE
 * copied a URL. Both leave you to find your friend somewhere else and paste it to
 * them. Meanwhile the app already had a friends list (`useFriends`) and a working
 * realtime challenge channel (`useChallenges`) — the pieces were there, wired only
 * into the social modal's 1v1 "challenge" flow, which *creates its own room* and so
 * could not be used from inside an existing one.
 *
 * This sends that same `challenge_invite` broadcast carrying the current room's
 * code, so the friend gets an in-app prompt and lands in this lobby.
 *
 * Honest about its one real limitation: the invite is a realtime broadcast to a
 * channel the recipient only occupies while the app is open. An offline friend
 * would never receive it, so offline friends are shown but not invitable, and the
 * copy-link path stays for exactly that case.
 */
export const InviteFriendsPanel: React.FC<InviteFriendsPanelProps> = ({
    friends,
    loading = false,
    isLoggedIn,
    presentNames,
    hasSpace,
    theme,
    onInvite,
}) => {
    const reduce = useReducedMotion();
    const [query, setQuery] = useState('');
    /** Usernames with an invite still in flight, lowercased. */
    const [invited, setInvited] = useState<string[]>([]);
    /** Pending revert timers, so unmounting mid-invite doesn't set state later. */
    const timersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

    useEffect(() => () => {
        timersRef.current.forEach(clearTimeout);
        timersRef.current.clear();
    }, []);

    const handleInvite = (username: string) => {
        const key = username.toLowerCase();
        setInvited((prev) => (prev.includes(key) ? prev : [...prev, key]));
        onInvite(username);
        const timer = setTimeout(() => {
            setInvited((prev) => prev.filter((u) => u !== key));
            timersRef.current.delete(timer);
        }, INVITE_TTL_MS);
        timersRef.current.add(timer);
    };

    const present = new Set(presentNames.map((n) => n.toLowerCase()));
    const needle = query.trim().toLowerCase();

    /* Already-here friends are dropped rather than disabled: a row you can never
       act on is noise, and their name is visible in the podium anyway. */
    const candidates = friends
        .filter((f) => !present.has(f.username.toLowerCase()))
        .filter((f) => !needle || f.username.toLowerCase().includes(needle))
        // Online first — they are the only ones who can actually receive this.
        .sort((a, b) => Number(b.isOnline) - Number(a.isOnline) || a.username.localeCompare(b.username));

    const onlineCount = candidates.filter((f) => f.isOnline).length;
    const accent = theme?.glowPrimary ? `rgb(${theme.glowPrimary})` : 'rgb(34, 211, 238)';

    /* Guests have no friends list to draw on, so the panel states why rather than
       rendering an empty shell. */
    if (!isLoggedIn) {
        return (
            <div className="w-full glass-card !bg-[rgba(12,14,20,0.82)] rounded-2xl p-4 flex items-center gap-3">
                <div className="shrink-0 p-2 rounded-xl bg-white/10 border border-white/15 text-zinc-400">
                    <UserPlus size={15} aria-hidden="true" />
                </div>
                <p className="font-mono text-[11px] text-zinc-400 leading-relaxed">
                    <span className="text-zinc-200 font-bold">Sign in to invite friends.</span>{' '}
                    Until then, share the room code or the invite link above.
                </p>
            </div>
        );
    }

    return (
        <section
            aria-label="Invite friends"
            className="w-full glass-card !bg-[rgba(12,14,20,0.82)] rounded-2xl p-4 flex flex-col gap-3"
        >
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2.5">
                    <div className="shrink-0 p-2 rounded-xl bg-white/10 border border-white/15 text-white">
                        {loading
                            ? <Loader2 size={15} className="animate-spin" aria-hidden="true" />
                            : <UserPlus size={15} aria-hidden="true" />}
                    </div>
                    <div className="flex flex-col">
                        <h3 className="font-mono text-[11px] font-black uppercase tracking-widest text-white">
                            Invite friends
                        </h3>
                        <span className="font-mono text-[10px] text-zinc-400">
                            {hasSpace
                                ? `${onlineCount} online · they drop straight into this room`
                                : 'Room is full — free a seat to invite anyone'}
                        </span>
                    </div>
                </div>

                {candidates.length > FILTER_THRESHOLD && (
                    <div className="relative flex items-center">
                        <Search size={12} className="absolute left-2.5 text-zinc-500 pointer-events-none" aria-hidden="true" />
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Filter"
                            aria-label="Filter friends by name"
                            className="w-32 min-h-[32px] pl-7 pr-2 py-1 rounded-lg bg-black/50 border border-white/12 font-mono text-[11px] text-white placeholder:text-zinc-500"
                        />
                    </div>
                )}
            </div>

            {/* Three empty-ish states, distinguished because each needs a different
                answer: no friends at all, none left to invite, or a filter that
                matched nothing. */}
            {friends.length === 0 ? (
                <p className="font-mono text-[11px] text-zinc-400 leading-relaxed px-1">
                    No friends yet. Add someone from the Community panel and they'll show up here
                    next time you open a room.
                </p>
            ) : candidates.length === 0 ? (
                <p className="font-mono text-[11px] text-zinc-400 leading-relaxed px-1">
                    {needle
                        ? `No friend matches "${query.trim()}".`
                        : 'Everyone on your friends list is already in this room.'}
                </p>
            ) : (
                <motion.ul
                    {...reveal(reduce, listParent(0.04, 0.02))}
                    className="flex flex-col gap-1.5"
                >
                    {candidates.map((friend) => (
                        <FriendRow
                            key={friend.id}
                            friend={friend}
                            reduce={reduce}
                            accent={accent}
                            hasSpace={hasSpace}
                            invited={invited.includes(friend.username.toLowerCase())}
                            onInvite={handleInvite}
                        />
                    ))}
                </motion.ul>
            )}
        </section>
    );
};

