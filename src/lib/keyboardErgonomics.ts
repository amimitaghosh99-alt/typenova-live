// ═══════════════════════════════════════════════════════════════════════
//  KEYBOARD ERGONOMICS — pure helpers for the heatmap cockpit
//  ---------------------------------------------------------------------
//  Maps every key on a standard 60 % ANSI to:
//    • its physical row, column offset (u widths) and display label
//    • the finger that should press it in standard touch typing
//    • a hand (L / R) and a finger group name
//
//  All data is plain const arrays / records — no React, no side effects.
// ═══════════════════════════════════════════════════════════════════════

/* ── Finger identifiers ──────────────────────────────────────────────── */

export type Hand = 'L' | 'R';
export type FingerName =
  | 'L-Pinky' | 'L-Ring' | 'L-Middle' | 'L-Index'
  | 'R-Index' | 'R-Middle' | 'R-Ring' | 'R-Pinky'
  | 'Thumb';

export interface FingerInfo {
  hand: Hand;
  finger: FingerName;
  /** CSS-friendly hue for the ergonomic overlay (hsl) */
  hue: string;
}

/* ── Finger zone colour palette ──────────────────────────────────────── */

const F: Record<FingerName, FingerInfo> = {
  'L-Pinky':  { hand: 'L', finger: 'L-Pinky',  hue: '280, 80%, 65%' },
  'L-Ring':   { hand: 'L', finger: 'L-Ring',    hue: '210, 85%, 60%' },
  'L-Middle': { hand: 'L', finger: 'L-Middle',  hue: '165, 75%, 55%' },
  'L-Index':  { hand: 'L', finger: 'L-Index',   hue: '45, 90%, 55%'  },
  'R-Index':  { hand: 'R', finger: 'R-Index',   hue: '30, 90%, 58%'  },
  'R-Middle': { hand: 'R', finger: 'R-Middle',  hue: '0, 80%, 60%'   },
  'R-Ring':   { hand: 'R', finger: 'R-Ring',    hue: '320, 75%, 60%' },
  'R-Pinky':  { hand: 'R', finger: 'R-Pinky',   hue: '270, 70%, 62%' },
  'Thumb':    { hand: 'L', finger: 'Thumb',      hue: '90, 50%, 50%'  },
};

/* ── Key definition ──────────────────────────────────────────────────── */

export interface KeyDef {
  /** Internal ID — uppercase letter, or label like 'BACKSPACE'. */
  id: string;
  /** Display label on the keycap. */
  label: string;
  /** Shifted secondary symbol (e.g., '!' for '1'). */
  sublabel?: string;
  /** Width in keyboard units (1 u ≈ 44 px). */
  width: number;
  /** Finger assignment. */
  finger: FingerInfo;
  /** If true, this key has a tactile home-row bump (F, J). */
  hasNib?: boolean;
}

export interface KeyRow {
  keys: KeyDef[];
}

/* ── Finger assignment map ───────────────────────────────────────────── */

const FINGER_MAP: Record<string, FingerInfo> = {
  // Number row
  '`': F['L-Pinky'], '1': F['L-Pinky'], '2': F['L-Ring'], '3': F['L-Middle'],
  '4': F['L-Index'], '5': F['L-Index'], '6': F['R-Index'], '7': F['R-Index'],
  '8': F['R-Middle'], '9': F['R-Ring'], '0': F['R-Pinky'],
  '-': F['R-Pinky'], '=': F['R-Pinky'], 'BACKSPACE': F['R-Pinky'],
  // Top row
  'TAB': F['L-Pinky'],
  'Q': F['L-Pinky'], 'W': F['L-Ring'], 'E': F['L-Middle'],
  'R': F['L-Index'], 'T': F['L-Index'], 'Y': F['R-Index'], 'U': F['R-Index'],
  'I': F['R-Middle'], 'O': F['R-Ring'], 'P': F['R-Pinky'],
  '[': F['R-Pinky'], ']': F['R-Pinky'], '\\': F['R-Pinky'],
  // Home row
  'CAPS': F['L-Pinky'],
  'A': F['L-Pinky'], 'S': F['L-Ring'], 'D': F['L-Middle'],
  'F': F['L-Index'], 'G': F['L-Index'], 'H': F['R-Index'], 'J': F['R-Index'],
  'K': F['R-Middle'], 'L': F['R-Ring'], ';': F['R-Pinky'], "'": F['R-Pinky'],
  'ENTER': F['R-Pinky'],
  // Bottom row
  'SHIFT': F['L-Pinky'],
  'Z': F['L-Pinky'], 'X': F['L-Ring'], 'C': F['L-Middle'],
  'V': F['L-Index'], 'B': F['L-Index'], 'N': F['R-Index'], 'M': F['R-Index'],
  ',': F['R-Middle'], '.': F['R-Ring'], '/': F['R-Pinky'],
  'RSHIFT': F['R-Pinky'],
  // Modifiers & Space
  'CTRL': F['L-Pinky'], 'WIN': F['Thumb'], 'ALT': F['Thumb'],
  'SPACE': F['Thumb'],
  'RALT': F['Thumb'], 'FN': F['Thumb'], 'MENU': F['Thumb'], 'RCTRL': F['R-Pinky'],
};

export function fingerOf(keyId: string): FingerInfo {
  return FINGER_MAP[keyId] ?? F['Thumb'];
}

/* ── Full 60 % ANSI layout definition (flush 15u rows) ───────────────── */

function k(id: string, label?: string, width = 1, hasNib = false, sublabel?: string): KeyDef {
  return { id, label: label ?? id, width, finger: fingerOf(id), hasNib, sublabel };
}

export const FULL_60_LAYOUT: KeyRow[] = [
  // Row 0 — Number row (15.0u total)
  { keys: [
    k('`', '`', 1, false, '~'),
    k('1', '1', 1, false, '!'),
    k('2', '2', 1, false, '@'),
    k('3', '3', 1, false, '#'),
    k('4', '4', 1, false, '$'),
    k('5', '5', 1, false, '%'),
    k('6', '6', 1, false, '^'),
    k('7', '7', 1, false, '&'),
    k('8', '8', 1, false, '*'),
    k('9', '9', 1, false, '('),
    k('0', '0', 1, false, ')'),
    k('-', '-', 1, false, '_'),
    k('=', '=', 1, false, '+'),
    k('BACKSPACE', '⌫', 2),
  ]},
  // Row 1 — QWERTY (15.0u total)
  { keys: [
    k('TAB', 'Tab', 1.5),
    k('Q'), k('W'), k('E'), k('R'), k('T'), k('Y'), k('U'), k('I'), k('O'), k('P'),
    k('[', '[', 1, false, '{'),
    k(']', ']', 1, false, '}'),
    k('\\', '\\', 1.5, false, '|'),
  ]},
  // Row 2 — Home row (15.0u total)
  { keys: [
    k('CAPS', 'Caps', 1.75),
    k('A'), k('S'), k('D'), k('F', 'F', 1, true), k('G'),
    k('H'), k('J', 'J', 1, true), k('K'), k('L'),
    k(';', ';', 1, false, ':'),
    k("'", "'", 1, false, '"'),
    k('ENTER', 'Enter', 2.25),
  ]},
  // Row 3 — Bottom (15.0u total)
  { keys: [
    k('SHIFT', 'Shift', 2.25),
    k('Z'), k('X'), k('C'), k('V'), k('B'), k('N'), k('M'),
    k(',', ',', 1, false, '<'),
    k('.', '.', 1, false, '>'),
    k('/', '/', 1, false, '?'),
    k('RSHIFT', 'Shift', 2.75),
  ]},
  // Row 4 — Spacebar row (15.0u total)
  { keys: [
    k('CTRL', 'Ctrl', 1.25),
    k('WIN', '⊞', 1.25),
    k('ALT', 'Alt', 1.25),
    k('SPACE', 'Space', 6.25),
    k('RALT', 'Alt', 1.25),
    k('FN', 'Fn', 1.25),
    k('MENU', '≣', 1.25),
    k('RCTRL', 'Ctrl', 1.25),
  ]},
];

export const COMPACT_LAYOUT: KeyRow[] = [
  { keys: [k('Q'), k('W'), k('E'), k('R'), k('T'), k('Y'), k('U'), k('I'), k('O'), k('P')] },
  { keys: [k('A'), k('S'), k('D'), k('F', 'F', 1, true), k('G'), k('H'), k('J', 'J', 1, true), k('K'), k('L')] },
  { keys: [k('Z'), k('X'), k('C'), k('V'), k('B'), k('N'), k('M')] },
  { keys: [k('SPACE', 'Space', 6.25)] },
];

/* ── Compact row indents ─────────────────────────────────────────────── */
export const COMPACT_ROW_INDENT = [0, 0.5, 1.5, 0] as const;
export const FULL_ROW_INDENT = [0, 0, 0, 0, 0] as const;

/* ── Map physical keydown event.code → key id ────────────────────────── */

const CODE_TO_ID: Record<string, string> = {
  Backquote: '`', Digit1: '1', Digit2: '2', Digit3: '3', Digit4: '4', Digit5: '5',
  Digit6: '6', Digit7: '7', Digit8: '8', Digit9: '9', Digit0: '0',
  Minus: '-', Equal: '=', Backspace: 'BACKSPACE',
  Tab: 'TAB',
  KeyQ: 'Q', KeyW: 'W', KeyE: 'E', KeyR: 'R', KeyT: 'T',
  KeyY: 'Y', KeyU: 'U', KeyI: 'I', KeyO: 'O', KeyP: 'P',
  BracketLeft: '[', BracketRight: ']', Backslash: '\\',
  CapsLock: 'CAPS',
  KeyA: 'A', KeyS: 'S', KeyD: 'D', KeyF: 'F', KeyG: 'G',
  KeyH: 'H', KeyJ: 'J', KeyK: 'K', KeyL: 'L',
  Semicolon: ';', Quote: "'", Enter: 'ENTER',
  ShiftLeft: 'SHIFT',
  KeyZ: 'Z', KeyX: 'X', KeyC: 'C', KeyV: 'V', KeyB: 'B',
  KeyN: 'N', KeyM: 'M',
  Comma: ',', Period: '.', Slash: '/', ShiftRight: 'RSHIFT',
  Space: 'SPACE',
};

export function codeToKeyId(code: string): string | null {
  return CODE_TO_ID[code] ?? null;
}

/* ── Hand workload balance ───────────────────────────────────────────── */

export interface HandBalance {
  left: number;   // 0-1
  right: number;  // 0-1
  leftTotal: number;
  rightTotal: number;
}

export function computeHandBalance(
  data: Record<string, { total: number }>,
): HandBalance {
  let leftTotal = 0;
  let rightTotal = 0;
  for (const [key, stat] of Object.entries(data)) {
    if (!stat || stat.total <= 0) continue;
    if (key === ' ' || key === 'SPACE') {
      // Space is struck with thumbs of either hand (or alternating thumbs in touch typing).
      // Splitting 50/50 prevents an artificial 65% L / 35% R skew across typing telemetry.
      leftTotal += stat.total * 0.5;
      rightTotal += stat.total * 0.5;
      continue;
    }
    const fi = fingerOf(key);
    if (fi.hand === 'L') leftTotal += stat.total;
    else rightTotal += stat.total;
  }
  const sum = leftTotal + rightTotal;
  return {
    left: sum > 0 ? leftTotal / sum : 0.5,
    right: sum > 0 ? rightTotal / sum : 0.5,
    leftTotal: Math.round(leftTotal),
    rightTotal: Math.round(rightTotal),
  };
}

/* ── Key performance grade ───────────────────────────────────────────── */

export type KeyGrade = 'S+' | 'S' | 'A' | 'B' | 'C' | 'D' | 'F';

export function gradeKey(errorRate: number, avgMs: number): KeyGrade {
  // Error rate is dominant signal; speed is tiebreaker
  if (errorRate <= 0.01 && avgMs < 150) return 'S+';
  if (errorRate <= 0.02 && avgMs < 200) return 'S';
  if (errorRate <= 0.05 && avgMs < 250) return 'A';
  if (errorRate <= 0.10) return 'B';
  if (errorRate <= 0.18) return 'C';
  if (errorRate <= 0.30) return 'D';
  return 'F';
}

export const GRADE_COLORS: Record<KeyGrade, string> = {
  'S+': '250, 204, 21',   // gold
  'S':  '168, 85, 247',   // purple
  'A':  '34, 197, 94',    // green
  'B':  '59, 130, 246',   // blue
  'C':  '251, 191, 36',   // amber
  'D':  '249, 115, 22',   // orange
  'F':  '239, 68, 68',    // red
};
