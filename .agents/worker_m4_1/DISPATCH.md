# Dispatch to Worker M4-1

## Context
Original User Request: `c:\Users\risho\OneDrive\Desktop\typenova-v2 - Copy\.agents\ORIGINAL_REQUEST.md`
Project Scope: `c:\Users\risho\OneDrive\Desktop\typenova-v2 - Copy\.agents\orchestrator\PROJECT.md`
Working Directory: `c:\Users\risho\OneDrive\Desktop\typenova-v2 - Copy\.agents\worker_m4_1\`

## Mandatory Write Ownership
You exclusively own and may edit:
- `src/components/academy/CyberHands.tsx`

## MANDATORY INTEGRITY WARNING
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Objective & Tasks
Implement Milestone 4: Premium Holographic Aesthetic Refinement.

1. **Holographic Glow & Dual Color Filters**:
   - Ensure SVG filters `holo-emerald-glow` (Left Hand `#00ff9d`) and `holo-cyan-glow` (Right Hand `#00e5ff`) apply dual `<feGaussianBlur>` passes (`stdDeviation="8"` for soft ambient glow, `stdDeviation="2"` for crisp core highlight).
   - Ensure active fingers apply `filter="url(#holo-emerald-glow)"` or `filter="url(#holo-cyan-glow)"` dynamically.

2. **Wireframe Nodes & Luminous Fingertips**:
   - Ensure 3 knuckle joint node circles per finger (MCP `r=4.5/2.5`, PIP `r=4.0/2.0`, DIP `r=3.5/1.8`) highlight with distinct radius and stroke when active.
   - Ensure luminous active fingertip circle continuously pulses (`animate={{ r: [6, 8.5, 6] }}`) with glow filter when active.
   - Ensure dashed cross-phalange wireframe lines (`strokeDasharray="2 2"`) and solid bone axis rays render with dynamic opacity (0.9 active vs 0.35 inactive).

3. **Scanlines & Radial Palm Gradients**:
   - Ensure pattern `#scanlines` overlays palms and finger shapes with dynamic opacity.
   - Ensure radial gradients `holo-palm-l` and `holo-palm-r` render smooth sci-fi glowing palm fills.

4. **Sonar Target Pulse Beam**:
   - Ensure sonar ripples radiate expanding concentric rings over `keyInfo.x`, `keyInfo.y` when `normalizedKey !== ""`.

5. **Build & Verify**:
   - Run `npm run build` (`tsc -b && vite build`) and `npx eslint src/components/academy/CyberHands.tsx`.
   - Confirm exit code 0 and 0 errors.

6. **Handoff**:
   - Write handoff report to `c:\Users\risho\OneDrive\Desktop\typenova-v2 - Copy\.agents\worker_m4_1\handoff.md`.
   - Send completion message to orchestrator.
