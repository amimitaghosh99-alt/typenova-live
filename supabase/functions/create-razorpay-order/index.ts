import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const ALLOWED_ORIGINS = [
  'https://typenova.dev',
  'https://www.typenova.dev',
  'https://typenova.dpdns.org',
  'http://localhost:5173',
  'http://localhost:4173',
  'http://localhost:3000',
];

const ZERO_DECIMAL_CURRENCIES = new Set([
  'BIF', 'CLP', 'DJF', 'GNF', 'ISK', 'JPY', 'KMF', 'KRW',
  'MGA', 'PYG', 'RWF', 'UGX', 'UYI', 'VND', 'VUV', 'XAF', 'XOF', 'XPF'
]);

const THREE_DECIMAL_CURRENCIES = new Set([
  'BHD', 'JOD', 'KWD', 'OMR', 'TND', 'LYD'
]);

const RATES_TO_USD: Record<string, number> = {
  INR: 86.5, USD: 1.0, EUR: 0.92, GBP: 0.78, CAD: 1.38, JPY: 153.0, AUD: 1.54,
  SGD: 1.34, HKD: 7.78, NZD: 1.72, KRW: 1400.0, CNY: 7.25, TWD: 32.5, THB: 34.5,
  MYR: 4.45, IDR: 16100.0, PHP: 58.5, VND: 25400.0, PKR: 278.0, BDT: 120.0,
  LKR: 295.0, NPR: 138.5, KHR: 4050.0, MNT: 3450.0, LAK: 21800.0, MMK: 2100.0,
  BND: 1.34, FJD: 2.25, PGK: 3.9, WST: 2.7, VUV: 120.0, TOP: 2.35, SBD: 8.5,
  MVR: 15.4, KZT: 505.0, UZS: 12850.0, AZN: 1.7, AMD: 390.0, KGS: 86.5, TJS: 10.6,
  CHF: 0.88, SEK: 10.6, NOK: 10.9, DKK: 6.9, PLN: 4.0, CZK: 23.5, HUF: 375.0,
  RON: 4.6, BGN: 1.8, ISK: 138.0, RSD: 108.0, TRY: 35.0, UAH: 41.5, GEL: 2.8,
  ALL: 92.0, MKD: 57.0, MDL: 18.0, BAM: 1.8, AED: 3.67, SAR: 3.75, QAR: 3.64,
  KWD: 0.31, BHD: 0.38, OMR: 0.38, ILS: 3.65, JOD: 0.71, LBP: 89500.0, BRL: 5.75,
  MXN: 20.3, ARS: 1050.0, CLP: 950.0, COP: 4150.0, PEN: 3.75, UYU: 42.5, CRC: 510.0,
  DOP: 60.5, GTQ: 7.75, HNL: 25.4, NIO: 36.8, PAB: 1.0, BOB: 6.9, PYG: 7850.0,
  JMD: 158.0, TTD: 6.8, BSD: 1.0, BBD: 2.0, BZD: 2.0, XCD: 2.7, GYD: 209.0,
  SRD: 35.0, ZAR: 18.2, NGN: 1550.0, KES: 129.0, EGP: 50.5, MAD: 10.0, GHS: 15.5,
  TZS: 2600.0, UGX: 3680.0, ETB: 125.0, MUR: 46.5, BWP: 13.6, NAD: 18.2, ZMW: 27.5,
  MZN: 64.0, RWF: 1380.0, XOF: 605.0, XAF: 605.0, DZD: 134.0, TND: 3.1, AOA: 915.0,
  CDF: 2850.0, MGA: 4650.0, MWK: 1740.0, SZL: 18.2, LSL: 18.2, SCR: 14.2, CVE: 101.5,
  GMD: 71.0, DJF: 178.0, BIF: 2950.0, GNF: 8650.0, KMF: 452.0, STN: 22.5, XPF: 110.0,
  BMD: 1.0, KYD: 0.83, ANG: 1.8, AWG: 1.8, HTG: 132.0, FKP: 0.78, GIP: 0.78,
  MOP: 8.0, SHP: 0.78, LYD: 4.85, SOS: 571.0, SDG: 600.0, SSP: 130.0, ERN: 15.0, MRU: 39.5,
};

const VALID_TIERS = new Set(['tier_supporter', 'tier_sustainer', 'tier_scholar', 'tier_legend']);

function getCurrencySubunitFactor(currency: string): number {
  const c = String(currency).toUpperCase();
  if (ZERO_DECIMAL_CURRENCIES.has(c)) return 1;
  if (THREE_DECIMAL_CURRENCIES.has(c)) return 1000;
  return 100;
}

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') || '';
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const keyId = Deno.env.get('RAZORPAY_KEY_ID');
    const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET');

    if (!keyId || !keySecret) {
      throw new Error('Razorpay API keys not configured.');
    }

    const body = await req.json();
    const { amount, currency = 'INR', donorName = 'Anonymous Patron', tierId = 'tier_supporter', userId = null, message = '' } = body;

    // 1. Strict numeric and currency validation
    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0 || amount > 1000000) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid contribution amount.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const normCurrency = String(currency).toUpperCase().trim();
    const rate = RATES_TO_USD[normCurrency];
    if (!rate || rate <= 0) {
      return new Response(
        JSON.stringify({ success: false, error: `Unsupported currency: ${normCurrency}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Minimum amount validation ($0.50 USD equivalent minimum)
    const amountUsd = amount / rate;
    if (amountUsd < 0.5) {
      return new Response(
        JSON.stringify({ success: false, error: 'Minimum contribution amount is $0.50 USD equivalent.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Tier validation and server-side authorization clamp
    const requestedTier = VALID_TIERS.has(tierId) ? tierId : 'tier_supporter';
    let authorizedTier = 'tier_supporter';
    if (amountUsd >= 48) authorizedTier = 'tier_legend';
    else if (amountUsd >= 23) authorizedTier = 'tier_scholar';
    else if (amountUsd >= 9) authorizedTier = 'tier_sustainer';

    // The recorded note tier must not exceed what the user actually pays
    const TIER_ORDER = ['tier_supporter', 'tier_sustainer', 'tier_scholar', 'tier_legend'];
    const reqIndex = TIER_ORDER.indexOf(requestedTier);
    const authIndex = TIER_ORDER.indexOf(authorizedTier);
    const effectiveTier = reqIndex > authIndex ? authorizedTier : requestedTier;

    // 4. Calculate subunits and receipt
    const factor = getCurrencySubunitFactor(normCurrency);
    const amountInSmallestUnit = Math.round(amount * factor);
    const receipt = `tn_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;

    // 5. Create order with Razorpay API
    const authHeader = `Basic ${btoa(`${keyId}:${keySecret}`)}`;
    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amountInSmallestUnit,
        currency: normCurrency,
        receipt,
        notes: {
          donorName: String(donorName).slice(0, 40),
          tierId: effectiveTier,
          userId: userId ? String(userId) : 'guest',
          message: message ? String(message).slice(0, 140) : '',
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[create-razorpay-order] Razorpay API error:', data);
      throw new Error(data.error?.description || 'Failed to initialize order with payment gateway');
    }

    return new Response(
      JSON.stringify({
        success: true,
        orderId: data.id,
        amount: data.amount,
        currency: data.currency,
        keyId,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('[create-razorpay-order] Exception:', error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message || 'Order creation failed' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
