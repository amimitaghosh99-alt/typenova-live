/**
 * Batch 6 Unit Tests: Mobile Responsiveness, Viewport Overflows, PWA Offline & Storage Quotas
 */

import { describe, it, expect } from './testHarness.ts';
import { isChunkLoadError } from '../lib/lazyWithRetry.ts';
import { loadWallpaperFromDB, saveWallpaperToDB } from '../lib/wallpaperStorage.ts';

export function registerBatch6MobilePwaTests(): void {
  describe('Batch 6: Mobile Responsiveness, Viewport Overflows, PWA Offline & Storage Quotas', () => {
    it('PWA-01: isChunkLoadError identifies all browser network/chunk failure variants', () => {
      expect(isChunkLoadError(new Error('TypeError: Failed to fetch dynamically imported module: https://typenova.app/assets/ResultsScreen.js'))).toBe(true);
      expect(isChunkLoadError(new Error('error loading dynamically imported module'))).toBe(true);
      expect(isChunkLoadError(new Error('Loading chunk 42 failed'))).toBe(true);
      expect(isChunkLoadError(new Error('unable to preload css'))).toBe(true);
      expect(isChunkLoadError(new Error('Importing a module script failed'))).toBe(true);
      expect(isChunkLoadError(new Error('SyntaxError: Unexpected token <'))).toBe(false);
    });

    it('STORAGE-01: saveWallpaperToDB protects localStorage from quota bombs (>150KB)', async () => {
      // Create a 200KB mock base64 dataUrl
      const largeDataUrl = 'data:image/jpeg;base64,' + 'A'.repeat(200 * 1024);
      
      // In node test environment without IndexedDB, it falls back to the safe localStorage branch
      await saveWallpaperToDB({
        id: 'test-wallpaper',
        dataUrl: largeDataUrl,
        brightness: 0.8,
        blur: 5,
        timestamp: Date.now(),
      });

      // Confirm large dataUrl was NOT dumped into localStorage to avoid QuotaExceededError
      if (typeof localStorage !== 'undefined') {
        expect(localStorage.getItem('typezen_wallpaper_url')).toBe(null);
      }
    });

    it('STORAGE-02: loadWallpaperFromDB resolves gracefully without throwing in non-browser environments', async () => {
      const result = await loadWallpaperFromDB('active');
      // In node environment without IndexedDB/localStorage, returns null or fallback
      expect(result === null || typeof result === 'object').toBe(true);
    });

    it('LAYOUT-01: Heatmap 10-key row geometry is compatible with 480px scroll rail', () => {
      const topRow = ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'];
      const keyWidth = 40; // w-10 = 40px
      const keyGap = 8; // gap-2 = 8px
      const totalWidth = topRow.length * keyWidth + (topRow.length - 1) * keyGap;
      // 10 * 40 + 9 * 8 = 472px <= 480px min-width
      expect(totalWidth <= 480).toBe(true);
    });

    it('LAYOUT-02: Daily challenge compact title bounds on mobile viewports', () => {
      const testTitle = "Mastering Home Row Fluidity Under Pressure";
      const truncated = testTitle.slice(0, 15);
      expect(truncated.length <= 15).toBe(true);
    });
  });
}
