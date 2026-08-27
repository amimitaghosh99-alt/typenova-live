import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  LESSONS,
  getLessonById,
  getLessonIndex,
  computeUnlockedIds,
  calculateStars,
  resolveMastery,
  baseKeyFor,
  type AcademyStep,
  type AcademyLesson,
  type MasteryProgress,
} from '@/data/academyCurriculum';
import {
  ACADEMY_KEYS,
  readAcademyProgress,
  readAcademyRecords,
  readAcademyStreak,
  readAcademyXp,
  type DayStreak,
  type LessonRecord,
} from '@/lib/academyStorage';
import {
  ACADEMY_PROGRESS_CHANGED,
  PROGRESS_HYDRATED,
  emitSyncEvent,
  onSyncEvent,
} from '@/lib/syncEvents';

// ── Lightweight Web Audio API Synthesis ─────────────────────────────
let _ctx: AudioContext | null = null;
function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!_ctx) _ctx = new AC();
  if (_ctx.state === 'suspended') _ctx.resume().catch(() => { });
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

function playLevelUp() {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  [523.25, 659.25, 783.99, 1046.5, 1318.51].forEach((f, i) => {
    beepAt(now + i * 0.075, f, i === 4 ? 0.45 : 0.12, 'triangle', 0.22);
  });
}

function playUnlock() {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  beepAt(now, 392, 0.09, 'sine', 0.14);
  beepAt(now + 0.09, 587.33, 0.16, 'sine', 0.16);
}

// ── Ignored keys ──────────────────────────────────────────────────
const IGNORED = new Set([
  'Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Tab', 'Escape',
  'Enter', 'Backspace', 'Delete', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'
]);

// ── Persistence ───────────────────────────────────────────────────
/**
 * Mute is the only value this file still owns outright — it is a per-device
 * preference, not progress.
 *
 * Records, XP, and the practice streak moved to `src/lib/academyStorage.ts` so
 * the cloud snapshot in `src/lib/progress.ts` can read and merge them. While
 * they were private to this module, nothing outside it could see Academy
 * progress, and signing in on a second device presented an empty skill tree.
 */
const KEY_MUTED = 'typenova_academy_muted';

export type { LessonRecord, DayStreak };

function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage unavailable / quota — progress stays in-memory for this session
  }
}

function todayKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function dayDiff(fromKey: string, toKey: string): number {
  const a = new Date(`${fromKey}T00:00:00`).getTime();
  const b = new Date(`${toKey}T00:00:00`).getTime();
  if (Number.isNaN(a) || Number.isNaN(b)) return Number.POSITIVE_INFINITY;
  return Math.round((b - a) / 86_400_000);
}

/** Same day → unchanged, next day → +1, any longer gap → streak resets to 1. */
function advanceStreak(prev: DayStreak): DayStreak {
  const today = todayKey();
  if (prev.lastDate === today) return prev;
  const gap = dayDiff(prev.lastDate, today);
  const current = gap === 1 ? prev.current + 1 : 1;
  return { current, best: Math.max(prev.best, current), lastDate: today };
}

function starsFromRecords(records: Record<string, LessonRecord>): Record<string, number> {
  const map: Record<string, number> = {};
  Object.entries(records).forEach(([id, r]) => { map[id] = r.stars; });
  return map;
}

// ── Shift discipline ──────────────────────────────────────────────
export type Hand = 'left' | 'right';

function handOfFinger(finger?: string): Hand | null {
  if (!finger) return null;
  if (finger.startsWith('left')) return 'left';
  if (finger.startsWith('right')) return 'right';
  return null;
}

export interface LevelUpEvent {
  level: number;
  title: string;
  badge: string;
  color: string;
}

/** Raised when a Shift step was satisfied with the *same* hand as the target key. */
export interface ShiftCoachEvent {
  key: string;
  expectedHand: Hand;
  usedHand: Hand;
}

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
  /** Full passage for the active lesson, so the stage can show context. */
  passage: string;
  /** Best previous result for the active lesson (null on a first attempt). */
  currentRecord: LessonRecord | null;
  isNewRecord: boolean;

  // Progress & Mastery
  nodeStars: Record<string, number>;
  records: Record<string, LessonRecord>;
  totalStars: number;
  unlockedNodeIds: Set<string>;
  academyLevel: number;
  academyXp: number;
  xpToNextLevel: number;
  xpIntoLevel: number;
  levelProgressPercent: number;
  mastery: MasteryProgress;
  xpGainedThisLesson: number;
  lessonsCleared: number;

  // Streaks & events
  comboStreak: number;
  bestCombo: number;
  dayStreak: DayStreak;
  levelUpEvent: LevelUpEvent | null;
  newlyUnlocked: AcademyLesson[];
  shiftCoach: ShiftCoachEvent | null;
  capsLockOn: boolean;
  dismissLevelUp: () => void;
  dismissUnlocks: () => void;

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

export function useAcademyEngine(isActive = true): AcademyEngineState {
  const [activeNodeId, setActiveNodeId] = useState<string>(LESSONS[0]?.id || 'fn_home_anchors');
  const [stepIdx, setStepIdx] = useState(0);
  const [errorShake, setErrorShake] = useState(false);
  const [lessonComplete, setLessonComplete] = useState(false);
  const [isBossFailed, setIsBossFailed] = useState(false);
  const [starsEarned, setStarsEarned] = useState(0);
  const [xpGainedThisLesson, setXpGainedThisLesson] = useState(0);
  const [isNewRecord, setIsNewRecord] = useState(false);

  // Persistent per-lesson records (stars + personal bests). Migrated from the
  // legacy star-only map on first load so existing progress carries over.
  const [records, setRecords] = useState<Record<string, LessonRecord>>(readAcademyRecords);

  // Lifetime Academy XP. Level is always *derived* from this via resolveMastery,
  // so a stale or corrupted saved level can never desync the HUD.
  const [academyXp, setAcademyXp] = useState<number>(readAcademyXp);

  const [dayStreak, setDayStreak] = useState<DayStreak>(readAcademyStreak);

  // Celebration / coaching events the UI drains
  const [levelUpEvent, setLevelUpEvent] = useState<LevelUpEvent | null>(null);
  const [newlyUnlocked, setNewlyUnlocked] = useState<AcademyLesson[]>([]);
  const [shiftCoach, setShiftCoach] = useState<ShiftCoachEvent | null>(null);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [comboStreak, setComboStreak] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);

  // Adaptive Drill State
  const [consecutiveMistakes, setConsecutiveMistakes] = useState(0);
  const [drillMode, setDrillMode] = useState<{
    targetKey: string;
    finger: string;
    remaining: number;
    requiresShift?: boolean;
    shiftFinger?: string;
  } | null>(null);

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
      return localStorage.getItem(KEY_MUTED) === 'true';
    } catch {
      return false;
    }
  });

  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const next = !prev;
      try {
        localStorage.setItem(KEY_MUTED, String(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  // Compute Active Lesson
  const currentLessonIndex = getLessonIndex(activeNodeId);
  const currentLesson = (currentLessonIndex >= 0 ? LESSONS[currentLessonIndex] : LESSONS[0]) || null;
  const steps = currentLesson?.steps || [];

  // Stars & unlock graph are both derived from the record map
  const nodeStars = useMemo(() => starsFromRecords(records), [records]);
  const unlockedSet = useMemo(() => computeUnlockedIds(nodeStars), [nodeStars]);
  const mastery = useMemo(() => resolveMastery(academyXp), [academyXp]);
  const academyLevel = mastery.level;

  // Refs for keydown listener
  const isActiveRef = useRef(isActive);
  const activeNodeIdRef = useRef(activeNodeId);
  const stepIdxRef = useRef(stepIdx);
  const lessonCompleteRef = useRef(lessonComplete);
  const isMutedRef = useRef(isMuted);
  const startTimeRef = useRef(startTime);
  const correctHitsRef = useRef(correctHits);
  const mistakesRef = useRef(mistakes);
  const consecutiveMistakesRef = useRef(consecutiveMistakes);
  const drillModeRef = useRef(drillMode);
  const comboRef = useRef(0);
  const unlockedRef = useRef(unlockedSet);
  /** Which Shift key is physically held right now (tracked via KeyboardEvent.location). */
  const shiftSideRef = useRef<Hand | null>(null);
  const shakeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const keystrokeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shiftCoachTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Latest persisted values, so the keydown handler never reads stale state. */
  const recordsRef = useRef(records);
  const xpRef = useRef(academyXp);
  const streakRef = useRef(dayStreak);

  useEffect(() => {
    return () => {
      if (shakeTimeoutRef.current) clearTimeout(shakeTimeoutRef.current);
      if (keystrokeTimeoutRef.current) clearTimeout(keystrokeTimeoutRef.current);
      if (shiftCoachTimeoutRef.current) clearTimeout(shiftCoachTimeoutRef.current);
    };
  }, []);

  // Mirror render state into refs so the (mount-once) keydown listener always
  // reads current values. Runs after commit, i.e. before any user keystroke.
  useEffect(() => {
    isActiveRef.current = isActive;
    activeNodeIdRef.current = activeNodeId;
    stepIdxRef.current = stepIdx;
    lessonCompleteRef.current = lessonComplete;
    isMutedRef.current = isMuted;
    startTimeRef.current = startTime;
    correctHitsRef.current = correctHits;
    mistakesRef.current = mistakes;
    consecutiveMistakesRef.current = consecutiveMistakes;
    drillModeRef.current = drillMode;
    unlockedRef.current = unlockedSet;
    recordsRef.current = records;
    xpRef.current = academyXp;
    streakRef.current = dayStreak;
  }, [
    isActive, activeNodeId, stepIdx, lessonComplete, isMuted, startTime,
    correctHits, mistakes, consecutiveMistakes, drillMode, unlockedSet,
    records, academyXp, dayStreak,
  ]);

  // Active step (Neural Drill takes precedence)
  const currentStep: AcademyStep | null = lessonComplete
    ? null
    : drillMode
      ? {
        targetKey: drillMode.targetKey,
        finger: drillMode.finger,
        instruction: `[NEURAL DRILL] PRESS '${drillMode.targetKey.toUpperCase()}' ${drillMode.remaining} MORE TIMES`,
        ...(drillMode.requiresShift ? { requiresShift: true, shiftFinger: drillMode.shiftFinger } : {}),
      }
      : (steps[stepIdx] || null);

  // Live accuracy %
  const totalAttempts = correctHits + mistakes;
  const accuracy = totalAttempts > 0 ? Math.round((correctHits / totalAttempts) * 100) : 100;

  // Live WPM calculation timer.
  //
  // Gated on isActive as well as startTime: backing out of a lesson mid-way
  // left this interval running behind the skill tree, and each tick re-rendered
  // AcademyLayout — and with it all ~60 lesson cards — several times a second
  // while the learner was trying to scroll. That was the scroll jank.
  useEffect(() => {
    if (!isActive || !startTime || lessonComplete) return;

    const interval = setInterval(() => {
      const elapsedSec = (Date.now() - startTime) / 1000;
      if (elapsedSec > 1.2) {
        const wordsTyped = correctHitsRef.current / 5;
        const currentWpm = Math.round((wordsTyped / elapsedSec) * 60);
        setWpm(currentWpm);
      }
    }, 300);

    return () => clearInterval(interval);
  }, [isActive, startTime, lessonComplete]);

  const resetStatsForLesson = useCallback(() => {
    setStepIdx(0);
    setLessonComplete(false);
    setIsBossFailed(false);
    setStarsEarned(0);
    setXpGainedThisLesson(0);
    setIsNewRecord(false);
    setCorrectHits(0);
    setMistakes(0);
    setStartTime(null);
    startTimeRef.current = null;
    setWpm(0);
    setConsecutiveMistakes(0);
    setDrillMode(null);
    setComboStreak(0);
    setBestCombo(0);
    comboRef.current = 0;
    setShiftCoach(null);
    setKeyErrorHeatmap({});
  }, []);

  const startLessonById = useCallback((nodeId: string) => {
    if (getLessonById(nodeId)) {
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

  /** Advance to the next lesson the player can actually play. */
  const nextLesson = useCallback(() => {
    const unlocked = unlockedRef.current;
    const next = LESSONS.slice(currentLessonIndex + 1).find(l => unlocked.has(l.id))
      ?? LESSONS[currentLessonIndex + 1];
    if (next) {
      setActiveNodeId(next.id);
      resetStatsForLesson();
    }
  }, [currentLessonIndex, resetStatsForLesson]);

  const dismissLevelUp = useCallback(() => setLevelUpEvent(null), []);
  const dismissUnlocks = useCallback(() => setNewlyUnlocked([]), []);

  /**
   * Runs on the final keystroke of a lesson: grades the run, writes the
   * personal-best record, awards XP, and raises level-up / unlock events.
   * Reads every persisted value through refs so it stays referentially stable.
   */
  const finalizeLesson = useCallback((lesson: AcademyLesson) => {
    const correct = correctHitsRef.current + 1;
    const totalAtt = correct + mistakesRef.current;
    const finalAcc = totalAtt > 0 ? Math.round((correct / totalAtt) * 100) : 100;
    const elapsedMin = startTimeRef.current ? (Date.now() - startTimeRef.current) / 60000 : 0.1;
    const finalWpm = Math.round((correct / 5) / Math.max(0.05, elapsedMin));
    setWpm(finalWpm);

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

    // ── Per-lesson record (attempts count even on a failed boss run) ──
    const prevRecords = recordsRef.current;
    const prevRec = prevRecords[lesson.id];
    const beatWpm = !bossFailed && finalWpm > (prevRec?.bestWpm ?? 0);
    const beatStars = !bossFailed && earnedStars > (prevRec?.stars ?? 0);
    const nextRecords: Record<string, LessonRecord> = {
      ...prevRecords,
      [lesson.id]: {
        stars: Math.max(prevRec?.stars ?? 0, earnedStars),
        bestWpm: Math.max(prevRec?.bestWpm ?? 0, bossFailed ? 0 : finalWpm),
        bestAccuracy: Math.max(prevRec?.bestAccuracy ?? 0, bossFailed ? 0 : finalAcc),
        attempts: (prevRec?.attempts ?? 0) + 1,
        clears: (prevRec?.clears ?? 0) + (bossFailed ? 0 : 1),
        lastPlayed: todayKey(),
      },
    };
    recordsRef.current = nextRecords;
    setRecords(nextRecords);
    writeJson(ACADEMY_KEYS.records, nextRecords);
    setIsNewRecord(beatWpm || beatStars);

    // ── Newly reachable nodes (prerequisite graph diff) ──
    if (!bossFailed && earnedStars > 0) {
      const before = computeUnlockedIds(starsFromRecords(prevRecords));
      const after = computeUnlockedIds(starsFromRecords(nextRecords));
      const fresh = LESSONS.filter(l => after.has(l.id) && !before.has(l.id));
      if (fresh.length) {
        setNewlyUnlocked(fresh);
        if (!isMutedRef.current) playUnlock();
      }
    }

    // ── XP, level-up ──
    if (bossFailed) {
      setXpGainedThisLesson(0);
      if (!isMutedRef.current) playError();
    } else {
      const earnedXp = (lesson.xpReward || 100) + earnedStars * 25;
      setXpGainedThisLesson(earnedXp);

      const prevXp = xpRef.current;
      const nextXp = prevXp + earnedXp;
      xpRef.current = nextXp;
      setAcademyXp(nextXp);
      try {
        localStorage.setItem(ACADEMY_KEYS.xp, String(nextXp));
      } catch {
        // ignore
      }

      const before = resolveMastery(prevXp);
      const after = resolveMastery(nextXp);
      if (after.level > before.level) {
        setLevelUpEvent({
          level: after.level,
          title: after.title.title,
          badge: after.title.badge,
          color: after.title.color,
        });
        if (!isMutedRef.current) playLevelUp();
      } else if (!isMutedRef.current) {
        if (lesson.isBossNode) playBossVictory();
        else playLessonComplete();
      }
    }

    // ── Daily practice streak ──
    const nextStreak = advanceStreak(streakRef.current);
    if (nextStreak !== streakRef.current) {
      streakRef.current = nextStreak;
      setDayStreak(nextStreak);
      writeJson(ACADEMY_KEYS.streak, nextStreak);
    }

    // Storage is up to date; ask the app shell to push it. Academy sessions used
    // to reach the cloud only on the next typing test or sign-in, so a player
    // who spent an evening on lessons and then switched devices still arrived
    // to stale progress.
    emitSyncEvent(ACADEMY_PROGRESS_CHANGED);

    setLessonComplete(true);
  }, []);

  /**
   * A cloud merge rewrites the Academy keys underneath this hook. Adopt the
   * merged values — state *and* the refs the completion handler reads — so the
   * next cleared lesson builds on them instead of on the copy loaded at mount,
   * which would silently push local-only progress back over the merge.
   */
  useEffect(() => onSyncEvent(PROGRESS_HYDRATED, () => {
    const fresh = readAcademyProgress();
    recordsRef.current = fresh.records;
    xpRef.current = fresh.xp;
    streakRef.current = fresh.streak;
    setRecords(fresh.records);
    setAcademyXp(fresh.xp);
    setDayStreak(fresh.streak);
  }), []);

  // ── Modifier tracking (which Shift is held, CapsLock state) ──────
  useEffect(() => {
    const sync = (e: KeyboardEvent) => {
      if (typeof e.getModifierState === 'function') {
        setCapsLockOn(e.getModifierState('CapsLock'));
      }
    };
    const down = (e: KeyboardEvent) => {
      if (e.key === 'Shift') shiftSideRef.current = e.location === 2 ? 'right' : 'left';
      sync(e);
    };
    const up = (e: KeyboardEvent) => {
      if (e.key === 'Shift') shiftSideRef.current = null;
      sync(e);
    };
    const release = () => { shiftSideRef.current = null; };

    window.addEventListener('keydown', down, { capture: true });
    window.addEventListener('keyup', up, { capture: true });
    window.addEventListener('blur', release);
    return () => {
      window.removeEventListener('keydown', down, { capture: true });
      window.removeEventListener('keyup', up, { capture: true });
      window.removeEventListener('blur', release);
    };
  }, []);

  // ── Keydown Listener ─────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ignore when not in active practice stage or lesson is done
      if (!isActiveRef.current || lessonCompleteRef.current) return;
      // Never swallow real browser/app shortcuts
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (IGNORED.has(e.key)) return;

      e.preventDefault();
      e.stopPropagation();

      const lesson = getLessonById(activeNodeIdRef.current);
      if (!lesson) return;

      const si = stepIdxRef.current;
      const drill = drillModeRef.current;
      const step: AcademyStep | undefined = drill
        ? {
          targetKey: drill.targetKey,
          finger: drill.finger,
          instruction: '',
          requiresShift: drill.requiresShift,
          shiftFinger: drill.shiftFinger,
        }
        : lesson.steps[si];
      if (!step) return;

      // Start timer on first keypress (ref first — the completion math reads it)
      if (!startTimeRef.current) {
        const now = Date.now();
        startTimeRef.current = now;
        setStartTime(now);
      }

      // Case-sensitive comparison: 'A' and 'a' are different lessons now.
      const expected = step.targetKey;
      const pressed = e.key;
      const isMatch = pressed === expected;

      if (keystrokeTimeoutRef.current) clearTimeout(keystrokeTimeoutRef.current);

      if (isMatch) {
        // ✅ Correct key
        if (!isMutedRef.current) playSuccess();
        setCorrectHits(prev => prev + 1);
        setConsecutiveMistakes(0);
        comboRef.current += 1;
        setComboStreak(comboRef.current);
        setBestCombo(prev => Math.max(prev, comboRef.current));
        setLastKeystroke({ key: pressed, isCorrect: true, timestamp: Date.now() });
        keystrokeTimeoutRef.current = setTimeout(() => setLastKeystroke(null), 300);

        // Right glyph, wrong technique: Shift must come from the opposite hand.
        if (step.requiresShift) {
          const expectedHand = handOfFinger(step.shiftFinger);
          const usedHand = shiftSideRef.current;
          if (expectedHand && usedHand && usedHand !== expectedHand) {
            setShiftCoach({ key: expected, expectedHand, usedHand });
            if (shiftCoachTimeoutRef.current) clearTimeout(shiftCoachTimeoutRef.current);
            shiftCoachTimeoutRef.current = setTimeout(() => setShiftCoach(null), 2400);
          } else {
            setShiftCoach(null);
          }
        }

        if (drill) {
          const rem = drill.remaining - 1;
          setDrillMode(rem <= 0 ? null : { ...drill, remaining: rem });
          return;
        }

        const nextStep = si + 1;
        if (nextStep >= lesson.steps.length) {
          finalizeLesson(lesson);
        } else {
          setStepIdx(nextStep);
        }
      } else {
        // ❌ Wrong key
        if (!isMutedRef.current) playError();
        setMistakes(prev => prev + 1);
        setErrorShake(true);
        comboRef.current = 0;
        setComboStreak(0);
        setLastKeystroke({ key: pressed, isCorrect: false, timestamp: Date.now() });
        keystrokeTimeoutRef.current = setTimeout(() => setLastKeystroke(null), 300);

        // Heatmap is keyed by the *physical* key, so shifted glyphs light the
        // cap the finger actually missed (`!` heats the `1` key).
        const heatKey = baseKeyFor(expected);
        setKeyErrorHeatmap(prev => ({
          ...prev,
          [heatKey]: (prev[heatKey] || 0) + 1
        }));

        if (shakeTimeoutRef.current) clearTimeout(shakeTimeoutRef.current);
        shakeTimeoutRef.current = setTimeout(() => setErrorShake(false), 300);

        if (!drill) {
          const newConsecutive = consecutiveMistakesRef.current + 1;
          setConsecutiveMistakes(newConsecutive);

          if (newConsecutive >= 3) {
            setDrillMode({
              targetKey: expected,
              finger: step.finger,
              remaining: 5,
              requiresShift: step.requiresShift,
              shiftFinger: step.shiftFinger,
            });
            setConsecutiveMistakes(0);
          }
        }
      }
    };

    window.addEventListener('keydown', handler, { capture: true });
    return () => window.removeEventListener('keydown', handler, { capture: true });
  }, [finalizeLesson]);

  const totalStars = Object.values(nodeStars).reduce((sum, s) => sum + s, 0);
  const lessonsCleared = Object.values(nodeStars).filter(s => s > 0).length;
  // At max level there is no next span — this reports 0 and the HUD reads mastery.isMax.
  const xpToNextLevel = mastery.xpForNextLevel;

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
    passage: currentLesson?.passage || '',
    currentRecord: (currentLesson && records[currentLesson.id]) || null,
    isNewRecord,

    nodeStars,
    records,
    totalStars,
    unlockedNodeIds: unlockedSet,
    academyLevel,
    academyXp,
    xpToNextLevel,
    xpIntoLevel: mastery.xpIntoLevel,
    levelProgressPercent: mastery.progressPercent,
    mastery,
    xpGainedThisLesson,
    lessonsCleared,

    comboStreak,
    bestCombo,
    dayStreak,
    levelUpEvent,
    newlyUnlocked,
    shiftCoach,
    capsLockOn,
    dismissLevelUp,
    dismissUnlocks,

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

