import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

/**
 * Eases a number from its previous value up to `target` with requestAnimationFrame.
 * Honours `prefers-reduced-motion` by returning the target verbatim — no effect,
 * no cascading render.
 */
export function useCountUp(target: number, durationMs = 900): number {
  const reduce = useReducedMotion();
  const [value, setValue] = useState(0);
  const fromRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (reduce) return;

    const from = fromRef.current;
    const delta = target - from;
    if (delta === 0) return;

    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      const next = t < 1 ? from + delta * eased : target;
      fromRef.current = next;
      setValue(next);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [target, durationMs, reduce]);

  return reduce ? target : value;
}
