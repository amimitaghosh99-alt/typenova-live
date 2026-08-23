import { useState, useMemo, useRef, useEffect } from 'react';
import { 
  ChevronRight, Trophy, CheckCircle2, LayoutGrid, 
  Volume2, VolumeX, Gauge, Activity
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

interface AcademyLayoutProps { onExit: () => void; }

export function AcademyLayout({ onExit }: AcademyLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeCategory, setActiveCategory] = useState<LessonCategory | 'all'>('all');
  const exitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (exitTimeoutRef.current) clearTimeout(exitTimeoutRef.current);
    };
  }, []);

  const handleExit = () => {
    onExit();
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
    <div className="w-full h-full flex flex-col overflow-hidden select-none relative z-10 bg-transparent">
      {/* ── Top progress bar ── */}
      <div className="h-[2px] w-full shrink-0" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div
          className="h-full transition-all duration-500 ease-out"
          style={{
            width: `${overallProgress * 100}%`,
            background: 'linear-gradient(90deg, #06b6d4, #00e5ff, #10b981)',
            boxShadow: '0 0 12px rgba(6,182,212,0.8)',
          }}
        />
      </div>

      {/* ── Ambient background glows ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        <div className="absolute" style={{
          top: '10%', left: '15%', width: '40%', height: '40%',
          borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(6,182,212,0.06) 0%, transparent 70%)',
          filter: 'blur(80px)',
        }} />
        <div className="absolute" style={{
          bottom: '10%', right: '15%', width: '40%', height: '40%',
          borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(16,185,129,0.05) 0%, transparent 70%)',
          filter: 'blur(80px)',
        }} />
      </div>

      {/* ── Subheader / Control Bar ── */}
      <header className="relative flex items-center justify-between px-6 py-2.5 shrink-0 bg-zinc-950/80 backdrop-blur-xl border-b border-white/10"
        style={{ zIndex: 10 }}>
        {/* Left: Curriculum Toggle Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(v => !v)}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-[11px] font-bold tracking-[0.15em] uppercase transition-all active:scale-95 ${sidebarOpen ? 'text-cyan-300 bg-cyan-500/15 border border-cyan-500/30 shadow-[0_0_12px_rgba(34,211,238,0.2)]' : 'text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10'}`}>
            <LayoutGrid size={13} /> Curriculum
            <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-white/10 text-zinc-300">
              {filteredLessons.length}
            </span>
          </button>
        </div>

        {/* Center: Current Module Info */}
        <div className="flex items-center gap-2.5 bg-black/40 px-4 py-1 rounded-full border border-white/5 shadow-inner">
          <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-cyan-300">
            Lesson {engine.currentLessonIndex + 1} of {LESSONS.length}
          </span>
          <span className="text-zinc-500">•</span>
          <span className="text-[12px] font-bold uppercase tracking-[0.15em] text-white">
            {engine.lessonTitle}
          </span>
        </div>

        {/* Right: Audio Toggle & Rank */}
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline-block text-[9px] font-bold tracking-[0.2em] uppercase px-2.5 py-0.5 rounded-full"
            style={{ color: rankInfo.color, background: rankInfo.bg, border: `1px solid ${rankInfo.color}30` }}>
            {rankInfo.rank}
          </span>
          <button
            onClick={engine.toggleMute}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-bold transition-all active:scale-95 ${engine.isMuted ? 'text-zinc-500 bg-white/5 border border-white/5' : 'text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 hover:text-cyan-200'}`}
            title={engine.isMuted ? 'Unmute Cyber SFX' : 'Mute Cyber SFX'}
          >
            {engine.isMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
            <span className="tracking-wider uppercase text-[10px]">
              {engine.isMuted ? 'Muted' : 'SFX'}
            </span>
          </button>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="relative flex flex-1 min-h-0" style={{ zIndex: 10 }}>

        {/* ── Sidebar ── */}
        <aside
          className="shrink-0 overflow-hidden transition-all duration-300"
          style={{
            width: sidebarOpen ? '280px' : '0px',
            borderRight: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(8, 10, 18, 0.92)',
            backdropFilter: 'blur(24px)',
            boxShadow: sidebarOpen ? '4px 0 30px rgba(0,0,0,0.6)' : 'none',
          }}>
          <div className="w-[280px] h-full flex flex-col py-4 overflow-y-auto custom-scrollbar">
            
            {/* Category Filter Tabs */}
            <div className="px-4 mb-4">
              <span className="block mb-2 text-[10px] font-bold tracking-[0.25em] uppercase text-zinc-400">
                Categories
              </span>
              <div className="flex w-full bg-zinc-900/90 p-1 rounded-xl border border-white/10 relative">
                {(['all', 'foundations', 'reaches', 'advanced', 'speed'] as const).map((cat) => {
                  const isActive = activeCategory === cat;
                  const label = cat === 'all' ? 'ALL' : cat === 'foundations' ? 'FND' : cat === 'reaches' ? 'RCH' : cat === 'advanced' ? 'ADV' : 'SPD';
                  return (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={`relative flex-1 py-1.5 text-[9px] font-bold uppercase tracking-wider transition-colors z-10 ${isActive ? 'text-cyan-300' : 'text-zinc-400 hover:text-white'}`}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="academy-sidebar-category-pill"
                          className="absolute inset-0 bg-cyan-500/20 border border-cyan-500/30 rounded-lg shadow-[0_0_12px_rgba(34,211,238,0.2)]"
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

            <div className="h-[1px] w-full bg-white/5 my-1" />

            <div className="px-4 my-2 flex items-center justify-between">
              <span className="text-[10px] font-bold tracking-[0.25em] uppercase text-zinc-400">
                Curriculum
              </span>
              <span className="text-[9px] font-bold text-zinc-400 bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
                {filteredLessons.length} MODULES
              </span>
            </div>

            {/* Lesson List */}
            <div className="flex flex-col gap-1 px-2">
              {filteredLessons.map(({ lesson, originalIndex }) => {
                const done = engine.completedLessons.has(originalIndex);
                const cur  = originalIndex === engine.currentLessonIndex;
                const catMeta = CATEGORY_LABELS[lesson.category];

                return (
                  <button key={lesson.id} onClick={() => engine.goToLesson(originalIndex)}
                    className={`group relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left transition-all duration-200 ${cur ? 'bg-cyan-500/10 border border-cyan-500/30 shadow-[0_0_15px_rgba(34,211,238,0.1)]' : done ? 'hover:bg-white/5 border border-transparent' : 'hover:bg-white/5 border border-transparent opacity-75 hover:opacity-100'}`}>
                    
                    {/* Badge */}
                    <div className="w-[24px] h-[24px] rounded-lg flex items-center justify-center shrink-0 text-[10px] font-bold transition-colors relative z-10"
                      style={{
                        background: done ? 'rgba(16,185,129,0.15)' : cur ? 'rgba(34,211,238,0.2)' : 'rgba(255,255,255,0.05)',
                        border: `1px solid ${done ? 'rgba(16,185,129,0.4)' : cur ? 'rgba(34,211,238,0.5)' : 'rgba(255,255,255,0.1)'}`,
                        color:  done ? '#34d399' : cur ? '#67e8f9' : 'rgba(255,255,255,0.5)',
                        boxShadow: cur ? '0 0 10px rgba(34,211,238,0.2)' : 'none',
                      }}>
                      {done ? <CheckCircle2 size={13} /> : originalIndex + 1}
                    </div>
                    
                    <div className="min-w-0 flex-1 relative z-10">
                      <div className="flex items-center justify-between gap-1">
                        <p className={`text-[12px] font-bold truncate transition-colors duration-200 ${cur ? 'text-cyan-300 drop-shadow-[0_0_8px_rgba(34,211,238,0.4)]' : done ? 'text-zinc-200 group-hover:text-white' : 'text-zinc-400 group-hover:text-zinc-200'}`}>
                          {lesson.title}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[9px] text-zinc-400 font-medium">
                          {catMeta.name} • {lesson.steps.length} steps
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* ── Main Arena ── */}
        <main className="flex-1 flex flex-col items-center justify-center p-4 overflow-y-auto custom-scrollbar">

          {/* ── Training Area ── */}
          {!engine.lessonComplete && !engine.allComplete && (
            <div className="flex flex-col items-center w-full max-w-2xl">
              
              {/* Step Dots + Stats Bar Row */}
              <div className="flex items-center justify-between w-full mb-3 px-2">
                {/* Step Dots */}
                <div className="flex items-center gap-1.5">
                  {Array.from({ length: engine.totalSteps }).map((_, i) => (
                    <div key={i} className="rounded-full transition-all duration-200"
                      style={{
                        width:  i === engine.currentStepIndex ? '8px' : '5px',
                        height: i === engine.currentStepIndex ? '8px' : '5px',
                        background: i < engine.currentStepIndex
                          ? '#10b981'
                          : i === engine.currentStepIndex
                          ? '#06b6d4'
                          : 'rgba(255,255,255,0.15)',
                        boxShadow: i === engine.currentStepIndex ? '0 0 8px rgba(6,182,212,0.9)' : 'none',
                      }} />
                  ))}
                </div>

                {/* Performance Stats Pills */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-cyan-500/20 bg-zinc-950/80 backdrop-blur-md">
                    <Gauge size={11} className="text-cyan-400" />
                    <span className="font-mono text-[11px] tracking-widest text-zinc-300">
                      WPM: <span className="text-cyan-300 font-bold">{engine.wpm}</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-emerald-500/20 bg-zinc-950/80 backdrop-blur-md">
                    <Activity size={11} className="text-emerald-400" />
                    <span className="font-mono text-[11px] tracking-widest text-zinc-300">
                      ACC: <span className="text-emerald-300 font-bold">{engine.accuracy}%</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* ── Instruction Card ── */}
              <div
                className={`relative mb-3 w-full rounded-2xl transition-all duration-300 overflow-hidden ${engine.errorShake ? 'animate-[shake_0.3s_ease-in-out]' : ''}`}
                style={{
                  background: 'rgba(10, 13, 24, 0.90)',
                  border: engine.errorShake ? '1px solid rgba(248,113,113,0.5)' : engine.isDrillMode ? '1px solid rgba(245,158,11,0.5)' : '1px solid rgba(34,211,238,0.25)',
                  boxShadow: engine.errorShake ? '0 0 20px rgba(248,113,113,0.15)' : engine.isDrillMode ? '0 0 20px rgba(245,158,11,0.15)' : '0 4px 20px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)',
                  backdropFilter: 'blur(20px)',
                }}>

                <div className="px-6 py-3.5 flex flex-col items-center gap-1.5 relative z-10">
                  {/* Finger Indicator Pill */}
                  {fMeta && (
                    <div className="flex items-center gap-1.5 rounded-full px-3 py-0.5 bg-white/10 border border-white/10">
                      <span className="w-[6px] h-[6px] rounded-full shadow-[0_0_6px_currentColor]" style={{ background: fMeta.dot, color: fMeta.dot }} />
                      <span className="text-[9px] font-bold tracking-[0.2em] uppercase text-zinc-200">
                        {fMeta.label}
                      </span>
                    </div>
                  )}

                  {/* Instruction Text */}
                  <h2 className="text-lg md:text-xl font-mono font-bold uppercase tracking-widest text-center transition-colors duration-300"
                    style={{
                      color: engine.errorShake ? '#fca5a5' : engine.isDrillMode ? '#fbbf24' : '#ffffff',
                      textShadow: engine.errorShake
                        ? '0 0 12px rgba(248,113,113,0.6)'
                        : engine.isDrillMode
                          ? '0 0 12px rgba(245,158,11,0.5)'
                          : '0 0 12px rgba(0,245,255,0.4)',
                    }}>
                    {instruction || 'Press the highlighted key'}
                  </h2>
                </div>
              </div>
            </div>
          )}

          {/* ── Keyboard & Hands Command Deck ── */}
          {!engine.lessonComplete && !engine.allComplete && (
            <div className="flex flex-col items-center gap-2 w-full max-w-2xl">
              <VirtualKeyboard activeKey={activeKey} activeFinger={activeFinger} />
              <CyberHands activeKey={activeKey} activeFinger={activeFinger} />
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
    </div>
  );
}
