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
  const inputRef = useRef('');
  const [startTime, setStartTime] = useState<number | null>(null);
  const [endTime, setEndTime] = useState<number | null>(null);

  const [liveStats, setLiveStats] = useState({
    wpm: 0,
    rawWpm: 0,
    accuracy: 100,
    consistency: 100,
    flawlessStreak: 0,
    timelinePoints: [] as TimelinePoint[],
  });

  const setWpm = useCallback((val: number | ((prev: number) => number)) => {
    setLiveStats(s => ({ ...s, wpm: typeof val === 'function' ? val(s.wpm) : val }));
  }, []);
  const setRawWpm = useCallback((val: number | ((prev: number) => number)) => {
    setLiveStats(s => ({ ...s, rawWpm: typeof val === 'function' ? val(s.rawWpm) : val }));
  }, []);
  const setAccuracy = useCallback((val: number | ((prev: number) => number)) => {
    setLiveStats(s => ({ ...s, accuracy: typeof val === 'function' ? val(s.accuracy) : val }));
  }, []);
  const setConsistency = useCallback((val: number | ((prev: number) => number)) => {
    setLiveStats(s => ({ ...s, consistency: typeof val === 'function' ? val(s.consistency) : val }));
  }, []);
  const setFlawlessStreak = useCallback((val: number | ((prev: number) => number)) => {
    setLiveStats(s => ({ ...s, flawlessStreak: typeof val === 'function' ? val(s.flawlessStreak) : val }));
  }, []);
  const setTimelinePoints = useCallback((val: TimelinePoint[] | ((prev: TimelinePoint[]) => TimelinePoint[])) => {
    setLiveStats(s => ({ ...s, timelinePoints: typeof val === 'function' ? val(s.timelinePoints) : val }));
  }, []);

  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [timePenalty, setTimePenalty] = useState(0);
  const [capsLock, setCapsLock] = useState(false);
  const [shake, setShake] = useState(false);

  const setInputSync = useCallback((valOrFn: string | ((prev: string) => string)) => {
    const nextVal = typeof valOrFn === 'function' ? valOrFn(inputRef.current) : valOrFn;
    inputRef.current = nextVal;
    setInput(nextVal);
  }, []);

  const keystrokeLog = useRef<Keystroke[]>([]);
  const comboRef = useRef(0);
  const isFinishingRef = useRef(false);

  // Expose comboRef setter for audio engine
  const syncComboRef = useCallback((val: number) => {
    comboRef.current = val;
  }, []);

  const calculateStats = useCallback((currentInput: string, timeMs: number, currentPenalty = 0, explicitStartTime: number | null = null, includeTimeline = false): TypingStats => {
    if (!timeMs || currentInput.length === 0) {
      return { currentWpm: 0, rawWpm: 0, currentAcc: 100, timeline: [], consistency: 100, flawless: 0 };
    }
    const entries = keystrokeLog.current;
    const startTs = explicitStartTime !== null ? explicitStartTime : (Date.now() - timeMs);
    const totalTimeMs = timeMs + currentPenalty;
    const minutes = totalTimeMs / 60000;

    // Single-pass loop for total non-backspace keystrokes, errors, and max flawless streak
    let totalTyped = 0;
    let errorCount = 0;
    let localMaxStreak = 0;
    let curStreak = 0;

    for (let i = 0; i < entries.length; i++) {
      const k = entries[i];
      if (!k.isBackspace) {
        totalTyped++;
        if (k.isError) {
          errorCount++;
          if (curStreak > localMaxStreak) localMaxStreak = curStreak;
          curStreak = 0;
        } else {
          curStreak++;
        }
      }
    }
    if (curStreak > localMaxStreak) localMaxStreak = curStreak;

    const rawCalc = minutes > 0 ? Math.round((totalTyped / 5) / minutes) : 0;
    const netCalc = minutes > 0 ? Math.max(0, Math.round(((totalTyped - errorCount) / 5) / minutes)) : 0;
    const currentAcc = totalTyped > 0 ? Math.min(Math.max(Math.round(((totalTyped - errorCount) / totalTyped) * 100), 0), 100) : 100;

    if (!includeTimeline) {
      return {
        currentWpm: isNaN(netCalc) || netCalc < 0 ? 0 : netCalc,
        rawWpm: isNaN(rawCalc) ? 0 : rawCalc,
        currentAcc: isNaN(currentAcc) ? 100 : currentAcc,
        timeline: [],
        consistency: 100,
        flawless: localMaxStreak
      };
    }

    const intervals = Math.max(1, Math.floor(totalTimeMs / 1000));
    const step = totalTimeMs / intervals;
    const timeline: TimelinePoint[] = [{ t: 0, wpm: 0, rawWpm: 0 }];

    let entryIndex = 0;
    let runningChars = 0;
    let runningRawChars = 0;

    for (let i = 1; i <= intervals; i++) {
      const threshold = startTs + step * i;
      while (entryIndex < entries.length && entries[entryIndex].time <= threshold) {
        const k = entries[entryIndex];
        if (!k.isBackspace) {
          runningRawChars++;
          if (!k.isError) runningChars++;
        }
        entryIndex++;
      }

      const calcWpm = Math.round((runningChars / 5) / ((step * i) / 60000));
      const calcRaw = Math.round((runningRawChars / 5) / ((step * i) / 60000));
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
    const finalStats = calculateStats(statsInput, finalTimestamp - startTime, timePenalty, startTime, true);
    setLiveStats({
      wpm: finalStats.currentWpm,
      rawWpm: finalStats.rawWpm,
      accuracy: finalStats.currentAcc,
      consistency: finalStats.consistency,
      flawlessStreak: finalStats.flawless,
      timelinePoints: finalStats.timeline,
    });
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
    const timer = setTimeout(() => {
      if (countdownTimer === 1) {
        setPhase('TYPING');
        setStartTime(Date.now());
      } else {
        setCountdownTimer(prev => prev - 1);
      }
    }, 1000);
    return () => clearTimeout(timer);
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
      const stats = calculateStats(liveInput, Date.now() - startTime, livePenalty, startTime);
      setLiveStats({
        wpm: stats.currentWpm,
        rawWpm: stats.rawWpm,
        accuracy: stats.currentAcc,
        consistency: stats.consistency,
        flawlessStreak: stats.flawless,
        timelinePoints: stats.timeline,
      });
    }, 500);
    return () => clearInterval(interval);
  }, [phase, startTime, endTime, calculateStats]);

  const resetEngine = useCallback(() => {
    isFinishingRef.current = false;
    inputRef.current = '';
    setInput('');
    setStartTime(null);
    setEndTime(null);
    setLiveStats({
      wpm: 0,
      rawWpm: 0,
      accuracy: 100,
      consistency: 100,
      flawlessStreak: 0,
      timelinePoints: [],
    });
    setCombo(0);
    comboRef.current = 0;
    setMaxCombo(0);
    setTimePenalty(0);
    keystrokeLog.current = [];
    setPhase('CONFIGURING');
  }, []);

  const resetKeystrokes = useCallback(() => {
    keystrokeLog.current = [];
  }, []);

  return {
    phase, setPhase,
    countdownTimer, setCountdownTimer,
    targetText, setTargetText,
    input, setInput,
    inputRef, setInputSync,
    startTime, setStartTime,
    endTime, setEndTime,
    wpm: liveStats.wpm, setWpm,
    rawWpm: liveStats.rawWpm, setRawWpm,
    accuracy: liveStats.accuracy, setAccuracy,
    consistency: liveStats.consistency, setConsistency,
    flawlessStreak: liveStats.flawlessStreak, setFlawlessStreak,
    timelinePoints: liveStats.timelinePoints, setTimelinePoints,
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
    resetKeystrokes,
  };
};