import { useState } from 'react';
import { X, Users, UserPlus, Inbox, Search, Check, UserMinus, UserCheck, User, Swords } from 'lucide-react';
import type { Theme } from '@/data/constants';
import type { useFriends } from '@/hooks/useFriends';
import { ProfileCard } from './ProfileCard';
import type { UserSkillStats } from '@/data/titles';

interface SocialModalProps {
  theme: Theme;
  onClose: () => void;
  friendsState: ReturnType<typeof useFriends>;
  onChallengeFriend?: (username: string) => void;
  sentChallengeTo?: string | null;
  profileStats?: {
    username: string;
    level: number;
    xp: number;
    currentLevelProgress: number;
    xpNeeded: number;
    skillStats: UserSkillStats;
  };
}

export const SocialModal = ({ theme, onClose, friendsState, profileStats, onChallengeFriend, sentChallengeTo }: SocialModalProps) => {
  const [tab, setTab] = useState<'friends' | 'add' | 'inbox' | 'profile'>('friends');
  const [searchInput, setSearchInput] = useState('');
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 180);
  };
  
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInput.trim()) return;
    const ok = await friendsState.addFriend(searchInput.trim());
    if (ok) setSearchInput('');
  };

  return (
    <div 
      className={`fixed inset-0 z-[500] flex items-center justify-center bg-black/80 p-4 overflow-y-auto transition-opacity duration-200 ${
        isClosing ? 'opacity-0' : 'opacity-100'
      }`}
      onClick={handleClose}
    >
      <div 
        className={`glass-panel relative w-full max-w-lg max-h-[85vh] my-auto flex flex-col rounded-2xl border border-white/15 shadow-2xl shadow-cyan-950/30 overflow-hidden p-5 sm:p-6 min-h-0 ${
          isClosing ? 'lucid-scale-exit' : 'lucid-scale'
        }`}
        style={{ '--delay': '0ms' } as React.CSSProperties}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle Ambient Glow Backdrop */}
        <div 
          className="absolute -top-32 -left-32 w-80 h-80 rounded-full blur-3xl pointer-events-none opacity-20"
          style={{ background: `rgb(${theme.glowPrimary || '6, 182, 212'})` }}
        />
        <div 
          className="absolute -bottom-32 -right-32 w-80 h-80 rounded-full blur-3xl pointer-events-none opacity-15"
          style={{ background: `rgb(${theme.glowSecondary || '34, 211, 238'})` }}
        />

        {/* Header */}
        <div className="flex justify-between items-center mb-4 pb-3.5 border-b border-white/10 shrink-0 relative z-10">
          <h2 className="text-lg sm:text-xl font-bold font-mono text-white tracking-tight flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center border border-cyan-500/30 bg-cyan-500/10 shadow-[0_0_12px_rgba(6,182,212,0.15)]">
              <Users className="text-cyan-400" size={16} />
            </div>
            Social Hub
          </h2>
          <button 
            onClick={handleClose} 
            className="p-1.5 bg-white/5 hover:bg-white/15 border border-white/10 text-zinc-400 hover:text-white rounded-full transition-all hover:rotate-90"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Error Toast */}
        {friendsState.error && (
          <div className="mb-4 px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono font-semibold text-center animate-in slide-in-from-top-2">
            {friendsState.error.toUpperCase()}
          </div>
        )}

        {/* Tabs */}
        <div className="flex bg-slate-900/60 p-1 rounded-xl mb-4 shrink-0 border border-white/10 relative z-10 font-mono">
          <button
            onClick={() => setTab('friends')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-mono font-bold transition-colors duration-150 ${
              tab === 'friends' 
                ? 'bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.15)]' 
                : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
            }`}
          >
            <UserCheck size={13} /> Friends ({friendsState.friends.length})
          </button>
          <button
            onClick={() => setTab('add')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-mono font-bold transition-colors duration-150 ${
              tab === 'add' 
                ? 'bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.15)]' 
                : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
            }`}
          >
            <UserPlus size={13} /> Add
          </button>
          <button
            onClick={() => setTab('inbox')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-mono font-bold transition-colors duration-150 ${
              tab === 'inbox' 
                ? 'bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.15)]' 
                : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
            }`}
          >
            <Inbox size={13} /> Inbox
            {friendsState.incomingRequests.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 ml-1">
                {friendsState.incomingRequests.length}
              </span>
            )}
          </button>
          {profileStats && (
            <button
              onClick={() => setTab('profile')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-mono font-bold transition-colors duration-150 ${
                tab === 'profile' 
                  ? 'bg-purple-500/15 border border-purple-500/30 text-purple-300 shadow-[0_0_12px_rgba(168,85,247,0.15)]' 
                  : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
              }`}
            >
              <User size={13} /> Profile
            </button>
          )}
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar min-h-0 relative z-10 transform-gpu font-mono">
          {tab === 'profile' && profileStats && (
            <ProfileCard
              username={profileStats.username}
              level={profileStats.level}
              xp={profileStats.xp}
              currentLevelProgress={profileStats.currentLevelProgress}
              xpNeeded={profileStats.xpNeeded}
              skillStats={profileStats.skillStats}
            />
          )}
          {tab === 'friends' && (
            <div className="flex flex-col gap-2 min-h-[180px] transition-opacity duration-150">
              {friendsState.friends.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-44 text-zinc-500 font-mono">
                  <Users size={40} className="mb-3 text-zinc-600 opacity-40" />
                  <span className="text-xs font-bold tracking-wider uppercase text-zinc-400">NO FRIENDS YET</span>
                  <button 
                    onClick={() => setTab('add')} 
                    className="mt-3 text-xs font-bold text-cyan-400 hover:text-cyan-300 transition-colors uppercase tracking-wider"
                  >
                    + FIND FRIENDS
                  </button>
                </div>
              ) : (
                friendsState.friends.map((friend, i) => (
                  <div 
                    key={friend.username} 
                    className="lucid-enter group flex justify-between items-center bg-slate-900/50 hover:bg-slate-900/80 border border-white/10 hover:border-cyan-500/30 p-3 rounded-xl transition-colors duration-150"
                    style={{ '--delay': `${i * 20}ms` } as React.CSSProperties}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-9 h-9 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-300 font-bold uppercase text-xs">
                          {friend.username.substring(0, 1)}
                        </div>
                        {friend.isOnline ? (
                          <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-slate-950 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
                        ) : (
                          <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-zinc-600 rounded-full border-2 border-slate-950" />
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-white tracking-wide">{friend.username}</span>
                        <span className="text-[10px] text-zinc-400 tracking-wider">Elo {friend.elo}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                      {/* Challenge Button */}
                      {onChallengeFriend && (
                        <button
                          onClick={() => friend.isOnline && onChallengeFriend(friend.username)}
                          disabled={!friend.isOnline || sentChallengeTo === friend.username}
                          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold font-mono transition-all ${
                            !friend.isOnline
                              ? 'text-zinc-600 border border-zinc-800 cursor-not-allowed'
                              : sentChallengeTo === friend.username
                                ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400 animate-pulse cursor-wait'
                                : 'bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 hover:shadow-[0_0_10px_rgba(244,63,94,0.2)] hover:scale-105'
                          }`}
                          title={friend.isOnline ? `Challenge ${friend.username}` : 'Friend is offline'}
                        >
                          <Swords size={12} />
                          {sentChallengeTo === friend.username ? 'Sent…' : 'Challenge'}
                        </button>
                      )}
                      <button
                        onClick={() => friendsState.removeFriend(friend.username, false)}
                        disabled={friendsState.loading}
                        className="p-1.5 hover:bg-rose-500/10 text-zinc-500 hover:text-rose-400 rounded-lg transition-all disabled:opacity-50"
                        title="Remove Friend"
                      >
                        <UserMinus size={15} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === 'add' && (
            <div className="flex flex-col gap-4 min-h-[180px] transition-opacity duration-150">
              <form onSubmit={handleSearch} className="relative">
                <input
                  type="text"
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  placeholder="SEARCH USERNAME..."
                  className="w-full bg-slate-900/60 border border-white/15 rounded-xl pl-10 pr-20 py-3 text-xs font-mono text-white placeholder:text-zinc-500 focus:outline-none focus:border-cyan-500/40 transition-colors"
                />
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" size={15} />
                <button 
                  type="submit" 
                  disabled={!searchInput.trim() || friendsState.loading}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold tracking-wider transition-colors disabled:opacity-40"
                >
                  SEND
                </button>
              </form>

              {friendsState.outgoingRequests.length > 0 && (
                <div className="flex flex-col gap-2">
                  <h3 className="text-[10px] font-bold font-mono tracking-wider uppercase text-zinc-400 px-1 flex items-center">
                    <span className="w-1 h-1 rounded-full bg-cyan-400 mr-2"></span> Outgoing Requests
                  </h3>
                  {friendsState.outgoingRequests.map((u: string) => (
                    <div key={u} className="flex justify-between items-center bg-slate-900/40 border border-white/10 p-2.5 rounded-xl">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 font-bold uppercase text-xs">
                          {u.substring(0, 1)}
                        </div>
                        <span className="text-xs font-mono text-zinc-300">{u}</span>
                      </div>
                      <button 
                        onClick={() => friendsState.removeFriend(u, false)}
                        disabled={friendsState.loading}
                        className="p-1 text-zinc-500 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors disabled:opacity-50"
                        title="Cancel Request"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'inbox' && (
            <div className="flex flex-col gap-2 min-h-[180px] transition-opacity duration-150">
              {friendsState.incomingRequests.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-44 text-zinc-500 font-mono">
                  <Inbox size={40} className="mb-3 text-zinc-600 opacity-40" />
                  <span className="text-xs font-bold tracking-wider uppercase text-zinc-400">INBOX IS EMPTY</span>
                </div>
              ) : (
                friendsState.incomingRequests.map((u: string) => (
                  <div key={u} className="flex justify-between items-center bg-slate-900/50 border border-white/10 p-3 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-300 font-bold uppercase text-xs">
                        {u.substring(0, 1)}
                      </div>
                      <span className="text-xs font-mono font-bold text-white">{u}</span>
                    </div>
                    <div className="flex gap-1.5">
                      <button 
                        onClick={() => friendsState.acceptRequest(u)}
                        disabled={friendsState.loading}
                        className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-lg transition-colors disabled:opacity-50"
                        title="Accept"
                      >
                        <Check size={14} />
                      </button>
                      <button 
                        onClick={() => friendsState.removeFriend(u, true)}
                        disabled={friendsState.loading}
                        className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 rounded-lg transition-colors disabled:opacity-50"
                        title="Decline"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
