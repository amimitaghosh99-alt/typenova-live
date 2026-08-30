// ═══════════════════════════════════════════════════════════════════════
//  RACE CHART — every racer's pace, on one set of axes
//  ---------------------------------------------------------------------
//  Replaces the multiplayer half of `graphs/WpmGraph`, which was built for a
//  solo result and had competitor support bolted on. Three things were wrong
//  with it in a race, all of them visible:
//
//  1. It bailed out with `if (safePts.length < 2) return null` — and `safePts`
//     is *your* curve. One short or missing self timeline erased the entire
//     graph, including every opponent line that had arrived fine.
//  2. It drew into a fixed 800-unit viewBox and stretched it to the container,
//     so stroke widths, dash patterns and dot radii all scaled with the card's
//     width. This chart measures its box and draws 1:1.
//  3. Its overtake detection walked *your* raw sample times and interpolated
//     everyone else at each one, so the lead changes it found depended on how
//     densely your own client happened to sample.
//
//  Everything here reads from one resampled matrix on a shared time grid, which
//  is what makes the series comparable at all: racers finish at different
//  moments and their clients sample at different rates.
// ═══════════════════════════════════════════════════════════════════════

import { useEffect, useMemo, useRef, useState } from 'react';
import { Flag, TrendingUp } from 'lucide-react';
import {
    GRID,
    findOvertakes,
    niceStep,
    resample,
    smooth,
} from './raceChartMath';
import type { RaceMarker } from './raceColors';
import { ChartMarker, MarkerSwatch } from './RaceMarkerGlyph';

/** One racer's curve, plus what the chart needs to label and end it. */
export interface RaceSeries {
    id: string;
    name: string;
    isSelf: boolean;
    /** Already resolved by the caller, so the chart and the cards agree. */
    color: string;
    /**
     * Shape half of this racer's identity. Carried alongside the colour so the
     * chart never depends on hue alone to say whose line is whose.
     */
    marker: RaceMarker;
    points: Array<{ t: number; wpm: number }>;
    /** When they crossed the line. Absent for a DNF. */
    finishMs?: number;
}

/** What the y-axis measures. */
export type RaceMetric = 'wpm' | 'gap';

const PAD = { top: 18, right: 16, bottom: 30, left: 44 };

/**
 * Markers along each curve, so a line can be identified without colour.
 *
 * Sparse on purpose: one per ~24 grid slots is enough to read the shape while
 * leaving the curve itself legible. Offset per series so two racers at the same
 * pace do not stack their markers on the same x.
 */
const MARKER_STRIDE = 24;

/* ─── Component ────────────────────────────────────────────────────────── */

export function RaceChart({
    series,
    durationMs,
    metric = 'wpm',
    /** Id whose curve reads as the reference line in `gap` mode. */
    baselineId,
    height = 260,
}: {
    series: RaceSeries[];
    durationMs: number;
    metric?: RaceMetric;
    baselineId?: string;
    height?: number;
}) {
    /**
     * Measured width, so the chart draws 1:1 instead of being stretched.
     * A stretched viewBox scales stroke widths and dot radii with the container,
     * which is why the old graph's lines thickened on a wide screen.
     */
    const hostRef = useRef<HTMLDivElement | null>(null);
    const [width, setWidth] = useState(0);
    useEffect(() => {
        const node = hostRef.current;
        if (!node) return;
        const observer = new ResizeObserver((entries) => {
            const next = Math.round(entries[0].contentRect.width);
            if (next > 0) setWidth(next);
        });
        observer.observe(node);
        return () => observer.disconnect();
    }, []);

    const W = width || 760;
    const H = height;

    /** Which grid slot the pointer is over. `null` when it is outside the plot. */
    const [hoverIndex, setHoverIndex] = useState<number | null>(null);

    const safeDuration = Math.max(durationMs || 0, 1000);

    const model = useMemo(() => {
        /* Drawn even when a series is empty. The old graph returned `null` if
           *your* curve was short, which erased every opponent line too — the
           single most common way this chart appeared "broken". */
        const drawable = series.filter((s) => s.points.length > 0);
        const grid = resample(drawable, safeDuration);

        const plotW = W - PAD.left - PAD.right;
        const plotH = H - PAD.top - PAD.bottom;

        const baseline = baselineId && grid.values.has(baselineId)
            ? grid.values.get(baselineId)!
            : null;

        /** In `gap` mode a series is plotted as its delta from the baseline. */
        const shaped = new Map<string, Array<number | null>>();
        for (const s of drawable) {
            const raw = grid.values.get(s.id) ?? [];
            shaped.set(
                s.id,
                metric === 'gap' && baseline
                    ? raw.map((v, i) => (v == null || baseline[i] == null ? null : v - baseline[i]!))
                    : raw,
            );
        }

        let min = 0;
        let max = 10;
        for (const arr of shaped.values()) {
            for (const v of arr) {
                if (v == null) continue;
                if (v > max) max = v;
                if (v < min) min = v;
            }
        }
        if (metric === 'gap') {
            // Symmetric around zero, so "ahead" and "behind" are the same
            // distance from the centre line and the chart cannot mislead.
            const reach = Math.max(Math.abs(min), Math.abs(max), 5);
            min = -reach;
            max = reach;
        } else {
            max = max * 1.08;
        }

        const range = Math.max(max - min, 1);
        const px = (t: number) => PAD.left + (t / safeDuration) * plotW;
        const py = (v: number) => PAD.top + (1 - (v - min) / range) * plotH;

        const paths = drawable.map((s, seriesIdx) => {
            const arr = shaped.get(s.id) ?? [];
            /* Split on gaps rather than bridging them: a racer whose payload
               arrived in two pieces must not get a straight line drawn across
               the hole as though they typed it. */
            const runs: Array<Array<{ x: number; y: number }>> = [];
            let run: Array<{ x: number; y: number }> = [];
            arr.forEach((v, i) => {
                if (v == null) {
                    if (run.length > 0) runs.push(run);
                    run = [];
                    return;
                }
                run.push({ x: px(grid.times[i]), y: py(v) });
            });
            if (run.length > 0) runs.push(run);

            /* Identity markers along the curve. Staggered by series index so
               two racers running the same pace don't stack markers on one x. */
            const offset = Math.round((MARKER_STRIDE / Math.max(drawable.length, 1)) * seriesIdx);
            const markers: Array<{ x: number; y: number }> = [];
            arr.forEach((v, i) => {
                if (v == null) return;
                if ((i + MARKER_STRIDE - offset) % MARKER_STRIDE !== 0) return;
                // Skipped near the ends: slot 0 collides with the y-axis and the
                // last slot with the finish marker.
                if (i < 4 || i > GRID - 5) return;
                markers.push({ x: px(grid.times[i]), y: py(v) });
            });

            const lastRun = runs[runs.length - 1];
            return {
                series: s,
                d: runs.map(smooth).join(' '),
                markers,
                end: lastRun ? lastRun[lastRun.length - 1] : null,
            };
        });

        const step = niceStep(range, 5);
        const ticks: Array<{ v: number; y: number }> = [];
        for (let v = Math.ceil(min / step) * step; v <= max; v += step) {
            ticks.push({ v, y: py(v) });
        }

        const totalSecs = safeDuration / 1000;
        const xStepSecs = Math.max(1, Math.ceil(totalSecs / 6));
        const xTicks: Array<{ sec: number; x: number }> = [];
        for (let s = 0; s <= totalSecs; s += xStepSecs) {
            xTicks.push({ sec: s, x: px(s * 1000) });
        }

        return {
            grid, shaped, paths, ticks, xTicks, px, py, min, max,
            overtakes: findOvertakes(grid),
            drawable,
            zeroY: py(0),
        };
    }, [series, safeDuration, W, H, metric, baselineId]);


    if (model.drawable.length === 0) {
        return (
            <div
                className="flex items-center justify-center rounded-2xl border border-white/[0.06] bg-black/20 px-4 text-center"
                style={{ height: H }}
            >
                <p className="max-w-[38ch] font-mono text-[10px] uppercase leading-relaxed tracking-[0.16em] text-white/30">
                    No pace data arrived for this race yet.
                </p>
            </div>
        );
    }

    /** Grid slot nearest the pointer, from its x offset inside the plot. */
    const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * W;
        const frac = (x - PAD.left) / (W - PAD.left - PAD.right);
        if (frac < 0 || frac > 1) {
            setHoverIndex(null);
            return;
        }
        setHoverIndex(Math.round(frac * (GRID - 1)));
    };

    const hoverT = hoverIndex != null ? model.grid.times[hoverIndex] : null;
    const hoverRows = hoverIndex == null
        ? []
        : model.drawable
            .map((s) => ({
                series: s,
                value: model.shaped.get(s.id)?.[hoverIndex] ?? null,
                isLeader: model.grid.leaders[hoverIndex] === s.id,
            }))
            .filter((r) => r.value != null)
            .sort((a, b) => (b.value as number) - (a.value as number));

    /**
     * Text equivalent of the plot.
     *
     * An SVG of paths conveys nothing to a screen reader, and the scrub readout
     * is pointer-driven so it is unreachable by keyboard. This states the same
     * facts — peak and final pace per racer — as ordinary text.
     */
    const summary = model.drawable.map((s) => {
        const arr = (model.grid.values.get(s.id) ?? []).filter((v): v is number => v != null);
        const peak = arr.length > 0 ? Math.max(...arr) : 0;
        const final = arr.length > 0 ? arr[arr.length - 1] : 0;
        return { s, peak: Math.round(peak), final: Math.round(final) };
    });

    return (
        <div ref={hostRef} className="w-full">
            <svg
                viewBox={`0 0 ${W} ${H}`}
                width={W}
                height={H}
                className="block touch-none"
                /* Pointer events, not mouse: this is the one chart people will
                   try to scrub on a phone after a race. */
                onPointerMove={onMove}
                onPointerLeave={() => setHoverIndex(null)}
                /* Presentational: the paths carry no information a screen reader
                   can use. The text summary after the </svg> is the accessible
                   equivalent, so announcing both would just duplicate it. */
                aria-hidden
            >
                {/* Horizontal grid + axis labels */}
                {model.ticks.map((tick) => (
                    <g key={tick.v}>
                        <line
                            x1={PAD.left}
                            x2={W - PAD.right}
                            y1={tick.y}
                            y2={tick.y}
                            stroke="rgba(255,255,255,0.05)"
                            strokeWidth="1"
                        />
                        <text
                            x={PAD.left - 8}
                            y={tick.y + 3}
                            textAnchor="end"
                            fill="rgba(255,255,255,0.28)"
                            fontSize="9"
                            fontWeight="700"
                            fontFamily="ui-monospace, monospace"
                        >
                            {metric === 'gap' && tick.v > 0 ? `+${Math.round(tick.v)}` : Math.round(tick.v)}
                        </text>
                    </g>
                ))}

                {/* Zero line in gap mode — the reference racer's own pace. */}
                {metric === 'gap' && (
                    <line
                        x1={PAD.left}
                        x2={W - PAD.right}
                        y1={model.zeroY}
                        y2={model.zeroY}
                        stroke="rgba(255,255,255,0.22)"
                        strokeWidth="1.5"
                        strokeDasharray="5 4"
                    />
                )}

                {model.xTicks.map((tick) => (
                    <text
                        key={tick.sec}
                        x={tick.x}
                        y={H - 10}
                        textAnchor="middle"
                        fill="rgba(255,255,255,0.28)"
                        fontSize="9"
                        fontWeight="700"
                        fontFamily="ui-monospace, monospace"
                    >
                        {tick.sec}s
                    </text>
                ))}

                {/* Lead changes, as vertical ticks behind the curves. */}
                {model.overtakes.map((o, i) => (
                    <line
                        key={`ot-${i}`}
                        x1={model.px(o.t)}
                        x2={model.px(o.t)}
                        y1={PAD.top}
                        y2={H - PAD.bottom}
                        stroke="rgba(255,255,255,0.14)"
                        strokeWidth="1"
                        strokeDasharray="2 5"
                    />
                ))}

                {/* Curves. Self last so it is never buried under an opponent. */}
                {[...model.paths]
                    .sort((a, b) => Number(a.series.isSelf) - Number(b.series.isSelf))
                    .map(({ series: s, d, markers, end }) => (
                        <g key={s.id}>
                            <path
                                d={d}
                                fill="none"
                                stroke={s.color}
                                strokeWidth={s.isSelf ? 2.75 : 2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                opacity={s.isSelf ? 1 : 0.75}
                                style={s.isSelf ? { filter: `drop-shadow(0 0 6px ${s.color}80)` } : undefined}
                            />
                            {/* Identity markers: the non-colour channel that says
                                whose line this is. */}
                            {markers.map((m, i) => (
                                <ChartMarker
                                    key={`m-${i}`}
                                    marker={s.marker}
                                    color={s.color}
                                    x={m.x}
                                    y={m.y}
                                    r={s.isSelf ? 3.4 : 3}
                                />
                            ))}
                            {/* Finish marker, drawn larger in the racer's own shape.
                                Only for a racer who actually finished — a DNF's
                                line simply stops. */}
                            {end && s.finishMs != null && (
                                <ChartMarker
                                    marker={s.marker}
                                    color={s.color}
                                    x={end.x}
                                    y={end.y}
                                    r={s.isSelf ? 5 : 4.4}
                                />
                            )}
                        </g>
                    ))}

                {/* Scrub line + per-racer readout */}
                {hoverIndex != null && hoverT != null && (
                    <g pointerEvents="none">
                        <line
                            x1={model.px(hoverT)}
                            x2={model.px(hoverT)}
                            y1={PAD.top}
                            y2={H - PAD.bottom}
                            stroke="rgba(255,255,255,0.35)"
                            strokeWidth="1"
                        />
                        {hoverRows.map((row) => (
                            <ChartMarker
                                key={row.series.id}
                                marker={row.series.marker}
                                color={row.series.color}
                                x={model.px(hoverT)}
                                y={model.py(row.value as number)}
                                r={row.isLeader ? 5 : 4}
                            />
                        ))}
                    </g>
                )}
            </svg>

            {/* Screen-reader equivalent of the plot above. */}
            <p className="sr-only">
                {`Pace chart, ${Math.round(safeDuration / 1000)} seconds. `}
                {summary
                    .map(({ s, peak, final }) =>
                        `${s.isSelf ? 'You' : s.name}: peak ${peak} WPM, finished at ${final} WPM.`)
                    .join(' ')}
                {model.overtakes.length > 0
                    ? ` ${model.overtakes.length} lead change${model.overtakes.length === 1 ? '' : 's'}.`
                    : ' No lead changes.'}
            </p>

            {/* Readout below the plot, not floating over it: an SVG tooltip has
                to be clamped at both edges and still ends up covering the curve
                it describes. Fixed min height so the chart never jumps on hover. */}
            <div className="mt-2 flex min-h-[34px] flex-wrap items-center gap-x-4 gap-y-1 px-1">
                {hoverIndex == null ? (
                    <span className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.2em] text-white/25">
                        <TrendingUp size={11} />
                        {metric === 'gap' ? 'WPM relative to you' : 'WPM over time'}
                        {model.overtakes.length > 0 && (
                            <span className="text-white/40">
                                · {model.overtakes.length} lead change{model.overtakes.length === 1 ? '' : 's'}
                            </span>
                        )}
                    </span>
                ) : (
                    <>
                        <span className="font-mono text-[9px] font-black uppercase tracking-[0.2em] text-white/40">
                            {(hoverT! / 1000).toFixed(1)}s
                        </span>
                        {hoverRows.map((row) => (
                            <span key={row.series.id} className="flex items-center gap-1.5">
                                <MarkerSwatch marker={row.series.marker} color={row.series.color} size={10} />
                                <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-white/45">
                                    {row.series.isSelf ? 'You' : row.series.name}
                                </span>
                                <span className="font-sans text-[12px] font-black text-white">
                                    {metric === 'gap' && (row.value as number) > 0 ? '+' : ''}
                                    {Math.round(row.value as number)}
                                </span>
                                {row.isLeader && metric === 'wpm' && (
                                    <Flag size={9} className="text-amber-300" />
                                )}
                            </span>
                        ))}
                    </>
                )}
            </div>
        </div>
    );
}

