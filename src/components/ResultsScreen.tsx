import { useState } from 'react';
import { Activity, TrendingUp, RotateCcw, Play, Brain, Share2 } from 'lucide-react';
import type { Theme } from '@/data/constants';
import { shareResultCard } from '@/utils/shareCard';

interface ResultsScreenProps {
  wpm: number;
  rawWpm: number;
  accuracy: number;
  consistency: number;
  flawlessStreak: number;
  leveledUp: boolean;
  xpGainedLast: number;
  theme: Theme;
  heatmapData: Record<string, { total: number; errors: number }>;
  getWeakKeys: [string, number][] | null;
  username: string;
  setUsername: (val: string) => void;
  saveStatus: string;
  onSave: () => void;
  onReset: () => void;
  onStartMicroDrill: (key: string) => void;
  onWatchReplay: () => void;
  /** null when there isn't enough heatmap data for a smart drill yet */
  onStartSmartDrill: (() => void) | null;
}

export const ResultsScreen = ({
  wpm, rawWpm, accuracy, consistency, flawlessStreak,
  leveledUp, xpGainedLast, theme,
  heatmapData, getWeakKeys, username, setUsername,
  saveStatus, onSave, onReset, onStartMicroDrill,
  onWatchReplay, onStartSmartDrill
}: ResultsScreenProps) => {
  const [shareStatus, setShareStatus] = useState('');

  const grade = (() => {
    if (wpm > 100 && accuracy > 98) return "S";
    if (wpm > 80 && accuracy > 95) return "A";
    if (wpm > 50 && accuracy > 90) return "B";
    if (wpm > 30) return "C";
    return "D";
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

  return (
    <div className="flex flex-col items-center justify-center w-full animate-in fade-in zoom-in duration-500 z-10">
      <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4">TEST COMPLETE</h2>

      {leveledUp && (
        <div className="mb-4 bg-amber-500/20 text-amber-400 border border-amber-500/50 px-6 py-2 rounded-full font-black tracking-widest flex items-center animate-bounce shadow-[0_0_20px_rgba(245,158,11,0.5)]">
          <TrendingUp size={18} className="mr-2" /> LEVEL UP!
        </div>
      )}
      {xpGainedLast > 0 && !leveledUp ? (
        <div className="mb-8 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-zinc-300 font-black tracking-widest text-xs shadow-xl backdrop-blur-md">
          +{xpGainedLast} XP
        </div>
      ) : <div className="h-8 mb-2"></div>}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4 w-full max-w-6xl mb-4 px-4">
        <div className="stat-card glass-panel p-4 md:p-6 rounded-3xl flex flex-col items-center justify-center" style={{ '--delay': '0ms' } as React.CSSProperties}>
          <span className="text-zinc-400 text-[9px] md:text-[10px] font-black tracking-widest mb-2 md:mb-3 uppercase">Grade</span>
          <span className={`text-5xl md:text-6xl font-black ${theme.text} ${theme.drop}`}>{grade}</span>
        </div>
        <div className="stat-card glass-panel p-4 md:p-6 rounded-3xl flex flex-col items-center justify-center" style={{ '--delay': '0ms' } as React.CSSProperties}>
          <span className="text-zinc-400 text-[9px] md:text-[10px] font-black tracking-widest mb-2 md:mb-3 uppercase">Net WPM</span>
          <span className="text-4xl md:text-5xl font-black text-white">{wpm}</span>
        </div>
        <div className="stat-card glass-panel p-4 md:p-6 rounded-3xl flex flex-col items-center justify-center" style={{ '--delay': '0ms' } as React.CSSProperties}>
          <span className="text-zinc-400 text-[9px] md:text-[10px] font-black tracking-widest mb-2 md:mb-3 uppercase">Raw WPM</span>
          <span className="text-4xl md:text-5xl font-black text-white">{rawWpm}</span>
        </div>
        <div className="stat-card glass-panel p-4 md:p-6 rounded-3xl flex flex-col items-center justify-center" style={{ '--delay': '0ms' } as React.CSSProperties}>
          <span className="text-zinc-400 text-[9px] md:text-[10px] font-black tracking-widest mb-2 md:mb-3 uppercase">Accuracy</span>
          <span className="text-4xl md:text-5xl font-black text-white">{accuracy}<span className="text-xl md:text-2xl text-zinc-500">%</span></span>
        </div>
        <div className="stat-card glass-panel p-4 md:p-6 rounded-3xl flex flex-col items-center justify-center" style={{ '--delay': '0ms' } as React.CSSProperties}>
          <span className="text-zinc-400 text-[9px] md:text-[10px] font-black tracking-widest mb-2 md:mb-3 uppercase">Consistency</span>
          <span className="text-4xl md:text-5xl font-black text-white">{consistency}<span className="text-xl md:text-2xl text-zinc-500">%</span></span>
        </div>
        <div className="stat-card glass-panel p-4 md:p-6 rounded-3xl flex flex-col items-center justify-center" style={{ '--delay': '0ms' } as React.CSSProperties}>
          <span className="text-zinc-400 text-[9px] md:text-[10px] font-black tracking-widest mb-2 md:mb-3 uppercase">Flawless</span>
          <span className={`text-4xl md:text-5xl font-black ${flawlessStreak > 50 ? theme.text : 'text-white'}`}>{flawlessStreak}</span>
        </div>
      </div>

      {/* Heatmap */}
      <div className="w-full max-w-2xl mb-3 scale-[0.85] md:scale-90 origin-top z-10 relative">
        <div className="flex flex-col items-center gap-1.5 p-6 glass-panel rounded-3xl w-full mt-2 lucid-enter" style={{ '--delay': '200ms' } as React.CSSProperties}>
          <div className="flex w-full justify-between items-end mb-3">
            <span className="text-zinc-400 text-[10px] font-black tracking-widest flex items-center">
              <Activity size={12} className="mr-2" /> KEYBOARD HEATMAP
            </span>
            <div className="flex space-x-2">
              {getWeakKeys?.map(([key]) => (
                <button
                  key={key}
                  onClick={() => onStartMicroDrill(key)}
                  className="flex flex-col items-center cursor-pointer transition-transform hover:scale-110"
                  title={`Drill: ${key}`}
                >
                  <span className="bg-red-500/20 text-red-400 border border-red-500/30 w-6 h-6 flex items-center justify-center rounded font-mono font-bold uppercase hover:bg-red-500/40 transition-all text-[10px]">{key}</span>
                </button>
              ))}
            </div>
          </div>

          {[
            ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
            ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
            ['Z', 'X', 'C', 'V', 'B', 'N', 'M']
          ].map((row, i) => (
            <div key={i} className="flex gap-1.5 md:gap-2 justify-center" style={{ marginLeft: i * 20 }}>
              {row.map(char => {
                const stat = heatmapData[char];
                let bgColor = "bg-black/20 text-zinc-500 border-white/5";
                let errorRate = 0;

                if (stat && stat.total > 0) {
                  errorRate = stat.errors / stat.total;
                  if (errorRate === 0) bgColor = "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
                  else if (errorRate < 0.05) bgColor = "bg-amber-500/10 text-amber-400 border-amber-500/30";
                  else bgColor = "bg-red-500/20 text-red-400 border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.3)] cursor-pointer hover:scale-110";
                }

                return (
                  <button
                    key={char}
                    onClick={() => errorRate >= 0.05 && onStartMicroDrill(char)}
                    className={`w-8 h-10 md:w-10 md:h-12 flex flex-col items-center justify-center rounded-lg border transition-all ${bgColor} ${errorRate < 0.05 ? 'cursor-default pointer-events-none' : ''}`}
                    title={stat && stat.total > 0 ? `${stat.errors} errors in ${stat.total} hits` : 'Not typed yet'}
                  >
                    <span className="font-mono font-bold text-sm">{char}</span>
                    <span className="text-[8px] opacity-50">{stat && stat.total > 0 ? `${Math.round(errorRate * 100)}%` : '-'}</span>
                  </button>
                );
              })}
            </div>
          ))}
          <div className="text-[9px] text-zinc-500 mt-4 font-black uppercase tracking-widest text-center">Click red keys to start a custom Micro-Drill</div>
        </div>
      </div>

      {/* Save Score */}
      <div className="flex w-full max-w-lg space-x-3 glass-panel p-2 rounded-2xl -mt-2 z-10 lucid-enter" style={{ '--delay': '400ms' } as React.CSSProperties}>
        <input
          type="text"
          value={username}
          onChange={e => setUsername(e.target.value)}
          placeholder="ENTER NAME..."
          maxLength={12}
          className="flex-1 bg-transparent text-white px-6 py-4 font-bold text-xl focus:outline-none placeholder:text-zinc-600 uppercase"
          onKeyDown={(e) => { if (e.key === 'Enter') onSave(); e.stopPropagation(); }}
        />
        <button
          onClick={onSave}
          className={`px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-black tracking-widest rounded-xl transition-all ${theme.text}`}
        >
          SAVE
        </button>
      </div>
      {saveStatus && <p className={`mt-4 text-sm font-black tracking-widest ${saveStatus.includes('Error') ? 'text-red-400' : theme.text}`}>{saveStatus}</p>}

      {/* Actions: replay / smart drill / share / play again */}
      <div className="mt-6 flex flex-wrap justify-center gap-3 w-full z-10 relative">
        <button
          onClick={onWatchReplay}
          className="flex items-center space-x-3 px-6 py-3 bg-white/[0.04] hover:bg-white/10 text-zinc-300 hover:text-white transition-colors rounded-full border border-white/10 text-[10px] md:text-xs font-black tracking-widest shadow-xl backdrop-blur-md"
        >
          <Play size={16} /> <span>WATCH REPLAY</span>
        </button>
        {onStartSmartDrill && (
          <button
            onClick={onStartSmartDrill}
            className="flex items-center space-x-3 px-6 py-3 bg-white/[0.04] hover:bg-white/10 text-zinc-300 hover:text-white transition-colors rounded-full border border-white/10 text-[10px] md:text-xs font-black tracking-widest shadow-xl backdrop-blur-md"
            title="A 20-word lesson targeting your lifetime weakest keys"
          >
            <Brain size={16} /> <span>SMART DRILL</span>
          </button>
        )}
        <button
          onClick={handleShare}
          disabled={!!shareStatus}
          className={`flex items-center space-x-3 px-6 py-3 bg-white/[0.04] hover:bg-white/10 transition-colors rounded-full border border-white/10 text-[10px] md:text-xs font-black tracking-widest shadow-xl backdrop-blur-md ${shareStatus ? theme.text : 'text-zinc-300 hover:text-white'}`}
        >
          <Share2 size={16} /> <span>{shareStatus || 'SHARE CARD'}</span>
        </button>
        <button
          onClick={onReset}
          className="flex items-center space-x-3 px-6 py-3 bg-white/[0.04] hover:bg-white/10 text-zinc-300 hover:text-white transition-colors rounded-full border border-white/10 text-[10px] md:text-xs font-black tracking-widest shadow-xl backdrop-blur-md"
        >
          <RotateCcw size={16} /> <span>PLAY AGAIN (ESC)</span>
        </button>
      </div>
    </div>
  );
};
