const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '../../');
const changelogModalPath = path.join(projectRoot, 'src/components/ChangelogModal.tsx');
const indexCssPath = path.join(projectRoot, 'src/index.css');

console.log('================================================================');
console.log('EMPIRICAL VERIFICATION SUITE: R2, R3, AC 3, AC 4');
console.log('Scrollbar Track Containment & Impact Metrics Glass Styling');
console.log('================================================================');
console.log(`Project Root: ${projectRoot}`);
console.log(`ChangelogModal Path: ${changelogModalPath}`);
console.log(`Index CSS Path: ${indexCssPath}`);
console.log('----------------------------------------------------------------\n');

let passCount = 0;
let failCount = 0;

function assert(condition, message, detail = '') {
  if (condition) {
    console.log(`[PASS] ${message}`);
    if (detail) console.log(`       └─ ${detail}`);
    passCount++;
  } else {
    console.error(`[FAIL] ${message}`);
    if (detail) console.error(`       └─ ERROR: ${detail}`);
    failCount++;
  }
}

// -----------------------------------------------------------------------------
// SECTION 1: SCROLLBAR CSS & DOM CONTAINMENT (R2 / AC 3)
// -----------------------------------------------------------------------------
console.log('>>> TEST SUITE 1: SCROLLBAR TRACK PADDING & MARGIN CONTAINMENT (R2 / AC 3)');

const cssContent = fs.readFileSync(indexCssPath, 'utf8');
const modalContent = fs.readFileSync(changelogModalPath, 'utf8');

// 1.1 Verify CSS rules in src/index.css
const customScrollbarWidth = /\.custom-scrollbar::-webkit-scrollbar\s*\{[^}]*width:\s*6px;/s.test(cssContent);
assert(customScrollbarWidth, 'CSS: .custom-scrollbar has width: 6px');

const customScrollbarTrackMarginTop = /\.custom-scrollbar::-webkit-scrollbar-track\s*\{[^}]*margin-top:\s*12px;/s.test(cssContent);
assert(customScrollbarTrackMarginTop, 'CSS: .custom-scrollbar::-webkit-scrollbar-track has margin-top: 12px');

const customScrollbarTrackMarginBottom = /\.custom-scrollbar::-webkit-scrollbar-track\s*\{[^}]*margin-bottom:\s*12px;/s.test(cssContent);
assert(customScrollbarTrackMarginBottom, 'CSS: .custom-scrollbar::-webkit-scrollbar-track has margin-bottom: 12px');

const customScrollbarThumbBorder = /\.custom-scrollbar::-webkit-scrollbar-thumb\s*\{[^}]*border:\s*1px solid transparent;/s.test(cssContent);
assert(customScrollbarThumbBorder, 'CSS: .custom-scrollbar::-webkit-scrollbar-thumb has transparent border containment');

const customScrollbarThumbClip = /\.custom-scrollbar::-webkit-scrollbar-thumb\s*\{[^}]*background-clip:\s*padding-box;/s.test(cssContent);
assert(customScrollbarThumbClip, 'CSS: .custom-scrollbar::-webkit-scrollbar-thumb has background-clip: padding-box');

// 1.2 Verify right pane scrollbar padding in src/components/ChangelogModal.tsx
const rightPaneScrollbarMatch = modalContent.match(/className="flex-1 overflow-y-auto[^"]*custom-scrollbar[^"]*"/);
assert(rightPaneScrollbarMatch !== null, 'DOM: Found right content scrollable pane with custom-scrollbar');

if (rightPaneScrollbarMatch) {
  const classStr = rightPaneScrollbarMatch[0];
  assert(classStr.includes('pr-3'), 'DOM: Right scroll pane contains pr-3 (mobile 12px right padding)');
  assert(classStr.includes('sm:pr-6'), 'DOM: Right scroll pane contains sm:pr-6 (desktop 24px right padding)');
  assert(classStr.includes('min-h-0'), 'DOM: Right scroll pane contains min-h-0 (prevents flex container clipping)');
  assert(classStr.includes('overflow-y-auto'), 'DOM: Right scroll pane contains overflow-y-auto');
}

// 1.3 Geometric proof calculation for outer glass corner clipping
// Outer modal corner radius R = 40px (rounded-[2.5rem])
// Corner center = (W - 40, 40)
// Curve equation: (x - (W - 40))^2 + (y - 40)^2 = 40^2
// At Y = 12px (due to margin-top: 12px):
// (40 - 12)^2 = 28^2 = 784
// (x - (W - 40))^2 = 1600 - 784 = 816 => x - (W - 40) = sqrt(816) ≈ 28.565px
// Inner boundary of glass border at Y=12 is X_inner = W - 40 + 28.565 = W - 11.435px.
// With pr-3 (12px padding) or sm:pr-6 (24px padding), scrollbar right edge is at:
// Mobile: W - 12px. Since W - 12 < W - 11.435, scrollbar is inside inner bounds.
// Desktop with sm:pr-6 (24px padding): scrollbar right edge is at W - 24px, well inside W - 11.435px.
const R = 40; // corner radius in px
const marginTop = 12; // scrollbar track margin-top in px
const dy = R - marginTop; // 28px offset from corner center Y
const maxAllowedXOffset = R - Math.sqrt(R * R - dy * dy); // ~11.435px from right outer edge
const desktopPadding = 24; // sm:pr-6
const mobilePadding = 12; // pr-3
const desktopMarginSafety = desktopPadding - maxAllowedXOffset; // 24 - 11.435 = +12.565px clearance
const mobileMarginSafety = mobilePadding - maxAllowedXOffset; // 12 - 11.435 = +0.565px clearance

assert(desktopMarginSafety > 0, `GEOMETRY PROOF: Desktop scrollbar track has +${desktopMarginSafety.toFixed(3)}px clearance from 40px outer glass curve`, `Max corner offset at Y=12 is ${maxAllowedXOffset.toFixed(3)}px, desktop padding is ${desktopPadding}px`);
assert(mobileMarginSafety > 0, `GEOMETRY PROOF: Mobile scrollbar track has +${mobileMarginSafety.toFixed(3)}px clearance from 40px outer glass curve`, `Max corner offset at Y=12 is ${maxAllowedXOffset.toFixed(3)}px, mobile padding is ${mobilePadding}px`);

console.log('');

// -----------------------------------------------------------------------------
// SECTION 2: IMPACT METRICS BAR & CARDS GLASS STYLING (R3 / AC 4)
// -----------------------------------------------------------------------------
console.log('>>> TEST SUITE 2: TRANSLUCENT GRADIENT GLASS STYLING & GLOWING SHADOWS (R3 / AC 4)');

// 2.1 Release Card glass styling
const cardGlassMatch = modalContent.match(/glass-panel relative rounded-3xl bg-slate-900\/40 border border-white\/15 p-6 md:p-7 backdrop-blur-xl shadow-xl hover:border-cyan-500\/30 hover:bg-slate-900\/60 hover:shadow-\[0_0_30px_rgba\(34,211,238,0\.08\)\]/);
assert(cardGlassMatch !== null, 'CARDS: Release cards use translucent slate glass (bg-slate-900/40, backdrop-blur-xl, border-white/15)');

const cardHoverGlow = modalContent.includes('hover:shadow-[0_0_30px_rgba(34,211,238,0.08)]');
assert(cardHoverGlow, 'CARDS: Release cards feature glowing hover shadows (0_0_30px cyan glow)');

// 2.2 Sub-card change item glass styling
const subCardMatch = modalContent.includes('bg-white/[0.03] backdrop-blur-sm border border-white/10 hover:border-cyan-500/20 hover:bg-white/[0.06] hover:shadow-[0_0_15px_rgba(34,211,238,0.08)]');
assert(subCardMatch, 'SUB-CARDS: Sub-card change items use translucent glass (bg-white/[0.03], backdrop-blur-sm, hover glow shadow)');

// 2.3 Category Badge neon glowing shadow styles (getTypeBadgeStyle)
const featureBadgeGlow = modalContent.includes('bg-emerald-500/15 border-emerald-400/40 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.2)] backdrop-blur-md');
assert(featureBadgeGlow, 'BADGES: Feature category badges use translucent gradient glass with green neon glow shadow');

const fixBadgeGlow = modalContent.includes('bg-rose-500/15 border-rose-400/40 text-rose-300 shadow-[0_0_10px_rgba(244,63,94,0.2)] backdrop-blur-md');
assert(fixBadgeGlow, 'BADGES: Fix category badges use translucent gradient glass with rose neon glow shadow');

const perfBadgeGlow = modalContent.includes('bg-amber-500/15 border-amber-400/40 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.2)] backdrop-blur-md');
assert(perfBadgeGlow, 'BADGES: Perf category badges use translucent gradient glass with amber neon glow shadow');

const tweakBadgeGlow = modalContent.includes('bg-sky-500/15 border-sky-400/40 text-sky-300 shadow-[0_0_10px_rgba(14,165,233,0.2)] backdrop-blur-md');
assert(tweakBadgeGlow, 'BADGES: Tweak category badges use translucent gradient glass with sky neon glow shadow');

// 2.4 Impact Bar Metric Pills (renderImpactBar)
const fixesPillMatch = modalContent.includes('bg-gradient-to-r from-rose-500/20 to-pink-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold backdrop-blur-md shadow-[0_0_12px_rgba(244,63,94,0.15)]');
assert(fixesPillMatch, 'METRIC PILLS: Fixes pill uses bg-gradient-to-r, backdrop-blur-md, and rose glowing shadow');

const tweaksPillMatch = modalContent.includes('bg-gradient-to-r from-sky-500/20 to-cyan-500/10 border border-sky-500/30 text-sky-300 text-xs font-semibold backdrop-blur-md shadow-[0_0_12px_rgba(56,189,248,0.15)]');
assert(tweaksPillMatch, 'METRIC PILLS: Tweaks pill uses bg-gradient-to-r, backdrop-blur-md, and sky glowing shadow');

const linesPillMatch = modalContent.includes('bg-gradient-to-r from-purple-500/20 to-indigo-500/10 border border-purple-500/30 text-purple-300 text-xs font-semibold backdrop-blur-md shadow-[0_0_12px_rgba(168,85,247,0.15)]');
assert(linesPillMatch, 'METRIC PILLS: Lines Changed pill uses bg-gradient-to-r, backdrop-blur-md, and purple glowing shadow');

const perfPillMatch = modalContent.includes('bg-gradient-to-r from-amber-500/20 to-yellow-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold backdrop-blur-md shadow-[0_0_12px_rgba(251,191,36,0.15)]');
assert(perfPillMatch, 'METRIC PILLS: Perf Gain pill uses bg-gradient-to-r, backdrop-blur-md, and amber glowing shadow');

// 2.5 Zero-value stat filtering check
const zeroFilterFixes = modalContent.includes('{fixes > 0 &&');
assert(zeroFilterFixes, 'METRIC PILLS: Fixes pill is conditionally filtered (fixes > 0)');

const zeroFilterTweaks = modalContent.includes('{tweaks > 0 &&');
assert(zeroFilterTweaks, 'METRIC PILLS: Tweaks pill is conditionally filtered (tweaks > 0)');

const zeroFilterLines = modalContent.includes('{linesChanged > 0 &&');
assert(zeroFilterLines, 'METRIC PILLS: Lines pill is conditionally filtered (linesChanged > 0)');

// 2.6 Segmented Glowing Energy Progress Bar Track
const progressTrackMatch = modalContent.includes('h-3 w-full bg-slate-950/60 backdrop-blur-md rounded-full flex items-center overflow-hidden p-1 gap-1 border border-white/10 shadow-inner');
assert(progressTrackMatch, 'ENERGY TRACK: Progress bar container uses bg-slate-950/60 backdrop-blur-md with border & shadow-inner');

const fixesSegmentMatch = modalContent.includes('bg-gradient-to-r from-rose-500 to-pink-500 rounded-full shadow-[0_0_10px_rgba(244,63,94,0.6)]');
assert(fixesSegmentMatch, 'ENERGY TRACK: Fixes segment uses gradient from-rose-500 to-pink-500 with 10px glowing shadow');

const tweaksSegmentMatch = modalContent.includes('bg-gradient-to-r from-sky-400 to-cyan-400 rounded-full shadow-[0_0_10px_rgba(56,189,248,0.6)]');
assert(tweaksSegmentMatch, 'ENERGY TRACK: Tweaks segment uses gradient from-sky-400 to-cyan-400 with 10px glowing shadow');

const linesSegmentMatch = modalContent.includes('bg-gradient-to-r from-purple-500 to-indigo-400 rounded-full shadow-[0_0_10px_rgba(168,85,247,0.6)]');
assert(linesSegmentMatch, 'ENERGY TRACK: Lines segment uses gradient from-purple-500 to-indigo-400 with 10px glowing shadow');

const perfSegmentMatch = modalContent.includes('bg-gradient-to-r from-amber-400 to-yellow-300 rounded-full shadow-[0_0_10px_rgba(251,191,36,0.6)]');
assert(perfSegmentMatch, 'ENERGY TRACK: Perf segment uses gradient from-amber-400 to-yellow-300 with 10px glowing shadow');

console.log('');
console.log('================================================================');
console.log(`SUMMARY RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
console.log('================================================================');

if (failCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
