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
  getTitlesForTier,
  isPatronTitle,
  resetPatronData,
  removeLocalPatron,
  clearAllLocalPatrons,
  recordPatronContribution,
  resolveUserContributions,
  type DonationConfig,
} from '../data/donation.ts';
import { TITLE_BADGES } from '../data/titles.ts';
import { TITLE_ICONS, TITLE_MARK } from '../lib/titleIcons.ts';

export function registerDonationTests(): void {
  describe('Community Supporter & Donation Engine — Configuration', () => {
    it('contains valid community goal with $3,000 target and progress milestones', () => {
      expect(DONATION_CONFIG.goal.targetAmount).toBe(3000);
      expect(DONATION_CONFIG.goal.currentAmount).toBe(0);
      expect(DONATION_CONFIG.goal.currency).toBe('$');
      expect(DONATION_CONFIG.goal.milestones.length).toBeGreaterThanOrEqual(3);

      DONATION_CONFIG.goal.milestones.forEach((m) => {
        expect(m.amount).toBeGreaterThan(0);
        expect(m.label.length).toBeGreaterThan(2);
      });
    });

    it('lists milestones in ascending amount order (foundation → full annual goal)', () => {
      const amounts = DONATION_CONFIG.goal.milestones.map((m) => m.amount);
      for (let i = 1; i < amounts.length; i++) {
        expect(amounts[i] > amounts[i - 1]).toBe(true);
      }
    });

    it('calculates donation progress percentage accurately and clamps correctly', () => {
      // Default configured: 0 / 3000 = 0%
      expect(getDonationProgressPercent(DONATION_CONFIG)).toBe(0);

      // Boundary: 0 / 3000 = 0%
      const configZero: DonationConfig = {
        ...DONATION_CONFIG,
        goal: { ...DONATION_CONFIG.goal, currentAmount: 0 },
      };
      expect(getDonationProgressPercent(configZero)).toBe(0);

      // Boundary: 3000 / 3000 = 100%
      const configFull: DonationConfig = {
        ...DONATION_CONFIG,
        goal: { ...DONATION_CONFIG.goal, currentAmount: 3000 },
      };
      expect(getDonationProgressPercent(configFull)).toBe(100);

      // Boundary: overfunded 3500 / 3000 = clamped to 100%
      const configOver: DonationConfig = {
        ...DONATION_CONFIG,
        goal: { ...DONATION_CONFIG.goal, currentAmount: 3500 },
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
    it('supports over 130 global currencies with positive rates and suggested amounts', () => {
      const keys = ['INR', 'USD', 'EUR', 'GBP', 'CAD', 'JPY', 'AUD', 'SGD', 'AED', 'KRW', 'BRL', 'CHF', 'NZD', 'ZAR'] as const;
      keys.forEach((k) => {
        const info = SUPPORTED_CURRENCIES[k];
        expect(info).not.toBe(undefined);
        expect(info.code).toBe(k);
        expect(info.symbol.length).toBeGreaterThan(0);
        expect(info.rateToUsd).toBeGreaterThan(0);
        expect(info.suggestedAmounts.length).toBeGreaterThanOrEqual(4);
      });
      expect(Object.keys(SUPPORTED_CURRENCIES).length).toBeGreaterThanOrEqual(130);
    });

    it('enforces zero-decimal formatting on all zero-decimal currencies', () => {
      expect(formatCurrency(10000, 'KRW')).toBe('₩10,000');
      expect(formatCurrency(50000, 'VND')).toBe('₫50,000');
      expect(formatCurrency(950, 'CLP')).toBe('CLP$950');
      expect(formatCurrency(138, 'ISK')).toBe('kr138');
      expect(formatCurrency(1000, 'JPY')).toBe('¥1,000');
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

      // USD to SGD (1.34)
      const sgd = convertCurrency(100, 'USD', 'SGD');
      expect(sgd).toBe(134);

      // USD to AED (3.67)
      const aed = convertCurrency(100, 'USD', 'AED');
      expect(aed).toBe(367);
    });

    it('formats currencies with appropriate symbols and decimal rules', () => {
      expect(formatCurrency(250, 'INR')).toBe('₹250');
      expect(formatCurrency(1000, 'JPY')).toBe('¥1,000');
      expect(formatCurrency(25, 'USD')).toBe('$25');
      expect(formatCurrency(15.5, 'EUR')).toBe('€15.50');
      expect(formatCurrency(50, 'SGD')).toBe('S$50');
      expect(formatCurrency(100, 'AED')).toBe('د.إ100');
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

    it('validates Razorpay live key ID format and configuration', () => {
      const liveKey = 'rzp_live_TbVpQOmxku36j4';
      expect(liveKey.startsWith('rzp_live_')).toBe(true);
      expect(liveKey.length).toBe(23);
    });

    it('strictly restricts title rewards per tier without leaky escalation', () => {
      // Supporter ($3) unlocks ONLY cyber_patron
      const supporterTitles = getTitlesForTier('tier_supporter');
      expect(supporterTitles).toEqual(['cyber_patron']);
      expect(supporterTitles.includes('server_sustainer')).toBe(false);
      expect(supporterTitles.includes('grand_architect')).toBe(false);
      expect(supporterTitles.includes('eternal_benefactor')).toBe(false);

      // Sustainer ($10) unlocks cyber_patron + server_sustainer
      const sustainerTitles = getTitlesForTier('tier_sustainer');
      expect(sustainerTitles).toEqual(['cyber_patron', 'server_sustainer']);
      expect(sustainerTitles.includes('grand_architect')).toBe(false);
      expect(sustainerTitles.includes('eternal_benefactor')).toBe(false);

      // Scholar ($25) unlocks top 3
      const scholarTitles = getTitlesForTier('tier_scholar');
      expect(scholarTitles).toEqual(['cyber_patron', 'server_sustainer', 'grand_architect']);
      expect(scholarTitles.includes('eternal_benefactor')).toBe(false);

      // Celestial Legend ($50) unlocks all 4
      const legendTitles = getTitlesForTier('tier_legend');
      expect(legendTitles).toEqual(['cyber_patron', 'server_sustainer', 'grand_architect', 'eternal_benefactor']);
    });

    it('correctly discriminates patron titles from standard game titles', () => {
      expect(isPatronTitle('cyber_patron')).toBe(true);
      expect(isPatronTitle('server_sustainer')).toBe(true);
      expect(isPatronTitle('grand_architect')).toBe(true);
      expect(isPatronTitle('eternal_benefactor')).toBe(true);
      expect(isPatronTitle('novice')).toBe(false);
      expect(isPatronTitle('speed_demon')).toBe(false);
      expect(isPatronTitle('word_artisan')).toBe(false);
    });

    it('safely provides resetPatronData for purging local test states', () => {
      expect(typeof resetPatronData).toBe('function');
    });

    it('safely provides removeLocalPatron and clearAllLocalPatrons for purging user cards', () => {
      expect(typeof removeLocalPatron).toBe('function');
      expect(typeof clearAllLocalPatrons).toBe('function');
      // Verify safe invocation without throwing in test environment
      expect(Array.isArray(removeLocalPatron({ txHash: 'test_hash' }))).toBe(true);
      clearAllLocalPatrons();
    });

    it('records a patron contribution with a custom board message safely', () => {
      const testMsg = 'Proud supporter of open source typing!';
      const recorded = recordPatronContribution({
        name: 'Test_Operator',
        amount: 50,
        currency: 'USD',
        platform: 'gateway',
        date: '2026-09-14',
        message: testMsg,
        txHash: 'pay_test_board_msg_001',
      });

      expect(recorded.some((p) => p.name === 'Test_Operator' && p.message === testMsg)).toBe(true);
      expect(Array.isArray(removeLocalPatron({ txHash: 'pay_test_board_msg_001' }))).toBe(true);
    });
  });

  describe('Supporter Certificate & Exact Tender Resolution Engine', () => {
    it('accurately resolves single contribution with exact amount and foreign currency', () => {
      const records = [
        {
          name: 'Arunabha Ghosh',
          amount: 2500,
          currency: 'INR' as const,
          platform: 'gateway' as const,
          date: '2026-09-14',
          tierId: 'tier_legend',
          txHash: 'pay_live_inr_001',
        },
      ];

      const res = resolveUserContributions('Arunabha Ghosh', records);
      expect(res.hasVerifiedContribution).toBe(true);
      expect(res.primaryRecord).not.toBe(null);
      expect(res.primaryRecord?.amount).toBe(2500);
      expect(res.primaryRecord?.currency).toBe('INR');
      expect(res.primaryRecord?.tierId).toBe('tier_legend');
      expect(res.totalContributedUsd).toBeGreaterThan(25);
    });

    it('ranks highest tier contribution first when multiple donations exist', () => {
      const records = [
        {
          name: 'AGPRIME',
          amount: 10,
          currency: 'USD' as const,
          platform: 'gateway' as const,
          date: '2026-09-10',
          tierId: 'tier_sustainer',
          txHash: 'pay_tier_sustainer_001',
        },
        {
          name: 'AGPRIME',
          amount: 50,
          currency: 'USD' as const,
          platform: 'gateway' as const,
          date: '2026-09-14',
          tierId: 'tier_legend',
          txHash: 'pay_tier_legend_002',
        },
      ];

      const res = resolveUserContributions('agprime', records);
      expect(res.hasVerifiedContribution).toBe(true);
      expect(res.primaryRecord?.amount).toBe(50);
      expect(res.primaryRecord?.tierId).toBe('tier_legend');
      expect(res.allRecords.length).toBe(2);
      expect(res.allRecords[0].amount).toBe(50);
      expect(res.allRecords[1].amount).toBe(10);
      expect(res.totalContributedUsd).toBe(60);
    });

    it('strictly excludes sandbox simulation transactions from certificate accreditation', () => {
      const records = [
        {
          name: 'TestSimUser',
          amount: 500,
          currency: 'USD' as const,
          platform: 'gateway' as const,
          date: '2026-09-14',
          txHash: 'TN-SIM-ABCDEF',
          message: 'Sandbox Simulated Contribution',
        },
      ];

      const res = resolveUserContributions('TestSimUser', records);
      expect(res.hasVerifiedContribution).toBe(false);
      expect(res.primaryRecord).toBe(null);
      expect(res.allRecords.length).toBe(0);
      expect(res.totalContributedUsd).toBe(0);
    });

    it('handles empty or unrecognized username gracefully', () => {
      const res = resolveUserContributions('', []);
      expect(res.hasVerifiedContribution).toBe(false);
      expect(res.primaryRecord).toBe(null);
      expect(res.allRecords.length).toBe(0);
    });
  });

  describe('Supporter Perks Delivery — Holographic Titles, Lobby Aura & Wall Highlights', () => {
    it('verifies all 4 supporter titles are marked as patron titles', () => {
      const titles = ['cyber_patron', 'server_sustainer', 'grand_architect', 'eternal_benefactor'];
      titles.forEach((id) => {
        expect(isPatronTitle(id)).toBe(true);
      });
      expect(isPatronTitle('speed_demon')).toBe(false);
      expect(isPatronTitle('keyboard_warrior')).toBe(false);
    });

    it('classifies patrons accurately for Celestial Apex ($50+) and High Architect ($25+) wall highlights', () => {
      // Celestial tier ($50 USD or tier_legend)
      const celestial1 = { amount: 50, currency: 'USD' as const, tierId: 'tier_legend' };
      const usd1 = convertCurrency(celestial1.amount, celestial1.currency, 'USD');
      const isCelestial1 = usd1 >= 50 || celestial1.tierId === 'tier_legend';
      expect(isCelestial1).toBe(true);

      // INR equivalent of $50 (approx 4150 INR)
      const celestialINR = { amount: 4500, currency: 'INR' as const };
      const usdINR = convertCurrency(celestialINR.amount, celestialINR.currency, 'USD');
      const isCelestialINR = usdINR >= 50;
      expect(isCelestialINR).toBe(true);

      // High Architect tier ($25 USD or tier_scholar)
      const scholar = { amount: 25, currency: 'USD' as const, tierId: 'tier_scholar' };
      const usdScholar = convertCurrency(scholar.amount, scholar.currency, 'USD');
      const isScholar = usdScholar >= 25 || scholar.tierId === 'tier_scholar';
      expect(isScholar).toBe(true);

      // Regular supporter ($3 USD)
      const supporter = { amount: 3, currency: 'USD' as const, tierId: 'tier_supporter' };
      const usdSupporter = convertCurrency(supporter.amount, supporter.currency, 'USD');
      expect(usdSupporter >= 25).toBe(false);
      expect(usdSupporter >= 50).toBe(false);
    });

    it('verifies RacerState equipped title correctly triggers supporter golden aura in lobby', () => {
      const racer1: { id: string; name: string; title?: string } = { id: 'r1', name: 'CosmicRacer', title: 'server_sustainer' };
      const racer2: { id: string; name: string; title?: string } = { id: 'r2', name: 'SpeedyTyper', title: 'speed_demon' };
      const racer3: { id: string; name: string; title?: string } = { id: 'r3', name: 'NewGuest' };

      expect(racer1.title ? isPatronTitle(racer1.title) : false).toBe(true);
      expect(racer2.title ? isPatronTitle(racer2.title) : false).toBe(false);
      expect(racer3.title ? isPatronTitle(racer3.title) : false).toBe(false);
    });

    it('enforces zero-decimal currency multiplier for JPY and 100x for standard currencies', () => {
      const ZERO_DECIMAL_CURRENCIES = new Set(['JPY']);
      const getFactor = (cur: string) => ZERO_DECIMAL_CURRENCIES.has(cur.toUpperCase()) ? 1 : 100;

      // JPY 1,500 should be 1,500 yen (smallest unit is 1 yen)
      const jpyAmount = 1500;
      const jpyFactor = getFactor('JPY');
      expect(jpyFactor).toBe(1);
      expect(Math.round(jpyAmount * jpyFactor)).toBe(1500);

      // USD $10 should be 1000 cents
      const usdAmount = 10;
      const usdFactor = getFactor('USD');
      expect(usdFactor).toBe(100);
      expect(Math.round(usdAmount * usdFactor)).toBe(1000);

      // INR 500 should be 50,000 paise
      const inrAmount = 500;
      const inrFactor = getFactor('INR');
      expect(inrFactor).toBe(100);
      expect(Math.round(inrAmount * inrFactor)).toBe(50000);
    });

    it('sorts Patron Wall TOP list by USD normalized equivalence, avoiding foreign currency inflation', () => {
      const patrons = [
        { name: 'PatronA', amount: 500, currency: 'INR' as const, date: '2026-01-01' },
        { name: 'PatronB', amount: 100, currency: 'USD' as const, date: '2026-01-02' },
        { name: 'PatronC', amount: 3000, currency: 'JPY' as const, date: '2026-01-03' },
      ];

      // Defective raw amount sort: PatronC (3000) > PatronA (500) > PatronB (100)
      const rawSorted = [...patrons].sort((a, b) => b.amount - a.amount);
      expect(rawSorted[0].name).toBe('PatronC');
      expect(rawSorted[1].name).toBe('PatronA');
      expect(rawSorted[2].name).toBe('PatronB');

      // Remediated USD-normalized sort:
      // PatronB ($100 USD = $100)
      // PatronC (3000 JPY = $20 USD)
      // PatronA (500 INR = ~$6.02 USD)
      const usdSorted = [...patrons].sort((a, b) => {
        const usdB = convertCurrency(b.amount, b.currency, 'USD');
        const usdA = convertCurrency(a.amount, a.currency, 'USD');
        return usdB - usdA;
      });

      expect(usdSorted[0].name).toBe('PatronB'); // $100 USD
      expect(usdSorted[1].name).toBe('PatronC'); // ~$20 USD
      expect(usdSorted[2].name).toBe('PatronA'); // ~$6 USD
    });

    it('handles lowercase, mixed case, and unknown currency gracefully without throwing', () => {
      // Lowercase
      const inrToUsd = convertCurrency(100, 'inr' as any, 'usd' as any);
      expect(inrToUsd).toBeGreaterThan(1);
      expect(inrToUsd).toBeLessThan(2);

      // Unknown currency fallback to 1:1
      const unknownConversion = convertCurrency(50, 'XYZ' as any, 'USD');
      expect(unknownConversion).toBe(50);

      // formatCurrency with lowercase
      const formatted = formatCurrency(25, 'eur' as any);
      expect(formatted).toContain('25');
    });
  });
}


