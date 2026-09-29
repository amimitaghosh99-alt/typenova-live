import { chromium } from 'playwright';
import { PNG } from 'pngjs';
import gifencPkg from 'gifenc';
const { GIFEncoder, quantize, applyPalette } = gifencPkg;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const assetsDir = path.resolve(__dirname, '../docs/assets');

if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

function downsample(rgba, width, height, targetWidth, targetHeight) {
  const out = new Uint8Array(targetWidth * targetHeight * 4);
  const xRatio = width / targetWidth;
  const yRatio = height / targetHeight;

  for (let y = 0; y < targetHeight; y++) {
    const srcY = Math.floor(y * yRatio);
    for (let x = 0; x < targetWidth; x++) {
      const srcX = Math.floor(x * xRatio);
      const srcIdx = (srcY * width + srcX) * 4;
      const dstIdx = (y * targetWidth + x) * 4;
      out[dstIdx] = rgba[srcIdx];
      out[dstIdx + 1] = rgba[srcIdx + 1];
      out[dstIdx + 2] = rgba[srcIdx + 2];
      out[dstIdx + 3] = rgba[srcIdx + 3];
    }
  }
  return out;
}

async function main() {
  console.log('🚀 Launching Chromium (1920x1080)...');
  const browser = await chromium.launch({
    headless: true,
    args: ['--enable-gpu', '--window-size=1920,1080']
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1
  });

  const page = await context.newPage();

  // Inject persistent storage flags to dismiss all one-off modals
  await page.addInitScript(() => {
    localStorage.setItem('typenova_seen_version', 'v3.1.1');
    localStorage.setItem('typenova_guest_mode', 'true');
    localStorage.setItem('guestMode', 'true');
    localStorage.setItem('typenova_terms_accepted', 'true');
    localStorage.setItem('typenova_consent_recorded', 'true');
    localStorage.setItem('guest_session_active', 'true');
    localStorage.setItem('typenova_theme', 'starfield');
  });

  // 1. Capture 3D Kinetic Keyboard on /login
  console.log('📸 1. Capturing 3D Kinetic Mechanical Keyboard (/login)...');
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(assetsDir, 'screenshot-3d-keyboard.png') });
  console.log('   ✓ Saved docs/assets/screenshot-3d-keyboard.png');

  // 2. Capture Hero Typing Arena (Clean Ready State)
  console.log('📸 2. Capturing Hero Typing Arena (Ready state)...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1500);

  try {
    const letsType = page.locator('button:has-text("LET\'S TYPE")');
    if (await letsType.isVisible({ timeout: 1000 })) {
      await letsType.click();
      await page.waitForTimeout(1000);
    }
  } catch (e) {}

  await page.screenshot({ path: path.join(assetsDir, 'screenshot-typing-arena.png') });
  console.log('   ✓ Saved docs/assets/screenshot-typing-arena.png');

  // 3. Capture Operator Analytics (/operator/analytics)
  console.log('📸 3. Capturing Operator Analytics Dashboard...');
  await page.goto('http://localhost:3000/operator/analytics', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(assetsDir, 'screenshot-analytics.png') });
  console.log('   ✓ Saved docs/assets/screenshot-analytics.png');

  // 4. Capture Multiplayer Race / Compete Screen
  console.log('📸 4. Capturing Multiplayer Compete Arena...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1500);

  const competeNav = page.locator('button:has-text("Compete"), a:has-text("Compete")').first();
  if (await competeNav.isVisible({ timeout: 2000 })) {
    await competeNav.click();
    await page.waitForTimeout(1500);
  }
  await page.screenshot({ path: path.join(assetsDir, 'screenshot-multiplayer.png') });
  console.log('   ✓ Saved docs/assets/screenshot-multiplayer.png');

  // 5. Capture Results Telemetry Screen (/?results=1)
  console.log('📸 5. Capturing Results Telemetry Screen...');
  await page.goto('http://localhost:3000/?results=1', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(assetsDir, 'screenshot-results.png') });
  console.log('   ✓ Saved docs/assets/screenshot-results.png');

  // 6. Record Real-time Typing Test GIF & Active Screenshot
  console.log('🎬 6. Recording Live Typing Test Animation GIF (100% accuracy)...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1500);

  // Arm test by clicking SPACE button
  const startBtn = page.locator('button:has-text("SPACE")').first();
  await startBtn.click();
  console.log('   Arming test, waiting 3.6s for countdown to finish...');
  await page.waitForTimeout(3600);

  // Extract target text
  const rawText = await page.evaluate(() => {
    const container = document.getElementById('typing-text-container');
    return container ? container.innerText.trim() : '';
  });

  console.log('   Typing passage snippet:', rawText.slice(0, 50) + '...');

  const gifWidth = 960;
  const gifHeight = 540;
  const gif = GIFEncoder();

  const frames = [];
  const charsToType = rawText.slice(0, 55);

  // Capture initial armed frame
  const initShot = await page.screenshot({ type: 'png' });
  frames.push({ buffer: initShot, delay: 250 });

  // Type characters with natural cadence while capturing keyframes
  for (let i = 0; i < charsToType.length; i++) {
    const char = charsToType[i];
    await page.keyboard.type(char, { delay: 50 });

    // Capture keyframes on space or every 3 characters
    if (char === ' ' || i % 3 === 0 || i === charsToType.length - 1) {
      const shot = await page.screenshot({ type: 'png' });
      frames.push({ buffer: shot, delay: 110 });
    }
  }

  // Also capture the mid-run typing test screenshot
  await page.screenshot({ path: path.join(assetsDir, 'screenshot-typing-active.png') });
  console.log('   ✓ Saved docs/assets/screenshot-typing-active.png');

  // Hold final typed frame for visual appreciation
  await page.waitForTimeout(500);
  const endShot = await page.screenshot({ type: 'png' });
  frames.push({ buffer: endShot, delay: 1500 });

  console.log(`   Processing ${frames.length} frames into animated GIF (${gifWidth}x${gifHeight})...`);

  for (let fIdx = 0; fIdx < frames.length; fIdx++) {
    const { buffer, delay } = frames[fIdx];
    const png = PNG.sync.read(buffer);
    const scaledRgba = downsample(png.data, png.width, png.height, gifWidth, gifHeight);

    const palette = quantize(scaledRgba, 256);
    const index = applyPalette(scaledRgba, palette);
    gif.writeFrame(index, gifWidth, gifHeight, { palette, delay });
  }

  gif.finish();
  const gifBuffer = Buffer.from(gif.bytes());
  fs.writeFileSync(path.join(assetsDir, 'typing-demo.gif'), gifBuffer);
  console.log(`   ✓ Saved docs/assets/typing-demo.gif (${(gifBuffer.length / 1024 / 1024).toFixed(2)} MB)`);

  await browser.close();
  console.log('\n🎉 ALL MEDIA ASSETS SUCCESSFULLY GENERATED!');
}

main().catch(err => {
  console.error('Fatal error in media generation:', err);
  process.exit(1);
});
