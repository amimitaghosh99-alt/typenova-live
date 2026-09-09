import { CalendarClock } from 'lucide-react';

/**
 * Pinned Academy card for the word-weakness review queue.
 *
 * Deliberately NOT a node in the skill tree: the curriculum is a static graph
 * (`buildCurriculum(SEEDS)`), and injecting a dynamic node would corrupt
 * `TOTAL_XP_AVAILABLE`, `TOTAL_STARS_POSSIBLE`, `computeUnlockedIds` and every
 * persisted `starsMap`. A pinned card delivers the same discoverability with
 * zero curriculum surgery.
 *
 * Hidden entirely when nothing is due — the Academy never nags.
 */
export function WeaknessTrainerCard({
    dueWordsCount,
    onTrainDue,
    accent,
}: {
    dueWordsCount: number;
    onTrainDue?: () => void;
    accent: string;
}) {
    if (dueWordsCount <= 0 || !onTrainDue) return null;

    return (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 backdrop-blur-md">
            <div className="flex min-w-0 items-center gap-3">
                <span
                    className="rounded-xl border bg-white/[0.04] p-2"
                    style={{ borderColor: accent, color: accent }}
                    aria-hidden="true"
                >
                    <CalendarClock size={16} />
                </span>
                <div className="min-w-0">
                    <p className="font-mono text-[10px] font-black uppercase tracking-[0.18em] text-white/80">
                        Weakness Trainer
                    </p>
                    <p className="truncate font-mono text-[10px] text-white/40">
                        {dueWordsCount} word{dueWordsCount === 1 ? '' : 's'} due for review
                    </p>
                </div>
            </div>
            <button
                type="button"
                onClick={onTrainDue}
                className="rounded-full border px-4 py-1.5 font-mono text-[10px] font-black uppercase tracking-[0.16em] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-white/40 hover:brightness-125"
                style={{ borderColor: accent, color: accent, background: 'rgba(255,255,255,0.04)' }}
            >
                Review now
            </button>
        </div>
    );
}
