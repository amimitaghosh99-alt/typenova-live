const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf-8');

let startIdx = content.indexOf('{/* Theme & Sound */}');
let endIdx = content.indexOf('onSignOut={() => { void auth.signOut(); }}');
endIdx = content.indexOf('/>', endIdx) + 2;

let extracted = content.substring(startIdx, endIdx);

// Remove the extracted text
let before = content.substring(0, startIdx);
let after = content.substring(endIdx);

// Note: there are a bunch of </div> between the removed block and the end of the header.
// Let's just find the `</header>` tag and remove the blank space before it.
let headerEnd = after.indexOf('</header>');
let spaceBeforeHeaderEnd = after.substring(0, headerEnd);
let cleanedSpace = spaceBeforeHeaderEnd.replace(/[\s\r\n]+$/, '\n        ');
after = cleanedSpace + after.substring(headerEnd);

content = before.trimEnd() + '\n          </div>\n' + after.substring(after.indexOf('</header>'));

// Reformat the extracted block
extracted = extracted.replace('relative z-50 shrink-0', 'relative shadow-xl backdrop-blur-md');
extracted = extracted.split('\n').map(line => line.startsWith('  ') ? line.substring(2) : line).join('\n');

const newFloatingBlock = `      {/* Floating Bottom-Right Controls */}
      {!shouldHideClutter && (
        <div className="fixed bottom-6 right-6 z-[100] flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
          \${extracted}
        </div>
      )}`;

const insertTarget = '      {/* Floating Bottom-Left Version/Changelog Badge */}';
content = content.replace(insertTarget, newFloatingBlock + '\n\n' + insertTarget);

fs.writeFileSync('src/App.tsx', content, 'utf-8');
console.log('Success');
