import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { PaceSample } from '@/components/TypingArea';

/**
 * Per-mode leaderboards and the ghosts behind them ("Ghost Net").
 *
 * `mode_scores` holds one best run per (user, mode), and each row carries the
 * pace curve of that exact run — derived server-side from the keystroke log
 * `submit_score()` already validated. So every row on a mode board is a
 * downloadable opponent, not just a number.
 *
 * The board query deliberately omits the `ghost` column: it is tens of
 * kilobytes per row and is only needed once a specific rival is chosen.
 */

export interface ModeScoreRow {
  user_id: string;
  username: string;
  wpm: number;
  accuracy: number;
  consistency: number | null;
}

export interface RivalGhost {
  userId: string;
  username: string;
  wpm: number;
  samples: PaceSample[];
}

interface GhostRow {
  username: string;
  wpm: number;
  ghost: unknown;
}

/** Reject a malformed or empty curve rather than handing the pacer garbage. */
function parseSamples(raw: unknown): PaceSample[] | null {
  if (!Array.isArray(raw) || raw.length < 2) return null;
  const samples: PaceSample[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') return null;
    const { t, chars } = entry as { t?: unknown; chars?: unknown };
    const tNum = typeof t === 'string' ? Number(t) : t;
    const cNum = typeof chars === 'string' ? Number(chars) : chars;
    if (typeof tNum !== 'number' || !Number.isFinite(tNum)) return null;
    if (typeof cNum !== 'number' || !Number.isFinite(cNum)) return null;
    samples.push({ t: tNum, chars: cNum });
  }
  return samples;
}

/**
 * Load one rival's stored run for a mode.
 * Resolves `null` when the row is gone, the curve is unusable, or the request
 * fails — every caller treats an unavailable ghost as "not selectable".
 */
export async function fetchRivalGhost(
  modeKey: string,
  userId: string,
): Promise<RivalGhost | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('mode_scores')
      .select('username, wpm, ghost')
      .eq('mode_key', modeKey)
      .eq('user_id', userId)
      .maybeSingle();
    if (error || !data) return null;
    const row = data as unknown as GhostRow;
    const samples = parseSamples(row.ghost);
    if (!samples) return null;
    return { userId, username: row.username, wpm: row.wpm, samples };
  } catch (err) {
    console.warn('[ghostNet] rival ghost fetch failed:', err);
    return null;
  }
}

/** Stable identity so a board-less config does not hand consumers a new array. */
const NO_ROWS: ModeScoreRow[] = [];

/**
 * Top runs for a single mode, refetched whenever the mode changes.
 *
 * `mode_scores` is new, so a project that has not run the migration yet returns
 * an error rather than rows. That is reported through `unavailable` so the UI
 * can explain itself instead of showing a permanently empty board.
 *
 * `loading` is derived from which mode the loaded rows belong to rather than
 * stored: a boolean would have to be flipped synchronously inside the fetch
 * effect, which is exactly the cascading-render pattern `set-state-in-effect`
 * warns about. This way the effect only ever sets state after an await.
 */
export function useModeLeaderboard(modeKey: string | null, limit = 5) {
  const [rows, setRows] = useState<ModeScoreRow[]>(NO_ROWS);
  const [unavailable, setUnavailable] = useState(false);
  /** Mode the rows in state describe; null until the first load settles. */
  const [loadedKey, setLoadedKey] = useState<string | null>(null);

  // Guards against a slow response for a previous mode overwriting a newer one.
  const requestRef = useRef(0);

  const load = useCallback(async (key: string) => {
    const client = supabase;
    if (!client) return;
    const token = ++requestRef.current;
    try {
      const { data, error } = await client
        .from('mode_scores')
        .select('user_id, username, wpm, accuracy, consistency')
        .eq('mode_key', key)
        .order('wpm', { ascending: false })
        .limit(limit);
      if (token !== requestRef.current) return;
      if (error) {
        setUnavailable(true);
        setRows(NO_ROWS);
      } else {
        setUnavailable(false);
        setRows((data ?? []) as unknown as ModeScoreRow[]);
      }
    } catch (err) {
      if (token !== requestRef.current) return;
      console.warn('[ghostNet] mode board fetch failed:', err);
      setUnavailable(true);
      setRows(NO_ROWS);
    } finally {
      if (token === requestRef.current) setLoadedKey(key);
    }
  }, [limit]);

  useEffect(() => {
    if (!modeKey) return;
    // `load` only writes state after awaiting the query, so this cannot cascade
    // renders — the rule flags any transitively reachable setState and cannot
    // see the await boundary. Same shape as the fetch effect in useCloudSync.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(modeKey);
  }, [modeKey, load]);

  /** Re-read the board after a score submit or a tab switch. */
  const refresh = useCallback(() => {
    if (modeKey) void load(modeKey);
  }, [modeKey, load]);

  return {
    // Rows always belong to the mode being asked about, never a stale one.
    rows: modeKey && loadedKey === modeKey ? rows : NO_ROWS,
    loading: !!modeKey && loadedKey !== modeKey,
    unavailable,
    refresh,
  };
}
