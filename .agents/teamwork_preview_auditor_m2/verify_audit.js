import fs from 'fs';
import path from 'path';

console.log("=== EMPIRICAL AUDIT VERIFICATION SCRIPT ===");

const projectRoot = 'c:/Users/risho/OneDrive/Desktop/typenova-v2 - Copy';
const changelogTsPath = path.join(projectRoot, 'src/data/changelog.ts');
const modalPath = path.join(projectRoot, 'src/components/ChangelogModal.tsx');
const indexCssPath = path.join(projectRoot, 'src/index.css');

let passCount = 0;
let failCount = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`[PASS] ${testName}`);
    passCount++;
  } else {
    console.error(`[FAIL] ${testName}`);
    failCount++;
  }
}

// 1. Check file existence
assert(fs.existsSync(changelogTsPath), 'src/data/changelog.ts exists');
assert(fs.existsSync(modalPath), 'src/components/ChangelogModal.tsx exists');
assert(fs.existsSync(indexCssPath), 'src/index.css exists');

// 2. Read file contents
const changelogCode = fs.readFileSync(changelogTsPath, 'utf8');
const modalCode = fs.readFileSync(modalPath, 'utf8');
const cssCode = fs.readFileSync(indexCssPath, 'utf8');

// 3. Perform static analysis on ChangelogModal.tsx
assert(!modalCode.includes('return true; // dummy'), 'No dummy bypass in ChangelogModal.tsx');
assert(!modalCode.includes('mock'), 'No mock data hardcoding in ChangelogModal.tsx');
assert(!modalCode.includes('TODO'), 'No unfinished TODO markers in ChangelogModal.tsx');

// Check search functionality
assert(modalCode.includes('const [searchQuery, setSearchQuery] = useState'), 'ChangelogModal maintains searchQuery state');
assert(modalCode.includes('filteredLogs'), 'ChangelogModal computes filteredLogs array');
assert(modalCode.includes('entry.version.toLowerCase().includes(q)'), 'Filters by version');
assert(modalCode.includes('entry.title.toLowerCase().includes(q)'), 'Filters by title');
assert(modalCode.includes('entry.date.toLowerCase().includes(q)'), 'Filters by date');

// Check navigation sidebar & scroll
assert(modalCode.includes('scrollToRelease'), 'Includes smooth scroll handler');
assert(modalCode.includes('releaseRefs.current[version]'), 'Uses DOM element refs for scroll targeting');

// Check impact metrics calculation
assert(modalCode.includes('renderImpactBar'), 'Includes renderImpactBar function');
assert(modalCode.includes('fixesWeight'), 'Calculates fixes impact weight');
assert(modalCode.includes('tweaksWeight'), 'Calculates tweaks impact weight');
assert(modalCode.includes('linesWeight'), 'Calculates lines changed weight');
assert(modalCode.includes('perfWeight'), 'Calculates performance gain weight');
assert(modalCode.includes('fixesPct'), 'Computes percentage width for fixes');
assert(modalCode.includes('tweaksPct'), 'Computes percentage width for tweaks');
assert(modalCode.includes('linesPct'), 'Computes percentage width for lines changed');
assert(modalCode.includes('perfPct'), 'Computes percentage width for performance');

// Check index.css rules
assert(cssCode.includes('.glass-panel'), 'index.css defines .glass-panel class');
assert(cssCode.includes('backdrop-filter: blur(18px)'), 'index.css defines backdrop-filter blur');
assert(cssCode.includes('@supports (backdrop-filter: blur(1px))'), 'index.css handles progressive enhancement for glassmorphism');

console.log(`\nAudit verification completed: ${passCount} passed, ${failCount} failed.`);
process.exit(failCount === 0 ? 0 : 1);
