/**
 * Standalone Runner for Challenger 1 Adversarial Stress Test Suite
 */

declare const process: {
  exit(code?: number): never;
};

import { runAllSuites } from './testHarness.ts';
import { registerChallengerM1StressTests } from './challenger_m1_stress.test.ts';

async function main(): Promise<void> {
  console.log('[Challenger 1] Registering Adversarial Stress Test Suites...');
  registerChallengerM1StressTests();

  const summary = await runAllSuites();

  if (summary.totalFailed > 0) {
    console.error(`[Challenger 1 Stress Runner] ❌ ${summary.totalFailed} test(s) failed.`);
    process.exit(1);
  } else {
    console.log(`[Challenger 1 Stress Runner] ✅ All ${summary.totalTests} stress tests passed successfully.`);
    process.exit(0);
  }
}

main().catch(err => {
  console.error('[Challenger 1 Stress Runner Fatal Error]', err);
  process.exit(1);
});
