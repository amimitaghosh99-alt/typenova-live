# Requirement R3: Aesthetic Consistency Analysis & Handoff Report

## 1. Observation

### Source Code Files Examined
- `src/components/ChangelogModal.tsx` (458 lines)
- `src/index.css` (324 lines)
- `tailwind.config.js` (110 lines)
- `ORIGINAL_REQUEST.md` (71 lines)
- `.agents/orchestrator/PROJECT.md` (17 lines)

### Direct Observations & Verbatim Snippets

1. **Font Mismatches in `ChangelogModal.tsx`**:
   - **Line 358**: `className="text-[10px] text-zinc-500 truncate font-sans"` (Explicit `font-sans` override on timeline date text).
   - **Line 436**: `className="text-xs text-zinc-300 leading-relaxed font-sans"` (Explicit `font-sans` override on change item descriptions).
   - **Absence of `font-mono` on container**: The modal outer container (`line 213`) did not set `font-mono`, relying on browser defaults or inline overrides.

2. **Heavy / Mismatched Header Typography (`font-black uppercase tracking-widest`)**:
   - **Line 130**: `<span className="text-[10px] font-black uppercase tracking-widest text-zinc-300 flex items-center gap-1.5">` ("Release Impact & Activity Metrics")
   - **Line 239**: `<h2 className="text-2xl sm:text-3xl font-black uppercase tracking-widest text-white">Update Log</h2>`
   - **Line 242**: `<span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300">`
   - **Line 246**: `<p className="text-xs font-bold uppercase tracking-widest text-zinc-400">TypeNova Release History & Technical Notes</p>`
   - **Line 319**: `<div className="flex items-center gap-2 px-3 py-2 mb-3 text-[10px] font-black uppercase tracking-widest text-zinc-400 border-b border-white/5">` ("Releases Timeline")
   - **Line 400**: `<span className="text-2xl font-black uppercase tracking-wider font-mono ...">` (Version numbers)
   - **Line 409**: `<span className="text-[10px] font-black uppercase tracking-widest bg-gradient-to-r from-purple-500 to-indigo-500 ...">LATEST RELEASE</span>`
   - **Line 432**: `<span className="text-[9px] font-black uppercase tracking-wider ...">` (Badge types)

3. **Ad-Hoc Purple Accents & Non-TypeNova Color Tokens**:
   - **Line 213**: `shadow-purple-950/50` on main modal container.
   - **Line 233**: `style={{ borderColor: 'rgba(168,85,247,0.4)' }}` (Ad-hoc purple inline style border on header icon).
   - **Line 235**: `<Sparkles className="text-purple-400 animate-pulse" size={20} />`
   - **Line 242**: `bg-purple-500/20 border-purple-500/30 text-purple-300` (Version badge).
   - **Line 270**: `<Bell size={14} className="text-purple-400" />` (Subscribe icon).
   - **Line 294**: `focus:border-purple-400/50 focus:ring-2 focus:ring-purple-500/20 focus:shadow-[0_0_15px_rgba(168,85,247,0.25)]` (Search focus glow).
   - **Line 320**: `<Layers size={12} className="text-purple-400" />`
   - **Line 326**: `from-purple-500/50 via-zinc-800 to-zinc-900` (Timeline rail gradient).
   - **Line 336**: `bg-gradient-to-r from-purple-500/20 to-indigo-500/10 border-purple-400/40 text-white shadow-[0_0_15px_rgba(168,85,247,0.25)]` (Active timeline button).
   - **Line 343**: `bg-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.8)]` (Active timeline node dot).
   - **Line 349**: `text-purple-300` (Active version text).
   - **Line 353**: `bg-purple-500/20 text-purple-300 border-purple-500/30` (NEW badge).
   - **Line 381**: `bg-purple-500/20 border-purple-500/30 text-purple-300` (Clear search query button).
   - **Line 401**: `text-purple-400 drop-shadow-[0_0_10px_rgba(168,85,247,0.4)]` (Latest version title).
   - **Line 409**: `bg-gradient-to-r from-purple-500 to-indigo-500 shadow-purple-500/20` (Latest release badge).
   - **Line 158**: `bg-gradient-to-r from-purple-500/20 to-indigo-500/10 border-purple-500/30 text-purple-300` (Lines changed metric pill).

4. **Container & Sub-Card Glass Panel Usage vs. Inline Blur Classes**:
   - **Line 213**: Container has `.glass-panel` class, BUT also has inline `bg-slate-950/60 backdrop-blur-2xl border border-white/15 shadow-2xl shadow-purple-950/50`.
   - **Line 394**: Release cards have `glass-panel relative rounded-3xl bg-slate-900/40 border border-white/15 p-6 md:p-7 backdrop-blur-xl shadow-xl`.
   - **Line 209**: Modal overlay has `animate-in fade-in duration-300`.

5. **`src/index.css` Base Layer**:
   - Line 2 imports `'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700;800&display=swap'`.
   - Line 114 defines `.glass-panel` class with base glass gradient, border, specular rim, and progressive `@supports (backdrop-filter: blur(1px))` frosted glass blur.
   - `@layer base` (`lines 71-77`) sets `body { @apply bg-background text-foreground; }`, but lacks an explicit `font-family: 'JetBrains Mono', ui-monospace, monospace;` declaration on `body`.

---

## 2. Logic Chain

1. **Font Consistency Logic**:
   - *Premise*: Requirement R3 & App Context state: "Font: JetBrains Mono (imported in index.css) for all text. No other fonts."
   - *Observation*: `ChangelogModal.tsx` contains `font-sans` on lines 358 and 436, causing release dates and change item descriptions to render in sans-serif.
   - *Reasoning*: Removing all `font-sans` classes and setting `font-mono` at the modal container root (and setting `font-family: 'JetBrains Mono', ui-monospace, monospace;` in `index.css` `@layer base`) ensures 100% of the rendered text inherits `JetBrains Mono`.

2. **Header Styling Cleanup Logic**:
   - *Premise*: Requirement R3 states: "Remove all `font-black uppercase tracking-widest` header styles that don't match the app's style."
   - *Observation*: Lines 130, 239, 242, 246, 319, 400, 409, 432 use `font-black uppercase tracking-widest` or `tracking-wider`.
   - *Reasoning*: The TypeNova HUD aesthetic uses clean `font-mono` headers with standard font weights (`font-bold` or `font-semibold`) and tight/natural letter-spacing. Replacing heavy uppercase tracking-widest text with `text-xl sm:text-2xl font-bold font-mono text-white tracking-tight` for titles and `text-xs font-mono text-zinc-400` for subtitles seamlessly aligns the modal with TypeNova's design system.

3. **Color Token Alignment Logic**:
   - *Premise*: Requirement R3 & App Context state: "Colours: Dark background (`#0a0a0f` base), cyan/teal as the primary accent (`text-cyan-400`, `border-cyan-500/30`), zinc greys for secondary text."
   - *Observation*: `ChangelogModal.tsx` currently contains over 15 ad-hoc purple/indigo classes (`text-purple-400`, `bg-purple-500/20`, `border-purple-500/30`, `from-purple-500`, `shadow-purple-950/50`).
   - *Reasoning*: All primary accents, highlight badges, focus states, icons, timeline indicators, and glow effects must be updated to cyan tokens (`text-cyan-400`, `border-cyan-500/30`, `bg-cyan-500/10`, `bg-cyan-500/20`, `text-cyan-300`, `shadow-[0_0_12px_rgba(6,182,212,0.15)]`), with zinc greys for secondary text (`text-zinc-400`, `text-zinc-300`, `text-zinc-500`).

4. **Glass Panel & Blur Stripping Logic**:
   - *Premise*: Requirement R3 & R1 state: "Use the `.glass-panel` CSS class for the main modal container. Do NOT use inline `bg-slate-950/60 backdrop-blur-2xl` etc. — the `.glass-panel` class handles all of this via `index.css`. Strip ALL `backdrop-blur-*` classes inside."
   - *Observation*: Main container (line 213) combines `.glass-panel` with inline `bg-slate-950/60 backdrop-blur-2xl border border-white/15 shadow-2xl shadow-purple-950/50`. Cards (line 394) have `backdrop-blur-xl`.
   - *Reasoning*: Removing inline `bg-slate-950/60 backdrop-blur-2xl ...` from outer container lets `.glass-panel` handle background and frosted glass blur purely from `index.css`. Changing inner release cards to clean glass sub-cards (`bg-white/[0.02] border border-white/10 hover:border-cyan-500/30 rounded-2xl p-4`) eliminates all 6 nested `backdrop-blur-*` instances while maintaining a modern glassmorphic look.

5. **Entrance Animation Logic**:
   - *Premise*: Requirement R4 & R3 state: "The modal must use the app's existing `lucid-scale` entrance animation class. No custom `animate-in fade-in` Tailwind plugin classes."
   - *Observation*: Main container has `lucid-scale`, but overlay (line 209) has `animate-in fade-in duration-300`.
   - *Reasoning*: Removing `animate-in fade-in duration-300` leaves `lucid-scale` as the sole, smooth GPU entrance animation.

---

## 3. Caveats

- **No Caveats**: Analysis covers all required files (`ChangelogModal.tsx`, `src/index.css`), requirement specifications (R3, R1, R2, R4), and design tokens (fonts, headers, cyan accents, glass panel).

---

## 4. Conclusion

Requirement R3 (Aesthetic Consistency) requires two focused updates:
1. **`src/index.css`**: Add `font-family: 'JetBrains Mono', ui-monospace, monospace;` under `@layer base { body { ... } }` to ensure app-wide JetBrains Mono default fallback.
2. **`src/components/ChangelogModal.tsx`**: Complete overhaul to:
   - Apply `font-mono` throughout, removing all `font-sans` overrides (lines 358, 436).
   - Replace all mismatched `font-black uppercase tracking-widest` header styles with clean `font-mono font-bold/font-semibold` headers.
   - Replace all ad-hoc purple/indigo colors with TypeNova cyan accent tokens (`text-cyan-400`, `border-cyan-500/30`, `bg-cyan-500/10`, `text-cyan-300`) and zinc secondary text.
   - Use `.glass-panel` on the outer modal container without inline `backdrop-blur-2xl` or `bg-slate-950/60`, and clean sub-cards without inner backdrop-blur classes.
   - Maintain `lucid-scale` for entrance animation.

---

## 5. Verification Method

### Automated Commands to Verify Code Integrity & Build
```bash
# 1. Type check
npx tsc --noEmit

# 2. Build verification
npm run build
```

### Forensic Code Inspection Audit Rules
1. **Font Check**:
   - Confirm zero occurrences of `font-sans` inside `src/components/ChangelogModal.tsx`.
   - Confirm presence of `font-mono` on modal container and text elements.
2. **Backdrop Blur Check**:
   - Confirm zero occurrences of `backdrop-blur-` classes anywhere inside `ChangelogModal.tsx`.
3. **Glass Panel Check**:
   - Confirm `glass-panel` class is present on the main outer modal container `<div className="glass-panel relative ...">`.
4. **Header Style Check**:
   - Confirm zero occurrences of `font-black uppercase tracking-widest` inside `ChangelogModal.tsx`.
5. **Cyan Accent Check**:
   - Confirm primary highlights, badges, focus borders, and active indicators use `cyan` tokens (`text-cyan-400`, `border-cyan-500/30`, `bg-cyan-500/10`, `text-cyan-300`).

---

## Proposed Implementation Snippets

### Proposed Changes to `src/index.css`

```css
/* In src/index.css under @layer base */
@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
    font-family: 'JetBrains Mono', ui-monospace, monospace;
  }
  button, a, input, select, textarea, [role="button"], [role="menuitem"], [role="tab"], .glass-panel {
    @apply transition-all duration-300;
    transition-timing-function: var(--ease-apple);
  }
}
```

### Proposed Redesigned Code for `src/components/ChangelogModal.tsx`

```tsx
import React, { useState, useRef } from 'react';
import { 
  X, 
  Sparkles, 
  Bug, 
  Zap, 
  PenTool, 
  Search, 
  Bell, 
  TrendingUp, 
  GitCommit, 
  Wrench, 
  Check, 
  Layers,
  Activity
} from 'lucide-react';
import { CHANGELOG, type ImpactStats } from '@/data/changelog';
import type { Theme } from '@/data/constants';

interface ChangelogModalProps {
  theme: Theme;
  onClose: () => void;
}

export function ChangelogModal({ theme, onClose }: ChangelogModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [activeVersion, setActiveVersion] = useState<string>(CHANGELOG[0]?.version || '');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const releaseRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const handleSubscribeToggle = () => {
    const nextState = !subscribed;
    setSubscribed(nextState);
    setToastMessage(nextState ? 'Subscribed to changelog notifications!' : 'Unsubscribed from updates');
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case 'feature': return <Sparkles size={13} className="text-cyan-400" />;
      case 'fix': return <Bug size={13} className="text-rose-400" />;
      case 'perf': return <Zap size={13} className="text-amber-400" />;
      case 'tweak': return <Wrench size={13} className="text-sky-400" />;
      default: return <PenTool size={13} className="text-zinc-400" />;
    }
  };

  const getLabelForType = (type: string) => {
    switch (type) {
      case 'feature': return 'FEATURE';
      case 'fix': return 'BUG FIX';
      case 'perf': return 'PERFORMANCE';
      case 'tweak': return 'TWEAK';
      default: return 'UPDATE';
    }
  };

  const getTypeBadgeStyle = (type: string) => {
    switch (type) {
      case 'feature':
        return 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400';
      case 'fix':
        return 'bg-rose-500/10 border-rose-500/30 text-rose-300';
      case 'perf':
        return 'bg-amber-500/10 border-amber-500/30 text-amber-300';
      case 'tweak':
        return 'bg-sky-500/10 border-sky-500/30 text-sky-300';
      default:
        return 'bg-white/5 border-white/10 text-zinc-400';
    }
  };

  const filteredLogs = CHANGELOG.filter((entry) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const versionMatch = entry.version.toLowerCase().includes(q);
    const titleMatch = entry.title.toLowerCase().includes(q);
    const dateMatch = entry.date.toLowerCase().includes(q);
    const changeMatch = entry.changes.some((c) => 
      c.description.toLowerCase().includes(q) ||
      c.type.toLowerCase().includes(q) ||
      getLabelForType(c.type).toLowerCase().includes(q)
    );
    return versionMatch || titleMatch || dateMatch || changeMatch;
  });

  const scrollToRelease = (version: string) => {
    setActiveVersion(version);
    const element = releaseRefs.current[version];
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const renderImpactBar = (impact?: ImpactStats) => {
    if (!impact) {
      return (
        <div className="mt-3 pt-3 border-t border-white/10 flex items-center gap-2 text-xs text-zinc-400 font-mono">
          <Activity size={12} className="text-zinc-500 animate-pulse" />
          <span>Standard Maintenance & Stability Release</span>
        </div>
      );
    }

    const fixes = impact.fixes ?? 0;
    const tweaks = impact.tweaks ?? 0;
    const linesChanged = impact.linesChanged ?? 0;
    const perfGain = impact.perfGain;

    const fixesWeight = fixes * 2;
    const tweaksWeight = tweaks * 1.5;
    const linesWeight = Math.min(Math.ceil(linesChanged / 100), 6);
    const perfWeight = perfGain ? 4 : 0;

    const totalWeight = fixesWeight + tweaksWeight + linesWeight + perfWeight;

    const fixesPct = totalWeight > 0 ? (fixesWeight / totalWeight) * 100 : 0;
    const tweaksPct = totalWeight > 0 ? (tweaksWeight / totalWeight) * 100 : 0;
    const linesPct = totalWeight > 0 ? (linesWeight / totalWeight) * 100 : 0;
    const perfPct = totalWeight > 0 ? (perfWeight / totalWeight) * 100 : 0;

    return (
      <div className="mt-3 pt-3 border-t border-white/10 font-mono">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5">
            <Activity size={12} className="text-cyan-400 animate-pulse" />
            Impact Metrics
          </span>
          {perfGain && (
            <span className="text-[11px] font-bold text-amber-300 flex items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30">
              <Zap size={11} className="text-amber-400" /> {perfGain}
            </span>
          )}
        </div>

        {/* Metric Pills */}
        <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
          {fixes > 0 && (
            <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[11px] font-medium">
              <Bug size={11} className="text-rose-400" />
              <span>{fixes} {fixes === 1 ? 'Fix' : 'Fixes'}</span>
            </div>
          )}

          {tweaks > 0 && (
            <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-300 text-[11px] font-medium">
              <Wrench size={11} className="text-sky-400" />
              <span>{tweaks} {tweaks === 1 ? 'Tweak' : 'Tweaks'}</span>
            </div>
          )}

          {linesChanged > 0 && (
            <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[11px] font-medium">
              <GitCommit size={11} className="text-cyan-400" />
              <span>+{linesChanged} Lines</span>
            </div>
          )}

          {perfGain && (
            <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-medium">
              <TrendingUp size={11} className="text-amber-400" />
              <span>{perfGain}</span>
            </div>
          )}
        </div>

        {/* Visual Metric Bar Track */}
        <div className="h-2 w-full bg-black/40 rounded-full flex items-center overflow-hidden p-0.5 gap-0.5 border border-white/10">
          {fixesPct > 0 && (
            <div 
              style={{ width: `${fixesPct}%` }} 
              className="h-full bg-rose-500 rounded-full transition-all duration-500" 
              title={`Fixes: ${fixes}`}
            />
          )}
          {tweaksPct > 0 && (
            <div 
              style={{ width: `${tweaksPct}%` }} 
              className="h-full bg-sky-400 rounded-full transition-all duration-500" 
              title={`Tweaks: ${tweaks}`}
            />
          )}
          {linesPct > 0 && (
            <div 
              style={{ width: `${linesPct}%` }} 
              className="h-full bg-cyan-400 rounded-full transition-all duration-500" 
              title={`Lines Changed: ${linesChanged}`}
            />
          )}
          {perfPct > 0 && (
            <div 
              style={{ width: `${perfPct}%` }} 
              className="h-full bg-amber-400 rounded-full transition-all duration-500" 
              title={`Perf Gain: ${perfGain}`}
            />
          )}
        </div>
      </div>
    );
  };

  return (
    <div 
      className="fixed inset-0 z-[500] flex items-center justify-center bg-black/80 p-3 sm:p-4 overflow-y-auto font-mono"
      onClick={onClose}
    >
      <div 
        className="glass-panel relative w-full max-w-4xl max-h-[85vh] my-auto flex flex-col rounded-3xl overflow-hidden lucid-scale min-h-0"
        style={{ '--delay': '0ms' } as React.CSSProperties}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle Ambient Cyan Glow Backdrop */}
        <div 
          className="absolute -top-32 -left-32 w-80 h-80 rounded-full blur-3xl pointer-events-none opacity-15 bg-cyan-500"
        />

        {/* Modal Top Bar / Header Controls */}
        <div className="relative z-10 shrink-0 p-4 sm:p-5 pb-3 border-b border-white/10 bg-black/30">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-3">
              <div 
                className="w-9 h-9 rounded-xl flex items-center justify-center border border-cyan-500/30 bg-cyan-500/10 shadow-sm"
              >
                <Sparkles className="text-cyan-400 animate-pulse" size={18} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-bold font-mono text-white tracking-tight">
                    Update Log
                  </h2>
                  <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                    {CHANGELOG[0]?.version || 'v1.5.2'} LATEST
                  </span>
                </div>
                <p className="text-xs font-mono text-zinc-400">
                  TypeNova Release History & Technical Notes
                </p>
              </div>
            </div>

            {/* Top Right Controls: Subscribe & Close */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleSubscribeToggle}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-semibold transition-all border ${
                  subscribed
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                    : 'bg-white/5 hover:bg-white/10 border-white/15 text-zinc-300 hover:text-white hover:border-cyan-500/30'
                }`}
                title="Subscribe to release notifications"
              >
                {subscribed ? (
                  <>
                    <Bell size={13} className="text-emerald-400 fill-emerald-400/20" />
                    <span>Subscribed</span>
                  </>
                ) : (
                  <>
                    <Bell size={13} className="text-cyan-400" />
                    <span>Subscribe</span>
                  </>
                )}
              </button>

              <button
                onClick={onClose}
                className="p-2 bg-white/5 hover:bg-white/15 border border-white/10 text-zinc-400 hover:text-white rounded-xl transition-all"
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Search Filter Bar */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" size={15} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search logs..."
              className="w-full bg-black/30 border border-white/10 rounded-xl pl-10 pr-9 py-2 text-xs text-white font-mono placeholder-zinc-500 focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-white/10 transition-all"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Active Search Toast Feedback */}
          {toastMessage && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-xl bg-zinc-900/90 border border-cyan-500/40 text-cyan-300 text-xs font-mono font-semibold shadow-xl z-50 flex items-center gap-1.5">
              <Check size={13} className="text-cyan-400" />
              <span>{toastMessage}</span>
            </div>
          )}
        </div>

        {/* Modal Body with Left Sidebar & Content List */}
        <div className="relative z-10 flex-1 flex overflow-hidden min-h-0 font-mono">
          {/* Left Vertical Timeline Sidebar Navigation */}
          <div className="hidden md:flex flex-col w-48 shrink-0 border-r border-white/10 bg-black/20 p-3 overflow-y-auto custom-scrollbar min-h-0">
            <div className="flex items-center gap-1.5 px-2 py-1.5 mb-2 text-xs font-semibold text-zinc-400 border-b border-white/5">
              <Layers size={12} className="text-cyan-400" />
              <span>Releases</span>
            </div>

            <div className="relative space-y-1">
              {/* Sidebar Rail Line */}
              <div className="absolute top-3 bottom-3 left-[15px] -translate-x-1/2 w-0.5 bg-gradient-to-b from-cyan-500/50 via-zinc-800 to-zinc-900" />

              {filteredLogs.map((entry) => {
                const isActive = activeVersion === entry.version;
                return (
                  <button
                    key={entry.version}
                    onClick={() => scrollToRelease(entry.version)}
                    className={`group relative w-full flex items-start gap-2.5 px-2.5 py-2 rounded-xl text-left transition-all ${
                      isActive 
                        ? 'bg-cyan-500/10 border border-cyan-500/30 text-white shadow-[0_0_12px_rgba(6,182,212,0.15)]' 
                        : 'hover:bg-white/5 text-zinc-400 hover:text-zinc-200 border border-transparent'
                    }`}
                  >
                    {/* Node Dot */}
                    <div className={`relative z-10 w-2 h-2 rounded-full transition-all shrink-0 mt-1.5 ${
                      isActive 
                        ? 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)] scale-110' 
                        : 'bg-zinc-700 group-hover:bg-zinc-500'
                    }`} />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-mono font-bold truncate ${isActive ? 'text-cyan-300' : ''}`}>
                          {entry.version}
                        </span>
                        {entry.version === CHANGELOG[0]?.version && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                            NEW
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-zinc-500 truncate font-mono">
                        {entry.date}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Main Scrollable Changelog List */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 pr-3 sm:pr-5 space-y-4 custom-scrollbar min-h-0">
            {filteredLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-zinc-500 mb-3">
                  <Search size={22} />
                </div>
                <h3 className="text-base font-bold text-white mb-1 font-mono">No matching updates found</h3>
                <p className="text-xs text-zinc-400 max-w-sm font-mono">
                  Try searching for a different keyword, version number, or change category.
                </p>
                <button
                  onClick={() => setSearchQuery('')}
                  className="mt-3 px-3 py-1.5 rounded-xl bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-semibold hover:bg-cyan-500/30 transition-all font-mono"
                >
                  Clear Search Query
                </button>
              </div>
            ) : (
              filteredLogs.map((release, i) => (
                <div 
                  key={release.version}
                  ref={(el) => { releaseRefs.current[release.version] = el; }}
                  className="relative group"
                >
                  {/* Timeline Card Wrapper - Sub-card styling without nested backdrop-blur */}
                  <div className="relative rounded-2xl bg-white/[0.02] border border-white/10 p-4 sm:p-5 transition-all duration-300 hover:border-cyan-500/30 hover:bg-white/[0.04]">
                    
                    {/* Header of Release Card */}
                    <div className="flex flex-wrap items-start justify-between gap-3 mb-3 pb-3 border-b border-white/10">
                      <div>
                        <div className="flex items-center gap-2.5 mb-1">
                          <span className={`text-xl font-bold font-mono ${
                            i === 0 ? 'text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.4)]' : 'text-white'
                          }`}>
                            {release.version}
                          </span>
                          <span className="text-xs font-mono text-zinc-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded-md">
                            {release.date}
                          </span>
                          {i === 0 && (
                            <span className="text-[10px] font-bold font-mono bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 px-2 py-0.5 rounded-md">
                              LATEST RELEASE
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm font-semibold font-mono text-zinc-200">
                          {release.title}
                        </h4>
                      </div>
                    </div>

                    {/* Change Items List */}
                    <div className="space-y-2">
                      {release.changes.map((change, j) => (
                        <div 
                          key={j} 
                          className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white/[0.02] border border-white/5 hover:border-cyan-500/20 hover:bg-white/[0.04] transition-all"
                        >
                          <div className="mt-0.5 shrink-0 p-1 rounded-lg bg-white/5 border border-white/10">
                            {getIconForType(change.type)}
                          </div>
                          <div className="flex-1 min-w-0 font-mono">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-md border ${getTypeBadgeStyle(change.type)}`}>
                                {getLabelForType(change.type)}
                              </span>
                            </div>
                            <p className="text-xs text-zinc-300 leading-relaxed font-mono">
                              {change.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Impact Section with Metric Pills & Visual Bar */}
                    {renderImpactBar(release.impact)}

                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```
