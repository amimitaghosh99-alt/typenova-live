export interface TitleBadge {
  id: string;
  name: string;
  description: string;
  category: 'speed' | 'accuracy' | 'endurance' | 'streak' | 'multiplayer';
  /**
   * Key into `lib/titleIcons`, not an emoji.
   *
   * These were emoji until the dossier redesign. An emoji renders in the
   * platform's own font, at its own weight, in its own colours, so the titles
   * sat as full-colour glyphs beside the achievements' stroked Lucide marks and
   * could not take the page's accent or dim when locked. This file stays
   * import-free data; `titleIcon()` resolves the key.
   */
  icon: string;
  color: string;
  isUnlocked: (stats: UserSkillStats) => boolean;
  /**
   * Progress toward the unlock, read by the dossier's title registry so a
   * locked row can show *how close* you are instead of a bare padlock. Reads
   * the same thresholds `isUnlocked` checks — omitted for titles that are
   * granted outright.
   */
  progress?: (stats: UserSkillStats) => { current: number; target: number; unit: string };
}

export interface UserSkillStats {
  maxWpm: number;
  avgAccuracy: number;
  testsCompleted: number;
  dailyStreak: number;
  racesWon: number;
  totalWordsTyped: number;
  bestCombo?: number;
  avgConsistency?: number;
}

export const TITLE_BADGES: TitleBadge[] = [
  {
    id: 'novice',
    name: 'Fledgling Typist',
    description: 'Began the journey on TypeNova.',
    category: 'endurance',
  icon: 'sprout',
    color: 'text-zinc-400 border-zinc-500/30 bg-zinc-500/10',
    isUnlocked: () => true,
  },
  {
    id: 'speed_demon',
    name: 'Speed Demon',
    description: 'Achieve a typing speed of 90+ WPM.',
    category: 'speed',
  icon: 'zap',
    color: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
    isUnlocked: (s) => s.maxWpm >= 90,
    progress: (s) => ({ current: s.maxWpm, target: 90, unit: 'WPM' }),
  },
  {
    id: 'lightning',
    name: 'Lightning Typist',
    description: 'Break the barrier with 120+ WPM.',
    category: 'speed',
  icon: 'cloud-lightning',
    color: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10',
    isUnlocked: (s) => s.maxWpm >= 120,
    progress: (s) => ({ current: s.maxWpm, target: 120, unit: 'WPM' }),
  },
  {
    id: 'warp_speed',
    name: 'Warp Speed',
    description: 'Reach hyper-speed at 150+ WPM.',
    category: 'speed',
  icon: 'rocket',
    color: 'text-purple-400 border-purple-500/30 bg-purple-500/10',
    isUnlocked: (s) => s.maxWpm >= 150,
    progress: (s) => ({ current: s.maxWpm, target: 150, unit: 'WPM' }),
  },
  {
    id: 'precision_master',
    name: 'Precision Master',
    description: 'Maintain 98%+ average accuracy across tests.',
    category: 'accuracy',
  icon: 'target',
    color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
    isUnlocked: (s) => s.avgAccuracy >= 98 && s.testsCompleted >= 5,
    progress: (s) => ({ current: s.avgAccuracy, target: 98, unit: '% ACC' }),
  },
  {
    id: 'centurion',
    name: 'Centurion',
    description: 'Maintain a 100+ flawless combo in any test.',
    category: 'streak',
    icon: 'shield',
    color: 'text-purple-400 border-purple-500/30 bg-purple-500/10',
    isUnlocked: (s) => (s.bestCombo ?? 0) >= 100,
    progress: (s) => ({ current: s.bestCombo ?? 0, target: 100, unit: 'COMBO' }),
  },
  {
    id: 'flow_master',
    name: 'Flow Master',
    description: 'Maintain 85%+ average rhythm consistency.',
    category: 'accuracy',
    icon: 'activity',
    color: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10',
    isUnlocked: (s) => (s.avgConsistency ?? 0) >= 85,
    progress: (s) => ({ current: s.avgConsistency ?? 0, target: 85, unit: '% CONS' }),
  },
  {
    id: 'marathoner',
    name: 'Marathoner',
    description: 'Complete 50 typing tests.',
    category: 'endurance',
  icon: 'footprints',
    color: 'text-sky-400 border-sky-500/30 bg-sky-500/10',
    isUnlocked: (s) => s.testsCompleted >= 50,
    progress: (s) => ({ current: s.testsCompleted, target: 50, unit: 'TESTS' }),
  },
  {
    id: 'iron_will',
    name: 'Iron Will',
    description: 'Complete 200 typing tests.',
    category: 'endurance',
  icon: 'anvil',
    color: 'text-indigo-400 border-indigo-500/30 bg-indigo-500/10',
    isUnlocked: (s) => s.testsCompleted >= 200,
    progress: (s) => ({ current: s.testsCompleted, target: 200, unit: 'TESTS' }),
  },
  {
    id: 'streak_master',
    name: 'Streak Master',
    description: 'Maintain a daily typing streak for 7 consecutive days.',
    category: 'streak',
  icon: 'flame',
    color: 'text-orange-400 border-orange-500/30 bg-orange-500/10',
    isUnlocked: (s) => s.dailyStreak >= 7,
    progress: (s) => ({ current: s.dailyStreak, target: 7, unit: 'DAYS' }),
  },
  {
    id: 'race_champion',
    name: 'Race Champion',
    description: 'Win 5 multiplayer races.',
    category: 'multiplayer',
  icon: 'trophy',
    color: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10',
    isUnlocked: (s) => s.racesWon >= 5,
    progress: (s) => ({ current: s.racesWon, target: 5, unit: 'WINS' }),
  },
  {
    id: 'cyber_patron',
    name: 'Cyber Patron',
    description: 'Elite benefactor fueling TypeNova high-tick servers, multiplayer relays & AI compute.',
    category: 'endurance',
    icon: 'hand-heart',
    color: 'text-rose-300 border-rose-500/50 bg-rose-500/15 shadow-[0_0_20px_rgba(244,63,94,0.4)]',
    isUnlocked: () => true,
  },
  {
    id: 'server_sustainer',
    name: 'Server Sustainer',
    description: 'Tier-2 benefactor powering TypeNova cloud relays, hosting stability & low ping.',
    category: 'endurance',
    icon: 'shield-check',
    color: 'text-sky-300 border-sky-500/50 bg-sky-500/15 shadow-[0_0_20px_rgba(56,189,248,0.4)]',
    isUnlocked: () => true,
  },
  {
    id: 'grand_architect',
    name: 'Grand Architect',
    description: 'Tier-3 benefactor sustaining high-tick cloud multiplayer servers & core engine architecture.',
    category: 'endurance',
    icon: 'crown',
    color: 'text-amber-300 border-amber-500/50 bg-amber-500/15 shadow-[0_0_20px_rgba(245,158,11,0.4)]',
    isUnlocked: () => true,
  },
  {
    id: 'eternal_benefactor',
    name: 'Eternal Benefactor',
    description: 'Celestial-tier benefactor immortalized in TypeNova open source history.',
    category: 'endurance',
    icon: 'sparkles',
    color: 'text-purple-300 border-purple-500/50 bg-purple-500/15 shadow-[0_0_20px_rgba(168,85,247,0.4)]',
    isUnlocked: () => true,
  },
];

const ACTIVE_TITLE_KEY = 'typenova_active_title';

export function getActiveTitleId(): string {
  if (typeof window === 'undefined') return 'novice';
  return localStorage.getItem(ACTIVE_TITLE_KEY) || 'novice';
}

export function setActiveTitleId(titleId: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ACTIVE_TITLE_KEY, titleId);
}
