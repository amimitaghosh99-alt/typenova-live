# Original User Request

## 2026-09-01T01:43:14+05:30

Implement a comprehensive, multi-factor precision, accuracy, flawless streak (combo), and rhythm consistency scoring, grading (S+, S, A, B, C, D), and RPG progression engine across TypeNova.

Working directory: c:/Users/risho/OneDrive/Desktop/typenova-v2 - Copy
Integrity mode: development

## Requirements

### R1. Multi-Factor Composite Performance Grading
Upgrade the grade evaluation engine to compute a balanced Composite Performance Index factoring in Net WPM, Accuracy %, Flawless Combo Streaks, and Rhythm Consistency, supporting S+, S, A, B, C, D grades where high-precision runs are fairly rewarded (e.g. 100% accuracy at 40 WPM receives an A or S grade instead of C).

### R2. Precision & Streak RPG Progression Multipliers
Upgrade the RPG progression system to award substantial XP multipliers and unlocks for 100% Flawless runs (+50% XP), high combo milestones (50+, 100+, 200+ streaks), and metronome consistency (>85%), along with dedicated precision achievements.

### R3. Results Screen Precision Breakdown & Accolades
Display earned precision accolade badges (Flawless, Centurion Streak, Surgical Precision, Flow State), an XP multiplier breakdown, and rival precision delta comparisons on the post-test results screen. Follow the TypeNova glass design language and dynamic theme color binding rules (`rgb(${theme.glowPrimary})`).

### R4. Live In-Game Combo & Visual Precision Feedback
Integrate non-distracting visual and audio combo milestone cues (e.g. at 50, 100, 150 streaks) and clean precision indicators during active typing without cluttering the text arena.

## Acceptance Criteria

### Functionality & Scoring
- [ ] A 100% accuracy run at 40 WPM receives an A or S grade instead of C.
- [ ] 100% flawless runs award a +50% XP bonus, with combo and consistency bonus multipliers calculated accurately.
- [ ] Results screen renders earned accolade badges and XP breakdown cleanly.
- [ ] Ghost Net rival comparison shows accuracy/streak differential in addition to time delta.

### Design System & Code Quality
- [ ] All new/modified UI components strictly follow dynamic theme color bindings (`rgb(${theme.glowPrimary})` or `rgba(...)`) with zero hardcoded accent colors.
- [ ] Minimalist design standards maintained (no clutter over typing canvas).
- [ ] `npm run build` succeeds with zero TypeScript errors.
