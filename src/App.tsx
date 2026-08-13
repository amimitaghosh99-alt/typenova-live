 
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-hooks/purity */
/* eslint-disable no-empty */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Keyboard, Activity, Target, RotateCcw, Skull, Ghost,
  Focus, Brain, Palette,
  Award, FlipHorizontal, CloudFog, Magnet, Timer,
  X, Code, Star, Trophy, Terminal, Zap, Lock, Users,
  Rocket, Crosshair, Shield, EyeOff, Gauge, Flame, Crown,
  Swords, Sword, Sparkles, Orbit, Unlock,
  Hash, Clock, BarChart2, CalendarCheck, Hourglass, ChevronRight, MessageSquare, Settings, Bot
} from 'lucide-react';
// Note: Swords is used both for the ACHIEVEMENT_ICONS map and the race button.
import type { LucideIcon } from 'lucide-react';

import {
  THEMES, THEME_KEYS, ACHIEVEMENTS,
  NOVICE_SENTENCES, ADEPT_SENTENCES,
  CODE_LANGUAGES, type CodeLanguage,
  generateText
} from '@/data/constants';
import type { Level, Theme } from '@/data/constants';
import { useAudioEngine } from '@/hooks/useAudioEngine';
import { useGlassPointer } from '@/hooks/useGlassPointer';
import { useTypingEngine } from '@/hooks/useTypingEngine';
import type { Keystroke } from '@/hooks/useTypingEngine';
import { useRPGSystem } from '@/hooks/useRPGSystem';
import { useParticles } from '@/hooks/useParticles';
import { useQuests } from '@/hooks/useQuests';
import { useGameConfig } from '@/hooks/useGameConfig';
import { TypingController } from '@/components/TypingController';

import { TypingArea } from '@/components/TypingArea';
import type { PaceSample } from '@/components/TypingArea';
import { StatsPanel } from '@/components/StatsPanel';
import { ResultsScreen } from '@/components/ResultsScreen';
import { RaceResultsScreen } from '@/components/RaceResultsScreen';
import { AIDrillResultsScreen } from '@/components/AIDrillResultsScreen';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { StatsDashboard, appendHistory, loadHistory } from '@/components/StatsDashboard';
import type { HistoryEntry } from '@/components/StatsDashboard';
import { ReplayModal } from '@/components/ReplayModal';
import { SegmentedControl } from '@/components/SegmentedControl';
import { RaceModal } from '@/components/RaceModal';
import { SocialModal } from '@/components/SocialModal';
import { DailyQuestsPanel } from '@/components/DailyQuestsPanel';
import { CommsModal } from '@/components/CommsModal';
import { PlayerProfileModal } from '@/components/PlayerProfileModal';
import { TITLE_BADGES, getActiveTitleId } from '@/data/titles';
import { useChallenges } from '@/hooks/useChallenges';
import { useRace, makeRoomCode } from '@/hooks/useRace';
import { mulberry32, daySeed, todayKey, isYesterday } from '@/utils/seededRandom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useCloudSync } from '@/hooks/useCloudSync';
import { useFriends } from '@/hooks/useFriends';
import { TypeNovaLogo } from '@/components/TypeNovaLogo';
import { AccountMenu } from '@/components/AccountMenu';
import { Routes, Route, Navigate } from 'react-router';
import { Login } from '@/pages/Login';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';
import { ChangelogModal } from '@/components/ChangelogModal';
import { CHANGELOG } from '@/data/changelog';
import { SettingsModal } from './components/SettingsModal';
import { BugReportsModal } from './components/BugReportsModal';

import { AcademyEntry } from '@/components/academy/AcademyEntry';
import { AcademyLayout } from '@/components/academy/AcademyLayout';
import { useSmartDrills } from '@/hooks/useSmartDrills';
import { AIChatBot } from '@/components/AIChatBot';
import { AI_KEYS } from '@/lib/aiClient';
import { StarfieldBackground } from '@/components/ui/starfield-background';
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

const TIME_OPTIONS = [15, 30, 60].map(v => ({ label: String(v), value: v }));
const WORD_OPTIONS = [10, 25, 50, 100].map(v => ({ label: String(v), value: v }));
const CODE_LANGUAGE_OPTIONS = CODE_LANGUAGES.map(lang => ({ label: lang.toUpperCase(), value: lang }));

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
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[150] px-5 py-1.5 rounded-full bg-zinc-950/90 border border-white/10 pointer-events-none">
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

  const techCapabilities = useMemo(() => ({
    openTab: (tabId: string) => {
      setActiveModal('settings');
      setTimeout(() => window.dispatchEvent(new CustomEvent('open_settings_tab', { detail: tabId })), 50);
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
  const [isCrossfading, setIsCrossfading] = useState(false);
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

  type ModalType = 'trophy' | 'godMode' | 'expandedGraph' | 'stats' | 'replay' | 'race' | 'profile' | 'social' | 'comms' | 'quests' | 'settings' | 'changelog' | 'theme' | 'sound' | 'bugReports' | null;
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const showReplay = activeModal === 'replay';

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

  const [tetrisEffect, setTetrisEffect] = useState(false);
  const [raceActive, setRaceActive] = useState(false);
  const [isRankedMatch, setIsRankedMatch] = useState(false);
  const { generateDrill, isGenerating: isSmartDrillGenerating } = useSmartDrills();
  const [isAcademyMode, setIsAcademyMode] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const enterAcademy = useCallback(() => {
    if (isTransitioning || isAcademyMode) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setIsAcademyMode(true);
      setIsTransitioning(false);
    }, 700);
  }, [isTransitioning, isAcademyMode]);
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
  const quests = useQuests((gained) => rpg.setXp((prev: number) => prev + gained));
  const particles = useParticles();
  useGlassPointer();

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
      setShowRace(true);
      typing.setPhase('CONFIGURING');
    }
  }, [race.status, raceActive, typing.setPhase]);

  const safeThemeKey = THEME_KEYS[themeIndex] || THEME_KEYS[0];
  const theme: Theme = THEMES[safeThemeKey] || THEMES[THEME_KEYS[0]];
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
    setIsCrossfading(true);
    if (resetTimeoutRef.current) clearTimeout(resetTimeoutRef.current);

    resetTimeoutRef.current = setTimeout(() => {
      typing.resetEngine();
      typing.setTargetText(generateText(nextLevel, length, nextCustom, nextMirror, {
        numbers: nextNumbers,
        punctuation: nextPunct,
        codeLanguage: nextCodeLanguage,
        rng: nextDaily ? mulberry32(daySeed()) : undefined,
      }));
      setIsCrossfading(false);
    }, 300);

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
  const aruStats = useMemo(() => ({
    wpm: isFinished ? typing.wpm : 0,
    accuracy: isFinished ? typing.accuracy : 0,
    level: rpg.userLevel,
    testsCompleted: rpg.testsCompleted,
    streak: dailyStreak,
    weakKeys: aruWeakKeys,
  }), [isFinished, typing.wpm, typing.accuracy, rpg.userLevel, rpg.testsCompleted, dailyStreak, aruWeakKeys]);

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
        setTimeout(() => setSaveStatus('Auto-saving...'), 0);
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

  // IMPORTANT FIX: Removed hardcoded overflow-hidden and added it conditionally, and added z-[200]
  const topHudClass = `transition-all duration-1000 ease-[cubic-bezier(0.23,1,0.32,1)] origin-top flex flex-col md:flex-row justify-between items-center gap-6 relative z-[200] ${shouldHideClutter ? 'opacity-0 blur-2xl -translate-y-12 max-h-0 pointer-events-none !mb-0 overflow-hidden' : 'opacity-100 blur-none translate-y-0 max-h-none mb-8 overflow-visible'
    }`;

  const leaderboardClass = `transition-all duration-1000 ease-[cubic-bezier(0.23,1,0.32,1)] shrink-0 glass-panel rounded-[2rem] overflow-hidden ${shouldHideClutter ? 'w-0 opacity-0 blur-2xl translate-x-32 pointer-events-none p-0 border-transparent m-0' : 'w-full xl:w-[400px] p-8 opacity-100 blur-none translate-x-0'
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
    setActiveModal(null);
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
    setIsAcademyMode(false);
  }, []);

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
  const handleRematchRace = useCallback(() => race.rematch(), [race]);
  const handleLeaveRace = useCallback(() => {
    race.leave();
    setRaceActive(false);
    setIsRankedMatch(false);
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

  // ─── Render ──────────────────────────────────────────────────────

  // Academy Mode — full-screen takeover
  if (isAcademyMode) {
    return (
      <AcademyLayout
        onExit={exitAcademy}
      />
    );
  }

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
      onReset: handleReset,
      onWatchReplay: handleWatchReplay,
      onStartMicroDrill: startMicroDrill,
      onStartSmartDrill: startSmartDrill,
      isSmartDrillGenerating,
    };

    if (raceActive) {
      return (
        <ErrorBoundary onReset={handleReset}>
          <RaceResultsScreen
            {...resultsProps}
            players={race.players}
            selfId={race.selfId ?? ''}
            roomSize={race.roomSize}
            timelines={undefined}
            isRanked={isRankedMatch}
            supabase={supabase}
            raceId={race.raceId}
            isHost={race.isHost}
            onRematch={handleRematchRace}
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
      <div className={`min-h-screen theme-transition transition-colors duration-700 ${theme.bg} font-mono selection:bg-transparent outline-none flex flex-col items-center relative overflow-x-hidden`}>
        {theme.name === 'starfield' && (
          <div className="fixed inset-0 z-0 pointer-events-none">
            <StarfieldBackground starCount={1000} speedFactor={0.04} />
          </div>
        )}

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


        {/* ═══ ACADEMY PORTAL TRANSITION ═══ */}
        {isTransitioning && (
          <div className="fixed inset-0 z-[100] pointer-events-none flex items-center justify-center">
            <div className="w-8 h-8 rounded-full bg-amber-950/90 backdrop-blur-3xl academy-portal-circle" />
          </div>
        )}

        {/* ═══ ANIMATED DUAL-COLOR CONTRAST ORBS ═══ */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0 mix-blend-screen opacity-80">
          {/* PRIMARY vivid orb — top-left, large */}
          <div
            className="absolute rounded-full blur-[80px] orb-drift-1"
            style={{
              width: '50vw', height: '50vw', top: '-20%', left: '-15%',
              background: `radial-gradient(circle, rgba(${theme.glowPrimary},0.55) 0%, rgba(${theme.glowPrimary},0.15) 50%, transparent 70%)`,
              willChange: 'transform',
              contain: 'strict',
            }}
          />
          {/* SECONDARY contrast orb — right side, large */}
          <div
            className="absolute rounded-full blur-[90px] orb-drift-2"
            style={{
              width: '55vw', height: '55vw', top: '20%', right: '-20%',
              background: `radial-gradient(circle, rgba(${theme.glowSecondary},0.50) 0%, rgba(${theme.glowSecondary},0.12) 50%, transparent 70%)`,
              willChange: 'transform',
              contain: 'strict',
            }}
          />
          {/* PRIMARY accent — bottom, medium */}
          <div
            className="absolute rounded-full blur-[70px] orb-drift-3"
            style={{
              width: '40vw', height: '40vw', bottom: '-15%', left: '25%',
              background: `radial-gradient(circle, rgba(${theme.glowPrimary},0.40) 0%, rgba(${theme.glowPrimary},0.08) 50%, transparent 70%)`,
              willChange: 'transform',
              contain: 'strict',
            }}
          />
          {/* SECONDARY small vivid — center area */}
          <div
            className="absolute rounded-full blur-[50px] orb-drift-4"
            style={{
              width: '30vw', height: '30vw', top: '45%', left: '35%',
              background: `radial-gradient(circle, rgba(${theme.glowSecondary},0.45) 0%, rgba(${theme.glowSecondary},0.10) 50%, transparent 70%)`,
              willChange: 'transform',
              contain: 'strict',
            }}
          />
          {/* Mixed glow — top-right sweep */}
          <div
            className="absolute rounded-full blur-[100px] orb-drift-5"
            style={{
              width: '50vw', height: '50vw', top: '-25%', right: '5%',
              background: `radial-gradient(circle, rgba(${theme.glowPrimary},0.35) 0%, rgba(${theme.glowSecondary},0.20) 40%, transparent 65%)`,
              willChange: 'transform',
              contain: 'strict',
            }}
          />
        </div>
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

        {/* ═══ OVERLAY MODALS ═══ */}
        {/* Ready Modal */}
        {typing.phase === 'READY' && (
          <div key="ready-modal" className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="bg-zinc-950 border border-zinc-800 rounded-[2.5rem] p-10 shadow-2xl flex flex-col gap-6 w-full max-w-md lucid-scale" style={{ '--delay': '0ms' } as React.CSSProperties}>
              <div className="flex justify-center mb-2"><Keyboard className={theme.text} size={48} /></div>
              <div className="flex justify-between items-center bg-zinc-900 p-5 rounded-2xl border border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer" onClick={() => { typing.setPhase('COUNTDOWN'); typing.setCountdownTimer(5); }}>
                <span className="text-white font-black tracking-widest text-sm">NORMAL MODE</span>
                <span className="px-4 py-2 bg-zinc-800 rounded-lg text-xs font-black text-zinc-400 shadow-inner">ENTER</span>
              </div>
              <div className="flex justify-between items-center bg-zinc-900 p-5 rounded-2xl border border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer" onClick={() => { game.setZenMode(true); typing.setPhase('COUNTDOWN'); typing.setCountdownTimer(5); }}>
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
            {/* Logo & Academy Button (Left) */}
            <div className="flex flex-wrap items-center gap-4 sm:gap-6 w-full xl:w-auto justify-center xl:justify-start">
              <div className="flex items-center">
                <TypeNovaLogo size="md" />
              </div>
              
              {!isAcademyMode && (
                <AcademyEntry onClick={enterAcademy} />
              )}
            </div>

            {/* HUD Controls & Actions (Right) */}
            <div className="flex flex-wrap justify-center xl:justify-end items-center gap-4 text-zinc-400 w-full xl:w-auto pb-2 xl:pb-0">


              {/* Profile & Actions */}
              <div className="flex items-center glass-panel p-1.5 rounded-2xl font-mono shrink-0">
                <button
                  onClick={() => cloud.username && handleOpenProfile(cloud.username)}
                  className="group flex items-center px-3.5 py-2 bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 hover:border-white/20 rounded-xl transition-all cursor-pointer text-left gap-3.5 hover:shadow-[0_0_15px_rgba(255,255,255,0.05)] active:scale-[0.98]"
                  title="View / Edit your Player Profile"
                >
                  {/* User Avatar */}
                  <div className="relative hidden sm:block shrink-0">
                    <div className={`w-10 h-10 rounded-full bg-black/20 border flex items-center justify-center font-bold uppercase text-sm ${theme.borderHalf} ${theme.vividText}`}>
                      {(cloud.username || 'G').substring(0, 1)}
                    </div>
                    {showReplay && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-slate-950 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
                    )}
                  </div>

                  <div className="flex flex-col">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[13px] font-black uppercase tracking-widest text-white">
                        {cloud.username || 'GUEST'} <span className="text-zinc-500 font-bold ml-1.5 text-[10px]">LVL {rpg.userLevel}</span>
                      </span>
                      {(() => {
                        const activeId = activeTitle;
                        const badge = TITLE_BADGES.find(b => b.id === activeId);
                        return badge ? (
                          <span className={`text-[9px] px-2 py-0.5 rounded border font-mono tracking-wider ${badge.color}`} title={badge.description}>
                            {badge.icon} {badge.name}
                          </span>
                        ) : null;
                      })()}
                    </div>
                    <div className="flex items-center gap-2.5">
                      <div className="w-36 h-2 bg-zinc-800 rounded-full overflow-hidden border border-zinc-800/50">
                        <div className={`h-full ${theme.solid} transition-all duration-500`} style={{ width: `${(rpg.currentLevelProgress / rpg.xpNeeded) * 100}%` }} />
                      </div>
                      <span className="text-[9px] font-mono text-zinc-500 w-12 leading-none">{rpg.xp} XP</span>
                    </div>
                  </div>

                  <ChevronRight size={16} className="text-zinc-600 group-hover:text-white group-hover:translate-x-0.5 transition-all ml-1" />
                </button>

                <button
                  onClick={() => setShowDailyQuestsModal(true)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-400 hover:bg-orange-500/20 text-xs font-mono font-bold transition-all ml-1 shadow-[0_0_10px_rgba(249,115,22,0.15)] hover:scale-105"
                  title="View Daily Quests & Streak Multipliers"
                >
                  <Flame size={13} className="text-orange-400 animate-pulse" />
                  <span>{dailyStreak}d</span>
                </button>

                <div className="w-px h-6 bg-zinc-800/50 mx-2"></div>

                <button
                  onClick={() => isLoggedIn ? setShowTrophyRoom(true) : toast.error("Sign in to unlock Trophies!", { icon: <Lock size={14} /> })}
                  className={`p-2 rounded-xl bg-black/20 border transition-all ml-1 ${!isLoggedIn ? 'border-white/5 text-zinc-600 hover:text-zinc-400'
                      : rpg.unlockedAchievements.length > 0 ? `${theme.borderHalf} ${theme.vividText} ${theme.glow} ${theme.bgHover}`
                        : 'border-white/10 text-zinc-500 hover:text-white'
                    }`}
                  title={isLoggedIn ? "View Trophies" : "Sign in to unlock Trophies"}
                >
                  {isLoggedIn ? <Trophy size={16} /> : <Lock size={16} />}
                </button>

                <button
                  onClick={() => isLoggedIn ? setShowStatsDashboard(true) : toast.error("Sign in to unlock detailed Stats!", { icon: <Lock size={14} /> })}
                  className={`p-2 rounded-xl bg-black/20 border transition-all ml-1 ${!isLoggedIn ? 'border-white/5 text-zinc-600 hover:text-zinc-400'
                      : 'border-white/10 text-zinc-500 hover:text-white'
                    }`}
                  title={isLoggedIn ? "Your Stats" : "Sign in to unlock Stats"}
                >
                  {isLoggedIn ? <BarChart2 size={16} /> : <Lock size={16} />}
                </button>

                <button
                  onClick={() => isLoggedIn ? setShowRace(true) : toast.error("Sign in to race with friends!", { icon: <Lock size={14} /> })}
                  className={`p-2 rounded-xl bg-black/20 border transition-all ml-1 ${!isLoggedIn ? 'border-white/5 text-zinc-600 hover:text-zinc-400'
                      : 'border-white/10 text-zinc-500 hover:text-white'
                    }`}
                  title={isLoggedIn ? "Race a friend" : "Sign in to race with friends"}
                >
                  {isLoggedIn ? <Swords size={16} /> : <Lock size={16} />}
                </button>

                <button
                  onClick={() => isLoggedIn ? setShowSocialModal(true) : toast.error("Sign in to manage friends!", { icon: <Lock size={14} /> })}
                  className={`p-2 rounded-xl bg-black/20 border transition-all ml-1 ${!isLoggedIn ? 'border-white/5 text-zinc-600 hover:text-zinc-400'
                      : (friendsState.incomingRequests.length > 0) ? `${theme.borderHalf} text-emerald-400 ${theme.glow} ${theme.bgHover}`
                        : 'border-white/10 text-zinc-500 hover:text-white'
                    }`}
                  title={isLoggedIn ? "Manage Friends" : "Sign in to manage friends"}
                >
                  {isLoggedIn ? <Users size={16} /> : <Lock size={16} />}
                </button>

                <button
                  onClick={() => isLoggedIn ? setShowCommsModal(true) : toast.error("Sign in to use Comms!", { icon: <Lock size={14} /> })}
                  className={`p-2 rounded-xl bg-black/20 border transition-all ml-1 ${!isLoggedIn ? 'border-white/5 text-zinc-600 hover:text-zinc-400'
                      : 'border-white/10 text-zinc-500 hover:text-white'
                    }`}
                  title={isLoggedIn ? "Communications Terminal" : "Sign in to use Comms"}
                >
                  {isLoggedIn ? <MessageSquare size={16} /> : <Lock size={16} />}
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
          </header>

          <main className={`relative z-10 flex flex-col xl:flex-row gap-8 w-full transition-all duration-1000 ease-[cubic-bezier(0.23,1,0.32,1)] ${shouldHideClutter ? 'justify-center items-center mt-0' : 'mt-4 pb-20'}`}>
            <div className="flex-1 w-full flex flex-col gap-6">

              {/* Difficulty & Length/Time & Daily */}
              <div className={`flex flex-col md:flex-row flex-wrap gap-8 items-start transition-all duration-1000 ${shouldHideClutter ? 'hidden opacity-0' : 'flex opacity-100'}`}>
                <div className={`flex flex-col gap-2 transition-opacity ${game.dailyActive ? 'opacity-30' : 'opacity-100'}`}>
                  <span className="text-[9px] font-black tracking-widest uppercase text-zinc-400 flex items-center ml-2"><Target size={10} className="mr-1.5" /> DIFFICULTY</span>
                  <div className="flex glass-panel rounded-full">
                    <SegmentedControl
                      options={levelOptions}
                      value={game.level}
                      onChange={handleChangeLevel}
                      onLockedClick={handleLockedLevelClick}
                      themeTextClass={theme.text}
                    />
                  </div>
                </div>

                <div className={`flex flex-col gap-2 transition-opacity ${lengthLocked || game.dailyActive ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
                  <span className="text-[9px] font-black tracking-widest uppercase text-zinc-400 flex items-center ml-2">
                    {game.testMode === 'time' ? <Clock size={10} className="mr-1.5" /> : <Activity size={10} className="mr-1.5" />}
                    {game.testMode === 'time' ? 'SECONDS' : 'WORDS'}
                  </span>
                  <div className="flex glass-panel p-1.5 rounded-full items-center">
                    {/* words / time segment */}
                    <button
                      onClick={() => game.changeTestMode('words')}
                      disabled={lengthLocked}
                      className={`p-2.5 rounded-full transition-all ${game.testMode === 'words' ? `bg-white/10 ${theme.text}` : 'text-zinc-500 hover:text-white'}`}
                      title="Word-count mode"
                    ><Hash size={13} /></button>
                    <button
                      onClick={() => game.changeTestMode('time')}
                      disabled={lengthLocked}
                      className={`p-2.5 rounded-full transition-all ${game.testMode === 'time' ? `bg-white/10 ${theme.text}` : 'text-zinc-500 hover:text-white'}`}
                      title="Timed mode"
                    ><Clock size={13} /></button>
                    <div className="w-px h-4 bg-white/10 mx-1.5"></div>
                    <SegmentedControl
                      options={game.testMode === 'time' ? TIME_OPTIONS : WORD_OPTIONS}
                      value={game.testMode === 'time' ? game.duration : game.wordCount}
                      onChange={handleChangeCountOrDuration}
                      disabled={lengthLocked}
                      themeTextClass={theme.text}
                      className="!p-0"
                    />
                    {mutatable && (
                      <>
                        <div className="w-px h-4 bg-white/10 mx-1.5"></div>
                        <button
                          onClick={game.toggleNumbers}
                          className={`px-2.5 py-2 rounded-full text-[10px] font-black tracking-widest transition-all ${game.withNumbers ? `bg-white/10 ${theme.text}` : 'text-zinc-500 hover:text-white'}`}
                          title="Mix in numbers"
                        >123</button>
                        <button
                          onClick={game.togglePunctuation}
                          className={`px-2.5 py-2 rounded-full text-[10px] font-black tracking-widest transition-all ${game.withPunctuation ? `bg-white/10 ${theme.text}` : 'text-zinc-500 hover:text-white'}`}
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
                      onClick={game.toggleDaily}
                      className={`px-4 md:px-6 py-2.5 rounded-full text-[11px] font-black tracking-widest transition-all flex items-center gap-2 ${game.dailyActive ? `bg-amber-500/20 text-amber-400 border border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.4)]` : 'text-amber-400/70 hover:text-amber-400 border border-transparent'}`}
                      title="Same seeded 50-word ADEPT text for everyone, every day"
                    >
                      <CalendarCheck size={12} /> DAILY
                    </button>
                  </div>
                </div>

                {/* Language Selector for Code Mode */}
                <div
                  className={`transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] grid ${game.level === 'CODE' ? 'grid-cols-[1fr] opacity-100 mr-0' : 'grid-cols-[0fr] opacity-0 -mr-8 pointer-events-none'
                    }`}
                >
                  <div className="overflow-hidden min-w-0">
                    <div className="flex flex-col gap-2 w-max">
                      <span className="text-[9px] font-black tracking-widest uppercase text-zinc-400 flex items-center ml-2">
                        <Code size={10} className="mr-1.5" /> LANGUAGE
                      </span>
                      <div className="flex glass-panel rounded-full">
                        <SegmentedControl
                          options={CODE_LANGUAGE_OPTIONS}
                          value={game.codeLanguage}
                          onChange={handleChangeCodeLanguage}
                          themeTextClass={theme.text}
                          pillClassName="bg-white/10 border border-white/10 shadow-[0_0_15px_rgba(255,255,255,0.2)]"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Custom Text Area */}
                <div
                  className={`transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] grid ${game.level === 'CUSTOM' ? 'grid-cols-[1fr] opacity-100 mr-0' : 'grid-cols-[0fr] opacity-0 -mr-8 pointer-events-none'
                    }`}
                >
                  <div className="overflow-hidden min-w-0">
                    <div className="flex flex-col gap-2 min-w-[300px] max-w-xl">
                      <span className="text-[9px] font-black tracking-widest uppercase text-zinc-400 flex items-center ml-2">
                        <Code size={10} className="mr-1.5" /> YOUR TEXT
                      </span>
                      <textarea
                        value={game.customText}
                        onChange={(e) => {
                          const newText = e.target.value;
                          game.setCustomText(newText);
                          if (game.level === 'CUSTOM') {
                            const final = game.mirroredMode
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
                  </div>
                </div>
              </div>

              {/* Stats HUD — hidden in zen mode */}
              {!game.zenMode && (
                <StatsPanel
                  wpm={typing.wpm}
                  accuracy={typing.accuracy}
                  consistency={typing.consistency}
                  combo={typing.combo}
                  themeText={theme.text}
                  timelinePoints={typing.timelinePoints}
                  keystrokeLogLength={typing.keystrokeLog.current.length}
                  isIdle={typing.phase === 'CONFIGURING'}
                />
              )}

              {/* Typing Area */}
              <div className="w-full relative flex flex-col items-center mb-12">
                {/* Mode toggles — bare icons in the open space above the card,
                  left-aligned to its edge. No surface of their own, so they
                  don't read as a second tile stacked on the card. */}
                {!shouldHideClutter && (
                  <div className={`w-full flex justify-start transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${isCrossfading ? 'opacity-0 -translate-y-3' : 'opacity-100 translate-y-0'}`}>
                    <div className="modifier-tab flex items-center gap-1 px-4 py-2 bg-zinc-900/40 border border-zinc-800/80 border-b-0 backdrop-blur-md rounded-t-2xl z-30 translate-y-[1px] text-zinc-500">
                      <button onClick={() => game.setSuddenDeath(!game.suddenDeath)} className={`p-2 rounded-lg transition-colors flex justify-center items-center ${game.suddenDeath ? 'bg-red-500/15 text-red-400' : 'hover:text-white hover:bg-white/[0.06]'}`} title="1HP: One mistake ends it"><Skull size={17} /></button>
                      <button onClick={() => game.setGhostPacer(!game.ghostPacer)} className={`p-2 rounded-lg transition-colors flex justify-center items-center ${game.ghostPacer ? `${theme.bgAlpha} ${theme.vividText}` : 'hover:text-white hover:bg-white/[0.06]'}`} title={pbGhost ? `Ghost: race your best (${pbGhost.wpm} WPM)` : 'Ghost: 60 WPM pace'}><Ghost size={17} /></button>
                      <button onClick={() => game.setFocusMode(!game.focusMode)} className={`p-2 rounded-lg transition-colors flex justify-center items-center ${game.focusMode ? `${theme.bgAlpha} ${theme.vividText}` : 'hover:text-white hover:bg-white/[0.06]'}`} title="Focus"><Focus size={17} /></button>
                      <button onClick={() => game.setBlindMode(!game.blindMode)} className={`p-2 rounded-lg transition-colors flex justify-center items-center ${game.blindMode ? `${theme.bgAlpha} ${theme.vividText}` : 'hover:text-white hover:bg-white/[0.06]'}`} title="Blind"><Brain size={17} /></button>
                      <button onClick={game.toggleMirror} className={`p-2 rounded-lg transition-colors flex justify-center items-center ${game.mirroredMode ? `${theme.bgAlpha} ${theme.vividText}` : 'hover:text-white hover:bg-white/[0.06]'}`} title="Mirror"><FlipHorizontal size={17} /></button>
                      <button onClick={() => game.setFogMode(!game.fogMode)} className={`p-2 rounded-lg transition-colors flex justify-center items-center ${game.fogMode ? `${theme.bgAlpha} ${theme.vividText}` : 'hover:text-white hover:bg-white/[0.06]'}`} title="Fog"><CloudFog size={17} /></button>
                      <button onClick={() => game.setStickyKeysMode(!game.stickyKeysMode)} className={`p-2 rounded-lg transition-colors flex justify-center items-center ${game.stickyKeysMode ? `${theme.bgAlpha} ${theme.vividText}` : 'hover:text-white hover:bg-white/[0.06]'}`} title="Sticky Keys"><Magnet size={17} /></button>
                      <button onClick={() => game.setOverclockedMode(!game.overclockedMode)} className={`p-2 rounded-lg transition-colors flex justify-center items-center ${game.overclockedMode ? 'bg-red-500/15 text-red-400' : 'hover:text-white hover:bg-white/[0.06]'}`} title="Overclocked"><Timer size={17} /></button>
                    </div>
                  </div>
                )}

                <TypingArea
                  targetText={typing.targetText}
                  input={typing.input}
                  phase={typing.phase}
                  theme={theme}
                  blindMode={game.blindMode}
                  focusMode={game.focusMode}
                  fogMode={game.fogMode}
                  startTime={typing.startTime}
                  shake={typing.shake}
                  capsLock={typing.capsLock}
                  stickyPenalty={game.stickyPenalty}
                  particles={particles.particles}
                  ghostPacer={game.ghostPacer}
                  combo={typing.combo}
                  zenMode={game.zenMode}
                  pbGhost={pbGhost}
                  isCodeMode={game.level === 'CODE'}
                  racePlayers={otherRacePlayers}
                  isCrossfading={isCrossfading}
                />

                {/* Attached Spacebar Prompt */}
                {typing.phase === 'CONFIGURING' && (
                  <div className={`absolute -bottom-6 left-1/2 -translate-x-1/2 z-[100] flex justify-center pointer-events-none transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${isCrossfading ? 'opacity-0 scale-95 translate-y-4' : 'opacity-100 scale-100 translate-y-0'}`}>
                    <button
                      onClick={() => { typing.setPhase('READY'); typing.setInput(''); }}
                      className={`px-8 py-3 bg-zinc-950/95 backdrop-blur-xl border ${theme.borderHalf} hover:${theme.border} rounded-full shadow-[0_10px_40px_rgba(0,0,0,0.6)] flex items-center gap-4 text-white cursor-pointer hover:bg-zinc-900 transition-all duration-300 hover:scale-105 active:scale-95 group pointer-events-auto`}
                    >
                      <span className="text-zinc-500 font-bold tracking-widest text-xs uppercase group-hover:text-zinc-300 transition-colors">PRESS</span>
                      <div className={`px-4 py-1.5 rounded-lg bg-zinc-800 font-black text-sm ${theme.text} ${theme.glow} group-hover:scale-110 transition-transform shadow-inner`}>SPACE</div>
                      <span className="text-zinc-500 font-bold tracking-widest text-xs uppercase group-hover:text-zinc-300 transition-colors">TO READY UP</span>
                    </button>
                  </div>
                )}
              </div>

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
                        <button
                          onClick={() => {
                            setSelectedProfileUsername(entry.username);
                            setShowProfile(true);
                          }}
                          className="font-black text-white hover:text-cyan-300 tracking-widest uppercase text-lg whitespace-nowrap hover:underline transition-colors text-left"
                          title={`View ${entry.username}'s Profile`}
                        >
                          {entry.username}
                        </button>
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
                              race.createRoom(cloud.username || 'Player', 2, undefined, cloud.elo, undefined, auth.user?.id);
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

        {/* Floating Bottom-Right Controls Pill */}
        {!shouldHideClutter && (
          <div className="fixed bottom-6 right-6 z-[500] animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
            <div className="flex items-center gap-1.5 glass-panel rounded-full p-1.5 shadow-[0_18px_45px_-12px_rgba(0,0,0,0.85)]">
              {/* Settings Button */}
              <button
                onClick={() => setShowSettingsModal(true)}
                className={`p-2.5 rounded-full ${activeModal === 'settings' ? 'bg-white/10 text-white' : 'hover:bg-white/[0.08] text-zinc-400 hover:text-white'} flex justify-center items-center transition-all`}
                title="Settings"
              >
                <Settings size={15} />
              </button>

              <div className="w-px h-5 bg-white/10 mx-0.5" />

              <button
                onClick={() => setIsAruOpen(!isAruOpen)}
                className={`relative flex items-center gap-2.5 px-5 py-2 rounded-full transition-all duration-500 group overflow-hidden ${
                  isAruOpen 
                    ? `bg-[rgba(${theme.glowPrimary},0.2)] border border-[rgba(${theme.glowPrimary},0.5)] shadow-[0_0_30px_rgba(${theme.glowPrimary},0.6)] scale-95` 
                    : 'bg-[#0f0e1a] border border-fuchsia-500/20 hover:border-transparent shadow-[0_0_20px_rgba(217,70,239,0.15)] hover:shadow-[0_0_40px_rgba(34,211,238,0.4)]'
                }`}
                title="Ask Aru — AI Typing Coach"
              >
                {/* Spinning Neon Gradient Border (Active on Hover) */}
                {!isAruOpen && (
                  <span className="absolute inset-[-1000%] animate-[spin_3s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,transparent_0%,#c084fc_33%,#22d3ee_66%,transparent_100%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                )}
                
                {/* Dark Inner Surface (Hides the center of the spinning conic gradient to form a 1px border) */}
                {!isAruOpen && (
                  <span className="absolute inset-[1px] rounded-full bg-[#0a0914] z-0 transition-colors duration-500 group-hover:bg-[#0f0e1a]" />
                )}

                {/* Animated Sheen Sweep */}
                <span className="absolute inset-0 z-0 overflow-hidden pointer-events-none rounded-full">
                  <span className="absolute top-0 left-[-100%] h-full w-[60%] bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-[-25deg] transition-all duration-1000 group-hover:left-[200%] ease-in-out" />
                </span>

                <div className="relative z-10 flex items-center gap-2">
                  {isAruOpen ? (
                    <>
                      <X size={15} className="text-fuchsia-400" />
                      <span className="text-[11px] font-black tracking-[0.2em] uppercase text-fuchsia-300">Close</span>
                    </>
                  ) : (
                    <>
                      {/* AI Core Pulse Indicator */}
                      <div className="relative flex items-center justify-center">
                        <Bot size={16} className="text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)] group-hover:rotate-12 group-hover:scale-110 transition-transform duration-500" />
                        <span className="absolute -top-1 -right-1 flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-fuchsia-400 opacity-75 duration-1000" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-fuchsia-500 shadow-[0_0_10px_#d946ef]" />
                        </span>
                      </div>
                      <span className="text-[11px] font-black tracking-[0.2em] uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-300 via-fuchsia-300 to-pink-300 group-hover:from-white group-hover:to-cyan-100 transition-all drop-shadow-sm">
                        Ask Aru
                      </span>
                      <Sparkles size={13} className="text-amber-300 animate-pulse drop-shadow-[0_0_5px_rgba(252,211,77,0.8)]" />
                    </>
                  )}
                </div>
              </button>

              <div className="w-px h-5 bg-white/10 mx-0.5" />

              {/* Account: Google login */}
              <AccountMenu
                theme={theme}
                loggedIn={!!cloud.username}
                displayName={cloud.username}
                avatarUrl={(auth.user?.user_metadata as { avatar_url?: string; picture?: string } | undefined)?.avatar_url
                  ?? (auth.user?.user_metadata as { picture?: string } | undefined)?.picture ?? null}
                status={cloud.status}
                elo={cloud.elo}
                onSignIn={handleSignIn}
                onSignOut={handleSignOut}
              />
            </div>
          </div>
        )}

        {/* Floating Bottom-Left Version/Changelog Badge */}
        {!shouldHideClutter && (
          <button
            onClick={() => setShowChangelog(true)}
            className="fixed bottom-6 left-6 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-950/40 hover:bg-zinc-900/80 backdrop-blur border border-white/5 hover:border-white/20 text-zinc-500 hover:text-white transition-all group"
            title="Update Log & Features"
          >
            <Sparkles size={12} className={theme.text} />
            <span className="text-[10px] font-black uppercase tracking-widest">{CHANGELOG[0].version}</span>
            <span className="text-[9px] font-bold opacity-0 group-hover:opacity-100 transition-opacity bg-white/10 px-2 py-0.5 rounded ml-1 hidden md:block">What's New</span>
          </button>
        )}


        {/* ─── MODAL LAYER ─── */}
        {(() => {
          if (!activeModal) return null;
          switch (activeModal) {
            case 'expandedGraph': return (
              <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/60 p-6 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setActiveModal(null)}>
                <div className="bg-zinc-900/95 p-8 rounded-3xl w-full max-w-4xl border border-zinc-800 shadow-2xl lucid-scale" style={{ '--delay': '0ms' } as React.CSSProperties} onClick={e => e.stopPropagation()}>
                  <div className="flex justify-between items-center mb-6">
                    <h3 className={`text-2xl font-black ${theme.text}`}>PACING TIMELINE</h3>
                    <button onClick={() => setActiveModal(null)} className="text-zinc-400 hover:text-white transition-colors"><X size={24} /></button>
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
            );

            case 'stats': return (
              <StatsDashboard
                theme={theme}
                testsCompleted={rpg.testsCompleted}
                heatmapData={rpg.heatmapData}
                onClose={handleCloseModal}
                onStartWeaknessDrill={handleStartWeaknessDrill}
              />
            );

            case 'quests': return (
              <DailyQuestsPanel
                questsState={quests.questsState}
                dailyStreak={dailyStreak}
                onClose={() => setActiveModal(null)}
              />
            );

            case 'race': return (
              <RaceModal
                status={race.status}
                code={race.code}
                initialCode={initialRaceCode}
                isHost={race.isHost}
                players={race.players}
                error={race.error}
                selfId={race.selfId ?? ''}
                theme={theme}
                roomSize={race.roomSize}
                lobbyConfig={race.lobbyConfig}
                elo={cloud.elo}
                username={cloud.username || ''}
                supabase={supabase}
                updateLobbyConfig={race.updateLobbyConfig}
                isRankedRoom={isRankedMatch}
                onCreate={handleRaceCreate}
                onJoin={handleRaceJoin}
                onStart={handleRaceStart}
                onLeave={handleRaceLeave}
                onClose={handleCloseModal}
              />
            );

            case 'social': return (
              <SocialModal
                theme={theme}
                onClose={handleCloseModal}
                friendsState={friendsState}
                onChallengeFriend={handleChallengeFriend}
                sentChallengeTo={challenges.sentChallengeTo}
                onOpenProfile={handleOpenProfile}
                supabase={supabase}
              />
            );

            case 'changelog': return (
              <ChangelogModal
                theme={theme}
                onClose={handleCloseModal}
              />
            );

            case 'settings': return (
              <SettingsModal
                theme={theme}
                onClose={handleCloseModal}
                suddenDeath={game.suddenDeath} setSuddenDeath={game.setSuddenDeath}
                ghostPacer={game.ghostPacer} setGhostPacer={game.setGhostPacer}
                focusMode={game.focusMode} setFocusMode={game.setFocusMode}
                blindMode={game.blindMode} setBlindMode={game.setBlindMode}
                mirroredMode={game.mirroredMode} toggleMirror={game.toggleMirror}
                fogMode={game.fogMode} setFogMode={game.setFogMode}
                stickyKeysMode={game.stickyKeysMode} setStickyKeysMode={game.setStickyKeysMode}
                overclockedMode={game.overclockedMode} setOverclockedMode={game.setOverclockedMode}
                zenMode={game.zenMode} setZenMode={game.setZenMode}
                themeIndex={themeIndex} selectTheme={selectTheme}
                soundProfile={soundProfile} selectSoundProfile={selectSoundProfile}
                themeFont={themeFont}
                setThemeFont={handleSetThemeFont}
              />
            );

            case 'profile': return (
              <PlayerProfileModal
                targetUsername={selectedProfileUsername}
                onClose={handleProfileClose}
                supabase={supabase}
                localUsername={cloud.username}
                theme={theme}
                localRPGStats={localRPGStatsMemo}
              />
            );

            case 'godMode': return (
              <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 lucid-scale" style={{ '--delay': '0ms' } as React.CSSProperties} onClick={() => setActiveModal(null)}>
                <div className="bg-zinc-950 border border-zinc-800 rounded-[2.5rem] p-8 md:p-12 w-full max-w-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
                  <div className="flex justify-between items-center mb-8 border-b border-zinc-800 pb-6">
                    <h2 className="text-3xl font-black text-white uppercase tracking-widest flex items-center"><Terminal className="mr-4 text-emerald-400" size={32} /> God Mode</h2>
                    <button onClick={() => setActiveModal(null)} className="p-3 bg-zinc-800 hover:bg-red-500/20 hover:text-red-400 rounded-full text-zinc-400 transition-all duration-200 border border-zinc-700 hover:border-red-500/50"><X size={24} /></button>
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
                      <button onClick={() => { rpg.unlockAllAchievements(); setActiveModal(null); }} className="p-6 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-3xl font-black uppercase tracking-widest shadow-[0_0_20px_rgba(245,158,11,0.1)] transition-all flex flex-col items-center text-center text-xs">
                        <Trophy size={24} className="mb-2" /> Unlock All Achievements
                      </button>
                      <button onClick={() => { rpg.setXp(250000); setActiveModal(null); }} className="p-6 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 rounded-3xl font-black uppercase tracking-widest shadow-[0_0_20px_rgba(14,165,233,0.1)] transition-all flex flex-col items-center text-center text-xs">
                        <Star size={24} className="mb-2" /> Set Level to Max (50+)
                      </button>
                    </div>

                    {/* Admin Bug Reports Button */}
                    <div className="mt-4">
                      <button 
                        onClick={() => setActiveModal('bugReports')}
                        className="w-full p-6 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-3xl font-black uppercase tracking-widest shadow-[0_0_20px_rgba(99,102,241,0.1)] transition-all flex items-center justify-center gap-3 text-xs"
                      >
                        <Terminal size={24} /> Open Admin Bug Reports Inbox
                      </button>
                    </div>

                    <div className="mt-4 p-6 bg-red-500/5 border border-red-500/20 rounded-3xl">
                      <h4 className="text-red-400 font-bold tracking-widest uppercase mb-3 text-xs flex items-center gap-2">
                        <RotateCcw size={16} /> DANGER ZONE
                      </h4>
                      <button onClick={() => { rpg.resetAllProgress(); setActiveModal(null); }} className="w-full p-4 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-2xl font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 text-xs hover:shadow-[0_0_20px_rgba(239,68,68,0.2)]">
                        <RotateCcw size={18} /> Reset All Progress (Level, XP, Achievements, Themes)
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );

            case 'bugReports': return (
              <BugReportsModal 
                supabase={supabase} 
                onClose={handleCloseModal} 
              />
            );

            case 'comms': return isLoggedIn ? (
              <CommsModal
                supabase={supabase}
                userId={auth.session?.user.id}
                friends={friendsState.friends}
                onClose={handleCloseModal}
              />
            ) : null;

            case 'trophy': return (
              <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300" onClick={() => setActiveModal(null)}>
                <div className="bg-zinc-950 border border-zinc-800 rounded-[2.5rem] p-8 md:p-12 w-full max-w-5xl shadow-2xl max-h-[90vh] overflow-y-auto lucid-scale" style={{ '--delay': '0ms' } as React.CSSProperties} onClick={e => e.stopPropagation()}>
                  <div className="flex justify-between items-center mb-10 border-b border-zinc-800 pb-6 sticky top-0 bg-zinc-950/90 backdrop-blur-md z-10">
                    <h2 className="text-3xl font-black text-white uppercase tracking-widest flex items-center"><Trophy className="mr-4 text-amber-400" size={32} /> Hall of Legends</h2>
                    <button onClick={() => setActiveModal(null)} className="p-3 bg-zinc-900 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors"><X size={24} /></button>
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
            );

            default: return null;
          }
        })()}

        <AIChatBot
          stats={aruStats}
          onStartDrill={startSmartDrill}
          hideTrigger={shouldHideClutter}
          theme={theme}
          isOpen={isAruOpen}
          onClose={handleCloseAru}
          techAiState={techAiState}
          techModifiers={{
            sudden_death: game.suddenDeath,
            overclocked: game.overclockedMode,
            blind: game.blindMode,
            fog: game.fogMode,
            mirror: game.mirroredMode,
            ghost: game.ghostPacer,
            focus: !!game.focusMode,
            sticky: game.stickyKeysMode,
          }}
          techCapabilities={techCapabilities}
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