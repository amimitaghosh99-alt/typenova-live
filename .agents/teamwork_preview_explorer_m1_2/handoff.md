# Handoff Report: CyberHands & Framer Motion Investigation

## 1. Observation

### Key Files & Locations Examined
1. **`ORIGINAL_REQUEST.md` (lines 106–133)**:
   > "Rebuild the TypeNova Academy hand guidance overlay component (`CyberHands.tsx`) into a high-quality, realistic SVG vector hand visualization with organic curves, smooth Framer Motion animations, accurate key alignment, and neon glowing active states."
   > - Left hand glows in neon emerald/green and right hand glows in cyan/blue with smooth radial gradient palm hulls.
   > - When a lesson step prompts a key press, the corresponding finger lights up with an active neon glow and animated ripple directly over the target keycap.
   > - Non-active fingers remain subtly visible as supportive guides without obscuring the virtual keyboard layout.

2. **`package.json`**:
   - `framer-motion` is **NOT currently listed** in `dependencies` or `devDependencies`.
   - React version: `^19.2.0`.

3. **`src/components/academy/CyberHands.tsx` (307 lines)**:
   - Line 3–6: Props definition `interface CyberHandsProps { activeKey: string; activeFinger: string; }`.
   - Lines 21–137: `ALL_FINGERS` array containing 10 joint finger objects (5 left hand with `color: 'emerald'`, 5 right hand with `color: 'cyan'`). Each object defines joint nodes `tip`, `dip`, `pip`, `mcp`, `fleshD` (SVG cubic bezier path), and `boneD` (SVG centerline path).
   - Lines 139–146:
     ```tsx
     export function CyberHands({ activeKey, activeFinger }: CyberHandsProps) {
       const upperKey = activeKey.toUpperCase();
       const keyFinger = FINGER_MAP[upperKey === ' ' ? 'SPACE' : upperKey] || activeFinger;

       const getIsActive = (f: JointFinger) => {
         const fid = f.fingerMapId ?? f.id;
         return keyFinger === 'thumb' ? fid === 'thumb' : fid === keyFinger;
       };
     ```
   - Lines 157–192: SVG `viewBox="0 0 552 400"` with radial gradients (`#ch-palm-l`, `#ch-palm-r`) and neon SVG filters (`#glow-emerald-active`, `#glow-cyan-active`).
   - Lines 213–302: Mapping `ALL_FINGERS` using standard CSS transitions (`transition-all duration-300 ease-out`) and Tailwind CSS pulse (`className="animate-ping"`).

4. **`src/components/academy/VirtualKeyboard.tsx`**:
   - Lines 15–27: `FINGER_MAP` dictionary mapping characters to finger IDs:
     - `Q, A, Z` -> `'left-pinky'`
     - `W, S, X` -> `'left-ring'`
     - `E, D, C` -> `'left-middle'`
     - `R, F, V, T, G, B` -> `'left-index'`
     - `Y, H, N, U, J, M` -> `'right-index'`
     - `I, K` -> `'right-middle'`
     - `O, L` -> `'right-ring'`
     - `P` -> `'right-pinky'`
     - `SPACE` -> `'thumb'`

5. **`src/components/academy/AcademyLayout.tsx`**:
   - Lines 27–30:
     ```tsx
     const engine       = useAcademyEngine();
     const activeKey    = engine.currentStep?.targetKey    || '';
     const activeFinger = engine.currentStep?.finger       || '';
     ```
   - Lines 273–280:
     ```tsx
     <div className="relative mb-2" style={{ width: 552, height: 400 }}>
       <div className="relative" style={{ zIndex: 2 }}>
         <VirtualKeyboard activeKey={activeKey} activeFinger={activeFinger} />
       </div>
       <CyberHands activeKey={activeKey} activeFinger={activeFinger} />
     </div>
     ```

6. **`src/hooks/useAcademyEngine.ts`**:
   - Lines 50–63, 127–130: Exposes `currentStep` from `LESSONS[lessonIdx].steps[stepIdx]` containing `targetKey` and `finger`.

---

## 2. Logic Chain

### 2.1 Active Key Press Prompt Flow
1. **Lesson Engine**: `useAcademyEngine` reads current step `targetKey` (e.g. `'f'`) and `finger` (e.g. `'left-index'`) from `academyCurriculum.ts`.
2. **Layout Propagation**: `AcademyLayout` extracts `engine.currentStep?.targetKey` and `engine.currentStep?.finger` and passes them to `<CyberHands activeKey={activeKey} activeFinger={activeFinger} />`.
3. **Key-to-Finger Resolution**: Inside `CyberHands.tsx`, `FINGER_MAP[activeKey.toUpperCase()]` is checked first. If matched, it returns the target finger ID (e.g. `'left-index'`). If unmapped, it falls back to `activeFinger`.
4. **Active Finger Flag**: `getIsActive(f)` evaluates `true` for the matching finger object in `ALL_FINGERS`.

### 2.2 Target Finger Selection & Layout Alignment
- **Left Hand**: Pinky (`left-pinky`), Ring (`left-ring`), Middle (`left-middle`), Index (`left-index`), Thumb (`thumb`).
- **Right Hand**: Thumb (`thumb-right` mapped to `thumb`), Index (`right-index`), Middle (`right-middle`), Ring (`right-ring`), Pinky (`right-pinky`).
- **Coordinate Space**: The overlay container in `AcademyLayout.tsx` is fixed at `552px x 400px`. `CyberHands` uses `viewBox="0 0 552 400"`, matching the positioning of `VirtualKeyboard` keys in the overlay area.

### 2.3 Framer Motion Animation Architecture
Since `framer-motion` is targeted for smooth reactive SVG animations, the component will use SVG motion components (`motion.g`, `motion.path`, `motion.circle`):

1. **Finger Elevation & Lift**:
   - Active finger `<motion.g>` animates Y displacement and scale towards the keycap when activated:
     ```tsx
     <motion.g
       animate={{
         y: active ? -6 : 0,
         scale: active ? 1.05 : 1.0,
         opacity: active ? 1.0 : 0.30,
       }}
       transition={{ type: 'spring', stiffness: 300, damping: 22 }}
       style={{ transformOrigin: `${f.tip[0]}px ${f.tip[1]}px` }}
     >
     ```

2. **Neon Glow (`drop-shadow`, `filter`, `radial-gradient`)**:
   - Left Hand Active SVG Filter: `#glow-emerald-active` (`feGaussianBlur stdDeviation="6"`) + CSS `drop-shadow(0 0 14px rgba(16, 185, 129, 0.85))`.
   - Right Hand Active SVG Filter: `#glow-cyan-active` (`feGaussianBlur stdDeviation="6"`) + CSS `drop-shadow(0 0 14px rgba(6, 182, 212, 0.85))`.
   - Active Palm Hull Gradient:
     - Left Palm: `<radialGradient id="ch-palm-l">` with stops at `rgba(16, 185, 129, 0.45)` down to `0%`.
     - Right Palm: `<radialGradient id="ch-palm-r">` with stops at `rgba(6, 182, 212, 0.45)` down to `0%`.

3. **Scale Pulsing**:
   - Active Fingertip Node `<motion.circle>` pulsing:
     ```tsx
     <motion.circle
       cx={f.tip[0]}
       cy={f.tip[1]}
       animate={active ? { r: [7, 9.5, 7], scale: [1, 1.15, 1] } : { r: 4, scale: 1 }}
       transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
       fill={active ? glowColor : baseColor}
       filter={active ? activeFilter : undefined}
     />
     ```

4. **Animated Ripple Circles over Target Keycaps**:
   - Concentric expanding sonar ripple effect centered over active fingertip coordinates `(f.tip[0], f.tip[1])`:
     ```tsx
     {active && (
       <>
         <motion.circle
           cx={f.tip[0]}
           cy={f.tip[1]}
           initial={{ r: 8, opacity: 0.9, strokeWidth: 2.5 }}
           animate={{ r: [8, 28, 42], opacity: [0.9, 0.45, 0], strokeWidth: [2.5, 1.5, 0.5] }}
           transition={{ repeat: Infinity, duration: 1.4, ease: 'easeOut' }}
           fill="none"
           stroke={glowColor}
         />
         <motion.circle
           cx={f.tip[0]}
           cy={f.tip[1]}
           initial={{ r: 8, opacity: 0.9, strokeWidth: 2.5 }}
           animate={{ r: [8, 28, 42], opacity: [0.9, 0.45, 0], strokeWidth: [2.5, 1.5, 0.5] }}
           transition={{ repeat: Infinity, duration: 1.4, delay: 0.7, ease: 'easeOut' }}
           fill="none"
           stroke={glowColor}
         />
       </>
     )}
     ```

---

## 3. Color Token Definitions

| Color Token Category | Left Hand (Emerald/Green) | Right Hand (Cyan/Blue) | Purpose / Description |
|---|---|---|---|
| **Primary Glow Accent** | `#10b981` / `#34d399` / `#4ade80` | `#06b6d4` / `#38bdf8` / `#22d3ee` | Active key highlight & bone outline |
| **Active Flesh Fill** | `rgba(16, 185, 129, 0.25)` | `rgba(6, 182, 212, 0.25)` | High-tech glassmorphic interior fill |
| **Active Bone Line** | `#34d399` (strokeWidth: 3.5) | `#38bdf8` (strokeWidth: 3.5) | Anatomical skeleton centerline highlight |
| **Palm Radial Gradient (Center)** | `rgba(16, 185, 129, 0.45)` | `rgba(6, 182, 212, 0.45)` | Core palm hull glow intensity |
| **Palm Radial Gradient (Edge)** | `rgba(16, 185, 129, 0.00)` | `rgba(6, 182, 212, 0.00)` | Smooth edge decay into dark background |
| **Drop Shadow Effect** | `drop-shadow(0 0 14px rgba(16,185,129,0.85))` | `drop-shadow(0 0 14px rgba(6,182,212,0.85))` | Outer neon radiance filter |
| **Ripple Ring Stroke** | `#34d399` / `rgba(52, 211, 153, 0.85)` | `#38bdf8` / `rgba(56, 189, 248, 0.85)` | Expanding sonar radar circles |
| **Non-Active Supportive Fingers** | Opacity: `0.25` – `0.30`<br>Fill: `rgba(16, 185, 129, 0.05)`<br>Stroke: `rgba(16, 185, 129, 0.20)` | Opacity: `0.25` – `0.30`<br>Fill: `rgba(6, 182, 212, 0.05)`<br>Stroke: `rgba(6, 182, 212, 0.20)` | Non-intrusive guide hands that leave virtual keyboard keycaps 100% visible |

---

## 4. Caveats

1. **Dependency Installation**: `framer-motion` (or `motion`) must be present in `package.json`. If not installed, `framer-motion` should be added via `npm install framer-motion` or Framer Motion imports must be handled gracefully.
2. **Thumb Disambiguation**: In `FINGER_MAP`, `SPACE` is assigned to `'thumb'`. Both Left Thumb (`thumb`) and Right Thumb (`thumb-right`) currently match `thumb`. When active, both thumbs illuminate unless preferred side is specified.
3. **SVG Vector Smoothness**: When upgrading SVG path strings (`fleshD`, `boneD`) for organic curved finger silhouettes, knuckle joints (`MCP`, `PIP`, `DIP`) must maintain continuous bezier handles (`C` and `S` commands) to prevent angular polygonal artifacts.

---

## 5. Conclusion

`CyberHands.tsx` can be completely upgraded into a realistic, organic SVG hand overlay powered by Framer Motion SVG components. By utilizing `motion.g`, `motion.circle`, and `motion.path` with spring-driven elevation transforms, dual-staggered ripple circles over active keycaps, drop-shadow neon filters, and exact Emerald (Left) and Cyan (Right) color tokens, the academy interface will achieve high visual fidelity without obscuring keycap labels.

---

## 6. Verification Method

1. **Static Analysis & Type Checking**:
   - Run `npx tsc --noEmit` from root `c:\Users\risho\OneDrive\Desktop\typenova-v2 - Copy` to ensure zero TypeScript errors.
   - Run `npm run lint` to verify ESLint compliance.

2. **Visual Inspection**:
   - Mount Academy mode in browser (`npm run dev`).
   - Step through home row lessons (F, J, D, K, S, L, A, Space).
   - Confirm active left finger glows neon emerald (`#34d399`) with animated ripple circle over target key.
   - Confirm active right finger glows neon cyan (`#38bdf8`) with animated ripple circle over target key.
   - Confirm non-active supportive fingers maintain subtle opacity (`0.25 - 0.30`) so virtual keyboard keycaps remain clearly visible underneath.
