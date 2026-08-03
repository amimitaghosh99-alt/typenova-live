import { useState, useRef, useEffect, useMemo } from 'react';
import { X, Send, Sparkles, MessageSquare } from 'lucide-react';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { FriendData } from '@/hooks/useFriends';
import { useMessages } from '@/hooks/useMessages';

interface CommsModalProps {
  supabase: SupabaseClient | null;
  userId?: string;
  friends: FriendData[];
  onClose: () => void;
}

export function CommsModal({ supabase, userId, friends, onClose }: CommsModalProps) {
  const [activeFriendId, setActiveFriendId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const { messages, unreadCounts, sendMessage, markAsRead } = useMessages({ supabase, userId });

  // Auto-scroll chat
  useEffect(() => {
    if (chatContainerRef.current && activeFriendId) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, activeFriendId]);

  // Mark as read when opening a chat or when new messages arrive while open
  useEffect(() => {
    if (activeFriendId && unreadCounts[activeFriendId] > 0) {
      markAsRead(activeFriendId);
    }
  }, [activeFriendId, messages, unreadCounts, markAsRead]);

  if (!supabase || !userId) return null;

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeFriendId) return;
    sendMessage(activeFriendId, inputText);
    setInputText('');
  };

  const activeFriend = friends.find(f => f.id === activeFriendId);
  const activeMessages = useMemo(() => {
    if (!activeFriendId) return [];
    return messages.filter(
      m => (m.sender_id === userId && m.receiver_id === activeFriendId) ||
           (m.sender_id === activeFriendId && m.receiver_id === userId)
    );
  }, [messages, userId, activeFriendId]);

  const lastMessagesByFriend = useMemo(() => {
    const map: Record<string, string> = {};
    messages.forEach(m => {
      const friendId = m.sender_id === userId ? m.receiver_id : m.sender_id;
      map[friendId] = m.content;
    });
    return map;
  }, [messages, userId]);

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-300 p-4">
      {/* Modal Container */}
      <div className="w-full max-w-5xl h-[80vh] bg-slate-950/80 backdrop-blur-xl border border-cyan-500/30 rounded-3xl shadow-[0_0_50px_rgba(34,211,238,0.15)] flex overflow-hidden lucid-scale">
        
        {/* Left Panel - Friends Roster */}
        <div className="w-1/3 border-r border-cyan-500/20 bg-black/40 flex flex-col">
          <div className="px-6 py-5 border-b border-cyan-500/20 flex items-center justify-between bg-cyan-950/20">
            <h2 className="text-cyan-400 font-black tracking-widest uppercase text-sm flex items-center gap-2 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]">
              <MessageSquare size={16} />
              Communications
            </h2>
          </div>
          
          <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
            {friends.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-cyan-600/50 text-xs font-bold tracking-wider uppercase gap-3">
                <Sparkles size={20} className="opacity-40" />
                <span>No Comms Links</span>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {friends.map(friend => {
                  const lastMessage = lastMessagesByFriend[friend.id] || null;
                  const isActive = friend.id === activeFriendId;
                  
                  return (
                    <button
                      key={friend.id}
                      onClick={() => setActiveFriendId(friend.id)}
                      className={`flex items-center justify-between w-full p-4 cursor-pointer transition-all group text-left rounded-r-xl ${
                        isActive 
                          ? 'bg-gradient-to-r from-cyan-500/20 to-transparent border-l-2 border-cyan-400 shadow-[inset_0_0_20px_rgba(34,211,238,0.1)]' 
                          : 'hover:bg-white/5 border-l-2 border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-4 overflow-hidden">
                        <div className={`relative w-12 h-12 rounded-full flex flex-shrink-0 items-center justify-center font-black text-lg uppercase transition-all ${
                          isActive 
                            ? 'bg-cyan-950/80 border border-cyan-400 text-cyan-100 shadow-[0_0_15px_rgba(34,211,238,0.4)]' 
                            : 'bg-black/60 border border-zinc-700 text-white/80 group-hover:border-cyan-500/40'
                        }`}>
                          {friend.username.charAt(0)}
                          <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-slate-900 transition-colors ${
                            friend.isOnline ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-zinc-600'
                          }`} />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className={`font-black text-sm tracking-widest uppercase truncate transition-colors ${
                            isActive ? 'text-cyan-100 drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]' : 'text-zinc-300 group-hover:text-white'
                          }`}>{friend.username}</span>
                          {lastMessage && (
                            <span className={`text-[11px] font-medium truncate mt-1 ${isActive ? 'text-cyan-400/80' : 'text-zinc-500'}`}>{lastMessage}</span>
                          )}
                        </div>
                      </div>
                      {unreadCounts[friend.id] > 0 && (
                        <span className="flex-shrink-0 flex items-center justify-center min-w-[24px] h-6 px-2 bg-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.8)] text-white text-[11px] font-black rounded-full ml-2">
                          {unreadCounts[friend.id]}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Chat Feed */}
        <div className="w-2/3 flex flex-col relative bg-transparent">
          <div className="absolute top-5 right-5 z-10">
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-black/20 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 transition-colors border border-transparent hover:border-red-500/30"
            >
              <X size={20} />
            </button>
          </div>

          {!activeFriendId ? (
            <div className="flex-1 flex flex-col items-center justify-center text-cyan-600/30 gap-4">
              <MessageSquare size={48} className="opacity-50" />
              <span className="font-black tracking-widest uppercase text-sm">Select a comms link to begin</span>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="px-8 py-6 border-b border-cyan-500/20 bg-cyan-950/10 shadow-[0_4px_20px_-4px_rgba(34,211,238,0.05)]">
                <h3 className="text-2xl font-black tracking-widest uppercase text-white flex items-center gap-3 drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]">
                  <div className={`w-3 h-3 rounded-full ${activeFriend?.isOnline ? 'bg-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.8)]' : 'bg-zinc-600'}`} />
                  {activeFriend?.username}
                </h3>
              </div>

              {/* Chat Feed */}
              <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-8 flex flex-col gap-6 custom-scrollbar bg-black/20">
                {activeMessages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center gap-4">
                    <span className="text-5xl animate-pulse">👋</span>
                    <span className="text-sm font-black tracking-widest uppercase text-cyan-500/60 drop-shadow-[0_0_8px_rgba(34,211,238,0.2)]">Establish comms link with {activeFriend?.username}</span>
                  </div>
                ) : (
                  activeMessages.map(msg => {
                    const isSelf = msg.sender_id === userId;
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col max-w-[75%] px-5 py-4 text-[14px] shadow-sm font-medium ${
                          isSelf 
                            ? 'self-end bg-cyan-950/40 border border-cyan-500/40 text-cyan-50 rounded-2xl rounded-tr-sm shadow-[0_0_15px_rgba(34,211,238,0.08)]' 
                            : 'self-start bg-black/60 border border-zinc-700/60 text-zinc-300 rounded-2xl rounded-tl-sm'
                        }`}
                      >
                        <p className="leading-relaxed break-words">{msg.content}</p>
                        <span className={`text-[10px] font-black tracking-wider mt-2 self-end uppercase ${isSelf ? 'text-cyan-400 opacity-80' : 'text-zinc-500'}`}>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Input Area */}
              <form onSubmit={handleSend} className="p-6 bg-black/40 border-t border-cyan-500/20 flex gap-4 backdrop-blur-md">
                <div className="flex-1 relative">
                  {/* Futuristic HUD brackets for input */}
                  <div className="absolute left-0 top-0 bottom-0 w-2 border-l-2 border-y-2 border-cyan-500/30 rounded-l-lg pointer-events-none"></div>
                  <div className="absolute right-0 top-0 bottom-0 w-2 border-r-2 border-y-2 border-cyan-500/30 rounded-r-lg pointer-events-none"></div>
                  
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Transmit message..."
                    className="w-full h-full bg-cyan-950/10 border border-cyan-500/20 rounded-lg px-6 py-4 text-sm font-medium text-cyan-100 placeholder:text-cyan-800/60 focus:outline-none focus:border-cyan-400 focus:bg-cyan-950/30 focus:shadow-[0_0_20px_rgba(34,211,238,0.15)] transition-all"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!inputText.trim()}
                  className="w-14 h-14 shrink-0 rounded-lg bg-cyan-950/50 text-cyan-400 flex items-center justify-center hover:bg-cyan-900/80 hover:scale-105 transition-all disabled:opacity-40 disabled:hover:scale-100 disabled:cursor-not-allowed border border-cyan-500/40 hover:border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.15)]"
                >
                  <Send size={20} className="-ml-1" />
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
