import { describe, it, expect } from './testHarness.ts';
import {
  DONATION_CONFIG,
  getDonationProgressPercent,
  type DonationConfig,
} from '../data/donation.ts';
import { TITLE_BADGES } from '../data/titles.ts';
import { TITLE_ICONS, TITLE_MARK } from '../lib/titleIcons.ts';

export function registerDonationTests(): void {
  describe('Community Supporter & Donation Engine — Configuration', () => {
    it('contains valid community goal with $2,000 target and progress milestones', () => {
      expect(DONATION_CONFIG.goal.targetAmount).toBe(2000);
      expect(DONATION_CONFIG.goal.currentAmount).toBe(0);
      expect(DONATION_CONFIG.goal.currency).toBe('$');
      expect(DONATION_CONFIG.goal.milestones.length).toBeGreaterThanOrEqual(3);

      DONATION_CONFIG.goal.milestones.forEach((m) => {
        expect(m.amount).toBeGreaterThan(0);
        expect(m.label.length).toBeGreaterThan(2);
      });
    });

    it('calculates donation progress percentage accurately and clamps correctly', () => {
      // Default configured: 0 / 2000 = 0%
      expect(getDonationProgressPercent(DONATION_CONFIG)).toBe(0);

      // Boundary: 0 / 2000 = 0%
      const configZero: DonationConfig = {
        ...DONATION_CONFIG,
        goal: { ...DONATION_CONFIG.goal, currentAmount: 0 },
      };
      expect(getDonationProgressPercent(configZero)).toBe(0);

      // Boundary: 2000 / 2000 = 100%
      const configFull: DonationConfig = {
        ...DONATION_CONFIG,
        goal: { ...DONATION_CONFIG.goal, currentAmount: 2000 },
      };
      expect(getDonationProgressPercent(configFull)).toBe(100);

      // Boundary: overfunded 2500 / 2000 = clamped to 100%
      const configOver: DonationConfig = {
        ...DONATION_CONFIG,
        goal: { ...DONATION_CONFIG.goal, currentAmount: 2500 },
      };
      expect(getDonationProgressPercent(configOver)).toBe(100);

      // Edge: targetAmount 0 returns 0
      const configZeroTarget: DonationConfig = {
        ...DONATION_CONFIG,
        goal: { ...DONATION_CONFIG.goal, targetAmount: 0 },
      };
      expect(getDonationProgressPercent(configZeroTarget)).toBe(0);
    });

    it('has valid external platform URLs (Ko-fi, BuyMeACoffee, PayPal, GitHub)', () => {
      expect(DONATION_CONFIG.kofiUrl.startsWith('https://')).toBe(true);
      expect(DONATION_CONFIG.buyMeACoffeeUrl.startsWith('https://')).toBe(true);
      expect(DONATION_CONFIG.paypalUrl.startsWith('https://')).toBe(true);
      expect(DONATION_CONFIG.githubSponsorsUrl.startsWith('https://')).toBe(true);
    });

    it('has UPI configuration with suggested INR amounts for Indian & Nepali typists', () => {
      expect(DONATION_CONFIG.upi.upiId.includes('@')).toBe(true);
      expect(DONATION_CONFIG.upi.payeeName.length).toBeGreaterThan(0);
      expect(DONATION_CONFIG.upi.suggestedAmountsInr.length).toBeGreaterThanOrEqual(3);
    });

    it('has multi-network crypto wallet addresses with valid strings', () => {
      expect(DONATION_CONFIG.crypto.length).toBeGreaterThanOrEqual(3);
      DONATION_CONFIG.crypto.forEach((w) => {
        expect(w.symbol.length).toBeGreaterThan(1);
        expect(w.address.length).toBeGreaterThan(20);
        expect(typeof w.badgeColor).toBe('string');
      });
    });
  });

  describe('Supporter Rewards — Cyber Patron Title Badge', () => {
    it('registers cyber_patron title in TITLE_BADGES with hand-heart icon', () => {
      const patronTitle = TITLE_BADGES.find((b) => b.id === 'cyber_patron');
      expect(patronTitle).not.toBe(undefined);
      expect(patronTitle?.name).toBe('Cyber Patron');
      expect(patronTitle?.icon).toBe('hand-heart');
      expect(patronTitle?.isUnlocked({
        maxWpm: 0,
        avgAccuracy: 0,
        testsCompleted: 0,
        dailyStreak: 0,
        racesWon: 0,
        totalWordsTyped: 0,
      })).toBe(true);
    });

    it('maps hand-heart icon to Lucide HandHeart in TITLE_ICONS and TITLE_MARK', () => {
      expect(TITLE_ICONS['hand-heart']).not.toBe(undefined);
      expect(TITLE_MARK['cyber_patron']).not.toBe(undefined);
    });
  });
}
