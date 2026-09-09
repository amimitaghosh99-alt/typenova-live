// Is the SVG box animating with its wrapper, or snapping? Samples both per frame
// across an expand toggle. Temporary; deleted after use.
const CDP = 'http://localhost:9455';
const APP = 'http://localhost:3000';

async function target() {
  for (let i = 0; i < 50; i++) {
    try {
      const l = await (await fetch(CDP + '/json/list')).json();
      const p = l.find((t) => t.type === 'page');
      if (p?.webSocketDebuggerUrl) return p.webSocketDebuggerUrl;
    } catch { /* starting */ }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error('no page target');
}
const ws = new WebSocket(await target());
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
let seq = 0; const pending = new Map(); const waiters = [];
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id != null && pending.has(m.id)) {
    const p = pending.get(m.id); pending.delete(m.id);
    m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); return;
  }
  for (let i = waiters.length - 1; i >= 0; i--) if (waiters[i].method === m.method) { waiters[i].resolve(m.params); waiters.splice(i, 1); }
};
const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++seq; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })); });
const waitFor = (method, ms = 30000) => new Promise((resolve, reject) => { const w = { method, resolve }; waiters.push(w); setTimeout(() => { const i = waiters.indexOf(w); if (i >= 0) { waiters.splice(i, 1); reject(new Error('timeout ' + method)); } }, ms); });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ev = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails.exception?.description ?? r.exceptionDetails));
  return r.result?.value;
};

await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false });

const first = waitFor('Page.loadEventFired');
await send('Page.navigate', { url: `${APP}/` });
await first;
await ev(`(() => {
  const LEVELS = ['NOVICE','ADEPT','MASTER','QUOTES','CODE'];
  const history = [];
  for (let i = 110; i >= 0; i--) {
    const d = new Date(Date.now() - (Math.floor(i * 1.1) + (i % 7 === 0 ? 3 : 0)) * 86400000);
    const wpm = Math.max(20, Math.round(40 + (110 - i) * 0.2 + Math.sin(i * 0.7) * 9));
    const timed = i % 3 === 0;
    history.push({ d: d.toISOString(), wpm, acc: Math.min(100, Math.round(84 + Math.sin(i * 0.55) * 11)), cons: 70, level: LEVELS[i % 5], mode: timed ? 'time' : 'words', size: timed ? [15,30,60][i % 3] : [25,50,100][i % 3] });
  }
  localStorage.setItem('guestMode', 'true');
  localStorage.setItem('typenova_terms_accepted', 'true');
  localStorage.setItem('typezen_history', JSON.stringify(history));
  localStorage.setItem('typezen_xp', '260100');
  localStorage.setItem('typezen_tests', String(history.length));
  localStorage.setItem('typenova_active_title', 'marathoner');
  return true;
})()`);
const loaded = waitFor('Page.loadEventFired');
await send('Page.navigate', { url: `${APP}/operator` });
await loaded;
await sleep(4500);

const trace = await ev(`(() => new Promise((done) => {
  const host = document.querySelector('#form .ifc-host');
  const svg = host.querySelector('svg');
  const grid = svg.querySelector('line');
  const samples = [];
  const btn = document.querySelector('#form button[aria-label*="xpand"]');
  const t0 = performance.now();
  function step(now) {
    samples.push({
      t: Math.round(now - t0),
      host: Math.round(host.getBoundingClientRect().height),
      svgAttr: Number(svg.getAttribute('height')),
      viewBox: svg.getAttribute('viewBox'),
      gridY: Math.round(Number(grid.getAttribute('y1'))),
    });
    if (now - t0 < 620) requestAnimationFrame(step);
    else done(samples);
  }
  btn.click();
  requestAnimationFrame(step);
}))()`);

console.log(' t(ms)  host  svgH  gridY   viewBox');
for (const s of trace.filter((_, i) => i % 3 === 0)) {
  console.log(`${String(s.t).padStart(6)}${String(s.host).padStart(6)}${String(s.svgAttr).padStart(6)}${String(s.gridY).padStart(7)}   ${s.viewBox}`);
}
const jumps = [];
for (let i = 1; i < trace.length; i++) {
  const d = Math.abs(trace[i].svgAttr - trace[i - 1].svgAttr);
  if (d > 1) jumps.push(`t=${trace[i].t} svgH ${trace[i - 1].svgAttr} -> ${trace[i].svgAttr} (${d}px) while host was ${trace[i].host}`);
}
console.log('--- svg height jumps ---');
console.log(jumps.length ? jumps.join('\n') : 'none');

ws.close();
process.exit(0);
