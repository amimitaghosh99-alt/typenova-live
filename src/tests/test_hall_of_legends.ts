import { describe, it, expect } from './testHarness.ts';
import { ACHIEVEMENTS } from '../data/constants.ts';
import { achievementIcon, ACHIEVEMENT_ICONS } from '../lib/achievementIcons.ts';
import { getPrestigeRank } from '../components/profile/HallOfLegendsPanel.tsx';

export function registerHallOfLegendsTests(): void {
  describe('Hall of Legends — Achievement Roster Integrity', () => {
    it('verifies exactly 20 achievements exist with all required fields', () => {
      expect(ACHIEVEMENTS.length).toBe(20);
      const validCategories = new Set(['SKILL', 'HARDCORE', 'GRIND', 'SUPER']);

      for (const ach of ACHIEVEMENTS) {
        expect(typeof ach.id).toBe('string');
        expect(ach.id.length).toBeGreaterThan(0);
        expect(typeof ach.title).toBe('string');
        expect(ach.title.length).toBeGreaterThan(0);
        expect(typeof ach.desc).toBe('string');
        expect(ach.desc.length).toBeGreaterThan(0);
        expect(typeof ach.icon).toBe('string');
        expect(validCategories.has(ach.category)).toBe(true);
      }
    });

    it('ensures all achievement IDs are unique across the roster', () => {
      const ids = new Set<string>();
      for (const ach of ACHIEVEMENTS) {
        expect(ids.has(ach.id)).toBe(false);
        ids.add(ach.id);
      }
      expect(ids.size).toBe(20);
    });

    it('resolves every achievement icon key to a valid component without falling back', () => {
      for (const ach of ACHIEVEMENTS) {
        expect(ACHIEVEMENT_ICONS[ach.icon] !== undefined).toBe(true);
        const ResolvedIcon = achievementIcon(ach.icon);
        expect(ResolvedIcon !== undefined).toBe(true);
      }
    });

    it('verifies category breakdown matches design specs (7 SKILL, 5 HARDCORE, 5 GRIND, 3 SUPER)', () => {
      const skill = ACHIEVEMENTS.filter((a) => a.category === 'SKILL');
      const hardcore = ACHIEVEMENTS.filter((a) => a.category === 'HARDCORE');
      const grind = ACHIEVEMENTS.filter((a) => a.category === 'GRIND');
      const superCat = ACHIEVEMENTS.filter((a) => a.category === 'SUPER');

      expect(skill.length).toBe(7);
      expect(hardcore.length).toBe(5);
      expect(grind.length).toBe(5);
      expect(superCat.length).toBe(3);
      expect(skill.length + hardcore.length + grind.length + superCat.length).toBe(20);
    });
  });

  describe('Hall of Legends — Prestige Ranking Engine', () => {
    it('evaluates Novice Contender tier (0-4 unlocked)', () => {
      const zero = getPrestigeRank(0);
      expect(zero.currentTier.title).toBe('Novice Contender');
      expect(zero.currentTier.tierName).toBe('Tier I');
      expect(zero.remainingForNext).toBe(5);

      const three = getPrestigeRank(3);
      expect(three.currentTier.title).toBe('Novice Contender');
      expect(three.remainingForNext).toBe(2);
    });

    it('evaluates Adept Typist tier (5-9 unlocked)', () => {
      const five = getPrestigeRank(5);
      expect(five.currentTier.title).toBe('Adept Typist');
      expect(five.currentTier.tierName).toBe('Tier II');
      expect(five.remainingForNext).toBe(5);

      const nine = getPrestigeRank(9);
      expect(nine.currentTier.title).toBe('Adept Typist');
      expect(nine.remainingForNext).toBe(1);
    });

    it('evaluates Master Tactician tier (10-14 unlocked)', () => {
      const ten = getPrestigeRank(10);
      expect(ten.currentTier.title).toBe('Master Tactician');
      expect(ten.currentTier.tierName).toBe('Tier III');
      expect(ten.remainingForNext).toBe(5);

      const fourteen = getPrestigeRank(14);
      expect(fourteen.currentTier.title).toBe('Master Tactician');
      expect(fourteen.remainingForNext).toBe(1);
    });

    it('evaluates Apex Legend tier (15-19 unlocked)', () => {
      const fifteen = getPrestigeRank(15);
      expect(fifteen.currentTier.title).toBe('Apex Legend');
      expect(fifteen.currentTier.tierName).toBe('Tier IV');
      expect(fifteen.remainingForNext).toBe(5);

      const nineteen = getPrestigeRank(19);
      expect(nineteen.currentTier.title).toBe('Apex Legend');
      expect(nineteen.remainingForNext).toBe(1);
    });

    it('evaluates TYPE NOVA Immortal tier (20 unlocked)', () => {
      const twenty = getPrestigeRank(20);
      expect(twenty.currentTier.title).toBe('TYPE NOVA Immortal');
      expect(twenty.currentTier.tierName).toBe('Apex');
      expect(twenty.nextTier).toBe(null);
      expect(twenty.remainingForNext).toBe(0);
    });
  });
}
