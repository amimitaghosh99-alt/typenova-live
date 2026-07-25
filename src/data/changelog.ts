export interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  changes: {
    type: 'feature' | 'fix' | 'perf' | 'tweak';
    description: string;
  }[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: 'v1.3.3',
    date: 'July 25, 2026',
    title: 'Update: Sound Dropdown & Elo UI Fix',
    changes: [
      { type: 'feature', description: 'Replaced the sound cycle button with a proper dropdown menu to easily select keyboard sound profiles.' },
      { type: 'fix', description: 'Fixed a CSS layout bug where the Elo transfer animation was being completely clipped out of view by a scroll container.' },
    ],
  },
  {
    version: 'v1.3.2',
    date: 'July 25, 2026',
    title: 'Hotfix: Elo Results Screen Fix',
    changes: [
      { type: 'fix', description: 'Fixed a race condition where the client would fail to render the Elo Transfer UI if the server experienced latency in reflecting the player\'s final race completion state.' },
    ],
  },
  {
    version: 'v1.3.1',
    date: 'July 25, 2026',
    title: 'Hotfix: Matchmaking Ghost Protocol',
    changes: [
      { type: 'fix', description: 'Rewrote the P2P Matchmaking protocol to use Active Ping Intervals. You can no longer match with ghost instances in the queue, completely eliminating the split-lobby bug!' },
    ],
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
  },
  {
    version: 'v1.2.12',
    date: 'July 25, 2026',
    title: 'Hotfix: Matchmaking Split Lobbies',
    changes: [
      { type: 'fix', description: 'Matchmaking: Fixed a race condition where multiple presence syncs caused the host to generate and join a second lobby while the guest joined the first lobby, resulting in both players being automatically kicked.' },
    ],
  },
  {
    version: 'v1.2.11',
    date: 'July 25, 2026',
    title: 'Hotfix: Ranked Elo Updates',
    changes: [
      { type: 'fix', description: 'Matchmaking: Fixed a silent database error where the temporary connection ID was being used instead of the actual user ID during ranked match resolutions, preventing Elo updates from saving.' },
    ],
  },
  {
    version: 'v1.2.10',
    date: 'July 25, 2026',
    title: 'Hotfix: Anti-Cheat Pipeline',
    changes: [
      { type: 'fix', description: 'Anti-Cheat: Fixed an issue where the JSON keystroke parser bug fix wasn\'t applying to the correct database RPC (`submit_score`), causing false positives to persist.' },
    ],
  },
  {
    version: 'v1.2.9',
    date: 'July 25, 2026',
    title: 'Anti-cheat & Graph Fidelity Updates',
    changes: [
      { type: 'fix', description: 'Anti-Cheat: Fixed a bug where missing properties in keystroke logs would falsely trigger the backend anti-cheat system.' },
      { type: 'tweak', description: 'Results Graph: Increased the fidelity of the post-game WPM graph to 1-second intervals and ensured it draws smoothly from the start of the race.' },
    ],
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
  },
  {
    version: 'v1.2.5',
    date: 'July 25, 2026',
    title: 'God-Tier Performance Optimization',
    changes: [
      { type: 'perf', description: 'Rewrote the typing engine’s internal timeline calculator into a single-pass O(N) algorithm.' },
      { type: 'fix', description: 'Eliminated severe CPU spikes and Garbage Collection thrashing that occurred every 500ms during long typing tests.' },
    ],
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
  },
];
