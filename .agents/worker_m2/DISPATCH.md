## 2026-08-14T14:27:23Z
You are teamwork_preview_worker_m2.
Your working directory: c:\Users\risho\OneDrive\Desktop\typenova-v2 - Copy\.agents\worker_m2
Project root: c:\Users\risho\OneDrive\Desktop\typenova-v2 - Copy
Authoritative Request: c:\Users\risho\OneDrive\Desktop\typenova-v2 - Copy\.agents\ORIGINAL_REQUEST.md
Survey Findings: c:\Users\risho\OneDrive\Desktop\typenova-v2 - Copy\.agents\explorer_survey_2b\survey_shaders_3d.md
Project Scope: c:\Users\risho\OneDrive\Desktop\typenova-v2 - Copy\.agents\orchestrator_2\PROJECT.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Task — Milestone 2 (3D KineticKeyboard, Background Shaders & WebGL/Canvas Optimization):
Implement high-performance, leak-free, 120+ FPS optimizations across all 3D, WebGL, Shader, and Canvas components:

1. `src/components/KineticKeyboard.tsx`:
   - Replace 100+ individual meshes with `THREE.InstancedMesh` (or efficient shared geometry/instance matrices) to achieve 1 single draw call per frame.
   - Implement complete unmount teardown: call `renderer.dispose()`, `renderer.forceContextLoss()`, clean container DOM node, dispose all geometries, materials, textures, cancel rAF loop, and remove window event listeners (`resize`, `keydown`).
   - Implement delta-time (`performance.now()`) spring animation physics for consistent 120+ FPS high-refresh rate movement.

2. `src/components/ui/starfield-background.tsx`:
   - Eliminate per-frame garbage collection pressure: batch star rendering into discrete opacity buckets (e.g. 8-10 buckets) with single `beginPath()`, multiple `moveTo()`/`arc()`, and a single `ctx.fill()` per bucket.
   - Eliminate 120,000 string allocations per second by pre-computing or caching color/opacity styles.
   - Scale star movement with delta-time.

3. `src/components/CosmicShaderBackground.tsx`:
   - Optimize render loop: update `u_resolution` uniform only on resize rather than every rAF frame.
   - Implement full WebGL unmount cleanup: `gl.deleteShader`, `gl.deleteProgram`, `gl.deleteBuffer`, and call `gl.getExtension('WEBGL_lose_context')?.loseContext()`.

4. `src/components/ReplayModal.tsx`:
   - Throttle or optimize replay rAF playback to update `setFrameIdx` only when integer frame progresses, avoiding duplicate React renders.

5. Verification:
   - Run `npx tsc --noEmit` and `npm run build`.
   - Verify 0 TypeScript errors and 0 build errors.

Write your changes report to `c:\Users\risho\OneDrive\Desktop\typenova-v2 - Copy\.agents\worker_m2\changes.md` and handoff report to `c:\Users\risho\OneDrive\Desktop\typenova-v2 - Copy\.agents\worker_m2\handoff.md`. Send a completion message to parent when done.
