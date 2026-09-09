// ═══════════════════════════════════════════════════════════════════════
//  FORM CHART PANEL — High-Performance Isolated Form Telemetry
//  ---------------------------------------------------------------------
//  Encapsulates recent form curves, mode filtering, and interactive hover
//  readouts. By isolating hoveredFormEntry and filter state within this
//  panel, crosshair movements and scroll-time pointer events never
//  trigger re-renders in the parent 1800+ line Operator Dossier.
// ═══════════════════════════════════════════════════════════════════════

import { memo, useMemo, useState } from 'react';
import { ArrowUpRight, BarChart3 } from 'lucide-react';
import { Panel, PanelHeading, EmptyNote, Delta } from '@/components/profile/DossierPieces';
import { InteractiveFormChart } from '@/components/profile/InteractiveFormChart';
import { rgba } from '@/lib/motion';
import type { HistoryEntry } from '@/lib/history';

/** How many recent tests the form curves plot. */
const TREND_WINDOW = 30;

/** Direction of travel through a series: mean of newest third vs oldest third. */
function thirdsDelta(values: number[]): number | null {
    if (values.length < 6) return null;
    const chunk = Math.max(2, Math.floor(values.length / 3));
    const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
    return Math.round(mean(values.slice(-chunk)) - mean(values.slice(0, chunk)));
}

export interface FormChartPanelProps {
    history: HistoryEntry[];
    accent: string;
    routeUsername?: string;
    navigate: (path: string) => void;
}

export const FormChartPanel = memo(function FormChartPanel({
    history,
    accent,
    routeUsername,
    navigate,
}: FormChartPanelProps) {
    const [selectedModeFilter, setSelectedModeFilter] = useState<string>('all');

    /** Unique modes discovered in history, sorted by test count. */
    const availableModes = useMemo(() => {
        const counts = new Map<string, { id: string; label: string; count: number }>();
        for (const e of history) {
            const id = `${e.mode}-${e.size}`;
            const label = e.mode === 'time' ? `${e.size}s` : `${e.size}w`;
            const existing = counts.get(id);
            if (existing) {
                existing.count++;
            } else {
                counts.set(id, { id, label, count: 1 });
            }
        }
        return Array.from(counts.values()).sort((a, b) => b.count - a.count);
    }, [history]);

    /** Filtered history based on selected mode. */
    const filteredHistory = useMemo(() => {
        if (selectedModeFilter === 'all') return history;
        return history.filter((e) => `${e.mode}-${e.size}` === selectedModeFilter);
    }, [history, selectedModeFilter]);

    /** The last TREND_WINDOW tests of filtered history, oldest first — what curves plot. */
    const trend = useMemo(
        () => filteredHistory.slice(-TREND_WINDOW).map((e) => ({ wpm: e.wpm, acc: e.acc })),
        [filteredHistory]
    );

    /** Full entries for the interactive chart (needs date, consistency, etc.). */
    const trendEntries = useMemo(
        () => filteredHistory.slice(-TREND_WINDOW),
        [filteredHistory]
    );

    /** Tracked hovered test point from InteractiveFormChart to surface stats in PanelHeading */
    const [hoveredFormEntry, setHoveredFormEntry] = useState<{ entry: HistoryEntry; idx: number } | null>(null);

    const trendDelta = useMemo(() => thirdsDelta(trend.map((p) => p.wpm)), [trend]);

    const accuracyDelta = useMemo(
        () => thirdsDelta(history.map((e) => e.acc).filter((a) => Number.isFinite(a))),
        [history]
    );

    /** Best and worst inside the plotted window, for the axis captions. */
    const trendBand = useMemo(() => {
        if (trend.length === 0) return null;
        const wpms = trend.map((p) => p.wpm);
        return { min: Math.min(...wpms), max: Math.max(...wpms) };
    }, [trend]);

    const accBand = useMemo(() => {
        if (trend.length === 0) return null;
        const accs = trend.map((p) => p.acc);
        return { min: Math.min(...accs), max: Math.max(...accs) };
    }, [trend]);

    const activeStat = hoveredFormEntry || (trendEntries.length > 0 ? {
        entry: trendEntries[trendEntries.length - 1],
        idx: trendEntries.length - 1,
    } : null);

    return (
        <Panel contain className="dsr-contain-chart">
            <PanelHeading
                title="Speed and accuracy"
                meta={
                    activeStat ? (
                        <div className="flex items-center gap-1.5 font-mono text-[13px] tracking-tight">
                            <span className="text-white/40 font-medium">#{activeStat.idx + 1}</span>
                            <span className="font-bold ml-0.5" style={{ color: rgba(accent, 1) }}>
                                {Math.round(activeStat.entry.wpm)} WPM
                            </span>
                            <span className="text-white/20">·</span>
                            <span className="font-medium text-white/80">
                                {Math.round(activeStat.entry.acc)}%
                            </span>
                            {activeStat.entry.cons != null && Number(activeStat.entry.cons) > 0 && (
                                <>
                                    <span className="text-white/20">·</span>
                                    <span className="text-white/50">
                                        {Math.round(activeStat.entry.cons)}% cons
                                    </span>
                                </>
                            )}
                        </div>
                    ) : (
                        trendBand && accBand
                            ? `${trendBand.min}–${trendBand.max} WPM · ${accBand.min}–${accBand.max}%`
                            : undefined
                    )
                }
                action={
                    <div className="flex items-center gap-2">
                        <Delta value={trendDelta} unit="WPM" />
                        <Delta value={accuracyDelta} unit="%" />
                        <button
                            type="button"
                            onClick={() => {
                                const path = routeUsername
                                    ? `/operator/${encodeURIComponent(routeUsername)}/analytics`
                                    : '/operator/analytics';
                                navigate(path);
                            }}
                            className="flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-mono font-medium tracking-wide uppercase transition-all bg-white/[0.04] hover:bg-white/[0.08] text-white/70 hover:text-white border border-white/10 hover:border-white/20"
                            title="Open full dedicated analytics by test mode"
                        >
                            <span>Full Analytics</span>
                            <ArrowUpRight className="w-3 h-3 text-white/50" />
                        </button>
                    </div>
                }
            />
            {availableModes.length > 1 && (
                <div className="-mx-4 sm:-mx-5 flex flex-wrap items-center gap-1.5 px-4 sm:px-5 pt-1 pb-3 border-b border-white/[0.04]">
                    <button
                        type="button"
                        onClick={() => {
                            setSelectedModeFilter('all');
                            setHoveredFormEntry(null);
                        }}
                        className={`px-2 py-0.5 rounded text-[11px] font-mono font-medium transition-all ${
                            selectedModeFilter === 'all'
                                ? 'bg-white/10 text-white shadow-sm'
                                : 'text-white/40 hover:text-white/70 hover:bg-white/[0.04]'
                        }`}
                        style={selectedModeFilter === 'all' ? {
                            color: rgba(accent, 1),
                            backgroundColor: rgba(accent, 0.12),
                            border: `1px solid ${rgba(accent, 0.25)}`,
                        } : { border: '1px solid transparent' }}
                    >
                        All ({history.length})
                    </button>
                    {availableModes.map((m) => {
                        const active = selectedModeFilter === m.id;
                        return (
                            <button
                                key={m.id}
                                type="button"
                                onClick={() => {
                                    setSelectedModeFilter(m.id);
                                    setHoveredFormEntry(null);
                                }}
                                className={`px-2 py-0.5 rounded text-[11px] font-mono font-medium transition-all ${
                                    active
                                        ? 'bg-white/10 text-white shadow-sm'
                                        : 'text-white/40 hover:text-white/70 hover:bg-white/[0.04]'
                                }`}
                                style={active ? {
                                    color: rgba(accent, 1),
                                    backgroundColor: rgba(accent, 0.12),
                                    border: `1px solid ${rgba(accent, 0.25)}`,
                                } : { border: '1px solid transparent' }}
                            >
                                {m.label} ({m.count})
                            </button>
                        );
                    })}
                </div>
            )}
            {trendEntries.length >= 2 ? (
                <div className="-mx-4 sm:-mx-5 -mb-4 sm:-mb-5 pt-2">
                    <InteractiveFormChart
                        entries={trendEntries}
                        accent={accent}
                        onHoverChange={setHoveredFormEntry}
                    />
                </div>
            ) : (
                <EmptyNote icon={BarChart3}>
                    Two completed tests draw a curve. Custom texts are excluded from
                    history, so drills do not count toward it.
                </EmptyNote>
            )}
        </Panel>
    );
});
