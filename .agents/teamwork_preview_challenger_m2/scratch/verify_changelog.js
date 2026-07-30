import fs from 'fs';
import path from 'path';

console.log("=== STARTING EMPIRICAL VERIFICATION FOR CHANGELOG & CHANGELOG MODAL ===");

const workspaceRoot = 'c:/Users/risho/OneDrive/Desktop/typenova-v2 - Copy';
const changelogPath = path.join(workspaceRoot, 'src/data/changelog.ts');
const modalPath = path.join(workspaceRoot, 'src/components/ChangelogModal.tsx');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
  }
}

// ---------------------------------------------------------
// SECTION 1: Parsing and Validating changelog.ts
// ---------------------------------------------------------
console.log("\n--- TEST SECTION 1: changelog.ts Data Validation ---");
assert(fs.existsSync(changelogPath), "src/data/changelog.ts exists");

const changelogContent = fs.readFileSync(changelogPath, 'utf8');

// Parse entries using JS evaluation or RegExp extraction
// Extract CHANGELOG array from source code
const logArrayMatch = changelogContent.match(/export const CHANGELOG: ChangelogEntry\[\] = (\[[\s\S]*?\]);/);
assert(logArrayMatch !== null, "CHANGELOG array export found in changelog.ts");

let CHANGELOG = [];
try {
  // Convert TS code block into standard JS object evaluation safely
  let rawJsonLike = logArrayMatch[1]
    .replace(/type: '(feature|fix|perf|tweak)'/g, '"type": "$1"')
    .replace(/version:/g, '"version":')
    .replace(/date:/g, '"date":')
    .replace(/title:/g, '"title":')
    .replace(/changes:/g, '"changes":')
    .replace(/description:/g, '"description":')
    .replace(/impact:/g, '"impact":')
    .replace(/fixes:/g, '"fixes":')
    .replace(/tweaks:/g, '"tweaks":')
    .replace(/linesChanged:/g, '"linesChanged":')
    .replace(/perfGain:/g, '"perfGain":')
    .replace(/'/g, '"');
    
  // Clean trailing commas before closing brackets/braces
  rawJsonLike = rawJsonLike.replace(/,\s*([\]}])/g, '$1');
  CHANGELOG = JSON.parse(rawJsonLike);
  assert(Array.isArray(CHANGELOG), "Parsed CHANGELOG as valid JS Array");
} catch (e) {
  console.error("  Error parsing CHANGELOG array:", e.message);
  assert(false, "Parsed CHANGELOG as valid JS Array");
}

assert(CHANGELOG.length > 0, `CHANGELOG contains ${CHANGELOG.length} releases (expected > 0)`);

// Validate data structure of all entries
let allEntriesValid = true;
CHANGELOG.forEach((entry, idx) => {
  if (!entry.version || !entry.date || !entry.title || !Array.isArray(entry.changes) || !entry.impact) {
    allEntriesValid = false;
  }
  entry.changes.forEach((c) => {
    if (!['feature', 'fix', 'perf', 'tweak'].includes(c.type) || typeof c.description !== 'string') {
      allEntriesValid = false;
    }
  });
  if (typeof entry.impact.fixes !== 'number' || typeof entry.impact.tweaks !== 'number' || typeof entry.impact.linesChanged !== 'number') {
    allEntriesValid = false;
  }
});
assert(allEntriesValid, "All CHANGELOG entries conform strictly to ChangelogEntry & ImpactStats interfaces");


// ---------------------------------------------------------
// SECTION 2: Search Filtering Verification
// ---------------------------------------------------------
console.log("\n--- TEST SECTION 2: Search Filtering Logic ---");

const getLabelForType = (type) => {
  switch (type) {
    case 'feature': return 'FEATURE';
    case 'fix': return 'BUG FIX';
    case 'perf': return 'PERFORMANCE';
    case 'tweak': return 'TWEAK';
    default: return 'UPDATE';
  }
};

const filterLogs = (query) => CHANGELOG.filter((entry) => {
  if (!query.trim()) return true;
  const q = query.toLowerCase().trim();
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

// Test 2.1: Empty Search
const emptySearch = filterLogs('');
assert(emptySearch.length === CHANGELOG.length, `Empty search returns all ${CHANGELOG.length} entries`);

// Test 2.2: Exact Version Search
const versionSearch = filterLogs('v1.5.0');
assert(versionSearch.length === 1 && versionSearch[0].version === 'v1.5.0', "Search 'v1.5.0' accurately filters to single release v1.5.0");

// Test 2.3: Prefix Version Search
const v12Search = filterLogs('v1.2.');
assert(v12Search.length === 13, `Search 'v1.2.' matches 13 releases (got ${v12Search.length})`);

// Test 2.4: Keyword in Title / Description
const caretSearch = filterLogs('caret');
assert(caretSearch.length >= 3, `Search 'caret' matches ${caretSearch.length} releases containing caret updates`);

// Test 2.5: Category Label Search ('BUG FIX')
const bugFixSearch = filterLogs('BUG FIX');
assert(bugFixSearch.length > 0 && bugFixSearch.every(e => e.changes.some(c => c.type === 'fix')), "Search 'BUG FIX' matches entries containing fix changes");

// Test 2.6: Case Insensitivity Search
const upperSearch = filterLogs('SMOOTHNESS');
assert(upperSearch.length === 1 && upperSearch[0].version === 'v1.5.0', "Search 'SMOOTHNESS' case-insensitively finds v1.5.0");

// Test 2.7: Non-existent Keyword
const noMatchSearch = filterLogs('nonexistentkeyword99999');
assert(noMatchSearch.length === 0, "Search 'nonexistentkeyword99999' returns 0 results");


// ---------------------------------------------------------
// SECTION 3: Impact Metrics & Visual Bar Calculation Verification
// ---------------------------------------------------------
console.log("\n--- TEST SECTION 3: Impact Metrics & Segmented Visual Bar Logic ---");

const computeImpactWeights = (impact) => {
  if (!impact) return null;
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

  return { fixes, tweaks, linesChanged, perfGain, totalWeight, fixesPct, tweaksPct, linesPct, perfPct };
};

// Check Latest Release (v1.5.2) impact stats
const v152Impact = computeImpactWeights(CHANGELOG[0].impact);
assert(v152Impact.fixes === 3, "v1.5.2 reports 3 fixes");
assert(v152Impact.tweaks === 1, "v1.5.2 reports 1 tweak");
assert(v152Impact.linesChanged === 142, "v1.5.2 reports 142 lines changed");
assert(v152Impact.fixesPct > 0 && v152Impact.tweaksPct > 0 && v152Impact.linesPct > 0, "v1.5.2 visual impact bar calculates non-zero percentages for Fixes, Tweaks, and Lines");

const totalPctSum = v152Impact.fixesPct + v152Impact.tweaksPct + v152Impact.linesPct + v152Impact.perfPct;
assert(Math.abs(totalPctSum - 100) < 0.001, `Segmented visual impact bar percentages sum to 100% (got ${totalPctSum.toFixed(2)}%)`);

// Check v1.5.0 (Feature + Perf release)
const v150Impact = computeImpactWeights(CHANGELOG[2].impact);
assert(v150Impact.perfGain === '+45 FPS (144Hz+)', "v1.5.0 correctly has perfGain stat");
assert(v150Impact.perfPct > 0, "v1.5.0 includes perfGain segment in visual bar");


// ---------------------------------------------------------
// SECTION 4: Structural Verification of ChangelogModal.tsx
// ---------------------------------------------------------
console.log("\n--- TEST SECTION 4: ChangelogModal.tsx Component Structure ---");

assert(fs.existsSync(modalPath), "src/components/ChangelogModal.tsx exists");
const modalContent = fs.readFileSync(modalPath, 'utf8');

// 4.1 Search Filtering Input
assert(modalContent.includes('const [searchQuery, setSearchQuery] = useState'), "Contains searchQuery state hook");
assert(modalContent.includes('placeholder="Search logs..."'), "Contains search input element with placeholder");
assert(modalContent.includes('onChange={(e) => setSearchQuery(e.target.value)}'), "Search input updates searchQuery state");
assert(modalContent.includes('filteredLogs.length === 0'), "Renders empty state when no search matches found");

// 4.2 Impact Metrics Rendering (Pills)
assert(modalContent.includes('{fixes} {fixes === 1 ? \'Fix\' : \'Fixes\'}'), "Renders Fixes metric pill");
assert(modalContent.includes('{tweaks} {tweaks === 1 ? \'Tweak\' : \'Tweaks\'}'), "Renders Tweaks metric pill");
assert(modalContent.includes('+{linesChanged} Lines'), "Renders Lines Changed metric pill");
assert(modalContent.includes('bg-rose-500/10 border-rose-500/20 text-rose-300'), "Fixes pill uses styled rose theme");
assert(modalContent.includes('bg-sky-500/10 border-sky-500/20 text-sky-300'), "Tweaks pill uses styled sky theme");
assert(modalContent.includes('bg-purple-500/10 border-purple-500/20 text-purple-300'), "Lines Changed pill uses styled purple theme");

// 4.3 Segmented Visual Impact Bar
assert(modalContent.includes('h-2 w-full bg-zinc-950/80 rounded-full flex overflow-hidden'), "Segmented visual bar container present with full width and overflow hidden");
assert(modalContent.includes('bg-rose-500 rounded-sm'), "Segmented bar includes rose segment for fixes");
assert(modalContent.includes('bg-sky-400 rounded-sm'), "Segmented bar includes sky segment for tweaks");
assert(modalContent.includes('bg-purple-500 rounded-sm'), "Segmented bar includes purple segment for lines changed");
assert(modalContent.includes('bg-amber-400 rounded-sm'), "Segmented bar includes amber segment for performance");
assert(modalContent.includes('style={{ width: `${fixesPct}%` }}'), "Fixes segment dynamically scaled by fixesPct");
assert(modalContent.includes('style={{ width: `${tweaksPct}%` }}'), "Tweaks segment dynamically scaled by tweaksPct");
assert(modalContent.includes('style={{ width: `${linesPct}%` }}'), "Lines segment dynamically scaled by linesPct");

// 4.4 Vertical Timeline Sidebar
assert(modalContent.includes('hidden md:flex flex-col w-56 border-r border-white/10'), "Vertical timeline sidebar present with fixed width and right border");
assert(modalContent.includes('Releases Timeline'), "Sidebar header includes 'Releases Timeline' title");
assert(modalContent.includes('absolute top-3 bottom-3 left-4 w-0.5 bg-gradient-to-b'), "Sidebar includes vertical rail line element");
assert(modalContent.includes('w-2.5 h-2.5 rounded-full transition-all shrink-0'), "Version nodes rendered with circular dot indicator");
assert(modalContent.includes('scrollToRelease(entry.version)'), "Version node buttons call scrollToRelease on click");
assert(modalContent.includes('const isActive = activeVersion === entry.version'), "Version nodes reflect active version state");

console.log(`\n=== SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED ===`);
if (passedTests === totalTests) {
  console.log("SUCCESS: All empirical tests passed without error!");
  process.exit(0);
} else {
  console.error("FAILURE: Some verification tests failed.");
  process.exit(1);
}
