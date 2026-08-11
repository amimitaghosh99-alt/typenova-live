/**
 * Shared client for the user's BYOK (bring-your-own-key) LLM endpoint.
 *
 * Every AI feature in the app talks to one OpenAI-compatible /chat/completions
 * endpoint that the user configures in Settings → Smart Engine. This module owns
 * the storage keys, the endpoint construction and the usage accounting so the
 * callers can't drift apart.
 */

/** localStorage keys. The `typezen_` prefix is the old product name — kept because
 *  changing it would silently log existing users out of their configured key. */
export const AI_KEYS = {
  byokKey: 'typezen_byok_key',
  byokUrl: 'typezen_byok_url',
  byokModel: 'typezen_byok_model',
  usageTokens: 'typenova_usage_tokens',
  usageRequests: 'typenova_usage_requests',
  dailyTokens: 'typenova_daily_tokens',
  dailyRequests: 'typenova_daily_requests',
  usageDate: 'typenova_usage_date',
  rollingHistory: 'typenova_rolling_history',
} as const;

export const DEFAULT_BASE_URL = 'https://api.groq.com/openai/v1';
export const DEFAULT_MODEL = 'llama-3.3-70b-versatile';

// ─── PROVIDER CATALOG ─────────────────────────────────────────────────
// Shared by Settings → Smart Engine (the form) and the Technician (so it can
// name the right console URL and detect which provider a pasted key belongs
// to). One list, so the two can't drift.

export interface ProviderPreset {
  id: string;
  label: string;
  url: string;
  model: string;
  /** Where the user gets a key. Absent for `custom`. */
  consoleUrl?: string;
  /** Prefix that identifies a key as belonging to this provider. */
  keyPrefix?: string;
}

export const PROVIDER_PRESETS: ProviderPreset[] = [
  { id: 'groq', label: 'Groq', url: 'https://api.groq.com/openai/v1', model: 'llama-3.3-70b-versatile', consoleUrl: 'https://console.groq.com/keys', keyPrefix: 'gsk_' },
  { id: 'openrouter', label: 'OpenRouter', url: 'https://openrouter.ai/api/v1', model: 'anthropic/claude-3-haiku', consoleUrl: 'https://openrouter.ai/keys', keyPrefix: 'sk-or-' },
  { id: 'google', label: 'Google AI Studio', url: 'https://generativelanguage.googleapis.com/v1beta/openai/', model: 'gemini-1.5-flash', consoleUrl: 'https://aistudio.google.com/app/apikey', keyPrefix: 'AIza' },
  { id: 'kimi', label: 'Kimi', url: 'https://api.moonshot.cn/v1', model: 'moonshot-v1-8k', consoleUrl: 'https://platform.moonshot.cn/console/api-keys' },
  { id: 'glm', label: 'Zhipu AI', url: 'https://open.bigmodel.cn/api/paas/v4/', model: 'glm-4', consoleUrl: 'https://open.bigmodel.cn/usercenter/apikeys' },
  { id: 'minimax', label: 'Minimax', url: 'https://api.minimax.chat/v1', model: 'minimax-text-01', keyPrefix: 'eyJ' },
  { id: 'openai', label: 'OpenAI', url: 'https://api.openai.com/v1', model: 'gpt-4o-mini', consoleUrl: 'https://platform.openai.com/api-keys' },
  { id: 'custom', label: 'Custom Endpoint', url: '', model: '' },
];

export function providerForUrl(url: string): ProviderPreset | undefined {
  return PROVIDER_PRESETS.find(p => p.url === url && p.id !== 'custom');
}

/** Best guess at which provider a key belongs to, from its prefix alone. */
export function providerForKey(key: string): ProviderPreset | undefined {
  const trimmed = key.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith('gsk_')) return PROVIDER_PRESETS.find(p => p.id === 'groq');
  if (trimmed.startsWith('sk-or-')) return PROVIDER_PRESETS.find(p => p.id === 'openrouter');
  if (trimmed.startsWith('AIza')) return PROVIDER_PRESETS.find(p => p.id === 'google');
  if (trimmed.startsWith('eyJ')) return PROVIDER_PRESETS.find(p => p.id === 'minimax');
  if (trimmed.includes('.')) return PROVIDER_PRESETS.find(p => p.id === 'glm');
  if (trimmed.startsWith('sk-')) return PROVIDER_PRESETS.find(p => p.id === 'openai');
  return undefined;
}

// ─── FREE-TIER RATE LIMITS ────────────────────────────────────────────
// Published Groq free-tier ceilings. Only used to draw the gauges in
// Settings → Local AI Stats and to let the Technician warn before a 429 —
// the real headers are unreadable from the browser because of CORS.

export interface RateLimits { rpm: number; rpd: number; tpm: number; tpd: number }

export const GROQ_LIMITS: Record<string, RateLimits> = {
  'allam-2-7b': { rpm: 30, rpd: 7000, tpm: 6000, tpd: 500000 },
  'groq/compound': { rpm: 30, rpd: 250, tpm: 70000, tpd: Infinity },
  'groq/compound-mini': { rpm: 30, rpd: 250, tpm: 70000, tpd: Infinity },
  'llama-3.1-8b-instant': { rpm: 30, rpd: 14400, tpm: 6000, tpd: 500000 },
  'llama-3.3-70b-versatile': { rpm: 30, rpd: 1000, tpm: 12000, tpd: 100000 },
  'meta-llama/llama-prompt-guard-2-22m': { rpm: 30, rpd: 14400, tpm: 15000, tpd: 500000 },
  'meta-llama/llama-prompt-guard-2-86m': { rpm: 30, rpd: 14400, tpm: 15000, tpd: 500000 },
  'openai/gpt-oss-120b': { rpm: 30, rpd: 1000, tpm: 8000, tpd: 200000 },
  'openai/gpt-oss-20b': { rpm: 30, rpd: 1000, tpm: 8000, tpd: 200000 },
  'openai/gpt-oss-safeguard-20b': { rpm: 30, rpd: 1000, tpm: 8000, tpd: 200000 },
  'qwen/qwen3.6-27b': { rpm: 30, rpd: 1000, tpm: 8000, tpd: 200000 },
  // Fallbacks
  'llama3-70b-8192': { rpm: 30, rpd: 14400, tpm: 6000, tpd: 500000 },
  'llama3-8b-8192': { rpm: 30, rpd: 14400, tpm: 30000, tpd: 500000 },
  'mixtral-8x7b-32768': { rpm: 30, rpd: 14400, tpm: 5000, tpd: 500000 },
  'gemma2-9b-it': { rpm: 30, rpd: 14400, tpm: 15000, tpd: 500000 },
};

export const FALLBACK_LIMITS: RateLimits = { rpm: 30, rpd: 1000, tpm: 6000, tpd: 100000 };

export function limitsForModel(model: string): RateLimits {
  return GROQ_LIMITS[model] || FALLBACK_LIMITS;
}

export interface UsageSnapshot {
  totalTokens: number;
  totalRequests: number;
  dailyTokens: number;
  dailyRequests: number;
  /** Rolling 60-second window — what a TPM/RPM limit actually measures. */
  minuteTokens: number;
  minuteRequests: number;
}

export function readUsage(): UsageSnapshot {
  const num = (key: string) => parseInt(localStorage.getItem(key) || '0', 10) || 0;
  let minuteTokens = 0;
  let minuteRequests = 0;
  try {
    const history: Array<{ ts: number; t: number; r: number }> = JSON.parse(
      localStorage.getItem(AI_KEYS.rollingHistory) || '[]',
    );
    const now = Date.now();
    for (const ev of history) {
      if (now - ev.ts >= 60000) continue;
      minuteTokens += ev.t;
      minuteRequests += ev.r;
    }
  } catch { /* corrupt history — treat as idle */ }

  return {
    totalTokens: num(AI_KEYS.usageTokens),
    totalRequests: num(AI_KEYS.usageRequests),
    dailyTokens: num(AI_KEYS.dailyTokens),
    dailyRequests: num(AI_KEYS.dailyRequests),
    minuteTokens,
    minuteRequests,
  };
}

/** Emitted after every call so open UI (Settings → usage) can refresh in-tab.
 *  A real `storage` event never fires in the tab that wrote the value. */
export const USAGE_EVENT = 'typenova:usage';

export type ChatRole = 'system' | 'user' | 'assistant';
export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface AIConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

export function getAIConfig(): AIConfig {
  const rawUrl = localStorage.getItem(AI_KEYS.byokUrl) || DEFAULT_BASE_URL;
  const model = localStorage.getItem(AI_KEYS.byokModel) || DEFAULT_MODEL;

  return {
    apiKey: (localStorage.getItem(AI_KEYS.byokKey) || '').trim(),
    baseUrl: rawUrl.replace(/\/+$/, ''),
    model,
  };
}

export function hasAIKey(): boolean {
  return getAIConfig().apiKey !== '';
}

/** Roughly 4 characters per token — only used when the provider omits `usage`. */
function estimateTokens(chars: number): number {
  return Math.ceil(chars / 4);
}

export function trackUsage(usage: unknown, fallbackChars: number): void {
  try {
    const reported = (usage as { total_tokens?: number } | undefined)?.total_tokens;
    const tokensUsed = typeof reported === 'number' ? reported : estimateTokens(fallbackChars);

    const currentTokens = parseInt(localStorage.getItem(AI_KEYS.usageTokens) || '0', 10) || 0;
    const currentReqs = parseInt(localStorage.getItem(AI_KEYS.usageRequests) || '0', 10) || 0;
    localStorage.setItem(AI_KEYS.usageTokens, String(currentTokens + tokensUsed));
    localStorage.setItem(AI_KEYS.usageRequests, String(currentReqs + 1));

    // Track Daily Usage
    const today = new Date().toDateString();
    const storedDate = localStorage.getItem(AI_KEYS.usageDate);
    if (storedDate !== today) {
      localStorage.setItem(AI_KEYS.dailyTokens, '0');
      localStorage.setItem(AI_KEYS.dailyRequests, '0');
      localStorage.setItem(AI_KEYS.usageDate, today);
    }
    const currentDailyTokens = parseInt(localStorage.getItem(AI_KEYS.dailyTokens) || '0', 10) || 0;
    const currentDailyReqs = parseInt(localStorage.getItem(AI_KEYS.dailyRequests) || '0', 10) || 0;
    localStorage.setItem(AI_KEYS.dailyTokens, String(currentDailyTokens + tokensUsed));
    localStorage.setItem(AI_KEYS.dailyRequests, String(currentDailyReqs + 1));

    // Maintain a rolling 60-second window to estimate usage rates since CORS blocks actual headers
    const now = Date.now();
    let history: { ts: number; t: number; r: number }[] = [];
    try {
      history = JSON.parse(localStorage.getItem(AI_KEYS.rollingHistory) || '[]');
    } catch { /* ignore */ }

    // Filter out events older than 60 seconds
    history = history.filter(ev => now - ev.ts < 60000);
    history.push({ ts: now, t: tokensUsed, r: 1 });
    localStorage.setItem(AI_KEYS.rollingHistory, JSON.stringify(history));

    window.dispatchEvent(new Event(USAGE_EVENT));
    // Legacy listeners (SettingsModal) still watch for a synthetic `storage` event.
    window.dispatchEvent(new Event('storage'));
  } catch (e) {
    console.warn('Failed to track AI usage', e);
  }
}

export class AIError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'AIError';
    this.status = status;
  }
}

export class MissingKeyError extends AIError {
  constructor() {
    super('No API key configured. Add one in Settings → Smart Engine.');
    this.name = 'MissingKeyError';
  }
}

/** Turn a failed response into the provider's own message rather than a bare status code. */
async function toAIError(response: Response): Promise<AIError> {
  let detail = '';
  try {
    const body = await response.text();
    try {
      const parsed = JSON.parse(body);
      detail = parsed?.error?.message || parsed?.message || body;
    } catch {
      detail = body;
    }
  } catch {
    /* body already consumed or unreadable */
  }
  detail = detail.trim().slice(0, 300);

  if (response.status === 401 || response.status === 403) {
    return new AIError(detail || 'Your API key was rejected. Check it in Settings → Smart Engine.', response.status);
  }
  if (response.status === 429) {
    const retry = response.headers.get('retry-after');
    return new AIError(
      `Rate limited by your provider${retry ? ` — try again in ${retry}s` : ''}.${detail ? ` ${detail}` : ''}`,
      429,
    );
  }
  return new AIError(detail || `Request failed (HTTP ${response.status}).`, response.status);
}

export interface ChatOptions {
  signal?: AbortSignal;
  temperature?: number;
  maxTokens?: number;
  mode?: 'byok' | 'global';
  /** Called with each incremental chunk of text when streaming. */
  onDelta?: (chunk: string) => void;
}

export interface ChatResult {
  text: string;
  /** `length` means the provider hit maxTokens and the reply is cut off. */
  finishReason: string | null;
}

/**
 * One non-streaming or streaming chat completion. Streaming is used whenever
 * `onDelta` is supplied; the full text is still returned at the end.
 */
export async function chatCompletion(messages: ChatMessage[], opts: ChatOptions = {}): Promise<ChatResult> {
  const config = getAIConfig();
  const mode = opts.mode || 'byok';

  let finalUrl = `${config.baseUrl}/chat/completions`;
  let finalKey = config.apiKey;
  // Use a sensible default model for global if the user hasn't selected one
  let finalModel = config.model;

  if (mode === 'global') {
    const { supabase } = await import('@/lib/supabase');
    if (!supabase) throw new AIError('Global engine unavailable (Supabase not initialized).');
    const { SUPABASE_URL, SUPABASE_ANON_KEY } = await import('@/data/constants');
    const { data } = await supabase.auth.getSession();

    // Authenticate with Supabase using the user's session JWT, or fallback to Anon Key
    finalKey = data.session?.access_token || SUPABASE_ANON_KEY;
    finalUrl = `${SUPABASE_URL}/functions/v1/ai-proxy`;
    // Force a specific model for the Technician if we want, or just let it pass through
    finalModel = 'llama-3.3-70b-versatile';
  } else {
    if (!finalKey) throw new MissingKeyError();
  }

  const stream = typeof opts.onDelta === 'function';
  const payload = JSON.stringify({
    model: finalModel,
    messages,
    temperature: opts.temperature ?? 0.7,
    max_tokens: opts.maxTokens ?? 800,
    ...(stream ? { stream: true } : {}),
  });

  const response = await fetch(finalUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${finalKey}` },
    body: payload,
    signal: opts.signal,
  });

  if (!response.ok) throw await toAIError(response);

  if (!stream) {
    const data = await response.json();
    const text: string = data.choices?.[0]?.message?.content ?? '';
    trackUsage(data.usage, payload.length + text.length);
    return { text, finishReason: data.choices?.[0]?.finish_reason ?? null };
  }

  return readStream(response, payload.length, opts.onDelta!);
}

async function readStream(
  response: Response,
  requestChars: number,
  onDelta: (chunk: string) => void,
): Promise<ChatResult> {
  const reader = response.body?.getReader();
  if (!reader) throw new AIError('Your provider returned an empty response stream.');

  const decoder = new TextDecoder();
  let buffer = '';
  let text = '';
  let finishReason: string | null = null;
  let usage: unknown;

  try {
    for (; ;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // SSE frames are separated by a blank line; keep the trailing partial frame.
      const frames = buffer.split('\n\n');
      buffer = frames.pop() ?? '';

      for (const frame of frames) {
        for (const line of frame.split('\n')) {
          if (!line.startsWith('data:')) continue;
          const data = line.slice(5).trim();
          if (!data || data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data);
            const choice = parsed.choices?.[0];
            const delta: string | undefined = choice?.delta?.content;
            if (delta) {
              text += delta;
              onDelta(delta);
            }
            if (choice?.finish_reason) finishReason = choice.finish_reason;
            if (parsed.usage) usage = parsed.usage;
          } catch {
            /* a malformed frame shouldn't kill the whole reply */
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  trackUsage(usage, requestChars + text.length);
  return { text, finishReason };
}
