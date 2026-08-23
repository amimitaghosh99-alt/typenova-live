import { useState, useEffect, useCallback, useRef } from 'react';
import { LESSONS } from '@/data/academyCurriculum';
import type { AcademyStep } from '@/data/academyCurriculum';

// ── Lightweight Web Audio API Synthesis ─────────────────────────────
let _ctx: AudioContext | null = null;
function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!_ctx) _ctx = new AC();
  if (_ctx.state === 'suspended') _ctx.resume().catch(() => {});
  return _ctx;
}

function beepAt(time: number, freq: number, dur: number, type: OscillatorType = 'sine', gain = 0.2) {
  try {
    const ctx = getCtx();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, time);
    g.gain.setValueAtTime(gain, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + dur);
    osc.connect(g).connect(ctx.destination);
    osc.start(time);
    osc.stop(time + dur);
    osc.onended = () => { osc.disconnect(); g.disconnect(); };
  } catch {
    // Ignore audio context errors
  }
}

function playSuccess() {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  beepAt(now, 660, 0.08, 'sine', 0.20);
  beepAt(now + 0.05, 880, 0.10, 'sine', 0.15);
}

function playError() {
  const ctx = getCtx();
  if (!ctx) return;
  beepAt(ctx.currentTime, 140, 0.14, 'sawtooth', 0.25);
}

function playLessonComplete() {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  beepAt(now, 523.25, 0.1, 'triangle', 0.25);
  beepAt(now + 0.10, 659.25, 0.1, 'triangle', 0.25);
  beepAt(now + 0.20, 783.99, 0.12, 'triangle', 0.25);
  beepAt(now + 0.30, 1046.50, 0.3, 'triangle', 0.3);
}

// ── Ignored keys ──────────────────────────────────────────────────
const IGNORED = new Set([
  'Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Tab', 'Escape', 
  'Enter', 'Backspace', 'Delete', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'
]);

export interface AcademyEngineState {
  currentLessonIndex: number;
  currentStepIndex: number;
  currentStep: AcademyStep | null;
  isDrillMode: boolean;
  lessonTitle: string;
  lessonDescription: string;
  totalSteps: number;
  errorShake: boolean;
  lessonComplete: boolean;
  allComplete: boolean;
  completedLessons: Set<number>;
  wpm: number;
  accuracy: number;
  mistakes: number;
  isMuted: boolean;
  toggleMute: () => void;
  goToLesson: (idx: number) => void;
  nextLesson: () => void;
}

export function useAcademyEngine(): AcademyEngineState {
  const [lessonIdx, setLessonIdx] = useState(0);
  const [stepIdx, setStepIdx] = useState(0);
  const [errorShake, setErrorShake] = useState(false);
  const [lessonComplete, setLessonComplete] = useState(false);
  const [completedLessons, setCompletedLessons] = useState<Set<number>>(new Set());

  // Adaptive Difficulty State
  const [consecutiveMistakes, setConsecutiveMistakes] = useState(0);
  const [drillMode, setDrillMode] = useState<{ targetKey: string, finger: string, remaining: number } | null>(null);

  // Analytics & Stats
  const [correctHits, setCorrectHits] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [wpm, setWpm] = useState(0);

  // Audio mute preference
  const [isMuted, setIsMuted] = useState(() => {
    try {
      return localStorage.getItem('typenova_academy_muted') === 'true';
    } catch {
      return false;
    }
  });

  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const next = !prev;
      try {
        localStorage.setItem('typenova_academy_muted', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  // Refs so the keydown listener always reads latest values
  const lessonIdxRef = useRef(lessonIdx);
  const stepIdxRef = useRef(stepIdx);
  const lessonCompleteRef = useRef(lessonComplete);
  const isMutedRef = useRef(isMuted);
  const startTimeRef = useRef(startTime);
  const correctHitsRef = useRef(correctHits);
  const consecutiveMistakesRef = useRef(consecutiveMistakes);
  const drillModeRef = useRef(drillMode);
  const shakeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (shakeTimeoutRef.current) clearTimeout(shakeTimeoutRef.current);
    };
  }, []);

  lessonIdxRef.current = lessonIdx;
  stepIdxRef.current = stepIdx;
  lessonCompleteRef.current = lessonComplete;
  isMutedRef.current = isMuted;
  startTimeRef.current = startTime;
  correctHitsRef.current = correctHits;
  consecutiveMistakesRef.current = consecutiveMistakes;
  drillModeRef.current = drillMode;

  const lesson = LESSONS[lessonIdx] || null;
  const steps = lesson?.steps || [];
  
  // Intercept standard flow if in drill mode
  const currentStep = lessonComplete 
    ? null 
    : drillMode 
      ? { targetKey: drillMode.targetKey, finger: drillMode.finger, instruction: `[NEURAL DRILL] PRESS '${drillMode.targetKey.toUpperCase()}' ${drillMode.remaining} MORE TIMES` }
      : (steps[stepIdx] || null);

  const allComplete = lessonIdx >= LESSONS.length;

  // Calculate live accuracy %
  const totalAttempts = correctHits + mistakes;
  const accuracy = totalAttempts > 0 ? Math.round((correctHits / totalAttempts) * 100) : 100;

  // Live WPM calculation timer
  useEffect(() => {
    if (!startTime || lessonComplete || allComplete) return;

    const interval = setInterval(() => {
      const elapsedSec = (Date.now() - startTime) / 1000;
      if (elapsedSec > 1.5) {
        const wordsTyped = correctHitsRef.current / 5;
        const currentWpm = Math.round((wordsTyped / elapsedSec) * 60);
        setWpm(currentWpm);
      }
    }, 400);

    return () => clearInterval(interval);
  }, [startTime, lessonComplete, allComplete]);

  const resetStatsForLesson = useCallback(() => {
    setStepIdx(0);
    setLessonComplete(false);
    setCorrectHits(0);
    setMistakes(0);
    setStartTime(null);
    setWpm(0);
    setConsecutiveMistakes(0);
    setDrillMode(null);
  }, []);

  const goToLesson = useCallback((idx: number) => {
    if (idx >= 0 && idx < LESSONS.length) {
      setLessonIdx(idx);
      resetStatsForLesson();
    }
  }, [resetStatsForLesson]);

  const nextLesson = useCallback(() => {
    const current = lessonIdxRef.current;
    const next = current + 1;
    setCompletedLessons(prev => { const s = new Set(prev); s.add(current); return s; });
    if (next < LESSONS.length) {
      setLessonIdx(next);
      resetStatsForLesson();
    }
  }, [resetStatsForLesson]);

  // ── Keydown Listener ─────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (IGNORED.has(e.key)) return;

      e.preventDefault();
      e.stopPropagation();

      if (lessonCompleteRef.current) return;

      const li = lessonIdxRef.current;
      const si = stepIdxRef.current;
      const currentLesson = LESSONS[li];
      if (!currentLesson) return;

      const step = currentLesson.steps[si];
      if (!step) return;

      // Start timer on first keypress
      if (!startTimeRef.current) {
        setStartTime(Date.now());
      }

      const pressed = e.key === ' ' ? ' ' : e.key.toLowerCase();
      // Ensure we use the active expected key (drill mode takes priority)
      const expected = drillModeRef.current ? drillModeRef.current.targetKey.toLowerCase() : step.targetKey.toLowerCase();

      if (pressed === expected) {
        // ✅ Correct key
        if (!isMutedRef.current) playSuccess();
        setCorrectHits(prev => prev + 1);
        setConsecutiveMistakes(0); // Reset consecutive mistakes on success

        if (drillModeRef.current) {
          const rem = drillModeRef.current.remaining - 1;
          if (rem <= 0) {
            setDrillMode(null); // Drill complete! Return to normal lesson
          } else {
            setDrillMode({ ...drillModeRef.current, remaining: rem });
          }
          return; // Do not advance main lesson step
        }

        const nextStep = si + 1;
        if (nextStep >= currentLesson.steps.length) {
          // Lesson complete!
          if (!isMutedRef.current) playLessonComplete();
          setLessonComplete(true);
        } else {
          setStepIdx(nextStep);
        }
      } else {
        // ❌ Wrong key
        if (!isMutedRef.current) playError();
        setMistakes(prev => prev + 1);
        setErrorShake(true);
        if (shakeTimeoutRef.current) clearTimeout(shakeTimeoutRef.current);
        shakeTimeoutRef.current = setTimeout(() => setErrorShake(false), 300);

        if (!drillModeRef.current) {
          const newConsecutive = consecutiveMistakesRef.current + 1;
          setConsecutiveMistakes(newConsecutive);
          
          if (newConsecutive >= 3) {
            // Trigger Adaptive Drill Mode!
            setDrillMode({ targetKey: expected, finger: step.finger, remaining: 5 });
            setConsecutiveMistakes(0);
          }
        }
      }
    };

    window.addEventListener('keydown', handler, { capture: true });
    return () => window.removeEventListener('keydown', handler, { capture: true });
  }, []);

  return {
    currentLessonIndex: lessonIdx,
    currentStepIndex: stepIdx,
    currentStep,
    isDrillMode: !!drillMode,
    lessonTitle: lesson?.title || '',
    lessonDescription: lesson?.description || '',
    totalSteps: steps.length,
    errorShake,
    lessonComplete,
    allComplete,
    completedLessons,
    wpm,
    accuracy,
    mistakes,
    isMuted,
    toggleMute,
    goToLesson,
    nextLesson,
  };
}
