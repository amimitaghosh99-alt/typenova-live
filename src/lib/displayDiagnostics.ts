/**
 * Display Refresh Rate & VSync Diagnostics Engine
 * Accurately detects monitor hardware refresh rates (60Hz, 75Hz, 120Hz, 144Hz, 165Hz, 240Hz, etc.)
 * by analyzing frame-to-frame RAF delta distributions and filtering out dropped frame stutter.
 */

export const STANDARD_REFRESH_RATES = [
  500, 360, 280, 240, 200, 180, 165, 144, 120, 100, 90, 75, 60, 50, 30,
] as const;

export interface DisplayHzResult {
  hz: number;
  deltaMs: number;
  confidence: 'high' | 'medium' | 'approximate';
  isStandardTier: boolean;
}

/**
 * Computes the true hardware display refresh rate from an array of RAF deltas in milliseconds.
 *
 * Algorithm:
 * 1. Filter out invalid/paused deltas (< 1.5ms or > 45ms).
 * 2. Frames cannot render faster than the hardware VSync interval.
 *    Any frame drops or micro-stutters appear as larger deltas (multiples of the base interval).
 *    Therefore, taking the lowest 50th percentile isolates the genuine hardware tick interval.
 * 3. Calculate the median of the baseline samples.
 * 4. Find the closest standard monitor refresh rate. If the deviation is within 18%, snap to the standard rate;
 *    otherwise return the actual rounded Hz (for custom VRR or non-standard panels).
 */
export function computeDisplayRefreshRate(deltas: number[]): DisplayHzResult | null {
  const valid = deltas.filter(d => typeof d === 'number' && d >= 1.5 && d <= 45).sort((a, b) => a - b);
  if (valid.length < 10) return null;

  // Histogram mode clustering with 0.4ms bins to eliminate jitter & 25th-percentile bias
  const BIN_SIZE = 0.4;
  const bins = new Map<number, number[]>();
  for (const d of valid) {
    const binKey = Math.round(d / BIN_SIZE);
    const list = bins.get(binKey);
    if (list) list.push(d);
    else bins.set(binKey, [d]);
  }

  // Find the modal bin (bin with highest frequency; prefer lower delta on tie)
  let bestBinKey: number | null = null;
  let maxCount = -1;
  for (const [key, list] of bins.entries()) {
    if (list.length > maxCount || (list.length === maxCount && bestBinKey !== null && key < bestBinKey)) {
      maxCount = list.length;
      bestBinKey = key;
    }
  }

  if (bestBinKey === null) return null;

  // Pool modal bin and immediate adjacent neighbors to capture distribution spread
  const clusterSamples: number[] = [];
  for (let k = bestBinKey - 1; k <= bestBinKey + 1; k++) {
    const list = bins.get(k);
    if (list) clusterSamples.push(...list);
  }

  clusterSamples.sort((a, b) => a - b);
  const medianDelta = clusterSamples[Math.floor(clusterSamples.length / 2)];

  if (medianDelta <= 0) return null;

  const rawHz = 1000 / medianDelta;

  // Find closest standard refresh rate
  let bestRate: number = STANDARD_REFRESH_RATES[0];
  let minDiff = Infinity;
  for (const rate of STANDARD_REFRESH_RATES) {
    const targetDelta = 1000 / rate;
    const diff = Math.abs(medianDelta - targetDelta);
    if (diff < minDiff) {
      minDiff = diff;
      bestRate = rate;
    }
  }

  const targetForBest = 1000 / bestRate;
  const deviation = Math.abs(medianDelta - targetForBest) / targetForBest;
  const isStandard = deviation <= 0.18;
  const finalHz = isStandard ? bestRate : Math.round(rawHz);

  let confidence: 'high' | 'medium' | 'approximate' = 'approximate';
  if (valid.length >= 30 && deviation <= 0.10) {
    confidence = 'high';
  } else if (valid.length >= 15 && deviation <= 0.18) {
    confidence = 'medium';
  }

  return {
    hz: finalHz,
    deltaMs: Number(medianDelta.toFixed(1)),
    confidence,
    isStandardTier: isStandard,
  };
}

/**
 * Checks if the browser exposes native screen refresh rate metadata.
 */
export function getNativeScreenRefreshRate(): number | null {
  if (typeof window === 'undefined') return null;
  try {
    const native = (window.screen as unknown as { refreshRate?: number })?.refreshRate;
    if (typeof native === 'number' && native >= 30 && native <= 500) {
      return Math.round(native);
    }
  } catch {
    /* ignore */
  }
  return null;
}
