const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf-8');

// Find the Theme & Sound block
let themeStart = content.indexOf('{/* Theme & Sound */}');
if (themeStart === -1) throw new Error('Could not find Theme block');

// Find the end of the AccountMenu block
let accountStart = content.indexOf('{/* Account: Google login */}');
let accountEnd = content.indexOf('/>', accountStart) + 2;

// The block to extract starts at themeStart and ends at accountEnd
let blockToMove = content.substring(themeStart, accountEnd);

// Remove the block from its current location
let beforeBlock = content.substring(0, themeStart).trimEnd();
let afterBlock = content.substring(accountEnd);

// Keep the structure intact
content = beforeBlock + '\n' + afterBlock.trimStart();

// Reformat the extracted block to fit the new bottom-right container
let newFloatingBlock = `
      {/* Floating Bottom-Right Controls */}
      {!shouldHideClutter && (
        <div className="fixed bottom-6 right-6 z-[100] flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
          ${blockToMove.replace('relative z-50 shrink-0', 'relative shadow-xl backdrop-blur-md')}
        </div>
      )}
`;

// Insert the new block right before {/* Expanded Graph Overlay */}
let overlayStart = content.indexOf('{/* Expanded Graph Overlay */}');
if (overlayStart === -1) throw new Error('Could not find Expanded Graph Overlay');

content = content.substring(0, overlayStart) + newFloatingBlock + '\n\n      ' + content.substring(overlayStart);

fs.writeFileSync('src/App.tsx', content, 'utf-8');
console.log('Controls moved successfully.');
