const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf-8');

const themeStart = '            {/* Theme & Sound */}';
const headerEnd = '        </header>';

const startIdx = content.indexOf(themeStart);
const endIdx = content.indexOf(headerEnd, startIdx);

const extractedBlock = content.substring(startIdx, endIdx);

// The extracted block has Theme & Sound, Account Menu, and two closing divs: `</div>\n          </div>\n`
// The first `</div>` (line 1688) closes Profile & Actions container. We need to KEEP it in the header!
// Wait, the extracted block contains:
/*
            {/* Theme & Sound *}
            <div className="flex glass-panel rounded-full p-1 items-center relative z-50 shrink-0">
               ...
            </div>
            </div>

            {/* Account: Google login *}
            <AccountMenu
               ...
            />
          </div>
*/

// Let's manually reconstruct the header's tail:
let newHeaderTail = `            </div>\n          </div>\n        </header>`;

// The extracted elements we actually want to move:
// 1. The Theme & Sound div (without the trailing </div> that closes the parent)
let themeContentMatch = extractedBlock.match(/\{\/\* Theme & Sound \*\/\}([\s\S]*?)<\/div>\s*<\/div>/);
let themeContent = themeContentMatch ? themeContentMatch[1] + '</div>' : ''; // The inner theme block

let accountContentMatch = extractedBlock.match(/\{\/\* Account: Google login \*\/\}([\s\S]*?\/>)/);
let accountContent = accountContentMatch ? accountContentMatch[0] : '';

// Reformatted theme content:
themeContent = themeContent.replace('relative z-50 shrink-0', 'relative shadow-xl backdrop-blur-md');
// Reduce indentation by 2 spaces
themeContent = themeContent.split('\\n').map(line => line.startsWith('  ') ? line.substring(2) : line).join('\\n');
accountContent = accountContent.split('\\n').map(line => line.startsWith('  ') ? line.substring(2) : line).join('\\n');

const newFloatingBlock = `      {/* Floating Bottom-Right Controls */}
      {!shouldHideClutter && (
        <div className="fixed bottom-6 right-6 z-[100] flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
\${themeContent}
\${accountContent}
        </div>
      )}`;

// Replace the old block with the new header tail
content = content.substring(0, startIdx) + newHeaderTail + content.substring(endIdx + headerEnd.length);

// Insert the new floating block at the bottom
const insertTarget = '      {/* Floating Bottom-Left Version/Changelog Badge */}';
content = content.replace(insertTarget, newFloatingBlock + '\\n\\n' + insertTarget);

fs.writeFileSync('src/App.tsx', content, 'utf-8');
console.log('Success');
