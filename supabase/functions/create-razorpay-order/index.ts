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
      throw new Error('Razorpay API keys not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET via supabase secrets set.');
    }

    const body = await req.json();
    const { amount, currency = 'INR', donorName = 'Anonymous Patron', tierId = 'tier_supporter', userId = null, message = '' } = body;

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      throw new Error('Invalid contribution amount');
    }

    // Razorpay amounts are in smallest currency unit (e.g. Paise for INR: ₹10 = 1000 paise; JPY has 0 decimal places)
    const factor = ZERO_DECIMAL_CURRENCIES.has(String(currency).toUpperCase()) ? 1 : 100;
    const amountInSmallestUnit = Math.round(amount * factor);
    const receipt = `tn_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;

    // Create order with Razorpay API
    const authHeader = `Basic ${btoa(`${keyId}:${keySecret}`)}`;
    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amountInSmallestUnit,
        currency: currency.toUpperCase(),
        receipt,
        notes: {
          donorName: String(donorName).slice(0, 40),
          tierId: String(tierId),
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
      JSON.stringify({ success: false, error: (error as Error).message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
