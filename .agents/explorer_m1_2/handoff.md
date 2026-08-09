# Handoff Report — Kinematics & CyberHands Investigation

## 1. Observation

Direct observations from source code inspection of `src/components/academy/CyberHands.tsx`, `VirtualKeyboard.tsx`, and `AcademyLayout.tsx`:

### 1.1 ViewBox & Coordinate Alignment
- **Container & ViewBox Match**: In `AcademyLayout.tsx` (line 273), the wrapper `<div>` has `style={{ width: 552, height: 400 }}`. In `CyberHands.tsx` (line 302), `<svg viewBox="0 0 552 400" className="w-full h-full" ...>` has exact 1:1 mapping between SVG viewBox coordinates and element pixels.
- **KEY_MAP Coordinate Verification**:
  - Key dimensions in `VirtualKeyboard.tsx`: standard key = `46px` wide x `46px` high, `gap = 7px`.
  - Row 0 (Y=23): Q(23,23), W(76,23), E(129,23), R(182,23), T(235,23), Y(288,23), U(341,23), I(394,23), O(447,23), P(500,23).
  - Row 1 (Y=76): A(41,76), S(94,76), D(147,76), F(200,76), G(253,76), H(306,76), J(359,76), K(412,76), L(465,76), ';'(518,76).
  - Row 2 (Y=129): Z(69,129), X(122,129), C(175,129), V(228,129), B(281,129), N(334,129), M(387,129).
  - Row 3 (Y=182): SPACE(276,182) (Spacebar width: 256px, centered at 276px).
  - **Verdict**: `KEY_MAP` target coordinates in `CyberHands.tsx` are mathematically exact for key centers.

### 1.2 Hand Container & Finger Transform Logic
- **Hand Container Translation** (`CyberHands.tsx` lines 234-250):
  ```typescript
  const homeX = hand === "left" ? 200 : 359;
  const homeY = 76;
  const totalDx = keyInfo.x - homeX;
  const totalDy = keyInfo.y - homeY;
  return { x: totalDx * 0.40, y: totalDy * 0.50 };
  ```
  Applied via `<motion.g id="left-holo-hand" animate={leftHandMotion}>`. This translates the entire hand (Palm + all 5 fingers) by $(hx, hy)$.

- **Finger Transform Calculation** (`CyberHands.tsx` lines 252-285):
  ```typescript
  const mcpAbsX = f.mcp[0] + hx;
  const mcpAbsY = f.mcp[1] + hy;
  const targetDx = keyInfo.x - mcpAbsX;
  const targetDy = keyInfo.y - mcpAbsY;
  const targetLength = Math.hypot(targetDx, targetDy);
  const targetAngle = Math.atan2(targetDy, targetDx);
  const restingDx = f.tip[0] - f.mcp[0];
  const restingDy = f.tip[1] - f.mcp[1];
  const restingLength = Math.hypot(restingDx, restingDy);
  const restingAngle = Math.atan2(restingDy, restingDx);

  let rotate = (targetAngle - restingAngle) * (180 / Math.PI);
  rotate = Math.min(30, Math.max(-30, rotate));
  const scale = Math.min(1.4, Math.max(0.7, targetLength / restingLength));
  ```
- **DOM Transform Application** (`CyberHands.tsx` lines 372-377, 458-463):
  ```tsx
  <motion.g
    key={f.id}
    animate={motionProps}
    transition={{ type: "spring", stiffness: 400, damping: 30 }}
    style={{ transformOrigin: `${f.mcp[0]}px ${f.mcp[1]}px` }}
  >
  ```

### 1.3 Palm Mesh & Finger Base SVG Contour Coordinates
- **Left Palm SVG Path** (`CyberHands.tsx` line 351):
  `d="M 50,390 C 40,320 42,260 50,230 L 85,225 L 126,224 L 160,228 C 178,255 174,330 166,390 Z"`
  Top boundary edge of palm mesh: `(50, 230) -> (85, 225) -> (126, 224) -> (160, 228)`.
- **Finger Base Contours vs MCP Origins**:
  - `left-pinky`: MCP `[60, 230]`, Contour Base: `M 50,230 ... 68,230 Z` (Width: 18px).
  - `left-ring`: MCP `[98, 225]`, Contour Base: `M 85,225 ... 107,225 Z` (Width: 22px).
  - `left-middle`: MCP `[138, 224]`, Contour Base: `M 126,224 ... 146,224 Z` (Width: 20px).
  - `left-index`: MCP `[172, 228]`, Contour Base: `M 160,228 ... 182,228 Z` (Width: 22px).
  - `thumb`: MCP `[170, 275]`, Contour Base: `M 164,275 ... 191,280 Z` (Width: 27px).

---

## 2. Logic Chain

From the above observations, the step-by-step mathematical reasoning for why fingers detach from the palm and miss key targets is as follows:

### Step 2.1: 2D Uniform Scale Distorts Finger Base Width at Palm Line
1. The Framer Motion transform applies 2D uniform scaling (`scale(S)`) to the finger group `<motion.g>` relative to `transformOrigin: ${f.mcp[0]}px ${f.mcp[1]}px`.
2. Uniform 2D scale expands or contracts BOTH the length AND width of the finger.
3. For `scale = 1.3`, the base width of `left-pinky` increases from `18px` to `23.4px` ($18 \times 1.3$). The left base point `(50, 230)` shifts outward to $x = 60 + (50 - 60) \times 1.3 = 47\text{px}$.
4. For `scale = 0.8`, the base width shrinks from `18px` to `14.4px`.
5. Because the Palm Mesh underneath is a static path (`<path d="M 50,390..." />`) inside the hand group, any scale factor $S \neq 1.0$ causes the finger base contour to expand past or pull inside the fixed palm socket line, creating visual detachment/tearing.

### Step 2.2: Rigid 2D Body Rotation Swivels Base Contour Away From Palm Edge
1. The entire finger contour path is rotated as a single rigid body around `(mcpX, mcpY)`.
2. When `left-pinky` rotates clockwise by $+20^\circ$ around its MCP origin `(60, 230)`:
   - Its left base corner `(50, 230)` swivels upward to $(50.94, 225.78)$.
   - Its right base corner `(68, 230)` swivels downward to $(67.25, 233.38)$.
3. The static top edge of the palm mesh stays horizontal at $y = 230$.
4. This angular rotation lifts one side of the finger base above the palm line and pushes the other side below/outside it, opening a clear geometric gap between finger base and palm.

### Step 2.3: Artificial Clamping Truncates Reach & Target Angle
1. Lines 276–277 clamp rotation to $[-30^\circ, 30^\circ]$ and scale to $[0.7, 1.4]$.
2. **Spacebar Example**:
   - `SPACE` key is at $(276, 182)$. Left thumb MCP is at $(170, 275)$.
   - Hand translation: $hx = 30.4$, $hy = 53$.
   - Absolute MCP: $(200.4, 328)$.
   - Target distance from absolute MCP to Spacebar center: $L_{target} = \sqrt{75.6^2 + (-146)^2} = 164.41\text{px}$.
   - Resting thumb length: $L_{resting} = \sqrt{62^2 + (-97)^2} = 115.12\text{px}$.
   - Unclamped required scale: $164.41 / 115.12 = 1.428$.
   - **Clamped scale applied**: $1.40$.
   - Reached length: $1.40 \times 115.12 = 161.17\text{px}$.
   - **Deficit**: The thumb tip falls short of the Spacebar target by $3.24\text{px}$.
3. On keys requiring angular sweeps larger than $30^\circ$ (or negative sweeps), clamping forces the finger to stop rotating early, causing the luminous fingertip node to point off-target.

### Step 2.4: Hand Container Translation Multipliers (0.40 X / 0.50 Y)
1. `getHandTransform` applies $40\%$ X translation and $50\%$ Y translation to the entire hand container for active keys.
2. For distant keys like `Q` ($x=23, y=23$), `totalDx = -177`, `totalDy = -53`.
3. Hand translation: $hx = -70.8$, $hy = -26.5$.
4. Moving the hand container shifts the palm and all inactive fingers by over 70px to the left, pushing the palm mesh near or off the canvas boundary and creating unnatural whole-hand jumps.

---

## 3. Caveats

- **No Code Implementation Executed**: This investigation was strictly read-only per mission constraints. No project source files were modified.
- **Rendering Performance / Motion Framerate**: Spring physics settings (`stiffness: 400, damping: 30`) work smoothly in Framer Motion, but mathematical calculations must remain pure and lightweight inside `useMemo` or functional transform helpers.

---

## 4. Conclusion & Recommended Fix Strategy

### Root Causes Summary
1. **Finger Base Scaling & Rotation Detachment**: Applying 2D `scale` and `rotate` to an SVG `<g>` wrapper at `transformOrigin: mcp` alters the finger base width and swivels its bottom contour away from the static palm top edge.
2. **Artificial Clamping**: Hard-coded bounds (`Math.min(30, Math.max(-30, rotate))` and `scale` $[0.7, 1.4]$) prevent fingers from reaching target key centers on key extremes (Spacebar, Q, P).
3. **Container Shift Multipliers**: Uncalibrated container translation ($0.40$ / $0.50$) shifts the entire hand excessively.

### Recommended Fix Architecture for Implementer
1. **Anatomical Base Preservation / Dynamic Segment Kinematics**:
   - Option A: Draw the finger segments dynamically (or transform upper phalanges while maintaining the base anchor on the palm).
   - Option B: Dynamically recalculate/stretch only the finger length (or scale along Y axis / finger vector direction) without altering base width, and anchor finger base corners to palm attachment points.
2. **Unclamp Kinematics for Exact Target Alignment**:
   - Compute exact unconstrained rotation angle $\theta_{target} - \theta_{resting}$ and exact scale $L_{target} / L_{resting}$ so the fingertip coordinate $(Tip_x, Tip_y)$ aligns 100% with $(keyInfo.x, keyInfo.y)$.
3. **Calibrate Container Translation**:
   - Reduce container translation (e.g., $15\text{--}20\%$ X, $20\text{--}25\%$ Y) so hand movement subtly aids reach without distorting hand structure.

---

## 5. Verification Method

To independently verify these findings:
1. **Inspect Code Files**:
   - View `src/components/academy/CyberHands.tsx` lines 234–285 to confirm transform and clamping formulas.
   - View `src/components/academy/CyberHands.tsx` lines 351–426 to inspect SVG hierarchy (`<motion.g id="left-holo-hand">` -> Palm `<path>` + Finger `<motion.g>`).
2. **Simulate Key Transforms**:
   - Run calculations for key `SPACE` ($x=276, y=182$) with thumb MCP $(170, 275)$ to verify scale clamping at $1.40$ vs required $1.428$.
   - Run calculations for key `Q` ($x=23, y=23$) with left pinky MCP $(60, 230)$ to verify rotated base offset.
3. **Validation Test**:
   - When the fix is implemented, test active keys `Q`, `P`, and `SPACE` in the Academy view to ensure:
     a) Fingertip glow node lands exactly at key center.
     b) Finger base lines remain 100% attached to the palm contour during transition and press.
