import fs from 'fs';
import path from 'path';

const projectRoot = path.resolve(process.cwd());
const changelogModalPath = path.join(projectRoot, 'src', 'components', 'ChangelogModal.tsx');
const indexCssPath = path.join(projectRoot, 'src', 'index.css');

console.log('=== EMPIRICAL VERIFICATION SCRIPT ===');
console.log('Checking file paths:');
console.log('ChangelogModal:', changelogModalPath);
console.log('index.css:', indexCssPath);

const changelogContent = fs.readFileSync(changelogModalPath, 'utf8');
const indexCssContent = fs.readFileSync(indexCssPath, 'utf8');

const results = [];

function check(id, description, condition, details) {
  const passed = Boolean(condition);
  results.push({ id, description, passed, details });
  console.log(`[${passed ? 'PASS' : 'FAIL'}] ${id}: ${description}`);
  if (details) {
    console.log(`       Details: ${details}`);
  }
}

// 1. Zero backdrop-blur-* classes in src/components/ChangelogModal.tsx
const backdropBlurMatches = changelogContent.match(/backdrop-blur(-\w+)?/g);
check(
  'CHECK_1_BACKDROP_BLUR',
  'Zero backdrop-blur-* classes in src/components/ChangelogModal.tsx',
  !backdropBlurMatches,
  backdropBlurMatches ? `Found matches: ${backdropBlurMatches.join(', ')}` : 'No backdrop-blur-* classes found'
);

// 2. .glass-panel class is present on the outer modal container
// Finding the outer modal container div inside ChangelogModal JSX
const outerModalMatch = changelogContent.match(/<div\s+className="([^"]*glass-panel[^"]*)"/);
check(
  'CHECK_2_GLASS_PANEL',
  '.glass-panel class is present on the outer modal container',
  Boolean(outerModalMatch),
  outerModalMatch ? `Outer container className: "${outerModalMatch[1]}"` : 'Outer container does not have glass-panel class'
);

// 3. lucid-scale entrance animation class is present on the outer modal container
const outerLucidScale = outerModalMatch ? outerModalMatch[1].includes('lucid-scale') : false;
check(
  'CHECK_3_LUCID_SCALE',
  'lucid-scale entrance animation class is present on the outer modal container',
  outerLucidScale,
  outerModalMatch ? `Outer container className: "${outerModalMatch[1]}"` : 'Outer container missing lucid-scale'
);

// 4. Zero font-sans classes in ChangelogModal.tsx
const fontSansMatches = changelogContent.match(/\bfont-sans\b/g);
check(
  'CHECK_4_FONT_SANS',
  'Zero font-sans classes in ChangelogModal.tsx',
  !fontSansMatches,
  fontSansMatches ? `Found font-sans matches: ${fontSansMatches.length}` : 'Zero font-sans classes found'
);

// 5. Zero searchQuery, search input, or search filter logic in ChangelogModal.tsx
const searchQueryMatch = /searchQuery|searchFilter|\bsearch\b/i.test(changelogContent);
const searchInputMatch = /<input[^>]*type=["']search["']|<input[^>]*placeholder=["'][^"']*search/i.test(changelogContent);
check(
  'CHECK_5_SEARCH_LOGIC',
  'Zero searchQuery, search input, or search filter logic in ChangelogModal.tsx',
  !searchQueryMatch && !searchInputMatch,
  `searchQueryMatch: ${searchQueryMatch}, searchInputMatch: ${searchInputMatch}`
);

// 6. Sidebar width is w-36
const sidebarWidthMatch = changelogContent.match(/md:flex\s+flex-col\s+(w-\d+)/) || changelogContent.match(/(w-36)\s+shrink-0/);
const hasW36 = changelogContent.includes('w-36');
check(
  'CHECK_6_SIDEBAR_WIDTH',
  'Sidebar width is w-36',
  hasW36,
  sidebarWidthMatch ? `Sidebar match found: ${sidebarWidthMatch[1]}` : `has w-36: ${hasW36}`
);

// 7. Dense change items use divide-y divide-white/5 single list container
const divideYMatch = changelogContent.includes('divide-y divide-white/5');
check(
  'CHECK_7_DIVIDE_Y',
  'Dense change items use divide-y divide-white/5 single list container',
  divideYMatch,
  divideYMatch ? 'Found "divide-y divide-white/5" in ChangelogModal.tsx' : 'Missing "divide-y divide-white/5"'
);

// Additional check: verify index.css defines .glass-panel and .lucid-scale
const cssGlassPanel = indexCssContent.includes('.glass-panel');
const cssLucidScale = indexCssContent.includes('.lucid-scale');
check(
  'CHECK_CSS_DEFINITIONS',
  'src/index.css defines .glass-panel and .lucid-scale classes',
  cssGlassPanel && cssLucidScale,
  `cssGlassPanel: ${cssGlassPanel}, cssLucidScale: ${cssLucidScale}`
);

const allPassed = results.every(r => r.passed);
console.log(`\nVerification Summary: ${results.filter(r => r.passed).length}/${results.length} checks passed.`);

if (!allPassed) {
  console.error('Empirical verification failed!');
  process.exit(1);
} else {
  console.log('All empirical verification checks PASSED successfully!');
}
