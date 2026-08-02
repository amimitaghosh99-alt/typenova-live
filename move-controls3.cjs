const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf-8');

const startStr = '            {/* Theme & Sound */}\n            <div className="flex glass-panel rounded-full p-1 items-center relative z-50 shrink-0">';
const endStr = '              onSignOut={() => { void auth.signOut(); }}\n            />';

let startIdx = content.indexOf(startStr);
if (startIdx === -1) throw new Error('start not found');

let endIdx = content.indexOf(endStr);
if (endIdx === -1) throw new Error('end not found');
endIdx += endStr.length;

let extracted = content.substring(startIdx, endIdx);

// Remove the extracted text, keeping the blank lines clean
content = content.substring(0, startIdx).trimEnd() + '\n          </div>\n        </header>\n\n        <main' + content.substring(endIdx).split('</header>\n\n        <main')[1];

// Reformat the extracted block
extracted = extracted.replace('relative z-50 shrink-0', 'relative shadow-xl backdrop-blur-md');
// Adjust the indentation of the extracted block to fit the new location (decrease by 2 spaces since it goes from 12 to 10 spaces nested? Wait, new container is at 8 spaces, children should be 10. Previous was 12 spaces. So substring(2).)
extracted = extracted.split('\n').map(line => line.length > 2 ? line.substring(2) : line).join('\n');

const newFloatingBlock = `      {/* Floating Bottom-Right Controls */}
      {!shouldHideClutter && (
        <div className="fixed bottom-6 right-6 z-[100] flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
${extracted}
        </div>
      )}`;

const insertTarget = '      {/* Floating Bottom-Left Version/Changelog Badge */}';
content = content.replace(insertTarget, newFloatingBlock + '\n\n' + insertTarget);

fs.writeFileSync('src/App.tsx', content, 'utf-8');
console.log('Success');
