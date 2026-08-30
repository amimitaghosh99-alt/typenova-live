import { memo, useRef } from 'react';
import { Award, Ghost, Lock, Swords, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SegmentedControl } from '@/components/SegmentedControl';
import { AnimatedHeight } from '@/components/ui/AnimatedHeight';
import type { Theme } from '@/data/constants';
import type { ModeScoreRow } from '@/hooks/useModeLeaderboard';
import { useFitToViewport } from '@/hooks/useFitToViewport';
import { formatModeLabel, formatModeLabelLong } from '@/lib/modeKey';

interface LeaderboardEntry {
  username: string;
  wpm: number;
  accuracy: number;
  /** Only mode-board rows carry one; it identifies the raceable ghost. */
  user_id?: string;
}

export type BoardTab = 'alltime' | 'mode' | 'today' | 'friends';

interface LeaderboardSidebarProps {
  leaderboardClass: string;
  theme: Theme;
  boardTab: BoardTab;
  isLoggedIn: boolean;
  leaderboard: LeaderboardEntry[];
  dailyBoard: LeaderboardEntry[];
  friendsBoard: LeaderboardEntry[];
  /** Ghost Net: best runs for the exact config the player is set to. */
  modeBoard: ModeScoreRow[];
  modeKey: string | null;
  modeUnavailable: boolean;
  currentUsername: string | null;
  onTabChange: (tab: BoardTab) => void;
  onProfileClick: (username: string) => void;
  onChallengeFriend: (username: string) => void;
  onRemoveFriend: (username: string) => void;
  /** Arm this row's stored run as the ghost opponent for the next test. */
  onRaceGhost: (row: ModeScoreRow) => void;
}

export const LeaderboardSidebar = memo(function LeaderboardSidebar({
  leaderboardClass,
  theme,
  boardTab,
  isLoggedIn,
  leaderboard,
  dailyBoard,
  friendsBoard,
  modeBoard,
  modeKey,
  modeUnavailable,
  currentUsername,
  onTabChange,
  onProfileClick,
  onChallengeFriend,
  onRemoveFriend,
  onRaceGhost,
}: LeaderboardSidebarProps) {
  const currentList: LeaderboardEntry[] =
    boardTab === 'today' ? dailyBoard
    : boardTab === 'friends' ? friendsBoard
    : boardTab === 'mode' ? modeBoard
    : leaderboard;

  const heading =
    boardTab === 'today' ? 'DAILY 5'
    : boardTab === 'friends' ? 'FRIENDS'
    : boardTab === 'mode' ? (modeKey ? formatModeLabel(modeKey) : 'UNRANKED')
    : 'TOP 5';

  const emptyMessage =
    boardTab === 'friends'
      ? (currentUsername ? 'No friends yet. Follow someone!' : 'Log in to use friends.')
      : boardTab === 'today'
      ? 'No daily scores yet. Run the DAILY challenge!'
      : boardTab === 'mode'
      ? (!modeKey
          ? 'Custom, mirrored and daily runs have no shared board.'
          : modeUnavailable
          ? 'Mode boards need the ghosts migration.'
          : `No runs for ${formatModeLabelLong(modeKey)} yet.`)
      : 'No scores yet. Be the first!';

  // The board is the only thing on this stage tall enough to outgrow the
  // viewport, and letting it do so scrolled the whole page instead of the list.
  //
  // The cap is measured rather than written out as a calc(). The first attempt
  // here was `calc(100dvh - var(--nav-h) - 10rem)`, which looked right and was
  // about 100px too generous — so the max-height never bit and nothing changed.
  // The padding above this panel lives in a stage wrapper and a grid declared in
  // App.tsx, and either can move without this file knowing. Measuring the real
  // offset removes the guess.
  //
  // `min-h-[460px]` is the floor, so the cap is clamped to it: a min-height wins
  // over a max-height, and letting them disagree is what would put the page
  // scrollbar back on a short window. Below `lg` the panel sits under the arena
  // in a single column, where growing the page is correct and a nested scroll
  // area would be worse, so the cap is skipped there.
  const asideRef = useRef<HTMLElement | null>(null);
  const maxHeight = useFitToViewport(asideRef, { minPx: 460, minViewportWidth: 1024 });

  return (
    <aside
      ref={asideRef}
      style={maxHeight != null ? { maxHeight } : undefined}
      className={`${leaderboardClass} min-h-[460px] flex flex-col justify-start`}
    >
      {/* `flex-1` rather than `h-full`: the aside's height comes from its content
          clamped by an inline max-height, and a percentage height against an
          auto-height parent resolves to auto — which would leave this wrapper
          taller than the aside and defeat the inner scroll. */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.35, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
        className="w-full flex flex-col flex-1 min-h-0"
      >
        {/* Four tabs no longer fit beside the title on a sidebar, so the
            selector gets its own full-width row underneath it. `shrink-0` keeps
            the header out of the scroll region below. */}
        <div className="shrink-0 flex flex-col gap-4 text-white font-black tracking-widest mb-8 border-b border-white/10 pb-6 text-lg w-full">
          <div className="flex items-center min-w-0">
            <Award size={20} className={`mr-3 shrink-0 ${theme.text}`} />
            <div className="relative overflow-hidden h-7 flex items-center min-w-0">
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={boardTab === 'mode' ? `mode-${modeKey ?? 'none'}` : boardTab}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  className="whitespace-nowrap font-black truncate"
                >
                  {heading}
                </motion.span>
              </AnimatePresence>
            </div>
          </div>
          <SegmentedControl
            options={[
              { label: 'ALL', value: 'alltime' },
              { label: 'MODE', value: 'mode' },
              { label: 'TODAY', value: 'today' },
              { label: 'FRIENDS', value: 'friends' },
            ]}
            value={boardTab}
            onChange={(val) => onTabChange(val as BoardTab)}
            theme={theme}
            themeTextClass={theme.text}
            size="sm"
            fullWidth
          />
        </div>

      {/* The scroll region. `min-h-0` is what lets a flex child actually shrink
          below its content height — without it the wrapper would grow and the
          page would scroll again. `overflow-x-hidden` because rows translate on
          hover, which counts toward scrollable overflow. */}
      <div className="flex-1 min-h-0 w-full lg:overflow-y-auto lg:overflow-x-hidden custom-scrollbar">
      {/* Auto-measured Animated Height Container for buttery-smooth morphing */}
      <AnimatedHeight expandDuration={0.45} shrinkDuration={0.65} className="w-full">
        <AnimatePresence mode="wait" initial={false}>
          {boardTab === 'friends' && !isLoggedIn ? (
            <motion.div
              key="friends-locked"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="w-full flex flex-col items-center justify-center py-16 text-center opacity-70"
            >
              <Lock size={32} className="text-zinc-600 mb-4" />
              <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest max-w-[180px]">
                Sign in to connect and compete with friends.
              </p>
            </motion.div>
          ) : currentList.length === 0 ? (
            <motion.div
              key={`empty-${boardTab}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="w-full py-16 flex flex-col items-center justify-center px-4"
            >
              <p className="text-zinc-500 text-sm text-center font-bold">
                {emptyMessage}
              </p>
            </motion.div>
          ) : (
            <motion.div
              key={`list-${boardTab}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="space-y-6 w-full"
            >
              {currentList.map((entry, idx) => {
                const isMe = !!currentUsername && entry.username.toLowerCase() === currentUsername.toLowerCase();
                const isTop1 = idx === 0;
                const isTop2 = idx === 1;
                const isTop3 = idx === 2;

                const rankColor = isTop1
                  ? `rgb(${theme.glowPrimary})`
                  : isTop2
                  ? '#e2e8f0'
                  : isTop3
                  ? '#f59e0b'
                  : '#a1a1aa';

                return (
                  <motion.div
                    key={`${boardTab}-${entry.username}-${idx}`}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.45,
                      delay: idx * 0.055,
                      ease: [0.25, 1, 0.35, 1]
                    }}
                    className={`flex justify-between items-center group p-4 rounded-2xl transition-all duration-300 w-full relative ${
                      isMe
                        ? 'bg-white/[0.09] border border-white/25 shadow-[0_4px_20px_rgba(0,0,0,0.3),inset_0_0_15px_rgba(255,255,255,0.06)] backdrop-blur-md pl-6'
                        : isTop1
                        ? 'bg-white/[0.04] border border-white/10 shadow-[inset_0_0_15px_rgba(255,255,255,0.02)] pl-6'
                        : 'hover:bg-white/5 border border-transparent hover:border-white/5 hover:translate-x-1 pl-4'
                    }`}
                  >
                    {/* Glowing Left Indicator for logged-in user or top 1 */}
                    {(isMe || isTop1) && (
                      <div
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-3/4 rounded-r-full"
                        style={{
                          backgroundColor: isMe ? `rgb(${theme.glowPrimary})` : rankColor,
                          boxShadow: `0 0 15px ${isMe ? `rgba(${theme.glowPrimary}, 0.9)` : rankColor}`,
                        }}
                      />
                    )}
                    <div className="flex items-center space-x-5">
                      <span
                        className="font-black text-xl tracking-tight w-8 text-left"
                        style={{
                          color: isTop1 ? '#ffffff' : rankColor,
                          textShadow: isTop1 || isMe ? `0 0 16px ${isTop1 ? `rgb(${theme.glowPrimary})` : rankColor}` : 'none',
                        }}
                      >
                        #{idx + 1}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onProfileClick(entry.username)}
                          className={`font-black tracking-widest uppercase text-base whitespace-nowrap hover:underline transition-colors text-left cursor-pointer ${
                            isMe || isTop1 ? 'text-white font-extrabold' : 'text-zinc-300 hover:text-white'
                          }`}
                          title={`View ${entry.username}'s Profile`}
                        >
                          {entry.username}
                        </button>
                        {isMe && (
                          <span
                            className="px-1.5 py-0.5 rounded text-[9px] font-black tracking-widest uppercase border"
                            style={{
                              backgroundColor: `rgba(${theme.glowPrimary}, 0.15)`,
                              borderColor: `rgba(${theme.glowPrimary}, 0.4)`,
                              color: `rgb(${theme.glowPrimary})`,
                            }}
                          >
                            YOU
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end mr-4 group-hover:mr-10 transition-all">
                      <span
                        className="font-black text-3xl leading-none"
                        style={
                          isMe || isTop1
                            ? {
                                color: `rgb(${theme.glowPrimary})`,
                                textShadow: `0 0 12px rgba(${theme.glowPrimary}, 0.6)`,
                              }
                            : { color: '#ffffff' }
                        }
                      >
                        {entry.wpm}
                      </span>
                      <span className="text-[10px] text-zinc-400 font-bold tracking-widest whitespace-nowrap mt-1">{entry.accuracy}% ACC</span>
                    </div>
                  {/* Ghost Net: every mode-board row is a raceable opponent. */}
                  {boardTab === 'mode' && entry.user_id && (
                    <div className="absolute right-3 opacity-0 group-hover:opacity-100 flex items-center transition-all bg-black/40 rounded-full p-1 border border-white/5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRaceGhost(entry as ModeScoreRow);
                        }}
                        className="p-2 text-zinc-400 hover:text-cyan-300 transition-all rounded-full cursor-pointer"
                        title={`Race ${entry.username}'s ghost`}
                      >
                        <Ghost size={14} />
                      </button>
                    </div>
                  )}
                  {boardTab === 'friends' && entry.username !== currentUsername && (
                    <div className="absolute right-3 opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-all bg-black/40 rounded-full p-1 border border-white/5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onChallengeFriend(entry.username);
                        }}
                        className="p-2 text-zinc-400 hover:text-amber-400 transition-all rounded-full cursor-pointer"
                        title="Challenge to Race"
                      >
                        <Swords size={14} />
                      </button>
                      <div className="w-px h-4 bg-white/10" />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveFriend(entry.username);
                        }}
                        className="p-2 text-zinc-400 hover:text-red-400 transition-all rounded-full cursor-pointer"
                        title="Unfollow"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                </motion.div>
              );
            })}
            </motion.div>
          )}
        </AnimatePresence>
      </AnimatedHeight>
      </div>
      </motion.div>
    </aside>
  );
});
