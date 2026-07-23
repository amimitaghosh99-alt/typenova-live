// Single serialization boundary for all local progress. Every `typezen_*`
// key the app persists is gathered here into one snapshot, merged with a
// cloud snapshot on login, and written back. The merge is a "best-of" that
// is IDEMPOTENT (re-merging the same data yields the same result) and
// MONOTONIC (values only grow) — safe to run on every login and push.
import { HISTORY_KEY, HISTORY_CAP } from '@/components/StatsDashboard';
import type { HistoryEntry } from '@/components/StatsDashboard';

const K = {
  xp: 'typezen_xp',
  tests: 'typezen_tests',
  achievements: 'typezen_achievements',
  heatmap: 'typezen_heatmap',
  daily: 'typezen_daily',
};
const PB_PREFIX = 'typezen_pb:';

export interface DailyState { lastDay: string; streak: number; }
export interface HeatKey { total: number; errors: number; }
export interface PbEntry { wpm: number; samples: Array<{ t: number; chars: number }>; }

export interface ProgressSnapshot {
  xp: number;
  tests: number;
  achievements: string[];
  heatmap: Record<string, HeatKey>;
  daily: DailyState | null;
  history: HistoryEntry[];
  /** keyed by the suffix after `typezen_pb:` (e.g. "NOVICE:w25") */
  pbs: Record<string, PbEntry>;
}

function safeParse<T>(raw: string | null, fallback: T): T {
  if (raw == null) return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}

export function readLocalProgress(): ProgressSnapshot {
  const pbs: Record<string, PbEntry> = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(PB_PREFIX)) continue;
      const pb = safeParse<PbEntry | null>(localStorage.getItem(key), null);
      if (pb?.wpm) pbs[key.slice(PB_PREFIX.length)] = pb;
    }
  } catch { /* storage disabled — non-fatal */ }

  return {
    xp: parseInt(localStorage.getItem(K.xp) || '0', 10) || 0,
    tests: parseInt(localStorage.getItem(K.tests) || '0', 10) || 0,
    achievements: safeParse<string[]>(localStorage.getItem(K.achievements), []),
    heatmap: safeParse<Record<string, HeatKey>>(localStorage.getItem(K.heatmap), {}),
    daily: safeParse<DailyState | null>(localStorage.getItem(K.daily), null),
    history: safeParse<HistoryEntry[]>(localStorage.getItem(HISTORY_KEY), []),
    pbs,
  };
}

export function writeLocalProgress(s: ProgressSnapshot): void {
  try {
    localStorage.setItem(K.xp, String(s.xp));
    localStorage.setItem(K.tests, String(s.tests));
    localStorage.setItem(K.achievements, JSON.stringify(s.achievements));
    localStorage.setItem(K.heatmap, JSON.stringify(s.heatmap));
    if (s.daily) localStorage.setItem(K.daily, JSON.stringify(s.daily));
    localStorage.setItem(HISTORY_KEY, JSON.stringify(s.history.slice(-HISTORY_CAP)));
    for (const [key, pb] of Object.entries(s.pbs)) {
      localStorage.setItem(PB_PREFIX + key, JSON.stringify(pb));
    }
  } catch { /* quota / disabled — non-fatal */ }
}

function normalize(p: Partial<ProgressSnapshot> | null | undefined): ProgressSnapshot {
  return {
    xp: Number(p?.xp) || 0,
    tests: Number(p?.tests) || 0,
    achievements: Array.isArray(p?.achievements) ? p!.achievements : [],
    heatmap: (p?.heatmap && typeof p.heatmap === 'object') ? p.heatmap : {},
    daily: p?.daily ?? null,
    history: Array.isArray(p?.history) ? p!.history : [],
    pbs: (p?.pbs && typeof p.pbs === 'object') ? p.pbs : {},
  };
}

function pickDaily(a: DailyState | null, b: DailyState | null): DailyState | null {
  if (!a) return b;
  if (!b) return a;
  // lastDay is "YYYY-MM-DD" — lexical compare matches chronological order
  if (a.lastDay > b.lastDay) return a;
  if (b.lastDay > a.lastDay) return b;
  return a.streak >= b.streak ? a : b;
}

export function mergeProgress(
  a: Partial<ProgressSnapshot> | null | undefined,
  b: Partial<ProgressSnapshot> | null | undefined,
): ProgressSnapshot {
  const A = normalize(a);
  const B = normalize(b);

  const heatmap: Record<string, HeatKey> = {};
  for (const key of new Set([...Object.keys(A.heatmap), ...Object.keys(B.heatmap)])) {
    const ea = A.heatmap[key];
    const eb = B.heatmap[key];
    if (!ea) heatmap[key] = eb;
    else if (!eb) heatmap[key] = ea;
    // heatmap totals only grow — keep the record with more observed hits
    else heatmap[key] = ea.total >= eb.total ? ea : eb;
  }

  const pbs: Record<string, PbEntry> = {};
  for (const key of new Set([...Object.keys(A.pbs), ...Object.keys(B.pbs)])) {
    const pa = A.pbs[key];
    const pb = B.pbs[key];
    if (!pa) pbs[key] = pb;
    else if (!pb) pbs[key] = pa;
    else pbs[key] = pa.wpm >= pb.wpm ? pa : pb;
  }

  const seen = new Set<string>();
  const history = [...A.history, ...B.history]
    .filter(h => h && h.d && !seen.has(h.d) && seen.add(h.d))
    .sort((x, y) => (x.d < y.d ? -1 : x.d > y.d ? 1 : 0))
    .slice(-HISTORY_CAP);

  return {
    xp: Math.max(A.xp, B.xp),
    tests: Math.max(A.tests, B.tests),
    achievements: Array.from(new Set([...A.achievements, ...B.achievements])),
    heatmap,
    daily: pickDaily(A.daily, B.daily),
    history,
    pbs,
  };
}
