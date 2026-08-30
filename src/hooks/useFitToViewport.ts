import { useCallback, useEffect, useState } from 'react';

/**
 * Cap an element at the height that leaves the document no taller than the
 * viewport, so the element scrolls internally instead of scrolling the page.
 *
 * Everything here is measured rather than hardcoded. An earlier attempt wrote
 * the arithmetic out by hand (`calc(100dvh - var(--nav-h) - 10rem)`) and was
 * ~80px off, so the cap never bit: the padding above the panel is spread across
 * a stage wrapper and a grid owned by another file, and either can move without
 * this one noticing. `useAppChrome` exists for the same reason — four files used
 * to each keep a private guess at the navbar height and all four were wrong.
 *
 *     available = viewportHeight − fixedSpaceAbove − spaceOwedBelow
 *
 * `spaceOwedBelow` is the bottom padding, margin and border of every ancestor:
 * the room that has to stay free under the element for the document to end at
 * the fold.
 *
 * `fixedSpaceAbove` is deliberately *not* the element's measured offset. The
 * stage is vertically centred inside a `min-h-screen` wrapper, so part of the
 * space above the panel is slack that the centring gives back as soon as the
 * panel grows. Counting it as consumed made the cap ~80px tighter than it
 * needed to be and forced the list to scroll in cases that would have fitted.
 * Only genuinely fixed space is counted: ancestor padding/border/margin, plus
 * any sibling that really sits above the element (the race track, when a race
 * is running). Siblings beside it in the grid are excluded geometrically.
 *
 * Neither term depends on the element's own height, so applying the cap cannot
 * change the answer — the measurement settles in one pass instead of
 * oscillating.
 */
export interface FitToViewportOptions {
  /** Never cap below this many pixels. */
  minPx?: number;
  /** Only cap at or above this viewport width; below it, return null. */
  minViewportWidth?: number;
  /** Skip measuring entirely (e.g. the element is hidden). */
  enabled?: boolean;
}

export function useFitToViewport(
  ref: React.RefObject<HTMLElement | null>,
  { minPx = 0, minViewportWidth = 0, enabled = true }: FitToViewportOptions = {},
): number | null {
  const [maxHeight, setMaxHeight] = useState<number | null>(null);

  const measure = useCallback(() => {
    const el = ref.current;
    if (!enabled || !el) return;
    // `offsetParent` is null for a `display: none` element, which is how the
    // arena hides this panel while a race is running. Measuring then would
    // report a top of 0 and cap everything to the full viewport.
    if (el.offsetParent === null || el.getBoundingClientRect().width === 0) return;
    if (minViewportWidth > 0 && window.innerWidth < minViewportWidth) return;

    let fixedSpaceAbove = 0;
    let spaceOwedBelow = 0;

    for (let node: HTMLElement | null = el; node && node !== document.body; node = node.parentElement) {
      const nodeTop = node.getBoundingClientRect().top;
      const own = getComputedStyle(node);
      fixedSpaceAbove += Number.parseFloat(own.marginTop) || 0;

      // Anything that genuinely stacks above this node inside the same parent.
      // The geometric test is what keeps the arena — the panel's grid sibling,
      // laid out beside it rather than over it — from being counted.
      for (let sib = node.previousElementSibling; sib; sib = sib.previousElementSibling) {
        const sibStyle = getComputedStyle(sib);
        if (sibStyle.position === 'fixed' || sibStyle.position === 'absolute') continue;
        const sibRect = sib.getBoundingClientRect();
        if (sibRect.height === 0 || sibRect.bottom > nodeTop) continue;
        fixedSpaceAbove += sibRect.height
          + (Number.parseFloat(sibStyle.marginTop) || 0)
          + (Number.parseFloat(sibStyle.marginBottom) || 0);
      }

      const parent = node.parentElement;
      if (!parent || parent === document.body) break;
      const ps = getComputedStyle(parent);
      fixedSpaceAbove += (Number.parseFloat(ps.paddingTop) || 0) + (Number.parseFloat(ps.borderTopWidth) || 0);
      spaceOwedBelow += (Number.parseFloat(ps.paddingBottom) || 0)
        + (Number.parseFloat(ps.marginBottom) || 0)
        + (Number.parseFloat(ps.borderBottomWidth) || 0);
    }

    const available = window.innerHeight - fixedSpaceAbove - spaceOwedBelow;
    setMaxHeight(Math.round(Math.max(minPx, available)));
  }, [ref, enabled, minPx, minViewportWidth]);

  useEffect(() => {
    if (!enabled) return;

    let frame = 0;
    const schedule = () => {
      cancelAnimationFrame(frame);
      // Batch into a frame: a font swap, a wrapping config bar and a resize can
      // all land together, and each would otherwise force its own layout pass.
      frame = requestAnimationFrame(measure);
    };

    schedule();

    // Watch the ancestors, not the element. Anything that moves the panel down
    // the page changes the answer, and the culprit is usually above it — the
    // config bar wrapping to a second line, the navbar growing a badge, a stage
    // swap. The panel's own height is deliberately not observed: the measurement
    // does not depend on it, so feeding it back in would only risk a loop.
    const observer = new ResizeObserver(schedule);
    observer.observe(document.documentElement);
    for (let node = ref.current?.parentElement ?? null, hops = 0;
         node && node !== document.body && hops < 3;
         node = node.parentElement, hops++) {
      observer.observe(node);
    }

    window.addEventListener('resize', schedule, { passive: true });
    window.addEventListener('orientationchange', schedule);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', schedule);
      window.removeEventListener('orientationchange', schedule);
      cancelAnimationFrame(frame);
    };
  }, [measure, enabled, ref]);

  // Derived, not stored: a disabled hook reports "no cap" without having to
  // write state from the effect body, which is the cascading-render pattern
  // `react-hooks/set-state-in-effect` exists to catch.
  return enabled ? maxHeight : null;
}
