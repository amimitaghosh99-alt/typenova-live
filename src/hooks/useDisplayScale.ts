import { useState, useEffect, useCallback, useMemo } from 'react';

export const DISPLAY_SCALE_STORAGE_KEY = 'typenova_display_scale';
export const DISPLAY_SCALE_PRESETS = [80, 90, 100, 110, 125, 140] as const;
export const MIN_DISPLAY_SCALE = 70;
export const MAX_DISPLAY_SCALE = 150;
export const DEFAULT_DISPLAY_SCALE = 100;

export interface DisplayScaleConfig {
  scale: number; // e.g. 100 for 100%
  counteractDpi: boolean; // if true, compensates for OS/browser devicePixelRatio
}

/**
 * Clamp scale value within [MIN_DISPLAY_SCALE, MAX_DISPLAY_SCALE].
 */
export function clampDisplayScale(val: number): number {
  if (typeof val !== 'number' || Number.isNaN(val)) return DEFAULT_DISPLAY_SCALE;
  return Math.min(MAX_DISPLAY_SCALE, Math.max(MIN_DISPLAY_SCALE, Math.round(val)));
}

/**
 * Calculate the effective zoom ratio (decimal) applied to CSS `zoom`.
 * For example:
 * - 100% scale with normal 1.0 DPR -> 1.00
 * - 125% scale with normal 1.0 DPR -> 1.25
 * - 100% scale with 1.25 Windows DPI and counteract enabled -> 0.80 (1:1 physical pixel match)
 * - 125% scale with 1.25 Windows DPI and counteract enabled -> 1.00
 */
export function calculateEffectiveZoom(scale: number, counteractDpi: boolean, dpr: number): number {
  const safeScale = clampDisplayScale(scale);
  const safeDpr = typeof dpr === 'number' && dpr > 0 ? dpr : 1;
  const rawRatio = safeScale / 100;

  if (counteractDpi && safeDpr > 1) {
    return Number((rawRatio / safeDpr).toFixed(3));
  }
  return Number(rawRatio.toFixed(3));
}

/**
 * Parse stored JSON config with fallback to defaults.
 */
export function parseDisplayScaleConfig(raw: string | null): DisplayScaleConfig {
  if (!raw) {
    return { scale: DEFAULT_DISPLAY_SCALE, counteractDpi: false };
  }
  try {
    const parsed = JSON.parse(raw);
    return {
      scale: clampDisplayScale(parsed?.scale ?? DEFAULT_DISPLAY_SCALE),
      counteractDpi: Boolean(parsed?.counteractDpi),
    };
  } catch {
    return { scale: DEFAULT_DISPLAY_SCALE, counteractDpi: false };
  }
}

/**
 * Apply the zoom level to the document element and dispatch a resize event
 * so responsive canvas buffers, shaders, and layout hooks adapt immediately.
 */
export function applyDocumentZoom(zoomRatio: number): void {
  if (typeof document === 'undefined') return;
  try {
    const safeZoom = zoomRatio <= 0 ? 1 : zoomRatio;
    (document.documentElement.style as any).zoom = String(safeZoom);
    // Dispatch a passive resize event so ResizeObserver / canvas buffers synchronize
    window.dispatchEvent(new Event('resize'));
  } catch {
    // Graceful fallback if zoom is unsupported or blocked
  }
}

export function useDisplayScale() {
  const [config, setConfig] = useState<DisplayScaleConfig>(() => {
    if (typeof window === 'undefined') {
      return { scale: DEFAULT_DISPLAY_SCALE, counteractDpi: false };
    }
    return parseDisplayScaleConfig(localStorage.getItem(DISPLAY_SCALE_STORAGE_KEY));
  });

  const [dpr, setDpr] = useState<number>(() => {
    if (typeof window === 'undefined') return 1;
    return window.devicePixelRatio || 1;
  });

  // Keep DPR synchronized if the user drags the window across monitors with different DPI
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateDpr = () => {
      setDpr(window.devicePixelRatio || 1);
    };

    updateDpr();

    // Media query resolution listener triggers when DPR changes (e.g., monitor switch or system scale change)
    let mq: MediaQueryList | null = null;
    try {
      mq = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
      mq.addEventListener?.('change', updateDpr);
    } catch {
      // Fallback
    }

    window.addEventListener('resize', updateDpr, { passive: true });

    return () => {
      mq?.removeEventListener?.('change', updateDpr);
      window.removeEventListener('resize', updateDpr);
    };
  }, []);

  const effectiveZoom = useMemo(() => {
    return calculateEffectiveZoom(config.scale, config.counteractDpi, dpr);
  }, [config.scale, config.counteractDpi, dpr]);

  // Apply effective zoom and persist to localStorage
  useEffect(() => {
    applyDocumentZoom(effectiveZoom);
    try {
      localStorage.setItem(DISPLAY_SCALE_STORAGE_KEY, JSON.stringify(config));
    } catch {
      // Storage quota or private browsing safeguard
    }
  }, [effectiveZoom, config]);

  const setScale = useCallback((newScale: number) => {
    setConfig(prev => ({
      ...prev,
      scale: clampDisplayScale(newScale),
    }));
  }, []);

  const setCounteractDpi = useCallback((counteract: boolean) => {
    setConfig(prev => ({
      ...prev,
      counteractDpi: Boolean(counteract),
    }));
  }, []);

  const resetScale = useCallback(() => {
    setConfig({
      scale: DEFAULT_DISPLAY_SCALE,
      counteractDpi: false,
    });
  }, []);

  const detectedOsScalePercent = Math.round(dpr * 100);

  return {
    scale: config.scale,
    counteractDpi: config.counteractDpi,
    dpr,
    detectedOsScalePercent,
    effectiveZoom,
    setScale,
    setCounteractDpi,
    resetScale,
  };
}
