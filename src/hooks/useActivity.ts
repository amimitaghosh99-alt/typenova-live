// ═══════════════════════════════════════════════════════════════════════
//  useActivity — the practice calendar's data, bucketed by day
//  ---------------------------------------------------------------------
//  `lib/history` has always stored an ISO date on every completed test, and
//  nothing has ever read it. The dossier's form curve plots the last N results
//  by *index*, so a fortnight of daily practice and a fortnight off followed by
//  one long session draw the same line. That is the one question a profile page
//  should answer at a glance — do they actually turn up — and it was the one
//  piece of data already on disk and never used.
//
//  Lives beside the component that draws it rather than inside it because the
//  section heading states the streak and the active-day count, and deriving
//  those twice from the same log is how two numbers describing one fact drift
//  apart.
// ═══════════════════════════════════════════════════════════════════════

import { useMemo } from 'react';
import type { HistoryEntry } from '@/lib/history';

/** Local calendar key. Deliberately not `toISOString()`, which would shift a
 *  late-evening session in a negative-offset timezone onto the next day. */
function dayKey(date: Date): string {
    const m = `${date.getMonth() + 1}`.padStart(2, '0');
    const d = `${date.getDate()}`.padStart(2, '0');
    return `${date.getFullYear()}-${m}-${d}`;
}

/**
 * Tests-per-day to one of five steps.
 *
 * Fixed thresholds rather than quantiles against the player's own maximum: a
 * single 40-test day would otherwise push every ordinary session to the palest
 * step and make a consistent habit look like inactivity.
 */
function intensity(count: number): 0 | 1 | 2 | 3 | 4 {
    if (count <= 0) return 0;
    if (count === 1) return 1;
    if (count <= 3) return 2;
    if (count <= 6) return 3;
    return 4;
}

const MONTH = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export interface ActivitySummary {
    /** Consecutive days ending today or yesterday. */
    streak: number;
    longest: number;
    activeDays: number;
    windowDays: number;
}

export interface ActivityCell {
    key: string;
    date: Date;
    count: number;
    avgWpm: number;
    level: 0 | 1 | 2 | 3 | 4;
    /** Month label printed above this column, when the month changes here. */
    monthLabel: string | null;
}

export interface Activity {
    cells: ActivityCell[];
    summary: ActivitySummary;
}

export function useActivity(history: HistoryEntry[], weeks: number): Activity {
    return useMemo(() => {
        const byDay = new Map<string, { count: number; wpmSum: number }>();
        for (const entry of history) {
            const parsed = new Date(entry.d);
            if (Number.isNaN(parsed.getTime())) continue;
            const key = dayKey(parsed);
            const row = byDay.get(key) ?? { count: 0, wpmSum: 0 };
            row.count += 1;
            row.wpmSum += entry.wpm;
            byDay.set(key, row);
        }

        // The board ends on the Saturday of the current week, so today is never
        // in a half-drawn trailing column.
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const end = new Date(today);
        end.setDate(end.getDate() + (6 - end.getDay()));

        const totalDays = weeks * 7;
        const cells: ActivityCell[] = [];
        let lastMonth = -1;

        for (let i = totalDays - 1; i >= 0; i--) {
            const date = new Date(end);
            date.setDate(date.getDate() - i);
            const key = dayKey(date);
            const row = byDay.get(key);
            const count = row?.count ?? 0;

            // Label a column when its first row (Sunday) opens a new month.
            let monthLabel: string | null = null;
            if (date.getDay() === 0 && date.getMonth() !== lastMonth) {
                lastMonth = date.getMonth();
                monthLabel = MONTH[date.getMonth()];
            }

            cells.push({
                key,
                date,
                count,
                avgWpm: row && row.count > 0 ? Math.round(row.wpmSum / row.count) : 0,
                level: intensity(count),
                monthLabel,
            });
        }

        /* ── Streaks, over the whole log rather than the drawn window ──
           A 40-week streak shown on a 26-week board is still a 40-week streak. */
        const activeKeys = new Set([...byDay.keys()]);
        let streak = 0;
        const cursor = new Date(today);
        // A day that is not over yet must not break the run, so an empty today is
        // allowed once before counting starts from yesterday.
        if (!activeKeys.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
        while (activeKeys.has(dayKey(cursor))) {
            streak += 1;
            cursor.setDate(cursor.getDate() - 1);
        }

        let longest = 0;
        let run = 0;
        let previous: Date | null = null;
        for (const key of [...activeKeys].sort()) {
            const [y, m, d] = key.split('-').map(Number);
            const date = new Date(y, m - 1, d);
            if (previous) {
                const gap = Math.round((date.getTime() - previous.getTime()) / 86_400_000);
                run = gap === 1 ? run + 1 : 1;
            } else {
                run = 1;
            }
            longest = Math.max(longest, run);
            previous = date;
        }

        return {
            cells,
            summary: {
                streak,
                longest,
                activeDays: cells.filter((c) => c.count > 0).length,
                windowDays: totalDays,
            },
        };
    }, [history, weeks]);
}
