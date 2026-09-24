const { chromium } = require('playwright');
const path = require('path');

async function run() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  console.log('1. Navigating to TypeNova home...');
  await page.goto('http://127.0.0.1:5173');
  await page.waitForTimeout(1000);

  console.log('2. Opening Changelog modal...');
  // Trigger changelog modal by evaluating openModal('changelog') or clicking version button
  await page.evaluate(() => {
    // Click version badge in footer if present or trigger custom event
    const versionBadge = Array.from(document.querySelectorAll('button, a, span'))
      .find(el => el.textContent?.includes('v3.1') || el.textContent?.includes('v3.0'));
    if (versionBadge) {
      (versionBadge.closest('button') || versionBadge).click();
    }
  });

  await page.waitForTimeout(800);

  // If modal not yet open, click specifically on the bottom version button or footer Changelog link
  const changelogTitle = await page.locator('text=CHANGELOG').count();
  if (changelogTitle === 0) {
    const changelogBtn = page.locator('button:has-text("Changelog"), button:has-text("What\'s New"), a:has-text("Changelog")').first();
    if (await changelogBtn.count() > 0) {
      await changelogBtn.click();
      await page.waitForTimeout(800);
    } else {
      // Direct footer landing link
      await page.evaluate(() => {
        const link = Array.from(document.querySelectorAll('a, button')).find(el => el.textContent?.toLowerCase().includes('changelog'));
        if (link) link.click();
      });
      await page.waitForTimeout(800);
    }
  }

  // Also check if What's New modal opened automatically
  const whatsNew = await page.locator('text=What\'s New in TypeNova').count();
  if (whatsNew > 0) {
    console.log('What\'s New modal opened! Capturing screenshot...');
    await page.screenshot({ path: path.join(__dirname, '../screenshot_whats_new.png'), fullPage: false });
    // Click "VIEW FULL CHANGELOG"
    const viewFullBtn = page.getByRole('button', { name: /VIEW FULL CHANGELOG/i });
    if (await viewFullBtn.count() > 0) {
      await viewFullBtn.click();
      await page.waitForTimeout(800);
    }
  }

  const screenshotPath = path.join(__dirname, '../screenshot_changelog_modal.png');
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log('Saved screenshot_changelog_modal.png');

  await browser.close();
  console.log('Changelog UI verification finished.');
}

run().catch(err => {
  console.error('Error during changelog UI verification:', err);
  process.exit(1);
});
