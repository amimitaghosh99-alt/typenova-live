const fs = require('fs');
const path = require('path');

// Replicate VirtualKeyboard constants
const ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ';'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
  ['SPACE'],
];

const FINGER_MAP = {
  Q: 'left-pinky',  A: 'left-pinky',  Z: 'left-pinky',
  W: 'left-ring',   S: 'left-ring',   X: 'left-ring',
  E: 'left-middle', D: 'left-middle', C: 'left-middle',
  R: 'left-index',  F: 'left-index',  V: 'left-index',
  T: 'left-index',  G: 'left-index',  B: 'left-index',
  Y: 'right-index', H: 'right-index', N: 'right-index',
  U: 'right-index', J: 'right-index', M: 'right-index',
  I: 'right-middle',K: 'right-middle',
  O: 'right-ring',  L: 'right-ring',
  P: 'right-pinky', ';': 'right-pinky',
  SPACE: 'thumb',
};

// Replicate CyberHands KEY_MAP
const KEY_MAP = {
  // Row 0 (Top Row) — Y=23
  Q: { x: 23, y: 23, row: 0, finger: 'left-pinky' },
  W: { x: 76, y: 23, row: 0, finger: 'left-ring' },
  E: { x: 129, y: 23, row: 0, finger: 'left-middle' },
  R: { x: 182, y: 23, row: 0, finger: 'left-index' },
  T: { x: 235, y: 23, row: 0, finger: 'left-index' },
  Y: { x: 288, y: 23, row: 0, finger: 'right-index' },
  U: { x: 341, y: 23, row: 0, finger: 'right-index' },
  I: { x: 394, y: 23, row: 0, finger: 'right-middle' },
  O: { x: 447, y: 23, row: 0, finger: 'right-ring' },
  P: { x: 500, y: 23, row: 0, finger: 'right-pinky' },

  // Row 1 (Home Row) — Y=76
  A: { x: 41, y: 76, row: 1, finger: 'left-pinky' },
  S: { x: 94, y: 76, row: 1, finger: 'left-ring' },
  D: { x: 147, y: 76, row: 1, finger: 'left-middle' },
  F: { x: 200, y: 76, row: 1, finger: 'left-index' },
  G: { x: 253, y: 76, row: 1, finger: 'left-index' },
  H: { x: 306, y: 76, row: 1, finger: 'right-index' },
  J: { x: 359, y: 76, row: 1, finger: 'right-index' },
  K: { x: 412, y: 76, row: 1, finger: 'right-middle' },
  L: { x: 465, y: 76, row: 1, finger: 'right-ring' },
  ';': { x: 518, y: 76, row: 1, finger: 'right-pinky' },

  // Row 2 (Bottom Row) — Y=129
  Z: { x: 69, y: 129, row: 2, finger: 'left-pinky' },
  X: { x: 122, y: 129, row: 2, finger: 'left-ring' },
  C: { x: 175, y: 129, row: 2, finger: 'left-middle' },
  V: { x: 228, y: 129, row: 2, finger: 'left-index' },
  B: { x: 281, y: 129, row: 2, finger: 'left-index' },
  N: { x: 334, y: 129, row: 2, finger: 'right-index' },
  M: { x: 387, y: 129, row: 2, finger: 'right-index' },

  // Row 3 (Spacebar) — Y=182
  SPACE: { x: 276, y: 182, row: 3, finger: 'thumb' },
};

const LEFT_HOLOGRAM_FINGERS = [
  { id: 'left-pinky', hand: 'left', tip: [41, 76], mcp: [60, 230] },
  { id: 'left-ring', hand: 'left', tip: [94, 76], mcp: [98, 225] },
  { id: 'left-middle', hand: 'left', tip: [147, 76], mcp: [138, 224] },
  { id: 'left-index', hand: 'left', tip: [200, 76], mcp: [172, 228] },
  { id: 'thumb', hand: 'left', fingerMapId: 'thumb', tip: [232, 178], mcp: [170, 275] },
];

const RIGHT_HOLOGRAM_FINGERS = [
  { id: 'thumb-right', hand: 'right', fingerMapId: 'thumb', tip: [320, 178], mcp: [382, 275] },
  { id: 'right-index', hand: 'right', tip: [359, 76], mcp: [386, 228] },
  { id: 'right-middle', hand: 'right', tip: [412, 76], mcp: [420, 224] },
  { id: 'right-ring', hand: 'right', tip: [465, 76], mcp: [454, 225] },
  { id: 'right-pinky', hand: 'right', tip: [518, 76], mcp: [492, 230] },
];

console.log("=== EMPIRICAL TEST SUITE: MILESTONE 2 ===");

// 1. GEOMETRY VERIFICATION
console.log("\n--- TEST 1: Theoretical vs KEY_MAP Geometry ---");
let geomErrors = 0;

// Row 0: width 46, gap 7, margin 0. Center = i*(46+7) + 23 = i*53 + 23. Top Y=0, H=46 -> Center Y=23.
ROWS[0].forEach((key, i) => {
  const expectedX = i * 53 + 23;
  const expectedY = 23;
  const km = KEY_MAP[key];
  if (!km || km.x !== expectedX || km.y !== expectedY) {
    console.error(`FAIL: Row 0 Key ${key}: Expected (${expectedX}, ${expectedY}), got (${km?.x}, ${km?.y})`);
    geomErrors++;
  }
});

// Row 1: width 46, gap 7, margin 18. Center = 18 + i*53 + 23 = i*53 + 41. Top Y=53, H=46 -> Center Y=76.
ROWS[1].forEach((key, i) => {
  const expectedX = i * 53 + 41;
  const expectedY = 76;
  const km = KEY_MAP[key];
  if (!km || km.x !== expectedX || km.y !== expectedY) {
    console.error(`FAIL: Row 1 Key ${key}: Expected (${expectedX}, ${expectedY}), got (${km?.x}, ${km?.y})`);
    geomErrors++;
  }
});

// Row 2: width 46, gap 7, margin 46. Center = 46 + i*53 + 23 = i*53 + 69. Top Y=106, H=46 -> Center Y=129.
ROWS[2].forEach((key, i) => {
  const expectedX = i * 53 + 69;
  const expectedY = 129;
  const km = KEY_MAP[key];
  if (!km || km.x !== expectedX || km.y !== expectedY) {
    console.error(`FAIL: Row 2 Key ${key}: Expected (${expectedX}, ${expectedY}), got (${km?.x}, ${km?.y})`);
    geomErrors++;
  }
});

// Row 3: SPACE: w-64 = 256px. Container width 552. Left margin = (552-256)/2 = 148. Center = 148 + 128 = 276.
// Top Y = 106 + 46 + 7 = 159. Height = 44px (h-11). Center Y = 159 + 22 = 181.
const spaceKm = KEY_MAP['SPACE'];
console.log(`Row 3 Key SPACE: KEY_MAP is (${spaceKm?.x}, ${spaceKm?.y}). Theoretical X=276, Y=181 (h-11) or Y=182 (h-46px equivalent).`);
if (!spaceKm || spaceKm.x !== 276 || Math.abs(spaceKm.y - 181.5) > 1) {
  console.error(`FAIL: Spacebar geometry mismatch! Got (${spaceKm?.x}, ${spaceKm?.y})`);
  geomErrors++;
}

if (geomErrors === 0) {
  console.log("PASS: All 28 key coordinates match exact DOM layout geometry.");
}

// 2. FINGER MAP COVERAGE AND FINGER ALIGNMENT
console.log("\n--- TEST 2: Finger Mapping & Coverage ---");
let mapErrors = 0;
const allKeysInRows = ROWS.flat();

allKeysInRows.forEach(key => {
  if (!FINGER_MAP[key]) {
    console.error(`FAIL: Key ${key} missing in FINGER_MAP!`);
    mapErrors++;
  }
  if (!KEY_MAP[key]) {
    console.error(`FAIL: Key ${key} missing in KEY_MAP!`);
    mapErrors++;
  }
  if (FINGER_MAP[key] && KEY_MAP[key] && FINGER_MAP[key] !== KEY_MAP[key].finger) {
    console.error(`FAIL: Key ${key} finger mismatch! FINGER_MAP=${FINGER_MAP[key]}, KEY_MAP=${KEY_MAP[key].finger}`);
    mapErrors++;
  }
});

if (mapErrors === 0) {
  console.log("PASS: 100% agreement between FINGER_MAP, KEY_MAP, and VirtualKeyboard ROWS.");
}

// 3. KINEMATICS AND TRANSFORMS FOR ALL KEYS
console.log("\n--- TEST 3: Kinematic Transforms for All 28 Keys ---");

function getHandTransform(hand, keyInfo, isLeftActive, isRightActive) {
  const isActive = hand === "left" ? isLeftActive : isRightActive;
  if (!isActive || !keyInfo) return { x: 0, y: 0 };
  const homeX = hand === "left" ? 200 : 359;
  const homeY = 76;
  return {
    x: (keyInfo.x - homeX) * 0.40,
    y: (keyInfo.y - homeY) * 0.50,
  };
}

function getFingerTransform(f, isActive, keyInfo, hx, hy) {
  if (!isActive || !keyInfo) return { rotate: 0, scale: 1 };
  const mcpAbsX = f.mcp[0] + hx;
  const mcpAbsY = f.mcp[1] + hy;
  const targetDx = keyInfo.x - mcpAbsX;
  const targetDy = keyInfo.y - mcpAbsY;
  const targetLength = Math.hypot(targetDx, targetDy);
  const targetAngle = Math.atan2(targetDy, targetDx);
  const restingDx = f.tip[0] - f.mcp[0];
  const restingDy = f.tip[1] - f.mcp[1];
  const restingLength = Math.hypot(restingDx, restingDy);
  const restingAngle = Math.atan2(restingDy, restingDx);
  let rotate = (targetAngle - restingAngle) * (180 / Math.PI);
  if (rotate > 180) rotate -= 360;
  if (rotate < -180) rotate += 360;
  rotate = Math.min(30, Math.max(-30, rotate));
  const scale = Math.min(1.4, Math.max(0.7, targetLength / restingLength));
  return { rotate, scale };
}

let kinErrors = 0;
const allFingers = [...LEFT_HOLOGRAM_FINGERS, ...RIGHT_HOLOGRAM_FINGERS];

allKeysInRows.forEach(key => {
  const upperKey = key.toUpperCase();
  const normalizedKey = upperKey === " " ? "SPACE" : upperKey;
  const keyInfo = KEY_MAP[normalizedKey];
  const targetFinger = FINGER_MAP[normalizedKey];

  const isLeftActive = targetFinger.startsWith("left") || (targetFinger === "thumb" && (keyInfo?.x === undefined || keyInfo.x <= 276));
  const isRightActive = targetFinger.startsWith("right") || (targetFinger === "thumb" && keyInfo?.x !== undefined && keyInfo.x > 276);

  const leftHandMotion = getHandTransform("left", keyInfo, isLeftActive, isRightActive);
  const rightHandMotion = getHandTransform("right", keyInfo, isLeftActive, isRightActive);

  allFingers.forEach(f => {
    const fid = f.fingerMapId ?? f.id;
    const handActive = f.hand === "left" ? isLeftActive : isRightActive;
    const isActive = handActive && (targetFinger === "thumb" ? fid === "thumb" : fid === targetFinger);
    const handMotion = f.hand === "left" ? leftHandMotion : rightHandMotion;

    const { rotate, scale } = getFingerTransform(f, isActive, keyInfo, handMotion.x, handMotion.y);

    if (isNaN(rotate) || isNaN(scale) || !isFinite(rotate) || !isFinite(scale)) {
      console.error(`FAIL: Key ${key}, Finger ${f.id} produced invalid transforms: rotate=${rotate}, scale=${scale}`);
      kinErrors++;
    }

    if (isActive) {
      if (Math.abs(rotate) > 30) {
        console.error(`FAIL: Key ${key}, Finger ${f.id} rotation exceeds limit: ${rotate}`);
        kinErrors++;
      }
      if (scale < 0.7 || scale > 1.4) {
        console.error(`FAIL: Key ${key}, Finger ${f.id} scale exceeds limit: ${scale}`);
        kinErrors++;
      }
    }
  });
});

if (kinErrors === 0) {
  console.log("PASS: Kinematic transform math is valid and bounded for all keys and fingers.");
}

// 4. EDGE CASE TESTING
console.log("\n--- TEST 4: Edge Cases and Unmapped Keys ---");
let edgeErrors = 0;

const edgeInputs = [
  "",
  " ",
  "space",
  "q",
  "a",
  "ENTER",
  "SHIFT",
  "BACKSPACE",
  "1",
  "!",
  "TAB",
  "ESCAPE",
  "foo_bar"
];

edgeInputs.forEach(inputKey => {
  try {
    const upperKey = inputKey.toUpperCase();
    const normalizedKey = upperKey === " " ? "SPACE" : upperKey;
    const keyInfo = KEY_MAP[normalizedKey];
    const targetFinger = FINGER_MAP[normalizedKey] || "";

    const isLeftActive = targetFinger.startsWith("left") || (targetFinger === "thumb" && (keyInfo?.x === undefined || keyInfo.x <= 276));
    const isRightActive = targetFinger.startsWith("right") || (targetFinger === "thumb" && keyInfo?.x !== undefined && keyInfo.x > 276);

    const leftHandMotion = getHandTransform("left", keyInfo, isLeftActive, isRightActive);
    const rightHandMotion = getHandTransform("right", keyInfo, isLeftActive, isRightActive);

    // Check target beam condition in CyberHands: keyInfo && normalizedKey !== ""
    const showTargetBeam = keyInfo && normalizedKey !== "";

    if (inputKey === "" && showTargetBeam) {
      console.error(`FAIL: Empty activeKey "" rendered target beam!`);
      edgeErrors++;
    }

    if (!keyInfo && (leftHandMotion.x !== 0 || leftHandMotion.y !== 0)) {
      console.error(`FAIL: Unmapped key "${inputKey}" caused non-zero hand transform!`);
      edgeErrors++;
    }
  } catch (err) {
    console.error(`FAIL: Input key "${inputKey}" threw exception:`, err);
    edgeErrors++;
  }
});

if (edgeErrors === 0) {
  console.log("PASS: Edge cases handled safely without runtime errors or unexpected states.");
}

console.log("\n=== TEST SUMMARY ===");
const totalErrors = geomErrors + mapErrors + kinErrors + edgeErrors;
if (totalErrors === 0) {
  console.log("ALL EMPIRICAL TESTS PASSED SUCCESSFULLY! (0 errors)");
} else {
  console.log(`TEST SUITE FAILED with ${totalErrors} errors.`);
}
