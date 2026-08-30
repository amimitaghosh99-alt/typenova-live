// ═══════════════════════════════════════════════════════════════════════
//  DOSSIER PIECES — the repeated surfaces of the operator page
//  ---------------------------------------------------------------------
//  `OperatorDossier.tsx` declared its section heading and metric tile inline,
//  so every new section restated the same border/padding/heading trio by hand
//  and the spacing drifted a few pixels each time. These are those surfaces,
//  named once.
//
//  The spacing scale lives here rather than at each call site:
//    · CARD  — rounded-[22px], p-5 (sm:p-6), one hairline border in the
//              operator's accent, `glass-card` for the liquid layer
//    · TILE  — rounded-2xl, p-4
//    · GAP   — cards stack in a `gap-5` column; tiles sit in a `gap-3` grid
//  A card that needs a different pad passes `padding`; nothing re-derives the
//  frame.
//
//  Nothing in this file is a `motion` component, deliberately. These are the
//  surfaces the page renders *many* of — up to seventeen cards in one panel —
//  and one JS-driven spring per instance is what made switching tabs stutter.
//  Their entrances are CSS (`.dossier-stagger`, `.dossier-meter` in index.css),
//  which the compositor runs off the main thread, so the cost no longer scales
//  with the number of cards. Hover feedback is a CSS transition for the same
//  reason.
// ═══════════════════════════════════════════════════════════════════════

import type { CSSProperties, ReactNode } from 'react';
import { Lock } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { rgba } from './profileMotion';
import { StatCounter } from './ProfileFx';

/**
 * Inline custom properties for a `.dossier-meter` fill.
 *
 * `fill` is clamped here rather than at each call site because several callers
 * divide by a ceiling (`wpm / CEILING.wpm`) and a new personal best above the
 * ceiling would otherwise overflow its track.
 */
const meterStyle = (fill: number, accent: string, delayMs = 120): CSSProperties =>
    ({
        '--meter-fill': Math.max(0, Math.min(1, fill)),
        '--meter-delay': `${delayMs}ms`,
        background: rgba(accent, 0.92),
        boxShadow: `0 0 8px ${rgba(accent, 0.6)}`,
    }) as CSSProperties;

/* ─── Card ─────────────────────────────────────────────────────────────── */

/**
 * One panel of the dossier.
 *
 * `glass-card` supplies the liquid layer: the same diagonal wash and specular
 * rim as `glass-panel`, minus the backdrop blur. That matters here because the
 * dossier shell is already a `glass-panel`, and nesting one blurred surface in
 * another costs a second full-surface filter pass for a muddier result — the
 * child would be sampling a backdrop that has already lost its detail.
 *
 * The accent border is layered on top, which is why `style` sets only the
 * border colour and never the background.
 */
export function DossierCard({
    accent,
    className = '',
    padding = 'p-5 sm:p-6',
    children,
    variant = 'panel',
}: {
    accent: string;
    className?: string;
    padding?: string;
    children: ReactNode;
    /** `flush` drops the padding for cards that own their own inner layout. */
    variant?: 'panel' | 'flush';
}) {
    return (
        <section
            className={`glass-card dossier-card relative overflow-hidden rounded-[22px] ${variant === 'flush' ? '' : padding} ${className}`}
            style={{ borderColor: rgba(accent, 0.18) }}
        >
            {children}
        </section>
    );
}

/* ─── Section heading ──────────────────────────────────────────────────── */

/**
 * Section heading with a hairline that fades into the panel.
 *
 * The title is a real `h3`, not a styled `div`: the dossier's heading order is
 * `h1` (the page) → `h2` (the operator) → `h3` (each card), so a screen reader's
 * heading list is a usable table of contents for the panel on screen.
 */
export function PanelHeading({
    icon: Icon,
    title,
    hint,
    accent,
}: {
    icon: LucideIcon;
    title: string;
    hint?: string;
    accent: string;
}) {
    return (
        <div className="mb-4 flex items-center gap-3">
            <span
                aria-hidden
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border"
                style={{ borderColor: rgba(accent, 0.3), background: rgba(accent, 0.1), color: rgba(accent, 1) }}
            >
                <Icon size={14} />
            </span>
            <h3 className="font-mono text-[10px] font-black uppercase tracking-[0.28em] text-white/70">{title}</h3>
            <span
                aria-hidden
                className="h-px flex-1"
                style={{ background: `linear-gradient(to right, ${rgba(accent, 0.35)}, transparent)` }}
            />
            {hint && (
                <span className="shrink-0 font-mono text-[9px] uppercase tracking-[0.18em] text-white/35">{hint}</span>
            )}
        </div>
    );
}

/* ─── Metric tile ──────────────────────────────────────────────────────── */

/**
 * One instrument tile. Hover lifts it and drags a sheen across — CSS-only, so
 * a grid of these costs nothing on the compositor.
 *
 * The number is animated by a count-up, so the accessible name is written out
 * on the tile itself: a screen reader following the live text would otherwise
 * read a stream of intermediate values on every tab entry.
 */
export function StatTile({
    label,
    value,
    unit,
    decimals = 0,
    fill,
    accent,
    icon: Icon,
    available = true,
    span = '',
    footnote,
}: {
    label: string;
    value: number;
    unit?: string;
    decimals?: number;
    /** 0…1 — how full the tile's mini-meter reads. */
    fill: number;
    accent: string;
    icon: LucideIcon;
    available?: boolean;
    span?: string;
    /** Optional context line, e.g. the ceiling the meter is measured against. */
    footnote?: string;
}) {
    const readout = available
        ? `${decimals > 0 ? value.toFixed(decimals) : Math.round(value).toLocaleString()}${unit ? ` ${unit}` : ''}`
        : 'private';

    return (
        <div
            className={`glass-card group relative overflow-hidden rounded-2xl p-4 transition-transform duration-200 ease-out hover:-translate-y-[3px] motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${span}`}
            style={{ borderColor: rgba(accent, available ? 0.22 : 0.09) }}
            role="group"
            aria-label={`${label}: ${readout}`}
        >
            <span
                aria-hidden
                className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/[0.07] to-transparent transition-transform duration-700 group-hover:translate-x-full"
            />
            {/* A hairline of the tile's own accent along the top edge — enough to tell
                the metrics apart at a glance without colouring the whole card. */}
            <span
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 h-px"
                style={{ background: `linear-gradient(to right, transparent, ${rgba(accent, available ? 0.7 : 0.2)}, transparent)` }}
            />
            <div className="relative flex items-center justify-between gap-2">
                <span className="font-mono text-[9px] font-bold uppercase tracking-[0.22em] text-white/45">{label}</span>
                <Icon size={13} style={{ color: rgba(accent, available ? 0.9 : 0.35) }} />
            </div>

            <div className="relative mt-2.5 flex items-baseline gap-1" aria-hidden>
                {available ? (
                    <>
                        <StatCounter
                            value={value}
                            decimals={decimals}
                            className="font-sans text-[26px] font-black leading-none tracking-tight text-white"
                        />
                        {unit && <span className="font-mono text-[10px] font-bold text-white/40">{unit}</span>}
                    </>
                ) : (
                    <span className="flex items-center gap-1.5 font-mono text-[11px] font-black uppercase tracking-[0.18em] text-white/25">
                        <Lock size={11} />
                        Private
                    </span>
                )}
            </div>

            <div className="relative mt-3.5 h-[3px] w-full overflow-hidden rounded-full bg-white/[0.07]" aria-hidden>
                <span
                    className="dossier-meter block h-full w-full rounded-full"
                    style={meterStyle(available ? fill : 0, accent, 150)}
                />
            </div>

            {footnote && (
                <div className="relative mt-2 font-mono text-[8px] uppercase tracking-[0.16em] text-white/25">
                    {available ? footnote : 'Visible to this operator only'}
                </div>
            )}
        </div>
    );
}

/* ─── Labelled bar row ─────────────────────────────────────────────────── */

/**
 * A label, a value and a meter.
 *
 * The matrix readout column already had this markup inline; the personal-best
 * board and the per-mode breakdown both needed the same row, so it is a
 * component rather than a third and fourth copy of the same three divs.
 */
export function MeterRow({
    label,
    value,
    fill,
    accent,
    sub,
    delay = 180,
}: {
    label: string;
    value: string;
    /** 0…1 */
    fill: number;
    accent: string;
    sub?: string;
    /** Fill delay in ms. */
    delay?: number;
}) {
    return (
        <div className="glass-card rounded-xl p-3">
            <div className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 truncate font-mono text-[9px] uppercase tracking-[0.2em] text-white/45">{label}</span>
                <span className="shrink-0 font-sans text-[12px] font-black text-white">{value}</span>
            </div>
            <div className="mt-2 h-[3px] w-full overflow-hidden rounded-full bg-white/[0.07]" aria-hidden>
                <span
                    className="dossier-meter block h-full w-full rounded-full"
                    style={meterStyle(fill, accent, delay)}
                />
            </div>
            {sub && <div className="mt-1.5 font-mono text-[8px] uppercase tracking-[0.16em] text-white/25">{sub}</div>}
        </div>
    );
}

/* ─── Empty state ──────────────────────────────────────────────────────── */

/** Shown where a section has nothing to draw yet, instead of an empty frame. */
export function EmptyNote({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
    return (
        <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/[0.09] px-4 py-8 text-center">
            <Icon size={18} className="text-white/20" />
            <p className="max-w-[34ch] font-mono text-[10px] leading-relaxed tracking-wide text-white/30">{children}</p>
        </div>
    );
}

