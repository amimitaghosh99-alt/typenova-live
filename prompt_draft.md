# Teamwork Project Prompt — Draft

> Status: Launched
> Goal: Craft prompt → get user approval → delegate to teamwork_preview
> Requested team: [none — teamwork routes from the description]

Conduct a comprehensive, read-only full-spectrum audit of the entire TypeNova application codebase (`c:\Users\risho\OneDrive\Desktop\typenova-v2 - Copy`). Identify functional bugs, edge-case failures, architectural bottlenecks, state management issues, performance flaws, UI/UX polish gaps, and recommended new features. Deliver a comprehensive in-depth markdown report (`AUDIT_REPORT.md`) without modifying any existing application code.

Working directory: c:\Users\risho\OneDrive\Desktop\typenova-v2 - Copy
Integrity mode: development

## Requirements

### R1. Full-Spectrum Flaw & Edge-Case Identification
Deeply inspect all subsystems: core typing engine (input handling, WPM/raw calculation, pause/resume, cursor tracking), multiplayer & lobby synchronization (Supabase Realtime channels, connection dropouts, race conditions), authentication & user sessions, audio synthesis/effects, and theme/styling subsystems. Catalog all bugs, unhandled exceptions, and logic inconsistencies.

### R2. Architecture, State Management & Code Quality Review
Evaluate codebase architecture, state isolation, Zustand/React store coupling, TypeScript type safety, async/await error handling, asset loading efficiency, and re-rendering hotspots. Detail all anti-patterns and performance optimizations.

### R3. UI/UX, Accessibility & Responsiveness Assessment
Audit keyboard accessibility, ARIA compliance, screen reader support, layout stability on various screen sizes, visual contrast, animation frame drops, and cyber-aesthetic visual consistency.

### R4. Innovation & Feature Gap Analysis
Compare TypeNova's existing capabilities against modern top-tier typing platforms and propose prioritized, creative new feature recommendations (e.g., custom lesson builders, advanced telemetry/heatmaps, adaptive drill AI, clan/guild leagues, competitive ranked seasons) with estimated impact and feasibility.

### R5. Read-Only Constraint & Structured Report Generation
Do not modify or delete any existing source files. Synthesize all findings into `AUDIT_REPORT.md` at the project root, structured with an Executive Summary, Severity Matrix (Critical, High, Medium, Low), Detailed Findings (with file paths, root cause, and suggested fix), and a Prioritized Implementation Roadmap.

## Acceptance Criteria

### Audit Depth & Accuracy
- [ ] Findings cover all major modules: Typing Engine, Multiplayer & Supabase Realtime, State Management, UI/UX & Themes, Audio, and TypeScript/Build health.
- [ ] Every identified issue includes precise file references, root cause breakdown, severity level, and specific remediation advice.

### Feature & Improvement Recommendations
- [ ] Includes prioritized, actionable feature suggestions categorized by short-term wins and long-term differentiators.
- [ ] Includes performance and architecture recommendations for scaling.

### Deliverable & Safety
- [ ] Final report is written to `AUDIT_REPORT.md` in clean GitHub-flavored markdown.
- [ ] Zero source code files in the repository are modified or deleted.

---
*Next: when approved → delegate via invoke_subagent (see Delegation Protocol)*
