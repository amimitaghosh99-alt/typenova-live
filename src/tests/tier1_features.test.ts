/**
 * Tier 1 Test Suite: Feature Coverage
 * Validates all core scoring, grading, and RPG progression features with >= 5 test cases per feature.
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

export function registerTier1Tests(): void {
  describe('Tier 1 - Feature 1: Composite Performance Index (CPI) Formulation', () => {
    it('calculates balanced CPI for standard speed and accuracy profile', () => {
      const result = calculateCPIOracle(80, 96, 60, 80, 200);
      expect(result.cpi).toBeGreaterThan(0);
      expect(result.baseSpeedScore).toBe(80);
      expect(result.precisionBonus).toBe(10); // 96% Acc -> +10
      expect(result.comboBonus).toBe(5); // 60 streak -> +5
      expect(result.consistencyBonus).toBe(0); // 80% Cons < 85% -> 0
      expect(result.penalty).toBe(0);
    });

    it('rewards high precision with full tier bonus (+35 for 100% accuracy)', () => {
      const result = calculateCPIOracle(60, 100, 100, 80, 100);
      expect(result.precisionBonus).toBe(35);
      expect(result.precisionMultiplier).toBe(1.0);
    });

    it('applies flow state bonus (+5) when rhythm consistency is >= 85%', () => {
      const highCons = calculateCPIOracle(75, 95, 40, 88, 150);
      const normalCons = calculateCPIOracle(75, 95, 40, 80, 150);
      expect(highCons.consistencyBonus).toBe(5);
      expect(normalCons.consistencyBonus).toBe(0);
      expect(highCons.cpi).toBeGreaterThan(normalCons.cpi);
    });

    it('scales consistency multiplier linearly between 0.80 and 1.20', () => {
      const lowCons = calculateCPIOracle(100, 95, 50, 0, 200);
      const midCons = calculateCPIOracle(100, 95, 50, 50, 200);
      const maxCons = calculateCPIOracle(100, 95, 50, 100, 200);
      // kCons: 0 -> 0.8, 50 -> 1.0, 100 -> 1.2
      expect(maxCons.cpi).toBeGreaterThan(midCons.cpi);
      expect(midCons.cpi).toBeGreaterThan(lowCons.cpi);
    });

    it('applies progressive penalty for accuracy below 85%', () => {
      const res80 = calculateCPIOracle(100, 80, 20, 70, 200);
      const res70 = calculateCPIOracle(100, 70, 20, 70, 200);
      expect(res80.penalty).toBe(10); // 20 * (85 - 80) / 10 = 10
      expect(res70.penalty).toBe(30); // 20 * (85 - 70) / 10 = 30
      expect(res80.cpi).toBeGreaterThan(res70.cpi);
    });
  });

  describe('Tier 1 - Feature 2: Multi-Factor Performance Grading (S+, S, A, B, C, D)', () => {
    it('CRITICAL ACCEPTANCE CRITERION: 100% accuracy run at 40 WPM receives A or S grade (instead of C)', () => {
      // 40 WPM, 100% Accuracy, 200 chars, 200 streak, 90% consistency
      const breakdown = calculateCPIOracle(40, 100, 200, 90, 200);
      // CPI evaluates to ~116
      expect(breakdown.cpi).toBeGreaterThanOrEqual(115);
      expect(breakdown.grade === 'S' || breakdown.grade === 'S+' || breakdown.grade === 'A').toBeTruthy();
      expect(breakdown.grade).not.toBe('C');
      expect(breakdown.grade).not.toBe('D');
    });

    it('awards S+ grade to high-speed, flawless, metronome runs (135+ WPM, 99% Acc, 90% Cons)', () => {
      const breakdown = calculateCPIOracle(140, 99, 250, 92, 500);
      expect(breakdown.grade).toBe('S+');
      expect(breakdown.cpi).toBeGreaterThanOrEqual(135);
    });

    it('awards S grade to master performance with high precision (100 WPM, 96% Acc, 80% Cons)', () => {
      const breakdown = calculateCPIOracle(100, 96, 120, 80, 400);
      expect(breakdown.grade).toBe('S');
    });

    it('awards A grade to solid runs exceeding threshold (75 WPM, 94% Acc, 75% Cons)', () => {
      const breakdown = calculateCPIOracle(75, 94, 60, 75, 250);
      expect(breakdown.grade).toBe('A');
    });

    it('awards B grade for intermediate typing performance (55 WPM, 90% Acc)', () => {
      const breakdown = calculateCPIOracle(55, 90, 30, 70, 150);
      expect(breakdown.grade).toBe('B');
      expect(breakdown.cpi).toBeGreaterThanOrEqual(50);
    });

    it('awards C grade for developing typing performance (45 WPM, 85% Acc)', () => {
      const breakdown = calculateCPIOracle(45, 85, 20, 70, 100);
      expect(breakdown.grade).toBe('C');
      expect(breakdown.cpi).toBeGreaterThanOrEqual(30);
    });

    it('demotes to D grade if accuracy falls below 75% regardless of raw speed', () => {
      const gradeSpam = evaluateGradeOracle(150, 70, false, 80);
      expect(gradeSpam).toBe('D');
    });
  });

  describe('Tier 1 - Feature 3: Burst WPM Rolling Window Calculation', () => {
    it('detects rolling 5-keystroke peak burst velocity correctly', () => {
      // 5 keystrokes typed with 100ms intervals = 4 intervals in 400ms -> 120 WPM burst
      const keystrokes = [
        { time: 1000, isError: false },
        { time: 1100, isError: false },
        { time: 1200, isError: false },
        { time: 1300, isError: false },
        { time: 1400, isError: false },
      ];
      const burst = calculateBurstWpmOracle(keystrokes);
      expect(burst).toBe(120); // (4/5) / (400/60000) = 120
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
      const burst = calculateBurstWpmOracle(keystrokes);
      expect(burst).toBeGreaterThan(0);
    });

    it('detects peak burst in a long variable speed session', () => {
      // Start slow (300ms per char), then fast burst (60ms per char), then slow
      const keystrokes = [
        { time: 0, isError: false },
        { time: 300, isError: false },
        { time: 600, isError: false },
        { time: 900, isError: false },
        // Burst section: 5 chars with 60ms gaps = 4 intervals in 240ms -> 200 WPM
        { time: 1000, isError: false },
        { time: 1060, isError: false },
        { time: 1120, isError: false },
        { time: 1180, isError: false },
        { time: 1240, isError: false },
        // Cool down
        { time: 1600, isError: false },
        { time: 2000, isError: false },
      ];
      const burst = calculateBurstWpmOracle(keystrokes);
      expect(burst).toBe(200);
    });

    it('falls back to timeline max if keystroke log has fewer than 2 entries', () => {
      const timeline = [
        { t: 1000, wpm: 45, rawWpm: 50 },
        { t: 2000, wpm: 75, rawWpm: 80 },
        { t: 3000, wpm: 60, rawWpm: 65 },
      ];
      const burst = calculateBurstWpmOracle([], timeline);
      expect(burst).toBe(80);
    });

    it('returns 0 when keystrokes and timeline are both empty', () => {
      const burst = calculateBurstWpmOracle([]);
      expect(burst).toBe(0);
    });
  });

  describe('Tier 1 - Feature 4: RPG Progression XP Multipliers & Structured Breakdown', () => {
    it('computes accurate Base XP from WPM, Accuracy, and Target Text Length', () => {
      // 50 WPM, 100% Acc, 100 chars -> 50 * 1.0 * (100/100) * 2 = 100 Base XP
      const res = calculateXPProgressionOracle(50, 100, 20, 70, 100);
      expect(res.baseXp).toBe(100);
    });

    it('awards +50% XP Flawless Bonus on 100% accuracy runs', () => {
      // 60 WPM, 100% Acc, 100 chars -> Base 120 XP -> Flawless +50% -> 180 Total XP
      const res = calculateXPProgressionOracle(60, 100, 30, 70, 100);
      expect(res.flawlessBonusPct).toBe(50);
      expect(res.totalMultiplier).toBe(1.5);
      expect(res.totalXp).toBe(180);
    });

    it('applies combo milestone bonuses correctly (+10%, +25%, +50%)', () => {
      const c50 = calculateXPProgressionOracle(50, 95, 55, 70, 100);
      const c100 = calculateXPProgressionOracle(50, 95, 110, 70, 100);
      const c200 = calculateXPProgressionOracle(50, 95, 210, 70, 100);

      expect(c50.comboBonusPct).toBe(10);
      expect(c100.comboBonusPct).toBe(25);
      expect(c200.comboBonusPct).toBe(50);
    });

    it('applies metronome rhythm consistency bonus (+20% for >=85%, +30% for >=92%)', () => {
      const cons88 = calculateXPProgressionOracle(50, 95, 30, 88, 100);
      const cons94 = calculateXPProgressionOracle(50, 95, 30, 94, 100);

      expect(cons88.consistencyBonusPct).toBe(20);
      expect(cons94.consistencyBonusPct).toBe(30);
    });

    it('stacks all multipliers simultaneously for an elite performance', () => {
      // 100 WPM, 100% Acc, 220 combo, 94% consistency, 300 chars
      // Base XP = 100 * 1.0 * (300/100) * 2 = 600
      // Multipliers: Flawless (+50%) + Combo (+50%) + Consistency (+30%) = +130% -> 2.30x
      // Total XP = 600 * 2.30 = 1380 XP
      const res = calculateXPProgressionOracle(100, 100, 220, 94, 300);
      expect(res.baseXp).toBe(600);
      expect(res.flawlessBonusPct).toBe(50);
      expect(res.comboBonusPct).toBe(50);
      expect(res.consistencyBonusPct).toBe(30);
      expect(res.totalMultiplier).toBe(2.3);
      expect(res.totalXp).toBe(1380);
    });

    it('returns 0 XP when speed is <= 10 WPM, accuracy <= 50%, or isDrill is true', () => {
      const lowSpeed = calculateXPProgressionOracle(8, 98, 20, 80, 100);
      const lowAcc = calculateXPProgressionOracle(80, 45, 20, 80, 100);
      const drill = calculateXPProgressionOracle(80, 98, 50, 85, 100, true);

      expect(lowSpeed.totalXp).toBe(0);
      expect(lowAcc.totalXp).toBe(0);
      expect(drill.totalXp).toBe(0);
    });
  });

  describe('Tier 1 - Feature 5: Combo Milestone Tiers (50+, 100+, 200+)', () => {
    it('awards 0% combo bonus below 50 streak', () => {
      const res = calculateXPProgressionOracle(60, 95, 49, 70, 100);
      expect(res.comboBonusPct).toBe(0);
    });

    it('activates Tier 1 combo multiplier (+10%) at exactly 50 streak', () => {
      const res = calculateXPProgressionOracle(60, 95, 50, 70, 100);
      expect(res.comboBonusPct).toBe(10);
    });

    it('activates Tier 2 combo multiplier (+25%) at exactly 100 streak', () => {
      const res = calculateXPProgressionOracle(60, 95, 100, 70, 100);
      expect(res.comboBonusPct).toBe(25);
    });

    it('activates Tier 3 combo multiplier (+50%) at exactly 200 streak', () => {
      const res = calculateXPProgressionOracle(60, 95, 200, 70, 100);
      expect(res.comboBonusPct).toBe(50);
    });

    it('maintains Tier 3 multiplier for mega streaks beyond 200', () => {
      const res = calculateXPProgressionOracle(60, 95, 450, 70, 100);
      expect(res.comboBonusPct).toBe(50);
    });
  });

  describe('Tier 1 - Feature 6: Rhythm Consistency & Flow State System', () => {
    it('awards no bonus when rhythm consistency is below 85%', () => {
      const res = calculateXPProgressionOracle(60, 95, 20, 84.9, 100);
      expect(res.consistencyBonusPct).toBe(0);
    });

    it('awards +20% bonus when rhythm consistency is exactly 85%', () => {
      const res = calculateXPProgressionOracle(60, 95, 20, 85.0, 100);
      expect(res.consistencyBonusPct).toBe(20);
    });

    it('awards +20% bonus in the 85% to 91.9% consistency range', () => {
      const res = calculateXPProgressionOracle(60, 95, 20, 91.5, 100);
      expect(res.consistencyBonusPct).toBe(20);
    });

    it('awards +30% metronome master bonus when consistency reaches >= 92%', () => {
      const res = calculateXPProgressionOracle(60, 95, 20, 92.0, 100);
      expect(res.consistencyBonusPct).toBe(30);
    });

    it('awards +30% bonus for near-perfect 99% consistency', () => {
      const res = calculateXPProgressionOracle(60, 95, 20, 99.0, 100);
      expect(res.consistencyBonusPct).toBe(30);
    });
  });

  describe('Tier 1 - Feature 7: Accolade Badges Evaluation', () => {
    it('unlocks Flawless badge only when 100% accuracy, rawErrors = 0, and streak > 0', () => {
      const badges = calculateAccoladesOracle(100, 50, 70, 10, 0);
      const flawless = badges.find(b => b.id === 'flawless');
      expect(flawless?.unlocked).toBe(true);
    });

    it('locks Flawless badge if there was any raw error even with high accuracy', () => {
      const badges = calculateAccoladesOracle(99, 45, 70, 20, 1);
      const flawless = badges.find(b => b.id === 'flawless');
      expect(flawless?.unlocked).toBe(false);
    });

    it('unlocks Centurion Streak badge when flawless streak is >= 100', () => {
      const badges100 = calculateAccoladesOracle(95, 100, 75, 30, 2);
      const badges99 = calculateAccoladesOracle(95, 99, 75, 30, 2);
      expect(badges100.find(b => b.id === 'centurion')?.unlocked).toBe(true);
      expect(badges99.find(b => b.id === 'centurion')?.unlocked).toBe(false);
    });

    it('unlocks Surgical Precision badge when accuracy >= 98% and words >= 50', () => {
      const badges50 = calculateAccoladesOracle(98, 40, 75, 50, 1);
      const badges25 = calculateAccoladesOracle(98, 40, 75, 25, 1);
      expect(badges50.find(b => b.id === 'surgical')?.unlocked).toBe(true);
      expect(badges25.find(b => b.id === 'surgical')?.unlocked).toBe(false);
    });

    it('unlocks Flow State badge when consistency >= 85% and accuracy >= 95%', () => {
      const badgesUnlocked = calculateAccoladesOracle(96, 40, 88, 30, 1);
      const badgesLowAcc = calculateAccoladesOracle(90, 40, 88, 30, 3);
      const badgesLowCons = calculateAccoladesOracle(96, 40, 80, 30, 1);

      expect(badgesUnlocked.find(b => b.id === 'flow_state')?.unlocked).toBe(true);
      expect(badgesLowAcc.find(b => b.id === 'flow_state')?.unlocked).toBe(false);
      expect(badgesLowCons.find(b => b.id === 'flow_state')?.unlocked).toBe(false);
    });
  });

  describe('Tier 1 - Feature 8: Ghost Net Rival Precision & Streak Delta', () => {
    it('calculates positive delta when user beats ghost in time, accuracy, and consistency', () => {
      // User: 15.0s, 98% Acc, 90% Cons, 120 streak vs Ghost: 18.5s, 95% Acc, 82% Cons, 90 streak
      const delta = calculateGhostDeltaOracle(15000, 98, 90, 120, 18500, 95, 82, 90);
      expect(delta.userWon).toBe(true);
      expect(delta.deltaS).toBe(3.5); // User 3.5s faster
      expect(delta.deltaAcc).toBe(3.0);
      expect(delta.deltaCons).toBe(8.0);
      expect(delta.deltaStreak).toBe(30);
    });

    it('calculates negative delta when user is slower than ghost', () => {
      const delta = calculateGhostDeltaOracle(20000, 95, 80, 50, 18000, 96, 85, 80);
      expect(delta.userWon).toBe(false);
      expect(delta.deltaS).toBe(-2.0);
      expect(delta.deltaAcc).toBe(-1.0);
      expect(delta.deltaCons).toBe(-5.0);
      expect(delta.deltaStreak).toBe(-30);
    });

    it('handles legacy ghosts with missing accuracy and consistency gracefully', () => {
      const delta = calculateGhostDeltaOracle(15000, 98, 90, 100, 17000);
      expect(delta.userWon).toBe(true);
      expect(delta.deltaS).toBe(2.0);
      expect(delta.deltaAcc).toBeUndefined();
      expect(delta.deltaCons).toBeUndefined();
      expect(delta.deltaStreak).toBeUndefined();
    });

    it('accurately identifies win on exact tie timestamps', () => {
      const delta = calculateGhostDeltaOracle(15000, 100, 90, 100, 15000, 100, 90, 100);
      expect(delta.userWon).toBe(true);
      expect(delta.deltaS).toBe(0);
      expect(delta.deltaAcc).toBe(0);
    });

    it('correctly reports user having superior accuracy despite losing on time', () => {
      // User typed slower (22s vs 18s) but with 100% precision vs ghost 85%
      const delta = calculateGhostDeltaOracle(22000, 100, 92, 150, 18000, 85, 70, 40);
      expect(delta.userWon).toBe(false);
      expect(delta.deltaS).toBe(-4.0);
      expect(delta.deltaAcc).toBe(15.0);
      expect(delta.deltaCons).toBe(22.0);
      expect(delta.deltaStreak).toBe(110);
    });
  });
}
