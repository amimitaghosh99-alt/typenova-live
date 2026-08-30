import type { Level } from '@/data/constants';

/**
 * Canonical game-mode identity.
 *
 * A leaderboard is only meaningful between comparable runs, so scores are
 * partitioned by the configuration that produced them. The key is
 * `LEVEL:tSECONDS` for timed tests and `LEVEL:wWORDS` for word-count tests —
 * deliberately the same string the personal-best ghost has always been stored
 * under, so PB ghosts, mode boards and rival ghosts all share one namespace.
 *
 * `submit_score()` validates the shape server-side against the same pattern,
 * so this format is a contract with the database, not just a local convention.
 */

export type TestMode = 'words' | 'time';

/** Must stay in sync with the regex in `submit_score()`. */
export const MODE_KEY_PATTERN = /^[A-Z]{1,16}:[tw]\d{1,5}$/;

export interface ParsedModeKey {
  level: string;
  testMode: TestMode;
  /** Seconds for a timed mode, words for a word-count mode. */
  size: number;
}

/**
 * Levels that never reach a public board. CUSTOM text is user-supplied, so its
 * runs are neither comparable to anyone else's nor safe to publish a curve for.
 */
const UNRANKED_LEVELS: ReadonlySet<string> = new Set<Level>(['CUSTOM']);

export function buildModeKey(
  level: Level,
  testMode: TestMode,
  duration: number,
  wordCount: number,
): string {
  const size = testMode === 'time' ? `t${duration}` : `w${wordCount}`;
  return `${level}:${size}`;
}

/** Whether runs in this level belong on a shared board at all. */
export function isRankableLevel(level: Level): boolean {
  return !UNRANKED_LEVELS.has(level);
}

/**
 * The mode key to submit, or `null` when the run is not comparable.
 * Mirrors the exclusions the personal-best recorder already applies: custom
 * text has no shared baseline, and the daily challenge has its own board.
 */
export function submittableModeKey(opts: {
  level: Level;
  testMode: TestMode;
  duration: number;
  wordCount: number;
  dailyActive: boolean;
  mirroredMode: boolean;
}): string | null {
  if (!isRankableLevel(opts.level)) return null;
  // A mirrored run is the same text under a different motor task; scoring it
  // against upright runs would silently corrupt the board.
  if (opts.mirroredMode) return null;
  if (opts.dailyActive) return null;
  return buildModeKey(opts.level, opts.testMode, opts.duration, opts.wordCount);
}

export function parseModeKey(key: string): ParsedModeKey | null {
  if (!MODE_KEY_PATTERN.test(key)) return null;
  const [level, size] = key.split(':');
  const testMode: TestMode = size.startsWith('t') ? 'time' : 'words';
  const value = Number.parseInt(size.slice(1), 10);
  if (!Number.isFinite(value) || value <= 0) return null;
  return { level, testMode, size: value };
}

/** Compact board heading, e.g. `NOVICE · 30S` or `ADEPT · 50W`. */
export function formatModeLabel(key: string | null): string {
  const parsed = key ? parseModeKey(key) : null;
  if (!parsed) return 'THIS MODE';
  const size = parsed.testMode === 'time' ? `${parsed.size}S` : `${parsed.size}W`;
  return `${parsed.level} · ${size}`;
}

/** Sentence-style label for tooltips and empty states. */
export function formatModeLabelLong(key: string | null): string {
  const parsed = key ? parseModeKey(key) : null;
  if (!parsed) return 'this mode';
  const level = parsed.level.charAt(0) + parsed.level.slice(1).toLowerCase();
  const size = parsed.testMode === 'time'
    ? `${parsed.size} second${parsed.size === 1 ? '' : 's'}`
    : `${parsed.size} word${parsed.size === 1 ? '' : 's'}`;
  return `${level} · ${size}`;
}

/**
 * localStorage key for the personal-best ghost of a mode.
 * The `typezen_pb:` prefix predates mode keys and is preserved verbatim so
 * personal bests recorded by earlier versions are still found.
 */
export function pbStorageKeyFor(modeKey: string): string {
  return `typezen_pb:${modeKey}`;
}
