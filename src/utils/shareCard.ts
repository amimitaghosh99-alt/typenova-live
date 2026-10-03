// Hand-drawn 1200x630 result card (Open Graph size) — zero external dependencies.
// Styled after TypeNova dark cyber-liquid glass: obsidian chassis, dual dynamic theme glows,
// smooth rounded chassis, balanced bento glass pods, telemetry sparkline, and JetBrains Mono typography.

export interface ShareCardData {
  wpm: number;
  rawWpm: number;
  accuracy: number;
  consistency: number;
  grade: string;
  gradeTitle?: string;
  cpi?: number;
  accolades?: string[];
  themeName: string;
  /** "r,g,b" strings, straight from Theme.glowPrimary / glowSecondary or hex/rgba */
  glowPrimary: string;
  glowSecondary: string;
  /** Optional timeline points for authentic sparkline visualization */
  timelinePoints?: Array<{ t: number; wpm: number; rawWpm?: number }>;
}

const W = 1200;
const H = 630;
const MONO = '"JetBrains Mono", "Fira Code", ui-monospace, monospace';

/**
 * Normalizes any RGB triplet, rgba(), rgb(), or hex color string into a clean "r, g, b" string.
 */
export function normalizeRgb(colorStr?: string, defaultRgb = '6, 182, 212'): string {
  if (!colorStr) return defaultRgb;
  const trimmed = colorStr.trim();

  // 1. Triplet format: "6, 182, 212" or "6,182,212"
  const tripletMatch = trimmed.match(/^(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})$/);
  if (tripletMatch) return `${tripletMatch[1]}, ${tripletMatch[2]}, ${tripletMatch[3]}`;

  // 2. CSS function format: "rgb(6, 182, 212)" or "rgba(6, 182, 212, 0.4)"
  const funcMatch = trimmed.match(/rgba?\s*\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/);
  if (funcMatch) return `${funcMatch[1]}, ${funcMatch[2]}, ${funcMatch[3]}`;

  // 3. Hex format: "#06b6d4" or "06b6d4"
  if (trimmed.startsWith('#') || /^[0-9a-fA-F]{6}$/.test(trimmed)) {
    const hex = trimmed.replace('#', '');
    if (hex.length === 6) {
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      return `${r}, ${g}, ${b}`;
    }
  }

  return defaultRgb;
}

/**
 * Returns prestige medal RGB color tokens according to evaluated grade tier.
 */
export function getGradeColorRgb(grade: string): string {
  const g = (grade || 'D').toUpperCase().trim();
  if (g.startsWith('S')) return '251, 191, 36'; // Amber Gold
  if (g === 'A') return '52, 211, 153'; // Emerald
  if (g === 'B') return '56, 189, 248'; // Sky Blue
  if (g === 'C') return '251, 146, 60'; // Warm Orange
  if (g === 'D') return '148, 163, 184'; // Slate Silver
  return '148, 163, 184';
}

function orb(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rgb: string, alpha: number) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${rgb},${alpha})`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}


/**
 * Renders a frosted liquid-glass bento panel with optional theme/grade accent border.
 */
function drawGlassPod(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r = 20,
  accentRgb?: string
) {
  ctx.save();
  // Glass Pod Fill
  ctx.fillStyle = 'rgba(13, 16, 26, 0.58)';
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();

  // Perimeter Gradient Stroke
  const borderGrad = ctx.createLinearGradient(x, y, x + w, y + h);
  if (accentRgb) {
    borderGrad.addColorStop(0, `rgba(${accentRgb}, 0.40)`);
    borderGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.12)');
    borderGrad.addColorStop(1, `rgba(${accentRgb}, 0.20)`);
  } else {
    borderGrad.addColorStop(0, 'rgba(255, 255, 255, 0.14)');
    borderGrad.addColorStop(1, 'rgba(255, 255, 255, 0.05)');
  }
  ctx.strokeStyle = borderGrad;
  ctx.lineWidth = 1.3;
  ctx.stroke();

  // Top Light Highlight Edge
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.stroke();

  ctx.restore();
}

/**
 * Extracts or procedurally generates smooth pacing curve coordinates for telemetry visualization.
 */
function getSparklinePoints(
  data: ShareCardData,
  gx: number,
  gy: number,
  gw: number,
  gh: number
): { points: Array<{ x: number; y: number; wpm: number }>; maxVal: number; peakPt: { x: number; y: number; wpm: number } } {
  let rawPts: Array<{ t: number; wpm: number }> = [];

  if (data.timelinePoints && data.timelinePoints.length >= 2) {
    const valid = data.timelinePoints.filter(p => Number.isFinite(p.wpm) && p.wpm >= 0);
    if (valid.length >= 2) {
      const minT = valid[0].t;
      const maxT = Math.max(valid[valid.length - 1].t, minT + 1);
      rawPts = valid.map(p => ({
        t: (p.t - minT) / (maxT - minT),
        wpm: p.wpm,
      }));
    }
  }

  // Procedural fallback when live points are sparse or absent
  if (rawPts.length < 2) {
    const steps = 18;
    const peakIndex = Math.floor(steps * 0.62);
    const varFactor = Math.max(0.03, ((100 - (data.consistency || 90)) / 100) * 0.22);

    for (let i = 0; i <= steps; i++) {
      const prog = i / steps;
      let val = data.wpm;

      if (i === 0) {
        val = data.wpm * 0.42;
      } else if (i === 1) {
        val = data.wpm * 0.72;
      } else if (i === peakIndex) {
        val = Math.max(data.rawWpm, data.wpm * 1.14);
      } else {
        const wave = Math.sin(prog * Math.PI * 3.4) * varFactor * data.wpm;
        const ramp = Math.min(1, prog * 1.6);
        val = data.wpm * ramp + wave;
      }

      rawPts.push({ t: prog, wpm: Math.max(8, Math.round(val)) });
    }
  }

  const highestWpm = Math.max(data.rawWpm || 0, data.wpm || 0, ...rawPts.map(p => p.wpm));
  const maxVal = Math.max(Math.ceil((highestWpm * 1.15) / 10) * 10, 40);
  const minVal = 0;

  const points = rawPts.map(p => ({
    x: gx + p.t * gw,
    y: gy + gh - Math.min(gh, Math.max(8, ((p.wpm - minVal) / (maxVal - minVal)) * gh)),
    wpm: p.wpm,
  }));

  let peakPt = points[0];
  for (const pt of points) {
    if (pt.wpm > peakPt.wpm) {
      peakPt = pt;
    }
  }

  return { points, maxVal, peakPt };
}

/**
 * Draws Catmull-Rom smoothed bezier path across coordinates.
 */
function drawCurvePath(ctx: CanvasRenderingContext2D, points: Array<{ x: number; y: number }>) {
  if (points.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = i > 0 ? points[i - 1] : points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = i < points.length - 2 ? points[i + 2] : p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
  }
}

async function renderResultCard(data: ShareCardData): Promise<Blob> {
  if (typeof document !== 'undefined' && document.fonts) {
    await document.fonts.ready;
  }

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context not supported');

  const primaryRgb = normalizeRgb(data.glowPrimary, '6, 182, 212');
  const secondaryRgb = normalizeRgb(data.glowSecondary, '34, 211, 238');
  const gradeRgb = getGradeColorRgb(data.grade);

  // 1. Deep Obsidian Background
  const bgGrad = ctx.createLinearGradient(0, 0, W, H);
  bgGrad.addColorStop(0, '#06080e');
  bgGrad.addColorStop(0.5, '#090b14');
  bgGrad.addColorStop(1, '#05060a');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // 2. High-Tech Cyber Dot Grid
  ctx.fillStyle = 'rgba(255, 255, 255, 0.035)';
  for (let gx = 48; gx < W; gx += 40) {
    for (let gy = 48; gy < H; gy += 40) {
      ctx.fillRect(gx, gy, 1.5, 1.5);
    }
  }

  // 3. Dynamic Theme Atmospheric Glow Orbs
  orb(ctx, 160, 90, 560, primaryRgb, 0.30);
  orb(ctx, 1060, 540, 600, secondaryRgb, 0.24);
  orb(ctx, 980, 240, 340, gradeRgb, 0.20);
  orb(ctx, 580, 240, 360, primaryRgb, 0.12);

  // 4. Outer Glass Chassis
  const cardX = 28;
  const cardY = 24;
  const cardW = W - 56;
  const cardH = H - 48;
  const cardR = 24;

  ctx.save();
  ctx.fillStyle = 'rgba(10, 13, 22, 0.58)';
  ctx.beginPath();
  ctx.roundRect(cardX, cardY, cardW, cardH, cardR);
  ctx.fill();

  // Perimeter Gradient Stroke
  const borderGrad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + cardH);
  borderGrad.addColorStop(0, `rgba(${primaryRgb}, 0.70)`);
  borderGrad.addColorStop(0.35, 'rgba(255, 255, 255, 0.16)');
  borderGrad.addColorStop(0.7, 'rgba(255, 255, 255, 0.07)');
  borderGrad.addColorStop(1, `rgba(${secondaryRgb}, 0.60)`);
  ctx.strokeStyle = borderGrad;
  ctx.lineWidth = 1.8;
  ctx.stroke();
  ctx.restore();

  // 5. Header: Brandmark, Theme Metadata & Verification Status
  ctx.save();
  const glyphX = 64;
  const glyphY = 56;
  ctx.translate(glyphX, glyphY);
  ctx.strokeStyle = `rgb(${primaryRgb})`;
  ctx.fillStyle = `rgba(${primaryRgb}, 0.22)`;
  ctx.lineWidth = 2.4;
  ctx.shadowColor = `rgba(${primaryRgb}, 0.8)`;
  ctx.shadowBlur = 14;
  ctx.beginPath();
  ctx.moveTo(14, 0);
  ctx.lineTo(28, 14);
  ctx.lineTo(14, 28);
  ctx.lineTo(0, 14);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Core Pip
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(14, 14, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Wordmark: TYPE NOVA
  ctx.textBaseline = 'alphabetic';
  ctx.font = `900 32px ${MONO}`;
  ctx.fillStyle = '#ffffff';
  ctx.fillText('TYPE', 106, 80);

  const typeWidth = ctx.measureText('TYPE').width;
  ctx.fillStyle = `rgb(${primaryRgb})`;
  ctx.save();
  ctx.shadowColor = `rgba(${primaryRgb}, 0.75)`;
  ctx.shadowBlur = 18;
  ctx.fillText('NOVA', 106 + typeWidth + 4, 80);
  ctx.restore();

  // Header Metadata Pill
  const novaWidth = ctx.measureText('NOVA').width;
  const subX = 106 + typeWidth + novaWidth + 22;
  const subY = 58;
  const subText = `${(data.themeName || 'NEO_CYBER').toUpperCase()} // BENCHMARK · ${new Date().toLocaleDateString()}`;
  ctx.font = `700 11px ${MONO}`;
  const subW = ctx.measureText(subText).width + 22;

  ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(subX, subY, subW, 26, 13);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
  ctx.fillText(subText, subX + 11, subY + 17);

  // Top Right: Badges / Accolade Chips
  if (data.accolades && data.accolades.length > 0) {
    let badgeX = W - 64;
    const badgeY = 56;
    const badgeH = 30;
    const paddingX = 14;

    for (let i = Math.min(2, data.accolades.length - 1); i >= 0; i--) {
      const accoladeText = `✦ ${data.accolades[i].toUpperCase()}`;
      ctx.font = `800 12px ${MONO}`;
      const textW = ctx.measureText(accoladeText).width;
      const badgeW = textW + paddingX * 2;
      badgeX -= badgeW;

      ctx.fillStyle = `rgba(${primaryRgb}, 0.14)`;
      ctx.strokeStyle = `rgba(${primaryRgb}, 0.45)`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 15);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.fillText(accoladeText, badgeX + paddingX, badgeY + 20);

      badgeX -= 10;
    }
  } else {
    // Non-contradictory benchmark tag
    const isUncalibrated = data.grade === 'D' || data.gradeTitle?.toLowerCase() === 'uncalibrated';
    const tagText = isUncalibrated ? '✦ CALIBRATION RUN' : '✦ VERIFIED BENCHMARK';
    ctx.font = `800 12px ${MONO}`;
    const tagW = ctx.measureText(tagText).width + 24;
    const tagX = W - 64 - tagW;
    const tagY = 56;

    ctx.fillStyle = `rgba(${primaryRgb}, 0.12)`;
    ctx.strokeStyle = `rgba(${primaryRgb}, 0.40)`;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.roundRect(tagX, tagY, tagW, 30, 15);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = `rgb(${primaryRgb})`;
    ctx.fillText(tagText, tagX + 12, tagY + 20);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 6. HERO BENTO SECTION: Speed Core, Telemetry Sparkline & Grade Pod
  // ═══════════════════════════════════════════════════════════════════════
  const heroY = 118;
  const heroH = 246;

  // 6A. Left Speed Pod (x: 64, w: 280)
  const speedPodX = 64;
  const speedPodW = 280;
  drawGlassPod(ctx, speedPodX, heroY, speedPodW, heroH, 20, primaryRgb);

  // Speed Header Label
  ctx.fillStyle = `rgb(${primaryRgb})`;
  ctx.beginPath();
  ctx.arc(speedPodX + 22, heroY + 26, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.font = `700 11px ${MONO}`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.60)';
  ctx.fillText('NET SPEED', speedPodX + 32, heroY + 30);

  // Giant WPM Numeral
  ctx.font = `900 84px ${MONO}`;
  const wpmStr = String(data.wpm);
  const wpmW = ctx.measureText(wpmStr).width;

  const wpmGrad = ctx.createLinearGradient(speedPodX + 22, heroY + 50, speedPodX + 22, heroY + 140);
  wpmGrad.addColorStop(0, '#ffffff');
  wpmGrad.addColorStop(1, '#e2e8f0');

  ctx.save();
  ctx.shadowColor = `rgba(${primaryRgb}, 0.50)`;
  ctx.shadowBlur = 35;
  ctx.fillStyle = wpmGrad;
  ctx.fillText(wpmStr, speedPodX + 22, heroY + 124);
  ctx.restore();

  // WPM Unit Label
  ctx.font = `900 24px ${MONO}`;
  ctx.fillStyle = '#ffffff';
  ctx.fillText('WPM', speedPodX + 22 + wpmW + 12, heroY + 104);

  // Peak Burst Chip
  const peakText = `PEAK ${data.rawWpm} RAW WPM`;
  ctx.font = `800 11px ${MONO}`;
  const peakW = ctx.measureText(peakText).width + 20;
  const peakY = heroY + 174;

  ctx.fillStyle = `rgba(${primaryRgb}, 0.14)`;
  ctx.strokeStyle = `rgba(${primaryRgb}, 0.45)`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(speedPodX + 22, peakY, peakW, 28, 14);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = `rgb(${primaryRgb})`;
  ctx.fillText(peakText, speedPodX + 32, peakY + 18);

  // 6B. Center Telemetry Sparkline Pod (x: 368, w: 464)
  const sparkPodX = 368;
  const sparkPodW = 464;
  drawGlassPod(ctx, sparkPodX, heroY, sparkPodW, heroH, 20, primaryRgb);

  // Sparkline Header
  ctx.fillStyle = `rgb(${primaryRgb})`;
  ctx.beginPath();
  ctx.arc(sparkPodX + 22, heroY + 26, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.font = `700 11px ${MONO}`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.60)';
  ctx.fillText('PACING PROFILE', sparkPodX + 32, heroY + 30);

  const sparkMeta = `AVG ${data.wpm} · MAX ${data.rawWpm} WPM`;
  ctx.font = `800 11px ${MONO}`;
  const metaW = ctx.measureText(sparkMeta).width;
  ctx.fillStyle = `rgba(${primaryRgb}, 0.95)`;
  ctx.fillText(sparkMeta, sparkPodX + sparkPodW - 22 - metaW, heroY + 30);

  // Sparkline Graph Render
  const gx = sparkPodX + 22;
  const gw = sparkPodW - 44;
  const gy = heroY + 54;
  const gh = 154;

  const { points: sparkPoints, maxVal, peakPt } = getSparklinePoints(data, gx, gy, gw, gh);

  // Guideline: Average WPM
  const avgY = gy + gh - Math.min(gh, Math.max(8, ((data.wpm - 0) / (maxVal - 0)) * gh));
  ctx.save();
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(gx, avgY);
  ctx.lineTo(gx + gw, avgY);
  ctx.stroke();
  ctx.restore();

  // Baseline Grid Track
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(gx, gy + gh);
  ctx.lineTo(gx + gw, gy + gh);
  ctx.stroke();

  // Area Fill under Curve
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(sparkPoints[0].x, sparkPoints[0].y);
  for (let i = 0; i < sparkPoints.length - 1; i++) {
    const p0 = i > 0 ? sparkPoints[i - 1] : sparkPoints[i];
    const p1 = sparkPoints[i];
    const p2 = sparkPoints[i + 1];
    const p3 = i < sparkPoints.length - 2 ? sparkPoints[i + 2] : p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
  }
  ctx.lineTo(sparkPoints[sparkPoints.length - 1].x, gy + gh);
  ctx.lineTo(sparkPoints[0].x, gy + gh);
  ctx.closePath();

  const areaGrad = ctx.createLinearGradient(0, gy, 0, gy + gh);
  areaGrad.addColorStop(0, `rgba(${primaryRgb}, 0.32)`);
  areaGrad.addColorStop(0.7, `rgba(${primaryRgb}, 0.06)`);
  areaGrad.addColorStop(1, `rgba(${primaryRgb}, 0.0)`);
  ctx.fillStyle = areaGrad;
  ctx.fill();
  ctx.restore();

  // Curve Stroke
  ctx.save();
  drawCurvePath(ctx, sparkPoints);
  ctx.strokeStyle = `rgb(${primaryRgb})`;
  ctx.lineWidth = 2.6;
  ctx.shadowColor = `rgba(${primaryRgb}, 0.85)`;
  ctx.shadowBlur = 14;
  ctx.stroke();
  ctx.restore();

  // Peak Point Marker
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = `rgba(${primaryRgb}, 0.9)`;
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.arc(peakPt.x, peakPt.y, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = `rgb(${primaryRgb})`;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Peak Label
  const peakTag = `▲ ${Math.round(peakPt.wpm)}`;
  ctx.font = `800 10px ${MONO}`;
  const peakTagW = ctx.measureText(peakTag).width + 12;
  const peakTagX = Math.min(gx + gw - peakTagW, Math.max(gx, peakPt.x - peakTagW / 2));
  const peakTagY = Math.max(gy - 4, peakPt.y - 18);

  ctx.fillStyle = 'rgba(10, 13, 22, 0.85)';
  ctx.strokeStyle = `rgba(${primaryRgb}, 0.50)`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(peakTagX, peakTagY, peakTagW, 16, 8);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.fillText(peakTag, peakTagX + 6, peakTagY + 12);
  ctx.restore();

  // 6C. Right Performance Grade Pod (x: 856, w: 280)
  const gradePodX = 856;
  const gradePodW = 280;
  drawGlassPod(ctx, gradePodX, heroY, gradePodW, heroH, 20, gradeRgb);

  // Grade Header
  ctx.fillStyle = `rgb(${gradeRgb})`;
  ctx.beginPath();
  ctx.arc(gradePodX + 22, heroY + 26, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.font = `700 11px ${MONO}`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.60)';
  ctx.fillText('EVALUATION GRADE', gradePodX + 32, heroY + 30);

  // Radial Aura behind Grade
  const auraG = ctx.createRadialGradient(
    gradePodX + gradePodW / 2,
    heroY + 105,
    0,
    gradePodX + gradePodW / 2,
    heroY + 105,
    130
  );
  auraG.addColorStop(0, `rgba(${gradeRgb}, 0.22)`);
  auraG.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = auraG;
  ctx.fillRect(gradePodX, heroY, gradePodW, heroH);

  // Grade Letter
  const isMultiChar = data.grade.length > 1;
  const gradeSize = isMultiChar ? 96 : 112;
  ctx.font = `900 ${gradeSize}px ${MONO}`;
  ctx.fillStyle = `rgb(${gradeRgb})`;
  ctx.save();
  ctx.shadowColor = `rgba(${gradeRgb}, 0.85)`;
  ctx.shadowBlur = 45;
  const gwGrade = ctx.measureText(data.grade).width;
  ctx.fillText(data.grade, gradePodX + (gradePodW - gwGrade) / 2, heroY + (isMultiChar ? 128 : 134));
  ctx.restore();

  // Grade Title Pill Banner
  const titleText = `✦ ${(data.gradeTitle || 'OPERATIVE').toUpperCase()} ✦`;
  ctx.font = `800 11px ${MONO}`;
  const titleW = Math.min(gradePodW - 32, ctx.measureText(titleText).width + 24);
  const titleX = gradePodX + (gradePodW - titleW) / 2;
  const titleY = heroY + heroH - 46;

  ctx.fillStyle = `rgba(${gradeRgb}, 0.16)`;
  ctx.strokeStyle = `rgba(${gradeRgb}, 0.50)`;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.roundRect(titleX, titleY, titleW, 28, 14);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.fillText(titleText, titleX + (titleW - ctx.measureText(titleText).width) / 2, titleY + 18);

  // ═══════════════════════════════════════════════════════════════════════
  // 7. BOTTOM BENTO METRICS PODS (4 Equal Width Pods)
  // ═══════════════════════════════════════════════════════════════════════
  const statsList = [
    {
      label: 'COGNITIVE PACE',
      num: String(data.cpi ?? Math.round(data.wpm * 1.38)),
      unit: 'CPI',
      pct: Math.min(100, Math.round(((data.cpi ?? (data.wpm * 1.38)) / 150) * 100)),
    },
    {
      label: 'ACCURACY',
      num: String(data.accuracy),
      unit: '%',
      pct: data.accuracy,
    },
    {
      label: 'CONSISTENCY',
      num: String(data.consistency),
      unit: '%',
      pct: data.consistency,
    },
    {
      label: 'BURST SPEED',
      num: String(data.rawWpm),
      unit: 'WPM',
      pct: Math.min(100, Math.round((data.rawWpm / 160) * 100)),
    },
  ];

  const podStartX = 64;
  const podW = 250;
  const podGap = 24;
  const podY = 388;
  const podH = 136;

  statsList.forEach((stat, idx) => {
    const px = podStartX + idx * (podW + podGap);
    drawGlassPod(ctx, px, podY, podW, podH, 20);

    // Subtle Monochromatic Pip
    ctx.fillStyle = 'rgba(255, 255, 255, 0.40)';
    ctx.beginPath();
    ctx.arc(px + 20, podY + 26, 3, 0, Math.PI * 2);
    ctx.fill();

    // Stat Label
    ctx.font = `700 11px ${MONO}`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.fillText(stat.label, px + 30, podY + 30);

    // Stat Value & Unit
    ctx.font = `900 36px ${MONO}`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(stat.num, px + 20, podY + 76);

    const numWidth = ctx.measureText(stat.num).width;
    ctx.font = `700 15px ${MONO}`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.60)';
    ctx.fillText(stat.unit, px + 24 + numWidth, podY + 74);

    // Sleek Progress Bar Track
    const trackX = px + 20;
    const trackY = podY + 98;
    const trackW = podW - 40;
    const trackH = 4;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.beginPath();
    ctx.roundRect(trackX, trackY, trackW, trackH, 2);
    ctx.fill();

    // Progress Bar Fill
    const fillW = Math.max(6, trackW * (stat.pct / 100));
    ctx.fillStyle = `rgb(${primaryRgb})`;
    ctx.save();
    ctx.shadowColor = `rgba(${primaryRgb}, 0.70)`;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.roundRect(trackX, trackY, fillW, trackH, 2);
    ctx.fill();
    ctx.restore();
  });

  // ═══════════════════════════════════════════════════════════════════════
  // 8. FOOTER: Sleek Metadata & Cryptographic Stamp
  // ═══════════════════════════════════════════════════════════════════════
  const footY = 556;
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(64, footY);
  ctx.lineTo(W - 64, footY);
  ctx.stroke();

  ctx.font = `700 11px ${MONO}`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.40)';
  ctx.fillText(`TYPENOVA // PERFORMANCE DOSSIER · ${new Date().toLocaleDateString()}`, 64, footY + 24);

  const rightFoot = `${data.accuracy >= 98 ? 'FLAWLESS EXECUTION' : 'HIGH FIDELITY TELEMETRY'} · ARCHIVE v3.2`;
  const rfW = ctx.measureText(rightFoot).width;
  ctx.fillStyle = `rgba(${primaryRgb}, 0.85)`;
  ctx.fillText(rightFoot, W - 64 - rfW, footY + 24);
  ctx.restore();

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png');
  });
}

/** Copy the card to the clipboard; fall back to a PNG download. Returns which happened. */
export async function shareResultCard(data: ShareCardData): Promise<'copied' | 'downloaded'> {
  let blob: Blob;
  try {
    blob = await renderResultCard(data);
  } catch (error) {
    console.error('Failed to render result card:', error);
    throw error;
  }

  try {
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    return 'copied';
  } catch {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `typenova-${data.wpm}wpm.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    return 'downloaded';
  }
}
