import { useEffect } from 'react';

let glassPointerRefCount = 0;

export const useGlassPointer = () => {
  useEffect(() => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return;

    // Feature detect SVG backdrop-filter support.
    // Chromium currently supports it, Safari/Firefox may struggle with complex URL filters on backdrops.
    // We'll apply the svg-backdrop class so Tier-3 glass activates only when supported.
    const isChromium = !!(window as unknown as { chrome?: unknown }).chrome;
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    
    if (isChromium && !isSafari) {
      if (glassPointerRefCount === 0) {
        document.documentElement.classList.add('svg-backdrop');
      }
      glassPointerRefCount++;
    }

    return () => {
      if (isChromium && !isSafari) {
        glassPointerRefCount--;
        if (glassPointerRefCount <= 0) {
          document.documentElement.classList.remove('svg-backdrop');
          glassPointerRefCount = 0;
        }
      }
    };
  }, []);
};
