/**
 * The Technician's brain.
 *
 * The support chat in Settings → Smart Engine used to run on a ~15-line static
 * blurb, so it guessed at anything specific and had no idea what the user's
 * install actually looked like. This module gives it three things instead:
 *
 *   1. A MANUAL split into keyword-addressed sections, written from the real
 *      implementation (see the file references on each section). Only the
 *      sections relevant to the question are sent, so the prompt stays small
 *      enough not to burn the shared proxy's tokens-per-minute budget.
 *   2. A LIVE READOUT built from localStorage + the Settings form, so it can
 *      answer "why is my key failing" with this browser's actual state.
 *   3. An ACTION protocol — the model can emit `[[do:...]]` directives that the
 *      UI turns into buttons, so it can operate the app instead of narrating
 *      click-paths.
 *
 * Everything here is plain data + string building; no React, no side effects
 * beyond reading localStorage.
 */

import { ACHIEVEMENTS } from '@/data/constants';
import { CHANGELOG } from '@/data/changelog';
import { readLocalProgress } from '@/lib/progress';
import { isYesterday, todayKey } from '@/utils/seededRandom';
import {
  AI_KEYS,
  DEFAULT_BASE_URL,
  DEFAULT_MODEL,
  PROVIDER_PRESETS,
  limitsForModel,
  providerForKey,
  providerForUrl,
  readUsage,
  type RateLimits,
  type UsageSnapshot,
} from '@/lib/aiClient';

// ─── OFFLINE BOT ENGINE ─────────────────────────────────────────────────

// ─── ACTION PROTOCOL ──────────────────────────────────────────────────

export type ActionId =
  | 'open_tab'
  | 'set_provider'
  | 'set_model'
  | 'test_connection'
  | 'reset_usage'
  | 'open_console'
  | 'toggle';

export interface TechAction {
  id: ActionId;
  arg: string;
  /** Button caption shown to the user. */
  label: string;
}

const TAB_LABELS: Record<string, string> = {
  gameplay: 'Gameplay',
  visuals: 'Audio & Visuals',
  system: 'System',
  ai: 'Smart Engine',
  usage: 'Local AI Stats',
  report: 'Report Issue',
};

export const MODIFIER_LABELS: Record<string, string> = {
  sudden_death: 'Sudden Death',
  overclocked: 'Overclocked',
  blind: 'Blind Mode',
  fog: 'Fog of War',
  mirror: 'Mirrored Mode',
  ghost: 'Ghost Pacer',
  focus: 'Focus Mode',
  sticky: 'Sticky Keys',
};


const ACTION_RE = /\[\[\s*do\s*:\s*([a-z_]+)\s*(?::\s*([^\]]*?))?\s*\]\]/gi;

function labelForAction(id: ActionId, arg: string): string | null {
  switch (id) {
    case 'open_tab':
      // `ai` is the tab the Technician is rendered on — offering it is a no-op.
      return arg !== 'ai' && TAB_LABELS[arg] ? `Open ${TAB_LABELS[arg]}` : null;
    case 'set_provider': {
      const preset = PROVIDER_PRESETS.find(p => p.id === arg && p.id !== 'custom');
      return preset ? `Switch to ${preset.label}` : null;
    }
    case 'set_model':
      return arg ? `Use model ${arg}` : null;
    case 'open_console': {
      const preset = PROVIDER_PRESETS.find(p => p.id === arg && p.consoleUrl);
      return preset ? `Get a ${preset.label} key` : null;
    }
    case 'test_connection':
      return 'Re-test connection';
    case 'reset_usage':
      return 'Reset usage counters';
    case 'toggle':
      return MODIFIER_LABELS[arg] ? `Toggle ${MODIFIER_LABELS[arg]}` : null;
    default:
      return null;
  }
}

/**
 * Split a reply into the prose the user reads and the actions the UI offers.
 * Unknown or malformed directives are dropped from both — a half-streamed
 * `[[do:` tail is simply not matched yet, so nothing flickers.
 */
export function parseActions(text: string): { body: string; actions: TechAction[] } {
  const actions: TechAction[] = [];
  const seen = new Set<string>();

  for (const match of text.matchAll(ACTION_RE)) {
    const id = match[1].toLowerCase() as ActionId;
    const arg = (match[2] || '').trim();
    const label = labelForAction(id, arg);
    const dedupe = `${id}:${arg}`;
    if (!label || seen.has(dedupe)) continue;
    seen.add(dedupe);
    actions.push({ id, arg, label });
  }

  // Strip every directive-looking token, including trailing partials mid-stream,
  // so the raw syntax never lands in the transcript.
  const body = text
    .replace(ACTION_RE, '')
    .replace(/\[\[\s*do\s*:[^\]]*$/i, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return { body, actions: actions.slice(0, 3) };
}



// ─── LIVE READOUT ─────────────────────────────────────────────────────

export interface TechAiState {
  apiKey: string;
  baseUrl: string;
  model: string;
  connectionStatus: 'idle' | 'testing' | 'success' | 'error';
  connectionError: string;
  modelCount: number;
}

export interface TechSnapshot {
  version: string;
  hasKey: boolean;
  providerLabel: string;
  model: string;
  baseUrl: string;
  urlLooksWrong: boolean;
  keyProviderMismatch: string | null;
  connectionStatus: TechAiState['connectionStatus'];
  connectionError: string;
  modelCount: number;
  usage: UsageSnapshot;
  limits: RateLimits;
  dailyTokenPct: number;
  dailyRequestPct: number;
  minuteTokenPct: number;
  level: number;
  xp: number;
  xpToNext: number;
  tests: number;
  streak: number;
  trophies: number;
  totalTrophies: number;
  bestWpm: number;
  recentWpm: number | null;
  recentAcc: number | null;
  avgWpm: number | null;
  weakKeys: Array<{ key: string; errorRate: number }>;
  activeModifiers: string[];
}

function pct(value: number, ceiling: number): number {
  if (!isFinite(ceiling) || ceiling <= 0) return 0;
  return Math.round((value / ceiling) * 100);
}

/**
 * Everything the Technician is allowed to know about this install. Reads
 * localStorage directly for progress (same keys the game writes) and takes the
 * AI form state from Settings, which holds unsaved edits the storage doesn't.
 */
export function readTechSnapshot(
  ai?: Partial<TechAiState>,
  modifiers?: Record<string, boolean>,
): TechSnapshot {
  const apiKey = (ai?.apiKey ?? localStorage.getItem(AI_KEYS.byokKey) ?? '').trim();
  const baseUrl = (ai?.baseUrl ?? localStorage.getItem(AI_KEYS.byokUrl) ?? DEFAULT_BASE_URL).trim();
  const model = (ai?.model ?? localStorage.getItem(AI_KEYS.byokModel) ?? DEFAULT_MODEL).trim();

  const urlPreset = providerForUrl(baseUrl);
  const keyPreset = providerForKey(apiKey);

  const progress = readLocalProgress();
  const level = Math.floor(Math.sqrt(progress.xp / 100)) + 1;
  const xpToNext = Math.max(0, Math.pow(level, 2) * 100 - progress.xp);

  const history = progress.history;
  const last = history.length ? history[history.length - 1] : null;
  const recent = history.slice(-10);
  const avgWpm = recent.length
    ? Math.round(recent.reduce((sum, entry) => sum + entry.wpm, 0) / recent.length)
    : null;

  const weakKeys = Object.entries(progress.heatmap)
    .filter(([key, data]) => data.total >= 10 && key !== 'SPACE' && key !== 'ENTER' && data.errors > 0)
    .map(([key, data]) => ({ key, errorRate: data.errors / data.total }))
    .sort((a, b) => b.errorRate - a.errorRate)
    .slice(0, 5);

  const usage = readUsage();
  const limits = limitsForModel(model);

  // A streak only counts while it's unbroken — same rule the header flame uses.
  const daily = progress.daily;
  const streak =
    daily && (daily.lastDay === todayKey() || isYesterday(daily.lastDay)) ? daily.streak : 0;

  return {
    version: CHANGELOG[0]?.version ?? 'unknown',
    hasKey: apiKey !== '',
    providerLabel: urlPreset?.label ?? 'Custom Endpoint',
    model,
    baseUrl,
    // A `/chat/completions` or `/models` suffix is the classic paste mistake.
    urlLooksWrong: /\/(chat\/completions|models)\/?$/.test(baseUrl),
    keyProviderMismatch:
      apiKey && keyPreset && urlPreset && keyPreset.id !== urlPreset.id ? keyPreset.label : null,
    connectionStatus: ai?.connectionStatus ?? 'idle',
    connectionError: ai?.connectionError ?? '',
    modelCount: ai?.modelCount ?? 0,
    usage,
    limits,
    dailyTokenPct: pct(usage.dailyTokens, limits.tpd),
    dailyRequestPct: pct(usage.dailyRequests, limits.rpd),
    minuteTokenPct: pct(usage.minuteTokens, limits.tpm),
    level,
    xp: progress.xp,
    xpToNext,
    tests: progress.tests,
    streak,
    trophies: progress.achievements.length,
    totalTrophies: ACHIEVEMENTS.length,
    bestWpm: history.length ? Math.max(...history.map(entry => entry.wpm)) : 0,
    recentWpm: last?.wpm ?? null,
    recentAcc: last?.acc ?? null,
    avgWpm,
    weakKeys,
    activeModifiers: Object.entries(modifiers ?? {})
      .filter(([, on]) => on)
      .map(([id]) => MODIFIER_LABELS[id] ?? id),
  };
}

export interface OfflineResponse {
  text: string;
  topic: string | null;
}

export function offlineRespond(query: string, snapshot: TechSnapshot, lastTopic: string | null): OfflineResponse {
  const q = query.toLowerCase();

  // Helper to match whole words/phrases using boundaries
  const match = (...patterns: string[]) => {
    return patterns.some(pattern => new RegExp(`\\b${pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(q));
  };

  // ── EASTER EGGS ──
  if (match('iamnova')) {
    return { text: `Ah, the master override. Entering 'iamnova' on the config screen unlocks all 17 trophies instantly. Keep it quiet, rookie.`, topic: 'easter_eggs' };
  }
  if (match('godmode')) {
    return { text: `God mode, eh? Entering 'godmode' on the config screen opens the debug panel. Only use it if you know what you're doing.`, topic: 'easter_eggs' };
  }
  if (match('secret', 'easter egg')) {
    return { text: `I don't know what you're talking about. I'm just a mechanic.\n\n(But if you type 'iamnova' on the config screen... who knows what might happen.)`, topic: 'easter_eggs' };
  }

  // ── TOPIC MATCHING ──
  if (match('api key', 'apikey', 'key', 'free api key', 'wake up aru', 'setup', 'configure', 'byok')) {
    return {
      text: `Alright rookie, here's how you get a free API key:\n\n1. Hit the button below — it'll open the Groq console.\n2. Sign up with Google or GitHub. No credit card, totally free.\n3. Once you're logged in, click **API Keys** at the top of the page.\n4. Click **Create API Key**.\n5. Give it any name you want (like "TypeNova").\n6. Hit **Submit** — your key will appear.\n7. **Copy the entire key** — you won't see it again after you leave.\n8. Come back here and paste it in my chat box below. I'll handle the rest.\n\n[[do:open_console:groq]]`,
      topic: 'api_keys'
    };
  }
  
  if (match('fail', 'error', 'reject', '401', 'not working', '403', 'busted', 'issue', 'bug', 'rejected')) {
    if (!snapshot.hasKey) {
      return { text: `You don't even have an API key saved yet, rookie. Of course it's not working.\n\n[[do:open_console:groq]]`, topic: 'errors' };
    }
    if (snapshot.connectionStatus === 'error') {
      return { text: `Your key is failing. The provider kicked it back with: "${snapshot.connectionError}".\n\nDouble-check that you selected the right provider for your key, or generate a new one.\n\n[[do:test_connection:]]`, topic: 'errors' };
    }
    if (snapshot.urlLooksWrong) {
      return { text: `Your Base URL looks busted. It shouldn't end in /chat/completions or /models. Fix that and try again.`, topic: 'errors' };
    }
    if (snapshot.keyProviderMismatch) {
      return { text: `Your key looks like a ${snapshot.keyProviderMismatch} key but your endpoint is ${snapshot.providerLabel}. That's definitely why it's failing.`, topic: 'errors' };
    }
    return { text: `Everything looks fine from here. If it's still busted, try testing the connection again.\n\n[[do:test_connection:]]`, topic: 'errors' };
  }
  
  if (match('rate limit', '429', 'budget', 'usage', 'token', 'quota', 'tpm', 'rpm', 'throttle')) {
    return {
      text: `You're burning through tokens, rookie. You've hit ${snapshot.dailyTokenPct}% of your daily token limit and ${snapshot.dailyRequestPct}% of your request limit.\n\nIf you keep this up, you'll hit a 429 Rate Limit error. Switch to a smaller model or take a break.\n\n[[do:open_tab:usage]]`,
      topic: 'usage'
    };
  }
  
  if (match('worst keys', 'algorithm', 'weak', 'heatmap', 'accuracy')) {
    if (snapshot.weakKeys.length === 0) {
      return { text: `You don't have enough data yet for me to find your worst keys. Go run some tests.\n\n[[do:open_tab:gameplay]]`, topic: 'stats' };
    }
    const keys = snapshot.weakKeys.map(k => k.key).join(', ');
    return {
      text: `The engine looks at any key you've pressed at least 10 times. If your error rate on it is over 10%, or it consistently slows you down, it gets flagged as a weak key.\n\nRight now, your worst offenders are: ${keys}.\n\nAru can generate a custom drill to help you fix them.`,
      topic: 'stats'
    };
  }
  
  if (match('modifier', 'modifiers', 'sudden death', 'overclocked', 'blind', 'fog', 'mirror', 'ghost', 'focus', 'sticky', 'handicap')) {
    return {
      text: `Modifiers are handicap chips you plug into the engine to make tests harder.\n\nSudden Death kills your run on the first typo. Overclocked penalizes your time for dropping below 95% accuracy. Blind hides your text. Fog hides the upcoming words.\n\nYou can toggle them on the Gameplay tab.\n\n[[do:open_tab:gameplay]]`,
      topic: 'modifiers'
    };
  }
  
  if (match('trophy', 'trophies', 'hidden', 'achievement', 'badge', 'unlock')) {
    return {
      text: `There are ${snapshot.totalTrophies} trophies in total. You've got ${snapshot.trophies} of them.\n\nSome require hitting crazy speeds (like Speed Demon at 100 WPM), others require finishing a test with punishing modifiers active (like Daredevil with Sudden Death).\n\nYou can see the full list if you sign in.`,
      topic: 'progression'
    };
  }
  
  if (match('engine', 'triple threat', 'fallback')) {
    return {
      text: `The Triple Threat Engine is how we guarantee your drills never fail to generate.\n\nFirst, it tries your API key. If the cloud is down, it tries Chrome's built-in local AI (Gemini Nano). If that fails too, it falls back to a procedural word-stitcher running right here in your browser.\n\nIt never misses.`,
      topic: 'engine'
    };
  }
  
  if (match('model', 'switch', 'target model', 'groq', 'openrouter', 'openai', 'gemini')) {
    return {
      text: `You can swap out the AI model driving Aru in the Smart Engine settings.\n\nMake sure you test the connection after pasting a key, then pick a model from the dropdown. Larger models are smarter but slower.\n\n[[do:open_tab:ai]]`,
      topic: 'models'
    };
  }
  
  if (match('saved', 'locally', 'data', 'privacy', 'sync', 'cloud')) {
    return {
      text: `All your typing data, history, and API keys are saved strictly locally in this browser.\n\nIf you sign in with an account, your typing stats (but NOT your API keys) will sync to the cloud so you don't lose your progress.\n\n[[do:open_tab:usage]]`,
      topic: 'data'
    };
  }

  if (match('academy', 'lesson', 'learn', 'beginner', 'finger', 'touch typing', 'home row', 'teach', 'practice')) {
    return {
      text: `The Academy is for rookies who still hunt and peck.\n\nIt runs key-by-key guided lessons with a virtual keyboard and animated hands to teach you touch-typing from the ground up.\n\nJust click the ACADEMY door next to the logo.`,
      topic: 'academy'
    };
  }

  if (match('race', 'racing', 'multiplayer', 'friend', 'social', 'elo', 'ranked', 'match', 'leaderboard')) {
    return {
      text: `Multiplayer needs a Google sign-in.\n\nYou can create a room, join one, or take ranked matchmaking to move your Elo. In a race, backspace is disabled and you can't abort with ESC, so no desyncs.\n\nThere's also a global leaderboard, friends lists, and direct comms.`,
      topic: 'social'
    };
  }

  if (match('theme', 'colour', 'color', 'font', 'typeface', 'sound', 'audio', 'appearance', 'look', 'dark')) {
    return {
      text: `We've got 10 themes, 10 typefaces, and 7 keystroke sound profiles (thocky, linear, clicky, etc).\n\nYou can find them in the Audio & Visuals tab.\n\n[[do:open_tab:visuals]]`,
      topic: 'appearance'
    };
  }

  if (match('mode', 'difficulty', 'novice', 'adept', 'master', 'quote', 'code', 'custom', 'language', 'timed')) {
    return {
      text: `We've got plenty of modes. NOVICE is short everyday sentences. ADEPT is technical prose. MASTER is dense paragraphs full of punctuation.\n\nThere's also QUOTES, real CODE snippets, and CUSTOM where you can paste whatever you want.\n\nYou can pick word lengths or timed durations.`,
      topic: 'modes'
    };
  }

  // ── CONTEXT FOLLOW-UPS ──
  if (match('how', 'what', 'where', 'why', 'explain', 'more')) {
    if (lastTopic === 'api_keys') {
      return { text: `To get a key, go to the Groq console using the button below. Click 'Create API Key', copy it, and paste it into my chat box.\n\n[[do:open_console:groq]]`, topic: 'api_keys' };
    }
    if (lastTopic === 'modifiers') {
      return { text: `Modifiers are in the Gameplay tab or above the typing card. Try Sudden Death if you want a real challenge—one mistake and the run is dead.\n\n[[do:open_tab:gameplay]]`, topic: 'modifiers' };
    }
    if (lastTopic === 'appearance') {
      return { text: `Try cycling through all the themes. If you view every single one, you'll unlock the Fashionista trophy.\n\n[[do:open_tab:visuals]]`, topic: 'appearance' };
    }
    if (lastTopic === 'academy') {
      return { text: `The Academy covers Foundations (home row), Row Reaches, Advanced Flow, and Speed Mastery. It'll fix your posture and finger placement.`, topic: 'academy' };
    }
    if (lastTopic === 'stats') {
      return { text: `Your stats are tracked based on net WPM, which factors in mistakes. Consistency is also measured by how spiky your typing speed is.\n\nYou can see your keyboard heatmap in the Stats dashboard.`, topic: 'stats' };
    }
  }

  if (match('hello', 'hi', 'hey', 'sup', 'yo')) {
    return { text: `Yeah, yeah. What's broke this time, rookie?`, topic: 'greeting' };
  }

  // ── FALLBACK ──
  return {
    text: `I'm a mechanic, rookie, not an encyclopedia. If it ain't about the mainframe, API keys, or engine modifiers, I don't care.\n\nCheck the settings tabs if you're lost.\n\n[[do:open_tab:system]]`,
    topic: lastTopic // keep previous topic alive
  };
}

// ─── SUGGESTED OPENERS ────────────────────────────────────────────────

/** Starter chips, chosen from what's actually wrong (or right) with this install. */
export function suggestStarters(snapshot: TechSnapshot): string[] {
  const starters: string[] = [];

  if (!snapshot.hasKey) starters.push('Walk me through getting a free API key');
  if (snapshot.connectionStatus === 'error') starters.push('Why is my API key failing?');
  if (snapshot.dailyTokenPct >= 75 || snapshot.dailyRequestPct >= 75) {
    starters.push('Am I about to get rate limited?');
  }
  if (snapshot.weakKeys.length) starters.push('How does the algorithm pick my worst keys?');
  if (snapshot.tests === 0) starters.push("How do I configure the game modifiers?");
  if (snapshot.trophies > 0 && snapshot.trophies < snapshot.totalTrophies) {
    starters.push('What are the hidden trophies?');
  }

  const filler = [
    'What is the Triple Threat Engine?',
    'Explain the game modifiers to me',
    'How do I switch the AI model?',
    'Is my typing data saved locally?',
  ];
  for (const item of filler) {
    if (starters.length >= 3) break;
    starters.push(item);
  }

  return starters.slice(0, 3);
}