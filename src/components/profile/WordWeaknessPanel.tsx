// ═══════════════════════════════════════════════════════════════════════
//  WORD WEAKNESS & SPACED REPETITION COMMAND DECK
//  ---------------------------------------------------------------------
//  High-density 2-column telemetry dashboard tracking motor sequence
//  fumbles and automating 6-stage Leitner spaced repetition review.
//  Includes per-word latency/WPM telemetry, 5-pip visual stage meters,
//  and instant single-word micro-drill triggers.
// ═══════════════════════════════════════════════════════════════════════

import { memo, useMemo, useState } from 'react';
import {
    BookOpenText,
    CalendarClock,
    CheckCircle2,
    Play,
    Sparkles,
    Zap,
} from 'lucide-react';
import { MIN_OBSERVATIONS, type WordWeaknessMap } from '@/lib/wordWeakness';
import { rgba } from './profileMotion';

export type WordFilterMode = 'due' | 'weakest' | 'training' | 'mastered' | 'all';

export interface WordWeaknessPanelProps {
    data: WordWeaknessMap;
    /** Words whose review date has arrived (weakest box first). */
    due: string[];
    accent: string;
    /** Absent for a guest or someone else's dossier. */
    onStartWordDrill?: (words: string[]) => void;
}

export const WordWeaknessPanel = memo(function WordWeaknessPanel({
    data,
    due,
    accent,
    onStartWordDrill,
}: WordWeaknessPanelProps) {
    const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

    // ── Enriched Word Telemetry ──────────────────────────────────────
    const allWords = useMemo(() => {
        return Object.entries(data)
            .filter(([, s]) => s.total >= MIN_OBSERVATIONS && s.errors > 0)
            .map(([word, s]) => {
                const total = Math.max(1, s.total);
                const rate = s.errors / total;
                const errorPercent = Math.round(rate * 100);
                const box = Math.min(5, Math.max(0, s.box ?? 0));
                const isDue = s.due <= today;

                // Derive typing latency and estimated speed on this specific word
                const avgMsPerChar = s.totalMs > 0 ? Math.round(s.totalMs / total) : null;
                const wpm = avgMsPerChar && avgMsPerChar > 40 && avgMsPerChar < 1500
                    ? Math.round(12000 / avgMsPerChar)
                    : null;

                // Relative due days label
                let dueLabel = 'Due today';
                if (box === 5) {
                    dueLabel = 'Mastered';
                } else if (!isDue) {
                    const diffDays = Math.ceil(
                        (new Date(s.due).getTime() - new Date(today).getTime()) / (1000 * 3600 * 24)
                    );
                    dueLabel = diffDays <= 1 ? 'Tomorrow' : `In ${diffDays}d`;
                }

                return {
                    word,
                    rate,
                    errorPercent,
                    errors: s.errors,
                    total: s.total,
                    box,
                    due: s.due,
                    isDue,
                    dueLabel,
                    avgMsPerChar,
                    wpm,
                };
            });
    }, [data, today]);

    // ── Spaced Repetition Retention Distribution ────────────────────
    const retentionStats = useMemo(() => {
        const total = allWords.length;
        const box0 = allWords.filter((w) => w.box === 0).length;
        const learning = allWords.filter((w) => w.box >= 1 && w.box <= 2).length;
        const retaining = allWords.filter((w) => w.box >= 3 && w.box <= 4).length;
        const mastered = allWords.filter((w) => w.box === 5).length;
        const dueCount = due.length;

        return {
            total,
            box0,
            learning,
            retaining,
            mastered,
            dueCount,
        };
    }, [allWords, due]);

    // ── Active Filter Mode ──────────────────────────────────────────
    const [filterMode, setFilterMode] = useState<WordFilterMode>(() => {
        return due.length > 0 ? 'due' : 'weakest';
    });

    const filteredWords = useMemo(() => {
        switch (filterMode) {
            case 'due':
                return allWords
                    .filter((w) => w.isDue)
                    .sort((a, b) => a.box - b.box || b.rate - a.rate);
            case 'weakest':
                return [...allWords].sort((a, b) => b.rate - a.rate || b.total - a.total).slice(0, 18);
            case 'training':
                return allWords
                    .filter((w) => w.box >= 1 && w.box <= 4)
                    .sort((a, b) => b.box - a.box || b.rate - a.rate);
            case 'mastered':
                return allWords
                    .filter((w) => w.box === 5)
                    .sort((a, b) => b.total - a.total);
            case 'all':
            default:
                return [...allWords].sort((a, b) => b.rate - a.rate);
        }
    }, [allWords, filterMode]);

    // ── Drill Launch Handlers ───────────────────────────────────────
    const handleTrainDue = () => {
        if (!onStartWordDrill || due.length === 0) return;
        void onStartWordDrill(due.slice(0, 10));
    };

    const handleTrainWeakest = () => {
        if (!onStartWordDrill || allWords.length === 0) return;
        const topWords = [...allWords]
            .sort((a, b) => b.rate - a.rate)
            .slice(0, 5)
            .map((w) => w.word);
        void onStartWordDrill(topWords);
    };

    const handleSingleWordDrill = (word: string) => {
        if (!onStartWordDrill) return;
        void onStartWordDrill([word]);
    };

    if (allWords.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-center">
                <div
                    className="flex h-12 w-12 items-center justify-center rounded-2xl border"
                    style={{
                        backgroundColor: rgba(accent, 0.08),
                        borderColor: rgba(accent, 0.2),
                    }}
                >
                    <BookOpenText size={22} style={{ color: rgba(accent, 0.9) }} />
                </div>
                <h4 className="mt-3 font-mono text-[13px] font-bold tracking-wide text-white/90">
                    No Tracked Fumbles Yet
                </h4>
                <p className="mt-1.5 max-w-md font-mono text-[11px] leading-relaxed text-white/40">
                    Words are registered automatically the first time a keystroke slips during standard tests.
                    Each fumbled word receives a 6-stage spaced review schedule to reinforce clean muscle memory.
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            {/* ── Top Bar: Minimalist Filter Pills & Primary Action ── */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
                {/* Minimalist Control Bar with small dot dividers */}
                <div className="flex flex-wrap items-center gap-1.5">
                    <button
                        type="button"
                        onClick={() => setFilterMode('due')}
                        className={`rounded px-2.5 py-1 font-mono text-[11px] font-medium transition-all ${
                            filterMode === 'due'
                                ? 'bg-white/10 text-white shadow-sm'
                                : 'text-white/40 hover:text-white/70 hover:bg-white/[0.04]'
                        }`}
                        style={filterMode === 'due' ? {
                            color: due.length > 0 ? '#f87171' : rgba(accent, 1),
                            backgroundColor: due.length > 0 ? 'rgba(239,68,68,0.12)' : rgba(accent, 0.12),
                            border: `1px solid ${due.length > 0 ? 'rgba(239,68,68,0.3)' : rgba(accent, 0.3)}`,
                        } : { border: '1px solid transparent' }}
                    >
                        Due Today ({retentionStats.dueCount})
                    </button>

                    <span className="h-1.5 w-1.5 rounded-full bg-white/10" aria-hidden />

                    <button
                        type="button"
                        onClick={() => setFilterMode('weakest')}
                        className={`rounded px-2.5 py-1 font-mono text-[11px] font-medium transition-all ${
                            filterMode === 'weakest'
                                ? 'bg-white/10 text-white shadow-sm'
                                : 'text-white/40 hover:text-white/70 hover:bg-white/[0.04]'
                        }`}
                        style={filterMode === 'weakest' ? {
                            color: rgba(accent, 1),
                            backgroundColor: rgba(accent, 0.12),
                            border: `1px solid ${rgba(accent, 0.3)}`,
                        } : { border: '1px solid transparent' }}
                    >
                        Top Fumbles ({Math.min(18, allWords.length)})
                    </button>

                    <span className="h-1.5 w-1.5 rounded-full bg-white/10" aria-hidden />

                    <button
                        type="button"
                        onClick={() => setFilterMode('training')}
                        className={`rounded px-2.5 py-1 font-mono text-[11px] font-medium transition-all ${
                            filterMode === 'training'
                                ? 'bg-white/10 text-white shadow-sm'
                                : 'text-white/40 hover:text-white/70 hover:bg-white/[0.04]'
                        }`}
                        style={filterMode === 'training' ? {
                            color: rgba(accent, 1),
                            backgroundColor: rgba(accent, 0.12),
                            border: `1px solid ${rgba(accent, 0.3)}`,
                        } : { border: '1px solid transparent' }}
                    >
                        In Training ({retentionStats.learning + retentionStats.retaining})
                    </button>

                    <span className="h-1.5 w-1.5 rounded-full bg-white/10" aria-hidden />

                    <button
                        type="button"
                        onClick={() => setFilterMode('mastered')}
                        className={`rounded px-2.5 py-1 font-mono text-[11px] font-medium transition-all ${
                            filterMode === 'mastered'
                                ? 'bg-white/10 text-white shadow-sm'
                                : 'text-white/40 hover:text-white/70 hover:bg-white/[0.04]'
                        }`}
                        style={filterMode === 'mastered' ? {
                            color: '#34d399',
                            backgroundColor: 'rgba(52,211,153,0.12)',
                            border: '1px solid rgba(52,211,153,0.3)',
                        } : { border: '1px solid transparent' }}
                    >
                        Mastered ({retentionStats.mastered})
                    </button>

                    <span className="h-1.5 w-1.5 rounded-full bg-white/10" aria-hidden />

                    <button
                        type="button"
                        onClick={() => setFilterMode('all')}
                        className={`rounded px-2.5 py-1 font-mono text-[11px] font-medium transition-all ${
                            filterMode === 'all'
                                ? 'bg-white/10 text-white shadow-sm'
                                : 'text-white/40 hover:text-white/70 hover:bg-white/[0.04]'
                        }`}
                        style={filterMode === 'all' ? {
                            color: rgba(accent, 1),
                            backgroundColor: rgba(accent, 0.12),
                            border: `1px solid ${rgba(accent, 0.3)}`,
                        } : { border: '1px solid transparent' }}
                    >
                        All ({allWords.length})
                    </button>
                </div>

                {/* Primary Action Button */}
                {onStartWordDrill && (
                    <div className="flex items-center gap-2">
                        {due.length > 0 ? (
                            <button
                                type="button"
                                onClick={handleTrainDue}
                                className="flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider transition-all shadow-sm hover:brightness-110 active:scale-95"
                                style={{
                                    backgroundColor: rgba(accent, 0.16),
                                    borderColor: rgba(accent, 0.4),
                                    borderWidth: 1,
                                    color: rgba(accent, 1),
                                }}
                            >
                                <Zap size={12} className="fill-current" />
                                <span>Review Due Queue ({due.length})</span>
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={handleTrainWeakest}
                                className="flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider transition-all shadow-sm hover:brightness-110 active:scale-95 bg-white/[0.06] hover:bg-white/[0.1] text-white/80 border border-white/15"
                            >
                                <Sparkles size={12} className="text-white/70" />
                                <span>Drill Top Fumbles</span>
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* ── 2-Column Responsive Command Deck ── */}
            <div className="flex flex-col lg:flex-row items-start gap-4">
                {/* ── Left Column: Telemetry & Retention Hub (~300px) ── */}
                <div className="w-full lg:w-80 shrink-0 flex flex-col gap-3 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
                    {/* Review Schedule Hero Status */}
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <span className="font-mono text-[10px] uppercase tracking-wider text-white/40 flex items-center gap-1.5">
                                <CalendarClock size={12} style={{ color: rgba(accent, 0.9) }} />
                                Spaced Review
                            </span>
                            <div className="mt-1 flex items-baseline gap-2">
                                <span className="font-mono text-[22px] font-bold text-white tracking-tight">
                                    {retentionStats.dueCount}
                                </span>
                                <span className="font-mono text-[11px] text-white/50">
                                    {retentionStats.dueCount === 1 ? 'word due today' : 'words due today'}
                                </span>
                            </div>
                        </div>

                        <span
                            className="rounded px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wide"
                            style={{
                                color: retentionStats.dueCount > 0 ? '#f87171' : '#34d399',
                                backgroundColor: retentionStats.dueCount > 0 ? 'rgba(239,68,68,0.1)' : 'rgba(52,211,153,0.1)',
                                border: `1px solid ${retentionStats.dueCount > 0 ? 'rgba(239,68,68,0.25)' : 'rgba(52,211,153,0.25)'}`,
                            }}
                        >
                            {retentionStats.dueCount > 0 ? 'Action Required' : 'Queue Clear'}
                        </span>
                    </div>

                    {/* Vocabulary Retention Pipeline */}
                    <div className="mt-1 border-t border-white/[0.05] pt-3">
                        <div className="flex items-center justify-between text-[11px] font-mono">
                            <span className="text-white/50">Vocabulary Retention</span>
                            <span className="font-bold" style={{ color: rgba(accent, 1) }}>
                                {retentionStats.total > 0
                                    ? `${Math.round(((retentionStats.retaining + retentionStats.mastered) / retentionStats.total) * 100)}%`
                                    : '0%'}
                            </span>
                        </div>

                        {/* Segmented Distribution Bar */}
                        <div className="mt-2 flex h-2 w-full overflow-hidden rounded-full bg-white/[0.06] p-0.5 gap-0.5">
                            {retentionStats.box0 > 0 && (
                                <div
                                    className="h-full rounded-sm bg-red-400"
                                    style={{ width: `${(retentionStats.box0 / retentionStats.total) * 100}%` }}
                                    title={`Critical (Box 0): ${retentionStats.box0} words`}
                                />
                            )}
                            {retentionStats.learning > 0 && (
                                <div
                                    className="h-full rounded-sm bg-amber-400"
                                    style={{ width: `${(retentionStats.learning / retentionStats.total) * 100}%` }}
                                    title={`Learning (Boxes 1-2): ${retentionStats.learning} words`}
                                />
                            )}
                            {retentionStats.retaining > 0 && (
                                <div
                                    className="h-full rounded-sm"
                                    style={{
                                        width: `${(retentionStats.retaining / retentionStats.total) * 100}%`,
                                        backgroundColor: rgba(accent, 0.9),
                                    }}
                                    title={`Retaining (Boxes 3-4): ${retentionStats.retaining} words`}
                                />
                            )}
                            {retentionStats.mastered > 0 && (
                                <div
                                    className="h-full rounded-sm bg-emerald-400"
                                    style={{ width: `${(retentionStats.mastered / retentionStats.total) * 100}%` }}
                                    title={`Mastered (Box 5): ${retentionStats.mastered} words`}
                                />
                            )}
                        </div>

                        {/* Stage Breakdown Legend */}
                        <div className="mt-2.5 flex flex-col gap-1.5 font-mono text-[10px]">
                            <div className="flex items-center justify-between">
                                <span className="flex items-center gap-1.5 text-white/50">
                                    <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                                    Critical (Box 0)
                                </span>
                                <span className="text-white/80 font-bold">{retentionStats.box0}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="flex items-center gap-1.5 text-white/50">
                                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                                    Learning (Boxes 1–2)
                                </span>
                                <span className="text-white/80 font-bold">{retentionStats.learning}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="flex items-center gap-1.5 text-white/50">
                                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: rgba(accent, 0.9) }} />
                                    Retaining (Boxes 3–4)
                                </span>
                                <span className="text-white/80 font-bold">{retentionStats.retaining}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="flex items-center gap-1.5 text-white/50">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                                    Mastered (Box 5)
                                </span>
                                <span className="text-emerald-300 font-bold">{retentionStats.mastered}</span>
                            </div>
                        </div>
                    </div>

                    {/* Leitner Spaced Repetition Protocol Explainer */}
                    <div className="mt-1 rounded-lg border border-white/[0.04] bg-white/[0.015] p-2.5 font-mono text-[9px] leading-relaxed text-white/35">
                        <div className="flex items-center gap-1 text-white/50 font-bold uppercase tracking-wider mb-1">
                            <Sparkles size={10} style={{ color: rgba(accent, 0.9) }} />
                            <span>Leitner Schedule</span>
                        </div>
                        Clean runs advance words through 6 intervals (1d → 3d → 7d → 14d → 30d). Slipping on a word resets it to Box 0 for same-day rehearsal.
                    </div>
                </div>

                {/* ── Right Column: Interactive Word Cards Matrix ── */}
                <div className="flex-1 min-w-0 w-full">
                    {filteredWords.length === 0 ? (
                        <div className="flex flex-col items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.015] p-8 text-center">
                            <CheckCircle2 size={24} className="text-emerald-400/80 mb-2" />
                            <span className="font-mono text-[12px] font-bold text-white/80">
                                {filterMode === 'due' ? 'Review Queue Clear' : 'No Words in this Category'}
                            </span>
                            <span className="mt-1 font-mono text-[10px] text-white/40 max-w-sm">
                                {filterMode === 'due'
                                    ? 'All scheduled words for today have been reviewed. Switch to "Top Fumbles" to run extra motor drills.'
                                    : 'Keep practicing in standard modes to populate words in this stage.'}
                            </span>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
                            {filteredWords.map((item) => (
                                <div
                                    key={item.word}
                                    className="group relative flex flex-col justify-between rounded-xl border border-white/[0.07] bg-white/[0.02] p-3 hover:border-white/[0.18] hover:bg-white/[0.04] transition-all"
                                >
                                    {/* Top Row: Word Name + Quick Rehearse CTA */}
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="font-mono text-[14px] font-bold text-white tracking-wide truncate" title={item.word}>
                                            {item.word}
                                        </span>

                                        {onStartWordDrill && (
                                            <button
                                                type="button"
                                                onClick={() => handleSingleWordDrill(item.word)}
                                                className="opacity-75 group-hover:opacity-100 flex items-center gap-1 rounded-md px-2 py-0.5 font-mono text-[9px] font-bold tracking-wider uppercase transition-all bg-white/[0.05] hover:bg-white/[0.12] text-white/70 hover:text-white border border-white/10 hover:border-white/25 active:scale-95"
                                                title={`Launch targeted micro-drill for "${item.word}"`}
                                            >
                                                <Play size={9} className="fill-current text-white/80" />
                                                <span>Rehearse</span>
                                            </button>
                                        )}
                                    </div>

                                    {/* Middle Row: Error rate badge + Speed metric */}
                                    <div className="mt-2.5 flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-1.5">
                                            <span
                                                className="rounded px-1.5 py-0.5 font-mono text-[10px] font-bold"
                                                style={{
                                                    color: item.rate >= 0.3 ? '#f87171' : item.rate >= 0.15 ? '#fbbf24' : rgba(accent, 1),
                                                    backgroundColor: item.rate >= 0.3 ? 'rgba(239,68,68,0.12)' : item.rate >= 0.15 ? 'rgba(245,158,11,0.12)' : rgba(accent, 0.12),
                                                    border: `1px solid ${item.rate >= 0.3 ? 'rgba(239,68,68,0.25)' : item.rate >= 0.15 ? 'rgba(245,158,11,0.25)' : rgba(accent, 0.25)}`,
                                                }}
                                            >
                                                {item.errorPercent}% slips
                                            </span>
                                            <span className="font-mono text-[10px] text-white/40">
                                                {item.errors}/{item.total}
                                            </span>
                                        </div>

                                        {item.wpm ? (
                                            <span
                                                className="font-mono text-[10px] text-white/50"
                                                title={`Average motor latency: ${item.avgMsPerChar}ms per character`}
                                            >
                                                {item.wpm} WPM
                                            </span>
                                        ) : null}
                                    </div>

                                    {/* Error Frequency Indicator Bar */}
                                    <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/[0.06]">
                                        <div
                                            className="h-full rounded-full transition-all duration-300"
                                            style={{
                                                width: `${Math.max(6, Math.min(100, item.errorPercent))}%`,
                                                backgroundColor: item.rate >= 0.3 ? '#f87171' : item.rate >= 0.15 ? '#fbbf24' : rgba(accent, 0.9),
                                            }}
                                        />
                                    </div>

                                    {/* Bottom Row: 5-Pip Leitner Stage Indicator */}
                                    <div className="mt-3 flex items-center justify-between gap-2 border-t border-white/[0.04] pt-2">
                                        {/* 5 Stage Pips */}
                                        <div className="flex items-center gap-1">
                                            {[1, 2, 3, 4, 5].map((pip) => (
                                                <span
                                                    key={pip}
                                                    className={`h-1.5 w-3 rounded-sm transition-all ${
                                                        item.box >= pip
                                                            ? item.box === 5
                                                                ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.4)]'
                                                                : 'shadow-[0_0_4px_rgba(255,255,255,0.2)]'
                                                            : 'bg-white/10'
                                                    }`}
                                                    style={item.box >= pip && item.box !== 5 ? {
                                                        backgroundColor: rgba(accent, 0.95),
                                                    } : undefined}
                                                    title={`Leitner Stage ${pip} of 5`}
                                                />
                                            ))}
                                        </div>

                                        {/* Due / Mastered Status Badge */}
                                        <span
                                            className="font-mono text-[9px] font-medium tracking-wide uppercase"
                                            style={{
                                                color: item.box === 5 ? '#34d399' : item.isDue ? '#f87171' : 'rgba(255,255,255,0.45)',
                                            }}
                                        >
                                            {item.box === 5 ? 'Mastered' : item.isDue ? 'Due Today' : `Stage ${item.box} · ${item.dueLabel}`}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});
