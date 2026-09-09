import { describe, it, expect } from './testHarness.ts';
import {
  calculateHexEnergy,
  canCastHex,
  applyIncomingHex,
  pruneExpiredHexes,
  applyCapitalsCurse,
  type ActiveHex,
} from '../lib/sabotageEngine';

export function registerSabotageEngineTests() {
  describe('Phase 4: Cyber Sabotage Engine - Energy, Combat & Conflict Resolution', () => {
    it('charges base energy (+1.5%) on low combo keystroke', () => {
      const energy = calculateHexEnergy({ currentEnergy: 10, combo: 5 });
      expect(energy).toBe(11.5);
    });

    it('applies combo streak multiplier at 25x, 50x, 100x', () => {
      const energy25 = calculateHexEnergy({ currentEnergy: 0, combo: 25 });
      expect(energy25).toBe(1.7);

      const energy50 = calculateHexEnergy({ currentEnergy: 0, combo: 50 });
      expect(energy50).toBe(2.0);

      const energy100 = calculateHexEnergy({ currentEnergy: 0, combo: 100 });
      expect(energy100).toBe(2.3);
    });

    it('awards milestone burst (+15%) on combo milestone', () => {
      const energy = calculateHexEnergy({ currentEnergy: 20, combo: 50, isMilestone: true });
      expect(energy).toBe(37.0);
    });

    it('penalizes -15% energy on keystroke error', () => {
      const energy = calculateHexEnergy({ currentEnergy: 40, combo: 0, isError: true });
      expect(energy).toBe(25.0);
    });

    it('clamps energy strictly between 0 and 100', () => {
      const underflow = calculateHexEnergy({ currentEnergy: 5, combo: 0, isError: true });
      expect(underflow).toBe(0);

      const overflow = calculateHexEnergy({ currentEnergy: 95, combo: 50, isMilestone: true });
      expect(overflow).toBe(100);
    });

    it('validates casting readiness based on ability energy costs', () => {
      expect(canCastHex(30, 'glitch_fog')).toBe(false);
      expect(canCastHex(35, 'glitch_fog')).toBe(true);
      expect(canCastHex(40, 'glitch_fog')).toBe(true);

      expect(canCastHex(45, 'capitals_curse')).toBe(false);
      expect(canCastHex(50, 'capitals_curse')).toBe(true);

      expect(canCastHex(60, 'caret_inversion')).toBe(false);
      expect(canCastHex(65, 'caret_inversion')).toBe(true);

      expect(canCastHex(35, 'cleanse_shield')).toBe(false);
      expect(canCastHex(40, 'cleanse_shield')).toBe(true);
    });

    it('applies incoming disruption hex when player is unshielded', () => {
      const baseNow = 100000;
      const result = applyIncomingHex({
        activeHexes: [],
        incomingHex: {
          id: 'hex-1',
          hexType: 'glitch_fog',
          fromName: 'CyberRacer',
          fromId: 'user-2',
          appliedAt: baseNow,
          durationMs: 4500,
        },
        now: baseNow,
      });

      expect(result.deflected).toBe(false);
      expect(result.updatedHexes.length).toBe(1);
      expect(result.updatedHexes[0].hexType).toBe('glitch_fog');
      expect(result.updatedHexes[0].expiresAt).toBe(baseNow + 4500);
    });

    it('deflects incoming disruption hex when player has active Cleanse Shield', () => {
      const baseNow = 100000;
      const shieldHex: ActiveHex = {
        id: 'shield-1',
        hexType: 'cleanse_shield',
        fromName: 'Self',
        fromId: 'user-1',
        appliedAt: baseNow,
        durationMs: 3500,
        expiresAt: baseNow + 3500,
      };

      const result = applyIncomingHex({
        activeHexes: [shieldHex],
        incomingHex: {
          id: 'hex-2',
          hexType: 'caret_inversion',
          fromName: 'Rival',
          fromId: 'user-2',
          appliedAt: baseNow + 1000,
          durationMs: 5000,
        },
        now: baseNow + 1000,
      });

      expect(result.deflected).toBe(true);
      expect(result.updatedHexes.length).toBe(1);
      expect(result.updatedHexes[0].hexType).toBe('cleanse_shield');
    });

    it('purges existing negative hexes when activating Cleanse Shield', () => {
      const baseNow = 100000;
      const fogHex: ActiveHex = {
        id: 'fog-1',
        hexType: 'glitch_fog',
        fromName: 'Rival',
        fromId: 'user-2',
        appliedAt: baseNow,
        durationMs: 4500,
        expiresAt: baseNow + 4500,
      };

      const result = applyIncomingHex({
        activeHexes: [fogHex],
        incomingHex: {
          id: 'shield-2',
          hexType: 'cleanse_shield',
          fromName: 'Self',
          fromId: 'user-1',
          appliedAt: baseNow + 500,
          durationMs: 3500,
        },
        now: baseNow + 500,
      });

      expect(result.cleansed).toBe(true);
      expect(result.updatedHexes.length).toBe(1);
      expect(result.updatedHexes[0].hexType).toBe('cleanse_shield');
    });

    it('prunes expired hexes correctly based on timestamp', () => {
      const hexes: ActiveHex[] = [
        {
          id: '1',
          hexType: 'glitch_fog',
          fromName: 'A',
          fromId: 'a',
          appliedAt: 1000,
          durationMs: 2000,
          expiresAt: 3000,
        },
        {
          id: '2',
          hexType: 'caret_inversion',
          fromName: 'B',
          fromId: 'b',
          appliedAt: 1000,
          durationMs: 6000,
          expiresAt: 7000,
        },
      ];

      const aliveAt4000 = pruneExpiredHexes(hexes, 4000);
      expect(aliveAt4000.length).toBe(1);
      expect(aliveAt4000[0].id).toBe('2');

      const aliveAt8000 = pruneExpiredHexes(hexes, 8000);
      expect(aliveAt8000.length).toBe(0);
    });

    it('mutates the next N words to UPPERCASE starting at currentIndex in Capitals Curse', () => {
      const text = 'the quick brown fox jumps over the lazy dog';
      const mutated = applyCapitalsCurse(text, 4, 3);
      expect(mutated).toBe('the QUICK BROWN FOX jumps over the lazy dog');
    });

    it('preserves already typed prefix without mutation in Capitals Curse', () => {
      const text = 'fast clean precision typing mastery';
      const mutated = applyCapitalsCurse(text, 11, 2);
      expect(mutated).toBe('fast clean PRECISION TYPING mastery');
    });
  });
}
