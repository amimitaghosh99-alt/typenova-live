import { describe, it, expect } from './testHarness.ts';
import {
  estimateHarmonicPollingRate,
  calculateJitterStdDev,
  calculateSwitchStability,
  calculateDebounceStats,
  buildLatencyHistogram,
  WebHidBenchmarkController,
} from '../lib/webHidEngine';

export function registerWebHidEngineTests() {
  describe('WebHID Benchmark Engine - Polling Rate & Jitter Telemetry', () => {
    it('estimates exact 1000Hz harmonic for standard 1.0ms report streams', () => {
      // 1000Hz reports arrive every ~1.0ms with minor ±0.03ms jitter
      const samples = [1.02, 0.98, 1.01, 0.99, 1.00, 1.03, 0.97, 1.01];
      const res = estimateHarmonicPollingRate(samples);
      expect(res.harmonicHz).toBe(1000);
      expect(res.currentHz).toBeGreaterThan(950);
      expect(res.currentHz).toBeLessThan(1050);
    });

    it('estimates exact 8000Hz (0.125ms) ultra-polling rate for esports hardware', () => {
      // 8000Hz reports arrive every ~0.125ms
      const samples = [0.124, 0.126, 0.125, 0.123, 0.127, 0.125];
      const res = estimateHarmonicPollingRate(samples);
      expect(res.harmonicHz).toBe(8000);
      expect(res.currentHz).toBe(8000);
    });

    it('accurately identifies 500Hz (2.0ms) and 125Hz (8.0ms) polling modes', () => {
      const samples500 = [2.01, 1.99, 2.02, 1.98, 2.00];
      const res500 = estimateHarmonicPollingRate(samples500);
      expect(res500.harmonicHz).toBe(500);

      const samples125 = [7.98, 8.02, 8.01, 7.99, 8.03];
      const res125 = estimateHarmonicPollingRate(samples125);
      expect(res125.harmonicHz).toBe(125);
    });

    it('calculates jitter standard deviation correctly', () => {
      const stableSamples = [1.0, 1.0, 1.0, 1.0];
      expect(calculateJitterStdDev(stableSamples)).toBe(0);

      const jitterySamples = [1.0, 2.0, 1.0, 2.0];
      const jitter = calculateJitterStdDev(jitterySamples);
      expect(jitter).toBeGreaterThan(0.4);
    });

    it('awards 100 stability score to ultra-stable switches with zero chatter', () => {
      const score = calculateSwitchStability(0.02, 0, 50);
      expect(score).toBeGreaterThanOrEqual(98);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('penalizes stability score for mechanical contact chatter and high jitter', () => {
      // 2 chatter hits + 1.2ms jitter
      const score = calculateSwitchStability(1.2, 2, 50);
      expect(score).toBeLessThan(50);
    });

    it('detects switch debounce and contact chatter pulses', () => {
      const events = [
        { key: 'KeyA', pressTimestamp: 100, releaseTimestamp: 150, bounceDurationMs: 50, isChatter: false },
        { key: 'KeyA', pressTimestamp: 155, releaseTimestamp: 158, bounceDurationMs: 3, isChatter: true }, // 5ms re-actuation = chatter
      ];

      const stats = calculateDebounceStats(events);
      expect(stats.chatterCount).toBe(1);
      expect(stats.minDebounceMs).toBe(3);
    });

    it('buckets latency intervals into diagnostic histogram', () => {
      const intervals = [0.12, 0.35, 0.75, 1.02, 2.1, 4.5, 8.2, 15.0];
      const buckets = buildLatencyHistogram(intervals);
      expect(buckets.length).toBe(8);
      expect(buckets[0].count).toBe(1); // <0.2ms (8k)
      expect(buckets[3].count).toBe(1); // 0.8-1.5ms (1k)
    });

    it('controller records key events and generates comprehensive telemetry', () => {
      const ctrl = new WebHidBenchmarkController();
      ctrl.startSession();

      // Simulate key press & release
      ctrl.recordKeyEvent('KeyW', true, 1000);
      ctrl.recordKeyEvent('KeyW', false, 1050);

      const stats = ctrl.getStats();
      expect(stats.totalReports).toBe(1); // 1 transition interval recorded
      expect(stats.switchDebounceEvents.length).toBe(1);
      expect(stats.switchDebounceEvents[0].bounceDurationMs).toBe(50);

      ctrl.stopSession();
    });
  });
}
