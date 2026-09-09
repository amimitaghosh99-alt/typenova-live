import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  Activity, TrendingUp, RotateCcw, Brain, Share2, Play, Ghost, ArrowLeft,
  Sparkles, ShieldCheck, Crosshair, Waves, Lock, Zap, Award, Bot, X, Loader2, Terminal
} from 'lucide-react';
import { motion } from 'framer-motion';
import { springFluid } from '@/lib/motion';
import type { Theme } from '@/data/constants';
import type { Keystroke } from '@/hooks/useTypingEngine';
import { shareResultCard } from '@/utils/shareCard';
import { WpmGraph } from '@/components/graphs/WpmGraph';
import { IkiInspector } from '@/components/profile/IkiInspector';
import { ShadowInspector } from '@/components/profile/ShadowInspector';
import { calculateIKIMetrics, type IKIMetrics } from '@/lib/ikiEngine';
import type { ShadowMetrics } from '@/lib/shadowEngine';
import {
  type PerformanceGrade,
  type CPIBreakdown,
  type XpBreakdown,
  calculateCPI,
  getGradeDetails,
  calculateBurstWpm,
  calculateAccolades,
  calculateXPProgression,
} from '@/lib/scoringEngine';
import { getAruPersona, getAruDebriefPolicy, generateAruDebrief, ARU_PERSONAS } from '@/lib/aiClient';

export interface ResultsScreenProps {
  wpm: number;
  rawWpm: number;
  accuracy: number;
  consistency: number;
  flawlessStreak: number;
  leveledUp: boolean;
  xpGainedLast: number;
  xpBreakdown?: XpBreakdown | null;
  cpi?: number;
  grade?: PerformanceGrade;
  burstWpm?: number;
  ikiMetrics?: IKIMetrics;
  shadowMetrics?: ShadowMetrics;
  theme: Theme;
  heatmapData: Record<string, { total: number; errors: number }>;
  isLoggedIn: boolean;
  displayName: string | null;
  saveStatus: string;
  timelinePoints: Array<{ t: number; wpm: number; rawWpm: number }>;
  errorTimes: number[];
  durationMs: number;
  keystrokeLog: Keystroke[];
  testStartTime: number;
  onReset: () => void;
  onWatchReplay: () => void;
  onStartMicroDrill: (keyChar: string) => void;
  onStartSmartDrill: ((keys?: string[]) => void) | null;
  isSmartDrillGenerating?: boolean;
  ghostTimeline?: Array<{ t: number; wpm: number }> | null;
  ghostLabel?: string;
  ghostDeltaS?: number;
  ghostDeltaAcc?: number;
  ghostDeltaCons?: number;
  ghostDeltaStreak?: number;
  compact?: boolean;
  /** Suppress the solo action row (NEXT TEST / replay / drills) when this panel
      is embedded inside a screen that owns its own navigation, e.g. a race. */
  hideActions?: boolean;
}

const PERSONA_ICONS: Record<string, typeof Crosshair> = {
  tactical: Crosshair,
  zen: Activity,
  cyberpunk: Terminal,
  hype: Zap,
};

export function ResultsScreen({
  wpm = 0, rawWpm = 0, accuracy = 0, consistency = 0, flawlessStreak = 0,
  leveledUp = false, xpGainedLast = 0, xpBreakdown = null,
  cpi: propCpi, grade: propGrade, burstWpm: propBurstWpm, ikiMetrics: propIkiMetrics,
  shadowMetrics,
  theme,
  saveStatus = '',
  timelinePoints = [], errorTimes = [], durationMs = 1000,
  keystrokeLog = [],
  onReset, onWatchReplay, onStartMicroDrill, onStartSmartDrill, isSmartDrillGenerating,
  ghostTimeline, ghostLabel, ghostDeltaS, ghostDeltaAcc, ghostDeltaCons, ghostDeltaStreak,
  compact = false,
  hideActions = false
}: ResultsScreenProps) {

  const [shareStatus, setShareStatus] = useState('');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const safeTimelinePoints = useMemo(() => Array.isArray(timelinePoints) ? timelinePoints : [], [timelinePoints]);
  const safeErrorTimes = useMemo(() => Array.isArray(errorTimes) ? errorTimes : [], [errorTimes]);
  const safeKeystrokeLog = useMemo(() => Array.isArray(keystrokeLog) ? keystrokeLog : [], [keystrokeLog]);
  const safeDurationMs = Math.max(durationMs || 0, 1000);

  const totalChars = useMemo(() =>
    safeKeystrokeLog.filter(k => !k.isBackspace).length,
    [safeKeystrokeLog]
  );
  const rawErrors = useMemo(() =>
    safeKeystrokeLog.filter(k => !k.isBackspace && k.isError).length,
    [safeKeystrokeLog]
  );
  const totalWords = useMemo(() =>
    Math.max(1, Math.round(totalChars / 5)),
    [totalChars]
  );

  const cpiBreakdown: CPIBreakdown = useMemo(() => {
    return calculateCPI(wpm, accuracy, flawlessStreak, consistency, totalChars);
  }, [wpm, accuracy, flawlessStreak, consistency, totalChars]);

  const evaluatedGrade: PerformanceGrade = propGrade || cpiBreakdown.grade;
  const evaluatedCpi: number = propCpi ?? cpiBreakdown.cpi;
  const gradeMeta = useMemo(() => getGradeDetails(evaluatedGrade), [evaluatedGrade]);

  const evaluatedBurstWpm = useMemo(() => {
    if (typeof propBurstWpm === 'number' && propBurstWpm > 0) return propBurstWpm;
    return calculateBurstWpm(safeKeystrokeLog, safeTimelinePoints);
  }, [propBurstWpm, safeKeystrokeLog, safeTimelinePoints]);

  const [aruDebrief, setAruDebrief] = useState<string | null>(null);
  const [isDebriefLoading, setIsDebriefLoading] = useState(false);
  const [debriefDismissed, setDebriefDismissed] = useState(false);

  const currentPersona = useMemo(() => {
    const pKey = getAruPersona();
    return ARU_PERSONAS[pKey] || ARU_PERSONAS.tactical;
  }, []);
  const debriefPolicy = useMemo(() => getAruDebriefPolicy(), []);

  const extractedWeakKeys = useMemo(() => {
    const errorMap: Record<string, { total: number; errors: number }> = {};
    safeKeystrokeLog.forEach(k => {
      if (k.isBackspace || !k.key || k.key.length !== 1) return;
      const char = k.key.toLowerCase();
      if (!errorMap[char]) errorMap[char] = { total: 0, errors: 0 };
      errorMap[char].total += 1;
      if (k.isError) errorMap[char].errors += 1;
    });

    return Object.entries(errorMap)
      .filter(([_, data]) => data.errors > 0)
      .map(([char, data]) => ({ key: char, errorRate: data.errors / data.total }))
      .sort((a, b) => b.errorRate - a.errorRate)
      .slice(0, 5)
      .map(k => k.key);
  }, [safeKeystrokeLog]);

  const hasDebriefFetchedRef = useRef(false);

  const fetchDebrief = useCallback(async (force = false) => {
    if (hasDebriefFetchedRef.current && !force) return;
    hasDebriefFetchedRef.current = true;
    setIsDebriefLoading(true);
    try {
      const telemetry = {
        wpm,
        accuracy,
        consistency,
        burstWpm: evaluatedBurstWpm,
        grade: evaluatedGrade,
        cpi: evaluatedCpi,
        weakKeys: extractedWeakKeys,
      };
      const debrief = await generateAruDebrief(telemetry, getAruPersona());
      setAruDebrief(debrief.insight);
    } catch {
      setAruDebrief('Race telemetry logged. Biomechanical cadence and rhythm recorded.');
    } finally {
      setIsDebriefLoading(false);
    }
  }, [wpm, accuracy, consistency, evaluatedBurstWpm, evaluatedGrade, evaluatedCpi, extractedWeakKeys]);

  useEffect(() => {
    if (debriefPolicy === 'always') {
      fetchDebrief();
    } else if (debriefPolicy === 'smart') {
      const isMilestone = evaluatedGrade === 'S+' || accuracy < 94 || consistency < 65 || extractedWeakKeys.length >= 2;
      if (isMilestone) {
        fetchDebrief();
      }
    }
  }, [debriefPolicy, fetchDebrief, evaluatedGrade, accuracy, consistency, extractedWeakKeys.length]);

  const accoladeBadges = useMemo(() => {
    return calculateAccolades(accuracy, flawlessStreak, consistency, totalWords, rawErrors);
  }, [accuracy, flawlessStreak, consistency, totalWords, rawErrors]);

  const effectiveXpBreakdown: XpBreakdown = useMemo(() => {
    if (xpBreakdown) return xpBreakdown;
    return calculateXPProgression(wpm, accuracy, flawlessStreak, consistency, totalChars);
  }, [xpBreakdown, wpm, accuracy, flawlessStreak, consistency, totalChars]);

  const effectiveIkiMetrics: IKIMetrics = useMemo(() => {
    if (propIkiMetrics) return propIkiMetrics;
    return calculateIKIMetrics(safeKeystrokeLog);
  }, [propIkiMetrics, safeKeystrokeLog]);

  const sessionWeakKeys = useMemo(() => {
    const errorCounts: Record<string, number> = {};
    const totalCounts: Record<string, number> = {};

    keystrokeLog.forEach(k => {
      // Backspaces have no expected char and are excluded from all accuracy stats.
      if (k.isBackspace) return;
      const rawChar = k.expected || k.key;
      if (!rawChar) return;
      const char = rawChar.toUpperCase();
      if (char === ' ' || char === '\n') return;
      totalCounts[char] = (totalCounts[char] || 0) + 1;
      if (k.isError) {
        errorCounts[char] = (errorCounts[char] || 0) + 1;
      }
    });

    const worstKeys = Object.keys(errorCounts)
      .map(k => ({ key: k, rate: errorCounts[k] / totalCounts[k], errors: errorCounts[k] }))
      .filter(k => k.errors > 0)
      .sort((a, b) => b.rate - a.rate || b.errors - a.errors)
      .map(k => k.key);

    return worstKeys.slice(0, 5);
  }, [keystrokeLog]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || (activeEl as HTMLElement).isContentEditable)) return;
      if (e.key === 'Tab' || e.key === 'Enter') {
        e.preventDefault();
        onReset();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onReset();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('keydown', handleKey);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [onReset]);

  const handleShare = async () => {
    setShareStatus('RENDERING...');
    try {
      const unlockedAccolades = accoladeBadges.filter(b => b.unlocked).map(b => b.title);
      const result = await shareResultCard({
        wpm,
        rawWpm,
        accuracy,
        consistency,
        grade: evaluatedGrade,
        gradeTitle: gradeMeta.title,
        cpi: evaluatedCpi,
        accolades: unlockedAccolades,
        themeName: theme?.name || 'CYBERPUNK',
        glowPrimary: theme?.glowPrimary || '6, 182, 212',
        glowSecondary: theme?.glowSecondary || '34, 211, 238',
      });
      setShareStatus(result === 'copied' ? 'COPIED TO CLIPBOARD!' : 'PNG DOWNLOADED!');
    } catch {
      setShareStatus('SHARE FAILED');
    }
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setShareStatus(''), 3000);
  };

  // Build heatmap rows
  const heatmapRows = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['Z', 'X', 'C', 'V', 'B', 'N', 'M']
  ];

  const testHeatmapData = useMemo(() => {
    const data: Record<string, { total: number; errors: number }> = {};
    for (const k of safeKeystrokeLog) {
      if (!k || k.isBackspace) continue;
      const char = k.expected ? k.expected.toUpperCase() : '';
      if (!char) continue;
      if (!data[char]) data[char] = { total: 0, errors: 0 };
      data[char].total++;
      if (k.isError) data[char].errors++;
    }
    return data;
  }, [safeKeystrokeLog]);

  const content = (
    <div className={compact ? '' : 'relative z-10 w-full max-w-[var(--w-ultra)] mx-auto px-6 sm:px-10 lg:px-14 xl:px-16 2xl:px-20 py-10 md:py-14'}>
      {/* Header */}
      <div className="flex flex-col items-center mb-10">
        {!compact && (
          <h1 className="text-5xl md:text-6xl xl:text-7xl font-black tracking-tight mb-4 animate-in fade-in zoom-in duration-500">TEST COMPLETE</h1>
        )}

        {leveledUp && (
          <div
            className="mb-4 px-8 py-3 rounded-full font-black tracking-widest flex items-center animate-bounce text-sm border"
            style={{
              backgroundColor: `rgba(${theme?.glowPrimary || '6, 182, 212'}, 0.2)`,
              color: `rgb(${theme?.glowPrimary || '6, 182, 212'})`,
              borderColor: `rgba(${theme?.glowPrimary || '6, 182, 212'}, 0.5)`,
              boxShadow: `0 0 30px rgba(${theme?.glowPrimary || '6, 182, 212'}, 0.5)`
            }}
          >
            <TrendingUp size={18} className="mr-3" /> LEVEL UP!
          </div>
        )}
        {xpGainedLast > 0 && !leveledUp && (
          <div className="mb-4 px-6 py-2 rounded-full bg-white/5 border border-white/10 text-zinc-300 font-black tracking-widest text-sm shadow-xl backdrop-blur-md">
            +{xpGainedLast} XP
          </div>
        )}

        {/* Ghost Net Rival Multi-Metric Performance Chip */}
        {ghostTimeline && ghostTimeline.length > 0 && typeof ghostDeltaS === 'number' && (
          <div
            className={`mb-4 px-5 py-2.5 rounded-full font-black tracking-wider text-xs flex flex-wrap items-center justify-center gap-2.5 border shadow-lg ${
              ghostDeltaS >= 0
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.25)]'
                : 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-[0_0_20px_rgba(244,63,94,0.25)]'
            }`}
          >
            <div className="flex items-center gap-2">
              <Ghost size={14} className={ghostDeltaS >= 0 ? 'text-emerald-300' : 'text-rose-300'} />
              <span>
                {ghostDeltaS >= 0
                  ? `BEAT ${ghostLabel || 'GHOST'} BY +${Math.abs(ghostDeltaS).toFixed(1)}s`
                  : `FELL BEHIND ${ghostLabel || 'GHOST'} BY -${Math.abs(ghostDeltaS).toFixed(1)}s`}
              </span>
            </div>

            {(ghostDeltaAcc !== undefined || ghostDeltaCons !== undefined || ghostDeltaStreak !== undefined) && (
              <div className="flex items-center gap-2 pl-2.5 border-l border-white/10 font-mono text-[11px]">
                {ghostDeltaAcc !== undefined && (
                  <span className={ghostDeltaAcc >= 0 ? 'text-emerald-300' : 'text-rose-300'}>
                    {ghostDeltaAcc >= 0 ? `+${ghostDeltaAcc.toFixed(1)}%` : `${ghostDeltaAcc.toFixed(1)}%`} ACC
                  </span>
                )}
                {ghostDeltaCons !== undefined && (
                  <>
                    <span className="text-white/20">·</span>
                    <span className={ghostDeltaCons >= 0 ? 'text-emerald-300' : 'text-rose-300'}>
                      {ghostDeltaCons >= 0 ? `+${ghostDeltaCons.toFixed(1)}%` : `${ghostDeltaCons.toFixed(1)}%`} CONS
                    </span>
                  </>
                )}
                {ghostDeltaStreak !== undefined && (
                  <>
                    <span className="text-white/20">·</span>
                    <span className={ghostDeltaStreak >= 0 ? 'text-emerald-300' : 'text-rose-300'}>
                      {ghostDeltaStreak >= 0 ? `+${ghostDeltaStreak}` : `${ghostDeltaStreak}`} STREAK
                    </span>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Auto-save status */}
        {saveStatus && (
          <div
            className={`mb-4 px-6 py-2 rounded-full font-black tracking-widest text-xs ${
              saveStatus.includes('Error') || saveStatus.includes('INVALID')
                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                : 'bg-white/5 border border-white/10'
            }`}
            style={
              !saveStatus.includes('Error') && !saveStatus.includes('INVALID')
                ? { color: `rgb(${theme?.glowPrimary || '6, 182, 212'})` }
                : undefined
            }
          >
            {saveStatus}
          </div>
        )}
      </div>

      {/* ── ARU NEURO-DEBRIEF CARD ── */}
      {!debriefDismissed && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={springFluid}
          className="glass-panel rounded-3xl p-5 md:p-6 mb-8 border relative overflow-hidden"
          style={{
            borderColor: `rgba(${theme?.glowPrimary || '6, 182, 212'}, 0.35)`,
            boxShadow: `0 0 30px rgba(${theme?.glowPrimary || '6, 182, 212'}, 0.08)`,
          }}
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center border shrink-0 mt-0.5"
                style={{
                  backgroundColor: `rgba(${theme?.glowPrimary || '6, 182, 212'}, 0.15)`,
                  borderColor: `rgba(${theme?.glowPrimary || '6, 182, 212'}, 0.4)`,
                  boxShadow: `0 0 15px rgba(${theme?.glowPrimary || '6, 182, 212'}, 0.25)`,
                }}
              >
                <Bot size={22} style={{ color: `rgb(${theme?.glowPrimary || '6, 182, 212'})` }} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black tracking-wider uppercase text-white">
                    Aru Neuro-Debrief
                  </span>
                  <span
                    className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border uppercase flex items-center gap-1.5"
                    style={{
                      borderColor: `rgba(${theme?.glowPrimary || '6, 182, 212'}, 0.4)`,
                      backgroundColor: `rgba(${theme?.glowPrimary || '6, 182, 212'}, 0.15)`,
                      color: `rgb(${theme?.glowPrimary || '6, 182, 212'})`,
                    }}
                  >
                    {(() => {
                      const PIcon = PERSONA_ICONS[currentPersona.id] || Crosshair;
                      return <PIcon size={10} />;
                    })()}
                    <span>{currentPersona.name}</span>
                  </span>
                </div>

                <div className="mt-1.5 text-xs text-zinc-300 font-medium leading-relaxed italic">
                  {isDebriefLoading ? (
                    <span className="flex items-center gap-2 text-zinc-400 font-mono not-italic">
                      <Loader2 size={13} className="animate-spin" style={{ color: `rgb(${theme?.glowPrimary || '6, 182, 212'})` }} />
                      Analyzing race telemetry & biomechanical friction...
                    </span>
                  ) : aruDebrief ? (
                    <span>
                      {aruDebrief.includes('Connect a free Groq') ? (
                        <span className="not-italic text-zinc-400 flex flex-wrap items-center gap-2">
                          <span>{aruDebrief}</span>
                          <a
                            href="https://console.groq.com/keys"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 font-mono font-bold text-[10px] uppercase text-white px-2 py-0.5 rounded-md transition-colors hover:brightness-125"
                            style={{
                              backgroundColor: `rgba(${theme?.glowPrimary || '6, 182, 212'}, 0.3)`,
                              border: `1px solid rgba(${theme?.glowPrimary || '6, 182, 212'}, 0.5)`,
                            }}
                          >
                            <Zap size={10} className="fill-current" /> Get Free Groq Key
                          </a>
                        </span>
                      ) : (
                        `"${aruDebrief}"`
                      )}
                    </span>
                  ) : (
                    <span className="text-zinc-400 not-italic">
                      Telemetry recorded. Ready to analyze race pacing and error clusters.
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
              {extractedWeakKeys.length > 0 && onStartSmartDrill && (
                <button
                  onClick={() => onStartSmartDrill(extractedWeakKeys)}
                  disabled={isSmartDrillGenerating}
                  className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider text-white transition-all flex items-center gap-2 cursor-pointer shadow-md hover:brightness-125"
                  style={{
                    backgroundColor: `rgba(${theme?.glowPrimary || '6, 182, 212'}, 0.25)`,
                    border: `1px solid rgba(${theme?.glowPrimary || '6, 182, 212'}, 0.5)`,
                  }}
                >
                  {isSmartDrillGenerating ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <Zap size={13} />
                  )}
                  <span>Target Weak Keys ({extractedWeakKeys.map(k => k.toUpperCase()).join(', ')})</span>
                </button>
              )}

              {!aruDebrief && !isDebriefLoading && (
                <button
                  onClick={() => fetchDebrief(true)}
                  className="px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-zinc-300 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors cursor-pointer"
                >
                  Request Debrief
                </button>
              )}

              <button
                onClick={() => setDebriefDismissed(true)}
                className="p-1.5 text-zinc-500 hover:text-zinc-300 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                title="Dismiss"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Stats Grid — wide, spacious automotive & telemetry gauges */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 xl:gap-6 mb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="glass-panel p-6 xl:p-8 rounded-[2rem] flex flex-col items-center justify-center relative overflow-hidden group transition-transform duration-300 hover:scale-[1.02]">
          <span className="text-zinc-400 text-[10px] xl:text-xs font-black tracking-widest mb-1.5 uppercase">Grade</span>
          <span className={`text-6xl xl:text-7xl font-black ${gradeMeta.colorClass} ${gradeMeta.glowClass} tracking-tight`}>
            {evaluatedGrade}
          </span>
          <span className="text-[10px] xl:text-xs font-bold text-zinc-300 mt-1 uppercase tracking-wider text-center">
            {gradeMeta.title}
          </span>
          <div className="mt-2.5 px-3 py-0.5 rounded-full bg-white/5 border border-white/10 text-[9px] xl:text-[10px] font-mono text-zinc-400">
            CPI {evaluatedCpi}
          </div>
        </div>

        <div className="glass-panel p-6 xl:p-8 rounded-[2rem] flex flex-col items-center justify-center relative overflow-hidden group transition-transform duration-300 hover:scale-[1.02]">
          <span className="text-zinc-400 text-[10px] xl:text-xs font-black tracking-widest mb-1.5 uppercase">Net WPM</span>
          <span className="text-5xl xl:text-6xl font-black text-white">{wpm}</span>
          {evaluatedBurstWpm > 0 && (
            <span className="text-[9px] xl:text-[10px] font-mono text-zinc-400 mt-1.5 font-bold">
              PEAK {evaluatedBurstWpm} BURST
            </span>
          )}
        </div>

        <div className="glass-panel p-6 xl:p-8 rounded-[2rem] flex flex-col items-center justify-center relative overflow-hidden group transition-transform duration-300 hover:scale-[1.02]">
          <span className="text-zinc-400 text-[10px] xl:text-xs font-black tracking-widest mb-3.5 uppercase">Raw WPM</span>
          <span className="text-5xl xl:text-6xl font-black text-white">{rawWpm}</span>
        </div>

        <div className="glass-panel p-6 xl:p-8 rounded-[2rem] flex flex-col items-center justify-center relative overflow-hidden group transition-transform duration-300 hover:scale-[1.02]">
          <span className="text-zinc-400 text-[10px] xl:text-xs font-black tracking-widest mb-3.5 uppercase">Accuracy</span>
          <span className="text-5xl xl:text-6xl font-black text-white">{accuracy}<span className="text-2xl text-zinc-500">%</span></span>
        </div>

        <div className="glass-panel p-6 xl:p-8 rounded-[2rem] flex flex-col items-center justify-center relative overflow-hidden group transition-transform duration-300 hover:scale-[1.02]">
          <span className="text-zinc-400 text-[10px] xl:text-xs font-black tracking-widest mb-3.5 uppercase">Consistency</span>
          <span className="text-5xl xl:text-6xl font-black text-white">{consistency}<span className="text-2xl text-zinc-500">%</span></span>
        </div>

        <div className="glass-panel p-6 xl:p-8 rounded-[2rem] flex flex-col items-center justify-center relative overflow-hidden group transition-transform duration-300 hover:scale-[1.02]">
          <span className="text-zinc-400 text-[10px] xl:text-xs font-black tracking-widest mb-3.5 uppercase">Flawless</span>
          <span
            className="text-5xl xl:text-6xl font-black"
            style={{ color: flawlessStreak > 50 ? `rgb(${theme?.glowPrimary || '6, 182, 212'})` : '#ffffff' }}
          >
            {flawlessStreak}
          </span>
        </div>
      </div>

      {/* ── ACCOLADE BADGES SECTION ──────────────────────── */}
      <div className="w-full mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700" style={{ animationDelay: '200ms' }}>
        <div className="flex items-center justify-between mb-4">
          <span className="text-zinc-400 text-[10px] font-black tracking-widest flex items-center gap-2 uppercase">
            <Award size={14} style={{ color: `rgb(${theme?.glowPrimary || '6, 182, 212'})` }} /> SESSION ACCOLADES
          </span>
          <span className="text-[10px] font-mono font-bold text-zinc-500">
            {accoladeBadges.filter(b => b.unlocked).length} / {accoladeBadges.length} UNLOCKED
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 xl:gap-6">
          {accoladeBadges.map((badge) => {
            const isUnlocked = badge.unlocked;
            const IconComponent =
              badge.id === 'flawless' ? Sparkles :
              badge.id === 'centurion' ? ShieldCheck :
              badge.id === 'surgical' ? Crosshair : Waves;

            return (
              <div
                key={badge.id}
                className={`relative p-5 xl:p-6 rounded-[1.75rem] border transition-all duration-300 flex flex-col justify-between overflow-hidden group hover:scale-[1.01] ${
                  isUnlocked
                    ? 'glass-panel'
                    : 'bg-white/[0.02] border-white/5 opacity-60 hover:opacity-80'
                }`}
                style={isUnlocked ? {
                  borderColor: `rgba(${theme?.glowPrimary || '6, 182, 212'}, 0.4)`,
                  boxShadow: `0 0 20px rgba(${theme?.glowPrimary || '6, 182, 212'}, 0.15)`
                } : undefined}
                title={badge.description || badge.desc}
              >
                {/* Top Row: Icon & Status Badge */}
                <div className="flex items-start justify-between mb-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-transform group-hover:scale-105 ${
                      isUnlocked ? 'border-white/20' : 'bg-white/5 border-white/10 text-zinc-600'
                    }`}
                    style={isUnlocked ? {
                      backgroundColor: `rgba(${theme?.glowPrimary || '6, 182, 212'}, 0.15)`,
                      color: `rgb(${theme?.glowPrimary || '6, 182, 212'})`,
                      borderColor: `rgba(${theme?.glowPrimary || '6, 182, 212'}, 0.3)`
                    } : undefined}
                  >
                    <IconComponent size={20} />
                  </div>

                  <span
                    className={`text-[9px] font-black tracking-widest uppercase px-2.5 py-1 rounded-full border ${
                      isUnlocked
                        ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                        : 'bg-white/5 border-white/10 text-zinc-500 flex items-center gap-1'
                    }`}
                  >
                    {isUnlocked ? (
                      'UNLOCKED'
                    ) : (
                      <>
                        <Lock size={9} /> LOCKED
                      </>
                    )}
                  </span>
                </div>

                {/* Badge Info */}
                <div>
                  <h4 className={`text-sm font-black tracking-tight mb-1 ${isUnlocked ? 'text-white' : 'text-zinc-400'}`}>
                    {badge.title}
                  </h4>
                  <p className="text-zinc-500 text-xs font-medium leading-relaxed line-clamp-2">
                    {badge.subtitle || badge.desc || badge.description}
                  </p>
                </div>

                {/* Progress Bar (when locked and progress is available) */}
                {!isUnlocked && badge.progress && (
                  <div className="mt-3 pt-3 border-t border-white/5">
                    <div className="flex justify-between text-[9px] font-mono text-zinc-500 mb-1">
                      <span>PROGRESS</span>
                      <span>{badge.progress.current} / {badge.progress.target} {badge.progress.unit}</span>
                    </div>
                    <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-zinc-600 rounded-full transition-all"
                        style={{ width: `${Math.min(100, Math.max(0, (badge.progress.current / badge.progress.target) * 100))}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── XP PROGRESSION & MULTIPLIER BREAKDOWN ─────────── */}
      {effectiveXpBreakdown && effectiveXpBreakdown.totalXp > 0 && (
        <div
          className="glass-panel rounded-[2rem] p-6 md:p-8 xl:p-10 mb-10 border border-white/10 relative overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700"
          style={{
            borderColor: `rgba(${theme?.glowPrimary || '6, 182, 212'}, 0.3)`,
            boxShadow: `0 0 25px rgba(${theme?.glowPrimary || '6, 182, 212'}, 0.12)`,
          }}
        >
          {/* Ambient corner glow */}
          <div
            className="absolute top-0 right-0 w-80 h-80 rounded-full blur-[90px] pointer-events-none opacity-20"
            style={{ background: `radial-gradient(circle, rgb(${theme?.glowPrimary || '6, 182, 212'}) 0%, transparent 70%)` }}
          />

          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6 relative z-10">
            <div className="flex items-center gap-3">
              <div
                className="p-3.5 rounded-2xl border"
                style={{
                  backgroundColor: `rgba(${theme?.glowPrimary || '6, 182, 212'}, 0.12)`,
                  borderColor: `rgba(${theme?.glowPrimary || '6, 182, 212'}, 0.35)`,
                  color: `rgb(${theme?.glowPrimary || '6, 182, 212'})`,
                }}
              >
                <Zap size={20} />
              </div>
              <div>
                <h3 className="text-base md:text-lg xl:text-xl font-black tracking-wider uppercase text-white flex items-center gap-2">
                  XP PROGRESSION BREAKDOWN
                </h3>
                <p className="text-xs xl:text-sm text-zinc-400 font-medium">Precision, streak & rhythm multipliers applied to base XP</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div
                className="px-4 py-2 rounded-2xl border font-mono font-black text-sm xl:text-base tracking-wider flex items-center gap-2"
                style={{
                  backgroundColor: `rgba(${theme?.glowPrimary || '6, 182, 212'}, 0.15)`,
                  borderColor: `rgba(${theme?.glowPrimary || '6, 182, 212'}, 0.4)`,
                  color: `rgb(${theme?.glowPrimary || '6, 182, 212'})`,
                  boxShadow: `0 0 20px rgba(${theme?.glowPrimary || '6, 182, 212'}, 0.25)`,
                }}
              >
                <span>{effectiveXpBreakdown.totalMultiplier.toFixed(2)}x TOTAL</span>
              </div>
              <div className="px-5 py-2 rounded-2xl bg-white/10 border border-white/15 text-white font-mono font-black text-base xl:text-lg shadow-xl backdrop-blur-md">
                +{effectiveXpBreakdown.totalXp} XP
              </div>
            </div>
          </div>

          {/* Bento Multiplier Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 xl:gap-6 mb-6 relative z-10">
            {/* Base XP */}
            <div className="p-5 xl:p-6 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] xl:text-xs font-black tracking-widest text-zinc-400 uppercase">Base Score</span>
                <span className="text-[10px] xl:text-xs font-mono text-zinc-500">1.00x</span>
              </div>
              <div className="text-3xl xl:text-4xl font-black text-white font-mono">{effectiveXpBreakdown.baseXp} <span className="text-xs text-zinc-500">XP</span></div>
              <span className="text-[11px] xl:text-xs text-zinc-400 mt-2">Speed × Length baseline</span>
            </div>

            {/* Flawless Bonus */}
            <div className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
              effectiveXpBreakdown.flawlessBonusPct > 0
                ? 'bg-amber-500/10 border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.15)]'
                : 'bg-white/[0.02] border-white/5 opacity-60'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black tracking-widest text-zinc-400 uppercase flex items-center gap-1.5">
                  <Sparkles size={12} className={effectiveXpBreakdown.flawlessBonusPct > 0 ? 'text-amber-400' : 'text-zinc-500'} />
                  Flawless Run
                </span>
                <span className={`text-xs font-black font-mono ${effectiveXpBreakdown.flawlessBonusPct > 0 ? 'text-amber-400' : 'text-zinc-600'}`}>
                  +{effectiveXpBreakdown.flawlessBonusPct}%
                </span>
              </div>
              <div className="text-2xl font-black text-white font-mono">
                {effectiveXpBreakdown.flawlessBonusPct > 0 ? '+50% XP' : '+0%'}
              </div>
              <span className="text-[11px] text-zinc-400 mt-2">
                {effectiveXpBreakdown.flawlessBonusPct > 0 ? '100% Precision Achieved' : 'Requires 100% Accuracy'}
              </span>
            </div>

            {/* Combo Streak Bonus */}
            <div className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
              effectiveXpBreakdown.comboBonusPct > 0
                ? 'bg-purple-500/10 border-purple-500/40 shadow-[0_0_20px_rgba(168,85,247,0.15)]'
                : 'bg-white/[0.02] border-white/5 opacity-60'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black tracking-widest text-zinc-400 uppercase flex items-center gap-1.5">
                  <ShieldCheck size={12} className={effectiveXpBreakdown.comboBonusPct > 0 ? 'text-purple-400' : 'text-zinc-500'} />
                  Combo Milestone
                </span>
                <span className={`text-xs font-black font-mono ${effectiveXpBreakdown.comboBonusPct > 0 ? 'text-purple-400' : 'text-zinc-600'}`}>
                  +{effectiveXpBreakdown.comboBonusPct}%
                </span>
              </div>
              <div className="text-2xl font-black text-white font-mono">
                {effectiveXpBreakdown.comboBonusPct > 0 ? `+${effectiveXpBreakdown.comboBonusPct}% XP` : '+0%'}
              </div>
              <span className="text-[11px] text-zinc-400 mt-2">
                {flawlessStreak >= 200 ? '200+ Apex Streak' : flawlessStreak >= 100 ? '100+ Centurion Streak' : flawlessStreak >= 50 ? '50+ Flow Streak' : `${flawlessStreak}/50 Streak needed`}
              </span>
            </div>

            {/* Rhythm Consistency Bonus */}
            <div className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
              effectiveXpBreakdown.consistencyBonusPct > 0
                ? 'bg-cyan-500/10 border-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.15)]'
                : 'bg-white/[0.02] border-white/5 opacity-60'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black tracking-widest text-zinc-400 uppercase flex items-center gap-1.5">
                  <Waves size={12} className={effectiveXpBreakdown.consistencyBonusPct > 0 ? 'text-cyan-400' : 'text-zinc-500'} />
                  Metronome Flow
                </span>
                <span className={`text-xs font-black font-mono ${effectiveXpBreakdown.consistencyBonusPct > 0 ? 'text-cyan-400' : 'text-zinc-600'}`}>
                  +{effectiveXpBreakdown.consistencyBonusPct}%
                </span>
              </div>
              <div className="text-2xl font-black text-white font-mono">
                {effectiveXpBreakdown.consistencyBonusPct > 0 ? `+${effectiveXpBreakdown.consistencyBonusPct}% XP` : '+0%'}
              </div>
              <span className="text-[11px] text-zinc-400 mt-2">
                {consistency >= 92 ? '≥92% Master Cadence' : consistency >= 85 ? '≥85% Steady Cadence' : `${consistency}% (≥85% needed)`}
              </span>
            </div>
          </div>

          {/* Calculation Formula Strip */}
          <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-zinc-400">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-zinc-500">FORMULA:</span>
              <span className="text-white font-bold">{effectiveXpBreakdown.baseXp} Base</span>
              <span>×</span>
              <span>(1.0 +</span>
              <span className={effectiveXpBreakdown.flawlessBonusPct > 0 ? 'text-amber-300 font-bold' : 'text-zinc-600'}>
                0.{effectiveXpBreakdown.flawlessBonusPct.toString().padStart(2, '0')} Flawless
              </span>
              <span>+</span>
              <span className={effectiveXpBreakdown.comboBonusPct > 0 ? 'text-purple-300 font-bold' : 'text-zinc-600'}>
                0.{effectiveXpBreakdown.comboBonusPct.toString().padStart(2, '0')} Combo
              </span>
              <span>+</span>
              <span className={effectiveXpBreakdown.consistencyBonusPct > 0 ? 'text-cyan-300 font-bold' : 'text-zinc-600'}>
                0.{effectiveXpBreakdown.consistencyBonusPct.toString().padStart(2, '0')} Flow
              </span>
              <span>=</span>
              <span className="text-white font-bold">{effectiveXpBreakdown.totalMultiplier.toFixed(2)}x</span>
              <span>)</span>
            </div>
            <div className="text-white font-black">
              = +{effectiveXpBreakdown.totalXp} XP EARNED
            </div>
          </div>
        </div>
      )}

      {/* Graphs Section - Single unified graph */}
      <div className="w-full mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700" style={{ animationDelay: '300ms' }}>
        <WpmGraph
          timelinePoints={safeTimelinePoints}
          errorTimes={safeErrorTimes}
          durationMs={safeDurationMs}
          theme={theme || { name: 'CYBERPUNK', bg: 'bg-slate-950', text: 'text-cyan-400', border: 'border-cyan-500/30', glowPrimary: '6, 182, 212', glowSecondary: '34, 211, 238' }}
          ghostTimeline={ghostTimeline}
          ghostLabel={ghostLabel}
        />
      </div>

      {/* ── AUDITORY TRANSCRIPTION SHADOWING ───────────── */}
      {shadowMetrics && shadowMetrics.totalWordsShadowed >= 2 && (
        <ShadowInspector
          shadowMetrics={shadowMetrics}
          theme={theme}
          compact={compact}
        />
      )}

      {/* ── MOTOR FLUIDITY & IKI TRANSITIONS ─────────────── */}
      {effectiveIkiMetrics && effectiveIkiMetrics.totalTransitions >= 3 && (
        <IkiInspector
          ikiMetrics={effectiveIkiMetrics}
          theme={theme}
          onStartNeuroDrill={onStartSmartDrill || undefined}
          isGeneratingDrill={isSmartDrillGenerating}
          compact={compact}
        />
      )}

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

      {/* Action Buttons — suppressed when the embedding screen owns navigation */}
      {!hideActions && (
        <div className="flex flex-wrap justify-center gap-4 mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700" style={{ animationDelay: '500ms' }}>
          <button
            onClick={onReset}
            className="flex items-center gap-3 px-6 py-4 glass-panel rounded-2xl text-zinc-400 hover:text-white font-black tracking-widest text-sm hover:bg-white/10 transition-all border border-white/5 hover:border-white/15 cursor-pointer"
            title="Exit Results and return to Arena (Esc)"
          >
            <ArrowLeft size={16} /> EXIT TO ARENA
          </button>

          <button
            onClick={onWatchReplay}
            className="flex items-center gap-3 px-6 py-4 glass-panel rounded-2xl text-zinc-300 font-black tracking-widest text-sm hover:text-white hover:bg-white/10 transition-all border border-transparent hover:border-white/10 cursor-pointer"
          >
            <Play size={16} /> WATCH REPLAY
          </button>

          {onStartSmartDrill && (
            <button
              onClick={() => onStartSmartDrill?.(sessionWeakKeys.length > 0 ? sessionWeakKeys : ['E', 'T', 'A', 'O', 'I'])}
              disabled={isSmartDrillGenerating}
              className="flex items-center gap-3 px-6 py-4 glass-panel rounded-2xl font-black tracking-widest text-sm hover:bg-white/10 transition-all border border-transparent disabled:opacity-50 cursor-pointer"
              style={{
                color: `rgb(${theme?.glowPrimary || '6, 182, 212'})`,
                borderColor: `rgba(${theme?.glowPrimary || '6, 182, 212'}, 0.25)`
              }}
            >
              {isSmartDrillGenerating ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Brain size={16} />
              )}
              {isSmartDrillGenerating ? 'AI ENGINE...' : 'SMART DRILL'}
            </button>
          )}

          <button
            onClick={handleShare}
            disabled={!!shareStatus}
            className="flex items-center gap-3 px-6 py-4 glass-panel rounded-2xl transition-all text-sm font-black tracking-widest cursor-pointer text-zinc-300 hover:text-white hover:bg-white/10 border-transparent hover:border-white/10"
            style={shareStatus ? { color: `rgb(${theme?.glowPrimary || '6, 182, 212'})` } : undefined}
          >
            <Share2 size={16} /> {shareStatus || 'SHARE CARD'}
          </button>

          <button
            onClick={onReset}
            className="flex items-center gap-3 px-8 py-4 glass-panel rounded-2xl text-white font-black tracking-widest text-sm hover:bg-white/10 transition-all border border-white/15 shadow-[0_0_20px_rgba(255,255,255,0.08)] cursor-pointer"
            title="Play again (Tab or Enter)"
          >
            <RotateCcw size={16} /> PLAY AGAIN
          </button>
        </div>
      )}
    </div>
  );

  if (compact) return content;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-y-auto">
      {content}
    </div>
  );
}

