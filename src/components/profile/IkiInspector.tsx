import { useMemo } from 'react';
import { Activity, Zap, AlertTriangle, Play, Sparkles, Loader2, FastForward } from 'lucide-react';
import type { Theme } from '@/data/constants';
import type { IKIMetrics, DigraphStat } from '@/lib/ikiEngine';

export interface IkiInspectorProps {
  ikiMetrics?: IKIMetrics;
  theme: Theme;
  onStartNeuroDrill?: (targets: string[]) => void;
  isGeneratingDrill?: boolean;
  compact?: boolean;
}

export function IkiInspector({
  ikiMetrics,
  theme,
  onStartNeuroDrill,
  isGeneratingDrill = false,
  compact = false,
}: IkiInspectorProps) {
  if (!ikiMetrics || ikiMetrics.totalTransitions < 3) {
    return null;
  }

  const {
    medianIki,
    fluidityScore,
    hesitationCount,
    slowestTransitions,
    stumbledTransitions,
    recommendedDrillDigraphs,
    totalTransitions,
  } = ikiMetrics;

  const glowPrimary = theme?.glowPrimary || '6, 182, 212';
  const glowSecondary = theme?.glowSecondary || '34, 211, 238';

  // Rhythm classification label
  const rhythmStatus = useMemo(() => {
    if (fluidityScore >= 92) return { label: 'SYNCHRONIZED FLOW', color: 'text-emerald-300', bg: 'bg-emerald-500/10 border-emerald-500/30' };
    if (fluidityScore >= 80) return { label: 'STEADY CADENCE', color: 'text-sky-300', bg: 'bg-sky-500/10 border-sky-500/30' };
    if (fluidityScore >= 65) return { label: 'MILD JITTER', color: 'text-amber-300', bg: 'bg-amber-500/10 border-amber-500/30' };
    return { label: 'RHYTHM BOTTLENECK', color: 'text-rose-300', bg: 'bg-rose-500/10 border-rose-500/30' };
  }, [fluidityScore]);

  // Combined bottleneck list (stumbled first, then slowest)
  const combinedBottlenecks = useMemo(() => {
    const list: DigraphStat[] = [];
    const seen = new Set<string>();

    for (const s of stumbledTransitions) {
      if (!seen.has(s.digraph)) {
        seen.add(s.digraph);
        list.push(s);
      }
    }

    for (const s of slowestTransitions) {
      if (!seen.has(s.digraph)) {
        seen.add(s.digraph);
        list.push(s);
      }
    }

    return list.slice(0, 6);
  }, [stumbledTransitions, slowestTransitions]);

  const handleLaunchAll = () => {
    if (!onStartNeuroDrill) return;
    const targets = recommendedDrillDigraphs.length > 0 ? recommendedDrillDigraphs : ['th', 'er', 'in'];
    onStartNeuroDrill(targets);
  };

  const handleLaunchSingle = (stat: DigraphStat) => {
    if (!onStartNeuroDrill || isGeneratingDrill) return;
    const target = `${stat.from}${stat.to}`.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (target.length >= 1) {
      onStartNeuroDrill([target]);
    }
  };

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
            <Activity size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base md:text-lg font-black tracking-wider uppercase text-white">
                MOTOR FLUIDITY & TRANSITION DIAGNOSTICS
              </h3>
              <span
                className={`text-[9px] font-black tracking-widest px-2.5 py-0.5 rounded-full border uppercase ${rhythmStatus.bg} ${rhythmStatus.color}`}
              >
                {rhythmStatus.label}
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-medium">
              Inter-Key Interval (IKI) millisecond latency across {totalTransitions} transitions
            </p>
          </div>
        </div>

        {onStartNeuroDrill && (
          <button
            onClick={handleLaunchAll}
            disabled={isGeneratingDrill}
            className="flex items-center gap-2.5 px-5 py-2.5 rounded-2xl font-mono text-xs font-black tracking-wider border transition-all cursor-pointer shadow-lg disabled:opacity-50"
            style={{
              backgroundColor: `rgba(${glowPrimary}, 0.16)`,
              borderColor: `rgba(${glowPrimary}, 0.45)`,
              color: `rgb(${glowPrimary})`,
              boxShadow: `0 0 20px rgba(${glowPrimary}, 0.20)`,
            }}
          >
            {isGeneratingDrill ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Sparkles size={14} />
            )}
            <span>
              {isGeneratingDrill
                ? 'SYNTHESIZING...'
                : `LAUNCH NEURO DRILL (${recommendedDrillDigraphs.length} PAIRS)`}
            </span>
          </button>
        )}
      </div>

      {/* Core Metrics Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 relative z-10">
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-col justify-between">
          <span className="text-[10px] font-black tracking-widest text-zinc-400 uppercase flex items-center gap-1.5">
            <Zap size={12} style={{ color: `rgb(${glowPrimary})` }} /> Median Latency
          </span>
          <div className="text-2xl sm:text-3xl font-black text-white font-mono my-1">
            {medianIki} <span className="text-xs text-zinc-500 font-bold">MS / KEY</span>
          </div>
          <span className="text-[10px] text-zinc-500">Typical finger transition gap</span>
        </div>

        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-col justify-between">
          <span className="text-[10px] font-black tracking-widest text-zinc-400 uppercase flex items-center gap-1.5">
            <FastForward size={12} className="text-emerald-400" /> Fluidity Index
          </span>
          <div className="text-2xl sm:text-3xl font-black text-white font-mono my-1">
            {fluidityScore}<span className="text-xs text-zinc-500 font-bold">%</span>
          </div>
          <span className="text-[10px] text-zinc-500">Cadence rhythm stability</span>
        </div>

        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-col justify-between">
          <span className="text-[10px] font-black tracking-widest text-zinc-400 uppercase flex items-center gap-1.5">
            <AlertTriangle size={12} className="text-amber-400" /> Pauses &gt;1.5s
          </span>
          <div className="text-2xl sm:text-3xl font-black text-white font-mono my-1">
            {hesitationCount} <span className="text-xs text-zinc-500 font-bold">PAUSES</span>
          </div>
          <span className="text-[10px] text-zinc-500">Hesitation interruptions</span>
        </div>

        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-col justify-between">
          <span className="text-[10px] font-black tracking-widest text-zinc-400 uppercase flex items-center gap-1.5">
            <Sparkles size={12} style={{ color: `rgb(${glowSecondary})` }} /> Bottlenecks
          </span>
          <div className="text-2xl sm:text-3xl font-black text-white font-mono my-1">
            {combinedBottlenecks.length} <span className="text-xs text-zinc-500 font-bold">FLAGGED</span>
          </div>
          <span className="text-[10px] text-zinc-500">Slow or stumbled n-grams</span>
        </div>
      </div>

      {/* Flagged Transition Chips */}
      {combinedBottlenecks.length > 0 && (
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black tracking-widest text-zinc-400 uppercase">
              DETECTED MOTOR BOTTLENECK DIGRAPHS (CLICK TO DRILL SPECIFIC TRANSITION)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {combinedBottlenecks.map((stat) => {
              const isErrorHeavy = stat.errorCount > 0;
              const typeLabel =
                stat.transitionType === 'crossover' ? 'Hand Crossover' :
                stat.transitionType === 'adjacent' ? 'Same-Hand Adjacent' :
                stat.transitionType === 'stretch' ? 'Awkward Stretch' :
                stat.transitionType === 'double_tap' ? 'Double Tap' : 'Standard';

              const isInteractive = Boolean(onStartNeuroDrill);

              return (
                <div
                  key={stat.digraph}
                  onClick={() => { if (isInteractive && !isGeneratingDrill) handleLaunchSingle(stat); }}
                  className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between ${
                    isInteractive ? 'cursor-pointer group' : 'cursor-default'
                  } ${
                    isGeneratingDrill ? 'opacity-60 cursor-not-allowed' : ''
                  } ${
                    isErrorHeavy
                      ? 'bg-rose-500/10 border-rose-500/30 hover:bg-rose-500/20'
                      : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.06] hover:border-white/15'
                  }`}
                  style={
                    !isErrorHeavy
                      ? {
                          borderColor: `rgba(${glowPrimary}, 0.25)`,
                        }
                      : undefined
                  }
                  title={
                    isGeneratingDrill
                      ? 'Synthesizing drill...'
                      : isInteractive
                      ? `Click to practice ${stat.digraph}`
                      : `${stat.digraph} bottleneck`
                  }
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center font-mono font-black text-sm text-white group-hover:scale-105 transition-transform">
                      {stat.from}{stat.to}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black font-mono text-white">
                          {stat.digraph}
                        </span>
                        <span className="text-[9px] font-mono text-zinc-500 uppercase px-1.5 py-0.5 rounded bg-white/5">
                          {typeLabel}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-[11px] font-mono mt-1">
                        <span className="text-zinc-300 font-bold">{stat.avgMs}ms avg</span>
                        <span className={stat.deltaVsMedianMs > 0 ? 'text-amber-400' : 'text-emerald-400'}>
                          {stat.deltaVsMedianMs > 0 ? `(+${stat.deltaVsMedianMs}ms)` : `(${stat.deltaVsMedianMs}ms)`}
                        </span>
                        {stat.errorCount > 0 && (
                          <span className="text-rose-400 font-bold">
                            · {stat.errorCount} {stat.errorCount === 1 ? 'error' : 'errors'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {isInteractive && (
                    <button
                      type="button"
                      aria-label={`Practice ${stat.digraph}`}
                      className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 group-hover:text-white group-hover:bg-white/10 transition-colors shrink-0"
                    >
                      <Play size={10} className="ml-0.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
