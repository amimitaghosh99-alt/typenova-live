import { memo, useEffect, useLayoutEffect, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';

interface AcademyPassageProps {
    /** Full lesson passage. */
    passage: string;
    /** Index of the character the learner must type next. */
    index: number;
    /** Flashes the caret red on a mistake. */
    errorShake?: boolean;
    /** "r, g, b" triplet from the active theme. */
    themeGlow?: string;
    /**
     * Most recent keystroke, used to bloom an acknowledgement at the caret.
     * Keyed by timestamp so each press mounts exactly one short-lived span —
     * all the per-keystroke feedback used to live down on the keyboard, away
     * from where the learner is actually looking.
     */
    lastKeystroke?: { key: string; isCorrect: boolean; timestamp: number } | null;
}

/**
 * Reading rail for the active lesson.
 *
 * Renders the passage as exactly three spans — typed / current / pending — so a
 * 300-character prose lesson costs three DOM updates per keystroke instead of
 * three hundred. The current character keeps itself scrolled into view, and the
 * scroll is only issued when the caret actually changes line.
 */
export const AcademyPassage = memo(function AcademyPassage({
    passage,
    index,
    errorShake = false,
    themeGlow = '0, 240, 255',
    lastKeystroke = null,
}: AcademyPassageProps) {
    const reduce = useReducedMotion();
    const scrollRef = useRef<HTMLDivElement>(null);
    const caretRef = useRef<HTMLSpanElement>(null);
    const lastTopRef = useRef(-1);

    const clamped = Math.max(0, Math.min(passage.length, index));
    const typed = passage.slice(0, clamped);
    const current = passage.slice(clamped, clamped + 1);
    const pending = passage.slice(clamped + 1);

    // Keep the caret line visible; only scroll when the caret moved to a new line.
    useLayoutEffect(() => {
        const box = scrollRef.current;
        const caret = caretRef.current;
        if (!box || !caret) return;

        const top = caret.offsetTop;
        if (top === lastTopRef.current) return;
        lastTopRef.current = top;

        const target = Math.max(0, top - box.clientHeight / 2 + caret.offsetHeight / 2);
        if (Math.abs(box.scrollTop - target) < 4) return;

        box.scrollTo({ top: target, behavior: reduce ? 'auto' : 'smooth' });
    }, [clamped, passage, reduce]);

    // A fresh lesson always starts at the top of the rail.
    useEffect(() => {
        lastTopRef.current = -1;
        scrollRef.current?.scrollTo({ top: 0 });
    }, [passage]);

    const progress = passage.length ? (clamped / passage.length) * 100 : 0;

    return (
        <div
            className="relative w-full mb-3 rounded-2xl border overflow-hidden"
            style={{
                background: 'rgba(10, 13, 24, 0.78)',
                borderColor: errorShake ? 'rgba(248,113,113,0.55)' : `rgba(${themeGlow}, 0.22)`,
                boxShadow: `0 6px 22px rgba(0,0,0,0.5), 0 0 14px rgba(${themeGlow}, 0.10)`,
                transition: 'border-color 220ms ease-out',
            }}
        >
            {/* typed-share bar */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-white/5">
                <div
                    className="h-full rounded-r-full"
                    style={{
                        width: `${progress}%`,
                        background: `rgb(${themeGlow})`,
                        boxShadow: `0 0 10px rgba(${themeGlow}, 0.8)`,
                        transition: reduce ? 'none' : 'width 260ms cubic-bezier(0.22, 1, 0.36, 1)',
                    }}
                />
            </div>

            <div
                ref={scrollRef}
                className="px-5 py-4 max-h-[124px] overflow-y-auto overscroll-contain [scrollbar-width:thin]"
                style={{ scrollbarColor: `rgba(${themeGlow},0.4) transparent` }}
            >
                <p className="font-mono text-[15px] sm:text-base leading-[1.9] whitespace-pre-wrap break-words tracking-wide">
                    <span className="text-zinc-500">{typed}</span>

                    <span
                        ref={caretRef}
                        className="relative rounded-[3px] px-[1px] font-bold"
                        style={{
                            color: errorShake ? '#fecaca' : '#ffffff',
                            background: errorShake ? 'rgba(248,113,113,0.35)' : `rgba(${themeGlow}, 0.30)`,
                            boxShadow: errorShake
                                ? '0 0 12px rgba(248,113,113,0.6)'
                                : `0 0 12px rgba(${themeGlow}, 0.45)`,
                            transition: 'background-color 140ms ease-out, box-shadow 140ms ease-out',
                        }}
                    >
                        {current === ' ' ? '\u00A0' : current || '\u00A0'}

                        {/*
                          Keystroke bloom. Deliberately a CSS animation rather than a
                          motion component: this remounts on every press, and the
                          passage is the one component in the stage that re-renders at
                          typing speed. Same class the keyboard ripples use.
                        */}
                        {lastKeystroke && !reduce && (
                            <span
                                key={lastKeystroke.timestamp}
                                aria-hidden
                                className="absolute left-1/2 top-1/2 h-7 w-7 rounded-full pointer-events-none animate-key-ripple"
                                style={{
                                    background: lastKeystroke.isCorrect
                                        ? 'radial-gradient(circle, rgba(52,211,153,0.85), rgba(52,211,153,0) 70%)'
                                        : 'radial-gradient(circle, rgba(248,113,113,0.9), rgba(248,113,113,0) 70%)',
                                }}
                            />
                        )}

                        <span
                            aria-hidden
                            className="absolute left-0 -bottom-[3px] h-[2px] w-full rounded-full"
                            style={{
                                background: errorShake ? '#f87171' : `rgb(${themeGlow})`,
                                animation: reduce ? undefined : 'pulse 1.1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                            }}
                        />
                    </span>

                    <span className="text-zinc-300/55">{pending}</span>
                </p>
            </div>
        </div>
    );
});
