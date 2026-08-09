import fs from 'fs';

const content = fs.readFileSync('src/components/academy/CyberHands.tsx', 'utf-8');

const matches = [];
const regex = /hand:\s*['"]([^'"]+)['"]/g;
let m;
while ((m = regex.exec(content)) !== null) {
  matches.push({ full: m[0], value: m[1], index: m.index });
}

console.log("All matches for hand:", matches);
