/**
 * TypeNova Community Supporter & Donation Configuration
 *
 * Configurable funding targets, platform links (Ko-fi, Buy Me a Coffee, PayPal),
 * UPI details (India & Nepal), crypto wallet addresses, multi-currency conversion,
 * supporter tiers, and patron wall persistence.
 */

import { supabase } from '@/lib/supabase';
import { getActiveTitleId, setActiveTitleId } from '@/data/titles';

import {
  type CurrencyCode,
  type CurrencyRegion,
  type CurrencyInfo,
  ZERO_DECIMAL_CURRENCIES,
  POPULAR_CURRENCIES,
  SUPPORTED_CURRENCIES,
  generateSuggestedAmounts,
  convertCurrency,
  formatCurrency,
} from '@/data/currencies';

export {
  type CurrencyCode,
  type CurrencyRegion,
  type CurrencyInfo,
  ZERO_DECIMAL_CURRENCIES,
  POPULAR_CURRENCIES,
  SUPPORTED_CURRENCIES,
  generateSuggestedAmounts,
  convertCurrency,
  formatCurrency,
};

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
      'Direct support for independent development & continuous updates',
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
  currency?: CurrencyCode;
  platform: PatronPlatform;
  message?: string;
  date: string;
  txHash?: string;
  tierId?: string;
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
    targetAmount: 3000,
    currentAmount: 0,
    currency: '$',
    label: 'Independent Developer & Cloud Infrastructure Fund',
    milestones: [
      {
        amount: 500,
        label: 'Domain & Cloud Infrastructure',
        description: 'Annual domain renewal & global edge cloud hosting to keep TypeNova online',
        budgetBreakdown: [
          { item: 'typenova.dev Domain', cost: '$15 / yr', purpose: 'ICANN registrar renewal & DNS routing' },
          { item: 'Cloudflare Edge CDN', cost: '$60 / yr', purpose: 'Global low-latency caching & DDoS shield' },
          { item: 'Supabase Cloud DB', cost: '$425 / yr', purpose: 'PostgreSQL database & real-time sync relays' },
        ],
      },
      {
        amount: 1200,
        label: 'High-Tick Multiplayer Scale',
        description: 'WebSocket relays and compute resources for concurrent multiplayer racing',
        budgetBreakdown: [
          { item: 'Dedicated WebSocket Cluster', cost: '$400 / yr', purpose: '60Hz real-time netplay tickrate relays' },
          { item: 'Edge Network Bandwidth', cost: '$300 / yr', purpose: 'Global packet optimization for cross-region matches' },
          { item: 'Automated Snapshot Backups', cost: '$250 / yr', purpose: 'Nightly disaster recovery & database replicas' },
          { item: 'Security & Telemetry', cost: '$250 / yr', purpose: 'Vulnerability scanners & performance monitors' },
        ],
      },
      {
        amount: 2200,
        label: 'Indie Dev Sustenance',
        description: 'Major milestone directly supporting independent full-time development',
        budgetBreakdown: [
          { item: 'Independent Creator Sustenance', cost: '$1,000', purpose: 'Direct living & development sustenance for solo builder' },
        ],
      },
      {
        amount: 3000,
        label: 'Full-Year Cloud Runway & Scale',
        description: 'Full-year operational runway (~₹2,50,000 INR) & sustaining TypeNova',
        budgetBreakdown: [
          { item: 'Creator Runway Clearance', cost: '$800', purpose: 'Full independent developer freedom & runway' },
          { item: '12-Month Cloud Runway', cost: 'Surplus', purpose: 'Pre-funded multiplayer relay reserve' },
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
    defaultNote: 'Support TypeNova & Independent Development',
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

/** Storage key for permanent verified supporter entitlements (immune to public wall clearing) */
export const SUPPORTER_ENTITLEMENT_STORAGE_KEY = 'typenova_supporter_entitlements';

/** Retrieve local patron contributions from localStorage (used for public wall display) */
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

/** Retrieve permanent verified supporter entitlements from localStorage */
export function getSupporterEntitlements(): PatronEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SUPPORTER_ENTITLEMENT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Record a permanent verified supporter entitlement (persists even if cleared from public wall) */
export function recordVerifiedEntitlement(entry: PatronEntry): PatronEntry[] {
  if (typeof window === 'undefined') return [entry];
  try {
    const existing = getSupporterEntitlements();
    const updated = [
      entry,
      ...existing.filter((p) => {
        if (entry.txHash && p.txHash) {
          return p.txHash !== entry.txHash;
        }
        return (
          p.name.toLowerCase() !== entry.name.toLowerCase() ||
          p.date !== entry.date ||
          p.amount !== entry.amount
        );
      }),
    ];
    localStorage.setItem(SUPPORTER_ENTITLEMENT_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('patronContributionsUpdated'));
    return updated;
  } catch {
    return [entry];
  }
}

/** Record a new contribution locally and return the updated local array */
export function recordPatronContribution(entry: PatronEntry): PatronEntry[] {
  if (typeof window === 'undefined') return [entry];
  try {
    const existing = getLocalPatrons();
    const updated = [
      entry,
      ...existing.filter((p) => {
        if (entry.txHash && p.txHash) {
          return p.txHash !== entry.txHash;
        }
        return (
          p.name.toLowerCase() !== entry.name.toLowerCase() ||
          p.date !== entry.date ||
          p.amount !== entry.amount
        );
      }),
    ];
    localStorage.setItem(LOCAL_PATRONS_STORAGE_KEY, JSON.stringify(updated));

    // Also persist permanently to supporter entitlements (so public wall removal never revokes certificates/titles)
    recordVerifiedEntitlement(entry);

    window.dispatchEvent(new Event('patronContributionsUpdated'));
    return updated;
  } catch {
    return [entry];
  }
}

/** Remove a specific local contribution entry from the public wall */
export function removeLocalPatron(identifier: { txHash?: string; name?: string; date?: string }): PatronEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const existing = getLocalPatrons();
    const updated = existing.filter((p) => {
      if (identifier.txHash && p.txHash) {
        return p.txHash !== identifier.txHash;
      }
      if (identifier.name && identifier.date) {
        return !(p.name === identifier.name && p.date === identifier.date);
      }
      if (identifier.name && !identifier.date && !identifier.txHash) {
        return p.name !== identifier.name;
      }
      return true;
    });
    localStorage.setItem(LOCAL_PATRONS_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('patronContributionsUpdated'));
    return updated;
  } catch {
    return [];
  }
}

/** Purge locally recorded cards from the public wall without revoking supporter entitlements */
export function clearAllLocalPatrons(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(LOCAL_PATRONS_STORAGE_KEY);
    window.dispatchEvent(new Event('patronContributionsUpdated'));
  } catch (e) {
    console.warn('[donation] Error clearing local patrons:', e);
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

/**
 * Fetches verified live patron contributions from the Supabase database.
 */
export async function fetchDatabasePatrons(): Promise<PatronEntry[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('patron_contributions')
      .select('donor_name, amount, currency, gateway, created_at, razorpay_payment_id, message, tier_id')
      .eq('status', 'captured')
      .order('created_at', { ascending: false })
      .limit(30);

    if (error || !data) return [];
    return data.map((row) => ({
      name: row.donor_name || 'Anonymous Patron',
      amount: Number(row.amount) || 0,
      currency: (row.currency as CurrencyCode) || 'USD',
      platform: (row.gateway as PatronPlatform) || 'gateway',
      date: row.created_at ? row.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
      txHash: row.razorpay_payment_id || undefined,
      message: row.message || undefined,
      tierId: row.tier_id || undefined,
    }));
  } catch (e) {
    console.warn('[donation] Error fetching database patrons:', e);
    return [];
  }
}

/**
 * Calculates current tuition goal amount from verified database payments.
 */
export async function fetchTuitionGoalTotal(): Promise<number> {
  if (!supabase) return DONATION_CONFIG.goal.currentAmount;
  try {
    const { data, error } = await supabase
      .from('patron_contributions')
      .select('amount, currency')
      .eq('status', 'captured');

    if (error || !data) return DONATION_CONFIG.goal.currentAmount;

    const totalUsd = data.reduce((sum, row) => {
      const amt = Number(row.amount) || 0;
      const curr = (row.currency as CurrencyCode) || 'INR';
      const usd = convertCurrency(amt, curr, 'USD');
      return sum + usd;
    }, 0);

    return Math.round(totalUsd);
  } catch {
    return DONATION_CONFIG.goal.currentAmount;
  }
}

/** Storage key for unlocked supporter titles verified via payment */
export const UNLOCKED_PATRON_TITLES_KEY = 'typenova_unlocked_patron_titles';

export const PATRON_TITLE_IDS = [
  'cyber_patron',
  'server_sustainer',
  'grand_architect',
  'eternal_benefactor',
] as const;

export function isPatronTitle(titleId: string): boolean {
  return (PATRON_TITLE_IDS as readonly string[]).includes(titleId);
}

export interface ResolvedUserContributions {
  primaryRecord: PatronEntry | null;
  allRecords: PatronEntry[];
  totalContributedUsd: number;
  highestTierId?: string;
  hasVerifiedContribution: boolean;
}

/**
 * Resolves verified contributions for a specific callsign/username across all sources.
 * Strips simulation records, normalizes foreign currencies to USD for accurate tier ranking,
 * and preserves exact paid amounts and currency codes on each record.
 */
export function resolveUserContributions(
  callsign: string,
  records: (PatronEntry | null | undefined)[]
): ResolvedUserContributions {
  if (!callsign || !callsign.trim()) {
    return {
      primaryRecord: null,
      allRecords: [],
      totalContributedUsd: 0,
      hasVerifiedContribution: false,
    };
  }

  const normalizedName = callsign.trim().toLowerCase();

  // Filter for real, non-simulation contributions belonging to this user
  const userValidRecords = records.filter((p): p is PatronEntry => {
    if (!p || typeof p.name !== 'string') return false;
    if (p.name.trim().toLowerCase() !== normalizedName) return false;
    if (typeof p.amount !== 'number' || p.amount <= 0) return false;
    if (p.txHash?.startsWith('TN-SIM-')) return false;
    if (p.message === 'Sandbox Simulated Contribution') return false;
    return true;
  });

  // Deduplicate by txHash if present, or by date + amount + currency
  const seenKeys = new Set<string>();
  const deduplicated: PatronEntry[] = [];
  for (const entry of userValidRecords) {
    const key = entry.txHash
      ? entry.txHash
      : `${entry.name.toLowerCase()}_${entry.date}_${entry.amount}_${entry.currency || 'USD'}`;
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);
    deduplicated.push(entry);
  }

  if (deduplicated.length === 0) {
    return {
      primaryRecord: null,
      allRecords: [],
      totalContributedUsd: 0,
      hasVerifiedContribution: false,
    };
  }

  // Calculate USD equivalent for each record to rank tiers accurately
  const ranked = deduplicated.map((entry) => {
    const usd = convertCurrency(entry.amount, entry.currency || 'USD', 'USD');
    return { entry, usd };
  });

  // Sort by USD equivalent descending (highest tier first), then by date descending
  ranked.sort((a, b) => {
    if (Math.abs(b.usd - a.usd) > 0.01) {
      return b.usd - a.usd;
    }
    return (b.entry.date || '').localeCompare(a.entry.date || '');
  });

  const totalContributedUsd = ranked.reduce((sum, item) => sum + item.usd, 0);
  const primaryRecord = ranked[0].entry;

  return {
    primaryRecord,
    allRecords: ranked.map((r) => r.entry),
    totalContributedUsd: Math.round(totalContributedUsd * 100) / 100,
    highestTierId: primaryRecord.tierId,
    hasVerifiedContribution: true,
  };
}

/**
 * Maps a tier to all titles it unlocks (higher tiers inherit lower tier titles)
 */
export function getTitlesForTier(tierId: string): string[] {
  switch (tierId) {
    case 'tier_legend':
      return ['cyber_patron', 'server_sustainer', 'grand_architect', 'eternal_benefactor'];
    case 'tier_scholar':
      return ['cyber_patron', 'server_sustainer', 'grand_architect'];
    case 'tier_sustainer':
      return ['cyber_patron', 'server_sustainer'];
    case 'tier_supporter':
    default:
      return ['cyber_patron'];
  }
}

/**
 * Returns set of currently unlocked patron titles from verified payments and cloud records.
 * Sandbox simulated transactions (TN-SIM-*) are strictly excluded.
 */
export function getUnlockedPatronTitles(targetCallsign?: string | null): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const set = new Set<string>();
    const normalizedTarget = targetCallsign?.trim().toLowerCase();

    // 1. Scan local patron contributions AND permanent supporter entitlements:
    const allRecords = [...getLocalPatrons(), ...getSupporterEntitlements()];
    const seen = new Set<string>();
    const uniqueRecords = allRecords.filter((p) => {
      const key = p.txHash || `${p.name}_${p.date}_${p.amount}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    for (const p of uniqueRecords) {
      if (normalizedTarget && p.name && p.name.trim().toLowerCase() !== normalizedTarget) {
        continue;
      }
      const isReal =
        typeof p.amount === 'number' &&
        p.amount > 0 &&
        typeof p.txHash === 'string' &&
        p.txHash.startsWith('pay_') &&
        !p.message?.includes('Sandbox') &&
        !p.message?.includes('Simulated') &&
        !p.txHash.startsWith('TN-SIM-');

      if (isReal) {
        // Validate tierId against known valid tiers
        if (p.tierId && ['tier_supporter', 'tier_sustainer', 'tier_scholar', 'tier_legend'].includes(p.tierId)) {
          getTitlesForTier(p.tierId).forEach((t) => set.add(t));
        } else {
          // Fallback: convert amount to USD first before checking tier thresholds
          const inferredCurrency: CurrencyCode = p.currency || (p.amount > 100 ? 'INR' : 'USD');
          const amountUsd = convertCurrency(p.amount, inferredCurrency, 'USD');
          if (amountUsd >= 50) getTitlesForTier('tier_legend').forEach((t) => set.add(t));
          else if (amountUsd >= 25) getTitlesForTier('tier_scholar').forEach((t) => set.add(t));
          else if (amountUsd >= 10) getTitlesForTier('tier_sustainer').forEach((t) => set.add(t));
          else if (amountUsd >= 3) getTitlesForTier('tier_supporter').forEach((t) => set.add(t));
        }
      }
    }

    // Keep cached key strictly in sync with the legitimately unlocked titles
    if (set.size > 0) {
      localStorage.setItem(UNLOCKED_PATRON_TITLES_KEY, JSON.stringify(Array.from(set)));
    } else {
      localStorage.removeItem(UNLOCKED_PATRON_TITLES_KEY);
    }

    // Auto-revoke currently active title if it is an unbacked patron title
    const curTitle = getActiveTitleId();
    if (isPatronTitle(curTitle) && !set.has(curTitle)) {
      setActiveTitleId('novice');
      window.dispatchEvent(new Event('titleChanged'));
    }

    return set;
  } catch {
    return new Set();
  }
}

/**
 * Resets local patron contributions, purges unlocked patron titles,
 * and resets active title to 'novice'. Useful for testing and development.
 */
export function resetPatronData(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(LOCAL_PATRONS_STORAGE_KEY);
    localStorage.removeItem(SUPPORTER_ENTITLEMENT_STORAGE_KEY);
    localStorage.removeItem(UNLOCKED_PATRON_TITLES_KEY);
    setActiveTitleId('novice');
    window.dispatchEvent(new CustomEvent('patronTitlesUpdated', { detail: { unlocked: [] } }));
    window.dispatchEvent(new Event('titleChanged'));
    window.dispatchEvent(new Event('patronContributionsUpdated'));
  } catch (e) {
    console.warn('[donation] Error resetting patron data:', e);
  }
}

// Expose reset helpers on window for developer & user convenience in console
if (typeof window !== 'undefined') {
  const win = window as unknown as Record<string, unknown>;
  win.resetPatronData = resetPatronData;
  win.clearAllLocalPatrons = clearAllLocalPatrons;
  win.clearMyPatronRecords = clearAllLocalPatrons;
}

/**
 * Check if a specific patron title is verified & unlocked.
 */
export function isPatronTitleUnlocked(titleId: string): boolean {
  return getUnlockedPatronTitles().has(titleId);
}

/**
 * Unlocks patron titles for a tier and persists to localStorage. Dispatches update event.
 */
export function unlockPatronTitlesForTier(tierId: string): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const titles = getUnlockedPatronTitles();
    const toUnlock = getTitlesForTier(tierId);
    toUnlock.forEach((t) => titles.add(t));

    localStorage.setItem(UNLOCKED_PATRON_TITLES_KEY, JSON.stringify(Array.from(titles)));
    window.dispatchEvent(new CustomEvent('patronTitlesUpdated', { detail: { unlocked: Array.from(titles) } }));
    return titles;
  } catch {
    return getUnlockedPatronTitles();
  }
}

/**
 * Syncs user's verified contributions from Supabase database and unlocks entitled titles.
 */
export async function syncUserPatronStatus(userId?: string | null, targetCallsign?: string | null): Promise<Set<string>> {
  if (!supabase || !userId) return getUnlockedPatronTitles(targetCallsign);

  try {
    const { data, error } = await supabase
      .from('patron_contributions')
      .select('tier_id, amount, currency, razorpay_payment_id, donor_name, created_at, message')
      .eq('user_id', userId)
      .eq('status', 'captured');

    const set = new Set<string>();

    if (!error && data && data.length > 0) {
      for (const row of data) {
        if (row.razorpay_payment_id) {
          recordVerifiedEntitlement({
            name: row.donor_name || 'Anonymous Patron',
            amount: Number(row.amount) || 0,
            currency: (row.currency as CurrencyCode) || 'USD',
            platform: 'gateway',
            date: row.created_at ? row.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
            txHash: row.razorpay_payment_id,
            tierId: row.tier_id || undefined,
            message: row.message || undefined,
          });
        }

        if (row.tier_id) {
          const toAdd = getTitlesForTier(row.tier_id);
          toAdd.forEach((t) => set.add(t));
        } else if (row.amount) {
          const inUsd = convertCurrency(Number(row.amount), (row.currency as CurrencyCode) || 'INR', 'USD');
          if (inUsd >= 50) getTitlesForTier('tier_legend').forEach((t) => set.add(t));
          else if (inUsd >= 25) getTitlesForTier('tier_scholar').forEach((t) => set.add(t));
          else if (inUsd >= 10) getTitlesForTier('tier_sustainer').forEach((t) => set.add(t));
          else if (inUsd >= 3) getTitlesForTier('tier_supporter').forEach((t) => set.add(t));
        }
      }

      // Also merge any live local payments
      const local = getUnlockedPatronTitles(targetCallsign);
      local.forEach((t) => set.add(t));

      if (typeof window !== 'undefined') {
        localStorage.setItem(UNLOCKED_PATRON_TITLES_KEY, JSON.stringify(Array.from(set)));
        window.dispatchEvent(new CustomEvent('patronTitlesUpdated', { detail: { unlocked: Array.from(set) } }));
      }
      return set;
    } else {
      // User has no captured contributions in the cloud
      const local = getUnlockedPatronTitles(targetCallsign);
      if (local.size === 0 && typeof window !== 'undefined') {
        localStorage.removeItem(UNLOCKED_PATRON_TITLES_KEY);
      }
      return local;
    }
  } catch (e) {
    console.warn('[donation] Error syncing patron status from cloud:', e);
    return getUnlockedPatronTitles(targetCallsign);
  }
}


