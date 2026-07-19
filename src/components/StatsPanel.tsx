import React from 'react';
import { Activity, Target, BarChart2, Flame } from 'lucide-react';

interface TimelinePoint {
  wpm: number;
  t: number;
}

interface StatsPanelProps {
  wpm: number;
  accuracy: number;
  consistency: number;
  combo: number;
  themeText: string;
  timelinePoints: TimelinePoint[];
  keystrokeLogLength: number;
}

export const StatsPanel: React.FC<StatsPanelProps> = ({
  wpm,
  accuracy,
  consistency,
  combo,
  themeText,
  timelinePoints,
  keystrokeLogLength
}) => {
  
  // Renders the tiny "Pacing" timeline graph inside the card
  const renderGraph = () => {
    if (!timelinePoints || timelinePoints.length === 0) return null;
    
    const maxWpm = Math.max(...timelinePoints.map(p => p.wpm), 50);
    const points = timelinePoints.map((p, i) => {
      const x = (i / Math.max(timelinePoints.length - 1, 1)) * 100;
      const y = 100 - (p.wpm / maxWpm) * 100;
      return `${x},${y}`;
    }).join(' ');

    return (
      <svg className={`w-full h-12 ${themeText} drop-shadow-[0_0_8px_currentColor]`} viewBox="0 0 100 100" preserveAspectRatio="none">
        <polyline 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="4" 
          vectorEffect="non-scaling-stroke" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          points={points} 
        />
      </svg>
    );
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4 w-full">
      
      {/* 1. NET WPM */}
      <div className="stat-card glass-panel p-5 md:p-6 rounded-3xl flex flex-col items-center justify-center relative overflow-hidden transition-all duration-300" style={{ '--delay': '0ms' } as React.CSSProperties}>
        <span className="text-zinc-300 text-[10px] font-black tracking-widest mb-3 flex items-center drop-shadow-md z-10 uppercase">
          <Activity size={14} className="mr-2" /> Net WPM
        </span>
        <span className={`text-5xl md:text-6xl font-black leading-none transition-all z-10 ${wpm > 0 ? `${themeText} drop-shadow-[0_0_20px_currentColor]` : 'text-white/20'}`}>
          {wpm}
        </span>
      </div>

      {/* 2. PACING (Graph) */}
      <div className="stat-card glass-panel p-5 md:p-6 rounded-3xl flex-col items-center justify-end hidden md:flex col-span-1 relative overflow-hidden transition-all duration-300" style={{ '--delay': '80ms' } as React.CSSProperties}>
        <span className="text-zinc-300 text-[10px] font-black tracking-widest mb-3 flex items-center drop-shadow-md z-10 uppercase">
          <Activity size={14} className="mr-2" /> Pacing
        </span>
        <div className="w-full flex-1 flex items-end justify-center">
          {renderGraph() || <div className="h-12 w-full flex items-center justify-center text-[10px] tracking-widest text-white/30 font-bold drop-shadow-sm z-10 uppercase">Type to Map</div>}
        </div>
      </div>

      {/* 3. ACCURACY */}
      <div className="stat-card glass-panel p-5 md:p-6 rounded-3xl flex flex-col items-center justify-center relative overflow-hidden transition-all duration-300" style={{ '--delay': '160ms' } as React.CSSProperties}>
        <span className="text-zinc-300 text-[10px] font-black tracking-widest mb-3 flex items-center drop-shadow-md z-10 uppercase">
          <Target size={14} className="mr-2" /> Accuracy
        </span>
        <span className={`text-5xl md:text-6xl font-black leading-none drop-shadow-[0_0_20px_rgba(255,255,255,0.4)] z-10 ${keystrokeLogLength > 0 ? 'text-white' : 'text-white/20'}`}>
          {accuracy}<span className={`text-2xl md:text-3xl ${keystrokeLogLength > 0 ? 'text-zinc-400' : 'text-white/10'}`}>%</span>
        </span>
      </div>

      {/* 4. CONSISTENCY */}
      <div className="stat-card glass-panel p-5 md:p-6 rounded-3xl flex flex-col items-center justify-center hidden sm:flex relative overflow-hidden transition-all duration-300" style={{ '--delay': '240ms' } as React.CSSProperties}>
        <span className="text-zinc-300 text-[10px] font-black tracking-widest mb-3 flex items-center drop-shadow-md z-10 uppercase">
          <BarChart2 size={14} className="mr-2" /> Consistency
        </span>
        <span className={`text-5xl md:text-6xl font-black leading-none transition-all z-10 ${consistency > 80 && keystrokeLogLength > 0 ? `${themeText} drop-shadow-[0_0_20px_currentColor]` : 'text-white/20'}`}>
          {consistency}<span className={`text-2xl md:text-3xl ${consistency > 80 && keystrokeLogLength > 0 ? 'text-zinc-400' : 'text-white/10'}`}>%</span>
        </span>
      </div>

      {/* 5. COMBO */}
      <div className="stat-card glass-panel p-5 md:p-6 rounded-3xl flex flex-col items-center justify-center relative overflow-hidden transition-all duration-300" style={{ '--delay': '320ms' } as React.CSSProperties}>
        <span className="text-zinc-300 text-[10px] font-black tracking-widest mb-3 flex items-center drop-shadow-md z-10 uppercase">
          <Flame size={14} className="mr-2" /> Combo
        </span>
        <span className={`text-5xl md:text-6xl font-black leading-none transition-all z-10 ${combo > 20 ? `${themeText} drop-shadow-[0_0_20px_currentColor] scale-110` : 'text-white/20'}`}>
          {combo}
        </span>
      </div>

    </div>
  );
};