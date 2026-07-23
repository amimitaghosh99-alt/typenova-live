import { useState, useMemo } from 'react';
import {
  Activity, TrendingUp, RotateCcw, Brain, Share2, Play
} from 'lucide-react';
import type { Theme } from '@/data/constants';
import type { Keystroke } from '@/hooks/useTypingEngine';
import { shareResultCard } from '@/utils/shareCard';
import { WpmGraph } from '@/components/graphs/WpmGraph';

export interface ResultsScreenProps {
  wpm: number;
  rawWpm: number;
  accuracy: number;
  consistency: number;
  flawlessStreak: number;
  leveledUp: boolean;
  xpGainedLast: number;
  theme: Theme;
  heatmapData: Record<string, { total: number; errors: number }>;
  isLoggedIn: boolean;
  displayName: string | null;
  saveStatus: string;
  timelinePoints: Array<{ t: number; wpm: number; rawWpm: number }>;
  competitorTimelines?: Record<string, Array<{ t: number; wpm: number }>>;
  errorTimes: number[];
  durationMs: number;
  keystrokeLog: Keystroke[];
  testStartTime: number;
  onReset: () => void;
  onWatchReplay: () => void;
  onStartMicroDrill: (keyChar: string) => void;
  onStartSmartDrill: (() => void) | null;
  compact?: boolean;
}

export function ResultsScreen({
  wpm, rawWpm, accuracy, consistency, flawlessStreak,
  leveledUp, xpGainedLast, theme,
  saveStatus,
  timelinePoints, errorTimes, durationMs,
  keystrokeLog,
  onReset, onWatchReplay, onStartMicroDrill, onStartSmartDrill,
  compact = false
}: ResultsScreenProps) {
  const [shareStatus, setShareStatus] = useState('');

  const grade = (() => {
    if (wpm > 100 && accuracy > 98) return "S";
    if (wpm > 80 && accuracy > 95) return "A";
    if (wpm > 50 && accuracy > 90) return "B";
    if (wpm > 30) return "C";
    return "D";
  })();

  const gradeColor = (() => {
    switch (grade) {
      case 'S': return 'text-amber-400 drop-shadow-[0_0_20px_rgba(251,191,36,0.6)]';
      case 'A': return 'text-emerald-400 drop-shadow-[0_0_20px_rgba(52,211,153,0.6)]';
      case 'B': return 'text-blue-400 drop-shadow-[0_0_20px_rgba(96,165,250,0.6)]';
      case 'C': return 'text-orange-400 drop-shadow-[0_0_20px_rgba(251,146,60,0.6)]';
      default: return 'text-zinc-400';
    }
  })();

  const handleShare = async () => {
    setShareStatus('RENDERING...');
    try {
      const result = await shareResultCard({
        wpm, rawWpm, accuracy, consistency, grade,
        themeName: theme.name,
        glowPrimary: theme.glowPrimary,
        glowSecondary: theme.glowSecondary,
      });
      setShareStatus(result === 'copied' ? 'COPIED TO CLIPBOARD!' : 'PNG DOWNLOADED!');
    } catch {
      setShareStatus('SHARE FAILED');
    }
    setTimeout(() => setShareStatus(''), 3000);
  };

  // Build heatmap rows
  const heatmapRows = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['Z', 'X', 'C', 'V', 'B', 'N', 'M']
  ];

  const testHeatmapData = useMemo(() => {
    const data: Record<string, { total: number; errors: number }> = {};
    for (const k of keystrokeLog) {
      if (k.isBackspace) continue;
      const char = k.expected.toUpperCase();
      if (!data[char]) data[char] = { total: 0, errors: 0 };
      data[char].total++;
      if (k.isError) data[char].errors++;
    }
    return data;
  }, [keystrokeLog]);

  const content = (
    <div className={compact ? '' : 'relative z-10 max-w-6xl mx-auto px-6 py-12'}>
        {/* Header */}
        <div className="flex flex-col items-center mb-12">
          {!compact && (
            <h1 className="text-5xl md:text-6xl font-black tracking-tight mb-4 animate-in fade-in zoom-in duration-500">TEST COMPLETE</h1>
          )}

          {leveledUp && (
            <div className="mb-4 bg-amber-500/20 text-amber-400 border border-amber-500/50 px-8 py-3 rounded-full font-black tracking-widest flex items-center animate-bounce shadow-[0_0_30px_rgba(245,158,11,0.5)] text-sm">
              <TrendingUp size={18} className="mr-3" /> LEVEL UP!
            </div>
          )}
          {xpGainedLast > 0 && !leveledUp && (
            <div className="mb-4 px-6 py-2 rounded-full bg-white/5 border border-white/10 text-zinc-300 font-black tracking-widest text-sm shadow-xl backdrop-blur-md">
              +{xpGainedLast} XP
            </div>
          )}

          {/* Auto-save status */}
          {saveStatus && (
            <div className={`mb-4 px-6 py-2 rounded-full font-black tracking-widest text-xs ${saveStatus.includes('Error') || saveStatus.includes('INVALID') ? 'bg-red-500/20 text-red-400 border border-red-500/30' : `bg-white/5 border border-white/10 ${theme.text}`}`}>
              {saveStatus}
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="glass-panel p-6 rounded-3xl flex flex-col items-center justify-center">
            <span className="text-zinc-400 text-[10px] font-black tracking-widest mb-3 uppercase">Grade</span>
            <span className={`text-6xl font-black ${gradeColor}`}>{grade}</span>
          </div>
          <div className="glass-panel p-6 rounded-3xl flex flex-col items-center justify-center">
            <span className="text-zinc-400 text-[10px] font-black tracking-widest mb-3 uppercase">Net WPM</span>
            <span className="text-5xl font-black text-white">{wpm}</span>
          </div>
          <div className="glass-panel p-6 rounded-3xl flex flex-col items-center justify-center">
            <span className="text-zinc-400 text-[10px] font-black tracking-widest mb-3 uppercase">Raw WPM</span>
            <span className="text-5xl font-black text-white">{rawWpm}</span>
          </div>
          <div className="glass-panel p-6 rounded-3xl flex flex-col items-center justify-center">
            <span className="text-zinc-400 text-[10px] font-black tracking-widest mb-3 uppercase">Accuracy</span>
            <span className="text-5xl font-black text-white">{accuracy}<span className="text-2xl text-zinc-500">%</span></span>
          </div>
          <div className="glass-panel p-6 rounded-3xl flex flex-col items-center justify-center">
            <span className="text-zinc-400 text-[10px] font-black tracking-widest mb-3 uppercase">Consistency</span>
            <span className="text-5xl font-black text-white">{consistency}<span className="text-2xl text-zinc-500">%</span></span>
          </div>
          <div className="glass-panel p-6 rounded-3xl flex flex-col items-center justify-center">
            <span className="text-zinc-400 text-[10px] font-black tracking-widest mb-3 uppercase">Flawless</span>
            <span className={`text-5xl font-black ${flawlessStreak > 50 ? theme.text : 'text-white'}`}>{flawlessStreak}</span>
          </div>
        </div>

        {/* Graphs Section - Single unified graph */}
        <div className="w-full mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700" style={{ animationDelay: '100ms' }}>
          <WpmGraph
            timelinePoints={timelinePoints}
            competitorTimelines={competitorTimelines}
            errorTimes={errorTimes}
            durationMs={durationMs}
            theme={theme}
          />
        </div>

        {/* Keyboard Heatmap */}
        <div className="glass-panel rounded-3xl p-6 mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700" style={{ animationDelay: '400ms' }}>
          <div className="flex w-full justify-between items-end mb-4">
            <span className="text-zinc-400 text-[10px] font-black tracking-widest flex items-center">
              <Activity size={12} className="mr-2" /> KEYBOARD HEATMAP
            </span>
            <span className="text-[9px] font-black tracking-widest text-zinc-500 uppercase">
              Click any red key to practice
            </span>
          </div>

          <div className="flex flex-col items-center gap-2">
            {heatmapRows.map((row, i) => (
              <div key={i} className="flex gap-2 justify-center" style={{ marginLeft: i * 20 }}>
                {row.map(char => {
                  const stat = testHeatmapData[char];
                  let bgColor = "bg-black/20 text-zinc-500 border-white/5";
                  let errorRate = 0;
                  let canDrill = false;

                  if (stat && stat.total > 0) {
                    errorRate = stat.errors / stat.total;
                    if (errorRate === 0) {
                      bgColor = "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
                    } else if (errorRate < 0.05) {
                      bgColor = "bg-amber-500/10 text-amber-400 border-amber-500/30 cursor-pointer hover:bg-amber-500/20";
                      canDrill = true;
                    } else {
                      bgColor = "bg-red-500/20 text-red-400 border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.3)] cursor-pointer hover:bg-red-500/30 hover:scale-105 z-10";
                      canDrill = true;
                    }
                  }

                  return (
                    <div
                      key={char}
                      onClick={() => { if (canDrill) onStartMicroDrill(char); }}
                      className={`w-10 h-12 md:w-12 md:h-14 flex flex-col items-center justify-center rounded-xl border transition-all ${bgColor}`}
                      title={stat && stat.total > 0 ? `${stat.errors} errors in ${stat.total} hits` : 'Not typed yet'}
                    >
                      <span className="font-mono font-bold text-sm">{char}</span>
                      <span className="text-[8px] opacity-50">{stat && stat.total > 0 ? `${Math.round(errorRate * 100)}%` : '-'}</span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap justify-center gap-4 mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700" style={{ animationDelay: '500ms' }}>
          
          <button
            onClick={onWatchReplay}
            className="flex items-center gap-3 px-6 py-4 glass-panel rounded-2xl text-zinc-300 font-black tracking-widest text-sm hover:text-white hover:bg-white/10 transition-all border border-transparent hover:border-white/10"
          >
            <Play size={16} /> WATCH REPLAY
          </button>

          {onStartSmartDrill && (
            <button
              onClick={onStartSmartDrill}
              className={`flex items-center gap-3 px-6 py-4 glass-panel rounded-2xl ${theme.text} font-black tracking-widest text-sm hover:bg-white/10 transition-all border border-transparent hover:border-white/10`}
            >
              <Brain size={16} /> SMART DRILL
            </button>
          )}

          <button
            onClick={handleShare}
            disabled={!!shareStatus}
            className={`flex items-center gap-3 px-6 py-4 glass-panel rounded-2xl transition-all text-sm font-black tracking-widest ${shareStatus ? theme.text : 'text-zinc-300 hover:text-white hover:bg-white/10 border-transparent hover:border-white/10'}`}
          >
            <Share2 size={16} /> {shareStatus || 'SHARE CARD'}
          </button>

          <button
            onClick={onReset}
            className={`flex items-center gap-3 px-8 py-4 glass-panel rounded-2xl text-white font-black tracking-widest text-sm hover:bg-white/10 transition-all border border-white/10 shadow-[0_0_20px_rgba(255,255,255,0.05)]`}
          >
            <RotateCcw size={16} /> PLAY AGAIN
          </button>
        </div>
    </div>
  );

  if (compact) return content;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-y-auto">
      {/* Ambient glow effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className={`absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full blur-[200px] opacity-[0.04]`} style={{ background: theme.glowPrimary }} />
        <div className={`absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[200px] opacity-[0.03]`} style={{ background: theme.glowSecondary }} />
      </div>
      {content}
    </div>
  );
}
