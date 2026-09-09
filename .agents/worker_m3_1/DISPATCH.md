## 2026-09-01T02:33:14Z

You are the Implementation Worker for Milestone 3 (Live In-Game Combo & Precision Audio/Visual Feedback).
Working directory: c:\Users\risho\OneDrive\Desktop\typenova-v2 - Copy\.agents\worker_m3_1
Original Request: c:\Users\risho\OneDrive\Desktop\typenova-v2 - Copy\.agents\ORIGINAL_REQUEST.md
Project Document: c:\Users\risho\OneDrive\Desktop\typenova-v2 - Copy\PROJECT.md
Explorer Survey 3 Report: c:\Users\risho\OneDrive\Desktop\typenova-v2 - Copy\.agents\explorer_survey_3\handoff.md

Your exclusive write ownership:
- `src/hooks/useAudioEngine.ts`
- `src/components/TypingArea.tsx`
- `src/components/TypingController.tsx`
- `src/components/StatsPanel.tsx`

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Tasks:
1. In `src/hooks/useAudioEngine.ts`:
   - Extend `SoundType` to include `'combo_milestone'`.
   - Implement procedural Web Audio milestone chime synthesis in `playSound('combo_milestone', milestoneTier)`:
     - Use dual/triple harmonic sine/triangle chord arpeggios (e.g. C5-E5-G5, E5-G#5-B5, ascending pentatonic) with gentle exponential gain decay (0.2s duration) scaled by milestone tier (50, 100, 150, 200).
     - Pure Web Audio API synthesis with zero external audio assets.
2. In `src/components/TypingController.tsx`:
   - Track last rewarded combo milestone (e.g. in a ref `lastMilestoneRef`).
   - On correct keypress: when crossing 50, 100, 150, 200 combo thresholds, trigger `audio.playSound('combo_milestone', nextCombo)`.
   - On error: reset `lastMilestoneRef.current = 0`.
3. In `src/components/TypingArea.tsx` & `src/components/StatsPanel.tsx`:
   - Implement clean, non-distracting live combo feedback:
     - Subtle peripheral canvas glow pulse bound strictly to `rgb(${theme.glowPrimary})` or `rgba(${theme.glowPrimary}, ...)`.
     - Zero text canvas occlusion (keep the text arena clean and readable).
     - Respect `zenMode` and `focusMode`.
   - Strict adherence to TypeNova Workspace Rules (`GEMINI.md`):
     - NEVER hardcode accent colors like `text-cyan-400`, `text-amber-400`. ALWAYS use dynamic theme color binding: `style={{ color: \`rgb(\${theme.glowPrimary})\` }}` or `rgba(\${theme.glowPrimary}, ...)`.
     - Minimalist control bars.
4. Verify execution:
   - `npx tsx src/tests/run_e2e.ts` (All 129 tests must pass)
   - `npm run build` (Exit code 0)
5. Write your complete handoff report to:
   `c:\Users\risho\OneDrive\Desktop\typenova-v2 - Copy\.agents\worker_m3_1\handoff.md`

Send a completion message when done.
