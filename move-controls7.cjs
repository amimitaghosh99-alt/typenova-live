const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf-8');

const themeStart = '            {/* Theme & Sound */}';
const headerEnd = '        </header>';

const startIdx = content.indexOf(themeStart);
const endIdx = content.indexOf(headerEnd, startIdx);

const extractedBlock = content.substring(startIdx, endIdx);

let newHeaderTail = `            </div>\n          </div>\n        </header>`;

let themeContentMatch = extractedBlock.match(/\{\/\* Theme & Sound \*\/\}([\s\S]*?)<\/div>\s*<\/div>/);
let themeContent = themeContentMatch ? themeContentMatch[1] + '</div>' : ''; // The inner theme block

let accountContentMatch = extractedBlock.match(/\{\/\* Account: Google login \*\/\}([\s\S]*?\/>)/);
let accountContent = accountContentMatch ? accountContentMatch[0] : '';

themeContent = themeContent.replace('relative z-50 shrink-0', 'relative shadow-xl backdrop-blur-md');
themeContent = themeContent.split('\\n').map(line => line.startsWith('  ') ? line.substring(2) : line).join('\\n');
accountContent = accountContent.split('\\n').map(line => line.startsWith('  ') ? line.substring(2) : line).join('\\n');

const newFloatingBlock = `      {/* Floating Bottom-Right Controls */}
      {!shouldHideClutter && (
        <div className="fixed bottom-6 right-6 z-[100] flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
` + themeContent + `\n` + accountContent + `
        </div>
      )}`;

content = content.substring(0, startIdx) + newHeaderTail + content.substring(endIdx + headerEnd.length);

const insertTarget = '      {/* Floating Bottom-Left Version/Changelog Badge */}';
content = content.replace(insertTarget, newFloatingBlock + '\\n\\n' + insertTarget);

fs.writeFileSync('src/App.tsx', content, 'utf-8');
console.log('Success');
