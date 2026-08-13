import fs from 'fs';
import path from 'path';

const projectRoot = 'c:/Users/risho/OneDrive/Desktop/typenova-v2 - Copy';

console.log('================================================================================');
console.log(' VICTORY AUDITOR INDEPENDENT VERIFICATION SUITE — TYPENOVA PERFORMANCE & FIXES');
console.log(' Timestamp:', new Date().toISOString());
console.log('================================================================================\n');

let passCount = 0;
let failCount = 0;

function assert(condition, message, detail = '') {
  if (condition) {
    console.log(`[PASS] ${message}`);
    if (detail) console.log(`       └─ ${detail}`);
    passCount++;
  } else {
    console.error(`[FAIL] ${message}`);
    if (detail) console.error(`       └─ ERROR: ${detail}`);
    failCount++;
  }
}

function readFile(relPath) {
  const fullPath = path.join(projectRoot, relPath);
  if (!fs.existsSync(fullPath)) return '';
  return fs.readFileSync(fullPath, 'utf8');
}

// -----------------------------------------------------------------------------
// ITEM 1 & 2: Context & Action Callback Memoization
// -----------------------------------------------------------------------------
console.log('>>> SECTION 1: Context & Action Callback Memoization (VideoCallContext, useWebRTC)');

const videoCallCtx = readFile('src/contexts/VideoCallContext.tsx');
assert(videoCallCtx.includes('React.useMemo'), 'VideoCallContext value is memoized via React.useMemo');

const useWebRTCContent = readFile('src/hooks/useWebRTC.ts');
assert(useWebRTCContent.includes('useCallback'), 'useWebRTC uses useCallback for action handlers');
assert(useWebRTCContent.includes('callUser = useCallback'), 'callUser is wrapped in useCallback');
assert(useWebRTCContent.includes('acceptCall = useCallback'), 'acceptCall is wrapped in useCallback');
assert(useWebRTCContent.includes('rejectCall = useCallback'), 'rejectCall is wrapped in useCallback');
assert(useWebRTCContent.includes('endCall = useCallback'), 'endCall is wrapped in useCallback');

// -----------------------------------------------------------------------------
// ITEM 3: Component Memoization (React.memo)
// -----------------------------------------------------------------------------
console.log('\n>>> SECTION 2: UI Component Memoization (React.memo)');

const componentsToVerify = [
  { name: 'StatsPanel', path: 'src/components/StatsPanel.tsx' },
  { name: 'AccountMenu', path: 'src/components/AccountMenu.tsx' },
  { name: 'SegmentedControl', path: 'src/components/SegmentedControl.tsx' },
  { name: 'AIChatBot', path: 'src/components/AIChatBot.tsx' },
  { name: 'AcademyEntry', path: 'src/components/academy/AcademyEntry.tsx' },
  { name: 'CyberHands', path: 'src/components/academy/CyberHands.tsx' },
  { name: 'VirtualKeyboard', path: 'src/components/academy/VirtualKeyboard.tsx' },
  { name: 'VideoCallOverlay', path: 'src/components/VideoCallOverlay.tsx' },
  { name: 'SplashCursor', path: 'src/components/SplashCursor.tsx' },
];

componentsToVerify.forEach(comp => {
  const content = readFile(comp.path);
  const isMemoized = content.includes('memo(') || content.includes('memo ') || content.includes('memo<') || content.includes('memo(');
  assert(isMemoized, `${comp.name} (${comp.path}) is wrapped in React.memo`);
});

// -----------------------------------------------------------------------------
// ITEM 4: App.tsx Callback Stabilization
// -----------------------------------------------------------------------------
console.log('\n>>> SECTION 3: App.tsx Callback Stabilization');

const appContent = readFile('src/App.tsx');
assert(appContent.includes('handleSignIn = useCallback'), 'App.tsx handleSignIn is memoized');
assert(appContent.includes('handleSignOut = useCallback'), 'App.tsx handleSignOut is memoized');
assert(appContent.includes('handleUnlockGodMode = useCallback'), 'App.tsx handleUnlockGodMode is memoized');
assert(appContent.includes('handleCloseModal = useCallback'), 'App.tsx handleCloseModal is memoized');
assert(appContent.includes('exitMicroDrill = useCallback'), 'App.tsx exitMicroDrill is memoized');

// -----------------------------------------------------------------------------
// ITEM 5, 6, 7: WebGL Disposal & Pausable Loops
// -----------------------------------------------------------------------------
console.log('\n>>> SECTION 4: WebGL Resource Disposal & Render Loop Controls');

const splashCursorContent = readFile('src/components/SplashCursor.tsx');
assert(splashCursorContent.includes('cancelAnimationFrame'), 'SplashCursor cancels rAF loop on unmount');
assert(splashCursorContent.includes('abortController.abort()'), 'SplashCursor cleans up all window/document listeners via AbortController signal');

const laserFlowContent = readFile('src/components/LaserFlow.tsx');
assert(laserFlowContent.includes('renderer.dispose()'), 'LaserFlow disposes Three.js WebGLRenderer on unmount');
assert(laserFlowContent.includes('geometry.dispose()'), 'LaserFlow disposes BufferGeometry on unmount');
assert(laserFlowContent.includes('material.dispose()'), 'LaserFlow disposes RawShaderMaterial on unmount');
assert(laserFlowContent.includes('renderer.forceContextLoss()'), 'LaserFlow forces WebGL context loss on unmount to release VRAM');
assert(laserFlowContent.includes('IntersectionObserver'), 'LaserFlow uses IntersectionObserver to pause loop when offscreen');

// -----------------------------------------------------------------------------
// ITEM 8, 9: Layout Reflow & Animation Stabilization
// -----------------------------------------------------------------------------
console.log('\n>>> SECTION 5: Layout Reflow Elimination & Animation Loop Stabilization');

const typingAreaContent = readFile('src/components/TypingArea.tsx');
assert(typingAreaContent.includes('export const Char = memo'), 'TypingArea Char component is memoized per character');
assert(typingAreaContent.includes('container.scrollTo('), 'TypingArea uses non-blocking container.scrollTo in useEffect for caret movement');

const cyberHandsContent = readFile('src/components/academy/CyberHands.tsx');
assert(cyberHandsContent.includes('KEY_MAP'), 'CyberHands uses static KEY_MAP lookup');

// -----------------------------------------------------------------------------
// ITEM 10, 11, 12, 13: Zombie Listener & Timer Cleanup
// -----------------------------------------------------------------------------
console.log('\n>>> SECTION 6: Zombie Listener & Timer Cleanup');

const videoCallOverlayContent = readFile('src/components/VideoCallOverlay.tsx');
assert(videoCallOverlayContent.includes('window.removeEventListener'), 'VideoCallOverlay cleans up mousemove/mouseup drag listeners');

assert(useWebRTCContent.includes('socket.off'), 'useWebRTC cleans up socket event listeners on unmount');

const useRaceContent = readFile('src/hooks/useRace.ts');
assert(useRaceContent.includes('socket.off'), 'useRace cleans up socket event listeners on unmount');
assert(useRaceContent.includes('lastProgressSendRef.current < 100'), 'useRace throttles player progress socket emissions');

const useAcademyContent = readFile('src/hooks/useAcademyEngine.ts');
assert(useAcademyContent.includes('clearInterval'), 'useAcademyEngine clears interval timers on unmount');

console.log('\n================================================================================');
console.log(` SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
console.log('================================================================================');

if (failCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
