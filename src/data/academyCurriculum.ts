export type LessonCategory = 'foundations' | 'reaches' | 'fluency' | 'cadence' | 'mastery';

export interface AcademyStep {
  targetKey: string;
  finger: string;
  instruction: string;
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
}

export const CATEGORY_LABELS: Record<LessonCategory, { name: string; icon: string; color: string; subtitle: string }> = {
  foundations: { name: 'Biomechanic Anchors', icon: '🎯', color: '#10b981', subtitle: 'Home row muscle memory & index finger anchors' },
  reaches:     { name: 'Row Reaches',         icon: '⚡', color: '#06b6d4', subtitle: 'Top & bottom row diagonal finger extensions' },
  fluency:     { name: 'N-Gram Fluency',      icon: '🔥', color: '#8b5cf6', subtitle: 'High-frequency English clusters & core vocabulary' },
  cadence:     { name: 'Cadence & Burst',     icon: '✨', color: '#ec4899', subtitle: 'Metronomic rhythm, sustained burst & flow' },
  mastery:     { name: 'Prose & Literature',  icon: '🏆', color: '#f59e0b', subtitle: 'Classic literature excerpts & endurance trials' },
};

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

export function getXpForLevel(level: number): number {
  if (level <= 1) return 100;
  return Math.round(100 + (level - 1) * 65 + Math.pow(level, 1.25) * 15);
}

export function getMasteryTitle(level: number): AcademyMasteryTitle {
  const found = MASTERY_TITLES.find(t => level >= t.minLevel && level <= t.maxLevel);
  return found || MASTERY_TITLES[0];
}

export function calculateStars(acc: number, wpm: number, targetWpm: number, isBoss = false): number {
  if (isBoss) {
    if (acc >= 98 && wpm >= targetWpm) return 3;
    if (acc >= 95 && wpm >= targetWpm * 0.85) return 2;
    if (acc >= 92) return 1;
    return 0; // Failed boss
  }
  if (acc >= 97 && wpm >= targetWpm) return 3;
  if (acc >= 93) return 2;
  if (acc >= 85) return 1;
  return 1;
}

// ── FULL CURRICULUM NODES ───────────────────────────────────────────
export const LESSONS: AcademyLesson[] = [
  // ── TRACK 1: FOUNDATIONS (BIOMECHANIC ANCHORS) ──
  {
    id: 'fn_home_anchors',
    title: 'Home Row Anchors',
    category: 'foundations',
    description: 'Establish sensory touch on the F and J tactile bumps and rest positions.',
    prerequisites: [],
    targetWpm: 20,
    xpReward: 60,
    steps: [
      { targetKey: 'f', finger: 'left-index',   instruction: 'Feel the tactile bump on F with your left index finger. Press it.' },
      { targetKey: 'j', finger: 'right-index',  instruction: 'Feel the tactile bump on J with your right index finger. Press it.' },
      { targetKey: 'd', finger: 'left-middle',  instruction: 'Rest left middle finger on D. Press it.' },
      { targetKey: 'k', finger: 'right-middle', instruction: 'Rest right middle finger on K. Press it.' },
      { targetKey: 's', finger: 'left-ring',    instruction: 'Rest left ring finger on S. Press it.' },
      { targetKey: 'l', finger: 'right-ring',   instruction: 'Rest right ring finger on L. Press it.' },
      { targetKey: 'a', finger: 'left-pinky',   instruction: 'Rest left pinky on A. Press it.' },
      { targetKey: ';', finger: 'right-pinky',  instruction: 'Rest right pinky on semicolon (;). Press it.' },
      { targetKey: 'f', finger: 'left-index',   instruction: 'Return to F anchor.' },
      { targetKey: 'j', finger: 'right-index',  instruction: 'Return to J anchor.' },
    ],
  },
  {
    id: 'fn_home_drill',
    title: 'Muscle Memory Drill',
    category: 'foundations',
    description: 'Rapid reflex training across all 8 home row positions without looking down.',
    prerequisites: ['fn_home_anchors'],
    targetWpm: 28,
    xpReward: 80,
    steps: [
      { targetKey: 'a', finger: 'left-pinky',   instruction: 'A — left pinky' },
      { targetKey: 's', finger: 'left-ring',    instruction: 'S — left ring' },
      { targetKey: 'd', finger: 'left-middle',  instruction: 'D — left middle' },
      { targetKey: 'f', finger: 'left-index',   instruction: 'F — left index' },
      { targetKey: 'j', finger: 'right-index',  instruction: 'J — right index' },
      { targetKey: 'k', finger: 'right-middle', instruction: 'K — right middle' },
      { targetKey: 'l', finger: 'right-ring',   instruction: 'L — right ring' },
      { targetKey: ';', finger: 'right-pinky',  instruction: '; — right pinky' },
      { targetKey: 'l', finger: 'right-ring',   instruction: 'L again' },
      { targetKey: 'k', finger: 'right-middle', instruction: 'K' },
      { targetKey: 'j', finger: 'right-index',  instruction: 'J' },
      { targetKey: 'f', finger: 'left-index',   instruction: 'F' },
      { targetKey: 'd', finger: 'left-middle',  instruction: 'D' },
      { targetKey: 's', finger: 'left-ring',    instruction: 'S' },
      { targetKey: 'a', finger: 'left-pinky',   instruction: 'A' },
    ],
  },
  {
    id: 'fn_space_cadence',
    title: 'Spacebar Cadence & Thumbs',
    category: 'foundations',
    description: 'Develop alternating thumb strikes on the spacebar between keystrokes.',
    prerequisites: ['fn_home_drill'],
    targetWpm: 32,
    xpReward: 90,
    steps: [
      { targetKey: 'f', finger: 'left-index',   instruction: 'F — left index' },
      { targetKey: ' ', finger: 'thumb',        instruction: 'SPACE — right thumb' },
      { targetKey: 'j', finger: 'right-index',  instruction: 'J — right index' },
      { targetKey: ' ', finger: 'thumb',        instruction: 'SPACE' },
      { targetKey: 'd', finger: 'left-middle',  instruction: 'D' },
      { targetKey: 'k', finger: 'right-middle', instruction: 'K' },
      { targetKey: ' ', finger: 'thumb',        instruction: 'SPACE' },
      { targetKey: 'a', finger: 'left-pinky',   instruction: 'A' },
      { targetKey: 'l', finger: 'right-ring',   instruction: 'L' },
      { targetKey: ' ', finger: 'thumb',        instruction: 'SPACE to lock the rhythm' },
    ],
  },
  {
    id: 'fn_boss_trial',
    title: '👑 Boss Gauntlet: Home Anchor Trial',
    category: 'foundations',
    description: 'High-stakes trial: Maintain 94%+ accuracy across 20 rapid home-row inputs.',
    prerequisites: ['fn_space_cadence'],
    targetWpm: 35,
    xpReward: 200,
    isBossNode: true,
    bossThresholds: { minAccuracy: 94, minWpm: 25 },
    steps: [
      { targetKey: 'a', finger: 'left-pinky',   instruction: 'A' },
      { targetKey: 'l', finger: 'right-ring',   instruction: 'L' },
      { targetKey: 'l', finger: 'right-ring',   instruction: 'L (Spells: ALL)' },
      { targetKey: ' ', finger: 'thumb',        instruction: 'SPACE' },
      { targetKey: 'a', finger: 'left-pinky',   instruction: 'A' },
      { targetKey: 's', finger: 'left-ring',    instruction: 'S' },
      { targetKey: 'k', finger: 'right-middle', instruction: 'K (Spells: ASK)' },
      { targetKey: ' ', finger: 'thumb',        instruction: 'SPACE' },
      { targetKey: 'f', finger: 'left-index',   instruction: 'F' },
      { targetKey: 'a', finger: 'left-pinky',   instruction: 'A' },
      { targetKey: 'l', finger: 'right-ring',   instruction: 'L' },
      { targetKey: 'l', finger: 'right-ring',   instruction: 'L (Spells: FALL)' },
      { targetKey: ' ', finger: 'thumb',        instruction: 'SPACE' },
      { targetKey: 's', finger: 'left-ring',    instruction: 'S' },
      { targetKey: 'a', finger: 'left-pinky',   instruction: 'A' },
      { targetKey: 'd', finger: 'left-middle',  instruction: 'D (Spells: SAD)' },
    ],
  },

  // ── TRACK 2: ROW REACHES (TOP & BOTTOM ROW DIAGONALS) ──
  {
    id: 'rc_top_left',
    title: 'Top Row — Left Extension',
    category: 'reaches',
    description: 'Reach up from the home row with your left hand (Q, W, E, R, T).',
    prerequisites: ['fn_boss_trial'],
    targetWpm: 30,
    xpReward: 100,
    steps: [
      { targetKey: 'f', finger: 'left-index',   instruction: 'Home: F' },
      { targetKey: 'r', finger: 'left-index',   instruction: 'Reach UP with left index → R' },
      { targetKey: 'f', finger: 'left-index',   instruction: 'Return to F' },
      { targetKey: 't', finger: 'left-index',   instruction: 'Reach UP-RIGHT with left index → T' },
      { targetKey: 'f', finger: 'left-index',   instruction: 'Return to F' },
      { targetKey: 'd', finger: 'left-middle',  instruction: 'Home: D' },
      { targetKey: 'e', finger: 'left-middle',  instruction: 'Reach UP with left middle → E' },
      { targetKey: 'd', finger: 'left-middle',  instruction: 'Return to D' },
      { targetKey: 's', finger: 'left-ring',    instruction: 'Home: S' },
      { targetKey: 'w', finger: 'left-ring',    instruction: 'Reach UP with left ring → W' },
      { targetKey: 's', finger: 'left-ring',    instruction: 'Return to S' },
      { targetKey: 'a', finger: 'left-pinky',   instruction: 'Home: A' },
      { targetKey: 'q', finger: 'left-pinky',   instruction: 'Reach UP with left pinky → Q' },
    ],
  },
  {
    id: 'rc_top_right',
    title: 'Top Row — Right Extension',
    category: 'reaches',
    description: 'Reach up from the home row with your right hand (Y, U, I, O, P).',
    prerequisites: ['rc_top_left'],
    targetWpm: 32,
    xpReward: 100,
    steps: [
      { targetKey: 'j', finger: 'right-index',  instruction: 'Home: J' },
      { targetKey: 'u', finger: 'right-index',  instruction: 'Reach UP with right index → U' },
      { targetKey: 'j', finger: 'right-index',  instruction: 'Return to J' },
      { targetKey: 'y', finger: 'right-index',  instruction: 'Reach UP-LEFT with right index → Y' },
      { targetKey: 'j', finger: 'right-index',  instruction: 'Return to J' },
      { targetKey: 'k', finger: 'right-middle', instruction: 'Home: K' },
      { targetKey: 'i', finger: 'right-middle', instruction: 'Reach UP with right middle → I' },
      { targetKey: 'k', finger: 'right-middle', instruction: 'Return to K' },
      { targetKey: 'l', finger: 'right-ring',   instruction: 'Home: L' },
      { targetKey: 'o', finger: 'right-ring',   instruction: 'Reach UP with right ring → O' },
      { targetKey: 'l', finger: 'right-ring',   instruction: 'Return to L' },
      { targetKey: 'p', finger: 'right-pinky',  instruction: 'Reach UP with right pinky → P' },
    ],
  },
  {
    id: 'rc_bottom_row',
    title: 'Bottom Row Precision',
    category: 'reaches',
    description: 'Reach down with precision (Z, X, C, V, B, N, M, comma, period).',
    prerequisites: ['rc_top_right'],
    targetWpm: 30,
    xpReward: 120,
    steps: [
      { targetKey: 'f', finger: 'left-index',   instruction: 'F' },
      { targetKey: 'v', finger: 'left-index',   instruction: 'Reach DOWN with left index → V' },
      { targetKey: 'b', finger: 'left-index',   instruction: 'Reach DOWN-RIGHT with left index → B' },
      { targetKey: 'd', finger: 'left-middle',  instruction: 'D' },
      { targetKey: 'c', finger: 'left-middle',  instruction: 'Reach DOWN with left middle → C' },
      { targetKey: 's', finger: 'left-ring',    instruction: 'S' },
      { targetKey: 'x', finger: 'left-ring',    instruction: 'Reach DOWN with left ring → X' },
      { targetKey: 'a', finger: 'left-pinky',   instruction: 'A' },
      { targetKey: 'z', finger: 'left-pinky',   instruction: 'Reach DOWN with left pinky → Z' },
      { targetKey: 'j', finger: 'right-index',  instruction: 'J' },
      { targetKey: 'm', finger: 'right-index',  instruction: 'Reach DOWN with right index → M' },
      { targetKey: 'n', finger: 'right-index',  instruction: 'Reach DOWN-LEFT with right index → N' },
    ],
  },
  {
    id: 'rc_boss_trial',
    title: '👑 Boss Gauntlet: Row Reach Master',
    category: 'reaches',
    description: 'High-speed vertical crossing trial testing rapid top-to-bottom stretches.',
    prerequisites: ['rc_bottom_row'],
    targetWpm: 40,
    xpReward: 250,
    isBossNode: true,
    bossThresholds: { minAccuracy: 95, minWpm: 30 },
    steps: [
      { targetKey: 'q', finger: 'left-pinky',   instruction: 'Q' },
      { targetKey: 'u', finger: 'right-index',  instruction: 'U' },
      { targetKey: 'i', finger: 'right-middle', instruction: 'I' },
      { targetKey: 'c', finger: 'left-middle',  instruction: 'C' },
      { targetKey: 'k', finger: 'right-middle', instruction: 'K (QUICK)' },
      { targetKey: ' ', finger: 'thumb',        instruction: 'SPACE' },
      { targetKey: 'b', finger: 'left-index',   instruction: 'B' },
      { targetKey: 'r', finger: 'left-index',   instruction: 'R' },
      { targetKey: 'o', finger: 'right-ring',   instruction: 'O' },
      { targetKey: 'w', finger: 'left-ring',    instruction: 'W' },
      { targetKey: 'n', finger: 'right-index',  instruction: 'N (BROWN)' },
      { targetKey: ' ', finger: 'thumb',        instruction: 'SPACE' },
      { targetKey: 'f', finger: 'left-index',   instruction: 'F' },
      { targetKey: 'o', finger: 'right-ring',   instruction: 'O' },
      { targetKey: 'x', finger: 'left-ring',    instruction: 'X (FOX)' },
    ],
  },

  // ── TRACK 3: N-GRAM FLUENCY (TOP FREQUENT ENGLISH CLUSTERS) ──
  {
    id: 'fl_ngrams_primary',
    title: 'Core N-Grams (TH, HE, IN, ER)',
    category: 'fluency',
    description: 'Master the top 4 most frequent digraphs in English literature and prose.',
    prerequisites: ['rc_boss_trial'],
    targetWpm: 42,
    xpReward: 140,
    steps: [
      { targetKey: 't', finger: 'left-index',   instruction: 'T — left index' },
      { targetKey: 'h', finger: 'right-index',  instruction: 'H — right index (TH)' },
      { targetKey: 'e', finger: 'left-middle',  instruction: 'E — left middle (THE)' },
      { targetKey: ' ', finger: 'thumb',        instruction: 'SPACE' },
      { targetKey: 'h', finger: 'right-index',  instruction: 'H' },
      { targetKey: 'e', finger: 'left-middle',  instruction: 'E (HE)' },
      { targetKey: 'r', finger: 'left-index',   instruction: 'R' },
      { targetKey: 'e', finger: 'left-middle',  instruction: 'E (HERE)' },
      { targetKey: ' ', finger: 'thumb',        instruction: 'SPACE' },
      { targetKey: 'i', finger: 'right-middle', instruction: 'I' },
      { targetKey: 'n', finger: 'right-index',  instruction: 'N (IN)' },
      { targetKey: 't', finger: 'left-index',   instruction: 'T' },
      { targetKey: 'o', finger: 'right-ring',   instruction: 'O (INTO)' },
    ],
  },
  {
    id: 'fl_ngrams_secondary',
    title: 'Trigrams (AND, ING, ENT, TION)',
    category: 'fluency',
    description: 'Fluid muscle chaining across common English word endings and conjunctions.',
    prerequisites: ['fl_ngrams_primary'],
    targetWpm: 46,
    xpReward: 160,
    steps: [
      { targetKey: 'a', finger: 'left-pinky',   instruction: 'A' },
      { targetKey: 'n', finger: 'right-index',  instruction: 'N' },
      { targetKey: 'd', finger: 'left-middle',  instruction: 'D (AND)' },
      { targetKey: ' ', finger: 'thumb',        instruction: 'SPACE' },
      { targetKey: 'r', finger: 'left-index',   instruction: 'R' },
      { targetKey: 'i', finger: 'right-middle', instruction: 'I' },
      { targetKey: 'n', finger: 'right-index',  instruction: 'N' },
      { targetKey: 'g', finger: 'left-index',   instruction: 'G (RING)' },
      { targetKey: ' ', finger: 'thumb',        instruction: 'SPACE' },
      { targetKey: 'm', finger: 'right-index',  instruction: 'M' },
      { targetKey: 'e', finger: 'left-middle',  instruction: 'E' },
      { targetKey: 'n', finger: 'right-index',  instruction: 'N' },
      { targetKey: 't', finger: 'left-index',   instruction: 'T (MENT)' },
    ],
  },
  {
    id: 'fl_boss_trial',
    title: '👑 Boss Gauntlet: N-Gram Stream',
    category: 'fluency',
    description: 'High-speed cluster trial: Maintain 95%+ accuracy at 45+ WPM on rapid n-grams.',
    prerequisites: ['fl_ngrams_secondary'],
    targetWpm: 50,
    xpReward: 300,
    isBossNode: true,
    bossThresholds: { minAccuracy: 95, minWpm: 40 },
    steps: [
      { targetKey: 't', finger: 'left-index',   instruction: 'T' },
      { targetKey: 'h', finger: 'right-index',  instruction: 'H' },
      { targetKey: 'e', finger: 'left-middle',  instruction: 'E' },
      { targetKey: 'r', finger: 'left-index',   instruction: 'R' },
      { targetKey: 'e', finger: 'left-middle',  instruction: 'E (THERE)' },
      { targetKey: ' ', finger: 'thumb',        instruction: 'SPACE' },
      { targetKey: 'f', finger: 'left-index',   instruction: 'F' },
      { targetKey: 'l', finger: 'right-ring',   instruction: 'L' },
      { targetKey: 'o', finger: 'right-ring',   instruction: 'O' },
      { targetKey: 'w', finger: 'left-ring',    instruction: 'W' },
      { targetKey: 'i', finger: 'right-middle', instruction: 'I' },
      { targetKey: 'n', finger: 'right-index',  instruction: 'N' },
      { targetKey: 'g', finger: 'left-index',   instruction: 'G (FLOWING)' },
    ],
  },

  // ── TRACK 4: CADENCE & BURST (RHYTHM & STEADY SPEED) ──
  {
    id: 'cd_rhythm_flow',
    title: 'Cadence Stabilization',
    category: 'cadence',
    description: 'Eliminate hesitation gaps with steady metronomic keystroke spacing.',
    prerequisites: ['fl_boss_trial'],
    targetWpm: 52,
    xpReward: 180,
    steps: [
      { targetKey: 's', finger: 'left-ring',    instruction: 'S' },
      { targetKey: 't', finger: 'left-index',   instruction: 'T' },
      { targetKey: 'e', finger: 'left-middle',  instruction: 'E' },
      { targetKey: 'a', finger: 'left-pinky',   instruction: 'A' },
      { targetKey: 'd', finger: 'left-middle',  instruction: 'D' },
      { targetKey: 'y', finger: 'right-index',  instruction: 'Y (STEADY)' },
      { targetKey: ' ', finger: 'thumb',        instruction: 'SPACE' },
      { targetKey: 'r', finger: 'left-index',   instruction: 'R' },
      { targetKey: 'h', finger: 'right-index',  instruction: 'H' },
      { targetKey: 'y', finger: 'right-index',  instruction: 'Y' },
      { targetKey: 't', finger: 'left-index',   instruction: 'T' },
      { targetKey: 'h', finger: 'right-index',  instruction: 'H' },
      { targetKey: 'm', finger: 'right-index',  instruction: 'M (RHYTHM)' },
    ],
  },
  {
    id: 'cd_burst_speed',
    title: 'Burst Velocity Springs',
    category: 'cadence',
    description: 'Fast burst sprints across short common words with instant recovery.',
    prerequisites: ['cd_rhythm_flow'],
    targetWpm: 60,
    xpReward: 200,
    steps: [
      { targetKey: 'f', finger: 'left-index',   instruction: 'F' },
      { targetKey: 'a', finger: 'left-pinky',   instruction: 'A' },
      { targetKey: 's', finger: 'left-ring',    instruction: 'S' },
      { targetKey: 't', finger: 'left-index',   instruction: 'T' },
      { targetKey: ' ', finger: 'thumb',        instruction: 'SPACE' },
      { targetKey: 'w', finger: 'left-ring',    instruction: 'W' },
      { targetKey: 'i', finger: 'right-middle', instruction: 'I' },
      { targetKey: 'n', finger: 'right-index',  instruction: 'N' },
      { targetKey: 'g', finger: 'left-index',   instruction: 'G' },
      { targetKey: 's', finger: 'left-ring',    instruction: 'S' },
    ],
  },
  {
    id: 'cd_boss_trial',
    title: '👑 Boss Gauntlet: Cadence Architect',
    category: 'cadence',
    description: 'Sustain unbroken rhythm across 25 dynamic characters with 0 pauses.',
    prerequisites: ['cd_burst_speed'],
    targetWpm: 65,
    xpReward: 350,
    isBossNode: true,
    bossThresholds: { minAccuracy: 96, minWpm: 50 },
    steps: [
      { targetKey: 'p', finger: 'right-pinky',  instruction: 'P' },
      { targetKey: 'e', finger: 'left-middle',  instruction: 'E' },
      { targetKey: 'r', finger: 'left-index',   instruction: 'R' },
      { targetKey: 'f', finger: 'left-index',   instruction: 'F' },
      { targetKey: 'e', finger: 'left-middle',  instruction: 'E' },
      { targetKey: 'c', finger: 'left-middle',  instruction: 'C' },
      { targetKey: 't', finger: 'left-index',   instruction: 'T' },
      { targetKey: ' ', finger: 'thumb',        instruction: 'SPACE' },
      { targetKey: 't', finger: 'left-index',   instruction: 'T' },
      { targetKey: 'i', finger: 'right-middle', instruction: 'I' },
      { targetKey: 'm', finger: 'right-index',  instruction: 'M' },
      { targetKey: 'i', finger: 'right-middle', instruction: 'I' },
      { targetKey: 'n', finger: 'right-index',  instruction: 'N' },
      { targetKey: 'g', finger: 'left-index',   instruction: 'G' },
    ],
  },

  // ── TRACK 5: PROSE & LITERATURE (GRANDMASTER ENDURANCE) ──
  {
    id: 'ms_classic_prose',
    title: 'Classic Literature Flow',
    category: 'mastery',
    description: 'Type sustained classic prose passages with complex punctuation.',
    prerequisites: ['cd_boss_trial'],
    targetWpm: 65,
    xpReward: 250,
    steps: [
      { targetKey: 'i', finger: 'right-middle', instruction: 'I' },
      { targetKey: 't', finger: 'left-index',   instruction: 'T' },
      { targetKey: ' ', finger: 'thumb',        instruction: 'SPACE' },
      { targetKey: 'w', finger: 'left-ring',    instruction: 'W' },
      { targetKey: 'a', finger: 'left-pinky',   instruction: 'A' },
      { targetKey: 's', finger: 'left-ring',    instruction: 'S' },
      { targetKey: ' ', finger: 'thumb',        instruction: 'SPACE' },
      { targetKey: 't', finger: 'left-index',   instruction: 'T' },
      { targetKey: 'h', finger: 'right-index',  instruction: 'H' },
      { targetKey: 'e', finger: 'left-middle',  instruction: 'E' },
      { targetKey: ' ', finger: 'thumb',        instruction: 'SPACE' },
      { targetKey: 'b', finger: 'left-index',   instruction: 'B' },
      { targetKey: 'e', finger: 'left-middle',  instruction: 'E' },
      { targetKey: 's', finger: 'left-ring',    instruction: 'S' },
      { targetKey: 't', finger: 'left-index',   instruction: 'T' },
    ],
  },
  {
    id: 'ms_grandmaster_boss',
    title: '👑 Ultimate Boss: Ghost Operator Trial',
    category: 'mastery',
    description: 'The pinnacle Academy trial: Maintain 97%+ accuracy at 70+ WPM on complex prose.',
    prerequisites: ['ms_classic_prose'],
    targetWpm: 75,
    xpReward: 500,
    isBossNode: true,
    bossThresholds: { minAccuracy: 97, minWpm: 65 },
    steps: [
      { targetKey: 'n', finger: 'right-index',  instruction: 'N' },
      { targetKey: 'e', finger: 'left-middle',  instruction: 'E' },
      { targetKey: 'u', finger: 'right-index',  instruction: 'U' },
      { targetKey: 'r', finger: 'left-index',   instruction: 'R' },
      { targetKey: 'a', finger: 'left-pinky',   instruction: 'A' },
      { targetKey: 'l', finger: 'right-ring',   instruction: 'L' },
      { targetKey: ' ', finger: 'thumb',        instruction: 'SPACE' },
      { targetKey: 'm', finger: 'right-index',  instruction: 'M' },
      { targetKey: 'a', finger: 'left-pinky',   instruction: 'A' },
      { targetKey: 's', finger: 'left-ring',    instruction: 'S' },
      { targetKey: 't', finger: 'left-index',   instruction: 'T' },
      { targetKey: 'e', finger: 'left-middle',  instruction: 'E' },
      { targetKey: 'r', finger: 'left-index',   instruction: 'R' },
      { targetKey: 'y', finger: 'right-index',  instruction: 'Y' },
    ],
  },
];

