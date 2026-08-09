# Project: CyberHands Coordinate Alignment, Kinematics, & Holographic Refinement

## Architecture
- `src/components/academy/CyberHands.tsx`: Render engine for 3D/2D sci-fi holographic hands, joint nodes, bone segments, palm base, and finger animations.
- `src/components/academy/VirtualKeyboard.tsx`: Key layout generator, coordinate definitions for each key (A-Z, Spacebar, modifiers), key hitboxes, and active state triggers.
- `src/components/academy/AcademyLayout.tsx`: Container layout embedding keyboard and hands.
- Interaction: Key press triggers target position lookup -> Hand model calculates MCP knuckle pivot, finger rotation/extension angles, and palm container translation.

## Feature Inventory
| # | Feature | Description | Milestone | Source | Status |
|---|---------|-------------|-----------|--------|--------|
| 1 | Survey & Technical Investigation | Analyze `CyberHands.tsx`, `VirtualKeyboard.tsx`, viewBox, key bounds, and current kinematics | M1 | Survey | DONE |
| 2 | Coordinate Alignment & Key Mapping | Align SVG viewBox coordinates, add missing `;` key to VirtualKeyboard, fix middle finger rest Y=76, fix Spacebar routing, fix sonar null check, fix zIndex stacking | M2 | R1 | DONE |
| 3 | Anatomical Kinematics Engine | Anchor finger movement to MCP knuckles, pivot and scale/rotate fingers without detaching from palm, calibrate container translation, remove artificial scale/rotation clamping | M3 | R2 | DONE |
| 4 | Premium Holographic Aesthetic | Layered glowing blurs, cyan/emerald palettes, scanlines, wireframe nodes, clean visual transitions | M4 | R3 | DONE |
| 5 | Verification & E2E Acceptance Testing | Verify exact fingertip touch on active keys (Q, Spacebar, Home row) and zero palm detachment | M5 | Acceptance Criteria | DONE |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Technical Survey & Codebase Investigation | Map SVG viewBox, key positions, kinematics logic, and style components | None | DONE |
| 2 | Coordinate System Alignment & Key Mapping | Fix `;` key in VirtualKeyboard, middle finger rest Y=76, Spacebar routing, sonar ripple null check, zIndex stacking | M1 | DONE |
| 3 | Anatomical Kinematics Engine | MCP origin rotation, finger scaling/extension, palm joint attachment, container shift calibration | M2 | DONE |
| 4 | Premium Holographic Aesthetic | Layered glowing blurs, wireframe nodes, sci-fi scanlines | M3 | DONE |
| 5 | E2E Testing & Acceptance Verification | Verify active key targeting, exact alignment, kinematic integrity | M4 | DONE |

## Interface Contracts
### `CyberHands` ↔ `VirtualKeyboard`
- Target key coordinate mapping function or props: `activeKey`, `activeFinger`.
- `VirtualKeyboard`: Standard key 46px x 46px, 7px gap. Row 0 start X=23 Y=23; Row 1 start X=41 Y=76 (10 keys A..;); Row 2 start X=69 Y=129; Row 3 spacebar center X=276 Y=182.
- `CyberHands`: Canvas `viewBox="0 0 552 400"`.
- Home Row Resting Coordinates: Left pinky (41,76), Left ring (94,76), Left middle (147,76), Left index (200,76); Right index (359,76), Right middle (412,76), Right ring (465,76), Right pinky (518,76).

## Code Layout
- `src/components/academy/CyberHands.tsx`
- `src/components/academy/VirtualKeyboard.tsx`
- `src/components/academy/AcademyLayout.tsx`
