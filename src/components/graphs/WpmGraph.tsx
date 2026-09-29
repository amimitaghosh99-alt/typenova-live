import { useMemo, useState, useRef, useEffect, memo } from 'react';
import { TrendingUp, Zap } from 'lucide-react';
import type { Theme } from '@/data/constants';
import {
  niceCeiling,
  niceTimeSteps,
  smoothPath,
  clusterErrors,
  interpolateSeries,
} from './wpmGraphMath';

export interface WpmGraphProps {
  timelinePoints: Array<{ t: number; wpm: number; rawWpm: number }>;
  errorTimes: number[];
  durationMs: number;
  theme: Theme;
  ghostTimeline?: Array<{ t: number; wpm: number }> | null;
  ghostLabel?: string;
  className?: string;
}

const PAD = { top: 28, right: 52, bottom: 30, left: 44 };
const CHART_H = 260;

export const WpmGraph = memo(function WpmGraph({
  timelinePoints,
  errorTimes,
  durationMs,
  theme,
  ghostTimeline,
  ghostLabel = 'GHOST',
  className = '',
}: WpmGraphProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(800);
  const [hoveredTimeMs, setHoveredTimeMs] = useState<number | null>(null);

  // Series visibility toggles
  const [showNet, setShowNet] = useState(true);
  const [showRaw, setShowRaw] = useState(true);
  const [showErrors, setShowErrors] = useState(true);
  const [showGhost, setShowGhost] = useState(true);

  // ResizeObserver for 1:1 true-pixel crisp SVG rendering
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry?.contentRect?.width) {
        setContainerWidth(Math.round(entry.contentRect.width));
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const safePts = useMemo(
    () => (Array.isArray(timelinePoints) ? timelinePoints : []),
    [timelinePoints]
  );
  const safeGhostPts = useMemo(
    () => (Array.isArray(ghostTimeline) ? ghostTimeline : []),
    [ghostTimeline]
  );
  const safeErrorTimes = useMemo(
    () => (Array.isArray(errorTimes) ? errorTimes : []),
    [errorTimes]
  );
  const safeDuration = Math.max(durationMs || 0, 1000);

  // Primary theme color binding
  const glowRgb = theme?.glowPrimary || '6, 182, 212';

  const W = Math.max(containerWidth, 320);
  const H = CHART_H;
  const innerW = Math.max(W - PAD.left - PAD.right, 50);
  const innerH = Math.max(H - PAD.top - PAD.bottom, 50);

  // Pacing and Geometry Calculations
  const {
    peakWpm,
    peakPoint,
    avgWpm,
    niceAxis,
    timeSteps,
    clusteredErrors,
    poly,
    rawPoly,
    ghostPoly,
    gradientPoly,
  } = useMemo(() => {
    const peakWpm = safePts.length
      ? Math.max(...safePts.map((p) => Math.max(p?.wpm || 0, 0)))
      : 0;
    const peakRaw = safePts.length
      ? Math.max(...safePts.map((p) => Math.max(p?.rawWpm || 0, 0)))
      : 0;
    const peakGhost = safeGhostPts.length
      ? Math.max(...safeGhostPts.map((p) => Math.max(p?.wpm || 0, 0)))
      : 0;

    const rawMax = Math.max(peakWpm, peakRaw, peakGhost, 10);
    const niceAxis = niceCeiling(rawMax, 5);

    const peakPoint = safePts.reduce(
      (best, p) => ((p?.wpm || 0) > (best?.wpm || 0) ? p : best),
      safePts[0]
    );

    const avgWpm = safePts.length
      ? Math.round(safePts.reduce((s, p) => s + (p?.wpm || 0), 0) / safePts.length)
      : 0;

    const timeSteps = niceTimeSteps(safeDuration, Math.min(8, Math.max(4, Math.floor(innerW / 90))));
    const clusteredErrors = clusterErrors(safeErrorTimes, 600);

    const px = (t: number) => PAD.left + (Math.max(0, Math.min(t, safeDuration)) / safeDuration) * innerW;
    const py = (w: number) => PAD.top + (1 - Math.max(0, Math.min(w, niceAxis.max)) / (niceAxis.max || 1)) * innerH;

    const netPts = safePts.map((p) => ({ x: px(p.t), y: py(p.wpm || 0) }));
    const rawPts = safePts.map((p) => ({ x: px(p.t), y: py(p.rawWpm || p.wpm || 0) }));
    const ghostPts = safeGhostPts.map((p) => ({ x: px(p.t), y: py(p.wpm || 0) }));

    const poly = smoothPath(netPts, 0.15, py(0));
    const rawPoly = smoothPath(rawPts, 0.15, py(0));
    const ghostPoly = smoothPath(ghostPts, 0.15, py(0));

    const baselineY = py(0);
    const startX = netPts.length ? netPts[0].x : PAD.left;
    const endX = netPts.length ? netPts[netPts.length - 1].x : PAD.left + innerW;
    const gradientPoly = poly
      ? `${poly} L ${endX},${baselineY} L ${startX},${baselineY} Z`
      : '';

    return {
      peakWpm,
      peakPoint,
      avgWpm,
      niceAxis,
      timeSteps,
      clusteredErrors,
      poly,
      rawPoly,
      ghostPoly,
      gradientPoly,
    };
  }, [safePts, safeGhostPts, safeErrorTimes, safeDuration, innerW, innerH]);

  if (safePts.length < 2 || safeDuration <= 0) return null;

  const px = (t: number) => PAD.left + (Math.max(0, Math.min(t, safeDuration)) / safeDuration) * innerW;
  const py = (w: number) => PAD.top + (1 - Math.max(0, Math.min(w, niceAxis.max)) / (niceAxis.max || 1)) * innerH;

  return (
    <div
      ref={containerRef}
      className={`glass-panel rounded-3xl p-5 sm:p-6 w-full relative transition-all duration-300 ${className}`}
    >
      {/* ── Minimalist Header & Interactive Series Controls ────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 select-none">
        {/* Title + Peak WPM crest badge */}
        <div className="flex items-center gap-2.5">
          <span className="text-zinc-400 text-[10px] font-black tracking-widest uppercase flex items-center gap-1.5">
            <TrendingUp size={13} style={{ color: `rgb(${glowRgb})` }} />
            WPM OVER TIME
          </span>

          <span className="w-1.5 h-1.5 rounded-full bg-white/10" />

          {peakWpm > 0 && (
            <div
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black tracking-wider border"
              style={{
                backgroundColor: `rgba(${glowRgb}, 0.12)`,
                borderColor: `rgba(${glowRgb}, 0.3)`,
                color: `rgb(${glowRgb})`,
              }}
            >
              <Zap size={10} />
              PEAK: {peakWpm} WPM
            </div>
          )}
        </div>

        {/* Interactive Legend & Series Toggles */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 text-[9px] font-black tracking-wider">
          {/* Net WPM Toggle */}
          <button
            type="button"
            onClick={() => setShowNet(!showNet)}
            className={`px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer ${
              showNet
                ? 'border-white/20 bg-white/5 text-white'
                : 'border-white/5 bg-transparent text-zinc-600 line-through'
            }`}
            title="Toggle Net WPM Curve"
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{
                backgroundColor: showNet ? `rgb(${glowRgb})` : 'rgba(113, 113, 122, 0.4)',
                boxShadow: showNet ? `0 0 8px rgba(${glowRgb}, 0.6)` : 'none',
              }}
            />
            <span>WPM</span>
          </button>

          {/* Raw WPM Toggle */}
          <button
            type="button"
            onClick={() => setShowRaw(!showRaw)}
            className={`px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer ${
              showRaw
                ? 'border-zinc-700/60 bg-white/5 text-zinc-300'
                : 'border-white/5 bg-transparent text-zinc-600 line-through'
            }`}
            title="Toggle Raw WPM Curve"
          >
            <span className="w-2.5 h-0.5 bg-zinc-500 rounded" />
            <span>RAW</span>
          </button>

          {/* Errors Toggle */}
          {safeErrorTimes.length > 0 && (
            <button
              type="button"
              onClick={() => setShowErrors(!showErrors)}
              className={`px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer ${
                showErrors
                  ? 'border-red-500/30 bg-red-500/10 text-red-400'
                  : 'border-white/5 bg-transparent text-zinc-600 line-through'
              }`}
              title="Toggle Error Markers"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
              <span>{safeErrorTimes.length} ERR{safeErrorTimes.length === 1 ? '' : 'S'}</span>
            </button>
          )}

          {/* Ghost Toggle */}
          {safeGhostPts.length > 0 && (
            <button
              type="button"
              onClick={() => setShowGhost(!showGhost)}
              className={`px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer ${
                showGhost
                  ? 'border-purple-500/30 bg-purple-500/10 text-purple-300'
                  : 'border-white/5 bg-transparent text-zinc-600 line-through'
              }`}
              title="Toggle Ghost Curve"
            >
              <span>👻</span>
              <span>{ghostLabel}</span>
            </button>
          )}

          <span className="w-1.5 h-1.5 rounded-full bg-white/10 hidden sm:inline-block" />

          {/* Average WPM Readout */}
          <span className="text-zinc-500 font-mono tracking-normal text-[10px] pl-1">
            AVG: <strong className="text-zinc-300 font-bold">{avgWpm}</strong> WPM
          </span>
        </div>
      </div>

      {/* ── 1:1 Scaled SVG Canvas ────────────────────────────────────────── */}
      <svg
        width={W}
        height={H}
        className="w-full select-none cursor-crosshair overflow-visible"
        onMouseLeave={() => setHoveredTimeMs(null)}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const mouseX = e.clientX - rect.left;
          const clampedX = Math.max(PAD.left, Math.min(mouseX, PAD.left + innerW));
          const t = ((clampedX - PAD.left) / innerW) * safeDuration;
          setHoveredTimeMs(t);
        }}
      >
        <defs>
          {/* Dynamic Theme Glow Filter */}
          <filter id="wpmGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow
              dx="0"
              dy="0"
              stdDeviation="3"
              floodColor={`rgb(${glowRgb})`}
              floodOpacity="0.65"
            />
          </filter>

          {/* Multi-stop smooth area gradient */}
          <linearGradient id="wpmAreaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={`rgb(${glowRgb})`} stopOpacity="0.28" />
            <stop offset="50%" stopColor={`rgb(${glowRgb})`} stopOpacity="0.08" />
            <stop offset="100%" stopColor={`rgb(${glowRgb})`} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Horizontal Gridlines & Nice Axis Ticks */}
        {niceAxis.ticks.map((val) => {
          const y = py(val);
          return (
            <g key={`y-${val}`}>
              <line
                x1={PAD.left}
                y1={y}
                x2={PAD.left + innerW}
                y2={y}
                stroke="rgba(255, 255, 255, 0.06)"
                strokeWidth="1"
              />
              <text
                x={PAD.left - 10}
                y={y + 3.5}
                textAnchor="end"
                fill="rgba(161, 161, 170, 0.5)"
                fontSize="9"
                fontWeight="700"
                fontFamily="ui-monospace, monospace"
              >
                {val}
              </text>
            </g>
          );
        })}

        {/* Vertical Time Step Gridlines & Labels */}
        {timeSteps.map((step) => {
          const x = px(step.ms);
          return (
            <g key={`t-${step.sec}`}>
              <line
                x1={x}
                y1={PAD.top}
                x2={x}
                y2={PAD.top + innerH}
                stroke="rgba(255, 255, 255, 0.03)"
                strokeWidth="1"
              />
              <text
                x={x}
                y={PAD.top + innerH + 18}
                textAnchor="middle"
                fill="rgba(161, 161, 170, 0.5)"
                fontSize="9"
                fontWeight="700"
                fontFamily="ui-monospace, monospace"
              >
                {step.sec}s
              </text>
            </g>
          );
        })}

        {/* Average WPM Guide Line & Label */}
        {avgWpm > 0 && (
          <g>
            <line
              x1={PAD.left}
              y1={py(avgWpm)}
              x2={PAD.left + innerW}
              y2={py(avgWpm)}
              stroke="rgba(161, 161, 170, 0.35)"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
            <rect
              x={PAD.left + innerW + 6}
              y={py(avgWpm) - 8}
              width="38"
              height="16"
              rx="4"
              fill="rgba(18, 20, 26, 0.92)"
              stroke="rgba(255, 255, 255, 0.16)"
              strokeWidth="0.8"
            />
            <text
              x={PAD.left + innerW + 25}
              y={py(avgWpm) + 3.5}
              textAnchor="middle"
              fill="rgba(212, 212, 216, 0.95)"
              fontSize="8.5"
              fontWeight="800"
              fontFamily="ui-monospace, monospace"
            >
              {avgWpm}
            </text>
          </g>
        )}

        {/* Area Gradient Fill under Net Curve */}
        {showNet && gradientPoly && (
          <path
            d={gradientPoly}
            fill="url(#wpmAreaGradient)"
            pointerEvents="none"
          />
        )}

        {/* Ghost Curve (Shadow / Target / Opponent) */}
        {showGhost && ghostPoly && safeGhostPts.length > 0 && (
          <path
            d={ghostPoly}
            fill="none"
            stroke="#c084fc"
            strokeWidth="2"
            strokeDasharray="5 4"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.75"
          />
        )}

        {/* Raw WPM Curve (Dashed Zinc) */}
        {showRaw && rawPoly && (
          <path
            d={rawPoly}
            fill="none"
            stroke="#71717a"
            strokeWidth="1.8"
            strokeDasharray="4 4"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.65"
          />
        )}

        {/* Net WPM Curve (Theme Accent with Glow) */}
        {showNet && poly && (
          <path
            d={poly}
            fill="none"
            stroke={`rgb(${glowRgb})`}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#wpmGlow)"
          />
        )}

        {/* Peak Velocity Crest Milestone */}
        {showNet && peakPoint && peakPoint.wpm > 0 && (
          <g transform={`translate(${px(peakPoint.t)}, ${py(peakPoint.wpm)})`}>
            <circle
              r="4.5"
              fill={`rgb(${glowRgb})`}
              stroke="#09090b"
              strokeWidth="2"
              className="animate-pulse"
            />
            <circle
              r="7.5"
              fill="none"
              stroke={`rgba(${glowRgb}, 0.5)`}
              strokeWidth="1"
            />
          </g>
        )}

        {/* Clustered Error Markers */}
        {showErrors &&
          clusteredErrors.map((cluster, i) => {
            const interp = interpolateSeries(safePts, cluster.t);
            const dotY = Math.min(py(interp.wpm), py(0) - 4);
            const x = px(cluster.t);
            const isMulti = cluster.count > 1;

            return (
              <g key={`err-cluster-${i}`} className="transition-opacity duration-200">
                {/* Error Stem */}
                <line
                  x1={x}
                  y1={dotY + 3}
                  x2={x}
                  y2={dotY + 11}
                  stroke="rgb(248, 113, 113)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />

                {/* Error Pip Marker */}
                <circle
                  cx={x}
                  cy={dotY}
                  r={isMulti ? 4.5 : 3.5}
                  fill="rgb(239, 68, 68)"
                  stroke="rgba(0, 0, 0, 0.8)"
                  strokeWidth="1.2"
                />

                {/* Multiple errors count bubble */}
                {isMulti && (
                  <text
                    x={x}
                    y={dotY + 2.5}
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="7"
                    fontWeight="900"
                    fontFamily="ui-monospace, monospace"
                  >
                    {cluster.count}
                  </text>
                )}

                {/* Bottom spark rug tick mark */}
                <line
                  x1={x}
                  y1={py(0) + 1}
                  x2={x}
                  y2={py(0) + 5}
                  stroke="rgba(239, 68, 68, 0.6)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </g>
            );
          })}

        {/* ── Interactive Crosshair Guide & Floating HUD Tooltip ───────────── */}
        {hoveredTimeMs !== null && (() => {
          const t = hoveredTimeMs;
          const interp = interpolateSeries(safePts, t);
          const ghostInterp = safeGhostPts.length ? interpolateSeries(safeGhostPts, t) : null;
          const cx = px(t);

          // Find any errors close to this moment (within 500ms)
          const errorsAtHover = safeErrorTimes.filter((et) => Math.abs(et - t) <= 500).length;

          // Tooltip Rows configuration
          const rows: Array<{
            label: string;
            val: string;
            color: string;
            badge?: string;
          }> = [];

          if (showNet) {
            rows.push({
              label: 'NET',
              val: `${interp.wpm} WPM`,
              color: `rgb(${glowRgb})`,
            });
          }

          if (showRaw) {
            const penalty = interp.rawWpm > interp.wpm ? interp.rawWpm - interp.wpm : 0;
            rows.push({
              label: 'RAW',
              val: `${interp.rawWpm} WPM`,
              color: '#d4d4d8',
              badge: penalty > 0 ? `-${penalty}` : undefined,
            });
          }

          if (showGhost && ghostInterp) {
            rows.push({
              label: ghostLabel,
              val: `${ghostInterp.wpm} WPM`,
              color: '#c084fc',
            });
          }

          if (showErrors && errorsAtHover > 0) {
            rows.push({
              label: 'ERRORS',
              val: `${errorsAtHover}`,
              color: '#f87171',
            });
          }

          // Tooltip card dimensions & dynamic clamping
          const cardW = 126;
          const rowH = 17;
          const cardH = 26 + rows.length * rowH;

          // Horizontal placement: keep 8px within graph edges
          const cardX = Math.min(
            Math.max(cx - cardW / 2, PAD.left + 4),
            PAD.left + innerW - cardW - 4
          );

          // Vertical placement: flip above or below cursor to avoid obstruction
          const highestPointY = py(Math.max(interp.wpm, interp.rawWpm));
          const cardY =
            highestPointY - cardH - 12 >= PAD.top - 8
              ? highestPointY - cardH - 12
              : highestPointY + 18;

          return (
            <g pointerEvents="none">
              {/* Vertical Crosshair Line */}
              <line
                x1={cx}
                y1={PAD.top}
                x2={cx}
                y2={PAD.top + innerH}
                stroke="rgba(255, 255, 255, 0.22)"
                strokeWidth="1"
                strokeDasharray="3 3"
              />

              {/* Curve Intersect Dots */}
              {showNet && (
                <circle
                  cx={cx}
                  cy={py(interp.wpm)}
                  r="4.5"
                  fill="#09090b"
                  stroke={`rgb(${glowRgb})`}
                  strokeWidth="2.5"
                />
              )}

              {showRaw && (
                <circle
                  cx={cx}
                  cy={py(interp.rawWpm)}
                  r="3.5"
                  fill="#09090b"
                  stroke="#a1a1aa"
                  strokeWidth="2"
                />
              )}

              {showGhost && ghostInterp && (
                <circle
                  cx={cx}
                  cy={py(ghostInterp.wpm)}
                  r="3.5"
                  fill="#09090b"
                  stroke="#c084fc"
                  strokeWidth="2"
                />
              )}

              {/* HUD Tooltip Container */}
              <g transform={`translate(${cardX}, ${cardY})`}>
                {/* Backdrop Glass Glow Card */}
                <rect
                  width={cardW}
                  height={cardH}
                  rx="9"
                  fill="rgba(10, 12, 18, 0.94)"
                  stroke="rgba(255, 255, 255, 0.16)"
                  strokeWidth="1"
                  filter="drop-shadow(0 8px 20px rgba(0, 0, 0, 0.6))"
                />

                {/* Header Time Pill */}
                <text
                  x="10"
                  y="16"
                  fill="rgba(161, 161, 170, 0.9)"
                  fontSize="9"
                  fontWeight="800"
                  fontFamily="ui-monospace, monospace"
                  letterSpacing="0.05em"
                >
                  ⏱ {(t / 1000).toFixed(1)}s
                </text>

                {/* Divider */}
                <line
                  x1="10"
                  y1="22"
                  x2={cardW - 10}
                  y2="22"
                  stroke="rgba(255, 255, 255, 0.08)"
                  strokeWidth="1"
                />

                {/* Telemetry Metric Rows */}
                {rows.map((row, idx) => {
                  const y = 36 + idx * rowH;
                  return (
                    <g key={`tooltip-row-${idx}`}>
                      <text
                        x="10"
                        y={y}
                        fill="rgba(161, 161, 170, 0.7)"
                        fontSize="8.5"
                        fontWeight="700"
                        letterSpacing="0.05em"
                      >
                        {row.label}
                      </text>
                      <text
                        x={cardW - 10}
                        y={y}
                        textAnchor="end"
                        fill={row.color}
                        fontSize="9.5"
                        fontWeight="800"
                        fontFamily="ui-monospace, monospace"
                      >
                        {row.val}
                      </text>
                      {row.badge && (
                        <text
                          x={cardW - 54}
                          y={y}
                          textAnchor="end"
                          fill="#fbbf24"
                          fontSize="7.5"
                          fontWeight="700"
                          fontFamily="ui-monospace, monospace"
                        >
                          {row.badge}
                        </text>
                      )}
                    </g>
                  );
                })}
              </g>
            </g>
          );
        })()}
      </svg>
    </div>
  );
});
