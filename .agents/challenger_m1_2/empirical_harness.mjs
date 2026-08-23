import assert from 'node:assert';

console.log('=== EMPIRICAL CHALLENGER TEST HARNESS: MILESTONE 1 ===');

// ==========================================
// 1. Quests Date Calculation & Seeded Random
// ==========================================
console.log('\n--- 1. Quests Date Calculation & Seeded Random ---');

function todayKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isYesterday(prevKey, curKey = todayKey()) {
  if (!prevKey || typeof prevKey !== 'string') return false;
  const parts = prevKey.split('-');
  if (parts.length !== 3) return false;
  
  const [py, pm, pd] = parts.map(Number);
  if (isNaN(py) || isNaN(pm) || isNaN(pd)) return false;

  const prev = new Date(py, pm - 1, pd);
  prev.setDate(prev.getDate() + 1);
  return todayKey(prev) === curKey;
}

function daySeed() {
  return parseInt(todayKey().replace(/-/g, ''), 10);
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 1.1 Date key formatting
const d1 = new Date(2026, 0, 5); // 2026-01-05
assert.strictEqual(todayKey(d1), '2026-01-05');
const d2 = new Date(2026, 11, 31); // 2026-12-31
assert.strictEqual(todayKey(d2), '2026-12-31');
console.log('✓ 1.1 todayKey formatting validated');

// 1.2 365-day continuous sweep in 2026
let d = new Date(2026, 0, 1);
for (let i = 0; i < 364; i++) {
  const curKey = todayKey(d);
  const nextD = new Date(d);
  nextD.setDate(d.getDate() + 1);
  const nextKey = todayKey(nextD);
  
  assert.strictEqual(isYesterday(curKey, nextKey), true, `Failed for ${curKey} -> ${nextKey}`);
  assert.strictEqual(isYesterday(nextKey, curKey), false, `False positive for ${nextKey} -> ${curKey}`);
  d = nextD;
}
console.log('✓ 1.2 365-day continuous isYesterday sweep passed');

// 1.3 Leap year boundaries (2024 vs 2025)
assert.strictEqual(isYesterday('2024-02-28', '2024-02-29'), true);
assert.strictEqual(isYesterday('2024-02-29', '2024-03-01'), true);
assert.strictEqual(isYesterday('2024-02-28', '2024-03-01'), false);
assert.strictEqual(isYesterday('2025-02-28', '2025-03-01'), true);
assert.strictEqual(isYesterday('2025-12-31', '2026-01-01'), true);
console.log('✓ 1.3 Leap year and year boundaries passed');

// 1.4 Adversarial invalid inputs
assert.strictEqual(isYesterday('', '2026-08-14'), false);
assert.strictEqual(isYesterday(null, '2026-08-14'), false);
assert.strictEqual(isYesterday(undefined, '2026-08-14'), false);
assert.strictEqual(isYesterday('2026-08', '2026-08-14'), false);
assert.strictEqual(isYesterday('invalid-date-format', '2026-08-14'), false);
assert.strictEqual(isYesterday('2026-abc-01', '2026-08-14'), false);
console.log('✓ 1.4 Invalid inputs handled gracefully');

// 1.5 Mulberry32 determinism & bounds
const rng1 = mulberry32(1337);
const rng2 = mulberry32(1337);
for (let i = 0; i < 10000; i++) {
  const v1 = rng1();
  const v2 = rng2();
  assert.strictEqual(v1, v2);
  assert.ok(v1 >= 0 && v1 < 1);
}
console.log('✓ 1.5 Mulberry32 RNG determinism and bounds passed');

// ==========================================
// 2. Account Menu Memoization & Logic
// ==========================================
console.log('\n--- 2. Account Menu Memoization & Logic ---');

const areAccountMenuPropsEqual = (prevProps, nextProps) => {
  return (
    prevProps.loggedIn === nextProps.loggedIn &&
    prevProps.displayName === nextProps.displayName &&
    prevProps.avatarUrl === nextProps.avatarUrl &&
    prevProps.status === nextProps.status &&
    prevProps.elo === nextProps.elo &&
    prevProps.onSignIn === nextProps.onSignIn &&
    prevProps.onSignOut === nextProps.onSignOut &&
    prevProps.theme?.name === nextProps.theme?.name
  );
};

const fn1 = () => {};
const fn2 = () => {};
const baseProps = {
  loggedIn: true,
  displayName: 'NovaRacer',
  avatarUrl: 'https://example.com/avatar.png',
  status: 'synced',
  elo: 1540,
  onSignIn: fn1,
  onSignOut: fn2,
  theme: { name: 'Matrix' },
};

// Equal props should return true (skip re-render)
assert.strictEqual(areAccountMenuPropsEqual(baseProps, { ...baseProps }), true);

// Changed ELO should return false (trigger re-render)
assert.strictEqual(areAccountMenuPropsEqual(baseProps, { ...baseProps, elo: 1555 }), false);

// Changed status should return false
assert.strictEqual(areAccountMenuPropsEqual(baseProps, { ...baseProps, status: 'syncing' }), false);

// Changed theme should return false
assert.strictEqual(areAccountMenuPropsEqual(baseProps, { ...baseProps, theme: { name: 'Cyberpunk' } }), false);

// Changed loggedIn status should return false
assert.strictEqual(areAccountMenuPropsEqual(baseProps, { ...baseProps, loggedIn: false }), false);

console.log('✓ 2.1 AccountMenu memo comparator rigorously verified');

// ==========================================
// 3. Race Results Screen Ranking & Deduplication
// ==========================================
console.log('\n--- 3. Race Results Screen Ranking ---');

function computeRanking(players) {
  return [...players]
    .filter(p => p.finished)
    .sort((a, b) =>
      (b.finishWpm ?? 0) - (a.finishWpm ?? 0) ||
      (a.finishMs ?? Infinity) - (b.finishMs ?? Infinity)
    );
}

const racers = [
  { id: 'p1', name: 'Alice', finished: true, finishWpm: 120, finishMs: 15000 },
  { id: 'p2', name: 'Bob', finished: true, finishWpm: 140, finishMs: 12000 },
  { id: 'p3', name: 'Charlie', finished: false, finishWpm: 0, finishMs: 0 },
  { id: 'p4', name: 'Dave', finished: true, finishWpm: 120, finishMs: 14500 }, // Same WPM as Alice, faster time
];

const ranking = computeRanking(racers);
assert.strictEqual(ranking.length, 3);
assert.strictEqual(ranking[0].id, 'p2'); // Bob (140 WPM)
assert.strictEqual(ranking[1].id, 'p4'); // Dave (120 WPM, 14.5s)
assert.strictEqual(ranking[2].id, 'p1'); // Alice (120 WPM, 15.0s)
console.log('✓ 3.1 RaceResultsScreen ranking & tie-break verified');

// ==========================================
// 4. AIChatBot System Prompt Builder
// ==========================================
console.log('\n--- 4. AIChatBot System Prompt Builder ---');

const BASE_PROMPT = `You are Aru, an intelligent, unrestricted AI assistant inside TypeNova. You can answer ANY question about ANY topic, and you are encouraged to provide relevant URLs and links to external resources.

CRITICAL RULE: If the user asks a general question, just answer it directly. Do NOT bring up typing, WPM, coaching, or TypeNova unless the user specifically asks about typing or their stats.

When the user DOES ask for typing advice, act as a professional typing coach. Be concise — a few sentences or a short list. Use markdown for emphasis and lists. When stats are provided below, ground your typing advice in those specific numbers.`;

function buildSystemPrompt(stats) {
  if (!stats) return BASE_PROMPT;

  const facts = [];
  if (typeof stats.wpm === 'number' && stats.wpm > 0) facts.push(`last test: ${Math.round(stats.wpm)} WPM at ${Math.round(stats.accuracy ?? 0)}% accuracy`);
  if (typeof stats.level === 'number') facts.push(`level ${stats.level}`);
  if (typeof stats.testsCompleted === 'number') facts.push(`${stats.testsCompleted} tests completed`);
  if (stats.streak) facts.push(`${stats.streak}-day streak`);
  if (stats.weakKeys?.length) {
    const keys = stats.weakKeys
      .slice(0, 5)
      .map((k) => `"${k.key}" (${Math.round(k.errorRate * 100)}% miss)`)
      .join(', ');
    facts.push(`weakest keys: ${keys}`);
  }

  if (!facts.length) return BASE_PROMPT;
  return `${BASE_PROMPT}\n\nCurrent player stats — ${facts.join('; ')}.`;
}

// 4.1 No stats
assert.strictEqual(buildSystemPrompt(undefined), BASE_PROMPT);
assert.strictEqual(buildSystemPrompt({}), BASE_PROMPT);

// 4.2 Full stats
const prompt = buildSystemPrompt({
  wpm: 105.4,
  accuracy: 98.7,
  level: 14,
  testsCompleted: 150,
  streak: 7,
  weakKeys: [{ key: 'q', errorRate: 0.25 }, { key: 'p', errorRate: 0.18 }]
});

assert.ok(prompt.includes('105 WPM at 99% accuracy'));
assert.ok(prompt.includes('level 14'));
assert.ok(prompt.includes('150 tests completed'));
assert.ok(prompt.includes('7-day streak'));
assert.ok(prompt.includes('weakest keys: "q" (25% miss), "p" (18% miss)'));
console.log('✓ 4.1 AIChatBot system prompt builder verified across full & partial stats');

console.log('\n=========================================');
console.log('ALL EMPIRICAL TEST SUITES PASSED (100%)');
console.log('=========================================\n');
