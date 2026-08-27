import { useCallback, useEffect, useRef, useState } from 'react';
import { CHROME_VARS } from '@/lib/layout';

/**
 * Measures the app's fixed chrome (navbar, bottom controls dock) and
 * publishes the real heights as `--nav-h` / `--dock-h` on
 * `document.documentElement`.
 *
 * Why: the navbar's height is not a constant. `CosmicNavBar` is `py-3`
 * around content whose tallest child — the `w-10 h-10` identity capsule — is
 * `hidden lg:flex`, so the header is genuinely shorter below the `lg`
 * breakpoint. Before this hook, four different files each hardcoded their own
 * guess (`top-[76px]`, `pt-20 md:pt-24`, `pt-20 md:pt-22` — where `pt-22`
 * isn't even a real Tailwind class and silently did nothing — and
 * `top-[84px]`), so every stage was misaligned at some viewport.
 *
 * Usage: attach `navRef`/`dockRef`, or simply mark the elements with
 * `data-app-chrome="nav"` / `data-app-chrome="dock"`. The attribute path
 * exists because both components are `memo`'d and one is deeply nested;
 * annotating them is less invasive than threading refs through, and it keeps
 * working if either element is conditionally rendered.
 */
export interface AppChrome {
    navRef: React.RefObject<HTMLElement | null>;
    dockRef: React.RefObject<HTMLElement | null>;
    /** Measured nav height in px. `0` until the first measurement lands. */
    navHeight: number;
    /** Measured dock height in px. `0` when no dock is mounted. */
    dockHeight: number;
    /** Force a re-scan, e.g. after a stage swap mounts different chrome. */
    remeasure: () => void;
}

const setVar = (name: string, px: number) => {
    document.documentElement.style.setProperty(name, `${Math.round(px)}px`);
};

export function useAppChrome(): AppChrome {
    const navRef = useRef<HTMLElement | null>(null);
    const dockRef = useRef<HTMLElement | null>(null);

    const [navHeight, setNavHeight] = useState(0);
    const [dockHeight, setDockHeight] = useState(0);

    // Bumping this re-runs the effect, which re-queries the DOM.
    const [revision, setRevision] = useState(0);
    const remeasure = useCallback(() => setRevision((r) => r + 1), []);

    useEffect(() => {
        const nav = navRef.current ?? document.querySelector<HTMLElement>('[data-app-chrome="nav"]');
        const dock = dockRef.current ?? document.querySelector<HTMLElement>('[data-app-chrome="dock"]');

        let frame = 0;
        const measure = () => {
            cancelAnimationFrame(frame);
            // Batch into a frame: a font swap or a badge appearing in the nav
            // can fire several observer callbacks in a row, and each one would
            // otherwise trigger its own layout pass on every stage.
            frame = requestAnimationFrame(() => {
                if (nav) {
                    const h = nav.getBoundingClientRect().height;
                    // The dock is `fixed`, so it never contributes to document
                    // flow — but the nav's height is what every stage's top
                    // padding is derived from, so a zero here would collapse
                    // the whole app under the header. Ignore implausible reads.
                    if (h > 0) {
                        setVar(CHROME_VARS.nav, h);
                        setNavHeight(h);
                    }
                }
                if (dock) {
                    const h = dock.getBoundingClientRect().height;
                    setVar(CHROME_VARS.dock, h);
                    setDockHeight(h);
                } else {
                    // No dock on this screen: nothing needs to clear it.
                    setVar(CHROME_VARS.dock, 0);
                    setDockHeight(0);
                }
            });
        };

        measure();

        const observer = new ResizeObserver(measure);
        if (nav) observer.observe(nav);
        if (dock) observer.observe(dock);
        window.addEventListener('resize', measure);
        window.addEventListener('orientationchange', measure);

        return () => {
            observer.disconnect();
            window.removeEventListener('resize', measure);
            window.removeEventListener('orientationchange', measure);
            cancelAnimationFrame(frame);
        };
    }, [revision]);

    return { navRef, dockRef, navHeight, dockHeight, remeasure };
}
