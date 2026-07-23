import { useState } from 'react';
import { X, Users, UserPlus, Inbox, Search, Check } from 'lucide-react';
import type { Theme } from '@/data/constants';
import type { ReturnType } from 'ts-toolbelt/out/Function/ReturnType';
import type { useFriends } from '@/hooks/useFriends';

interface SocialModalProps {
  theme: Theme;
  onClose: () => void;
  friendsState: ReturnType<typeof useFriends>;
}

export const SocialModal = ({ theme, onClose, friendsState }: SocialModalProps) => {
  const [tab, setTab] = useState<'add' | 'inbox'>('add');
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
      <div className="bg-zinc-950 border border-zinc-800 rounded-[2.5rem] p-8 md:p-10 w-full max-w-lg shadow-2xl lucid-scale" style={{ '--delay': '0ms' } as React.CSSProperties} onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6 border-b border-zinc-800 pb-4">
          <h2 className="text-2xl font-black text-white uppercase tracking-widest flex items-center">
            <Users className="mr-3" style={accent} size={24} /> Social
          </h2>
          <button onClick={onClose} className="p-3 bg-zinc-900 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {friendsState.error && (
          <div className="mb-6 px-4 py-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-black tracking-widest text-center">
            {friendsState.error.toUpperCase()}
          </div>
        )}

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setTab('add')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
              tab === 'add' ? `bg-white/10 text-white ${theme.borderHalf}` : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300 border border-transparent'
            } border`}
          >
            <UserPlus size={14} /> Add Friend
          </button>
          <button
            onClick={() => setTab('inbox')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
              tab === 'inbox' ? `bg-white/10 text-white ${theme.borderHalf}` : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300 border border-transparent'
            } border`}
          >
            <Inbox size={14} /> Inbox {friendsState.incomingRequests.length > 0 && <span className="bg-white/20 px-2 py-0.5 rounded-full text-white">{friendsState.incomingRequests.length}</span>}
          </button>
        </div>

        {tab === 'add' ? (
          <div className="flex flex-col gap-4 min-h-[200px]">
            <form onSubmit={handleSearch} className="relative">
              <input
                type="text"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                placeholder="SEARCH USERNAME..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl pl-12 pr-5 py-4 text-white font-bold uppercase tracking-widest focus:outline-none focus:border-zinc-600 placeholder:text-zinc-600"
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
              <button 
                type="submit" 
                disabled={!searchInput.trim() || friendsState.loading}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/15 px-4 py-2 rounded-xl text-white text-[10px] font-black uppercase tracking-widest transition-colors disabled:opacity-50"
              >
                Send
              </button>
            </form>

            <div className="mt-4">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-3 px-2">Outgoing Requests</h3>
              {friendsState.outgoingRequests.length === 0 ? (
                <div className="text-zinc-700 text-xs font-bold uppercase tracking-widest text-center py-8">
                  NO PENDING REQUESTS
                </div>
              ) : (
                <div className="flex flex-col gap-2 max-h-[150px] overflow-y-auto pr-2">
                  {friendsState.outgoingRequests.map(u => (
                    <div key={u} className="flex justify-between items-center bg-zinc-900/50 border border-zinc-800/50 p-3 rounded-2xl">
                      <span className="text-sm font-bold text-zinc-300 ml-2">{u}</span>
                      <button 
                        onClick={() => friendsState.removeFriend(u, false)}
                        disabled={friendsState.loading}
                        className="p-2 hover:bg-red-500/20 text-zinc-500 hover:text-red-400 rounded-xl transition-colors disabled:opacity-50"
                        title="Cancel Request"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2 min-h-[200px] max-h-[300px] overflow-y-auto pr-2">
            {friendsState.incomingRequests.length === 0 ? (
              <div className="text-zinc-700 text-xs font-bold uppercase tracking-widest text-center py-16">
                YOUR INBOX IS EMPTY
              </div>
            ) : (
              friendsState.incomingRequests.map(u => (
                <div key={u} className="flex justify-between items-center bg-zinc-900 border border-zinc-800 p-4 rounded-2xl">
                  <span className="text-sm font-bold text-white ml-2">{u}</span>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => friendsState.acceptRequest(u)}
                      disabled={friendsState.loading}
                      className="p-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-xl transition-colors disabled:opacity-50"
                      title="Accept"
                    >
                      <Check size={16} />
                    </button>
                    <button 
                      onClick={() => friendsState.removeFriend(u, true)}
                      disabled={friendsState.loading}
                      className="p-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl transition-colors disabled:opacity-50"
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
  );
};
