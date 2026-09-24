// Automated TypeNova In-App 1080p Video Recorder using Playwright
// Run with: node scripts/record_app_video.mjs

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

async function recordPromo() {
  const outputDir = path.resolve('videos');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Target URL defaults to your live domain: https://typenova.dpdns.org
  const cliUrl = process.argv[2];
  let targetUrl = cliUrl || process.env.TARGET_URL || 'https://typenova.dpdns.org';

  if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
    targetUrl = 'https://' + targetUrl;
  }

  console.log(`\n======================================================`);
  console.log(`🎬 TypeNova In-App 1080p Video Studio`);
  console.log(`🌐 Target URL: ${targetUrl}`);
  console.log(`======================================================\n`);

  console.log('🚀 Launching Chromium (1920x1080 @ 60 FPS)...');

  const browser = await chromium.launch({
    headless: false, // Visible window so you can watch it record!
    args: [
      '--enable-gpu',
      '--window-size=1920,1080',
      '--autoplay-policy=no-user-gesture-required'
    ]
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: {
      dir: outputDir,
      size: { width: 1920, height: 1080 }
    }
  });

  const page = await context.newPage();

  // 1. Pre-inject Guest Mode and Consent before navigation
  await page.addInitScript(() => {
    try {
      localStorage.setItem('guestMode', 'true');
      localStorage.setItem('typenova_terms_accepted', 'true');
      localStorage.setItem('typenova_consent_recorded', 'true');
      localStorage.setItem('guest_session_active', 'true');
      console.log('⚡ [Recorder] Guest Mode and consent pre-injected.');
    } catch (e) {
      console.error(e);
    }
  });

  console.log(`🌐 Navigating to ${targetUrl}...`);

  try {
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  } catch (err) {
    console.error(`\n❌ Failed to connect to ${targetUrl}. Error:`, err.message);
    await browser.close();
    process.exit(1);
  }

  await page.waitForTimeout(2500);

  // 2. Failsafe: If landed on /login, click the Guest Speed Test button
  const currentUrl = page.url();
  if (currentUrl.includes('/login')) {
    console.log('⚠️ Landed on /login. Clicking "Try 30s Speed Test (Guest)" button...');
    try {
      const guestBtn = page.locator('button:has-text("Try 30s Speed Test"), button:has-text("Guest")').first();
      if (await guestBtn.isVisible({ timeout: 4000 })) {
        await guestBtn.click();
        console.log('✅ Guest button clicked!');
        await page.waitForTimeout(2500);
      }
    } catch {}
  }

  // 3. Dismiss any onboarding/update modals
  try {
    const dismissBtn = page.locator('button[aria-label="Close"], button:has-text("Dismiss"), button:has-text("Got it")').first();
    if (await dismissBtn.isVisible({ timeout: 1500 })) {
      await dismissBtn.click();
    }
  } catch {}

  console.log('🎯 Arena reached! Focusing typing engine...');
  await page.waitForTimeout(1500);

  // 4. Focus the typing engine
  const typingTarget = page.locator('textarea, input[type="text"], [tabindex="0"]').first();
  if (await typingTarget.isVisible()) {
    await typingTarget.click();
  } else {
    await page.mouse.click(960, 540);
  }

  await page.waitForTimeout(1000);

  // 5. Read actual words on screen from DOM
  console.log('⌨️ Typing at 165+ WPM with dynamic caret tracking and glows...');
  let wordsToType = [];
  try {
    const wordElements = await page.locator('.word, [data-word]').allInnerTexts();
    if (wordElements.length > 0) {
      wordsToType = wordElements.join(' ').split(/\s+/).slice(0, 50);
    }
  } catch {}

  if (wordsToType.length === 0) {
    wordsToType = "the cybernetic typing platform engineered for competitive speed typists and software engineers with sub-millisecond mechanical input processing and fluid caret tracking".split(' ');
  }

  // 6. Type with realistic human rhythm
  for (const word of wordsToType) {
    for (const char of word) {
      const delay = Math.floor(Math.random() * 25 + 40); // 40-65ms (~165 WPM)
      await page.keyboard.type(char, { delay });
    }
    await page.keyboard.press('Space', { delay: Math.floor(Math.random() * 20 + 35) });
  }

  console.log('🏁 Typing run completed. Capturing post-match telemetry and glow...');
  await page.waitForTimeout(3500);

  // Close context to finish writing video file
  await context.close();
  await browser.close();

  const files = fs.readdirSync(outputDir).filter(f => f.endsWith('.webm'));
  const newestFile = files[files.length - 1];
  console.log(`\n🎉 PROMO VIDEO SUCCESSFULLY SAVED!`);
  console.log(`📁 File location: videos/${newestFile}\n`);
}

recordPromo().catch(err => {
  console.error('❌ Recording failed:', err);
});
