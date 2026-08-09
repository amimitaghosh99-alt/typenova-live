import * as fs from 'fs';
import * as path from 'path';

console.log("=== EMPIRICAL AST / PATTERN VERIFICATION FOR M4 HOLOGRAPHIC AESTHETIC ===");

const filePath = path.resolve('src/components/academy/CyberHands.tsx');
const content = fs.readFileSync(filePath, 'utf-8');

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    passed++;
    console.log(`[PASS] ${msg}`);
  } else {
    failed++;
    console.error(`[FAIL] ${msg}`);
  }
}

// 1. Glow Filter Defs Check
assert(content.includes('id="holo-emerald-glow"'), "Defs contains holo-emerald-glow filter");
assert(content.includes('id="holo-cyan-glow"'), "Defs contains holo-cyan-glow filter");

// 2. Dual feGaussianBlur check
const emeraldFilterSection = content.slice(content.indexOf('id="holo-emerald-glow"'), content.indexOf('id="holo-cyan-glow"'));
assert(emeraldFilterSection.includes('stdDeviation="8"'), "Emerald filter includes stdDeviation=8 blur");
assert(emeraldFilterSection.includes('stdDeviation="2"'), "Emerald filter includes stdDeviation=2 blur");
assert(emeraldFilterSection.includes('feMerge'), "Emerald filter uses feMerge");

const cyanFilterSection = content.slice(content.indexOf('id="holo-cyan-glow"'));
assert(cyanFilterSection.includes('stdDeviation="8"'), "Cyan filter includes stdDeviation=8 blur");
assert(cyanFilterSection.includes('stdDeviation="2"'), "Cyan filter includes stdDeviation=2 blur");
assert(cyanFilterSection.includes('feMerge'), "Cyan filter uses feMerge");

// 3. Dynamic Glow Filter Application
assert(content.includes('filter={isActive ? "url(#holo-emerald-glow)" : undefined}'), "Left fingers apply emerald glow conditionally on isActive");
assert(content.includes('filter={isActive ? "url(#holo-cyan-glow)" : undefined}'), "Right fingers apply cyan glow conditionally on isActive");
assert(content.includes('filter={isLeftActive ? "url(#holo-emerald-glow)" : "url(#holo-cyan-glow)"}'), "Sonar beam applies emerald/cyan glow based on isLeftActive");

// 4. Wireframe Lines and Bone Axis Ray Detection
assert(content.includes('const isBoneAxis = idx === f.wireframeLines.length - 1;'), "Bone axis ray identified as last element in wireframeLines array");
assert(content.includes('strokeWidth={isBoneAxis ? (isActive ? 2.5 : 1.2) : 0.8}'), "Bone axis ray has dynamic stroke width (2.5 active / 1.2 inactive vs 0.8 cross lines)");
assert(content.includes('strokeDasharray={isBoneAxis ? "none" : "2 2"}'), "Bone axis ray is solid (none) while cross lines are dashed (2 2)");

// 5. Knuckle Joint Nodes (MCP, PIP, DIP, Tip)
assert(content.includes('r={isActive ? 4.5 : 2.5}'), "MCP joint node has r=4.5 active / 2.5 inactive");
assert(content.includes('r={isActive ? 4.0 : 2.0}'), "PIP joint node has r=4.0 active / 2.0 inactive");
assert(content.includes('r={isActive ? 3.5 : 1.8}'), "DIP joint node has r=3.5 active / 1.8 inactive");
assert(content.includes('animate={isActive ? { r: [6, 8.5, 6] } : { r: 3.5 }}'), "Tip node pulses r=[6, 8.5, 6] active / 3.5 inactive");

// 6. Scanlines & Radial Gradients
assert(content.includes('id="scanlines"'), "Scanlines pattern defined in defs");
assert(content.includes('fill="url(#scanlines)"'), "Scanlines pattern applied to finger volume & palm");
assert(content.includes('id="holo-palm-l"'), "Left radial palm gradient defined");
assert(content.includes('id="holo-palm-r"'), "Right radial palm gradient defined");

// 7. Sonar Target Pulse Beam over Active Key
assert(content.includes('key={`holo-target-1-${normalizedKey}`}'), "Target pulse ring 1 rendered");
assert(content.includes('key={`holo-target-2-${normalizedKey}`}'), "Target pulse ring 2 rendered");
assert(content.includes('delay: 0.65'), "Target pulse ring 2 staggered by 0.65s");
assert(content.includes('animate={{ r: [6, 24, 36], opacity: [0.9, 0.35, 0]'), "Target pulse expanding concentric circle animation defined");
assert(content.includes('r={3}'), "Central focal target dot rendered");

console.log(`\n=== PATTERN VERIFICATION SUMMARY: Passed ${passed}, Failed ${failed} ===`);
if (failed > 0) process.exit(1);
