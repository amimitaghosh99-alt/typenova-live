/**
 * React owner for the word-weakness map. The heavy lifting is pure
 * (`lib/wordWeakness.ts`); this hook only holds state, persists it, and
 * re-reads it when the cloud sync rewrites localStorage underneath us.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  WORD_WEAKNESS_KEY,
  normalizeWordWeakness,
  recordRun,
  gradeDrillRun,
  dueWords,
  weakestWords,
  type WordWeaknessMap,
  type RunWordAggregate,
} from '@/lib/wordWeakness';
import { todayKey } from '@/utils/seededRandom';
import { PROGRESS_HYDRATED, onSyncEvent } from '@/lib/syncEvents';

export function useWordWeakness() {
  const [map, setMap] = useState<WordWeaknessMap>(() => {
    try {
      return normalizeWordWeakness(JSON.parse(localStorage.getItem(WORD_WEAKNESS_KEY) || 'null'));
    } catch {
      return {};
    }
  });

  /** Refreshed on hydration so a cross-midnight session grades into the right day. */
  const [today, setToday] = useState(() => todayKey());

  // Persist on every change. `recordRun`/`gradeDrillRun` already enforce the
  // store cap, so this payload stays bounded.
  useEffect(() => {
    try { localStorage.setItem(WORD_WEAKNESS_KEY, JSON.stringify(map)); } catch { /* quota / disabled */ }
  }, [map]);

  // `writeLocalProgress` rewrites this key from the merged cloud snapshot and
  // then emits PROGRESS_HYDRATED — same ownership pattern as the Academy
  // records, which also live in a hook mounted elsewhere.
  useEffect(() => {
    const reread = () => {
      try {
        setMap(normalizeWordWeakness(JSON.parse(localStorage.getItem(WORD_WEAKNESS_KEY) || 'null')));
        setToday(todayKey());
      } catch { /* non-fatal */ }
    };
    return onSyncEvent(PROGRESS_HYDRATED, reread);
  }, []);

  const recordRunAggregates = useCallback((aggregates: RunWordAggregate[]) => {
    setMap(prev => recordRun(prev, aggregates, todayKey()));
  }, []);

  const gradeDrill = useCallback((drillWords: string[], errorPerWord: Record<string, boolean>) => {
    setMap(prev => gradeDrillRun(prev, drillWords, errorPerWord, todayKey()));
  }, []);

  const clearAll = useCallback(() => setMap({}), []);

  const due = useMemo(() => dueWords(map, today), [map, today]);
  const weakest = useMemo(() => weakestWords(map, 10), [map]);

  return {
    map,
    /** Words due for review now, weakest box first. */
    due,
    dueCount: due.length,
    /** Worst tracked words by error rate (up to 10). */
    weakest,
    recordRun: recordRunAggregates,
    gradeDrill,
    clearAll,
  };
}
