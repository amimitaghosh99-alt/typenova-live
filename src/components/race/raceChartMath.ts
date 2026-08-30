// ═══════════════════════════════════════════════════════════════════════
//  RACE CHART MATH — the pure half of `RaceChart`
//  ---------------------------------------------------------------------
//  Split out of the component so it can be exercised on its own: this is the
//  part that decides who was leading, where the lead changed hands, and where a
//  racer's line has to break. All of it is deterministic and side-effect free.
// ═══════════════════════════════════════════════════════════════════════

/**
 * Samples per series. Fixed rather than derived from the incoming point count:
 * clients sample at different rates, and a shared grid is the only way two
 * curves can be compared at an instant — or a leader identified at all.
 */
export const GRID = 140;

export interface Point {
    t: number;
    wpm: number;
}

/** The minimum a series needs to expose for the maths below. */
export interface SeriesLike {
    id: string;
    points: Point[];
}

/** WPM at `t`, linearly interpolated. Clamps to the ends rather than dropping to 0. */
export function valueAt(points: Point[], t: number): number {
    if (points.length === 0) return 0;
    if (t <= points[0].t) return points[0].wpm;
    const last = points[points.length - 1];
    if (t >= last.t) return last.wpm;
    for (let i = 1; i < points.length; i++) {
        if (points[i].t >= t) {
            const a = points[i - 1];
            const b = points[i];
            const span = b.t - a.t;
            return span === 0 ? b.wpm : a.wpm + (b.wpm - a.wpm) * ((t - a.t) / span);
        }
    }
    return last.wpm;
}

/** A round-ish step so the axis reads 0/25/50/75 rather than 0/23/46/69. */
export function niceStep(range: number, targetTicks: number): number {
    const raw = Math.max(range / Math.max(targetTicks, 1), 1);
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    for (const m of [1, 2, 2.5, 5, 10]) {
        if (mag * m >= raw) return mag * m;
    }
    return mag * 10;
}

/** Catmull-Rom-ish smoothing, the same tension as every other curve in the app. */
export function smooth(pts: Array<{ x: number; y: number }>): string {
    if (pts.length === 0) return '';
    if (pts.length === 1) return `M ${pts[0].x},${pts[0].y}`;
    let d = `M ${pts[0].x},${pts[0].y}`;
    const tension = 0.15;
    for (let i = 0; i < pts.length - 1; i++) {
        const p0 = i > 0 ? pts[i - 1] : pts[i];
        const p1 = pts[i];
        const p2 = pts[i + 1];
        const p3 = i !== pts.length - 2 ? pts[i + 2] : p2;
        d += ` C ${p1.x + (p2.x - p0.x) * tension},${p1.y + (p2.y - p0.y) * tension}`
            + ` ${p2.x - (p3.x - p1.x) * tension},${p2.y - (p3.y - p1.y) * tension}`
            + ` ${p2.x},${p2.y}`;
    }
    return d;
}

export interface Resampled {
    /** Shared time grid, ms from the start. */
    times: number[];
    /** Per series, one value per grid slot. `null` past their finish. */
    values: Map<string, Array<number | null>>;
    /** Leader id at each grid slot, by WPM. `null` before anyone has typed. */
    leaders: Array<string | null>;
}

/**
 * Puts every series on one time grid.
 *
 * `null` past a racer's last sample rather than their final WPM held flat: a
 * finished racer has no pace, and drawing one invents a line they never typed.
 * It also keeps them out of the leader calculation after they finish, which is
 * what makes "lead changes" mean lead changes rather than "someone finished".
 */
export function resample(series: SeriesLike[], durationMs: number): Resampled {
    const times = Array.from({ length: GRID }, (_, i) => (durationMs * i) / (GRID - 1));
    const values = new Map<string, Array<number | null>>();

    for (const s of series) {
        const end = s.points.length > 0 ? s.points[s.points.length - 1].t : 0;
        values.set(
            s.id,
            times.map((t) => (s.points.length === 0 || t > end + 1 ? null : valueAt(s.points, t))),
        );
    }

    const leaders = times.map((_, i) => {
        let bestId: string | null = null;
        let best = -1;
        for (const s of series) {
            const v = values.get(s.id)?.[i];
            if (v == null) continue;
            // Ties keep the incumbent, so a dead heat doesn't register as an
            // overtake on every single sample.
            if (v > best) {
                best = v;
                bestId = s.id;
            }
        }
        return best > 0 ? bestId : null;
    });

    return { times, values, leaders };
}

/** Where the lead actually changed hands. */
export interface Overtake {
    t: number;
    fromId: string;
    toId: string;
}

export function findOvertakes(grid: Resampled): Overtake[] {
    const out: Overtake[] = [];
    let current: string | null = null;
    for (let i = 0; i < grid.leaders.length; i++) {
        const id = grid.leaders[i];
        if (!id) continue;
        if (current && id !== current) {
            out.push({ t: grid.times[i], fromId: current, toId: id });
        }
        current = id;
    }
    return out;
}
