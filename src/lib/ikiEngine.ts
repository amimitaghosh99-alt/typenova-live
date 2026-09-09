/**
 * TypeNova Inter-Key Interval (IKI) & Motor Diagnostics Engine
 *
 * Measures millisecond latency between consecutive keystrokes, calculates
 * digraph motor efficiency, filters hesitation pauses, computes fluidity
 * indices, and detects physical transition bottlenecks.
 */

export interface DigraphStat {
  /** First character in uppercase (or SPACE, ENTER) */
  from: string;
  /** Second character in uppercase (or SPACE, ENTER) */
  to: string;
  /** Digraph representation e.g. "P → L" or "TH" */
  digraph: string;
  /** Number of times this transition occurred */
  count: number;
  /** Average transition time in ms */
  avgMs: number;
  /** Minimum transition time observed in ms */
  minMs: number;
  /** Maximum transition time observed in ms (capped at pause threshold) */
  maxMs: number;
  /** Latency standard deviation in ms */
  stdDevMs: number;
  /** Total keystroke errors that occurred on the second character */
  errorCount: number;
  /** Error rate between 0 and 1 */
  errorRate: number;
  /** Difference in ms between this transition avg and overall median IKI */
  deltaVsMedianMs: number;
  /** Physical finger transition classification */
  transitionType: 'adjacent' | 'crossover' | 'stretch' | 'double_tap' | 'standard';
}

export interface IKIMetrics {
  /** Median inter-key interval in ms across all non-pause transitions */
  medianIki: number;
  /** Mean inter-key interval in ms across all non-pause transitions */
  meanIki: number;
  /** Standard deviation of valid transition intervals in ms */
  stdDevIki: number;
  /** Rhythm fluidity index between 0 and 100 */
  fluidityScore: number;
  /** Total valid transitions evaluated */
  totalTransitions: number;
  /** Number of long hesitation pauses (>1500ms) filtered out */
  hesitationCount: number;
  /** Full map of digraph statistics keyed by "FROM_TO" */
  digraphStats: Record<string, DigraphStat>;
  /** Top slowest transitions relative to median cadence */
  slowestTransitions: DigraphStat[];
  /** Top error-prone or high-variance stumble transitions */
  stumbledTransitions: DigraphStat[];
  /** Digraph strings recommended for Aru targeted drills */
  recommendedDrillDigraphs: string[];
}

/** Keystroke representation matching typing engine log */
export interface KeystrokeEntry {
  key?: string;
  expected: string;
  time: number;
  isError: boolean;
  isBackspace?: boolean;
}

/** Maximum threshold in ms above which a transition is flagged as hesitation/pause rather than typing cadence */
export const HESITATION_THRESHOLD_MS = 1500;

/** Key hand assignment map for QWERTY touch typing */
const LEFT_HAND_KEYS = new Set([
  'Q', 'W', 'E', 'R', 'T',
  'A', 'S', 'D', 'F', 'G',
  'Z', 'X', 'C', 'V', 'B',
  '1', '2', '3', '4', '5',
  '`', '~', '!', '@', '#', '$', '%',
]);

const RIGHT_HAND_KEYS = new Set([
  'Y', 'U', 'I', 'O', 'P', '[', ']', '\\',
  'H', 'J', 'K', 'L', ';', '\'',
  'N', 'M', ',', '.', '/',
  '6', '7', '8', '9', '0', '-', '=',
  '^', '&', '*', '(', ')', '_', '+', '{', '}', '|', ':', '"', '<', '>', '?',
]);

/** Key finger columns on standard QWERTY (0 = left pinky ... 7 = right pinky) */
const FINGER_COLUMN_MAP: Record<string, number> = {
  // Left Pinky (0)
  Q: 0, A: 0, Z: 0, '1': 0, '`': 0,
  // Left Ring (1)
  W: 1, S: 1, X: 1, '2': 1,
  // Left Middle (2)
  E: 2, D: 2, C: 2, '3': 2,
  // Left Index (3)
  R: 3, F: 3, V: 3, T: 3, G: 3, B: 3, '4': 3, '5': 3,
  // Right Index (4)
  Y: 4, H: 4, N: 4, U: 4, J: 4, M: 4, '6': 4, '7': 4,
  // Right Middle (5)
  I: 5, K: 5, ',': 5, '8': 5, '<': 5,
  // Right Ring (6)
  O: 6, L: 6, '.': 6, '9': 6, '>': 6,
  // Right Pinky (7)
  P: 7, ';': 7, '/': 7, '[': 7, ']': 7, '\'': 7, '0': 7, '-': 7, '=': 7,
};

/**
 * Classifies the biomechanical movement type of a transition.
 */
export function classifyTransition(
  from: string,
  to: string
): DigraphStat['transitionType'] {
  const normFrom = from.toUpperCase();
  const normTo = to.toUpperCase();

  if (normFrom === normTo) {
    return 'double_tap';
  }

  const isFromLeft = LEFT_HAND_KEYS.has(normFrom);
  const isFromRight = RIGHT_HAND_KEYS.has(normFrom);
  const isToLeft = LEFT_HAND_KEYS.has(normTo);
  const isToRight = RIGHT_HAND_KEYS.has(normTo);

  // Hand crossover (e.g. Left -> Right or Right -> Left)
  if ((isFromLeft && isToRight) || (isFromRight && isToLeft)) {
    return 'crossover';
  }

  // Same hand analysis
  const colFrom = FINGER_COLUMN_MAP[normFrom];
  const colTo = FINGER_COLUMN_MAP[normTo];

  if (colFrom !== undefined && colTo !== undefined) {
    const colDiff = Math.abs(colFrom - colTo);
    if (colDiff === 1) return 'adjacent';
    if (colDiff >= 2) return 'stretch';
  }

  return 'standard';
}

/**
 * Normalizes expected characters into readable uppercase labels.
 */
function normalizeKeyLabel(char: string): string {
  if (!char) return '';
  if (char === ' ') return 'SPACE';
  if (char === '\n') return 'ENTER';
  return char.toUpperCase();
}

/**
 * Calculates comprehensive Inter-Key Interval (IKI) telemetry from a keystroke log.
 */
export function calculateIKIMetrics(keystrokeLog: KeystrokeEntry[]): IKIMetrics {
  const emptyResult: IKIMetrics = {
    medianIki: 0,
    meanIki: 0,
    stdDevIki: 0,
    fluidityScore: 100,
    totalTransitions: 0,
    hesitationCount: 0,
    digraphStats: {},
    slowestTransitions: [],
    stumbledTransitions: [],
    recommendedDrillDigraphs: [],
  };

  if (!keystrokeLog || keystrokeLog.length < 2) {
    return emptyResult;
  }

  // Filter out backspaces that do not represent forward character transitions
  const entries = keystrokeLog.filter(
    k => k && !k.isBackspace && typeof k.time === 'number' && Number.isFinite(k.time)
  );

  if (entries.length < 2) {
    return emptyResult;
  }

  const intervals: number[] = [];
  let hesitationCount = 0;

  // Intermediate accumulator per digraph key "FROM_TO"
  const accumulator: Record<
    string,
    {
      from: string;
      to: string;
      rawDigraph: string;
      times: number[];
      errorCount: number;
    }
  > = {};

  for (let i = 1; i < entries.length; i++) {
    const prev = entries[i - 1];
    const curr = entries[i];

    const dt = curr.time - prev.time;
    if (dt < 0) continue; // Out-of-order safety guard

    if (dt > HESITATION_THRESHOLD_MS) {
      hesitationCount++;
      continue; // Skip long pauses from rhythm calculations
    }

    intervals.push(dt);

    const fromLabel = normalizeKeyLabel(prev.expected);
    const toLabel = normalizeKeyLabel(curr.expected);
    if (!fromLabel || !toLabel) continue;

    const digraphKey = `${fromLabel}_${toLabel}`;
    const rawDigraph = `${prev.expected}${curr.expected}`.toLowerCase();

    if (!accumulator[digraphKey]) {
      accumulator[digraphKey] = {
        from: fromLabel,
        to: toLabel,
        rawDigraph,
        times: [],
        errorCount: 0,
      };
    }

    accumulator[digraphKey].times.push(dt);
    if (curr.isError) {
      accumulator[digraphKey].errorCount++;
    }
  }

  if (intervals.length === 0) {
    return emptyResult;
  }

  // Calculate overall median and mean IKI
  const sortedIntervals = [...intervals].sort((a, b) => a - b);
  const mid = Math.floor(sortedIntervals.length / 2);
  const medianIki =
    sortedIntervals.length % 2 !== 0
      ? sortedIntervals[mid]
      : Math.round((sortedIntervals[mid - 1] + sortedIntervals[mid]) / 2);

  const sum = intervals.reduce((acc, v) => acc + v, 0);
  const meanIki = Math.round(sum / intervals.length);

  const variance =
    intervals.reduce((acc, v) => acc + Math.pow(v - meanIki, 2), 0) / intervals.length;
  const stdDevIki = Math.round(Math.sqrt(variance));

  // Motor Fluidity Index (0 - 100)
  // Higher consistency and low coefficient of variation yields a score approaching 100
  let fluidityScore = 100;
  if (meanIki > 0) {
    const cov = stdDevIki / meanIki; // Coefficient of variation
    // A CoV around 0.20 is superhuman flow (95%+), CoV > 0.80 represents heavy stutter
    fluidityScore = Math.max(0, Math.min(100, Math.round((1 - Math.min(cov, 1) * 0.75) * 100)));
  }

  // Compile individual digraph stats
  const digraphStats: Record<string, DigraphStat> = {};
  const allDigraphList: DigraphStat[] = [];

  for (const [key, item] of Object.entries(accumulator)) {
    const count = item.times.length;
    if (count === 0) continue;

    const itemSum = item.times.reduce((a, b) => a + b, 0);
    const avgMs = Math.round(itemSum / count);
    const minMs = Math.min(...item.times);
    const maxMs = Math.max(...item.times);

    const itemVar =
      item.times.reduce((a, b) => a + Math.pow(b - avgMs, 2), 0) / count;
    const stdDevMs = Math.round(Math.sqrt(itemVar));

    const errorRate = +(item.errorCount / count).toFixed(2);
    const deltaVsMedianMs = avgMs - medianIki;
    const transitionType = classifyTransition(item.from, item.to);

    const stat: DigraphStat = {
      from: item.from,
      to: item.to,
      digraph: `${item.from} → ${item.to}`,
      count,
      avgMs,
      minMs,
      maxMs,
      stdDevMs,
      errorCount: item.errorCount,
      errorRate,
      deltaVsMedianMs,
      transitionType,
    };

    digraphStats[key] = stat;
    allDigraphList.push(stat);
  }

  // Sort slowest transitions (min 2 occurrences, positive delta vs median, excluding space/enter)
  const slowestTransitions = allDigraphList
    .filter(d => d.from !== 'SPACE' && d.to !== 'SPACE' && d.from !== 'ENTER' && d.to !== 'ENTER')
    .filter(d => d.deltaVsMedianMs > 20)
    .sort((a, b) => b.avgMs - a.avgMs)
    .slice(0, 5);

  // Sort stumbled transitions (highest errors or extreme variance)
  const stumbledTransitions = allDigraphList
    .filter(d => d.from !== 'SPACE' && d.to !== 'SPACE' && d.from !== 'ENTER' && d.to !== 'ENTER')
    .filter(d => d.errorCount > 0 || d.stdDevMs > medianIki * 0.8)
    .sort((a, b) => b.errorCount - a.errorCount || b.stdDevMs - a.stdDevMs)
    .slice(0, 5);

  // Extract recommended drill targets (e.g. "th", "pl", "st")
  const recommendedCandidates = new Set<string>();
  const isAlphaNum = (char: string) => /^[A-Za-z0-9]$/.test(char);

  for (const s of stumbledTransitions) {
    if (s.from.length === 1 && s.to.length === 1 && isAlphaNum(s.from) && isAlphaNum(s.to)) {
      recommendedCandidates.add(`${s.from}${s.to}`.toLowerCase());
    }
  }

  for (const s of slowestTransitions) {
    if (s.from.length === 1 && s.to.length === 1 && isAlphaNum(s.from) && isAlphaNum(s.to)) {
      recommendedCandidates.add(`${s.from}${s.to}`.toLowerCase());
    }
  }

  // Fallback defaults if no severe bottlenecks
  if (recommendedCandidates.size === 0) {
    ['th', 'er', 'on', 'in', 'st'].forEach(d => recommendedCandidates.add(d));
  }

  const recommendedDrillDigraphs = Array.from(recommendedCandidates).slice(0, 5);

  return {
    medianIki,
    meanIki,
    stdDevIki,
    fluidityScore,
    totalTransitions: intervals.length,
    hesitationCount,
    digraphStats,
    slowestTransitions,
    stumbledTransitions,
    recommendedDrillDigraphs,
  };
}
