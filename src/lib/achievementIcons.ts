/**
 * Achievement id → icon component.
 *
 * `src/data/constants.ts` stores each achievement's icon as a plain string
 * because `tailwind.config.js` loads that file through jiti to build the theme
 * safelist, so it has to stay import-free. Resolving those strings to real
 * components therefore has to happen somewhere else — and it used to happen
 * inside `AppModalManager.tsx`, private to the Hall of Legends modal. The
 * dossier's badge grid needed the same mapping, and a second copy would drift
 * the moment an achievement is added.
 */

import {
    CalendarCheck, Crosshair, Crown, EyeOff, Flame, Gauge, Hourglass, Orbit,
    Palette, Rocket, RotateCcw, Shield, Skull, Sparkles, Star, Sword, Swords,
    Trophy, Unlock, Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export const ACHIEVEMENT_ICONS: Record<string, LucideIcon> = {
    'zap': Zap,
    'rocket': Rocket,
    'crosshair': Crosshair,
    'shield': Shield,
    'skull': Skull,
    'eye-off': EyeOff,
    'gauge': Gauge,
    'flame': Flame,
    'star': Star,
    'crown': Crown,
    'palette': Palette,
    'swords': Swords,
    'sword': Sword,
    'sparkles': Sparkles,
    'orbit': Orbit,
    'unlock': Unlock,
    'rotate-ccw': RotateCcw,
    'calendar-check': CalendarCheck,
    'hourglass': Hourglass,
};

/** Never returns undefined: an unmapped icon key falls back to a trophy. */
export const achievementIcon = (key: string): LucideIcon => ACHIEVEMENT_ICONS[key] ?? Trophy;
