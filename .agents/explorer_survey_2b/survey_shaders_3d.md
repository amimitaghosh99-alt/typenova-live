# Survey Report: 3D KineticKeyboard, WebGL Shaders & Canvas Performance (Requirement R2)

## Executive Summary
This report provides an exhaustive investigation and performance audit of all 3D, WebGL, Shader, Canvas, and animation systems across TypeNova (targeting Requirement **R2: Optimize Animations and Framerates**). 

The audit identified critical WebGL resource leaks (missing `renderer.dispose()`, undeleted WebGL textures, FBOs, buffers, and shader programs), severe draw call amplification in the 3D Kinetic Keyboard (100+ separate meshes and draw calls per frame), extreme Canvas 2D per-frame allocation churn in StarfieldBackground (120,000 string allocations/sec at 120 FPS), double-rAF concurrency bugs in SplashCursor, and frame-rate-dependent physics lacking delta-time scaling.

Below is the complete component-by-component survey, root-cause analysis, and specific optimization architecture.

---

## 1. Component Inventory & Architecture Breakdown

| Component | File Path | Technology | Rendering Target | Lifecycle / Unmount Status | Primary Bottleneck / Risk |
|---|---|---|---|---|---|
| **KineticKeyboard** | `src/components/KineticKeyboard.tsx` | Three.js (WebGL) | Hero 3D interactive keyboard | ⚠️ Incomplete cleanup (missing `renderer.dispose()`, context leaks) | 100+ draw calls/frame; 100+ geometries & materials; framerate-dependent physics |
| **SplashCursor** | `src/components/SplashCursor.tsx` | Raw WebGL / WebGL2 | Interactive fluid simulation | ❌ Critical leak (0 textures, 0 FBOs, 0 buffers, 0 shaders deleted; no context loss) | 30+ full-screen render passes/frame; double rAF trigger bug; no idle sleep |
| **CosmicShaderBackground** | `src/components/CosmicShaderBackground.tsx` | Raw WebGL | Fullscreen raymarched nebula | ⚠️ Missing `WEBGL_lose_context` trigger | Per-pixel noise loop across full viewport; redundant per-frame uniform updates |
| **StarfieldBackground** | `src/components/ui/starfield-background.tsx` | Canvas 2D Context | Dynamic starfield background | ⚠️ High CPU / GC pressure | 800–1000 individual `arc()` + `fill()` calls/frame; 120k string allocations/sec at 120 FPS; no delta-time |
| **CyberHands** | `src/components/academy/CyberHands.tsx` | SVG + Framer Motion | RPG Academy holographic hands | ✅ React tree unmount clean | Multi-layer SVG Gaussian blur filters with simultaneous spring physics during fast typing |
| **WpmGraph** | `src/components/graphs/WpmGraph.tsx` | Inline SVG | Results pacing timeline | ✅ Clean SVG path calculation | Catmull-Rom path generation memoized |
| **ReplayModal** | `src/components/ReplayModal.tsx` | React DOM + rAF | Keystroke playback engine | ✅ rAF canceled on unmount | React state `setFrameIdx` triggered every rAF tick, re-rendering 1000+ Char elements |
| **GlidingBar & TypingArea** | `src/components/TypingArea.tsx` | React DOM + rAF | Smooth caret & ghost pacer | ✅ rAF & ResizeObserver disposed | Asynchronous measurement on caret move |

---

## 2. Deep Dive Analysis by Component

---

### Component 1: `KineticKeyboard.tsx` (Three.js 3D Interactive Keyboard)
**File**: `src/components/KineticKeyboard.tsx` (251 lines)

#### A. WebGL Context Lifecycle & Unmount Disposal
- **Current Cleanup Implementation** (Lines 227–237):
  ```typescript
  return () => {
    window.removeEventListener('resize', handleResize);
    window.removeEventListener('keydown', handleKeyDown);
    cancelAnimationFrame(animationFrameId);
    container.removeChild(renderer.domElement);
    scene.clear();
    keysArray.forEach(k => {
      k.mesh.geometry.dispose();
      (k.mesh.material as THREE.Material).dispose();
    });
  };
  ```
- **Defects & Leaks**:
  1. **Missing `renderer.dispose()`**: `THREE.WebGLRenderer` internal memory (render targets, shader programs, pipeline cache, buffer geometries cache) is NEVER released.
  2. **Missing `renderer.forceContextLoss()`**: The underlying WebGL rendering context is not explicitly lost. When users navigate between `/login` and `/` or log out, browsers will exhaust the hardware WebGL context pool (typically 8–16 contexts), resulting in `WARNING: Too many active WebGL contexts. Oldest context will be lost` and black screen crashes.
  3. **Undisposed Root Material**: `const material = new THREE.MeshPhongMaterial(...)` (line 75) is cloned for each key via `material.clone()`, but the original root `material` instance is never disposed.
  4. **Undisposed Lights**: `ambientLight`, `pointLight`, and `purpleLight` are added to the scene but not disposed.

#### B. Draw Call & Resource Allocation Bottlenecks
- **100+ Meshes and Draw Calls per Frame**:
  Lines 110–112:
  ```typescript
  const geo = new THREE.BoxGeometry(keyWidth, 0.25, baseSize);
  const keyMesh = new THREE.Mesh(geo, material.clone());
  ```
  Every single key in the 100% full-size layout allocates its own geometry, clone of the material, and mesh.
- **Per-Frame Uniform & Matrix Upload Overhead**:
  In `animate()` (Lines 181–206), `keysArray.forEach` mutates `key.position.y`, `mat.emissiveIntensity`, and `mat.emissive.setHex(...)` on ~100 distinct mesh objects. In WebGL, this requires 100+ separate shader invocations and uniform uploads per frame, bottlenecking the CPU-GPU driver command queue.

#### C. Frame Pacing & Timing
- **Hardcoded Frame-Rate Assumption**:
  Line 194: `key.position.y += (targetY - key.position.y) * 0.3;`
  Line 198: `mat.emissiveIntensity += (targetEmissive - mat.emissiveIntensity) * 0.3;`
  Using a fixed factor `0.3` without `deltaTime` causes spring animations to run 2x faster at 120 FPS and 4x faster at 240 FPS compared to 60 FPS.
- Uses `Date.now() * 0.001` instead of `performance.now()` or rAF timestamp.

#### D. Optimization Strategy for KineticKeyboard
1. **Batching with `THREE.InstancedMesh`**:
   - Convert standard key meshes to a single `THREE.InstancedMesh(sharedBoxGeometry, sharedMaterial, count)`.
   - Store per-instance transformation matrices (`setMatrixAt`) and colors/intensities (`setColorAt` or custom float instance attribute).
   - Reduces draw calls from **100+ down to 1 single draw call** per frame.
2. **Delta-Time Damped Interpolation**:
   - Use `1.0 - Math.exp(-decayRate * dt)` for framerate-independent spring physics at 60Hz, 120Hz, 144Hz, and 240Hz.
3. **Complete WebGL Disposal**:
   - Call `renderer.dispose()`, `renderer.forceContextLoss()`, dispose all geometries, materials, textures, and clear the scene.

---

### Component 2: `SplashCursor.tsx` (Raw WebGL Fluid Simulation)
**File**: `src/components/SplashCursor.tsx` (1368 lines)

#### A. WebGL Context Lifecycle & Unmount Disposal
- **Current Cleanup Implementation** (Lines 1297–1300):
  ```typescript
  return () => {
    cancelAnimationFrame(animationFrameId);
    abortController.abort();
  };
  ```
- **Defects & Critical Leaks**:
  1. **ZERO WebGL resource disposal on unmount**:
     - `gl.deleteTexture()` is NEVER called on any texture (Dye double FBO = 2 textures, Velocity double FBO = 2 textures, Divergence = 1 texture, Curl = 1 texture, Pressure double FBO = 2 textures).
     - `gl.deleteFramebuffer()` is NEVER called on any FBO (7 Framebuffers total).
     - `gl.deleteBuffer()` is NEVER called on the screen quad vertex/element buffers in `blit` (lines 649–654).
     - `gl.deleteProgram()` is NEVER called on any of the 9 compiled shader programs (`copyProgram`, `clearProgram`, `splatProgram`, `advectionProgram`, `divergenceProgram`, `curlProgram`, `vorticityProgram`, `pressureProgram`, `gradienSubtractProgram`).
     - `gl.deleteShader()` is NEVER called on the 10 compiled shader objects.
     - `gl.getExtension('WEBGL_lose_context')?.loseContext()` is NEVER called.
  2. **Re-render / Dependency Churn Leak**:
     The `useEffect` has 17 props in its dependency array (Lines 1301–1318). Whenever any prop changes, a completely new WebGL context, 7 FBOs, 8 textures, and 9 programs are allocated from scratch, abandoning the previous ones in GPU memory.

#### B. Double rAF Concurrency Bug
- Lines 1229–1238 & Lines 1248–1260:
  ```typescript
  function handleFirstMouseMove(e: MouseEvent) {
    ...
    updateFrame();
    ...
  }
  function handleFirstTouchStart(e: TouchEvent) {
    ...
    updateFrame();
    ...
  }
  ```
  If both mouse and touch events fire (e.g. touchscreen laptops, hybrid devices, stylus interaction), two concurrent `requestAnimationFrame(updateFrame)` loops are launched. Each loop continually schedules itself via `requestAnimationFrame(updateFrame)` at line 879, resulting in **2x physics updates and 60+ full-screen WebGL render passes per frame**, completely crashing framerate.

#### C. Performance Bottlenecks Preventing 120+ FPS
- **30+ Full-Screen Blits per Frame**:
  Each frame executes:
  - 1x Curl calculation
  - 1x Vorticity calculation
  - 1x Divergence calculation
  - 1x Pressure clear
  - 20x Jacobi Pressure iterations (`config.PRESSURE_ITERATIONS = 20`)
  - 1x Gradient subtraction
  - 2x Advection passes (velocity + dye)
  - 1x Display render pass
  Total: **28 full-screen blits** + display blit = 29 WebGL render passes per frame.
- **Over-Sized Texture Resolutions**:
  Default `DYE_RESOLUTION = 1440` with `scaleByPixelRatio(canvas.clientWidth)`. On high-DPI (Retina 2x/3x or 4K monitors), allocating half-float 16F textures at 2880x1800+ and executing 29 full-screen passes per frame creates a severe GPU fillrate bottleneck.
- **No Inactivity / Sleep Mode**:
  `updateFrame` runs continuously 120 times per second even when all fluid velocities have decayed to zero.

#### D. Optimization Strategy for SplashCursor
1. **Sleep / Quiescence Detection**:
   - Check maximum velocity or pointer active state. If no splat is active and fluid velocity has dissipated below `0.001`, cancel rAF and sleep until the next mouse/touch event.
2. **Adaptive Pressure Solver**:
   - Lower `PRESSURE_ITERATIONS` from 20 to 10–12 on high-refresh (120Hz+) and integrated GPU displays.
3. **Resolution & DPR Clamping**:
   - Clamp simulation and dye resolutions (`Math.min(DYE_RESOLUTION, 1024)`, clamp DPR to max 1.5).
4. **Comprehensive WebGL Deallocation**:
   - Implement an explicit `destroy()` function that deletes all textures, FBOs, vertex buffers, compiled programs, shaders, and triggers `loseContext()`.

---

### Component 3: `CosmicShaderBackground.tsx` (WebGL Raymarched Background)
**File**: `src/components/CosmicShaderBackground.tsx` (153 lines)

#### A. WebGL Context Lifecycle & Unmount Disposal
- **Cleanup Implementation** (Lines 134–144):
  ```typescript
  return () => {
    window.removeEventListener('resize', resizeCanvas);
    cancelAnimationFrame(animationFrameId);
    if (gl) {
      if (program) gl.deleteProgram(program);
      if (vertexShader) gl.deleteShader(vertexShader);
      if (fragmentShader) gl.deleteShader(fragmentShader);
      if (positionBuffer) gl.deleteBuffer(positionBuffer);
    }
  };
  ```
- **Analysis**:
  - Properly deletes program, shaders, buffer, resize listener, and cancels rAF.
  - Minor gap: Does not trigger `gl.getExtension('WEBGL_lose_context')?.loseContext()`.

#### B. Bottlenecks & Optimization Opportunities
1. **Redundant Per-Frame Uniform Setting**:
   Line 126: `gl.uniform2f(resolutionLocation, canvas.width, canvas.height);` is sent to the GPU on every rAF frame inside `render()`. Resolution only changes on window resize.
2. **Heavy Procedural Fragment Shader**:
   Lines 56–59:
   ```glsl
   for(float i = 1.0; i < 4.0; i++) {
       p.x += 0.2 / i * sin(i * 2.0 * p.y + t + noise(uv * 0.5) * 0.5);
       p.y += 0.2 / i * cos(i * 2.0 * p.x + t);
   }
   ```
   Evaluating a pseudo-random hash `noise()` function with 3 iterations of trigonometric warping for every screen pixel at 120 FPS places an unnecessary GPU shader load on mobile/integrated GPUs.
3. **Delta-Time & Timer**:
   Uses `Date.now() - startTime` instead of monotonic `performance.now()`.

---

### Component 4: `starfield-background.tsx` (Canvas 2D Starfield)
**File**: `src/components/ui/starfield-background.tsx` (114 lines)
Mounted in `App.tsx:1141`: `<StarfieldBackground starCount={1000} speedFactor={0.04} />`

#### A. Bottlenecks & Garbage Collection Churn
- **4000 Canvas 2D API Calls & 1000 String Allocations Per Frame**:
  Lines 65–87:
  ```typescript
  for (let i = 0; i < stars.length; i++) {
    ...
    ctx.beginPath();
    ctx.arc(px, py, size, 0, Math.PI * 2);
    ctx.fillStyle = `${colorStylePrefix} ${opacity})`;
    ctx.fill();
  }
  ```
  - For `starCount = 1000`, every animation frame executes:
    - 1,000 `ctx.beginPath()` calls
    - 1,000 `ctx.arc()` calls
    - 1,000 template string allocations (`${colorStylePrefix} ${opacity})`)
    - 1,000 `ctx.fill()` calls
  - **At 120 FPS**:
    - **120,000 string allocations per second** creating heavy V8 garbage collection spikes (micro-stutters during fast typing).
    - **480,000 Canvas 2D context state mutations per second**.
- **Frame Pacing**:
  Line 67: `star.z -= speedFactor * 15;` is fixed per frame without delta time. On 120Hz/240Hz monitors, stars travel 2x–4x faster than intended.

#### B. Optimization Strategy for StarfieldBackground
1. **Batch Pathing**:
   - Instead of 1,000 separate `beginPath()` / `fill()` calls with per-star fillStyle strings, quantize stars into 4–5 opacity buckets (e.g. 0.2, 0.4, 0.6, 0.8, 1.0).
   - In each bucket, build a single batched path with `ctx.rect()` or `ctx.arc()` and issue **1 single `ctx.fill()` per bucket** (reducing 4,000 API calls down to 5).
2. **Delta-Time Scaling**:
   - Compute `dt = (now - lastTime) / 16.667` and multiply speed factor by `dt`.

---

### Component 5: `CyberHands.tsx` (RPG Academy Holographic Hands)
**File**: `src/components/academy/CyberHands.tsx` (614 lines)

#### A. Bottlenecks & Optimization Opportunities
- **Heavy SVG Blur Filter Stacking**:
  Lines 304–323 define `#holo-emerald-glow` and `#holo-cyan-glow` with dual `feGaussianBlur` filters (stdDeviation 8 and 2) + `feMerge`.
  These filters are applied to:
  - Active finger contour paths (fill + stroke)
  - Wireframe structural lines (dashed + solid)
  - 3 knuckle joint nodes per finger
  - Pulsing fingertip nodes
  - Holographic sonar target beam circles
- **Chromium Filter Invalidation**:
  When typing at 100+ WPM in the RPG Academy (8–12 keystrokes/second), rapid updates to `activeKey` and `activeFinger` cause Framer Motion spring re-targeting, forcing Chromium to re-rasterize heavy SVG Gaussian blur filter graphs across multiple layers on every frame.
- **Optimization Strategy**:
  - Replace costly SVG `filter="url(#holo-emerald-glow)"` with CSS `drop-shadow` / hardware-accelerated CSS glow where possible.
  - Memoize static wireframe paths so only the active finger recalculates transforms.

---

### Component 6: `ReplayModal.tsx` (Typing Playback Engine)
**File**: `src/components/ReplayModal.tsx` (158 lines)

#### A. Bottlenecks & Optimization Opportunities
- **Per-Frame React State Churn**:
  In `tick()` (Lines 50–60), `setFrameIdx(idx)` is called on every rAF frame tick.
  Updating state at 60–120 FPS causes the entire `ReplayModal` component to re-render, executing `targetText.split('').map(...)` across hundreds/thousands of characters every 8.3ms.
- **Optimization Strategy**:
  - Only call `setFrameIdx` when the character index actually changes (`if (newIdx !== prevIdx) setFrameIdx(newIdx)`).
  - Use a ref for sub-frame playback progress bar interpolation or direct CSS transform updates.

---

## 3. Comprehensive Defect & Vulnerability Matrix

| Component | Category | Severity | Exact Location | Problem Description | Recommended Fix |
|---|---|---|---|---|---|
| `KineticKeyboard.tsx` | Resource Leak | **CRITICAL** | Line 227–237 | `renderer.dispose()` and `renderer.forceContextLoss()` not called on unmount. | Add `renderer.dispose()` & `renderer.forceContextLoss()`; dispose template material and lights. |
| `KineticKeyboard.tsx` | Draw Call Bottleneck | **HIGH** | Line 110–134 | 100+ individual meshes/draw calls created with cloned materials. | Migrate to `THREE.InstancedMesh` (1 draw call for all keys). |
| `KineticKeyboard.tsx` | Frame Pacing | **MEDIUM** | Line 194, 198 | Spring interpolation uses fixed `0.3` multiplier without `dt`. | Apply delta-time exponential smoothing `(1 - Math.exp(-k * dt))`. |
| `SplashCursor.tsx` | Memory / GPU Leak | **CRITICAL** | Line 1297–1300 | 0 textures, 0 FBOs, 0 buffers, 0 shader programs deleted on unmount. | Implement full WebGL resource deallocation (`gl.deleteTexture`, `gl.deleteFramebuffer`, `gl.deleteProgram`, `gl.deleteBuffer`, `loseContext`). |
| `SplashCursor.tsx` | Concurrency Bug | **HIGH** | Line 1234, 1254 | Mouse & Touch handlers both call `updateFrame()`, creating duplicate concurrent rAF loops. | Track running state with boolean flag; prevent duplicate rAF scheduling. |
| `SplashCursor.tsx` | GPU Fillrate Bottleneck | **HIGH** | Line 977–984 | 20 Jacobi pressure iterations + 8 full-screen blits per frame on unconstrained resolution. | Add quiescence sleep mode; reduce pressure iterations to 10–12; clamp FBO resolution. |
| `CosmicShaderBackground.tsx` | Redundant Uniforms | **LOW** | Line 126 | `u_resolution` uniform updated every single frame in render loop. | Move `gl.uniform2f(resolutionLocation, ...)` into `resizeCanvas()` handler. |
| `starfield-background.tsx` | GC & CPU Bottleneck | **HIGH** | Line 65–87 | 1000 individual `arc()`/`fill()` calls + string allocations per frame (120k allocs/sec at 120 FPS). | Quantize stars into 4–5 opacity buckets and batch into a single `ctx.fill()` per bucket. |
| `starfield-background.tsx` | Frame Pacing | **MEDIUM** | Line 67 | Star speed is constant per frame, moving 2x–4x faster on 120Hz/240Hz monitors. | Multiply movement by `deltaTime`. |
| `CyberHands.tsx` | GPU Rasterization | **MEDIUM** | Line 304–323, 370 | Heavy multi-stage SVG Gaussian blur filters recalculating during fast typing. | Replace nested SVG filters with CSS drop-shadow / hardware accelerated layers. |
| `ReplayModal.tsx` | State Churn | **MEDIUM** | Line 57 | `setFrameIdx(idx)` called every rAF tick, re-rendering 1000+ Char elements. | Only update state when index changes (`idx !== lastIdx`). |

---

## 4. Verification & Testing Strategy

To independently verify all findings and confirm fixes:
1. **WebGL Context Count Inspection**:
   - Open Chrome DevTools > Console.
   - Run: `const contexts = []; for (let i = 0; i < 20; i++) contexts.push(document.createElement('canvas').getContext('webgl'));`
   - Mount and unmount `KineticKeyboard` and `SplashCursor` 20 times by navigating between `/login` and `/`.
   - Verify that active WebGL context count does not grow and no `WARNING: Too many active WebGL contexts` appears.
2. **Chrome DevTools Performance Profiling (120+ FPS Target)**:
   - Record a 10-second typing session on the Starfield theme at 120Hz display refresh.
   - Verify that Canvas 2D garbage collection spikes are eliminated (zero major GC pauses).
   - Check draw calls in Three.js renderer (`renderer.info.render.calls === 1` with `InstancedMesh`).
3. **Double rAF Concurrency Check**:
   - In `SplashCursor.tsx`, attach a counter to `updateFrame()`. Trigger simultaneous touch and mouse events; verify that only 1 rAF loop runs per tick.
