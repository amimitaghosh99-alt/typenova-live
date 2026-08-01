import { useEffect, useState } from 'react';
import { Swords, X, Zap, Clock } from 'lucide-react';
import type { PendingChallenge } from '@/hooks/useChallenges';

interface ChallengeNotificationProps {
  challenge: PendingChallenge;
  onAccept: () => void;
  onReject: () => void;
}

export function ChallengeNotification({ challenge, onAccept, onReject }: ChallengeNotificationProps) {
  const [timeLeft, setTimeLeft] = useState(30);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const remaining = Math.ceil((challenge.expiresAt - Date.now()) / 1000);
    setTimeLeft(Math.max(0, remaining));

    const interval = setInterval(() => {
      const left = Math.ceil((challenge.expiresAt - Date.now()) / 1000);
      setTimeLeft(Math.max(0, left));
      if (left <= 0) clearInterval(interval);
    }, 500);

    return () => clearInterval(interval);
  }, [challenge.expiresAt]);

  const handleAccept = () => {
    setIsExiting(true);
    setTimeout(onAccept, 160);
  };

  const handleReject = () => {
    setIsExiting(true);
    setTimeout(onReject, 160);
  };

  const progressPct = (timeLeft / 30) * 100;

  return (
    <div
      className={`fixed top-5 right-5 z-[600] w-[340px] transition-all duration-200 ${
        isExiting
          ? 'opacity-0 translate-x-8 scale-95 pointer-events-none'
          : 'opacity-100 translate-x-0 scale-100'
      }`}
      style={{ animation: isExiting ? 'none' : 'challengeSlideIn 0.28s cubic-bezier(0.16,1,0.3,1) forwards' }}
    >
      <style>{`
        @keyframes challengeSlideIn {
          from { opacity: 0; transform: translateX(60px) scale(0.92); }
          to   { opacity: 1; transform: translateX(0)    scale(1); }
        }
      `}</style>

      <div className="glass-panel relative rounded-2xl border border-white/15 bg-slate-950/80 overflow-hidden shadow-2xl shadow-cyan-950/40 font-mono">
        {/* Glow accent */}
        <div className="absolute -top-16 -right-16 w-40 h-40 bg-cyan-500/15 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Countdown bar */}
        <div className="w-full h-1 bg-slate-900/80 rounded-t-2xl overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${progressPct}%`,
              background: progressPct > 50
                ? 'linear-gradient(90deg, #06b6d4, #22d3ee)'
                : progressPct > 25
                  ? 'linear-gradient(90deg, #f59e0b, #fbbf24)'
                  : 'linear-gradient(90deg, #f43f5e, #fb7185)',
            }}
          />
        </div>

        <div className="p-4 relative z-10">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-500/20 to-orange-500/20 border border-rose-500/40 flex items-center justify-center shadow-[0_0_12px_rgba(244,63,94,0.2)] shrink-0">
                <Swords size={18} className="text-rose-400" />
              </div>
              <div>
                <p className="text-[10px] text-zinc-400 uppercase tracking-wider">Incoming Challenge</p>
                <p className="text-sm font-bold text-white leading-tight">
                  <span className="text-cyan-300">{challenge.from}</span> wants to race!
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-[10px] font-bold shrink-0 ml-2">
              <Clock size={11} className={timeLeft <= 10 ? 'text-rose-400 animate-pulse' : 'text-zinc-500'} />
              <span className={timeLeft <= 10 ? 'text-rose-400' : 'text-zinc-400'}>{timeLeft}s</span>
            </div>
          </div>

          {/* ELO info */}
          <div className="flex items-center gap-2 mb-4 px-2 py-1.5 rounded-xl bg-slate-900/60 border border-white/8 text-[10px]">
            <Zap size={11} className="text-amber-400 shrink-0" />
            <span className="text-zinc-400">Challenger ELO:</span>
            <span className="text-amber-300 font-bold">{challenge.fromElo}</span>
          </div>

          {/* Buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleAccept}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-bold tracking-wide hover:bg-emerald-500/25 hover:shadow-[0_0_16px_rgba(52,211,153,0.25)] transition-all hover:scale-105 active:scale-100"
            >
              <Swords size={14} />
              Accept
            </button>
            <button
              onClick={handleReject}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold tracking-wide hover:bg-rose-500/20 transition-all hover:scale-105 active:scale-100"
            >
              <X size={14} />
              Decline
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
