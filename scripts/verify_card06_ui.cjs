const { chromium } = require('playwright');
const path = require('path');

async function run() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  // 1. Visit /api/health and capture response
  console.log('1. Probing /api/health endpoint...');
  const response = await page.goto('http://127.0.0.1:5173/api/health');
  console.log('HTTP Status:', response.status());
  console.log('Content-Type:', response.headers()['content-type']);
  const bodyText = await response.text();
  console.log('Body snippet:', bodyText.slice(0, 150));
  await page.screenshot({ path: path.join(__dirname, '../screenshot_health_endpoint.png') });
  console.log('Saved screenshot_health_endpoint.png');

  // 2. Visit Login page to inspect System Status modal
  console.log('2. Navigating to login page...');
  await page.goto('http://127.0.0.1:5173/login', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);

  // 3. Open System Status modal from navigation or evaluate
  console.log('3. Opening System Status modal...');
  const statusNavBtn = page.getByRole('button', { name: /status/i });
  if (await statusNavBtn.isVisible()) {
    await statusNavBtn.click();
  } else {
    // If not visible, find by text or evaluate
    const btn = page.locator('button:has-text("Status")');
    if (await btn.count() > 0) {
      await btn.first().click();
    }
  }

  await page.waitForTimeout(800);

  // Emit a real-time health signal while the modal is open to verify live stream
  console.log('4. Emitting live health signal to verify stream...');
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('typenova_health_signal', {
      detail: {
        id: 'test-audit-sig-01',
        type: 'ai_rate_limit',
        severity: 'warning',
        subsystem: 'ai',
        message: 'Groq provider rate limit approached (85% TPM capacity). Aru auto-throttled.',
        timestamp: Date.now(),
        recoveryLabel: 'Configure Key',
        recoveryAction: () => console.log('Recovery triggered!')
      }
    }));
  });

  await page.waitForTimeout(500);

  // Scroll to bottom of modal so Telemetry Bus stream is fully visible in screenshot
  await page.evaluate(() => {
    const scrollContainers = document.querySelectorAll('.overflow-y-auto');
    scrollContainers.forEach(el => { el.scrollTop = el.scrollHeight; });
  });
  await page.waitForTimeout(300);

  await page.screenshot({ path: path.join(__dirname, '../screenshot_system_status.png'), fullPage: false });
  console.log('Saved screenshot_system_status.png');

  // Copy to artifact directory
  const artifactDir = 'C:/Users/risho/.gemini/antigravity/brain/940a72ac-4e16-4e5e-b36e-f1158cee0078';
  try {
    const fs = require('fs');
    fs.copyFileSync(
      path.join(__dirname, '../screenshot_system_status.png'),
      path.join(artifactDir, 'screenshot_system_status.png')
    );
  } catch (e) {
    console.warn('Failed to copy to artifact dir:', e.message);
  }

  // 5. Click "Run Diagnostics" button inside the modal
  console.log('5. Triggering live diagnostics run...');
  const runDiagBtn = page.getByRole('button', { name: /Run Diagnostics/i });
  if (await runDiagBtn.isVisible()) {
    await runDiagBtn.click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(__dirname, '../screenshot_diagnostics_active.png'), fullPage: false });
    console.log('Saved screenshot_diagnostics_active.png');
  } else {
    console.log('Run Diagnostics button not found in modal');
  }

  await browser.close();
  console.log('Card 06 UI Verification completed successfully.');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
