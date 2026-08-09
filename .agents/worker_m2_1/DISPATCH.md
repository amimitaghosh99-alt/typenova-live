# Dispatch to Worker M2-1

## Context
Original User Request: `c:\Users\risho\OneDrive\Desktop\typenova-v2 - Copy\.agents\ORIGINAL_REQUEST.md`
Project Scope: `c:\Users\risho\OneDrive\Desktop\typenova-v2 - Copy\.agents\orchestrator\PROJECT.md`
Working Directory: `c:\Users\risho\OneDrive\Desktop\typenova-v2 - Copy\.agents\worker_m2_1\`

## Mandatory Write Ownership
You exclusively own and may edit the following files:
- `src/components/academy/VirtualKeyboard.tsx`
- `src/components/academy/CyberHands.tsx`
- `src/components/academy/AcademyLayout.tsx`

## MANDATORY INTEGRITY WARNING
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Objective & Detailed Tasks
Implement Milestone 2: Coordinate System Alignment & Key Mapping.

1. **`src/components/academy/VirtualKeyboard.tsx`**:
   - Update `ROWS[1]` array to include the missing semicolon key `;`:
     `['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ';']`.

2. **`src/components/academy/CyberHands.tsx`**:
   - Fix middle finger resting Y coordinates: Change `left-middle` tip from `[147, 72]` to `[147, 76]` and `right-middle` tip from `[412, 72]` to `[412, 76]` in `LEFT_HOLOGRAM_FINGERS` and `RIGHT_HOLOGRAM_FINGERS` so middle fingertips align precisely on D and K centers at Y=76.
   - Fix Spacebar finger routing logic: Ensure spacebar keypress (`SPACE` / `' '`) routes to `thumb` (Left Thumb if X <= 276 or Right Thumb if X > 276) without breaking active state for either hand.
   - Fix sonar target ripple null check: Ensure sonar target ripple `<g>` renders only when `keyInfo && normalizedKey !== ""` so pulsing circles do not render at `(0, 0)` when no key is active.
   - Fix zIndex layering: Update wrapper `div` `zIndex` in `CyberHands.tsx` from `5` to `1` so `CyberHands` renders behind `VirtualKeyboard` (`zIndex: 2`) as a clean background ghost layer.

3. **Build & Verify**:
   - Run `npm run build` (`tsc -b && vite build`) and `npm run lint` (`eslint .`).
   - Confirm compilation and linting pass with zero errors.

4. **Handoff**:
   - Write your complete completion report with build/lint verification results to `c:\Users\risho\OneDrive\Desktop\typenova-v2 - Copy\.agents\worker_m2_1\handoff.md`.
   - Send a completion message back to the orchestrator.
