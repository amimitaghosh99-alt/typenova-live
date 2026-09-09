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
}

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
};

/**
 * Calculates the current progress percentage toward the target goal, clamped to 0-100.
 */
export function getDonationProgressPercent(config: DonationConfig = DONATION_CONFIG): number {
  if (config.goal.targetAmount <= 0) return 0;
  const ratio = (config.goal.currentAmount / config.goal.targetAmount) * 100;
  return Math.max(0, Math.min(100, Math.round(ratio)));
}
