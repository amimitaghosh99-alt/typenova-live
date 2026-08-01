import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, MessageSquare, Sparkles } from 'lucide-react';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { RacerState } from '@/hooks/useRace';

export interface ChatMessage {
  id: string;
  sender: string;
  senderId: string;
  message: string;
  timestamp: number;
  color?: string;
}

interface PostMatchChatProps {
  supabase: SupabaseClient | null;
  lobbyId: string;
  username: string;
  selfId: string;
  players?: RacerState[];
}

const PRESET_MESSAGES = ['gg', 'Rematch?', 'So close!', 'My keyboard lagged!'] as const;

const PLAYER_COLORS = [
  { text: '#22d3ee', bg: 'rgba(34, 211, 238, 0.1)', border: 'rgba(34, 211, 238, 0.3)' }, // Player 1 (Cyan)
  { text: '#f0abfc', bg: 'rgba(240, 171, 252, 0.1)', border: 'rgba(240, 171, 252, 0.3)' }, // Player 2 (Fuchsia)
  { text: '#fde047', bg: 'rgba(253, 224, 71, 0.1)', border: 'rgba(253, 224, 71, 0.3)' },  // Player 3 (Amber)
  { text: '#34d399', bg: 'rgba(52, 211, 153, 0.1)', border: 'rgba(52, 211, 153, 0.3)' },  // Player 4 (Emerald)
];

export function PostMatchChat({
  supabase,
  lobbyId,
  username,
  selfId,
  players = [],
}: PostMatchChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<ReturnType<NonNullable<SupabaseClient>['channel']> | null>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Determine sender color based on player position/index in room
  const getSenderColor = useCallback(
    (senderName: string, senderIdStr?: string) => {
      let idx = players.findIndex(
        (p) => (senderIdStr && p.id === senderIdStr) || p.name.toLowerCase() === senderName.toLowerCase()
      );
      if (idx < 0) idx = 0;
      return PLAYER_COLORS[idx % PLAYER_COLORS.length];
    },
    [players]
  );

  // Subscribe to Supabase Realtime broadcast channel
  useEffect(() => {
    if (!supabase || !lobbyId) return;

    const channelName = `post-match:${lobbyId}`;
    const channel = supabase.channel(channelName);
    channelRef.current = channel;

    channel
      .on('broadcast', { event: 'chat' }, ({ payload }: { payload: ChatMessage }) => {
        setMessages((prev) => [...prev, payload]);
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [supabase, lobbyId]);

  // Send message function
  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || !channelRef.current) return;

      const senderColorObj = getSenderColor(username, selfId);
      const msg: ChatMessage = {
        id: `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        sender: username || 'Typist',
        senderId: selfId,
        message: trimmed,
        timestamp: Date.now(),
        color: senderColorObj.text,
      };

      // Optimistically add to local state
      setMessages((prev) => [...prev, msg]);

      // Broadcast to all participants in lobby
      await channelRef.current.send({
        type: 'broadcast',
        event: 'chat',
        payload: msg,
      });

      setInputText('');
    },
    [username, selfId, getSenderColor]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputText);
  };

  return (
    <div className="glass-panel relative w-full max-w-3xl mx-auto rounded-2xl bg-zinc-900/50 backdrop-blur-md border border-white/10 p-4 md:p-5 font-mono shadow-2xl overflow-hidden lucid-scale">
      {/* Subtle Glow Header Accent */}
      <div className="absolute -top-16 -right-16 w-36 h-36 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Title Header */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <MessageSquare size={14} />
          </div>
          <h3 className="text-xs font-bold text-white tracking-wider uppercase flex items-center gap-2">
            Post-Match Chat
            <span className="text-[9px] px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-bold">
              LIVE BROADCAST
            </span>
          </h3>
        </div>
        <span className="text-[10px] text-zinc-500 font-bold">Lobby: {lobbyId}</span>
      </div>

      {/* Messages Scroll Area */}
      <div
        ref={chatContainerRef}
        className="h-40 overflow-y-auto pr-2 custom-scrollbar flex flex-col gap-2 mb-3 scroll-smooth"
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-zinc-500 text-xs font-bold gap-1 py-6 opacity-60">
            <Sparkles size={18} className="text-zinc-600 mb-1 animate-pulse" />
            <span>Say "gg" or send a quick chat below!</span>
          </div>
        ) : (
          messages.map((msg) => {
            const isSelf = msg.senderId === selfId || msg.sender.toLowerCase() === username.toLowerCase();
            const colorObj = getSenderColor(msg.sender, msg.senderId);

            return (
              <div
                key={msg.id}
                className={`flex flex-col max-w-[85%] rounded-xl px-3 py-2 text-xs transition-all animate-in fade-in duration-200 ${
                  isSelf ? 'self-end bg-slate-900/80 border border-white/15' : 'self-start bg-slate-950/70 border border-white/10'
                }`}
              >
                <div className="flex items-center justify-between gap-3 mb-0.5">
                  <span
                    className="font-extrabold text-[11px] tracking-wide"
                    style={{ color: colorObj.text }}
                  >
                    {msg.sender} {isSelf && <span className="text-[9px] text-zinc-400 font-normal">(YOU)</span>}
                  </span>
                  <span className="text-[9px] text-zinc-500">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
                <p className="text-zinc-200 break-words leading-relaxed text-[11px] font-medium">
                  {msg.message}
                </p>
              </div>
            );
          })
        )}
      </div>

      {/* Quick Chat Presets Pill Row */}
      <div className="flex items-center gap-1.5 mb-2.5 overflow-x-auto custom-scrollbar pb-1">
        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider shrink-0 mr-1">
          Quick:
        </span>
        {PRESET_MESSAGES.map((preset) => (
          <button
            key={preset}
            onClick={() => sendMessage(preset)}
            className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-white/5 hover:bg-cyan-500/20 text-zinc-300 hover:text-cyan-300 border border-white/10 hover:border-cyan-500/40 transition-all shrink-0 active:scale-95"
          >
            {preset}
          </button>
        ))}
      </div>

      {/* Text Input Form */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Send a post-match message..."
          className="flex-1 bg-slate-950/80 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-cyan-500/50 transition-colors"
          maxLength={150}
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-400 text-slate-950 font-black text-xs tracking-wider flex items-center justify-center gap-1.5 transition-all disabled:opacity-40 disabled:hover:scale-100 hover:scale-105 active:scale-100 shadow-[0_0_12px_rgba(6,182,212,0.3)]"
        >
          <Send size={13} />
          <span className="hidden sm:inline">SEND</span>
        </button>
      </form>
    </div>
  );
}
