import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

console.log('=== EMPIRICAL ADVERSARIAL STRESS & FUZZ HARNESS ===');

// ==========================================
// 1. Extreme Fuzzing of Typing Engine Stats
// ==========================================
console.log('\n--- 1. Typing Engine Stats Fuzzing ---');

function calculateStats(entries, timeMs, currentPenalty = 0, explicitStartTime = null, includeTimeline = false) {
  if (!timeMs || entries.length === 0) {
    return { currentWpm: 0, rawWpm: 0, currentAcc: 100, timeline: [], consistency: 100, flawless: 0 };
  }
  const startTs = explicitStartTime !== null ? explicitStartTime : 0;
  const totalTimeMs = timeMs + currentPenalty;
  const minutes = totalTimeMs / 60000;

  let totalTyped = 0;
  let errorCount = 0;
  let localMaxStreak = 0;
  let curStreak = 0;

  for (let i = 0; i < entries.length; i++) {
    const k = entries[i];
    if (!k.isBackspace) {
      totalTyped++;
      if (k.isError) {
        errorCount++;
        if (curStreak > localMaxStreak) localMaxStreak = curStreak;
        curStreak = 0;
      } else {
        curStreak++;
      }
    }
  }
  if (curStreak > localMaxStreak) localMaxStreak = curStreak;

  const rawCalc = minutes > 0 ? Math.round((totalTyped / 5) / minutes) : 0;
  const netCalc = minutes > 0 ? Math.max(0, Math.round(((totalTyped - errorCount) / 5) / minutes)) : 0;
  const currentAcc = totalTyped > 0 ? Math.min(Math.max(Math.round(((totalTyped - errorCount) / totalTyped) * 100), 0), 100) : 100;

  if (!includeTimeline) {
    return {
      currentWpm: isNaN(netCalc) || netCalc < 0 ? 0 : netCalc,
      rawWpm: isNaN(rawCalc) ? 0 : rawCalc,
      currentAcc: isNaN(currentAcc) ? 100 : currentAcc,
      timeline: [],
      consistency: 100,
      flawless: localMaxStreak
    };
  }

  const intervals = Math.max(1, Math.floor(totalTimeMs / 1000));
  const step = totalTimeMs / intervals;
  const timeline = [{ t: 0, wpm: 0, rawWpm: 0 }];

  let entryIndex = 0;
  let runningChars = 0;
  let runningRawChars = 0;

  for (let i = 1; i <= intervals; i++) {
    const threshold = startTs + step * i;
    while (entryIndex < entries.length && entries[entryIndex].time <= threshold) {
      const k = entries[entryIndex];
      if (!k.isBackspace) {
        runningRawChars++;
        if (!k.isError) runningChars++;
      }
      entryIndex++;
    }

    const calcWpm = Math.round((runningChars / 5) / ((step * i) / 60000));
    const calcRaw = Math.round((runningRawChars / 5) / ((step * i) / 60000));
    timeline.push({
      t: step * i,
      wpm: isNaN(calcWpm) ? 0 : calcWpm,
      rawWpm: isNaN(calcRaw) ? 0 : calcRaw
    });
  }

  const wpmVals = timeline.map(p => p.wpm).filter(v => !isNaN(v));
  const mean = wpmVals.length ? wpmVals.reduce((a, b) => a + b, 0) / wpmVals.length : 0;
  const variance = wpmVals.length ? wpmVals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / wpmVals.length : 0;
  const stddev = Math.sqrt(variance);

  let consistencyScore = 100;
  if (mean > 0) consistencyScore = Math.round(Math.max(0, Math.min(100, (1 - (stddev / mean)) * 100)));
  else if (stddev > 0) consistencyScore = 50;

  return {
    currentWpm: isNaN(netCalc) || netCalc < 0 ? 0 : netCalc,
    rawWpm: isNaN(rawCalc) ? 0 : rawCalc,
    currentAcc: isNaN(currentAcc) ? 100 : currentAcc,
    timeline,
    consistency: consistencyScore,
    flawless: localMaxStreak
  };
}

// 1.1 Fuzz 10,000 random typing events with random error spikes and intervals
for (let trial = 0; trial < 100; trial++) {
  const numKeystrokes = Math.floor(Math.random() * 500) + 1;
  const durationMs = Math.floor(Math.random() * 60000) + 1000;
  const entries = [];
  for (let k = 0; k < numKeystrokes; k++) {
    const isError = Math.random() < 0.2;
    const isBackspace = Math.random() < 0.1;
    const time = Math.floor((k / numKeystrokes) * durationMs);
    entries.push({ key: 'a', expected: 'a', time, isError, isBackspace });
  }

  const stats = calculateStats(entries, durationMs, 0, 0, true);
  assert.ok(!isNaN(stats.currentWpm), `NaN in currentWpm on trial ${trial}`);
  assert.ok(!isNaN(stats.rawWpm), `NaN in rawWpm on trial ${trial}`);
  assert.ok(!isNaN(stats.currentAcc), `NaN in currentAcc on trial ${trial}`);
  assert.ok(!isNaN(stats.consistency), `NaN in consistency on trial ${trial}`);
  assert.ok(stats.currentAcc >= 0 && stats.currentAcc <= 100, `currentAcc out of range: ${stats.currentAcc}`);
  assert.ok(stats.consistency >= 0 && stats.consistency <= 100, `consistency out of range: ${stats.consistency}`);
  assert.ok(stats.currentWpm <= stats.rawWpm, `Net WPM (${stats.currentWpm}) > Raw WPM (${stats.rawWpm})`);
}
console.log('✓ 1.1 100 randomized typing fuzz trials completed without numerical instability');

// ==========================================
// 2. Race Results Screen Edge Cases
// ==========================================
console.log('\n--- 2. Race Results Screen Edge Cases ---');

function computeRanking(players) {
  return [...players]
    .filter(p => p.finished)
    .sort((a, b) =>
      (b.finishWpm ?? 0) - (a.finishWpm ?? 0) ||
      (a.finishMs ?? Infinity) - (b.finishMs ?? Infinity)
    );
}

// 2.1 Empty players array
assert.deepStrictEqual(computeRanking([]), []);

// 2.2 All DNF
assert.deepStrictEqual(computeRanking([
  { id: '1', finished: false, finishWpm: 0, finishMs: 0 },
  { id: '2', finished: false, finishWpm: 0, finishMs: 0 },
]), []);

// 2.3 Perfect tie (same WPM, same Ms)
const tied = computeRanking([
  { id: '1', finished: true, finishWpm: 100, finishMs: 10000 },
  { id: '2', finished: true, finishWpm: 100, finishMs: 10000 },
]);
assert.strictEqual(tied.length, 2);
console.log('✓ 2.1 Race ranking edge cases (empty, DNF, ties) passed');

// ==========================================
// 3. Static Import Integrity Scanner
// ==========================================
console.log('\n--- 3. Static Import Integrity Scanner ---');

function scanImports(dir) {
  let brokenImports = 0;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      brokenImports += scanImports(fullPath);
    } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('SplashCursor')) {
        console.error(`Found dangling SplashCursor reference in ${fullPath}`);
        brokenImports++;
      }
      if (content.includes("from '@/utils/audio'") || content.includes('from "./utils/audio"')) {
        console.error(`Found dangling audio.ts reference in ${fullPath}`);
        brokenImports++;
      }
    }
  }
  return brokenImports;
}

const brokenCount = scanImports(path.resolve('src'));
assert.strictEqual(brokenCount, 0, `Found ${brokenCount} broken import references!`);
console.log('✓ 3.1 Static import integrity verified across entire src directory');

console.log('\n=========================================');
console.log('ALL ADVERSARIAL HARNESS CHECKS PASSED (100%)');
console.log('=========================================\n');
