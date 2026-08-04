import re

with open('src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

lines = content.split('\n')

# ============================================================
# STEP 1: Add useGameConfig import
# ============================================================
# Find the line with "import { useQuests } from '@/hooks/useQuests';" and add after it
import_target = "import { useQuests } from '@/hooks/useQuests';"
import_idx = None
for i, line in enumerate(lines):
    if import_target in line:
        import_idx = i
        break

if import_idx is not None:
    lines.insert(import_idx + 1, "import { useGameConfig } from '@/hooks/useGameConfig';")

# Rebuild content after insertion
content = '\n'.join(lines)

# ============================================================
# STEP 2: Remove extracted state declarations in MainApp
# ============================================================
# We need to remove these state declarations and add the useGameConfig call

# Find and remove the extracted state block
state_block_start = content.find("  const [zenMode, setZenMode] = useState(false);")
state_block_end = content.find("  const [isCrossfading, setIsCrossfading] = useState(false);")

# The state block goes from zenMode to microDrillActive, then isCrossfading and resetTimeoutRef stay
# Let's find the exact block to remove

# Remove the config state declarations
patterns_to_remove = [
    r"  const \[zenMode, setZenMode\] = useState\(false\);\n",
    r"  const \[suddenDeath, setSuddenDeath\] = useState\(false\);\n",
    r"  const \[ghostPacer, setGhostPacer\] = useState\(false\);\n",
    r"  const \[focusMode, setFocusMode\] = useState\(false\);\n",
    r"  const \[blindMode, setBlindMode\] = useState\(false\);\n",
    r"  const \[mirroredMode, setMirroredMode\] = useState\(false\);\n",
    r"  const \[codeLanguage, setCodeLanguage\] = useState<CodeLanguage>\('JavaScript/TypeScript'\);\n",
    r"  const \[fogMode, setFogMode\] = useState\(false\);\n",
    r"  const \[stickyKeysMode, setStickyKeysMode\] = useState\(false\);\n",
    r"  const \[overclockedMode, setOverclockedMode\] = useState\(false\);\n",
    r"  const \[stickyPenalty, setStickyPenalty\] = useState\(0\);\n",
    r"  const \[level, setLevel\] = useState<Level>\('NOVICE'\);\n",
    r"  const \[wordCount, setWordCount\] = useState\(25\);\n",
    r"  const \[testMode, setTestMode\] = useState<'words' \| 'time'>\('words'\);\n",
    r"  const \[duration, setDuration\] = useState\(30\);\n",
    r"  const \[withNumbers, setWithNumbers\] = useState\(false\);\n",
    r"  const \[withPunctuation, setWithPunctuation\] = useState\(false\);\n",
    r"  const \[dailyActive, setDailyActive\] = useState\(false\);\n",
    r"  const \[customText, setCustomText\] = useState\(''\);\n",
    r"  const \[microDrillActive, setMicroDrillActive\] = useState\(false\);\n",
]

for pattern in patterns_to_remove:
    content = re.sub(pattern, '', content)

# ============================================================
# STEP 3: Add useGameConfig call and handleResetRef pattern
# ============================================================
# Find the line after "  useGlassPointer();" and add the game config hook

glass_pointer_line = "  useGlassPointer();"
glass_idx = content.find(glass_pointer_line)

if glass_idx != -1:
    insert_after = glass_idx + len(glass_pointer_line)
    hook_code = """\n
  // Ref-based callback to break the dependency cycle between
  // handleReset (which lives in App.tsx) and the change handlers
  // that now live inside useGameConfig.
  const handleResetRef = useRef<(overrides: {
    level?: Level; wordCount?: number; mirrored?: boolean;
    testMode?: 'words' | 'time'; duration?: number;
    numbers?: boolean; punctuation?: boolean; codeLanguage?: CodeLanguage; daily?: boolean;
  }) => void>(() => {});

  const game = useGameConfig((overrides) => handleResetRef.current(overrides));

  useEffect(() => {
    handleResetRef.current = handleReset;
  }, [handleReset]);
"""
    content = content[:insert_after] + hook_code + content[insert_after:]

# ============================================================
# STEP 4: Update stateRef to remove config fields
# ============================================================
old_stateRef = """  const stateRef = useRef({
    phase: typing.phase,
    input: typing.input,
    targetText: typing.targetText,
    combo: typing.combo,
    maxCombo: typing.maxCombo,
    suddenDeath,
    stickyKeysMode,
    stickyPenalty,
    timePenalty: typing.timePenalty,
    activeModal,
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
  });"""

new_stateRef = """  const stateRef = useRef({
    phase: typing.phase,
    input: typing.input,
    targetText: typing.targetText,
    combo: typing.combo,
    maxCombo: typing.maxCombo,
    timePenalty: typing.timePenalty,
    activeModal,
    raceActive,
    theme,
    tetrisEffect,
    startTime: typing.startTime,
  });"""

content = content.replace(old_stateRef, new_stateRef)

# ============================================================
# STEP 5: Update stateRef sync useEffect
# ============================================================
old_stateRef_sync = """  useEffect(() => {
    Object.assign(stateRef.current, {
      phase: typing.phase,
      input: typing.input,
      targetText: typing.targetText,
      combo: typing.combo,
      maxCombo: typing.maxCombo,
      suddenDeath,
      stickyKeysMode,
      stickyPenalty,
      timePenalty: typing.timePenalty,
      activeModal,
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
    });
  });"""

new_stateRef_sync = """  useEffect(() => {
    Object.assign(stateRef.current, {
      phase: typing.phase,
      input: typing.input,
      targetText: typing.targetText,
      combo: typing.combo,
      maxCombo: typing.maxCombo,
      timePenalty: typing.timePenalty,
      activeModal,
      raceActive,
      theme,
      tetrisEffect,
      startTime: typing.startTime,
    });
  });"""

content = content.replace(old_stateRef_sync, new_stateRef_sync)

# ============================================================
# STEP 6: Update handleReset to use game.configRef.current
# ============================================================
old_handleReset = """  const handleReset = useCallback((overrides: {
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
    const nextCustom = s.customText;"""

new_handleReset = """  const handleReset = useCallback((overrides: {
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
    const nextCustom = cfg.customText;"""

content = content.replace(old_handleReset, new_handleReset)

# Also update the setZenMode inside handleReset
old_zen_in_reset = "    setZenMode(false);\n    setSaveStatus('');"
new_zen_in_reset = "    game.setZenMode(false);\n    setSaveStatus('');"
content = content.replace(old_zen_in_reset, new_zen_in_reset)

# Update handleReset deps to include game.configRef
old_reset_deps = "  }, [typing, rpg, particles, race]);"
# Find handleReset closing - it's the one after the setZenMode line
# Let's find it more precisely
content = content.replace(
    "    rpg.resetRPGFlags();\n    particles.clearAll();\n  }, [typing, rpg, particles, race]);",
    "    rpg.resetRPGFlags();\n    particles.clearAll();\n  }, [typing, rpg, particles, race, game.configRef]);"
)

# ============================================================
# STEP 7: Remove change handlers
# ============================================================
old_change_handlers = """  const changeLevel = (newLevel: Level) => {
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
  };"""

content = content.replace(old_change_handlers, '')

# ============================================================
# STEP 8: Update actionsRef to include gameConfig
# ============================================================
old_actionsRef = """  const actionsRef = useRef({ typing, audio, rpg, handleReset, exitMicroDrill, particles });
  useEffect(() => {
    Object.assign(actionsRef.current, { typing, audio, rpg, handleReset, exitMicroDrill, particles });
  });"""

new_actionsRef = """  const actionsRef = useRef({ typing, audio, rpg, handleReset, exitMicroDrill, particles, gameConfig: game.configRef });
  useEffect(() => {
    Object.assign(actionsRef.current, { typing, audio, rpg, handleReset, exitMicroDrill, particles, gameConfig: game.configRef });
  });"""

content = content.replace(old_actionsRef, new_actionsRef)

# ============================================================
# STEP 9: Update keyboard handler
# ============================================================
# Update the destructuring line
old_kbd_destructure = "      const { typing, audio, rpg, handleReset, exitMicroDrill, particles } = actionsRef.current;"
new_kbd_destructure = "      const { typing, audio, rpg, handleReset, exitMicroDrill, particles, gameConfig } = actionsRef.current;\n      const cfg = gameConfig.current;"
content = content.replace(old_kbd_destructure, new_kbd_destructure)

# Update s.microDrillActive -> cfg.microDrillActive
content = content.replace(
    "          if (s.microDrillActive) { exitMicroDrill(); }",
    "          if (cfg.microDrillActive) { exitMicroDrill(); }"
)

# Update s.stickyKeysMode and s.stickyPenalty in backspace handler
content = content.replace(
    "          if (s.stickyKeysMode && s.stickyPenalty > 0) {",
    "          if (cfg.stickyKeysMode && cfg.stickyPenalty > 0) {"
)
content = content.replace(
    "            setStickyPenalty(p => Math.max(0, p - 1));",
    "            game.setStickyPenalty(p => Math.max(0, p - 1));"
)

# Update s.stickyKeysMode -> cfg.stickyKeysMode for penalty setting
content = content.replace(
    "          if (s.stickyKeysMode) setStickyPenalty(3);",
    "          if (cfg.stickyKeysMode) game.setStickyPenalty(3);"
)

# Update s.suddenDeath -> cfg.suddenDeath
content = content.replace(
    "          if (s.suddenDeath) {",
    "          if (cfg.suddenDeath) {"
)

# Update setZenMode in READY phase
content = content.replace(
    "          setZenMode(e.shiftKey);",
    "          game.setZenMode(e.shiftKey);"
)

# ============================================================
# STEP 10: Update exitMicroDrill
# ============================================================
old_exitMicroDrill = """  const exitMicroDrill = () => {
    const s = stateRef.current;
    setMicroDrillActive(false);
    const length = s.testMode === 'time' ? s.duration * 4 : s.wordCount;
    typing.setTargetText(generateText(s.level, length, s.customText, s.mirroredMode, {
      numbers: s.withNumbers,
      punctuation: s.withPunctuation,
      rng: s.dailyActive ? mulberry32(daySeed()) : undefined,
      codeLanguage: s.codeLanguage,
    }));
    typing.resetKeystrokes();
    // Go back to CONFIGURING instead of FINISHED to avoid triggering RPG
    // processing with an empty keystroke log.
    typing.setPhase('CONFIGURING');
  };"""

new_exitMicroDrill = """  const exitMicroDrill = () => {
    const cfg = game.configRef.current;
    game.setMicroDrillActive(false);
    const length = cfg.testMode === 'time' ? cfg.duration * 4 : cfg.wordCount;
    typing.setTargetText(generateText(cfg.level, length, cfg.customText, cfg.mirroredMode, {
      numbers: cfg.withNumbers,
      punctuation: cfg.withPunctuation,
      rng: cfg.dailyActive ? mulberry32(daySeed()) : undefined,
      codeLanguage: cfg.codeLanguage,
    }));
    typing.resetKeystrokes();
    // Go back to CONFIGURING instead of FINISHED to avoid triggering RPG
    // processing with an empty keystroke log.
    typing.setPhase('CONFIGURING');
  };"""

content = content.replace(old_exitMicroDrill, new_exitMicroDrill)

# ============================================================
# STEP 11: Update race.onStart callback
# ============================================================
old_race_start = """  const race = useRace({
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
  });"""

new_race_start = """  const race = useRace({
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
  });"""

content = content.replace(old_race_start, new_race_start)

# ============================================================
# STEP 12: Update pbStorageKey and pbGhost
# ============================================================
old_pb = """  const pbStorageKey = `typezen_pb:${level}:${testMode === 'time' ? 't' + duration : 'w' + wordCount}`;
  const pbGhost = useMemo((): { wpm: number; samples: PaceSample[] } | null => {
    if (level === 'CUSTOM' || mirroredMode || dailyActive) return null;
    try { return JSON.parse(localStorage.getItem(pbStorageKey) || 'null'); } catch { return null; }
    // typing.phase is a deliberate extra dep: reload the PB after each finish
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pbStorageKey, level, mirroredMode, dailyActive, typing.phase]);"""

new_pb = """  const pbStorageKey = `typezen_pb:${game.level}:${game.testMode === 'time' ? 't' + game.duration : 'w' + game.wordCount}`;
  const pbGhost = useMemo((): { wpm: number; samples: PaceSample[] } | null => {
    if (game.level === 'CUSTOM' || game.mirroredMode || game.dailyActive) return null;
    try { return JSON.parse(localStorage.getItem(pbStorageKey) || 'null'); } catch { return null; }
    // typing.phase is a deliberate extra dep: reload the PB after each finish
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pbStorageKey, game.level, game.mirroredMode, game.dailyActive, typing.phase]);"""

content = content.replace(old_pb, new_pb)

# ============================================================
# STEP 13: Update RPG processing effect
# ============================================================
# testMode === 'time' -> game.testMode === 'time'
content = content.replace(
    "    const isTimed = testMode === 'time';",
    "    const isTimed = game.testMode === 'time';"
)

# wordCount in effWordCount
content = content.replace(
    "    const effWordCount = isTimed ? typedWords : wordCount;",
    "    const effWordCount = isTimed ? typedWords : game.wordCount;"
)

# microDrillActive -> game.microDrillActive
content = content.replace(
    "      microDrillActive, typing.keystrokeLog.current,",
    "      game.microDrillActive, typing.keystrokeLog.current,"
)

# dailyActive -> game.dailyActive
content = content.replace(
    "    if (dailyActive && !microDrillActive) {",
    "    if (game.dailyActive && !game.microDrillActive) {"
)

# level and mode/size in appendHistory
old_history = """      appendHistory({
        d: new Date().toISOString(),
        wpm: stats.currentWpm, acc: stats.currentAcc, cons: stats.consistency,
        level, mode: isTimed ? 'time' : 'words',
        size: isTimed ? duration : wordCount,
      });"""

new_history = """      appendHistory({
        d: new Date().toISOString(),
        wpm: stats.currentWpm, acc: stats.currentAcc, cons: stats.consistency,
        level: game.level, mode: isTimed ? 'time' : 'words',
        size: isTimed ? game.duration : game.wordCount,
      });"""

content = content.replace(old_history, new_history)

# Personal best recording
old_pb_record = """    if (!microDrillActive && level !== 'CUSTOM' && !mirroredMode && !dailyActive && stats.currentWpm > 0) {"""
new_pb_record = """    if (!game.microDrillActive && game.level !== 'CUSTOM' && !game.mirroredMode && !game.dailyActive && stats.currentWpm > 0) {"""
content = content.replace(old_pb_record, new_pb_record)

# checkAchievements
old_achievements = """    rpg.checkAchievements(
      stats.currentWpm, stats.currentAcc, typing.maxCombo,
      result.newXp, effWordCount,
      suddenDeath, blindMode, fogMode, overclockedMode,
      result.newTestsCompleted, _seenThemes.size, THEME_KEYS.length,
      isTimed, streakNow
    );"""

new_achievements = """    rpg.checkAchievements(
      stats.currentWpm, stats.currentAcc, typing.maxCombo,
      result.newXp, effWordCount,
      game.suddenDeath, game.blindMode, game.fogMode, game.overclockedMode,
      result.newTestsCompleted, _seenThemes.size, THEME_KEYS.length,
      isTimed, streakNow
    );"""

content = content.replace(old_achievements, new_achievements)

# ============================================================
# STEP 14: Update Timed Mode Countdown effect deps
# ============================================================
old_timed_deps = "  }, [typing.phase, typing.startTime, testMode, duration, typing]);"
new_timed_deps = "  }, [typing.phase, typing.startTime, game.testMode, game.duration, typing]);"
content = content.replace(old_timed_deps, new_timed_deps)

# Also update the condition inside the effect
old_timed_cond = "    if (typing.phase !== 'TYPING' || testMode !== 'time' || !typing.startTime) return;"
new_timed_cond = "    if (typing.phase !== 'TYPING' || game.testMode !== 'time' || !typing.startTime) return;"
content = content.replace(old_timed_cond, new_timed_cond)

old_timed_duration = "      const finalTs = typing.startTime! + duration * 1000;"
new_timed_duration = "      const finalTs = typing.startTime! + game.duration * 1000;"
content = content.replace(old_timed_duration, new_timed_duration)

# ============================================================
# STEP 15: Update Overclocked Penalty effect deps
# ============================================================
old_overclocked = "  }, [overclockedMode, typing.phase]);"
new_overclocked = "  }, [game.overclockedMode, typing.phase]);"
content = content.replace(old_overclocked, new_overclocked)

old_overclocked_cond = "    if (!overclockedMode || typing.phase !== 'TYPING') return;"
new_overclocked_cond = "    if (!game.overclockedMode || typing.phase !== 'TYPING') return;"
content = content.replace(old_overclocked_cond, new_overclocked_cond)

# ============================================================
# STEP 16: Update derived state
# ============================================================
old_derived = """  const shouldHideClutter = zenMode || isTypingOrCountdown;
  const progressPercent = typing.targetText.length > 0 ? (typing.input.length / typing.targetText.length) * 100 : 0;
  // Fixed-text levels have no meaningful word/time budget
  const lengthLocked = level === 'CODE' || level === 'CUSTOM' || level === 'QUOTES';
  // Number/punctuation mixing only applies to the plain word pools
  const mutatable = level === 'NOVICE' || level === 'ADEPT';"""

new_derived = """  const shouldHideClutter = game.zenMode || isTypingOrCountdown;
  const progressPercent = typing.targetText.length > 0 ? (typing.input.length / typing.targetText.length) * 100 : 0;
  // Fixed-text levels have no meaningful word/time budget
  const lengthLocked = game.level === 'CODE' || game.level === 'CUSTOM' || game.level === 'QUOTES';
  // Number/punctuation mixing only applies to the plain word pools
  const mutatable = game.level === 'NOVICE' || game.level === 'ADEPT';"""

content = content.replace(old_derived, new_derived)

# ============================================================
# STEP 17: Update Auto-Save effect
# ============================================================
old_autosave_cond = "    if (typing.phase !== 'FINISHED' || hasAutoSavedRef.current || microDrillActive) return;"
new_autosave_cond = "    if (typing.phase !== 'FINISHED' || hasAutoSavedRef.current || game.microDrillActive) return;"
content = content.replace(old_autosave_cond, new_autosave_cond)

old_autosave_daily = "          p_daily: dailyActive,\n          p_day: todayKey(),"
new_autosave_daily = "          p_daily: game.dailyActive,\n          p_day: todayKey(),"
content = content.replace(old_autosave_daily, new_autosave_daily)

old_autosave_fetch = "            if (dailyActive) fetchDailyBoard();"
new_autosave_fetch = "            if (game.dailyActive) fetchDailyBoard();"
content = content.replace(old_autosave_fetch, new_autosave_fetch)

# ============================================================
# STEP 18: Update JSX references
# ============================================================

# Difficulty selector
content = content.replace(
    '                    value={level}\n                    onChange={(l) => changeLevel(l)}',
    '                    value={game.level}\n                    onChange={(l) => game.changeLevel(l)}'
)

# Length/Time selector
content = content.replace(
    "                  {testMode === 'time' ? <Clock size={10} className=\"mr-1.5\" /> : <Activity size={10} className=\"mr-1.5\" />}\n                  {testMode === 'time' ? 'SECONDS' : 'WORDS'}",
    "                  {game.testMode === 'time' ? <Clock size={10} className=\"mr-1.5\" /> : <Activity size={10} className=\"mr-1.5\" />}\n                  {game.testMode === 'time' ? 'SECONDS' : 'WORDS'}"
)

content = content.replace(
    "                    onClick={() => changeTestMode('words')}\n                    disabled={lengthLocked}\n                    className={`p-2.5 rounded-full transition-all ${testMode === 'words' ? `bg-white/10 ${theme.text}` : 'text-zinc-500 hover:text-white'}`}",
    "                    onClick={() => game.changeTestMode('words')}\n                    disabled={lengthLocked}\n                    className={`p-2.5 rounded-full transition-all ${game.testMode === 'words' ? `bg-white/10 ${theme.text}` : 'text-zinc-500 hover:text-white'}`}"
)

content = content.replace(
    "                    onClick={() => changeTestMode('time')}\n                    disabled={lengthLocked}\n                    className={`p-2.5 rounded-full transition-all ${testMode === 'time' ? `bg-white/10 ${theme.text}` : 'text-zinc-500 hover:text-white'}`}",
    "                    onClick={() => game.changeTestMode('time')}\n                    disabled={lengthLocked}\n                    className={`p-2.5 rounded-full transition-all ${game.testMode === 'time' ? `bg-white/10 ${theme.text}` : 'text-zinc-500 hover:text-white'}`}"
)

content = content.replace(
    "                    options={(testMode === 'time' ? [15, 30, 60] : [10, 25, 50, 100]).map(v => ({\n                      label: String(v),\n                      value: v\n                    }))}\n                    value={testMode === 'time' ? duration : wordCount}\n                    onChange={(v) => testMode === 'time' ? changeDuration(v) : changeWordCount(v)}",
    "                    options={(game.testMode === 'time' ? [15, 30, 60] : [10, 25, 50, 100]).map(v => ({\n                      label: String(v),\n                      value: v\n                    }))}\n                    value={game.testMode === 'time' ? game.duration : game.wordCount}\n                    onChange={(v) => game.testMode === 'time' ? game.changeDuration(v) : game.changeWordCount(v)}"
)

content = content.replace(
    "                        onClick={toggleNumbers}\n                        className={`px-2.5 py-2 rounded-full text-[10px] font-black tracking-widest transition-all ${withNumbers ? `bg-white/10 ${theme.text}` : 'text-zinc-500 hover:text-white'}`}",
    "                        onClick={game.toggleNumbers}\n                        className={`px-2.5 py-2 rounded-full text-[10px] font-black tracking-widest transition-all ${game.withNumbers ? `bg-white/10 ${theme.text}` : 'text-zinc-500 hover:text-white'}`}"
)

content = content.replace(
    "                        onClick={togglePunctuation}\n                        className={`px-2.5 py-2 rounded-full text-[10px] font-black tracking-widest transition-all ${withPunctuation ? `bg-white/10 ${theme.text}` : 'text-zinc-500 hover:text-white'}`}",
    "                        onClick={game.togglePunctuation}\n                        className={`px-2.5 py-2 rounded-full text-[10px] font-black tracking-widest transition-all ${game.withPunctuation ? `bg-white/10 ${theme.text}` : 'text-zinc-500 hover:text-white'}`}"
)

# Daily toggle
content = content.replace(
    "                <span className=\"text-[9px] font-black tracking-widest uppercase text-zinc-400 flex items-center ml-2\"><CalendarCheck size={10} className=\"mr-1.5\" /> CHALLENGE</span>\n                <div className=\"flex glass-panel p-1.5 rounded-full\">\n                  <button\n                    onClick={toggleDaily}\n                    className={`px-4 md:px-6 py-2.5 rounded-full text-[11px] font-black tracking-widest transition-all flex items-center gap-2 ${dailyActive ? `bg-amber-500/20 text-amber-400 border border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.4)]` : 'text-amber-400/70 hover:text-amber-400 border border-transparent'}`}",
    "                <span className=\"text-[9px] font-black tracking-widest uppercase text-zinc-400 flex items-center ml-2\"><CalendarCheck size={10} className=\"mr-1.5\" /> CHALLENGE</span>\n                <div className=\"flex glass-panel p-1.5 rounded-full\">\n                  <button\n                    onClick={game.toggleDaily}\n                    className={`px-4 md:px-6 py-2.5 rounded-full text-[11px] font-black tracking-widest transition-all flex items-center gap-2 ${game.dailyActive ? `bg-amber-500/20 text-amber-400 border border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.4)]` : 'text-amber-400/70 hover:text-amber-400 border border-transparent'}`}"
)

# Code language selector
content = content.replace(
    "                  level === 'CODE' ? 'grid-cols-[1fr] opacity-100 mr-0' : 'grid-cols-[0fr] opacity-0 -mr-8 pointer-events-none'",
    "                  game.level === 'CODE' ? 'grid-cols-[1fr] opacity-100 mr-0' : 'grid-cols-[0fr] opacity-0 -mr-8 pointer-events-none'"
)

content = content.replace(
    "                        value={codeLanguage}\n                        onChange={(lang) => changeCodeLanguage(lang)}",
    "                        value={game.codeLanguage}\n                        onChange={(lang) => game.changeCodeLanguage(lang)}"
)

# Custom text area
content = content.replace(
    "                  level === 'CUSTOM' ? 'grid-cols-[1fr] opacity-100 mr-0' : 'grid-cols-[0fr] opacity-0 -mr-8 pointer-events-none'",
    "                  game.level === 'CUSTOM' ? 'grid-cols-[1fr] opacity-100 mr-0' : 'grid-cols-[0fr] opacity-0 -mr-8 pointer-events-none'"
)

content = content.replace(
    "                      value={customText}\n                      onChange={(e) => {\n                        const newText = e.target.value;\n                        setCustomText(newText);\n                        if (level === 'CUSTOM') {\n                          const final = mirroredMode\n                            ? newText.trim().split(' ').reverse().join(' ')\n                            : newText.trim();\n                          typing.setTargetText(final || 'Type your custom text above...');\n                        }\n                      }}",
    "                      value={game.customText}\n                      onChange={(e) => {\n                        const newText = e.target.value;\n                        game.setCustomText(newText);\n                        if (game.level === 'CUSTOM') {\n                          const final = game.mirroredMode\n                            ? newText.trim().split(' ').reverse().join(' ')\n                            : newText.trim();\n                          typing.setTargetText(final || 'Type your custom text above...');\n                        }\n                      }}"
)

# StatsPanel zenMode
content = content.replace(
    "            {!zenMode && (\n              <StatsPanel",
    "            {!game.zenMode && (\n              <StatsPanel"
)

# Modifier toggles
content = content.replace(
    "                    <button onClick={() => setSuddenDeath(!suddenDeath)} className={`p-2 rounded-lg transition-colors flex justify-center items-center ${suddenDeath ? 'bg-red-500/15 text-red-400' : 'hover:text-white hover:bg-white/[0.06]'}`} title=\"1HP: One mistake ends it\"><Skull size={17} /></button>",
    "                    <button onClick={() => game.setSuddenDeath(!game.suddenDeath)} className={`p-2 rounded-lg transition-colors flex justify-center items-center ${game.suddenDeath ? 'bg-red-500/15 text-red-400' : 'hover:text-white hover:bg-white/[0.06]'}`} title=\"1HP: One mistake ends it\"><Skull size={17} /></button>"
)

content = content.replace(
    "                    <button onClick={() => setGhostPacer(!ghostPacer)} className={`p-2 rounded-lg transition-colors flex justify-center items-center ${ghostPacer ? `${theme.bgAlpha} ${theme.vividText}` : 'hover:text-white hover:bg-white/[0.06]'}`} title={pbGhost ? `Ghost: race your best (${pbGhost.wpm} WPM)` : 'Ghost: 60 WPM pace'}><Ghost size={17} /></button>",
    "                    <button onClick={() => game.setGhostPacer(!game.ghostPacer)} className={`p-2 rounded-lg transition-colors flex justify-center items-center ${game.ghostPacer ? `${theme.bgAlpha} ${theme.vividText}` : 'hover:text-white hover:bg-white/[0.06]'}`} title={pbGhost ? `Ghost: race your best (${pbGhost.wpm} WPM)` : 'Ghost: 60 WPM pace'}><Ghost size={17} /></button>"
)

content = content.replace(
    "                    <button onClick={() => setFocusMode(!focusMode)} className={`p-2 rounded-lg transition-colors flex justify-center items-center ${focusMode ? `${theme.bgAlpha} ${theme.vividText}` : 'hover:text-white hover:bg-white/[0.06]'}`} title=\"Focus\"><Focus size={17} /></button>",
    "                    <button onClick={() => game.setFocusMode(!game.focusMode)} className={`p-2 rounded-lg transition-colors flex justify-center items-center ${game.focusMode ? `${theme.bgAlpha} ${theme.vividText}` : 'hover:text-white hover:bg-white/[0.06]'}`} title=\"Focus\"><Focus size={17} /></button>"
)

content = content.replace(
    "                    <button onClick={() => setBlindMode(!blindMode)} className={`p-2 rounded-lg transition-colors flex justify-center items-center ${blindMode ? `${theme.bgAlpha} ${theme.vividText}` : 'hover:text-white hover:bg-white/[0.06]'}`} title=\"Blind\"><Brain size={17} /></button>",
    "                    <button onClick={() => game.setBlindMode(!game.blindMode)} className={`p-2 rounded-lg transition-colors flex justify-center items-center ${game.blindMode ? `${theme.bgAlpha} ${theme.vividText}` : 'hover:text-white hover:bg-white/[0.06]'}`} title=\"Blind\"><Brain size={17} /></button>"
)

content = content.replace(
    "                    <button onClick={toggleMirror} className={`p-2 rounded-lg transition-colors flex justify-center items-center ${mirroredMode ? `${theme.bgAlpha} ${theme.vividText}` : 'hover:text-white hover:bg-white/[0.06]'}`} title=\"Mirror\"><FlipHorizontal size={17} /></button>",
    "                    <button onClick={game.toggleMirror} className={`p-2 rounded-lg transition-colors flex justify-center items-center ${game.mirroredMode ? `${theme.bgAlpha} ${theme.vividText}` : 'hover:text-white hover:bg-white/[0.06]'}`} title=\"Mirror\"><FlipHorizontal size={17} /></button>"
)

content = content.replace(
    "                    <button onClick={() => setFogMode(!fogMode)} className={`p-2 rounded-lg transition-colors flex justify-center items-center ${fogMode ? `${theme.bgAlpha} ${theme.vividText}` : 'hover:text-white hover:bg-white/[0.06]'}`} title=\"Fog\"><CloudFog size={17} /></button>",
    "                    <button onClick={() => game.setFogMode(!game.fogMode)} className={`p-2 rounded-lg transition-colors flex justify-center items-center ${game.fogMode ? `${theme.bgAlpha} ${theme.vividText}` : 'hover:text-white hover:bg-white/[0.06]'}`} title=\"Fog\"><CloudFog size={17} /></button>"
)

content = content.replace(
    "                    <button onClick={() => setStickyKeysMode(!stickyKeysMode)} className={`p-2 rounded-lg transition-colors flex justify-center items-center ${stickyKeysMode ? `${theme.bgAlpha} ${theme.vividText}` : 'hover:text-white hover:bg-white/[0.06]'}`} title=\"Sticky Keys\"><Magnet size={17} /></button>",
    "                    <button onClick={() => game.setStickyKeysMode(!game.stickyKeysMode)} className={`p-2 rounded-lg transition-colors flex justify-center items-center ${game.stickyKeysMode ? `${theme.bgAlpha} ${theme.vividText}` : 'hover:text-white hover:bg-white/[0.06]'}`} title=\"Sticky Keys\"><Magnet size={17} /></button>"
)

content = content.replace(
    "                    <button onClick={() => setOverclockedMode(!overclockedMode)} className={`p-2 rounded-lg transition-colors flex justify-center items-center ${overclockedMode ? 'bg-red-500/15 text-red-400' : 'hover:text-white hover:bg-white/[0.06]'}`} title=\"Overclocked\"><Timer size={17} /></button>",
    "                    <button onClick={() => game.setOverclockedMode(!game.overclockedMode)} className={`p-2 rounded-lg transition-colors flex justify-center items-center ${game.overclockedMode ? 'bg-red-500/15 text-red-400' : 'hover:text-white hover:bg-white/[0.06]'}`} title=\"Overclocked\"><Timer size={17} /></button>"
)

# TypingArea props
content = content.replace(
    "                blindMode={blindMode}\n                focusMode={focusMode}\n                fogMode={fogMode}",
    "                blindMode={game.blindMode}\n                focusMode={game.focusMode}\n                fogMode={game.fogMode}"
)

content = content.replace(
    "                stickyPenalty={stickyPenalty}\n                particles={particles.particles}\n                ghostPacer={ghostPacer}\n                combo={typing.combo}\n                zenMode={zenMode}",
    "                stickyPenalty={game.stickyPenalty}\n                particles={particles.particles}\n                ghostPacer={game.ghostPacer}\n                combo={typing.combo}\n                zenMode={game.zenMode}"
)

content = content.replace(
    "                isCodeMode={level === 'CODE'}",
    "                isCodeMode={game.level === 'CODE'}"
)

# Zen Mode Ambient
content = content.replace(
    "      {zenMode && (\n        <div className=\"fixed inset-0 flex items-center justify-center pointer-events-none opacity-20 z-0 animate-in fade-in zoom-in duration-1000 ease-out\">",
    "      {game.zenMode && (\n        <div className=\"fixed inset-0 flex items-center justify-center pointer-events-none opacity-20 z-0 animate-in fade-in zoom-in duration-1000 ease-out\">"
)

# Ready Modal
content = content.replace(
    "            <div className=\"flex justify-between items-center bg-zinc-900 p-5 rounded-2xl border border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer\" onClick={() => { setZenMode(true); typing.setPhase('COUNTDOWN'); typing.setCountdownTimer(5); }}>",
    "            <div className=\"flex justify-between items-center bg-zinc-900 p-5 rounded-2xl border border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer\" onClick={() => { game.setZenMode(true); typing.setPhase('COUNTDOWN'); typing.setCountdownTimer(5); }}>"
)

# TimedHud
content = content.replace(
    "      {typing.phase === 'TYPING' && testMode === 'time' && typing.startTime ? (\n        <TimedHud startTime={typing.startTime} duration={duration} theme={theme} />",
    "      {typing.phase === 'TYPING' && game.testMode === 'time' && typing.startTime ? (\n        <TimedHud startTime={typing.startTime} duration={game.duration} theme={theme} />"
)

# SettingsModal props
content = content.replace(
    "              suddenDeath={suddenDeath} setSuddenDeath={setSuddenDeath}\n              ghostPacer={ghostPacer} setGhostPacer={setGhostPacer}\n              focusMode={focusMode} setFocusMode={setFocusMode}\n              blindMode={blindMode} setBlindMode={setBlindMode}\n              mirroredMode={mirroredMode} toggleMirror={toggleMirror}\n              fogMode={fogMode} setFogMode={setFogMode}\n              stickyKeysMode={stickyKeysMode} setStickyKeysMode={setStickyKeysMode}\n              overclockedMode={overclockedMode} setOverclockedMode={setOverclockedMode}\n              zenMode={zenMode} setZenMode={setZenMode}",
    "              suddenDeath={game.suddenDeath} setSuddenDeath={game.setSuddenDeath}\n              ghostPacer={game.ghostPacer} setGhostPacer={game.setGhostPacer}\n              focusMode={game.focusMode} setFocusMode={game.setFocusMode}\n              blindMode={game.blindMode} setBlindMode={game.setBlindMode}\n              mirroredMode={game.mirroredMode} toggleMirror={game.toggleMirror}\n              fogMode={game.fogMode} setFogMode={game.setFogMode}\n              stickyKeysMode={game.stickyKeysMode} setStickyKeysMode={game.setStickyKeysMode}\n              overclockedMode={game.overclockedMode} setOverclockedMode={game.setOverclockedMode}\n              zenMode={game.zenMode} setZenMode={game.setZenMode}"
)

# launchDrill
content = content.replace(
    "  const launchDrill = (text: string) => {\n    setMicroDrillActive(true);",
    "  const launchDrill = (text: string) => {\n    game.setMicroDrillActive(true);"
)

# ============================================================
# STEP 19: Daily active conditional class in difficulty selector
# ============================================================
content = content.replace(
    "              <div className={`flex flex-col gap-2 transition-opacity ${dailyActive ? 'opacity-30' : 'opacity-100'}`}>",
    "              <div className={`flex flex-col gap-2 transition-opacity ${game.dailyActive ? 'opacity-30' : 'opacity-100'}`}>"
)

content = content.replace(
    "              <div className={`flex flex-col gap-2 transition-opacity ${lengthLocked || dailyActive ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>",
    "              <div className={`flex flex-col gap-2 transition-opacity ${lengthLocked || game.dailyActive ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>"
)

# ============================================================
# STEP 20: Handle Challenge Friend config type
# ============================================================
# This uses Level and CodeLanguage types but doesn't use the config state directly
# No change needed

# ============================================================
# Write the file
# ============================================================
with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done! File written.")
