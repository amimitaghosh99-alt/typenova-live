# Handoff Report: R4 Keyboard & CyberHands Symbol Support Survey

## 1. Observation

### File Locations
- `VirtualKeyboard.tsx`: `c:\Users\risho\OneDrive\Desktop\typenova-v2 - Copy\src\components\academy\VirtualKeyboard.tsx`
- `CyberHands.tsx`: `c:\Users\risho\OneDrive\Desktop\typenova-v2 - Copy\src\components\academy\CyberHands.tsx`
- `AcademyLayout.tsx`: `c:\Users\risho\OneDrive\Desktop\typenova-v2 - Copy\src\components\academy\AcademyLayout.tsx`
- `academyCurriculum.ts`: `c:\Users\risho\OneDrive\Desktop\typenova-v2 - Copy\src\data\academyCurriculum.ts`
- `useAcademyEngine.ts`: `c:\Users\risho\OneDrive\Desktop\typenova-v2 - Copy\src\hooks\useAcademyEngine.ts`

### Current `KEY_MAP` Status
- **Finding**: There is NO `KEY_MAP` object in the repository. Instead, keyboard layout keys are hardcoded in `VirtualKeyboard.tsx` (lines 9–14) inside the `ROWS` array constant:
```tsx
const ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ';'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
  ['SPACE'],
];
```

### Current `FINGER_MAP` Definition
Defined in `VirtualKeyboard.tsx` (lines 16–28) and imported into `CyberHands.tsx` (line 1):
```tsx
export const FINGER_MAP: Record<string, string> = {
  Q: 'left-pinky',  A: 'left-pinky',  Z: 'left-pinky',
  W: 'left-ring',   S: 'left-ring',   X: 'left-ring',
  E: 'left-middle', D: 'left-middle', C: 'left-middle',
  R: 'left-index',  F: 'left-index',  V: 'left-index',
  T: 'left-index',  G: 'left-index',  B: 'left-index',
  Y: 'right-index', H: 'right-index', N: 'right-index',
  U: 'right-index', J: 'right-index', M: 'right-index',
  I: 'right-middle',K: 'right-middle',
  O: 'right-ring',  L: 'right-ring',
  P: 'right-pinky', ';': 'right-pinky',
  SPACE: 'thumb',
};
```

### Present vs. Missing Keys Inventory

| Category | Character(s) | Present in `ROWS`? | Present in `FINGER_MAP`? | Standard Finger Assignment |
|---|---|---|---|---|
| Letters (A-Z) | `A`-`Z` | YES (26 keys) | YES (Uppercase keys `A`-`Z`) | Standard 8-finger assignments |
| Spacebar | `' '` / `SPACE` | YES | YES (`SPACE`) | `thumb` |
| Semicolon | `;` | YES | YES (`;`) | `right-pinky` |
| Digits 0-9 | `0`, `1`, `2`, `3`, `4`, `5`, `6`, `7`, `8`, `9` | **NO** | **NO** | 1: L-Pinky, 2: L-Ring, 3: L-Middle, 4: L-Index, 5: L-Index, 6: R-Index, 7: R-Index, 8: R-Middle, 9: R-Ring, 0: R-Pinky |
| Shifted Digits / Symbols | `!`, `@`, `#`, `$`, `%`, `^`, `&`, `*`, `(`, `)` | **NO** | **NO** | !: L-Pinky, @: L-Ring, #: L-Middle, $: L-Index, %: L-Index, ^: R-Index, &: R-Index, *: R-Middle, (: R-Ring, ): R-Pinky |
| Hyphen / Minus / Underscore | `-`, `_` | **NO** | **NO** | `right-pinky` |
| Equal / Plus | `=`, `+` | **NO** | **NO** | `right-pinky` |
| Brackets & Braces | `[`, `]`, `{`, `}` | **NO** | **NO** | `right-pinky` |
| Punctuation | `,`, `.`, `'`, `"`, `?`, `/` | **NO** | **NO** | ,: R-Middle, .: R-Ring, ': R-Pinky, ": R-Pinky, ?: R-Pinky, /: R-Pinky |
| Developer Symbols | `<`, `>`, `:`, `\`, `\|`, `` ` ``, `~` | **NO** | **NO** | <: R-Middle, >: R-Ring, :: R-Pinky, \: R-Pinky, \|: R-Pinky, `: L-Pinky, ~: L-Pinky |
| Shift Modifier Keys | Left Shift, Right Shift | **NO** | **NO** | Left Shift: `left-pinky`, Right Shift: `right-pinky` |

### Key Highlighting & CyberHands Interaction Logic
1. **`CyberHands.tsx` Finger Lookup**:
   - Lines 72-73:
     ```tsx
     const upperKey  = activeKey.toUpperCase();
     const keyFinger = FINGER_MAP[upperKey === ' ' ? 'SPACE' : upperKey] || activeFinger;
     ```
   - When `activeKey` is in `FINGER_MAP`, `keyFinger` uses the mapped finger string (e.g. `'left-index'`).
   - When `activeKey` is NOT in `FINGER_MAP` (e.g. `'1'`, `','`, `'{'`), `FINGER_MAP[upperKey]` returns `undefined`, and `keyFinger` falls back to `activeFinger` (passed via props from `step.finger`).
   - Therefore, CyberHands *can* animate the correct finger IF `step.finger` is provided in `academyCurriculum.ts`.
2. **`VirtualKeyboard.tsx` Visual Key Highlighting**:
   - Line 56: `const isActive = key === normalizedActive || (key === 'SPACE' && normalizedActive === ' ');`
   - Line 57: `const finger = FINGER_MAP[key] || '';`
   - Line 58: `const isHinted = !isActive && activeFinger && finger === activeFinger;`
   - Because `ROWS` lacks number row keys, bracket keys, comma/period/quote/slash keys, and Shift keys, **no key on the VirtualKeyboard lights up when a number or symbol step is active**. Furthermore, unmapped keys cannot render finger tinting (`isHinted`).

---

## 2. Logic Chain

1. **Premise 1**: R4 requires full support for numbers (0-9), punctuation (`,`, `.`, `'`, `"`, `?`), developer symbols (`{`, `}`, `[`, `]`, `(`, `)`, `=`, `+`, `-`, `*`, `/`, `<`, `>`, `;`, `:`), and Shift key handling.
2. **Observation 1**: `VirtualKeyboard.tsx` currently only defines 4 rows in `ROWS`: Top letter row (`Q-P`), Home letter row + semicolon (`A-;`), Bottom letter row (`Z-M`), and `SPACE`. The number row (`1-0`), symbol keys (`-`, `=`, `[`, `]`, `\`, `'`, `,`, `.`, `/`, `` ` ``), and Shift keys are entirely omitted from `ROWS`.
3. **Deduction 1**: When `activeKey` is a digit or symbol outside `ROWS`, `VirtualKeyboard.tsx` cannot match `key === normalizedActive` for any key element. Thus, zero visual key buttons on the keyboard highlight as active or hinted for numbers and symbols.
4. **Observation 2**: `FINGER_MAP` contains entries only for uppercase `A-Z`, `;`, and `SPACE`. Entries for `0-9` and all non-semicolon symbols are absent.
5. **Deduction 2**: `CyberHands.tsx` falls back to `activeFinger` from `AcademyStep` when `FINGER_MAP[upperKey]` is `undefined`. While this allows CyberHands to highlight a finger if `step.finger` is set, `VirtualKeyboard.tsx` cannot style or tint keys based on finger mapping for missing symbols.
6. **Observation 3**: In `useAcademyEngine.ts`, `IGNORED` includes `'Shift'`, and `pressed` uses `e.key.toLowerCase()`. There is no tracking or display for Shift key coordination when typing uppercase letters or shifted symbols.
7. **Conclusion**: To fulfill R4, `VirtualKeyboard.tsx` must be updated with an expanded `ROWS` layout (or full 5-row keyboard with Shift keys) and `FINGER_MAP` must be expanded to include all digits and symbol characters. `CyberHands.tsx` and `VirtualKeyboard.tsx` should also support Shift key highlighting for upper-case and shifted symbols.

---

## 3. Caveats

- **No Code Modifications Made**: Per the role instructions, no source files were edited during this survey.
- **Assumptions**: The 3D CyberHands component relies on 10 defined finger bones (`left-pinky`, `left-ring`, `left-middle`, `left-index`, `thumb` for Left hand, and `right-index`, `right-middle`, `right-ring`, `right-pinky`, `thumb-right` for Right hand). Finger assignment for symbols follows standard touch-typing standards (e.g. Left Shift with Left Pinky for right-hand symbols, Right Shift with Right Pinky for left-hand symbols).

---

## 4. Conclusion

- `KEY_MAP` does not exist as a named export; the layout is structured as `ROWS` in `VirtualKeyboard.tsx`.
- `FINGER_MAP` currently covers only 26 letter keys (`A-Z`), `;`, and `SPACE`.
- ALL numbers (`0-9`), punctuation (`,`, `.`, `'`, `"`, `?`), developer symbols (`{`, `}`, `[`, `]`, `(`, `)`, `=`, `+`, `-`, `*`, `/`, `<`, `>`, `:`), and Shift keys are currently **MISSING** from `ROWS` and `FINGER_MAP`.
- When a missing symbol or digit is active, CyberHands relies solely on `activeFinger` fallback, while VirtualKeyboard fails to highlight any key.
- Implementation of R4 will require:
  1. Adding a number row, symbol keys, and Shift keys to `ROWS` (or equivalent layout) in `VirtualKeyboard.tsx`.
  2. Adding all digit and symbol mappings to `FINGER_MAP`.
  3. Supporting Shift key visual state and finger mapping when target keys require Shift.

---

## 5. Verification Method

To verify these findings independently:
1. Inspect `src/components/academy/VirtualKeyboard.tsx` lines 9–28 to confirm `ROWS` and `FINGER_MAP` definitions.
2. Inspect `src/components/academy/CyberHands.tsx` lines 72–78 to confirm finger lookup and fallback logic (`FINGER_MAP[upperKey] || activeFinger`).
3. Inspect `src/hooks/useAcademyEngine.ts` lines 48 & 127–130 to confirm key normalization and modifier handling.
4. Run `npx tsc --noEmit` or `npm run build` in the repository root to verify project build health.
