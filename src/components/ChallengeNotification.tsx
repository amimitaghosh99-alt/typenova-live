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
      className={`fixed top-6 left-1/2 -translate-x-1/2 z-[700] w-[380px] max-w-[92vw] transition-all duration-200 ${
        isExiting
          ? 'opacity-0 -translate-y-4 scale-95 pointer-events-none'
          : 'opacity-100 translate-y-0 scale-100'
      }`}
      style={{ animation: isExiting ? 'none' : 'challengeSlideDown 0.28s cubic-bezier(0.16,1,0.3,1) forwards' }}
    >
      <style>{`
        @keyframes challengeSlideDown {
          from { opacity: 0; transform: translate(-50%, -20px) scale(0.95); }
          to   { opacity: 1; transform: translate(-50%, 0)    scale(1); }
        }
      `}</style>

      {/* Solid backdrop blur container for 100% readability */}
      <div className="relative rounded-2xl border-2 border-cyan-500/40 bg-slate-950/95 backdrop-blur-2xl overflow-hidden shadow-[0_0_30px_rgba(6,182,212,0.3)] font-mono">
        {/* Glow accent */}
        <div className="absolute -top-16 -right-16 w-40 h-40 bg-cyan-500/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-rose-500/15 rounded-full blur-2xl pointer-events-none" />

        {/* Countdown bar */}
        <div className="w-full h-1.5 bg-slate-900/90 rounded-t-2xl overflow-hidden">
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

        <div className="p-4 sm:p-5 relative z-10">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500/20 to-orange-500/20 border border-rose-500/50 flex items-center justify-center shadow-[0_0_15px_rgba(244,63,94,0.3)] shrink-0">
                <Swords size={20} className="text-rose-400 animate-pulse" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest">Incoming Challenge</p>
                <p className="text-sm font-black text-white leading-tight">
                  <span className="text-cyan-300 font-extrabold">{challenge.from}</span> wants to race!
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-[10px] font-black shrink-0 ml-2 bg-slate-900/80 px-2 py-1 rounded-lg border border-white/10">
              <Clock size={11} className={timeLeft <= 10 ? 'text-rose-400 animate-pulse' : 'text-zinc-400'} />
              <span className={timeLeft <= 10 ? 'text-rose-400 font-bold' : 'text-zinc-300'}>{timeLeft}s</span>
            </div>
          </div>

          {/* ELO info */}
          <div className="flex items-center justify-between mb-4 px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs font-bold">
            <span className="flex items-center gap-1.5 text-zinc-300">
              <Zap size={12} className="text-amber-400 shrink-0" /> Challenger ELO:
            </span>
            <span className="text-amber-300 font-black px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30">
              {challenge.fromElo}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2.5">
            <button
              onClick={handleAccept}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-black text-xs tracking-wider shadow-[0_0_15px_rgba(52,211,153,0.3)] hover:shadow-[0_0_20px_rgba(52,211,153,0.5)] transition-all hover:scale-105 active:scale-100"
            >
              <Swords size={15} />
              ACCEPT
            </button>
            <button
              onClick={handleReject}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 font-bold text-xs tracking-wider hover:bg-rose-500/25 transition-all hover:scale-105 active:scale-100"
            >
              <X size={15} />
              DECLINE
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
