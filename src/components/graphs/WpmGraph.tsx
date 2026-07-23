import { useMemo, useState } from 'react';
import { TrendingUp } from 'lucide-react';
import type { Theme } from '@/data/constants';

interface WpmGraphProps {
  timelinePoints: Array<{ t: number; wpm: number; rawWpm: number }>;
  competitorTimelines?: Record<string, Array<{ t: number; wpm: number }>>;
  players?: { id: string; name: string }[];
  selfId?: string;
  errorTimes: number[];
  durationMs: number;
  theme: Theme;
}

/** WPM at time t, linearly interpolated along the timeline curve. */
function interpolateWpm(points: Array<{ t: number; wpm: number }>, t: number): number {
  if (points.length === 0) return 0;
  if (t <= points[0].t) return points[0].wpm;
  for (let i = 1; i < points.length; i++) {
    if (points[i].t >= t) {
      const a = points[i - 1], b = points[i];
      const frac = b.t === a.t ? 0 : (t - a.t) / (b.t - a.t);
      return a.wpm + (b.wpm - a.wpm) * frac;
    }
  }
  return points[points.length - 1].wpm;
}

export const WpmGraph = ({ timelinePoints, competitorTimelines, players, selfId, errorTimes, durationMs, theme }: WpmGraphProps) => {
  const [hoveredTimeMs, setHoveredTimeMs] = useState<number | null>(null);
  const [hoveredOvertakeIdx, setHoveredOvertakeIdx] = useState<number | null>(null);

  const { maxW, avgWpm, poly, rawPoly, gradientPoly, yLabels, xLabels, compPolys, overtakes } = useMemo(() => {
    let maxW = Math.max(...timelinePoints.map(p => Math.max(p.wpm, p.rawWpm)), 10);
    if (competitorTimelines) {
      Object.values(competitorTimelines).forEach(pts => {
        maxW = Math.max(maxW, ...pts.map(p => p.wpm));
      });
    }

    const avgWpm = timelinePoints.length
      ? Math.round(timelinePoints.reduce((s, p) => s + p.wpm, 0) / timelinePoints.length)
      : 0;

    const px = (t: number) => (t / durationMs) * 700 + 60;
    const py = (w: number) => 30 + (1 - w / maxW) * 180;

    const poly = timelinePoints.map(p => `${px(p.t)},${py(p.wpm)}`).join(' ');
    const rawPoly = timelinePoints.map(p => `${px(p.t)},${py(p.rawWpm)}`).join(' ');
    
    const compPolys: Record<string, string> = {};
    if (competitorTimelines) {
      Object.entries(competitorTimelines).forEach(([id, pts]) => {
        if (pts.length < 2) return;
        compPolys[id] = pts.map(p => `${px(p.t)},${py(p.wpm)}`).join(' ');
      });
    }

    // Gradient fill area (close the polygon at the bottom)
    const gradientPoly = poly + ` ${px(timelinePoints[timelinePoints.length - 1]?.t ?? durationMs)},210 ${px(timelinePoints[0]?.t ?? 0)},210`;

    // Y-axis labels
    const ySteps = 5;
    const yLabels = Array.from({ length: ySteps + 1 }, (_, i) => {
      const wpm = Math.round((maxW / ySteps) * i);
      const y = py(wpm);
      return { wpm, y };
    });

    // X-axis labels
    const totalSecs = Math.ceil(durationMs / 1000);
    const xStep = Math.max(1, Math.ceil(totalSecs / 6));
    const xLabels: Array<{ sec: number; x: number }> = [];
    for (let s = 0; s <= totalSecs; s += xStep) {
      xLabels.push({ sec: s, x: px(s * 1000) });
    }

    // Calculate Overtakes
    const overtakes: Array<{ t: number; prevLeaderName: string; newLeaderName: string }> = [];
    if (players && selfId && players.length > 1 && timelinePoints.length > 0) {
      let currentLeaderId: string | null = null;
      for (const p of timelinePoints) {
        if (p.t === 0) continue;
        let bestWpm = -1;
        let newLeaderId: string | null = null;
        
        players.forEach(player => {
          let wpm = 0;
          if (player.id === selfId) {
            wpm = p.wpm;
          } else if (competitorTimelines?.[player.id]) {
            wpm = interpolateWpm(competitorTimelines[player.id], p.t);
          }
          if (wpm > bestWpm) {
            bestWpm = wpm;
            newLeaderId = player.id;
          }
        });
        
        if (currentLeaderId === null) {
          currentLeaderId = newLeaderId;
        } else if (newLeaderId && newLeaderId !== currentLeaderId && bestWpm > 0) {
          const prevPlayer = players.find(pl => pl.id === currentLeaderId);
          const newPlayer = players.find(pl => pl.id === newLeaderId);
          if (prevPlayer && newPlayer) {
            overtakes.push({
              t: p.t,
              prevLeaderName: prevPlayer.id === selfId ? 'YOU' : prevPlayer.name.substring(0, 8),
              newLeaderName: newPlayer.id === selfId ? 'YOU' : newPlayer.name.substring(0, 8),
            });
          }
          currentLeaderId = newLeaderId;
        }
      }
    }

    return { maxW, avgWpm, poly, rawPoly, gradientPoly, yLabels, xLabels, compPolys, overtakes };
  }, [timelinePoints, competitorTimelines, players, selfId, durationMs]);

  if (timelinePoints.length < 2 || durationMs <= 0) return null;

  const px = (t: number) => (t / durationMs) * 700 + 60;
  const py = (w: number) => 30 + (1 - w / maxW) * 180;

  return (
    <div className="glass-panel rounded-3xl p-6 w-full">
      <div className="flex w-full justify-between items-center mb-4">
        <span className="text-zinc-400 text-[10px] font-black tracking-widest flex items-center">
          <TrendingUp size={12} className="mr-2" /> WPM OVER TIME
        </span>
        <div className="flex items-center gap-4">
          {errorTimes.length > 0 && (
            <span className="text-[9px] font-black tracking-widest text-red-400/80">✕ {errorTimes.length} ERROR{errorTimes.length === 1 ? '' : 'S'}</span>
          )}
          <span className="text-[9px] font-black tracking-widest text-zinc-500">AVG: {avgWpm} WPM</span>
        </div>
      </div>

      <svg
        viewBox="0 0 800 250"
        className="w-full relative"
        onMouseLeave={() => { setHoveredTimeMs(null); setHoveredOvertakeIdx(null); }}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const svgX = ((e.clientX - rect.left) / rect.width) * 800;
          const t = ((svgX - 60) / 700) * durationMs;
          if (t >= 0 && t <= durationMs) setHoveredTimeMs(t);
          else setHoveredTimeMs(null);
        }}
      >
        <defs>
          <linearGradient id="wpmGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.2" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {yLabels.map((label, i) => (
          <g key={i}>
            <line x1="60" y1={label.y} x2="760" y2={label.y} stroke="rgba(113,113,122,0.1)" strokeWidth="1" />
            <text x="50" y={label.y + 4} textAnchor="end" fill="rgba(113,113,122,0.4)" fontSize="9" fontWeight="700">{label.wpm}</text>
          </g>
        ))}

        {/* X-axis labels */}
        {xLabels.map((label, i) => (
          <text key={i} x={label.x} y="235" textAnchor="middle" fill="rgba(113,113,122,0.4)" fontSize="9" fontWeight="700">{label.sec}s</text>
        ))}

        {/* Average WPM line */}
        <line x1="60" y1={py(avgWpm)} x2="760" y2={py(avgWpm)} stroke="rgba(113,113,122,0.3)" strokeWidth="1" strokeDasharray="6 4" />

        {/* Gradient fill */}
        <polygon fill="url(#wpmGradient)" points={gradientPoly} className={theme.text} opacity="0.5" />

        {/* Raw WPM curve */}
        <polyline fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" strokeLinecap="round" strokeLinejoin="round" points={rawPoly} className="text-zinc-600" opacity="0.6" />

        {/* Competitor curves */}
        {Object.entries(compPolys).map(([id, p]) => (
          <polyline key={`comp-${id}`} fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="6 4" strokeLinecap="round" strokeLinejoin="round" points={p} className="text-amber-500/50" />
        ))}

        {/* Net WPM curve */}
        <polyline fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={poly} className={theme.text} />

        {/* Error dots on curve */}
        {errorTimes.map((t, i) => {
          const pyVal = py(interpolateWpm(timelinePoints, t));
          const dotY = Math.min(pyVal, 206);
          return (
            <g key={`err-${i}`}>
              <line x1={px(t)} y1={dotY + 3} x2={px(t)} y2={dotY + 8} stroke="rgb(248,113,113)" strokeWidth="2" strokeLinecap="round" />
              <circle cx={px(t)} cy={dotY} r="3" fill="rgb(248,113,113)" opacity="0.85" />
            </g>
          );
        })}

        {/* Tooltip & Hover Markers */}
        {hoveredTimeMs !== null && (() => {
          const t = hoveredTimeMs;
          const tx = Math.min(Math.max(px(t), 80), 720);
          
          // Determine tooltip rows (WPMs for each player)
          const rows: { name: string; wpm: number; color: string; isRaw?: boolean }[] = [];
          
          if (players && selfId) {
            const medalStrokeColors = ['#fbbf24', '#d4d4d8', '#fb923c', '#71717a'];
            players.forEach((player, idx) => {
              const color = medalStrokeColors[idx] || medalStrokeColors[3];
              if (player.id === selfId) {
                if (t <= (timelinePoints[timelinePoints.length - 1]?.t ?? durationMs)) {
                  rows.push({ name: 'YOU', wpm: Math.round(interpolateWpm(timelinePoints, t)), color });
                } else {
                  rows.push({ name: 'YOU 🏁', wpm: Math.round(timelinePoints[timelinePoints.length - 1]?.wpm ?? 0), color });
                }
              } else if (competitorTimelines?.[player.id]) {
                const pts = competitorTimelines[player.id];
                if (pts.length > 0) {
                  if (t <= pts[pts.length - 1].t) {
                    rows.push({ name: player.name.substring(0, 8), wpm: Math.round(interpolateWpm(pts, t)), color });
                  } else {
                    rows.push({ name: player.name.substring(0, 8) + ' 🏁', wpm: Math.round(pts[pts.length - 1].wpm), color });
                  }
                }
              }
            });
          } else {
            const wpm = interpolateWpm(timelinePoints, t);
            rows.push({ name: 'WPM', wpm: Math.round(wpm), color: 'white' });
          }

          const h = rows.length * 16 + 12;
          rows.sort((a, b) => b.wpm - a.wpm);
          const topWpm = rows[0]?.wpm ?? 0;
          const yStart = py(topWpm) - h - 10;
          const ty = yStart < 20 ? py(topWpm) + 20 : yStart;

          return (
            <g>
              <line x1={px(t)} y1="30" x2={px(t)} y2="210" stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeDasharray="3 3" />
              <rect x={tx - 45} y={ty} width="90" height={h} rx="8" fill="rgba(0,0,0,0.85)" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
              
              {rows.map((row, i) => (
                <text key={i} x={tx} y={ty + 16 + i * 16} textAnchor="middle" fill={row.color} fontSize={row.isRaw ? "9" : "10"} fontWeight={row.isRaw ? "600" : "800"}>
                  {row.wpm} {row.name}
                </text>
              ))}

              {/* Draw hover dots for each row */}
              {rows.map((row, i) => (
                !row.name.includes('🏁') && (
                  <circle
                    key={`dot-${i}`}
                    cx={px(t)}
                    cy={py(row.wpm)}
                    r="4"
                    fill="black"
                    stroke={row.color}
                    strokeWidth="2"
                  />
                )
              ))}
            </g>
          );
        })()}
        {/* Overtakes */}
        {overtakes.map((overtake, i) => (
          <g key={`overtake-${i}`}>
            <text
              x={px(overtake.t)}
              y="225"
              textAnchor="middle"
              fontSize="12"
              className="drop-shadow-[0_0_8px_rgba(251,191,36,0.8)] cursor-help animate-pulse"
              onMouseEnter={() => setHoveredOvertakeIdx(i)}
              onMouseLeave={() => setHoveredOvertakeIdx(null)}
            >
              ⚔️
            </text>
            <circle
              cx={px(overtake.t)}
              cy="221"
              r="12"
              fill="transparent"
              className="cursor-help"
              onMouseEnter={() => setHoveredOvertakeIdx(i)}
              onMouseLeave={() => setHoveredOvertakeIdx(null)}
            />
          </g>
        ))}

        {/* Overtake Tooltip */}
        {hoveredOvertakeIdx !== null && overtakes[hoveredOvertakeIdx] && (() => {
          const o = overtakes[hoveredOvertakeIdx];
          const tx = Math.min(Math.max(px(o.t), 100), 700);
          return (
            <g>
              <rect x={tx - 75} y="180" width="150" height="24" rx="4" fill="rgba(0,0,0,0.9)" stroke="rgba(251,191,36,0.5)" strokeWidth="1" />
              <text x={tx} y="196" textAnchor="middle" fill="white" fontSize="9" fontWeight="800">
                <tspan fill="#fbbf24">{o.newLeaderName}</tspan> overtook <tspan fill="#d4d4d8">{o.prevLeaderName}</tspan>!
              </text>
            </g>
          );
        })()}
      </svg>
    </div>
  );
};
