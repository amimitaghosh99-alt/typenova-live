// ═══════════════════════════════════════════════════════════════════════
//  RACER IDENTITY — one hue *and one marker shape* per racer
//  ---------------------------------------------------------------------
//  The old race graph keyed colours off *ranking position* and read them out of
//  a four-entry medal palette. Two things broke as a result:
//
//  · Anyone past 4th place, and every racer whose position could not be
//    resolved, fell through to the same grey — so a 5th-place line and an
//    unfinished line were indistinguishable from each other.
//  · Colours moved. Ranking is only settled once everyone has finished, so a
//    racer's line changed hue underneath the reader as later results landed.
//
//  Assigning by a stable identity fixes both. Self always takes slot 0, so
//  "your" line is the same colour in every race you run.
//
//  Each slot also carries a marker shape, because hue alone cannot carry the
//  mapping: roughly 1 in 12 men cannot separate the rose and lime entries
//  below, and the chart is unreadable to them if colour is the only channel.
//  Shape is used rather than a dash pattern on purpose — this chart already
//  breaks a line where a racer's data is missing, so a dashed stroke would read
//  as absent data.
// ═══════════════════════════════════════════════════════════════════════

/**
 * Distinct hues that hold up on the near-black results background, ordered so
 * that adjacent entries stay tellable apart at 2px stroke width.
 */
export const RACE_PALETTE = [
    '#38bdf8', // sky
    '#fb7185', // rose
    '#a3e635', // lime
    '#c084fc', // violet
    '#fbbf24', // amber
    '#2dd4bf', // teal
    '#fb923c', // orange
    '#e879f9', // fuchsia
] as const;

/**
 * Four shapes, each in a filled and a hollow variant, giving eight markers that
 * stay distinguishable at ~7px from four primitives.
 */
export type RaceMarkerShape = 'circle' | 'square' | 'triangle' | 'diamond';

export interface RaceMarker {
    shape: RaceMarkerShape;
    filled: boolean;
}

const RACE_MARKERS: readonly RaceMarker[] = [
    { shape: 'circle', filled: true },
    { shape: 'square', filled: true },
    { shape: 'triangle', filled: true },
    { shape: 'diamond', filled: true },
    { shape: 'circle', filled: false },
    { shape: 'square', filled: false },
    { shape: 'triangle', filled: false },
    { shape: 'diamond', filled: false },
] as const;

/**
 * Path data for a marker centred on the origin.
 *
 * Lives here beside the shape definitions rather than in the component that
 * draws them, so it can be shared by the SVG nodes on the chart's curves and
 * the standalone swatches in the legend without either importing the other.
 * Returned as path data, not an element, so the caller controls fill, stroke and
 * transform. `r` is the circumradius, so every shape occupies the same visual
 * box regardless of how many sides it has.
 */
export function markerPath(shape: RaceMarkerShape, r: number): string {
    switch (shape) {
        case 'square': {
            // Side length matched to the circle's *area*, not its diameter: an
            // inscribed square reads noticeably smaller than a circle of the
            // same radius, which would make slot 1 look subordinate to slot 0.
            const h = r * 0.886;
            return `M ${-h},${-h} L ${h},${-h} L ${h},${h} L ${-h},${h} Z`;
        }
        case 'triangle': {
            const h = r * 1.15;
            // Nudged down by a fifth of the height so the centroid, not the
            // bounding box, sits on the data point.
            const dy = h * 0.2;
            return `M 0,${-h + dy} L ${h * 0.87},${h * 0.5 + dy} L ${-h * 0.87},${h * 0.5 + dy} Z`;
        }
        case 'diamond': {
            const h = r * 1.25;
            return `M 0,${-h} L ${h},0 L 0,${h} L ${-h},0 Z`;
        }
        case 'circle':
        default:
            // Two arcs rather than a <circle>, so every shape is one <path> and
            // the callers stay uniform.
            return `M ${-r},0 A ${r},${r} 0 1 0 ${r},0 A ${r},${r} 0 1 0 ${-r},0 Z`;
    }
}

/** Racers past the palette land here rather than colliding with a real hue. */
export const RACE_COLOR_FALLBACK = '#94a3b8';

const RACE_MARKER_FALLBACK: RaceMarker = { shape: 'circle', filled: false };

/** Everything the chart and the cards need to identify one racer. */
export interface RaceStyle {
    color: string;
    marker: RaceMarker;
}

/**
 * Maps racer id → colour + marker.
 *
 * `ids` is expected in a stable order (roster/presence arrival, not ranking).
 * Self is pulled to the front when present so it is always palette slot 0.
 */
export function assignRaceStyles(ids: string[], selfId?: string): Map<string, RaceStyle> {
    const ordered = selfId && ids.includes(selfId)
        ? [selfId, ...ids.filter((id) => id !== selfId)]
        : ids;

    const out = new Map<string, RaceStyle>();
    ordered.forEach((id, i) => {
        out.set(id, {
            color: RACE_PALETTE[i] ?? RACE_COLOR_FALLBACK,
            marker: RACE_MARKERS[i] ?? RACE_MARKER_FALLBACK,
        });
    });
    return out;
}
