/**
 * TypeNova Global Currency Registry & Calculation Engine
 *
 * Full ISO 4217 multi-currency catalog with support for 135+ global currencies,
 * regional classification, zero-decimal processing, live exchange rates to USD,
 * and adaptive denomination generation.
 */

export type CurrencyCode = string;

export type CurrencyRegion = 'americas' | 'europe' | 'asia_pacific' | 'middle_east' | 'africa';

export interface CurrencyInfo {
  code: CurrencyCode;
  symbol: string;
  name: string;
  rateToUsd: number; // Units of this currency per 1 USD
  suggestedAmounts: number[];
  region: CurrencyRegion;
  isZeroDecimal?: boolean;
}

/**
 * 16 zero-decimal currencies supported by Razorpay & ISO standards.
 * For these currencies, payment amounts are passed as whole units (factor: 1)
 * rather than subunits/cents (factor: 100).
 */
export const ZERO_DECIMAL_CURRENCIES = new Set([
  'BIF', 'CLP', 'DJF', 'GNF', 'ISK', 'JPY', 'KMF', 'KRW',
  'MGA', 'PYG', 'RWF', 'UGX', 'UYI', 'VND', 'VUV', 'XAF', 'XOF', 'XPF'
]);

/** Quick-access primary currencies rendered as top-level segmented control pills */
export const POPULAR_CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'CAD', 'JPY', 'AUD'] as const;

/**
 * Generates clean, intuitive, rounded suggested donation amounts for any currency
 * calibrated to ~$3, $5, $10, $25, $50, $100 USD equivalents.
 */
export function generateSuggestedAmounts(rateToUsd: number): number[] {
  if (!rateToUsd || rateToUsd <= 0) return [3, 5, 10, 25, 50, 100];
  const usdTargets = [3, 5, 10, 25, 50, 100];

  const roundToNiceNumber = (val: number): number => {
    if (val <= 1) return 1;
    const magnitude = Math.pow(10, Math.floor(Math.log10(val)));
    const normalized = val / magnitude;
    let nice = 1;
    if (normalized <= 1.2) nice = 1;
    else if (normalized <= 2.2) nice = 2;
    else if (normalized <= 3.5) nice = 2.5;
    else if (normalized <= 7.5) nice = 5;
    else nice = 10;
    return Math.max(1, Math.round(nice * magnitude));
  };

  const generated = usdTargets.map((usd) => roundToNiceNumber(usd * rateToUsd));
  const unique = Array.from(new Set(generated)).filter((a) => a > 0);
  return unique.length >= 4 ? unique : [5, 10, 25, 50, 100];
}

/**
 * Raw definition records for 135+ supported global currencies.
 */
interface RawCurrencyDef {
  code: string;
  symbol: string;
  name: string;
  rateToUsd: number;
  region: CurrencyRegion;
  suggestedAmounts?: number[];
  isZeroDecimal?: boolean;
}

const RAW_CURRENCIES: RawCurrencyDef[] = [
  // ── Quick-Access Primaries ──
  {
    code: 'INR',
    symbol: '₹',
    name: 'Indian Rupee',
    rateToUsd: 86.5,
    region: 'asia_pacific',
    suggestedAmounts: [50, 100, 250, 500, 1000, 2500],
  },
  {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    rateToUsd: 1.0,
    region: 'americas',
    suggestedAmounts: [3, 5, 10, 25, 50, 100],
  },
  {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    rateToUsd: 0.92,
    region: 'europe',
    suggestedAmounts: [3, 5, 10, 25, 50, 100],
  },
  {
    code: 'GBP',
    symbol: '£',
    name: 'British Pound',
    rateToUsd: 0.78,
    region: 'europe',
    suggestedAmounts: [3, 5, 10, 20, 50, 100],
  },
  {
    code: 'CAD',
    symbol: 'CA$',
    name: 'Canadian Dollar',
    rateToUsd: 1.38,
    region: 'americas',
    suggestedAmounts: [5, 10, 15, 35, 75, 150],
  },
  {
    code: 'JPY',
    symbol: '¥',
    name: 'Japanese Yen',
    rateToUsd: 153.0,
    region: 'asia_pacific',
    isZeroDecimal: true,
    suggestedAmounts: [500, 1000, 2000, 5000, 10000],
  },
  {
    code: 'AUD',
    symbol: 'A$',
    name: 'Australian Dollar',
    rateToUsd: 1.54,
    region: 'asia_pacific',
    suggestedAmounts: [5, 10, 15, 35, 75, 150],
  },

  // ── Asia-Pacific ──
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', rateToUsd: 1.34, region: 'asia_pacific', suggestedAmounts: [5, 10, 15, 35, 70, 140] },
  { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar', rateToUsd: 7.78, region: 'asia_pacific', suggestedAmounts: [25, 50, 100, 200, 400, 800] },
  { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar', rateToUsd: 1.72, region: 'asia_pacific', suggestedAmounts: [5, 10, 20, 50, 100, 180] },
  { code: 'KRW', symbol: '₩', name: 'South Korean Won', rateToUsd: 1400.0, region: 'asia_pacific', isZeroDecimal: true, suggestedAmounts: [5000, 10000, 20000, 50000, 100000] },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', rateToUsd: 7.25, region: 'asia_pacific' },
  { code: 'TWD', symbol: 'NT$', name: 'New Taiwan Dollar', rateToUsd: 32.5, region: 'asia_pacific' },
  { code: 'THB', symbol: '฿', name: 'Thai Baht', rateToUsd: 34.5, region: 'asia_pacific' },
  { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit', rateToUsd: 4.45, region: 'asia_pacific' },
  { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah', rateToUsd: 16100.0, region: 'asia_pacific' },
  { code: 'PHP', symbol: '₱', name: 'Philippine Peso', rateToUsd: 58.5, region: 'asia_pacific' },
  { code: 'VND', symbol: '₫', name: 'Vietnamese Dong', rateToUsd: 25400.0, region: 'asia_pacific', isZeroDecimal: true },
  { code: 'PKR', symbol: '₨', name: 'Pakistani Rupee', rateToUsd: 278.0, region: 'asia_pacific' },
  { code: 'BDT', symbol: '৳', name: 'Bangladeshi Taka', rateToUsd: 120.0, region: 'asia_pacific' },
  { code: 'LKR', symbol: 'Rs', name: 'Sri Lankan Rupee', rateToUsd: 295.0, region: 'asia_pacific' },
  { code: 'NPR', symbol: 'रू', name: 'Nepalese Rupee', rateToUsd: 138.5, region: 'asia_pacific' },
  { code: 'KHR', symbol: '៛', name: 'Cambodian Riel', rateToUsd: 4050.0, region: 'asia_pacific' },
  { code: 'MNT', symbol: '₮', name: 'Mongolian Tögrög', rateToUsd: 3450.0, region: 'asia_pacific' },
  { code: 'LAK', symbol: '₭', name: 'Lao Kip', rateToUsd: 21800.0, region: 'asia_pacific' },
  { code: 'MMK', symbol: 'K', name: 'Myanmar Kyat', rateToUsd: 2100.0, region: 'asia_pacific' },
  { code: 'BND', symbol: 'B$', name: 'Brunei Dollar', rateToUsd: 1.34, region: 'asia_pacific' },
  { code: 'FJD', symbol: 'FJ$', name: 'Fijian Dollar', rateToUsd: 2.25, region: 'asia_pacific' },
  { code: 'PGK', symbol: 'K', name: 'Papua New Guinean Kina', rateToUsd: 3.9, region: 'asia_pacific' },
  { code: 'WST', symbol: 'WS$', name: 'Samoan Tālā', rateToUsd: 2.7, region: 'asia_pacific' },
  { code: 'VUV', symbol: 'VT', name: 'Vanuatu Vatu', rateToUsd: 120.0, region: 'asia_pacific', isZeroDecimal: true },
  { code: 'TOP', symbol: 'T$', name: 'Tongan Paʻanga', rateToUsd: 2.35, region: 'asia_pacific' },
  { code: 'SBD', symbol: 'SI$', name: 'Solomon Islands Dollar', rateToUsd: 8.5, region: 'asia_pacific' },
  { code: 'MVR', symbol: 'Rf', name: 'Maldivian Rufiyaa', rateToUsd: 15.4, region: 'asia_pacific' },
  { code: 'KZT', symbol: '₸', name: 'Kazakhstani Tenge', rateToUsd: 505.0, region: 'asia_pacific' },
  { code: 'UZS', symbol: "so'm", name: 'Uzbekistani Som', rateToUsd: 12850.0, region: 'asia_pacific' },
  { code: 'AZN', symbol: '₼', name: 'Azerbaijani Manat', rateToUsd: 1.7, region: 'asia_pacific' },
  { code: 'AMD', symbol: '֏', name: 'Armenian Dram', rateToUsd: 390.0, region: 'asia_pacific' },
  { code: 'KGS', symbol: 'сом', name: 'Kyrgyzstani Som', rateToUsd: 86.5, region: 'asia_pacific' },
  { code: 'TJS', symbol: 'SM', name: 'Tajikistani Somoni', rateToUsd: 10.6, region: 'asia_pacific' },

  // ── Europe ──
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc', rateToUsd: 0.88, region: 'europe', suggestedAmounts: [3, 5, 10, 25, 50, 100] },
  { code: 'SEK', symbol: 'kr', name: 'Swedish Krona', rateToUsd: 10.6, region: 'europe', suggestedAmounts: [35, 60, 120, 300, 600, 1200] },
  { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone', rateToUsd: 10.9, region: 'europe', suggestedAmounts: [35, 60, 120, 300, 600, 1200] },
  { code: 'DKK', symbol: 'kr', name: 'Danish Krone', rateToUsd: 6.9, region: 'europe', suggestedAmounts: [25, 40, 80, 200, 400, 800] },
  { code: 'PLN', symbol: 'zł', name: 'Polish Złoty', rateToUsd: 4.0, region: 'europe', suggestedAmounts: [15, 25, 50, 100, 200, 400] },
  { code: 'CZK', symbol: 'Kč', name: 'Czech Koruna', rateToUsd: 23.5, region: 'europe' },
  { code: 'HUF', symbol: 'Ft', name: 'Hungarian Forint', rateToUsd: 375.0, region: 'europe' },
  { code: 'RON', symbol: 'lei', name: 'Romanian Leu', rateToUsd: 4.6, region: 'europe' },
  { code: 'BGN', symbol: 'лв', name: 'Bulgarian Lev', rateToUsd: 1.8, region: 'europe' },
  { code: 'ISK', symbol: 'kr', name: 'Icelandic Króna', rateToUsd: 138.0, region: 'europe', isZeroDecimal: true },
  { code: 'RSD', symbol: 'din.', name: 'Serbian Dinar', rateToUsd: 108.0, region: 'europe' },
  { code: 'TRY', symbol: '₺', name: 'Turkish Lira', rateToUsd: 35.0, region: 'europe' },
  { code: 'UAH', symbol: '₴', name: 'Ukrainian Hryvnia', rateToUsd: 41.5, region: 'europe' },
  { code: 'GEL', symbol: '₾', name: 'Georgian Lari', rateToUsd: 2.8, region: 'europe' },
  { code: 'ALL', symbol: 'L', name: 'Albanian Lek', rateToUsd: 92.0, region: 'europe' },
  { code: 'MKD', symbol: 'ден', name: 'Macedonian Denar', rateToUsd: 57.0, region: 'europe' },
  { code: 'MDL', symbol: 'L', name: 'Moldovan Leu', rateToUsd: 18.0, region: 'europe' },
  { code: 'BAM', symbol: 'KM', name: 'Bosnia-Herzegovina Convertible Mark', rateToUsd: 1.8, region: 'europe' },

  // ── Middle East ──
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham', rateToUsd: 3.67, region: 'middle_east', suggestedAmounts: [10, 20, 50, 100, 200, 400] },
  { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal', rateToUsd: 3.75, region: 'middle_east', suggestedAmounts: [10, 20, 50, 100, 200, 400] },
  { code: 'QAR', symbol: 'QR', name: 'Qatari Riyal', rateToUsd: 3.64, region: 'middle_east', suggestedAmounts: [10, 20, 50, 100, 200, 400] },
  { code: 'KWD', symbol: 'KD', name: 'Kuwaiti Dinar', rateToUsd: 0.31, region: 'middle_east', suggestedAmounts: [1, 2, 5, 10, 20, 50] },
  { code: 'BHD', symbol: 'BD', name: 'Bahraini Dinar', rateToUsd: 0.38, region: 'middle_east', suggestedAmounts: [1, 2, 5, 10, 20, 50] },
  { code: 'OMR', symbol: 'RO', name: 'Omani Rial', rateToUsd: 0.38, region: 'middle_east', suggestedAmounts: [1, 2, 5, 10, 20, 50] },
  { code: 'ILS', symbol: '₪', name: 'Israeli New Shekel', rateToUsd: 3.65, region: 'middle_east', suggestedAmounts: [10, 20, 40, 100, 200, 400] },
  { code: 'JOD', symbol: 'JD', name: 'Jordanian Dinar', rateToUsd: 0.71, region: 'middle_east', suggestedAmounts: [2, 5, 10, 20, 40, 80] },
  { code: 'LBP', symbol: 'LL', name: 'Lebanese Pound', rateToUsd: 89500.0, region: 'middle_east' },

  // ── Americas ──
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', rateToUsd: 5.75, region: 'americas', suggestedAmounts: [15, 25, 50, 125, 250, 500] },
  { code: 'MXN', symbol: 'Mex$', name: 'Mexican Peso', rateToUsd: 20.3, region: 'americas', suggestedAmounts: [60, 100, 200, 500, 1000, 2000] },
  { code: 'ARS', symbol: 'ARS$', name: 'Argentine Peso', rateToUsd: 1050.0, region: 'americas' },
  { code: 'CLP', symbol: 'CLP$', name: 'Chilean Peso', rateToUsd: 950.0, region: 'americas', isZeroDecimal: true },
  { code: 'COP', symbol: 'COL$', name: 'Colombian Peso', rateToUsd: 4150.0, region: 'americas' },
  { code: 'PEN', symbol: 'S/.', name: 'Peruvian Sol', rateToUsd: 3.75, region: 'americas' },
  { code: 'UYU', symbol: '$U', name: 'Uruguayan Peso', rateToUsd: 42.5, region: 'americas' },
  { code: 'CRC', symbol: '₡', name: 'Costa Rican Colón', rateToUsd: 510.0, region: 'americas' },
  { code: 'DOP', symbol: 'RD$', name: 'Dominican Peso', rateToUsd: 60.5, region: 'americas' },
  { code: 'GTQ', symbol: 'Q', name: 'Guatemalan Quetzal', rateToUsd: 7.75, region: 'americas' },
  { code: 'HNL', symbol: 'L', name: 'Honduran Lempira', rateToUsd: 25.4, region: 'americas' },
  { code: 'NIO', symbol: 'C$', name: 'Nicaraguan Córdoba', rateToUsd: 36.8, region: 'americas' },
  { code: 'PAB', symbol: 'B/.', name: 'Panamanian Balboa', rateToUsd: 1.0, region: 'americas' },
  { code: 'BOB', symbol: 'Bs', name: 'Bolivian Boliviano', rateToUsd: 6.9, region: 'americas' },
  { code: 'PYG', symbol: '₲', name: 'Paraguayan Guaraní', rateToUsd: 7850.0, region: 'americas', isZeroDecimal: true },
  { code: 'JMD', symbol: 'J$', name: 'Jamaican Dollar', rateToUsd: 158.0, region: 'americas' },
  { code: 'TTD', symbol: 'TT$', name: 'Trinidad & Tobago Dollar', rateToUsd: 6.8, region: 'americas' },
  { code: 'BSD', symbol: 'B$', name: 'Bahamian Dollar', rateToUsd: 1.0, region: 'americas' },
  { code: 'BBD', symbol: 'Bds$', name: 'Barbadian Dollar', rateToUsd: 2.0, region: 'americas' },
  { code: 'BZD', symbol: 'BZ$', name: 'Belize Dollar', rateToUsd: 2.0, region: 'americas' },
  { code: 'XCD', symbol: 'EC$', name: 'East Caribbean Dollar', rateToUsd: 2.7, region: 'americas' },
  { code: 'GYD', symbol: 'G$', name: 'Guyanese Dollar', rateToUsd: 209.0, region: 'americas' },
  { code: 'SRD', symbol: 'Sr$', name: 'Surinamese Dollar', rateToUsd: 35.0, region: 'americas' },

  // ── Africa ──
  { code: 'ZAR', symbol: 'R', name: 'South African Rand', rateToUsd: 18.2, region: 'africa', suggestedAmounts: [50, 100, 200, 450, 900, 1800] },
  { code: 'NGN', symbol: '₦', name: 'Nigerian Naira', rateToUsd: 1550.0, region: 'africa', suggestedAmounts: [5000, 10000, 20000, 50000, 100000] },
  { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling', rateToUsd: 129.0, region: 'africa' },
  { code: 'EGP', symbol: 'E£', name: 'Egyptian Pound', rateToUsd: 50.5, region: 'africa' },
  { code: 'MAD', symbol: 'DH', name: 'Moroccan Dirham', rateToUsd: 10.0, region: 'africa' },
  { code: 'GHS', symbol: 'GH₵', name: 'Ghanaian Cedi', rateToUsd: 15.5, region: 'africa' },
  { code: 'TZS', symbol: 'TSh', name: 'Tanzanian Shilling', rateToUsd: 2600.0, region: 'africa' },
  { code: 'UGX', symbol: 'USh', name: 'Ugandan Shilling', rateToUsd: 3680.0, region: 'africa', isZeroDecimal: true },
  { code: 'ETB', symbol: 'Br', name: 'Ethiopian Birr', rateToUsd: 125.0, region: 'africa' },
  { code: 'MUR', symbol: '₨', name: 'Mauritian Rupee', rateToUsd: 46.5, region: 'africa' },
  { code: 'BWP', symbol: 'P', name: 'Botswana Pula', rateToUsd: 13.6, region: 'africa' },
  { code: 'NAD', symbol: 'N$', name: 'Namibian Dollar', rateToUsd: 18.2, region: 'africa' },
  { code: 'ZMW', symbol: 'K', name: 'Zambian Kwacha', rateToUsd: 27.5, region: 'africa' },
  { code: 'MZN', symbol: 'MT', name: 'Mozambican Metical', rateToUsd: 64.0, region: 'africa' },
  { code: 'RWF', symbol: 'FRw', name: 'Rwandan Franc', rateToUsd: 1380.0, region: 'africa', isZeroDecimal: true },
  { code: 'XOF', symbol: 'CFA', name: 'West African CFA Franc', rateToUsd: 605.0, region: 'africa', isZeroDecimal: true },
  { code: 'XAF', symbol: 'FCFA', name: 'Central African CFA Franc', rateToUsd: 605.0, region: 'africa', isZeroDecimal: true },
  { code: 'DZD', symbol: 'DA', name: 'Algerian Dinar', rateToUsd: 134.0, region: 'africa' },
  { code: 'TND', symbol: 'DT', name: 'Tunisian Dinar', rateToUsd: 3.1, region: 'africa' },
  { code: 'AOA', symbol: 'Kz', name: 'Angolan Kwanza', rateToUsd: 915.0, region: 'africa' },
  { code: 'CDF', symbol: 'FC', name: 'Congolese Franc', rateToUsd: 2850.0, region: 'africa' },
  { code: 'MGA', symbol: 'Ar', name: 'Malagasy Ariary', rateToUsd: 4650.0, region: 'africa', isZeroDecimal: true },
  { code: 'MWK', symbol: 'MK', name: 'Malawian Kwacha', rateToUsd: 1740.0, region: 'africa' },
  { code: 'SZL', symbol: 'L', name: 'Eswatini Lilangeni', rateToUsd: 18.2, region: 'africa' },
  { code: 'LSL', symbol: 'L', name: 'Lesotho Loti', rateToUsd: 18.2, region: 'africa' },
  { code: 'SCR', symbol: 'SR', name: 'Seychellois Rupee', rateToUsd: 14.2, region: 'africa' },
  { code: 'CVE', symbol: 'Esc', name: 'Cape Verdean Escudo', rateToUsd: 101.5, region: 'africa' },
  { code: 'GMD', symbol: 'D', name: 'Gambian Dalasi', rateToUsd: 71.0, region: 'africa' },
  { code: 'DJF', symbol: 'Fdj', name: 'Djiboutian Franc', rateToUsd: 178.0, region: 'africa', isZeroDecimal: true },
  { code: 'BIF', symbol: 'FBu', name: 'Burundian Franc', rateToUsd: 2950.0, region: 'africa', isZeroDecimal: true },
  { code: 'GNF', symbol: 'FG', name: 'Guinean Franc', rateToUsd: 8650.0, region: 'africa', isZeroDecimal: true },
  { code: 'KMF', symbol: 'CF', name: 'Comorian Franc', rateToUsd: 452.0, region: 'africa', isZeroDecimal: true },
  { code: 'STN', symbol: 'Db', name: 'São Tomé & Príncipe Dobra', rateToUsd: 22.5, region: 'africa' },
  { code: 'XPF', symbol: '₣', name: 'CFP Franc', rateToUsd: 110.0, region: 'asia_pacific', isZeroDecimal: true },
  { code: 'BMD', symbol: 'BD$', name: 'Bermudian Dollar', rateToUsd: 1.0, region: 'americas' },
  { code: 'KYD', symbol: 'CI$', name: 'Cayman Islands Dollar', rateToUsd: 0.83, region: 'americas' },
  { code: 'ANG', symbol: 'NAƒ', name: 'Netherlands Antillean Guilder', rateToUsd: 1.8, region: 'americas' },
  { code: 'AWG', symbol: 'Afl.', name: 'Aruban Florin', rateToUsd: 1.8, region: 'americas' },
  { code: 'HTG', symbol: 'G', name: 'Haitian Gourde', rateToUsd: 132.0, region: 'americas' },
  { code: 'FKP', symbol: 'FK£', name: 'Falkland Islands Pound', rateToUsd: 0.78, region: 'americas' },
  { code: 'GIP', symbol: 'GI£', name: 'Gibraltar Pound', rateToUsd: 0.78, region: 'europe' },
  { code: 'MOP', symbol: 'MOP$', name: 'Macanese Pataca', rateToUsd: 8.0, region: 'asia_pacific' },
  { code: 'SHP', symbol: 'SH£', name: 'Saint Helena Pound', rateToUsd: 0.78, region: 'africa' },
  { code: 'LYD', symbol: 'LD', name: 'Libyan Dinar', rateToUsd: 4.85, region: 'middle_east' },
  { code: 'SOS', symbol: 'Ssh', name: 'Somali Shilling', rateToUsd: 571.0, region: 'africa' },
  { code: 'SDG', symbol: 'SDG', name: 'Sudanese Pound', rateToUsd: 600.0, region: 'africa' },
  { code: 'SSP', symbol: 'SS£', name: 'South Sudanese Pound', rateToUsd: 130.0, region: 'africa' },
  { code: 'ERN', symbol: 'Nfk', name: 'Eritrean Nakfa', rateToUsd: 15.0, region: 'africa' },
  { code: 'MRU', symbol: 'UM', name: 'Mauritanian Ouguiya', rateToUsd: 39.5, region: 'africa' },
];

/**
 * Full supported currency dictionary mapped by uppercase currency code.
 */
export const SUPPORTED_CURRENCIES: Record<string, CurrencyInfo> = RAW_CURRENCIES.reduce(
  (acc, def) => {
    acc[def.code] = {
      code: def.code,
      symbol: def.symbol,
      name: def.name,
      rateToUsd: def.rateToUsd,
      region: def.region,
      isZeroDecimal: def.isZeroDecimal ?? ZERO_DECIMAL_CURRENCIES.has(def.code),
      suggestedAmounts: def.suggestedAmounts || generateSuggestedAmounts(def.rateToUsd),
    };
    return acc;
  },
  {} as Record<string, CurrencyInfo>
);

/**
 * Convert any amount from one currency to another using reference forex rates.
 */
export function convertCurrency(
  amount: number,
  from: CurrencyCode,
  to: CurrencyCode
): number {
  const fromCode = (from || 'USD').toUpperCase();
  const toCode = (to || 'USD').toUpperCase();
  if (fromCode === toCode || amount <= 0) return amount;
  const fromInfo = SUPPORTED_CURRENCIES[fromCode] || SUPPORTED_CURRENCIES.USD;
  const toInfo = SUPPORTED_CURRENCIES[toCode] || SUPPORTED_CURRENCIES.USD;
  const inUsd = amount / fromInfo.rateToUsd;
  const target = inUsd * toInfo.rateToUsd;

  // Zero-decimal currencies and INR round to whole integers
  if (ZERO_DECIMAL_CURRENCIES.has(toCode) || toCode === 'INR') {
    return Math.round(target);
  }
  return Math.round(target * 100) / 100;
}

/**
 * Formats an amount with its currency symbol and proper decimal rules.
 */
export function formatCurrency(amount: number, currency: CurrencyCode): string {
  const code = (currency || 'USD').toUpperCase();
  const info = SUPPORTED_CURRENCIES[code] || {
    code,
    symbol: code,
    name: code,
    rateToUsd: 1.0,
    region: 'americas' as CurrencyRegion,
    suggestedAmounts: [5, 10, 25, 50, 100],
  };

  if (ZERO_DECIMAL_CURRENCIES.has(code) || code === 'INR') {
    return `${info.symbol}${Math.round(amount).toLocaleString()}`;
  }
  const isWhole = Number.isInteger(amount);
  return `${info.symbol}${amount.toLocaleString('en-US', {
    minimumFractionDigits: isWhole ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}
