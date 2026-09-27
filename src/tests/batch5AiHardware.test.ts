/**
 * Batch 5 Unit Tests: AI Streaming, Smart Drills, Dictation & Hardware Resilience
 */

import { describe, it, expect } from './testHarness.ts';
import {
  targetChars,
  targetWords,
  buildProceduralWordDrill,
} from '../lib/drillText.ts';
import {
  generateSimulatedBoundaries,
  AudioDictationController,
} from '../lib/audioDictationEngine.ts';

export function registerBatch5AiHardwareTests(): void {
  describe('Batch 5: AI Streaming, Smart Drills, Dictation & Hardware Resilience', () => {
    it('DRILL-01: buildProceduralWordDrill handles empty pool gracefully and obeys empty targets contract', () => {
      const drillEmpty = buildProceduralWordDrill([], ['quick', 'brown', 'fox']);
      expect(drillEmpty).toBe('');

      const drillValid = buildProceduralWordDrill(['rhythm', 'pattern'], []);
      expect(drillValid.length > 0).toBe(true);
      expect(drillValid.includes('rhythm')).toBe(true);
      expect(drillValid.includes('pattern')).toBe(true);
    });

    it('DRILL-02: targetChars and targetWords safely handle nullish or irregular inputs', () => {
      // @ts-expect-error test irregular input
      expect(targetChars(null)).toEqual([]);
      // @ts-expect-error test irregular input
      expect(targetWords(undefined)).toEqual([]);
      expect(targetChars(['a', 'SPACE', 'ENTER', 'b', ''])).toEqual(['a', 'b']);
      expect(targetWords(['', 'a', 'to', 'word', 'practice'])).toEqual(['word', 'practice']);
    });

    it('DICT-01: generateSimulatedBoundaries handles extreme speeds and invalid inputs without NaN or Infinity', () => {
      const empty = generateSimulatedBoundaries('');
      expect(empty).toEqual([]);

      const nanSpeed = generateSimulatedBoundaries('The quick brown fox', NaN);
      expect(nanSpeed.length).toBe(4);
      expect(Number.isFinite(nanSpeed[0].spokenTimestamp)).toBe(true);

      const zeroSpeed = generateSimulatedBoundaries('The quick brown fox', 0);
      expect(zeroSpeed.length).toBe(4);
      expect(Number.isFinite(zeroSpeed[0].spokenTimestamp)).toBe(true);

      const highSpeed = generateSimulatedBoundaries('The quick brown fox', 100);
      expect(highSpeed.length).toBe(4);
      expect(highSpeed[3].spokenTimestamp > highSpeed[0].spokenTimestamp).toBe(true);
    });

    it('DICT-02: AudioDictationController clamps invalid speed values safely', () => {
      const controller = new AudioDictationController(1.0);
      controller.setSpeed(NaN);
      const b1 = controller.getBoundaries('Hello world test');
      expect(b1.length).toBe(3);
      expect(b1[0].spokenTimestamp >= 0).toBe(true);

      controller.setSpeed(-10);
      const b2 = controller.getBoundaries('Hello world test');
      expect(b2.length).toBe(3);
      expect(b2[0].spokenTimestamp >= 0).toBe(true);
    });

    it('AI-01: Reasoning thinking tags are properly stripped before drill sanitization', () => {
      const raw = '<think>I need to generate a 15-word sentence with key e.</think>The quick brown fox jumps over the river.';
      const stripped = raw.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
      expect(stripped).toBe('The quick brown fox jumps over the river.');
    });
  });
}
