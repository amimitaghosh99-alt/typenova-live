// ═══════════════════════════════════════════════════════════════════════
//  LOADOUT FORGE — avatar + banner customization
//  ---------------------------------------------------------------------
//  Layout: a live "holo card" preview pinned on the left, and a two-tab
//  armoury on the right (Keycaps · Banners). Picks are *staged*, not saved —
//  the preview reacts instantly (and to hover, as a ghost preview), while the
//  footer holds the commit. That split is what makes browsing feel free: you
//  can try twenty banners without touching your cloud profile.
//
//  Micro-interactions on equip: burst ring from the tile, drawn checkmark,
//  a haptic tick, and the preview card re-keying its glow. Deploying runs an
//  arming → transmitting → locked sequence so the save has real weight.
//
//  Persistence is unchanged: `public_profiles.avatar_id` / `banner_id`.
// ═══════════════════════════════════════════════════════════════════════

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  AlertTriangle, Check, Crown, Image as ImageIcon, Loader2, Lock, RotateCcw, Save,
  Sparkles, UserCircle2, X, Zap,
} from 'lucide-react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { ALL_BANNERS, AVATARS, type BannerDef } from '@/data/customization';
import { BannerArt } from './profile/CosmeticArt';
import { AvatarArt, materialFor } from './profile/AvatarKeycap';
import { ArtisanStudioTab } from './profile/ArtisanStudioTab';
import { loadArtisanConfig, hexToRgbTriplet, type ArtisanConfig } from '@/data/artisanCustomizer';
import {
  ConicHalo, CyberCorners, DataStream, DrawCheck, EquipBurst, GlitchText,
  Scanlines, ScanSweep, SegmentBar,
} from './profile/ProfileFx';
import {
  backdropFade, bannerToast, chipSwap, deckIn, listChild, listParent, pulseHaptic, railIn,
  reveal, rgba, shellIn, springGlider, springSnappy, tabPanel,
} from './profile/profileMotion';

interface UserStats {
  level: number;
  wpm: number;
  combo: number;
}

interface ProfileCustomizationMenuProps {
  supabase: SupabaseClient;
  /** Row key in `public_profiles`. When absent, saving is disabled. */
  username?: string;
  currentAvatarId: string;
  currentBannerId: string;
  /** Name to render on the preview card (falls back to `username`). */
  displayName?: string;
  level: number;
  userStats: UserStats;
  onClose: () => void;
  onUpdate: (avatarId: string, bannerId: string) => void;
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

const TABS = [
  { id: 'avatars', label: 'Keycaps', icon: UserCircle2 },
  { id: 'artisan', label: 'Artisan Lab', icon: Sparkles },
  { id: 'banners', label: 'Banners', icon: ImageIcon },
] as const;

/** How far along the player is toward a locked banner's requirement (0…1). */
function unlockProgress(banner: BannerDef, stats: UserStats) {
  if (!banner.unlockCondition) return { unlocked: true, ratio: 1, current: 0, target: 0, label: '' };
  const { type, value, description } = banner.unlockCondition;
  const current = type === 'level' ? stats.level : type === 'wpm' ? stats.wpm : stats.combo;
  return {
    unlocked: current >= value,
    ratio: Math.max(0, Math.min(1, value > 0 ? current / value : 1)),
    current,
    target: value,
    label: description,
  };
}

const TIER_META: Record<string, { label: string; badge: string; color: string }> = {
  abs:         { label: 'Common',               badge: 'Common',    color: '161, 161, 170' },
  doubleshot:  { label: 'Uncommon',             badge: 'Uncommon',  color: '99, 102, 241' },
  translucent: { label: 'Rare',                 badge: 'Rare',      color: '45, 212, 191' },
  artisan:     { label: 'Epic',                 badge: 'Epic',      color: '245, 158, 11' },
  celestial:   { label: 'Legendary · Celestial', badge: 'Legendary', color: '217, 70, 239' },
};
const TIER_ORDER = ['abs', 'doubleshot', 'translucent', 'artisan', 'celestial'] as const;

/** Chromatic spectrum sort map: Cyan → Blue → Purple → Pink/Rose → Red → Gold/Amber → Emerald */
const CHROMATIC_ORDER: Record<string, string[]> = {
  abs: [
    'default', // Caret (Cyan)
    'bird',    // Shift (Sky Blue)
    'ghost',   // Tab (Teal)
    'cat',     // Backspace (Purple)
    'rocket',  // Spacebar (Rose)
    'skull',   // Escape (Red)
    'dog',     // Return (Amber)
    'zap',     // Bolt (Yellow)
  ],
  doubleshot: [
    'droplets',  // Prompt (Sky Blue)
    'moon',      // Control (Indigo)
    'soundwave', // Thock (Violet)
    'gamepad',   // Home Row (Violet/Purple)
    'star',      // Command (Fuchsia)
    'flame',     // Streak (Red)
    'sun',       // Option (Orange)
    'vim',       // Hacker (Amber)
    'cpu',       // Switch (Emerald)
  ],
  translucent: [
    'quantum',       // Quantum Core (Cyan)
    'aurora',        // Hyperdrive (Sky Blue)
    'diamond',       // Flawless (Ice Blue)
    'shield',        // Precision (Royal Blue)
    'hexagon',       // Braces (Cobalt Blue)
    'eye',           // Focus (Deep Purple)
    'turbo',         // Overdrive (Crimson Red)
    'crown',         // Combo (Gold)
    'ghost_circuit', // Ghost Circuit (Mint Green)
    'matrix',        // Terminal (Emerald Green)
    'swords',        // Duel (Platinum Slate)
  ],
  artisan: [
    'compass',        // Navigator (Teal)
    'sparkles',       // Ghost Text (Rose Pink)
    'damascus_relic', // Damascus Relic (Damascus Bronze)
    'trophy',         // Record (Gold Amber)
    'carbon',         // Carbon Weave (Carbon Graphite)
  ],
  celestial: [
    'typenova',     // TypeNova (Electric Cyan)
    'nova_prime',   // Nova Prime (Celestial Sky)
    'astral_bloom', // Astral Bloom (Lavender Violet)
    'prism',        // Supernova (Prismatic Magenta)
    'sakura_rift',  // Sakura Rift (Cherry Blossom Pink)
    'phoenix',      // Immortal (Solar Flame)
    'gold_esc',     // Midas Esc (Pure 24K Gold)
  ],
};

/** Pre-grouped and chromatically sorted keycaps computed once at module load */
const GROUPED_KEYCAPS = (() => {
  const map = new Map<string, typeof AVATARS>();
  AVATARS.filter((a) => a.id !== 'custom_artisan').forEach((avatar, i) => {
    const tier = materialFor(i, avatar.id);
    if (!map.has(tier)) map.set(tier, []);
    map.get(tier)!.push(avatar);
  });
  return TIER_ORDER.filter((t) => map.has(t)).map((tier) => {
    const avatars = map.get(tier)!;
    const order = CHROMATIC_ORDER[tier] || [];
    avatars.sort((a, b) => {
      const idxA = order.indexOf(a.id);
      const idxB = order.indexOf(b.id);
      return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
    });
    return {
      tier,
      meta: TIER_META[tier],
      avatars,
    };
  });
})();

interface KeycapTileProps {
  avatar: (typeof AVATARS)[number];
  staged: boolean;
  live: boolean;
  isCelestial: boolean;
  metaColor: string;
  pulsing: string | null;
  onPick: (id: string, name: string) => void;
  onHover: (id: string) => void;
  onLeave: () => void;
  reduce?: boolean | null;
}

const KeycapTile = React.memo(function KeycapTile({
  avatar,
  staged,
  live,
  isCelestial,
  metaColor,
  pulsing,
  onPick,
  onHover,
  onLeave,
  reduce,
}: KeycapTileProps) {
  return (
    <motion.button
      variants={listChild}
      onClick={() => onPick(avatar.id, avatar.name)}
      onMouseEnter={() => onHover(avatar.id)}
      onFocus={() => onHover(avatar.id)}
      onBlur={onLeave}
      whileHover={reduce ? undefined : { y: -3, scale: 1.03 }}
      whileTap={reduce ? undefined : { scale: 0.95 }}
      transition={springSnappy}
      aria-pressed={staged}
      title={avatar.name}
      className="group relative isolate flex flex-col items-center gap-1.5 overflow-hidden rounded-2xl border p-2.5"
      style={{
        borderColor: staged
          ? rgba(avatar.glowColor, 0.75)
          : `rgba(${metaColor}, 0.12)`,
        background: staged
          ? rgba(avatar.glowColor, 0.12)
          : 'rgba(255,255,255,0.02)',
        boxShadow: staged
          ? `0 0 22px ${rgba(avatar.glowColor, 0.28)}`
          : undefined,
        transform: 'translateZ(0)',
      }}
    >
      <EquipBurst pulseKey={pulsing} color={avatar.glowColor} radius="1rem" />

      <span
        className="transition-[filter] duration-150"
        style={{
          filter: `drop-shadow(0 0 ${staged ? 13 : 5}px ${rgba(avatar.glowColor, staged ? 0.75 : 0.3)})`,
        }}
      >
        <AvatarArt id={avatar.id} size={52} pressed={staged} />
      </span>

      <span className={`truncate font-mono text-[9px] font-bold uppercase tracking-[0.14em] ${staged ? 'text-white' : 'text-white/45'}`}>
        {avatar.name}
      </span>

      {isCelestial && (
        <span className="absolute left-1.5 top-1.5 flex h-3 w-3 items-center justify-center text-amber-400" title="Celestial Artisan">
          <Sparkles size={10} className="animate-pulse" />
        </span>
      )}

      {live && !staged && (
        <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-white/40" title="Currently saved" />
      )}

      <AnimatePresence>
        {staged && (
          <motion.span
            {...reveal(reduce ?? false, chipSwap)}
            className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full"
            style={{ background: rgba(avatar.glowColor, 1), color: '#05070c' }}
          >
            <DrawCheck size={8} strokeWidth={4} />
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
});

/** Pre-grouped banners: Thematic suite (free) and Milestone Prestige (skill-unlocked) */
const GROUPED_BANNERS = [
  {
    group: 'THEMATIC SUITE',
    items: ALL_BANNERS.filter((b) => b.type === 'free'),
  },
  {
    group: 'SKILL MASTERY',
    items: ALL_BANNERS.filter((b) => b.type === 'premium'),
  },
];

interface BannerTileProps {
  banner: BannerDef;
  userStats: UserStats;
  staged: boolean;
  live: boolean;
  pulsing: string | null;
  reduce: boolean | null;
  onPick: (banner: BannerDef) => void;
  onHover: (id: string) => void;
  onLeave: () => void;
}

const BannerTile = React.memo(function BannerTile({
  banner,
  userStats,
  staged,
  live,
  pulsing,
  reduce,
  onPick,
  onHover,
  onLeave,
}: BannerTileProps) {
  const { unlocked, ratio, current, target } = unlockProgress(banner, userStats);
  const glow = banner.glowColor;

  return (
    <motion.button
      variants={listChild}
      onClick={() => onPick(banner)}
      onMouseEnter={() => unlocked && onHover(banner.id)}
      onFocus={() => unlocked && onHover(banner.id)}
      onBlur={onLeave}
      whileHover={reduce || !unlocked ? undefined : { y: -3 }}
      whileTap={reduce ? undefined : { scale: 0.985 }}
      transition={springSnappy}
      aria-pressed={staged}
      className={`group relative isolate overflow-hidden rounded-2xl border text-left ${unlocked ? '' : 'cursor-not-allowed'}`}
      style={{
        borderColor: staged ? rgba(glow, 0.75) : 'rgba(255,255,255,0.08)',
        boxShadow: staged ? `0 0 24px ${rgba(glow, 0.3)}` : undefined,
        transform: 'translateZ(0)',
      }}
    >
      <EquipBurst pulseKey={pulsing} color={glow} radius="1rem" />

      {/* Swatch — the live scene, cheap variant. */}
      <div className={`relative h-[76px] w-full overflow-hidden bg-[#05070c] ${unlocked ? '' : 'saturate-[0.2]'}`}>
        <BannerArt id={banner.id} detail="compact" animate={false} />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-[#05070c] via-transparent to-transparent" />
        {!unlocked && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <Lock size={16} className="text-white/60" />
          </div>
        )}
        {banner.type === 'premium' && (
          <span
            className="absolute left-2 top-2 flex items-center gap-1 rounded-full border px-1.5 py-0.5 font-mono text-[7px] font-black uppercase tracking-[0.18em] backdrop-blur-sm"
            style={{ borderColor: 'rgba(250,204,21,0.5)', background: 'rgba(250,204,21,0.16)', color: 'rgb(253,224,71)' }}
          >
            <Crown size={8} /> Premium
          </span>
        )}
        <AnimatePresence>
          {staged && (
            <motion.span
              {...reveal(reduce ?? false, chipSwap)}
              className="absolute right-2 top-2 flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[8px] font-black uppercase tracking-[0.16em]"
              style={{ background: rgba(glow, 1), color: '#05070c' }}
            >
              <DrawCheck size={8} strokeWidth={4} />
              Staged
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Meta */}
      <div className="relative bg-white/[0.02] p-3">
        <div className="flex items-center justify-between gap-2">
          <span className={`truncate font-sans text-[13px] font-black tracking-tight ${unlocked ? 'text-white' : 'text-white/45'}`}>
            {banner.name}
          </span>
          {live && !staged && (
            <span className="shrink-0 font-mono text-[8px] uppercase tracking-[0.16em] text-white/30">
              Equipped
            </span>
          )}
        </div>
        <p className="mt-0.5 truncate font-mono text-[9px] tracking-wide text-white/35">
          {banner.description}
        </p>

        {!unlocked && banner.unlockCondition && (
          <div className="mt-2">
            <SegmentBar value={ratio} color={glow} segments={14} height={5} />
            <div className="mt-1 flex items-center gap-1 font-mono text-[8px] uppercase tracking-[0.16em] text-white/35">
              <Zap size={8} style={{ color: rgba(glow, 0.9) }} />
              {Math.round(current)} / {target} {banner.unlockCondition.type === 'level' ? 'level' : banner.unlockCondition.type}
            </div>
          </div>
        )}
      </div>
    </motion.button>
  );
});

export const ProfileCustomizationMenu = React.memo(function ProfileCustomizationMenu({
  supabase,
  username,
  currentAvatarId,
  currentBannerId,
  displayName,
  level,
  userStats,
  onClose,
  onUpdate,
}: ProfileCustomizationMenuProps) {
  const reduce = useReducedMotion();

  /** Drives the exit animation; `onClose` fires once the shell has left. */
  const [open, setOpen] = useState(true);
  const [tab, setTab] = useState(0);
  const [dir, setDir] = useState(1);

  // Staged loadout — the cloud only hears about it on Deploy.
  const [draftAvatar, setDraftAvatar] = useState(currentAvatarId);
  const [draftBanner, setDraftBanner] = useState(currentBannerId);

  /** Hovered banner id — previews without committing to the draft. */
  const [ghostBanner, setGhostBanner] = useState<string | null>(null);
  const [ghostAvatar, setGhostAvatar] = useState<string | null>(null);

  // Burst key = tile id + a monotonic tick, so re-tapping the same tile still
  // re-mounts the burst. A counter keeps the handler pure — no Date.now().
  const [burstTick, setBurstTick] = useState<{ id: string; n: number } | null>(null);
  const burst = burstTick ? `${burstTick.id}:${burstTick.n}` : null;
  const [toast, setToast] = useState<string | null>(null);
  const [status, setStatus] = useState<SaveState>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const burstTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (burstTimer.current) clearTimeout(burstTimer.current);
      if (toastTimer.current) clearTimeout(toastTimer.current);
      if (closeTimer.current) clearTimeout(closeTimer.current);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, []);

  const handleCatalogScroll = useCallback(() => {
    isScrollingRef.current = true;
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      isScrollingRef.current = false;
    }, 70);
  }, []);

  const handleHoverAvatar = useCallback((id: string) => {
    if (isScrollingRef.current) return;
    setGhostAvatar(id);
  }, []);

  const handleLeaveAvatar = useCallback(() => {
    if (isScrollingRef.current) return;
    setGhostAvatar(null);
  }, []);

  const handleHoverBanner = useCallback((id: string) => {
    if (isScrollingRef.current) return;
    setGhostBanner(id);
  }, []);

  const handleLeaveBanner = useCallback(() => {
    if (isScrollingRef.current) return;
    setGhostBanner(null);
  }, []);

  const handleClose = useCallback(() => setOpen(false), []);

  // The forge sits on top of the dossier, so it takes Escape first and stops
  // the key from reaching the dossier's own handler.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      handleClose();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [handleClose]);

  const selectTab = useCallback((next: number) => {
    setTab((current) => {
      if (next === current) return current;
      setDir(next > current ? 1 : -1);
      return next;
    });
  }, []);

  const flash = useCallback((id: string, message: string, haptic: number | number[] = [8, 20, 10]) => {
    setBurstTick((p) => ({ id, n: (p?.n ?? 0) + 1 }));
    setToast(message);
    pulseHaptic(haptic);
    if (burstTimer.current) clearTimeout(burstTimer.current);
    burstTimer.current = setTimeout(() => setBurstTick(null), 900);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 1800);
  }, []);

  // Preview resolves ghost (hover) over draft (staged) over saved.
  const previewAvatar = useMemo(() => {
    const targetId = ghostAvatar ?? draftAvatar;
    if (targetId === 'custom_artisan') {
      const cfg = loadArtisanConfig();
      return {
        id: 'custom_artisan',
        name: cfg.name || 'Custom Artisan',
        gradient: 'bg-gradient-to-br from-amber-400 via-pink-500 to-purple-800',
        glowColor: hexToRgbTriplet(cfg.resinColor),
        borderColor: 'border-amber-300',
        iconColor: 'text-amber-200',
      };
    }
    return AVATARS.find((a) => a.id === targetId) || AVATARS[0];
  }, [ghostAvatar, draftAvatar]);

  const previewBanner =
    ALL_BANNERS.find((b) => b.id === (ghostBanner ?? draftBanner)) || ALL_BANNERS[0];

  const accent = previewBanner.glowColor || '6, 182, 212';
  const avatarAccent = previewAvatar.glowColor || accent;

  const dirty = draftAvatar !== currentAvatarId || draftBanner !== currentBannerId;

  const unlockedBannerCount = useMemo(
    () => ALL_BANNERS.filter((b) => unlockProgress(b, userStats).unlocked).length,
    [userStats]
  );

  const handleStageCustomArtisan = useCallback((cfg: ArtisanConfig) => {
    setDraftAvatar('custom_artisan');
    setStatus('idle');
    setErrorMsg(null);
    flash('custom_artisan', `Custom Artisan staged — ${cfg.name}`);
  }, [flash]);

  const pickAvatar = useCallback((id: string, name: string) => {
    if (id === draftAvatar) {
      flash(id, `${name} already staged`, 6);
      return;
    }
    setDraftAvatar(id);
    setStatus('idle');
    setErrorMsg(null);
    flash(id, `Keycap staged — ${name}`);
  }, [draftAvatar, flash]);

  const pickBanner = (banner: BannerDef) => {
    const { unlocked, label } = unlockProgress(banner, userStats);
    if (!unlocked) {
      flash(banner.id, `Locked — ${label}`, 30);
      return;
    }
    if (banner.id === draftBanner) {
      flash(banner.id, `${banner.name} already staged`, 6);
      return;
    }
    setDraftBanner(banner.id);
    setStatus('idle');
    setErrorMsg(null);
    flash(banner.id, `Banner staged — ${banner.name}`);
  };

  const revert = () => {
    setDraftAvatar(currentAvatarId);
    setDraftBanner(currentBannerId);
    setStatus('idle');
    setErrorMsg(null);
    flash('revert', 'Loadout reverted', 12);
  };

  const deploy = async () => {
    if (!dirty || status === 'saving') return;

    if (!username) {
      try {
        localStorage.setItem('typenova_avatar_id', draftAvatar);
        localStorage.setItem('typenova_banner_id', draftBanner);
      } catch {}

      onUpdate(draftAvatar, draftBanner);
      window.dispatchEvent(new Event('cosmeticsChanged'));

      setStatus('saved');
      pulseHaptic([12, 30, 18]);
      if (closeTimer.current) clearTimeout(closeTimer.current);
      closeTimer.current = setTimeout(handleClose, 780);
      return;
    }

    setStatus('saving');
    setErrorMsg(null);

    try {
      const { error } = await supabase
        .from('public_profiles')
        .update({
          avatar_id: draftAvatar,
          banner_id: draftBanner,
          updated_at: new Date().toISOString(),
        })
        // `_` is an ILIKE wildcard and usernames may contain it, so an
        // unescaped match could touch a *different* operator's row.
        .ilike('username', username.replace(/[\\%_]/g, (m) => `\\${m}`));

      if (error) throw error;

      try {
        localStorage.setItem('typenova_avatar_id', draftAvatar);
        localStorage.setItem('typenova_banner_id', draftBanner);
      } catch {}

      onUpdate(draftAvatar, draftBanner);
      // Other surfaces (nav bar, lobby cards) listen for this to re-read cosmetics.
      window.dispatchEvent(new Event('cosmeticsChanged'));

      setStatus('saved');
      pulseHaptic([12, 30, 18]);
      if (closeTimer.current) clearTimeout(closeTimer.current);
      closeTimer.current = setTimeout(handleClose, 780);
    } catch (e) {
      console.error('Failed to save cosmetics:', e);
      setStatus('error');
      setErrorMsg(e instanceof Error ? e.message : 'Transmission failed. Try again.');
    }
  };

  const cardName = displayName || username || 'Operator';

  return (
    <AnimatePresence onExitComplete={onClose}>
      {open && (
        <div
          className="fixed inset-0 z-[700] flex items-start justify-center overflow-y-auto p-3 sm:items-center sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label="Loadout forge"
        >
          <motion.div
            {...reveal(reduce, backdropFade)}
            onClick={handleClose}
            className="fixed inset-0 bg-black/88 backdrop-blur-md"
          />

          <motion.div
            {...reveal(reduce, shellIn)}
            className="relative z-10 my-auto flex w-full max-w-5xl flex-col overflow-hidden rounded-[26px] border bg-[#05070c] md:max-h-[88vh]"
            style={{
              borderColor: rgba(accent, 0.32),
              boxShadow: `0 0 90px ${rgba(accent, 0.16)}, 0 30px 70px rgba(0,0,0,0.8)`,
            }}
          >
            <ScanSweep color={accent} />
            <CyberCorners color={accent} alpha={0.55} size={18} inset={10} />

            {/* ─── Chrome ─── */}
            <div
              className="relative z-30 flex shrink-0 items-center justify-between gap-3 border-b bg-white/[0.02] px-4 py-3 sm:px-5"
              style={{ borderColor: rgba(accent, 0.18) }}
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="relative flex h-2.5 w-2.5 shrink-0 items-center justify-center">
                  <motion.span
                    className="absolute inset-0 rounded-full"
                    style={{ background: rgba(accent, 0.9) }}
                    animate={reduce ? undefined : { scale: [1, 2.4, 1], opacity: [0.7, 0, 0.7] }}
                    transition={{ duration: 2.2, repeat: Infinity, ease: 'easeOut' }}
                  />
                  <span className="relative h-1.5 w-1.5 rounded-full" style={{ background: rgba(accent, 1) }} />
                </span>
                <span className="font-mono text-[10px] font-black uppercase tracking-[0.34em] text-white/70">
                  Loadout Forge
                </span>
                <AnimatePresence>
                  {dirty && (
                    <motion.span
                      {...reveal(reduce, chipSwap)}
                      className="hidden shrink-0 rounded-full border px-2 py-0.5 font-mono text-[8px] font-black uppercase tracking-[0.2em] sm:inline-block"
                      style={{ borderColor: rgba(accent, 0.5), background: rgba(accent, 0.14), color: rgba(accent, 1) }}
                    >
                      Unsaved
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>

              <button
                onClick={handleClose}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/50 transition-all hover:rotate-90 hover:border-white/25 hover:text-white"
                aria-label="Close forge"
              >
                <X size={15} />
              </button>
            </div>

            {/* ─── Staging confirmation ─── */}
            <div className="pointer-events-none absolute left-1/2 top-16 z-40 -translate-x-1/2">
              <AnimatePresence>
                {toast && (
                  <motion.div
                    key={toast}
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
                      {toast}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ─── Body ─── */}
            <div className="relative z-20 grid min-h-0 flex-1 custom-scrollbar overflow-y-auto md:grid-cols-[320px_1fr] md:overflow-hidden">
              {/* ─── Live holo preview ─── */}
              <motion.aside
                {...reveal(reduce, railIn)}
                className="relative flex flex-col gap-4 border-b p-5 md:border-b-0 md:border-r"
                style={{ borderColor: rgba(accent, 0.16) }}
              >
                <div className="flex items-center gap-2">
                  <Sparkles size={12} style={{ color: rgba(accent, 1) }} />
                  <span className="font-mono text-[9px] font-black uppercase tracking-[0.28em] text-white/60">
                    Live Preview
                  </span>
                  <span className="h-px flex-1" style={{ background: `linear-gradient(to right, ${rgba(accent, 0.35)}, transparent)` }} />
                </div>

                {/* The card re-keys on banner change so the whole skin animates in. */}
                <div className="relative">
                  <ConicHalo color={accent} inset={-6} duration={13} className="rounded-[24px] opacity-50 blur-[10px]" />
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={previewBanner.id}
                      initial={reduce ? false : { opacity: 0, scale: 0.97, filter: 'blur(6px)' }}
                      animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                      exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 1.02, filter: 'blur(6px)' }}
                      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                      className={`relative min-h-[250px] overflow-hidden rounded-[22px] border-2 bg-[#05070c] ${previewBanner.accentBorder}`}
                      style={{ boxShadow: `0 0 34px ${rgba(accent, 0.3)}, inset 0 0 40px rgba(0,0,0,0.45)` }}
                    >
                      {/* The real banner scene, then a scrim so the name stays legible. */}
                      <BannerArt id={previewBanner.id} />
                      <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
                      <Scanlines />

                      <div className="relative flex flex-col items-center gap-3 px-5 py-6">
                        {/* Fixed-dimension avatar stage: guarantees zero layout shift or height collapsing during rapid hover */}
                        <div className="relative flex items-center justify-center w-[96px] h-[96px] shrink-0">
                          <AnimatePresence mode="popLayout" initial={false}>
                            <motion.div
                              key={previewAvatar.id}
                              initial={reduce ? false : { scale: 0.86, opacity: 0.5 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 0.86, opacity: 0 }}
                              transition={{ duration: 0.1, ease: 'easeOut' }}
                              className="absolute inset-0 flex items-center justify-center"
                              style={{ filter: `drop-shadow(0 0 20px ${rgba(avatarAccent, 0.55)})` }}
                            >
                              <AvatarArt id={previewAvatar.id} size={92} />
                            </motion.div>
                          </AnimatePresence>
                        </div>

                        <div className="flex flex-col items-center gap-1 text-center">
                          <span className="max-w-[230px] truncate font-sans text-lg font-black tracking-tight text-white">
                            <GlitchText key={previewBanner.id} text={cardName} />
                          </span>
                          <span
                            className="rounded-full border px-2 py-0.5 font-mono text-[9px] font-black uppercase tracking-[0.2em] text-white"
                            style={{ borderColor: rgba(accent, 0.5), background: rgba(accent, 0.18) }}
                          >
                            LVL {level}
                          </span>
                        </div>

                        <div className="mt-1 w-full">
                          <SegmentBar value={0.72} color={accent} segments={18} height={7} />
                        </div>
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Staged readout */}
                <div className="space-y-2 rounded-2xl border bg-black/30 p-3" style={{ borderColor: rgba(accent, 0.16) }}>
                  {(() => {
                    const TIER_COLORS: Record<string, string> = {
                      abs: '161, 161, 170', doubleshot: '99, 102, 241',
                      translucent: '45, 212, 191', artisan: '245, 158, 11',
                      celestial: '217, 70, 239',
                    };
                    const tierKey = materialFor(0, previewAvatar.id);
                    const tierColor = TIER_COLORS[tierKey] || accent;
                    const rows = [
                      { label: 'Keycap', value: previewAvatar.name, ghost: !!ghostAvatar },
                      { label: 'Banner', value: previewBanner.name, ghost: !!ghostBanner },
                    ];
                    return (
                      <>
                        {rows.map((row) => (
                          <div key={row.label} className="flex items-baseline justify-between gap-2">
                            <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-white/40">{row.label}</span>
                            <span className="flex min-w-0 items-center gap-1.5">
                              <span className="truncate font-sans text-[12px] font-black text-white">{row.value}</span>
                              {row.ghost && (
                                <span
                                  className="shrink-0 h-1.5 w-1.5 rounded-full animate-pulse"
                                  style={{ background: `rgba(${accent}, 0.6)` }}
                                  title="Previewing on hover"
                                />
                              )}
                            </span>
                          </div>
                        ))}
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-white/40">Tier</span>
                          <span
                            className="rounded-full px-2 py-0.5 font-mono text-[9px] font-black uppercase tracking-[0.18em] border"
                            style={{
                              color: `rgb(${tierColor})`,
                              borderColor: `rgba(${tierColor}, 0.35)`,
                              background: `rgba(${tierColor}, 0.12)`,
                            }}
                          >
                            {TIER_META[tierKey]?.badge || tierKey}
                          </span>
                        </div>
                      </>
                    );
                  })()}
                  <p className="pt-1 font-mono text-[9px] leading-relaxed text-white/25">
                    {previewBanner.description}
                  </p>
                </div>

                <DataStream seed={previewBanner.id} className="mt-auto rounded-xl border border-white/[0.06] px-3 py-1.5" />
              </motion.aside>

              {/* ─── Armoury ─── */}
              <motion.section {...reveal(reduce, deckIn)} className="relative flex min-h-0 flex-col">
                <div
                  role="tablist"
                  aria-label="Cosmetic categories"
                  className="relative flex shrink-0 items-end gap-1 border-b px-3 pt-3"
                  style={{ borderColor: rgba(accent, 0.16) }}
                >
                  {TABS.map((t, i) => {
                    const TabIcon = t.icon;
                    const active = tab === i;
                    const count =
                      i === 0
                        ? AVATARS.filter((a) => a.id !== 'custom_artisan').length
                        : i === 1
                        ? 'STUDIO'
                        : `${unlockedBannerCount}/${ALL_BANNERS.length}`;
                    return (
                      <button
                        key={t.id}
                        role="tab"
                        aria-selected={active}
                        onClick={() => selectTab(i)}
                        className={`relative isolate flex items-center gap-2 rounded-t-xl px-3 py-2.5 font-mono text-[10px] font-black uppercase tracking-[0.22em] transition-colors sm:px-4 ${active ? 'text-white' : 'text-white/40 hover:text-white/75'}`}
                      >
                        {active && (
                          <>
                            <motion.span
                              layoutId="forge-tab-bg"
                              transition={springGlider}
                              className="absolute inset-0 -z-10 rounded-t-xl border border-b-0"
                              style={{ background: rgba(accent, 0.13), borderColor: rgba(accent, 0.35) }}
                            />
                            <motion.span
                              layoutId="forge-tab-laser"
                              transition={springGlider}
                              className="absolute -bottom-px left-2 right-2 -z-10 h-[2px] rounded-full"
                              style={{ background: rgba(accent, 1), boxShadow: `0 0 12px ${rgba(accent, 0.9)}` }}
                            />
                          </>
                        )}
                        <TabIcon size={13} style={active ? { color: rgba(accent, 1) } : undefined} />
                        {t.label}
                        <span className="font-mono text-[8px] tracking-[0.16em] text-white/30">{count}</span>
                      </button>
                    );
                  })}
                </div>

                <div
                  onScroll={handleCatalogScroll}
                  className="relative min-h-0 flex-1 custom-scrollbar md:overflow-y-auto overscroll-contain"
                  style={{ transform: 'translateZ(0)' }}
                >
                  <AnimatePresence mode="wait" custom={dir} initial={false}>
                    <motion.div key={TABS[tab].id} {...reveal(reduce, tabPanel, dir)} className="p-4 sm:p-5">
                      {/* ── KEYCAPS CATALOG ── */}
                      {tab === 0 && (
                        <div className="space-y-3">
                          {/* Artisan Studio Callout Banner */}
                          <div
                            onClick={() => selectTab(1)}
                            className="group relative flex items-center justify-between gap-3 rounded-2xl border p-3 cursor-pointer transition-all duration-300 hover:scale-[1.008]"
                            style={{
                              background: `linear-gradient(135deg, rgba(${accent}, 0.12) 0%, rgba(168, 85, 247, 0.08) 100%)`,
                              borderColor: `rgba(${accent}, 0.3)`,
                            }}
                          >
                            <div className="flex items-center gap-3">
                              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/20 text-purple-300 border border-purple-400/30">
                                <Sparkles size={18} className="animate-pulse" />
                              </span>
                              <div className="flex flex-col">
                                <span className="font-mono text-[11px] font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                                  Artisan Keycap Studio
                                  <span className="px-1.5 py-0.2 rounded text-[8px] bg-purple-500/30 text-purple-200 border border-purple-400/40">NEW</span>
                                </span>
                                <span className="text-[11px] text-zinc-400">
                                  Craft, sculpt & customize your bespoke mechanical artisan keycap
                                </span>
                              </div>
                            </div>
                            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-purple-300 group-hover:translate-x-1 transition-transform shrink-0">
                              Open Lab →
                            </span>
                          </div>

                          <motion.div
                            variants={listParent(0.02)}
                            className="space-y-4"
                            onMouseLeave={handleLeaveAvatar}
                          >
                            {GROUPED_KEYCAPS.map(({ tier, meta, avatars }) => {
                              const isCelestial = tier === 'celestial';
                              return (
                                <div key={tier}>
                                  {/* Tier divider */}
                                  <div className="flex items-center gap-2.5 mb-2.5">
                                    <div className="h-px flex-1" style={{ background: `linear-gradient(to right, transparent, rgba(${meta.color}, 0.25))` }} />
                                    <span
                                      className="font-mono text-[8px] font-bold uppercase tracking-[0.24em] flex items-center gap-1.5"
                                      style={{ color: `rgba(${meta.color}, 0.7)` }}
                                    >
                                      <span>{meta.label}</span>
                                      <span className="text-[7px] opacity-40 font-normal">({avatars.length})</span>
                                    </span>
                                    <div className="h-px flex-1" style={{ background: `linear-gradient(to left, transparent, rgba(${meta.color}, 0.25))` }} />
                                  </div>

                                  <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-5">
                                    {avatars.map((avatar) => {
                                      const staged = avatar.id === draftAvatar;
                                      const live = avatar.id === currentAvatarId;
                                      const pulsing = burst?.startsWith(`${avatar.id}:`) ? burst : null;

                                      return (
                                        <KeycapTile
                                          key={avatar.id}
                                          avatar={avatar}
                                          staged={staged}
                                          live={live}
                                          isCelestial={isCelestial}
                                          metaColor={meta.color}
                                          pulsing={pulsing}
                                          onPick={pickAvatar}
                                          onHover={handleHoverAvatar}
                                          onLeave={handleLeaveAvatar}
                                          reduce={reduce}
                                        />
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                          </motion.div>
                        </div>
                      )}

                      {/* ── ARTISAN LAB (CREATOR STUDIO) ── */}
                      {tab === 1 && (
                        <ArtisanStudioTab
                          onStageCustomArtisan={handleStageCustomArtisan}
                          isCurrentlyStaged={draftAvatar === 'custom_artisan'}
                          accentGlow={accent}
                        />
                      )}

                      {/* ── BANNERS ── */}
                      {tab === 2 && (
                        <div className="space-y-5" onMouseLeave={handleLeaveBanner}>
                          {GROUPED_BANNERS.map((group) => (
                            <div key={group.group} className="space-y-2.5">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[9px] font-black uppercase tracking-[0.24em] text-white/50">
                                  {group.group}
                                </span>
                                <span className="font-mono text-[8px] tracking-[0.14em] text-white/30">
                                  ({group.items.length})
                                </span>
                                <div className="h-px flex-1 bg-white/[0.06]" />
                              </div>

                              <motion.div
                                variants={listParent(0.03)}
                                className="grid gap-2.5 sm:grid-cols-2"
                              >
                                {group.items.map((banner) => {
                                  const staged = banner.id === draftBanner;
                                  const live = banner.id === currentBannerId;
                                  const pulsing = burst?.startsWith(`${banner.id}:`) ? burst : null;

                                  return (
                                    <BannerTile
                                      key={banner.id}
                                      banner={banner}
                                      userStats={userStats}
                                      staged={staged}
                                      live={live}
                                      pulsing={pulsing}
                                      reduce={reduce}
                                      onPick={pickBanner}
                                      onHover={handleHoverBanner}
                                      onLeave={handleLeaveBanner}
                                    />
                                  );
                                })}
                              </motion.div>
                            </div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </motion.section>
            </div>

            {/* ─── Commit bar ─── */}
            <div
              className="relative z-30 flex shrink-0 flex-wrap items-center justify-between gap-3 border-t bg-black/45 px-4 py-3 sm:px-5"
              style={{ borderColor: rgba(accent, 0.16) }}
            >
              <div className="flex min-w-0 items-center gap-2">
                <AnimatePresence mode="wait" initial={false}>
                  {status === 'error' ? (
                    <motion.span
                      key="err"
                      {...reveal(reduce, chipSwap)}
                      className="flex min-w-0 items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-rose-300"
                    >
                      <AlertTriangle size={11} className="shrink-0" />
                      <span className="truncate">{errorMsg}</span>
                    </motion.span>
                  ) : (
                    <motion.span
                      key={dirty ? 'dirty' : 'clean'}
                      {...reveal(reduce, chipSwap)}
                      className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/35"
                    >
                      {dirty ? 'Loadout staged — deploy to save' : 'Loadout synced with cloud'}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex items-center gap-2">
                <motion.button
                  whileHover={reduce || !dirty ? undefined : { y: -2 }}
                  whileTap={reduce ? undefined : { scale: 0.97 }}
                  transition={springSnappy}
                  onClick={revert}
                  disabled={!dirty || status === 'saving'}
                  className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 font-mono text-[9px] font-black uppercase tracking-[0.2em] text-white/55 transition-colors enabled:hover:border-white/25 enabled:hover:text-white disabled:opacity-35"
                >
                  <RotateCcw size={11} />
                  Revert
                </motion.button>

                <motion.button
                  whileHover={reduce || !dirty ? undefined : { y: -2 }}
                  whileTap={reduce ? undefined : { scale: 0.97 }}
                  transition={springSnappy}
                  onClick={deploy}
                  disabled={!dirty || status === 'saving' || status === 'saved'}
                  className="group relative flex min-w-[152px] items-center justify-center gap-2 overflow-hidden rounded-xl border px-4 py-2 font-mono text-[9px] font-black uppercase tracking-[0.22em] text-white disabled:opacity-45"
                  style={{ borderColor: rgba(accent, 0.5), background: rgba(accent, 0.16) }}
                >
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-enabled:group-hover:translate-x-full"
                  />
                  <AnimatePresence mode="wait" initial={false}>
                    {status === 'saving' ? (
                      <motion.span key="saving" {...reveal(reduce, chipSwap)} className="relative flex items-center gap-2">
                        <Loader2 size={12} className="animate-spin" />
                        Transmitting
                      </motion.span>
                    ) : status === 'saved' ? (
                      <motion.span key="saved" {...reveal(reduce, chipSwap)} className="relative flex items-center gap-2">
                        <DrawCheck size={11} strokeWidth={4} />
                        Locked In
                      </motion.span>
                    ) : (
                      <motion.span key="idle" {...reveal(reduce, chipSwap)} className="relative flex items-center gap-2">
                        {dirty ? <Save size={12} /> : <Check size={12} />}
                        Deploy
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
});
