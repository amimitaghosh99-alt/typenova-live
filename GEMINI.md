# TypeNova Workspace Rules

## UI Verification Means Visual Browser Verification

When the user asks to "verify", "check", or "test" a UI screen or feature:
- Always use the browser subagent to **visually verify** the actual rendered app in a real browser.
- Start the dev server if it is not already running.
- Navigate to the relevant screen and interact with the app to reach the target state.
- Take screenshots of the actual rendered UI and include them in the report.
- Do NOT treat "verify a screen" as a source code review or static analysis. Code review alone is not verification.
- If the target state requires specific conditions (e.g., completing a multiplayer match), explain what steps were taken or what limitations prevented full interaction, and still show the closest reachable state visually.

## Dynamic Theme Color Binding

When working on TypeNova UI components:
- **NEVER** hardcode accent colors like `text-cyan-400`, `text-amber-400`, `text-rose-400` etc. for theme-sensitive elements (icons, active states, glows, borders).
- **ALWAYS** use dynamic theme binding: `style={{ color: \`rgb(\${theme.glowPrimary})\` }}` or `rgba(\${theme.glowPrimary}, 0.2)` for opacity variants.
- The `theme.glowPrimary` is an RGB triplet string (e.g., `'245, 158, 11'`) — always wrap it in `rgb()` or `rgba()`.
- The user runs Auto-Fetch mode, which dynamically extracts accent colors from wallpapers. Any hardcoded color will look wrong and disconnected.
- Exception: Semantic colors that are intentionally fixed (e.g., red for errors/sudden-death, green for success) are fine to hardcode.

## UI Cleanup: Minimalist Control Bars

When building or modifying configuration/control bars in TypeNova:
- **Avoid verbose text labels** above control groups (e.g., "DIFFICULTY", "WORDS"). The segmented controls and icons are self-explanatory.
- **Prefer single-row horizontal flex layouts** (`flex flex-wrap justify-center items-center`) over multi-column stacked layouts.
- **Use small dot dividers** (`w-1.5 h-1.5 rounded-full bg-white/10`) to visually separate control groups instead of headings or large gaps.
- **Keep gaps tight** (`gap-3`) — the design language is dense and premium, not spacious.
- Design inspiration is Monkeytype: clean, minimal, everything in one compact line.

## Mandatory Anti-Regression & Side-Effect Verification

Whenever making edits, additions, or refactors:
- **Call-Site & Dependency Audit**: Before and after modifying shared utilities, hooks (`useTypingEngine`, `useRace`, `useRPGSystem`, `useSmartDrills`), or components, trace all consuming files and call sites to ensure signatures, return types, and lifecycle expectations remain intact.
- **Run Automated Test Runner**: Always execute `npx tsx src/tests/run_e2e.ts` to confirm 100% pass rate across scoring, grading, boundary cases, and diagnostic engines.
- **Build Verification**: Run `npm run build` (`tsc -b && vite build`) to guarantee zero TypeScript type errors or bundling regressions.
- **Visual & Behavioral Preservations**: Check that existing UI components, dynamic theme bindings (`rgb(${theme.glowPrimary})`), responsive layouts, and modal workflows are never visually or functionally degraded.
