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

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: 'v2.7.0',
    date: 'August 27, 2026',
    title: 'Operator Dossier, Tactical Multiplayer Arena & Cosmetic Forge Overhaul 🪪⚡',
    changes: [
      { type: 'feature', description: 'Dedicated Operator Dossier Page: Replaced popup modal with full-route /operator/:username dossier featuring a sticky identity rail, dynamic banner sync, and seamless tab transitions.' },
      { type: 'feature', description: 'Interactive Key Heatmap & Smart Drills: 27-key per-key accuracy and hesitation delay heatmaps with one-click procedural and AI drill generation.' },
      { type: 'feature', description: 'Catmull-Rom History Sparklines: Hand-rolled 1:1 SVG trend curves with smooth stroke draw-on animations, peak reference drops, and live metric toggles.' },
      { type: 'feature', description: 'Tactical Compete & Ranked Arena: Redesigned lobby browser, quick match queue, live telemetry chat stream, and seamless post-race lobby retention.' },
      { type: 'feature', description: 'Cosmetic Forge & Banner Systems: Fully integrated banner and avatar progression with unlock milestone bursts and theme-reactive particle fields.' },
      { type: 'tweak', description: 'Unified App Chrome & Stage System: Consolidated stage layout offsets with useAppChrome and permanently pinned CosmicNavBar across all viewport sizes.' },
      { type: 'perf', description: 'Zero-Lag Glass & 144Hz Transitions: Replaced heavy multi-pass Gaussian backdrop blurs with GPU matrix transforms and solid obsidian contrast surfaces.' },
      { type: 'fix', description: 'Sparkline Non-Scaling Stroke Geometry: Resolved SVG viewBox stretch bug where line draw-on animations halted partway across wide display cards.' }
    ],
    impact: {
      fixes: 5,
      tweaks: 8,
      linesChanged: 7750,
      perfGain: 'Locked 144 FPS & Zero-Scale SVG Precision'
    }
  },
  {
    version: 'v2.6.0',
    date: 'August 25, 2026',
    title: 'Neural Academy Rebuild — 64 Lessons, Themed Surfaces & Sharp Wallpapers 🎓',
    changes: [
      { type: 'feature', description: 'Full Academy Curriculum: 64 lessons across 10 progressive tracks, three-star grading per lesson, boss checks that gate the next track, and a 50-level mastery ladder with titles.' },
      { type: 'feature', description: 'Live Passage Rail: Multi-word lessons now scroll a real passage with per-character state instead of one key at a time, so drills read like typing rather than flashcards.' },
      { type: 'feature', description: 'Card-to-Stage Handoff: Launching a lesson hands the card its own geometry into the practice stage as a shared element — no cross-fade, no jump cut.' },
      { type: 'feature', description: 'Shift & Finger Coaching: Opposite-hand Shift correction, per-finger colour identity across the virtual keyboard and CyberHands, plus a live per-key error heatmap.' },
      { type: 'tweak', description: 'Single Theme Token Module: Every Academy surface, hairline, chip and scrim now derives from the active theme accent — including wallpaper-derived themes — instead of a fixed grey palette.' },
      { type: 'tweak', description: 'One Toast Anchor: Coaching, level-ups and unlock notices used to fire at three different screen corners; they now share a bottom-right stack and push each other.' },
      { type: 'tweak', description: 'Springy Telemetry: WPM, accuracy, XP and star counts count up and rubber-band on change, with full reduced-motion fallbacks throughout.' },
      { type: 'perf', description: 'Zero Backdrop Filters in the Academy: Opaque themed panels and one static scrim layer replaced the stacked Gaussian backdrop-blurs, so nothing re-blurs during layout springs.' },
      { type: 'fix', description: 'Sharp Wallpapers in the Academy: The Academy no longer clamps the wallpaper to its own brightness and 8px blur — it stays sharp at the brightness you picked.' },
      { type: 'fix', description: 'Graded Reading Scrim: The scrim covers the full viewport and grades from the top edge down, fixing the bright wedge and hard seam that showed in the top-left and top-right corners.' },
      { type: 'fix', description: 'Small-Text Contrast: Micro-labels, star counts and progress rails were sitting on translucent surfaces over a light wallpaper; they now land on the near-black they were designed against.' }
    ],
    impact: {
      fixes: 4,
      tweaks: 7,
      linesChanged: 5900,
      perfGain: 'Zero Per-Frame Backdrop-Filter Passes in the Academy'
    }
  },
  {
    version: 'v2.5.1',
    date: 'August 24, 2026',
    title: 'Master-Detail Changelog, Zero-Lag WebGL Pausing & Push Alerts ⚡',
    changes: [
      { type: 'feature', description: 'Master-Detail Changelog: Complete dual-pane overhaul with smooth vertical spring rail navigation and dedicated active release stage.' },
      { type: 'feature', description: 'Native Desktop Push & Email Alerts: Functional subscription system with browser notification permission and persistent email patch dispatch.' },
      { type: 'perf', description: 'Modal-Aware WebGL Shader Pausing: Automatically pauses background fragment rendering when modals open, dropping GPU load to 0%.' },
      { type: 'perf', description: 'Zero-Lag 100% Solid Obsidian Layouts: Replaced heavy multi-pass Gaussian backdrop-blurs with crisp, opaque surfaces, guaranteeing locked 144 FPS.' },
      { type: 'tweak', description: 'High-Contrast Theme Auto-Fetch: Dynamic theme accent synchronization with high-contrast pure white typography and cohesive semantic tags.' }
    ],
    impact: {
      fixes: 6,
      tweaks: 8,
      linesChanged: 850,
      perfGain: 'Locked 144 FPS & 0% Background GPU Consumption'
    }
  },
  {
    version: 'v2.5.0',
    date: 'August 24, 2026',
    title: 'Multiplayer Cockpit, Zero-Lag 4K Engine & Liquid Stage Flow 💎🚀',
    changes: [
      { type: 'feature', description: 'Zero-Scroll Multiplayer Cockpit: Widescreen split tactical layout with a dedicated Neural Comms chat hub, live telemetry stream, and 4-column racer podiums.' },
      { type: 'feature', description: 'Seamless Room Flow & Post-Match Retention: Return directly to the lobby room after matches without room recreation or losing party members.' },
      { type: 'feature', description: 'Animated Code Sub-Options: Fluid Framer Motion height expansion revealing 8 code language options upon selecting Code mode.' },
      { type: 'perf', description: 'Hardware 4K Wallpaper Compression: Automatic WebP downscaling (~300KB) with dedicated GPU layer isolation, completely eliminating wallpaper stutter.' },
      { type: 'perf', description: 'Uncapped 144Hz+ Stage Transitions: Replaced heavy CSS blur filters with GPU matrix transforms and spring physics for buttery stage switching.' },
      { type: 'fix', description: 'Segmented Control Alignment: Fixed flex wrapping, auto-calculated full-width item distribution, and perfected card padding boundaries.' },
      { type: 'fix', description: 'Race Transition Lock: Fixed modal stage decoupling so live races transition directly to typing tracks and race results.' }
    ],
    impact: {
      fixes: 5,
      tweaks: 6,
      linesChanged: 1450,
      perfGain: 'Uncapped 144Hz+ Framerates & 0.1ms Switch Latency'
    }
  },
  {
    version: 'v2.4.0',
    date: 'August 14, 2026',
    title: '3D Kinetic Landing & Open Source Evolution 🚀',
    changes: [
      { type: 'feature', description: '3D Kinetic Keyboard Hero: Real-time Three.js interactive wave-animated 3D keyboard tiles with glowing cyber neon lighting.' },
      { type: 'feature', description: 'Cosmic Nebula Background: Custom WebGL fragment shader with procedural space dust, zero blowout, and seamless dark obsidian palette.' },
      { type: 'feature', description: 'Official MIT License & Open Source: Full open-source repository integration with dynamic GitHub Star pills.' },
      { type: 'tweak', description: 'Ultra-Premium UI Buttons: Redesigned Google Sign-In with luminous gradient borders and frosted obsidian glass Guest mode.' },
      { type: 'perf', description: 'Optimized WebGL Lifecycles: Eliminated React StrictMode context loss, memory leaks, and redundant rendering passes.' }
    ],
    impact: {
      fixes: 4,
      tweaks: 8,
      linesChanged: 950,
      perfGain: 'Smooth 120 FPS WebGL rendering'
    }
  },
  {
    version: 'v2.2.0',
    date: 'August 13, 2026',
    title: 'The Triple Threat Engine & Working Models ⭐',
    changes: [
      { type: 'feature', description: 'Gemini Nano Integration: Aru now natively hooks into Chrome\'s local Prompt API, allowing offline, zero-latency inference without an API key.' },
      { type: 'feature', description: 'Working Models Tracker: Automatically remembers your successful models from custom endpoints and pins them to the top of dropdowns with a ⭐.' },
      { type: 'tweak', description: 'API Key Redesign: Overhauled the Settings Modal and added a Compact Config Bar to Aru to manage custom endpoints seamlessly.' },
      { type: 'tweak', description: 'Procedural fallback engine updated to tap into local AI before hardcoded algorithms.' }
    ],
    impact: {
      fixes: 0,
      tweaks: 5,
      linesChanged: 1200,
      perfGain: 'Zero latency local inference'
    }
  },
  {
    version: 'v2.1.0',
    date: 'August 10, 2026',
    title: 'Dual-Agent Architecture & The Technician 🤖',
    changes: [
      { type: 'feature', description: 'Dual-Agent Architecture: Aru now runs exclusively on BYOK, while the new Dumb Technician uses the TypeNova Cloud.' },
      { type: 'feature', description: 'Dumb Technician UI: Added a dedicated support chat in the AI Settings to guide users.' },
      { type: 'perf', description: 'Supabase Edge Function proxy securely handles global Groq AI requests.' },
      { type: 'tweak', description: 'Refactored aiClient.ts to support dynamic mode routing (byok vs global).' }
    ],
    impact: {
      fixes: 0,
      tweaks: 10,
      linesChanged: 850,
      perfGain: 'Secured global API keys via proxy'
    }
  },
  {
    version: 'v2.0.1',
    date: 'August 10, 2026',
    title: 'Academy & Massive UI Overhaul 🎓',
    changes: [
      { type: 'feature', description: 'Academy curriculum and progression system, including CyberHands and VirtualKeyboard.' },
      { type: 'feature', description: 'Profile Customization Menu with Avatars and Banners.' },
      { type: 'feature', description: 'New `useAcademyEngine` hook for academy mechanics.' },
      { type: 'tweak', description: 'Extensive UI refactoring and removal of deprecated components like VSLobby.' },
      { type: 'tweak', description: 'Improved Stats Dashboard, Player Profile Modal, and Results screen.' }
    ],
    impact: {
      fixes: 2,
      tweaks: 15,
      linesChanged: 8500,
      perfGain: 'Cleaner bundle & faster rendering'
    }
  },
  {
    version: 'v1.6.5',
    date: 'August 6, 2026',
    title: 'Post-Match Chat Updates & Agents 🤖',
    changes: [
      { type: 'feature', description: 'AI Teams: Integrated new background agent teamwork workflows.' },
      { type: 'fix', description: 'Post-Match Chat: Added missing identity props to fix multiplayer chat routing.' }
    ],
    impact: { fixes: 1, tweaks: 1, linesChanged: 3500, perfGain: 'Agent stability' },
  },
  {
    version: 'v1.6.4',
    date: 'August 4, 2026',
    title: 'Video Calling & Global Settings 📹⚙️',
    changes: [
      { type: 'feature', description: 'Video Calling: Added WebRTC-based video call overlays so you can see your friends while racing.' },
      { type: 'feature', description: 'Settings Modal: Centralized settings management with a new dedicated modal and contexts.' },
      { type: 'fix', description: 'Daily Scores: Fixed an issue with database casting for daily score entries.' }
    ],
    impact: { fixes: 1, tweaks: 2, linesChanged: 500, perfGain: 'New features added' },
  },
  {
    version: 'v1.6.3',
    date: 'August 3, 2026',
    title: 'Direct Messages & UI Fixes 💬',
    changes: [
      { type: 'feature', description: 'Direct Messages: Added the foundation for real-time direct messaging with a new Comms modal.' },
      { type: 'fix', description: 'UI Tweaks: Fixed undefined property references and duplicate class warnings in the core typing engine UI.' }
    ],
    impact: { fixes: 2, tweaks: 1, linesChanged: 300, perfGain: 'Cleaner DOM' },
  },
  {
    version: 'v1.6.2',
    date: 'August 2, 2026',
    title: 'The Great Bug Sweep & Stability Update 🛡️',
    changes: [
      { type: 'fix', description: 'Critical Fixes: Patched 7 critical bugs including unmatched array crashes, chat null pointer exceptions, and network blip aborts that caused complete application failure.' },
      { type: 'fix', description: 'Multiplayer Stability: Resolved memory leaks from stale chat subscriptions, channel collisions, and recursive infinite re-render loops during Ranked matchmaking.' },
      { type: 'fix', description: 'Rematch Protocol: Refactored the rematch handler to guarantee that all ghost state is wiped clean. Players no longer see stale avatars or broken progress bars after restarting a race.' },
      { type: 'fix', description: 'Cloud Data Integrity: Prevented older, stale data fetches from overwriting fresh local RPG stats, and fixed database constraint errors that occurred during profile creation.' },
      { type: 'tweak', description: 'UI Polish: Fixed missing null-coalescing fallbacks for player stats, hid the word count selector for Code mode, and improved the touch targets for Social Hub action buttons.' },
    ],
    impact: { fixes: 27, tweaks: 5, linesChanged: 485, perfGain: 'Zero Crashes' },
  },
  {
    version: 'v1.6.1',
    date: 'August 2, 2026',
    title: 'Post-Match Chat & Custom Friend Challenges 💬⚔️',
    changes: [
      { type: 'feature', description: 'Post-Match Chat: Added a zero-DB real-time broadcast chat panel to the VS Mode Results screen with auto-scrolling, player graph color matching, and quick-chat preset pills (gg, Rematch?, So close!, My keyboard lagged!).' },
      { type: 'feature', description: 'Selectable Challenge Modes: Configure difficulty (Novice, Adept, Master, Quotes, Code), word count (10, 25, 50, 100), and programming language before sending direct friend challenges.' },
      { type: 'tweak', description: 'Dynamic Island Challenge HUD: Repositioned incoming challenge notifications to top-center with 95% opacity, backdrop blur, and high contrast buttons for 100% readability.' },
      { type: 'tweak', description: 'Race Modal Glassmorphism: Overhauled Race Room modal UI to match the liquid glass design system and JetBrains Mono typography.' },
    ],
    impact: { fixes: 0, tweaks: 2, linesChanged: 620, perfGain: 'Zero-DB Realtime' },
  },
  {
    version: 'v1.6.0',
    date: 'August 2, 2026',
    title: 'The Feature Trilogy & Direct Challenges ⚔️',
    changes: [
      { type: 'feature', description: 'Direct Friend Challenges: Challenge online friends directly to a live race from the Social Hub! Friends receive a real-time banner notification with Accept/Decline and a 30s countdown.' },
      { type: 'feature', description: 'Prestige Badges & Skill Titles: Unlockable title badges (Speed Demon, Warp Speed, Precision Master, etc.) based on performance milestones, equipped on your profile card and shown in the top bar.' },
      { type: 'feature', description: 'Weak Key Heatmap & Dynamic Drill Generator: Interactive QWERTY keyboard diagnostic in Stats Dashboard with a single-click "Drill Weak Keys" button that generates custom practice drills focused on your problem letters.' },
      { type: 'feature', description: 'Daily Quests & Streak Multipliers: Daily quest panel with XP rewards, live progress tracking, and a top-bar flame streak counter with XP multipliers.' },
      { type: 'tweak', description: 'Social Hub Profile Tab: View your skill statistics, level progress, and active badge title directly inside the Social Modal.' },
    ],
    impact: { fixes: 0, tweaks: 1, linesChanged: 1086 },
  },
  {
    version: 'v1.5.4',
    date: 'July 30, 2026',
    title: 'The 144Hz Butter Smooth Update 🧈',
    changes: [
      { type: 'perf', description: 'Hardware Acceleration: Aggressively optimized UI animations by removing heavy nested glass-panel blurs during keyframe transitions, allowing for flawless 144Hz rendering.' },
      { type: 'perf', description: 'Scroll Lag Eliminated: Removed nested background blurs from scrolling release cards and enabled GPU hardware acceleration for buttery smooth scrolling.' },
      { type: 'fix', description: 'Sidebar Scroll-Spy Jitter: Completely fixed sidebar jitter by attaching the scroll container as the observer root and implementing a manual scroll lock mechanism.' },
      { type: 'fix', description: 'Jittery Modals: Fixed jittery modal entrance animations and added a beautiful staggered card entrance effect.' },
    ],
    impact: { fixes: 2, tweaks: 0, linesChanged: 230, perfGain: '144Hz Locked' },
  },
  {
    version: 'v1.5.3',
    date: 'July 30, 2026',
    title: 'Changelog Redesign & Search 🔍',
    changes: [
      { type: 'feature', description: 'Completely redesigned the Update Log modal with a beautiful glassmorphic timeline layout.' },
      { type: 'feature', description: 'Added a functional search bar to the Update Log to instantly filter through past releases.' },
      { type: 'feature', description: 'Added Impact Metrics (Fixes, Tweaks, Lines Changed) with visual data bars for each update.' },
      { type: 'tweak', description: 'Further decluttered the home screen by completely hiding the idle Stats HUD.' },
    ],
    impact: { fixes: 0, tweaks: 1, linesChanged: 485, perfGain: 'Cleaner UI' },
  },
  {
    version: 'v1.5.2',
    date: 'July 30, 2026',
    title: 'UI Polish & Bug Fixes 🛠️',
    changes: [
      { type: 'fix', description: 'Applied numerous bug fixes to improve overall stability and performance.' },
      { type: 'fix', description: 'Fixed a visual issue where modals would flash on the screen when changing difficulty or settings.' },
      { type: 'fix', description: 'Re-enabled text blur (fog mode) for Code Mode during the configuring phase to prevent reading ahead.' },
      { type: 'tweak', description: 'Hid the stats panel on the home screen to provide a cleaner, decluttered UI.' },
    ],
    impact: { fixes: 3, tweaks: 1, linesChanged: 142 },
  },
  {
    version: 'v1.5.1',
    date: 'July 28, 2026',
    title: 'Ranked Idempotency & Visual Polish 🛡️',
    changes: [
      { type: 'fix', description: 'Database Idempotency: Patched a major edge-case in Ranked Duels where both clients resolving the match simultaneously would result in double Elo transfers. The backend now strictly enforces single-resolution using a unique Match Key.' },
      { type: 'fix', description: 'Chromium Z-Index Glitches: Aggressively fixed a notoriously annoying optical illusion and rendering bug where the typing leaderboard text would falsely bleed through dropdown menus.' },
      { type: 'tweak', description: 'Fluid Animations: The Typing Area animation is now much cleaner. Instead of the entire frosted glass box vanishing when changing settings, only the text crossfades while the glass box gracefully resizes.' },
      { type: 'fix', description: 'Safety Checks: Reinstated the "Profile Not Found" Elo transfer safeguard so matches against non-existent or invalid profiles safely abort.' },
    ],
    impact: { fixes: 3, tweaks: 1, linesChanged: 285 },
  },
  {
    version: 'v1.5.0',
    date: 'July 26, 2026',
    title: 'The Smoothness Overhaul Update 🚀',
    changes: [
      { type: 'feature', description: 'Replaced the static caret with a buttery-smooth, hardware-accelerated gliding caret that physically tracks across the letters, just like Monkeytype.' },
      { type: 'feature', description: 'Added premium Apple-style sliding pill segmented controls for mode selection, replacing static option buttons.' },
      { type: 'feature', description: 'Implemented a 300ms smooth blur and scale crossfade transition when changing modes or refreshing text.' },
      { type: 'feature', description: 'Completely overhauled layout shifts. Expanding boxes (like the Custom Text box or Code Language selector) now smoothly glide in and out using CSS Grid width transitions, eliminating any abrupt layout snapping.' },
      { type: 'feature', description: 'Replaced the dotted background pattern in the typing area with a stunning, eye-pleasing volumetric glass glow effect featuring ambient floating orbs and 3D glass edge highlights.' },
      { type: 'perf', description: 'Aggressively optimized GPU rendering. Heavy background blur filters (glassmorphism) are now dynamically disabled the millisecond you start typing, resulting in a flawless 144Hz+ frame rate.' },
      { type: 'perf', description: 'Eliminated a bug where the virtual DOM was double-rendering the caret cursor.' },
    ],
    impact: { fixes: 0, tweaks: 0, linesChanged: 640, perfGain: '+45 FPS (144Hz+)' },
  },
  {
    version: 'v1.4.1',
    date: 'July 26, 2026',
    title: 'Hotfix: Heatmap Tooltip Clipping',
    changes: [
      { type: 'fix', description: 'Fixed an issue where the finger heatmap tooltips were getting clipped on the top row of the keyboard.' },
    ],
    impact: { fixes: 1, tweaks: 0, linesChanged: 18 },
  },
  {
    version: 'v1.4.0',
    date: 'July 26, 2026',
    title: 'New Feature: Detailed Keyboard Heatmaps 📊',
    changes: [
      { type: 'feature', description: 'Added a beautiful, dynamic Finger Heatmap to the Stats Dashboard!' },
      { type: 'feature', description: 'You can now toggle the heatmap between "Accuracy" mode (to see exactly which keys you make the most typos on, highlighted in glowing red) and "Speed" mode (to see which keys you are the slowest at pressing, highlighted in blue).' },
      { type: 'feature', description: 'Added hover tooltips to the heatmap keys showing exact error percentages, average keypress latency (ms), and total press counts.' },
      { type: 'fix', description: 'Resolved a critical race condition in the Matchmaking algorithm that occasionally routed players into split lobbies when 3 or more users queued simultaneously. A strict 3-way P2P handshake is now enforced.' },
      { type: 'perf', description: 'Upgraded the anti-cheat keystroke logger to globally persist your average latency per keystroke.' },
    ],
    impact: { fixes: 1, tweaks: 0, linesChanged: 520, perfGain: '-12ms Latency' },
  },
  {
    version: 'v1.3.4',
    date: 'July 25, 2026',
    title: 'Hotfix: Elo Winner Evaluation',
    changes: [
      { type: 'fix', description: 'Fixed a logic bug where the winner of a match could mistakenly be evaluated as the loser (and lose Elo) if they finished the race with a higher WPM but the match was Timed or their time was processed differently.' },
    ],
    impact: { fixes: 1, tweaks: 0, linesChanged: 34 },
  },
  {
    version: 'v1.3.3',
    date: 'July 25, 2026',
    title: 'Update: Sound Dropdown & Elo UI Fix',
    changes: [
      { type: 'feature', description: 'Replaced the sound cycle button with a proper dropdown menu to easily select keyboard sound profiles.' },
      { type: 'fix', description: 'Fixed a CSS layout bug where the Elo transfer animation was being completely clipped out of view by a scroll container.' },
    ],
    impact: { fixes: 1, tweaks: 0, linesChanged: 95 },
  },
  {
    version: 'v1.3.2',
    date: 'July 25, 2026',
    title: 'Hotfix: Elo Results Screen Fix',
    changes: [
      { type: 'fix', description: 'Fixed a race condition where the client would fail to render the Elo Transfer UI if the server experienced latency in reflecting the player\'s final race completion state.' },
    ],
    impact: { fixes: 1, tweaks: 0, linesChanged: 26 },
  },
  {
    version: 'v1.3.1',
    date: 'July 25, 2026',
    title: 'Hotfix: Matchmaking Ghost Protocol',
    changes: [
      { type: 'fix', description: 'Rewrote the P2P Matchmaking protocol to use Active Ping Intervals. You can no longer match with ghost instances in the queue, completely eliminating the split-lobby bug!' },
    ],
    impact: { fixes: 1, tweaks: 0, linesChanged: 110 },
  },
  {
    version: 'v1.3.0',
    date: 'July 25, 2026',
    title: 'Feature: Advanced Elo Mechanics',
    changes: [
      { type: 'feature', description: 'Dynamic K-Factor: Placement matches (first 10) now grant higher Elo gains/losses (K=64), while Grandmaster tier (>2000 Elo) matches become highly competitive (K=16).' },
      { type: 'feature', description: 'Margin of Victory: Players now gain a scaled bonus multiplier up to 1.5x based on their WPM lead over their opponent.' },
      { type: 'feature', description: 'Accuracy Bonus: Winners who maintain >98% accuracy now receive a flat +3 Elo bonus.' },
    ],
    impact: { fixes: 0, tweaks: 0, linesChanged: 310 },
  },
  {
    version: 'v1.2.12',
    date: 'July 25, 2026',
    title: 'Hotfix: Matchmaking Split Lobbies',
    changes: [
      { type: 'fix', description: 'Matchmaking: Fixed a race condition where multiple presence syncs caused the host to generate and join a second lobby while the guest joined the first lobby, resulting in both players being automatically kicked.' },
    ],
    impact: { fixes: 1, tweaks: 0, linesChanged: 42 },
  },
  {
    version: 'v1.2.11',
    date: 'July 25, 2026',
    title: 'Hotfix: Ranked Elo Updates',
    changes: [
      { type: 'fix', description: 'Matchmaking: Fixed a silent database error where the temporary connection ID was being used instead of the actual user ID during ranked match resolutions, preventing Elo updates from saving.' },
    ],
    impact: { fixes: 1, tweaks: 0, linesChanged: 15 },
  },
  {
    version: 'v1.2.10',
    date: 'July 25, 2026',
    title: 'Hotfix: Anti-Cheat Pipeline',
    changes: [
      { type: 'fix', description: 'Anti-Cheat: Fixed an issue where the JSON keystroke parser bug fix wasn\'t applying to the correct database RPC (`submit_score`), causing false positives to persist.' },
    ],
    impact: { fixes: 1, tweaks: 0, linesChanged: 22 },
  },
  {
    version: 'v1.2.9',
    date: 'July 25, 2026',
    title: 'Anti-cheat & Graph Fidelity Updates',
    changes: [
      { type: 'fix', description: 'Anti-Cheat: Fixed a bug where missing properties in keystroke logs would falsely trigger the backend anti-cheat system.' },
      { type: 'tweak', description: 'Results Graph: Increased the fidelity of the post-game WPM graph to 1-second intervals and ensured it draws smoothly from the start of the race.' },
    ],
    impact: { fixes: 1, tweaks: 1, linesChanged: 78 },
  },
  {
    version: 'v1.2.8',
    date: 'July 25, 2026',
    title: 'Ranked Matchmaking & Daily Bounties',
    changes: [
      { type: 'feature', description: 'Ranked 1v1 Mode: Queue up against opponents globally. Matchmaking uses Supabase presence channels to find the closest Elo match and automatically routes you into a private duel.' },
      { type: 'fix', description: 'Fixed a race condition in Ranked Matchmaking where the Host and Guest would occasionally be routed into separate lobbies.' },
      { type: 'feature', description: 'Elo Rating System: Gain or lose Elo dynamically based on match outcomes. Smooth animations highlight your gains in the post-game results screen.' },
      { type: 'tweak', description: 'Elo Visibility: Your current Elo rating is now prominently displayed in the Account Menu, and your friends\' Elo ratings are visible in the Social Modal.' },
      { type: 'feature', description: 'Daily Bounties: Earn extra XP by completing rotating daily quests (e.g., "Hit 120 WPM", "Type 1000 Words"). Track your progress with a glowing widget in the Stats Dashboard.' },
      { type: 'tweak', description: 'Fluid Animations: Integrated Apple-like smooth cubic-bezier transitions across the entire app for a buttery-smooth feel.' },
    ],
    impact: { fixes: 1, tweaks: 2, linesChanged: 890 },
  },
  {
    version: 'v1.2.7',
    date: 'July 25, 2026',
    title: 'Anti-Cheat Hardening & UI Cleanup',
    changes: [
      { type: 'fix', description: 'Patched an Anti-Cheat false-positive bug where players were falsely banned for receiving RPG time penalties.' },
      { type: 'fix', description: 'Neutralized a Time Spoofing exploit by upgrading the backend to extract elapsed time directly from the tamper-proof keystroke log.' },
      { type: 'perf', description: 'Removed heavy unused DOM calculation overhead attached to the legacy cursor tracker.' },
    ],
    impact: { fixes: 2, tweaks: 0, linesChanged: 165, perfGain: '-15% CPU load' },
  },
  {
    version: 'v1.2.6',
    date: 'July 25, 2026',
    title: 'Security & Anti-Cheat Update',
    changes: [
      { type: 'feature', description: 'Implemented a server-side Anti-Cheat engine in Supabase to mathematically verify all submitted WPM and Accuracy scores.' },
      { type: 'fix', description: 'Blocked a major API exploit where users could use DevTools to forge fake god-tier scores on the global leaderboard.' },
      { type: 'perf', description: 'Updated auto-save payload to stream raw keystroke logs directly to the secure Postgres backend for processing.' },
    ],
    impact: { fixes: 1, tweaks: 0, linesChanged: 430, perfGain: '2x Payload Speed' },
  },
  {
    version: 'v1.2.5',
    date: 'July 25, 2026',
    title: 'God-Tier Performance Optimization',
    changes: [
      { type: 'perf', description: 'Rewrote the typing engine’s internal timeline calculator into a single-pass O(N) algorithm.' },
      { type: 'fix', description: 'Eliminated severe CPU spikes and Garbage Collection thrashing that occurred every 500ms during long typing tests.' },
    ],
    impact: { fixes: 1, tweaks: 0, linesChanged: 210, perfGain: '3.5x Fast Render' },
  },
  {
    version: 'v1.2.4',
    date: 'July 25, 2026',
    title: 'Multiplayer Resilience & State Fixes',
    changes: [
      { type: 'feature', description: 'Added seamless Host Migration to multiplayer lobbies. If the host disconnects, the lobby automatically promotes a new host to prevent freezing.' },
      { type: 'fix', description: 'Patched a massive stale-closure ghost-state bug in the core keyboard listener by implementing a Latest Ref pattern.' },
      { type: 'perf', description: 'Squashed a trailing memory leak in the multiplayer engine by actively wiping disconnected ghost-data from memory.' },
    ],
    impact: { fixes: 1, tweaks: 0, linesChanged: 320, perfGain: 'Zero Leak' },
  },
  {
    version: 'v1.2.3',
    date: 'July 25, 2026',
    title: 'Social Hub & Realtime Friends',
    changes: [
      { type: 'feature', description: 'Completely redesigned the Social modal into a premium "Social Hub" featuring a dedicated Friends List, glowing online indicators, and auto-generated avatars.' },
      { type: 'feature', description: 'Added Supabase Realtime subscriptions to the friends list so that incoming requests and friend updates appear instantly without needing a page refresh.' },
      { type: 'tweak', description: 'Added smooth slide-in and fade animations when navigating between tabs in the Social Hub.' },
    ],
    impact: { fixes: 0, tweaks: 1, linesChanged: 540 },
  },
  {
    version: 'v1.2.2',
    date: 'July 25, 2026',
    title: 'UI Polish & Multiplayer Fixes',
    changes: [
      { type: 'tweak', description: 'Massively decluttered the top navigation bar by compressing settings and moving the version badge.' },
      { type: 'feature', description: 'Redesigned the post-race WPM graph in VS Mode to use smooth cubic curves and color-code lines by player rank.' },
      { type: 'fix', description: 'Fixed a rubberbanding glitch in race lobbies where the difficulty would snap back to previous settings when clicked rapidly.' },
      { type: 'fix', description: 'Fixed a visual bug where the 4th player slot in a 1v1v1v1 race would be cut off by a scrolling container.' },
      { type: 'fix', description: 'Cleaned up the multiplayer Race Configuration by locking options that are incompatible with certain modes (like Quotes).' },
    ],
    impact: { fixes: 3, tweaks: 1, linesChanged: 275 },
  },
  {
    version: 'v1.2.1',
    date: 'July 24, 2026',
    title: 'Performance & Fluidity Update',
    changes: [
      { type: 'perf', description: 'Eliminated synchronous layout thrashing in the caret (GlidingBar) to prevent input stutter.' },
      { type: 'perf', description: 'Memoized heavy UI components to stop background re-renders while typing.' },
      { type: 'perf', description: 'Optimized particle engine garbage collection to run lazily and in batches.' },
      { type: 'fix', description: 'Fixed a race condition in the 1v1v1v1 multiplayer lobby that caused players to be falsely kicked.' },
      { type: 'tweak', description: 'Updated multiplayer opponent carets to use distinct colors to prevent visual overlapping.' },
    ],
    impact: { fixes: 1, tweaks: 1, linesChanged: 390, perfGain: '+60 FPS Smoother' },
  },
  {
    version: 'v1.2.0',
    date: 'July 20, 2026',
    title: 'Multiplayer Mayhem',
    changes: [
      { type: 'feature', description: 'Added 1v1v1 and 1v1v1v1 multiplayer modes.' },
      { type: 'fix', description: 'Blocked the Backspace key in multiplayer races to enforce competitive integrity.' },
      { type: 'fix', description: 'Fixed a major input desync glitch where special keys like "Enter" or "Backspace" would append their full names as text, causing instant errors.' },
      { type: 'fix', description: 'Removed the ghost of your own progress overlapping with your opponent marker in live races.' },
    ],
    impact: { fixes: 3, tweaks: 0, linesChanged: 720 },
  },
  {
    version: 'v1.1.0',
    date: 'July 15, 2026',
    title: 'Precision Timing Engine',
    changes: [
      { type: 'perf', description: 'Switched the engine to use an explicit Start Time timestamp for extremely accurate WPM measurements.' },
      { type: 'fix', description: 'Fixed a bug where Timed Mode would end prematurely due to React state staleness.' },
      { type: 'feature', description: 'Added support for detailed stat tracking in the RPG progression system.' },
    ],
    impact: { fixes: 1, tweaks: 0, linesChanged: 310, perfGain: '<1ms Precision' },
  },
  {
    version: 'v1.0.0',
    date: 'July 1, 2026',
    title: 'Launch Release',
    changes: [
      { type: 'feature', description: 'Initial release of TypeNova with RPG leveling, particles, and themes.' },
      { type: 'feature', description: 'Added Code Mode, Focus Mode, and Blind Mode.' },
      { type: 'feature', description: 'Integrated Cloud Sync for saving your typing history and levels.' },
    ],
    impact: { fixes: 0, tweaks: 0, linesChanged: 3500 },
  },
];
