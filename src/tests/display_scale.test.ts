/**
 * Test Suite: Display Scaling & In-App UI Zoom Engine
 * Validates clamping bounds, zoom calculations, and OS DPI counteraction logic.
 */

import { describe, it, expect } from './testHarness.ts';
import {
  clampDisplayScale,
  calculateEffectiveZoom,
  parseDisplayScaleConfig,
  MIN_DISPLAY_SCALE,
  MAX_DISPLAY_SCALE,
  DEFAULT_DISPLAY_SCALE,
  DISPLAY_SCALE_PRESETS,
} from '../hooks/useDisplayScale.ts';

export function registerDisplayScaleTests(): void {
  describe('Display Scale — Clamping & Range Boundaries', () => {
    it('clamps values below minimum to MIN_DISPLAY_SCALE (70%)', () => {
      expect(clampDisplayScale(40)).toBe(MIN_DISPLAY_SCALE);
      expect(clampDisplayScale(0)).toBe(MIN_DISPLAY_SCALE);
      expect(clampDisplayScale(-50)).toBe(MIN_DISPLAY_SCALE);
    });

    it('clamps values above maximum to MAX_DISPLAY_SCALE (150%)', () => {
      expect(clampDisplayScale(175)).toBe(MAX_DISPLAY_SCALE);
      expect(clampDisplayScale(300)).toBe(MAX_DISPLAY_SCALE);
    });

    it('preserves valid in-range integer percentages', () => {
      expect(clampDisplayScale(80)).toBe(80);
      expect(clampDisplayScale(100)).toBe(100);
      expect(clampDisplayScale(125)).toBe(125);
      expect(clampDisplayScale(140)).toBe(140);
    });

    it('safely recovers from NaN, undefined, or non-numeric inputs', () => {
      expect(clampDisplayScale(NaN)).toBe(DEFAULT_DISPLAY_SCALE);
      expect(clampDisplayScale(undefined as any)).toBe(DEFAULT_DISPLAY_SCALE);
      expect(clampDisplayScale('120' as any)).toBe(DEFAULT_DISPLAY_SCALE);
    });
  });

  describe('Display Scale — Effective Zoom Ratio Calculation', () => {
    it('calculates exact decimal ratio for standard 1.0 DPR without counteract', () => {
      expect(calculateEffectiveZoom(100, false, 1.0)).toBe(1.0);
      expect(calculateEffectiveZoom(125, false, 1.0)).toBe(1.25);
      expect(calculateEffectiveZoom(80, false, 1.0)).toBe(0.8);
      expect(calculateEffectiveZoom(110, false, 1.0)).toBe(1.1);
    });

    it('counteracts Windows 125% DPI (1.25 DPR) to 1:1 hardware pixel resolution', () => {
      // 100% scale / 1.25 DPR = 0.800
      expect(calculateEffectiveZoom(100, true, 1.25)).toBe(0.8);
      // 125% scale / 1.25 DPR = 1.000
      expect(calculateEffectiveZoom(125, true, 1.25)).toBe(1.0);
    });

    it('counteracts Windows 150% DPI (1.5 DPR) to 1:1 hardware pixel resolution', () => {
      // 100% scale / 1.50 DPR = 0.667
      expect(calculateEffectiveZoom(100, true, 1.5)).toBe(0.667);
      // 150% scale / 1.50 DPR = 1.000
      expect(calculateEffectiveZoom(150, true, 1.5)).toBe(1.0);
    });

    it('does not downscale when counteract is true on 1.0 DPR display', () => {
      expect(calculateEffectiveZoom(100, true, 1.0)).toBe(1.0);
      expect(calculateEffectiveZoom(110, true, 1.0)).toBe(1.1);
    });

    it('handles invalid or non-positive DPR gracefully', () => {
      expect(calculateEffectiveZoom(100, true, 0)).toBe(1.0);
      expect(calculateEffectiveZoom(100, true, -1.25)).toBe(1.0);
    });
  });

  describe('Display Scale — Config Parser & Storage Recovery', () => {
    it('falls back to default 100% scale and counteract=false on null/empty input', () => {
      const cfg = parseDisplayScaleConfig(null);
      expect(cfg.scale).toBe(100);
      expect(cfg.counteractDpi).toBe(false);
    });

    it('safely handles corrupted or malformed JSON strings without throwing', () => {
      const cfg = parseDisplayScaleConfig('{not valid json}');
      expect(cfg.scale).toBe(100);
      expect(cfg.counteractDpi).toBe(false);
    });

    it('correctly parses valid JSON config and clamps out-of-range scale', () => {
      const valid = parseDisplayScaleConfig(JSON.stringify({ scale: 125, counteractDpi: true }));
      expect(valid.scale).toBe(125);
      expect(valid.counteractDpi).toBe(true);

      const outOfBounds = parseDisplayScaleConfig(JSON.stringify({ scale: 250, counteractDpi: false }));
      expect(outOfBounds.scale).toBe(150);
      expect(outOfBounds.counteractDpi).toBe(false);
    });
  });

  describe('Display Scale — Preset Library Integrity', () => {
    it('verifies all presets are within valid bounds', () => {
      for (const preset of DISPLAY_SCALE_PRESETS) {
        expect(preset).toBeGreaterThanOrEqual(MIN_DISPLAY_SCALE);
        expect(preset).toBeLessThanOrEqual(MAX_DISPLAY_SCALE);
      }
    });

    it('verifies 100% standard preset is included', () => {
      expect(DISPLAY_SCALE_PRESETS.includes(100 as any)).toBe(true);
    });
  });
}
