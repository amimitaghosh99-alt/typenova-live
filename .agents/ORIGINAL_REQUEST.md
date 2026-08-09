# ORIGINAL REQUEST

## Initial Request — 2026-08-09T15:52:42+05:30

You are the Project Orchestrator.
Your working directory is: c:\Users\risho\OneDrive\Desktop\typenova-v2 - Copy\.agents\orchestrator
The original user request is stored at: c:\Users\risho\OneDrive\Desktop\typenova-v2 - Copy\.agents\ORIGINAL_REQUEST.md

Please orchestrate and execute the completion of the user request:

### Objectives:
1. **R1. Expanded Curriculum**: Update `src/data/academyCurriculum.ts` to include at least 5 new tailored typing lessons (totaling 7+). Must cover:
   - Top Row (QWERTYUIOP)
   - Bottom Row (ZXCVBNM)
   - Spacebar and Shift/Caps Coordination
   - Full Alphabet Challenge (A-Z)
   - Punctuation Practice (,. / ; ' [ ])
   Each step must have valid targetKey and finger mapping matching VirtualKeyboard KEY_MAP.

2. **R2. Typing Metrics Feature (WPM & Accuracy)**: Update `useAcademyEngine.ts` and `AcademyLayout.tsx` (and related components) to track keystrokes, correct hits, errors, elapsed time, and calculate & display live WPM and Accuracy percentage in the Academy UI.

3. **R3. Dynamic Visual Feedback**: Enhance keypress feedback loop (green flash/"Perfect!" for correct key, red flash/screen shake/"Missed" for error, maintaining holographic aesthetic).

## Follow-up — 2026-08-09T16:05:10+05:30

# Teamwork Project Prompt — TypeNova Academy Expansion

Expand TypeNova Academy with advanced tailored lessons (Numbers, Symbols, Code/Dev Syntax, Speed N-Grams, Real Words) and new interactive learning features (Category Filters, Real-time WPM/Accuracy engine, Audio Haptics, Lesson Star Ratings & Analytics).

Working directory: c:\Users\risho\OneDrive\Desktop\typenova-v2 - Copy
Integrity mode: development

## Requirements

### R1. Comprehensive Tailored Lessons Expansion
Extend `src/data/academyCurriculum.ts` with new categorized lesson modules:
- **Numbers & Top Row**: Digits 0-9 with dedicated finger assignments.
- **Punctuation & Shift Key**: Capital letters, commas, periods, quotes, and question marks.
- **Developer Special**: Coding brackets `{ } [ ] ( )`, operators `= + - * /`, and symbols `< > ; :`.
- **Rhythm & Bigrams**: High-frequency English letter pairs (`th`, `he`, `in`, `er`, `an`, `re`, `nd`, `at`).
- **Word Flow Drills**: Full word practice sequences with finger guidance.

### R2. Category Navigation & Lesson Selection UI
Update `AcademyLayout.tsx` to group lessons into distinct visual categories ("Foundations", "Numbers & Punctuation", "Developer Code", "Speed & Rhythm") with tabbed filtering or accordion sections for easy navigation.

### R3. Real-Time Performance & Gamification Engine
Enhance `useAcademyEngine.ts` and `AcademyLayout.tsx` to include:
- **Live Lesson Stats**: Real-time WPM, Accuracy %, and current error-free Streak counter.
- **Lesson Mastery Rating**: 1-3 Star rating earned upon lesson completion based on accuracy.
- **Audio Feedback**: Subtle, crisp keypress audio toggle for correct key hits and error buzzes.

### R4. Keyboard & CyberHands Symbol Support
Ensure `KEY_MAP` and `FINGER_MAP` in `VirtualKeyboard.tsx` and `CyberHands.tsx` fully support all new numbers, symbols, shift key modifiers, and punctuation marks so the 3D Holographic Hands accurately highlight and reach every target key.

## Acceptance Criteria

### Curriculum & Coverage
- [ ] At least 8 new specialized lessons are added across 4 distinct categories in `academyCurriculum.ts`.
- [ ] All new keys (numbers, punctuation, symbols) have mapped finger hints in `KEY_MAP` and `FINGER_MAP`.

### UI & Features
- [ ] Academy sidebar features category filters/tabs for browsing lessons by difficulty and topic.
- [ ] Real-time WPM, Accuracy %, and Streak HUD are visible during active lesson playback.
- [ ] Upon finishing a lesson, a completion modal displays final score, accuracy, stars earned, and next lesson prompt.
- [ ] Audio feedback toggle is functional during lesson execution.
- [ ] The app compiles cleanly (`npm run build` / `npx tsc --noEmit`) with no TypeScript or lint errors.
