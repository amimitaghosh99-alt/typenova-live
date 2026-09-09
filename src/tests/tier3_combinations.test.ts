/**
 * Tier 3 Test Suite: Cross-Feature Combinations
 * Validates complex pairwise and multi-way interactions across scoring, grading, XP, and accolades.
 */

import { describe, it, expect } from './testHarness.ts';
import {
  calculateCPIOracle,
  calculateXPProgressionOracle,
  calculateAccoladesOracle,
  calculateGhostDeltaOracle
} from './scoringOracle.ts';

export function registerTier3Tests(): void {
  describe('Tier 3 - Combination 1: Flawless + Metronome Consistency + Centurion Streak', () => {
    it('stacks all three maximum XP multipliers for an unbroken run', () => {
      // 80 WPM, 100% Acc, 150 Streak, 94% Consistency, 200 Chars
      // Base XP = 80 * 1.0 * (200/100) * 2 = 320
      // Multipliers: Flawless (+50%) + 100+ Combo (+25%) + Consistency >=92% (+30%) = +105% (2.05x)
      // Total XP = 320 * 2.05 = 656
      const xp = calculateXPProgressionOracle(80, 100, 150, 94, 200);
      expect(xp.baseXp).toBe(320);
      expect(xp.flawlessBonusPct).toBe(50);
      expect(xp.comboBonusPct).toBe(25);
      expect(xp.consistencyBonusPct).toBe(30);
      expect(xp.totalMultiplier).toBe(2.05);
      expect(xp.totalXp).toBe(656);
    });

    it('simultaneously stacks all precision, combo, and flow state bonuses in CPI', () => {
      // 80 WPM, 100% Acc, 150 Streak, 94% Consistency, 200 Chars
      // kCons = 1 + (94-50)/250 = 1.176 -> Base Speed = 80 * 1.176 = 94.08
      // Precision Bonus = +35
      // Combo Bonus = +10 (streak >= 100) + 0 (streak < chars so not unbroken chars)
      // Flow Bonus = +5 (Cons >= 85)
      // Total CPI = round(94.08 + 35 + 10 + 5) = 144 -> Grade S+
      const cpi = calculateCPIOracle(80, 100, 150, 94, 200);
      expect(cpi.precisionBonus).toBe(35);
      expect(cpi.comboBonus).toBe(10);
      expect(cpi.consistencyBonus).toBe(5);
      expect(cpi.grade).toBe('S+');
    });

    it('unlocks Flawless, Centurion, and Flow State accolades in the same session', () => {
      const accolades = calculateAccoladesOracle(100, 150, 94, 40, 0);
      expect(accolades.find(a => a.id === 'flawless')?.unlocked).toBe(true);
      expect(accolades.find(a => a.id === 'centurion')?.unlocked).toBe(true);
      expect(accolades.find(a => a.id === 'flow_state')?.unlocked).toBe(true);
    });
  });

  describe('Tier 3 - Combination 2: High Speed + Low Accuracy (Mash / Spam Behavior)', () => {
    it('demotes 140 WPM spammer with 70% accuracy to Grade D', () => {
      const cpi = calculateCPIOracle(140, 70, 15, 60, 300);
      expect(cpi.grade).toBe('D');
      expect(cpi.penalty).toBe(30); // 20 * (85 - 70) / 10 = 30
      // Precision Multiplier = 0.70^2 = 0.49
      expect(cpi.precisionMultiplier).toBe(0.49);
    });

    it('blocks high-tier accolades for high speed runs with poor precision', () => {
      const accolades = calculateAccoladesOracle(70, 15, 60, 60, 45);
      expect(accolades.find(a => a.id === 'flawless')?.unlocked).toBe(false);
      expect(accolades.find(a => a.id === 'centurion')?.unlocked).toBe(false);
      expect(accolades.find(a => a.id === 'surgical')?.unlocked).toBe(false);
      expect(accolades.find(a => a.id === 'flow_state')?.unlocked).toBe(false);
    });

    it('disqualifies XP gain completely if accuracy falls below 50%', () => {
      const xp = calculateXPProgressionOracle(140, 48, 10, 60, 300);
      expect(xp.totalXp).toBe(0);
      expect(xp.baseXp).toBe(0);
    });
  });

  describe('Tier 3 - Combination 3: Sudden Death Abort Scenario', () => {
    it('evaluates early sudden death failure safely without NaN or crash', () => {
      // User failed on character 15 with 1 error, 0 combo remaining
      const cpi = calculateCPIOracle(45, 93, 0, 50, 15);
      expect(cpi.cpi).toBeGreaterThanOrEqual(0);
      expect(cpi.penalty).toBe(0);
      expect(Number.isFinite(cpi.cpi)).toBe(true);
    });

    it('locks Flawless accolade upon sudden death error', () => {
      const accolades = calculateAccoladesOracle(93, 0, 50, 3, 1);
      expect(accolades.find(a => a.id === 'flawless')?.unlocked).toBe(false);
    });

    it('awards 0 XP for very short aborted tests (<10 chars / <= 10 WPM)', () => {
      const xp = calculateXPProgressionOracle(8, 90, 0, 50, 15);
      expect(xp.totalXp).toBe(0);
    });
  });

  describe('Tier 3 - Combination 4: Low Speed + 100% Precision (The 40 WPM Golden Scenario)', () => {
    it('evaluates 40 WPM @ 100% Accuracy to Grade S / S+ across all engine facets', () => {
      // 40 WPM, 100% Acc, 200 Streak, 90% Consistency, 200 Chars
      const cpi = calculateCPIOracle(40, 100, 200, 90, 200);
      expect(cpi.cpi).toBeGreaterThanOrEqual(115);
      expect(cpi.grade === 'S' || cpi.grade === 'S+').toBe(true);
      expect(cpi.precisionBonus).toBe(35);
      expect(cpi.comboBonus).toBe(30); // 15 unbroken + 15 (>=200)
    });

    it('awards full +120% XP multiplier for 40 WPM flawless test', () => {
      // Base XP = 40 * 1.0 * (200/100) * 2 = 160
      // Multipliers: Flawless (+50%) + Combo 200 (+50%) + Consistency 90 (+20%) = +120% -> 2.20x
      // Total XP = 160 * 2.20 = 352 XP
      const xp = calculateXPProgressionOracle(40, 100, 200, 90, 200);
      expect(xp.baseXp).toBe(160);
      expect(xp.totalMultiplier).toBe(2.2);
      expect(xp.totalXp).toBe(352);
    });

    it('unlocks 3 accolades (Flawless, Centurion, Flow State) for 40 WPM flawless test', () => {
      const accolades = calculateAccoladesOracle(100, 200, 90, 40, 0);
      expect(accolades.find(a => a.id === 'flawless')?.unlocked).toBe(true);
      expect(accolades.find(a => a.id === 'centurion')?.unlocked).toBe(true);
      expect(accolades.find(a => a.id === 'flow_state')?.unlocked).toBe(true);
    });
  });

  describe('Tier 3 - Combination 5: Micro-Drills and Custom Mode Modifiers', () => {
    it('bypasses XP awards entirely when isDrill = true', () => {
      const xp = calculateXPProgressionOracle(100, 100, 200, 95, 200, true);
      expect(xp.totalXp).toBe(0);
      expect(xp.baseXp).toBe(0);
      expect(xp.totalMultiplier).toBe(1.0);
    });

    it('still evaluates CPI and Grade accurately during micro-drills', () => {
      const cpi = calculateCPIOracle(85, 98, 90, 88, 100);
      expect(cpi.cpi).toBeGreaterThan(0);
      expect(cpi.grade).toBe('S');
    });

    it('evaluates accolades properly during practice sessions', () => {
      const accolades = calculateAccoladesOracle(100, 100, 90, 25, 0);
      expect(accolades.find(a => a.id === 'flawless')?.unlocked).toBe(true);
      expect(accolades.find(a => a.id === 'centurion')?.unlocked).toBe(true);
    });
  });

  describe('Tier 3 - Combination 6: Ghost Net Rival Multi-Metric Inversion', () => {
    it('handles scenario where user has faster time but lower accuracy', () => {
      // User: 15s, 92% Acc, 80% Cons vs Ghost: 18s, 98% Acc, 90% Cons
      const delta = calculateGhostDeltaOracle(15000, 92, 80, 40, 18000, 98, 90, 100);
      expect(delta.userWon).toBe(true);
      expect(delta.deltaS).toBe(3.0);
      expect(delta.deltaAcc).toBe(-6.0);
      expect(delta.deltaCons).toBe(-10.0);
      expect(delta.deltaStreak).toBe(-60);
    });

    it('handles scenario where user has slower time but higher accuracy and consistency', () => {
      // User: 20s, 100% Acc, 95% Cons vs Ghost: 17s, 88% Acc, 75% Cons
      const delta = calculateGhostDeltaOracle(20000, 100, 95, 120, 17000, 88, 75, 50);
      expect(delta.userWon).toBe(false);
      expect(delta.deltaS).toBe(-3.0);
      expect(delta.deltaAcc).toBe(12.0);
      expect(delta.deltaCons).toBe(20.0);
      expect(delta.deltaStreak).toBe(70);
    });
  });
}
