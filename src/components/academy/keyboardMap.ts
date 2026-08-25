/**
 * Physical key → finger assignment for the Academy keyboard.
 *
 * Kept in its own module (not inside VirtualKeyboard.tsx) so component files
 * export components only — a requirement for React Fast Refresh.
 */
export const FINGER_MAP: Record<string, string> = {
    // Number row
    '1': 'left-pinky', '2': 'left-ring', '3': 'left-middle', '4': 'left-index', '5': 'left-index',
    '6': 'right-index', '7': 'right-index', '8': 'right-middle', '9': 'right-ring', '0': 'right-pinky',
    '-': 'right-pinky', '=': 'right-pinky',
    // Top row
    Q: 'left-pinky', W: 'left-ring', E: 'left-middle', R: 'left-index',
    T: 'left-index', Y: 'right-index', U: 'right-index',
    I: 'right-middle', O: 'right-ring', P: 'right-pinky', '[': 'right-pinky', ']': 'right-pinky',
    // Home row
    A: 'left-pinky', S: 'left-ring', D: 'left-middle', F: 'left-index', G: 'left-index',
    H: 'right-index', J: 'right-index', K: 'right-middle', L: 'right-ring', ';': 'right-pinky', "'": 'right-pinky',
    // Bottom row
    Z: 'left-pinky', X: 'left-ring', C: 'left-middle', V: 'left-index', B: 'left-index',
    N: 'right-index', M: 'right-index', ',': 'right-middle', '.': 'right-ring', '/': 'right-pinky',
    SPACE: 'thumb',
    // Modifiers
    LSHIFT: 'left-pinky', RSHIFT: 'right-pinky',
};

/** Per-finger tint tokens, inlined as styles to stay clear of Tailwind purge. */
export const FINGER_STYLE: Record<string, { bg: string; border: string; color: string; indicator: string }> = {
    'left-pinky': { bg: 'rgba(244,63,94,0.14)', border: 'rgba(244,63,94,0.40)', color: '#fda4af', indicator: '#f43f5e' },
    'left-ring': { bg: 'rgba(249,115,22,0.14)', border: 'rgba(249,115,22,0.40)', color: '#fdba74', indicator: '#f97316' },
    'left-middle': { bg: 'rgba(234,179,8,0.14)', border: 'rgba(234,179,8,0.40)', color: '#fde047', indicator: '#eab308' },
    'left-index': { bg: 'rgba(132,204,22,0.16)', border: 'rgba(132,204,22,0.45)', color: '#bef264', indicator: '#84cc16' },
    'right-index': { bg: 'rgba(16,185,129,0.16)', border: 'rgba(16,185,129,0.45)', color: '#6ee7b7', indicator: '#10b981' },
    'right-middle': { bg: 'rgba(6,182,212,0.14)', border: 'rgba(6,182,212,0.40)', color: '#67e8f9', indicator: '#06b6d4' },
    'right-ring': { bg: 'rgba(59,130,246,0.14)', border: 'rgba(59,130,246,0.40)', color: '#93c5fd', indicator: '#3b82f6' },
    'right-pinky': { bg: 'rgba(139,92,246,0.14)', border: 'rgba(139,92,246,0.40)', color: '#c4b5fd', indicator: '#8b5cf6' },
    'thumb': { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.30)', color: '#fcd34d', indicator: '#f59e0b' },
};
