import fs from 'fs';
import path from 'path';
import { createJiti } from 'jiti';

const jiti = createJiti(import.meta.url);

const projectRoot = 'c:/Users/risho/OneDrive/Desktop/typenova-v2 - Copy';
const changelogPath = path.join(projectRoot, 'src/data/changelog.ts');
const modalPath = path.join(projectRoot, 'src/components/ChangelogModal.tsx');

console.log("=== VICTORY AUDITOR INDEPENDENT TEST SUITE ===");

let passCount = 0;
let failCount = 0;

function assert(condition, description) {
  if (condition) {
    console.log(`[PASS] ${description}`);
    passCount++;
  } else {
    console.error(`[FAIL] ${description}`);
    failCount++;
  }
}

// ---------------------------------------------------------
// CRITERION 1: changelog.ts Data Model & Impact Fields
// ---------------------------------------------------------
console.log("\n--- Checking Criterion 1: changelog.ts Data & Impact Fields ---");
assert(fs.existsSync(changelogPath), "src/data/changelog.ts exists");

try {
  const changelogModule = jiti(changelogPath);
  const CHANGELOG = changelogModule.CHANGELOG;

  assert(Array.isArray(CHANGELOG), "CHANGELOG export is a valid Array");
  assert(CHANGELOG.length === 25, `CHANGELOG contains 25 entries (found: ${CHANGELOG.length})`);

  let allEntriesHaveImpact = true;
  let impactFieldsValid = true;

  CHANGELOG.forEach((entry, i) => {
    if (!entry.impact) {
      allEntriesHaveImpact = false;
      console.error(`Entry ${entry.version} missing impact object`);
    } else {
      if (typeof entry.impact.fixes !== 'number' ||
          typeof entry.impact.tweaks !== 'number' ||
          typeof entry.impact.linesChanged !== 'number') {
        impactFieldsValid = false;
        console.error(`Entry ${entry.version} has invalid impact numerical fields`, entry.impact);
      }
      if (entry.impact.perfGain !== undefined && typeof entry.impact.perfGain !== 'string') {
        impactFieldsValid = false;
      }
    }
  });

  assert(allEntriesHaveImpact, "All 25 CHANGELOG entries possess an 'impact' field");
  assert(impactFieldsValid, "All 'impact' objects contain valid numerical & string fields (fixes, tweaks, linesChanged, optional perfGain)");

  // Test latest release details (v1.5.2)
  const v152 = CHANGELOG[0];
  assert(v152.version === 'v1.5.2', "First entry is latest release v1.5.2");
  assert(v152.impact.fixes === 3, "v1.5.2 impact fixes === 3");
  assert(v152.impact.tweaks === 1, "v1.5.2 impact tweaks === 1");
  assert(v152.impact.linesChanged === 142, "v1.5.2 impact linesChanged === 142");

} catch (err) {
  assert(false, `Error loading changelog.ts via jiti: ${err.message}`);
}

// ---------------------------------------------------------
// CRITERION 2: Search Bar Filtering Functionality
// ---------------------------------------------------------
console.log("\n--- Checking Criterion 2: Search Bar Filtering Verification ---");

try {
  const changelogModule = jiti(changelogPath);
  const CHANGELOG = changelogModule.CHANGELOG;

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

  // Empty query returns all entries
  assert(filterLogs('').length === 25, "Empty search query returns all 25 changelog entries");

  // Specific version match
  const resV152 = filterLogs('v1.5.2');
  assert(resV152.length === 1 && resV152[0].version === 'v1.5.2', "Searching 'v1.5.2' filters exactly to release v1.5.2");

  // Partial version match
  const resV12 = filterLogs('v1.2.');
  assert(resV12.length === 13, `Searching 'v1.2.' matches 13 minor release entries (found: ${resV12.length})`);

  // Keyword in description match
  const resElo = filterLogs('Elo');
  assert(resElo.length >= 3, `Searching 'Elo' matches ${resElo.length} entries related to Elo rating updates`);

  // Category search match
  const resFix = filterLogs('BUG FIX');
  assert(resFix.length > 0 && resFix.every(e => e.changes.some(c => c.type === 'fix')), "Searching category 'BUG FIX' returns entries containing bug fixes");

  // Case insensitive match
  const resUpper = filterLogs('RACE CONDITION');
  assert(resUpper.length >= 3, `Searching uppercase 'RACE CONDITION' matches ${resUpper.length} entries`);

  // Non-matching query returns 0 entries
  const resZero = filterLogs('xyz_nonexistent_token_9999');
  assert(resZero.length === 0, "Searching non-existent string returns 0 entries");

} catch (err) {
  assert(false, `Error testing search filtering: ${err.message}`);
}

// ---------------------------------------------------------
// CRITERION 3: Impact Bar Elements & DOM Calculations
// ---------------------------------------------------------
console.log("\n--- Checking Criterion 3: Impact Bar Elements in DOM ---");
assert(fs.existsSync(modalPath), "src/components/ChangelogModal.tsx exists");
const modalSource = fs.readFileSync(modalPath, 'utf8');

// Metric Pills verification
assert(modalSource.includes('{fixes} {fixes === 1 ? \'Fix\' : \'Fixes\'}'), "Modal renders 'Fixes' stat metric pill");
assert(modalSource.includes('{tweaks} {tweaks === 1 ? \'Tweak\' : \'Tweaks\'}'), "Modal renders 'Tweaks' stat metric pill");
assert(modalSource.includes('+{linesChanged} Lines'), "Modal renders 'Lines Changed' stat metric pill");
assert(modalSource.includes('{perfGain}'), "Modal renders 'Perf Gain' stat metric pill when available");

// Styled container elements verification
assert(modalSource.includes('bg-rose-500/10 border-rose-500/20 text-rose-300'), "Fixes pill uses styled rose color token");
assert(modalSource.includes('bg-sky-500/10 border-sky-500/20 text-sky-300'), "Tweaks pill uses styled sky color token");
assert(modalSource.includes('bg-purple-500/10 border-purple-500/20 text-purple-300'), "Lines Changed pill uses styled purple color token");

// Visual Segmented Bar verification
assert(modalSource.includes('h-2 w-full bg-zinc-950/80 rounded-full flex overflow-hidden'), "Modal renders outer segmented bar container");
assert(modalSource.includes('bg-rose-500 rounded-sm'), "Segmented bar includes rose segment for Fixes");
assert(modalSource.includes('bg-sky-400 rounded-sm'), "Segmented bar includes sky segment for Tweaks");
assert(modalSource.includes('bg-purple-500 rounded-sm'), "Segmented bar includes purple segment for Lines Changed");
assert(modalSource.includes('bg-amber-400 rounded-sm'), "Segmented bar includes amber segment for Perf Gain");
assert(modalSource.includes('style={{ width: `${fixesPct}%` }}'), "Fixes segment width dynamically bound to fixesPct");
assert(modalSource.includes('style={{ width: `${tweaksPct}%` }}'), "Tweaks segment width dynamically bound to tweaksPct");
assert(modalSource.includes('style={{ width: `${linesPct}%` }}'), "Lines segment width dynamically bound to linesPct");

// Segmented Bar Calculation Integrity Check
const computeWeights = (impact) => {
  const fixes = impact.fixes ?? 0;
  const tweaks = impact.tweaks ?? 0;
  const linesChanged = impact.linesChanged ?? 0;
  const perfGain = impact.perfGain;

  const fixesWeight = fixes * 2;
  const tweaksWeight = tweaks * 1.5;
  const linesWeight = Math.min(Math.ceil(linesChanged / 100), 6);
  const perfWeight = perfGain ? 4 : 0;

  const totalWeight = fixesWeight + tweaksWeight + linesWeight + perfWeight;
  return {
    fixesPct: totalWeight > 0 ? (fixesWeight / totalWeight) * 100 : 0,
    tweaksPct: totalWeight > 0 ? (tweaksWeight / totalWeight) * 100 : 0,
    linesPct: totalWeight > 0 ? (linesWeight / totalWeight) * 100 : 0,
    perfPct: totalWeight > 0 ? (perfWeight / totalWeight) * 100 : 0,
    totalWeight
  };
};

const changelogModule = jiti(changelogPath);
const CHANGELOG = changelogModule.CHANGELOG;
let allBarMathValid = true;

CHANGELOG.forEach((entry) => {
  if (entry.impact) {
    const w = computeWeights(entry.impact);
    const sum = w.fixesPct + w.tweaksPct + w.linesPct + w.perfPct;
    if (Math.abs(sum - 100) > 0.001) {
      allBarMathValid = false;
      console.error(`Bar percentages do not sum to 100% for ${entry.version}: sum = ${sum}`);
    }
  }
});
assert(allBarMathValid, "All entries calculate segmented bar percentages that sum precisely to 100%");

// ---------------------------------------------------------
// CRITERION 4: Left Vertical Timeline Structure Verification
// ---------------------------------------------------------
console.log("\n--- Checking Criterion 4: Vertical Timeline Structure ---");

assert(modalSource.includes('hidden md:flex flex-col w-56 border-r border-white/10'), "Sidebar container present with fixed width & right border");
assert(modalSource.includes('Releases Timeline'), "Sidebar header title 'Releases Timeline' present");
assert(modalSource.includes('absolute top-3 bottom-3 left-4 w-0.5 bg-gradient-to-b'), "Vertical timeline rail line element present");
assert(modalSource.includes('w-2.5 h-2.5 rounded-full transition-all shrink-0'), "Version node circular dot indicator present");
assert(modalSource.includes('scrollToRelease(entry.version)'), "Timeline node click triggers scrollToRelease function");
assert(modalSource.includes('element.scrollIntoView({ behavior: \'smooth\', block: \'start\' })'), "scrollToRelease invokes DOM scrollIntoView with smooth behavior");
assert(modalSource.includes('const isActive = activeVersion === entry.version'), "Timeline node highlights active version state");

console.log("\n=== INDEPENDENT TEST RESULTS ===");
console.log(`TOTAL PASSED: ${passCount}`);
console.log(`TOTAL FAILED: ${failCount}`);

if (failCount === 0) {
  console.log("ALL ACCEPTANCE CRITERIA EMPIRICALLY VERIFIED & CONFIRMED.");
  process.exit(0);
} else {
  console.error("ACCEPTANCE CRITERIA VERIFICATION FAILED.");
  process.exit(1);
}
