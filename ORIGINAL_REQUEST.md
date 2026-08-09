# Original User Request

## Initial Request — 2026-07-30T08:15:09Z

Fix all layout, clipping, and visual bugs in the current `ChangelogModal` implementation so that it perfectly matches the original reference design.

Working directory: c:\Users\risho\OneDrive\Desktop\typenova-v2 - Copy
Integrity mode: demo

## Requirements

### R1. Layout & Clipping Fixes
Fix the overflow and clipping issues. The top header (Search bar, Subscribe button, and title) is currently missing or clipped off the top of the screen. Ensure the modal fits within the viewport correctly without cutting off critical UI elements.

### R2. Timeline Polish
Fix the visual alignment and sizing of the left "Releases Timeline". Ensure the timeline points perfectly align with the text, the scrollbar (if needed) does not overlap the border, and the layout doesn't look detached or squashed.

### R3. Visual Refinement
Refine the impact metrics bar and individual changelog cards to match the polished glassmorphic aesthetic of the reference design. Remove flat colors and fix the border/padding inconsistencies.

## Acceptance Criteria

### Verification & Bug Checks
- [ ] An automated DOM analysis script mathematically verifies that the modal header elements (Search input, Subscribe button, Close button) are successfully rendered within the visible viewport bounds (Y-coordinate > 0) and are not clipped.
- [ ] An automated script verifies that the overall modal container height does not exceed the window height (e.g., `100vh`), ensuring no content is pushed off-screen.
- [ ] Verification confirms that the right-side scrollbar does not overlap or clip into the outer glass border of the modal.
- [ ] Verification confirms that the impact metrics bar uses the correct styling/colors rather than the flat unstyled boxes shown in the bug report.

## Follow-up — 2026-07-30T08:59:25Z

Completely overhaul the `ChangelogModal` component to make it compact, GPU-smooth, and visually consistent with the rest of the TypeNova design system — eliminating all lag, bloat, and aesthetic mismatches.

Working directory: c:\Users\risho\OneDrive\Desktop\typenova-v2 - Copy
Integrity mode: development

## App Design System Context

The rest of the app uses the following design tokens — the redesigned modal MUST use these exclusively:

- **Font**: `JetBrains Mono` (imported in `index.css`) for all text. No other fonts.
- **Glass Card**: Use the `.glass-panel` CSS class for the main modal container. Do NOT use inline `bg-slate-950/60 backdrop-blur-2xl` etc. — the `.glass-panel` class handles all of this via `index.css`.
- **Animations**: Use the existing `lucid-scale` and `lucid-fade-up` CSS animation classes from `index.css` for entrance animations. Do not invent new ones.
- **Easing**: All transitions must use `var(--ease-apple)` or `var(--ease-out-expo)` CSS variables from `index.css`.
- **Colours**: Dark background (`#0a0a0f` base), cyan/teal as the primary accent (`text-cyan-400`, `border-cyan-500/30`), zinc greys for secondary text.

## Requirements

### R1. Performance — Zero Nested Backdrop Blurs
Strip ALL `backdrop-blur-*` classes from every element inside the modal container. The `.glass-panel` class on the outer container provides the only blur needed. Zero nested blur layers are acceptable.

### R2. Compact Layout
The modal must be noticeably more compact. Reduce padding, font sizes, and spacing throughout. The full changelog list should be visible without excessive scrolling. The left timeline sidebar should be narrower. Change cards should be dense, not card-per-item.

### R3. Aesthetic Consistency
Replace all Tailwind ad-hoc colours and font styling with tokens that match the rest of the app: JetBrains Mono font, cyan accent colours, and `.glass-panel` glass styling for all cards. Remove all `font-black` `uppercase tracking-widest` header styles that don't match the app's style. The modal should feel like it was built as part of TypeNova, not bolted on.

### R4. Smooth Entrance
The modal must use the app's existing `lucid-scale` entrance animation class. No custom `animate-in fade-in` Tailwind plugin classes.

## Acceptance Criteria

### Performance & Code
- [ ] `npx tsc --noEmit` passes with 0 errors after changes.
- [ ] A code audit confirms there are ZERO `backdrop-blur-*` Tailwind classes remaining anywhere inside the modal's rendered JSX tree (excluding the outer container `.glass-panel` itself).
- [ ] `npm run build` completes with 0 errors.

### Visual & Aesthetic
- [ ] An automated CSS audit confirms that the modal uses `font-family: 'JetBrains Mono'` — no other font families.
- [ ] An automated check confirms the `glass-panel` class is present on the outer modal container.
- [ ] An automated check confirms the `lucid-scale` animation class is used on the modal.

## Additional Requirement — 2026-07-30T03:32:48Z

Additional requirement from the user: **Remove the search bar entirely** from the ChangelogModal. Delete the search input, the `searchQuery` state, and all filtering logic. The changelog should simply display all entries in order with no search functionality.

## Follow-up — 2026-08-06T06:24:25Z

Fix the remaining 6 Low-Severity bugs identified in the `full_codebase_scan.md` report, focusing on memory leaks (untracked timeouts), missing dependencies, and React performance issues (inline callbacks).

Working directory: c:\Users\risho\OneDrive\Desktop\typenova-v2 - Copy
Integrity mode: development

## Requirements

### R1. Fix Timeout Memory Leaks
Track and clear all identified unmounted component timeouts:
- 4 instances in `useFriends.ts` (BUG-19)
- `setShake` timeout in `TypingController.tsx` (BUG-20)
- Exit animation timeouts in `RaceModal.tsx`, `SocialModal.tsx`, and `PlayerProfileModal.tsx` (BUG-21)

### R2. Fix React Rendering & Dependency Issues
- Memoize the inline callbacks passed to `StatsDashboard` and `ChangelogModal` in `App.tsx` (BUG-23)
- Properly include `typing.input`, `auth.session`, and `supabase` in the auto-save dependency arrays in `App.tsx`, resolving the eslint suppression (BUG-24)
- Add `typing` to the dependency array of the rematch effect in `App.tsx` (BUG-25)

## Acceptance Criteria

### Leak Prevention
- [ ] No `setTimeout` calls exist in the specified files without a corresponding `clearTimeout` on component unmount.

### React Performance & Correctness
- [ ] `StatsDashboard` and `ChangelogModal` receive stable function references via `useCallback`.
- [ ] The auto-save effects in `App.tsx` no longer use `eslint-disable-next-line react-hooks/exhaustive-deps`.
- [ ] The `tsc --noEmit` build passes with 0 errors.

## Follow-up — 2026-08-08T16:42:53Z

Rebuild the TypeNova Academy hand guidance overlay component (`CyberHands.tsx`) into a high-quality, realistic SVG vector hand visualization with organic curves, smooth Framer Motion animations, accurate key alignment, and neon glowing active states.

Working directory: c:\Users\risho\OneDrive\Desktop\typenova-v2 - Copy
Integrity mode: development

## Requirements

### R1. Realistic Organic Hand Silhouette
Render realistic SVG hand vectors with smooth curved fingers, natural palm contours, and glassmorphic radial gradients, replacing straight lines or boxy geometric shapes.

### R2. Smooth Animation & Neon Lighting
Integrate Framer Motion or SVG animation transitions so active fingers dynamically glow, pulse, and animate when active keys are pressed during lessons.

### R3. Precise Key & Finger Alignment
Align left hand fingers (Pinky, Ring, Middle, Index, Thumb) and right hand fingers accurately with home row keys (A, S, D, F, Space, J, K, L, ;) and spacebar without clipping or layer blocking.

## Acceptance Criteria

### Visual Quality & Anatomy
- [ ] Hands display natural curved hand silhouettes with realistic organic finger shapes rather than straight lines or boxy polygons.
- [ ] Left hand glows in neon emerald/green and right hand glows in cyan/blue with smooth radial gradient palm hulls.

### Interactivity & Alignment
- [ ] When a lesson step prompts a key press, the corresponding finger lights up with an active neon glow and animated ripple directly over the target keycap.
- [ ] Non-active fingers remain subtly visible as supportive guides without obscuring the virtual keyboard layout.

## Follow-up — 2026-08-09T16:05:10+05:30

# Teamwork Project Prompt — TypeNova Academy Expansion

Expand TypeNova Academy with advanced tailored lessons (Numbers, Symbols, Code/Dev Syntax, Speed N-Grams, Real Words) and new interactive learning features (Category Filters, Real-time WPM/Accuracy engine, Audio Haptics, Lesson Star Ratings & Analytics).

Working directory: c:\Users\risho\OneDrive\Desktop\typenova-v2 - Copy
Integrity mode: development

## Requirements

### R1. Comprehensive Tailored Lessons Expansion
Extend `src/data/academyCurriculum.ts` with new categorized lesson modules:
- **Numbers & Top Row**: Digits 0-9 with dedicated finger assignments.
- **Punctuation & Shift Key**: Capital letters, commas, periods, quotes, and question marks.
- **Developer Special**: Coding brackets `{ } [ ] ( )`, operators `= + - * /`, and symbols `< > ; :`.
- **Rhythm & Bigrams**: High-frequency English letter pairs (`th`, `he`, `in`, `er`, `an`, `re`, `nd`, `at`).
- **Word Flow Drills**: Full word practice sequences with finger guidance.

### R2. Category Navigation & Lesson Selection UI
Update `AcademyLayout.tsx` to group lessons into distinct visual categories ("Foundations", "Numbers & Punctuation", "Developer Code", "Speed & Rhythm") with tabbed filtering or accordion sections for easy navigation.

### R3. Real-Time Performance & Gamification Engine
Enhance `useAcademyEngine.ts` and `AcademyLayout.tsx` to include:
- **Live Lesson Stats**: Real-time WPM, Accuracy %, and current error-free Streak counter.
- **Lesson Mastery Rating**: 1-3 Star rating earned upon lesson completion based on accuracy.
- **Audio Feedback**: Subtle, crisp keypress audio toggle for correct key hits and error buzzes.

### R4. Keyboard & CyberHands Symbol Support
Ensure `KEY_MAP` and `FINGER_MAP` in `VirtualKeyboard.tsx` and `CyberHands.tsx` fully support all new numbers, symbols, shift key modifiers, and punctuation marks so the 3D Holographic Hands accurately highlight and reach every target key.

## Acceptance Criteria

### Curriculum & Coverage
- [ ] At least 8 new specialized lessons are added across 4 distinct categories in `academyCurriculum.ts`.
- [ ] All new keys (numbers, punctuation, symbols) have mapped finger hints in `KEY_MAP` and `FINGER_MAP`.

### UI & Features
- [ ] Academy sidebar features category filters/tabs for browsing lessons by difficulty and topic.
- [ ] Real-time WPM, Accuracy %, and Streak HUD are visible during active lesson playback.
- [ ] Upon finishing a lesson, a completion modal displays final score, accuracy, stars earned, and next lesson prompt.
- [ ] Audio feedback toggle is functional during lesson execution.
- [ ] The app compiles cleanly (`npm run build` / `npx tsc --noEmit`) with no TypeScript or lint errors.
