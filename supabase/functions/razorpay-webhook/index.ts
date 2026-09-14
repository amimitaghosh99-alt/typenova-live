import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok');
  }

  try {
    const webhookSecret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET') || Deno.env.get('RAZORPAY_KEY_SECRET');
    if (!webhookSecret) {
      throw new Error('RAZORPAY_WEBHOOK_SECRET or RAZORPAY_KEY_SECRET not configured.');
    }

    const signature = req.headers.get('x-razorpay-signature');
    const rawBody = await req.text();

    if (!signature) {
      console.error('[razorpay-webhook] Missing x-razorpay-signature header');
      return new Response(JSON.stringify({ error: 'Missing x-razorpay-signature header' }), { status: 400 });
    }

    const expected = await computeHmacSha256Hex(webhookSecret, rawBody);
    if (expected.toLowerCase() !== signature.toLowerCase()) {
      console.error('[razorpay-webhook] Invalid webhook signature');
      return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 400 });
    }

    const payload = JSON.parse(rawBody);
    const event = payload.event;
    console.log('[razorpay-webhook] Event received:', event);

    if (event === 'payment.captured' || event === 'order.paid') {
      const payment = payload.payload?.payment?.entity;
      const orderId = payment?.order_id;
      const paymentId = payment?.id;
      const currency = payment?.currency || 'INR';
      const ZERO_DECIMAL_CURRENCIES = new Set([
        'BIF', 'CLP', 'DJF', 'GNF', 'ISK', 'JPY', 'KMF', 'KRW',
        'MGA', 'PYG', 'RWF', 'UGX', 'UYI', 'VND', 'VUV', 'XAF', 'XOF', 'XPF'
      ]);
      const factor = ZERO_DECIMAL_CURRENCIES.has(String(currency).toUpperCase()) ? 1 : 100;
      const amount = (payment?.amount || 0) / factor;
      const notes = payment?.notes || {};

      if (orderId && paymentId) {
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!supabaseUrl || !supabaseServiceKey) {
          console.error('[razorpay-webhook] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not configured.');
        } else {
          const supabase = createClient(supabaseUrl, supabaseServiceKey);
          const amountInr = (currency || 'INR').toUpperCase() === 'INR' ? amount : 0;

          await supabase.rpc('record_patron_success', {
            p_order_id: orderId,
            p_payment_id: paymentId,
            p_donor_name: notes.donorName || 'Anonymous Patron',
            p_amount: amount,
            p_currency: currency,
            p_amount_inr: amountInr,
            p_user_id: notes.userId && notes.userId !== 'guest' ? notes.userId : null,
            p_tier_id: notes.tierId || 'tier_supporter',
          });
        }
      }
    }

    return new Response(JSON.stringify({ status: 'ok' }), { status: 200 });

  } catch (error) {
    console.error('[razorpay-webhook] Error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
  }
});
