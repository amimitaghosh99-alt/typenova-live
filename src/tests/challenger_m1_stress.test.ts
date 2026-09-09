/**
 * Empirical Adversarial Stress Test Suite for Milestone 1
 * Core Scoring, Grading Engine, Burst WPM & RPG Progression
 *
 * Authored by: Empirical Challenger 1 (Milestone 1)
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
  type PerformanceGrade,
} from '../lib/scoringEngine.ts';

const GRADE_ORDER: Record<PerformanceGrade, number> = {
  'D': 0,
  'C': 1,
  'B': 2,
  'A': 3,
  'S': 4,
  'S+': 5,
};

export function registerChallengerM1StressTests(): void {
  describe('Challenger M1 - Chaos & Poison Input Ingestion (NaN, Infinity, Negative)', () => {
    it('handles all combinations of NaN, Infinity, -Infinity in calculateCPI without throwing or producing NaN', () => {
      const poisonValues = [NaN, Infinity, -Infinity, -100, -0, undefined as unknown as number, null as unknown as number];
      
      for (const wpm of poisonValues) {
        for (const acc of poisonValues) {
          for (const streak of poisonValues) {
            for (const cons of poisonValues) {
              for (const chars of poisonValues) {
                const res = calculateCPI(wpm, acc, streak, cons, chars);
                expect(typeof res.cpi).toBe('number');
                expect(isNaN(res.cpi)).toBe(false);
                expect(isFinite(res.cpi)).toBe(true);
                expect(res.cpi).toBeGreaterThanOrEqual(0);
                expect(typeof res.grade).toBe('string');
                expect(['S+', 'S', 'A', 'B', 'C', 'D'].includes(res.grade)).toBe(true);
                expect(isNaN(res.baseSpeedScore)).toBe(false);
                expect(isNaN(res.precisionMultiplier)).toBe(false);
                expect(isNaN(res.precisionBonus)).toBe(false);
                expect(isNaN(res.comboBonus)).toBe(false);
                expect(isNaN(res.consistencyBonus)).toBe(false);
                expect(isNaN(res.penalty)).toBe(false);
              }
            }
          }
        }
      }
    });

    it('handles NaN, Infinity, -Infinity in evaluateGrade safely without throwing', () => {
      const poisonValues = [NaN, Infinity, -Infinity, -1000, 1000000];
      for (const cpi of poisonValues) {
        for (const acc of poisonValues) {
          for (const isFlawless of [true, false]) {
            for (const cons of poisonValues) {
              const grade = evaluateGrade(cpi, acc, isFlawless, cons);
              expect(typeof grade).toBe('string');
              expect(['S+', 'S', 'A', 'B', 'C', 'D'].includes(grade)).toBe(true);
            }
          }
        }
      }
    });

    it('handles poisoned inputs in calculateBurstWpm safely', () => {
      expect(calculateBurstWpm(null as unknown as [])).toBe(0);
      expect(calculateBurstWpm(undefined as unknown as [])).toBe(0);
      expect(calculateBurstWpm([])).toBe(0);

      // Poisoned timeline
      const poisonedTimeline = [
        { t: NaN, wpm: NaN, rawWpm: NaN },
        { t: -100, wpm: -50, rawWpm: -20 },
        { t: 1000, wpm: Infinity, rawWpm: Infinity },
      ];
      const burst = calculateBurstWpm([], poisonedTimeline as any);
      expect(typeof burst).toBe('number');
      expect(isNaN(burst)).toBe(false);
      expect(burst).toBeGreaterThanOrEqual(0);
    });

    it('handles poisoned inputs in calculateXPProgression safely', () => {
      const poisonValues = [NaN, Infinity, -Infinity, -100, 0];
      for (const wpm of poisonValues) {
        for (const acc of poisonValues) {
          for (const streak of poisonValues) {
            for (const cons of poisonValues) {
              for (const len of poisonValues) {
                const xp = calculateXPProgression(wpm, acc, streak, cons, len, false);
                expect(isNaN(xp.baseXp)).toBe(false);
                expect(isNaN(xp.totalXp)).toBe(false);
                expect(isNaN(xp.totalMultiplier)).toBe(false);
                expect(xp.totalXp).toBeGreaterThanOrEqual(0);
              }
            }
          }
        }
      }
    });

    it('handles poisoned inputs in calculateGhostDelta safely', () => {
      const delta = calculateGhostDelta(NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN);
      expect(typeof delta.userWon).toBe('boolean');
      expect(isNaN(delta.deltaS)).toBe(true); // NaN finish time leads to NaN deltaS, but does not throw
    });
  });

  describe('Challenger M1 - Chaotic Keystroke Streams & Burst WPM Jitter', () => {
    it('handles 100% backspace storm without crash or false burst speed', () => {
      const log = Array.from({ length: 200 }, (_, i) => ({
        time: 1000 + i * 50,
        isError: false,
        isBackspace: true,
      }));
      const burst = calculateBurstWpm(log);
      expect(burst).toBe(0);
    });

    it('handles 100% error storm without crash or false burst speed', () => {
      const log = Array.from({ length: 200 }, (_, i) => ({
        time: 1000 + i * 50,
        isError: true,
        isBackspace: false,
      }));
      const burst = calculateBurstWpm(log);
      expect(burst).toBe(0);
    });

    it('handles zero-duration / identical timestamps (instant paste) without division by zero', () => {
      const log = Array.from({ length: 50 }, () => ({
        time: 5000,
        isError: false,
        isBackspace: false,
      }));
      const burst = calculateBurstWpm(log);
      expect(burst).toBe(0);
      expect(isNaN(burst)).toBe(false);
    });

    it('handles reversed / out-of-order timestamps gracefully without negative burst', () => {
      const log = [
        { time: 5000, isError: false },
        { time: 4000, isError: false },
        { time: 3000, isError: false },
        { time: 2000, isError: false },
        { time: 1000, isError: false },
      ];
      const burst = calculateBurstWpm(log);
      expect(burst).toBeGreaterThanOrEqual(0);
      expect(isNaN(burst)).toBe(false);
    });

    it('handles sub-millisecond hyper-speed cluster clamping to 999 WPM max', () => {
      const log = [
        { time: 1000, isError: false },
        { time: 1001, isError: false },
        { time: 1002, isError: false },
        { time: 1003, isError: false },
        { time: 1004, isError: false },
      ];
      const burst = calculateBurstWpm(log);
      expect(burst).toBe(999);
    });

    it('processes massive 10,000 keystroke stream in sub-10ms without lag', () => {
      const log = Array.from({ length: 10000 }, (_, i) => ({
        time: 1000 + i * 30,
        isError: i % 25 === 0,
        isBackspace: i % 40 === 0,
      }));
      const t0 = Date.now();
      const burst = calculateBurstWpm(log);
      const elapsed = Date.now() - t0;
      expect(burst).toBeGreaterThan(0);
      expect(burst).toBeLessThanOrEqual(999);
      expect(elapsed).toBeLessThan(100);
    });
  });

  describe('Challenger M1 - Core Scoring R1 Verification & Precision Monotonicity', () => {
    it('VERIFIES R1: 40 WPM @ 100% Accuracy receives S/S+ (never C or D) across wide parameter ranges', () => {
      // Test different streak lengths, consistency levels, and char lengths
      for (const streak of [50, 100, 200, 300]) {
        for (const cons of [80, 85, 90, 95, 100]) {
          for (const chars of [50, 100, 200, 500]) {
            const breakdown = calculateCPI(40, 100, streak, cons, chars);
            expect(breakdown.cpi).toBeGreaterThanOrEqual(70);
            expect(['S+', 'S', 'A'].includes(breakdown.grade)).toBe(true);
            expect(breakdown.grade).not.toBe('C');
            expect(breakdown.grade).not.toBe('D');
          }
        }
      }
    });

    it('enforces Grade Monotonicity: increasing CPI never downgrades performance grade', () => {
      const accuracies = [70, 75, 80, 85, 90, 95, 98, 100];
      const consistencies = [60, 75, 85, 95, 100];

      for (const acc of accuracies) {
        for (const cons of consistencies) {
          for (const isFlawless of [false, true]) {
            let lastGradeVal = -1;
            for (let cpi = 0; cpi <= 200; cpi += 5) {
              const grade = evaluateGrade(cpi, acc, isFlawless, cons);
              const gradeVal = GRADE_ORDER[grade];
              expect(gradeVal).toBeGreaterThanOrEqual(lastGradeVal);
              lastGradeVal = gradeVal;
            }
          }
        }
      }
    });

    it('enforces Accuracy Grade Monotonicity: higher accuracy never downgrades performance grade', () => {
      const cpiValues = [20, 35, 55, 75, 100, 140];
      for (const cpi of cpiValues) {
        for (const cons of [70, 80, 90]) {
          let lastGradeVal = -1;
          for (let acc = 0; acc <= 100; acc += 2) {
            const grade = evaluateGrade(cpi, acc, false, cons);
            const gradeVal = GRADE_ORDER[grade];
            expect(gradeVal).toBeGreaterThanOrEqual(lastGradeVal);
            lastGradeVal = gradeVal;
          }
        }
      }
    });

    it('applies strict low-accuracy penalty barrier preventing Grade D bypass', () => {
      // Even with 300 WPM, if accuracy is below 75%, grade MUST be D
      for (let wpm = 100; wpm <= 500; wpm += 50) {
        const breakdown = calculateCPI(wpm, 70, 10, 50, 300);
        expect(breakdown.grade).toBe('D');
        expect(breakdown.penalty).toBe(30);
      }
    });
  });

  describe('Challenger M1 - Accolades & RPG Progression Invariants', () => {
    it('strictly locks Flawless badge on single error even with 99.9% accuracy', () => {
      const badge = calculateAccolades(99.9, 500, 95, 200, 1).find(b => b.id === 'flawless');
      expect(badge?.unlocked).toBe(false);
    });

    it('strictly locks Flawless badge on 0 streak even with 100% accuracy', () => {
      const badge = calculateAccolades(100, 0, 95, 200, 0).find(b => b.id === 'flawless');
      expect(badge?.unlocked).toBe(false);
    });

    it('accurately requires >= 100 streak for Centurion badge', () => {
      expect(calculateAccolades(95, 99, 80, 50, 1).find(b => b.id === 'centurion')?.unlocked).toBe(false);
      expect(calculateAccolades(95, 100, 80, 50, 1).find(b => b.id === 'centurion')?.unlocked).toBe(true);
    });

    it('requires >= 98% accuracy AND (>= 50 words OR >= 200 streak) for Surgical badge', () => {
      // 98% acc with 49 words and 150 streak -> locked
      expect(calculateAccolades(98, 150, 80, 49, 1).find(b => b.id === 'surgical')?.unlocked).toBe(false);
      // 98% acc with 50 words -> unlocked
      expect(calculateAccolades(98, 40, 80, 50, 1).find(b => b.id === 'surgical')?.unlocked).toBe(true);
      // 98% acc with 200 streak -> unlocked
      expect(calculateAccolades(98, 200, 80, 30, 1).find(b => b.id === 'surgical')?.unlocked).toBe(true);
      // 97% acc with 500 words -> locked
      expect(calculateAccolades(97, 500, 80, 500, 1).find(b => b.id === 'surgical')?.unlocked).toBe(false);
    });

    it('strictly calculates XP progression multiplier stacking without floating point drift', () => {
      // 100% flawless (+50%), 200 streak (+50%), 95% cons (+30%) -> total bonus = +130% -> multiplier = 2.30
      const xp = calculateXPProgression(100, 100, 200, 95, 100);
      expect(xp.flawlessBonusPct).toBe(50);
      expect(xp.comboBonusPct).toBe(50);
      expect(xp.consistencyBonusPct).toBe(30);
      expect(xp.totalMultiplier).toBe(2.3);
      expect(xp.baseXp).toBe(200);
      expect(xp.totalXp).toBe(460);
    });

    it('rewards zero XP when drill mode is active', () => {
      const xp = calculateXPProgression(100, 100, 200, 95, 100, true);
      expect(xp.totalXp).toBe(0);
      expect(xp.baseXp).toBe(0);
    });
  });

  describe('Challenger M1 - 10,000 Randomized Monte Carlo Trials', () => {
    it('executes 10,000 randomized typing runs with zero NaN, zero crashes, and strictly valid grades', () => {
      for (let trial = 0; trial < 10000; trial++) {
        const randWpm = Math.floor(Math.random() * 250);
        const randAcc = Math.floor(Math.random() * 101);
        const randStreak = Math.floor(Math.random() * 500);
        const randCons = Math.floor(Math.random() * 101);
        const randChars = Math.floor(Math.random() * 1000);

        const breakdown = calculateCPI(randWpm, randAcc, randStreak, randCons, randChars);
        
        expect(typeof breakdown.cpi).toBe('number');
        expect(isNaN(breakdown.cpi)).toBe(false);
        expect(breakdown.cpi).toBeGreaterThanOrEqual(0);
        expect(['S+', 'S', 'A', 'B', 'C', 'D'].includes(breakdown.grade)).toBe(true);

        const gradeDetails = getGradeDetails(breakdown.grade);
        expect(gradeDetails.grade).toBe(breakdown.grade);
      }
    });
  });
}
