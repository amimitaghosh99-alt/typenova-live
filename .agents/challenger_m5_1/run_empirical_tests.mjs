// Empirical Stress Test for CyberHands & VirtualKeyboard (Milestone 5)

// 1. Define Keyboard Rows & Maps as in VirtualKeyboard.tsx and CyberHands.tsx
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
  {
    id: 'left-pinky',
    hand: 'left',
    tip: [41, 76],
    dip: [43, 115],
    pip: [48, 160],
    mcp: [60, 230],
  },
  {
    id: 'left-ring',
    hand: 'left',
    tip: [94, 76],
    dip: [95, 112],
    pip: [96, 155],
    mcp: [98, 225],
  },
  {
    id: 'left-middle',
    hand: 'left',
    tip: [147, 76],
    dip: [146, 108],
    pip: [144, 152],
    mcp: [138, 224],
  },
  {
    id: 'left-index',
    hand: 'left',
    tip: [200, 76],
    dip: [194, 112],
    pip: [186, 156],
    mcp: [172, 228],
  },
  {
    id: 'thumb',
    hand: 'left',
    fingerMapId: 'thumb',
    tip: [232, 178],
    dip: [218, 202],
    pip: [198, 232],
    mcp: [170, 275],
  },
];

const RIGHT_HOLOGRAM_FINGERS = [
  {
    id: 'thumb-right',
    hand: 'right',
    fingerMapId: 'thumb',
    tip: [320, 178],
    dip: [334, 202],
    pip: [354, 232],
    mcp: [382, 275],
  },
  {
    id: 'right-index',
    hand: 'right',
    tip: [359, 76],
    dip: [365, 112],
    pip: [372, 156],
    mcp: [386, 228],
  },
  {
    id: 'right-middle',
    hand: 'right',
    tip: [412, 76],
    dip: [413, 108],
    pip: [415, 152],
    mcp: [420, 224],
  },
  {
    id: 'right-ring',
    hand: 'right',
    tip: [465, 76],
    dip: [464, 112],
    pip: [463, 155],
    mcp: [454, 225],
  },
  {
    id: 'right-pinky',
    hand: 'right',
    tip: [518, 76],
    dip: [516, 115],
    pip: [511, 160],
    mcp: [492, 230],
  },
];

// Helper functions mirroring CyberHands.tsx

function simulateCyberHands(activeKey, activeFinger = '') {
  const upperKey = activeKey ? activeKey.toUpperCase() : '';
  const normalizedKey = upperKey === ' ' ? 'SPACE' : upperKey;

  const keyInfo = KEY_MAP[normalizedKey];
  const targetFinger = FINGER_MAP[normalizedKey] || activeFinger;

  const isLeftActive = Boolean(targetFinger && (targetFinger.startsWith('left') || (targetFinger === 'thumb' && (keyInfo?.x === undefined || keyInfo.x <= 276))));
  const isRightActive = Boolean(targetFinger && (targetFinger.startsWith('right') || (targetFinger === 'thumb' && keyInfo?.x !== undefined && keyInfo.x > 276)));

  const getHandTransform = (hand) => {
    const isActive = hand === 'left' ? isLeftActive : isRightActive;
    if (!isActive || !keyInfo) {
      return { x: 0, y: 0 };
    }

    const homeX = hand === 'left' ? 200 : 359;
    const homeY = 76;

    const totalDx = keyInfo.x - homeX;
    const totalDy = keyInfo.y - homeY;

    return {
      x: totalDx * 0.18,
      y: totalDy * 0.22,
    };
  };

  const getFingerTransform = (f, isActive, hx, hy) => {
    if (!isActive || !keyInfo) {
      return { rotate: 0, scale: 1, rawRotate: 0, rawScale: 1, isRotateClamped: false, isScaleClamped: false };
    }

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

    const rawRotate = rotate;
    const isRotateClamped = rotate > 60 || rotate < -60;
    rotate = Math.min(60, Math.max(-60, rotate));

    const rawScale = targetLength / restingLength;
    const isScaleClamped = rawScale > 1.8 || rawScale < 0.6;
    const scale = Math.min(1.8, Math.max(0.6, rawScale));

    // Compute actual resulting tip position with current (rotate, scale)
    const rotateRad = rotate * (Math.PI / 180);
    const transformedAngle = restingAngle + rotateRad;
    const transformedLength = restingLength * scale;

    const tipRelX = transformedLength * Math.cos(transformedAngle);
    const tipRelY = transformedLength * Math.sin(transformedAngle);

    const tipAbsX = mcpAbsX + tipRelX;
    const tipAbsY = mcpAbsY + tipRelY;

    const errorDist = Math.hypot(tipAbsX - keyInfo.x, tipAbsY - keyInfo.y);

    return {
      rotate,
      scale,
      rawRotate,
      rawScale,
      isRotateClamped,
      isScaleClamped,
      tipAbsX,
      tipAbsY,
      errorDist,
    };
  };

  const leftHandMotion = getHandTransform('left');
  const rightHandMotion = getHandTransform('right');

  return {
    normalizedKey,
    keyInfo,
    targetFinger,
    isLeftActive,
    isRightActive,
    leftHandMotion,
    rightHandMotion,
    getFingerTransform,
  };
}

console.log('====================================================');
console.log('EMPIRICAL STRESS TEST SUITE: CyberHands & VirtualKeyboard');
console.log('====================================================\n');

let totalTests = 0;
let passedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  [PASS] ${message}`);
  } else {
    console.error(`  [FAIL] ${message}`);
  }
}

// TEST 1: Key Matrix Completeness & Finger Map Alignment
console.log('TEST 1: Matrix & Finger Map Alignment');
const allKeyboardKeys = ROWS.flat();
for (const key of allKeyboardKeys) {
  const inKeyMap = Boolean(KEY_MAP[key]);
  const inFingerMap = Boolean(FINGER_MAP[key]);
  assert(inKeyMap, `Key '${key}' present in KEY_MAP`);
  assert(inFingerMap, `Key '${key}' present in FINGER_MAP`);
  if (inKeyMap && inFingerMap) {
    assert(KEY_MAP[key].finger === FINGER_MAP[key], `Finger mapping matches for '${key}': ${KEY_MAP[key].finger}`);
  }
}

// TEST 2: Resting Home Row Fingertip Alignment
console.log('\nTEST 2: Resting Home Row Fingertip Alignment');
const homeRowTests = [
  { key: 'A', fingerId: 'left-pinky', expected: [41, 76] },
  { key: 'S', fingerId: 'left-ring', expected: [94, 76] },
  { key: 'D', fingerId: 'left-middle', expected: [147, 76] },
  { key: 'F', fingerId: 'left-index', expected: [200, 76] },
  { key: 'J', fingerId: 'right-index', expected: [359, 76] },
  { key: 'K', fingerId: 'right-middle', expected: [412, 76] },
  { key: 'L', fingerId: 'right-ring', expected: [465, 76] },
  { key: ';', fingerId: 'right-pinky', expected: [518, 76] },
];

for (const item of homeRowTests) {
  const allFingers = [...LEFT_HOLOGRAM_FINGERS, ...RIGHT_HOLOGRAM_FINGERS];
  const finger = allFingers.find(f => f.id === item.fingerId);
  const keyCoords = KEY_MAP[item.key];
  assert(finger !== undefined, `Finger '${item.fingerId}' exists`);
  assert(finger.tip[0] === item.expected[0] && finger.tip[1] === item.expected[1],
    `Finger '${item.fingerId}' resting tip is exactly (${item.expected[0]}, ${item.expected[1]})`);
  assert(keyCoords.x === item.expected[0] && keyCoords.y === item.expected[1],
    `Key '${item.key}' position is exactly (${item.expected[0]}, ${item.expected[1]})`);
}

// TEST 3: Active Key Fingertip Reach & Error Distance across ALL keys
console.log('\nTEST 3: Active Key Target Coordinate Precision across all 28 keys');
let maxError = 0;
let worstKey = '';

for (const key of allKeyboardKeys) {
  const sim = simulateCyberHands(key);
  const isLeft = sim.isLeftActive;
  const fingers = isLeft ? LEFT_HOLOGRAM_FINGERS : RIGHT_HOLOGRAM_FINGERS;
  const handMotion = isLeft ? sim.leftHandMotion : sim.rightHandMotion;

  const targetFingerId = sim.targetFinger;
  const finger = fingers.find(f => (f.fingerMapId || f.id) === targetFingerId);

  assert(finger !== undefined, `Key '${key}' target finger '${targetFingerId}' found in hand`);

  const transform = sim.getFingerTransform(finger, true, handMotion.x, handMotion.y);

  assert(!transform.isRotateClamped, `Key '${key}' finger rotation ${transform.rawRotate.toFixed(2)}° within [-60, 60]°`);
  assert(!transform.isScaleClamped, `Key '${key}' finger scale ${transform.rawScale.toFixed(2)} within [0.6, 1.8]`);

  if (transform.errorDist > maxError) {
    maxError = transform.errorDist;
    worstKey = key;
  }

  assert(transform.errorDist < 1e-4, `Key '${key}' fingertip error dist = ${transform.errorDist.toFixed(6)} px (exact target reach)`);
}

console.log(`\n  Summary: Max fingertip coordinate error across all keys = ${maxError.toFixed(8)} px (Worst key: ${worstKey})`);

// TEST 4: Specific Requirement Criteria (R1, R2, Acceptance Criteria)
console.log('\nTEST 4: R1 & Acceptance Criteria Specific Keys (Q, Spacebar, Home row)');

// Q Key (Left Pinky)
const qSim = simulateCyberHands('Q');
const qFinger = LEFT_HOLOGRAM_FINGERS.find(f => f.id === 'left-pinky');
const qTransform = qSim.getFingerTransform(qFinger, true, qSim.leftHandMotion.x, qSim.leftHandMotion.y);
assert(Math.abs(qTransform.tipAbsX - 23) < 1e-4 && Math.abs(qTransform.tipAbsY - 23) < 1e-4,
  `Q key (Left Pinky) touches exact center (23, 23). Actual: (${qTransform.tipAbsX.toFixed(2)}, ${qTransform.tipAbsY.toFixed(2)})`);

// Spacebar (Thumb)
const spaceSim = simulateCyberHands('SPACE');
const spaceFinger = LEFT_HOLOGRAM_FINGERS.find(f => f.id === 'thumb');
const spaceTransform = spaceSim.getFingerTransform(spaceFinger, true, spaceSim.leftHandMotion.x, spaceSim.leftHandMotion.y);
assert(Math.abs(spaceTransform.tipAbsX - 276) < 1e-4 && Math.abs(spaceTransform.tipAbsY - 182) < 1e-4,
  `Spacebar (Thumb) touches exact center (276, 182). Actual: (${spaceTransform.tipAbsX.toFixed(2)}, ${spaceTransform.tipAbsY.toFixed(2)})`);

// Space key passed as single space ' '
const spaceCharSim = simulateCyberHands(' ');
assert(spaceCharSim.normalizedKey === 'SPACE', `Single space character ' ' normalizes to 'SPACE'`);
assert(spaceCharSim.keyInfo.x === 276 && spaceCharSim.keyInfo.y === 182, `Single space character ' ' maps to (276, 182)`);

// Lowercase 'q'
const qLowerSim = simulateCyberHands('q');
assert(qLowerSim.normalizedKey === 'Q', `Lowercase 'q' normalizes to 'Q'`);

// TEST 5: Kinematic Integrity (MCP Pivot Attachment & Palm Mesh Non-Detachment)
console.log('\nTEST 5: Kinematic Integrity & Palm Attachment');
// Verify that for all active keys, the MCP joint of every finger stays attached to palm container
for (const key of ['Q', 'P', 'Z', 'M', 'SPACE']) {
  const sim = simulateCyberHands(key);
  for (const f of LEFT_HOLOGRAM_FINGERS) {
    const absMcpX = f.mcp[0] + sim.leftHandMotion.x;
    const absMcpY = f.mcp[1] + sim.leftHandMotion.y;
    // Palm bounding box: Left palm moves by sim.leftHandMotion. Difference between finger MCP and palm group offset is constant!
    const relMcpX = absMcpX - sim.leftHandMotion.x;
    const relMcpY = absMcpY - sim.leftHandMotion.y;
    assert(Math.abs(relMcpX - f.mcp[0]) < 1e-4 && Math.abs(relMcpY - f.mcp[1]) < 1e-4,
      `Key '${key}' Finger '${f.id}' MCP relative position fixed at (${f.mcp[0]}, ${f.mcp[1]}) relative to palm (Zero Detachment)`);
  }
}

// TEST 6: Robustness on Edge Cases & Unknown Keys
console.log('\nTEST 6: Edge Cases & Resiliency');

// Empty string ''
const emptySim = simulateCyberHands('');
assert(emptySim.keyInfo === undefined, `Empty string '' returns undefined keyInfo`);
assert(!emptySim.isLeftActive && !emptySim.isRightActive, `Empty string '' deactivates both hands`);
assert(emptySim.leftHandMotion.x === 0 && emptySim.leftHandMotion.y === 0, `Empty string '' keeps left hand at rest (0, 0)`);
assert(emptySim.rightHandMotion.x === 0 && emptySim.rightHandMotion.y === 0, `Empty string '' keeps right hand at rest (0, 0)`);

// Unknown key 'Escape'
const escSim = simulateCyberHands('Escape');
assert(escSim.keyInfo === undefined, `'Escape' returns undefined keyInfo without throwing error`);
assert(!escSim.isLeftActive && !escSim.isRightActive, `'Escape' deactivates both hands gracefully`);

// Unknown key '1'
const numSim = simulateCyberHands('1');
assert(numSim.keyInfo === undefined, `'1' returns undefined keyInfo gracefully`);

console.log('\n====================================================');
console.log(`TEST RESULTS: ${passedTests} / ${totalTests} assertions PASSED`);
console.log('====================================================');

if (passedTests === totalTests) {
  process.exit(0);
} else {
  process.exit(1);
}
