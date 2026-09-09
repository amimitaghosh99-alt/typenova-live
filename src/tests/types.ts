/**
 * TypeNova Precision Scoring & Progression Engine Test Suite
 * Interface & Type Definitions
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
  icon: string;
  unlocked: boolean;
}

export interface XpBreakdown {
  baseXp: number;
  flawlessBonusPct: number;
  comboBonusPct: number;
  consistencyBonusPct: number;
  totalMultiplier: number;
  totalXp: number;
}

export interface GhostDeltaResult {
  deltaS: number;
  deltaAcc?: number;
  deltaCons?: number;
  deltaStreak?: number;
  userWon: boolean;
}

export interface KeystrokeLogEntry {
  key?: string;
  expected?: string;
  time: number;
  isError: boolean;
  isBackspace?: boolean;
}

export interface TimelineEntry {
  t: number;
  wpm: number;
  rawWpm?: number;
}
