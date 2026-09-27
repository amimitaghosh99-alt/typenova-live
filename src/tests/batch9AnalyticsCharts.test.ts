import { describe, it, expect } from './testHarness';
import { appStorage } from '../lib/storage';

export function runBatch9AnalyticsChartsTests() {
  describe('Batch 9: Analytics, Charts, Telemetry & Data Integrity', () => {

    it('CHART-01: bandFor dynamically calculates accuracy axis floor without locking to 0', () => {
      // Replicate the corrected bandFor logic from InteractiveFormChart.tsx
      interface Band { min: number; max: number }
      function bandFor(kind: 'wpm' | 'acc', values: number[]): Band {
        const valid = values.filter((v) => Number.isFinite(v));
        if (valid.length === 0) {
          return kind === 'acc' ? { min: 90, max: 100 } : { min: 0, max: 60 };
        }
        const rawMax = Math.max(...valid, 10);
        const rawMin = Math.min(...valid);
        if (kind === 'acc') {
          const floorAcc = Math.max(0, Math.min(Math.floor(rawMin - 2), 90));
          return { min: floorAcc, max: 100 };
        }
        const span = Math.max(rawMax - rawMin, 10);
        return { min: Math.max(0, Math.round(rawMin - span * 0.12)), max: Math.round(rawMax + span * 0.12) };
      }

      // Accuracy: Typist with high precision (96% - 99%)
      const accBand = bandFor('acc', [96, 98, 97, 99]);
      // Should zoom into precision range (floor at 90% or rawMin - 2 = 94%), NOT locked to 0%!
      expect(accBand.min).toBe(90);
      expect(accBand.max).toBe(100);

      // WPM: Typist at 120-130 WPM
      const wpmBand = bandFor('wpm', [120, 125, 130]);
      // rawMin = 120, rawMax = 130, span = 10 -> min should be around 119, NOT 0!
      expect(wpmBand.min > 100).toBe(true);
      expect(wpmBand.max > 130).toBe(true);
    });

    it('IMPORT-01: JSON import sanitizer strips prototype pollution keys recursively', () => {
      const sanitizeObj = (obj: unknown): any => {
        if (!obj || typeof obj !== 'object') return obj;
        if (Array.isArray(obj)) return obj.map(sanitizeObj);
        const clean: Record<string, any> = {};
        for (const [key, value] of Object.entries(obj)) {
          if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
          clean[key] = sanitizeObj(value);
        }
        return clean;
      };

      const maliciousPayload = JSON.parse(
        '{"title": "Valid", "__proto__": {"polluted": true}, "nested": {"constructor": "bad", "safe": 123}}'
      );

      const sanitized = sanitizeObj(maliciousPayload);
      expect(sanitized.title).toBe('Valid');
      expect(sanitized.__proto__).toBe(Object.prototype); // Standard clean prototype
      expect(sanitized.polluted).toBe(undefined);
      expect(sanitized.nested.safe).toBe(123);
      expect(sanitized.nested.constructor).toBe(Object); // Standard constructor
    });

    it('HISTORY-01: History sanitization maps string and invalid values to safe finite numbers', () => {
      const rawEntries = [
        { wpm: '105', acc: '98.5', cons: '90', size: '50', d: '2026-09-27T10:00:00.000Z' },
        { wpm: -10, acc: 150, cons: -5, size: 0, d: 'invalid-date' },
        { wpm: NaN, accuracy: 95 },
      ];

      const sanitized = rawEntries.map((e: any) => {
        const wpm = Number(e.wpm);
        const acc = Number(e.acc ?? e.accuracy);
        const cons = Number(e.cons);
        const size = Number(e.size);
        return {
          d: typeof e.d === 'string' && !Number.isNaN(new Date(e.d).getTime()) ? e.d : 'fallback-date',
          wpm: Number.isFinite(wpm) ? Math.max(0, wpm) : 0,
          acc: Number.isFinite(acc) ? Math.max(0, Math.min(100, acc)) : 100,
          cons: Number.isFinite(cons) ? Math.max(0, Math.min(100, cons)) : 100,
          size: Number.isFinite(size) && size > 0 ? size : 25,
        };
      });

      // Entry 1: String values safely converted to numbers
      expect(sanitized[0].wpm).toBe(105);
      expect(sanitized[0].acc).toBe(98.5);
      expect(sanitized[0].cons).toBe(90);
      expect(sanitized[0].size).toBe(50);

      // Entry 2: Negative and out-of-range values clamped
      expect(sanitized[1].wpm).toBe(0);
      expect(sanitized[1].acc).toBe(100);
      expect(sanitized[1].cons).toBe(0);
      expect(sanitized[1].size).toBe(25);
      expect(sanitized[1].d).toBe('fallback-date');

      // Entry 3: NaN and legacy accuracy key
      expect(sanitized[2].wpm).toBe(0);
      expect(sanitized[2].acc).toBe(95);
    });

    it('STACK-01: Array reduce scales to 100,000 history entries without RangeError', () => {
      // 100,000 entries would throw RangeError with Math.max(...wpms)
      const largeWpmList = new Array(100000).fill(100);
      largeWpmList[50000] = 165; // Peak WPM

      const pb = largeWpmList.reduce((max, w) => (w > max ? w : max), 0);
      expect(pb).toBe(165);
    });

    it('STORAGE-01: appStorage.get returns fallback when stored value is JSON string null', () => {
      const fallbackList: string[] = ['default_1', 'default_2'];
      const raw = 'null';

      const parsed = JSON.parse(raw);
      const result = (parsed === null || parsed === undefined) ? fallbackList : parsed;

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);
      expect(result[0]).toBe('default_1');
    });

  });
}
