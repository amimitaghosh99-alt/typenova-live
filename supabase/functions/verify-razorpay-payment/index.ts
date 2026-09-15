import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const ALLOWED_ORIGINS = [
  'https://typenova.dev',
  'https://www.typenova.dev',
  'https://typenova.dpdns.org',
  'http://localhost:5173',
  'http://localhost:4173',
  'http://localhost:3000',
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') || '';
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
}

/** Approximate currency rates to USD for server-side tier authorization */
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

const TIER_HIERARCHY = ['tier_supporter', 'tier_sustainer', 'tier_scholar', 'tier_legend'];

/** Compute HMAC-SHA256 hex string using standard Web Crypto API */
async function computeHmacSha256Hex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signatureBuffer = await crypto.subtle.sign(
    'HMAC',
    key,
    enc.encode(message)
  );
  return Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Timing-safe comparison of two strings to prevent side-channel timing attacks */
function constantTimeCompare(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const aNorm = a.toLowerCase();
  const bNorm = b.toLowerCase();
  const aLen = aNorm.length;
  const bLen = bNorm.length;
  let mismatch = aLen === bLen ? 0 : 1;
  const maxLen = Math.max(aLen, bLen);
  for (let i = 0; i < maxLen; i++) {
    const charA = aNorm.charCodeAt(i % aLen);
    const charB = bNorm.charCodeAt(i % bLen);
    mismatch |= charA ^ charB;
  }
  return mismatch === 0;
}

/** Tier→Title mapping (must stay in sync with client-side mapping) */
const TIER_TITLE_MAP: Record<string, string> = {
  tier_supporter: 'cyber_patron',
  tier_sustainer: 'server_sustainer',
  tier_scholar: 'grand_architect',
  tier_legend: 'eternal_benefactor',
};

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!keySecret) {
      throw new Error('RAZORPAY_KEY_SECRET not configured. Set it via supabase secrets set.');
    }
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not configured.');
    }

    const body = await req.json();
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      donor_name = 'Anonymous Patron',
      amount = 0,
      currency = 'INR',
      tier_id = 'tier_supporter',
      user_id = null,
      message = null,
    } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      throw new Error('Missing required payment verification parameters');
    }

    // 1. Authenticate signature: HMAC SHA256 of `${order_id}|${payment_id}`
    const expectedSignature = await computeHmacSha256Hex(
      keySecret,
      `${razorpay_order_id}|${razorpay_payment_id}`
    );

    if (!constantTimeCompare(expectedSignature, razorpay_signature)) {
      console.error('[verify-razorpay-payment] Signature mismatch!', {
        expected: expectedSignature,
        received: razorpay_signature,
      });
      throw new Error('Payment signature verification failed. Possible tampering detected.');
    }

    // 2. Server-side tier authorization based on normalized USD value
    const normalizedCurr = String(currency || 'INR').toUpperCase();
    const rate = RATES_TO_USD[normalizedCurr];
    if (!rate || rate <= 0) {
      console.error(`[verify-razorpay-payment] Unsupported currency: ${normalizedCurr}`);
      throw new Error(`Unsupported or unrecognized currency: ${normalizedCurr}`);
    }
    const amountUsd = (Number(amount) || 0) / rate;

    let authorizedTier = 'tier_supporter';
    if (amountUsd >= 48) authorizedTier = 'tier_legend';
    else if (amountUsd >= 23) authorizedTier = 'tier_scholar';
    else if (amountUsd >= 9) authorizedTier = 'tier_sustainer';

    const requestedTierIndex = TIER_HIERARCHY.indexOf(tier_id);
    const authorizedTierIndex = TIER_HIERARCHY.indexOf(authorizedTier);
    const effectiveTier = requestedTierIndex > authorizedTierIndex ? authorizedTier : tier_id;

    // 3. Signature verified! Fulfill contribution in database
    const titleId = TIER_TITLE_MAP[effectiveTier] || 'cyber_patron';
    const amountInr = normalizedCurr === 'INR' ? amount : Math.round(amountUsd * 86.5);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data, error } = await supabase.rpc('record_patron_success', {
      p_order_id: razorpay_order_id,
      p_payment_id: razorpay_payment_id,
      p_donor_name: donor_name,
      p_amount: amount,
      p_currency: currency,
      p_amount_inr: amountInr,
      p_user_id: user_id,
      p_tier_id: effectiveTier,
    });

    if (message && typeof message === 'string' && message.trim()) {
      try {
        await supabase
          .from('patron_contributions')
          .update({ message: message.trim().slice(0, 140) })
          .eq('razorpay_order_id', razorpay_order_id);
      } catch (msgErr) {
        console.warn('[verify-razorpay-payment] Message update warning:', msgErr);
      }
    }

    if (error) {
      console.error('[verify-razorpay-payment] Database fulfillment error:', error);
      // Even if DB RPC fails, the payment itself succeeded
      return new Response(
        JSON.stringify({
          success: true,
          verified: true,
          dbWarning: error.message,
          titleId,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        verified: true,
        titleId: data?.title_id || titleId,
        contributionId: data?.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('[verify-razorpay-payment] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
