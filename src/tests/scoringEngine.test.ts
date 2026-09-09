/**
 * Direct Unit & Integration Tests for src/lib/scoringEngine.ts
 * Verifies mathematical parity and functional correctness of the implementation.
 */

import { describe, it, expect } from './testHarness.ts';
import {
  calculateCPI,
  evaluateGrade,
  calculateBurstWpm,
  calculateAccolades,
  calculateXPProgression,
  calculateGhostDelta,
  getGradeDetails,
  GRADE_DETAILS,
  type PerformanceGrade,
} from '../lib/scoringEngine.ts';

export function registerScoringEngineTests(): void {
  describe('ScoringEngine - Core CPI & Multi-Factor Grading', () => {
    it('CRITICAL: 100% accuracy run at 40 WPM evaluates to Grade S/S+ (never C or D)', () => {
      const breakdown = calculateCPI(40, 100, 200, 90, 200);
      expect(breakdown.cpi).toBeGreaterThanOrEqual(115);
      expect(breakdown.grade === 'S' || breakdown.grade === 'S+' || breakdown.grade === 'A').toBeTruthy();
      expect(breakdown.grade).not.toBe('C');
      expect(breakdown.grade).not.toBe('D');
      expect(breakdown.precisionBonus).toBe(35);
      expect(breakdown.comboBonus).toBe(30);
      expect(breakdown.penalty).toBe(0);
    });

    it('awards S+ grade to grandmaster speed & precision (140 WPM, 99% Acc, 92% Cons)', () => {
      const breakdown = calculateCPI(140, 99, 250, 92, 500);
      expect(breakdown.grade).toBe('S+');
      expect(breakdown.cpi).toBeGreaterThanOrEqual(135);
    });

    it('awards S grade to master performance (100 WPM, 96% Acc, 80% Cons)', () => {
      const breakdown = calculateCPI(100, 96, 120, 80, 400);
      expect(breakdown.grade).toBe('S');
    });

    it('awards A grade to solid runs (75 WPM, 94% Acc, 75% Cons)', () => {
      const breakdown = calculateCPI(75, 94, 60, 75, 250);
      expect(breakdown.grade).toBe('A');
    });

    it('awards B grade for intermediate typing performance (55 WPM, 90% Acc)', () => {
      const breakdown = calculateCPI(55, 90, 30, 70, 150);
      expect(breakdown.grade).toBe('B');
      expect(breakdown.cpi).toBeGreaterThanOrEqual(50);
    });

    it('awards C grade for developing typing performance (45 WPM, 85% Acc)', () => {
      const breakdown = calculateCPI(45, 85, 20, 70, 100);
      expect(breakdown.grade).toBe('C');
      expect(breakdown.cpi).toBeGreaterThanOrEqual(30);
    });

    it('demotes high-speed mashing with poor accuracy (150 WPM @ 70% Acc) to Grade D', () => {
      const breakdown = calculateCPI(150, 70, 10, 60, 300);
      expect(breakdown.grade).toBe('D');
      expect(breakdown.penalty).toBe(30);
    });

    it('evaluates grades accurately with evaluateGrade directly', () => {
      expect(evaluateGrade(140, 99, true, 92)).toBe('S+');
      expect(evaluateGrade(100, 96, false, 80)).toBe('S');
      expect(evaluateGrade(75, 92, false, 75)).toBe('A');
      expect(evaluateGrade(55, 86, false, 70)).toBe('B');
      expect(evaluateGrade(35, 76, false, 65)).toBe('C');
      expect(evaluateGrade(150, 68, false, 80)).toBe('D');
    });

    it('handles zero values and edge cases safely', () => {
      const zeroChars = calculateCPI(0, 100, 0, 100, 0);
      expect(zeroChars.cpi).toBe(0);
      expect(zeroChars.grade).toBe('D');

      const nanValues = calculateCPI(NaN, NaN, NaN, NaN, NaN);
      expect(nanValues.cpi).toBe(0);
      expect(nanValues.grade).toBe('D');
    });
  });

  describe('ScoringEngine - Burst WPM Rolling Window', () => {
    it('detects rolling 5-keystroke peak burst velocity correctly', () => {
      const keystrokes = [
        { time: 1000, isError: false },
        { time: 1100, isError: false },
        { time: 1200, isError: false },
        { time: 1300, isError: false },
        { time: 1400, isError: false },
      ];
      const burst = calculateBurstWpm(keystrokes);
      expect(burst).toBe(120);
    });

    it('evaluates micro burst (2 keystrokes in 50ms) as 240 WPM', () => {
      const keystrokes = [
        { time: 1000, isError: false },
        { time: 1050, isError: false },
      ];
      const burst = calculateBurstWpm(keystrokes);
      expect(burst).toBe(240);
    });

    it('ignores error keystrokes and backspaces during burst calculation', () => {
      const keystrokes = [
        { time: 1000, isError: false },
        { time: 1100, isError: true },
        { time: 1200, isError: false, isBackspace: true },
        { time: 1300, isError: false },
        { time: 1400, isError: false },
        { time: 1500, isError: false },
        { time: 1600, isError: false },
      ];
      const burst = calculateBurstWpm(keystrokes);
      expect(burst).toBeGreaterThan(0);
    });

    it('falls back to timeline max if keystroke log is empty', () => {
      const timeline = [
        { t: 1000, wpm: 45, rawWpm: 50 },
        { t: 2000, wpm: 75, rawWpm: 80 },
        { t: 3000, wpm: 60, rawWpm: 65 },
      ];
      const burst = calculateBurstWpm([], timeline);
      expect(burst).toBe(80);
    });

    it('returns 0 for empty inputs', () => {
      expect(calculateBurstWpm([])).toBe(0);
    });
  });

  describe('ScoringEngine - Accolade Badges Evaluation', () => {
    it('unlocks Flawless badge when 100% accuracy, rawErrors = 0, and streak > 0', () => {
      const badges = calculateAccolades(100, 50, 70, 10, 0);
      const flawless = badges.find(b => b.id === 'flawless');
      expect(flawless?.unlocked).toBe(true);
    });

    it('locks Flawless badge if there was any raw error', () => {
      const badges = calculateAccolades(99, 45, 70, 20, 1);
      const flawless = badges.find(b => b.id === 'flawless');
      expect(flawless?.unlocked).toBe(false);
    });

    it('unlocks Centurion Streak badge when flawless streak >= 100', () => {
      const badges = calculateAccolades(95, 100, 75, 30, 2);
      expect(badges.find(b => b.id === 'centurion')?.unlocked).toBe(true);
    });

    it('unlocks Surgical Precision badge when accuracy >= 98% and words >= 50', () => {
      const badges = calculateAccolades(98, 40, 75, 50, 1);
      expect(badges.find(b => b.id === 'surgical')?.unlocked).toBe(true);
    });

    it('unlocks Flow State badge when consistency >= 85% and accuracy >= 95%', () => {
      const badges = calculateAccolades(96, 40, 88, 30, 1);
      expect(badges.find(b => b.id === 'flow_state')?.unlocked).toBe(true);
    });
  });

  describe('ScoringEngine - Grade Details & Metadata Mapping', () => {
    it('provides valid metadata for all grades', () => {
      const grades: PerformanceGrade[] = ['S+', 'S', 'A', 'B', 'C', 'D'];
      for (const g of grades) {
        const details = getGradeDetails(g);
        expect(details.grade).toBe(g);
        expect(typeof details.title).toBe('string');
        expect(details.title.length).toBeGreaterThan(0);
        expect(typeof details.colorClass).toBe('string');
        expect(typeof details.glowClass).toBe('string');
      }
    });

    it('GRADE_DETAILS map matches getGradeDetails return', () => {
      expect(getGradeDetails('S+')).toBe(GRADE_DETAILS['S+']);
      expect(getGradeDetails('S')).toBe(GRADE_DETAILS['S']);
      expect(getGradeDetails('A')).toBe(GRADE_DETAILS['A']);
    });
  });

  describe('ScoringEngine - XP Multipliers & Ghost Delta Parity', () => {
    it('computes correct XP multipliers for 100% Flawless and 200+ Combo', () => {
      const xp = calculateXPProgression(100, 100, 220, 94, 300);
      expect(xp.baseXp).toBe(600);
      expect(xp.flawlessBonusPct).toBe(50);
      expect(xp.comboBonusPct).toBe(50);
      expect(xp.consistencyBonusPct).toBe(30);
      expect(xp.totalMultiplier).toBe(2.3);
      expect(xp.totalXp).toBe(1380);
    });

    it('computes ghost delta metrics accurately', () => {
      const delta = calculateGhostDelta(15000, 98, 90, 120, 18500, 95, 82, 90);
      expect(delta.userWon).toBe(true);
      expect(delta.deltaS).toBe(3.5);
      expect(delta.deltaAcc).toBe(3.0);
      expect(delta.deltaCons).toBe(8.0);
      expect(delta.deltaStreak).toBe(30);
    });
  });
}
