import { useEffect } from 'react';

export const useGlassPointer = () => {
  useEffect(() => {
    // Feature detect SVG backdrop-filter support.
    // Chromium currently supports it, Safari/Firefox may struggle with complex URL filters on backdrops.
    // We'll apply the svg-backdrop class so Tier-3 glass activates only when supported.
    const isChromium = !!(window as any).chrome;
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    
    if (isChromium && !isSafari) {
      document.documentElement.classList.add('svg-backdrop');
    }

    // Tier 4: Pointer-tracked specular highlight
    const handleMouseMove = (e: MouseEvent) => {
      // Find all active glass panels
      const panels = document.querySelectorAll('.glass-panel');
      
      panels.forEach((panel) => {
        const el = panel as HTMLElement;
        const rect = el.getBoundingClientRect();
        
        // Calculate pointer position relative to the element's bounding box
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Set variables for the CSS to pick up
        el.style.setProperty('--mx', `${x}px`);
        el.style.setProperty('--my', `${y}px`);
      });
    };

    // Attach to window so we track even when hovering between panels
    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    return () => {
      document.documentElement.classList.remove('svg-backdrop');
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);
};
