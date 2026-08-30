import { useMemo, useState, useRef } from 'react';
import { TrendingUp } from 'lucide-react';
import type { Theme } from '@/data/constants';

/**
 * Solo result graph: your net and raw WPM, your errors, and an optional ghost.
 *
 * Multiplayer lives in `components/race/RaceChart` instead. The competitor
 * support that used to be bolted on here keyed colours off ranking position,
 * sampled overtakes only at *your* timestamps, and returned `null` for the
 * whole chart when your own timeline was short — so one missing payload erased
 * every opponent line too. Those props are gone rather than deprecated, so the
 * broken path cannot be wired up again by accident.
 */
interface WpmGraphProps {
  timelinePoints: Array<{ t: number; wpm: number; rawWpm: number }>;
  errorTimes: number[];
  durationMs: number;
  theme: Theme;
  ghostTimeline?: Array<{ t: number; wpm: number }> | null;
  ghostLabel?: string;
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

export const WpmGraph = ({
  timelinePoints,
  errorTimes,
  durationMs,
  theme,
  ghostTimeline,
  ghostLabel,
}: WpmGraphProps) => {
  const [hoveredTimeMs, setHoveredTimeMs] = useState<number | null>(null);
  const svgRectRef = useRef<DOMRect | null>(null);

  const safePts = useMemo(() => Array.isArray(timelinePoints) ? timelinePoints : [], [timelinePoints]);
  const safeGhostPts = useMemo(() => Array.isArray(ghostTimeline) ? ghostTimeline : [], [ghostTimeline]);
  const safeDuration = Math.max(durationMs || 0, 1000);

  const { maxW, avgWpm, poly, rawPoly, ghostPoly, gradientPoly, yLabels, xLabels } = useMemo(() => {
    const maxW = Math.max(
      ...safePts.map(p => Math.max(p?.wpm || 0, p?.rawWpm || 0)),
      ...safeGhostPts.map(p => p?.wpm || 0),
      10
    );

    const avgWpm = safePts.length
      ? Math.round(safePts.reduce((s, p) => s + (p?.wpm || 0), 0) / safePts.length)
      : 0;

    const px = (t: number) => ((t || 0) / safeDuration) * 700 + 60;
    const py = (w: number) => 30 + (1 - (w || 0) / (maxW || 1)) * 180;

    /**
     * Builds one smooth curve. `key` selects which field to plot, so the net and
     * raw lines share this code — `rawWpm` is optional because the ghost curve
     * only carries `wpm`.
     */
    const buildSmoothPath = (
      pts: Array<{ t: number; wpm: number; rawWpm?: number }>,
      key: 'wpm' | 'rawWpm',
    ) => {
      if (pts.length === 0) return '';
      if (pts.length === 1) return `M ${px(pts[0].t)},${py(pts[0][key] ?? 0)}`;

      const m = pts.map(p => ({ x: px(p.t), y: py(p[key] ?? 0) }));
      let d = `M ${m[0].x},${m[0].y}`;
      
      const tension = 0.15;
      for (let i = 0; i < m.length - 1; i++) {
        const p0 = i > 0 ? m[i - 1] : m[i];
        const p1 = m[i];
        const p2 = m[i + 1];
        const p3 = i !== m.length - 2 ? m[i + 2] : p2;
        
        const cp1x = p1.x + (p2.x - p0.x) * tension;
        const cp1y = p1.y + (p2.y - p0.y) * tension;
        
        const cp2x = p2.x - (p3.x - p1.x) * tension;
        const cp2y = p2.y - (p3.y - p1.y) * tension;
        
        d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
      }
      return d;
    };

    const poly = buildSmoothPath(safePts, 'wpm');
    const rawPoly = buildSmoothPath(safePts, 'rawWpm');
    const ghostPoly = buildSmoothPath(safeGhostPts, 'wpm');

    // Gradient fill area (close the path at the bottom)
    const gradientPoly = poly ? poly + ` L ${px(safePts[safePts.length - 1]?.t ?? safeDuration)},210 L ${px(safePts[0]?.t ?? 0)},210 Z` : '';

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

    return { maxW, avgWpm, poly, rawPoly, ghostPoly, gradientPoly, yLabels, xLabels };
  }, [safePts, safeGhostPts, durationMs, safeDuration]);

  if (safePts.length < 2 || safeDuration <= 0) return null;

  const px = (t: number) => (t / safeDuration) * 700 + 60;
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
        onMouseEnter={(e) => { svgRectRef.current = e.currentTarget.getBoundingClientRect(); }}
        onMouseLeave={() => { svgRectRef.current = null; setHoveredTimeMs(null); }}
        onMouseMove={(e) => {
          const rect = svgRectRef.current || e.currentTarget.getBoundingClientRect();
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
        <path fill="url(#wpmGradient)" d={gradientPoly} className={theme.text} opacity="0.5" />

        {/* Raw WPM curve */}
        <path fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" strokeLinecap="round" strokeLinejoin="round" d={rawPoly} className="text-zinc-600" opacity="0.6" />

        {/* Ghost curve (Shadow run) */}
        {ghostPoly && safeGhostPts.length > 0 && (
          <path
            fill="none"
            stroke="#c084fc"
            strokeWidth="2.5"
            strokeDasharray="6 4"
            strokeLinecap="round"
            strokeLinejoin="round"
            d={ghostPoly}
            opacity="0.85"
            className="filter drop-shadow-[0_0_8px_rgba(192,132,252,0.6)]"
          />
        )}

        {/* Net WPM curve */}
        <path fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" d={poly} className={theme.text} />

        {/* Error dots on curve */}
        {errorTimes.map((t, i) => {
          const pyVal = py(interpolateWpm(safePts, t));
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
          
          // Determine tooltip rows
          const rows: { name: string; wpm: number; color: string; isRaw?: boolean }[] = [];

          const wpm = interpolateWpm(timelinePoints, t);
          rows.push({ name: 'YOU', wpm: Math.round(wpm), color: 'white' });
          if (safeGhostPts.length > 0) {
            const gWpm = interpolateWpm(safeGhostPts, t);
            rows.push({ name: ghostLabel || 'GHOST', wpm: Math.round(gWpm), color: '#c084fc' });
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
                <circle
                  key={`dot-${i}`}
                  cx={px(t)}
                  cy={py(row.wpm)}
                  r="4"
                  fill="black"
                  stroke={row.color}
                  strokeWidth="2"
                />
              ))}
            </g>
          );
        })()}
      </svg>
    </div>
  );
};
