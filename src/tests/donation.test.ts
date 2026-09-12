import { describe, it, expect } from './testHarness.ts';
import {
  DONATION_CONFIG,
  getDonationProgressPercent,
  getFeaturedPatrons,
  getCombinedPatrons,
  SUPPORTED_CURRENCIES,
  convertCurrency,
  formatCurrency,
  SUPPORTER_TIERS,
  generatePatronCertificateSerial,
  PATRON_WALL_MAX,
  PREMIUM_ACCENT,
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

    it('lists milestones in ascending amount order (foundation → full tuition)', () => {
      const amounts = DONATION_CONFIG.goal.milestones.map((m) => m.amount);
      for (let i = 1; i < amounts.length; i++) {
        expect(amounts[i] > amounts[i - 1]).toBe(true);
      }
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

  describe('Premium Vault — Impact Stats & Patron Wall', () => {
    it('defines premium accent and patron wall cap constants', () => {
      expect(PREMIUM_ACCENT).toBe('#d4af37');
      expect(PATRON_WALL_MAX).toBe(5);
    });

    it('carries impact stats with sane bounds for the vault page', () => {
      const { impactStats } = DONATION_CONFIG;
      expect(impactStats.testsHosted).toBeGreaterThan(0);
      expect(impactStats.serversPaid).toBeGreaterThanOrEqual(0);
      expect(impactStats.tuitionPercent).toBeGreaterThanOrEqual(0);
      expect(impactStats.tuitionPercent).toBeLessThanOrEqual(100);
    });

    it('ships featured patrons within the wall cap and valid platforms', () => {
      expect(DONATION_CONFIG.featuredPatrons.length).toBeGreaterThan(0);
      expect(DONATION_CONFIG.featuredPatrons.length).toBeLessThanOrEqual(PATRON_WALL_MAX);

      const validPlatforms = ['upi', 'kofi', 'bmc', 'paypal', 'github', 'crypto'];
      DONATION_CONFIG.featuredPatrons.forEach((p) => {
        expect(p.name.length).toBeGreaterThan(0);
        expect(p.amount).toBeGreaterThan(0);
        expect(validPlatforms.includes(p.platform)).toBe(true);
        expect(p.date.length).toBeGreaterThanOrEqual(10);
      });
    });

    it('sorts featured patrons highest-first and caps at PATRON_WALL_MAX', () => {
      const sorted = getFeaturedPatrons();
      expect(sorted.length).toBeLessThanOrEqual(PATRON_WALL_MAX);

      for (let i = 1; i < sorted.length; i++) {
        expect(sorted[i - 1].amount >= sorted[i].amount).toBe(true);
      }
    });

    it('does not mutate the source array when sorting for the wall', () => {
      const before = DONATION_CONFIG.featuredPatrons.map((p) => p.amount).join(',');
      getFeaturedPatrons();
      const after = DONATION_CONFIG.featuredPatrons.map((p) => p.amount).join(',');
      expect(before).toBe(after);
    });
  });

  describe('Supporter Rewards — Patron Title Badges & Icons', () => {
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

    it('registers server_sustainer, grand_architect, and eternal_benefactor in TITLE_BADGES', () => {
      const titles = ['server_sustainer', 'grand_architect', 'eternal_benefactor'];
      titles.forEach((id) => {
        const badge = TITLE_BADGES.find((b) => b.id === id);
        expect(badge).not.toBe(undefined);
        expect(badge?.name.length).toBeGreaterThan(0);
        expect(badge?.isUnlocked({
          maxWpm: 0,
          avgAccuracy: 0,
          testsCompleted: 0,
          dailyStreak: 0,
          racesWon: 0,
          totalWordsTyped: 0,
        })).toBe(true);
      });
    });

    it('maps all supporter title icons in TITLE_ICONS and resolves them in TITLE_MARK', () => {
      const titles = ['cyber_patron', 'server_sustainer', 'grand_architect', 'eternal_benefactor'];
      titles.forEach((id) => {
        const badge = TITLE_BADGES.find((b) => b.id === id)!;
        expect(TITLE_ICONS[badge.icon]).not.toBe(undefined);
        expect(TITLE_MARK[id]).not.toBe(undefined);
      });
    });
  });

  describe('Multi-Currency & Conversion Engine', () => {
    it('supports 7 global currencies with positive rates and suggested amounts', () => {
      const keys = ['INR', 'USD', 'EUR', 'GBP', 'CAD', 'JPY', 'AUD'] as const;
      keys.forEach((k) => {
        const info = SUPPORTED_CURRENCIES[k];
        expect(info).not.toBe(undefined);
        expect(info.code).toBe(k);
        expect(info.symbol.length).toBeGreaterThan(0);
        expect(info.rateToUsd).toBeGreaterThan(0);
        expect(info.suggestedAmounts.length).toBeGreaterThanOrEqual(4);
      });
    });

    it('converts currencies accurately and handles edge cases', () => {
      // Identity
      expect(convertCurrency(100, 'USD', 'USD')).toBe(100);
      expect(convertCurrency(0, 'USD', 'INR')).toBe(0);
      expect(convertCurrency(-5, 'USD', 'EUR')).toBe(-5);

      // USD to INR: 10 USD = ~865 INR
      const inr = convertCurrency(10, 'USD', 'INR');
      expect(inr).toBe(865);

      // INR to USD: 865 INR = 10 USD
      const usd = convertCurrency(865, 'INR', 'USD');
      expect(usd).toBe(10);
    });

    it('formats currencies with appropriate symbols and decimal rules', () => {
      expect(formatCurrency(250, 'INR')).toBe('₹250');
      expect(formatCurrency(1000, 'JPY')).toBe('¥1,000');
      expect(formatCurrency(25, 'USD')).toBe('$25');
      expect(formatCurrency(15.5, 'EUR')).toBe('€15.50');
    });
  });

  describe('Supporter Tiers & Milestone Transparency Budgets', () => {
    it('defines 4 structured benefactor tiers in ascending USD amounts', () => {
      expect(SUPPORTER_TIERS.length).toBe(4);
      for (let i = 1; i < SUPPORTER_TIERS.length; i++) {
        expect(SUPPORTER_TIERS[i].usdAmount > SUPPORTER_TIERS[i - 1].usdAmount).toBe(true);
      }
      SUPPORTER_TIERS.forEach((t) => {
        expect(t.name.length).toBeGreaterThan(0);
        expect(t.badge.length).toBeGreaterThan(0);
        expect(t.perks.length).toBeGreaterThanOrEqual(3);
        expect(TITLE_BADGES.some((b) => b.id === t.titleRewardId)).toBe(true);
      });
    });

    it('attaches itemized budget breakdowns to all community milestones', () => {
      DONATION_CONFIG.goal.milestones.forEach((m) => {
        expect(m.budgetBreakdown).not.toBe(undefined);
        expect(m.budgetBreakdown!.length).toBeGreaterThan(0);
        m.budgetBreakdown!.forEach((item) => {
          expect(item.item.length).toBeGreaterThan(0);
          expect(item.cost.length).toBeGreaterThan(0);
          expect(item.purpose.length).toBeGreaterThan(0);
        });
      });
    });

    it('generates a valid cryptographic certificate serial number', () => {
      const s1 = generatePatronCertificateSerial('Typist_Ace', 25);
      expect(s1.startsWith('TN-VAULT-')).toBe(true);
      expect(s1.endsWith('-GOLD')).toBe(true);

      const s2 = generatePatronCertificateSerial('Legend_99', 50);
      expect(s2.endsWith('-LEGEND')).toBe(true);

      const s3 = generatePatronCertificateSerial('Supporter_1', 5);
      expect(s3.endsWith('-PATRON')).toBe(true);
    });

    it('handles local patron contributions and combined ledger safely', () => {
      const combined = getCombinedPatrons();
      expect(combined.length).toBeGreaterThan(0);
      expect(combined.length).toBeLessThanOrEqual(PATRON_WALL_MAX);
    });
  });
}

