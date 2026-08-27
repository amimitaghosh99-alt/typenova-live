/**
 * Storage layer for RPG Academy progress.
 *
 * The keys, shapes, and merge rules live here — not inside `useAcademyEngine` —
 * because two modules need them: the engine, which owns this data at runtime,
 * and `src/lib/progress.ts`, which folds it into the snapshot that goes to
 * Supabase. While the keys were private to the engine, the sync layer could not
 * see them: `ProgressSnapshot` carried xp/tests/achievements/pbs but no Academy
 * data, so every star, unlocked node, and lesson record was left behind on a
 * device switch.
 */

export const ACADEMY_KEYS = {
    records: 'typenova_academy_records',
    xp: 'typenova_academy_xp',
    streak: 'typenova_academy_streak',
    /** Pre-records star map. Read once to migrate, never written again. */
    legacyStars: 'typenova_academy_node_stars',
} as const;

/** Per-lesson personal best, kept for every node the player has attempted. */
export interface LessonRecord {
    stars: number;
    bestWpm: number;
    bestAccuracy: number;
    attempts: number;
    clears: number;
    /** ISO date (YYYY-MM-DD) of the last attempt. */
    lastPlayed: string;
}

export interface DayStreak {
    current: number;
    best: number;
    lastDate: string;
}

export const EMPTY_STREAK: DayStreak = { current: 0, best: 0, lastDate: '' };

/** Everything the Academy persists, as one value the sync layer can carry. */
export interface AcademyProgress {
    records: Record<string, LessonRecord>;
    xp: number;
    streak: DayStreak;
}

const MAX_STARS = 3;

function readJson<T>(key: string, fallback: T): T {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return fallback;
        const parsed = JSON.parse(raw);
        return (parsed && typeof parsed === 'object') ? (parsed as T) : fallback;
    } catch {
        return fallback;
    }
}

function writeJson(key: string, value: unknown): void {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch {
        /* quota / storage disabled — progress stays in memory for this session */
    }
}

const whole = (n: unknown): number => {
    const v = Math.round(Number(n));
    return Number.isFinite(v) && v > 0 ? v : 0;
};

const isoDay = (v: unknown): string =>
    typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : '';

function todayKey(d = new Date()): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Coerce one record from an untrusted source. Cloud rows are whatever an older
 * (or newer) build of the app wrote, so nothing here may be assumed present.
 */
export function normalizeRecord(r: Partial<LessonRecord> | null | undefined): LessonRecord {
    return {
        stars: Math.min(MAX_STARS, whole(r?.stars)),
        bestWpm: whole(r?.bestWpm),
        bestAccuracy: Math.min(100, whole(r?.bestAccuracy)),
        attempts: whole(r?.attempts),
        clears: whole(r?.clears),
        lastPlayed: isoDay(r?.lastPlayed),
    };
}

export function normalizeRecords(raw: unknown): Record<string, LessonRecord> {
    if (!raw || typeof raw !== 'object') return {};
    const out: Record<string, LessonRecord> = {};
    for (const [id, value] of Object.entries(raw as Record<string, unknown>)) {
        if (!id || !value || typeof value !== 'object') continue;
        out[id] = normalizeRecord(value as Partial<LessonRecord>);
    }
    return out;
}

export function normalizeStreak(raw: unknown): DayStreak {
    if (!raw || typeof raw !== 'object') return { ...EMPTY_STREAK };
    const s = raw as Partial<DayStreak>;
    const current = whole(s.current);
    return {
        current,
        best: Math.max(current, whole(s.best)),
        lastDate: isoDay(s.lastDate),
    };
}

/**
 * Records as stored, migrating the pre-records star map on first read so
 * existing progress is never lost.
 */
export function readAcademyRecords(): Record<string, LessonRecord> {
    const records = normalizeRecords(readJson<unknown>(ACADEMY_KEYS.records, null));
    if (Object.keys(records).length > 0) return records;

    const legacy = readJson<Record<string, number>>(ACADEMY_KEYS.legacyStars, {});
    const migrated: Record<string, LessonRecord> = {};
    for (const [id, stars] of Object.entries(legacy)) {
        if (typeof stars !== 'number' || stars <= 0) continue;
        migrated[id] = {
            stars: Math.min(MAX_STARS, whole(stars)),
            bestWpm: 0,
            bestAccuracy: 0,
            attempts: 1,
            clears: 1,
            lastPlayed: todayKey(),
        };
    }
    if (Object.keys(migrated).length) writeJson(ACADEMY_KEYS.records, migrated);
    return migrated;
}

export function readAcademyXp(): number {
    try {
        return whole(parseInt(localStorage.getItem(ACADEMY_KEYS.xp) || '0', 10));
    } catch {
        return 0;
    }
}

export function readAcademyStreak(): DayStreak {
    return normalizeStreak(readJson<unknown>(ACADEMY_KEYS.streak, null));
}

export function readAcademyProgress(): AcademyProgress {
    return {
        records: readAcademyRecords(),
        xp: readAcademyXp(),
        streak: readAcademyStreak(),
    };
}

/** Write the fields that are present. Used when a cloud merge lands. */
export function writeAcademyProgress(p: Partial<AcademyProgress>): void {
    if (p.records && Object.keys(p.records).length > 0) {
        writeJson(ACADEMY_KEYS.records, p.records);
    }
    if (typeof p.xp === 'number' && p.xp > 0) {
        try { localStorage.setItem(ACADEMY_KEYS.xp, String(whole(p.xp))); } catch { /* non-fatal */ }
    }
    if (p.streak && p.streak.lastDate) {
        writeJson(ACADEMY_KEYS.streak, p.streak);
    }
}

/**
 * Best-of merge, per lesson.
 *
 * Every field takes a maximum rather than a sum: `mergeProgress` runs on every
 * login against a cloud row that already contains a previous merge of this
 * device, so summing `attempts`/`clears` would inflate them a little more each
 * time a player signs in.
 */
export function mergeAcademyRecords(
    a: Record<string, LessonRecord>,
    b: Record<string, LessonRecord>,
): Record<string, LessonRecord> {
    const out: Record<string, LessonRecord> = {};
    for (const id of new Set([...Object.keys(a), ...Object.keys(b)])) {
        const ra = a[id];
        const rb = b[id];
        if (!ra) { out[id] = rb; continue; }
        if (!rb) { out[id] = ra; continue; }
        out[id] = {
            stars: Math.max(ra.stars, rb.stars),
            bestWpm: Math.max(ra.bestWpm, rb.bestWpm),
            bestAccuracy: Math.max(ra.bestAccuracy, rb.bestAccuracy),
            attempts: Math.max(ra.attempts, rb.attempts),
            clears: Math.max(ra.clears, rb.clears),
            // Both are "YYYY-MM-DD" or "", so a lexical compare is chronological.
            lastPlayed: ra.lastPlayed > rb.lastPlayed ? ra.lastPlayed : rb.lastPlayed,
        };
    }
    return out;
}

/**
 * The more recent `lastDate` owns `current` — a streak is only meaningful
 * relative to the day it was last extended — while `best` is a lifetime high
 * and always takes the larger value.
 */
export function pickAcademyStreak(a: DayStreak, b: DayStreak): DayStreak {
    const best = Math.max(a.best, b.best, a.current, b.current);
    if (a.lastDate === b.lastDate) {
        return { current: Math.max(a.current, b.current), best, lastDate: a.lastDate };
    }
    const newer = a.lastDate > b.lastDate ? a : b;
    return { current: newer.current, best, lastDate: newer.lastDate };
}
