import { useMemo } from 'react';
import { Brain, Zap, Target, RotateCcw, X, ArrowRight, Loader2, Bot } from 'lucide-react';
import type { Theme } from '@/data/constants';
import { getAruPersona, ARU_PERSONAS, type AruPersona } from '@/lib/aiClient';

interface AIDrillResultsScreenProps {
  wpm: number;
  accuracy: number;
  theme: Theme;
  smartDrillKeys: string[];
  isGenerating: boolean;
  onGenerateAnother: () => void;
  onRetry: () => void;
  onExit: () => void;
}

const getFeedbackMessage = (acc: number, keys: string[], persona: AruPersona = 'tactical'): string => {
  const keysList = keys.length > 0 ? keys.map(k => `[${k.toUpperCase()}]`).join(', ') : 'targeted key clusters';
  
  if (persona === 'zen') {
    if (acc >= 98) return `Uniform cadence established across ${keysList}. Timing variance compressed under 15ms.`;
    if (acc >= 90) return `Consistent pacing through ${keysList}. Keep fingers relaxed and maintain steady metronome timing.`;
    return `Pacing variance elevated on ${keysList}. Reduce velocity slightly to allow motor memory to stabilize.`;
  }
  if (persona === 'cyberpunk') {
    if (acc >= 98) return `Telemetry optimal: 0% parity loss across ${keysList}. Transition latency normalized to baseline.`;
    if (acc >= 90) return `Target cluster ${keysList} stabilized. Residual error rate at ${100 - acc}%.`;
    return `Telemetry alert: latency outliers detected on ${keysList}. Another practice set will flatten the variance curve.`;
  }
  if (persona === 'hype') {
    if (acc >= 98) return `Clean high-speed execution! High burst throughput locked in on ${keysList} at ${acc}% accuracy.`;
    if (acc >= 90) return `Strong velocity on ${keysList}. One more targeted run to lock down 100% precision.`;
    return `Solid burst attempts on ${keysList}. Quick reset and drill the transitions to push top speed.`;
  }
  // Default: tactical (Precision)
  if (acc === 100) return `Flawless mechanical execution. Key travel and finger return for ${keysList} are fully stabilized.`;
  if (acc >= 95) return `High-tier precision on ${keysList}. Micro-transition latency significantly reduced.`;
  if (acc >= 90) return `Consistent recovery reps across ${keysList}. Keep finger pads centered on the keycaps.`;
  return `Error cluster concentrated on ${keysList}. Prioritize clean finger placement and return over raw velocity.`;
};

export function AIDrillResultsScreen({
  wpm,
  accuracy,
  theme,
  smartDrillKeys,
  isGenerating,
  onGenerateAnother,
  onRetry,
  onExit
}: AIDrillResultsScreenProps) {
  
  const personaKey = useMemo(() => getAruPersona(), []);
  const persona = ARU_PERSONAS[personaKey] || ARU_PERSONAS.tactical;
  
  const feedbackMsg = useMemo(
    () => getFeedbackMessage(accuracy, smartDrillKeys, personaKey),
    [accuracy, smartDrillKeys, personaKey]
  );

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] w-full max-w-4xl mx-auto px-4 animate-in fade-in zoom-in-95 duration-700">
      
      {/* Main Container */}
      <div
        className="relative w-full glass-panel glass-refract rounded-[2.5rem] p-10 md:p-14 overflow-hidden z-10 border"
        style={{
          borderColor: `rgba(${theme?.glowPrimary || '6, 182, 212'}, 0.3)`,
          boxShadow: `0 0 50px rgba(${theme?.glowPrimary || '6, 182, 212'}, 0.08)`,
        }}
      >
        
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-12">
          <div
            className="w-20 h-20 rounded-3xl flex items-center justify-center mb-5 border shadow-lg backdrop-blur-xl"
            style={{
              backgroundColor: `rgba(${theme?.glowPrimary || '6, 182, 212'}, 0.15)`,
              borderColor: `rgba(${theme?.glowPrimary || '6, 182, 212'}, 0.4)`,
              boxShadow: `0 0 30px rgba(${theme?.glowPrimary || '6, 182, 212'}, 0.25)`,
            }}
          >
            <Bot size={36} style={{ color: `rgb(${theme?.glowPrimary || '6, 182, 212'})` }} />
          </div>

          <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-3 text-white drop-shadow-sm uppercase">
            Aru Neuro-Drill Complete
          </h1>

          <div
            className="mt-2 px-6 py-4 rounded-2xl border backdrop-blur-md max-w-xl text-center transition-all"
            style={{
              backgroundColor: `rgba(${theme?.glowPrimary || '6, 182, 212'}, 0.08)`,
              borderColor: `rgba(${theme?.glowPrimary || '6, 182, 212'}, 0.3)`,
            }}
          >
            <div className="flex items-center justify-center gap-2 mb-1.5">
              <span
                className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border uppercase"
                style={{
                  borderColor: `rgba(${theme?.glowPrimary || '6, 182, 212'}, 0.4)`,
                  backgroundColor: `rgba(${theme?.glowPrimary || '6, 182, 212'}, 0.15)`,
                  color: `rgb(${theme?.glowPrimary || '6, 182, 212'})`,
                }}
              >
                {persona.badge} {persona.name}
              </span>
            </div>
            <p className="text-sm md:text-base tracking-wide font-medium leading-relaxed text-zinc-200 italic">
              "{feedbackMsg}"
            </p>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          
          <div className="group glass-panel rounded-[2rem] p-8 flex flex-col items-center justify-center border border-white/10">
            <div className="flex items-center gap-2 text-zinc-400 font-bold tracking-[0.2em] text-xs uppercase mb-3">
              <Zap size={14} style={{ color: `rgb(${theme?.glowPrimary || '6, 182, 212'})` }} /> Net Speed
            </div>
            <div className="text-6xl md:text-7xl font-black tracking-tighter text-white">
              {wpm} <span className="text-2xl text-zinc-500 font-bold tracking-widest ml-1">WPM</span>
            </div>
          </div>

          <div className="group glass-panel rounded-[2rem] p-8 flex flex-col items-center justify-center border border-white/10">
            <div className="flex items-center gap-2 text-zinc-400 font-bold tracking-[0.2em] text-xs uppercase mb-3">
              <Target size={14} style={{ color: `rgb(${theme?.glowPrimary || '6, 182, 212'})` }} /> Accuracy
            </div>
            <div className="text-6xl md:text-7xl font-black tracking-tighter text-white">
              {accuracy}<span className="text-2xl text-zinc-500 font-bold ml-1">%</span>
            </div>
          </div>

        </div>

        {/* Weak Keys Drilled */}
        {smartDrillKeys.length > 0 && (
          <div className="flex flex-col items-center mb-12">
            <div className="text-[10px] font-black tracking-[0.25em] text-zinc-500 uppercase mb-4">Targeted Weak Keys</div>
            <div className="flex flex-wrap justify-center gap-3">
              {smartDrillKeys.map(key => (
                <div
                  key={key}
                  className="w-12 h-12 rounded-2xl flex items-center justify-center font-mono font-black text-xl uppercase border shadow-md"
                  style={{
                    backgroundColor: `rgba(${theme?.glowPrimary || '6, 182, 212'}, 0.12)`,
                    borderColor: `rgba(${theme?.glowPrimary || '6, 182, 212'}, 0.4)`,
                    color: `rgb(${theme?.glowPrimary || '6, 182, 212'})`,
                  }}
                >
                  <span>{key}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap justify-center gap-4">
          <button
            onClick={onExit}
            className="glass-panel flex items-center gap-2.5 px-6 py-4 rounded-2xl text-zinc-300 font-bold tracking-[0.15em] text-xs hover:text-white border border-white/10 hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X size={15} /> DASHBOARD
          </button>
          
          <button
            onClick={onRetry}
            className="glass-panel flex items-center gap-2.5 px-6 py-4 rounded-2xl text-zinc-200 font-bold tracking-[0.15em] text-xs hover:text-white border border-white/10 hover:bg-white/10 transition-colors cursor-pointer"
          >
            <RotateCcw size={15} /> RETRY DRILL
          </button>

          <button
            disabled={isGenerating}
            onClick={onGenerateAnother}
            className="relative group flex items-center gap-2.5 px-8 py-4 rounded-2xl text-white font-black tracking-[0.15em] text-xs transition-all overflow-hidden cursor-pointer disabled:opacity-50 shadow-lg hover:brightness-110"
            style={{
              backgroundColor: `rgba(${theme?.glowPrimary || '6, 182, 212'}, 0.3)`,
              border: `1px solid rgba(${theme?.glowPrimary || '6, 182, 212'}, 0.55)`,
              boxShadow: `0 0 30px rgba(${theme?.glowPrimary || '6, 182, 212'}, 0.25)`,
            }}
          >
            {isGenerating ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Brain size={15} />
            )}
            <span>{isGenerating ? 'GENERATING DRILL...' : 'GENERATE NEXT DRILL'}</span>
            {!isGenerating && <ArrowRight size={15} className="opacity-70 group-hover:translate-x-1 transition-transform" />}
          </button>
        </div>

      </div>
    </div>
  );
}
