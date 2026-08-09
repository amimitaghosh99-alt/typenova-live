import { useState, useMemo } from 'react';
import { 
  ArrowLeft, ChevronRight, Trophy, CheckCircle2, LayoutGrid, Zap, 
  Volume2, VolumeX, Gauge, Activity, Sparkles, Target, Flame
} from 'lucide-react';
import { VirtualKeyboard } from './VirtualKeyboard';
import { CyberHands } from './CyberHands';
import { useAcademyEngine } from '@/hooks/useAcademyEngine';
import { LESSONS, CATEGORY_LABELS } from '@/data/academyCurriculum';
import type { LessonCategory } from '@/data/academyCurriculum';
import { motion } from 'framer-motion';

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

const LEGEND_KEYS = ['left-pinky','left-ring','left-middle','left-index','right-index','right-middle','right-ring','right-pinky'];

interface AcademyLayoutProps { onExit: () => void; }

export function AcademyLayout({ onExit }: AcademyLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeCategory, setActiveCategory] = useState<LessonCategory | 'all'>('all');
  const [isExiting, setIsExiting] = useState(false);

  const handleExit = () => {
    setIsExiting(true);
    setTimeout(onExit, 400); // Wait for exit animation to complete
  };
  
  const engine       = useAcademyEngine();
  const activeKey    = engine.currentStep?.targetKey    || '';
  const activeFinger = engine.currentStep?.finger       || '';
  const instruction  = engine.currentStep?.instruction  || '';
  const fMeta        = FINGER_META[activeFinger];

  // Filter lessons based on selected category tab
  const filteredLessons = useMemo(() => {
    return LESSONS.map((lesson, originalIndex) => ({ lesson, originalIndex }))
      .filter(({ lesson }) => activeCategory === 'all' || lesson.category === activeCategory);
  }, [activeCategory]);

  // Overall progress across all lessons
  const totalAllSteps   = LESSONS.reduce((s, l) => s + l.steps.length, 0);
  const doneAllSteps    = [...engine.completedLessons].reduce((s, i) => s + (LESSONS[i]?.steps.length || 0), 0)
                         + (engine.lessonComplete ? 0 : engine.currentStepIndex);
  const overallProgress = totalAllSteps > 0 ? doneAllSteps / totalAllSteps : 0;

  // Performance Rank Badge calculation
  const getRankBadge = (acc: number, wpmVal: number) => {
    if (acc >= 98 && wpmVal >= 45) return { rank: 'GHOST OPERATOR', color: '#00e5ff', bg: 'rgba(0,229,255,0.12)' };
    if (acc >= 95) return { rank: 'CYBER TYPIST', color: '#10b981', bg: 'rgba(16,185,129,0.12)' };
    if (acc >= 85) return { rank: 'NEURAL NODE', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' };
    return { rank: 'INITIATE', color: '#a855f7', bg: 'rgba(168,85,247,0.12)' };
  };

  const rankInfo = getRankBadge(engine.accuracy, engine.wpm);

  return (
    <div className="fixed inset-0 flex flex-col z-[200] overflow-hidden select-none bg-black">
      <motion.div 
        initial={{ opacity: 0, scale: 1.05 }}
        animate={isExiting ? { opacity: 0, scale: 0.9, y: 30 } : { opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeInOut" }}
        className="w-full h-full flex flex-col"
      >
        {/* ── Top progress bar ── */}
      <div className="h-[3px] w-full shrink-0" style={{ background: 'rgba(255,255,255,0.05)' }}>
        <div
          className="h-full transition-all duration-500 ease-out"
          style={{
            width: `${overallProgress * 100}%`,
            background: 'linear-gradient(90deg, #06b6d4, #00e5ff, #10b981)',
            boxShadow: '0 0 14px rgba(6,182,212,0.9)',
          }}
        />
      </div>

      {/* ── Ambient background ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        <div className="absolute" style={{
          top: '10%', left: '-5%', width: '55%', height: '60%',
          borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(6,182,212,0.12) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }} />
        <div className="absolute" style={{
          bottom: '-5%', right: '5%', width: '40%', height: '50%',
          borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(16,185,129,0.09) 0%, transparent 70%)',
          filter: 'blur(80px)',
        }} />
        {/* Diagonal light rays */}
        {[0,1,2,3,4].map(i => (
          <div key={i} className="absolute" style={{
            top: '-20%', left: `${10 + i * 18}%`,
            width: '1px', height: '140%',
            background: 'linear-gradient(to bottom, transparent, rgba(6,182,212,0.06), transparent)',
            transform: 'rotate(25deg)',
            transformOrigin: 'top center',
          }} />
        ))}
        {/* Grid pattern */}
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(rgba(6,182,212,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.04) 1px, transparent 1px)',
          backgroundSize: '52px 52px',
        }} />
      </div>

      {/* ── Header ── */}
      <header className="relative flex items-center justify-between px-5 py-3 shrink-0"
        style={{ zIndex: 10, borderBottom: '1px solid rgba(6,182,212,0.10)' }}>
        {/* Left controls */}
        <div className="flex items-center gap-2">
          <button onClick={handleExit}
            className="glass-panel flex items-center gap-2 rounded-lg px-3 py-1.5 text-[10px] font-bold tracking-[0.2em] uppercase text-zinc-400 hover:text-white transition-colors">
            <ArrowLeft size={11} /> Exit
          </button>
          <button
            onClick={() => setSidebarOpen(v => !v)}
            className={`glass-panel flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[10px] font-bold tracking-[0.2em] uppercase transition-colors ${sidebarOpen ? 'text-white border-white/20' : 'text-zinc-500 hover:text-zinc-300'}`}>
            <LayoutGrid size={11} /> Lessons
          </button>
        </div>

        {/* Center — Live Performance Indicators */}
        <div className="flex items-center gap-4">
          <div className="glass-panel flex items-center gap-2 px-3 py-1.5 rounded-lg">
            <Gauge size={12} className="text-zinc-400" />
            <span className="text-[10px] font-bold tracking-widest text-zinc-200">
              {engine.wpm} <span className="text-[8px] text-zinc-500">WPM</span>
            </span>
          </div>
          <div className="glass-panel flex items-center gap-2 px-3 py-1.5 rounded-lg">
            <Activity size={12} className="text-zinc-400" />
            <span className="text-[10px] font-bold tracking-widest text-zinc-200">
              {engine.accuracy}% <span className="text-[8px] text-zinc-500">ACC</span>
            </span>
          </div>
        </div>

        {/* Right — Audio Toggle & Branding */}
        <div className="flex items-center gap-2">
          <button
            onClick={engine.toggleMute}
            className={`glass-panel flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-bold transition-colors ${engine.isMuted ? 'text-zinc-500' : 'text-zinc-300 hover:text-white'}`}
            title={engine.isMuted ? 'Unmute Cyber SFX' : 'Mute Cyber SFX'}
          >
            {engine.isMuted ? <VolumeX size={12} /> : <Volume2 size={12} />}
            <span className="hidden sm:inline tracking-wider uppercase text-[9px]">
              {engine.isMuted ? 'Muted' : 'SFX ON'}
            </span>
          </button>

          <div className="glass-panel flex items-center gap-2 rounded-lg px-3 py-1.5 text-zinc-300">
            <Zap size={11} className="text-zinc-400" />
            <span className="text-[10px] font-bold tracking-[0.25em] uppercase">
              TypeNova
            </span>
          </div>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="relative flex flex-1 min-h-0" style={{ zIndex: 10 }}>

        {/* ── Sidebar ── */}
        <aside
          className="shrink-0 overflow-hidden transition-all duration-300"
          style={{
            width: sidebarOpen ? '280px' : '0px',
            borderRight: '1px solid rgba(34,211,238,0.15)',
            background: 'linear-gradient(135deg, rgba(6,182,212,0.05) 0%, rgba(4,6,16,0.9) 100%)',
            backdropFilter: 'blur(24px)',
            boxShadow: sidebarOpen ? '1px 0 30px rgba(0,0,0,0.5)' : 'none',
          }}>
          <div className="w-[280px] h-full flex flex-col py-4 overflow-y-auto custom-scrollbar">
            
            {/* Category Filter Tabs */}
            <div className="px-4 mb-4">
              <span className="block mb-2 text-[10px] font-bold tracking-[0.25em] uppercase text-zinc-500">
                Categories
              </span>
              <div className="flex w-full bg-black/40 p-1 rounded-xl border border-white/5 relative">
                {(['all', 'foundations', 'reaches', 'advanced', 'speed'] as const).map((cat) => {
                  const isActive = activeCategory === cat;
                  const label = cat === 'all' ? 'ALL' : cat === 'foundations' ? 'FND' : cat === 'reaches' ? 'RCH' : cat === 'advanced' ? 'ADV' : 'SPD';
                  return (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={`relative flex-1 py-2 text-[9px] font-bold uppercase tracking-wider transition-colors z-10 ${isActive ? 'text-cyan-300' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="academy-sidebar-category-pill"
                          className="absolute inset-0 bg-cyan-500/10 border border-cyan-500/20 rounded-lg shadow-[0_0_12px_rgba(34,211,238,0.15)]"
                          style={{ zIndex: -1 }}
                          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                        />
                      )}
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="h-[1px] w-full bg-white/5 my-2" />

            <div className="px-4 my-3 flex items-center justify-between">
              <span className="text-[10px] font-bold tracking-[0.25em] uppercase text-zinc-400">
                Curriculum
              </span>
              <span className="text-[9px] font-bold text-zinc-500 bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
                {filteredLessons.length} MODULES
              </span>
            </div>

            {/* Lesson List */}
            {filteredLessons.map(({ lesson, originalIndex }) => {
              const done = engine.completedLessons.has(originalIndex);
              const cur  = originalIndex === engine.currentLessonIndex;
              const catMeta = CATEGORY_LABELS[lesson.category];

              return (
                <button key={lesson.id} onClick={() => engine.goToLesson(originalIndex)}
                  className={`group relative flex items-center gap-3 px-4 py-3 text-left transition-colors duration-300 ${cur ? '' : 'hover:bg-white/5'}`}>
                  
                  {/* Sliding Liquid Glass Highlight */}
                  {cur && (
                    <motion.div
                      layoutId="academy-active-lesson-highlight"
                      className="absolute inset-y-1 left-2 right-2 pointer-events-none rounded-xl"
                      style={{
                        background: 'linear-gradient(135deg, rgba(34,211,238,0.15) 0%, rgba(34,211,238,0.02) 100%)',
                        border: '1px solid rgba(34,211,238,0.3)',
                        boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.3), inset 0 -10px 20px rgba(34,211,238,0.05), 0 4px 12px rgba(0,0,0,0.5)',
                        backdropFilter: 'blur(12px)',
                        zIndex: 0
                      }}
                      transition={{ type: "spring", bounce: 0.25, duration: 0.5 }}
                    />
                  )}

                  {/* Badge */}
                  <div className="w-[24px] h-[24px] rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold transition-colors relative z-10"
                    style={{
                      background: done ? 'rgba(16,185,129,0.1)' : cur ? 'rgba(34,211,238,0.1)' : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${done ? 'rgba(16,185,129,0.3)' : cur ? 'rgba(34,211,238,0.3)' : 'rgba(255,255,255,0.05)'}`,
                      color:  done ? '#34d399' : cur ? '#67e8f9' : 'rgba(255,255,255,0.3)',
                      boxShadow: cur ? '0 0 10px rgba(34,211,238,0.15)' : 'none',
                    }}>
                    {done ? <CheckCircle2 size={12} /> : originalIndex + 1}
                  </div>
                  <div className="min-w-0 flex-1 transition-transform duration-300 group-hover:translate-x-1 relative z-10">
                    <div className="flex items-center justify-between gap-1">
                      <p className={`text-[12px] font-bold truncate transition-colors duration-300 ${cur ? 'text-cyan-300 drop-shadow-[0_0_8px_rgba(34,211,238,0.3)]' : done ? 'text-zinc-300 group-hover:text-white' : 'text-zinc-500 group-hover:text-zinc-300'}`}>
                        {lesson.title}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[9px] text-zinc-500 font-medium">
                        {catMeta.name} • {lesson.steps.length} steps
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* ── Main ── */}
        <main className="flex-1 flex flex-col items-center overflow-y-auto pt-5 pb-10 px-4">

          {/* Lesson Title & Category Banner */}
          <div className="flex flex-col items-center gap-1 mb-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold tracking-[0.35em] uppercase"
                style={{ color: 'rgba(6,182,212,0.60)' }}>
                Lesson {engine.currentLessonIndex + 1} of {LESSONS.length}
              </span>
              {LESSONS[engine.currentLessonIndex] && (
                <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full"
                  style={{
                    color: CATEGORY_LABELS[LESSONS[engine.currentLessonIndex].category].color,
                    background: `${CATEGORY_LABELS[LESSONS[engine.currentLessonIndex].category].color}18`,
                    border: `1px solid ${CATEGORY_LABELS[LESSONS[engine.currentLessonIndex].category].color}40`,
                  }}>
                  {CATEGORY_LABELS[LESSONS[engine.currentLessonIndex].category].icon} {CATEGORY_LABELS[LESSONS[engine.currentLessonIndex].category].name}
                </span>
              )}
            </div>

            <h1 className="text-[22px] font-bold tracking-[0.15em] uppercase text-white text-center">
              {engine.lessonTitle}
            </h1>
            {engine.lessonDescription && (
              <p className="text-[11px] text-center" style={{ color: 'rgba(255,255,255,0.35)', letterSpacing: '0.05em' }}>
                {engine.lessonDescription}
              </p>
            )}
          </div>

          {/* Step Dots */}
          {!engine.lessonComplete && !engine.allComplete && engine.totalSteps > 0 && (
            <div className="flex items-center gap-1.5 mb-5">
              {Array.from({ length: engine.totalSteps }).map((_, i) => (
                <div key={i} className="rounded-full transition-all duration-200"
                  style={{
                    width:  i === engine.currentStepIndex ? '10px' : '6px',
                    height: i === engine.currentStepIndex ? '10px' : '6px',
                    background: i < engine.currentStepIndex
                      ? 'rgba(16,185,129,0.8)'
                      : i === engine.currentStepIndex
                      ? '#06b6d4'
                      : 'rgba(255,255,255,0.10)',
                    boxShadow: i === engine.currentStepIndex ? '0 0 8px rgba(6,182,212,0.9)' : 'none',
                  }} />
              ))}
            </div>
          )}

          {/* ── Instruction Card ── */}
          {!engine.lessonComplete && !engine.allComplete && (
            <div
              className={`glass-panel relative mb-6 w-full max-w-[480px] rounded-2xl transition-all duration-300 ${engine.errorShake ? 'animate-[shake_0.3s_ease-in-out]' : ''}`}
              style={engine.isDrillMode ? {
                background: 'rgba(245,158,11,0.1)',
                border: '1px solid rgba(245,158,11,0.4)',
                boxShadow: '0 0 30px rgba(245,158,11,0.15), inset 0 0 20px rgba(245,158,11,0.05)',
              } : {}}>
              <div className="px-8 py-6 flex flex-col items-center gap-4">
                
                {/* Top Pill Bar */}
                <div className="flex items-center gap-3">
                  {fMeta && (
                    <div className="glass-panel flex items-center gap-2 rounded-full px-3 py-1">
                      <span className="w-[6px] h-[6px] rounded-full" style={{ background: fMeta.dot }} />
                      <span className="text-[9px] font-bold tracking-[0.25em] uppercase text-zinc-300">
                        {fMeta.label}
                      </span>
                    </div>
                  )}

                  {engine.wpm > 0 && (
                    <div className="glass-panel flex items-center gap-1.5 rounded-full px-3 py-1 text-[9px] text-zinc-300 font-bold">
                      <Sparkles size={10} className="text-zinc-400" /> {engine.wpm} WPM
                    </div>
                  )}
                </div>

                {/* Instruction Text */}
                <p className="text-[20px] md:text-[24px] font-mono font-black uppercase tracking-widest text-center leading-tight transition-colors duration-300"
                  style={{
                    color: engine.errorShake ? '#fca5a5' : engine.isDrillMode ? '#fbbf24' : '#ffffff',
                    textShadow: engine.errorShake
                      ? '0 0 16px rgba(248,113,113,0.6)'
                      : engine.isDrillMode
                        ? '0 0 16px rgba(245,158,11,0.5)'
                        : '0 0 20px rgba(255,255,255,0.15)',
                    letterSpacing: '0.04em',
                  }}>
                  {instruction || 'Press the highlighted key'}
                </p>
              </div>
            </div>
          )}

          {/* ── Keyboard + Hands ── */}
          {!engine.lessonComplete && !engine.allComplete && (
            <div className="relative mb-2" style={{ width: 552, height: 400 }}>
              <div className="relative" style={{ zIndex: 2 }}>
                <VirtualKeyboard activeKey={activeKey} activeFinger={activeFinger} />
              </div>
              <CyberHands activeKey={activeKey} activeFinger={activeFinger} />
            </div>
          )}

          {/* ── Finger Legend ── */}
          {!engine.lessonComplete && !engine.allComplete && (
            <div className="flex flex-wrap justify-center gap-x-5 gap-y-1.5 max-w-lg mt-2">
              {LEGEND_KEYS.map(f => {
                const m = FINGER_META[f];
                return (
                  <div key={f} className="flex items-center gap-1.5">
                    <span className="w-[6px] h-[6px] rounded-full" style={{ background: m.dot }} />
                    <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>{m.label}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Lesson Complete Card ── */}
          {engine.lessonComplete && !engine.allComplete && (
            <div className="flex flex-col items-center gap-6 mt-6 animate-in fade-in zoom-in-95 duration-500 w-full max-w-md">
              <div className="relative flex items-center justify-center w-20 h-20">
                <div className="absolute inset-0 rounded-full blur-2xl scale-150"
                  style={{ background: rankInfo.bg }} />
                <Trophy size={48} style={{ color: rankInfo.color, filter: `drop-shadow(0 0 24px ${rankInfo.color})` }} />
              </div>

              <div className="text-center">
                <span className="inline-block text-[9px] font-bold tracking-[0.3em] uppercase px-3 py-1 rounded-full mb-2"
                  style={{ color: rankInfo.color, background: rankInfo.bg, border: `1px solid ${rankInfo.color}50` }}>
                  RANK: {rankInfo.rank}
                </span>
                <h2 className="text-[22px] font-bold tracking-widest uppercase text-white mb-1">
                  {engine.lessonTitle}
                </h2>
                <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.40)' }}>
                  Lesson Completed Successfully
                </p>
              </div>

              {/* Performance Stats Breakdown Card */}
              <div className="glass-panel grid grid-cols-3 gap-3 w-full p-4 rounded-xl">
                <div className="flex flex-col items-center">
                  <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider">Speed</span>
                  <span className="text-xl font-bold text-zinc-200 mt-1">{engine.wpm}</span>
                  <span className="text-[8px] text-zinc-500">WPM</span>
                </div>
                <div className="flex flex-col items-center border-x border-white/5">
                  <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider">Accuracy</span>
                  <span className="text-xl font-bold text-zinc-200 mt-1">{engine.accuracy}%</span>
                  <span className="text-[8px] text-zinc-500">PRECISION</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider">Mistakes</span>
                  <span className="text-xl font-bold text-zinc-200 mt-1">{engine.mistakes}</span>
                  <span className="text-[8px] text-zinc-500">ERRORS</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full justify-center">
                <button onClick={handleExit}
                  className="glass-panel px-5 py-2.5 rounded-xl text-[10px] font-bold tracking-widest uppercase transition-colors text-zinc-400 hover:text-white">
                  Back to Home
                </button>
                {engine.currentLessonIndex < LESSONS.length - 1 && (
                  <button onClick={engine.nextLesson}
                    className="glass-panel flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-bold tracking-widest uppercase transition-all hover:scale-105 text-white">
                    Next Lesson <ChevronRight size={12} />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── All Complete Grand Trophy ── */}
          {engine.allComplete && (
            <div className="flex flex-col items-center gap-6 mt-10 animate-in fade-in zoom-in-95 duration-500 max-w-md">
              <span className="text-6xl" style={{ filter: 'drop-shadow(0 0 24px rgba(6,182,212,0.6))' }}>🏆</span>
              <div className="text-center">
                <p className="text-[10px] font-bold tracking-[0.35em] uppercase mb-2"
                  style={{ color: '#67e8f9' }}>Curriculum Completed</p>
                <h2 className="text-[24px] font-bold tracking-widest uppercase text-white mb-1">
                  TypeNova Master!
                </h2>
                <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.40)' }}>
                  You have conquered all 13 specialized touch-typing modules.
                </p>
              </div>

              <button onClick={onExit}
                className="flex items-center gap-2 px-8 py-3 rounded-xl text-xs font-bold tracking-widest uppercase transition-all hover:scale-105"
                style={{
                  background: 'rgba(6,182,212,0.18)',
                  border: '1px solid rgba(6,182,212,0.55)',
                  color: '#a5f3fc',
                  boxShadow: '0 0 25px rgba(6,182,212,0.4)',
                }}>
                Start Custom Practice <ChevronRight size={13} />
              </button>
            </div>
          )}

        </main>
      </div>
    </motion.div>
  </div>
);
}
