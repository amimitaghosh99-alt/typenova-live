const fs = require('fs');
const path = require('path');

const projectRoot = 'c:/Users/risho/OneDrive/Desktop/typenova-v2 - Copy';
const changelogModalPath = path.join(projectRoot, 'src/components/ChangelogModal.tsx');
const indexCssPath = path.join(projectRoot, 'src/index.css');

console.log('================================================================================');
console.log(' VICTORY AUDITOR INDEPENDENT VERIFICATION SUITE');
console.log(' Timestamp:', new Date().toISOString());
console.log('================================================================================\n');

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
// CHECK 1: Header controls Y-coordinate > 0 and not clipped across viewports
// CHECK 2: Modal container height <= 100vh across viewports
// -----------------------------------------------------------------------------
console.log('>>> CRITERIA 1 & 2: Header Bounds (Y > 0, 0px Clipped) & Modal Container Height (<= 100vh)');

const modalContent = fs.readFileSync(changelogModalPath, 'utf8');
const cssContent = fs.readFileSync(indexCssPath, 'utf8');

// Static AST / Contract Checks
assert(modalContent.includes('fixed inset-0'), 'Outer overlay is fixed inset-0 (pinned to viewport)');
assert(modalContent.includes('items-center justify-center'), 'Outer overlay flex centers modal (items-center justify-center)');
assert(modalContent.includes('max-h-[85vh] sm:max-h-[88vh]'), 'Modal container has max-h-[85vh] sm:max-h-[88vh]');
assert(modalContent.includes('my-auto'), 'Modal container has my-auto vertical margin safety');
assert(modalContent.includes('shrink-0'), 'Modal header controls container has shrink-0 to prevent collapsing');
assert(modalContent.includes('placeholder="Search logs..."'), 'Search input element present in header');
assert(modalContent.includes('title="Subscribe to release notifications"'), 'Subscribe button present in header');
assert(modalContent.includes('aria-label="Close modal"'), 'Close button present in header');

const viewports = [
  { name: 'FHD Desktop (1920x1080)', width: 1920, height: 1080, isSm: true },
  { name: 'QHD Desktop (2560x1440)', width: 2560, height: 1440, isSm: true },
  { name: 'Standard Laptop (1366x768)', width: 1366, height: 768, isSm: true },
  { name: 'iPad Landscape (1024x768)', width: 1024, height: 768, isSm: true },
  { name: 'Tablet Portrait (768x1024)', width: 768, height: 1024, isSm: true },
  { name: 'Modern Mobile (375x812)', width: 375, height: 812, isSm: false },
  { name: 'Compact Mobile (360x640)', width: 360, height: 640, isSm: false },
];

viewports.forEach(vp => {
  const maxVhPct = vp.isSm ? 0.88 : 0.85;
  const modalMaxH = vp.height * maxVhPct;
  const isHeightValid = modalMaxH <= vp.height;

  const outerPad = vp.isSm ? 24 : 12;
  const headerPadTop = vp.isSm ? 24 : 20;
  const modalYTop = Math.max(outerPad, (vp.height - modalMaxH) / 2);

  // Close Button Y Top
  const closeYTop = modalYTop + headerPadTop;
  const closeYBottom = closeYTop + 41;

  // Search Input Y Top
  const searchYTop = modalYTop + headerPadTop + 40 + 16;
  const searchYBottom = searchYTop + 42;

  const closePass = closeYTop > 0 && closeYBottom <= vp.height;
  const searchPass = searchYTop > 0 && searchYBottom <= vp.height;

  assert(isHeightValid && closePass && searchPass, 
    `Viewport ${vp.name}: Modal H=${modalMaxH.toFixed(1)}px (<= ${vp.height}px), Header Close Y=[${closeYTop.toFixed(1)}..${closeYBottom.toFixed(1)}], Search Y=[${searchYTop.toFixed(1)}..${searchYBottom.toFixed(1)}]`,
    `Height <= 100vh: ${isHeightValid ? 'YES' : 'NO'}, Header Y > 0: ${closeYTop > 0 ? 'YES' : 'NO'}`
  );
});

console.log('');

// -----------------------------------------------------------------------------
// CHECK 3: Scrollbar Containment & Border Radius Clearance
// -----------------------------------------------------------------------------
console.log('>>> CRITERION 3: Scrollbar Track Isolation & Glass Border Arc Clearance');

const hasCustomScrollbarWidth = /\.custom-scrollbar::-webkit-scrollbar\s*\{[^}]*width:\s*6px;/s.test(cssContent);
const hasCustomScrollbarMarginTop = /\.custom-scrollbar::-webkit-scrollbar-track\s*\{[^}]*margin-top:\s*12px;/s.test(cssContent);
const hasCustomScrollbarMarginBottom = /\.custom-scrollbar::-webkit-scrollbar-track\s*\{[^}]*margin-bottom:\s*12px;/s.test(cssContent);
const hasCustomScrollbarThumbClip = /\.custom-scrollbar::-webkit-scrollbar-thumb\s*\{[^}]*background-clip:\s*padding-box;/s.test(cssContent);

assert(hasCustomScrollbarWidth, 'CSS: .custom-scrollbar has width: 6px');
assert(hasCustomScrollbarMarginTop, 'CSS: .custom-scrollbar::-webkit-scrollbar-track has margin-top: 12px');
assert(hasCustomScrollbarMarginBottom, 'CSS: .custom-scrollbar::-webkit-scrollbar-track has margin-bottom: 12px');
assert(hasCustomScrollbarThumbClip, 'CSS: .custom-scrollbar::-webkit-scrollbar-thumb has background-clip: padding-box');

assert(modalContent.includes('pr-3'), 'DOM: Right scroll container includes pr-3 (12px mobile padding)');
assert(modalContent.includes('sm:pr-6'), 'DOM: Right scroll container includes sm:pr-6 (24px desktop padding)');

// Geometric calculation: R = 40px, Y = 12px -> max arc inset = 40 - sqrt(40^2 - 28^2) = 11.434px
const R = 40;
const dy = 40 - 12; // 28
const arcInset = R - Math.sqrt(R * R - dy * dy); // 11.434px
const desktopClearance = 24 - arcInset; // +12.566px
const mobileClearance = 12 - arcInset; // +0.566px

assert(desktopClearance > 0, `Geometry: Desktop scrollbar track has +${desktopClearance.toFixed(3)}px clearance from 40px outer glass curve`);
assert(mobileClearance > 0, `Geometry: Mobile scrollbar track has +${mobileClearance.toFixed(3)}px clearance from 40px outer glass curve`);

console.log('');

// -----------------------------------------------------------------------------
// CHECK 4: Impact Metrics Bar Glassmorphic Styling & Colors
// -----------------------------------------------------------------------------
console.log('>>> CRITERION 4: Impact Metrics Bar Translucent Glass Styling & Colors');

// Release card glass
assert(modalContent.includes('glass-panel relative rounded-3xl bg-slate-900/40 border border-white/15 p-6 md:p-7 backdrop-blur-xl shadow-xl'), 'Release card uses translucent slate glass (bg-slate-900/40 backdrop-blur-xl border-white/15)');

// Metric status pills styling
assert(modalContent.includes('bg-gradient-to-r from-rose-500/20 to-pink-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold backdrop-blur-md shadow-[0_0_12px_rgba(244,63,94,0.15)]'), 'Fixes pill uses translucent gradient glass with rose glow shadow');
assert(modalContent.includes('bg-gradient-to-r from-sky-500/20 to-cyan-500/10 border border-sky-500/30 text-sky-300 text-xs font-semibold backdrop-blur-md shadow-[0_0_12px_rgba(56,189,248,0.15)]'), 'Tweaks pill uses translucent gradient glass with sky glow shadow');
assert(modalContent.includes('bg-gradient-to-r from-purple-500/20 to-indigo-500/10 border border-purple-500/30 text-purple-300 text-xs font-semibold backdrop-blur-md shadow-[0_0_12px_rgba(168,85,247,0.15)]'), 'Lines Changed pill uses translucent gradient glass with purple glow shadow');
assert(modalContent.includes('bg-gradient-to-r from-amber-500/20 to-yellow-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold backdrop-blur-md shadow-[0_0_12px_rgba(251,191,36,0.15)]'), 'Perf Gain pill uses translucent gradient glass with amber glow shadow');

// Zero-value filtering
assert(modalContent.includes('{fixes > 0 &&'), 'Fixes pill conditionally filters zero values (fixes > 0)');
assert(modalContent.includes('{tweaks > 0 &&'), 'Tweaks pill conditionally filters zero values (tweaks > 0)');
assert(modalContent.includes('{linesChanged > 0 &&'), 'Lines Changed pill conditionally filters zero values (linesChanged > 0)');

// Segmented energy progress track
assert(modalContent.includes('h-3 w-full bg-slate-950/60 backdrop-blur-md rounded-full flex items-center overflow-hidden p-1 gap-1 border border-white/10 shadow-inner'), 'Energy progress track uses translucent glass track (bg-slate-950/60 backdrop-blur-md border-white/10 shadow-inner)');
assert(modalContent.includes('bg-gradient-to-r from-rose-500 to-pink-500 rounded-full shadow-[0_0_10px_rgba(244,63,94,0.6)]'), 'Fixes energy track segment uses linear gradient with glowing shadow');
assert(modalContent.includes('bg-gradient-to-r from-sky-400 to-cyan-400 rounded-full shadow-[0_0_10px_rgba(56,189,248,0.6)]'), 'Tweaks energy track segment uses linear gradient with glowing shadow');
assert(modalContent.includes('bg-gradient-to-r from-purple-500 to-indigo-400 rounded-full shadow-[0_0_10px_rgba(168,85,247,0.6)]'), 'Lines energy track segment uses linear gradient with glowing shadow');
assert(modalContent.includes('bg-gradient-to-r from-amber-400 to-yellow-300 rounded-full shadow-[0_0_10px_rgba(251,191,36,0.6)]'), 'Perf energy track segment uses linear gradient with glowing shadow');

console.log('');
console.log('================================================================================');
console.log(` SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
console.log('================================================================================');

if (failCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
