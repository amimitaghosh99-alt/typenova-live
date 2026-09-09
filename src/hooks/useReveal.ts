// ═══════════════════════════════════════════════════════════════════════
//  REVEAL — entrance motion that waits until you are looking
//  ---------------------------------------------------------------------
//  The dossier's entrances all fired on mount. On a five-tab deck that was
//  correct: mounting a panel *was* arriving at it. The page is one long scroll
//  now, so mount-triggered motion is the worst of both worlds — the collection
//  grid staggers itself, the meters fill and the counters count while they are
//  two thousand pixels below the fold, and by the time you scroll down every
//  animation has already finished. The page reads as static even though it is
//  full of animation.
//
//  Two hooks, one idea: run the entrance when the element enters the scrollport.
//
//    · `useRevealObserver` — one observer for the whole page. It flips
//      `data-dsr-in` on every `[data-reveal]` it finds and then stops watching
//      it. All the CSS in `index.css` keys off that attribute, so the motion
//      itself stays on the compositor and costs nothing per frame.
//    · `useInViewOnce`     — for the two entrances that genuinely need JS: the
//      count-up, which writes text, and the sparkline's draw-on, which needs its
//      measured path length.
//
//  IntersectionObserver rather than a scroll handler, deliberately: a scroll
//  handler that reads geometry runs a forced layout on every frame it fires, and
//  this page has enough to paint already.
// ═══════════════════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

/** Marks an element as already revealed. Also the CSS hook. */
const IN = 'data-dsr-in';

/**
 * Watches every `[data-reveal]` inside `rootRef` and reveals it on entry.
 *
 * `rescanKey` re-runs the scan. The page's sections are conditional — a remote
 * dossier mounts a different set, and neither exists while the profile row is in
 * flight — so a single scan at mount would leave whatever arrives later
 * permanently at `opacity: 0`. Anything that changes which elements exist has to
 * appear in that key.
 */
export function useRevealObserver(
    rootRef: React.RefObject<HTMLElement | null>,
    rescanKey: unknown,
): void {
    const reduce = useReducedMotion();

    useEffect(() => {
        const root = rootRef.current;
        if (!root) return;

        // Both attributes, in one pass. `data-reveal-rule` exists separately
        // because a section divider animates along its own length rather than
        // rising like a block, but it is revealed by the same observer — and
        // leaving it out of this selector left every divider on the page parked at
        // `scaleX(0)`, which is to say invisible.
        const targets = () =>
            root.querySelectorAll<HTMLElement>(
                `[data-reveal]:not([${IN}]), [data-reveal-rule]:not([${IN}])`,
            );

        // Reduced motion gets the end state immediately. Not "no animation" —
        // *no waiting*: an element left at `opacity: 0` because its observer never
        // fired is a blank page, which is worse than a missing flourish.
        if (reduce) {
            targets().forEach((node) => node.setAttribute(IN, ''));
            return;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (!entry.isIntersecting) continue;
                    entry.target.setAttribute(IN, '');
                    // One shot. Re-animating on the way back up turns a page you
                    // are re-reading into a page that keeps interrupting you.
                    observer.unobserve(entry.target);
                }
            },
            {
                root,
                // Start a little before the element's top edge clears the fold, so
                // the motion is already underway when it becomes readable rather
                // than starting after you have arrived.
                //
                // The enormous top margin is a correctness fix, not a taste one. An
                // observer only fires when an intersection ratio *crosses* a
                // threshold, and jumping past an element - clicking the spy strip,
                // or a restored scroll position - takes it from 0 to 0 without
                // crossing anything: the keyboard section stayed at `opacity: 0`
                // permanently after one jump to the bottom of the page. Treating
                // everything above the viewport as intersecting means "already
                // scrolled past" reveals too, which is the honest reading of a
                // one-shot entrance anyway.
                rootMargin: '100000px 0px -8% 0px',
                threshold: 0.01,
            },
        );

        targets().forEach((node) => observer.observe(node));

        // Anything already on screen at mount reveals on the first callback, which
        // fires before paint — so the top of the page still animates in.
        return () => observer.disconnect();
    }, [rootRef, rescanKey, reduce]);
}

/**
 * `true` once the element has been on screen, and `true` forever after.
 *
 * For entrances that cannot be expressed as a CSS transition on the element
 * itself: the count-up writes a text node, and the sparkline's draw needs the
 * path length it measured.
 */
export function useInViewOnce<T extends Element>(
    ref: React.RefObject<T | null>,
    /** Skip the wait entirely — used where the caller knows it is visible. */
    disabled = false,
): boolean {
    const reduce = useReducedMotion();
    const [seen, setSeen] = useState(false);
    const seenRef = useRef(false);

    useEffect(() => {
        // `disabled` and `reduce` are answered by the return value below rather
        // than by writing state here. Setting it synchronously in an effect body
        // is the cascading-render pattern `react-hooks/set-state-in-effect`
        // exists to catch, and the observer's own callback is asynchronous, which
        // is exactly the case the rule allows.
        if (seenRef.current || disabled || reduce) return;

        const node = ref.current;
        if (!node) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (!entries.some((e) => e.isIntersecting)) return;
                seenRef.current = true;
                setSeen(true);
                observer.disconnect();
            },
            // Same asymmetry as `useRevealObserver`, and for the same reason: an
            // element jumped past never crosses a threshold, so without the top
            // margin its entrance would simply never run.
            { rootMargin: '100000px 0px -6% 0px', threshold: 0.01 },
        );

        observer.observe(node);
        return () => observer.disconnect();
    }, [ref, disabled, reduce]);

    return seen || disabled || !!reduce;
}
