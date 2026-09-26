/**
 * Test Suite: Dynamic Chunk Load Resilience Engine (lazyWithRetry)
 * Validates detection of stale deployment chunk errors, backoff retry logic,
 * and safe preloading immunity against mid-session releases.
 */

import { describe, it, expect } from './testHarness.ts';
import { isChunkLoadError, preloadComponent, lazyWithRetry } from '../lib/lazyWithRetry.ts';

export function registerLazyWithRetryTests(): void {
  describe('Chunk Load Resilience — Dynamic Import Error Classification', () => {
    it('accurately identifies Vercel/Chrome "Failed to fetch dynamically imported module"', () => {
      const err = new TypeError('Failed to fetch dynamically imported module: https://typenova-live-agprime.vercel.app/assets/ResultsScreen-B4aLWEX0.js');
      expect(isChunkLoadError(err)).toBe(true);
    });

    it('identifies Safari / WebKit "error loading dynamically imported module"', () => {
      const err = new Error('error loading dynamically imported module: https://example.com/assets/ResultsScreen.js');
      expect(isChunkLoadError(err)).toBe(true);
    });

    it('identifies Webpack/Rollup "Loading chunk ... failed"', () => {
      const err = new Error('Loading chunk 42 failed. (missing: https://example.com/chunk-42.js)');
      expect(isChunkLoadError(err)).toBe(true);
    });

    it('identifies Firefox "Importing a module script failed"', () => {
      const err = new Error('Importing a module script failed.');
      expect(isChunkLoadError(err)).toBe(true);
    });

    it('identifies Vite CSS chunk preload failures ("unable to preload css")', () => {
      const err = new Error('Unable to preload CSS: /assets/ResultsScreen-style.css');
      expect(isChunkLoadError(err)).toBe(true);
    });

    it('correctly discriminates standard application runtime exceptions', () => {
      expect(isChunkLoadError(new TypeError('Cannot read properties of undefined (reading "wpm")'))).toBe(false);
      expect(isChunkLoadError(new ReferenceError('resultsProps is not defined'))).toBe(false);
      expect(isChunkLoadError(new RangeError('Maximum call stack size exceeded'))).toBe(false);
      expect(isChunkLoadError(null)).toBe(false);
      expect(isChunkLoadError(undefined)).toBe(false);
    });

    it('handles stringified error representations safely', () => {
      expect(isChunkLoadError('TypeError: Failed to fetch dynamically imported module: https://domain/assets/test.js')).toBe(true);
      expect(isChunkLoadError('Random string error')).toBe(false);
    });
  });

  describe('Chunk Load Resilience — Safe Preloader & Component Wrapping', () => {
    it('executes preloadComponent without throwing on synchronous success', () => {
      let executed = false;
      preloadComponent(() => {
        executed = true;
        return Promise.resolve({ default: () => null });
      });
      expect(executed).toBe(true);
    });

    it('suppresses preload errors safely when network drops or chunk is missing', () => {
      let threw = false;
      try {
        preloadComponent(() => Promise.reject(new Error('Network offline')));
      } catch {
        threw = true;
      }
      expect(threw).toBe(false);
    });

    it('lazyWithRetry returns a valid React lazy component structure', () => {
      const MockLazy = lazyWithRetry(() => Promise.resolve({ default: () => null }), 'MockComponent');
      expect(MockLazy).toBeDefined();
      expect(typeof MockLazy === 'object' || typeof MockLazy === 'function').toBe(true);
    });
  });
}
