import { useEffect } from 'react';

export const useGlassPointer = () => {
  useEffect(() => {
    // Feature detect SVG backdrop-filter support.
    // Chromium currently supports it, Safari/Firefox may struggle with complex URL filters on backdrops.
    // We'll apply the svg-backdrop class so Tier-3 glass activates only when supported.
    const isChromium = !!(window as unknown as { chrome?: unknown }).chrome;
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    
    if (isChromium && !isSafari) {
      document.documentElement.classList.add('svg-backdrop');
    }

    return () => {
      document.documentElement.classList.remove('svg-backdrop');
    };
  }, []);
};
