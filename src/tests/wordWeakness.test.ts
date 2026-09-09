/**
 * Word-Weakness engine tests — aggregation alignment, Leitner scheduling,
 * cloud merge, and persistence validation.
 *
 * The alignment suite (backspaces included) is the load-bearing test: every
 * UI surface downstream trusts that "the word you were typing when you
 * slipped" is attributed correctly.
 */

import { describe, it, expect } from './testHarness.ts';
import {
  normalizeWord,
  wordSpans,
  aggregateWords,
  recordRun,
  gradeDrillRun,
  mergeWordWeakness,
  dueWords,
  weakestWords,
  evictIfNeeded,
  normalizeWordWeakness,
  addDays,
  WORD_WEAKNESS_CAP,
  MIN_OBSERVATIONS,
  BOX_INTERVAL_DAYS,
  type WordWeaknessMap,
  type WordStat,
} from '../lib/wordWeakness';
import { mergeProgress } from '../lib/progress';
import { ensureWordTargets, buildProceduralWordDrill } from '../lib/drillText';
import type { Keystroke } from '../hooks/useTypingEngine';

const TODAY = '2026-01-01';

function ks(key: string, expected: string, time: number, isError = false, isBackspace = false): Keystroke {
  return { key, expected, time, isError, isBackspace: isBackspace || undefined };
}

function stat(o: Partial<WordStat>): WordStat {
  return { total: 0, errors: 0, totalMs: 0, box: 0, due: '2025-12-01', lastSeen: '2025-12-01', ...o };
}

function agg(word: string, total: number, errors: number, totalMs = 0) {
  return { word, total, errors, totalMs };
}

export function registerWordWeaknessTests() {
  describe('Word Weakness — normalizeWord', () => {
    it('lowercases and strips edge punctuation', () => {
      expect(normalizeWord('Hello!')).toBe('hello');
      expect(normalizeWord('"Quoted"')).toBe('quoted');
      expect(normalizeWord('(parenthetical),')).toBe('parenthetical');
    });

    it('keeps internal apostrophes and hyphens', () => {
      expect(normalizeWord("Don't")).toBe("don't");
      expect(normalizeWord('well-known')).toBe('well-known');
      expect(normalizeWord('don\u2019t')).toBe('don\u2019t');
    });

    it('rejects noise: too short, symbol-only, or un-drillable', () => {
      expect(normalizeWord('ab')).toBe(null);
      expect(normalizeWord('!!!')).toBe(null);
      expect(normalizeWord('a b')).toBe(null);
      expect(normalizeWord('')).toBe(null);
      expect(normalizeWord('wo@rd')).toBe(null);
    });
  });

  describe('Word Weakness — wordSpans', () => {
    const spans = wordSpans('Say "hello" world!');

    it('maps every token to a normalized span', () => {
      expect(spans.length).toBe(3);
      expect(spans[0]).toEqual({ word: 'say', start: 0, end: 3 });
      expect(spans[1].word).toBe('hello');
      expect(spans[1].start).toBe(4);
      expect(spans[2]).toEqual({ word: 'world', start: 12, end: 18 });
    });

    it('covers edge punctuation offsets inside the owning token', () => {
      const at = (i: number) => spans.find(s => i >= s.start && i < s.end)?.word ?? null;
      expect(at(5)).toBe('hello');   // 'e'
      expect(at(10)).toBe('hello'); // closing quote — still "hello"
      expect(at(12)).toBe('world'); // 'w'
      expect(at(17)).toBe('world'); // '!'
      expect(at(3)).toBe(null);     // space between words
    });
  });

  describe('Word Weakness — aggregateWords (backspace alignment)', () => {
    it('attributes every keystroke to the right word across a backspace correction', () => {
      // target: "alpha beta gamma"
      // alpha: a l p h + WRONG x + backspace + corrected a  → total 6, errors 1
      const log: Keystroke[] = [
        ks('a', 'a', 100), ks('l', 'l', 110), ks('p', 'p', 120), ks('h', 'h', 130),
        ks('x', 'a', 140, true),            // slipped on the last char of "alpha"
        ks('Backspace', '', 150, false, true),
        ks('a', 'a', 160),                  // corrected
        ks(' ', ' ', 170),
        ks('b', 'b', 180), ks('e', 'e', 190), ks('t', 't', 200), ks('a', 'a', 210),
        ks(' ', ' ', 220),
        ks('g', 'g', 230), ks('a', 'a', 240), ks('m', 'm', 250), ks('m', 'm', 260), ks('a', 'a', 270),
      ];

      const result = aggregateWords('alpha beta gamma', log);
      const byWord = new Map(result.map(a => [a.word, a]));

      expect(result.length).toBe(3);
      // alpha: 10ms × 4 + the 20ms correction gap after the backspace
      expect(byWord.get('alpha')).toEqual({ word: 'alpha', total: 6, errors: 1, totalMs: 60 });
      expect(byWord.get('beta')).toEqual({ word: 'beta', total: 4, errors: 0, totalMs: 40 });
      // gamma: 50ms — the leading gap includes the space keystroke before it
      expect(byWord.get('gamma')).toEqual({ word: 'gamma', total: 5, errors: 0, totalMs: 50 });
    });

    it('attributes totalMs as the delay since the previous keystroke', () => {
      const log: Keystroke[] = [
        ks('a', 'a', 100), ks('l', 'l', 200), ks('p', 'p', 300), ks('h', 'h', 400), ks('a', 'a', 500),
        ks(' ', ' ', 600),
        ks('b', 'b', 700), ks('e', 'e', 800), ks('t', 't', 900), ks('a', 'a', 1000),
      ];
      const result = aggregateWords('alpha beta', log);
      const byWord = new Map(result.map(a => [a.word, a]));
      // first keystroke contributes 0, then 4 × 100ms per word
      expect(byWord.get('alpha')?.totalMs).toBe(400);
      expect(byWord.get('beta')?.totalMs).toBe(400);
    });

    it('backspaces attribute nothing and cannot go below the first char', () => {
      const log: Keystroke[] = [
        ks('Backspace', '', 10, false, true),
        ks('Backspace', '', 20, false, true),
        ks('a', 'a', 30), ks('b', 'b', 40), ks('c', 'c', 50),
      ];
      expect(aggregateWords('cab', log)).toEqual([{ word: 'cab', total: 3, errors: 0, totalMs: 20 }]);
    });
  });

  describe('Word Weakness — recordRun', () => {
    it('enters a word into tracking on its first observed error, box 0 due today', () => {
      const next = recordRun({}, [agg('structure', 9, 3)], TODAY);
      expect(next['structure']).toEqual({
        total: 9, errors: 3, totalMs: 0, box: 0, due: TODAY, lastSeen: TODAY,
      });
    });

    it('never tracks a word that has only been typed cleanly', () => {
      const next = recordRun({}, [agg('butterfly', 12, 0)], TODAY);
      expect(next['butterfly']).toBeUndefined();
    });

    it('accumulates totals across runs and refreshes lastSeen', () => {
      let map = recordRun({}, [agg('quiet', 5, 1)], '2025-12-30');
      map = recordRun(map, [agg('quiet', 4, 0)], TODAY);
      expect(map['quiet'].total).toBe(9);
      expect(map['quiet'].errors).toBe(1);
      expect(map['quiet'].lastSeen).toBe(TODAY);
      expect(map['quiet'].box).toBe(0); // tracked word stays tracked through clean runs
    });

    it('returns the same map object when there is nothing to record', () => {
      const map: WordWeaknessMap = { quiet: stat({ total: 5 }) };
      expect(recordRun(map, [], TODAY)).toBe(map);
    });
  });

  describe('Word Weakness — gradeDrillRun (Leitner scheduling)', () => {
    it('promotes a clean drill word: box 0 → 1, due +1 day', () => {
      const map = { structure: stat({ total: 9, errors: 3, box: 0, due: TODAY }) };
      const next = gradeDrillRun(map, ['structure'], { structure: false }, TODAY);
      expect(next['structure'].box).toBe(1);
      expect(next['structure'].due).toBe(addDays(TODAY, BOX_INTERVAL_DAYS[1]));
    });

    it('keeps walking the schedule: box 1 → 2, due +3 days', () => {
      const map = { quiet: stat({ box: 1, due: TODAY }) };
      const next = gradeDrillRun(map, ['quiet'], { quiet: false }, TODAY);
      expect(next['quiet'].box).toBe(2);
      expect(next['quiet'].due).toBe(addDays(TODAY, BOX_INTERVAL_DAYS[2]));
    });

    it('snaps a slipped word back to box 0, due today', () => {
      const map = { quiet: stat({ box: 4, due: TODAY }) };
      const next = gradeDrillRun(map, ['quiet'], { quiet: true }, TODAY);
      expect(next['quiet'].box).toBe(0);
      expect(next['quiet'].due).toBe(TODAY);
    });

    it('caps at the final box with the 30-day interval', () => {
      const map = { zenith: stat({ box: 5, due: TODAY }) };
      const next = gradeDrillRun(map, ['zenith'], { zenith: false }, TODAY);
      expect(next['zenith'].box).toBe(5);
      expect(next['zenith'].due).toBe(addDays(TODAY, BOX_INTERVAL_DAYS[5]));
    });

    it('adjusts scheduling only — recordRun owns the counts (no double-count)', () => {
      let map = recordRun({}, [agg('phantom', 8, 2)], TODAY);
      const totalsBefore = { total: map['phantom'].total, errors: map['phantom'].errors };
      map = gradeDrillRun(map, ['phantom'], { phantom: false }, TODAY);
      expect(map['phantom'].total).toBe(totalsBefore.total);
      expect(map['phantom'].errors).toBe(totalsBefore.errors);
    });

    it('fills a missing drill word defensively (clean → box 1)', () => {
      const next = gradeDrillRun({}, ['morph'], { morph: false }, TODAY);
      expect(next['morph'].box).toBe(1);
      expect(next['morph'].due).toBe(addDays(TODAY, BOX_INTERVAL_DAYS[1]));
    });

    it('normalizes drill words and ignores un-drillable ones', () => {
      const next = gradeDrillRun({}, ['Phantom!', 'ab'], { 'phantom': false }, TODAY);
      expect(next['phantom']).toBeDefined();
      expect(next['ab']).toBeUndefined();
    });
  });

  describe('Word Weakness — mergeWordWeakness (cloud sync)', () => {
    it('picks the entry with the greater total — never sums', () => {
      const a: WordWeaknessMap = { phantom: stat({ total: 10, errors: 3 }) };
      const b: WordWeaknessMap = { phantom: stat({ total: 6, errors: 0 }) };
      expect(mergeWordWeakness(a, b)['phantom'].total).toBe(10);
      expect(mergeWordWeakness(b, a)['phantom'].total).toBe(10);
    });

    it('breaks equal totals by the earlier due date', () => {
      const a: WordWeaknessMap = { quiet: stat({ total: 5, due: '2026-01-03' }) };
      const b: WordWeaknessMap = { quiet: stat({ total: 5, due: '2026-01-01' }) };
      expect(mergeWordWeakness(a, b)['quiet'].due).toBe('2026-01-01');
    });

    it('unions disjoint word sets from both devices', () => {
      const a: WordWeaknessMap = { alpha: stat({ total: 4, errors: 1 }) };
      const b: WordWeaknessMap = { bravo: stat({ total: 6, errors: 2 }) };
      const merged = mergeWordWeakness(a, b);
      expect(Object.keys(merged).sort()).toEqual(['alpha', 'bravo']);
    });
  });

  describe('Word Weakness — dueWords / weakestWords / evictIfNeeded', () => {
    it('lists only words due today or earlier, weakest box first', () => {
      const map: WordWeaknessMap = {
        overdue: stat({ box: 2, due: '2025-12-31' }),
        duetoday: stat({ box: 0, due: TODAY }),
        future: stat({ box: 0, due: '2026-02-01' }),
      };
      expect(dueWords(map, TODAY)).toEqual(['duetoday', 'overdue']);
    });

    it('gates weakestWords on MIN_OBSERVATIONS and excludes clean words', () => {
      const map: WordWeaknessMap = {
        tiny: stat({ total: MIN_OBSERVATIONS - 1, errors: 3 }), // below gate — excluded
        sloppy: stat({ total: 10, errors: 4 }),
        mild: stat({ total: 20, errors: 2 }),
        clean: stat({ total: 30, errors: 0 }),
      };
      expect(weakestWords(map, 10)).toEqual(['sloppy', 'mild']);
    });

    it('caps the store by evicting the healthiest words', () => {
      const map: WordWeaknessMap = {};
      for (let i = 0; i < WORD_WEAKNESS_CAP + 10; i++) {
        map[`word${String(i).padStart(3, '0')}`] = stat({
          total: 10,
          errors: i < 5 ? 0 : 5, // five perfectly healthy words must be the ones evicted
          lastSeen: '2025-12-01',
        });
      }
      const next = evictIfNeeded(map);
      expect(Object.keys(next).length).toBe(WORD_WEAKNESS_CAP);
      expect(next['word000']).toBeUndefined(); // healthiest evicted
      expect(next['word050']).toBeDefined();   // weak retained
    });
  });

  describe('Word Weakness — normalizeWordWeakness (validation boundary)', () => {
    it('keeps fully valid entries', () => {
      const raw = { phantom: { total: 8, errors: 2, totalMs: 400, box: 2, due: TODAY, lastSeen: TODAY } };
      expect(normalizeWordWeakness(raw)['phantom'].total).toBe(8);
    });

    it('drops malformed or hostile entries field-by-field', () => {
      const raw = {
        nanbox: { total: 4, errors: 1, totalMs: 0, box: NaN, due: TODAY, lastSeen: TODAY },
        negerr: { total: 4, errors: 9, totalMs: 0, box: 0, due: TODAY, lastSeen: TODAY },
        baddate: { total: 4, errors: 1, totalMs: 0, box: 0, due: 'yesterday', lastSeen: TODAY },
        bigbox: { total: 4, errors: 1, totalMs: 0, box: 9, due: TODAY, lastSeen: TODAY },
        'bad key': { total: 4, errors: 1, totalMs: 0, box: 0, due: TODAY, lastSeen: TODAY },
        'bad$key': { total: 4, errors: 1, totalMs: 0, box: 0, due: TODAY, lastSeen: TODAY },
        nullish: null,
      };
      expect(normalizeWordWeakness(raw)).toEqual({});
    });

    it('treats a legacy cloud row without the field as an empty map', () => {
      expect(normalizeWordWeakness(undefined)).toEqual({});
      expect(normalizeWordWeakness(null)).toEqual({});
      expect(normalizeWordWeakness('garbage')).toEqual({});
    });
  });

  describe('Word Weakness — mergeProgress integration', () => {
    it('routes wordWeakness through the cloud-snapshot merge', () => {
      const a = { wordWeakness: { phantom: stat({ total: 10, errors: 3 }) } };
      const b = { wordWeakness: { phantom: stat({ total: 6, errors: 0 }) } };
      const merged = mergeProgress(a, b);
      expect(merged.wordWeakness['phantom'].total).toBe(10);
    });

    it('fills an empty map when the snapshot predates the feature', () => {
      const merged = mergeProgress({}, { xp: 100 });
      expect(merged.wordWeakness).toEqual({});
    });
  });

  describe('Word Weakness — addDays', () => {
    it('crosses month and year boundaries', () => {
      expect(addDays('2026-01-30', 3)).toBe('2026-02-02');
      expect(addDays('2025-12-31', 1)).toBe('2026-01-01');
      expect(addDays(TODAY, 0)).toBe(TODAY);
    });
  });

  describe('Word Weakness — drill generation (drillText integration)', () => {
    it('ensureWordTargets injects every missing target as its own word', () => {
      const text = ensureWordTargets('the quick brown fox jumps over the lazy dog', ['phantom', 'quiet']);
      const words = new Set(text.split(' '));
      expect(words.has('phantom')).toBe(true);
      expect(words.has('quiet')).toBe(true);
    });

    it('ensureWordTargets leaves text untouched when targets are present', () => {
      const text = 'the quiet phantom walks';
      expect(ensureWordTargets(text, ['quiet', 'phantom'])).toBe(text);
    });

    it('buildProceduralWordDrill contains every target even with an empty pool', () => {
      const text = buildProceduralWordDrill(['structure', 'rhythm'], []);
      const words = new Set(text.split(' '));
      expect(words.has('structure')).toBe(true);
      expect(words.has('rhythm')).toBe(true);
    });

    it('buildProceduralWordDrill fills a full passage around the targets', () => {
      const pool = ['typewriter', 'typescript', 'keyboard', 'mechanic', 'machine', 'rhythmic',
        'structural', 'architecture', 'picture', 'signature', 'nature', 'feature'];
      const text = buildProceduralWordDrill(['structure', 'rhythm'], pool);
      expect(text.split(' ').length).toBeGreaterThanOrEqual(20);
      const words = new Set(text.split(' '));
      expect(words.has('structure')).toBe(true);
      expect(words.has('rhythm')).toBe(true);
    });

    it('buildProceduralWordDrill returns empty text for empty targets', () => {
      expect(buildProceduralWordDrill([], ['word'])).toBe('');
    });
  });
}

