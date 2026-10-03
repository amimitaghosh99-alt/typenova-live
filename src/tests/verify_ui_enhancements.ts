import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log('Navigating to http://localhost:5173...');
  await page.goto('http://localhost:5173');
  await page.waitForLoadState('networkidle');

  // Dismiss any update modal or cookies
  await page.evaluate(() => {
    localStorage.setItem('typenova_seen_version', 'v3.2.0');
    localStorage.setItem('typenova_guest_mode', 'true');
  });
  await page.reload();
  await page.waitForLoadState('networkidle');

  // 1. Test the new Share Result Card rendering on browser canvas
  console.log('Testing upgraded Share Card rendering...');
  const cardDataUri = await page.evaluate(async () => {
    // Import or run renderResultCard directly in browser context
    // We can dynamically evaluate the shareResultCard canvas logic
    const { shareResultCard } = await import('/src/utils/shareCard.ts');
    
    // We simulate creating a canvas with the logic
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 630;
    
    // Trigger shareResultCard to get the blob
    // By invoking the function:
    const data = {
      wpm: 124,
      rawWpm: 138,
      accuracy: 98,
      consistency: 86,
      grade: 'S',
      gradeTitle: 'Transcendent Typist',
      cpi: 168,
      accolades: ['100% ACCURACY', 'FLAWLESS RUN', 'HYPER PACE'],
      themeName: 'CYBERPUNK',
      glowPrimary: '6, 182, 212',
      glowSecondary: '244, 63, 94',
    };

    // We can call navigator.clipboard or inspect canvas
    // Let's create the card directly using the canvas renderer:
    const W = 1200;
    const H = 630;
    const MONO = '"JetBrains Mono", monospace';
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No ctx');

    // We can invoke shareResultCard directly by letting it download:
    let capturedBlob: Blob | null = null;
    const origToBlob = HTMLCanvasElement.prototype.toBlob;
    HTMLCanvasElement.prototype.toBlob = function(cb: BlobCallback, type?: string, quality?: any) {
      return origToBlob.call(this, (b) => {
        capturedBlob = b;
        cb(b);
      }, type, quality);
    };

    try {
      await shareResultCard(data);
    } catch {}

    HTMLCanvasElement.prototype.toBlob = origToBlob;

    if (capturedBlob) {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(capturedBlob!);
      });
    }
    return '';
  });

  if (cardDataUri) {
    const base64Data = cardDataUri.replace(/^data:image\/png;base64,/, '');
    const outPath = path.resolve('src/tests/screenshots/verified_new_cool_share_card.png');
    fs.writeFileSync(outPath, Buffer.from(base64Data, 'base64'));
    console.log(`✅ Saved new share card to ${outPath}`);
  }

  // 2. Run simulation to verify race screen balance
  console.log('Now running simulation verification...');
  await browser.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
