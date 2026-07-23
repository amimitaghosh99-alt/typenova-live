import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Keyboard, Activity, Target, RotateCcw, Skull, Ghost,
  Focus, Brain, Volume2, VolumeX, Palette,
  Award, FlipHorizontal, CloudFog, Magnet, Timer,
  X, Code, Star, Trophy, Terminal, Zap, Lock, ChevronDown, Check, Users,
  Rocket, Crosshair, Shield, EyeOff, Gauge, Flame, Crown,
  Swords, Sword, Sparkles, Orbit, Unlock,
  Hash, Clock, BarChart2, CalendarCheck, Hourglass
} from 'lucide-react';
// Note: Swords is used both for the ACHIEVEMENT_ICONS map and the race button.
import type { LucideIcon } from 'lucide-react';

import {
  THEMES, THEME_KEYS, SOUND_KEYS, ACHIEVEMENTS,
  NOVICE_SENTENCES, ADEPT_SENTENCES,
  CODE_LANGUAGES, type CodeLanguage,
  generateText
} from '@/data/constants';
import type { Level, Theme } from '@/data/constants';
import { useAudioEngine } from '@/hooks/useAudioEngine';
import { useTypingEngine } from '@/hooks/useTypingEngine';
import type { Keystroke } from '@/hooks/useTypingEngine';
import { useRPGSystem } from '@/hooks/useRPGSystem';
import { useParticles } from '@/hooks/useParticles';

import { TypingArea } from '@/components/TypingArea';
import type { PaceSample } from '@/components/TypingArea';
import { StatsPanel } from '@/components/StatsPanel';
import { ResultsScreen } from '@/components/ResultsScreen';
import { RaceResultsScreen } from '@/components/RaceResultsScreen';
import { StatsDashboard, appendHistory } from '@/components/StatsDashboard';
import { ReplayModal } from '@/components/ReplayModal';
import { RaceModal } from '@/components/RaceModal';
import { SocialModal } from '@/components/SocialModal';
import { useRace } from '@/hooks/useRace';
import { mulberry32, daySeed, todayKey, isYesterday } from '@/utils/seededRandom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useCloudSync } from '@/hooks/useCloudSync';
import { useFriends } from '@/hooks/useFriends';
import { AccountMenu } from '@/components/AccountMenu';
import { Routes, Route, Navigate } from 'react-router';
import { Login } from '@/pages/Login';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';

// ─── ACHIEVEMENT ICONS ────────────────────────────────────────────────
// Resolves the plain-string icon keys in ACHIEVEMENTS (constants.ts must
// stay import-free — tailwind.config.js loads it via jiti) to lucide
// components, so badges render in the app's icon language with theme
// tint + glow instead of OS-dependent emoji.
const ACHIEVEMENT_ICONS: Record<string, LucideIcon> = {
  'zap': Zap,
  'rocket': Rocket,
  'crosshair': Crosshair,
  'shield': Shield,
  'skull': Skull,
  'eye-off': EyeOff,
  'gauge': Gauge,
  'flame': Flame,
  'star': Star,
  'crown': Crown,
  'palette': Palette,
  'swords': Swords,
  'sword': Sword,
  'sparkles': Sparkles,
  'orbit': Orbit,
  'unlock': Unlock,
  'rotate-ccw': RotateCcw,
  'calendar-check': CalendarCheck,
  'hourglass': Hourglass,
};

// ─── DRILL WORD POOL ──────────────────────────────────────────────────
// Shared by single-key micro-drills and heatmap-driven smart drills.
const DRILL_POOL = [...NOVICE_SENTENCES, ...ADEPT_SENTENCES]
  .join(' ').toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean);

const buildDrillWords = (targets: string[], count: number): string[] => {
  const words: string[] = [];
  let i = 0;
  while (words.length < count) {
    const raw = targets[i % targets.length];
    i++;
    const target = raw === 'SPACE' ? ' ' : raw === 'ENTER' ? '\n' : raw.toLowerCase();
    if (target === ' ' || target === '\n') {
      words.push(DRILL_POOL[Math.floor(Math.random() * DRILL_POOL.length)]);
      continue;
    }
    const candidates = DRILL_POOL.filter(w => w.includes(target));
    if (candidates.length > 0 && Math.random() < 0.8) {
      words.push(candidates[Math.floor(Math.random() * candidates.length)]);
    } else {
      const base = DRILL_POOL[Math.floor(Math.random() * DRILL_POOL.length)];
      const at = Math.floor(base.length / 2);
      words.push(base.slice(0, at) + target + base.slice(at));
    }
  }
  return words;
};

// ─── PB PACE RECONSTRUCTION ───────────────────────────────────────────
// Input-length-over-time from the keystroke log (backspaces included), so
// the ghost pacer can replay a personal best exactly.
const buildPaceSamples = (log: Keystroke[]): PaceSample[] => {
  if (log.length === 0) return [];
  const t0 = log[0].time;
  let len = 0;
  const samples: PaceSample[] = [{ t: 0, chars: 0 }];
  for (const k of log) {
    len = k.isBackspace ? Math.max(0, len - 1) : len + 1;
    samples.push({ t: k.time - t0, chars: len });
  }
  return samples;
};

// ─── DAILY STREAK ─────────────────────────────────────────────────────
const loadDailyStreak = (): number => {
  try {
    const d = JSON.parse(localStorage.getItem('typezen_daily') || 'null');
    if (!d?.lastDay) return 0;
    // streak is alive if the last completion was today or yesterday
    return (d.lastDay === todayKey() || isYesterday(d.lastDay)) ? d.streak : 0;
  } catch { return 0; }
};

// ─── TIMED-MODE HUD ───────────────────────────────────────────────────
// Self-ticking so the 200ms clock doesn't re-render the whole App.
function TimedHud({ startTime, duration, theme }: { startTime: number; duration: number; theme: Theme }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(iv);
  }, []);
  const elapsed = Math.max(0, now - startTime);
  const remaining = Math.max(0, Math.ceil((duration * 1000 - elapsed) / 1000));
  const pct = Math.min(100, (elapsed / (duration * 1000)) * 100);
  return (
    <>
      <div className="fixed top-0 left-0 h-1 bg-zinc-900 w-full z-[150]">
        <div className={`h-full ${theme.solid} ${theme.glow}`} style={{ width: `${pct}%`, transition: 'width 200ms linear' }} />
      </div>
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[150] px-5 py-1.5 rounded-full bg-zinc-950/80 backdrop-blur-md border border-white/10 pointer-events-none">
        <span className={`font-black text-lg tabular-nums ${remaining <= 5 ? 'text-red-400' : theme.text}`}>{remaining}s</span>
      </div>
    </>
  );
}

function MainApp() {
  // ─── Mode State ──────────────────────────────────────────────────
  const [zenMode, setZenMode] = useState(false);
  const [suddenDeath, setSuddenDeath] = useState(false);
  const [ghostPacer, setGhostPacer] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [blindMode, setBlindMode] = useState(false);
  const [mirroredMode, setMirroredMode] = useState(false);
  const [codeLanguage, setCodeLanguage] = useState<CodeLanguage>('JavaScript/TypeScript');
  const [fogMode, setFogMode] = useState(false);
  const [stickyKeysMode, setStickyKeysMode] = useState(false);
  const [overclockedMode, setOverclockedMode] = useState(false);
  const [stickyPenalty, setStickyPenalty] = useState(0);
  const [showThemeMenu, setShowThemeMenu] = useState(false);

  const [level, setLevel] = useState<Level>('NOVICE');
  const [wordCount, setWordCount] = useState(25);
  const [testMode, setTestMode] = useState<'words' | 'time'>('words');
  const [duration, setDuration] = useState(30);
  const [withNumbers, setWithNumbers] = useState(false);
  const [withPunctuation, setWithPunctuation] = useState(false);
  const [dailyActive, setDailyActive] = useState(false);
  const [dailyStreak, setDailyStreak] = useState(loadDailyStreak);
  const [customText, setCustomText] = useState('');
  const [microDrillActive, setMicroDrillActive] = useState(false);

  const [themeIndex, setThemeIndex] = useState(0);
  const [soundProfile, setSoundProfileState] = useState('thocky');
  const [muted, setMutedState] = useState(false);
  const [_seenThemes, setSeenThemes] = useState(new Set<number>([0]));

  const [showTrophyRoom, setShowTrophyRoom] = useState(false);
  const [showGodMode, setShowGodMode] = useState(false);
  const [tetrisEffect, setTetrisEffect] = useState(false);
  const [showExpandedGraph, setShowExpandedGraph] = useState(false);
  const [showStatsDashboard, setShowStatsDashboard] = useState(false);
  const [showReplay, setShowReplay] = useState(false);
  const [showRace, setShowRace] = useState(false);
  const [showSocialModal, setShowSocialModal] = useState(false);
  const [raceActive, setRaceActive] = useState(false);
  const [initialRaceCode, setInitialRaceCode] = useState<string | undefined>();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [dailyBoard, setDailyBoard] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [friendsBoard, setFriendsBoard] = useState<any[]>([]);
  const [boardTab, setBoardTab] = useState<'alltime' | 'today' | 'friends'>('alltime');
  const [saveStatus, setSaveStatus] = useState('');
  const [autoSave] = useState(() => {
    try { return localStorage.getItem('typezen_autosave') !== 'false'; } catch { return true; }
  });

  // First-login "choose a display name" modal
  const [nameInput, setNameInput] = useState('');
  const [nameErr, setNameErr] = useState('');
  const [savingName, setSavingName] = useState(false);

  // ─── Hooks ───────────────────────────────────────────────────────
  const audio = useAudioEngine();
  const typing = useTypingEngine();
  const rpg = useRPGSystem();
  const particles = useParticles();

  // Account + cloud progress sync. On login, cloud progress is merged into
  // this browser's localStorage and pushed back into the RPG state; after
  // that, each finished test debounces a push back to the cloud.
  const auth = useAuth();
  const cloud = useCloudSync({
    session: auth.session,
    hydrateRPG: rpg.hydrate,
    onHydrated: () => setDailyStreak(loadDailyStreak()),
  });
  const isLoggedIn = !!auth.session;
  const friendsState = useFriends({ supabase, session: auth.session, username: cloud.username });

  // Handle URL share links
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const room = params.get('race');
    if (room && room.length === 5) {
      setInitialRaceCode(room.toUpperCase());
      setShowRace(true);
      // Clean up URL so it doesn't linger
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Multiplayer race: when a race starts, every client (host + guests) drops
  // into a synced countdown on the same text. We reuse the whole typing
  // engine — the race just supplies the text and a shared start moment.
  const race = useRace({
    supabase,
    onStart: (text, startAt) => {
      setShowRace(false);
      setRaceActive(true);
      // Reset engine but keep raceActive; disable modifier modes for fairness
      typing.resetEngine();
      typing.setTargetText(text);
      setZenMode(false); setMirroredMode(false); setDailyActive(false);
      setSuddenDeath(false); setBlindMode(false); setFogMode(false);
      setStickyKeysMode(false); setOverclockedMode(false);
      // Sync the countdown to the host's clock so everyone starts together
      const secsLeft = Math.max(1, Math.ceil((startAt - Date.now()) / 1000));
      typing.setPhase('COUNTDOWN');
      typing.setCountdownTimer(secsLeft);
    },
  });

  const theme: Theme = THEMES[THEME_KEYS[themeIndex]];
  const themeMenuRef = useRef<HTMLDivElement>(null);

  // ─── Refs for Keydown Handler ────────────────────────────────────
  // A single snapshot object avoids stale closures in the keydown listener.
  // Built ONCE per render and shared by the ref initializer and the sync
  // effect, so the two can never drift apart.
  const snapshot = {
    phase: typing.phase,
    input: typing.input,
    targetText: typing.targetText,
    combo: typing.combo,
    maxCombo: typing.maxCombo,
    suddenDeath,
    stickyKeysMode,
    stickyPenalty,
    timePenalty: typing.timePenalty,
    showTrophyRoom,
    showGodMode,
    showExpandedGraph,
    showThemeMenu,
    showStatsDashboard,
    showReplay,
    showRace,
    raceActive,
    theme,
    tetrisEffect,
    mirroredMode,
    level,
    wordCount,
    testMode,
    duration,
    withNumbers,
    withPunctuation,
    codeLanguage,
    dailyActive,
    customText,
    microDrillActive,
    startTime: typing.startTime,
    zenMode,
  };
  const stateRef = useRef(snapshot);

  // Keep stateRef in sync on every render
  useEffect(() => {
    stateRef.current = snapshot;
  });

  // Keep audio engine in sync
  useEffect(() => { audio.setMuted(muted); }, [muted, audio]);
  useEffect(() => { audio.setSoundProfile(soundProfile); }, [soundProfile, audio]);
  useEffect(() => {
    audio.setComboRef(typing.combo);
    typing.syncComboRef(typing.combo);
  }, [typing.combo, audio, typing]);

  // Click outside listener for Theme Dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (themeMenuRef.current && !themeMenuRef.current.contains(e.target as Node)) {
        setShowThemeMenu(false);
      }
    };
    if (showThemeMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showThemeMenu]);

  // ─── Initialization ──────────────────────────────────────────────
  useEffect(() => {
    typing.setTargetText(generateText('NOVICE', 25, '', false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Leaderboard ─────────────────────────────────────────────────
  const fetchLeaderboard = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase.from('leaderboard').select('username, wpm, accuracy').order('wpm', { ascending: false }).limit(5);
    if (!error && data) setLeaderboard(data);
  }, []);

  // Best-effort: the daily_scores table may not exist yet (see README/setup);
  // errors just leave the daily board empty.
  const fetchDailyBoard = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase.from('daily_scores').select('username, wpm, accuracy').eq('day', todayKey()).order('wpm', { ascending: false }).limit(5);
    if (!error && data) setDailyBoard(data);
  }, []);

  const fetchFriendsBoard = useCallback(async () => {
    if (!supabase || !cloud.username) return;
    const usernames = [cloud.username, ...friendsState.friends];
    const { data, error } = await supabase.from('leaderboard').select('username, wpm, accuracy').in('username', usernames);
    
    if (!error && data) {
      const sortedData = [...data].sort((a, b) => b.wpm - a.wpm);
      const existing = new Map();
      for (const row of sortedData) {
        const lower = row.username.toLowerCase();
        if (!existing.has(lower)) {
          existing.set(lower, row);
        }
      }
      
      const seen = new Set<string>();
      const combined = [];
      for (const uname of usernames) {
        const lower = uname.toLowerCase();
        if (seen.has(lower)) continue;
        seen.add(lower);
        const found = existing.get(lower);
        combined.push(found || { username: uname, wpm: 0, accuracy: 0 });
      }
      combined.sort((a, b) => b.wpm - a.wpm);
      setFriendsBoard(combined);
    }
  }, [friendsState.friends, cloud.username]);

  useEffect(() => { fetchLeaderboard(); fetchDailyBoard(); }, [fetchLeaderboard, fetchDailyBoard]);
  useEffect(() => { if (boardTab === 'friends') fetchFriendsBoard(); }, [boardTab, fetchFriendsBoard]);

  // ─── Cloud Sync push ─────────────────────────────────────────────
  // Once synced, mirror progress back to the cloud whenever it changes
  // (debounced in the hook). A finished test always bumps testsCompleted, so
  // this also captures history/PB/daily writes that don't have React deps.
  useEffect(() => {
    if (cloud.status === 'synced') cloud.pushProgress();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rpg.xp, rpg.testsCompleted, rpg.unlockedAchievements, rpg.heatmapData, dailyStreak, cloud.status]);

  // Prefill the first-login "choose a name" prompt from the Google profile.
  useEffect(() => {
    if (cloud.status !== 'needs-username') return;
    const meta = auth.user?.user_metadata as { full_name?: string; name?: string } | undefined;
    const suggested = (meta?.full_name || meta?.name || auth.user?.email?.split('@')[0] || '')
      .replace(/[^a-zA-Z0-9_]/g, '').slice(0, 12);
    setNameInput(prev => prev || suggested);
    setNameErr('');
  }, [cloud.status, auth.user]);

  // ─── Helpers ─────────────────────────────────────────────────────
  const handleReset = useCallback((overrides: {
    level?: Level; wordCount?: number; mirrored?: boolean;
    testMode?: 'words' | 'time'; duration?: number;
    numbers?: boolean; punctuation?: boolean; codeLanguage?: CodeLanguage; daily?: boolean;
  } = {}) => {
    const s = stateRef.current;
    const nextLevel = overrides.level ?? s.level;
    const nextCount = overrides.wordCount ?? s.wordCount;
    const nextMirror = overrides.mirrored ?? s.mirroredMode;
    const nextMode = overrides.testMode ?? s.testMode;
    const nextDuration = overrides.duration ?? s.duration;
    const nextNumbers = overrides.numbers ?? s.withNumbers;
    const nextPunct = overrides.punctuation ?? s.withPunctuation;
    const nextCodeLanguage = overrides.codeLanguage ?? s.codeLanguage;
    const nextDaily = overrides.daily ?? s.dailyActive;
    const nextCustom = s.customText;

    // Timed tests need a deep word buffer (240 words for 60s ≈ 240 WPM ceiling)
    const length = nextMode === 'time' ? nextDuration * 4 : nextCount;

    typing.resetEngine();
    typing.setTargetText(generateText(nextLevel, length, nextCustom, nextMirror, {
      numbers: nextNumbers,
      punctuation: nextPunct,
      codeLanguage: nextCodeLanguage,
      rng: nextDaily ? mulberry32(daySeed()) : undefined,
    }));
    setZenMode(false);
    setSaveStatus('');
    setRaceActive(false); // any manual reset drops out of race mode
    rpg.resetRPGFlags();
    particles.clearAll();
  }, [typing, rpg, particles]);

  const changeLevel = (newLevel: Level) => {
    setLevel(newLevel);
    setDailyActive(false);
    // Fixed-text levels have no meaningful word/time budget
    const locked = newLevel === 'CODE' || newLevel === 'CUSTOM' || newLevel === 'QUOTES';
    if (locked && testMode === 'time') {
      setTestMode('words');
      handleReset({ level: newLevel, testMode: 'words', daily: false });
    } else {
      handleReset({ level: newLevel, daily: false });
    }
  };

  const changeWordCount = (count: number) => {
    setWordCount(count);
    setDailyActive(false);
    handleReset({ wordCount: count, daily: false });
  };

  const changeCodeLanguage = (lang: CodeLanguage) => {
    setCodeLanguage(lang);
    setDailyActive(false);
    handleReset({ codeLanguage: lang, daily: false });
  };

  const changeTestMode = (mode: 'words' | 'time') => {
    setTestMode(mode);
    setDailyActive(false);
    handleReset({ testMode: mode, daily: false });
  };

  const changeDuration = (secs: number) => {
    setDuration(secs);
    setDailyActive(false);
    handleReset({ duration: secs, daily: false });
  };

  const toggleNumbers = () => {
    const next = !withNumbers;
    setWithNumbers(next);
    setDailyActive(false);
    handleReset({ numbers: next, daily: false });
  };

  const togglePunctuation = () => {
    const next = !withPunctuation;
    setWithPunctuation(next);
    setDailyActive(false);
    handleReset({ punctuation: next, daily: false });
  };

  const toggleDaily = () => {
    const next = !dailyActive;
    setDailyActive(next);
    if (next) {
      // Daily runs a fixed, comparable config with today's seeded text
      setLevel('ADEPT');
      setWordCount(50);
      setTestMode('words');
      setMirroredMode(false);
      setWithNumbers(false);
      setWithPunctuation(false);
      handleReset({ daily: true, level: 'ADEPT', wordCount: 50, testMode: 'words', mirrored: false, numbers: false, punctuation: false });
    } else {
      handleReset({ daily: false });
    }
  };

  const toggleMirror = () => {
    setMirroredMode(prev => {
      const next = !prev;
      setDailyActive(false);
      handleReset({ mirrored: next, daily: false });
      return next;
    });
  };

  // ─── Save Score ──────────────────────────────────────────────────
  // First-login: claim a display name (creates the profile row).
  const submitUsername = async () => {
    const name = nameInput.trim();
    if (name.length < 2) { setNameErr('At least 2 characters'); return; }
    setSavingName(true);
    setNameErr('');
    const res = await cloud.saveUsername(name);
    setSavingName(false);
    if (!res.ok) setNameErr(res.error || 'Failed');
  };

  // ─── Drills (single-key micro + heatmap smart) ───────────────────
  const launchDrill = (text: string) => {
    setMicroDrillActive(true);
    typing.setTargetText(text);
    typing.setInput('');
    typing.setStartTime(null);
    typing.setEndTime(null);
    typing.setPhase('READY');
    typing.resetKeystrokes();
  };

  const startMicroDrill = (keyChar: string) => {
    const words = buildDrillWords([keyChar], 10);
    launchDrill(keyChar === 'ENTER' ? words.join('\n') : words.join(' '));
  };

  // Lifetime-weakest keys (min 10 hits each, letters/digits only)
  const smartDrillKeys = useMemo(() => {
    return Object.entries(rpg.heatmapData)
      .filter(([k, v]) => v.total >= 10 && k !== 'SPACE' && k !== 'ENTER')
      .map(([k, v]) => [k, v.errors / v.total] as [string, number])
      .filter(([, rate]) => rate > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([k]) => k);
  }, [rpg.heatmapData]);

  const startSmartDrill = () => {
    if (smartDrillKeys.length === 0) return;
    launchDrill(buildDrillWords(smartDrillKeys, 20).join(' '));
  };

  const exitMicroDrill = () => {
    const s = stateRef.current;
    setMicroDrillActive(false);
    const length = s.testMode === 'time' ? s.duration * 4 : s.wordCount;
    typing.setTargetText(generateText(s.level, length, s.customText, s.mirroredMode, {
      numbers: s.withNumbers,
      punctuation: s.withPunctuation,
      rng: s.dailyActive ? mulberry32(daySeed()) : undefined,
    }));
    typing.resetKeystrokes();
    // Go back to CONFIGURING instead of FINISHED to avoid triggering RPG
    // processing with an empty keystroke log.
    typing.setPhase('CONFIGURING');
  };

  // ─── Personal Best (ghost pacer data) ────────────────────────────
  const pbStorageKey = `typezen_pb:${level}:${testMode === 'time' ? 't' + duration : 'w' + wordCount}`;
  const pbGhost = useMemo((): { wpm: number; samples: PaceSample[] } | null => {
    if (level === 'CUSTOM' || mirroredMode || dailyActive) return null;
    try { return JSON.parse(localStorage.getItem(pbStorageKey) || 'null'); } catch { return null; }
    // typing.phase is a deliberate extra dep: reload the PB after each finish
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pbStorageKey, level, mirroredMode, dailyActive, typing.phase]);

  // ─── Theme / Sound Cycles ────────────────────────────────────────
  const selectTheme = (index: number) => {
    setThemeIndex(index);
    setSeenThemes(prev => new Set([...prev, index]));
    setShowThemeMenu(false);
  };

  const cycleSoundProfile = () => {
    const currentIdx = (SOUND_KEYS.indexOf(soundProfile) + 1) % SOUND_KEYS.length;
    setSoundProfileState(SOUND_KEYS[currentIdx]);
  };



  // Error timestamps (ms from test start) for the results pacing graph
  const errorTimes = useMemo(() => {
    const log = typing.keystrokeLog.current;
    if (log.length === 0 || !typing.startTime) return [];
    const t0 = log[0].time;
    return log.filter(k => k.isError && !k.isBackspace).map(k => k.time - t0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typing.phase, typing.endTime]);
  const finishDurationMs = typing.startTime && typing.endTime ? typing.endTime - typing.startTime : 0;

  // ─── Auto-Save ──────────────
  const hasAutoSavedRef = useRef(false);
  useEffect(() => {
    if (typing.phase !== 'FINISHED' || hasAutoSavedRef.current || microDrillActive) return;
    hasAutoSavedRef.current = true;

    // Auto-save if logged in
    if (autoSave && supabase && auth.session && cloud.username) {
      const wpmVal = Math.round(typing.wpm);
      const accVal = Math.round(typing.accuracy);
      if (wpmVal > 0 && wpmVal <= 300 && accVal >= 0 && accVal <= 100) {
        setSaveStatus('Auto-saving...');
        supabase.rpc('submit_score', {
          p_wpm: wpmVal,
          p_accuracy: accVal,
          p_daily: dailyActive,
          p_day: todayKey(),
        }).then(({ error }) => {
          if (error) setSaveStatus('Auto-save failed');
          else {
            setSaveStatus('SCORE SAVED!');
            fetchLeaderboard();
            if (dailyActive) fetchDailyBoard();
          }
        });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typing.phase]);

  // Reset the auto-save guard when a new test starts
  useEffect(() => {
    if (typing.phase === 'READY' || typing.phase === 'CONFIGURING') {
      hasAutoSavedRef.current = false;
    }
  }, [typing.phase]);

  // ─── Finish Test Wrapper ─────────────────────────────────────────
  // ─── KEYBOARD HANDLER (THE CORE) ─────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const s = stateRef.current;

      // Modal escape handling
      if (s.showTrophyRoom || s.showGodMode || s.showExpandedGraph || s.showThemeMenu || s.showStatsDashboard || s.showReplay || s.showRace) {
        if (e.key === 'Escape') {
          setShowTrophyRoom(false);
          setShowGodMode(false);
          setShowExpandedGraph(false);
          setShowThemeMenu(false);
          setShowStatsDashboard(false);
          setShowReplay(false);
          setShowRace(false);
        }
        return;
      }

      // During an active multiplayer race, swallow ESC so a mid-race abort
      // can't desync the room; typing still flows through below.
      if (s.raceActive && e.key === 'Escape') { e.preventDefault(); return; }

      // Caps lock detection
      if (e.getModifierState && e.getModifierState('CapsLock')) typing.setCapsLock(true);
      else typing.setCapsLock(false);

      // ─── CONFIGURING ───
      if (s.phase === 'CONFIGURING') {
        if (!e.ctrlKey && !e.metaKey && e.key.length === 1 && e.key !== ' ') {
          const nextInput = (s.input + e.key).toLowerCase();

          if ('iamnova'.startsWith(nextInput)) {
            typing.setInput(nextInput);
            if (nextInput === 'iamnova') {
              rpg.unlockAllAchievements();
              typing.setInput('');
            }
            return;
          } else if ('godmode'.startsWith(nextInput)) {
            typing.setInput(nextInput);
            if (nextInput === 'godmode') {
              setShowGodMode(true);
              typing.setInput('');
            }
            return;
          } else {
            typing.setInput('');
          }
        }

        if (e.key === ' ') {
          e.preventDefault();
          typing.setPhase('READY');
          typing.setInput('');
          return;
        }
        return;
      }

      // ─── READY ───
      if (s.phase === 'READY') {
        if (e.key === 'Enter') {
          e.preventDefault();
          setZenMode(e.shiftKey);
          typing.setPhase('COUNTDOWN');
          typing.setCountdownTimer(5);
        } else if (e.key === 'Escape') {
          typing.setPhase('CONFIGURING');
        }
        return;
      }

      // ─── COUNTDOWN / TYPING / FINISHED ───
      if (s.phase === 'COUNTDOWN' || s.phase === 'TYPING' || s.phase === 'FINISHED') {
        if (e.key === 'Escape') {
          if (microDrillActive) { exitMicroDrill(); }
          else { handleReset(); }
          return;
        }
      }

      // ─── TYPING ONLY ───
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA' || s.phase !== 'TYPING') return;
      if (e.ctrlKey || e.metaKey || e.altKey || (e.key.length > 1 && e.key !== 'Enter' && e.key !== 'Backspace')) return;
      if (e.key === 'Shift') return;

      // Backspace
      if (e.key === 'Backspace' && s.input.length > 0) {
        if (s.stickyKeysMode && s.stickyPenalty > 0) {
          setStickyPenalty(p => Math.max(0, p - 1));
          audio.playSound('error');
          return;
        }
        typing.setInput(prev => prev.slice(0, -1));
        // Log the (real) backspace so replay / PB ghost can reconstruct
        // input-over-time. Excluded from all stats via isBackspace.
        typing.keystrokeLog.current.push({ key: 'Backspace', expected: '', time: Date.now(), isError: false, isBackspace: true });
        audio.playSound('click');
        typing.setCombo(0);
        typing.comboRef.current = 0;
        return;
      }

      if (e.key === ' ' || e.key === 'Enter') e.preventDefault();

      if (s.input.length < s.targetText.length) {
        const now = Date.now();
        let typedChar = e.key;
        if (typedChar === 'Enter') typedChar = '\n';

        const expectedChar = s.targetText[s.input.length];
        const isError = typedChar !== expectedChar;
        const nextInput = s.input + typedChar;

        typing.setInput(nextInput);
        typing.keystrokeLog.current.push({ key: typedChar, expected: expectedChar, time: now, isError });

        if (isError) {
          audio.playSound('error');
          typing.setCombo(0);
          typing.comboRef.current = 0;
          typing.setShake(true);
          setTimeout(() => typing.setShake(false), 200);
          if (s.stickyKeysMode) setStickyPenalty(3);
          if (s.suddenDeath) {
            typing.finishTest(now, nextInput);
            return;
          }
        } else {
          const nextCombo = s.combo + 1;
          typing.comboRef.current = nextCombo;
          typing.setCombo(nextCombo);
          if (nextCombo > s.maxCombo) typing.setMaxCombo(nextCombo);
          audio.playSound('key');

          // Tetris particles at 50+ combo or when tetrisEffect is forced on
          if (s.tetrisEffect || nextCombo >= 50) {
            particles.spawnParticles(
              s.input.length,
              expectedChar,
              s.theme.text,
              Math.floor(Math.random() * 3) + 2
            );
          }
        }

        // Completion check
        if (nextInput.length === s.targetText.length) {
          typing.finishTest(now, nextInput);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []); // ← Empty deps: everything accessed via stateRef

  // ─── RPG Processing on Test Finish ───────────────────────────────
  useEffect(() => {
    if (typing.phase !== 'FINISHED' || !typing.endTime || !typing.startTime) return;
    const statsInput = typing.input;
    const timeMs = typing.endTime - typing.startTime;
    const stats = typing.calculateStats(statsInput, timeMs, typing.timePenalty);

    // Timed tests are rewarded/judged by what was actually typed, not the
    // oversized text buffer they run against.
    const isTimed = testMode === 'time';
    const typedWords = statsInput.trim() ? statsInput.trim().split(/\s+/).length : 0;
    const effWordCount = isTimed ? typedWords : wordCount;
    const effLength = isTimed ? statsInput.length : typing.targetText.length;

    const result = rpg.processRPG(
      stats.currentWpm, stats.currentAcc, typing.maxCombo,
      effWordCount, effLength,
      microDrillActive, typing.keystrokeLog.current,
      () => audio.playSound('levelup')
    );

    // Daily Challenge streak
    let streakNow = dailyStreak;
    if (dailyActive && !microDrillActive) {
      const today = todayKey();
      let prevDaily: { lastDay: string; streak: number } | null = null;
      try { prevDaily = JSON.parse(localStorage.getItem('typezen_daily') || 'null'); } catch { /* corrupt — treat as fresh */ }
      if (prevDaily?.lastDay === today) streakNow = prevDaily.streak;
      else if (prevDaily && isYesterday(prevDaily.lastDay)) streakNow = prevDaily.streak + 1;
      else streakNow = 1;
      localStorage.setItem('typezen_daily', JSON.stringify({ lastDay: today, streak: streakNow }));
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDailyStreak(streakNow);
    }

    // Result history for the stats dashboard (drills excluded)
    if (!microDrillActive) {
      appendHistory({
        d: new Date().toISOString(),
        wpm: stats.currentWpm, acc: stats.currentAcc, cons: stats.consistency,
        level, mode: isTimed ? 'time' : 'words',
        size: isTimed ? duration : wordCount,
      });
    }

    // Personal-best pace recording for the ghost pacer
    if (!microDrillActive && level !== 'CUSTOM' && !mirroredMode && !dailyActive && stats.currentWpm > 0) {
      try {
        const existing = JSON.parse(localStorage.getItem(pbStorageKey) || 'null');
        if (!existing || stats.currentWpm > existing.wpm) {
          localStorage.setItem(pbStorageKey, JSON.stringify({
            wpm: stats.currentWpm,
            samples: buildPaceSamples(typing.keystrokeLog.current),
          }));
        }
      } catch { /* storage quota / corrupt entry — non-fatal */ }
    }

    rpg.checkAchievements(
      stats.currentWpm, stats.currentAcc, typing.maxCombo,
      result.newXp, effWordCount,
      suddenDeath, blindMode, fogMode, overclockedMode,
      result.newTestsCompleted, _seenThemes.size, THEME_KEYS.length,
      isTimed, streakNow
    );

    // Multiplayer: broadcast the final result. The RaceResultsScreen is
    // rendered automatically when raceActive + phase === FINISHED.
    if (raceActive) {
      race.sendFinish(stats.currentWpm, stats.currentAcc, timeMs);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typing.phase, typing.endTime]);

  // ─── Multiplayer: broadcast live progress while racing ───────────
  useEffect(() => {
    if (!raceActive || typing.phase !== 'TYPING') return;
    const pct = typing.targetText.length > 0 ? (typing.input.length / typing.targetText.length) * 100 : 0;
    race.sendProgress(pct, typing.wpm);
  }, [raceActive, typing.phase, typing.input.length, typing.targetText.length, typing.wpm, race]);

  // ─── Timed Mode Countdown ────────────────────────────────────────
  useEffect(() => {
    if (typing.phase !== 'TYPING' || testMode !== 'time' || !typing.startTime) return;
    const interval = setInterval(() => {
      if (Date.now() - typing.startTime! >= duration * 1000) {
        typing.finishTest(Date.now());
      }
    }, 250);
    return () => clearInterval(interval);
  }, [typing.phase, typing.startTime, testMode, duration, typing]);

  // ─── Overclocked Penalty ─────────────────────────────────────────
  useEffect(() => {
    if (overclockedMode && typing.accuracy < 95 && typing.input.length > 5 && typing.phase === 'TYPING') {
      const interval = setInterval(() => {
        typing.setTimePenalty(p => p + 1000);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [overclockedMode, typing.accuracy, typing.input.length, typing.phase, typing]);

  // ─── UI Derived State ────────────────────────────────────────────
  const isTypingOrCountdown = typing.phase === 'TYPING' || typing.phase === 'COUNTDOWN';
  const shouldHideClutter = zenMode || isTypingOrCountdown;
  const progressPercent = typing.targetText.length > 0 ? (typing.input.length / typing.targetText.length) * 100 : 0;
  // Fixed-text levels have no meaningful word/time budget
  const lengthLocked = level === 'CODE' || level === 'CUSTOM' || level === 'QUOTES';
  // Number/punctuation mixing only applies to the plain word pools
  const mutatable = level === 'NOVICE' || level === 'ADEPT';

  // IMPORTANT FIX: Removed hardcoded overflow-hidden and added it conditionally, and added z-[200]
  const topHudClass = `transition-all duration-1000 ease-[cubic-bezier(0.23,1,0.32,1)] origin-top flex flex-col md:flex-row justify-between items-center gap-6 relative z-[200] ${
    shouldHideClutter ? 'opacity-0 blur-2xl -translate-y-12 max-h-0 pointer-events-none !mb-0 overflow-hidden' : 'opacity-100 blur-none translate-y-0 max-h-[200px] mb-8 overflow-visible'
  }`;

  const leaderboardClass = `transition-all duration-1000 ease-[cubic-bezier(0.23,1,0.32,1)] shrink-0 glass-panel glass-refract rounded-[2rem] overflow-hidden ${
    shouldHideClutter ? 'w-0 opacity-0 blur-2xl translate-x-32 pointer-events-none p-0 border-transparent m-0' : 'w-full xl:w-[400px] p-8 opacity-100 blur-none translate-x-0'
  }`;

  // ─── Render ──────────────────────────────────────────────────────
  if (typing.phase === 'FINISHED') {
    const resultsProps = {
      wpm: typing.wpm,
      rawWpm: typing.rawWpm,
      accuracy: typing.accuracy,
      consistency: typing.consistency,
      flawlessStreak: typing.flawlessStreak,
      leveledUp: rpg.leveledUp,
      xpGainedLast: rpg.xpGainedLast,
      theme,
      heatmapData: rpg.heatmapData,
      isLoggedIn: !!cloud.username,
      displayName: cloud.username,
      saveStatus,
      timelinePoints: typing.timelinePoints,
      errorTimes,
      durationMs: finishDurationMs,
      keystrokeLog: typing.keystrokeLog.current,
      testStartTime: typing.startTime || 0,
      onReset: () => handleReset(),
      onWatchReplay: () => setShowReplay(true),
      onStartMicroDrill: startMicroDrill,
      onStartSmartDrill: smartDrillKeys.length > 0 ? startSmartDrill : null,
    };

    if (raceActive) {
      return (
        <>
          <RaceResultsScreen
            {...resultsProps}
            players={race.players}
            selfId={race.selfId}
            roomSize={race.roomSize}
            timelines={race.getTimelines()}
            onLeaveRace={() => { race.leave(); setRaceActive(false); handleReset(); }}
          />
          {showReplay && (
            <ReplayModal
              targetText={typing.targetText}
              log={typing.keystrokeLog.current}
              theme={theme}
              onClose={() => setShowReplay(false)}
            />
          )}
        </>
      );
    }

    return (
      <>
        <ResultsScreen {...resultsProps} />
        {showReplay && (
          <ReplayModal
            targetText={typing.targetText}
            log={typing.keystrokeLog.current}
            theme={theme}
            onClose={() => setShowReplay(false)}
          />
        )}
      </>
    );
  }

  return (
    <div className={`min-h-screen theme-transition transition-colors duration-700 ${theme.bg} font-sans selection:bg-transparent outline-none flex flex-col items-center relative overflow-x-hidden`}>

      {/* Global Liquid-Glass SVG filter — rendered once, referenced by every
          .glass-refract panel via backdrop-filter: url(#glass-distortion)
          (Chromium only, gated by :root.svg-backdrop — see useGlassPointer).
          The whole frosted-glass chain lives INSIDE the filter: blur the
          backdrop first, THEN displace it, so the refraction ripples stay
          crisp instead of being smeared by a post-blur. Static (no animated
          attributes): a fixed lens texture, not a moving liquid. */}
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
        <defs>
          <filter id="glass-distortion" x="-30%" y="-30%" width="160%" height="160%" primitiveUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.012 0.018" numOctaves={2} seed={7} stitchTiles="stitch" result="noise" />
            <feGaussianBlur in="noise" stdDeviation="2" result="map" />
            <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="frost" />
            <feDisplacementMap in="frost" in2="map" scale="46" xChannelSelector="R" yChannelSelector="G" result="refracted" />
            <feColorMatrix in="refracted" type="saturate" values="1.6" />
          </filter>
        </defs>
      </svg>

      {/* Subtle Noise Texture Overlay for realism */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-[0.15] mix-blend-overlay" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>

      {/* ═══ ANIMATED DUAL-COLOR CONTRAST ORBS ═══ */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0 mix-blend-screen opacity-80">
        {/* PRIMARY vivid orb — top-left, large */}
        <div
          className="absolute rounded-full blur-[100px] orb-drift-1"
          style={{
            width: '50vw', height: '50vw', top: '-20%', left: '-15%',
            background: `radial-gradient(circle, rgba(${theme.glowPrimary},0.55) 0%, rgba(${theme.glowPrimary},0.15) 50%, transparent 70%)`,
          }}
        />
        {/* SECONDARY contrast orb — right side, large */}
        <div
          className="absolute rounded-full blur-[120px] orb-drift-2"
          style={{
            width: '55vw', height: '55vw', top: '20%', right: '-20%',
            background: `radial-gradient(circle, rgba(${theme.glowSecondary},0.50) 0%, rgba(${theme.glowSecondary},0.12) 50%, transparent 70%)`,
          }}
        />
        {/* PRIMARY accent — bottom, medium */}
        <div
          className="absolute rounded-full blur-[90px] orb-drift-3"
          style={{
            width: '40vw', height: '40vw', bottom: '-15%', left: '25%',
            background: `radial-gradient(circle, rgba(${theme.glowPrimary},0.40) 0%, rgba(${theme.glowPrimary},0.08) 50%, transparent 70%)`,
          }}
        />
        {/* SECONDARY small vivid — center area */}
        <div
          className="absolute rounded-full blur-[70px] orb-drift-4"
          style={{
            width: '30vw', height: '30vw', top: '45%', left: '35%',
            background: `radial-gradient(circle, rgba(${theme.glowSecondary},0.45) 0%, rgba(${theme.glowSecondary},0.10) 50%, transparent 70%)`,
          }}
        />
        {/* Mixed glow — top-right sweep */}
        <div
          className="absolute rounded-full blur-[140px] orb-drift-5"
          style={{
            width: '50vw', height: '50vw', top: '-25%', right: '5%',
            background: `radial-gradient(circle, rgba(${theme.glowPrimary},0.35) 0%, rgba(${theme.glowSecondary},0.20) 40%, transparent 65%)`,
          }}
        />
      </div>
      <div className="absolute inset-0 z-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>

      {/* Progress Bar — char-based for word tests, clock-based for timed */}
      {typing.phase === 'TYPING' && testMode === 'time' && typing.startTime ? (
        <TimedHud startTime={typing.startTime} duration={duration} theme={theme} />
      ) : (
        <div className="fixed top-0 left-0 h-1 bg-zinc-900 w-full z-[150]">
          <div className={`h-full ${theme.solid} transition-all duration-200 ease-out ${theme.glow}`} style={{ width: `${progressPercent}%` }} />
        </div>
      )}

      {/* Zen Mode Ambient */}
      {zenMode && (
        <div className="fixed inset-0 flex items-center justify-center pointer-events-none opacity-20 z-0 animate-in fade-in zoom-in duration-1000 ease-out">
          <div className={`w-[80vw] h-[80vw] ${theme.solid} rounded-full blur-[250px] animate-pulse`} style={{ animationDuration: '6s' }} />
        </div>
      )}

      {/* ═══ OVERLAY MODALS ═══ */}

      {/* Spacebar Prompt */}
      {typing.phase === 'CONFIGURING' && (
        <div className="fixed bottom-12 left-0 right-0 z-[100] flex justify-center animate-bounce pointer-events-none">
          <button
            onClick={() => { typing.setPhase('READY'); typing.setInput(''); }}
            className={`px-8 py-4 bg-zinc-950/90 backdrop-blur-xl border ${theme.border} rounded-full shadow-2xl flex items-center gap-4 text-white cursor-pointer hover:bg-zinc-900/90 transition-all duration-300 hover:scale-105 active:scale-95 group pointer-events-auto`}
          >
            <span className="text-zinc-500 font-bold tracking-widest text-xs uppercase group-hover:text-zinc-300 transition-colors">PRESS</span>
            <div className={`px-4 py-1 rounded bg-zinc-800 font-black ${theme.text} ${theme.glow} group-hover:scale-110 transition-transform`}>SPACE</div>
            <span className="text-zinc-500 font-bold tracking-widest text-xs uppercase group-hover:text-zinc-300 transition-colors">TO READY UP</span>
          </button>
        </div>
      )}

      {/* Ready Modal */}
      {typing.phase === 'READY' && (
        <div key="ready-modal" className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-zinc-950 border border-zinc-800 rounded-[2.5rem] p-10 shadow-2xl flex flex-col gap-6 w-full max-w-md lucid-scale" style={{ '--delay': '0ms' } as React.CSSProperties}>
            <div className="flex justify-center mb-2"><Keyboard className={theme.text} size={48} /></div>
            <div className="flex justify-between items-center bg-zinc-900 p-5 rounded-2xl border border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer" onClick={() => { typing.setPhase('COUNTDOWN'); typing.setCountdownTimer(5); }}>
              <span className="text-white font-black tracking-widest text-sm">NORMAL MODE</span>
              <span className="px-4 py-2 bg-zinc-800 rounded-lg text-xs font-black text-zinc-400 shadow-inner">ENTER</span>
            </div>
            <div className="flex justify-between items-center bg-zinc-900 p-5 rounded-2xl border border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer" onClick={() => { setZenMode(true); typing.setPhase('COUNTDOWN'); typing.setCountdownTimer(5); }}>
              <span className="text-white font-black tracking-widest text-sm">ZEN MODE</span>
              <div className="flex gap-2">
                <span className="px-4 py-2 bg-zinc-800 rounded-lg text-xs font-black text-zinc-400 shadow-inner">SHIFT</span>
                <span className="text-zinc-600 font-black text-xs self-center">+</span>
                <span className="px-4 py-2 bg-zinc-800 rounded-lg text-xs font-black text-zinc-400 shadow-inner">ENTER</span>
              </div>
            </div>
            <p className="text-center text-zinc-600 text-[10px] font-bold uppercase tracking-widest mt-2">Press ESC to configure</p>
          </div>
        </div>
      )}

      {/* Countdown */}
      {typing.phase === 'COUNTDOWN' && (
        <div key="countdown-modal" className="fixed inset-0 z-[200] flex items-center justify-center bg-black/20 backdrop-blur-md animate-in fade-in duration-300 pointer-events-none">
          <span className={`text-[12rem] font-black ${theme.text} caret-lucid drop-shadow-2xl`}>{typing.countdownTimer}</span>
        </div>
      )}

      {/* Achievement Toast */}
      {rpg.achievementQueue.length > 0 && (() => {
        const ToastIcon = ACHIEVEMENT_ICONS[rpg.achievementQueue[0].icon] ?? Trophy;
        return (
          <div className="fixed top-6 right-6 z-[600] animate-in slide-in-from-top fade-in duration-300">
            <div className={`bg-zinc-950/90 backdrop-blur-md border ${theme.borderHalf} rounded-2xl p-4 ${theme.toastGlow} flex items-center gap-4 min-w-[300px] lucid-slide`} style={{ '--delay': '0ms' } as React.CSSProperties}>
              {/* color via glowPrimary, not theme.text — galaxy's gradient-clip
                  text class would render an SVG stroke transparent */}
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10" style={{ color: `rgb(${theme.glowPrimary})` }}>
                <ToastIcon size={26} className={theme.drop} />
              </div>
              <div>
                <div className={`text-[10px] font-black uppercase tracking-widest ${theme.text}`}>Achievement Unlocked</div>
                <div className="text-white font-bold text-lg">{rpg.achievementQueue[0].title}</div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* God Mode Modal */}
      {showGodMode && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 lucid-scale" style={{ '--delay': '0ms' } as React.CSSProperties} onClick={() => setShowGodMode(false)}>
          <div className="bg-zinc-950 border border-zinc-800 rounded-[2.5rem] p-8 md:p-12 w-full max-w-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-8 border-b border-zinc-800 pb-6">
              <h2 className="text-3xl font-black text-white uppercase tracking-widest flex items-center"><Terminal className="mr-4 text-emerald-400" size={32} /> God Mode</h2>
              <button onClick={() => setShowGodMode(false)} className="p-3 bg-zinc-800 hover:bg-red-500/20 hover:text-red-400 rounded-full text-zinc-400 transition-all duration-200 border border-zinc-700 hover:border-red-500/50"><X size={24} /></button>
            </div>
            <div className="flex flex-col gap-6">
              <div className="flex justify-between items-center bg-zinc-900/50 p-6 rounded-3xl border border-zinc-800 shadow-inner">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-2xl ${tetrisEffect ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-500'}`}>
                    <Zap size={20} />
                  </div>
                  <div>
                    <h4 className="text-white font-bold tracking-widest uppercase mb-1">Tetris Effect Particles</h4>
                    <p className="text-xs text-zinc-500 font-bold">Auto-unlocks at 50 combo. Toggle here to test early.</p>
                  </div>
                </div>
                <button onClick={() => setTetrisEffect(!tetrisEffect)} className={`px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-xs transition-all duration-300 ${tetrisEffect ? 'bg-emerald-500 text-black shadow-[0_0_20px_rgba(34,197,94,0.4)] hover:shadow-[0_0_30px_rgba(34,197,94,0.6)]' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}>
                  {tetrisEffect ? 'ON ✓' : 'OFF'}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <button onClick={() => { rpg.unlockAllAchievements(); setShowGodMode(false); }} className="p-6 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-3xl font-black uppercase tracking-widest shadow-[0_0_20px_rgba(245,158,11,0.1)] transition-all flex flex-col items-center text-center text-xs">
                  <Trophy size={24} className="mb-2" /> Unlock All Achievements
                </button>
                <button onClick={() => { rpg.setXp(250000); setShowGodMode(false); }} className="p-6 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 rounded-3xl font-black uppercase tracking-widest shadow-[0_0_20px_rgba(14,165,233,0.1)] transition-all flex flex-col items-center text-center text-xs">
                  <Star size={24} className="mb-2" /> Set Level to Max (50+)
                </button>
              </div>
              <div className="mt-4 p-6 bg-red-500/5 border border-red-500/20 rounded-3xl">
                <h4 className="text-red-400 font-bold tracking-widest uppercase mb-3 text-xs flex items-center gap-2">
                  <RotateCcw size={16} /> DANGER ZONE
                </h4>
                <button onClick={() => { rpg.resetAllProgress(); setShowGodMode(false); }} className="w-full p-4 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-2xl font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 text-xs hover:shadow-[0_0_20px_rgba(239,68,68,0.2)]">
                  <RotateCcw size={18} /> Reset All Progress (Level, XP, Achievements, Themes)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Trophy Room Modal */}
      {showTrophyRoom && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300" onClick={() => setShowTrophyRoom(false)}>
          <div className="bg-zinc-950 border border-zinc-800 rounded-[2.5rem] p-8 md:p-12 w-full max-w-5xl shadow-2xl max-h-[90vh] overflow-y-auto lucid-scale" style={{ '--delay': '0ms' } as React.CSSProperties} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-10 border-b border-zinc-800 pb-6 sticky top-0 bg-zinc-950/90 backdrop-blur-md z-10">
              <h2 className="text-3xl font-black text-white uppercase tracking-widest flex items-center"><Trophy className="mr-4 text-amber-400" size={32} /> Hall of Legends</h2>
              <button onClick={() => setShowTrophyRoom(false)} className="p-3 bg-zinc-900 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors"><X size={24} /></button>
            </div>
            <div className="flex flex-col gap-12">
              {(['SKILL', 'HARDCORE', 'GRIND', 'SUPER'] as const).map(category => {
                const categoryAchievements = ACHIEVEMENTS.filter(a => a.category === category);
                return (
                  <div key={category}>
                    <h3 className={`text-sm font-black uppercase tracking-widest mb-6 ${category === 'SUPER' ? theme.text : 'text-zinc-500'}`}>{category} BADGES</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {categoryAchievements.map(ach => {
                        const isUnlocked = rpg.unlockedAchievements.includes(ach.id);
                        const AchIcon = ACHIEVEMENT_ICONS[ach.icon] ?? Trophy;
                        return (
                          <div key={ach.id} className={`p-5 rounded-3xl border transition-all flex flex-col items-center text-center ${isUnlocked ? `bg-zinc-900 ${theme.borderHalf} ${theme.auraLow} hover:-translate-y-1` : 'bg-zinc-950 border-zinc-800/50 opacity-60 grayscale'}`}>
                            <div className="relative mb-4">
                              {/* color via glowPrimary, not theme.text — galaxy's
                                  gradient-clip class would make SVG strokes transparent */}
                              <AchIcon
                                size={34}
                                className={isUnlocked ? theme.drop : 'text-zinc-600'}
                                style={isUnlocked ? { color: `rgb(${theme.glowPrimary})` } : undefined}
                              />
                              {!isUnlocked && <div className="absolute -bottom-2 -right-2 bg-zinc-800 rounded-full p-1"><Lock size={12} className="text-zinc-400" /></div>}
                            </div>
                            <h4 className={`font-bold mb-2 ${isUnlocked ? 'text-white' : 'text-zinc-500'}`}>{ach.title}</h4>
                            <p className="text-[10px] text-zinc-400 leading-relaxed font-semibold">{ach.desc}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* First-login: choose a leaderboard display name */}
      {cloud.status === 'needs-username' && (
        <div className="fixed inset-0 z-[700] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="bg-zinc-950 border border-zinc-800 rounded-[2.5rem] p-8 md:p-10 w-full max-w-md shadow-2xl lucid-scale" style={{ '--delay': '0ms' } as React.CSSProperties}>
            <div className="flex justify-center mb-4"><Trophy className={theme.text} size={40} /></div>
            <h2 className="text-2xl font-black text-white text-center tracking-widest uppercase mb-2">Choose your name</h2>
            <p className="text-center text-zinc-500 text-xs font-bold mb-6">This is how you'll appear on the leaderboard. Progress on this device will sync to your account.</p>
            <input
              type="text"
              value={nameInput}
              onChange={e => { setNameInput(e.target.value); setNameErr(''); }}
              onKeyDown={e => { e.stopPropagation(); if (e.key === 'Enter' && !savingName) submitUsername(); }}
              placeholder="ENTER NAME..."
              maxLength={12}
              autoFocus
              className="w-full bg-white/[0.04] border border-white/10 rounded-2xl px-6 py-4 text-white font-black text-xl uppercase text-center focus:outline-none focus:border-white/30 placeholder:text-zinc-600"
            />
            {nameErr && <p className="text-red-400 text-xs font-black tracking-widest text-center mt-3 uppercase">{nameErr}</p>}
            <button
              onClick={submitUsername}
              disabled={savingName}
              className={`w-full mt-5 px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-black tracking-widest rounded-2xl transition-all disabled:opacity-50 ${theme.text}`}
            >
              {savingName ? 'SAVING…' : 'CONTINUE'}
            </button>
            <button
              onClick={() => { void auth.signOut(); }}
              className="w-full mt-2 px-4 py-2 text-zinc-500 hover:text-zinc-300 text-[10px] font-black tracking-widest uppercase transition-colors"
            >
              Cancel & sign out
            </button>
          </div>
        </div>
      )}

      {/* ═══ MAIN CONTENT ═══ */}
      <div className={`relative w-full px-2 md:px-4 py-4 flex flex-col z-10 transition-all duration-1000 ease-[cubic-bezier(0.23,1,0.32,1)] ${shouldHideClutter ? 'max-w-[95vw]' : 'max-w-[1600px]'}`}>

        {/* Header */}
        <header className={topHudClass}>
          <div className="flex items-center space-x-6">
            <div className={`flex items-center space-x-3 ${theme.text}`}>
              <Keyboard size={36} className={typing.combo > 30 ? theme.drop : ''} />
              <span className="font-black tracking-widest text-3xl text-white">TYPE<span className={theme.text}>NOVA</span></span>
            </div>
            <div className="flex items-center glass-panel p-1.5 rounded-2xl">
              <div className="flex items-center px-3 py-1">
                <Star size={14} className={`${theme.text} mr-2`} />
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-widest text-white">LVL {rpg.userLevel}</span>
                  <div className="w-24 h-1.5 bg-zinc-800 rounded-full mt-1 overflow-hidden border border-zinc-800/50">
                    <div className={`h-full ${theme.solid} transition-all duration-500`} style={{ width: `${(rpg.currentLevelProgress / rpg.xpNeeded) * 100}%` }} />
                  </div>
                </div>
                <span className="text-[8px] font-mono text-zinc-500 ml-3 w-12 text-right">{rpg.xp} XP</span>
              </div>
              <div className="w-px h-6 bg-zinc-800/50 mx-2"></div>
              
              <button 
                onClick={() => isLoggedIn ? setShowTrophyRoom(true) : toast.error("Sign in to unlock Trophies!", { icon: <Lock size={14} /> })} 
                className={`p-2 rounded-xl bg-black/20 border transition-all ml-1 ${
                  !isLoggedIn ? 'border-white/5 text-zinc-600 hover:text-zinc-400' 
                  : rpg.unlockedAchievements.length > 0 ? `${theme.borderHalf} ${theme.text} ${theme.glow} ${theme.bgHover}` 
                  : 'border-white/10 text-zinc-500 hover:text-white'
                }`} 
                title={isLoggedIn ? "View Trophies" : "Sign in to unlock Trophies"}
              >
                {isLoggedIn ? <Trophy size={16} /> : <Lock size={16} />}
              </button>
              
              <button 
                onClick={() => isLoggedIn ? setShowStatsDashboard(true) : toast.error("Sign in to unlock detailed Stats!", { icon: <Lock size={14} /> })} 
                className={`p-2 rounded-xl bg-black/20 border transition-all ml-1 ${
                  !isLoggedIn ? 'border-white/5 text-zinc-600 hover:text-zinc-400' 
                  : 'border-white/10 text-zinc-500 hover:text-white'
                }`} 
                title={isLoggedIn ? "Your Stats" : "Sign in to unlock Stats"}
              >
                {isLoggedIn ? <BarChart2 size={16} /> : <Lock size={16} />}
              </button>
              
              <button 
                onClick={() => isLoggedIn ? setShowRace(true) : toast.error("Sign in to race with friends!", { icon: <Lock size={14} /> })} 
                className={`p-2 rounded-xl bg-black/20 border transition-all ml-1 ${
                  !isLoggedIn ? 'border-white/5 text-zinc-600 hover:text-zinc-400' 
                  : 'border-white/10 text-zinc-500 hover:text-white'
                }`} 
                title={isLoggedIn ? "Race a friend" : "Sign in to race with friends"}
              >
                {isLoggedIn ? <Swords size={16} /> : <Lock size={16} />}
              </button>

              <button 
                onClick={() => isLoggedIn ? setShowSocialModal(true) : toast.error("Sign in to manage friends!", { icon: <Lock size={14} /> })} 
                className={`p-2 rounded-xl bg-black/20 border transition-all ml-1 ${
                  !isLoggedIn ? 'border-white/5 text-zinc-600 hover:text-zinc-400' 
                  : (friendsState.incomingRequests.length > 0) ? `${theme.borderHalf} text-emerald-400 ${theme.glow} ${theme.bgHover}`
                  : 'border-white/10 text-zinc-500 hover:text-white'
                }`} 
                title={isLoggedIn ? "Manage Friends" : "Sign in to manage friends"}
              >
                {isLoggedIn ? <Users size={16} /> : <Lock size={16} />}
              </button>

              
              {dailyStreak > 0 && (
                <>
                  <div className="w-px h-6 bg-zinc-800/50 mx-2"></div>
                  <div className="flex items-center pr-2" title={`Daily Challenge streak: ${dailyStreak} day${dailyStreak === 1 ? '' : 's'}`}>
                    <Flame size={15} className="text-orange-400 mr-1" />
                    <span className="text-xs font-black text-white">{dailyStreak}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4 text-zinc-400 items-center">
            {/* Mode Toggles */}
            <div className="grid grid-cols-4 lg:grid-cols-8 gap-1 glass-panel rounded-2xl p-1">
              <button onClick={() => setSuddenDeath(!suddenDeath)} className={`p-2 rounded-xl transition-all flex justify-center items-center ${suddenDeath ? 'bg-red-500/20 text-red-400' : 'hover:text-white hover:bg-white/5'}`} title="1HP: One mistake ends it"><Skull size={18} /></button>
              <button onClick={() => setGhostPacer(!ghostPacer)} className={`p-2 rounded-xl transition-all flex justify-center items-center ${ghostPacer ? `${theme.bgAlpha} ${theme.text}` : 'hover:text-white hover:bg-white/5'}`} title={pbGhost ? `Ghost: race your best (${pbGhost.wpm} WPM)` : 'Ghost: 60 WPM pace'}><Ghost size={18} /></button>
              <button onClick={() => setFocusMode(!focusMode)} className={`p-2 rounded-xl transition-all flex justify-center items-center ${focusMode ? `${theme.bgAlpha} ${theme.text}` : 'hover:text-white hover:bg-white/5'}`} title="Focus"><Focus size={18} /></button>
              <button onClick={() => setBlindMode(!blindMode)} className={`p-2 rounded-xl transition-all flex justify-center items-center ${blindMode ? `${theme.bgAlpha} ${theme.text}` : 'hover:text-white hover:bg-white/5'}`} title="Blind"><Brain size={18} /></button>
              <button onClick={toggleMirror} className={`p-2 rounded-xl transition-all flex justify-center items-center ${mirroredMode ? `${theme.bgAlpha} ${theme.text}` : 'hover:text-white hover:bg-white/5'}`} title="Mirror"><FlipHorizontal size={18} /></button>
              <button onClick={() => setFogMode(!fogMode)} className={`p-2 rounded-xl transition-all flex justify-center items-center ${fogMode ? `${theme.bgAlpha} ${theme.text}` : 'hover:text-white hover:bg-white/5'}`} title="Fog"><CloudFog size={18} /></button>
              <button onClick={() => setStickyKeysMode(!stickyKeysMode)} className={`p-2 rounded-xl transition-all flex justify-center items-center ${stickyKeysMode ? `${theme.bgAlpha} ${theme.text}` : 'hover:text-white hover:bg-white/5'}`} title="Sticky Keys"><Magnet size={18} /></button>
              <button onClick={() => setOverclockedMode(!overclockedMode)} className={`p-2 rounded-xl transition-all flex justify-center items-center ${overclockedMode ? 'bg-red-500/20 text-red-400' : 'hover:text-white hover:bg-white/5'}`} title="Overclocked"><Timer size={18} /></button>
            </div>

            {/* Theme & Sound Components */}
            <div className="flex glass-panel rounded-2xl p-1 items-center relative z-50">
              {/* Animated Theme Dropdown */}
              <div className="relative" ref={themeMenuRef}>
                <button 
                  onClick={() => setShowThemeMenu(!showThemeMenu)} 
                  className={`p-2 px-4 rounded-xl hover:bg-white/5 ${theme.text} flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all`} 
                  title="Select Theme"
                >
                  <Palette size={16} /> <span className="text-zinc-300">{theme.name.toUpperCase()}</span>
                  <ChevronDown size={14} className={`text-zinc-500 transition-transform duration-300 ${showThemeMenu ? 'rotate-180' : ''}`} />
                </button>
                
                {/* Dropdown Menu Overlay - FIXED to open on the right and avoid being cut off */}
                <div 
                  className={`absolute top-full mt-2 right-0 w-56 bg-zinc-950/95 backdrop-blur-xl border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden origin-top-right transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] z-[1000] ${showThemeMenu ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto' : 'opacity-0 scale-95 -translate-y-4 pointer-events-none'}`}
                >
                  <div className="max-h-64 overflow-y-auto p-2 flex flex-col gap-1">
                    {THEME_KEYS.map((key, idx) => {
                       const t = THEMES[key];
                       const isActive = idx === themeIndex;
                       return (
                         <button
                           key={key}
                           onClick={() => selectTheme(idx)}
                           className={`flex items-center justify-between w-full px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isActive ? `bg-white/10 ${t.text}` : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'}`}
                         >
                           <div className="flex items-center gap-3">
                             <div className={`w-3 h-3 rounded-full shadow-inner border border-white/10 ${t.solid}`} />
                             {t.name}
                           </div>
                           {isActive && <Check size={14} className={t.text} />}
                         </button>
                       );
                    })}
                  </div>
                </div>
              </div>

              <div className="w-px h-4 bg-white/10 mx-1"></div>
              
              <button onClick={cycleSoundProfile} className="p-2 px-3 rounded-xl hover:bg-white/5 text-zinc-300 text-[10px] font-black uppercase tracking-widest flex items-center">
                <Volume2 size={12} className="mr-2" /> {soundProfile.toUpperCase()}
              </button>
              
              <button onClick={() => setMutedState(!muted)} className="p-2 px-4 rounded-xl hover:bg-white/5 text-zinc-300">
                {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
            </div>

            {/* Account: Google login + cloud-sync status */}
            <AccountMenu
              theme={theme}
              loggedIn={!!cloud.username}
              displayName={cloud.username}
              avatarUrl={(auth.user?.user_metadata as { avatar_url?: string; picture?: string } | undefined)?.avatar_url
                ?? (auth.user?.user_metadata as { picture?: string } | undefined)?.picture ?? null}
              status={cloud.status}
              onSignIn={() => { void auth.signInWithGoogle(); }}
              onSignOut={() => { void auth.signOut(); }}
            />
          </div>
        </header>

        <main className={`flex flex-col xl:flex-row gap-8 w-full transition-all duration-1000 ease-[cubic-bezier(0.23,1,0.32,1)] ${shouldHideClutter ? 'justify-center items-center mt-0' : 'mt-4'}`}>
          <div className="flex-1 w-full flex flex-col gap-6">

            {/* Difficulty & Length/Time & Daily */}
            <div className={`flex flex-col md:flex-row flex-wrap gap-8 items-start transition-all duration-1000 ${shouldHideClutter ? 'hidden opacity-0' : 'flex opacity-100'}`}>
              <div className={`flex flex-col gap-2 transition-opacity ${dailyActive ? 'opacity-30' : 'opacity-100'}`}>
                <span className="text-[9px] font-black tracking-widest uppercase text-zinc-400 flex items-center ml-2"><Target size={10} className="mr-1.5" /> DIFFICULTY</span>
                <div className="flex glass-panel p-1.5 rounded-full">
                  {(['NOVICE', 'ADEPT', 'MASTER', 'QUOTES', 'CODE', 'CUSTOM'] as Level[]).map(l => {
                    const isLocked = !isLoggedIn && (l === 'CODE' || l === 'CUSTOM');
                    return (
                      <button 
                        key={l} 
                        onClick={() => {
                          if (isLocked) {
                            const modeName = l === 'CODE' ? 'Code' : 'Custom';
                            toast.error(`Sign in to unlock ${modeName} Mode!`, { icon: <Lock size={14} /> });
                            return;
                          }
                          changeLevel(l);
                        }} 
                        className={`px-3 md:px-5 py-2.5 rounded-full text-[11px] font-black tracking-widest transition-all ${level === l ? `bg-white/10 ${theme.text} border border-white/10 shadow-[0_0_15px_currentColor]` : isLocked ? 'text-zinc-600 hover:text-zinc-400 border border-transparent' : 'text-zinc-400 hover:text-white border border-transparent'} flex justify-center items-center gap-2`}
                      >
                        {isLocked && <Lock size={10} />}
                        {l}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className={`flex flex-col gap-2 transition-opacity ${lengthLocked || dailyActive ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
                <span className="text-[9px] font-black tracking-widest uppercase text-zinc-400 flex items-center ml-2">
                  {testMode === 'time' ? <Clock size={10} className="mr-1.5" /> : <Activity size={10} className="mr-1.5" />}
                  {testMode === 'time' ? 'SECONDS' : 'WORDS'}
                </span>
                <div className="flex glass-panel p-1.5 rounded-full items-center">
                  {/* words / time segment */}
                  <button
                    onClick={() => changeTestMode('words')}
                    disabled={lengthLocked}
                    className={`p-2.5 rounded-full transition-all ${testMode === 'words' ? `bg-white/10 ${theme.text}` : 'text-zinc-500 hover:text-white'}`}
                    title="Word-count mode"
                  ><Hash size={13} /></button>
                  <button
                    onClick={() => changeTestMode('time')}
                    disabled={lengthLocked}
                    className={`p-2.5 rounded-full transition-all ${testMode === 'time' ? `bg-white/10 ${theme.text}` : 'text-zinc-500 hover:text-white'}`}
                    title="Timed mode"
                  ><Clock size={13} /></button>
                  <div className="w-px h-4 bg-white/10 mx-1.5"></div>
                  {(testMode === 'time' ? [15, 30, 60] : [10, 25, 50, 100]).map(v => {
                    const active = testMode === 'time' ? duration === v : wordCount === v;
                    return (
                      <button
                        key={v}
                        onClick={() => (testMode === 'time' ? changeDuration(v) : changeWordCount(v))}
                        disabled={lengthLocked}
                        className={`px-3 md:px-5 py-2.5 rounded-full text-[11px] font-black tracking-widest transition-all ${active ? `bg-white/10 ${theme.text} border border-white/10 shadow-[0_0_15px_currentColor]` : 'text-zinc-400 hover:text-white border border-transparent'} ${lengthLocked ? 'cursor-not-allowed' : ''}`}
                      >
                        {v}
                      </button>
                    );
                  })}
                  {mutatable && (
                    <>
                      <div className="w-px h-4 bg-white/10 mx-1.5"></div>
                      <button
                        onClick={toggleNumbers}
                        className={`px-2.5 py-2 rounded-full text-[10px] font-black tracking-widest transition-all ${withNumbers ? `bg-white/10 ${theme.text}` : 'text-zinc-500 hover:text-white'}`}
                        title="Mix in numbers"
                      >123</button>
                      <button
                        onClick={togglePunctuation}
                        className={`px-2.5 py-2 rounded-full text-[10px] font-black tracking-widest transition-all ${withPunctuation ? `bg-white/10 ${theme.text}` : 'text-zinc-500 hover:text-white'}`}
                        title="Mix in punctuation"
                      >!?</button>
                    </>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-[9px] font-black tracking-widest uppercase text-zinc-400 flex items-center ml-2"><CalendarCheck size={10} className="mr-1.5" /> CHALLENGE</span>
                <div className="flex glass-panel p-1.5 rounded-full">
                  <button
                    onClick={toggleDaily}
                    className={`px-4 md:px-6 py-2.5 rounded-full text-[11px] font-black tracking-widest transition-all flex items-center gap-2 ${dailyActive ? `bg-white/10 ${theme.text} border border-white/10 shadow-[0_0_15px_currentColor]` : 'text-zinc-400 hover:text-white border border-transparent'}`}
                    title="Same seeded 50-word ADEPT text for everyone, every day"
                  >
                    <CalendarCheck size={12} /> DAILY
                  </button>
                </div>
              </div>

              {/* Language Selector for Code Mode */}
              {level === 'CODE' && (
                <div className="flex flex-col gap-2 w-full animate-in fade-in slide-in-from-top-2 duration-300">
                  <span className="text-[9px] font-black tracking-widest uppercase text-zinc-400 flex items-center ml-2">
                    <Code size={10} className="mr-1.5" /> LANGUAGE
                  </span>
                  <div className="flex glass-panel p-1.5 rounded-full flex-wrap gap-1 w-max max-w-full">
                    {CODE_LANGUAGES.map(lang => (
                      <button 
                        key={lang} 
                        onClick={() => changeCodeLanguage(lang)} 
                        className={`px-3 md:px-5 py-2 rounded-full text-[10px] font-black tracking-widest transition-all ${codeLanguage === lang ? `bg-white/10 text-white border border-white/10 shadow-[0_0_15px_rgba(255,255,255,0.2)]` : 'text-zinc-500 hover:text-white border border-transparent'} flex justify-center items-center`}
                      >
                        {lang.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {level === 'CUSTOM' && (
                <div className="flex flex-col gap-2 flex-1 min-w-[300px] max-w-xl animate-in fade-in slide-in-from-left-4 duration-300">
                  <span className="text-[9px] font-black tracking-widest uppercase text-zinc-400 flex items-center ml-2">
                    <Code size={10} className="mr-1.5" /> YOUR TEXT
                  </span>
                  <textarea
                    value={customText}
                    onChange={(e) => {
                      const newText = e.target.value;
                      setCustomText(newText);
                      if (level === 'CUSTOM') {
                        const final = mirroredMode
                          ? newText.trim().split(' ').reverse().join(' ')
                          : newText.trim();
                        typing.setTargetText(final || 'Type your custom text above...');
                      }
                    }}
                    onKeyDown={(e) => e.stopPropagation()}
                    placeholder="Paste your custom text here to practice..."
                    className="w-full h-24 bg-white/[0.04] border border-white/10 rounded-2xl p-4 text-zinc-300 text-sm font-mono focus:outline-none focus:border-white/30 focus:bg-white/[0.06] resize-none transition-all"
                    spellCheck={false}
                  />
                </div>
              )}
            </div>

            {/* Stats HUD — hidden in zen mode */}
            {!zenMode && (
              <StatsPanel
                wpm={typing.wpm}
                accuracy={typing.accuracy}
                consistency={typing.consistency}
                combo={typing.combo}
                themeText={theme.text}
                
                timelinePoints={typing.timelinePoints}
                keystrokeLogLength={typing.keystrokeLog.current.length}
              />
            )}

            {/* Typing Area */}
            <TypingArea
              targetText={typing.targetText}
              input={typing.input}
              phase={typing.phase}
              theme={theme}
              blindMode={blindMode}
              focusMode={focusMode}
              fogMode={fogMode}
              startTime={typing.startTime}
              shake={typing.shake}
              capsLock={typing.capsLock}
              stickyPenalty={stickyPenalty}
              particles={particles.particles}
              ghostPacer={ghostPacer}
              combo={typing.combo}
              zenMode={zenMode}
              pbGhost={pbGhost}
              isCodeMode={level === 'CODE'}
              racePlayers={raceActive ? race.players.filter(p => p.id !== race.selfId) : undefined}
            />

            {/* Abort Button (only during active test, NOT on finished) */}
            {(typing.phase === 'TYPING' || typing.phase === 'COUNTDOWN') && (
              <div className="mt-4 flex justify-center w-full z-10 relative">
                <button onClick={() => handleReset()} className="flex items-center space-x-3 px-8 py-3 bg-white/[0.04] hover:bg-white/10 text-zinc-300 hover:text-white transition-colors rounded-full border border-white/10 text-[10px] md:text-xs font-black tracking-widest shadow-xl backdrop-blur-md">
                  <RotateCcw size={16} /> <span>ABORT & CONFIGURE (ESC)</span>
                </button>
              </div>
            )}
          </div>

          {/* Leaderboard Sidebar */}
          <aside className={leaderboardClass}>
            <div className="flex items-center justify-between text-white font-black tracking-widest mb-8 border-b border-white/10 pb-6 text-lg w-full">
              <div className="flex items-center">
                <Award size={20} className={`mr-3 ${theme.text}`} />
                <span className="whitespace-nowrap">{boardTab === 'today' ? 'DAILY 5' : boardTab === 'friends' ? 'FRIENDS' : 'TOP 5'}</span>
              </div>
              <div className="flex gap-1 bg-black/20 rounded-full p-1 border border-white/10">
                <button onClick={() => setBoardTab('alltime')} className={`px-3 py-1.5 rounded-full text-[9px] font-black tracking-widest transition-all ${boardTab === 'alltime' ? `bg-white/10 ${theme.text}` : 'text-zinc-500 hover:text-white'}`}>ALL</button>
                <button onClick={() => { setBoardTab('today'); fetchDailyBoard(); }} className={`px-3 py-1.5 rounded-full text-[9px] font-black tracking-widest transition-all ${boardTab === 'today' ? `bg-white/10 ${theme.text}` : 'text-zinc-500 hover:text-white'}`}>TODAY</button>
                <button onClick={() => setBoardTab('friends')} className={`px-3 py-1.5 rounded-full text-[9px] font-black tracking-widest transition-all ${boardTab === 'friends' ? `bg-white/10 ${theme.text}` : 'text-zinc-500 hover:text-white'}`}>FRIENDS</button>
              </div>
            </div>

            {boardTab === 'friends' && !isLoggedIn && (
              <div className="flex flex-col items-center justify-center py-10 text-center opacity-70">
                <Lock size={32} className="text-zinc-600 mb-4" />
                <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest max-w-[180px]">
                  Sign in to connect and compete with friends.
                </p>
              </div>
            )}


            {(boardTab === 'today' ? dailyBoard : boardTab === 'friends' ? friendsBoard : leaderboard).length === 0 ? (
              <p className="text-zinc-500 text-sm text-center py-8 font-bold whitespace-nowrap">
                {boardTab === 'friends' ? (cloud.username ? 'No friends yet. Follow someone!' : 'Log in to use friends.') : boardTab === 'today' ? 'No daily scores yet. Run the DAILY challenge!' : 'No scores yet. Be the first!'}
              </p>
            ) : (
              <div className="space-y-6 w-full">
                {(boardTab === 'today' ? dailyBoard : boardTab === 'friends' ? friendsBoard : leaderboard).map((entry, idx) => (
                  <div key={idx} className="flex justify-between items-center group p-3 rounded-2xl hover:bg-white/5 transition-all duration-300 w-full border border-transparent hover:border-white/5 hover:translate-x-1 relative">
                    <div className="flex items-center space-x-6">
                      <span className={`font-black text-xl ${idx === 0 ? theme.text : 'text-zinc-500'}`}>#{idx + 1}</span>
                      <span className="font-black text-white tracking-widest uppercase text-lg whitespace-nowrap">{entry.username}</span>
                    </div>
                    <div className="flex flex-col items-end mr-4 group-hover:mr-10 transition-all">
                      <span className={`font-black text-3xl ${theme.text}`}>{entry.wpm}</span>
                      <span className="text-[10px] text-zinc-400 font-bold tracking-widest whitespace-nowrap">{entry.accuracy}% ACC</span>
                    </div>
                    {boardTab === 'friends' && entry.username !== cloud.username && (
                      <div className="absolute right-3 opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-all bg-black/40 rounded-full p-1 border border-white/5">
                        <button 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            race.createRoom(cloud.username || 'Player', typing.targetText, 2);
                            setRaceActive(true);
                            setShowRace(true);
                          }}
                          className="p-2 text-zinc-400 hover:text-amber-400 transition-all rounded-full"
                          title="Challenge to Race"
                        >
                          <Swords size={14} />
                        </button>
                        <div className="w-px h-4 bg-white/10"></div>
                        <button 
                          onClick={(e) => { e.stopPropagation(); friendsState.removeFriend(entry.username); }}
                          className="p-2 text-zinc-400 hover:text-red-400 transition-all rounded-full"
                          title="Unfollow"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </aside>
        </main>
      </div>

      {/* Expanded Graph Overlay */}
      {showExpandedGraph && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/60 p-6 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setShowExpandedGraph(false)}>
          <div className="bg-zinc-900/95 p-8 rounded-3xl w-full max-w-4xl border border-zinc-800 shadow-2xl lucid-scale" style={{ '--delay': '0ms' } as React.CSSProperties} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className={`text-2xl font-black ${theme.text}`}>PACING TIMELINE</h3>
              <button onClick={() => setShowExpandedGraph(false)} className="text-zinc-400 hover:text-white transition-colors"><X size={24} /></button>
            </div>
            <svg viewBox="0 0 800 240" className="w-full h-64 bg-zinc-950/50 rounded-2xl p-4 border border-zinc-800">
              {[0, 20, 40, 60, 80, 100].map((x) => (
                <line key={`grid-v-${x}`} x1={x * 8} y1="0" x2={x * 8} y2="200" stroke="rgba(113, 113, 122, 0.1)" strokeWidth="1" />
              ))}
              {[0, 50, 100, 150, 200].map((y) => (
                <line key={`grid-h-${y}`} x1="0" y1={y} x2="800" y2={y} stroke="rgba(113, 113, 122, 0.1)" strokeWidth="1" />
              ))}
              {(() => {
                const pts = typing.timelinePoints.length ? typing.timelinePoints : [];
                if (pts.length === 0) return null;
                const maxW = Math.max(...pts.map(p => p.wpm).concat([typing.wpm || 1, 10]));
                const poly = pts.map((p, i) => {
                  const x = ((i + 1) / pts.length) * 760 + 20;
                  const y = 200 - Math.min(200, (p.wpm / Math.max(maxW, 10)) * 160);
                  return `${x},${y}`;
                }).join(' ');
                return <polyline fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" points={poly} className={theme.text} />;
              })()}
            </svg>
            <div className="grid grid-cols-5 gap-2 mt-6">
              {typing.timelinePoints.map((p, i) => (
                <div key={i} className="bg-zinc-800/50 p-3 rounded-lg text-center border border-zinc-700">
                  <div className={`font-black text-lg ${theme.text}`}>{p.wpm} wpm</div>
                  <div className="text-[10px] text-zinc-500 font-black">+{Math.round((p.t) / 1000)}s</div>
                </div>
              ))}
            </div>
            <div className="mt-6 text-center text-sm text-zinc-500 font-black">Click outside to close</div>
          </div>
        </div>
      )}

      {/* Stats Dashboard */}
      {showStatsDashboard && (
        <StatsDashboard
          theme={theme}
          testsCompleted={rpg.testsCompleted}
          onClose={() => setShowStatsDashboard(false)}
        />
      )}


      {/* Multiplayer Race */}
      {showRace && (
        <RaceModal
          status={race.status}
          code={race.code}
          initialCode={initialRaceCode}
          isHost={race.isHost}
          players={race.players}
          error={race.error}
          selfId={race.selfId}
          theme={theme}
          roomSize={race.roomSize}
          onCreate={(name, size) => race.createRoom(name, generateText('ADEPT', 40), size)}
          onJoin={(code, name) => race.joinRoom(code, name)}
          onStart={race.startRace}
          onLeave={() => { race.leave(); setRaceActive(false); setShowRace(false); }}
          onClose={() => setShowRace(false)}
        />
      )}

      {/* Social Modal */}
      {showSocialModal && (
        <SocialModal
          theme={theme}
          onClose={() => setShowSocialModal(false)}
          friendsState={friendsState}
        />
      )}
    </div>
  );
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { session, authReady } = useAuth();
  
  if (!authReady) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center text-zinc-500 font-black tracking-widest text-xs">
        LOADING...
      </div>
    );
  }
  
  const isGuest = localStorage.getItem('guestMode') === 'true';
  
  if (!session && !isGuest) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<AuthGuard><MainApp /></AuthGuard>} />
        <Route path="/login" element={<Login />} />
      </Routes>
      <Toaster position="top-center" theme="dark" />
    </>
  );
}