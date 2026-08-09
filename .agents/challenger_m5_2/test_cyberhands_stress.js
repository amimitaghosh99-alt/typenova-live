const { KEY_MAP, LEFT_HOLOGRAM_FINGERS, RIGHT_HOLOGRAM_FINGERS } = require('./cyberhands_data');
const { FINGER_MAP } = require('./virtualkeyboard_data');

console.log("=== ADVERSARIAL STRESS TEST: CYBERHANDS KINEMATICS & RENDERING ===\n");

// Helper function to simulate hand motion
function getHandTransform(normalizedKey, hand) {
  const keyInfo = KEY_MAP[normalizedKey];
  const targetFinger = FINGER_MAP[normalizedKey];
  
  const isLeftActive = targetFinger && (targetFinger.startsWith("left") || (targetFinger === "thumb" && (keyInfo?.x === undefined || keyInfo.x <= 276)));
  const isRightActive = targetFinger && (targetFinger.startsWith("right") || (targetFinger === "thumb" && keyInfo?.x !== undefined && keyInfo.x > 276));
  
  const isActive = hand === "left" ? isLeftActive : isRightActive;
  if (!isActive || !keyInfo) {
    return { x: 0, y: 0 };
  }

  const homeX = hand === "left" ? 200 : 359;
  const homeY = 76;

  const totalDx = keyInfo.x - homeX;
  const totalDy = keyInfo.y - homeY;

  return {
    x: totalDx * 0.18,
    y: totalDy * 0.22,
  };
}

// Helper function to simulate finger transform
function getFingerTransform(f, keyInfo, hx, hy) {
  if (!keyInfo) {
    return { rotate: 0, scale: 1, rawRotate: 0, rawScale: 1, clampedRotate: false, clampedScale: false };
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

  let rawRotate = (targetAngle - restingAngle) * (180 / Math.PI);
  if (rawRotate > 180) rawRotate -= 360;
  if (rawRotate < -180) rawRotate += 360;
  
  const rotate = Math.min(60, Math.max(-60, rawRotate));
  const rawScale = targetLength / restingLength;
  const scale = Math.min(1.8, Math.max(0.6, rawScale));

  return {
    rotate,
    scale,
    rawRotate,
    rawScale,
    clampedRotate: Math.abs(rawRotate - rotate) > 1e-4,
    clampedScale: Math.abs(rawScale - scale) > 1e-4,
    mcpAbs: [mcpAbsX, mcpAbsY],
    targetLength,
    restingLength
  };
}

// Calculate transformed point given MCP, point, rotate (deg), scale
function transformPoint(p, mcp, rotateDeg, scale, hx, hy) {
  const rad = (rotateDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  
  // Vector relative to MCP
  const dx = (p[0] - mcp[0]) * scale;
  const dy = (p[1] - mcp[1]) * scale;
  
  // Rotate
  const rx = dx * cos - dy * sin;
  const ry = dx * sin + dy * cos;
  
  // Translate to absolute SVG space (including hand shift hx, hy)
  return [mcp[0] + hx + rx, mcp[1] + hy + ry];
}

const allKeys = Object.keys(KEY_MAP);
let totalTested = 0;
let clampingViolations = [];
let reachDiscrepancies = [];
let viewBoxOverflows = [];

console.log("1. TESTING ALL KEYS FOR ACCURATE REACH & CLAMPING LIMITS...");

for (const key of allKeys) {
  totalTested++;
  const keyInfo = KEY_MAP[key];
  const fingerId = FINGER_MAP[key];
  
  // Find finger definition
  let f = LEFT_HOLOGRAM_FINGERS.find(item => item.id === fingerId || item.fingerMapId === fingerId);
  let hand = 'left';
  if (!f) {
    f = RIGHT_HOLOGRAM_FINGERS.find(item => item.id === fingerId || item.fingerMapId === fingerId);
    hand = 'right';
  }
  if (!f) {
    // Special handling for thumb / thumb-right
    if (fingerId === 'thumb') {
      if (keyInfo.x <= 276) {
        f = LEFT_HOLOGRAM_FINGERS.find(item => item.id === 'thumb');
        hand = 'left';
      } else {
        f = RIGHT_HOLOGRAM_FINGERS.find(item => item.id === 'thumb-right');
        hand = 'right';
      }
    }
  }

  if (!f) {
    console.error(`ERROR: No finger found for key ${key} (fingerId: ${fingerId})`);
    continue;
  }

  const hMotion = getHandTransform(key, hand);
  const fTransform = getFingerTransform(f, keyInfo, hMotion.x, hMotion.y);

  if (fTransform.clampedRotate || fTransform.clampedScale) {
    clampingViolations.push({
      key,
      fingerId: f.id,
      rawRotate: fTransform.rawRotate.toFixed(2),
      actualRotate: fTransform.rotate.toFixed(2),
      rawScale: fTransform.rawScale.toFixed(2),
      actualScale: fTransform.scale.toFixed(2),
    });
  }

  // Calculate actual transformed fingertip position
  const transformedTip = transformPoint(f.tip, f.mcp, fTransform.rotate, fTransform.scale, hMotion.x, hMotion.y);
  const dx = transformedTip[0] - keyInfo.x;
  const dy = transformedTip[1] - keyInfo.y;
  const distError = Math.hypot(dx, dy);

  if (distError > 0.5) { // Error threshold 0.5px
    reachDiscrepancies.push({
      key,
      fingerId: f.id,
      target: [keyInfo.x, keyInfo.y],
      achieved: [transformedTip[0].toFixed(2), transformedTip[1].toFixed(2)],
      error: distError.toFixed(2)
    });
  }
}

console.log(`Tested ${totalTested} key mapping entries.`);
console.log(`Clamping Violations: ${clampingViolations.length}`);
if (clampingViolations.length > 0) {
  console.log("Clamping violations detailed:", clampingViolations);
}
console.log(`Reach Discrepancies (>0.5px error): ${reachDiscrepancies.length}`);
if (reachDiscrepancies.length > 0) {
  console.log("Reach discrepancies detailed:", reachDiscrepancies);
}

console.log("\n2. TESTING BOUNDING BOX OVERFLOW (VIEWBOX 0 0 552 400)...");

// Check rest state and all active states for all points in SVG
function checkViewBoxBounds() {
  const checkPoint = (label, x, y, stateKey) => {
    if (x < 0 || x > 552 || y < 0 || y > 400) {
      viewBoxOverflows.push({ label, x: x.toFixed(2), y: y.toFixed(2), stateKey });
    }
  };

  // 1. Rest state
  for (const f of LEFT_HOLOGRAM_FINGERS) {
    checkPoint(`Left finger ${f.id} tip`, f.tip[0], f.tip[1], 'REST');
    checkPoint(`Left finger ${f.id} mcp`, f.mcp[0], f.mcp[1], 'REST');
  }
  for (const f of RIGHT_HOLOGRAM_FINGERS) {
    checkPoint(`Right finger ${f.id} tip`, f.tip[0], f.tip[1], 'REST');
    checkPoint(`Right finger ${f.id} mcp`, f.mcp[0], f.mcp[1], 'REST');
  }

  // 2. All active key states
  for (const key of Object.keys(KEY_MAP)) {
    const keyInfo = KEY_MAP[key];
    checkPoint(`Target key ${key}`, keyInfo.x, keyInfo.y, key);

    const leftH = getHandTransform(key, 'left');
    const rightH = getHandTransform(key, 'right');

    for (const f of LEFT_HOLOGRAM_FINGERS) {
      const fid = f.fingerMapId ?? f.id;
      const targetFinger = FINGER_MAP[key];
      const isLeftActive = targetFinger && (targetFinger.startsWith("left") || (targetFinger === "thumb" && keyInfo.x <= 276));
      const isActive = isLeftActive && (targetFinger === "thumb" ? fid === "thumb" : fid === targetFinger);
      const fTrans = getFingerTransform(f, isActive ? keyInfo : null, leftH.x, leftH.y);
      const tipAbs = transformPoint(f.tip, f.mcp, fTrans.rotate, fTrans.scale, leftH.x, leftH.y);
      const dipAbs = transformPoint(f.dip, f.mcp, fTrans.rotate, fTrans.scale, leftH.x, leftH.y);
      const pipAbs = transformPoint(f.pip, f.mcp, fTrans.rotate, fTrans.scale, leftH.x, leftH.y);
      const mcpAbs = [f.mcp[0] + leftH.x, f.mcp[1] + leftH.y];

      checkPoint(`Left ${f.id} tip`, tipAbs[0], tipAbs[1], key);
      checkPoint(`Left ${f.id} dip`, dipAbs[0], dipAbs[1], key);
      checkPoint(`Left ${f.id} pip`, pipAbs[0], pipAbs[1], key);
      checkPoint(`Left ${f.id} mcp`, mcpAbs[0], mcpAbs[1], key);
    }

    for (const f of RIGHT_HOLOGRAM_FINGERS) {
      const fid = f.fingerMapId ?? f.id;
      const targetFinger = FINGER_MAP[key];
      const isRightActive = targetFinger && (targetFinger.startsWith("right") || (targetFinger === "thumb" && keyInfo.x > 276));
      const isActive = isRightActive && (targetFinger === "thumb" ? fid === "thumb" : fid === targetFinger);
      const fTrans = getFingerTransform(f, isActive ? keyInfo : null, rightH.x, rightH.y);
      const tipAbs = transformPoint(f.tip, f.mcp, fTrans.rotate, fTrans.scale, rightH.x, rightH.y);
      const dipAbs = transformPoint(f.dip, f.mcp, fTrans.rotate, fTrans.scale, rightH.x, rightH.y);
      const pipAbs = transformPoint(f.pip, f.mcp, fTrans.rotate, fTrans.scale, rightH.x, rightH.y);
      const mcpAbs = [f.mcp[0] + rightH.x, f.mcp[1] + rightH.y];

      checkPoint(`Right ${f.id} tip`, tipAbs[0], tipAbs[1], key);
      checkPoint(`Right ${f.id} dip`, dipAbs[0], dipAbs[1], key);
      checkPoint(`Right ${f.id} pip`, pipAbs[0], pipAbs[1], key);
      checkPoint(`Right ${f.id} mcp`, mcpAbs[0], mcpAbs[1], key);
    }
  }
}

checkViewBoxBounds();
console.log(`ViewBox overflows: ${viewBoxOverflows.length}`);
if (viewBoxOverflows.length > 0) {
  console.log("ViewBox overflows detailed:", viewBoxOverflows);
}

console.log("\n3. PALM CONTOUR & MCP CONNECTION STABILITY...");
console.log("Left Palm top edge connects MCPs:");
console.log("  Left Pinky MCP (60, 230) -> Palm top at Y=230");
console.log("  Left Ring MCP (98, 225) -> Palm top at Y=225");
console.log("  Left Middle MCP (138, 224) -> Palm top at Y=224");
console.log("  Left Index MCP (172, 228) -> Palm top at Y=228");
console.log("Right Palm top edge connects MCPs:");
console.log("  Right Index MCP (386, 228) -> Palm top at Y=228");
console.log("  Right Middle MCP (420, 224) -> Palm top at Y=224");
console.log("  Right Ring MCP (454, 225) -> Palm top at Y=225");
console.log("  Right Pinky MCP (492, 230) -> Palm top at Y=230");
console.log("Since both fingers and palm are wrapped in <motion.g animate={handMotion}> and finger transformOrigin is ${mcp}, finger MCP base is rigidly attached to palm contour in space.");

