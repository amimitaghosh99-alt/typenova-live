import { memo } from 'react';
import { Award, Lock, Swords, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SegmentedControl } from '@/components/SegmentedControl';
import { AnimatedHeight } from '@/components/ui/AnimatedHeight';
import type { Theme } from '@/data/constants';

interface LeaderboardEntry {
  username: string;
  wpm: number;
  accuracy: number;
}

interface LeaderboardSidebarProps {
  leaderboardClass: string;
  theme: Theme;
  boardTab: 'alltime' | 'today' | 'friends';
  isLoggedIn: boolean;
  leaderboard: LeaderboardEntry[];
  dailyBoard: LeaderboardEntry[];
  friendsBoard: LeaderboardEntry[];
  currentUsername: string | null;
  onTabChange: (tab: 'alltime' | 'today' | 'friends') => void;
  onProfileClick: (username: string) => void;
  onChallengeFriend: (username: string) => void;
  onRemoveFriend: (username: string) => void;
}

export const LeaderboardSidebar = memo(function LeaderboardSidebar({
  leaderboardClass,
  theme,
  boardTab,
  isLoggedIn,
  leaderboard,
  dailyBoard,
  friendsBoard,
  currentUsername,
  onTabChange,
  onProfileClick,
  onChallengeFriend,
  onRemoveFriend,
}: LeaderboardSidebarProps) {
  const currentList = boardTab === 'today' ? dailyBoard : boardTab === 'friends' ? friendsBoard : leaderboard;

  return (
    <aside className={`${leaderboardClass} min-h-[460px] flex flex-col justify-start`}>
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.35, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
        className="w-full flex flex-col h-full"
      >
        <div className="flex items-center justify-between text-white font-black tracking-widest mb-8 border-b border-white/10 pb-6 text-lg w-full">
        <div className="flex items-center">
          <Award size={20} className={`mr-3 ${theme.text}`} />
          <div className="relative overflow-hidden h-7 flex items-center">
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={boardTab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="whitespace-nowrap font-black"
              >
                {boardTab === 'today' ? 'DAILY 5' : boardTab === 'friends' ? 'FRIENDS' : 'TOP 5'}
              </motion.span>
            </AnimatePresence>
          </div>
        </div>
        <SegmentedControl
          options={[
            { label: 'ALL', value: 'alltime' },
            { label: 'TODAY', value: 'today' },
            { label: 'FRIENDS', value: 'friends' },
          ]}
          value={boardTab}
          onChange={(val) => onTabChange(val as 'alltime' | 'today' | 'friends')}
          theme={theme}
          themeTextClass={theme.text}
          size="sm"
        />
      </div>

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
              className="w-full py-16 flex flex-col items-center justify-center"
            >
              <p className="text-zinc-500 text-sm text-center font-bold whitespace-nowrap">
                {boardTab === 'friends' ? (currentUsername ? 'No friends yet. Follow someone!' : 'Log in to use friends.') : boardTab === 'today' ? 'No daily scores yet. Run the DAILY challenge!' : 'No scores yet. Be the first!'}
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
      </motion.div>
    </aside>
  );
});
