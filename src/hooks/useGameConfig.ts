import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { Level, CodeLanguage } from '@/data/constants';
import type { GhostMode } from '@/components/TypingArea';
import { getDailyChallengeWordCount } from '@/data/dailySnippets';

const GHOST_MODES: readonly GhostMode[] = ['pb', 'target', 'rival'];

function readGhostMode(): GhostMode {
  try {
    const stored = localStorage.getItem('typezen_ghost_mode');
    // An unrecognised value (a build that predates 'rival', or a hand-edited
    // entry) would otherwise be cast straight into state and select no pace.
    return GHOST_MODES.includes(stored as GhostMode) ? (stored as GhostMode) : 'pb';
  } catch { return 'pb'; }
}

export interface ResetOverrides {
  level?: Level;
  wordCount?: number;
  mirrored?: boolean;
  testMode?: 'words' | 'time';
  duration?: number;
  numbers?: boolean;
  punctuation?: boolean;
  codeLanguage?: CodeLanguage;
  dictationSpeed?: number;
  dictationTrackId?: string;
  daily?: boolean;
}

export interface GameConfigState {
  zenMode: boolean;
  suddenDeath: boolean;
  ghostPacer: boolean;
  ghostMode: GhostMode;
  ghostTargetWpm: number;
  focusMode: boolean;
  blindMode: boolean;
  mirroredMode: boolean;
  codeLanguage: CodeLanguage;
  dictationSpeed: number;
  dictationTrackId: string;
  fogMode: boolean;
  stickyKeysMode: boolean;
  overclockedMode: boolean;
  stickyPenalty: number;
  level: Level;
  wordCount: number;
  testMode: 'words' | 'time';
  duration: number;
  withNumbers: boolean;
  withPunctuation: boolean;
  dailyActive: boolean;
  customText: string;
  microDrillActive: boolean;
}

export function useGameConfig(onReset: (overrides: ResetOverrides) => void) {
  const [zenMode, setZenModeState] = useState(() => {
    try {
      return localStorage.getItem('typezen_zen_mode') === 'true';
    } catch {
      return false;
    }
  });

  const setZenMode = useCallback((val: boolean) => {
    setZenModeState(val);
    try {
      localStorage.setItem('typezen_zen_mode', String(val));
    } catch {}
  }, []);
  const [suddenDeath, setSuddenDeath] = useState(false);
  const [ghostPacer, setGhostPacer] = useState(false);
  const [ghostMode, setGhostModeState] = useState<GhostMode>(readGhostMode);
  const [ghostTargetWpm, setGhostTargetWpmState] = useState<number>(() => {
    try {
      const stored = parseInt(localStorage.getItem('typezen_ghost_target_wpm') || '100', 10);
      return !isNaN(stored) && stored > 0 ? stored : 100;
    } catch { return 100; }
  });

  const setGhostMode = useCallback((val: GhostMode) => {
    setGhostModeState(val);
    try { localStorage.setItem('typezen_ghost_mode', val); } catch {}
  }, []);

  const setGhostTargetWpm = useCallback((val: number) => {
    setGhostTargetWpmState(val);
    try { localStorage.setItem('typezen_ghost_target_wpm', val.toString()); } catch {}
  }, []);

  const [focusMode, setFocusMode] = useState(false);
  const [blindMode, setBlindMode] = useState(false);
  const [mirroredMode, setMirroredMode] = useState(false);
  const [codeLanguage, setCodeLanguage] = useState<CodeLanguage>('JavaScript/TypeScript');
  const [dictationSpeed, setDictationSpeed] = useState<number>(1.0);
  const [dictationTrackId, setDictationTrackId] = useState<string>('steve_jobs_stanford');
  const [fogMode, setFogMode] = useState(false);
  const [stickyKeysMode, setStickyKeysMode] = useState(false);
  const [overclockedMode, setOverclockedMode] = useState(false);
  const [stickyPenalty, setStickyPenalty] = useState(0);

  const [level, setLevel] = useState<Level>('NOVICE');
  const [wordCount, setWordCount] = useState(25);
  const [testMode, setTestMode] = useState<'words' | 'time'>('words');
  const [duration, setDuration] = useState(30);
  const [withNumbers, setWithNumbers] = useState(false);
  const [withPunctuation, setWithPunctuation] = useState(false);
  const [dailyActive, setDailyActive] = useState(false);
  const [customText, setCustomText] = useState('');
  const [microDrillActive, setMicroDrillActive] = useState(false);

  // Synchronous ref for keyboard handler / handleReset
  const configRef = useRef<GameConfigState>({
    zenMode, suddenDeath, ghostPacer, ghostMode, ghostTargetWpm, focusMode, blindMode, mirroredMode,
    codeLanguage, dictationSpeed, dictationTrackId, fogMode, stickyKeysMode, overclockedMode, stickyPenalty,
    level, wordCount, testMode, duration, withNumbers, withPunctuation,
    dailyActive, customText, microDrillActive,
  });

  useEffect(() => {
    configRef.current = {
      zenMode, suddenDeath, ghostPacer, ghostMode, ghostTargetWpm, focusMode, blindMode, mirroredMode,
      codeLanguage, dictationSpeed, dictationTrackId, fogMode, stickyKeysMode, overclockedMode, stickyPenalty,
      level, wordCount, testMode, duration, withNumbers, withPunctuation,
      dailyActive, customText, microDrillActive,
    };
  }, [
    zenMode, suddenDeath, ghostPacer, ghostMode, ghostTargetWpm, focusMode, blindMode, mirroredMode,
    codeLanguage, dictationSpeed, dictationTrackId, fogMode, stickyKeysMode, overclockedMode, stickyPenalty,
    level, wordCount, testMode, duration, withNumbers, withPunctuation,
    dailyActive, customText, microDrillActive,
  ]);

  const changeLevel = useCallback((newLevel: Level) => {
    setLevel(newLevel);
    setDailyActive(false);
    // Fixed-text levels have no meaningful word/time budget
    const locked = newLevel === 'CODE' || newLevel === 'CUSTOM' || newLevel === 'QUOTES' || newLevel === 'DICTATION';
    const currentTestMode = configRef.current.testMode;
    const STANDARD_WORDS = [10, 25, 50, 100];
    const validWordCount = STANDARD_WORDS.includes(configRef.current.wordCount) ? configRef.current.wordCount : 25;
    if (!STANDARD_WORDS.includes(configRef.current.wordCount)) {
      setWordCount(validWordCount);
    }
    if (locked && currentTestMode === 'time') {
      setTestMode('words');
      onReset({ level: newLevel, testMode: 'words', daily: false, wordCount: validWordCount });
    } else {
      onReset({ level: newLevel, daily: false, wordCount: validWordCount });
    }
  }, [onReset]);

  const changeWordCount = useCallback((count: number) => {
    setWordCount(count);
    setDailyActive(false);
    onReset({ wordCount: count, daily: false });
  }, [onReset]);

  const changeCodeLanguage = useCallback((lang: CodeLanguage) => {
    setCodeLanguage(lang);
    setDailyActive(false);
    onReset({ codeLanguage: lang, daily: false });
  }, [onReset]);

  const changeDictationSpeed = useCallback((speed: number) => {
    setDictationSpeed(speed);
    setDailyActive(false);
    onReset({ dictationSpeed: speed, daily: false });
  }, [onReset]);

  const changeDictationTrack = useCallback((trackId: string) => {
    setDictationTrackId(trackId);
    setDailyActive(false);
    onReset({ dictationTrackId: trackId, daily: false });
  }, [onReset]);

  const changeTestMode = useCallback((mode: 'words' | 'time') => {
    setTestMode(mode);
    setDailyActive(false);
    onReset({ testMode: mode, daily: false });
  }, [onReset]);

  const changeDuration = useCallback((secs: number) => {
    setDuration(secs);
    setDailyActive(false);
    onReset({ duration: secs, daily: false });
  }, [onReset]);

  const toggleNumbers = useCallback(() => {
    const next = !configRef.current.withNumbers;
    setWithNumbers(next);
    setDailyActive(false);
    onReset({ numbers: next, daily: false });
  }, [onReset]);

  const togglePunctuation = useCallback(() => {
    const next = !configRef.current.withPunctuation;
    setWithPunctuation(next);
    setDailyActive(false);
    onReset({ punctuation: next, daily: false });
  }, [onReset]);

  const toggleDaily = useCallback(() => {
    const next = !configRef.current.dailyActive;
    setDailyActive(next);
    if (next) {
      // Daily runs a fixed, comparable config with today's curated snippet
      const count = getDailyChallengeWordCount();
      setLevel('ADEPT');
      setWordCount(count);
      setTestMode('words');
      setMirroredMode(false);
      setWithNumbers(false);
      setWithPunctuation(false);
      onReset({ daily: true, level: 'ADEPT', wordCount: count, testMode: 'words', mirrored: false, numbers: false, punctuation: false });
    } else {
      const STANDARD_WORDS = [10, 25, 50, 100];
      const fallbackCount = STANDARD_WORDS.includes(configRef.current.wordCount) ? configRef.current.wordCount : 25;
      setWordCount(fallbackCount);
      onReset({ daily: false, wordCount: fallbackCount });
    }
  }, [onReset]);

  const toggleMirror = useCallback(() => {
    const next = !configRef.current.mirroredMode;
    setMirroredMode(next);
    setDailyActive(false);
    onReset({ mirrored: next, daily: false });
  }, [onReset]);

  return useMemo(() => ({
    zenMode, setZenMode,
    suddenDeath, setSuddenDeath,
    ghostPacer, setGhostPacer,
    ghostMode, setGhostMode,
    ghostTargetWpm, setGhostTargetWpm,
    focusMode, setFocusMode,
    blindMode, setBlindMode,
    mirroredMode, setMirroredMode,
    codeLanguage, setCodeLanguage,
    dictationSpeed, setDictationSpeed,
    dictationTrackId, setDictationTrackId,
    fogMode, setFogMode,
    stickyKeysMode, setStickyKeysMode,
    overclockedMode, setOverclockedMode,
    stickyPenalty, setStickyPenalty,
    level, setLevel,
    wordCount, setWordCount,
    testMode, setTestMode,
    duration, setDuration,
    withNumbers, setWithNumbers,
    withPunctuation, setWithPunctuation,
    dailyActive, setDailyActive,
    customText, setCustomText,
    microDrillActive, setMicroDrillActive,
    changeLevel,
    changeWordCount,
    changeCodeLanguage,
    changeDictationSpeed,
    changeDictationTrack,
    changeTestMode,
    changeDuration,
    toggleNumbers,
    togglePunctuation,
    toggleDaily,
    toggleMirror,
    configRef,
  }), [
    zenMode, suddenDeath, ghostPacer, ghostMode, ghostTargetWpm,
    focusMode, blindMode, mirroredMode, codeLanguage, dictationSpeed,
    dictationTrackId, fogMode, stickyKeysMode, overclockedMode,
    stickyPenalty, level, wordCount, testMode, duration,
    withNumbers, withPunctuation, dailyActive, customText,
    microDrillActive, changeLevel, changeWordCount, changeCodeLanguage,
    changeDictationSpeed, changeDictationTrack, changeTestMode,
    changeDuration, toggleNumbers, togglePunctuation, toggleDaily,
    toggleMirror
  ]);
}
