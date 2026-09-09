// ═══════════════════════════════════════════════════════════════════════
//  KEY HEATMAP v2 — Mechanical Typing Intelligence Cockpit
//  ---------------------------------------------------------------------
//  Complete overhaul from a minimal 27-key flat grid into a high-end
//  mechanical keyboard visualisation with:
//
//    1. 3D sculpted keycaps with home-row nibs on F / J and secondary sublabels
//    2. Five diagnostic modes: Typos · Hesitation · Volume · Ergonomics · Bigrams
//    3. Dual layout toggle: Compact Alphas ↔ Full 60% ANSI flush mechanical board
//    4. Interactive live key tester — physical keydowns illuminate + depress
//       the virtual keycap in real time with procedural Web Audio switch clacks
//    5. Switch Sound Profiles: Thock (tactile) · Clack (clicky) · Creamy (linear)
//    6. Pinned Key Inspector cockpit — click any key for deep-dive stats,
//       grade (S+ to F), finger assignment, and single-key drill launcher
//    7. Summary telemetry HUD (accuracy, fastest key, primary bottleneck, mastered count)
//    8. Ergonomic hand workload balance split bar (Left vs Right hand load)
//
//  Dynamic theme binding: every accent colour uses `rgba(accent, alpha)`.
//  No hardcoded cyan / amber / rose on theme-sensitive elements.
// ═══════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  Keyboard, Loader2, Zap, Volume2, VolumeX,
  Target, Activity, Gauge, Hand, ArrowRightLeft, ChevronRight, X, Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { useSmartDrills } from '@/hooks/useSmartDrills';
import { rgba, springFluid } from '@/lib/motion';
import {
  type KeyDef, type KeyRow, type KeyGrade,
  FULL_60_LAYOUT,
  codeToKeyId, fingerOf, computeHandBalance, gradeKey, GRADE_COLORS,
} from '@/lib/keyboardErgonomics';
import { playMechClick, type SwitchProfile } from '@/lib/mechanicalAudio';

/* ── Public types (unchanged for call-site compat) ────────────────── */

/** What the typing engine records per key. */
export type KeyStat = { total: number; errors: number; totalMs?: number };
export type HeatmapData = Record<string, KeyStat>;

/* ── Constants ────────────────────────────────────────────────────── */

const SLOW_MS = 300;
const SLOPPY_RATE = 0.1;
const DELAY_CEILING = 1000;
const KEY_UNIT_PX = 44;  // 1u = 44px

type Mode = 'accuracy' | 'speed' | 'frequency' | 'finger' | 'transitions';

const MODE_META: Record<Mode, { label: string; legend: string; icon: typeof Keyboard }> = {
  accuracy:    { label: 'Typos',       legend: 'Red = typos & error rate',              icon: Target },
  speed:       { label: 'Hesitation',  legend: 'Blue = pause & delay before strike',    icon: Activity },
  frequency:   { label: 'Volume',      legend: 'Accent = keystroke mileage & wear',     icon: Gauge },
  finger:      { label: 'Ergonomics',  legend: 'Colour = touch-typing finger zones',    icon: Hand },
  transitions: { label: 'Bigrams',     legend: 'Highlight = slow transition bottlenecks', icon: ArrowRightLeft },
};

const SWITCH_PROFILES: { id: SwitchProfile; label: string; desc: string }[] = [
  { id: 'thock',  label: 'Thock',  desc: 'Tactile brown / holy panda' },
  { id: 'clack',  label: 'Clack',  desc: 'Clicky blue / box white' },
  { id: 'creamy', label: 'Creamy', desc: 'Linear red / oil king' },
];

/* ── Component ────────────────────────────────────────────────────── */

export function KeyHeatmap({
  data,
  accent,
  onStartDrill,
}: {
  data: HeatmapData;
  accent: string;
  onStartDrill?: (text: string) => void;
}) {
  const reduce = useReducedMotion();
  const [mode, setMode] = useState<Mode>('accuracy');
  const [soundOn, setSoundOn] = useState(false);
  const [switchProfile, setSwitchProfile] = useState<SwitchProfile>('thock');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set());
  const boardRef = useRef<HTMLDivElement>(null);

  const { generateDrill, isGenerating } = useSmartDrills();

  /* ── Derived statistics ─────────────────────────────────────────── */

  const stats = useMemo(() => {
    let maxErrorRate = 0;
    let maxDelay = 0;
    let maxTotal = 0;
    let totalKeys = 0;
    let totalErrors = 0;
    let totalHits = 0;
    let fastestKey = '';
    let fastestMs = Infinity;
    let bottleneckKey = '';
    let bottleneckRate = 0;
    const weak: string[] = [];

    for (const [key, stat] of Object.entries(data)) {
      if (!stat || stat.total <= 0) continue;
      totalKeys++;
      totalHits += stat.total;
      totalErrors += stat.errors;

      const rate = stat.errors / stat.total;
      if (rate > maxErrorRate) maxErrorRate = rate;
      if (stat.total > maxTotal) maxTotal = stat.total;

      const delay = (stat.totalMs ?? 0) / stat.total;
      if (delay > maxDelay) maxDelay = delay;

      if (delay > 0 && delay < fastestMs && stat.total > 5) {
        fastestMs = delay;
        fastestKey = key;
      }
      if (rate > bottleneckRate && stat.total > 5) {
        bottleneckRate = rate;
        bottleneckKey = key;
      }
      if (key !== 'SPACE' && stat.total > 5 && (rate > SLOPPY_RATE || delay > SLOW_MS)) {
        weak.push(key);
      }
    }

    return {
      maxErrorRate, maxDelay: Math.min(maxDelay, DELAY_CEILING), maxTotal,
      totalKeys, totalHits, totalErrors,
      globalAcc: totalHits > 0 ? ((totalHits - totalErrors) / totalHits) : 1,
      fastestKey, fastestMs: fastestMs === Infinity ? 0 : Math.round(fastestMs),
      bottleneckKey, bottleneckRate,
      weakKeys: weak,
      masteredCount: Object.entries(data).filter(([, s]) => s && s.total > 10 && s.errors / s.total <= 0.02).length,
    };
  }, [data]);

  const handBalance = useMemo(() => computeHandBalance(data), [data]);

  /* ── Worst keys with delay for transitions mode ─────────────────── */

  const worstTransitions = useMemo(() => {
    return Object.entries(data)
      .filter(([k, s]) => s && s.total > 2 && k !== 'SPACE' && k !== 'ENTER')
      .map(([key, stat]) => ({
        key,
        errorRate: stat.errors / stat.total,
        errors: stat.errors,
        total: stat.total,
        avgMs: Math.round((stat.totalMs || 0) / stat.total),
      }))
      .sort((a, b) => b.avgMs - a.avgMs || b.errorRate - a.errorRate)
      .slice(0, 8);
  }, [data]);

  /* ── Interactive keyboard listener ──────────────────────────────── */

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      const id = codeToKeyId(e.code);
      if (!id) return;

      setPressedKeys(prev => new Set(prev).add(id));
      if (soundOn) playMechClick(0.35, switchProfile);
    };

    const onUp = (e: KeyboardEvent) => {
      const id = codeToKeyId(e.code);
      if (!id) return;
      setPressedKeys(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    };

    window.addEventListener('keydown', onDown, true);
    window.addEventListener('keyup', onUp, true);
    return () => {
      window.removeEventListener('keydown', onDown, true);
      window.removeEventListener('keyup', onUp, true);
    };
  }, [soundOn, switchProfile]);

  /* ── Drill launcher ─────────────────────────────────────────────── */

  const startDrill = useCallback(async (targets?: string[]) => {
    if (!onStartDrill) return;
    const drillTargets = targets && targets.length > 0 ? targets : stats.weakKeys;
    const result = await generateDrill(drillTargets);
    toast.success(
      result.engine === 'procedural'
        ? 'Procedural engine built a drill from your weak keys.'
        : 'AI engine built a drill from your weak keys.',
    );
    onStartDrill(result.text);
  }, [onStartDrill, generateDrill, stats.weakKeys]);

  /* ── Key intensity calculator ───────────────────────────────────── */

  const getKeyStyle = useCallback((keyDef: KeyDef) => {
    const stat = data[keyDef.id];
    const total = stat?.total ?? 0;
    const hasData = total > 0;
    const rate = hasData ? stat.errors / total : 0;
    const delay = hasData ? (stat.totalMs ?? 0) / total : 0;
    const isPressed = pressedKeys.has(keyDef.id);
    const isSelected = selectedKey === keyDef.id;

    let intensity = 0;
    let hue = '239, 68, 68'; // default red for accuracy

    if (mode === 'accuracy') {
      hue = '239, 68, 68';
      intensity = stats.maxErrorRate > 0 ? rate / stats.maxErrorRate : 0;
      if (rate > 0) intensity = Math.max(0.3, intensity);
    } else if (mode === 'speed') {
      hue = '59, 130, 246';
      intensity = stats.maxDelay > 0 ? Math.min(delay / stats.maxDelay, 1) : 0;
      if (delay > 0) intensity = Math.max(0.2, intensity);
    } else if (mode === 'frequency') {
      hue = accent;
      intensity = stats.maxTotal > 0 ? total / stats.maxTotal : 0;
      if (total > 0) intensity = Math.max(0.15, intensity);
    } else if (mode === 'transitions') {
      hue = accent;
      intensity = delay > 220 ? Math.min(delay / 400, 1) : 0;
      if (delay > 200) intensity = Math.max(0.25, intensity);
    } else if (mode === 'finger') {
      hue = ''; // handled separately via finger zone hsl
    }

    const lit = intensity > 0.1 && mode !== 'finger';
    const fingerHue = keyDef.finger.hue;

    // 3D keycap base styling
    const bg = mode === 'finger'
      ? (hasData ? `hsla(${fingerHue}, ${Math.max(0.08, Math.min(0.38, total / (stats.maxTotal || 1) * 0.38))})` : 'rgba(255,255,255,0.02)')
      : hasData ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.015)';

    const border = mode === 'finger'
      ? `hsla(${fingerHue}, ${hasData ? 0.5 : 0.12})`
      : lit ? rgba(hue, Math.min(1, intensity * 0.9)) : 'rgba(255,255,255,0.08)';

    const glow = mode === 'finger'
      ? (hasData && total > 5 ? `0 0 12px hsla(${fingerHue}, 0.25)` : 'none')
      : lit
        ? `0 0 ${Math.round(intensity * 18)}px ${rgba(hue, intensity * 0.5)}, inset 0 0 ${Math.round(intensity * 10)}px ${rgba(hue, intensity * 0.3)}`
        : 'none';

    const textColor = mode === 'finger'
      ? (hasData ? `hsla(${fingerHue}, 0.9)` : 'rgba(255,255,255,0.2)')
      : intensity > 0.5 ? '#fff' : hasData ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.2)';

    return {
      bg, border, glow, textColor, isPressed, isSelected,
      stat, hasData, rate, delay, total, intensity,
    };
  }, [data, mode, accent, pressedKeys, selectedKey, stats]);

  /* ── Currently active layout (Full 60% ANSI Mechanical Board) ── */

  const rows: KeyRow[] = FULL_60_LAYOUT;

  /* ── Key Inspector data ─────────────────────────────────────────── */

  const inspectorData = useMemo(() => {
    if (!selectedKey) return null;
    const stat = data[selectedKey];
    if (!stat || stat.total <= 0) return { key: selectedKey, total: 0, errors: 0, rate: 0, avgMs: 0, grade: 'F' as KeyGrade, finger: fingerOf(selectedKey) };
    const rate = stat.errors / stat.total;
    const avgMs = Math.round((stat.totalMs ?? 0) / stat.total);
    return {
      key: selectedKey,
      total: stat.total,
      errors: stat.errors,
      rate,
      avgMs,
      grade: gradeKey(rate, avgMs),
      finger: fingerOf(selectedKey),
    };
  }, [selectedKey, data]);

  /* ── Render ─────────────────────────────────────────────────────── */

  return (
    <div className="space-y-4">
      {/* ── Telemetry HUD ─────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left: stats ribbon */}
        <div className="flex flex-wrap items-center gap-4">
          <HudStat label="Accuracy" value={`${Math.round(stats.globalAcc * 100)}%`} accent={accent} />
          <HudDot />
          {stats.fastestKey && (
            <>
              <HudStat label="Fastest" value={`${stats.fastestKey} ${stats.fastestMs}ms`} accent={accent} />
              <HudDot />
            </>
          )}
          {stats.bottleneckKey && (
            <HudStat label="Bottleneck" value={`${stats.bottleneckKey} ${Math.round(stats.bottleneckRate * 100)}%`} danger />
          )}
          <HudDot />
          <HudStat label="Mastered" value={`${stats.masteredCount}`} accent={accent} />
        </div>

        {/* Right: controls bar conforming to GEMINI.md minimalist layout */}
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Mode tabs */}
          {(Object.keys(MODE_META) as Mode[]).map((m) => {
            const meta = MODE_META[m];
            const Icon = meta.icon;
            return (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                aria-pressed={mode === m}
                className={`flex items-center gap-1 rounded-full border px-2.5 py-1 font-mono text-[9px] font-black uppercase tracking-[0.14em] outline-none transition-all focus-visible:ring-2 focus-visible:ring-white/40 ${mode === m ? 'text-white' : 'border-white/10 text-white/40 hover:text-white/70'}`}
                style={mode === m ? { borderColor: rgba(accent, 0.5), background: rgba(accent, 0.14) } : undefined}
              >
                <Icon size={10} />
                {meta.label}
              </button>
            );
          })}

          <div className="w-1.5 h-1.5 rounded-full bg-white/10 mx-0.5" />

          {/* Sound toggle & switch profile picker */}
          <div className="flex items-center gap-1 rounded-full border border-white/10 px-1.5 py-0.5">
            <button
              type="button"
              onClick={() => {
                const next = !soundOn;
                setSoundOn(next);
                if (next) playMechClick(0.35, switchProfile);
              }}
              className="flex items-center gap-1 font-mono text-[9px] font-black uppercase tracking-[0.14em] outline-none transition-colors hover:text-white/70"
              style={{ color: soundOn ? rgba(accent, 1) : 'rgba(255,255,255,0.35)' }}
              title={soundOn ? 'Mute clack sound' : 'Enable mechanical clack sound'}
            >
              {soundOn ? <Volume2 size={10} /> : <VolumeX size={10} />}
              <span>{soundOn ? switchProfile : 'Audio'}</span>
            </button>

            {soundOn && (
              <div className="flex items-center gap-0.5 ml-1 border-l border-white/10 pl-1">
                {SWITCH_PROFILES.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setSwitchProfile(p.id);
                      playMechClick(0.35, p.id);
                    }}
                    className={`px-1.5 py-0.5 rounded font-mono text-[8px] font-bold uppercase transition-colors ${switchProfile === p.id ? 'bg-white/20 text-white' : 'text-white/30 hover:text-white/60'}`}
                    title={p.desc}
                  >
                    {p.label[0]}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="w-1.5 h-1.5 rounded-full bg-white/10 mx-0.5" />

          {/* Drill CTA */}
          {onStartDrill && (
            <button
              type="button"
              disabled={isGenerating}
              onClick={() => {
                if (mode === 'transitions' && worstTransitions.length > 0) {
                  startDrill(worstTransitions.slice(0, 5).map(k => k.key));
                } else {
                  startDrill();
                }
              }}
              className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[9px] font-black uppercase tracking-[0.14em] text-white outline-none transition-colors focus-visible:ring-2 focus-visible:ring-white/40 disabled:opacity-50"
              style={{ borderColor: rgba(accent, 0.45), background: rgba(accent, 0.12) }}
            >
              {isGenerating
                ? <Loader2 size={11} className="animate-spin" />
                : <Zap size={11} style={{ color: rgba(accent, 1) }} />}
              {isGenerating
                ? 'Building'
                : mode === 'transitions' && worstTransitions.length > 0
                  ? `Drill ${Math.min(5, worstTransitions.length)} bottlenecks`
                  : stats.weakKeys.length > 0
                    ? `Drill ${stats.weakKeys.length} keys`
                    : 'Warmup drill'}
            </button>
          )}
        </div>
      </div>

      {/* ── Legend + interactive hint ─────────────────────────────── */}
      <div className="flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.18em] text-white/35">
        <span className="flex items-center gap-2">
          <Keyboard size={11} />
          {MODE_META[mode].legend}
        </span>
        <span className="hidden sm:inline text-white/25">
          press any physical key to test · click keycap for deep analytics
        </span>
      </div>

      {/* ── Board + Inspector split cockpit ───────────────────────── */}
      <div className="flex flex-col lg:flex-row items-start gap-4">
        {/* Board container */}
        <div
          ref={boardRef}
          className="custom-scrollbar -mx-1 overflow-x-auto px-1 pb-2 flex-1 min-w-0 w-full"
        >
          <div className="flex w-max min-w-full flex-col items-center gap-1.5 py-1">
            {rows.map((row, rowIndex) => (
              <div
                key={rowIndex}
                className="flex gap-1.5"
              >
                {row.keys.map((keyDef) => {
                  const ks = getKeyStyle(keyDef);
                  const w = keyDef.width * KEY_UNIT_PX;

                  return (
                    <motion.button
                      key={keyDef.id}
                      type="button"
                      onClick={() => {
                        setSelectedKey(prev => prev === keyDef.id ? null : keyDef.id);
                        if (soundOn) playMechClick(0.3, switchProfile);
                      }}
                      className="group relative flex flex-col items-center justify-center rounded-lg border-t border-l border-r outline-none select-none transition-shadow"
                      style={{
                        width: `${w}px`,
                        height: '46px',
                        background: `linear-gradient(to bottom, ${ks.bg}, rgba(0,0,0,0.22))`,
                        borderTopColor: ks.border,
                        borderLeftColor: ks.border,
                        borderRightColor: ks.border,
                        borderBottom: `3px solid ${ks.isPressed ? 'transparent' : 'rgba(0,0,0,0.6)'}`,
                        boxShadow: ks.isSelected
                          ? `0 0 0 2px ${rgba(accent, 0.8)}, ${ks.glow}`
                          : ks.glow,
                        color: ks.textColor,
                        transform: ks.isPressed ? 'translateY(2px)' : 'translateY(0px)',
                        transition: 'transform 0.05s ease-out, box-shadow 0.12s ease-out',
                      }}
                    >
                      {/* Secondary symbol sublabel (for number/symbol row) */}
                      {keyDef.sublabel && (
                        <span className="font-mono text-[8px] font-semibold leading-none opacity-40 mb-0.5">
                          {keyDef.sublabel}
                        </span>
                      )}

                      {/* Main keycap legend */}
                      <span className="font-mono text-[10px] font-black leading-none">
                        {keyDef.label}
                      </span>

                      {/* Tactile home-row nib on F and J */}
                      {keyDef.hasNib && (
                        <span
                          className="absolute bottom-1 left-1/2 -translate-x-1/2 rounded-full pointer-events-none"
                          style={{
                            width: '10px',
                            height: '2px',
                            background: 'rgba(255,255,255,0.4)',
                          }}
                        />
                      )}

                      {/* Hover tooltip card */}
                      {ks.hasData && (mode === 'accuracy' || mode === 'speed' || mode === 'transitions') && (
                        <div
                          role="tooltip"
                          className={`pointer-events-none absolute left-1/2 z-30 hidden w-max -translate-x-1/2 rounded-xl border border-white/10 bg-[#05070c] p-2.5 shadow-2xl group-hover:block ${rowIndex < 2 ? 'top-full mt-2' : 'bottom-full mb-2'}`}
                        >
                          <div className="mb-1.5 font-mono text-[8px] uppercase tracking-[0.2em] text-white/40">
                            {keyDef.id === 'SPACE' ? 'Spacebar' : `Key ${keyDef.label}`}
                          </div>
                          <dl className="grid grid-cols-[auto_auto] gap-x-4 gap-y-1 text-left">
                            <dt className="font-mono text-[8px] uppercase tracking-[0.16em] text-white/35">Typos</dt>
                            <dd className="font-sans text-[11px] font-black text-rose-400">
                              {Math.round(ks.rate * 100)}% <span className="text-white/30">({ks.stat!.errors})</span>
                            </dd>
                            <dt className="font-mono text-[8px] uppercase tracking-[0.16em] text-white/35">Delay</dt>
                            <dd className="font-sans text-[11px] font-black text-sky-400">
                              {ks.delay > 0 ? `${Math.round(ks.delay)}ms` : '—'}
                            </dd>
                            <dt className="font-mono text-[8px] uppercase tracking-[0.16em] text-white/35">Pressed</dt>
                            <dd className="font-sans text-[11px] font-black text-white">{ks.total.toLocaleString()}</dd>
                          </dl>
                        </div>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* ── Key Inspector Cockpit (Pinned side panel) ─────────────── */}
        <AnimatePresence mode="wait">
          {inspectorData && (
            <motion.div
              key={inspectorData.key}
              initial={reduce ? undefined : { opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduce ? undefined : { opacity: 0, x: 20 }}
              transition={springFluid}
              className="w-full lg:w-72 shrink-0 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 backdrop-blur-md shadow-2xl"
            >
              {/* Inspector Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  {/* 3D Keycap hero badge */}
                  <div
                    className="flex h-14 w-14 items-center justify-center rounded-xl border-t border-l border-r font-mono text-xl font-black shadow-lg"
                    style={{
                      background: 'linear-gradient(to bottom, rgba(255,255,255,0.08), rgba(0,0,0,0.3))',
                      borderTopColor: rgba(accent, 0.5),
                      borderLeftColor: rgba(accent, 0.35),
                      borderRightColor: rgba(accent, 0.35),
                      borderBottom: '4px solid rgba(0,0,0,0.6)',
                      color: 'white',
                      boxShadow: `0 0 20px ${rgba(accent, 0.2)}`,
                    }}
                  >
                    {inspectorData.key === 'SPACE' ? '⎵' : inspectorData.key}
                  </div>
                  <div>
                    <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-white/35">
                      {inspectorData.finger.hand === 'L' ? 'Left' : 'Right'} Hand · {inspectorData.finger.finger.replace(/^[LR]-/, '')}
                    </div>
                    {inspectorData.total > 0 && (
                      <div
                        className="mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10px] font-black"
                        style={{
                          background: rgba(GRADE_COLORS[inspectorData.grade], 0.15),
                          color: rgba(GRADE_COLORS[inspectorData.grade], 1),
                          border: `1px solid ${rgba(GRADE_COLORS[inspectorData.grade], 0.35)}`,
                        }}
                      >
                        <Sparkles size={9} />
                        GRADE {inspectorData.grade}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedKey(null)}
                  className="rounded-full p-1 text-white/30 hover:text-white/70 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>

              {inspectorData.total === 0 ? (
                <p className="text-center font-mono text-[10px] text-white/35 py-6">
                  No keystrokes recorded for this key yet. Complete tests to build profile.
                </p>
              ) : (
                <>
                  {/* Detailed Stat Grid */}
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <InspectorStat label="Accuracy" value={`${Math.round((1 - inspectorData.rate) * 100)}%`} />
                    <InspectorStat label="Avg Latency" value={`${inspectorData.avgMs}ms`} />
                    <InspectorStat label="Lifetime Hits" value={inspectorData.total.toLocaleString()} />
                    <InspectorStat label="Total Errors" value={inspectorData.errors.toString()} danger={inspectorData.errors > 0} />
                  </div>

                  {/* Accuracy Bar */}
                  <div className="mb-4">
                    <div className="flex justify-between font-mono text-[8px] text-white/30 mb-1">
                      <span>ACCURACY PRECISION</span>
                      <span>{Math.round((1 - inspectorData.rate) * 100)}%</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: rgba(accent, 0.8) }}
                        initial={reduce ? undefined : { width: 0 }}
                        animate={{ width: `${Math.round((1 - inspectorData.rate) * 100)}%` }}
                        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                      />
                    </div>
                  </div>

                  {/* Single-key drill button */}
                  {onStartDrill && (
                    <button
                      type="button"
                      disabled={isGenerating}
                      onClick={() => startDrill([inspectorData.key])}
                      className="w-full flex items-center justify-center gap-1.5 rounded-xl border py-2.5 font-mono text-[9px] font-black uppercase tracking-[0.16em] text-white outline-none transition-all focus-visible:ring-2 focus-visible:ring-white/40 disabled:opacity-50 hover:brightness-110"
                      style={{
                        borderColor: rgba(accent, 0.45),
                        background: rgba(accent, 0.14),
                      }}
                    >
                      {isGenerating
                        ? <Loader2 size={12} className="animate-spin" />
                        : <Zap size={12} style={{ color: rgba(accent, 1) }} />}
                      Drill This Key
                      <ChevronRight size={10} className="text-white/40" />
                    </button>
                  )}
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Bigram Bottlenecks Grid (Visible in transitions mode) ───── */}
      {mode === 'transitions' && (
        <motion.div
          initial={reduce ? undefined : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={springFluid}
          className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3"
        >
          <div className="flex items-center justify-between mb-2.5 font-mono text-[9px] uppercase tracking-[0.18em] text-white/35">
            <span>Primary Transition Bottlenecks</span>
            <span className="text-white/20">Ranked by latency & hesitation</span>
          </div>

          {worstTransitions.length === 0 ? (
            <div className="py-6 text-center text-xs font-mono text-white/35">
              No transition bottleneck data recorded yet. Complete tests to build profile.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {worstTransitions.map((item) => (
                <div
                  key={item.key}
                  onClick={() => { if (onStartDrill) startDrill([item.key]); }}
                  className="group p-2.5 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/15 transition-all cursor-pointer flex flex-col justify-between"
                  style={{
                    borderColor: item.avgMs > 220 ? rgba(accent, 0.45) : undefined,
                    boxShadow: item.avgMs > 250 ? `0 0 15px ${rgba(accent, 0.15)}` : undefined,
                  }}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono text-sm font-black text-white">{item.key}</span>
                    <span className="text-[9px] font-mono font-bold" style={{ color: rgba(accent, 0.95) }}>
                      {item.avgMs > 0 ? `${item.avgMs}ms` : '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[9px] font-mono text-white/35">
                    <span>{item.errors} typos</span>
                    <span className="text-white/60 group-hover:text-white transition-colors">Drill →</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* ── Finger Ergonomics: Hand Balance Bar ──────────────────────── */}
      {mode === 'finger' && (
        <motion.div
          initial={reduce ? undefined : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={springFluid}
          className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3"
        >
          <div className="flex items-center justify-between mb-2 font-mono text-[9px] uppercase tracking-[0.18em] text-white/35">
            <span>Hand Workload Balance</span>
            <span className="text-white/20">{handBalance.leftTotal.toLocaleString()} Left · {handBalance.rightTotal.toLocaleString()} Right</span>
          </div>
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-white/[0.04]">
            <motion.div
              className="h-full rounded-l-full"
              style={{ background: 'hsla(210, 85%, 60%, 0.65)' }}
              initial={reduce ? undefined : { width: 0 }}
              animate={{ width: `${Math.round(handBalance.left * 100)}%` }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            />
            <motion.div
              className="h-full rounded-r-full"
              style={{ background: 'hsla(0, 80%, 60%, 0.65)' }}
              initial={reduce ? undefined : { width: 0 }}
              animate={{ width: `${Math.round(handBalance.right * 100)}%` }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
          <div className="flex justify-between mt-1.5 font-mono text-[9px] font-black">
            <span style={{ color: 'hsla(210, 85%, 75%, 0.9)' }}>Left Hand: {Math.round(handBalance.left * 100)}%</span>
            <span style={{ color: 'hsla(0, 80%, 75%, 0.9)' }}>Right Hand: {Math.round(handBalance.right * 100)}%</span>
          </div>
        </motion.div>
      )}
    </div>
  );
}

/* ── Sub-components ──────────────────────────────────────────────────── */

function HudStat({ label, value, accent, danger }: { label: string; value: string; accent?: string; danger?: boolean }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="font-mono text-[8px] uppercase tracking-[0.18em] text-white/30">{label}</span>
      <span
        className="font-mono text-[11px] font-black"
        style={{ color: danger ? 'rgba(239, 68, 68, 0.9)' : accent ? rgba(accent, 0.85) : 'white' }}
      >
        {value}
      </span>
    </div>
  );
}

function HudDot() {
  return <div className="w-1.5 h-1.5 rounded-full bg-white/10" />;
}

function InspectorStat({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className="rounded-lg bg-white/[0.03] p-2.5">
      <div className="font-mono text-[8px] uppercase tracking-[0.16em] text-white/30 mb-1">{label}</div>
      <div className={`font-mono text-[13px] font-black ${danger ? 'text-rose-400' : 'text-white'}`}>{value}</div>
    </div>
  );
}
