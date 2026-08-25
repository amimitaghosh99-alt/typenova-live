import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Copy, Link, Check, UserPlus, Play, LogOut, Settings, Crown, 
  Radio, MessageSquare, Send, Sparkles, LogIn, X, ClipboardPaste, KeyRound
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { RacerState, RaceConfig, ChatMessage } from '@/hooks/useRace';
import { SegmentedControl } from '@/components/SegmentedControl';
import type { Level, CodeLanguage, Theme } from '@/data/constants';
import { toast } from 'sonner';

interface LobbyScreenProps {
  code: string;
  players: RacerState[];
  roomSize: number;
  selfId: string;
  isHost: boolean;
  lobbyConfig?: RaceConfig;
  updateLobbyConfig?: (config: Partial<RaceConfig>) => void;
  updateRoomSize?: (size: number) => void;
  chatMessages?: ChatMessage[];
  sendChatMessage?: (text: string, senderName: string) => void;
  onStart: () => void;
  onLeave: () => void;
  onJoinRoom?: (code: string) => void;
  theme?: Theme;
  themeTextClass?: string;
  isJoining?: boolean;
}

const QUICK_EMOJIS = [
  { icon: '🚀', label: 'Rocket' },
  { icon: '⚡', label: 'Lightning' },
  { icon: '🔥', label: 'Fire' },
  { icon: '🏆', label: 'Trophy' },
  { icon: '👑', label: 'Crown' },
  { icon: '💀', label: 'Skull' },
  { icon: '🎯', label: 'Target' },
  { icon: '✨', label: 'Sparkles' },
];

const QUICK_PHRASES = ['GLHF', 'Ready!', "Let's Go!", 'One More', 'Pick Code!', 'GG'];

export const LobbyScreen: React.FC<LobbyScreenProps> = ({
  code,
  players,
  roomSize,
  selfId,
  isHost,
  lobbyConfig,
  updateLobbyConfig,
  updateRoomSize,
  chatMessages = [],
  sendChatMessage,
  onStart,
  onLeave,
  onJoinRoom,
  theme,
  themeTextClass = 'text-cyan-400',
  isJoining = false
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinInputCode, setJoinInputCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const joinInputRef = useRef<HTMLInputElement>(null);

  const me = players.find(p => p.id === selfId);
  const myName = me?.name || 'Racer';

  // Auto-scroll chat to bottom on new message
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const extractRoomCode = (raw: string): string => {
    let text = raw.trim().toUpperCase();
    try {
      if (text.includes('?')) {
        const url = new URL(text.startsWith('http') ? text : `https://dummy.com/${text}`);
        const param = url.searchParams.get('room') || url.searchParams.get('race');
        if (param) return param.trim().toUpperCase().slice(0, 6);
      }
    } catch {
      // fallback
    }
    const match = text.match(/[A-Z0-9]{6}/);
    if (match) return match[0];
    return text.replace(/[^A-Z0-9]/g, '').slice(0, 6);
  };

  const handleOpenJoinModal = () => {
    setJoinInputCode('');
    setJoinError('');
    setShowJoinModal(true);
  };

  useEffect(() => {
    if (showJoinModal) {
      const timer = setTimeout(() => {
        joinInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [showJoinModal]);

  const handlePasteCode = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const parsed = extractRoomCode(text);
      if (parsed) {
        setJoinInputCode(parsed);
        setJoinError('');
        toast.info(`Pasted code: ${parsed}`);
      } else {
        toast.error('No valid 6-character room code found in clipboard');
      }
    } catch {
      toast.error('Failed to read from clipboard. Please paste manually.');
    }
  };

  const handleJoinSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = extractRoomCode(joinInputCode);
    if (clean.length !== 6) {
      setJoinError('Please enter a valid 6-character room code');
      return;
    }
    if (clean === code.toUpperCase()) {
      setJoinError('You are already in this room');
      return;
    }
    if (onJoinRoom) {
      onJoinRoom(clean);
      setShowJoinModal(false);
      toast.success(`Connecting to room ${clean}...`);
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    toast.success('Room code copied to clipboard!');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const copyLink = () => {
    const url = `${window.location.origin}${window.location.pathname}?room=${code}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    toast.success('Invite link copied! Share with friends to race up to 4 players.');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleSendCustomChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !sendChatMessage) return;
    sendChatMessage(chatInput.trim(), myName);
    setChatInput('');
  };

  const handleSendReaction = (text: string) => {
    if (!sendChatMessage) return;
    sendChatMessage(text, myName);
  };

  return (
    <div className="w-full max-w-[1600px] mx-auto relative select-none pb-2 animate-in fade-in duration-300 flex flex-col gap-4">
      
      {isJoining && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md rounded-3xl">
          <div className="w-14 h-14 border-4 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin mb-4 shadow-[0_0_25px_rgba(6,182,212,0.5)]" />
          <p className="text-cyan-400 font-mono font-bold tracking-widest text-xs uppercase animate-pulse">Establishing quantum telemetry link...</p>
        </div>
      )}

      {/* ── 1. Top Match Command Header ── */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 350, damping: 25 }}
        className="w-full flex flex-wrap items-center justify-between gap-3"
      >
        {/* Live Telemetry Beacon */}
        <div className="flex items-center gap-3 px-4 py-2 rounded-full glass-panel border border-white/15 text-zinc-300 text-xs font-mono font-bold tracking-wider shadow-sm bg-black/40">
          <Radio size={14} className="text-emerald-400 animate-pulse" />
          <span className="uppercase font-black text-white">LIVE MULTIPLAYER ARENA</span>
          <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
          <span className="text-zinc-400 font-bold">{players.length} / {roomSize} RACERS</span>
        </div>

        {/* Room Code Capsule */}
        <div className="glass-panel px-6 py-1.5 rounded-full border border-white/20 flex items-center gap-4 sm:gap-5 shadow-[0_8px_30px_rgba(0,0,0,0.4)] bg-black/50 flex-wrap sm:flex-nowrap justify-center">
          <div className="flex items-center gap-2.5">
            <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 font-bold">ROOM CODE:</span>
            <span 
              className="font-mono text-2xl font-black tracking-[0.2em] text-white select-all"
              style={{
                textShadow: theme ? `0 0 20px rgba(${theme.glowPrimary}, 0.7)` : '0 0 16px rgba(6,182,212,0.6)'
              }}
            >
              {code}
            </span>
          </div>

          <div className="h-5 w-px bg-white/15 hidden sm:block" />

          <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap">
            <button
              onClick={copyCode}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-zinc-200 hover:text-white transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 text-xs font-mono font-bold"
              title="Copy Room Code"
            >
              {copiedCode ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              <span>{copiedCode ? 'COPIED' : 'COPY'}</span>
            </button>
            <button
              onClick={copyLink}
              className="px-3 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 hover:text-cyan-100 transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 text-xs font-mono font-bold"
              title="Copy Direct Invite Link"
            >
              {copiedLink ? <Check size={14} className="text-emerald-400" /> : <Link size={14} />}
              <span>{copiedLink ? 'LINK COPIED' : 'INVITE'}</span>
            </button>
            <button
              onClick={handleOpenJoinModal}
              className="px-3.5 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-200 hover:text-white transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 text-xs font-mono font-bold shadow-[0_0_15px_rgba(168,85,247,0.25)]"
              title="Enter code to join another room"
            >
              <LogIn size={14} className="text-purple-300" />
              <span>JOIN ROOM</span>
            </button>
          </div>
        </div>

        {/* Match Preset Chip */}
        <div className="flex items-center gap-2 px-4 py-2 rounded-full glass-panel border border-white/15 text-xs font-mono font-bold text-zinc-300 bg-black/40">
          <Sparkles size={13} className={theme ? theme.text : 'text-cyan-400'} />
          <span className="text-zinc-400">MODE:</span>
          <span className="text-white font-black">{lobbyConfig?.mode || 'ADEPT'} ({lobbyConfig?.words || 25}W)</span>
        </div>
      </motion.div>

      {/* ── 2. MAIN WIDESCREEN COCKPIT: TALL LEFT COMMS TERMINAL & RIGHT ARENA STAGE ── */}
      <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        
        {/* ════ LEFT COLUMN: EXPANDED TALL NEURAL COMMS TERMINAL (col-span-4) ════ */}
        <motion.div
          initial={{ opacity: 0, x: -20, scale: 0.985 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{ duration: 0.38, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-4 w-full glass-panel rounded-3xl p-4 border border-white/15 flex flex-col justify-between gap-3 shadow-[0_12px_40px_rgba(0,0,0,0.4)] min-h-[520px] lg:h-[550px] bg-black/35"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
            <div className="flex items-center gap-2 text-white font-mono text-xs font-black tracking-widest uppercase">
              <div className="p-1.5 rounded-lg bg-purple-500/20 text-purple-400 border border-purple-500/30">
                <MessageSquare size={14} />
              </div>
              <span>NEURAL COMMS HUB</span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/35 text-purple-300 font-mono text-[9px] font-black tracking-widest uppercase flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
              LIVE STREAM
            </span>
          </div>

          {/* Tall Scrollable Message Feed */}
          <div 
            ref={chatScrollRef}
            className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-2 p-3 rounded-2xl bg-black/50 border border-white/10 text-xs font-mono min-h-[240px]"
          >
            {/* Intel Welcome Card */}
            <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-center flex flex-col gap-1 mb-1">
              <div className="flex items-center justify-center gap-1.5 text-[9px] font-mono font-black text-cyan-400 uppercase tracking-widest">
                <Radio size={11} className="animate-pulse" />
                <span>TELEMETRY LINK SYNCHRONIZED</span>
              </div>
              <p className="text-[10px] text-zinc-400 font-medium">
                Room <span className="text-white font-bold">{code}</span> configured for <span className="text-white font-bold">{lobbyConfig?.mode || 'ADEPT'} ({lobbyConfig?.words || 25} Words)</span>.
              </p>
            </div>

            {chatMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center my-auto text-center gap-1.5 opacity-70">
                <div className="w-9 h-9 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400">
                  <MessageSquare size={16} />
                </div>
                <p className="text-zinc-300 font-bold uppercase tracking-wider text-[10px]">
                  COMMUNICATION LINK READY
                </p>
                <p className="text-zinc-500 text-[9px]">
                  Send a quick callout or reaction while racers ready up!
                </p>
              </div>
            ) : (
              chatMessages.map(msg => {
                const isSenderMe = msg.sender === myName;
                const senderPlayer = players.find(p => p.name === msg.sender);
                const isPlayerHost = players[0]?.name === msg.sender;

                return (
                  <div key={msg.id} className={`flex flex-col ${isSenderMe ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-1 duration-200`}>
                    <div className="flex items-center gap-1.5 text-[9px] text-zinc-400 mb-0.5 px-1">
                      {isPlayerHost && (
                        <Crown size={9} className="text-amber-400 inline" />
                      )}
                      <span className={`font-black ${isSenderMe ? 'text-cyan-400' : 'text-zinc-200'}`}>
                        {msg.sender}
                      </span>
                      {senderPlayer?.elo && (
                        <span className="text-zinc-500 text-[8px]">({senderPlayer.elo})</span>
                      )}
                      <span className="text-zinc-500 text-[8px]">• {msg.timestamp}</span>
                    </div>
                    <div className={`px-3.5 py-1.5 rounded-2xl max-w-[90%] break-words leading-relaxed text-xs font-medium shadow-md ${
                      isSenderMe 
                        ? 'bg-cyan-500/25 text-cyan-100 border border-cyan-500/40 rounded-tr-sm' 
                        : 'bg-white/15 text-zinc-100 border border-white/15 rounded-tl-sm'
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Quick Reaction & Macro Station */}
          <div className="flex flex-col gap-2 pt-1 border-t border-white/10">
            {/* Emojis Strip */}
            <div className="flex items-center justify-between gap-1 overflow-x-auto custom-scrollbar pb-0.5">
              {QUICK_EMOJIS.map(item => (
                <button
                  key={item.label}
                  onClick={() => handleSendReaction(item.icon)}
                  className="p-1 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-sm transition-all hover:scale-120 active:scale-95 cursor-pointer shrink-0"
                  title={`Send ${item.label}`}
                >
                  {item.icon}
                </button>
              ))}
            </div>

            {/* Phrase Pills */}
            <div className="flex flex-wrap gap-1">
              {QUICK_PHRASES.map(phrase => (
                <button
                  key={phrase}
                  onClick={() => handleSendReaction(phrase)}
                  className="px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/20 border border-white/15 text-[10px] font-mono font-bold text-zinc-200 hover:text-white transition-all active:scale-95 cursor-pointer shadow-sm"
                >
                  {phrase}
                </button>
              ))}
            </div>

            {/* Input Form */}
            <form onSubmit={handleSendCustomChat} className="flex items-center gap-2 mt-0.5">
              <input 
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Broadcast message to room..."
                maxLength={80}
                className="flex-1 px-3.5 py-2 rounded-xl bg-black/40 border border-white/15 text-white font-mono text-xs focus:outline-none focus:border-cyan-400 transition-colors placeholder:text-zinc-500"
              />
              <button
                type="submit"
                disabled={!chatInput.trim()}
                className="p-2 rounded-xl bg-cyan-500/25 hover:bg-cyan-500/40 disabled:opacity-30 text-cyan-200 border border-cyan-500/40 cursor-pointer transition-all active:scale-95 shadow-sm"
                title="Send Message"
              >
                <Send size={14} />
              </button>
            </form>
          </div>
        </motion.div>

        {/* ════ RIGHT COLUMN: 4 PODIUMS, 3-COLUMN CONFIG & LAUNCH (col-span-8) ════ */}
        <div className="lg:col-span-8 w-full flex flex-col justify-between gap-3.5 lg:h-[550px]">
          
          {/* Starting Grid Section */}
          <div className="w-full flex flex-col gap-2">
            {/* 4 Podiums Across in 4 Columns */}
            <div className={`w-full grid gap-3.5 ${
              roomSize === 2 
                ? 'grid-cols-2' 
                : roomSize === 3 
                ? 'grid-cols-3' 
                : 'grid-cols-2 sm:grid-cols-4'
            }`}>
              <AnimatePresence mode="popLayout">
                {/* Active Racer Podium Pods */}
                {players.map((p, idx) => {
                  const isMe = p.id === selfId;
                  const isPlayerHost = idx === 0;

                  return (
                    <motion.div
                      key={p.id}
                      layout
                      initial={{ opacity: 0, scale: 0.9, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      whileHover={{ y: -4, scale: 1.015 }}
                      transition={{ 
                        type: "spring",
                        stiffness: 280,
                        damping: 24,
                        delay: idx * 0.04
                      }}
                      className={`glass-panel rounded-3xl p-3.5 flex flex-col items-center justify-between min-h-[160px] border transition-all duration-300 relative overflow-hidden text-center group bg-black/40 ${
                        isMe
                          ? 'border-white/40 shadow-[0_12px_36px_rgba(0,0,0,0.6),inset_0_0_25px_rgba(255,255,255,0.08)]'
                          : 'border-white/15 hover:border-white/25'
                      }`}
                    >
                      {/* Glowing Top Ambient Bar */}
                      {isMe && (
                        <div
                          className="absolute top-0 left-0 right-0 h-1"
                          style={{
                            backgroundColor: theme ? `rgb(${theme.glowPrimary})` : 'rgb(6,182,212)',
                            boxShadow: theme ? `0 0 15px rgba(${theme.glowPrimary}, 0.9)` : '0 0 15px rgba(6,182,212,0.9)',
                          }}
                        />
                      )}

                      {/* Header Pod Bar: Grid slot & Ping */}
                      <div className="w-full flex items-center justify-between text-[9px] font-mono text-zinc-400 font-bold uppercase tracking-wider">
                        <span>SLOT #{idx + 1}</span>
                        <span className="text-emerald-400 font-black">24MS</span>
                      </div>

                      {/* Avatar & Host Crown */}
                      <div className="relative my-1">
                        <div 
                          className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg text-white shadow-inner border border-white/20 bg-slate-900/90"
                          style={{
                            boxShadow: isMe && theme ? `0 0 24px rgba(${theme.glowPrimary}, 0.4)` : undefined
                          }}
                        >
                          {p.name.charAt(0).toUpperCase()}
                        </div>
                        {isPlayerHost && (
                          <span className="absolute -top-1.5 -right-1.5 p-1 rounded-full bg-amber-500 text-slate-950 shadow-lg" title="Room Host">
                            <Crown size={10} strokeWidth={3} />
                          </span>
                        )}
                      </div>

                      {/* Player Name & ELO */}
                      <div className="flex flex-col items-center gap-0.5">
                        <div className="font-mono text-sm text-white font-black flex items-center gap-1.5">
                          <span className="truncate max-w-[110px]">{p.name}</span>
                          {isMe && (
                            <span 
                              className="text-[8px] font-mono font-black border rounded px-1 py-0.2"
                              style={{
                                backgroundColor: theme ? `rgba(${theme.glowPrimary}, 0.25)` : 'rgba(6,182,212,0.25)',
                                borderColor: theme ? `rgba(${theme.glowPrimary}, 0.5)` : 'rgba(6,182,212,0.5)',
                                color: theme ? `rgb(${theme.glowPrimary})` : 'rgb(6,182,212)',
                              }}
                            >
                              YOU
                            </span>
                          )}
                        </div>
                        <span className="font-mono text-[10px] text-zinc-400 font-bold tracking-wider">
                          RATING: <span className="text-white font-black">{p.elo || 1000} ELO</span>
                        </span>
                      </div>

                      {/* Ready Status Pill */}
                      <div className="w-full flex items-center justify-center pt-2 border-t border-white/10">
                        <div className="flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/35 text-emerald-400 font-mono text-[9px] font-black uppercase tracking-widest">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          <span>READY</span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}

                {/* Empty Slot Podium Pods */}
                {Array.from({ length: Math.max(0, roomSize - players.length) }).map((_, i) => (
                  <motion.button
                    key={`empty-${i}`}
                    layout
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    whileHover={{ y: -4, scale: 1.015 }}
                    transition={{ 
                      type: "spring",
                      stiffness: 280,
                      damping: 24,
                      delay: (players.length + i) * 0.04
                    }}
                    onClick={copyLink}
                    className="glass-panel rounded-3xl p-3.5 flex flex-col items-center justify-center min-h-[160px] border-2 border-dashed border-white/15 hover:border-cyan-400/60 hover:bg-white/[0.05] transition-all cursor-pointer group text-center bg-black/25 shadow-sm"
                    title="Click to copy room invite link"
                  >
                    <div className="w-10 h-10 rounded-2xl border border-dashed border-white/25 flex items-center justify-center text-zinc-400 group-hover:text-cyan-300 group-hover:border-cyan-400/60 transition-all mb-2 group-hover:scale-110">
                      <UserPlus size={18} />
                    </div>
                    <span className="font-mono text-xs uppercase tracking-widest font-black text-zinc-300 group-hover:text-white transition-colors">
                      SLOT #{players.length + i + 1} EMPTY
                    </span>
                    <span className="text-[10px] font-mono text-cyan-400 group-hover:underline mt-1 font-bold">
                      + INVITE RACER
                    </span>
                  </motion.button>
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* Match Configuration Card (Sleek 3-Column Layout) */}
          {lobbyConfig && updateLobbyConfig && (
            <motion.div 
              initial={{ opacity: 0, y: 16, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.35, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="glass-panel rounded-3xl p-6 border border-white/15 flex flex-col justify-between gap-4 shadow-[0_12px_40px_rgba(0,0,0,0.35)] bg-black/40"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2 text-white font-mono text-xs font-black tracking-widest uppercase">
                  <Settings size={14} className={theme ? theme.text : 'text-cyan-400'} />
                  <span>MATCH CONFIGURATION</span>
                </div>
                {isHost ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/35 text-emerald-400 font-mono text-[9px] font-black tracking-widest uppercase flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    HOST ACCESS
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/35 text-amber-400 font-mono text-[9px] font-black tracking-widest uppercase">
                    HOST CONTROLLED
                  </span>
                )}
              </div>

              <div className={`grid grid-cols-1 md:grid-cols-12 gap-5 w-full items-start ${!isHost ? 'opacity-70 pointer-events-none' : ''}`}>
                {/* Max Racers (3 cols) */}
                <div className="md:col-span-3 flex flex-col gap-2">
                  <div className="flex items-center gap-2 h-4">
                    <span className="font-mono text-[10px] text-zinc-300 uppercase tracking-widest font-bold">// ROOM CAPACITY</span>
                    <span className="text-[9px] font-mono text-zinc-200 font-bold bg-zinc-800/80 border border-zinc-600/30 px-1.5 py-0.5 rounded shadow-inner">{roomSize} MAX</span>
                  </div>
                  <SegmentedControl
                    options={[
                      { label: '2 P', value: 2 },
                      { label: '3 P', value: 3 },
                      { label: '4 P', value: 4 },
                    ]}
                    value={roomSize}
                    onChange={(v) => updateRoomSize?.(Number(v))}
                    theme={theme}
                    themeTextClass={themeTextClass}
                    size="sm"
                    fullWidth={true}
                    className="flex-nowrap whitespace-nowrap"
                  />
                </div>

                {/* Difficulty (5 cols) */}
                <div className="md:col-span-5 flex flex-col gap-2">
                  <div className="flex items-center gap-2 h-4">
                    <span className="font-mono text-[10px] text-zinc-300 uppercase tracking-widest font-bold">// DIFFICULTY PRESET</span>
                    <span className="text-[9px] font-mono text-cyan-300 font-bold bg-cyan-950/50 border border-cyan-500/20 px-1.5 py-0.5 rounded shadow-inner">{lobbyConfig.mode}</span>
                  </div>
                  <SegmentedControl
                    options={(['NOVICE', 'ADEPT', 'MASTER', 'QUOTES', 'CODE'] as Level[]).map(l => ({ label: l, value: l }))}
                    value={lobbyConfig.mode}
                    onChange={(v) => updateLobbyConfig({ mode: v })}
                    theme={theme}
                    themeTextClass={themeTextClass}
                    size="sm"
                    fullWidth={true}
                    className="flex-nowrap whitespace-nowrap"
                  />
                </div>

                {/* Word Count / Language (4 cols) */}
                <div className="md:col-span-4 flex flex-col gap-2">
                  <div className={`flex flex-col gap-2 ${lobbyConfig.mode === 'QUOTES' || lobbyConfig.mode === 'CODE' ? 'opacity-30 pointer-events-none' : 'opacity-100 transition-opacity duration-300'}`}>
                    <div className="flex items-center gap-2 h-4">
                      <span className="font-mono text-[10px] text-zinc-300 uppercase tracking-widest font-bold">// TEST LENGTH</span>
                      <span className="text-[9px] font-mono text-zinc-200 font-bold bg-zinc-800/80 border border-zinc-600/30 px-1.5 py-0.5 rounded shadow-inner">{lobbyConfig.words} WORDS</span>
                    </div>
                    <SegmentedControl
                      options={[
                        { label: '10W', value: 10 },
                        { label: '25W', value: 25 },
                        { label: '50W', value: 50 },
                        { label: '100W', value: 100 },
                      ]}
                      value={lobbyConfig.words}
                      onChange={(v) => updateLobbyConfig({ words: v })}
                      theme={theme}
                      themeTextClass={themeTextClass}
                      size="sm"
                      fullWidth={true}
                      className="flex-nowrap whitespace-nowrap"
                    />
                  </div>
                </div>

                {/* Animated Expanding Sub-Options for CODE Mode */}
                <AnimatePresence>
                  {lobbyConfig.mode === 'CODE' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0, scale: 0.98 }}
                      animate={{ opacity: 1, height: 'auto', scale: 1 }}
                      exit={{ opacity: 0, height: 0, scale: 0.98 }}
                      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                      className="md:col-span-12 overflow-hidden flex flex-col gap-2 pt-1 border-t border-white/5 mt-1"
                    >
                      <div className="flex items-center gap-2 h-4">
                        <span className="font-mono text-[10px] text-zinc-300 uppercase tracking-widest font-bold">// CODE LANGUAGE</span>
                        <span className="text-[9px] font-mono text-emerald-300 font-bold bg-emerald-950/50 border border-emerald-500/20 px-1.5 py-0.5 rounded shadow-inner">{(lobbyConfig.language || 'JS').split('/')[0]}</span>
                      </div>
                      <SegmentedControl
                        options={(['JavaScript/TypeScript', 'Python', 'Rust', 'C++', 'CSS', 'HTML', 'SQL', 'Go'] as CodeLanguage[]).map(lang => ({
                          label: lang.split('/')[0].toUpperCase(),
                          value: lang,
                        }))}
                        value={lobbyConfig.language || 'JavaScript/TypeScript'}
                        onChange={(v) => updateLobbyConfig({ language: v })}
                        theme={theme}
                        themeTextClass={themeTextClass}
                        size="sm"
                        fullWidth={true}
                        className="flex-nowrap whitespace-nowrap"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {/* Footer Launch Station */}
          <motion.div 
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 280, damping: 24, delay: 0.15 }}
            className="w-full flex items-center justify-between gap-4 pt-0.5"
          >
            <div className="flex-1">
              {isHost ? (
                players.length >= 2 ? (
                  <button 
                    onClick={onStart}
                    className="w-full font-mono text-sm uppercase tracking-[0.25em] py-3.5 rounded-2xl transition-all duration-300 flex items-center justify-center gap-3 font-black cursor-pointer shadow-2xl hover:scale-[1.015] active:scale-[0.98]"
                    style={{
                      backgroundColor: theme ? `rgb(${theme.glowPrimary})` : '#ffffff',
                      boxShadow: theme ? `0 0 35px rgba(${theme.glowPrimary}, 0.55)` : '0 0 35px rgba(255,255,255,0.4)',
                      color: '#080809',
                    }}
                  >
                    <Play size={18} className="fill-current" />
                    <span>START RACE ({players.length}/{roomSize} READY)</span>
                  </button>
                ) : (
                  <div className="w-full glass-panel py-3 px-5 rounded-2xl border-2 border-white/20 text-white font-mono tracking-widest font-black text-xs flex items-center justify-center gap-3 shadow-xl bg-black/60">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                    <span className="text-zinc-200">WAITING FOR PLAYERS ({players.length}/{roomSize} CONNECTED)</span>
                    <span className="text-zinc-500 font-normal hidden sm:inline">• Need at least 2 racers</span>
                  </div>
                )
              ) : (
                <div className="w-full glass-panel py-3 px-5 rounded-2xl border-2 border-white/20 text-zinc-200 font-mono tracking-widest font-bold text-xs flex items-center justify-center gap-3 animate-pulse shadow-xl bg-black/60">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                  WAITING FOR HOST TO LAUNCH RACE...
                </div>
              )}
            </div>

            <button 
              onClick={onLeave}
              className="text-zinc-400 hover:text-rose-400 font-mono text-xs tracking-widest font-bold flex items-center gap-2 transition-all bg-black/30 hover:bg-rose-500/15 px-5 py-3 rounded-2xl border border-white/10 hover:border-rose-500/30 cursor-pointer shrink-0 shadow-md active:scale-95"
            >
              <LogOut size={14} /> LEAVE
            </button>
          </motion.div>
        </div>
      </div>

      {/* ── 3. JOIN ROOM MODAL OVERLAY ── */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {showJoinModal && (
            <div 
              className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/25 backdrop-blur-sm animate-in fade-in duration-200"
              onClick={() => setShowJoinModal(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="w-full max-w-md bg-zinc-950/90 border border-purple-500/30 rounded-3xl p-6 sm:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.8),0_0_40px_rgba(168,85,247,0.15)] flex flex-col gap-5 relative overflow-hidden backdrop-blur-xl"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Subtle top ambient bar */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-cyan-400 to-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.8)]" />

                {/* Close Button */}
                <button
                  onClick={() => setShowJoinModal(false)}
                  className="absolute top-5 right-5 p-2 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 text-zinc-400 hover:text-white transition-all cursor-pointer"
                  title="Close"
                >
                  <X size={16} />
                </button>

                {/* Header */}
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.3)]">
                    <KeyRound size={20} />
                  </div>
                  <div>
                    <h3 className="font-mono font-black text-white text-base tracking-wider uppercase">JOIN MULTIPLAYER ROOM</h3>
                    <p className="font-mono text-zinc-400 text-xs">Enter a 6-character room code or paste an invite link.</p>
                  </div>
                </div>

                {/* Form */}
                <form onSubmit={handleJoinSubmit} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="font-mono text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center justify-between">
                      <span>ROOM ACCESS CODE</span>
                      <span className="text-zinc-500">{joinInputCode.length} / 6</span>
                    </label>
                    
                    <div className="relative flex items-center">
                      <input
                        ref={joinInputRef}
                        type="text"
                        value={joinInputCode}
                        onChange={(e) => {
                          const parsed = extractRoomCode(e.target.value);
                          setJoinInputCode(parsed);
                          setJoinError('');
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') setShowJoinModal(false);
                        }}
                        placeholder="e.g. 3QG5KX"
                        maxLength={30}
                        autoFocus
                        className="w-full px-4 py-3 rounded-2xl bg-black/60 border-2 border-white/15 focus:border-purple-400 focus:shadow-[0_0_25px_rgba(168,85,247,0.35)] text-white font-mono text-xl font-black tracking-[0.25em] text-center uppercase focus:outline-none transition-all placeholder:text-zinc-700 placeholder:tracking-normal placeholder:font-normal placeholder:text-sm"
                      />
                      
                      <button
                        type="button"
                        onClick={handlePasteCode}
                        className="absolute right-2.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-zinc-300 hover:text-white transition-all text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer active:scale-95"
                        title="Paste from clipboard"
                      >
                        <ClipboardPaste size={13} />
                        <span className="hidden sm:inline">PASTE</span>
                      </button>
                    </div>

                    {joinError && (
                      <p className="font-mono text-xs text-rose-400 font-bold animate-in fade-in flex items-center gap-1.5 mt-1">
                        <span>⚠️</span> {joinError}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowJoinModal(false)}
                      className="flex-1 py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-400 hover:text-white font-mono font-bold text-xs tracking-wider uppercase transition-all cursor-pointer"
                    >
                      CANCEL
                    </button>

                    <button
                      type="submit"
                      disabled={joinInputCode.length < 6}
                      className="flex-1 py-3 rounded-2xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:hover:bg-purple-600 border border-purple-400/50 text-white font-mono font-black text-xs tracking-widest uppercase transition-all shadow-[0_0_25px_rgba(168,85,247,0.4)] hover:shadow-[0_0_35px_rgba(168,85,247,0.6)] cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-98"
                    >
                      <LogIn size={15} />
                      <span>CONNECT & JOIN</span>
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
};

