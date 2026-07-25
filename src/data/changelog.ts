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
