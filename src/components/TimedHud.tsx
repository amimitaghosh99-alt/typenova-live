import { useEffect, useRef, useState } from 'react';
import type { Theme } from '@/data/constants';

/** Seconds remaining at which the countdown turns red. */
const URGENT_AT_S = 5;

interface TimedHudProps {
    /** Absolute timestamp (ms) the test started at. */
    startTime: number;
    /** Test length in seconds. */
    duration: number;
    theme: Theme;
}

const readClock = (startTime: number, totalMs: number) => {
    const raw = Math.max(0, Date.now() - startTime);
    const elapsed = Math.min(totalMs, raw);
    return {
        pct: totalMs > 0 ? (elapsed / totalMs) * 100 : 100,
        remaining: Math.max(0, Math.ceil((totalMs - elapsed) / 1000)),
        done: raw >= totalMs,
    };
};

/**
 * Progress bar + remaining-seconds pill for timed tests.
 *
 * Driven by `requestAnimationFrame` so the bar moves at the display's refresh
 * rate rather than in 250ms steps. The frame loop writes `style.width` and
 * `textContent` through refs instead of calling `setState`: the previous
 * version stored the elapsed time in state, which re-rendered this component
 * on every frame to move a bar and redraw a number that only changes once a
 * second.
 *
 * Two things still go through React, because they belong to className and
 * change at most once per test: the theme colours (props) and the urgency
 * swap at `URGENT_AT_S`.
 *
 * This used to live inside `App.tsx`.
 */
export function TimedHud({ startTime, duration, theme }: TimedHudProps) {
    const totalMs = duration * 1000;
    const barRef = useRef<HTMLDivElement>(null);
    const secondsRef = useRef<HTMLSpanElement>(null);

    // Mounting can happen mid-test, so paint the real values instead of
    // flashing 0% and the full duration for a frame.
    const [initial] = useState(() => readClock(startTime, totalMs));
    const [urgent, setUrgent] = useState(initial.remaining <= URGENT_AT_S);
    const urgentRef = useRef(urgent);

    useEffect(() => {
        let animId = 0;
        // Only touch the text node when the whole second actually changes.
        let shownSecond = -1;

        const tick = () => {
            const { pct, remaining, done } = readClock(startTime, totalMs);

            if (barRef.current) barRef.current.style.width = `${pct}%`;

            if (remaining !== shownSecond) {
                shownSecond = remaining;
                if (secondsRef.current) secondsRef.current.textContent = `${remaining}s`;

                const nextUrgent = remaining <= URGENT_AT_S;
                if (nextUrgent !== urgentRef.current) {
                    urgentRef.current = nextUrgent;
                    setUrgent(nextUrgent);
                }
            }

            // The clock has run out; the parent unmounts this on FINISHED. No
            // point burning frames in the gap.
            if (done) return;
            animId = requestAnimationFrame(tick);
        };

        animId = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(animId);
    }, [startTime, totalMs]);

    return (
        <>
            <div className="fixed top-0 left-0 h-1 bg-zinc-900 w-full z-[var(--z-hud)]" aria-hidden="true">
                <div
                    ref={barRef}
                    className={`h-full ${theme.solid} ${theme.glow}`}
                    style={{ width: `${initial.pct}%` }}
                />
            </div>
            <div
                role="timer"
                className="fixed top-4 left-1/2 -translate-x-1/2 z-[var(--z-hud)] px-5 py-1.5 rounded-full bg-zinc-950/90 border border-white/10 pointer-events-none font-display shadow-xl"
            >
                <span
                    ref={secondsRef}
                    className={`font-black text-lg tabular-nums ${urgent ? 'text-red-400' : theme.text}`}
                >
                    {initial.remaining}s
                </span>
            </div>
        </>
    );
}
