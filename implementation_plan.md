# Implementation Plan — Word-Weakness Map + Spaced-Repetition Drills

> Supersedes the previous v2.6.0 layout/stacking plan (verified implemented in the current v2.8.0 codebase: `useAppChrome`, `lib/layout.ts`, `--z-*`/`--nav-h`/`--w-*` tokens are live).

[Overview]

Teach Typenova which words the player personally fumbles, persist that across sessions and devices, schedule those words for spaced-repetition (Leitner) review, and surface them in three places: a Word-Weakness panel on the Operator Dossier, a "N words due for review" badge on the Practice arena, and a Weakness Trainer card pinned in the Academy skill tree.

The codebase already collects everything needed. `useTypingEngine` logs every keystroke as `{ key, expected, time, isError, isBackspace? }` (`src/hooks/useTypingEngine.ts:9-18`) and `typing.keystrokeLog.current` is available at test completion. A lifetime per-KEY heatmap already exists (`rpg.processRPG` writes `typezen_heatmap`, rendered by `src/components/profile/KeyHeatmap.tsx`, with drill launching through `useSmartDrills.generateDrill(targets)`). What does not exist anywhere: word-level aggregation (a keystroke's `expected` char maps to a specific word in `targetText`), persistence of word stats, spaced-repetition scheduling, and word-targeted drill generation. This plan adds exactly those four pieces.

Scope guard: does not touch the realtime protocol (`useRace`, `useMatchmaking`, `useRoomDirectory`), shader/wallpaper systems, `useTypingEngine`'s math (the keystroke log is consumed, never modified), or the Academy unlock graph (the Trainer is a pinned card beside the tree, not a node — a dynamic node would corrupt `TOTAL_XP_AVAILABLE`, `TOTAL_STARS_POSSIBLE`, `computeUnlockedIds` and every persisted `starsMap`). No Supabase schema change — the snapshot rides the existing JSON `data` column.

[Types]

New in `src/lib/wordWeakness.ts`:

- `WordStat { total, errors, totalMs, box (0-5), due (ISO date), lastSeen (ISO date) }`
- `WordWeaknessMap = Record<string, WordStat>` (key = normalized word)
- `RunWordAggregate { word, total, errors, totalMs }` — one run, before persistence
- `DrillRunMeta { targetWords: string[] }` — attached to a launched drill so its words are SR-graded
- Constants: `WORD_WEAKNESS_KEY = 'typezen_word_weakness'`, `WORD_WEAKNESS_CAP = 400`, `MIN_WORD_LENGTH = 3`, `MIN_OBSERVATIONS = 4`, `BOX_INTERVAL_DAYS = [0, 1, 3, 7, 14, 30]`, `MAX_BOX = 5`

`ProgressSnapshot` (`src/lib/progress.ts`) gains `wordWeakness: WordWeaknessMap`. Old cloud rows lack the field; `normalizeWordWeakness` fills `{}`. No Supabase migration.

[Files]

New: `src/lib/wordWeakness.ts` (pure core), `src/hooks/useWordWeakness.ts` (state + persistence + PROGRESS_HYDRATED re-read), `src/components/profile/WordWeaknessPanel.tsx` (dossier card), `src/components/academy/WeaknessTrainerCard.tsx` (pinned Academy card), `src/tests/wordWeakness.test.ts` (tsx harness).

Modified: `src/lib/drillText.ts` (+`ensureWordTargets`), `src/hooks/useSmartDrills.ts` (+`generateWordDrill`, three tiers mirroring `generateDrill`), `src/lib/progress.ts` (snapshot field in K / read / write / normalize / merge), `src/App.tsx` (hook instance, `drillTargetWordsRef`, `launchDrill` meta param, completion-handler recording, `startWordDrill`/`startDueWordsDrill`, prop wiring to the three surfaces), `src/pages/OperatorDossier.tsx` (render panel beside KeyHeatmap), `src/components/PracticeArena.tsx` (optional `dueWordsCount`/`onTrainDue` pill), `src/components/academy/AcademyLayout.tsx` + `AcademySkillTree.tsx` (pinned trainer card), `src/data/changelog.ts` + `CHANGELOG.md`.

[Functions]

Pure core in `wordWeakness.ts`: `normalizeWord`, `wordSpans`, `aggregateWords` (pointer-based alignment: backspace decrements the pointer into targetText, every other keystroke attributes itself to the word owning the current char, then advances — exact because TypingController appends one char per non-backspace key), `recordRun` (totals accumulate; first-ever error enters a word at box 0 due today; healthy untracked words stay untracked), `gradeDrillRun` (SR step on drill targets only; totals/errors already recorded by recordRun — must not double-count), `mergeWordWeakness` (per word pick greater total — never sum; tie broken by earlier due), `dueWords`, `weakestWords`, `evictIfNeeded`, `normalizeWordWeakness`, `addDays`.

Hook: `useWordWeakness(): { map, dueCount, dueWords, weakest, recordRun, gradeDrillRun, clearAll }`.
Drills: `generateWordDrill(targetWords)` — cloud BYOK, then Gemini Nano, then procedural from NOVICE_SENTENCES; `ensureWordTargets(text, words)`.
App: `startWordDrill(words)` and `startDueWordsDrill()` callbacks; `launchDrill(text, meta?)` extended (all five existing call sites pass no meta and are untouched).

[Classes]

None. The codebase is entirely function components and hooks.

[Dependencies]

None added or upgraded. Reuses: `Keystroke` type, `NOVICE_SENTENCES`, `sanitizeDrillText`/`ensureTargets`, `onSyncEvent`, `rgba()` from profileMotion, lucide-react, sonner, and the existing `tsx`-run test harness (`src/tests/testHarness.ts` + `run_e2e.ts`). No vitest, no jsdom.

[Testing]

`src/tests/wordWeakness.test.ts`, registered in `run_e2e.ts`, 100% pass required (GEMINI.md convention):
1. normalizeWord (punctuation edges, internal apostrophe/hyphen kept, rejects short/symbol-only)
2. wordSpans (char index mapping)
3. aggregateWords WITH backspaces — the make-or-break alignment test
4. recordRun (first-error entry, accumulation, untracked-clean exclusion)
5. gradeDrillRun (promotion walk, error snap-to-0, box cap) — scheduling only, no total double-count
6. mergeWordWeakness (greater-total wins, tie earlier due, malformed dropped)
7. dueWords / weakestWords / evictIfNeeded (ordering, MIN_OBSERVATIONS gate, cap eviction)
8. Snapshot round-trip incl. legacy cloud row without the field
9. generateWordDrill procedural output contains every target with an empty pool

Manual matrix: deliberate typos appear in the panel, drill contains them, clean completion promotes boxes (localStorage check), backspace-heavy runs do not corrupt attribution, badge appears only when dueCount > 0 and vanishes after grading, Academy card launches identically, second-device merge does not double totals, races record stats, lint/build gates pass.

[Implementation Order]

0. Save this plan to implementation_plan.md.
1. Core library `wordWeakness.ts` (pure, no wiring).
2. Unit tests + run_e2e registration; 100% pass before any UI.
3. Persistence + sync (progress.ts; verify PROGRESS_HYDRATED emission covers re-hydration).
4. Drill generation (drillText.ts + useSmartDrills.ts).
5. Hook + App wiring (verify via localStorage inspection).
6. Dossier panel (first user-visible surface).
7. Practice badge.
8. Academy trainer card.
9. Ship: run_e2e 100%, lint vs baseline, npm run build, changelog entries.
