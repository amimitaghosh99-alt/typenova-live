
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
import { useAppChrome } from '@/hooks/useAppChrome';
import { useModals } from '@/hooks/useModals';


import { TypingController } from '@/components/TypingController';

import type { PaceSample } from '@/components/TypingArea';
import { ResultsScreen } from '@/components/ResultsScreen';
import { RaceResultsScreen } from '@/components/RaceResultsScreen';
import { AIDrillResultsScreen } from '@/components/AIDrillResultsScreen';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { appendHistory, loadHistory } from '@/lib/history';
import type { HistoryEntry } from '@/lib/history';
import { loadPersonalBests } from '@/lib/personalBests';
import { ReplayModal } from '@/components/ReplayModal';
import { TITLE_BADGES, getActiveTitleId } from '@/data/titles';
import { useChallenges } from '@/hooks/useChallenges';
import { useRace, makeRoomCode } from '@/hooks/useRace';
import { useMatchmaking } from '@/hooks/useMatchmaking';
import { useRoomDirectory } from '@/hooks/useRoomDirectory';
import { useRankedHistory } from '@/hooks/useRankedHistory';
import { mulberry32, daySeed, todayKey, isYesterday } from '@/utils/seededRandom';
import { supabase, fireAndForget } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useCloudSync } from '@/hooks/useCloudSync';
import { ACADEMY_PROGRESS_CHANGED, onSyncEvent } from '@/lib/syncEvents';
import { readLocalProgress, writeLocalProgress } from '@/lib/progress';
import { useFriends } from '@/hooks/useFriends';
import { PracticeArena } from '@/components/PracticeArena';
import { LeaderboardSidebar } from '@/components/LeaderboardSidebar';
import { BottomControlsDock } from '@/components/BottomControlsDock';
import { AppModalManager } from '@/components/AppModalManager';
import { TimedHud } from '@/components/TimedHud';

import { Routes, Route, Navigate, useNavigate, useParams, useLocation } from 'react-router';
import { Login } from '@/pages/Login';
import { OperatorDossier } from '@/pages/OperatorDossier';
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
import { CompeteEntryScreen } from '@/components/CompeteEntryScreen';
import { QuickMatchPanel } from '@/components/QuickMatchPanel';
import { RoomBrowser } from '@/components/RoomBrowser';
import { RankedHistoryPanel } from '@/components/RankedHistoryPanel';

import { RaceTrack } from '@/components/RaceTrack';


// ─── STAGE PAGE TRANSITION VARIANTS ────────────────────────────────────
const STAGE_PAGE_ORDER: Record<string, number> = {
  practice: 0,
  compete: 1,
  academy: 2,
};

const STAGE_PAGE_VARIANTS: Variants = {
  initial: (dir: number) => ({
    opacity: 0,
    x: dir * 28,
    scale: 0.99,
  }),
  animate: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: {
      duration: 0.45,
      ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
    },
  },
  exit: (dir: number) => ({
    opacity: 0,
    x: dir * -28,
    scale: 0.99,
    transition: {
      duration: 0.32,
      ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
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

function MainApp() {

  // ─── Mode State ──────────────────────────────────────────────────
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [showSoundMenu, setShowSoundMenu] = useState(false);
  const [isAruOpen, setIsAruOpen] = useState(false);

  // Measures the navbar and the bottom dock and publishes their real heights
  // as --nav-h / --dock-h. Every stage derives its top padding from that
  // variable instead of hardcoding a pixel guess, which is what used to leave
  // content tucked under the header at some breakpoints.
  useAppChrome();

  // Dialog layer. The `ModalKey` union lives in `src/lib/layout.ts` so the
  // switch in AppModalManager is checked against it; there is deliberately no
  // 'race' member — it used to exist, rendered `null`, and still counted as an
  // open modal, which made TypingController swallow every keystroke with no
  // visible dialog to close.
  const {
    active: activeModal,
    open: openModal,
    close: closeModal,
  } = useModals();

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
      openModal('settings');

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
  }), [openModal]);

  const [themeFont, setThemeFont] = useState(() => localStorage.getItem('typezen_font') || 'JetBrains Mono');

  useEffect(() => {
    document.documentElement.style.setProperty('--typezen-font', `"${themeFont}"`);
  }, [themeFont]);

  const [dailyStreak, setDailyStreak] = useState(loadDailyStreak);
  /** Lifetime multiplayer wins, mirrored from the progress snapshot. */
  const [racesWon, setRacesWon] = useState(() => readLocalProgress().racesWon);
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

  const [tetrisEffect, setTetrisEffect] = useState(false);
  const [raceActive, setRaceActive] = useState(false);
  const [isRankedMatch, setIsRankedMatch] = useState(false);
  // A room is only advertised in the public directory when its host opted in.
  // Challenge and quick-match rooms are never listed.
  const [listRoomsPublicly, setListRoomsPublicly] = useState(() => {
    try { return localStorage.getItem('typenova_list_rooms') !== 'false'; } catch { return true; }
  });
  const [publicRoom, setPublicRoom] = useState(false);
  const { generateDrill, isGenerating: isSmartDrillGenerating } = useSmartDrills();
  const [currentStage, setCurrentStage] = useState<'practice' | 'compete' | 'academy'>('practice');
  const isAcademyMode = currentStage === 'academy';

  const enterAcademy = useCallback(() => {
    setCurrentStage('academy');
  }, []);

  /**
   * The dossier is a route now, so the operator on screen comes from the URL
   * rather than from state. `MainApp` is mounted for `/`, `/operator` and
   * `/operator/:username` alike — the path is what decides whether the dossier
   * page is showing, which is what makes back/forward and a shared link work.
   */
  const navigate = useNavigate();
  const { username: routeProfileUsername } = useParams<{ username?: string }>();
  const location = useLocation();
  const dossierOpen = location.pathname.startsWith('/operator');
  /** Null when the URL carries no name, i.e. "my own dossier". */
  const selectedProfileUsername = routeProfileUsername ?? null;

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
    onHydrated: () => {
      setDailyStreak(loadDailyStreak());
      setRacesWon(readLocalProgress().racesWon);
    },
  });
  const isLoggedIn = !!auth.session;
  const levelOptions = useMemo(() => (["NOVICE", "ADEPT", "MASTER", "QUOTES", "CODE", "CUSTOM"] as Level[]).map(l => ({
    label: l,
    value: l,
    locked: !isLoggedIn && (l === "CODE" || l === "CUSTOM")
  })), [isLoggedIn]);

  const handleSignIn = useCallback(() => { void auth.signInWithGoogle(); }, [auth]);
  const handleSignOut = useCallback(() => { void auth.signOut(); }, [auth]);
  const handleUnlockGodMode = useCallback(() => openModal('godMode'), [openModal]);
  const friendsState = useFriends({ supabase, session: auth.session, username: cloud.username });

  const challenges = useChallenges({
    supabase,
    username: cloud.username,
    onAccepted: () => {
      // Challenger: friend accepted — they already joined, so surface the room
      // lobby. (This used to open a modal that rendered nothing and swallowed
      // every keystroke.)
      closeModal();
      setRaceActive(false);
      setCurrentStage('compete');
    },

  });

  /**
   * Local RPG stats for the dossier, memoised so the page's effects don't see a
   * new object identity on every render.
   *
   * `undefined` for anyone else's dossier — that one reads `public_profiles`.
   * A nameless `/operator` route is always your own, including for guests, who
   * have no cloud username at all.
   *
   * The raw `history`, personal bests and achievement ids ride along because the
   * dossier draws them directly (trend line, per-mode breakdown, PB board, badge
   * grid) and localStorage is only worth touching once per open. None of it is
   * available for a remote operator: `public_profiles` stores aggregates only,
   * which is why those sections are marked private rather than zeroed.
   */
  const localRPGStatsMemo = useMemo(() => {
    if (!dossierOpen) return undefined;
    const isOwn = selectedProfileUsername
      ? !!cloud.username && selectedProfileUsername.toLowerCase() === cloud.username.toLowerCase()
      : true;
    if (!isOwn) return undefined;
    const h: HistoryEntry[] = loadHistory();
    const recent = h.slice(-20);
    return {
      level: rpg.userLevel,
      xp: rpg.xp,
      currentLevelProgress: rpg.currentLevelProgress,
      xpNeeded: rpg.xpNeeded,
      bestCombo: rpg.bestCombo,
      history: h,
      personalBests: loadPersonalBests(),
      achievements: rpg.unlockedAchievements,
      skillStats: {
        maxWpm: h.length ? Math.max(...h.map((e) => e.wpm)) : 0,
        avgAccuracy: recent.length ? Math.round(recent.reduce((a, e) => a + e.acc, 0) / recent.length) : 0,
        dailyStreak,
        testsCompleted: rpg.testsCompleted,
        racesWon,
        totalWordsTyped: h.reduce((a, e) => a + e.size, 0),
      }
    };
  }, [dossierOpen, cloud.username, selectedProfileUsername, rpg.userLevel, rpg.xp, rpg.currentLevelProgress, rpg.xpNeeded, rpg.testsCompleted, rpg.bestCombo, rpg.unlockedAchievements, dailyStreak, racesWon]);

  const handleChallengeFriend = (
    friendUsername: string,
    config?: { mode?: Level; words?: number; language?: CodeLanguage }
  ) => {
    if (!cloud.username) return;
    const roomCode = makeRoomCode();
    race.createRoom(cloud.username, 2, undefined, cloud.elo, roomCode, auth.user?.id, false);
    setPublicRoom(false); // a private duel with one named friend
    if (config) {
      race.updateLobbyConfig(config);
    }
    challenges.sendChallenge(friendUsername, roomCode, cloud.elo, config);
    const modeLabel = config ? `${config.mode}${config.words ? ` (${config.words}w)` : ''}` : '';
    toast.success(`Challenge ${modeLabel} sent to ${friendUsername}! Waiting…`, { icon: '⚔️' });
    closeModal();
    setRaceActive(false);
    setCurrentStage('compete');
  };


  // ─── Online Heartbeat ────────────────────────────────────────────
  useEffect(() => {
    if (!supabase || !auth.session?.user.id) return;

    const pingPresence = () => {
      const request = supabase?.from('profiles')
        .update({ last_seen: new Date().toISOString() })
        .eq('id', auth.session!.user.id)
        .then(({ error }) => {
          if (error) console.error("Heartbeat error:", error);
        });
      // A ping every 60s on a flaky connection is the most frequent write in
      // the app; without this the first dropped one became an unhandled
      // rejection. Missing a beat only costs a stale "online" dot.
      if (request) fireAndForget(request, 'presence heartbeat');
    };

    // Ping immediately when the session becomes available
    pingPresence();

    // Then ping every 60 seconds
    const intervalId = setInterval(pingPresence, 60 * 1000);
    return () => clearInterval(intervalId);
  }, [auth.session, supabase]);

  // Multiplayer race: when a race starts, every client (host + guests) drops
  // into a synced countdown on the same text. We reuse the whole typing
  // engine — the race just supplies the text and a shared start moment.
  const race = useRace({
    onStart: (text, startAt) => {
      setRaceActive(true);
      setCurrentStage('compete');
      // Reset engine but keep raceActive; disable modifier modes for fairness
      typing.resetEngine();
      typing.setTargetText(text);
      game.setZenMode(false); game.setMirroredMode(false); game.setDailyActive(false);
      game.setSuddenDeath(false); game.setBlindMode(false); game.setFogMode(false);
      game.setStickyKeysMode(false); game.setOverclockedMode(false);
      // Everyone counts down to the SAME absolute timestamp. Rounding the
      // remaining time up to whole seconds used to let clients start up to a
      // second apart, which quietly skewed the whole race.
      typing.scheduleStart(startAt);
      typing.setCountdownTimer(Math.max(1, Math.ceil((startAt - Date.now()) / 1000)));
      typing.setPhase('COUNTDOWN');
    },

  });

  // ─── Quick Match ─────────────────────────────────────────────────
  // Presence key + host election need a stable, unique id per client. Guests
  // have no auth uid, and two guests sharing one key collide in the queue.
  const guestQueueId = useMemo(() => `guest-${Math.random().toString(36).slice(2, 10)}`, []);
  const matchmaking = useMatchmaking(
    supabase,
    auth.user?.id || guestQueueId,
    cloud.username || 'Player',
    cloud.elo ?? 1000,
  );

  // ─── Open-room directory ─────────────────────────────────────────
  // Presence-backed, so an advertised room disappears on its own when the
  // host's tab closes.
  const publicRoomAd = useMemo(() => (
    race.isHost && race.status === 'lobby' && publicRoom && race.code
      ? {
        code: race.code,
        host: cloud.username || 'Player',
        size: race.roomSize || 4,
        players: race.players.length,
        mode: String(race.lobbyConfig.mode),
        words: race.lobbyConfig.words,
        ranked: isRankedMatch,
      }
      : null
  ), [race.isHost, race.status, race.code, race.roomSize, race.players.length, race.lobbyConfig.mode, race.lobbyConfig.words, publicRoom, cloud.username, isRankedMatch]);

  const roomDirectory = useRoomDirectory({
    supabase,
    publish: publicRoomAd,
    selfCode: race.code,
    enabled: currentStage === 'compete',
  });

  // Ranked history. Keyed on `cloud.elo` so it refetches itself the moment the
  // ladder RPC hands back a new rating — the audit log has been written since
  // the Elo migration shipped, but nothing ever read it back.
  const rankedHistory = useRankedHistory({
    supabase,
    userId: auth.user?.id,
    enabled: currentStage === 'compete' && isLoggedIn,
    refreshKey: cloud.elo,
  });

  const toggleListRoomsPublicly = useCallback(() => {
    const next = !listRoomsPublicly;
    setListRoomsPublicly(next);
    setPublicRoom(next);
    try { localStorage.setItem('typenova_list_rooms', String(next)); } catch { }
  }, [listRoomsPublicly]);

  // Handle URL share links
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const room = params.get('room') || params.get('race');
    if (room && room.length === 6) {
      const roomCode = room.toUpperCase();
      setRaceActive(false);
      setCurrentStage('compete');
      race.joinRoom(roomCode, cloud.username || 'Player', cloud.elo, auth.user?.id);
      // Clean up URL so it doesn't linger
      window.history.replaceState({}, '', window.location.pathname);
    }
    // Depends on `race.joinRoom` (stable), not on the whole `race` object —
    // that was rebuilt every render, so this re-ran on every keystroke.
  }, [cloud.username, cloud.elo, auth.user?.id, race.joinRoom]);

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
        racesWon,
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
  }, [rpg.xp, rpg.userLevel, rpg.testsCompleted, rpg.unlockedAchievements, rpg.heatmapData, dailyStreak, racesWon, cloud.status, cloud.pushProgress, cloud.username, activeTitle]);

  // The Academy owns its own storage keys and is mounted well below this
  // component, so none of its progress appears in the dependency list above.
  // Until it announced itself, an evening spent entirely on lessons reached the
  // cloud only on the next typing test or sign-in — and a device switch before
  // then showed a skill tree missing every star earned that evening.
  useEffect(() => {
    if (cloud.status !== 'synced' || !cloud.username) return;
    return onSyncEvent(ACADEMY_PROGRESS_CHANGED, () => cloud.pushProgress());
  }, [cloud.status, cloud.username, cloud.pushProgress]);

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
      // Dropping the room while the stage is still 'compete' left the user on a
      // lobby with an empty room code and no way back, so land in practice.
      race.leave();
      setRaceActive(false);
      setCurrentStage('practice');
    }

    rpg.resetRPGFlags();
    particles.clearAll();
  }, [typing, rpg, particles, race.leave, game.configRef, raceActive]);

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

  // Lifetime-weakest keys (min 10 hits each). Punctuation and digits are
  // included on purpose — they are usually the weakest keys, and the drill
  // generator preserves them.
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
    try { localStorage.setItem('typezen_theme', index.toString()); } catch { }
  }, []);

  const selectSoundProfile = useCallback((key: string) => {
    setSoundProfileState(key);
    setShowSoundMenu(false);
    try { localStorage.setItem('typezen_sound', key); } catch { }
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

    if (game.level === 'CUSTOM') {
      setSaveStatus('CUSTOM MODE — NOT SAVED');
      return;
    }

    // Auto-save if logged in
    if (autoSave && supabase && auth.session && cloud.username) {
      const wpmVal = Math.round(typing.wpm);
      const accVal = Math.round(typing.accuracy);
      if (wpmVal > 0 && wpmVal <= 300 && accVal >= 0 && accVal <= 100) {
        setSaveStatus('Auto-saving...');
        // The RPC can reject as well as return an error (offline right after a
        // test, request blocked). Reporting it in the same place keeps the
        // results screen honest instead of leaving "Auto-saving..." on screen.
        fireAndForget(
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
          }, () => {
            setSaveStatus('SAVE FAILED — OFFLINE?');
          }),
          'score submit',
        );
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
    game.level,
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
    const isCustom = game.level === 'CUSTOM';

    // Timed tests are rewarded/judged by what was actually typed, not the
    // oversized text buffer they run against.
    const isTimed = game.testMode === 'time';
    const typedWords = statsInput.trim() ? statsInput.trim().split(/\s+/).length : 0;
    const effWordCount = isTimed ? typedWords : game.wordCount;
    const effLength = isTimed ? statsInput.length : typing.targetText.length;

    // Quest Progression (custom mode excluded)
    if (stats.currentWpm > 0 && !isCustom) {
      quests.progressQuest('words_typed', stats.currentWpm * (timeMs / 60000));
      quests.progressQuest('wpm_achieved', stats.currentWpm);
      quests.progressQuest('acc_achieved', stats.currentAcc);
    }

    const result = rpg.processRPG(
      stats.currentWpm, stats.currentAcc, typing.maxCombo,
      effWordCount, effLength,
      game.microDrillActive || isCustom, typing.keystrokeLog.current,
      () => audio.playSound('levelup')
    );

    // Daily Challenge streak
    let streakNow = dailyStreak;
    if (game.dailyActive && !game.microDrillActive && !isCustom) {
      const today = todayKey();
      let prevDaily: { lastDay: string; streak: number } | null = null;
      try { prevDaily = JSON.parse(localStorage.getItem('typezen_daily') || 'null'); } catch { /* corrupt — treat as fresh */ }
      if (prevDaily?.lastDay === today) streakNow = prevDaily.streak;
      else if (prevDaily && isYesterday(prevDaily.lastDay)) streakNow = prevDaily.streak + 1;
      else streakNow = 1;
      localStorage.setItem('typezen_daily', JSON.stringify({ lastDay: today, streak: streakNow }));

      setDailyStreak(streakNow);
    }

    // Result history for the stats dashboard (drills and custom mode excluded)
    if (!game.microDrillActive && !isCustom) {
      appendHistory({
        d: new Date().toISOString(),
        wpm: stats.currentWpm, acc: stats.currentAcc, cons: stats.consistency,
        level: game.level, mode: isTimed ? 'time' : 'words',
        size: isTimed ? game.duration : game.wordCount,
      });
    }

    // Personal-best pace recording for the ghost pacer
    if (!game.microDrillActive && !isCustom && !game.mirroredMode && !game.dailyActive && stats.currentWpm > 0) {
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

    if (!isCustom) {
      rpg.checkAchievements(
        // Lifetime record, not just this run's peak — "Unbreakable" (200 combo)
        // was otherwise only reachable inside one uninterrupted test.
        stats.currentWpm, stats.currentAcc, result.newBestCombo,
        result.newXp, effWordCount,
        game.suddenDeath, game.blindMode, game.fogMode, game.overclockedMode,
        result.newTestsCompleted, _seenThemes.size, THEME_KEYS.length,
        isTimed, streakNow
      );
    }

    // Multiplayer: broadcast the final result. The RaceResultsScreen is
    // rendered automatically when raceActive + phase === FINISHED.
    if (raceActive) {
      const log = typing.keystrokeLog.current;
      const errCount = log.filter(k => k.isError && !k.isBackspace).length;
      const backspaceCount = log.filter(k => k.isBackspace).length;
      race.sendFinish({
        wpm: stats.currentWpm,
        accuracy: stats.currentAcc,
        timeMs,
        rawWpm: stats.rawWpm,
        consistency: stats.consistency,
        keystrokes: log.length,
        errorCount: errCount,
        backspaceCount,
        heatmap: result.updatedHeatmap,
        // Without these the race results graph could only ever draw one curve
        // and every award was computed against opponents "typing" 0 WPM.
        timeline: typing.timelinePoints.map(p => ({ t: p.t, wpm: p.wpm })),
        errorTimes,
      });
    }

  }, [typing.phase, typing.endTime]);

  // ─── Multiplayer: broadcast live progress while racing ───────────
  // `race.sendProgress` is a stable reference (see the actions object in
  // useRace), so it belongs in the dep array. This used to mirror the entire
  // `race` object into a ref, because `race` was rebuilt on every render and
  // dragged this effect — and the presence `track()` behind it — along with it.
  useEffect(() => {
    if (!raceActive || typing.phase !== 'TYPING') return;
    const pct = typing.targetText.length > 0 ? (typing.input.length / typing.targetText.length) * 100 : 0;
    race.sendProgress(pct, typing.wpm, typing.keystrokeLog.current.length, typing.accuracy);
  }, [raceActive, typing.phase, typing.input.length, typing.targetText.length, typing.wpm, typing.accuracy, race.sendProgress]);


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

  // Width is owned by the parent grid's column definition now — this only
  // controls the collapse animation. It used to also carry `lg:w-[30%]` and
  // `shrink-0`, which fought with the arena's own `lg:w-[70%]` and left a
  // rounding gap between the two panels at several widths.
  const leaderboardClass = `transition-[opacity,transform] duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] will-change-[opacity,transform] glass-panel rounded-[2rem] overflow-hidden ${shouldHideClutter ? 'w-0 opacity-0 translate-x-12 pointer-events-none p-0 border-transparent m-0 hidden lg:hidden' : 'w-full p-6 md:p-8 opacity-100 translate-x-0'
    }`;

  // ====== MEMOIZED HANDLERS FOR MODALS ======
  const handleStartWeaknessDrill = useCallback((drillText: string) => {
    typing.setTargetText(drillText);
    closeModal();
    typing.resetEngine();
  }, [typing.setTargetText, typing.resetEngine, closeModal]);
  const handleRaceCreate = useCallback((name: string, size?: number, isRanked?: boolean, roomCode?: string, isPublic?: boolean) => {
    setIsRankedMatch(!!isRanked);
    // Defaults to unlisted: paths that don't ask for a public room (quick match,
    // challenges) must never leak one into the directory.
    setPublicRoom(!!isPublic);
    race.createRoom(name, size, undefined, cloud.elo, roomCode, auth.user?.id, !!isRanked);
  }, [race.createRoom, cloud.elo, auth.user?.id]);
  const handleRaceJoin = useCallback((code: string, name: string, isRanked?: boolean) => {
    setIsRankedMatch(!!isRanked);
    race.joinRoom(code, name, cloud.elo, auth.user?.id, !!isRanked);
  }, [race.joinRoom, cloud.elo, auth.user?.id]);

  // The queue only hands back a room code and a role; somebody still has to
  // open the room. Nothing did that after RaceModal stopped being rendered,
  // which is exactly why matchmaking was unreachable dead code.
  const quickMatchActedRef = useRef<string | null>(null);
  const handleQuickMatch = useCallback(() => {
    quickMatchActedRef.current = null;
    matchmaking.search();
  }, [matchmaking.search]);

  useEffect(() => {
    const mm = matchmaking.state;
    if (mm.status !== 'found' || !mm.roomCode) return;
    if (quickMatchActedRef.current === mm.roomCode) return;
    quickMatchActedRef.current = mm.roomCode;

    // Elo can only move when the player has an account to move it on.
    const ranked = isLoggedIn;
    if (mm.isHost) {
      handleRaceCreate(cloud.username || 'Player', 2, ranked, mm.roomCode);
    } else {
      handleRaceJoin(mm.roomCode, cloud.username || 'Player', ranked);
    }
    setRaceActive(false);
    setCurrentStage('compete');
    toast.success(`Matched with ${mm.opponentName || 'an opponent'}!`, { icon: '⚔️' });
    matchmaking.clearMatch();
  }, [matchmaking.state, matchmaking.clearMatch, isLoggedIn, cloud.username, handleRaceCreate, handleRaceJoin]);

  // Leaving the compete stage has to leave the queue as well, otherwise a match
  // can land while you're mid-test in practice and yank you into a race.
  useEffect(() => {
    if (currentStage !== 'compete' && matchmaking.state.status === 'searching') {
      matchmaking.cancel();
    }
  }, [currentStage, matchmaking.state.status, matchmaking.cancel]);
  const handleRaceStart = useCallback((text?: string) => {
    race.startRace(text);
  }, [race.startRace]);
  const handleRaceLeave = useCallback(() => {
    race.leave();
    setRaceActive(false);
    setCurrentStage('practice');
    setIsRankedMatch(false);
  }, [race.leave]);

  /**
   * Opening a dossier is navigation now, not a dialog push. Any dialog on screen
   * closes first — leaving the social modal mounted behind a full page would put
   * two competing Escape handlers and two scroll containers on the same view.
   *
   * The name is encoded, so an operator whose handle needs escaping still gets a
   * URL that round-trips.
   */
  const handleOpenProfile = useCallback((name: string) => {
    closeModal();
    const isSelf = !!cloud.username && name.toLowerCase() === cloud.username.toLowerCase();
    // 'Guest' is the navbar's stand-in for a signed-out operator, not a handle
    // anyone can hold, so it resolves to the nameless "my dossier" route.
    navigate(isSelf || name === 'Guest' ? '/operator' : `/operator/${encodeURIComponent(name)}`);
  }, [closeModal, cloud.username, navigate]);

  /**
   * Leaving the dossier. `-1` when there is somewhere to go back to, so the
   * browser's own history is respected; a direct hit on a shared link has no
   * such entry, and falls through to the app root.
   */
  const handleLeaveDossier = useCallback(() => {
    if (window.history.length > 1) navigate(-1);
    else navigate('/', { replace: true });
  }, [navigate]);


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
  const handleWatchReplay = useCallback(() => openModal('replay'), [openModal]);
  const handleRetryDrill = useCallback(() => { launchDrill(typing.targetText); }, [launchDrill, typing.targetText]);
  const handleReturnToRoom = useCallback(() => {
    race.returnToLobby();
    setRaceActive(false);
    setCurrentStage('compete');
    typing.setPhase('CONFIGURING');
  }, [race.returnToLobby, typing.setPhase]);
  const handleRematchRace = handleReturnToRoom;
  const handleLeaveRace = useCallback(() => {
    race.leave();
    setRaceActive(false);
    setIsRankedMatch(false);
    setCurrentStage('practice');
    handleReset();
  }, [race.leave, handleReset]);
  const handleCloseAru = useCallback(() => setIsAruOpen(false), []);

  /**
   * A confirmed multiplayer win. Persisted through the progress snapshot (so it
   * syncs and survives a device switch) and pushed into the daily quests, which
   * have always had `races_won` templates that nothing could ever advance.
   */
  const handleRaceWon = useCallback(() => {
    const snapshot = readLocalProgress();
    writeLocalProgress({ ...snapshot, racesWon: snapshot.racesWon + 1 });
    setRacesWon(snapshot.racesWon + 1);
    quests.progressQuest('races_won', 1);
    cloud.pushProgress();
  }, [quests.progressQuest, cloud.pushProgress]);

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
            timelines={race.timelines}

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
            onRaceWon={handleRaceWon}
          />
          {activeModal === 'replay' && (
            <ReplayModal
              targetText={typing.targetText}
              log={typing.keystrokeLog.current}
              theme={theme}
              onClose={closeModal}
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
            onClose={closeModal}
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
        // The dossier is a page, not a dialog, so it isn't in `activeModal` —
        // without this every keystroke on it drove the test underneath.
        keyboardBlocked={dossierOpen}
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
                /*
                  The Academy used to clamp the wallpaper to 0.55 brightness and
                  an 8px blur. It paints its own reading scrim now, so the blur
                  is pinned off instead — the wallpaper stays sharp behind the
                  panels, at the brightness the user chose.
                */
                filter: currentStage === 'academy'
                  ? `brightness(${brightness}) blur(0px)`
                  : typing.phase === 'TYPING'
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
              {/* Paused on the dossier route. That page covers the viewport and
                  paints its own reading scrim over this canvas, so the animation
                  is work nobody can see — and it is a full-viewport per-pixel
                  fragment shader (three octaves of simplex noise), so it is the
                  most expensive thing running on that route. `activeModal`
                  doesn't cover this case: the dossier is a page, not a dialog. */}
              <CosmicLiquidShader theme={theme} isPaused={Boolean(activeModal) || dossierOpen} />
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
          onOpenTrophies={() => isLoggedIn ? openModal('trophy') : toast.error("Sign in to unlock Trophies!", { icon: <Lock size={14} /> })}
          onOpenStats={() => isLoggedIn ? openModal('stats') : toast.error("Sign in to view Stats!", { icon: <Lock size={14} /> })}
          onOpenRace={() => {
            // Deliberately does NOT open a room. Auto-creating one here meant a
            // failed handshake left the user in a lobby with a blank code; the
            // compete stage now asks whether to host or join first.
            setRaceActive(false);
            setCurrentStage('compete');
          }}

          onOpenSocial={() => isLoggedIn ? openModal('social') : toast.error("Sign in to view Community!", { icon: <Lock size={14} /> })}
          onOpenComms={() => isLoggedIn ? openModal('comms') : toast.error("Sign in to use Comms!", { icon: <Lock size={14} /> })}
          onOpenSettings={() => openModal('settings')}
          onOpenDailyQuests={() => openModal('quests')}
          activePage={dossierOpen ? 'dossier' : currentStage}
        />

        {/* Noise texture overlay removed to fix GPU rendering white screen bug */}

        {/* Background is handled cleanly by CosmicLiquidShader */}
        <div className="absolute inset-0 z-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>

        {/* Progress Bar — char-based for word tests, clock-based for timed */}
        {typing.phase === 'TYPING' && game.testMode === 'time' && typing.startTime ? (
          <TimedHud startTime={typing.startTime} duration={game.duration} theme={theme} />
        ) : (
          <div className="fixed top-0 left-0 h-1 bg-zinc-900 w-full z-[var(--z-hud)]">
            <div className={`h-full ${theme.solid} transition-all duration-200 ease-out ${theme.glow}`} style={{ width: `${progressPercent}%` }} />
          </div>
        )}

        {/* Socket health. A dropped channel now retries in the background
            instead of destroying the room, so it has to be visible somewhere
            other than the lobby — including mid-race. */}
        {race.connection === 'reconnecting' && (
          <div
            role="status"
            aria-live="polite"
            className="fixed top-[calc(var(--nav-h)+0.5rem)] left-1/2 -translate-x-1/2 z-[var(--z-hud)] flex items-center gap-2 px-4 py-2 rounded-full glass-pill border border-amber-500/40 bg-black/75 text-amber-300 font-mono text-[10px] font-black uppercase tracking-widest shadow-lg"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
            Reconnecting to room {race.code}…
          </div>
        )}

        {/* Zen Mode Ambient */}
        {game.zenMode && (
          <div className="fixed inset-0 flex items-center justify-center pointer-events-none opacity-20 z-0 animate-in fade-in zoom-in duration-1000 ease-out">
            <div className={`w-[80vw] h-[80vw] ${theme.solid} rounded-full blur-[250px] animate-pulse`} style={{ animationDuration: '6s' }} />
          </div>
        )}

        {/* ═══ MAIN CONTENT ═══ */}
        {/* The dossier route replaces the stage rather than covering it: two
            fixed, scrollable panes on screen at once meant the wrong one caught
            the wheel, and the stage kept running animations nobody could see.
            It sits outside the stage `AnimatePresence` because it is not one of
            the three stages — the presence group there only exists to give the
            stage swap a direction. */}
        {dossierOpen ? (
          <OperatorDossier
            routeUsername={selectedProfileUsername}
            onBack={handleLeaveDossier}
            supabase={supabase}
            localUsername={cloud.username}
            theme={theme}
            localRPGStats={localRPGStatsMemo}
          />
        ) : (
        <AnimatePresence mode="wait" custom={stageDirection}>
          {currentStage === 'academy' ? (
            <motion.div
              key="academy"
              custom={stageDirection}
              variants={STAGE_PAGE_VARIANTS}
              initial="initial"
              animate="animate"
              exit="exit"
              className="fixed inset-0 top-[var(--nav-h)] z-[var(--z-content)] flex flex-col bg-transparent overflow-y-auto custom-scrollbar"
            >
              <div className="w-full px-4 sm:px-8 md:px-10 lg:px-12 py-6 max-w-[var(--w-ultra)] mx-auto">
                <AcademyLayout onExit={exitAcademy} theme={theme} />
              </div>
            </motion.div>
          ) : currentStage === 'compete' && !raceActive ? (
            <motion.div
              key="compete-lobby"
              custom={stageDirection}
              variants={STAGE_PAGE_VARIANTS}
              initial="initial"
              animate="animate"
              exit="exit"
              // Own scroll container pinned under the navbar, like the academy
              // stage. In document flow the whole page scrolled by ~100px even
              // though the cockpit almost fits, because nothing capped the
              // content to the viewport.
              className="fixed inset-0 top-[var(--nav-h)] z-[var(--z-content)] overflow-y-auto custom-scrollbar transform-gpu will-change-transform"
            >
              {/* `xl:h-full` pins the cockpit to exactly one screen — its
                  columns scroll internally instead of the page. Below xl the
                  stacked layout genuinely can't fit, so it grows and this
                  container scrolls. pb clears the fixed dock + changelog badge. */}
              <div className="w-full max-w-[var(--w-wide)] mx-auto px-2 md:px-6 pt-4 pb-[calc(var(--dock-h)+1rem)] flex flex-col min-h-full xl:h-full">
                {/* No live room yet → ask whether to host or join. Rendering the
                  lobby in this state produced a dead screen: blank room code,
                  empty slots, and a start button that could never fire. */}
                {race.status === 'idle' || race.status === 'joining' ? (
                  <CompeteEntryScreen
                    username={cloud.username || 'Player'}
                    theme={theme}
                    themeTextClass={theme.text}
                    defaultRoomSize={race.roomSize || 4}
                    isBusy={race.status === 'joining'}
                    error={race.error}
                    multiplayerAvailable={!!supabase}
                    emptyRoomCode={race.emptyRoomCode}
                    quickMatchSlot={
                      <QuickMatchPanel
                        theme={theme}
                        state={matchmaking.state}
                        elo={cloud.elo ?? 1000}
                        isLoggedIn={isLoggedIn}
                        available={!!supabase}
                        onSearch={handleQuickMatch}
                        onCancel={matchmaking.cancel}
                      />
                    }
                    // Browse + history go in the right rail. Stacked in the same
                    // slot as quick match, they pushed "Create room" and "Join
                    // room" ~1200px down the page.
                    sidebarSlot={
                      <>
                        <RoomBrowser
                          theme={theme}
                          rooms={roomDirectory.rooms}
                          busy={race.status === 'joining'}
                          listPublicly={listRoomsPublicly}
                          onToggleListPublicly={toggleListRoomsPublicly}
                          onJoin={(targetCode) => {
                            handleRaceJoin(targetCode, cloud.username || 'Player');
                          }}
                        />
                        {/* Hidden for guests (no ladder to show) and when the Elo
                          migration hasn't been applied. */}
                        {isLoggedIn && !rankedHistory.unavailable && (
                          <RankedHistoryPanel
                            theme={theme}
                            matches={rankedHistory.matches}
                            loading={rankedHistory.loading}
                            elo={cloud.elo ?? 1000}
                          />
                        )}
                      </>
                    }
                    onHostCode={(targetCode) => {
                      handleRaceCreate(cloud.username || 'Player', race.roomSize || 4, false, targetCode, listRoomsPublicly);
                    }}
                    onCreate={(size, isRanked) => {
                      handleRaceCreate(cloud.username || 'Player', size, isRanked, undefined, listRoomsPublicly);
                    }}
                    onJoin={(targetCode) => {
                      handleRaceJoin(targetCode, cloud.username || 'Player');
                    }}
                    onBack={() => setCurrentStage('practice')}
                  />
                ) : (
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
                      const cfg = race.lobbyConfig;
                      const text = generateText(cfg.mode, cfg.words, '', false, { codeLanguage: cfg.language });
                      handleRaceStart(text);
                    }}
                    onLeave={handleRaceLeave}
                    theme={theme}
                    themeTextClass={theme.text}
                    // The handshake spinner belongs to the entry screen now — the
                    // lobby only renders once the room is actually live.
                    isJoining={false}
                    error={race.error}
                    countdown={race.countdown}
                    connection={race.connection}
                    onToggleReady={race.setReady}
                  />

                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="practice"
              custom={stageDirection}
              variants={STAGE_PAGE_VARIANTS}
              initial="initial"
              animate="animate"
              exit="exit"
              className={`relative w-full px-2 md:px-6 pt-[calc(var(--nav-h)+1.5rem)] pb-8 flex flex-col z-[var(--z-content)] transition-[max-width] duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] transform-gpu will-change-transform ${shouldHideClutter ? 'max-w-[95vw]' : 'max-w-[var(--w-wide)]'}`}
            >
              {raceActive && (
                <RaceTrack
                  players={race.players}
                  selfId={race.selfId ?? ''}
                  theme={theme}
                  roomCode={race.code}
                  targetLength={typing.targetText.length}
                  myProgress={progressPercent}
                  myWpm={typing.wpm}
                  myAccuracy={typing.accuracy}
                  phase={typing.phase}
                  countdown={typing.countdownTimer}
                />
              )}
              {/* One grid, not a flex row wrapping a second identical flex row.
                  The duplicated wrapper meant the arena/leaderboard split was
                  described twice and the two descriptions could disagree. */}
              <main className={`relative z-[var(--z-content)] w-full grid grid-cols-1 items-start gap-8 transition-[margin,padding] duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${shouldHideClutter ? 'justify-items-center mt-0' : 'lg:grid-cols-[minmax(0,1fr)_minmax(18rem,30%)] mt-4 pb-20'}`}>
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
                  onOpenGhostModal={() => openModal('ghost')}
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
                  onProfileClick={handleOpenProfile}
                  onChallengeFriend={(uname) => {
                    // Opens a 1v1 room and shows the lobby. This used to flip
                    // `raceActive` on with no race running, which dropped the
                    // user into a keyboard-dead screen.
                    handleChallengeFriend(uname);
                  }}

                  onRemoveFriend={(uname) => friendsState.removeFriend(uname)}
                />
              </main>
            </motion.div>
          )}
        </AnimatePresence>
        )}

        {/* Floating Bottom Controls */}
        <BottomControlsDock
          shouldHideClutter={shouldHideClutter || isAcademyMode}
          theme={theme}
          activeModal={activeModal}
          isAruOpen={isAruOpen}
          onToggleAru={() => setIsAruOpen(!isAruOpen)}
          onOpenSettings={() => openModal('settings')}
          onOpenChangelog={() => openModal('changelog')}
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
          friendsState={friendsState}
          challenges={challenges}
          dailyStreak={dailyStreak}
          pbGhost={pbGhost}
          isRankedMatch={isRankedMatch}
          tetrisEffect={tetrisEffect}
          isAruOpen={isAruOpen}
          shouldHideClutter={shouldHideClutter}
          nameInput={nameInput}
          nameErr={nameErr}
          savingName={savingName}
          aruStats={aruStats}
          techAiState={techAiState}
          techModifiersMemo={techModifiersMemo}
          techCapabilities={techCapabilities}
          onCloseModal={closeModal}
          onOpenModal={openModal}
          onSelectTheme={selectTheme}

          onSelectSoundProfile={selectSoundProfile}
          onSetThemeFont={handleSetThemeFont}
          onStartWeaknessDrill={handleStartWeaknessDrill}
          onChallengeFriend={handleChallengeFriend}
          onOpenProfile={handleOpenProfile}
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
        {/*
          The dossier mounts the same `MainApp`, so navigating to it keeps the
          typing engine, the race channel and the cloud sync alive — it is a
          view swap inside the running app, not a fresh boot that would drop an
          in-progress room. Two paths: nameless for your own, named for anyone
          else's shareable link.
        */}
        <Route path="/operator" element={<AuthGuard><MainApp /></AuthGuard>} />
        <Route path="/operator/:username" element={<AuthGuard><MainApp /></AuthGuard>} />
        <Route path="/login" element={<Login />} />
        {/* Anything else is a typo or a dead bookmark — send it home rather
            than rendering a blank screen with no navigation. */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster position="top-center" theme="dark" />
    </>
  );
}