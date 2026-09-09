import { useMemo, useState } from 'react';
import {
    ArrowLeft, BarChart3,
    History as HistoryIcon,
} from 'lucide-react';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Theme } from '@/data/constants';
import type { HistoryEntry } from '@/lib/history';
import { InteractiveFormChart } from '@/components/profile/InteractiveFormChart';
import { Figure, FigureRow, Panel, PanelHeading, EmptyNote } from '@/components/profile/DossierPieces';

export interface OperatorAnalyticsProps {
    routeUsername: string | null;
    onBack: () => void;
    supabase: SupabaseClient | null;
    localUsername: string | null;
    viewerId?: string | null;
    theme: Theme;
    localRPGStats?: {
        level: number;
        xp: number;
        currentLevelProgress: number;
        xpNeeded: number;
        bestCombo?: number;
        history?: HistoryEntry[];
        personalBests?: Array<{ label: string; wpm: number }>;
        achievements?: string[];
    };
    onRaceGhost?: (modeKey: string, operatorId: string, username: string) => void;
}

interface ModeStat {
    id: string;
    label: string;
    mode: 'time' | 'words' | string;
    size: number;
    count: number;
}

export function OperatorAnalytics({
    routeUsername,
    onBack,
    localUsername,
    theme,
    localRPGStats,
}: OperatorAnalyticsProps) {
    const targetUsername = routeUsername || localUsername || 'Operator';
    const accent = theme.glowPrimary;

    const history = useMemo<HistoryEntry[]>(() => {
        return localRPGStats?.history ?? [];
    }, [localRPGStats?.history]);

    // Discover all unique test modes present in history
    const availableModes = useMemo<ModeStat[]>(() => {
        const map = new Map<string, ModeStat>();
        for (const e of history) {
            const id = `${e.mode}-${e.size}`;
            const label = e.mode === 'time' ? `Time ${e.size}s` : `Words ${e.size}`;
            const cur = map.get(id);
            if (cur) {
                cur.count++;
            } else {
                map.set(id, { id, label, mode: e.mode, size: e.size, count: 1 });
            }
        }
        return Array.from(map.values()).sort((a, b) => b.count - a.count);
    }, [history]);

    const [selectedMode, setSelectedMode] = useState<string>('all');
    const [hoveredEntry, setHoveredEntry] = useState<{ entry: HistoryEntry; idx: number } | null>(null);

    // Filter tests by selected mode
    const filteredEntries = useMemo(() => {
        if (selectedMode === 'all') return history;
        return history.filter((e) => `${e.mode}-${e.size}` === selectedMode);
    }, [history, selectedMode]);

    // Metrics for the active filter
    const metrics = useMemo(() => {
        if (filteredEntries.length === 0) {
            return {
                pb: 0,
                avgWpm: 0,
                avgAcc: 0,
                avgCons: 0,
                totalTests: 0,
                totalWords: 0,
            };
        }
        const wpms = filteredEntries.map((e) => e.wpm);
        const accs = filteredEntries.map((e) => e.acc);
        const conss = filteredEntries.map((e) => e.cons).filter((c) => c != null && Number.isFinite(c));

        const pb = Math.round(Math.max(...wpms));
        const avgWpm = Math.round(wpms.reduce((a, b) => a + b, 0) / wpms.length);
        const avgAcc = Math.round(accs.reduce((a, b) => a + b, 0) / accs.length);
        const avgCons = conss.length > 0 ? Math.round(conss.reduce((a, b) => a + b, 0) / conss.length) : 0;
        const totalWords = filteredEntries.reduce((sum, e) => sum + (e.size || 0), 0);

        return {
            pb,
            avgWpm,
            avgAcc,
            avgCons,
            totalTests: filteredEntries.length,
            totalWords,
        };
    }, [filteredEntries]);

    // Recent 100 tests plotted on the widescreen chart
    const chartEntries = useMemo(() => {
        return filteredEntries.slice(-100);
    }, [filteredEntries]);

    // Chronological test run logs, newest first
    const tableEntries = useMemo(() => {
        return [...filteredEntries].reverse();
    }, [filteredEntries]);

    const activeStat = hoveredEntry || (chartEntries.length > 0 ? {
        entry: chartEntries[chartEntries.length - 1],
        idx: chartEntries.length - 1,
    } : null);

    return (
        <div
            style={{ '--dsr-accent': accent } as React.CSSProperties}
            className="dsr-scope fixed inset-0 top-[var(--nav-h)] z-[var(--z-content)] overflow-y-auto custom-scrollbar bg-[#080809] text-white select-none"
        >
            <div className="dsr-container w-full max-w-full px-6 py-8 flex flex-col gap-6">
                {/* ── Top Bar / Header ── */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-6">
                    <div className="flex items-center gap-4">
                        <button
                            type="button"
                            onClick={onBack}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono font-medium text-white/70 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 transition-all cursor-pointer"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            <span>Dossier</span>
                        </button>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl font-bold tracking-tight text-white font-mono uppercase">
                                    Operator Analytics
                                </h1>
                                <span
                                    className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider font-semibold border"
                                    style={{
                                        color: `rgb(${accent})`,
                                        borderColor: `rgba(${accent}, 0.3)`,
                                        backgroundColor: `rgba(${accent}, 0.1)`,
                                    }}
                                >
                                    {targetUsername}
                                </span>
                            </div>
                            <p className="text-xs text-white/40 font-mono mt-0.5">
                                Mode-segmented telemetry · Speed, accuracy, and form progression
                            </p>
                        </div>
                    </div>
                </div>

                {/* ── Mode Selection Strip (Tabs) ── */}
                <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1">
                    <button
                        type="button"
                        onClick={() => {
                            setSelectedMode('all');
                            setHoveredEntry(null);
                        }}
                        className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-mono font-medium whitespace-nowrap transition-all cursor-pointer border ${
                            selectedMode === 'all'
                                ? 'bg-white/10 text-white shadow-sm'
                                : 'text-white/40 hover:text-white/80 hover:bg-white/[0.04] border-transparent'
                        }`}
                        style={selectedMode === 'all' ? {
                            color: `rgb(${accent})`,
                            backgroundColor: `rgba(${accent}, 0.12)`,
                            borderColor: `rgba(${accent}, 0.35)`,
                        } : {}}
                    >
                        <span>All Modes</span>
                        <span className="text-[10px] opacity-60 bg-white/10 px-1.5 py-0.2 rounded-full">
                            {history.length}
                        </span>
                    </button>

                    {availableModes.map((m) => {
                        const active = selectedMode === m.id;
                        return (
                            <button
                                key={m.id}
                                type="button"
                                onClick={() => {
                                    setSelectedMode(m.id);
                                    setHoveredEntry(null);
                                }}
                                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-mono font-medium whitespace-nowrap transition-all cursor-pointer border ${
                                    active
                                        ? 'bg-white/10 text-white shadow-sm'
                                        : 'text-white/40 hover:text-white/80 hover:bg-white/[0.04] border-transparent'
                                }`}
                                style={active ? {
                                    color: `rgb(${accent})`,
                                    backgroundColor: `rgba(${accent}, 0.12)`,
                                    borderColor: `rgba(${accent}, 0.35)`,
                                } : {}}
                            >
                                <span>{m.label}</span>
                                <span className="text-[10px] opacity-60 bg-white/10 px-1.5 py-0.2 rounded-full">
                                    {m.count}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* ── Key Figures for Selected Mode ── */}
                <Panel>
                    <PanelHeading
                        title="Aggregate Telemetry"
                        meta={`${metrics.totalTests} tests · ${metrics.totalWords.toLocaleString()} words typed`}
                    />
                    <FigureRow cols={4}>
                        <Figure
                            label="Personal Best"
                            value={metrics.pb}
                            unit="WPM"
                            accent={accent}
                            caption={selectedMode === 'all' ? 'All-time peak' : 'Best in this mode'}
                            animate={false}
                        />
                        <Figure
                            label="Average Speed"
                            value={metrics.avgWpm}
                            unit="WPM"
                            accent={accent}
                            caption={`Mean over ${metrics.totalTests} runs`}
                            animate={false}
                        />
                        <Figure
                            label="Average Accuracy"
                            value={metrics.avgAcc}
                            unit="%"
                            caption="Precision baseline"
                            animate={false}
                        />
                        <Figure
                            label="Consistency"
                            value={metrics.avgCons}
                            unit="%"
                            caption="Smoothness index"
                            animate={false}
                        />
                    </FigureRow>
                </Panel>

                {/* ── Expansive 2-Line Chart Panel ── */}
                <Panel>
                    <PanelHeading
                        title={selectedMode === 'all' ? 'Speed & Accuracy (All Modes)' : `Form Curve — ${availableModes.find(m => m.id === selectedMode)?.label || selectedMode}`}
                        meta={
                            activeStat ? (
                                <div className="flex items-center gap-2 font-mono text-xs tracking-tight">
                                    <span className="text-white/40 font-medium">#{activeStat.idx + 1}</span>
                                    <span className="font-bold" style={{ color: `rgb(${accent})` }}>
                                        {Math.round(activeStat.entry.wpm)} WPM
                                    </span>
                                    <span className="text-white/20">·</span>
                                    <span className="font-medium text-white/80">
                                        {Math.round(activeStat.entry.acc)}% ACC
                                    </span>
                                    {activeStat.entry.cons != null && Number(activeStat.entry.cons) > 0 && (
                                        <>
                                            <span className="text-white/20">·</span>
                                            <span className="text-white/50">
                                                {Math.round(activeStat.entry.cons)}% CONS
                                            </span>
                                        </>
                                    )}
                                </div>
                            ) : undefined
                        }
                    />

                    {chartEntries.length >= 2 ? (
                        <div className="-mx-4 sm:-mx-5 -mb-4 sm:-mb-5 pt-2">
                            <InteractiveFormChart
                                entries={chartEntries}
                                accent={accent}
                                onHoverChange={setHoveredEntry}
                                height={280}
                            />
                        </div>
                    ) : (
                        <EmptyNote icon={BarChart3}>
                            At least two completed tests in this mode are required to draw the trajectory.
                        </EmptyNote>
                    )}
                </Panel>

                {/* ── Test Runs Log Table ── */}
                <Panel>
                    <PanelHeading
                        title="Completed Test History"
                        meta={`${tableEntries.length} total logs`}
                    />
                    {tableEntries.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left font-mono text-xs">
                                <thead>
                                    <tr className="border-b border-white/[0.08] text-white/40 text-[11px] uppercase tracking-wider">
                                        <th className="py-2.5 px-3">#</th>
                                        <th className="py-2.5 px-3">Mode</th>
                                        <th className="py-2.5 px-3">Speed</th>
                                        <th className="py-2.5 px-3">Accuracy</th>
                                        <th className="py-2.5 px-3">Consistency</th>
                                        <th className="py-2.5 px-3 text-right">Date</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/[0.04]">
                                    {tableEntries.slice(0, 50).map((entry, idx) => {
                                        const dateStr = (() => {
                                            try {
                                                const d = new Date(entry.d);
                                                return d.toLocaleDateString(undefined, {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                });
                                            } catch {
                                                return entry.d;
                                            }
                                        })();
                                        const modeLabel = entry.mode === 'time' ? `${entry.size}s` : `${entry.size}w`;

                                        return (
                                            <tr
                                                key={`hist-${idx}`}
                                                className="hover:bg-white/[0.02] transition-colors"
                                            >
                                                <td className="py-2.5 px-3 text-white/30">
                                                    {tableEntries.length - idx}
                                                </td>
                                                <td className="py-2.5 px-3 text-white/70">
                                                    <span className="px-1.5 py-0.5 rounded bg-white/[0.05] border border-white/[0.08] text-[10px]">
                                                        {modeLabel}
                                                    </span>
                                                </td>
                                                <td className="py-2.5 px-3 font-semibold" style={{ color: `rgb(${accent})` }}>
                                                    {Math.round(entry.wpm)} <span className="text-[10px] font-normal opacity-60">WPM</span>
                                                </td>
                                                <td className="py-2.5 px-3 text-white/80">
                                                    {Math.round(entry.acc)}%
                                                </td>
                                                <td className="py-2.5 px-3 text-white/50">
                                                    {entry.cons != null && Number(entry.cons) > 0 ? `${Math.round(entry.cons)}%` : '—'}
                                                </td>
                                                <td className="py-2.5 px-3 text-right text-white/40 text-[11px]">
                                                    {dateStr}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <EmptyNote icon={HistoryIcon}>
                            No test entries recorded yet.
                        </EmptyNote>
                    )}
                </Panel>
            </div>
        </div>
    );
}
