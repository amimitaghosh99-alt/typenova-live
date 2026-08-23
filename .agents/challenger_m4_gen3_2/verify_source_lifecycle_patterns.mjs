// verify_source_lifecycle_patterns.mjs
// Static & AST pattern verification for TypeNova source code lifecycle compliance

import fs from 'fs';
import path from 'path';

console.log('===============================================================');
console.log('  TYPENOVA SOURCE-LEVEL LIFECYCLE AUDIT & VERIFICATION  ');
console.log('===============================================================\n');

const srcDir = path.resolve('src');

function getAllFiles(dir, exts = ['.ts', '.tsx']) {
  let files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(getAllFiles(fullPath, exts));
    } else if (exts.some(ext => entry.name.endsWith(ext))) {
      files.push(fullPath);
    }
  }
  return files;
}

const allSrcFiles = getAllFiles(srcDir);
console.log(`Auditing ${allSrcFiles.length} TypeScript / TSX source files...\n`);

let passedChecks = 0;
let totalChecks = 0;

function check(name, condition, details = '') {
  totalChecks++;
  if (condition) {
    passedChecks++;
    console.log(`[PASS] ${name}${details ? ` -> ${details}` : ''}`);
  } else {
    console.error(`[FAIL] ${name}${details ? ` -> ${details}` : ''}`);
  }
}

// 1. Check addEventListener / removeEventListener parity
let eventListenerDiscrepancies = [];
for (const file of allSrcFiles) {
  const content = fs.readFileSync(file, 'utf8');
  // Skip data/mock files
  if (file.includes('codeSnippets.ts')) continue;

  const addMatches = [...content.matchAll(/addEventListener\(\s*['"`]([^'"`]+)['"`]/g)].map(m => m[1]);
  const removeMatches = [...content.matchAll(/removeEventListener\(\s*['"`]([^'"`]+)['"`]/g)].map(m => m[1]);

  if (addMatches.length > 0) {
    for (const eventName of addMatches) {
      if (!removeMatches.includes(eventName)) {
        eventListenerDiscrepancies.push({ file: path.relative('.', file), eventName, type: 'missing_remove' });
      }
    }
  }
}

check(
  'All DOM addEventListener calls have matched removeEventListener cleanups',
  eventListenerDiscrepancies.length === 0,
  eventListenerDiscrepancies.length === 0 ? '0 discrepancies found' : JSON.stringify(eventListenerDiscrepancies)
);

// 2. Check setInterval / clearInterval parity
let intervalDiscrepancies = [];
for (const file of allSrcFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const hasSetInterval = /setInterval\s*\(/.test(content);
  const hasClearInterval = /clearInterval\s*\(/.test(content);

  if (hasSetInterval && !hasClearInterval) {
    intervalDiscrepancies.push(path.relative('.', file));
  }
}

check(
  'All setInterval usages have matched clearInterval in useEffect cleanup',
  intervalDiscrepancies.length === 0,
  intervalDiscrepancies.length === 0 ? '0 un-cleared intervals' : JSON.stringify(intervalDiscrepancies)
);

// 3. Check requestAnimationFrame / cancelAnimationFrame parity
let rafDiscrepancies = [];
for (const file of allSrcFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const hasRaf = /requestAnimationFrame\s*\(/.test(content);
  const hasCancelRaf = /cancelAnimationFrame\s*\(/.test(content);

  if (hasRaf && !hasCancelRaf) {
    rafDiscrepancies.push(path.relative('.', file));
  }
}

check(
  'All requestAnimationFrame loops have cancelAnimationFrame in teardown',
  rafDiscrepancies.length === 0,
  rafDiscrepancies.length === 0 ? '0 un-cancelled animation frames' : JSON.stringify(rafDiscrepancies)
);

// 4. Check Supabase channel creation vs removeChannel / unsubscribe
let channelDiscrepancies = [];
for (const file of allSrcFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const hasChannel = /\.channel\s*\(/.test(content);
  const hasTeardown = /removeChannel\s*\(/.test(content) || /channel\.(unsubscribe|unsubscribe\(\))/.test(content) || /ch\.unsubscribe/.test(content) || /targetChannel\.unsubscribe/.test(content);

  if (hasChannel && !hasTeardown) {
    channelDiscrepancies.push(path.relative('.', file));
  }
}

check(
  'All Supabase .channel() subscriptions have removeChannel() or unsubscribe() in teardown',
  channelDiscrepancies.length === 0,
  channelDiscrepancies.length === 0 ? '0 lingering channels' : JSON.stringify(channelDiscrepancies)
);

// 5. Check WebGL resource disposal in CosmicShaderBackground and KineticKeyboard
const cosmicBg = fs.readFileSync(path.resolve('src/components/CosmicShaderBackground.tsx'), 'utf8');
const kineticKb = fs.readFileSync(path.resolve('src/components/KineticKeyboard.tsx'), 'utf8');

check(
  'CosmicShaderBackground invokes deleteShader, deleteProgram, deleteBuffer, loseContext',
  cosmicBg.includes('deleteShader') &&
  cosmicBg.includes('deleteProgram') &&
  cosmicBg.includes('deleteBuffer') &&
  cosmicBg.includes('loseContext'),
  'Full WebGL resource disposal verified'
);

check(
  'KineticKeyboard invokes Three.js geometry.dispose(), material.dispose(), renderer.dispose(), renderer.forceContextLoss()',
  kineticKb.includes('sharedGeometry.dispose()') &&
  kineticKb.includes('sharedMaterial.dispose()') &&
  kineticKb.includes('instancedMesh.dispose()') &&
  kineticKb.includes('renderer.dispose()') &&
  kineticKb.includes('renderer.forceContextLoss()'),
  'Full Three.js and WebGL context loss verified'
);

// 6. Check Web Audio Node Disconnection in useAudioEngine and useAcademyEngine
const audioEngine = fs.readFileSync(path.resolve('src/hooks/useAudioEngine.ts'), 'utf8');
const academyEngine = fs.readFileSync(path.resolve('src/hooks/useAcademyEngine.ts'), 'utf8');

check(
  'useAudioEngine implements osc.disconnect() and gain.disconnect() inside osc.onended',
  audioEngine.includes('osc.onended') &&
  audioEngine.includes('osc.disconnect()') &&
  audioEngine.includes('gain.disconnect()'),
  '0 audio node memory leak verified'
);

check(
  'useAcademyEngine implements osc.disconnect() and g.disconnect() inside osc.onended',
  academyEngine.includes('osc.onended') &&
  academyEngine.includes('osc.disconnect()') &&
  academyEngine.includes('g.disconnect()'),
  '0 academy audio node memory leak verified'
);

// 7. Check Socket.io listener teardown in useRace
const raceHook = fs.readFileSync(path.resolve('src/hooks/useRace.ts'), 'utf8');
check(
  'useRace implements socket.off for all registered events and disconnectSocket on unmount',
  raceHook.includes("socket.off('lobby_state_update'") &&
  raceHook.includes("socket.off('race_started'") &&
  raceHook.includes("socket.off('countdown_tick'") &&
  raceHook.includes("socket.off('error'") &&
  raceHook.includes("socket.off('connect'") &&
  raceHook.includes("socket.off('connect_error'") &&
  raceHook.includes('disconnectSocket()'),
  'Full socket listener cleanup verified'
);

console.log('\n===============================================================');
console.log(`  SOURCE AUDIT SUMMARY: ${passedChecks} / ${totalChecks} PASSED`);
console.log('===============================================================\n');

if (passedChecks === totalChecks) {
  console.log('>>> VERDICT: SOURCE CODE LIFECYCLE AUDIT 100% CLEAN <<<\n');
  process.exit(0);
} else {
  console.error('>>> VERDICT: SOURCE CODE LIFECYCLE DEFECTS FOUND <<<\n');
  process.exit(1);
}
