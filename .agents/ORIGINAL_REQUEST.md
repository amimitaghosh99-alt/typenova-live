# Original User Request

## Initial Request — 2026-08-21T10:25:58Z

# Teamwork Project Prompt — Draft

> Status: Step 9 — Ready for launch — awaiting user approval.
> Goal: Craft prompt → get user approval → delegate to teamwork_preview
> Requested team: A small focused team (one self-contained refactor)

Complete Phase 3 of the "Cosmic Liquid Glass UI" transformation by restructuring the main layout into a 70/30 split and integrating the newly built `CosmicNavBar` and `CosmicLiquidShader` components.

Working directory: c:\Users\risho\OneDrive\Desktop\typenova-v2 - Copy
Integrity mode: development

## Requirements

### R1. Integrate New Components in App.tsx
In `src/App.tsx`, replace the `<StarfieldBackground>` component with the new `<CosmicLiquidShader theme={theme} />`. Remove the existing bulky `<header>` section (logo, academy button, profile capsule, action tray) and replace it with the new `<CosmicNavBar>` component, wiring up all the required props (theme, cloud/rpg state, and onOpen modal callbacks).

### R2. Restructure Main Layout (70/30 Split)
In `src/App.tsx`, reorganize the main content area (below the nav bar) into a two-column layout on desktop (`md:flex-row`). 
- **Left column (70%)**: Must contain the config filters, modifier tab, AnimatedHeight typing canvas, and the floating 'PRESS SPACE' pill.
- **Right column (30%)**: Must contain the leaderboard slab (which displays ALL/TODAY/FRIENDS tabs).
- On mobile/tablet (`<1024px`), these columns should stack vertically.
- Ensure the existing modal overlays (Settings, Stats, Race, Replay, etc.) remain intact and functional above this new layout.

### R3. Apply Display Typography
In `src/components/TypingArea.tsx`, apply the `.font-display` (Space Grotesk) utility class to HUD labels (e.g., live WPM, ACC counters, ghost race text) to distinguish them from the monospace target text.

## Acceptance Criteria

### Compilation & Type Safety
- [ ] Running `npx tsc --noEmit` produces zero TypeScript errors across the project.
- [ ] Running `npm run build` succeeds without failure.

### Visual Layout Verification
- [ ] `CosmicNavBar` renders at the top of the screen with working callbacks to open existing modals.
- [ ] The background successfully renders `CosmicLiquidShader` instead of the legacy `StarfieldBackground`.
- [ ] The main arena properly displays side-by-side (70/30) on large viewports.
