/**
 * Title id → icon component.
 *
 * The nine titles used to carry an emoji each — 🐣 ⚡ 🌩️ 🚀 🎯 🏃 🛡️ 🔥 🏆 — and
 * an emoji is not an icon. It renders in the platform's own font at the
 * platform's own weight and colour, so on the dossier's collection grid the
 * titles sat as full-colour Apple/Segoe glyphs beside the achievements' stroked
 * Lucide marks, in a page whose whole colour identity is one accent taken from
 * the operator's banner. It also cannot inherit `currentColor`, so a locked
 * title stayed as bright as an earned one no matter what the tile did, and there
 * is no size that matches a 16px stroke icon's optical weight.
 *
 * The shape mirrors `achievementIcons.ts` deliberately: `titles.ts` stays a data
 * file with a plain string key, and one resolver turns those keys into
 * components. Two collections, one pattern, one place to add an entry.
 */

import {
    Anvil, Award, CloudLightning, Crown, Flame, Footprints, HandHeart, Rocket, ShieldCheck, Sparkles, Sprout, Target, Trophy, Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { TITLE_BADGES } from '@/data/titles';

export const TITLE_ICONS: Record<string, LucideIcon> = {
    /** Fledgling Typist — the start of the journey, not a hatching egg. */
    'sprout': Sprout,
    'zap': Zap,
    'cloud-lightning': CloudLightning,
    'rocket': Rocket,
    'target': Target,
    /** Marathoner. A runner glyph does not exist; the distance does. */
    'footprints': Footprints,
    /**
     * Iron Will. Not a shield: the `unbreakable` achievement already owns
     * `Shield`, and two identical marks in one grid read as one thing listed
     * twice. An anvil is also closer to what the title is about — 200 tests of
     * grinding, not defence.
     */
    'anvil': Anvil,
    'flame': Flame,
    'trophy': Trophy,
    'hand-heart': HandHeart,
    'shield-check': ShieldCheck,
    'crown': Crown,
    'sparkles': Sparkles,
};

/** Never returns undefined: an unmapped key falls back to a generic award. */
export const titleIcon = (key: string): LucideIcon => TITLE_ICONS[key] ?? Award;

/**
 * Title *id* to its mark, resolved once at module load.
 *
 * Prefer this over calling `titleIcon()` in a render body. Lint rejects a
 * capitalised local bound to a call result and then used as a JSX tag
 * (`react-hooks/static-components`) because it cannot tell a lookup in a frozen
 * map from a component built on the spot — and a record access is provably
 * stable, which is the property the rule is actually protecting.
 */
export const TITLE_MARK: Record<string, LucideIcon> = Object.fromEntries(
    TITLE_BADGES.map((badge) => [badge.id, TITLE_ICONS[badge.icon] ?? Award]),
);
