# TypeNova Academy Expansion — Master Plan

## Overview
Expand TypeNova Academy with comprehensive categorized lessons, category navigation UI, real-time performance & gamification engine, keyboard & CyberHands symbol support, and full build/typecheck verification.

## Decomposition & Strategy
1. **Phase 0: Codebase Survey & Feature Inventory**
   - Dispatch 3 parallel Explorers to investigate current codebase (`src/data/academyCurriculum.ts`, `AcademyLayout.tsx`, `useAcademyEngine.ts`, `VirtualKeyboard.tsx`, `CyberHands.tsx`, audio system, etc.)
   - Aggregate inventory and produce global `PROJECT.md`.

2. **Milestones**:
   - **M1: Curriculum & Keyboard/Hands Mapping (R1 & R4 Data/Mapping Layer)**
     - Add >=8 specialized lessons across 4 categories ("Foundations", "Numbers & Punctuation", "Developer Code", "Speed & Rhythm") in `src/data/academyCurriculum.ts`.
     - Update `KEY_MAP` and `FINGER_MAP` in `VirtualKeyboard.tsx` and `CyberHands.tsx` for numbers, symbols, shift keys, punctuation.
   - **M2: Category UI & Real-Time Engine (R2 & R3 Engine/UI Layer)**
     - Update `AcademyLayout.tsx` for category tabs/accordion navigation.
     - Update `useAcademyEngine.ts` & `AcademyLayout.tsx` for live stats (WPM, Acc %, streak), 1-3 star mastery rating, crisp audio toggle (keypress & error buzz), completion modal with next lesson prompt.
   - **M3: E2E Testing & Acceptance Verification**
     - Run comprehensive build check (`npm run build`, `npx tsc --noEmit`), audit integrity, and test feature coverage.

## Verification Gate Criteria
- 100% clean compilation (`npx tsc --noEmit` & `npm run build` pass with 0 errors).
- All 8+ lessons correctly categorized.
- All keys/symbols mapped in VirtualKeyboard and CyberHands.
- Reviewer APPROVE, Challenger verified, Forensic Auditor CLEAN.
