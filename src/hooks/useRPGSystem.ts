import { useState, useCallback, useEffect } from 'react';
import { ACHIEVEMENTS } from '@/data/constants';
import type { Achievement } from '@/data/constants';

const STORAGE_KEYS = {
  xp: 'typezen_xp',
  tests: 'typezen_tests',
  achievements: 'typezen_achievements',
  heatmap: 'typezen_heatmap',
};

export interface AchievementState {
  queue: Achievement[];
  unlocked: string[];
}

export const useRPGSystem = () => {
  const [xp, setXp] = useState(() => {
    if (typeof window === 'undefined') return 0;
    return parseInt(localStorage.getItem(STORAGE_KEYS.xp) || '0', 10) || 0;
  });
  const [testsCompleted, setTestsCompleted] = useState(() => {
    if (typeof window === 'undefined') return 0;
    return parseInt(localStorage.getItem(STORAGE_KEYS.tests) || '0', 10) || 0;
  });
  const [unlockedAchievements, setUnlockedAchievements] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.achievements) || '[]'); } catch { return []; }
  });
  const [achievementQueue, setAchievementQueue] = useState<Achievement[]>([]);
  const [xpGainedLast, setXpGainedLast] = useState(0);
  const [leveledUp, setLeveledUp] = useState(false);
  const [heatmapData, setHeatmapData] = useState<Record<string, { total: number; errors: number }>>(() => {
    if (typeof window === 'undefined') return {};
    try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.heatmap) || '{}'); } catch { return {}; }
  });

  // Persist to localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.xp, xp.toString());
    localStorage.setItem(STORAGE_KEYS.tests, testsCompleted.toString());
    localStorage.setItem(STORAGE_KEYS.achievements, JSON.stringify(unlockedAchievements));
  }, [xp, testsCompleted, unlockedAchievements]);

  // Achievement toast auto-dismiss
  useEffect(() => {
    if (achievementQueue.length === 0) return;
    const timer = setTimeout(() => setAchievementQueue(prev => prev.slice(1)), 4000);
    return () => clearTimeout(timer);
  }, [achievementQueue]);

  const userLevel = Math.floor(Math.sqrt(xp / 100)) + 1;
  const nextLevelXp = Math.pow(userLevel, 2) * 100;
  const currentLevelProgress = xp - Math.pow(userLevel - 1, 2) * 100;
  const xpNeeded = nextLevelXp - Math.pow(userLevel - 1, 2) * 100;

  const processRPG = useCallback((
    finalWpm: number,
    finalAcc: number,
    _currentMaxCombo: number,
    _wordCount: number,
    targetTextLength: number,
    microDrillActive: boolean,
    keystrokeLog: Array<{ expected: string; isError: boolean; isBackspace?: boolean }>,
    onLevelUp: () => void
  ) => {
    const newTestsCompleted = testsCompleted + 1;
    setTestsCompleted(newTestsCompleted);

    // Update heatmap (backspace events carry no expected char — skip them)
    setHeatmapData(prev => {
      const next = { ...prev };
      keystrokeLog.forEach(k => {
        if (k.isBackspace) return;
        const char = k.expected === ' ' ? 'SPACE' : k.expected === '\n' ? 'ENTER' : k.expected.toUpperCase();
        if (!next[char]) next[char] = { total: 0, errors: 0 };
        next[char] = { total: next[char].total + 1, errors: next[char].errors + (k.isError ? 1 : 0) };
      });
      localStorage.setItem(STORAGE_KEYS.heatmap, JSON.stringify(next));
      return next;
    });

    // Calculate XP
    let newXp = xp;
    if (finalWpm > 10 && finalAcc > 50 && !microDrillActive) {
      const lengthMod = targetTextLength / 100;
      const gained = Math.floor(finalWpm * (finalAcc / 100) * lengthMod * 2);
      setXpGainedLast(gained);
      newXp = xp + gained;
      const oldLevel = Math.floor(Math.sqrt(xp / 100)) + 1;
      const newLevel = Math.floor(Math.sqrt(newXp / 100)) + 1;
      setXp(newXp);
      if (newLevel > oldLevel) {
        setLeveledUp(true);
        onLevelUp();
      }
    }

    return { newXp, newTestsCompleted };
  }, [xp, testsCompleted]);

  const checkAchievements = useCallback((
    finalWpm: number,
    finalAcc: number,
    currentMaxCombo: number,
    currentXp: number,
    wordCount: number,
    suddenDeath: boolean,
    blindMode: boolean,
    fogMode: boolean,
    overclockedMode: boolean,
    testsCount: number,
    seenThemesCount: number,
    totalThemes: number,
    isTimed: boolean = false,
    dailyStreak: number = 0
  ) => {
    const newlyUnlocked: string[] = [];
    const check = (id: string) => !unlockedAchievements.includes(id);
    const unlock = (id: string) => {
      if (!newlyUnlocked.includes(id)) newlyUnlocked.push(id);
    };

    if (check('speed_demon') && finalWpm >= 100) unlock('speed_demon');
    if (check('hyperspace') && finalWpm >= 140) unlock('hyperspace');
    if (check('sniper') && wordCount >= 50 && finalAcc === 100) unlock('sniper');
    if (check('unbreakable') && currentMaxCombo >= 200) unlock('unbreakable');
    if (check('time_lord') && isTimed && finalWpm >= 100) unlock('time_lord');
    if (check('daredevil') && suddenDeath) unlock('daredevil');
    if (check('jedi_senses') && blindMode && fogMode) unlock('jedi_senses');
    if (check('under_pressure') && overclockedMode && finalAcc > 95) unlock('under_pressure');
    if (check('masochist') && suddenDeath && overclockedMode && blindMode && fogMode) unlock('masochist');

    const newLevel = Math.floor(Math.sqrt(currentXp / 100)) + 1;
    if (check('apprentice') && newLevel >= 5) unlock('apprentice');
    if (check('grandmaster') && newLevel >= 20) unlock('grandmaster');
    if (check('fashionista') && seenThemesCount >= totalThemes) unlock('fashionista');
    if (check('keyboard_warrior') && testsCount >= 100) unlock('keyboard_warrior');
    if (check('daily_devotee') && dailyStreak >= 7) unlock('daily_devotee');

    const totalSet = new Set([...unlockedAchievements, ...newlyUnlocked]);
    if (check('cyber_ninja') && totalSet.has('speed_demon') && totalSet.has('jedi_senses')) unlock('cyber_ninja');
    if (check('perfectionist') && totalSet.has('sniper') && totalSet.has('unbreakable')) unlock('perfectionist');
    if (check('type_nova') && totalSet.size >= ACHIEVEMENTS.length) unlock('type_nova');

    if (newlyUnlocked.length > 0) {
      setUnlockedAchievements(prev => [...prev, ...newlyUnlocked]);
      newlyUnlocked.forEach(id => {
        const ach = ACHIEVEMENTS.find(a => a.id === id);
        if (ach) setAchievementQueue(prev => [...prev, ach]);
      });
    }
  }, [unlockedAchievements]);

  const resetRPGFlags = useCallback(() => {
    setXpGainedLast(0);
    setLeveledUp(false);
  }, []);

  // Replace in-memory progress with a merged snapshot (used by cloud sync on
  // login). localStorage is written separately by the progress layer; this
  // just refreshes the React state that the UI reads. Heatmap is set directly
  // (the persist effect above only covers xp/tests/achievements).
  const hydrate = useCallback((snapshot: {
    xp: number;
    tests: number;
    achievements: string[];
    heatmap: Record<string, { total: number; errors: number }>;
  }) => {
    setXp(snapshot.xp);
    setTestsCompleted(snapshot.tests);
    setUnlockedAchievements(snapshot.achievements);
    setHeatmapData(snapshot.heatmap);
  }, []);

  const unlockAllAchievements = useCallback(() => {
    setUnlockedAchievements(ACHIEVEMENTS.map(a => a.id));
    setAchievementQueue(prev => [...prev, { id: 'cheat', title: 'GOD MODE: All Unlocked!', desc: '', icon: 'unlock', category: 'SUPER' }]);
  }, []);

  const resetAllProgress = useCallback(() => {
    setUnlockedAchievements([]);
    setXp(0);
    setTestsCompleted(0);
    setAchievementQueue(prev => [...prev, { id: 'reset', title: 'All Progress Reset', desc: '', icon: 'rotate-ccw', category: 'SUPER' }]);
  }, []);

  return {
    xp, setXp,
    testsCompleted,
    unlockedAchievements,
    achievementQueue,
    xpGainedLast,
    leveledUp,
    heatmapData,
    userLevel,
    nextLevelXp,
    currentLevelProgress,
    xpNeeded,
    processRPG,
    checkAchievements,
    resetRPGFlags,
    unlockAllAchievements,
    resetAllProgress,
    hydrate,
  };
};
