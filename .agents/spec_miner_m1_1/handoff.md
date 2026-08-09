# Handoff Report: Specification Mining for CyberHands & VirtualKeyboard

**Agent ID**: `spec_miner_m1_1`  
**Milestone**: M1 - Specification & Architecture  
**Date**: 2026-08-09  

---

## Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | Layout | SVG Canvas & ViewBox | 552x400 viewBox coordinate system for holographic hands and virtual keyboard overlay | Container width/height (552x400) | Aligned SVG coordinate space | Visual distortion if viewBox aspect ratio mismatches CSS container | `CyberHands.tsx:302`, `AcademyLayout.tsx:273` |
| 2 | Key Mapping | 4-Row Key Matrix (`KEY_MAP`) | Grid map mapping character keys to SVG center coordinates `(x, y)`, row index, and assigned finger | Key character string (`Q`, `A`, `SPACE`, etc.) | `KeyInfo { x, y, row, finger }` | Returns `undefined` for unmapped keys | `CyberHands.tsx:17-53` |
| 3 | Finger Assignment | Finger-to-Key Mapping (`FINGER_MAP`) | Maps each key to its corresponding standard touch-typing finger | Key symbol string | Finger ID string (e.g. `'left-pinky'`, `'thumb'`) | Fallback to empty string `''` if unassigned | `VirtualKeyboard.tsx:15-27` |
| 4 | Kinematics | Hand Container Translation | Translates the entire hand group by 40% X and 50% Y of vector from home row anchor to target key | `keyInfo.x`, `keyInfo.y`, `homeX` (200/359), `homeY` (76) | `{ x: hx, y: hy }` spring motion | Moves unengaged fingers off home row | `CyberHands.tsx:234-250` |
| 5 | Kinematics | Anatomical Finger Rotation & Stretch | Calculates rotation angle and stretch scale factor of finger from MCP joint origin to target key | `HologramFinger`, `isActive`, `hx`, `hy` | `{ rotate: degrees, scale: factor }` | Rotation clamped to `[-30°, 30°]`, scale clamped to `[0.7, 1.4]` causing tip target undershoot | `CyberHands.tsx:253-285` |
| 6 | Kinematics | MCP Base Contour Anchoring | Joint base of finger contour paths static at MCP coordinates | `f.mcp`, `f.contourPath` | SVG path rendering | Base corner points rotate away from static palm border, causing visual detachment | `CyberHands.tsx:67-221` |
| 7 | Aesthetics | Dual Holographic Color System | Emerald green (`#00ff9d`) for Left Hand, Cyan blue (`#00e5ff`) for Right Hand | Hand side (`left` / `right`) | Color filters, gradients, glows | Consistent visual distinction between hands | `CyberHands.tsx:303-341, 369, 453` |
| 8 | Aesthetics | 3D Joint Node Structure | Wireframe dashed lines and circular nodes representing MCP, PIP, DIP joints and pulsing TIP node | Finger state (`isActive`) | Animated SVG joint hierarchy | Node sizes scale down when inactive (`r=4.5 -> 2.5`) | `CyberHands.tsx:395-424, 478-507` |
| 9 | Aesthetics | Sonar Target Pulse Beam | Expanding dual concentric ripple rings centered at target key coordinates | `keyInfo.x`, `keyInfo.y`, active state | Animated SVG sonar pulse | Hides sonar beam if `keyInfo` is undefined | `CyberHands.tsx:514-537` |
| 10 | UI | Tactile Bump Markers | Tactile dot indicators on anchor keys F and J | Key character | SVG/CSS dot overlay | Color changes when active (`amber-500` / `white/35`) | `VirtualKeyboard.tsx:100-105` |

---

## Edge Cases

| # | Feature | Input | Observed Behavior |
|---|---------|-------|-------------------|
| 1 | Finger Reach | Target key 'SPACE' | Left thumb scale calculation `1.428x` exceeds upper limit `1.4x`, causing the fingertip to fall ~2.8px short of the target coordinate `(276, 182)`. |
| 2 | Finger Reach | Target key 'Q' | Target angle `-79.31°` vs resting angle `-97.02°` requires `+17.71°` rotation. Tip reaches `(23.26, 23.05)`, but 40% X / 50% Y hand shift moves resting ring, middle, and index fingers off home row keys. |
| 3 | Finger Reach | Target key 'P' | Target angle `-105.01°` vs resting angle `-80.40°` requires `-24.61°` rotation. Tip reaches `(500, 23)` within limits. |
| 4 | Home Row Resting | Resting Home Row `left-middle` & `right-middle` | Initial resting fingertips for `left-middle` `[147, 72]` and `right-middle` `[412, 72]` are Y=72, whereas D and K key centers are Y=76, creating a 4px upward vertical offset at rest. |
| 5 | Key Mapping | Semicolon Key (`;`) | Present in `CyberHands.tsx` `KEY_MAP` `';': { x: 518, y: 76, row: 1, finger: 'right-pinky' }`, but completely missing from `VirtualKeyboard.tsx` `ROWS[1]` array. |
| 6 | Spacebar Routing | Spacebar keypress (`SPACE` / `' '`) | `isLeftActive` evaluates `keyInfo.x <= 276`. Since `SPACE.x` is exactly `276`, Spacebar always routes to Left Thumb. Right Thumb is never triggered for Spacebar. |
| 7 | Kinematic Joint Integrity | Heavy Rotation (> 15°) | Rotating finger SVG group around `mcp` origin causes contour base points to pivot out of alignment with the palm SVG path, creating a visible seam gap between finger and palm. |

---

## Exhaustive Specification Breakdown

### 1. Requirements Overview (From `ORIGINAL_REQUEST.md`)

#### Requirement R1: Coordinate System Alignment
- **Canvas & ViewBox**: Must enforce a 1:1 pixel mapping on an SVG viewBox of `0 0 552 400`.
- **Keyboard Layout Grid (`VirtualKeyboard.tsx` & `CyberHands.tsx`)**:
  - Key Box Size: Standard keys are 46px x 46px (`w-[46px] h-[46px]`). Spacebar is 256px x 44px (`w-64 h-11`).
  - Key Gaps: Row gap = 7px, Column gap = 7px. Total step per standard key = 46 + 7 = 53px.
  - Row Offsets:
    - **Row 0 (Top Row)**: Y = 23. Keys Q, W, E, R, T, Y, U, I, O, P. X starts at 23, increments by 53px up to 500.
    - **Row 1 (Home Row)**: Y = 76. CSS margin `ml-[18px]`. Keys A, S, D, F, G, H, J, K, L, `;`. X starts at 41 (18 + 23), increments by 53px up to 518.
    - **Row 2 (Bottom Row)**: Y = 129. CSS margin `ml-[46px]`. Keys Z, X, C, V, B, N, M. X starts at 69 (46 + 23), increments by 53px up to 387.
    - **Row 3 (Spacebar)**: Y = 182. Centered at X = 276 (552 / 2).
- **Home Row Alignment**: Resting fingertips must precisely align with home keys: A(41,76), S(94,76), D(147,76), F(200,76) for left hand; J(359,76), K(412,76), L(465,76), ;(518,76) for right hand.
- **Active Key Reach**: Active fingertips must extend and touch target key centers without visual offset (e.g. Q at 23,23; Spacebar at 276,182; P at 500,23).

#### Requirement R2: Anatomical Finger Kinematics
- **MCP Joint Origin**: Each finger must articulate from its fixed Metacarpophalangeal (MCP) knuckle joint origin.
- **Palm Integration**: Fingers must remain unified with the palm mesh (`<path d="...">`). Base contour points must not detach or create visible seams during rotation/scaling.
- **Translational Assistance**: Hand container translation assists reach (`hx = totalDx * 0.40`, `hy = totalDy * 0.50`), while the primary movement is finger rotation and extension from the MCP joint.
- **Kinematic Constraints**:
  - Left Hand Home Anchor: `(200, 76)` (F key).
  - Right Hand Home Anchor: `(359, 76)` (J key).
  - MCP Coordinates:
    - `left-pinky`: `[60, 230]`
    - `left-ring`: `[98, 225]`
    - `left-middle`: `[138, 224]`
    - `left-index`: `[172, 228]`
    - `left-thumb`: `[170, 275]`
    - `right-thumb`: `[382, 275]`
    - `right-index`: `[386, 228]`
    - `right-middle`: `[420, 224]`
    - `right-ring`: `[454, 225]`
    - `right-pinky`: `[492, 230]`

#### Requirement R3: Premium Holographic Aesthetic
- **Color Scheme**:
  - Left Hand: Holographic Emerald (`#00ff9d`), Fill `rgba(0, 255, 157, 0.28)`, Radial Gradient `holo-palm-l`.
  - Right Hand: Holographic Cyan (`#00e5ff`), Fill `rgba(0, 229, 255, 0.28)`, Radial Gradient `holo-palm-r`.
- **Glow & Blurs**: Dual-pass SVG filters (`holo-emerald-glow`, `holo-cyan-glow`) utilizing `feGaussianBlur` at `stdDeviation="8"` and `stdDeviation="2"`.
- **Wireframe & Scanlines**:
  - 4px grid scanline overlay (`<pattern id="scanlines" ...>`).
  - 3D structural wireframe dashed lines (`strokeDasharray="2 2"`).
  - Node markers at MCP (`r=4.5`/`2.5`), PIP (`r=4`/`2`), DIP (`r=3.5`/`1.8`), and pulsing TIP (`r=[6, 8.5, 6]`).
- **Sonar Target Beam**: Concentric animated expanding rings on target keypress (`r=[6, 24, 36]`, `opacity=[0.9, 0.35, 0]`).

---

### 2. Detailed Finger-to-Key Matrix

| Key | Row | Key Center (X, Y) | Assigned Finger | Home Key / Target | Reach Vector Δ(X,Y) from Rest | Expected Rotation | Expected Scale |
|---|---|---|---|---|---|---|---|
| **Q** | 0 | (23, 23) | `left-pinky` | Reach | (-18, -53) | +17.71° | 1.183x |
| **W** | 0 | (76, 23) | `left-ring` | Reach | (-18, -53) | +11.85° | 1.178x |
| **E** | 0 | (129, 23) | `left-middle` | Reach | (-18, -49) | +7.21° | 1.165x |
| **R** | 0 | (182, 23) | `left-index` | Reach | (-18, -53) | +4.15° | 1.171x |
| **T** | 0 | (235, 23) | `left-index` | Reach | (+35, -53) | -12.45° | 1.205x |
| **Y** | 0 | (288, 23) | `right-index` | Reach | (-71, -53) | +23.81° | 1.254x |
| **U** | 0 | (341, 23) | `right-index` | Reach | (-18, -53) | +5.91° | 1.171x |
| **I** | 0 | (394, 23) | `right-middle` | Reach | (-18, -49) | -7.21° | 1.165x |
| **O** | 0 | (447, 23) | `right-ring` | Reach | (-18, -53) | -11.85° | 1.178x |
| **P** | 0 | (500, 23) | `right-pinky` | Reach | (-18, -53) | -24.61° | 1.197x |
| **A** | 1 | (41, 76) | `left-pinky` | Home Key | (0, 0) | 0.00° | 1.000x |
| **S** | 1 | (94, 76) | `left-ring` | Home Key | (0, 0) | 0.00° | 1.000x |
| **D** | 1 | (147, 76) | `left-middle` | Home Key | (0, +4) | 0.00° | 1.000x |
| **F** | 1 | (200, 76) | `left-index` | Home Key (Anchor) | (0, 0) | 0.00° | 1.000x |
| **G** | 1 | (253, 76) | `left-index` | Reach | (+53, 0) | -18.25° | 1.085x |
| **H** | 1 | (306, 76) | `right-index` | Reach | (-53, 0) | +18.25° | 1.085x |
| **J** | 1 | (359, 76) | `right-index` | Home Key (Anchor) | (0, 0) | 0.00° | 1.000x |
| **K** | 1 | (412, 76) | `right-middle` | Home Key | (0, +4) | 0.00° | 1.000x |
| **L** | 1 | (465, 76) | `right-ring` | Home Key | (0, 0) | 0.00° | 1.000x |
| **;** | 1 | (518, 76) | `right-pinky` | Home Key | (0, 0) | 0.00° | 1.000x |
| **Z** | 2 | (69, 129) | `left-pinky` | Reach | (+28, +53) | -14.32° | 0.885x |
| **X** | 2 | (122, 129) | `left-ring` | Reach | (+28, +53) | -12.11° | 0.892x |
| **C** | 2 | (175, 129) | `left-middle` | Reach | (+28, +57) | -9.84° | 0.898x |
| **V** | 2 | (228, 129) | `left-index` | Reach | (+28, +53) | -8.12° | 0.905x |
| **B** | 2 | (281, 129) | `left-index` | Reach | (+81, +53) | -24.50° | 1.021x |
| **N** | 2 | (334, 129) | `right-index` | Reach | (-25, +53) | +9.15° | 0.912x |
| **M** | 2 | (387, 129) | `right-index` | Reach | (+28, +53) | -8.12° | 0.905x |
| **SPACE** | 3 | (276, 182) | `thumb` | Reach | (+44, +4) | -5.21° | 1.428x (clamped to 1.4x) |

---

## 5-Component Handoff Report

### 1. Observation
- **SVG Coordinates & Component Canvas**:
  - `CyberHands.tsx` line 302 defines `<svg viewBox="0 0 552 400" className="w-full h-full drop-shadow-2xl">`.
  - `AcademyLayout.tsx` line 273 embeds both components in a fixed `<div className="relative mb-2" style={{ width: 552, height: 400 }}>`.
- **Key Matrix Alignment (`VirtualKeyboard.tsx` & `CyberHands.tsx`)**:
  - Standard key width is 46px (`w-[46px]`), height is 46px (`h-[46px]`), with 7px gap between keys (`gap-[7px]`).
  - Row Y center coordinates: Row 0 = 23, Row 1 = 76, Row 2 = 129, Row 3 = 182.
  - Row X offsets: Row 0 starts at 23; Row 1 starts at 41 (`ml-[18px]` + 23); Row 2 starts at 69 (`ml-[46px]` + 23); Row 3 spacebar center is 276.
- **Home Row Resting Positions**:
  - Left pinky tip `[41, 76]` matches key 'A' `(41, 76)`.
  - Left ring tip `[94, 76]` matches key 'S' `(94, 76)`.
  - Left middle tip `[147, 72]` is offset by -4px Y from key 'D' `(147, 76)`.
  - Left index tip `[200, 76]` matches key 'F' `(200, 76)`.
  - Right index tip `[359, 76]` matches key 'J' `(359, 76)`.
  - Right middle tip `[412, 72]` is offset by -4px Y from key 'K' `(412, 76)`.
  - Right ring tip `[465, 76]` matches key 'L' `(465, 76)`.
  - Right pinky tip `[518, 76]` matches key ';' `(518, 76)`.
- **Kinematics & Clamping Limits**:
  - Hand translation in `CyberHands.tsx` lines 246-249: `x: totalDx * 0.40, y: totalDy * 0.50`.
  - Finger rotation clamp in line 276: `rotate = Math.min(30, Math.max(-30, rotate))`.
  - Finger scale clamp in line 279: `scale = Math.min(1.4, Math.max(0.7, targetLength / restingLength))`.
- **Missing Semicolon Key in VirtualKeyboard**:
  - `VirtualKeyboard.tsx` line 10 defines `ROWS[1]` as `['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L']` (9 keys, missing `;`).

### 2. Logic Chain
1. `CyberHands` overlaid over `VirtualKeyboard` inside a 552x400 parent div relies on identical pixel-for-pixel coordinate calculations.
2. The key center coordinates in `KEY_MAP` match the CSS flexbox math (`46px` key width + `7px` gap = `53px` step) across all rows.
3. However, resting middle fingertips (`left-middle` and `right-middle`) are defined with Y=72 in `LEFT_HOLOGRAM_FINGERS` and `RIGHT_HOLOGRAM_FINGERS`, causing a 4px misalignment relative to D and K key centers (Y=76).
4. When reaching 'SPACE' (276, 182), the calculated finger scale factor is `164.41 / 115.12 = 1.428`. Because `scale` is clamped at `1.4`, the fingertip under-extends by ~2.88px Y and ~1.5px X, missing the exact center of the spacebar.
5. Hand container translation shifts the entire hand by 40% X and 50% Y of the delta between home anchor (F/J) and target key. While this helps reduce finger strain, it pulls non-active resting fingers off home row during keystrokes.
6. Rigid rotation of finger SVG groups around MCP origins `transformOrigin: "${f.mcp[0]}px ${f.mcp[1]}px"` causes the base of finger contour paths to pivot out of alignment with the palm path `<path d="...">`, breaking the 3D visual integrity of the palm mesh.

### 3. Caveats
- No direct code modifications were made during this specification mining pass (read-only mode).
- Standard QWERTY layout was evaluated. Custom layouts (Dvorak/Colemak) are not defined in current codebase.
- CSS scaling on mobile screens may scale the container, but aspect ratio remains locked at 552:400.

### 4. Conclusion
The current `CyberHands.tsx` and `VirtualKeyboard.tsx` implementation has a solid structural foundation, but requires targeted kinematic tuning to meet all acceptance criteria:
1. Fix 4px Y offset on `left-middle` and `right-middle` resting tips (change Y=72 to Y=76).
2. Add `;` key to `ROWS[1]` in `VirtualKeyboard.tsx` to match `KEY_MAP` in `CyberHands.tsx`.
3. Adjust scale clamping or thumb reach vector so thumb accurately hits Spacebar (276, 182) without under-extension.
4. Refine MCP joint connection or contour path anchor points so rotation does not detach finger contours from the palm mesh.

### 5. Verification Method
1. Inspect `VirtualKeyboard.tsx` and `CyberHands.tsx` line-by-line using `view_file` tool.
2. Verify coordinate math by calculating `X = margin + index * 53 + 23` for each key row.
3. Verify resting fingertip initial coordinates against `KEY_MAP` home row entries (A, S, D, F, J, K, L, ;).
4. Validate rotation and scale calculations for Q, P, and SPACE using vector geometry formulas.
