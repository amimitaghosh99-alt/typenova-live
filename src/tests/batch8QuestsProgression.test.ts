import { describe, it, expect } from './testHarness';
import { normalizeQuests, type QuestsState } from '../lib/progress';

export function runBatch8QuestsProgressionTests() {
  describe('Batch 8: Quests, Daily Streaks & RPG Progression', () => {

    it('QUEST-01: Synchronous multi-call quest progress retains all progression without clobbering', () => {
      // Simulate state representation of active quests
      let questsState: QuestsState = {
        lastReset: '2026-09-27',
        active: [
          { id: 'q1', type: 'words_typed', target: 500, progress: 50, completed: false, xpReward: 1000 },
          { id: 'q2', type: 'wpm_achieved', target: 100, progress: 0, completed: false, xpReward: 1000 },
          { id: 'q3', type: 'acc_achieved', target: 98, progress: 0, completed: false, xpReward: 500 },
        ]
      };

      const questsRef = { current: questsState };
      let totalXpGained = 0;

      // Simulated hardened progressQuest function with synchronous ref updates
      const progressQuest = (type: string, value: number) => {
        const prev = questsRef.current;
        if (!prev || !Array.isArray(prev.active)) return;

        const newActive = prev.active.map(q => {
          if (q.completed || q.type !== type) return q;
          let newProgress = q.progress;
          if (type === 'words_typed') newProgress += value;
          else if (type === 'wpm_achieved' || type === 'acc_achieved') {
            if (value >= q.target) newProgress = q.target;
          }

          if (newProgress !== q.progress) {
            const completed = newProgress >= q.target;
            if (completed) {
              newProgress = q.target;
              totalXpGained += q.xpReward;
            }
            return { ...q, progress: newProgress, completed };
          }
          return q;
        });

        const newState: QuestsState = { ...prev, active: newActive };
        // Synchronously update ref
        questsRef.current = newState;
        questsState = newState;
      };

      // Call 1: words_typed (typed 50 words)
      progressQuest('words_typed', 50);
      // Call 2: wpm_achieved (hit 105 WPM -> completes)
      progressQuest('wpm_achieved', 105);
      // Call 3: acc_achieved (hit 99% Acc -> completes)
      progressQuest('acc_achieved', 99);

      // Verify that words_typed was NOT clobbered by Call 2 or Call 3
      const wordsQuest = questsRef.current.active.find(q => q.type === 'words_typed')!;
      expect(wordsQuest.progress).toBe(100); // 50 + 50 = 100

      const wpmQuest = questsRef.current.active.find(q => q.type === 'wpm_achieved')!;
      expect(wpmQuest.completed).toBe(true);

      const accQuest = questsRef.current.active.find(q => q.type === 'acc_achieved')!;
      expect(accQuest.completed).toBe(true);

      expect(totalXpGained).toBe(1500); // 1000 (wpm) + 500 (acc)
    });

    it('QUEST-02: Daily streak initializes to 1 on first day and after missed days', () => {
      const today = '2026-09-27';
      const yesterday = '2026-09-26';
      const twoDaysAgo = '2026-09-25';

      function computeStreak(prevDaily: { lastDay: string; streak: number } | null): number {
        if (prevDaily?.lastDay === today) {
          return Math.max(1, prevDaily.streak || 1);
        } else if (prevDaily && prevDaily.lastDay === yesterday) {
          return (prevDaily.streak || 0) + 1;
        } else {
          return 1; // Explicit recovery / first-day branch
        }
      }

      // 1. Fresh player (null storage)
      expect(computeStreak(null)).toBe(1);

      // 2. Returning player who missed a day (twoDaysAgo)
      expect(computeStreak({ lastDay: twoDaysAgo, streak: 14 })).toBe(1);

      // 3. Consecutive day player (yesterday)
      expect(computeStreak({ lastDay: yesterday, streak: 3 })).toBe(4);

      // 4. Multiple tests on the same day (today)
      expect(computeStreak({ lastDay: today, streak: 4 })).toBe(4);
    });

    it('QUEST-03: normalizeQuests defends against malformed or legacy payloads', () => {
      // 1. Null / undefined / primitive inputs
      expect(normalizeQuests(null)).toBe(null);
      expect(normalizeQuests(undefined)).toBe(null);
      expect(normalizeQuests('bad string')).toBe(null);

      // 2. Object with missing or invalid active array
      expect(normalizeQuests({ lastReset: '2026-09-27' })).toBe(null);
      expect(normalizeQuests({ lastReset: '2026-09-27', active: 'not an array' })).toBe(null);

      // 3. Corrupt entries inside active array
      const malformedPayload = {
        lastReset: '2026-09-27',
        active: [
          null,
          { id: 'q1', type: 'words_typed', target: 500, progress: 100, completed: false, xpReward: 1000 },
          { id: 'q2', type: 'corrupt', target: -10, progress: 'bad', completed: 'no', xpReward: 500 }, // target <= 0
          { id: 'q3', type: 'wpm_achieved', target: 100, progress: 50, completed: false, xpReward: 1000 },
        ]
      };

      const normalized = normalizeQuests(malformedPayload);
      expect(normalized !== null).toBe(true);
      expect(normalized!.active.length).toBe(2); // Only q1 and q3 should be preserved
      expect(normalized!.active[0].id).toBe('q1');
      expect(normalized!.active[1].id).toBe('q3');
    });

    it('QUEST-04: Meaningful run threshold filters out 1-key false triggers', () => {
      function isMeaningfulRun(effLength: number, typedWords: number, wpm: number): boolean {
        return wpm > 0 && effLength >= 40 && typedWords >= 5;
      }

      // 1-key press in 15s timed test (1 char, 1 word, 1 WPM)
      expect(isMeaningfulRun(1, 1, 1)).toBe(false);

      // Early abort in Sudden Death (15 chars, 3 words, 120 WPM burst)
      expect(isMeaningfulRun(15, 3, 120)).toBe(false);

      // Legitimate completed short quote (45 chars, 8 words, 75 WPM)
      expect(isMeaningfulRun(45, 8, 75)).toBe(true);

      // Legitimate 15-second timed run (120 chars, 24 words, 96 WPM)
      expect(isMeaningfulRun(120, 24, 96)).toBe(true);
    });

  });
}
