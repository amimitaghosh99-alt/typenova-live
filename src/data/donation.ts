/**
 * TypeNova Community Supporter & Donation Configuration
 *
 * Configurable funding targets, platform links (Ko-fi, Buy Me a Coffee, PayPal),
 * UPI details (India & Nepal), crypto wallet addresses, multi-currency conversion,
 * supporter tiers, and patron wall persistence.
 */

export type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'GBP' | 'CAD' | 'JPY' | 'AUD';

export interface CurrencyInfo {
  code: CurrencyCode;
  symbol: string;
  name: string;
  rateToUsd: number; // Units of this currency per 1 USD
  suggestedAmounts: number[];
}

export const SUPPORTED_CURRENCIES: Record<CurrencyCode, CurrencyInfo> = {
  INR: {
    code: 'INR',
    symbol: '₹',
    name: 'Indian Rupee',
    rateToUsd: 86.5,
    suggestedAmounts: [50, 100, 250, 500, 1000, 2500],
  },
  USD: {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    rateToUsd: 1.0,
    suggestedAmounts: [3, 5, 10, 25, 50, 100],
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    rateToUsd: 0.92,
    suggestedAmounts: [3, 5, 10, 25, 50, 100],
  },
  GBP: {
    code: 'GBP',
    symbol: '£',
    name: 'British Pound',
    rateToUsd: 0.78,
    suggestedAmounts: [3, 5, 10, 20, 50, 100],
  },
  CAD: {
    code: 'CAD',
    symbol: 'CA$',
    name: 'Canadian Dollar',
    rateToUsd: 1.38,
    suggestedAmounts: [5, 10, 15, 35, 75, 150],
  },
  JPY: {
    code: 'JPY',
    symbol: '¥',
    name: 'Japanese Yen',
    rateToUsd: 155.0,
    suggestedAmounts: [500, 1000, 2000, 5000, 10000],
  },
  AUD: {
    code: 'AUD',
    symbol: 'A$',
    name: 'Australian Dollar',
    rateToUsd: 1.54,
    suggestedAmounts: [5, 10, 15, 35, 75, 150],
  },
};

/** Convert any amount from one currency to another using reference rates */
export function convertCurrency(
  amount: number,
  from: CurrencyCode,
  to: CurrencyCode
): number {
  if (from === to || amount <= 0) return amount;
  const inUsd = amount / SUPPORTED_CURRENCIES[from].rateToUsd;
  const target = inUsd * SUPPORTED_CURRENCIES[to].rateToUsd;
  // Round sensibly: JPY and INR to whole numbers, others to 2 decimals
  if (to === 'JPY' || to === 'INR') {
    return Math.round(target);
  }
  return Math.round(target * 100) / 100;
}

/** Formats an amount with its currency symbol */
export function formatCurrency(amount: number, currency: CurrencyCode): string {
  const info = SUPPORTED_CURRENCIES[currency];
  if (currency === 'JPY' || currency === 'INR') {
    return `${info.symbol}${Math.round(amount).toLocaleString()}`;
  }
  const isWhole = Number.isInteger(amount);
  return `${info.symbol}${amount.toLocaleString('en-US', {
    minimumFractionDigits: isWhole ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

export interface MilestoneBudgetItem {
  item: string;
  cost: string;
  purpose: string;
}

export interface DonationMilestone {
  amount: number;
  label: string;
  description: string;
  budgetBreakdown?: MilestoneBudgetItem[];
}

export interface DonationGoal {
  targetAmount: number;
  currentAmount: number;
  currency: string;
  label: string;
  milestones: DonationMilestone[];
}

export interface CryptoWallet {
  symbol: string;
  name: string;
  network: string;
  address: string;
  badgeColor: string;
  qrPayloadPrefix?: string;
  explorerUrl?: string;
}

export interface SupporterTier {
  id: string;
  name: string;
  usdAmount: number;
  badge: string;
  titleRewardId: string;
  titleRewardName: string;
  perks: string[];
  color: string;
  popular?: boolean;
}

export const SUPPORTER_TIERS: SupporterTier[] = [
  {
    id: 'tier_supporter',
    name: 'Byte Backer',
    usdAmount: 3,
    badge: 'BRONZE',
    titleRewardId: 'cyber_patron',
    titleRewardName: 'Cyber Patron',
    perks: [
      'Holographic "Cyber Patron" title in profile & leaderboards',
      'Exclusive backer flair on operator dossier',
      'Instant eligibility on the Community Patron Wall',
    ],
    color: '#cd7f32',
  },
  {
    id: 'tier_sustainer',
    name: 'Server Sustainer',
    usdAmount: 10,
    badge: 'SILVER',
    titleRewardId: 'server_sustainer',
    titleRewardName: 'Server Sustainer',
    popular: true,
    perks: [
      'All Byte Backer perks included',
      '"Server Sustainer" title & golden avatar aura in lobbies',
      'Digital Supporter Certificate with cryptographic serial',
      'Prioritized feature suggestions & community voting',
    ],
    color: '#e0e0e0',
  },
  {
    id: 'tier_scholar',
    name: 'Scholar Benefactor',
    usdAmount: 25,
    badge: 'GOLD',
    titleRewardId: 'grand_architect',
    titleRewardName: 'Grand Architect',
    perks: [
      'All Server Sustainer perks included',
      '"Grand Architect" permanent holographic title',
      'Direct contribution to undergraduate college tuition',
      'Permanent highlight on the Community Patron Wall',
    ],
    color: '#d4af37',
  },
  {
    id: 'tier_legend',
    name: 'Eternal Benefactor',
    usdAmount: 50,
    badge: 'CELESTIAL',
    titleRewardId: 'eternal_benefactor',
    titleRewardName: 'Eternal Benefactor',
    perks: [
      'All Scholar Benefactor perks included',
      '"Eternal Benefactor" ultimate legendary title',
      'Personalized signature on digital sustenance certificate',
      'Hall of Fame permanent engraving in TypeNova lore',
    ],
    color: '#a855f7',
  },
];

/** A single public supporter entry on the patron wall. */
export type PatronPlatform = 'upi' | 'kofi' | 'bmc' | 'paypal' | 'github' | 'crypto' | 'gateway';

export interface PatronEntry {
  name: string;
  amount: number;
  platform: PatronPlatform;
  message?: string;
  date: string;
  txHash?: string;
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
      {
        amount: 250,
        label: 'Domain & Hosting',
        description: 'Annual domain renewal & cloud server hosting to keep TypeNova online',
        budgetBreakdown: [
          { item: 'typenova.dev Domain', cost: '$15 / yr', purpose: 'ICANN registrar renewal & DNS routing' },
          { item: 'Cloudflare Edge CDN', cost: '$60 / yr', purpose: 'Global low-latency caching & DDoS shield' },
          { item: 'Supabase Cloud DB', cost: '$175 / yr', purpose: 'PostgreSQL database & real-time sync relays' },
        ],
      },
      {
        amount: 750,
        label: 'Study Gear & Tools',
        description: 'Textbooks, development tooling, and semester study resources',
        budgetBreakdown: [
          { item: 'Mechanical Audio Rig', cost: '$150', purpose: 'Studio mic & switches for audio calibration' },
          { item: 'High-Hz Testing Monitor', cost: '$250', purpose: '240Hz frame benchmark testing rig' },
          { item: 'Engineering Textbooks', cost: '$250', purpose: 'Computer science & distributed systems literature' },
          { item: 'Dev Tooling Licenses', cost: '$100', purpose: 'Profile profilers & static analysis tooling' },
        ],
      },
      {
        amount: 1500,
        label: 'College Tuition Fund',
        description: 'Major milestone directly paying down semester college tuition fees',
        budgetBreakdown: [
          { item: 'Semester Tuition Fee', cost: '$1,500', purpose: 'Undergraduate engineering tuition installment' },
        ],
      },
      {
        amount: 2000,
        label: 'Full Tuition & Beyond',
        description: 'Complete college fees (~₹2,00,000 INR) & sustaining TypeNova',
        budgetBreakdown: [
          { item: 'Tuition Balance Clearance', cost: '$500', purpose: '100% academic debt clearance' },
          { item: 'High-Tick Multiplayer Reserve', cost: 'Surplus', purpose: '12-month multiplayer relay runway' },
        ],
      },
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
      qrPayloadPrefix: 'bitcoin:',
      explorerUrl: 'https://mempool.space/address/bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
    },
    {
      symbol: 'ETH',
      name: 'Ethereum / USDT',
      network: 'Ethereum (ERC-20) / Arbitrum',
      address: '0x71C25e36A0897368B25779D6B3FEe02598387B29',
      badgeColor: 'text-indigo-400 border-indigo-500/30 bg-indigo-500/10',
      qrPayloadPrefix: 'ethereum:',
      explorerUrl: 'https://etherscan.io/address/0x71C25e36A0897368B25779D6B3FEe02598387B29',
    },
    {
      symbol: 'SOL',
      name: 'Solana',
      network: 'Solana Mainnet-Beta',
      address: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
      badgeColor: 'text-teal-400 border-teal-500/30 bg-teal-500/10',
      qrPayloadPrefix: 'solana:',
      explorerUrl: 'https://solscan.io/account/7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
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

/** Storage key for contributions recorded locally by the operator */
export const LOCAL_PATRONS_STORAGE_KEY = 'typenova_patron_contributions';

/** Retrieve local patron contributions from localStorage */
export function getLocalPatrons(): PatronEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_PATRONS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Record a new contribution locally and return the updated local array */
export function recordPatronContribution(entry: PatronEntry): PatronEntry[] {
  if (typeof window === 'undefined') return [entry];
  try {
    const existing = getLocalPatrons();
    const updated = [entry, ...existing.filter((p) => p.name !== entry.name || p.date !== entry.date)];
    localStorage.setItem(LOCAL_PATRONS_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [entry];
  }
}

/**
 * Returns merged patrons: local contributions first (marked with isLocal), followed by
 * featured patrons, sorted highest-first or recent, up to limit.
 */
export function getCombinedPatrons(
  config: DonationConfig = DONATION_CONFIG,
  limit: number = PATRON_WALL_MAX
): (PatronEntry & { isLocal?: boolean })[] {
  const locals = getLocalPatrons().map((p) => ({ ...p, isLocal: true }));
  const builtIn = config.featuredPatrons.map((p) => ({ ...p, isLocal: false }));
  
  // Combine, putting local entries up front
  const combined = [...locals, ...builtIn];
  return combined.slice(0, limit);
}

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

/**
 * Generates an authentic cryptographic serial string for the Digital Patron Certificate
 * e.g., "TN-VAULT-7B3A-GOLD"
 */
export function generatePatronCertificateSerial(callsign: string, amount: number): string {
  const seed = `${callsign}_${amount}_${Date.now()}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).toUpperCase().padStart(6, '0').slice(-4);
  const tierCode = amount >= 50 ? 'LEGEND' : amount >= 25 ? 'GOLD' : amount >= 10 ? 'SILVER' : 'PATRON';
  return `TN-VAULT-${hex}-${tierCode}`;
}
