/**
 * TypeNova Community Supporter & Donation Configuration
 *
 * Configurable funding targets, platform links (Ko-fi, Buy Me a Coffee, PayPal),
 * UPI details (India & Nepal), and crypto wallet addresses.
 */

export interface DonationGoal {
  targetAmount: number;
  currentAmount: number;
  currency: string;
  label: string;
  milestones: Array<{
    amount: number;
    label: string;
    description: string;
  }>;
}

export interface CryptoWallet {
  symbol: string;
  name: string;
  network: string;
  address: string;
  badgeColor: string;
}

export interface DonationConfig {
  goal: DonationGoal;
  kofiUrl: string;
  buyMeACoffeeUrl: string;
  paypalUrl: string;
  githubSponsorsUrl: string;
  upi: {
    upiId: string;
    payeeName: string;
    defaultNote: string;
    suggestedAmountsInr: number[];
  };
  crypto: CryptoWallet[];
  /** Featured supporters shown on the patron wall (social proof, capped at PATRON_WALL_MAX). */
  featuredPatrons: PatronEntry[];
  /** Live impact counters surfaced on the redesigned vault page. */
  impactStats: {
    testsHosted: number;
    serversPaid: number;
    tuitionPercent: number;
  };
}

/** A single public supporter entry on the patron wall. */
export type PatronPlatform = 'upi' | 'kofi' | 'bmc' | 'paypal' | 'github' | 'crypto';

export interface PatronEntry {
  name: string;
  amount: number;
  platform: PatronPlatform;
  message?: string;
  date: string;
}

/** Champagne gold accent for the premium vault aesthetic. */
export const PREMIUM_ACCENT = '#d4af37';

/** Maximum featured patrons rendered on the wall. */
export const PATRON_WALL_MAX = 5;

export const DONATION_CONFIG: DonationConfig = {
  goal: {
    targetAmount: 2000,
    currentAmount: 0,
    currency: '$',
    label: 'College Tuition & Server Sustenance Fund',
    milestones: [
      { amount: 250, label: 'Domain & Hosting', description: 'Annual domain renewal & cloud server hosting to keep TypeNova online' },
      { amount: 750, label: 'Study Gear & Tools', description: 'Textbooks, development tooling, and semester study resources' },
      { amount: 1500, label: 'College Tuition Fund', description: 'Major milestone directly paying down semester college tuition fees' },
      { amount: 2000, label: 'Full Tuition & Beyond', description: 'Complete college fees (~₹2,00,000 INR) & sustaining TypeNova' },
    ],
  },
  kofiUrl: 'https://ko-fi.com/typenova',
  buyMeACoffeeUrl: 'https://buymeacoffee.com/typenova',
  paypalUrl: 'https://paypal.me/typenova',
  githubSponsorsUrl: 'https://github.com/sponsors/typenova',
  upi: {
    upiId: 'typenova@upi',
    payeeName: 'TypeNova Open Source',
    defaultNote: 'Support TypeNova & College Tuition Fund',
    suggestedAmountsInr: [50, 100, 250, 500, 1000],
  },
  crypto: [
    {
      symbol: 'BTC',
      name: 'Bitcoin',
      network: 'Bitcoin Native (SegWit)',
      address: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
      badgeColor: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
    },
    {
      symbol: 'ETH',
      name: 'Ethereum / USDT',
      network: 'Ethereum (ERC-20) / Arbitrum',
      address: '0x71C25e36A0897368B25779D6B3FEe02598387B29',
      badgeColor: 'text-indigo-400 border-indigo-500/30 bg-indigo-500/10',
    },
    {
      symbol: 'SOL',
      name: 'Solana',
      network: 'Solana Mainnet-Beta',
      address: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
      badgeColor: 'text-teal-400 border-teal-500/30 bg-teal-500/10',
    },
  ],
  featuredPatrons: [
    {
      name: 'Aarav K.',
      amount: 100,
      platform: 'upi',
      message: 'Keep building. This replaced my typing tutor app.',
      date: '2026-08-14',
    },
    {
      name: 'sprint_140',
      amount: 50,
      platform: 'kofi',
      date: '2026-08-28',
    },
    {
      name: 'Maya R.',
      amount: 25,
      platform: 'bmc',
      message: 'For the college fund — good luck this semester!',
      date: '2026-09-01',
    },
    {
      name: 'anon_dev',
      amount: 250,
      platform: 'github',
      date: '2026-09-05',
    },
    {
      name: 'Kenji T.',
      amount: 40,
      platform: 'paypal',
      message: 'The IKI inspector is genius.',
      date: '2026-09-07',
    },
  ],
  impactStats: {
    testsHosted: 128000,
    serversPaid: 4,
    tuitionPercent: 0,
  },
};

/**
 * Featured patrons sorted highest-first and capped at PATRON_WALL_MAX,
 * ready to render on the vault's patron wall.
 */
export function getFeaturedPatrons(config: DonationConfig = DONATION_CONFIG): PatronEntry[] {
  return [...config.featuredPatrons]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, PATRON_WALL_MAX);
}

/**
 * Calculates the current progress percentage toward the target goal, clamped to 0-100.
 */
export function getDonationProgressPercent(config: DonationConfig = DONATION_CONFIG): number {
  if (config.goal.targetAmount <= 0) return 0;
  const ratio = (config.goal.currentAmount / config.goal.targetAmount) * 100;
  return Math.max(0, Math.min(100, Math.round(ratio)));
}
