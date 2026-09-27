import { HISTORY_KEY, HISTORY_CAP, type HistoryEntry } from '@/lib/history';
import { PB_PREFIX } from '@/lib/personalBests';
import { getConsentRecord, type ConsentRecord } from '@/lib/consent';
import {
  readAcademyProgress, writeAcademyProgress,
  mergeAcademyRecords, pickAcademyStreak,
  normalizeRecords, normalizeStreak,
  type LessonRecord, type DayStreak,
} from '@/lib/academyStorage';
import { normalizeWordWeakness, mergeWordWeakness, type WordWeaknessMap } from '@/lib/wordWeakness';

const K = {
  xp: 'typezen_xp',
  tests: 'typezen_tests',
  achievements: 'typezen_achievements',
  heatmap: 'typezen_heatmap',
  daily: 'typezen_daily',
  quests: 'typezen_quests',
  bestCombo: 'typezen_best_combo',
  racesWon: 'typezen_races_won',
  wordWeakness: 'typezen_word_weakness',
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
  /**
   * Word-level weakness map + Leitner review schedule (`lib/wordWeakness.ts`).
   * Kept in the snapshot for the same reason academyRecords is: while it was
   * device-local, signing in on a second device started every review streak
   * from zero and the first cloud write clobbered the original device's map.
   */
  wordWeakness: WordWeaknessMap;
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

  const getSafe = (k: string) => {
    try {
      return typeof localStorage !== 'undefined' ? localStorage.getItem(k) : null;
    } catch {
      return null;
    }
  };

  return {
    xp: parseInt(getSafe(K.xp) || '0', 10) || 0,
    tests: parseInt(getSafe(K.tests) || '0', 10) || 0,
    achievements: safeParse<string[]>(getSafe(K.achievements), []),
    heatmap: safeParse<Record<string, HeatKey>>(getSafe(K.heatmap), {}),
    daily: safeParse<DailyState | null>(getSafe(K.daily), null),
    quests: safeParse<QuestsState | null>(getSafe(K.quests), null),
    history: safeParse<HistoryEntry[]>(getSafe(HISTORY_KEY), []),
    pbs,
    bestCombo: parseInt(getSafe(K.bestCombo) || '0', 10) || 0,
    racesWon: parseInt(getSafe(K.racesWon) || '0', 10) || 0,
    academyRecords: academy.records,
    academyXp: academy.xp,
    academyStreak: academy.streak,
    wordWeakness: normalizeWordWeakness(safeParse<unknown>(getSafe(K.wordWeakness), null)),
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
    localStorage.setItem(K.wordWeakness, JSON.stringify(s.wordWeakness));
    if (s.consent && !getConsentRecord()) {
      localStorage.setItem('typenova_terms_accepted', s.consent.accepted ? 'true' : 'false');
      localStorage.setItem('typenova_consent_timestamp', s.consent.timestamp);
      localStorage.setItem('typenova_consent_version', s.consent.version);
      localStorage.setItem('typenova_consent_record', JSON.stringify(s.consent));
    }
  } catch { /* quota / disabled — non-fatal */ }
}

/** Purge all user-specific progress and session keys on logout to prevent cross-account profile contamination. */
export function clearLocalProgress(): void {
  if (typeof window === 'undefined') return;
  try {
    Object.values(K).forEach(key => localStorage.removeItem(key));
    localStorage.removeItem(HISTORY_KEY);
    const pbKeys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(PB_PREFIX)) pbKeys.push(key);
    }
    pbKeys.forEach(k => localStorage.removeItem(k));
    localStorage.removeItem('typezen_academy_records');
    localStorage.removeItem('typezen_academy_xp');
    localStorage.removeItem('typezen_academy_streak');
    localStorage.removeItem('typenova_active_title');
    localStorage.removeItem('guestMode');
    localStorage.removeItem('typenova_guest_mode');
    localStorage.removeItem('typenova_pending_guest_score');
  } catch { /* storage disabled or quota — non-fatal */ }
}

function normalizeDaily(raw: unknown): DailyState | null {
  if (!raw || typeof raw !== 'object') return null;
  const d = raw as Record<string, any>;
  if (typeof d.lastDay !== 'string') return null;
  return {
    lastDay: d.lastDay,
    streak: Number.isFinite(Number(d.streak)) ? Math.max(0, Math.floor(Number(d.streak))) : 0,
  };
}

export function normalizeQuests(raw: unknown): QuestsState | null {
  if (!raw || typeof raw !== 'object') return null;
  const q = raw as Record<string, any>;
  if (typeof q.lastReset !== 'string' || !Array.isArray(q.active)) return null;
  const validActive: Quest[] = [];
  for (const item of q.active) {
    if (
      item &&
      typeof item === 'object' &&
      typeof item.id === 'string' &&
      typeof item.type === 'string' &&
      Number.isFinite(Number(item.target)) &&
      Number(item.target) > 0 &&
      Number.isFinite(Number(item.progress)) &&
      typeof item.completed === 'boolean' &&
      Number.isFinite(Number(item.xpReward))
    ) {
      validActive.push({
        id: item.id,
        type: item.type,
        target: Number(item.target),
        progress: Math.max(0, Number(item.progress)),
        completed: Boolean(item.completed),
        xpReward: Math.max(0, Number(item.xpReward)),
      });
    }
  }
  return {
    lastReset: q.lastReset,
    active: validActive,
  };
}

function normalize(p: Partial<ProgressSnapshot> | null | undefined): ProgressSnapshot {
  return {
    xp: Number(p?.xp) || 0,
    tests: Number(p?.tests) || 0,
    achievements: Array.isArray(p?.achievements) ? p!.achievements : [],
    heatmap: (p?.heatmap && typeof p.heatmap === 'object') ? p.heatmap : {},
    daily: normalizeDaily(p?.daily),
    quests: normalizeQuests(p?.quests),
    history: Array.isArray(p?.history) ? p!.history : [],
    pbs: (p?.pbs && typeof p.pbs === 'object') ? p.pbs : {},
    bestCombo: Number(p?.bestCombo) || 0,
    racesWon: Number(p?.racesWon) || 0,
    academyRecords: normalizeRecords(p?.academyRecords),
    academyXp: Number(p?.academyXp) || 0,
    academyStreak: normalizeStreak(p?.academyStreak),
    wordWeakness: normalizeWordWeakness(p?.wordWeakness),
    consent: p?.consent ?? null,
  };
}

function pickDaily(a: DailyState | null, b: DailyState | null): DailyState | null {
  const normA = normalizeDaily(a);
  const normB = normalizeDaily(b);
  if (!normA) return normB;
  if (!normB) return normA;
  // lastDay is "YYYY-MM-DD" — lexical compare matches chronological order
  if (normA.lastDay > normB.lastDay) return normA;
  if (normB.lastDay > normA.lastDay) return normB;
  return normA.streak >= normB.streak ? normA : normB;
}

function pickQuests(a: QuestsState | null, b: QuestsState | null): QuestsState | null {
  const normA = normalizeQuests(a);
  const normB = normalizeQuests(b);
  if (!normA) return normB;
  if (!normB) return normA;
  // Different reset days: the newer day's quests replace the older completely
  if (normA.lastReset > normB.lastReset) return normA;
  if (normB.lastReset > normA.lastReset) return normB;
  // Same reset day — deep merge individual quest progress so neither device
  // loses its specific quest updates.
  const merged = new Map<string, Quest>();
  for (const q of normA.active) merged.set(q.id, q);
  for (const q of normB.active) {
    const existing = merged.get(q.id);
    if (!existing || q.progress > existing.progress) {
      merged.set(q.id, q);
    }
  }
  return { lastReset: normA.lastReset, active: Array.from(merged.values()) };
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
    wordWeakness: mergeWordWeakness(A.wordWeakness, B.wordWeakness),
    consent: A.consent || B.consent || null,
  };
}
