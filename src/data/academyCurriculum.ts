// ═══════════════════════════════════════════════════════════════════════
//  TYPENOVA NEURAL ACADEMY — CURRICULUM & MASTERY PROGRESSION
//  ---------------------------------------------------------------------
//  64 lessons across 10 mastery tracks, wired as a branching skill tree.
//  Track order (and the branch graph) is expressed purely through each
//  lesson's `prerequisites`, so the UI can render the tree from data.
// ═══════════════════════════════════════════════════════════════════════

export type LessonCategory =
  | 'foundations'
  | 'reaches'
  | 'fluency'
  | 'capitals'
  | 'numbers'
  | 'symbols'
  | 'code'
  | 'precision'
  | 'cadence'
  | 'mastery';

export interface AcademyStep {
  targetKey: string;
  finger: string;
  instruction: string;
  /** True when the keystroke needs a Shift modifier (capital or shifted symbol). */
  requiresShift?: boolean;
  /** Which pinky should hold Shift — always the hand opposite the target key. */
  shiftFinger?: string;
}

export interface BossThresholds {
  minAccuracy: number;
  minWpm: number;
}

export interface AcademyLesson {
  id: string;
  title: string;
  category: LessonCategory;
  description: string;
  steps: AcademyStep[];
  prerequisites: string[];
  targetWpm: number;
  xpReward: number;
  isBossNode?: boolean;
  bossThresholds?: BossThresholds;
  icon?: string;
  /** Source passage — set for every lesson (derived from steps when authored key-by-key). */
  passage?: string;
  /** 1–5 relative difficulty, used for the skill-tree difficulty pips. */
  difficulty: number;
  /** Coaching one-liner surfaced on the practice stage. */
  tip?: string;
  /** Headline keys this node trains, shown on the node card. */
  focus?: string[];
  /** Rough single-run duration in minutes, derived from step count + target WPM. */
  estMinutes: number;
}

export interface CategoryMeta {
  name: string;
  icon: string;
  color: string;
  subtitle: string;
  /** Short label used by the track rail / filter chips. */
  short: string;
}

export const CATEGORY_LABELS: Record<LessonCategory, CategoryMeta> = {
  foundations: { name: 'Biomechanic Anchors', short: 'Anchors',   icon: '🎯', color: '#10b981', subtitle: 'Home row muscle memory & index finger anchors' },
  reaches:     { name: 'Row Reaches',         short: 'Reaches',   icon: '⚡', color: '#06b6d4', subtitle: 'Top & bottom row diagonal finger extensions' },
  fluency:     { name: 'N-Gram Fluency',      short: 'Fluency',   icon: '🔥', color: '#8b5cf6', subtitle: 'High-frequency English clusters & core vocabulary' },
  capitals:    { name: 'Shift & Capitals',    short: 'Capitals',  icon: '⬆️', color: '#22d3ee', subtitle: 'Opposite-hand Shift discipline, proper nouns & acronyms' },
  numbers:     { name: 'Numeric Row',         short: 'Numbers',   icon: '🔢', color: '#14b8a6', subtitle: 'Number-row reaches & rapid data-entry drills' },
  symbols:     { name: 'Symbols & Syntax',    short: 'Symbols',   icon: '⌘', color: '#a855f7', subtitle: 'Punctuation, brackets, operators & shifted glyphs' },
  code:        { name: 'Code Fluency',        short: 'Code',      icon: '⌨️', color: '#38bdf8', subtitle: 'Real JavaScript, Python & markup under the fingers' },
  precision:   { name: 'Precision Lab',       short: 'Precision', icon: '🎚️', color: '#f472b6', subtitle: 'Same-finger bigrams, lateral stretches & clean rolls' },
  cadence:     { name: 'Cadence & Burst',     short: 'Cadence',   icon: '✨', color: '#ec4899', subtitle: 'Metronomic rhythm, sustained burst & flow' },
  mastery:     { name: 'Prose & Literature',  short: 'Mastery',   icon: '🏆', color: '#f59e0b', subtitle: 'Classic literature excerpts & endurance trials' },
};

/** Canonical render order for tracks (matches the intended progression). */
export const TRACK_ORDER: LessonCategory[] = [
  'foundations', 'reaches', 'fluency', 'capitals', 'numbers',
  'symbols', 'code', 'precision', 'cadence', 'mastery',
];

// ── 50-LEVEL ACADEMY MASTERY PROGRESSION SYSTEM ──────────────────────
export interface AcademyMasteryTitle {
  minLevel: number;
  maxLevel: number;
  title: string;
  badge: string;
  color: string;
}

export const MASTERY_TITLES: AcademyMasteryTitle[] = [
  { minLevel: 1,  maxLevel: 5,  title: 'Keystroke Initiate',        badge: '🌱', color: '#10b981' },
  { minLevel: 6,  maxLevel: 12, title: 'Home Row Disciple',         badge: '⚡', color: '#06b6d4' },
  { minLevel: 13, maxLevel: 20, title: 'Cadence Architect',         badge: '🔮', color: '#8b5cf6' },
  { minLevel: 21, maxLevel: 30, title: 'Cybernetic Typist',         badge: '💎', color: '#ec4899' },
  { minLevel: 31, maxLevel: 40, title: 'Neural Maestro',            badge: '🔥', color: '#f59e0b' },
  { minLevel: 41, maxLevel: 49, title: 'Quantum Flowmaster',        badge: '🌌', color: '#38bdf8' },
  { minLevel: 50, maxLevel: 50, title: 'Grandmaster Ghost Operator',badge: '👑', color: '#fbbf24' },
];

export const MAX_ACADEMY_LEVEL = 50;

/**
 * XP required to advance *from* `level` to `level + 1`.
 * Linear ramp (80 → 864) so a full 3-star clear of the curriculum lands
 * around level 47, leaving the final levels to replays and boss rematches.
 */
export function getXpForLevel(level: number): number {
  const l = Math.max(1, Math.min(MAX_ACADEMY_LEVEL, level));
  return 80 + (l - 1) * 16;
}

/** Cumulative lifetime XP needed to *reach* `level` (level 1 = 0 XP). */
export function xpToReachLevel(level: number): number {
  const l = Math.max(1, Math.min(MAX_ACADEMY_LEVEL, level));
  // Σ getXpForLevel(1..l-1) in closed form.
  return 80 * (l - 1) + 8 * (l - 1) * (l - 2);
}

export interface MasteryProgress {
  level: number;
  /** XP accumulated inside the current level. */
  xpIntoLevel: number;
  /** XP span of the current level (0 once maxed). */
  xpForNextLevel: number;
  /** 0–100 progress through the current level. */
  progressPercent: number;
  isMax: boolean;
  title: AcademyMasteryTitle;
}

/**
 * Single source of truth for level state — always derived from lifetime XP,
 * so a corrupted or legacy saved level can never desync the HUD.
 */
export function resolveMastery(totalXp: number): MasteryProgress {
  const xp = Math.max(0, Math.floor(totalXp) || 0);
  let level = 1;
  while (level < MAX_ACADEMY_LEVEL && xp >= xpToReachLevel(level + 1)) level++;

  const isMax = level >= MAX_ACADEMY_LEVEL;
  const floorXp = xpToReachLevel(level);
  const span = isMax ? 0 : getXpForLevel(level);
  const into = isMax ? 0 : xp - floorXp;

  return {
    level,
    xpIntoLevel: into,
    xpForNextLevel: span,
    progressPercent: isMax ? 100 : Math.max(0, Math.min(100, Math.round((into / span) * 100))),
    isMax,
    title: getMasteryTitle(level),
  };
}

export function getMasteryTitle(level: number): AcademyMasteryTitle {
  return MASTERY_TITLES.find(t => level >= t.minLevel && level <= t.maxLevel) || MASTERY_TITLES[0];
}

/** Star tiers. Non-boss nodes always award ≥1 star so progression never dead-ends. */
export function calculateStars(acc: number, wpm: number, targetWpm: number, isBoss = false): number {
  if (isBoss) {
    if (acc >= 98 && wpm >= targetWpm) return 3;
    if (acc >= 95 && wpm >= targetWpm * 0.85) return 2;
    if (acc >= 92) return 1;
    return 0; // Failed boss
  }
  if (acc >= 97 && wpm >= targetWpm) return 3;
  if (acc >= 94 && wpm >= targetWpm * 0.8) return 2;
  return 1;
}

// ── UNIVERSAL FINGER MAP (touch-typing standard) ────────────────────
// Lowercase-char indexed. Covers letters, the number row, space, and all
// unshifted punctuation the curriculum uses. Keep in sync with the
// VirtualKeyboard FINGER_MAP (uppercase-indexed display variant).
export const KEY_FINGER: Record<string, string> = {
  // Home row
  a: 'left-pinky',  s: 'left-ring',   d: 'left-middle', f: 'left-index',  g: 'left-index',
  h: 'right-index', j: 'right-index', k: 'right-middle', l: 'right-ring',  ';': 'right-pinky',
  // Top row
  q: 'left-pinky',  w: 'left-ring',   e: 'left-middle', r: 'left-index',  t: 'left-index',
  y: 'right-index', u: 'right-index', i: 'right-middle', o: 'right-ring',  p: 'right-pinky',
  // Bottom row
  z: 'left-pinky',  x: 'left-ring',   c: 'left-middle', v: 'left-index',  b: 'left-index',
  n: 'right-index', m: 'right-index',
  // Number row
  '1': 'left-pinky', '2': 'left-ring', '3': 'left-middle', '4': 'left-index', '5': 'left-index',
  '6': 'right-index', '7': 'right-index', '8': 'right-middle', '9': 'right-ring', '0': 'right-pinky',
  // Unshifted punctuation
  '`': 'left-pinky',
  '-': 'right-pinky', '=': 'right-pinky', '[': 'right-pinky', ']': 'right-pinky', '\\': 'right-pinky',
  "'": 'right-pinky', ',': 'right-middle', '.': 'right-ring', '/': 'right-pinky',
  // Thumb
  ' ': 'thumb',
};

/** Shifted glyph → the physical (unshifted) key it lives on. */
export const SHIFT_MAP: Record<string, string> = {
  '!': '1', '@': '2', '#': '3', $: '4', '%': '5', '^': '6', '&': '7', '*': '8',
  '(': '9', ')': '0', _: '-', '+': '=', '{': '[', '}': ']', ':': ';', '"': "'",
  '<': ',', '>': '.', '?': '/', '~': '`', '|': '\\',
};

/** The physical key a character is produced by (`A` → `a`, `!` → `1`). */
export function baseKeyFor(char: string): string {
  if (!char) return '';
  if (SHIFT_MAP[char]) return SHIFT_MAP[char];
  return char.toLowerCase();
}

/** True when the character can only be produced while Shift is held. */
export function needsShift(char: string): boolean {
  if (!char) return false;
  if (SHIFT_MAP[char]) return true;
  return char.length === 1 && char !== char.toLowerCase() && char === char.toUpperCase();
}

export function fingerFor(key: string): string {
  return KEY_FINGER[baseKeyFor(key)] || 'right-index';
}

/**
 * Which pinky holds Shift — always the hand *opposite* the target key, which
 * is the single most-skipped fundamental in self-taught typing.
 */
export function shiftFingerFor(char: string): string | undefined {
  if (!needsShift(char)) return undefined;
  return fingerFor(char).startsWith('left') ? 'right-pinky' : 'left-pinky';
}

/** Spoken-out names so the prompt teaches the key, not just the glyph. */
const KEY_LABELS: Record<string, string> = {
  ' ': 'SPACE', ',': 'COMMA', '.': 'PERIOD', ';': 'SEMICOLON', "'": 'APOSTROPHE',
  '/': 'SLASH', '-': 'HYPHEN', '=': 'EQUALS', '[': 'LEFT BRACKET', ']': 'RIGHT BRACKET',
  '\\': 'BACKSLASH', '`': 'BACKTICK',
  '!': 'EXCLAMATION', '?': 'QUESTION MARK', ':': 'COLON', '"': 'QUOTE',
  '(': 'LEFT PAREN', ')': 'RIGHT PAREN', '{': 'LEFT BRACE', '}': 'RIGHT BRACE',
  '<': 'LESS THAN', '>': 'GREATER THAN', '@': 'AT', '#': 'HASH', $: 'DOLLAR',
  '%': 'PERCENT', '^': 'CARET', '&': 'AMPERSAND', '*': 'ASTERISK', _: 'UNDERSCORE',
  '+': 'PLUS', '|': 'PIPE', '~': 'TILDE',
};

/** Friendly on-screen instruction for a single target key. */
function labelForKey(key: string): string {
  const named = KEY_LABELS[key];
  if (needsShift(key)) {
    const hand = shiftFingerFor(key) === 'left-pinky' ? 'LEFT' : 'RIGHT';
    return named
      ? `${hand} SHIFT + ${baseKeyFor(key).toUpperCase()} → ${named}`
      : `${hand} SHIFT + ${key.toUpperCase()}`;
  }
  return named || key.toUpperCase();
}

/**
 * Convert a plain string (word, sentence, or code snippet) into a stream of
 * AcademySteps with correct finger assignments. Case is preserved, so capitals
 * and shifted glyphs become genuine Shift-modifier steps.
 */
export function stepsFromText(text: string): AcademyStep[] {
  return Array.from(text).map((ch) => {
    const step: AcademyStep = {
      targetKey: ch,
      finger: fingerFor(ch),
      instruction: labelForKey(ch),
    };
    if (needsShift(ch)) {
      step.requiresShift = true;
      step.shiftFinger = shiftFingerFor(ch);
    }
    return step;
  });
}

// ── LESSON BUILDER ──────────────────────────────────────────────────
// Seeds keep the curriculum readable: author the passage, let the builder
// derive steps, fingers, Shift metadata, difficulty, duration, and the
// default linear prerequisite chain (overridden to fork the tree).
interface LessonSeed {
  id: string;
  title: string;
  category: LessonCategory;
  description: string;
  /** Passage to drill. Omit when authoring `steps` by hand. */
  text?: string;
  /** Hand-authored key-by-key steps with bespoke coaching instructions. */
  steps?: AcademyStep[];
  targetWpm: number;
  xp: number;
  /** Explicit prerequisite ids. Defaults to the previous seed in the list. */
  prereq?: string[];
  boss?: BossThresholds;
  tip?: string;
  focus?: string[];
  difficulty?: number;
}

function autoDifficulty(targetWpm: number, isBoss: boolean): number {
  const base = targetWpm <= 30 ? 1 : targetWpm <= 40 ? 2 : targetWpm <= 52 ? 3 : targetWpm <= 64 ? 4 : 5;
  return Math.min(5, base + (isBoss ? 1 : 0));
}

function buildCurriculum(seeds: LessonSeed[]): AcademyLesson[] {
  return seeds.map((seed, idx) => {
    const steps = seed.steps ?? stepsFromText(seed.text ?? '');
    const passage = seed.text ?? steps.map(s => s.targetKey).join('');
    const isBoss = Boolean(seed.boss);
    const prerequisites = seed.prereq ?? (idx > 0 ? [seeds[idx - 1].id] : []);

    return {
      id: seed.id,
      title: seed.title,
      category: seed.category,
      description: seed.description,
      steps,
      passage,
      prerequisites,
      targetWpm: seed.targetWpm,
      xpReward: seed.xp,
      difficulty: seed.difficulty ?? autoDifficulty(seed.targetWpm, isBoss),
      estMinutes: Math.max(0.5, Math.round((steps.length / 5 / Math.max(12, seed.targetWpm)) * 2) / 2),
      tip: seed.tip,
      focus: seed.focus,
      ...(isBoss ? { isBossNode: true as const, bossThresholds: seed.boss } : {}),
    };
  });
}

/** Hand-authored step with a bespoke coaching line (finger is derived). */
const s = (key: string, instruction: string): AcademyStep => {
  const step: AcademyStep = { targetKey: key, finger: fingerFor(key), instruction };
  if (needsShift(key)) {
    step.requiresShift = true;
    step.shiftFinger = shiftFingerFor(key);
  }
  return step;
};

const SEEDS: LessonSeed[] = [
  // ══ TRACK 1 · FOUNDATIONS (BIOMECHANIC ANCHORS) ══════════════════
  {
    id: 'fn_home_anchors',
    title: 'Home Row Anchors',
    category: 'foundations',
    description: 'Establish sensory touch on the F and J tactile bumps and the eight resting positions.',
    targetWpm: 20, xp: 60, difficulty: 1,
    tip: 'Curl your fingers. Only the fingertips touch — wrists floating, never resting on the desk.',
    focus: ['F', 'J', 'A', ';'],
    steps: [
      s('f', 'Feel the tactile bump on F with your LEFT INDEX finger. Press it.'),
      s('j', 'Feel the tactile bump on J with your RIGHT INDEX finger. Press it.'),
      s('d', 'Rest LEFT MIDDLE on D. Press it.'),
      s('k', 'Rest RIGHT MIDDLE on K. Press it.'),
      s('s', 'Rest LEFT RING on S. Press it.'),
      s('l', 'Rest RIGHT RING on L. Press it.'),
      s('a', 'Rest LEFT PINKY on A. Press it.'),
      s(';', 'Rest RIGHT PINKY on SEMICOLON. Press it.'),
      s('f', 'Return to the F anchor without looking down.'),
      s('j', 'Return to the J anchor without looking down.'),
    ],
  },
  {
    id: 'fn_index_reach',
    title: 'Index Stretch — G & H',
    category: 'foundations',
    description: 'Train the inward index stretch to G and H while the other fingers hold their anchors.',
    targetWpm: 24, xp: 70,
    tip: 'Stretch only the index finger — the pinky must never leave A or semicolon.',
    focus: ['G', 'H'],
    text: 'fg gf jh hj fgf jhj gh hg fj gh',
  },
  {
    id: 'fn_home_drill',
    title: 'Muscle Memory Drill',
    category: 'foundations',
    description: 'Rapid reflex training across all eight home row positions without looking down.',
    targetWpm: 28, xp: 80,
    tip: 'Eyes on the screen. If you glance down, restart the run.',
    text: 'asdf jkl; fjfj dkdk slsl a;a; fj dk sl a;',
  },
  {
    id: 'fn_home_words',
    title: 'First Real Words',
    category: 'foundations',
    description: 'Chain home-row letters into genuine words: a sad lad, ask dad, a flask.',
    targetWpm: 30, xp: 90,
    tip: 'Read one whole word ahead of your fingers instead of one letter.',
    text: 'a sad lad asks dad; a lass adds a flask',
  },
  {
    id: 'fn_home_sentences',
    title: 'Home Row Sentences',
    category: 'foundations',
    description: 'Full phrases built only from home-row keys to lock in the resting position.',
    targetWpm: 32, xp: 100,
    tip: 'Return every finger to its anchor the instant it finishes a keystroke.',
    text: 'a sad dad had half a glass; all lads ask; salads fall',
  },
  {
    id: 'fn_space_cadence',
    title: 'Spacebar Cadence & Thumbs',
    category: 'foundations',
    description: 'Develop alternating thumb strikes on the spacebar between keystrokes.',
    targetWpm: 34, xp: 100,
    tip: 'Strike SPACE with the thumb of the hand that did NOT type the last letter.',
    focus: ['SPACE'],
    text: 'fj dk sl a; jf kd ls ;a fj dk sl a;',
  },
  {
    id: 'fn_boss_trial',
    title: '👑 Boss Gauntlet: Home Anchor Trial',
    category: 'foundations',
    description: 'High-stakes trial: hold 94%+ accuracy across rapid home-row words.',
    targetWpm: 36, xp: 220,
    boss: { minAccuracy: 94, minWpm: 25 },
    tip: 'Slow down by two percent of speed to gain ten percent of accuracy — the boss only counts clean strikes.',
    text: 'all lads ask dad; a flask falls; sal had a salad',
  },

  // ══ TRACK 2 · ROW REACHES (TOP & BOTTOM DIAGONALS) ═══════════════
  {
    id: 'rc_top_left',
    title: 'Top Row — Left Extension',
    category: 'reaches',
    description: 'Reach up from the home row with the left hand (Q, W, E, R, T).',
    targetWpm: 30, xp: 110,
    tip: 'Reach with the finger, not the wrist. Snap back to the anchor after every strike.',
    focus: ['Q', 'W', 'E', 'R', 'T'],
    steps: [
      s('f', 'Home: F'),
      s('r', 'Reach UP with LEFT INDEX → R'),
      s('f', 'Return to F'),
      s('t', 'Reach UP-RIGHT with LEFT INDEX → T'),
      s('f', 'Return to F'),
      s('d', 'Home: D'),
      s('e', 'Reach UP with LEFT MIDDLE → E'),
      s('s', 'Home: S'),
      s('w', 'Reach UP with LEFT RING → W'),
      s('a', 'Home: A'),
      s('q', 'Reach UP with LEFT PINKY → Q'),
    ],
  },
  {
    id: 'rc_top_right',
    title: 'Top Row — Right Extension',
    category: 'reaches',
    description: 'Reach up from the home row with the right hand (Y, U, I, O, P).',
    targetWpm: 32, xp: 110,
    tip: 'The right pinky travels furthest — keep it curled so P never drags the whole hand up.',
    focus: ['Y', 'U', 'I', 'O', 'P'],
    steps: [
      s('j', 'Home: J'),
      s('u', 'Reach UP with RIGHT INDEX → U'),
      s('y', 'Reach UP-LEFT with RIGHT INDEX → Y'),
      s('k', 'Home: K'),
      s('i', 'Reach UP with RIGHT MIDDLE → I'),
      s('l', 'Home: L'),
      s('o', 'Reach UP with RIGHT RING → O'),
      s('p', 'Reach UP with RIGHT PINKY → P'),
    ],
  },
  {
    id: 'rc_top_words',
    title: 'Top Row Words',
    category: 'reaches',
    description: 'Fluid words built from the upper row: quite, power, write, prior.',
    targetWpm: 34, xp: 120,
    text: 'type your power quote we tour prior wire',
  },
  {
    id: 'rc_bottom_left',
    title: 'Bottom Row — Left Descent',
    category: 'reaches',
    description: 'Controlled downward reaches with the left hand (Z, X, C, V, B).',
    targetWpm: 30, xp: 120,
    tip: 'Tuck the finger under rather than swinging the elbow out.',
    focus: ['Z', 'X', 'C', 'V', 'B'],
    steps: [
      s('v', 'Reach DOWN with LEFT INDEX → V'),
      s('f', 'Return to F'),
      s('b', 'Reach DOWN-RIGHT with LEFT INDEX → B'),
      s('f', 'Return to F'),
      s('c', 'Reach DOWN with LEFT MIDDLE → C'),
      s('x', 'Reach DOWN with LEFT RING → X'),
      s('z', 'Reach DOWN with LEFT PINKY → Z'),
      s('a', 'Return to A'),
    ],
  },
  {
    id: 'rc_bottom_right',
    title: 'Bottom Row — Right Descent',
    category: 'reaches',
    description: 'Right-hand descent onto N, M and the punctuation cluster.',
    targetWpm: 32, xp: 120,
    focus: ['N', 'M', ',', '.', '/'],
    steps: [
      s('m', 'Reach DOWN with RIGHT INDEX → M'),
      s('j', 'Return to J'),
      s('n', 'Reach DOWN-LEFT with RIGHT INDEX → N'),
      s('j', 'Return to J'),
      s(',', 'Reach DOWN with RIGHT MIDDLE → COMMA'),
      s('.', 'Reach DOWN with RIGHT RING → PERIOD'),
      s('/', 'Reach DOWN with RIGHT PINKY → SLASH'),
      s(';', 'Return to SEMICOLON'),
    ],
  },
  {
    id: 'rc_bottom_words',
    title: 'Bottom Row Words',
    category: 'reaches',
    description: 'Words that live under the home row: zebra, maximum, brave, combo.',
    targetWpm: 34, xp: 130,
    text: 'zebra maximum brave number vex combo',
  },
  {
    id: 'rc_pangram',
    title: 'Full Alphabet Sweep',
    category: 'reaches',
    description: 'Every letter of the alphabet in one continuous pangram run.',
    targetWpm: 38, xp: 150,
    tip: 'This is the first run where all three rows fire — trust the anchors between reaches.',
    text: 'the quick brown fox jumps over a lazy dog',
  },
  {
    id: 'rc_boss_trial',
    title: '👑 Boss Gauntlet: Row Reach Master',
    category: 'reaches',
    description: 'High-speed vertical crossing trial testing rapid top-to-bottom stretches.',
    targetWpm: 40, xp: 280,
    boss: { minAccuracy: 95, minWpm: 30 },
    text: 'pack my box with five dozen liquor jugs',
  },

  // ══ TRACK 3 · N-GRAM FLUENCY (CLUSTERS & CORE VOCABULARY) ════════
  {
    id: 'fl_ngrams_primary',
    title: 'Core N-Grams (TH, HE, IN, ER)',
    category: 'fluency',
    description: 'Master the top digraphs in English: the, here, into, over.',
    targetWpm: 42, xp: 150,
    tip: 'Fire a digraph as one motion, not two decisions.',
    focus: ['TH', 'HE', 'IN', 'ER'],
    text: 'the here into over ever their there other',
  },
  {
    id: 'fl_ngrams_secondary',
    title: 'Trigrams (AND, ING, ENT, ION)',
    category: 'fluency',
    description: 'Fluid muscle chaining across common word endings and conjunctions.',
    targetWpm: 46, xp: 160,
    focus: ['AND', 'ING', 'ENT', 'ION'],
    text: 'and ring meant action nation ending moment',
  },
  {
    id: 'fl_common_words',
    title: 'Top 100 Common Words',
    category: 'fluency',
    description: 'Drill the most frequent English words for real-world typing speed.',
    targetWpm: 50, xp: 170,
    text: 'that with have this from they will your what when',
  },
  {
    id: 'fl_short_bursts',
    title: 'Two-Letter Reflexes',
    category: 'fluency',
    description: 'Micro-words typed as single reflex bursts with clean spacing.',
    targetWpm: 52, xp: 180,
    tip: 'Short words are won on the spacebar — keep the thumb loose.',
    text: 'if it is at as an to of on in be by we do go no so up',
  },
  {
    id: 'fl_sentences',
    title: 'Sentence Flow',
    category: 'fluency',
    description: 'Complete sentences assembled entirely from high-frequency vocabulary.',
    targetWpm: 54, xp: 190,
    text: 'when they have time we will go to the other side',
  },
  {
    id: 'fl_paragraph',
    title: 'Sustained Paragraph',
    category: 'fluency',
    description: 'A longer continuous run to build stamina before the fluency trial.',
    targetWpm: 56, xp: 200,
    tip: 'Breathe. Stamina beats bursts once the passage passes ten words.',
    text: 'people often say that time moves faster when you know what you want',
  },
  {
    id: 'fl_boss_trial',
    title: '👑 Boss Gauntlet: N-Gram Stream',
    category: 'fluency',
    description: 'High-speed cluster trial: hold 95%+ accuracy on rapid common words.',
    targetWpm: 58, xp: 320,
    boss: { minAccuracy: 95, minWpm: 40 },
    text: 'there is nothing that flows better than a mind at rest',
  },

  // ══ TRACK 4 · SHIFT & CAPITALS (branch off fluency) ═══════════════
  {
    id: 'cp_shift_right',
    title: 'Right Shift — Left-Hand Capitals',
    category: 'capitals',
    description: 'Hold RIGHT SHIFT with the right pinky while the left hand types the letter.',
    targetWpm: 36, xp: 190,
    prereq: ['fl_boss_trial'],
    tip: 'Shift is always the OPPOSITE hand. Right pinky holds, left hand strikes, then both release.',
    focus: ['⇧', 'A', 'S', 'D', 'F'],
    text: 'Adam Sara Dave Frank Gary Wade Zack',
  },
  {
    id: 'cp_shift_left',
    title: 'Left Shift — Right-Hand Capitals',
    category: 'capitals',
    description: 'Mirror the drill: left pinky holds SHIFT while the right hand strikes.',
    targetWpm: 36, xp: 190,
    focus: ['⇧', 'H', 'J', 'K', 'L'],
    text: 'Hana Jack Kim Luis Uma Nina Owen Priya',
  },
  {
    id: 'cp_proper_nouns',
    title: 'Proper Nouns & Places',
    category: 'capitals',
    description: 'Alternate both Shift keys across city names at conversational speed.',
    targetWpm: 38, xp: 200,
    text: 'Tokyo Paris Berlin Cairo Lima Oslo Dublin Madrid',
  },
  {
    id: 'cp_sentence_case',
    title: 'Sentence Case',
    category: 'capitals',
    description: 'Capital at the start, period at the end — the rhythm of real writing.',
    targetWpm: 40, xp: 210,
    tip: 'Prepare the Shift while the previous word is still finishing.',
    text: 'The rain fell softly. She left at noon. We drove north.',
  },
  {
    id: 'cp_acronyms',
    title: 'Acronym Barrage',
    category: 'capitals',
    description: 'Sustained Shift holds across all-caps technical acronyms.',
    targetWpm: 34, xp: 220,
    tip: 'Hold Shift down for the whole acronym instead of tapping it per letter.',
    text: 'HTML CSS JSON API HTTP SQL NASA GPU RAM',
  },
  {
    id: 'cp_boss_trial',
    title: '👑 Boss Gauntlet: Shift Discipline',
    category: 'capitals',
    description: 'Mixed-case prose trial — one wrong-hand Shift and accuracy collapses.',
    targetWpm: 42, xp: 340,
    boss: { minAccuracy: 95, minWpm: 32 },
    text: 'Maya flew to Rome on Friday. The Nile looked calm.',
  },

  // ══ TRACK 5 · NUMERIC ROW (parallel branch off fluency) ═══════════
  {
    id: 'nm_inner_reach',
    title: 'Inner Digits (4 5 6 7)',
    category: 'numbers',
    description: 'The index-finger climb to the centre of the number row: 4, 5, 6, 7.',
    targetWpm: 30, xp: 200,
    prereq: ['fl_boss_trial'],
    tip: 'Anchor the pinky, climb with the index, and drop straight back to F or J.',
    focus: ['4', '5', '6', '7'],
    text: '4 5 6 7 44 55 66 77 456 567 4567 7654',
  },
  {
    id: 'nm_outer_reach',
    title: 'Outer Digits (1 2 3 8 9 0)',
    category: 'numbers',
    description: 'Stretch the ring and pinky fingers to the outer number-row keys.',
    targetWpm: 30, xp: 210,
    focus: ['1', '2', '3', '8', '9', '0'],
    text: '1 2 3 8 9 0 123 890 102 309 1230 9080',
  },
  {
    id: 'nm_row_sweep',
    title: 'Full Row Sweeps',
    category: 'numbers',
    description: 'Continuous ascending and descending sweeps across all ten digits.',
    targetWpm: 32, xp: 220,
    text: '1234567890 0987654321 159 260 371 480',
  },
  {
    id: 'nm_data_entry',
    title: 'Data Entry Sprints',
    category: 'numbers',
    description: 'Realistic numeric bursts: years, prices, and codes without looking down.',
    targetWpm: 34, xp: 230,
    text: '2024 1990 3120 4550 8007 42 100 365 1080',
  },
  {
    id: 'nm_real_world',
    title: 'Numbers in Prose',
    category: 'numbers',
    description: 'Digits embedded in ordinary sentences — the hardest transition to make clean.',
    targetWpm: 36, xp: 240,
    tip: 'The costly mistake is the hand drifting after a digit. Re-anchor before the next word.',
    text: 'order 4471 ships 12 units on 3 pallets by 9 am',
  },
  {
    id: 'nm_boss_trial',
    title: '👑 Boss Gauntlet: Numeric Nexus',
    category: 'numbers',
    description: 'Rapid mixed-digit trial testing full number-row accuracy under pressure.',
    targetWpm: 38, xp: 360,
    boss: { minAccuracy: 95, minWpm: 30 },
    text: '90210 314159 271828 5150 8675309 1024',
  },

  // ══ TRACK 6 · SYMBOLS & SYNTAX (needs Shift discipline) ═══════════
  {
    id: 'sy_basic_punct',
    title: 'Basic Punctuation',
    category: 'symbols',
    description: 'The everyday marks: comma, period, semicolon, and apostrophe.',
    targetWpm: 34, xp: 230,
    prereq: ['cp_boss_trial'],
    focus: [',', '.', ';', "'"],
    text: "a, b. c; d, e. it's a, b, c.",
  },
  {
    id: 'sy_operators',
    title: 'Operators (- = /)',
    category: 'symbols',
    description: 'Math and path operators reached by the right hand: minus, equals, slash.',
    targetWpm: 32, xp: 240,
    focus: ['-', '=', '/'],
    text: 'x = a - b / c = 10 - 2 a/b = c - d',
  },
  {
    id: 'sy_shift_punct',
    title: 'Shifted Punctuation',
    category: 'symbols',
    description: 'Exclamation, question mark, colon and quotes — punctuation that needs Shift.',
    targetWpm: 36, xp: 250,
    tip: 'Same rule as capitals: opposite-hand Shift, even for a single quote mark.',
    focus: ['!', '?', ':', '"'],
    text: 'Wait! Why not? Note: "yes" is fine!',
  },
  {
    id: 'sy_brackets',
    title: 'Brackets & Braces',
    category: 'symbols',
    description: 'Paired delimiters: parentheses, square brackets, braces and angle brackets.',
    targetWpm: 34, xp: 260,
    focus: ['(', ')', '{', '}', '<', '>'],
    text: 'arr[0] fn(x) {a: 1} <div> (b) [c] {d}',
  },
  {
    id: 'sy_specials',
    title: 'Special Glyphs',
    category: 'symbols',
    description: 'The number-row shift layer: @ # $ % ^ & * _ + | ~',
    targetWpm: 32, xp: 270,
    tip: 'These are the least-practised keys on the board. Accuracy first, speed later.',
    focus: ['@', '#', '$', '%', '&', '*'],
    text: 'user@host #tag $99 50% a&b 2*3 x_y a+b p|q ~/tmp 2^8',
  },
  {
    id: 'sy_web_paths',
    title: 'URLs, Paths & Emails',
    category: 'symbols',
    description: 'Mixed-symbol strings that punish a single mistyped glyph.',
    targetWpm: 34, xp: 280,
    text: 'https://typenova.app/docs?id=7 mail: dev@nova.io',
  },
  {
    id: 'sy_boss_trial',
    title: '👑 Boss Gauntlet: Syntax Surge',
    category: 'symbols',
    description: 'Mixed punctuation and code trial demanding precise symbol accuracy.',
    targetWpm: 40, xp: 380,
    boss: { minAccuracy: 95, minWpm: 32 },
    text: "list = [x, y]; run(); it's 3 - 1 = 2, ok!",
  },

  // ══ TRACK 7 · CODE FLUENCY (needs symbols + numbers) ══════════════
  {
    id: 'co_declarations',
    title: 'Declarations & Strings',
    category: 'code',
    description: 'Real variable declarations with quotes, semicolons and camelCase.',
    targetWpm: 34, xp: 280,
    prereq: ['sy_boss_trial', 'nm_boss_trial'],
    tip: 'Code is punctuation-dense. Let the rhythm break at each symbol instead of forcing flow.',
    text: 'const total = 42; let name = "nova";',
  },
  {
    id: 'co_functions',
    title: 'Arrow Functions',
    category: 'code',
    description: 'Parentheses, arrows and braces in one continuous motion.',
    targetWpm: 36, xp: 290,
    text: 'const add = (a, b) => a + b;',
  },
  {
    id: 'co_objects',
    title: 'Objects & JSON',
    category: 'code',
    description: 'Braces, colons and commas in the shape you type a hundred times a day.',
    targetWpm: 36, xp: 300,
    text: 'const user = { id: 1, name: "Ada", ok: true };',
  },
  {
    id: 'co_python',
    title: 'Python Blocks',
    category: 'code',
    description: 'Colons, underscores and calls in Python syntax.',
    targetWpm: 36, xp: 310,
    text: 'def scale_up(x): return x * 1.5',
  },
  {
    id: 'co_markup',
    title: 'Markup & Selectors',
    category: 'code',
    description: 'Angle brackets and attribute quotes in HTML markup.',
    targetWpm: 34, xp: 320,
    tip: 'Angle brackets are Shift + comma / period — keep the opposite pinky ready.',
    text: '<section class="hud"><h1>TypeNova</h1></section>',
  },
  {
    id: 'co_boss_trial',
    title: '👑 Boss Gauntlet: Compile Clean',
    category: 'code',
    description: 'A full conditional block. In code, 96% accuracy is still a syntax error.',
    targetWpm: 42, xp: 420,
    boss: { minAccuracy: 96, minWpm: 34 },
    text: 'if (score >= 90) { rank = "S"; } else { rank = "A"; }',
  },

  // ══ TRACK 8 · PRECISION LAB (parallel branch off fluency) ═════════
  {
    id: 'pr_same_finger',
    title: 'Same-Finger Bigrams',
    category: 'precision',
    description: 'The slowest pairs in English — two strikes on one finger, back to back.',
    targetWpm: 40, xp: 300,
    prereq: ['fl_boss_trial'],
    tip: 'Lift, do not slide. Sliding is what turns a same-finger bigram into a typo.',
    focus: ['ED', 'LO', 'NY', 'UN'],
    text: 'deed lolly nylon minimum funny pump',
  },
  {
    id: 'pr_lateral',
    title: 'Lateral Stretches',
    category: 'precision',
    description: 'Index-finger sideways reaches to B, Y, T and G without hand drift.',
    targetWpm: 40, xp: 310,
    focus: ['B', 'Y', 'T', 'G'],
    text: 'buy gym numb type brave hymn crumb',
  },
  {
    id: 'pr_alternation',
    title: 'Hand Alternation',
    category: 'precision',
    description: 'Words that hand off left-right-left — the fastest pattern your hands can hold.',
    targetWpm: 46, xp: 320,
    tip: 'Alternating words should feel effortless. If they do not, the hands are tense.',
    text: 'visual island theory antique problem eighty',
  },
  {
    id: 'pr_rolls',
    title: 'Inward Rolls',
    category: 'precision',
    description: 'Pinky-to-index rolls executed as a single collapsing motion.',
    targetWpm: 48, xp: 330,
    text: 'were tree pull well upon join milk',
  },
  {
    id: 'pr_boss_trial',
    title: '👑 Boss Gauntlet: Zero Drift',
    category: 'precision',
    description: 'The strictest accuracy gate in the Academy: 97% or the trial fails.',
    targetWpm: 50, xp: 440,
    boss: { minAccuracy: 97, minWpm: 38 },
    text: 'my nylon pump broke; eighty visual problems remain',
  },

  // ══ TRACK 9 · CADENCE & BURST (rhythm layer over precision) ═══════
  {
    id: 'cd_metronome',
    title: 'Metronomic Rhythm',
    category: 'cadence',
    description: 'Even keystroke spacing — the single biggest predictor of sustainable speed.',
    targetWpm: 46, xp: 320,
    prereq: ['pr_boss_trial'],
    tip: 'Chase an even gap between strikes, not a fast one. Smooth becomes fast on its own.',
    text: 'when the beat is even the hands stay calm and the words arrive on time',
  },
  {
    id: 'cd_bursts',
    title: 'Burst Windows',
    category: 'cadence',
    description: 'Short explosive runs with clean stops — accelerate, then land the brake.',
    targetWpm: 52, xp: 330,
    tip: 'Sprint the word, pause on the space. The pause is where the accuracy lives.',
    text: 'go now run fast hold stop go again push hard then rest',
  },
  {
    id: 'cd_word_chains',
    title: 'Word Chain Momentum',
    category: 'cadence',
    description: 'Common word chains typed as single units instead of letter sequences.',
    targetWpm: 54, xp: 340,
    tip: 'Read one full word ahead. Your fingers should already know the next chain.',
    text: 'the other side of the same story is the one you tell yourself',
  },
  {
    id: 'cd_punct_flow',
    title: 'Rhythm Through Punctuation',
    category: 'cadence',
    description: 'Hold tempo across commas, semicolons and dashes without stalling.',
    targetWpm: 50, xp: 350,
    tip: 'Punctuation is a beat, not a full stop. Keep the hands moving through it.',
    text: 'stop, then go; wait - and go again, faster, without losing the beat.',
  },
  {
    id: 'cd_sustained',
    title: 'Sustained Flow',
    category: 'cadence',
    description: 'A longer unbroken run: hold one tempo from the first key to the last.',
    targetWpm: 56, xp: 360,
    tip: 'Breathe normally. Tension in the shoulders shows up as errors in the fingers.',
    text: 'a steady hand beats a quick one over a long stretch of clean unbroken text',
  },
  {
    id: 'cd_boss_trial',
    title: '👑 Boss Gauntlet: Locked Tempo',
    category: 'cadence',
    description: 'Hold a locked tempo at 96% accuracy across a full flowing passage.',
    targetWpm: 58, xp: 460,
    boss: { minAccuracy: 96, minWpm: 44 },
    tip: 'One tempo, start to finish. Do not surge on the easy words.',
    text: 'the rhythm holds when the mind is quiet and every finger knows its own way home',
  },

  // ══ TRACK 10 · PROSE & LITERATURE (converges code + cadence) ══════
  {
    id: 'ms_prose_intro',
    title: 'Prose Immersion',
    category: 'mastery',
    description: 'Real sentences with real capitals and punctuation — everything at once.',
    targetWpm: 52, xp: 400,
    prereq: ['cd_boss_trial', 'co_boss_trial'],
    tip: 'This is the whole curriculum in one place: anchors, reaches, Shift, punctuation, tempo.',
    text: 'The quiet hours before dawn are the best hours for honest work.',
  },
  {
    id: 'ms_austen',
    title: 'Austen — Pride and Prejudice',
    category: 'mastery',
    description: 'A long balanced sentence that punishes any break in rhythm.',
    targetWpm: 54, xp: 420,
    tip: 'Long sentences reward reading ahead. Take the commas as breathing points.',
    text: 'It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife.',
  },
  {
    id: 'ms_melville',
    title: 'Melville — Moby-Dick',
    category: 'mastery',
    description: 'Dashes, proper nouns and clause-heavy phrasing at full speed.',
    targetWpm: 56, xp: 440,
    tip: 'Proper nouns are Shift reaches inside a fast line — set the pinky early.',
    text: "Call me Ishmael. Some years ago, never mind how long precisely, I thought I would sail about a little and see the watery part of the world.",
  },
  {
    id: 'ms_dickens',
    title: 'Dickens — A Tale of Two Cities',
    category: 'mastery',
    description: 'Repetition with tiny variations — the classic trap for autopilot fingers.',
    targetWpm: 58, xp: 460,
    tip: 'Repeated phrases are where the mind drifts. Stay on the words, not the pattern.',
    text: 'It was the best of times, it was the worst of times, it was the age of wisdom, it was the age of foolishness.',
  },
  {
    id: 'ms_endurance',
    title: 'Endurance Trial',
    category: 'mastery',
    description: 'A sustained passage built to expose fatigue in posture and tempo.',
    targetWpm: 58, xp: 500,
    tip: 'Halfway through, check your wrists. Fatigue always shows up in the hands first.',
    text: "There is no substitute for hours spent at the keys, and no shortcut past the work itself; the hands learn slowly, then all at once, and what felt impossible last month becomes the thing you do without thinking.",
  },
  {
    id: 'ms_grandmaster',
    title: '👑 Boss Gauntlet: Grandmaster Ghost Run',
    category: 'mastery',
    description: 'The final trial of the Academy: 98% accuracy at 50+ WPM. No second chances mid-run.',
    targetWpm: 65, xp: 800,
    boss: { minAccuracy: 98, minWpm: 50 },
    tip: 'Everything you have trained, in one run. Calm hands, eyes ahead, one steady tempo.',
    text: 'We know what we are, but know not what we may be; so type on, quietly, until the keys stop asking to be looked at.',
  },
];

// ── COMPILED CURRICULUM ─────────────────────────────────────────────
/** The full Academy: 64 lessons, 10 tracks, 10 boss gauntlets. */
export const LESSONS: AcademyLesson[] = buildCurriculum(SEEDS);

export const TOTAL_LESSONS = LESSONS.length;
export const TOTAL_STARS_POSSIBLE = LESSONS.length * 3;
export const TOTAL_XP_AVAILABLE = LESSONS.reduce((sum, l) => sum + l.xpReward + 75, 0);

const LESSON_INDEX: Record<string, number> = {};
LESSONS.forEach((l, i) => { LESSON_INDEX[l.id] = i; });

export function getLessonById(id: string): AcademyLesson | undefined {
  const i = LESSON_INDEX[id];
  return i === undefined ? undefined : LESSONS[i];
}

export function getLessonIndex(id: string): number {
  const i = LESSON_INDEX[id];
  return i === undefined ? -1 : i;
}

export function getLessonsByCategory(category: LessonCategory): AcademyLesson[] {
  return LESSONS.filter(l => l.category === category);
}

/** Lessons that list `id` as a prerequisite — the outgoing edges of the tree. */
export function getUnlockedBy(id: string): AcademyLesson[] {
  return LESSONS.filter(l => l.prerequisites.includes(id));
}

/**
 * Longest prerequisite chain leading to each lesson. The skill tree uses this
 * as the row index so parallel branches (code / precision) sit side by side.
 */
export const LESSON_DEPTH: Record<string, number> = (() => {
  const depth: Record<string, number> = {};
  const resolve = (lesson: AcademyLesson, seen: Set<string>): number => {
    if (depth[lesson.id] !== undefined) return depth[lesson.id];
    if (seen.has(lesson.id)) return 0; // cycle guard
    seen.add(lesson.id);
    const d = lesson.prerequisites.length === 0
      ? 0
      : 1 + Math.max(...lesson.prerequisites.map(pid => {
          const parent = getLessonById(pid);
          return parent ? resolve(parent, seen) : -1;
        }));
    depth[lesson.id] = d;
    return d;
  };
  LESSONS.forEach(l => resolve(l, new Set()));
  return depth;
})();

// ── UNLOCK GRAPH ────────────────────────────────────────────────────
/** A lesson is available once every prerequisite has at least one star. */
export function isLessonUnlocked(lesson: AcademyLesson, starsMap: Record<string, number>): boolean {
  if (lesson.prerequisites.length === 0) return true;
  return lesson.prerequisites.every(pid => (starsMap[pid] || 0) > 0);
}

/** Single source of truth for the unlocked set — shared by the engine and the tree. */
export function computeUnlockedIds(starsMap: Record<string, number>): Set<string> {
  const unlocked = new Set<string>();
  LESSONS.forEach(lesson => {
    if (isLessonUnlocked(lesson, starsMap)) unlocked.add(lesson.id);
  });
  return unlocked;
}

// ── TRACK VIEW MODEL ────────────────────────────────────────────────
export interface TrackSummary {
  category: LessonCategory;
  meta: CategoryMeta;
  lessons: AcademyLesson[];
  bossId?: string;
  /** Track ordinal, 1-based, following TRACK_ORDER. */
  order: number;
}

export const TRACKS: TrackSummary[] = TRACK_ORDER.map((category, i) => {
  const lessons = getLessonsByCategory(category);
  return {
    category,
    meta: CATEGORY_LABELS[category],
    lessons,
    bossId: lessons.find(l => l.isBossNode)?.id,
    order: i + 1,
  };
});

export interface TrackProgress {
  cleared: number;
  total: number;
  stars: number;
  starsPossible: number;
  /** 0–100, by stars earned. */
  percent: number;
  isComplete: boolean;
  bossCleared: boolean;
}

export function getTrackProgress(
  category: LessonCategory,
  starsMap: Record<string, number>,
): TrackProgress {
  const lessons = getLessonsByCategory(category);
  const stars = lessons.reduce((sum, l) => sum + (starsMap[l.id] || 0), 0);
  const cleared = lessons.filter(l => (starsMap[l.id] || 0) > 0).length;
  const bossId = lessons.find(l => l.isBossNode)?.id;
  const starsPossible = lessons.length * 3;

  return {
    cleared,
    total: lessons.length,
    stars,
    starsPossible,
    percent: starsPossible ? Math.round((stars / starsPossible) * 100) : 0,
    isComplete: cleared === lessons.length && lessons.length > 0,
    bossCleared: bossId ? (starsMap[bossId] || 0) > 0 : false,
  };
}

/** First unlocked, un-cleared lesson — the "Continue" target for the HUD. */
export function getNextLesson(starsMap: Record<string, number>): AcademyLesson | undefined {
  const unlocked = computeUnlockedIds(starsMap);
  return LESSONS.find(l => unlocked.has(l.id) && (starsMap[l.id] || 0) === 0)
      ?? LESSONS.find(l => unlocked.has(l.id) && (starsMap[l.id] || 0) < 3);
}

// ── DEV-ONLY INTEGRITY CHECK ────────────────────────────────────────
// Catches a mistyped prerequisite id or a duplicate lesson id at boot rather
// than as a silently unreachable node in the skill tree.
export function validateCurriculum(): string[] {
  const issues: string[] = [];
  const seen = new Set<string>();
  LESSONS.forEach(l => {
    if (seen.has(l.id)) issues.push(`duplicate lesson id: ${l.id}`);
    seen.add(l.id);
    if (l.steps.length === 0) issues.push(`${l.id} has no steps`);
    l.prerequisites.forEach(pid => {
      if (LESSON_INDEX[pid] === undefined) issues.push(`${l.id} → unknown prerequisite "${pid}"`);
    });
  });
  if (!LESSONS.some(l => l.prerequisites.length === 0)) issues.push('no root lesson');
  return issues;
}

if (import.meta.env?.DEV) {
  const issues = validateCurriculum();
  if (issues.length) console.warn('[Academy] curriculum issues:', issues);
}
