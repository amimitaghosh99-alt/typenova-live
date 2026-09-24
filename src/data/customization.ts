
export interface BannerDef {
  id: string;
  name: string;
  description: string;
  bgClass: string;      // The main banner background
  glowColor: string;    // Accent glow color for the card
  accentBorder: string; // Accent border class
  type: 'free' | 'premium';
  unlockCondition?: {
    type: 'level' | 'wpm' | 'combo';
    value: number;
    description: string;
  };
}

export interface AvatarDef {
  id: string;
  /**
   * Typing-native identity. Every avatar is a keycap, so the name is the
   * legend printed on its face — see `AvatarKeycap.tsx` for the art. Ids are
   * persisted in `public_profiles.avatar_id`, so they never change even when
   * a name or its art does.
   */
  name: string;
  gradient: string;     // Vivid CSS background gradient
  glowColor: string;    // RGBA glow color string
  borderColor: string;  // Border styling
  iconColor: string;    // Icon foreground color
}

// Curated Thematic Banners — hand-crafted identities aligned with typing, cyberpunk & artisan aesthetics
const FREE_BANNERS: BannerDef[] = [
  {
    id: 'basic_dark',
    name: 'Void',
    description: 'Pure darkness. No distractions.',
    bgClass: 'bg-zinc-950',
    glowColor: '161, 161, 170',
    accentBorder: 'border-zinc-700/50',
    type: 'free'
  },
  {
    id: 'matrix',
    name: 'Matrix',
    description: 'Digital green code rain.',
    bgClass: 'banner-matrix',
    glowColor: '34, 197, 94',
    accentBorder: 'border-green-500/40',
    type: 'free'
  },
  {
    id: 'midnight_gold',
    name: 'Midnight Gold',
    description: 'Luxury black and gold.',
    bgClass: 'bg-gradient-to-br from-yellow-600 via-amber-950 to-zinc-950 bg-[length:200%_200%] animate-gradient-xy',
    glowColor: '234, 179, 8',
    accentBorder: 'border-yellow-500/40',
    type: 'free'
  },
  {
    id: 'cherry_blossom',
    name: 'Cherry Blossom',
    description: 'Soft pink to lavender bloom.',
    bgClass: 'bg-gradient-to-br from-pink-400 via-rose-700 to-violet-950 bg-[length:200%_200%] animate-gradient-xy',
    glowColor: '244, 114, 182',
    accentBorder: 'border-pink-400/40',
    type: 'free'
  },
  {
    id: 'neon_pink',
    name: 'Neon Pulse',
    description: 'Hot pink cyberpunk vibes.',
    bgClass: 'bg-gradient-to-br from-pink-500 via-fuchsia-900 to-slate-950 bg-[length:200%_200%] animate-gradient-xy',
    glowColor: '236, 72, 153',
    accentBorder: 'border-pink-500/40',
    type: 'free'
  },
  {
    id: 'aurora_borealis',
    name: 'Aurora',
    description: 'Northern lights — green, cyan, purple.',
    bgClass: 'bg-gradient-to-r from-emerald-600 via-cyan-700 to-purple-800 bg-[length:200%_100%] animate-gradient-x',
    glowColor: '45, 212, 191',
    accentBorder: 'border-teal-500/40',
    type: 'free'
  },
];

// Premium Animated/Skill-based Banners
const PREMIUM_BANNERS: BannerDef[] = [
  {
    id: 'premium_speed',
    name: 'Velocity Stream',
    description: 'Animated speed streaks.',
    bgClass: 'bg-gradient-to-r from-cyan-500 via-blue-600 to-cyan-500 bg-[length:200%_100%] animate-gradient-x',
    glowColor: '6, 182, 212',
    accentBorder: 'border-cyan-400/50',
    type: 'premium',
    unlockCondition: { type: 'wpm', value: 100, description: 'Achieve 100+ WPM' }
  },
  {
    id: 'premium_godspeed',
    name: 'Godspeed',
    description: 'Blazing golden flare.',
    bgClass: 'bg-gradient-to-r from-amber-500 via-yellow-300 to-amber-500 bg-[length:200%_100%] animate-gradient-x',
    glowColor: '245, 158, 11',
    accentBorder: 'border-amber-400/50',
    type: 'premium',
    unlockCondition: { type: 'wpm', value: 150, description: 'Achieve 150+ WPM' }
  },
  {
    id: 'premium_combo',
    name: 'Flawless',
    description: 'Pulsing emerald perfection.',
    bgClass: 'bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 bg-[length:200%_100%] animate-pulse',
    glowColor: '16, 185, 129',
    accentBorder: 'border-emerald-400/50',
    type: 'premium',
    unlockCondition: { type: 'combo', value: 100, description: 'Achieve a 100x Combo' }
  },
  {
    id: 'premium_master',
    name: 'Grandmaster',
    description: 'Cosmic void energy.',
    bgClass: 'bg-gradient-to-br from-violet-500 via-purple-700 to-indigo-900 bg-[length:400%_400%] animate-gradient-xy',
    glowColor: '139, 92, 246',
    accentBorder: 'border-violet-400/50',
    type: 'premium',
    unlockCondition: { type: 'level', value: 50, description: 'Reach Level 50' }
  },
  {
    id: 'premium_hellfire',
    name: 'Hellfire',
    description: 'Infernal blaze.',
    bgClass: 'bg-gradient-to-t from-red-600 via-orange-500 to-yellow-500 bg-[length:200%_200%] animate-gradient-y',
    glowColor: '239, 68, 68',
    accentBorder: 'border-red-400/50',
    type: 'premium',
    unlockCondition: { type: 'combo', value: 200, description: 'Achieve a 200x Combo' }
  },
];

export const ALL_BANNERS = [...FREE_BANNERS, ...PREMIUM_BANNERS];

/**
 * Every avatar is a keycap, and its name is the legend printed on the cap.
 * The set is drawn entirely from typing: the keys you press (Caret, Backspace,
 * Return, ⌘), the hardware under them (Switch, Home Row, Spacebar), and the
 * things a run is measured by (Precision, Combo, Streak, Record).
 *
 * The ids below are legacy — they are written to `public_profiles.avatar_id`
 * and to local storage, so renaming one would silently reset a player's
 * loadout. They stay frozen; only the name and the art move.
 */
export const AVATARS: AvatarDef[] = [
  // ── ABS: the stock caps everyone starts with ──
  { id: 'default', name: 'Caret', gradient: 'bg-gradient-to-br from-cyan-600 to-blue-800', glowColor: '6, 182, 212', borderColor: 'border-cyan-400/60', iconColor: 'text-cyan-100' },
  { id: 'cat', name: 'Backspace', gradient: 'bg-gradient-to-br from-purple-600 to-pink-700', glowColor: '168, 85, 247', borderColor: 'border-purple-400/60', iconColor: 'text-purple-100' },
  { id: 'dog', name: 'Return', gradient: 'bg-gradient-to-br from-amber-500 to-orange-700', glowColor: '245, 158, 11', borderColor: 'border-amber-400/60', iconColor: 'text-amber-100' },
  { id: 'bird', name: 'Shift', gradient: 'bg-gradient-to-br from-sky-400 to-indigo-700', glowColor: '56, 189, 248', borderColor: 'border-sky-300/60', iconColor: 'text-sky-100' },
  { id: 'skull', name: 'Escape', gradient: 'bg-gradient-to-br from-zinc-800 to-red-950', glowColor: '239, 68, 68', borderColor: 'border-red-500/60', iconColor: 'text-red-400' },
  { id: 'ghost', name: 'Tab', gradient: 'bg-gradient-to-br from-teal-500 to-emerald-800', glowColor: '45, 212, 191', borderColor: 'border-teal-300/60', iconColor: 'text-teal-100' },
  { id: 'zap', name: 'Bolt', gradient: 'bg-gradient-to-br from-yellow-400 to-amber-600', glowColor: '250, 204, 21', borderColor: 'border-yellow-300/80', iconColor: 'text-yellow-950' },
  { id: 'rocket', name: 'Spacebar', gradient: 'bg-gradient-to-br from-rose-600 to-indigo-900', glowColor: '244, 63, 94', borderColor: 'border-rose-400/60', iconColor: 'text-rose-100' },

  // ── Doubleshot: crisper legends, tighter colours ──
  { id: 'moon', name: 'Control', gradient: 'bg-gradient-to-br from-indigo-600 to-slate-900', glowColor: '99, 102, 241', borderColor: 'border-indigo-400/60', iconColor: 'text-indigo-200' },
  { id: 'sun', name: 'Option', gradient: 'bg-gradient-to-br from-amber-400 to-red-600', glowColor: '249, 115, 22', borderColor: 'border-amber-300/80', iconColor: 'text-amber-950' },
  { id: 'star', name: 'Command', gradient: 'bg-gradient-to-br from-fuchsia-500 to-purple-800', glowColor: '217, 70, 239', borderColor: 'border-fuchsia-400/60', iconColor: 'text-fuchsia-100' },
  { id: 'cpu', name: 'Switch', gradient: 'bg-gradient-to-br from-emerald-500 to-cyan-900', glowColor: '16, 185, 129', borderColor: 'border-emerald-400/60', iconColor: 'text-emerald-100' },
  { id: 'gamepad', name: 'Home Row', gradient: 'bg-gradient-to-br from-violet-600 to-pink-600', glowColor: '139, 92, 246', borderColor: 'border-violet-400/60', iconColor: 'text-violet-100' },
  { id: 'flame', name: 'Streak', gradient: 'bg-gradient-to-br from-red-500 to-orange-600', glowColor: '239, 68, 68', borderColor: 'border-red-400/70', iconColor: 'text-amber-200' },
  { id: 'droplets', name: 'Prompt', gradient: 'bg-gradient-to-br from-cyan-400 to-blue-700', glowColor: '14, 165, 233', borderColor: 'border-cyan-300/70', iconColor: 'text-sky-100' },

  // ── Translucent: RGB washes up through the legend ──
  { id: 'hexagon', name: 'Braces', gradient: 'bg-gradient-to-br from-blue-600 to-purple-900', glowColor: '59, 130, 246', borderColor: 'border-blue-400/60', iconColor: 'text-blue-100' },
  { id: 'crown', name: 'Combo', gradient: 'bg-gradient-to-br from-yellow-300 via-amber-500 to-yellow-600', glowColor: '234, 179, 8', borderColor: 'border-yellow-200/90', iconColor: 'text-yellow-950' },
  { id: 'swords', name: 'Duel', gradient: 'bg-gradient-to-br from-slate-600 to-zinc-900', glowColor: '148, 163, 184', borderColor: 'border-slate-300/60', iconColor: 'text-slate-100' },
  { id: 'shield', name: 'Precision', gradient: 'bg-gradient-to-br from-blue-500 to-emerald-700', glowColor: '59, 130, 246', borderColor: 'border-blue-300/60', iconColor: 'text-blue-100' },
  { id: 'diamond', name: 'Flawless', gradient: 'bg-gradient-to-br from-sky-300 via-cyan-400 to-blue-600', glowColor: '125, 211, 252', borderColor: 'border-sky-200/90', iconColor: 'text-sky-950' },
  { id: 'eye', name: 'Focus', gradient: 'bg-gradient-to-br from-purple-900 via-fuchsia-800 to-slate-950', glowColor: '192, 38, 211', borderColor: 'border-fuchsia-400/60', iconColor: 'text-fuchsia-200' },

  // ── Artisan: machined alloy, engraved legends ──
  { id: 'sparkles', name: 'Ghost Text', gradient: 'bg-gradient-to-br from-pink-400 via-rose-500 to-purple-700', glowColor: '244, 114, 182', borderColor: 'border-pink-300/70', iconColor: 'text-pink-100' },
  { id: 'compass', name: 'Navigator', gradient: 'bg-gradient-to-br from-teal-600 to-emerald-900', glowColor: '20, 184, 166', borderColor: 'border-teal-400/60', iconColor: 'text-teal-100' },
  { id: 'trophy', name: 'Record', gradient: 'bg-gradient-to-br from-amber-400 via-yellow-500 to-orange-600', glowColor: '245, 158, 11', borderColor: 'border-amber-300/90', iconColor: 'text-amber-950' },

  // ── Celestial & Exotic: Gold, Prismatic Crystal, Matrix Liquid Glass, and Carbon ──
  { id: 'matrix', name: 'Terminal', gradient: 'bg-gradient-to-br from-emerald-950 via-green-900 to-black', glowColor: '16, 185, 129', borderColor: 'border-emerald-400/80', iconColor: 'text-emerald-300' },
  { id: 'vim', name: 'Hacker', gradient: 'bg-gradient-to-br from-amber-600 via-zinc-900 to-black', glowColor: '245, 158, 11', borderColor: 'border-amber-400/80', iconColor: 'text-amber-300' },
  { id: 'turbo', name: 'Overdrive', gradient: 'bg-gradient-to-br from-red-600 via-rose-900 to-zinc-950', glowColor: '244, 63, 94', borderColor: 'border-rose-400/80', iconColor: 'text-rose-200' },
  { id: 'soundwave', name: 'Thock', gradient: 'bg-gradient-to-br from-violet-700 via-purple-900 to-slate-950', glowColor: '139, 92, 246', borderColor: 'border-violet-400/80', iconColor: 'text-violet-200' },
  { id: 'quantum', name: 'Quantum Core', gradient: 'bg-gradient-to-br from-cyan-400 via-blue-800 to-slate-950', glowColor: '6, 182, 212', borderColor: 'border-cyan-300/80', iconColor: 'text-cyan-100' },
  { id: 'aurora', name: 'Hyperdrive', gradient: 'bg-gradient-to-br from-sky-400 via-indigo-900 to-zinc-950', glowColor: '56, 189, 248', borderColor: 'border-sky-300/80', iconColor: 'text-sky-100' },
  { id: 'carbon', name: 'Carbon Weave', gradient: 'bg-gradient-to-br from-zinc-700 via-neutral-900 to-black', glowColor: '148, 163, 184', borderColor: 'border-zinc-400/80', iconColor: 'text-zinc-200' },
  { id: 'gold_esc', name: 'Midas Esc', gradient: 'bg-gradient-to-br from-yellow-300 via-amber-500 to-yellow-800', glowColor: '234, 179, 8', borderColor: 'border-yellow-200', iconColor: 'text-amber-950' },
  { id: 'prism', name: 'Supernova', gradient: 'bg-gradient-to-br from-fuchsia-500 via-pink-600 to-purple-950', glowColor: '217, 70, 239', borderColor: 'border-fuchsia-300', iconColor: 'text-pink-100' },
  { id: 'phoenix', name: 'Immortal', gradient: 'bg-gradient-to-br from-rose-500 via-red-600 to-orange-950', glowColor: '251, 113, 133', borderColor: 'border-rose-300', iconColor: 'text-rose-100' },
  { id: 'nova_prime', name: 'Nova Prime', gradient: 'bg-gradient-to-br from-cyan-300 via-blue-600 to-indigo-950', glowColor: '56, 189, 248', borderColor: 'border-cyan-200', iconColor: 'text-cyan-100' },
  { id: 'typenova', name: 'TypeNova', gradient: 'bg-gradient-to-br from-cyan-300 via-teal-500 to-indigo-950', glowColor: '0, 240, 255', borderColor: 'border-cyan-300', iconColor: 'text-cyan-200' },

  // ── Arena Artisan Series: Damascus Relic, Ghost Circuit, and Astral Bloom ──
  { id: 'damascus_relic', name: 'Damascus Relic', gradient: 'bg-gradient-to-br from-stone-400 via-stone-700 to-zinc-950', glowColor: '216, 181, 128', borderColor: 'border-amber-200/60', iconColor: 'text-amber-100' },
  { id: 'ghost_circuit', name: 'Ghost Circuit', gradient: 'bg-gradient-to-br from-emerald-300 via-emerald-900 to-zinc-950', glowColor: '136, 237, 187', borderColor: 'border-emerald-300/70', iconColor: 'text-emerald-100' },
  { id: 'astral_bloom', name: 'Astral Bloom', gradient: 'bg-gradient-to-br from-violet-200 via-purple-800 to-slate-950', glowColor: '213, 183, 245', borderColor: 'border-purple-200/70', iconColor: 'text-purple-100' },

  // ── Super Premium: Sakura Rift — liquid crystal aurora cherry blossom ──
  { id: 'sakura_rift', name: 'Sakura Rift', gradient: 'bg-gradient-to-br from-pink-300 via-rose-500 to-fuchsia-900', glowColor: '244, 163, 201', borderColor: 'border-pink-200', iconColor: 'text-pink-100' },

  // ── Player Bespoke Studio Keycap ──
  { id: 'custom_artisan', name: 'Custom Artisan', gradient: 'bg-gradient-to-br from-amber-400 via-pink-500 to-purple-800', glowColor: '249, 115, 22', borderColor: 'border-amber-300', iconColor: 'text-amber-200' }
];
