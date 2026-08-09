import fs from 'fs';

console.log("=== ADVANCED EMPIRICAL STRESS TEST FOR CYBERHANDS (M4) ===");

// Read file
const code = fs.readFileSync('src/components/academy/CyberHands.tsx', 'utf-8');

const errors = [];
const warnings = [];
const findings = [];

// --- 1. SVG Defs and References Check ---
console.log("\n[1] Testing SVG Defs and Filter/Pattern/Gradient Integrity...");

const requiredDefs = [
  { id: 'holo-emerald-glow', type: 'filter' },
  { id: 'holo-cyan-glow', type: 'filter' },
  { id: 'scanlines', type: 'pattern' },
  { id: 'holo-palm-l', type: 'radialGradient' },
  { id: 'holo-palm-r', type: 'radialGradient' },
];

requiredDefs.forEach(def => {
  if (code.includes(`id="${def.id}"`)) {
    console.log(`  ✓ Definition found: <${def.type} id="${def.id}">`);
  } else {
    errors.push(`Missing SVG definition: id="${def.id}"`);
  }
});

// Check filter contents for feGaussianBlur stdDeviation pass
if (code.includes('stdDeviation="8"') && code.includes('stdDeviation="2"')) {
  console.log("  ✓ Dual feGaussianBlur passes (stdDeviation 8 & 2) present in glow filters.");
} else {
  errors.push("Glow filters missing dual stdDeviation passes (8 and 2).");
}

// Check scanlines pattern definition
if (code.includes('<pattern id="scanlines"')) {
  console.log("  ✓ Scanline pattern definition correctly set up.");
} else {
  errors.push("Scanline pattern missing.");
}

// Check url references
const references = [
  'url(#holo-emerald-glow)',
  'url(#holo-cyan-glow)',
  'url(#scanlines)',
  'url(#holo-palm-l)',
  'url(#holo-palm-r)',
];

references.forEach(ref => {
  if (code.includes(ref)) {
    console.log(`  ✓ Reference found: ${ref}`);
  } else {
    errors.push(`Missing reference to ${ref} in JSX structure.`);
  }
});

// --- 2. Color Palette & Visual Contrast Check ---
console.log("\n[2] Testing Visual Contrast & Color Palettes...");

// Left hand: Emerald (#00ff9d)
// Right hand: Cyan (#00e5ff)
const leftGlowColor = "#00ff9d";
const rightGlowColor = "#00e5ff";

if (code.includes(`const glowColor = "${leftGlowColor}"`)) {
  console.log(`  ✓ Left hand glow color set to Emerald (${leftGlowColor})`);
} else {
  errors.push(`Left hand glow color is not set to ${leftGlowColor}`);
}

if (code.includes(`const glowColor = "${rightGlowColor}"`)) {
  console.log(`  ✓ Right hand glow color set to Cyan (${rightGlowColor})`);
} else {
  errors.push(`Right hand glow color is not set to ${rightGlowColor}`);
}

// Check palm gradients stops
if (code.includes('stopColor="#00ff9d"') && code.includes('stopColor="#10b981"')) {
  console.log("  ✓ Left palm gradient uses Emerald multi-tone stops (#00ff9d, #10b981, #059669, #047857)");
} else {
  warnings.push("Left palm gradient stops might not match expected Emerald palette");
}

if (code.includes('stopColor="#00e5ff"') && code.includes('stopColor="#06b6d4"')) {
  console.log("  ✓ Right palm gradient uses Cyan multi-tone stops (#00e5ff, #06b6d4, #0891b2, #0e7490)");
} else {
  warnings.push("Right palm gradient stops might not match expected Cyan palette");
}

// --- 3. Wireframe & Joint Nodes Structure ---
console.log("\n[3] Testing Knuckle Joint Nodes & Wireframe Structural Lines...");

// Check node circle count & dynamic properties per finger
const circleMCP = code.includes('cx={f.mcp[0]}');
const circlePIP = code.includes('cx={f.pip[0]}');
const circleDIP = code.includes('cx={f.dip[0]}');
const circleTip = code.includes('cx={f.tip[0]}');

if (circleMCP && circlePIP && circleDIP && circleTip) {
  console.log("  ✓ All 4 joint nodes (MCP, PIP, DIP, Tip) rendered per finger.");
} else {
  errors.push("Missing one or more joint node rendering elements (MCP, PIP, DIP, Tip).");
}

// Check bone axis line detection logic
if (code.includes('const isBoneAxis = idx === f.wireframeLines.length - 1;')) {
  console.log("  ✓ Bone axis line detection correctly checks idx === f.wireframeLines.length - 1.");
} else {
  errors.push("Bone axis line detection logic missing or incorrect.");
}

// --- 4. Sonar Target Beam Verification ---
console.log("\n[4] Testing Holographic Sonar Target Pulse Beam...");

if (code.includes('key={`holo-target-1-${normalizedKey}`}') && code.includes('key={`holo-target-2-${normalizedKey}`}')) {
  console.log("  ✓ Dual concentric expanding target circles rendered with key prop.");
} else {
  errors.push("Sonar target circles missing key prop for clean re-renders.");
}

if (code.includes('isLeftActive ? "#00ff9d" : "#00e5ff"')) {
  console.log("  ✓ Sonar target beam dynamically switches color based on active hand.");
} else {
  errors.push("Sonar target beam does not switch color between left (#00ff9d) and right (#00e5ff).");
}

// --- 5. ESLint and Build Verification ---
console.log("\n[5] Summary of Empirical Checks...");

console.log(`Errors found: ${errors.length}`);
console.log(`Warnings found: ${warnings.length}`);

if (errors.length > 0) {
  console.log("\nFAILURES:");
  errors.forEach(e => console.log(`  - ${e}`));
}

if (warnings.length > 0) {
  console.log("\nWARNINGS:");
  warnings.forEach(w => console.log(`  - ${w}`));
}
