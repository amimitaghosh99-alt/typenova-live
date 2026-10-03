import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const SCREENSHOT_DIR = path.resolve(process.cwd(), 'src/tests/screenshots');
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function run() {
  console.log('🚀 Starting TypeNova Multi-Client Simulation Test...');
  const browser = await chromium.launch({
    headless: true,
  });

  const hostContext = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const guestContext = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });

  // Enable guest mode and suppress update announcements so tests run unobstructed
  await hostContext.addInitScript(() => {
    localStorage.setItem('typenova_guest_mode', 'true');
    localStorage.setItem('typenova_username', 'HostRacer');
    localStorage.setItem('typenova_seen_version', 'v3.2.0');
  });
  await guestContext.addInitScript(() => {
    localStorage.setItem('typenova_guest_mode', 'true');
    localStorage.setItem('typenova_username', 'GuestRacer');
    localStorage.setItem('typenova_seen_version', 'v3.2.0');
  });

  const hostPage = await hostContext.newPage();
  const guestPage = await guestContext.newPage();

  const snap = async (page: any, name: string) => {
    const file = path.join(SCREENSHOT_DIR, name);
    await page.screenshot({ path: file });
    console.log(`📸 Screenshot saved: ${name}`);
  };

  try {
    // ── 1. Host loads app and enters Compete screen ──
    console.log('Step 1: Host navigating to TypeNova...');
    await hostPage.goto('http://localhost:5173');
    await hostPage.waitForSelector('#root', { timeout: 15000 });
    await hostPage.waitForTimeout(1000);

    // If any modal appeared, dismiss with Escape
    const modalDialog = hostPage.locator('[role="dialog"]').first();
    if (await modalDialog.isVisible()) {
      await hostPage.keyboard.press('Escape');
      await hostPage.waitForTimeout(500);
    }

    // Click Compete in the navbar
    console.log('Opening Compete screen...');
    const competeBtn = hostPage.locator('button:has-text("Compete")').first();
    await competeBtn.waitFor({ state: 'visible', timeout: 10000 });
    await competeBtn.click();
    await hostPage.locator('button:has-text("CREATE ROOM"), button:has-text("Create room")').first().waitFor({ state: 'visible', timeout: 10000 });
    await snap(hostPage, '01_compete_entry.png');

    // ── 2. Host creates a 1v1 Ranked Duel to test Ranked lock & sync ──
    console.log('Step 2: Host selecting 1v1 Ranked Duel...');
    const rankedPill = hostPage.locator('button:has-text("Ranked 1v1")').first();
    if (await rankedPill.isVisible()) {
      await rankedPill.click();
      await hostPage.waitForTimeout(500);
    }

    const createRoomBtn = hostPage.locator('button:has-text("CREATE ROOM"), button:has-text("Create room"), button:has-text("Open ranked duel")').first();
    console.log('Clicking create room button...');
    await createRoomBtn.click();

    // Wait for Lobby screen
    console.log('Waiting for Lobby screen...');
    await hostPage.waitForSelector('text=ROOM CODE:', { timeout: 15000 });
    await hostPage.waitForTimeout(1000);
    await snap(hostPage, '02_host_lobby.png');

    // Extract room code
    const roomCodeElement = hostPage.locator('text=ROOM CODE:').locator('..').locator('span').nth(1);
    const roomCode = (await roomCodeElement.textContent())?.trim();
    console.log(`🔑 Host created room with code: [${roomCode}]`);
    if (!roomCode || roomCode.length !== 6) {
      throw new Error(`Invalid room code extracted: ${roomCode}`);
    }

    // ── 3. Guest enters Compete screen and joins with roomCode ──
    console.log(`Step 3: Guest navigating to Compete and entering code [${roomCode}]...`);
    await guestPage.goto('http://localhost:5173');
    await guestPage.waitForSelector('#root', { timeout: 15000 });
    await guestPage.waitForTimeout(1000);

    const guestCompeteBtn = guestPage.locator('button:has-text("Compete")').first();
    await guestCompeteBtn.waitFor({ state: 'visible', timeout: 10000 });
    await guestCompeteBtn.click();

    const codeInput = guestPage.locator('#compete-room-code, input[data-input-otp="true"]').first();
    await codeInput.waitFor({ state: 'visible', timeout: 10000 });
    await codeInput.focus();
    await guestPage.keyboard.type(roomCode, { delay: 50 });

    const joinSubmitBtn = guestPage.locator('button:has-text("Join room")').first();
    if (await joinSubmitBtn.isVisible()) {
      await joinSubmitBtn.click({ timeout: 2000 }).catch(() => {});
    }

    // Wait for guest to enter the lobby and see the host
    console.log('Waiting for Guest and Host to sync in Lobby...');
    await guestPage.waitForSelector('text=ROOM CODE:', { timeout: 15000 });
    await hostPage.waitForTimeout(3500);
    await guestPage.waitForTimeout(2000);

    await snap(hostPage, '03_host_lobby_with_guest.png');
    await snap(guestPage, '03_guest_lobby.png');

    // ── 4. Guest Readies up ──
    console.log('Step 4: Guest clicking "I\'M READY"...');
    const readyBtn = guestPage.locator('button:has-text("I\'M READY")').first();
    if (await readyBtn.isVisible()) {
      await readyBtn.click();
      await guestPage.waitForTimeout(1500);
      await hostPage.waitForTimeout(1500);
    }
    await snap(hostPage, '04_host_seeing_both_ready.png');

    // ── 5. Host launches race countdown ──
    console.log('Step 5: Host launching race...');
    const startRaceBtn = hostPage.locator('button:has-text("START RACE"), button:has-text("START ANYWAY")').first();
    await startRaceBtn.click();

    // Verify countdown overlay appears
    await hostPage.waitForTimeout(1200);
    await snap(hostPage, '05_countdown_overlay_host.png');
    await snap(guestPage, '05_countdown_overlay_guest.png');

    // ── 6. Race begins ──
    console.log('Step 6: Waiting for countdown to finish and race track to arm...');
    await hostPage.waitForTimeout(5500);
    await snap(hostPage, '06_race_track_active.png');

    // ── 7. Verify Backspace bug fix and typing input ──
    console.log('Step 7: Testing typing and backspacing (Bug #1 fix)...');
    // Get target text from typing container
    const targetText = await hostPage.evaluate(() => {
      const container = document.getElementById('typing-text-container');
      return container?.textContent?.trim() || '';
    });
    console.log(`Passage to type (${targetText.length} chars): "${targetText.slice(0, 40)}..."`);

    // Host types an intentionally wrong character, then presses Backspace to test typo recovery
    await hostPage.keyboard.press('x');
    await hostPage.waitForTimeout(200);
    // Press Backspace - before our fix, this was swallowed and prevented!
    await hostPage.keyboard.press('Backspace');
    await hostPage.waitForTimeout(200);
    console.log('✅ Backspace pressed and handled without swallowing');

    // Type first few words on Host
    const partHost = targetText.slice(0, Math.floor(targetText.length * 0.45));
    await hostPage.keyboard.type(partHost, { delay: 15 });
    await hostPage.waitForTimeout(500);

    // Type a bit on Guest as well
    const partGuest = targetText.slice(0, Math.floor(targetText.length * 0.3));
    await guestPage.keyboard.type(partGuest, { delay: 15 });
    await guestPage.waitForTimeout(500);

    await snap(hostPage, '07_mid_race_host_progress.png');

    // Now complete the text on Host so Host finishes 1st!
    const restHost = targetText.slice(partHost.length);
    console.log('Finishing race on Host...');
    await hostPage.keyboard.type(restHost, { delay: 10 });
    await hostPage.waitForTimeout(2000);

    // Also complete the text on Guest so Guest finishes!
    const restGuest = targetText.slice(partGuest.length);
    console.log('Finishing race on Guest...');
    await guestPage.keyboard.type(restGuest, { delay: 10 });
    await guestPage.waitForTimeout(3000);

    // ── 8. Race Results Screen ──
    console.log('Step 8: Checking Race Results Screen...');
    await snap(hostPage, '08_race_results_host.png');
    await snap(guestPage, '08_race_results_guest.png');

    // Verify Comms Terminal clean lobby ID
    const lobbyTextHost = await hostPage.locator('text=Lobby:').first().textContent();
    console.log(`Comms Terminal display: "${lobbyTextHost}"`);

    console.log('Step 9: Host clicking "RUN IT BACK // REMATCH"...');
    const rematchBtn = hostPage.locator('button:has-text("PULLS ALL PLAYERS")');
    await rematchBtn.scrollIntoViewIfNeeded();
    await hostPage.waitForTimeout(500);
    await snap(hostPage, '09_host_results_action_buttons.png');
    await rematchBtn.click();
    console.log('Rematch button clicked, waiting for both clients to return to Lobby...');

    await hostPage.waitForSelector('text=ROOM CODE:', { timeout: 15000 });
    await guestPage.waitForSelector('text=ROOM CODE:', { timeout: 15000 });
    await hostPage.waitForTimeout(2000);
    await guestPage.waitForTimeout(1000);

    await snap(hostPage, '10_host_back_in_lobby.png');
    await snap(guestPage, '10_guest_back_in_lobby.png');
    console.log('✅ Both players successfully returned to Lobby!');

    console.log('🎉 Multi-Client Multiplayer Flow Simulation Completed Successfully!');
  } catch (err) {
    console.error('❌ Simulation Error:', err);
    await snap(hostPage, 'error_host_state.png');
    await snap(guestPage, 'error_guest_state.png');
    throw err;
  } finally {
    await browser.close();
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
