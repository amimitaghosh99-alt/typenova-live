import { memo } from 'react';
import { Clock, Hash, CalendarCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnimatedHeight } from '@/components/ui/AnimatedHeight';
import { SegmentedControl } from '@/components/SegmentedControl';
import { CODE_LANGUAGES, type Theme, type Level } from '@/data/constants';
import type { useGameConfig } from '@/hooks/useGameConfig';

const TIME_OPTIONS = [15, 30, 60].map(v => ({ label: String(v), value: v }));
const WORD_OPTIONS = [10, 25, 50, 100].map(v => ({ label: String(v), value: v }));
const CODE_LANGUAGE_OPTIONS = CODE_LANGUAGES.map(lang => ({ label: lang.toUpperCase(), value: lang }));

interface ArenaConfigBarProps {
  game: ReturnType<typeof useGameConfig>;
  theme: Theme;
  levelOptions: Array<{ label: string; value: Level; locked?: boolean }>;
  lengthLocked: boolean;
  mutatable: boolean;
  shouldHideClutter: boolean;
  handleChangeLevel: (val: string) => void;
  handleLockedLevelClick: (lvl: Level) => void;
  handleChangeCountOrDuration: (val: string | number) => void;
  handleChangeCodeLanguage: (val: string) => void;
  onSetCustomTargetText: (text: string) => void;
}

export const ArenaConfigBar = memo(function ArenaConfigBar({
  game,
  theme,
  levelOptions,
  lengthLocked,
  mutatable,
  shouldHideClutter,
  handleChangeLevel,
  handleLockedLevelClick,
  handleChangeCountOrDuration,
  handleChangeCodeLanguage,
  onSetCustomTargetText,
}: ArenaConfigBarProps) {
  return (
    <AnimatedHeight expandDuration={0.4} shrinkDuration={0.5} className="w-full">
      <div className={`flex flex-wrap justify-center items-center gap-3 transition-opacity duration-500 pt-2 pb-6 w-full max-w-5xl mx-auto px-4 z-10 relative ${shouldHideClutter ? 'hidden opacity-0' : 'flex opacity-100'}`}>
        
        {/* Difficulty Level Segmented Control */}
        <div className={`transition-opacity ${game.dailyActive ? 'opacity-30' : 'opacity-100'}`}>
          <SegmentedControl
            options={levelOptions}
            value={game.level}
            onChange={handleChangeLevel}
            onLockedClick={handleLockedLevelClick}
            theme={theme}
            themeTextClass={theme.text}
          />
        </div>

        {/* Divider */}
        <div className="w-1.5 h-1.5 rounded-full bg-white/10 mx-1 hidden md:block" />

        {/* Words / Time Config Panel */}
        <div className={`flex glass-panel p-1 rounded-full items-center transition-opacity ${lengthLocked || game.dailyActive ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
          {/* Mode Selector */}
          <div className="flex items-center">
            <button
              onClick={() => game.changeTestMode('words')}
              disabled={lengthLocked}
              style={
                game.testMode === 'words'
                  ? {
                      backgroundColor: `rgba(${theme.glowPrimary}, 0.18)`,
                      color: `rgb(${theme.glowPrimary})`,
                      boxShadow: `0 0 10px rgba(${theme.glowPrimary}, 0.25)`,
                    }
                  : undefined
              }
              className={`p-2 rounded-full transition-all cursor-pointer ${
                game.testMode === 'words'
                  ? 'font-bold'
                  : 'text-zinc-500 hover:text-white hover:bg-white/5'
              }`}
              title="Word-count mode"
            >
              <Hash size={13} />
            </button>
            <button
              onClick={() => game.changeTestMode('time')}
              disabled={lengthLocked}
              style={
                game.testMode === 'time'
                  ? {
                      backgroundColor: `rgba(${theme.glowPrimary}, 0.18)`,
                      color: `rgb(${theme.glowPrimary})`,
                      boxShadow: `0 0 10px rgba(${theme.glowPrimary}, 0.25)`,
                    }
                  : undefined
              }
              className={`p-2 rounded-full transition-all cursor-pointer ${
                game.testMode === 'time'
                  ? 'font-bold'
                  : 'text-zinc-500 hover:text-white hover:bg-white/5'
              }`}
              title="Timed mode"
            >
              <Clock size={13} />
            </button>
          </div>

          <div className="w-px h-4 bg-white/10 mx-1" />

          {/* Length Selector */}
          <SegmentedControl
            options={game.testMode === 'time' ? TIME_OPTIONS : WORD_OPTIONS}
            value={game.testMode === 'time' ? game.duration : game.wordCount}
            onChange={handleChangeCountOrDuration}
            disabled={lengthLocked}
            theme={theme}
            themeTextClass={theme.text}
            bare
            size="sm"
          />

          {/* Mixins */}
          {mutatable && (
            <>
              <div className="w-px h-4 bg-white/10 mx-1" />
              <div className="flex items-center gap-0.5 pr-0.5">
                <button
                  onClick={game.toggleNumbers}
                  style={
                    game.withNumbers
                      ? {
                          backgroundColor: `rgba(${theme.glowPrimary}, 0.18)`,
                          color: `rgb(${theme.glowPrimary})`,
                          boxShadow: `0 0 10px rgba(${theme.glowPrimary}, 0.25)`,
                        }
                      : undefined
                  }
                  className={`px-2.5 py-1.5 rounded-full text-[10px] font-black tracking-widest transition-all cursor-pointer ${
                    game.withNumbers ? 'font-bold' : 'text-zinc-500 hover:text-white hover:bg-white/5'
                  }`}
                  title="Mix in numbers"
                >
                  123
                </button>
                <button
                  onClick={game.togglePunctuation}
                  style={
                    game.withPunctuation
                      ? {
                          backgroundColor: `rgba(${theme.glowPrimary}, 0.18)`,
                          color: `rgb(${theme.glowPrimary})`,
                          boxShadow: `0 0 10px rgba(${theme.glowPrimary}, 0.25)`,
                        }
                      : undefined
                  }
                  className={`px-2.5 py-1.5 rounded-full text-[10px] font-black tracking-widest transition-all cursor-pointer ${
                    game.withPunctuation ? 'font-bold' : 'text-zinc-500 hover:text-white hover:bg-white/5'
                  }`}
                  title="Mix in punctuation"
                >
                  !?
                </button>
              </div>
            </>
          )}
        </div>

        {/* Divider */}
        <div className="w-1.5 h-1.5 rounded-full bg-white/10 mx-1 hidden md:block" />

        {/* Daily Challenge Toggle */}
        <button
          onClick={game.toggleDaily}
          className={`glass-pill px-5 py-2 rounded-full text-[11px] font-black tracking-widest transition-all flex items-center gap-1.5 cursor-pointer ${
            game.dailyActive
              ? 'bg-amber-500/20 text-amber-400 border-amber-500/60 shadow-[0_0_20px_rgba(245,158,11,0.4)]'
              : 'text-amber-300/80 hover:text-amber-300 border-amber-400/20 hover:border-amber-400/50 shadow-[0_0_12px_rgba(245,158,11,0.1)] bg-black/65 backdrop-blur-2xl'
          }`}
          title="Same seeded 50-word ADEPT text for everyone, every day"
        >
          <CalendarCheck size={13} /> DAILY
        </button>

      {/* Dynamic Conditional Controls (Code Language / Custom Text) */}
      <AnimatePresence mode="wait">
        {game.level === 'CODE' && (
          <>
            <div className="w-1.5 h-1.5 rounded-full bg-white/10 mx-1 hidden md:block" />
            <motion.div
              key="code-language-selector"
              initial={{ opacity: 0, scale: 0.94, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: -4 }}
              transition={{ duration: 0.28, ease: [0.25, 1, 0.5, 1] }}
              className="flex items-center"
            >
              <SegmentedControl
                options={CODE_LANGUAGE_OPTIONS}
                value={game.codeLanguage}
                onChange={handleChangeCodeLanguage}
                theme={theme}
                themeTextClass={theme.text}
              />
            </motion.div>
          </>
        )}

        {game.level === 'CUSTOM' && (
          <motion.div
            key="custom-text-area"
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.28, ease: [0.25, 1, 0.5, 1] }}
            className="w-full mt-2"
          >
            <textarea
              value={game.customText}
              onChange={(e) => {
                const newText = e.target.value;
                game.setCustomText(newText);
                if (game.level === 'CUSTOM') {
                  const final = game.mirroredMode
                    ? newText.trim().split(' ').reverse().join(' ')
                    : newText.trim();
                  onSetCustomTargetText(final || 'Type your custom text above...');
                }
              }}
              onKeyDown={(e) => e.stopPropagation()}
              placeholder="Paste your custom text here to practice..."
              className="w-full max-w-3xl mx-auto block h-24 bg-white/[0.04] border border-white/10 rounded-2xl p-4 text-zinc-300 text-sm font-mono focus:outline-none focus:border-white/30 focus:bg-white/[0.06] resize-none transition-all shadow-inner"
              spellCheck={false}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </AnimatedHeight>
  );
});
