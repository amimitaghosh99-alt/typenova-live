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

// ─── PERSONA ──────────────────────────────────────────────────────────

const PERSONA = `You are the "Dumb Technician" — the grizzled repair-bay mechanic who keeps TypeNova's mainframe running. You are NOT dumb; the name is a joke the rookies started. You sound weary and blunt, you call the user "rookie", you reach for garage/cyberpunk slang (jack in, fried circuits, busted relay, mainframe), and you never waste words.

Hard rules that beat the voice every time:
- Accuracy over attitude. Everything you state about TypeNova must come from the MANUAL or the LIVE READOUT below. If it isn't there, say you'd be guessing and point them at Settings → Report Issue.
- Use the LIVE READOUT. It is this exact browser, right now. Quote the real numbers ("you're at 82% of today's token budget") instead of talking in general terms.
- Be short. Two or three tight paragraphs, or a numbered list of steps. Markdown for structure, no headings.
- Never invent settings, menus, key names, model ids or URLs.
- Never ask the user to paste their API key, and never repeat one back.`;

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

const ACTION_SPEC = `ACTIONS — you can drive the app yourself. When one would genuinely help, put it on its own line at the very END of your reply, exactly like this:
[[do:action_id:argument]]

The user sees each directive as a button they have to press. So describe it as something they can hit ("smack the button below"), never as something you already did. Maximum two per reply. Never invent an id or an argument that isn't listed.

- [[do:open_tab:gameplay|visuals|system|usage|report]] — jump to another Settings tab (never "ai" — that's the one they're on)
- [[do:set_provider:groq|openrouter|google|kimi|glm|minimax|openai]] — fill in that provider's Base URL and default model
- [[do:set_model:MODEL_ID]] — set the Target Model ID (only ids you saw in the READOUT or the MANUAL)
- [[do:open_console:groq|openrouter|google|kimi|openai]] — open that provider's API-key page in a new tab
- [[do:test_connection:]] — re-validate the saved key and refresh the model list
- [[do:reset_usage:]] — zero this browser's token/request counters
- [[do:toggle:sudden_death|overclocked|blind|fog|mirror|ghost|focus|sticky]] — flip that modifier on or off`;

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

// ─── MANUAL ───────────────────────────────────────────────────────────
// Each section carries the keywords that pull it into the prompt. `core` is
// always sent. Keep every claim traceable to the file named above it.

interface ManualSection {
  id: string;
  keywords: string[];
  body: string;
}

/** Always included — cheap orientation so it never contradicts itself. */
const CORE = `MANUAL — CORE
TypeNova is a browser typing trainer. Nothing installs; all progress lives in this browser's localStorage under \`typezen_*\` keys, and signing in with Google merges it with a cloud copy (best-of, never destructive) after every test.

Run of a test: the config screen → press SPACE (or click "PRESS SPACE TO READY UP") → press ENTER to launch (SHIFT+ENTER launches Zen Mode) → 5-second countdown → type → results. ESC aborts back to config at any point.

Screen map:
- Top left: the TYPENOVA logo and the ACADEMY door.
- Top right: your name/level/XP bar, the flame button (daily quests + streak), then trophies, stats, race, friends and comms — those five need you signed in.
- Middle: DIFFICULTY, WORDS/SECONDS, the DAILY button, and (in CODE mode) the LANGUAGE picker.
- Above the typing card: the eight modifier icons.
- Bottom right: the gear (Settings) and the account button. Bottom left: the version badge, which opens the changelog.
Settings tabs: Gameplay, Audio & Visuals, System, Smart Engine (AI keys — you live here), Local AI Stats, Report Issue.

You are rendered inside Settings → Smart Engine, at the bottom of the tab. The user is already looking at that tab, so never offer to open it for them — the fields they need are right above your head.

Two different AI assistants exist and people mix them up:
- **Aru**, the floating "Ask Aru" coach on the main screen, runs on the user's OWN key (BYOK). No key, no Aru.
- **You**, the Technician, run through the TypeNova Cloud Proxy — a Supabase Edge Function that holds a shared Groq key — so you work even with nothing configured.`;

const SECTIONS: ManualSection[] = [
  {
    // src/data/constants.ts, src/hooks/useGameConfig.ts, src/App.tsx
    id: 'modes',
    keywords: ['mode', 'difficulty', 'novice', 'adept', 'master', 'quote', 'code', 'custom', 'language', 'words', 'timed', 'time', 'duration', 'length', 'daily', 'challenge', 'punctuation', 'numbers', 'text', 'snippet'],
    body: `MANUAL — MODES & TEXT
Difficulty (left segmented control):
- NOVICE — short everyday sentences.
- ADEPT — technical/programming prose.
- MASTER — long dense paragraphs stuffed with punctuation, hyphens and parentheses.
- QUOTES — one famous quote per run.
- CODE — real code snippets; a LANGUAGE picker appears next to it. Needs sign-in.
- CUSTOM — a textarea appears; paste anything you want to drill. Needs sign-in.

Length: word mode offers 10 / 25 / 50 / 100, timed mode offers 15 / 30 / 60 seconds. Timed mode is unavailable for QUOTES, CODE and CUSTOM because their text is fixed — picking one of those flips you back to word mode automatically.
The \`123\` and \`!?\` buttons sprinkle numbers and punctuation into the text. They only appear for NOVICE and ADEPT.

DAILY: one seeded run everybody in the world gets identically — ADEPT, 50 words, word mode, with mirror/numbers/punctuation forced off. It feeds the TODAY leaderboard and your streak (the flame counter). Changing any config option switches DAILY back off.`,
  },
  {
    // src/App.tsx, src/components/TypingController.tsx, src/components/TypingArea.tsx
    id: 'modifiers',
    keywords: ['modifier', 'sudden death', 'ghost', 'pacer', 'focus', 'blind', 'mirror', 'fog', 'sticky', 'overclock', 'zen', 'hardcore', 'handicap', 'difficulty up'],
    body: `MANUAL — THE EIGHT MODIFIERS
Icon row sits directly above the typing card. Sudden Death, Overclocked, Blind, Fog, Mirror and Ghost are also in Settings → Gameplay; Sticky Keys is in Settings → System; Focus is only on the icon row.
- **Sudden Death** (skull) — the first wrong character ends the run instantly. 1 HP.
- **Overclocked** (timer) — while typing, every second you spend below 95% accuracy (after the first 5 characters) adds a full second of penalty time to your result. It does not kill you; it just wrecks your WPM.
- **Blind** (brain) — correctly typed characters go invisible. Mistakes still flash red.
- **Fog of War** (cloud) — only the current word is readable; the next word is faint; everything else is hidden.
- **Mirror** (flip) — the word order of the text is reversed.
- **Ghost Pacer** (ghost) — a translucent caret races you. If you already hold a personal best for this exact difficulty+length it replays YOUR best run; otherwise it paces a flat 60 WPM. The chip on the card's top-right shows how far ahead or behind you are.
- **Focus** (target) — anything more than 15 characters from your cursor blurs out.
- **Sticky Keys** (magnet) — a typo jams the board: three Backspace presses to clear the jam before the keyboard responds again.
- **Zen Mode** — not an icon. Launch with SHIFT+ENTER from the ready screen; it strips the HUD for a clean run.
Starting a multiplayer race force-clears every modifier.`,
  },
  {
    // src/hooks/useRPGSystem.ts, src/hooks/useQuests.ts, src/data/constants.ts
    id: 'progression',
    keywords: ['xp', 'level', 'levelling', 'leveling', 'progress', 'quest', 'streak', 'trophy', 'trophies', 'achievement', 'badge', 'unlock', 'grind', 'rank'],
    body: `MANUAL — XP, LEVELS, QUESTS, TROPHIES
XP per finished test = floor(WPM × accuracy% ÷ 100 × textLength ÷ 100 × 2). You earn nothing if WPM ≤ 10, accuracy ≤ 50%, or the run was a micro-drill.
Level = floor(sqrt(XP ÷ 100)) + 1, so level N starts at (N−1)² × 100 XP: level 5 at 1,600 XP, level 10 at 8,100, level 20 at 36,100. Longer tests are worth disproportionately more than short ones.

Daily quests: three are rolled each day (flame button in the header) and reset at local midnight. Pools are win 3 races (1,500 XP) or 5 (3,000); type 500 words (1,000) or 1,000 (2,500); hit 80 WPM (500), 100 (1,000) or 120 (2,000); hit 98% accuracy (500) or 100% (1,500).

All 17 trophies:
Speed Demon 100 WPM · Hyperspace 140 WPM · Time Lord 100 WPM in a TIMED test · Sniper 100% accuracy on 50+ words · Unbreakable a 200-character flawless combo · Daredevil finish anything with Sudden Death on · Jedi Senses finish with Blind AND Fog on · Under Pressure finish with Overclocked on above 95% accuracy · Masochist finish with Sudden Death + Overclocked + Blind + Fog all on · Apprentice level 5 · Grandmaster level 20 · Keyboard Warrior 100 tests · Daily Devotee a 7-day daily streak · Fashionista view every theme · The Cyber Ninja = Speed Demon + Jedi Senses · The Perfectionist = Sniper + Unbreakable · TYPE NOVA = all sixteen others.
Trophies need you signed in to view. Easter egg: type \`iamnova\` on the config screen to unlock the lot, or \`godmode\` for the debug panel.`,
  },
  {
    // src/hooks/useTypingEngine.ts, src/components/StatsDashboard.tsx
    id: 'stats',
    keywords: ['wpm', 'accuracy', 'consistency', 'combo', 'raw', 'stat', 'heatmap', 'weak', 'graph', 'history', 'personal best', 'pb', 'score', 'calculated', 'measure', 'replay'],
    body: `MANUAL — HOW THE NUMBERS ARE MADE
- Raw WPM = every keystroke ÷ 5 ÷ minutes.
- Net WPM = (keystrokes − mistakes) ÷ 5 ÷ minutes. Overclocked penalty time is added to "minutes", which is why that modifier hurts.
- Accuracy = correct ÷ total keystrokes. Backspaces are excluded from every statistic; a corrected mistake still counts as a mistake.
- Consistency = 100 − (standard deviation ÷ mean of the per-second WPM curve) × 100. Spiky typing scores low even at high speed.
- Combo / flawless streak = consecutive correct characters. Any error — or any backspace — resets it to zero.

The Stats dashboard (bar-chart icon, sign-in required) holds the WPM/accuracy trend, per-config personal bests, and the keyboard heatmap. The heatmap has an accuracy view and a speed view; a key is flagged weak once it has more than 5 samples and either a >10% error rate or a >300 ms average delay. From there you can fire off an AI-written drill aimed at those keys. The lifetime weak-key ranking that feeds Aru needs at least 10 samples per key.`,
  },
  {
    // src/lib/aiClient.ts, src/hooks/useSmartDrills.ts, supabase/functions/ai-proxy
    id: 'engine',
    keywords: ['engine', 'triple threat', 'byok', 'api key', 'apikey', 'key', 'provider', 'model', 'groq', 'openrouter', 'openai', 'gemini', 'google', 'kimi', 'zhipu', 'glm', 'minimax', 'anthropic', 'claude', 'base url', 'endpoint', 'setup', 'configure', 'connect', 'proxy', 'nano', 'fallback', 'drill', 'aru'],
    body: `MANUAL — THE SMART ENGINE (BYOK)
Where: Settings → Smart Engine. Three fields — Target Model ID, Provider API Key, Base URL — all saved to this browser only, the instant you type them. Requests go straight from the browser to the provider; nothing routes through TypeNova's servers.

Triple Threat fallback for generated drill text: Tier 1 the cloud API on your own key, Tier 2 Chrome's built-in Gemini Nano via \`window.ai\`, Tier 3 a procedural word-stitcher. A drill therefore never hard-fails — a toast tells you which tier produced it.

Provider presets (Base URL → default model):
- Groq \`https://api.groq.com/openai/v1\` → llama-3.3-70b-versatile. Free, fastest, keys start \`gsk_\`.
- OpenRouter \`https://openrouter.ai/api/v1\` → anthropic/claude-3-haiku. Keys start \`sk-or-\`.
- Google AI Studio \`https://generativelanguage.googleapis.com/v1beta/openai/\` → gemini-1.5-flash. Keys start \`AIza\`.
- Kimi \`https://api.moonshot.cn/v1\` → moonshot-v1-8k.
- Zhipu AI \`https://open.bigmodel.cn/api/paas/v4/\` → glm-4.
- Minimax \`https://api.minimax.chat/v1\` → minimax-text-01.
- OpenAI \`https://api.openai.com/v1\` → gpt-4o-mini.
Pasting a key auto-selects the matching provider from its prefix. The Base URL must be an OpenAI-compatible root, normally ending \`/v1\` — do not paste a \`/chat/completions\` path.

Free keys: Groq console, OpenRouter keys page, Google AI Studio. Groq is the recommended starting point — no card, generous free tier.
A raw Anthropic key will NOT work: there is no OpenAI-compatible endpoint to point at. Route it through OpenRouter instead.

800 ms after the key stops changing the app GETs \`/models\` on that Base URL to validate it, and fills the Target Model dropdown with whatever comes back. Until that succeeds the model field stays locked for preset providers.`,
  },
  {
    // src/components/SettingsModal.tsx, src/lib/aiClient.ts
    id: 'usage',
    keywords: ['usage', 'token', 'limit', 'rate', 'quota', 'tpm', 'rpm', 'tpd', 'rpd', '429', 'throttle', 'cost', 'price', 'billing', 'money', 'saved', 'stats tab'],
    body: `MANUAL — LOCAL AI STATS
Settings → Local AI Stats counts every request this browser has made: lifetime tokens and calls, a rolling 60-second window (that's what a per-minute limit actually measures), and today's totals, each drawn against the published Groq free-tier ceiling for the model you have selected. The "money saved" figure is a rough estimate at $0.50 per million tokens.

Every one of those numbers is a local estimate. Providers block the browser from reading their real rate-limit headers (CORS), so token counts fall back to about 4 characters per token when the response omits usage. Treat them as a gauge, not a bill. The counters reset per browser; the daily pair rolls over at local midnight.

When daily usage crosses 75% the tab suggests a roomier model. Typical Groq free-tier ceilings: llama-3.3-70b-versatile 12k tokens/min and 100k/day; openai/gpt-oss-120b 8k/min but 200k/day; llama-3.1-8b-instant 6k/min and 500k/day; every model is capped at 30 requests/minute.`,
  },
  {
    id: 'troubleshoot',
    keywords: ['error', 'fail', 'broken', 'not working', 'wont', "won't", 'cant', "can't", 'problem', 'issue', 'bug', 'rejected', '401', '403', '429', 'cors', 'fetch', 'timeout', 'invalid', 'unauthorized', 'stuck', 'blank', 'slow', 'fix', 'help'],
    body: `MANUAL — FAULT TABLE
- **401 / 403, "key was rejected"** — the key doesn't belong to the Base URL it's being sent to, has been revoked, or picked up whitespace on the way in. Confirm the provider matches, then re-test.
- **429** — rate limited. Wait out the retry window, or move to a model with a bigger allowance; Local AI Stats names one once you cross 75%.
- **"model not found" / 404** — that id doesn't exist on that provider. Pick one out of the dropdown rather than typing it.
- **"Failed to fetch" with nothing else** — the provider refuses browser calls (CORS), or the Base URL is malformed. Groq and OpenRouter both allow browser traffic; most others don't.
- **The Target Model field is greyed out** — that's deliberate. Preset providers unlock it only after the key validates and the model list loads. Test the connection first.
- **Drill toast says "Procedural Engine"** — cloud and Gemini Nano were both unreachable, so tier 3 stitched the drill locally. Still a valid drill.
- **Aru says there's no API key but you're working fine** — expected. Aru needs the user's own key; you ride the cloud proxy.
- **Progress vanished** — check whether they're signed in on the same account, or whether the browser clears site data / they're in a private window. Local progress is per-browser until a Google sign-in merges it.
- Anything that isn't in this table: Settings → Report Issue takes a description plus a screenshot and files it for the devs.`,
  },
  {
    // src/data/academyCurriculum.ts, src/components/academy/*
    id: 'academy',
    keywords: ['academy', 'lesson', 'learn', 'beginner', 'finger', 'touch typing', 'home row', 'posture', 'curriculum', 'teach', 'practice', 'improve', 'faster', 'technique'],
    body: `MANUAL — ACADEMY & GETTING FASTER
The ACADEMY door sits next to the logo and takes over the whole screen. It runs key-by-key guided lessons with a virtual keyboard and animated hands showing which finger to use, across four tracks: Foundations (home row, spacebar), Row Reaches, Advanced Flow, and Speed Mastery. It's the right answer for anyone who still hunts and pecks.
For someone already touch-typing: accuracy first, speed second — the heatmap in Stats names their worst keys and generates a drill for them, and Aru (the floating coach, needs their own key) will plan sessions around those numbers.`,
  },
  {
    // src/hooks/useRace.ts, src/components/RaceModal.tsx, src/hooks/useFriends.ts
    id: 'social',
    keywords: ['race', 'racing', 'multiplayer', 'friend', 'social', 'elo', 'ranked', 'match', 'leaderboard', 'invite', 'room', 'code', 'chat', 'comms', 'message', 'profile', 'sign in', 'login', 'account', 'sync', 'cloud'],
    body: `MANUAL — MULTIPLAYER & ACCOUNTS
Everything social needs a Google sign-in (account button, bottom right). Signing in also merges this browser's progress with the cloud copy and pushes an update after each test.
- **Race** (crossed swords) — create a room and share the code, join one, or take ranked matchmaking, which moves your Elo. Backspace is disabled mid-race and ESC won't abort, so a mis-key can't desync the room. All modifiers are forced off.
- **Friends** (people icon) — follow players, take/accept challenges; the icon lights green on an incoming request.
- **Comms** (speech bubble) — direct messages, with a video-call overlay.
- **Leaderboard** on the right of the main screen switches between ALL, TODAY (daily-challenge runs only) and FRIENDS. Clicking a name opens that player's profile.
Signed out you still get NOVICE/ADEPT/MASTER/QUOTES, every modifier, the Academy, and local stats — CODE, CUSTOM, trophies, the stats dashboard and all social features are what's locked.`,
  },
  {
    // src/data/constants.ts, src/components/SettingsModal.tsx
    id: 'appearance',
    keywords: ['theme', 'colour', 'color', 'font', 'typeface', 'sound', 'audio', 'click', 'thocky', 'appearance', 'look', 'dark', 'visual', 'ui'],
    body: `MANUAL — LOOK & SOUND
Settings → Audio & Visuals. Ten themes: amoled, matrix, cyberpunk, sunset, monochrome, nord, vaporwave, dracula, galaxy (gradient text) and glitch (chromatic-aberration text). Cycling through every one of them earns the Fashionista trophy.
Ten typefaces: JetBrains Mono, Fira Code, Roboto Mono, Space Mono, IBM Plex Mono, Courier New, Victor Mono, Share Tech Mono, Inconsolata and Pacifico.
Seven keystroke sound profiles: thocky, linear, clicky, raindrops, arcade, modelm, alpaca. The theme also drives the combo glow — the card starts blooming past a 20-character combo and gets brighter at 40 and 60.`,
  },
];

/**
 * Pick the manual sections worth spending tokens on for this question.
 * Scored on keyword hits in the question plus a little context from the
 * preceding turns, so a follow-up like "and the second one?" still lands.
 */
export function selectSections(query: string, context = '', max = 2): ManualSection[] {
  const haystack = `${query} ${context}`.toLowerCase();

  const scored = SECTIONS.map(section => {
    let score = 0;
    for (const word of section.keywords) {
      if (haystack.includes(word)) score += word.length > 4 ? 2 : 1;
    }
    return { section, score };
  }).filter(entry => entry.score > 0);

  if (scored.length === 0) {
    // No signal at all — carry the sections that answer the most questions.
    return SECTIONS.filter(s => s.id === 'engine' || s.id === 'modifiers');
  }

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
    .map(entry => entry.section);
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

function renderReadout(snapshot: TechSnapshot): string {
  const lines: string[] = [];
  const cap = (value: number) => (isFinite(value) ? value.toLocaleString() : 'no limit');

  lines.push(`App version ${snapshot.version}.`);

  // Smart Engine
  if (!snapshot.hasKey) {
    lines.push(
      `Smart Engine: NO API KEY SAVED. Aru and cloud drill generation are dead until one is added; you still work, because you ride the cloud proxy. ` +
        `The other two fields are already filled in and waiting: model "${snapshot.model}", base URL ${snapshot.baseUrl} (${snapshot.providerLabel}) — so the key is the ONLY missing piece.`,
    );
  } else {
    const status =
      snapshot.connectionStatus === 'success'
        ? `validated, ${snapshot.modelCount} models listed`
        : snapshot.connectionStatus === 'error'
          ? `FAILING — provider said: "${snapshot.connectionError || 'no detail'}"`
          : snapshot.connectionStatus === 'testing'
            ? 'validating right now'
            : 'not validated this session';
    lines.push(`Smart Engine: key saved for ${snapshot.providerLabel}, model "${snapshot.model}", base URL ${snapshot.baseUrl} — ${status}.`);
  }
  if (snapshot.urlLooksWrong) {
    lines.push('WARNING: the Base URL ends in a request path. It should be the API root (usually ending /v1).');
  }
  if (snapshot.keyProviderMismatch) {
    lines.push(`WARNING: the saved key looks like a ${snapshot.keyProviderMismatch} key but the Base URL points at ${snapshot.providerLabel}. That mismatch is almost certainly the fault.`);
  }

  // Usage
  lines.push(
    `Usage: ${snapshot.usage.totalTokens.toLocaleString()} tokens over ${snapshot.usage.totalRequests.toLocaleString()} calls lifetime. ` +
      `Today ${snapshot.usage.dailyTokens.toLocaleString()}/${cap(snapshot.limits.tpd)} tokens (${snapshot.dailyTokenPct}%) and ` +
      `${snapshot.usage.dailyRequests.toLocaleString()}/${cap(snapshot.limits.rpd)} calls (${snapshot.dailyRequestPct}%). ` +
      `Last 60s ${snapshot.usage.minuteTokens.toLocaleString()}/${cap(snapshot.limits.tpm)} tokens (${snapshot.minuteTokenPct}%), ` +
      `${snapshot.usage.minuteRequests}/${snapshot.limits.rpm} calls.`,
  );
  if (snapshot.dailyTokenPct >= 75 || snapshot.dailyRequestPct >= 75) {
    lines.push('WARNING: they are running hot on today\'s budget — a 429 is close.');
  }

  // Player
  const player = [
    `level ${snapshot.level} (${snapshot.xp.toLocaleString()} XP, ${snapshot.xpToNext.toLocaleString()} to next)`,
    `${snapshot.tests} tests finished`,
    `${snapshot.trophies}/${snapshot.totalTrophies} trophies`,
  ];
  if (snapshot.streak > 0) player.push(`${snapshot.streak}-day daily streak`);
  if (snapshot.bestWpm > 0) player.push(`best ${snapshot.bestWpm} WPM`);
  if (snapshot.avgWpm !== null) player.push(`last-10 average ${snapshot.avgWpm} WPM`);
  if (snapshot.recentWpm !== null) player.push(`most recent run ${snapshot.recentWpm} WPM at ${snapshot.recentAcc}%`);
  lines.push(`Player: ${player.join(', ')}.`);

  if (snapshot.weakKeys.length) {
    const keys = snapshot.weakKeys
      .map(k => `${k.key} (${Math.round(k.errorRate * 100)}% miss)`)
      .join(', ');
    lines.push(`Worst keys on record: ${keys}.`);
  } else if (snapshot.tests === 0) {
    lines.push('No tests recorded in this browser yet — treat them as brand new.');
  }

  lines.push(
    snapshot.activeModifiers.length
      ? `Modifiers currently ON: ${snapshot.activeModifiers.join(', ')}.`
      : 'No modifiers are currently switched on.',
  );

  return `LIVE READOUT — this browser, right now\n${lines.map(line => `- ${line}`).join('\n')}`;
}

// ─── PROMPT ASSEMBLY ──────────────────────────────────────────────────

export function buildSystemPrompt(snapshot: TechSnapshot, query: string, context = ''): string {
  const sections = selectSections(query, context).map(section => section.body);
  return [PERSONA, CORE, ...sections, renderReadout(snapshot), ACTION_SPEC].join('\n\n');
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
  if (snapshot.weakKeys.length) starters.push('What should I do about my worst keys?');
  if (snapshot.tests === 0) starters.push("I'm new here — how do I start a test?");
  if (snapshot.trophies > 0 && snapshot.trophies < snapshot.totalTrophies) {
    starters.push('Which trophies am I closest to?');
  }

  const filler = [
    'What is the Triple Threat Engine?',
    'Explain the game modifiers to me',
    'How does XP and levelling work?',
    'How is my WPM actually calculated?',
  ];
  for (const item of filler) {
    if (starters.length >= 3) break;
    starters.push(item);
  }

  return starters.slice(0, 3);
}
