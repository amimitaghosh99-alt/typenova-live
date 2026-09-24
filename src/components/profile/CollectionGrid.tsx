// ═══════════════════════════════════════════════════════════════════════
//  COLLECTION GRID — titles and achievements, in one place
//  ---------------------------------------------------------------------
//  These were two tabs. Both answered the same question — what has this operator
//  earned — and split it by an implementation detail: titles are equippable and
//  stored in `public_profiles.unlocked_badges`, achievements are not equippable
//  and stored locally. A player looking for "what do I have" had to know which
//  of those two facts applied to the thing they were looking for.
//
//  Two filters, not three. An "Everything" option was the default and it was the
//  wrong default twice over: it mixed the equippable with the earned-once, so a
//  grid of twenty-six tiles carried two different affordances with no visual
//  break between them, and it was the most expensive subtree on the page to paint
//  while scrolling. Titles and Badges answer the question you arrived with, and
//  either one is at most seventeen tiles.
//
//  Inside a filter: equipped first, then earned, then locked ordered by how close
//  they are — a fixed data-file order buried the one you could nearly claim under
//  four you could not.
//
//  ── Motion ──
//  This is the one grid on the page whose items are *objects* rather than
//  readouts, so it is the one place that earns surface behaviour rather than only
//  an entrance:
//
//    · a spotlight and a rim light that track the pointer across a tile, written
//      by one handler on the grid onto the hovered tile only
//    · a breathing aura on the equipped title, the only loop on the page, because
//      exactly one tile is the thing you are wearing and a border colour was not
//      enough to find it
//    · a pill that slides between the two filters
//    · a full re-cascade when the order changes, so equipping reads as the board
//      re-ranking itself rather than two tiles teleporting past each other
// ═══════════════════════════════════════════════════════════════════════

import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Check, Lock } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useReducedMotion } from 'framer-motion';
import { EquipBurst } from '@/components/profile/ProfileFx';
import { rgba } from '@/components/profile/profileMotion';

export interface CollectionItem {
    id: string;
    kind: 'title' | 'badge';
    name: string;
    description: string;
    icon: LucideIcon;
    unlocked: boolean;
    equipped: boolean;
    /** Unlocked *and* yours to equip. A remote operator's titles are neither. */
    equippable: boolean;
    progress?: { current: number; target: number; unit: string };
}

type Filter = 'title' | 'badge';

const FILTERS: Array<{ id: Filter; label: string }> = [
    { id: 'title', label: 'Titles' },
    { id: 'badge', label: 'Badges' },
];

export function CollectionGrid({
    items,
    accent,
    equipPulse,
    onEquip,
}: {
    items: CollectionItem[];
    accent: string;
    /** `id:tick`, so re-equipping the same title replays the burst. */
    equipPulse: string | null;
    onEquip?: (id: string) => void;
}) {
    const reduce = useReducedMotion();

    /**
     * Titles open, because they are the half of the collection you can *do*
     * something with — and on a remote dossier they are the only half published.
     */
    const [filter, setFilter] = useState<Filter>('title');

    /**
     * Bumped on every equip. It is part of the grid's `key`, so the reorder that
     * follows remounts the grid and replays the cascade: the board visibly
     * re-ranks instead of two cards swapping places between frames.
     */
    const [rankTick, setRankTick] = useState(0);

    const shown = useMemo(() => {
        const rank = (item: CollectionItem) => (item.equipped ? 0 : item.unlocked ? 1 : 2);
        const closeness = (item: CollectionItem) => {
            const p = item.progress;
            if (!p || p.target <= 0) return 0;
            return Math.max(0, Math.min(1, p.current / p.target));
        };
        return items
            .filter((item) => item.kind === filter)
            .sort((a, b) => rank(a) - rank(b) || closeness(b) - closeness(a));
    }, [items, filter]);

    const tally = useMemo(() => {
        const of = (kind: Filter) => {
            const group = items.filter((i) => i.kind === kind);
            return { earned: group.filter((i) => i.unlocked).length, total: group.length };
        };
        return { title: of('title'), badge: of('badge') };
    }, [items]);

    /**
     * A remote operator publishes titles only, so the badge filter would open on
     * an empty grid. One filter is not a choice, so the strip goes away.
     */
    const available = useMemo(() => FILTERS.filter((f) => tally[f.id].total > 0), [tally]);

    /* ─── The pointer light ──────────────────────────────────────────────
       One handler on the grid rather than one per tile. It writes two custom
       properties onto the tile under the cursor; the gradients themselves live in
       `index.css`. So the cost is a repaint of a single tile while the pointer is
       inside it, and nothing whatsoever when it is not. */
    const onPointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
        if (reduce) return;
        const tile = (event.target as HTMLElement).closest<HTMLElement>('[data-tile]');
        if (!tile) return;
        const box = tile.getBoundingClientRect();
        tile.style.setProperty('--mx', `${event.clientX - box.left}px`);
        tile.style.setProperty('--my', `${event.clientY - box.top}px`);
    }, [reduce]);

    /* ─── The filter pill ───────────────────────────────────────────────
       Measured geometry published as two properties, exactly like the section
       spy's indicator, so the travel is one composited transform. */
    const chipRefs = useRef<Record<string, HTMLButtonElement | null>>({});
    const [pill, setPill] = useState<{ x: number; w: number } | null>(null);
    useLayoutEffect(() => {
        const node = chipRefs.current[filter];
        if (!node) return;

        const measure = () => {
            const current = chipRefs.current[filter];
            if (current) setPill({ x: current.offsetLeft, w: current.offsetWidth });
        };

        measure();
        // The labels carry a live count, so a chip's width changes when a title is
        // earned as well as when the web font swaps in.
        const observer = new ResizeObserver(measure);
        observer.observe(node);
        return () => observer.disconnect();
    }, [filter, available.length, tally]);

    const equip = useCallback((id: string) => {
        onEquip?.(id);
        setRankTick((n) => n + 1);
    }, [onEquip]);

    return (
        <div>
            {available.length > 1 && (
                <div
                    role="tablist"
                    aria-label="Collection filter"
                    // Deliberately not wrapping: the pill's position is a single
                    // `offsetLeft`, so a second row would leave it under the wrong
                    // chip. Two chips never need to wrap.
                    className="relative mb-4 inline-flex gap-2"
                >
                    <span
                        aria-hidden
                        className="dsr-chip-pill"
                        data-ready={pill ? 'true' : 'false'}
                        style={{
                            '--chip-x': `${pill?.x ?? 0}px`,
                            '--chip-w': `${pill?.w ?? 0}px`,
                        } as React.CSSProperties}
                    />
                    {available.map((f) => {
                        const active = filter === f.id;
                        return (
                            <button
                                key={f.id}
                                ref={(node) => { chipRefs.current[f.id] = node; }}
                                type="button"
                                role="tab"
                                aria-selected={active}
                                onClick={() => setFilter(f.id)}
                                // No `dsr-interactive`: the pill behind it carries the
                                // active fill, and a second fill on the button itself
                                // would slide out from under its own background.
                                className="relative rounded-full border border-transparent px-3.5 py-1.5 outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-white/40"
                            >
                                <span
                                    className="dsr-body text-[13px] transition-colors duration-200"
                                    style={{ color: active ? 'var(--dsr-ink)' : 'var(--dsr-ink-2)' }}
                                >
                                    {f.label}
                                </span>
                                <span className="dsr-unit ml-2">
                                    {tally[f.id].earned}/{tally[f.id].total}
                                </span>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* The key covers both the filter and the ranking, so either kind of
                reorder replays the cascade. The cascade itself is gated on the
                section having been revealed (see `index.css`), so it does not fire
                while the section is still below the fold. */}
            <div
                key={`${filter}:${rankTick}`}
                onPointerMove={onPointerMove}
                className="dossier-stagger grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 3xl:grid-cols-5"
            >
                {shown.map((item) => {
                    const Icon = item.icon;
                    const interactive = item.equippable && !!onEquip;
                    const pulsing = equipPulse?.startsWith(`${item.id}:`) ? equipPulse : null;

                    return (
                        <button
                            key={`${item.kind}-${item.id}`}
                            data-tile
                            type="button"
                            disabled={!interactive}
                            aria-pressed={interactive ? item.equipped : undefined}
                            onClick={interactive ? () => equip(item.id) : undefined}
                            /* No `content-visibility` here, and that was measured
                               rather than assumed. Skipping off-screen tiles moved
                               the median frame not at all and made the worst frame
                               five times worse: entering the rendered state costs a
                               layout and a paint for the whole tile on the one frame
                               it becomes visible, which is exactly the frame that
                               was already busy. */
                            className={`dsr-interactive dsr-tile group relative overflow-hidden rounded-[14px] p-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${
                                interactive ? 'cursor-pointer' : 'cursor-default'
                            } ${item.equipped ? 'dsr-tile-equipped' : ''}`}
                            style={
                                item.equipped
                                    ? {
                                        borderColor: rgba(accent, 0.5),
                                        background: rgba(accent, 0.07),
                                    }
                                    : undefined
                            }
                        >
                            <EquipBurst pulseKey={pulsing} color={accent} radius="14px" />
                            {item.equipped && <span aria-hidden className="dsr-equipped-aura" />}

                            <div className="relative flex items-start gap-3">
                                {/* The mark leans in under the cursor. Transform only,
                                    and only on the tiles that are actually
                                    interactive — a hover flourish on a locked tile is
                                    a promise the tile cannot keep. */}
                                <span
                                    aria-hidden
                                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border transition-transform duration-300 ease-snappy motion-reduce:transition-none ${
                                        interactive
                                            ? 'group-hover:-rotate-6 group-hover:scale-110 motion-reduce:group-hover:rotate-0 motion-reduce:group-hover:scale-100'
                                            : ''
                                    }`}
                                    style={{
                                        borderColor: item.equipped ? rgba(accent, 0.4) : 'var(--dsr-line)',
                                        background: item.equipped ? rgba(accent, 0.12) : 'rgba(255,255,255,0.03)',
                                    }}
                                >
                                    <Icon
                                        size={16}
                                        style={{ color: item.unlocked ? rgba(accent, 0.9) : 'var(--dsr-ink-3)' }}
                                    />
                                </span>

                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                        <span
                                            className="truncate text-[13px] font-medium"
                                            style={{ color: item.unlocked ? 'var(--dsr-ink)' : 'var(--dsr-ink-2)' }}
                                        >
                                            {item.name}
                                        </span>
                                        {!item.unlocked && (
                                            <Lock size={11} className="shrink-0 text-[var(--dsr-ink-3)]" aria-hidden />
                                        )}
                                    </div>
                                    <p className="dsr-note mt-1">
                                        {item.description}
                                    </p>

                                    {!item.unlocked && item.progress && item.progress.target > 0 && (
                                        <div className="mt-2.5">
                                            <div
                                                className="h-[2px] w-full overflow-hidden rounded-full bg-white/[0.07]"
                                                aria-hidden
                                            >
                                                <span
                                                    className="dossier-meter block h-full w-full rounded-full"
                                                    style={
                                                        {
                                                            '--meter-fill': Math.max(
                                                                0,
                                                                Math.min(1, item.progress.current / item.progress.target),
                                                            ),
                                                            '--meter-delay': '220ms',
                                                            // Tinted rather than white: a locked item's bar is
                                                            // progress toward *this* accent, and at 45% it still
                                                            // reads as inactive against the earned tiles.
                                                            background: rgba(accent, 0.45),
                                                        } as React.CSSProperties
                                                    }
                                                />
                                            </div>
                                            <div className="dsr-unit mt-1.5 text-[11px]">
                                                {Math.round(item.progress.current).toLocaleString()} /{' '}
                                                {item.progress.target.toLocaleString()} {item.progress.unit}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {item.equipped && (
                                    <span
                                        className="dsr-label flex shrink-0 items-center gap-1 self-center rounded-full px-2 py-1 text-[10px] leading-none"
                                        style={{
                                            background: rgba(accent, 0.14),
                                            color: rgba(accent, 1),
                                            border: `1px solid ${rgba(accent, 0.45)}`,
                                        }}
                                    >
                                        <Check size={9} strokeWidth={4} aria-hidden />
                                        Equipped
                                    </span>
                                )}
                                {!item.equipped && interactive && (
                                    <span
                                        className="dsr-label shrink-0 self-center rounded-full border border-[var(--dsr-line)] px-2 py-1 text-[10px] leading-none transition-colors duration-200 group-hover:text-[var(--dsr-ink)]"
                                        style={{ transitionProperty: 'color, border-color, background-color' }}
                                    >
                                        Equip
                                    </span>
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
