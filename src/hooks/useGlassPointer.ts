import { useEffect } from 'react';

// Drives the pointer-tracked specular highlight used by .glass-panel (see
// src/index.css) via --mx/--my custom properties, set per element relative
// to that element's own bounding box. Desktop-class pointers only, gated to
// match the (hover: hover) and (pointer: fine) media query in the CSS.
export function useGlassPointer() {
  useEffect(() => {
    // Gate the Tier-3 SVG refraction (see .svg-backdrop in src/index.css).
    // @supports can't be trusted here: it only checks that the value PARSES,
    // and engines that parse-but-don't-render url() through backdrop-filter
    // would silently lose all frost. Chromium ('chrome' in window covers
    // Chrome/Edge/Opera) is currently the only engine that renders it; the
    // CSS.supports check stays as belt-and-suspenders.
    if ('chrome' in window && CSS.supports('backdrop-filter', 'url(#glass-distortion)')) {
      document.documentElement.classList.add('svg-backdrop');
    }

    const mq = window.matchMedia('(hover: hover) and (pointer: fine)');
    if (!mq.matches) return;

    let rafId = 0;
    let clientX = 0;
    let clientY = 0;

    const apply = () => {
      rafId = 0;
      document.querySelectorAll<HTMLElement>('.glass-panel').forEach(el => {
        const rect = el.getBoundingClientRect();
        el.style.setProperty('--mx', `${clientX - rect.left}px`);
        el.style.setProperty('--my', `${clientY - rect.top}px`);
      });
    };

    const handlePointerMove = (e: PointerEvent) => {
      clientX = e.clientX;
      clientY = e.clientY;
      if (!rafId) rafId = requestAnimationFrame(apply);
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);
}
