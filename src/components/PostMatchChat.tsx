import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, MessageSquare, Sparkles } from 'lucide-react';
import { getSocket } from '../lib/socket';
import type { RacerState } from '../hooks/useRace';

export interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: string | number;
  color?: string;
}

interface PostMatchChatProps {
  lobbyId: string;
  username: string;
  selfId?: string;
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
  lobbyId,
  username,
  players = [],
}: PostMatchChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (chatContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 50;
      if (isNearBottom || messages.length <= 1) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }
    }
  }, [messages]);

  // Determine sender color based on player position in room
  const getSenderColor = useCallback(
    (senderName: string) => {
      let idx = players.findIndex(
        (p) => p.name?.toLowerCase() === senderName?.toLowerCase()
      );
      if (idx < 0) idx = 0;
      return PLAYER_COLORS[idx % PLAYER_COLORS.length];
    },
    [players]
  );

  // Listen to Socket.io `chat_message` events
  useEffect(() => {
    if (!lobbyId) return;
    const socket = getSocket();

    const handleChatMessage = (msgPayload: { id: string; sender: string; text: string; timestamp: string }) => {
      const colorObj = getSenderColor(msgPayload.sender);
      const newMsg: ChatMessage = {
        id: msgPayload.id || `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        sender: msgPayload.sender,
        text: msgPayload.text,
        timestamp: msgPayload.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        color: colorObj.text,
      };

      setMessages((prev) => {
        // Prevent duplicate messages
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
    };

    socket.on('chat_message', handleChatMessage);

    return () => {
      socket.off('chat_message', handleChatMessage);
    };
  }, [lobbyId, getSenderColor]);

  // Send message function via Socket.io `send_message`
  const sendMessage = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || !lobbyId) return;

      const socket = getSocket();
      if (socket.connected) {
        socket.emit('send_message', {
          roomId: lobbyId,
          message: trimmed,
          sender: username || 'Racer',
        });
      }

      setInputText('');
    },
    [lobbyId, username]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputText);
  };

  return (
    <div className="glass-panel relative w-full max-w-3xl mx-auto rounded-2xl bg-zinc-900/50 backdrop-blur-md border border-white/10 p-4 md:p-5 font-mono shadow-2xl overflow-hidden">
      {/* Subtle Glow Header Accent */}
      <div className="absolute -top-16 -right-16 w-36 h-36 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Title Header */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <MessageSquare size={14} />
          </div>
          <h3 className="text-xs font-bold text-white tracking-wider uppercase flex items-center gap-2">
            Comms Terminal
            <span className="text-[9px] px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-bold">
              SOCKET LIVE
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
            <span>Say "gg" or send a quick chat message below!</span>
          </div>
        ) : (
          messages.map((msg) => {
            const isSelf = msg.sender?.toLowerCase() === username?.toLowerCase();
            const colorObj = getSenderColor(msg.sender);

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
                    {msg.timestamp}
                  </span>
                </div>
                <p className="text-zinc-200 break-words leading-relaxed text-[11px] font-medium">
                  {msg.text}
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
            disabled={!lobbyId}
            className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-white/5 hover:bg-cyan-500/20 text-zinc-300 hover:text-cyan-300 border border-white/10 hover:border-cyan-500/40 transition-all shrink-0 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
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
          placeholder="Send a message to lobby..."
          disabled={!lobbyId}
          className="flex-1 bg-slate-950/80 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-cyan-500/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          maxLength={150}
        />
        <button
          type="submit"
          disabled={!inputText.trim() || !lobbyId}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-400 text-slate-950 font-black text-xs tracking-wider flex items-center justify-center gap-1.5 transition-all disabled:opacity-40 disabled:hover:scale-100 hover:scale-105 active:scale-100 shadow-[0_0_12px_rgba(6,182,212,0.3)]"
        >
          <Send size={13} />
          <span className="hidden sm:inline">SEND</span>
        </button>
      </form>
    </div>
  );
}
