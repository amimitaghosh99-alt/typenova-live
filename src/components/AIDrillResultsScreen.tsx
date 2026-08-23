import React from 'react';
import { Brain, Zap, Target, RotateCcw, X, ArrowRight, Loader2 } from 'lucide-react';
import type { Theme } from '@/data/constants';

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

const getFeedbackMessage = (acc: number): string => {
  if (acc === 100) {
    const msgs = [
      "Flawless execution! Your weaknesses are becoming strengths.",
      "Absolute perfection. The AI couldn't trip you up.",
      "100% accuracy. You are ascending beyond human limits."
    ];
    return msgs[Math.floor(Math.random() * msgs.length)];
  }
  if (acc >= 98) {
    const msgs = [
      "Outstanding precision. Almost flawless.",
      "Incredible run! Just a microscopic slip-up.",
      "Near perfect. Your muscle memory is locking in."
    ];
    return msgs[Math.floor(Math.random() * msgs.length)];
  }
  if (acc >= 95) {
    const msgs = [
      "Excellent precision! Keep pushing your speed.",
      "Great work. The red keys are starting to fade.",
      "Very solid run. A bit more focus and you've got 100%."
    ];
    return msgs[Math.floor(Math.random() * msgs.length)];
  }
  if (acc >= 90) {
    const msgs = [
      "Good practice, but plenty of room for improvement.",
      "A respectable run. Watch those tricky combinations.",
      "Not bad! Let's clean up those minor errors next time."
    ];
    return msgs[Math.floor(Math.random() * msgs.length)];
  }
  if (acc >= 80) {
    const msgs = [
      "A bit rough around the edges. Slow down slightly.",
      "Focus purely on accuracy for the next drill.",
      "Those weak keys are still giving you trouble. Keep practicing."
    ];
    return msgs[Math.floor(Math.random() * msgs.length)];
  }
  if (acc >= 50) {
    const msgs = [
      "That was tough. Slow down and focus entirely on precision.",
      "Lots of red on the board. Take a deep breath and try again.",
      "Your speed is outpacing your control. Reign it in."
    ];
    return msgs[Math.floor(Math.random() * msgs.length)];
  }
  
  const msgs = [
    "Pure chaos. Did you type that with your elbows?",
    "Well... at least you finished it. Let's try aiming for the actual keys.",
    "The AI is judging you right now. Take it slow next time."
  ];
  return msgs[Math.floor(Math.random() * msgs.length)];
};

const getFeedbackStyle = (acc: number) => {
  if (acc === 100) return "border-amber-500/40 bg-amber-500/10 text-amber-100 shadow-[0_0_30px_rgba(245,158,11,0.25)]";
  if (acc >= 95) return "border-indigo-500/40 bg-indigo-500/10 text-indigo-100 shadow-[0_0_30px_rgba(99,102,241,0.25)]";
  if (acc >= 80) return "border-white/20 bg-white/5 text-zinc-200 shadow-[0_0_20px_rgba(255,255,255,0.05)]";
  return "border-rose-500/40 bg-rose-500/10 text-rose-100 shadow-[0_0_30px_rgba(244,63,94,0.2)]";
};

export function AIDrillResultsScreen({
  wpm,
  accuracy,
  smartDrillKeys,
  isGenerating,
  onGenerateAnother,
  onRetry,
  onExit
}: AIDrillResultsScreenProps) {
  const isFlawless = accuracy >= 100;
  
  // Keep the message stable across re-renders (like when 'isGenerating' changes)
  const feedbackMsg = React.useMemo(() => getFeedbackMessage(accuracy), [accuracy]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] w-full max-w-4xl mx-auto px-4 animate-in fade-in zoom-in-95 duration-700">
      

      {/* Main Container */}
      <div className="relative w-full glass-panel glass-refract rounded-[2.5rem] p-10 md:p-14 overflow-hidden z-10">
        
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-14">
          <div className="w-24 h-24 rounded-full bg-gradient-to-b from-white/10 to-transparent flex items-center justify-center mb-6 shadow-[0_0_50px_rgba(255,255,255,0.1)] border border-white/20 backdrop-blur-xl">
            <Brain className="text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]" size={40} strokeWidth={1.5} />
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4 text-transparent bg-clip-text bg-gradient-to-br from-white to-zinc-400 drop-shadow-sm">
            AI Drill Complete
          </h1>
          <div className={`mt-2 px-6 py-3 rounded-full border backdrop-blur-md ${getFeedbackStyle(accuracy)}`}>
            <p className="text-sm md:text-base tracking-wide font-medium leading-relaxed max-w-lg">
              {feedbackMsg}
            </p>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-14">
          
          <div className="group glass-panel rounded-[2rem] p-8 flex flex-col items-center justify-center">
            <div className="flex items-center gap-2 text-zinc-400 font-bold tracking-[0.2em] text-xs uppercase mb-4">
              <Zap size={14} className="text-indigo-400" /> Net Speed
            </div>
            <div className={`text-7xl font-black tracking-tighter text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]`}>
              {wpm} <span className="text-3xl text-zinc-500 font-bold tracking-widest ml-1">WPM</span>
            </div>
          </div>

          <div className="group glass-panel rounded-[2rem] p-8 flex flex-col items-center justify-center">
            <div className="flex items-center gap-2 text-zinc-400 font-bold tracking-[0.2em] text-xs uppercase mb-4">
              <Target size={14} className={isFlawless ? "text-amber-400" : "text-rose-400"} /> Accuracy
            </div>
            <div className={`text-7xl font-black tracking-tighter ${isFlawless ? 'text-amber-300 drop-shadow-[0_0_40px_rgba(251,191,36,0.5)]' : 'text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]'}`}>
              {accuracy}<span className="text-3xl text-zinc-500 font-bold ml-1">%</span>
            </div>
          </div>

        </div>

        {/* Weak Keys Drilled */}
        {smartDrillKeys.length > 0 && (
          <div className="flex flex-col items-center mb-14">
            <div className="text-[10px] font-black tracking-[0.3em] text-zinc-500 uppercase mb-5">Targeted Weaknesses</div>
            <div className="flex flex-wrap justify-center gap-4">
              {smartDrillKeys.map(key => (
                <div key={key} className="glass-panel w-14 h-14 rounded-2xl flex items-center justify-center text-rose-400 font-mono font-bold text-2xl uppercase shadow-[0_0_30px_rgba(244,63,94,0.15)] border-rose-500/30 bg-rose-500/5">
                  <span className="drop-shadow-[0_0_12px_rgba(244,63,94,1)]">{key}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap justify-center gap-4">
          <button
            onClick={onExit}
            className="glass-panel flex items-center gap-3 px-8 py-5 rounded-2xl text-zinc-300 font-bold tracking-[0.15em] text-xs hover:text-white"
          >
            <X size={16} /> DASHBOARD
          </button>
          
          <button
            onClick={onRetry}
            className="glass-panel flex items-center gap-3 px-8 py-5 rounded-2xl text-zinc-200 font-bold tracking-[0.15em] text-xs hover:text-white"
          >
            <RotateCcw size={16} className="group-hover:-rotate-90 duration-500" /> RETRY DRILL
          </button>

          <button
            disabled={isGenerating}
            onClick={onGenerateAnother}
            className="relative group flex items-center gap-3 px-10 py-5 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold tracking-[0.15em] text-xs hover:from-indigo-400 hover:to-purple-500 shadow-[0_0_40px_rgba(99,102,241,0.5)] hover:shadow-[0_0_60px_rgba(99,102,241,0.7)] disabled:opacity-50 border border-white/20 transition-all overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-[150%] group-hover:translate-x-[150%] transition-transform duration-700 ease-in-out" />
            {isGenerating ? (
              <Loader2 size={16} className="animate-spin relative z-10" />
            ) : (
              <Brain size={16} className="relative z-10 group-hover:scale-110 transition-transform duration-300" />
            )}
            <span className="relative z-10 drop-shadow-md">{isGenerating ? 'ENGINE RUNNING...' : 'GENERATE ANOTHER'}</span>
            {!isGenerating && <ArrowRight size={16} className="opacity-70 relative z-10 group-hover:translate-x-1 transition-transform duration-300" />}
          </button>
        </div>

      </div>
    </div>
  );
}
