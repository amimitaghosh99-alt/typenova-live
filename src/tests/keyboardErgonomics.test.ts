import { describe, it, expect } from './testHarness.ts';
import {
  fingerOf,
  codeToKeyId,
  computeHandBalance,
  gradeKey,
  FULL_60_LAYOUT,
  COMPACT_LAYOUT,
  COMPACT_ROW_INDENT,
  GRADE_COLORS,
} from '../lib/keyboardErgonomics';

export function registerKeyboardErgonomicsTests(): void {
describe('Keyboard Ergonomics — finger assignments', () => {
  it('maps home row anchors F and J to their correct index fingers and hands', () => {
    const f = fingerOf('F');
    const j = fingerOf('J');
    expect(f.hand).toBe('L');
    expect(f.finger).toBe('L-Index');
    expect(j.hand).toBe('R');
    expect(j.finger).toBe('R-Index');
  });

  it('maps left pinky keys properly (Q, A, Z, 1, Tab, Caps, Shift)', () => {
    expect(fingerOf('Q').finger).toBe('L-Pinky');
    expect(fingerOf('A').finger).toBe('L-Pinky');
    expect(fingerOf('Z').finger).toBe('L-Pinky');
    expect(fingerOf('1').finger).toBe('L-Pinky');
    expect(fingerOf('TAB').finger).toBe('L-Pinky');
    expect(fingerOf('CAPS').finger).toBe('L-Pinky');
    expect(fingerOf('SHIFT').finger).toBe('L-Pinky');
  });

  it('maps right pinky keys properly (P, ;, Enter, Backspace, 0, -, =)', () => {
    expect(fingerOf('P').finger).toBe('R-Pinky');
    expect(fingerOf(';').finger).toBe('R-Pinky');
    expect(fingerOf('ENTER').finger).toBe('R-Pinky');
    expect(fingerOf('BACKSPACE').finger).toBe('R-Pinky');
    expect(fingerOf('0').finger).toBe('R-Pinky');
    expect(fingerOf('-').finger).toBe('R-Pinky');
    expect(fingerOf('=').finger).toBe('R-Pinky');
  });

  it('maps spacebar to Thumb', () => {
    const space = fingerOf('SPACE');
    expect(space.finger).toBe('Thumb');
  });

  it('falls back safely to Thumb for unknown keys', () => {
    const unknown = fingerOf('F13');
    expect(unknown.finger).toBe('Thumb');
  });
});

describe('Keyboard Ergonomics — physical code to key ID mapping', () => {
  it('maps standard letter codes', () => {
    expect(codeToKeyId('KeyA')).toBe('A');
    expect(codeToKeyId('KeyZ')).toBe('Z');
    expect(codeToKeyId('KeyM')).toBe('M');
  });

  it('maps number and symbol codes', () => {
    expect(codeToKeyId('Digit1')).toBe('1');
    expect(codeToKeyId('Digit0')).toBe('0');
    expect(codeToKeyId('Minus')).toBe('-');
    expect(codeToKeyId('Equal')).toBe('=');
    expect(codeToKeyId('Semicolon')).toBe(';');
    expect(codeToKeyId('Quote')).toBe("'");
    expect(codeToKeyId('Comma')).toBe(',');
    expect(codeToKeyId('Period')).toBe('.');
    expect(codeToKeyId('Slash')).toBe('/');
  });

  it('maps functional modifier codes', () => {
    expect(codeToKeyId('Space')).toBe('SPACE');
    expect(codeToKeyId('Enter')).toBe('ENTER');
    expect(codeToKeyId('Backspace')).toBe('BACKSPACE');
    expect(codeToKeyId('Tab')).toBe('TAB');
    expect(codeToKeyId('CapsLock')).toBe('CAPS');
    expect(codeToKeyId('ShiftLeft')).toBe('SHIFT');
    expect(codeToKeyId('ShiftRight')).toBe('RSHIFT');
  });

  it('returns null for unrecognized codes', () => {
    expect(codeToKeyId('F1')).toBe(null);
    expect(codeToKeyId('Escape')).toBe(null);
    expect(codeToKeyId('ArrowUp')).toBe(null);
  });
});

describe('Keyboard Ergonomics — hand workload balance', () => {
  it('evaluates equal hand load as 50% / 50%', () => {
    const data = {
      'F': { total: 100 }, // Left Index
      'J': { total: 100 }, // Right Index
    };
    const balance = computeHandBalance(data);
    expect(balance.left).toBe(0.5);
    expect(balance.right).toBe(0.5);
    expect(balance.leftTotal).toBe(100);
    expect(balance.rightTotal).toBe(100);
  });

  it('accurately calculates left-heavy typing ratio', () => {
    const data = {
      'A': { total: 300 }, // Left Pinky
      'S': { total: 100 }, // Left Ring
      'K': { total: 100 }, // Right Middle
    };
    const balance = computeHandBalance(data);
    expect(balance.leftTotal).toBe(400);
    expect(balance.rightTotal).toBe(100);
    expect(balance.left).toBe(0.8);
    expect(balance.right).toBe(0.2);
  });

  it('handles empty data safely without divide-by-zero NaN', () => {
    const balance = computeHandBalance({});
    expect(balance.left).toBe(0.5);
    expect(balance.right).toBe(0.5);
    expect(balance.leftTotal).toBe(0);
    expect(balance.rightTotal).toBe(0);
  });
});

describe('Keyboard Ergonomics — performance grading', () => {
  it('grades ultra-precise fast key as S+', () => {
    expect(gradeKey(0.005, 120)).toBe('S+');
  });

  it('grades highly accurate key as S', () => {
    expect(gradeKey(0.015, 180)).toBe('S');
  });

  it('grades solid key as A', () => {
    expect(gradeKey(0.04, 210)).toBe('A');
  });

  it('grades standard key as B', () => {
    expect(gradeKey(0.08, 230)).toBe('B');
  });

  it('grades shaky key as C', () => {
    expect(gradeKey(0.15, 260)).toBe('C');
  });

  it('grades problematic key as D', () => {
    expect(gradeKey(0.25, 300)).toBe('D');
  });

  it('grades severe bottleneck key as F', () => {
    expect(gradeKey(0.40, 350)).toBe('F');
  });

  it('verifies all grade colors exist', () => {
    expect(GRADE_COLORS['S+']).toBeDefined();
    expect(GRADE_COLORS['S']).toBeDefined();
    expect(GRADE_COLORS['A']).toBeDefined();
    expect(GRADE_COLORS['B']).toBeDefined();
    expect(GRADE_COLORS['C']).toBeDefined();
    expect(GRADE_COLORS['D']).toBeDefined();
    expect(GRADE_COLORS['F']).toBeDefined();
  });
});

describe('Keyboard Ergonomics — layout geometry', () => {
  it('verifies all 5 rows in FULL_60_LAYOUT sum to exactly 15.0u width', () => {
    FULL_60_LAYOUT.forEach((row) => {
      const rowWidth = row.keys.reduce((acc, key) => acc + key.width, 0);
      expect(Math.abs(rowWidth - 15.0) < 0.001).toBe(true);
    });
  });

  it('verifies COMPACT_LAYOUT has exactly 4 rows with Space at row 3', () => {
    expect(COMPACT_LAYOUT.length).toBe(4);
    expect(COMPACT_LAYOUT[0].keys.length).toBe(10); // Q-P
    expect(COMPACT_LAYOUT[1].keys.length).toBe(9);  // A-L
    expect(COMPACT_LAYOUT[2].keys.length).toBe(7);  // Z-M
    expect(COMPACT_LAYOUT[3].keys[0].id).toBe('SPACE');
    expect(COMPACT_ROW_INDENT[0]).toBe(0);
  });

  it('verifies home-row nibs exist strictly on F and J keys', () => {
    const allKeys = FULL_60_LAYOUT.flatMap(r => r.keys);
    const nibbed = allKeys.filter(k => k.hasNib);
    expect(nibbed.length).toBe(2);
    expect(nibbed.map(k => k.id).sort().join(',')).toBe('F,J');
  });
});
}
