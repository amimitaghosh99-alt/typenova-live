import { useState } from 'react';
import { 
  Trophy, LayoutGrid, 
  Volume2, VolumeX, Gauge, Activity, ArrowLeft,
  RotateCcw, Star, Zap, ShieldAlert
} from 'lucide-react';
import { VirtualKeyboard } from './VirtualKeyboard';
import { CyberHands } from './CyberHands';
import { AcademySkillTree } from './AcademySkillTree';
import { useAcademyEngine } from '@/hooks/useAcademyEngine';
import { CATEGORY_LABELS, getMasteryTitle } from '@/data/academyCurriculum';
import type { Theme } from '@/data/constants';
import { motion, AnimatePresence } from 'framer-motion';

// Finger label metadata
const FINGER_META: Record<string, { dot: string; label: string; pillBg: string; pillBorder: string; pillText: string }> = {
  'left-pinky':   { dot: '#f43f5e', label: 'Left Pinky',   pillBg: 'rgba(244,63,94,0.12)',   pillBorder: 'rgba(244,63,94,0.35)',   pillText: '#fda4af' },
  'left-ring':    { dot: '#f97316', label: 'Left Ring',    pillBg: 'rgba(249,115,22,0.12)',  pillBorder: 'rgba(249,115,22,0.35)',  pillText: '#fdba74' },
  'left-middle':  { dot: '#eab308', label: 'Left Middle',  pillBg: 'rgba(234,179,8,0.12)',   pillBorder: 'rgba(234,179,8,0.35)',   pillText: '#fde047' },
  'left-index':   { dot: '#84cc16', label: 'Left Index',   pillBg: 'rgba(132,204,22,0.12)',  pillBorder: 'rgba(132,204,22,0.40)',  pillText: '#bef264' },
  'thumb':        { dot: '#f59e0b', label: 'Thumb',        pillBg: 'rgba(245,158,11,0.12)',  pillBorder: 'rgba(245,158,11,0.35)',  pillText: '#fcd34d' },
  'right-index':  { dot: '#10b981', label: 'Right Index',  pillBg: 'rgba(16,185,129,0.12)',  pillBorder: 'rgba(16,185,129,0.40)', pillText: '#6ee7b7' },
  'right-middle': { dot: '#06b6d4', label: 'Right Middle', pillBg: 'rgba(6,182,212,0.12)',   pillBorder: 'rgba(6,182,212,0.40)',  pillText: '#67e8f9' },
  'right-ring':   { dot: '#3b82f6', label: 'Right Ring',   pillBg: 'rgba(59,130,246,0.12)',  pillBorder: 'rgba(59,130,246,0.35)', pillText: '#93c5fd' },
  'right-pinky':  { dot: '#8b5cf6', label: 'Right Pinky',  pillBg: 'rgba(139,92,246,0.12)', pillBorder: 'rgba(139,92,246,0.35)', pillText: '#c4b5fd' },
};

interface AcademyLayoutProps { 
  onExit?: () => void;
  theme?: Theme;
}

export function AcademyLayout({ onExit: _onExit, theme }: AcademyLayoutProps) {
  const [viewMode, setViewMode] = useState<'skill-tree' | 'stage'>('skill-tree');
  const engine = useAcademyEngine(viewMode === 'stage');
  const themeGlow = theme?.glowPrimary || '0, 240, 255';

  const activeKey    = engine.currentStep?.targetKey    || '';
  const activeFinger = engine.currentStep?.finger       || '';
  const instruction  = engine.currentStep?.instruction  || '';
  const fMeta        = FINGER_META[activeFinger];

  const masteryTitle = getMasteryTitle(engine.academyLevel);
  const currentCategory = engine.currentLesson?.category || 'foundations';
  const catInfo = CATEGORY_LABELS[currentCategory];

  const handleSelectNode = (nodeId: string) => {
    engine.startLessonById(nodeId);
    setViewMode('stage');
  };

  return (
    <div className="w-full flex flex-col select-none relative z-10 bg-transparent">
      
      {/* ── Stage-Only Control Bar (shown only during live typing) ── */}
      {viewMode === 'stage' && (
        <header className="relative flex items-center justify-between px-4 sm:px-8 py-2.5 shrink-0 bg-[#0c0d14]/75 border border-white/10 rounded-2xl mb-6 z-20 shadow-md backdrop-blur-md">
          {/* Left: Return to Skill Tree */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setViewMode('skill-tree')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white text-xs font-mono font-bold transition-all cursor-pointer active:scale-95"
            >
              <ArrowLeft size={14} />
              <span>Skill Tree</span>
            </button>

            {engine.currentLesson && (
              <div className="flex items-center gap-2">
                <span 
                  className="text-[10px] font-mono font-black uppercase px-2.5 py-0.5 rounded-md border"
                  style={{ 
                    borderColor: `${catInfo.color}40`,
                    backgroundColor: `${catInfo.color}15`,
                    color: catInfo.color 
                  }}
                >
                  {catInfo.name}
                </span>
                <span className="text-xs font-mono font-bold text-white hidden sm:inline-block">
                  {engine.lessonTitle}
                </span>
              </div>
            )}
          </div>

          {/* Center: Live Mastery Status */}
          <div className="flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/5 border border-white/10 shadow-inner">
            <Star className="fill-amber-400 text-amber-400" size={13} />
            <span className="text-xs font-mono font-bold text-white">
              {engine.totalStars} <span className="text-[10px] text-zinc-500 font-normal">STARS</span>
            </span>
            <span className="text-zinc-600">•</span>
            <span className="text-xs font-mono font-bold" style={{ color: masteryTitle.color }}>
              Lv {engine.academyLevel}
            </span>
          </div>

          {/* Right: Audio Toggle */}
          <button
            onClick={engine.toggleMute}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-mono font-bold transition-all cursor-pointer active:scale-95 ${
              engine.isMuted 
                ? 'text-zinc-500 bg-white/5 border border-white/5' 
                : 'text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 hover:text-cyan-200'
            }`}
            title={engine.isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {engine.isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
            <span className="hidden sm:inline-block uppercase text-[10px]">
              {engine.isMuted ? 'Muted' : 'SFX'}
            </span>
          </button>
        </header>
      )}

      {/* ── Main Viewport Switcher ── */}
      <div className="relative w-full bg-transparent">
        <AnimatePresence mode="wait">
          {viewMode === 'skill-tree' ? (
            <motion.div
              key="skill-tree-view"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="w-full"
            >
              <AcademySkillTree
                academyLevel={engine.academyLevel}
                academyXp={engine.academyXp}
                xpToNextLevel={engine.xpToNextLevel}
                totalStars={engine.totalStars}
                nodeStars={engine.nodeStars}
                unlockedNodeIds={engine.unlockedNodeIds}
                onSelectNode={handleSelectNode}
                theme={theme}
              />
            </motion.div>
          ) : (
            <motion.div
              key="stage-view"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="w-full flex flex-col items-center justify-center py-4"
            >
              {/* ── Active Practice Stage ── */}
              {!engine.lessonComplete && (
                <div className="flex flex-col items-center w-full max-w-2xl">
                  
                  {/* Step Progress Dots & Live Performance HUD */}
                  <div className="flex items-center justify-between w-full mb-3 px-2">
                    {/* Step Dots */}
                    <div className="flex items-center gap-1.5">
                      {Array.from({ length: engine.totalSteps }).map((_, i) => (
                        <div 
                          key={i} 
                          className="rounded-full transition-all duration-200"
                          style={{
                            width:  i === engine.currentStepIndex ? '8px' : '5px',
                            height: i === engine.currentStepIndex ? '8px' : '5px',
                            background: i < engine.currentStepIndex
                              ? '#10b981'
                              : i === engine.currentStepIndex
                              ? `rgb(${themeGlow})`
                              : 'rgba(255,255,255,0.15)',
                            boxShadow: i === engine.currentStepIndex ? `0 0 8px rgba(${themeGlow}, 0.9)` : 'none',
                          }} 
                        />
                      ))}
                    </div>

                    {/* Performance Stats Pills */}
                    <div className="flex items-center gap-2">
                      <div 
                        className="flex items-center gap-1.5 px-3 py-1 rounded-full border bg-zinc-950/80"
                        style={{ borderColor: `rgba(${themeGlow}, 0.3)` }}
                      >
                        <Gauge size={12} style={{ color: `rgb(${themeGlow})` }} />
                        <span className="font-mono text-[11px] tracking-widest text-zinc-300">
                          WPM: <span className="font-bold" style={{ color: `rgb(${themeGlow})` }}>{engine.wpm}</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-emerald-500/20 bg-zinc-950/80">
                        <Activity size={12} className="text-emerald-400" />
                        <span className="font-mono text-[11px] tracking-widest text-zinc-300">
                          ACC: <span className="text-emerald-300 font-bold">{engine.accuracy}%</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* ── Instruction Prompt Card ── */}
                  <div
                    className={`relative mb-3 w-full rounded-2xl transition-all duration-300 overflow-hidden ${
                      engine.errorShake ? 'animate-[shake_0.3s_ease-in-out]' : ''
                    }`}
                    style={{
                      background: 'rgba(10, 13, 24, 0.85)',
                      border: engine.errorShake 
                        ? '1px solid rgba(248,113,113,0.6)' 
                        : engine.isDrillMode 
                          ? '1px solid rgba(245,158,11,0.6)' 
                          : `1px solid rgba(${themeGlow}, 0.35)`,
                      boxShadow: engine.errorShake 
                        ? '0 0 24px rgba(248,113,113,0.2)' 
                        : engine.isDrillMode 
                          ? '0 0 24px rgba(245,158,11,0.2)' 
                          : `0 4px 20px rgba(0,0,0,0.6), 0 0 15px rgba(${themeGlow}, 0.15)`,
                    }}
                  >
                    <div className="px-6 py-4 flex flex-col items-center gap-2 relative z-10">
                      {/* Finger Indicator Pill */}
                      {fMeta && (
                        <div className="flex items-center gap-1.5 rounded-full px-3 py-0.5 bg-white/10 border border-white/10">
                          <span className="w-[6px] h-[6px] rounded-full shadow-[0_0_6px_currentColor]" style={{ background: fMeta.dot, color: fMeta.dot }} />
                          <span className="text-[10px] font-mono font-bold tracking-[0.2em] uppercase text-zinc-200">
                            {fMeta.label}
                          </span>
                        </div>
                      )}

                      {/* Instruction Text */}
                      <h2 
                        className="text-lg md:text-xl font-mono font-bold uppercase tracking-widest text-center transition-colors duration-300"
                        style={{
                          color: engine.errorShake ? '#fca5a5' : engine.isDrillMode ? '#fbbf24' : '#ffffff',
                          textShadow: engine.errorShake
                            ? '0 0 14px rgba(248,113,113,0.7)'
                            : engine.isDrillMode
                              ? '0 0 14px rgba(245,158,11,0.6)'
                              : `0 0 14px rgba(${themeGlow}, 0.5)`,
                        }}
                      >
                        {instruction || 'Press the highlighted key'}
                      </h2>
                    </div>
                  </div>

                  {/* ── Virtual Keyboard & CyberHands Deck ── */}
                  <div className="flex flex-col items-center gap-2 w-full max-w-2xl">
                    <VirtualKeyboard 
                      activeKey={activeKey} 
                      activeFinger={activeFinger} 
                      keyErrorHeatmap={engine.keyErrorHeatmap}
                      lastKeystroke={engine.lastKeystroke}
                      theme={theme}
                    />
                    <CyberHands activeKey={activeKey} activeFinger={activeFinger} />
                  </div>
                </div>
              )}

              {/* ── Lesson / Boss Results Summary Modal ── */}
              {engine.lessonComplete && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.94, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className="flex flex-col items-center gap-6 p-6 sm:p-8 rounded-3xl border bg-[#10121a]/95 border-white/15 shadow-2xl backdrop-blur-2xl w-full max-w-md text-center relative overflow-hidden"
                >
                  {/* Glow Backdrop */}
                  <div 
                    className="absolute top-0 right-0 w-48 h-48 rounded-full blur-3xl pointer-events-none -mr-12 -mt-12"
                    style={{ background: engine.isBossFailed ? 'rgba(239,68,68,0.15)' : 'rgba(34,211,238,0.15)' }}
                  />

                  {/* Trophy / Status Icon */}
                  <div className="relative flex items-center justify-center w-20 h-20">
                    <div 
                      className="absolute inset-0 rounded-full blur-2xl scale-150"
                      style={{ background: engine.isBossFailed ? 'rgba(239,68,68,0.2)' : 'rgba(251,191,36,0.2)' }}
                    />
                    {engine.isBossFailed ? (
                      <ShieldAlert size={48} className="text-red-400 drop-shadow-[0_0_20px_rgba(239,68,68,0.6)]" />
                    ) : (
                      <Trophy size={48} className="text-amber-400 drop-shadow-[0_0_20px_rgba(251,191,36,0.6)]" />
                    )}
                  </div>

                  {/* Header Title */}
                  <div>
                    <h2 className="text-xl sm:text-2xl font-mono font-black text-white tracking-tight uppercase">
                      {engine.isBossFailed ? 'Trial Incomplete' : 'Lesson Mastered!'}
                    </h2>
                    <p className="text-xs font-mono text-zinc-400 mt-1">
                      {engine.isBossFailed 
                        ? 'Boss Gauntlet requirements not reached. Refine accuracy and retry!' 
                        : engine.lessonTitle}
                    </p>
                  </div>

                  {/* Stars Display */}
                  {!engine.isBossFailed && (
                    <div className="flex items-center gap-3">
                      {[1, 2, 3].map((starNum) => (
                        <div 
                          key={starNum}
                          className="p-2 rounded-2xl border transition-all"
                          style={{
                            borderColor: starNum <= engine.starsEarned ? '#fbbf24' : 'rgba(255,255,255,0.1)',
                            backgroundColor: starNum <= engine.starsEarned ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.03)',
                            boxShadow: starNum <= engine.starsEarned ? '0 0 16px rgba(251,191,36,0.3)' : 'none'
                          }}
                        >
                          <Star 
                            size={22} 
                            className={starNum <= engine.starsEarned ? 'fill-amber-400 text-amber-400' : 'text-zinc-600'} 
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* XP Gain Pill */}
                  {!engine.isBossFailed && engine.xpGainedThisLesson > 0 && (
                    <div className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 text-amber-300 font-mono text-xs font-bold shadow-sm">
                      <Zap size={14} className="fill-amber-400 text-amber-400" />
                      <span>+{engine.xpGainedThisLesson} Academy XP Gained</span>
                    </div>
                  )}

                  {/* Telemetry Stats Grid */}
                  <div className="grid grid-cols-3 gap-2 w-full p-3 rounded-2xl bg-white/5 border border-white/10 font-mono">
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] text-zinc-400 font-bold uppercase">Speed</span>
                      <span className="text-lg font-bold text-white mt-0.5">{engine.wpm}</span>
                      <span className="text-[9px] text-zinc-500">WPM</span>
                    </div>
                    <div className="flex flex-col items-center border-x border-white/10">
                      <span className="text-[10px] text-zinc-400 font-bold uppercase">Accuracy</span>
                      <span className="text-lg font-bold text-white mt-0.5">{engine.accuracy}%</span>
                      <span className="text-[9px] text-zinc-500">PRECISION</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] text-zinc-400 font-bold uppercase">Mistakes</span>
                      <span className="text-lg font-bold text-white mt-0.5">{engine.mistakes}</span>
                      <span className="text-[9px] text-zinc-500">ERRORS</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row items-center gap-3 w-full justify-center mt-2">
                    <button
                      onClick={engine.retryLesson}
                      className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-white font-mono text-xs font-bold transition-all cursor-pointer"
                    >
                      <RotateCcw size={13} />
                      <span>Retry</span>
                    </button>

                    {!engine.isBossFailed && (
                      <button
                        onClick={engine.nextLesson}
                        style={{
                          borderColor: `rgba(${themeGlow}, 0.8)`,
                          backgroundColor: `rgba(${themeGlow}, 0.3)`,
                          color: '#ffffff',
                          boxShadow: `0 0 20px rgba(${themeGlow}, 0.4)`
                        }}
                        className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border font-mono text-xs font-bold shadow-lg transition-all cursor-pointer hover:brightness-125 hover:scale-[1.02]"
                      >
                        <Zap size={13} />
                        <span>Next Lesson</span>
                      </button>
                    )}

                    <button
                      onClick={() => setViewMode('skill-tree')}
                      style={{
                        borderColor: `rgba(${themeGlow}, 0.5)`,
                        backgroundColor: `rgba(${themeGlow}, 0.15)`,
                        color: `rgb(${themeGlow})`,
                        boxShadow: `0 0 16px rgba(${themeGlow}, 0.2)`
                      }}
                      className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border font-mono text-xs font-bold shadow-lg transition-all cursor-pointer hover:brightness-110"
                    >
                      <LayoutGrid size={13} />
                      <span>Skill Tree</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

