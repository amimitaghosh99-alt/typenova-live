# BRIEFING — 2026-09-01T01:50:07+05:30

## Mission
Investigate and blueprint the core scoring, grading, burst WPM, and accolade engine for `src/lib/scoringEngine.ts` (Milestone 1).

## 🔒 My Identity
- Archetype: explorer
- Roles: explorer, analyst, investigator
- Working directory: c:\Users\risho\OneDrive\Desktop\typenova-v2 - Copy\.agents\explorer_m1_1
- Original parent: 4e8a4c92-0b53-4a43-a689-1892c5452a1a
- Milestone: M1 (Core Scoring & Grading Engine)

## 🔒 Key Constraints
- Read-only investigation — do NOT modify source code directly
- Produce detailed handoff report with exact mathematical formulas, TypeScript interfaces, and integration blueprints
- Zero circular dependencies

## Current Parent
- Conversation ID: 4e8a4c92-0b53-4a43-a689-1892c5452a1a
- Updated: not yet

## Investigation State
- **Explored paths**: `PROJECT.md`, `ORIGINAL_REQUEST.md`, `src/components/ResultsScreen.tsx`, `src/hooks/useTypingEngine.ts`, `src/hooks/useRPGSystem.ts`, `src/utils/shareCard.ts`, `src/data/constants.ts`
- **Key findings**:
  1. `ResultsScreen.tsx` currently has hardcoded naive grade logic (`wpm > 100 -> S`, `wpm > 80 -> A`, etc.) where 40 WPM with 100% accuracy incorrectly gets Grade C.
  2. No standalone `scoringEngine.ts` existed yet.
  3. Formulated multi-factor CPI equation with speed baseline, precision multiplier, precision bonus, combo streak bonus, consistency bonus, and error penalty.
  4. Mathematical validation confirms 40 WPM @ 100% flawless evaluates to CPI ~85-97 (Grade S or A).
  5. Designed Burst WPM sliding window and accolade calculation rules.
- **Unexplored areas**: None for M1 scope.

## Key Decisions Made
- Multi-factor CPI formula balancing net velocity with high precision multipliers so accuracy is rewarded heavily over sloppy speed.
- Strict pure functional architecture for `src/lib/scoringEngine.ts` with zero circular dependencies.

## Artifact Index
- `.agents/explorer_m1_1/DISPATCH.md` — Initial dispatch message
- `.agents/explorer_m1_1/progress.md` — Liveness heartbeat
- `.agents/explorer_m1_1/handoff.md` — Comprehensive analysis and implementation blueprint
