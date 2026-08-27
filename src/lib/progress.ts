import { HISTORY_KEY, HISTORY_CAP, type HistoryEntry } from '@/lib/history';
import { PB_PREFIX } from '@/lib/personalBests';
import { getConsentRecord, type ConsentRecord } from '@/lib/consent';
import {
  readAcademyProgress, writeAcademyProgress,
  mergeAcademyRecords, pickAcademyStreak,
  normalizeRecords, normalizeStreak,
  type LessonRecord, type DayStreak,
} from '@/lib/academyStorage';

const K = {
  xp: 'typezen_xp',
  tests: 'typezen_tests',
  achievements: 'typezen_achievements',
  heatmap: 'typezen_heatmap',
  daily: 'typezen_daily',
  quests: 'typezen_quests',
  bestCombo: 'typezen_best_combo',
  racesWon: 'typezen_races_won',
};

export interface DailyState { lastDay: string; streak: number; }
export interface HeatKey { total: number; errors: number; }
export interface PbEntry { wpm: number; samples: Array<{ t: number; chars: number }>; }

export interface Quest {
  id: string;
  type: 'races_won' | 'words_typed' | 'wpm_achieved' | 'acc_achieved';
  target: number;
  progress: number;
  completed: boolean;
  xpReward: number;
}

export interface QuestsState {
  lastReset: string; // YYYY-MM-DD
  active: Quest[];
}

export interface ProgressSnapshot {
  xp: number;
  tests: number;
  achievements: string[];
  heatmap: Record<string, HeatKey>;
  daily: DailyState | null;
  quests: QuestsState | null;
  history: HistoryEntry[];
  /** keyed by the suffix after `typezen_pb:` (e.g. "NOVICE:w25") */
  pbs: Record<string, PbEntry>;
  /**
   * Lifetime best combo. Part of the snapshot because it gates cosmetics and an
   * achievement: while it was device-local, signing in elsewhere silently
   * relocked the combo banners.
   */
  bestCombo: number;
  /**
   * Lifetime multiplayer wins. Nothing counted these before, so the
   * "Race Champion" title and the `races_won` daily quests could never be
   * completed no matter how many duels you took.
   */
  racesWon: number;
  /**
   * RPG Academy progress, keyed by lesson node id. Kept in the snapshot because
   * it is player progress like any other: while it was missing, signing in on a
   * second device showed an Academy reset to zero stars, and the first lesson
   * cleared there overwrote the cloud row for the original device too.
   */
  academyRecords: Record<string, LessonRecord>;
  /** Lifetime Academy XP. The Academy level is derived from this. */
  academyXp: number;
  /** Academy daily-practice streak. */
  academyStreak: DayStreak;
  /** DPDP/GDPR Statutory Consent Audit Record */
  consent?: ConsentRecord | null;
}

function safeParse<T>(raw: string | null, fallback: T): T {
  if (raw == null) return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}

export function readLocalProgress(): ProgressSnapshot {
  const academy = readAcademyProgress();
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
    quests: safeParse<QuestsState | null>(localStorage.getItem(K.quests), null),
    history: safeParse<HistoryEntry[]>(localStorage.getItem(HISTORY_KEY), []),
    pbs,
    bestCombo: parseInt(localStorage.getItem(K.bestCombo) || '0', 10) || 0,
    racesWon: parseInt(localStorage.getItem(K.racesWon) || '0', 10) || 0,
    academyRecords: academy.records,
    academyXp: academy.xp,
    academyStreak: academy.streak,
    consent: getConsentRecord(),
  };
}

export function writeLocalProgress(s: ProgressSnapshot): void {
  try {
    localStorage.setItem(K.xp, String(s.xp));
    localStorage.setItem(K.tests, String(s.tests));
    localStorage.setItem(K.achievements, JSON.stringify(s.achievements));
    localStorage.setItem(K.heatmap, JSON.stringify(s.heatmap));
    if (s.daily) localStorage.setItem(K.daily, JSON.stringify(s.daily));
    if (s.quests) localStorage.setItem(K.quests, JSON.stringify(s.quests));
    localStorage.setItem(HISTORY_KEY, JSON.stringify(s.history.slice(-HISTORY_CAP)));
    localStorage.setItem(K.bestCombo, String(s.bestCombo));
    localStorage.setItem(K.racesWon, String(s.racesWon));
    for (const [key, pb] of Object.entries(s.pbs)) {
      localStorage.setItem(PB_PREFIX + key, JSON.stringify(pb));
    }
    // Owned by `useAcademyEngine`, which re-reads these on PROGRESS_HYDRATED.
    writeAcademyProgress({
      records: s.academyRecords,
      xp: s.academyXp,
      streak: s.academyStreak,
    });
    if (s.consent && !getConsentRecord()) {
      localStorage.setItem('typenova_terms_accepted', s.consent.accepted ? 'true' : 'false');
      localStorage.setItem('typenova_consent_timestamp', s.consent.timestamp);
      localStorage.setItem('typenova_consent_version', s.consent.version);
      localStorage.setItem('typenova_consent_record', JSON.stringify(s.consent));
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
    quests: p?.quests ?? null,
    history: Array.isArray(p?.history) ? p!.history : [],
    pbs: (p?.pbs && typeof p.pbs === 'object') ? p.pbs : {},
    bestCombo: Number(p?.bestCombo) || 0,
    racesWon: Number(p?.racesWon) || 0,
    academyRecords: normalizeRecords(p?.academyRecords),
    academyXp: Number(p?.academyXp) || 0,
    academyStreak: normalizeStreak(p?.academyStreak),
    consent: p?.consent ?? null,
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

function pickQuests(a: QuestsState | null, b: QuestsState | null): QuestsState | null {
  if (!a) return b;
  if (!b) return a;
  // Different reset days: the newer day's quests replace the older completely
  if (a.lastReset > b.lastReset) return a;
  if (b.lastReset > a.lastReset) return b;
  // Same reset day — deep merge individual quest progress so neither device
  // loses its specific quest updates.
  const merged = new Map<string, Quest>();
  for (const q of a.active) merged.set(q.id, q);
  for (const q of b.active) {
    const existing = merged.get(q.id);
    if (!existing || q.progress > existing.progress) {
      merged.set(q.id, q);
    }
  }
  return { lastReset: a.lastReset, active: Array.from(merged.values()) };
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
    quests: pickQuests(A.quests, B.quests),
    history,
    pbs,
    bestCombo: Math.max(A.bestCombo, B.bestCombo),
    racesWon: Math.max(A.racesWon, B.racesWon),
    academyRecords: mergeAcademyRecords(A.academyRecords, B.academyRecords),
    academyXp: Math.max(A.academyXp, B.academyXp),
    academyStreak: pickAcademyStreak(A.academyStreak, B.academyStreak),
    consent: A.consent || B.consent || null,
  };
}
