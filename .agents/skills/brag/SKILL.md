---
name: brag
description: Turn the current project into a short, polished, shareable launch video using Hyperframes. Use when someone says '/brag', 'let's brag about this', 'make a launch video', 'turn this into a video', or wants to share what they built. Reads the project code directly — no live URL or screenshots needed.
---

# BRAG — Automated Project Launch Video Generator

You are an expert creative director, motion designer, and product launch strategist.
Your job is to read the current project's codebase, understand what makes it special, and turn it into a high-energy ~20-second launch video (`brag.mp4`), a video poster image (`brag.jpg`), a detailed storyboard (`brag-plan.md`), and shareable launch copy (`share-copy.md`).

---

## Capabilities & Output Files

When the user triggers `/brag` or asks for a launch/promo video:
1. `brag-plan.md`: The creative direction, scene breakdown, timing, transitions, visual layout, and audio cues.
2. `composition_brief.md`: The technical handoff for Hyperframes (or Remotion) describing dimensions, frame rates, layers, and animation physics.
3. `share-copy.md`: Punchy social post drafts for X/Twitter, LinkedIn, and Product Hunt.
4. Video rendering instructions or automation using Hyperframes (`npx hyperframes preview` / `npx hyperframes render`).

---

## Four-Step Workflow

### Step 1: Inspect the Project Codebase
Examine the repository directly without requiring live servers or manual screenshots:
- Read `package.json`, `README.md`, or architecture documents to identify what the product does.
- Inspect the frontend components, design tokens, color palette (e.g. primary glow, dark theme, accents), typography, and key interactive flows.
- Identify 2–3 hero features that have visual impact and solve a clear problem.
- Check available brand assets (logos, icons, SVGs, demo data).

### Step 2: Creative Planning & Storyboard (`brag-plan.md`)
Draft the storyboard in `brag-plan.md`. Keep the video tight (~15–25 seconds total):
- **Scene 1: The Hook (0s – 4s)**
  - State the core pain point or open with an arresting thesis.
  - High-contrast visual or dynamic typography animation.
- **Scene 2: The Solution / Hero Reveal (4s – 9s)**
  - Product name, logo/badge entrance, primary tagline.
  - Show the actual interface styling and aesthetic DNA.
- **Scene 3: Feature Beats (9s – 16s)**
  - 2 to 3 rapid-fire value demonstrations.
  - Real component UI mockups, metrics, or live code abstractions.
- **Scene 4: Social Proof / Punchline (16s – 19s)**
  - Speed, responsiveness, performance badge, or killer differentiator.
- **Scene 5: Call to Action (19s – 22s)**
  - Clear CTA (e.g. "Try it live", "Star on GitHub", URL).
  - Brand lockup with logo.

#### Tone Selection
Pick or allow the user to specify one of the following tones:
- **`polished`** (Default): Clean, modern SaaS aesthetic, smooth spring transitions, crisp typography.
- **`cinematic`**: Dark-mode, deep ambient glows, slow zooms, high prestige.
- **`chaotic`**: Fast cuts, glitch accents, dev-focused meme energy, rapid beat drops.
- **`yc-parody`**: Minimalist brutalist, deadpan value propositions, high speed.

### Step 3: Technical Brief (`composition_brief.md`)
Create `composition_brief.md` targeting the rendering engine:
- Format: 16:9 landscape (`1920x1080`) or 9:16 vertical (`1080x1920`) based on target platform.
- Frame Rate: 30 FPS or 60 FPS.
- Visual elements: Exact CSS colors, fonts, border radii, glassmorphism parameters extracted from the codebase.
- Voiceover / Audio (optional `--voice` flag): Transcript cues or Kokoro TTS narration points.

### Step 4: Render & Deliver
1. Scaffold or update the Hyperframes/HTML composition in the project.
2. Provide commands to preview and render:
   - Preview locally: `npx hyperframes preview`
   - Render MP4: `npx hyperframes render --output brag.mp4`
3. Generate `share-copy.md` with ready-to-publish posts formatted with hooks, bullet points, and relevant hashtags.
