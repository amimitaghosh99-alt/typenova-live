const { chromium } = require('playwright');
const path = require('path');

async function run() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  // 1. Visit Login screen
  console.log('Navigating to login...');
  await page.goto('http://127.0.0.1:5173/login', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(__dirname, '../screenshot_login.png'), fullPage: false });
  console.log('Saved screenshot_login.png');

  // 2. Set guest mode and navigate to results screen preview
  console.log('Setting guest mode and navigating to results preview...');
  await page.evaluate(() => {
    localStorage.setItem('guestMode', 'true');
    localStorage.removeItem('typezen_session');
    localStorage.removeItem('supabase.auth.token');
  });
  await page.goto('http://127.0.0.1:5173/?results=1', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);

  await page.screenshot({ path: path.join(__dirname, '../screenshot_guest_results.png'), fullPage: true });
  console.log('Saved screenshot_guest_results.png');

  // 3. Click "Sign Up for More Features" button
  console.log('Clicking "Sign Up for More Features"...');
  const featuresBtn = page.getByRole('button', { name: /Sign Up for More Features/i });
  if (await featuresBtn.isVisible()) {
    await featuresBtn.click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(__dirname, '../screenshot_features_modal.png'), fullPage: false });
    console.log('Saved screenshot_features_modal.png');
  } else {
    console.log('Features button not found');
  }

  await browser.close();
  console.log('Verification completed successfully.');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
