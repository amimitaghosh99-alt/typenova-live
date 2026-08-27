import { useLayoutEffect, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';

/** How a counted value is printed. Matches the dossier's numeral style. */
const formatValue = (value: number, decimals: number): string =>
  decimals > 0 ? value.toFixed(decimals) : Math.round(value).toLocaleString();

/**
 * Eases a number from its previous value up to `target` and writes each frame
 * straight into a DOM text node.
 *
 * Returns a ref to attach to the element that shows the number, rather than the
 * number itself. That is the whole point: the previous version held the value in
 * `useState`, so every frame of every counter triggered a React render. The
 * operator dossier's overview tab mounts seven of these at once (six stat tiles
 * plus the XP readout), which meant ~seven renders per frame for the better part
 * of a second on every tab entry — while the entrance animations, the tab
 * glider and the sticky bars were all competing for the same frames. Text is
 * the only thing that changes here, so it never needed to go through React.
 *
 * The formatting lives here rather than in a caller-supplied callback so the
 * hook takes only primitives: an inline `format` prop would be a new function
 * identity on every render, which either re-runs the animation or has to be
 * smuggled past the dependency array in a ref.
 *
 * `useLayoutEffect` rather than `useEffect`: the caller renders the *final*
 * value as the element's children — which is what a screen reader, a static
 * render and `prefers-reduced-motion` all get — so the starting value has to
 * land before the browser paints, or the count visibly begins at its own answer
 * and jumps back to zero.
 */
export function useCountUp(
  target: number,
  decimals = 0,
  durationMs = 900,
): React.RefObject<HTMLSpanElement | null> {
  const ref = useRef<HTMLSpanElement | null>(null);
  const reduce = useReducedMotion();
  /** Where the next count starts, so a changed target resumes from on screen. */
  const fromRef = useRef(0);

  useLayoutEffect(() => {
    if (reduce) return;

    const node = ref.current;
    if (!node) return;

    const from = fromRef.current;
    const delta = target - from;
    if (delta === 0) {
      node.textContent = formatValue(target, decimals);
      return;
    }

    node.textContent = formatValue(from, decimals);

    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      const next = t < 1 ? from + delta * eased : target;
      fromRef.current = next;
      node.textContent = formatValue(next, decimals);
      if (t < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, decimals, durationMs, reduce]);

  return ref;
}
