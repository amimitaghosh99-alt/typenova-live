# Changelog

All notable changes to this project will be documented in this file.

## [2.7.0] - 2026-08-27

### Added
- **Dedicated Operator Dossier**: Full-route `/operator/:username` and `/operator` profile deck with sticky identity rail, level rings, title equip system, and smooth panel transitions.
- **Per-Key Error & Speed Heatmap**: 27-key interactive keyboard telemetry view with hesitation/typo tracking and procedural & AI drill generation.
- **Catmull-Rom History Sparklines**: 1:1 SVG trend graphs with accurate stroke draw-on physics, peak drop indicators, and glow highlights.
- **Tactical Compete Arena Overhaul**: Widescreen room browser, quick match system, live lobby chat & telemetry stream, and persistent post-race retention.
- **Cosmetic Forge & Banner Upgrades**: Complete banner/avatar progression system with live theme-reactive particle and shader sync.
- **Unified App Chrome (`useAppChrome`)**: Consolidated layout offsets and pinned `CosmicNavBar`.

### Changed
- Converted profile modal to dedicated full-page dossier.
- Upgraded theme token system for dynamic accent color derivation.

### Fixed
- Fixed SVG sparkline non-scaling geometry bug across variable card widths.
- Fixed JSX comment syntax in HistorySparkline.

## [2.6.0] - 2026-08-25

### Added
- Full Academy Curriculum: 64 lessons across 10 progressive tracks with 3-star grading.
- Live Passage Rail with per-character state.
- Card-to-Stage Handoff animations.

## [2.1.0] - 2026-08-10

### Added
- **Dual-Agent Architecture**: TypeNova now supports distinct AI personas running on different API endpoints.
  - **Aru (Personal Assistant)** is now exclusively powered by the user's BYOK (Bring Your Own Key) setup.
  - **Dumb Technician (Settings Guide)** is a new AI persona living directly in the Settings tab, powered natively by the TypeNova Cloud (Supabase Edge Function).
- **Dumb Technician UI**: A brand new dedicated chat interface added directly inside the AI Settings tab to guide new users through getting their API keys and understanding game modifiers like Ghost Pacer, Sudden Death, and Fog of War.
- **Supabase Edge Function (`ai-proxy`)**: A secure, server-side proxy handling cross-origin requests and protecting the global Groq API key, authenticated via Supabase JWTs.

### Changed
- The `aiClient.ts` library now supports `mode: 'byok' | 'global'` to route traffic between the local user key and the Supabase Cloud proxy.
- Removed the global toggle switch from the AI Settings; the TypeNova Cloud proxy is now strictly reserved for powering the built-in system guides.

## [2.0.1] - 2026-08-10

### Added
- Academy curriculum and progression system
- Profile Customization Menu with Avatars and Banners
- Error Boundary component for better error handling
- New `useAcademyEngine` hook for academy mechanics
- Supabase migration for avatars and banners support
- Enhanced RPG system features

### Changed
- Extensive UI refactoring, migrating away from some older UI components
- Improved Stats Dashboard and Player Profile Modal
- Updated results screen and WPM graph components
- General code structure and dependency optimizations

### Removed
- Deprecated VSLobby, KeyboardHeatmap, and ChallengeNotification components
- Removed unused UI library components to simplify the codebase
