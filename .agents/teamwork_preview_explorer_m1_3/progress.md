# Progress Log

- **Last visited**: 2026-08-08T16:55:00Z
- **Status**: Completed full read-only investigation of CyberHands.tsx, VirtualKeyboard.tsx, AcademyLayout.tsx, academyCurriculum.ts, and build status.
- **Key findings documented**:
  1. Key-to-Finger Mapping: Home row missing ';' key in ROWS and FINGER_MAP. Upper and lower letter keys mapped correctly. Number row missing entirely. Space mapped to 'thumb' triggering both left and right thumbs.
  2. Coordinates & Alignment: Left hand fingers align closely with A, S, D, F (within 1-8px). Right hand fingers suffer cumulative 56px vs 53px spacing drift (J +17px, K +20px, L +23px, ; +26px). Active ripple/glow is static at home row level and does not animate reach to top/bottom row keys.
  3. Responsive Scaling & Z-Index: Hardcoded 552x400 container lacks responsive scaling. CyberHands has internal `zIndex: 5` while VirtualKeyboard parent has `zIndex: 2`, placing hands over key labels and breaking keycap `z-20` stacking context.
  4. Build Status: TypeScript types valid, no unit test suite in repository.
