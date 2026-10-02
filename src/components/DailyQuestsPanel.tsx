import { X, Flame, CheckCircle2, Award, Zap } from 'lucide-react';
import type { Quest, QuestsState } from '@/lib/progress';
import type { Theme } from '@/data/constants';

interface DailyQuestsPanelProps {
  questsState: QuestsState | null;
  dailyStreak: number;
  onClose: () => void;
  theme?: Theme;
}

export function DailyQuestsPanel({ questsState, dailyStreak, onClose, theme }: DailyQuestsPanelProps) {
  const glowPrimary = theme?.glowPrimary || '34, 211, 238';
  const quests = questsState?.active || [];
  const completedCount = quests.filter((q) => q.completed).length;

  const getQuestLabel = (quest: Quest) => {
    switch (quest.type) {
      case 'races_won':
        return `Win ${quest.target} Multiplayer Races`;
      case 'words_typed':
        return `Type ${quest.target} Total Words`;
      case 'wpm_achieved':
        return `Achieve a Speed of ${quest.target}+ WPM`;
      case 'acc_achieved':
        return `Achieve ${quest.target}%+ Accuracy in a Test`;
      default:
        return 'Complete Daily Quest';
    }
  };

  return (
    <div
      className="fixed inset-0 z-[500] flex items-center justify-center bg-black/80 p-4 overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="glass-panel relative w-full max-w-md my-auto flex flex-col rounded-2xl bg-slate-950/70 border border-white/15 shadow-2xl overflow-hidden p-5 sm:p-6 font-mono min-h-0 lucid-scale"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle Ambient Glow */}
        <div
          className="absolute -top-28 -left-28 w-72 h-72 rounded-full blur-3xl pointer-events-none"
          style={{ backgroundColor: `rgba(${glowPrimary}, 0.15)` }}
        />

        {/* Header */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10 shrink-0 relative z-10">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{
                background: `linear-gradient(135deg, rgba(${glowPrimary}, 0.2), rgba(${theme?.glowSecondary || glowPrimary}, 0.2))`,
                border: `1px solid rgba(${glowPrimary}, 0.4)`,
                color: `rgb(${glowPrimary})`,
                boxShadow: `0 0 12px rgba(${glowPrimary}, 0.2)`,
              }}
            >
              <Flame size={18} className="animate-pulse" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                Daily Quests
                <span
                  className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-mono"
                  style={{
                    backgroundColor: `rgba(${glowPrimary}, 0.15)`,
                    border: `1px solid rgba(${glowPrimary}, 0.3)`,
                    color: `rgb(${glowPrimary})`,
                  }}
                >
                  <Flame size={10} className="shrink-0" style={{ color: `rgb(${glowPrimary})` }} /> {dailyStreak} Day Streak
                </span>
              </h2>
              <p className="text-[10px] text-zinc-400">Resets daily at 00:00 UTC</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 bg-white/5 hover:bg-white/15 border border-white/10 text-zinc-400 hover:text-white rounded-full transition-all hover:rotate-90 cursor-pointer"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Quest List */}
        <div className="flex flex-col gap-3 my-2 relative z-10">
          {quests.length === 0 ? (
            <div className="py-8 text-center text-zinc-500 text-xs">Loading daily quests...</div>
          ) : (
            quests.map((quest) => {
              const progressPct = Math.min(100, Math.round((quest.progress / quest.target) * 100));

              return (
                <div
                  key={quest.id}
                  className={`p-3.5 rounded-xl border transition-all ${
                    quest.completed
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-white'
                      : 'bg-slate-900/50 border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      {quest.completed ? (
                        <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                      ) : (
                        <Award
                          size={16}
                          className="shrink-0"
                          style={{ color: `rgb(${glowPrimary})` }}
                        />
                      )}
                      <span className="text-xs font-bold text-zinc-200">
                        {getQuestLabel(quest)}
                      </span>
                    </div>

                    <span
                      className="shrink-0 flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded"
                      style={{
                        backgroundColor: `rgba(${glowPrimary}, 0.15)`,
                        border: `1px solid rgba(${glowPrimary}, 0.3)`,
                        color: `rgb(${glowPrimary})`,
                      }}
                    >
                      <Zap size={10} /> +{quest.xpReward} XP
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-zinc-400">
                      <span>Progress</span>
                      <span
                        className={quest.completed ? 'text-emerald-400 font-bold' : ''}
                        style={!quest.completed ? { color: `rgb(${glowPrimary})` } : undefined}
                      >
                        {quest.progress} / {quest.target} ({progressPct}%)
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-950/80 rounded-full overflow-hidden p-0.5 border border-white/5">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${progressPct}%`,
                          backgroundColor: quest.completed ? '#34d399' : `rgb(${glowPrimary})`,
                          boxShadow: quest.completed
                            ? '0 0 8px rgba(52,211,153,0.8)'
                            : `0 0 8px rgba(${glowPrimary}, 0.6)`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer streak bonus info */}
        <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between text-[10px] text-zinc-400 relative z-10">
          <span>Completed: {completedCount} / 3</span>
          <span className="font-bold" style={{ color: `rgb(${glowPrimary})` }}>
            Multiplier: {(1 + Math.min(dailyStreak * 0.1, 1.0)).toFixed(1)}x XP
          </span>
        </div>
      </div>
    </div>
  );
}
