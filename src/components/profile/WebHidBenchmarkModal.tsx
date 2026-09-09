import { useState, useEffect, useRef, memo, useCallback } from 'react';
import {
  X, Keyboard, Cpu, Activity, ShieldCheck,
  RefreshCw, Radio, BarChart3, Sliders, Usb
} from 'lucide-react';
import type { Theme } from '@/data/constants';
import {
  WebHidBenchmarkController,
  type WebHidBenchmarkStats
} from '@/lib/webHidEngine';

interface WebHidBenchmarkModalProps {
  theme: Theme;
  onClose: () => void;
}

export const WebHidBenchmarkModal = memo(function WebHidBenchmarkModal({
  theme,
  onClose,
}: WebHidBenchmarkModalProps) {
  const glowPrimary = theme?.glowPrimary || '34, 211, 238';
  const glowSecondary = theme?.glowSecondary || '99, 102, 241';

  const controllerRef = useRef<WebHidBenchmarkController | null>(null);
  const [stats, setStats] = useState<WebHidBenchmarkStats | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Initialize controller
  useEffect(() => {
    const ctrl = new WebHidBenchmarkController();
    controllerRef.current = ctrl;

    ctrl.startSession((updatedStats) => {
      setStats(updatedStats);
    });

    setStats(ctrl.getStats());

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept ESC if closing modal
      if (e.key === 'Escape') return;
      ctrl.recordKeyEvent(e.code || e.key, true, e.timeStamp || performance.now());
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Escape') return;
      ctrl.recordKeyEvent(e.code || e.key, false, e.timeStamp || performance.now());
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      ctrl.stopSession();
      ctrl.disconnect();
    };
  }, []);

  const handleConnectHid = useCallback(async () => {
    if (!controllerRef.current) return;
    setIsConnecting(true);
    try {
      await controllerRef.current.requestDevice();
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const handleDisconnect = useCallback(async () => {
    if (!controllerRef.current) return;
    await controllerRef.current.disconnect();
  }, []);

  const handleReset = useCallback(() => {
    if (!controllerRef.current) return;
    controllerRef.current.reset();
  }, []);

  // 60 FPS Jitter Distribution & Waveform Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      const dpr = typeof window !== 'undefined' ? Math.min(2, window.devicePixelRatio || 1) : 1;
      const rect = canvas.getBoundingClientRect();
      const logicalWidth = Math.max(300, Math.round(rect.width || 480));
      const logicalHeight = 110;

      if (canvas.width !== logicalWidth * dpr || canvas.height !== logicalHeight * dpr) {
        canvas.width = logicalWidth * dpr;
        canvas.height = logicalHeight * dpr;
        ctx.scale(dpr, dpr);
      }

      ctx.clearRect(0, 0, logicalWidth, logicalHeight);

      const deltas = stats?.recentDeltas || [];
      const len = deltas.length;

      // Draw background grid lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let y = 15; y < logicalHeight; y += 25) {
        ctx.moveTo(0, y);
        ctx.lineTo(logicalWidth, y);
      }
      ctx.stroke();

      if (len > 1) {
        const step = logicalWidth / Math.max(20, len - 1);
        const maxDelta = Math.max(3.0, ...(stats?.recentDeltas || [2.0]));

        // Secondary ambient glow stream
        ctx.beginPath();
        ctx.strokeStyle = `rgba(${glowPrimary}, 0.25)`;
        ctx.lineWidth = 2.5;

        for (let i = 0; i < len; i++) {
          const x = i * step;
          const normalized = deltas[i] / maxDelta;
          const y = logicalHeight - 10 - normalized * (logicalHeight - 25);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Primary crisp stream
        ctx.beginPath();
        ctx.strokeStyle = `rgb(${glowPrimary})`;
        ctx.lineWidth = 1.5;
        ctx.shadowColor = `rgb(${glowPrimary})`;
        ctx.shadowBlur = 8;

        for (let i = 0; i < len; i++) {
          const x = i * step;
          const normalized = deltas[i] / maxDelta;
          const y = logicalHeight - 10 - normalized * (logicalHeight - 25);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
      } else {
        // Idle placeholder text
        ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.font = '10px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.fillText('SPAM KEYBOARD MATRIX TO RECORD REPORT DELTAS', logicalWidth / 2, logicalHeight / 2);
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [stats?.recentDeltas, glowPrimary]);

  const currentHz = stats?.currentPollingRateHz || 0;
  const harmonicHz = stats?.detectedHarmonicHz || 1000;
  const stability = stats?.stabilityScore ?? 100;
  const isWebHid = stats?.interfaceType === 'webhid';

  return (
    <div
      className="fixed inset-0 z-[500] flex items-center justify-center bg-black/75 p-4 sm:p-6 backdrop-blur-2xl animate-in fade-in duration-300"
      onClick={onClose}
    >
      <div
        className="glass-panel !bg-zinc-950/95 w-full max-w-4xl max-h-[90vh] rounded-3xl border border-white/10 shadow-2xl flex flex-col overflow-hidden relative lucid-scale"
        style={{
          borderColor: `rgba(${glowPrimary}, 0.25)`,
          boxShadow: `0 0 35px rgba(${glowPrimary}, 0.12), 0 25px 50px -12px rgba(0,0,0,0.85)`,
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Ambient background glow */}
        <div
          className="absolute top-0 right-0 w-80 h-80 rounded-full blur-[90px] pointer-events-none opacity-20"
          style={{ background: `radial-gradient(circle, rgb(${glowPrimary}) 0%, transparent 70%)` }}
        />

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/5 relative z-10">
          <div className="flex items-center gap-3">
            <div
              className="p-3 rounded-2xl border"
              style={{
                backgroundColor: `rgba(${glowPrimary}, 0.12)`,
                borderColor: `rgba(${glowPrimary}, 0.35)`,
                color: `rgb(${glowPrimary})`,
              }}
            >
              <Cpu size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-wider uppercase text-white">
                  WEBHID HARDWARE BENCHMARK
                </h2>
                <span
                  className="text-[9px] font-black tracking-widest px-2.5 py-0.5 rounded-full border uppercase"
                  style={{
                    backgroundColor: isWebHid ? 'rgba(52, 211, 153, 0.1)' : 'rgba(56, 189, 248, 0.1)',
                    borderColor: isWebHid ? 'rgba(52, 211, 153, 0.3)' : 'rgba(56, 189, 248, 0.3)',
                    color: isWebHid ? '#34d399' : '#38bdf8',
                  }}
                >
                  {isWebHid ? 'DIRECT WEBHID 0x06' : 'HIGH-PRECISION EVENT LOOP'}
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-medium mt-0.5">
                True polling rate, matrix switch debounce, and contact chatter telemetry
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
              title="Reset Buffer"
            >
              <RefreshCw size={16} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
              title="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex flex-col gap-6 relative z-10">
          {/* Connection Control Strip */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
            <div className="flex items-center gap-2.5">
              <Usb size={16} style={{ color: `rgb(${glowPrimary})` }} />
              <div>
                <div className="text-xs font-bold text-white font-mono">
                  {stats?.deviceName || 'Standard Keyboard Device'}
                </div>
                {stats?.vendorId && (
                  <div className="text-[10px] text-zinc-500 font-mono">
                    VID: 0x{stats.vendorId.toString(16).padStart(4, '0')} | PID: 0x{(stats.productId || 0).toString(16).padStart(4, '0')}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {!isWebHid ? (
                <button
                  onClick={handleConnectHid}
                  disabled={isConnecting}
                  className="px-4 py-2 rounded-xl text-xs font-black tracking-wider uppercase flex items-center gap-2 border transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                  style={{
                    backgroundColor: `rgba(${glowPrimary}, 0.15)`,
                    borderColor: `rgba(${glowPrimary}, 0.4)`,
                    color: `rgb(${glowPrimary})`,
                    boxShadow: `0 0 15px rgba(${glowPrimary}, 0.15)`,
                  }}
                >
                  <Radio size={13} className="animate-pulse" />
                  {isConnecting ? 'Connecting...' : 'Connect Raw WebHID Device'}
                </button>
              ) : (
                <button
                  onClick={handleDisconnect}
                  className="px-4 py-2 rounded-xl text-xs font-black tracking-wider uppercase border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all cursor-pointer"
                >
                  Disconnect HID
                </button>
              )}
            </div>
          </div>

          {/* Primary Telemetry Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            {/* Polling Rate */}
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-col justify-between">
              <span className="text-[10px] font-black tracking-widest text-zinc-400 uppercase flex items-center gap-1.5">
                <Radio size={12} style={{ color: `rgb(${glowPrimary})` }} /> Polling Rate
              </span>
              <div className="text-2xl sm:text-3xl font-black text-white font-mono my-1">
                {harmonicHz} <span className="text-xs text-zinc-500 font-bold">HZ</span>
              </div>
              <span className="text-[10px] text-zinc-500 font-mono">
                Measured: {currentHz > 0 ? `${currentHz}Hz` : 'Idle'}
              </span>
            </div>

            {/* Jitter Variance */}
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-col justify-between">
              <span className="text-[10px] font-black tracking-widest text-zinc-400 uppercase flex items-center gap-1.5">
                <Activity size={12} className="text-sky-400" /> Timing Jitter
              </span>
              <div className="text-2xl sm:text-3xl font-black text-white font-mono my-1">
                ±{stats?.jitterStdDevMs ?? 0} <span className="text-xs text-zinc-500 font-bold">MS</span>
              </div>
              <span className="text-[10px] text-zinc-500">
                Mean report interval: {stats?.meanIntervalMs ?? 0}ms
              </span>
            </div>

            {/* Matrix Debounce Duration */}
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-col justify-between">
              <span className="text-[10px] font-black tracking-widest text-zinc-400 uppercase flex items-center gap-1.5">
                <Sliders size={12} style={{ color: `rgb(${glowSecondary})` }} /> Debounce Time
              </span>
              <div className="text-2xl sm:text-3xl font-black text-white font-mono my-1">
                {stats?.meanDebounceMs ?? 0} <span className="text-xs text-zinc-500 font-bold">MS</span>
              </div>
              <span className="text-[10px] text-zinc-500">Contact bounce settling</span>
            </div>

            {/* Switch Stability */}
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-col justify-between">
              <span className="text-[10px] font-black tracking-widest text-zinc-400 uppercase flex items-center gap-1.5">
                <ShieldCheck size={12} className={stability >= 80 ? 'text-emerald-400' : 'text-amber-400'} /> Stability
              </span>
              <div className="text-2xl sm:text-3xl font-black text-white font-mono my-1">
                {stability}<span className="text-xs text-zinc-500 font-bold">%</span>
              </div>
              <span className="text-[10px] text-zinc-500">
                {stats?.chatterCount ? `${stats.chatterCount} chatter hits` : 'Zero chatter detected'}
              </span>
            </div>
          </div>

          {/* Real-time Oscilloscope Stream Canvas */}
          <div className="p-4 rounded-2xl bg-black/40 border border-white/5 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black tracking-widest text-zinc-400 uppercase flex items-center gap-1.5">
                <BarChart3 size={12} style={{ color: `rgb(${glowPrimary})` }} /> REAL-TIME REPORT INTERVAL STREAM (NATIVE REFRESH)
              </span>
              <span className="text-[10px] text-zinc-500 font-mono">
                {stats?.totalReports ?? 0} Total Packets
              </span>
            </div>

            <canvas
              ref={canvasRef}
              height={110}
              className="w-full h-[110px] block rounded-xl"
            />
          </div>

          {/* Latency Distribution Histogram */}
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
            <div className="text-[10px] font-black tracking-widest text-zinc-400 uppercase mb-3">
              INTERVAL DISTRIBUTION HISTOGRAM
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2">
              {(stats?.histogramBuckets || []).map((b, idx) => (
                <div key={idx} className="p-2.5 rounded-xl bg-black/30 border border-white/5 flex flex-col items-center justify-between text-center">
                  <span className="text-[9px] font-mono text-zinc-400 font-bold truncate w-full">{b.bucket}</span>
                  <span
                    className="text-lg font-black font-mono my-1"
                    style={{ color: b.count > 0 ? `rgb(${glowPrimary})` : 'rgba(255,255,255,0.2)' }}
                  >
                    {b.count}
                  </span>
                  <span className="text-[9px] text-zinc-600 font-mono">hits</span>
                </div>
              ))}
            </div>
          </div>

          {/* Interactive Switch Matrix Hammer Zone */}
          <div className="p-4 rounded-2xl bg-black/30 border border-white/5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black tracking-widest text-zinc-400 uppercase flex items-center gap-1.5">
                <Keyboard size={12} style={{ color: `rgb(${glowPrimary})` }} /> RECENT SWITCH CONTACT EVENTS &amp; CHATTER LOG
              </span>
              <span className="text-[10px] text-zinc-500 font-mono">Spam keys anywhere to test</span>
            </div>

            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto custom-scrollbar p-2">
              {(stats?.switchDebounceEvents || []).length > 0 ? (
                (stats?.switchDebounceEvents || []).map((ev, i) => (
                  <div
                    key={i}
                    className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-2 border transition-all ${
                      ev.isChatter
                        ? 'bg-red-500/10 border-red-500/30 text-red-300'
                        : 'bg-white/[0.04] border-white/10 text-white'
                    }`}
                  >
                    <span>{ev.key}</span>
                    <span className="text-[10px] opacity-70 font-normal">{ev.bounceDurationMs}ms</span>
                    {ev.isChatter && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/30 text-red-200 font-black">
                        CHATTER
                      </span>
                    )}
                  </div>
                ))
              ) : (
                <div className="w-full text-center py-4 text-xs text-zinc-600 font-mono">
                  Press switch keys to capture contact debounce settling times.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
