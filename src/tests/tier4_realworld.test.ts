/**
 * Tier 4 Test Suite: Real-World Application Scenarios
 * Simulates complete end-to-end user testing sessions across diverse skill levels and game modes.
 */

import { describe, it, expect } from './testHarness.ts';
import {
  calculateCPIOracle,
  calculateBurstWpmOracle,
  calculateXPProgressionOracle,
  calculateAccoladesOracle,
  calculateGhostDeltaOracle
} from './scoringOracle.ts';

export function registerTier4Tests(): void {
  describe('Tier 4 - Profile 1: "The Novice Steady Learner"', () => {
    it('accurately evaluates novice user typing 10 words with careful accuracy', () => {
      // 10 words, 55 characters, 32 Net WPM, 96% Accuracy, 25 streak, 82% Consistency, 1 error
      const wpm = 32;
      const acc = 96;
      const streak = 25;
      const cons = 82;
      const chars = 55;
      const words = 10;
      const rawErrors = 1;

      // 1. CPI & Grade
      const cpi = calculateCPIOracle(wpm, acc, streak, cons, chars);
      expect(cpi.cpi).toBeGreaterThanOrEqual(40);
      expect(cpi.grade).toBe('C'); // CPI 45 evaluates to Grade C (B requires CPI >= 50)
      expect(cpi.precisionBonus).toBe(10); // 96% Acc -> +10

      // 2. XP Progression
      // Base XP = 32 * 0.96 * (55/100) * 2 = 33.79 -> 33
      const xp = calculateXPProgressionOracle(wpm, acc, streak, cons, chars);
      expect(xp.baseXp).toBe(33);
      expect(xp.flawlessBonusPct).toBe(0);
      expect(xp.comboBonusPct).toBe(0);
      expect(xp.totalXp).toBe(33);

      // 3. Accolades
      const accolades = calculateAccoladesOracle(acc, streak, cons, words, rawErrors);
      expect(accolades.find(a => a.id === 'flawless')?.unlocked).toBe(false);
      expect(accolades.find(a => a.id === 'centurion')?.unlocked).toBe(false);
    });
  });

  describe('Tier 4 - Profile 2: "The Zen Perfectionist"', () => {
    it('awards top-tier progression and accolades to high-precision slow typist', () => {
      // 50 words, 260 chars, 45 WPM, 100% Accuracy, 260 flawless streak, 93% Consistency, 0 errors
      const wpm = 45;
      const acc = 100;
      const streak = 260;
      const cons = 93;
      const chars = 260;
      const words = 50;
      const rawErrors = 0;

      // 1. CPI & Grade: 45 WPM with 100% Acc receives S+ Grade!
      const cpi = calculateCPIOracle(wpm, acc, streak, cons, chars);
      expect(cpi.cpi).toBeGreaterThanOrEqual(120);
      expect(cpi.grade).toBe('S+');
      expect(cpi.precisionBonus).toBe(35);
      expect(cpi.comboBonus).toBe(30); // 15 unbroken + 15 (>=200)
      expect(cpi.consistencyBonus).toBe(5);

      // 2. XP Multipliers
      // Base XP = 45 * 1.0 * 2.6 * 2 = 234
      // Multipliers: +50% Flawless, +50% 200+ Combo, +30% Consistency >=92% = +130% -> 2.30x
      // Total XP = 234 * 2.30 = 538 XP
      const xp = calculateXPProgressionOracle(wpm, acc, streak, cons, chars);
      expect(xp.baseXp).toBe(234);
      expect(xp.flawlessBonusPct).toBe(50);
      expect(xp.comboBonusPct).toBe(50);
      expect(xp.consistencyBonusPct).toBe(30);
      expect(xp.totalMultiplier).toBe(2.3);
      expect(xp.totalXp).toBe(538);

      // 3. Accolades: Unlocks ALL FOUR badges!
      const accolades = calculateAccoladesOracle(acc, streak, cons, words, rawErrors);
      expect(accolades.find(a => a.id === 'flawless')?.unlocked).toBe(true);
      expect(accolades.find(a => a.id === 'centurion')?.unlocked).toBe(true);
      expect(accolades.find(a => a.id === 'surgical')?.unlocked).toBe(true);
      expect(accolades.find(a => a.id === 'flow_state')?.unlocked).toBe(true);
    });
  });

  describe('Tier 4 - Profile 3: "The Competitive Esports Speedster"', () => {
    it('evaluates high-velocity 135 WPM tournament run with rapid burst velocities', () => {
      // 100 words, 520 chars, 135 WPM, 98.5% Acc, 180 streak, 89% Consistency, 4 raw errors
      const wpm = 135;
      const acc = 98.5;
      const streak = 180;
      const cons = 89;
      const chars = 520;
      const words = 100;
      const rawErrors = 4;

      // 1. CPI & Grade
      const cpi = calculateCPIOracle(wpm, acc, streak, cons, chars);
      expect(cpi.cpi).toBeGreaterThanOrEqual(160);
      expect(cpi.grade).toBe('S+');
      expect(cpi.precisionBonus).toBe(20); // 98.5% Acc -> +20

      // 2. Burst WPM Simulation: 5 hits with 60ms intervals = 4 intervals in 240ms = 200 WPM
      const keystrokes = [
        { time: 0, isError: false },
        { time: 60, isError: false },
        { time: 120, isError: false },
        { time: 180, isError: false },
        { time: 240, isError: false },
      ];
      const burst = calculateBurstWpmOracle(keystrokes);
      expect(burst).toBe(200);

      // 3. XP Progression
      // Base XP = 135 * 0.985 * 5.2 * 2 = 1382.9 -> 1382
      // Multipliers: 100+ Combo (+25%), Consistency >=85% (+20%) = +45% -> 1.45x
      // Total XP = 1382 * 1.45 = 2003 XP
      const xp = calculateXPProgressionOracle(wpm, acc, streak, cons, chars);
      expect(xp.baseXp).toBe(1382);
      expect(xp.comboBonusPct).toBe(25);
      expect(xp.consistencyBonusPct).toBe(20);
      expect(xp.totalMultiplier).toBe(1.45);
      expect(xp.totalXp).toBe(2003);

      // 4. Accolades: Unlocks Centurion, Surgical, Flow State (Flawless locked due to 4 errors)
      const accolades = calculateAccoladesOracle(acc, streak, cons, words, rawErrors);
      expect(accolades.find(a => a.id === 'flawless')?.unlocked).toBe(false);
      expect(accolades.find(a => a.id === 'centurion')?.unlocked).toBe(true);
      expect(accolades.find(a => a.id === 'surgical')?.unlocked).toBe(true);
      expect(accolades.find(a => a.id === 'flow_state')?.unlocked).toBe(true);
    });
  });

  describe('Tier 4 - Profile 4: "The Recovering Stumbler"', () => {
    it('evaluates typist who made mistakes early but regained composure', () => {
      // 50 words, 250 chars, 65 WPM, 91% Acc, max combo 35, 76% Consistency, 5 raw errors
      const wpm = 65;
      const acc = 91;
      const streak = 35;
      const cons = 76;
      const chars = 250;
      const words = 50;
      const rawErrors = 5;

      const cpi = calculateCPIOracle(wpm, acc, streak, cons, chars);
      expect(cpi.grade).toBe('B');
      expect(cpi.penalty).toBe(0);

      const xp = calculateXPProgressionOracle(wpm, acc, streak, cons, chars);
      expect(xp.baseXp).toBe(295);
      expect(xp.totalMultiplier).toBe(1.0);
      expect(xp.totalXp).toBe(295);

      const accolades = calculateAccoladesOracle(acc, streak, cons, words, rawErrors);
      expect(accolades.every(a => !a.unlocked)).toBe(true);
    });
  });

  describe('Tier 4 - Profile 5: "The Hardcore Sudden Death Master"', () => {
    it('evaluates perfect completion of complex text under high tension', () => {
      // Master snippet, 45 words, 310 chars, 85 WPM, 100% Acc, 310 streak, 91% Consistency, 0 errors
      const wpm = 85;
      const acc = 100;
      const streak = 310;
      const cons = 91;
      const chars = 310;
      const words = 45;
      const rawErrors = 0;

      const cpi = calculateCPIOracle(wpm, acc, streak, cons, chars);
      expect(cpi.grade).toBe('S+');
      expect(cpi.cpi).toBeGreaterThanOrEqual(150);

      // Base XP = 85 * 1.0 * 3.1 * 2 = 527
      // Multipliers: Flawless (+50%) + Combo 200+ (+50%) + Cons >=85% (+20%) = +120% -> 2.20x
      // Total XP = 527 * 2.20 = 1159 XP
      const xp = calculateXPProgressionOracle(wpm, acc, streak, cons, chars);
      expect(xp.baseXp).toBe(527);
      expect(xp.totalMultiplier).toBe(2.2);
      expect(xp.totalXp).toBe(1159);

      const accolades = calculateAccoladesOracle(acc, streak, cons, words, rawErrors);
      expect(accolades.find(a => a.id === 'flawless')?.unlocked).toBe(true);
      expect(accolades.find(a => a.id === 'centurion')?.unlocked).toBe(true);
      expect(accolades.find(a => a.id === 'flow_state')?.unlocked).toBe(true);
    });
  });

  describe('Tier 4 - Profile 6: "The Ghost Net Rival Showdown"', () => {
    it('evaluates close 25-word multiplayer race comparison against rival ghost', () => {
      // 25 words test (130 chars)
      // Ghost: 75 WPM, 95% Acc, 80% Cons, 75 streak, 20.0s (20000ms)
      // User:  80 WPM, 99% Acc, 88% Cons, 130 streak, 18.75s (18750ms)
      const userFinishMs = 18750;
      const userAcc = 99;
      const userCons = 88;
      const userStreak = 130;

      const ghostFinishMs = 20000;
      const ghostAcc = 95;
      const ghostCons = 80;
      const ghostStreak = 75;

      const delta = calculateGhostDeltaOracle(
        userFinishMs, userAcc, userCons, userStreak,
        ghostFinishMs, ghostAcc, ghostCons, ghostStreak
      );

      expect(delta.userWon).toBe(true);
      expect(delta.deltaS).toBe(1.25); // User 1.25s ahead
      expect(delta.deltaAcc).toBe(4.0); // +4.0% accuracy differential
      expect(delta.deltaCons).toBe(8.0); // +8.0% consistency differential
      expect(delta.deltaStreak).toBe(55); // +55 streak differential
    });
  });
}
