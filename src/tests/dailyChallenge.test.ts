import { describe, it, expect } from './testHarness.ts';
import {
  DAILY_SNIPPETS,
  getDailySnippet,
  getDailyChallengeText,
  getDailyChallengeWordCount,
} from '../data/dailySnippets.ts';
import { generateText } from '../data/constants.ts';
import { isTodayDailyCompleted } from '../utils/seededRandom.ts';

export function registerDailyChallengeTests(): void {
  describe('Daily Challenge — Snippet Library Integrity', () => {
    it('contains at least 30 snippets covering all 31 calendar days', () => {
      expect(DAILY_SNIPPETS.length).toBeGreaterThanOrEqual(30);
      expect(DAILY_SNIPPETS.length).toBe(31);
    });

    it('each snippet has 1-31 day numbers sequentially without gaps', () => {
      DAILY_SNIPPETS.forEach((snippet, index) => {
        expect(snippet.day).toBe(index + 1);
      });
    });

    it('each snippet has a valid title, valid category, and substantial word count (> 30 words)', () => {
      const validCategories = new Set(['NEURO', 'TECH', 'COSMOS', 'NATURE', 'PHILOSOPHY', 'CRAFT']);
      DAILY_SNIPPETS.forEach((snippet) => {
        expect(typeof snippet.title).toBe('string');
        expect(snippet.title.length).toBeGreaterThan(3);
        expect(validCategories.has(snippet.category)).toBe(true);

        const words = snippet.text.trim().split(/\s+/);
        expect(words.length).toBeGreaterThanOrEqual(30);
        expect(words.length).toBeLessThanOrEqual(90);
      });
    });

    it('all snippets end with proper terminal punctuation and are not cut off mid-sentence', () => {
      DAILY_SNIPPETS.forEach((snippet) => {
        const trimmed = snippet.text.trim();
        const lastChar = trimmed[trimmed.length - 1];
        const isTerminal = lastChar === '.' || lastChar === '!' || lastChar === '?';
        expect(isTerminal).toBe(true);
      });
    });

    it('all 31 snippets have unique titles and non-duplicate text bodies', () => {
      const titles = new Set<string>();
      const bodies = new Set<string>();
      DAILY_SNIPPETS.forEach((snippet) => {
        expect(titles.has(snippet.title)).toBe(false);
        expect(bodies.has(snippet.text)).toBe(false);
        titles.add(snippet.title);
        bodies.add(snippet.text);
      });
    });
  });

  describe('Daily Challenge — Date Mapping & Resolution', () => {
    it('resolves correct snippet for the 1st of any month', () => {
      const d = new Date(2026, 0, 1); // Jan 1
      const snippet = getDailySnippet(d);
      expect(snippet.day).toBe(1);
      expect(snippet.title).toBe(DAILY_SNIPPETS[0].title);
    });

    it('resolves correct snippet for the 15th of any month', () => {
      const d = new Date(2026, 4, 15); // May 15
      const snippet = getDailySnippet(d);
      expect(snippet.day).toBe(15);
      expect(snippet.title).toBe(DAILY_SNIPPETS[14].title);
    });

    it('resolves correct snippet for the 31st of any 31-day month', () => {
      const d = new Date(2026, 6, 31); // July 31
      const snippet = getDailySnippet(d);
      expect(snippet.day).toBe(31);
      expect(snippet.title).toBe(DAILY_SNIPPETS[30].title);
    });

    it('clamps gracefully if given arbitrary day boundaries', () => {
      const d = new Date(2026, 1, 28); // Feb 28
      const snippet = getDailySnippet(d);
      expect(snippet.day).toBe(28);
    });

    it('getDailyChallengeText matches getDailySnippet text', () => {
      const d = new Date(2026, 8, 6);
      expect(getDailyChallengeText(d)).toBe(getDailySnippet(d).text);
    });

    it('getDailyChallengeWordCount returns exact word count', () => {
      const d = new Date(2026, 8, 6);
      const expected = getDailySnippet(d).text.trim().split(/\s+/).length;
      expect(getDailyChallengeWordCount(d)).toBe(expected);
    });
  });

  describe('Daily Challenge — Standardized Generation & Anti-Tampering', () => {
    it('generateText returns full daily snippet without truncation when isDaily is true', () => {
      const testDate = new Date();
      const expectedText = getDailyChallengeText(testDate);

      // Even if called with 10 words or 100 words or NOVICE level, daily text is preserved intact
      const res = generateText('NOVICE', 10, 'javascript', false, { isDaily: true });
      expect(res).toBe(expectedText);

      const resMaster = generateText('MASTER', 100, 'rust', false, { isDaily: true });
      expect(resMaster).toBe(expectedText);

      // If player enabled mirrored mode, it mirrors the full snippet
      const resMirrored = generateText('MASTER', 50, '', true, { isDaily: true });
      expect(resMirrored).toBe(expectedText.split(' ').reverse().join(' '));
    });

    it('isTodayDailyCompleted identifies formatted completion date', () => {
      const today = new Date();
      const pad = (n: number) => n.toString().padStart(2, '0');
      const todayDateStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

      expect(isTodayDailyCompleted(todayDateStr, { lastDay: todayDateStr })).toBe(true);
      expect(isTodayDailyCompleted('2020-01-01', { lastDay: todayDateStr })).toBe(false);
      expect(isTodayDailyCompleted(todayDateStr, null)).toBe(false);
      expect(isTodayDailyCompleted(todayDateStr, { lastDay: '2020-01-01' })).toBe(false);
    });
  });
}
