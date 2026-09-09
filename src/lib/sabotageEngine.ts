/**
 * TypeNova Cyber Sabotage - 1v1 Tactical Hexes & Disruption Combat Engine
 *
 * Implements real-time Hex Energy generation, ability definitions,
 * combat conflict resolution (shield deflections, active hex expirations),
 * and visual/textual perturbation helpers.
 */

export type HexType = 'glitch_fog' | 'capitals_curse' | 'caret_inversion' | 'cleanse_shield';

export interface HexAbilityDef {
  id: HexType;
  name: string;
  cost: number;
  durationMs: number;
  description: string;
  hotkey: string;
  hotkeyLabel: string;
  accentColor: string;
  category: 'disruption' | 'defense';
}

export const HEX_ABILITIES: Record<HexType, HexAbilityDef> = {
  glitch_fog: {
    id: 'glitch_fog',
    name: 'Glitch Fog',
    cost: 35,
    durationMs: 4500,
    description: 'Shrouds opponent upcoming text stream in digital chromatic static blur',
    hotkey: '1',
    hotkeyLabel: 'Alt+1',
    accentColor: '244, 63, 94', // Rose neon
    category: 'disruption',
  },
  capitals_curse: {
    id: 'capitals_curse',
    name: 'Capitals Curse',
    cost: 50,
    durationMs: 5000,
    description: 'Randomly forces UPPERCASE on 4 upcoming words, testing Shift key cadence',
    hotkey: '2',
    hotkeyLabel: 'Alt+2',
    accentColor: '245, 158, 11', // Amber neon
    category: 'disruption',
  },
  caret_inversion: {
    id: 'caret_inversion',
    name: 'Caret Inversion',
    cost: 65,
    durationMs: 5000,
    description: 'Drifts and oscillates opponent caret with phantom vibration artifacts',
    hotkey: '3',
    hotkeyLabel: 'Alt+3',
    accentColor: '168, 85, 247', // Purple neon
    category: 'disruption',
  },
  cleanse_shield: {
    id: 'cleanse_shield',
    name: 'Cleanse Shield',
    cost: 40,
    durationMs: 3500,
    description: 'Purges all active hexes and deploys a 3.5s firewall deflecting incoming hexes',
    hotkey: '4',
    hotkeyLabel: 'Alt+4',
    accentColor: '16, 185, 129', // Emerald neon
    category: 'defense',
  },
};

export const HEX_ABILITY_LIST: HexAbilityDef[] = Object.values(HEX_ABILITIES);

export interface ActiveHex {
  id: string;
  hexType: HexType;
  fromName: string;
  fromId: string;
  appliedAt: number;
  durationMs: number;
  expiresAt: number;
}

export interface SabotageStats {
  hexesCast: number;
  hexesAfflicted: number;
  hexesDeflected: number;
  cleanseCount: number;
}

export const INITIAL_SABOTAGE_STATS: SabotageStats = {
  hexesCast: 0,
  hexesAfflicted: 0,
  hexesDeflected: 0,
  cleanseCount: 0,
};

/**
 * Calculates new Hex Energy following a keystroke or milestone event.
 *
 * Rules:
 * - Base keystroke in combo: +1.5% energy
 * - Combo milestones (25, 50, 100, 200): +15% instant burst
 * - Keystroke error: -15% energy penalty
 * - Energy clamped between 0 and 100
 */
export function calculateHexEnergy({
  currentEnergy,
  combo,
  isError = false,
  isMilestone = false,
}: {
  currentEnergy: number;
  combo: number;
  isError?: boolean;
  isMilestone?: boolean;
}): number {
  if (isError) {
    return Math.max(0, Math.round((currentEnergy - 15) * 10) / 10);
  }

  let delta = 1.5;

  // Streak multiplier: higher combos charge slightly faster
  if (combo >= 100) delta *= 1.5;
  else if (combo >= 50) delta *= 1.3;
  else if (combo >= 25) delta *= 1.15;

  if (isMilestone) {
    delta += 15;
  }

  return Math.min(100, Math.round((currentEnergy + delta) * 10) / 10);
}

/**
 * Checks if a player has sufficient energy to cast an ability.
 */
export function canCastHex(currentEnergy: number, hexType: HexType): boolean {
  const ability = HEX_ABILITIES[hexType];
  return Boolean(ability && currentEnergy >= ability.cost);
}

/**
 * Applies an incoming hex to a player's active status list.
 *
 * If the player has an active `cleanse_shield`, disruption hexes are deflected.
 */
export function applyIncomingHex({
  activeHexes,
  incomingHex,
  now = Date.now(),
}: {
  activeHexes: ActiveHex[];
  incomingHex: Omit<ActiveHex, 'expiresAt'>;
  now?: number;
}): {
  updatedHexes: ActiveHex[];
  deflected: boolean;
  cleansed: boolean;
} {
  // Prune expired hexes first
  const aliveHexes = activeHexes.filter(h => h.expiresAt > now);

  // If incoming is Cleanse Shield, purge all negative hexes and add shield
  if (incomingHex.hexType === 'cleanse_shield') {
    const shieldHex: ActiveHex = {
      ...incomingHex,
      expiresAt: now + incomingHex.durationMs,
    };
    return {
      updatedHexes: [shieldHex],
      deflected: false,
      cleansed: aliveHexes.length > 0,
    };
  }

  // Check if player has an active defense shield
  const activeShield = aliveHexes.find(h => h.hexType === 'cleanse_shield');
  if (activeShield) {
    return {
      updatedHexes: aliveHexes,
      deflected: true,
      cleansed: false,
    };
  }

  // Remove duplicate of same hex type to refresh duration
  const otherHexes = aliveHexes.filter(h => h.hexType !== incomingHex.hexType);
  const newHex: ActiveHex = {
    ...incomingHex,
    expiresAt: now + incomingHex.durationMs,
  };

  return {
    updatedHexes: [...otherHexes, newHex],
    deflected: false,
    cleansed: false,
  };
}

/**
 * Prunes any hexes that have reached their expiration time.
 */
export function pruneExpiredHexes(activeHexes: ActiveHex[], now = Date.now()): ActiveHex[] {
  return activeHexes.filter(h => h.expiresAt > now);
}

/**
 * Dynamic text perturbation for Capitals Curse:
 * Given a target text and player's current character index, capitalizes the
 * next `wordCount` words starting at or immediately after `currentIndex`.
 */
export function applyCapitalsCurse(
  text: string,
  currentIndex: number,
  wordCount = 4
): string {
  if (!text || currentIndex >= text.length) return text;

  const prefix = text.slice(0, currentIndex);
  const rest = text.slice(currentIndex);

  const words = rest.split(/(\s+)/);
  let transformedWords = 0;

  const mutatedRest = words
    .map((chunk) => {
      // Skip whitespace
      if (/^\s+$/.test(chunk)) return chunk;

      if (transformedWords < wordCount) {
        transformedWords++;
        return chunk.toUpperCase();
      }
      return chunk;
    })
    .join('');

  return prefix + mutatedRest;
}
