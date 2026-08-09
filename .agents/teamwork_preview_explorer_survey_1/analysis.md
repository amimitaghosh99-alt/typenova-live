# Comprehensive Survey & Analysis Report: R1 Expanded Curriculum & Keyboard Map

**Author**: Explorer 1 (Survey - R1 Curriculum & Keyboard Map)  
**Date**: 2026-08-09  
**Target Module**: TypeNova Academy (`src/data/academyCurriculum.ts`, `src/components/academy/VirtualKeyboard.tsx`, `src/components/academy/CyberHands.tsx`, `src/hooks/useAcademyEngine.ts`, `src/components/academy/AcademyLayout.tsx`)  
**Objective**: Detail requirements, key-finger mappings, exact interfaces, and proposed code implementations for Objective R1 (Expanded Curriculum with 5+ new tailored typing lessons covering Top Row, Bottom Row, Spacebar & Shift Coordination, Full Alphabet A-Z, and Punctuation).

---

## 1. Executive Summary

The TypeNova Academy provides interactive touch-typing instruction through step-by-step key highlights, animated cyber-hand finger guidance, and custom sound feedback. Current curriculum (`src/data/academyCurriculum.ts`) contains 7 basic lessons primarily focusing on Home Row and basic left/right hand reaches. However:
1. **Curriculum Coverage Deficits**: Missing dedicated comprehensive lessons for Full Top Row (QWERTYUIOP), Full Bottom Row (ZXCVBNM), Shift/Caps Coordination, Full Alphabet Challenge (A-Z), and Punctuation Practice (,. / ; ' [ ]).
2. **Keyboard Map Deficits**: `VirtualKeyboard.tsx`'s `ROWS` and `FINGER_MAP` currently lack punctuation keys (`,`, `.`, `/`, `'`, `[`, `]`), which causes missing key renders and unmapped finger hints during punctuation drills.

This report presents a complete investigation of the curriculum system, exact finger mapping verification matrix, code modifications for `VirtualKeyboard.tsx` and `useAcademyEngine.ts`, and the full data definition for 5+ new tailored typing lessons (expanding total lessons to 12).

---

## 2. File & Component Architecture Survey

### 2.1 File Map

| File Path | Description & Role |
|---|---|
| `src/data/academyCurriculum.ts` | Defines `AcademyStep`, `AcademyLesson` interfaces and exports `LESSONS: AcademyLesson[]`. |
| `src/components/academy/VirtualKeyboard.tsx` | Renders holographic 4-row keyboard, defines `ROWS` layout array and `FINGER_MAP: Record<string, string>`. |
| `src/components/academy/CyberHands.tsx` | Renders SVG cyber hands, highlights active finger bone based on `FINGER_MAP` and `activeFinger`. |
| `src/hooks/useAcademyEngine.ts` | Manages active lesson/step indices, keydown event listeners, success/error sound beeps, error shake, and progress state. |
| `src/components/academy/AcademyLayout.tsx` | Academy UI container: top progress bar, lesson navigation sidebar, instruction cards, legend, keyboard/hands viewport. |

---

## 3. Data Structures & Interfaces Analysis

### 3.1 `AcademyStep` Interface (`src/data/academyCurriculum.ts`)

```typescript
export interface AcademyStep {
  targetKey: string;   // The expected key character (e.g. 'f', 'j', ' ', 'Q', ',', '.', '/')
  finger: string;      // The target finger ID (must match FINGER_META keys)
  instruction: string; // User-facing prompt (e.g., "Reach UP with left index → R")
}
```

### 3.2 `AcademyLesson` Interface (`src/data/academyCurriculum.ts`)

```typescript
export interface AcademyLesson {
  id: string;          // Unique string identifier (e.g. 'top_row_mastery')
  title: string;       // Display title (e.g. 'Top Row Mastery (QWERTYUIOP)')
  description: string; // Subtitle / goal description
  steps: AcademyStep[];// Array of sequential typing steps
}
```

### 3.3 Valid Finger Identifiers (`FINGER_META` in `AcademyLayout.tsx`)

Every `finger` property in an `AcademyStep` MUST be one of the following 9 exact string keys:
- `left-pinky`
- `left-ring`
- `left-middle`
- `left-index`
- `thumb`
- `right-index`
- `right-middle`
- `right-ring`
- `right-pinky`

---

## 4. Key & Finger Mapping Consistency Audit

### 4.1 Touch Typing Master Finger Matrix

To guarantee 100% consistency across `VirtualKeyboard.tsx`, `CyberHands.tsx`, and `academyCurriculum.ts`, the table below establishes the canonical finger assignment for every required QWERTY key:

| Key Category | Key(s) | Assigned Finger ID | Hand |
|---|---|---|---|
| **Home Row Left** | `A`, `a` | `left-pinky` | Left |
| | `S`, `s` | `left-ring` | Left |
| | `D`, `d` | `left-middle` | Left |
| | `F`, `f` | `left-index` | Left |
| | `G`, `g` | `left-index` | Left |
| **Home Row Right** | `H`, `h` | `right-index` | Right |
| | `J`, `j` | `right-index` | Right |
| | `K`, `k` | `right-middle` | Right |
| | `L`, `l` | `right-ring` | Right |
| | `;`, `:` | `right-pinky` | Right |
| | `'`, `"` | `right-pinky` | Right |
| **Top Row Left** | `Q`, `q` | `left-pinky` | Left |
| | `W`, `w` | `left-ring` | Left |
| | `E`, `e` | `left-middle` | Left |
| | `R`, `r` | `left-index` | Left |
| | `T`, `t` | `left-index` | Left |
| **Top Row Right** | `Y`, `y` | `right-index` | Right |
| | `U`, `u` | `right-index` | Right |
| | `I`, `i` | `right-middle` | Right |
| | `O`, `o` | `right-ring` | Right |
| | `P`, `p` | `right-pinky` | Right |
| | `[`, `{` | `right-pinky` | Right |
| | `]`, `}` | `right-pinky` | Right |
| **Bottom Row Left**| `Z`, `z` | `left-pinky` | Left |
| | `X`, `x` | `left-ring` | Left |
| | `C`, `c` | `left-middle` | Left |
| | `V`, `v` | `left-index` | Left |
| | `B`, `b` | `left-index` | Left |
| **Bottom Row Right**| `N`, `n` | `right-index` | Right |
| | `M`, `m` | `right-index` | Right |
| | `,`, `<` | `right-middle` | Right |
| | `.`, `>` | `right-ring` | Right |
| | `/`, `?` | `right-pinky` | Right |
| **Spacebar** | `' '`, `SPACE` | `thumb` | Either / Both Thumbs |

---

## 5. Required Component Updates for Punctuation & Shift Support

### 5.1 Updates to `src/components/academy/VirtualKeyboard.tsx`

Currently, `ROWS` and `FINGER_MAP` in `VirtualKeyboard.tsx` only contain standard letters, `;`, and `SPACE`. To support Punctuation Practice (,. / ; ' [ ]), `ROWS` and `FINGER_MAP` must be extended:

```typescript
// Proposed updated ROWS array in VirtualKeyboard.tsx
const ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', '[', ']'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ';', "'"],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M', ',', '.', '/'],
  ['SPACE'],
];

// Proposed updated FINGER_MAP object in VirtualKeyboard.tsx
export const FINGER_MAP: Record<string, string> = {
  // Left Hand
  Q: 'left-pinky',  A: 'left-pinky',  Z: 'left-pinky',
  W: 'left-ring',   S: 'left-ring',   X: 'left-ring',
  E: 'left-middle', D: 'left-middle', C: 'left-middle',
  R: 'left-index',  F: 'left-index',  V: 'left-index',
  T: 'left-index',  G: 'left-index',  B: 'left-index',

  // Right Hand
  Y: 'right-index', H: 'right-index', N: 'right-index',
  U: 'right-index', J: 'right-index', M: 'right-index',
  I: 'right-middle',K: 'right-middle',',': 'right-middle',
  O: 'right-ring',  L: 'right-ring',  '.': 'right-ring',
  P: 'right-pinky', ';': 'right-pinky', '/': 'right-pinky',
  "'": 'right-pinky', '[': 'right-pinky', ']': 'right-pinky',

  // Spacebar
  SPACE: 'thumb',
};
```

### 5.2 Updates to `src/hooks/useAcademyEngine.ts`

To handle Shift/Caps Coordination effectively:
1. `IGNORED` set has `'Shift'` and `'CapsLock'`. When user presses Shift, it is ignored until the target letter key is pressed.
2. For uppercase `targetKey` (e.g. `'A'`), `e.key` will be `'A'` (uppercase) if Shift/Caps is engaged, or `'a'` (lowercase) if unshifted.
3. If strict Shift enforcement is desired for uppercase targets in lessons:
```typescript
const isTargetUpper = step.targetKey !== step.targetKey.toLowerCase() && step.targetKey === step.targetKey.toUpperCase();
const pressed = e.key === ' ' ? ' ' : (isTargetUpper ? e.key : e.key.toLowerCase());
const expected = step.targetKey;
```

---

## 6. Detailed Requirements & Curriculum Specification (5+ New Tailored Lessons)

We recommend expanding the curriculum from 7 basic lessons to **12 structured lessons**. This retains the foundational Home Row drills while adding 5 dedicated, high-quality tailored lessons fulfilling all objective requirements.

### Summary of the 12-Lesson Expanded Curriculum

1. `home_row_1` — **Home Row Anchors**: Learn the foundation — your fingers' home position.
2. `home_row_2` — **Home Row Drill**: Reinforce muscle memory with rapid home row presses.
3. `top_row_1` — **Top Row — Left Hand**: Reach up from home row with left hand (Q, W, E, R, T).
4. `top_row_2` — **Top Row — Right Hand**: Reach up from home row with right hand (Y, U, I, O, P).
5. 🆕 `top_row_mastery` — **Top Row Mastery (QWERTYUIOP)**: Full top-row speed run combining both hands across all 10 keys.
6. `bottom_row_1` — **Bottom Row — Left Hand**: Reach down from home row with left hand (Z, X, C, V, B).
7. `bottom_row_2` — **Bottom Row — Right Hand**: Reach down from home row with right hand (N, M).
8. 🆕 `bottom_row_mastery` — **Bottom Row Mastery (ZXCVBNM)**: Full bottom-row sprint combining both hands across all 7 keys.
9. 🆕 `space_shift_coordination` — **Spacebar & Shift Coordination**: Timing thumb spaces and holding Shift for capital letters.
10. 🆕 `full_alphabet_challenge` — **Full Alphabet Challenge (A-Z)**: Sequential A-to-Z walkthrough and full pangram flow.
11. 🆕 `punctuation_practice` — **Punctuation Practice (,. / ; ' [ ])**: Precision drilling for essential punctuation symbols.
12. 🆕 `mastery_sprint` — **Academy Final Challenge**: Ultimate graduation test integrating letters, capitals, spaces, and punctuation.

---

## 7. Proposed `src/data/academyCurriculum.ts` Data Code

Below is the complete, proposed TS content for `src/data/academyCurriculum.ts`:

```typescript
export interface AcademyStep {
  targetKey: string;
  finger: string;
  instruction: string;
}

export interface AcademyLesson {
  id: string;
  title: string;
  description: string;
  steps: AcademyStep[];
}

export const LESSONS: AcademyLesson[] = [
  {
    id: 'home_row_1',
    title: 'Home Row Anchors',
    description: "Learn the foundation — your fingers' home position.",
    steps: [
      { targetKey: 'f', finger: 'left-index',   instruction: 'Rest your left index finger on F. Press it.' },
      { targetKey: 'j', finger: 'right-index',  instruction: 'Now rest your right index finger on J. Press it.' },
      { targetKey: 'd', finger: 'left-middle',  instruction: 'Left middle finger on D. Press it.' },
      { targetKey: 'k', finger: 'right-middle', instruction: 'Right middle finger on K. Press it.' },
      { targetKey: 's', finger: 'left-ring',    instruction: 'Left ring finger on S. Press it.' },
      { targetKey: 'l', finger: 'right-ring',   instruction: 'Right ring finger on L. Press it.' },
      { targetKey: 'a', finger: 'left-pinky',   instruction: 'Left pinky on A. Press it.' },
      { targetKey: 'f', finger: 'left-index',   instruction: 'Back to F. Feel the tactile bump? Press it.' },
      { targetKey: 'j', finger: 'right-index',  instruction: 'Back to J. Feel the tactile bump? Press it.' },
    ],
  },
  {
    id: 'home_row_2',
    title: 'Home Row Drill',
    description: 'Reinforce muscle memory with rapid home row presses.',
    steps: [
      { targetKey: 'a', finger: 'left-pinky',   instruction: 'A — left pinky' },
      { targetKey: 's', finger: 'left-ring',    instruction: 'S — left ring' },
      { targetKey: 'd', finger: 'left-middle',  instruction: 'D — left middle' },
      { targetKey: 'f', finger: 'left-index',   instruction: 'F — left index' },
      { targetKey: 'j', finger: 'right-index',  instruction: 'J — right index' },
      { targetKey: 'k', finger: 'right-middle', instruction: 'K — right middle' },
      { targetKey: 'l', finger: 'right-ring',   instruction: 'L — right ring' },
      { targetKey: 'l', finger: 'right-ring',   instruction: 'L again — right ring' },
      { targetKey: 'k', finger: 'right-middle', instruction: 'K — right middle' },
      { targetKey: 'j', finger: 'right-index',  instruction: 'J — right index' },
      { targetKey: 'f', finger: 'left-index',   instruction: 'F — left index' },
      { targetKey: 'd', finger: 'left-middle',  instruction: 'D — left middle' },
      { targetKey: 's', finger: 'left-ring',    instruction: 'S — left ring' },
      { targetKey: 'a', finger: 'left-pinky',   instruction: 'A — left pinky' },
    ],
  },
  {
    id: 'top_row_1',
    title: 'Top Row — Left Hand',
    description: 'Reach up from the home row with your left hand.',
    steps: [
      { targetKey: 'f', finger: 'left-index',   instruction: 'Start at home: F' },
      { targetKey: 'r', finger: 'left-index',   instruction: 'Reach UP with left index → R' },
      { targetKey: 'f', finger: 'left-index',   instruction: 'Return to F' },
      { targetKey: 't', finger: 'left-index',   instruction: 'Reach UP-RIGHT with left index → T' },
      { targetKey: 'f', finger: 'left-index',   instruction: 'Return to F' },
      { targetKey: 'd', finger: 'left-middle',  instruction: 'Home position: D' },
      { targetKey: 'e', finger: 'left-middle',  instruction: 'Reach UP with left middle → E' },
      { targetKey: 'd', finger: 'left-middle',  instruction: 'Return to D' },
      { targetKey: 's', finger: 'left-ring',    instruction: 'Home position: S' },
      { targetKey: 'w', finger: 'left-ring',    instruction: 'Reach UP with left ring → W' },
      { targetKey: 's', finger: 'left-ring',    instruction: 'Return to S' },
      { targetKey: 'a', finger: 'left-pinky',   instruction: 'Home position: A' },
      { targetKey: 'q', finger: 'left-pinky',   instruction: 'Reach UP with left pinky → Q' },
      { targetKey: 'a', finger: 'left-pinky',   instruction: 'Return to A' },
    ],
  },
  {
    id: 'top_row_2',
    title: 'Top Row — Right Hand',
    description: 'Reach up from the home row with your right hand.',
    steps: [
      { targetKey: 'j', finger: 'right-index',  instruction: 'Start at home: J' },
      { targetKey: 'u', finger: 'right-index',  instruction: 'Reach UP with right index → U' },
      { targetKey: 'j', finger: 'right-index',  instruction: 'Return to J' },
      { targetKey: 'y', finger: 'right-index',  instruction: 'Reach UP-LEFT with right index → Y' },
      { targetKey: 'j', finger: 'right-index',  instruction: 'Return to J' },
      { targetKey: 'k', finger: 'right-middle', instruction: 'Home position: K' },
      { targetKey: 'i', finger: 'right-middle', instruction: 'Reach UP with right middle → I' },
      { targetKey: 'k', finger: 'right-middle', instruction: 'Return to K' },
      { targetKey: 'l', finger: 'right-ring',   instruction: 'Home position: L' },
      { targetKey: 'o', finger: 'right-ring',   instruction: 'Reach UP with right ring → O' },
      { targetKey: 'l', finger: 'right-ring',   instruction: 'Return to L' },
      { targetKey: 'p', finger: 'right-pinky',  instruction: 'Reach UP with right pinky → P' },
    ],
  },
  {
    id: 'top_row_mastery',
    title: 'Top Row Mastery (QWERTYUIOP)',
    description: 'Master the full top row across both hands in sequence.',
    steps: [
      { targetKey: 'q', finger: 'left-pinky',   instruction: 'Q — left pinky' },
      { targetKey: 'w', finger: 'left-ring',    instruction: 'W — left ring' },
      { targetKey: 'e', finger: 'left-middle',  instruction: 'E — left middle' },
      { targetKey: 'r', finger: 'left-index',   instruction: 'R — left index' },
      { targetKey: 't', finger: 'left-index',   instruction: 'T — left index' },
      { targetKey: 'y', finger: 'right-index',  instruction: 'Y — right index' },
      { targetKey: 'u', finger: 'right-index',  instruction: 'U — right index' },
      { targetKey: 'i', finger: 'right-middle', instruction: 'I — right middle' },
      { targetKey: 'o', finger: 'right-ring',   instruction: 'O — right ring' },
      { targetKey: 'p', finger: 'right-pinky',  instruction: 'P — right pinky' },
      { targetKey: 'p', finger: 'right-pinky',  instruction: 'P again — right pinky' },
      { targetKey: 'o', finger: 'right-ring',   instruction: 'O — right ring' },
      { targetKey: 'i', finger: 'right-middle', instruction: 'I — right middle' },
      { targetKey: 'u', finger: 'right-index',  instruction: 'U — right index' },
      { targetKey: 'y', finger: 'right-index',  instruction: 'Y — right index' },
      { targetKey: 't', finger: 'left-index',   instruction: 'T — left index' },
      { targetKey: 'r', finger: 'left-index',   instruction: 'R — left index' },
      { targetKey: 'e', finger: 'left-middle',  instruction: 'E — left middle' },
      { targetKey: 'w', finger: 'left-ring',    instruction: 'W — left ring' },
      { targetKey: 'q', finger: 'left-pinky',   instruction: 'Q — left pinky' },
    ],
  },
  {
    id: 'bottom_row_1',
    title: 'Bottom Row — Left Hand',
    description: 'Reach down from the home row with your left hand.',
    steps: [
      { targetKey: 'f', finger: 'left-index',   instruction: 'Start at home: F' },
      { targetKey: 'v', finger: 'left-index',   instruction: 'Reach DOWN with left index → V' },
      { targetKey: 'f', finger: 'left-index',   instruction: 'Return to F' },
      { targetKey: 'b', finger: 'left-index',   instruction: 'Reach DOWN-RIGHT with left index → B' },
      { targetKey: 'f', finger: 'left-index',   instruction: 'Return to F' },
      { targetKey: 'd', finger: 'left-middle',  instruction: 'Home position: D' },
      { targetKey: 'c', finger: 'left-middle',  instruction: 'Reach DOWN with left middle → C' },
      { targetKey: 'd', finger: 'left-middle',  instruction: 'Return to D' },
      { targetKey: 's', finger: 'left-ring',    instruction: 'Home position: S' },
      { targetKey: 'x', finger: 'left-ring',    instruction: 'Reach DOWN with left ring → X' },
      { targetKey: 's', finger: 'left-ring',    instruction: 'Return to S' },
      { targetKey: 'a', finger: 'left-pinky',   instruction: 'Home position: A' },
      { targetKey: 'z', finger: 'left-pinky',   instruction: 'Reach DOWN with left pinky → Z' },
      { targetKey: 'a', finger: 'left-pinky',   instruction: 'Return to A' },
    ],
  },
  {
    id: 'bottom_row_2',
    title: 'Bottom Row — Right Hand',
    description: 'Reach down from the home row with your right hand.',
    steps: [
      { targetKey: 'j', finger: 'right-index',  instruction: 'Start at home: J' },
      { targetKey: 'm', finger: 'right-index',  instruction: 'Reach DOWN with right index → M' },
      { targetKey: 'j', finger: 'right-index',  instruction: 'Return to J' },
      { targetKey: 'n', finger: 'right-index',  instruction: 'Reach DOWN-LEFT with right index → N' },
      { targetKey: 'j', finger: 'right-index',  instruction: 'Return to J' },
      { targetKey: 'k', finger: 'right-middle', instruction: 'Home position: K' },
      { targetKey: 'm', finger: 'right-index',  instruction: 'Reach DOWN with right index → M' },
      { targetKey: 'j', finger: 'right-index',  instruction: 'Return to J' },
    ],
  },
  {
    id: 'bottom_row_mastery',
    title: 'Bottom Row Mastery (ZXCVBNM)',
    description: 'Flow smoothly across all bottom row keys with both hands.',
    steps: [
      { targetKey: 'z', finger: 'left-pinky',   instruction: 'Z — left pinky' },
      { targetKey: 'x', finger: 'left-ring',    instruction: 'X — left ring' },
      { targetKey: 'c', finger: 'left-middle',  instruction: 'C — left middle' },
      { targetKey: 'v', finger: 'left-index',   instruction: 'V — left index' },
      { targetKey: 'b', finger: 'left-index',   instruction: 'B — left index' },
      { targetKey: 'n', finger: 'right-index',  instruction: 'N — right index' },
      { targetKey: 'm', finger: 'right-index',  instruction: 'M — right index' },
      { targetKey: 'm', finger: 'right-index',  instruction: 'M again — right index' },
      { targetKey: 'n', finger: 'right-index',  instruction: 'N — right index' },
      { targetKey: 'b', finger: 'left-index',   instruction: 'B — left index' },
      { targetKey: 'v', finger: 'left-index',   instruction: 'V — left index' },
      { targetKey: 'c', finger: 'left-middle',  instruction: 'C — left middle' },
      { targetKey: 'x', finger: 'left-ring',    instruction: 'X — left ring' },
      { targetKey: 'z', finger: 'left-pinky',   instruction: 'Z — left pinky' },
    ],
  },
  {
    id: 'space_shift_coordination',
    title: 'Spacebar & Shift Coordination',
    description: 'Master thumb spacing and Shift key capitalization rhythm.',
    steps: [
      { targetKey: 'f', finger: 'left-index',   instruction: 'Press F — left index' },
      { targetKey: ' ', finger: 'thumb',        instruction: 'Press SPACE with your thumb' },
      { targetKey: 'j', finger: 'right-index',  instruction: 'Press J — right index' },
      { targetKey: ' ', finger: 'thumb',        instruction: 'Press SPACE with your thumb' },
      { targetKey: 'A', finger: 'left-pinky',   instruction: 'Hold Shift + press A — Capital A' },
      { targetKey: ' ', finger: 'thumb',        instruction: 'Press SPACE' },
      { targetKey: 'J', finger: 'right-index',  instruction: 'Hold Shift + press J — Capital J' },
      { targetKey: ' ', finger: 'thumb',        instruction: 'Press SPACE' },
      { targetKey: 'F', finger: 'left-index',   instruction: 'Hold Shift + press F — Capital F' },
      { targetKey: ' ', finger: 'thumb',        instruction: 'Press SPACE' },
      { targetKey: 'K', finger: 'right-middle', instruction: 'Hold Shift + press K — Capital K' },
      { targetKey: ' ', finger: 'thumb',        instruction: 'Press SPACE' },
    ],
  },
  {
    id: 'full_alphabet_challenge',
    title: 'Full Alphabet Challenge (A-Z)',
    description: 'Conquer the complete 26-letter English alphabet in order.',
    steps: [
      { targetKey: 'a', finger: 'left-pinky',   instruction: 'A — left pinky' },
      { targetKey: 'b', finger: 'left-index',   instruction: 'B — left index' },
      { targetKey: 'c', finger: 'left-middle',  instruction: 'C — left middle' },
      { targetKey: 'd', finger: 'left-middle',  instruction: 'D — left middle' },
      { targetKey: 'e', finger: 'left-middle',  instruction: 'E — left middle' },
      { targetKey: 'f', finger: 'left-index',   instruction: 'F — left index' },
      { targetKey: 'g', finger: 'left-index',   instruction: 'G — left index' },
      { targetKey: 'h', finger: 'right-index',  instruction: 'H — right index' },
      { targetKey: 'i', finger: 'right-middle', instruction: 'I — right middle' },
      { targetKey: 'j', finger: 'right-index',  instruction: 'J — right index' },
      { targetKey: 'k', finger: 'right-middle', instruction: 'K — right middle' },
      { targetKey: 'l', finger: 'right-ring',   instruction: 'L — right ring' },
      { targetKey: 'm', finger: 'right-index',  instruction: 'M — right index' },
      { targetKey: 'n', finger: 'right-index',  instruction: 'N — right index' },
      { targetKey: 'o', finger: 'right-ring',   instruction: 'O — right ring' },
      { targetKey: 'p', finger: 'right-pinky',  instruction: 'P — right pinky' },
      { targetKey: 'q', finger: 'left-pinky',   instruction: 'Q — left pinky' },
      { targetKey: 'r', finger: 'left-index',   instruction: 'R — left index' },
      { targetKey: 's', finger: 'left-ring',    instruction: 'S — left ring' },
      { targetKey: 't', finger: 'left-index',   instruction: 'T — left index' },
      { targetKey: 'u', finger: 'right-index',  instruction: 'U — right index' },
      { targetKey: 'v', finger: 'left-index',   instruction: 'V — left index' },
      { targetKey: 'w', finger: 'left-ring',    instruction: 'W — left ring' },
      { targetKey: 'x', finger: 'left-ring',    instruction: 'X — left ring' },
      { targetKey: 'y', finger: 'right-index',  instruction: 'Y — right index' },
      { targetKey: 'z', finger: 'left-pinky',   instruction: 'Z — left pinky' },
    ],
  },
  {
    id: 'punctuation_practice',
    title: "Punctuation Practice (,. / ; ' [ ])",
    description: 'Precision training for essential punctuation and symbol keys.',
    steps: [
      { targetKey: ';', finger: 'right-pinky',  instruction: '; (Semicolon) — right pinky' },
      { targetKey: "'", finger: 'right-pinky',  instruction: "' (Apostrophe) — right pinky" },
      { targetKey: ',', finger: 'right-middle', instruction: ', (Comma) — right middle' },
      { targetKey: '.', finger: 'right-ring',   instruction: '. (Period) — right ring' },
      { targetKey: '/', finger: 'right-pinky',  instruction: '/ (Slash) — right pinky' },
      { targetKey: '[', finger: 'right-pinky',  instruction: '[ (Left Bracket) — right pinky' },
      { targetKey: ']', finger: 'right-pinky',  instruction: '] (Right Bracket) — right pinky' },
      { targetKey: ',', finger: 'right-middle', instruction: 'Comma again: ,' },
      { targetKey: '.', finger: 'right-ring',   instruction: 'Period again: .' },
      { targetKey: ';', finger: 'right-pinky',  instruction: 'Semicolon again: ;' },
    ],
  },
  {
    id: 'mastery_sprint',
    title: 'Academy Final Challenge',
    description: 'Combine letters, capitals, spaces, and punctuation in a final sprint.',
    steps: [
      { targetKey: 'T', finger: 'left-index',   instruction: 'Capital T — Shift + T' },
      { targetKey: 'y', finger: 'right-index',  instruction: 'y' },
      { targetKey: 'p', finger: 'right-pinky',  instruction: 'p' },
      { targetKey: 'e', finger: 'left-middle',  instruction: 'e' },
      { targetKey: 'N', finger: 'right-index',  instruction: 'Capital N — Shift + N' },
      { targetKey: 'o', finger: 'right-ring',   instruction: 'o' },
      { targetKey: 'v', finger: 'left-index',   instruction: 'v' },
      { targetKey: 'a', finger: 'left-pinky',   instruction: 'a' },
      { targetKey: ' ', finger: 'thumb',        instruction: 'SPACE' },
      { targetKey: ',', finger: 'right-middle', instruction: ',' },
      { targetKey: ' ', finger: 'thumb',        instruction: 'SPACE' },
      { targetKey: '[', finger: 'right-pinky',  instruction: '[' },
      { targetKey: 'O', finger: 'right-ring',   instruction: 'Capital O' },
      { targetKey: 'K', finger: 'right-middle', instruction: 'Capital K' },
      { targetKey: ']', finger: 'right-pinky',  instruction: ']' },
      { targetKey: '.', finger: 'right-ring',   instruction: '.' },
    ],
  },
];
```

---

## 8. Recommendations for Implementation & Testing

1. **Update `src/components/academy/VirtualKeyboard.tsx`**: Add `[`, `]`, `'`, `,`, `.`, `/` to `ROWS` and map them in `FINGER_MAP`.
2. **Update `src/data/academyCurriculum.ts`**: Replace the current array with the 12-lesson expanded dataset.
3. **Verify UI Responsiveness in `AcademyLayout.tsx`**: Ensure the sidebar lesson list scrolls smoothly with 12 lessons (the existing CSS already uses `overflow-y-auto` and fixed sidebar width of 188px).
4. **Verification Test Suite**:
   - Run build step: `npm run build` or `npx tsc --noEmit`
   - Run dev server: test keypress reactions for new punctuation keys and capitals.
