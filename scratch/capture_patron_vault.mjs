import { spawn } from 'child_process';
import { writeFileSync } from 'fs';

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const debugPort = 9249;
const artifactDir = 'C:\\Users\\risho\\.gemini\\antigravity\\brain\\4c417afc-203a-4f2c-bc1a-6178960c948d';

const browser = spawn(edgePath, [
  `--remote-debugging-port=${debugPort}`,
  '--remote-allow-origins=*',
  '--headless=new',
  '--disable-gpu',
  '--no-first-run',
  '--no-default-browser-check',
  '--user-data-dir=C:\\Users\\risho\\.gemini\\antigravity\\brain\\4c417afc-203a-4f2c-bc1a-6178960c948d\\scratch\\edge_debug_patron2',
  '--window-size=1440,1200',
  'http://localhost:3001/'
]);

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function waitForWS(maxTries = 30) {
  for (let i = 0; i < maxTries; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${debugPort}/json/version`);
      if (res.ok) {
        const listRes = await fetch(`http://127.0.0.1:${debugPort}/json/list`);
        const pages = await listRes.json();
        const p = pages.find(pg => pg.type === 'page');
        if (p && p.webSocketDebuggerUrl) return p.webSocketDebuggerUrl;
      }
    } catch {}
    await sleep(400);
  }
  throw new Error('DevTools timeout');
}

async function run() {
  try {
    const wsUrl = await waitForWS();
    const ws = new WebSocket(wsUrl);
    let id = 1;
    const map = new Map();

    ws.onmessage = (e) => {
      const d = JSON.parse(e.data);
      if (d.id && map.has(d.id)) {
        map.get(d.id)(d.result);
        map.delete(d.id);
      }
    };

    const send = (method, params = {}) => {
      const curId = id++;
      return new Promise(res => {
        map.set(curId, res);
        ws.send(JSON.stringify({ id: curId, method, params }));
      });
    };

    await new Promise(r => ws.onopen = r);

    await send('Page.enable');
    await send('Runtime.enable');
    await send('Input.enable');

    await sleep(1200);

    // Setup local storage for guest mode and accepted terms
    await send('Runtime.evaluate', {
      expression: `(() => {
        localStorage.setItem('typenova_terms_accepted', 'true');
        localStorage.setItem('typenova_consent_version', '2.5.1');
        localStorage.setItem('guestMode', 'true');
      })()`
    });

    // Navigate to /donate directly
    console.log('Navigating to /donate...');
    await send('Page.navigate', { url: 'http://localhost:3001/donate' });
    await sleep(2000);

    // 1. Capture Top Hero & Goal View
    console.log('Capturing hero & target goal screenshot...');
    const shot1 = await send('Page.captureScreenshot', { format: 'png' });
    writeFileSync(`${artifactDir}\\patron_vault_hero.png`, Buffer.from(shot1.data, 'base64'));

    // 2. Scroll down to show the payment bento matrix (UPI with QR & Global Platforms & Crypto)
    console.log('Scrolling to payment bento matrix...');
    await send('Runtime.evaluate', {
      expression: `(() => {
        const scroller = document.querySelector('.overflow-y-auto');
        if (scroller) scroller.scrollTop = 550;
      })()`
    });
    await sleep(1000);

    const shot2 = await send('Page.captureScreenshot', { format: 'png' });
    writeFileSync(`${artifactDir}\\patron_vault_payment_matrix.png`, Buffer.from(shot2.data, 'base64'));

    // 3. Select ₹500 chip and click Claim & Equip Cyber Patron Title
    console.log('Interacting with UPI selector and equipping title...');
    await send('Runtime.evaluate', {
      expression: `(() => {
        // Find and click the ₹500 button
        const buttons = Array.from(document.querySelectorAll('button'));
        const btn500 = buttons.find(b => b.textContent?.trim() === '₹500');
        if (btn500) btn500.click();

        // Find and click Claim & Equip Title
        const equipBtn = buttons.find(b => b.textContent?.includes('CLAIM & EQUIP TITLE') || b.textContent?.includes('CLAIM'));
        if (equipBtn) equipBtn.click();
      })()`
    });
    await sleep(800);

    // Scroll to the bottom to view the equipped title card, crypto, and footer
    await send('Runtime.evaluate', {
      expression: `(() => {
        const scroller = document.querySelector('.overflow-y-auto');
        if (scroller) scroller.scrollTop = 1200;
      })()`
    });
    await sleep(1000);

    const shot3 = await send('Page.captureScreenshot', { format: 'png' });
    writeFileSync(`${artifactDir}\\patron_vault_equipped.png`, Buffer.from(shot3.data, 'base64'));

    console.log('Successfully captured all screenshots.');
    ws.close();
    browser.kill();
    process.exit(0);
  } catch (err) {
    console.error('Execution error:', err);
    browser.kill();
    process.exit(1);
  }
}

run();
