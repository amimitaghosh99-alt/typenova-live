# Handoff Report — R1. Comprehensive Tailored Lessons Expansion

**Agent**: `teamwork_preview_explorer_survey_1`  
**Target Milestone**: R1 — Comprehensive Tailored Lessons Expansion  
**Working Directory**: `c:\Users\risho\OneDrive\Desktop\typenova-v2 - Copy\.agents\teamwork_preview_explorer_survey_1`  
**Date**: 2026-08-09  

---

## Executive Summary
This report presents a complete investigation and technical design for expanding `src/data/academyCurriculum.ts` from 7 flat lessons to 15 structured lessons across 4 distinct categories: **"Foundations"**, **"Numbers & Punctuation"**, **"Developer Code"**, and **"Speed & Rhythm"**. It details the necessary data structure updates, exact finger mappings for numbers/symbols, keypress comparison logic in the engine, and exact lesson definitions for 8 new specialized lessons.

---

## 1. Observation

### 1.1 `src/data/academyCurriculum.ts` Analysis
- **File Location**: `src/data/academyCurriculum.ts` (143 lines total)
- **Current Data Structures** (Lines 1–12):
  ```ts
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
  ```
- **Existing Lessons** (Lines 14–142):
  - Currently contains an array `LESSONS: AcademyLesson[]` with **7 flat lessons**:
    1. `home_row_1`: "Home Row Anchors" (9 steps)
    2. `home_row_2`: "Home Row Drill" (14 steps)
    3. `top_row_1`: "Top Row — Left Hand" (15 steps)
    4. `top_row_2`: "Top Row — Right Hand" (12 steps)
    5. `bottom_row_1`: "Bottom Row — Left Hand" (15 steps)
    6. `bottom_row_2`: "Bottom Row — Right Hand" (7 steps)
    7. `space_bar`: "The Spacebar" (8 steps)
- **Deficiencies**:
  - `AcademyLesson` has no `category` field or `difficulty` metadata.
  - Lessons are un-categorized in a single flat list.
  - Coverage is missing number row (0-9), punctuation (`.`, `,`, `;`, `'`, `?`), capital letters (Shift modifier), coding brackets (`{ }`, `[ ]`, `( )`), operators (`=`, `+`, `-`, `*`, `/`, `<`, `>`, `:`), high-frequency bigrams (`th`, `he`, `in`, `er`, `an`, `re`, `nd`, `at`), and word flow drills (`the`, `and`, `code`, `nova`).

### 1.2 `VirtualKeyboard.tsx` & `CyberHands.tsx` Analysis
- **File Location**: `src/components/academy/VirtualKeyboard.tsx` (115 lines)
- **Current `FINGER_MAP`** (Lines 16–28):
  - Maps uppercase letters `Q-Z`, semicolon `;`, and `SPACE` to finger identifiers (`left-pinky`, `left-ring`, `left-middle`, `left-index`, `right-index`, `right-middle`, `right-ring`, `right-pinky`, `thumb`).
- **Deficiencies**:
  - Missing all digits `0–9`.
  - Missing all punctuation/symbol keys: `,`, `.`, `/`, `'`, `[`, `]`, `{`, `}`, `(`, `)`, `=`, `+`, `-`, `*`, `<`, `>`, `:`, `!`, `@`, `#`, `$`, `%`, `^`, `&`, `_`, `?`, `"`.
  - `ROWS` array in `VirtualKeyboard.tsx` (Lines 9–14) only defines letter rows and `SPACE` — missing the top number row `1 2 3 4 5 6 7 8 9 0 - =`.

### 1.3 `useAcademyEngine.ts` Keypress Matching
- **File Location**: `src/hooks/useAcademyEngine.ts` (168 lines)
- **Keydown Handler Logic** (Lines 127–128):
  ```ts
  const pressed = e.key === ' ' ? ' ' : e.key.toLowerCase();
  const expected = step.targetKey.toLowerCase();
  ```
- **Observation on Case Sensitivity & Symbols**:
  - For lowercase/uppercase letter targets or standard punctuation (e.g. `'!'`, `'{'`), `.toLowerCase()` preserves the symbol (e.g., `'!'.toLowerCase() === '!'`).
  - However, for Shift-modified uppercase letters (e.g. `targetKey: 'A'`), `.toLowerCase()` converts `'A'` to `'a'`, meaning a user pressing `'a'` without holding Shift would match!
  - **Engine requirement for implementer**: Exact case matching (`e.key === step.targetKey`) should be used when Shift enforcement is desired.

### 1.4 `AcademyLayout.tsx` UI Integration
- **File Location**: `src/components/academy/AcademyLayout.tsx` (367 lines)
- **Curriculum Imports & Iteration** (Line 6, 112–129, 163–192):
  - Imports `LESSONS` directly from `@/data/academyCurriculum`.
  - Sidebar renders flat list of lessons with index-based step counts.
  - Overall progress calculation (Lines 34–37) sums `steps.length` over `LESSONS`.

---

## 2. Logic Chain

1. **Observation 1.1 → Data Structure Enhancement**:
   - `AcademyLesson` must be updated with `category: AcademyCategory` and `difficulty?: 'Beginner' | 'Intermediate' | 'Advanced'`.
   - A new type `AcademyCategory` with values `'Foundations' | 'Numbers & Punctuation' | 'Developer Code' | 'Speed & Rhythm'` must be exported from `academyCurriculum.ts`.
   - A constant array `ACADEMY_CATEGORIES` should be exported to provide metadata (title, description, icon name) for category filter tabs/accordions in `AcademyLayout.tsx`.

2. **Observation 1.1 → Existing Lesson Categorization**:
   - The 7 existing lessons (`home_row_1`, `home_row_2`, `top_row_1`, `top_row_2`, `bottom_row_1`, `bottom_row_2`, `space_bar`) belong in the **"Foundations"** category.

3. **Observation 1.1 & User Request → 8 New Specialized Lessons**:
   - To fulfill R1 requirements, 8 new specialized lessons must be added:
     - **Category: Numbers & Punctuation**:
       1. `num_row_left`: "Number Row — Left Hand" (Digits 1, 2, 3, 4, 5)
       2. `num_row_right`: "Number Row — Right Hand" (Digits 6, 7, 8, 9, 0)
       3. `punctuation_basic`: "Punctuation & Shift" (Commas, periods, semicolons, quotes, uppercase with Shift)
     - **Category: Developer Code**:
       4. `dev_brackets`: "Brackets & Delimiters" (Parentheses `( )`, square brackets `[ ]`, curly braces `{ }`)
       5. `dev_operators`: "Operators & Symbols" (Equals `=`, plus `+`, minus `-`, asterisk `*`, slash `/`, angle brackets `< >`, semicolon `;`, colon `:`)
     - **Category: Speed & Rhythm**:
       6. `speed_bigrams`: "High-Frequency Bigrams" (Pairs `th`, `he`, `in`, `er`, `an`, `re`, `nd`, `at`)
       7. `speed_word_flow`: "Word Flow Drills" (Words `the`, `and`, `code`, `nova`)
       8. `full_alphabet_challenge`: "Full Alphabet Challenge" (Fluid sequence A through Z)

4. **Observation 1.2 → Keyboard & Hand Map Completeness**:
   - `VirtualKeyboard.tsx` needs `FINGER_MAP` entries for all numbers (`0-9`) and symbols (`.`, `,`, `/`, `;`, `'`, `[`, `]`, `-`, `=`, `{`, `}`, `(`, `)`, `+`, `*`, `<`, `>`, `:`, `!`, `@`, `#`, `$`, `%`, `^`, `&`, `_`, `?`, `"`).
   - `CyberHands.tsx` uses `FINGER_MAP` with fallback to `step.finger`. Defining `FINGER_MAP` ensures both keyboard and hands stay perfectly synced for all new keys.

---

## 3. Caveats

- **No source code was edited**: This investigation was conducted purely via read-only file access.
- **Audio Context / Web Audio API**: Sound triggers in `useAcademyEngine.ts` use standard oscillator frequency beeps which work across all target keys without modification.
- **WPM & Accuracy Engine (R2 / R3)**: Handled by downstream implementer tasks, but the curriculum step structure defined here directly supports keystroke event counting.

---

## 4. Conclusion & Technical Specifications

### 4.1 Updated `src/data/academyCurriculum.ts` Interfaces

```ts
export type AcademyCategory =
  | 'Foundations'
  | 'Numbers & Punctuation'
  | 'Developer Code'
  | 'Speed & Rhythm';

export interface AcademyStep {
  targetKey: string;
  finger: string;
  instruction: string;
}

export interface AcademyLesson {
  id: string;
  title: string;
  description: string;
  category: AcademyCategory;
  difficulty?: 'Beginner' | 'Intermediate' | 'Advanced';
  steps: AcademyStep[];
}

export interface CategoryInfo {
  id: AcademyCategory;
  title: string;
  description: string;
  icon: string;
}

export const ACADEMY_CATEGORIES: CategoryInfo[] = [
  {
    id: 'Foundations',
    title: 'Foundations',
    description: 'Master home row anchors, top & bottom rows, and spacebar coordination.',
    icon: 'Keyboard',
  },
  {
    id: 'Numbers & Punctuation',
    title: 'Numbers & Punctuation',
    description: 'Conquer the top number row (0-9), shift keys, and essential punctuation.',
    icon: 'Hash',
  },
  {
    id: 'Developer Code',
    title: 'Developer Code',
    description: 'Specialized syntax drills: brackets, operators, and code symbols.',
    icon: 'Code',
  },
  {
    id: 'Speed & Rhythm',
    title: 'Speed & Rhythm',
    description: 'High-frequency bigrams, letter pairs, and fluid word drills.',
    icon: 'Zap',
  },
];
```

### 4.2 Complete 15-Lesson Curriculum Data Specification

#### Category 1: Foundations (7 Existing Lessons Updated with Category)
1. `home_row_1` — "Home Row Anchors" (Category: `'Foundations'`, Difficulty: `'Beginner'`)
2. `home_row_2` — "Home Row Drill" (Category: `'Foundations'`, Difficulty: `'Beginner'`)
3. `top_row_1` — "Top Row — Left Hand" (Category: `'Foundations'`, Difficulty: `'Beginner'`)
4. `top_row_2` — "Top Row — Right Hand" (Category: `'Foundations'`, Difficulty: `'Beginner'`)
5. `bottom_row_1` — "Bottom Row — Left Hand" (Category: `'Foundations'`, Difficulty: `'Beginner'`)
6. `bottom_row_2` — "Bottom Row — Right Hand" (Category: `'Foundations'`, Difficulty: `'Beginner'`)
7. `space_bar` — "The Spacebar" (Category: `'Foundations'`, Difficulty: `'Beginner'`)

#### Category 2: Numbers & Punctuation (3 New Lessons)
8. **`num_row_left`** — "Number Row — Left Hand" (Category: `'Numbers & Punctuation'`, Difficulty: `'Intermediate'`)
   - Steps:
     1. `{ targetKey: '1', finger: 'left-pinky', instruction: 'Reach UP to 1 with left pinky' }`
     2. `{ targetKey: '2', finger: 'left-ring', instruction: 'Reach UP to 2 with left ring' }`
     3. `{ targetKey: '3', finger: 'left-middle', instruction: 'Reach UP to 3 with left middle' }`
     4. `{ targetKey: '4', finger: 'left-index', instruction: 'Reach UP to 4 with left index' }`
     5. `{ targetKey: '5', finger: 'left-index', instruction: 'Reach UP-RIGHT to 5 with left index' }`
     6. `{ targetKey: '1', finger: 'left-pinky', instruction: 'Press 1' }`
     7. `{ targetKey: '2', finger: 'left-ring', instruction: 'Press 2' }`
     8. `{ targetKey: '3', finger: 'left-middle', instruction: 'Press 3' }`
     9. `{ targetKey: '4', finger: 'left-index', instruction: 'Press 4' }`
     10. `{ targetKey: '5', finger: 'left-index', instruction: 'Press 5' }`
     11. `{ targetKey: ' ', finger: 'thumb', instruction: 'Spacebar' }`

9. **`num_row_right`** — "Number Row — Right Hand" (Category: `'Numbers & Punctuation'`, Difficulty: `'Intermediate'`)
   - Steps:
     1. `{ targetKey: '6', finger: 'right-index', instruction: 'Reach UP-LEFT to 6 with right index' }`
     2. `{ targetKey: '7', finger: 'right-index', instruction: 'Reach UP to 7 with right index' }`
     3. `{ targetKey: '8', finger: 'right-middle', instruction: 'Reach UP to 8 with right middle' }`
     4. `{ targetKey: '9', finger: 'right-ring', instruction: 'Reach UP to 9 with right ring' }`
     5. `{ targetKey: '0', finger: 'right-pinky', instruction: 'Reach UP to 0 with right pinky' }`
     6. `{ targetKey: '6', finger: 'right-index', instruction: 'Press 6' }`
     7. `{ targetKey: '7', finger: 'right-index', instruction: 'Press 7' }`
     8. `{ targetKey: '8', finger: 'right-middle', instruction: 'Press 8' }`
     9. `{ targetKey: '9', finger: 'right-ring', instruction: 'Press 9' }`
     10. `{ targetKey: '0', finger: 'right-pinky', instruction: 'Press 0' }`
     11. `{ targetKey: ' ', finger: 'thumb', instruction: 'Spacebar' }`

10. **`punctuation_basic`** — "Punctuation & Shift" (Category: `'Numbers & Punctuation'`, Difficulty: `'Intermediate'`)
    - Steps:
      1. `{ targetKey: ',', finger: 'right-middle', instruction: 'Press comma , with right middle' }`
      2. `{ targetKey: '.', finger: 'right-ring', instruction: 'Press period . with right ring' }`
      3. `{ targetKey: ';', finger: 'right-pinky', instruction: 'Press semicolon ; with right pinky' }`
      4. `{ targetKey: '\'', finger: 'right-pinky', instruction: 'Press single quote \' with right pinky' }`
      5. `{ targetKey: '?', finger: 'right-pinky', instruction: 'Press question mark ? (Shift + /)' }`
      6. `{ targetKey: 'A', finger: 'left-pinky', instruction: 'Capital A (Shift + A)' }`
      7. `{ targetKey: 'J', finger: 'right-index', instruction: 'Capital J (Shift + J)' }`
      8. `{ targetKey: ',', finger: 'right-middle', instruction: 'Comma ,' }`
      9. `{ targetKey: '.', finger: 'right-ring', instruction: 'Period .' }`
      10. `{ targetKey: ' ', finger: 'thumb', instruction: 'Spacebar' }`

#### Category 3: Developer Code (2 New Lessons)
11. **`dev_brackets`** — "Brackets & Delimiters" (Category: `'Developer Code'`, Difficulty: `'Advanced'`)
    - Steps:
      1. `{ targetKey: '(', finger: 'right-ring', instruction: 'Press open paren ( (Shift + 9)' }`
      2. `{ targetKey: ')', finger: 'right-pinky', instruction: 'Press close paren ) (Shift + 0)' }`
      3. `{ targetKey: '[', finger: 'right-pinky', instruction: 'Press open bracket [' }`
      4. `{ targetKey: ']', finger: 'right-pinky', instruction: 'Press close bracket ]' }`
      5. `{ targetKey: '{', finger: 'right-pinky', instruction: 'Press open brace { (Shift + [)' }`
      6. `{ targetKey: '}', finger: 'right-pinky', instruction: 'Press close brace } (Shift + ])' }`
      7. `{ targetKey: '(', finger: 'right-ring', instruction: 'Open paren (' }`
      8. `{ targetKey: ')', finger: 'right-pinky', instruction: 'Close paren )' }`
      9. `{ targetKey: '{', finger: 'right-pinky', instruction: 'Open brace {' }`
      10. `{ targetKey: '}', finger: 'right-pinky', instruction: 'Close brace }' }`

12. **`dev_operators`** — "Operators & Symbols" (Category: `'Developer Code'`, Difficulty: `'Advanced'`)
    - Steps:
      1. `{ targetKey: '=', finger: 'right-pinky', instruction: 'Press equals =' }`
      2. `{ targetKey: '+', finger: 'right-pinky', instruction: 'Press plus + (Shift + =)' }`
      3. `{ targetKey: '-', finger: 'right-pinky', instruction: 'Press minus -' }`
      4. `{ targetKey: '*', finger: 'right-middle', instruction: 'Press asterisk * (Shift + 8)' }`
      5. `{ targetKey: '/', finger: 'right-pinky', instruction: 'Press slash /' }`
      6. `{ targetKey: '<', finger: 'right-middle', instruction: 'Press less-than < (Shift + comma)' }`
      7. `{ targetKey: '>', finger: 'right-ring', instruction: 'Press greater-than > (Shift + period)' }`
      8. `{ targetKey: ':', finger: 'right-pinky', instruction: 'Press colon : (Shift + semicolon)' }`
      9. `{ targetKey: ';', finger: 'right-pinky', instruction: 'Press semicolon ;' }`

#### Category 4: Speed & Rhythm (3 New Lessons)
13. **`speed_bigrams`** — "High-Frequency Bigrams" (Category: `'Speed & Rhythm'`, Difficulty: `'Intermediate'`)
    - Steps:
      1. `{ targetKey: 't', finger: 'left-index', instruction: 'Bigram "th": press T' }`
      2. `{ targetKey: 'h', finger: 'right-index', instruction: 'Bigram "th": press H' }`
      3. `{ targetKey: ' ', finger: 'thumb', instruction: 'Spacebar' }`
      4. `{ targetKey: 'h', finger: 'right-index', instruction: 'Bigram "he": press H' }`
      5. `{ targetKey: 'e', finger: 'left-middle', instruction: 'Bigram "he": press E' }`
      6. `{ targetKey: ' ', finger: 'thumb', instruction: 'Spacebar' }`
      7. `{ targetKey: 'i', finger: 'right-middle', instruction: 'Bigram "in": press I' }`
      8. `{ targetKey: 'n', finger: 'right-index', instruction: 'Bigram "in": press N' }`
      9. `{ targetKey: ' ', finger: 'thumb', instruction: 'Spacebar' }`
      10. `{ targetKey: 'e', finger: 'left-middle', instruction: 'Bigram "er": press E' }`
      11. `{ targetKey: 'r', finger: 'left-index', instruction: 'Bigram "er": press R' }`
      12. `{ targetKey: ' ', finger: 'thumb', instruction: 'Spacebar' }`
      13. `{ targetKey: 'a', finger: 'left-pinky', instruction: 'Bigram "an": press A' }`
      14. `{ targetKey: 'n', finger: 'right-index', instruction: 'Bigram "an": press N' }`
      15. `{ targetKey: ' ', finger: 'thumb', instruction: 'Spacebar' }`
      16. `{ targetKey: 'r', finger: 'left-index', instruction: 'Bigram "re": press R' }`
      17. `{ targetKey: 'e', finger: 'left-middle', instruction: 'Bigram "re": press E' }`

14. **`speed_word_flow`** — "Word Flow Drills" (Category: `'Speed & Rhythm'`, Difficulty: `'Advanced'`)
    - Steps:
      1. `{ targetKey: 't', finger: 'left-index', instruction: 'Word "the": T' }`
      2. `{ targetKey: 'h', finger: 'right-index', instruction: 'Word "the": H' }`
      3. `{ targetKey: 'e', finger: 'left-middle', instruction: 'Word "the": E' }`
      4. `{ targetKey: ' ', finger: 'thumb', instruction: 'Space' }`
      5. `{ targetKey: 'a', finger: 'left-pinky', instruction: 'Word "and": A' }`
      6. `{ targetKey: 'n', finger: 'right-index', instruction: 'Word "and": N' }`
      7. `{ targetKey: 'd', finger: 'left-middle', instruction: 'Word "and": D' }`
      8. `{ targetKey: ' ', finger: 'thumb', instruction: 'Space' }`
      9. `{ targetKey: 'c', finger: 'left-middle', instruction: 'Word "code": C' }`
      10. `{ targetKey: 'o', finger: 'right-ring', instruction: 'Word "code": O' }`
      11. `{ targetKey: 'd', finger: 'left-middle', instruction: 'Word "code": D' }`
      12. `{ targetKey: 'e', finger: 'left-middle', instruction: 'Word "code": E' }`
      13. `{ targetKey: ' ', finger: 'thumb', instruction: 'Space' }`
      14. `{ targetKey: 'n', finger: 'right-index', instruction: 'Word "nova": N' }`
      15. `{ targetKey: 'o', finger: 'right-ring', instruction: 'Word "nova": O' }`
      16. `{ targetKey: 'v', finger: 'left-index', instruction: 'Word "nova": V' }`
      17. `{ targetKey: 'a', finger: 'left-pinky', instruction: 'Word "nova": A' }`

15. **`full_alphabet_challenge`** — "Full Alphabet Challenge" (Category: `'Speed & Rhythm'`, Difficulty: `'Advanced'`)
    - Steps: 26 steps for `a` through `z` with corresponding finger assignments (`left-pinky`, `left-ring`, `left-middle`, `left-index`, `right-index`, `right-middle`, `right-ring`, `right-pinky`).

### 4.3 `FINGER_MAP` Additions for `VirtualKeyboard.tsx`
```ts
export const FINGER_MAP: Record<string, string> = {
  // Letters
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

  // Space
  SPACE: 'thumb',

  // Numbers (0-9)
  '1': 'left-pinky',
  '2': 'left-ring',
  '3': 'left-middle',
  '4': 'left-index',
  '5': 'left-index',
  '6': 'right-index',
  '7': 'right-index',
  '8': 'right-middle',
  '9': 'right-ring',
  '0': 'right-pinky',

  // Punctuation & Developer Symbols
  ',': 'right-middle',  '<': 'right-middle',
  '.': 'right-ring',    '>': 'right-ring',
  '/': 'right-pinky',   '?': 'right-pinky',
  ':': 'right-pinky',   '\'': 'right-pinky',  '"': 'right-pinky',
  '[': 'right-pinky',   '{': 'right-pinky',
  ']': 'right-pinky',   '}': 'right-pinky',
  '-': 'right-pinky',   '_': 'right-pinky',
  '=': 'right-pinky',   '+': 'right-pinky',
  '!': 'left-pinky',    '@': 'left-ring',     '#': 'left-middle',
  '$': 'left-index',    '%': 'left-index',    '^': 'right-index',
  '&': 'right-index',   '*': 'right-middle',  '(': 'right-ring',
  ')': 'right-pinky',
};
```

---

## 5. Verification Method

1. **Type & Compile Verification**:
   - Inspect `src/data/academyCurriculum.ts` for export of `AcademyCategory`, `ACADEMY_CATEGORIES`, `AcademyLesson`, `AcademyStep`, and `LESSONS`.
   - Verify all 15 lessons exist in `LESSONS` array with valid `category` fields matching one of the 4 defined categories.
   - Run static verification or `npx tsc --noEmit` to confirm zero type errors.

2. **Keyboard & Hand Map Verification**:
   - Inspect `VirtualKeyboard.tsx` and `CyberHands.tsx`. Confirm `FINGER_MAP` includes entries for all digits `0–9` and symbols `(`, `)`, `[`, `]`, `{`, `}`, `=`, `+`, `-`, `*`, `/`, `<`, `>`, `:`, `;`, `,`, `.`, `?`, `'`.

3. **UI & Navigation Verification**:
   - Open TypeNova Academy view in browser/preview.
   - Verify sidebar categorizes 15 lessons under 4 collapsible/tabbed categories: "Foundations", "Numbers & Punctuation", "Developer Code", "Speed & Rhythm".
