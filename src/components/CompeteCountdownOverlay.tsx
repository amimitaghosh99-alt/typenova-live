import { memo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { RacerState, RaceConfig } from '@/hooks/useRace';
import type { Theme } from '@/data/constants';
import { LANE_COLORS } from '@/components/RaceTrack';

interface CompeteCountdownOverlayProps {
  countdown: number;
  roomCode: string;
  lobbyConfig?: RaceConfig;
  players: RacerState[];
  selfId: string;
  theme?: Theme;
}

const COUNTDOWN_STATUS_MESSAGES: Record<number, { title: string; subtitle: string }> = {
  5: { title: 'GRID INITIALIZATION', subtitle: 'Establishing telemetry links with all pilots' },
  4: { title: 'SYSTEMS CALIBRATION', subtitle: 'Synchronizing passage seed and input channels' },
  3: { title: 'COMBAT HEXES ARMED', subtitle: 'Cyber sabotage and energy matrices ready' },
  2: { title: 'CARETS SYNCHRONIZED', subtitle: 'Hands on home row — maximum focus' },
  1: { title: 'LAUNCH IMMINENT', subtitle: 'All systems green — engage on launch!' },
};

/** High-tech Web Audio pip for tactile esports launch feedback */
const playCountdownTone = (count: number) => {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    const isLaunch = count === 1;
    osc.type = isLaunch ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(isLaunch ? 880 : 380 + (5 - count) * 75, ctx.currentTime);

    gain.gain.setValueAtTime(0.09, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + (isLaunch ? 0.22 : 0.12));

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + (isLaunch ? 0.22 : 0.12));
  } catch {
    // Audio context may be restricted before user interaction
  }
};

export const CompeteCountdownOverlay = memo(function CompeteCountdownOverlay({
  countdown,
  roomCode,
  lobbyConfig,
  players,
  selfId,
  theme,
}: CompeteCountdownOverlayProps) {
  const glowPrimary = theme?.glowPrimary || '34, 211, 238';

  // Play subtle synthesis tone on tick
  useEffect(() => {
    playCountdownTone(countdown);
  }, [countdown]);

  const currentStatus = COUNTDOWN_STATUS_MESSAGES[countdown] || {
    title: 'RACE ENGAGED',
    subtitle: 'Type to accelerate',
  };

  return (
    <div className="fixed inset-0 z-[1000] w-screen h-screen flex flex-col items-center justify-between py-8 sm:py-12 px-4 sm:px-8 select-none pointer-events-auto overflow-hidden">
      {/* ── Layer 1: Deep Frosted Liquid Glass & Sci-Fi Carbon Vignette ── */}
      <div className="absolute inset-0 bg-[#040508]/92 backdrop-blur-3xl -z-10" />

      {/* Layer 2: Subtle Isometric Tech Grid */}
      <div
        className="absolute inset-0 opacity-[0.035] pointer-events-none -z-10"
        style={{
          backgroundImage: `linear-gradient(to right, rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.15) 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Layer 3: Dynamic Theme Radiant Bloom centered behind the number */}
      <motion.div
        key={`bloom-${countdown}`}
        initial={{ opacity: 0.35, scale: 0.85 }}
        animate={{ opacity: 0.85, scale: 1.15 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="absolute inset-0 pointer-events-none -z-10"
        style={{
          background: `radial-gradient(circle at 50% 48%, rgba(${glowPrimary}, 0.25) 0%, rgba(${glowPrimary}, 0.06) 42%, transparent 72%)`,
        }}
      />

      {/* Layer 4: Deep Perimeter Vignette */}
      <div
        className="absolute inset-0 pointer-events-none -z-10"
        style={{
          boxShadow: 'inset 0 0 140px rgba(0, 0, 0, 0.95), inset 0 0 60px rgba(0, 0, 0, 0.8)',
        }}
      />

      {/* ── TOP HUD: Match Header & F1 Telemetry Starting Light Rack ── */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-3xl flex flex-col items-center gap-4 relative z-10"
      >
        {/* Top Badges */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          <div
            className="flex items-center gap-2 px-3.5 py-1 rounded-full glass-panel border font-mono text-[10px] tracking-widest font-black uppercase text-zinc-300"
            style={{
              borderColor: `rgba(${glowPrimary}, 0.3)`,
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
            }}
          >
            <span
              className="w-2 h-2 rounded-full animate-ping"
              style={{
                backgroundColor: `rgb(${glowPrimary})`,
                boxShadow: `0 0 8px rgb(${glowPrimary})`,
              }}
            />
            <span className="text-white">LIVE RACE LAUNCH</span>
            <span className="text-zinc-500 font-bold">·</span>
            <span style={{ color: `rgb(${glowPrimary})` }}>ROOM {roomCode}</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 font-mono text-[10px] tracking-wider text-zinc-400">
            <span className="font-bold text-zinc-300 uppercase">{lobbyConfig?.mode || 'WORDS'}</span>
            <span className="text-zinc-600">|</span>
            <span className="text-zinc-300 tabular-nums">{lobbyConfig?.words || 50} WORDS</span>
          </div>
        </div>

        {/* F1 Precision Stage Ignition Rack (5 Stages) */}
        <div className="flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-2.5 rounded-2xl glass-panel border border-white/10 bg-black/60 shadow-[0_8px_32px_rgba(0,0,0,0.6)] backdrop-blur-xl">
          {[5, 4, 3, 2, 1].map((step) => {
            const isLit = countdown <= step;
            return (
              <div key={step} className="flex flex-col items-center gap-1">
                <div
                  className="w-7 sm:w-12 md:w-14 h-2 sm:h-2.5 rounded-full transition-all duration-300"
                  style={
                    isLit
                      ? {
                          backgroundColor: `rgb(${glowPrimary})`,
                          boxShadow: `0 0 14px rgba(${glowPrimary}, 0.95), 0 0 28px rgba(${glowPrimary}, 0.45)`,
                        }
                      : {
                          backgroundColor: 'rgba(255, 255, 255, 0.06)',
                          border: '1px solid rgba(255, 255, 255, 0.05)',
                        }
                  }
                />
                <span
                  className="text-[8.5px] sm:text-[9px] font-mono font-black tabular-nums transition-colors duration-200"
                  style={{
                    color: isLit ? `rgb(${glowPrimary})` : 'rgba(255, 255, 255, 0.25)',
                  }}
                >
                  0{step}
                </span>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* ── CENTER: Kinetic Animated Hero Number & Sonic Shockwave ── */}
      <div className="relative flex flex-col items-center justify-center my-auto w-full max-w-2xl py-6">
        {/* Kinetic Shockwave Rings on Tick */}
        <AnimatePresence mode="popLayout">
          <motion.div
            key={`shockwave-${countdown}`}
            initial={{ scale: 0.5, opacity: 0.85 }}
            animate={{ scale: 2.3, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
            className="absolute w-48 h-48 sm:w-64 sm:h-64 rounded-full border-2 pointer-events-none"
            style={{
              borderColor: `rgba(${glowPrimary}, 0.65)`,
              boxShadow: `0 0 35px rgba(${glowPrimary}, 0.35)`,
            }}
          />
        </AnimatePresence>

        {/* Explosive Dynamic Number */}
        <AnimatePresence mode="popLayout">
          <motion.div
            key={`number-${countdown}`}
            initial={{ scale: 1.6, opacity: 0, filter: 'blur(16px)', y: -16 }}
            animate={{ scale: 1, opacity: 1, filter: 'blur(0px)', y: 0 }}
            exit={{ scale: 0.7, opacity: 0, filter: 'blur(14px)', y: 22 }}
            transition={{
              type: 'spring',
              stiffness: 420,
              damping: 26,
              mass: 0.75,
            }}
            className="relative flex items-center justify-center"
          >
            <span
              className="font-display font-black text-[10rem] sm:text-[14rem] md:text-[18rem] tabular-nums tracking-tighter leading-none select-none drop-shadow-2xl"
              style={{
                color: '#ffffff',
                textShadow: `0 0 60px rgba(${glowPrimary}, 0.85), 0 0 120px rgba(${glowPrimary}, 0.4), 0 6px 30px rgba(0,0,0,0.95)`,
              }}
            >
              {countdown}
            </span>
          </motion.div>
        </AnimatePresence>

        {/* Tactical Status Readout */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`status-${countdown}`}
            initial={{ opacity: 0, y: 10, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -10, filter: 'blur(6px)' }}
            transition={{ duration: 0.25 }}
            className="flex flex-col items-center text-center mt-2 sm:mt-4 gap-1 relative z-10"
          >
            <span
              className="font-display font-black text-xs sm:text-sm md:text-base tracking-[0.25em] uppercase text-white drop-shadow-md"
              style={{
                textShadow: `0 0 12px rgba(${glowPrimary}, 0.6)`,
              }}
            >
              {currentStatus.title}
            </span>
            <span className="font-mono text-[10px] sm:text-xs tracking-wider text-zinc-400 max-w-md">
              {currentStatus.subtitle}
            </span>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── BOTTOM HUD: Racer Grid Lineup & Telemetry Status ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-3xl flex flex-col items-center gap-3 relative z-10"
      >
        {/* Racer Lineup Bar */}
        <div className="w-full px-4 sm:px-6 py-3 rounded-2xl glass-panel border border-white/10 bg-black/60 shadow-xl backdrop-blur-xl flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            <span className="text-[10px] font-mono font-bold tracking-widest uppercase text-zinc-400">
              GRID LOCKED ({players.length} RACERS)
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {players.map((p, idx) => {
              const isMe = p.id === selfId;
              const laneColor = p.laneColor || LANE_COLORS[idx % LANE_COLORS.length];
              return (
                <div
                  key={p.id}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-mono text-[10px] transition-all ${
                    isMe
                      ? 'bg-white/10 border-white/20 text-white font-bold'
                      : 'bg-black/40 border-white/5 text-zinc-300'
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{
                      backgroundColor: laneColor,
                      boxShadow: `0 0 6px ${laneColor}`,
                    }}
                  />
                  <span className="truncate max-w-[100px]">{p.name}</span>
                  {isMe && <span className="text-zinc-500 text-[8px] font-normal">(YOU)</span>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Hint */}
        <p className="font-mono text-[9px] uppercase tracking-[0.25em] text-zinc-500 text-center">
          First keystroke registers immediately when timer reaches zero
        </p>
      </motion.div>
    </div>
  );
});
