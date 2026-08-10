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
    trackUsage(response, data.usage, payload.length + text.length);
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
    for (;;) {
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

  trackUsage(response, usage, requestChars + text.length);
  return { text, finishReason };
}
