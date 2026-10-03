import { chromium } from 'playwright';
import path from 'path';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  await context.addInitScript(() => {
    localStorage.setItem('typenova_guest_mode', 'true');
    localStorage.setItem('typenova_username', 'HostRacer');
    localStorage.setItem('typenova_seen_version', 'v3.2.0');
    localStorage.setItem('typenova_wallpaper_color', '239, 68, 68');
  });

  const page = await context.newPage();

  try {
    console.log('Navigating to http://localhost:5173...');
    await page.goto('http://localhost:5173');
    await page.waitForSelector('#root', { timeout: 15000 });
    await page.waitForTimeout(1000);

    const modalDialog = page.locator('[role="dialog"]').first();
    if (await modalDialog.isVisible()) {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }

    console.log('Clicking Compete...');
    const competeBtn = page.locator('button:has-text("Compete")').first();
    await competeBtn.waitFor({ state: 'visible', timeout: 10000 });
    await competeBtn.click();

    const rankedPill = page.locator('button:has-text("Ranked 1v1")').first();
    if (await rankedPill.isVisible()) {
      await rankedPill.click();
      await page.waitForTimeout(500);
    }

    const createRoomBtn = page.locator('button:has-text("CREATE ROOM"), button:has-text("Create room"), button:has-text("Open ranked duel")').first();
    await createRoomBtn.click();

    console.log('Waiting for Lobby screen...');
    await page.waitForSelector('text=ROOM CODE:', { timeout: 15000 });
    await page.waitForTimeout(1500);

    const outPath = path.join(process.cwd(), 'src', 'tests', 'screenshots', 'verified_lobby_contrast.png');
    await page.screenshot({ path: outPath });
    console.log(`📸 Screenshot saved: ${outPath}`);
  } catch (err) {
    console.error('Error during verification:', err);
  } finally {
    await browser.close();
  }
}

main();
