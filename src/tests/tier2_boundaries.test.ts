/**
 * Tier 2 Test Suite: Boundary & Corner Cases
 * Tests edge cases, zero values, extreme inputs, boundary thresholds, and failure cascading.
 */

import { describe, it, expect } from './testHarness.ts';
import {
  calculateCPIOracle,
  evaluateGradeOracle,
  calculateBurstWpmOracle,
  calculateXPProgressionOracle,
  calculateAccoladesOracle,
  calculateGhostDeltaOracle
} from './scoringOracle.ts';

export function registerTier2Tests(): void {
  describe('Tier 2 - Boundary 1: Zero Conditions (0 WPM, 0 Chars, 0 ms)', () => {
    it('returns CPI = 0 and Grade D when total chars is 0', () => {
      const res = calculateCPIOracle(0, 100, 0, 100, 0);
      expect(res.cpi).toBe(0);
      expect(res.grade).toBe('D');
      expect(res.baseSpeedScore).toBe(0);
    });

    it('returns CPI = 0 and Grade D when WPM is 0 despite 100% accuracy', () => {
      const res = calculateCPIOracle(0, 100, 0, 100, 50);
      expect(res.cpi).toBe(0);
      expect(res.grade).toBe('D');
    });

    it('returns 0 XP when WPM is 0', () => {
      const xp = calculateXPProgressionOracle(0, 100, 0, 100, 100);
      expect(xp.totalXp).toBe(0);
      expect(xp.baseXp).toBe(0);
    });

    it('returns 0 XP when target text length is 0', () => {
      const xp = calculateXPProgressionOracle(80, 100, 50, 90, 0);
      expect(xp.totalXp).toBe(0);
      expect(xp.baseXp).toBe(0);
    });

    it('handles negative or NaN inputs gracefully with zero clamp', () => {
      const res = calculateCPIOracle(-50, NaN, -10, NaN, -20);
      expect(res.cpi).toBe(0);
      expect(res.grade).toBe('D');
    });
  });

  describe('Tier 2 - Boundary 2: 100% Errors & 0% Accuracy Extreme', () => {
    it('applies maximum penalty and clamps CPI to 0 on 0% accuracy', () => {
      // 100 WPM, 0% Acc -> penalty = 20 * (85 - 0)/10 = 170
      const res = calculateCPIOracle(100, 0, 0, 50, 100);
      expect(res.cpi).toBe(0);
      expect(res.grade).toBe('D');
      expect(res.precisionMultiplier).toBe(0);
      expect(res.penalty).toBe(170);
    });

    it('awards 0 XP on 0% accuracy regardless of high speed', () => {
      const xp = calculateXPProgressionOracle(150, 0, 0, 90, 500);
      expect(xp.totalXp).toBe(0);
      expect(xp.baseXp).toBe(0);
    });

    it('evaluates grade D for 0% accuracy regardless of theoretical CPI', () => {
      const grade = evaluateGradeOracle(200, 0, false, 100);
      expect(grade).toBe('D');
    });

    it('leaves all accolades locked on 0% accuracy run', () => {
      const badges = calculateAccoladesOracle(0, 0, 50, 50, 50);
      const unlockedCount = badges.filter(b => b.unlocked).length;
      expect(unlockedCount).toBe(0);
    });

    it('computes negative accuracy delta correctly when user has 0% accuracy', () => {
      const delta = calculateGhostDeltaOracle(15000, 0, 50, 0, 20000, 95, 80, 50);
      expect(delta.deltaAcc).toBe(-95.0);
    });
  });

  describe('Tier 2 - Boundary 3: Backspaces Handling with Zero Errors', () => {
    it('computes correct burst WPM when log contains 100 backspaces', () => {
      const keystrokes = [
        { time: 1000, isError: false },
        { time: 1100, isError: false },
        { time: 1200, isError: false, isBackspace: true },
        { time: 1300, isError: false, isBackspace: true },
        { time: 1400, isError: false },
        { time: 1500, isError: false },
        { time: 1600, isError: false },
      ];
      const burst = calculateBurstWpmOracle(keystrokes);
      expect(burst).toBeGreaterThan(0);
    });

    it('maintains 100% accuracy and flawless status when all mistakes were erased with backspace', () => {
      // 50 words, 0 raw errors remaining, 100% net accuracy
      const badges = calculateAccoladesOracle(100, 200, 90, 50, 0);
      const flawless = badges.find(b => b.id === 'flawless');
      expect(flawless?.unlocked).toBe(true);
    });

    it('does not penalize CPI when backspaces were used but final accuracy is 100%', () => {
      const res = calculateCPIOracle(80, 100, 150, 90, 150);
      expect(res.penalty).toBe(0);
      expect(res.precisionBonus).toBe(35);
    });

    it('preserves full XP Flawless bonus (+50%) when final accuracy is 100%', () => {
      const xp = calculateXPProgressionOracle(70, 100, 120, 88, 200);
      expect(xp.flawlessBonusPct).toBe(50);
    });

    it('allows S+ grade when 100% accuracy is preserved', () => {
      const grade = evaluateGradeOracle(140, 100, true, 92);
      expect(grade).toBe('S+');
    });
  });

  describe('Tier 2 - Boundary 4: Single-Second & Micro Bursts (< 1s and = 1s)', () => {
    it('evaluates burst WPM for 2-keystroke micro burst (50ms gap)', () => {
      const keystrokes = [
        { time: 1000, isError: false },
        { time: 1050, isError: false },
      ];
      const burst = calculateBurstWpmOracle(keystrokes);
      // 1 interval in 50ms = (1/5) / (50/60000) = 240 WPM
      expect(burst).toBe(240);
    });

    it('evaluates single-interval 1-second burst without throwing', () => {
      const timeline = [{ t: 1000, wpm: 90, rawWpm: 95 }];
      const burst = calculateBurstWpmOracle([], timeline);
      expect(burst).toBe(95);
    });

    it('handles short text length of 1 word (5 characters) in CPI calculation', () => {
      const res = calculateCPIOracle(60, 100, 5, 100, 5);
      expect(res.cpi).toBeGreaterThan(0);
      // Precision bonus for chars < 20 is 0
      expect(res.precisionBonus).toBe(0);
    });

    it('handles 100ms ultra-fast test completion in ghost delta comparison', () => {
      const delta = calculateGhostDeltaOracle(500, 100, 100, 10, 1000, 95, 90, 8);
      expect(delta.deltaS).toBe(0.5);
      expect(delta.userWon).toBe(true);
    });

    it('handles single keystroke burst log safely without crash', () => {
      const keystrokes = [{ time: 1000, isError: false }];
      const burst = calculateBurstWpmOracle(keystrokes);
      expect(burst).toBe(0);
    });
  });

  describe('Tier 2 - Boundary 5: 250+ Extreme Combo Streaks', () => {
    it('awards maximum combo bonus (+15) in CPI for 250+ streak', () => {
      const res250 = calculateCPIOracle(100, 98, 250, 90, 500);
      const res500 = calculateCPIOracle(100, 98, 500, 90, 500);
      expect(res250.comboBonus).toBe(15);
      expect(res500.comboBonus).toBe(15);
    });

    it('awards maximum combo multiplier (+50%) in XP for 250+ streak', () => {
      const xp = calculateXPProgressionOracle(90, 97, 300, 85, 400);
      expect(xp.comboBonusPct).toBe(50);
    });

    it('unlocks both Centurion and Surgical Precision for 250+ combo on 98%+ acc', () => {
      const badges = calculateAccoladesOracle(99, 260, 90, 40, 1);
      expect(badges.find(b => b.id === 'centurion')?.unlocked).toBe(true);
      expect(badges.find(b => b.id === 'surgical')?.unlocked).toBe(true);
    });

    it('supports 1,000+ mega combo in long marathon test without integer overflow', () => {
      const xp = calculateXPProgressionOracle(120, 100, 1000, 95, 1200);
      expect(xp.totalXp).toBeGreaterThan(0);
      expect(Number.isSafeInteger(xp.totalXp)).toBe(true);
    });

    it('accurately captures 250+ streak delta against rival ghost', () => {
      const delta = calculateGhostDeltaOracle(60000, 100, 95, 350, 70000, 98, 90, 80);
      expect(delta.deltaStreak).toBe(270);
    });
  });

  describe('Tier 2 - Boundary 6: Rhythm Consistency Extremes (0% vs 99.9% vs 100%)', () => {
    it('applies kCons = 0.80 multiplier at 0% rhythm consistency', () => {
      const res = calculateCPIOracle(100, 100, 0, 0, 100);
      // 100 * 1.0 * (1 + (0-50)/250) = 100 * 0.8 = 80 (+ 35 prec + 0 combo + 0 flow) = 115
      expect(res.cpi).toBe(115);
    });

    it('applies kCons = 1.20 multiplier at 100% rhythm consistency', () => {
      const res = calculateCPIOracle(100, 100, 0, 100, 100);
      // 100 * 1.0 * (1 + (100-50)/250) = 100 * 1.2 = 120 (+ 35 prec + 0 combo + 5 flow) = 160
      expect(res.cpi).toBe(160);
    });

    it('awards +30% XP consistency bonus at 99.9% consistency', () => {
      const xp = calculateXPProgressionOracle(80, 96, 40, 99.9, 200);
      expect(xp.consistencyBonusPct).toBe(30);
    });

    it('awards +30% XP consistency bonus at 100% consistency', () => {
      const xp = calculateXPProgressionOracle(80, 96, 40, 100, 200);
      expect(xp.consistencyBonusPct).toBe(30);
    });

    it('awards 0% XP consistency bonus at 0% consistency', () => {
      const xp = calculateXPProgressionOracle(80, 96, 40, 0, 200);
      expect(xp.consistencyBonusPct).toBe(0);
    });
  });

  describe('Tier 2 - Boundary 7: Low Accuracy Progressive Penalty Boundary Checks', () => {
    it('applies 0 penalty at exact boundary of 85% accuracy', () => {
      const res = calculateCPIOracle(80, 85, 20, 75, 100);
      expect(res.penalty).toBe(0);
    });

    it('applies minimal penalty at 84.9% accuracy', () => {
      const res = calculateCPIOracle(80, 84.9, 20, 75, 100);
      expect(res.penalty).toBeCloseTo(0.2, 0.05);
    });

    it('applies 10-point penalty at 80% accuracy', () => {
      const res = calculateCPIOracle(80, 80, 20, 75, 100);
      expect(res.penalty).toBe(10);
    });

    it('applies 30-point penalty at 70% accuracy', () => {
      const res = calculateCPIOracle(80, 70, 20, 75, 100);
      expect(res.penalty).toBe(30);
    });

    it('never allows CPI to become negative despite massive penalty', () => {
      const res = calculateCPIOracle(20, 30, 0, 20, 50);
      expect(res.cpi).toBe(0);
      expect(res.cpi).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Tier 2 - Boundary 8: Numerical Stability & Rounding Precision', () => {
    it('returns integer CPI values without decimal bleed', () => {
      const res = calculateCPIOracle(67.33, 97.45, 43, 86.7, 189);
      expect(Number.isInteger(res.cpi)).toBe(true);
    });

    it('returns integer totalXp values in XP progression breakdown', () => {
      const xp = calculateXPProgressionOracle(73.5, 96.2, 85, 87.3, 215);
      expect(Number.isInteger(xp.totalXp)).toBe(true);
      expect(Number.isInteger(xp.baseXp)).toBe(true);
    });

    it('rounds totalMultiplier to at most 2 decimal places', () => {
      const xp = calculateXPProgressionOracle(60, 100, 120, 88, 150);
      const str = String(xp.totalMultiplier);
      const decimals = str.includes('.') ? str.split('.')[1].length : 0;
      expect(decimals).toBeLessThanOrEqual(2);
    });

    it('handles ghost delta rounding to exact 2 decimal places for seconds and 1 for percentages', () => {
      const delta = calculateGhostDeltaOracle(14333, 97.456, 88.222, 50, 16789, 94.123, 82.555, 40);
      expect(delta.deltaS).toBe(2.46);
      expect(delta.deltaAcc).toBe(3.3);
      expect(delta.deltaCons).toBe(5.7);
    });

    it('handles extremely large WPM values (e.g. 300 WPM) safely', () => {
      const res = calculateCPIOracle(300, 100, 500, 98, 1000);
      expect(res.cpi).toBeGreaterThan(300);
      expect(res.grade).toBe('S+');
      expect(Number.isSafeInteger(res.cpi)).toBe(true);
    });
  });
}
