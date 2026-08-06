# Handoff Report: R2 (BUG-23) Inline Callback Memoization in `App.tsx`

## 1. Observation

### Observation 1.1: `StatsDashboard` Call Site & Props in `src/App.tsx`
In `src/App.tsx` (lines 1656–1669):
```tsx
1656:            case 'stats': return (
1657:              <StatsDashboard
1658:                theme={theme}
1659:                testsCompleted={rpg.testsCompleted}
1660:                heatmapData={rpg.heatmapData}
1661:                onClose={() => setActiveModal(null)}
1662:                onStartWeaknessDrill={(drillText) => {
1663:                  typing.setTargetText(drillText);
1664:                  setActiveModal(null);
1665:                  typing.resetEngine();
1666:                  toast.success("Weakness Drill Generated! Focus on red problem keys.", { icon: "🎯" });
1667:                }}
1668:              />
1669:            );
```
- Line 1661 passes an inline function `() => setActiveModal(null)` to `onClose`.
- Lines 1662–1667 pass an inline function `(drillText) => { ... }` to `onStartWeaknessDrill`.

### Observation 1.2: `StatsDashboard` Component Definition
In `src/components/StatsDashboard.tsx` (line 227):
```tsx
export const StatsDashboard = memo(({ theme, testsCompleted, heatmapData, onClose, onStartWeaknessDrill }: StatsDashboardProps) => {
```
- `StatsDashboard` is wrapped in `React.memo` (`memo(...)`).

### Observation 1.3: `ChangelogModal` Call Site & Component Definition
In `src/App.tsx` (lines 1715–1720):
```tsx
1715:            case 'changelog': return (
1716:              <ChangelogModal
1717:                theme={theme}
1718:                onClose={handleCloseModal}
1719:              />
1720:            );
```
- In `src/App.tsx` line 900: `const handleCloseModal = useCallback(() => setActiveModal(null), []);`.
- `onClose` on `ChangelogModal` is ALREADY using `handleCloseModal`.
In `src/components/ChangelogModal.tsx` (line 24):
```tsx
export function ChangelogModal({ theme, onClose }: ChangelogModalProps) {
```
- `ChangelogModal` is NOT currently wrapped in `React.memo`.

### Observation 1.4: Captured Variables in `onStartWeaknessDrill`
In `src/App.tsx`:
- `typing` is initialized via `const typing = useTypingEngine();` (line 224).
- `typing.setTargetText` comes from `const [targetText, setTargetText] = useState('')` in `useTypingEngine.ts` (line 33). State setters are identity-stable across renders.
- `typing.resetEngine` is defined as `const resetEngine = useCallback(...)` in `useTypingEngine.ts` (line 243). `useCallback` identity is stable across renders.
- `setActiveModal` comes from `useState<ModalType>(null)` in `App.tsx`. Identity-stable across renders.
- `toast` is imported static module from `'react-hot-toast'`.

---

## 2. Logic Chain

1. **Premise 1 (Obs 1.2)**: `StatsDashboard` is wrapped in `React.memo`, meaning React will skip re-rendering `StatsDashboard` when its parent component (`App`) re-renders, provided ALL props passed to `StatsDashboard` pass shallow equality comparison (`prevProps === nextProps`).
2. **Premise 2 (Obs 1.1)**: On every render of `App`, lines 1661 and 1662 instantiate new function objects for `onClose` and `onStartWeaknessDrill`.
3. **Step 1**: Because inline functions create new references on every render (`() => {} !== () => {}`), shallow equality comparison for `onClose` and `onStartWeaknessDrill` evaluates to `false` every time `App` re-renders.
4. **Step 2**: Consequently, `React.memo` optimization on `StatsDashboard` is completely invalidated, causing `StatsDashboard` to re-render needlessly whenever `App` re-renders (e.g. during typing ticks, timer updates, live stats calculations).
5. **Premise 3 (Obs 1.4)**: `typing.setTargetText`, `typing.resetEngine`, and `setActiveModal` captured inside `onStartWeaknessDrill` are all identity-stable across renders.
6. **Step 3**: `onClose` on `StatsDashboard` can reuse the existing `handleCloseModal` (`useCallback(() => setActiveModal(null), [])` at Line 900 of `src/App.tsx`).
7. **Step 4**: `onStartWeaknessDrill` can be wrapped in `useCallback` as `handleStartWeaknessDrill` in `src/App.tsx` with dependency array `[typing.setTargetText, typing.resetEngine]`.
8. **Step 5 (Obs 1.3)**: `ChangelogModal` already receives `onClose={handleCloseModal}`, but wrapping `ChangelogModal` in `React.memo` inside `src/components/ChangelogModal.tsx` ensures that receiving a stable callback reference actually prevents unnecessary re-renders when parent `App` re-renders.

---

## 3. Caveats

- `typing` object reference returned by `useTypingEngine()` changes on renders where state inside `useTypingEngine` changes. Therefore, specifying `[typing.setTargetText, typing.resetEngine]` (the specific stable properties) as dependencies rather than `[typing]` ensures maximum stability.
- No other caveats.

---

## 4. Conclusion

To fix BUG-23 (Inline Callback Memoization for `StatsDashboard` and `ChangelogModal`):

1. **In `src/App.tsx` under `// ====== MEMOIZED HANDLERS FOR MODALS ======` (Line 900)**:
   Add `handleStartWeaknessDrill`:
   ```tsx
   const handleStartWeaknessDrill = useCallback((drillText: string) => {
     typing.setTargetText(drillText);
     setActiveModal(null);
     typing.resetEngine();
     toast.success("Weakness Drill Generated! Focus on red problem keys.", { icon: "🎯" });
   }, [typing.setTargetText, typing.resetEngine]);
   ```

2. **In `src/App.tsx` at `StatsDashboard` render site (Lines 1656–1669)**:
   Update props to use memoized callbacks:
   ```tsx
   case 'stats': return (
     <StatsDashboard
       theme={theme}
       testsCompleted={rpg.testsCompleted}
       heatmapData={rpg.heatmapData}
       onClose={handleCloseModal}
       onStartWeaknessDrill={handleStartWeaknessDrill}
     />
   );
   ```

3. **In `src/components/ChangelogModal.tsx` (Line 24)**:
   Wrap `ChangelogModal` export in `React.memo`:
   ```tsx
   export const ChangelogModal = memo(function ChangelogModal({ theme, onClose }: ChangelogModalProps) { ... });
   ```

---

## 5. Verification Method

### 5.1 Static Verification (TypeScript Compiler)
Run `npx tsc --noEmit` from workspace root:
```powershell
npx tsc --noEmit
```
Expected output: 0 errors.

### 5.2 Code Audit Verification
Inspect `src/App.tsx` around line 1657–1668:
- Confirm `onClose` receives `handleCloseModal`.
- Confirm `onStartWeaknessDrill` receives `handleStartWeaknessDrill`.
- Confirm no inline arrow functions are passed directly in JSX props to `StatsDashboard` or `ChangelogModal`.

### 5.3 Invalidation Conditions
- If new props or callbacks are added to `StatsDashboard` or `ChangelogModal` in the future without `useCallback` or `React.memo`, memoization will be broken.
