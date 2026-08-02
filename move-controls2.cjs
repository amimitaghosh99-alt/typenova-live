const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf-8');

const themeStartStr = '            {/* Theme & Sound */}\n            <div className="flex glass-panel rounded-full p-1 items-center relative z-50 shrink-0">';
const accountEndStr = '              onSignOut={() => { void auth.signOut(); }}\n            />';

let startIdx = content.indexOf(themeStartStr);
let endIdx = content.indexOf(accountEndStr) + accountEndStr.length;

if (startIdx === -1 || endIdx === -1) {
    console.error('Could not find bounds.');
    process.exit(1);
}

// Ensure there are no extra spaces or newlines we want to strip
let blockToMove = content.substring(startIdx, endIdx);
content = content.substring(0, startIdx) + content.substring(endIdx);

// Note: at startIdx there was a \n which we keep before the </div> that closes the header.
// So content is just missing the block.

const newFloatingBlock = `
      {/* Floating Bottom-Right Controls */}
      {!shouldHideClutter && (
        <div className="fixed bottom-6 right-6 z-[100] flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
          \${blockToMove.replace('relative z-50 shrink-0', 'relative shadow-xl backdrop-blur-md').trim()}
        </div>
      )}
`;

// we need to evaluate the template literal substitution manually since we're using a string variable
const blockCode = `
      {/* Floating Bottom-Right Controls */}
      {!shouldHideClutter && (
        <div className="fixed bottom-6 right-6 z-[100] flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
` + blockToMove.replace('relative z-50 shrink-0', 'relative shadow-xl backdrop-blur-md').replace(/            /g, '          ') + `
        </div>
      )}
`;

let targetInsert = '      {/* Floating Bottom-Left Version/Changelog Badge */}';
content = content.replace(targetInsert, blockCode + '\n' + targetInsert);

fs.writeFileSync('src/App.tsx', content, 'utf-8');
console.log('Successfully moved to bottom right!');
