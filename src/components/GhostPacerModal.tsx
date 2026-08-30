import React, { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Ghost, Zap, Trophy, Bot, Gauge, Check, Users, Loader2, CloudOff } from 'lucide-react';
import type { Theme } from '@/data/constants';
import type { GhostMode, PaceSample } from '@/components/TypingArea';
import type { ModeScoreRow, RivalGhost } from '@/hooks/useModeLeaderboard';
import { formatModeLabel, formatModeLabelLong } from '@/lib/modeKey';

interface GhostPacerModalProps {
  isOpen: boolean;
  onClose: () => void;
  ghostPacer: boolean;
  setGhostPacer: (val: boolean) => void;
  ghostMode: GhostMode;
  setGhostMode: (val: GhostMode) => void;
  ghostTargetWpm: number;
  setGhostTargetWpm: (val: number) => void;
  pbGhost?: { wpm: number; samples: PaceSample[] } | null;
  theme: Theme;
  /** Ghost Net: the current mode's board, and the rival loaded from it. */
  modeKey: string | null;
  rivals: ModeScoreRow[];
  rivalsLoading: boolean;
  rivalsUnavailable: boolean;
  rivalGhost: RivalGhost | null;
  /** user_id whose ghost is currently downloading, if any. */
  rivalPendingId: string | null;
  onSelectRival: (row: ModeScoreRow) => void;
  currentUsername: string | null;
}

const PACER_PRESETS = [60, 80, 100, 120, 140, 160, 180, 200];

export const GhostPacerModal: React.FC<GhostPacerModalProps> = memo(({
  isOpen,
  onClose,
  ghostPacer,
  setGhostPacer,
  ghostMode,
  setGhostMode,
  ghostTargetWpm,
  setGhostTargetWpm,
  pbGhost,
  theme,
  modeKey,
  rivals,
  rivalsLoading,
  rivalsUnavailable,
  rivalGhost,
  rivalPendingId,
  onSelectRival,
  currentUsername,
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/75 backdrop-blur-md"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-zinc-950/90 border border-white/10 rounded-3xl p-6 md:p-8 shadow-[0_0_50px_rgba(0,0,0,0.8)] z-10"
        >
          {/* Ambient Glow */}
          <div
            className="absolute top-0 right-0 w-64 h-64 rounded-full blur-[100px] pointer-events-none opacity-20"
            style={{ background: theme.glowPrimary || 'rgba(6,182,212,0.4)' }}
          />

          {/* Header */}
          <div className="flex items-center justify-between mb-6 relative">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-cyan-400">
                <Ghost size={24} className="animate-pulse" />
              </div>
              <div>
                <h2 className="text-xl font-black text-white tracking-wider flex items-center gap-2">
                  GHOST RACER <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30">3.0</span>
                </h2>
                <p className="text-xs text-zinc-400 font-medium">Race your best, a pacer bot, or anyone on the board</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Master Enable/Disable Toggle */}
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Zap size={18} className={ghostPacer ? 'text-cyan-400' : 'text-zinc-500'} />
              <div>
                <span className="text-sm font-bold text-white block">Enable Ghost Pacer</span>
                <span className="text-xs text-zinc-400">Display the live shadow racer during typing</span>
              </div>
            </div>
            <button
              onClick={() => setGhostPacer(!ghostPacer)}
              aria-pressed={ghostPacer}
              aria-label="Enable Ghost Pacer"
              className={`w-14 h-8 rounded-full p-1 transition-colors relative flex items-center ${
                ghostPacer ? 'bg-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.5)]' : 'bg-zinc-800'
              }`}
            >
              <motion.div
                layout
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                className={`w-6 h-6 rounded-full bg-white shadow-md ${ghostPacer ? 'ml-auto' : 'mr-auto'}`}
              />
            </button>
          </div>

          {/* Mode Selector Tabs */}
          <div className="grid grid-cols-3 gap-2 mb-6">
            <button
              onClick={() => setGhostMode('pb')}
              className={`p-3 rounded-2xl border transition-all text-left flex flex-col gap-2 relative overflow-hidden ${
                ghostMode === 'pb'
                  ? 'bg-cyan-500/10 border-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.15)]'
                  : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05] text-zinc-400'
              }`}
            >
              <div className="flex items-center justify-between">
                <Trophy size={16} className={ghostMode === 'pb' ? 'text-cyan-400' : 'text-zinc-500'} />
                {ghostMode === 'pb' && <Check size={14} className="text-cyan-400" />}
              </div>
              <div>
                <span className={`text-[11px] font-black tracking-wide block leading-tight ${ghostMode === 'pb' ? 'text-white' : 'text-zinc-300'}`}>
                  PERSONAL BEST
                </span>
                <span className="text-[10px] text-zinc-400">
                  {pbGhost ? `${pbGhost.wpm} WPM` : 'Your best run'}
                </span>
              </div>
            </button>

            <button
              onClick={() => setGhostMode('rival')}
              className={`p-3 rounded-2xl border transition-all text-left flex flex-col gap-2 relative overflow-hidden ${
                ghostMode === 'rival'
                  ? 'bg-amber-500/10 border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.15)]'
                  : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05] text-zinc-400'
              }`}
            >
              <div className="flex items-center justify-between">
                <Users size={16} className={ghostMode === 'rival' ? 'text-amber-400' : 'text-zinc-500'} />
                {ghostMode === 'rival' && <Check size={14} className="text-amber-400" />}
              </div>
              <div>
                <span className={`text-[11px] font-black tracking-wide block leading-tight ${ghostMode === 'rival' ? 'text-white' : 'text-zinc-300'}`}>
                  GHOST NET
                </span>
                <span className="text-[10px] text-zinc-400 truncate block">
                  {rivalGhost ? `${rivalGhost.username} · ${rivalGhost.wpm}` : 'Race the board'}
                </span>
              </div>
            </button>

            <button
              onClick={() => setGhostMode('target')}
              className={`p-3 rounded-2xl border transition-all text-left flex flex-col gap-2 relative overflow-hidden ${
                ghostMode === 'target'
                  ? 'bg-purple-500/10 border-purple-500/40 shadow-[0_0_20px_rgba(168,85,247,0.15)]'
                  : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05] text-zinc-400'
              }`}
            >
              <div className="flex items-center justify-between">
                <Bot size={16} className={ghostMode === 'target' ? 'text-purple-400' : 'text-zinc-500'} />
                {ghostMode === 'target' && <Check size={14} className="text-purple-400" />}
              </div>
              <div>
                <span className={`text-[11px] font-black tracking-wide block leading-tight ${ghostMode === 'target' ? 'text-white' : 'text-zinc-300'}`}>
                  PACER BOT
                </span>
                <span className="text-[10px] text-zinc-400">
                  Fixed {ghostTargetWpm} WPM
                </span>
              </div>
            </button>
          </div>

          {/* Ghost Net rival picker */}
          {ghostMode === 'rival' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="space-y-3 mb-6"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-400 tracking-wider uppercase flex items-center gap-1.5">
                  <Users size={14} className="text-amber-400" /> Board
                </span>
                <span className="text-[11px] font-black text-amber-300 font-mono tracking-wider">
                  {modeKey ? formatModeLabel(modeKey) : 'UNRANKED'}
                </span>
              </div>

              {!modeKey ? (
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-start gap-3">
                  <CloudOff size={16} className="text-zinc-500 mt-0.5 shrink-0" />
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    This configuration has no shared board — custom text, mirrored runs and the daily
                    challenge are never comparable between players. Switch to a standard level and length
                    to race ghosts.
                  </p>
                </div>
              ) : rivalsUnavailable ? (
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-start gap-3">
                  <CloudOff size={16} className="text-zinc-500 mt-0.5 shrink-0" />
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Mode boards are not set up on this deployment yet. Run the{' '}
                    <span className="font-mono text-zinc-300">mode_boards_and_ghosts</span> migration to
                    start collecting ghosts.
                  </p>
                </div>
              ) : rivalsLoading && rivals.length === 0 ? (
                <div className="py-8 flex items-center justify-center gap-2 text-zinc-500">
                  <Loader2 size={16} className="animate-spin" />
                  <span className="text-[11px] font-bold tracking-widest uppercase">Scanning ghost net…</span>
                </div>
              ) : rivals.length === 0 ? (
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    No saved runs for {formatModeLabelLong(modeKey)} yet. Finish a test in this mode while
                    signed in and your run becomes the first ghost here.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {rivals.map((row, idx) => {
                    const isSelected = rivalGhost?.userId === row.user_id;
                    const isPending = rivalPendingId === row.user_id;
                    const isMe = !!currentUsername && row.username.toLowerCase() === currentUsername.toLowerCase();
                    return (
                      <button
                        key={row.user_id}
                        onClick={() => onSelectRival(row)}
                        disabled={isPending}
                        className={`w-full p-3 rounded-xl border transition-all flex items-center gap-3 text-left ${
                          isSelected
                            ? 'bg-amber-500/10 border-amber-500/40'
                            : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.06] hover:border-white/10'
                        } ${isPending ? 'opacity-60 cursor-wait' : 'cursor-pointer'}`}
                      >
                        <span
                          className="font-black text-sm w-6 shrink-0 text-center"
                          style={{ color: idx === 0 ? '#fbbf24' : idx === 1 ? '#e2e8f0' : idx === 2 ? '#f59e0b' : '#71717a' }}
                        >
                          {idx + 1}
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="text-xs font-black tracking-wider uppercase text-white truncate block">
                            {row.username}
                            {isMe && <span className="ml-1.5 text-[9px] text-zinc-500">(YOU)</span>}
                          </span>
                          <span className="text-[10px] text-zinc-500 font-mono">
                            {row.accuracy}% acc{row.consistency != null ? ` · ${row.consistency}% cons` : ''}
                          </span>
                        </span>
                        <span className="font-black text-lg text-white shrink-0 tabular-nums">{row.wpm}</span>
                        <span className="w-4 shrink-0 flex items-center justify-center">
                          {isPending
                            ? <Loader2 size={14} className="animate-spin text-amber-400" />
                            : isSelected
                            ? <Check size={14} className="text-amber-400" />
                            : null}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* Speed Preset Selector (Only for Target Mode) */}
          {ghostMode === 'target' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="space-y-4 mb-6"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-400 tracking-wider uppercase flex items-center gap-1.5">
                  <Gauge size={14} className="text-purple-400" /> Target Speed Presets
                </span>
                <span className="text-base font-black text-purple-300 font-mono">
                  {ghostTargetWpm} WPM
                </span>
              </div>

              {/* Preset Buttons */}
              <div className="grid grid-cols-4 gap-2">
                {PACER_PRESETS.map((speed) => (
                  <button
                    key={speed}
                    onClick={() => setGhostTargetWpm(speed)}
                    className={`py-2 rounded-xl text-xs font-black transition-all border ${
                      ghostTargetWpm === speed
                        ? 'bg-purple-500 text-white border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.4)]'
                        : 'bg-white/5 border-white/5 text-zinc-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {speed}
                  </button>
                ))}
              </div>

              {/* Slider */}
              <div className="pt-2">
                <input
                  type="range"
                  min="40"
                  max="220"
                  step="5"
                  value={ghostTargetWpm}
                  onChange={(e) => setGhostTargetWpm(parseInt(e.target.value, 10))}
                  aria-label="Ghost pacer target WPM"
                  className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
                <div className="flex justify-between text-[10px] text-zinc-500 font-mono mt-1">
                  <span>40 WPM</span>
                  <span>130 WPM</span>
                  <span>220 WPM</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Action Close / Done */}
          <button
            onClick={onClose}
            className="w-full py-3.5 rounded-2xl bg-white text-zinc-950 font-black text-sm tracking-widest uppercase hover:bg-zinc-200 transition-colors shadow-lg"
          >
            CONFIRM &amp; RACE
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
});

GhostPacerModal.displayName = 'GhostPacerModal';
