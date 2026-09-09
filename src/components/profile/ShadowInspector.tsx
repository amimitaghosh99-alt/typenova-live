import { useMemo } from 'react';
import { Headphones, Radio, Zap, Activity, FastForward, Waves } from 'lucide-react';
import type { Theme } from '@/data/constants';
import type { ShadowMetrics } from '@/lib/shadowEngine';

export interface ShadowInspectorProps {
  shadowMetrics?: ShadowMetrics;
  theme: Theme;
  compact?: boolean;
}

export function ShadowInspector({
  shadowMetrics,
  theme,
  compact = false,
}: ShadowInspectorProps) {
  if (!shadowMetrics || shadowMetrics.totalWordsShadowed < 2) {
    return null;
  }

  const {
    meanLagMs,
    medianLagMs,
    auditoryFluidity,
    catchupBurstWpm,
    speedMultiplier,
    totalWordsShadowed,
    synchronizedWords,
    wordTelemetry,
  } = shadowMetrics;

  const glowPrimary = theme?.glowPrimary || '34, 211, 238';
  const glowSecondary = theme?.glowSecondary || '99, 102, 241';

  // Cadence status badge
  const cadenceStatus = useMemo(() => {
    if (auditoryFluidity >= 85) return { label: 'TIGHT SYNCHRONIZATION', color: 'text-emerald-300', bg: 'bg-emerald-500/10 border-emerald-500/30' };
    if (auditoryFluidity >= 70) return { label: 'STEADY EAR-TO-FINGER', color: 'text-sky-300', bg: 'bg-sky-500/10 border-sky-500/30' };
    if (auditoryFluidity >= 50) return { label: 'AUDITORY BUFFER DRIFT', color: 'text-amber-300', bg: 'bg-amber-500/10 border-amber-500/30' };
    return { label: 'HEAVY STREAM LAG', color: 'text-rose-300', bg: 'bg-rose-500/10 border-rose-500/30' };
  }, [auditoryFluidity]);

  const syncPercent = Math.round((synchronizedWords / Math.max(1, totalWordsShadowed)) * 100);

  return (
    <div
      className={`glass-panel rounded-3xl p-6 md:p-8 mb-10 border transition-all relative overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700 ${
        compact ? 'p-4' : ''
      }`}
      style={{
        borderColor: `rgba(${glowPrimary}, 0.28)`,
        boxShadow: `0 0 25px rgba(${glowPrimary}, 0.10)`,
      }}
    >
      {/* Background ambient lighting */}
      <div
        className="absolute top-0 right-0 w-72 h-72 rounded-full blur-[80px] pointer-events-none opacity-15"
        style={{
          background: `radial-gradient(circle, rgb(${glowPrimary}) 0%, transparent 70%)`,
        }}
      />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 relative z-10">
        <div className="flex items-center gap-3">
          <div
            className="p-3 rounded-2xl border"
            style={{
              backgroundColor: `rgba(${glowPrimary}, 0.12)`,
              borderColor: `rgba(${glowPrimary}, 0.35)`,
              color: `rgb(${glowPrimary})`,
            }}
          >
            <Headphones size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base md:text-lg font-black tracking-wider uppercase text-white">
                AUDITORY TRANSCRIPTION SHADOWING
              </h3>
              <span
                className={`text-[9px] font-black tracking-widest px-2.5 py-0.5 rounded-full border uppercase ${cadenceStatus.bg} ${cadenceStatus.color}`}
              >
                {cadenceStatus.label}
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-medium">
              Ear-to-finger synchronization at {speedMultiplier}x vocalized speech rate
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className="flex items-center gap-1.5 px-3 py-1 rounded-full border font-mono text-xs font-black tracking-wider"
            style={{
              backgroundColor: `rgba(${glowPrimary}, 0.14)`,
              borderColor: `rgba(${glowPrimary}, 0.40)`,
              color: `rgb(${glowPrimary})`,
            }}
          >
            <Radio size={12} className="animate-pulse" />
            {speedMultiplier}x AUDIO SPEED
          </span>
        </div>
      </div>

      {/* Core Metrics Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 relative z-10">
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-col justify-between">
          <span className="text-[10px] font-black tracking-widest text-zinc-400 uppercase flex items-center gap-1.5">
            <Zap size={12} style={{ color: `rgb(${glowPrimary})` }} /> Ear-to-Finger Latency
          </span>
          <div className="text-2xl sm:text-3xl font-black text-white font-mono my-1">
            {meanLagMs} <span className="text-xs text-zinc-500 font-bold">MS</span>
          </div>
          <span className="text-[10px] text-zinc-500">
            Median: {medianLagMs}ms {meanLagMs < 0 ? '(Anticipating)' : '(Trailing)'}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-col justify-between">
          <span className="text-[10px] font-black tracking-widest text-zinc-400 uppercase flex items-center gap-1.5">
            <Waves size={12} className="text-emerald-400" /> Auditory Fluidity
          </span>
          <div className="text-2xl sm:text-3xl font-black text-white font-mono my-1">
            {auditoryFluidity}<span className="text-xs text-zinc-500 font-bold">%</span>
          </div>
          <span className="text-[10px] text-zinc-500">Audio buffer stability index</span>
        </div>

        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-col justify-between">
          <span className="text-[10px] font-black tracking-widest text-zinc-400 uppercase flex items-center gap-1.5">
            <Activity size={12} className="text-sky-400" /> Synchronized Words
          </span>
          <div className="text-2xl sm:text-3xl font-black text-white font-mono my-1">
            {syncPercent}<span className="text-xs text-zinc-500 font-bold">%</span>
          </div>
          <span className="text-[10px] text-zinc-500">{synchronizedWords} of {totalWordsShadowed} within &lt;200ms</span>
        </div>

        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-col justify-between">
          <span className="text-[10px] font-black tracking-widest text-zinc-400 uppercase flex items-center gap-1.5">
            <FastForward size={12} style={{ color: `rgb(${glowSecondary})` }} /> Catch-Up Peak
          </span>
          <div className="text-2xl sm:text-3xl font-black text-white font-mono my-1">
            {catchupBurstWpm > 0 ? catchupBurstWpm : '—'}{' '}
            {catchupBurstWpm > 0 && <span className="text-xs text-zinc-500 font-bold">WPM</span>}
          </div>
          <span className="text-[10px] text-zinc-500">Burst speed while closing lag</span>
        </div>
      </div>

      {/* Word-by-Word Synchronization Strip */}
      {wordTelemetry.length > 0 && (
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black tracking-widest text-zinc-400 uppercase">
              SPEECH-TO-KEYSTROKE SYNCHRONIZATION TIMELINE
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto custom-scrollbar p-3 rounded-2xl bg-black/30 border border-white/5">
            {wordTelemetry.map((item, i) => {
              const isSync = item.leadOrLag === 'synchronized';
              const isLead = item.leadOrLag === 'lead';

              return (
                <div
                  key={i}
                  className={`px-2.5 py-1 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 border transition-all ${
                    isSync
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : isLead
                      ? 'bg-sky-500/10 border-sky-500/30 text-sky-300'
                      : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                  }`}
                  title={`${item.word}: ${item.lagMs > 0 ? `+${item.lagMs}ms lag` : `${item.lagMs}ms lead`}`}
                >
                  <span>{item.word}</span>
                  <span className="text-[9px] opacity-70">
                    {item.lagMs > 0 ? `+${item.lagMs}ms` : `${item.lagMs}ms`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
