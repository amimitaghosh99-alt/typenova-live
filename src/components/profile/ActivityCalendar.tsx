// ═══════════════════════════════════════════════════════════════════════
//  ACTIVITY CALENDAR — the only view on the dossier with a real time axis
//  ---------------------------------------------------------------------
//  Drawn as a CSS grid flowing down columns: seven rows of day-of-week, one
//  column per week. The alternative — absolutely positioning ~180 nodes — costs
//  a layout pass per cell for a board that never moves. Intensity is one data
//  attribute per cell resolved against `--dsr-accent` in `index.css`, so the
//  whole board is a single style recalculation and re-skinning it with the
//  operator's banner colour costs nothing.
//
//  The bucketing and the streak arithmetic live in `hooks/useActivity`, because
//  the section heading around this board states the same numbers and deriving
//  them twice from the same log is how two figures describing one fact drift.
// ═══════════════════════════════════════════════════════════════════════

import type { ActivityCell } from '@/hooks/useActivity';

/**
 * `role="img"` with a summarising label rather than a grid of 182 focusable
 * nodes: the per-day figures are in each cell's `title`, and the fact a screen
 * reader needs is the summary the section heading already states.
 */
export function ActivityCalendar({
    cells,
    label,
}: {
    cells: ActivityCell[];
    label: string;
}) {
    return (
        <div className="overflow-x-auto pb-1">
            <div className="min-w-max">
                {/* Month ruler. Absolute-free: one span per week keeps the labels
                    locked to the same track widths as the cells below. */}
                <div className="dsr-cal mb-1.5 !grid-rows-1">
                    {cells.map((cell, i) =>
                        i % 7 === 0 ? (
                            <span
                                key={`m-${cell.key}`}
                                className="dsr-unit whitespace-nowrap text-[10px] leading-none"
                            >
                                {cell.monthLabel ?? ''}
                            </span>
                        ) : null,
                    )}
                </div>

                <div className="dsr-cal" role="img" aria-label={label}>
                    {cells.map((cell) => (
                        <span
                            key={cell.key}
                            className="dsr-cal-cell"
                            data-level={cell.level}
                            title={
                                cell.count === 0
                                    ? `${cell.date.toDateString()} — no tests`
                                    : `${cell.date.toDateString()} — ${cell.count} test${cell.count === 1 ? '' : 's'}, ${cell.avgWpm} WPM avg`
                            }
                        />
                    ))}
                </div>

                <div className="mt-2.5 flex items-center gap-1.5">
                    <span className="dsr-unit mr-1 text-[10px]">Less</span>
                    {[0, 1, 2, 3, 4].map((l) => (
                        <span key={l} className="dsr-cal-cell h-[10px] w-[10px]" data-level={l} aria-hidden />
                    ))}
                    <span className="dsr-unit ml-1 text-[10px]">More</span>
                </div>
            </div>
        </div>
    );
}
