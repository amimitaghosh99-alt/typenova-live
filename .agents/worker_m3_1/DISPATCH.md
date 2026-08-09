# Dispatch to Worker M3-1

## Context
Original User Request: `c:\Users\risho\OneDrive\Desktop\typenova-v2 - Copy\.agents\ORIGINAL_REQUEST.md`
Project Scope: `c:\Users\risho\OneDrive\Desktop\typenova-v2 - Copy\.agents\orchestrator\PROJECT.md`
Working Directory: `c:\Users\risho\OneDrive\Desktop\typenova-v2 - Copy\.agents\worker_m3_1\`

## Mandatory Write Ownership
You exclusively own and may edit:
- `src/components/academy/CyberHands.tsx`

## MANDATORY INTEGRITY WARNING
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Objective & Tasks
Implement Milestone 3: Anatomical Kinematics Engine.

1. **Exact Reach & Un-clamped Scaling / Rotation**:
   - In `getFingerTransform`: Remove or adjust artificial scale clamp (`[0.7, 1.4]`) so target scale allows fingertips to reach exact key coordinates (e.g. Spacebar reach required scale is ~`1.428`). Use `Math.min(1.8, Math.max(0.6, targetLength / restingLength))` or exact scale ratio so fingertips land precisely on target key centers (`Q`, `P`, `SPACE`, etc.).
   - Expand rotation clamp from `[-30, 30]` to `[-60, 60]` or anatomical limits so fingers reach outer keys without being artificially stopped short.

2. **Palm Joint Attachment & Zero Detachment**:
   - Prevent finger base contour points from detaching from the palm top edge (`y = 230`) during rotation/scaling.
   - Adjust contour paths or joint base rendering so that finger base nodes remain seamlessly attached inside/along the palm socket mesh (`<path d="...">`).
   - Ensure scaling operates outward along the finger vector relative to MCP origin so the base width at the socket remains grounded on the palm top border.

3. **Hand Container Shift Calibration**:
   - In `getHandTransform`: Calibrate hand translation factor from `0.40` X / `0.50` Y to a subtle, natural factor (`0.15`–`0.20` X / `0.20`–`0.25` Y) so the hand shift assists reach without yanking non-active resting fingers far off home row.

4. **Build & Verify**:
   - Run `npm run build` (`tsc -b && vite build`) and `npx eslint src/components/academy/CyberHands.tsx`.
   - Confirm exit code 0 and 0 errors.

5. **Handoff**:
   - Write your handoff report to `c:\Users\risho\OneDrive\Desktop\typenova-v2 - Copy\.agents\worker_m3_1\handoff.md`.
   - Send completion message to orchestrator.
