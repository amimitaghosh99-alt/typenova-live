
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-hooks/purity */
/* eslint-disable no-empty */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState, useEffect, useCallback, useRef, useMemo, lazy, Suspense } from 'react';
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

import { AudioDictationController, generateSimulatedBoundaries } from '@/lib/audioDictationEngine';
import type { PaceSample, RivalPace } from '@/components/TypingArea';
import { useModeLeaderboard, fetchRivalGhost, type ModeScoreRow, type RivalGhost } from '@/hooks/useModeLeaderboard';
import { buildModeKey, formatModeLabelLong, parseModeKey, pbStorageKeyFor, submittableModeKey } from '@/lib/modeKey';
const ResultsScreen = lazy(() => import('@/components/ResultsScreen').then(m => ({ default: m.ResultsScreen })));
const RaceResultsScreen = lazy(() => import('@/components/RaceResultsScreen').then(m => ({ default: m.RaceResultsScreen })));
const AIDrillResultsScreen = lazy(() => import('@/components/AIDrillResultsScreen').then(m => ({ default: m.AIDrillResultsScreen })));
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { appendHistory, loadHistory } from '@/lib/history';
import type { HistoryEntry } from '@/lib/history';
import { calculateCPI, calculateBurstWpm, calculateGhostDelta, type PerformanceGrade } from '@/lib/scoringEngine';
import { loadPersonalBests } from '@/lib/personalBests';
const ReplayModal = lazy(() => import('@/components/ReplayModal').then(m => ({ default: m.ReplayModal })));
import { TITLE_BADGES, getActiveTitleId, setActiveTitleId } from '@/data/titles';
import { isPatronTitle, isPatronTitleUnlocked } from '@/data/donation';
import { useChallenges } from '@/hooks/useChallenges';
import { useRace, makeRoomCode } from '@/hooks/useRace';
import { useMatchmaking } from '@/hooks/useMatchmaking';
import { useRoomDirectory } from '@/hooks/useRoomDirectory';
import { useRankedHistory } from '@/hooks/useRankedHistory';
import { mulberry32, daySeed, todayKey, isYesterday } from '@/utils/seededRandom';
import { supabase, fireAndForget } from '@/lib/supabase';
import { useAuth, AuthProvider } from '@/hooks/useAuth';
import { useCloudSync } from '@/hooks/useCloudSync';
import { ACADEMY_PROGRESS_CHANGED, onSyncEvent } from '@/lib/syncEvents';
import { readLocalProgress, writeLocalProgress } from '@/lib/progress';
import { useFriends } from '@/hooks/useFriends';
import { PracticeArena } from '@/components/PracticeArena';
import { HEX_ABILITIES, applyIncomingHex, pruneExpiredHexes, type ActiveHex, type HexType } from '@/lib/sabotageEngine';
import { LeaderboardSidebar, type BoardTab } from '@/components/LeaderboardSidebar';
import { BottomControlsDock } from '@/components/BottomControlsDock';
import { AppModalManager } from '@/components/AppModalManager';
import { TimedHud } from '@/components/TimedHud';

import { Routes, Route, Navigate, useNavigate, useParams, useLocation } from 'react-router';
const Login = lazy(() => import('@/pages/Login').then(m => ({ default: m.Login })));
const OperatorDossier = lazy(() => import('@/pages/OperatorDossier').then(m => ({ default: m.OperatorDossier })));
const OperatorAnalytics = lazy(() => import('@/pages/OperatorAnalytics').then(m => ({ default: m.OperatorAnalytics })));
const PatronVault = lazy(() => import('@/pages/PatronVault').then(m => ({ default: m.PatronVault })));
const TypeNovaStudio = lazy(() => import('@/pages/TypeNovaStudio').then(m => ({ default: m.TypeNovaStudio })));
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';
import { AnimatePresence, motion } from 'framer-motion';
import { CHANGELOG } from '@/data/changelog';

const AcademyLayout = lazy(() => import('@/components/academy/AcademyLayout').then(m => ({ default: m.AcademyLayout })));
import { useSmartDrills } from '@/hooks/useSmartDrills';
import { useWordWeakness } from '@/hooks/useWordWeakness';
import { aggregateWords, type DrillRunMeta } from '@/lib/wordWeakness';
import { useCosmetics } from '@/hooks/useCosmetics';
import { AI_KEYS } from '@/lib/aiClient';
import { CosmicNavBar } from '@/components/CosmicNavBar';
import CosmicLiquidShader from '@/components/CosmicLiquidShader';
import { useShaderConfig } from '@/hooks/useShaderConfig';
import { LobbyScreen } from '@/components/LobbyScreen';
import { CompeteEntryScreen } from '@/components/CompeteEntryScreen';
import { QuickMatchPanel } from '@/components/QuickMatchPanel';
import { RoomBrowser } from '@/components/RoomBrowser';
import { RankedHistoryPanel } from '@/components/RankedHistoryPanel';
import { RankedTeaserCard } from '@/components/RankedTeaserCard';

import { RaceTrack } from '@/components/RaceTrack';


// ─── STAGE PAGE TRANSITION VARIANTS ────────────────────────────────────
const STAGE_PAGE_ORDER: Record<string, number> = {
  practice: 0,
  compete: 1,
  academy: 2,
};

/**
 * Stage overlay transition variants.
 * Uses pure opacity cross-fade to enable direct GPU compositor alpha blending.
 * Avoiding `y` translation is critical: moving elements that contain `backdrop-filter: blur`
 * forces Chrome/Edge to re-render Gaussian blur kernels across dozens of cards on every
 * subpixel frame, which saturates GPU fill-rate and drops FPS.
 */
const STAGE_PAGE_VARIANTS = {
  enterStart: {
    opacity: 0,
    transition: { duration: 0 },
  },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.18,
      ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
    },
  },
  hidden: {
    opacity: 0,
    transition: {
      duration: 0.16,
      ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
    },
  },
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

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('settings=1')) {
      openModal('settings');
    }
  }, [openModal]);

  const [techAiState, setTechAiState] = useState({

    apiKey: localStorage.getItem(AI_KEYS.byokKey) || '',
    baseUrl: localStorage.getItem(AI_KEYS.byokUrl) || 'https://api.groq.com/openai/v1',
    model: localStorage.getItem(AI_KEYS.byokModel) || 'groq/compound-mini',
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
        model: localStorage.getItem(AI_KEYS.byokModel) || 'groq/compound-mini',
      }));
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const openTabTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const academyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stageTransitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimeoutRef.current) clearTimeout(resetTimeoutRef.current);
      if (openTabTimeoutRef.current) clearTimeout(openTabTimeoutRef.current);
      if (academyTimeoutRef.current) clearTimeout(academyTimeoutRef.current);
      if (stageTransitionTimerRef.current) clearTimeout(stageTransitionTimerRef.current);
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

  const isSabotagePreview = typeof window !== 'undefined' && window.location.search.includes('sabotage=1');
  const [testHexes, setTestHexes] = useState<ActiveHex[]>([]);
  const [testHexEnergy, setTestHexEnergy] = useState<number>(85);

  useEffect(() => {
    if (isSabotagePreview) {
      setTestHexes([
        {
          id: 'preview-hex-1',
          hexType: 'glitch_fog',
          fromName: 'CyberPhantom',
          fromId: 'rival-1',
          appliedAt: Date.now(),
          expiresAt: Date.now() + 60000,
          durationMs: 60000,
        },
      ]);
    }
  }, [isSabotagePreview]);

  useEffect(() => {
    if (!isSabotagePreview || testHexes.length === 0) return;
    const interval = setInterval(() => {
      setTestHexes(prev => pruneExpiredHexes(prev));
    }, 250);
    return () => clearInterval(interval);
  }, [isSabotagePreview, testHexes.length]);
  // A room is only advertised in the public directory when its host opted in.
  // Challenge and quick-match rooms are never listed.
  const [listRoomsPublicly, setListRoomsPublicly] = useState(() => {
    try { return localStorage.getItem('typenova_list_rooms') !== 'false'; } catch { return true; }
  });
  const [publicRoom, setPublicRoom] = useState(false);
  const { generateDrill, generateWordDrill, isGenerating: isSmartDrillGenerating } = useSmartDrills();
  const wordWeakness = useWordWeakness();
  /** Words the current drill was built to train, for SR grading on finish.
      A ref on purpose: it changes only when a drill launches, and reading it
      in the completion effect must never re-arm that effect. */
  const drillTargetWordsRef = useRef<string[]>([]);
  const [currentStage, setCurrentStageState] = useState<'practice' | 'compete' | 'academy'>('practice');
  /** The stage whose layer is fully revealed. Trails `currentStage` by one painted
      frame so a freshly-mounted stage can lay out invisibly BEFORE it fades in. */
  const [settledStage, setSettledStage] = useState<'practice' | 'compete' | 'academy'>('practice');
  const [_stageDirection, setStageDirection] = useState(1);
  /** A stage that has ever been opened keeps its layer mounted (hidden) from then
      on — remounting a full page inside the animated frames was dropping them all. */
  const [visitedStages, setVisitedStages] = useState<Record<'practice' | 'compete' | 'academy', boolean>>({ practice: true, compete: false, academy: false });
  const [isStageTransitioning, setIsStageTransitioning] = useState(false);
  const isAcademyMode = currentStage === 'academy';

  /** True once a full-cover stage overlay (Academy, or the Compete lobby) has
      finished fading in. Behind those overlays the background shader is pure
      invisible cost — a full-viewport fragment shader sampled by stacked
      `backdrop-blur` panels, so every shader frame forces the GPU to re-blur
      every glass panel. Pausing it while covered removes that whole pipeline.
      Gated 320ms after entering (> the 200ms fade) so the transition itself
      still plays over the live background; resumes instantly on exit. */
  const [stageOverlaySettled, setStageOverlaySettled] = useState(false);
  const stageOverlayCoversArena = currentStage === 'academy' || (currentStage === 'compete' && !raceActive);
  useEffect(() => {
    if (!stageOverlayCoversArena) {
      setStageOverlaySettled(false);
      return;
    }
    const timer = setTimeout(() => setStageOverlaySettled(true), 320);
    return () => clearTimeout(timer);
  }, [stageOverlayCoversArena]);

  // Idle preload of Academy & Compete modules so opening any stage is instantaneous with zero stutter
  useEffect(() => {
    const timer = setTimeout(() => {
      import('@/components/academy/AcademyLayout');
      import('@/components/CompeteEntryScreen');
      import('@/components/RoomBrowser');
      import('@/components/RankedTeaserCard');
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  /**
   * Single writer for every stage switch (all call sites — `switchStage` is an
   * alias). Derives the slide direction SYNCHRONOUSLY; the old useEffect did it
   * one commit later, forcing a second render right as the transition started.
   */
  const currentStageRef = useRef(currentStage);
  const setCurrentStage = useCallback((nextStage: 'practice' | 'compete' | 'academy') => {
    const prevStage = currentStageRef.current;
    if (prevStage === nextStage) return;
    currentStageRef.current = nextStage;
    setStageDirection(STAGE_PAGE_ORDER[nextStage] >= STAGE_PAGE_ORDER[prevStage] ? 1 : -1);
    setVisitedStages(prev => (prev[nextStage] ? prev : { ...prev, [nextStage]: true }));

    // Temporarily pause background WebGL simplex noise shader during the transition window
    // to free 100% of GPU compute for Framer Motion and the compositor.
    if (stageTransitionTimerRef.current) clearTimeout(stageTransitionTimerRef.current);
    setIsStageTransitioning(true);
    stageTransitionTimerRef.current = setTimeout(() => {
      setIsStageTransitioning(false);
    }, 240);

    // Warm stages settle immediately with zero 2-RAF latency
    if (visitedStages[nextStage]) {
      setSettledStage(nextStage);
    }
    setCurrentStageState(nextStage);
  }, [visitedStages]);
  const switchStage = setCurrentStage;

  /** Reveal the freshly-mounted stage only after it has painted once, invisible.
      The cross-fade then runs against an idle compositor — zero mount work in the
      animated frames, which is what killed the old AnimatePresence transition. */
  useEffect(() => {
    if (settledStage === currentStage) return;
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setSettledStage(currentStage));
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [currentStage, settledStage]);

  /**
   * The dossier is a route now, so the operator on screen comes from the URL
   * rather than from state. `MainApp` is mounted for `/`, `/operator` and
   * `/operator/:username` alike — the path is what decides whether the dossier
   * page is showing, which is what makes back/forward and a shared link work.
   */
  const navigate = useNavigate();
  const { username: routeProfileUsername } = useParams<{ username?: string }>();
  const location = useLocation();
  const isAnalytics = location.pathname.endsWith('/analytics');
  const donateOpen = location.pathname === '/donate';
  const studioOpen = location.pathname === '/studio' || location.pathname === '/showcase';
  const dossierOpen = location.pathname.startsWith('/operator') && !isAnalytics;
  const analyticsOpen = isAnalytics;
  /** Null when the URL carries no name, i.e. "my own dossier". */
  const selectedProfileUsername = routeProfileUsername ?? null;

  const enterAcademy = useCallback(() => {
    switchStage('academy');
    if (location.pathname !== '/') {
      navigate('/');
    }
  }, [switchStage, location.pathname, navigate]);

  interface LeaderboardRow {
    username: string;
    wpm: number;
    accuracy: number;
  }

  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [dailyBoard, setDailyBoard] = useState<LeaderboardRow[]>([]);
  const [friendsBoard, setFriendsBoard] = useState<LeaderboardRow[]>([]);
  const [boardTab, setBoardTab] = useState<BoardTab>('alltime');
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
  const shaderConfig = useShaderConfig();

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
  const cosmetics = useCosmetics(
    cloud.username,
    supabase,
    auth.user?.user_metadata?.avatar_url ?? auth.user?.user_metadata?.picture ?? null
  );

  const [activeTitle, setActiveTitle] = useState(() => {
    const cur = getActiveTitleId();
    if (isPatronTitle(cur) && !isPatronTitleUnlocked(cur)) {
      setActiveTitleId('novice');
      return 'novice';
    }
    return cur;
  });

  useEffect(() => {
    const handleTitleChange = () => {
      const cur = getActiveTitleId();
      if (isPatronTitle(cur) && !isPatronTitleUnlocked(cur)) {
        setActiveTitleId('novice');
        setActiveTitle('novice');
      } else {
        setActiveTitle(cur);
      }
    };
    window.addEventListener('titleChanged', handleTitleChange);
    window.addEventListener('patronTitlesUpdated', handleTitleChange);
    return () => {
      window.removeEventListener('titleChanged', handleTitleChange);
      window.removeEventListener('patronTitlesUpdated', handleTitleChange);
    };
  }, []);

  const isLoggedIn = !!auth.session;
  const levelOptions = useMemo(() => (["NOVICE", "ADEPT", "MASTER", "QUOTES", "CODE", "CUSTOM", "DICTATION"] as Level[]).map(l => ({
    label: l === 'DICTATION' ? 'AUDIO' : l,
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
    if (!dossierOpen && !analyticsOpen) return undefined;
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
      // The dossier draws the key heatmap now — the standalone stats modal that
      // used to own it is gone.
      heatmap: rpg.heatmapData,
      wordWeakness: wordWeakness.map,
      wordWeaknessDue: wordWeakness.due,
      skillStats: {
        maxWpm: h.length ? Math.max(...h.map((e) => e.wpm)) : 0,
        avgAccuracy: recent.length ? Math.round(recent.reduce((a, e) => a + e.acc, 0) / recent.length) : 0,
        dailyStreak,
        testsCompleted: rpg.testsCompleted,
        racesWon,
        totalWordsTyped: h.reduce((a, e) => a + e.size, 0),
        bestCombo: rpg.bestCombo,
        avgConsistency: recent.length ? Math.round(recent.reduce((a, e) => a + (e.cons ?? 100), 0) / recent.length) : 0,
      }
    };
  }, [dossierOpen, analyticsOpen, cloud.username, selectedProfileUsername, rpg.userLevel, rpg.xp, rpg.currentLevelProgress, rpg.xpNeeded, rpg.testsCompleted, rpg.bestCombo, rpg.unlockedAchievements, rpg.heatmapData, dailyStreak, racesWon, wordWeakness.map, wordWeakness.due]);

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
      // Everyone counts down to the SAME absolute timestamp. The lobby already
      // ran a visible 5→1 countdown, so this 1.5s buffer is purely for network
      // sync. We still use COUNTDOWN phase so the RaceTrack header shows
      // "STARTING IN…", but the giant AppModalManager overlay is suppressed
      // during races (see below).
      typing.scheduleStart(startAt);
      typing.setCountdownTimer(Math.max(1, Math.ceil((startAt - Date.now()) / 1000)));
      typing.setPhase('COUNTDOWN');
    },
  });

  const handleChallengeFriend = useCallback((
    friendUsername: string,
    config?: { mode?: Level; words?: number; language?: CodeLanguage }
  ) => {
    if (!cloud.username) return;
    const roomCode = makeRoomCode();
    race.createRoom(cloud.username, 2, undefined, cloud.elo, roomCode, auth.user?.id, false, activeTitle);
    setPublicRoom(false); // a private duel with one named friend
    if (config) {
      race.updateLobbyConfig(config);
    }
    challenges.sendChallenge(friendUsername, roomCode, cloud.elo, config);
    const modeLabel = config ? `${config.mode}${config.words ? ` (${config.words}w)` : ''}` : '';
    toast.success(`Challenge ${modeLabel} sent to ${friendUsername}! Waiting…`);
    closeModal();
    setRaceActive(false);
    setCurrentStage('compete');
  }, [cloud.username, cloud.elo, race.createRoom, race.updateLobbyConfig, auth.user?.id, challenges.sendChallenge, closeModal, activeTitle]);

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
      race.joinRoom(roomCode, cloud.username || 'Player', cloud.elo, auth.user?.id, false, activeTitle);
      // Clean up URL so it doesn't linger
      window.history.replaceState({}, '', window.location.pathname);
    }
    // Depends on `race.joinRoom` (stable), not on the whole `race` object —
    // that was rebuilt every render, so this re-ran on every keystroke.
  }, [cloud.username, cloud.elo, auth.user?.id, race.joinRoom, activeTitle]);

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
        bestCombo: rpg.bestCombo,
        avgConsistency: (() => { const h: HistoryEntry[] = loadHistory().slice(-20); return h.length ? Math.round(h.reduce((a: number, e: HistoryEntry) => a + (e.cons ?? 100), 0) / h.length) : 0; })(),
      };
      const activeId = activeTitle;
      const unlocked = TITLE_BADGES.filter((b) => {
        if (isPatronTitle(b.id)) {
          return isPatronTitleUnlocked(b.id);
        }
        return b.isUnlocked(stats);
      }).map((b) => b.id);

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
  }, [rpg.xp, rpg.userLevel, rpg.testsCompleted, rpg.bestCombo, rpg.unlockedAchievements, rpg.heatmapData, dailyStreak, racesWon, cloud.status, cloud.pushProgress, cloud.username, activeTitle]);

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
    numbers?: boolean; punctuation?: boolean; codeLanguage?: CodeLanguage;
    dictationSpeed?: number; dictationTrackId?: string; daily?: boolean;
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
    const nextDictationTrackId = overrides.dictationTrackId ?? cfg.dictationTrackId;
    const nextDaily = overrides.daily ?? cfg.dailyActive;
    const nextCustom = cfg.customText;

    // Timed tests need a deep word buffer (240 words for 60s ≈ 240 WPM ceiling)
    const length = nextMode === 'time' ? nextDuration * 4 : nextCount;

    if (resetTimeoutRef.current) clearTimeout(resetTimeoutRef.current);

    typing.resetEngine();
    typing.setTargetText(generateText(nextLevel, length, nextCustom, nextMirror, {
      numbers: nextNumbers,
      punctuation: nextPunct,
      codeLanguage: nextCodeLanguage,
      dictationTrackId: nextDictationTrackId,
      isDaily: nextDaily,
      rng: nextDaily ? mulberry32(daySeed()) : undefined,
    }));
    typing.setPhase('CONFIGURING');

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
  const submitUsername = useCallback(async () => {
    const name = nameInput.trim();
    if (name.length < 2) { setNameErr('At least 2 characters'); return; }
    setSavingName(true);
    setNameErr('');
    const res = await cloud.saveUsername(name);
    setSavingName(false);
    if (!res.ok) setNameErr(res.error || 'Failed');
  }, [nameInput, cloud.saveUsername]);

  // ─── Real-Time Audio Transcription Shadowing ─────────────────────
  const [dictationSpokenIndex, setDictationSpokenIndex] = useState(0);
  const dictationControllerRef = useRef<AudioDictationController | null>(null);

  useEffect(() => {
    dictationControllerRef.current = new AudioDictationController();
    return () => {
      dictationControllerRef.current?.stop();
    };
  }, []);

  useEffect(() => {
    if (typing.phase === 'TYPING' && game.level === 'DICTATION') {
      if (!dictationControllerRef.current) {
        dictationControllerRef.current = new AudioDictationController();
      }
      dictationControllerRef.current.setSpeed(game.dictationSpeed);
      typing.setDictationSpeed(game.dictationSpeed);

      // Immediately seed baseline boundaries so calculateStats always has valid baseline
      const seedBoundaries = generateSimulatedBoundaries(typing.targetText, game.dictationSpeed);
      typing.setSpokenBoundaries(seedBoundaries);

      dictationControllerRef.current.start(typing.targetText, (_boundary, idx) => {
        setDictationSpokenIndex(idx);
        typing.setSpokenBoundaries(dictationControllerRef.current?.getBoundaries(typing.targetText) || seedBoundaries);
      });
    } else {
      dictationControllerRef.current?.stop();
      if (typing.phase === 'FINISHED' && game.level === 'DICTATION') {
        const finalBoundaries = dictationControllerRef.current?.getBoundaries(typing.targetText) || [];
        if (finalBoundaries.length > 0) {
          typing.setSpokenBoundaries(finalBoundaries);
        }
      }
    }
  }, [typing.phase, game.level, game.dictationSpeed, typing.targetText]);

  // ─── Drills (single-key micro + heatmap smart) ───────────────────
  const launchDrill = useCallback((text: string, meta?: DrillRunMeta) => {
    drillTargetWordsRef.current = meta?.targetWords ?? [];
    typing.resetEngine();
    game.setMicroDrillActive(true);
    typing.setTargetText(text);
    typing.setPhase('CONFIGURING');
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
      toast.error('Not enough data! Play a few rounds first to generate weak keys.');
      return;
    }

    try {
      const result = await generateDrill(targetKeys);
      launchDrill(result.text);
    } catch (err) {
      toast.error('Failed to generate drill. Is Aru offline?');
    }
  }, [smartDrillKeys, generateDrill, launchDrill]);

  // ─── Word-weakness drills (dossier panel, practice badge, Academy trainer) ───
  const startWordDrill = useCallback(async (words: string[]) => {
    if (words.length === 0) {
      toast.error('No weak words yet — finish a few runs first.');
      return;
    }
    try {
      const result = await generateWordDrill(words);
      launchDrill(result.text, { targetWords: words });
    } catch {
      toast.error('Failed to generate word drill. Is Aru offline?');
    }
  }, [generateWordDrill, launchDrill]);

  const startDueWordsDrill = useCallback(() => {
    void startWordDrill(wordWeakness.due.slice(0, 10));
  }, [startWordDrill, wordWeakness.due]);

  const exitMicroDrill = useCallback(() => {
    drillTargetWordsRef.current = [];
    game.setMicroDrillActive(false);
    handleResetRef.current({});
  }, [game]);

  // ─── Personal Best (ghost pacer data) ────────────────────────────
  // One canonical mode identity drives the PB ghost key, the per-mode board and
  // the rival ghost lookup, so all three always describe the same test config.
  const modeKey = buildModeKey(game.level, game.testMode, game.duration, game.wordCount);
  const pbStorageKey = pbStorageKeyFor(modeKey);
  const pbGhost = useMemo((): { wpm: number; accuracy?: number; consistency?: number; flawlessStreak?: number; samples: PaceSample[] } | null => {
    if (game.level === 'CUSTOM' || game.mirroredMode || game.dailyActive) return null;
    try { return JSON.parse(localStorage.getItem(pbStorageKey) || 'null'); } catch { return null; }
    // typing.phase is a deliberate extra dep: reload the PB after each finish

  }, [pbStorageKey, game.level, game.mirroredMode, game.dailyActive, typing.phase]);

  // ─── Ghost Net (per-mode boards + rival ghosts) ──────────────────
  // `null` for configs that never reach a shared board (custom text, mirrored
  // runs, the daily challenge), which also disables the board and rival picker.
  const boardModeKey = submittableModeKey({
    level: game.level,
    testMode: game.testMode,
    duration: game.duration,
    wordCount: game.wordCount,
    dailyActive: game.dailyActive,
    mirroredMode: game.mirroredMode,
  });
  const {
    rows: modeBoard,
    loading: modeBoardLoading,
    unavailable: modeBoardUnavailable,
    refresh: refreshModeBoard,
  } = useModeLeaderboard(boardModeKey);

  const [rivalGhost, setRivalGhost] = useState<RivalGhost | null>(null);
  const [rivalPendingId, setRivalPendingId] = useState<string | null>(null);
  /**
   * Which mode the armed curve belongs to.
   *
   * A ref rather than state because only the disarm effect below reads it, and
   * as a dependency it would re-run that effect on every arm — which is exactly
   * the thing it must not do.
   */
  const rivalModeKeyRef = useRef<string | null>(null);

  // A ghost is only comparable within the mode it was recorded in, so changing
  // the config disarms it rather than racing a curve for a different test.
  //
  // Guarded on the armed curve's own mode: this used to clear unconditionally,
  // which meant arming a ghost *and* switching to its mode in one action — what
  // "race this run" from an operator's dossier does — armed the ghost and then
  // immediately threw it away on the next commit.
  useEffect(() => {
    if (rivalModeKeyRef.current && rivalModeKeyRef.current === boardModeKey) return;
    rivalModeKeyRef.current = null;
    setRivalGhost(null);
    setRivalPendingId(null);
  }, [boardModeKey]);

  const handleSelectRival = useCallback(async (row: ModeScoreRow) => {
    if (!boardModeKey) return;
    // Re-picking the armed rival clears it, so the same row toggles.
    if (rivalGhost?.userId === row.user_id) {
      rivalModeKeyRef.current = null;
      setRivalGhost(null);
      return;
    }
    setRivalPendingId(row.user_id);
    const ghost = await fetchRivalGhost(boardModeKey, row.user_id);
    setRivalPendingId(null);
    if (!ghost) {
      toast.error(`No replayable ghost stored for ${row.username} yet.`);
      return;
    }
    rivalModeKeyRef.current = boardModeKey;
    setRivalGhost(ghost);
    game.setGhostMode('rival');
    game.setGhostPacer(true);
    toast.success(`Ghost armed — ${ghost.username} @ ${ghost.wpm} WPM`);
  }, [boardModeKey, rivalGhost?.userId, game]);

  // The typing area only needs the pace, and only while 'rival' is selected.
  const activeRivalPace: RivalPace | null = game.ghostMode === 'rival' ? rivalGhost : null;

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
            // Ghost Net: partitions the score onto this mode's board and lets
            // the RPC derive and store the replayable pace curve for the run.
            p_mode_key: boardModeKey,
            p_consistency: Math.round(typing.consistency),
          }).then(({ error }) => {
            if (error) setSaveStatus(`Error: ${error.message}`);
            else {
              setSaveStatus('SCORE SAVED!');
              fetchLeaderboard();
              if (game.dailyActive) fetchDailyBoard();
              if (boardModeKey) refreshModeBoard();
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
    boardModeKey,
    cloud.username,
    fetchDailyBoard,
    fetchLeaderboard,
    finishDurationMs,
    game.dailyActive,
    game.level,
    game.microDrillActive,
    refreshModeBoard,
    supabase,
    typing.accuracy,
    typing.consistency,
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
    const stats = typing.calculateStats(statsInput, timeMs, typing.timePenalty, typing.startTime, true);
    const isCustom = game.level === 'CUSTOM';

    // Timed tests are rewarded/judged by what was actually typed, not the
    // oversized text buffer they run against.
    const isTimed = game.testMode === 'time';
    const typedWords = statsInput.trim() ? statsInput.trim().split(/\s+/).length : 0;
    const effWordCount = isTimed ? typedWords : (game.dailyActive ? typing.targetText.trim().split(/\s+/).length : game.wordCount);
    const effLength = isTimed ? statsInput.length : typing.targetText.length;

    // Quest Progression (custom mode excluded)
    if (stats.currentWpm > 0 && !isCustom) {
      quests.progressQuest('words_typed', Math.round(stats.currentWpm * (timeMs / 60000)));
      quests.progressQuest('wpm_achieved', stats.currentWpm);
      quests.progressQuest('acc_achieved', stats.currentAcc);
    }

    const rawErrors = typing.keystrokeLog.current.filter(k => k.isError && !k.isBackspace).length;
    const result = rpg.processRPG(
      stats.currentWpm, stats.currentAcc, typing.maxCombo,
      effWordCount, effLength,
      game.microDrillActive || isCustom, typing.keystrokeLog.current,
      () => audio.playSound('levelup'),
      stats.consistency,
      rawErrors
    );

    // Word-weakness aggregation. Every completed run counts — races included;
    // CUSTOM excluded, because the player supplied that text so its words are
    // not fair practice data (same exclusion as appendHistory). Drill runs
    // additionally grade their target words into the Leitner schedule; the
    // grade is scheduling-only, so no keystroke is ever counted twice.
    if (!isCustom && typing.targetText && typing.keystrokeLog.current.length > 0) {
      const aggregates = aggregateWords(typing.targetText, typing.keystrokeLog.current);
      if (aggregates.length > 0) {
        wordWeakness.recordRun(aggregates);
        if (game.microDrillActive && drillTargetWordsRef.current.length > 0) {
          const errorPerWord: Record<string, boolean> = {};
          for (const a of aggregates) errorPerWord[a.word] = a.errors > 0;
          wordWeakness.gradeDrill(drillTargetWordsRef.current, errorPerWord);
        }
      }
    }

    // Daily Challenge streak (only awarded for completed runs with valid precision)
    let streakNow = dailyStreak;
    if (game.dailyActive && !game.microDrillActive && !isCustom) {
      if (stats.currentWpm > 0 && stats.currentAcc >= 50) {
        const today = todayKey();
        let prevDaily: { lastDay: string; streak: number } | null = null;
        try { prevDaily = JSON.parse(localStorage.getItem('typezen_daily') || 'null'); } catch { /* corrupt — treat as fresh */ }
        if (prevDaily?.lastDay === today) streakNow = prevDaily.streak;
        else if (prevDaily && isYesterday(prevDaily.lastDay)) streakNow = prevDaily.streak + 1;
        else streakNow = 1;
        localStorage.setItem('typezen_daily', JSON.stringify({ lastDay: today, streak: streakNow }));

        setDailyStreak(streakNow);
      }
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
            accuracy: stats.currentAcc,
            consistency: stats.consistency,
            flawlessStreak: typing.flawlessStreak,
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
        isTimed, streakNow,
        stats.consistency
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
  const shouldHideClutter = isTypingOrCountdown;
  const progressPercent = typing.targetText.length > 0 ? (typing.input.length / typing.targetText.length) * 100 : 0;
  // Fixed-text levels have no meaningful word/time budget
  const lengthLocked = game.level === 'CODE' || game.level === 'CUSTOM' || game.level === 'QUOTES' || game.level === 'DICTATION';
  // Number/punctuation mixing only applies to the plain word pools
  const mutatable = game.level === 'NOVICE' || game.level === 'ADEPT';

  // Width is owned by the parent grid's column definition now — this only
  // controls the collapse animation. It used to also carry `lg:w-[30%]` and
  // `shrink-0`, which fought with the arena's own `lg:w-[70%]` and left a
  // rounding gap between the two panels at several widths.
  const leaderboardClass = `transition-[opacity,transform] duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] will-change-[opacity,transform] glass-panel rounded-[2rem] overflow-hidden ${shouldHideClutter ? 'w-0 opacity-0 translate-x-12 pointer-events-none p-0 border-transparent m-0 hidden lg:hidden' : 'w-full p-6 md:p-8 opacity-100 translate-x-0'
    }`;

  // ====== MEMOIZED HANDLERS FOR MODALS ======
  const handleRaceCreate = useCallback((name: string, size?: number, isRanked?: boolean, roomCode?: string, isPublic?: boolean) => {
    setIsRankedMatch(!!isRanked);
    // Defaults to unlisted: paths that don't ask for a public room (quick match,
    // challenges) must never leak one into the directory.
    setPublicRoom(!!isPublic);
    race.createRoom(name, size, undefined, cloud.elo, roomCode, auth.user?.id, !!isRanked, activeTitle);
  }, [race.createRoom, cloud.elo, auth.user?.id, activeTitle]);
  const handleRaceJoin = useCallback((code: string, name: string, isRanked?: boolean) => {
    setIsRankedMatch(!!isRanked);
    race.joinRoom(code, name, cloud.elo, auth.user?.id, !!isRanked, activeTitle);
  }, [race.joinRoom, cloud.elo, auth.user?.id, activeTitle]);

  const handleAcceptChallenge = useCallback(async () => {
    const roomCode = await challenges.acceptChallenge();
    if (roomCode) {
      handleRaceJoin(roomCode, cloud.username || 'Player', true);
      closeModal();
      setRaceActive(false);
      setCurrentStage('compete');
      toast.success('Entering duel room...');
    }
  }, [challenges, handleRaceJoin, cloud.username, closeModal, setCurrentStage]);

  const handleDeclineChallenge = useCallback(async () => {
    await challenges.rejectChallenge();
  }, [challenges]);

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
    toast.success(`Matched with ${mm.opponentName || 'an opponent'}!`);
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
   * Invite a friend into the room this client is already in.
   *
   * Distinct from `handleChallengeFriend`, which creates a *new* 2-seat room and so
   * cannot be used from inside an existing lobby — which is why the lobby's only
   * invite affordances were clipboard copies. Same `challenge_invite` broadcast,
   * but carrying the live room code, so accepting drops the friend into this room.
   *
   * The room's current config rides along so the incoming prompt can state what it
   * is inviting them to rather than showing a bare code.
   */
  const handleInviteFriendToRoom = useCallback((friendUsername: string) => {
    if (!cloud.username || !race.code) return;
    challenges.sendChallenge(friendUsername, race.code, cloud.elo, race.lobbyConfig);
    toast.success(`Invite sent to ${friendUsername}`);
  }, [cloud.username, cloud.elo, race.code, race.lobbyConfig, challenges.sendChallenge]);

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

  /**
   * Loads a drill generated on the dossier and leaves for the arena.
   *
   * The dossier is a route, not a dialog, so unlike `handleStartWeaknessDrill`
   * this cannot just close a modal — without the navigate the drill would be
   * staged in a typing engine sitting behind a full-screen page.
   */
  const handleStartDossierDrill = useCallback((drillText: string) => {
    launchDrill(drillText);
    setCurrentStage('practice');
    navigate('/', { replace: false });
  }, [launchDrill, navigate]);

  const handleStartDossierWordDrill = useCallback(async (words: string[]) => {
    await startWordDrill(words);
    setCurrentStage('practice');
    navigate('/', { replace: false });
  }, [startWordDrill, navigate]);

  /**
   * Races a stored board run, armed from an operator's dossier.
   *
   * Every row on a mode board carries the pace curve of the exact attempt that
   * set it, so any dossier's "best runs" list is a list of raceable opponents —
   * including your own, where the curve is your personal best in that mode.
   *
   * The order matters. A ghost is only comparable inside the mode it was
   * recorded in, so the arena is switched to that mode first and the curve armed
   * second; the disarm effect keys on the board mode, and arming before the
   * switch would clear the ghost on the next commit.
   */
  const handleRaceOperatorGhost = useCallback(async (
    modeKey: string,
    operatorId: string,
    username: string,
  ) => {
    const parsed = parseModeKey(modeKey);
    if (!parsed) return;

    const ghost = await fetchRivalGhost(modeKey, operatorId);
    if (!ghost) {
      toast.error(`No replayable ghost stored for ${username} in ${formatModeLabelLong(modeKey)}.`);
      return;
    }

    const level = parsed.level as Level;
    game.setDailyActive(false);
    game.setMirroredMode(false);
    game.setLevel(level);
    game.setTestMode(parsed.testMode);
    if (parsed.testMode === 'time') game.setDuration(parsed.size);
    else game.setWordCount(parsed.size);
    // One reset for the whole config change. The `change*` helpers each reset on
    // their own, so calling four of them would rebuild the passage four times
    // from four partially-applied configs.
    handleResetRef.current({
      level,
      testMode: parsed.testMode,
      duration: parsed.testMode === 'time' ? parsed.size : undefined,
      wordCount: parsed.testMode === 'words' ? parsed.size : undefined,
      daily: false,
      mirrored: false,
    });

    rivalModeKeyRef.current = modeKey;
    setRivalGhost(ghost);
    game.setGhostMode('rival');
    game.setGhostPacer(true);

    setCurrentStage('practice');
    navigate('/', { replace: false });
    toast.success(`Ghost armed — ${ghost.username} @ ${ghost.wpm} WPM`);
  }, [game, navigate]);


  const exitAcademy = useCallback(() => {
    switchStage('practice');
  }, [switchStage]);

  /* ── Stage-switch render freeze ──────────────────────────────────────────
     CompeteEntryScreen / LobbyScreen / AcademyLayout are memoized now. While
     their stage is hidden, these stable prop identities let React bail out of
     the whole hidden subtree on every App commit — so a stage switch only
     pays to render the layer that is actually animating, not both idle
     stages plus the arena. Without this, every switch committed the full
     Compete tree (RoomBrowser, RankedHistoryPanel) and Academy tree
     (CyberHands, VirtualKeyboard) right inside the animation window. */
  const handleCompeteHostCode = useCallback((targetCode: string) => {
    handleRaceCreate(cloud.username || 'Player', race.roomSize || 4, false, targetCode, listRoomsPublicly);
  }, [handleRaceCreate, cloud.username, race.roomSize, listRoomsPublicly]);
  const handleCompeteCreate = useCallback((size: number, isRanked: boolean) => {
    handleRaceCreate(cloud.username || 'Player', size, isRanked, undefined, listRoomsPublicly);
  }, [handleRaceCreate, cloud.username, listRoomsPublicly]);
  const handleHostPublicRoom = useCallback(() => {
    if (!listRoomsPublicly) {
      setListRoomsPublicly(true);
      setPublicRoom(true);
      try { localStorage.setItem('typenova_list_rooms', 'true'); } catch { }
    }
    handleRaceCreate(cloud.username || 'Player', race.roomSize || 4, false, undefined, true);
  }, [handleRaceCreate, cloud.username, race.roomSize, listRoomsPublicly]);
  const handleCompeteJoin = useCallback((targetCode: string) => {
    handleRaceJoin(targetCode, cloud.username || 'Player');
  }, [handleRaceJoin, cloud.username]);
  const handleCompeteBack = useCallback(() => setCurrentStage('practice'), [setCurrentStage]);
  const handleLobbyStart = useCallback(() => {
    const cfg = race.lobbyConfig;
    const text = generateText(cfg.mode, cfg.words, '', false, { codeLanguage: cfg.language });
    handleRaceStart(text);
  }, [race.lobbyConfig, handleRaceStart]);

  const competeQuickMatchSlot = useMemo(() => (
    <QuickMatchPanel
      theme={theme}
      state={matchmaking.state}
      elo={cloud.elo ?? 1000}
      isLoggedIn={isLoggedIn}
      available={!!supabase}
      onSearch={handleQuickMatch}
      onCancel={matchmaking.cancel}
    />
  ), [theme, matchmaking.state, matchmaking.cancel, cloud.elo, isLoggedIn, handleQuickMatch]);

  const competeSidebarSlot = useMemo(() => (
    <>
      <RoomBrowser
        theme={theme}
        rooms={roomDirectory.rooms}
        busy={race.status === 'joining'}
        joiningCode={race.status === 'joining' ? race.code : null}
        connected={roomDirectory.connected}
        listPublicly={listRoomsPublicly}
        onToggleListPublicly={toggleListRoomsPublicly}
        onJoin={handleCompeteJoin}
        onRefresh={roomDirectory.refresh}
        onHostPublicRoom={handleHostPublicRoom}
      />
      {isLoggedIn && !rankedHistory.unavailable ? (
        <RankedHistoryPanel
          theme={theme}
          matches={rankedHistory.matches}
          loading={rankedHistory.loading}
          elo={cloud.elo ?? 1000}
        />
      ) : (
        <RankedTeaserCard
          theme={theme}
          onSignIn={handleSignIn}
        />
      )}
    </>
  ), [theme, roomDirectory.rooms, roomDirectory.connected, roomDirectory.refresh, race.status, race.code, listRoomsPublicly, toggleListRoomsPublicly, handleCompeteJoin, handleHostPublicRoom, isLoggedIn, rankedHistory.unavailable, rankedHistory.matches, rankedHistory.loading, cloud.elo, handleSignIn]);



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

  // ─── Memoized Shell Callbacks & Modal Slices (Tier 2 Keystroke Boundary Optimization) ───
  const EMPTY_TIMELINE = useMemo<ReturnType<typeof useTypingEngine>['timelinePoints']>(() => [], []);
  const modalTyping = useMemo(() => ({
    phase: typing.phase,
    countdownTimer: typing.countdownTimer,
    setPhase: typing.setPhase,
    setCountdownTimer: typing.setCountdownTimer,
    timelinePoints: activeModal === 'expandedGraph' ? typing.timelinePoints : EMPTY_TIMELINE,
    wpm: activeModal === 'expandedGraph' ? typing.wpm : 0,
  }), [typing.phase, typing.countdownTimer, typing.setPhase, typing.setCountdownTimer, activeModal, typing.timelinePoints, typing.wpm, EMPTY_TIMELINE]);

  const handleOpenPractice = useCallback(() => {
    switchStage('practice');
    if (location.pathname !== '/') {
      navigate('/');
    }
  }, [switchStage, navigate, location.pathname]);

  const handleOpenTrophies = useCallback(() => {
    closeModal();
    if (location.pathname === '/operator' || location.pathname.startsWith('/operator/')) {
      const el = document.getElementById('hall-of-legends');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        window.history.replaceState(null, '', `${location.pathname}#hall-of-legends`);
        return;
      }
    }
    navigate('/operator#hall-of-legends');
  }, [closeModal, navigate, location.pathname]);

  const handleOpenRace = useCallback(() => {
    setRaceActive(false);
    switchStage('compete');
    if (location.pathname !== '/') {
      navigate('/');
    }
  }, [switchStage, navigate, location.pathname]);

  const handleOpenSocial = useCallback(() => {
    if (isLoggedIn) openModal('social');
    else toast.error("Sign in to view Community!", { icon: <Lock size={14} /> });
  }, [isLoggedIn, openModal]);

  const handleOpenComms = useCallback(() => {
    if (isLoggedIn) openModal('comms');
    else toast.error("Sign in to use Comms!", { icon: <Lock size={14} /> });
  }, [isLoggedIn, openModal]);

  const handleOpenSettings = useCallback(() => {
    openModal('settings');
  }, [openModal]);

  const handleOpenDailyQuests = useCallback(() => {
    openModal('quests');
  }, [openModal]);

  const handleToggleAru = useCallback(() => {
    setIsAruOpen(prev => !prev);
  }, []);

  const handleOpenChangelog = useCallback(() => {
    openModal('changelog');
  }, [openModal]);

  const handleOpenWhatsNew = useCallback(() => {
    openModal('whatsNew');
  }, [openModal]);

  // Auto-display What's New update popup on first visit after a release
  useEffect(() => {
    if (raceActive || donateOpen) return;
    try {
      const seenVersion = localStorage.getItem('typenova_seen_version');
      if (seenVersion !== 'v3.0.0') {
        openModal('whatsNew');
      }
    } catch {
      // Ignore localStorage restrictions
    }
  }, [raceActive, donateOpen, openModal]);

  const handleBoardTabChange = useCallback((tab: BoardTab) => {
    setBoardTab(tab);
    if (tab === 'today') fetchDailyBoard();
    if (tab === 'mode') refreshModeBoard();
  }, [fetchDailyBoard, refreshModeBoard]);

  const handleBoardChallengeFriend = useCallback((uname: string) => {
    handleChallengeFriend(uname);
  }, [handleChallengeFriend]);

  const handleBoardRemoveFriend = useCallback((uname: string) => {
    friendsState.removeFriend(uname);
  }, [friendsState.removeFriend]);

  const handleArenaChangeLevel = useCallback((val: string) => {
    handleChangeLevel(val as Level);
  }, [handleChangeLevel]);

  const handleArenaChangeCountOrDuration = useCallback((val: string | number) => {
    handleChangeCountOrDuration(Number(val));
  }, [handleChangeCountOrDuration]);

  const handleArenaChangeCodeLanguage = useCallback((val: string) => {
    handleChangeCodeLanguage(val as CodeLanguage);
  }, [handleChangeCodeLanguage]);

  const handleArenaSetCustomTargetText = useCallback((text: string) => {
    typing.setTargetText(text);
  }, [typing.setTargetText]);

  const handleArenaOpenGhostModal = useCallback(() => {
    openModal('ghost');
  }, [openModal]);

  const handleArenaReset = useCallback(() => {
    handleReset();
  }, [handleReset]);

  const handleArenaCastHex = useCallback((hex: HexType) => {
    if (isSabotagePreview) {
      const ability = HEX_ABILITIES[hex];
      if (testHexEnergy < ability.cost) return false;
      setTestHexEnergy(e => Math.max(0, e - ability.cost));
      if (hex === 'cleanse_shield') {
        setTestHexes(prev => applyIncomingHex({
          activeHexes: prev,
          incomingHex: { id: `shield-${Date.now()}`, hexType: 'cleanse_shield', fromName: 'Self', fromId: 'self', appliedAt: Date.now(), durationMs: 4000 }
        }).updatedHexes);
      } else {
        setTestHexes(prev => [...prev, { id: `hex-${Date.now()}`, hexType: hex, fromName: 'CyberPhantom', fromId: 'rival', appliedAt: Date.now(), expiresAt: Date.now() + ability.durationMs, durationMs: ability.durationMs }]);
      }
      return true;
    }
    return race.castHex(hex);
  }, [isSabotagePreview, testHexEnergy, race.castHex]);

  const handleArenaPlaySfx = useCallback((sfx: 'hex_cast' | 'cleanse') => {
    audio.playSound(sfx);
  }, [audio]);

  const handlePlayPreviewSound = useCallback((key?: string) => {
    if (key) audio.setSoundProfile(key);
    audio.playSound('key');
  }, [audio]);


  // ─── Render ──────────────────────────────────────────────────────
  const isResultsPreview = typeof window !== 'undefined' && window.location.search.includes('results=1');

  if (typing.phase === 'FINISHED' || isResultsPreview) {
    let ghostTimeline: Array<{ t: number; wpm: number }> | null = null;
    let ghostLabel = '';
    let ghostDeltaS: number | undefined = undefined;
    let ghostDeltaAcc: number | undefined = undefined;
    let ghostDeltaCons: number | undefined = undefined;
    let ghostDeltaStreak: number | undefined = undefined;

    const totalCharsTyped = Math.max(
      typing.keystrokeLog.current.filter(k => !k.isBackspace).length,
      typing.input.length,
      1
    );
    const cpiBreakdown = calculateCPI(
      typing.wpm,
      typing.accuracy,
      typing.flawlessStreak,
      typing.consistency,
      totalCharsTyped
    );
    const burstWpm = calculateBurstWpm(typing.keystrokeLog.current, typing.timelinePoints);

    if (game.ghostPacer) {
      const computeGhostFinishTime = (samples: Array<{ t: number; chars: number }> | null | undefined, paceWpm: number): number => {
        const safePaceWpm = Math.max(paceWpm, 1);
        const cpm = safePaceWpm * 5;
        if (!samples || samples.length < 2) {
          return (totalCharsTyped / (cpm / 60)) * 1000;
        }
        const last = samples[samples.length - 1];
        if (totalCharsTyped <= last.chars) {
          let lo = 0, hi = samples.length - 1;
          while (hi - lo > 1) {
            const mid = (lo + hi) >> 1;
            if (samples[mid].chars <= totalCharsTyped) lo = mid;
            else hi = mid;
          }
          const a = samples[lo], b = samples[hi];
          const span = b.chars - a.chars;
          const frac = span === 0 ? 0 : (totalCharsTyped - a.chars) / span;
          return a.t + (b.t - a.t) * frac;
        } else {
          const remainingChars = totalCharsTyped - last.chars;
          const extraMs = (remainingChars / (cpm / 60)) * 1000;
          return last.t + extraMs;
        }
      };

      if (game.ghostMode === 'rival' && rivalGhost?.samples && rivalGhost.samples.length > 1) {
        const rivalName = (rivalGhost.username || 'RIVAL').toUpperCase();
        ghostLabel = `${rivalName} (${rivalGhost.wpm} WPM)`;
        ghostTimeline = rivalGhost.samples.map(s => ({
          t: s.t,
          wpm: Math.round((s.chars / 5) / (Math.max(s.t, 1000) / 60000))
        }));
        const ghostFinishTimeMs = computeGhostFinishTime(rivalGhost.samples, rivalGhost.wpm);
        const delta = calculateGhostDelta(
          finishDurationMs,
          typing.accuracy,
          typing.consistency,
          typing.flawlessStreak,
          ghostFinishTimeMs,
          rivalGhost.accuracy,
          rivalGhost.consistency,
          undefined
        );
        ghostDeltaS = delta.deltaS;
        ghostDeltaAcc = delta.deltaAcc;
        ghostDeltaCons = delta.deltaCons;
        ghostDeltaStreak = delta.deltaStreak;
      } else if (game.ghostMode === 'pb' && pbGhost?.samples && pbGhost.samples.length > 1) {
        ghostLabel = `PB (${pbGhost.wpm} WPM)`;
        ghostTimeline = pbGhost.samples.map(s => ({
          t: s.t,
          wpm: Math.round((s.chars / 5) / (Math.max(s.t, 1000) / 60000))
        }));
        const ghostFinishTimeMs = computeGhostFinishTime(pbGhost.samples, pbGhost.wpm);
        const delta = calculateGhostDelta(
          finishDurationMs,
          typing.accuracy,
          typing.consistency,
          typing.flawlessStreak,
          ghostFinishTimeMs,
          pbGhost.accuracy,
          pbGhost.consistency,
          pbGhost.flawlessStreak
        );
        ghostDeltaS = delta.deltaS;
        ghostDeltaAcc = delta.deltaAcc;
        ghostDeltaCons = delta.deltaCons;
        ghostDeltaStreak = delta.deltaStreak;
      } else {
        const targetWpm = game.ghostMode === 'target'
          ? game.ghostTargetWpm
          : game.ghostMode === 'rival' && rivalGhost
          ? rivalGhost.wpm
          : pbGhost
          ? pbGhost.wpm
          : 60;
        ghostLabel = game.ghostMode === 'rival' && rivalGhost
          ? `${(rivalGhost.username || 'RIVAL').toUpperCase()} (${rivalGhost.wpm} WPM)`
          : game.ghostMode === 'pb' && pbGhost
          ? `PB (${pbGhost.wpm} WPM)`
          : `${targetWpm} WPM BOT`;
        ghostTimeline = [
          { t: 0, wpm: targetWpm },
          { t: Math.floor(finishDurationMs / 2), wpm: targetWpm },
          { t: finishDurationMs, wpm: targetWpm },
        ];
        const ghostFinishTimeMs = (totalCharsTyped / ((targetWpm * 5) / 60)) * 1000;
        const delta = calculateGhostDelta(
          finishDurationMs,
          typing.accuracy,
          typing.consistency,
          typing.flawlessStreak,
          ghostFinishTimeMs
        );
        ghostDeltaS = delta.deltaS;
      }
    }

    const resultsProps = {
      wpm: typing.wpm || (isResultsPreview ? 108 : 0),
      rawWpm: typing.rawWpm || (isResultsPreview ? 116 : 0),
      accuracy: typing.accuracy || (isResultsPreview ? 98 : 0),
      consistency: typing.consistency || (isResultsPreview ? 91 : 0),
      flawlessStreak: typing.flawlessStreak || (isResultsPreview ? 142 : 0),
      cpi: cpiBreakdown.cpi || (isResultsPreview ? 94 : 0),
      grade: (cpiBreakdown.grade !== 'D' ? cpiBreakdown.grade : (isResultsPreview ? 'S' : 'D')) as PerformanceGrade,
      burstWpm: burstWpm || (isResultsPreview ? 135 : 0),
      ikiMetrics: typing.ikiMetrics,
      shadowMetrics: typing.shadowMetrics,
      leveledUp: rpg.leveledUp,
      xpGainedLast: rpg.xpGainedLast || (isResultsPreview ? 42 : 0),
      xpBreakdown: rpg.xpBreakdownLast || (isResultsPreview ? {
        baseXp: 33,
        flawlessBonusPct: 50,
        comboBonusPct: 25,
        consistencyBonusPct: 30,
        totalMultiplier: 1.30,
        totalXp: 42
      } : undefined),
      theme,
      heatmapData: rpg.heatmapData,
      isLoggedIn: !!cloud.username,
      displayName: cloud.username,
      saveStatus: saveStatus || (isResultsPreview ? 'SCORE SAVED!' : ''),
      timelinePoints: typing.timelinePoints && typing.timelinePoints.length > 0 ? typing.timelinePoints : (isResultsPreview ? [
        { t: 0, wpm: 75, rawWpm: 80, errors: 0 },
        { t: 5000, wpm: 96, rawWpm: 102, errors: 0 },
        { t: 10000, wpm: 108, rawWpm: 115, errors: 1 },
        { t: 15000, wpm: 112, rawWpm: 120, errors: 1 },
        { t: 20000, wpm: 108, rawWpm: 116, errors: 1 },
      ] : []),
      errorTimes: errorTimes && errorTimes.length > 0 ? errorTimes : (isResultsPreview ? [10200] : []),
      durationMs: finishDurationMs || (isResultsPreview ? 20000 : 0),
      keystrokeLog: (typing.keystrokeLog.current && typing.keystrokeLog.current.length > 0)
        ? typing.keystrokeLog.current
        : (isResultsPreview ? [
            { key: 't', expected: 't', time: 100, isError: false, isBackspace: false },
            { key: 'h', expected: 'h', time: 180, isError: false, isBackspace: false },
            { key: 'e', expected: 'e', time: 260, isError: true, isBackspace: false },
            { key: 'r', expected: 'r', time: 380, isError: true, isBackspace: false },
            { key: 'o', expected: 'o', time: 470, isError: false, isBackspace: false },
            { key: 'p', expected: 'p', time: 560, isError: true, isBackspace: false },
          ] : []),
      testStartTime: typing.startTime || 0,
      onReset: handleReset,
      onWatchReplay: handleWatchReplay,
      onStartMicroDrill: startMicroDrill,
      onStartSmartDrill: startSmartDrill,
      isSmartDrillGenerating,
      ghostTimeline,
      ghostLabel,
      ghostDeltaS,
      ghostDeltaAcc,
      ghostDeltaCons,
      ghostDeltaStreak,
    };

    if (raceActive) {
      return (
        <ErrorBoundary onReset={handleReset}>
          <Suspense fallback={<div className="min-h-screen bg-[#080809] flex items-center justify-center font-mono text-xs text-zinc-500 font-bold uppercase tracking-widest">LOADING RACE RESULTS...</div>}>
            <RaceResultsScreen
              {...resultsProps}
              players={race.players}
              selfId={race.selfId ?? ''}
              timelines={race.timelines}

              isRanked={isRankedMatch}
              supabase={supabase}
              raceId={race.raceId}
              isHost={race.isHost}
              onRequestDetails={race.requestDetails}
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
          </Suspense>
        </ErrorBoundary>
      );
    }

    return (
      <ErrorBoundary onReset={handleReset}>
        <Suspense fallback={<div className="min-h-screen bg-[#080809] flex items-center justify-center font-mono text-xs text-zinc-500 font-bold uppercase tracking-widest">ANALYZING SESSION TELEMETRY...</div>}>
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
        </Suspense>
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
        // Also block keyboard when not in practice stage (e.g. typing in compete lobby chat)
        keyboardBlocked={dossierOpen || analyticsOpen || donateOpen || studioOpen || (currentStage !== 'practice' && !raceActive)}
        raceActive={raceActive}
        theme={theme}
        tetrisEffect={tetrisEffect}
        onUnlockGodMode={handleUnlockGodMode}
        onReset={handleReset}
        onExitMicroDrill={exitMicroDrill}
        onChargeHexEnergy={race.chargeHexEnergy}
        activeHexes={isSabotagePreview ? testHexes : race.activeHexes}
      />
      <div
        className={`h-screen overflow-hidden theme-transition transition-colors duration-700 ${theme.bg} font-mono selection:bg-transparent outline-none flex flex-col items-center relative`}
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
          {/* Nothing at all on the dossier or analytics route.
              That page is a full-viewport `fixed` scroller that paints its own
              opaque floor and its own backdrop (the operator's banner), so every
              pixel of this layer is covered. Pausing the shader was only half the
              saving: the wallpaper branch below carries `will-change: filter` on a
              full-viewport filtered element, which keeps a promoted, filtered layer
              alive and composited on every frame no matter what is on top of it.
              Unmounting is the only way to stop paying for it. */}
          {dossierOpen || analyticsOpen || donateOpen || studioOpen ? null : themeIndex === -1 && wallpaperUrl ? (
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
                filter: typing.phase === 'TYPING'
                  ? `brightness(${Math.min(brightness, 0.45)}) blur(${Math.max(blur, 4)}px)`
                  : `brightness(${brightness}) blur(${blur}px)`,
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
              <CosmicLiquidShader
                theme={theme}
                isPaused={Boolean(activeModal) || dossierOpen || analyticsOpen || donateOpen || studioOpen || isAcademyMode || stageOverlaySettled || isStageTransitioning || (shaderConfig.activeTypingThrottle && typing.phase === 'TYPING')}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <CosmicNavBar
          theme={theme}
          username={cloud.username}
          avatarId={cosmetics.avatarId}
          bannerId={cosmetics.bannerId}
          avatarUrl={cosmetics.avatarUrl}
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
          onOpenPractice={handleOpenPractice}
          onOpenTrophies={handleOpenTrophies}
          onOpenRace={handleOpenRace}
          onOpenSocial={handleOpenSocial}
          onOpenComms={handleOpenComms}
          onOpenSettings={handleOpenSettings}
          onOpenDailyQuests={handleOpenDailyQuests}
          onOpenDonate={() => {
            // Donations are a page, not a dialog — no modal cleanup needed.
            navigate('/donate');
          }}
          onOpenStudio={() => {
            navigate('/studio');
          }}
          activePage={studioOpen ? 'studio' : analyticsOpen || dossierOpen ? 'dossier' : donateOpen ? 'donate' : currentStage}
          shouldHide={shouldHideClutter || studioOpen}
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
            <div
              className={`w-[80vw] h-[80vw] ${theme.solid} rounded-full blur-[250px] animate-pulse`}
              style={{
                animationDuration: '6s',
                animationPlayState: typing.phase === 'TYPING' ? 'paused' : 'running',
              }}
            />
          </div>
        )}

        {/* ═══ MAIN CONTENT ═══ */}
        {/* The dossier route replaces the stage rather than covering it: two
            fixed, scrollable panes on screen at once meant the wrong one caught
            the wheel, and the stage kept running animations nobody could see.
            It sits outside the stage `AnimatePresence` because it is not one of
            the three stages — the presence group there only exists to give the
            stage swap a direction. */}
        {studioOpen ? (
          <Suspense fallback={
            <div className="fixed inset-0 top-[var(--nav-h)] z-[var(--z-content)] flex items-center justify-center font-mono text-xs text-zinc-500 font-bold uppercase tracking-widest bg-[#060608]">
              CALIBRATING STUDIO ENVIRONMENT...
            </div>
          }>
            <TypeNovaStudio
              onBack={() => navigate('/')}
              theme={theme}
              onNavigate={(path) => navigate(path)}
            />
          </Suspense>
        ) : donateOpen ? (
          <Suspense fallback={
            <div className="fixed inset-0 top-[var(--nav-h)] z-[var(--z-content)] flex items-center justify-center font-mono text-xs text-zinc-500 font-bold uppercase tracking-widest bg-[#080809]">
              INITIALIZING PATRON VAULT...
            </div>
          }>
            <PatronVault
              onBack={() => navigate('/')}
              theme={theme}
              onTitleEquipped={(titleId) => setActiveTitle(titleId)}
              username={cloud.username || auth.user?.user_metadata?.full_name || auth.user?.user_metadata?.name || (auth.user?.email ? auth.user.email.split('@')[0] : null)}
            />
          </Suspense>
        ) : analyticsOpen ? (
          <Suspense fallback={
            <div className="fixed inset-0 top-[var(--nav-h)] z-[var(--z-content)] flex items-center justify-center font-mono text-xs text-zinc-500 font-bold uppercase tracking-widest bg-transparent">
              LOADING OPERATOR ANALYTICS...
            </div>
          }>
            <OperatorAnalytics
              routeUsername={selectedProfileUsername}
              onBack={() => {
                const backPath = selectedProfileUsername
                  ? `/operator/${encodeURIComponent(selectedProfileUsername)}`
                  : '/operator';
                navigate(backPath);
              }}
              supabase={supabase}
              localUsername={cloud.username || auth.user?.user_metadata?.full_name || auth.user?.user_metadata?.name || (auth.user?.email ? auth.user.email.split('@')[0] : null)}
              viewerId={auth.user?.id ?? null}
              theme={theme}
              localRPGStats={localRPGStatsMemo}
              onRaceGhost={handleRaceOperatorGhost}
            />
          </Suspense>
        ) : dossierOpen ? (
          <Suspense fallback={
            <div className="fixed inset-0 top-[var(--nav-h)] z-[var(--z-content)] flex items-center justify-center font-mono text-xs text-zinc-500 font-bold uppercase tracking-widest bg-transparent">
              LOADING OPERATOR DOSSIER...
            </div>
          }>
            <OperatorDossier
              routeUsername={selectedProfileUsername}
              onBack={handleLeaveDossier}
              supabase={supabase}
              localUsername={cloud.username || auth.user?.user_metadata?.full_name || auth.user?.user_metadata?.name || (auth.user?.email ? auth.user.email.split('@')[0] : null)}
              viewerId={auth.user?.id ?? null}
              theme={theme}
              localRPGStats={localRPGStatsMemo}
              // Loading a drill leaves the dossier for the arena, so the same
              // handler the stats modal used gets a `navigate` first.
              onStartDrill={handleStartDossierDrill}
              onStartWordDrill={handleStartDossierWordDrill}
              onRaceGhost={handleRaceOperatorGhost}
            />
          </Suspense>
        ) : (
          <>
            {/* Stage 1: Persistent Practice Arena (Zero-Jank Unified Positioning) */}
            {(() => {
              const practiceActive = currentStage === 'practice' || raceActive;
              const revealed = practiceActive && (settledStage === 'practice' || visitedStages.practice || raceActive);
              return (
                <motion.div
                  key="practice-stage"
                  variants={STAGE_PAGE_VARIANTS}
                  initial="enterStart"
                  animate={revealed ? 'visible' : practiceActive ? 'enterStart' : 'hidden'}
                  className={`fixed inset-0 top-[var(--nav-h)] z-[var(--z-content)] overflow-y-auto custom-scrollbar ${
                    practiceActive ? 'pointer-events-auto' : 'pointer-events-none'
                  }`}
                  style={{
                    display: practiceActive || (!practiceActive && settledStage === 'practice') ? undefined : 'none',
                    visibility: revealed || (!practiceActive && settledStage === 'practice') ? 'visible' : 'hidden',
                    transition: `visibility 0s linear ${practiceActive ? 0 : 180}ms`,
                  }}
                  aria-hidden={!practiceActive}
                  inert={!practiceActive}
                >
                  <div
                    className={`w-full px-2 md:px-6 2xl:px-10 pt-4 pb-[calc(var(--dock-h)+2rem)] flex flex-col min-h-full transition-[max-width] duration-200 ease-out ${
                      shouldHideClutter ? 'max-w-[95vw] mx-auto' : 'max-w-[var(--w-wide)] mx-auto'
                    }`}
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
                    <main className={`relative z-[var(--z-content)] w-full grid grid-cols-1 items-start gap-6 lg:gap-8 xl:gap-10 2xl:gap-12 transition-[margin,padding] duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${shouldHideClutter ? 'justify-items-center mt-0' : 'lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_380px] 2xl:grid-cols-[minmax(0,1fr)_420px] 3xl:grid-cols-[minmax(0,1fr)_460px] mt-2 sm:mt-4 pb-16'}`}>
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
                        rivalGhost={activeRivalPace}
                        otherRacePlayers={otherRacePlayers ?? []}
                        dictationSpokenIndex={dictationSpokenIndex}
                        handleChangeLevel={handleArenaChangeLevel}
                        handleLockedLevelClick={handleLockedLevelClick}
                        handleChangeCountOrDuration={handleArenaChangeCountOrDuration}
                        handleChangeCodeLanguage={handleArenaChangeCodeLanguage}
                        onSetCustomTargetText={handleArenaSetCustomTargetText}
                        onOpenGhostModal={handleArenaOpenGhostModal}
                        onReset={handleArenaReset}
                        dueWordsCount={wordWeakness.dueCount}
                        onTrainDue={startDueWordsDrill}
                        raceActive={raceActive || isSabotagePreview}
                        hexEnergy={isSabotagePreview ? testHexEnergy : race.hexEnergy}
                        activeHexes={isSabotagePreview ? testHexes : race.activeHexes}
                        onCastHex={handleArenaCastHex}
                        playSfx={handleArenaPlaySfx}
                      />

                      <LeaderboardSidebar
                        activeTitle={activeTitle}
                        leaderboardClass={leaderboardClass}
                        theme={theme}
                        boardTab={boardTab}
                        isLoggedIn={isLoggedIn}
                        leaderboard={leaderboard}
                        dailyBoard={dailyBoard}
                        friendsBoard={friendsBoard}
                        modeBoard={modeBoard}
                        modeKey={boardModeKey}
                        modeUnavailable={modeBoardUnavailable}
                        currentUsername={cloud.username}
                        onTabChange={handleBoardTabChange}
                        onProfileClick={handleOpenProfile}
                        onRaceGhost={handleSelectRival}
                        onChallengeFriend={handleBoardChallengeFriend}
                        onRemoveFriend={handleBoardRemoveFriend}
                        enabled={practiceActive}
                      />
                    </main>
                  </div>
                </motion.div>
              );
            })()}

            {/* Stages 2 & 3: Overlay Stage Views (Academy & Compete Lobby).
                Each layer mounts ONCE on first visit and stays mounted (hidden)
                afterwards with zero unmounting/remounting cost.
                Visibility flips cleanly with CSS delay so outgoing layers
                fade smoothly without abrupt clipping. */}
              {visitedStages.academy && (() => {
                const academyActive = currentStage === 'academy';
                const revealed = academyActive && (settledStage === 'academy' || visitedStages.academy);
                return (
                <motion.div
                  key="academy"
                  variants={STAGE_PAGE_VARIANTS}
                  initial="enterStart"
                  animate={revealed ? 'visible' : academyActive ? 'enterStart' : 'hidden'}
                  className={`fixed inset-0 top-[var(--nav-h)] z-[var(--z-content)] flex flex-col bg-transparent ${academyActive ? 'pointer-events-auto' : 'pointer-events-none'}`}
                  style={{
                    display: academyActive || (!academyActive && settledStage === 'academy') ? undefined : 'none',
                    visibility: revealed || (!academyActive && settledStage === 'academy') ? 'visible' : 'hidden',
                    transition: `visibility 0s linear ${academyActive ? 0 : 180}ms`,
                  }}
                  aria-hidden={!academyActive}
                  inert={!academyActive}
                >
                  {/* Fixed reading scrim — pinned to viewport, NEVER scrolls */}
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 -z-10"
                    style={{
                      background: [
                        `radial-gradient(120% 78% at 50% 0%, rgba(${theme?.glowPrimary || '0, 240, 255'}, 0.08), transparent 64%)`,
                        'linear-gradient(180deg,' +
                        ' rgba(4, 6, 11, 0.88) 0px,' +
                        ' rgba(4, 6, 11, 0.82) 120px,' +
                        ' rgba(4, 6, 11, 0.6) 300px,' +
                        ' rgba(4, 6, 11, 0.48) 520px,' +
                        ' rgba(4, 6, 11, 0.48) 100%)',
                      ].join(', '),
                    }}
                  />

                  {/* Independent scroll container */}
                  <div className="w-full h-full overflow-y-auto custom-scrollbar academy-scroller flex flex-col">
                    <div className="w-full px-4 sm:px-8 md:px-10 lg:px-12 2xl:px-16 py-6 pb-[calc(var(--dock-h)+2rem)] max-w-[var(--w-ultra)] mx-auto">
                      <Suspense fallback={
                        <div className="w-full py-24 flex items-center justify-center font-mono text-xs text-zinc-500 font-bold uppercase tracking-widest">
                          INITIALIZING ACADEMY...
                        </div>
                      }>
                        <AcademyLayout
                          onExit={exitAcademy}
                          theme={theme}
                          dueWordsCount={wordWeakness.dueCount}
                          onTrainDue={startDueWordsDrill}
                        />
                      </Suspense>
                    </div>
                  </div>
                </motion.div>
                );
              })()}

              {visitedStages.compete && (() => {
                const competeActive = currentStage === 'compete' && !raceActive;
                const revealed = competeActive && (settledStage === 'compete' || visitedStages.compete);
                return (
                <motion.div
                  key="compete-lobby"
                  variants={STAGE_PAGE_VARIANTS}
                  initial="enterStart"
                  animate={revealed ? 'visible' : competeActive ? 'enterStart' : 'hidden'}
                  className={`fixed inset-0 top-[var(--nav-h)] z-[var(--z-content)] overflow-y-auto custom-scrollbar ${competeActive ? 'pointer-events-auto' : 'pointer-events-none'}`}
                  style={{
                    display: competeActive || (!competeActive && settledStage === 'compete') ? undefined : 'none',
                    visibility: revealed || (!competeActive && settledStage === 'compete') ? 'visible' : 'hidden',
                    transition: `visibility 0s linear ${competeActive ? 0 : 180}ms`,
                  }}
                  aria-hidden={!competeActive}
                  inert={!competeActive}
                >
                  <div className="w-full max-w-[var(--w-wide)] mx-auto px-2 md:px-6 2xl:px-10 pt-4 pb-[calc(var(--dock-h)+1rem)] flex flex-col min-h-full">
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
                        quickMatchSlot={competeQuickMatchSlot}
                        sidebarSlot={competeSidebarSlot}
                        onHostCode={handleCompeteHostCode}
                        onCreate={handleCompeteCreate}
                        onJoin={handleCompeteJoin}
                        onBack={handleCompeteBack}
                      />
                    ) : (
                      <LobbyScreen
                        activeTitle={activeTitle}
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
                        onStart={handleLobbyStart}
                        onLeave={handleRaceLeave}
                        theme={theme}
                        themeTextClass={theme.text}
                        isJoining={false}
                        error={race.error}
                        countdown={race.countdown}
                        connection={race.connection}
                        onToggleReady={race.setReady}
                        friends={friendsState.friends}
                        friendsLoading={friendsState.loading}
                        isLoggedIn={isLoggedIn}
                        onInviteFriend={handleInviteFriendToRoom}
                      />
                    )}
                  </div>
                </motion.div>
                );
              })()}
          </>
        )}

        {/* Floating Bottom Controls */}
        <BottomControlsDock
          shouldHideClutter={shouldHideClutter || isAcademyMode}
          theme={theme}
          activeModal={activeModal}
          isAruOpen={isAruOpen}
          onToggleAru={handleToggleAru}
          onOpenSettings={handleOpenSettings}
          onOpenChangelog={handleOpenChangelog}
          onOpenWhatsNew={handleOpenWhatsNew}
          latestVersion={CHANGELOG[0].version}
          cloud={cloud}
          auth={auth}
          avatarId={cosmetics.avatarId}
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
          typing={modalTyping}
          rpg={rpg}
          quests={quests}
          friendsState={friendsState}
          challenges={challenges}
          dailyStreak={dailyStreak}
          pbGhost={pbGhost}
          modeKey={boardModeKey}
          modeBoard={modeBoard}
          modeBoardLoading={modeBoardLoading}
          modeBoardUnavailable={modeBoardUnavailable}
          rivalGhost={rivalGhost}
          rivalPendingId={rivalPendingId}
          onSelectRival={handleSelectRival}
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
          onChallengeFriend={handleChallengeFriend}
          onOpenProfile={handleOpenProfile}
          onSetTetrisEffect={setTetrisEffect}

          onToggleAru={handleToggleAru}
          onCloseAru={handleCloseAru}
          onStartSmartDrill={startSmartDrill}
          onSetNameInput={setNameInput}
          onSetNameErr={setNameErr}
          onSubmitUsername={submitUsername}
          onPlayPreviewSound={handlePlayPreviewSound}
          onAcceptChallenge={handleAcceptChallenge}
          onDeclineChallenge={handleDeclineChallenge}
          raceActive={raceActive}
        />
      </div>
    </>
  );
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { session, authReady } = useAuth();

  const hasOAuthCode = typeof window !== 'undefined' && (
    window.location.search.includes('code=') ||
    window.location.hash.includes('access_token=')
  );

  if (!authReady || (hasOAuthCode && !session)) {
    return (
      <div className="min-h-screen bg-[#080809] flex flex-col items-center justify-center gap-3 text-zinc-400 font-bold uppercase tracking-widest text-xs font-mono">
        <div className="w-8 h-8 border-2 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin" />
        <span>AUTHENTICATING WITH GOOGLE...</span>
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
    <AuthProvider>
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
        <Route path="/operator/analytics" element={<AuthGuard><MainApp /></AuthGuard>} />
        <Route path="/operator/:username" element={<AuthGuard><MainApp /></AuthGuard>} />
        <Route path="/operator/:username/analytics" element={<AuthGuard><MainApp /></AuthGuard>} />
        <Route path="/donate" element={<AuthGuard><MainApp /></AuthGuard>} />
        <Route path="/studio" element={<AuthGuard><MainApp /></AuthGuard>} />
        <Route path="/showcase" element={<AuthGuard><MainApp /></AuthGuard>} />
        <Route
          path="/login"
          element={
            <Suspense fallback={
              <div className="min-h-screen bg-[#080809] flex items-center justify-center text-zinc-500 font-bold uppercase tracking-widest text-xs font-mono">
                INITIALIZING TYPENOVA...
              </div>
            }>
              <Login />
            </Suspense>
          }
        />
        {/* Anything else is a typo or a dead bookmark — send it home rather
            than rendering a blank screen with no navigation. */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster position="top-center" theme="dark" />
    </AuthProvider>
  );
}
