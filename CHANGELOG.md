# Changelog

All notable changes to this project will be documented in this file.

## [3.1.1] - 2026-09-25

### Changed
- **Canonical URL Synchronization**: Replaced disconnected domain references with live production origin (`https://typenova-live.vercel.app`) across `index.html`, `robots.txt`, `sitemap.xml`, and dynamic route sync in `App.tsx` to resolve Googlebot de-indexing loops.
- **Dynamic Canonical & Social Open Graph Resolution**: Dynamic origin inference in `App.tsx` adapts canonical URLs, Twitter cards, and OpenGraph tags to any deployed host automatically.

### Fixed
- **Strict TypeScript Compliance**: Eliminated unused component declarations in `AnimatedBanners`, `CosmeticArt`, and `ProfileCustomizationMenu` for zero compiler warnings.
- **Search Engine Indexing Schemas**: Updated `sitemap.xml` and `robots.txt` with fresh timestamps and direct sitemap pointers for search indexers.

## [3.1.0] - 2026-09-24

### Added
- **Synthetic Client Health Diagnostics Engine**: High-speed (<20ms) proactive client diagnostic suite checking 5 mission-critical subsystems — Storage Quota & Read/Write Parity, Web Audio API context sample rate & autoplay suspension state, Multiplayer WebSocket relay network latency, Supabase Cloud auth session token freshness, and Zero-Knowledge BYOK inference provider endpoints.
- **Universal Health Signal Bus & Incident Stream**: Global reactive event bus (`emitHealthSignal`, `subscribeHealthSignals`) capturing client-side anomalies (race disconnections, join timeouts, auth token expirations, AI provider rate limits, audio autoplay restrictions) with thread isolation.
- **System Status & Live Telemetry Console**: Pinned infrastructure console in footer with dynamic theme glow, real-time subsystem status matrix with ping roundtrip latencies, interactive diagnostic re-probe trigger, and 1-click recovery actions.
- **Zero-Knowledge Bring-Your-Own-Key (BYOK) AI Architecture**: 100% direct browser-to-provider HTTPS inference (Groq, OpenAI, Anthropic, Google Gemini, DeepSeek, OpenRouter) ensuring API keys never touch backend servers. Includes dual persistence toggle and 1-click key purge.
- **Guest First-Win Conversion Experience**: Frictionless 30-second speed test hero CTA, post-test benchmark conversion banner (WPM, Accuracy, Grade), and seamless pending score ingestion upon Google OAuth return.
- **Edge Health Endpoints & Staged Security Headers**: `/api/health` and `/health` JSON endpoints with uptime SLAs; hardened HTTP headers (`X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: SAMEORIGIN`, Content Security Policy).

### Fixed
- **Adversarial Hardening Rebuild**: Resolved 9 edge cases and vulnerabilities — eliminated storage probe quota clutter via `finally` blocks, unbounded fetch hangs via 3000ms `AbortController` timeouts, AudioContext hardware exhaustion via lifecycle guards, error isolation in signal listeners, API key regex token redaction (`sk-`, `gsk_`, `AIza`), and full retry budget resets on manual reconnects.

### Performance
- **Signal Bus Deduplication & Zero-Jank Telemetry**: Debounces identical consecutive client warning signals within 1000ms to eliminate event storms, UI re-render thrashing, and console noise during network blips.
- **Dynamic Theme Color Binding & Minimalist Controls**: Bound all diagnostics indicators, telemetry badges, and recovery buttons strictly to dynamic theme glow tokens (`rgb(${theme.glowPrimary})`) with Monkeytype-inspired single-row density.

## [3.0.0] - 2026-09-11

### Added
- **WebHID Esports Hardware Benchmark**: Direct raw USB HID polling rate tester via WebHID API (`WebHidBenchmarkModal`, `webHidEngine`), measuring genuine 1000Hz / 8000Hz keyboard reporting intervals, packet jitter deltas, switch debounce bounce spikes, and hardware grading.
- **High-End Patron Vault & Community Supporter Ecosystem**: Dedicated full-page `/donate` and `/patron` portal replacing fragmented popup modals with a luxury editorial aesthetic, champagne gold (`#d4af37`) accents, real-time SVG circular progress ring tracking the $2,000 community target, 4-tier milestone progression rail, live impact telemetry (tests hosted, servers paid, tuition covered), dynamic UPI QR code generator for INR amounts, multi-network EVM/Solana crypto support, and interactive Patron Wall with the exclusive Cyber Patron title badge.
- **CosmicNavBar Supporter Integration**: Pinned champagne gold support pill with subtle heart-pulse animation in the primary navigation bar for instant direct access to the Patron Vault.
- **Tactical Cyber Sabotage Engine**: Real-time multiplayer sabotage dock (`CyberSabotageDock`, `sabotageEngine`) allowing typists in custom VS lobbies to deploy EMP scramblers, keystroke latency fuzzing, auditory distraction pulses, and HUD visual distortions.
- **Lexical Word Weakness & Leitner Spaced Repetition**: Dedicated weakness diagnostic engine (`WordWeaknessPanel`, `wordWeakness`) tracking word hesitation delays, error frequency, and backspace correction rates with 5-box Leitner scheduling and 1-click procedural drill generation.
- **Operator Dossier & Hall of Legends**: Comprehensive dossier rebuild featuring 20 prestige achievements, Catmull-Rom SVG trend sparklines, real-time IKI (Inter-Keystroke Interval) jitter inspector, dynamic form tracking, and Ghost Shadow replays.
- **Keyboard Ergonomics & Biomechanics**: Hand alternation analysis, hand load distribution balance (left vs right hand ratio), finger travel distance, and home-row anchor stability grading.
- **Audio Dictation Engine & Mechanical Switch Audio**: Spoken audio dictation mode with speech pacing alongside procedural mechanical switch acoustics.
- **Multiplayer Lobby Solo Practice**: Hosts can launch solo practice sessions directly with matching lobby parameters while waiting for challengers to join custom rooms.

### Changed
- **Unified Donation Experience**: Consolidated donation flows into a single-column full-page experience at `/donate`, retiring the redundant multi-tab `DonateModal` popup.
- **Friction-Free Authentication**: Streamlined Google Sign-In and Play as Guest flows with automated consent handling and visual progress indicators.

### Removed
- **DonateModal Popup**: Removed legacy 4-tab modal and all associated wiring across modal managers and navigation bars.

### Fixed
- **27-Bug Zero-Defect Stability Rebuild**: Comprehensive remediation resolving 27 critical business logic, multiplayer sync, and UI integrity bugs across four audit phases.
- **Synchronous Input Reference Handling (LOGIC-01)**: Implemented synchronous mutable `inputRef` to prevent keystroke drops or stale state overwrites under rapid typing.
- **Accuracy & Net WPM Math (LOGIC-02)**: Re-anchored calculation directly to keystroke log to eliminate invalid accuracy (>100%) and Net WPM corruption when backspacing.
- **Heatmap Epoch Timestamp Overflow (LOGIC-03)**: Initialized delay baselines to first non-backspace keystroke time instead of 0.
- **Host Migration During Racing (LOGIC-05)**: Enabled seamless host reassignment during active races without lobby freezing.
- **Supabase Realtime Channel Cleanup (PERF-01, LOGIC-07)**: Added explicit timeout tracking and channel leave guards on manual reset.
- **Multiplayer Heatmap State Race (LOGIC-04)**: Calculated and passed heatmap payloads synchronously during finish broadcasts.
- **GlidingBar Caret Boundary Indexing (UI-05)**: Clamped character index to target bounds to prevent caret disappearing on final character.
- **Academy Reading Scrim Seams**: Pinned the gradient reading scrim to the viewport in `App.tsx`, preventing background gradient seams from scrolling or clipping.

### Performance
- **React AuthProvider Singleton**: Centralized auth state within a React Context Provider to prevent duplicate Supabase auth listeners and memory churn across components.
- **Zero Layout Thrashing (PERF-08)**: Replaced `getBoundingClientRect` within `requestAnimationFrame` with `offsetParent` DOM tree traversal.
- **Top-Level Render Cascade Elimination (PERF-03)**: Replaced inline snapshot object allocations with stable in-place mutable references.
- **Syntax Highlighter Regex Hoisting (PERF-06)**: Hoisted pattern matchers outside render loops to eliminate garbage collection pauses.

## [2.9.0] - 2026-09-03

### Added
- Live Identity Capsule & Banner Sync with real-time Loadout Forge & Supabase mirroring.
- Unified Aru AI Coaching Core with BYOK cloud providers and 4 dedicated coaching personas.
- Interactive Neuro-Debrief & Action Directives on results screen.
- Wide Leaderboard Sidebar with expanded breathing room.

## [2.8.0] - 2026-08-30

### Added
- Ghost Net: race anyone on the board with pace curve recording and playback.
- Per-Mode Leaderboards partitioned by exact match configuration.
- Ghost Racer 3.0 rival ghost selection.
- Tactical Compete entry rebuild and in-app room invites.

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
