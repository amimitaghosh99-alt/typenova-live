import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  LESSONS, 
  getXpForLevel, 
  calculateStars,
  type AcademyStep, 
  type AcademyLesson 
} from '@/data/academyCurriculum';

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

function playBossVictory() {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  beepAt(now, 440, 0.1, 'square', 0.15);
  beepAt(now + 0.12, 554.37, 0.1, 'square', 0.18);
  beepAt(now + 0.24, 659.25, 0.12, 'square', 0.2);
  beepAt(now + 0.36, 880, 0.4, 'triangle', 0.3);
}

// ── Ignored keys ──────────────────────────────────────────────────
const IGNORED = new Set([
  'Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Tab', 'Escape', 
  'Enter', 'Backspace', 'Delete', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'
]);

export interface AcademyEngineState {
  // Navigation & Node info
  currentLesson: AcademyLesson | null;
  currentLessonIndex: number;
  currentStepIndex: number;
  currentStep: AcademyStep | null;
  isDrillMode: boolean;
  lessonTitle: string;
  lessonDescription: string;
  totalSteps: number;
  errorShake: boolean;
  lessonComplete: boolean;
  isBossFailed: boolean;
  starsEarned: number;
  
  // Progress & Mastery
  nodeStars: Record<string, number>;
  totalStars: number;
  unlockedNodeIds: Set<string>;
  academyLevel: number;
  academyXp: number;
  xpToNextLevel: number;
  xpGainedThisLesson: number;

  // Live Performance
  wpm: number;
  accuracy: number;
  mistakes: number;
  correctHits: number;
  keyErrorHeatmap: Record<string, number>;
  lastKeystroke: { key: string; isCorrect: boolean; timestamp: number } | null;

  // Audio & Controls
  isMuted: boolean;
  toggleMute: () => void;
  startLessonById: (nodeId: string) => void;
  goToLesson: (idx: number) => void;
  nextLesson: () => void;
  retryLesson: () => void;
}

export function useAcademyEngine(): AcademyEngineState {
  const [activeNodeId, setActiveNodeId] = useState<string>(LESSONS[0]?.id || 'fn_home_anchors');
  const [stepIdx, setStepIdx] = useState(0);
  const [errorShake, setErrorShake] = useState(false);
  const [lessonComplete, setLessonComplete] = useState(false);
  const [isBossFailed, setIsBossFailed] = useState(false);
  const [starsEarned, setStarsEarned] = useState(0);
  const [xpGainedThisLesson, setXpGainedThisLesson] = useState(0);

  // Persistent Stars Record
  const [nodeStars, setNodeStars] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('typenova_academy_node_stars');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Persistent Academy Mastery XP & Level (1-50)
  const [academyXp, setAcademyXp] = useState<number>(() => {
    try {
      return parseInt(localStorage.getItem('typenova_academy_xp') || '0', 10);
    } catch {
      return 0;
    }
  });

  const [academyLevel, setAcademyLevel] = useState<number>(() => {
    try {
      return Math.max(1, Math.min(50, parseInt(localStorage.getItem('typenova_academy_level') || '1', 10)));
    } catch {
      return 1;
    }
  });

  // Adaptive Drill State
  const [consecutiveMistakes, setConsecutiveMistakes] = useState(0);
  const [drillMode, setDrillMode] = useState<{ targetKey: string; finger: string; remaining: number } | null>(null);

  // Real-time telemetry & Heatmaps
  const [correctHits, setCorrectHits] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [wpm, setWpm] = useState(0);
  const [keyErrorHeatmap, setKeyErrorHeatmap] = useState<Record<string, number>>({});
  const [lastKeystroke, setLastKeystroke] = useState<{ key: string; isCorrect: boolean; timestamp: number } | null>(null);

  // Audio preference
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

  // Compute Active Lesson
  const currentLessonIndex = LESSONS.findIndex(l => l.id === activeNodeId);
  const currentLesson = (currentLessonIndex >= 0 ? LESSONS[currentLessonIndex] : LESSONS[0]) || null;
  const steps = currentLesson?.steps || [];

  // Compute Unlocked Nodes
  const unlockedNodeIds = useRef<Set<string>>(new Set());
  const computeUnlockedNodes = useCallback((starsMap: Record<string, number>): Set<string> => {
    const unlocked = new Set<string>();
    LESSONS.forEach(lesson => {
      if (!lesson.prerequisites || lesson.prerequisites.length === 0) {
        unlocked.add(lesson.id);
      } else {
        const allPrereqsMet = lesson.prerequisites.every(prereqId => (starsMap[prereqId] || 0) > 0);
        if (allPrereqsMet) {
          unlocked.add(lesson.id);
        }
      }
    });
    return unlocked;
  }, []);

  const unlockedSet = computeUnlockedNodes(nodeStars);
  unlockedNodeIds.current = unlockedSet;

  // Refs for keydown listener
  const activeNodeIdRef = useRef(activeNodeId);
  const stepIdxRef = useRef(stepIdx);
  const lessonCompleteRef = useRef(lessonComplete);
  const isMutedRef = useRef(isMuted);
  const startTimeRef = useRef(startTime);
  const correctHitsRef = useRef(correctHits);
  const mistakesRef = useRef(mistakes);
  const consecutiveMistakesRef = useRef(consecutiveMistakes);
  const drillModeRef = useRef(drillMode);
  const shakeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (shakeTimeoutRef.current) clearTimeout(shakeTimeoutRef.current);
    };
  }, []);

  activeNodeIdRef.current = activeNodeId;
  stepIdxRef.current = stepIdx;
  lessonCompleteRef.current = lessonComplete;
  isMutedRef.current = isMuted;
  startTimeRef.current = startTime;
  correctHitsRef.current = correctHits;
  mistakesRef.current = mistakes;
  consecutiveMistakesRef.current = consecutiveMistakes;
  drillModeRef.current = drillMode;

  // Active step (Neural Drill takes precedence)
  const currentStep = lessonComplete 
    ? null 
    : drillMode 
      ? { targetKey: drillMode.targetKey, finger: drillMode.finger, instruction: `[NEURAL DRILL] PRESS '${drillMode.targetKey.toUpperCase()}' ${drillMode.remaining} MORE TIMES` }
      : (steps[stepIdx] || null);

  // Live accuracy %
  const totalAttempts = correctHits + mistakes;
  const accuracy = totalAttempts > 0 ? Math.round((correctHits / totalAttempts) * 100) : 100;

  // Live WPM calculation timer
  useEffect(() => {
    if (!startTime || lessonComplete) return;

    const interval = setInterval(() => {
      const elapsedSec = (Date.now() - startTime) / 1000;
      if (elapsedSec > 1.2) {
        const wordsTyped = correctHitsRef.current / 5;
        const currentWpm = Math.round((wordsTyped / elapsedSec) * 60);
        setWpm(currentWpm);
      }
    }, 300);

    return () => clearInterval(interval);
  }, [startTime, lessonComplete]);

  const resetStatsForLesson = useCallback(() => {
    setStepIdx(0);
    setLessonComplete(false);
    setIsBossFailed(false);
    setStarsEarned(0);
    setXpGainedThisLesson(0);
    setCorrectHits(0);
    setMistakes(0);
    setStartTime(null);
    setWpm(0);
    setConsecutiveMistakes(0);
    setDrillMode(null);
  }, []);

  const startLessonById = useCallback((nodeId: string) => {
    const found = LESSONS.find(l => l.id === nodeId);
    if (found) {
      setActiveNodeId(nodeId);
      resetStatsForLesson();
    }
  }, [resetStatsForLesson]);

  const goToLesson = useCallback((idx: number) => {
    if (idx >= 0 && idx < LESSONS.length) {
      setActiveNodeId(LESSONS[idx].id);
      resetStatsForLesson();
    }
  }, [resetStatsForLesson]);

  const retryLesson = useCallback(() => {
    resetStatsForLesson();
  }, [resetStatsForLesson]);

  const nextLesson = useCallback(() => {
    const nextIdx = currentLessonIndex + 1;
    if (nextIdx < LESSONS.length) {
      setActiveNodeId(LESSONS[nextIdx].id);
      resetStatsForLesson();
    }
  }, [currentLessonIndex, resetStatsForLesson]);

  // ── Keydown Listener ─────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (IGNORED.has(e.key)) return;

      e.preventDefault();
      e.stopPropagation();

      if (lessonCompleteRef.current) return;

      const currentNodeId = activeNodeIdRef.current;
      const lesson = LESSONS.find(l => l.id === currentNodeId);
      if (!lesson) return;

      const si = stepIdxRef.current;
      const step = lesson.steps[si];
      if (!step) return;

      // Start timer on first keypress
      if (!startTimeRef.current) {
        setStartTime(Date.now());
      }

      const pressed = e.key === ' ' ? ' ' : e.key.toLowerCase();
      const expected = drillModeRef.current ? drillModeRef.current.targetKey.toLowerCase() : step.targetKey.toLowerCase();

      if (pressed === expected) {
        // ✅ Correct key
        if (!isMutedRef.current) playSuccess();
        setCorrectHits(prev => prev + 1);
        setConsecutiveMistakes(0);
        setLastKeystroke({ key: pressed, isCorrect: true, timestamp: Date.now() });

        if (drillModeRef.current) {
          const rem = drillModeRef.current.remaining - 1;
          if (rem <= 0) {
            setDrillMode(null);
          } else {
            setDrillMode({ ...drillModeRef.current, remaining: rem });
          }
          return;
        }

        const nextStep = si + 1;
        if (nextStep >= lesson.steps.length) {
          // Finalize statistics & Stars
          const totalAtt = correctHitsRef.current + 1 + mistakesRef.current;
          const finalAcc = Math.round(((correctHitsRef.current + 1) / totalAtt) * 100);
          const elapsedMin = startTimeRef.current ? (Date.now() - startTimeRef.current) / 60000 : 0.1;
          const finalWpm = Math.round(((correctHitsRef.current + 1) / 5) / Math.max(0.05, elapsedMin));

          let earnedStars = calculateStars(finalAcc, finalWpm, lesson.targetWpm, lesson.isBossNode);
          let bossFailed = false;

          if (lesson.isBossNode && lesson.bossThresholds) {
            if (finalAcc < lesson.bossThresholds.minAccuracy || finalWpm < lesson.bossThresholds.minWpm) {
              bossFailed = true;
              earnedStars = 0;
            }
          }

          setStarsEarned(earnedStars);
          setIsBossFailed(bossFailed);

          if (!bossFailed) {
            if (lesson.isBossNode) {
              if (!isMutedRef.current) playBossVictory();
            } else {
              if (!isMutedRef.current) playLessonComplete();
            }

            // Award XP & Save Stars
            const baseReward = lesson.xpReward || 100;
            const starBonus = earnedStars * 25;
            const earnedXp = baseReward + starBonus;
            setXpGainedThisLesson(earnedXp);

            // Update persistent Node Stars
            setNodeStars(prev => {
              const prevBest = prev[lesson.id] || 0;
              if (earnedStars > prevBest) {
                const updated = { ...prev, [lesson.id]: earnedStars };
                try {
                  localStorage.setItem('typenova_academy_node_stars', JSON.stringify(updated));
                } catch {
                  // ignore
                }
                return updated;
              }
              return prev;
            });

            // Update persistent Academy XP & Level (1-50)
            setAcademyXp(prevXp => {
              const newTotalXp = prevXp + earnedXp;
              let currentLvl = academyLevel;
              let needed = getXpForLevel(currentLvl);

              // Level up calculation
              while (newTotalXp >= needed && currentLvl < 50) {
                currentLvl++;
                needed += getXpForLevel(currentLvl);
              }

              setAcademyLevel(currentLvl);
              try {
                localStorage.setItem('typenova_academy_xp', String(newTotalXp));
                localStorage.setItem('typenova_academy_level', String(currentLvl));
              } catch {
                // ignore
              }
              return newTotalXp;
            });
          } else {
            if (!isMutedRef.current) playError();
          }

          setLessonComplete(true);
        } else {
          setStepIdx(nextStep);
        }
      } else {
        // ❌ Wrong key
        if (!isMutedRef.current) playError();
        setMistakes(prev => prev + 1);
        setErrorShake(true);
        setLastKeystroke({ key: pressed, isCorrect: false, timestamp: Date.now() });

        // Record on heatmap
        setKeyErrorHeatmap(prev => ({
          ...prev,
          [expected]: (prev[expected] || 0) + 1
        }));

        if (shakeTimeoutRef.current) clearTimeout(shakeTimeoutRef.current);
        shakeTimeoutRef.current = setTimeout(() => setErrorShake(false), 300);

        if (!drillModeRef.current) {
          const newConsecutive = consecutiveMistakesRef.current + 1;
          setConsecutiveMistakes(newConsecutive);
          
          if (newConsecutive >= 3) {
            setDrillMode({ targetKey: expected, finger: step.finger, remaining: 5 });
            setConsecutiveMistakes(0);
          }
        }
      }
    };

    window.addEventListener('keydown', handler, { capture: true });
    return () => window.removeEventListener('keydown', handler, { capture: true });
  }, [academyLevel]);

  const totalStars = Object.values(nodeStars).reduce((sum, s) => sum + s, 0);
  const xpToNextLevel = getXpForLevel(academyLevel);

  return {
    currentLesson,
    currentLessonIndex: Math.max(0, currentLessonIndex),
    currentStepIndex: stepIdx,
    currentStep,
    isDrillMode: !!drillMode,
    lessonTitle: currentLesson?.title || '',
    lessonDescription: currentLesson?.description || '',
    totalSteps: steps.length,
    errorShake,
    lessonComplete,
    isBossFailed,
    starsEarned,
    
    nodeStars,
    totalStars,
    unlockedNodeIds: unlockedSet,
    academyLevel,
    academyXp,
    xpToNextLevel,
    xpGainedThisLesson,

    wpm,
    accuracy,
    mistakes,
    correctHits,
    keyErrorHeatmap,
    lastKeystroke,

    isMuted,
    toggleMute,
    startLessonById,
    goToLesson,
    nextLesson,
    retryLesson,
  };
}

