import { useMemo, memo } from 'react';
import { X, BarChart2, Activity, Target, Clock, Trophy, TrendingUp, CheckCircle } from 'lucide-react';
import type { Theme } from '@/data/constants';
import { readLocalProgress } from '@/lib/progress';

export interface HistoryEntry {
  /** ISO date */
  d: string;
  wpm: number;
  acc: number;
  cons: number;
  level: string;
  mode: 'words' | 'time';
  size: number;
}

export const HISTORY_KEY = 'typezen_history';
export const HISTORY_CAP = 500;

export function loadHistory(): HistoryEntry[] {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch { return []; }
}

export function appendHistory(entry: HistoryEntry) {
  const next = [...loadHistory(), entry].slice(-HISTORY_CAP);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
}

function loadPersonalBests(): Array<{ label: string; wpm: number }> {
  const out: Array<{ label: string; wpm: number }> = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith('typezen_pb:')) continue;
    try {
      const pb = JSON.parse(localStorage.getItem(key) || 'null');
      if (!pb?.wpm) continue;
      const [, level, cfg] = key.split(':');
      const label = `${level} · ${cfg.startsWith('t') ? cfg.slice(1) + 's' : cfg.slice(1) + ' words'}`;
      out.push({ label, wpm: pb.wpm });
    } catch { /* ignore corrupt entries */ }
  }
  return out.sort((a, b) => b.wpm - a.wpm);
}

// Simple polyline over the last N entries, same visual language as the
// expanded pacing graph in App.tsx.
function TrendGraph({ values, color, height = 160, maxOverride }: {
  values: number[]; color: string; height?: number; maxOverride?: number;
}) {
  if (values.length < 2) {
    return <div className="h-40 flex items-center justify-center text-[10px] font-black uppercase tracking-widest text-zinc-600">Complete more tests to see your trend</div>;
  }
  const max = maxOverride ?? Math.max(...values, 10);
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * 760 + 20;
    const y = height + 20 - Math.min(height, (v / max) * height);
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg viewBox={`0 0 800 ${height + 40}`} className="w-full">
      {[0.25, 0.5, 0.75].map(f => (
        <line key={f} x1="20" y1={20 + height * f} x2="780" y2={20 + height * f} stroke="rgba(113,113,122,0.15)" strokeWidth="1" />
      ))}
      <polyline fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={pts} className={color} />
    </svg>
  );
}

interface StatsDashboardProps {
  theme: Theme;
  testsCompleted: number;
  onClose: () => void;
}

export const StatsDashboard = memo(({ theme, testsCompleted, onClose }: StatsDashboardProps) => {
  const history = useMemo(() => loadHistory(), []);
  const pbs = useMemo(() => loadPersonalBests(), []);
  const quests = useMemo(() => readLocalProgress().quests?.active || [], []);

  const recent = history.slice(-60);
  const wpmSeries = recent.map(h => h.wpm);
  const accSeries = recent.map(h => h.acc);

  const bestWpm = history.length ? Math.max(...history.map(h => h.wpm)) : 0;
  const last10 = history.slice(-10);
  const avgWpm = last10.length ? Math.round(last10.reduce((a, h) => a + h.wpm, 0) / last10.length) : 0;
  const avgAcc = last10.length ? Math.round(last10.reduce((a, h) => a + h.acc, 0) / last10.length) : 0;
  // Rough time-typed estimate: words tests ≈ size words at the run's wpm; timed tests are exact.
  const minutesTyped = Math.round(history.reduce((a, h) =>
    a + (h.mode === 'time' ? h.size / 60 : (h.wpm > 0 ? h.size / h.wpm : 0)), 0));

  const tiles: Array<[string, string | number, React.ComponentType<{ size?: number; className?: string }>]> = [
    ['Tests Played', testsCompleted, Activity],
    ['Best WPM', bestWpm, Trophy],
    ['Avg WPM (last 10)', avgWpm, TrendingUp],
    ['Avg Acc (last 10)', avgAcc ? `${avgAcc}%` : '-', Target],
    ['Minutes Typed', minutesTyped, Clock],
  ];

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300" onClick={onClose}>
      <div className="bg-zinc-950 border border-zinc-800 rounded-[2.5rem] p-8 md:p-12 w-full max-w-5xl shadow-2xl max-h-[90vh] overflow-y-auto lucid-scale" style={{ '--delay': '0ms' } as React.CSSProperties} onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-8 border-b border-zinc-800 pb-6">
          <h2 className="text-3xl font-black text-white uppercase tracking-widest flex items-center">
            <BarChart2 className="mr-4" style={{ color: `rgb(${theme.glowPrimary})` }} size={32} /> Your Stats
          </h2>
          <button onClick={onClose} className="p-3 bg-zinc-900 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors"><X size={24} /></button>
        </div>

        {/* Totals */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-10">
          {tiles.map(([label, value, Icon]) => (
            <div key={label} className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-5 flex flex-col items-center text-center">
              <Icon size={16} className="text-zinc-500 mb-2" />
              <span className={`text-3xl font-black ${theme.text}`}>{value}</span>
              <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mt-1">{label}</span>
            </div>
          ))}
        </div>

        {/* Daily Bounties */}
        {quests.length > 0 && (
          <>
            <h3 className="text-sm font-black uppercase tracking-widest text-zinc-500 mb-3 flex items-center gap-2">
              <Target size={16} /> Daily Bounties
            </h3>
            <div className="grid md:grid-cols-3 gap-4 mb-10">
              {quests.map(q => {
                const isDone = q.completed;
                const pct = Math.min(100, Math.round((q.progress / q.target) * 100));
                
                let title = '';
                if (q.type === 'races_won') title = `Win ${q.target} Races`;
                if (q.type === 'words_typed') title = `Type ${q.target} Words`;
                if (q.type === 'wpm_achieved') title = `Hit ${q.target} WPM`;
                if (q.type === 'acc_achieved') title = `Hit ${q.target}% Acc`;

                return (
                  <div key={q.id} className={`relative overflow-hidden border rounded-3xl p-5 transition-all duration-500 ${isDone ? 'bg-zinc-900/80 border-emerald-500/30' : 'bg-zinc-900/40 border-zinc-800'}`}>
                    {/* Background Progress Fill */}
                    {!isDone && (
                      <div className="absolute top-0 left-0 h-full bg-zinc-800/20 transition-all duration-1000 ease-out" style={{ width: `${pct}%` }} />
                    )}
                    
                    <div className="relative z-10 flex flex-col h-full justify-between">
                      <div className="flex justify-between items-start mb-4">
                        <span className={`text-xs font-black uppercase tracking-widest ${isDone ? 'text-emerald-400' : 'text-zinc-400'}`}>
                          {title}
                        </span>
                        {isDone && <CheckCircle size={16} className="text-emerald-500 animate-pulse" />}
                      </div>
                      
                      <div className="flex justify-between items-end">
                        <span className="text-2xl font-black text-white">
                          {isDone ? 'DONE' : `${q.progress}/${q.target}`}
                        </span>
                        <span className={`text-[10px] font-black uppercase tracking-widest ${isDone ? 'text-emerald-500' : theme.text}`}>
                          +{q.xpReward} XP
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* WPM trend */}
        <h3 className="text-sm font-black uppercase tracking-widest text-zinc-500 mb-3">WPM Trend <span className="text-zinc-700">— last {recent.length} tests</span></h3>
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-4 mb-8">
          <TrendGraph values={wpmSeries} color={theme.text} />
        </div>

        {/* Accuracy trend */}
        <h3 className="text-sm font-black uppercase tracking-widest text-zinc-500 mb-3">Accuracy Trend</h3>
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-4 mb-8">
          <TrendGraph values={accSeries} color="text-emerald-400" height={100} maxOverride={100} />
        </div>

        {/* Personal bests */}
        <h3 className="text-sm font-black uppercase tracking-widest text-zinc-500 mb-3">Personal Bests</h3>
        {pbs.length === 0 ? (
          <p className="text-zinc-600 text-xs font-bold uppercase tracking-widest py-4 text-center">No personal bests recorded yet — finish a test!</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {pbs.map(pb => (
              <div key={pb.label} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 flex justify-between items-center">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{pb.label}</span>
                <span className={`text-xl font-black ${theme.text}`}>{pb.wpm}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});
