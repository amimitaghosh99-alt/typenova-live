// ═══════════════════════════════════════════════════════════════════════
//  WPM GRAPH MATH — Pure mathematical & geometric algorithms for telemetry
// ═══════════════════════════════════════════════════════════════════════

export interface NiceAxis {
  max: number;
  step: number;
  ticks: number[];
}

/**
 * Computes a human-friendly rounded ceiling and interval steps.
 * Avoids awkward labels like 29, 39, 49 by snapping to multiples of 5, 10, 20, 25, 50, etc.
 */
export function niceCeiling(rawMax: number, targetTicks = 5): NiceAxis {
  const safeMax = Math.max(Number.isFinite(rawMax) ? rawMax : 0, 10);
  const roughStep = safeMax / Math.max(targetTicks, 1);
  const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
  const normalized = roughStep / magnitude;

  let stepMultiplier = 10;
  for (const m of [1, 2, 2.5, 5, 10]) {
    if (m >= normalized) {
      stepMultiplier = m;
      break;
    }
  }

  const step = Math.max(magnitude * stepMultiplier, 5);
  const max = Math.ceil(safeMax / step) * step;

  const ticks: number[] = [];
  for (let val = 0; val <= max; val += step) {
    ticks.push(Math.round(val));
  }

  return { max, step, ticks };
}

/**
 * Computes clean time intervals (e.g. every 5s, 10s, 15s, 30s, or 60s).
 */
export function niceTimeSteps(durationMs: number, targetTicks = 6): Array<{ sec: number; ms: number }> {
  const totalSecs = Math.max(1, Math.ceil(durationMs / 1000));
  const rawInterval = totalSecs / Math.max(targetTicks, 1);

  // Common nice intervals in seconds
  const allowed = [1, 2, 5, 10, 15, 20, 30, 45, 60, 90, 120, 180, 300];
  let chosen = allowed[allowed.length - 1];
  for (const iv of allowed) {
    if (iv >= rawInterval) {
      chosen = iv;
      break;
    }
  }

  const steps: Array<{ sec: number; ms: number }> = [];
  for (let s = 0; s <= totalSecs; s += chosen) {
    steps.push({ sec: s, ms: s * 1000 });
  }

  // Ensure final timestamp is included if not too close to the previous tick
  const last = steps[steps.length - 1];
  if (totalSecs - (last?.sec ?? 0) >= chosen * 0.45) {
    steps.push({ sec: totalSecs, ms: durationMs });
  }

  return steps;
}

/**
 * Catmull-Rom spline smoothing with bottom floor boundary clamping.
 * Prevents downward overshoot dipping below baseline.
 */
export function smoothPath(
  pts: Array<{ x: number; y: number }>,
  tension = 0.15,
  clampMaxY?: number
): string {
  if (pts.length === 0) return '';
  if (pts.length === 1) return `M ${pts[0].x},${pts[0].y}`;

  let d = `M ${pts[0].x},${pts[0].y}`;

  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = i > 0 ? pts[i - 1] : pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = i !== pts.length - 2 ? pts[i + 2] : p2;

    let cp1x = p1.x + (p2.x - p0.x) * tension;
    let cp1y = p1.y + (p2.y - p0.y) * tension;

    let cp2x = p2.x - (p3.x - p1.x) * tension;
    let cp2y = p2.y - (p3.y - p1.y) * tension;

    if (typeof clampMaxY === 'number') {
      cp1y = Math.min(cp1y, clampMaxY);
      cp2y = Math.min(cp2y, clampMaxY);
    }

    d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }

  return d;
}

export interface ClusteredError {
  t: number;
  count: number;
}

/**
 * Clusters consecutive error timestamps occurring within `thresholdMs` into a single marker.
 * Eliminates overlapping vertical pin collisions.
 */
export function clusterErrors(errorTimes: number[], thresholdMs = 650): ClusteredError[] {
  if (!Array.isArray(errorTimes) || errorTimes.length === 0) return [];

  const sorted = [...errorTimes].sort((a, b) => a - b);
  const clusters: ClusteredError[] = [];

  let currentCluster: { times: number[] } | null = null;

  for (const t of sorted) {
    if (!currentCluster) {
      currentCluster = { times: [t] };
    } else {
      const prev = currentCluster.times[currentCluster.times.length - 1];
      if (t - prev <= thresholdMs) {
        currentCluster.times.push(t);
      } else {
        const avgT = currentCluster.times.reduce((sum, v) => sum + v, 0) / currentCluster.times.length;
        clusters.push({ t: avgT, count: currentCluster.times.length });
        currentCluster = { times: [t] };
      }
    }
  }

  if (currentCluster) {
    const avgT = currentCluster.times.reduce((sum, v) => sum + v, 0) / currentCluster.times.length;
    clusters.push({ t: avgT, count: currentCluster.times.length });
  }

  return clusters;
}

export interface InterpolatedPoint {
  wpm: number;
  rawWpm: number;
}

/**
 * Samples Net and Raw WPM at time `t` across a timeline using linear interpolation.
 */
export function interpolateSeries(
  points: Array<{ t: number; wpm: number; rawWpm?: number }>,
  t: number
): InterpolatedPoint {
  if (!Array.isArray(points) || points.length === 0) {
    return { wpm: 0, rawWpm: 0 };
  }

  if (t <= points[0].t) {
    return {
      wpm: points[0].wpm ?? 0,
      rawWpm: points[0].rawWpm ?? points[0].wpm ?? 0,
    };
  }

  const last = points[points.length - 1];
  if (t >= last.t) {
    return {
      wpm: last.wpm ?? 0,
      rawWpm: last.rawWpm ?? last.wpm ?? 0,
    };
  }

  for (let i = 1; i < points.length; i++) {
    if (points[i].t >= t) {
      const a = points[i - 1];
      const b = points[i];
      const span = b.t - a.t;
      const frac = span === 0 ? 0 : Math.max(0, Math.min(1, (t - a.t) / span));

      const wpmA = a.wpm ?? 0;
      const wpmB = b.wpm ?? 0;
      const rawA = a.rawWpm ?? wpmA;
      const rawB = b.rawWpm ?? wpmB;

      return {
        wpm: Math.round(wpmA + (wpmB - wpmA) * frac),
        rawWpm: Math.round(rawA + (rawB - rawA) * frac),
      };
    }
  }

  return {
    wpm: last.wpm ?? 0,
    rawWpm: last.rawWpm ?? last.wpm ?? 0,
  };
}
