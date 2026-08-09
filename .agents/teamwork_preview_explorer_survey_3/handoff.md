# Handoff Report: TypeNova Academy R2 (Category UI) & R3 (Engine & Gamification) Analysis

## 1. Observation

### 1.1 `AcademyLayout.tsx` (`src/components/academy/AcademyLayout.tsx`)
- **Header Structure (Lines 89-146)**:
  - Contains exit button (line 93), lesson list toggle button (line 100), top progress dot navigation mapping over flat `LESSONS` array (lines 111-130), and right branding badge (line 138).
  - Lacks category filter tabs, category dropdown, or audio toggle controls.
- **Sidebar Structure (Lines 152-194)**:
  - Sidebar width `188px` toggled by `sidebarOpen` state (line 26).
  - Iterates over flat `LESSONS` array directly without any category filtering or accordion groupings:
    ```tsx
    {LESSONS.map((lesson, i) => {
      const done = engine.completedLessons.has(i);
      const cur  = i === engine.currentLessonIndex;
      return (
        <button key={lesson.id} onClick={() => engine.goToLesson(i)} ...>
          <div className="w-[22px] h-[22px] ...">{done ? <CheckCircle2 size={10} /> : i + 1}</div>
          <div className="min-w-0">
            <p ...>{lesson.title}</p>
            <p ...>{lesson.steps.length} steps</p>
          </div>
        </button>
      );
    })}
    ```
- **Main Deck & Stats Display (Lines 197-296)**:
  - Displays Lesson Title & Description (lines 200-213), Step Dots (lines 216-232), Instruction Card with Red Shake on error (lines 235-269), Virtual Keyboard + CyberHands (lines 272-281), and Finger Legend (lines 284-296).
  - **No Live Stats HUD**: There is currently no component or element displaying WPM, Accuracy %, or error-free streak during typing.
- **Lesson Complete UI (Lines 298-336)**:
  - Displays a static inline section showing `Trophy` icon, "Lesson Complete", `engine.currentStepIndex` keys pressed correctly, "Back to Home" button, and "Next Lesson" button.
  - **No Completion Modal**: Does not render as a floating overlay modal.
  - **No Gamification Metrics**: Does not display final WPM, final Accuracy %, maximum Streak, or Star Ratings (1-3 stars).

### 1.2 `useAcademyEngine.ts` (`src/hooks/useAcademyEngine.ts`)
- **Engine State Definition (Lines 50-63)**:
  ```ts
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
- **State Management & Keydown Handler (Lines 65-151)**:
  - Manages `lessonIdx`, `stepIdx`, `errorShake`, `lessonComplete`, `completedLessons`.
  - Captures keyboard events in `useEffect` (lines 106-151).
  - On correct key (`pressed === expected`), calls `playSuccess()` (line 132), increments `stepIdx` or sets `lessonComplete(true)` and calls `playLessonComplete()` (line 136).
  - On wrong key, calls `playError()` (line 143) and triggers red shake animation.
- **Missing Metrics & State in Hook**:
  - No `startTime` tracking to measure duration.
  - No keystroke tracking (`totalKeystrokes`, `correctHits`, `errorCount`).
  - No calculation functions or state for `wpm`, `accuracy`, `streak`, `bestStreak`, or `stars`.
  - No audio state control (`isMuted` / `toggleMute`).
- **Audio Implementation (Lines 6-45)**:
  - Uses inline Web Audio API synthesizers (`beep()`, `playSuccess()`, `playError()`, `playLessonComplete()`).
  - Does not check any mute setting before emitting sound.

### 1.3 `academyCurriculum.ts` (`src/data/academyCurriculum.ts`)
- **Data Model (Lines 1-12)**:
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
- Lacks a `category` property on `AcademyLesson`.

---

## 2. Logic Chain

1. **Category Navigation (R2 Requirement)**:
   - The user request specifies category filtering/tabs/accordion in `AcademyLayout.tsx` for categories: `"Foundations"`, `"Numbers & Punctuation"`, `"Developer Code"`, and `"Speed & Rhythm"`.
   - `AcademyLesson` interface in `academyCurriculum.ts` must include `category: LessonCategory`.
   - `AcademyLayout.tsx` requires category filter tab buttons or collapsible accordion sections in the sidebar, filtering lessons based on `activeCategory`.

2. **Real-Time Performance Engine (R3 Requirement)**:
   - `useAcademyEngine.ts` must track:
     - `startTime` (set when the first keystroke occurs).
     - `totalKeystrokes` (incremented on every key hit).
     - `correctHits` (incremented when `pressed === expected`).
     - `errorCount` (incremented when `pressed !== expected`).
     - `streak` (incremented on correct hit, reset to 0 on error).
     - `bestStreak` (tracks max streak achieved in lesson).
   - Dynamic Calculations:
     - `elapsedMinutes = (currentTime - startTime) / 60000`.
     - `wpm = elapsedMinutes > 0.01 ? Math.round((correctHits / 5) / elapsedMinutes) : 0`.
     - `accuracy = totalKeystrokes > 0 ? Math.round((correctHits / totalKeystrokes) * 100) : 100`.
     - `stars = accuracy >= 95 ? 3 : accuracy >= 85 ? 2 : 1`.

3. **Live Lesson Stats HUD (R3 Requirement)**:
   - A floating HUD component in `AcademyLayout.tsx` displaying real-time WPM, Accuracy %, and Streak during active typing.

4. **Crisp Keypress Audio Feedback Toggle (R3 Requirement)**:
   - Audio state `isMuted` and `toggleMute()` exposed from `useAcademyEngine.ts`.
   - Saved to `localStorage.getItem('typenova_academy_muted')`.
   - Audio trigger functions (`playSuccess`, `playError`, `playLessonComplete`) early-return if `isMuted` is true.
   - Header button in `AcademyLayout.tsx` toggles audio state with active icon (`Volume2` vs `VolumeX`).

5. **Rich Completion Modal (R3 Requirement)**:
   - Overlay modal rendered when `engine.lessonComplete` is true.
   - Displays:
     - 1-3 Stars animated rating based on accuracy.
     - Final WPM, Final Accuracy %, Best Streak, Error count.
     - Action buttons: "Retry Lesson", "Curriculum", and "Next Lesson →".

---

## 3. Caveats

- **Curriculum Synchronization**: `academyCurriculum.ts` is being expanded under requirement R1 by another agent. The `category` property must be present on all new and existing lessons for category filtering to function properly.
- **Audio Context Auto-play**: Web Audio API requires a user gesture to resume audio context in browsers. The existing `getCtx()` already handles `.resume()`, which works seamlessly once the user clicks to start or presses any key.
- **WPM Warm-up**: In the first 1-2 seconds of a lesson, WPM calculation can spike if calculated naively. Setting a minimum elapsed threshold (`elapsedMinutes > 0.01`) prevents infinity or zero division anomalies.

---

## 4. Conclusion & Detailed Implementation Blueprint

### 4.1 Step 1: Update `academyCurriculum.ts` Data Contract
Update `src/data/academyCurriculum.ts` to export `LessonCategory` and add `category` to `AcademyLesson`:
```ts
export type LessonCategory = 'Foundations' | 'Numbers & Punctuation' | 'Developer Code' | 'Speed & Rhythm';

export interface AcademyLesson {
  id: string;
  title: string;
  description: string;
  category: LessonCategory;
  steps: AcademyStep[];
}
```

### 4.2 Step 2: Extend `useAcademyEngine.ts` with Real-Time Metrics & Audio Toggle
Update `src/hooks/useAcademyEngine.ts`:

```ts
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
  // R3 Additions:
  wpm: number;
  accuracy: number;
  streak: number;
  bestStreak: number;
  totalKeystrokes: number;
  correctHits: number;
  errorCount: number;
  stars: number;
  isMuted: boolean;
  toggleMute: () => void;
  restartLesson: () => void;
  goToLesson: (idx: number) => void;
  nextLesson: () => void;
}
```

**Implementation in `useAcademyEngine`**:
```ts
// Audio mute state
const [isMuted, setIsMuted] = useState(() => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('typenova_academy_muted') === 'true';
  }
  return false;
});

const isMutedRef = useRef(isMuted);
isMutedRef.current = isMuted;

const toggleMute = useCallback(() => {
  setIsMuted(prev => {
    const next = !prev;
    if (typeof window !== 'undefined') {
      localStorage.setItem('typenova_academy_muted', String(next));
    }
    return next;
  });
}, []);

// Performance Counters
const [startTime, setStartTime] = useState<number | null>(null);
const [totalKeystrokes, setTotalKeystrokes] = useState(0);
const [correctHits, setCorrectHits] = useState(0);
const [errorCount, setErrorCount] = useState(0);
const [streak, setStreak] = useState(0);
const [bestStreak, setBestStreak] = useState(0);
const [wpm, setWpm] = useState(0);
const [accuracy, setAccuracy] = useState(100);

// Keydown Logic Update:
// On key press:
// 1. If startTime === null, setStartTime(Date.now()).
// 2. setTotalKeystrokes(k => k + 1)
// 3. If correct:
//    - setCorrectHits(c => c + 1)
//    - setStreak(s => { const ns = s + 1; setBestStreak(b => Math.max(b, ns)); return ns; })
//    - if (!isMutedRef.current) playSuccess();
// 4. If error:
//    - setErrorCount(e => e + 1)
//    - setStreak(0)
//    - if (!isMutedRef.current) playError();

// Live WPM & Accuracy timer effect:
useEffect(() => {
  if (!startTime || lessonComplete) return;
  const interval = setInterval(() => {
    const elapsedMinutes = (Date.now() - startTime) / 60000;
    if (elapsedMinutes > 0.01) {
      setWpm(Math.round((correctHits / 5) / elapsedMinutes));
    }
    if (totalKeystrokes > 0) {
      setAccuracy(Math.round((correctHits / totalKeystrokes) * 100));
    }
  }, 250);
  return () => clearInterval(interval);
}, [startTime, correctHits, totalKeystrokes, lessonComplete]);

// Stars Calculation:
const stars = accuracy >= 95 ? 3 : accuracy >= 85 ? 2 : 1;
```

### 4.3 Step 3: Implement Category Filters & Navigation in `AcademyLayout.tsx`
In `src/components/academy/AcademyLayout.tsx`:

1. **Category Filter Tabs State**:
```tsx
const CATEGORIES: { id: LessonCategory | 'All'; label: string }[] = [
  { id: 'All', label: 'All Lessons' },
  { id: 'Foundations', label: 'Foundations' },
  { id: 'Numbers & Punctuation', label: 'Numbers & Symbols' },
  { id: 'Developer Code', label: 'Developer Code' },
  { id: 'Speed & Rhythm', label: 'Speed & Rhythm' },
];

const [activeCategory, setActiveCategory] = useState<LessonCategory | 'All'>('All');
```

2. **Sidebar Category Filtering UI**:
Render category tab chips at top of sidebar, followed by filtered lesson items:
```tsx
const filteredLessons = LESSONS.map((lesson, globalIndex) => ({ lesson, globalIndex }))
  .filter(({ lesson }) => activeCategory === 'All' || lesson.category === activeCategory);
```

### 4.4 Step 4: Implement Live Stats HUD in `AcademyLayout.tsx`
Render live HUD above keyboard container during active lesson:
```tsx
{!engine.lessonComplete && !engine.allComplete && (
  <div className="flex items-center gap-6 mb-6 px-6 py-2.5 rounded-xl bg-cyan-950/30 border border-cyan-500/20 backdrop-blur-md">
    <div className="flex items-center gap-2">
      <Zap size={14} className="text-cyan-400" />
      <span className="text-[10px] font-bold tracking-wider text-cyan-400/70 uppercase">WPM</span>
      <span className="text-sm font-black text-white">{engine.wpm}</span>
    </div>
    <div className="w-[1px] h-4 bg-cyan-500/20" />
    <div className="flex items-center gap-2">
      <Target size={14} className="text-emerald-400" />
      <span className="text-[10px] font-bold tracking-wider text-emerald-400/70 uppercase">ACC</span>
      <span className="text-sm font-black text-white">{engine.accuracy}%</span>
    </div>
    <div className="w-[1px] h-4 bg-cyan-500/20" />
    <div className="flex items-center gap-2">
      <Flame size={14} className="text-amber-400" />
      <span className="text-[10px] font-bold tracking-wider text-amber-400/70 uppercase">STREAK</span>
      <span className="text-sm font-black text-amber-300">{engine.streak}</span>
    </div>
  </div>
)}
```

### 4.5 Step 5: Implement Keypress Audio Feedback Toggle
Add audio toggle button in header:
```tsx
<button
  onClick={engine.toggleMute}
  className="p-2 rounded-lg bg-white/5 border border-white/10 text-cyan-400 hover:bg-white/10 transition-all"
  title={engine.isMuted ? 'Unmute Audio' : 'Mute Audio'}
>
  {engine.isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
</button>
```

### 4.6 Step 6: Implement Completion Modal
Replace static inline completion block with a floating modal overlay:
```tsx
{engine.lessonComplete && !engine.allComplete && (
  <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
    <div className="relative w-full max-w-md p-8 rounded-2xl bg-[#090d20] border border-cyan-500/30 shadow-[0_0_50px_rgba(6,182,212,0.25)] flex flex-col items-center gap-6">
      
      {/* Trophy & Stars */}
      <div className="flex flex-col items-center gap-3">
        <Trophy size={48} className="text-cyan-400 drop-shadow-[0_0_20px_rgba(6,182,212,0.8)]" />
        <h2 className="text-xl font-bold tracking-widest uppercase text-white">Lesson Completed!</h2>
        
        {/* 1-3 Stars */}
        <div className="flex items-center gap-2 mt-1">
          {[1, 2, 3].map(starNum => (
            <Star
              key={starNum}
              size={28}
              className={starNum <= engine.stars ? 'text-amber-400 fill-amber-400 drop-shadow-[0_0_10px_rgba(245,158,11,0.8)]' : 'text-gray-600'}
            />
          ))}
        </div>
      </div>

      {/* Stats Summary Grid */}
      <div className="w-full grid grid-cols-3 gap-3 p-4 rounded-xl bg-white/[0.03] border border-white/10">
        <div className="flex flex-col items-center">
          <span className="text-[9px] font-bold text-cyan-400/60 uppercase">Speed</span>
          <span className="text-lg font-black text-white">{engine.wpm} <span className="text-[10px]">WPM</span></span>
        </div>
        <div className="flex flex-col items-center border-x border-white/10">
          <span className="text-[9px] font-bold text-emerald-400/60 uppercase">Accuracy</span>
          <span className="text-lg font-black text-white">{engine.accuracy}%</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-[9px] font-bold text-amber-400/60 uppercase">Max Streak</span>
          <span className="text-lg font-black text-white">{engine.bestStreak}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 w-full">
        <button
          onClick={engine.restartLesson}
          className="flex-1 py-2.5 rounded-xl border border-white/10 text-xs font-bold uppercase text-white/60 hover:bg-white/5"
        >
          Retry
        </button>
        <button
          onClick={engine.nextLesson}
          className="flex-1 py-2.5 rounded-xl bg-cyan-500/20 border border-cyan-400/50 text-xs font-bold uppercase text-cyan-300 hover:bg-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.3)]"
        >
          Next Lesson →
        </button>
      </div>

    </div>
  </div>
)}
```

---

## 5. Verification Method

To verify the implementation of R2 and R3 after implementer agents apply changes:

1. **TypeScript Type Check**:
   Run command: `npx tsc --noEmit`
   Verify 0 type errors across `AcademyLayout.tsx`, `useAcademyEngine.ts`, and `academyCurriculum.ts`.

2. **Vite Build Verification**:
   Run command: `npm run build`
   Verify build completes with exit code 0.

3. **Runtime & UI Functional Invalidation Conditions**:
   - Invalidation 1: Category filter tab fails to filter lessons in the sidebar.
   - Invalidation 2: Real-time WPM remains at 0 or Accuracy % fails to update when correct/incorrect keys are pressed.
   - Invalidation 3: Streak counter fails to increment on correct hit or fails to reset to 0 on mis-keypress.
   - Invalidation 4: Audio mute toggle fails to silence audio synthesized by `useAcademyEngine.ts`.
   - Invalidation 5: Completion modal fails to pop up or display stars upon reaching the final step of a lesson.
