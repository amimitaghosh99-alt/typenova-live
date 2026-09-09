# Technical Investigation Report: Share Card Canvas, Theme Audit & Test Verification (Milestone 4)

**Explorer**: Explorer 3  
**Milestone**: M4 (Share Card Canvas, Theme Color Audit & Test Verification)  
**Target Files**: `src/utils/shareCard.ts`, `src/components/ResultsScreen.tsx`, `src/components/graphs/WpmGraph.tsx`, `src/components/RaceResultsScreen.tsx`, `src/tests/`  
**Workspace Rules Compliance**: Strict dynamic theme color binding (`rgb(${theme.glowPrimary})` / `rgba(${theme.glowPrimary}, ...)`), zero hardcoded accent colors, minimalist control bar standards.

---

## 1. Executive Summary

This report delivers a thorough technical investigation and implementation blueprint for **Milestone 4 (Explorer 3 Focus)**:
1. **OpenGraph / Social Share Card Canvas (`src/utils/shareCard.ts`)**:
   - Analysis of canvas text rendering, visual balance, dual radial glow orbs, and layout geometry.
   - Solutions for `S+` grade font scaling and kerning (avoiding overflow at 260px font size).
   - Integration of the **Composite Performance Index (CPI)** into the primary stat grid.
   - Design of an earned **Accolade Badge Rack** in the top-right canvas header.
   - Robust color normalization helper (`normalizeRgb`) guaranteeing canvas compatibility across all wallpaper-extracted RGB triplets and hex formats.
2. **Static Theme Color Audit Across `ResultsScreen.tsx` & Subcomponents**:
   - Line-by-line identification of all hardcoded `text-cyan-*`, `text-amber-*`, `border-cyan-*`, `bg-emerald-*` classes.
   - Complete replacement mappings ensuring 100% compliance with `GEMINI.md` dynamic theme binding rules (`style={{ color: \`rgb(${theme.glowPrimary})\` }}`).
   - Audit of connected subcomponents (`WpmGraph.tsx`, `RaceResultsScreen.tsx`, `AIDrillResultsScreen.tsx`).
3. **ResultsScreen Logic & Props Integration Gap Analysis**:
   - Identification of legacy grade calculation logic inside `ResultsScreen.tsx` that causes 40 WPM / 100% accuracy runs to evaluate to `Grade C` (violating R1 / AC1).
   - Props propagation blueprint from `src/App.tsx` to `ResultsScreen.tsx` for `cpi`, `grade`, `burstWpm`, `xpBreakdown`, and multi-metric ghost precision deltas (`ghostDeltaAcc`, `ghostDeltaCons`, `ghostDeltaStreak`).
4. **Test Harness & Verification Analysis**:
   - Verification of `src/tests/run_e2e.ts` (33 suites, 129 tests, 100% passing in 14ms).
   - Verification of `src/tests/run_challenger_stress.ts` (5 suites, 22 adversarial stress tests, 100% passing in 51ms).
   - Specification for share card unit testing and visual browser verification protocol.

---

## 2. Share Card Canvas Architecture & Upgrade Specification (`src/utils/shareCard.ts`)

### 2.1 Current Implementation & Geometric Limitations
The existing `shareCard.ts` renders a 1200×630px canvas using the standard OpenGraph 1.91:1 aspect ratio.

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  TYPE NOVA                                                                       │ (Empty Top-Right)
│  CYBERPUNK · 9/1/2026                                                            │
│                                                                                  │
│                                                                                  │
│   142 WPM                                                   S                    │
│                                                           GRADE                  │
│                                                                                  │
│                                                                                  │
│  ACCURACY            CONSISTENCY            RAW WPM                              │
│  99%                 92%                    145                                  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

#### Key Identified Defects:
1. **Grade "S+" Width Overflow & Crowding**:
   - Single letters (`S`, `A`, `B`, `C`, `D`) measured at `900 260px` font have a glyph width of ~180px.
   - Two-character grades (`"S+"`) measure ~355px wide.
   - At `W - 120 - gw`: `1200 - 120 - 355 = 725px`.
   - When net speed is 3 digits (e.g. `142 WPM`), the number occupies `x = 76` to `x = 520`.
   - This leaves only ~200px between the `"WPM"` label and `"S+"`, causing optical imbalance and visual crowding.
   - **Solution**: Dynamically scale grade font size to `900 210px` when `data.grade.length > 1` (e.g. `'S+'`), and render the grade title subtitle (e.g. `CYBER VANGUARD`) below the grade.
2. **Missing CPI Score**:
   - CPI is the primary composite metric of the TypeNova precision engine. It is omitted from `ShareCardData`.
   - **Solution**: Add `cpi?: number` to `ShareCardData` and render a balanced 4-column stat row at the bottom:
     `[ CPI, RAW WPM, ACCURACY, CONSISTENCY ]` or `[ ACCURACY, CONSISTENCY, RAW WPM, CPI ]`.
3. **Missing Earned Accolades Rack**:
   - The top-right region (`x = 420` to `x = 1120`, `y = 70` to `y = 170`) is currently empty dark space.
   - **Solution**: Add `accolades?: string[]` (or `accoladeBadges?: AccoladeBadge[]`) to `ShareCardData`. Render frosted pill chips for each earned accolade (e.g., `✦ FLAWLESS`, `🛡 CENTURION`, `⚡ SURGICAL`, `〰 FLOW STATE`) with theme-bound glowing borders.
4. **Theme RGB Format Fragility**:
   - `orb(ctx, ..., data.glowPrimary, ...)` executes: `g.addColorStop(0, \`rgba(\${rgb},\${alpha})\`)`.
   - If `data.glowPrimary` is passed as `'rgba(6,182,212,0.4)'` or `'#06b6d4'`, the canvas gradient receives `rgba(rgba(6,182,212,0.4),0.28)`, which is invalid CSS color syntax and breaks canvas rendering silently.
   - **Solution**: Implement `normalizeRgb(colorStr)` to parse any triplet, `rgba()`, `rgb()`, or `#hex` into clean `'r, g, b'`.

---

### 2.2 Upgraded Visual Canvas Layout Specification

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│  TYPE NOVA                                [ ✦ FLAWLESS ] [ 🛡 100+ COMBO ] [ 〰 FLOW ] │
│  CYBERPUNK · 9/1/2026                                                                  │
│                                                                                        │
│   142                                                            S+                    │
│   WPM                                                           GRADE                  │
│                                                            CYBER VANGUARD              │
│                                                                                        │
│  CPI              ACCURACY            CONSISTENCY            RAW WPM                   │
│  138              99%                 92%                    145                       │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

### 2.3 Proposed Full Implementation: `src/utils/shareCard.ts`

```typescript
// Hand-drawn 1200x630 result card (Open Graph size) — zero external dependencies.
// Styled after TypeNova dark liquid glass: dark bg, dual theme-colored glow orbs, JetBrains Mono type.

export interface ShareCardData {
  wpm: number;
  rawWpm: number;
  accuracy: number;
  consistency: number;
  grade: string;
  gradeTitle?: string;
  cpi?: number;
  accolades?: string[];
  themeName: string;
  /** "r,g,b" strings, straight from Theme.glowPrimary / glowSecondary or hex/rgba */
  glowPrimary: string;
  glowSecondary: string;
}

const W = 1200;
const H = 630;
const MONO = '"JetBrains Mono", "Fira Code", ui-monospace, monospace';

/**
 * Normalizes any RGB triplet, rgba(), rgb(), or hex color string into a clean "r, g, b" string.
 */
export function normalizeRgb(colorStr?: string, defaultRgb = '6, 182, 212'): string {
  if (!colorStr) return defaultRgb;
  const trimmed = colorStr.trim();
  
  // 1. Triplet format: "6, 182, 212" or "6,182,212"
  const tripletMatch = trimmed.match(/^(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})$/);
  if (tripletMatch) return `${tripletMatch[1]}, ${tripletMatch[2]}, ${tripletMatch[3]}`;

  // 2. CSS function format: "rgb(6, 182, 212)" or "rgba(6, 182, 212, 0.4)"
  const funcMatch = trimmed.match(/rgba?\s*\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/);
  if (funcMatch) return `${funcMatch[1]}, ${funcMatch[2]}, ${funcMatch[3]}`;

  // 3. Hex format: "#06b6d4" or "06b6d4"
  if (trimmed.startsWith('#') || /^[0-9a-fA-F]{6}$/.test(trimmed)) {
    const hex = trimmed.replace('#', '');
    if (hex.length === 6) {
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      return `${r}, ${g}, ${b}`;
    }
  }

  return defaultRgb;
}

function orb(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rgb: string, alpha: number) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${rgb},${alpha})`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

async function renderResultCard(data: ShareCardData): Promise<Blob> {
  if (typeof document !== 'undefined' && document.fonts) {
    await document.fonts.ready;
  }

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context not supported');

  const primaryRgb = normalizeRgb(data.glowPrimary, '6, 182, 212');
  const secondaryRgb = normalizeRgb(data.glowSecondary, '34, 211, 238');

  // Background + dynamic theme glow orbs
  ctx.fillStyle = '#0a0a0c';
  ctx.fillRect(0, 0, W, H);
  orb(ctx, 150, 80, 520, primaryRgb, 0.30);
  orb(ctx, 1080, 560, 560, secondaryRgb, 0.24);
  orb(ctx, 900, 100, 360, primaryRgb, 0.14);

  // Outer Border & Glass Frame
  ctx.strokeStyle = 'rgba(255,255,255,0.14)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(24, 24, W - 48, H - 48, 32);
  ctx.stroke();

  // Top Left: Wordmark & Session Date
  ctx.textBaseline = 'alphabetic';
  ctx.font = `900 44px ${MONO}`;
  ctx.fillStyle = '#ffffff';
  ctx.fillText('TYPE', 80, 118);
  ctx.fillStyle = `rgb(${primaryRgb})`;
  ctx.fillText('NOVA', 80 + ctx.measureText('TYPE').width, 118);

  ctx.font = `700 18px ${MONO}`;
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  const subtitle = `${(data.themeName || 'CYBERPUNK').toUpperCase()} · ${new Date().toLocaleDateString()}`;
  ctx.fillText(subtitle, 80, 152);

  // Top Right: Accolade Badges Rack
  if (data.accolades && data.accolades.length > 0) {
    let badgeX = W - 80;
    const badgeY = 92;
    const badgeH = 38;
    const paddingX = 18;

    // Draw from right to left
    for (let i = data.accolades.length - 1; i >= 0; i--) {
      const accoladeText = data.accolades[i].toUpperCase();
      ctx.font = `800 14px ${MONO}`;
      const textW = ctx.measureText(accoladeText).width;
      const badgeW = textW + paddingX * 2;
      badgeX -= badgeW;

      // Chip Background
      ctx.fillStyle = `rgba(${primaryRgb}, 0.12)`;
      ctx.strokeStyle = `rgba(${primaryRgb}, 0.45)`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 19);
      ctx.fill();
      ctx.stroke();

      // Chip Text
      ctx.fillStyle = '#ffffff';
      ctx.fillText(accoladeText, badgeX + paddingX, badgeY + 24);

      badgeX -= 12; // Gap between badges
    }
  }

  // Left Hero: Big Net WPM
  ctx.font = `900 190px ${MONO}`;
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = `rgba(${primaryRgb}, 0.55)`;
  ctx.shadowBlur = 60;
  ctx.fillText(String(data.wpm), 76, 395);
  ctx.shadowBlur = 0;

  // WPM Unit Label
  ctx.font = `900 36px ${MONO}`;
  ctx.fillStyle = 'rgba(255,255,255,0.50)';
  const wpmWidth = ctx.measureText(String(data.wpm)).width;
  ctx.fillText('WPM', 76 + wpmWidth + 24, 395);

  // Right Hero: Big Grade (with adaptive font scaling for 'S+')
  const isMultiCharGrade = data.grade.length > 1;
  const gradeFontSize = isMultiCharGrade ? 210 : 250;
  ctx.font = `900 ${gradeFontSize}px ${MONO}`;
  ctx.fillStyle = `rgb(${primaryRgb})`;
  ctx.shadowColor = `rgba(${primaryRgb}, 0.85)`;
  ctx.shadowBlur = 90;
  const gw = ctx.measureText(data.grade).width;
  const gradeX = W - 100 - gw;
  const gradeY = isMultiCharGrade ? 395 : 405;
  ctx.fillText(data.grade, gradeX, gradeY);
  ctx.shadowBlur = 0;

  // Grade Title / Label
  ctx.font = `700 20px ${MONO}`;
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  const gl = 'GRADE';
  ctx.fillText(gl, gradeX + gw / 2 - ctx.measureText(gl).width / 2, 442);

  if (data.gradeTitle) {
    ctx.font = `800 14px ${MONO}`;
    ctx.fillStyle = `rgba(${primaryRgb}, 0.9)`;
    const titleText = data.gradeTitle.toUpperCase();
    ctx.fillText(titleText, gradeX + gw / 2 - ctx.measureText(titleText).width / 2, 466);
  }

  // Bottom Stat Row: 4 Balanced Columns
  const stats: Array<[string, string]> = [
    ...(typeof data.cpi === 'number' ? [['CPI', String(data.cpi)] as [string, string]] : []),
    ['ACCURACY', `${data.accuracy}%`],
    ['CONSISTENCY', `${data.consistency}%`],
    ['RAW WPM', String(data.rawWpm)],
  ];

  let x = 80;
  const colSpacing = stats.length === 4 ? 260 : 340;
  for (const [label, value] of stats) {
    ctx.font = `700 18px ${MONO}`;
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.fillText(label, x, 532);

    ctx.font = `900 48px ${MONO}`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(value, x, 582);
    x += colSpacing;
  }

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png');
  });
}

/** Copy the card to the clipboard; fall back to a PNG download. Returns which happened. */
export async function shareResultCard(data: ShareCardData): Promise<'copied' | 'downloaded'> {
  let blob: Blob;
  try {
    blob = await renderResultCard(data);
  } catch (error) {
    console.error('Failed to render result card:', error);
    throw error;
  }

  try {
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    return 'copied';
  } catch {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `typenova-${data.wpm}wpm.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    return 'downloaded';
  }
}
```

---

## 3. Static Theme Color Audit & Compliance Analysis

### 3.1 Audit Rules from `GEMINI.md`
- **NEVER** hardcode accent colors like `text-cyan-400`, `text-amber-400`, `text-rose-400`, `border-cyan-500/20`, etc. for theme-sensitive elements.
- **ALWAYS** use dynamic theme binding: `style={{ color: \`rgb(\${theme.glowPrimary})\` }}` or `rgba(\${theme.glowPrimary}, 0.2)` for opacity variants.
- Exception: Strictly semantic colors (e.g. red for typing errors / sudden death abort, green for success / win) are permissible to remain fixed.

---

### 3.2 Audit Findings in `src/components/ResultsScreen.tsx`

| Line | Current Code | Violation Type | Compliant Replacement |
|---|---|---|---|
| **116–120** | `switch (grade) { case 'S': return 'text-amber-400 ...'; case 'A': return 'text-emerald-400 ...'; }` | Hardcoded grade colors | Replace with `GRADE_DETAILS[grade]` styling from `scoringEngine.ts` and dynamic theme accent glow. |
| **130–131** | `glowPrimary: theme?.glowPrimary \|\| 'rgba(6,182,212,0.4)', glowSecondary: theme?.glowSecondary \|\| 'rgba(34,211,238,0.3)'` | Invalid RGBA string fallback passed to `shareResultCard` | Replace fallback with valid RGB triplets `'6, 182, 212'` and `'34, 211, 238'`. |
| **170** | `<div className="mb-4 bg-amber-500/20 text-amber-400 border border-amber-500/50 ... shadow-[0_0_30px_rgba(245,158,11,0.5)]">` | Hardcoded amber Level Up banner | `style={{ backgroundColor: \`rgba(\${theme.glowPrimary}, 0.2)\`, color: \`rgb(\${theme.glowPrimary})\`, borderColor: \`rgba(\${theme.glowPrimary}, 0.5)\`, boxShadow: \`0 0 30px rgba(\${theme.glowPrimary}, 0.5)\` }}` |
| **195** | `className={... \`bg-white/5 border border-white/10 \${theme?.text \|\| 'text-cyan-400'}\`}` | Hardcoded Tailwind fallback `text-cyan-400` | Remove `text-cyan-400`; apply `style={{ color: \`rgb(\${theme.glowPrimary})\` }}`. |
| **225** | `<span className={\`text-5xl font-black \${flawlessStreak > 50 ? (theme?.text \|\| 'text-cyan-400') : 'text-white'}\`}>` | Hardcoded `text-cyan-400` | `style={{ color: flawlessStreak > 50 ? \`rgb(\${theme.glowPrimary})\` : '#ffffff' }}` |
| **235** | `theme={theme \|\| { name: 'CYBERPUNK', ..., glowPrimary: 'rgba(6,182,212,0.4)' }}` | Invalid RGBA triplet fallback in WpmGraph prop | Update fallback to `'6, 182, 212'`. |
| **315** | `<button className="... text-cyan-400 hover:text-cyan-300 border border-transparent hover:border-cyan-500/20 ...">` | Hardcoded `cyan` on SMART DRILL button | `style={{ color: \`rgb(\${theme.glowPrimary})\` }}` with hover border `rgba(\${theme.glowPrimary}, 0.3)`. |
| **329** | `<button className={\`... \${shareStatus ? 'text-cyan-400' : 'text-zinc-300 ...'}\`}>` | Hardcoded `text-cyan-400` on SHARE CARD active state | `style={shareStatus ? { color: \`rgb(\${theme.glowPrimary})\` } : undefined}` |

---

### 3.3 Audit Findings in Related Subcomponents

#### A. `src/components/graphs/WpmGraph.tsx`
- **Lines 182 & 203**: `<path fill="url(#wpmGradient)" ... className={theme.text} />` & `<path ... stroke="currentColor" className={theme.text} />`.
  - In wallpaper auto-fetch mode, `theme.text` might be a generic class like `text-white`.
  - **Enhancement**: Apply `style={{ color: \`rgb(\${theme.glowPrimary})\` }}` on the SVG container and `<stop stopColor={\`rgb(\${theme.glowPrimary})\`} />` in `<linearGradient>` to ensure the velocity curve dynamically matches the exact wallpaper accent.
- **Lines 189–200**: Ghost curve `#c084fc` is semantic purple for the Ghost pacer (permissible).
- **Line 206**: Error dots `rgb(248,113,113)` are semantic red for errors (permissible).

#### B. `src/components/RaceResultsScreen.tsx`
- **Line 736**:
  `className="flex items-center gap-2.5 px-8 py-4 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.25)] hover:bg-cyan-500/30 ..."`
  - Hardcoded cyan on the "RETURN TO ROOM / PLAY AGAIN" button.
  - **Fix**: Apply dynamic theme style:
    `style={{ backgroundColor: \`rgba(\${theme.glowPrimary}, 0.2)\`, borderColor: \`rgba(\${theme.glowPrimary}, 0.4)\`, color: \`rgb(\${theme.glowPrimary})\`, boxShadow: \`0 0 20px rgba(\${theme.glowPrimary}, 0.25)\` }}`.

---

## 4. ResultsScreen Logic & Props Integration Gap Analysis

### 4.1 Defective Grade Logic in `ResultsScreen.tsx`
Currently, lines 106–112 in `ResultsScreen.tsx` contain:
```typescript
const grade = (() => {
  if (wpm > 100 && accuracy > 98) return "S";
  if (wpm > 80 && accuracy > 95) return "A";
  if (wpm > 50 && accuracy > 90) return "B";
  if (wpm > 30) return "C";
  return "D";
})();
```

**Why This Breaks Acceptance Criterion 1**:
If a user types at 40 WPM with 100% accuracy, this outdated snippet returns `"C"` because `wpm (40) < 50`.
However, `src/lib/scoringEngine.ts` calculates a CPI of ~116 for 40 WPM @ 100% Acc, which `evaluateGrade` correctly evaluates to `"S"` or `"S+"`.

**The Solution**:
Replace the local calculation with `calculateCPI(wpm, accuracy, flawlessStreak, consistency, totalChars)` and `getGradeDetails(grade)` from `@/lib/scoringEngine`.

---

### 4.2 Data Pipeline & Prop Integration in `src/App.tsx`

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ App.tsx: Finish Test Event Handler                                                    │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 1. Compute CPI:                                                                        │
│    const cpiBreakdown = calculateCPI(wpm, accuracy, streak, consistency, chars);       │
│                                                                                        │
│ 2. Compute Burst WPM:                                                                  │
│    const burstWpm = calculateBurstWpm(typing.keystrokeLog.current, timelinePoints);   │
│                                                                                        │
│ 3. Process RPG with Consistency & Errors:                                              │
│    const result = rpg.processRPG(..., stats.consistency, rawErrors);                   │
│                                                                                        │
│ 4. Compute Ghost Delta:                                                                │
│    const ghostDelta = calculateGhostDelta(finishMs, acc, cons, streak, ghostFinishMs,  │
│                                           rivalGhost.accuracy, rivalGhost.consistency);│
│                                                                                        │
│ 5. Pass to resultsProps:                                                               │
│    { cpi: cpiBreakdown.cpi, grade: cpiBreakdown.grade, burstWpm,                       │
│      xpBreakdown: rpg.xpBreakdownLast,                                                 │
│      ghostDeltaS: ghostDelta?.deltaS, ghostDeltaAcc: ghostDelta?.deltaAcc,             │
│      ghostDeltaCons: ghostDelta?.deltaCons, ghostDeltaStreak: ghostDelta?.deltaStreak }│
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Test Suite Verification & M4 Testing Coverage

### 5.1 Existing Test Suite Execution Status
We executed the full E2E test harness (`npx tsx src/tests/run_e2e.ts`) and Challenger Stress Suite (`npx tsx src/tests/run_challenger_stress.ts`).

1. **`src/tests/run_e2e.ts`**:
   - **Total Suites**: 33
   - **Total Tests**: 129
   - **Passed**: 129 (100%)
   - **Failed**: 0
   - **Duration**: 14ms
   - **Coverage**:
     - Tier 1: Feature coverage for CPI, S+ Grading, Burst WPM, Flawless XP (+50%), Combo Multipliers (50+, 100+, 200+), Rhythm Consistency (+20%/+30%), Accolades (4 badges), Ghost Net Deltas.
     - Tier 2: Boundary conditions (0 WPM, 100% errors, backspaces, micro-bursts, 250+ combo, rhythm extremes).
     - Tier 3: Cross-feature combinations (40 WPM golden scenario, mash demotion, sudden death abort).
     - Tier 4: Real-world typist personas (Novice, Zen Perfectionist, Esports Speedster, etc.).

2. **`src/tests/run_challenger_stress.ts`**:
   - **Total Suites**: 5
   - **Total Tests**: 22
   - **Passed**: 22 (100%)
   - **Failed**: 0
   - **Duration**: 51ms
   - **Coverage**:
     - Chaos & poison input ingestion (`NaN`, `Infinity`, `-Infinity`, `null`, `undefined`).
     - Keystroke storms (100% backspaces, jitter, identical timestamps).
     - Grade and accuracy monotonicity verification.
     - 10,000 randomized Monte Carlo trials with zero failures.

---

### 5.2 Recommended New Test Suite for M4 (`src/tests/shareCard.test.ts`)
To ensure complete test coverage of Feature 17 (Share Card S+ & CPI Support), the following test suite should be registered:

```typescript
import { describe, it, expect } from './testHarness';
import { normalizeRgb, type ShareCardData } from '../utils/shareCard';

export function registerShareCardTests(): void {
  describe('Milestone 4 - Share Card Canvas & Normalization', () => {
    it('normalizes RGB triplets correctly', () => {
      expect(normalizeRgb('6, 182, 212')).toBe('6, 182, 212');
      expect(normalizeRgb('245,158,11')).toBe('245, 158, 11');
    });

    it('normalizes rgba() and rgb() functional strings', () => {
      expect(normalizeRgb('rgba(6, 182, 212, 0.4)')).toBe('6, 182, 212');
      expect(normalizeRgb('rgb(168, 85, 247)')).toBe('168, 85, 247');
    });

    it('normalizes 6-digit hex color strings to RGB triplets', () => {
      expect(normalizeRgb('#06b6d4')).toBe('6, 182, 212');
      expect(normalizeRgb('#f59e0b')).toBe('245, 158, 11');
    });

    it('falls back safely for invalid or undefined color inputs', () => {
      expect(normalizeRgb(undefined)).toBe('6, 182, 212');
      expect(normalizeRgb('')).toBe('6, 182, 212');
    });

    it('validates ShareCardData schema with S+ grade and CPI score', () => {
      const data: ShareCardData = {
        wpm: 140,
        rawWpm: 145,
        accuracy: 99,
        consistency: 92,
        grade: 'S+',
        gradeTitle: 'Cyber Vanguard',
        cpi: 138,
        accolades: ['FLAWLESS', 'CENTURION', 'FLOW STATE'],
        themeName: 'Cyberpunk',
        glowPrimary: '6, 182, 212',
        glowSecondary: '34, 211, 238',
      };
      expect(data.grade).toBe('S+');
      expect(data.cpi).toBe(138);
      expect(data.accolades?.length).toBe(3);
    });
  });
}
```

---

## 6. Implementation Checklist & Verification Protocol for Worker Agent

### Checklist for Worker Agent:
- [ ] **`src/utils/shareCard.ts`**:
  - [ ] Add `normalizeRgb` helper to safely parse any theme format.
  - [ ] Update `ShareCardData` interface with `cpi?: number`, `gradeTitle?: string`, `accolades?: string[]`.
  - [ ] Adjust grade font size dynamically (`210px` for `S+`, `250px` for single letter).
  - [ ] Add top-right accolade badge rack.
  - [ ] Update bottom stat row to 4 columns (`CPI`, `ACCURACY`, `CONSISTENCY`, `RAW WPM`).
- [ ] **`src/components/ResultsScreen.tsx`**:
  - [ ] Import `calculateCPI`, `calculateAccolades`, `getGradeDetails`, `calculateBurstWpm` from `@/lib/scoringEngine`.
  - [ ] Replace hardcoded grade calculation with `cpiBreakdown.grade` and `evaluatedCpi`.
  - [ ] Render 4-card **Session Accolades** section (Flawless, Centurion Streak, Surgical Precision, Flow State).
  - [ ] Render **XP Multiplier Breakdown** frosted glass card.
  - [ ] Render **Ghost Net Precision Telemetry** differential chip.
  - [ ] Purge all hardcoded `text-cyan-*`, `text-amber-*`, `border-cyan-*` and bind to `style={{ color: \`rgb(${theme.glowPrimary})\` }}`.
- [ ] **`src/hooks/useModeLeaderboard.ts` & `src/App.tsx`**:
  - [ ] Extend `RivalGhost` interface with `accuracy?: number`, `consistency?: number`.
  - [ ] Pass `stats.consistency` and raw errors to `rpg.processRPG` and `rpg.checkAchievements`.
  - [ ] Pass `cpi`, `grade`, `burstWpm`, `xpBreakdown`, and ghost deltas in `resultsProps`.
- [ ] **Verification**:
  - [ ] Run `npx tsx src/tests/run_e2e.ts` -> 100% passing.
  - [ ] Run `npm run build` -> Zero TypeScript compilation or bundle errors.

---

## 7. Conclusion

Milestone 4 brings together the scoring engine, RPG progression, and Ghost Net telemetry into a unified, visually stunning, and gamified results experience. With the specifications provided in this report, the implementation will achieve zero theme regressions, full dynamic color compliance, and complete test suite parity.
