// ═══════════════════════════════════════════════════════════════════════
//  OPERATOR DOSSIER — the player profile, as a page
//  ---------------------------------------------------------------------
//  Reached at `/operator/:username` (or `/operator` for your own), so a dossier
//  is a real destination: it has a URL you can share, and browser back/forward
//  move through it like any other page.
//
//  ── What changed in this pass, and why ──
//
//  The page was a 340px sticky identity rail beside a five-tab deck, every
//  section a translucent card, every card holding translucent tiles. Four
//  things about that were wrong at the structure level rather than the styling
//  level:
//
//  1. The material was orphaned. `.glass-card` fills at 1.8% white and carries
//     no backdrop-filter *by design* — it was written to sit inside a
//     `.glass-panel` and borrow that parent's blur. This page then went
//     full-bleed and deleted the panel, so the cards were ~97% transparent over
//     the user's wallpaper. A face reading through a stat readout is not a
//     contrast value you tune. The page now owns an opaque surface tier
//     (`.dsr-surface`) and paints the *operator's banner* as its backdrop, so
//     legibility no longer depends on a wallpaper the page does not control.
//
//  2. Five tabs, and a public dossier had content on two of them. Titles and
//     Badges answered one question split by an implementation detail; Matrix
//     was a radar normalising speed, streak and duels-won on shared axes, which
//     is a shape rather than a measurement, and restated the Overview numbers.
//     One scrolling page with a scroll-spy replaces all five: Matrix is gone,
//     Titles and Badges are one Collection.
//
//  3. Level progress was stated five times in one viewport and the test count
//     three. It is now the avatar's ring, once.
//
//  4. Every metric was drawn as a bar against a ceiling nobody aims for — 30
//     WPM as 15% of 200, 31 tests as 15% of 200. A new operator's dossier was a
//     wall of near-empty tracks. Figures now carry a *comparison*: board rank,
//     a delta against their own recent form, time at the keyboard.
//
//  ── Data ──
//
//  Own dossier prefers fresh local RPG stats — the raw test log, personal bests,
//  achievement ids and the key heatmap, which `App.tsx` passes down — and only
//  fetches cosmetics. Other operators come from `public_profiles`, which stores
//  aggregates only.
//
//  That used to be the end of it, which is why three tabs said "private". But
//  `mode_scores`, `ranked_matches` and the ghost curves attached to every board
//  run are all readable by anyone, and nothing on this page was reading them.
//  `useOperatorIntel` does: their best run per mode, where it sits on that
//  board, your record against them, and a raceable ghost. So a public dossier
//  now publishes something instead of apologising for what it cannot.
// ═══════════════════════════════════════════════════════════════════════

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
    ArrowLeft, Flame, Ghost, Keyboard, Layers, Link2, Loader2, Lock, RefreshCw,
    Sliders, Swords, Target, Timer, Trophy, Type, User, WifiOff, Zap,
} from 'lucide-react';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Theme } from '@/data/constants';
import { ACHIEVEMENTS } from '@/data/constants';
import { achievementIcon } from '@/lib/achievementIcons';
import { TITLE_MARK } from '@/lib/titleIcons';
import { TITLE_BADGES, getActiveTitleId, setActiveTitleId, type UserSkillStats } from '@/data/titles';
import { ProfileCustomizationMenu } from '@/components/ProfileCustomizationMenu';
import { ALL_BANNERS, AVATARS } from '@/data/customization';
import { DrawCheck } from '@/components/profile/ProfileFx';
import {
    DataList, DataRow, EmptyNote, Figure, FigureRow, Panel, PanelHeading, Rule, Section,
} from '@/components/profile/DossierPieces';
import { DossierHeader, type HeaderFigure } from '@/components/profile/DossierHeader';
import { CollectionGrid, type CollectionItem } from '@/components/profile/CollectionGrid';
import { HallOfLegendsPanel } from '@/components/profile/HallOfLegendsPanel';
import { ActivityCalendar } from '@/components/profile/ActivityCalendar';
import { useActivity } from '@/hooks/useActivity';
import { FormChartPanel } from '@/components/profile/FormChartPanel';
import { KeyHeatmap, type HeatmapData } from '@/components/profile/KeyHeatmap';
import { WordWeaknessPanel } from '@/components/profile/WordWeaknessPanel';
import type { WordWeaknessMap } from '@/lib/wordWeakness';
import { useOperatorIntel } from '@/hooks/useOperatorIntel';
import { useRevealObserver } from '@/hooks/useReveal';
import { formatModeLabel, formatModeLabelLong } from '@/lib/modeKey';
import type { HistoryEntry } from '@/lib/history';
import {
    bannerToast, pulseHaptic, reveal, rgba, shellIn, springSnappy,
} from '@/components/profile/profileMotion';

interface PublicProfileData {
    /** `auth.uid()` — the key into `mode_scores` and `ranked_matches`. */
    id: string;
    username: string;
    level: number;
    xp: number;
    equipped_title: string;
    unlocked_badges: string[];
    max_wpm: number;
    avg_acc: number;
    tests_completed: number;
    avatar_id?: string;
    banner_id?: string;
}

export interface OperatorDossierProps {
    /**
     * The operator to show, straight from the route. `null` means "no name in the
     * URL", which resolves to the signed-in operator — that is how `/operator`
     * works, and how a guest reaches their own local dossier.
     */
    routeUsername: string | null;
    /** Leaves the page — wired to history, not to unmounting a dialog. */
    onBack: () => void;
    supabase: SupabaseClient | null;
    localUsername: string | null;
    /** The signed-in viewer's `auth.uid()`. Needed for the head-to-head record
     *  and to look up your own board runs; absent for a guest. */
    viewerId?: string | null;
    theme: Theme;
    localRPGStats?: {
        level: number;
        xp: number;
        currentLevelProgress: number;
        xpNeeded: number;
        /** Lifetime combo record — gates the combo-unlocked banners in the forge. */
        bestCombo?: number;
        /**
         * Raw test log, oldest first. Only ever present for your own dossier —
         * `public_profiles` stores aggregates, so the trend line, the calendar and
         * the per-mode breakdown are genuinely unavailable for another operator.
         */
        history?: HistoryEntry[];
        /** Per-configuration personal bests, best first. */
        personalBests?: Array<{ label: string; wpm: number }>;
        /** Unlocked achievement ids, for the collection grid. */
        achievements?: string[];
        /** Per-key accuracy and speed, straight from the typing engine. */
        heatmap?: HeatmapData;
        /** Word-level weakness map + Leitner schedule (`lib/wordWeakness`). */
        wordWeakness?: WordWeaknessMap;
        /** Words currently due for review (weakest box first). */
        wordWeaknessDue?: string[];
        skillStats: UserSkillStats;
    };
    /**
     * Loads a generated drill into the arena and leaves the page. Absent for a
     * guest or a remote dossier, which is also what hides the drill button.
     */
    onStartDrill?: (text: string) => void;
    /**
     * Launches a word drill for the given weak words and leaves the page.
     * Absent where a drill cannot be started (someone else's dossier).
     */
    onStartWordDrill?: (words: string[]) => void;
    /**
     * Arms a stored board run as the ghost pacer, switches the arena to that
     * run's mode, and leaves the page. Absent where the Ghost Net is not
     * reachable, which is what hides every "race" affordance.
     */
    onRaceGhost?: (modeKey: string, operatorId: string, username: string) => void;
}

/** How many recent tests the rolling averages read. Matches the accuracy
 *  aggregate the RPG hook publishes, so the two never disagree. */
const ROLLING_WINDOW = 20;
/** Weeks drawn on the activity calendar. Half a year reads as a habit; a full
 *  year at 13px a column overflows the content width on every laptop. */
const CALENDAR_WEEKS = 26;

/**
 * Fluid widescreen container for the Operator Dossier.
 * Expands to fill the monitor horizontally (up to 98vw-99vw) with clean responsive gutters,
 * matching the CosmicNavBar edge layout and completely eliminating dead side voids.
 */
const DOSSIER_CONTAINER = 'dsr-container w-full max-w-full px-6';

/**
 * Height of the sticky stage bar, as a custom property on the page root.
 *
 * Three places need this number — the bar itself, the `top` of the sticky
 * scroll-spy strip, and the `scroll-margin` every section reserves so a jump
 * lands below both bars rather than under them.
 */
const DOSSIER_BAR_H = '3.5rem';

/**
 * `_` and `%` are wildcards in Postgres `ILIKE`, and TypeNova usernames are
 * `[A-Za-z0-9_]` — so `a_b` used to match `axb` too. With `.maybeSingle()` that
 * second match turned into an error and the dossier reported "signal lost" for a
 * profile that exists.
 */
const likeEscape = (value: string) => value.replace(/[\\%_]/g, (m) => `\\${m}`);

/**
 * Direction of travel through a series: the mean of the newest third against the
 * mean of the oldest third.
 *
 * A last-versus-first comparison swung wildly on one bad test, which made the
 * readout untrustworthy exactly when it mattered.
 */
function thirdsDelta(values: number[]): number | null {
    if (values.length < 6) return null;
    const chunk = Math.max(2, Math.floor(values.length / 3));
    const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
    return Math.round(mean(values.slice(-chunk)) - mean(values.slice(0, chunk)));
}

const mean = (values: number[]) =>
    values.length === 0 ? 0 : values.reduce((a, b) => a + b, 0) / values.length;

/** `1h 12m`, or `48m`. The denominator under every other number on the page. */
function formatMinutes(total: number): string {
    if (total < 60) return `${total}m`;
    return `${Math.floor(total / 60)}h ${total % 60}m`;
}

/** How long ago a board run was set. Boards are about currency, not dates. */
function relativeDay(iso: string): string {
    const then = new Date(iso).getTime();
    if (Number.isNaN(then)) return '';
    const days = Math.floor((Date.now() - then) / 86_400_000);
    if (days <= 0) return 'today';
    if (days === 1) return 'yesterday';
    if (days < 30) return `${days} days ago`;
    const months = Math.round(days / 30);
    return months <= 1 ? 'last month' : `${months} months ago`;
}

/* ─── The dossier ─────────────────────────────────────────────────────── */

export const OperatorDossier = React.memo(function OperatorDossier({
    routeUsername,
    onBack,
    supabase,
    localUsername,
    viewerId,
    localRPGStats,
    onStartDrill,
    onStartWordDrill,
    onRaceGhost,
}: OperatorDossierProps) {
    const reduce = useReducedMotion();
    const navigate = useNavigate();
    const location = useLocation();

    /**
     * `/operator` with no name is your own dossier. Guests have no cloud username,
     * so they fall back to the same 'Guest' label the navbar uses — that keeps the
     * local-stats path reachable without an account.
     */
    const targetUsername = routeUsername || localUsername || 'Guest';

    /**
     * Lowercased identity of the operator on screen. Every async read is tagged
     * with it, so a row that lands *after* you clicked through to a different
     * operator is discarded by construction rather than painting the previous
     * dossier under the new name.
     */
    const profileKey = targetUsername.toLowerCase();

    /** The settled remote read. `null` means "still in flight for this key". */
    const [fetched, setFetched] = useState<{ key: string; row: PublicProfileData | null; failed: boolean } | null>(null);
    /** Bumped by the retry button to re-run the read for the same operator. */
    const [retryNonce, setRetryNonce] = useState(0);
    /** Cosmetics arrive on their own for our dossier — stats stay local. */
    const [cosmetics, setCosmetics] = useState<{ key: string; avatarId: string; bannerId: string } | null>(null);
    /** Our own equipped title is authoritative from localStorage, never the cloud. */
    const [ownTitleId, setOwnTitleId] = useState<string>(() => getActiveTitleId());
    const [showCustomization, setShowCustomization] = useState(false);
    /** Feedback for the "copy link" affordance in the page header. */
    const [linkCopied, setLinkCopied] = useState(false);

    // Pulse key = title id + a monotonic tick, so re-equipping the same title
    // still re-mounts the burst. A counter keeps the handler pure — no Date.now().
    const [pulseTick, setPulseTick] = useState<{ id: string; n: number } | null>(null);
    const equipPulse = pulseTick ? `${pulseTick.id}:${pulseTick.n}` : null;
    const [equipToast, setEquipToast] = useState<string | null>(null);
    const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pulseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const isOwnProfile = !!(
        localUsername
            ? targetUsername.toLowerCase() === localUsername.toLowerCase()
            // A guest has no cloud identity, so "own" is simply the nameless route.
            : !routeUsername
    );

    useEffect(() => {
        return () => {
            if (toastTimer.current) clearTimeout(toastTimer.current);
            if (pulseTimer.current) clearTimeout(pulseTimer.current);
            if (copyTimer.current) clearTimeout(copyTimer.current);
        };
    }, []);

    /**
     * Our own dossier is drawn from fresh local RPG state, so the cloud is only
     * asked for cosmetics. Everyone else comes from `public_profiles`.
     */
    const usesLocalStats = isOwnProfile && !!localRPGStats;

    // Remote read. Nothing here resets state on a key change: every result is
    // tagged with the profile it belongs to and read back through that tag, so a
    // slow response for the operator you just navigated away from is inert
    // instead of overwriting the dossier now on screen.
    useEffect(() => {
        if (!targetUsername || !supabase) return;

        const key = profileKey;
        const match = likeEscape(targetUsername);
        let active = true;

        if (usesLocalStats) {
            // Cosmetics only — the dossier is already on screen from local data, so
            // a failure just keeps the default skin. It still needs a rejection
            // handler, or the error lands at window scope.
            supabase
                .from('public_profiles')
                .select('avatar_id, banner_id')
                .ilike('username', match)
                .maybeSingle()
                .then(
                    ({ data }) => {
                        if (!active || !data) return;
                        const nextAvatar = data.avatar_id || 'default';
                        const nextBanner = data.banner_id || 'basic_dark';
                        setCosmetics({
                            key,
                            avatarId: nextAvatar,
                            bannerId: nextBanner,
                        });
                        if (isOwnProfile) {
                            try {
                                localStorage.setItem('typenova_avatar_id', nextAvatar);
                                localStorage.setItem('typenova_banner_id', nextBanner);
                                window.dispatchEvent(new Event('cosmeticsChanged'));
                            } catch {}
                        }
                    },
                    (err: unknown) => {
                        console.warn('[profile] cosmetics fetch failed:', err);
                    }
                );

            return () => {
                active = false;
            };
        }

        (async () => {
            try {
                const { data, error } = await supabase
                    .from('public_profiles')
                    .select('*')
                    .ilike('username', match)
                    .maybeSingle();

                if (!active) return;
                if (error) throw error;
                setFetched({ key, row: (data as PublicProfileData | null) ?? null, failed: false });
            } catch (err) {
                // A transport failure is not the same as "no such operator" —
                // showing "signal lost" for a dropped request sent people looking
                // for a profile that was there all along.
                console.error('[profile] public profile fetch failed:', err);
                if (active) setFetched({ key, row: null, failed: true });
            }
        })();

        return () => {
            active = false;
        };
    }, [targetUsername, profileKey, usesLocalStats, supabase, retryNonce]);

    /** Keeps our chip honest when a title is equipped from another surface. */
    useEffect(() => {
        const sync = () => setOwnTitleId(getActiveTitleId());
        window.addEventListener('titleChanged', sync);
        return () => window.removeEventListener('titleChanged', sync);
    }, []);

    /** The settled read for *this* operator, or `undefined` while in flight. */
    const settled = fetched && fetched.key === profileKey ? fetched : undefined;
    const remote = settled?.row;
    const loading = !usesLocalStats && !settled && !!supabase;
    const notFound = !usesLocalStats && !!settled && settled.row === null && !settled.failed;
    /** Distinguished from `notFound` so a dropped request offers a retry. */
    const fetchFailed = !usesLocalStats && (!supabase || (!!settled && settled.failed));

    const retryFetch = useCallback(() => {
        setFetched(null);
        setRetryNonce((n) => n + 1);
    }, []);

    /**
     * Route-change housekeeping. A page swap does not remount the scroll
     * container, so navigating from one operator to another used to land you
     * halfway down the new dossier. Reset the scroll and move focus to the
     * heading, which is also what announces the new page to a screen reader —
     * a client-side route change fires no such announcement on its own.
     */
    const scrollerRef = useRef<HTMLDivElement | null>(null);
    const headingRef = useRef<HTMLHeadingElement | null>(null);
    useEffect(() => {
        // The page has its own scrollport, so `window.scrollTo` would be a no-op.
        scrollerRef.current?.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
        const raf = requestAnimationFrame(() => headingRef.current?.focus({ preventScroll: true }));
        return () => cancelAnimationFrame(raf);
        // `reduce` is read for the scroll behaviour only; re-running on a
        // preference change would re-steal focus for no reason.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [profileKey]);

    /**
     * Escape leaves the page, matching the dialog it replaced — unless the forge
     * is stacked on top, in which case that panel's own handler takes the key and
     * only it closes.
     */
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key !== 'Escape' || showCustomization) return;
            e.stopPropagation();
            onBack();
        };
        window.addEventListener('keydown', onKey, true);
        return () => window.removeEventListener('keydown', onKey, true);
    }, [onBack, showCustomization]);

    /** Shareable address for this dossier. The whole point of being a route. */
    const copyLink = useCallback(async () => {
        const url = `${window.location.origin}/operator/${encodeURIComponent(targetUsername)}`;
        try {
            await navigator.clipboard.writeText(url);
            setLinkCopied(true);
            pulseHaptic(8);
            if (copyTimer.current) clearTimeout(copyTimer.current);
            copyTimer.current = setTimeout(() => setLinkCopied(false), 1800);
        } catch (err) {
            // Clipboard access is permission-gated and absent over plain HTTP.
            console.warn('[dossier] clipboard write failed:', err);
        }
    }, [targetUsername]);

    /* ─── Identity ──────────────────────────────────────────────────────── */

    /**
     * Our own equipped title comes from localStorage (it is authoritative and
     * survives offline); everyone else's comes from their row.
     */
    const equippedTitleId = isOwnProfile ? ownTitleId : remote?.equipped_title || 'novice';
    const activeBadge = TITLE_BADGES.find((b) => b.id === equippedTitleId) || TITLE_BADGES[0];

    const displayXp = Math.max(0, (isOwnProfile ? localRPGStats?.xp : undefined) ?? remote?.xp ?? 0);
    /**
     * Derived from XP with the same curve the RPG hook uses, rather than trusting
     * a `level` column that can lag behind its own `xp` after a partial sync — a
     * stale pair used to render a pinned-at-100% bar and an "XP remaining" figure
     * for a level already passed.
     */
    const displayLevel = Math.floor(Math.sqrt(displayXp / 100)) + 1;
    const nextLevelXp = Math.pow(displayLevel, 2) * 100;
    const prevLevelXp = Math.pow(displayLevel - 1, 2) * 100;
    const levelProgressPct = Math.min(
        100,
        Math.max(0, ((displayXp - prevLevelXp) / (nextLevelXp - prevLevelXp)) * 100)
    );
    const xpToNext = Math.max(0, nextLevelXp - displayXp);

    // Local RPG state wins on our own dossier — it is always at least as fresh as
    // the cloud. Remote operators come entirely from their public row.
    const skillStats: UserSkillStats = useMemo(
        () => ({
            maxWpm: (isOwnProfile ? localRPGStats?.skillStats.maxWpm : undefined) ?? remote?.max_wpm ?? 0,
            avgAccuracy: (isOwnProfile ? localRPGStats?.skillStats.avgAccuracy : undefined) ?? remote?.avg_acc ?? 0,
            testsCompleted: (isOwnProfile ? localRPGStats?.skillStats.testsCompleted : undefined) ?? remote?.tests_completed ?? 0,
            dailyStreak: localRPGStats?.skillStats.dailyStreak ?? 0,
            racesWon: localRPGStats?.skillStats.racesWon ?? 0,
            totalWordsTyped: localRPGStats?.skillStats.totalWordsTyped ?? 0,
        }),
        [isOwnProfile, remote, localRPGStats]
    );

    const unlockedBadgeIds = useMemo(
        () => new Set(remote?.unlocked_badges || ['novice']),
        [remote]
    );

    const avatarId = (isOwnProfile ? (cosmetics?.key === profileKey ? cosmetics.avatarId : undefined) : undefined)
        ?? remote?.avatar_id
        ?? 'default';
    const bannerId = (isOwnProfile ? (cosmetics?.key === profileKey ? cosmetics.bannerId : undefined) : undefined)
        ?? remote?.banner_id
        ?? 'basic_dark';
    const selectedBanner = ALL_BANNERS.find((b) => b.id === bannerId) || ALL_BANNERS[0];
    const selectedAvatar = AVATARS.find((a) => a.id === avatarId) || AVATARS[0];

    /** The dossier's whole colour identity comes from the equipped banner. */
    const accent = selectedBanner.glowColor || '6, 182, 212';
    const avatarAccent = selectedAvatar.glowColor || accent;

    /** Own dossier judges unlocks from live stats; others from their stored list. */
    const isBadgeUnlocked = useCallback(
        (badge: (typeof TITLE_BADGES)[number]) =>
            isOwnProfile ? badge.isUnlocked(skillStats) : unlockedBadgeIds.has(badge.id),
        [isOwnProfile, skillStats, unlockedBadgeIds]
    );

    /* ─── The public record ─────────────────────────────────────────────── */

    /**
     * Whose board runs to read. Our own dossier has no `public_profiles` row in
     * hand (it only fetched cosmetics), so the id comes from the session instead.
     */
    const operatorId = isOwnProfile ? viewerId ?? null : remote?.id ?? null;
    const intel = useOperatorIntel({ supabase, operatorId, viewerId });

    const topBest = intel.bests[0] ?? null;
    const canRace = !!onRaceGhost && !!operatorId;

    const raceRun = useCallback(
        (modeKey: string) => {
            if (!onRaceGhost || !operatorId) return;
            onRaceGhost(modeKey, operatorId, targetUsername);
        },
        [onRaceGhost, operatorId, targetUsername]
    );

    /* ─── Local-only detail ──────────────────────────────────────────────────
       Everything below reads the raw test log, which exists for your own dossier
       only. Guarded on `isOwnProfile` rather than on the array being non-empty,
       so a remote operator gets an explicit note instead of a section that looks
       like it has nothing in it. */

    const history = useMemo<HistoryEntry[]>(
        () => (isOwnProfile ? localRPGStats?.history ?? [] : []),
        [isOwnProfile, localRPGStats]
    );

    /**
     * Consistency, surfaced for the first time.
     *
     * Every history row has carried `cons` since the log existed and nothing has
     * ever displayed it — which is a shame, because it is the metric that
     * separates a typist who can hold a pace from one whose average hides a
     * sawtooth.
     */
    const consistency = useMemo(() => {
        const recent = history.slice(-ROLLING_WINDOW).map((e) => e.cons).filter((c) => Number.isFinite(c));
        if (recent.length === 0) return null;
        return {
            value: Math.round(mean(recent)),
            delta: thirdsDelta(history.map((e) => e.cons).filter((c) => Number.isFinite(c))),
            window: recent.length,
        };
    }, [history]);

    /**
     * Rough total time at the keyboard, in minutes.
     *
     * A timed run's `size` *is* its duration in seconds, so that half is exact. A
     * words run only stores its word count, so its duration is derived from the
     * WPM it was typed at — which is the definition of WPM rearranged, and the
     * best available without storing durations that were never recorded.
     */
    const minutesTyped = useMemo(
        () => Math.round(history.reduce(
            (total, e) => total + (e.mode === 'time' ? e.size / 60 : e.wpm > 0 ? e.size / e.wpm : 0),
            0,
        )),
        [history]
    );

    /** Per-key stats, and whether there are enough of them to draw a board. */
    const heatmap = useMemo(
        () => (isOwnProfile ? localRPGStats?.heatmap ?? {} : {}),
        [isOwnProfile, localRPGStats]
    );
    const hasHeatmap = useMemo(
        () => Object.values(heatmap).some((stat) => stat && stat.total > 0),
        [heatmap]
    );

    /** Word-weakness data + review queue. Own profile only: a remote operator's
        word map is never transmitted (`public_profiles` stores aggregates). */
    const wordWeakness = isOwnProfile ? localRPGStats?.wordWeakness ?? {} : {};
    const wordWeaknessDue = isOwnProfile ? localRPGStats?.wordWeaknessDue ?? [] : [];

    /**
     * Per-difficulty breakdown. Keyed by the `level` field the history entries
     * already carry, so it needs no new storage — and it answers the question the
     * aggregates cannot: whether that max WPM came from NOVICE or from CODE.
     */
    const modeRows = useMemo(() => {
        if (history.length === 0) return [];
        const byLevel = new Map<string, { tests: number; best: number; wpmSum: number; accSum: number }>();
        for (const e of history) {
            const key = e.level || 'UNKNOWN';
            const row = byLevel.get(key) ?? { tests: 0, best: 0, wpmSum: 0, accSum: 0 };
            row.tests += 1;
            row.best = Math.max(row.best, e.wpm);
            row.wpmSum += e.wpm;
            row.accSum += e.acc;
            byLevel.set(key, row);
        }
        const busiest = Math.max(...[...byLevel.values()].map((r) => r.tests));
        return [...byLevel.entries()]
            .map(([level, r]) => ({
                level,
                tests: r.tests,
                best: Math.round(r.best),
                avgWpm: Math.round(r.wpmSum / r.tests),
                avgAcc: Math.round(r.accSum / r.tests),
                // Share of *your* practice, which is a real denominator — unlike
                // the 200 WPM ceiling every bar on this page used to measure
                // against.
                share: busiest > 0 ? r.tests / busiest : 0,
            }))
            .sort((a, b) => b.tests - a.tests);
    }, [history]);

    /** Timed vs word-count split — the other axis the log already records. */
    const shapeSplit = useMemo(() => {
        if (history.length === 0) return null;
        const timed = history.filter((e) => e.mode === 'time').length;
        return { timed, words: history.length - timed };
    }, [history]);

    const personalBests = useMemo(
        () => (isOwnProfile ? localRPGStats?.personalBests ?? [] : []),
        [isOwnProfile, localRPGStats]
    );

    const unlockedAchievements = useMemo(() => {
        if (isOwnProfile) {
            return new Set(localRPGStats?.achievements ?? []);
        }
        const remoteSet = new Set<string>();
        if (remote?.unlocked_badges) {
            for (const b of remote.unlocked_badges) {
                if (ACHIEVEMENTS.some((a) => a.id === b)) {
                    remoteSet.add(b);
                }
            }
        }
        return remoteSet;
    }, [isOwnProfile, localRPGStats, remote?.unlocked_badges]);

    const { cells: activityCells, summary: activity } = useActivity(history, CALENDAR_WEEKS);

    /* ─── Collection ────────────────────────────────────────────────────── */

    /**
     * Titles plus achievements, as one list.
     *
     * A remote operator gets titles only. `public_profiles` publishes
     * `unlocked_badges` for titles and nothing at all for achievements, so the
     * alternative was eighteen locked tiles with a note explaining they are not
     * really locked — which is worse than eighteen absent tiles and one sentence.
     */
    const collection = useMemo<CollectionItem[]>(() => {
        const titles: CollectionItem[] = TITLE_BADGES.map((badge) => {
            const unlocked = isBadgeUnlocked(badge);
            return {
                id: badge.id,
                kind: 'title',
                name: badge.name,
                description: badge.description,
                icon: TITLE_MARK[badge.id],
                unlocked,
                equipped: badge.id === equippedTitleId,
                equippable: unlocked && isOwnProfile,
                progress: !unlocked && isOwnProfile ? badge.progress?.(skillStats) : undefined,
            };
        });

        if (!isOwnProfile) return titles;

        const badges: CollectionItem[] = ACHIEVEMENTS.map((ach) => ({
            id: ach.id,
            kind: 'badge',
            name: ach.title,
            description: ach.desc,
            icon: achievementIcon(ach.icon),
            unlocked: unlockedAchievements.has(ach.id),
            equipped: false,
            equippable: false,
        }));

        return [...titles, ...badges];
    }, [equippedTitleId, isBadgeUnlocked, isOwnProfile, skillStats, unlockedAchievements]);

    const collectionEarned = collection.filter((i) => i.unlocked).length;

    const handleSelectTitle = useCallback(async (titleId: string) => {
        if (!isOwnProfile) return;

        if (titleId === equippedTitleId) {
            // Re-tapping the equipped title replays the burst — a tap should
            // always get an answer.
            setPulseTick((p) => ({ id: titleId, n: (p?.n ?? 0) + 1 }));
            pulseHaptic(6);
            return;
        }

        setActiveTitleId(titleId);
        setOwnTitleId(titleId);

        const badge = TITLE_BADGES.find((b) => b.id === titleId);
        setPulseTick((p) => ({ id: titleId, n: (p?.n ?? 0) + 1 }));
        setEquipToast(badge ? badge.name : titleId);
        pulseHaptic([10, 26, 14]);

        if (pulseTimer.current) clearTimeout(pulseTimer.current);
        pulseTimer.current = setTimeout(() => setPulseTick(null), 900);
        if (toastTimer.current) clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => setEquipToast(null), 2200);

        // Dispatch so App's auto-sync effect mirrors the new title to
        // `public_profiles` immediately, across sessions.
        window.dispatchEvent(new Event('titleChanged'));

        if (supabase && localUsername) {
            try {
                // `update()` rather than `upsert()` — an upsert would blank the rest
                // of the row with NULLs. Matched case-insensitively, because the
                // stored username preserves the case it was registered with while
                // callers pass whatever casing they happen to hold.
                const { error } = await supabase
                    .from('public_profiles')
                    .update({ equipped_title: titleId, updated_at: new Date().toISOString() })
                    .ilike('username', likeEscape(localUsername));
                // Supabase resolves rather than throws on a failed write, so an
                // unchecked call swallowed every RLS rejection silently.
                if (error) throw error;
            } catch (e) {
                console.error('Failed to update equipped title on cloud:', e);
            }
        }
    }, [equippedTitleId, isOwnProfile, localUsername, supabase]);

    // The forge saved successfully, so paint the new skin immediately rather than
    // waiting for a refetch.
    const handleCustomizationUpdate = useCallback(
        (newAvatarId: string, newBannerId: string) => {
            setCosmetics({ key: profileKey, avatarId: newAvatarId, bannerId: newBannerId });
        },
        [profileKey]
    );

    /* ─── Sections and the scroll-spy ───────────────────────────────────── */

    /**
     * What this dossier has to say, in order.
     *
     * Derived rather than fixed: a public dossier genuinely has fewer sections,
     * and a strip advertising three destinations that resolve to "private" is the
     * shape this page is moving away from.
     */
    const sections = useMemo(() => {
        if (isOwnProfile) {
            return [
                { id: 'form', label: 'Form' },
                { id: 'keyboard', label: 'Weak Keys' },
                { id: 'weak-words', label: 'Weak Words' },
                { id: 'runs', label: 'Best runs' },
                { id: 'lifetime', label: 'Lifetime' },
                { id: 'hall-of-legends', label: 'Hall of Legends' },
                { id: 'collection', label: 'Titles' },
            ];
        }
        return [
            { id: 'versus', label: 'Head to head' },
            { id: 'runs', label: 'Best runs' },
            { id: 'hall-of-legends', label: 'Hall of Legends' },
            { id: 'collection', label: 'Titles' },
        ];
    }, [isOwnProfile]);


    const [activeSection, setActiveSection] = useState<string>(sections[0].id);
    useEffect(() => setActiveSection(sections[0].id), [sections]);

    /**
     * Which elements the page currently has. Anything that changes the answer has
     * to re-run the reveal scan and re-measure the spy's offsets, and both want
     * the same key.
     */
    const layoutKey = `${profileKey}:${isOwnProfile}:${loading}:${notFound}:${fetchFailed}`;

    /**
     * Entrance motion for everything below the fold. One observer for the whole
     * page; `hooks/useReveal` explains why the entrances could not simply fire on
     * mount.
     */
    useRevealObserver(scrollerRef, layoutKey);

    /**
     * Scroll-spy, not a tab controller: every section is on the page at once, so
     * the strip reports where you are rather than deciding what exists.
     *
     * Resolved from cached offsets. Two earlier versions were wrong in opposite
     * ways. An IntersectionObserver only reports the entries that *changed*, so
     * answering "which section am I in" needs the full set kept in a side map, and
     * any observation band narrow enough to give one answer has scroll offsets
     * where it contains none, which at the top of this page left the strip
     * showing whatever it had last said. Reading `offsetTop` inside the scroll
     * handler answered correctly but ran a forced layout on every frame it fired,
     * on the page whose scrolling was already the complaint.
     *
     * So the geometry is measured once, re-measured by a `ResizeObserver` when
     * anything reflows, and the per-frame work is a comparison against numbers
     * already in hand.
     */
    useEffect(() => {
        const root = scrollerRef.current;
        if (!root) return;

        const nodes = sections
            .map((section) => ({ id: section.id, node: root.querySelector<HTMLElement>(`#${section.id}`) }))
            .filter((entry): entry is { id: string; node: HTMLElement } => entry.node !== null);
        if (nodes.length === 0) return;

        let offsets = nodes.map((entry) => ({ id: entry.id, top: entry.node.offsetTop }));
        /**
         * Set by the ResizeObserver, cleared by the next frame that reads.
         *
         * The measurement has to happen somewhere, and doing it in the observer's
         * own callback put a forced layout back into the scroll path by the back
         * door: a section's height changes *because* you scrolled — a chart
         * measuring itself, a block revealing — so the observer fires mid-scroll
         * and every notification paid for its own layout. Coalescing into the
         * frame that was going to run anyway means at most one layout read per
         * frame, and none at all while nothing is reflowing.
         */
        let dirty = false;

        let frame = 0;
        const resolve = () => {
            frame = 0;
            if (dirty) {
                dirty = false;
                offsets = nodes.map((entry) => ({ id: entry.id, top: entry.node.offsetTop }));
            }
            // The marker sits a little below the sticky bars, so a section counts
            // as current once its heading has cleared them.
            const marker = root.scrollTop + root.clientHeight * 0.3;
            let current = offsets[0].id;
            for (const entry of offsets) {
                if (entry.top <= marker) current = entry.id;
            }
            setActiveSection(current);
        };

        const onScroll = () => {
            if (frame === 0) frame = requestAnimationFrame(resolve);
        };

        // Sections change height as they reveal, as the collection filter switches
        // and as a chart measures itself, so the offsets cannot be taken once and
        // trusted forever.
        const observer = new ResizeObserver(() => {
            dirty = true;
            onScroll();
        });
        observer.observe(root);
        nodes.forEach((entry) => observer.observe(entry.node));

        resolve();
        root.addEventListener('scroll', onScroll, { passive: true });
        return () => {
            observer.disconnect();
            root.removeEventListener('scroll', onScroll);
            if (frame !== 0) cancelAnimationFrame(frame);
        };
    }, [sections, layoutKey]);

    /**
     * Geometry of the sliding indicator under the spy strip.
     *
     * `offsetLeft` rather than `getBoundingClientRect`, because the strip scrolls
     * horizontally on a narrow viewport and a viewport-relative measurement would
     * leave the indicator behind when it does. `useLayoutEffect` so the first
     * position lands before paint rather than one frame after it.
     */
    const spyRefs = useRef<Record<string, HTMLButtonElement | null>>({});
    const [glider, setGlider] = useState<{ x: number; w: number } | null>(null);
    useLayoutEffect(() => {
        const node = spyRefs.current[activeSection];
        if (!node) return;

        const measure = () => {
            const current = spyRefs.current[activeSection];
            if (current) setGlider({ x: current.offsetLeft, w: current.offsetWidth });
        };

        measure();
        // The labels are web-font text, so a font swap changes a tab's width after
        // the first measurement.
        const observer = new ResizeObserver(measure);
        observer.observe(node);
        return () => observer.disconnect();
    }, [activeSection, sections]);

    const jumpTo = useCallback((id: string) => {
        const root = scrollerRef.current;
        root?.querySelector<HTMLElement>(`#${id}`)?.scrollIntoView({
            behavior: reduce ? 'auto' : 'smooth',
            block: 'start',
        });
    }, [reduce]);

    // Auto-scroll if URL contains a target section hash (e.g. #hall-of-legends)
    useEffect(() => {
        if (!location.hash) return;
        const targetId = location.hash.replace('#', '');
        if (!targetId) return;

        const timer = setTimeout(() => {
            jumpTo(targetId);
        }, 150);
        return () => clearTimeout(timer);
    }, [location.hash, jumpTo]);

    /* ─── Header figures ────────────────────────────────────────────────── */

    const headerFigures = useMemo<HeaderFigure[]>(() => {
        const rankCaption = topBest?.rank
            ? `#${topBest.rank}${topBest.field ? ` of ${topBest.field}` : ''} in ${formatModeLabel(topBest.modeKey)}`
            : 'personal best';

        const figures: HeaderFigure[] = [
            {
                label: 'Best speed',
                value: skillStats.maxWpm,
                unit: 'WPM',
                caption: rankCaption,
            },
            {
                label: 'Accuracy',
                value: skillStats.avgAccuracy,
                unit: '%',
                decimals: skillStats.avgAccuracy % 1 === 0 ? 0 : 1,
                caption: isOwnProfile
                    ? `last ${ROLLING_WINDOW} tests`
                    : 'lifetime average',
            },
        ];

        if (isOwnProfile) {
            figures.push({
                label: 'Consistency',
                value: consistency?.value ?? 0,
                unit: '%',
                caption: consistency ? `last ${consistency.window} tests` : undefined,
                unavailable: consistency ? undefined : 'no runs recorded yet',
            });
            figures.push({
                label: 'Tests',
                value: skillStats.testsCompleted,
                caption: minutesTyped > 0 ? `${formatMinutes(minutesTyped)} at the keyboard` : 'completed runs',
            });
        } else {
            figures.push({
                label: 'Consistency',
                value: topBest?.consistency ?? 0,
                unit: '%',
                caption: 'on their best board run',
                unavailable: topBest?.consistency == null ? 'not on a board yet' : undefined,
            });
            figures.push({
                label: 'Rating',
                value: intel.elo ?? 0,
                unit: 'Elo',
                caption: 'ranked ladder',
                // Three states, not two: a rating in hand, a read still running,
                // and a project that has not applied the migration that publishes
                // the column. Collapsing the middle one into "not published" says
                // something false for as long as the request takes.
                unavailable: intel.elo !== null
                    ? undefined
                    : intel.loading ? 'reading the ladder' : 'not published',
            });
        }

        return figures;
    }, [consistency, intel.elo, intel.loading, isOwnProfile, minutesTyped, skillStats, topBest]);

    /* ─── Render ────────────────────────────────────────────────────────── */

    const pageVars = {
        '--dossier-bar-h': DOSSIER_BAR_H,
        '--dsr-accent': accent,
    } as React.CSSProperties;

    /** The one primary action, which is a different verb depending on who is looking. */
    const primaryAction = isOwnProfile ? (
        <motion.button
            whileHover={reduce ? undefined : { y: -2 }}
            whileTap={reduce ? undefined : { scale: 0.985 }}
            transition={springSnappy}
            type="button"
            onClick={() => setShowCustomization(true)}
            className="dsr-interactive flex items-center gap-2 rounded-full px-4 py-2 outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            style={{ borderColor: rgba(accent, 0.4), background: rgba(accent, 0.1) }}
        >
            <Sliders size={13} style={{ color: rgba(accent, 1) }} aria-hidden />
            <span className="dsr-body text-[13px] text-[var(--dsr-ink)]">Modify loadout</span>
        </motion.button>
    ) : canRace && topBest ? (
        <motion.button
            whileHover={reduce ? undefined : { y: -2 }}
            whileTap={reduce ? undefined : { scale: 0.985 }}
            transition={springSnappy}
            type="button"
            onClick={() => raceRun(topBest.modeKey)}
            className="dsr-interactive flex items-center gap-2 rounded-full px-4 py-2 outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            style={{ borderColor: rgba(accent, 0.4), background: rgba(accent, 0.1) }}
        >
            <Ghost size={14} style={{ color: rgba(accent, 1) }} aria-hidden />
            <span className="dsr-body text-[13px] text-[var(--dsr-ink)]">
                Race their {topBest.wpm} WPM run
            </span>
        </motion.button>
    ) : null;

    const raceButton = (modeKey: string, label: string) =>
        canRace ? (
            <button
                type="button"
                onClick={() => raceRun(modeKey)}
                className="dsr-interactive flex items-center gap-1.5 rounded-full px-2.5 py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                title={`Arm this run as the ghost pacer for ${formatModeLabelLong(modeKey)}`}
            >
                <Ghost size={12} style={{ color: rgba(accent, 0.9) }} aria-hidden />
                <span className="dsr-body whitespace-nowrap text-[12px]">{label}</span>
            </button>
        ) : null;

    return (
        <>
            {/* The page owns its own scroll container pinned under the navbar, the
                same shape the academy and compete stages use. No backdrop, no focus
                trap, no body scroll lock: this is a destination, not an interruption. */}
            <div
                ref={scrollerRef}
                style={pageVars}
                className="dsr-scope dsr-scroller fixed inset-0 top-[var(--nav-h)] z-[var(--z-content)] overflow-y-auto custom-scrollbar"
            >
                {/* ── Page floor ──
                    Opaque, not a scrim. The old gradient bottomed out at 0.8 alpha
                    over the user's wallpaper, which is why the wallpaper's subject
                    was legible through the cards; and because it only covered the
                    content column's height, the last 200px of a short dossier
                    dropped to bare wallpaper with a hard seam at the footer. This
                    page's visual identity is the operator's banner, painted at the
                    top of the header — which the page controls, so contrast is not
                    a function of somebody's desktop picture. */}
                <div
                    aria-hidden
                    className="pointer-events-none fixed inset-0 -z-10"
                    style={{ background: 'var(--dsr-floor)' }}
                />

                <div className="relative flex flex-col pb-[calc(var(--dock-h)+1.75rem)]">
                    {/* ── Stage bar ──
                        Sticky so Back and Copy link stay reachable the whole way
                        down. No `backdrop-blur`: a full-width sticky bar with a
                        backdrop filter re-rasterises on every scroll frame, and the
                        fill is opaque enough that the blur contributed nothing. */}
                    <motion.header
                        {...reveal(reduce, shellIn)}
                        className="sticky top-0 z-30 shrink-0 border-b border-[var(--dsr-line)]"
                        style={{ background: 'var(--dsr-floor)' }}
                    >
                        <div className={`${DOSSIER_CONTAINER} flex h-[var(--dossier-bar-h)] items-center justify-between gap-3`}>
                            <div className="flex min-w-0 items-center gap-3">
                                {/* Back, not close. A page leaves through history. */}
                                <button
                                    type="button"
                                    onClick={onBack}
                                    className="dsr-interactive flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                                >
                                    <ArrowLeft size={13} className="text-[var(--dsr-ink-2)]" aria-hidden />
                                    <span className="dsr-body text-[13px]">Back</span>
                                </button>
                                {/* The page's real heading. `tabIndex={-1}` makes it a
                                    focus target on route change so the new dossier is
                                    announced. */}
                                <h1
                                    ref={headingRef}
                                    tabIndex={-1}
                                    className="dsr-label min-w-0 truncate outline-none"
                                >
                                    Operator dossier
                                    <span className="ml-2.5 hidden normal-case text-[var(--dsr-ink-3)] sm:inline">
                                        / {targetUsername}
                                    </span>
                                </h1>
                            </div>

                            <button
                                type="button"
                                onClick={copyLink}
                                className="dsr-interactive flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                            >
                                {linkCopied ? (
                                    <>
                                        <span style={{ color: rgba(accent, 1) }}>
                                            <DrawCheck size={12} strokeWidth={4} />
                                        </span>
                                        <span className="dsr-body text-[13px]">Copied</span>
                                    </>
                                ) : (
                                    <>
                                        <Link2 size={13} style={{ color: rgba(accent, 0.9) }} aria-hidden />
                                        <span className="dsr-body text-[13px]">Copy link</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </motion.header>

                    {/* ── Equip confirmation ── */}
                    <div
                        className="pointer-events-none fixed left-1/2 top-[calc(var(--nav-h)+var(--dossier-bar-h)+0.75rem)] z-40 -translate-x-1/2"
                        role="status"
                        aria-live="polite"
                    >
                        <AnimatePresence>
                            {equipToast && (
                                <motion.div
                                    key={equipToast}
                                    {...reveal(reduce, bannerToast)}
                                    className="flex items-center gap-2 rounded-full px-3.5 py-2"
                                    style={{
                                        border: `1px solid ${rgba(accent, 0.45)}`,
                                        background: 'var(--dsr-surface-hi)',
                                    }}
                                >
                                    <span className="shrink-0" style={{ color: rgba(accent, 1) }}>
                                        <DrawCheck size={12} />
                                    </span>
                                    <span className="dsr-body whitespace-nowrap text-[13px] text-[var(--dsr-ink)]">
                                        Title equipped — {equipToast}
                                    </span>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center gap-4 py-24" role="status" aria-live="polite">
                            <Loader2 size={26} className="animate-spin" style={{ color: rgba(accent, 1) }} />
                            <span className="dsr-label">Loading dossier</span>
                        </div>
                    ) : fetchFailed ? (
                        <div className="flex flex-col items-center justify-center gap-3 px-6 py-24 text-center">
                            <WifiOff size={30} className="text-[var(--dsr-ink-3)]" aria-hidden />
                            <h2 className="dsr-figure text-[24px]">Connection lost</h2>
                            <p className="dsr-body max-w-[42ch]">
                                {supabase
                                    ? `The archive did not answer for "${targetUsername}".`
                                    : 'No connection to the archive is configured.'}
                            </p>
                            {supabase && (
                                <button
                                    type="button"
                                    onClick={retryFetch}
                                    className="dsr-interactive mt-1 flex items-center gap-2 rounded-full px-4 py-2 outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                                >
                                    <RefreshCw size={13} style={{ color: rgba(accent, 1) }} aria-hidden />
                                    <span className="dsr-body text-[13px] text-[var(--dsr-ink)]">Try again</span>
                                </button>
                            )}
                        </div>
                    ) : notFound ? (
                        <div className="flex flex-col items-center justify-center gap-3 px-6 py-24 text-center">
                            <User size={30} className="text-[var(--dsr-ink-3)]" aria-hidden />
                            <h2 className="dsr-figure text-[24px]">No dossier on record</h2>
                            <p className="dsr-body max-w-[44ch]">
                                "{targetUsername}" has not published a public dossier yet. A dossier appears
                                the first time an operator syncs a result while signed in.
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className={DOSSIER_CONTAINER}>
                                <DossierHeader
                                    username={targetUsername}
                                    isOwnProfile={isOwnProfile}
                                    bannerId={selectedBanner.id}
                                    avatarId={selectedAvatar.id}
                                    accent={accent}
                                    avatarAccent={avatarAccent}
                                    level={displayLevel}
                                    levelProgressPct={levelProgressPct}
                                    xpToNext={xpToNext}
                                    titleName={activeBadge.name}
                                    titleIcon={TITLE_MARK[activeBadge.id]}
                                    onOpenTitles={isOwnProfile ? () => jumpTo('collection') : undefined}
                                    figures={headerFigures}
                                    action={primaryAction}
                                    reduce={reduce}
                                />
                            </div>

                            {/* ── Scroll-spy strip ──
                                Sticks under the stage bar once the header scrolls
                                away. It is a `nav`, not a `tablist`: the sections it
                                lists are all mounted, so it navigates rather than
                                switching. */}
                            <nav
                                aria-label="Dossier sections"
                                className="sticky top-[var(--dossier-bar-h)] z-20 border-y border-[var(--dsr-line)]"
                                style={{ background: 'var(--dsr-floor)' }}
                            >
                                <div className={`${DOSSIER_CONTAINER} hide-scrollbar relative flex gap-1 overflow-x-auto`}>
                                    {/* One indicator that slides, rather than a
                                        `::after` on whichever link is current. That
                                        version teleported, which reads as the strip
                                        redrawing itself rather than as one mark
                                        tracking your position. */}
                                    <span
                                        aria-hidden
                                        className="dsr-spy-glider"
                                        data-ready={glider ? 'true' : 'false'}
                                        style={{
                                            '--spy-x': `${glider?.x ?? 0}px`,
                                            '--spy-w': `${glider?.w ?? 0}px`,
                                        } as React.CSSProperties}
                                    />
                                    {sections.map((s) => (
                                        <button
                                            key={s.id}
                                            ref={(node) => { spyRefs.current[s.id] = node; }}
                                            type="button"
                                            onClick={() => jumpTo(s.id)}
                                            aria-current={activeSection === s.id}
                                            className="dsr-spy-link shrink-0 px-3 py-3 outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                                        >
                                            <span
                                                className="dsr-body text-[13px]"
                                                style={{ color: activeSection === s.id ? 'var(--dsr-ink)' : undefined }}
                                            >
                                                {s.label}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </nav>

                            <div className={`${DOSSIER_CONTAINER} flex flex-col gap-10 py-8`}>
                                {isOwnProfile ? (
                                    <>
                                        {/* ── FORM ── */}
                                        <Section
                                            id="form"
                                            title="Form"
                                            meta={history.length >= 2 ? `last ${Math.min(30, history.length)} of ${history.length}` : undefined}
                                        >
                                            <div className="flex flex-col gap-4">
                                                <FormChartPanel
                                                    history={history}
                                                    accent={accent}
                                                    routeUsername={routeUsername ?? undefined}
                                                    navigate={navigate}
                                                />


                                                {/* ── Activity ──
                                                    The one view here with a real time axis. The
                                                    curves above plot by index, so a fortnight off
                                                    and a fortnight of daily practice draw the same
                                                    line; this is the section that tells them apart. */}
                                                <Panel>
                                                    <PanelHeading
                                                        title="Activity"
                                                        meta={`${activity.activeDays} of the last ${activity.windowDays} days`}
                                                    />
                                                    {history.length > 0 ? (
                                                        <>
                                                            <ActivityCalendar
                                                                cells={activityCells}
                                                                label={`Practice calendar: active on ${activity.activeDays} of the last ${activity.windowDays} days, current streak ${activity.streak} days, longest streak ${activity.longest} days.`}
                                                            />
                                                            <div className="mt-4 border-t border-[var(--dsr-line)] pt-1">
                                                                <FigureRow cols={3}>
                                                                    <Figure
                                                                        label="Current streak"
                                                                        value={activity.streak}
                                                                        unit="days"
                                                                        size="sm"
                                                                        accent={accent}
                                                                        caption={activity.streak > 0 ? 'unbroken' : 'type today to start one'}
                                                                    />
                                                                    <Figure
                                                                        label="Longest streak"
                                                                        value={activity.longest}
                                                                        unit="days"
                                                                        size="sm"
                                                                        accent={accent}
                                                                        caption="all time"
                                                                    />
                                                                    <Figure
                                                                        label="Time typed"
                                                                        value={minutesTyped}
                                                                        unit="min"
                                                                        size="sm"
                                                                        accent={accent}
                                                                        caption={formatMinutes(minutesTyped)}
                                                                    />
                                                                </FigureRow>
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <EmptyNote icon={Flame}>
                                                            Every completed test marks a day here. The board fills in as you
                                                            practise.
                                                        </EmptyNote>
                                                    )}
                                                </Panel>
                                            </div>
                                        </Section>

                                        <Rule />

                                        {/* ── KEYBOARD ── */}
                                        <Section
                                            id="keyboard"
                                            title="Weak Keys"
                                            intro="Per-key accuracy and timing, recorded as you type. This is the view that answers what to practise next."
                                        >
                                            {hasHeatmap ? (
                                                <Panel contain>
                                                    <KeyHeatmap data={heatmap} accent={accent} onStartDrill={onStartDrill} />
                                                </Panel>
                                            ) : (
                                                <EmptyNote icon={Keyboard}>
                                                    Finish a standard test and the board lights up. Custom text is excluded,
                                                    so a drill will not fill it.
                                                </EmptyNote>
                                            )}
                                        </Section>

                                        <Rule />

                                        {/* ── WEAK WORDS ── */}
                                        <Section
                                            id="weak-words"
                                            title="Weak Words"
                                            intro="The words you personally fumble, tracked straight from your keystrokes, each with a spaced review schedule. Review them before they cost you a race."
                                        >
                                            <Panel contain>
                                                <WordWeaknessPanel
                                                    data={wordWeakness}
                                                    due={wordWeaknessDue}
                                                    accent={accent}
                                                    onStartWordDrill={onStartWordDrill}
                                                />
                                            </Panel>
                                        </Section>

                                        <Rule />

                                        {/* ── BEST RUNS ── */}
                                        <Section
                                            id="runs"
                                            title="Best runs"
                                            meta={shapeSplit ? `${shapeSplit.timed} timed · ${shapeSplit.words} word runs` : undefined}
                                        >
                                            <div className="grid gap-4 xl:grid-cols-2 xl:items-start">
                                                <Panel>
                                                    <PanelHeading
                                                        title="On the board"
                                                        meta={intel.bests.length > 0 ? `${intel.bests.length} modes` : undefined}
                                                    />
                                                    {intel.bests.length > 0 ? (
                                                        <DataList>
                                                            {intel.bests.map((best) => (
                                                                <DataRow
                                                                    key={best.modeKey}
                                                                    accent={accent}
                                                                    label={formatModeLabel(best.modeKey)}
                                                                    value={`${best.wpm} WPM`}
                                                                    sub={[
                                                                        best.rank ? `#${best.rank}${best.field ? ` of ${best.field}` : ''}` : null,
                                                                        `${best.accuracy}% accuracy`,
                                                                        best.consistency != null ? `${best.consistency}% consistency` : null,
                                                                        relativeDay(best.achievedAt),
                                                                    ].filter(Boolean).join(' · ')}
                                                                    trailing={raceButton(best.modeKey, 'Race')}
                                                                />
                                                            ))}
                                                        </DataList>
                                                    ) : personalBests.length > 0 ? (
                                                        <>
                                                            <DataList>
                                                                {personalBests.slice(0, 8).map((pb) => (
                                                                    <DataRow
                                                                        key={pb.label}
                                                                        accent={accent}
                                                                        label={pb.label}
                                                                        value={`${pb.wpm} WPM`}
                                                                    />
                                                                ))}
                                                            </DataList>
                                                            <p className="dsr-body mt-3 text-[12px]">
                                                                {intel.unavailable
                                                                    ? 'Local records only — the shared boards are unreachable.'
                                                                    : 'Local records. Sign in and finish a ranked mode to put a run on the shared board.'}
                                                                {personalBests.length > 8 &&
                                                                    ` ${personalBests.length - 8} more configurations on record.`}
                                                            </p>
                                                        </>
                                                    ) : (
                                                        <EmptyNote icon={Timer}>
                                                            A best is recorded per difficulty and length. Finish a standard
                                                            test to open the board.
                                                        </EmptyNote>
                                                    )}
                                                </Panel>

                                                <Panel>
                                                    <PanelHeading
                                                        title="By difficulty"
                                                        meta={modeRows.length > 0 ? `${modeRows.length} levels` : undefined}
                                                    />
                                                    {modeRows.length > 0 ? (
                                                        <DataList>
                                                            {modeRows.map((row) => (
                                                                <DataRow
                                                                    key={row.level}
                                                                    accent={accent}
                                                                    label={row.level}
                                                                    value={`${row.best} WPM`}
                                                                    // Share of your own practice, which is a real
                                                                    // denominator — unlike the 200 WPM ceiling every
                                                                    // bar on this page used to measure against.
                                                                    fill={row.share}
                                                                    sub={`${row.tests} test${row.tests === 1 ? '' : 's'} · ${row.avgWpm} avg WPM · ${row.avgAcc}% accuracy`}
                                                                />
                                                            ))}
                                                        </DataList>
                                                    ) : (
                                                        <EmptyNote icon={Layers}>
                                                            Finish a test in any difficulty and the breakdown fills in. Bars
                                                            show each level's share of your practice.
                                                        </EmptyNote>
                                                    )}
                                                </Panel>
                                            </div>
                                        </Section>

                                        <Rule />

                                        {/* ── LIFETIME ── */}
                                        <Section id="lifetime" title="Lifetime">
                                            <div className="border-y border-[var(--dsr-line)]">
                                                <FigureRow>
                                                    <Figure
                                                        label="Daily streak"
                                                        value={skillStats.dailyStreak}
                                                        unit="days"
                                                        icon={Flame}
                                                        accent={accent}
                                                        caption={`longest ${activity.longest}`}
                                                    />
                                                    <Figure
                                                        label="Words typed"
                                                        value={skillStats.totalWordsTyped}
                                                        icon={Type}
                                                        accent={accent}
                                                        caption="all modes"
                                                    />
                                                    <Figure
                                                        label="Duels won"
                                                        value={skillStats.racesWon}
                                                        icon={Trophy}
                                                        accent={accent}
                                                        caption="multiplayer"
                                                    />
                                                    <Figure
                                                        label="Best combo"
                                                        value={localRPGStats?.bestCombo ?? 0}
                                                        icon={Zap}
                                                        accent={accent}
                                                        caption="flawless keys in a row"
                                                    />
                                                </FigureRow>
                                            </div>
                                        </Section>

                                        <Rule />
                                    </>
                                ) : (
                                    <>
                                        {/* ── HEAD TO HEAD ── */}
                                        <Section
                                            id="versus"
                                            title="Head to head"
                                            meta={intel.head?.lastAt ? `last met ${relativeDay(intel.head.lastAt)}` : undefined}
                                        >
                                            {!viewerId ? (
                                                <EmptyNote icon={Lock}>
                                                    Sign in to see your ranked record against this operator. The ladder keeps
                                                    every resolved duel, so a record appears as soon as you have played one.
                                                </EmptyNote>
                                            ) : intel.head === null ? (
                                                <EmptyNote icon={Swords}>
                                                    No ranked record loaded. Either the ladder is unreachable or you have not
                                                    faced this operator yet.
                                                </EmptyNote>
                                            ) : intel.head.wins + intel.head.losses === 0 ? (
                                                <EmptyNote
                                                    icon={Swords}
                                                    action={canRace && topBest ? raceButton(topBest.modeKey, `Race their ${topBest.wpm} WPM run`) : undefined}
                                                >
                                                    You have never faced {targetUsername} in a ranked duel. Their stored runs
                                                    are raceable in the meantime — a board run carries the pace curve of the
                                                    exact attempt that set it.
                                                </EmptyNote>
                                            ) : (
                                                <div className="border-y border-[var(--dsr-line)]">
                                                    <FigureRow cols={3}>
                                                        <Figure
                                                            label="Your wins"
                                                            value={intel.head.wins}
                                                            icon={Trophy}
                                                            accent={accent}
                                                            caption={`of ${intel.head.wins + intel.head.losses} duels`}
                                                        />
                                                        <Figure
                                                            label="Your losses"
                                                            value={intel.head.losses}
                                                            icon={Swords}
                                                            accent={accent}
                                                            caption={`of ${intel.head.wins + intel.head.losses} duels`}
                                                        />
                                                        <Figure
                                                            label="Their rating"
                                                            value={intel.elo ?? 0}
                                                            unit="Elo"
                                                            icon={Target}
                                                            accent={accent}
                                                            caption="ranked ladder"
                                                            unavailable={intel.elo === null ? 'not published' : undefined}
                                                        />
                                                    </FigureRow>
                                                </div>
                                            )}
                                        </Section>

                                        <Rule />

                                        {/* ── THEIR BEST RUNS ── */}
                                        <Section
                                            id="runs"
                                            title="Best runs"
                                            intro="One row per mode, straight from the shared boards. Every board run stores the pace curve of the attempt that set it, so any of them can be raced as a ghost."
                                            meta={intel.loading ? 'loading' : undefined}
                                        >
                                            {intel.bests.length > 0 ? (
                                                <Panel>
                                                    <DataList>
                                                        {intel.bests.map((best) => (
                                                            <DataRow
                                                                key={best.modeKey}
                                                                accent={accent}
                                                                label={formatModeLabel(best.modeKey)}
                                                                value={`${best.wpm} WPM`}
                                                                sub={[
                                                                    best.rank ? `#${best.rank}${best.field ? ` of ${best.field}` : ''}` : null,
                                                                    `${best.accuracy}% accuracy`,
                                                                    best.consistency != null ? `${best.consistency}% consistency` : null,
                                                                    relativeDay(best.achievedAt),
                                                                ].filter(Boolean).join(' · ')}
                                                                trailing={raceButton(best.modeKey, 'Race ghost')}
                                                            />
                                                        ))}
                                                    </DataList>
                                                </Panel>
                                            ) : intel.loading ? (
                                                <Panel>
                                                    <div className="flex items-center gap-3 py-4">
                                                        <Loader2 size={16} className="animate-spin" style={{ color: rgba(accent, 1) }} />
                                                        <span className="dsr-body text-[13px]">Reading the boards</span>
                                                    </div>
                                                </Panel>
                                            ) : (
                                                <EmptyNote
                                                    icon={Timer}
                                                    action={intel.unavailable ? (
                                                        <button
                                                            type="button"
                                                            onClick={intel.refresh}
                                                            className="dsr-interactive flex items-center gap-1.5 rounded-full px-3 py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                                                        >
                                                            <RefreshCw size={12} style={{ color: rgba(accent, 0.9) }} aria-hidden />
                                                            <span className="dsr-body text-[12px]">Try again</span>
                                                        </button>
                                                    ) : undefined}
                                                >
                                                    {intel.unavailable
                                                        ? 'The shared boards are unreachable from this client, so this operator’s runs cannot be listed.'
                                                        : `${targetUsername} has not posted a run to a shared board yet. Boards cover the standard difficulties and lengths; custom text and the daily challenge are excluded.`}
                                                </EmptyNote>
                                            )}
                                        </Section>

                                        <Rule />
                                    </>
                                )}

                                {/* ── HALL OF LEGENDS ── */}
                                <Section
                                    id="hall-of-legends"
                                    title="Hall of Legends"
                                    meta={`${unlockedAchievements.size}/${ACHIEVEMENTS.length} unlocked`}
                                    intro={
                                        isOwnProfile
                                            ? 'Tiered conquest badges forged through speed, accuracy, endurance, and hardcore trials. Etched permanently into your dossier.'
                                            : 'Conquest achievements unlocked by this operator. Badges test speed, accuracy, streaks, and hardcore constraints.'
                                    }
                                >
                                    <HallOfLegendsPanel
                                        unlockedIds={unlockedAchievements}
                                        accent={accent}
                                        isOwnProfile={isOwnProfile}
                                    />
                                </Section>

                                <Rule />

                                {/* ── TITLES & NAMEPLATES ── */}
                                <Section
                                    id="collection"
                                    title="Titles & Nameplates"
                                    meta={`${collectionEarned}/${collection.length} earned`}
                                    intro={
                                        isOwnProfile
                                            ? 'Titles are equippable and show next to your name everywhere. Badges are earned once and kept.'
                                            : 'A public dossier publishes earned titles. Achievements stay on the operator’s own device.'
                                    }
                                >
                                    <CollectionGrid
                                        items={collection}
                                        accent={accent}
                                        equipPulse={equipPulse}
                                        onEquip={isOwnProfile ? handleSelectTitle : undefined}
                                    />
                                </Section>
                            </div>
                        </>
                    )}

                    {/* ── Footer ──
                        Sits directly under the content, not pinned to the bottom of
                        the viewport: a page footer belongs to the end of the content,
                        and the scroller already handles the case where that lands
                        above the fold. */}
                    <footer className="relative z-30 shrink-0 border-t border-[var(--dsr-line)]">
                        <div className={`${DOSSIER_CONTAINER} flex items-center justify-between gap-3 py-4`}>
                            <span className="dsr-label">
                                {isOwnProfile ? 'Local sync active' : 'Public record'}
                            </span>
                            <span className="dsr-label hidden sm:inline">Esc to go back</span>
                        </div>
                    </footer>
                </div>
            </div>

            {showCustomization && supabase && isOwnProfile && (
                <ProfileCustomizationMenu
                    supabase={supabase}
                    // The forge writes to `public_profiles` keyed by username. This
                    // used to read from the fetched row, which our own dossier never
                    // loads — so "Modify loadout" opened a panel that could not save.
                    username={localUsername ?? undefined}
                    currentAvatarId={avatarId}
                    currentBannerId={bannerId}
                    displayName={targetUsername}
                    level={displayLevel}
                    userStats={{
                        level: displayLevel,
                        wpm: skillStats.maxWpm,
                        combo: localRPGStats?.bestCombo ?? 0,
                    }}
                    onClose={() => setShowCustomization(false)}
                    onUpdate={handleCustomizationUpdate}
                />
            )}
        </>
    );
});
