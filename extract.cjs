const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf-8');

const startTarget = '            {/* Theme & Sound */}';
const endTarget = '              onSignOut={() => { void auth.signOut(); }}\n            />';

let startIdx = content.indexOf(startTarget);
let endIdx = content.indexOf(endTarget) + endTarget.length;

let block = content.substring(startIdx, endIdx);
fs.writeFileSync('extracted.txt', block, 'utf-8');
console.log('Extracted block successfully');
