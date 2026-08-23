import { memo } from 'react';
import { Skull, Ghost, Focus, Brain, FlipHorizontal, CloudFog, Magnet, Timer, RotateCcw } from 'lucide-react';
import { motion } from 'framer-motion';
import { TypingArea, type PaceSample } from '@/components/TypingArea';
import { StatsPanel } from '@/components/StatsPanel';
import { ArenaConfigBar } from '@/components/ArenaConfigBar';
import type { Theme, Level } from '@/data/constants';
import type { useGameConfig } from '@/hooks/useGameConfig';
import type { useTypingEngine } from '@/hooks/useTypingEngine';
import type { useParticles } from '@/hooks/useParticles';
import type { RacerState } from '@/hooks/useRace';

interface PracticeArenaProps {
  game: ReturnType<typeof useGameConfig>;
  typing: ReturnType<typeof useTypingEngine>;
  particles: ReturnType<typeof useParticles>;
  theme: Theme;
  shouldHideClutter: boolean;
  levelOptions: Array<{ label: string; value: Level; locked?: boolean }>;
  lengthLocked: boolean;
  mutatable: boolean;
  pbGhost: { wpm: number; samples: PaceSample[] } | null;
  otherRacePlayers: RacerState[];
  handleChangeLevel: (val: string) => void;
  handleLockedLevelClick: (lvl: Level) => void;
  handleChangeCountOrDuration: (val: string | number) => void;
  handleChangeCodeLanguage: (val: string) => void;
  onSetCustomTargetText: (text: string) => void;
  onOpenGhostModal: () => void;
  onReset: () => void;
}

export const PracticeArena = memo(function PracticeArena({
  game,
  typing,
  particles,
  theme,
  shouldHideClutter,
  levelOptions,
  lengthLocked,
  mutatable,
  pbGhost,
  otherRacePlayers,
  handleChangeLevel,
  handleLockedLevelClick,
  handleChangeCountOrDuration,
  handleChangeCodeLanguage,
  onSetCustomTargetText,
  onOpenGhostModal,
  onReset,
}: PracticeArenaProps) {
  return (
    <div className={`w-full ${shouldHideClutter ? 'max-w-4xl mx-auto' : 'lg:w-[70%]'} flex flex-col gap-6`}>
      {/* Difficulty & Length/Time & Daily Config Bar */}
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 280, damping: 26 }}
      >
        <ArenaConfigBar
          game={game}
          theme={theme}
          levelOptions={levelOptions}
          lengthLocked={lengthLocked}
          mutatable={mutatable}
          shouldHideClutter={shouldHideClutter}
          handleChangeLevel={handleChangeLevel}
          handleLockedLevelClick={handleLockedLevelClick}
          handleChangeCountOrDuration={handleChangeCountOrDuration}
          handleChangeCodeLanguage={handleChangeCodeLanguage}
          onSetCustomTargetText={onSetCustomTargetText}
        />
      </motion.div>

      {/* Stats HUD — hidden in zen mode */}
      {!game.zenMode && (
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.04, ease: [0.16, 1, 0.3, 1] }}
        >
          <StatsPanel
            wpm={typing.wpm}
            accuracy={typing.accuracy}
            consistency={typing.consistency}
            combo={typing.combo}
            themeText={theme.text}
            timelinePoints={typing.timelinePoints}
            hasStarted={typing.keystrokeLog.current.length > 0}
            isIdle={typing.phase === 'CONFIGURING'}
          />
        </motion.div>
      )}

      {/* Typing Area & Attached Modifier Tab */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.97, y: 22 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 270, damping: 24, delay: 0.08 }}
        className="w-full relative flex flex-col items-center mb-12"
      >
        {/* Mode toggles — clean floating glass modifier dock */}
        {!shouldHideClutter && (
          <div className="w-full flex justify-center items-center relative z-20 mb-3">
            <div className="flex items-center gap-1.5 px-4 py-1.5 glass-panel !bg-black/60 border border-white/15 backdrop-blur-2xl rounded-full text-zinc-400 shadow-xl">
              <button
                onClick={() => game.setSuddenDeath(!game.suddenDeath)}
                className={`p-1.5 rounded-full transition-all flex justify-center items-center cursor-pointer ${game.suddenDeath ? 'bg-red-500/20 text-red-400 shadow-[0_0_10px_rgba(239,68,68,0.4)]' : 'hover:text-white hover:bg-white/10'}`}
                title="1HP: One mistake ends it"
              >
                <Skull size={16} />
              </button>

              <button
                onClick={(e) => {
                  if (e.shiftKey || e.altKey) {
                    onOpenGhostModal();
                  } else {
                    game.setGhostPacer(!game.ghostPacer);
                  }
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  onOpenGhostModal();
                }}
                className={`p-1.5 rounded-full transition-all flex justify-center items-center relative group cursor-pointer ${game.ghostPacer ? `${theme.bgAlpha} ${theme.vividText}` : 'hover:text-white hover:bg-white/10'}`}
                title={
                  game.ghostPacer
                    ? `Ghost Racer Active: ${game.ghostMode === 'pb' ? (pbGhost ? `PB (${pbGhost.wpm} WPM)` : 'PB Mode') : `${game.ghostTargetWpm} WPM Bot`} (Right-click or Shift-click for settings)`
                    : 'Ghost Racer 2.0 (Right-click or Shift-click for settings)'
                }
              >
                <Ghost size={16} />
                {game.ghostPacer && (
                  <span
                    className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full animate-ping"
                    style={{ backgroundColor: `rgb(${theme.glowPrimary})` }}
                  />
                )}
              </button>

              <button
                onClick={() => game.setFocusMode(!game.focusMode)}
                className={`p-1.5 rounded-full transition-all flex justify-center items-center cursor-pointer ${game.focusMode ? `${theme.bgAlpha} ${theme.vividText}` : 'hover:text-white hover:bg-white/10'}`}
                title="Focus"
              >
                <Focus size={16} />
              </button>

              <button
                onClick={() => game.setBlindMode(!game.blindMode)}
                className={`p-1.5 rounded-full transition-all flex justify-center items-center cursor-pointer ${game.blindMode ? `${theme.bgAlpha} ${theme.vividText}` : 'hover:text-white hover:bg-white/10'}`}
                title="Blind"
              >
                <Brain size={16} />
              </button>

              <button
                onClick={game.toggleMirror}
                className={`p-1.5 rounded-full transition-all flex justify-center items-center cursor-pointer ${game.mirroredMode ? `${theme.bgAlpha} ${theme.vividText}` : 'hover:text-white hover:bg-white/10'}`}
                title="Mirror"
              >
                <FlipHorizontal size={16} />
              </button>

              <button
                onClick={() => game.setFogMode(!game.fogMode)}
                className={`p-1.5 rounded-full transition-all flex justify-center items-center cursor-pointer ${game.fogMode ? `${theme.bgAlpha} ${theme.vividText}` : 'hover:text-white hover:bg-white/10'}`}
                title="Fog"
              >
                <CloudFog size={16} />
              </button>

              <button
                onClick={() => game.setStickyKeysMode(!game.stickyKeysMode)}
                className={`p-1.5 rounded-full transition-all flex justify-center items-center cursor-pointer ${game.stickyKeysMode ? `${theme.bgAlpha} ${theme.vividText}` : 'hover:text-white hover:bg-white/10'}`}
                title="Sticky Keys"
              >
                <Magnet size={16} />
              </button>

              <button
                onClick={() => game.setOverclockedMode(!game.overclockedMode)}
                className={`p-1.5 rounded-full transition-all flex justify-center items-center cursor-pointer ${game.overclockedMode ? 'bg-red-500/20 text-red-400' : 'hover:text-white hover:bg-white/10'}`}
                title="Overclocked"
              >
                <Timer size={16} />
              </button>
            </div>
          </div>
        )}

        <TypingArea
          targetText={typing.targetText}
          input={typing.input}
          phase={typing.phase}
          theme={theme}
          blindMode={game.blindMode}
          focusMode={game.focusMode}
          fogMode={game.fogMode}
          startTime={typing.startTime}
          shake={typing.shake}
          capsLock={typing.capsLock}
          stickyPenalty={game.stickyPenalty}
          particles={particles.particles}
          ghostPacer={game.ghostPacer}
          ghostMode={game.ghostMode}
          ghostTargetWpm={game.ghostTargetWpm}
          combo={typing.combo}
          zenMode={game.zenMode}
          pbGhost={pbGhost}
          isCodeMode={game.level === 'CODE'}
          racePlayers={otherRacePlayers}
        />

        {/* Floating Spacebar Prompt */}
        {typing.phase === 'CONFIGURING' && (
          <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 z-[100] flex justify-center pointer-events-none">
            <button
              onClick={() => { typing.setPhase('READY'); typing.setInput(''); }}
              style={{
                borderColor: `rgba(${theme.glowPrimary}, 0.7)`,
                backgroundColor: 'rgba(10, 12, 18, 0.92)',
                boxShadow: `0 12px 35px rgba(0, 0, 0, 0.7), 0 0 25px rgba(${theme.glowPrimary}, 0.4), inset 0 0 15px rgba(${theme.glowPrimary}, 0.15)`,
              }}
              className="glass-pill px-8 py-3 rounded-full flex items-center gap-3 transition-all duration-300 cursor-pointer hover:scale-105 active:scale-95 group pointer-events-auto font-display backdrop-blur-2xl border"
            >
              <span className="text-xs text-zinc-300 tracking-widest font-bold drop-shadow-sm group-hover:text-white transition-colors">PRESS</span>
              <span
                className="text-base tracking-widest font-black group-hover:scale-110 transition-transform"
                style={{
                  color: '#ffffff',
                  textShadow: `0 0 12px rgba(${theme.glowPrimary}, 1), 0 0 24px rgba(${theme.glowPrimary}, 0.8), 0 1px 3px rgba(0,0,0,0.9)`,
                }}
              >
                SPACE
              </span>
              <span className="text-xs text-zinc-300 tracking-widest font-bold drop-shadow-sm group-hover:text-white transition-colors">TO READY UP</span>
            </button>
          </div>
        )}
      </motion.div>

      {/* Abort Button (only during active test, NOT on finished) */}
      {(typing.phase === 'TYPING' || typing.phase === 'COUNTDOWN') && (
        <div className="mt-4 flex justify-center w-full z-10 relative">
          <button
            onClick={onReset}
            className="flex items-center space-x-3 px-8 py-3 bg-white/[0.04] hover:bg-white/10 text-zinc-300 hover:text-white transition-colors rounded-full border border-white/10 text-[10px] md:text-xs font-black tracking-widest shadow-xl backdrop-blur-md cursor-pointer"
          >
            <RotateCcw size={16} /> <span>ABORT & CONFIGURE (ESC)</span>
          </button>
        </div>
      )}
    </div>
  );
});
