---
name: liquid-glass-design
description: >-
  Reference cheatsheet for TypeNova's dark frosted liquid glass design system.
  Use when creating or modifying glass panels, cards, tabs, or overlay UI elements.
---

# TypeNova Liquid Glass Design System

## Core Glass Backgrounds

| Element | Background | Blur | Extra |
|---------|-----------|------|-------|
| `.typing-canvas` | `linear-gradient(180deg, rgba(10,12,18,0.78), rgba(6,8,12,0.88))` | `backdrop-blur-[28px] saturate-[140%]` | `box-shadow: 0 25px 60px -15px rgba(0,0,0,0.8)` |
| `.glass-pill` | `rgba(10, 12, 18, 0.75)` | `backdrop-blur-2xl` | `border-white/10` |
| `.glass-panel` | `!bg-black/65` | `backdrop-blur-2xl` | `border border-white/15 shadow-xl` |
| Modifier Tab | `!bg-[#0A0C12]/80` | `backdrop-blur-2xl` | `border border-white/20 border-b-0` |

## Inverted Fillet Curve (Tab-to-Card Junction)

When a rounded tab meets a flat card edge, use an SVG inverted fillet to fill the 90° concave junction:

```svg
<svg width="20" height="20" viewBox="0 0 20 20" fill="none">
  <!-- Fill to match parent background -->
  <path d="M 0 0 C 0 11.0457 8.9543 20 20 20 L 0 20 Z" fill="rgba(10, 12, 18, 0.88)" />
  <!-- Border stroke to match glass rim -->
  <path d="M 0 0 C 0 11.0457 8.9543 20 20 20" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" fill="none" />
</svg>
```

Position: `translate-y-[1px] -ml-[1px]` to overlap seams.

## Dynamic Theme Glow Colors

- `theme.glowPrimary` = RGB triplet string, e.g. `'245, 158, 11'`
- Active pill glow: `backgroundColor: rgba(${theme.glowPrimary}, 0.22)`, `borderColor: rgba(${theme.glowPrimary}, 0.7)`, `boxShadow: 0 0 25px rgba(${theme.glowPrimary}, 0.45)`
- Active text: `color: rgb(${theme.glowPrimary})`, `textShadow: 0 0 14px rgba(${theme.glowPrimary}, 0.8)`

## Auto-Fetch Color Extraction Rules

When the user has Auto-Fetch enabled (`customAccent === 'auto'`), the color extractor in `src/lib/colorExtractor.ts` must:
- Filter out washed-out whites (lightness > 0.85)
- Filter out deep darks (lightness < 0.15)
- Filter out desaturated grays (saturation < 0.25)
- Always produce vibrant, high-contrast accent colors
