import { describe, it, expect } from './testHarness.ts';
import {
  computeDisplayRefreshRate,
  STANDARD_REFRESH_RATES,
} from '../lib/displayDiagnostics.ts';

export function registerDisplayDiagnosticsTests(): void {
  describe('Display Hz Diagnostics — Baseline Detection', () => {
    it('accurately identifies 60Hz display from ideal 16.67ms frame deltas', () => {
      const deltas = Array(30).fill(16.67);
      const res = computeDisplayRefreshRate(deltas);
      expect(res).not.toBe(null);
      expect(res?.hz).toBe(60);
      expect(res?.deltaMs).toBe(16.7);
      expect(res?.isStandardTier).toBe(true);
    });

    it('accurately identifies 144Hz esports display from ideal 6.94ms frame deltas', () => {
      const deltas = Array(30).fill(6.94);
      const res = computeDisplayRefreshRate(deltas);
      expect(res).not.toBe(null);
      expect(res?.hz).toBe(144);
      expect(res?.deltaMs).toBe(6.9);
      expect(res?.isStandardTier).toBe(true);
    });

    it('accurately identifies 120Hz display from ideal 8.33ms frame deltas', () => {
      const deltas = Array(30).fill(8.33);
      const res = computeDisplayRefreshRate(deltas);
      expect(res).not.toBe(null);
      expect(res?.hz).toBe(120);
      expect(res?.deltaMs).toBe(8.3);
    });

    it('accurately identifies 165Hz display from ideal 6.06ms frame deltas', () => {
      const deltas = Array(30).fill(6.06);
      const res = computeDisplayRefreshRate(deltas);
      expect(res).not.toBe(null);
      expect(res?.hz).toBe(165);
      expect(res?.deltaMs).toBe(6.1);
    });

    it('accurately identifies 240Hz display from ideal 4.17ms frame deltas', () => {
      const deltas = Array(30).fill(4.17);
      const res = computeDisplayRefreshRate(deltas);
      expect(res).not.toBe(null);
      expect(res?.hz).toBe(240);
      expect(res?.deltaMs).toBe(4.2);
    });

    it('accurately identifies 75Hz display from ideal 13.33ms frame deltas', () => {
      const deltas = Array(30).fill(13.33);
      const res = computeDisplayRefreshRate(deltas);
      expect(res).not.toBe(null);
      expect(res?.hz).toBe(75);
      expect(res?.deltaMs).toBe(13.3);
    });
  });

  describe('Display Hz Diagnostics — Dropped Frame & Jitter Immunity', () => {
    it('isolates 60Hz correctly even when 30% of frames stutter to 33.3ms or 50.0ms', () => {
      const deltas = [
        16.6, 16.7, 16.6, 33.3, 16.6, 16.7, 50.0, 16.6, 16.7, 16.6,
        33.2, 16.6, 16.7, 16.6, 16.6, 33.4, 16.7, 16.6, 16.6, 16.7,
        16.6, 50.1, 16.6, 16.7, 16.6, 16.6, 33.3, 16.7, 16.6, 16.6,
      ];
      const res = computeDisplayRefreshRate(deltas);
      expect(res).not.toBe(null);
      expect(res?.hz).toBe(60);
    });

    it('isolates 144Hz correctly despite occasional double-frame spikes', () => {
      const deltas = [
        6.9, 7.0, 6.9, 13.9, 6.9, 7.0, 20.8, 6.9, 7.0, 6.9,
        6.9, 13.8, 7.0, 6.9, 6.9, 7.0, 6.9, 13.9, 7.0, 6.9,
        7.0, 6.9, 6.9, 7.0, 6.9, 6.9, 7.0, 6.9, 14.0, 6.9,
      ];
      const res = computeDisplayRefreshRate(deltas);
      expect(res).not.toBe(null);
      expect(res?.hz).toBe(144);
    });

    it('safely handles 30Hz battery saver throttling mode', () => {
      const deltas = Array(25).fill(33.33);
      const res = computeDisplayRefreshRate(deltas);
      expect(res).not.toBe(null);
      expect(res?.hz).toBe(30);
    });
  });

  describe('Display Hz Diagnostics — Boundaries & Safeguards', () => {
    it('returns null if fewer than 10 valid samples are collected', () => {
      const deltas = [16.6, 16.7, 16.6, 16.6];
      const res = computeDisplayRefreshRate(deltas);
      expect(res).toBe(null);
    });

    it('filters out negative, zero, sub-millisecond, or background-paused deltas', () => {
      const deltas = [
        -5, 0, 0.4, 1.0, 16.6, 16.7, 16.6, 16.6, 16.7, 16.6, 16.6, 16.7, 16.6, 16.6, 16.7, 16.6,
        1500, 3000,
      ];
      const res = computeDisplayRefreshRate(deltas);
      expect(res).not.toBe(null);
      expect(res?.hz).toBe(60);
    });

    it('verifies all expected STANDARD_REFRESH_RATES are present and sorted descending', () => {
      expect(STANDARD_REFRESH_RATES.includes(60)).toBe(true);
      expect(STANDARD_REFRESH_RATES.includes(144)).toBe(true);
      expect(STANDARD_REFRESH_RATES.includes(240)).toBe(true);
      expect(STANDARD_REFRESH_RATES[0]).toBe(500);
      expect(STANDARD_REFRESH_RATES[STANDARD_REFRESH_RATES.length - 1]).toBe(30);
    });
  });
}
