// ═══════════════════════════════════════════════════════════════════════
//  INTERACTIVE FORM CHART — Ultra-smooth responsive dual-axis chart
//  ---------------------------------------------------------------------
//  Plots WPM (primary, dynamic accent) and Accuracy (secondary, white)
//  on dual Y-axes with 120Hz-ready fluid morph transitions and 100% full-width
//  responsive container scaling. Zero flicker, zero layout thrashing.
// ═══════════════════════════════════════════════════════════════════════

import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import { useInViewOnce } from '@/hooks/useReveal';
import { rgba } from '@/lib/motion';
import type { HistoryEntry } from '@/lib/history';

/* ── Layout constants ──────────────────────────────────────────────── */

const CHART_H = 260;
const PAD = { top: 22, right: 38, bottom: 24, left: 36 };
const ACC_COLOR = '255, 255, 255';
const DOT_R_NORMAL = 2;
const DOT_R_HOVER = 4.5;
const ANIM_DURATION = 350; // Snappy & fluid, organic feel

/* ── Smooth Spline Curves (Monotone Cubic) ─────────────────────────── */

const lineCurve = d3.curveMonotoneX;

const lineOf = d3.line<{ x: number; y: number }>()
    .x((p) => p.x)
    .y((p) => p.y)
    .curve(lineCurve);

/** Format an ISO date string as "Aug 15". */
function fmtDate(iso: string): string {
    try {
        return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(iso));
    } catch {
        return '';
    }
}

/** Cubic ease-out for fluid interpolation. */
function easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
}

/** Sample a point array at fractional distance u in [0, 1]. */
function sampleYByFraction(pts: Array<{ x: number; y: number }>, u: number): number {
    if (pts.length === 0) return 0;
    if (pts.length === 1) return pts[0].y;
    const clampedU = Math.max(0, Math.min(1, u));
    const idxFloat = clampedU * (pts.length - 1);
    const lo = Math.floor(idxFloat);
    const hi = Math.min(lo + 1, pts.length - 1);
    const remainder = idxFloat - lo;
    return pts[lo].y + (pts[hi].y - pts[lo].y) * remainder;
}

interface Band { min: number; max: number }

/** A padded band for speed; a bounded 0-100 axis for accuracy. */
function bandFor(kind: 'wpm' | 'acc', values: number[]): Band {
    const rawMax = Math.max(...values, 10);
    const rawMin = Math.min(...values, 0);
    if (kind === 'acc') {
        return { min: Math.max(0, Math.min(rawMin - 2, 90)), max: 100 };
    }
    const span = Math.max(rawMax - rawMin, 10);
    return { min: Math.max(0, Math.round(rawMin - span * 0.12)), max: Math.round(rawMax + span * 0.12) };
}

/* ── SVG element creators ──────────────────────────────────────────── */

const SVG_NS = 'http://www.w3.org/2000/svg';

function createSVGCircle(cx: number, cy: number, r: number, fill: string, opacity = '1'): SVGCircleElement {
    const el = document.createElementNS(SVG_NS, 'circle');
    el.setAttribute('cx', String(cx));
    el.setAttribute('cy', String(cy));
    el.setAttribute('r', String(r));
    el.setAttribute('fill', fill);
    el.setAttribute('opacity', opacity);
    return el;
}

/* ── Component ─────────────────────────────────────────────────────── */

export const InteractiveFormChart = memo(function InteractiveFormChart({
    entries,
    accent,
    onHoverChange,
    height = CHART_H,
}: {
    /** The full `HistoryEntry[]` slice (last N tests, oldest first). */
    entries: HistoryEntry[];
    /** RGB triplet string, e.g. `"6, 182, 212"`. */
    accent: string;
    /** Callback for hover index changes to surface readout externally */
    onHoverChange?: (info: { entry: HistoryEntry; idx: number } | null) => void;
    /** Optional custom chart height in pixels (defaults to CHART_H). */
    height?: number;
}) {
    const H = height;

    /* ── Robust Container measurement (zero delay, fills monitor) ─── */

    const hostRef = useRef<HTMLDivElement | null>(null);
    const [width, setWidth] = useState<number>(() => {
        if (typeof window !== 'undefined') {
            return Math.max(600, window.innerWidth - 80);
        }
        return 800;
    });

    // Synchronous layout measurement to eliminate initial 600px paint artifact
    useLayoutEffect(() => {
        if (hostRef.current) {
            const measured = Math.round(hostRef.current.getBoundingClientRect().width);
            if (measured > 0) setWidth(measured);
        }
    }, []);

    // Continuous ResizeObserver for responsive fluid scaling
    useEffect(() => {
        const node = hostRef.current;
        if (!node) return;
        const observer = new ResizeObserver((observed) => {
            for (const entry of observed) {
                const next = Math.round(entry.contentRect.width);
                if (next > 0) {
                    setWidth((prev) => (Math.abs(prev - next) > 1 ? next : prev));
                }
            }
        });
        observer.observe(node);
        return () => observer.disconnect();
    }, []);

    const W = width;

    /* ── Entrance trigger ──────────────────────────────────────────── */

    const drawn = useInViewOnce(hostRef);

    /* ── Target Geometry Calculation ───────────────────────────────── */

    const targetGeometry = useMemo(() => {
        if (entries.length < 2) return null;

        const wpmValues = entries.map((e) => Number(e.wpm) || 0);
        const accValues = entries.map((e) => Number(e.acc ?? (e as { accuracy?: number }).accuracy) || 0);

        const wpmBand = bandFor('wpm', wpmValues);
        const accBand = bandFor('acc', accValues);

        const plotW = Math.max(W - PAD.left - PAD.right, 50);
        const plotH = H - PAD.top - PAD.bottom;

        const px = (i: number) => PAD.left + (i / (entries.length - 1)) * plotW;
        const scale = (band: Band) => (v: number) =>
            PAD.top + (1 - (v - band.min) / Math.max(band.max - band.min, 1)) * plotH;

        const pyWpm = scale(wpmBand);
        const pyAcc = scale(accBand);

        const wpmPts = wpmValues.map((v, i) => ({ x: px(i), y: pyWpm(v) }));
        const accPts = accValues.map((v, i) => ({ x: px(i), y: pyAcc(v) }));

        const wpmLabels = [
            { value: Math.round(wpmBand.min), y: pyWpm(wpmBand.min) },
            { value: Math.round((wpmBand.min + wpmBand.max) / 2), y: pyWpm((wpmBand.min + wpmBand.max) / 2) },
            { value: Math.round(wpmBand.max), y: pyWpm(wpmBand.max) },
        ];

        const accLabels = [
            { value: Math.round(accBand.min), y: pyAcc(accBand.min) },
            { value: Math.round((accBand.min + accBand.max) / 2), y: pyAcc((accBand.min + accBand.max) / 2) },
            { value: Math.round(accBand.max), y: pyAcc(accBand.max) },
        ];

        return {
            wpm: { pts: wpmPts },
            acc: { pts: accPts },
            xs: wpmPts.map((p) => p.x),
            wpmLabels,
            accLabels,
        };
    }, [entries, H, W]);

    /* ── DOM Refs for animated elements ────────────────────────────── */

    const wpmPathRef = useRef<SVGPathElement | null>(null);
    const accPathRef = useRef<SVGPathElement | null>(null);
    const dotsGroupRef = useRef<SVGGElement | null>(null);

    const crosshairGroupRef = useRef<SVGGElement | null>(null);
    const crosshairLineRef = useRef<SVGLineElement | null>(null);
    const crosshairWpmHaloRef = useRef<SVGCircleElement | null>(null);
    const crosshairWpmDotRef = useRef<SVGCircleElement | null>(null);
    const crosshairAccDotRef = useRef<SVGCircleElement | null>(null);
    const crosshairDateRef = useRef<SVGTextElement | null>(null);

    const hoverIdxRef = useRef<number | null>(null);
    const accentRef = useRef(accent);
    accentRef.current = accent;

    /* ── High-Performance Scroll Suppression & Coordinate Caching ─── */

    const isScrollingRef = useRef(false);
    const scrollTimerRef = useRef<number | null>(null);
    const cachedLeftRef = useRef<number | null>(null);

    // Passive scroll listener to freeze pointer handling during scroll
    useEffect(() => {
        const handleScroll = () => {
            isScrollingRef.current = true;
            if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
            scrollTimerRef.current = window.setTimeout(() => {
                isScrollingRef.current = false;
                cachedLeftRef.current = null;
            }, 100);
        };

        window.addEventListener('scroll', handleScroll, { passive: true, capture: true });
        return () => {
            window.removeEventListener('scroll', handleScroll, { capture: true });
            if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
        };
    }, []);

    /* ── Animation State ───────────────────────────────────────────── */

    const currentPointsRef = useRef<{
        wpmPts: Array<{ x: number; y: number }>;
        accPts: Array<{ x: number; y: number }>;
    } | null>(null);

    const animFrameRef = useRef<number | null>(null);

    /** Direct DOM flush of point coordinates without React reconciliation */
    const flushToDOM = useCallback((state: {
        wpmPts: Array<{ x: number; y: number }>;
        accPts: Array<{ x: number; y: number }>;
    }, dotAlpha = 0.4) => {
        if (wpmPathRef.current) wpmPathRef.current.setAttribute('d', lineOf(state.wpmPts) ?? '');
        if (accPathRef.current) accPathRef.current.setAttribute('d', lineOf(state.accPts) ?? '');

        if (dotsGroupRef.current) {
            const dots = dotsGroupRef.current.children;
            const acc = accentRef.current;
            for (let i = 0; i < state.wpmPts.length && i < dots.length; i++) {
                const dot = dots[i] as SVGCircleElement;
                dot.setAttribute('cx', String(state.wpmPts[i].x));
                dot.setAttribute('cy', String(state.wpmPts[i].y));
                if (i !== hoverIdxRef.current) {
                    dot.setAttribute('fill', rgba(acc, dotAlpha));
                }
            }
        }
    }, []);

    /* ── Synchronize dots count with fade ──────────────────────────── */

    const syncDots = useCallback((targetPts: Array<{ x: number; y: number }>, startPts: Array<{ x: number; y: number }>) => {
        const g = dotsGroupRef.current;
        if (!g) return;

        const needed = targetPts.length;
        const current = g.children.length;
        const acc = accentRef.current;

        if (current < needed) {
            // Add missing dots starting at interpolated start point with 0 opacity
            for (let i = current; i < needed; i++) {
                const pt = startPts[i] || targetPts[i];
                const circle = createSVGCircle(pt.x, pt.y, DOT_R_NORMAL, rgba(acc, 0), '0');
                circle.style.transition = 'opacity 0.25s ease-out';
                g.appendChild(circle);
                // Trigger fade-in
                requestAnimationFrame(() => {
                    circle.setAttribute('opacity', '1');
                    circle.setAttribute('fill', rgba(accentRef.current, 0.4));
                });
            }
        } else if (current > needed) {
            // Remove excess dots
            while (g.children.length > needed) {
                g.removeChild(g.lastChild!);
            }
        }
    }, []);

    /* ── Smooth Morph Transition Loop ──────────────────────────────── */

    useEffect(() => {
        if (!targetGeometry) return;

        const target = {
            wpmPts: targetGeometry.wpm.pts,
            accPts: targetGeometry.acc.pts,
        };

        const prev = currentPointsRef.current;

        // First paint — render immediately without tweening
        if (!prev) {
            currentPointsRef.current = target;
            syncDots(target.wpmPts, target.wpmPts);
            flushToDOM(target);
            return;
        }

        const targetLen = target.wpmPts.length;

        // Generate starting points by sampling the previous curves at the matching relative fractions
        const startWpmPts = target.wpmPts.map((p, i) => ({
            x: p.x,
            y: sampleYByFraction(prev.wpmPts, i / (targetLen - 1)),
        }));

        const startAccPts = target.accPts.map((p, i) => ({
            x: p.x,
            y: sampleYByFraction(prev.accPts, i / (targetLen - 1)),
        }));

        syncDots(target.wpmPts, startWpmPts);

        const startTime = performance.now();
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

        const tick = (now: number) => {
            const elapsed = now - startTime;
            const progress = Math.min(1, elapsed / ANIM_DURATION);
            const ease = easeOutCubic(progress);

            const lerpPts = (start: Array<{ x: number; y: number }>, end: Array<{ x: number; y: number }>) =>
                end.map((p, i) => ({
                    x: p.x,
                    y: start[i] ? start[i].y + (p.y - start[i].y) * ease : p.y,
                }));

            const next = {
                wpmPts: lerpPts(startWpmPts, target.wpmPts),
                accPts: lerpPts(startAccPts, target.accPts),
            };

            currentPointsRef.current = next;
            flushToDOM(next);

            if (progress < 1) {
                animFrameRef.current = requestAnimationFrame(tick);
            } else {
                currentPointsRef.current = target;
                flushToDOM(target);
            }
        };

        animFrameRef.current = requestAnimationFrame(tick);

        return () => {
            if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        };
    }, [targetGeometry, flushToDOM, syncDots]);

    /* ── Hide crosshair when dataset/mode switches ─────────────────── */

    useEffect(() => {
        const group = crosshairGroupRef.current;
        if (group) group.style.display = 'none';
        hoverIdxRef.current = null;
        onHoverChange?.(null);
    }, [entries, onHoverChange]);

    /* ── Crosshair update — pure DOM ──────────────────────────────── */

    const updateCrosshair = useCallback((idx: number | null) => {
        const group = crosshairGroupRef.current;
        if (!group) return;

        if (idx === null || !targetGeometry) {
            group.style.display = 'none';
            return;
        }

        const wpmPts = currentPointsRef.current?.wpmPts ?? targetGeometry.wpm.pts;
        const accPts = currentPointsRef.current?.accPts ?? targetGeometry.acc.pts;
        const wpmPt = wpmPts[idx];
        const accPt = accPts[idx];
        const x = targetGeometry.xs[idx];
        if (!wpmPt || !accPt) return;

        group.style.display = '';

        if (crosshairLineRef.current) {
            crosshairLineRef.current.setAttribute('x1', String(x));
            crosshairLineRef.current.setAttribute('x2', String(x));
        }
        if (crosshairWpmHaloRef.current) {
            crosshairWpmHaloRef.current.setAttribute('cx', String(wpmPt.x));
            crosshairWpmHaloRef.current.setAttribute('cy', String(wpmPt.y));
            crosshairWpmHaloRef.current.setAttribute('fill', rgba(accentRef.current, 0.18));
        }
        if (crosshairWpmDotRef.current) {
            crosshairWpmDotRef.current.setAttribute('cx', String(wpmPt.x));
            crosshairWpmDotRef.current.setAttribute('cy', String(wpmPt.y));
            crosshairWpmDotRef.current.setAttribute('fill', rgba(accentRef.current, 1));
            crosshairWpmDotRef.current.style.filter = `drop-shadow(0 0 6px ${rgba(accentRef.current, 0.85)})`;
        }
        if (crosshairAccDotRef.current) {
            crosshairAccDotRef.current.setAttribute('cx', String(accPt.x));
            crosshairAccDotRef.current.setAttribute('cy', String(accPt.y));
        }
        if (crosshairDateRef.current) {
            crosshairDateRef.current.setAttribute('x', String(x));
            const entry = entries[idx];
            crosshairDateRef.current.textContent = entry?.d ? fmtDate(entry.d) : '';
        }
    }, [targetGeometry, entries]);

    /* ── Dot hover highlighting ────────────────────────────────────── */

    const updateDotHover = useCallback((prevIdx: number | null, nextIdx: number | null) => {
        const g = dotsGroupRef.current;
        if (!g) return;
        const acc = accentRef.current;

        if (prevIdx !== null && prevIdx < g.children.length) {
            const dot = g.children[prevIdx] as SVGCircleElement;
            dot.setAttribute('r', String(DOT_R_NORMAL));
            dot.setAttribute('fill', rgba(acc, 0.4));
            dot.style.filter = '';
        }
        if (nextIdx !== null && nextIdx < g.children.length) {
            const dot = g.children[nextIdx] as SVGCircleElement;
            dot.setAttribute('r', String(DOT_R_HOVER));
            dot.setAttribute('fill', rgba(acc, 1));
            dot.style.filter = `drop-shadow(0 0 5px ${rgba(acc, 0.8)})`;
        }
    }, []);

    /* ── Pointer handling ──────────────────────────────────────────── */

    const handlePointerEnter = useCallback(() => {
        if (isScrollingRef.current) return;
        if (hostRef.current) {
            cachedLeftRef.current = hostRef.current.getBoundingClientRect().left;
        }
    }, []);

    const handlePointerMove = useCallback(
        (e: React.PointerEvent<SVGRectElement>) => {
            if (isScrollingRef.current || !targetGeometry || !hostRef.current) return;

            let mouseX = 0;
            if (cachedLeftRef.current !== null) {
                mouseX = e.clientX - cachedLeftRef.current;
            } else {
                const rect = hostRef.current.getBoundingClientRect();
                cachedLeftRef.current = rect.left;
                mouseX = e.clientX - rect.left;
            }

            let closest = 0;
            let closestDist = Infinity;
            for (let i = 0; i < targetGeometry.xs.length; i++) {
                const dist = Math.abs(targetGeometry.xs[i] - mouseX);
                if (dist < closestDist) {
                    closestDist = dist;
                    closest = i;
                }
            }

            const prevIdx = hoverIdxRef.current;
            if (prevIdx === closest) return;

            updateDotHover(prevIdx, closest);
            updateCrosshair(closest);
            hoverIdxRef.current = closest;

            onHoverChange?.({ entry: entries[closest], idx: closest });
        },
        [targetGeometry, entries, onHoverChange, updateCrosshair, updateDotHover],
    );

    const handlePointerLeave = useCallback(() => {
        cachedLeftRef.current = null;
        const prevIdx = hoverIdxRef.current;
        updateDotHover(prevIdx, null);
        updateCrosshair(null);
        hoverIdxRef.current = null;
        onHoverChange?.(null);
    }, [onHoverChange, updateCrosshair, updateDotHover]);

    /* ── Render ────────────────────────────────────────────────────── */

    return (
        <div
            ref={hostRef}
            className="ifc-host relative w-full select-none overflow-hidden transition-opacity duration-300"
            style={{
                height: H,
                opacity: drawn ? 1 : 0,
                contain: 'paint layout',
                willChange: 'transform',
            }}
        >
            {targetGeometry && (
                <svg
                    viewBox={`0 0 ${W} ${H}`}
                    className="w-full h-full block overflow-visible"
                    aria-hidden
                >
                    {/* ── Grid lines — subtle horizontal hairlines ── */}
                    {[0.2, 0.5, 0.8].map((f) => {
                        const y = PAD.top + (H - PAD.top - PAD.bottom) * f;
                        return (
                            <line
                                key={f}
                                x1={PAD.left}
                                x2={W - PAD.right}
                                y1={y}
                                y2={y}
                                stroke="rgba(255,255,255,0.05)"
                                strokeWidth="1"
                                strokeDasharray="4 4"
                            />
                        );
                    })}

                    {/* ── Y-axis labels — WPM on left, Accuracy on right ── */}
                    {targetGeometry.wpmLabels.map((label, i) => (
                        <text
                            key={`wl-${i}`}
                            x={PAD.left - 8}
                            y={label.y}
                            textAnchor="end"
                            dominantBaseline="middle"
                            fill={rgba(accent, 0.45)}
                            fontSize="9"
                            fontFamily="monospace"
                            className="transition-all duration-300 pointer-events-none"
                        >
                            {label.value}
                        </text>
                    ))}
                    {targetGeometry.accLabels.map((label, i) => (
                        <text
                            key={`al-${i}`}
                            x={W - PAD.right + 8}
                            y={label.y}
                            textAnchor="start"
                            dominantBaseline="middle"
                            fill="rgba(255,255,255,0.3)"
                            fontSize="9"
                            fontFamily="monospace"
                            className="transition-all duration-300 pointer-events-none"
                        >
                            {label.value}%
                        </text>
                    ))}

                    {/* ── Inline legend — top left ── */}
                    <g className="pointer-events-none">
                        <rect
                            x={PAD.left}
                            y={6}
                            width={12}
                            height={2.5}
                            rx={1}
                            fill={rgba(accent, 0.95)}
                        />
                        <text
                            x={PAD.left + 16}
                            y={7.5}
                            fill={rgba(accent, 0.9)}
                            fontSize="9"
                            fontWeight="600"
                            fontFamily="monospace"
                            dominantBaseline="middle"
                        >
                            WPM
                        </text>
                        <rect
                            x={PAD.left + 50}
                            y={6}
                            width={12}
                            height={2.5}
                            rx={1}
                            fill="rgba(255, 255, 255, 0.4)"
                        />
                        <text
                            x={PAD.left + 66}
                            y={7.5}
                            fill="rgba(255,255,255,0.4)"
                            fontSize="9"
                            fontWeight="600"
                            fontFamily="monospace"
                            dominantBaseline="middle"
                        >
                            ACC
                        </text>
                    </g>

                    {/* ── Main chart curves — direct DOM managed ── */}
                    <g className="chart-curves">
                        {/* Line 2: Accuracy — subtle secondary curve */}
                        <path
                            ref={accPathRef}
                            fill="none"
                            stroke="rgba(255, 255, 255, 0.38)"
                            strokeWidth={1.6}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />

                        {/* Line 1: WPM — primary bold accent curve */}
                        <path
                            ref={wpmPathRef}
                            fill="none"
                            stroke={rgba(accent, 0.95)}
                            strokeWidth={2.4}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />

                        {/* WPM data dots — DOM managed */}
                        <g ref={dotsGroupRef} className="pointer-events-none" />
                    </g>

                    {/* ── Crosshair group — shown/positioned via DOM ── */}
                    <g
                        ref={crosshairGroupRef}
                        style={{ display: 'none' }}
                        className="pointer-events-none"
                    >
                        <line
                            ref={crosshairLineRef}
                            y1={PAD.top}
                            y2={H - PAD.bottom}
                            stroke="rgba(255,255,255,0.12)"
                            strokeWidth="1"
                            strokeDasharray="2 2"
                        />
                        <circle
                            ref={crosshairWpmHaloRef}
                            r={8}
                            fill={rgba(accent, 0.18)}
                        />
                        <circle
                            ref={crosshairWpmDotRef}
                            r={4}
                            fill={rgba(accent, 1)}
                        />
                        <circle
                            ref={crosshairAccDotRef}
                            r={3}
                            fill={rgba(ACC_COLOR, 0.55)}
                        />
                        <text
                            ref={crosshairDateRef}
                            y={H - PAD.bottom + 15}
                            textAnchor="middle"
                            fill="rgba(255,255,255,0.3)"
                            fontSize="9"
                            fontFamily="monospace"
                        />
                    </g>

                    {/* Full-bleed invisible pointer capture plane */}
                    <rect
                        x={0}
                        y={0}
                        width={W}
                        height={H}
                        fill="transparent"
                        style={{ cursor: 'crosshair' }}
                        onPointerEnter={handlePointerEnter}
                        onPointerMove={handlePointerMove}
                        onPointerLeave={handlePointerLeave}
                    />
                </svg>
            )}
        </div>
    );
});
