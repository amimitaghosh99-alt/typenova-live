import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Lock, Play, Star, Zap
} from 'lucide-react';
import { 
  LESSONS, 
  CATEGORY_LABELS, 
  getMasteryTitle,
  type LessonCategory 
} from '@/data/academyCurriculum';
import type { Theme } from '@/data/constants';

interface AcademySkillTreeProps {
  academyLevel: number;
  academyXp: number;
  xpToNextLevel: number;
  totalStars: number;
  nodeStars: Record<string, number>;
  unlockedNodeIds: Set<string>;
  onSelectNode: (nodeId: string) => void;
  theme?: Theme;
}

export function AcademySkillTree({
  academyLevel,
  academyXp,
  xpToNextLevel,
  totalStars,
  nodeStars,
  unlockedNodeIds,
  onSelectNode,
  theme,
}: AcademySkillTreeProps) {
  const [activeCategory, setActiveCategory] = useState<LessonCategory | 'all'>('all');
  const masteryTitle = getMasteryTitle(academyLevel);
  const maxPossibleStars = LESSONS.length * 3;
  const progressPercent = Math.min(100, Math.round((academyXp % xpToNextLevel) / xpToNextLevel * 100)) || 0;
  const themeGlow = theme?.glowPrimary || '0, 240, 255';

  // Filter lessons based on track tab
  const tracks: (LessonCategory | 'all')[] = ['all', 'foundations', 'reaches', 'fluency', 'cadence', 'mastery'];

  const filteredLessons = LESSONS.filter(l => 
    activeCategory === 'all' || l.category === activeCategory
  );

  return (
    <div className="w-full flex flex-col space-y-6 max-w-[1720px] mx-auto">
      
      {/* ── TOP MASTERY LEVEL & REPUTATION HUD ───────────────────────────── */}
      <motion.div 
        initial={{ opacity: 0, y: -10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="p-5 sm:p-6 rounded-3xl border shadow-2xl relative overflow-hidden shrink-0"
        style={{
          background: 'rgba(8, 10, 18, 0.60)',
          borderColor: `rgba(${themeGlow}, 0.35)`,
          boxShadow: `0 8px 32px rgba(0, 0, 0, 0.4), 0 0 25px rgba(${themeGlow}, 0.18)`
        }}
      >
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          {/* Level & Rank Title */}
          <div className="flex items-center gap-4">
            <div 
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center border shadow-lg text-2xl shrink-0 transition-transform duration-300 hover:scale-105"
              style={{ 
                borderColor: `rgba(${themeGlow}, 0.6)`,
                backgroundColor: `rgba(${themeGlow}, 0.15)`,
                boxShadow: `0 0 24px rgba(${themeGlow}, 0.35)`
              }}
            >
              <span>{masteryTitle.badge}</span>
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-mono font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border border-white/20 bg-white/10 text-white">
                  Level {academyLevel} / 50
                </span>
                <span 
                  className="text-xs font-mono font-bold uppercase tracking-wider"
                  style={{ color: `rgb(${themeGlow})` }}
                >
                  {masteryTitle.title}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-mono font-black text-white tracking-tight mt-1 drop-shadow-sm">
                TypeNova Neural Academy
              </h2>
            </div>
          </div>

          {/* Stars & Level Progress Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 w-full md:w-auto">
            {/* Total Stars Counter */}
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl border border-amber-500/40 bg-amber-500/15 shadow-lg shrink-0">
              <div className="p-2 rounded-xl bg-amber-500/25 text-amber-300">
                <Star className="fill-amber-400 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]" size={18} />
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold text-amber-300 uppercase tracking-widest block">
                  Mastery Stars
                </span>
                <span className="text-lg font-mono font-black text-white">
                  {totalStars} <span className="text-xs text-zinc-400">/ {maxPossibleStars}</span>
                </span>
              </div>
            </div>

            {/* Level XP Bar */}
            <div className="min-w-[200px] w-full sm:w-60 space-y-1.5 shrink-0">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-zinc-300">Mastery XP</span>
                <span className="text-white font-bold">{progressPercent}%</span>
              </div>
              <div className="h-2.5 w-full bg-white/15 rounded-full overflow-hidden p-0.5 border border-white/10">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="h-full rounded-full"
                  style={{ 
                    backgroundColor: `rgb(${themeGlow})`,
                    boxShadow: `0 0 14px rgba(${themeGlow}, 0.9)`
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── TRACK SELECTOR FILTER TABS (NEVER CUT OFF) ───────────────────── */}
      <div className="flex items-center gap-2.5 flex-wrap py-2.5 px-1 shrink-0 overflow-visible">
        {tracks.map((trackKey) => {
          const isActive = activeCategory === trackKey;
          const label = trackKey === 'all' 
            ? { name: 'All Mastery Tracks', icon: '🌌', color: `rgb(${themeGlow})` } 
            : CATEGORY_LABELS[trackKey];

          return (
            <motion.button
              key={trackKey}
              onClick={() => setActiveCategory(trackKey)}
              whileHover={{ scale: 1.04, y: -1 }}
              whileTap={{ scale: 0.96 }}
              className={`relative flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-mono font-bold tracking-wider uppercase transition-all shrink-0 cursor-pointer ${
                isActive 
                  ? 'text-white border shadow-md' 
                  : 'text-zinc-300 hover:text-white border border-white/15 bg-[#0a0c16]/65 hover:bg-[#121624]/80'
              }`}
              style={isActive ? {
                borderColor: `rgba(${themeGlow}, 0.8)`,
                backgroundColor: `rgba(${themeGlow}, 0.25)`,
                boxShadow: `0 0 20px rgba(${themeGlow}, 0.35)`
              } : undefined}
            >
              <span>{label.icon}</span>
              <span>{label.name}</span>
            </motion.button>
          );
        })}
      </div>

      {/* ── INTERACTIVE SKILL TREE NODE MAP (SMOOTH SCROLLING WITH VIEWPORT REVEAL) ── */}
      <motion.div 
        layout
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 pb-20"
      >
        <AnimatePresence mode="popLayout">
          {filteredLessons.map((lesson, idx) => {
            const isUnlocked = unlockedNodeIds.has(lesson.id);
            const stars = nodeStars[lesson.id] || 0;
            const isMastered = stars === 3;
            const catInfo = CATEGORY_LABELS[lesson.category];

            return (
              <motion.div
                key={lesson.id}
                layout
                initial={{ opacity: 0, y: 20, scale: 0.96 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true, margin: "-20px" }}
                exit={{ opacity: 0, scale: 0.94, y: -10 }}
                transition={{ 
                  duration: 0.22, 
                  delay: Math.min(0.18, idx * 0.02),
                  ease: "easeOut"
                }}
                whileHover={isUnlocked ? { scale: 1.025, y: -3, transition: { duration: 0.12 } } : {}}
                whileTap={isUnlocked ? { scale: 0.98 } : {}}
                onClick={() => isUnlocked && onSelectNode(lesson.id)}
                style={{
                  background: !isUnlocked 
                    ? 'rgba(8, 10, 16, 0.45)' 
                    : lesson.isBossNode
                      ? 'rgba(28, 14, 38, 0.70)'
                      : isMastered
                        ? 'rgba(10, 24, 34, 0.65)'
                        : 'rgba(10, 12, 22, 0.60)',
                  borderColor: isUnlocked && isMastered 
                    ? `rgba(${themeGlow}, 0.6)` 
                    : lesson.isBossNode 
                      ? 'rgba(245, 158, 11, 0.5)' 
                      : 'rgba(255, 255, 255, 0.12)',
                  boxShadow: isUnlocked && isMastered
                    ? `0 8px 24px rgba(0,0,0,0.4), 0 0 20px rgba(${themeGlow}, 0.2)`
                    : lesson.isBossNode && isUnlocked
                      ? '0 8px 24px rgba(0,0,0,0.4), 0 0 20px rgba(245,158,11,0.2)'
                      : '0 8px 24px rgba(0,0,0,0.4)'
                }}
                className={`relative rounded-3xl p-5 sm:p-6 border transition-all duration-200 flex flex-col justify-between overflow-hidden cursor-pointer group ${
                  !isUnlocked 
                    ? 'opacity-60 grayscale cursor-not-allowed'
                    : 'hover:border-white/30'
                }`}
              >
                <div>
                  {/* Node Header Row */}
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <span 
                        className="text-[10px] font-mono font-black uppercase px-2.5 py-0.5 rounded-full border"
                        style={{ 
                          borderColor: `${catInfo.color}50`,
                          backgroundColor: `${catInfo.color}20`,
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
                      <div className="flex items-center gap-1 text-xs font-mono text-zinc-400 bg-white/10 border border-white/10 px-2.5 py-1 rounded-full">
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
                                ? 'fill-amber-400 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.7)]' 
                                : 'text-zinc-600'
                            } 
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Lesson Title & Description */}
                  <h3 className="text-base sm:text-lg font-mono font-bold text-white tracking-tight group-hover:text-white transition-colors leading-snug drop-shadow-sm">
                    {lesson.title}
                  </h3>
                  <p className="text-xs font-mono text-zinc-300 mt-2 line-clamp-2 leading-relaxed">
                    {lesson.description}
                  </p>
                </div>

                {/* Node Footer Details */}
                <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-3 text-[11px] font-mono text-zinc-300">
                    <span className="flex items-center gap-1">
                      <Zap size={12} className="text-amber-400" />
                      +{lesson.xpReward} XP
                    </span>
                    <span>•</span>
                    <span>{lesson.steps.length} Steps</span>
                    <span>•</span>
                    <span>{lesson.targetWpm} WPM</span>
                  </div>

                  <div 
                    className="flex items-center gap-1.5 text-xs font-mono font-bold group-hover:translate-x-1 transition-transform"
                    style={{ color: `rgb(${themeGlow})` }}
                  >
                    <span>{isUnlocked ? (stars > 0 ? 'Replay' : 'Start') : 'Locked'}</span>
                    {isUnlocked && <Play size={12} style={{ fill: `rgb(${themeGlow})` }} />}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
