import { useState, useEffect, useCallback, useRef } from 'react';
import { readLocalProgress, writeLocalProgress, type Quest, type QuestsState } from '@/lib/progress';

// Helper to get today's date in YYYY-MM-DD
function getTodayString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

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
  // Shuffle templates
  const shuffled = [...QUEST_TEMPLATES].sort(() => 0.5 - Math.random());
  // Pick 3 unique quests
  const selected = shuffled.slice(0, 3);
  
  return {
    lastReset: getTodayString(),
    active: selected.map((t, i) => ({
      id: `quest_${getTodayString()}_${i}`,
      type: t.type,
      target: t.target,
      progress: 0,
      completed: false,
      xpReward: t.xpReward
    }))
  };
}

export function useQuests(grantXp?: (amount: number) => void) {
  const [questsState, setQuestsState] = useState<QuestsState | null>(null);
  const questsRef = useRef(questsState);
  useEffect(() => { questsRef.current = questsState; }, [questsState]);

  // Load and generate quests on mount
  useEffect(() => {
    const progress = readLocalProgress();
    const today = getTodayString();
    
    if (!progress.quests || progress.quests.lastReset !== today) {
      const newQuests = generateDailyQuests();
      setQuestsState(newQuests);
      progress.quests = newQuests;
      writeLocalProgress(progress);
    } else {
      setQuestsState(progress.quests);
    }
  }, []);

  const progressQuest = useCallback((type: Quest['type'], value: number) => {
    const prev = questsRef.current;
    if (!prev) return;
    let totalXpGained = 0;
    let changed = false;

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
          totalXpGained += q.xpReward;
        }
        return { ...q, progress: newProgress, completed };
      }
      return q;
    });

    if (!changed) return;
    const newState = { ...prev, active: newActive };
    setQuestsState(newState);

    const progress = readLocalProgress();
    progress.quests = newState;
    writeLocalProgress(progress);
    if (totalXpGained > 0 && grantXp) grantXp(totalXpGained);
  }, [grantXp]);

  return { questsState, progressQuest };
}
