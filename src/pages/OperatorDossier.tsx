// ═══════════════════════════════════════════════════════════════════════
//  OPERATOR DOSSIER — the player profile, as a page
//  ---------------------------------------------------------------------
//  Reached at `/operator/:username` (or `/operator` for your own), so a
//  dossier is a real destination: it has a URL you can share, and browser
//  back/forward move through it like any other page. It used to be a modal
//  stacked on top of whatever opened it, which meant no address, no history,
//  and a hard cap on how much of it could be on screen at once.
//
//  Layout: a sticky identity rail on the left (banner, avatar with a level
//  ring, active title, XP instrumentation, count cells) and a tabbed deck on
//  the right — Overview · Progress · Titles · Badges · Matrix. The rail never
//  moves, so the operator's identity stays anchored while the deck slides
//  between panels — the same trick console dashboards use to make tab
//  switching feel like one machine rotating rather than five screens
//  crossfading.
//
//  Inside the deck, every section is a `DossierCard` from
//  `components/profile/DossierPieces.tsx`: one radius, one padding scale, one
//  glass treatment. Panels lay those cards out in one or two columns depending
//  on the breakpoint, and nothing re-derives the card frame inline — that is
//  how the spacing stopped drifting section to section.
//
//  Everything accent-coloured reads from the *equipped banner's* glow triplet,
//  so re-skinning your banner in the forge re-skins the whole dossier.
//
//  Data flow: own profile prefers fresh local RPG stats — including the raw
//  test log, personal bests and achievement ids, which `App.tsx` passes down —
//  and only fetches cosmetics. Other players come from `public_profiles`, which
//  stores aggregates only, so the history-derived sections say so rather than
//  rendering zeroes.
// ═══════════════════════════════════════════════════════════════════════

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  Activity, ArrowLeft, Award, BarChart3, Check, ChevronRight, Crosshair, Flame, Gauge, Layers,
  Link2, Loader2, Lock, Medal, RefreshCw, ShieldCheck, Sliders, Sparkles, Target, Timer,
  TrendingUp, Trophy, Type, User, WifiOff, Zap,
} from 'lucide-react';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Theme } from '@/data/constants';
import { ACHIEVEMENTS } from '@/data/constants';
import { achievementIcon } from '@/lib/achievementIcons';
import { TITLE_BADGES, getActiveTitleId, setActiveTitleId, type UserSkillStats } from '@/data/titles';
import { ProfileCustomizationMenu } from '@/components/ProfileCustomizationMenu';
import { ALL_BANNERS, AVATARS } from '@/data/customization';
import { BannerArt } from '@/components/profile/CosmeticArt';
import { AvatarArt } from '@/components/profile/AvatarKeycap';
import {
  ConicHalo, DataStream, DrawCheck, EquipBurst, GlitchText, GridField,
  RadialMeter, Scanlines, SegmentBar, SkillRadar, StatCounter, type RadarAxis,
} from '@/components/profile/ProfileFx';
import {
  DossierCard, EmptyNote, MeterRow, PanelHeading, StatTile,
} from '@/components/profile/DossierPieces';
import { HistorySparkline } from '@/components/profile/HistorySparkline';
import type { HistoryEntry } from '@/lib/history';
import {
  bannerToast, chipSwap, deckIn, pulseHaptic, railIn, shellIn,
  reveal, rgba, springSnappy,
} from '@/components/profile/profileMotion';
import { containerClass } from '@/lib/layout';

interface PublicProfileData {
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
     * `public_profiles` stores aggregates, so the trend line and the per-mode
     * breakdown are genuinely unavailable for another operator rather than
     * merely hidden.
     */
    history?: HistoryEntry[];
    /** Per-configuration personal bests, best first. */
    personalBests?: Array<{ label: string; wpm: number }>;
    /** Unlocked achievement ids, for the badge grid. */
    achievements?: string[];
    skillStats: UserSkillStats;
  };
}

/**
 * Ceilings the tiles and radar normalise against.
 *
 * Named because each number is now read from three places — a tile's `fill`, the
 * footnote that states what the meter is measured against, and the matching
 * matrix axis — and three hand-written `/ 200`s would be free to disagree.
 */
const CEILING = {
  wpm: 200,
  tests: 200,
  streakDays: 30,
  words: 25_000,
  duels: 25,
} as const;

/** How many recent tests the trend line plots. */
const TREND_WINDOW = 30;

/**
 * The page's horizontal gutter, and the only place it is written.
 *
 * The header strip, the tab strip, the tab panel, the identity rail and the
 * footer each carried their own inset (`px-3 sm:px-6 lg:px-8`, `px-3 sm:px-4`,
 * `p-4 sm:p-6 lg:p-7`, `p-6`, `px-4 sm:px-6`), so at any given width the "Back"
 * button, the avatar block, the first tab, the first card and the footer note
 * all started on five different x positions — up to 16px apart. That drift is
 * what reads as the page being out of square. Everything page-level shares this
 * one token now, so those five edges are one vertical line at every breakpoint.
 */
const GUTTER = 'px-4 sm:px-6 lg:px-8';

/**
 * Height of the sticky stage bar, as a custom property on the page root.
 *
 * Four places need this number — the bar itself, the `top` of the sticky tab
 * strip, the `top` of the sticky rail, and the offset of the equip toast — and
 * they were four separate literals (`h-14`, `top-14`, `lg:top-14`,
 * `calc(var(--nav-h)+4.25rem)`). Changing the bar's height meant finding all
 * four; missing one left the tab strip either overlapping the bar or floating
 * below it with a gap of live page showing through.
 */
const DOSSIER_VARS = { '--dossier-bar-h': '3.5rem' } as React.CSSProperties;

const TABS = [
  { id: 'overview', label: 'Overview', icon: Activity },
  { id: 'progress', label: 'Progress', icon: TrendingUp },
  { id: 'titles', label: 'Titles', icon: Award },
  { id: 'badges', label: 'Badges', icon: Medal },
  { id: 'matrix', label: 'Matrix', icon: Crosshair },
] as const;

/** Index of the title registry, for the "open the registry" affordances. */
const TITLES_TAB = TABS.findIndex((t) => t.id === 'titles');

/**
 * `_` and `%` are wildcards in Postgres `ILIKE`, and TypeNova usernames are
 * `[A-Za-z0-9_]` — so `a_b` used to match `axb` too. With `.maybeSingle()` that
 * second match turned into an error and the dossier reported "signal lost" for a
 * profile that exists.
 */
const likeEscape = (value: string) => value.replace(/[\\%_]/g, (m) => `\\${m}`);

/* ─── The dossier ─────────────────────────────────────────────────────── */

export const OperatorDossier = React.memo(function OperatorDossier({
  routeUsername,
  onBack,
  supabase,
  localUsername,
  localRPGStats,
}: OperatorDossierProps) {
  const reduce = useReducedMotion();

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

  const [tab, setTab] = useState(0);
  const [dir, setDir] = useState(1);

  // Pulse key = badge id + a monotonic tick, so re-equipping the same badge
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
      // Cosmetics only — the dossier is already on screen from local data, so a
      // failure just keeps the default skin. It still needs a rejection
      // handler, or the error lands at window scope.
      supabase
        .from('public_profiles')
        .select('avatar_id, banner_id')
        .ilike('username', match)
        .maybeSingle()
        .then(
          ({ data }) => {
            if (!active || !data) return;
            setCosmetics({
              key,
              avatarId: data.avatar_id || 'default',
              bannerId: data.banner_id || 'basic_dark',
            });
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
        // A transport failure is not the same as "no such operator" — showing
        // "signal lost" for a dropped request sent people looking for a profile
        // that was there all along.
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

  const selectTab = useCallback((next: number) => {
    setTab((current) => {
      if (next === current) return current;
      setDir(next > current ? 1 : -1);
      return next;
    });
  }, []);

  // Arrow-key navigation for the tablist. A `role="tablist"` that only responded
  // to clicks left keyboard users unable to reach Titles or Matrix at all once
  // the roving tabindex took the inactive tabs out of the tab order.
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const focusTab = useCallback((index: number) => {
    const next = (index + TABS.length) % TABS.length;
    selectTab(next);
    tabRefs.current[next]?.focus();
  }, [selectTab]);

  const onTabKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    switch (e.key) {
      case 'ArrowRight': e.preventDefault(); focusTab(tab + 1); break;
      case 'ArrowLeft': e.preventDefault(); focusTab(tab - 1); break;
      case 'Home': e.preventDefault(); focusTab(0); break;
      case 'End': e.preventDefault(); focusTab(TABS.length - 1); break;
      default: break;
    }
  }, [focusTab, tab]);

  /**
   * Geometry of the sliding tab indicator, measured from the active button.
   *
   * This replaces a framer `layoutId` pair. Shared-layout projection ran its
   * measure-and-write on the same frame React was mounting an entire new tab
   * panel, so the animation meant to smooth the switch was contending for the
   * frames the switch needed. Here the measurement happens once per change and
   * publishes two custom properties; the movement itself is a CSS transition
   * the compositor owns.
   *
   * `useLayoutEffect` because a measurement read after paint would show the
   * indicator at its previous position for one frame.
   */
  const [glider, setGlider] = useState<{ x: number; w: number } | null>(null);
  useLayoutEffect(() => {
    const node = tabRefs.current[tab];
    if (!node) return;

    const measure = () => {
      const el = tabRefs.current[tab];
      if (!el) return;
      // `offsetLeft` is relative to the strip, which is the glider's containing
      // block — and unlike `getBoundingClientRect` it is unaffected by the
      // strip's horizontal scroll, so the indicator stays on its tab when the
      // strip is scrolled on a narrow viewport.
      setGlider({ x: el.offsetLeft, w: el.offsetWidth });
    };

    measure();

    // The strip is horizontally scrollable and the labels are web-font text, so
    // a font swap or a resize changes a tab's width after the first measure.
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [tab]);

  /**
   * Our own equipped title comes from localStorage (it is authoritative and
   * survives offline); everyone else's comes from their row.
   */
  const equippedTitleId = isOwnProfile ? ownTitleId : remote?.equipped_title || 'novice';

  const handleSelectTitle = async (titleId: string) => {
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
    setEquipToast(badge ? `${badge.icon} ${badge.name}` : titleId);
    pulseHaptic([10, 26, 14]);

    if (pulseTimer.current) clearTimeout(pulseTimer.current);
    pulseTimer.current = setTimeout(() => setPulseTick(null), 900);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setEquipToast(null), 2200);

    // L3: Dispatch event so App.tsx auto-sync effect triggers and updates public_profiles
    // with the latest equipped title immediately across sessions.
    window.dispatchEvent(new Event('titleChanged'));

    // Mirror to the cloud so the title follows you across devices.
    if (supabase && localUsername) {
      try {
        // H9: update() rather than upsert() — an upsert would blank the rest of
        // the row with NULLs. Matched case-insensitively, because the stored
        // username preserves the case it was registered with while callers pass
        // whatever casing they happen to hold.
        const { error } = await supabase
          .from('public_profiles')
          .update({
            equipped_title: titleId,
            updated_at: new Date().toISOString(),
          })
          .ilike('username', likeEscape(localUsername));
        // Supabase resolves rather than throws on a failed write, so an
        // unchecked call swallowed every RLS rejection silently.
        if (error) throw error;
      } catch (e) {
        console.error('Failed to update equipped title on cloud:', e);
      }
    }
  };

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

  const avatarId = (isOwnProfile ? cosmetics?.key === profileKey ? cosmetics.avatarId : undefined : undefined)
    ?? remote?.avatar_id
    ?? 'default';
  const bannerId = (isOwnProfile ? cosmetics?.key === profileKey ? cosmetics.bannerId : undefined : undefined)
    ?? remote?.banner_id
    ?? 'basic_dark';
  const selectedBanner = ALL_BANNERS.find(b => b.id === bannerId) || ALL_BANNERS[0];
  const selectedAvatar = AVATARS.find(a => a.id === avatarId) || AVATARS[0];

  /** The dossier's whole colour identity comes from the equipped banner. */
  const accent = selectedBanner.glowColor || '6, 182, 212';
  const avatarAccent = selectedAvatar.glowColor || accent;

  /** Own dossier judges unlocks from live stats; others from their stored list. */
  const isBadgeUnlocked = useCallback(
    (badge: (typeof TITLE_BADGES)[number]) =>
      isOwnProfile ? badge.isUnlocked(skillStats) : unlockedBadgeIds.has(badge.id),
    [isOwnProfile, skillStats, unlockedBadgeIds]
  );

  const unlockedCount = TITLE_BADGES.filter(isBadgeUnlocked).length;

  /**
   * The matrix axes. Normalised against TypeNova's practical ceilings — never
   * against fake data. One source for both the radar and the readout list; they
   * used to be two parallel arrays that could drift apart (and had).
   */
  const radarRows = useMemo(() => {
    const rows = [
      { key: 'speed', label: 'Speed', display: `${Math.round(skillStats.maxWpm)} WPM`, value: skillStats.maxWpm / CEILING.wpm },
      { key: 'precision', label: 'Precision', display: `${Math.round(skillStats.avgAccuracy)}%`, value: skillStats.avgAccuracy / 100 },
      { key: 'volume', label: 'Volume', display: `${skillStats.testsCompleted.toLocaleString()} tests`, value: skillStats.testsCompleted / CEILING.tests },
    ];
    if (isOwnProfile) {
      rows.push(
        { key: 'streak', label: 'Streak', display: `${skillStats.dailyStreak} days`, value: skillStats.dailyStreak / CEILING.streakDays },
        { key: 'output', label: 'Output', display: `${skillStats.totalWordsTyped.toLocaleString()} words`, value: skillStats.totalWordsTyped / CEILING.words },
        { key: 'duels', label: 'Duels', display: `${skillStats.racesWon} won`, value: skillStats.racesWon / CEILING.duels },
      );
    }
    return rows;
  }, [isOwnProfile, skillStats]);

  /* ─── Local-only detail ──────────────────────────────────────────────────
     Everything below reads the raw test log, which exists for your own dossier
     only. Guarded on `isOwnProfile` rather than on the array being non-empty,
     so a remote operator gets an explicit "not published" note instead of a
     section that looks like it has nothing in it. */

  const history = useMemo<HistoryEntry[]>(
    () => (isOwnProfile ? localRPGStats?.history ?? [] : []),
    [isOwnProfile, localRPGStats]
  );

  /** The last `TREND_WINDOW` tests, oldest first — what the trend line plots. */
  const trend = useMemo(
    () => history.slice(-TREND_WINDOW).map((e) => ({ wpm: e.wpm, acc: e.acc })),
    [history]
  );

  /**
   * Direction of travel: the mean of the most recent third of the window against
   * the mean of the oldest third. A last-vs-first comparison swung wildly on one
   * bad test, which made the readout untrustworthy exactly when it mattered.
   */
  const trendDelta = useMemo(() => {
    if (trend.length < 6) return null;
    const chunk = Math.max(2, Math.floor(trend.length / 3));
    const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
    const early = mean(trend.slice(0, chunk).map((p) => p.wpm));
    const late = mean(trend.slice(-chunk).map((p) => p.wpm));
    return Math.round(late - early);
  }, [trend]);

  /** Best and worst WPM inside the plotted window, for the axis caption. */
  const trendBand = useMemo(() => {
    if (trend.length === 0) return null;
    const wpms = trend.map((p) => p.wpm);
    return { min: Math.min(...wpms), max: Math.max(...wpms) };
  }, [trend]);

  /** Same, for the accuracy strip — its axis is real, so the caption is too. */
  const accBand = useMemo(() => {
    if (trend.length === 0) return null;
    const accs = trend.map((p) => p.acc);
    return { min: Math.min(...accs), max: Math.max(...accs) };
  }, [trend]);

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
    return [...byLevel.entries()]
      .map(([level, r]) => ({
        level,
        tests: r.tests,
        best: Math.round(r.best),
        avgWpm: Math.round(r.wpmSum / r.tests),
        avgAcc: Math.round(r.accSum / r.tests),
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

  /**
   * Achievement badges. Remote operators publish `unlocked_badges` for *titles*
   * only — the achievement list is not in `public_profiles` at all — so the grid
   * is drawn locked-with-a-note rather than pretending they have none.
   */
  const unlockedAchievements = useMemo(
    () => new Set(isOwnProfile ? localRPGStats?.achievements ?? [] : []),
    [isOwnProfile, localRPGStats]
  );

  const achievementGroups = useMemo(() => {
    const order: Array<'SKILL' | 'HARDCORE' | 'GRIND' | 'SUPER'> = ['SKILL', 'HARDCORE', 'GRIND', 'SUPER'];
    return order.map((category) => ({
      category,
      items: ACHIEVEMENTS.filter((a) => a.category === category),
    }));
  }, []);

  const achievementCount = useMemo(
    () => ACHIEVEMENTS.filter((a) => unlockedAchievements.has(a.id)).length,
    [unlockedAchievements]
  );

  const radarAxes: RadarAxis[] = useMemo(
    () => radarRows.map(({ key, label, value }) => ({ key, label, value })),
    [radarRows]
  );

  /**
   * Registry order: equipped first, then the rest of what you've earned, then
   * locked titles sorted by how close they are. A fixed data-file order buried
   * the one you can nearly claim under ones you cannot.
   */
  const orderedBadges = useMemo(() => {
    const rank = (badge: (typeof TITLE_BADGES)[number]) => {
      if (badge.id === equippedTitleId) return 0;
      return isBadgeUnlocked(badge) ? 1 : 2;
    };
    const closeness = (badge: (typeof TITLE_BADGES)[number]) => {
      if (!isOwnProfile) return 0;
      const prog = badge.progress?.(skillStats);
      if (!prog || prog.target <= 0) return 0;
      return Math.max(0, Math.min(1, prog.current / prog.target));
    };
    return [...TITLE_BADGES].sort((a, b) => {
      const byState = rank(a) - rank(b);
      if (byState !== 0) return byState;
      return closeness(b) - closeness(a);
    });
  }, [equippedTitleId, isBadgeUnlocked, isOwnProfile, skillStats]);

  // The forge saved successfully, so paint the new skin immediately rather than
  // waiting for a refetch.
  const handleCustomizationUpdate = useCallback(
    (newAvatarId: string, newBannerId: string) => {
      setCosmetics({ key: profileKey, avatarId: newAvatarId, bannerId: newBannerId });
    },
    [profileKey]
  );

  const titleChipInner = (
    <>
      <span className="text-sm leading-none">{activeBadge.icon}</span>
      <span className="truncate font-mono text-[11px] font-bold tracking-wide">{activeBadge.name}</span>
    </>
  );

  return (
    <>
      {/* The page owns its own scroll container pinned under the navbar, the
          same shape the academy and compete stages use. No backdrop, no focus
          trap, no body scroll lock: this is a destination, not an interruption. */}
      <div
        ref={scrollerRef}
        style={DOSSIER_VARS}
        className="fixed inset-0 top-[var(--nav-h)] z-[var(--z-content)] overflow-y-auto custom-scrollbar"
      >
        {/* Full-bleed: no container, no rounded shell, no card shadow. The
            page IS the surface now — header, content and footer are siblings
            in one flex column that spans the app edge to edge, mirroring the
            academy and compete stages. Bottom padding still clears the
            floating controls dock. */}
        <div className="relative flex min-h-full flex-col pb-[calc(var(--dock-h)+1.75rem)]">
          {/* Reading scrim.
              Two jobs. First contrast: the cards are glass, so between and
              around them the raw shader/wallpaper came straight through, and
              the page's smallest type (8–10px mono labels at white/25–white/35)
              was being read against whatever colour happened to drift past.
              Second, it is what lets `App.tsx` pause the shader on this route —
              a paused canvas is a frozen frame, and freezing something nobody
              can see is free.
              Graded like the Academy's: heaviest at the top where the sticky
              bars meet bare background, easing off further down.

              `-z-10`, not `z-0`: the loading and not-found states are plain
              in-flow divs, and a *positioned* sibling at `z-0` paints on top of
              non-positioned content — the spinner and "signal lost" message
              would have gone behind this. Negative stays inside the page
              scroller's stacking context, which is the same trick
              `AcademyLayout` uses for its scrim. */}
          <div
            aria-hidden
            className="pointer-events-none fixed inset-0 -z-10"
            style={{
              background:
                'linear-gradient(180deg,' +
                ' rgba(5, 7, 12, 0.93) 0px,' +
                ' rgba(5, 7, 12, 0.88) 160px,' +
                ' rgba(5, 7, 12, 0.82) 420px,' +
                ' rgba(5, 7, 12, 0.8) 100%)',
            }}
          />
          {/* Header strip glued to the navbar's lower edge (an Academy-style
              stage bar). Sticky so Back and Copy link stay reachable on every
              tab; a page landmark rather than a dialog titlebar. */}
          <motion.header
            {...reveal(reduce, shellIn)}
            /* No `backdrop-blur` here or on the tab strip below it. Both are
               full-width sticky bars, so a backdrop filter on either one has to
               re-sample and re-rasterise the entire strip on every scroll frame
               — the single worst offender for scroll jank on this page, and it
               was doing it twice. The fill is opaque enough (`/95`) that the
               blur was contributing almost nothing visually. */
            className="sticky top-0 z-30 shrink-0 border-b bg-[#05070c]/95"
            style={{ borderColor: rgba(accent, 0.18) }}
          >
            <div className={`${containerClass('ultra')} flex h-[var(--dossier-bar-h)] items-center justify-between gap-3 ${GUTTER}`}>
              <div className="flex min-w-0 items-center gap-3">
                  {/* Back, not close. A page leaves through history. */}
                  <button
                    type="button"
                    onClick={onBack}
                    className="flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 font-mono text-[9px] font-black uppercase tracking-[0.2em] text-white/60 outline-none transition-colors hover:border-white/25 hover:text-white focus-visible:ring-2 focus-visible:ring-white/40"
                  >
                    <ArrowLeft size={12} />
                    Back
                  </button>
                  <span className="relative hidden h-2.5 w-2.5 shrink-0 items-center justify-center sm:flex" aria-hidden>
                    {/* CSS ping, not a framer loop: this ran for the entire life
                        of the page, writing a style every frame, for a 10px dot. */}
                    <span
                      className="fx-ping absolute inset-0 rounded-full"
                      style={{ background: rgba(accent, 0.9) }}
                    />
                    <span className="relative h-1.5 w-1.5 rounded-full" style={{ background: rgba(accent, 1) }} />
                  </span>
                  {/* The page's real heading. `tabIndex={-1}` makes it a focus
                      target on route change so the new dossier is announced. */}
                  <h1
                    ref={headingRef}
                    tabIndex={-1}
                    className="min-w-0 truncate font-mono text-[10px] font-black uppercase tracking-[0.34em] text-white/70 outline-none"
                  >
                    Operator Dossier
                    <span className="ml-3 hidden font-mono text-[10px] font-normal tracking-[0.2em] text-white/25 sm:inline">
                      // {targetUsername.toUpperCase()}
                    </span>
                  </h1>
                </div>

                <button
                  type="button"
                  onClick={copyLink}
                  className="flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 font-mono text-[9px] font-black uppercase tracking-[0.2em] text-white/70 outline-none transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-white/40"
                  style={{ borderColor: rgba(accent, 0.35), background: rgba(accent, 0.1) }}
                >
                  {linkCopied ? (
                    <>
                      <span style={{ color: rgba(accent, 1) }}><DrawCheck size={11} strokeWidth={4} /></span>
                      Copied
                    </>
                  ) : (
                    <>
                      <Link2 size={12} style={{ color: rgba(accent, 1) }} />
                      Copy link
                    </>
                  )}
                </button>
            </div>
          </motion.header>

          {/* ─── Equip confirmation ─── */}
          {/* Fixed to the viewport rather than absolutely positioned in a
              card: page-scale means the toast rides over whichever tab is
              live, always under the navbar's lower edge. */}
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
                      className="flex items-center gap-2 rounded-full border px-3.5 py-1.5 backdrop-blur-md"
                      style={{
                        borderColor: rgba(accent, 0.5),
                        background: rgba(accent, 0.14),
                        boxShadow: `0 0 24px ${rgba(accent, 0.35)}`,
                      }}
                    >
                      <span className="shrink-0" style={{ color: rgba(accent, 1) }}>
                        <DrawCheck size={11} />
                      </span>
                      <span className="whitespace-nowrap font-mono text-[10px] font-black uppercase tracking-[0.2em] text-white">
                        Title equipped — {equipToast}
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* ─── Body ─── */}
              {/* Full-bleed column under the stage bar. Width discipline comes
                  from the rail/deck grid itself, so loading, not-found and
                  dossier states all share one anatomy. */}
              {loading ? (
                <div className="flex flex-col items-center justify-center gap-4 py-20" role="status" aria-live="polite">
                  <Loader2 size={30} className="animate-spin" style={{ color: rgba(accent, 1) }} />
                  <span className="font-mono text-[11px] font-black uppercase tracking-[0.3em] text-white/50">
                    Decrypting dossier…
                  </span>
                  <div className="flex w-40 gap-1" aria-hidden>
                    {Array.from({ length: 12 }, (_, i) => (
                      <span
                        key={i}
                        className="fx-pulse h-1 flex-1 rounded-full"
                        style={{ background: rgba(accent, 0.8), animationDelay: `${i * 80}ms` }}
                      />
                    ))}
                  </div>
                </div>
              ) : fetchFailed ? (
                <div className="flex flex-col items-center justify-center gap-3 px-6 py-20 text-center">
                  <WifiOff size={38} className="text-white/15" />
                  <GlitchText
                    text="LINK DOWN"
                    className="font-sans text-lg font-black uppercase tracking-[0.3em] text-white"
                  />
                  <p className="max-w-xs font-mono text-[11px] leading-relaxed text-white/40">
                    {supabase
                      ? `Couldn't reach the archive for "${targetUsername}".`
                      : 'No connection to the archive is configured.'}
                  </p>
                  {supabase && (
                    <button
                      type="button"
                      onClick={retryFetch}
                      className="mt-1 flex items-center gap-2 rounded-full border px-4 py-2 font-mono text-[10px] font-black uppercase tracking-[0.22em] text-white outline-none transition-colors focus-visible:ring-2 focus-visible:ring-white/40"
                      style={{ borderColor: rgba(accent, 0.45), background: rgba(accent, 0.12) }}
                    >
                      <RefreshCw size={12} style={{ color: rgba(accent, 1) }} />
                      Retry
                    </button>
                  )}
                </div>
              ) : notFound ? (
                <div className="flex flex-col items-center justify-center gap-3 px-6 py-20 text-center">
                  <User size={40} className="text-white/15" />
                  <GlitchText
                    text="SIGNAL LOST"
                    className="font-sans text-lg font-black uppercase tracking-[0.3em] text-white"
                  />
                  <p className="max-w-xs font-mono text-[11px] leading-relaxed text-white/40">
                    "{targetUsername}" has no public dossier on record yet.
                  </p>
                </div>
              ) : (
                <div className={`${containerClass('ultra')} relative z-20 grid w-full lg:grid-cols-[340px_1fr]`}>
                  {/* ─── Identity rail ─── */}
                  {/* Sticky rather than height-locked: the page scrolls now, so
                      the rail can stay pinned beside a deck of any length
                      instead of forcing both into their own scroll boxes.
                      The breakpoint is `lg`, not `md`: at 768px a 320px rail left
                      the deck too narrow for a two-up tile grid, so the columns
                      stack until there is room for both. */}
                  <motion.aside
                    {...reveal(reduce, railIn)}
                    /* The sticky offset is the stage bar's height, so the rail's
                       top edge lands exactly on the bar's lower edge instead of
                       sliding under it.

                       The height cap is measured against the *scrollport*: this
                       page's scroller already starts at `--nav-h`, so the space
                       visible below the sticky bar is
                       `100vh - --nav-h - --dossier-bar-h`, and the dock is fixed
                       over the bottom of it. The old cap (`100vh - --nav-h - 7rem`)
                       was 32px too tall for that, which ran the rail's last row —
                       the "Modify Loadout" button — underneath the floating
                       controls dock. */
                    className="relative flex flex-col overflow-hidden border-b lg:sticky lg:top-[var(--dossier-bar-h)] lg:max-h-[calc(100vh-var(--nav-h)-var(--dossier-bar-h)-var(--dock-h)-1rem)] lg:self-start lg:border-b-0 lg:border-r"
                    style={{ borderColor: rgba(accent, 0.16) }}
                  >
                    {/* The equipped banner, drawn as a real scene, fading into
                        the panel so the identity block stays readable.

                        `compact` deliberately: the rail is ~340px wide and the
                        scrim below covers it from 40% down, so the `full` tier's
                        extra work — an feTurbulence cloud pass, displacement-
                        mapped caustics and up to 110 stars with 30 animated
                        motes — was re-rasterising a filtered SVG every frame to
                        render detail that is invisible here. The forge's picker
                        already uses this tier for the same reason. */}
                    <BannerArt id={selectedBanner.id} detail="compact" />
                    <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-transparent via-[#05070c]/80 to-[#05070c]" />
                    <div
                      aria-hidden
                      className="absolute -top-20 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full opacity-30 blur-3xl"
                      style={{ background: rgba(accent, 0.7) }}
                    />
                    <Scanlines />

                    {/* `min-h-0` is what makes the scroll real: a flex child
                        defaults to `min-height: auto`, so without it the rail
                        grew past its own `max-h` instead of scrolling.

                        Horizontal padding is the page gutter, so the avatar
                        column is centred on the same field the header's Back
                        button starts from. */}
                    <div className={`custom-scrollbar relative z-10 flex min-h-0 flex-1 flex-col items-center gap-5 overflow-y-auto py-6 ${GUTTER}`}>
                      {/* Avatar + level ring */}
                      <div className="relative">
                        <ConicHalo color={avatarAccent} inset={-10} duration={11} className="rounded-full opacity-60 blur-[7px]" />
                        <RadialMeter value={levelProgressPct / 100} size={118} stroke={3} color={accent} delay={0.3}>
                          {/* Hovering lifts the cap, tapping bottoms it out —
                              a keycap should behave like one. */}
                          <motion.div
                            whileHover={reduce ? undefined : { y: -3, scale: 1.04 }}
                            whileTap={reduce ? undefined : { y: 3, scale: 0.99 }}
                            transition={springSnappy}
                            className="relative flex items-center justify-center"
                            style={{ filter: `drop-shadow(0 6px 14px rgba(0,0,0,0.55)) drop-shadow(0 0 18px ${rgba(avatarAccent, 0.45)})` }}
                          >
                            <AvatarArt id={selectedAvatar.id} size={86} />
                          </motion.div>
                        </RadialMeter>

                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2">
                          <motion.div
                            initial={reduce ? false : { scale: 0, y: 8 }}
                            animate={{ scale: 1, y: 0 }}
                            transition={{ delay: 0.4, duration: 0.42, ease: [0.34, 1.56, 0.64, 1] }}
                            className="rounded-full border-2 border-[#05070c] px-2.5 py-0.5 font-mono text-[10px] font-black tracking-widest text-black"
                            style={{ background: rgba(accent, 1), boxShadow: `0 0 16px ${rgba(accent, 0.6)}` }}
                          >
                            LVL {displayLevel}
                          </motion.div>
                        </div>
                      </div>

                      {/* Handle */}
                      <div className="mt-1 flex flex-col items-center gap-1.5 text-center">
                        <h2 className="max-w-[240px] truncate font-sans text-xl font-black tracking-tight text-white">
                          <GlitchText key={targetUsername} text={targetUsername} />
                        </h2>
                        <div className="flex items-center gap-1.5">
                          {isOwnProfile && (
                            <span
                              className="rounded px-1.5 py-0.5 font-mono text-[8px] font-black tracking-[0.2em]"
                              style={{ background: rgba(accent, 0.2), color: rgba(accent, 1), border: `1px solid ${rgba(accent, 0.4)}` }}
                            >
                              YOU
                            </span>
                          )}
                          {/* The banner's name used to sit here bare, so a banner
                              called "Grandmaster" read as an earned rank. */}
                          <span className="font-mono text-[9px] uppercase tracking-[0.24em] text-white/30">
                            <span className="text-white/20">Banner ·</span> {selectedBanner.name}
                          </span>
                        </div>
                      </div>

                      {/* Active title */}
                      <div className="relative flex w-full justify-center">
                        <AnimatePresence mode="popLayout" initial={false}>
                          {isOwnProfile ? (
                            <motion.button
                              key={activeBadge.id}
                              {...reveal(reduce, chipSwap)}
                              whileHover={reduce ? undefined : { scale: 1.04 }}
                              whileTap={reduce ? undefined : { scale: 0.96 }}
                              type="button"
                              // Derived from `TABS` rather than hardcoded: the
                              // registry moved from index 1 to 2 when the Progress
                              // tab landed, and a literal here would have sent the
                              // chip to the wrong panel silently.
                              onClick={() => selectTab(TITLES_TAB)}
                              className={`flex max-w-full items-center gap-2 rounded-full border px-3 py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${activeBadge.color}`}
                              title="Open the title registry"
                            >
                              {titleChipInner}
                              <ChevronRight size={12} className="shrink-0 opacity-60" />
                            </motion.button>
                          ) : (
                            <motion.div
                              key={activeBadge.id}
                              {...reveal(reduce, chipSwap)}
                              className={`flex max-w-full items-center gap-2 rounded-full border px-3 py-1.5 ${activeBadge.color}`}
                            >
                              {titleChipInner}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* XP instrumentation */}
                      <div className="glass-card w-full space-y-2.5 rounded-2xl p-4" style={{ borderColor: rgba(accent, 0.2) }}>
                        <div className="flex items-baseline justify-between font-mono text-[9px] uppercase tracking-[0.22em]">
                          <span className="text-white/40">Experience</span>
                          <span className="font-black" style={{ color: rgba(accent, 1) }}>
                            <StatCounter value={displayXp} /> XP
                          </span>
                        </div>
                        {/* The segmented bar is decorative; the real value is on
                            the progressbar role so it is announced once. */}
                        <div
                          role="progressbar"
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={Math.round(levelProgressPct)}
                          aria-label={`Level ${displayLevel} progress`}
                        >
                          <SegmentBar value={levelProgressPct / 100} color={accent} segments={20} height={9} />
                        </div>
                        <div className="flex items-center justify-between font-mono text-[9px] tracking-wider text-white/35">
                          <span>LVL {displayLevel}</span>
                          <span>{xpToNext.toLocaleString()} XP → LVL {displayLevel + 1}</span>
                        </div>
                      </div>

                      {/* Rail mini-stats. Two columns rather than three: at a
                          340px rail a three-up grid clipped four-digit test
                          counts, and the extra cells (badges, combo) had nowhere
                          to go. Every cell here is a *count* — the measured
                          metrics live in the deck. */}
                      <dl className="grid w-full grid-cols-2 gap-2.5">
                        <div className="glass-card rounded-xl p-3 text-center">
                          <dt className="font-mono text-[8px] uppercase tracking-[0.2em] text-white/35">Titles</dt>
                          <dd className="mt-1.5 font-sans text-base font-black text-white">
                            {unlockedCount}
                            <span className="text-white/30">/{TITLE_BADGES.length}</span>
                          </dd>
                        </div>
                        <div className="glass-card rounded-xl p-3 text-center">
                          <dt className="font-mono text-[8px] uppercase tracking-[0.2em] text-white/35">Tests</dt>
                          <dd className="mt-1.5 font-sans text-base font-black text-white">
                            {skillStats.testsCompleted.toLocaleString()}
                          </dd>
                        </div>
                        {/* Streak, badges and combo come from local state only, so
                            these cells simply do not exist on another operator's
                            rail rather than showing a misleading zero. */}
                        {isOwnProfile && (
                          <>
                            <div className="glass-card rounded-xl p-3 text-center">
                              <dt className="font-mono text-[8px] uppercase tracking-[0.2em] text-white/35">Streak</dt>
                              <dd className="mt-1.5 font-sans text-base font-black text-white">
                                {skillStats.dailyStreak}
                                <span className="text-white/30">d</span>
                              </dd>
                            </div>
                            <div className="glass-card rounded-xl p-3 text-center">
                              <dt className="font-mono text-[8px] uppercase tracking-[0.2em] text-white/35">Badges</dt>
                              <dd className="mt-1.5 font-sans text-base font-black text-white">
                                {achievementCount}
                                <span className="text-white/30">/{ACHIEVEMENTS.length}</span>
                              </dd>
                            </div>
                            <div className="glass-card col-span-2 rounded-xl p-3 text-center">
                              <dt className="font-mono text-[8px] uppercase tracking-[0.2em] text-white/35">Best combo</dt>
                              <dd className="mt-1.5 font-sans text-base font-black text-white">
                                {(localRPGStats?.bestCombo ?? 0).toLocaleString()}
                                <span className="ml-1 font-mono text-[9px] font-bold text-white/30">flawless keys</span>
                              </dd>
                            </div>
                          </>
                        )}
                      </dl>

                      {isOwnProfile && (
                        <motion.button
                          whileHover={reduce ? undefined : { y: -2 }}
                          whileTap={reduce ? undefined : { scale: 0.985 }}
                          transition={springSnappy}
                          type="button"
                          onClick={() => setShowCustomization(true)}
                          className="group relative mt-auto flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl border py-3 font-mono text-[10px] font-black uppercase tracking-[0.24em] text-white outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                          style={{ borderColor: rgba(accent, 0.45), background: rgba(accent, 0.12) }}
                        >
                          <span
                            aria-hidden
                            className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full"
                          />
                          <Sliders size={13} style={{ color: rgba(accent, 1) }} />
                          Modify Loadout
                        </motion.button>
                      )}
                    </div>

                    <DataStream seed={targetUsername} className="relative z-10 border-t border-white/[0.06] px-4 py-1.5" />
                  </motion.aside>

                  {/* ─── Tab deck ─── */}
                  {/* `min-w-0`: a grid item defaults to `min-width: auto`, so the
                      `1fr` track would be pushed wider than the container by the
                      tab strip's intrinsic width instead of letting it scroll. */}
                  <motion.section {...reveal(reduce, deckIn)} className="relative flex min-w-0 flex-col">
                    <div
                      role="tablist"
                      aria-label="Dossier sections"
                      aria-orientation="horizontal"
                      // Sticky inside the page scroller, so the tabs stay
                      // reachable on a long registry without a nested scroll box.
                      // Five tabs no longer fit a phone, so the strip scrolls
                      // horizontally rather than wrapping into two rows — a
                      // wrapped tablist puts the active laser on a different line
                      // from the tab it belongs to.
                      // `sticky` is also the glider's containing block, and its
                      // `z-20` opens a stacking context — which is what keeps the
                      // glider's `-z-10` above this strip's own background instead
                      // of disappearing behind the page.
                      className={`hide-scrollbar sticky top-[var(--dossier-bar-h)] z-20 flex shrink-0 items-end gap-1 overflow-x-auto border-b bg-[#05070c]/95 pt-3 ${GUTTER}`}
                      style={{ borderColor: rgba(accent, 0.16) }}
                      onKeyDown={onTabKeyDown}
                    >
                      {/* One shared indicator that slides, rather than a pair of
                          `layoutId` elements that remount per tab. Two nodes:
                          the tab's raised background, and the laser on the
                          border it sits on. */}
                      <span
                        aria-hidden
                        className="dossier-glider bottom-0 top-3 -z-10 rounded-t-xl border border-b-0"
                        data-ready={glider ? 'true' : 'false'}
                        style={{
                          '--glider-x': `${glider?.x ?? 0}px`,
                          '--glider-w': `${glider?.w ?? 0}px`,
                          background: rgba(accent, 0.13),
                          borderColor: rgba(accent, 0.35),
                        } as React.CSSProperties}
                      />
                      <span
                        aria-hidden
                        className="dossier-glider -bottom-px h-[2px] rounded-full"
                        data-ready={glider ? 'true' : 'false'}
                        style={{
                          // Inset 8px each side, so the laser reads as underlining
                          // the label rather than filling the whole tab.
                          '--glider-x': `${(glider?.x ?? 0) + 8}px`,
                          '--glider-w': `${Math.max(0, (glider?.w ?? 0) - 16)}px`,
                          background: rgba(accent, 1),
                          boxShadow: `0 0 12px ${rgba(accent, 0.9)}`,
                        } as React.CSSProperties}
                      />

                      {TABS.map((t, i) => {
                        const TabIcon = t.icon;
                        const active = tab === i;
                        return (
                          <button
                            key={t.id}
                            ref={(node) => { tabRefs.current[i] = node; }}
                            id={`dossier-tab-${t.id}`}
                            role="tab"
                            type="button"
                            aria-selected={active}
                            aria-controls={`dossier-panel-${t.id}`}
                            // Roving tabindex: the tablist is one stop, and the
                            // arrow keys move between tabs inside it.
                            tabIndex={active ? 0 : -1}
                            onClick={() => selectTab(i)}
                            className={`relative flex shrink-0 items-center gap-2 rounded-t-xl px-3 py-3 font-mono text-[10px] font-black uppercase tracking-[0.22em] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-white/40 sm:px-4 ${active ? 'text-white' : 'text-white/40 hover:text-white/75'}`}
                          >
                            <TabIcon size={13} style={active ? { color: rgba(accent, 1) } : undefined} />
                            {t.label}
                          </button>
                        );
                      })}
                    </div>

                    <div className="relative flex-1">
                      {/* No `AnimatePresence`: `mode="wait"` held the outgoing
                          panel mounted for its whole exit before mounting the
                          incoming one, so every tab switch paid two full panel
                          trees plus an exit tween before the new panel could
                          even start rendering. The new panel now mounts
                          immediately and plays a 240ms CSS entrance, keyed so
                          React remounts it per tab. */}
                      <div
                        key={TABS[tab].id}
                        id={`dossier-panel-${TABS[tab].id}`}
                        role="tabpanel"
                        aria-labelledby={`dossier-tab-${TABS[tab].id}`}
                        // Drives which direction the CSS entrance slides from.
                        data-dir={dir}
                        /* Same gutter as the tab strip above it, so a card's
                           left edge lines up with the first tab's box. They
                           used to differ by 8–12px at every breakpoint. */
                        className={`dossier-panel-in py-5 sm:py-6 ${GUTTER}`}
                      >
                          {/* ── OVERVIEW ──
                              Two content columns at xl: metrics on the left,
                              progression instrumentation on the right. Below that
                              the cards stack, which is why each one is a complete
                              unit rather than a half-width fragment. */}
                          {tab === 0 && (
                            <div className="grid gap-5 xl:grid-cols-[1.35fr_1fr] xl:items-start">
                              {/* The stagger is per column, not on the grid: the grid
                                  has exactly two children, so hanging it there would
                                  animate two half-page slabs instead of the cards. */}
                              <div className="dossier-stagger flex flex-col gap-5">
                                <DossierCard accent={accent}>
                                  <PanelHeading
                                    icon={Activity}
                                    title="Combat Telemetry"
                                    // The old hint read "Personal bests", but only
                                    // Max Speed is a best — accuracy is a rolling
                                    // average and tests are a count.
                                    hint="Lifetime"
                                    accent={accent}
                                  />
                                  <div className="dossier-stagger grid grid-cols-2 gap-3 sm:grid-cols-3">
                                    <StatTile
                                      label="Max Speed"
                                      value={skillStats.maxWpm}
                                      unit="WPM"
                                      fill={skillStats.maxWpm / CEILING.wpm}
                                      accent="251, 191, 36"
                                      icon={Zap}
                                      footnote={`of ${CEILING.wpm} ceiling`}
                                    />
                                    <StatTile
                                      label="Avg Accuracy"
                                      value={skillStats.avgAccuracy}
                                      unit="%"
                                      decimals={skillStats.avgAccuracy % 1 === 0 ? 0 : 1}
                                      fill={skillStats.avgAccuracy / 100}
                                      accent="52, 211, 153"
                                      icon={Target}
                                      footnote="last 20 tests"
                                    />
                                    <StatTile
                                      label="Tests Run"
                                      value={skillStats.testsCompleted}
                                      fill={skillStats.testsCompleted / CEILING.tests}
                                      accent={accent}
                                      icon={ShieldCheck}
                                      span="col-span-2 sm:col-span-1"
                                      footnote="completed runs"
                                    />
                                  </div>
                                </DossierCard>

                                <DossierCard accent={accent}>
                                  <PanelHeading
                                    icon={Flame}
                                    title="Endurance"
                                    hint={isOwnProfile ? 'Local record' : 'Private'}
                                    accent={accent}
                                  />
                                  <div className="dossier-stagger grid grid-cols-2 gap-3 sm:grid-cols-3">
                                    <StatTile
                                      label="Daily Streak"
                                      value={skillStats.dailyStreak}
                                      unit="days"
                                      fill={skillStats.dailyStreak / CEILING.streakDays}
                                      accent="251, 146, 60"
                                      icon={Flame}
                                      available={isOwnProfile}
                                      footnote={`of ${CEILING.streakDays}-day ceiling`}
                                    />
                                    <StatTile
                                      label="Words Typed"
                                      value={skillStats.totalWordsTyped}
                                      fill={skillStats.totalWordsTyped / CEILING.words}
                                      accent="168, 85, 247"
                                      icon={Type}
                                      available={isOwnProfile}
                                      footnote="lifetime output"
                                    />
                                    <StatTile
                                      label="Duels Won"
                                      value={skillStats.racesWon}
                                      fill={skillStats.racesWon / CEILING.duels}
                                      accent="234, 179, 8"
                                      icon={Trophy}
                                      available={isOwnProfile}
                                      span="col-span-2 sm:col-span-1"
                                      footnote="multiplayer wins"
                                    />
                                  </div>
                                </DossierCard>
                              </div>

                              <div className="dossier-stagger flex flex-col gap-5">
                                <DossierCard accent={accent}>
                                  <GridField color={accent} alpha={0.06} cell={20} />
                                  <div className="relative">
                                    <PanelHeading icon={Sparkles} title="Progression" hint={`LVL ${displayLevel}`} accent={accent} />
                                    <div className="flex items-center gap-5">
                                      <RadialMeter value={levelProgressPct / 100} size={92} stroke={4} color={accent} delay={0.25}>
                                        <div className="text-center leading-none">
                                          <div className="font-sans text-2xl font-black text-white">{displayLevel}</div>
                                          <div className="font-mono text-[7px] uppercase tracking-[0.2em] text-white/40">Level</div>
                                        </div>
                                      </RadialMeter>
                                      <div className="min-w-0 flex-1">
                                        <div className="font-sans text-2xl font-black leading-none tracking-tight text-white">
                                          {Math.round(levelProgressPct)}
                                          <span className="text-sm text-white/40">% to LVL {displayLevel + 1}</span>
                                        </div>
                                        <div className="mt-1.5 font-mono text-[10px] text-white/35">
                                          {displayXp.toLocaleString()} / {nextLevelXp.toLocaleString()} XP
                                        </div>
                                      </div>
                                    </div>
                                    <div className="mt-5">
                                      <SegmentBar value={levelProgressPct / 100} color={accent} segments={26} height={12} delay={0.3} />
                                      <div className="mt-2.5 flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.18em] text-white/30">
                                        <Sparkles size={10} style={{ color: rgba(accent, 0.8) }} />
                                        {xpToNext.toLocaleString()} XP remaining
                                      </div>
                                    </div>
                                  </div>
                                </DossierCard>

                                {/* Trend preview. The full plot lives on the
                                    Progress tab; this is the one-glance version so
                                    the landing tab says something about direction
                                    rather than only about totals. */}
                                <DossierCard accent={accent}>
                                  <PanelHeading
                                    icon={TrendingUp}
                                    title="Recent Form"
                                    hint={trend.length >= 2 ? `${trend.length} tests` : undefined}
                                    accent={accent}
                                  />
                                  {trend.length >= 2 ? (
                                    <>
                                      <HistorySparkline points={trend} accent={accent} height={96} />
                                      <div className="mt-3 flex items-center justify-between gap-3">
                                        <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-white/30">
                                          {trendBand ? `${trendBand.min}–${trendBand.max} WPM band` : ''}
                                        </span>
                                        {trendDelta !== null && (
                                          <span
                                            className="font-mono text-[10px] font-black uppercase tracking-[0.16em]"
                                            style={{ color: trendDelta >= 0 ? 'rgb(52, 211, 153)' : 'rgb(248, 113, 113)' }}
                                          >
                                            {trendDelta >= 0 ? '+' : ''}{trendDelta} WPM
                                          </span>
                                        )}
                                      </div>
                                    </>
                                  ) : (
                                    <EmptyNote icon={TrendingUp}>
                                      {isOwnProfile
                                        ? 'Complete a few more tests and your form curve appears here.'
                                        : 'Test history is not published on a public dossier.'}
                                    </EmptyNote>
                                  )}
                                </DossierCard>
                              </div>
                            </div>
                          )}

                          {/* ── PROGRESS ──
                              The detail the aggregates cannot carry: where the
                              numbers came from and which way they are moving. All
                              of it reads the local test log, so a public dossier
                              gets one honest note instead of four empty cards. */}
                          {tab === 1 && (
                            <div className="dossier-stagger flex flex-col gap-5">
                              {!isOwnProfile ? (
                                <DossierCard accent={accent}>
                                  <PanelHeading icon={TrendingUp} title="Performance Log" hint="Private" accent={accent} />
                                  <EmptyNote icon={Lock}>
                                    A public dossier publishes totals only — level, best speed, average
                                    accuracy and test count. Per-test history stays on this operator's
                                    own device.
                                  </EmptyNote>
                                </DossierCard>
                              ) : (
                                <>
                                  <DossierCard accent={accent}>
                                    <PanelHeading
                                      icon={BarChart3}
                                      title="Form Curve"
                                      hint={trend.length >= 2 ? `last ${trend.length} of ${history.length}` : undefined}
                                      accent={accent}
                                    />
                                    {trend.length >= 2 ? (
                                      <>
                                        <HistorySparkline points={trend} accent={accent} height={168} />

                                        {/* Accuracy used to be a dashed overlay on the
                                            WPM line, sharing its frame but not its axis
                                            — two units in one box, which is why it read
                                            as noise. It gets its own strip on a real
                                            0–100 axis instead. */}
                                        <div className="mt-4 flex items-center justify-between gap-3">
                                          <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/35">
                                            Accuracy
                                          </span>
                                          <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-white/25">
                                            {accBand ? `${accBand.min}–${accBand.max}%` : ''}
                                          </span>
                                        </div>
                                        <HistorySparkline
                                          points={trend}
                                          accent="52, 211, 153"
                                          height={72}
                                          series="acc"
                                        />

                                        <div className="mt-4 grid gap-3 sm:grid-cols-3">
                                          <div className="glass-card rounded-xl p-3">
                                            <div className="font-mono text-[8px] uppercase tracking-[0.2em] text-white/35">Window band</div>
                                            <div className="mt-1.5 font-sans text-sm font-black text-white">
                                              {trendBand ? `${trendBand.min}–${trendBand.max}` : '—'}
                                              <span className="ml-1 font-mono text-[9px] font-bold text-white/30">WPM</span>
                                            </div>
                                          </div>
                                          <div className="glass-card rounded-xl p-3">
                                            <div className="font-mono text-[8px] uppercase tracking-[0.2em] text-white/35">Trend</div>
                                            <div
                                              className="mt-1.5 font-sans text-sm font-black"
                                              style={{
                                                color: trendDelta === null
                                                  ? 'rgba(255,255,255,0.5)'
                                                  : trendDelta >= 0 ? 'rgb(52, 211, 153)' : 'rgb(248, 113, 113)',
                                              }}
                                            >
                                              {trendDelta === null ? 'Building' : `${trendDelta >= 0 ? '+' : ''}${trendDelta} WPM`}
                                            </div>
                                          </div>
                                          <div className="glass-card rounded-xl p-3">
                                            <div className="font-mono text-[8px] uppercase tracking-[0.2em] text-white/35">Latest</div>
                                            <div className="mt-1.5 font-sans text-sm font-black text-white">
                                              {trend[trend.length - 1].wpm}
                                              <span className="ml-1 font-mono text-[9px] font-bold text-white/30">
                                                WPM · {trend[trend.length - 1].acc}%
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                        <p className="mt-3 font-mono text-[9px] leading-relaxed text-white/25">
                                          WPM is scaled to the band above rather than to zero, so the shape
                                          stays readable — the floor and ceiling are printed beside it so the
                                          exaggeration is never silent. Trend compares the mean of the newest
                                          third against the oldest third.
                                        </p>
                                      </>
                                    ) : (
                                      <EmptyNote icon={BarChart3}>
                                        Two or more completed tests are needed to draw a curve. Custom texts are
                                        excluded from history, so drills do not count here.
                                      </EmptyNote>
                                    )}
                                  </DossierCard>

                                  <div className="grid gap-5 xl:grid-cols-2 xl:items-start">
                                    <DossierCard accent={accent}>
                                      <PanelHeading
                                        icon={Layers}
                                        title="By Difficulty"
                                        hint={shapeSplit ? `${shapeSplit.timed} timed · ${shapeSplit.words} words` : undefined}
                                        accent={accent}
                                      />
                                      {modeRows.length > 0 ? (
                                        <div className="dossier-stagger flex flex-col gap-2.5">
                                          {modeRows.map((row) => (
                                            <MeterRow
                                              key={row.level}
                                              label={row.level}
                                              value={`${row.best} WPM best`}
                                              fill={row.best / CEILING.wpm}
                                              accent={accent}
                                              sub={`${row.tests} test${row.tests === 1 ? '' : 's'} · ${row.avgWpm} avg WPM · ${row.avgAcc}% acc`}
                                            />
                                          ))}
                                        </div>
                                      ) : (
                                        <EmptyNote icon={Layers}>
                                          Finish a test in any difficulty and the breakdown fills in.
                                        </EmptyNote>
                                      )}
                                    </DossierCard>

                                    <DossierCard accent={accent}>
                                      <PanelHeading
                                        icon={Timer}
                                        title="Personal Bests"
                                        hint={personalBests.length > 0 ? `${personalBests.length} configs` : undefined}
                                        accent={accent}
                                      />
                                      {personalBests.length > 0 ? (
                                        <div className="dossier-stagger flex flex-col gap-2.5">
                                          {/* Capped at eight: the board is a highlight
                                              reel, and every configuration ever played
                                              would push the card past the fold. */}
                                          {personalBests.slice(0, 8).map((pb) => (
                                            <MeterRow
                                              key={pb.label}
                                              label={pb.label}
                                              value={`${pb.wpm} WPM`}
                                              fill={pb.wpm / CEILING.wpm}
                                              accent="251, 191, 36"
                                            />
                                          ))}
                                          {personalBests.length > 8 && (
                                            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-white/25">
                                              +{personalBests.length - 8} more configurations on record
                                            </p>
                                          )}
                                        </div>
                                      ) : (
                                        <EmptyNote icon={Timer}>
                                          A personal best is recorded per difficulty and length. Complete a
                                          standard test to open the board.
                                        </EmptyNote>
                                      )}
                                    </DossierCard>
                                  </div>
                                </>
                              )}
                            </div>
                          )}

                          {/* ── TITLES ── */}
                          {tab === 2 && (
                            <DossierCard accent={accent}>
                              <PanelHeading
                                icon={Award}
                                title="Title Registry"
                                hint={`${unlockedCount}/${TITLE_BADGES.length} decrypted`}
                                accent={accent}
                              />
                              {isOwnProfile && (
                                <p className="mb-4 font-mono text-[10px] leading-relaxed tracking-wide text-white/35">
                                  Tap an unlocked title to equip it. Your active title shows next to your name everywhere.
                                </p>
                              )}

                              <div className="dossier-stagger grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
                                {orderedBadges.map((badge) => {
                                  const unlocked = isBadgeUnlocked(badge);
                                  const isSelected = badge.id === equippedTitleId;
                                  const prog = !unlocked && isOwnProfile ? badge.progress?.(skillStats) : undefined;
                                  const pct = prog ? Math.max(0, Math.min(1, prog.current / prog.target)) : 0;
                                  const pulsing = equipPulse?.startsWith(`${badge.id}:`) ? equipPulse : null;
                                  const interactive = unlocked && isOwnProfile;

                                  return (
                                    <button
                                      key={badge.id}
                                      type="button"
                                      disabled={!interactive}
                                      aria-pressed={interactive ? isSelected : undefined}
                                      onClick={() => handleSelectTitle(badge.id)}
                                      /* Was a `motion.button` with `layout="position"`.
                                         Ten of those measure and project their own box
                                         on every commit, which is a forced layout read
                                         per card on the frames the tab is mounting —
                                         and this is the tab with the most cards. The
                                         reorder on equip now snaps instead of gliding;
                                         the burst and the "Equipped" chip already say
                                         what happened. */
                                      className={`group relative isolate overflow-hidden rounded-2xl p-4 text-left outline-none transition-transform duration-200 ease-out focus-visible:ring-2 focus-visible:ring-white/40 motion-reduce:transition-none ${unlocked ? 'glass-card' : 'cursor-not-allowed border border-white/[0.06] bg-black/40'} ${interactive ? 'cursor-pointer hover:-translate-y-[3px] active:translate-y-0 active:scale-[0.985] motion-reduce:hover:translate-y-0' : ''}`}
                                      style={{
                                        borderColor: isSelected ? rgba(accent, 0.6) : undefined,
                                        boxShadow: isSelected ? `0 0 22px ${rgba(accent, 0.2)}, inset 0 0 24px ${rgba(accent, 0.08)}` : undefined,
                                      }}
                                    >
                                      <EquipBurst pulseKey={pulsing} color={accent} radius="1rem" />
                                      {isSelected && (
                                        <span
                                          aria-hidden
                                          className="pointer-events-none absolute inset-0 -z-10 rounded-2xl"
                                          style={{ background: `linear-gradient(135deg, ${rgba(accent, 0.16)}, transparent 60%)` }}
                                        />
                                      )}

                                      <div className="flex items-start gap-3">
                                        <span
                                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-base ${unlocked ? '' : 'grayscale'}`}
                                          style={{
                                            borderColor: isSelected ? rgba(accent, 0.45) : 'rgba(255,255,255,0.1)',
                                            background: isSelected ? rgba(accent, 0.14) : 'rgba(255,255,255,0.03)',
                                            opacity: unlocked ? 1 : 0.45,
                                          }}
                                        >
                                          {badge.icon}
                                        </span>

                                        <div className="min-w-0 flex-1">
                                          <div className="flex items-center gap-2">
                                            <span className={`truncate font-sans text-[13px] font-black tracking-tight ${unlocked ? 'text-white' : 'text-white/45'}`}>
                                              {badge.name}
                                            </span>
                                            {!unlocked && <Lock size={10} className="shrink-0 text-white/30" />}
                                          </div>
                                          <p className={`mt-0.5 truncate font-mono text-[9px] tracking-wide ${unlocked ? 'text-white/40' : 'text-white/25'}`}>
                                            {badge.description}
                                          </p>

                                          {prog && (
                                            <div className="mt-2">
                                              <div className="h-[3px] w-full overflow-hidden rounded-full bg-white/[0.07]">
                                                <span
                                                  className="dossier-meter block h-full w-full rounded-full bg-white/45"
                                                  style={{ '--meter-fill': pct, '--meter-delay': '120ms' } as React.CSSProperties}
                                                />
                                              </div>
                                              <div className="mt-1 font-mono text-[8px] uppercase tracking-[0.18em] text-white/30">
                                                {Math.round(prog.current)} / {prog.target} {prog.unit}
                                              </div>
                                            </div>
                                          )}
                                        </div>

                                        {/* The chip swap is a plain conditional now: an
                                            `AnimatePresence` per card meant ten presence
                                            trees on this tab, each waiting out an exit
                                            tween, for a badge that only changes when you
                                            click. */}
                                        <div className="shrink-0 self-center">
                                          {isSelected ? (
                                            <span
                                              className="flex items-center gap-1 rounded-full border px-2 py-1 font-mono text-[8px] font-black uppercase tracking-[0.16em]"
                                              style={{ borderColor: rgba(accent, 0.5), background: rgba(accent, 0.16), color: rgba(accent, 1) }}
                                            >
                                              <DrawCheck size={9} strokeWidth={4} />
                                              Equipped
                                            </span>
                                          ) : interactive ? (
                                            <span className="rounded-full border border-white/10 px-2 py-1 font-mono text-[8px] font-black uppercase tracking-[0.16em] text-white/40 transition-colors group-hover:border-white/30 group-hover:text-white">
                                              Equip
                                            </span>
                                          ) : null}
                                        </div>
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            </DossierCard>
                          )}

                          {/* ── BADGES ──
                              The achievement wall, grouped by category the same way
                              the Hall of Legends modal groups it. It lives here too
                              because the dossier is where a player looks to see what
                              they have earned, and that modal is behind a nav button
                              most people never press. */}
                          {tab === 3 && (
                            <div className="dossier-stagger flex flex-col gap-5">
                              {!isOwnProfile ? (
                                <DossierCard accent={accent}>
                                  <PanelHeading icon={Medal} title="Badge Vault" hint="Private" accent={accent} />
                                  <EmptyNote icon={Lock}>
                                    Achievements are not part of a public dossier — only earned titles are
                                    published. The Titles tab shows what this operator has claimed.
                                  </EmptyNote>
                                </DossierCard>
                              ) : (
                                achievementGroups.map(({ category, items }) => {
                                  const earned = items.filter((a) => unlockedAchievements.has(a.id)).length;
                                  return (
                                    <DossierCard accent={accent} key={category}>
                                      <PanelHeading
                                        icon={category === 'SUPER' ? Trophy : category === 'HARDCORE' ? Gauge : Medal}
                                        title={`${category} badges`}
                                        hint={`${earned}/${items.length}`}
                                        accent={accent}
                                      />
                                      {/* No nested `.dossier-stagger` here: the card
                                          this grid sits in is already a staggered
                                          child, and stacking one cascade inside
                                          another delayed the last badge of the last
                                          category by most of a second. */}
                                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                                        {items.map((ach) => {
                                          const AchIcon = achievementIcon(ach.icon);
                                          const earnedThis = unlockedAchievements.has(ach.id);
                                          return (
                                            <div
                                              key={ach.id}
                                              className={`relative overflow-hidden rounded-2xl p-4 transition-transform duration-200 ease-out motion-reduce:transition-none ${earnedThis ? 'glass-card hover:-translate-y-[3px] motion-reduce:hover:translate-y-0' : 'border border-white/[0.06] bg-black/40'}`}
                                              style={{
                                                borderColor: earnedThis ? rgba(accent, 0.32) : undefined,
                                                boxShadow: earnedThis ? `inset 0 0 26px ${rgba(accent, 0.07)}` : undefined,
                                              }}
                                            >
                                              <div className="flex items-start gap-3">
                                                <span
                                                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border"
                                                  style={{
                                                    borderColor: earnedThis ? rgba(accent, 0.4) : 'rgba(255,255,255,0.08)',
                                                    background: earnedThis ? rgba(accent, 0.12) : 'rgba(255,255,255,0.02)',
                                                  }}
                                                >
                                                  <AchIcon
                                                    size={17}
                                                    style={{ color: earnedThis ? rgba(accent, 1) : 'rgba(255,255,255,0.22)' }}
                                                  />
                                                </span>
                                                <div className="min-w-0 flex-1">
                                                  <div className="flex items-center gap-2">
                                                    <span className={`truncate font-sans text-[13px] font-black tracking-tight ${earnedThis ? 'text-white' : 'text-white/40'}`}>
                                                      {ach.title}
                                                    </span>
                                                    {!earnedThis && <Lock size={10} className="shrink-0 text-white/25" />}
                                                  </div>
                                                  <p className={`mt-1 font-mono text-[9px] leading-relaxed tracking-wide ${earnedThis ? 'text-white/40' : 'text-white/25'}`}>
                                                    {ach.desc}
                                                  </p>
                                                </div>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </DossierCard>
                                  );
                                })
                              )}
                            </div>
                          )}



                          {/* ── MATRIX ── */}
                          {tab === 4 && (
                            <DossierCard accent={accent}>
                              <PanelHeading
                                icon={Crosshair}
                                title="Skill Matrix"
                                hint={`${radarAxes.length} axes`}
                                accent={accent}
                              />
                              <div className="grid items-center gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
                                <div className="relative overflow-hidden rounded-2xl border bg-black/30 p-3" style={{ borderColor: rgba(accent, 0.16) }}>
                                  <GridField color={accent} alpha={0.07} cell={22} />
                                  {/* The rotating conic halo that used to sit here is
                                      gone. A `blur-2xl` on a spinning element is a
                                      full-size filter pass every frame, forever — the
                                      one animation on this page that never stopped
                                      costing anything. The grid field and the radar's
                                      own draw-in carry the panel. */}
                                  <div className="relative flex justify-center">
                                    <SkillRadar axes={radarAxes} color={accent} size={320} />
                                  </div>
                                </div>

                                <div className="dossier-stagger flex flex-col gap-2.5">
                                  {radarRows.map((row) => (
                                    <MeterRow
                                      key={row.key}
                                      label={row.label}
                                      value={row.display}
                                      fill={row.value}
                                      accent={accent}
                                    />
                                  ))}
                                  <p className="mt-1 font-mono text-[9px] leading-relaxed text-white/25">
                                    Ratings normalise your bests against TypeNova's ceilings.
                                    {!isOwnProfile && ' Streak, output and duels stay private on other operators.'}
                                  </p>
                                </div>
                              </div>
                            </DossierCard>
                          )}
                      </div>
                    </div>
                  </motion.section>
                </div>
              )}

              {/* ─── Footer ─── */}
              {/* An end-of-page line inside the flow, pinning to the bottom of
                  short pages via `mt-auto` — not a status bar riveted to a
                  dialog's bottom edge. */}
              <footer
                className="relative z-30 mt-auto shrink-0 border-t bg-black/25 font-mono text-[9px] uppercase tracking-[0.2em] text-white/30"
                style={{ borderColor: rgba(accent, 0.12) }}
              >
                {/* Width-capped and gutter-matched like the header, so the two
                    page-level bars start and end on the same x positions. The
                    footer text used to run to the raw viewport edge while the
                    header stopped at `--w-ultra`. */}
                <div className={`${containerClass('ultra')} flex items-center justify-between gap-3 py-3 ${GUTTER}`}>
                  <span className="flex items-center gap-2">
                    <Check size={10} style={{ color: rgba(accent, 0.8) }} />
                    {TABS[tab].label} · {isOwnProfile ? 'Local sync active' : 'Public record'}
                  </span>
                  {/* Only meaningful with a keyboard, and the tab strip documents
                      the arrow keys nowhere else, so say it here. */}
                  <span className="hidden sm:inline">← → switch · Esc to go back</span>
                </div>
              </footer>
        </div>
      </div>

      {showCustomization && supabase && isOwnProfile && (
        <ProfileCustomizationMenu
          supabase={supabase}
          // The forge writes to `public_profiles` keyed by username. This used to
          // read from the fetched row, which our own dossier never loads — so
          // "Modify Loadout" opened a panel that could not save.
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
