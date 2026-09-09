// ═══════════════════════════════════════════════════════════════════════
//  DOSSIER PIECES — the repeated surfaces of the operator page
//  ---------------------------------------------------------------------
//  Rewritten with the page. The previous set was built around one shape: a
//  `DossierCard` (glass, 22px radius, accent border, icon-chip heading) that
//  every section wrapped itself in, and a `StatTile` (glass, 16px radius, its
//  own accent border, its own mini-meter) that every metric wrapped itself in.
//  So a number lived inside two bordered translucent surfaces of near-identical
//  value, and the outer one contributed nothing but a heading. Four radii were
//  in play (22 / 16 / 12 / full) and five hardcoded accent triplets, on a page
//  that already receives one accent from the operator's banner.
//
//  The shapes here are the opposite bet:
//
//    · `Section`  — a heading and some content. Not a box. Sections are
//                   separated by space and one hairline, which is what lets a
//                   metric row sit directly on the page instead of inside a
//                   frame inside a frame.
//    · `Panel`    — the *one* enclosed surface, for content that genuinely has
//                   an inside: a chart, the key board, the calendar. Flat and
//                   opaque (`.dsr-surface`), never translucent — see the
//                   material note in `index.css`.
//    · `Figure`   — a display number. Owns no border and no background; it is
//                   divided from its neighbours by a hairline in the parent
//                   grid. Its caption states a *comparison*, because "of 200
//                   ceiling" under a beginner's 30 WPM is a bar that reads as
//                   failure and tells them nothing.
//    · `DataRow`  — label, value, and a meter only where a proportion is real.
//    · `Delta`    — the one place colour is allowed to leave the accent, because
//                   up-versus-down is data rather than decoration.
//
//  Nothing here is a `motion` component, deliberately — the page renders many
//  of them, and one JS spring per instance is what made the old tab switch
//  stutter. Entrances are the CSS cascade in `.dossier-stagger`; hover is a CSS
//  transition on `.dsr-interactive`.
// ═══════════════════════════════════════════════════════════════════════

import type { CSSProperties, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { rgba } from './profileMotion';
import { StatCounter } from './ProfileFx';

/** Up is green, down is rose. The only non-accent colours on the page. */
export const TREND_UP = '52, 211, 153';
export const TREND_DOWN = '248, 113, 113';

/**
 * Inline custom properties for a `.dossier-meter` fill.
 *
 * `fill` is clamped here rather than at each call site because several callers
 * divide by a reference value and a result above it would otherwise overflow
 * the track.
 */
const meterStyle = (fill: number, accent: string, delayMs = 120): CSSProperties =>
    ({
        '--meter-fill': Math.max(0, Math.min(1, fill)),
        '--meter-delay': `${delayMs}ms`,
        background: rgba(accent, 0.85),
    }) as CSSProperties;

/* ─── Section ──────────────────────────────────────────────────────────── */

/**
 * One section of the page.
 *
 * The heading is a real `h2` — the page's order is `h1` (the dossier) → `h2`
 * (each section) → `h3` (a card inside one), so a screen reader's heading list
 * is a usable table of contents.
 *
 * `id` is required rather than optional: every section is a scroll-spy target,
 * and a section the strip cannot reach is a section nobody scrolls to on a page
 * this long.
 */
export function Section({
    id,
    title,
    meta,
    intro,
    action,
    children,
}: {
    id: string;
    title: string;
    /** Short right-aligned fact — a count, a window, a timestamp. */
    meta?: ReactNode;
    /** One sentence, only where the section needs explaining. */
    intro?: string;
    /** A control that belongs to the whole section. */
    action?: ReactNode;
    children: ReactNode;
}) {
    return (
        <section
            id={id}
            // `data-reveal` is the page's one entrance hook; `hooks/useReveal`
            // flips it on first entry into the scrollport and the transition lives
            // in `index.css`. Nothing here animates on mount, which on a page this
            // long meant every entrance had already been spent by the time it was
            // scrolled to.
            data-reveal
            className="scroll-mt-[calc(var(--dossier-bar-h)+3.25rem)]"
        >
            <header className="mb-4">
                <div className="flex items-baseline justify-between gap-4">
                    <h2 className="dsr-title">{title}</h2>
                    <div className="flex shrink-0 items-center gap-3">
                        {meta && <span className="dsr-unit">{meta}</span>}
                        {action}
                    </div>
                </div>
                {/* Below the heading, not beside it. As a flex item with
                    `w-full max-w-[68ch]` the cap won, so it never wrapped. */}
                {intro && <p className="dsr-note mt-2 max-w-[68ch]">{intro}</p>}
            </header>
            {/* The section rises as one block; its panels then cascade inside it.
                Two tiers, not three - the figures inside a panel already arrive
                with their own count-up, and a third cascade on top of that reads
                as the page being slow rather than as the page being alive. */}
            <div className="dossier-stagger">{children}</div>
        </section>
    );
}

/** The hairline that separates sections. One weight, one colour, everywhere. */
export function Rule({ className = '' }: { className?: string }) {
    // Draws itself along the reading direction. A section break is the one place
    // where the rule *is* the content, so it earns an entrance of its own rather
    // than fading in with the block above it.
    return (
        <div
            aria-hidden
            data-reveal-rule
            className={`h-px w-full bg-[var(--dsr-line)] ${className}`}
        />
    );
}

/* ─── Panel ────────────────────────────────────────────────────────────── */

/**
 * The one enclosed surface. Use it for content with an inside — a chart, the
 * key board, the calendar — and not to give a heading a frame.
 */
export function Panel({
    className = '',
    padding = 'p-4 sm:p-5',
    contain = false,
    children,
}: {
    className?: string;
    padding?: string;
    /**
     * Skip rendering the contents while off screen.
     *
     * Only for the genuinely expensive panels. Scrolling this page while sampling
     * frame intervals put the cost on two subtrees - the collection grid and the
     * key heatmap - and hiding the grid alone moved the 95th-percentile frame from
     * 33ms, one dropped frame every time, to 16.7ms.
     */
    contain?: boolean;
    children: ReactNode;
}) {
    return (
        <div
            className={`dsr-surface relative overflow-hidden rounded-[14px] ${padding} ${
                contain ? 'dsr-contain' : ''
            } ${className}`}
        >
            {children}
        </div>
    );
}

/** A heading for content inside a `Panel`, where a section heading is too loud. */
export function PanelHeading({
    title,
    meta,
    action,
}: {
    title: string;
    meta?: ReactNode;
    action?: ReactNode;
}) {
    return (
        <div className="mb-3.5 flex items-center justify-between gap-3">
            <h3 className="dsr-label">{title}</h3>
            <div className="flex items-center gap-3">
                {meta && <span className="dsr-unit">{meta}</span>}
                {action}
            </div>
        </div>
    );
}

/* ─── Figure ───────────────────────────────────────────────────────────── */

export type FigureSize = 'lg' | 'md' | 'sm';

const FIGURE_SIZE: Record<FigureSize, string> = {
    // Fluid so the header's figures never wrap on a laptop and never look
    // undersized on a wide monitor.
    lg: 'text-[clamp(34px,3.6vw,48px)]',
    md: 'text-[30px]',
    sm: 'text-[20px]',
};

/**
 * A display number with its label, unit and one line of context.
 *
 * `caption` is where a comparison goes — a rank, a delta, a share of the field.
 * It replaces the old tile's meter-against-a-ceiling, which normalised every
 * metric against a number nobody is aiming for.
 */
export function Figure({
    label,
    value,
    unit,
    decimals = 0,
    caption,
    size = 'md',
    icon: Icon,
    accent,
    /** Renders the readout as an em dash with a reason, not as a zero. */
    unavailable,
    animate = true,
}: {
    label: string;
    value: number;
    unit?: string;
    decimals?: number;
    caption?: ReactNode;
    size?: FigureSize;
    icon?: LucideIcon;
    accent?: string;
    unavailable?: string;
    animate?: boolean;
}) {
    const settled = decimals > 0 ? value.toFixed(decimals) : Math.round(value).toLocaleString();

    return (
        <div
            className="min-w-0 px-4 py-3.5 sm:px-5"
            role="group"
            aria-label={
                unavailable
                    ? `${label}: ${unavailable}`
                    : `${label}: ${settled}${unit ? ` ${unit}` : ''}`
            }
        >
            <div className="flex items-center gap-2">
                {Icon && (
                    <Icon
                        size={12}
                        aria-hidden
                        style={{ color: accent ? rgba(accent, 0.75) : 'var(--dsr-ink-3)' }}
                    />
                )}
                <span className="dsr-label truncate">{label}</span>
            </div>

            <div className="mt-2 flex items-baseline gap-1.5" aria-hidden>
                {unavailable ? (
                    <span className="dsr-figure text-[22px] text-[var(--dsr-ink-3)]">—</span>
                ) : (
                    <>
                        {animate ? (
                            <StatCounter
                                value={value}
                                decimals={decimals}
                                className={`dsr-figure ${FIGURE_SIZE[size]}`}
                            />
                        ) : (
                            <span className={`dsr-figure ${FIGURE_SIZE[size]}`}>{settled}</span>
                        )}
                        {unit && <span className="dsr-unit">{unit}</span>}
                    </>
                )}
            </div>

            {(caption || unavailable) && (
                <div className="dsr-note mt-1.5 truncate">
                    {unavailable ?? caption}
                </div>
            )}
        </div>
    );
}

/**
 * The row a set of `Figure`s sits in.
 *
 * Hairlines between cells instead of a border per cell: four bordered tiles in a
 * row is four competing frames, and the thing being compared is the numbers.
 *
 * Not Tailwind's `divide-x`. In a wrapping grid `divide-x` is `> * + *` with a
 * left border, so the first cell of every row after the first also gets one —
 * a stray vertical rule hanging in the middle of the row. Instead every cell
 * carries a top and left border and the grid is offset by a pixel inside a
 * clipping wrapper, so the outer edges fall outside the box and only the
 * interior lines survive. That holds at any column count and any breakpoint.
 */
export function FigureRow({
    cols = 4,
    className = '',
    children,
}: {
    /**
     * Declared rather than passed through `className`. Which `grid-cols-*` rule
     * wins is CSS source order, not the order the class strings were
     * concatenated in, so an override arriving as a string is a coin flip.
     */
    cols?: 3 | 4;
    className?: string;
    children: ReactNode;
}) {
    return (
        <div className="overflow-hidden">
            <div
                className={`-ml-px -mt-px grid [&>*]:border-l [&>*]:border-t [&>*]:border-[var(--dsr-line)] ${
                    cols === 3 ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-4'
                } ${className}`}
            >
                {children}
            </div>
        </div>
    );
}

/* ─── Delta ────────────────────────────────────────────────────────────── */

/**
 * A signed change. `null` renders nothing rather than a zero, because "no
 * reading yet" and "no movement" are different statements.
 */
export function Delta({
    value,
    unit,
    invert = false,
}: {
    value: number | null;
    unit?: string;
    /** For metrics where down is good. */
    invert?: boolean;
}) {
    if (value === null) return null;
    // Zero is neither direction, and a signed "+0" reads as a claim about
    // movement that did not happen. Neutral ink, no sign, plain words.
    if (value === 0) return <span className="dsr-unit whitespace-nowrap">no change</span>;
    const good = invert ? value < 0 : value > 0;
    const rgb = good ? TREND_UP : TREND_DOWN;

    return (
        <span className="dsr-unit whitespace-nowrap" style={{ color: `rgb(${rgb})` }}>
            {value >= 0 ? '+' : '−'}
            {Math.abs(value).toLocaleString()}
            {unit ? ` ${unit}` : ''}
        </span>
    );
}

/* ─── Data row ─────────────────────────────────────────────────────────── */

/**
 * A label, a value, and a meter where the proportion means something.
 *
 * `fill` is optional now. The old row always drew one, so the personal-best
 * board rendered eight bars measuring runs against a 200 WPM ceiling — eight
 * near-empty tracks that made a board of achievements read as a board of
 * shortfalls.
 */
export function DataRow({
    label,
    value,
    sub,
    fill,
    accent,
    delay = 160,
    trailing,
}: {
    label: ReactNode;
    value: ReactNode;
    sub?: ReactNode;
    /** 0…1. Omit where there is no honest denominator. */
    fill?: number;
    accent: string;
    delay?: number;
    /** Sits at the right edge, after the value — usually a control. */
    trailing?: ReactNode;
}) {
    return (
        <div className="flex items-center gap-4 py-3">
            <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                    <span className="dsr-label truncate">{label}</span>
                    <span className="dsr-figure shrink-0 text-[15px]">{value}</span>
                </div>
                {fill !== undefined && (
                    <div className="mt-2 h-[2px] w-full overflow-hidden rounded-full bg-white/[0.07]" aria-hidden>
                        <span
                            className="dossier-meter block h-full w-full rounded-full"
                            style={meterStyle(fill, accent, delay)}
                        />
                    </div>
                )}
                {sub && <div className="dsr-note mt-1.5">{sub}</div>}
            </div>
            {trailing && <div className="shrink-0">{trailing}</div>}
        </div>
    );
}

/** A list of `DataRow`s, hairline-divided. */
export function DataList({ children }: { children: ReactNode }) {
    // Reading order is downward, so the rows arrive that way.
    return <div className="dossier-stagger divide-y divide-[var(--dsr-line)]">{children}</div>;
}

/* ─── Empty state ──────────────────────────────────────────────────────── */

/**
 * Shown where a section has nothing to draw *yet*.
 *
 * Takes an action, because the old note's job was to explain an absence and
 * stop there — five of them on a public dossier, each a variation on "not
 * published". A section that cannot fill itself should either say what fills it
 * or offer the thing that does.
 */
export function EmptyNote({
    icon: Icon,
    children,
    action,
}: {
    icon: LucideIcon;
    children: ReactNode;
    action?: ReactNode;
}) {
    return (
        <div className="flex flex-col items-start gap-2.5 rounded-[14px] border border-dashed border-[var(--dsr-line-hi)] px-5 py-6">
            <Icon size={16} className="text-[var(--dsr-ink-3)]" aria-hidden />
            <p className="dsr-body max-w-[58ch]">{children}</p>
            {action}
        </div>
    );
}
