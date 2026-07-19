// Seeded RNG + local-date helpers for the Daily Challenge.
// mulberry32 is deterministic: same seed → same sequence, so every player
// gets the same daily text without any server involvement.

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Local-date key, e.g. "2026-07-20". */
export function todayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Numeric seed for today, e.g. 20260720. */
export function daySeed(): number {
  return parseInt(todayKey().replace(/-/g, ''), 10);
}

/** Is `prevKey` (YYYY-MM-DD) exactly the local day before `curKey`? */
export function isYesterday(prevKey: string, curKey: string = todayKey()): boolean {
  const [py, pm, pd] = prevKey.split('-').map(Number);
  const prev = new Date(py, pm - 1, pd);
  prev.setDate(prev.getDate() + 1);
  return todayKey(prev) === curKey;
}
