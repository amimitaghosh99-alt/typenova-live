// Kinematics Empirical Test Harness for Milestone 3 CyberHands

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

const LEFT_HOLOGRAM_FINGERS = [
  {
    id: 'left-pinky',
    hand: 'left',
    tip: [41, 76],
    mcp: [60, 230],
    contourPath: 'M 48,245 C 49,235 44,190 35,145 C 31,90 34,70 41,76 C 48,70 51,90 49,115 C 47,145 57,190 69,235 L 70,245 C 60,250 56,250 48,245 Z',
  },
  {
    id: 'left-ring',
    hand: 'left',
    tip: [94, 76],
    mcp: [98, 225],
    contourPath: 'M 83,240 C 84,230 84,185 85,140 C 87,88 89,68 94,76 C 99,68 101,88 102,112 C 103,140 104,185 108,230 L 109,240 C 96,245 92,245 83,240 Z',
  },
  {
    id: 'left-middle',
    hand: 'left',
    tip: [147, 76],
    mcp: [138, 224],
    contourPath: 'M 124,240 C 125,230 131,180 135,135 C 137,88 141,68 147,76 C 153,68 157,88 156,108 C 155,135 151,180 147,230 L 148,240 C 136,245 132,245 124,240 Z',
  },
  {
    id: 'left-index',
    hand: 'left',
    tip: [200, 76],
    mcp: [172, 228],
    contourPath: 'M 158,245 C 159,233 170,185 178,140 C 189,88 194,68 200,76 C 206,68 202,88 201,112 C 194,140 192,185 183,233 L 184,245 C 171,250 167,250 158,245 Z',
  },
  {
    id: 'thumb',
    hand: 'left',
    fingerMapId: 'thumb',
    tip: [232, 178],
    mcp: [170, 275],
    contourPath: 'M 154,285 C 160,278 176,248 198,218 C 222,178 236,170 234,182 C 224,208 205,242 191,280 L 198,290 C 175,295 165,292 154,285 Z',
  },
];

const RIGHT_HOLOGRAM_FINGERS = [
  {
    id: 'thumb-right',
    hand: 'right',
    fingerMapId: 'thumb',
    tip: [320, 178],
    mcp: [382, 275],
    contourPath: 'M 398,285 C 392,278 376,248 354,218 C 330,178 316,170 318,182 C 328,208 347,242 361,280 L 354,290 C 377,295 387,292 398,285 Z',
  },
  {
    id: 'right-index',
    hand: 'right',
    tip: [359, 76],
    mcp: [386, 228],
    contourPath: 'M 368,245 C 369,233 360,185 358,140 C 350,88 346,68 352,76 C 358,68 363,88 367,112 C 374,140 382,185 393,233 L 394,245 C 385,250 377,250 368,245 Z',
  },
  {
    id: 'right-middle',
    hand: 'right',
    tip: [412, 76],
    mcp: [420, 224],
    contourPath: 'M 404,240 C 405,230 401,180 397,135 C 395,88 399,68 405,76 C 411,68 415,88 416,108 C 417,135 421,180 427,230 L 428,240 C 416,245 412,245 404,240 Z',
  },
  {
    id: 'right-ring',
    hand: 'right',
    tip: [465, 76],
    mcp: [454, 225],
    contourPath: 'M 443,240 C 444,230 446,185 447,140 C 449,88 451,68 456,76 C 461,68 463,88 464,112 C 465,140 466,185 468,230 L 469,240 C 460,245 452,245 443,240 Z',
  },
  {
    id: 'right-pinky',
    hand: 'right',
    tip: [518, 76],
    mcp: [492, 230],
    contourPath: 'M 482,245 C 483,235 494,190 504,145 C 501,90 504,70 511,76 C 517,70 520,90 519,115 C 517,145 508,190 503,235 L 504,245 C 496,250 492,250 482,245 Z',
  },
];

// Helper to extract SVG path numbers (points)
function extractPathPoints(pathStr) {
  const matches = pathStr.match(/[-+]?\d*\.?\d+/g);
  if (!matches) return [];
  const numbers = matches.map(Number);
  const points = [];
  for (let i = 0; i < numbers.length - 1; i += 2) {
    points.push([numbers[i], numbers[i + 1]]);
  }
  return points;
}

function getHandTransform(hand, keyInfo, isLeftActive, isRightActive) {
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
}

function getFingerTransform(f, isActive, keyInfo, hx, hy) {
  if (!isActive || !keyInfo) {
    return { rotate: 0, scale: 1, rawRotate: 0, rawScale: 1 };
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
  const rawScale = targetLength / restingLength;

  rotate = Math.min(60, Math.max(-60, rotate));
  const scale = Math.min(1.8, Math.max(0.6, rawScale));

  return { rotate, scale, rawRotate, rawScale };
}

function transformPoint(px, py, mcpX, mcpY, rotateDeg, scale, hx, hy) {
  const dx = px - mcpX;
  const dy = py - mcpY;
  const rad = (rotateDeg * Math.PI) / 180;
  const rx = (dx * Math.cos(rad) - dy * Math.sin(rad)) * scale;
  const ry = (dx * Math.sin(rad) + dy * Math.cos(rad)) * scale;
  return [mcpX + rx + hx, mcpY + ry + hy];
}

console.log("=================================================");
console.log("CYBERHANDS KINEMATICS EMPIRICAL STRESS TEST SUITE");
console.log("=================================================");

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const detailedFailures = [];

const allFingers = [...LEFT_HOLOGRAM_FINGERS, ...RIGHT_HOLOGRAM_FINGERS];

// 1. TEST FINGERTIP TARGETING FOR ALL 28 KEYS
console.log("\n--- TEST 1: Fingertip Target Coordinates Accuracy ---");

Object.entries(KEY_MAP).forEach(([key, keyInfo]) => {
  totalTests++;
  const targetFinger = FINGER_MAP[key];
  const isLeftActive = targetFinger.startsWith("left") || (targetFinger === "thumb" && keyInfo.x <= 276);
  const isRightActive = targetFinger.startsWith("right") || (targetFinger === "thumb" && keyInfo.x > 276);

  const activeHand = isLeftActive ? "left" : "right";
  const fingers = activeHand === "left" ? LEFT_HOLOGRAM_FINGERS : RIGHT_HOLOGRAM_FINGERS;
  
  const fingerObj = fingers.find(f => (f.fingerMapId || f.id) === targetFinger);
  if (!fingerObj) {
    console.error(`ERROR: Finger '${targetFinger}' not found for key '${key}'`);
    failedTests++;
    return;
  }

  const hTrans = getHandTransform(activeHand, keyInfo, isLeftActive, isRightActive);
  const fTrans = getFingerTransform(fingerObj, true, keyInfo, hTrans.x, hTrans.y);

  const [actualX, actualY] = transformPoint(
    fingerObj.tip[0], fingerObj.tip[1],
    fingerObj.mcp[0], fingerObj.mcp[1],
    fTrans.rotate, fTrans.scale,
    hTrans.x, hTrans.y
  );

  const errorDist = Math.hypot(actualX - keyInfo.x, actualY - keyInfo.y);
  const isClamped = (fTrans.rotate !== fTrans.rawRotate) || (fTrans.scale !== fTrans.rawScale);

  if (errorDist < 0.001) {
    passedTests++;
    console.log(`[PASS] Key '${key.padEnd(5)}' (${targetFinger.padEnd(12)}): Target (${keyInfo.x}, ${keyInfo.y}) -> Actual (${actualX.toFixed(2)}, ${actualY.toFixed(2)}) Error: ${errorDist.toFixed(4)}px | Rot: ${fTrans.rotate.toFixed(1)}° Scale: ${fTrans.scale.toFixed(3)}`);
  } else {
    failedTests++;
    const failInfo = `[FAIL] Key '${key}' (${targetFinger}): Expected (${keyInfo.x}, ${keyInfo.y}), Got (${actualX.toFixed(2)}, ${actualY.toFixed(2)}), Error: ${errorDist.toFixed(2)}px (Clamped: Rot ${fTrans.rawRotate.toFixed(1)}° -> ${fTrans.rotate.toFixed(1)}°, Scale ${fTrans.rawScale.toFixed(3)} -> ${fTrans.scale.toFixed(3)})`;
    detailedFailures.push(failInfo);
    console.error(failInfo);
  }
});

// 2. STRESS TEST SPECIFIC EXTREME KEYS FROM DISPATCH
console.log("\n--- TEST 2: Extreme Keys Deep Dive ---");
const extremeKeys = ['Q', 'P', 'SPACE', 'Z', 'M'];
extremeKeys.forEach(key => {
  const keyInfo = KEY_MAP[key];
  const targetFinger = FINGER_MAP[key];
  const isLeftActive = targetFinger.startsWith("left") || (targetFinger === "thumb" && keyInfo.x <= 276);
  const isRightActive = targetFinger.startsWith("right") || (targetFinger === "thumb" && keyInfo.x > 276);
  const activeHand = isLeftActive ? "left" : "right";
  const fingers = activeHand === "left" ? LEFT_HOLOGRAM_FINGERS : RIGHT_HOLOGRAM_FINGERS;
  const fingerObj = fingers.find(f => (f.fingerMapId || f.id) === targetFinger);

  const hTrans = getHandTransform(activeHand, keyInfo, isLeftActive, isRightActive);
  const fTrans = getFingerTransform(fingerObj, true, keyInfo, hTrans.x, hTrans.y);

  console.log(`Key '${key}': Target (${keyInfo.x}, ${keyInfo.y}) | HandShift (${hTrans.x.toFixed(2)}, ${hTrans.y.toFixed(2)}) | RawRot: ${fTrans.rawRotate.toFixed(2)}°, ClampedRot: ${fTrans.rotate.toFixed(2)}° | RawScale: ${fTrans.rawScale.toFixed(4)}, ClampedScale: ${fTrans.scale.toFixed(4)}`);
});

// 3. PALM SOCKET DETACHMENT TEST (BASE CONTOUR ROTATION ANALYSIS)
console.log("\n--- TEST 3: Palm Socket Detachment & Contour Base Coverage ---");

// Left Palm Rim Top Y is ~224..228. Base of left palm socket is at Y ~230.
// Right Palm Rim Top Y is ~224..228.
// If any transformed point of the finger base contour goes HIGHER (y < 224) than the top rim of the palm socket,
// or if the bottom edge of the finger base floats above y = 230 without palm coverage, check maximum gap.

allFingers.forEach(f => {
  const points = extractPathPoints(f.contourPath);
  // Find bottom contour base points (resting y >= 230)
  const basePoints = points.filter(pt => pt[1] >= 230);
  
  let maxBaseYShiftUp = -999;
  let worstKey = null;

  Object.entries(KEY_MAP).forEach(([key, keyInfo]) => {
    totalTests++;
    const targetFinger = FINGER_MAP[key];
    const isLeftActive = targetFinger.startsWith("left") || (targetFinger === "thumb" && keyInfo.x <= 276);
    const isRightActive = targetFinger.startsWith("right") || (targetFinger === "thumb" && keyInfo.x > 276);
    const activeHand = isLeftActive ? "left" : "right";
    if (f.hand !== activeHand) return; // test when hand is active

    const isThisFingerActive = (f.fingerMapId || f.id) === targetFinger;

    const hTrans = getHandTransform(activeHand, keyInfo, isLeftActive, isRightActive);
    const fTrans = getFingerTransform(f, isThisFingerActive, keyInfo, hTrans.x, hTrans.y);

    basePoints.forEach(bp => {
      const [tx, ty] = transformPoint(
        bp[0], bp[1],
        f.mcp[0], f.mcp[1],
        fTrans.rotate, fTrans.scale,
        hTrans.x, hTrans.y
      );
      
      // Palm top rim coordinate is approx 224 for left and right
      // Base point resting y is 240..245 (fingers) or 285..290 (thumb).
      // We want to ensure ty (transformed y) remains > 224 (below socket top rim)
      // and that the palm polygon overlaps the base.
      const palmTopRimY = 224 + hTrans.y;
      
      if (ty < palmTopRimY) {
        const gap = palmTopRimY - ty;
        if (gap > maxBaseYShiftUp) {
          maxBaseYShiftUp = gap;
          worstKey = key;
        }
      }
    });
  });

  if (maxBaseYShiftUp <= 0) {
    passedTests++;
    console.log(`[PASS] Socket Attachment for '${f.id.padEnd(12)}': Contour base stays completely below palm socket top rim for all keys.`);
  } else {
    failedTests++;
    const failInfo = `[FAIL] Socket Attachment for '${f.id}': Base contour pulled ${maxBaseYShiftUp.toFixed(2)}px ABOVE palm socket rim under key '${worstKey}'! Detachment possible!`;
    detailedFailures.push(failInfo);
    console.error(failInfo);
  }
});

console.log("\n=================================================");
console.log(`STRESS TEST SUMMARY: ${passedTests}/${totalTests} Passed.`);
if (failedTests > 0) {
  console.log(`FAILED TESTS (${failedTests}):`);
  detailedFailures.forEach(f => console.log(`  - ${f}`));
} else {
  console.log("ALL EMPIRICAL TESTS PASSED PERFECTLY!");
}
console.log("=================================================");

process.exit(failedTests > 0 ? 1 : 0);
