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
