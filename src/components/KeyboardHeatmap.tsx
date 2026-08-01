import { useState } from 'react';
import { Target, Zap, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface HeatmapKeyData {
  total: number;
  errors: number;
  totalMs?: number;
}

interface KeyboardHeatmapProps {
  heatmapData: Record<string, HeatmapKeyData>;
  onStartWeaknessDrill?: (weakKeys: string[]) => void;
}

const KEYBOARD_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
];

export function KeyboardHeatmap({ heatmapData, onStartWeaknessDrill }: KeyboardHeatmapProps) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  // Helper to extract key performance metrics
  const getKeyStats = (keyChar: string) => {
    const data = heatmapData[keyChar] || { total: 0, errors: 0, totalMs: 0 };
    const total = data.total || 0;
    const errors = data.errors || 0;
    const accuracy = total > 0 ? Math.round(((total - errors) / total) * 100) : 100;
    const avgMs = total > 0 && data.totalMs ? Math.round(data.totalMs / total) : 0;
    return { total, errors, accuracy, avgMs };
  };

  // Identify top weak keys for the drill generator
  const getWeakKeys = () => {
    const allKeys = Object.keys(heatmapData).filter(k => k.length === 1 && /[A-Z]/.test(k));
    if (allKeys.length === 0) return ['E', 'T', 'A', 'O', 'I', 'N'];

    const sorted = allKeys.sort((a, b) => {
      const statsA = getKeyStats(a);
      const statsB = getKeyStats(b);
      // Sort by accuracy ascending, then latency descending
      if (statsA.accuracy !== statsB.accuracy) return statsA.accuracy - statsB.accuracy;
      return statsB.avgMs - statsA.avgMs;
    });

    return sorted.slice(0, 5);
  };

  const weakKeys = getWeakKeys();
  const activeHoverKey = selectedKey || weakKeys[0] || 'E';
  const activeStats = getKeyStats(activeHoverKey);

  const getKeyStyle = (keyChar: string) => {
    const stats = getKeyStats(keyChar);
    if (stats.total === 0) {
      return 'bg-slate-900/40 text-zinc-600 border-white/5';
    }
    if (stats.accuracy < 88 || stats.avgMs > 320) {
      return 'bg-rose-500/25 border-rose-500/50 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.3)] animate-pulse';
    }
    if (stats.accuracy < 95 || stats.avgMs > 220) {
      return 'bg-amber-500/20 border-amber-500/40 text-amber-300';
    }
    return 'bg-emerald-500/15 border-emerald-400/30 text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.15)]';
  };

  return (
    <div className="glass-panel relative rounded-2xl bg-slate-950/60 border border-white/15 p-4 sm:p-5 text-mono">
      {/* Header & Drill Button */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Target size={16} />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold font-mono text-white tracking-tight">
              Keyboard Heatmap & Performance Matrix
            </h3>
            <p className="text-[10px] font-mono text-zinc-400">
              Per-Key Accuracy & Latency Diagnostic
            </p>
          </div>
        </div>

        {onStartWeaknessDrill && (
          <button
            onClick={() => onStartWeaknessDrill(weakKeys)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-500/20 to-amber-500/20 border border-rose-500/40 text-rose-300 hover:border-rose-400/60 text-xs font-mono font-bold transition-all shadow-[0_0_15px_rgba(244,63,94,0.2)] hover:scale-105"
          >
            <Zap size={14} className="text-rose-400 animate-bounce" />
            <span>FIX MY WEAKNESS</span>
          </button>
        )}
      </div>

      {/* Heatmap Legend */}
      <div className="flex flex-wrap items-center gap-4 mb-4 text-[10px] font-mono text-zinc-400 bg-white/5 p-2 rounded-xl border border-white/5">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
          <span>Optimal (&gt;95% Acc)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          <span>Moderate (88-95% Acc)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-400 shadow-[0_0_6px_rgba(244,63,94,0.8)]" />
          <span>Weak (&lt;88% Acc)</span>
        </div>
      </div>

      {/* Interactive QWERTY Keyboard */}
      <div className="flex flex-col gap-1.5 items-center my-2 font-mono select-none">
        {KEYBOARD_ROWS.map((row, rIdx) => (
          <div key={rIdx} className="flex gap-1 sm:gap-1.5 justify-center w-full max-w-xl">
            {row.map((keyChar) => {
              const isSelected = selectedKey === keyChar;
              return (
                <button
                  key={keyChar}
                  onMouseEnter={() => setSelectedKey(keyChar)}
                  onClick={() => setSelectedKey(keyChar)}
                  className={`relative flex-1 max-w-[48px] h-10 sm:h-11 rounded-lg border text-xs font-bold font-mono flex flex-col items-center justify-center transition-all duration-150 ${getKeyStyle(
                    keyChar
                  )} ${isSelected ? 'ring-2 ring-cyan-400 scale-105 z-10' : 'hover:scale-105'}`}
                >
                  <span>{keyChar}</span>
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Key Stats Inspector Panel */}
      <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 bg-slate-900/40 p-3 rounded-xl border border-white/5 font-mono">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-300 font-bold text-base">
            {activeHoverKey}
          </div>
          <div>
            <div className="text-xs font-bold text-white flex items-center gap-2">
              Key '{activeHoverKey}' Performance
              {activeStats.accuracy < 88 ? (
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                  <AlertTriangle size={10} /> Needs Practice
                </span>
              ) : (
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <CheckCircle2 size={10} /> Strong Key
                </span>
              )}
            </div>
            <p className="text-[10px] text-zinc-400">
              Total Typed: {activeStats.total} times | Errors: {activeStats.errors}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="text-right">
            <div className="text-[10px] text-zinc-400 uppercase">Accuracy</div>
            <div className={`font-bold ${activeStats.accuracy >= 95 ? 'text-emerald-400' : activeStats.accuracy >= 88 ? 'text-amber-400' : 'text-rose-400'}`}>
              {activeStats.accuracy}%
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-zinc-400 uppercase">Avg Latency</div>
            <div className="font-bold text-cyan-300">
              {activeStats.avgMs > 0 ? `${activeStats.avgMs} ms` : 'N/A'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
