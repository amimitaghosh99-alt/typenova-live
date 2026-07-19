// Hand-drawn 1200x630 result card (Open Graph size) — no dependencies.
// Styled after the app: dark bg, dual theme-colored glow orbs, mono type.

export interface ShareCardData {
  wpm: number;
  rawWpm: number;
  accuracy: number;
  consistency: number;
  grade: string;
  themeName: string;
  /** "r,g,b" strings, straight from Theme.glowPrimary / glowSecondary */
  glowPrimary: string;
  glowSecondary: string;
}

const W = 1200;
const H = 630;
const MONO = '"JetBrains Mono", "Fira Code", ui-monospace, monospace';

function orb(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rgb: string, alpha: number) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${rgb},${alpha})`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

export async function renderResultCard(data: ShareCardData): Promise<Blob> {
  await document.fonts.ready; // make sure JetBrains Mono is usable on canvas

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // Background + glow orbs
  ctx.fillStyle = '#0a0a0c';
  ctx.fillRect(0, 0, W, H);
  orb(ctx, 150, 80, 500, data.glowPrimary, 0.28);
  orb(ctx, 1080, 560, 550, data.glowSecondary, 0.22);
  orb(ctx, 900, 100, 350, data.glowPrimary, 0.12);

  // Border
  ctx.strokeStyle = 'rgba(255,255,255,0.14)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(24, 24, W - 48, H - 48, 32);
  ctx.stroke();

  // Wordmark
  ctx.textBaseline = 'alphabetic';
  ctx.font = `900 44px ${MONO}`;
  ctx.fillStyle = '#ffffff';
  ctx.fillText('TYPE', 80, 118);
  ctx.fillStyle = `rgb(${data.glowPrimary})`;
  ctx.fillText('NOVA', 80 + ctx.measureText('TYPE').width, 118);
  ctx.font = `700 20px ${MONO}`;
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.fillText(data.themeName.toUpperCase() + ' · ' + new Date().toLocaleDateString(), 80, 156);

  // Big WPM
  ctx.font = `900 190px ${MONO}`;
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = `rgba(${data.glowPrimary},0.55)`;
  ctx.shadowBlur = 60;
  ctx.fillText(String(data.wpm), 76, 420);
  ctx.shadowBlur = 0;
  ctx.font = `900 40px ${MONO}`;
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.fillText('WPM', 84 + ctx.measureText('..').width + String(data.wpm).length * 114, 420);

  // Grade — big, right side
  ctx.font = `900 260px ${MONO}`;
  ctx.fillStyle = `rgb(${data.glowPrimary})`;
  ctx.shadowColor = `rgba(${data.glowPrimary},0.8)`;
  ctx.shadowBlur = 90;
  const gw = ctx.measureText(data.grade).width;
  ctx.fillText(data.grade, W - 120 - gw, 430);
  ctx.shadowBlur = 0;
  ctx.font = `700 22px ${MONO}`;
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  const gl = 'GRADE';
  ctx.fillText(gl, W - 120 - gw / 2 - ctx.measureText(gl).width / 2, 470);

  // Stat row
  const stats: Array<[string, string]> = [
    ['ACCURACY', `${data.accuracy}%`],
    ['CONSISTENCY', `${data.consistency}%`],
    ['RAW WPM', String(data.rawWpm)],
  ];
  let x = 80;
  for (const [label, value] of stats) {
    ctx.font = `700 20px ${MONO}`;
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.fillText(label, x, 520);
    ctx.font = `900 52px ${MONO}`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(value, x, 574);
    x += Math.max(ctx.measureText(value).width, ctx.measureText(label).width * 1.15) + 70;
  }

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png');
  });
}

/** Copy the card to the clipboard; fall back to a PNG download. Returns which happened. */
export async function shareResultCard(data: ShareCardData): Promise<'copied' | 'downloaded'> {
  const blob = await renderResultCard(data);
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
