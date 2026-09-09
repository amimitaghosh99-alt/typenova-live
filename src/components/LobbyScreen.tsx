import React, { memo, useState, useRef, useEffect } from 'react';
import {
  Copy, Link, Check, UserPlus, Play, LogOut, Settings, Crown,
  Radio, MessageSquare, Send, Sparkles, WifiOff, Rocket, Zap, Flame, Trophy, Skull, Crosshair, AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { RacerState, RaceConfig, ChatMessage, RaceConnection } from '@/hooks/useRace';
import { SegmentedControl } from '@/components/SegmentedControl';
import { InviteFriendsPanel } from '@/components/InviteFriendsPanel';
import type { FriendData } from '@/hooks/useFriends';
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
  theme?: Theme;
  themeTextClass?: string;
  isJoining?: boolean;
  /** Realtime failure (bad code, full room, dropped channel). Previously these
      only reached console.error, so a failed join looked like a no-op. */
  error?: string | null;
  /** Shared pre-race countdown, so guests see the launch instead of a frozen lobby. */
  countdown?: number | null;
  /** Socket health. A drop now retries in the background instead of destroying
      the room, so the lobby is where that has to be visible. */
  connection?: RaceConnection;
  /** Guests opt in to the next race. The host's readiness is implicit. */
  onToggleReady?: (ready: boolean) => void;
  /**
   * Friends list for in-app invites. Empty for guests.
   *
   * The lobby's two existing "invite" affordances both only reached the
   * clipboard — COPY for the code, and the button labelled INVITE for a URL —
   * leaving the user to find their friend on some other app and paste it. These
   * props let the room push a real invite through the existing challenge channel.
   */
  friends?: FriendData[];
  friendsLoading?: boolean;
  isLoggedIn?: boolean;
  /** Sends `challenge_invite` for *this* room's code. Omit to hide the panel. */
  onInviteFriend?: (username: string) => void;
}

/** Colour a measured round trip. Anything over ~300ms is a visible handicap. */
const pingTone = (ping?: number) => {
  if (typeof ping !== 'number') return 'text-zinc-500';
  if (ping < 120) return 'text-emerald-400';
  if (ping < 300) return 'text-amber-400';
  return 'text-rose-400';
};


export const REACTION_CONFIG: Record<
  string,
  {
    label: string;
    icon: React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>;
    color: string;
    bg: string;
    border: string;
    glow: string;
    tag: string;
    hint: string;
  }
> = {
  '[BOOST]': {
    label: 'BOOST',
    icon: Rocket,
    color: '#38bdf8',
    bg: 'rgba(56, 189, 248, 0.16)',
    border: 'rgba(56, 189, 248, 0.45)',
    glow: 'rgba(56, 189, 248, 0.35)',
    tag: 'BOOST PROTOCOL',
    hint: 'ENGAGE FULL THRUSTERS',
  },
  '[SPEED]': {
    label: 'SPEED',
    icon: Zap,
    color: '#facc15',
    bg: 'rgba(250, 204, 21, 0.16)',
    border: 'rgba(250, 204, 21, 0.45)',
    glow: 'rgba(250, 204, 21, 0.35)',
    tag: 'HYPER VELOCITY',
    hint: 'OVERCLOCK SPEED FREQUENCY',
  },
  '[ON FIRE]': {
    label: 'ON FIRE',
    icon: Flame,
    color: '#fb923c',
    bg: 'rgba(251, 146, 60, 0.16)',
    border: 'rgba(251, 146, 60, 0.45)',
    glow: 'rgba(251, 146, 60, 0.35)',
    tag: 'THERMAL CRIT',
    hint: 'PERFECT STREAK UNLEASHED',
  },
  '[GG]': {
    label: 'GG',
    icon: Trophy,
    color: '#34d399',
    bg: 'rgba(52, 211, 153, 0.16)',
    border: 'rgba(52, 211, 153, 0.45)',
    glow: 'rgba(52, 211, 153, 0.35)',
    tag: 'VICTORY DISPATCH',
    hint: 'HONOR & RESPECT TO RACERS',
  },
  '[CROWN]': {
    label: 'CROWN',
    icon: Crown,
    color: '#fbbf24',
    bg: 'rgba(251, 191, 36, 0.18)',
    border: 'rgba(251, 191, 36, 0.5)',
    glow: 'rgba(251, 191, 36, 0.4)',
    tag: 'APEX SOVEREIGN',
    hint: 'REIGN OF THE SPEED CROWN',
  },
  '[RIP]': {
    label: 'RIP',
    icon: Skull,
    color: '#f43f5e',
    bg: 'rgba(244, 63, 94, 0.16)',
    border: 'rgba(244, 63, 94, 0.45)',
    glow: 'rgba(244, 63, 94, 0.35)',
    tag: 'SIGNAL LOST',
    hint: 'CRITICAL TYPO CASUALTY',
  },
  '[LOCKED IN]': {
    label: 'LOCKED IN',
    icon: Crosshair,
    color: '#a855f7',
    bg: 'rgba(168, 85, 247, 0.16)',
    border: 'rgba(168, 85, 247, 0.45)',
    glow: 'rgba(168, 85, 247, 0.35)',
    tag: 'NEURAL LOCK',
    hint: 'MAXIMUM FOCUSED FLOW',
  },
  '[CLEAN]': {
    label: 'CLEAN',
    icon: Sparkles,
    color: '#22d3ee',
    bg: 'rgba(34, 211, 238, 0.16)',
    border: 'rgba(34, 211, 238, 0.45)',
    glow: 'rgba(34, 211, 238, 0.35)',
    tag: 'PRISTINE RUN',
    hint: 'FLAWLESS ACCURACY METRIC',
  },
};

const QUICK_REACTIONS = [
  { label: 'Boost', text: '[BOOST]', icon: Rocket, color: '#38bdf8', glow: 'rgba(56, 189, 248, 0.4)' },
  { label: 'Speed', text: '[SPEED]', icon: Zap, color: '#facc15', glow: 'rgba(250, 204, 21, 0.4)' },
  { label: 'On Fire', text: '[ON FIRE]', icon: Flame, color: '#fb923c', glow: 'rgba(251, 146, 60, 0.4)' },
  { label: 'GG', text: '[GG]', icon: Trophy, color: '#34d399', glow: 'rgba(52, 211, 153, 0.4)' },
  { label: 'Crown', text: '[CROWN]', icon: Crown, color: '#fbbf24', glow: 'rgba(251, 191, 36, 0.4)' },
  { label: 'RIP', text: '[RIP]', icon: Skull, color: '#f43f5e', glow: 'rgba(244, 63, 94, 0.4)' },
  { label: 'Locked In', text: '[LOCKED IN]', icon: Crosshair, color: '#a855f7', glow: 'rgba(168, 85, 247, 0.4)' },
  { label: 'Clean', text: '[CLEAN]', icon: Sparkles, color: '#22d3ee', glow: 'rgba(34, 211, 238, 0.4)' },
];

const QUICK_PHRASES = ['GLHF', 'Ready!', "Let's Go!", 'One More', 'Pick Code!', 'GG'];

const PHRASE_CONFIG: Record<string, { tag: string; hint: string }> = {
  'GLHF': { tag: 'CALLOUT: GLHF', hint: 'GOOD LUCK HAVE FUN' },
  'Ready!': { tag: 'CALLOUT: READY', hint: 'COMBAT READY STATUS' },
  "Let's Go!": { tag: 'CALLOUT: LETS GO', hint: 'SIGNAL RACE LAUNCH' },
  'One More': { tag: 'CALLOUT: ONE MORE', hint: 'REQUEST IMMEDIATE REMATCH' },
  'Pick Code!': { tag: 'CALLOUT: CODE', hint: 'RECOMMEND SYNTAX MODE' },
  'GG': { tag: 'CALLOUT: GG', hint: 'TRANSMIT GOOD GAME' },
};

const ReactionAnimatedIcon: React.FC<{
  icon: React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>;
  label: string;
  color: string;
}> = ({ icon: Icon, label, color }) => {
  if (label === 'SPEED') {
    return (
      <motion.div
        animate={{ scale: [1, 1.25, 1], rotate: [0, -6, 6, 0] }}
        transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
        className="relative z-10 shrink-0"
      >
        <Icon size={15} style={{ color }} />
      </motion.div>
    );
  }
  if (label === 'ON FIRE') {
    return (
      <motion.div
        animate={{ scale: [1, 1.18, 0.95, 1], y: [0, -1.5, 0] }}
        transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
        className="relative z-10 shrink-0"
      >
        <Icon size={15} style={{ color }} />
      </motion.div>
    );
  }
  if (label === 'BOOST') {
    return (
      <motion.div
        animate={{ y: [0, -2, 0], x: [0, 1.5, 0] }}
        transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}
        className="relative z-10 shrink-0"
      >
        <Icon size={15} style={{ color }} />
      </motion.div>
    );
  }
  if (label === 'CROWN') {
    return (
      <motion.div
        animate={{ rotate: [-4, 4, -4], scale: [1, 1.08, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        className="relative z-10 shrink-0"
      >
        <Icon size={15} style={{ color }} />
      </motion.div>
    );
  }
  if (label === 'GG') {
    return (
      <motion.div
        animate={{ scale: [1, 1.14, 1] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
        className="relative z-10 shrink-0"
      >
        <Icon size={15} style={{ color }} />
      </motion.div>
    );
  }
  if (label === 'LOCKED IN') {
    return (
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
        className="relative z-10 shrink-0"
      >
        <Icon size={15} style={{ color }} />
      </motion.div>
    );
  }
  if (label === 'CLEAN') {
    return (
      <motion.div
        animate={{ rotate: 360, scale: [1, 1.2, 1] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: 'linear' }}
        className="relative z-10 shrink-0"
      >
        <Icon size={15} style={{ color }} />
      </motion.div>
    );
  }
  if (label === 'RIP') {
    return (
      <motion.div
        animate={{ opacity: [1, 0.65, 1], scale: [1, 0.94, 1] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        className="relative z-10 shrink-0"
      >
        <Icon size={15} style={{ color }} />
      </motion.div>
    );
  }
  return <Icon size={15} style={{ color }} className="relative z-10 shrink-0" />;
};

const LobbyScreenImpl: React.FC<LobbyScreenProps> = ({
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
  theme,
  themeTextClass = 'text-cyan-400',
  isJoining = false,
  error = null,
  countdown = null,
  connection = 'live',
  onToggleReady,
  friends = [],
  friendsLoading = false,
  isLoggedIn = false,
  onInviteFriend,
}) => {

  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const glow = theme?.glowPrimary || '6, 182, 212';
  const rgba = (rgbStr: string, a: number) => `rgba(${rgbStr}, ${a})`;

  interface FloatingParticle {
    id: string;
    icon: React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>;
    color: string;
    glow: string;
    xOffset: number;
    driftX: number;
    rotation: number;
  }

  const [floatingEmotes, setFloatingEmotes] = useState<FloatingParticle[]>([]);
  const [activeHover, setActiveHover] = useState<{ label: string; tag: string; hint: string; color?: string } | null>(null);

  const triggerFloatingParticles = (reactionKey: string) => {
    const reaction = REACTION_CONFIG[reactionKey];
    if (!reaction) return;

    // Spawn 2 clean, elegant floating particles with centered trajectory
    const newParticles: FloatingParticle[] = Array.from({ length: 2 }).map((_, i) => ({
      id: `${Date.now()}-${Math.random()}-${i}`,
      icon: reaction.icon,
      color: reaction.color,
      glow: reaction.glow,
      xOffset: (Math.random() - 0.5) * 36,
      driftX: (Math.random() - 0.5) * 40,
      rotation: (Math.random() - 0.5) * 28,
    }));

    setFloatingEmotes(prev => [...prev.slice(-8), ...newParticles]);
  };

  const me = players.find(p => p.id === selfId);
  const myName = me?.name || 'Racer';

  // Readiness is real now: every pod used to render a hardcoded READY pill, so
  // the host had no idea whether anyone was actually at their keyboard.
  const guests = players.filter(p => !p.isHost);
  const readyGuests = guests.filter(p => p.ready).length;
  const allReady = guests.length > 0 && readyGuests === guests.length;
  const iAmReady = isHost || !!me?.ready;

  // Auto-scroll chat to bottom on new message
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // Watch for other racers sending reactions and trigger floating particles
  const prevChatCountRef = useRef(chatMessages.length);
  useEffect(() => {
    if (chatMessages.length > prevChatCountRef.current) {
      const latestMsg = chatMessages[chatMessages.length - 1];
      if (latestMsg && REACTION_CONFIG[latestMsg.text]) {
        triggerFloatingParticles(latestMsg.text);
      }
    }
    prevChatCountRef.current = chatMessages.length;
  }, [chatMessages]);

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
    toast.success(`Invite link copied! This room seats ${roomSize} racers.`);
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
    if (REACTION_CONFIG[text]) {
      triggerFloatingParticles(text);
    }
  };

  return (
    <div className="w-full max-w-[1600px] mx-auto relative select-none pb-2 animate-in fade-in duration-300 flex flex-col gap-4">

      {countdown !== null && (
        <div className="absolute inset-0 z-[55] flex flex-col items-center justify-center bg-black/85 backdrop-blur-md rounded-3xl">
          <div className={`font-display font-black text-8xl ${themeTextClass} animate-pulse`}>{countdown}</div>
          <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.3em] text-zinc-400">Race starting — get ready</p>
        </div>
      )}

      {error && (
        <div className="w-full px-4 py-2.5 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-300 font-mono text-[11px] font-bold uppercase tracking-widest flex items-center gap-2">
          <AlertTriangle size={14} className="text-rose-400 shrink-0" /> {error}
        </div>
      )}

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
          {connection === 'live' ? (
            <>
              <Radio size={14} className="text-emerald-400 animate-pulse" />
              <span className="uppercase font-black text-white">LIVE MULTIPLAYER ARENA</span>
            </>
          ) : (
            <>
              <WifiOff size={14} className="text-amber-400 animate-pulse" />
              <span className="uppercase font-black text-amber-300" role="status">
                {connection === 'reconnecting' ? 'RECONNECTING…' : 'LINKING…'}
              </span>
            </>
          )}
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
          className="lg:col-span-4 w-full glass-panel rounded-3xl p-5 border border-white/15 flex flex-col justify-between gap-3.5 shadow-[0_12px_40px_rgba(0,0,0,0.4)] min-h-[600px] lg:h-[calc(100vh-14rem)] lg:min-h-[660px] max-h-[840px] bg-black/35 relative overflow-hidden"
        >
          {/* Subtle Ambient Glow Backdrop */}
          <div className="absolute inset-0 pointer-events-none opacity-25 -z-10">
            <div
              className="absolute -top-16 -left-16 w-52 h-52 rounded-full blur-3xl animate-pulse"
              style={{ background: rgba(glow, 0.3) }}
            />
            <div
              className="absolute -bottom-16 -right-16 w-52 h-52 rounded-full blur-3xl animate-pulse"
              style={{ background: rgba(glow, 0.2) }}
            />
          </div>

          {/* Floating Reaction Emote Particles Canvas (Contained in Center Bounds) */}
          <div className="absolute inset-x-0 bottom-36 pointer-events-none z-30 flex justify-center items-center overflow-hidden">
            <AnimatePresence>
              {floatingEmotes.map(emote => {
                const Icon = emote.icon;
                return (
                  <motion.div
                    key={emote.id}
                    initial={{ opacity: 0, scale: 0.5, y: 0, x: emote.xOffset, rotate: 0 }}
                    animate={{
                      opacity: [0, 1, 1, 0],
                      scale: [0.5, 1.25, 1.05, 0.85],
                      y: -200,
                      x: emote.xOffset + emote.driftX,
                      rotate: emote.rotation,
                    }}
                    transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
                    onAnimationComplete={() => {
                      setFloatingEmotes(prev => prev.filter(e => e.id !== emote.id));
                    }}
                    className="absolute p-1.5 rounded-full border shadow-lg backdrop-blur-md flex items-center justify-center"
                    style={{
                      background: 'rgba(0, 0, 0, 0.75)',
                      borderColor: emote.color,
                      boxShadow: `0 0 16px ${emote.glow}`,
                    }}
                  >
                    <Icon size={18} style={{ color: emote.color }} />
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
            <div className="flex items-center gap-2 text-white font-mono text-xs font-black tracking-widest uppercase">
              <div
                className="p-1.5 rounded-lg border transition-colors"
                style={{
                  background: rgba(glow, 0.15),
                  borderColor: rgba(glow, 0.35),
                  color: `rgb(${glow})`,
                  boxShadow: `0 0 14px ${rgba(glow, 0.25)}`,
                }}
              >
                <MessageSquare size={14} />
              </div>
              <span>NEURAL COMMS HUB</span>
            </div>
            <span
              className="px-2.5 py-0.5 rounded-full border font-mono text-[9px] font-black tracking-widest uppercase flex items-center gap-2 transition-colors"
              style={{
                background: rgba(glow, 0.12),
                borderColor: rgba(glow, 0.3),
                color: `rgb(${glow})`,
              }}
            >
              {/* Micro Animated Audio Equalizer */}
              <span className="flex items-end gap-0.5 h-2.5">
                <motion.span
                  animate={{ height: [3, 9, 4, 10, 3] }}
                  transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
                  className="w-0.5 rounded-full"
                  style={{ background: `rgb(${glow})` }}
                />
                <motion.span
                  animate={{ height: [8, 3, 10, 5, 8] }}
                  transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}
                  className="w-0.5 rounded-full"
                  style={{ background: `rgb(${glow})` }}
                />
                <motion.span
                  animate={{ height: [4, 10, 3, 8, 4] }}
                  transition={{ duration: 1.3, repeat: Infinity, ease: 'easeInOut' }}
                  className="w-0.5 rounded-full"
                  style={{ background: `rgb(${glow})` }}
                />
              </span>
              LIVE STREAM
            </span>
          </div>

          {/* Tall Scrollable Message Feed */}
          <div
            ref={chatScrollRef}
            className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-2.5 p-3.5 rounded-2xl bg-black/50 border border-white/10 text-xs font-mono min-h-[300px] relative overflow-hidden"
          >
            {/* Live Cyber Telemetry Radar Grid */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl opacity-15 flex items-center justify-center -z-0">
              {/* Rotating radar sweep */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 14, repeat: Infinity, ease: 'linear' }}
                className="absolute w-[360px] h-[360px] rounded-full border border-dashed"
                style={{ borderColor: rgba(glow, 0.35) }}
              >
                <div
                  className="w-1/2 h-1/2 origin-bottom-right"
                  style={{
                    background: `conic-gradient(from 0deg, transparent 0deg, ${rgba(glow, 0.4)} 60deg, transparent 65deg)`,
                  }}
                />
              </motion.div>
              {/* Concentric rings */}
              <div className="absolute w-[220px] h-[220px] rounded-full border" style={{ borderColor: rgba(glow, 0.2) }} />
              <div className="absolute w-[120px] h-[120px] rounded-full border" style={{ borderColor: rgba(glow, 0.15) }} />
              {/* Crosshair coordinate axes */}
              <div className="absolute inset-x-0 top-1/2 h-px border-t border-dashed" style={{ borderColor: rgba(glow, 0.15) }} />
              <div className="absolute inset-y-0 left-1/2 w-px border-l border-dashed" style={{ borderColor: rgba(glow, 0.15) }} />
            </div>

            {/* Intel Welcome Card */}
            <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-center flex flex-col gap-1 mb-1 relative z-10">
              <div
                className="flex items-center justify-center gap-1.5 text-[9px] font-mono font-black uppercase tracking-widest"
                style={{ color: `rgb(${glow})` }}
              >
                <Radio size={11} className="animate-pulse" />
                <span>TELEMETRY LINK SYNCHRONIZED</span>
              </div>
              <p className="text-[10px] text-zinc-400 font-medium">
                Room <span className="text-white font-bold">{code}</span> configured for <span className="text-white font-bold">{lobbyConfig?.mode || 'ADEPT'} ({lobbyConfig?.words || 25} Words)</span>.
              </p>
            </div>

            {chatMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center my-auto text-center gap-1.5 opacity-70 relative z-10">
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
                const isSenderMe = msg.senderId ? msg.senderId === selfId : msg.sender === myName;
                const senderPlayer = players.find(p => (msg.senderId ? p.id === msg.senderId : p.name === msg.sender));
                const isPlayerHost = !!senderPlayer?.isHost;
                const reaction = REACTION_CONFIG[msg.text];

                return (
                  <div key={msg.id} className={`flex flex-col ${isSenderMe ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-1 duration-200 relative z-10`}>
                    <div className="flex items-center gap-1.5 text-[9px] text-zinc-400 mb-0.5 px-1">
                      {isPlayerHost && (
                        <Crown size={9} className="text-amber-400 inline" />
                      )}
                      <span
                        className="font-black"
                        style={{ color: isSenderMe ? `rgb(${glow})` : 'rgb(228, 228, 231)' }}
                      >
                        {msg.sender}
                      </span>
                      {senderPlayer?.elo && (
                        <span className="text-zinc-500 text-[8px]">({senderPlayer.elo})</span>
                      )}
                      <span className="text-zinc-500 text-[8px]">• {msg.timestamp}</span>
                    </div>

                    {reaction ? (
                      /* ── Illuminated Cyber Reaction Badge with Sheen & Micro-Motion ── */
                      <motion.div
                        initial={{ scale: 0.82, y: 4, opacity: 0 }}
                        animate={{ scale: 1, y: 0, opacity: 1 }}
                        transition={{ type: 'spring', stiffness: 450, damping: 22 }}
                        className={`relative overflow-hidden px-3.5 py-1.5 rounded-2xl flex items-center gap-2 border shadow-lg ${
                          isSenderMe ? 'rounded-tr-sm' : 'rounded-tl-sm'
                        }`}
                        style={{
                          background: reaction.bg,
                          borderColor: reaction.border,
                          boxShadow: `0 0 20px ${reaction.glow}`,
                        }}
                      >
                        {/* Holographic Sheen Sweep */}
                        <motion.div
                          animate={{ x: ['-100%', '240%'] }}
                          transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut', repeatDelay: 1.2 }}
                          className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/25 to-transparent skew-x-12 pointer-events-none"
                        />
                        <ReactionAnimatedIcon icon={reaction.icon} label={reaction.label} color={reaction.color} />
                        <span
                          className="font-mono text-xs font-black tracking-widest uppercase relative z-10"
                          style={{ color: reaction.color }}
                        >
                          {reaction.label}
                        </span>
                      </motion.div>
                    ) : QUICK_PHRASES.includes(msg.text) ? (
                      /* ── Cyber Phrase Transmission ── */
                      <motion.div
                        initial={{ scale: 0.86, y: 3, opacity: 0 }}
                        animate={{ scale: 1, y: 0, opacity: 1 }}
                        transition={{ type: 'spring', stiffness: 450, damping: 24 }}
                        className={`px-3.5 py-1.5 rounded-2xl flex items-center gap-2 border shadow-md font-mono text-xs font-black tracking-wide ${
                          isSenderMe ? 'rounded-tr-sm' : 'rounded-tl-sm'
                        }`}
                        style={{
                          background: isSenderMe ? rgba(glow, 0.22) : 'rgba(255, 255, 255, 0.08)',
                          borderColor: isSenderMe ? rgba(glow, 0.45) : 'rgba(255, 255, 255, 0.15)',
                          color: isSenderMe ? '#ffffff' : 'rgb(228, 228, 231)',
                          boxShadow: isSenderMe ? `0 0 16px ${rgba(glow, 0.2)}` : undefined,
                        }}
                      >
                        <Radio size={11} className="animate-pulse shrink-0" style={{ color: isSenderMe ? `rgb(${glow})` : 'rgb(161, 161, 170)' }} />
                        <span>{msg.text}</span>
                      </motion.div>
                    ) : (
                      /* ── Normal Chat Bubble ── */
                      <div
                        className={`px-3.5 py-1.5 rounded-2xl max-w-[90%] break-words leading-relaxed text-xs font-medium shadow-md border ${
                          isSenderMe ? 'rounded-tr-sm' : 'rounded-tl-sm'
                        }`}
                        style={{
                          background: isSenderMe ? rgba(glow, 0.22) : 'rgba(255, 255, 255, 0.12)',
                          borderColor: isSenderMe ? rgba(glow, 0.45) : 'rgba(255, 255, 255, 0.15)',
                          color: isSenderMe ? '#ffffff' : 'rgb(244, 244, 245)',
                          boxShadow: isSenderMe ? `0 2px 14px ${rgba(glow, 0.18)}` : undefined,
                        }}
                      >
                        {msg.text}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Quick Reaction & Macro Station */}
          <div className="flex flex-col gap-2 pt-1 border-t border-white/10">
            {/* Tactical Command Ribbon (Eliminates OS Tooltip) */}
            <div className="flex items-center justify-between px-2.5 py-1 rounded-xl bg-white/[0.03] border border-white/10 text-[9px] font-mono tracking-wider transition-all">
              <div className="flex items-center gap-1.5 font-black truncate">
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0 animate-ping"
                  style={{
                    background: activeHover?.color || `rgb(${glow})`,
                  }}
                />
                <span style={{ color: activeHover?.color || `rgb(${glow})` }}>
                  {activeHover ? activeHover.tag : 'TACTICAL FREQ // 142.85 MHz'}
                </span>
              </div>
              <span className="text-zinc-500 font-bold uppercase text-[8px] tracking-widest shrink-0 ml-2">
                {activeHover ? activeHover.hint : 'TAP MACRO TO BROADCAST'}
              </span>
            </div>

            {/* Quick Reactions Strip (Zero native title tooltips, unclipped bounds) */}
            <div className="w-full flex items-center justify-between gap-1.5 px-1 py-1">
              {QUICK_REACTIONS.map(item => {
                const IconComponent = item.icon;
                const isCurrentHover = activeHover?.label === item.label;
                return (
                  <motion.button
                    key={item.label}
                    onClick={() => handleSendReaction(item.text)}
                    onMouseEnter={() =>
                      setActiveHover({
                        label: item.label,
                        tag: REACTION_CONFIG[item.text]?.tag || item.label,
                        hint: REACTION_CONFIG[item.text]?.hint || 'MACRO TRANSMIT',
                        color: item.color,
                      })
                    }
                    onMouseLeave={() => setActiveHover(null)}
                    whileHover={{ scale: 1.16, y: -2 }}
                    whileTap={{ scale: 0.9 }}
                    className="flex-1 p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center relative"
                    style={{
                      background: isCurrentHover ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.05)',
                      borderColor: isCurrentHover ? item.color : 'rgba(255, 255, 255, 0.12)',
                      color: item.color,
                      boxShadow: isCurrentHover ? `0 0 14px ${item.glow}` : undefined,
                    }}
                  >
                    <IconComponent size={15} style={{ color: item.color }} />
                  </motion.button>
                );
              })}
            </div>

            {/* Phrase Pills */}
            <div className="flex flex-wrap gap-1.5 px-0.5">
              {QUICK_PHRASES.map(phrase => {
                const isCurrentHover = activeHover?.label === phrase;
                return (
                  <motion.button
                    key={phrase}
                    onClick={() => handleSendReaction(phrase)}
                    onMouseEnter={() =>
                      setActiveHover({
                        label: phrase,
                        tag: PHRASE_CONFIG[phrase]?.tag || phrase,
                        hint: PHRASE_CONFIG[phrase]?.hint || 'DIRECT TRANSMIT',
                        color: `rgb(${glow})`,
                      })
                    }
                    onMouseLeave={() => setActiveHover(null)}
                    whileHover={{ scale: 1.04, y: -1 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-3 py-1.5 rounded-full border text-[10px] font-mono font-bold transition-all cursor-pointer shadow-sm text-zinc-200 hover:text-white"
                    style={{
                      background: isCurrentHover ? rgba(glow, 0.2) : 'rgba(255, 255, 255, 0.05)',
                      borderColor: isCurrentHover ? rgba(glow, 0.5) : 'rgba(255, 255, 255, 0.15)',
                      color: isCurrentHover ? '#ffffff' : 'rgb(228, 228, 231)',
                      boxShadow: isCurrentHover ? `0 0 12px ${rgba(glow, 0.25)}` : undefined,
                    }}
                  >
                    {phrase}
                  </motion.button>
                );
              })}
            </div>

            {/* Input Form */}
            <form onSubmit={handleSendCustomChat} className="flex items-center gap-2 mt-0.5">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Broadcast message to room..."
                maxLength={80}
                className="flex-1 px-3.5 py-2 rounded-xl bg-black/50 border text-white font-mono text-xs focus:outline-none transition-all placeholder:text-zinc-500"
                style={{
                  borderColor: chatInput ? rgba(glow, 0.5) : 'rgba(255, 255, 255, 0.15)',
                  boxShadow: chatInput ? `0 0 14px ${rgba(glow, 0.18)}` : undefined,
                }}
              />
              <motion.button
                type="submit"
                disabled={!chatInput.trim()}
                whileHover={chatInput.trim() ? { scale: 1.08 } : undefined}
                whileTap={chatInput.trim() ? { scale: 0.92 } : undefined}
                className="p-2 rounded-xl border cursor-pointer transition-all shadow-sm disabled:opacity-30 disabled:cursor-not-allowed"
                style={{
                  background: chatInput.trim() ? rgba(glow, 0.28) : 'rgba(255, 255, 255, 0.05)',
                  borderColor: chatInput.trim() ? rgba(glow, 0.55) : 'rgba(255, 255, 255, 0.1)',
                  color: chatInput.trim() ? `rgb(${glow})` : 'rgba(255, 255, 255, 0.4)',
                }}
              >
                <Send size={14} />
              </motion.button>
            </form>
          </div>
        </motion.div>

        {/* ════ RIGHT COLUMN: 4 PODIUMS, 3-COLUMN CONFIG & LAUNCH (col-span-8) ════ */}
        <div className="lg:col-span-8 w-full flex flex-col justify-between gap-3.5 min-h-[600px] lg:h-[calc(100vh-14rem)] lg:min-h-[660px] max-h-[840px]">

          {/* Starting Grid Section */}
          <div className="w-full flex flex-col gap-2">
            {/* 4 Podiums Across in 4 Columns */}
            <div className={`w-full grid gap-3.5 ${roomSize === 2
              ? 'grid-cols-2'
              : roomSize === 3
                ? 'grid-cols-3'
                : 'grid-cols-2 sm:grid-cols-4'
              }`}>
              <AnimatePresence mode="popLayout">
                {/* Active Racer Podium Pods */}
                {players.map((p, idx) => {
                  const isMe = p.id === selfId;
                  // Trust the elected host flag rather than slot order, which
                  // disagrees with it the moment the original host leaves.
                  const isPlayerHost = p.isHost;

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
                      className={`glass-panel rounded-3xl p-3.5 flex flex-col items-center justify-between min-h-[160px] border transition-all duration-300 relative overflow-hidden text-center group bg-black/40 ${isMe
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
                        {/* Measured round trip. This was a hardcoded "24MS" on
                            every pod — decoration dressed up as telemetry. */}
                        <span className={`font-black ${pingTone(p.ping)}`} title="Measured round-trip time">
                          {typeof p.ping === 'number' ? `${p.ping}MS` : '—'}
                        </span>
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

                      {/* Ready Status Pill — real state, and clickable for you */}
                      <div className="w-full flex items-center justify-center pt-2 border-t border-white/10">
                        {isPlayerHost ? (
                          <div className="flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/35 text-amber-300 font-mono text-[9px] font-black uppercase tracking-widest">
                            <Crown size={9} strokeWidth={3} />
                            <span>HOST</span>
                          </div>
                        ) : isMe ? (
                          <button
                            type="button"
                            onClick={() => onToggleReady?.(!p.ready)}
                            aria-pressed={!!p.ready}
                            className={`flex items-center gap-1.5 px-3 py-0.5 rounded-full border font-mono text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer active:scale-95 ${p.ready
                              ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-400'
                              : 'bg-white/5 border-white/20 text-zinc-300 hover:border-white/40 hover:text-white'
                              }`}
                            title={p.ready ? 'Click to un-ready' : 'Click when you are ready to race'}
                          >
                            {p.ready
                              ? <Check size={9} strokeWidth={4} />
                              : <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />}
                            <span>{p.ready ? 'READY' : 'READY UP'}</span>
                          </button>
                        ) : (
                          <div className={`flex items-center gap-1.5 px-3 py-0.5 rounded-full border font-mono text-[9px] font-black uppercase tracking-widest ${p.ready
                            ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-400'
                            : 'bg-zinc-500/10 border-zinc-500/30 text-zinc-400'
                            }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${p.ready ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'}`} />
                            <span>{p.ready ? 'READY' : 'NOT READY'}</span>
                          </div>
                        )}
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
                      COPY INVITE LINK
                    </span>
                  </motion.button>
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* ── Invite friends ──
              Sits directly under the podium, next to the empty slots it fills.
              Rendered only when the room has room and the wiring is present: an
              invite list on a full room is a list of dead buttons. */}
          {onInviteFriend && players.length < roomSize && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
            >
              <InviteFriendsPanel
                friends={friends}
                loading={friendsLoading}
                isLoggedIn={isLoggedIn}
                presentNames={players.map((p) => p.name)}
                hasSpace={players.length < roomSize}
                theme={theme}
                onInvite={onInviteFriend}
              />
            </motion.div>
          )}

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
                    style={allReady ? {
                      backgroundColor: theme ? `rgb(${theme.glowPrimary})` : '#ffffff',
                      boxShadow: theme ? `0 0 35px rgba(${theme.glowPrimary}, 0.55)` : '0 0 35px rgba(255,255,255,0.4)',
                      color: '#080809',
                    } : {
                      backgroundColor: 'rgba(245,158,11,0.16)',
                      border: '1px solid rgba(245,158,11,0.45)',
                      color: '#fcd34d',
                    }}
                    title={allReady ? 'Everyone has readied up' : 'Some racers have not readied up yet'}
                  >
                    <Play size={18} className="fill-current" />
                    {/* The old label counted connections as readiness, so it
                        always read "n/n READY" no matter who was at the keyboard. */}
                    <span>
                      {allReady
                        ? `START RACE (${players.length}/${players.length} READY)`
                        : `START ANYWAY (${readyGuests + 1}/${players.length} READY)`}
                    </span>
                  </button>
                ) : (
                  <div className="w-full glass-panel py-3 px-5 rounded-2xl border-2 border-white/20 text-white font-mono tracking-widest font-black text-xs flex items-center justify-center gap-3 shadow-xl bg-black/60">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                    <span className="text-zinc-200">WAITING FOR PLAYERS ({players.length}/{roomSize} CONNECTED)</span>
                    <span className="text-zinc-500 font-normal hidden sm:inline">• Need at least 2 racers</span>
                  </div>
                )
              ) : (
                iAmReady ? (
                  <div className="w-full glass-panel py-3 px-5 rounded-2xl border-2 border-white/20 text-zinc-200 font-mono tracking-widest font-bold text-xs flex items-center justify-center gap-3 animate-pulse shadow-xl bg-black/60">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                    WAITING FOR HOST TO LAUNCH RACE...
                  </div>
                ) : (
                  <button
                    onClick={() => onToggleReady?.(true)}
                    className="w-full py-3.5 rounded-2xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/45 text-emerald-200 font-mono font-black text-sm uppercase tracking-[0.25em] flex items-center justify-center gap-3 transition-all cursor-pointer active:scale-[0.98] shadow-[0_0_25px_rgba(16,185,129,0.25)]"
                  >
                    <Check size={18} strokeWidth={3} />
                    <span>I'M READY</span>
                  </button>
                )
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

      {/* The lobby used to carry a third "JOIN ROOM" action here, next to COPY
          and INVITE, backed by a code-entry modal. It was a leftover from when
          the lobby was the only compete surface: hosting a room and then being
          offered to join one reads as a bug, and using it silently abandoned
          the room you had just opened (switching channels tears the old one
          down, dropping anyone who had already joined). Joining by code lives
          on the entry screen now — LEAVE is the way out of a room. */}
    </div>
  );
};


export const LobbyScreen = memo(LobbyScreenImpl);

