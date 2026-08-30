// ═══════════════════════════════════════════════════════════════════════
//  MARKER GLYPHS — the shape half of a racer's identity, rendered
//  ---------------------------------------------------------------------
//  Two components over one shared path generator (`markerPath`, in
//  `raceColors.ts`): SVG nodes for the chart's curves, and a standalone inline
//  SVG for the HTML legend and result cards. Sharing the generator is what makes
//  a racer's swatch unable to disagree with the marker on their line.
// ═══════════════════════════════════════════════════════════════════════

import { markerPath, type RaceMarker } from './raceColors';

/** A marker positioned on the chart, in the chart's own coordinate space. */
export function ChartMarker({
    marker,
    color,
    x,
    y,
    r,
    /** Matches the plot background, so a hollow marker reads as hollow. */
    hollowFill = '#05070c',
}: {
    marker: RaceMarker;
    color: string;
    x: number;
    y: number;
    r: number;
    hollowFill?: string;
}) {
    return (
        <path
            d={markerPath(marker.shape, r)}
            transform={`translate(${x} ${y})`}
            fill={marker.filled ? color : hollowFill}
            stroke={color}
            strokeWidth={marker.filled ? 0 : 1.75}
        />
    );
}

/**
 * Standalone swatch for the legend and the result cards.
 *
 * `aria-hidden` throughout: the racer's name always sits beside it, so the
 * glyph is decoration. It is what makes that name findable on the chart, not
 * information in itself.
 */
export function MarkerSwatch({
    marker,
    color,
    size = 11,
    dimmed = false,
}: {
    marker: RaceMarker;
    color: string;
    size?: number;
    /** For a racer whose curve never arrived — no line to point at. */
    dimmed?: boolean;
}) {
    const r = size / 2 - 0.9;
    return (
        <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            className="shrink-0 overflow-visible"
            aria-hidden
            focusable="false"
            style={dimmed ? { opacity: 0.3 } : undefined}
        >
            <path
                d={markerPath(marker.shape, r)}
                transform={`translate(${size / 2} ${size / 2})`}
                fill={marker.filled ? color : 'none'}
                stroke={color}
                strokeWidth={marker.filled ? 0 : 1.5}
            />
        </svg>
    );
}
