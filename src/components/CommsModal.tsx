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
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-300 p-8">
      
      {/* Outer HUD Container */}
      <div className="relative w-full max-w-5xl h-[85vh] lucid-scale">
        <div className="hud-panel-border" />
        <div className="hud-panel w-full h-full flex overflow-hidden">
          
          {/* Left Panel - Friends Roster */}
          <div className="w-[320px] shrink-0 border-r border-cyan-500/20 bg-cyan-950/20 flex flex-col relative z-10 shadow-[20px_0_30px_-10px_rgba(0,0,0,0.5)]">
            <div className="px-6 py-5 border-b border-cyan-500/20 flex items-center gap-3">
              <MessageSquare size={16} className="text-cyan-400" />
              <h2 className="text-cyan-50 font-black tracking-widest uppercase text-sm drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]">
                Communications
              </h2>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar flex flex-col gap-3">
              {friends.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-cyan-600/50 text-xs font-bold tracking-wider uppercase gap-3">
                  <Sparkles size={20} className="opacity-40" />
                  <span>No Comms Links</span>
                </div>
              ) : (
                friends.map(friend => {
                  const isActive = friend.id === activeFriendId;
                  
                  return (
                    <button
                      key={friend.id}
                      onClick={() => setActiveFriendId(friend.id)}
                      className={`relative flex items-center justify-between w-full p-3 cursor-pointer transition-all text-left ${
                        isActive ? 'hud-tab-active' : 'hud-tab-inactive hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-4 overflow-hidden">
                        
                        {/* Avatar */}
                        <div className={`relative w-11 h-11 rounded-full flex flex-shrink-0 items-center justify-center font-black text-lg uppercase transition-all ${
                          isActive 
                            ? 'bg-transparent border-2 border-cyan-400 text-cyan-100 shadow-[0_0_15px_rgba(34,211,238,0.4)]' 
                            : 'bg-black/60 border border-cyan-900 text-cyan-100/50'
                        }`}>
                          {friend.username.charAt(0)}
                          
                          {/* Inner glowing ring for active state */}
                          {isActive && <div className="absolute inset-1 rounded-full border border-cyan-400/50 shadow-[inset_0_0_10px_rgba(34,211,238,0.5)]" />}
                          
                          {/* Status Dot */}
                          <div className={`absolute top-0 right-0 w-2.5 h-2.5 rounded-full border border-black transition-colors ${
                            friend.isOnline ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,1)]' : 'bg-cyan-800'
                          }`} />
                        </div>
                        
                        <div className="flex flex-col min-w-0">
                          <span className={`font-black text-sm tracking-widest uppercase truncate transition-colors ${
                            isActive ? 'text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]' : 'text-cyan-100/60'
                          }`}>{friend.username}</span>
                        </div>
                      </div>
                      
                      {unreadCounts[friend.id] > 0 && (
                        <span className="flex-shrink-0 flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.8)] text-cyan-950 text-[10px] font-black rounded-full ml-2">
                          {unreadCounts[friend.id]}
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
  
          {/* Right Panel - Chat Feed */}
          <div className="flex-1 flex flex-col relative bg-transparent z-10">
            
            {/* Close Button overlay */}
            <div className="absolute top-4 right-4 z-50">
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center bg-cyan-950/60 border border-cyan-500/30 rounded-full text-cyan-400 hover:bg-cyan-400 hover:text-cyan-950 hover:shadow-[0_0_15px_rgba(34,211,238,0.6)] transition-all"
              >
                <X size={16} strokeWidth={3} />
              </button>
            </div>
  
            {!activeFriendId ? (
              <div className="flex-1 flex flex-col items-center justify-center text-cyan-600/30 gap-4">
                <MessageSquare size={64} className="opacity-20" />
                <span className="text-xs text-cyan-500/40 font-black tracking-widest uppercase shadow-sm">Select a comms link to begin</span>
              </div>
            ) : (
              <>
                {/* Chat Header */}
                <div className="px-8 py-5 flex items-center gap-3 border-b border-cyan-500/20 bg-cyan-950/40">
                  <div className={`w-2 h-2 rounded-full ${activeFriend?.isOnline ? 'bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,1)]' : 'bg-cyan-800'}`} />
                  <h3 className="text-xl font-black tracking-widest uppercase text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">
                    {activeFriend?.username}
                  </h3>
                </div>
  
                {/* Chat Feed */}
                <div className="flex-1 relative overflow-hidden">
                  
                  {/* Faint background text */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                    <span className="text-[10px] text-cyan-500/10 font-black tracking-[0.2em] uppercase">
                      Establish Comms Link With {activeFriend?.username}
                    </span>
                  </div>

                  <div ref={chatContainerRef} className="absolute inset-0 overflow-y-auto p-8 flex flex-col gap-6 custom-scrollbar z-10">
                    {activeMessages.length === 0 ? null : (
                      activeMessages.map(msg => {
                        const isSelf = msg.sender_id === userId;
                        const timeString = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                        return (
                          <div key={msg.id} className={`flex w-full gap-4 ${isSelf ? 'justify-end' : 'justify-start'}`}>
                            
                            {/* Avatar for received messages */}
                            {!isSelf && (
                              <div className="flex-shrink-0 w-8 h-8 rounded-full border border-cyan-500/50 flex items-center justify-center font-black text-xs text-cyan-200 bg-cyan-950 shadow-[0_0_10px_rgba(34,211,238,0.2)] mt-1">
                                {activeFriend?.username.charAt(0)}
                              </div>
                            )}

                            <div className={`flex flex-col max-w-[70%] ${isSelf ? 'items-end' : 'items-start'}`}>
                              <div className={`px-5 py-3 text-[13px] font-medium leading-relaxed break-words shadow-lg ${
                                isSelf ? 'hud-bubble-self text-cyan-50' : 'hud-bubble-other text-cyan-100/90'
                              }`}>
                                {isSelf && <div className="hud-bubble-self-border" />}
                                {!isSelf && <div className="hud-bubble-other-border" />}
                                <span className="relative z-10">{msg.content}</span>
                              </div>
                              
                              <span className="text-[9px] font-black tracking-widest mt-1.5 text-cyan-500/60 uppercase">
                                {timeString} {isSelf && (msg.read ? '✔✔' : '✔')}
                              </span>
                            </div>

                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
  
                {/* Input Area */}
                <div className="p-6 pb-8 border-t border-cyan-500/20 bg-cyan-950/20 z-20 flex justify-center">
                  
                  <div className="relative w-full max-w-3xl flex items-center gap-3">
                    <form onSubmit={handleSend} className="flex-1 hud-input-wrapper flex items-center">
                      <div className="hud-input-wrapper-border" />
                      <input
                        type="text"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder="Transmit message..."
                        className="w-full bg-transparent text-cyan-100 placeholder:text-cyan-700 font-medium text-sm px-6 py-4 focus:outline-none relative z-10"
                      />
                    </form>
                    
                    <button
                      type="submit"
                      disabled={!inputText.trim()}
                      onClick={handleSend}
                      className="flex-shrink-0 w-12 h-12 rounded-full border border-cyan-400 bg-cyan-950/50 text-cyan-400 flex items-center justify-center hover:bg-cyan-400 hover:text-cyan-950 hover:shadow-[0_0_20px_rgba(34,211,238,0.8)] transition-all disabled:opacity-30 disabled:hover:bg-cyan-950/50 disabled:hover:text-cyan-400 disabled:hover:shadow-none disabled:cursor-not-allowed shadow-[0_0_10px_rgba(34,211,238,0.3)] group"
                    >
                      <Send size={18} className="transform translate-x-[1px] -translate-y-[1px] group-hover:scale-110 transition-transform" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
