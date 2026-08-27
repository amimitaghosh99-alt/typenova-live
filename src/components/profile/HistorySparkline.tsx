// ═══════════════════════════════════════════════════════════════════════
//  HISTORY SPARKLINE — the shape of an operator's last N tests
//  ---------------------------------------------------------------------
//  The dossier previously showed only aggregates (max WPM, average accuracy,
//  a test count), which say nothing about direction: a player at 95 WPM who
//  peaked at 130 six months ago read identically to one climbing through 95
//  for the first time. This draws the actual run of results.
//
//  Deliberately not a chart library. `recharts` is in the bundle but every
//  other graph in this app is hand-rolled SVG (`WpmGraph`, `TrendGraph`), and
//  matching them keeps the visual language and the reduced-motion handling
//  consistent.
//
//  The chart is measured, not stretched. It used to draw into a fixed 600-unit
//  viewBox with `preserveAspectRatio="none"`, which x-scaled the result by
//  whatever the card's width happened to be (~2.4× on a desktop deck). That is
//  what broke the line: `vector-effect: non-scaling-stroke` makes the browser
//  compute stroke geometry — including `stroke-dasharray`, which is how a
//  draw-on animation works — in *device* space, where the path is 2.4× longer
//  than the user-space length the dash pattern was derived from. The result was
//  a line that stopped partway across and stayed there. Measuring the container
//  and drawing 1:1 removes the scale entirely, so strokes, dashes and markers
//  are all in the same space.
// ═══════════════════════════════════════════════════════════════════════

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { rgba } from './profileMotion';

/** Catmull-Rom-ish smoothing, same tension as `WpmGraph`'s curve. */
function smoothPath(points: Array<{ x: number; y: number }>): string {
    if (points.length === 0) return '';
    if (points.length === 1) return `M ${points[0].x},${points[0].y}`;

    let d = `M ${points[0].x},${points[0].y}`;
    const tension = 0.16;
    for (let i = 0; i < points.length - 1; i++) {
        const p0 = i > 0 ? points[i - 1] : points[i];
        const p1 = points[i];
        const p2 = points[i + 1];
        const p3 = i !== points.length - 2 ? points[i + 2] : p2;

        const cp1x = p1.x + (p2.x - p0.x) * tension;
        const cp1y = p1.y + (p2.y - p0.y) * tension;
        const cp2x = p2.x - (p3.x - p1.x) * tension;
        const cp2y = p2.y - (p3.y - p1.y) * tension;

        d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
    }
    return d;
}

/**
 * Straight-line length through the points, inflated for the curve's bulge.
 *
 * Feeds the CSS draw-on as `--spark-len`. It only has to be an *over*-estimate:
 * the dash pattern is one dash the length of the line followed by one gap, so
 * too long still resolves to a fully covered path, while too short would leave
 * a permanent gap — exactly the artefact this replaces.
 */
function approxLength(points: Array<{ x: number; y: number }>): number {
    let total = 0;
    for (let i = 1; i < points.length; i++) {
        total += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
    }
    return Math.ceil(total * 1.2) + 8;
}

export interface SparkPoint {
    wpm: number;
    acc: number;
}

/** Which metric the line plots. Accuracy is its own chart, not an overlay. */
export type SparkSeries = 'wpm' | 'acc';

const PAD = { top: 12, right: 12, bottom: 14, left: 8 };
/** Used for the first paint, before the container has been measured. */
const FALLBACK_W = 600;

/**
 * One metric over the last `points.length` tests.
 *
 * The y-axis is padded around the observed band rather than starting at zero: a
 * 0-anchored axis flattens a 95→112 climb into a barely visible wobble, which
 * defeats the point of showing the trend at all. The band's floor and ceiling
 * are printed in the card's caption so the exaggeration is never silent.
 * Accuracy is the exception — it gets a real 0–100-ish axis, because a padded
 * band turns the difference between 97% and 99% into a mountain range.
 */
export function HistorySparkline({
    points,
    accent,
    height = 120,
    series = 'wpm',
}: {
    points: SparkPoint[];
    accent: string;
    height?: number;
    series?: SparkSeries;
}) {
    const H = height;

    /**
     * Real rendered width, so the chart draws 1:1 instead of being x-scaled.
     * A `ResizeObserver` rather than a window listener: this card's width changes
     * with the deck's grid at `xl` and when the identity rail stacks, neither of
     * which is a window resize.
     */
    const hostRef = useRef<HTMLDivElement | null>(null);
    const [width, setWidth] = useState(0);
    useEffect(() => {
        const node = hostRef.current;
        if (!node) return;

        const observer = new ResizeObserver((entries) => {
            const next = Math.round(entries[0].contentRect.width);
            // Ignore the zero a `display:none` ancestor reports, which would
            // collapse every x coordinate onto the left edge.
            if (next > 0) setWidth(next);
        });
        observer.observe(node);
        return () => observer.disconnect();
    }, []);

    const W = width || FALLBACK_W;

    /**
     * Unique gradient id. Two sparklines exist on the page — the Overview
     * preview and the Progress plot — and a duplicated `id` makes both fills
     * resolve to whichever `<defs>` the document reached first.
     */
    const fillId = `spark-fill-${useId().replace(/:/g, '')}`;

    const geometry = useMemo(() => {
        if (points.length < 2) return null;

        const values = points.map((p) => (series === 'acc' ? p.acc : p.wpm));
        const rawMax = Math.max(...values);
        const rawMin = Math.min(...values);

        let min: number;
        let max: number;
        if (series === 'acc') {
            // A real axis, floored a little under the observed low so the trace
            // still has somewhere to move, but never inflated into false drama.
            min = Math.max(0, Math.min(rawMin - 2, 90));
            max = 100;
        } else {
            // Pad the band so the line never rides the frame, and guard the
            // degenerate case where every test scored exactly the same.
            const span = Math.max(rawMax - rawMin, 8);
            max = rawMax + span * 0.12;
            min = Math.max(0, rawMin - span * 0.12);
        }
        const range = Math.max(max - min, 1);

        const px = (i: number) => PAD.left + (i / (points.length - 1)) * (W - PAD.left - PAD.right);
        const py = (v: number) => PAD.top + (1 - (v - min) / range) * (H - PAD.top - PAD.bottom);

        const pts = points.map((p, i) => ({ x: px(i), y: py(series === 'acc' ? p.acc : p.wpm) }));
        const line = smoothPath(pts);
        const base = H - PAD.bottom;

        return {
            line,
            area: `${line} L ${pts[pts.length - 1].x},${base} L ${pts[0].x},${base} Z`,
            length: approxLength(pts),
            last: pts[pts.length - 1],
            best: pts[values.indexOf(rawMax)],
            base,
        };
    }, [points, H, W, series]);

    return (
        <div ref={hostRef} className="w-full" style={{ height: H }}>
            {geometry && (
                <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="block" aria-hidden>
                    {/* `preserveAspectRatio` left at its default: the viewBox now matches
                       the measured box, so there is no scale to correct for — and no
                       need for `vector-effect` anywhere, which is what lets the
                       dash-based draw-on resolve correctly. */}
                    <defs>
                <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={rgba(accent, 0.34)} />
                    <stop offset="100%" stopColor={rgba(accent, 0)} />
                </linearGradient>
            </defs>

            {/* Baseline grid — three hairlines, the same weight as TrendGraph. */}
            {[0.25, 0.5, 0.75].map((f) => (
                <line
                    key={f}
                    x1={PAD.left}
                    x2={W - PAD.right}
                    y1={PAD.top + (H - PAD.top - PAD.bottom) * f}
                    y2={PAD.top + (H - PAD.top - PAD.bottom) * f}
                    stroke="rgba(255,255,255,0.06)"
                    strokeWidth="1"
                />
            ))}

            <path d={geometry.area} fill={`url(#${fillId})`} className="spark-area" />

            {/* Peak — a dashed drop to the baseline: a reference, not a datum. */}
            <line
                x1={geometry.best.x}
                y1={geometry.best.y}
                x2={geometry.best.x}
                y2={geometry.base}
                stroke={rgba(accent, 0.35)}
                strokeWidth="1.5"
                strokeDasharray="3 4"
            />

            {/* Draws itself via `stroke-dasharray` in CSS. `--spark-len` is an
                over-estimate of the path length, which is safe: the pattern is
                one dash of that length plus one gap, so anything ≥ the true
                length still ends fully covered. */}
            <path
                d={geometry.line}
                fill="none"
                stroke={rgba(accent, 1)}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="spark-line"
                style={{
                    '--spark-len': geometry.length,
                    filter: `drop-shadow(0 0 6px ${rgba(accent, 0.65)})`,
                } as React.CSSProperties}
            />

            {/* Latest result — the number that matters now, so it glows. A real
                circle is fine now that the chart is no longer x-scaled; under
                the old stretch it rendered as a wide ellipse. */}
            <circle
                cx={geometry.last.x}
                cy={geometry.last.y}
                r={3.5}
                fill={rgba(accent, 1)}
                className="spark-head"
                style={{ filter: `drop-shadow(0 0 8px ${rgba(accent, 0.9)})` }}
            />
            </svg>
            )}
        </div>
    );
}

