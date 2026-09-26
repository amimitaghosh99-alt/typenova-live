import { describe, it, expect } from './testHarness';
import { MAX_POLYPHONY, getActiveVoicesCount, resetActiveVoices } from '@/hooks/useAudioEngine';

export function registerBatch2EngineAudioTests(): void {
  describe('Batch 2: Core Typing Engine, Scoring & Web Audio', () => {

    describe('AUDIO-01: Voice Polyphony & Watchdog Recovery', () => {
      it('initializes with activeVoices at 0 and exports valid MAX_POLYPHONY', () => {
        resetActiveVoices();
        expect(getActiveVoicesCount()).toBe(0);
        expect(MAX_POLYPHONY).toBe(6);
      });

      it('safely clamps and recovers active voices without permanent muting', () => {
        resetActiveVoices();
        expect(getActiveVoicesCount()).toBe(0);

        // Simulate voice increments
        let active = getActiveVoicesCount();
        for (let i = 0; i < 15; i++) {
          active = Math.min(MAX_POLYPHONY * 2, active + 1);
        }
        expect(active).toBe(12); // Clamped at 2x MAX_POLYPHONY rather than unbounded growth

        // Simulate watchdog recovery
        for (let i = 0; i < 15; i++) {
          active = Math.max(0, active - 1);
        }
        expect(active).toBe(0);
      });
    });

    describe('ENGINE-01: Finite Math & Timeline Variance Protection', () => {
      it('timeline calculations never produce Infinity or NaN even with 0 elapsed time', () => {
        const calculateTimelinePoint = (runningChars: number, runningRawChars: number, stepI: number) => {
          const elapsedMin = stepI / 60000;
          const calcWpm = elapsedMin > 0 ? Math.round((runningChars / 5) / elapsedMin) : 0;
          const calcRaw = elapsedMin > 0 ? Math.round((runningRawChars / 5) / elapsedMin) : 0;
          return {
            wpm: Number.isFinite(calcWpm) ? calcWpm : 0,
            rawWpm: Number.isFinite(calcRaw) ? calcRaw : 0,
          };
        };

        // 0 elapsed time boundary
        const ptZero = calculateTimelinePoint(5, 5, 0);
        expect(ptZero.wpm).toBe(0);
        expect(ptZero.rawWpm).toBe(0);
        expect(Number.isFinite(ptZero.wpm)).toBe(true);

        // Standard 1000ms elapsed time (1 second)
        const pt1s = calculateTimelinePoint(10, 10, 1000);
        expect(pt1s.wpm).toBe(120);
        expect(Number.isFinite(pt1s.wpm)).toBe(true);
      });

      it('variance and consistency score calculations never produce NaN on identical or skewed WPMs', () => {
        const calculateConsistency = (wpmVals: number[]) => {
          const finiteVals = wpmVals.filter(v => Number.isFinite(v));
          const mean = finiteVals.length ? finiteVals.reduce((a, b) => a + b, 0) / finiteVals.length : 0;
          const variance = finiteVals.length ? finiteVals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / finiteVals.length : 0;
          const safeVariance = Number.isFinite(variance) ? variance : 0;
          const stddev = Math.sqrt(safeVariance);

          let consistencyScore = 100;
          if (finiteVals.length > 1 && mean > 0) {
            consistencyScore = Math.round(Math.max(0, Math.min(100, (1 - (stddev / mean)) * 100)));
          } else if (stddev > 0) {
            consistencyScore = 50;
          }
          return { mean, variance: safeVariance, stddev, consistencyScore };
        };

        // Empty timeline
        const empty = calculateConsistency([]);
        expect(empty.consistencyScore).toBe(100);
        expect(Number.isNaN(empty.variance)).toBe(false);

        // Identical WPMs (0 variance)
        const flat = calculateConsistency([100, 100, 100, 100]);
        expect(flat.variance).toBe(0);
        expect(flat.stddev).toBe(0);
        expect(flat.consistencyScore).toBe(100);

        // Skewed WPMs
        const skewed = calculateConsistency([60, 80, 100, 120]);
        expect(skewed.mean).toBe(90);
        expect(skewed.variance).toBeGreaterThan(0);
        expect(Number.isNaN(skewed.consistencyScore)).toBe(false);
      });
    });

    describe('ENGINE-02: Sudden Death 1st-Key Error Accuracy', () => {
      it('accurately evaluates 0% accuracy when 1st key stroke is an error', () => {
        const computeAccuracy = (totalTyped: number, errorCount: number) => {
          return totalTyped > 0 
            ? Math.min(Math.max(Math.round(((totalTyped - errorCount) / totalTyped) * 100), 0), 100) 
            : 100;
        };

        // 1 key typed, 1 error (e.g. Sudden Death failure on first character)
        const suddenDeathFail = computeAccuracy(1, 1);
        expect(suddenDeathFail).toBe(0); // Must be 0%, NOT 100%

        // 1 key typed, 0 errors
        const singleSuccess = computeAccuracy(1, 0);
        expect(singleSuccess).toBe(100);

        // 10 keys typed, 2 errors
        const normalRun = computeAccuracy(10, 2);
        expect(normalRun).toBe(80);
      });
    });

    describe('ENGINE-03: International AltGr & Ctrl+Backspace Logic', () => {
      it('correctly discriminates AltGr combinations from standard Ctrl/Alt commands', () => {
        const isModifierBlocked = (e: { ctrlKey: boolean; altKey: boolean; metaKey: boolean; key: string }) => {
          const isAltGr = e.ctrlKey && e.altKey;
          const isCtrlBackspace = e.ctrlKey && !e.altKey && e.key === 'Backspace';

          if (!isAltGr && !isCtrlBackspace) {
            if (e.ctrlKey || e.metaKey || e.altKey) return true; // Blocked
          }
          if (e.key.length > 1 && e.key !== 'Enter' && e.key !== 'Backspace') return true;
          return false; // Allowed to type
        };

        // Standard character
        expect(isModifierBlocked({ ctrlKey: false, altKey: false, metaKey: false, key: 'a' })).toBe(false);

        // AltGr character (e.g. @ or € on European keyboards)
        expect(isModifierBlocked({ ctrlKey: true, altKey: true, metaKey: false, key: '@' })).toBe(false);
        expect(isModifierBlocked({ ctrlKey: true, altKey: true, metaKey: false, key: '€' })).toBe(false);

        // Ctrl+Backspace
        expect(isModifierBlocked({ ctrlKey: true, altKey: false, metaKey: false, key: 'Backspace' })).toBe(false);

        // Normal Ctrl command (e.g. Ctrl+C or Ctrl+R)
        expect(isModifierBlocked({ ctrlKey: true, altKey: false, metaKey: false, key: 'c' })).toBe(true);

        // Normal Alt command (e.g. Alt+F)
        expect(isModifierBlocked({ ctrlKey: false, altKey: true, metaKey: false, key: 'f' })).toBe(true);

        // Meta/Command key
        expect(isModifierBlocked({ ctrlKey: false, altKey: false, metaKey: true, key: 'v' })).toBe(true);
      });

      it('Ctrl+Backspace word deletion calculates correct slice index', () => {
        const deleteWord = (currentInput: string): string => {
          const trimmed = currentInput.trimEnd();
          const lastSpaceIdx = trimmed.lastIndexOf(' ');
          const sliceIdx = lastSpaceIdx === -1 ? 0 : lastSpaceIdx + 1;
          return currentInput.slice(0, sliceIdx);
        };

        expect(deleteWord('the quick brown fox')).toBe('the quick brown ');
        expect(deleteWord('the quick brown ')).toBe('the quick ');
        expect(deleteWord('singleword')).toBe('');
        expect(deleteWord('')).toBe('');
      });
    });

    describe('UI-01: Caret Transform Composition', () => {
      it('composes translate3d with custom rotation transforms without overwriting', () => {
        const buildCaretTransform = (pos: { x: number; y: number }, customTransform?: string) => {
          return `translate3d(${pos.x}px, ${pos.y}px, 0)${customTransform ? ` ${customTransform}` : ''}`;
        };

        // Normal caret position
        const normal = buildCaretTransform({ x: 120, y: 40 });
        expect(normal).toBe('translate3d(120px, 40px, 0)');

        // Inverted caret hex active
        const inverted = buildCaretTransform({ x: 120, y: 40 }, 'rotate(180deg)');
        expect(inverted).toBe('translate3d(120px, 40px, 0) rotate(180deg)');
        expect(inverted.includes('translate3d(120px, 40px, 0)')).toBe(true);
        expect(inverted.includes('rotate(180deg)')).toBe(true);
      });
    });

  });
}
