/**
 * Shared client for the user's BYOK (bring-your-own-key) LLM endpoint.
 *
 * Every AI feature in the app talks to one OpenAI-compatible /chat/completions
 * endpoint that the user configures in Settings → Smart Engine. This module owns
 * the storage keys, the endpoint construction and the usage accounting so the
 * callers can't drift apart.
 */
import { emitHealthSignal } from './healthMonitor';

export interface WindowAI {

  languageModel: {
    capabilities: () => Promise<{ available: 'readily' | 'after-download' | 'no' }>;
    create: (options?: any) => Promise<{
      prompt: (input: string) => Promise<string>;
    }>;
  };
}

/** localStorage keys. The `typezen_` prefix is the old product name — kept because
 *  changing it would silently log existing users out of their configured key. */
export const AI_KEYS = {
  byokKey: 'typezen_byok_key',
  byokUrl: 'typezen_byok_url',
  byokModel: 'typezen_byok_model',
  keyPersistence: 'typenova_ai_key_persistence',
  usageTokens: 'typenova_usage_tokens',
  usageRequests: 'typenova_usage_requests',
  dailyTokens: 'typenova_daily_tokens',
  dailyRequests: 'typenova_daily_requests',
  usageDate: 'typenova_usage_date',
  rollingHistory: 'typenova_rolling_history',
  workingModels: 'typenova_working_models',
  aruPersona: 'typenova_aru_persona',
  aruDebriefPolicy: 'typenova_aru_debrief_policy',
} as const;

export type KeyPersistence = 'persistent' | 'session';
export type AruPersona = 'tactical' | 'zen' | 'cyberpunk' | 'hype';
export type DebriefPolicy = 'always' | 'smart' | 'manual';

export interface PersonaConfig {
  id: AruPersona;
  name: string;
  subtitle: string;
  tagline: string;
  badge: string;
  systemInstruction: string;
}

export const ARU_PERSONAS: Record<AruPersona, PersonaConfig> = {
  tactical: {
    id: 'tactical',
    name: 'Precision',
    subtitle: 'Biomechanics & Error Economy',
    tagline: 'Optimizes finger travel, transition latency, and error clusters.',
    badge: 'PRECISION',
    systemInstruction: 'You are Aru in Precision coaching mode. Analyze keystroke biomechanics with quantitative rigor. Focus on error clusters, finger transitions, weak digraphs, and key return economy. Be concise, direct, and professional.',
  },
  zen: {
    id: 'zen',
    name: 'Cadence',
    subtitle: 'Metronome & Flow State',
    tagline: 'Focuses on stroke consistency, timing variance, and relaxed rhythm.',
    badge: 'CADENCE',
    systemInstruction: 'You are Aru in Cadence coaching mode. Guide the typist toward consistent inter-keystroke intervals (IKI) and metronome regularity. Emphasize relaxed physical posture, uniform rhythm, and smooth digraph transitions.',
  },
  cyberpunk: {
    id: 'cyberpunk',
    name: 'Telemetry',
    subtitle: 'Quantitative Diagnostics',
    tagline: 'Deep performance telemetry, latency percentiles, and transition deltas.',
    badge: 'TELEMETRY',
    systemInstruction: 'You are Aru in Telemetry diagnostics mode. Deliver technical, data-driven analysis. Analyze stroke latencies, variance percentiles, CPI ratings, and keystroke transition spikes with precision.',
  },
  hype: {
    id: 'hype',
    name: 'Velocity',
    subtitle: 'Burst Speed & Acceleration',
    tagline: 'Pushes burst acceleration, sprint momentum, and speed ceilings.',
    badge: 'VELOCITY',
    systemInstruction: 'You are Aru in Velocity coaching mode. Focus on maximizing raw keystroke throughput, sprint acceleration, and rapid recovery from errors without breaking forward momentum.',
  },
};

export function getAruPersona(): AruPersona {
  if (typeof window === 'undefined') return 'tactical';
  const p = localStorage.getItem(AI_KEYS.aruPersona) as AruPersona;
  return p && ARU_PERSONAS[p] ? p : 'tactical';
}

export function setAruPersona(persona: AruPersona): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(AI_KEYS.aruPersona, persona);
  window.dispatchEvent(new Event('storage'));
}

export function getAruDebriefPolicy(): DebriefPolicy {
  if (typeof window === 'undefined') return 'always';
  const p = localStorage.getItem(AI_KEYS.aruDebriefPolicy) as DebriefPolicy;
  return p === 'always' || p === 'smart' || p === 'manual' ? p : 'always';
}

export function setAruDebriefPolicy(policy: DebriefPolicy): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(AI_KEYS.aruDebriefPolicy, policy);
  window.dispatchEvent(new Event('storage'));
}

export const DEFAULT_BASE_URL = 'https://api.groq.com/openai/v1';
export const DEFAULT_MODEL = 'groq/compound-mini';

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
  { id: 'groq', label: 'Groq', url: 'https://api.groq.com/openai/v1', model: 'groq/compound-mini', consoleUrl: 'https://console.groq.com/keys', keyPrefix: 'gsk_' },
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

export function detectProvider(key: string): ProviderPreset | undefined {
  const trimmed = key.trim();
  for (const preset of PROVIDER_PRESETS) {
    if (preset.keyPrefix && trimmed.startsWith(preset.keyPrefix)) return preset;
  }
  if (trimmed.startsWith('sk-')) return PROVIDER_PRESETS.find(p => p.id === 'openai');
  return undefined;
}

export const providerForKey = detectProvider;

// ─── FREE-TIER RATE LIMITS ────────────────────────────────────────────
// Published Groq free-tier ceilings. Only used to draw the gauges in
// Settings → Local AI Stats and to let the Technician warn before a 429 —
// the real headers are unreadable from the browser because of CORS.

export interface RateLimits { rpm: number; rpd: number; tpm: number; tpd: number }

export const GROQ_LIMITS: Record<string, RateLimits> = {
  'allam-2-7b': { rpm: 30, rpd: 7000, tpm: 6000, tpd: 500000 },
  'groq/compound': { rpm: 30, rpd: 250, tpm: 70000, tpd: Infinity },
  'groq/compound-mini': { rpm: 30, rpd: 250, tpm: 70000, tpd: Infinity },
  'meta-llama/llama-prompt-guard-2-22m': { rpm: 30, rpd: 14400, tpm: 15000, tpd: 500000 },
  'meta-llama/llama-prompt-guard-2-86m': { rpm: 30, rpd: 14400, tpm: 15000, tpd: 500000 },
  'openai/gpt-oss-120b': { rpm: 30, rpd: 1000, tpm: 8000, tpd: 200000 },
  'openai/gpt-oss-20b': { rpm: 30, rpd: 1000, tpm: 8000, tpd: 200000 },
  'openai/gpt-oss-safeguard-20b': { rpm: 30, rpd: 1000, tpm: 8000, tpd: 200000 },
  'qwen/qwen3.6-27b': { rpm: 30, rpd: 1000, tpm: 8000, tpd: 200000 },
  'qwen/qwen3.8-27b': { rpm: 30, rpd: 1000, tpm: 8000, tpd: 200000 },
  // Legacy / fallback models
  'llama-3.3-70b-versatile': { rpm: 30, rpd: 1000, tpm: 12000, tpd: 100000 },
  'llama-3.1-8b-instant': { rpm: 30, rpd: 14400, tpm: 6000, tpd: 500000 },
  'llama3-70b-8192': { rpm: 30, rpd: 14400, tpm: 6000, tpd: 500000 },
  'llama3-8b-8192': { rpm: 30, rpd: 14400, tpm: 30000, tpd: 500000 },
  'mixtral-8x7b-32768': { rpm: 30, rpd: 14400, tpm: 5000, tpd: 500000 },
  'gemma2-9b-it': { rpm: 30, rpd: 14400, tpm: 15000, tpd: 500000 },
};

const FALLBACK_LIMITS: RateLimits = { rpm: 30, rpd: 1000, tpm: 6000, tpd: 100000 };

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
const USAGE_EVENT = 'typenova:usage';

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

export function getKeyPersistence(): KeyPersistence {
  if (typeof window === 'undefined') return 'persistent';
  try {
    const val = localStorage.getItem(AI_KEYS.keyPersistence);
    return val === 'session' ? 'session' : 'persistent';
  } catch {
    return 'persistent';
  }
}

export function setKeyPersistence(mode: KeyPersistence): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(AI_KEYS.keyPersistence, mode);
    const currentKey = getStoredAIKey();
    if (mode === 'session') {
      if (currentKey) sessionStorage.setItem(AI_KEYS.byokKey, currentKey);
      localStorage.removeItem(AI_KEYS.byokKey);
    } else {
      if (currentKey) localStorage.setItem(AI_KEYS.byokKey, currentKey);
      sessionStorage.removeItem(AI_KEYS.byokKey);
    }
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new CustomEvent('typenova_ai_sync', { detail: { type: 'persistence', mode } }));
  } catch { /* ignore */ }
}

export function getStoredAIKey(): string {
  if (typeof window === 'undefined') return '';
  try {
    const persistence = getKeyPersistence();
    if (persistence === 'session') {
      return (sessionStorage.getItem(AI_KEYS.byokKey) || '').trim();
    }
    return (localStorage.getItem(AI_KEYS.byokKey) || sessionStorage.getItem(AI_KEYS.byokKey) || '').trim();
  } catch {
    return '';
  }
}

export function saveStoredAIKey(key: string): void {
  if (typeof window === 'undefined') return;
  const trimmed = key.trim();
  const persistence = getKeyPersistence();
  try {
    if (persistence === 'session') {
      sessionStorage.setItem(AI_KEYS.byokKey, trimmed);
      localStorage.removeItem(AI_KEYS.byokKey);
    } else {
      localStorage.setItem(AI_KEYS.byokKey, trimmed);
      sessionStorage.removeItem(AI_KEYS.byokKey);
    }
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new CustomEvent('typenova_ai_sync', { detail: { type: 'key', key: trimmed } }));
  } catch { /* ignore */ }
}

export function clearAllAIData(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(AI_KEYS.byokKey);
    sessionStorage.removeItem(AI_KEYS.byokKey);
    localStorage.removeItem(AI_KEYS.workingModels);
    localStorage.removeItem(AI_KEYS.usageTokens);
    localStorage.removeItem(AI_KEYS.usageRequests);
    localStorage.removeItem(AI_KEYS.dailyTokens);
    localStorage.removeItem(AI_KEYS.dailyRequests);
    localStorage.removeItem(AI_KEYS.rollingHistory);
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new CustomEvent('typenova_ai_sync', { detail: { type: 'clear' } }));
  } catch { /* ignore */ }
}

export function redactApiKey(key: string): string {
  if (!key) return '';
  const trimmed = key.trim();
  if (trimmed.length <= 8) return '••••••••';
  const prefix = trimmed.slice(0, 4);
  const suffix = trimmed.slice(-4);
  return `${prefix}••••••••••••••••${suffix}`;
}

function getAIConfig(): AIConfig {
  const rawUrl = typeof window !== 'undefined' ? (localStorage.getItem(AI_KEYS.byokUrl) || DEFAULT_BASE_URL) : DEFAULT_BASE_URL;
  const model = typeof window !== 'undefined' ? (localStorage.getItem(AI_KEYS.byokModel) || DEFAULT_MODEL) : DEFAULT_MODEL;

  return {
    apiKey: getStoredAIKey(),
    baseUrl: rawUrl.replace(/\/+$/, ''),
    model,
  };
}

export function hasAIKey(): boolean {
  return getAIConfig().apiKey !== '';
}

/** Check if Chrome's built-in Gemini Nano Prompt API is available. */
export function hasNativeAI(): boolean {
  if (typeof window === 'undefined') return false;
  const winAi = (window as unknown as { ai?: WindowAI }).ai;
  return !!winAi && !!winAi.languageModel && typeof winAi.languageModel.create === 'function';
}

function markModelWorking(model: string): void {
  if (!model || model.trim() === '') return;
  try {
    let working: string[] = JSON.parse(localStorage.getItem(AI_KEYS.workingModels) || '[]');
    working = [model, ...working.filter(m => m !== model)].slice(0, 15);
    localStorage.setItem(AI_KEYS.workingModels, JSON.stringify(working));
  } catch { /* ignore */ }
}

/** Roughly 4 characters per token — only used when the provider omits `usage`. */
function estimateTokens(chars: number): number {
  return Math.ceil(chars / 4);
}

function trackUsage(usage: unknown, fallbackChars: number): void {
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
  constructor(message = 'No API key configured. Connect your free Groq key in Settings → Smart Engine.') {
    super(message);
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
  const activeKey = getStoredAIKey();
  if (activeKey && activeKey.length >= 4 && detail.includes(activeKey)) {
    detail = detail.replaceAll(activeKey, redactApiKey(activeKey));
  }
  // Redact typical provider API key tokens (OpenAI sk-, Groq gsk_, Google AIza) to prevent leakage
  detail = detail.replace(/(?:sk-|gsk_|AIza)[a-zA-Z0-9_-]{8,}/g, (match) => redactApiKey(match));

  if (response.status === 401 || response.status === 403) {
    const errorMsg = detail || 'Your API key was rejected. Check it in Settings → Smart Engine.';
    emitHealthSignal({
      type: 'ai_auth_error',
      severity: 'error',
      subsystem: 'ai',
      message: errorMsg,
    });
    return new AIError(errorMsg, response.status);
  }
  if (response.status === 429) {
    const retry = response.headers.get('retry-after');
    const errorMsg = `Rate limited by your provider${retry ? ` — try again in ${retry}s` : ''}.${detail ? ` ${detail}` : ''}`;
    emitHealthSignal({
      type: 'ai_rate_limit',
      severity: 'warning',
      subsystem: 'ai',
      message: errorMsg,
    });
    return new AIError(errorMsg, 429);
  }
  if (response.status >= 500) {
    const errorMsg = detail || `AI provider service error (HTTP ${response.status}).`;
    emitHealthSignal({
      type: 'ai_network_error',
      severity: 'error',
      subsystem: 'ai',
      message: errorMsg,
    });
    return new AIError(errorMsg, response.status);
  }
  return new AIError(detail || `Request failed (HTTP ${response.status}).`, response.status);
}

export interface ChatOptions {
  signal?: AbortSignal;
  temperature?: number;
  maxTokens?: number;
  mode?: 'byok' | 'global';
  forceLocal?: boolean;
  stats?: { wpm?: number; accuracy?: number; streak?: number; weakKeys?: Array<{ key: string; errorRate?: number }> | string[] };
  persona?: AruPersona;
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

  // Route to local Gemini Nano if forced, OR if we have no cloud key but native AI exists
  if (opts.forceLocal || (!config.apiKey && hasNativeAI())) {
    try {
      const winAi = (window as unknown as { ai?: WindowAI }).ai;
      if (!winAi) throw new Error('window.ai not available');
      
      const session = await winAi.languageModel.create();
      // Gemini Nano's prompt() just takes a string. We'll stringify the chat history.
      const promptText = messages.map(m => `${m.role}: ${m.content}`).join('\n') + '\nassistant:';
      const result = await session.prompt(promptText);
      return { text: result, finishReason: 'stop' };
    } catch (err) {
      console.warn('Native AI failed:', err);
      // Fall through to throw MissingKeyError if there's no key
      if (!config.apiKey && mode === 'byok') throw new MissingKeyError();
    }
  }

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
    // Use the requested model for the Technician
    finalModel = 'llama-3.1-8b-instant';
  } else {
    if (!finalKey) {
      throw new MissingKeyError('No API key configured. Connect your free Groq API key to activate Aru AI.');
    }
  }

  const stream = typeof opts.onDelta === 'function';
  const payload = JSON.stringify({
    model: finalModel,
    messages,
    temperature: opts.temperature ?? 0.7,
    max_tokens: opts.maxTokens ?? 2500,
    ...(stream ? { stream: true } : {}),
  });

  let response: Response;
  try {
    response = await fetch(finalUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${finalKey}` },
      body: payload,
      signal: opts.signal,
    });
  } catch (err: unknown) {
    if (opts.signal?.aborted) throw err;
    const msg = err instanceof Error ? err.message : 'Network failure';
    emitHealthSignal({
      type: 'ai_network_error',
      severity: 'error',
      subsystem: 'ai',
      message: `Failed to reach AI endpoint: ${msg}`,
    });
    throw new AIError(`Could not reach AI provider: ${msg}`);
  }

  if (!response.ok) throw await toAIError(response);

  if (!stream) {
    const data = await response.json();
    const text: string = data.choices?.[0]?.message?.content ?? '';
    trackUsage(data.usage, payload.length + text.length);
    if (mode === 'byok') markModelWorking(finalModel);
    return { text, finishReason: data.choices?.[0]?.finish_reason ?? null };
  }

  const streamResult = await readStream(response, payload.length, opts.onDelta!);
  if (mode === 'byok') markModelWorking(finalModel);
  return streamResult;
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

export interface EngineTierStatus {
  tier: 'cloud' | 'native_nano' | 'procedural';
  label: string;
  providerId: string;
  model: string;
  isReady: boolean;
  hasKey: boolean;
  hasNative: boolean;
}

export function getEngineTierStatus(): EngineTierStatus {
  const config = getAIConfig();
  const hasKey = !!config.apiKey;
  const hasNative = hasNativeAI();
  const provider = providerForUrl(config.baseUrl) || (config.baseUrl ? { id: 'custom', label: 'Custom' } : { id: 'groq', label: 'Groq' });

  if (hasKey) {
    return {
      tier: 'cloud',
      label: `Cloud AI (${provider.label})`,
      providerId: provider.id,
      model: config.model,
      isReady: true,
      hasKey: true,
      hasNative,
    };
  }

  if (hasNative) {
    return {
      tier: 'native_nano',
      label: 'Chrome Gemini Nano (Local)',
      providerId: 'google_nano',
      model: 'gemini-nano',
      isReady: true,
      hasKey: false,
      hasNative: true,
    };
  }

  return {
    tier: 'procedural',
    label: 'Procedural Neural Heuristics',
    providerId: 'local_heuristic',
    model: 'procedural-v2',
    isReady: true,
    hasKey: false,
    hasNative: false,
  };
}

export function generateProceduralCoachResponse(
  userQuery: string,
  stats?: { wpm?: number; accuracy?: number; streak?: number; weakKeys?: Array<{ key: string; errorRate?: number }> | string[] },
  personaId: AruPersona = getAruPersona()
): string {
  const persona = ARU_PERSONAS[personaId] || ARU_PERSONAS.tactical;
  const lower = userQuery.toLowerCase().trim();

  // Extract weak keys
  let keysList: string[] = ['e', 'r', 't'];
  if (stats?.weakKeys && stats.weakKeys.length > 0) {
    if (typeof stats.weakKeys[0] === 'string') {
      keysList = (stats.weakKeys as string[]).slice(0, 4);
    } else {
      keysList = (stats.weakKeys as Array<{ key: string }>).map(k => k.key).slice(0, 4);
    }
  }
  const formattedKeys = keysList.map(k => `[${k.toUpperCase()}]`).join(', ');
  const drillArg = keysList.join(',');

  // Intent 0: Calibration / Ping Test
  if (lower.includes('calibrated') || lower.includes('online') || lower.includes('ping') || lower.includes('say "aru neural core')) {
    return 'Aru Neural Core is calibrated and online!';
  }

  // Intent 1: Practice / Drill / What to train
  if (lower.includes('practice') || lower.includes('drill') || lower.includes('weak') || lower.includes('what should i') || lower.includes('next') || lower.includes('train')) {
    if (persona.id === 'zen') {
      return `Inter-keystroke intervals show timing variance around ${formattedKeys}. Maintain a steady metronome rhythm and let transitions execute without force:\n\n[[action:drill:${drillArg}]]\n\nFocus on uniform stroke intervals. Speed stabilizes when pacing variance flattens.`;
    }
    if (persona.id === 'cyberpunk') {
      return `Diagnostic trace: transition latency spikes across key sector ${formattedKeys} (+42ms over baseline). Targeted drill recommended to flatten variance:\n\n[[action:drill:${drillArg}]]\n\nTarget these key transitions to compress your 95th percentile stroke latency.`;
    }
    if (persona.id === 'hype') {
      return `Burst velocity drops during transitions involving ${formattedKeys}. Attack these key combinations with high-frequency sprint sets:\n\n[[action:drill:${drillArg}]]\n\nIsolate these keys to raise your overall throughput ceiling.`;
    }
    return `Biomechanics analysis complete. Keystroke transition latency is highest on ${formattedKeys}. Recommended training protocol:\n\n[[action:drill:${drillArg}]]\n\nMaintain uniform finger arch and prioritize clean return to the home row over raw speed.`;
  }

  // Intent 2: Stop looking at keyboard / touch typing
  if (lower.includes('look') || lower.includes('keyboard') || lower.includes('screen') || lower.includes('blind') || lower.includes('touch typing')) {
    if (persona.id === 'zen') {
      return `Keep your visual focus resting steadily on the text stream ahead. Your hands will index their positions naturally when you trust your established spatial layout.`;
    }
    if (persona.id === 'cyberpunk') {
      return `Visual scanning creates an unnecessary 250ms optical context switch latency. Index position strictly via the tactile homing ridges on F and J.`;
    }
    if (persona.id === 'hype') {
      return `Glancing down immediately stalls burst momentum. Keep your eyes locked on the word buffer ahead and drive through errors without breaking pace.`;
    }
    return `To stop glancing at the keyboard, anchor your index fingers to the physical tactile nubs on **F** and **J**. Train yourself to read 2 to 3 words ahead of your active cursor. When a mistake occurs, do not look down—re-orient using the home row bumps.`;
  }

  // Intent 3: Hardware / Mechanical Keyboards / Switches
  if (lower.includes('switch') || lower.includes('mechanical') || lower.includes('board') || lower.includes('linear') || lower.includes('tactile')) {
    if (persona.id === 'cyberpunk') {
      return `For minimum actuation latency and consistent stroke reset, smooth linear switches (45g–55g spring weight) offer the cleanest return curve for rapid multi-finger alternation.`;
    }
    return `For speed typing, light linear switches (45g–50g actuation, like Gateron Yellow or Cherry Reds) minimize finger fatigue during extended sessions. If you suffer from frequent accidental presses, subtle tactiles (like Boba U4T or Cherry Brown) provide physical confirmation of actuation.`;
  }

  // Intent 4: Speed / Cadence / WPM Plateaus
  if (lower.includes('speed') || lower.includes('fast') || lower.includes('plateau') || lower.includes('wpm') || lower.includes('burst')) {
    const wpm = stats?.wpm ? Math.round(stats.wpm) : 75;
    if (persona.id === 'tactical') {
      return `Current baseline is calibrated around ${wpm} WPM. Breaking plateaus requires separating speed sprints from accuracy drills. Spend 5 minutes typing at 99%+ accuracy at 80% speed to rebuild rhythm, then execute 15-second max burst sprints.`;
    }
    if (persona.id === 'zen') {
      return `At ${wpm} WPM, rushing creates physical tension that disrupts timing. Reduce speed slightly, focus on consistent metronome cadence across words, and higher speed will follow naturally.`;
    }
    if (persona.id === 'hype') {
      return `Operating at ${wpm} WPM. To push past your ceiling, run high-intensity 15-second burst sprints on familiar vocabulary to train faster finger release reflexes.`;
    }
    return `To break past ${wpm} WPM, focus on predictive eye tracking: always read 2–3 words ahead so your fingers never wait on cognitive recognition.`;
  }

  // Intent 5: Settings / AI key / Configuration
  if (lower.includes('key') || lower.includes('api') || lower.includes('groq') || lower.includes('model') || lower.includes('settings')) {
    return `You can switch coaching personas, test live inference latency, or paste a free Groq or OpenRouter key in Settings → Smart Engine:\n\n[[action:settings:ai]]`;
  }

  // Fallback: General coaching response incorporating live telemetry
  const currentWpm = stats?.wpm ? Math.round(stats.wpm) : 80;
  const currentAcc = stats?.accuracy ? Math.round(stats.accuracy) : 96;
  const streak = stats?.streak ?? 0;

  if (persona.id === 'zen') {
    return `Telemetry snapshot: ${currentWpm} WPM at ${currentAcc}% accuracy. Your cadence is centered. Focus on soft fingertip releases on ${formattedKeys}. To run targeted practice, tap below:\n\n[[action:drill:${drillArg}]]`;
  }
  if (persona.id === 'cyberpunk') {
    return `Neural link active: clock speed ${currentWpm} WPM | accuracy ${currentAcc}% | streak buffer ${streak}. Subroutine recommendation for ${formattedKeys}:\n\n[[action:drill:${drillArg}]]\n\n*Note: Running in Tier 3 Local Procedural Mode.*`;
  }
  if (persona.id === 'hype') {
    return `Locked in at ${currentWpm} WPM and ${currentAcc}% precision! Let's eliminate all remaining friction on ${formattedKeys} right now:\n\n[[action:drill:${drillArg}]]`;
  }
  const tip = (!hasAIKey() && !hasNativeAI())
    ? '\n\n*Tip: Connect a free Groq API key in Settings → Smart Engine for unrestricted generative AI coaching.*'
    : '';
  return `Telemetry calibrated at ${currentWpm} WPM with ${currentAcc}% precision. To elevate your motor memory, focus on transition timing on ${formattedKeys}:\n\n[[action:drill:${drillArg}]]${tip}`;
}

export interface RaceTelemetry {
  wpm: number;
  accuracy: number;
  cpi?: number;
  grade?: string;
  consistency?: number;
  burstWpm?: number;
  weakKeys?: string[];
  mode?: string;
}

export function getProceduralDebriefInsight(
  telemetry: RaceTelemetry,
  persona: PersonaConfig,
  weakKeys: string[]
): string {
  const wpm = Math.round(telemetry.wpm);
  const acc = Math.round(telemetry.accuracy);
  const keysStr = weakKeys.length > 0 ? weakKeys.map(k => k.toUpperCase()).join(', ') : 'home row';

  if (persona.id === 'zen') {
    return acc >= 96
      ? `Centered flow at ${wpm} WPM with ${acc}% precision. Maintain relaxed metronome cadence across ${keysStr}.`
      : `Cadence variance observed on ${keysStr}. Soften finger pressure and let rhythm steady before accelerating.`;
  }
  if (persona.id === 'cyberpunk') {
    return `Telemetry clocked at ${wpm} WPM | ${acc}% precision. Keystroke latency delta spikes localized to [${keysStr}].`;
  }
  if (persona.id === 'hype') {
    return acc >= 95
      ? `Blazing run at ${wpm} WPM! Attack [${keysStr}] on your next sprint to smash your speed ceiling!`
      : `High-velocity burst logged at ${wpm} WPM! Lock in on [${keysStr}] to turn speed into flawless accuracy!`;
  }
  // tactical / precision
  return acc >= 96
    ? `Strong biomechanical control at ${wpm} WPM. Transition friction observed on [${keysStr}] — prioritize finger return economy.`
    : `Motor memory slip detected on [${keysStr}]. Focus on anchor finger positioning to stabilize accuracy above 96%.`;
}

export async function generateAruDebrief(
  telemetry: RaceTelemetry,
  personaOverride?: AruPersona
): Promise<{ insight: string; drillKeys: string[]; engineTier: string }> {
  const persona = ARU_PERSONAS[personaOverride || getAruPersona()] || ARU_PERSONAS.tactical;
  const weakKeys = (telemetry.weakKeys && telemetry.weakKeys.length > 0)
    ? telemetry.weakKeys.slice(0, 4)
    : ['e', 'r', 't'];

  const hasKey = hasAIKey();
  const hasNative = hasNativeAI();

  // 1. Live Generative AI (BYOK Cloud or Native Gemini Nano)
  if (hasKey || hasNative) {
    try {
      const prompt = `${persona.systemInstruction}
Provide a single punchy, highly-personalized 1-sentence post-race debrief based on this race telemetry:
WPM: ${Math.round(telemetry.wpm)}, Accuracy: ${Math.round(telemetry.accuracy)}%, CPI: ${telemetry.cpi ?? 'N/A'}, Consistency: ${telemetry.consistency ? Math.round(telemetry.consistency) + '%' : 'N/A'}, Weak Keys: [${weakKeys.join(', ')}].
Constraint: Output strictly ONE direct advice sentence under 25 words. No thinking tags, no conversational pleasantries, no quotes, no markdown headers. Direct sentence only.`;

      // 180 tokens allows ample headroom for model reasoning/thinking tokens without truncating
      const { text } = await chatCompletion(
        [{ role: 'user', content: prompt }],
        { maxTokens: 180, temperature: 0.6 }
      );

      // Strip reasoning/thinking tags (e.g. <think>...</think>, <thought>...</thought>)
      let clean = text
        .replace(/<think[\s\S]*?<\/think>/gi, '')
        .replace(/<thought[\s\S]*?<\/thought>/gi, '')
        .replace(/^["'`]|["'`]$/g, '')
        .trim();

      // Extract first complete line if multi-line output was returned
      const lines = clean.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length > 0) {
        clean = lines[0].replace(/^[-*•]\s*/, '');
      }

      if (clean.length > 8) {
        return {
          insight: clean,
          drillKeys: weakKeys,
          engineTier: hasKey ? 'cloud' : 'native_nano',
        };
      }
    } catch (err) {
      console.warn('Live debrief generation failed, falling back to intelligent offline heuristics:', err);
    }
  }

  // 2. Fallback for Connected Key / Native AI users: Never show unconfigured message!
  if (hasKey || hasNative) {
    return {
      insight: getProceduralDebriefInsight(telemetry, persona, weakKeys),
      drillKeys: weakKeys,
      engineTier: 'procedural',
    };
  }

  // 3. Truly Unconfigured State (No API key and no window.ai)
  return {
    insight: 'Connect a free Groq API key in Settings or Aru Chat to unlock live AI post-race debriefs.',
    drillKeys: weakKeys,
    engineTier: 'unconfigured',
  };
}

