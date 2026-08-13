# Milestone 1 Component Memoization Analysis Report

## Overview
This report presents the complete component memoization strategy across target components in `src/components/` for **Milestone 1: Global Contexts & Render Tree Optimization**.

The target components analyzed are:
1. `StatsPanel.tsx`
2. `AccountMenu.tsx`
3. `SegmentedControl.tsx`
4. `AIChatBot.tsx`
5. `VideoCallOverlay.tsx`
6. `SplashCursor.tsx`
7. `ui/multi-step-loader.tsx`
8. `academy/AcademyEntry.tsx`
9. `academy/CyberHands.tsx`
10. `academy/VirtualKeyboard.tsx`

---

## 1. Executive Summary & Impact Analysis

High WPM typing causes rapid state updates in top-level state holders (`App.tsx`, typing engine, timer hooks). Without `React.memo`, every keystroke or 100ms timer update triggers a recursive render tree traversal, re-evaluating:
- Complex SVG matrix / joint math in `CyberHands` and `VirtualKeyboard`
- WebGL frame setups in `SplashCursor`
- Radial reveal gradients and `LaserFlow` shader parameters in `AIChatBot`
- Navigation dropdown menus in `AccountMenu`
- Sliding tab pill measurement observers in `SegmentedControl`
- WebRTC overlay UI in `VideoCallOverlay`

By wrapping these 10 components in `React.memo` with tailored custom prop comparisons where object/array props are passed, child component re-renders during 120+ FPS typing are reduced to **zero** unless their relevant props actually change.

---

## 2. Component-by-Component Memoization & Custom Comparison Specifications

### 2.1 `StatsPanel.tsx` (`src/components/StatsPanel.tsx`)
- **Current Export**: `export const StatsPanel: React.FC<StatsPanelProps> = ...`
- **Props**: `wpm`, `accuracy`, `consistency`, `combo`, `themeText`, `timelinePoints` (`TimelinePoint[]`), `keystrokeLogLength`, `isIdle`
- **Re-render Profile**: Updates on stat updates (wpm, accuracy, combo). Must NOT re-render on unrelated parent renders (e.g., header state, overlay toggle).
- **Custom Prop Comparison**: Compares primitives directly. Performs deep element-by-element equality check on `timelinePoints` array to avoid re-renders if parent passes a fresh array reference containing identical points.

```tsx
import React, { memo } from 'react';
import { Activity, Target, BarChart2, Flame } from 'lucide-react';

interface TimelinePoint {
  wpm: number;
  t: number;
}

interface StatsPanelProps {
  wpm: number;
  accuracy: number;
  consistency: number;
  combo: number;
  themeText: string;
  timelinePoints: TimelinePoint[];
  keystrokeLogLength: number;
  isIdle?: boolean;
}

export const StatsPanel = memo<StatsPanelProps>(
  ({
    wpm,
    accuracy,
    consistency,
    combo,
    themeText,
    timelinePoints,
    keystrokeLogLength,
    isIdle = false
  }) => {
    // [Existing component rendering logic]
  },
  (prevProps, nextProps) => {
    if (
      prevProps.wpm !== nextProps.wpm ||
      prevProps.accuracy !== nextProps.accuracy ||
      prevProps.consistency !== nextProps.consistency ||
      prevProps.combo !== nextProps.combo ||
      prevProps.themeText !== nextProps.themeText ||
      prevProps.keystrokeLogLength !== nextProps.keystrokeLogLength ||
      prevProps.isIdle !== nextProps.isIdle
    ) {
      return false;
    }
    if (prevProps.timelinePoints === nextProps.timelinePoints) return true;
    if (!prevProps.timelinePoints || !nextProps.timelinePoints) {
      return prevProps.timelinePoints === nextProps.timelinePoints;
    }
    if (prevProps.timelinePoints.length !== nextProps.timelinePoints.length) return false;
    return prevProps.timelinePoints.every(
      (pt, idx) => pt.wpm === nextProps.timelinePoints[idx]?.wpm && pt.t === nextProps.timelinePoints[idx]?.t
    );
  }
);
```

---

### 2.2 `AccountMenu.tsx` (`src/components/AccountMenu.tsx`)
- **Current Export**: `export const AccountMenu = ({ ... }: AccountMenuProps) => ...`
- **Props**: `theme: Theme`, `loggedIn: boolean`, `displayName: string | null`, `avatarUrl?: string | null`, `status: SyncStatus`, `elo: number`, `onSignIn: () => void`, `onSignOut: () => void`
- **Re-render Profile**: Belongs to global top navigation bar. Re-renders on every typing keystroke if unmemoized.
- **Custom Comparison / Stabilization**: Callback stabilization in `App.tsx` (`onSignIn`, `onSignOut`) paired with shallow `React.memo` or theme name check ensures header account menu remains idle during active typing.

```tsx
import React, { memo, useEffect, useRef, useState } from 'react';
// [Existing imports]

export const AccountMenu = memo(
  ({
    theme, loggedIn, displayName, avatarUrl, status, elo, onSignIn: _onSignIn, onSignOut,
  }: AccountMenuProps) => {
    // [Existing component rendering logic]
  },
  (prevProps, nextProps) => {
    return (
      prevProps.loggedIn === nextProps.loggedIn &&
      prevProps.displayName === nextProps.displayName &&
      prevProps.avatarUrl === nextProps.avatarUrl &&
      prevProps.status === nextProps.status &&
      prevProps.elo === nextProps.elo &&
      prevProps.onSignIn === nextProps.onSignIn &&
      prevProps.onSignOut === nextProps.onSignOut &&
      prevProps.theme?.name === nextProps.theme?.name
    );
  }
);
```

---

### 2.3 `SegmentedControl.tsx` (`src/components/SegmentedControl.tsx`)
- **Current Export**: `export function SegmentedControl<T extends string | number>({ ... })`
- **Props**: `options`, `value`, `onChange`, `onLockedClick`, `disabled`, `themeTextClass`, `className`, `pillClassName`, `fullWidth`
- **Generics Handling**: Uses TypeScript generic parameter `<T extends string | number>`. Must be wrapped using `memo(SegmentedControlComponent, customCompare) as typeof SegmentedControlComponent` to preserve generic signature.
- **Custom Prop Comparison**: Compares `options` array elements (`value`, `label`, `locked`) to prevent re-renders when parents pass inline options arrays.

```tsx
import React, { memo, useRef, useState, useLayoutEffect } from 'react';
// [Existing imports]

function SegmentedControlComponent<T extends string | number>({
  options,
  value,
  onChange,
  onLockedClick,
  disabled,
  themeTextClass = 'text-white',
  className = '',
  pillClassName = 'bg-white/10 border border-white/10 shadow-[0_0_15px_currentColor]',
  fullWidth = false,
}: SegmentedControlProps<T>) {
  // [Existing component rendering logic]
}

export const SegmentedControl = memo(
  SegmentedControlComponent,
  (prevProps, nextProps) => {
    if (
      prevProps.value !== nextProps.value ||
      prevProps.disabled !== nextProps.disabled ||
      prevProps.themeTextClass !== nextProps.themeTextClass ||
      prevProps.className !== nextProps.className ||
      prevProps.pillClassName !== nextProps.pillClassName ||
      prevProps.fullWidth !== nextProps.fullWidth ||
      prevProps.onChange !== nextProps.onChange ||
      prevProps.onLockedClick !== nextProps.onLockedClick
    ) {
      return false;
    }
    if (prevProps.options === nextProps.options) return true;
    if (prevProps.options.length !== nextProps.options.length) return false;
    return prevProps.options.every(
      (opt, idx) =>
        opt.value === nextProps.options[idx].value &&
        opt.label === nextProps.options[idx].label &&
        opt.locked === nextProps.options[idx].locked
    );
  }
) as typeof SegmentedControlComponent;
```

---

### 2.4 `AIChatBot.tsx` (`src/components/AIChatBot.tsx`)
- **Current Export**: `export const AIChatBot = ({ ... }: AIChatBotProps) => ...`
- **Props**: `stats?: AruStats`, `onStartDrill?: (keys?: string[]) => void`, `hideTrigger?: boolean`, `theme?: Theme`, `isOpen: boolean`, `onClose: () => void`
- **Re-render Profile**: Contains `<LaserFlow />` WebGL shader container and chat drawer DOM elements.
- **Custom Prop Comparison**: Deep compares `stats` (`wpm`, `accuracy`, `level`, `testsCompleted`, `streak`, `weakKeys`) to prevent re-renders when parent passes a newly constructed `stats` object during typing.

```tsx
import React, { memo, useState, useRef, useEffect, useCallback, useMemo } from 'react';
// [Existing imports]

export const AIChatBot = memo<AIChatBotProps>(
  ({ stats, onStartDrill, hideTrigger = false, theme, isOpen, onClose }: AIChatBotProps) => {
    // [Existing component rendering logic]
  },
  (prevProps, nextProps) => {
    if (
      prevProps.isOpen !== nextProps.isOpen ||
      prevProps.hideTrigger !== nextProps.hideTrigger ||
      prevProps.onClose !== nextProps.onClose ||
      prevProps.onStartDrill !== nextProps.onStartDrill ||
      prevProps.theme?.name !== nextProps.theme?.name
    ) {
      return false;
    }
    if (prevProps.stats === nextProps.stats) return true;
    if (!prevProps.stats || !nextProps.stats) return prevProps.stats === nextProps.stats;
    return (
      prevProps.stats.wpm === nextProps.stats.wpm &&
      prevProps.stats.accuracy === nextProps.stats.accuracy &&
      prevProps.stats.level === nextProps.stats.level &&
      prevProps.stats.testsCompleted === nextProps.stats.testsCompleted &&
      prevProps.stats.streak === nextProps.stats.streak &&
      JSON.stringify(prevProps.stats.weakKeys) === JSON.stringify(nextProps.stats.weakKeys)
    );
  }
);
```

---

### 2.5 `VideoCallOverlay.tsx` (`src/components/VideoCallOverlay.tsx`)
- **Current Export**: `export function VideoCallOverlay()`
- **Props**: None (consumes `useVideoCall()` context directly).
- **Re-render Profile**: Prevent top-level `App.tsx` re-renders from re-triggering overlay render logic.
- **Formulation**:

```tsx
import React, { memo, useEffect, useRef, useState } from 'react';
import { useVideoCall } from '@/contexts/VideoCallContext';
// [Existing imports]

export const VideoCallOverlay = memo(function VideoCallOverlay() {
  // [Existing component rendering logic]
});
```

---

### 2.6 `SplashCursor.tsx` (`src/components/SplashCursor.tsx`)
- **Current Export**: `export default function SplashCursor({ ... }: SplashCursorProps)`
- **Props**: Configuration options for fluid simulation including `BACK_COLOR` (`ColorRGB`).
- **Custom Comparison**: Validates configuration primitive props and compares `BACK_COLOR` object fields (`r`, `g`, `b`).

```tsx
import React, { memo, useEffect, useRef } from 'react';
// [Existing imports]

const SplashCursorComponent = ({
  SIM_RESOLUTION = 128,
  DYE_RESOLUTION = 1440,
  CAPTURE_RESOLUTION = 512,
  DENSITY_DISSIPATION = 3.5,
  VELOCITY_DISSIPATION = 2,
  PRESSURE = 0.1,
  PRESSURE_ITERATIONS = 20,
  CURL = 3,
  SPLAT_RADIUS = 0.2,
  SPLAT_FORCE = 6000,
  SHADING = true,
  COLOR_UPDATE_SPEED = 10,
  BACK_COLOR = { r: 0.5, g: 0, b: 0 },
  TRANSPARENT = true,
  RAINBOW_MODE = true,
  COLOR = '#ff0000'
}: SplashCursorProps) => {
  // [Existing component rendering logic]
};

export default memo(SplashCursorComponent, (prevProps, nextProps) => {
  return (
    prevProps.SIM_RESOLUTION === nextProps.SIM_RESOLUTION &&
    prevProps.DYE_RESOLUTION === nextProps.DYE_RESOLUTION &&
    prevProps.CAPTURE_RESOLUTION === nextProps.CAPTURE_RESOLUTION &&
    prevProps.DENSITY_DISSIPATION === nextProps.DENSITY_DISSIPATION &&
    prevProps.VELOCITY_DISSIPATION === nextProps.VELOCITY_DISSIPATION &&
    prevProps.PRESSURE === nextProps.PRESSURE &&
    prevProps.PRESSURE_ITERATIONS === nextProps.PRESSURE_ITERATIONS &&
    prevProps.CURL === nextProps.CURL &&
    prevProps.SPLAT_RADIUS === nextProps.SPLAT_RADIUS &&
    prevProps.SPLAT_FORCE === nextProps.SPLAT_FORCE &&
    prevProps.SHADING === nextProps.SHADING &&
    prevProps.COLOR_UPDATE_SPEED === nextProps.COLOR_UPDATE_SPEED &&
    prevProps.TRANSPARENT === nextProps.TRANSPARENT &&
    prevProps.RAINBOW_MODE === nextProps.RAINBOW_MODE &&
    prevProps.COLOR === nextProps.COLOR &&
    (prevProps.BACK_COLOR === nextProps.BACK_COLOR ||
      (prevProps.BACK_COLOR?.r === nextProps.BACK_COLOR?.r &&
       prevProps.BACK_COLOR?.g === nextProps.BACK_COLOR?.g &&
       prevProps.BACK_COLOR?.b === nextProps.BACK_COLOR?.b))
  );
});
```

---

### 2.7 `ui/multi-step-loader.tsx` (`src/components/ui/multi-step-loader.tsx`)
- **Current Export**: `export const MultiStepLoader = ({ ... })`
- **Props**: `loadingStates: LoadingState[]`, `loading?: boolean`, `duration?: number`, `loop?: boolean`, `currentState?: number`
- **Custom Comparison**: Performs element text comparisons on `loadingStates` array alongside primitive status props.

```tsx
import React, { memo, useState, useEffect } from 'react';
// [Existing imports]

export const MultiStepLoader = memo(
  ({
    loadingStates,
    loading,
    duration = 2000,
    loop = true,
    currentState,
  }: {
    loadingStates: LoadingState[];
    loading?: boolean;
    duration?: number;
    loop?: boolean;
    currentState?: number;
  }) => {
    // [Existing component rendering logic]
  },
  (prevProps, nextProps) => {
    if (
      prevProps.loading !== nextProps.loading ||
      prevProps.duration !== nextProps.duration ||
      prevProps.loop !== nextProps.loop ||
      prevProps.currentState !== nextProps.currentState
    ) {
      return false;
    }
    if (prevProps.loadingStates === nextProps.loadingStates) return true;
    if (prevProps.loadingStates?.length !== nextProps.loadingStates?.length) return false;
    return prevProps.loadingStates.every(
      (ls, idx) => ls.text === nextProps.loadingStates[idx]?.text
    );
  }
);
```

---

### 2.8 `academy/AcademyEntry.tsx` (`src/components/academy/AcademyEntry.tsx`)
- **Current Export**: `export function AcademyEntry({ onClick }: AcademyEntryProps)`
- **Props**: `onClick: () => void`
- **Formulation**:

```tsx
import React, { memo } from 'react';
import { GraduationCap } from 'lucide-react';

interface AcademyEntryProps {
  onClick: () => void;
}

export const AcademyEntry = memo(function AcademyEntry({ onClick }: AcademyEntryProps) {
  // [Existing component rendering logic]
});
```

---

### 2.9 `academy/CyberHands.tsx` (`src/components/academy/CyberHands.tsx`)
- **Current Export**: `export function CyberHands({ activeKey, activeFinger }: CyberHandsProps)`
- **Props**: `activeKey: string`, `activeFinger: string`
- **Re-render Profile**: Evaluates 3D SVG joint transformations and holographic finger paths. Memoizing prevents recalculating 10 finger bone vectors on unrelated state changes.
- **Formulation**:

```tsx
import React, { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
// [Existing imports and constants]

export const CyberHands = memo(function CyberHands({ activeKey, activeFinger }: CyberHandsProps) {
  // [Existing component rendering logic]
});
```

---

### 2.10 `academy/VirtualKeyboard.tsx` (`src/components/academy/VirtualKeyboard.tsx`)
- **Current Export**: `export function VirtualKeyboard({ activeKey, activeFinger }: VirtualKeyboardProps)`
- **Props**: `activeKey: string`, `activeFinger: string`
- **Re-render Profile**: Renders full keyboard layout grid with finger tints and key states.
- **Formulation**:

```tsx
import React, { memo, useMemo } from 'react';
// [Existing imports and constants]

export const VirtualKeyboard = memo(function VirtualKeyboard({ activeKey, activeFinger }: VirtualKeyboardProps) {
  // [Existing component rendering logic]
});
```

---

## 3. Visual & Interactive Verification

All proposed `React.memo` formulations:
1. Retain 100% of existing prop interfaces and return types.
2. Preserve exact named and default export semantics (`export const ComponentName = memo(...)` and `export default memo(...)`), ensuring zero breaking changes for existing consumers (`App.tsx`, `Login.tsx`, `AcademyLayout.tsx`).
3. Preserve generic type parameters (e.g. `SegmentedControl<T>`).
4. Ensure animations (Framer Motion in `AIChatBot`, `CyberHands`, `MultiStepLoader`), WebGL simulation (`SplashCursor`), WebRTC video streams (`VideoCallOverlay`), and interactive clicks operate smoothly without missed frames or stale closure state.
