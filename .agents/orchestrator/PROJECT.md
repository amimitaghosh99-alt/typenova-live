# Project: TypeNova Update Log UI Overhaul & Dynamic Metrics

## Mission
Redesign the existing `ChangelogModal` UI to match a premium glassmorphism aesthetic with an interactive left timeline navigation sidebar and dynamic metric fetching from backend/GitHub API.

## Architecture & Requirements
- **R1: Glassmorphism UI Overhaul**
  - Left sidebar + right-side scrollable content area in `ChangelogModal`.
  - Frosted glass cards (`backdrop-filter` / `backdrop-blur`, inner shadows, neon glow accents).
  - Horizontal stat metric pills row for each version update block.
- **R2: Interactive Timeline Navigation**
  - Left-aligned vertical timeline sidebar with interactive version nodes.
  - Clicking any version node smoothly scrolls the right-side main container to the matching version block using `scrollIntoView` or ref-based smooth scrolling.
- **R3: Dynamic Metrics Fetching**
  - Fetch real statistical metrics (Fixes, Tweaks, Lines Changed, Perf Gain) dynamically from backend or GitHub API.
  - Render dynamically fetched metric data points into the stat pills.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Exploration & Technical Design | Analyze `ChangelogModal` component, CSS/styling setup, API integration path, and scroll anchors | None | IN_PROGRESS |
| M2 | Glassmorphism UI & Timeline Nav (R1, R2) | Implement left sidebar timeline, smooth scroll to version block, glassmorphism styling, stat pills UI | M1 | PLANNED |
| M3 | Dynamic Metrics API Fetching (R3) | Implement dynamic API fetching for update log metrics, connect state to stat pills | M1, M2 | PLANNED |
| M4 | Verification & Forensic Audit | Type-check (`npx tsc --noEmit`), build (`npm run build`), verify tests, challenger verification, forensic audit | M2, M3 | PLANNED |

## Interface Contracts
- `ChangelogModal`: Accepts props (e.g. `isOpen`, `onClose`), renders timeline sidebar and update list.
- Dynamic Metrics Fetcher: API function/hook returning version metric stats (e.g. `{ version, fixes, tweaks, linesChanged, perfGain, ... }`).

## Acceptance Criteria
- Modal features distinct left timeline sidebar and right scrollable container.
- Horizontal row of stat metric pills per version block.
- Heavy use of glassmorphism theme tokens (`backdrop-blur`, inner shadows, glow accents).
- Clicking left sidebar version node smoothly scrolls right panel to corresponding version block.
- Codebase makes external network/API call (or backend API fetch) for metrics rather than relying solely on static hardcoded data.
- UI renders fetched data in stat pills.
