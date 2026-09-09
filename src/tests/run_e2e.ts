/**
 * TypeNova Master E2E Test Runner
 * Executes all 4 tiers of Precision Scoring, Grading, and RPG Progression Tests.
 *
 * Usage:
 *   npx tsx src/tests/run_e2e.ts
 */

declare const process: {
  exit(code?: number): never;
};

import { runAllSuites } from './testHarness.ts';
import { registerScoringEngineTests } from './scoringEngine.test.ts';
import { registerIkiEngineTests } from './ikiEngine.test.ts';
import { registerShadowEngineTests } from './shadowEngine.test.ts';
import { registerWebHidEngineTests } from './webHidEngine.test.ts';
import { registerSabotageEngineTests } from './sabotageEngine.test.ts';
import { registerShareCardTests } from './shareCard.test.ts';
import { registerTier1Tests } from './tier1_features.test.ts';
import { registerTier2Tests } from './tier2_boundaries.test.ts';
import { registerTier3Tests } from './tier3_combinations.test.ts';
import { registerTier4Tests } from './tier4_realworld.test.ts';
import { registerWordWeaknessTests } from './wordWeakness.test.ts';
import { registerKeyboardErgonomicsTests } from './keyboardErgonomics.test.ts';
import { registerDisplayDiagnosticsTests } from './displayDiagnostics.test.ts';
import { registerDailyChallengeTests } from './dailyChallenge.test.ts';
import { registerDonationTests } from './donation.test.ts';
import { registerHallOfLegendsTests } from './test_hall_of_legends.ts';

async function main(): Promise<void> {
  console.log('Registering TypeNova E2E Test Suites...');

  // Direct Scoring Engine Implementation Tests
  registerScoringEngineTests();

  // Phase 1: IKI Motor Diagnostics & Digraph Drill Tests
  registerIkiEngineTests();

  // Phase 2: Shadowing Audio Transcription & Auditory Latency Tests
  registerShadowEngineTests();

  // Phase 3: WebHID Keyboard Polling & Jitter Benchmark Tests
  registerWebHidEngineTests();

  // Phase 4: Cyber Sabotage 1v1 Disruption & Hex Combat Tests
  registerSabotageEngineTests();

  // Milestone 4: Share Card Canvas & Normalization Tests
  registerShareCardTests();

  // Tier 1: Feature Coverage (>= 5 tests per feature)
  registerTier1Tests();

  // Tier 2: Boundary & Corner Cases (>= 5 tests per boundary condition)
  registerTier2Tests();

  // Tier 3: Cross-Feature Combinations (Pairwise & Multi-way interactions)
  registerTier3Tests();

  // Tier 4: Real-World Application Scenarios (Realistic user testing profiles)
  registerTier4Tests();

  // Word Weakness Engine: keystroke→word aggregation, Leitner SR, cloud merge
  registerWordWeaknessTests();

  // Keyboard Ergonomics Engine: finger maps, code translator, hand balance, grading, 15u flush layout
  registerKeyboardErgonomicsTests();

  // Display Refresh Rate & VSync Hardware Diagnostics Engine
  registerDisplayDiagnosticsTests();

  // Daily Challenge Engine: 31-day library integrity & deterministic selection
  registerDailyChallengeTests();

  // Community Supporter & Donation Engine: Goal metrics, platforms & Cyber Patron title
  registerDonationTests();

  // Hall of Legends: 20-achievement roster, category groupings, prestige rankings & dynamic theming
  registerHallOfLegendsTests();

  // Execute all registered suites
  const summary = await runAllSuites();

  if (summary.totalFailed > 0) {
    console.error(`[E2E Runner] ${summary.totalFailed} test(s) failed.`);
    process.exit(1);
  } else {
    console.log(`[E2E Runner] All ${summary.totalTests} tests passed cleanly.`);
    process.exit(0);
  }
}

main().catch(err => {
  console.error('[E2E Runner Fatal Error]', err);
  process.exit(1);
});
