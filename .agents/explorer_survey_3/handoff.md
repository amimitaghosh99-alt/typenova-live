# TypeNova Architecture Investigation Report: UI, Theme, Audio & Test Infrastructure (R4 Survey)

## 1. Observation

### 1.1 In-Game Active Typing Arena UI & Layout Architecture
- **Component Tree Structure**:
  - `src/App.tsx` (lines 1989–2036): Pointers and layout container for the `practice` stage. Renders a responsive CSS grid (`grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,30%)]`) hosting `PracticeArena` and `LeaderboardSidebar`.
  - `src/components/PracticeArena.tsx` (lines 61–283): Top-level arena orchestrator. Houses `ArenaConfigBar` (lines 68–81), `StatsPanel` (lines 84–101), mode modifier dock (lines 117–209), `TypingArea` (lines 211–233), spacebar ready prompt (lines 238–264), and abort button (lines 270–279).
  - `src/components/ArenaConfigBar.tsx` (lines 42–237): Single-row compact glassmorphism control bar featuring `SegmentedControl` for difficulty (`NOVICE`, `ADEPT`, `MASTER`, `QUOTES`, `CODE`, `CUSTOM`), word/time selector (`10`, `25`, `50`, `100` words or `15`, `30`, `60` seconds), mixins (`123`, `!?`), and `DAILY` challenge toggle. Separated by minimalist dot dividers (`w-1.5 h-1.5 rounded-full bg-white/10`).
  - `src/components/StatsPanel.tsx` (lines 60–112): 5-column HUD panel displaying:
    1. **Net WPM**: `Activity` icon + large stat (`{wpm}`).
    2. **Pacing Graph**: Mini SVG polyline mapping `timelinePoints` or "Type to Map".
    3. **Accuracy %**: `Target` icon + `{accuracy}%`.
    4. **Consistency %**: `BarChart2` icon + `{consistency}%`.
    5. **Combo**: `Flame` icon + `{combo}` counter, styled with `drop-shadow` and scaling when `combo > 20`.
  - `src/components/TimedHud.tsx` (lines 41–105): Mounted fixed at the top of the screen (`z-[var(--z-hud)]`) during active timed tests (`testMode === 'time' && phase === 'TYPING'`). Employs a zero-re-render `requestAnimationFrame` loop driving direct DOM mutations on progress bar width and remaining seconds span, swapping to urgent red styling at `<= 5s`.
  - `src/components/TypingArea.tsx` (lines 227–426): Frosted glass typing canvas (`.typing-canvas`, `backdrop-blur-[28px]`).
    - Dynamic canvas combo glow variable:
      ```tsx
      // TypingArea.tsx lines 234-240
      style={{
        '--combo-glow': combo > 60 ? `0 0 120px rgba(${theme.glowPrimary},0.6)`
          : combo > 40 ? `0 0 60px rgba(${theme.glowPrimary},0.3)`
          : combo > 20 ? `0 0 20px rgba(${theme.glowPrimary},0.1)`
          : '0 0 0 transparent',
        animation: shake && !zenMode ? 'shake 0.2s ease-in-out' : 'none',
      } as React.CSSProperties}
      ```
    - Sub-components: Memoized `Char` spans (lines 83–104) with particle anchors; `GlidingBar` smooth-glide caret (lines 468–554); `GlidingGhostBeacon` (lines 557–615) for PB and rival ghost pacers; and multiplayer opponent glide bars (lines 399–419).

### 1.2 Typing Engine & State Handling
- `src/hooks/useTypingEngine.ts`:
  - Maintains `phase` (`CONFIGURING` -> `READY` -> `COUNTDOWN` -> `TYPING` -> `FINISHED`).
  - Tracks `combo` and `maxCombo` in state (lines 67–68) as well as ref `comboRef` (line 80).
  - Single-pass `calculateStats` (lines 88–178) calculates `netWpm`, `rawWpm`, `currentAcc`, `consistency`, and `flawless` (maximum streak achieved in test).
  - `liveStats` interval runs every 500ms during `phase === 'TYPING'` (lines 263–277) to update stats in state.
- `src/components/TypingController.tsx` (lines 86–281):
  - Global keydown event listener.
  - On error (lines 239–255): plays `audio.playSound('error')`, resets `combo` and `comboRef.current` to `0`, triggers 200ms `shake` animation, applies sticky keys penalty if enabled, and triggers immediate failure if `suddenDeath` is active.
  - On correct keypress (lines 256–271): increments `comboRef.current` and `combo`, updates `maxCombo`, plays `audio.playSound('key')`, and triggers `particles.spawnParticles(...)` when `tetrisEffect` is enabled or `nextCombo >= 50`.

### 1.3 Sound Effects & Audio Engine
- `src/hooks/useAudioEngine.ts` (lines 1–89):
  - Pure procedural Web Audio API synthesizer — zero external audio files/assets.
  - Reuses a singleton `globalAudioCtx` (AudioContext).
  - Current sound types:
    ```typescript
    export type SoundType = 'key' | 'error' | 'levelup' | 'achievement' | 'click';
    ```
  - Profiles: `'thocky'`, `'alpaca'`, `'modelm'`, `'raindrops'`, `'arcade'`, `'clicky'`, `'linear'`.
  - Already possesses dynamic pitch-scaling based on combo:
    ```typescript
    // useAudioEngine.ts lines 32-44
    const comboFactor = Math.min(1, comboRef.current / 60);
    // ...
    osc.frequency.setValueAtTime(freq * (1 + comboFactor * 0.45), startT);
    gain.gain.setValueAtTime(gainVal + comboFactor * 0.25, startT);
    ```
  - Synchronized from `App.tsx` (line 606): `audio.setComboRef(typing.combo);`.

### 1.4 Dynamic Theme Color Binding & Glassmorphism System
- **Theme Definition**: `src/data/constants.ts` (lines 149–248).
  - `Theme` interface includes `name`, `text`, `vividText`, `solid`, `bgAlpha`, `glowPrimary`, `glowSecondary`, `drop`, `glow`, etc.
  - `theme.glowPrimary` is an RGB triplet string format: `'245, 158, 11'` (Amber), `'56, 189, 248'` (Sky), `'52, 211, 153'` (Matrix), `'217, 70, 239'` (Cyberpunk), etc.
  - In `src/hooks/useWallpaperTheme.ts` & `src/lib/colorExtractor.ts`, dynamic auto-extracted themes generate custom `glowPrimary` RGB triplets from canvas pixel analysis.
- **Strict Theme Binding Rules**:
  - Always use `style={{ color: \`rgb(\${theme.glowPrimary})\` }}` or `rgba(\${theme.glowPrimary}, <opacity>)` for borders, glows, shadows, and backgrounds.
  - Zero hardcoded Tailwind accent colors (e.g. `text-cyan-400`, `bg-amber-500`) for theme-sensitive elements.
- **Glassmorphism Reference (`liquid-glass-design`)**:
  - `.typing-canvas`: `linear-gradient(180deg, rgba(10,12,18,0.78), rgba(6,8,12,0.88))` + `backdrop-blur-[28px] saturate-[140%]`.
  - `.glass-panel`: `!bg-black/65` + `backdrop-blur-2xl` + `border border-white/15 shadow-xl`.
  - `.glass-pill`: `rgba(10, 12, 18, 0.75)` + `backdrop-blur-2xl` + `border-white/10`.

### 1.5 Testing and Build Infrastructure
- `package.json` contains:
  ```json
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "eslint .",
    "preview": "vite preview"
  }
  ```
- Build verification: `npm run build` executed and passed cleanly in 15.05s with code 0.
- No unit test suite (Vitest or Jest) currently installed in dependencies; project relies on TypeScript compilation (`tsc -b`), ESLint, and real browser verification.

---

## 2. Logic Chain

1. **Active Arena UI & Combo State Flow**:
   - Keystrokes enter via `window.addEventListener('keydown')` in `TypingController.tsx`.
   - Correct keystrokes increment `comboRef.current` and `typing.setCombo(nextCombo)` synchronously.
   - `TypingArea` receives `combo` prop and applies `--combo-glow` box shadow.
   - `StatsPanel` receives `combo` prop and renders the 5th stat card with `Flame` icon.
   - However, during active typing, the user's primary visual focus is on the text lines and caret inside `TypingArea`. `StatsPanel` sits above the arena, so users in deep flow state rarely gaze upward at the stats card.

2. **Analysis for R4 (Live Combo Counter & Non-Distracting Milestone Cues)**:
   - **Need**: Provide immediate, clean visual feedback for streaks and milestone achievements (50, 100, 150, 200) right in peripheral vision or integrated into the HUD/canvas border without occluding the text or jarring the typist.
   - **Visual Design Requirements**:
     - A compact, high-precision live combo counter (e.g. discreet floating badge near the arena corner or active HUD counter with dynamic glow pulse).
     - Milestone visual cues at 50, 100, 150, 200 streaks: subtle shimmer/sparkle particle burst around the canvas perimeter or smooth animated badge pulse (`animate-count-glow`), bound to `theme.glowPrimary`.
     - Non-distracting: No screen flash, no text displacement, zero intrusive overlays in the reading zone.
   - **Audio Design Requirements**:
     - Web Audio synthesis in `useAudioEngine.ts` can introduce dedicated milestone chord arpeggios (e.g. dual or triple harmonic sine/triangle pings at 50, 100, 150) that harmonize with the key click sounds.
     - Soft combo reset cue on error (already handled by `'error'`, but combo milestone sound is currently missing).

3. **Audio Engine Integration Architecture**:
   - Adding combo milestone sound cues is seamless because `useAudioEngine` is 100% procedural Web Audio.
   - We can extend `SoundType` with `'combo_milestone'` or pass a milestone tier parameter (e.g. 50, 100, 150) to `playSound('combo_milestone', tier)`.
   - Using procedural frequencies (e.g. ascending pentatonic/major chords like C5-E5-G5 or E5-G#5-B5 with gentle exponential gain curves) guarantees instant response without asset fetch delays.

4. **Theme Binding Architecture for New Indicators**:
   - All new visual elements (combo milestone badges, combo rings, particle glows) must query `theme.glowPrimary` directly.
   - Example:
     ```tsx
     style={{
       borderColor: `rgba(${theme.glowPrimary}, 0.5)`,
       backgroundColor: `rgba(${theme.glowPrimary}, 0.12)`,
       boxShadow: `0 0 20px rgba(${theme.glowPrimary}, 0.35)`,
       color: `rgb(${theme.glowPrimary})`,
     }}
     ```
   - This guarantees perfect aesthetic harmony across all 7 built-in themes and all dynamically extracted wallpaper palettes.

---

## 3. Caveats

1. **No Automated Test Framework**: Vitest/Jest is not configured in `package.json`. Verification of logic modifications must rely on `npm run build` (TypeScript compiler) and browser subagent visual verification.
2. **Replay & Multiplayer Sync**: Any new keystroke metadata or combo state must maintain compatibility with `ReplayModal` and `useRace` packet structures (`race.sendFinish`).
3. **Zen Mode / Focus Mode Rules**: When `zenMode` or `focusMode` is active, visual clutter is intentionally suppressed. Visual combo indicators must respect `zenMode` and hide gracefully.

---

## 4. Conclusion & Actionable Architecture Plan

### Core Architecture Summary

| Subsystem | Current State | R4 Target State | Target Files |
|---|---|---|---|
| **Combo Tracking** | State + Ref in `useTypingEngine`, updated in `TypingController` | Add milestone threshold detection (50, 100, 150, 200) and milestone event trigger | `src/hooks/useTypingEngine.ts`, `src/components/TypingController.tsx` |
| **Visual Cues** | Arena border box-shadow (`--combo-glow`) & `StatsPanel` card | Smooth, non-distracting live combo indicator + canvas perimeter milestone pulse with dynamic theme glow | `src/components/TypingArea.tsx`, `src/components/StatsPanel.tsx`, `src/index.css` |
| **Audio Engine** | Procedural Web Audio synth with pitch-shifted key clicks | Dedicated procedural milestone chime chords (50, 100, 150, 200) with soft exponential decay | `src/hooks/useAudioEngine.ts` |
| **Theme Binding** | Mixed theme tokens with `theme.glowPrimary` RGB triplet | Strict dynamic `rgb(${theme.glowPrimary})` / `rgba(${theme.glowPrimary}, ...)` on all new badges/glows | All modified UI components |
| **Build & Test** | `tsc -b && vite build` passing (15s) | Zero TS errors, verified production build | Full workspace |

---

## 5. Verification Method

To independently verify this survey:
1. **Source Inspection**:
   - Inspect `src/hooks/useAudioEngine.ts` for Web Audio synthesis structure.
   - Inspect `src/components/TypingArea.tsx` and `src/components/TypingController.tsx` for keystroke event flow and combo management.
   - Inspect `src/data/constants.ts` and `src/hooks/useWallpaperTheme.ts` for `glowPrimary` RGB triplet structure.
2. **Build Verification Command**:
   ```bash
   npm run build
   ```
   Must output `✓ built in ...` with exit code 0 and zero TypeScript errors.
3. **Runtime Verification**:
   - Launch dev server (`npm run dev` on port 3000) and verify typing in browser.
