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

  // Isolate the fastest non-stutter frames (lowest 50% percentile, at least 6 samples)
  const baselineCount = Math.max(6, Math.floor(valid.length * 0.5));
  const baselineSamples = valid.slice(0, baselineCount);
  const medianDelta = baselineSamples[Math.floor(baselineSamples.length / 2)];

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
