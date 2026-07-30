# Handoff Report: Requirement R2 (Timeline & Scrollbar Polish)

## 1. Observation
- **Target File**: `src/components/ChangelogModal.tsx`
- **Global CSS File**: `src/index.css`
- **Timeline Sidebar Structure (Lines 312–360)**:
  - Line 320: `<div className="absolute top-3 bottom-3 left-4 w-0.5 bg-gradient-to-b from-purple-500/50 via-zinc-800 to-zinc-900" />`
  - Line 328: `<button className="group relative w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-all ...">`
  - Line 331: `<div className="relative z-10 w-2.5 h-2.5 rounded-full transition-all shrink-0 ... " />`
  - Line 335: `<span className="text-xs font-mono font-bold truncate ...">{entry.version}</span>`
  - Line 344: `<p className="text-[10px] text-zinc-500 truncate font-sans">{entry.date}</p>`
- **Main Content & Outer Modal Structure (Lines 207, 310, 363)**:
  - Line 207: `<div className="glass-panel relative w-full max-w-5xl max-h-[90vh] flex flex-col rounded-[2.5rem] bg-zinc-950/90 border border-white/10 shadow-2xl shadow-purple-950/40 overflow-hidden lucid-scale">`
  - Line 310: `<div className="relative z-10 flex-1 flex overflow-hidden">`
  - Line 363: `<div className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-8 custom-scrollbar">`
- **Global Scrollbar CSS (`src/index.css` lines 257–260)**:
  - `::-webkit-scrollbar { width: 6px; }`
  - `::-webkit-scrollbar-track { background: transparent; }`
  - `::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }`

## 2. Logic Chain
1. **Vertical Node Dot Misalignment**:
   - Line 328 uses `flex items-center gap-3` on the sidebar button.
   - The button contains 2 lines of text (version header + date description) totaling ~47px height.
   - `items-center` places the vertical center of the node dot at ~23.5px from the top of the button.
   - The version text line `v1.5.3` starts at y = 8px and has a center at y = 16px.
   - Therefore, the node dot is vertically offset downwards by ~7.5px relative to the version text string.
2. **Horizontal Rail Line Offset**:
   - Line 320 positions the rail line at `left-4` (16px) with width `w-0.5` (2px), giving a rail center at 17.0px.
   - Button padding `px-3` (12px) + 1px border + dot width `w-2.5` (10px) places the dot center at 18.0px.
   - This creates a 1.0px horizontal misalignment between the dot center and the rail line center.
3. **Scrollbar Glass Border Overlap**:
   - The outer container has `rounded-[2.5rem]` (40px border radius).
   - Line 363 positions `<div className="flex-1 overflow-y-auto ...">` flush against the right boundary of the outer modal box.
   - Native WebKit vertical scrollbars render at `right: 0`.
   - Content padding (`p-5 sm:p-8`) does not constrain the scrollbar track.
   - At the top-right and bottom-right corners, the 40px rounded glass border curves inward while the scrollbar track runs straight, causing the scrollbar thumb/track to clip into the 40px glass border stroke and specular highlights.

## 3. Caveats
- Browser-specific scrollbar appearance may vary slightly across Gecko (Firefox) vs WebKit/Blink (Chrome/Safari/Edge). Applying `margin-top`/`margin-bottom` on `::-webkit-scrollbar-track` and container inset padding guarantees cross-browser isolation.

## 4. Conclusion
- **Timeline Alignment Fix**:
  1. Change line 328 in `ChangelogModal.tsx` from `items-center` to `items-start`, add `mt-1` to the node dot.
  2. Change line 320 in `ChangelogModal.tsx` to `left-[18px] -translate-x-1/2` and `top-4 bottom-4`.
- **Scrollbar Border Overlap Fix**:
  1. Update line 363 in `ChangelogModal.tsx` to include `pr-3 sm:pr-6` (or `mr-1.5`).
  2. Enhance `.custom-scrollbar` in `src/index.css` with `::-webkit-scrollbar-track { margin-top: 12px; margin-bottom: 12px; }`.

## 5. Verification Method
- **File Inspection**: Inspect `src/components/ChangelogModal.tsx` and `src/index.css` against the proposed line edits in `analysis.md`.
- **Build/Test Verification**:
  - Run `npm run build` or `npx tsc --noEmit` to verify type safety and layout integrity.
  - Open `ChangelogModal` in browser to visually confirm dot-to-text alignment and scrollbar containment inside the 40px glass border.
