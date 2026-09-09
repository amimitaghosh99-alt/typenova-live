/**
 * TypeNova Core Scoring & Precision Grading Engine
 * Computes Composite Performance Index (CPI), Burst WPM, Performance Grades,
 * Accolade Badges, XP Progression Multipliers, and Ghost Delta Metrics.
 */

export type PerformanceGrade = 'S+' | 'S' | 'A' | 'B' | 'C' | 'D';

export interface CPIBreakdown {
  cpi: number;
  grade: PerformanceGrade;
  baseSpeedScore: number;
  precisionMultiplier: number;
  precisionBonus: number;
  comboBonus: number;
  consistencyBonus: number;
  penalty: number;
}

export type AccoladeId = 'flawless' | 'centurion' | 'surgical' | 'flow_state';

export interface AccoladeBadge {
  id: AccoladeId;
  title: string;
  desc: string;
  description?: string;
  subtitle?: string;
  icon: string;
  unlocked: boolean;
  tier?: 'gold' | 'emerald' | 'cyan' | 'purple' | 'diamond' | 'apex';
  progress?: {
    current: number;
    target: number;
    unit: string;
  };
}

export interface GradeDetails {
  grade: PerformanceGrade;
  title: string;
  description: string;
  colorClass: string;
  glowClass: string;
  minCpi: number;
  minAccuracy: number;
}

export const GRADE_DETAILS: Record<PerformanceGrade, GradeDetails> = {
  'S+': {
    grade: 'S+',
    title: 'Cyber Vanguard',
    description: 'Transcendent velocity and near-perfect execution.',
    colorClass: 'text-amber-300',
    glowClass: 'drop-shadow-[0_0_25px_rgba(251,191,36,0.85)]',
    minCpi: 135,
    minAccuracy: 98,
  },
  'S': {
    grade: 'S',
    title: 'Precision Master',
    description: 'Flawless precision with exceptional rhythm.',
    colorClass: 'text-amber-400',
    glowClass: 'drop-shadow-[0_0_20px_rgba(251,191,36,0.65)]',
    minCpi: 95,
    minAccuracy: 95,
  },
  'A': {
    grade: 'A',
    title: 'Elite Operative',
    description: 'High accuracy and steady velocity.',
    colorClass: 'text-emerald-400',
    glowClass: 'drop-shadow-[0_0_20px_rgba(52,211,153,0.65)]',
    minCpi: 70,
    minAccuracy: 90,
  },
  'B': {
    grade: 'B',
    title: 'Proficient Hacker',
    description: 'Solid performance with minor unforced errors.',
    colorClass: 'text-sky-400',
    glowClass: 'drop-shadow-[0_0_20px_rgba(56,189,248,0.60)]',
    minCpi: 50,
    minAccuracy: 85,
  },
  'C': {
    grade: 'C',
    title: 'Neon Initiate',
    description: 'Developing control and pacing.',
    colorClass: 'text-orange-400',
    glowClass: 'drop-shadow-[0_0_20px_rgba(251,146,60,0.60)]',
    minCpi: 30,
    minAccuracy: 75,
  },
  'D': {
    grade: 'D',
    title: 'Uncalibrated',
    description: 'High error rate requiring calibration.',
    colorClass: 'text-zinc-400',
    glowClass: 'drop-shadow-none',
    minCpi: 0,
    minAccuracy: 0,
  },
};

/**
 * Returns visual styling, labels, and metadata for a given performance grade.
 */
export function getGradeDetails(grade: PerformanceGrade): GradeDetails {
  return GRADE_DETAILS[grade] || GRADE_DETAILS['D'];
}

/**
 * Evaluates performance grade based on CPI score, accuracy, flawless status, and consistency.
 * Guarantees that high-accuracy runs (e.g. 100% accuracy at 40 WPM) evaluate to Grade 'S' or 'A', never 'C' or 'D'.
 */
export function evaluateGrade(
  cpi: number,
  accuracy: number,
  isFlawless: boolean = false,
  consistency: number = 100
): PerformanceGrade {
  const safeCpi = Number.isFinite(cpi) ? Math.max(0, cpi) : 0;
  const safeAcc = Number.isFinite(accuracy) ? Math.min(100, Math.max(0, accuracy)) : 0;
  const safeCons = Number.isFinite(consistency) ? Math.min(100, Math.max(0, consistency)) : 100;

  if (safeAcc < 75 || safeCpi < 30) {
    return 'D';
  }

  // S+ Tier: CPI >= 135 (or >= 115 with 100% Flawless), Acc >= 98%, Cons >= 85%
  if ((safeCpi >= 135 || (safeCpi >= 115 && isFlawless)) && safeAcc >= 98 && safeCons >= 85) {
    return 'S+';
  }

  // S Tier: CPI >= 95 (or >= 80 with 100% Flawless), Acc >= 95%, Cons >= 75%
  if ((safeCpi >= 95 || (safeCpi >= 80 && isFlawless)) && safeAcc >= 95 && safeCons >= 75) {
    return 'S';
  }

  // A Tier: CPI >= 70 (or >= 55 with Acc >= 98%), Acc >= 90%
  if ((safeCpi >= 70 || (safeCpi >= 55 && safeAcc >= 98)) && safeAcc >= 90) {
    return 'A';
  }

  // B Tier: CPI >= 50, Acc >= 85%
  if (safeCpi >= 50 && safeAcc >= 85) {
    return 'B';
  }

  // C Tier: CPI >= 30, Acc >= 75%
  if (safeCpi >= 30 && safeAcc >= 75) {
    return 'C';
  }

  return 'D';
}

/**
 * Computes Composite Performance Index (CPI) factoring in Net WPM, Accuracy %,
 * Flawless Combo Streaks, and Rhythm Consistency.
 */
export function calculateCPI(
  wpm: number,
  accuracy: number,
  flawlessStreak: number,
  consistency: number,
  totalChars: number
): CPIBreakdown {
  const safeWpm = Number.isFinite(wpm) ? Math.min(999, Math.max(0, wpm)) : 0;
  const safeAcc = Number.isFinite(accuracy) ? Math.min(100, Math.max(0, accuracy)) : 0;
  const safeStreak = Number.isFinite(flawlessStreak) ? Math.max(0, flawlessStreak) : 0;
  const safeCons = Number.isFinite(consistency) ? Math.min(100, Math.max(0, consistency)) : 100;
  const safeChars = Number.isFinite(totalChars) ? Math.max(0, totalChars) : 0;

  if (safeChars === 0 || safeWpm === 0) {
    return {
      cpi: 0,
      grade: 'D',
      baseSpeedScore: 0,
      precisionMultiplier: 0,
      precisionBonus: 0,
      comboBonus: 0,
      consistencyBonus: 0,
      penalty: 0,
    };
  }

  // Precision Multiplier: (Accuracy / 100)^2
  const precisionMultiplier = Math.pow(safeAcc / 100, 2);

  // Consistency multiplier: 1 + (Consistency - 50) / 250 -> [0.80, 1.20]
  const kCons = 1 + (safeCons - 50) / 250;

  // Base speed weighted by precision and consistency
  const baseSpeedScore = safeWpm;
  const weightedSpeed = safeWpm * precisionMultiplier * kCons;

  // Precision Tier Bonus (requires non-trivial text with totalChars >= 20)
  let precisionBonus = 0;
  if (safeChars >= 20) {
    if (safeAcc === 100) {
      precisionBonus = 35;
    } else if (safeAcc >= 98) {
      precisionBonus = 20;
    } else if (safeAcc >= 95) {
      precisionBonus = 10;
    }
  }

  // Combo Milestone Bonus
  let comboBonus = 0;
  const isUnbrokenFlawless = safeAcc === 100 && safeStreak >= safeChars && safeChars >= 20;
  if (isUnbrokenFlawless) {
    comboBonus += 15;
  }
  if (safeStreak >= 200) {
    comboBonus += 15;
  } else if (safeStreak >= 100) {
    comboBonus += 10;
  } else if (safeStreak >= 50) {
    comboBonus += 5;
  } else {
    comboBonus += Math.min(5, Math.floor(safeStreak / 10));
  }

  // Consistency / Flow State Bonus
  const consistencyBonus = safeCons >= 85 ? 5 : 0;

  // Low Accuracy Penalty: -20 * ((85 - Acc) / 10) if Acc < 85
  const penalty = safeAcc < 85 ? 20 * ((85 - safeAcc) / 10) : 0;

  const rawCPI = weightedSpeed + precisionBonus + comboBonus + consistencyBonus - penalty;
  const cpi = Math.min(999, Math.max(0, Math.round(rawCPI)));
  const grade = evaluateGrade(cpi, safeAcc, isUnbrokenFlawless, safeCons);

  return {
    cpi,
    grade,
    baseSpeedScore,
    precisionMultiplier: +precisionMultiplier.toFixed(4),
    precisionBonus,
    comboBonus,
    consistencyBonus,
    penalty: +penalty.toFixed(2),
  };
}

/**
 * Extracts the maximum valid burst WPM from timeline entries safely.
 */
function extractSafeTimelineBurst(
  timeline?: Array<{ t?: number; wpm?: number; rawWpm?: number }>
): number {
  if (!timeline || timeline.length === 0) return 0;
  let peak = 0;
  for (const t of timeline) {
    if (!t) continue;
    const val = t.rawWpm ?? t.wpm;
    if (typeof val === 'number' && Number.isFinite(val) && val > 0) {
      const rounded = Math.min(999, Math.round(val));
      if (rounded > peak) peak = rounded;
    }
  }
  return peak;
}

/**
 * Calculates instantaneous peak burst velocity (WPM) across keystroke logs and timeline.
 */
export function calculateBurstWpm(
  keystrokeLog: Array<{ time: number; isError: boolean; isBackspace?: boolean }>,
  timeline?: Array<{ t: number; wpm: number; rawWpm?: number }>
): number {
  const timelineBurst = extractSafeTimelineBurst(timeline);

  if (!keystrokeLog || keystrokeLog.length === 0) {
    return timelineBurst;
  }

  const validHits = keystrokeLog.filter(
    k => k && !k.isBackspace && !k.isError && typeof k.time === 'number' && Number.isFinite(k.time)
  );
  if (validHits.length < 2) {
    return timelineBurst;
  }

  let peakBurst = 0;

  // 1. Sliding window of 5 consecutive keystrokes (4 intervals)
  if (validHits.length >= 5) {
    for (let i = 0; i <= validHits.length - 5; i++) {
      const dt = validHits[i + 4].time - validHits[i].time;
      if (dt > 0) {
        const instantWpm = Math.round((4 / 5) / (dt / 60000));
        if (instantWpm > peakBurst) peakBurst = instantWpm;
      }
    }
  }

  // 2. Sliding window for 2 to 4 keystrokes
  if (validHits.length < 5 && validHits.length >= 2) {
    const dt = validHits[validHits.length - 1].time - validHits[0].time;
    if (dt > 0) {
      const instantWpm = Math.round(((validHits.length - 1) / 5) / (dt / 60000));
      if (instantWpm > peakBurst) peakBurst = instantWpm;
    }
  }

  // 3. 1-second rolling time slice (intervals within 1000ms)
  let left = 0;
  for (let right = 1; right < validHits.length; right++) {
    while (validHits[right].time - validHits[left].time > 1000 && left < right - 1) {
      left++;
    }
    const dt = validHits[right].time - validHits[left].time;
    if (dt >= 100) {
      const intervals = right - left;
      const windowWpm = Math.round((intervals / 5) / (dt / 60000));
      if (windowWpm > peakBurst) peakBurst = windowWpm;
    }
  }

  // 4. Fallback check against timeline points
  if (timelineBurst > peakBurst) {
    peakBurst = timelineBurst;
  }

  return Number.isFinite(peakBurst) && peakBurst > 0 ? Math.min(Math.round(peakBurst), 999) : 0;
}

/**
 * Calculates earned accolade badges from session accuracy, streak, rhythm consistency, and errors.
 */
export function calculateAccolades(
  accuracy: number,
  flawlessStreak: number,
  consistency: number,
  totalWords: number,
  rawErrors: number
): AccoladeBadge[] {
  const safeAccuracy = Number.isFinite(accuracy) ? Math.max(0, Math.min(100, accuracy)) : 0;
  const safeStreak = Number.isFinite(flawlessStreak) ? Math.max(0, flawlessStreak) : 0;
  const safeConsistency = Number.isFinite(consistency) ? Math.max(0, Math.min(100, consistency)) : 0;
  const safeWords = Number.isFinite(totalWords) ? Math.max(0, totalWords) : 0;
  const safeErrors = Number.isFinite(rawErrors) ? Math.max(0, rawErrors) : 0;

  const isFlawless = safeAccuracy === 100 && safeErrors === 0 && safeStreak > 0;
  const isCenturion = safeStreak >= 100;
  const isSurgical = safeAccuracy >= 98 && (safeWords >= 50 || safeStreak >= 200);
  const isFlowState = safeConsistency >= 85 && safeAccuracy >= 95;

  return [
    {
      id: 'flawless',
      title: 'Flawless',
      desc: '100% accuracy with zero mistakes',
      description: '100% accuracy with 0 keystroke errors.',
      subtitle: 'Zero Mistakes',
      icon: 'sparkles',
      unlocked: isFlawless,
      tier: 'gold',
      progress: {
        current: isFlawless ? 100 : (safeErrors === 0 ? safeAccuracy : Math.max(0, safeAccuracy - safeErrors * 5)),
        target: 100,
        unit: safeErrors > 0 ? `${safeErrors} ERR` : '% ACC',
      },
    },
    {
      id: 'centurion',
      title: 'Centurion Streak',
      desc: 'Achieved a 100+ keystroke unbroken combo',
      description: 'Maintained an unbroken streak of 100+ flawless keystrokes.',
      subtitle: '100+ Combo',
      icon: 'shield-check',
      unlocked: isCenturion,
      tier: 'purple',
      progress: {
        current: Math.min(100, safeStreak),
        target: 100,
        unit: 'COMBO',
      },
    },
    {
      id: 'surgical',
      title: 'Surgical Precision',
      desc: '98%+ accuracy across sustained high-volume text',
      description: 'Delivered ≥98% accuracy on a full session (≥50 words).',
      subtitle: '98%+ Acc on 50+ Words',
      icon: 'crosshair',
      unlocked: isSurgical,
      tier: 'emerald',
      progress: {
        current: safeWords < 50 ? safeWords : safeAccuracy,
        target: safeWords < 50 ? 50 : 98,
        unit: safeWords < 50 ? 'WORDS' : '% ACC',
      },
    },
    {
      id: 'flow_state',
      title: 'Flow State',
      desc: 'Metronomic rhythm consistency with 95%+ accuracy',
      description: 'Achieved ≥88% rhythm consistency with steady cadence.',
      subtitle: '88%+ Rhythm',
      icon: 'waves',
      unlocked: isFlowState,
      tier: 'cyan',
      progress: {
        current: Math.min(88, safeConsistency),
        target: 88,
        unit: '% CONS',
      },
    },
  ];
}

export interface XpBreakdown {
  baseXp: number;
  flawlessBonusPct: number;
  comboBonusPct: number;
  consistencyBonusPct: number;
  totalMultiplier: number;
  totalXp: number;
}

/**
 * Calculates XP Progression and structured multiplier breakdown.
 */
export function calculateXPProgression(
  wpm: number,
  accuracy: number,
  flawlessStreak: number,
  consistency: number,
  targetLength: number,
  isDrill: boolean = false
): XpBreakdown {
  const safeWpm = Number.isFinite(wpm) ? Math.max(0, wpm) : 0;
  const safeAcc = Number.isFinite(accuracy) ? Math.min(100, Math.max(0, accuracy)) : 0;
  const safeStreak = Number.isFinite(flawlessStreak) ? Math.max(0, flawlessStreak) : 0;
  const safeCons = Number.isFinite(consistency) ? Math.min(100, Math.max(0, consistency)) : 0;
  const safeLen = Number.isFinite(targetLength) ? Math.max(0, targetLength) : 0;

  if (safeWpm <= 10 || safeAcc <= 50 || isDrill || safeLen <= 0) {
    return {
      baseXp: 0,
      flawlessBonusPct: 0,
      comboBonusPct: 0,
      consistencyBonusPct: 0,
      totalMultiplier: 1.0,
      totalXp: 0,
    };
  }

  const lengthMod = safeLen / 100;
  const baseXp = Math.floor(safeWpm * (safeAcc / 100) * lengthMod * 2);

  // Precision & Streak Multipliers
  let flawlessBonusPct = 0;
  if (safeAcc === 100) {
    flawlessBonusPct = 50; // +50% XP for 100% Flawless
  }

  let comboBonusPct = 0;
  if (safeStreak >= 200) {
    comboBonusPct = 50; // +50% XP for 200+ combo
  } else if (safeStreak >= 100) {
    comboBonusPct = 25; // +25% XP for 100+ combo
  } else if (safeStreak >= 50) {
    comboBonusPct = 10; // +10% XP for 50+ combo
  }

  let consistencyBonusPct = 0;
  if (safeCons >= 92) {
    consistencyBonusPct = 30; // +30% XP for metronome flow >= 92%
  } else if (safeCons >= 85) {
    consistencyBonusPct = 20; // +20% XP for high consistency >= 85%
  }

  const totalBonusPct = flawlessBonusPct + comboBonusPct + consistencyBonusPct;
  const totalMultiplier = +(1 + totalBonusPct / 100).toFixed(2);
  const totalXp = Math.floor((baseXp * (100 + totalBonusPct)) / 100);

  return {
    baseXp,
    flawlessBonusPct,
    comboBonusPct,
    consistencyBonusPct,
    totalMultiplier,
    totalXp,
  };
}

export interface GhostDeltaResult {
  deltaS: number;
  deltaAcc?: number;
  deltaCons?: number;
  deltaStreak?: number;
  userWon: boolean;
}

/**
 * Calculates Ghost Net rival precision, time, and streak differential metrics.
 */
export function calculateGhostDelta(
  userFinishMs: number,
  userAcc: number,
  userCons: number,
  userStreak: number,
  ghostFinishMs: number,
  ghostAcc?: number,
  ghostCons?: number,
  ghostStreak?: number
): GhostDeltaResult {
  const deltaS = +((ghostFinishMs - userFinishMs) / 1000).toFixed(2);
  const deltaAcc = ghostAcc !== undefined ? +(userAcc - ghostAcc).toFixed(1) : undefined;
  const deltaCons = ghostCons !== undefined ? +(userCons - ghostCons).toFixed(1) : undefined;
  const deltaStreak = ghostStreak !== undefined ? userStreak - ghostStreak : undefined;
  const userWon = userFinishMs <= ghostFinishMs;

  return {
    deltaS,
    deltaAcc,
    deltaCons,
    deltaStreak,
    userWon,
  };
}
