# Milestone 1: Dead Code Removal — Changes Report

## Overview
All dead code, orphaned source files, unused imports, unused parameters/variables/types, redundant duplicate default exports, and duplicate utility implementations cataloged in Survey 2A (`survey_dead_code.md`) have been safely removed or localized with 100% clean TypeScript typecheck (`tsc --noEmit`) and production build (`npm run build`).

---

## Itemized Changes

### 1. Deleted Orphaned Files
- **`src/utils/audio.ts`** (150 lines deleted): Legacy Web Audio singleton `audioEngine` that was completely superseded by `src/hooks/useAudioEngine.ts`.
- **`src/components/SplashCursor.tsx`** (1,345 lines deleted): Standalone WebGL fluid simulation canvas with 0 references in the codebase.

### 2. Unused Imports Removed
- **`src/lib/progress.ts`**: Removed unused `recordConsent` import specifier from `@/lib/consent`.

### 3. Unused Variables, Parameters, Constants, and Types Removed
- **`src/components/AIChatBot.tsx`**: Removed unused destructured parameter `hideTrigger: _hideTrigger = false`.
- **`src/components/AccountMenu.tsx`**: Removed unused destructured parameter `onSignIn: _onSignIn`.
- **`src/components/RaceResultsScreen.tsx` & `src/App.tsx`**: Removed unused `roomSize: number` from `RaceResultsScreenProps` and destructured parameter in `RaceResultsScreen`, and removed `roomSize={race.roomSize}` pass in `App.tsx` (line 1071).
- **`src/components/SupportTechnician.tsx`**: Replaced unused catch variable `catch (error)` with standard parameterless `catch`.
- **`src/hooks/useSmartEngineConfig.ts`**: Converted unreassigned local variable `let models: string[]` to `const models: string[]`.
- **`src/data/constants.ts`**: Removed dead exported array `PRESET_KEYS`.
- **`src/hooks/useRPGSystem.ts`**: Removed orphaned `export interface AchievementState`.

### 4. Redundant Duplicate Default Exports Cleaned
- **`src/components/BlurText.tsx`**: Removed redundant `export default BlurText;` (imported everywhere as named import `{ BlurText }`).
- **`src/components/ui/bg-animate-button.tsx`**: Removed redundant `export default BgAnimateButton;` (imported everywhere as named import `{ BgAnimateButton }`).
- **`src/components/ui/starfield-background.tsx`**: Removed redundant `export default StarfieldBackground;` (imported everywhere as named import `{ StarfieldBackground }`).

### 5. Localized Internal-Only Symbols
- **`src/data/constants.ts`**: Localized `MASTER_SNIPPETS` and `QUOTES`; removed re-export of `CODE_LIBRARY`.
- **`src/data/customization.ts`**: Localized `FREE_BANNERS` and `PREMIUM_BANNERS`.
- **`src/lib/aiClient.ts`**: Localized `FALLBACK_LIMITS`, `USAGE_EVENT`, `getAIConfig`, `markModelWorking`, and `trackUsage`.
- **`src/lib/consent.ts`**: Localized `CURRENT_CONSENT_VERSION` and `CONSENT_KEYS`.
- **`src/lib/technicianBrain.ts`**: Localized `MODIFIER_LABELS`.
- **`src/components/academy/CyberHands.tsx`**: Localized `KEY_MAP`, `LEFT_HOLOGRAM_FINGERS`, and `RIGHT_HOLOGRAM_FINGERS`.
- **`src/components/SettingsModal.tsx`**: Localized `ToggleSwitch` and `ToggleSwitchProps`.
- **`src/components/StatsDashboard.tsx`**: Localized `loadPersonalBests`.
- **`src/utils/shareCard.ts`**: Localized `renderResultCard`.

### 6. Consolidated Duplicate Utility Functions
- **`src/hooks/useQuests.ts`**: Deleted private duplicate helper `getTodayString()` and imported standard `todayKey()` from `@/utils/seededRandom`.

---

## Verification Results
- **TypeScript Typecheck**: `npx tsc --noEmit` -> Exit Code: 0 (0 errors)
- **Production Build**: `npm run build` (`tsc -b && vite build`) -> Exit Code: 0 (Built cleanly in 17.88s)
