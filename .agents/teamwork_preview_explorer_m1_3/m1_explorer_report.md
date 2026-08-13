# Milestone 1 Report: App.tsx Callback Stabilization & Option Allocation Fixes

**Author**: Explorer 3 (Milestone 1: Global Contexts & Render Tree Optimization)  
**Date**: 2026-08-12  
**Target File**: `src/App.tsx`

---

## Executive Summary

As part of Milestone 1, this report provides a comprehensive analysis of callback stabilization, inline array allocations, inline object literals, and prop drilling in `src/App.tsx`. 

Currently, `App.tsx` contains numerous inline function allocations passed directly as props to key child components (`AccountMenu`, `TypingController`, `SegmentedControl`, `ResultsScreen`, `RaceResultsScreen`, `AIChatBot`, and various Modals). Additionally, inline array mappings (`.map()` on options) and object literal recalculations (`aruStats`, `resultsProps`, `racePlayers` filtering) cause child components to receive fresh reference identities on every single render — completely invalidating `React.memo` optimizations across the render tree.

This report details exact code modifications for `src/App.tsx` to stabilize all callback references using `useCallback`, pre-allocate static arrays, and wrap dynamic allocations in `useMemo`.

---

## 1. Unmemoized Inline Callbacks & Fix Strategies

### 1.1 `AccountMenu` Props
- **Location**: `src/App.tsx:1764-1765`
- **Current Issue**:
  ```tsx
  <AccountMenu
    ...
    onSignIn={() => { void auth.signInWithGoogle(); }}
    onSignOut={() => { void auth.signOut(); }}
  />
  ```
  Inline functions create new references on every render of `MainApp`, forcing `AccountMenu` to re-render unnecessarily.
- **Formulated Fix**:
  ```tsx
  const handleSignIn = useCallback(() => {
    void auth.signInWithGoogle();
  }, [auth]);

  const handleSignOut = useCallback(() => {
    void auth.signOut();
  }, [auth]);
  ```
  Pass `onSignIn={handleSignIn}` and `onSignOut={handleSignOut}`.

---

### 1.2 `TypingController` Props
- **Location**: `src/App.tsx:1085-1087`
- **Current Issue**:
  ```tsx
  <TypingController
    ...
    onUnlockGodMode={() => setShowGodMode(true)}
    onReset={handleReset}
    onExitMicroDrill={exitMicroDrill}
  />
  ```
  `onUnlockGodMode` is an inline callback. `exitMicroDrill` (declared at line 692) is missing `useCallback`.
- **Formulated Fix**:
  ```tsx
  const handleUnlockGodMode = useCallback(() => {
    setActiveModal('godMode');
  }, []);

  const exitMicroDrill = useCallback(() => {
    game.setMicroDrillActive(false);
    handleResetRef.current({});
  }, [game]);
  ```
  Pass `onUnlockGodMode={handleUnlockGodMode}` and `onExitMicroDrill={exitMicroDrill}`.

---

### 1.3 `SegmentedControl` Callbacks
- **Location**: `src/App.tsx:1428-1429`, `1463`, `1517`
- **Current Issue**:
  Inline arrow functions are passed to `onChange` and `onLockedClick` for level difficulty, word count/duration, and code language controls:
  ```tsx
  // Difficulty
  onChange={(l) => game.changeLevel(l)}
  onLockedClick={(l) => { const modeName = ...; toast.error(...); }}

  // Words / Time
  onChange={(v) => game.testMode === 'time' ? game.changeDuration(v) : game.changeWordCount(v)}

  // Code Language
  onChange={(lang) => game.changeCodeLanguage(lang)}
  ```
- **Formulated Fix**:
  ```tsx
  const handleChangeLevel = useCallback((l: Level) => {
    game.changeLevel(l);
  }, [game]);

  const handleLockedLevelClick = useCallback((l: Level) => {
    const modeName = l === "CODE" ? "Code" : "Custom";
    toast.error(`Sign in to unlock ${modeName} Mode!`, { icon: <Lock size={14} /> });
  }, []);

  const handleChangeCountOrDuration = useCallback((v: number) => {
    if (game.testMode === 'time') {
      game.changeDuration(v);
    } else {
      game.changeWordCount(v);
    }
  }, [game]);

  const handleChangeCodeLanguage = useCallback((lang: CodeLanguage) => {
    game.changeCodeLanguage(lang);
  }, [game]);
  ```

---

### 1.4 Results Screens Callbacks (`ResultsScreen`, `AIDrillResultsScreen`, `RaceResultsScreen`)
- **Location**: `src/App.tsx:984-1069`
- **Current Issue**:
  Inline callbacks created inside `resultsProps` and JSX elements:
  - `onReset: () => handleReset()` (wraps `handleReset` in a new arrow function)
  - `onWatchReplay: () => setShowReplay(true)`
  - `onStartMicroDrill: startMicroDrill` (`startMicroDrill` at line 613 lacks `useCallback`)
  - `onRetry: () => launchDrill(typing.targetText)` (`launchDrill` at line 606 lacks `useCallback`)
  - `onRematch: () => race.rematch()`
  - `onLeaveRace: () => { race.leave(); setRaceActive(false); setIsRankedMatch(false); handleReset(); }`
  - `onUpdateElo: (elo) => cloud.setElo(elo)`
- **Formulated Fix**:
  ```tsx
  const handleWatchReplay = useCallback(() => {
    setActiveModal('replay');
  }, []);

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

  const handleRetryDrill = useCallback(() => {
    launchDrill(typing.targetText);
  }, [launchDrill, typing.targetText]);

  const handleLeaveRace = useCallback(() => {
    race.leave();
    setRaceActive(false);
    setIsRankedMatch(false);
    handleReset();
  }, [race, handleReset]);

  const handleUpdateElo = useCallback((elo: number) => {
    cloud.setElo(elo);
  }, [cloud]);

  const handleRematchRace = useCallback(() => {
    race.rematch();
  }, [race]);
  ```
  In `resultsProps`: `onReset: handleReset` (pass `handleReset` directly), `onWatchReplay: handleWatchReplay`, `onStartMicroDrill: startMicroDrill`.

---

### 1.5 Modal State Setters & Toggle Callbacks
- **Location**: `src/App.tsx:212-222`, `327-342`, `707-718`, `2044`
- **Current Issue**:
  - Alias setters `const setShowTrophyRoom = (b: boolean) => setActiveModal(b ? 'trophy' : null);` are recreated every render.
  - `handleChallengeFriend` (line 327) is unmemoized.
  - `selectTheme` and `selectSoundProfile` (lines 707-718) are unmemoized.
  - `onClose` handlers for `AIChatBot`, `DailyQuestsPanel`, `ReplayModal`, `SettingsModal` use inline `() => setActiveModal(null)` or `() => setIsAruOpen(false)`.
- **Formulated Fix**:
  ```tsx
  const setShowTrophyRoom = useCallback((b: boolean) => setActiveModal(b ? 'trophy' : null), []);
  const setShowGodMode = useCallback((b: boolean) => setActiveModal(b ? 'godMode' : null), []);
  const setShowStatsDashboard = useCallback((b: boolean) => setActiveModal(b ? 'stats' : null), []);
  const setShowReplay = useCallback((b: boolean) => setActiveModal(b ? 'replay' : null), []);
  const setShowRace = useCallback((b: boolean) => setActiveModal(b ? 'race' : null), []);
  const setShowProfile = useCallback((b: boolean) => setActiveModal(b ? 'profile' : null), []);
  const setShowSocialModal = useCallback((b: boolean) => setActiveModal(b ? 'social' : null), []);
  const setShowCommsModal = useCallback((b: boolean) => setActiveModal(b ? 'comms' : null), []);
  const setShowDailyQuestsModal = useCallback((b: boolean) => setActiveModal(b ? 'quests' : null), []);
  const setShowSettingsModal = useCallback((b: boolean) => setActiveModal(b ? 'settings' : null), []);
  const setShowChangelog = useCallback((b: boolean) => setActiveModal(b ? 'changelog' : null), []);

  const handleCloseAru = useCallback(() => setIsAruOpen(false), []);

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

  const handleSetThemeFont = useCallback((font: string) => {
    setThemeFont(font);
    try { localStorage.setItem('typezen_font', font); } catch {}
  }, []);

  const handleChallengeFriend = useCallback((
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
  }, [cloud.username, cloud.elo, race, challenges, auth.user?.id, setShowSocialModal, setShowRace]);
  ```

---

## 2. Inline Array & Object Allocations & Fix Strategies

### 2.1 Pre-allocation of Static Options Arrays
- **Location**: `src/App.tsx:1422`, `1459`, `1512`
- **Current Issue**:
  - `SegmentedControl` options arrays are generated via `.map()` inside the render function on every render cycle.
- **Formulated Fix**:
  1. Define constant arrays outside component scope:
     ```tsx
     const TIME_OPTIONS = [15, 30, 60].map(v => ({ label: String(v), value: v }));
     const WORD_OPTIONS = [10, 25, 50, 100].map(v => ({ label: String(v), value: v }));
     const CODE_LANGUAGE_OPTIONS = CODE_LANGUAGES.map(lang => ({
       label: lang.toUpperCase(),
       value: lang,
     }));
     ```
  2. Memoize level options inside `MainApp`:
     ```tsx
     const levelOptions = useMemo(() => (
       ["NOVICE", "ADEPT", "MASTER", "QUOTES", "CODE", "CUSTOM"] as Level[]
     ).map(l => ({
       label: l,
       value: l,
       locked: !isLoggedIn && (l === "CODE" || l === "CUSTOM")
     })), [isLoggedIn]);
     ```
  3. Pass `options={levelOptions}`, `options={game.testMode === 'time' ? TIME_OPTIONS : WORD_OPTIONS}`, and `options={CODE_LANGUAGE_OPTIONS}` to the respective `SegmentedControl` components.

---

### 2.2 `TypingArea` Race Players Filter Allocation
- **Location**: `src/App.tsx:1610`
- **Current Issue**:
  `racePlayers={raceActive ? race.players.filter(p => p.id !== race.selfId) : undefined}`
  Running `.filter()` inside JSX creates a new array reference on every render frame, forcing `TypingArea` to re-render even when player positions have not changed.
- **Formulated Fix**:
  ```tsx
  const otherRacePlayers = useMemo(() => {
    if (!raceActive) return undefined;
    return race.players.filter(p => p.id !== race.selfId);
  }, [raceActive, race.players, race.selfId]);
  ```
  Pass `racePlayers={otherRacePlayers}` to `<TypingArea />`.

---

### 2.3 `aruStats` Allocation Thrashing Fix
- **Location**: `src/App.tsx:645-652`
- **Current Issue**:
  ```tsx
  const aruStats = useMemo(() => ({
    wpm: typing.wpm,
    accuracy: typing.accuracy,
    level: rpg.userLevel,
    testsCompleted: rpg.testsCompleted,
    streak: dailyStreak,
    weakKeys: aruWeakKeys,
  }), [typing.wpm, typing.accuracy, rpg.userLevel, rpg.testsCompleted, dailyStreak, aruWeakKeys]);
  ```
  During active typing (`phase === 'TYPING'`), `typing.wpm` and `typing.accuracy` mutate on every single keystroke. This causes `aruStats` to regenerate a new object reference on every keystroke, defeating `React.memo` on `AIChatBot` during typing gameplay.
- **Formulated Fix**:
  Freeze WPM/accuracy updates in `aruStats` while typing, updating only when the test finishes or when the Aru chatbot drawer is opened:
  ```tsx
  const aruStats = useMemo(() => ({
    wpm: typing.phase === 'FINISHED' ? typing.wpm : 0,
    accuracy: typing.phase === 'FINISHED' ? typing.accuracy : 0,
    level: rpg.userLevel,
    testsCompleted: rpg.testsCompleted,
    streak: dailyStreak,
    weakKeys: aruWeakKeys,
  }), [typing.phase, typing.wpm, typing.accuracy, rpg.userLevel, rpg.testsCompleted, dailyStreak, aruWeakKeys]);
  ```

---

### 2.4 `resultsProps` Lazy Construction
- **Location**: `src/App.tsx:984-1007`
- **Current Issue**:
  `resultsProps` object is allocated on every render of `MainApp` regardless of phase.
- **Formulated Fix**:
  Move `resultsProps` definition inside the `if (typing.phase === 'FINISHED')` render condition block so it is strictly allocated only when displaying results.

---

## 3. Comprehensive Summary of Prop Drilling & Stabilization Impact

| Component | Unstable Props (Before) | Stabilized Fix (After) | Target Milestone Feature |
| text | text | text | text |
| `AccountMenu` | `onSignIn`, `onSignOut` | `handleSignIn`, `handleSignOut` (`useCallback`) | M1 Feature 4 |
| `TypingController` | `onUnlockGodMode`, `onExitMicroDrill` | `handleUnlockGodMode`, `exitMicroDrill` (`useCallback`) | M1 Feature 4 |
| `SegmentedControl` (Difficulty) | `options` (inline map), `onChange`, `onLockedClick` | `levelOptions` (`useMemo`), `handleChangeLevel`, `handleLockedLevelClick` (`useCallback`) | M1 Feature 4 |
| `SegmentedControl` (Words/Time) | `options` (inline map), `onChange` | `TIME_OPTIONS` / `WORD_OPTIONS` (pre-allocated), `handleChangeCountOrDuration` (`useCallback`) | M1 Feature 4 |
| `SegmentedControl` (Code Lang) | `options` (inline map), `onChange` | `CODE_LANGUAGE_OPTIONS` (pre-allocated), `handleChangeCodeLanguage` (`useCallback`) | M1 Feature 4 |
| `TypingArea` | `racePlayers` (inline filter) | `otherRacePlayers` (`useMemo`) | M1 Feature 4 |
| `AIChatBot` | `aruStats` (thrashing WPM/acc), `onClose` | `aruStats` (stabilized typing phase `useMemo`), `handleCloseAru` (`useCallback`) | M1 Feature 4 |
| `ResultsScreen` / `RaceResultsScreen` / `AIDrillResultsScreen` | `onReset` (inline arrow), `onWatchReplay`, `onStartMicroDrill`, `onRetry`, `onLeaveRace`, `onUpdateElo` | Pass `handleReset` directly, `handleWatchReplay`, `startMicroDrill`, `handleRetryDrill`, `handleLeaveRace`, `handleUpdateElo` (`useCallback`) | M1 Feature 4 |
| Modals (`SettingsModal`, `SocialModal`, etc.) | `selectTheme`, `selectSoundProfile`, `setThemeFont`, `handleChallengeFriend`, `onClose` | All wrapped in `useCallback` or reusing `handleCloseModal` | M1 Feature 4 |

---

## 4. Verification Method

Once implemented in Milestone 1:
1. Run `npx tsc --noEmit` to verify type safety.
2. Build the project via `npm run build` to ensure clean bundling.
3. Open React DevTools Profiler during active typing to verify that `AccountMenu`, `SegmentedControl`, `StatsPanel`, `AIChatBot`, and `TypingArea` render zero unnecessary frames when props have not changed.
