# Teamwork Project Prompt — Draft

> Status: Ready for launch — awaiting user approval
> Goal: Craft prompt → get user approval → delegate to teamwork_preview

Rebuild the TypeNova Academy hand guidance overlay component (`CyberHands.tsx`) into a high-quality, realistic SVG vector hand visualization with organic curves, smooth Framer Motion animations, accurate key alignment, and neon glowing active states.

Working directory: c:\Users\risho\OneDrive\Desktop\typenova-v2 - Copy
Integrity mode: development

## Requirements

### R1. Realistic Organic Hand Silhouette
Render realistic SVG hand vectors with smooth curved fingers, natural palm contours, and glassmorphic radial gradients, replacing straight lines or boxy geometric shapes.

### R2. Smooth Animation & Neon Lighting
Integrate Framer Motion or SVG animation transitions so active fingers dynamically glow, pulse, and animate when active keys are pressed during lessons.

### R3. Precise Key & Finger Alignment
Align left hand fingers (Pinky, Ring, Middle, Index, Thumb) and right hand fingers accurately with home row keys (A, S, D, F, Space, J, K, L, ;) and spacebar without clipping or layer blocking.

## Acceptance Criteria

### Visual Quality & Anatomy
- [ ] Hands display natural curved hand silhouettes with realistic organic finger shapes rather than straight lines or boxy polygons.
- [ ] Left hand glows in neon emerald/green and right hand glows in cyan/blue with smooth radial gradient palm hulls.

### Interactivity & Alignment
- [ ] When a lesson step prompts a key press, the corresponding finger lights up with an active neon glow and animated ripple directly over the target keycap.
- [ ] Non-active fingers remain subtly visible as supportive guides without obscuring the virtual keyboard layout.

---
*Next: when approved → delegate via invoke_subagent (see Delegation Protocol)*
