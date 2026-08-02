const fs = require('fs');
const content = fs.readFileSync('src/App.tsx', 'utf-8');
const lines = content.split(/\r?\n/);

const startIndex = 1615;
const endIndex = 1701; 

const removedLines = lines.slice(startIndex, endIndex);
lines.splice(startIndex, endIndex - startIndex);

// We need to add the closing div that we accidentally deleted along with the block (which closed Profile & Actions container at 1506)
// Wait, I already fixed that in the previous commit `e763f5a`? NO, my manual fix was on my local repo which was overwritten by checkout?
// Wait, `git checkout src/App.tsx` restored the file from HEAD (commit e763f5a).
// In commit e763f5a, the header has 5 closing divs at the end.
// Let's just insert a closing div manually.
lines.splice(startIndex, 0, '            </div>');

let extracted = removedLines.join('\n');
extracted = extracted.replace('relative z-50 shrink-0', 'relative shadow-xl backdrop-blur-md');

const extractedLines = extracted.split('\n').map(line => line.startsWith('  ') ? line.substring(2) : line);
const extractedStr = extractedLines.join('\n');

const newBlock = `      {/* Floating Bottom-Right Controls */}
      {!shouldHideClutter && (
        <div className="fixed bottom-6 right-6 z-[100] flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
@@EXTRACTED@@
        </div>
      )}\n`;

const insertTarget = '      {/* Floating Bottom-Left Version/Changelog Badge */}';
let insertIndex = lines.findIndex(line => line.includes(insertTarget));

const blockLines = newBlock.replace('@@EXTRACTED@@', extractedStr).split('\n');

lines.splice(insertIndex, 0, ...blockLines);

fs.writeFileSync('src/App.tsx', lines.join('\n'), 'utf-8');
console.log('Success');
