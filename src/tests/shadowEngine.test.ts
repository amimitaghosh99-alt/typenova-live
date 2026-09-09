import { describe, it, expect } from './testHarness.ts';
import { calculateShadowMetrics } from '../lib/shadowEngine';
import { generateSimulatedBoundaries } from '../lib/audioDictationEngine';
import type { KeystrokeEntry } from '../hooks/useTypingEngine';

export function registerShadowEngineTests() {
  describe('ShadowEngine - Auditory Latency & Speech Synchronization', () => {
    it('returns clean empty metrics for empty or missing inputs', () => {
      const res = calculateShadowMetrics([], []);
      expect(res.meanLagMs).toBe(0);
      expect(res.medianLagMs).toBe(0);
      expect(res.totalWordsShadowed).toBe(0);
      expect(res.auditoryFluidity).toBe(100);
    });

    it('generates simulated word boundaries proportionally to playback speed', () => {
      const text = 'The quick brown fox';
      const normalBoundaries = generateSimulatedBoundaries(text, 1.0);
      const fastBoundaries = generateSimulatedBoundaries(text, 1.5);

      expect(normalBoundaries.length).toBe(4);
      expect(fastBoundaries.length).toBe(4);
      expect(fastBoundaries[3].spokenTimestamp).toBeLessThan(normalBoundaries[3].spokenTimestamp);
    });

    it('accurately computes positive ear-to-finger response lag when user shadows speech', () => {
      const boundaries = [
        { word: 'The', charIndex: 0, charLength: 3, spokenTimestamp: 200 },
        { word: 'quick', charIndex: 4, charLength: 5, spokenTimestamp: 600 },
        { word: 'fox', charIndex: 10, charLength: 3, spokenTimestamp: 1000 },
      ];

      // User types 300ms after each word is spoken
      const keystrokes: KeystrokeEntry[] = [
        { time: 500, key: 'T', expected: 'T', isError: false },
        { time: 580, key: 'h', expected: 'h', isError: false },
        { time: 650, key: 'e', expected: 'e', isError: false },
        { time: 720, key: ' ', expected: ' ', isError: false },
        { time: 900, key: 'q', expected: 'q', isError: false },
        { time: 980, key: 'u', expected: 'u', isError: false },
        { time: 1050, key: 'i', expected: 'i', isError: false },
        { time: 1120, key: 'c', expected: 'c', isError: false },
        { time: 1190, key: 'k', expected: 'k', isError: false },
        { time: 1250, key: ' ', expected: ' ', isError: false },
        { time: 1300, key: 'f', expected: 'f', isError: false },
        { time: 1370, key: 'o', expected: 'o', isError: false },
        { time: 1440, key: 'x', expected: 'x', isError: false },
      ];

      const metrics = calculateShadowMetrics(boundaries, keystrokes, 1.0);
      expect(metrics.totalWordsShadowed).toBe(3);
      expect(metrics.meanLagMs).toBe(300); // exactly 500-200, 900-600, 1300-1000
      expect(metrics.medianLagMs).toBe(300);
      expect(metrics.auditoryFluidity).toBeGreaterThan(70);
    });

    it('detects anticipatory typing (lead) when typist types ahead of speech', () => {
      const boundaries = [
        { word: 'Hello', charIndex: 0, charLength: 5, spokenTimestamp: 800 },
      ];

      const keystrokes: KeystrokeEntry[] = [
        { time: 300, key: 'H', expected: 'H', isError: false },
      ];

      const metrics = calculateShadowMetrics(boundaries, keystrokes, 1.0);
      expect(metrics.meanLagMs).toBe(-500);
      expect(metrics.wordTelemetry[0].leadOrLag).toBe('lead');
    });

    it('captures catch-up burst acceleration after an auditory buffer lag', () => {
      const boundaries = [
        { word: 'First', charIndex: 0, charLength: 5, spokenTimestamp: 100 },
        { word: 'Second', charIndex: 6, charLength: 6, spokenTimestamp: 500 },
      ];

      const keystrokes: KeystrokeEntry[] = [
        { time: 800, key: 'F', expected: 'F', isError: false }, // 700ms lag
        { time: 860, key: 'i', expected: 'i', isError: false },
        { time: 920, key: 'r', expected: 'r', isError: false },
        { time: 970, key: 's', expected: 's', isError: false },
        { time: 1020, key: 't', expected: 't', isError: false },
        { time: 1060, key: ' ', expected: ' ', isError: false },
        { time: 1100, key: 'S', expected: 'S', isError: false }, // 600ms lag (closed by 100ms)
      ];

      const metrics = calculateShadowMetrics(boundaries, keystrokes, 1.0);
      expect(metrics.catchupBurstWpm).toBeGreaterThan(0);
    });
  });
}
