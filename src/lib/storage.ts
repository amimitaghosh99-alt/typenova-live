/**
 * TypeNova Unified, Resilient & Type-Safe Storage Engine
 * 
 * Consolidates all scattered localStorage reads and writes across the application.
 * Automatically handles:
 *  - Legacy key migrations (e.g. typezen_* -> typenova_* and guestMode -> typenova_guest_mode)
 *  - Safe JSON serialization & deserialization without silent crashes or corrupted parsing
 *  - Quota exhaustion & private browsing SecurityError shielding
 */

export const StorageKeys = {
  THEME: 'typenova_theme',
  SOUND: 'typenova_sound',
  FONT: 'typenova_font',
  DAILY: 'typenova_daily',
  AUTOSAVE: 'typenova_autosave',
  SEEN_VERSION: 'typenova_seen_version',
  LIST_ROOMS: 'typenova_list_rooms',
  AVATAR_ID: 'typenova_avatar_id',
  BANNER_ID: 'typenova_banner_id',
  GUEST_MODE: 'typenova_guest_mode',
  GHOST_MODE: 'typenova_ghost_mode',
  XP: 'typenova_xp',
  TESTS: 'typenova_tests',
  ACHIEVEMENTS: 'typenova_achievements',
  HEATMAP: 'typenova_heatmap',
  QUESTS: 'typenova_quests',
  BEST_COMBO: 'typenova_best_combo',
  RACES_WON: 'typenova_races_won',
  WORD_WEAKNESS: 'typenova_word_weakness',
} as const;

/**
 * Legacy key mapping for seamless, backward-compatible migration.
 */
const LEGACY_FALLBACK_MAP: Record<string, string> = {
  [StorageKeys.THEME]: 'typezen_theme',
  [StorageKeys.SOUND]: 'typezen_sound',
  [StorageKeys.FONT]: 'typezen_font',
  [StorageKeys.DAILY]: 'typezen_daily',
  [StorageKeys.AUTOSAVE]: 'typezen_autosave',
  [StorageKeys.GUEST_MODE]: 'guestMode',
  [StorageKeys.GHOST_MODE]: 'typezen_ghost_mode',
  [StorageKeys.XP]: 'typezen_xp',
  [StorageKeys.TESTS]: 'typezen_tests',
  [StorageKeys.ACHIEVEMENTS]: 'typezen_achievements',
  [StorageKeys.HEATMAP]: 'typezen_heatmap',
  [StorageKeys.QUESTS]: 'typezen_quests',
  [StorageKeys.BEST_COMBO]: 'typezen_best_combo',
  [StorageKeys.RACES_WON]: 'typezen_races_won',
  [StorageKeys.WORD_WEAKNESS]: 'typezen_word_weakness',
};

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export const appStorage = {
  /**
   * Retrieves an item from localStorage with fallback and automatic migration.
   */
  get<T>(key: string, fallback: T): T {
    if (!isBrowser()) return fallback;
    try {
      let raw = window.localStorage.getItem(key);
      if (raw === null && LEGACY_FALLBACK_MAP[key]) {
        raw = window.localStorage.getItem(LEGACY_FALLBACK_MAP[key]);
      }
      if (raw === null) return fallback;

      if (typeof fallback === 'string') {
        return raw as unknown as T;
      }
      if (typeof fallback === 'number') {
        const num = Number(raw);
        return (isNaN(num) ? fallback : num) as unknown as T;
      }
      if (typeof fallback === 'boolean') {
        return (raw === 'true') as unknown as T;
      }

      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  },

  /**
   * Retrieves a string value, checking primary and legacy fallback keys.
   */
  getString(key: string, fallback = ''): string {
    if (!isBrowser()) return fallback;
    try {
      const val = window.localStorage.getItem(key);
      if (val !== null) return val;
      const legacyKey = LEGACY_FALLBACK_MAP[key];
      if (legacyKey) {
        const legacyVal = window.localStorage.getItem(legacyKey);
        if (legacyVal !== null) return legacyVal;
      }
      return fallback;
    } catch {
      return fallback;
    }
  },

  /**
   * Retrieves a number value, checking primary and legacy fallback keys.
   */
  getNumber(key: string, fallback = 0): number {
    const str = this.getString(key, '');
    if (!str) return fallback;
    const n = Number(str);
    return isNaN(n) ? fallback : n;
  },

  /**
   * Retrieves a boolean value with fallback.
   */
  getBoolean(key: string, fallback = false): boolean {
    const str = this.getString(key, '');
    if (!str) return fallback;
    return str === 'true';
  },

  /**
   * Safely writes a key-value pair to localStorage.
   */
  set<T>(key: string, value: T): boolean {
    if (!isBrowser()) return false;
    try {
      const str = typeof value === 'string' ? value : JSON.stringify(value);
      window.localStorage.setItem(key, str);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Removes a key and its associated legacy key from localStorage.
   */
  remove(key: string): void {
    if (!isBrowser()) return;
    try {
      window.localStorage.removeItem(key);
      const legacyKey = LEGACY_FALLBACK_MAP[key];
      if (legacyKey) {
        window.localStorage.removeItem(legacyKey);
      }
    } catch {}
  },
};
