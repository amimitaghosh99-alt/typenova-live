/**
 * Empirical Adversarial Stress Test Suite for Milestone 1: Core Scoring & Grading Engine
 * Written by Challenger 2
 */

import {
  calculateCPI,
  evaluateGrade,
  calculateBurstWpm,
  calculateAccolades,
  calculateXPProgression,
  calculateGhostDelta,
  getGradeDetails,
  GRADE_DETAILS,
  type PerformanceGrade,
} from '../lib/scoringEngine.ts';

const GRADE_RANK: Record<PerformanceGrade, number> = {
  'D': 0,
  'C': 1,
  'B': 2,
  'A': 3,
  'S': 4,
  'S+': 5,
};

let totalChecks = 0;
const violations: string[] = [];

function check(condition: boolean, msg: string) {
  totalChecks++;
  if (!condition) {
    violations.push(msg);
    if (violations.length <= 20) {
      console.error(`❌ VIOLATION [${totalChecks}]: ${msg}`);
    }
  }
}

console.log('================================================================');
console.log('🚀 RUNNING ADVERSARIAL EMPIRICAL STRESS TEST (CHALLENGER 2)');
console.log('================================================================\n');

// ----------------------------------------------------------------------------
// TEST 1: MONOTONICITY OF ACCURACY (CPI and Grade must never decrease as Acc increases)
// ----------------------------------------------------------------------------
console.log('--- Test 1: Accuracy Monotonicity ---');
const wpmsToTest = [15, 25, 40, 60, 80, 100, 130, 160];
const streakSample = [0, 20, 50, 100, 200];
const consSample = [50, 70, 85, 90, 95, 100];
const charSample = [50, 200, 500];

for (const wpm of wpmsToTest) {
  for (const streak of streakSample) {
    for (const cons of consSample) {
      for (const chars of charSample) {
        let prevCpi = -1;
        let prevGradeRank = -1;
        for (let acc = 0; acc <= 100; acc += 1) {
          const res = calculateCPI(wpm, acc, streak, cons, chars);
          const gradeRank = GRADE_RANK[res.grade];
          
          if (prevCpi !== -1) {
            check(
              res.cpi >= prevCpi,
              `CPI decreased when Accuracy increased: wpm=${wpm}, streak=${streak}, cons=${cons}, chars=${chars}, acc=${acc-1}->${acc}, cpi=${prevCpi}->${res.cpi}`
            );
            check(
              gradeRank >= prevGradeRank,
              `Grade demoted when Accuracy increased: wpm=${wpm}, streak=${streak}, cons=${cons}, chars=${chars}, acc=${acc-1}->${acc}, grade=${prevGradeRank}->${gradeRank}`
            );
          }
          prevCpi = res.cpi;
          prevGradeRank = gradeRank;
        }
      }
    }
  }
}
console.log(`Accuracy Monotonicity checks completed. Total checks so far: ${totalChecks}`);

// ----------------------------------------------------------------------------
// TEST 2: MONOTONICITY OF CONSISTENCY (CPI and Grade must never decrease as Consistency increases)
// ----------------------------------------------------------------------------
console.log('--- Test 2: Consistency Monotonicity ---');
for (const wpm of wpmsToTest) {
  for (const acc of [70, 75, 85, 90, 95, 98, 100]) {
    for (const streak of streakSample) {
      for (const chars of [100, 250]) {
        let prevCpi = -1;
        let prevGradeRank = -1;
        for (let cons = 0; cons <= 100; cons += 1) {
          const res = calculateCPI(wpm, acc, streak, cons, chars);
          const gradeRank = GRADE_RANK[res.grade];
          
          if (prevCpi !== -1) {
            check(
              res.cpi >= prevCpi,
              `CPI decreased when Consistency increased: wpm=${wpm}, acc=${acc}, streak=${streak}, chars=${chars}, cons=${cons-1}->${cons}, cpi=${prevCpi}->${res.cpi}`
            );
            check(
              gradeRank >= prevGradeRank,
              `Grade demoted when Consistency increased: wpm=${wpm}, acc=${acc}, streak=${streak}, chars=${chars}, cons=${cons-1}->${cons}, grade=${prevGradeRank}->${gradeRank}`
            );
          }
          prevCpi = res.cpi;
          prevGradeRank = gradeRank;
        }
      }
    }
  }
}
console.log(`Consistency Monotonicity checks completed. Total checks so far: ${totalChecks}`);

// ----------------------------------------------------------------------------
// TEST 3: MONOTONICITY OF STREAK (CPI and Grade must never decrease as Streak increases)
// ----------------------------------------------------------------------------
console.log('--- Test 3: Streak Monotonicity ---');
for (const wpm of wpmsToTest) {
  for (const acc of [80, 90, 95, 98, 100]) {
    for (const cons of [70, 85, 95]) {
      for (const chars of [100, 250]) {
        let prevCpi = -1;
        let prevGradeRank = -1;
        for (let streak = 0; streak <= 300; streak += 5) {
          const res = calculateCPI(wpm, acc, streak, cons, chars);
          const gradeRank = GRADE_RANK[res.grade];
          
          if (prevCpi !== -1) {
            check(
              res.cpi >= prevCpi,
              `CPI decreased when Streak increased: wpm=${wpm}, acc=${acc}, cons=${cons}, chars=${chars}, streak=${streak-5}->${streak}, cpi=${prevCpi}->${res.cpi}`
            );
            check(
              gradeRank >= prevGradeRank,
              `Grade demoted when Streak increased: wpm=${wpm}, acc=${acc}, cons=${cons}, chars=${chars}, streak=${streak-5}->${streak}, grade=${prevGradeRank}->${gradeRank}`
            );
          }
          prevCpi = res.cpi;
          prevGradeRank = gradeRank;
        }
      }
    }
  }
}
console.log(`Streak Monotonicity checks completed. Total checks so far: ${totalChecks}`);

// ----------------------------------------------------------------------------
// TEST 4: MONOTONICITY OF WPM (CPI and Grade must never decrease as WPM increases)
// ----------------------------------------------------------------------------
console.log('--- Test 4: WPM Monotonicity ---');
for (const acc of [75, 85, 90, 95, 98, 100]) {
  for (const cons of [70, 85, 95]) {
    for (const streak of [0, 50, 100, 200]) {
      for (const chars of [100, 250]) {
        let prevCpi = -1;
        let prevGradeRank = -1;
        for (let wpm = 1; wpm <= 200; wpm += 1) {
          const res = calculateCPI(wpm, acc, streak, cons, chars);
          const gradeRank = GRADE_RANK[res.grade];
          
          if (prevCpi !== -1) {
            check(
              res.cpi >= prevCpi,
              `CPI decreased when WPM increased: acc=${acc}, cons=${cons}, streak=${streak}, chars=${chars}, wpm=${wpm-1}->${wpm}, cpi=${prevCpi}->${res.cpi}`
            );
            check(
              gradeRank >= prevGradeRank,
              `Grade demoted when WPM increased: acc=${acc}, cons=${cons}, streak=${streak}, chars=${chars}, wpm=${wpm-1}->${wpm}, grade=${prevGradeRank}->${gradeRank}`
            );
          }
          prevCpi = res.cpi;
          prevGradeRank = gradeRank;
        }
      }
    }
  }
}
console.log(`WPM Monotonicity checks completed. Total checks so far: ${totalChecks}`);

// ----------------------------------------------------------------------------
// TEST 5: DIRECT EVALUATE_GRADE MONOTONICITY
// evaluateGrade(cpi, acc, isFlawless, consistency)
// ----------------------------------------------------------------------------
console.log('--- Test 5: evaluateGrade Direct Monotonicity ---');
for (let cpi = 0; cpi <= 200; cpi += 2) {
  for (let acc = 50; acc <= 100; acc += 2) {
    for (const isFlawless of [false, true]) {
      for (let cons = 50; cons <= 100; cons += 5) {
        const grade = evaluateGrade(cpi, acc, isFlawless, cons);
        const gradeRank = GRADE_RANK[grade];

        // Increasing CPI should not lower grade
        const higherCpiGrade = evaluateGrade(cpi + 5, acc, isFlawless, cons);
        check(
          GRADE_RANK[higherCpiGrade] >= gradeRank,
          `evaluateGrade demoted with higher CPI: cpi=${cpi}->${cpi+5}, acc=${acc}, cons=${cons}, flawless=${isFlawless}, grade=${grade}->${higherCpiGrade}`
        );

        // Increasing Acc should not lower grade
        if (acc + 2 <= 100) {
          const higherAccGrade = evaluateGrade(cpi, acc + 2, isFlawless, cons);
          check(
            GRADE_RANK[higherAccGrade] >= gradeRank,
            `evaluateGrade demoted with higher Acc: cpi=${cpi}, acc=${acc}->${acc+2}, cons=${cons}, flawless=${isFlawless}, grade=${grade}->${higherAccGrade}`
          );
        }

        // Setting isFlawless = true should not lower grade
        if (!isFlawless) {
          const flawlessGrade = evaluateGrade(cpi, acc, true, cons);
          check(
            GRADE_RANK[flawlessGrade] >= gradeRank,
            `evaluateGrade demoted with isFlawless=true: cpi=${cpi}, acc=${acc}, cons=${cons}, grade=${grade}->${flawlessGrade}`
          );
        }

        // Increasing Cons should not lower grade
        if (cons + 5 <= 100) {
          const higherConsGrade = evaluateGrade(cpi, acc, isFlawless, cons + 5);
          check(
            GRADE_RANK[higherConsGrade] >= gradeRank,
            `evaluateGrade demoted with higher Cons: cpi=${cpi}, acc=${acc}, cons=${cons}->${cons+5}, flawless=${isFlawless}, grade=${grade}->${higherConsGrade}`
          );
        }
      }
    }
  }
}
console.log(`evaluateGrade Monotonicity checks completed. Total checks so far: ${totalChecks}`);

// ----------------------------------------------------------------------------
// TEST 6: SPEED GRID AT 100% ACCURACY [20, 30, 40, 50, 60 WPM]
// Core Requirement & Acceptance Criteria
// ----------------------------------------------------------------------------
console.log('\n--- Test 6: Speed Grid [20, 30, 40, 50, 60 WPM] at 100% Accuracy ---');
const speedGrid = [20, 30, 40, 50, 60];
const passageLengths = [
  { name: 'Standard 25 words', chars: 125 },
  { name: 'Standard 50 words', chars: 250 },
  { name: 'Standard 100 words', chars: 500 },
];
const consVariants = [70, 75, 80, 85, 90, 95, 100];

console.log('Speed Grid Results:');
console.log('WPM | Chars | Cons | CPI | Grade | PrecisionBonus | ComboBonus | ConsistencyBonus');
console.log('----+-------+------+-----+-------+----------------+------------+-----------------');

for (const wpm of speedGrid) {
  for (const pl of passageLengths) {
    for (const cons of consVariants) {
      const streak = pl.chars; // 100% accuracy unbroken
      const res = calculateCPI(wpm, 100, streak, cons, pl.chars);
      
      // Verification rules:
      // At 40 WPM @ 100% Acc, Grade MUST be 'A', 'S', or 'S+', NEVER 'C' or 'D'.
      if (wpm === 40) {
        check(
          res.grade === 'A' || res.grade === 'S' || res.grade === 'S+',
          `40 WPM @ 100% Accuracy failed to get A, S, or S+! Got: ${res.grade} (CPI: ${res.cpi})`
        );
        check(res.grade !== 'C', `40 WPM @ 100% Acc demoted to Grade C!`);
        check(res.grade !== 'D', `40 WPM @ 100% Acc demoted to Grade D!`);
      }

      // At >= 50 WPM @ 100% Acc, Grade should be S or S+
      if (wpm >= 50 && cons >= 75) {
        check(
          res.grade === 'S' || res.grade === 'S+',
          `${wpm} WPM @ 100% Acc failed to get S/S+! Got: ${res.grade} (CPI: ${res.cpi})`
        );
      }

      // At 20 WPM @ 100% Acc, CPI should be >= 50 (Grade B, A, or S)
      if (wpm === 20) {
        check(
          res.cpi >= 50,
          `20 WPM @ 100% Acc got low CPI: ${res.cpi}`
        );
        check(
          res.grade !== 'D',
          `20 WPM @ 100% Acc demoted to Grade D! Got: ${res.grade}`
        );
      }

      // Log a selected sample for table preview
      if (cons === 90 && pl.chars === 250) {
        console.log(
          `${String(wpm).padEnd(3)} | ${String(pl.chars).padEnd(5)} | ${String(cons).padEnd(4)} | ${String(res.cpi).padEnd(3)} | ${res.grade.padEnd(5)} | ${String(res.precisionBonus).padEnd(14)} | ${String(res.comboBonus).padEnd(10)} | ${String(res.consistencyBonus).padEnd(16)}`
        );
      }
    }
  }
}

// ----------------------------------------------------------------------------
// TEST 7: ERROR COUNT vs GRADE MONOTONICITY (More errors should not increase grade)
// ----------------------------------------------------------------------------
console.log('\n--- Test 7: Error Count Monotonicity ---');
const totalCharsForErrorTest = 200;
const errorLevels = [0, 1, 2, 3, 5, 8, 10, 15, 20, 30, 50];

for (const wpm of [30, 50, 75, 100]) {
  for (const cons of [70, 85, 95]) {
    let prevCpi = Infinity;
    let prevGradeRank = Infinity;
    for (const errors of errorLevels) {
      const acc = Math.max(0, +(((totalCharsForErrorTest - errors) / totalCharsForErrorTest) * 100).toFixed(1));
      const streak = errors === 0 ? totalCharsForErrorTest : Math.floor(totalCharsForErrorTest / (errors + 1));
      const res = calculateCPI(wpm, acc, streak, cons, totalCharsForErrorTest);
      const gradeRank = GRADE_RANK[res.grade];

      check(
        res.cpi <= prevCpi,
        `CPI increased when errors increased! wpm=${wpm}, errors=${errors}, acc=${acc}, cpi=${prevCpi}->${res.cpi}`
      );
      check(
        gradeRank <= prevGradeRank,
        `Grade promoted when errors increased! wpm=${wpm}, errors=${errors}, acc=${acc}, grade=${prevGradeRank}->${gradeRank}`
      );

      prevCpi = res.cpi;
      prevGradeRank = gradeRank;
    }
  }
}
console.log(`Error Count Monotonicity checks completed. Total checks so far: ${totalChecks}`);

// ----------------------------------------------------------------------------
// TEST 8: ACCURACY PENALTY CONTINUITY & BOUNDARIES (<85% ACCURACY)
// ----------------------------------------------------------------------------
console.log('\n--- Test 8: Accuracy Penalty Continuity ---');
for (let acc = 0; acc <= 100; acc += 0.5) {
  const res = calculateCPI(60, acc, 0, 80, 100);
  if (acc >= 85) {
    check(res.penalty === 0, `Expected 0 penalty at acc=${acc}, got ${res.penalty}`);
  } else {
    const expectedPenalty = +(20 * ((85 - acc) / 10)).toFixed(2);
    check(
      Math.abs(res.penalty - expectedPenalty) < 0.01,
      `Penalty mismatch at acc=${acc}: expected ${expectedPenalty}, got ${res.penalty}`
    );
  }
}

// ----------------------------------------------------------------------------
// TEST 9: BURST WPM ROLLING WINDOW ADVERSARIAL STRESS
// ----------------------------------------------------------------------------
console.log('\n--- Test 9: Burst WPM Sliding Window Edge Cases ---');
const microBurst = calculateBurstWpm([
  { time: 1000, isError: false },
  { time: 1010, isError: false },
]);
check(microBurst === 999, `Microburst 10ms gap should clamp to 999 WPM, got: ${microBurst}`);

const zeroDtBurst = calculateBurstWpm([
  { time: 1000, isError: false },
  { time: 1000, isError: false },
]);
check(!isNaN(zeroDtBurst) && isFinite(zeroDtBurst), `0ms dt produced invalid burst: ${zeroDtBurst}`);

const longLog: Array<{ time: number; isError: boolean; isBackspace?: boolean }> = [];
let t = 0;
for (let i = 0; i < 1000; i++) {
  t += 100;
  longLog.push({ time: t, isError: i % 20 === 0, isBackspace: i % 25 === 0 });
}
const longBurst = calculateBurstWpm(longLog);
check(longBurst >= 115 && longBurst <= 130, `Expected long log burst around 120 WPM, got: ${longBurst}`);

const allErrorsLog = [
  { time: 100, isError: true },
  { time: 200, isError: true },
  { time: 300, isError: true },
];
check(calculateBurstWpm(allErrorsLog) === 0, `All errors log should return 0 burst WPM`);

// ----------------------------------------------------------------------------
// TEST 10: XP PROGRESSION & GHOST DELTA ROBUSTNESS
// ----------------------------------------------------------------------------
console.log('\n--- Test 10: XP Progression & Ghost Delta Boundary Stress ---');
const zeroXp = calculateXPProgression(0, 100, 100, 100, 100);
check(zeroXp.totalXp === 0, `Zero WPM should award 0 XP`);
const zeroAccXp = calculateXPProgression(60, 50, 100, 100, 100);
check(zeroAccXp.totalXp === 0, `Acc <= 50% should award 0 XP`);
const drillXp = calculateXPProgression(80, 100, 200, 95, 200, true);
check(drillXp.totalXp === 0, `Drill mode should award 0 XP`);

const superXp = calculateXPProgression(120, 100, 250, 95, 500);
check(superXp.baseXp === 1200, `Base XP expected 1200, got ${superXp.baseXp}`);
check(superXp.totalMultiplier === 2.3, `Total multiplier expected 2.30, got ${superXp.totalMultiplier}`);
check(superXp.totalXp === 2760, `Total XP expected 2760, got ${superXp.totalXp}`);

const tieGhost = calculateGhostDelta(20000, 98, 90, 100, 20000, 98, 90, 100);
check(tieGhost.userWon === true, `Exact tie time should mark userWon = true`);
check(tieGhost.deltaS === 0, `Exact tie deltaS should be 0`);
check(tieGhost.deltaAcc === 0, `Exact tie deltaAcc should be 0`);

// ----------------------------------------------------------------------------
// TEST 11: ACCOLADE BADGES & GRADE DETAILS INTEGRITY
// ----------------------------------------------------------------------------
console.log('\n--- Test 11: Accolades & Grade Details Exhaustive Checks ---');
const grades: PerformanceGrade[] = ['S+', 'S', 'A', 'B', 'C', 'D'];
for (const g of grades) {
  const details = getGradeDetails(g);
  check(details.grade === g, `Grade detail mismatch for ${g}`);
  check(GRADE_DETAILS[g] !== undefined, `GRADE_DETAILS missing ${g}`);
  check(details.minCpi >= 0, `minCpi negative for ${g}`);
  check(details.minAccuracy >= 0, `minAccuracy negative for ${g}`);
}

const badges1 = calculateAccolades(100, 100, 88, 50, 0);
check(badges1.find(b => b.id === 'flawless')?.unlocked === true, `Flawless badge expected true`);
check(badges1.find(b => b.id === 'centurion')?.unlocked === true, `Centurion badge expected true`);
check(badges1.find(b => b.id === 'surgical')?.unlocked === true, `Surgical badge expected true`);
check(badges1.find(b => b.id === 'flow_state')?.unlocked === true, `Flow State badge expected true`);

const badges2 = calculateAccolades(99, 99, 84, 49, 1);
check(badges2.find(b => b.id === 'flawless')?.unlocked === false, `Flawless badge expected false with errors`);
check(badges2.find(b => b.id === 'centurion')?.unlocked === false, `Centurion badge expected false with streak < 100`);
check(badges2.find(b => b.id === 'surgical')?.unlocked === false, `Surgical badge expected false with words < 50 and streak < 200`);
check(badges2.find(b => b.id === 'flow_state')?.unlocked === false, `Flow State badge expected false with cons < 85`);

// ----------------------------------------------------------------------------
// SUMMARY
// ----------------------------------------------------------------------------
console.log('\n================================================================');
console.log(`STRESS TEST EXECUTION COMPLETE:`);
console.log(`Total Invariant Checks Executed: ${totalChecks}`);
console.log(`Total Violations Found:          ${violations.length}`);
console.log('================================================================');

if (violations.length === 0) {
  console.log('\n🎉 EMPIRICAL VERDICT: ALL INVARIANTS SATISFIED (APPROVE)');
} else {
  console.error('\n🚨 EMPIRICAL VERDICT: VIOLATIONS DETECTED (REQUEST_CHANGES)');
  throw new Error(`Stress test failed with ${violations.length} violations`);
}
