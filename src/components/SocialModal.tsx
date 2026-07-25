import { useState } from 'react';
import { X, Users, UserPlus, Inbox, Search, Check, UserMinus, UserCheck } from 'lucide-react';
import type { Theme } from '@/data/constants';
import type { useFriends } from '@/hooks/useFriends';

interface SocialModalProps {
  theme: Theme;
  onClose: () => void;
  friendsState: ReturnType<typeof useFriends>;
}

export const SocialModal = ({ theme, onClose, friendsState }: SocialModalProps) => {
  const [tab, setTab] = useState<'friends' | 'add' | 'inbox'>('friends');
  const [searchInput, setSearchInput] = useState('');
  
  const accent = { color: `rgb(${theme.glowPrimary})` };
  
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInput.trim()) return;
    const ok = await friendsState.addFriend(searchInput.trim());
    if (ok) setSearchInput('');
  };

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300" onClick={onClose}>
      <div className="bg-zinc-950 border border-zinc-800 rounded-[2.5rem] p-8 md:p-10 w-full max-w-lg shadow-2xl lucid-scale flex flex-col max-h-[85vh]" style={{ '--delay': '0ms' } as React.CSSProperties} onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="flex justify-between items-center mb-6 border-b border-zinc-800/80 pb-5 shrink-0">
          <h2 className="text-2xl font-black text-white uppercase tracking-widest flex items-center">
            <Users className="mr-3" style={accent} size={24} /> Social HUB
          </h2>
          <button onClick={onClose} className="p-3 bg-zinc-900/50 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors border border-zinc-800/50">
            <X size={20} />
          </button>
        </div>

        {/* Error Toast */}
        {friendsState.error && (
          <div className="mb-4 px-4 py-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-[10px] font-black tracking-widest text-center animate-in slide-in-from-top-2">
            {friendsState.error.toUpperCase()}
          </div>
        )}

        {/* Tabs */}
        <div className="flex bg-zinc-900/50 p-1.5 rounded-3xl mb-6 shrink-0 border border-zinc-800/50">
          <button
            onClick={() => setTab('friends')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
              tab === 'friends' ? `bg-zinc-800 text-white shadow-lg` : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <UserCheck size={14} /> Friends ({friendsState.friends.length})
          </button>
          <button
            onClick={() => setTab('add')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
              tab === 'add' ? `bg-zinc-800 text-white shadow-lg` : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <UserPlus size={14} /> Add
          </button>
          <button
            onClick={() => setTab('inbox')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
              tab === 'inbox' ? `bg-zinc-800 text-white shadow-lg` : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Inbox size={14} /> Inbox {friendsState.incomingRequests.length > 0 && <span className={`px-2 py-0.5 rounded-full text-[9px] ${theme.text} bg-white/10 ml-1`}>{friendsState.incomingRequests.length}</span>}
          </button>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto pr-2 -mr-2 custom-scrollbar">
          {tab === 'friends' && (
            <div className="flex flex-col gap-2 min-h-[200px] animate-in fade-in slide-in-from-left-4 duration-300">
              {friendsState.friends.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-zinc-600">
                  <Users size={48} className="mb-4 opacity-20" />
                  <span className="text-[10px] font-black uppercase tracking-widest">NO FRIENDS YET</span>
                  <button onClick={() => setTab('add')} className={`mt-4 text-[10px] font-black tracking-widest ${theme.text} hover:opacity-80 transition-opacity uppercase`}>
                    + FIND FRIENDS
                  </button>
                </div>
              ) : (
                friendsState.friends.map((u: string) => (
                  <div key={u} className="group flex justify-between items-center bg-zinc-900/40 hover:bg-zinc-900 border border-zinc-800/40 hover:border-zinc-700 p-4 rounded-2xl transition-all">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400 font-bold uppercase">
                          {u.substring(0, 1)}
                        </div>
                        {/* Fake Online Indicator */}
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 rounded-full border-2 border-zinc-900 shadow-[0_0_8px_rgba(52,211,153,0.5)]"></div>
                      </div>
                      <span className="text-sm font-bold text-white uppercase tracking-wider">{u}</span>
                    </div>
                    <button 
                      onClick={() => friendsState.removeFriend(u, false)}
                      disabled={friendsState.loading}
                      className="p-2 opacity-0 group-hover:opacity-100 hover:bg-red-500/10 text-zinc-500 hover:text-red-400 rounded-xl transition-all disabled:opacity-50"
                      title="Remove Friend"
                    >
                      <UserMinus size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === 'add' && (
            <div className="flex flex-col gap-6 min-h-[200px] animate-in fade-in slide-in-from-right-4 duration-300">
              <form onSubmit={handleSearch} className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-zinc-800 to-zinc-800 rounded-3xl blur opacity-25 group-hover:opacity-50 transition duration-500"></div>
                <div className="relative">
                  <input
                    type="text"
                    value={searchInput}
                    onChange={e => setSearchInput(e.target.value)}
                    placeholder="SEARCH USERNAME..."
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl pl-12 pr-20 py-4 text-white font-bold uppercase tracking-widest focus:outline-none focus:border-zinc-600 placeholder:text-zinc-600 transition-colors"
                  />
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
                  <button 
                    type="submit" 
                    disabled={!searchInput.trim() || friendsState.loading}
                    className={`absolute right-2 top-1/2 -translate-y-1/2 bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl text-white text-[10px] font-black uppercase tracking-widest transition-colors disabled:opacity-50 border border-white/5`}
                  >
                    SEND
                  </button>
                </div>
              </form>

              {friendsState.outgoingRequests.length > 0 && (
                <div className="flex flex-col gap-2">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1 px-2 flex items-center">
                    <span className="w-1 h-1 rounded-full bg-zinc-500 mr-2"></span> Outgoing Requests
                  </h3>
                  {friendsState.outgoingRequests.map((u: string) => (
                    <div key={u} className="flex justify-between items-center bg-zinc-900/30 border border-zinc-800/30 p-3.5 rounded-2xl">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-zinc-800/50 flex items-center justify-center text-zinc-500 font-bold uppercase text-xs">
                          {u.substring(0, 1)}
                        </div>
                        <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{u}</span>
                      </div>
                      <button 
                        onClick={() => friendsState.removeFriend(u, false)}
                        disabled={friendsState.loading}
                        className="p-2 bg-red-500/5 hover:bg-red-500/15 text-zinc-500 hover:text-red-400 rounded-xl transition-colors disabled:opacity-50"
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
            <div className="flex flex-col gap-2 min-h-[200px] animate-in fade-in slide-in-from-left-4 duration-300">
              {friendsState.incomingRequests.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-zinc-600">
                  <Inbox size={48} className="mb-4 opacity-20" />
                  <span className="text-[10px] font-black uppercase tracking-widest">INBOX IS EMPTY</span>
                </div>
              ) : (
                friendsState.incomingRequests.map((u: string) => (
                  <div key={u} className="flex justify-between items-center bg-zinc-900/60 border border-zinc-800 p-4 rounded-2xl shadow-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400 font-bold uppercase">
                        {u.substring(0, 1)}
                      </div>
                      <span className="text-sm font-bold text-white uppercase tracking-wider">{u}</span>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => friendsState.acceptRequest(u)}
                        disabled={friendsState.loading}
                        className="p-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 rounded-xl transition-all disabled:opacity-50 hover:scale-105 active:scale-95"
                        title="Accept"
                      >
                        <Check size={16} />
                      </button>
                      <button 
                        onClick={() => friendsState.removeFriend(u, true)}
                        disabled={friendsState.loading}
                        className="p-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-xl transition-all disabled:opacity-50 hover:scale-105 active:scale-95"
                        title="Decline"
                      >
                        <X size={16} />
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
