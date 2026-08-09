import { KEY_MAP, LEFT_HOLOGRAM_FINGERS, RIGHT_HOLOGRAM_FINGERS } from '../../src/components/academy/CyberHands';
import { FINGER_MAP } from '../../src/components/academy/VirtualKeyboard';

console.log("=== EMPIRICAL STRESS TEST SUITE FOR CYBERHANDS M4 ===");

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

// 1. Stress Test: Filter definitions & attributes check
console.log("\n--- Test 1: Hologram Filters & Color Scheme ---");
// Check fingers active vs inactive glow filters logic
assert(LEFT_HOLOGRAM_FINGERS.length === 5, "Left hand has 5 fingers");
assert(RIGHT_HOLOGRAM_FINGERS.length === 5, "Right hand has 5 fingers");

// 2. Wireframe lines analysis
console.log("\n--- Test 2: Wireframe Lines & Bone Axis Ray Detection ---");
[...LEFT_HOLOGRAM_FINGERS, ...RIGHT_HOLOGRAM_FINGERS].forEach(f => {
  const lineCount = f.wireframeLines.length;
  const isThumb = f.id.includes('thumb');
  if (isThumb) {
    assert(lineCount === 3, `${f.id} has 3 wireframe lines (2 cross lines, 1 bone axis ray)`);
  } else {
    assert(lineCount === 4, `${f.id} has 4 wireframe lines (3 cross lines, 1 bone axis ray)`);
  }

  // Last line must be bone axis ray from MCP to Tip
  const lastLine = f.wireframeLines[lineCount - 1];
  const expectedEnd = `L ${f.tip[0]},${f.tip[1]}`;
  assert(lastLine.endsWith(expectedEnd), `${f.id} bone axis ray ends at tip (${f.tip[0]},${f.tip[1]}): "${lastLine}"`);
});

// 3. Knuckle Joint Nodes (MCP, PIP, DIP, Tip)
console.log("\n--- Test 3: Knuckle Joint Nodes Alignment ---");
[...LEFT_HOLOGRAM_FINGERS, ...RIGHT_HOLOGRAM_FINGERS].forEach(f => {
  assert(f.mcp.length === 2 && !isNaN(f.mcp[0]) && !isNaN(f.mcp[1]), `${f.id} MCP node valid: [${f.mcp}]`);
  assert(f.pip.length === 2 && !isNaN(f.pip[0]) && !isNaN(f.pip[1]), `${f.id} PIP node valid: [${f.pip}]`);
  assert(f.dip.length === 2 && !isNaN(f.dip[0]) && !isNaN(f.dip[1]), `${f.id} DIP node valid: [${f.dip}]`);
  assert(f.tip.length === 2 && !isNaN(f.tip[0]) && !isNaN(f.tip[1]), `${f.id} Tip node valid: [${f.tip}]`);
});

// 4. Test Key Mappings & Target Finger Resolution
console.log("\n--- Test 4: Key Map & Target Finger Resolution ---");
const keysToTest = Object.keys(KEY_MAP);
console.log(`Testing ${keysToTest.length} keys in KEY_MAP...`);

keysToTest.forEach(key => {
  const info = KEY_MAP[key];
  const mappedFinger = FINGER_MAP[key];
  assert(info.finger === mappedFinger, `Key '${key}': KEY_MAP finger (${info.finger}) matches FINGER_MAP (${mappedFinger})`);
});

// 5. Test Active State and Hand Resolution logic simulation
console.log("\n--- Test 5: Hand Resolution & Active Finger logic for all keys ---");
keysToTest.forEach(key => {
  const upperKey = key.toUpperCase();
  const normalizedKey = upperKey === " " ? "SPACE" : upperKey;
  const keyInfo = KEY_MAP[normalizedKey];
  const targetFinger = FINGER_MAP[normalizedKey] || "";

  const isLeftActive = targetFinger.startsWith("left") || (targetFinger === "thumb" && (keyInfo?.x === undefined || keyInfo.x <= 276));
  const isRightActive = targetFinger.startsWith("right") || (targetFinger === "thumb" && keyInfo?.x !== undefined && keyInfo.x > 276);

  assert(isLeftActive !== isRightActive, `Key '${key}' resolves strictly to one active hand (Left: ${isLeftActive}, Right: ${isRightActive})`);

  // Check finger matching logic
  let activeFingerCount = 0;
  const handFingers = isLeftActive ? LEFT_HOLOGRAM_FINGERS : RIGHT_HOLOGRAM_FINGERS;
  handFingers.forEach(f => {
    const fid = f.fingerMapId ?? f.id;
    const isActive = (isLeftActive || isRightActive) && (targetFinger === "thumb" ? fid === "thumb" : fid === targetFinger);
    if (isActive) activeFingerCount++;
  });
  assert(activeFingerCount === 1, `Key '${key}' activates exactly 1 finger on the hand`);
});

// 6. Test Edge Cases & Failure Scenarios
console.log("\n--- Test 6: Edge Cases & Defensive Resilience ---");
// Empty key
{
  const activeKey = "";
  const activeFinger = "";
  const upperKey = activeKey.toUpperCase();
  const normalizedKey = upperKey === " " ? "SPACE" : upperKey;
  const keyInfo = KEY_MAP[normalizedKey];
  assert(keyInfo === undefined, "Empty key produces undefined keyInfo gracefully");
}

// Unknown key (e.g. '@', '1', 'ENTER')
{
  const activeKey = "@";
  const activeFinger = "left-index";
  const upperKey = activeKey.toUpperCase();
  const normalizedKey = upperKey === " " ? "SPACE" : upperKey;
  const keyInfo = KEY_MAP[normalizedKey];
  const targetFinger = FINGER_MAP[normalizedKey] || activeFinger;
  const isLeftActive = targetFinger.startsWith("left") || (targetFinger === "thumb" && (keyInfo?.x === undefined || keyInfo.x <= 276));
  assert(isLeftActive === true, "Unknown key falls back to activeFinger ('left-index')");
}

console.log(`\n=== STRESS TEST SUMMARY: Passed ${passed}, Failed ${failed} ===`);
if (failed > 0) process.exit(1);
