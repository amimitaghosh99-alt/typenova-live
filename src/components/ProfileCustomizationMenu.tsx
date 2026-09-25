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
  AlertTriangle, Check, ChevronRight, Crown, Image as ImageIcon, Layers, Loader2, Lock, RotateCcw, Save,
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
  races?: number;
  streak?: number;
  accuracy?: number;
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
  let current = 0;
  switch (type) {
    case 'level': current = stats.level; break;
    case 'wpm': current = stats.wpm; break;
    case 'combo': current = stats.combo; break;
    case 'races': current = stats.races ?? 0; break;
    case 'streak': current = stats.streak ?? 0; break;
    case 'accuracy': current = stats.accuracy ?? 0; break;
  }
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
  const isPremium = banner.type === 'premium';
  const [isHovered, setIsHovered] = useState(false);
  const [glarePos, setGlarePos] = useState<{ x: number; y: number } | null>(null);

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
    if (unlocked) onHover(banner.id);
  }, [unlocked, onHover, banner.id]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    setGlarePos({
      x: Math.round(((e.clientX - rect.left) / rect.width) * 100),
      y: Math.round(((e.clientY - rect.top) / rect.height) * 100),
    });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    setGlarePos(null);
    onLeave();
  }, [onLeave]);

  return (
    <motion.button
      variants={listChild}
      onClick={() => onPick(banner)}
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onFocus={() => {
        setIsHovered(true);
        if (unlocked) onHover(banner.id);
      }}
      onBlur={() => {
        setIsHovered(false);
        onLeave();
      }}
      whileHover={reduce || !unlocked ? undefined : { y: -4, scale: 1.01 }}
      whileTap={reduce ? undefined : { scale: 0.985 }}
      transition={springSnappy}
      aria-pressed={staged}
      className={`group relative isolate flex min-h-[160px] sm:min-h-[168px] flex-col justify-between overflow-hidden rounded-[1.25rem] border p-4 text-left transition-all duration-300 ${
        unlocked ? 'cursor-pointer' : 'cursor-not-allowed'
      }`}
      style={{
        borderColor: staged
          ? rgba(glow, 0.9)
          : isHovered && unlocked
          ? rgba(glow, 0.5)
          : 'rgba(255, 255, 255, 0.08)',
        background: staged
          ? 'linear-gradient(135deg, rgba(12, 16, 25, 0.95) 0%, rgba(6, 8, 14, 0.98) 100%)'
          : 'linear-gradient(135deg, rgba(10, 13, 20, 0.92) 0%, rgba(5, 7, 12, 0.98) 100%)',
        boxShadow: staged
          ? `0 0 34px ${rgba(glow, 0.35)}, 0 16px 36px -10px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.2)`
          : isHovered && unlocked
          ? `0 0 24px ${rgba(glow, 0.22)}, 0 12px 30px -8px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.14)`
          : '0 8px 24px -10px rgba(0,0,0,0.6)',
        transform: 'translateZ(0)',
      }}
    >
      <EquipBurst pulseKey={pulsing} color={glow} radius="1.25rem" />

      {/* ── 1. Full-Bleed Panoramic Art Canvas ── */}
      <div
        className={`pointer-events-none absolute inset-0 overflow-hidden transition-all duration-500 ${
          unlocked ? 'opacity-80 group-hover:opacity-100 group-hover:scale-[1.02]' : 'opacity-25 grayscale'
        }`}
      >
        <BannerArt
          id={banner.id}
          detail="full"
          animate={!reduce && (isHovered || staged)}
        />
      </div>

      {/* ── 2. Asymmetric Liquid Obsidian Scrim ── */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#04060c] via-[#04060c]/85 to-[#04060c]/25 transition-opacity duration-300"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#04060c]/90 via-transparent to-[#04060c]/40"
      />

      {/* ── 3. Subtle Tech Micro-Grid Reticle & Cyber Corners ── */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.3) 1px, transparent 1px)',
          backgroundSize: '12px 12px',
        }}
      />
      <CyberCorners color={glow} alpha={staged ? 0.65 : isHovered ? 0.4 : 0.18} size={11} inset={6} />

      {/* ── 4. Flank Neon Power Rail ── */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-0 inset-y-0 w-1 rounded-l-full transition-all duration-300"
        style={{
          background: staged
            ? `rgb(${glow})`
            : isHovered && unlocked
            ? rgba(glow, 0.85)
            : 'rgba(255, 255, 255, 0.12)',
          boxShadow: staged
            ? `0 0 16px rgba(${glow}, 0.9), 0 0 32px rgba(${glow}, 0.5)`
            : isHovered && unlocked
            ? `0 0 12px rgba(${glow}, 0.7)`
            : 'none',
        }}
      />

      {/* ── 5. Top Rim Specular Hairline ── */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 z-30 h-[1px] transition-opacity duration-300"
        style={{
          background: staged
            ? `linear-gradient(90deg, transparent, rgba(${glow}, 0.9), transparent)`
            : isHovered
            ? `linear-gradient(90deg, transparent, rgba(${glow}, 0.65), transparent)`
            : 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.18), transparent)',
        }}
      />

      {/* ── 6. Interactive Holographic Cursor Glare ── */}
      {glarePos && unlocked && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-20 transition-opacity duration-200"
          style={{
            background: `radial-gradient(circle 200px at ${glarePos.x}% ${glarePos.y}%, rgba(${glow}, 0.16), transparent 75%)`,
          }}
        />
      )}

      {/* ── 7. Command HUD Header (Telemetry & Status) ── */}
      <div className="relative z-10 flex items-center justify-between gap-2 pointer-events-none">
        {/* Left: Classification Badge */}
        {isPremium ? (
          <div
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 backdrop-blur-md transition-all duration-300 shadow-[0_0_12px_rgba(245,158,11,0.25)] border"
            style={{
              background: 'linear-gradient(135deg, rgba(245,158,11,0.25) 0%, rgba(217,119,6,0.18) 50%, rgba(251,191,36,0.28) 100%)',
              borderColor: 'rgba(251, 191, 36, 0.45)',
            }}
          >
            <Crown size={9} className="text-amber-300 drop-shadow-[0_0_4px_rgba(251,191,36,0.8)]" />
            <span className="font-mono text-[7.5px] font-black uppercase tracking-[0.22em] text-amber-200 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
              PRESTIGE MASTERY
            </span>
          </div>
        ) : (
          <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/40 px-2 py-0.5 backdrop-blur-md">
            <Layers size={9} className="text-white/50" />
            <span className="font-mono text-[7px] font-bold uppercase tracking-[0.2em] text-white/50">
              SUITE // THEME
            </span>
          </div>
        )}

        {/* Right: State Beacon */}
        <div className="flex items-center gap-1.5">
          <AnimatePresence>
            {staged ? (
              <motion.div
                {...reveal(reduce ?? false, chipSwap)}
                className="flex items-center gap-1.5 rounded-full px-2.5 py-0.5 backdrop-blur-md"
                style={{
                  background: 'rgba(6, 9, 15, 0.92)',
                  border: `1px solid rgba(${glow}, 0.85)`,
                  boxShadow: `0 0 16px rgba(${glow}, 0.45), inset 0 1px 1px rgba(255,255,255,0.25)`,
                }}
              >
                <span className="relative flex h-1.5 w-1.5">
                  <span
                    className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-80"
                    style={{ background: rgba(glow, 0.9) }}
                  />
                  <span
                    className="relative inline-flex h-1.5 w-1.5 rounded-full"
                    style={{ background: rgba(glow, 1) }}
                  />
                </span>
                <DrawCheck size={8} strokeWidth={4} className="text-white" />
                <span
                  className="font-mono text-[7.5px] font-black uppercase tracking-[0.22em]"
                  style={{ color: `rgb(${glow})` }}
                >
                  STAGED
                </span>
              </motion.div>
            ) : live ? (
              <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-black/60 px-2.5 py-0.5 backdrop-blur-md shadow-[0_0_12px_rgba(16,185,129,0.25)]">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
                <span className="font-mono text-[7px] font-black uppercase tracking-[0.18em] text-emerald-300">
                  EQUIPPED
                </span>
              </div>
            ) : !unlocked ? (
              <div className="flex items-center gap-1 rounded-full border border-white/10 bg-black/70 px-2 py-0.5 backdrop-blur-md">
                <Lock size={8} className="text-white/40" />
                <span className="font-mono text-[7px] font-bold uppercase tracking-[0.16em] text-white/40">
                  LOCKED
                </span>
              </div>
            ) : (
              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-1 font-mono text-[7.5px] font-bold tracking-[0.18em] uppercase text-white/60">
                <span>PREVIEW</span>
                <ChevronRight size={10} style={{ color: `rgb(${glow})` }} />
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── 8. Hero Architectural Typography & Description ── */}
      <div className="relative z-10 my-auto py-2 pr-2">
        <div className="flex items-center gap-2">
          <h4
            className={`font-sans text-[15px] sm:text-[16px] font-black tracking-tight uppercase transition-all duration-300 ${
              unlocked ? 'text-white' : 'text-white/40'
            }`}
            style={{
              textShadow: staged
                ? `0 0 16px rgba(${glow}, 0.7), 0 0 32px rgba(${glow}, 0.35)`
                : isHovered && unlocked
                ? `0 0 14px rgba(${glow}, 0.45)`
                : undefined,
            }}
          >
            {banner.name}
          </h4>
          {unlocked && (
            <span
              className="h-1.5 w-1.5 rounded-full transition-all duration-300"
              style={{
                background: `rgb(${glow})`,
                boxShadow: staged || isHovered ? `0 0 8px rgb(${glow})` : 'none',
              }}
            />
          )}
        </div>
        <p className="mt-1 max-w-[85%] font-sans text-[11.5px] leading-relaxed text-zinc-300/80 font-normal line-clamp-1">
          {banner.description}
        </p>
      </div>

      {/* ── 9. Bottom Tactical Telemetry Deck ── */}
      {unlocked ? (
        <div className="relative z-10 flex items-center justify-between gap-2 border-t border-white/[0.07] pt-2.5 mt-auto">
          {banner.unlockCondition ? (
            <div
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 font-mono text-[7.5px] font-bold uppercase tracking-[0.14em] border backdrop-blur-md"
              style={{
                background: `rgba(${glow}, 0.1)`,
                borderColor: `rgba(${glow}, 0.3)`,
                color: `rgb(${glow})`,
                boxShadow: `0 0 12px rgba(${glow}, 0.12)`,
              }}
            >
              <Zap size={8} />
              <span>{banner.unlockCondition.value} {banner.unlockCondition.type.toUpperCase()} REQUIREMENT</span>
            </div>
          ) : (
            <div className="font-mono text-[7.5px] font-medium tracking-[0.18em] text-white/35 uppercase">
              SIGNAL ID // {banner.id.toUpperCase()}
            </div>
          )}

          <div
            className="flex items-center gap-1 font-mono text-[8px] font-black uppercase tracking-[0.18em] transition-colors"
            style={{
              color: staged ? `rgb(${glow})` : isHovered ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.4)',
            }}
          >
            <span>{staged ? 'SELECTED' : live ? 'ACTIVE' : 'DEPLOY'}</span>
            <ChevronRight size={10} className="transition-transform group-hover:translate-x-0.5" />
          </div>
        </div>
      ) : (
        <div className="relative z-10 border-t border-white/[0.07] pt-2 mt-auto space-y-1.5">
          <div className="flex items-center justify-between font-mono text-[7.5px] uppercase tracking-[0.16em] text-white/50">
            <span className="flex items-center gap-1">
              <Zap size={8} style={{ color: `rgb(${glow})` }} />
              <span>{Math.round(current)} / {target} {banner.unlockCondition?.type}</span>
            </span>
            <span className="font-bold" style={{ color: `rgb(${glow})` }}>
              {Math.round(ratio * 100)}% UNLOCK PROGRESS
            </span>
          </div>
          <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06] border border-white/5 p-px">
            <motion.div
              className="h-full rounded-full"
              style={{
                width: `${ratio * 100}%`,
                background: `linear-gradient(90deg, rgba(${glow}, 0.6), rgba(${glow}, 1))`,
                boxShadow: `0 0 8px rgba(${glow}, 0.7)`,
              }}
            />
          </div>
        </div>
      )}
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
                      {/* ── BANNERS CATALOG ── */}
                      {tab === 2 && (
                        <div className="space-y-6" onMouseLeave={handleLeaveBanner}>
                          {GROUPED_BANNERS.map((group) => {
                            const isMastery = group.group === 'SKILL MASTERY';
                            return (
                              <div key={group.group} className="space-y-3">
                                {/* Section Header */}
                                <div className="flex items-center justify-between gap-3 pb-0.5">
                                  <div className="flex items-center gap-2.5">
                                    <div
                                      className={`flex h-6 w-6 items-center justify-center rounded-lg border ${
                                        isMastery
                                          ? 'border-amber-400/40 bg-amber-500/10 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.25)]'
                                          : 'border-white/15 bg-white/5 text-white/70'
                                      }`}
                                    >
                                      {isMastery ? <Crown size={12} /> : <Layers size={12} />}
                                    </div>
                                    <div className="flex items-baseline gap-2">
                                      <span
                                        className={`font-mono text-[10px] font-black uppercase tracking-[0.24em] ${
                                          isMastery ? 'text-amber-200' : 'text-white/80'
                                        }`}
                                      >
                                        {group.group}
                                      </span>
                                      <span
                                        className={`hidden sm:inline font-mono text-[8px] uppercase tracking-[0.16em] ${
                                          isMastery ? 'text-amber-400/60' : 'text-white/35'
                                        }`}
                                      >
                                        {isMastery ? 'PRESTIGE MILESTONES' : 'CORE AESTHETICS'}
                                      </span>
                                    </div>
                                  </div>
                                  <span
                                    className={`rounded-full border px-2.5 py-0.5 font-mono text-[8px] font-bold ${
                                      isMastery
                                        ? 'border-amber-400/25 bg-amber-500/10 text-amber-200'
                                        : 'border-white/10 bg-white/5 text-white/40'
                                    }`}
                                  >
                                    {group.items.length} {isMastery ? 'TIERS' : 'THEMES'}
                                  </span>
                                </div>

                                <div
                                  className="h-px w-full"
                                  style={{
                                    background: isMastery
                                      ? 'linear-gradient(to right, rgba(245,158,11,0.45), rgba(245,158,11,0.08), transparent)'
                                      : 'linear-gradient(to right, rgba(255,255,255,0.16), rgba(255,255,255,0.03), transparent)',
                                  }}
                                />

                                <motion.div
                                  variants={listParent(0.03)}
                                  className="grid gap-3 sm:grid-cols-2"
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
                            );
                          })}
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
