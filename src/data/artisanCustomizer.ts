/**
 * Artisan Keycap Studio Data & State Models
 * Stores configuration, color swatches, profiles, and procedural generators.
 */

export type KeycapProfile = 'cherry' | 'sa' | 'dome';
export type KeycapMaterialType = 'matte' | 'glossy' | 'translucent' | 'metallic';
export type EyeStyle = 'dot' | 'happy' | 'sleepy' | 'star' | 'angry' | 'wink';
export type MouthStyle = 'smile' | 'cat' | 'open' | 'flat' | 'tongue' | 'ooo';
export type AccessoryStyle = 'none' | 'sparkles' | 'catears' | 'horns' | 'antenna';

export interface ArtisanConfig {
  name: string;
  profile: KeycapProfile;
  material: KeycapMaterialType;
  resinColor: string;
  faceInk: string;
  eyes: EyeStyle;
  mouth: MouthStyle;
  accessory: AccessoryStyle;
  hasBlush: boolean;
}

export const RESIN_COLORS: Array<{ id: string; name: string; hex: string }> = [
  { id: 'red', name: 'Coral Red', hex: '#ef4444' },
  { id: 'orange', name: 'Mochi Orange', hex: '#f97316' },
  { id: 'yellow', name: 'Golden Sun', hex: '#eab308' },
  { id: 'green', name: 'Mint Jade', hex: '#10b981' },
  { id: 'teal', name: 'Aqua Cyan', hex: '#06b6d4' },
  { id: 'blue', name: 'Azure Sky', hex: '#0ea5e9' },
  { id: 'indigo', name: 'Periwinkle', hex: '#6366f1' },
  { id: 'purple', name: 'Amethyst', hex: '#a855f7' },
  { id: 'pink', name: 'Sakura Pink', hex: '#ec4899' },
  { id: 'white', name: 'Porcelain White', hex: '#f4f4f5' },
  { id: 'slate', name: 'Slate Steel', hex: '#64748b' },
  { id: 'charcoal', name: 'Obsidian Black', hex: '#1e293b' },
];

export const FACE_INKS: Array<{ id: string; name: string; hex: string }> = [
  { id: 'black', name: 'Onyx Black', hex: '#18181b' },
  { id: 'white', name: 'Pure White', hex: '#ffffff' },
  { id: 'brown', name: 'Chestnut Brown', hex: '#78350f' },
  { id: 'blue', name: 'Cobalt Navy', hex: '#1d4ed8' },
  { id: 'wine', name: 'Crimson Wine', hex: '#9f1239' },
  { id: 'forest', name: 'Forest Green', hex: '#14532d' },
];

export const PROFILES: Array<{ id: KeycapProfile; label: string }> = [
  { id: 'cherry', label: 'Cherry' },
  { id: 'sa', label: 'SA' },
  { id: 'dome', label: 'Dome' },
];

export const MATERIALS: Array<{ id: KeycapMaterialType; label: string }> = [
  { id: 'matte', label: 'Matte' },
  { id: 'glossy', label: 'Glossy' },
  { id: 'translucent', label: 'Translucent' },
  { id: 'metallic', label: 'Metallic' },
];

export const EYE_STYLES: Array<{ id: EyeStyle; label: string }> = [
  { id: 'dot', label: 'Dot' },
  { id: 'happy', label: 'Happy' },
  { id: 'sleepy', label: 'Sleepy' },
  { id: 'star', label: 'Star' },
  { id: 'angry', label: 'Angry' },
  { id: 'wink', label: 'Wink' },
];

export const MOUTH_STYLES: Array<{ id: MouthStyle; label: string }> = [
  { id: 'smile', label: 'Smile' },
  { id: 'cat', label: 'Cat' },
  { id: 'open', label: 'Open' },
  { id: 'flat', label: 'Flat' },
  { id: 'tongue', label: 'Tongue' },
  { id: 'ooo', label: 'Ooo' },
];

export const ACCESSORY_STYLES: Array<{ id: AccessoryStyle; label: string }> = [
  { id: 'none', label: 'None' },
  { id: 'sparkles', label: 'Sparkles' },
  { id: 'catears', label: 'Cat ears' },
  { id: 'horns', label: 'Horns' },
  { id: 'antenna', label: 'Antenna' },
];

/** Default starting template matching the user's reference design */
export const DEFAULT_ARTISAN: ArtisanConfig = {
  name: 'Mochi Neko',
  profile: 'sa',
  material: 'metallic',
  resinColor: '#f97316',
  faceInk: '#18181b',
  eyes: 'dot',
  mouth: 'cat',
  accessory: 'catears',
  hasBlush: true,
};

export const ARTISAN_STORAGE_KEY = 'typenova_custom_artisan';

/** Load saved artisan config or return default */
export function loadArtisanConfig(): ArtisanConfig {
  try {
    const raw = localStorage.getItem(ARTISAN_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_ARTISAN };
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_ARTISAN,
      ...parsed,
    };
  } catch {
    return { ...DEFAULT_ARTISAN };
  }
}

/** Save artisan config */
export function saveArtisanConfig(config: ArtisanConfig): void {
  try {
    localStorage.setItem(ARTISAN_STORAGE_KEY, JSON.stringify(config));
    // Dispatch event so live listeners like AvatarArt can instantly re-render
    window.dispatchEvent(new CustomEvent('typenova_artisan_updated', { detail: config }));
  } catch (err) {
    console.warn('[artisanCustomizer] failed to persist:', err);
  }
}

const RANDOM_NAMES = [
  'Mochi Neko', 'Cyber Kitsune', 'Aru Chibi', 'Nebula Paws', 'Volt Kitty',
  'Tokyo Drift', 'Matcha Bun', 'Solar Flare', 'Onyx Oni', 'Sakura Ghost',
  'Astral Sprout', 'Chrono Meow', 'Voidling', 'Retro Mecha', 'Boba Bear',
];

/** Procedural random generator */
export function generateRandomArtisan(): ArtisanConfig {
  const pick = <T>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];
  return {
    name: pick(RANDOM_NAMES),
    profile: pick(PROFILES).id,
    material: pick(MATERIALS).id,
    resinColor: pick(RESIN_COLORS).hex,
    faceInk: pick(FACE_INKS).hex,
    eyes: pick(EYE_STYLES).id,
    mouth: pick(MOUTH_STYLES).id,
    accessory: pick(ACCESSORY_STYLES).id,
    hasBlush: Math.random() > 0.15,
  };
}

/** Convert hex to RGB triplet string 'R, G, B' */
export function hexToRgbTriplet(hex: string): string {
  const clean = hex.replace('#', '');
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16);
    const g = parseInt(clean[1] + clean[1], 16);
    const b = parseInt(clean[2] + clean[2], 16);
    return `${r}, ${g}, ${b}`;
  }
  if (clean.length >= 6) {
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    return `${r}, ${g}, ${b}`;
  }
  return '249, 115, 22';
}
