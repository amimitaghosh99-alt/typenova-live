/**
 * Unit & Integration Tests for src/lib/ikiEngine.ts
 * Verifies IKI calculation, pause filtration, fluidity index, and digraph classification.
 */

import { describe, it, expect } from './testHarness.ts';
import {
  calculateIKIMetrics,
  classifyTransition,
  type KeystrokeEntry,
} from '../lib/ikiEngine.ts';
import { targetDigraphs, ensureTargets } from '../lib/drillText.ts';

export function registerIkiEngineTests(): void {
  describe('IKIEngine - Core Calculations & Motor Diagnostics', () => {
    it('returns empty result safely for empty or single keystroke log', () => {
      const emptyMetrics = calculateIKIMetrics([]);
      expect(emptyMetrics.totalTransitions).toBe(0);
      expect(emptyMetrics.medianIki).toBe(0);
      expect(emptyMetrics.fluidityScore).toBe(100);

      const singleMetrics = calculateIKIMetrics([
        { expected: 'a', time: 1000, isError: false }
      ]);
      expect(singleMetrics.totalTransitions).toBe(0);
      expect(singleMetrics.medianIki).toBe(0);
    });

    it('calculates exact median and mean IKI across sequential keystrokes', () => {
      // 5 keystrokes -> 4 transitions: 100ms, 120ms, 140ms, 160ms
      const log: KeystrokeEntry[] = [
        { expected: 't', time: 1000, isError: false },
        { expected: 'h', time: 1100, isError: false }, // 100ms (t->h)
        { expected: 'e', time: 1220, isError: false }, // 120ms (h->e)
        { expected: 'r', time: 1360, isError: false }, // 140ms (e->r)
        { expected: 'e', time: 1520, isError: false }, // 160ms (r->e)
      ];

      const metrics = calculateIKIMetrics(log);
      expect(metrics.totalTransitions).toBe(4);
      expect(metrics.meanIki).toBe(130);
      expect(metrics.medianIki).toBe(130); // (120+140)/2 = 130
      expect(metrics.fluidityScore).toBeGreaterThanOrEqual(80);
      expect(metrics.hesitationCount).toBe(0);
    });

    it('filters out hesitation pauses (>1500ms) from median cadence calculation', () => {
      const log: KeystrokeEntry[] = [
        { expected: 'a', time: 1000, isError: false },
        { expected: 'b', time: 1100, isError: false }, // 100ms
        { expected: 'c', time: 1200, isError: false }, // 100ms
        { expected: 'd', time: 4000, isError: false }, // 2800ms (PAUSE)
        { expected: 'e', time: 4100, isError: false }, // 100ms
      ];

      const metrics = calculateIKIMetrics(log);
      expect(metrics.hesitationCount).toBe(1);
      expect(metrics.totalTransitions).toBe(3); // 4th transition was filtered
      expect(metrics.medianIki).toBe(100);
      expect(metrics.meanIki).toBe(100);
    });

    it('accurately classifies transition movement types (crossover, adjacent, stretch, double_tap)', () => {
      // F (left index) -> J (right index) = crossover
      expect(classifyTransition('f', 'j')).toBe('crossover');
      // E (left mid col 2) -> R (left index col 3) = adjacent
      expect(classifyTransition('e', 'r')).toBe('adjacent');
      // Q (left pinky col 0) -> R (left index col 3) = stretch
      expect(classifyTransition('q', 'r')).toBe('stretch');
      // L -> L = double_tap
      expect(classifyTransition('l', 'l')).toBe('double_tap');
    });

    it('flags stumbling digraphs with errors or extreme latency variance', () => {
      const log: KeystrokeEntry[] = [
        { expected: 'p', time: 1000, isError: false },
        { expected: 'l', time: 1450, isError: true },  // 450ms + error (P->L)
        { expected: 'a', time: 1550, isError: false }, // 100ms
        { expected: 'n', time: 1650, isError: false }, // 100ms
        { expected: 'p', time: 1750, isError: false },
        { expected: 'l', time: 2200, isError: true },  // 450ms + error (P->L)
      ];

      const metrics = calculateIKIMetrics(log);
      expect(metrics.stumbledTransitions.length).toBeGreaterThan(0);
      const topStumble = metrics.stumbledTransitions[0];
      expect(topStumble.from).toBe('P');
      expect(topStumble.to).toBe('L');
      expect(topStumble.errorCount).toBe(2);
      expect(metrics.recommendedDrillDigraphs.includes('pl')).toBeTruthy();
    });

    it('ignores backspace entries from forward transition measurements', () => {
      const log: KeystrokeEntry[] = [
        { expected: 'a', time: 1000, isError: false },
        { expected: '', time: 1050, isError: false, isBackspace: true },
        { expected: 'b', time: 1200, isError: false },
      ];

      const metrics = calculateIKIMetrics(log);
      expect(metrics.totalTransitions).toBe(1);
      expect(metrics.medianIki).toBe(200); // 1200 - 1000 = 200ms
    });
  });

  describe('DrillText - Digraph Generation & Target Injections', () => {
    it('extracts valid 2-character digraph targets correctly', () => {
      const raw = ['TH', 'pl', 'A', 'SPACE', 'QU', 'enter'];
      const digraphs = targetDigraphs(raw);
      expect(digraphs).toEqual(['th', 'pl', 'qu']);
    });

    it('ensures digraphs are present in drill text', () => {
      const baseText = 'the quick brown fox jumps over the lazy dog';
      const ensured = ensureTargets(baseText, ['pl', 'xy']);
      expect(ensured.includes('pl')).toBeTruthy();
      expect(ensured.includes('xy')).toBeTruthy();
    });
  });
}
