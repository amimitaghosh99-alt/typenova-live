import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { readLocalProgress, writeLocalProgress, type Quest, type QuestsState } from '@/lib/progress';
import { todayKey, daySeed, mulberry32 } from '@/utils/seededRandom';

const QUEST_TEMPLATES = [
  { type: 'races_won', target: 3, xpReward: 1500 },
  { type: 'races_won', target: 5, xpReward: 3000 },
  { type: 'words_typed', target: 500, xpReward: 1000 },
  { type: 'words_typed', target: 1000, xpReward: 2500 },
  { type: 'wpm_achieved', target: 80, xpReward: 500 },
  { type: 'wpm_achieved', target: 100, xpReward: 1000 },
  { type: 'wpm_achieved', target: 120, xpReward: 2000 },
  { type: 'acc_achieved', target: 98, xpReward: 500 },
  { type: 'acc_achieved', target: 100, xpReward: 1500 },
] as const;

function generateDailyQuests(): QuestsState {
  const rng = mulberry32(daySeed() + 777);
  // Deterministic Fisher-Yates shuffle
  const pool = [...QUEST_TEMPLATES];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  // Pick 3 distinct quest types
  const selected: typeof QUEST_TEMPLATES[number][] = [];
  const usedTypes = new Set<string>();
  for (const t of pool) {
    if (!usedTypes.has(t.type)) {
      selected.push(t);
      usedTypes.add(t.type);
      if (selected.length === 3) break;
    }
  }
  while (selected.length < 3 && selected.length < pool.length) {
    const candidate = pool.find(p => !selected.includes(p));
    if (candidate) selected.push(candidate);
    else break;
  }

  const today = todayKey();
  
  return {
    lastReset: today,
    active: selected.map((t) => ({
      id: `quest_${today}_${t.type}_${t.target}`,
      type: t.type,
      target: t.target,
      progress: 0,
      completed: false,
      xpReward: t.xpReward
    }))
  };
}

export function useQuests(grantXp?: (amount: number) => void, dailyStreak: number = 0) {
  const [questsState, setQuestsState] = useState<QuestsState | null>(null);
  const questsRef = useRef(questsState);
  useEffect(() => { questsRef.current = questsState; }, [questsState]);
  const streakRef = useRef(dailyStreak);
  useEffect(() => { streakRef.current = dailyStreak; }, [dailyStreak]);

  // Load and generate quests on mount
  useEffect(() => {
    const progress = readLocalProgress();
    const today = todayKey();
    
    if (!progress.quests || progress.quests.lastReset !== today) {
      const newQuests = generateDailyQuests();
      setQuestsState(newQuests);
      questsRef.current = newQuests;
      progress.quests = newQuests;
      writeLocalProgress(progress);
    } else {
      setQuestsState(progress.quests);
      questsRef.current = progress.quests;
    }
  }, []);

  // Check for day rollover across midnight when tab gains focus or visibility changes
  useEffect(() => {
    const handleCheckDay = () => {
      const today = todayKey();
      if (questsRef.current && questsRef.current.lastReset !== today) {
        const newQuests = generateDailyQuests();
        setQuestsState(newQuests);
        questsRef.current = newQuests;
        const progress = readLocalProgress();
        progress.quests = newQuests;
        writeLocalProgress(progress);
      }
    };
    window.addEventListener('focus', handleCheckDay);
    document.addEventListener('visibilitychange', handleCheckDay);
    return () => {
      window.removeEventListener('focus', handleCheckDay);
      document.removeEventListener('visibilitychange', handleCheckDay);
    };
  }, []);

  const progressQuest = useCallback((type: Quest['type'], value: number) => {
    const prev = questsRef.current;
    if (!prev || !Array.isArray(prev.active)) return;
    let totalXpGained = 0;
    let changed = false;

    const streakMultiplier = 1 + Math.min(Math.max(0, streakRef.current) * 0.1, 1.0);

    const newActive = prev.active.map(q => {
      if (q.completed || q.type !== type) return q;
      let newProgress = q.progress;
      if (type === 'races_won' || type === 'words_typed') newProgress += value;
      else if (type === 'wpm_achieved' || type === 'acc_achieved') {
        if (value >= q.target) newProgress = q.target;
      }

      if (newProgress !== q.progress) {
        changed = true;
        const completed = newProgress >= q.target;
        if (completed) {
          newProgress = q.target;
          totalXpGained += Math.round(q.xpReward * streakMultiplier);
        }
        return { ...q, progress: newProgress, completed };
      }
      return q;
    });

    if (!changed) return;
    const newState: QuestsState = { ...prev, active: newActive };
    // Synchronously update the ref so consecutive calls in the same JS tick don't read stale state
    questsRef.current = newState;
    setQuestsState(newState);

    const progress = readLocalProgress();
    progress.quests = newState;
    writeLocalProgress(progress);
    if (totalXpGained > 0 && grantXp) grantXp(totalXpGained);
  }, [grantXp]);

  return useMemo(() => ({ questsState, progressQuest }), [questsState, progressQuest]);
}
