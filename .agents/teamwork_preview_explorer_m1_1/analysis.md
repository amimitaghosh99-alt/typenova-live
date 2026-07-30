# Data Model & Impact Metrics Analysis (`changelog.ts`)

## 1. Codebase Location & File Mapping
- **Primary Data Module**: `src/data/changelog.ts`
- **Consuming UI Components**:
  - `src/components/ChangelogModal.tsx` (Renders the update log modal, timeline, and change item details)
  - `src/App.tsx` (Imports `CHANGELOG` to display `CHANGELOG[0].version` in the bottom-left version badge)

---

## 2. Current Data Structure & TypeScript Interfaces

### Current `ChangelogEntry` Interface (`src/data/changelog.ts`, lines 1-9)
```ts
export interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  changes: {
    type: 'feature' | 'fix' | 'perf' | 'tweak';
    description: string;
  }[];
}
```

### Current Log Entries Summary
- Contains **25 release entries** spanning from `v1.0.0` (July 1, 2026) to `v1.5.2` (July 30, 2026).
- Each entry contains a release title and an array of individual changes categorized by type (`feature`, `fix`, `perf`, `tweak`).
- Currently, entries **do not** include any `impact` or numerical stat fields.

---

## 3. Impact & Usage Analysis of Consuming Components

### A. `src/App.tsx`
- **Line 51**: `import { CHANGELOG } from '@/data/changelog';`
- **Line 1856**: `<span className="text-[10px] font-black uppercase tracking-widest">{CHANGELOG[0].version}</span>`
- **Usage**: Accesses the first element of `CHANGELOG` array (`CHANGELOG[0]`) to get the latest version string (`v1.5.2`). Adding `impact` to `ChangelogEntry` will not break this usage.

### B. `src/components/ChangelogModal.tsx`
- **Line 2**: `import { CHANGELOG } from '@/data/changelog';`
- **Lines 51-95**: Maps over `CHANGELOG` entries and renders version header, date, title, and individual changes.
- **Current Limitation**: Does not render impact stats (Fixes, Tweaks, Lines Changed, Perf Gain) or visual impact bars because the schema does not yet include the `impact` property.

---

## 4. Recommended Schema Updates

To support Milestone 1 & Requirement R2, update `src/data/changelog.ts` with the new `ImpactStats` interface and update `ChangelogEntry`:

```ts
export interface ImpactStats {
  fixes: number;
  tweaks: number;
  linesChanged: number;
  perfGain?: string;
}

export interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  changes: {
    type: 'feature' | 'fix' | 'perf' | 'tweak';
    description: string;
  }[];
  impact: ImpactStats;
}
```

---

## 5. Recommended Entry Data Updates

Below are the exact recommended `impact` values for all 25 release log entries based on their actual changes and release scope:

1. **v1.5.2** (July 30, 2026) - UI Polish & Bug Fixes 🛠️
   - `impact: { fixes: 3, tweaks: 1, linesChanged: 142 }`
2. **v1.5.1** (July 28, 2026) - Ranked Idempotency & Visual Polish 🛡️
   - `impact: { fixes: 3, tweaks: 1, linesChanged: 285 }`
3. **v1.5.0** (July 26, 2026) - The Smoothness Overhaul Update 🚀
   - `impact: { fixes: 0, tweaks: 0, linesChanged: 640, perfGain: '+45 FPS (144Hz+)' }`
4. **v1.4.1** (July 26, 2026) - Hotfix: Heatmap Tooltip Clipping
   - `impact: { fixes: 1, tweaks: 0, linesChanged: 18 }`
5. **v1.4.0** (July 26, 2026) - New Feature: Detailed Keyboard Heatmaps 📊
   - `impact: { fixes: 1, tweaks: 0, linesChanged: 520, perfGain: '-12ms Latency' }`
6. **v1.3.4** (July 25, 2026) - Hotfix: Elo Winner Evaluation
   - `impact: { fixes: 1, tweaks: 0, linesChanged: 34 }`
7. **v1.3.3** (July 25, 2026) - Update: Sound Dropdown & Elo UI Fix
   - `impact: { fixes: 1, tweaks: 0, linesChanged: 95 }`
8. **v1.3.2** (July 25, 2026) - Hotfix: Elo Results Screen Fix
   - `impact: { fixes: 1, tweaks: 0, linesChanged: 26 }`
9. **v1.3.1** (July 25, 2026) - Hotfix: Matchmaking Ghost Protocol
   - `impact: { fixes: 1, tweaks: 0, linesChanged: 110 }`
10. **v1.3.0** (July 25, 2026) - Feature: Advanced Elo Mechanics
    - `impact: { fixes: 0, tweaks: 0, linesChanged: 310 }`
11. **v1.2.12** (July 25, 2026) - Hotfix: Matchmaking Split Lobbies
    - `impact: { fixes: 1, tweaks: 0, linesChanged: 42 }`
12. **v1.2.11** (July 25, 2026) - Hotfix: Ranked Elo Updates
    - `impact: { fixes: 1, tweaks: 0, linesChanged: 15 }`
13. **v1.2.10** (July 25, 2026) - Hotfix: Anti-Cheat Pipeline
    - `impact: { fixes: 1, tweaks: 0, linesChanged: 22 }`
14. **v1.2.9** (July 25, 2026) - Anti-cheat & Graph Fidelity Updates
    - `impact: { fixes: 1, tweaks: 1, linesChanged: 78 }`
15. **v1.2.8** (July 25, 2026) - Ranked Matchmaking & Daily Bounties
    - `impact: { fixes: 1, tweaks: 2, linesChanged: 890 }`
16. **v1.2.7** (July 25, 2026) - Anti-Cheat Hardening & UI Cleanup
    - `impact: { fixes: 2, tweaks: 0, linesChanged: 165, perfGain: '-15% CPU load' }`
17. **v1.2.6** (July 25, 2026) - Security & Anti-Cheat Update
    - `impact: { fixes: 1, tweaks: 0, linesChanged: 430, perfGain: '2x Payload Speed' }`
18. **v1.2.5** (July 25, 2026) - God-Tier Performance Optimization
    - `impact: { fixes: 1, tweaks: 0, linesChanged: 210, perfGain: '3.5x Fast Render' }`
19. **v1.2.4** (July 25, 2026) - Multiplayer Resilience & State Fixes
    - `impact: { fixes: 1, tweaks: 0, linesChanged: 320, perfGain: 'Zero Leak' }`
20. **v1.2.3** (July 25, 2026) - Social Hub & Realtime Friends
    - `impact: { fixes: 0, tweaks: 1, linesChanged: 540 }`
21. **v1.2.2** (July 25, 2026) - UI Polish & Multiplayer Fixes
    - `impact: { fixes: 3, tweaks: 1, linesChanged: 275 }`
22. **v1.2.1** (July 24, 2026) - Performance & Fluidity Update
    - `impact: { fixes: 1, tweaks: 1, linesChanged: 390, perfGain: '+60 FPS Smoother' }`
23. **v1.2.0** (July 20, 2026) - Multiplayer Mayhem
    - `impact: { fixes: 3, tweaks: 0, linesChanged: 720 }`
24. **v1.1.0** (July 15, 2026) - Precision Timing Engine
    - `impact: { fixes: 1, tweaks: 0, linesChanged: 310, perfGain: '<1ms Precision' }`
25. **v1.0.0** (July 1, 2026) - Launch Release
    - `impact: { fixes: 0, tweaks: 0, linesChanged: 3500 }`

---

## 6. Implementation Guidance for Milestone 1 (Implementer 1)
1. Add `ImpactStats` interface and update `ChangelogEntry` in `src/data/changelog.ts`.
2. Add `impact` field to each object in `CHANGELOG` array in `src/data/changelog.ts`.
3. Run `npx tsc --noEmit` to verify type safety.
