/**
 * Shadow Engine: Auditory Latency Profiling, Buffer Drift, and Catch-up Burst Telemetry.
 */

import type { SpokenWordBoundary } from './audioDictationEngine';
import type { KeystrokeEntry } from '@/hooks/useTypingEngine';

export interface WordShadowTelemetry {
  word: string;
  wordIndex: number;
  spokenTimestamp: number;
  typedTimestamp: number;
  lagMs: number; // T_typed - T_spoken
  leadOrLag: 'lead' | 'synchronized' | 'lag';
}

export interface ShadowMetrics {
  meanLagMs: number;
  medianLagMs: number;
  minLagMs: number;
  maxLagMs: number;
  stdDevLagMs: number;
  auditoryFluidity: number; // 0 - 100%
  catchupBurstWpm: number;
  speedMultiplier: number;
  totalWordsShadowed: number;
  synchronizedWords: number; // within 200ms of speech
  wordTelemetry: WordShadowTelemetry[];
  timelineDrift: { timestamp: number; lagMs: number; bufferWords: number }[];
}

/**
 * Calculates Shadowing and Auditory Latency Telemetry.
 */
export function calculateShadowMetrics(
  spokenBoundaries: SpokenWordBoundary[],
  keystrokeLog: KeystrokeEntry[],
  speedMultiplier: number = 1.0,
  testStartTime: number = 0
): ShadowMetrics {
  const emptyMetrics: ShadowMetrics = {
    meanLagMs: 0,
    medianLagMs: 0,
    minLagMs: 0,
    maxLagMs: 0,
    stdDevLagMs: 0,
    auditoryFluidity: 100,
    catchupBurstWpm: 0,
    speedMultiplier,
    totalWordsShadowed: 0,
    synchronizedWords: 0,
    wordTelemetry: [],
    timelineDrift: [],
  };

  if (!spokenBoundaries || spokenBoundaries.length === 0 || !keystrokeLog || keystrokeLog.length === 0) {
    return emptyMetrics;
  }

  // Filter valid forward keystrokes
  const validKeystrokes = keystrokeLog.filter(
    k => k && !k.isBackspace && typeof k.time === 'number' && Number.isFinite(k.time)
  );

  if (validKeystrokes.length === 0) {
    return emptyMetrics;
  }

  // Map keystrokes into typed word start timestamps
  // A word begins on the first character of the word
  const typedWordStarts: { charIndex: number; timestamp: number }[] = [];
  let currentWordCharIndex = 0;
  let inWord = false;

  for (let i = 0; i < validKeystrokes.length; i++) {
    const k = validKeystrokes[i];
    const isSpace = k.expected === ' ' || k.expected === '\n';

    if (!isSpace && !inWord) {
      inWord = true;
      typedWordStarts.push({
        charIndex: currentWordCharIndex,
        timestamp: k.time,
      });
    } else if (isSpace) {
      inWord = false;
    }
    currentWordCharIndex += 1;
  }

  const baseEpoch = testStartTime > 0
    ? testStartTime
    : (validKeystrokes[0]?.time && validKeystrokes[0].time > 1000000000000 ? validKeystrokes[0].time : 0);

  const spokenBaseEpoch = spokenBoundaries[0]?.spokenTimestamp && spokenBoundaries[0].spokenTimestamp > 1000000000000
    ? spokenBoundaries[0].spokenTimestamp
    : 0;

  const wordTelemetry: WordShadowTelemetry[] = [];
  const lags: number[] = [];
  let syncCount = 0;

  for (let i = 0; i < spokenBoundaries.length; i++) {
    const spoken = spokenBoundaries[i];
    const typed = typedWordStarts[i];

    if (typed) {
      const typedTime = typed.timestamp > 1000000000000 ? (typed.timestamp - baseEpoch) : typed.timestamp;
      const spokenTime = spoken.spokenTimestamp > 1000000000000 ? (spoken.spokenTimestamp - spokenBaseEpoch) : spoken.spokenTimestamp;
      const lagMs = Math.round(typedTime - spokenTime);
      lags.push(lagMs);

      let leadOrLag: 'lead' | 'synchronized' | 'lag' = 'synchronized';
      if (lagMs < -150) leadOrLag = 'lead';
      else if (lagMs > 450) leadOrLag = 'lag';
      else syncCount++;

      wordTelemetry.push({
        word: spoken.word,
        wordIndex: i,
        spokenTimestamp: spokenTime,
        typedTimestamp: typedTime,
        lagMs,
        leadOrLag,
      });
    }
  }

  if (lags.length === 0) {
    return emptyMetrics;
  }

  // Calculate Median, Mean, StdDev of Ear-to-Finger Latency
  const sortedLags = [...lags].sort((a, b) => a - b);
  const mid = Math.floor(sortedLags.length / 2);
  const medianLagMs =
    sortedLags.length % 2 !== 0
      ? sortedLags[mid]
      : Math.round((sortedLags[mid - 1] + sortedLags[mid]) / 2);

  const sumLag = lags.reduce((a, b) => a + b, 0);
  const meanLagMs = Math.round(sumLag / lags.length);
  const minLagMs = sortedLags[0];
  const maxLagMs = sortedLags[sortedLags.length - 1];

  const variance = lags.reduce((a, b) => a + Math.pow(b - meanLagMs, 2), 0) / lags.length;
  const stdDevLagMs = Math.round(Math.sqrt(variance));

  // Auditory Fluidity Score (0 - 100%)
  // Factors in lag consistency and percentage of synchronized / steady cadence words
  let auditoryFluidity = 100;
  if (lags.length > 1) {
    const syncRatio = syncCount / lags.length;
    const penalty = Math.min(60, (stdDevLagMs / 400) * 50);
    auditoryFluidity = Math.round(Math.max(10, Math.min(100, syncRatio * 60 + (40 - penalty))));
  }

  // Calculate Catch-up Burst Velocity (Peak WPM when closing a trailing lag)
  let catchupBurstWpm = 0;
  for (let i = 1; i < wordTelemetry.length; i++) {
    const prev = wordTelemetry[i - 1];
    const curr = wordTelemetry[i];

    // If previously lagging and closed the gap rapidly
    if (prev.lagMs > 600 && curr.lagMs < prev.lagMs) {
      const dtSec = (curr.typedTimestamp - prev.typedTimestamp) / 1000;
      if (dtSec > 0.05 && dtSec < 2.0) {
        const wordChars = curr.word.length + 1;
        const burst = Math.round((wordChars / 5) / (dtSec / 60));
        if (burst > catchupBurstWpm && burst < 350) {
          catchupBurstWpm = burst;
        }
      }
    }
  }

  // Generate timeline drift points
  const timelineDrift = wordTelemetry.map(w => ({
    timestamp: w.typedTimestamp,
    lagMs: w.lagMs,
    bufferWords: +(w.lagMs / 400).toFixed(1),
  }));

  return {
    meanLagMs,
    medianLagMs,
    minLagMs,
    maxLagMs,
    stdDevLagMs,
    auditoryFluidity,
    catchupBurstWpm,
    speedMultiplier,
    totalWordsShadowed: wordTelemetry.length,
    synchronizedWords: syncCount,
    wordTelemetry,
    timelineDrift,
  };
}
