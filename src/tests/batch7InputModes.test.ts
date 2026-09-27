import { describe, it, expect } from './testHarness';
import { CODE_LIBRARY } from '../data/codeSnippets';
import { cleanCustomText } from '../data/constants';
import { isCharacterMatch } from '../components/TypingController';
import { calculateBurstWpm } from '../lib/scoringEngine';

export function runBatch7InputModesTests() {
  describe('Batch 7: Game Modes, Code Mode, Custom Text & Input Pipeline', () => {

    it('CODE-01: Go snippets contain zero literal tab characters', () => {
      const goSnippets = CODE_LIBRARY['Go'];
      expect(Array.isArray(goSnippets)).toBe(true);
      expect(goSnippets.length > 0).toBe(true);

      for (let i = 0; i < goSnippets.length; i++) {
        const snippet = goSnippets[i];
        expect(snippet.includes('\t')).toBe(false);
      }
    });

    it('CODE-02: cleanCustomText normalizes CRLF, NBSP, zero-width chars, and curly punctuation', () => {
      // 1. CRLF normalization
      const crlfText = "function test() {\r\n  return 42;\r\n}";
      expect(cleanCustomText(crlfText)).toBe("function test() {\n  return 42;\n}");

      // 2. Non-breaking space (\u00A0) normalization
      const nbspText = "hello\u00A0world\u202Ftest\u2007spaces";
      expect(cleanCustomText(nbspText)).toBe("hello world test spaces");

      // 3. Zero-width character removal
      const zeroWidthText = "h\u200Be\u200Cl\u200Dlo\uFEFF";
      expect(cleanCustomText(zeroWidthText)).toBe("hello");

      // 4. Curly quotes and em-dashes
      const typographic = "“Hello,” she said—‘World!’";
      expect(cleanCustomText(typographic)).toBe('"Hello," she said-\'World!\'');
    });

    it('INPUT-01: isCharacterMatch allows standard QWERTY keys to match typographic characters', () => {
      // Direct matches
      expect(isCharacterMatch('a', 'a')).toBe(true);
      expect(isCharacterMatch(' ', ' ')).toBe(true);
      expect(isCharacterMatch('a', 'b')).toBe(false);

      // Em-dash & en-dash with hyphen
      expect(isCharacterMatch('-', '—')).toBe(true);
      expect(isCharacterMatch('-', '–')).toBe(true);
      expect(isCharacterMatch('—', '—')).toBe(true);

      // Curly quotes with straight quotes
      expect(isCharacterMatch("'", '‘')).toBe(true);
      expect(isCharacterMatch("'", '’')).toBe(true);
      expect(isCharacterMatch('"', '“')).toBe(true);
      expect(isCharacterMatch('"', '”')).toBe(true);

      // Non-breaking spaces with standard space
      expect(isCharacterMatch(' ', '\u00A0')).toBe(true);
      expect(isCharacterMatch(' ', '\u202F')).toBe(true);
      expect(isCharacterMatch(' ', '\u2007')).toBe(true);
    });

    it('BURST-01: calculateBurstWpm filters rapid key chatter and prevents 999 WPM explosion', () => {
      const now = 10000;
      // Simulate 5 keystrokes typed within 20ms total (4ms apart - mechanical chatter or script paste)
      const chatterHits = [
        { key: 't', expected: 't', time: now, isError: false },
        { key: 'e', expected: 'e', time: now + 5, isError: false },
        { key: 's', expected: 's', time: now + 10, isError: false },
        { key: 't', expected: 't', time: now + 15, isError: false },
        { key: 's', expected: 's', time: now + 20, isError: false },
      ];

      const burstChatter = calculateBurstWpm(chatterHits, 0);
      // Because dt = 20ms < 80ms threshold, it should not produce a 2,400+ WPM burst
      expect(burstChatter).toBe(0);

      // Simulate a legitimate human high-speed burst: 5 keystrokes across 160ms (~300 WPM burst)
      const humanHits = [
        { key: 'q', expected: 'q', time: now, isError: false },
        { key: 'u', expected: 'u', time: now + 40, isError: false },
        { key: 'i', expected: 'i', time: now + 80, isError: false },
        { key: 'c', expected: 'c', time: now + 120, isError: false },
        { key: 'k', expected: 'k', time: now + 160, isError: false },
      ];

      const burstHuman = calculateBurstWpm(humanHits, 0);
      expect(burstHuman > 250 && burstHuman <= 350).toBe(true);
    });

    it('PACE-01: Pace sample calculation produces monotonic times even with backspaces', () => {
      // Simulate pace samples with backspaced character regression:
      // chars: 0 -> 10 -> 8 (backspaced) -> 15 -> 25
      const samplesWithBackspaces = [
        { t: 0, chars: 0 },
        { t: 2000, chars: 10 },
        { t: 3000, chars: 8 },
        { t: 4000, chars: 15 },
        { t: 6000, chars: 25 },
      ];

      // Inline replication of the forward monotonic scan in TypingArea.tsx
      function timeAtCharsTest(samples: { t: number; chars: number }[], chars: number): number {
        if (!samples || samples.length === 0) return 0;
        if (samples.length === 1) return samples[0].t;
        if (chars <= samples[0].chars) return samples[0].t;
        const last = samples[samples.length - 1];
        if (chars >= last.chars) return last.t;

        for (let i = 0; i < samples.length - 1; i++) {
          const a = samples[i];
          const b = samples[i + 1];
          if (b.chars >= chars) {
            const span = b.chars - a.chars;
            const frac = span <= 0 ? 0 : Math.max(0, Math.min(1, (chars - a.chars) / span));
            return a.t + (b.t - a.t) * frac;
          }
        }
        return last.t;
      }

      // Empty samples check
      expect(timeAtCharsTest([], 10)).toBe(0);

      // Checking progression at 5 chars: should be between 0 and 2000ms
      const tAt5 = timeAtCharsTest(samplesWithBackspaces, 5);
      expect(tAt5 >= 0 && tAt5 <= 2000).toBe(true);

      // Checking progression at 12 chars: should find interval reaching 15 (between 3000ms and 4000ms)
      const tAt12 = timeAtCharsTest(samplesWithBackspaces, 12);
      expect(tAt12 >= 3000 && tAt12 <= 4000).toBe(true);
      expect(Number.isFinite(tAt12)).toBe(true);
    });

  });
}
