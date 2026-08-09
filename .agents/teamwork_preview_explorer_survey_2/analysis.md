# R2 Typing Metrics Engine & UI — Analysis & Specification Report

**Author**: Explorer 2 (Survey - R2 Typing Metrics Engine & UI)  
**Date**: 2026-08-09  
**Target Objective**: R2 Typing Metrics Feature (WPM & Accuracy tracking & live rendering in TypeNova Academy)

---

## 1. Executive Summary

This report provides a comprehensive analysis of the existing TypeNova Academy engine (`src/hooks/useAcademyEngine.ts`), its layout interface (`src/components/academy/AcademyLayout.tsx`), and the platform-wide metric calculation conventions (`src/hooks/useTypingEngine.ts`). 

Currently, TypeNova Academy manages lesson step progression and basic visual error feedback, but **lacks all performance metrics tracking**. Specifically, it does not track keystroke counts, error counts, elapsed typing time, net/raw Words Per Minute (WPM), or Accuracy percentage.

This specification details the exact state modifications, timing mechanisms, calculation formulas, and UI placement required to implement live, real-time WPM and Accuracy metrics in the Academy.

---

## 2. Codebase Inspection & Current Mechanics

### 2.1 `src/hooks/useAcademyEngine.ts`

#### Current State Management (Lines 50–70)
```typescript
export interface AcademyEngineState {
  currentLessonIndex: number;
  currentStepIndex: number;
  currentStep: AcademyStep | null;
  lessonTitle: string;
  lessonDescription: string;
  totalSteps: number;
  errorShake: boolean;
  lessonComplete: boolean;
  allComplete: boolean;
  completedLessons: Set<number>;
  goToLesson: (idx: number) => void;
  nextLesson: () => void;
}
```

- State hooks in `useAcademyEngine`:
  - `lessonIdx` (`useState(0)`): 0-indexed index of active lesson in `LESSONS`.
  - `stepIdx` (`useState(0)`): 0-indexed index of active step in current lesson.
  - `errorShake` (`useState(false)`): Boolean flag triggering a 300ms error shake animation on wrong key.
  - `lessonComplete` (`useState(false)`): Set to `true` when `nextStep >= currentLesson.steps.length`.
  - `completedLessons` (`useState<Set<number>>(new Set())`): Set of indices of completed lessons.

#### Keydown Handling & Step Transitions (Lines 106–151)
- Window `keydown` event listener attached with `{ capture: true }`.
- Ignores non-typing modifier/navigation keys via `IGNORED` set (`Shift`, `Control`, `Alt`, `Meta`, `CapsLock`, `Tab`, `Escape`, `Enter`, `Backspace`, `Delete`, `ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight`).
- Normalization: converts key to lowercase (or `' '` for Spacebar) and compares `pressed === expected`.
- **On Correct Hit** (`pressed === expected`):
  - Plays success audio `playSuccess()`.
  - Increments `stepIdx` to `si + 1`.
  - If `si + 1 >= currentLesson.steps.length`, calls `playLessonComplete()` and sets `lessonComplete = true`.
- **On Error Hit** (`pressed !== expected`):
  - Plays error audio `playError()`.
  - Sets `errorShake = true`, reset after 300ms timeout.
  - **Does NOT advance `stepIdx`** (user must press the correct key to advance).

#### Identified Gaps in `useAcademyEngine.ts`:
1. **Keystroke Counters Missing**: Neither total keypresses nor error keypresses are tracked.
2. **Timing State Missing**: `startTime`, `endTime`, and live timer interval are completely absent.
3. **Live Metrics Missing**: No calculation for net WPM, raw WPM, or Accuracy.
4. **Lesson Reset Gaps**: Changing lessons via `goToLesson` or `nextLesson` does not reset typing metrics counters or timers.

---

### 2.2 `src/components/academy/AcademyLayout.tsx`

#### Layout & UI Component Structure
1. **Top Progress Bar** (Lines 43–53): Shows cumulative overall step progress across all lessons (`overallProgress * 100%`).
2. **Header Navigation Bar** (Lines 89–146):
   - Left: `Exit Academy` button (`onExit`) and `Lessons` sidebar toggle button.
   - Center: Lesson progress dots (indicating completion state per lesson).
   - Right: Menu toggle & `TypeNova Academy` branding badge.
3. **Sidebar Curriculum Drawer** (Lines 152–194): Collapsible sidebar listing all lessons in `LESSONS`.
4. **Main Workspace Container** (Lines 197–362):
   - Lesson Title & Description (Lines 200–213).
   - Lesson Step Dots Indicator (Lines 216–232): Shows green/cyan/gray dots for steps in the active lesson.
   - Active Instruction Card (Lines 235–269): Displays `instruction` text and finger pill.
   - `VirtualKeyboard` & `CyberHands` (Lines 272–281): Visual keyboard + translucent hands.
   - Finger Legend (Lines 284–296).
   - Lesson Complete Modal/Screen (Lines 298–336): Currently only displays `${engine.currentStepIndex} keys pressed correctly`.
   - All Complete Screen (Lines 338–361).

#### Identified Integration Points for Metrics UI:
1. **Live Header / Top HUD Bar**: Real-time stats (WPM, Accuracy %, Elapsed Time) during typing.
2. **Instruction Card / Active HUD**: Sleek HUD counters right above or integrated into the main workspace.
3. **Lesson Complete Screen**: Comprehensive performance report (WPM, Accuracy %, Time taken, Total Keystrokes, Error count).

---

### 2.3 `src/hooks/useTypingEngine.ts` (Platform Metric Conventions)

TypeNova calculates typing stats using standard competitive typing formulas:
- **Standard Word Length**: 5 characters = 1 word.
- **Elapsed Time**: `minutes = elapsedMs / 60000`.
- **Raw WPM**: `Math.round((totalKeystrokes / 5) / minutes)`.
- **Net WPM**: `Math.max(0, Math.round(((correctHits) / 5) / minutes))` (or `(totalKeystrokes - errorCount) / 5 / minutes`).
- **Accuracy Percentage**: `Math.min(100, Math.max(0, Math.round((correctHits / totalKeystrokes) * 100)))`.

---

## 3. Detailed Metric Specification for R2

### 3.1 State Variables to Add to `useAcademyEngine.ts`

```typescript
// Metric state counters
const [totalKeystrokes, setTotalKeystrokes] = useState<number>(0);
const [correctHits, setCorrectHits] = useState<number>(0);
const [errorCount, setErrorCount] = useState<number>(0);

// Timing state
const [startTime, setStartTime] = useState<number | null>(null);
const [endTime, setEndTime] = useState<number | null>(null);
const [nowTime, setNowTime] = useState<number | null>(null);

// Mutable refs for keydown listener access
const totalKeystrokesRef = useRef(0);
const correctHitsRef = useRef(0);
const errorCountRef = useRef(0);
const startTimeRef = useRef<number | null>(null);
```

### 3.2 Keydown Metric Updates & Timer Trigger

1. **First Keypress Timer Trigger**:
   - When a valid non-ignored key is pressed and `startTimeRef.current === null`:
     - `const now = Date.now();`
     - `setStartTime(now);`
     - `startTimeRef.current = now;`
     - `setNowTime(now);`

2. **Metric Counters Update on Keydown**:
   - On **Correct Hit** (`pressed === expected`):
     - `setTotalKeystrokes(prev => prev + 1);`
     - `setCorrectHits(prev => prev + 1);`
     - `totalKeystrokesRef.current += 1;`
     - `correctHitsRef.current += 1;`
   - On **Wrong Hit** (`pressed !== expected`):
     - `setTotalKeystrokes(prev => prev + 1);`
     - `setErrorCount(prev => prev + 1);`
     - `totalKeystrokesRef.current += 1;`
     - `errorCountRef.current += 1;`

3. **Lesson Completion Timing**:
   - When `nextStep >= currentLesson.steps.length`:
     - `const finishTs = Date.now();`
     - `setEndTime(finishTs);`
     - `setLessonComplete(true);`

4. **Live Ticking Interval**:
   - A `useEffect` interval (e.g. ticking every 200ms) while `startTime !== null && !lessonComplete`:
     - Updates `nowTime` to `Date.now()`.
     - Ensures live WPM and Elapsed Time update smoothly even when user pauses between keypresses.

### 3.3 Metric Calculation Formulas

```typescript
// 1. Elapsed Seconds
const elapsedMs = endTime !== null && startTime !== null
  ? endTime - startTime
  : startTime !== null && nowTime !== null
  ? Math.max(0, nowTime - startTime)
  : 0;

const elapsedSeconds = Math.round(elapsedMs / 100) / 10; // rounded to 1 decimal place

// 2. Net WPM & Raw WPM
const minutes = elapsedMs / 60000;
const wpm = minutes > 0 ? Math.max(0, Math.round((correctHits / 5) / minutes)) : 0;
const rawWpm = minutes > 0 ? Math.max(0, Math.round((totalKeystrokes / 5) / minutes)) : 0;

// 3. Accuracy Percentage
const accuracy = totalKeystrokes > 0
  ? Math.min(100, Math.max(0, Math.round((correctHits / totalKeystrokes) * 100)))
  : 100;
```

---

## 4. UI/UX Design & Component Placement

### 4.1 Header Live HUD (Live Metrics in `AcademyLayout.tsx`)

In `AcademyLayout.tsx` header (right next to or replacing portion of header):
- **WPM Pill**: Holographic cyan badge displaying live WPM (e.g. `⚡ 48 WPM`).
- **Accuracy Pill**: Emerald badge displaying live Accuracy percentage (e.g. `🎯 98% ACC`).
- **Timer Pill**: Clock display for active typing duration (e.g. `⏱️ 0:14`).

```tsx
{/* Live Metric HUD Bar */}
<div className="flex items-center gap-3">
  {/* WPM */}
  <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg"
    style={{ background: 'rgba(6,182,212,0.10)', border: '1px solid rgba(6,182,212,0.30)' }}>
    <Zap size={12} style={{ color: '#00e5ff' }} />
    <span className="text-[11px] font-bold text-cyan-300">{engine.wpm} <span className="text-[9px] opacity-70">WPM</span></span>
  </div>

  {/* Accuracy */}
  <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg"
    style={{ background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.30)' }}>
    <Target size={12} style={{ color: '#34d399' }} />
    <span className="text-[11px] font-bold text-emerald-300">{engine.accuracy}% <span className="text-[9px] opacity-70">ACC</span></span>
  </div>

  {/* Time */}
  <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg"
    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)' }}>
    <Clock size={12} style={{ color: 'rgba(255,255,255,0.5)' }} />
    <span className="text-[11px] font-bold text-zinc-300">{engine.elapsedSeconds}s</span>
  </div>
</div>
```

### 4.2 Lesson Complete Screen Metrics Display

In `AcademyLayout.tsx` (Lines 298–336), replace the simple line text with a rich Holographic Performance Card:
- **Big Stats Grid**:
  - **Speed**: `${engine.wpm} WPM` (Raw: `${engine.rawWpm} WPM`)
  - **Accuracy**: `${engine.accuracy}%`
  - **Time**: `${engine.elapsedSeconds}s`
  - **Keystrokes**: `${engine.correctHits} / ${engine.totalKeystrokes}` (Errors: `${engine.errorCount}`)

---

## 5. Interface Specifications

### 5.1 Updated `AcademyEngineState` in `src/hooks/useAcademyEngine.ts`

```typescript
export interface AcademyEngineState {
  currentLessonIndex: number;
  currentStepIndex: number;
  currentStep: AcademyStep | null;
  lessonTitle: string;
  lessonDescription: string;
  totalSteps: number;
  errorShake: boolean;
  lessonComplete: boolean;
  allComplete: boolean;
  completedLessons: Set<number>;

  // ── R2 Metrics additions ──
  totalKeystrokes: number;
  correctHits: number;
  errorCount: number;
  startTime: number | null;
  endTime: number | null;
  elapsedSeconds: number;
  wpm: number;
  rawWpm: number;
  accuracy: number;

  // ── Actions ──
  goToLesson: (idx: number) => void;
  nextLesson: () => void;
  restartLesson: () => void;
}
```

---

## 6. Verification & Test Plan

1. **Initial State Verification**:
   - `wpm` = 0, `accuracy` = 100%, `elapsedSeconds` = 0, `totalKeystrokes` = 0, `errorCount` = 0 before first keypress.
2. **Timer Start Verification**:
   - Timer does not start until the first valid keypress occurs.
3. **Correct Keystroke Test**:
   - Pressing correct keys increments `totalKeystrokes` and `correctHits`. Accuracy remains 100%. WPM calculates accurately based on elapsed time.
4. **Error Keystroke Test**:
   - Pressing wrong keys increments `totalKeystrokes` and `errorCount`. Accuracy drops proportionally (`correctHits / totalKeystrokes`).
5. **Lesson Transition Test**:
   - Calling `goToLesson` or `nextLesson` or `restartLesson` resets `totalKeystrokes`, `correctHits`, `errorCount`, `startTime`, `endTime`, `nowTime` to initial states.
6. **Lesson Complete Screen Test**:
   - Final WPM, Accuracy %, Time, and Error counts match the live stats recorded during the lesson.

---

**Report Summary**: Explorer 2 survey complete. Detailed specs ready for implementers.
