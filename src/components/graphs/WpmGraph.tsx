import { useMemo, useState } from 'react';
import { TrendingUp } from 'lucide-react';
import type { Theme } from '@/data/constants';

interface WpmGraphProps {
  timelinePoints: Array<{ t: number; wpm: number; rawWpm: number }>;
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

export const WpmGraph = ({ timelinePoints, errorTimes, durationMs, theme }: WpmGraphProps) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const { maxW, avgWpm, poly, rawPoly, gradientPoly, yLabels, xLabels } = useMemo(() => {
    const maxW = Math.max(...timelinePoints.map(p => Math.max(p.wpm, p.rawWpm)), 10);
    const avgWpm = timelinePoints.length
      ? Math.round(timelinePoints.reduce((s, p) => s + p.wpm, 0) / timelinePoints.length)
      : 0;

    const px = (t: number) => (t / durationMs) * 700 + 60;
    const py = (w: number) => 30 + (1 - w / maxW) * 180;

    const poly = timelinePoints.map(p => `${px(p.t)},${py(p.wpm)}`).join(' ');
    const rawPoly = timelinePoints.map(p => `${px(p.t)},${py(p.rawWpm)}`).join(' ');
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

    return { maxW, avgWpm, poly, rawPoly, gradientPoly, yLabels, xLabels };
  }, [timelinePoints, durationMs]);

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
        className="w-full"
        onMouseLeave={() => setHoveredIdx(null)}
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

        {/* Net WPM curve */}
        <polyline fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={poly} className={theme.text} />

        {/* Error dots on curve */}
        {errorTimes.map((t, i) => (
          <g key={`err-${i}`}>
            <line x1={px(t)} y1="216" x2={px(t)} y2="222" stroke="rgb(248,113,113)" strokeWidth="2" strokeLinecap="round" />
            <circle cx={px(t)} cy={py(interpolateWpm(timelinePoints, t))} r="3" fill="rgb(248,113,113)" opacity="0.85" />
          </g>
        ))}

        {/* Data points */}
        {timelinePoints.map((p, i) => (
          <g key={i}>
            <circle
              cx={px(p.t)}
              cy={py(p.wpm)}
              r={hoveredIdx === i ? 6 : 3}
              fill={hoveredIdx === i ? 'white' : 'currentColor'}
              className={hoveredIdx === i ? '' : theme.text}
              stroke={hoveredIdx === i ? 'currentColor' : 'none'}
              strokeWidth={hoveredIdx === i ? 2 : 0}
              style={{ transition: 'r 0.15s, fill 0.15s' }}
            />
            {/* Invisible hover target */}
            <rect
              x={px(p.t) - 20}
              y="10"
              width="40"
              height="220"
              fill="transparent"
              onMouseEnter={() => setHoveredIdx(i)}
            />
          </g>
        ))}

        {/* Tooltip */}
        {hoveredIdx !== null && timelinePoints[hoveredIdx] && (() => {
          const p = timelinePoints[hoveredIdx];
          const tx = Math.min(Math.max(px(p.t), 80), 720);
          return (
            <g>
              <line x1={px(p.t)} y1="30" x2={px(p.t)} y2="210" stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeDasharray="3 3" />
              <rect x={tx - 40} y={py(p.wpm) - 45} width="80" height="36" rx="8" fill="rgba(0,0,0,0.8)" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
              <text x={tx} y={py(p.wpm) - 28} textAnchor="middle" fill="white" fontSize="11" fontWeight="800">{p.wpm} WPM</text>
              <text x={tx} y={py(p.wpm) - 15} textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="9" fontWeight="600">{p.rawWpm} RAW</text>
            </g>
          );
        })()}
      </svg>
    </div>
  );
};
