const fs = require('fs');
const content = fs.readFileSync('src/App.tsx', 'utf-8');
const lines = content.split(/\r?\n/);

let themeLines = lines.slice(1616, 1687);
let accountLines = lines.slice(1689, 1701);

// Remove in reverse order
lines.splice(1689, 1701 - 1689);
lines.splice(1616, 1687 - 1616);

let themeExtracted = themeLines.join('\n');
themeExtracted = themeExtracted.replace('relative z-50 shrink-0', 'relative shadow-xl backdrop-blur-md');

const themeCode = themeExtracted.split('\n').map(l => l.startsWith('  ') ? l.substring(2) : l).join('\n');
const accountCode = accountLines.join('\n').split('\n').map(l => l.startsWith('  ') ? l.substring(2) : l).join('\n');

const newFloatingBlock = `      {/* Floating Bottom-Right Controls */}
      {!shouldHideClutter && (
        <div className="fixed bottom-6 right-6 z-[100] flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
` + themeCode + `\n` + accountCode + `
        </div>
      )}\n`;

const insertTarget = '      {/* Floating Bottom-Left Version/Changelog Badge */}';
const insertIndex = lines.findIndex(line => line.includes(insertTarget));

lines.splice(insertIndex, 0, ...newFloatingBlock.split('\n'));

fs.writeFileSync('src/App.tsx', lines.join('\n'), 'utf-8');
console.log('Success!');
