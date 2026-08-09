import { FINGER_MAP } from '../src/components/academy/VirtualKeyboard';
import { KEY_MAP, LEFT_HOLOGRAM_FINGERS, RIGHT_HOLOGRAM_FINGERS } from '../src/components/academy/CyberHands';
import * as fs from 'fs';
import * as path from 'path';

console.log("=== EMPIRICAL STRESS TEST HARNESS — MILESTONE 2 ===");
let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`[PASS] ${msg}`);
    passed++;
  } else {
    console.error(`[FAIL] ${msg}`);
    failed++;
  }
}

// Parse ROWS from VirtualKeyboard.tsx file to strictly test source content
const vkPath = path.join(process.cwd(), 'src/components/academy/VirtualKeyboard.tsx');
const vkContent = fs.readFileSync(vkPath, 'utf8');

const rowsMatch = vkContent.match(/const ROWS = (\[[\s\S]*?\]);/);
assert(rowsMatch !== null, "Found `const ROWS` declaration in VirtualKeyboard.tsx");

let ROWS: string[][] = [];
if (rowsMatch) {
  ROWS = eval(rowsMatch[1]);
}

// Test 1: Missing ';' key presence & mapping
const row1 = ROWS[1] || [];
assert(row1.includes(';'), "Row 1 in VirtualKeyboard contains ';' key");
assert(FINGER_MAP[';'] === 'right-pinky', "FINGER_MAP[';'] maps to 'right-pinky'");
assert(KEY_MAP[';'] !== undefined, "KEY_MAP[';'] exists in CyberHands");
assert(KEY_MAP[';']?.finger === 'right-pinky', "KEY_MAP[';'].finger is 'right-pinky'");
assert(KEY_MAP[';']?.x === 518 && KEY_MAP[';']?.y === 76, "KEY_MAP[';'] coordinates are (518, 76)");

// Test 2: VirtualKeyboard ROWS vs FINGER_MAP vs KEY_MAP completeness
const allKeysInRows = ROWS.flat();
console.log(`Total keys defined in VirtualKeyboard ROWS: ${allKeysInRows.length}`);

for (const key of allKeysInRows) {
  assert(FINGER_MAP[key] !== undefined, `Key '${key}' is defined in FINGER_MAP`);
  assert(KEY_MAP[key] !== undefined, `Key '${key}' is defined in KEY_MAP`);
  if (FINGER_MAP[key] && KEY_MAP[key]) {
    assert(
      FINGER_MAP[key] === KEY_MAP[key].finger,
      `Key '${key}' finger in FINGER_MAP (${FINGER_MAP[key]}) matches KEY_MAP (${KEY_MAP[key].finger})`
    );
  }
}

// Test 3: Resting Home Row Alignment (Y=76)
const homeRowKeys = ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ';'];
for (const k of homeRowKeys) {
  assert(KEY_MAP[k]?.y === 76, `Home row key '${k}' has y=76 in KEY_MAP`);
}

const leftFingersMap = new Map(LEFT_HOLOGRAM_FINGERS.map(f => [f.id, f]));
const rightFingersMap = new Map(RIGHT_HOLOGRAM_FINGERS.map(f => [f.id, f]));

// Home row fingertips checks
const fingerKeyPairs = [
  { fingerId: 'left-pinky', key: 'A', hand: leftFingersMap },
  { fingerId: 'left-ring', key: 'S', hand: leftFingersMap },
  { fingerId: 'left-middle', key: 'D', hand: leftFingersMap },
  { fingerId: 'left-index', key: 'F', hand: leftFingersMap },
  { fingerId: 'right-index', key: 'J', hand: rightFingersMap },
  { fingerId: 'right-middle', key: 'K', hand: rightFingersMap },
  { fingerId: 'right-ring', key: 'L', hand: rightFingersMap },
  { fingerId: 'right-pinky', key: ';', hand: rightFingersMap },
];

for (const { fingerId, key, hand } of fingerKeyPairs) {
  const f = hand.get(fingerId);
  const kInfo = KEY_MAP[key];
  assert(f !== undefined, `Finger '${fingerId}' exists in hologram config`);
  if (f && kInfo) {
    assert(
      f.tip[0] === kInfo.x && f.tip[1] === kInfo.y,
      `Finger '${fingerId}' tip (${f.tip.join(',')}) perfectly matches key '${key}' center (${kInfo.x},${kInfo.y})`
    );
    // Wireframe line 4 check (index 3)
    const line4 = f.wireframeLines[3];
    assert(
      line4.endsWith(`L ${f.tip[0]},${f.tip[1]}`),
      `Finger '${fingerId}' wireframe line 4 ends at L ${f.tip[0]},${f.tip[1]} (Actual: '${line4}')`
    );
  }
}

// Test 4: Spacebar routing logic tests
console.log("\n--- Testing Spacebar & Hand Activation Logic ---");

function simulateCyberHandsHandActivation(activeKey: string, activeFinger: string) {
  const upperKey = activeKey.toUpperCase();
  const normalizedKey = upperKey === " " ? "SPACE" : upperKey;
  const keyInfo = KEY_MAP[normalizedKey];
  const targetFinger = FINGER_MAP[normalizedKey] || activeFinger;

  const isLeftActive = targetFinger.startsWith("left") || (targetFinger === "thumb" && (keyInfo?.x === undefined || keyInfo.x <= 276));
  const isRightActive = targetFinger.startsWith("right") || (targetFinger === "thumb" && keyInfo?.x !== undefined && keyInfo.x > 276);

  return { normalizedKey, keyInfo, targetFinger, isLeftActive, isRightActive };
}

// Scenario 4a: Spacebar active key ' '
const spaceResult1 = simulateCyberHandsHandActivation(" ", "");
assert(spaceResult1.normalizedKey === "SPACE", "Space character ' ' normalizes to 'SPACE'");
assert(spaceResult1.targetFinger === "thumb", "Spacebar maps to 'thumb'");
assert(spaceResult1.isLeftActive === true, "Spacebar active key ' ' activates left thumb");
assert(spaceResult1.isRightActive === false, "Spacebar active key ' ' does NOT activate right hand");

// Scenario 4b: Spacebar active key 'SPACE'
const spaceResult2 = simulateCyberHandsHandActivation("SPACE", "");
assert(spaceResult2.isLeftActive === true, "Active key 'SPACE' activates left thumb");

// Scenario 4c: Lowercase key 'q'
const qResult = simulateCyberHandsHandActivation("q", "");
assert(qResult.normalizedKey === "Q", "Lowercase 'q' normalizes to 'Q'");
assert(qResult.isLeftActive === true, "Key 'q' activates left hand");

// Scenario 4d: Empty string active key
const emptyResult = simulateCyberHandsHandActivation("", "");
assert(emptyResult.normalizedKey === "", "Empty key normalizes to ''");
assert(emptyResult.keyInfo === undefined, "Empty key produces undefined keyInfo");
assert(emptyResult.isLeftActive === false, "Empty key does not activate left hand");
assert(emptyResult.isRightActive === false, "Empty key does not activate right hand");

// Scenario 4e: Empty active key with activeFinger = 'thumb'
const thumbHintResult = simulateCyberHandsHandActivation("", "thumb");
assert(thumbHintResult.isLeftActive === true, "Thumb hint with empty activeKey defaults to left thumb (x<=276 guard)");

// Test 5: Sonar ripple guard condition simulation
console.log("\n--- Testing Sonar Target Beam Guard Condition ---");
function checkSonarRippleActive(activeKey: string) {
  const upperKey = activeKey.toUpperCase();
  const normalizedKey = upperKey === " " ? "SPACE" : upperKey;
  const keyInfo = KEY_MAP[normalizedKey];
  return Boolean(keyInfo && normalizedKey !== "");
}

assert(checkSonarRippleActive("") === false, "Sonar ripple IS SUPPRESSED when activeKey is ''");
assert(checkSonarRippleActive(" ") === true, "Sonar ripple IS ACTIVE when activeKey is ' '");
assert(checkSonarRippleActive("SPACE") === true, "Sonar ripple IS ACTIVE when activeKey is 'SPACE'");
assert(checkSonarRippleActive(";") === true, "Sonar ripple IS ACTIVE when activeKey is ';'");
assert(checkSonarRippleActive("INVALID_KEY") === false, "Sonar ripple IS SUPPRESSED when activeKey is invalid");

// Test 6: Layering Z-Index Check in AcademyLayout.tsx and CyberHands.tsx
console.log("\n--- Testing Layer Z-Index Requirements ---");
const alPath = path.join(process.cwd(), 'src/components/academy/AcademyLayout.tsx');
const alContent = fs.readFileSync(alPath, 'utf8');
const chPath = path.join(process.cwd(), 'src/components/academy/CyberHands.tsx');
const chContent = fs.readFileSync(chPath, 'utf8');

assert(alContent.includes('style={{ zIndex: 2 }}'), "VirtualKeyboard container in AcademyLayout has zIndex: 2");
assert(chContent.includes('zIndex: 1'), "CyberHands wrapper in CyberHands.tsx has zIndex: 1");

console.log(`\n=== STRESS TEST SUMMARY ===`);
console.log(`PASSED: ${passed}`);
console.log(`FAILED: ${failed}`);
if (failed > 0) {
  process.exit(1);
}
