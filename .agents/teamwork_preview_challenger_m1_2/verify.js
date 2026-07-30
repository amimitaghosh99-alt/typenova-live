import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const targetPath = path.resolve(__dirname, '../../src/components/ChangelogModal.tsx');
const content = fs.readFileSync(targetPath, 'utf8');

const results = [];

function test(name, pass, detail) {
  results.push({ name, pass, detail });
}

// 1. Zero backdrop-blur-* classes in src/components/ChangelogModal.tsx
const backdropBlurMatches = content.match(/backdrop-blur-[a-zA-Z0-9_-]+/g) || [];
test(
  'Zero backdrop-blur-* classes in ChangelogModal.tsx',
  backdropBlurMatches.length === 0,
  backdropBlurMatches.length === 0 ? 'No backdrop-blur-* classes found' : `Found: ${backdropBlurMatches.join(', ')}`
);

// 2. .glass-panel class is present on the outer modal container
// Looking for outer modal container class string containing glass-panel
const outerModalRegex = /className="[^"]*glass-panel[^"]*lucid-scale[^"]*"/;
const glassPanelPresent = content.includes('glass-panel') && outerModalRegex.test(content);
test(
  '.glass-panel class present on outer modal container',
  glassPanelPresent,
  glassPanelPresent ? 'outer modal container uses glass-panel class' : 'glass-panel missing from outer container'
);

// 3. lucid-scale entrance animation class is present on the outer modal container
const lucidScalePresent = content.includes('lucid-scale') && outerModalRegex.test(content);
test(
  'lucid-scale entrance animation class present on outer modal container',
  lucidScalePresent,
  lucidScalePresent ? 'outer modal container uses lucid-scale class' : 'lucid-scale missing from outer container'
);

// 4. Zero font-sans classes in ChangelogModal.tsx
const fontSansMatches = content.match(/\bfont-sans\b/g) || [];
test(
  'Zero font-sans classes in ChangelogModal.tsx',
  fontSansMatches.length === 0,
  fontSansMatches.length === 0 ? 'No font-sans classes found' : `Found ${fontSansMatches.length} font-sans occurrences`
);

// 5. Zero searchQuery, search input, or search filter logic in ChangelogModal.tsx
const searchQueryPresent = content.includes('searchQuery');
const searchInputPresent = /<input[^>]*type=["']search["']|placeholder=["'][^"']*search/i.test(content);
const searchFilterLogic = /filter\s*\(\s*\(?[a-zA-Z0-9_]+\)?\s*=>\s*.*search/i.test(content);
const searchClean = !searchQueryPresent && !searchInputPresent && !searchFilterLogic;
test(
  'Zero searchQuery, search input, or search filter logic in ChangelogModal.tsx',
  searchClean,
  searchClean ? 'No search state, input, or search filtering found' : `Search logic found (searchQuery: ${searchQueryPresent}, input: ${searchInputPresent}, filter: ${searchFilterLogic})`
);

// 6. Sidebar width is w-36
const sidebarRegex = /<div\s+className="[^"]*w-36[^"]*">[\s\S]*?Releases[\s\S]*?<\/div>/;
const sidebarWidthW36 = content.includes('w-36') && /className="[^"]*hidden md:flex flex-col w-36/.test(content);
test(
  'Sidebar width is w-36',
  sidebarWidthW36,
  sidebarWidthW36 ? 'Sidebar element specifies w-36' : 'Sidebar width w-36 not found'
);

// 7. Dense change items use divide-y divide-white/5 single list container
const denseListRegex = /className="[^"]*divide-y\s+divide-white\/5[^"]*"/;
const denseListPresent = denseListRegex.test(content);
test(
  'Dense change items use divide-y divide-white/5 single list container',
  denseListPresent,
  denseListPresent ? 'Change items container has divide-y divide-white/5' : 'divide-y divide-white/5 container missing'
);

console.log('=== EMPIRICAL VERIFICATION RESULTS ===');
let allPassed = true;
for (const r of results) {
  const status = r.pass ? '[PASS]' : '[FAIL]';
  if (!r.pass) allPassed = false;
  console.log(`${status} ${r.name}`);
  console.log(`       Detail: ${r.detail}`);
}

console.log(`\nOVERALL: ${allPassed ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`);
process.exit(allPassed ? 0 : 1);
