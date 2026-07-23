import { useState, useRef, useCallback, useEffect } from 'react';
import type { Phase } from '@/data/constants';

export interface Keystroke {
  key: string;
  expected: string;
  time: number;
  isError: boolean;
  /** True for backspaces that actually shrank the input. Logged so replay and
      the PB ghost can reconstruct input-over-time exactly; excluded from all
      WPM/accuracy/heatmap statistics. */
  isBackspace?: boolean;
}

export interface TimelinePoint {
  t: number;
  wpm: number;
  rawWpm: number;
}

export interface TypingStats {
  currentWpm: number;
  rawWpm: number;
  currentAcc: number;
  timeline: TimelinePoint[];
  consistency: number;
  flawless: number;
}

export const useTypingEngine = () => {
  const [phase, setPhase] = useState<Phase>('CONFIGURING');
  const [countdownTimer, setCountdownTimer] = useState(5);
  const [targetText, setTargetText] = useState('');
  const [input, setInput] = useState('');
  const [startTime, setStartTime] = useState<number | null>(null);
  const [endTime, setEndTime] = useState<number | null>(null);
  const [wpm, setWpm] = useState(0);
  const [rawWpm, setRawWpm] = useState(0);
  const [accuracy, setAccuracy] = useState(100);
  const [consistency, setConsistency] = useState(100);
  const [flawlessStreak, setFlawlessStreak] = useState(0);
  const [timelinePoints, setTimelinePoints] = useState<TimelinePoint[]>([]);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [timePenalty, setTimePenalty] = useState(0);
  const [capsLock, setCapsLock] = useState(false);
  const [shake, setShake] = useState(false);

  const keystrokeLog = useRef<Keystroke[]>([]);
  const comboRef = useRef(0);
  const isFinishingRef = useRef(false);

  // Expose comboRef setter for audio engine
  const syncComboRef = useCallback((val: number) => {
    comboRef.current = val;
  }, []);

  const calculateStats = useCallback((currentInput: string, timeMs: number, currentPenalty = 0): TypingStats => {
    if (!timeMs || currentInput.length === 0) {
      return { currentWpm: 0, rawWpm: 0, currentAcc: 100, timeline: [], consistency: 100, flawless: 0 };
    }
    const entries = keystrokeLog.current;
    const startTs = entries.length ? entries[0].time : (Date.now() - timeMs);
    const totalTimeMs = timeMs + currentPenalty;
    const minutes = totalTimeMs / 60000;

    const errors = entries.filter(k => k.isError && !k.isBackspace).length;
    const rawCalc = Math.round((currentInput.length / 5) / minutes);
    const netCalc = Math.round(((currentInput.length - errors) / 5) / minutes);
    const currentAcc = currentInput.length > 0 ? Math.round(((currentInput.length - errors) / currentInput.length) * 100) : 100;

    const intervals = 10;
    const step = totalTimeMs / intervals;
    const timeline: TimelinePoint[] = [];
    for (let i = 1; i <= intervals; i++) {
      const threshold = startTs + step * i;
      const chars = entries.filter(k => k.time <= threshold && !k.isError && !k.isBackspace).length;
      const rawChars = entries.filter(k => k.time <= threshold && !k.isBackspace).length;
      const calcWpm = Math.round((chars / 5) / ((step * i) / 60000));
      const calcRaw = Math.round((rawChars / 5) / ((step * i) / 60000));
      timeline.push({ 
        t: step * i, 
        wpm: isNaN(calcWpm) ? 0 : calcWpm,
        rawWpm: isNaN(calcRaw) ? 0 : calcRaw
      });
    }

    const wpmVals = timeline.map(p => p.wpm).filter(v => !isNaN(v));
    const mean = wpmVals.length ? wpmVals.reduce((a, b) => a + b, 0) / wpmVals.length : 0;
    const variance = wpmVals.length ? wpmVals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / wpmVals.length : 0;
    const stddev = Math.sqrt(variance);

    let consistencyScore = 100;
    if (mean > 0) consistencyScore = Math.round(Math.max(0, Math.min(100, (1 - (stddev / mean)) * 100)));
    else if (stddev > 0) consistencyScore = 50;

    let localMaxStreak = 0, cur = 0;
    for (const k of entries) {
      if (k.isBackspace) continue;
      if (!k.isError) cur++;
      else { localMaxStreak = Math.max(localMaxStreak, cur); cur = 0; }
    }
    localMaxStreak = Math.max(localMaxStreak, cur);

    return {
      currentWpm: isNaN(netCalc) || netCalc < 0 ? 0 : netCalc,
      rawWpm: isNaN(rawCalc) ? 0 : rawCalc,
      currentAcc: isNaN(currentAcc) ? 100 : currentAcc,
      timeline,
      consistency: consistencyScore,
      flawless: localMaxStreak
    };
  }, []);

  const finishTestImpl = useCallback((finalTimestamp: number, finalInput: string | null = null) => {
    if (isFinishingRef.current) return; // GUARD: prevent double-submission
    if (!startTime) { setPhase('FINISHED'); setEndTime(finalTimestamp); return; }

    isFinishingRef.current = true;
    setEndTime(finalTimestamp);
    setPhase('FINISHED');
    const statsInput = finalInput !== null ? finalInput : input;
    const finalStats = calculateStats(statsInput, finalTimestamp - startTime, timePenalty);
    setWpm(finalStats.currentWpm);
    setRawWpm(finalStats.rawWpm);
    setAccuracy(finalStats.currentAcc);
    setConsistency(finalStats.consistency);
    setFlawlessStreak(finalStats.flawless);
    setTimelinePoints(finalStats.timeline);
  }, [calculateStats, input, startTime, timePenalty]);

  // STABLE wrapper: App's keydown listener is registered once (empty deps) and
  // would otherwise capture the FIRST render's finishTest — whose closure has
  // startTime === null, silently skipping the final stats write. Routing every
  // call through a ref guarantees the latest implementation always runs.
  const finishTestRef = useRef(finishTestImpl);
  useEffect(() => { finishTestRef.current = finishTestImpl; });
  const finishTest = useCallback((finalTimestamp: number, finalInput: string | null = null) => {
    finishTestRef.current(finalTimestamp, finalInput);
  }, []);

  // Countdown timer effect
  useEffect(() => {
    if (phase !== 'COUNTDOWN') return;
    if (countdownTimer > 0) {
      const timer = setTimeout(() => setCountdownTimer(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setPhase('TYPING');
      setStartTime(Date.now());
    }
  }, [phase, countdownTimer]);

  // Live stats update during typing.
  // `input`/`timePenalty` are read through a ref so the interval survives
  // keystrokes — with them in the deps array the interval was torn down and
  // recreated on every keypress, meaning the 500ms tick almost never fired
  // while actually typing (live WPM only updated during pauses).
  const liveRef = useRef({ input, timePenalty });
  useEffect(() => { liveRef.current = { input, timePenalty }; });

  useEffect(() => {
    if (phase !== 'TYPING' || !startTime || endTime) return;
    const interval = setInterval(() => {
      const { input: liveInput, timePenalty: livePenalty } = liveRef.current;
      const stats = calculateStats(liveInput, Date.now() - startTime, livePenalty);
      setWpm(stats.currentWpm);
      setRawWpm(stats.rawWpm);
      setAccuracy(stats.currentAcc);
      setConsistency(stats.consistency);
      setFlawlessStreak(stats.flawless);
      setTimelinePoints(stats.timeline);
    }, 500);
    return () => clearInterval(interval);
  }, [phase, startTime, endTime, calculateStats]);

  const resetEngine = useCallback(() => {
    isFinishingRef.current = false;
    setInput('');
    setStartTime(null);
    setEndTime(null);
    setWpm(0);
    setRawWpm(0);
    setAccuracy(100);
    setCombo(0);
    comboRef.current = 0;
    setMaxCombo(0);
    setTimePenalty(0);
    setTimelinePoints([]);
    setConsistency(100);
    setFlawlessStreak(0);
    keystrokeLog.current = [];
    setPhase('CONFIGURING');
  }, []);

  return {
    phase, setPhase,
    countdownTimer, setCountdownTimer,
    targetText, setTargetText,
    input, setInput,
    startTime, setStartTime,
    endTime, setEndTime,
    wpm, setWpm,
    rawWpm, setRawWpm,
    accuracy, setAccuracy,
    consistency, setConsistency,
    flawlessStreak, setFlawlessStreak,
    timelinePoints, setTimelinePoints,
    combo, setCombo,
    maxCombo, setMaxCombo,
    timePenalty, setTimePenalty,
    capsLock, setCapsLock,
    shake, setShake,
    keystrokeLog,
    comboRef,
    syncComboRef,
    calculateStats,
    finishTest,
    resetEngine,
  };
};
