import { memo, useEffect, useCallback } from 'react';
import { 
  X, 
  Zap, 
  ArrowRight, 
  ExternalLink,
  Activity,
  Lock,
  UserCheck,
  Maximize2,
  ShieldAlert
} from 'lucide-react';
import { motion } from 'framer-motion';
import type { Theme } from '@/data/constants';
import { APP_VERSION } from '@/data/version';

interface UpdateAnnouncementModalProps {
  theme: Theme;
  onClose: () => void;
  onOpenChangelog: () => void;
}

const HIGHLIGHTS = [
  {
    icon: Activity,
    tag: 'TELEMETRY',
    title: 'Synthetic Client Health Diagnostics',
    desc: 'Sub-20ms proactive subsystem probing: Storage quota, Web Audio sample rate, low-latency WebSocket ping, Supabase token validity, and BYOK AI endpoints.',
  },
  {
    icon: Lock,
    tag: 'PRIVACY',
    title: 'Zero-Knowledge BYOK AI Direct SSL',
    desc: 'Direct browser HTTPS inference to Groq, OpenAI, Gemini, and OpenRouter. Keys never transit backend servers, with dual session/local storage toggles.',
  },
  {
    icon: UserCheck,
    tag: 'CONVERSION',
    title: 'Guest First-Win 30s Speed Test',
    desc: 'Frictionless guest entry CTA, instant benchmark telemetry banner, 1-click Google OAuth score ingestion, and glassmorphic feature showcases.',
  },
  {
    icon: Maximize2,
    tag: 'DISPLAY',
    title: 'In-Webapp Display Scaling & 1:1 OS DPI',
    desc: 'Granular 70%-150% zoom engine with instant presets and 1-click Windows 125%/150% high-DPI counteraction for pixel-perfect clarity.',
  },
  {
    icon: ShieldAlert,
    tag: 'SECURITY',
    title: '9-Bug Hardening & Enterprise Headers',
    desc: 'Adversarial defect resolution across storage cleanup, fetch abort timeouts, AudioContext limits, key regex masking, and nosniff/CSP headers.',
  },
  {
    icon: Zap,
    tag: 'MULTIPLAYER',
    title: 'Tactical Cyber Sabotage & Signal Bus',
    desc: 'Real-time sabotage dock in custom lobbies with EMP scramblers and input jitter, backed by typed proactive health telemetry.',
  },
];

export const UpdateAnnouncementModal = memo(function UpdateAnnouncementModal({
  theme,
  onClose,
  onOpenChangelog,
}: UpdateAnnouncementModalProps) {
  const primaryRgb = theme.glowPrimary || '6, 182, 212';

  const handleDismiss = useCallback(() => {
    localStorage.setItem('typenova_seen_version', APP_VERSION);
    onClose();
  }, [onClose]);

  const handleViewChangelog = useCallback(() => {
    localStorage.setItem('typenova_seen_version', APP_VERSION);
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
                {APP_VERSION} • September 2026
              </span>
            </div>

            <h2 id="whats-new-title" className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              What's New in <span style={{ color: `rgb(${primaryRgb})` }}>TypeNova {APP_VERSION}</span>
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 font-medium max-w-xl">
              Synthetic client diagnostics, Zero-Knowledge BYOK privacy, guest speed test onboarding, and in-webapp display scaling.
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
