import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Trophy, Lock, Play, Star, Zap
} from 'lucide-react';
import { 
  LESSONS, 
  CATEGORY_LABELS, 
  getMasteryTitle,
  type LessonCategory 
} from '@/data/academyCurriculum';

interface AcademySkillTreeProps {
  academyLevel: number;
  academyXp: number;
  xpToNextLevel: number;
  totalStars: number;
  nodeStars: Record<string, number>;
  unlockedNodeIds: Set<string>;
  onSelectNode: (nodeId: string) => void;
}

export function AcademySkillTree({
  academyLevel,
  academyXp,
  xpToNextLevel,
  totalStars,
  nodeStars,
  unlockedNodeIds,
  onSelectNode,
}: AcademySkillTreeProps) {
  const [activeCategory, setActiveCategory] = useState<LessonCategory | 'all'>('all');
  const masteryTitle = getMasteryTitle(academyLevel);
  const maxPossibleStars = LESSONS.length * 3;
  const progressPercent = Math.min(100, Math.round((academyXp % xpToNextLevel) / xpToNextLevel * 100)) || 0;

  // Filter lessons based on track tab
  const tracks: (LessonCategory | 'all')[] = ['all', 'foundations', 'reaches', 'fluency', 'cadence', 'mastery'];

  const filteredLessons = LESSONS.filter(l => 
    activeCategory === 'all' || l.category === activeCategory
  );

  return (
    <div className="w-full h-full flex flex-col overflow-y-auto custom-scrollbar p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      
      {/* ── TOP MASTERY LEVEL & REPUTATION HUD ───────────────────────────── */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-5 sm:p-6 rounded-3xl border border-white/12 bg-gradient-to-r from-[#12121c] via-[#161626] to-[#12121c] shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          {/* Level & Rank Title */}
          <div className="flex items-center gap-4">
            <div 
              className="w-16 h-16 rounded-2xl flex items-center justify-center border shadow-lg text-2xl"
              style={{ 
                borderColor: masteryTitle.color,
                backgroundColor: `${masteryTitle.color}15`,
                boxShadow: `0 0 24px ${masteryTitle.color}30`
              }}
            >
              <span>{masteryTitle.badge}</span>
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-mono font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border border-white/15 bg-white/5 text-zinc-300">
                  Level {academyLevel} / 50
                </span>
                <span 
                  className="text-xs font-mono font-bold uppercase tracking-wider"
                  style={{ color: masteryTitle.color }}
                >
                  {masteryTitle.title}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-mono font-black text-white tracking-tight mt-1">
                TypeNova Neural Academy
              </h2>
            </div>
          </div>

          {/* Stars & Level Progress Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 w-full md:w-auto">
            {/* Total Stars Counter */}
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl border border-amber-500/30 bg-amber-500/10 shadow-lg">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300">
                <Star className="fill-amber-400 text-amber-400" size={18} />
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold text-amber-300 uppercase tracking-widest block">
                  Mastery Stars
                </span>
                <span className="text-lg font-mono font-black text-white">
                  {totalStars} <span className="text-xs text-zinc-500">/ {maxPossibleStars}</span>
                </span>
              </div>
            </div>

            {/* Level XP Bar */}
            <div className="min-w-[200px] w-full sm:w-56 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-zinc-400">Mastery XP</span>
                <span className="text-white font-bold">{progressPercent}%</span>
              </div>
              <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden p-0.5">
                <div 
                  className="h-full rounded-full transition-all duration-500"
                  style={{ 
                    width: `${progressPercent}%`,
                    backgroundColor: masteryTitle.color,
                    boxShadow: `0 0 10px ${masteryTitle.color}`
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── TRACK SELECTOR FILTER TABS ───────────────────────────────────── */}
      <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1">
        {tracks.map((trackKey) => {
          const isActive = activeCategory === trackKey;
          const label = trackKey === 'all' 
            ? { name: 'All Mastery Tracks', icon: '🌌', color: '#00f0ff' } 
            : CATEGORY_LABELS[trackKey];

          return (
            <button
              key={trackKey}
              onClick={() => setActiveCategory(trackKey)}
              className={`relative flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-mono font-bold tracking-wider uppercase transition-all shrink-0 cursor-pointer ${
                isActive 
                  ? 'text-white border shadow-md' 
                  : 'text-zinc-400 hover:text-zinc-200 border border-white/5 bg-[#12121a] hover:bg-[#181824]'
              }`}
              style={isActive ? {
                borderColor: `${label.color}60`,
                backgroundColor: `${label.color}18`,
                boxShadow: `0 0 16px ${label.color}25`
              } : undefined}
            >
              <span>{label.icon}</span>
              <span>{label.name}</span>
            </button>
          );
        })}
      </div>

      {/* ── INTERACTIVE SKILL TREE NODE MAP ──────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 pb-12">
        {filteredLessons.map((lesson, idx) => {
          const isUnlocked = unlockedNodeIds.has(lesson.id);
          const stars = nodeStars[lesson.id] || 0;
          const isMastered = stars === 3;
          const catInfo = CATEGORY_LABELS[lesson.category];

          return (
            <motion.div
              key={lesson.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
              whileHover={isUnlocked ? { scale: 1.02, y: -2 } : {}}
              onClick={() => isUnlocked && onSelectNode(lesson.id)}
              className={`relative rounded-3xl p-5 sm:p-6 border transition-all duration-200 flex flex-col justify-between overflow-hidden cursor-pointer group ${
                !isUnlocked 
                  ? 'bg-[#0d0d12]/80 border-white/5 opacity-60 grayscale cursor-not-allowed'
                  : lesson.isBossNode
                    ? 'bg-gradient-to-b from-[#1c1426] to-[#120e1a] border-amber-500/40 shadow-[0_0_30px_rgba(245,158,11,0.15)] hover:border-amber-400'
                    : isMastered
                      ? 'bg-gradient-to-b from-[#141d24] to-[#0f141a] border-cyan-500/40 shadow-[0_0_25px_rgba(6,182,212,0.15)] hover:border-cyan-400'
                      : 'bg-[#12121a] hover:bg-[#161624] border-white/10 hover:border-white/20 shadow-lg'
              }`}
            >
              {/* Boss / Master Glow Header Effect */}
              {lesson.isBossNode && isUnlocked && (
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/15 rounded-full blur-2xl pointer-events-none" />
              )}

              <div>
                {/* Node Header Row */}
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <span 
                      className="text-[10px] font-mono font-black uppercase px-2.5 py-0.5 rounded-full border"
                      style={{ 
                        borderColor: `${catInfo.color}40`,
                        backgroundColor: `${catInfo.color}15`,
                        color: catInfo.color 
                      }}
                    >
                      {catInfo.name}
                    </span>
                    {lesson.isBossNode && (
                      <span className="text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded-full border border-amber-500/50 bg-amber-500/20 text-amber-300 flex items-center gap-1 shadow-sm">
                        <Trophy size={11} className="text-amber-400" />
                        BOSS TRIAL
                      </span>
                    )}
                  </div>

                  {/* Lock / Star Rating Badge */}
                  {!isUnlocked ? (
                    <div className="flex items-center gap-1 text-xs font-mono text-zinc-500 bg-white/5 border border-white/5 px-2.5 py-1 rounded-full">
                      <Lock size={12} />
                      <span>Locked</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      {[1, 2, 3].map((starNum) => (
                        <Star 
                          key={starNum}
                          size={14} 
                          className={
                            starNum <= stars 
                              ? 'fill-amber-400 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]' 
                              : 'text-zinc-600'
                          } 
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Lesson Title & Description */}
                <h3 className="text-base sm:text-lg font-mono font-bold text-white tracking-tight group-hover:text-cyan-300 transition-colors leading-snug">
                  {lesson.title}
                </h3>
                <p className="text-xs font-mono text-zinc-400 mt-2 line-clamp-2 leading-relaxed">
                  {lesson.description}
                </p>
              </div>

              {/* Node Footer Details */}
              <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3 text-[11px] font-mono text-zinc-400">
                  <span className="flex items-center gap-1">
                    <Zap size={12} className="text-amber-400" />
                    +{lesson.xpReward} XP
                  </span>
                  <span>•</span>
                  <span>{lesson.steps.length} Steps</span>
                  <span>•</span>
                  <span>{lesson.targetWpm} WPM</span>
                </div>

                <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-cyan-400 group-hover:translate-x-1 transition-transform">
                  <span>{isUnlocked ? (stars > 0 ? 'Replay' : 'Start') : 'Locked'}</span>
                  {isUnlocked && <Play size={12} className="fill-cyan-400" />}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
