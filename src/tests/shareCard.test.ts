import { describe, it, expect } from './testHarness';
import { normalizeRgb, getGradeColorRgb, type ShareCardData } from '../utils/shareCard';

export function registerShareCardTests(): void {
  describe('Milestone 4 - Share Card Canvas & Normalization', () => {
    it('normalizes RGB triplets correctly', () => {
      expect(normalizeRgb('6, 182, 212')).toBe('6, 182, 212');
      expect(normalizeRgb('245,158,11')).toBe('245, 158, 11');
      expect(normalizeRgb(' 168 , 85 , 247 ')).toBe('168, 85, 247');
    });

    it('normalizes rgba() and rgb() functional strings', () => {
      expect(normalizeRgb('rgba(6, 182, 212, 0.4)')).toBe('6, 182, 212');
      expect(normalizeRgb('rgb(168, 85, 247)')).toBe('168, 85, 247');
      expect(normalizeRgb('rgba(245, 158, 11, 0.8)')).toBe('245, 158, 11');
    });

    it('normalizes 6-digit hex color strings to RGB triplets', () => {
      expect(normalizeRgb('#06b6d4')).toBe('6, 182, 212');
      expect(normalizeRgb('#f59e0b')).toBe('245, 158, 11');
      expect(normalizeRgb('a855f7')).toBe('168, 85, 247');
    });

    it('falls back safely for invalid or undefined color inputs', () => {
      expect(normalizeRgb(undefined)).toBe('6, 182, 212');
      expect(normalizeRgb('')).toBe('6, 182, 212');
      expect(normalizeRgb('invalid-color', '245, 158, 11')).toBe('245, 158, 11');
    });

    it('maps performance grades to correct prestige RGB tokens', () => {
      expect(getGradeColorRgb('S+')).toBe('251, 191, 36');
      expect(getGradeColorRgb('S')).toBe('251, 191, 36');
      expect(getGradeColorRgb('A')).toBe('52, 211, 153');
      expect(getGradeColorRgb('B')).toBe('56, 189, 248');
      expect(getGradeColorRgb('C')).toBe('251, 146, 60');
      expect(getGradeColorRgb('D')).toBe('148, 163, 184');
      expect(getGradeColorRgb('unknown')).toBe('148, 163, 184');
    });

    it('validates ShareCardData schema with S+ grade, CPI score and timeline points', () => {
      const data: ShareCardData = {
        wpm: 140,
        rawWpm: 145,
        accuracy: 99,
        consistency: 92,
        grade: 'S+',
        gradeTitle: 'Cyber Vanguard',
        cpi: 138,
        accolades: ['FLAWLESS', 'CENTURION', 'FLOW STATE'],
        themeName: 'Cyberpunk',
        glowPrimary: '6, 182, 212',
        glowSecondary: '34, 211, 238',
        timelinePoints: [
          { t: 0, wpm: 60, rawWpm: 65 },
          { t: 5000, wpm: 140, rawWpm: 145 },
        ],
      };
      expect(data.grade).toBe('S+');
      expect(data.cpi).toBe(138);
      expect(data.accolades?.length).toBe(3);
      expect(data.gradeTitle).toBe('Cyber Vanguard');
      expect(data.timelinePoints?.length).toBe(2);
    });
  });
}
