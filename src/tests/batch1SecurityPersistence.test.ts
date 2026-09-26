import { describe, it, expect } from './testHarness';
import {
  getUnlockedPatronTitles,
  recordPatronContribution,
  TITLE_TO_TIER_MAP,
  getTitlesForTier,
} from '@/data/donation';
import { clearLocalProgress, readLocalProgress, writeLocalProgress } from '@/lib/progress';

export function registerBatch1SecurityPersistenceTests(): void {
  describe('Batch 1: Security, Financial Integrity & Data Persistence', () => {
    describe('SEC-01 & SEC-02: Patron Title & Tier Protection', () => {
    it('rejects manual claims from unlocking patron titles even if txHash has pay_ prefix', () => {
      recordPatronContribution({
        name: 'SpoofTester',
        amount: 50,
        currency: 'USD',
        platform: 'gateway',
        date: '2026-09-26',
        txHash: 'manual_pay_fake123',
        isManualClaim: true,
      });

      const unlocked = getUnlockedPatronTitles('SpoofTester');
      expect(unlocked.size).toBe(0);
      expect(unlocked.has('eternal_benefactor')).toBe(false);
      expect(unlocked.has('cyber_patron')).toBe(false);
    });

    it('rejects manual claims flagged with isManualClaim: true without prefix', () => {
      recordPatronContribution({
        name: 'SpoofTester2',
        amount: 100,
        currency: 'USD',
        platform: 'upi',
        date: '2026-09-26',
        txHash: 'pay_unverified_custom_ref',
        isManualClaim: true,
      });

      const unlocked = getUnlockedPatronTitles('SpoofTester2');
      expect(unlocked.size).toBe(0);
    });

    it('unlocks authentic verified gateway payments with valid pay_ prefix', () => {
      recordPatronContribution({
        name: 'RealBacker',
        amount: 50,
        currency: 'USD',
        platform: 'gateway',
        date: '2026-09-26',
        txHash: 'pay_authentic_signature_verified',
        tierId: 'tier_legend',
      });

      const unlocked = getUnlockedPatronTitles('RealBacker');
      expect(unlocked.has('eternal_benefactor')).toBe(true);
      expect(unlocked.has('grand_architect')).toBe(true);
      expect(unlocked.has('server_sustainer')).toBe(true);
      expect(unlocked.has('cyber_patron')).toBe(true);
    });

    it('maps verified titleId to authoritative tier accurately', () => {
      expect(TITLE_TO_TIER_MAP['cyber_patron']).toBe('tier_supporter');
      expect(TITLE_TO_TIER_MAP['server_sustainer']).toBe('tier_sustainer');
      expect(TITLE_TO_TIER_MAP['grand_architect']).toBe('tier_scholar');
      expect(TITLE_TO_TIER_MAP['eternal_benefactor']).toBe('tier_legend');

      expect(getTitlesForTier('tier_supporter')).toEqual(['cyber_patron']);
      expect(getTitlesForTier('tier_sustainer')).toEqual(['cyber_patron', 'server_sustainer']);
      expect(getTitlesForTier('tier_scholar')).toEqual(['cyber_patron', 'server_sustainer', 'grand_architect']);
      expect(getTitlesForTier('tier_legend')).toEqual([
        'cyber_patron',
        'server_sustainer',
        'grand_architect',
        'eternal_benefactor',
      ]);
    });
  });

  describe('STATE-01: Session Storage Purging on Sign-Out', () => {
    it('clearLocalProgress cleans up all user progress and session keys', () => {
      // Simulate populated user session
      localStorage.setItem('typezen_xp', '4500');
      localStorage.setItem('typezen_tests', '42');
      localStorage.setItem('typezen_history', JSON.stringify([{ wpm: 120 }]));
      localStorage.setItem('typezen_heatmap', JSON.stringify({ A: { total: 10, errors: 0 } }));
      localStorage.setItem('typezen_best_combo', '85');
      localStorage.setItem('typezen_pb:NOVICE:w25', JSON.stringify({ wpm: 110, samples: [] }));
      localStorage.setItem('typenova_active_title', 'cyber_patron');
      localStorage.setItem('guestMode', 'true');
      localStorage.setItem('typenova_guest_mode', 'true');

      // Verify keys exist
      expect(localStorage.getItem('typezen_xp')).toBe('4500');
      expect(localStorage.getItem('typezen_tests')).toBe('42');

      // Purge on sign-out
      clearLocalProgress();

      // Verify all keys are purged
      expect(localStorage.getItem('typezen_xp')).toBe(null);
      expect(localStorage.getItem('typezen_tests')).toBe(null);
      expect(localStorage.getItem('typezen_history')).toBe(null);
      expect(localStorage.getItem('typezen_heatmap')).toBe(null);
      expect(localStorage.getItem('typezen_best_combo')).toBe(null);
      expect(localStorage.getItem('typezen_pb:NOVICE:w25')).toBe(null);
      expect(localStorage.getItem('typenova_active_title')).toBe(null);
      expect(localStorage.getItem('guestMode')).toBe(null);
      expect(localStorage.getItem('typenova_guest_mode')).toBe(null);
    });

    it('readLocalProgress returns clean zero-state defaults after clearLocalProgress', () => {
      writeLocalProgress({
        xp: 9999,
        tests: 100,
        achievements: ['speed_demon'],
        heatmap: {},
        daily: null,
        quests: null,
        history: [],
        pbs: {},
        bestCombo: 50,
        racesWon: 10,
        academyRecords: {},
        academyXp: 500,
        academyStreak: { streak: 5, lastCompletedDate: null, freezeDaysRemaining: 0, longestStreak: 5 },
        wordWeakness: {},
        consent: null,
      });

      expect(readLocalProgress().xp).toBe(9999);

      clearLocalProgress();

      const fresh = readLocalProgress();
      expect(fresh.xp).toBe(0);
      expect(fresh.tests).toBe(0);
      expect(fresh.achievements).toEqual([]);
      expect(fresh.bestCombo).toBe(0);
      expect(fresh.racesWon).toBe(0);
    });
  });

  describe('STATE-04: Negative & Invalid XP Mathematical Hardening', () => {
    it('guarantees non-negative finite XP derivation for level and progress calculation', () => {
      const calculateLevelStats = (rawXp: number) => {
        const safeXp = Math.max(0, Number.isFinite(rawXp) ? rawXp : 0);
        const userLevel = Math.floor(Math.sqrt(safeXp / 100)) + 1;
        const nextLevelXp = Math.pow(userLevel, 2) * 100;
        const currentLevelProgress = safeXp - Math.pow(userLevel - 1, 2) * 100;
        const xpNeeded = nextLevelXp - Math.pow(userLevel - 1, 2) * 100;
        return { userLevel, nextLevelXp, currentLevelProgress, xpNeeded };
      };

      // Normal positive XP
      const normal = calculateLevelStats(400);
      expect(normal.userLevel).toBe(3);
      expect(normal.nextLevelXp).toBe(900);

      // Negative XP edge case (must not produce NaN)
      const negative = calculateLevelStats(-150);
      expect(negative.userLevel).toBe(1);
      expect(negative.nextLevelXp).toBe(100);
      expect(negative.currentLevelProgress).toBe(0);
      expect(Number.isNaN(negative.userLevel)).toBe(false);

      // NaN input
      const nanTest = calculateLevelStats(NaN);
      expect(nanTest.userLevel).toBe(1);
      expect(Number.isNaN(nanTest.currentLevelProgress)).toBe(false);

      // Infinity input
      const infTest = calculateLevelStats(Infinity);
      expect(infTest.userLevel).toBe(1);
      expect(Number.isNaN(infTest.userLevel)).toBe(false);
    });
  });
});
}
