import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ── Security: Model whitelist ───────────────────────────────────────────────
const ALLOWED_MODELS = new Set([
  'llama-3.1-8b-instant',
  'llama-3.1-70b-versatile',
  'llama-3.2-1b-preview',
  'llama-3.2-3b-preview',
  'mixtral-8x7b-32768',
  'gemma2-9b-it',
]);

const MAX_TOKENS_CAP = 2048;

// ── Security: In-memory per-user rate limiter with periodic cleanup ──────────
const rateBuckets = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 20;          // max requests per window
const RATE_WINDOW_MS = 60_000;  // 1 minute

function isRateLimited(userId: string): boolean {
  const now = Date.now();

  // Sweep expired keys if cache grows to prevent memory leak
  if (rateBuckets.size > 200) {
    for (const [id, bucket] of rateBuckets.entries()) {
      if (now > bucket.resetAt) {
        rateBuckets.delete(id);
      }
    }
  }

  const bucket = rateBuckets.get(userId);
  if (!bucket || now > bucket.resetAt) {
    rateBuckets.set(userId, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  bucket.count++;
  return bucket.count > RATE_LIMIT;
}

const VALID_ROLES = new Set(['system', 'user', 'assistant']);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // ── 1. Authenticate the caller ──────────────────────────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing or malformed Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceKey) {
      console.error('[ai-proxy] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabase = createClient(supabaseUrl, serviceKey);
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized — valid Supabase session required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ── 2. Rate limit (per user) ────────────────────────────────────────────
    if (isRateLimited(user.id)) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Max 20 requests per minute.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ── 3. Get the Groq API key from secrets ────────────────────────────────
    const groqKey = Deno.env.get('GROQ_API_KEY');
    if (!groqKey) {
      console.error('[ai-proxy] GROQ_API_KEY secret is not set');
      return new Response(
        JSON.stringify({ error: 'AI service currently unavailable' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ── 4. Validate request body ────────────────────────────────────────────
    let rawBody: any;
    try {
      rawBody = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (!rawBody || typeof rawBody !== 'object' || Array.isArray(rawBody)) {
      return new Response(
        JSON.stringify({ error: 'Malformed request payload' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Validate messages array
    if (!Array.isArray(rawBody.messages) || rawBody.messages.length === 0 || rawBody.messages.length > 50) {
      return new Response(
        JSON.stringify({ error: 'Invalid messages format: must contain between 1 and 50 messages.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    for (const msg of rawBody.messages) {
      if (!msg || typeof msg !== 'object' || !VALID_ROLES.has(msg.role) || typeof msg.content !== 'string') {
        return new Response(
          JSON.stringify({ error: 'Invalid message structure: each message requires a valid role and content.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
    }

    // Enforce model whitelist
    const model = (typeof rawBody.model === 'string' && ALLOWED_MODELS.has(rawBody.model))
      ? rawBody.model
      : 'llama-3.1-8b-instant';

    // Sanitize parameters
    const maxTokens = Math.max(1, Math.min(Number(rawBody.max_tokens) || MAX_TOKENS_CAP, MAX_TOKENS_CAP));
    const temperature = typeof rawBody.temperature === 'number'
      ? Math.max(0, Math.min(2, rawBody.temperature))
      : 0.7;

    const sanitizedPayload = {
      model,
      messages: rawBody.messages,
      max_tokens: maxTokens,
      temperature,
      stream: Boolean(rawBody.stream),
    };

    // ── 5. Forward to Groq ──────────────────────────────────────────────────
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sanitizedPayload),
    });

    // ── 6. Stream or return the response back ───────────────────────────────
    const contentType = response.headers.get('content-type') || 'application/json';

    return new Response(response.body, {
      status: response.status,
      headers: {
        'Content-Type': contentType,
        ...corsHeaders,
      },
    });

  } catch (error) {
    console.error('[ai-proxy] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'An error occurred while processing your request.' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
