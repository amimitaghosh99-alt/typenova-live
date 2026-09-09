/**
 * TypeNova E2E Test Runner Harness
 * Minimal, zero-dependency, rich assertion and test execution framework.
 */

export interface TestResult {
  suite: string;
  name: string;
  passed: boolean;
  error?: Error;
  durationMs: number;
}

export interface SuiteSummary {
  name: string;
  total: number;
  passed: number;
  failed: number;
  durationMs: number;
  results: TestResult[];
}

export interface GlobalTestSummary {
  suites: SuiteSummary[];
  totalTests: number;
  totalPassed: number;
  totalFailed: number;
  totalDurationMs: number;
}

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

class AssertionError extends Error {
  actual?: unknown;
  expected?: unknown;

  constructor(message: string, actual?: unknown, expected?: unknown) {
    super(message);
    this.name = 'AssertionError';
    this.actual = actual;
    this.expected = expected;
  }
}

class Expectation<T> {
  private actual: T;
  private isNot: boolean;

  constructor(actual: T, isNot = false) {
    this.actual = actual;
    this.isNot = isNot;
  }

  get not(): Expectation<T> {
    return new Expectation(this.actual, !this.isNot);
  }

  toBe(expected: unknown): void {
    const matches = Object.is(this.actual, expected);
    if (this.isNot ? matches : !matches) {
      throw new AssertionError(
        `Expected ${this.isNot ? 'NOT ' : ''}${JSON.stringify(expected)}, but got ${JSON.stringify(this.actual)}`,
        this.actual,
        expected
      );
    }
  }

  toEqual(expected: unknown): void {
    const actualStr = JSON.stringify(this.actual);
    const expectedStr = JSON.stringify(expected);
    const matches = actualStr === expectedStr;
    if (this.isNot ? matches : !matches) {
      throw new AssertionError(
        `Expected deep equality ${this.isNot ? 'NOT ' : ''}matching:\nExpected: ${expectedStr}\nActual:   ${actualStr}`,
        this.actual,
        expected
      );
    }
  }

  toBeCloseTo(expected: number, delta: number = 0.01): void {
    if (typeof this.actual !== 'number') {
      throw new AssertionError(`Expected number but got ${typeof this.actual}`);
    }
    const diff = Math.abs(this.actual - expected);
    const matches = diff <= delta;
    if (this.isNot ? matches : !matches) {
      throw new AssertionError(
        `Expected ${this.actual} to be close to ${expected} (within ±${delta}), difference was ${diff}`,
        this.actual,
        expected
      );
    }
  }

  toBeGreaterThanOrEqual(expected: number): void {
    if (typeof this.actual !== 'number') {
      throw new AssertionError(`Expected number but got ${typeof this.actual}`);
    }
    const matches = this.actual >= expected;
    if (this.isNot ? matches : !matches) {
      throw new AssertionError(
        `Expected ${this.actual} to be >= ${expected}`,
        this.actual,
        expected
      );
    }
  }

  toBeLessThanOrEqual(expected: number): void {
    if (typeof this.actual !== 'number') {
      throw new AssertionError(`Expected number but got ${typeof this.actual}`);
    }
    const matches = this.actual <= expected;
    if (this.isNot ? matches : !matches) {
      throw new AssertionError(
        `Expected ${this.actual} to be <= ${expected}`,
        this.actual,
        expected
      );
    }
  }

  toBeGreaterThan(expected: number): void {
    if (typeof this.actual !== 'number') {
      throw new AssertionError(`Expected number but got ${typeof this.actual}`);
    }
    const matches = this.actual > expected;
    if (this.isNot ? matches : !matches) {
      throw new AssertionError(
        `Expected ${this.actual} to be > ${expected}`,
        this.actual,
        expected
      );
    }
  }

  toBeLessThan(expected: number): void {
    if (typeof this.actual !== 'number') {
      throw new AssertionError(`Expected number but got ${typeof this.actual}`);
    }
    const matches = this.actual < expected;
    if (this.isNot ? matches : !matches) {
      throw new AssertionError(
        `Expected ${this.actual} to be < ${expected}`,
        this.actual,
        expected
      );
    }
  }

  toBeTruthy(): void {
    const matches = !!this.actual;
    if (this.isNot ? matches : !matches) {
      throw new AssertionError(
        `Expected truthy value, but got ${JSON.stringify(this.actual)}`,
        this.actual,
        true
      );
    }
  }

  toBeFalsy(): void {
    const matches = !this.actual;
    if (this.isNot ? matches : !matches) {
      throw new AssertionError(
        `Expected falsy value, but got ${JSON.stringify(this.actual)}`,
        this.actual,
        false
      );
    }
  }

  toBeDefined(): void {
    const matches = this.actual !== undefined;
    if (this.isNot ? matches : !matches) {
      throw new AssertionError(
        `Expected value to be defined, but got undefined`,
        this.actual,
        'defined'
      );
    }
  }

  toBeUndefined(): void {
    const matches = this.actual === undefined;
    if (this.isNot ? matches : !matches) {
      throw new AssertionError(
        `Expected undefined, but got ${JSON.stringify(this.actual)}`,
        this.actual,
        undefined
      );
    }
  }

  toContain(item: unknown): void {
    if (Array.isArray(this.actual)) {
      const matches = this.actual.includes(item);
      if (this.isNot ? matches : !matches) {
        throw new AssertionError(
          `Expected array to contain ${JSON.stringify(item)}`,
          this.actual,
          item
        );
      }
    } else if (typeof this.actual === 'string') {
      const matches = this.actual.includes(String(item));
      if (this.isNot ? matches : !matches) {
        throw new AssertionError(
          `Expected string to contain "${item}"`,
          this.actual,
          item
        );
      }
    } else {
      throw new AssertionError(`toContain requires array or string`);
    }
  }
}

export function expect<T>(actual: T): Expectation<T> {
  return new Expectation(actual);
}

export type TestFn = () => void | Promise<void>;

interface RegisteredSuite {
  name: string;
  tests: Array<{ name: string; fn: TestFn }>;
}

const registeredSuites: RegisteredSuite[] = [];
let currentSuite: RegisteredSuite | null = null;

export function describe(name: string, fn: () => void): void {
  const previousSuite = currentSuite;
  const suite: RegisteredSuite = { name, tests: [] };
  registeredSuites.push(suite);
  currentSuite = suite;
  fn();
  currentSuite = previousSuite;
}

export function it(name: string, fn: TestFn): void {
  if (!currentSuite) {
    describe('Default Suite', () => {
      it(name, fn);
    });
    return;
  }
  currentSuite.tests.push({ name, fn });
}

export const test = it;

export async function runAllSuites(): Promise<GlobalTestSummary> {
  const startTime = Date.now();
  const summary: GlobalTestSummary = {
    suites: [],
    totalTests: 0,
    totalPassed: 0,
    totalFailed: 0,
    totalDurationMs: 0,
  };

  console.log(`\n${colors.bright}${colors.cyan}======================================================${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}  TypeNova Precision Engine E2E Test Suite Runner     ${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}======================================================${colors.reset}\n`);

  for (const suite of registeredSuites) {
    console.log(`${colors.bright}${colors.blue}▶ Suite: ${suite.name}${colors.reset}`);
    const suiteStartTime = Date.now();
    const suiteSummary: SuiteSummary = {
      name: suite.name,
      total: suite.tests.length,
      passed: 0,
      failed: 0,
      durationMs: 0,
      results: [],
    };

    for (const t of suite.tests) {
      const testStart = Date.now();
      try {
        await t.fn();
        const duration = Date.now() - testStart;
        suiteSummary.passed++;
        suiteSummary.results.push({
          suite: suite.name,
          name: t.name,
          passed: true,
          durationMs: duration,
        });
        console.log(`  ${colors.green}✔${colors.reset} ${t.name} ${colors.gray}(${duration}ms)${colors.reset}`);
      } catch (err) {
        const duration = Date.now() - testStart;
        suiteSummary.failed++;
        const error = err instanceof Error ? err : new Error(String(err));
        suiteSummary.results.push({
          suite: suite.name,
          name: t.name,
          passed: false,
          error,
          durationMs: duration,
        });
        console.log(`  ${colors.red}✖ ${t.name}${colors.reset} ${colors.gray}(${duration}ms)${colors.reset}`);
        console.log(`    ${colors.red}Error:${colors.reset} ${error.message}`);
        if (error.stack) {
          const firstStackLine = error.stack.split('\n').slice(1, 3).join('\n    ');
          console.log(`    ${colors.gray}${firstStackLine}${colors.reset}`);
        }
      }
    }

    suiteSummary.durationMs = Date.now() - suiteStartTime;
    summary.suites.push(suiteSummary);
    summary.totalTests += suiteSummary.total;
    summary.totalPassed += suiteSummary.passed;
    summary.totalFailed += suiteSummary.failed;
    console.log('');
  }

  summary.totalDurationMs = Date.now() - startTime;

  // Print Summary Table
  console.log(`${colors.bright}------------------------------------------------------${colors.reset}`);
  console.log(`${colors.bright}Test Execution Summary:${colors.reset}`);
  console.log(`  Total Suites: ${summary.suites.length}`);
  console.log(`  Total Tests:  ${summary.totalTests}`);
  console.log(`  Passed:       ${colors.green}${summary.totalPassed}${colors.reset}`);
  console.log(`  Failed:       ${summary.totalFailed > 0 ? colors.red : colors.green}${summary.totalFailed}${colors.reset}`);
  console.log(`  Duration:     ${summary.totalDurationMs}ms`);
  console.log(`${colors.bright}------------------------------------------------------${colors.reset}`);

  if (summary.totalFailed > 0) {
    console.log(`\n${colors.bright}${colors.red}❌ FAILED: ${summary.totalFailed} test(s) failed.${colors.reset}\n`);
  } else {
    console.log(`\n${colors.bright}${colors.green}✅ ALL TESTS PASSED SUCCESSFULLY! (100% Pass Rate)${colors.reset}\n`);
  }

  return summary;
}
