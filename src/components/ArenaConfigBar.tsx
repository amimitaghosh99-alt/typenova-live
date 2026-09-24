import { memo } from 'react';
import { Clock, Hash, CalendarCheck, CheckCircle2, Sparkles, Brain } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnimatedHeight } from '@/components/ui/AnimatedHeight';
import { SegmentedControl } from '@/components/SegmentedControl';
import { CODE_LANGUAGES, type Theme, type Level } from '@/data/constants';
import type { useGameConfig } from '@/hooks/useGameConfig';
import { isTodayDailyCompleted } from '@/utils/seededRandom';
import { getDailySnippet } from '@/data/dailySnippets';

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
  dueWordsCount?: number;
  onTrainDue?: () => void;
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
  dueWordsCount = 0,
  onTrainDue,
}: ArenaConfigBarProps) {
  const isDailyDone = isTodayDailyCompleted();
  const todayDailySnippet = getDailySnippet();

  return (
    <AnimatedHeight expandDuration={0.4} shrinkDuration={0.5} className="w-full">
      <div
        className={`flex flex-col items-center gap-2.5 transition-opacity duration-500 pt-1 pb-3 md:pb-5 w-full max-w-6xl mx-auto px-1 z-10 relative ${
          shouldHideClutter ? 'hidden opacity-0' : 'flex opacity-100'
        }`}
      >
        {/* 1. Categorized Practice Controls */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-2.5 max-w-full">
          
          {/* Category 1: Difficulty Level */}
          <div
            className={`glass-panel !bg-black/65 border border-white/15 backdrop-blur-2xl rounded-full p-0.5 sm:p-1 shadow-lg transition-opacity duration-200 ${
              game.dailyActive ? 'opacity-30 pointer-events-none' : 'opacity-100'
            }`}
            title={game.dailyActive ? 'Standardized Daily Challenge text' : 'Select Difficulty'}
          >
            <SegmentedControl
              options={levelOptions}
              value={game.level}
              onChange={handleChangeLevel}
              onLockedClick={handleLockedLevelClick}
              theme={theme}
              themeTextClass={theme.text}
              size="sm"
              bare
            />
          </div>

          {/* Category 2: Target (Words / Time) */}
          <div
            className={`flex items-center gap-1 glass-panel !bg-black/65 border border-white/15 backdrop-blur-2xl rounded-full px-2 sm:px-2.5 py-1 shadow-lg transition-opacity duration-200 ${
              lengthLocked || game.dailyActive ? 'opacity-30 pointer-events-none' : 'opacity-100'
            }`}
          >
            {/* Mode Selector */}
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => game.changeTestMode('words')}
                disabled={lengthLocked || game.dailyActive}
                style={
                  game.testMode === 'words'
                    ? {
                        backgroundColor: `rgba(${theme.glowPrimary}, 0.2)`,
                        color: `rgb(${theme.glowPrimary})`,
                        boxShadow: `0 0 10px rgba(${theme.glowPrimary}, 0.3)`,
                      }
                    : undefined
                }
                className={`p-1.5 rounded-full transition-all cursor-pointer ${
                  game.testMode === 'words'
                    ? 'font-bold'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
                title="Words mode"
                aria-label="Words mode"
              >
                <Hash size={13} />
              </button>
              <button
                type="button"
                onClick={() => game.changeTestMode('time')}
                disabled={lengthLocked || game.dailyActive}
                style={
                  game.testMode === 'time'
                    ? {
                        backgroundColor: `rgba(${theme.glowPrimary}, 0.2)`,
                        color: `rgb(${theme.glowPrimary})`,
                        boxShadow: `0 0 10px rgba(${theme.glowPrimary}, 0.3)`,
                      }
                    : undefined
                }
                className={`p-1.5 rounded-full transition-all cursor-pointer ${
                  game.testMode === 'time'
                    ? 'font-bold'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
                title="Time mode"
                aria-label="Time mode"
              >
                <Clock size={13} />
              </button>
            </div>

            {/* Separator between mode and values */}
            <div className="w-px h-3.5 bg-white/15 mx-0.5 shrink-0" />

            {/* Value Selectors (Numbers / Durations) */}
            <div className="flex items-center gap-0.5 font-mono">
              {game.testMode === 'words' ? (
                <>
                  {WORD_OPTIONS.map((opt) => {
                    const isSelected = game.wordCount === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => handleChangeCountOrDuration(opt.value)}
                        disabled={lengthLocked || game.dailyActive}
                        style={
                          isSelected
                            ? {
                                backgroundColor: `rgba(${theme.glowPrimary}, 0.2)`,
                                color: `rgb(${theme.glowPrimary})`,
                                boxShadow: `0 0 10px rgba(${theme.glowPrimary}, 0.3)`,
                              }
                            : undefined
                        }
                        className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[10px] sm:text-[10.5px] tracking-wider transition-all cursor-pointer ${
                          isSelected
                            ? 'font-black'
                            : 'text-zinc-400 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                  {!WORD_OPTIONS.some((opt) => opt.value === game.wordCount) && !game.dailyActive && (
                    <span
                      style={{
                        backgroundColor: `rgba(${theme.glowPrimary}, 0.2)`,
                        color: `rgb(${theme.glowPrimary})`,
                        boxShadow: `0 0 10px rgba(${theme.glowPrimary}, 0.3)`,
                      }}
                      className="px-2 py-0.5 rounded-full text-[10px] font-mono font-black"
                    >
                      {game.wordCount}
                    </span>
                  )}
                </>
              ) : (
                TIME_OPTIONS.map((opt) => {
                  const isSelected = game.duration === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleChangeCountOrDuration(opt.value)}
                      disabled={lengthLocked || game.dailyActive}
                      style={
                        isSelected
                          ? {
                              backgroundColor: `rgba(${theme.glowPrimary}, 0.2)`,
                              color: `rgb(${theme.glowPrimary})`,
                              boxShadow: `0 0 10px rgba(${theme.glowPrimary}, 0.3)`,
                            }
                          : undefined
                      }
                      className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[10px] sm:text-[10.5px] tracking-wider transition-all cursor-pointer ${
                        isSelected
                          ? 'font-black'
                          : 'text-zinc-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {opt.label}s
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Category 3: Text Mutators (123 & !?) */}
          {mutatable && (
            <div
              className={`flex items-center gap-0.5 glass-panel !bg-black/65 border border-white/15 backdrop-blur-2xl rounded-full px-1.5 py-1 shadow-lg transition-opacity duration-200 ${
                game.dailyActive ? 'opacity-30 pointer-events-none' : 'opacity-100'
              }`}
            >
              <button
                type="button"
                onClick={game.toggleNumbers}
                style={
                  game.withNumbers
                    ? {
                        backgroundColor: `rgba(${theme.glowPrimary}, 0.2)`,
                        color: `rgb(${theme.glowPrimary})`,
                        boxShadow: `0 0 10px rgba(${theme.glowPrimary}, 0.3)`,
                      }
                    : undefined
                }
                className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[10px] sm:text-[10.5px] font-mono tracking-wider transition-all cursor-pointer ${
                  game.withNumbers
                    ? 'font-black'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
                title="Toggle Numbers (123)"
                aria-pressed={game.withNumbers}
              >
                123
              </button>
              <button
                type="button"
                onClick={game.togglePunctuation}
                style={
                  game.withPunctuation
                    ? {
                        backgroundColor: `rgba(${theme.glowPrimary}, 0.2)`,
                        color: `rgb(${theme.glowPrimary})`,
                        boxShadow: `0 0 10px rgba(${theme.glowPrimary}, 0.3)`,
                      }
                    : undefined
                }
                className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[10px] sm:text-[10.5px] font-mono tracking-wider transition-all cursor-pointer ${
                  game.withPunctuation
                    ? 'font-black'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
                title="Toggle Punctuation (!?)"
                aria-pressed={game.withPunctuation}
              >
                !?
              </button>
            </div>
          )}

          {/* Category 4: View Mode (Normal vs Zen) */}
          <div className="flex items-center gap-0.5 glass-panel !bg-black/65 border border-white/15 backdrop-blur-2xl rounded-full px-1.5 py-1 shadow-lg">
            <button
              type="button"
              onClick={() => game.setZenMode(false)}
              style={
                !game.zenMode
                  ? {
                      backgroundColor: `rgba(${theme.glowPrimary}, 0.2)`,
                      color: `rgb(${theme.glowPrimary})`,
                      boxShadow: `0 0 10px rgba(${theme.glowPrimary}, 0.3)`,
                    }
                  : undefined
              }
              className={`px-2.5 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-[10.5px] font-mono tracking-wider transition-all cursor-pointer ${
                !game.zenMode
                  ? 'font-black'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
              title="Normal Mode — Live speedometers, accuracy & gauges"
            >
              NORMAL
            </button>
            <button
              type="button"
              onClick={() => game.setZenMode(true)}
              style={
                game.zenMode
                  ? {
                      backgroundColor: `rgba(${theme.glowPrimary}, 0.2)`,
                      color: `rgb(${theme.glowPrimary})`,
                      boxShadow: `0 0 10px rgba(${theme.glowPrimary}, 0.3)`,
                    }
                  : undefined
              }
              className={`px-2.5 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-[10.5px] font-mono tracking-wider transition-all cursor-pointer flex items-center gap-1 ${
                game.zenMode
                  ? 'font-black'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
              title="Zen Mode — Distraction-free pure flow typing"
            >
              <Sparkles size={11} /> ZEN
            </button>
          </div>
        </div>

        {/* 2. Secondary Action Row: Daily Challenge & Spaced Repetition Due Words */}
        <div className="flex flex-wrap justify-center items-center gap-2 sm:gap-2.5 w-full mt-0.5">
          <button
            type="button"
            onClick={game.toggleDaily}
            style={
              game.dailyActive
                ? {
                    backgroundColor: `rgba(${theme.glowPrimary}, 0.2)`,
                    borderColor: `rgba(${theme.glowPrimary}, 0.6)`,
                    boxShadow: `0 0 20px rgba(${theme.glowPrimary}, 0.3)`,
                  }
                : isDailyDone
                ? {
                    borderColor: 'rgba(52, 211, 153, 0.4)',
                    backgroundColor: 'rgba(52, 211, 153, 0.1)',
                    color: 'rgb(52, 211, 153)',
                  }
                : undefined
            }
            className={`group flex items-center gap-2 sm:gap-2.5 px-3.5 sm:px-4 py-1.5 rounded-full text-xs font-mono tracking-wider glass-panel !bg-black/75 border border-white/15 backdrop-blur-2xl shadow-xl transition-all duration-300 cursor-pointer ${
              game.dailyActive
                ? 'font-black scale-[1.02] text-white'
                : isDailyDone
                ? 'font-bold hover:border-emerald-400/50'
                : 'text-zinc-300 hover:text-white hover:border-white/30'
            }`}
            title={
              isDailyDone
                ? "Today's Daily Challenge completed! Click to practice again"
                : "Today's curated Daily Challenge — standardized for all typists worldwide"
            }
          >
            <div className="flex items-center gap-1.5 shrink-0">
              {isDailyDone ? (
                <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
              ) : (
                <CalendarCheck
                  size={13}
                  className="shrink-0"
                  style={game.dailyActive ? { color: `rgb(${theme.glowPrimary})` } : undefined}
                />
              )}
              <span className="font-black tracking-widest uppercase text-white">
                {game.dailyActive ? 'DAILY CHALLENGE ACTIVE' : 'DAILY CHALLENGE'}
              </span>
            </div>

            <span className="w-1 h-1 rounded-full bg-white/20 shrink-0 hidden sm:block" />

            <span className="text-zinc-400 group-hover:text-zinc-200 truncate max-w-[150px] sm:max-w-none">
              #{todayDailySnippet.day}: {todayDailySnippet.title}
            </span>

            <span
              className="text-[9.5px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider shrink-0"
              style={{
                backgroundColor: `rgba(${theme.glowPrimary}, 0.18)`,
                color: `rgb(${theme.glowPrimary})`,
              }}
            >
              {todayDailySnippet.category}
            </span>

            {isDailyDone ? (
              <span className="text-emerald-400 text-[10px] font-bold ml-1 shrink-0 flex items-center gap-1">
                COMPLETED ✓
              </span>
            ) : game.dailyActive ? (
              <span className="text-[10px] text-red-400 hover:text-red-300 font-bold ml-1 shrink-0 px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20">
                EXIT ✕
              </span>
            ) : (
              <span
                className="text-[10px] font-bold ml-1 shrink-0 transition-transform group-hover:translate-x-0.5"
                style={{ color: `rgb(${theme.glowPrimary})` }}
              >
                PLAY TODAY →
              </span>
            )}
          </button>

          {dueWordsCount > 0 && onTrainDue && (
            <button
              type="button"
              onClick={onTrainDue}
              style={{
                borderColor: `rgba(${theme.glowPrimary}, 0.5)`,
                boxShadow: `0 0 16px rgba(${theme.glowPrimary}, 0.22)`,
              }}
              className="group flex items-center gap-2 sm:gap-2.5 px-3.5 sm:px-4 py-1.5 rounded-full text-xs font-mono tracking-wider glass-panel !bg-black/80 border backdrop-blur-2xl shadow-xl transition-all duration-300 cursor-pointer hover:scale-[1.02] hover:border-white/40 text-white"
              title={`${dueWordsCount} word${dueWordsCount === 1 ? '' : 's'} due for spaced-repetition review. Click to launch AI drill.`}
            >
              <div className="flex items-center gap-1.5 shrink-0">
                <Brain
                  size={13}
                  className="shrink-0 animate-pulse"
                  style={{ color: `rgb(${theme.glowPrimary})` }}
                />
                <span className="font-black tracking-widest uppercase text-white">
                  <span
                    className="font-black"
                    style={{ color: `rgb(${theme.glowPrimary})` }}
                  >
                    {dueWordsCount}
                  </span>{' '}
                  DUE FOR REVIEW
                </span>
              </div>

              <span className="w-1 h-1 rounded-full bg-white/20 shrink-0 hidden sm:block" />

              <span
                className="text-[9.5px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0 transition-transform group-hover:translate-x-0.5"
                style={{
                  backgroundColor: `rgba(${theme.glowPrimary}, 0.3)`,
                  color: '#ffffff',
                  border: `1px solid rgba(${theme.glowPrimary}, 0.4)`,
                }}
              >
                PRACTICE →
              </span>
            </button>
          )}
        </div>

        {/* Dynamic Secondary Controls (Code Language / Dictation Track / Custom Text) */}
        <AnimatePresence mode="wait">
          {game.level === 'CODE' && (
            <motion.div
              key="code-sub-bar"
              initial={{ opacity: 0, y: -6, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.96 }}
              transition={{ duration: 0.2, ease: [0.25, 1, 0.5, 1] }}
              className="flex items-center justify-center mt-0.5"
            >
              <SegmentedControl
                options={CODE_LANGUAGE_OPTIONS}
                value={game.codeLanguage}
                onChange={handleChangeCodeLanguage}
                theme={theme}
                themeTextClass={theme.text}
                size="sm"
              />
            </motion.div>
          )}

          {game.level === 'DICTATION' && (
            <motion.div
              key="dictation-sub-bar"
              initial={{ opacity: 0, y: -6, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.96 }}
              transition={{ duration: 0.2, ease: [0.25, 1, 0.5, 1] }}
              className="flex items-center justify-center gap-2 flex-wrap mt-0.5"
            >
              <SegmentedControl
                options={[
                  { label: '0.75x', value: 0.75 },
                  { label: '1.0x', value: 1.0 },
                  { label: '1.25x', value: 1.25 },
                  { label: '1.5x', value: 1.5 },
                ]}
                value={game.dictationSpeed}
                onChange={(val) => game.changeDictationSpeed(Number(val))}
                theme={theme}
                themeTextClass={theme.text}
                size="sm"
              />
              <div className="w-1.5 h-1.5 rounded-full bg-white/10 mx-0.5 hidden md:block" />
              <SegmentedControl
                options={[
                  { label: 'JOBS', value: 'steve_jobs_stanford' },
                  { label: 'JFK', value: 'jfk_moon_speech' },
                  { label: 'APOLLO', value: 'apollo_11_descent' },
                  { label: 'CLEAN ARCH', value: 'clean_architecture' },
                  { label: 'MLK', value: 'mlk_dream' },
                ]}
                value={game.dictationTrackId}
                onChange={(val) => game.changeDictationTrack(String(val))}
                theme={theme}
                themeTextClass={theme.text}
                size="sm"
              />
            </motion.div>
          )}

          {game.level === 'CUSTOM' && (
            <motion.div
              key="custom-text-area"
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -4 }}
              transition={{ duration: 0.28, ease: [0.25, 1, 0.5, 1] }}
              className="w-full mt-1"
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
