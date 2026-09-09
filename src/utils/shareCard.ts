// Hand-drawn 1200x630 result card (Open Graph size) — zero external dependencies.
// Styled after TypeNova dark liquid glass: dark bg, dual theme-colored glow orbs, JetBrains Mono type.

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

function orb(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rgb: string, alpha: number) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${rgb},${alpha})`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

async function renderResultCard(data: ShareCardData): Promise<Blob> {
  if (typeof document !== 'undefined' && document.fonts) {
    await document.fonts.ready; // make sure JetBrains Mono is usable on canvas
  }

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context not supported');

  const primaryRgb = normalizeRgb(data.glowPrimary, '6, 182, 212');
  const secondaryRgb = normalizeRgb(data.glowSecondary, '34, 211, 238');

  // Background + dynamic theme glow orbs
  ctx.fillStyle = '#0a0a0c';
  ctx.fillRect(0, 0, W, H);
  orb(ctx, 150, 80, 520, primaryRgb, 0.30);
  orb(ctx, 1080, 560, 560, secondaryRgb, 0.24);
  orb(ctx, 900, 100, 360, primaryRgb, 0.14);

  // Outer Border & Glass Frame
  ctx.strokeStyle = 'rgba(255,255,255,0.14)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(24, 24, W - 48, H - 48, 32);
  ctx.stroke();

  // Top Left: Wordmark & Session Date
  ctx.textBaseline = 'alphabetic';
  ctx.font = `900 44px ${MONO}`;
  ctx.fillStyle = '#ffffff';
  ctx.fillText('TYPE', 80, 118);
  ctx.fillStyle = `rgb(${primaryRgb})`;
  ctx.fillText('NOVA', 80 + ctx.measureText('TYPE').width, 118);

  ctx.font = `700 18px ${MONO}`;
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  const subtitle = `${(data.themeName || 'CYBERPUNK').toUpperCase()} · ${new Date().toLocaleDateString()}`;
  ctx.fillText(subtitle, 80, 152);

  // Top Right: Accolade Badges Rack
  if (data.accolades && data.accolades.length > 0) {
    let badgeX = W - 80;
    const badgeY = 92;
    const badgeH = 38;
    const paddingX = 18;

    // Draw from right to left
    for (let i = data.accolades.length - 1; i >= 0; i--) {
      const accoladeText = data.accolades[i].toUpperCase();
      ctx.font = `800 14px ${MONO}`;
      const textW = ctx.measureText(accoladeText).width;
      const badgeW = textW + paddingX * 2;
      badgeX -= badgeW;

      // Chip Background
      ctx.fillStyle = `rgba(${primaryRgb}, 0.12)`;
      ctx.strokeStyle = `rgba(${primaryRgb}, 0.45)`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 19);
      ctx.fill();
      ctx.stroke();

      // Chip Text
      ctx.fillStyle = '#ffffff';
      ctx.fillText(accoladeText, badgeX + paddingX, badgeY + 24);

      badgeX -= 12; // Gap between badges
    }
  }

  // Left Hero: Big Net WPM
  ctx.font = `900 190px ${MONO}`;
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = `rgba(${primaryRgb}, 0.55)`;
  ctx.shadowBlur = 60;
  ctx.fillText(String(data.wpm), 76, 395);
  ctx.shadowBlur = 0;

  // WPM Unit Label
  ctx.font = `900 36px ${MONO}`;
  ctx.fillStyle = 'rgba(255,255,255,0.50)';
  const wpmWidth = ctx.measureText(String(data.wpm)).width;
  ctx.fillText('WPM', 76 + wpmWidth + 24, 395);

  // Right Hero: Big Grade (with adaptive font scaling for 'S+')
  const isMultiCharGrade = data.grade.length > 1;
  const gradeFontSize = isMultiCharGrade ? 210 : 250;
  ctx.font = `900 ${gradeFontSize}px ${MONO}`;
  ctx.fillStyle = `rgb(${primaryRgb})`;
  ctx.shadowColor = `rgba(${primaryRgb}, 0.85)`;
  ctx.shadowBlur = 90;
  const gw = ctx.measureText(data.grade).width;
  const gradeX = W - 100 - gw;
  const gradeY = isMultiCharGrade ? 395 : 405;
  ctx.fillText(data.grade, gradeX, gradeY);
  ctx.shadowBlur = 0;

  // Grade Title / Label
  ctx.font = `700 20px ${MONO}`;
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  const gl = 'GRADE';
  ctx.fillText(gl, gradeX + gw / 2 - ctx.measureText(gl).width / 2, 442);

  if (data.gradeTitle) {
    ctx.font = `800 14px ${MONO}`;
    ctx.fillStyle = `rgba(${primaryRgb}, 0.9)`;
    const titleText = data.gradeTitle.toUpperCase();
    ctx.fillText(titleText, gradeX + gw / 2 - ctx.measureText(titleText).width / 2, 466);
  }

  // Bottom Stat Row: 4 Balanced Columns
  const stats: Array<[string, string]> = [
    ...(typeof data.cpi === 'number' ? [['CPI', String(data.cpi)] as [string, string]] : []),
    ['ACCURACY', `${data.accuracy}%`],
    ['CONSISTENCY', `${data.consistency}%`],
    ['RAW WPM', String(data.rawWpm)],
  ];

  let x = 80;
  const colSpacing = stats.length === 4 ? 260 : 340;
  for (const [label, value] of stats) {
    ctx.font = `700 18px ${MONO}`;
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.fillText(label, x, 532);

    ctx.font = `900 48px ${MONO}`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(value, x, 582);
    x += colSpacing;
  }

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

