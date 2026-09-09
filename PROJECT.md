# Project: TypeNova Multi-Factor Precision & RPG Progression Engine

## Architecture
- **Scoring & Engine Layer**: `src/lib/scoringEngine.ts`, `src/hooks/useTypingEngine.ts`
  - Calculates Net WPM, Raw WPM, Accuracy %, Consistency %, Flawless Streak, Burst WPM.
  - Computes Composite Performance Index (CPI) and evaluates performance grade (`S+`, `S`, `A`, `B`, `C`, `D`).
- **RPG Progression Layer**: `src/hooks/useRPGSystem.ts`, `src/data/constants.ts`, `src/data/titles.ts`
  - Manages XP calculation, level progression curve, precision & streak multipliers (+50% Flawless, combo tiers, >85% consistency), and achievement/title evaluation.
- **In-Game HUD & Audio Layer**: `src/components/TypingArea.tsx`, `src/components/TypingController.tsx`, `src/components/StatsPanel.tsx`, `src/hooks/useAudioEngine.ts`
  - Active typing arena, peripheral combo feedback, procedural Web Audio milestone chimes, dynamic theme color binding (`rgb(${theme.glowPrimary})`).
- **Results & Social Analytics Layer**: `src/components/ResultsScreen.tsx`, `src/utils/shareCard.ts`, `src/hooks/useModeLeaderboard.ts`, `src/App.tsx`
  - Post-test results screen, accolade badges (Flawless, Centurion Streak, Surgical Precision, Flow State), interactive XP multiplier breakdown, Ghost Net rival precision & streak delta comparisons.
- **Testing & Verification Layer**: `src/tests/` (E2E & Unit Test Harness)
  - Comprehensive 4-tier test suite + adversarial coverage hardening.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---|---|---|---|
| 1 | Composite Performance Index (CPI) | Multi-factor precision scoring formula combining Net WPM, Acc%, Streak, and Consistency | M1 | ORIGINAL_REQUEST §R1 |
| 2 | S+, S, A, B, C, D Grading Engine | Grade evaluation rewarding high precision runs (e.g. 40 WPM @ 100% Acc -> A/S grade) | M1 | ORIGINAL_REQUEST §R1 |
| 3 | Burst WPM Calculation | Rolling window peak velocity calculation exposed in TypingStats | M1 | Survey Report 1 |
| 4 | Typing Engine Integration | Integration of CPI, Grade, and Burst WPM into `useTypingEngine.ts` | M1 | ORIGINAL_REQUEST §R1 |
| 5 | Flawless Run XP Multiplier (+50%) | +50% XP multiplier on 100% accuracy runs | M2 | ORIGINAL_REQUEST §R2 |
| 6 | Combo Milestone XP Multipliers | Tiered streak XP multipliers for 50+, 100+, 200+ combos | M2 | ORIGINAL_REQUEST §R2 |
| 7 | Rhythm Consistency XP Multiplier | +20% / +30% XP multiplier for consistency >= 85% | M2 | ORIGINAL_REQUEST §R2 |
| 8 | Structured XP Breakdown Object | `XpBreakdown` interface capturing base XP and all bonus percentages | M2 | ORIGINAL_REQUEST §R2 |
| 9 | Precision Achievements & Titles | Dedicated achievements (Centurion, Flow State, Surgical Precision) and player titles | M2 | ORIGINAL_REQUEST §R2 |
| 10 | Procedural Audio Milestone Chimes | Web Audio procedural harmonic arpeggios at 50, 100, 150, 200 combo | M3 | ORIGINAL_REQUEST §R4 |
| 11 | Non-Distracting Live Visual Combo Cues | Peripheral canvas glow pulse & subtle indicator with zero text obstruction | M3 | ORIGINAL_REQUEST §R4 |
| 12 | Dynamic Theme Color Binding (HUD) | Strict `rgb(${theme.glowPrimary})` / `rgba(...)` binding on arena indicators | M3 | GEMINI.md |
| 13 | Accolade Badges on Results Screen | Badges for Flawless, Centurion Streak, Surgical Precision, Flow State | M4 | ORIGINAL_REQUEST §R3 |
| 14 | Interactive XP Multiplier Breakdown UI | Glassmorphism card/chip displaying base XP and multiplier itemization | M4 | ORIGINAL_REQUEST §R3 |
| 15 | Ghost Net Rival Precision Delta | Differential comparison showing accuracy % and streak delta vs rival ghost | M4 | ORIGINAL_REQUEST §R3 |
| 16 | Dynamic Theme Color Binding (Results) | Zero hardcoded accent colors; complete dynamic theme color binding across Results Screen | M4 | GEMINI.md |
| 17 | Share Card S+ & CPI Support | Support S+ grade, CPI, and accolades on OpenGraph share card canvas | M4 | Survey Report 1 |
| 18 | E2E Testing Suite (Tiers 1-4) | Comprehensive opaque-box test harness validating all scoring, RPG, and delta rules | E2E | Project Pattern |
| 19 | Adversarial Hardening (Tier 5) | White-box edge case testing and robustness verification | M5 | Project Pattern |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|---|---|---|---|
| E2E | E2E Testing Track | Test harness & 4-tier test cases covering Features 1-17 | none | DONE |
| M1 | Core Scoring & Grading Engine | Features 1, 2, 3, 4: `src/lib/scoringEngine.ts` and `src/hooks/useTypingEngine.ts` | none | DONE |
| M2 | RPG Progression & Precision Multipliers | Features 5, 6, 7, 8, 9: `src/hooks/useRPGSystem.ts`, `src/data/constants.ts`, `src/data/titles.ts` | M1 | PLANNED |
| M3 | Live In-Game Combo & Audio/Visual Feedback | Features 10, 11, 12: `src/hooks/useAudioEngine.ts`, `src/components/TypingArea.tsx`, `src/components/TypingController.tsx` | none | PLANNED |
| M4 | Results Screen Accolades, XP Breakdown & Ghost Delta | Features 13, 14, 15, 16, 17: `src/components/ResultsScreen.tsx`, `src/hooks/useModeLeaderboard.ts`, `src/App.tsx`, `src/utils/shareCard.ts` | M1, M2 | PLANNED |
| M5 | Final Acceptance & Adversarial Hardening | Pass 100% E2E test suite + Tier 5 adversarial stress testing | E2E, M1, M2, M3, M4 | PLANNED |

## Interface Contracts
### `src/lib/scoringEngine.ts` ↔ `src/hooks/useTypingEngine.ts` & `src/components/ResultsScreen.tsx`
- `export type PerformanceGrade = 'S+' | 'S' | 'A' | 'B' | 'C' | 'D';`
- `export interface CPIBreakdown { cpi: number; grade: PerformanceGrade; baseSpeedScore: number; precisionMultiplier: number; precisionBonus: number; comboBonus: number; consistencyBonus: number; penalty: number; }`
- `export function calculateCPI(wpm: number, accuracy: number, flawlessStreak: number, consistency: number, totalChars: number): CPIBreakdown;`
- `export function evaluateGrade(cpi: number, accuracy: number, isFlawless: boolean): PerformanceGrade;`
- `export function calculateBurstWpm(keystrokeLog: Array<{ time: number; isError: boolean; isBackspace?: boolean }>, timeline?: Array<{ t: number; wpm: number }>): number;`
- `export function calculateAccolades(accuracy: number, flawlessStreak: number, consistency: number, totalWords: number, rawErrors: number): AccoladeBadge[];`

### `src/hooks/useRPGSystem.ts` ↔ `src/App.tsx` & `src/components/ResultsScreen.tsx`
- `export interface XpBreakdown { baseXp: number; flawlessBonusPct: number; comboBonusPct: number; consistencyBonusPct: number; totalMultiplier: number; totalXp: number; }`
- `processRPG: (finalWpm: number, finalAcc: number, currentMaxCombo: number, wordCount: number, targetTextLength: number, customActive?: boolean, isDrill?: boolean, keystrokeLog?: any, onLevelUp?: () => void, consistency?: number, rawErrors?: number) => { newXp: number; newTestsCompleted: number; updatedHeatmap: Record<string, any>; newBestCombo: number; xpBreakdown: XpBreakdown; }`
- `xpBreakdownLast: XpBreakdown | null`

### `src/hooks/useAudioEngine.ts` ↔ `src/components/TypingController.tsx`
- `SoundType = 'key' | 'error' | 'levelup' | 'achievement' | 'click' | 'combo_milestone';`
- `playSound: (type: SoundType, milestoneTier?: number) => void`

### `src/hooks/useModeLeaderboard.ts` ↔ `src/App.tsx` & `src/components/ResultsScreen.tsx`
- `export interface RivalGhost { userId: string; username: string; wpm: number; accuracy?: number; consistency?: number; samples: PaceSample[]; }`
- `ghostDeltaAcc?: number; ghostDeltaCons?: number;`

## Code Layout
- `src/lib/scoringEngine.ts`: Core CPI scoring, grade determination, burst WPM, and accolade computation algorithms.
- `src/hooks/useTypingEngine.ts`: Typing metrics collection and integration with `scoringEngine`.
- `src/hooks/useRPGSystem.ts`: XP multiplier calculation and precision achievement evaluation.
- `src/hooks/useAudioEngine.ts`: Procedural Web Audio synthesizer and milestone chime synthesis.
- `src/components/TypingArea.tsx` & `src/components/TypingController.tsx`: Peripheral combo feedback & milestone sound triggers.
- `src/components/ResultsScreen.tsx`: Results presentation, accolade badges, XP multiplier breakdown, Ghost delta, dynamic theme color bindings.
- `src/utils/shareCard.ts`: Share card generator supporting S+ and CPI.
- `src/tests/`: Opaque-box E2E test runner and test tier suites.
