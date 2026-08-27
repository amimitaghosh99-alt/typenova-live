// ═══════════════════════════════════════════════════════════════════════
//  KEY HEATMAP — per-key accuracy and speed, as a keyboard
//  ---------------------------------------------------------------------
//  Moved here from the standalone stats modal, which no longer exists: the
//  dossier is where a player looks to see how they are doing, and a second
//  full-screen panel showing a subset of the same data was a nav button most
//  people never pressed.
//
//  Rebuilt rather than copied. The original hardcoded zinc/red/blue and its own
//  radii, so it read as a different product from the card it now sits in. This
//  version takes the operator's accent for its frame and keeps the two
//  diagnostic hues (red = typos, blue = hesitation), because those are the
//  meaning rather than decoration.
//
//  No `motion` components and no JS animation, matching the rest of
//  `components/profile`: this renders 27 keys, and the dossier's tab switch
//  cannot afford 27 springs.
// ═══════════════════════════════════════════════════════════════════════

import { useMemo, useState } from 'react';
import { Keyboard, Loader2, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { useSmartDrills } from '@/hooks/useSmartDrills';
import { rgba } from './profileMotion';

/** What the typing engine records per key. `totalMs` postdates the speed view. */
export type KeyStat = { total: number; errors: number; totalMs?: number };
export type HeatmapData = Record<string, KeyStat>;

const ROWS = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
    ['SPACE'],
] as const;

/** Row indents, so the board reads as a keyboard rather than a grid. */
const ROW_INDENT = ['', 'ml-3', 'ml-9', ''] as const;

type Mode = 'accuracy' | 'speed';

/** Above this, a key's average inter-key delay is hesitation, not pace. */
const SLOW_MS = 300;
/** Above this error rate, a key is worth drilling. */
const SLOPPY_RATE = 0.1;
/**
 * Ceiling for the speed scale. Without it one four-second pause — a phone call
 * mid-test — becomes the maximum and flattens every real key to nothing.
 */
const DELAY_CEILING = 1000;

export function KeyHeatmap({
    data,
    accent,
    onStartDrill,
}: {
    data: HeatmapData;
    accent: string;
    /** Absent where a drill cannot be started (someone else's dossier). */
    onStartDrill?: (text: string) => void;
}) {
    const [mode, setMode] = useState<Mode>('accuracy');
    const { generateDrill, isGenerating } = useSmartDrills();

    /**
     * Both scales are relative to the player's own worst key. An absolute scale
     * paints a 99%-accurate board entirely cold and a struggling one entirely
     * hot, and in both cases says nothing about which key to fix next.
     */
    const { maxErrorRate, maxDelay, weakKeys } = useMemo(() => {
        let maxErrorRate = 0;
        let maxDelay = 0;
        const weak: string[] = [];

        for (const [key, stat] of Object.entries(data)) {
            if (!stat || stat.total <= 0) continue;

            const rate = stat.errors / stat.total;
            if (rate > maxErrorRate) maxErrorRate = rate;

            const delay = (stat.totalMs ?? 0) / stat.total;
            if (delay > maxDelay) maxDelay = delay;

            // `total > 5` stops one unlucky keystroke being reported as a
            // 100%-error key. SPACE is excluded: it is the most-pressed key on
            // the board and drilling it teaches nothing.
            if (key !== 'SPACE' && stat.total > 5 && (rate > SLOPPY_RATE || delay > SLOW_MS)) {
                weak.push(key);
            }
        }

        return { maxErrorRate, maxDelay: Math.min(maxDelay, DELAY_CEILING), weakKeys: weak };
    }, [data]);

    const startDrill = async () => {
        if (!onStartDrill) return;
        const result = await generateDrill(weakKeys);
        toast.success(
            result.engine === 'procedural'
                ? 'Procedural engine built a drill from your weak keys.'
                : 'AI engine built a drill from your weak keys.',
        );
        onStartDrill(result.text);
    };

    return (
        <div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <span className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.2em] text-white/35">
                    <Keyboard size={12} />
                    {mode === 'accuracy' ? 'Red = typos' : 'Blue = hesitation'}
                </span>

                <div className="flex flex-wrap items-center gap-1.5">
                    {(['accuracy', 'speed'] as const).map((m) => (
                        <button
                            key={m}
                            type="button"
                            onClick={() => setMode(m)}
                            aria-pressed={mode === m}
                            className={`rounded-full border px-2.5 py-1 font-mono text-[9px] font-black uppercase tracking-[0.16em] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-white/40 ${mode === m ? 'text-white' : 'border-white/10 text-white/40 hover:text-white/70'}`}
                            style={mode === m ? { borderColor: rgba(accent, 0.5), background: rgba(accent, 0.14) } : undefined}
                        >
                            {m === 'accuracy' ? 'Typos' : 'Speed'}
                        </button>
                    ))}

                    {onStartDrill && (
                        <button
                            type="button"
                            disabled={isGenerating}
                            onClick={startDrill}
                            className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[9px] font-black uppercase tracking-[0.16em] text-white outline-none transition-colors focus-visible:ring-2 focus-visible:ring-white/40 disabled:opacity-50"
                            style={{ borderColor: rgba(accent, 0.45), background: rgba(accent, 0.12) }}
                        >
                            {isGenerating
                                ? <Loader2 size={11} className="animate-spin" />
                                : <Zap size={11} style={{ color: rgba(accent, 1) }} />}
                            {/* With no weak keys the drill is still useful as a warm-up,
                                so the button stays enabled and relabels itself. */}
                            {isGenerating ? 'Building' : weakKeys.length > 0 ? `Drill ${weakKeys.length} keys` : 'Warmup drill'}
                        </button>
                    )}
                </div>
            </div>


            {/* The board is wider than a phone, so it scrolls rather than
                shrinking the keys into illegibility. */}
            <div className="custom-scrollbar -mx-1 overflow-x-auto px-1 pb-1">
                <div className="flex w-max min-w-full flex-col items-center gap-1.5">
                    {ROWS.map((row, rowIndex) => (
                        <div key={rowIndex} className={`flex gap-1.5 ${ROW_INDENT[rowIndex]}`}>
                            {row.map((key) => {
                                const stat = data[key];
                                const total = stat?.total ?? 0;
                                const hasData = total > 0;
                                const rate = hasData ? stat.errors / total : 0;
                                const delay = hasData ? (stat.totalMs ?? 0) / total : 0;

                                let intensity = 0;
                                if (mode === 'accuracy') {
                                    intensity = maxErrorRate > 0 ? rate / maxErrorRate : 0;
                                    // Floor a key that has *any* errors, so one visible
                                    // mistake never renders as a clean key.
                                    if (rate > 0) intensity = Math.max(0.3, intensity);
                                } else {
                                    intensity = maxDelay > 0 ? Math.min(delay / maxDelay, 1) : 0;
                                    if (delay > 0) intensity = Math.max(0.2, intensity);
                                }

                                const hue = mode === 'accuracy' ? '239, 68, 68' : '59, 130, 246';
                                const lit = intensity > 0.1;
                                const isSpace = key === 'SPACE';

                                return (
                                    <div
                                        key={key}
                                        className={`group relative flex h-10 items-center justify-center rounded-lg border font-mono text-[10px] font-black ${isSpace ? 'w-56' : 'w-10'}`}
                                        style={{
                                            background: hasData ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.012)',
                                            borderColor: lit ? rgba(hue, Math.min(1, intensity)) : 'rgba(255,255,255,0.07)',
                                            boxShadow: lit
                                                ? `0 0 ${Math.round(intensity * 16)}px ${rgba(hue, intensity * 0.75)}, inset 0 0 ${Math.round(intensity * 12)}px ${rgba(hue, intensity * 0.5)}`
                                                : undefined,
                                            color: intensity > 0.5 ? '#fff' : hasData ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.2)',
                                        }}
                                    >
                                        {isSpace ? 'SPACE' : key}

                                        {hasData && (
                                            /* Hover card, `group-hover` only. A click
                                               target here would fight the drill button
                                               for the same gesture on touch, where
                                               hover does not exist anyway. */
                                            <div
                                                role="tooltip"
                                                className={`pointer-events-none absolute left-1/2 z-30 hidden w-max -translate-x-1/2 rounded-xl border border-white/10 bg-[#05070c] p-2.5 shadow-2xl group-hover:block ${rowIndex < 2 ? 'top-full mt-1.5' : 'bottom-full mb-1.5'}`}
                                            >
                                                <div className="mb-1.5 font-mono text-[8px] uppercase tracking-[0.2em] text-white/40">
                                                    {isSpace ? 'Spacebar' : `Key ${key}`}
                                                </div>
                                                <dl className="grid grid-cols-[auto_auto] gap-x-4 gap-y-1 text-left">
                                                    <dt className="font-mono text-[8px] uppercase tracking-[0.16em] text-white/35">Typos</dt>
                                                    <dd className="font-sans text-[11px] font-black text-rose-400">
                                                        {Math.round(rate * 100)}% <span className="text-white/30">({stat.errors})</span>
                                                    </dd>
                                                    <dt className="font-mono text-[8px] uppercase tracking-[0.16em] text-white/35">Delay</dt>
                                                    <dd className="font-sans text-[11px] font-black text-sky-400">
                                                        {delay > 0 ? `${Math.round(delay)}ms` : '—'}
                                                    </dd>
                                                    <dt className="font-mono text-[8px] uppercase tracking-[0.16em] text-white/35">Pressed</dt>
                                                    <dd className="font-sans text-[11px] font-black text-white">{total.toLocaleString()}</dd>
                                                </dl>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

