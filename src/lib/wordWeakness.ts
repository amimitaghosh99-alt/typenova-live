/**
 * Word-Weakness core — pure functions, zero React.
 *
 * Every completed test feeds a keystroke log through `aggregateWords`, which
 * attributes each keystroke to the word that owned its position in the target
 * text. The aggregated counts feed `recordRun` (lifetime totals + first-error
 * entry into tracking) and, for drills, `gradeDrillRun` (Leitner scheduling).
 *
 * Why word level at all: the per-KEY heatmap (`typezen_heatmap`) already says
 * "your `;` is sloppy". It cannot say "you fumble `structure` every single
 * time" — because the mistake is usually not one key but a motor sequence.
 * This module is that second lens, plus the review schedule that turns it
 * into practice.
 *
 * Backspace alignment (the load-bearing fact): `TypingController` appends
 * exactly one char per non-backspace keypress and removes one per shrinking
 * backspace, and the engine logs a backspace ONLY when it actually shrank the
 * input (`useTypingEngine.ts:14-17`). So a pointer that increments on every
 * non-backspace keystroke and decrements on every logged backspace tracks the
 * input length exactly, and `targetText[pointer]` is the char the keystroke
 * was judged against. Backspaces themselves attribute nothing, matching the
 * engine's own rule that they are excluded from all statistics.
 */

import type { Keystroke } from '@/hooks/useTypingEngine';

/** One tracked word's lifetime record. */
export interface WordStat {
  /** Non-backspace keystrokes attributed to this word (all runs). */
  total: number;
  /** Error keystrokes attributed to this word (all runs). */
  errors: number;
  /** Sum of inter-keystroke delays in ms, for an avg-latency sort. */
  totalMs: number;
  /** Leitner box 0-5. 0 = newly broken / just failed. */
  box: number;
  /** ISO date (YYYY-MM-DD) when the word next enters review. */
  due: string;
  /** ISO date of the last run that included this word. */
  lastSeen: string;
}

export type WordWeaknessMap = Record<string, WordStat>;

/** Per-word counts computed from one completed run, before persistence. */
export interface RunWordAggregate {
  /** Already normalized (see `normalizeWord`). */
  word: string;
  total: number;
  errors: number;
  totalMs: number;
}

/** Metadata attached to a launched drill so its words can be SR-graded. */
export interface DrillRunMeta {
  /** The exact words the drill was built to train. */
  targetWords: string[];
}

export const WORD_WEAKNESS_KEY = 'typezen_word_weakness';
/** Hard cap on tracked words; eviction removes the healthiest entries. */
export const WORD_WEAKNESS_CAP = 400;
/** Words shorter than this are noise ("the", "and") — never tracked. */
export const MIN_WORD_LENGTH = 3;
/** A tracked word needs at least this many observations before it can rank. */
export const MIN_OBSERVATIONS = 4;
/** Leitner intervals in days, indexed by box. Box 0 reviews same-day. */
export const BOX_INTERVAL_DAYS: readonly number[] = [0, 1, 3, 7, 14, 30];
export const MAX_BOX = BOX_INTERVAL_DAYS.length - 1;

/** The exact shape a persisted key must have (the normalizer's own output). */
const WORD_KEY_RE = /^[a-z0-9]+(?:['\u2019-][a-z0-9]+)*$/;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Normalize one whitespace-delimited token into a storable word key.
 * Lowercases, strips leading/trailing punctuation ("world!" → "world",
 * '"hello"' → "hello"), keeps internal apostrophes/hyphens ("don't",
 * "well-known"). Returns null for anything not worth tracking: too short,
 * symbol-only, or containing characters a drill could not fairly rehearse.
 */
export function normalizeWord(raw: string): string | null {
  if (!raw) return null;
  let w = raw.trim().toLowerCase();
  w = w.replace(/^[^a-z0-9'\u2019]+/, '').replace(/[^a-z0-9'\u2019-]+$/, '');
  w = w.replace(/\s+/g, ' ');
  if (w.length < MIN_WORD_LENGTH) return null;
  if (!WORD_KEY_RE.test(w)) return null;
  return w;
}

export interface WordSpan {
  word: string;
  /** Inclusive start offset in the target text. */
  start: number;
  /** Exclusive end offset. */
  end: number;
}

/**
 * Map every char offset of `text` onto its normalized word. Offsets inside a
 * token's edge punctuation still belong to that token, so a mistyped "!" in
 * "world!" is charged to "world" — close enough for drill targeting, and the
 * per-KEY heatmap remains the precise lens for punctuation itself.
 */
export function wordSpans(text: string): WordSpan[] {
  const spans: WordSpan[] = [];
  const re = /\S+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const word = normalizeWord(m[0]);
    if (word) spans.push({ word, start: m.index, end: m.index + m[0].length });
  }
  return spans;
}

/**
 * Attribute every keystroke of one completed run to its word. See the module
 * comment for why the pointer walk is exact. `totalMs` accumulates the delay
 * since the previous non-backspace keystroke (the first keystroke of the run
 * contributes 0), mirroring how the key heatmap accumulates latency.
 */
export function aggregateWords(targetText: string, log: Keystroke[]): RunWordAggregate[] {
  if (!targetText || log.length === 0) return [];
  const spans = wordSpans(targetText);
  if (spans.length === 0) return [];

  const acc = new Map<string, RunWordAggregate>();
  let p = 0; // pointer into targetText; invariant: p === input.length
  let prevTime = 0;

  for (const k of log) {
    if (k.isBackspace) {
      p = Math.max(0, p - 1);
      continue;
    }
    if (p < targetText.length) {
      const span = spans.find(s => p >= s.start && p < s.end);
      if (span) {
        const entry = acc.get(span.word);
        const delay = prevTime > 0 ? Math.max(0, k.time - prevTime) : 0;
        if (entry) {
          entry.total += 1;
          entry.errors += k.isError ? 1 : 0;
          entry.totalMs += delay;
        } else {
          acc.set(span.word, { word: span.word, total: 1, errors: k.isError ? 1 : 0, totalMs: delay });
        }
      }
    }
    p += 1;
    prevTime = k.time;
  }

  return [...acc.values()];
}

/**
 * Fold one run's aggregates into the lifetime map. Tracked words accumulate
 * totals unconditionally. An untracked word enters tracking only on its first
 * observed error (box 0, due today) — healthy words would bloat the store
 * toward the cap while carrying no review value. Returns a NEW map; callers
 * feed it straight into React state.
 */
export function recordRun(
  map: WordWeaknessMap,
  aggregates: RunWordAggregate[],
  today: string,
): WordWeaknessMap {
  if (aggregates.length === 0) return map;
  const next: WordWeaknessMap = { ...map };
  for (const a of aggregates) {
    const existing = next[a.word];
    if (existing) {
      next[a.word] = {
        ...existing,
        total: existing.total + a.total,
        errors: existing.errors + a.errors,
        totalMs: existing.totalMs + a.totalMs,
        lastSeen: today,
      };
    } else if (a.errors > 0) {
      next[a.word] = { total: a.total, errors: a.errors, totalMs: a.totalMs, box: 0, due: today, lastSeen: today };
    }
  }
  return evictIfNeeded(next);
}

/**
 * Leitner step for a finished drill's target words. Scheduling ONLY: the same
 * keystrokes were already folded into totals/errors by `recordRun`, so this
 * adjusts box/due (and fills a missing entry defensively) but never touches
 * counts — doing both would double-count every drill keystroke.
 */
export function gradeDrillRun(
  map: WordWeaknessMap,
  drillWords: string[],
  errorPerWord: Record<string, boolean>,
  today: string,
): WordWeaknessMap {
  if (drillWords.length === 0) return map;
  const next: WordWeaknessMap = { ...map };
  for (const raw of drillWords) {
    const key = normalizeWord(raw);
    if (!key) continue;
    const existing = next[key];
    const errored = errorPerWord[key] === true;
    if (!existing) {
      next[key] = {
        total: 1,
        errors: errored ? 1 : 0,
        totalMs: 0,
        box: errored ? 0 : 1,
        due: errored ? today : addDays(today, BOX_INTERVAL_DAYS[1]),
        lastSeen: today,
      };
      continue;
    }
    if (errored) {
      next[key] = {
        ...existing,
        box: 0,
        due: today,
        lastSeen: today,
      };
    } else {
      const box = Math.min(existing.box + 1, MAX_BOX);
      next[key] = {
        ...existing,
        box,
        due: addDays(today, BOX_INTERVAL_DAYS[box]),
        lastSeen: today,
      };
    }
  }
  return evictIfNeeded(next);
}

/**
 * Cloud-sync merge. Per word pick the entry with the greater `total` — the
 * exact convention `mergeProgress` applies to the key heatmap. Totals must
 * never be summed: a device pair that each ran the same drill would
 * double-count every keystroke. Equal totals break the tie by earlier `due`
 * (the stricter schedule wins).
 */
export function mergeWordWeakness(a: WordWeaknessMap, b: WordWeaknessMap): WordWeaknessMap {
  const out: WordWeaknessMap = {};
  for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const ea = a[key];
    const eb = b[key];
    if (!ea) out[key] = eb!;
    else if (!eb) out[key] = ea;
    else if (ea.total !== eb.total) out[key] = ea.total > eb.total ? ea : eb;
    else out[key] = ea.due <= eb.due ? ea : eb;
  }
  return out;
}

/** Words whose review date has arrived, weakest box first. */
export function dueWords(map: WordWeaknessMap, today: string): string[] {
  return Object.entries(map)
    .filter(([, s]) => s.due <= today)
    .sort((x, y) => x[1].box - y[1].box || y[1].errors - x[1].errors)
    .map(([w]) => w);
}

/**
 * The n worst tracked words by error rate, gated on `MIN_OBSERVATIONS` so one
 * unlucky keystroke can never headline the list (same philosophy as the key
 * heatmap's `total > 5` guard).
 */
export function weakestWords(map: WordWeaknessMap, n: number): string[] {
  return Object.entries(map)
    .filter(([, s]) => s.total >= MIN_OBSERVATIONS)
    .map(([w, s]) => ({ w, rate: s.errors / Math.max(1, s.total), total: s.total }))
    .filter(x => x.rate > 0)
    .sort((a, b) => b.rate - a.rate || b.total - a.total)
    .slice(0, Math.max(0, n))
    .map(x => x.w);
}

/**
 * Enforce the store cap by evicting the healthiest words (lowest error rate,
 * then oldest lastSeen). The weakest `WORD_WEAKNESS_CAP` entries survive.
 */
export function evictIfNeeded(map: WordWeaknessMap): WordWeaknessMap {
  const keys = Object.keys(map);
  if (keys.length <= WORD_WEAKNESS_CAP) return map;
  const ranked = keys.slice().sort((x, y) => {
    const sx = map[x];
    const sy = map[y];
    const rx = sx.errors / Math.max(1, sx.total);
    const ry = sy.errors / Math.max(1, sy.total);
    if (rx !== ry) return rx - ry;
    if (sx.lastSeen !== sy.lastSeen) return sx.lastSeen < sy.lastSeen ? -1 : 1;
    return 0;
  });
  const next: WordWeaknessMap = {};
  for (const k of ranked.slice(-WORD_WEAKNESS_CAP)) next[k] = map[k];
  return next;
}

/**
 * Validation boundary for anything read from localStorage or merged from the
 * cloud row. Drops malformed entries field-by-field rather than trusting the
 * shape — the map feeds ranking logic and a NaN rate would poison every sort.
 */
export function normalizeWordWeakness(raw: unknown): WordWeaknessMap {
  if (!raw || typeof raw !== 'object') return {};
  const out: WordWeaknessMap = {};
  for (const [key, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!WORD_KEY_RE.test(key)) continue;
    const s = v as Partial<WordStat> | null | undefined;
    if (!s || typeof s !== 'object') continue;
    const total = Number(s.total);
    const errors = Number(s.errors);
    const totalMs = Number(s.totalMs);
    const box = Number(s.box);
    if (!Number.isFinite(total) || total < 0) continue;
    if (!Number.isFinite(errors) || errors < 0 || errors > total) continue;
    if (!Number.isFinite(totalMs) || totalMs < 0) continue;
    if (!Number.isInteger(box) || box < 0 || box > MAX_BOX) continue;
    if (typeof s.due !== 'string' || !ISO_DATE_RE.test(s.due)) continue;
    if (typeof s.lastSeen !== 'string' || !ISO_DATE_RE.test(s.lastSeen)) continue;
    out[key] = { total, errors, totalMs, box, due: s.due, lastSeen: s.lastSeen };
  }
  return out;
}

/** ISO-date arithmetic with no dependency. */
export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, (m || 1) - 1, d || 1));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}