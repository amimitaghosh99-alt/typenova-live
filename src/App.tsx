 
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-hooks/purity */
/* eslint-disable no-empty */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Lock
} from 'lucide-react';

import {
  THEMES, THEME_KEYS,
  NOVICE_SENTENCES, ADEPT_SENTENCES,
  type CodeLanguage,
  generateText
} from '@/data/constants';
import { useWallpaperTheme } from '@/hooks/useWallpaperTheme';

import type { Level, Theme } from '@/data/constants';
import { useAudioEngine } from '@/hooks/useAudioEngine';
import { useTypingEngine } from '@/hooks/useTypingEngine';
import type { Keystroke } from '@/hooks/useTypingEngine';
import { useRPGSystem } from '@/hooks/useRPGSystem';
import { useParticles } from '@/hooks/useParticles';
import { useQuests } from '@/hooks/useQuests';
import { useGameConfig } from '@/hooks/useGameConfig';
import { TypingController } from '@/components/TypingController';

import type { PaceSample } from '@/components/TypingArea';
import { ResultsScreen } from '@/components/ResultsScreen';
import { RaceResultsScreen } from '@/components/RaceResultsScreen';
import { AIDrillResultsScreen } from '@/components/AIDrillResultsScreen';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { appendHistory, loadHistory } from '@/components/StatsDashboard';
import type { HistoryEntry } from '@/components/StatsDashboard';
import { ReplayModal } from '@/components/ReplayModal';
import { TITLE_BADGES, getActiveTitleId } from '@/data/titles';
import { useChallenges } from '@/hooks/useChallenges';
import { useRace, makeRoomCode } from '@/hooks/useRace';
import { mulberry32, daySeed, todayKey, isYesterday } from '@/utils/seededRandom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useCloudSync } from '@/hooks/useCloudSync';
import { useFriends } from '@/hooks/useFriends';
import { PracticeArena } from '@/components/PracticeArena';
import { LeaderboardSidebar } from '@/components/LeaderboardSidebar';
import { BottomControlsDock } from '@/components/BottomControlsDock';
import { AppModalManager } from '@/components/AppModalManager';
import { Routes, Route, Navigate } from 'react-router';
import { Login } from '@/pages/Login';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';
import { AnimatePresence, motion, type Variants } from 'framer-motion';
import { CHANGELOG } from '@/data/changelog';

import { AcademyLayout } from '@/components/academy/AcademyLayout';
import { useSmartDrills } from '@/hooks/useSmartDrills';
import { AI_KEYS } from '@/lib/aiClient';
import { CosmicNavBar } from '@/components/CosmicNavBar';
import CosmicLiquidShader from '@/components/CosmicLiquidShader';
import { LobbyScreen } from '@/components/LobbyScreen';

// ─── STAGE PAGE TRANSITION VARIANTS ────────────────────────────────────
const STAGE_PAGE_ORDER: Record<string, number> = {
  practice: 0,
  compete: 1,
  academy: 2,
};

const STAGE_PAGE_VARIANTS: Variants = {
  initial: (dir: number) => ({
    opacity: 0,
    x: dir * 32,
    scale: 0.99,
  }),
  animate: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: {
      duration: 0.22,
      ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
    },
  },
  exit: (dir: number) => ({
    opacity: 0,
    x: dir * -32,
    scale: 0.99,
    transition: {
      duration: 0.16,
      ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
    },
  }),
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
// Native requestAnimationFrame driver for uncapped display refresh rate.
function TimedHud({ startTime, duration, theme }: { startTime: number; duration: number; theme: Theme }) {
  const [elapsed, setElapsed] = useState(() => Math.max(0, Date.now() - startTime));

  useEffect(() => {
    let animId: number;
    const tick = () => {
      setElapsed(Math.max(0, Date.now() - startTime));
      animId = requestAnimationFrame(tick);
    };
    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [startTime]);

  const totalMs = duration * 1000;
  const remaining = Math.max(0, Math.ceil((totalMs - elapsed) / 1000));
  const pct = Math.min(100, (elapsed / totalMs) * 100);

  return (
    <>
      <div className="fixed top-0 left-0 h-1 bg-zinc-900 w-full z-[150]">
        <div className={`h-full ${theme.solid} ${theme.glow}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[150] px-5 py-1.5 rounded-full bg-zinc-950/90 border border-white/10 pointer-events-none font-display shadow-xl">
        <span className={`font-black text-lg tabular-nums ${remaining <= 5 ? 'text-red-400' : theme.text}`}>{remaining}s</span>
      </div>
    </>
  );
}

function MainApp() {
  // ─── Mode State ──────────────────────────────────────────────────
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [showSoundMenu, setShowSoundMenu] = useState(false);
  const [isAruOpen, setIsAruOpen] = useState(false);

  const [techAiState, setTechAiState] = useState({
    apiKey: localStorage.getItem(AI_KEYS.byokKey) || '',
    baseUrl: localStorage.getItem(AI_KEYS.byokUrl) || 'https://api.groq.com/openai/v1',
    model: localStorage.getItem(AI_KEYS.byokModel) || 'llama-3.3-70b-versatile',
    connectionStatus: 'idle' as const,
    connectionError: '',
    modelCount: 0
  });

  useEffect(() => {
    const handleStorage = () => {
      setTechAiState(prev => ({
        ...prev,
        apiKey: localStorage.getItem(AI_KEYS.byokKey) || '',
        baseUrl: localStorage.getItem(AI_KEYS.byokUrl) || 'https://api.groq.com/openai/v1',
        model: localStorage.getItem(AI_KEYS.byokModel) || 'llama-3.3-70b-versatile',
      }));
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const openTabTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const academyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimeoutRef.current) clearTimeout(resetTimeoutRef.current);
      if (openTabTimeoutRef.current) clearTimeout(openTabTimeoutRef.current);
      if (academyTimeoutRef.current) clearTimeout(academyTimeoutRef.current);
    };
  }, []);

  const techCapabilities = useMemo(() => ({
    openTab: (tabId: string) => {
      setActiveModal('settings');
      if (openTabTimeoutRef.current) clearTimeout(openTabTimeoutRef.current);
      openTabTimeoutRef.current = setTimeout(() => window.dispatchEvent(new CustomEvent('open_settings_tab', { detail: tabId })), 50);
    },
    setProvider: (url: string) => {
      localStorage.setItem(AI_KEYS.byokUrl, url);
      window.dispatchEvent(new Event('storage'));
    },
    setModel: (model: string) => {
      localStorage.setItem(AI_KEYS.byokModel, model);
      window.dispatchEvent(new Event('storage'));
    }
  }), []);
  
  const [themeFont, setThemeFont] = useState(() => localStorage.getItem('typezen_font') || 'JetBrains Mono');
  
  useEffect(() => {
    document.documentElement.style.setProperty('--typezen-font', `"${themeFont}"`);
  }, [themeFont]);

  const [dailyStreak, setDailyStreak] = useState(loadDailyStreak);
  const resetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [themeIndex, setThemeIndex] = useState(() => {
    try { const saved = localStorage.getItem('typezen_theme'); return saved ? parseInt(saved, 10) : 0; } catch { return 0; }
  });
  const [soundProfile, setSoundProfileState] = useState(() => {
    try { return localStorage.getItem('typezen_sound') || 'thocky'; } catch { return 'thocky'; }
  });
  const [_seenThemes, setSeenThemes] = useState(() => {
    try { const saved = localStorage.getItem('typezen_theme'); return new Set([0, saved ? parseInt(saved, 10) : 0]); } catch { return new Set([0]); }
  });

  type ModalType = 'trophy' | 'godMode' | 'expandedGraph' | 'stats' | 'replay' | 'race' | 'profile' | 'social' | 'comms' | 'quests' | 'settings' | 'changelog' | 'theme' | 'sound' | 'bugReports' | 'ghost' | null;
  const [activeModal, setActiveModal] = useState<ModalType>(null);

  // Aliases for backward compatibility during refactor
  const setShowTrophyRoom = useCallback((b: boolean) => setActiveModal(b ? 'trophy' : null), []);
  const setShowStatsDashboard = useCallback((b: boolean) => setActiveModal(b ? 'stats' : null), []);
  const setShowRace = useCallback((b: boolean) => setActiveModal(b ? 'race' : null), []);
  const setShowProfile = useCallback((b: boolean) => setActiveModal(b ? 'profile' : null), []);
  const setShowSocialModal = useCallback((b: boolean) => setActiveModal(b ? 'social' : null), []);
  const setShowCommsModal = useCallback((b: boolean) => setActiveModal(b ? 'comms' : null), []);
  const setShowDailyQuestsModal = useCallback((b: boolean) => setActiveModal(b ? 'quests' : null), []);
  const setShowSettingsModal = useCallback((b: boolean) => setActiveModal(b ? 'settings' : null), []);
  const setShowChangelog = useCallback((b: boolean) => setActiveModal(b ? 'changelog' : null), []);
  const setShowGhostModal = useCallback((b: boolean) => setActiveModal(b ? 'ghost' : null), []);

  const [tetrisEffect, setTetrisEffect] = useState(false);
  const [raceActive, setRaceActive] = useState(false);
  const [isRankedMatch, setIsRankedMatch] = useState(false);
  const { generateDrill, isGenerating: isSmartDrillGenerating } = useSmartDrills();
  const [currentStage, setCurrentStage] = useState<'practice' | 'compete' | 'academy'>('practice');
  const isAcademyMode = currentStage === 'academy';

  const enterAcademy = useCallback(() => {
    setCurrentStage('academy');
  }, []);
  const [initialRaceCode, setInitialRaceCode] = useState<string | undefined>();
  const [selectedProfileUsername, setSelectedProfileUsername] = useState<string | null>(null);

  interface LeaderboardRow {
    username: string;
    wpm: number;
    accuracy: number;
  }

  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [dailyBoard, setDailyBoard] = useState<LeaderboardRow[]>([]);
  const [friendsBoard, setFriendsBoard] = useState<LeaderboardRow[]>([]);
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

  // Force document background via JS to prevent any browser extensions from overriding the dark theme
  useEffect(() => {
    document.documentElement.style.setProperty('background-color', '#080809', 'important');
    document.body.style.setProperty('background-color', '#080809', 'important');
    const root = document.getElementById('root');
    if (root) root.style.setProperty('background-color', '#080809', 'important');
  }, []);

  const quests = useQuests((gained) => rpg.setXp((prev: number) => prev + gained));
  const particles = useParticles();

  // Ref-based callback to break the dependency cycle between
  // handleReset (which lives in App.tsx) and the change handlers
  // that now live inside useGameConfig.
  const handleResetRef = useRef<(overrides: {
    level?: Level; wordCount?: number; mirrored?: boolean;
    testMode?: 'words' | 'time'; duration?: number;
    numbers?: boolean; punctuation?: boolean; codeLanguage?: CodeLanguage; daily?: boolean;
  }) => void>(() => { });

  const game = useGameConfig((overrides) => handleResetRef.current(overrides));



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
  const levelOptions = useMemo(() => (["NOVICE", "ADEPT", "MASTER", "QUOTES", "CODE", "CUSTOM"] as Level[]).map(l => ({
    label: l,
    value: l,
    locked: !isLoggedIn && (l === "CODE" || l === "CUSTOM")
  })), [isLoggedIn]);

  const handleSignIn = useCallback(() => { void auth.signInWithGoogle(); }, [auth]);
  const handleSignOut = useCallback(() => { void auth.signOut(); }, [auth]);
  const handleUnlockGodMode = useCallback(() => setActiveModal('godMode'), []);
  const friendsState = useFriends({ supabase, session: auth.session, username: cloud.username });

  const challenges = useChallenges({
    supabase,
    username: cloud.username,
    onAccepted: () => {
      // Challenger: friend accepted — they already joined, we open the race UI
      setShowSocialModal(false);
      setShowRace(true);
    },
  });

  // H10: Memoize localRPGStats to prevent infinite re-renders in PlayerProfileModal
  // which lists it as a dependency in its useEffect.
  const localRPGStatsMemo = useMemo(() => {
    if (!cloud.username || !selectedProfileUsername) return undefined;
    if (selectedProfileUsername.toLowerCase() !== cloud.username.toLowerCase()) return undefined;
    const h: HistoryEntry[] = loadHistory();
    return {
      level: rpg.userLevel,
      xp: rpg.xp,
      currentLevelProgress: rpg.currentLevelProgress,
      xpNeeded: rpg.xpNeeded,
      skillStats: {
        maxWpm: h.length ? Math.max(...h.map((e) => e.wpm)) : 0,
        avgAccuracy: h.slice(-20).length ? Math.round(h.slice(-20).reduce((a, e) => a + e.acc, 0) / h.slice(-20).length) : 0,
        dailyStreak,
        testsCompleted: rpg.testsCompleted,
        racesWon: 0,
        totalWordsTyped: h.reduce((a, e) => a + e.size, 0),
      }
    };
  }, [cloud.username, selectedProfileUsername, rpg.userLevel, rpg.xp, rpg.currentLevelProgress, rpg.xpNeeded, rpg.testsCompleted, dailyStreak]);

  const handleChallengeFriend = (
    friendUsername: string,
    config?: { mode?: Level; words?: number; language?: CodeLanguage }
  ) => {
    if (!cloud.username) return;
    const roomCode = makeRoomCode();
    race.createRoom(cloud.username, 2, undefined, cloud.elo, roomCode, auth.user?.id, false);
    if (config) {
      race.updateLobbyConfig(config);
    }
    challenges.sendChallenge(friendUsername, roomCode, cloud.elo, config);
    const modeLabel = config ? `${config.mode}${config.words ? ` (${config.words}w)` : ''}` : '';
    toast.success(`Challenge ${modeLabel} sent to ${friendUsername}! Waiting…`, { icon: '⚔️' });
    setShowSocialModal(false);
    setShowRace(true);
  };

  // ─── Online Heartbeat ────────────────────────────────────────────
  useEffect(() => {
    if (!supabase || !auth.session?.user.id) return;

    const pingPresence = () => {
      supabase?.from('profiles')
        .update({ last_seen: new Date().toISOString() })
        .eq('id', auth.session!.user.id)
        .then(({ error }) => {
          if (error) console.error("Heartbeat error:", error);
        });
    };

    // Ping immediately when the session becomes available
    pingPresence();

    // Then ping every 60 seconds
    const intervalId = setInterval(pingPresence, 60 * 1000);
    return () => clearInterval(intervalId);
  }, [auth.session, supabase]);

  // Handle URL share links
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const room = params.get('race');
    if (room && room.length === 6) {
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
    onStart: (text, startAt) => {
      setShowRace(false);
      setRaceActive(true);
      // Reset engine but keep raceActive; disable modifier modes for fairness
      typing.resetEngine();
      typing.setTargetText(text);
      game.setZenMode(false); game.setMirroredMode(false); game.setDailyActive(false);
      game.setSuddenDeath(false); game.setBlindMode(false); game.setFogMode(false);
      game.setStickyKeysMode(false); game.setOverclockedMode(false);
      // Sync the countdown to the host's clock so everyone starts together
      const secsLeft = Math.max(1, Math.ceil((startAt - Date.now()) / 1000));
      typing.setPhase('COUNTDOWN');
      typing.setCountdownTimer(secsLeft);
    },
  });

  // Rematch State Sync: when the room status returns to 'lobby' while a race was active,
  // unmount the Results screen and pull all connected clients back into the VS Lobby together!
  useEffect(() => {
    if (race.status === 'lobby' && raceActive) {
      setRaceActive(false);
      setCurrentStage('compete');
      typing.setPhase('CONFIGURING');
    }
  }, [race.status, raceActive, typing.setPhase]);

  const {
    wallpaperUrl,
    wallpaperTheme,
    brightness,
    setBrightness,
    blur,
    setBlur,
    customAccent,
    setCustomAccent,
    selectCuratedWallpaper,
    handleFileUpload,
    clearWallpaper,
  } = useWallpaperTheme();

  const safeThemeKey = THEME_KEYS[themeIndex] || THEME_KEYS[0];
  const theme: Theme = (themeIndex === -1 && wallpaperTheme) 
    ? wallpaperTheme 
    : (THEMES[safeThemeKey] || THEMES[THEME_KEYS[0]]);
    
  const themeMenuRef = useRef<HTMLDivElement>(null);
  const soundMenuRef = useRef<HTMLDivElement>(null);

  // Removed stateRef (now encapsulated in TypingController)

  // Keep audio engine in sync
  useEffect(() => { audio.setSoundProfile(soundProfile); }, [soundProfile, audio]);
  useEffect(() => {
    audio.setComboRef(typing.combo);
    typing.syncComboRef(typing.combo);
  }, [typing.combo, audio, typing]);

  // Click outside listener for Theme & Sound Dropdowns
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (themeMenuRef.current && !themeMenuRef.current.contains(e.target as Node)) {
        setShowThemeMenu(false);
      }
      if (soundMenuRef.current && !soundMenuRef.current.contains(e.target as Node)) {
        setShowSoundMenu(false);
      }
    };
    if (showThemeMenu || showSoundMenu) {
      document.addEventListener('mousedown', handleClickOutside, { passive: true });
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showThemeMenu, showSoundMenu]);

  // ─── Initialization ──────────────────────────────────────────────
  useEffect(() => {
    typing.setTargetText(generateText('NOVICE', 25, '', false));
     
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
    const usernames = [cloud.username, ...friendsState.friends.map(f => f.username)];
    const data = [];
    let fetchError = null;
    const chunkSize = 40;
    for (let i = 0; i < usernames.length; i += chunkSize) {
      const chunk = usernames.slice(i, i + chunkSize);
      const { data: chunkData, error } = await supabase.from('leaderboard').select('username, wpm, accuracy').in('username', chunk);
      if (error) { fetchError = error; break; }
      if (chunkData) data.push(...chunkData);
    }

    if (!fetchError && data) {
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

  const [activeTitle, setActiveTitle] = useState(getActiveTitleId());
  useEffect(() => {
    const handleTitleChange = () => setActiveTitle(getActiveTitleId());
    window.addEventListener('titleChanged', handleTitleChange);
    return () => window.removeEventListener('titleChanged', handleTitleChange);
  }, []);

  // ─── Cloud Sync push ─────────────────────────────────────────────
  // Once synced, mirror progress back to the cloud whenever it changes
  // (debounced in the hook). A finished test always bumps testsCompleted, so
  // this also captures history/PB/daily writes that don't have React deps.
  useEffect(() => {
    if (cloud.status === 'synced' && cloud.username) {
      const stats = {
        maxWpm: (() => { const h: HistoryEntry[] = loadHistory(); return h.length ? Math.max(...h.map((e: HistoryEntry) => e.wpm)) : 0; })(),
        avgAccuracy: (() => { const h: HistoryEntry[] = loadHistory().slice(-20); return h.length ? Math.round(h.reduce((a: number, e: HistoryEntry) => a + e.acc, 0) / h.length) : 0; })(),
        testsCompleted: rpg.testsCompleted,
        dailyStreak,
        racesWon: 0,
        totalWordsTyped: (() => { const h: HistoryEntry[] = loadHistory(); return h.reduce((a: number, e: HistoryEntry) => a + e.size, 0); })(),
      };
      const activeId = activeTitle;
      const unlocked = TITLE_BADGES.filter((b) => b.isUnlocked(stats)).map((b) => b.id);

      cloud.pushProgress({
        level: rpg.userLevel,
        xp: rpg.xp,
        equippedTitle: activeId,
        unlockedBadges: unlocked,
        maxWpm: stats.maxWpm,
        avgAcc: stats.avgAccuracy,
        testsCompleted: stats.testsCompleted,
      });
    }
  }, [rpg.xp, rpg.userLevel, rpg.testsCompleted, rpg.unlockedAchievements, rpg.heatmapData, dailyStreak, cloud.status, cloud.pushProgress, cloud.username, activeTitle]);

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
    const cfg = game.configRef.current;
    const nextLevel = overrides.level ?? cfg.level;
    const nextCount = overrides.wordCount ?? cfg.wordCount;
    const nextMirror = overrides.mirrored ?? cfg.mirroredMode;
    const nextMode = overrides.testMode ?? cfg.testMode;
    const nextDuration = overrides.duration ?? cfg.duration;
    const nextNumbers = overrides.numbers ?? cfg.withNumbers;
    const nextPunct = overrides.punctuation ?? cfg.withPunctuation;
    const nextCodeLanguage = overrides.codeLanguage ?? cfg.codeLanguage;
    const nextDaily = overrides.daily ?? cfg.dailyActive;
    const nextCustom = cfg.customText;

    // Timed tests need a deep word buffer (240 words for 60s ≈ 240 WPM ceiling)
    const length = nextMode === 'time' ? nextDuration * 4 : nextCount;

    typing.setPhase('CONFIGURING');
    if (resetTimeoutRef.current) clearTimeout(resetTimeoutRef.current);

    typing.resetEngine();
    typing.setTargetText(generateText(nextLevel, length, nextCustom, nextMirror, {
      numbers: nextNumbers,
      punctuation: nextPunct,
      codeLanguage: nextCodeLanguage,
      rng: nextDaily ? mulberry32(daySeed()) : undefined,
    }));

    game.setZenMode(false);
    setSaveStatus('');
    if (raceActive) {
      race.leave();
      setRaceActive(false);
    }
    rpg.resetRPGFlags();
    particles.clearAll();
  }, [typing, rpg, particles, race, game.configRef, raceActive]);

  useEffect(() => {
    handleResetRef.current = handleReset;
  }, [handleReset]);
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
  const launchDrill = useCallback((text: string) => {
    typing.resetEngine();
    game.setMicroDrillActive(true);
    typing.setTargetText(text);
    typing.setPhase('READY');
  }, [typing, game]);

  const startMicroDrill = useCallback((keyChar: string) => {
    const words = buildDrillWords([keyChar], 10);
    launchDrill(keyChar === 'ENTER' ? words.join('\n') : words.join(' '));
  }, [launchDrill]);

  // Lifetime-weakest keys (min 10 hits each, letters/digits only)
  const smartDrillKeys = useMemo(() => {
    const worstKeys = Object.entries(rpg.heatmapData || {})
      .filter(([k, v]) => v.total >= 10 && k !== 'SPACE' && k !== 'ENTER')
      .map(([k, v]) => [k, v.errors / v.total] as [string, number])
      .filter(([, rate]) => rate > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([k]) => k);
      
    // Shuffle the top 15 worst keys and pick 5 to add variety,
    // otherwise the user sees the exact same 5 keys for weeks
    // since lifetime stats are slow to shift.
    return worstKeys.sort(() => Math.random() - 0.5).slice(0, 5);
  }, [rpg.heatmapData]);

  // Same weakness data, but ranked and with the rates attached, so the AI coach
  // can name specific keys instead of giving generic advice.
  const aruWeakKeys = useMemo(() => {
    return Object.entries(rpg.heatmapData || {})
      .filter(([k, v]) => v.total >= 10 && k !== 'SPACE' && k !== 'ENTER')
      .map(([key, v]) => ({ key, errorRate: v.errors / v.total }))
      .filter((k) => k.errorRate > 0)
      .sort((a, b) => b.errorRate - a.errorRate)
      .slice(0, 5);
  }, [rpg.heatmapData]);

  const isFinished = typing.phase === 'FINISHED';
  const finishedWpm = isFinished ? typing.wpm : 0;
  const finishedAcc = isFinished ? typing.accuracy : 0;
  const aruStats = useMemo(() => ({
    wpm: finishedWpm,
    accuracy: finishedAcc,
    level: rpg.userLevel,
    testsCompleted: rpg.testsCompleted,
    streak: dailyStreak,
    weakKeys: aruWeakKeys,
  }), [finishedWpm, finishedAcc, rpg.userLevel, rpg.testsCompleted, dailyStreak, aruWeakKeys]);

  const startSmartDrill = useCallback(async (sessionKeys?: string[]) => {
    const targetKeys = sessionKeys && sessionKeys.length > 0 ? sessionKeys : smartDrillKeys;
    if (targetKeys.length === 0) {
      toast.error('Not enough data! Play a few rounds first to generate weak keys.', { icon: '⚠️' });
      return;
    }
    
    try {
      const result = await generateDrill(targetKeys);
      launchDrill(result.text);
    } catch (err) {
      toast.error('Failed to generate drill. Is Aru offline?');
    }
  }, [smartDrillKeys, generateDrill, launchDrill]);

  const exitMicroDrill = useCallback(() => {
    game.setMicroDrillActive(false);
    handleResetRef.current({});
  }, [game]);

  // ─── Personal Best (ghost pacer data) ────────────────────────────
  const pbStorageKey = `typezen_pb:${game.level}:${game.testMode === 'time' ? 't' + game.duration : 'w' + game.wordCount}`;
  const pbGhost = useMemo((): { wpm: number; samples: PaceSample[] } | null => {
    if (game.level === 'CUSTOM' || game.mirroredMode || game.dailyActive) return null;
    try { return JSON.parse(localStorage.getItem(pbStorageKey) || 'null'); } catch { return null; }
    // typing.phase is a deliberate extra dep: reload the PB after each finish
     
  }, [pbStorageKey, game.level, game.mirroredMode, game.dailyActive, typing.phase]);

  // ─── Theme / Sound Cycles ────────────────────────────────────────
  const selectTheme = useCallback((index: number) => {
    setThemeIndex(index);
    setSeenThemes(prev => new Set([...prev, index]));
    setShowThemeMenu(false);
    try { localStorage.setItem('typezen_theme', index.toString()); } catch {}
  }, []);

  const selectSoundProfile = useCallback((key: string) => {
    setSoundProfileState(key);
    setShowSoundMenu(false);
    try { localStorage.setItem('typezen_sound', key); } catch {}
  }, []);



  // Error timestamps (ms from test start) for the results pacing graph
  const errorTimes = useMemo(() => {
    const log = typing.keystrokeLog.current;
    if (log.length === 0 || !typing.startTime) return [];
    const t0 = log[0].time;
    return log.filter(k => k.isError && !k.isBackspace).map(k => k.time - t0);
     
  }, [typing.phase, typing.endTime]);
  const finishDurationMs = typing.startTime && typing.endTime ? typing.endTime - typing.startTime : 0;

  // ─── Auto-Save ──────────────
  const hasAutoSavedRef = useRef(false);
  useEffect(() => {
    if (typing.phase !== 'FINISHED' || !typing.endTime || hasAutoSavedRef.current || game.microDrillActive) return;
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
          p_time_ms: finishDurationMs + typing.timePenalty,
          p_log: typing.keystrokeLog.current,
          p_daily: game.dailyActive,
          p_day: todayKey(),
        }).then(({ error }) => {
          if (error) setSaveStatus(`Error: ${error.message}`);
          else {
            setSaveStatus('SCORE SAVED!');
            fetchLeaderboard();
            if (game.dailyActive) fetchDailyBoard();
          }
        });
      }
    }
  }, [
    autoSave,
    auth.session,
    cloud.username,
    fetchDailyBoard,
    fetchLeaderboard,
    finishDurationMs,
    game.dailyActive,
    game.microDrillActive,
    supabase,
    typing.accuracy,
    typing.endTime,
    typing.input,
    typing.phase,
    typing.timePenalty,
    typing.wpm,
  ]);

  // Reset the auto-save guard when a new test starts
  useEffect(() => {
    if (typing.phase === 'READY' || typing.phase === 'CONFIGURING') {
      hasAutoSavedRef.current = false;
    }
  }, [typing.phase]);

  // Removed actionsRef and handleKeyDown (now encapsulated in TypingController)

  // ─── RPG Processing on Test Finish ───────────────────────────────
  useEffect(() => {
    if (typing.phase !== 'FINISHED' || !typing.endTime || !typing.startTime) return;
    const statsInput = typing.input;
    const timeMs = typing.endTime - typing.startTime;
    const stats = typing.calculateStats(statsInput, timeMs, typing.timePenalty, typing.startTime);

    // Timed tests are rewarded/judged by what was actually typed, not the
    // oversized text buffer they run against.
    const isTimed = game.testMode === 'time';
    const typedWords = statsInput.trim() ? statsInput.trim().split(/\s+/).length : 0;
    const effWordCount = isTimed ? typedWords : game.wordCount;
    const effLength = isTimed ? statsInput.length : typing.targetText.length;

    // Quest Progression
    if (stats.currentWpm > 0) {
      quests.progressQuest('words_typed', stats.currentWpm * (timeMs / 60000));
      quests.progressQuest('wpm_achieved', stats.currentWpm);
      quests.progressQuest('acc_achieved', stats.currentAcc);
    }

    const result = rpg.processRPG(
      stats.currentWpm, stats.currentAcc, typing.maxCombo,
      effWordCount, effLength,
      game.microDrillActive, typing.keystrokeLog.current,
      () => audio.playSound('levelup')
    );

    // Daily Challenge streak
    let streakNow = dailyStreak;
    if (game.dailyActive && !game.microDrillActive) {
      const today = todayKey();
      let prevDaily: { lastDay: string; streak: number } | null = null;
      try { prevDaily = JSON.parse(localStorage.getItem('typezen_daily') || 'null'); } catch { /* corrupt — treat as fresh */ }
      if (prevDaily?.lastDay === today) streakNow = prevDaily.streak;
      else if (prevDaily && isYesterday(prevDaily.lastDay)) streakNow = prevDaily.streak + 1;
      else streakNow = 1;
      localStorage.setItem('typezen_daily', JSON.stringify({ lastDay: today, streak: streakNow }));
       
      setDailyStreak(streakNow);
    }

    // Result history for the stats dashboard (drills excluded)
    if (!game.microDrillActive) {
      appendHistory({
        d: new Date().toISOString(),
        wpm: stats.currentWpm, acc: stats.currentAcc, cons: stats.consistency,
        level: game.level, mode: isTimed ? 'time' : 'words',
        size: isTimed ? game.duration : game.wordCount,
      });
    }

    // Personal-best pace recording for the ghost pacer
    if (!game.microDrillActive && game.level !== 'CUSTOM' && !game.mirroredMode && !game.dailyActive && stats.currentWpm > 0) {
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
      game.suddenDeath, game.blindMode, game.fogMode, game.overclockedMode,
      result.newTestsCompleted, _seenThemes.size, THEME_KEYS.length,
      isTimed, streakNow
    );

    // Multiplayer: broadcast the final result. The RaceResultsScreen is
    // rendered automatically when raceActive + phase === FINISHED.
    if (raceActive) {
      const errCount = typing.keystrokeLog.current.filter(k => k.isError).length;
      const backspaceCount = typing.keystrokeLog.current.filter(k => k.key === 'Backspace').length;
      race.sendFinish(stats.currentWpm, stats.currentAcc, timeMs, stats.rawWpm, stats.consistency, result.updatedHeatmap, errCount, backspaceCount);
    }
     
  }, [typing.phase, typing.endTime]);

  // ─── Multiplayer: broadcast live progress while racing ───────────
  useEffect(() => {
    if (!raceActive || typing.phase !== 'TYPING') return;
    const pct = typing.targetText.length > 0 ? (typing.input.length / typing.targetText.length) * 100 : 0;
    race.sendProgress(pct, typing.wpm);
  }, [raceActive, typing.phase, typing.input.length, typing.targetText.length, typing.wpm, race]);

  // ─── Ref to always hold the latest typing state ─────────────────
  // Used by both timed-mode countdown and overclocked penalty so their
  // intervals can read fresh values without being in the dep array.
  const penaltyTypingRef = useRef(typing);
  useEffect(() => { penaltyTypingRef.current = typing; });

  // ─── Timed Mode Countdown ────────────────────────────────────────
  useEffect(() => {
    if (typing.phase !== 'TYPING' || game.testMode !== 'time' || !typing.startTime) return;
    // Capture startTime at setup — it won't change during a test.
    const testStartTime = typing.startTime;
    const durationMs = game.duration * 1000;
    const interval = setInterval(() => {
      if (Date.now() >= testStartTime + durationMs) {
        penaltyTypingRef.current.finishTest(testStartTime + durationMs);
      }
    }, 250);
    return () => clearInterval(interval);
    // `typing` is intentionally excluded — we read it via penaltyTypingRef
    // to prevent the interval from being destroyed on every keystroke.
     
  }, [typing.phase, typing.startTime, game.testMode, game.duration]);

  useEffect(() => {
    if (!game.overclockedMode || typing.phase !== 'TYPING') return;

    const interval = setInterval(() => {
      const cur = penaltyTypingRef.current;
      if (cur.accuracy < 95 && cur.input.length > 5 && cur.phase === 'TYPING') {
        cur.setTimePenalty(p => p + 1000);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [game.overclockedMode, typing.phase]);

  // ─── UI Derived State ────────────────────────────────────────────
  const isTypingOrCountdown = typing.phase === 'TYPING' || typing.phase === 'COUNTDOWN';
  const shouldHideClutter = game.zenMode || isTypingOrCountdown;
  const progressPercent = typing.targetText.length > 0 ? (typing.input.length / typing.targetText.length) * 100 : 0;
  // Fixed-text levels have no meaningful word/time budget
  const lengthLocked = game.level === 'CODE' || game.level === 'CUSTOM' || game.level === 'QUOTES';
  // Number/punctuation mixing only applies to the plain word pools
  const mutatable = game.level === 'NOVICE' || game.level === 'ADEPT';

  const leaderboardClass = `transition-[opacity,transform] duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] will-change-[opacity,transform] shrink-0 glass-panel rounded-[2rem] overflow-hidden ${
    shouldHideClutter ? 'w-0 opacity-0 translate-x-12 pointer-events-none p-0 border-transparent m-0 hidden lg:hidden' : 'w-full lg:w-[30%] p-6 md:p-8 opacity-100 translate-x-0'
  }`;

  // ====== MEMOIZED HANDLERS FOR MODALS ======
  const handleCloseModal = useCallback(() => setActiveModal(null), []);
  const handleStartWeaknessDrill = useCallback((drillText: string) => {
    typing.setTargetText(drillText);
    setActiveModal(null);
    typing.resetEngine();
  }, [typing.setTargetText, typing.resetEngine]);
  const handleRaceCreate = useCallback((name: string, size?: number, isRanked?: boolean, roomCode?: string) => {
    setIsRankedMatch(!!isRanked);
    race.createRoom(name, size, undefined, cloud.elo, roomCode, auth.user?.id, !!isRanked);
  }, [race, cloud.elo, auth.user?.id]);
  const handleRaceJoin = useCallback((code: string, name: string, isRanked?: boolean) => {
    setIsRankedMatch(!!isRanked);
    race.joinRoom(code, name, cloud.elo, auth.user?.id, !!isRanked);
  }, [race, cloud.elo, auth.user?.id]);
  const handleRaceStart = useCallback((text?: string) => {
    race.startRace(text);
  }, [race]);
  const handleRaceLeave = useCallback(() => {
    race.leave();
    setRaceActive(false);
    setCurrentStage('practice');
    setIsRankedMatch(false);
  }, [race]);
  const previousModalRef = useRef<ModalType>(null);
  const handleOpenProfile = useCallback((name: string) => {
    setSelectedProfileUsername(name);
    // Track the modal we're coming from (but don't record 'profile' as a previous state)
    setActiveModal(prev => {
      if (prev !== 'profile') previousModalRef.current = prev;
      return 'profile';
    });
  }, []);

  const handleProfileClose = useCallback(() => {
    setActiveModal(previousModalRef.current);
    previousModalRef.current = null;
  }, []);

  const exitAcademy = useCallback(() => {
    setCurrentStage('practice');
  }, []);

  const activeStagePage = currentStage;
  const prevStagePageRef = useRef(activeStagePage);
  const [stageDirection, setStageDirection] = useState(1);

  if (activeStagePage !== prevStagePageRef.current) {
    const prevIdx = STAGE_PAGE_ORDER[prevStagePageRef.current] ?? 0;
    const currIdx = STAGE_PAGE_ORDER[activeStagePage] ?? 0;
    const newDir = currIdx >= prevIdx ? 1 : -1;
    if (stageDirection !== newDir) {
      setStageDirection(newDir);
    }
    prevStagePageRef.current = activeStagePage;
  }

  const handleChangeLevel = useCallback((l: Level) => game.changeLevel(l), [game]);
  const handleLockedLevelClick = useCallback((l: Level) => {
    const modeName = l === "CODE" ? "Code" : "Custom";
    toast.error(`Sign in to unlock ${modeName} Mode!`, { icon: <Lock size={14} /> });
  }, []);
  const handleChangeCountOrDuration = useCallback((v: number) => {
    if (game.testMode === 'time') game.changeDuration(v);
    else game.changeWordCount(v);
  }, [game]);
  const handleChangeCodeLanguage = useCallback((lang: CodeLanguage) => game.changeCodeLanguage(lang), [game]);
  const handleWatchReplay = useCallback(() => setActiveModal('replay'), []);
  const handleRetryDrill = useCallback(() => { launchDrill(typing.targetText); }, [launchDrill, typing.targetText]);
  const handleReturnToRoom = useCallback(() => {
    race.returnToLobby();
    setRaceActive(false);
    setCurrentStage('compete');
    typing.setPhase('CONFIGURING');
  }, [race, typing.setPhase]);
  const handleRematchRace = handleReturnToRoom;
  const handleLeaveRace = useCallback(() => {
    race.leave();
    setRaceActive(false);
    setIsRankedMatch(false);
    setCurrentStage('practice');
    handleReset();
  }, [race, handleReset]);
  const handleCloseAru = useCallback(() => setIsAruOpen(false), []);
  const handleSetThemeFont = useCallback((font: string) => {
    setThemeFont(font);
    localStorage.setItem('typezen_font', font);
  }, []);

  const otherRacePlayers = useMemo(() => (
    raceActive ? race.players.filter(p => p.id !== race.selfId) : undefined
  ), [raceActive, race.players, race.selfId]);

  const techModifiersMemo = useMemo(() => ({
    sudden_death: game.suddenDeath,
    overclocked: game.overclockedMode,
    blind: game.blindMode,
    fog: game.fogMode,
    mirror: game.mirroredMode,
    ghost: game.ghostPacer,
    focus: !!game.focusMode,
    sticky: game.stickyKeysMode,
  }), [
    game.suddenDeath,
    game.overclockedMode,
    game.blindMode,
    game.fogMode,
    game.mirroredMode,
    game.ghostPacer,
    game.focusMode,
    game.stickyKeysMode,
  ]);

  // ─── Render ──────────────────────────────────────────────────────

  if (typing.phase === 'FINISHED') {
    let ghostTimeline: Array<{ t: number; wpm: number }> | null = null;
    let ghostLabel = '';
    let ghostDeltaS: number | undefined = undefined;

    if (game.ghostPacer) {
      if (game.ghostMode === 'pb' && pbGhost?.samples && pbGhost.samples.length > 1) {
        ghostLabel = `PB (${pbGhost.wpm} WPM)`;
        ghostTimeline = pbGhost.samples.map(s => ({
          t: s.t,
          wpm: Math.round((s.chars / 5) / (Math.max(s.t, 1000) / 60000))
        }));
        const ghostTotalTime = pbGhost.samples[pbGhost.samples.length - 1]?.t || finishDurationMs;
        ghostDeltaS = (ghostTotalTime - finishDurationMs) / 1000;
      } else {
        const targetWpm = game.ghostMode === 'target' ? game.ghostTargetWpm : (pbGhost ? pbGhost.wpm : 60);
        ghostLabel = `${targetWpm} WPM BOT`;
        ghostTimeline = [
          { t: 0, wpm: targetWpm },
          { t: Math.floor(finishDurationMs / 2), wpm: targetWpm },
          { t: finishDurationMs, wpm: targetWpm },
        ];
        const botExpectedMs = (typing.targetText.length / ((targetWpm * 5) / 60)) * 1000;
        ghostDeltaS = (botExpectedMs - finishDurationMs) / 1000;
      }
    }

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
      onReset: handleReset,
      onWatchReplay: handleWatchReplay,
      onStartMicroDrill: startMicroDrill,
      onStartSmartDrill: startSmartDrill,
      isSmartDrillGenerating,
      ghostTimeline,
      ghostLabel,
      ghostDeltaS,
    };

    if (raceActive) {
      return (
        <ErrorBoundary onReset={handleReset}>
          <RaceResultsScreen
            {...resultsProps}
            players={race.players}
            selfId={race.selfId ?? ''}
            timelines={undefined}
            isRanked={isRankedMatch}
            supabase={supabase}
            raceId={race.raceId}
            isHost={race.isHost}
            chatMessages={race.chatMessages}
            onSendMessage={(msg) => race.sendChatMessage(msg, cloud.username || 'Typist')}
            onRematch={handleRematchRace}
            onReturnToRoom={handleReturnToRoom}
            onLeaveRace={handleLeaveRace}
            onUpdateElo={cloud.setElo}
          />
          {activeModal === 'replay' && (
            <ReplayModal
              targetText={typing.targetText}
              log={typing.keystrokeLog.current}
              theme={theme}
              onClose={handleCloseModal}
            />
          )}
        </ErrorBoundary>
      );
    }

    return (
      <ErrorBoundary onReset={handleReset}>
        {game.microDrillActive ? (
          <AIDrillResultsScreen
            wpm={typing.wpm}
            accuracy={typing.accuracy}
            theme={theme}
            smartDrillKeys={smartDrillKeys}
            isGenerating={isSmartDrillGenerating}
            onGenerateAnother={startSmartDrill}
            onRetry={handleRetryDrill}
            onExit={exitMicroDrill}
          />
        ) : (
          <ResultsScreen {...resultsProps} />
        )}
        {activeModal === 'replay' && (
          <ReplayModal
            targetText={typing.targetText}
            log={typing.keystrokeLog.current}
            theme={theme}
            onClose={handleCloseModal}
          />
        )}
      </ErrorBoundary>
    );
  }

  return (
    <>
      <TypingController
        typing={typing}
        audio={audio}
        rpg={rpg}
        particles={particles}
        gameConfig={game.configRef.current}
        gameActions={game}
        activeModal={activeModal}
        raceActive={raceActive}
        theme={theme}
        tetrisEffect={tetrisEffect}
        onUnlockGodMode={handleUnlockGodMode}
        onReset={handleReset}
        onExitMicroDrill={exitMicroDrill}
      />
      <div
        className={`min-h-screen theme-transition transition-colors duration-700 ${theme.bg} font-mono selection:bg-transparent outline-none flex flex-col items-center relative overflow-x-hidden`}
        style={{
          backgroundColor:
            theme.name === 'nebula'
              ? '#050811'
              : theme.name === 'matrix'
              ? '#001100'
              : theme.name === 'cyberpunk'
              ? '#110011'
              : theme.name === 'sunset'
              ? '#1a0a00'
              : theme.name === 'monochrome'
              ? '#0a0a0a'
              : theme.name === 'nord'
              ? '#1e222a'
              : theme.name === 'vaporwave'
              ? '#0a001a'
              : theme.name === 'dracula'
              ? '#1a0a1a'
              : theme.name === 'galaxy'
              ? '#050014'
              : '#080809',
        }}
      >
        <AnimatePresence>
          {themeIndex === -1 && wallpaperUrl ? (
            <motion.div 
              key="custom-bg"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: "easeInOut" }}
              className="fixed inset-0 z-0 bg-cover bg-center pointer-events-none transform-gpu will-change-[filter] [contain:strict]" 
              style={{ 
                backgroundImage: `url(${wallpaperUrl})`,
                filter: typing.phase === 'TYPING' 
                  ? `brightness(${Math.min(brightness, 0.45)}) blur(${Math.max(blur, 4)}px)` 
                  : `brightness(${brightness}) blur(${blur}px)`,
                transition: 'filter 0.4s ease-out'
              }} 
            />
          ) : (
            <motion.div
              key="shader-bg"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: "easeInOut" }}
              className="fixed inset-0 z-0 pointer-events-none"
            >
              <CosmicLiquidShader theme={theme} isPaused={Boolean(activeModal)} />
            </motion.div>
          )}
        </AnimatePresence>

        <CosmicNavBar
          theme={theme}
          username={cloud.username}
          userLevel={rpg.userLevel}
          currentLevelProgress={rpg.currentLevelProgress}
          xpNeeded={rpg.xpNeeded}
          xp={rpg.xp}
          activeTitle={activeTitle}
          dailyStreak={dailyStreak}
          isLoggedIn={isLoggedIn}
          unlockedAchievements={rpg.unlockedAchievements}
          onOpenProfile={handleOpenProfile}
          onOpenAcademy={enterAcademy}
          onOpenPractice={() => {
            setCurrentStage('practice');
          }}
          onOpenTrophies={() => isLoggedIn ? setShowTrophyRoom(true) : toast.error("Sign in to unlock Trophies!", { icon: <Lock size={14} /> })}
          onOpenStats={() => isLoggedIn ? setShowStatsDashboard(true) : toast.error("Sign in to view Stats!", { icon: <Lock size={14} /> })}
          onOpenRace={() => {
            if (race.status === 'idle') {
              race.createRoom(cloud.username || 'Player', race.roomSize || 4, undefined, cloud.elo, undefined, auth.user?.id);
            }
            setRaceActive(true);
            setCurrentStage('compete');
          }}
          onOpenSocial={() => isLoggedIn ? setShowSocialModal(true) : toast.error("Sign in to view Community!", { icon: <Lock size={14} /> })}
          onOpenComms={() => isLoggedIn ? setShowCommsModal(true) : toast.error("Sign in to use Comms!", { icon: <Lock size={14} /> })}
          onOpenSettings={() => setShowSettingsModal(true)}
          onOpenDailyQuests={() => setShowDailyQuestsModal(true)}
          activePage={currentStage}
        />

        {/* Noise texture overlay removed to fix GPU rendering white screen bug */}

        {/* Background is handled cleanly by CosmicLiquidShader */}
        <div className="absolute inset-0 z-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>

        {/* Progress Bar — char-based for word tests, clock-based for timed */}
        {typing.phase === 'TYPING' && game.testMode === 'time' && typing.startTime ? (
          <TimedHud startTime={typing.startTime} duration={game.duration} theme={theme} />
        ) : (
          <div className="fixed top-0 left-0 h-1 bg-zinc-900 w-full z-[150]">
            <div className={`h-full ${theme.solid} transition-all duration-200 ease-out ${theme.glow}`} style={{ width: `${progressPercent}%` }} />
          </div>
        )}

        {/* Zen Mode Ambient */}
        {game.zenMode && (
          <div className="fixed inset-0 flex items-center justify-center pointer-events-none opacity-20 z-0 animate-in fade-in zoom-in duration-1000 ease-out">
            <div className={`w-[80vw] h-[80vw] ${theme.solid} rounded-full blur-[250px] animate-pulse`} style={{ animationDuration: '6s' }} />
          </div>
        )}

        {/* ═══ MAIN CONTENT ═══ */}
        <AnimatePresence mode="wait" custom={stageDirection}>
          {currentStage === 'academy' ? (
            <motion.div
              key="academy"
              custom={stageDirection}
              variants={STAGE_PAGE_VARIANTS}
              initial="initial"
              animate="animate"
              exit="exit"
              className="relative w-full px-2 md:px-6 pt-20 md:pt-24 pb-12 flex flex-col items-center z-10 max-w-[1720px] mx-auto transform-gpu will-change-transform"
            >
              <AcademyLayout onExit={exitAcademy} theme={theme} />
            </motion.div>
          ) : currentStage === 'compete' && !raceActive ? (
            <motion.div
              key="compete-lobby"
              custom={stageDirection}
              variants={STAGE_PAGE_VARIANTS}
              initial="initial"
              animate="animate"
              exit="exit"
              className="relative w-full px-2 md:px-6 pt-20 md:pt-22 pb-6 flex flex-col items-center z-10 max-w-[1600px] mx-auto transform-gpu will-change-transform"
            >
              <LobbyScreen
                code={race.code}
                players={race.players}
                roomSize={race.roomSize}
                selfId={race.selfId ?? ''}
                isHost={race.isHost}
                lobbyConfig={race.lobbyConfig}
                updateLobbyConfig={race.updateLobbyConfig}
                updateRoomSize={race.updateRoomSize}
                chatMessages={race.chatMessages}
                sendChatMessage={race.sendChatMessage}
                onStart={() => {
                  if (!race.lobbyConfig) {
                    handleRaceStart(generateText('ADEPT', 25));
                    return;
                  }
                  const text = generateText(race.lobbyConfig.mode, race.lobbyConfig.words, '', false, { codeLanguage: race.lobbyConfig.language });
                  handleRaceStart(text);
                }}
                onLeave={handleRaceLeave}
                theme={theme}
                themeTextClass={theme.text}
                isJoining={race.status === 'joining'}
              />
            </motion.div>
          ) : (
            <motion.div 
              key="practice"
              custom={stageDirection}
              variants={STAGE_PAGE_VARIANTS}
              initial="initial"
              animate="animate"
              exit="exit"
              className={`relative w-full px-2 md:px-6 pt-20 md:pt-24 pb-8 flex flex-col z-10 transition-[max-width] duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] transform-gpu will-change-transform ${shouldHideClutter ? 'max-w-[95vw]' : 'max-w-[1600px]'}`}
            >
              <main className={`relative z-10 flex flex-col lg:flex-row items-start gap-8 w-full transition-[margin,padding] duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${shouldHideClutter ? 'justify-center items-center mt-0' : 'mt-4 pb-20'}`}>
                <div className="w-full flex flex-col lg:flex-row items-start gap-8">
                  <PracticeArena
                    game={game}
                    typing={typing}
                    particles={particles}
                    theme={theme}
                    shouldHideClutter={shouldHideClutter}
                    levelOptions={levelOptions}
                    lengthLocked={lengthLocked}
                    mutatable={mutatable}
                    pbGhost={pbGhost}
                    otherRacePlayers={otherRacePlayers ?? []}
                    handleChangeLevel={(val) => handleChangeLevel(val as Level)}
                    handleLockedLevelClick={handleLockedLevelClick}
                    handleChangeCountOrDuration={(val) => handleChangeCountOrDuration(Number(val))}
                    handleChangeCodeLanguage={(val) => handleChangeCodeLanguage(val as CodeLanguage)}
                    onSetCustomTargetText={(text) => typing.setTargetText(text)}
                    onOpenGhostModal={() => setShowGhostModal(true)}
                    onReset={() => handleReset()}
                  />

                  <LeaderboardSidebar
                    leaderboardClass={leaderboardClass}
                    theme={theme}
                    boardTab={boardTab}
                    isLoggedIn={isLoggedIn}
                    leaderboard={leaderboard}
                    dailyBoard={dailyBoard}
                    friendsBoard={friendsBoard}
                    currentUsername={cloud.username}
                    onTabChange={(tab) => {
                      setBoardTab(tab);
                      if (tab === 'today') fetchDailyBoard();
                    }}
                    onProfileClick={(uname) => {
                      setSelectedProfileUsername(uname);
                      setShowProfile(true);
                    }}
                    onChallengeFriend={(_uname) => {
                      race.createRoom(cloud.username || 'Player', 2, undefined, cloud.elo, undefined, auth.user?.id);
                      setRaceActive(true);
                      setShowRace(true);
                    }}
                    onRemoveFriend={(uname) => friendsState.removeFriend(uname)}
                  />
                </div>
              </main>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating Bottom Controls */}
        <BottomControlsDock
          shouldHideClutter={shouldHideClutter || isAcademyMode}
          theme={theme}
          activeModal={activeModal}
          isAruOpen={isAruOpen}
          onToggleAru={() => setIsAruOpen(!isAruOpen)}
          onOpenSettings={() => setShowSettingsModal(true)}
          onOpenChangelog={() => setShowChangelog(true)}
          latestVersion={CHANGELOG[0].version}
          cloud={cloud}
          auth={auth}
          onSignIn={handleSignIn}
          onSignOut={handleSignOut}
        />

        {/* Consolidated Modals & Overlays */}
        <AppModalManager
          activeModal={activeModal}
          theme={theme}
          themeIndex={themeIndex}
          soundProfile={soundProfile}
          themeFont={themeFont}
          wallpaperUrl={wallpaperUrl}
          wallpaperTheme={wallpaperTheme}
          brightness={brightness}
          setBrightness={setBrightness}
          blur={blur}
          setBlur={setBlur}
          customAccent={customAccent}
          setCustomAccent={setCustomAccent}
          selectCuratedWallpaper={selectCuratedWallpaper}
          handleFileUpload={handleFileUpload}
          clearWallpaper={clearWallpaper}
          isLoggedIn={isLoggedIn}
          cloud={cloud}
          supabase={supabase}
          auth={auth}
          game={game}
          typing={typing}
          rpg={rpg}
          quests={quests}
          race={race}
          friendsState={friendsState}
          challenges={challenges}
          dailyStreak={dailyStreak}
          pbGhost={pbGhost}
          initialRaceCode={initialRaceCode}
          isRankedMatch={isRankedMatch}
          selectedProfileUsername={selectedProfileUsername}
          tetrisEffect={tetrisEffect}
          isAruOpen={isAruOpen}
          shouldHideClutter={shouldHideClutter}
          nameInput={nameInput}
          nameErr={nameErr}
          savingName={savingName}
          localRPGStatsMemo={localRPGStatsMemo}
          aruStats={aruStats}
          techAiState={techAiState}
          techModifiersMemo={techModifiersMemo}
          techCapabilities={techCapabilities}
          onCloseModal={handleCloseModal}
          onSelectTheme={selectTheme}
          onSelectSoundProfile={selectSoundProfile}
          onSetThemeFont={handleSetThemeFont}
          onStartWeaknessDrill={handleStartWeaknessDrill}
          onChallengeFriend={handleChallengeFriend}
          onOpenProfile={handleOpenProfile}
          onCloseProfile={handleProfileClose}
          onRaceCreate={handleRaceCreate}
          onRaceJoin={handleRaceJoin}
          onRaceStart={handleRaceStart}
          onRaceLeave={handleRaceLeave}
          onSetTetrisEffect={setTetrisEffect}
          onToggleAru={() => setIsAruOpen(!isAruOpen)}
          onCloseAru={handleCloseAru}
          onStartSmartDrill={startSmartDrill}
          onSetNameInput={setNameInput}
          onSetNameErr={setNameErr}
          onSubmitUsername={submitUsername}
        />
      </div>
    </>
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