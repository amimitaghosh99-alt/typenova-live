import { memo, useEffect, useCallback } from 'react';
import { 
  X, 
  Cpu, 
  HeartHandshake, 
  Zap, 
  BrainCircuit, 
  Trophy, 
  ShieldCheck, 
  ArrowRight, 
  ExternalLink 
} from 'lucide-react';
import { motion } from 'framer-motion';
import type { Theme } from '@/data/constants';

interface UpdateAnnouncementModalProps {
  theme: Theme;
  onClose: () => void;
  onOpenChangelog: () => void;
}

const HIGHLIGHTS = [
  {
    icon: Cpu,
    tag: 'HARDWARE',
    title: 'WebHID Esports Benchmark',
    desc: 'Direct raw USB polling rate inspection measuring true 1000Hz / 8000Hz device reporting rates, packet jitter deltas, and debounce latency scoring.',
  },
  {
    icon: HeartHandshake,
    tag: 'COMMUNITY',
    title: 'High-End Patron Vault',
    desc: 'Consolidated supporter surface at /donate with live SVG community progress ring ($2,000 goal), milestone rail, UPI QR codes, and Patron Wall.',
  },
  {
    icon: Zap,
    tag: 'MULTIPLAYER',
    title: 'Tactical Cyber Sabotage',
    desc: 'Real-time multiplayer sabotage dock in custom lobbies: deploy EMP scramblers, keystroke latency jitter, and HUD visual distortion on opponents.',
  },
  {
    icon: BrainCircuit,
    tag: 'INTELLIGENCE',
    title: 'Leitner Word Weakness Trainer',
    desc: 'Diagnostic engine tracking word hesitation delay and typo rates with 5-box Leitner spaced repetition and 1-click procedural target drills.',
  },
  {
    icon: Trophy,
    tag: 'PROGRESSION',
    title: 'Operator Dossier & Hall of Legends',
    desc: '20 prestige achievements, Catmull-Rom SVG trend sparklines, real-time IKI rhythm jitter inspector, and Ghost Shadow replay inspection.',
  },
  {
    icon: ShieldCheck,
    tag: 'ENGINE',
    title: '27-Bug Zero-Defect Stability',
    desc: 'Synchronous input refs, accurate keystroke-log WPM math, React AuthProvider singleton, zero layout thrashing, and 100% test pass rate.',
  },
];

export const UpdateAnnouncementModal = memo(function UpdateAnnouncementModal({
  theme,
  onClose,
  onOpenChangelog,
}: UpdateAnnouncementModalProps) {
  const primaryRgb = theme.glowPrimary || '6, 182, 212';

  const handleDismiss = useCallback(() => {
    localStorage.setItem('typenova_seen_version', 'v3.0.0');
    onClose();
  }, [onClose]);

  const handleViewChangelog = useCallback(() => {
    localStorage.setItem('typenova_seen_version', 'v3.0.0');
    onClose();
    onOpenChangelog();
  }, [onClose, onOpenChangelog]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleDismiss();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleDismiss]);

  return (
    <div 
      className="fixed inset-0 z-[500] flex items-center justify-center bg-black/85 backdrop-blur-xl p-3 sm:p-6 overflow-hidden overscroll-none animate-in fade-in duration-200"
      onClick={handleDismiss}
      role="dialog"
      aria-modal="true"
      aria-labelledby="whats-new-title"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 14 }}
        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-3xl max-h-[88vh] flex flex-col rounded-3xl border border-white/15 bg-[#0b0c14] shadow-2xl overflow-hidden"
        style={{
          boxShadow: `0 25px 60px -15px rgba(0,0,0,0.95), 0 0 50px rgba(${primaryRgb}, 0.18)`
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient Top Glow */}
        <div 
          className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-36 rounded-full blur-3xl pointer-events-none opacity-20"
          style={{ background: `rgb(${primaryRgb})` }}
        />

        {/* ── HEADER ────────────────────────────────────────── */}
        <div className="relative z-10 shrink-0 p-5 sm:p-6 pb-4 border-b border-white/10 bg-[#0e1019] flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2.5">
              <span 
                className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black tracking-widest uppercase border flex items-center gap-1.5 shadow-sm"
                style={{
                  backgroundColor: `rgba(${primaryRgb}, 0.12)`,
                  borderColor: `rgba(${primaryRgb}, 0.35)`,
                  color: `rgb(${primaryRgb})`,
                }}
              >
                <span 
                  className="w-1.5 h-1.5 rounded-full animate-ping" 
                  style={{ backgroundColor: `rgb(${primaryRgb})` }} 
                />
                NEW MAJOR RELEASE
              </span>
              <span className="text-xs font-mono font-bold text-zinc-400">
                v3.0.0 • September 2026
              </span>
            </div>

            <h2 id="whats-new-title" className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              What's New in <span style={{ color: `rgb(${primaryRgb})` }}>TypeNova 3.0</span>
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 font-medium max-w-xl">
              Esports hardware diagnostics, high-end community patronage, tactical sabotage mechanics, and ergonomic spaced repetition.
            </p>
          </div>

          <button
            onClick={handleDismiss}
            aria-label="Close update announcement"
            className="p-2 rounded-xl text-zinc-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 transition-colors cursor-pointer shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── HIGHLIGHTS GRID ───────────────────────────────── */}
        <div className="relative z-10 flex-1 overflow-y-auto custom-scrollbar p-5 sm:p-6 space-y-4 bg-[#0b0c14]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {HIGHLIGHTS.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div 
                  key={idx}
                  className="relative group p-3.5 rounded-2xl border border-white/[0.10] bg-[#12141f] hover:bg-[#161926] hover:border-white/20 transition-all duration-300 flex flex-col justify-between gap-2.5 shadow-md"
                >
                  <div className="flex items-start gap-3">
                    <div 
                      className="p-2.5 rounded-xl border shrink-0 transition-transform duration-300 group-hover:scale-105"
                      style={{
                        backgroundColor: `rgba(${primaryRgb}, 0.12)`,
                        borderColor: `rgba(${primaryRgb}, 0.35)`,
                        color: `rgb(${primaryRgb})`,
                      }}
                    >
                      <Icon size={17} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[9px] font-mono font-bold tracking-widest text-zinc-400 uppercase bg-white/[0.06] px-1.5 py-0.5 rounded">
                          {item.tag}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-white group-hover:text-cyan-200 transition-colors">
                        {item.title}
                      </h3>
                      <p className="text-xs text-zinc-400 leading-relaxed mt-1">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Impact Stats Banner */}
          <div className="p-3.5 rounded-2xl border border-white/10 bg-[#12141f] flex flex-wrap items-center justify-around gap-3 text-center">
            <div>
              <div className="text-lg font-mono font-black text-white">28</div>
              <div className="text-[10px] font-mono tracking-wider text-zinc-400 uppercase">Bug Fixes</div>
            </div>
            <div className="w-1 h-6 bg-white/10 rounded-full hidden sm:block" />
            <div>
              <div className="text-lg font-mono font-black text-white">16</div>
              <div className="text-[10px] font-mono tracking-wider text-zinc-400 uppercase">System Tweaks</div>
            </div>
            <div className="w-1 h-6 bg-white/10 rounded-full hidden sm:block" />
            <div>
              <div className="text-lg font-mono font-black text-white">58,500+</div>
              <div className="text-[10px] font-mono tracking-wider text-zinc-400 uppercase">Lines Polished</div>
            </div>
            <div className="w-1 h-6 bg-white/10 rounded-full hidden sm:block" />
            <div>
              <div 
                className="text-lg font-mono font-black"
                style={{ color: `rgb(${primaryRgb})` }}
              >
                100%
              </div>
              <div className="text-[10px] font-mono tracking-wider text-zinc-400 uppercase">Zero-Defect Pass</div>
            </div>
          </div>
        </div>

        {/* ── FOOTER ACTIONS ─────────────────────────────────── */}
        <div className="relative z-10 shrink-0 p-4 sm:p-5 pt-3 border-t border-white/10 bg-[#0e1019] flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            onClick={handleViewChangelog}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-white/15 bg-white/[0.04] hover:bg-white/[0.09] hover:border-white/30 text-xs font-mono font-bold tracking-wider text-zinc-300 hover:text-white transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>VIEW FULL CHANGELOG</span>
            <ExternalLink size={13} />
          </button>

          <button
            onClick={handleDismiss}
            className="w-full sm:w-auto px-7 py-2.5 rounded-xl font-mono text-xs font-black tracking-widest uppercase transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer shadow-lg hover:scale-[1.02] active:scale-[0.98]"
            style={{
              backgroundColor: `rgb(${primaryRgb})`,
              color: '#000',
              boxShadow: `0 0 25px rgba(${primaryRgb}, 0.45)`,
            }}
          >
            <span>LET'S TYPE</span>
            <ArrowRight size={14} className="stroke-[3]" />
          </button>
        </div>
      </motion.div>
    </div>
  );
});
