import { useState } from 'react';
import { Award, Flame, Zap, Target, ShieldCheck, ChevronDown, Check } from 'lucide-react';
import { TITLE_BADGES, getActiveTitleId, setActiveTitleId, type UserSkillStats } from '@/data/titles';

interface ProfileCardProps {
  username?: string;
  level: number;
  xp: number;
  currentLevelProgress: number;
  xpNeeded: number;
  skillStats: UserSkillStats;
  compact?: boolean;
}

export function ProfileCard({
  username = 'Typist',
  level,
  xp,
  currentLevelProgress,
  xpNeeded,
  skillStats,
  compact = false,
}: ProfileCardProps) {
  const [activeTitleId, setActiveTitleIdState] = useState(() => getActiveTitleId());
  const [showBadgeSelector, setShowBadgeSelector] = useState(false);

  const activeBadge = TITLE_BADGES.find((b) => b.id === activeTitleId) || TITLE_BADGES[0];

  const handleSelectTitle = (id: string) => {
    setActiveTitleId(id);
    setActiveTitleIdState(id);
    setShowBadgeSelector(false);
  };

  const unlockedCount = TITLE_BADGES.filter((b) => b.isUnlocked(skillStats)).length;

  if (compact) {
    return (
      <div className="glass-panel relative rounded-xl bg-slate-900/60 border border-white/10 p-2.5 flex items-center justify-between font-mono">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="w-8 h-8 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-300 font-bold uppercase text-xs">
              {username.substring(0, 1)}
            </div>
            <div className="absolute -bottom-1 -right-1 bg-cyan-500 text-black font-extrabold text-[8px] px-1 rounded-full border border-slate-950">
              L{level}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-white">{username}</span>
              <span className={`text-[9px] px-1.5 py-0.2 rounded border font-mono ${activeBadge.color}`}>
                {activeBadge.icon} {activeBadge.name}
              </span>
            </div>
            <div className="text-[10px] text-zinc-400">
              {xp} XP | {skillStats.maxWpm} Max WPM
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-panel relative rounded-2xl bg-slate-950/60 border border-white/15 p-5 font-mono overflow-hidden">
      {/* Subtle background glow */}
      <div className="absolute -top-24 -right-24 w-60 h-60 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Profile Info */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4 pb-4 border-b border-white/10">
        <div className="flex items-center gap-3.5">
          <div className="relative">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border-2 border-cyan-400/50 flex items-center justify-center text-cyan-300 font-black text-lg uppercase shadow-[0_0_15px_rgba(6,182,212,0.3)]">
              {username.substring(0, 1)}
            </div>
            <div className="absolute -bottom-1 -right-1 bg-cyan-400 text-slate-950 font-black text-[10px] px-1.5 py-0.2 rounded-full border-2 border-slate-950 shadow-md">
              LVL {level}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-white tracking-tight">{username}</h3>
            </div>

            {/* Active Title Badge */}
            <button
              onClick={() => setShowBadgeSelector(!showBadgeSelector)}
              className={`mt-1 flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold border transition-all hover:scale-105 ${activeBadge.color}`}
            >
              <span>{activeBadge.icon}</span>
              <span>{activeBadge.name}</span>
              <ChevronDown size={12} className="opacity-60" />
            </button>
          </div>
        </div>

        {/* Level XP Bar */}
        <div className="w-full sm:w-48 bg-slate-900/60 border border-white/10 p-2.5 rounded-xl">
          <div className="flex justify-between items-center text-[10px] font-mono text-zinc-400 mb-1">
            <span>Level {level}</span>
            <span className="text-cyan-300 font-bold">{xp} XP</span>
          </div>
          <div className="h-2 w-full bg-slate-950/80 rounded-full overflow-hidden p-0.5 border border-white/5">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-teal-400 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(6,182,212,0.6)]"
              style={{ width: `${Math.min(100, Math.max(0, (currentLevelProgress / xpNeeded) * 100))}%` }}
            />
          </div>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        <div className="bg-slate-900/40 border border-white/5 p-2.5 rounded-xl flex items-center gap-2">
          <Zap size={14} className="text-amber-400 shrink-0" />
          <div>
            <div className="text-[9px] text-zinc-400 uppercase">Max WPM</div>
            <div className="text-xs font-bold text-white">{skillStats.maxWpm} WPM</div>
          </div>
        </div>

        <div className="bg-slate-900/40 border border-white/5 p-2.5 rounded-xl flex items-center gap-2">
          <Target size={14} className="text-emerald-400 shrink-0" />
          <div>
            <div className="text-[9px] text-zinc-400 uppercase">Avg Acc</div>
            <div className="text-xs font-bold text-white">{skillStats.avgAccuracy}%</div>
          </div>
        </div>

        <div className="bg-slate-900/40 border border-white/5 p-2.5 rounded-xl flex items-center gap-2">
          <Flame size={14} className="text-orange-400 shrink-0" />
          <div>
            <div className="text-[9px] text-zinc-400 uppercase">Streak</div>
            <div className="text-xs font-bold text-white">{skillStats.dailyStreak} Days</div>
          </div>
        </div>

        <div className="bg-slate-900/40 border border-white/5 p-2.5 rounded-xl flex items-center gap-2">
          <ShieldCheck size={14} className="text-cyan-400 shrink-0" />
          <div>
            <div className="text-[9px] text-zinc-400 uppercase">Badges</div>
            <div className="text-xs font-bold text-white">
              {unlockedCount} / {TITLE_BADGES.length}
            </div>
          </div>
        </div>
      </div>

      {/* Title Badge Selection Dropdown Modal */}
      {showBadgeSelector && (
        <div className="mt-3 pt-3 border-t border-white/10 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <Award size={14} className="text-cyan-400" /> Select Skill Title Badge
            </span>
            <span className="text-[10px] text-zinc-400">
              {unlockedCount} Unlocked
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto custom-scrollbar p-1">
            {TITLE_BADGES.map((badge) => {
              const unlocked = badge.isUnlocked(skillStats);
              const isSelected = badge.id === activeTitleId;

              return (
                <button
                  key={badge.id}
                  disabled={!unlocked}
                  onClick={() => unlocked && handleSelectTitle(badge.id)}
                  className={`flex items-center justify-between p-2 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'bg-cyan-500/15 border-cyan-500/40 text-white shadow-[0_0_12px_rgba(6,182,212,0.2)]'
                      : unlocked
                      ? 'bg-slate-900/40 border-white/10 hover:border-white/20 text-zinc-300'
                      : 'bg-slate-950/40 border-white/5 opacity-40 cursor-not-allowed text-zinc-500'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-base">{badge.icon}</span>
                    <div className="min-w-0">
                      <div className="text-xs font-bold truncate">{badge.name}</div>
                      <div className="text-[9px] text-zinc-400 truncate">{badge.description}</div>
                    </div>
                  </div>
                  {isSelected && <Check size={14} className="text-cyan-400 shrink-0 ml-1" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
