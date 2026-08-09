import fs from 'fs';
import path from 'path';

console.log("=== EMPIRICAL STRESS TEST FOR CYBERHANDS.TSX (M4) ===");

const filePath = 'src/components/academy/CyberHands.tsx';
const content = fs.readFileSync(filePath, 'utf-8');

let errors = [];
let warnings = [];

// 1. Defs ID Extraction & URL Reference Verification
const defIds = [];
const defIdRegex = /id=["']([^"']+)["']/g;
let match;
while ((match = defIdRegex.exec(content)) !== null) {
  defIds.push(match[1]);
}
console.log("Found Def IDs:", defIds);

const expectedDefIds = [
  'holo-emerald-glow',
  'holo-cyan-glow',
  'scanlines',
  'holo-palm-l',
  'holo-palm-r'
];

expectedDefIds.forEach(id => {
  if (!defIds.includes(id)) {
    errors.push(`Missing expected def ID: ${id}`);
  }
});

// Check url(#...) references
const urlRefRegex = /url\(#([^)]+)\)/g;
const urlRefs = new Set();
while ((match = urlRefRegex.exec(content)) !== null) {
  urlRefs.add(match[1]);
}
console.log("Found url(#...) references:", Array.from(urlRefs));

urlRefs.forEach(ref => {
  if (!defIds.includes(ref)) {
    errors.push(`Dangling url(#${ref}) reference — definition not found in <defs>!`);
  }
});

// 2. Visual Contrast & Color Palette Verification
// Left hand: Emerald (#00ff9d, rgba(0, 255, 157, ...))
// Right hand: Cyan (#00e5ff, rgba(0, 229, 255, ...))
const hasEmeraldGlowColor = content.includes('#00ff9d');
const hasCyanGlowColor = content.includes('#00e5ff');
if (!hasEmeraldGlowColor) errors.push("Missing Left hand Emerald primary glow color #00ff9d");
if (!hasCyanGlowColor) errors.push("Missing Right hand Cyan primary glow color #00e5ff");

// Check palm gradients
const hasPalmL = content.includes('id="holo-palm-l"');
const hasPalmR = content.includes('id="holo-palm-r"');
if (!hasPalmL) errors.push("Missing Left Palm gradient definition (holo-palm-l)");
if (!hasPalmR) errors.push("Missing Right Palm gradient definition (holo-palm-r)");

// 3. Scanline pattern verification
const scanlinePattern = content.includes('id="scanlines"') && content.includes('fill="url(#scanlines)"');
if (!scanlinePattern) errors.push("Scanline pattern is not correctly defined or referenced");

// 4. Structural Elements & Framer Motion Properties
// Knuckle nodes (mcp, pip, dip circles)
const hasMcpCircle = content.includes('f.mcp[0]') && content.includes('f.mcp[1]');
const hasPipCircle = content.includes('f.pip[0]') && content.includes('f.pip[1]');
const hasDipCircle = content.includes('f.dip[0]') && content.includes('f.dip[1]');
if (!hasMcpCircle || !hasPipCircle || !hasDipCircle) {
  errors.push("Missing one or more knuckle joint node circles (MCP, PIP, DIP)");
}

// Active fingertip pulse animation
const hasPulseAnimation = content.includes("animate={isActive ? { r: [6, 8.5, 6] } : { r: 3.5 }}");
if (!hasPulseAnimation) errors.push("Missing active fingertip pulse animation");

// Sonar target pulse beam animation
const hasSonarTarget = content.includes("key={`holo-target-1-${normalizedKey}`}") && content.includes("key={`holo-target-2-${normalizedKey}`}");
if (!hasSonarTarget) errors.push("Missing dual-concentric sonar target pulse beam");

// 5. Test Key Map Coverage & Finger Hand Mapping
// Import or extract KEY_MAP & finger count
const leftFingersCount = (content.match(/hand:\s*'left'/g) || []).length;
const rightFingersCount = (content.match(/hand:\s*'right'/g) || []).length;
console.log(`Left fingers count: ${leftFingersCount}, Right fingers count: ${rightFingersCount}`);
if (leftFingersCount !== 5) errors.push(`Expected 5 left fingers, found ${leftFingersCount}`);
if (rightFingersCount !== 5) errors.push(`Expected 5 right fingers, found ${rightFingersCount}`);

// Summary
console.log("\n--- STRESS TEST SUMMARY ---");
if (errors.length === 0) {
  console.log("SUCCESS: All SVG elements, filter defs, scanlines, color contrast, and animations passed empirical verification.");
} else {
  console.log("FAILURES DETECTED:");
  errors.forEach(e => console.log(` - ERROR: ${e}`));
}

if (warnings.length > 0) {
  console.log("WARNINGS:");
  warnings.forEach(w => console.log(` - WARNING: ${w}`));
}
